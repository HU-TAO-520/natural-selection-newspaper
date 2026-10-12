"""Task 7 build: splice the frozen 新闻评论 article block into
Results/news-commentary.html.

Text is read verbatim from the Task 1 权威合同 (content authority) so no
character is retyped. Only the <main> element is replaced; the Task 2 shell,
<title>, navigation and resource references stay byte-identical. QA-only.
"""
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TASK1 = ROOT / "plan" / "Task1-素材基线与内容合同.md"
PAGE = ROOT / "Results" / "news-commentary.html"
HERE = Path(__file__).resolve().parent
TYPE = "新闻评论"
TITLE = "设备升级了，使用门槛也该降下来"
BYLINE = "蓝色空间"
DATE = "（自然选择号9月18日）"
KEYS = [f"C{i:02d}" for i in range(1, 30)]
EXPECTED_H1 = TITLE  # Task 2 shell already carries this h1

src_bytes = PAGE.read_bytes()
(HERE / "before.html").write_bytes(src_bytes)
src = src_bytes.decode("utf-8")

# --- content-role gate on the pre-existing Task 2 shell --------------------
if src.count("<main") != 1 or src.count("</main>") != 1:
    sys.exit("<main> is not unique")
if src.count("<h1") != 1:
    sys.exit("Task 2 shell must carry exactly one <h1> before the build")
if f'<h1 class="page-title">{EXPECTED_H1}</h1>' not in src:
    sys.exit("existing h1.page-title differs from the Task 1 title; refusing")
if "新闻评价" in src:
    sys.exit("pre-existing page leaks the internal source name")
if src.count('aria-current="page"') != 1 or 'href="news-commentary.html" aria-current="page"' not in src:
    sys.exit("Task 2 current-item state is not intact")
if re.search(r"article|article__body", src):
    sys.exit("page already carries article markup; run the逐项 comparison first")

# --- load contract from Task 1 (content authority) -------------------------
txt = TASK1.read_text(encoding="utf-8")
chunk = txt[txt.index("### 新闻评论"):]
chunk = chunk[: chunk.find("\n### ")]
contract = {}
for line in chunk.splitlines():
    m = re.match(r"^(title|byline|closing_date|C(?:0[1-9]|1[0-9]|2[0-9]))\|(.*)$", line)
    if m:
        contract.setdefault(m.group(1), m.group(2))

missing = [k for k in ["title", "byline", "closing_date"] + KEYS if k not in contract]
if missing:
    sys.exit(f"contract fields missing from Task 1: {missing}")
for k, want in [("title", TITLE), ("byline", BYLINE), ("closing_date", DATE)]:
    if contract[k] != want:
        sys.exit(f"Task 1 {k} drifted: {contract[k]!r}")
for k in ["title", "byline", "closing_date"] + KEYS:
    if set("&<>") & set(contract[k]):
        sys.exit(f"{k} would need entity escaping; aborting for manual review")
    if "\n" in contract[k] or "\r" in contract[k]:
        sys.exit(f"{k} contains a newline")
if contract["closing_date"] != contract["closing_date"].strip():
    sys.exit("date carries padding")

paras = [f"<p>{contract[k]}</p>" for k in KEYS]
if len(paras) != 29:
    sys.exit("paragraph count is not 29")
for p in paras:
    if "\n" in p:
        sys.exit("a <p> would contain a source newline")

block = "\n".join([
    '  <main class="main-content" id="main-content" tabindex="-1">',
    '    <article class="article">',
    '      <header class="article__header">',
    f'        <p class="article__type">{TYPE}</p>',
    f'        <h1 class="page-title">{contract["title"]}</h1>',
    f'        <p class="article__byline">{contract["byline"]}</p>',
    '      </header>',
    '',
    '      <div class="article__body">',
    *[f'        {p}' for p in paras],
    '      </div>',
    '',
    f'      <p class="article__date">{contract["closing_date"]}</p>',
    '    </article>',
    '  </main>',
]) + "\n"

# --- replace only the <main> element --------------------------------------
new, n = re.subn(
    r'(?m)^  <main class="main-content" id="main-content" tabindex="-1">.*?^  </main>\n',
    lambda _: block, src, count=1, flags=re.S)
if n != 1:
    sys.exit("<main> block not located exactly once")

if new.count("<h1") != 1:
    sys.exit("h1 count must stay 1")
if new.count("<main") != 1 or new.count("</main>") != 1:
    sys.exit("main must stay unique")
if new.count("<article") != 1 or new.count('class="article__date"') != 1:
    sys.exit("article/date counts wrong")

# shell outside <main> must be byte-identical
old_shell = src[: src.index("  <main")] + src[src.index("</main>\n") + len("</main>\n"):]
new_shell = new[: new.index("  <main")] + new[new.index("</main>\n") + len("</main>\n"):]
if old_shell != new_shell:
    sys.exit("Task 2 shell outside <main> changed; refusing")

PAGE.write_text(new, encoding="utf-8", newline="\n")
print("rewrote", PAGE)
print("bytes", len(src_bytes), "->", len(new.encode("utf-8")))
print("shell before sha", hashlib.sha256(old_shell.encode()).hexdigest()[:16],
      "| after", hashlib.sha256(new_shell.encode()).hexdigest()[:16])
print("page sha256", hashlib.sha256(PAGE.read_bytes()).hexdigest())
