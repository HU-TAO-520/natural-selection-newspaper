#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Task 15.5 列表页与首页结构核验（R3/R4/R2② + 装配合同）。"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C

fails = []


def check(label, ok, detail=''):
    if not ok:
        fails.append(label)
    print('  [%s] %s%s' % ('PASS' if ok else 'FAIL', label, ('  — ' + detail) if detail else ''))


PAGES = ['index.html', 'news-message.html', 'news-feature.html', 'news-commentary.html',
         'article-school-course-volunteer.html', 'article-math-to-ai-learning.html',
         'article-classroom-screen-upgrade.html']
LIST_PAGES = {'news-message.html': '新闻消息', 'news-feature.html': '新闻通讯', 'news-commentary.html': '新闻评论'}
DETAIL_OF = {'新闻消息': 'article-school-course-volunteer.html',
             '新闻通讯': 'article-math-to-ai-learning.html',
             '新闻评论': 'article-classroom-screen-upgrade.html'}
R4_TALLY = {'main': 1, 'h1': 1, 'div': 2, 'section': 3, 'h2': 4, 'p': 3, 'ul': 1, 'li': 3, 'a': 3, 'span': 6}
WHITELIST14 = ['《自然选择号》报社简介', '名称由来', '我们的名字来自《三体》里的一支舰队。',
               '主要工作与报道方向', '我们主要记录一些自己觉得有价值的东西。',
               '成立时间', '报社成立于“鸽子衔枝之年”。',
               '最新报道', '我校启动校本课程志愿填报', '9月18日',
               '从数学题到AI时代的学习', '9月17日',
               '设备升级了，使用门槛也该降下来', '9月18日']
ARIA_MATRIX = {
    'index.html': 'index.html',
    'news-message.html': 'news-message.html',
    'news-feature.html': 'news-feature.html',
    'news-commentary.html': 'news-commentary.html',
    'article-school-course-volunteer.html': 'news-message.html',
    'article-math-to-ai-learning.html': 'news-feature.html',
    'article-classroom-screen-upgrade.html': 'news-commentary.html',
}

missing_pages = [pg for pg in PAGES if not os.path.exists(os.path.join(C.RES, pg))]
if missing_pages:
    fails.append('期望页面缺失: %s' % missing_pages)
PAGES_PRESENT = [pg for pg in PAGES if os.path.exists(os.path.join(C.RES, pg))]


print('=== 15.5.1 三张栏目列表页 ===')
for page, column in LIST_PAGES.items():
    root = C.parse_file(os.path.join(C.RES, page))
    main = C.body_main(root)
    kids = [c for c in main.children if not (isinstance(c, str) and c.strip() == '')]
    direct = [(k.tag if not isinstance(k, str) else '#text', k.classes if not isinstance(k, str) else []) for k in kids]
    print('  %s（%s）' % (page, column))
    check('%s <main> 直接元素子节点恰 2' % page, len(kids) == 2 and all(not isinstance(k, str) for k in kids),
          str(direct))
    check('%s 顺序 h1.page-title → ul.entry-list' % page,
          kids[0].tag == 'h1' and 'page-title' in kids[0].classes
          and kids[1].tag == 'ul' and 'entry-list' in kids[1].classes,
          '%s , %s' % (kids[0].describe(), kids[1].describe()))
    check('%s <h1> 逐字 == 栏目名' % page, kids[0].text() == column, repr(kids[0].text()))
    items = kids[1].find('li')
    items = list(items)
    check('%s 条目数 == 1（当前该栏目唯一一篇）' % page, len(items) == 1, '命中 %d' % len(items))
    for li in items:
        links = list(li.find('a'))
        check('%s li.entry-list__item 内恰一个 a.entry-list__link' % page,
              'entry-list__item' in li.classes and len(links) == 1 and 'entry-list__link' in links[0].classes)
        spans = links[0].elems() if links else []
        check('%s 行内为 entry-list__title + entry-list__date（各一，顺序固定）' % page,
              len(spans) == 2 and spans[0].classes == ['entry-list__title'] and spans[1].classes == ['entry-list__date'],
              ' / '.join(s.text() for s in spans) if spans else '')
        if spans:
            check('%s 标题与日期等于该篇 Task1 title / 用户声明 display_date' % page,
                  spans[0].text() == {'新闻消息': '我校启动校本课程志愿填报',
                                      '新闻通讯': '从数学题到AI时代的学习',
                                      '新闻评论': '设备升级了，使用门槛也该降下来'}[column]
                  and spans[1].text() == {'新闻消息': '9月18日', '新闻通讯': '9月17日', '新闻评论': '9月18日'}[column],
                  '%r / %r' % (spans[0].text(), spans[1].text()))
            check('%s 链接目标为对应详情页' % page,
                  links[0].get('href') == DETAIL_OF[column], links[0].get('href') or '')
    tags = {}
    for node in main.walk():
        tags[node.tag] = tags.get(node.tag, 0) + 1
    check('%s 列表页无正文结构标签（article/h2/p/body 段）' % page,
          all(tags.get(t, 0) == 0 for t in ('article', 'h2', 'p', 'header', 'strong')),
          '标签计数 ' + str(tags))
    text_all = main.text()
    check('%s 无空态/占位文案' % page,
          not any(w in text_all for w in ('暂无文章', '暂无', '日期未知', '未知', '更多', '阅读全文')),
          '文本 %r' % text_all.strip()[:60])

