"""Task 6 build: splice the frozen 新闻通讯 article block into Results/news-feature.html.

Text is read verbatim from the Task 1 权威逐段内容合同 (the content authority) so
no character is retyped. Only the <main> element is replaced; the Task 2 shell,
<title>, navigation and resource references stay byte-identical. QA-only.
"""
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TASK1 = ROOT / "plan" / "Task1-素材基线与内容合同.md"
PAGE = ROOT / "Results" / "news-feature.html"
DATELINE = "自然选择号9月17日电"
TYPE = "新闻通讯"
TITLE = "从数学题到AI时代的学习"
SNAPSHOT = ROOT / "_qa_task6" / "before.html"

KEYS = [f"F{i:02d}" for i in range(1, 24)]

src_bytes = PAGE.read_bytes()
SNAPSHOT.write_bytes(src_bytes)
src = src_bytes.decode("utf-8")

# --- load contract from Task 1 (content authority) -------------------------
txt = TASK1.read_text(encoding="utf-8")
chunk = txt[txt.index("### 新闻通讯"):]
chunk = chunk[: chunk.find("\n### ")]
contract = {}
for line in chunk.splitlines():
    m = re.match(r"^(title|byline|F(?:0[1-9]|1[0-9]|2[0-3]))\|(.*)$", line)
    if m:
        contract.setdefault(m.group(1), m.group(2))

missing = [k for k in ["title", "byline"] + KEYS if k not in contract]
if missing:
    sys.exit(f"contract fields missing from Task 1: {missing}")
if contract["title"] != TITLE:
    sys.exit(f"Task 1 title drifted: {contract['title']!r}")
if contract["byline"] != "蓝色空间":
    sys.exit(f"Task 1 byline drifted: {contract['byline']!r}")
for k in ["title", "byline"] + KEYS:
    if set("&<>") & set(contract[k]):
        sys.exit(f"{k} would need entity escaping; aborting for manual review")

# --- dateline handling -----------------------------------------------------
f01 = contract["F01"]
if not f01.startswith(DATELINE + "\u0020"):
    sys.exit("F01 does not start with dateline + a single U+0020")
if f01[len(DATELINE) + 1:len(DATELINE) + 2] == "\u0020":
    sys.exit("F01 has two spaces after the dateline")
if f01.count("\u0020") != 1:
    sys.exit("F01 contains more than one U+0020")
rest = f01[len(DATELINE) + 1:]
if f"{DATELINE}\u0020{rest}" != f01:
    sys.exit("dateline reassembly is not lossless")

paras = [f'<p><strong class="dateline">{DATELINE}</strong>\u0020{rest}</p>']
paras += [f"<p>{contract[k]}</p>" for k in KEYS[1:]]
if len(paras) != 23:
    sys.exit("paragraph count is not 23")
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
    '    </article>',
    '  </main>',
]) + "\n"

# --- replace only the <main> element --------------------------------------
new, n = re.subn(
    r'(?m)^  <main class="main-content" id="main-content" tabindex="-1">.*?^  </main>\n',
    lambda _: block, src, count=1, flags=re.S)
if n != 1:
    sys.exit("<main> block not located exactly once")

# preconditions: Task 2 minimal state had exactly the h1 inside main
if src.count("<h1") != 1 or new.count("<h1") != 1:
    sys.exit("h1 count must stay 1")
if new.count("<main") != 1 or new.count("</main>") != 1:
    sys.exit("main must stay unique")

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
