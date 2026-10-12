#!/usr/bin/env python3
"""Archive-layer site builder: the single generator for index, column list and article pages.

Contract authority: plan/Task14-实现构建器内核.md, with input grammar from plan/Task13
(content/ format contract) and structure from plan/Task12 (R1-R11).
"""

import argparse
import hashlib
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

sys.dont_write_bytecode = True
try:
    from . import easteregg as egg_renderer
except ImportError:
    import easteregg as egg_renderer

EXIT_OK = 0
EXIT_INPUT = 2
EXIT_SELFCHECK = 3
EXIT_GATE = 4

OPEN_TAG = '  <main class="main-content" id="main-content" tabindex="-1">\n'
CLOSE_TAG = '  </main>\n'
MAIN_SLOT = '{{MAIN}}\n'
TITLE_SLOT = '{{TITLE}}'
ARIA = ' aria-current="page"'
NAV_OPEN = '<nav class="site-navigation" id="site-navigation"'
HOME_TITLE = '《自然选择号》报社简介'
ERROR_PAGE = '404.html'
ERROR_TITLE = '页面不存在'
SEP = '｜'
HOME_ARTICLES = 3

GATE_FILES = {
    'qa/_qa_task13/baseline/news-message.html': (3011, '66ae5826bbdf9829206c6374305e7bf4bab546c65485349db5fff40e0b5fa0e8'),
    'qa/_qa_task13/baseline/index.html': (2629, '971e57a5f85bae99c389e58d7a132e96c02388432de997c4df3d4af495e6416a'),
    'qa/_qa_task13/baseline/news-feature.html': (6962, '73ff75678c453badbc1edcb1ff590001dc93cade3260ff364e042d02075df9a5'),
    'qa/_qa_task13/baseline/news-commentary.html': (8486, 'a2dbf4aac57472e8a8728f80908dc366d3aa9076310bbb39b24d71f251ea8d52'),
    'qa/_qa_task13/baseline/styles.css': (12401, '2c23817299492ea9a3fd7ad23237cfabd6723d166bd99194febbed09ad418ba1'),
    'qa/_qa_task13/baseline/script.js': (2204, 'abb39e4a6d218546b45eded0fa601540d2c5195d93c9fe1dfa8aaaabca13c666'),
    'qa/_qa_task13/main_slices/news-message.main-interior.html': (1269, '4b941f8e6b101558919f9877dce152373999a35fe0fc7f8a11302931d13c212a'),
    'qa/_qa_task13/main_slices/news-feature.main-interior.html': (5224, 'f3d6517a076b10a39455f6e15ef89a9b094d1dd1c7a937ddab1ce45576b86834'),
    'qa/_qa_task13/main_slices/news-commentary.main-interior.html': (6735, '0a10c97742f8ee50033ee81ea62515aecfd0c8d53ef4b0e9acccf14fcb2b2a17'),
    'qa/_qa_task13/expected-spec.json': (23039, 'e1018e2e3b87ffd77c7d86b27cb18e477184847e099d787cab88e71b6569eab5'),
}
SHELL_EXPECTED = (1844, '8cfbe85b293b56017a1ba1fcf59cb0025a3d155cede629c032d31b7e3bc66dbd')
# R15②：投稿页模板是构建器输入，与壳同级，按字节钉住；它是 PAPER 角色的信息页。
SUBMISSION_REL = 'build/submission.html'
SUBMISSION_PAGE = 'submission.html'
SUBMISSION_TITLE = '投稿'
SUBMISSION_BYLINE_PHRASE = '站外投稿'
SUBMISSION_EXPECTED = (7590, '39036e5a615140d44f7159ad4acc457e72320439a738604726c7e574d3dc548a')
NAV_ITEM_COUNT = 5
PARTIAL_EXPECTED = (823, '622d8cce02633b64f5fe35034c24764f90727a28416213e798bfeb6bf0a13646')
IDX_INTERIOR_EXPECTED = (890, '920122279eaf36a649f36c7281533ada02a41359c78c03dbb8adfb315c2e8ddb')
HOME_FROZEN_TEXTS = (HOME_TITLE, '名称由来', '我们的名字来自《三体》里的一支舰队。',
                     '主要工作与报道方向', '我们主要记录一些自己觉得有价值的东西。',
                     '成立时间', '报社成立于“鸽子衔枝之年”。', '最新报道')
FOREIGN_ALLOWED = frozenset({'styles.css', 'script.js'})
FIELD_NAMES = ('date', 'display_date', 'end_date', 'order', 'slug', 'column', 'byline')
BANNED_SUBSTRINGS = ('厨一枚', '胡桃', '新闻评价', '作者：', '记者：', '来源：', '出处：',
                     'Materials/', '.docx', 'TODO', 'TBD')
MATERIAL_HASHES = (
    'de10b575399e0563430f2f255c956b179c9978c087897a24910ad70d6a50f6fc',
    '0c5b35256b7271acfb2f49aec146288b404ed49c376ac2c8b3f6246b38f894a4',
    '8e50cfc89287035163d5fe95c8b1cee20a5aa405e9d04ec358fb5c9312c3827c',
)
MATERIAL_FRAGMENTS = tuple(frag for digest in MATERIAL_HASHES
                           for frag in (digest[i:i + 16] for i in range(len(digest) - 15)))
RESERVED_STEMS = frozenset(['con', 'aux', 'prn', 'nul']
                           + ['com%d' % i for i in range(1, 10)]
                           + ['lpt%d' % i for i in range(1, 10)])
SLUG_RE = re.compile(r'^[a-z0-9][a-z0-9-]{2,40}$')
SLUG_DATE_FORMS = (r'\d{4}', r'\d{1,2}-\d{1,2}', r'\d{8}')
KEY_RE = re.compile(r'^[a-z_]+$')
ISO_RE = re.compile(r'^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$')
MDATE_RE = re.compile(r'^\d{1,2}月\d{1,2}日$')
CONTRACT_ID_RE = re.compile(r'^[MFC]\d{2}$', re.IGNORECASE)
ORDER_RE = re.compile(r'^\d+$')
REGISTRY_FIRST = re.compile(r'^message\|新闻消息\|news-message\.html$')
REGISTRY_LABEL_RE = re.compile(r'^新闻(消息|通讯|评论)$')
REGISTRY_FILE_RE = re.compile(r'^news-[a-z]+\.html$')
ALLOWED_KEYS = ('slug', 'column', 'title', 'byline', 'date', 'display_date', 'end_date', 'order')
# R12（Task12/Task13 §3 规则 9）：end_date 是与栏目无关的可选排版字段，只到月日、全角括号。
END_DATE_RE = re.compile(r'^（自然选择号\d{1,2}月\d{1,2}日）$')
REQUIRED_KEYS = ('slug', 'column', 'title', 'byline')
# R15：站外来稿统一署名，蓝色空间仍是本报社自有笔名；二者之外不放开口子。
BYLINE_ALLOWED = ('蓝色空间', '站外投稿')
VALUE_BAD_HEAD = ('"', "'", '>', '|', '&', '*')
BODY_BANNED_CHARS = ('`', '<', '>', '#', '[', ']', '!')
BODY_BANNED_HEAD = frozenset(['-', '*', '>', '|', '~'])
ORDERED_LIST_RE = re.compile(r'^\d+\.')
TAG_RE = re.compile(r'<([a-z0-9]+)[\s/>]')
YEAR_FORM_RE = re.compile(r'(19|20)\d{2}')
ISO_FORM_RE = re.compile(r'\d{4}-\d{2}-\d{2}')
WHITESPACE_RE = re.compile(r'\s')
TAG_STRIP_RE = re.compile(r'<[^>]*>')
FIELD_WORD_RES = {name: re.compile(r'(?<![A-Za-z0-9_-])%s(?![A-Za-z0-9_-])' % name)
                  for name in FIELD_NAMES}


class Fail(Exception):
    def __init__(self, code: int, path: str, line: int, clause: str, detail: str):
        Exception.__init__(self)
        self.code = code
        self.rendered = '%s:%d｜%s｜%s' % (path, line, clause, detail[:40])


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def esc(text: str) -> str:
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


