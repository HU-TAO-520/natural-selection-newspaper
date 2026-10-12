#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Task 15.4 详情页保真重验（部署根侧）。

1) <main> 内部字节 == _qa_task13/main_slices/ 对应切片
2) <main> 之外字节 == 同栏目页切换前副本（差异行分类，第三类即 FAIL）
3) 段落数 4/23/29、63 项字符数、电头后 U+0020==1、安 装==0、她未改写、C29 单段、
   86英寸、Windows 10 两次、.exe 三次
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C

PAIRS = [
    ('article-school-course-volunteer.html', 'news-message.html',
     'news-message.main-interior.html', 'school-course-volunteer', 'news-message.html'),
    ('article-math-to-ai-learning.html', 'news-feature.html',
     'news-feature.main-interior.html', 'math-to-ai-learning', 'news-feature.html'),
    ('article-classroom-screen-upgrade.html', 'news-commentary.html',
     'news-commentary.main-interior.html', 'classroom-screen-upgrade', 'news-commentary.html'),
]

fails = []


def check(label, ok, detail=''):
    if not ok:
        fails.append(label)
    print('  [%s] %s%s' % ('PASS' if ok else 'FAIL', label, ('  — ' + detail) if detail else ''))


baseline = json.load(open(os.path.join(ROOT := C.ROOT, '_qa_task13', 'extracted_baseline.json'), encoding='utf-8'))
spec = json.load(open(os.path.join(C.ROOT, '_qa_task13', 'expected-spec.json'), encoding='utf-8'))
length_gate = spec['length_gate']['table']

print('=== 15.4.1 <main> 内部字节对表基线切片 ===')
import hashlib
for detail, column, slice_name, slug, base_page in PAIRS:
    path = os.path.join(C.RES, detail)
    data = C.read(path)
    html = data.decode('utf-8')
    info = spec['pages'][slug]['baseline_main_interior']
    slice_bytes = C.read(os.path.join(C.SLICES, slice_name))
    o_start, istart_tag, c_start = C.main_span(html)
    open_bytes_end = data.index(b'>', data.index(b'<main')) + 1
    close_bytes_start = data.index(b'</main>', open_bytes_end)
    interior_bytes = data[open_bytes_end:close_bytes_start]
    pos = data.find(slice_bytes)
    lead = data[open_bytes_end:pos]
    trail = data[pos + len(slice_bytes):close_bytes_start]
    print('  %s' % detail)
    print('    Task13 记录 open=%d interior_start=%d close=%d byte_length=%d sha=%s…'
          % (info['open_tag_offset'], info['interior_start_offset'], info['close_tag_offset'],
             info['byte_length'], info['sha256'][:16]))
    print('    实测 <main> 标签内 %d B（偏移 %d–%d），切片 %d B 起于 %d；切片前边界 %r，切片后边界 %r'
          % (len(interior_bytes), open_bytes_end, close_bytes_start, len(slice_bytes), pos, lead, trail))
    check('%s <main> 内部含基线切片且逐字节相等' % detail,
          pos != -1 and interior_bytes[len(lead):len(lead) + len(slice_bytes)] == slice_bytes,
          '切片 %d B 全等' % len(slice_bytes))
    check('%s 切片在详情页中唯一出现' % detail, data.count(slice_bytes) == 1, '命中 %d 次' % data.count(slice_bytes))
    check('%s 切片两侧边界仅为空白（不含任何内容字节）' % detail,
          lead.strip(b' \t\r\n') == b'' and trail.strip(b' \t\r\n') == b'',
          'lead %r trail %r' % (lead, trail))
    check('%s 切片哈希 == Task13 记录' % detail,
          hashlib.sha256(slice_bytes).hexdigest() == info['sha256'], info['sha256'][:16] + '…')
    check('%s main 之外不含切片首尾内容片段' % detail,
          data[:open_bytes_end].find(slice_bytes[:60]) == -1 and data[close_bytes_start:].find(slice_bytes[-60:]) == -1)

