"""Task 5.3-5.5: splice the authoritative article block into Results/news-message.html.

Text is read verbatim from plan/Task5-完成新闻消息页.md so no character is retyped.
QA-only; never a deliverable.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / "plan" / "Task5-完成新闻消息页.md"
PAGE = ROOT / "Results" / "news-message.html"
DATELINE = "自然选择号9月18日7时电"

contract = {}
for line in PLAN.read_text(encoding="utf-8").splitlines():
    m = re.match(r"^(type|title|byline|M0[1-4])\|(.+)$", line)
    if m and m.group(1) not in contract:
        contract[m.group(1)] = m.group(2)

missing = [k for k in ("type", "title", "byline", "M01", "M02", "M03", "M04") if k not in contract]
if missing:
    sys.exit(f"contract fields missing: {missing}")

for key, val in contract.items():
    if set("&<>") & set(val):
        sys.exit(f"{key} needs entity escaping; aborting for manual review")

m01 = contract["M01"]
if not m01.startswith(DATELINE + "\u0020"):
    sys.exit("M01 does not start with dateline + U+0020")
if m01.count(DATELINE) != 1:
    sys.exit("dateline occurs more than once in M01")
rest = m01[len(DATELINE) + 1:]

paras = [
    f'<p><strong class="dateline">{DATELINE}</strong> {rest}</p>',
    *[f"<p>{contract[k]}</p>" for k in ("M02", "M03", "M04")],
]

block = "\n".join(
    [
        '  <main class="main-content" id="main-content" tabindex="-1">',
        '    <article class="article">',
        '      <header class="article__header">',
        f'        <p class="article__type">{contract["type"]}</p>',
        f'        <h1 class="page-title">{contract["title"]}</h1>',
        f'        <p class="article__byline">{contract["byline"]}</p>',
        "      </header>",
        "",
        '      <div class="article__body">',
        *[f"        {p}" for p in paras],
        "      </div>",
        "    </article>",
        "  </main>",
    ]
) + "\n"

src = PAGE.read_text(encoding="utf-8")
new, n = re.subn(
    r"(?m)^  <main class=\"main-content\" id=\"main-content\" tabindex=\"-1\">.*?^  </main>\n",
    block,
    src,
    count=1,
    flags=re.S,
)
if n != 1:
    sys.exit("main block not located")

old_title_line = '    <h1 class="page-title">我校启动校本课程志愿填报</h1>\n'
if old_title_line not in src:
    sys.exit("expected Task 2 h1 line absent")
if new.count("<h1") != 1:
    sys.exit("more than one h1 after splice")

PAGE.write_text(new, encoding="utf-8", newline="\n")
print("rewrote", PAGE)
print("bytes", len(src), "->", len(new))