print('\n=== 15.5.2 首页（R4）===')
root = C.parse_file(os.path.join(C.RES, 'index.html'))
main = C.body_main(root)
kids = [c for c in main.children if not (isinstance(c, str) and c.strip() == '')]
check('首页 #main-content 直接元素子元素恰 3', len(kids) == 3 and all(not isinstance(k, str) for k in kids),
      str([(k.tag, k.classes) for k in kids]))
check('首页顺序 h1.page-title → div.home-sections → div.home-latest',
      kids[0].tag == 'h1' and kids[0].classes == ['page-title']
      and kids[1].tag == 'div' and kids[1].classes == ['home-sections']
      and kids[2].tag == 'div' and kids[2].classes == ['home-latest'],
      ' / '.join(k.describe() for k in kids))
tally = {'main': 1}
for node in main.walk():
    tally[node.tag] = tally.get(node.tag, 0) + 1
check('首页 <main> 内标签集合 == R4 无条件值', tally == R4_TALLY, '实测 %s' % tally)
check('首页 h3/h4/img/article/nav/time 计数为 0',
      all(tally.get(t, 0) == 0 for t in ('h3', 'h4', 'img', 'article', 'nav', 'time', 'script')),
      str({t: tally.get(t, 0) for t in ('h3', 'h4', 'img', 'article', 'nav', 'time')}))
check('首页 h2 计数 4、标题总数 5、无 h3 跳级', tally.get('h2') == 4 and tally.get('h1') == 1 and tally.get('h3', 0) == 0)
visible = []
for node in main.walk():
    if node.tag in ('h1', 'h2', 'p', 'span'):
        visible.append(node.text())
check('首页可见内容白名单按序 14 项', visible == WHITELIST14,
      '实测 %d 项' % len(visible) + ('' if visible == WHITELIST14 else '：' + repr(visible)))
latest = kids[2]
check('div.home-latest 为 role="region" + aria-labelledby="latest-title"',
      latest.get('role') == 'region' and latest.get('aria-labelledby') == 'latest-title',
      latest.describe())
check('div.home-latest 不是 <nav>、也不是 <section>', latest.tag == 'div' and latest.tag != 'section')
check('最新区 h2.home-latest__title#latest-title == 最新报道',
      latest.first('h2').classes == ['home-latest__title'] and latest.first('h2').get('id') == 'latest-title'
      and latest.first('h2').text() == '最新报道')
ids = [n.get('id') for n in root.walk() if n.get('id')]
check('首页 latest-title 唯一', ids.count('latest-title') == 1, str(ids))
dup = []
for page in PAGES_PRESENT:
    r = C.parse_file(os.path.join(C.RES, page))
    got = [n.get('id') for n in r.walk() if n.get('id')]
    if len(got) != len(set(got)):
        dup.append(page)
    if page == 'index.html':
        for lab in ('origin-title', 'work-title', 'founded-title'):
            if lab not in got:
                dup.append('index 缺 ' + lab)
check('各页 ID 唯一且 origin/work/founded-title 并存', not dup, str(dup))
ul = latest.first('ul', 'home-latest__list')
lis = list(ul.find('li'))
check('首页最新区 ul.home-latest__list 三行', len(lis) == 3, '命中 %d' % len(lis))
order = [list(li.find('a'))[0].get('href') for li in lis]
check('最新区次序 消息 → 通讯 → 评论（R11 全局前 3 条）',
      order == ['article-school-course-volunteer.html', 'article-math-to-ai-learning.html', 'article-classroom-screen-upgrade.html'],
      str(order))
for li in lis:
    a = list(li.find('a'))[0]
    check('条目 %s：li/span 类名与数量合规' % a.get('href'),
          li.classes == ['home-latest__item'] and a.classes == ['home-latest__link']
          and [s.classes[0] for s in a.elems()] == ['home-latest__entry', 'home-latest__date'],
          a.describe())
check('首页 .home-section 计数恰 3（E3 不动）', len(list(root.find(cls='home-section'))) == 3,
      '命中 %d' % len(list(root.find(cls='home-section'))))
