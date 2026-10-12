"""Task 7 QA: mutation testing for _qa_task7/verify.py.

Each mutation is a realistic Task 7 regression (text drift, paragraph-boundary
break, role mis-assignment, shell/ARIA drift, forbidden item, style leak). The
verifier must reject every one of them, and must accept an untouched control
copy. QA-only.
"""
import os
import re
import shutil
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HERE = ROOT / "_qa_task7"
RESULTS = ROOT / "Results"
PAGE = "news-commentary.html"
OUT = HERE / "mut"
VERIFY = HERE / "verify.py"

src = (RESULTS / PAGE).read_text(encoding="utf-8")

M = [
    # --- character / text fidelity ---
    ("drop char in C01", lambda s: s.replace("86英寸", "86寸", 1)),
    ("full-width comma to half-width", lambda s: s.replace("设备换新，本来是", "设备换新,本来是", 1)),
    ("period to full-width in .exe", lambda s: s.replace("“.exe”", "“。exe”", 1)),
    ("strip dot from .exe", lambda s: s.replace("Windows下的.exe程序", "Windows下的exe程序", 1)),
    ("Windows 10 without space", lambda s: s.replace("Windows 10电脑", "Windows10电脑", 1)),
    ("Windows 10 with double space", lambda s: s.replace("对刚从Windows 10转过来的", "对刚从Windows  10转过来的", 1)),
    ("word-run seam space 安装", lambda s: s.replace("统一安装", "统一安 装", 1)),
    ("UOS lowercased", lambda s: s.replace("定制版UOS", "定制版uos", 1)),
    ("USB lowercased", lambda s: s.replace("USB接口的位置", "usb接口的位置", 1)),
    ("OPS lowercased", lambda s: s.replace("OPS层面", "ops层面", 1)),
    ("Linux lowercased", lambda s: s.replace("先弄懂Linux", "先弄懂linux", 1)),
    ("4K lowercased", lambda s: s.replace("4K显示", "4k显示", 1)),
    ("AI lowercased", lambda s: s.replace("同窗AI大屏", "同窗Ai大屏", 1)),
    ("drop qualifier 不完全统计", lambda s: s.replace("根据记者的不完全统计，", "根据记者的统计，", 1)),
    ("drop qualifier 还需要进一步检查", lambda s: s.replace("还需要进一步检查，", "", 1)),
    ("5次 to 五次", lambda s: s.replace("发生过5次碰撞", "发生过五次碰撞", 1)),
    ("3个U盘 to 三个U盘", lambda s: s.replace("其中3个U盘被撞坏", "其中三个U盘被撞坏", 1)),
    ("curly quote to straight", lambda s: s.replace("“老师要适应”", '"老师要适应"', 1)),
    ("semicolon to comma in C12", lambda s: s.replace("这些软件怎么使用；如果", "这些软件怎么使用；如果".replace("；", "，"), 1)),
    ("trailing space inside a paragraph", lambda s: s.replace("就在屏幕左下角。</p>", "就在屏幕左下角。 </p>", 1)),
    ("leading space inside a paragraph", lambda s: s.replace("<p>但教室毕竟", "<p> 但教室毕竟", 1)),
    ("nbsp inside paragraph", lambda s: s.replace("新系统的学习成本", "新系统的 学习成本", 1)),
    ("zero-width space inside paragraph", lambda s: s.replace("问题并不复杂", "​问题并不复杂", 1)),
    ("title text drift", lambda s: s.replace("设备升级了，使用门槛也该降下来</h1>", "设备升级了，使用门槛应该降下来</h1>", 1)),
    ("byline swapped to Word author", lambda s: s.replace(">蓝色空间<", ">厨一枚<", 1)),
    ("byline prefix 作者：", lambda s: s.replace('<p class="article__byline">蓝色空间',
                                                '<p class="article__byline">作者：蓝色空间', 1)),
    ("type shows internal source name", lambda s: s.replace('<p class="article__type">新闻评论</p>', '<p class="article__type">新闻评价</p>', 1)),
    ("type text swapped", lambda s: s.replace('<p class="article__type">新闻评论</p>',
                                              '<p class="article__type">新闻通讯</p>', 1)),
    # --- paragraph boundary / count ---
    ("merge C02 into C01", lambda s: s.replace("也集成了不少教学功能。</p>\n        <p>设备换新",
                                               "也集成了不少教学功能。设备换新", 1)),
    ("split C26 into two paragraphs", lambda s: s.replace(
        "也可以准备较简单的兼容方案；两套容易混淆", "也可以准备较简单的兼容方案；</p>\n        <p>两套容易混淆", 1)),
    ("C03 promoted to h2", lambda s: s.replace("<p>最明显的一个，就在屏幕左下角。</p>",
                                               "<h2>最明显的一个，就在屏幕左下角。</h2>", 1)),
    ("C29 quote moved to blockquote", lambda s: s.replace(
        "<p>设备升级了，使用门槛也该降下来。“科技不是高高在上的，而应该服务人民。”</p>",
        "<p>设备升级了，使用门槛也该降下来。</p>\n        <blockquote>“科技不是高高在上的，而应该服务人民。”</blockquote>", 1)),
    ("C26 turned into a list", lambda s: s.replace(
        "USB接口的位置可以增加防撞措施", "<ul><li>USB接口的位置可以增加防撞措施", 1)),
    ("insert <br> mid paragraph", lambda s: s.replace("现在却可能需要找人处理。", "<br>现在却可能需要找人处理。", 1)),
    ("drop C28 entirely", lambda s: s.replace(
        "<p>教学设备存在的目的，是帮助老师上课。屏幕可以越来越大，功能可以越来越多，系统也可以不断更新，但对站在讲台前的人来说，操作最好越来越简单，而不是越来越复杂。</p>\n        ", "", 1)),
    ("duplicate C07", lambda s: s.replace("<p>如果说USB接口", "<p>如果说USB接口还是看得见、摸得着的问题，那么换用新的操作系统以后出现的一些问题，就没有这么直观了。</p>\n        <p>如果说USB接口", 1)),
    ("body paragraph gains a class", lambda s: s.replace("<p>最明显的一个", '<p class="commentary-lead">最明显的一个', 1)),
    ("wrap body in extra section", lambda s: s.replace('<div class="article__body">',
                                                       '<div class="article__body"><section>', 1)),
    # --- date role ---
    ("date moved into body", lambda s: s.replace('      <p class="article__date">（自然选择号9月18日）</p>', "", 1)
        .replace("      </div>", '      <p class="article__date">（自然选择号9月18日）</p>\n      </div>', 1)),
    ("date becomes <time datetime>", lambda s: s.replace(
        '<p class="article__date">（自然选择号9月18日）</p>',
        '<p class="article__date"><time datetime="2026-09-18">（自然选择号9月18日）</time></p>', 1)),
    ("date gains inferred year", lambda s: s.replace("（自然选择号9月18日）", "（自然选择号2026年9月18日）", 1)),
    ("date pushed right with nbsp", lambda s: s.replace(
        '<p class="article__date">（', '<p class="article__date">&nbsp;&nbsp;（', 1)),
    ("date text drift", lambda s: s.replace("（自然选择号9月18日）", "（自然选择号9月18日讯）", 1)),
    ("dateline markup added", lambda s: s.replace('<p class="article__date">',
                                                  '<p class="dateline article__date">', 1)),
    # --- shell / ARIA / navigation regressions ---
    ("second h1 added", lambda s: s.replace('<h1 class="page-title">', '<h1 class="article-title">评论</h1>\n        <h1 class="page-title">', 1)),
    ("h1 renamed to article-title", lambda s: s.replace('<h1 class="page-title">', '<h1 class="article-title">', 1)),
    ("nav item text swapped", lambda s: s.replace(">新闻通讯</a>", ">新闻评论</a>", 1)),
    ("nav href reordered", lambda s: s.replace('href="news-message.html">新闻消息', 'href="news-feature.html">新闻消息', 1)),
    ("aria-current removed", lambda s: s.replace(' aria-current="page"', "", 1)),
    ("aria-current duplicated onto 首页", lambda s: s.replace('<a class="site-navigation__link" href="index.html">首页',
                                                             '<a class="site-navigation__link" href="index.html" aria-current="page">首页', 1)),
    ("masthead carries aria-current", lambda s: s.replace('<a class="site-masthead__link" href="index.html">',
                                                          '<a class="site-masthead__link" href="index.html" aria-current="page">', 1)),
    ("nav-toggle aria-expanded true", lambda s: s.replace('aria-expanded="false"', 'aria-expanded="true"', 1)),
    ("nav-toggle aria-controls dropped", lambda s: s.replace('aria-controls="site-navigation"\n        ', "", 1)),
    ("nav marked hidden", lambda s: s.replace('<nav class="site-navigation" id="site-navigation"',
                                              '<nav class="site-navigation is-open" hidden id="site-navigation"', 1)),
    ("<title> uses half-width bar", lambda s: s.replace("｜自然选择号</title>", "|自然选择号</title>", 1)),
    ("script loses defer", lambda s: s.replace('<script src="script.js" defer></script>',
                                               '<script src="script.js"></script>', 1)),
    ("no-js class removed", lambda s: s.replace('<html lang="zh-CN" class="no-js">', '<html lang="zh-CN">', 1)),
    ("skip-link removed", lambda s: s.replace('<a class="skip-link" href="#main-content">跳至正文</a>\n\n', "", 1)),
    ("main id renamed", lambda s: s.replace('id="main-content"', 'id="content"', 2)),
    ("tabindex removed from main", lambda s: s.replace(' tabindex="-1">', '>', 1)),
    ("second main added", lambda s: s.replace("</main>", "<main></main></main>", 1)),
    # --- forbidden / scope leaks ---
    ("source filename leaked in comment", lambda s: s.replace("<article class=\"article\">",
                                                              "<!-- 源文件 Materials/新闻评价.docx -->\n    <article class=\"article\">", 1)),
    ("sha fragment leaked as data attr", lambda s: s.replace('<article class="article">',
                                                             '<article class="article" data-sha="8E50CFC8">', 1)),
    ("contract id visible in body", lambda s: s.replace("<p>最明显的一个", "<p>C03 最明显的一个", 1)),
    ("external stylesheet added", lambda s: s.replace('<link rel="stylesheet" href="styles.css">',
                                                      '<link rel="stylesheet" href="https://fonts.example.com/x.css">\n  <link rel="stylesheet" href="styles.css">', 1)),
    ("image added to article", lambda s: s.replace('<div class="article__body">',
                                                   '<div class="article__body">\n        <img src="pic.png" alt="大屏">', 1)),
    ("link added on 科大讯飞", lambda s: s.replace("从科大讯飞的产品资料来看",
                                                  '从<a href="https://example.com">科大讯飞</a>的产品资料来看', 1)),
    ("inline style on date", lambda s: s.replace('<p class="article__date">', '<p class="article__date" style="text-align:right">', 1)),
    ("page-scoped style block", lambda s: s.replace("</head>", "<style>.article__body p{color:red}</style></head>", 1)),
    ("role=article added", lambda s: s.replace('<article class="article">', '<article class="article" role="article">', 1)),
    ("TODO marker added", lambda s: s.replace("<p>但教室毕竟", "<p>TODO 但教室毕竟", 1)),
    ("footer with copyright year", lambda s: s.replace("</article>", '</article>\n    <footer>© 2026 蓝色空间</footer>', 1)),
    ("author bio block added", lambda s: s.replace("</article>",
                                                   '</article>\n    <p class="article__bio">作者简介：蓝色空间，在校学生。</p>', 1)),
    ("read-also list added", lambda s: s.replace("</article>",
                                                 '</article>\n    <ul class="article__more"><li>相关阅读</li></ul>', 1)),
    ("shell text outside main edited", lambda s: s.replace(">自然选择号</a>", ">自然选择号报纸</a>", 1)),
    ("paragraph text injected into nav", lambda s: s.replace(">新闻评论</a>", ">新闻评论（自然选择号9月18日）</a>", 1)),
]


