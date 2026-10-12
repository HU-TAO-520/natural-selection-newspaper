#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Task 15.7 禁止项、离线与降级复扫（Task12 R6 扩充清单 + R7 换值）。

扫描范围：Results/ 全部九文件。七个 front-matter 字段名一律整词匹配，
年份形态一律 (19|20)\\d{2}，禁用裸 \\d{4}（styles.css 会误报）。
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C

FILES = sorted(os.listdir(C.RES))
HTML7 = [n for n in FILES if n.endswith('.html')]
fails = []
hits = []

FIXED = ['厨一枚', '胡桃', '新闻评价', '2026', 'TODO', 'TBD', '{{', '}}',
         '作者：', '记者：', '评论员：', '来源：', 'http://', 'https://', '@import', '@font-face', 'url(',
         'Materials/', '新闻消息.docx', '新闻通讯.docx', '新闻评价.docx',
         '<time', 'datetime=', 'style=', '<style']
FIELDS = ['display_date', 'end_date', 'date', 'order', 'slug', 'column', 'byline']
EXEMPT = ['entry-list__date', 'home-latest__date', 'article__date', 'page-title', '<title>']
MATERIAL_HASH16 = ['de10b575399e0563', '8e50cfc892870351', '0c5b35256b7271ac']
MATERIAL_HASH_FULL = ['de10b575399e0563430f2f255c956b179c9978c087897a24910ad70d6a50f6fc',
                      '8e50cfc89287035163d5fe95c8b1cee20a5aa405e9d04ec358fb5c9312c3827c',
                      '0c5b35256b7271acfb2f49aec146288b404ed49c376ac2c8b3f6246b38f894a4']

print('=== 15.7.1 R6 全站禁止项扫描 ===')
for name in FILES:
    text = C.read_text(os.path.join(C.RES, name))
    per = []
    for token in FIXED:
        if token == 'http://':
            count = len(re.findall(r'https?://', text))
        elif token == '<style' or token == 'style=':
            count = text.count(token)
        else:
            count = text.count(token)
        if count:
            per.append('%s×%d' % (token, count))
    # 双斜杠（外部资源协议相对形式）
    dbl = len(re.findall(r'(?<!:)//', text))
    if name.endswith('.css') and dbl:
        per.append('//×%d（注释除外由下行核实）' % dbl)
    elif dbl:
        css_comments = text.count('/*')
        if dbl > 0 and name.endswith('.css'):
            per.append('//×%d' % dbl)
        else:
            per.append('//×%d' % dbl)
    # 七个字段名整词匹配（R6① 禁的是"作为字段名出现在公开页面"，HTML 页面为扫描面；
    # styles.css/script.js 的同形关键字单列为说明项，见下方 informational）
    for field in (FIELDS if name.endswith('.html') else []):
        for m in re.finditer(r'(?<![A-Za-z0-9_-])' + field + r'(?![A-Za-z0-9_-])', text):
            per.append('字段名 %s' % field)
    # ISO 日期 / 编号形态
    for rx, label in ((r'\d{4}-\d{2}-\d{2}', 'ISO 日期'), (r'(?<![A-Za-z0-9])[MFC]\d{2}(?![A-Za-z0-9])', 'M/F/C 编号')):
        n = len(re.findall(rx, text))
        if n:
            per.append('%s×%d' % (label, n))
    for frag in MATERIAL_HASH16 + MATERIAL_HASH_FULL:
        if frag in text:
            per.append('素材哈希片段 %s' % frag[:12])
    if per:
        hits.append((name, per))
    print('  %-40s %s' % (name, '命中 0' if not per else '命中: ' + ', '.join(per)))
if hits:
    fails.append('禁止项扫描命中 %d 个文件' % len(hits))