@dataclass
class Column:
    key: str
    label: str
    list_page: str


@dataclass
class Article:
    slug: str
    column: str
    title: str
    byline: str
    date: Optional[str]
    display_date: Optional[str]
    end_date: Optional[str]
    order: int
    paragraphs: List[str]
    dateline: Optional[str]
    rel: str

    @property
    def output_name(self) -> str:
        return 'article-%s.html' % self.slug

    @property
    def body_text(self) -> List[str]:
        return self.paragraphs + ([self.end_date] if self.end_date else [])


def check_gate(root: Path, spec_check: bool) -> None:
    for rel, (size, digest) in sorted(GATE_FILES.items()):
        path = root / rel
        if not path.is_file():
            raise Fail(EXIT_GATE, rel, 1, 'Task14 §阻断规则一', '基线输入缺失')
        data = path.read_bytes()
        if len(data) != size or sha256(data) != digest:
            raise Fail(EXIT_GATE, rel, 1, 'Task14 §结构或数据基线',
                       '期望 %d/%s…，实得 %d/%s…' % (size, digest[:8], len(data), sha256(data)[:8]))
    actual = sorted(p.relative_to(root).as_posix()
                    for p in (root / 'content').rglob('*') if p.is_file())
    # R12：content/ 的形状受约束，篇数不受约束——钉死"恰好五个"等于把 Task 13
    # 那一刻的瞬时状态当成不变量，之后每加一篇文章都会在这里撞墙。
    spec_files = sorted(load_spec(root)['content_files_sha256'])
    shape = re.compile(r'^content/(columns\.md|_模板\.md|articles/[a-z0-9][a-z0-9-]{2,40}\.md)$')
    stray = [x for x in actual if not shape.match(x)]
    missing = [x for x in spec_files if x not in actual]
    if stray or missing:
        raise Fail(EXIT_GATE, 'content', 1, 'Task14 §运行契约',
                   'content/ 形状异常：非规范文件=%s；Task 13 登记文件缺失=%s' % (stray or '无', missing or '无'))
    if not spec_check:
        return
    for rel, digest in sorted(load_spec(root)['content_files_sha256'].items()):
        path = root / rel
        if not path.is_file() or sha256(path.read_bytes()) != digest:
            raise Fail(EXIT_GATE, rel, 1, 'Task14 §Task 14.1 执行 2', 'content/ 哈希与 Task 13 登记不符')


def load_spec(root: Path) -> dict:
    return json.loads((root / 'qa/_qa_task13/expected-spec.json').read_text(encoding='utf-8'))


def derive_shell(source: bytes) -> bytes:
    open_at = source.find(OPEN_TAG.encode())
    close_at = source.find(CLOSE_TAG.encode())
    if open_at < 0 or close_at < 0:
        raise Fail(EXIT_GATE, 'qa/_qa_task13/baseline/news-message.html', 1,
                   'Task14 §公共壳合同 2', '未找到 <main> 两条标签行')
    body = re.search(r'<title>(.*)%s自然选择号</title>' % SEP, source.decode('utf-8')).group(1)
    shell = source[:open_at + len(OPEN_TAG)] + MAIN_SLOT.encode() + source[close_at:]
    shell = shell.replace(('  <title>%s%s自然选择号</title>' % (body, SEP)).encode(),
                          ('  <title>%s%s自然选择号</title>' % (TITLE_SLOT, SEP)).encode())
    return shell.replace(ARIA.encode(), b'', 1)


def load_shell(root: Path) -> bytes:
    rel = 'build/shell.html'
    path = root / rel
    if not path.is_file():
        raise Fail(EXIT_GATE, rel, 1, 'Task14 §公共壳合同 1', '壳文件缺失')
    data = path.read_bytes()
    # R15③：导航四项改五项后，"壳等于从迁移基线重导出"的等式永久为假。壳自身即权威输入，
    # 按 SHELL_EXPECTED 钉住；那份基线继续只服务迁移保真（见 self_check 的回切腿）。
    if (len(data), sha256(data)) != SHELL_EXPECTED:
        raise Fail(EXIT_SELFCHECK, rel, 1, 'Task14 §公共壳合同 2（R15）',
                   '期望 %d/%s…，实得 %d/%s…' % (SHELL_EXPECTED[0], SHELL_EXPECTED[1][:8],
                                             len(data), sha256(data)[:8]))
    if (data.count(TITLE_SLOT.encode()), data.count(b'{{MAIN}}'), data.count(b'aria-current')) != (1, 1, 0):
        raise Fail(EXIT_SELFCHECK, rel, 1, 'Task14 §公共壳合同 1', '槽位计数或 aria-current 残留')
    if data.count(b'<li class="site-navigation__item">') != NAV_ITEM_COUNT:
        raise Fail(EXIT_SELFCHECK, rel, 1, 'Task12 R15②',
                   '导航项 %d 个，应为 %d 个' % (data.count(b'<li class="site-navigation__item">'), NAV_ITEM_COUNT))
    return data


def load_submission(root: Path) -> bytes:
    """Read and self-check the frozen submission page template (R15②)."""
    rel = SUBMISSION_REL
    path = root / rel
    if not path.is_file():
        raise Fail(EXIT_GATE, rel, 1, 'Task21 §7 投稿页结构合同', '投稿页模板缺失')
    data = path.read_bytes()
    if (len(data), sha256(data)) != SUBMISSION_EXPECTED:
        raise Fail(EXIT_SELFCHECK, rel, 1, 'Task21 §7 投稿页结构合同', '模板长度或 SHA-256 与钉住值不符')
    text = data.decode('utf-8')
    for needle, want in (('<div class="home-sections">', 1),
                         ('<section class="home-section"', 6),
                         ('<h1 class="page-title" id="submission-intro-title">%s</h1>' % SUBMISSION_TITLE, 1),
                         ('<h2 class="home-section__title"', 5),
                         ('<p class="home-section__text">', 16)):
        if text.count(needle) != want:
            raise Fail(EXIT_SELFCHECK, rel, 1, 'Task21 §7 投稿页结构合同',
                       '%s 计数 %d≠%d' % (needle[:32], text.count(needle), want))
    # R15 收稿声明的关键约定不得被静默删改：三条免责与一条权利担保、授权范围都在此钉住。
    for needle in ('不收取任何费用', '不支付稿费', '投稿不等于录用', '独立完成的原创',
                   '免费、非独家', '转授权', '不可撤回', SUBMISSION_BYLINE_PHRASE):
        if needle not in text:
            raise Fail(EXIT_SELFCHECK, rel, 1, 'Task21 §7 投稿页法律内容合同', '声明缺 %s' % needle)
    for banned in ('<main', '<form', '<button', '<time', '<input', '<script', 'http://', 'https://', '{{', '}}'):
        if banned in text:
            raise Fail(EXIT_SELFCHECK, rel, 1, 'Task21 §7 投稿页禁区', '模板含 %s' % banned)
    return data


def derive_partial(index_html: bytes) -> bytes:
    start = index_html.find('    <div class="home-sections">'.encode())
    end = index_html.find('    </div>\n'.encode(), start)
    if start < 0 or end < 0:
        raise Fail(EXIT_GATE, 'qa/_qa_task13/baseline/index.html', 1, 'Task14 §公共壳合同 3', '未定位 home-sections 区块')
    return index_html[start:end + len('    </div>\n'.encode())]


