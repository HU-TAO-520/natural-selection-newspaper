"""Task 7 acceptance verifier for Results/news-commentary.html.

Expected text always comes from the Task 1 contract (content authority), never
from the page itself. Compares raw textContent without trim()/normalisation,
then checks structure, Task 2 shell, style interface, forbidden items and file
scope. QA-only.

Usage:  python _qa_task7/verify.py            # verify Results/
        QA_RESULTS=_qa_task7/mut/<dir> python _qa_task7/verify.py   # mutated copy
"""
import hashlib
import os
import re
import sys
from pathlib import Path

import bs4

ROOT = Path(__file__).resolve().parents[1]
TASK1 = ROOT / "plan" / "Task1-素材基线与内容合同.md"
RESULTS = Path(os.environ.get("QA_RESULTS", ROOT / "Results"))
PAGE = RESULTS / "news-commentary.html"
SIBLINGS = {
    "index.html": "73f49fd8d01bb578a5a1fcc76ca8967e19feb29ec8e1c64e1aed7b2006c3d901",
    "news-message.html": "66ae5826bbdf9829206c6374305e7bf4bab546c65485349db5fff40e0b5fa0e8",
    "news-feature.html": "73ff75678c453badbc1edcb1ff590001dc93cade3260ff364e042d02075df9a5",
    "styles.css": "30d746616ae9dfd0e0aa07e373874b5f442ed14fbd3b78f9efe0abdcc21d040d",
}
MATERIALS = {
    "新闻消息.docx": ("DE10B575399E0563430F2F255C956B179C9978C087897A24910AD70D6A50F6FC", 14742),
    "新闻通讯.docx": ("0C5B35256B7271ACFB2F49AEC146288B404ED49C376AC2C8B3F6246B38F894A4", 17155),
    "新闻评价.docx": ("8E50CFC89287035163D5FE95C8B1CEE20A5AA405E9D04EC358FB5C9312C3827C", 20014),
}
TYPE = "新闻评论"
KEYS = [f"C{i:02d}" for i in range(1, 30)]
NAV = [("首页", "index.html"), ("新闻消息", "news-message.html"),
       ("新闻通讯", "news-feature.html"), ("新闻评论", "news-commentary.html")]

failures = []
log = []