print('\n=== 15.4.2 <main> 之外字节对表同栏目切换前副本 ===')
ALLOWED = ('<title>', 'aria-current')
for detail, column, slice_name, slug, base_page in PAIRS:
    html = C.read_text(os.path.join(C.RES, detail))
    before = C.read_text(os.path.join(C.SNAP, column))
    prefix_a, suffix_a = C.outside_main(html)
    prefix_b, suffix_b = C.outside_main(before)
    identical_outside = (prefix_a == prefix_b and suffix_a == suffix_b)
    diffs = []
    for label, part_a, part_b in (('<main> 之前', prefix_a, prefix_b), ('<main> 之后', suffix_a, suffix_b)):
        for line_no, x, y in C.diff_lines(part_a, part_b, label, label):
            kind = '其他'
            if '<title>' in x or '<title>' in y:
                kind = '<title> 主体'
            elif 'aria-current' in x or 'aria-current' in y:
                kind = 'aria-current'
            diffs.append((label, line_no, kind, x, y))
    other = [d for d in diffs if d[2] == '其他']
    print('  %s ↔ _qa_task15/before/%s' % (detail, column))
    print('    <main> 之前 %d B / %d B，之后 %d B / %d B'
          % (len(prefix_a.encode()), len(prefix_b.encode()), len(suffix_a.encode()), len(suffix_b.encode())))
    if diffs:
        for part, line_no, kind, x, y in diffs:
            print('    差异 %s 第 %d 行 [%s]' % (part, line_no, kind))
            print('      现值: %r' % x)
            print('      副本: %r' % y)
    else:
        print('    差异行数 0（<title> 与 aria-current 两处允许差异亦未出现：详情页与切换前栏目页 <main> 之外逐字节相同）')
    check('%s <main> 之外无第三类差异' % detail, len(other) == 0,
          '允许两类，实测 %d 处差异（<title> %d、aria-current %d、其他 %d）'
          % (len(diffs), sum(1 for d in diffs if d[2] == '<title> 主体'),
             sum(1 for d in diffs if d[2] == 'aria-current'), len(other)))
    check('%s <main> 之外差异类别不超过合同允许的两类' % detail, len(diffs) <= 2,
          '总差异 %d 行' % len(diffs))

