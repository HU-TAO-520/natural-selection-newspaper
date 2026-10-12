#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Task 4 变异测试：对 Results/index.html 注入违约，验证 verify_home.py 能否捕获。

每个变异体必须至少触发一项 FAIL；对照组（真实交付）必须 0 FAIL。
"""
from __future__ import annotations

import io
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "Results", "index.html")
OUT = os.path.join(HERE, "mutants")
VERIFIER = os.path.join(HERE, "verify_home.py")
P_ORIGIN = "我们的名字来自《三体》里的一支舰队。"
P_WORK = "我们主要记录一些自己觉得有价值的东西。"
P_FOUNDED = "报社成立于2024年。"
SEC_TEMPLATE = '''      <section class="home-section" aria-labelledby="{tid}">
        <h2 class="home-section__title" id="{tid}">{h2}</h2>
        <p class="home-section__text">{p}</p>
      </section>
'''


def sub(src, old, new, count=1):
    assert old in src, f"变异锚点缺失: {old[:40]}"
    return src.replace(old, new, count)


# (名称, 变换函数)
MUTATIONS = [
    ("文本-删除末尾句号", lambda s: sub(s, P_ORIGIN, P_ORIGIN[:-1])),
    ("文本-追加第二个句号", lambda s: sub(s, P_FOUNDED, P_FOUNDED + "。")),
    ("文本-改字（舰队→船队）", lambda s: sub(s, "一支舰队", "一支船队")),
    ("文本-润色扩写", lambda s: sub(s, P_WORK, "我们主要记录一些自己觉得有价值的东西，涵盖校园资讯与深度报道。")),
    ("文本-添加字段前缀", lambda s: sub(s, P_ORIGIN, "名称由来：" + P_ORIGIN)),
    ("文本-插入半角空格", lambda s: sub(s, "报社成立于2024年。", "报社成立于 2024年。")),
    ("文本-年份与年之间加空格", lambda s: sub(s, "2024年", "2024 年")),
    ("文本-改为 2026", lambda s: sub(s, "2024年", "2026年")),
    ("文本-补月日", lambda s: sub(s, P_FOUNDED, "报社成立于2024年9月18日。")),
    ("文本-加引号包围", lambda s: sub(s, P_ORIGIN, "“" + P_ORIGIN + "”")),
    ("文本-书名号被删", lambda s: sub(s, "《三体》", "三体")),
    ("文本-全角改半角标点", lambda s: sub(s, P_FOUNDED, "报社成立于2024年.")),
    ("文本-拆成两个段落", lambda s: sub(s, f'<p class="home-section__text">{P_WORK}</p>',
                                       f'<p class="home-section__text">我们主要记录一些</p>\n'
                                       f'      <p class="home-section__text">自己觉得有价值的东西。</p>')),
    ("文本-段落内加 <br>", lambda s: sub(s, "报社成立于2024年。", "报社成立于<br>2024年。")),
    ("文本-段落内加强调标签", lambda s: sub(s, P_ORIGIN, f"<strong>{P_ORIGIN}</strong>")),
    ("文本-放入 &nbsp; 调版", lambda s: sub(s, P_FOUNDED, "&nbsp;" + P_FOUNDED)),
    ("文本-HTML 实体未转义直改文本", lambda s: sub(s, P_ORIGIN, "我们的名字来自《三体》里的一支舰队")),
    ("槽位名-泄露 P_ORIGIN", lambda s: sub(s, P_ORIGIN, "P_ORIGIN")),
    ("槽位名-泄露注释", lambda s: sub(s, "  <main", "<!-- P_WORK -->\n  <main")),
    ("槽位名-方括号计划说明", lambda s: sub(s, P_FOUNDED, "[经确认的成立时间]")),
    ("顺序-交换区块2与3", lambda s: swap_work_founded(s)),
    ("顺序-h1 移到 div 之后", lambda s: reorder_h1_last(s)),
    ("区块-只写两个", lambda s: sub(s, SEC_TEMPLATE.format(tid="founded-title", h2="成立时间", p=P_FOUNDED), "")),
    ("区块-新增第四个区块", lambda s: sub(s, "    </div>\n  </main>",
                                    SEC_TEMPLATE.format(tid="extra-title", h2="办报宗旨", p="暂无资料") + "    </div>\n  </main>")),
    ("区块-主要工作与报道方向拆成两个", lambda s: sub(s, "    </div>\n  </main>",
                                    SEC_TEMPLATE.format(tid="report-title", h2="报道方向", p=P_WORK) + "    </div>\n  </main>")),
    ("结构-改用 div 而非 section", lambda s: sub(s, '<section class="home-section" aria-labelledby="origin-title">',
                                             '<div class="home-section">').replace(
                                             '</section>', '</div>', 1)),
    ("结构-去掉 .home-sections 外层", lambda s: remove_wrapper(s)),
    ("结构-两个 .home-sections", lambda s: s.replace('    </div>\n  </main>',
                                                  '    </div>\n    <div class="home-sections"></div>\n  </main>')),
    ("结构-h2 降级为 h3", lambda s: sub(s, '<h2 class="home-section__title" id="work-title">主要工作与报道方向</h2>',
                                     '<h3 class="home-section__title" id="work-title">主要工作与报道方向</h3>')),
    ("结构-标题改用加粗段落", lambda s: sub(s, '<h2 class="home-section__title" id="origin-title">名称由来</h2>',
                                       '<p class="home-section__title"><strong>名称由来</strong></p>')),
    ("结构-文本改放 div", lambda s: sub(s, f'<p class="home-section__text">{P_FOUNDED}</p>',
                                    f'<div class="home-section__text">{P_FOUNDED}</div>')),
    ("结构-section 内多加空节点", lambda s: sub(s, f'<p class="home-section__text">{P_WORK}</p>',
                                          f'<p class="home-section__text">{P_WORK}</p>\n'
                                          f'      <span class="home-section__rule"></span>')),
    ("结构-h1 后加第二个 h1", lambda s: sub(s, "  </main>", '    <h1 class="page-title">自然选择号</h1>\n  </main>')),
    ("结构-区块内元素顺序颠倒", lambda s: reverse_inside_origin(s)),
    ("ID-缺失 aria-labelledby", lambda s: sub(s, '<section class="home-section" aria-labelledby="work-title">',
                                          '<section class="home-section">')),
    ("ID-aria-labelledby 指向他区块", lambda s: sub(s, '<section class="home-section" aria-labelledby="founded-title">',
                                             '<section class="home-section" aria-labelledby="work-title">')),
    ("ID-标题 ID 改名", lambda s: sub(s, 'id="origin-title"', 'id="title-1"')),
    ("ID-重复 ID", lambda s: sub(s, "  </main>", '    <p id="origin-title">x</p>\n  </main>')),
    ("ID-标题文字与 ID 错位", lambda s: sub(s, '<h2 class="home-section__title" id="origin-title">名称由来</h2>',
                                       '<h2 class="home-section__title" id="work-title">名称由来</h2>')),
    ("映射-文本与区块错位", lambda s: sub(s, f'<p class="home-section__text">{P_ORIGIN}</p>',
                                     f'<p class="home-section__text">{P_WORK}</p>')),
    ("无障碍-添加冗余 aria-label", lambda s: sub(s, '<h2 class="home-section__title" id="origin-title">',
                                           '<h2 class="home-section__title" aria-label="简介" id="origin-title">')),
    ("无障碍-文本放 data-* 且段落清空", lambda s: sub(s, f'<p class="home-section__text">{P_ORIGIN}</p>',
                                          f'<p class="home-section__text" data-text="{P_ORIGIN}"></p>')),
    ("无障碍-隐藏节点承载文本", lambda s: sub(s, f'<p class="home-section__text">{P_ORIGIN}</p>',
                                         f'<p class="home-section__text"><span class="sr-only">{P_ORIGIN}</span></p>')),
    ("无障碍-section 使用 widget role", lambda s: sub(s, '<section class="home-section" aria-labelledby="origin-title">',
                                             '<section role="tab" class="home-section" aria-labelledby="origin-title">')),
    ("范围-新增文章卡片", lambda s: s.replace("    </div>\n  </main>",
        '    <article class="post"><h2>校园新闻</h2><a href="news-message.html">了解更多</a></article>\n  </main>')),
    ("范围-新增按钮表单", lambda s: s.replace("    </div>\n  </main>",
        '    <form><input placeholder="搜索"><button type="submit">订阅</button></form>\n  </main>')),
    ("范围-新增图片", lambda s: s.replace("    </div>\n  </main>",
        '    <img src="logo.png" alt="报头">\n  </main>')),
    ("范围-新增页脚版权", lambda s: s.replace("</body>", '<footer>© 2026 自然选择号</footer>\n</body>')),
    ("范围-新增宣传语段落", lambda s: s.replace("    </div>\n  </main>",
        f'    </div>\n    <p class="slogan">记录有价值的事</p>\n  </main>')),
    ("范围-新增外部字体链接", lambda s: s.replace('<link rel="stylesheet" href="styles.css">',
        '<link rel="stylesheet" href="https://fonts.example.com/css?family=Noto+Sans"><link rel="stylesheet" href="styles.css">')),
    ("范围-内联 style", lambda s: sub(s, '<div class="home-sections">', '<div class="home-sections" style="margin:0">')),
    ("范围-页面专属 <style>", lambda s: s.replace("</head>", "<style>.home-section{color:red}</style>\n</head>")),
    ("范围-内联脚本注入内容", lambda s: s.replace("  </main>", '    <script>document.write("补充")</script>\n  </main>')),
    ("范围-内联事件", lambda s: sub(s, '<div class="home-sections">', '<div class="home-sections" onclick="x()">')),
    ("范围-新增 <time> 元素", lambda s: s.replace("    </div>\n  </main>",
        f'    </div>\n    <p><time datetime="2024-01-01">2024</time></p>\n  </main>')),
    ("范围-作者名泄露", lambda s: s.replace("  </main>", '    <p>厨一枚</p>\n  </main>')),
    ("范围-body 页面专属 class", lambda s: sub(s, "<body>", '<body class="page-home">')),
    ("样式接口-改名破坏钩子", lambda s: s.replace("home-section__title", "home-title")),
    ("样式接口-丢失 class", lambda s: sub(s, '<div class="home-sections">', "<div>")),
    ("样式接口-新增区块专属颜色 class", lambda s: sub(s, '<section class="home-section" aria-labelledby="origin-title">',
                                             '<section class="home-section home-section--accent" aria-labelledby="origin-title">')),
    ("公共壳-标题被追加站点名", lambda s: sub(s, "<h1 class=\"page-title\">《自然选择号》报社简介</h1>",
                                       "<h1 class=\"page-title\">《自然选择号》报社简介｜自然选择号</h1>")),
    ("公共壳-h1 class 改动", lambda s: sub(s, '<h1 class="page-title">', '<h1 class="title">')),
    ("公共壳-当前页标记转移", lambda s: sub(s, '<a class="site-navigation__link" href="index.html" aria-current="page">首页</a>',
                                       '<a class="site-navigation__link" href="index.html">首页</a>').replace(
                                       'href="news-message.html"', 'href="news-message.html" aria-current="page"')),
    ("公共壳-title 文本改动", lambda s: sub(s, "<title>《自然选择号》报社简介｜自然选择号</title>",
                                       "<title>自然选择号</title>")),
    ("公共壳-移除 no-js", lambda s: sub(s, '<html lang="zh-CN" class="no-js">', '<html lang="zh-CN">')),
    ("公共壳-资源改为绝对路径", lambda s: sub(s, 'href="styles.css"', 'href="/Results/styles.css"')),
    ("公共壳-移除 viewport", lambda s: sub(s, '<meta name="viewport" content="width=device-width, initial-scale=1">\n', "")),
    ("公共壳-菜单按钮 aria-expanded 改动", lambda s: sub(s, 'aria-expanded="false"', 'aria-expanded="true"')),
    ("公共壳-导航项顺序调换", lambda s: swap_nav(s)),
    ("交付范围-其他页面被同步修改", lambda s: s.replace("  </main>", '    <p>见 news-feature.html 的 47个社团 报道</p>\n  </main>')),
]


def swap_work_founded(s):
    a = SEC_TEMPLATE.format(tid="work-title", h2="主要工作与报道方向", p=P_WORK)
    b = SEC_TEMPLATE.format(tid="founded-title", h2="成立时间", p=P_FOUNDED)
    assert a + "\n" + b in s
    return s.replace(a + "\n" + b, b + "\n" + a)


def reorder_h1_last(s):
    h1 = '    <h1 class="page-title">《自然选择号》报社简介</h1>\n\n'
    assert h1 in s
    return s.replace(h1, "").replace("  </main>", h1 + "  </main>")


def remove_wrapper(s):
    return s.replace('    <div class="home-sections">\n', "").replace("    </div>\n  </main>", "  </main>")


def reverse_inside_origin(s):
    old = ('        <h2 class="home-section__title" id="origin-title">名称由来</h2>\n'
           f'        <p class="home-section__text">{P_ORIGIN}</p>')
    new = (f'        <p class="home-section__text">{P_ORIGIN}</p>\n'
           '        <h2 class="home-section__title" id="origin-title">名称由来</h2>')
    return sub(s, old, new)


def swap_nav(s):
    a = '<a class="site-navigation__link" href="news-message.html">新闻消息</a>'
    b = '<a class="site-navigation__link" href="news-feature.html">新闻通讯</a>'
    return s.replace(a, "@@").replace(b, a).replace("@@", b)


def run(path):
    env = dict(os.environ, PYTHONIOENCODING="utf-8")
    p = subprocess.run([sys.executable, VERIFIER, path], capture_output=True,
                       text=True, encoding="utf-8", env=env)
    out = (p.stdout or "") + (p.stderr or "")
    m = re.search(r"共 (\d+) 项，通过 (\d+)，失败 (\d+)", out)
    fails = int(m.group(3)) if m else -1
    labels = re.findall(r"\[FAIL\] ([^\n]+)", out)
    return fails, labels, out


def main():
    os.makedirs(OUT, exist_ok=True)
    base = io.open(SRC, encoding="utf-8").read()

    ctrl_path = os.path.join(OUT, "control.html")
    io.open(ctrl_path, "w", encoding="utf-8", newline="\n").write(base)
    fails, _, _ = run(ctrl_path)
    print(f"对照组（真实交付）：失败 {fails} 项  {'OK' if fails == 0 else '<<< 意外失败'}")
    results = [("control", fails == 0, "")]

    escaped = 0
    for name, fn in MUTATIONS:
        try:
            mutated = fn(base)
        except AssertionError as e:
            print(f"  !! {name} 锚点失效：{e}")
            results.append((name, False, "锚点失效"))
            continue
        if mutated == base:
            print(f"  !! {name} 未产生改动")
            results.append((name, False, "无改动"))
            continue
        path = os.path.join(OUT, f"m{len(results):02d}.html")
        io.open(path, "w", encoding="utf-8", newline="\n").write(mutated)
        f, labels, _ = run(path)
        caught = f > 0
        if not caught:
            escaped += 1
        results.append((name, caught, labels[0] if labels else ""))

    print("\n变异体明细：")
    for name, caught, why in results:
        print(f"  {'捕获' if caught else '未达预期'} | {name}" + (f" → {why[:78]}" if why else ""))
    total = len(MUTATIONS)
    print(f"\n变异 {total} 个 + 对照组 1 个；未达预期 {escaped + sum(1 for n, c, w in results[1:] if w in ('锚点失效', '无改动'))} 个")
    return 0 if escaped == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
