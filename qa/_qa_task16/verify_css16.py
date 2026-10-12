#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Task 16 静态核验器（verify_css16.py）

覆盖 plan/Task16 表 3／表 4／§插入位置合同／§禁止清单／§移动端追加合同：
  S1 区段比对（既有区逐字节不变；变更只能是"桌面区 + 移动块内"两处新增）
  S2 新规则选择器集合 ⊆ 12 类；12 类各有桌面规则（无条件）；DOM 在场按 H14 条件口径
  S3 取值白名单（表 2 逐字符）、不新增变量、不新增颜色字面值
  S4 H13 visited 配对（辖域=表 4 点名的四个链接类，.skip-link 显式豁免）
  S5 新规则区禁令命中数为 0 + 注释洁净
  S6 唯一 @media、prelude 精确、仍为最后一个块、桌面新区在其之前
  S7 越界写入（Results/ 除 styles.css 外八文件哈希不变、集合仍为九文件）
  S8 移动端 44 判据：min-block-size 与 min-inline-size 成对，宿主为 display:flex 的链接

结构被破坏时一律记 FAIL 而非抛异常（退出码 1）；核验器自身异常退出码 2，便于区分。
用法：
  python _qa_task16/verify_css16.py [--css Results/styles.css] [--before _qa_task16/before_styles.css]
                                    [--results Results] [--pre] [--out _qa_task16/verify_static.txt]