in_latest_cls = [n.describe() for n in latest.walk() if 'home-section' in n.classes]
in_latest_section = list(latest.find('section'))
in_latest_nav = list(latest.find('nav'))
check('div.home-latest 区段内无 .home-section 类', not in_latest_cls, str(in_latest_cls))
check('div.home-latest 区段内无 <section>', not in_latest_section, '命中 %d' % len(in_latest_section))
check('div.home-latest 区段内无第二个 <nav>', not in_latest_nav, '命中 %d' % len(in_latest_nav))
partial = C.read(os.path.join(C.ROOT, 'build', 'partials', 'home-intro.html'))
idx = C.read(os.path.join(C.RES, 'index.html'))
check('div.home-sections 区块与 build/partials/home-intro.html 逐字节相等',
      idx.count(partial) == 1 and C.read_text(os.path.join(C.RES, 'index.html')).find('home-sections') != -1,
      'partial %d B，在 index.html 中出现 %d 次' % (len(partial), idx.count(partial)))
sect_region = idx[idx.index(partial):idx.index(partial) + len(partial)]
check('该区块即 div.home-sections 元素本体',
      partial.startswith(b'      <div class="home-sections"') or partial.lstrip().startswith(b'<div class="home-sections"'),
      'partial 首行 %r' % partial.split(b'\n')[0][:60])

print('\n=== 15.5.3 全站 <nav> 与 aria-current ===')
for page in PAGES_PRESENT:
    r = C.parse_file(os.path.join(C.RES, page))
    navs = list(r.find('nav'))
    currents = [n for n in r.walk() if n.get('aria-current') == 'page']
    want = ARIA_MATRIX[page]
    ok_target = len(currents) == 1 and currents[0].get('href') == want
    on_nav_li = len(currents) == 1 and currents[0].tag in ('nav', 'li')
    check('%s <nav> 数 == 1' % page, len(navs) == 1, '命中 %d' % len(navs))
    check('%s aria-current 恰一个且落在 %s' % (page, want), ok_target and not on_nav_li,
          '实测 %d 个，目标 %r，标签 %r' % (len(currents), currents[0].get('href') if currents else None,
                                        currents[0].tag if currents else None))
    if currents:
        nav = navs[0]
        check('%s 当前项位于 .site-navigation__list 内（非报头）' % page,
              any(current is n or current in list(n.walk()) for n in nav.find('ul') for current in currents)
              and currents[0].get('class') is not None and 'site-navigation__link' in currents[0].classes,
              currents[0].classes and ' '.join(currents[0].classes))
hdr = C.parse_file(os.path.join(C.RES, 'index.html'))
logo_links = [n for n in hdr.walk() if n.tag == 'a' and n.get('href') == 'index.html']
check('index.html 的 href="index.html" 在壳内出现两处，当前项只在导航那一处',
      len(logo_links) == 2 and sum(1 for l in logo_links if l.get('aria-current') == 'page') == 1,
      '命中 %d 处，其中 aria-current %d 处' % (len(logo_links), sum(1 for l in logo_links if l.get('aria-current') == 'page')))

print('\n=== 15.5.4 详情页命名正则（R2②）===')
RX = re.compile(r'^article-[a-z0-9][a-z0-9-]{2,40}\.html$')
matched = sorted(n for n in os.listdir(C.RES) if RX.match(n))
check('三个新建详情页名逐个匹配 R2②', all(RX.match(p) for p in
      ['article-school-course-volunteer.html', 'article-math-to-ai-learning.html', 'article-classroom-screen-upgrade.html']))
check('Results/ 内命中该正则的文件恰为这三个（双向相等）',
      matched == sorted(['article-school-course-volunteer.html', 'article-math-to-ai-learning.html', 'article-classroom-screen-upgrade.html']),
      str(matched))
check('大小写逐字符一致（不存在 Article-*.HTML 一类）',
      not [n for n in os.listdir(C.RES) if n.lower().endswith('.html') and n not in PAGES], '目录清单 %s' % sorted(os.listdir(C.RES)))
for page in ['article-school-course-volunteer.html', 'article-math-to-ai-learning.html', 'article-classroom-screen-upgrade.html']:
    slug = page[len('article') + 1:-len('.html')]
    md = C.read_text(os.path.join(C.ROOT, 'content', 'articles', slug + '.md'))
    m = re.search(r'^slug:\s*(\S+)\s*$', md, re.M)
    check('%s 主干 == content/articles/%s.md 的 slug 字段' % (page, slug), m is not None and m.group(1) == slug,
          'slug: %r' % (m.group(1) if m else None))

print('\n15.5 ' + ('PASS' if not fails else 'FAIL'))
for f in fails:
    print('  FAIL: ' + f)
sys.exit(1 if fails else 0)
