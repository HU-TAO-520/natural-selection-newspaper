# -*- coding: utf-8 -*-
"""Negative control: prove verify.py actually fails on Task 2 contract violations.

Each mutant copies Results/ into _qa_task2/mutants/<name>/, applies one violation,
and re-runs verify.py against that copy. Every mutant MUST be caught.
"""
import io
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "Results")
WORK = os.path.join(ROOT, "_qa_task2", "mutants")
VERIFY = os.path.join(ROOT, "_qa_task2", "verify.py")

# name -> (file, old, new) or (file, callable)
MUTANTS = {
    "m01-去掉 no-js 类": ("index.html", 'lang="zh-CN" class="no-js"', 'lang="zh-CN"'),
    "m02-预写 js 类": ("index.html", 'class="no-js"', 'class="no-js js"'),
    "m03-出现第二个 h1": ("index.html", '<h1 class="page-title">《自然选择号》报社简介</h1>',
                          '<h1 class="page-title">《自然选择号》报社简介</h1>\n    <h1>副标题</h1>'),
    "m04-报头改用 h1": ("index.html", '<p class="site-masthead">\n        <a class="site-masthead__link" href="index.html">自然选择号</a>\n      </p>',
                        '<h1 class="site-masthead">\n        <a class="site-masthead__link" href="index.html">自然选择号</a>\n      </h1>'),
    "m05-current 放错链接": ("index.html", 'href="index.html" aria-current="page"', 'href="index.html"'),
    "m06-两个 current": ("index.html", 'href="index.html" aria-current="page">',
                         'href="index.html" aria-current="page">'),
    "m07-current 值为 true": ("index.html", 'aria-current="page"', 'aria-current="true"'),
    "m08-current 放在 li 上": ("index.html",
                               '<li class="site-navigation__item">\n            <a class="site-navigation__link" href="index.html" aria-current="page">首页</a>',
                               '<li class="site-navigation__item" aria-current="page">\n            <a class="site-navigation__link" href="index.html">首页</a>'),
    "m09-title 半角竖线": ("news-message.html", "｜", "|"),
    "m10-title 少一个字": ("news-message.html", "<title>我校启动校本课程志愿填报", "<title>我校启动校本课程志愿填"),
    "m11-h1 带站点名后缀": ("news-feature.html", "<h1 class=\"page-title\">从数学题到AI时代的学习</h1>",
                            "<h1 class=\"page-title\">从数学题到AI时代的学习｜自然选择号</h1>"),
    "m12-缺少 defer": ("index.html", '<script src="script.js" defer></script>', '<script src="script.js"></script>'),
    "m13-type=module": ("index.html", '<script src="script.js" defer></script>',
                        '<script src="script.js" type="module"></script>'),
    "m14-内联脚本": ("index.html", "</head>", "<script>document.write(1)</script>\n</head>"),
    "m15-内联事件": ("index.html", 'type="button"', 'type="button" onclick="x()"'),
    "m16-根相对路径": ("index.html", 'href="news-feature.html"', 'href="/news-feature.html"'),
    "m17-外链": ("index.html", "</head>", '<link rel="stylesheet" href="https://x/y.css">\n</head>'),
    "m18-favicon 与网络字体": ("index.html", "</head>",
                               '<link rel="icon" href="favicon.ico">\n  <link rel="preconnect" href="https://fonts.googleapis.com">\n</head>'),
    "m19-加 base": ("index.html", "</head>", '<base href=".">\n</head>'),
    "m20-nav 加 hidden": ("index.html", '<nav class="site-navigation" id="site-navigation"',
                          '<nav class="site-navigation" id="site-navigation" hidden'),
    "m21-nav 预置 is-open": ("index.html", 'class="site-navigation"', 'class="site-navigation is-open"'),
    "m22-aria-controls 不匹配": ("index.html", 'aria-controls="site-navigation"', 'aria-controls="main-navigation"'),
    "m23-aria-expanded 预写 true": ("index.html", 'aria-expanded="false"', 'aria-expanded="true"'),
    "m24-按钮缺少可见文字": ("index.html", '<span class="nav-toggle__text">菜单</span>', ""),
    "m25-图标带文本": ("index.html", '<span class="nav-toggle__icon" aria-hidden="true"></span>',
                       '<span class="nav-toggle__icon" aria-hidden="true">≡</span>'),
    "m26-按钮加 role": ("index.html", 'type="button"', 'type="button" role="menuitem"'),
    "m27-nav 使用 role=menu": ("index.html", '<nav class="site-navigation"', '<nav role="menu" class="site-navigation"'),
    "m28-缺少跳至正文": ("index.html", '  <a class="skip-link" href="#main-content">跳至正文</a>\n\n', ""),
    "m29-skip-link 目标错误": ("index.html", 'href="#main-content">跳至正文', 'href="#content">跳至正文'),
    "m30-main 缺 tabindex": ("index.html", ' tabindex="-1"', ""),
    "m31-main tabindex=0": ("index.html", 'tabindex="-1"', 'tabindex="0"'),
    "m32-main ID 改名": ("index.html", 'id="main-content"', 'id="mainContent"'),
    "m33-重复 ID": ("index.html", '<main class="main-content" id="main-content"',
                    '<div id="site-navigation"></div>\n  <main class="main-content" id="main-content"'),
    "m34-出现页脚": ("index.html", "</body>", '  <footer>版权所有 2026</footer>\n</body>'),
    "m35-main 内提前写入正文": ("news-message.html", "</h1>", '</h1>\n    <p>厨一枚 正文待补充 Lorem ipsum</p>'),
    "m36-导航顺序互换": ("index.html",
                         '<a class="site-navigation__link" href="news-message.html">新闻消息</a>',
                         '<a class="site-navigation__link" href="news-feature.html">新闻通讯</a>'),
    "m37-导航只有三项": ("index.html",
                         '          <li class="site-navigation__item">\n            <a class="site-navigation__link" href="news-commentary.html">新闻评论</a>\n          </li>\n',
                         ""),
    "m38-报头链接指向别处": ("index.html", '<a class="site-masthead__link" href="index.html">自然选择号</a>',
                             '<a class="site-masthead__link" href="news-message.html">自然选择号</a>'),
    "m39-报头文字错误": ("index.html", '>自然选择号</a>', '>自然选择号报社</a>'),
    "m40-页面专属 body class": ("index.html", "<body>", '<body class="page-home">'),
    "m41-未替换模板记号": ("index.html", "《自然选择号》报社简介</h1>", "页面登记表中的主标题</h1>"),
    "m42-开发注释与 TODO": ("index.html", "</body>", "  <!-- TODO: Task 2 -->\n</body>"),
    "m43-链接新开窗口": ("index.html", 'href="news-feature.html"', 'href="news-feature.html" target="_blank"'),
    "m44-导航容器 aria-hidden": ("index.html", '<nav class="site-navigation"', '<nav aria-hidden="true" class="site-navigation"'),
    "m45-图片与内联样式": ("index.html", "</body>", '  <img src="a.png" style="display:none">\n</body>'),
    "m46-第二个 stylesheet 引用": ("index.html", 'href="styles.css"', 'href="styles.css?v=2"'),
    "m47-标题层级用 aria-selected": ("index.html", 'aria-current="page"', 'aria-selected="true"'),
    "m48-缺少 charset": ("index.html", '  <meta charset="utf-8">\n', ""),
    "m49-viewport 错误": ("index.html", 'content="width=device-width, initial-scale=1"', 'content="width=1024"'),
    "m50-html 缺 lang": ("index.html", '<html lang="zh-CN"', "<html>"),
    "m51-多创建空 styles.css": ("__create__", "styles.css", ""),
    "m52-出现 Word 元数据作者": ("news-commentary.html", "</h1>", '</h1>\n    <p class="byline">作者：胡桃</p>'),
    "m53-新闻评价字样": ("news-commentary.html", "<title>设备升级了", "<title>新闻评价 设备升级了"),
    "m54-推断年份进入页面": ("news-commentary.html", "</h1>", '</h1>\n    <p>2026</p>'),
    "m55-导航链接文本改动": ("index.html", '>首页</a>\n          </li>', '>网站首页</a>\n          </li>'),
}