def run(results_dir):
    env = dict(os.environ, QA_RESULTS=str(results_dir))
    p = subprocess.run([sys.executable, str(VERIFY)], capture_output=True, text=True,
                       encoding="utf-8", errors="replace", env=env, cwd=str(ROOT), timeout=180)
    return p.returncode, p.stdout


if OUT.exists():
    shutil.rmtree(OUT)


def slug(name):
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


def copy_results(name, page_text):
    d = OUT / slug(name)
    d.mkdir(parents=True, exist_ok=True)
    for f in RESULTS.iterdir():
        if f.name != PAGE:
            shutil.copy2(f, d / f.name)
    (d / PAGE).write_text(page_text, encoding="utf-8", newline="\n")
    return d


lines = []
undetected = []

rc, out = run(copy_results("control", src))
lines.append(f"CONTROL | rc={rc} (must be 0) | {out.strip().splitlines()[-1] if out.strip() else ''}")
if rc != 0:
    undetected.append("CONTROL false positive")

for idx, (name, fn) in enumerate(M):
    mutated = fn(src)
    if mutated == src:
        lines.append(f"BAD MUTATION | {name} | replacement was a no-op")
        undetected.append(name + " (no-op mutation)")
        continue
    d = copy_results(name, mutated)
    rc, out = run(d)
    first = next((l for l in out.splitlines() if l.startswith("FAIL")), "")
    detected = rc != 0
    lines.append(f"{'CAUGHT' if detected else 'MISSED'} | {name} | rc={rc} | {first[:150]}")
    if not detected:
        undetected.append(name)

text = "\n".join(lines) + "\n"
(HERE / "mutation_log.txt").write_text(text, encoding="utf-8")
print(text)
print(f"mutations: {len(M)}, caught: {len(M) - len([u for u in undetected if 'CONTROL' not in u])}, "
      f"missed/no-op: {len(undetected)}")
print("control rc=0:", "CONTROL | rc=0" in text)
sys.exit(1 if undetected else 0)