def load_partial(root: Path) -> bytes:
    rel = 'build/partials/home-intro.html'
    path = root / rel
    if not path.is_file():
        raise Fail(EXIT_GATE, rel, 1, 'Task14 §公共壳合同 3', 'partial 缺失')
    data = path.read_bytes()
    derived = derive_partial((root / 'qa/_qa_task13/baseline/index.html').read_bytes())
    wrapped = egg_renderer.HOME_ENTRY_PARAGRAPH.encode('utf-8')
    original = egg_renderer.HOME_ORIGINAL_PARAGRAPH.encode('utf-8')
    if data.count(wrapped) != 1:
        raise Fail(EXIT_SELFCHECK, rel, 1, 'Task20 §4.3 首页入口包装', '完整入口段落必须恰好出现一次')
    normalized = data.replace(wrapped, original, 1)
    if normalized != derived or (len(normalized), sha256(normalized)) != PARTIAL_EXPECTED:
        raise Fail(EXIT_SELFCHECK, rel, 1, 'Task14 §自检清单 S4', 'partial 与基线重切片不等')
    text = normalized.decode('utf-8')
    for needle, want in (('<section class="home-section"', 3),
                         ('<h2 class="home-section__title"', 3),
                         ('<p class="home-section__text">', 3)):
        if text.count(needle) != want:
            raise Fail(EXIT_SELFCHECK, rel, 1, 'Task14 §Task 14.3 完成条件',
                       '%s 计数 %d≠%d' % (needle, text.count(needle), want))
    for banned in ('<h1', '<main', 'home-latest'):
        if banned in text:
            raise Fail(EXIT_SELFCHECK, rel, 1, 'Task14 §公共壳合同 3', 'partial 含 %s' % banned)
    for frozen in HOME_FROZEN_TEXTS[1:7]:
        if frozen not in text:
            raise Fail(EXIT_SELFCHECK, rel, 1, 'Task0 §首页内容基线', '三段冻结文本缺 %s' % frozen)
    return data


def check_byte_layer(raw: bytes, rel: str) -> None:
    if raw.startswith(b'\xef\xbb\xbf'):
        raise Fail(EXIT_INPUT, rel, 1, 'Task13 §content/ 格式合同 1', '存在 BOM')
    if b'\r' in raw:
        raise Fail(EXIT_INPUT, rel, 1, 'Task13 §content/ 格式合同 1', '存在 CR 或 CRLF')
    if b'\t' in raw:
        raise Fail(EXIT_INPUT, rel, 1, 'Task13 §content/ 格式合同 1', '存在 TAB')
    if not raw.endswith(b'\n') or raw.endswith(b'\n\n'):
        raise Fail(EXIT_INPUT, rel, 1, 'Task13 §content/ 格式合同 1', '末尾不是恰好一个 LF')
    text = raw.decode('utf-8')
    for ch in text:
        code = ord(ch)
        if code != 0x0a and (code < 0x20 or 0x7f <= code < 0xa0):
            raise Fail(EXIT_INPUT, rel, 1, 'Task13 §content/ 格式合同 1', '存在控制字符 U+%04X' % code)
    lines = text.split('\n')
    blanks = 0
    for i, line in enumerate(lines, start=1):
        if line != line.rstrip(' \x0b\x0c'):
            raise Fail(EXIT_INPUT, rel, i, 'Task13 §content/ 格式合同 1', '行尾空白')
        blanks = blanks + 1 if line == '' else 0
        if blanks >= 3:
            raise Fail(EXIT_INPUT, rel, i, 'Task13 §content/ 格式合同 1', '连续三个及以上空行')
    if '\\' in text and re.search(r'\\\n', text):
        raise Fail(EXIT_INPUT, rel, 1, 'Task13 §content/ 格式合同 1', '存在行尾反斜杠')


def load_registry(root: Path) -> List[Column]:
    rel = 'content/columns.md'
    path = root / rel
    if not path.is_file():
        raise Fail(EXIT_GATE, rel, 1, 'Task14 §解析与渲染合同 1', '注册表缺失')
    raw = path.read_bytes()
    check_byte_layer(raw, rel)
    lines = raw.decode('utf-8').split('\n')[:-1]
    if len(lines) != 3:
        raise Fail(EXIT_INPUT, rel, len(lines) + 1, 'Task13 §content/columns.md',
                   '注册表须恰三行，实为 %d 行' % len(lines))
    rows: List[Column] = []
    for i, line in enumerate(lines, start=1):
        parts = line.split('|')
        if len(parts) != 3 or not all(parts):
            raise Fail(EXIT_INPUT, rel, i, 'Task13 §content/columns.md', '须为竖线分隔的三字段')
        if not REGISTRY_LABEL_RE.match(parts[1]):
            raise Fail(EXIT_INPUT, rel, i, 'Task13 §content/columns.md', '栏目名不合法：%s' % parts[1])
        if not REGISTRY_FILE_RE.match(parts[2]):
            raise Fail(EXIT_INPUT, rel, i, 'Task13 §content/columns.md', '列表页文件名不合法')
        rows.append(Column(parts[0], parts[1], parts[2]))
    if not REGISTRY_FIRST.match(lines[0]):
        raise Fail(EXIT_INPUT, rel, 1, 'Task14 §解析与渲染合同 1', '首行须为 message|新闻消息|news-message.html')
    for values in ([r.key for r in rows], [r.label for r in rows], [r.list_page for r in rows]):
        if len(set(values)) != len(values):
            raise Fail(EXIT_INPUT, rel, 1, 'Task13 §content/columns.md', '键／栏目名／文件名出现重复')
    return rows


def split_blocks(body_lines: List[str], rel: str, base_line: int) -> List[Tuple[int, str]]:
    blocks: List[Tuple[int, str]] = []
    start: Optional[int] = None
    held: List[str] = []
    for offset, line in enumerate(body_lines):
        number = base_line + offset
        if line == '':
            if held:
                blocks.append((start, '\n'.join(held)))
                held = []
                start = None
            continue
        if line[:1] in (' ', '\u3000'):
            raise Fail(EXIT_INPUT, rel, number, 'Task13 §正文区规则 2', '段落内出现行首空白')
        if start is None:
            start = number
        held.append(line)
    if held:
        blocks.append((start, '\n'.join(held)))
    if not blocks:
        raise Fail(EXIT_INPUT, rel, base_line, 'Task13 §正文区规则 7', '正文为空')
    for number, block in blocks:
        if '\n' in block:
            raise Fail(EXIT_INPUT, rel, number, 'Task13 §正文区规则 1', '段落跨行（块内出现 LF）')
        if block == '---':
            raise Fail(EXIT_INPUT, rel, number, 'Task13 §正文区规则 6', '正文含独立成行的 ---')
    return blocks


def render_paragraph(dateline: Optional[str], body: str) -> str:
    if dateline is None:
        return '        <p>%s</p>' % esc(body)
    return '        <p><strong class="dateline">%s</strong> %s</p>' % (esc(dateline), esc(body))


def validate_slug(slug: str, stem: str, rel: str, line: int = 2) -> None:
    if slug != stem:
        raise Fail(EXIT_INPUT, rel, line, 'Task13 §3 规则 4', 'slug 不等于文件名主干')
    if not SLUG_RE.match(slug):
        raise Fail(EXIT_INPUT, rel, line, 'Task13 §3 规则 4', 'slug 不匹配 ^[a-z0-9][a-z0-9-]{2,40}$')
    if slug.lower() in RESERVED_STEMS:
        raise Fail(EXIT_INPUT, rel, line, 'Task13 §3 规则 4', 'slug 整干等于 Windows 保留设备名')
    if CONTRACT_ID_RE.match(slug):
        raise Fail(EXIT_INPUT, rel, line, 'Task13 §3 规则 4', 'slug 命中合同编号形态 [MFC]xx')
    for pattern in SLUG_DATE_FORMS:
        if re.search(pattern, slug):
            raise Fail(EXIT_INPUT, rel, line, 'Task13 §3 规则 4', 'slug 嵌日期形态 %s' % pattern)


def check_markers(block: str, rel: str, line_no: int, dateline_form: bool) -> None:
    for ch in BODY_BANNED_CHARS:
        if ch in block:
            raise Fail(EXIT_INPUT, rel, line_no, 'Task13 §正文区规则 5', '出现被禁标记 %s' % ch)
    if dateline_form:
        close = block.find('**', 2)
        if close < 0 or block.count('*') != 4:
            raise Fail(EXIT_INPUT, rel, line_no, 'Task13 §正文区规则 3', '首段 **…** 形态非法')
        return
    if block[:1] in BODY_BANNED_HEAD or ORDERED_LIST_RE.match(block):
        raise Fail(EXIT_INPUT, rel, line_no, 'Task13 §正文区规则 5', '行首出现被禁标记')
    if '*' in block:
        raise Fail(EXIT_INPUT, rel, line_no, 'Task13 §正文区规则 4', '非首段行首之外出现 *')


