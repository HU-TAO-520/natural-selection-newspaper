"""Mutation harness: prove verify.py actually captures Task 5 contract violations.

Each mutant is a shadow Results/ dir with one deliberate violation. The control
copy must PASS and every mutant must FAIL. QA-only.
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "Results"
SHADOW = Path(__file__).resolve().parent / "shadow"
VERIFY = Path(__file__).with_name("verify.py")

MUTANTS = {
    "m01": ("今日7时", "9月18日7时"),
    "m02": ('</strong> 我校', "</strong>&nbsp;我校"),
    "m03": ('<strong class="dateline">自然选择号9月18日7时电</strong> 我校',
            '</p><p><strong class="dateline">自然选择号9月18日7时电</strong> 我校'),
    "m04": ('<p class="article__byline">蓝色空间', '<p class="article__byline">作者：蓝色空间'),
    "m05": ('<p class="article__type">新闻消息</p>', '<h2 class="article__type">新闻消息</h2>'),
    "m06": ("<h1 class=\"page-title\">我校启动校本课程志愿填报</h1>",
            "<h1 class=\"page-title\">我校启动校本课程志愿填报</h1><h1>补充标题</h1>"),
    "m07": ("</div>\n    </article>",
            '<p class="article__date">2026年9月18日</p>\n      </div>\n    </article>'),
    "m08": ("进行录取；部分社团", "进行录取。</p>\n        <p>部分社团"),
    "m09": ("例如，心理社团面向心理委员招生，合唱团报名者需要向指导老师展示一段演唱，经老师同意后方可加入。",
            "例如：<ul><li>心理社团面向心理委员招生</li><li>合唱团需展示演唱</li></ul>"),
    "m10": ("自然选择号9月18日7时电</strong>", "自然选择号9月18日7时电 </strong>"),
    "m11": ("共有47个社团", "共有 47 个社团"),
    "m12": ("第一志愿、第二志愿", "第一志愿，第二志愿"),
    "m13": ('<div class="article__body">', "<div>"),
    "m14": ("在此前的动员会上", "在此前的动员会上<br>"),
    "m15": ('<article class="article">', '<article class="article" style="max-width:40rem">'),
    "m16": ("正在进行中。</p>", '正在进行中。<a href="https://example.com">详情</a></p>'),
    "m17": ("<!doctype html", "<!-- 源文件 Materials/新闻消息.docx -->\n<!doctype html"),
    "m18": ('        <p class="article__type">新闻消息</p>\n        <h1 class="page-title">我校启动校本课程志愿填报</h1>',
            '        <h1 class="page-title">我校启动校本课程志愿填报</h1>\n        <p class="article__type">新闻消息</p>'),
    "m19": ('href="news-message.html" aria-current="page"', 'href="news-message.html"'),
    "m20": ('id="main-content" tabindex="-1"', 'id="main-content"'),
    "m21": ("我校启动校本课程志愿填报｜自然选择号", "我校启动校本课程志愿填报|自然选择号"),
    "m22": ('<p><strong class="dateline">', '<p data-id="M01"><strong class="dateline">'),
    "m23": ('<strong class="dateline">自然选择号9月18日7时电</strong>', "自然选择号9月18日7时电"),
    "m24": ("目前，校本课程志愿填报工作正在进行中。</p>", "目前，校本课程志愿填报工作正在进行中。。</p>"),
    "m25": ("</strong> 我校校本课程", "</strong>\n          我校校本课程"),
    "m26": ("9月18日7时电", '<time datetime="2026-09-18">9月18日</time>7时电'),
    "m27": ("<h1 class=\"page-title\">", '<h1 class="article-title page-title">'),
    "m28": ("</div>\n    </article>", '  <img src="pic.png" alt="活动现场">\n      </div>\n    </article>'),
    "m29": ("若两项志愿均未被录取", "M04 若两项志愿均未被录取"),
    "m30": ("</html>", "</html>\n<script>console.log(1)</script>"),
    "m31": ('<nav class="site-navigation" id="site-navigation"',
            '<nav class="site-navigation is-open" id="site-navigation" hidden'),
    "m32": ("  <main class=\"main-content\" id=\"main-content\" tabindex=\"-1\">\n    <article",
            "  <main class=\"main-content\" id=\"main-content\" tabindex=\"-1\">\n    <p>导语占位</p>\n    <article"),
}


def run(results_dir):
    env = dict(os.environ, QA_RESULTS=str(results_dir), PYTHONIOENCODING="utf-8")
    proc = subprocess.run(
        [sys.executable, str(VERIFY)],
        cwd=str(ROOT),
        env=env,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    fails = [l for l in proc.stdout.splitlines() if l.startswith("FAIL [")]
    return proc.returncode, fails, proc.stdout.strip().splitlines()[-1] if proc.stdout.strip() else proc.stderr[-400:]


def main():
    if SHADOW.exists():
        shutil.rmtree(SHADOW)
    log = []

    SHADOW.mkdir(parents=True)
    shutil.copytree(RESULTS, SHADOW / "Results")
    code, fails, summary = run(SHADOW / "Results")
    log.append(f"CONTROL expect=PASS got={'PASS' if code == 0 else 'FAIL'} {summary}")
    ok_control = code == 0

    bad = [] if ok_control else ["control"]
    for name, (old, new) in MUTANTS.items():
        d = SHADOW / name / "Results"
        shutil.rmtree(SHADOW / name, ignore_errors=True)
        shutil.copytree(RESULTS, d)
        page = d / "news-message.html"
        src = page.read_text(encoding="utf-8")
        if old not in src:
            log.append(f"{name} expect=FAIL got=NOT-APPLIED :: anchor absent -> harness bug")
            bad.append(name)
            continue
        page.write_text(src.replace(old, new, 1), encoding="utf-8", newline="\n")
        code, fails, summary = run(d)
        captured = code == 1 and fails
        if code == 2:
            log.append(f"{name} expect=FAIL got=CRASH(rc2, not a real FAIL record)")
        elif code == 0:
            log.append(f"{name} expect=FAIL got=PASS(MISSED)")
        names = "; ".join(f.replace("FAIL ", "") for f in fails[:3])
        log.append(f"{name} -> {'FAIL(captured)' if captured else 'NOT-CAPTURED'} :: {names[:200]}")
        if not captured:
            bad.append(name)
    shutil.rmtree(SHADOW / "Results", ignore_errors=True)

    text = "\n".join(log) + f"\n\nmissed/not-applied: {bad or 'none'}\n"
    Path(__file__).with_name("mutation_log.txt").write_text(text, encoding="utf-8")
    print(text)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