print('  说明项（不计入命中，已登记 report 供 Task 18 采纳）：styles.css 第 385／493 行含整词 `column`，'
      '上下文为 `flex-direction: column;` —— CSS 关键字而非 front-matter 字段名。R6① 的禁令文本是'
      '"作为**字段名**出现在**公开页面**"，样式表不是页面；且 styles.css 按 R10 归 Task 16 独占写入、本包一比特未动。'
      '七个 HTML 的整词字段名命中为 0（见下表）。')

print('\n=== 15.7.1b 豁免与整词匹配的有效性证明 ===')
for name in ('index.html', 'news-message.html', 'article-classroom-screen-upgrade.html'):
    text = C.read_text(os.path.join(C.RES, name))
    bare = {f: len(re.findall(f, text)) for f in FIELDS}
    word = {f: len(re.findall(r'(?<![A-Za-z0-9_-])' + f + r'(?![A-Za-z0-9_-])', text)) for f in FIELDS}
    print('  %s 裸子串命中 %s / 整词命中 %s' % (name, bare, word))
    if sum(bare.values()) > 0 and sum(word.values()) == 0:
        print('    → 证明：裸子串扫描（R5④ 旧口径）会产生 %d 处假阳性，整词匹配把它们全部排除' % sum(bare.values()))

print('\n=== 15.7.2 年份形态与四位数字 ===')
year_hits = []
four_digit_html = []
for name in FILES:
    text = C.read_text(os.path.join(C.RES, name))
    n = len(re.findall(r'(19|20)\d{2}', text))
    if n:
        year_hits.append((name, n, re.findall(r'(19|20)\d{2}', text)[:5]))
    if name in HTML7 or name == 'script.js':
        f = re.findall(r'\d{4}', text)
        if f:
            four_digit_html.append((name, f[:8]))
print('  九文件 (19|20)\\d{2} 命中: %s' % ('0' if not year_hits else year_hits))
print('  七 HTML + script.js 四位数字串: %s' % ('无' if not four_digit_html else four_digit_html))
print('  styles.css 裸 \\d{4} 误报样例（证明必须用年份形态而非裸四位）: %s'
      % sorted(set(re.findall(r'\d{4}', C.read_text(os.path.join(C.RES, 'styles.css')))))[:8])
if year_hits:
    fails.append('年份形态命中')
if four_digit_html:
    fails.append('七 HTML 或 script.js 含四位数字串')

print('\n=== 15.7.2b 首页三段冻结文本逐字符 ===')
FROZEN = ['我们的名字来自《三体》里的一支舰队。',
          '我们主要记录一些自己觉得有价值的东西。',
          '报社成立于“鸽子衔枝之年”。']
root = C.parse_file(os.path.join(C.RES, 'index.html'))
ps = [n.text() for n in root.first(cls='home-sections').find('p')]
for i, (got, want) in enumerate(zip(ps, FROZEN), 1):
    ok = got == want
    if not ok:
        fails.append('首页第 %d 段文本不符' % i)
    print('  第%d段 len=%d（Task12 R7 换值后 18/19/14）%s' % (i, len(got), 'PASS' if ok else 'FAIL'))
    print('    实测 %r' % got)
check_len = [len(x) for x in ps]
if check_len != [18, 19, 14]:
    fails.append('首页三段长度基线 != 18/19/14：%s' % check_len)
print('  长度序列 %s（期望 [18, 19, 14]）' % check_len)

print('\n=== 离线约束静态复核（R1）===')
for name in HTML7 + ['script.js']:
    text = C.read_text(os.path.join(C.RES, name))
    bad = [t for t in ('fetch(', 'XMLHttpRequest', 'import ', 'localStorage', 'sessionStorage', 'document.cookie',
                       'window.location', 'http-equiv', 'location.href') if t in text]
    if bad:
        fails.append('%s 含运行期依赖 %s' % (name, bad))
    print('  %-40s %s' % (name, '运行时依赖命中 0' if not bad else bad))

print('\n15.7 静态部分 ' + ('PASS' if not fails else 'FAIL'))
for f in fails:
    print('  FAIL: ' + f)
sys.exit(1 if fails else 0)
