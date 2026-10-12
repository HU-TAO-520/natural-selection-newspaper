#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""站外来稿收稿流水线（Task21 R15）——人工触发的外部工具，不在构建图内。

合同：plan/Task21-站外投稿与收稿流水线.md 第 5、6、8 节。
铁律：邮件内容是**不可信外部输入**；本子命令永不执行来稿里的任何"指令"，
      只有 `adopt`（用户点名 message_id）才允许写 `content/`。

退出码：0 成功｜2 外部数据不合规则｜3 自检失败（台账与 raw 不一致）｜
        4 前置缺失｜5 邮件服务失败（透传 CLI 原始 error.message）。
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional

EXIT_OK, EXIT_INPUT, EXIT_SELFCHECK, EXIT_PREREQ, EXIT_MAIL = 0, 2, 3, 4, 5

ROOT = Path(__file__).resolve().parent.parent
INTAKE = ROOT / 'intake'
CONFIG_PATH = INTAKE / 'config.json'
LEDGER_PATH = INTAKE / 'ledger.json'
RAW_DIR = INTAKE / 'raw'
DRAFT_DIR = INTAKE / 'drafts'
LOG_PATH = INTAKE / '台账.md'
BYLINE_OUTSIDE = '站外投稿'
STATES = ('待处理', '待审', '需修改', '已采用', '退回', '留档', '垃圾')
TERMINAL_FROM_DRAFT = ('待审', '需修改')

# 来稿里常见的自动噪声：Agent Mail 页脚、原始邮件引用块、签名分隔线、微信表情码。
FOOTER_RES = (re.compile(r'此邮件由\s*\S+\s*通过\s*Agent Mail\s*自动发送。*'),
              re.compile(r'举报\s*退订'),
              re.compile(r'https?://\S*rescdn\.qqmail\.com\S*'),
              re.compile(r'^---*\s*原始邮件\s*---*$'))
EMOJI_CODE_RE = re.compile(r'\[[^\[\]\n]{1,12}\]')
# 网易等邮箱把签名放在 <hr> 之后，且签名行常常就是一个裸邮箱；两者都不是正文。
BARE_EMAIL_LINE_RE = re.compile(r'^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$')
SYSTEM_SENDERS_DEFAULT = ('admin@agent.qq.com',)
MD_MARKS = ('#', '*', '[', ']', '`', '!')
SENTENCE_END = '。'
END_DATE_LINE_RE = re.compile(r'^\s*（自然选择号\d{1,2}月\d{1,2}日）\s*$')
DATE_IN_TEXT_RE = re.compile(r'自然选择号(\d{1,2}月\d{1,2}日)')