def parse_article(path: Path, rel: str, registry: List[Column]) -> Tuple[Article, List[str]]:
    raw = path.read_bytes()
    check_byte_layer(raw, rel)
    lines = raw.decode('utf-8').split('\n')[:-1]
    rules = [i + 1 for i, ln in enumerate(lines) if ln == '---']
    if len(rules) != 2 or rules[0] != 1:
        raise Fail(EXIT_INPUT, rel, rules[-1] if rules else 1, 'Task13 §文章源文件',
                   '分隔线全文件恰两处（第 1 行与正文区前）')
    second = rules[1]
    fm_lines = lines[1:second - 1]
    if second + 1 >= len(lines) or lines[second] != '' or lines[second + 1] == '':
        raise Fail(EXIT_INPUT, rel, second + 2, 'Task13 §文章源文件', '正文区前须恰一个空行且正文非空')
    base_line = second + 2

    fields: Dict[str, str] = {}
    for offset, line in enumerate(fm_lines, start=2):
        if line == '':
            raise Fail(EXIT_INPUT, rel, offset, 'Task13 §3 规则 2', 'front-matter 出现空行')
        at = line.find(': ')
        if at < 0:
            raise Fail(EXIT_INPUT, rel, offset, 'Task13 §3 规则 1', '缺少 ASCII 冒号加空格分界')
        key = line[:at]
        if not KEY_RE.match(key):
            raise Fail(EXIT_INPUT, rel, offset, 'Task13 §3 规则 1', '键名不合法：%s' % key)
        if key not in ALLOWED_KEYS:
            raise Fail(EXIT_INPUT, rel, offset, 'Task13 §3 规则 2', '未知键 %s' % key)
        if key in fields:
            raise Fail(EXIT_INPUT, rel, offset, 'Task13 §3 规则 2', '重复键 %s' % key)
        value = line[at + 2:].strip(' ')
        if value == '':
            raise Fail(EXIT_INPUT, rel, offset, 'Task13 §3 规则 2', '空值 %s' % key)
        if value[0] in VALUE_BAD_HEAD:
            raise Fail(EXIT_INPUT, rel, offset, 'Task13 §3 规则 3', '值以被禁起始符开头：%s' % value[0])
        fields[key] = value
    for key in REQUIRED_KEYS:
        if key not in fields:
            raise Fail(EXIT_INPUT, rel, 2, 'Task13 §3 规则 2', '缺少必填键 %s' % key)

    stem, slug = path.stem, fields['slug']
    validate_slug(slug, stem, rel)

    column = fields['column']
    row = next((r for r in registry if r.key == column), None)
    if row is None:
        raise Fail(EXIT_INPUT, rel, 2, 'Task13 §3 规则 5', 'column 不在注册表内：%s' % column)
    byline = fields['byline']
    for prefix in ('作者：', '记者：', '评论员：'):
        if prefix in byline:
            raise Fail(EXIT_INPUT, rel, 2, 'Task13 §3 规则 6', 'byline 含被禁前缀 %s' % prefix)
    if byline not in BYLINE_ALLOWED:
        raise Fail(EXIT_INPUT, rel, 2, 'Task13 §3 规则 6（R15）',
                   'byline 不在白名单 {蓝色空间, 站外投稿} 内')
    date = fields.get('date')
    if date is not None and not ISO_RE.match(date):
        raise Fail(EXIT_INPUT, rel, 2, 'Task13 §3 规则 7', 'date 不是 YYYY-MM-DD 月日范围形态')
    order = 0
    if 'order' in fields:
        if not ORDER_RE.match(fields['order']):
            raise Fail(EXIT_INPUT, rel, 2, 'Task13 §3 规则 10', 'order 非非负整数')
        order = int(fields['order'])
    end_date = fields.get('end_date')
    if end_date is not None and not END_DATE_RE.match(end_date):
        raise Fail(EXIT_INPUT, rel, 2, 'Task13 §3 规则 9（R12）',
                   'end_date 不匹配 ^（自然选择号\\d{1,2}月\\d{1,2}日）$')

    blocks = split_blocks(lines[second + 1:], rel, base_line)
    dateline: Optional[str] = None
    rendered: List[str] = []
    paragraphs: List[str] = []
    for index, (line_no, block) in enumerate(blocks):
        is_head = index == 0 and block.startswith('**')
        check_markers(block, rel, line_no, is_head)
        if is_head:
            close = block.find('**', 2)
            dateline = block[2:close]
            rest = block[close + 2:]
            if not dateline:
                raise Fail(EXIT_INPUT, rel, line_no, 'Task13 §正文区规则 3', '电头为空')
            if rest[:1] != ' ' or rest[1:2] == ' ' or len(rest) < 2:
                raise Fail(EXIT_INPUT, rel, line_no, 'Task1 §4 电头高风险点',
                           '电头闭合后须恰一个 U+0020 且其后有正文')
            paragraphs.append(dateline + ' ' + rest[1:])
            rendered.append(render_paragraph(dateline, rest[1:]))
        else:
            paragraphs.append(block)
            rendered.append(render_paragraph(None, block))

    display_date = fields.get('display_date')
    if display_date is not None:
        if not MDATE_RE.match(display_date):
            raise Fail(EXIT_INPUT, rel, 2, 'Task13 §3 规则 8', 'display_date 不匹配 ^\\d{1,2}月\\d{1,2}日$')
        if YEAR_FORM_RE.search(display_date):
            raise Fail(EXIT_INPUT, rel, 2, 'Task12 R5③', 'display_date 含年份形态')
        if not any(display_date in item for item in paragraphs + ([end_date] if end_date else [])):
            raise Fail(EXIT_INPUT, rel, 2, 'Task13 §3 规则 8', 'display_date 不是本文 textContent 子串')

    article = Article(slug, column, fields['title'], byline, date, display_date,
                      end_date, order, paragraphs, dateline, rel)
    for value in [article.title, byline, display_date, end_date] + paragraphs:
        if value is not None and esc(value) != value:
            raise Fail(EXIT_SELFCHECK, rel, 2, 'Task14 §解析与渲染合同 2', '转义改动了内容源字符')
    return article, rendered


def check_spec(article: Article, spec: dict, row: Column) -> bool:
    """迁移保真交叉验证：Task 13 交接规格里登记过的 slug 必须逐项相等（R12）。
       未登记的 slug 是新增稿件——规格不是准入名单，它只受通用规则约束。
       返回值表示本篇是否被规格覆盖，供构建摘要计数，避免"悄悄少比了几篇"。"""
    entry = spec['pages'].get(article.slug)
    if entry is None:
        return False
    pairs = [('column', article.column), ('column_label', row.label), ('list_page', row.list_page),
             ('output_file', article.output_name), ('title', article.title),
             ('byline', article.byline), ('display_date', article.display_date),
             ('end_date', article.end_date), ('paragraphs', article.paragraphs),
             ('paragraph_count', len(article.paragraphs))]
    for name, actual in pairs:
        if entry[name] != actual:
            raise Fail(EXIT_INPUT, article.rel, 2, 'Task14 §Task 14.4 完成条件', '%s 与期望产物规格不符' % name)
    want = entry['dateline']['text']
    if want != article.dateline:
        raise Fail(EXIT_INPUT, article.rel, 2, 'Task14 §Task 14.4 完成条件', '电头归属与期望产物规格不符')
    return True


def sort_articles(articles: List[Article], registry: List[Column]) -> List[Article]:
    rank = {row.key: i for i, row in enumerate(registry)}
    tail = sorted(articles, key=lambda a: (a.order, rank[a.column], a.slug))
    dated = sorted(tail, key=lambda a: a.date or '', reverse=True)
    return [a for a in dated if a.date] + [a for a in dated if not a.date]


def article_inner(article: Article, label: str, rendered: List[str]) -> bytes:
    lines = ['    <article class="article">', '      <header class="article__header">',
             '        <p class="article__type">%s</p>' % esc(label),
             '        <h1 class="page-title">%s</h1>' % esc(article.title),
             '        <p class="article__byline">%s</p>' % esc(article.byline),
             '      </header>', '', '      <div class="article__body">']
    lines += rendered
    lines.append('      </div>')
    if article.end_date is not None:
        lines += ['', '      <p class="article__date">%s</p>' % esc(article.end_date)]
    lines.append('    </article>')
    return ('\n'.join(lines) + '\n').encode('utf-8')


