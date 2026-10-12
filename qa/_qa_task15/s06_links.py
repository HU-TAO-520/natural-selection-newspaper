#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Task 15.6 链接图、死链、孤儿与引用形式检测。

产出 _qa_task15/link_graph.txt：
  来源页 → 目标 → 出现次数；死链 / 孤儿 / 非法形式 三张结论表；
  28 条主导航路径（7 页 × 4 链接）与 v1 四页贡献的 16 条子集分栏列出。
"""
import collections
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C

PAGES = ['index.html', 'news-message.html', 'news-feature.html', 'news-commentary.html',
         'article-school-course-volunteer.html', 'article-math-to-ai-learning.html',
         'article-classroom-screen-upgrade.html']
V1_PAGES = ['index.html', 'news-message.html', 'news-feature.html', 'news-commentary.html']
NAV_TARGETS = ['index.html', 'news-message.html', 'news-feature.html', 'news-commentary.html']
LIST_OF_DETAIL = {
    'article-school-course-volunteer.html': 'news-message.html',
    'article-math-to-ai-learning.html': 'news-feature.html',
    'article-classroom-screen-upgrade.html': 'news-commentary.html',
}
fails = []
missing = [p for p in PAGES if not os.path.exists(os.path.join(C.RES, p))]
if missing:
    fails.append('期望页面缺失: %s' % missing)
PAGES_PRESENT = [p for p in PAGES if os.path.exists(os.path.join(C.RES, p))]
graph = collections.OrderedDict()

for page in PAGES_PRESENT:
    root = C.parse_file(os.path.join(C.RES, page))
    counts = collections.Counter()
    nav = []
    for node in root.walk():
        href = node.get('href')
        src = node.get('src')
        target = href if href is not None else src
        if target is None:
            continue
        counts[target] += 1
        if node.get('class') and 'site-navigation__link' in node.classes:
            nav.append((target, node.text()))
    graph[page] = counts
    graph[page + '#NAV'] = nav

集合 = set(os.listdir(C.RES))
dead, illegal = [], []
RX_OK = re.compile(r'^[A-Za-z0-9._-]+$')
for page, counts in graph.items():
    if page.endswith('#NAV'):
        continue
    for target in counts:
        if target.startswith('#'):
            if target != '#main-content':
                illegal.append((page, target, '片段仅允许 #main-content'))
            continue
        if target.startswith('/') or re.match(r'^[A-Za-z]:', target) or '\\' in target or '?' in target or '#' in target:
            illegal.append((page, target, '相对引用形式非法'))
            continue
        if not RX_OK.match(target):
            illegal.append((page, target, '含目录分隔或非文件名形态'))
            continue
        if target not in 集合:
            dead.append((page, target, '目标文件不存在'))

inbound = collections.defaultdict(list)
for page, counts in graph.items():
    if page.endswith('#NAV'):
        continue
    for target in counts:
        if not target.startswith('#'):
            inbound[target].append(page)

orphans = []
for detail, listing in LIST_OF_DETAIL.items():
    ref_list = [p for p in inbound[detail] if p == listing]
    ref_home = [p for p in inbound[detail] if p == 'index.html']
    if not ref_list:
        orphans.append('%s 未被所属列表页 %s 引用' % (detail, listing))
    if not ref_home:
        orphans.append('%s 未被首页最新区引用' % detail)
    home_hits = [t for t, n in graph['index.html'].items() if t == detail]
    latest_root = C.parse_file(os.path.join(C.RES, 'index.html'))
    latest = latest_root.first(cls='home-latest')
    in_latest = any(a.get('href') == detail for a in latest.find('a'))
    list_root = C.parse_file(os.path.join(C.RES, listing))
    entry = list_root.first(cls='entry-list')
    in_entry = any(a.get('href') == detail for a in entry.find('a'))
    if not (in_latest and in_entry):
        orphans.append('%s 的引用未落在 entry-list / home-latest 容器内' % detail)

# 反向：列表页与首页引用的每个详情页必须真实存在
reverse_bad = []
for page in ['news-message.html', 'news-feature.html', 'news-commentary.html', 'index.html']:
    for target in graph[page]:
        if target.startswith('article-') and target not in 集合:
            reverse_bad.append((page, target))

nav28 = []
for page in PAGES_PRESENT:
    for target, text in graph[page + '#NAV']:
        nav28.append((page, target, text))
nav16 = [row for row in nav28 if row[0] in V1_PAGES]

NAV_TEXT = ['首页', '新闻消息', '新闻通讯', '新闻评论']
nav_ok = True
nav_problems = []
for page in PAGES_PRESENT:
    seq = graph[page + '#NAV']
    if [t for t, _ in seq] != NAV_TARGETS or [x for _, x in seq] != NAV_TEXT:
        nav_ok = False
        nav_problems.append((page, seq))
missing_targets = [t for t in NAV_TARGETS if t not in 集合]

out = []
out.append('Task 15.6 全站链接图（切换后 Results/ 七页）')
out.append('生成方式：_qa_task15/s06_links.py，解析每页全部 href/src 属性')
out.append('')
out.append('== 一、来源页 → 目标 → 出现次数 ==')
for page in PAGES_PRESENT:
    out.append('%s:' % page)
    for target, n in sorted(graph[page].items()):
        out.append('    %-42s × %d' % (target, n))
out.append('')
out.append('== 二、死链检测（目标文件名必须存在于切换后 Results/ 集合，大小写逐字符一致）==')
out.append('Results/ 集合: %s' % ', '.join(sorted(集合)))
if dead:
    for page, target, why in dead:
        out.append('    DEAD  %s → %s  (%s)' % (page, target, why))
else:
    out.append('    死链 0（全部 %d 种目标名 ∈ 集合）' % len({t for p in PAGES_PRESENT for t in graph[p]}))
out.append('')
out.append('== 三、孤儿页面检测 ==')
for detail, listing in LIST_OF_DETAIL.items():
    out.append('    %s' % detail)
    out.append('        被所属列表页 %s 引用: %s（次数 %d）' % (listing, '是' if listing in inbound[detail] else '否',
                                                          inbound[detail].count(listing)))
    out.append('        被首页最新区引用: %s（次数 %d）' % ('是' if 'index.html' in inbound[detail] else '否',
                                                        inbound[detail].count('index.html')))
out.append('    孤儿 %d' % len(orphans))
for o in orphans:
    out.append('      ORPHAN ' + o)
out.append('    反向（列表页/首页引用的详情页必须真实存在）: %s' % ('0 例外' if not reverse_bad else str(reverse_bad)))
out.append('')
out.append('== 四、相对引用形式检测 ==')
out.append('    规则：不以 / 开头、无盘符、无反斜杠、无查询串、无片段（#main-content 除外）')
out.append('    非法形式 %d' % len(illegal))
for page, target, why in illegal:
    out.append('      ILLEGAL %s → %s (%s)' % (page, target, why))
out.append('')
out.append('== 五、主导航路径 ==')
out.append('口径 A：切换后七页 × 4 链接 = 28 条')
for i, (page, target, text) in enumerate(nav28, 1):
    out.append('    %2d  %-42s → %-22s 文案 %s  目标存在 %s' % (i, page, target, text, '是' if target in 集合 else '否'))
out.append('口径 B：v1 四页 × 4 链接 = 16 条（单列，为口径 A 的子集，两个口径同时成立）')
for i, (page, target, text) in enumerate(nav16, 1):
    out.append('    %2d  %-42s → %-22s 文案 %s  目标存在 %s' % (i, page, target, text, '是' if target in 集合 else '否'))
out.append('    16 ⊂ 28: %s' % ('成立' if all(row in nav28 for row in nav16) else '不成立'))
out.append('    主导航四链接文字与顺序全站一致: %s' % ('是' if nav_ok else '否 ' + str(nav_problems)))
out.append('    四目标文件在切换后集合中全部存在: %s' % ('是' if not missing_targets else str(missing_targets)))

path = os.path.join(C.QA, 'link_graph.txt')
with open(path, 'w', encoding='utf-8', newline='\n') as handle:
    handle.write('\n'.join(out) + '\n')

print('死链 %d，孤儿 %d，非法形式 %d，主导航 28 条（其中 v1 16 条）' % (len(dead), len(orphans), len(illegal)))
print('写出 %s（%d 行）' % (path, len(out)))
if dead:
    fails.append('死链 %d' % len(dead))
if orphans:
    fails.append('孤儿 %d' % len(orphans))
if illegal:
    fails.append('非法引用形式 %d' % len(illegal))
if len(nav28) != 28 or len(nav16) != 16:
    fails.append('主导航路径口径不符（28/%d，16/%d）' % (len(nav28), len(nav16)))
if not nav_ok:
    fails.append('主导航文案或顺序异常')
if missing_targets:
    fails.append('主导航目标缺失')
if reverse_bad:
    fails.append('反向引用指向不存在的详情页')

print('\n15.6 ' + ('PASS' if not fails else 'FAIL'))
for f in fails:
    print('  FAIL: ' + f)
sys.exit(1 if fails else 0)