CURRENT_ONLY = {"m06-两个 current", "m36-导航顺序互换", "m37-导航只有三项"}


def build(name, spec):
    d = os.path.join(WORK, name)
    if os.path.isdir(d):
        shutil.rmtree(d)
    os.makedirs(d)
    for p in os.listdir(SRC):
        shutil.copy2(os.path.join(SRC, p), os.path.join(d, p))
    f, old, new = spec
    if f == "__create__":
        io.open(os.path.join(d, old), "w", encoding="utf-8").write("")
        return d
    path = os.path.join(d, f)
    src = io.open(path, encoding="utf-8").read()
    if name == "m06-两个 current":
        src = src.replace('<a class="site-navigation__link" href="news-commentary.html">',
                          '<a class="site-navigation__link" href="news-commentary.html" aria-current="page">')
    elif name == "m05-current 放错链接":
        src = src.replace(' href="index.html" aria-current="page"', "")
        src = src.replace('<a class="site-navigation__link" href="news-feature.html">',
                          '<a class="site-navigation__link" href="news-feature.html" aria-current="page">')
    else:
        if old not in src:
            return None
        src = src.replace(old, new, 1)
    io.open(path, "w", encoding="utf-8", newline="\n").write(src)
    return d


def run(d):
    env = dict(os.environ, QODER_RESULTS_DIR=d, QODER_REPORT=os.path.join(d, "report.md"),
               PYTHONIOENCODING="utf-8")
    r = subprocess.run([sys.executable, VERIFY], capture_output=True, text=True,
                       encoding="utf-8", env=env)
    out = (r.stdout or "") + (r.stderr or "")
    m = re.search(r"失败 (\d+) 项", out)
    fails = [l.split("FAIL:")[1].split("||")[0].strip()
             for l in out.splitlines() if l.strip().startswith("FAIL:")]
    return r.returncode, (int(m.group(1)) if m else -1), fails, out


