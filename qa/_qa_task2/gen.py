# -*- coding: utf-8 -*-
"""Task 2 shell generator: one authoritative template -> four pages.

The page registry (file / <title> / <h1> / current nav item) is parsed from
plan/Task2-建立共享HTML壳与导航.md so no title text is hand-typed here.
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAN = os.path.join(ROOT, "plan", "Task2-建立共享HTML壳与导航.md")
RESULTS = os.path.join(ROOT, "Results")

NAV = [
    ("首页", "index.html"),
    ("新闻消息", "news-message.html"),
    ("新闻通讯", "news-feature.html"),
    ("新闻评论", "news-commentary.html"),
]


def read_registry():
    text = io.open(PLAN, encoding="utf-8").read()
    rows = re.findall(
        r"^\| `(index\.html|news-(?:message|feature|commentary)\.html)` \| `(.+?)` \| `(.+?)` \| (.+?) \| (Task \d+) \|$",
        text,
        re.M,
    )
    if len(rows) != 4:
        sys.exit("页面登记表解析失败：命中 %d 行" % len(rows))
    return rows


def nav_html(current_file):
    items = []
    for label, target in NAV:
        cur = ' aria-current="page"' if target == current_file else ""
        items.append(
            "          <li class=\"site-navigation__item\">\n"
            "            <a class=\"site-navigation__link\" href=\"%s\"%s>%s</a>\n"
            "          </li>" % (target, cur, label)
        )
    return "\n".join(items)


TEMPLATE = """<!doctype html>
<html lang="zh-CN" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>@@TITLE@@</title>
  <link rel="stylesheet" href="styles.css">
  <script src="script.js" defer></script>
</head>
<body>
  <a class="skip-link" href="#main-content">跳至正文</a>

  <header class="site-header">
    <div class="site-header__inner">
      <p class="site-masthead">
        <a class="site-masthead__link" href="index.html">自然选择号</a>
      </p>

      <button
        class="nav-toggle"
        id="nav-toggle"
        type="button"
        aria-controls="site-navigation"
        aria-expanded="false"
      >
        <span class="nav-toggle__icon" aria-hidden="true"></span>
        <span class="nav-toggle__text">菜单</span>
      </button>

      <nav class="site-navigation" id="site-navigation" aria-label="主导航">
        <ul class="site-navigation__list">
@@NAV@@
        </ul>
      </nav>
    </div>
  </header>

  <main class="main-content" id="main-content" tabindex="-1">
    <h1 class="page-title">@@H1@@</h1>
  </main>
</body>
</html>
"""


def main():
    if not os.path.isdir(RESULTS):
        sys.exit("Results/ 不存在")
    for name in ("styles.css", "script.js"):
        if os.path.exists(os.path.join(RESULTS, name)):
            sys.exit("拒绝覆盖已存在的共享文件: %s" % name)
    existing = sorted(os.listdir(RESULTS))
    if existing:
        sys.exit("Results/ 非空，先人工确认现有内容: %r" % existing)

    for filename, title, h1, current, task in read_registry():
        html = TEMPLATE.replace("@@TITLE@@", title).replace("@@H1@@", h1)
        html = html.replace("@@NAV@@", nav_html(filename))
        if "@@" in html:
            sys.exit("模板记号未替换: %s" % filename)
        with io.open(os.path.join(RESULTS, filename), "w",
                     encoding="utf-8", newline="\n") as fh:
            fh.write(html)
        print("写入 %s  title=%s  h1=%s  current=%s  (%s)" % (filename, title, h1, current, task))


if __name__ == "__main__":
    main()