def list_inner(label: str, items: List[Article]) -> bytes:
    lines = ['    <h1 class="page-title">%s</h1>' % esc(label), '', '    <ul class="entry-list">']
    for article in items:
        spans = '<span class="entry-list__title">%s</span>' % esc(article.title)
        if article.display_date is not None:
            spans += '<span class="entry-list__date">%s</span>' % esc(article.display_date)
        lines += ['      <li class="entry-list__item">',
                  '        <a class="entry-list__link" href="article-%s.html">%s</a>' % (esc(article.slug), spans),
                  '      </li>']
    lines.append('    </ul>')
    return ('\n'.join(lines) + '\n').encode('utf-8')


def latest_inner(items: List[Article]) -> bytes:
    lines = ['    <div class="home-latest" role="region" aria-labelledby="latest-title">',
             '      <h2 class="home-latest__title" id="latest-title">最新报道</h2>',
             '      <ul class="home-latest__list">']
    for article in items:
        spans = '<span class="home-latest__entry">%s</span>' % esc(article.title)
        if article.display_date is not None:
            spans += '<span class="home-latest__date">%s</span>' % esc(article.display_date)
        lines += ['        <li class="home-latest__item">',
                  '          <a class="home-latest__link" href="article-%s.html">%s</a>' % (esc(article.slug), spans),
                  '        </li>']
    lines += ['      </ul>', '    </div>']
    return ('\n'.join(lines) + '\n').encode('utf-8')


def home_inner(partial: bytes, items: List[Article]) -> bytes:
    h1 = ('    <h1 class="page-title">%s</h1>\n' % HOME_TITLE).encode('utf-8')
    return h1 + b'\n' + partial + b'\n' + latest_inner(items)


def insert_current(shell: bytes, current: str, out_name: str) -> bytes:
    literal = ('href="%s"' % current).encode('utf-8')
    at = shell.find(NAV_OPEN.encode())
    if at < 0:
        raise Fail(EXIT_INPUT, out_name, 1, 'Task14 §公共壳合同 1 第3条', '未找到 #site-navigation 子树')
    start = shell.find(b'>', at) + 1
    end = shell.find(b'</nav>', start)
    if end < 0:
        raise Fail(EXIT_INPUT, out_name, 1, 'Task14 §公共壳合同 1 第3条', 'nav 无配对闭合标签')
    subtree = shell[start:end]
    hits = subtree.count(literal)
    if hits != 1:
        raise Fail(EXIT_INPUT, out_name, 1, 'Task14 §公共壳合同 1 第3条',
                   'nav 子树内 %s 命中 %d 次（须恰一次）' % (current, hits))
    return shell[:start] + subtree.replace(literal, literal + ARIA.encode(), 1) + shell[end:]


def assemble(shell: bytes, title_body: str, current: str, inner: bytes, out_name: str) -> bytes:
    if not inner.endswith(b'\n'):
        raise Fail(EXIT_SELFCHECK, out_name, 1, 'Task14 §公共壳合同 1 第2条', 'mainInner 未以 LF 结束')
    body = insert_current(shell, current, out_name)
    body = body.replace(MAIN_SLOT.encode(), inner, 1)
    body = body.replace(TITLE_SLOT.encode(), esc(title_body).encode('utf-8'), 1)
    return body


def root_path_shell(shell: bytes) -> bytes:
    """Return the online-only 404 shell with every site navigation target rooted."""
    replacements = {
        b'href="styles.css"': b'href="/styles.css"',
        b'src="script.js"': b'src="/script.js"',
        b'href="index.html"': b'href="/"',
        b'href="news-message.html"': b'href="/news-message.html"',
        b'href="news-feature.html"': b'href="/news-feature.html"',
        b'href="news-commentary.html"': b'href="/news-commentary.html"',
        b'href="submission.html"': b'href="/submission.html"',
    }
    expected = {b'href="styles.css"': 1, b'src="script.js"': 1,
                b'href="index.html"': 2, b'href="news-message.html"': 1,
                b'href="news-feature.html"': 1, b'href="news-commentary.html"': 1,
                b'href="submission.html"': 1}
    for old, new in replacements.items():
        if shell.count(old) != expected[old]:
            raise Fail(EXIT_SELFCHECK, ERROR_PAGE, 1, 'Task 19 §线上专用 404 壳',
                       '%s 引用计数不符' % old.decode('ascii'))
        shell = shell.replace(old, new)
    return shell


def not_found_inner() -> bytes:
    return ('    <div class="home-sections">\n'
            '      <section class="home-section" aria-labelledby="not-found-title">\n'
            '        <h1 class="page-title" id="not-found-title">页面不存在</h1>\n'
            '        <p class="home-section__text">这个页面不存在，或已经被移走。</p>\n'
            '        <p class="home-section__text"><a href="/">返回首页</a></p>\n'
            '      </section>\n'
            '    </div>\n').encode('utf-8')


def error_page(shell: bytes) -> bytes:
    inner = not_found_inner()
    body = root_path_shell(shell).replace(MAIN_SLOT.encode(), inner, 1)
    return body.replace(TITLE_SLOT.encode(), esc(ERROR_TITLE).encode('utf-8'), 1)


def check_error_page(data: bytes) -> None:
    text = data.decode('utf-8')
    required = ('<title>页面不存在%s自然选择号</title>' % SEP,
                '<h1 class="page-title" id="not-found-title">页面不存在</h1>',
                '<p class="home-section__text">这个页面不存在，或已经被移走。</p>',
                '<a href="/">返回首页</a>', 'href="/styles.css"', 'src="/script.js"',
                'href="/news-message.html"', 'href="/news-feature.html"',
                'href="/news-commentary.html"', 'href="/submission.html"',
                'href="#main-content">跳至正文')
    for needle in required:
        if text.count(needle) != 1:
            raise Fail(EXIT_SELFCHECK, ERROR_PAGE, 1, 'Task 19 §线上专用 404 自检',
                       '缺少或重复 %s' % needle)
    if text.count('<main') != 1 or text.count('<h1') != 1 or 'aria-current' in text:
        raise Fail(EXIT_SELFCHECK, ERROR_PAGE, 1, 'Task 19 §线上专用 404 自检',
                   '<main>/<h1> 不唯一，或错误页出现导航高亮')


def check_easteregg_page(data: bytes) -> None:
    text = data.decode('utf-8')
    if (len(re.findall(r'<main\b', text)) != 1 or len(re.findall(r'<h1\b', text)) != 1 or
            '<title>自然选择号：最后的回波</title>' not in text or
            '<h1 class="egg-title">自然选择号：最后的回波</h1>' not in text):
        raise Fail(EXIT_SELFCHECK, 'easteregg.html', 1, 'Task20 §7.4 独立壳', '标题、main 或 h1 身份无效')
    if '<a class="egg-skip-link" href="#main-content">跳至正文</a>' not in text:
        raise Fail(EXIT_SELFCHECK, 'easteregg.html', 1, 'Task20 §7.4 独立壳', '缺跳至正文链接')
    if text.count('<link rel="stylesheet" href="easteregg.css">') != 1 or text.count('<script src="easteregg.js" defer></script>') != 1:
        raise Fail(EXIT_SELFCHECK, 'easteregg.html', 1, 'Task20 §9.1 双目标装配', '必须且仅加载生成的游戏 CSS 与 defer JS')
    if 'script.js' in text or 'styles.css' in text or 'aria-current' in text:
        raise Fail(EXIT_SELFCHECK, 'easteregg.html', 1, 'Task20 §9.1 独立壳', '彩蛋不得加载共享导航或纸媒状态')
    if re.search(r'\s(?:style|on[a-z]+|data-[\w-]+)\s*=', text, re.I) or '<script>' in text:
        raise Fail(EXIT_SELFCHECK, 'easteregg.html', 1, 'Task20 §11.2 T20-S02', '内联脚本、样式、事件或 data 属性')
    if text.count('href="index.html"') != 3:
        raise Fail(EXIT_SELFCHECK, 'easteregg.html', 1, 'Task20 §4.1 返回链接合同', '所有报社返回链接必须为 index.html')
    if '{{' in text or '}}' in text:
        raise Fail(EXIT_SELFCHECK, 'easteregg.html', 1, 'Task20 §9.1 URL 槽位', '残留模板槽位')