class Halt(Exception):
    def __init__(self, code: int, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_config() -> dict:
    for path in (INTAKE, CONFIG_PATH):
        if not path.exists():
            raise Halt(EXIT_PREREQ, '前置缺失：%s 不存在' % path)
    try:
        config = json.loads(CONFIG_PATH.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as error:
        raise Halt(EXIT_PREREQ, 'config.json 不可读：%s' % error)
    for key in ('cli', 'mode', 'watermark', 'byline'):
        if key not in config:
            raise Halt(EXIT_PREREQ, 'config.json 缺键 %s' % key)
    if config['mode'] not in ('alias', 'subject-prefix', 'dedicated-inbox'):
        raise Halt(EXIT_PREREQ, 'config.json mode 无效：%s' % config['mode'])
    if config['byline'] != BYLINE_OUTSIDE:
        raise Halt(EXIT_PREREQ, 'config.json 的 byline 必须是 %s' % BYLINE_OUTSIDE)
    return config


def load_ledger() -> dict:
    if not LEDGER_PATH.is_file():
        raise Halt(EXIT_PREREQ, '前置缺失：%s 不存在' % LEDGER_PATH)
    try:
        ledger = json.loads(LEDGER_PATH.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as error:
        raise Halt(EXIT_SELFCHECK, '台账不可解析：%s' % error)
    if ledger.get('schema') != 1 or 'items' not in ledger:
        raise Halt(EXIT_SELFCHECK, '台账 schema 无效')
    return ledger


def write_ledger(ledger: dict) -> None:
    LEDGER_PATH.write_bytes((json.dumps(ledger, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))


def log_line(text: str) -> None:
    with LOG_PATH.open('a', encoding='utf-8', newline='\n') as handle:
        handle.write(text.rstrip() + '\n')


def run_cli(config: dict, args: List[str]) -> dict:
    """只调用只读命令；任何非 0 退出或 ok=false 都按 5 透传原文。"""
    import shutil
    argv = [shutil.which(config['cli']) or config['cli']] + args
    try:
        done = subprocess.run(argv, capture_output=True, shell=False)
    except OSError as error:
        raise Halt(EXIT_MAIL, '邮件 CLI 无法执行：%s' % error)
    stdout = done.stdout.decode('utf-8', 'replace').strip()
    if done.returncode != 0:
        raise Halt(EXIT_MAIL, 'CLI 退出码 %d：%s' % (done.returncode, (stdout or done.stderr.decode('utf-8', 'replace')).strip()[:400]))
    brace = stdout.find('{')
    if brace < 0:
        raise Halt(EXIT_MAIL, 'CLI 无 JSON 输出：%s' % stdout[:200])
    try:
        payload = json.loads(stdout[brace:])
    except json.JSONDecodeError as error:
        raise Halt(EXIT_MAIL, 'CLI 输出不是 JSON：%s' % error)
    if payload.get('ok') is False:
        raise Halt(EXIT_MAIL, 'CLI 业务失败：%s' % json.dumps(payload.get('error'), ensure_ascii=False)[:400])
    return payload


def search_flags(config: dict) -> List[str]:
    """M0 别名未生效时按主题前缀分流；三条腿都只换过滤条件，不改流水线形状。

    alias：CLI 绑在主信箱，按收件人别名过滤；
    subject-prefix：退路，主信箱 + 主题前缀；
    dedicated-inbox：CLI 直接绑在收稿信箱身份上（该信箱每一封来信都是投稿，无需过滤）。
    """
    if config['mode'] == 'alias':
        return ['--to', config['alias']]
    if config['mode'] == 'dedicated-inbox':
        return ['--dir', 'inbox']
    return ['--q', config['subject_prefix'], '--dir', 'inbox']


def unwrap(payload: dict) -> tuple:
    """CLI 的 search 把列表嵌在 data.data 里；顺带取出翻页游标。"""
    data = payload.get('data')
    if isinstance(data, dict):
        return (data.get('data') or []), bool(data.get('has_more')), (data.get('next_cursor') or data.get('cursor'))
    if isinstance(data, list):
        return data, bool(payload.get('has_more')), (payload.get('next_cursor') or payload.get('cursor'))
    return [], False, None


def message_fields(item) -> dict:
    if isinstance(item, str):
        return {'message_id': item, 'created_at': None, 'subject': '', 'from': None}
    return {'message_id': item.get('message_id') or item.get('id'),
            'created_at': item.get('created_at'),
            'subject': item.get('subject') or item.get('snippet') or '',
            'from': (item.get('from') or {}).get('email') if isinstance(item.get('from'), dict) else item.get('from')}


def cmd_poll(config: dict, ledger: dict) -> int:
    seen = {item['message_id'] for item in ledger['items']}
    args = ['message', '+search'] + search_flags(config) + ['--limit', str(config.get('page_size', 30))]
    cursor, fresh = None, []
    while True:
        payload = run_cli(config, args + (['--cursor', cursor] if cursor else []))
        data, has_more, cursor = unwrap(payload)
        for item in data:
            fields = message_fields(item)
            if not fields['message_id']:
                continue
            if fields['created_at'] and fields['created_at'] <= config['watermark']:
                continue
            if fields['message_id'] not in seen:
                fresh.append(fields)
                seen.add(fields['message_id'])
        if not has_more or not cursor:
            break
    print('poll：新来稿 %d 封（模式=%s，水位线=%s）' % (len(fresh), config['mode'], config['watermark']))
    for fields in fresh:
        print('  %s｜%s｜%s｜%s' % (fields['message_id'], fields['created_at'], fields['subject'][:40], fields['from']))
    (INTAKE / 'last-poll.json').write_bytes(json.dumps(fresh, ensure_ascii=False, indent=2).encode('utf-8'))
    return EXIT_OK


def cmd_ingest(config: dict, ledger: dict, ids: List[str]) -> int:
    if not ids:
        pending = INTAKE / 'last-poll.json'
        if not pending.is_file():
            raise Halt(EXIT_PREREQ, '先跑 poll，或显式给出 message_id')
        ids = [item['message_id'] for item in json.loads(pending.read_text(encoding='utf-8'))]
    index = {item['message_id']: item for item in ledger['items']}
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    for message_id in ids:
        payload = run_cli(config, ['message', '+read', '--id', message_id])
        message = payload.get('data') or {}
        if not message.get('message_id'):
            raise Halt(EXIT_MAIL, '+read %s 未返回 message_id' % message_id)
        raw_path = RAW_DIR / ('%s.json' % message_id)
        raw_bytes = (json.dumps(payload, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
        if raw_path.exists() and sha256_bytes(raw_path.read_bytes()) != sha256_bytes(raw_bytes):
            raise Halt(EXIT_SELFCHECK, '%s 的原始快照与再次拉取不等（历史快照不得覆盖）' % message_id)
        raw_path.write_bytes(raw_bytes)
        attachments = [{'attachment_id': att.get('attachment_id'),
                        'content_type': att.get('content_type'),
                        'filename': att.get('filename')} for att in (message.get('attachments') or [])]
        from_field = message.get('from') or {}
        record = index.get(message_id)
        entry = {'message_id': message_id,
                 'created_at': message.get('created_at'),
                 'from_email': from_field.get('email') if isinstance(from_field, dict) else from_field,
                 'from_name': from_field.get('name') if isinstance(from_field, dict) else None,
                 'to_alias': ((message.get('to') or [{}])[0].get('email') if isinstance(message.get('to'), list)
                               else (message.get('to') or {}).get('email') if isinstance(message.get('to'), dict)
                               else message.get('to')),
                 'subject': message.get('subject') or '',
                 'body_format': message.get('body_format') or 'PLAIN',
                 'attachments': attachments,
                 'sha256_raw': sha256_bytes(raw_bytes),
                 'state': '需修改' if attachments else (record or {}).get('state', '待处理'),
                 'proposed_slug': (record or {}).get('proposed_slug'),
                 'proposed_column': (record or {}).get('proposed_column'),
                 'reject_reasons': (record or {}).get('reject_reasons', []),
                 'draft': (record or {}).get('draft'),
                 'content_md': (record or {}).get('content_md'),
                 'decided_at': (record or {}).get('decided_at'),
                 'notes': (record or {}).get('notes', '')}
        if attachments:
            entry['reject_reasons'] = list(dict.fromkeys(entry['reject_reasons'] + [
                'Task21 §1.1 附件政策：含 attachment_id=%s' % ', '.join(a['attachment_id'] or '无名' for a in attachments)]))
        if record is None:
            ledger['items'].append(entry)
        else:
            record.update(entry)
        print('ingest：%s｜%s｜%s｜正文 %d 字｜附件 %d%s' % (
            message_id, entry['state'], entry['subject'][:32], len(str(message.get('body') or '')),
            len(attachments), '（含附件→需修改，交人工）' if attachments else ''))
    ledger['watermark_max'] = max([item['created_at'] or '' for item in ledger['items']] or [config['watermark']])
    write_ledger(ledger)
    log_line('- ingest %s：%d 条登记，台账水位线 %s' % (config['mode'], len(ids), ledger['watermark_max']))
    return EXIT_OK


def strip_markup(body: str, fmt: str) -> str:
    text = body or ''
    if fmt.upper() == 'HTML':
        text = re.sub(r'(?is)<(script|style|noscript|head|title)[^>]*>.*?(?:</\1>|$)', ' ', text)
        text = re.sub(r'(?i)<hr\b[^>]*>', '\n-- \n', text)
        text = re.sub(r'(?i)<br\s*/?>|</p>|</div>|</li>|</tr>', '\n', text)
        text = re.sub(r'<[^>]*>', ' ', text)
        text = text.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    elif fmt.upper() == 'MARKDOWN':
        text = re.sub(r'!\[[^\]]*\]\([^)]*\)', ' ', text)
        text = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', text)
        text = re.sub(r'^\s{0,3}#{1,6}\s+', '', text, flags=re.M)
        text = text.replace('`', '')
    return text.replace('\r\n', '\n').replace('\r', '\n')


def strip_noise(text: str) -> str:
    kept: List[str] = []
    stop = False
    for line in text.split('\n'):
        stripped = line.strip()
        if stop:
            continue
        if any(pattern.match(stripped) for pattern in FOOTER_RES):
            continue
        if stripped.startswith('>'):
            continue
        if BARE_EMAIL_LINE_RE.match(stripped):
            continue
        if stripped.startswith('-- ') or stripped == '--':
            stop = True
            continue
        kept.append(line)
    return '\n'.join(kept)


def split_paragraphs(text: str) -> List[str]:
    blocks, held = [], []
    for line in text.split('\n'):
        line = EMOJI_CODE_RE.sub('', line).strip()
        if line == '':
            if held:
                blocks.append(''.join(held))
                held = []
            continue
        held.append(line)
    if held:
        blocks.append(''.join(held))
    out = []
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        if block[-1] not in '。！？；：”…' and not block.endswith('】'):
            block += SENTENCE_END
        out.append(block)
    return out


def propose(values: List[str], pool: Dict[str, str]) -> str:
    """脚本只给建议值，终值由人工定。"""
    joined = ' '.join(values)
    if any(word in joined for word in ('论', '评', '观点', '我觉得')):
        return pool['commentary']
    if any(word in joined for word in ('记', '走', '一天', '路上', '课堂', '选科')):
        return pool['feature']
    return pool['message']


def slug_from(subject: str, message_id: str, taken=None) -> str:
    """slug 必须逐信唯一：非拉丁主题过去一律落到 submission，两封来稿会共用一个草稿文件互相覆盖。"""
    taken = taken or set()
    latin = re.sub(r'[^a-z0-9]+', '-', (re.sub(r'[^\x00-\x7f]', ' ', subject.lower()))).strip('-')[:24]
    tail = re.sub(r'[^a-z0-9]', '', message_id.lower())[-8:] or 'inbox'
    usable = latin if re.match(r'^[a-z][a-z0-9-]{3,24}$', latin) and not re.search(r'\d{4}', latin) else ''
    base = (usable or ('outside-%s' % tail)) if (usable and usable not in taken) else 'outside-%s' % tail
    assert re.match(r'^[a-z0-9][a-z0-9-]{2,40}$', base), '建议 slug 不合 SLUG_RE：%r' % base
    slug, bump = base, 2
    while slug in taken:
        slug = '%s-%d' % (base[:36], bump)
        bump += 1
    return slug


def validate_against_builder(md_path: Path, config: dict) -> List[str]:
    """预校验复用构建器本体，不重写规则（Task21 §6.6）。"""
    sys.path.insert(0, str(ROOT / 'build'))
    import build as builder  # build.py 有 __name__ 保护，import 无副作用
    registry = [builder.Column(*line.split('|')) for line in
                (ROOT / 'content/columns.md').read_text(encoding='utf-8').split('\n')[:-1]]
    problems: List[str] = []
    try:
        builder.parse_article(md_path, md_path.name, registry)
    except builder.Fail as failure:
        problems.append(failure.rendered)
    return problems


def cmd_draft(config: dict, ledger: dict, ids: List[str]) -> int:
    if not ids:
        ids = [item['message_id'] for item in ledger['items'] if item['state'] in ('待处理', '需修改')]
    index = {item['message_id']: item for item in ledger['items']}
    DRAFT_DIR.mkdir(parents=True, exist_ok=True)
    pool = {'message': 'message', 'feature': 'feature', 'commentary': 'commentary'}
    produced = 0
    for message_id in ids:
        item = index.get(message_id)
        if item is None:
            raise Halt(EXIT_PREREQ, '台账里没有 %s，先 ingest' % message_id)
        raw = json.loads((RAW_DIR / ('%s.json' % message_id)).read_text(encoding='utf-8'))
        body = strip_markup(str((raw.get('data') or {}).get('body') or ''), item['body_format'])
        body = strip_noise(body)
        end_date = None
        lines = body.split('\n')
        tail = [i for i, line in enumerate(lines) if END_DATE_LINE_RE.match(line)]
        if tail:
            end_date, lines = lines[tail[-1]].strip(), lines[:tail[-1]] + lines[tail[-1] + 1:]
        paragraphs = split_paragraphs('\n'.join(lines))
        subject = re.sub(r'^\s*(【%s】|\[%s\])\s*' % (config.get('subject_prefix', '投稿'), config.get('subject_prefix', '投稿')),
                         '', item['subject']).strip() or '站外来稿'
        reasons: List[str] = []
        senders = tuple(config.get('system_senders') or SYSTEM_SENDERS_DEFAULT)
        if item.get('from_email') in senders:
            reasons.append('Task21 §5.3 状态机：发件人 %s 是系统来信而非来稿，交人工标记' % item.get('from_email'))
        if item['attachments']:
            reasons.append('Task21 §1.1 附件政策：来稿含附件，只收邮件正文纯文本')
        if not paragraphs:
            reasons.append('Task21 §6.4 分段：清洗后无正文段落')
        for attempt, block in enumerate(paragraphs):
            if '**' in block:
                reasons.append('Task13 §正文区规则 3：第 %d 段含电头标记，站外来稿不给电头' % (attempt + 1))
        own = Path(str(item.get('draft') or '')).stem or None
        taken = {x.get('proposed_slug') for x in ledger['items']
                 if x['message_id'] != message_id and x.get('proposed_slug')}
        taken |= {p.stem for p in DRAFT_DIR.glob('*.md') if p.stem != own}
        slug = slug_from(subject, message_id, taken)
        md_path = DRAFT_DIR / ('%s.md' % slug)
        front = ['---', 'slug: %s' % slug, 'column: %s' % propose(paragraphs, pool),
                 'title: %s' % subject, 'byline: %s' % BYLINE_OUTSIDE]
        if end_date:
            front.append('end_date: %s' % end_date)
        front.append('---')
        draft_text = '\n'.join(front) + '\n\n' + '\n\n'.join(paragraphs) + '\n'
        md_path.write_bytes(draft_text.encode('utf-8'))
        reasons += validate_against_builder(md_path, config)
        item['proposed_slug'] = slug
        item['proposed_column'] = propose(paragraphs, pool)
        if reasons:
            # 只删自己刚写的那一份：过去 slug 会撞名，拒一封信就把别的来信的草稿删掉。
            if md_path.is_file() and md_path.read_bytes() == draft_text.encode('utf-8'):
                md_path.unlink()
            item['reject_reasons'] = list(dict.fromkeys(reasons))
            item['state'] = '需修改'
            item['draft'] = None
            print('draft：%s 拦下 %d 条规则，不出草稿' % (message_id, len(reasons)))
            for reason in reasons:
                print('    · %s' % reason[:120])
        else:
            item['reject_reasons'] = []
            item['state'] = '待审'
            item['draft'] = 'intake/drafts/%s.md' % slug
            item['notes'] = ('落款 %s' % end_date) if end_date else item['notes']
            produced += 1
            print('draft：%s → intake/drafts/%s.md（%d 段，建议栏目 %s，署名 %s）' % (
                message_id, slug, len(paragraphs), item['proposed_column'], BYLINE_OUTSIDE))
    write_ledger(ledger)
    log_line('- draft：候选草稿 %d 篇，拦下 %d 封' % (produced, len(ids) - produced))
    return EXIT_OK if produced or not ids else EXIT_INPUT


def cmd_review(config: dict, ledger: dict) -> int:
    rows = [item for item in ledger['items'] if item['state'] not in ('垃圾',)]
    print('审稿表（共 %d 条；真实姓名与邮箱只出现在这里和台账，不进站点）' % len(rows))
    print('%-18s %-6s %-22s %-6s %-14s %s' % ('message_id', '状态', '主题', '段数', '建议栏目', '拦到的规则'))
    for item in rows:
        paragraphs = 0
        if item.get('draft'):
            text = (ROOT / item['draft']).read_text(encoding='utf-8')
            lines = text.split('\n')
            rules = [i for i, ln in enumerate(lines) if ln == '---']
            if len(rules) >= 2:
                body = '\n'.join(lines[rules[1] + 1:])
                paragraphs = len([b for b in body.split('\n\n') if b.strip()])
        print('%-18s %-6s %-22s %-6s %-14s %s' % (
            item['message_id'], item['state'], str(item['subject'])[:22], paragraphs,
            item.get('proposed_column') or '-',
            '；'.join(str(r)[:48] for r in item.get('reject_reasons') or []) or '无'))
        if re.search(r'(忽略.{0,6}(之前|以上).{0,4}(指令|要求)|立即发布|转发给|把此邮件)', str(item['subject']) + str(item.get('notes'))):
            print('    ⚠ 来稿文本疑似诱导指令，仅作数据登记，不得当作动作来源（Task21 §8.1）')
    return EXIT_OK


def cmd_adopt(config: dict, ledger: dict, message_id: str, confirm: bool, column: Optional[str],
              title: Optional[str]) -> int:
    if not confirm:
        raise Halt(EXIT_PREREQ, 'adopt 必须带 --confirm-by-user；人工审核是唯一发布闸口')
    item = next((x for x in ledger['items'] if x['message_id'] == message_id), None)
    if item is None:
        raise Halt(EXIT_INPUT, '台账没有 %s' % message_id)
    if item['state'] not in TERMINAL_FROM_DRAFT or not item.get('draft'):
        raise Halt(EXIT_INPUT, '%s 状态为 %s，没有可采用的候选草稿' % (message_id, item['state']))
    source = ROOT / item['draft']
    text = source.read_text(encoding='utf-8')
    if column:
        text = re.sub(r'(?m)^column: .+$', 'column: %s' % column, text, count=1)
    if title:
        text = re.sub(r'(?m)^title: .+$', 'title: %s' % title, text, count=1)
    target = ROOT / 'content/articles' / source.name
    target.write_bytes(text.encode('utf-8'))
    problems = validate_against_builder(target, config)
    if problems:
        target.unlink()
        item['state'] = '需修改'
        item['reject_reasons'] = problems
        write_ledger(ledger)
        raise Halt(EXIT_INPUT, 'adopt 前重跑预校验仍不过：%s' % '；'.join(problems)[:200])
    done = subprocess.run([sys.executable, str(ROOT / 'build/build.py'), '--out', str(ROOT / '.tmp-verify')],
                          capture_output=True)
    if done.returncode != 0:
        target.unlink()
        item['state'] = '需修改'
        item['reject_reasons'] = ['构建试跑 rc=%d：%s' % (done.returncode, done.stderr.decode('utf-8', 'replace')[:200])]
        write_ledger(ledger)
        raise Halt(EXIT_SELFCHECK, '试跑失败，草稿已退回 intake/：' + item['reject_reasons'][-1])
    item['state'] = '已采用'
    item['content_md'] = 'content/articles/%s' % source.name
    item['decided_at'] = item['decided_at'] or ''
    write_ledger(ledger)
    log_line('- adopt：%s → %s（试跑 rc=0；后续走 skill-添加新文章 §4–§8，由人工决定何时 --out Results 与打包）'
             % (message_id, item['content_md']))
    print('adopt：%s 已进 %s；构建试跑通过，站点产物尚未更新' % (message_id, item['content_md']))
    return EXIT_OK


def cmd_verify(config: dict, ledger: dict) -> int:
    drift, missing = [], []
    for item in ledger['items']:
        raw = RAW_DIR / ('%s.json' % item['message_id'])
        if not raw.is_file():
            missing.append(item['message_id'])
        elif sha256_bytes(raw.read_bytes()) != item['sha256_raw']:
            drift.append(item['message_id'])
    stray = sorted(p.name for p in RAW_DIR.glob('*.json')) if RAW_DIR.is_dir() else []
    stray = [n for n in stray if n[:-5] not in {i['message_id'] for i in ledger['items']}]
    print('verify：台账 %d 条｜快照缺失 %s｜哈希漂移 %s｜清单外快照 %s' % (
        len(ledger['items']), missing or '无', drift or '无', stray or '无'))
    outside = [p for p in ROOT.iterdir() if p.name in ('Results', 'content', 'deploy', 'build')]
    print('  写入范围核对：本轮只写 intake/ 与 .tmp-verify；受保护目录在场=%s' % all(outside))
    if missing or drift or stray:
        return EXIT_SELFCHECK
    return EXIT_OK


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(prog='intake.py', description='站外来稿收稿流水线（只读为主，adopt 才写 content/）')
    parser.add_argument('command', choices=('poll', 'ingest', 'draft', 'review', 'adopt', 'verify'))
    parser.add_argument('--id', action='append', dest='ids', default=[], help='message_id，可重复')
    parser.add_argument('--confirm-by-user', action='store_true', help='adopt 的人类授权开关')
    parser.add_argument('--column', default=None, help='人工指定的终值栏目')
    parser.add_argument('--title', default=None, help='人工指定的终值标题')
    args = parser.parse_args(argv)
    try:
        config, ledger = load_config(), load_ledger()
        if args.command == 'poll':
            return cmd_poll(config, ledger)
        if args.command == 'ingest':
            return cmd_ingest(config, ledger, args.ids)
        if args.command == 'draft':
            return cmd_draft(config, ledger, args.ids)
        if args.command == 'review':
            return cmd_review(config, ledger)
        if args.command == 'adopt':
            if len(args.ids) != 1:
                raise Halt(EXIT_INPUT, 'adopt 需要且仅需要一个 --id')
            return cmd_adopt(config, ledger, args.ids[0], args.confirm_by_user, args.column, args.title)
        return cmd_verify(config, ledger)
    except Halt as halt:
        sys.stderr.write('intake.py: %s\n' % halt.message)
        return halt.code


if __name__ == '__main__':
    sys.exit(main())