def check(name, ok, detail=""):
    log.append(f"{'PASS' if ok else 'FAIL'} | {name}{(' | ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


# --- contract ---------------------------------------------------------------
txt = TASK1.read_text(encoding="utf-8")
chunk = txt[txt.index("### 新闻评论"):]
chunk = chunk[: chunk.find("\n### ")]
contract = {}
for line in chunk.splitlines():
    m = re.match(r"^(title|byline|closing_date|C(?:0[1-9]|1[0-9]|2[0-9]))\|(.*)$", line)
    if m:
        contract.setdefault(m.group(1), m.group(2))
assert all(k in contract for k in ["title", "byline", "closing_date"] + KEYS), "Task 1 broke"
TITLE, BYLINE, DATE = contract["title"], contract["byline"], contract["closing_date"]
BODY = [contract[k] for k in KEYS]

src_bytes = PAGE.read_bytes()
src = src_bytes.decode("utf-8")  # raises if not valid UTF-8
soup = bs4.BeautifulSoup(src, "html.parser")

# --- 1. file-level scope ----------------------------------------------------
check("Results/ holds exactly the 5 agreed files",
      sorted(p.name for p in RESULTS.iterdir()) == sorted(list(SIBLINGS) + ["news-commentary.html"]),
      str(sorted(p.name for p in RESULTS.iterdir())))
for name, want in SIBLINGS.items():
    got = hashlib.sha256((RESULTS / name).read_bytes()).hexdigest()
    check(f"{name} untouched by Task 7", got == want, got[:16])
for name, (want, size) in MATERIALS.items():
    p = ROOT / "Materials" / name
    got = hashlib.sha256(p.read_bytes()).hexdigest().upper()
    check(f"Materials/{name} hash+size intact", got == want and p.stat().st_size == size, got[:16])
check("page is UTF-8 without BOM", not src_bytes.startswith(b"\xef\xbb\xbf"))
check("page uses LF newlines only", b"\r" not in src_bytes)
check("page ends with a single newline", src.endswith("\n") and not src.endswith("\n\n"))
check("page declares charset utf-8", '<meta charset="utf-8">' in src)

# --- 2. Task 2 public shell regression -------------------------------------
check("<html lang=zh-CN class=no-js>",
      re.search(r'<html lang="zh-CN" class="no-js">', src) is not None)
check("<title> exact with full-width bar",
      soup.title is not None and soup.title.string == f"{TITLE}｜自然选择号", repr(soup.title.string if soup.title else None))
check("styles.css referenced exactly once", len(soup.find_all("link", rel="stylesheet")) == 1
      and soup.find("link", rel="stylesheet")["href"] == "styles.css")
script = soup.find("script", src="script.js")
check("script.js referenced once with defer and no inline handler",
      len(soup.find_all("script", src=True)) == 1 and script is not None
      and script.has_attr("defer") and not any(s.string and s.string.strip() for s in soup.find_all("script")))
check("no inline event attributes", not re.search(r"\son[a-z]+\s*=", src))
check("skip-link is first focusable and targets #main-content",
      re.search(r'<body>\s*<a class="skip-link" href="#main-content">跳至正文</a>', src) is not None)
check("masthead links to index.html",
      str(soup.select_one(".site-masthead__link").get_text()) == "自然选择号"
      and soup.select_one(".site-masthead__link")["href"] == "index.html")
btn = soup.select_one("button#nav-toggle.nav-toggle")
check("nav button id/class/type/aria intact",
      btn is not None and btn["type"] == "button" and btn["aria-controls"] == "site-navigation"
      and btn["aria-expanded"] == "false")
nav = soup.select_one("nav#site-navigation.site-navigation")
check("nav id/class/aria-label", nav is not None and nav["aria-label"] == "主导航")
check("nav source has no hidden/aria-hidden/is-open",
      not re.search(r"hidden|is-open", src[src.index("<nav"): src.index("</nav>")]))
links = soup.select("#site-navigation a")
check("four nav links, text and order",
      [(a.get_text(), a["href"]) for a in links] == NAV, str([(a.get_text(), a["href"]) for a in links]))
cur = soup.select('[aria-current="page"]')
check("exactly one aria-current, on the commentary self-link",
      len(cur) == 1 and cur[0]["href"] == "news-commentary.html" and cur[0].get_text() == TYPE,
      str([(c["href"], c.get_text()) for c in cur]))
check("masthead link carries no aria-current", "aria-current" not in str(soup.select_one(".site-masthead")))
main = soup.find("main")
check("single main with id/class/tabindex",
      str(soup).count("<main") == 1 and main["id"] == "main-content"
      and main["class"] == ["main-content"] and main["tabindex"] == "-1")

# --- 3. DOM counts and order ------------------------------------------------
art = main.find_all("article", recursive=False)
check("main has exactly one element child: article.article",
      len(main.find_all(recursive=False)) == 1 and len(art) == 1 and art[0]["class"] == ["article"],
      str([getattr(n, "name", "#text") for n in main.find_all(recursive=False)]))
art = art[0]
kids = art.find_all(recursive=False)
check("article children order = header, div, p.article__date",
      [f"{n.name}.{'.'.join(n['class'])}" for n in kids] == ["header.article__header", "div.article__body", "p.article__date"],
      str([f"{n.name}.{'.'.join(n.get('class', []))}" for n in kids]))
hdr = kids[0]
hkids = hdr.find_all(recursive=False)
check("header children order = type, h1.page-title, byline",
      [f"{n.name}.{'.'.join(n['class'])}" for n in hkids] == ["p.article__type", "h1.page-title", "p.article__byline"],
      str([f"{n.name}.{'.'.join(n.get('class', []))}" for n in hkids]))
check("counts: 1 article/1 header/1 type/1 h1/1 byline/1 body/1 date",
      len(soup.select("article.article")) == 1 and len(soup.select(".article__header")) == 1
      and len(soup.select(".article__type")) == 1 and len(soup.find_all("h1")) == 1
      and len(soup.find_all("h1", class_="page-title")) == 1 and len(soup.select(".article__byline")) == 1
      and len(soup.select(".article__body")) == 1 and len(soup.select("p.article__date")) == 1)
body_div = soup.select_one(".article__body")
body_p = body_div.find_all("p", recursive=False)
check("body has exactly 29 direct <p> and nothing else",
      len(body_p) == 29 and len(body_div.find_all(recursive=False)) == 29,
      f"{len(body_p)} / {len(body_div.find_all(recursive=False))}")
check("each body <p> carries no class and no element children",
      all(not p.get("class") and not p.find_all(recursive=False) for p in body_p))
check("date <p> is outside the body container and follows it directly",
      soup.select_one("p.article__date") not in body_p
      and kids[-1] is soup.select_one("p.article__date")
      and soup.select_one("p.article__date").find_previous_sibling() is body_div)
check("no .dateline / time / blockquote / q / cite / h2 / lists / img / a in the article",
      not art.select(".dateline, time, blockquote, q, cite, h2, ul, ol, li, img, a, table, figure, button, input"))
check("whole page: no <time>, no datetime attribute, no <img>",
      not soup.find_all("time") and "datetime" not in src and not soup.find_all("img"))
check("no <section>/<aside>/<details>/<template>/<noscript> in main",
      not main.find_all(["section", "aside", "details", "summary", "template", "noscript"]))
check("no footer on the page", not soup.find_all("footer", class_="article__footer") and str(soup).count("<footer") == 0)

# --- 4. character-level text ------------------------------------------------
def tc(node):
    return node.get_text()


check("type textContent === 新闻评论", tc(soup.select_one(".article__type")) == TYPE,
      repr(tc(soup.select_one(".article__type"))))
check("h1 textContent === title", tc(soup.select_one("h1.page-title")) == TITLE, repr(tc(soup.select_one("h1.page-title"))))
check("byline textContent === 蓝色空间", tc(soup.select_one(".article__byline")) == BYLINE,
      repr(tc(soup.select_one(".article__byline"))))
check("date textContent === （自然选择号9月18日）", tc(soup.select_one("p.article__date")) == DATE,
      repr(tc(soup.select_one("p.article__date"))))
got = [tc(p) for p in body_p]
check("29 paragraphs identical to Task 1 C01-C29 (no trim, no normalisation)", got == BODY,
      "first index diff at " + str(next((i for i in range(29) if got[i] != BODY[i]), "none")))
check("no paragraph carries leading/trailing whitespace",
      all(p == p.strip() for p in got), str([i for i, p in enumerate(got) if p != p.strip()]))
check("no paragraph contains newline / double space / nbsp / zero width",
      not any(("\n" in p or "  " in p or "\u00a0" in p or re.search(r"[\u200b-\u200f\ufeff\u00ad]", p)) for p in got))
check("entity escaping round-trips to identical textContent (no & present)",
      "&" not in "".join(got) and "&" not in src[src.index("<main"): src.index("</main>")])
raw = re.findall(r"(?m)^        <p>(.*?)</p>$", src)
check("source: 29 single-line <p> matching the contract exactly", raw == BODY, f"matched {len(raw)}")
check("date on a single source line", re.search(
    r'(?m)^      <p class="article__date">（自然选择号9月18日）</p>$', src) is not None)
check("total public units = 33 (1 type + 1 title + 1 byline + 29 body + 1 date)",
      1 + 1 + 1 + len(got) + 1 == 33)

# --- 5. high-risk characters ------------------------------------------------
merged = "".join(got)
check("body .exe exactly 3, no 。exe / bare exe / Windows10",
      merged.count(".exe") == 3 and merged.count("。exe") == 0
      and merged.count("exe") == 3 and merged.count("Windows10") == 0)
check("Windows 10 twice with one U+0020 each", merged.count("Windows 10") == 2
      and len(re.findall(r"Windows\s+10", merged)) == 2)
check("body U+0020 total == 2", merged.count("\u0020") == 2, str(merged.count("\u0020")))
check("no 安 装 anywhere on the page", "安 装" not in src and src.count("安装") >= 6)
check("86英寸 / 同窗AI大屏 kept", "86英寸" in got[0] and "“同窗AI大屏”" in got[0] and "86 英寸" not in merged)
check("term casing preserved (USB/UOS/OPS/Linux/4K/AI counts)",
      merged.count("USB") == 4 and merged.count("UOS") == 4 and merged.count("OPS") == 1
      and merged.count("Linux") == 1 and merged.count("4K") == 1 and merged.count("AI") == 1)
low = [t for t in ("usb", "uos", "ops", "linux", "4k", "ai") if re.search(r"(?<![A-Za-z])" + t, merged)]
check("no lowercase variant of a capitalised term", low == [], str(low))
check("C05 keeps 不完全统计 / 5次碰撞 / 3个U盘被撞坏 / 还需要进一步检查",
      all(s in got[4] for s in ("不完全统计", "5次碰撞", "3个U盘被撞坏", "还需要进一步检查")))
check("C05 is one paragraph of 138 chars", len(got[4]) == 138, str(len(got[4])))
check("C12 is one paragraph of 167 chars", len(got[11]) == 167, str(len(got[11])))
check("C20 comparison stays one paragraph of 126 chars", len(got[19]) == 126, str(len(got[19])))
check("C21 keeps 科大讯飞 as plain text and 4K显示", "科大讯飞" in got[20] and "4K显示" in got[20])
check("C26 is one plain paragraph of 163 chars with 连续 安装", len(got[25]) == 163 and "统一安装" in got[25])
check("C29 = title echo + quote in one paragraph of 36 chars", got[28] == BODY[28] and len(got[28]) == 36)
check("quotes are full-width curly, no straight quotes in the body",
      merged.count("\u201c") == 5 and merged.count("\u201d") == 5 and '"' not in merged and "'" not in merged)
check("no Arabic year / no 2026 anywhere", not re.search(r"20\d\d", merged + DATE + TITLE))
check("date has no year and uses full-width brackets",
      DATE.startswith("（") and DATE.endswith("）") and "9月18日" in DATE and not re.search(r"\d{4}", DATE))

# --- 6. whitelist of visible text in <main> --------------------------------
def visible_units(node):
    return [el.get_text().strip() for el in node.find_all(True)
            if not el.find_all(recursive=False) and el.get_text().strip()]


whitelist = [TYPE, TITLE, BYLINE] + BODY + [DATE]
seen = visible_units(main)
check("main visible units == the 33-item whitelist in order", seen == whitelist,
      f"{len(seen)} units, first diff at " +
      str(next((i for i in range(min(len(seen), 33)) if seen[i] != whitelist[i]), "length")))
check("no paragraph numbering / internal ids visible",
      not re.search(r"C\d{2}|closing_date|新闻评价|Materials|\.docx", src))

# --- 7. style interface contract -------------------------------------------
check("page uses only the shared classes",
      set(re.findall(r'class="([^"]+)"', src)) <= {
          "no-js", "skip-link", "site-header", "site-header__inner", "site-masthead",
          "site-masthead__link", "nav-toggle", "nav-toggle__icon", "nav-toggle__text",
          "site-navigation", "site-navigation__list", "site-navigation__item",
          "site-navigation__link", "main-content", "article", "article__header",
          "article__type", "page-title", "article__byline", "article__body", "article__date"},
      str(set(re.findall(r'class="([^"]+)"', src))))
check("no page-specific class names",
      not re.search(r"commentary-|news-commentary-|evaluation-|article-title|comment-|__note", src))
check("no inline style / <style> / data-* / id outside the shell contract",
      "style=" not in src and "<style" not in src and "data-" not in src
      and set(re.findall(r'\bid="([^"]+)"', src)) == {"nav-toggle", "site-navigation", "main-content"})
check("no align attribute / nbsp used to push the date",
      "align=" not in src and "&nbsp;" not in src and "\u00a0" not in src)
css = (ROOT / "Results" / "styles.css").read_text(encoding="utf-8")
check("shared CSS already styles .article__date (right alignment lives in Task 3)",
      re.search(r"\.article__date\s*\{[^}]*text-align:\s*right", css) is not None,
      re.search(r"\.article__date\s*\{[^}]*\}", css).group(0).replace("\n", " ")[:120]
      if re.search(r"\.article__date\s*\{[^}]*\}", css) else "missing")
for sel in (".article", ".article__header", ".article__type", ".article__byline",
            ".article__body", ".page-title"):
    check(f"shared CSS defines {sel}", sel in css)

# --- 8. forbidden scan over all of Results/ --------------------------------
blob = "".join(p.read_text(encoding="utf-8") for p in RESULTS.glob("*.html")) + css
for term in ("厨一枚", "胡桃", "新闻评价", "TODO", "TBD", "Lorem ipsum", "待补充", "待核验",
             "作者：", "记者：", "评论员：", "来源：", "出处：", "Materials/", ".docx",
             "8E50CFC8", "DE10B575", "0C5B3525", "2026-09", "window.__", "placeholder"):
    check(f"forbidden {term!r} count 0 in Results/", blob.count(term) == 0, str(blob.count(term)))
check("no HTML comment anywhere in Results/*.html",
      not any(re.search(r"<!--", p.read_text(encoding="utf-8")) for p in RESULTS.glob("*.html")))
check("no external URL / protocol-relative / absolute path reference",
      not re.search(r'(?:src|href)="(?:https?:|//|/)', blob))
check("no fetch/XHR/import/require in the page", not re.search(r"fetch\(|XMLHttpRequest|import\(|require\(", src))
check("article and its subtree carry no role / aria-label overrides",
      art.get("role") is None and art.get("aria-label") is None
      and not art.find_all(attrs={"role": True}) and not art.find_all(attrs={"aria-label": True}),
      str(art.attrs))
check("no aria-roledescription / aria-hidden / aria-live inside main",
      not main.find_all(attrs={"aria-hidden": True}) and not main.find_all(attrs={"aria-live": True})
      and "aria-roledescription" not in src and "aria-labelledby" not in src)

# --- 9. static content (no script dependency) -------------------------------
check("all 29 paragraphs are static markup in the file bytes",
      src.count("<p>") == 29 and "article__body" in src_bytes.decode("utf-8"))
check("content does not depend on script.js existing",
      all(p in src for p in (BODY[0][:20], BODY[28][-20:])))
snap = (ROOT / "_qa_task7" / "before.html").read_text(encoding="utf-8")
check("before/after differ only inside <main>",
      snap[: snap.index("  <main")] == src[: src.index("  <main")]
      and snap[snap.index("</main>"):] == src[src.index("</main>"):])
check("before.html snapshot is the Task 2 shell (h1 directly in main, 1829 bytes)",
      len(snap.encode("utf-8")) == 1829
      and hashlib.sha256(snap.encode("utf-8")).hexdigest()
      == "cdc13a4023aea725c6c12e6940940b9a00253f84433d1675672b15de046f27ee",
      f"{len(snap.encode('utf-8'))} bytes")

out = "\n".join(log) + "\n"
(ROOT / "_qa_task7" / "verify_result.txt").write_text(out, encoding="utf-8")
print("\n".join([l for l in log if l.startswith("FAIL")] or ["ALL CHECKS PASS"]))
print(f"{len(log)} checks, {len(failures)} failures")
sys.exit(1 if failures else 0)