def build_pages(root: Path, spec_check: bool = True) -> dict:
    registry = load_registry(root)
    shell = load_shell(root)
    partial = load_partial(root)
    spec = load_spec(root)

    articles: List[Article] = []
    rendered: Dict[str, List[str]] = {}
    spec_covered = []
    for path in sorted((root / 'content/articles').glob('*.md'), key=lambda p: p.name):
        rel = 'content/articles/%s' % path.name
        article, paras = parse_article(path, rel, registry)
        if spec_check:
            if check_spec(article, spec, next(r for r in registry if r.key == article.column)):
                spec_covered.append(article.slug)
        articles.append(article)
        rendered[article.slug] = paras
    if spec_check and sorted(spec['pages']) != sorted(spec_covered):
        raise Fail(EXIT_SELFCHECK, 'content/articles', 1, 'Task14 §Task 14.4 完成条件',
                   '期望产物规格登记 %d 篇、实际逐项比对 %d 篇；未比对=%s'
                   % (len(spec['pages']), len(spec_covered),
                      sorted(set(spec['pages']) - set(spec_covered)) or '无'))
    if len({a.slug for a in articles}) != len(articles):
        raise Fail(EXIT_INPUT, 'content/articles', 1, 'Task14 §自检清单 S11', 'slug 重复')
    for row in registry:
        if not any(a.column == row.key for a in articles):
            raise Fail(EXIT_INPUT, 'content/columns.md', registry.index(row) + 1,
                       'Task14 §自检清单 S11', '栏目 %s 零篇文章' % row.key)
    if len(articles) < HOME_ARTICLES:
        # R11① 约束的是最新区块"取全局前 3 条"，不是全站恰好 3 篇；稿件增多是正常的。
        raise Fail(EXIT_INPUT, 'content/articles', 1, 'Task12 R11①',
                   '稿件不足 %d 篇，无法填满首页最新区（实为 %d 篇）' % (HOME_ARTICLES, len(articles)))

    ordered = sort_articles(articles, registry)
    pages: Dict[str, bytes] = {}
    inners: Dict[str, bytes] = {}
    titles: Dict[str, str] = {}
    currents: Dict[str, str] = {}

    for article in articles:
        row = next(r for r in registry if r.key == article.column)
        name = article.output_name
        inners[name] = article_inner(article, row.label, rendered[article.slug])
        titles[name], currents[name] = article.title, row.list_page
        pages[name] = assemble(shell, article.title, row.list_page, inners[name], name)

    for row in registry:
        items = [a for a in ordered if a.column == row.key]
        inners[row.list_page] = list_inner(row.label, items)
        titles[row.list_page], currents[row.list_page] = row.label, row.list_page
        pages[row.list_page] = assemble(shell, row.label, row.list_page,
                                        inners[row.list_page], row.list_page)

    # R15②：投稿页是 PAPER 角色的静态信息页——不进 columns、不参与 N 与首页最新区，
    # 也不带日期节点，因此它只增加一张壳页。
    submission_inner = load_submission(root)
    inners[SUBMISSION_PAGE] = submission_inner
    titles[SUBMISSION_PAGE], currents[SUBMISSION_PAGE] = SUBMISSION_TITLE, SUBMISSION_PAGE
    pages[SUBMISSION_PAGE] = assemble(shell, SUBMISSION_TITLE, SUBMISSION_PAGE,
                                      submission_inner, SUBMISSION_PAGE)

    # R11①：首页最新区只渲染全局排序后的前 HOME_ARTICLES 条。
    # 旧内容集合下"全部"恰好等于"前 3"，所以这里少写的截断一直没暴露；第四篇一进来就会把首页撑成 5 条。
    inners['index.html'] = home_inner(partial, ordered[:HOME_ARTICLES])
    titles['index.html'], currents['index.html'] = HOME_TITLE, 'index.html'
    pages['index.html'] = assemble(shell, HOME_TITLE, 'index.html', inners['index.html'], 'index.html')

    # Cloudflare Pages serves this document for unknown routes with an HTTP 404.
    # Its root-relative shell is intentionally online-only; the other pages stay file:// safe.
    titles[ERROR_PAGE], currents[ERROR_PAGE] = ERROR_TITLE, None
    inners[ERROR_PAGE] = not_found_inner()
    pages[ERROR_PAGE] = error_page(shell)

    try:
        egg_files = egg_renderer.render_target(root, 'main')
        egg_contract = egg_renderer.load_contract(root)
        home_counts = egg_contract['home']['tags']
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        raise Fail(EXIT_INPUT, 'build/easteregg', 1, 'Task20 §渲染入口', str(error))
    pages['easteregg.html'] = egg_files['easteregg.html']
    titles[egg_contract['main']['egg_html']] = egg_contract['game']['title']
    currents['easteregg.html'] = None
    assets = {name: egg_files[name] for name in ('easteregg.css', 'easteregg.js')}
    paper_html = sorted(name for name in pages if name not in (ERROR_PAGE, 'easteregg.html'))

    return {'pages': pages, 'inners': inners, 'titles': titles, 'currents': currents,
            'assets': assets, 'home_counts': home_counts, 'paper_html': paper_html,
            'egg_html': ['easteregg.html'], 'error_html': [ERROR_PAGE],
            'shell': shell, 'partial': partial, 'registry': registry,
            'articles': articles, 'ordered': ordered}


def split_main(data: bytes, name: str) -> Tuple[bytes, bytes, bytes]:
    open_at = data.find(OPEN_TAG.encode())
    close_at = data.find(CLOSE_TAG.encode())
    if data.count(OPEN_TAG.encode()) != 1 or data.count(CLOSE_TAG.encode()) != 1 or close_at < open_at:
        raise Fail(EXIT_SELFCHECK, name, 1, 'Task14 §自检清单 S8', '<main> 两条标签行非唯一')
    head_end = open_at + len(OPEN_TAG)
    return data[:head_end], data[head_end:close_at], data[close_at:]


def check_output_bytes(name: str, data: bytes) -> None:
    if data.startswith(b'\xef\xbb\xbf'):
        raise Fail(EXIT_SELFCHECK, name, 1, 'Task14 §自检清单 S12', '输出含 BOM')
    if b'\r' in data or b'\t' in data:
        raise Fail(EXIT_SELFCHECK, name, 1, 'Task14 §自检清单 S12', '输出含 CR 或 TAB')
    if not data.endswith(b'\n') or data.endswith(b'\n\n'):
        raise Fail(EXIT_SELFCHECK, name, 1, 'Task14 §自检清单 S12', '末尾不是恰好一个 LF')
    for i, line in enumerate(data.decode('utf-8').split('\n'), start=1):
        if line != line.rstrip(' \x0b\x0c'):
            raise Fail(EXIT_SELFCHECK, name, i, 'Task14 §自检清单 S12', '行尾空白')
    if b'{{' in data or b'}}' in data:
        raise Fail(EXIT_SELFCHECK, name, 1, 'Task14 §自检清单 S5', '残留模板槽位记号')


def check_forbidden(name: str, data: bytes) -> None:
    text = data.decode('utf-8')
    if ISO_FORM_RE.search(text):
        raise Fail(EXIT_SELFCHECK, name, 1, 'Task14 §自检清单 S6', '含 ISO 形态日期')
    if YEAR_FORM_RE.search(text):
        raise Fail(EXIT_SELFCHECK, name, 1, 'Task14 §自检清单 S6', '含年份形态 (19|20)\\d{2}')
    for needle in ('data-', '<time', 'datetime='):
        if needle in text:
            raise Fail(EXIT_SELFCHECK, name, 1, 'Task14 §自检清单 S6', '含 %s' % needle)
    for needle in BANNED_SUBSTRINGS:
        if needle in text:
            raise Fail(EXIT_SELFCHECK, name, 1, 'Task14 §自检清单 S7', '含禁串 %s' % needle)
    for frag in MATERIAL_FRAGMENTS:
        if frag in text:
            raise Fail(EXIT_SELFCHECK, name, 1, 'Task14 §自检清单 S7', '含素材哈希 16 位片段')
    for field, pattern in FIELD_WORD_RES.items():
        if pattern.search(text):
            raise Fail(EXIT_SELFCHECK, name, 1, 'Task14 §自检清单 S7', '含 front-matter 字段名 %s' % field)


