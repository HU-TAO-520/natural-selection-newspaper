#!/usr/bin/env python3
"""Task 3 变异测试：向 styles.css / HTML 注入违约写法，确认 verify_css.py 能够捕获。
对照组（未变异）必须通过，每个变异组必须失败。"""
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REAL_RESULTS = HERE.parent / "Results"
WORK = HERE / "mut"
PAGES = ["index.html", "news-message.html", "news-feature.html", "news-commentary.html"]
CSS_OK = (REAL_RESULTS / "styles.css").read_text(encoding="utf-8")

# 名称: (CSS 查找, 替换) 或 ("__html__", 页名, 查找, 替换) 或 ("__file__", 新建文件)
MUTANTS = {
    "box-shadow 卡片": ("  min-width: 0;\n  padding-top: var(--space-7);",
                    "  min-width: 0;\n  box-shadow: 0 2px 8px rgba(0,0,0,.2);\n  padding-top: var(--space-7);"),
    "text-shadow": (".page-title {\n  max-width", ".page-title {\n  text-shadow: 0 1px 0 #fff;\n  max-width"),
    "线性渐变": ("  background: var(--color-paper);\n  color: var(--color-ink);\n  font-family",
              "  background: linear-gradient(#fff, #eee);\n  color: var(--color-ink);\n  font-family"),
    "背景图片 url": ("body {\n  min-height: 100vh;", "body {\n  background-image: url(paper.png);\n  min-height: 100vh;"),
    "远程字体 @import": ("", "@import url('https://fonts.example.com/x.css');\n"),
    "联网字体 @font-face": ("", "@font-face { font-family: X; src: local('a'); }\n"),
    "border-radius 卡片": (".home-section {\n  padding-block", ".home-section {\n  border-radius: 8px;\n  padding-block"),
    "正文分栏": ("  text-align: justify;", "  column-count: 2;\n  text-align: justify;"),
    "隐藏横向溢出": ("  min-width: 0;\n  padding-top", "  overflow-x: hidden;\n  min-width: 0;\n  padding-top"),
    "break-all": ("  word-break: normal;", "  word-break: break-all;"),
    "important": ("  color: var(--color-accent);\n  font-size: var(--font-size-small);\n  font-weight: 700;\n  letter-spacing: 0.18em;",
                  "  color: var(--color-accent) !important;\n  font-size: var(--font-size-small);\n  font-weight: 700;\n  letter-spacing: 0.18em;"),
    "ID 选择器": (".site-navigation {\n  display: block;", "#site-navigation {\n  display: block;"),
    "content 注入文字": (".article__byline {\n  margin", ".article__byline::before {\n  content: \"作者：\";\n}\n\n.article__byline {\n  margin"),
    "text-transform": ("  letter-spacing: 0.18em;", "  letter-spacing: 0.18em;\n  text-transform: uppercase;"),
    "颜色变量被改": ("--color-paper: #f5efe4;", "--color-paper: #ffffff;"),
    "暗红强调色被改": ("--color-accent: #7a2424;", "--color-accent: #1a7a24;"),
    "字体栈缺 serif": ('--font-serif: "Songti SC", "STSong", "SimSun", serif;',
                    '--font-serif: "Songti SC", "STSong", "SimSun";'),
    "版心改 46rem": ("--layout-max: 70rem;", "--layout-max: 46rem;"),
    "正文宽改 70rem": ("--reading-max: 46rem;", "--reading-max: 70rem;"),
    "重复变量声明": ("  --rule-thin: 1px;", "  --rule-thin: 1px;\n  --layout-max: 60rem;"),
    "报头字号写死 px": ("  font-size: var(--font-size-masthead);\n  line-height: var(--line-height-tight);",
                    "  font-size: 64px;\n  line-height: var(--line-height-tight);"),
    "报头改单线": ("  border-top: var(--rule-double) double var(--color-rule);",
                 "  border-top: var(--rule-thin) solid var(--color-rule);"),
    "汉堡按钮显示": (".nav-toggle {\n  display: none;", ".nav-toggle {\n  display: block;"),
    "导航默认隐藏": (".site-navigation {\n  display: block;", ".site-navigation {\n  display: none;"),
    "no-js 导航隐藏": (".no-js .site-navigation {\n  display: block;", ".no-js .site-navigation {\n  display: none;"),
    "导航裁切溢出": (".site-navigation {\n  display: block;", ".site-navigation {\n  overflow: hidden;\n  display: block;"),
    "当前页无下边框": ('.site-navigation__link[aria-current="page"] {\n  color: var(--color-accent);\n  font-weight: 700;\n  border-bottom: var(--focus-width) solid var(--color-accent);',
                   '.site-navigation__link[aria-current="page"] {\n  color: var(--color-accent);\n  font-weight: 700;'),
    "当前页只改颜色": ('  border-bottom: var(--focus-width) solid var(--color-accent);\n}', "  border-bottom: 2px solid transparent;\n}"),
    "导航四等分": ("  gap: 2.5rem;", "  flex: 1;\n  gap: 0;"),
    "移除焦点轮廓": ("  outline: var(--focus-width) solid var(--color-accent);\n  outline-offset: 3px;\n}\n\n/* 跳转链接到达正文时",
                  "  outline: none;\n  outline-offset: 3px;\n}\n\n/* 跳转链接到达正文时"),
    "跳转链接 display none": ("  transform: translateY(-150%);", "  display: none;"),
    "跳转链接无法聚焦": (".skip-link:focus {\n  transform: translateY(0);\n}", ""),
    "跳转链接被遮挡": ("  z-index: 100;", "  z-index: 0;"),
    "版心用 100vw": ("  width: calc(100% - var(--page-gutter) - var(--page-gutter));", "  width: 100vw;"),
    "版心加左 padding": ("  margin-inline: auto;\n}\n\n.site-masthead", "  margin-inline: auto;\n  padding-inline: 1rem;\n}\n\n.site-masthead"),
    "标题用 nowrap": ("  text-wrap: balance;", "  white-space: nowrap;\n  text-wrap: balance;"),
    "全局首行缩进": (".article__body > p {", ".main-content p {"),
    "段落无缩进": ("  text-indent: 2em;", "  text-indent: 0;"),
    "nth-child 页面补丁": ("", "\nbody.index .page-title { color: red; }\n"),
    "移动端媒体查询": ("", "\n@media (max-width: 768px) { :root { --page-gutter: 1rem; } }\n"),
    "transition 动画": ("  transform: translateY(-150%);", "  transform: translateY(-150%);\n  transition: transform .3s;"),
    "grid 卡片布局": ("  max-width: var(--reading-max);\n  margin: var(--space-7) auto 0;",
                   "  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  max-width: var(--reading-max);"),
    "正文斜体": ("  color: var(--color-muted);\n  font-size: var(--font-size-small);",
              "  font-style: italic;\n  color: var(--color-muted);\n  font-size: var(--font-size-small);"),
    "语义重复别名变量": ("  --page-gutter: 2rem;", "  --page-gutter: 2rem;\n  --container-width: 70rem;"),
    "移除首页接口": (".home-sections {", ".home-sections-removed {"),
    "移除文章接口": (".article__byline {", ".article__byline-removed {"),
    "移除 dateline": (".dateline {", ".dateline-removed {"),
    "电头转块级": ("  font-weight: 700;\n}\n\n/* 仅评论页正文末尾", "  font-weight: 700;\n  display: block;\n  margin-top: 1rem;\n}\n\n/* 仅评论页正文末尾"),
    "日期左对齐": ("  text-align: right;\n  text-indent: 0;", "  text-align: left;\n  text-indent: 2em;"),
    "HTML 内联样式表": None,
    "HTML style 属性": None,
    "Results 多余文件": None,
    "第二套导航": None,
}

