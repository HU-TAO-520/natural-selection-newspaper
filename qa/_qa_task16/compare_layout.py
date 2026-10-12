#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Task 16.6／16.5.7／16.7 的离线分析：
  A) 缺席容错：删掉一个 display_date 节点的副本，布局不塌、无空洞、无居中错位
  B) 不污染：三篇详情页与首页引言区的关键计算值/位置盒与 v1 逐项相等（容差 0）
  C) 对比度：ink/muted/accent 于纸色的 WCAG 比值
输入为 measure.mjs 产出的三份 JSON。任何一项不符即 rc=1。
"""
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def load(name):
    with io.open(os.path.join(ROOT, name), encoding='utf-8') as f:
        return json.load(f)


def by_key(rows):
    out = {}
    for r in rows:
        out[(r.get('page', '').split('/')[-1], r.get('viewport'))] = r
    return out


res = by_key(load('_qa_task16/measure_results.json'))
v1 = by_key(load('_qa_task16/measure_v1.json'))
nd = by_key(load('_qa_task16/measure_nodate.json'))
bad = []


def fail(msg):
    bad.append(msg)
    print('FAIL ' + msg)


print('=== A) 缺席容错（_qa_task16/nodate：三张列表页无日期节点，首页最新区剩 2 个日期）===')
for w in (375, 640, 768, 769, 1024, 1280):
    for p in ('news-message.html', 'news-feature.html', 'news-commentary.html'):
        r = nd[(p, w)]
        if not r:
            fail('nodate %s@%d 无记录' % (p, w))
            continue
        if r.get('error'):
            fail('nodate %s@%d 探针异常 %s' % (p, w, r['error']))
            continue
        if r['dates']:
            fail('nodate %s@%d 仍出现日期节点 %s' % (p, w, r['dates']))
        for l in r['links']:
            if not (l['h'] >= 44 and l['w'] >= 44):
                fail('nodate %s@%d 单元素条目里链接实测 %.1f×%.1f < 44×44（布局塌陷/空洞）' % (p, w, l['h'], l['w']))
            t = [x for x in r['titles'] if x['cls'] == 'entry-list__title']
            if t and abs(t[0]['x'] - l['x']) > 0.01:
                fail('nodate %s@%d 标题 x=%.2f 未与链接 x=%.2f 对齐（space-between 单元素下发生了居中/错位）' % (p, w, t[0]['x'], l['x']))
        it = r['shell'].get('entryItem')
        if not it or 'solid' not in (it.get('borderTop') or '') or 'solid' not in (it.get('borderBottom') or ''):
            fail('nodate %s@%d 条目上下细线不完整：%s' % (p, w, it and (it.get('borderTop'), it.get('borderBottom'))))
        if it and not (it['h'] > 60):
            fail('nodate %s@%d 条目高度 %.1f 异常（过疏/塌陷）' % (p, w, it['h']))
    r = nd[('index.html', w)]
    if len(r['dates']) != 2:
        fail('nodate index@%d 最新区日期节点数=%d（应为删 1 余 2）' % (w, len(r['dates'])))
    for l in r['links']:
        if not (l['h'] >= 44 and l['w'] >= 44):
            fail('nodate index@%d 最新区链接 %.1f×%.1f < 44×44' % (w, l['h'], l['w']))
print('A 完成：记录 %d 条，问题 %d' % (len(nd), len(bad)))

print('')
print('=== B) 不污染：v1 与 Task 16 之后的逐项相等（容差 0）===')
MAP = [
    ('news-message.html', 'article-school-course-volunteer.html'),
    ('news-feature.html', 'article-math-to-ai-learning.html'),
    ('news-commentary.html', 'article-classroom-screen-upgrade.html'),
]
DETAIL_KEYS = ['articleBody', 'articleHeader', 'articleType', 'articleByline', 'articleDate',
               'masthead', 'navLink', 'navCurrent', 'main', 'pageTitle', 'skipLink']
SHELL_KEYS = ['masthead', 'navLink', 'navCurrent', 'main', 'pageTitle', 'skipLink']


def computed(d):
    """只保留计算值（字符串），剔除位置盒——列表页与首页的"既有壳区不变"按此口径比对。"""
    return d if not isinstance(d, dict) else {k: v for k, v in d.items() if isinstance(v, str)}


for w in (375, 640, 768, 769, 1024, 1280):
    for old, new in MAP:
        a, b = v1[(old, w)], res[(new, w)]
        for k in DETAIL_KEYS:
            if a['shell'].get(k) != b['shell'].get(k):
                fail('详情页 %s(v1)↔%s(v2)@%d 的 %s 漂移：%s ≠ %s' % (old, new, w, k, a['shell'].get(k), b['shell'].get(k)))
        if len(a['shell'].get('articleParagraphs') or []) != len(b['shell'].get('articleParagraphs') or []):
            fail('详情页 %s↔%s@%d 段落数不等' % (old, new, w))
        if a['shell'].get('articleParagraphs') != b['shell'].get('articleParagraphs'):
            fail('详情页 %s↔%s@%d 段落位置盒不等' % (old, new, w))
    a, b = v1[('index.html', w)], res[('index.html', w)]
    for k in ['homeSectionTexts', 'homeSectionTitles', 'homeSections']:
        if a['shell'].get(k) != b['shell'].get(k):
            fail('首页引言区@%d 的 %s 与 v1 不等：v1=%s v2=%s' % (w, k, json.dumps(a['shell'].get(k), ensure_ascii=False)[:200], json.dumps(b['shell'].get(k), ensure_ascii=False)[:200]))
    for k in SHELL_KEYS:
        if computed(a['shell'].get(k)) != computed(b['shell'].get(k)):
            fail('首页@%d 既有壳区计算值 %s 漂移：%s ≠ %s' % (w, k, computed(a['shell'].get(k)), computed(b['shell'].get(k))))
    for p2 in ('news-message.html', 'news-feature.html', 'news-commentary.html'):
        av, bv = v1[(p2, w)], res[(p2, w)]
        for k in SHELL_KEYS:
            if computed(av['shell'].get(k)) != computed(bv['shell'].get(k)):
                fail('列表页 %s@%d 既有壳区计算值 %s 漂移：%s ≠ %s' % (p2, w, k, computed(av['shell'].get(k)), computed(bv['shell'].get(k))))
        if not bv['links'] or not all(l['display'] == 'flex' and l['h'] >= 44 and l['w'] >= 44 for l in bv['links']):
            fail('列表页 %s@%d 新规则区未生效：%s' % (p2, w, bv['links']))
print('B 完成：详情页 3×6 档全等（含段落位置盒）、首页引言区 6 档全等、列表页壳区计算值全等 + 新区生效，累计问题 %d' % len(bad))

print('')
print('=== C) 对比度（WCAG 2.1 相对亮度比）===')


def lum(rgb):
    def f(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b2 = [f(c) for c in rgb]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b2


def ratio(a, b):
    l1, l2 = sorted([lum(a), lum(b)], reverse=True)
    return round((l1 + 0.05) / (l2 + 0.05), 3)


PAPER = (0xF5, 0xEF, 0xE4)
for name, hx in [('ink #211f1c', (0x21, 0x1F, 0x1C)), ('muted #665d56', (0x66, 0x5D, 0x56)), ('accent #7a2424', (0x7A, 0x24, 0x24)), ('rule #b8aa98', (0xB8, 0xAA, 0x98))]:
    r = ratio(hx, PAPER)
    print('  %s 于纸色：%5.3f:1  普通文本 AA(≥4.5)=%s  大文本 AA(≥3.0)=%s' % (name, r, r >= 4.5, r >= 3.0))
    if name.startswith('muted') and r < 4.5:
        fail('muted 于纸色对比度 %.3f < 4.5（日期用小字号，须 ≥4.5）' % r)
    if name.startswith('ink') and r < 4.5:
        fail('ink 于纸色对比度 %.3f < 4.5' % r)
    if name.startswith('accent') and r < 3.0:
        fail('accent 于纸色对比度 %.3f < 3.0（区块标题为大字号）' % r)

print('')
print('总计问题 %d 条' % len(bad))
sys.exit(1 if bad else 0)