def main():
    if os.path.isdir(WORK):
        shutil.rmtree(WORK)
    os.makedirs(WORK)
    bad_apply, undetected = [], []
    print("%-34s %-6s %s" % ("变异", "退出码", "首个命中断言"))
    print("-" * 100)
    for name, spec in sorted(MUTANTS.items()):
        d = build(name, spec)
        if d is None:
            bad_apply.append(name + "（变异未命中源文本，脚本需更新）")
            continue
        rc, n, fails, out = run(d)
        if rc == 0:
            undetected.append(name)
            print("%-34s %-6d %s" % (name, rc, "!!! 未被发现 !!!"))
        else:
            print("%-34s %-6d %s" % (name, rc, fails[0][:60] if fails else "错误: " + out.strip()[:60]))
    lines = ["", "", "## 变异测试（负面控制）", ""]
    lines.append("- 变异总数 %d ｜ 被发现 %d ｜ 漏检 %d ｜ 无法施加 %d" % (
        len(MUTANTS), len(MUTANTS) - len(undetected) - len(bad_apply), len(undetected), len(bad_apply)))
    for x in undetected:
        lines.append("- **漏检**: %s" % x)
    for x in bad_apply:
        lines.append("- **未施加**: %s" % x)
    lines.append("")
    lines.append("结论: %s" % ("PASS — 核验脚本对每类违约均能失败" if not undetected and not bad_apply
                               else "FAIL — 存在漏检或失效变异，核验脚本不可信"))
    report = io.open(os.path.join(ROOT, "_qa_task2", "report.md"), encoding="utf-8").read()
    io.open(os.path.join(ROOT, "_qa_task2", "report.md"), "w", encoding="utf-8", newline="\n").write(
        report + "\n".join(lines))
    print("\n".join(lines[2:]))
    shutil.rmtree(WORK)
    return 1 if (undetected or bad_apply) else 0


if __name__ == "__main__":
    sys.exit(main())