def check_structure(name: str, data: bytes, current: str) -> None:
    text = data.decode('utf-8')
    if text.count('<main') != 1 or text.count('<h1') != 1:
        raise Fail(EXIT_SELFCHECK, name, 1, 'Task14 §自检清单 S8', '<main>／<h1> 不唯一')
    if text.count('aria-current="page"') != 1 or text.count('aria-current') != 1:
        raise Fail(EXIT_SELFCHECK, name, 1, 'Task14 §自检清单 S8', 'aria-current 计数非 1')
    at = text.find('aria-current="page"')
    anchor = text.rfind('<a ', 0, at)
    if anchor < 0:
        raise Fail(EXIT_SELFCHECK, name, 1, 'Task14 §自检清单 S8', 'aria-current 不在 <a> 上')
    href = re.search(r'href="([^"]*)"\s*$', text[anchor:at])
    if href is None or href.group(1) != current:
        raise Fail(EXIT_SELFCHECK, name, 1, 'Task14 §自检清单 S8', '当前项未落在 %s' % current)


def check_home_inner(name: str, inner: bytes, ordered: List[Article], expected_counts: dict) -> None:
    counts: Dict[str, int] = {}
    for tag in TAG_RE.findall((OPEN_TAG + inner.decode('utf-8'))):
        counts[tag] = counts.get(tag, 0) + 1
    if counts != expected_counts:
        raise Fail(EXIT_SELFCHECK, name, 1, 'Task14 §自检清单 S9',
                   '首页标签计数 %s≠%s' % (counts, expected_counts))
    visible = list(HOME_FROZEN_TEXTS)
    text = inner.decode('utf-8')
    for article in ordered[:HOME_ARTICLES]:
        visible.append(article.title)
        if article.display_date is not None:
            visible.append(article.display_date)
    stripped = TAG_STRIP_RE.sub('', text)
    if WHITESPACE_RE.sub('', stripped) != ''.join(visible):
        raise Fail(EXIT_SELFCHECK, name, 1, 'Task12 R4④', '首页可见文本与 %d 项白名单不逐字相等' % len(visible))


def self_check(root: Path, built: dict) -> None:
    pages, inners, titles, currents = built['pages'], built['inners'], built['titles'], built['currents']
    shell, registry, articles = built['shell'], built['registry'], built['articles']
    index_html = (root / 'qa/_qa_task13/baseline/index.html').read_bytes()

    _, base_interior, _ = split_main(index_html, 'qa/_qa_task13/baseline/index.html')
    if (len(base_interior), sha256(base_interior)) != IDX_INTERIOR_EXPECTED:
        raise Fail(EXIT_SELFCHECK, 'qa/_qa_task13/baseline/index.html', 1,
                   'Task14 §结构或数据基线', '基线首页 interior 字节不符')

    slices = {}
    for row in registry:
        path = root / ('qa/_qa_task13/main_slices/%s.main-interior.html' % row.list_page[:-5])
        slices[row.list_page] = path.read_bytes()
    # R12：S1 的字节级保真腿只覆盖 Task 13 登记过的迁移稿；按 slug 逐篇对位，
    # 而不是"每栏目取一张切片套给该栏目每一篇"。
    spec = load_spec(root)
    by_slug = {a.slug: a for a in articles}
    checked = 0
    for slug, entry in sorted(spec['pages'].items()):
        article = by_slug.get(slug)
        if article is None:
            raise Fail(EXIT_SELFCHECK, 'content/articles', 1, 'Task14 §自检清单 S1',
                       '迁移稿 %s 不在稿件集合内' % slug)
        row = next(r for r in registry if r.key == article.column)
        if inners[article.output_name] != slices[row.list_page]:
            raise Fail(EXIT_SELFCHECK, article.output_name, 1, 'Task14 §自检清单 S1',
                       '详情页 <main> 内部与基线切片不等')
        checked += 1
    if checked != len(slices):
        raise Fail(EXIT_SELFCHECK, 'qa/_qa_task13/main_slices', 1, 'Task14 §自检清单 S1',
                   '切片 %d 张、实际比对 %d 篇，字节腿掉篇' % (len(slices), checked))

    expected_outer = shell.replace(MAIN_SLOT.encode(), b'')
    for name in sorted(pages):
        if name not in built['paper_html'] and name not in built['error_html']:
            continue
        pre, inner, post = split_main(pages[name], name)
        if inner != inners[name]:
            raise Fail(EXIT_SELFCHECK, name, 1, 'Task14 §自检清单 S2', '内部字节与装配结果不符')
        if pre.count(('>%s%s' % (titles[name], SEP)).encode()) != 1:
            raise Fail(EXIT_SELFCHECK, name, 1, 'Task14 §自检清单 S2', '<title> 主体定位失败')
        page_shell = root_path_shell(shell) if name == ERROR_PAGE else shell
        page_expected_outer = page_shell.replace(MAIN_SLOT.encode(), b'')
        normalized = (pre.replace(('>%s%s' % (titles[name], SEP)).encode(),
                                  ('>%s%s' % (TITLE_SLOT, SEP)).encode(), 1)
                      + post).replace(ARIA.encode(), b'', 1)
        if normalized != page_expected_outer:
            raise Fail(EXIT_SELFCHECK, name, 1, 'Task14 §自检清单 S2', '跨页公共壳不全等')

    for page in ('index.html', 'news-message.html', 'news-feature.html', 'news-commentary.html'):
        baseline = (root / ('qa/_qa_task13/baseline/' + page)).read_bytes()
        pre, inner, post = split_main(baseline, page)
        head = pre.decode('utf-8')
        title_body = re.search(r'<title>(.*)%s自然选择号</title>' % SEP, head).group(1)
        found = re.search(r'href="([^"]*)"%s' % re.escape(ARIA), head)
        if found is None:
            raise Fail(EXIT_SELFCHECK, page, 1, 'Task14 §公共壳合同 4', '基线页未找到当前项链接')
        # R15③：这条腿验的是"壳＋装配机能能重出迁移基线"，所以用基线自己派生的四项壳，
        # 而不是已合法增项的 build/shell.html。
        if assemble(derive_shell(baseline), title_body, found.group(1), inner, page) != baseline:
            raise Fail(EXIT_SELFCHECK, page, 1, 'Task14 §公共壳合同 4（R15）', '壳回切结果与基线页面不等')

    golden = root / 'qa/_qa_task14/out/index.html'
    if golden.is_file():
        # R12：golden 的职责是"确定性锚"，只能钉住首页的**冻结引言区**那一段字节。
        # 最新区是按排序规则从稿件派生的，稿件一变它就该变——把它一并钉死，
        # 等于用一次构建的瞬时产物当了永久合同，之后每加一篇文章都会撞墙。
        marker = '    <div class="home-latest"'
        g_text = split_main(golden.read_bytes(), 'qa/_qa_task14/out/index.html')[1].decode('utf-8')
        m_inner = inners['index.html'].decode('utf-8')
        wrapped = egg_renderer.HOME_ENTRY_PARAGRAPH
        original = egg_renderer.HOME_ORIGINAL_PARAGRAPH
        if m_inner.count(wrapped) != 1:
            raise Fail(EXIT_SELFCHECK, 'index.html', 1, 'Task20 §4.3 首页入口包装', '冻结引言包装必须恰好一次')
        m_inner = m_inner.replace(wrapped, original, 1)
        if marker not in g_text or marker not in m_inner:
            raise Fail(EXIT_SELFCHECK, 'index.html', 1, 'Task14 §公共壳合同 4',
                       'golden 或当前首页缺少最新区分界标记')
        g_frozen, m_frozen = g_text.split(marker)[0], m_inner.split(marker)[0]
        if g_frozen != m_frozen:
            raise Fail(EXIT_SELFCHECK, 'index.html', 1, 'Task14 §公共壳合同 4',
                       '首页冻结引言区与 golden 字节不等（最新区为派生物，不参与该比较）')

    for name in sorted(pages):
        check_output_bytes(name, pages[name])
        check_forbidden(name, pages[name])
        if name == ERROR_PAGE:
            check_error_page(pages[name])
        elif name in built['egg_html']:
            check_easteregg_page(pages[name])
        else:
            check_structure(name, pages[name], currents[name])
    check_home_inner('index.html', inners['index.html'], built['ordered'], built['home_counts'])

    for article in articles:
        if article.display_date is not None and not any(article.display_date in t for t in article.body_text):
            raise Fail(EXIT_SELFCHECK, article.output_name, 1, 'Task14 §自检清单 S10',
                       'display_date 非正文 textContent 子串')
        if article.end_date is not None:
            got = pages[article.output_name].count(b'<p class="article__date">')
            if got != 1:
                raise Fail(EXIT_SELFCHECK, article.output_name, 1, 'Task14 §自检清单 S10（R12）',
                           'p.article__date 应恰 1 个，实得 %d' % got)

    wanted = sorted(['index.html', SUBMISSION_PAGE, ERROR_PAGE, 'easteregg.html'] + [r.list_page for r in registry] + [a.output_name for a in articles])
    if sorted(pages) != wanted:
        raise Fail(EXIT_SELFCHECK, 'build/build.py', 1, 'Task14 §自检清单 S11', '输出集合与输入集合不等')
    if sorted(built['assets']) != ['easteregg.css', 'easteregg.js']:
        raise Fail(EXIT_SELFCHECK, 'build/build.py', 1, 'Task20 R14 资源集合', '彩蛋资源集合偏离合同')
    if {a.column for a in articles} != {r.key for r in registry}:
        raise Fail(EXIT_SELFCHECK, 'build/build.py', 1, 'Task14 §自检清单 S11', '注册表三行未全部使用')