--pre 用于 16.1.3 的"零新规则基线"：与新增规则相关的判据记 SKIP，其余必须全绿。
"""
import argparse
import difflib
import hashlib
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

NEW_CLASSES = [
    'entry-list', 'entry-list__item', 'entry-list__link', 'entry-list__title', 'entry-list__date',
    'home-latest', 'home-latest__title', 'home-latest__list', 'home-latest__item',
    'home-latest__link', 'home-latest__entry', 'home-latest__date',
]
DATE_CLASSES = ['entry-list__date', 'home-latest__date']
NONDATE_CLASSES = [c for c in NEW_CLASSES if c not in DATE_CLASSES]
NEW_SET = set(NEW_CLASSES)
PSEUDO = r'(?::(?:visited|hover|focus-visible|focus|last-child))*'

# 表 4：H13 辖域是封闭清单，四个链接类；.skip-link 显式豁免
H13_LINKS = ['site-masthead__link', 'site-navigation__link', 'entry-list__link', 'home-latest__link']

# 表 2：允许使用的变量（逐字符抄录自 Results/styles.css:10-45）
TABLE2 = [
    ('--color-paper', '#f5efe4'), ('--color-ink', '#211f1c'), ('--color-muted', '#665d56'),
    ('--color-accent', '#7a2424'), ('--color-rule', '#b8aa98'),
    ('--font-serif', '"Songti SC", "STSong", "SimSun", serif'),
    ('--layout-max', '70rem'), ('--reading-max', '46rem'), ('--title-max', '52rem'),
    ('--page-gutter', '2rem'),
    ('--font-size-small', '0.9375rem'), ('--font-size-body', '1rem'),
    ('--font-size-reading', '1.125rem'), ('--font-size-section-title', '1.5rem'),
    ('--font-size-page-title', '2.5rem'), ('--font-size-masthead', '4rem'),
    ('--line-height-tight', '1.25'), ('--line-height-ui', '1.5'), ('--line-height-reading', '1.9'),
    ('--space-1', '0.25rem'), ('--space-2', '0.5rem'), ('--space-3', '0.75rem'),
    ('--space-4', '1rem'), ('--space-5', '1.5rem'), ('--space-6', '2rem'), ('--space-7', '3rem'),
    ('--space-8', '4rem'),
    ('--rule-thin', '1px'), ('--rule-double', '3px'), ('--focus-width', '2px'),
]
TABLE2_NAMES = {n for n, _ in TABLE2}

# Task0 §稳定接口总清单 既有注册类（公共壳 17 + 首页 4 + 文章页 7 = 26 个口径）
REGISTERED_OLD = [
    'no-js', 'js', 'is-open', 'skip-link', 'site-header', 'site-header__inner', 'site-masthead',
    'site-masthead__link', 'nav-toggle', 'nav-toggle__icon', 'nav-toggle__text', 'site-navigation',
    'site-navigation__list', 'site-navigation__item', 'site-navigation__link', 'main-content',
    'page-title',
    'home-sections', 'home-section', 'home-section__title', 'home-section__text',
    'article', 'article__header', 'article__type', 'article__byline', 'article__body',
    'dateline', 'article__date',
]

FRONTMATTER_FIELDS = ['display_date', 'end_date', 'date', 'order', 'slug', 'column', 'byline']

BANNED = [
    ('content注入', r'(?<![\w-])content\s*:'),
    ('新:root', r'(?<![\w-]):root'),
    ('ID选择器', r'#[\w-]'),
    ('nth-child', r':nth-child\s*\('),
    ('body类前缀', r'body\.'),
    ('important', r'!important'),
    ('transition', r'(?<![\w-])transition'),
    ('animation', r'(?<![\w-])animation'),
    ('transform', r'(?<![\w-])transform'),
    ('grid布局', r'(?<![\w-])grid\b|grid-'),
    ('阴影', r'-shadow\b'),
    ('渐变', r'gradient'),
    ('圆角', r'radius'),
    ('url引用', r'url\s*\('),
    ('@import', r'@import'),
    ('@media', r'@media'),
    ('100vw', r'100vw'),
    ('overflow-x', r'overflow-x'),
    ('word-break:break-all', r'word-break\s*:\s*break-all'),
    ('外部资源', r'https?://|@font-face'),
    ('min-width查询', r'\(\s*min-width'),
    ('fixed/sticky定位', r'position\s*:\s*(?:fixed|sticky)'),
]

ROWS = []

# 表 1：本包开工时 Results/styles.css 的 v1 值
V1_CSS_HASH = '2c23817299492ea9a3fd7ad23237cfabd6723d166bd99194febbed09ad418ba1'


def rec(cid, st, expect, actual=''):
    ROWS.append((cid, st, expect, actual))


def ok(cid, passed, expect, actual=''):
    rec(cid, 'PASS' if passed else 'FAIL', expect, actual)


def skip(cid, expect):
    rec(cid, 'SKIP', expect, '基线模式（--pre，零新规则）不判本项')


def read(path):
    with open(path, 'rb') as f:
        return f.read().decode('utf-8')


def strip_comments(text):
    out, i = [], 0
    while i < len(text):
        if text[i:i + 2] == '/*':
            j = text.find('*/', i + 2)
            end = len(text) if j < 0 else j + 2
            out.append(' ' * (end - i))
            i = end
            continue
        out.append(text[i])
        i += 1
    return ''.join(out)


def parse_nodes(clean):
    nodes, stack, buf, err = [], [], '', ''
    for i, ch in enumerate(clean):
        if ch == '{':
            stack.append({'prelude': buf.strip(), 'start': i, 'children': []})
            buf = ''
        elif ch == '}':
            if not stack:
                err = '多余的 }（偏移 %d）' % i
                break
            n = stack.pop()
            n['body'] = clean[n['start'] + 1:i]
            n['end'] = i
            (stack[-1]['children'] if stack else nodes).append(n)
            buf = ''
        else:
            buf += ch
    if not err and stack:
        err = '未闭合的 {：%s' % '/'.join(s['prelude'][:40] for s in stack)
    if not err and buf.strip():
        err = '顶层游离文本：%s' % buf.strip()[:40]
    for n in nodes:
        n.setdefault('top', True)
    return nodes, err


def rule_blocks(nodes, inside_media=False, out=None):
    """返回全部规则块；inside_media 标记它是否在 @media 内部。"""
    out = [] if out is None else out
    for n in nodes:
        if n['prelude'].startswith('@'):
            rule_blocks(n['children'], True, out)
        else:
            n['in_media'] = inside_media
            out.append(n)
    return out


def split_sel(prelude):
    return [s.strip() for s in re.split(r',\s*', strip_comments(prelude)) if s.strip()]


def sel_classes(sel):
    return {m.group(1) for m in re.finditer(r'\.([A-Za-z_][-\w]*)', sel)}


def line_starts(text):
    starts, acc = [0], 0
    for line in text.split('\n')[:-1]:
        acc += len(line) + 1
        starts.append(acc)
    return starts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--css', default=os.path.join(ROOT, 'Results', 'styles.css'))
    ap.add_argument('--before', default=os.path.join(ROOT, '_qa_task16', 'before_styles.css'))
    ap.add_argument('--results', default=os.path.join(ROOT, 'Results'))
    ap.add_argument('--baseline-hashes', default=os.path.join(ROOT, '_qa_task15', 'hashes_after.txt'))
    ap.add_argument('--pre', action='store_true')
    ap.add_argument('--out', default=os.path.join(ROOT, '_qa_task16', 'verify_static.txt'))
    a = ap.parse_args()
    try:
        run(a)
    except Exception as e:
        sys.stderr.write('INTERNAL ERROR: %r\n' % (e,))
        return 2
    fails = [r for r in ROWS if r[1] == 'FAIL']
    lines = ['# Task 16 静态核验 verify_css16.py', '',
             'css    = %s' % rel(a.css), 'before = %s' % rel(a.before),
             'results= %s' % rel(a.results), 'mode   = %s' % ('pre（零新规则基线）' if a.pre else 'full'), '']
    for cid, st, exp, act in ROWS:
        lines.append('%-4s %-16s 期望: %s' % (st, cid, exp))
        if st != 'PASS':
            lines.append('     实际: %s' % act)
    lines.append('')
    lines.append('总计 %d 条：PASS %d / FAIL %d / N/A %d / SKIP %d' % (
        len(ROWS), sum(1 for r in ROWS if r[1] == 'PASS'), len(fails),
        sum(1 for r in ROWS if r[1] == 'N/A'), sum(1 for r in ROWS if r[1] == 'SKIP')))
    txt = '\n'.join(lines) + '\n'
    d = os.path.dirname(a.out)
    if d:
        os.makedirs(d, exist_ok=True)
    with open(a.out, 'w', encoding='utf-8', newline='\n') as f:
        f.write(txt)
    sys.stdout.buffer.write(txt.encode('utf-8', 'replace'))
    return 1 if fails else 0


def rel(p):
    try:
        return os.path.relpath(p, ROOT).replace('\\', '/')
    except Exception:
        return p


def run(a):
    before_txt, css_txt = read(a.before), read(a.css)
    blines, alines = before_txt.split('\n'), css_txt.split('\n')

    # ---------- S1 区段比对 ----------
    ops = difflib.SequenceMatcher(None, blines, alines, autojunk=False).get_opcodes()
    bad = [(t, i1, i2, j1, j2) for t, i1, i2, j1, j2 in ops if t not in ('equal', 'insert')]
    ok('S1/only-add', not bad,
       'before_styles.css 的每一行都在新文件中逐字节出现（无"修改行"、无"删除行"）',
       '; '.join('%s before %d..%d' % (t, i1, i2) for t, i1, i2, _, _ in bad) or '无改写')

    media_after = next((i for i, l in enumerate(alines) if l.startswith('@media')), None)
    nodes, perr = parse_nodes(strip_comments(css_txt))
    ok('S1/parse', not perr and bool(nodes) and media_after is not None,
       '新文件花括号配对、媒体查询可解析、顶层无游离文本', perr or '顶层块=%d，@media 在第 %d 行' % (len(nodes), (media_after or 0) + 1))

    inserts = [(i1, i2, j1, j2) for t, i1, i2, j1, j2 in ops if t == 'insert']
    desktop_runs = [(j1, j2) for i1, i2, j1, j2 in inserts if j2 <= media_after]
    mobile_runs = [(j1, j2) for i1, i2, j1, j2 in inserts if j1 >= media_after]
    stray_runs = [(j1, j2) for i1, i2, j1, j2 in inserts if j1 < media_after < j2]
    if a.pre:
        ok('S1/two-zones', not inserts, '基线（同一文件）无新增行', str(inserts))
    else:
        ok('S1/two-zones', bool(desktop_runs) and bool(mobile_runs) and not stray_runs,
           '恰有两处新增：@media 之前的桌面区一块 + @media 内部末尾的追加行（新文件 @media 在第 %d 行）'
           % (media_after + 1),
           '桌面新增段=%s 移动新增段=%s 跨块段=%s' % (desktop_runs, mobile_runs, stray_runs))

    new_line_ranges = [] if a.pre else [(j1, j2) for i1, i2, j1, j2 in inserts]
    new_lines = [l for s, e in new_line_ranges for l in alines[s:e]]
    new_text = '\n'.join(new_lines)
    new_clean = strip_comments(new_text)
    new_comments = re.findall(r'/\*[\s\S]*?\*/', new_text)

    blocks = rule_blocks(nodes)
    starts = line_starts(css_txt)

    def off(idx):
        return starts[idx] if 0 <= idx < len(starts) else len(css_txt)

    ins_offsets = [(off(s), off(e)) for s, e in new_line_ranges]
    new_blocks = [b for b in blocks if any(b['start'] >= s and b['start'] < e for s, e in ins_offsets)]

    # ---------- S2 选择器集合 / 规则在场 / DOM 在场 ----------
    if a.pre:
        for cid, exp in (
            ('S2/selectors', '新规则区选择器 ⊆ 12 个新类'),
            ('S2/desktop-rules', '12 个新类各有一条 @media 之前的桌面规则（无条件）'),
            ('S2/class-whitelist', '全文件 class 选择器 ⊆ Task0 注册类 ∪ 归档新增 12 类'),
            ('S2/dom', '10 个非日期新类至少各在一页 DOM 出现；两个 *__date 按 H14 条件口径'),
            ('S4/H13', '四个链接类各有同色 :visited 伴生'),
            ('S8/mobile-44', '两类链接移动规则同时声明 min-block-size / min-inline-size: 44px'),
        ):
            skip(cid, exp)
    else:
        sel_err = []
        for b in new_blocks:
            for sel in split_sel(b['prelude']):
                for part in re.split(r',\s*', sel):
                    part = part.strip()
                    if not part:
                        continue
                    m = re.fullmatch(r'\.([A-Za-z_][-\w]*)%s(?:\[[^\]]*\])?' % PSEUDO, part)
                    if not m or m.group(1) not in NEW_SET:
                        sel_err.append('%s -> %s' % (b['prelude'][:60], part))
        ok('S2/selectors', not sel_err and bool(new_blocks),
           '新规则区选择器 ⊆ 12 个新类（允许 :visited/:hover/:focus-visible/:last-child）',
           '越界=%s；新区规则块=%d' % (' | '.join(sel_err[:6]) or '无', len(new_blocks)))

        desk_new = {c for b in new_blocks if not b['in_media'] for s in split_sel(b['prelude']) for c in sel_classes(s)}
        desk_all = {c for b in blocks if not b['in_media'] for s in split_sel(b['prelude']) for c in sel_classes(s) if c in NEW_SET}
        missing = [c for c in NEW_CLASSES if c not in (desk_new & desk_all)]
        ok('S2/desktop-rules', not missing,
           '12 个新类每个都至少被一条 @media 之前的桌面规则使用（无条件，含两个 *__date；节点缺席不豁免）',
           '缺桌面规则=%s' % (','.join(missing) or '无'))

        css_classes = set()
        for b in blocks:
            for s in split_sel(b['prelude']):
                css_classes |= sel_classes(s)
        out_of_set = sorted(css_classes - set(REGISTERED_OLD) - NEW_SET)
        ok('S2/class-whitelist', not out_of_set,
           'styles.css 的 class 集合 ⊆（Task0 注册 %d 个 ∪ 归档新增 12 个）＝ R6⑥' % len(REGISTERED_OLD),
           '集合外=%s' % (','.join(out_of_set) or '无'))
        dom_check(a)

    # ---------- S3 取值白名单 ----------
    var_used = set(re.findall(r'--[\w-]+', new_clean))
    unknown_var = sorted(v for v in var_used if v not in TABLE2_NAMES)
    ok('S3/var-whitelist', not unknown_var,
       '新规则区引用的每个自定义属性都在表 2 白名单内', '表外=%s' % (','.join(unknown_var) or '无'))
    defined = sorted({m.group(1) for m in re.finditer(r'(?<![\w-])(--[\w-]+)\s*:', new_clean)})
    ok('S3/novar', not defined, '新规则区不新增自定义属性声明（不新增变量、不在 :root 加声明）',
       '声明=%s' % (','.join(defined) or '无'))
    colors = re.findall(r'#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(|(?<![-\w])(?:red|blue|black|white|gray|grey|silver|orange|green|purple|yellow|cyan|magenta|navy|teal|olive)(?![-\w])', new_clean)
    ok('S3/nocolor', not colors, '新规则区不含任何颜色字面值（表 2 之外的色值即违约）',
       '命中=%s' % (','.join(colors) or '无'))
    if not a.pre:
        nums = sorted({m.group(0) for m in re.finditer(r'(?<![\w.-])\d+(?:\.\d+)?(?:px|rem|em|%)\b', new_clean)})
        bad_nums = [n for n in nums if n != '44px']
        ok('S3/numeric', not bad_nums,
           '新规则区的字面长度值只有合同点名的 44px（触控目标），其余取值一律走表 2 变量',
           '表外字面值=%s' % (','.join(bad_nums) or '无'))

    root = next((n['body'] for n in nodes if n['prelude'] == ':root'), None)
    t2 = []
    if root is None:
        t2.append('桌面 :root 区块缺失')
    else:
        for k, v in TABLE2:
            got = re.findall(re.escape(k) + r'\s*:\s*([^;]+);', root)
            if not got:
                t2.append('%s 缺失' % k)
            elif got[0].strip() != v:
                t2.append('%s 期望 "%s" 实际 "%s"' % (k, v, got[0].strip()))
    ok('S3/table2-literal', not t2, '表 2 的 %d 条变量字面值与 styles.css 首个 :root 逐字符相等（含空格与前导零）' % len(TABLE2),
       ' | '.join(t2) or '全部一致')

    # ---------- S4 H13 ----------
    if not a.pre:
        pair = []
        for cls in H13_LINKS:
            base = color_of(blocks, cls, '')
            vis = color_of(blocks, cls, ':visited')
            if base is None:
                pair.append('.%s 自身缺失' % cls)
            elif vis is None:
                pair.append('.%s 缺 :visited 伴生规则' % cls)
            elif vis != base:
                pair.append('.%s:visited "%s" ≠ .%s "%s"' % (cls, vis, cls, base))
        ok('S4/H13', not pair, '四个链接类（%s）各有 :visited 伴生且 color 值逐字符相等' % '/'.join('.' + c for c in H13_LINKS),
           ' | '.join(pair) or '四对配对成立')
    skip_note = [b['prelude'] for b in blocks if '.skip-link' in b['prelude']]
    rec('S4/skip-exempt', 'N/A',
        '.skip-link 在 H13 辖域外（表 4 显式豁免，不判红）。事实登记：它有 color: var(--color-ink) 而无 :visited 伴生，'
        '被访问后聚焦会被全局 a:visited 重绘为暗红；修它需改写既有区，与"既有区逐字节不变"冲突，是否修由用户决定',
        '.skip-link 相关规则=%s' % ('；'.join(skip_note) or '无'))

    # ---------- S5 新区禁令 ----------
    hits = ['%s=%d' % (n, len(re.findall(rx, new_clean))) for n, rx in BANNED if new_clean and re.search(rx, new_clean)]
    ok('S5/banned', not hits,
       '新规则区内 content/:root/ID/:nth-child/body./!important/transition/animation/transform/grid/阴影/渐变/圆角/'
       'url/@import/@media/100vw/overflow-x/word-break:break-all/外链/min-width 查询/fixed|sticky 定位 命中全为 0',
       ' | '.join(hits) or '全部为 0')
    cm = []
    for c in new_comments:
        if re.search(r'(?<![\w])[MF]\d{2}(?![\w])', c):
            cm.append('合同编号形态：%s' % c[:48])
        for f in FRONTMATTER_FIELDS:
            if re.search(r'(?<![\w-])%s(?![\w-])' % f, c):
                cm.append('front-matter 字段名整词 "%s"：%s' % (f, c[:48]))
    ok('S5/comments', not cm, '新注释不含 M01/F01 形态合同编号，不含七个 front-matter 字段名整词（.entry-list__date 这类带前缀的不算命中）',
       ' | '.join(cm) or '注释洁净')

    # ---------- S6 唯一 @media ----------
    medias = [n for n in nodes if n['prelude'].startswith('@media')]
    me = []
    if len(medias) != 1:
        me.append('@media 块数=%d' % len(medias))
    else:
        if re.sub(r'\s+', ' ', medias[0]['prelude']).strip() != '@media (max-width: 768px)':
            me.append('prelude=%r' % medias[0]['prelude'])
        if nodes[-1] is not medias[0]:
            me.append('@media 不是最后一个规则块')
    if not a.pre:
        banner_after = next((i for i, l in enumerate(alines) if 'Task 8：移动端布局覆盖' in l), None)
        last_desktop_end = max((e for s, e in desktop_runs), default=None)
        if not desktop_runs:
            me.append('桌面新区缺失（无 @media 之前的新增段）')
        elif banner_after is not None and last_desktop_end is not None and last_desktop_end > banner_after + 1:
            me.append('桌面新区落在 Task 8 banner 之后（%d > %d）' % (last_desktop_end, banner_after))
        mobile_only = [b for b in new_blocks if b['in_media']]
        if not mobile_only:
            me.append('移动块内无追加规则')
    ok('S6/media', not me, '恰一个 @media (max-width: 768px)、prelude 精确、为最后一个规则块；桌面新区在 @media 之前且紧跟既有第 8 分区之后',
       ' | '.join(me) or '唯一且末块')
    ok('S6/breakpoint', not re.search(r'max-width\s*:\s*767px|min-width\s*:\s*768px|max-width\s*:\s*(?:769|[78][89]\d|\d{4,})px', strip_comments(css_txt)),
       '无 767px／min-width:768px／769px 及以上误写断点（H8/other）', '无命中')

    # ---------- S7 越界写入 ----------
    pages = ['article-classroom-screen-upgrade.html', 'article-math-to-ai-learning.html',
             'article-school-course-volunteer.html', 'index.html', 'news-commentary.html',
             'news-feature.html', 'news-message.html', 'script.js', 'styles.css']
    listing = sorted(os.listdir(a.results))
    ok('S7/collection', listing == pages, 'Results/ 恰为九文件（七页 + styles.css + script.js），无新增文件/子目录', str(listing))
    base = {}
    for line in read(a.baseline_hashes).split('\n'):
        if line.startswith('#') or not line.strip():
            continue
        parts = line.split('\t')
        base[os.path.basename(parts[0])] = parts[1]
    he = []
    for name, h in sorted(base.items()):
        p = os.path.join(a.results, name)
        if name == 'styles.css':
            continue
        if not os.path.exists(p):
            he.append('%s 缺失' % name)
            continue
        if hashlib.sha256(open(p, 'rb').read()).hexdigest() != h:
            he.append('%s 哈希漂移' % name)
    ok('S7/readonly-others', not he,
       '除 styles.css 外八文件与 _qa_task15/hashes_after.txt 逐项相等',
       ' | '.join(he) or '八项不变')
    css_hash = hashlib.sha256(open(a.css, 'rb').read()).hexdigest()
    if a.pre:
        ok('S7/pre-css-baseline', css_hash == V1_CSS_HASH,
           '基线模式：被核验的 styles.css 哈希等于表 1 的 v1 值（开工前快照自证）',
           '实际=%s 期望=%s' % (css_hash, V1_CSS_HASH))
    else:
        ok('S7/css-changed', css_hash != V1_CSS_HASH,
           'styles.css 已按本包授权变化（不再等于表 1 的 v1 值）', '实际=%s' % css_hash)

    # ---------- S8 移动端 44 与堆叠 ----------
    if not a.pre:
        e8 = []
        for cls in ('entry-list__link', 'home-latest__link'):
            mrows = [b for b in new_blocks if b['in_media'] and any(re.fullmatch(r'\.%s' % cls, s) for s in split_sel(b['prelude']))]
            body = '\n'.join(b['body'] for b in mrows)
            if not mrows:
                e8.append('.%s 无移动追加规则' % cls)
                continue
            for prop in ('min-block-size', 'min-inline-size'):
                if not re.search(prop + r'\s*:\s*44px', body):
                    e8.append('.%s 缺 %s: 44px（44×44，Task12:312）' % (cls, prop))
            if not re.search(r'flex-direction\s*:\s*column', body) or not re.search(r'align-items\s*:\s*flex-start', body):
                e8.append('.%s 移动端未堆叠' % cls)
            desk = [b for b in blocks if not b['in_media'] and any(re.fullmatch(r'\.%s' % cls, s) for s in split_sel(b['prelude']))]
            if not re.search(r'display\s*:\s*flex', '\n'.join(b['body'] for b in desk)):
                e8.append('.%s 桌面未 display:flex（min-*-size 对行内元素无效）' % cls)
        wrap = [b for b in new_blocks if b['in_media'] and re.search(r'overflow-wrap\s*:\s*anywhere', b['body'])]
        if not wrap:
            e8.append('标题类缺 overflow-wrap: anywhere 安全换行')
        bad44 = [m.group(0) for m in re.finditer(r'[^;{}]*44px', new_clean) if not re.search(r'min-(?:block|inline)-size\s*:', m.group(0))]
        ok('S8/mobile-44', not e8 and not bad44,
           '两类链接移动规则同时声明两维 44px、堆叠、宿主 display:flex、标题 overflow-wrap: anywhere；'
           '新规则区 44px 只出现在 min-block-size/min-inline-size 上',
           ' | '.join(e8 + bad44) or '达标')


def color_of(blocks, cls, suffix):
    got = None
    for b in blocks:
        for sel in split_sel(b['prelude']):
            if re.fullmatch(r'\.%s%s' % (cls, suffix), sel.strip()):
                m = re.search(r'(?<![\w-])color\s*:\s*([^;]+)', b['body'])
                if m and got is None:
                    got = m.group(1).strip()
    return got


def dom_check(a):
    htmls = sorted(f for f in os.listdir(a.results) if f.endswith('.html'))
    counts = {c: {} for c in NEW_CLASSES}
    for p in htmls:
        t = read(os.path.join(a.results, p))
        for c in NEW_CLASSES:
            n = sum(m.group(1).split().count(c) for m in re.finditer(r'class="([^"]*)"', t))
            if n:
                counts[c][p] = n
    missing = [c for c in NONDATE_CLASSES if not counts[c]]
    ok('S2/dom', not missing, '除两个 *__date 外的 10 个新类每个至少在某个页面 DOM 中出现一次',
       '缺席=%s' % (','.join(missing) or '无'))
    detail = []
    for c in DATE_CLASSES:
        if counts[c]:
            detail.append('%s 在 %d 页输出 %d 次 ⇒ 该类必须在这些页 DOM 中（成立）' % (c, len(counts[c]), sum(counts[c].values())))
        else:
            detail.append('%s 无节点输出 ⇒ DOM 半项 N/A，规则半项仍无条件' % c)
    rec('S2/dom-date', 'N/A' if not any(counts[c] for c in DATE_CLASSES) else 'PASS',
        '两个 *__date 按 H14 条件口径判定（Task12:273／R9：无 display_date 时节点整体缺席）',
        ' | '.join(detail))
    rec('S2/dom-map', 'PASS', '12 类逐页出现次数（供 report.md 与 Task 18/19 期望值）',
        ' | '.join('%s:%d' % (c, sum(counts[c].values())) for c in NEW_CLASSES))


if __name__ == '__main__':
    sys.exit(main())