HTML_CSS_HREF = ('  <link rel="stylesheet" href="styles.css">',
                 '  <link rel="stylesheet" href="styles.css">\n  <style>.page-title{color:red}</style>')
HTML_STYLE_ATTR = ('<h1 class="page-title">《自然选择号》报社简介</h1>',
                   '<h1 class="page-title" style="color:red">《自然选择号》报社简介</h1>')
DUP_NAV = ('      </nav>', '      </nav>\n      <nav class="site-navigation"><a class="site-navigation__link" href="#">重复</a></nav>')


def build(name, css, html_patch):
    """写出一棵变异后的 Results/ 目录树。html_patch: [(页名, 查找, 替换)]"""
    res = WORK / name / "Results"
    res.mkdir(parents=True, exist_ok=True)
    for page, find, replace in html_patch:
        txt = (REAL_RESULTS / page).read_text(encoding="utf-8")
        if find not in txt:
            raise SystemExit(f"HTML 变异锚点缺失: {name}")
        (res / page).write_text(txt.replace(find, replace, 1), encoding="utf-8")
    for p in PAGES:
        target = res / p
        if not target.exists():
            target.write_text((REAL_RESULTS / p).read_text(encoding="utf-8"), encoding="utf-8")
    (res / "styles.css").write_text(css, encoding="utf-8")
    return res


def run(root):
    r = subprocess.run([sys.executable, str(HERE / "verify_css.py"), str(root)],
                       capture_output=True, text=True, encoding="utf-8")
    return r.returncode, r.stdout


results = []

# 对照组
code, out = run(HERE.parent)
results.append(("对照组（真实交付）", code == 0, out.strip().splitlines()[-1] if out else ""))

for name, spec in MUTANTS.items():
    css = CSS_OK
    html_patch = []
    if name == "HTML 内联样式表":
        html_patch = [("index.html", *HTML_CSS_HREF)]
    elif name == "HTML style 属性":
        html_patch = [("index.html", *HTML_STYLE_ATTR)]
    elif name == "第二套导航":
        html_patch = [("index.html", *DUP_NAV)]
    elif name == "Results 多余文件":
        pass
    else:
        find_css, replace_css = spec
        if find_css and find_css not in css:
            results.append((name, False, "CSS 变异锚点缺失"))
            continue
        css = css.replace(find_css, replace_css, 1) if find_css else css + replace_css

    res = build(name, css, html_patch)
    if name == "Results 多余文件":
        (res / "screenshot.png").write_bytes(b"\x89PNG")

    code, out = run(WORK / name)
    fails = [l for l in out.splitlines() if l.startswith("FAIL")]
    results.append((name, code != 0, f"捕获 {len(fails)} 项: " + "; ".join(f[5:70] for f in fails[:2])))

bad = [r for r in results if not r[1]]
print("=" * 72)
for name, ok, detail in results:
    print(f"{'OK ' if ok else 'BAD'}  {name}  {detail}")
print("=" * 72)
print(f"变异 {len(MUTANTS)} 个 + 对照组 1 个；未达预期 {len(bad)} 个")
shutil.rmtree(WORK, ignore_errors=True)
sys.exit(1 if bad else 0)