def write_all(directory: Path, manifest: List[str], pages: Dict[str, bytes]) -> None:
    for name in manifest:
        (directory / name).write_bytes(pages[name])
    for name in manifest:
        if (directory / name).read_bytes() != pages[name]:
            raise Fail(EXIT_SELFCHECK, name, 1, 'Task14 §写盘与写后复核', '写后读回字节不等')


def _rel(root: Path, path: Path) -> str:
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return path.as_posix()


def check_preview_pages(files: dict) -> None:
    root_page = files['index.html'].decode('utf-8')
    error_page_data = files['404.html'].decode('utf-8')
    if (root_page.count('<main') != 1 or root_page.count('<h1') != 1 or
            '<title>自然选择号：最后的回波</title>' not in root_page or
            '<h1 class="egg-title">自然选择号：最后的回波</h1>' not in root_page or
            '<link rel="stylesheet" href="/easteregg.css">' not in root_page or
            '<script src="/easteregg.js" defer></script>' not in root_page or
            root_page.count('href="https://old-ns-news.pages.dev/"') != 3):
        raise Fail(EXIT_SELFCHECK, 'index.html', 1, 'Task20 §9.1 预览根页合同', '预览根页身份、资源或返回地址不符')
    if ('<title>档案不存在｜自然选择号</title>' not in error_page_data or
            '<h1 class="egg-title">档案不存在</h1>' not in error_page_data or
            'href="/easteregg.css"' not in error_page_data or
            'href="/">返回终端' not in error_page_data or
            'href="https://old-ns-news.pages.dev/">返回报社' not in error_page_data or
            'easteregg.js' in error_page_data):
        raise Fail(EXIT_SELFCHECK, '404.html', 1, 'Task20 §9.1 预览 404 合同', '预览错误页身份、资源或返回地址不符')


def run_preview(root: Path, out: Path, check: bool) -> int:
    if not out.is_dir():
        raise Fail(EXIT_GATE, _rel(root, out), 1, 'Task20 §9.2 目标契约', '预览输出目录必须已存在，构建器不得自建')
    try:
        first = egg_renderer.render_target(root, 'easteregg')
        second = egg_renderer.render_target(root, 'easteregg')
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        raise Fail(EXIT_INPUT, 'build/easteregg', 1, 'Task20 §预览目标渲染', str(error))
    if {key: sha256(value) for key, value in first.items()} != {key: sha256(value) for key, value in second.items()}:
        raise Fail(EXIT_SELFCHECK, 'build/easteregg.py', 1, 'Task20 §9.2 确定性', '两次预览内存构建哈希不等')
    wanted = sorted(egg_renderer.load_contract(root)['preview']['fixed_files'])
    if sorted(first) != wanted:
        raise Fail(EXIT_SELFCHECK, 'build/easteregg.py', 1, 'Task20 §9.2 固定集合', '预览装配出口与 R14 集合不等')
    foreign = sorted(item.name for item in out.iterdir() if item.name not in wanted)
    if foreign:
        raise Fail(EXIT_GATE, _rel(root, out), 1, 'Task20 §9.2 目标契约', '预览目录含清单外文件：%s' % '、'.join(foreign))
    check_preview_pages(first)
    for name, data in first.items():
        check_output_bytes(name, data)
        if name.endswith('.html'):
            check_forbidden(name, data)
    if check:
        drift = [name for name in wanted if not (out / name).is_file() or (out / name).read_bytes() != first[name]]
        for line in drift:
            sys.stderr.write('漂移：%s\n' % line)
        if drift:
            return EXIT_SELFCHECK
        sys.stdout.write('无漂移\n')
        return EXIT_OK
    write_all(out, wanted, first)
    return EXIT_OK


def run(root: Path, out: Path, check: bool, spec_check: bool = True, target: str = 'main') -> int:
    if target == 'easteregg':
        return run_preview(root, out, check)
    if target != 'main':
        raise Fail(EXIT_INPUT, 'build/build.py', 1, 'Task20 §运行契约', '未知 target')
    if not out.is_dir():
        raise Fail(EXIT_GATE, _rel(root, out), 1, 'Task14 §运行契约', '输出目录必须已存在，构建器不得自建')
    check_gate(root, spec_check)

    built = build_pages(root, spec_check)
    first_files = {**built['pages'], **built['assets']}
    second_built = build_pages(root, spec_check)
    second_files = {**second_built['pages'], **second_built['assets']}
    if {k: sha256(v) for k, v in first_files.items()} != {k: sha256(v) for k, v in second_files.items()}:
        raise Fail(EXIT_SELFCHECK, 'build/build.py', 1, 'Task14 §自检清单 S13', '两次内存构建产物哈希不等')

    manifest = sorted(first_files)
    foreign = sorted(p.name for p in out.iterdir()
                     if p.name not in manifest and p.name not in FOREIGN_ALLOWED)
    if foreign:
        raise Fail(EXIT_GATE, _rel(root, out), 1, 'Task14 §运行契约', '含清单外文件：%s' % '、'.join(foreign))

    self_check(root, built)

    if check:
        drift = []
        for name in manifest:
            target_path = out / name
            if not target_path.is_file():
                drift.append('%s（缺失）' % name)
            elif target_path.read_bytes() != first_files[name]:
                drift.append(name)
        for line in drift:
            sys.stderr.write('漂移：%s\n' % line)
        if drift:
            return EXIT_SELFCHECK
        sys.stdout.write('无漂移\n')
        return EXIT_OK

    write_all(out, manifest, first_files)
    return EXIT_OK


def main(argv: Optional[List[str]] = None, root: Optional[Path] = None, spec_check: bool = True) -> int:
    parser = argparse.ArgumentParser(prog='build.py')
    parser.add_argument('--out', required=True)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--target', choices=('main', 'easteregg'), default='main')
    try:
        args = parser.parse_args(argv)
    except SystemExit:
        return EXIT_INPUT
    base = Path(root) if root is not None else Path(__file__).resolve().parent.parent
    try:
        return run(base, Path(args.out), args.check, spec_check, args.target)
    except Fail as failure:
        sys.stderr.write(failure.rendered + '\n')
        return failure.code


if __name__ == '__main__':
    sys.exit(main())