print('\n=== 15.4.3 段落数 / 63 项字符数 / 高风险字符 ===')
for detail, column, slice_name, slug, base_page in PAIRS:
    root = C.parse_file(os.path.join(C.RES, detail))
    main = C.body_main(root)
    page = baseline['pages'][base_page]
    body = main.first('div', 'article__body')
    p_nodes = list(body.find('p'))
    paragraphs = [p.text() for p in p_nodes]
    h1 = main.first('h1', 'page-title')
    byline = main.first('p', 'article__byline')
    atype = main.first('p', 'article__type')
    adate = main.first('p', 'article__date')
    dateline = body.find('strong', 'dateline')
    dl_list = list(dateline)

    print('  %s（%s）' % (detail, slug))
    check('%s 段落数 == Task13 记录' % slug, len(paragraphs) == page['paragraph_count'],
          '%d（期望 %d）' % (len(paragraphs), page['paragraph_count']))
    check('%s 段落 textContent 数组 == Task13 基线（逐段严格相等，无归一化）' % slug,
          paragraphs == [p['text'] for p in page['paragraphs']],
          '共 %d 段，%d 字符' % (len(paragraphs), sum(len(t) for t in paragraphs)))
    check('%s h1 == 基线 title_subject' % slug, h1.text() == page['title_subject'], h1.text())
    check('%s byline == 蓝色空间' % slug, byline.text() == '蓝色空间', byline.text())
    check('%s article__type == 栏目名' % slug, atype.text() == page['article_type'], atype.text())

    # 63 项字符数（Task1 逐段合同）
    rows = length_gate[slug]
    bad = []
    for label, want_len in rows:
        if label == 'title':
            actual = len(h1.text())
        elif label == 'byline':
            actual = len(byline.text())
        elif label == 'closing_date':
            actual = len(adate.text()) if adate is not None else 0
        else:
            index = int(label[1:]) - 1
            actual = len(paragraphs[index]) if index < len(paragraphs) else -1
        if actual != want_len:
            bad.append('%s 期望 %d 实测 %d' % (label, want_len, actual))
    check('%s 长度闸门 %d 项全中' % (slug, len(rows)), not bad,
          ('不中: ' + '; '.join(bad)) if bad else 'title/byline/%d 段/closing_date 全等' % (len(rows) - 2 - (1 if any(r[0] == 'closing_date' for r in rows) else 0)))

    # 电头
    if page['dateline'] and page['dateline'].get('text'):
        dl = dl_list[0]
        text = dl.text()
        first = paragraphs[0]
        one_space = len(first) > len(text) + 1 and first[len(text)] == ' ' and first[len(text) + 1] != ' '
        check('%s 首段含 strong.dateline 且其后恰一个 U+0020' % slug,
              len(dl_list) == 1 and text == page['dateline']['text']
              and dl.parent is p_nodes[0]
              and first.startswith(text) and one_space
              and first.count(' ') == page['dateline']['paragraph_u0020_count'],
              '电头 %r，其后字符 %r（U+0020 计数 %d，基线 %d）'
              % (text, first[len(text):len(text) + 2], first.count(' '), page['dateline']['paragraph_u0020_count']))
    else:
        check('%s 无电头（评论页）' % slug, len(dl_list) == 0, 'strong.dateline 命中 %d' % len(dl_list))

    joined = ''.join(paragraphs)
    if base_page == 'news-commentary.html':
        check('评论页 `安 装` 命中 0', '安 装' not in joined, '命中 %d，`安装` 命中 %d' % (joined.count('安 装'), joined.count('安装')))
        check('评论页 `86英寸` 无空格', '86英寸' in joined and '86 英寸' not in joined, '命中 %d' % joined.count('86英寸'))
        check('评论页 `Windows 10` 共 2 次（含 1 个半角空格）', joined.count('Windows 10') == 2 and 'Windows10' not in joined,
              '命中 %d' % joined.count('Windows 10'))
        check('评论页 `.exe` 共 3 次（含前导句点）', joined.count('.exe') == 3, '命中 %d' % joined.count('.exe'))
        check('评论页 C29 为单段（末段即 C29，未被拆分）', len(paragraphs) == 29 and paragraphs[-1] == page['paragraphs'][-1]['text'],
              '末段 %d 字符' % len(paragraphs[-1]))
        check('评论页结尾行 p.article__date == （自然选择号9月18日）',
              adate is not None and adate.text() == '（自然选择号9月18日）',
              '实测 %r' % (adate.text() if adate is not None else None))
        check('评论页结尾行位于 .article__body 之后、</article> 之内',
              adate is not None and adate.parent is not body and adate.parent.classes and 'article' in adate.parent.classes,
              '父节点 %s' % adate.parent.describe() if adate is not None else '')
    if base_page == 'news-feature.html':
        check('通讯页 F05 `在她看来` 未被改写为 `他`', '在她看来' in paragraphs[4], 'F05 前 6 字 %r' % paragraphs[4][:6])
        check('通讯页 `她`/`他` 不一致状态原样保留',
              joined.count('她') == ''.join(p['text'] for p in page['paragraphs']).count('她')
              and joined.count('他') == ''.join(p['text'] for p in page['paragraphs']).count('他'),
              '她 %d 次、他 %d 次' % (joined.count('她'), joined.count('他')))
        check('通讯页无 p.article__date', adate is None, '命中 %d' % (0 if adate is None else 1))
    if base_page == 'news-message.html':
        check('消息页无 p.article__date', adate is None, '命中 %d' % (0 if adate is None else 1))
        check('消息页 `86英寸` 等高风险串不涉及', True, '（仅通讯/评论页断言）')

print('\n=== <title> 与 aria-current 实测（供 15.5 复用）===')
for detail, column, slice_name, slug, base_page in PAIRS:
    html = C.read_text(os.path.join(C.RES, detail))
    title_line = [ln for ln in html.split('\n') if '<title>' in ln][0]
    print('  %s' % detail)
    print('    <title> %s' % title_line.strip())
    print('    期望主体 %r（== Task1 title）' % spec['pages'][slug]['title'])

print('\n15.4 ' + ('PASS' if not fails else 'FAIL'))
for f in fails:
    print('  FAIL: ' + f)
sys.exit(1 if fails else 0)
