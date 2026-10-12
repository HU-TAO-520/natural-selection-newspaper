"""Task 7 independent cross-check: a second, deliberately different code path
(no bs4, plain string scanning) over Results/news-commentary.html, plus
cross-page consistency against the sibling pages. QA-only.
"""
import hashlib
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "Results"
PAGE = RESULTS / "news-commentary.html"
TASK1 = ROOT / "plan" / "Task1-素材基线与内容合同.md"
KEYS = [f"C{i:02d}" for i in range(1, 30)]

txt = TASK1.read_text(encoding="utf-8")
chunk = txt[txt.index("### 新闻评论"):]
chunk = chunk[: chunk.find("\n### ")]
contract = {}
for line in chunk.splitlines():
    m = re.match(r"^(title|byline|closing_date|C(?:0[1-9]|1[0-9]|2[0-9]))\|(.*)$", line)
    if m:
        contract.setdefault(m.group(1), m.group(2))

src = PAGE.read_text(encoding="utf-8")
fails = []


def ck(name, ok, detail=""):
    print(f"{'PASS' if ok else 'FAIL'} | {name}{(' | ' + detail) if detail else ''}")
    if not ok:
        fails.append(name)


main = src[src.index("  <main"): src.index("</main>") + len("</main>")]
paras = re.findall(r"(?m)^        <p>([^<]*)</p>$", main)
ck("regex path finds 29 bare body <p>", len(paras) == 29, str(len(paras)))
ck("29 paragraphs == Task 1 C01-C29 exactly", paras == [contract[k] for k in KEYS])
ck("concatenated body length == 2038 chars (C01-C29)", sum(len(p) for p in paras) == 2038,
   str(sum(len(p) for p in paras)))
ck("no stray '<' inside any paragraph (no hidden markup)", all("<" not in p and ">" not in p for p in paras))
ck("type/h1/byline/date lines present verbatim once",
   main.count('        <p class="article__type">新闻评论</p>\n') == 1
   and main.count(f'        <h1 class="page-title">{contract["title"]}</h1>\n') == 1
   and main.count(f'        <p class="article__byline">{contract["byline"]}</p>\n') == 1
   and main.count(f'      <p class="article__date">{contract["closing_date"]}</p>\n') == 1)
ck("date line sits between </div> and </article>",
   main.index("</div>") < main.index('p class="article__date"') < main.index("</article>"))
ck("article opens right after <main> and closes right before </main>",
   re.search(r'<main class="main-content" id="main-content" tabindex="-1">\n    <article class="article">\n',
             main) is not None and main.rstrip().endswith("</article>\n  </main>"))
ck("every character of the contract appears in the file byte-for-byte",
   all(contract[k].encode("utf-8") in PAGE.read_bytes() for k in ["title", "byline", "closing_date"] + KEYS))
ck("no character outside the contract is added to <main>",
   main.count("新闻评论") == 1 and main.count("蓝色空间") == 1
   and len(re.findall(r"(?m)^      <p[^>]*>", main)) == 1)
shell = src.replace(main, "")
before = (ROOT / "_qa_task7" / "before.html").read_text(encoding="utf-8")
before_shell = before[: before.index("  <main")] + before[before.index("</main>") + len("</main>"):]
ck("shell outside <main> is byte-identical to the Task 2 skeleton",
   shell == before_shell, f"{len(shell.encode('utf-8'))} bytes")
for other in ("index.html", "news-message.html", "news-feature.html"):
    o = (RESULTS / other).read_text(encoding="utf-8")
    o_shell = o[o.index("  <header"): o.index("  <main")]
    t_shell = src[src.index("  <header"): src.index("  <main")]
    ck(f"{other}: header+nav block identical to this page (ignoring aria-current)",
       o_shell.replace(' aria-current="page"', "") == t_shell.replace(' aria-current="page"', ""),
       f"{len(o_shell)}/{len(t_shell)}")
ck("this page's aria-current sits on 新闻评论 self-link only",
   src.count('aria-current="page"') == 1
   and re.search(r'href="news-commentary.html" aria-current="page">新闻评论</a>', src) is not None)
ck("no other page claims the commentary current state",
   all('href="news-commentary.html" aria-current' not in (RESULTS / p).read_text(encoding="utf-8")
       for p in ("index.html", "news-message.html", "news-feature.html")))
for term in ("新闻评价", "厨一枚", "胡桃", "2026", "TODO", "作者：", "评论员：", ".docx", "closing_date", "C01", "C29",
             "<!--", "<time", "datetime", "style=", "data-", "<img", "&nbsp;"):
    ck(f"forbidden {term!r} absent from the page", term not in src, str(src.count(term)))
ck("page sha256 stable & recorded", hashlib.sha256(PAGE.read_bytes()).hexdigest()
   == "a2dbf4aac57472e8a8728f80908dc366d3aa9076310bbb39b24d71f251ea8d52")
ck("Results/ still exactly 5 files", len(list(RESULTS.iterdir())) == 5, str(len(list(RESULTS.iterdir()))))
print(f"\nINDEPENDENT CHECK: {len(fails)} failures")
sys.exit(1 if fails else 0)
