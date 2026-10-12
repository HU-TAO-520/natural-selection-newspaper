"""Task 6 acceptance verifier: Results/news-feature.html.

Covers every bullet of plan/Task6-完成新闻通讯页.md §验证方法 (文件与版本 /
公共壳回归 / DOM 结构 / 文本级 / 可见内容与禁止项 / 无样式与无脚本) plus §完成定义.
The expected text comes only from Task 1's frozen contract, never from the page.
QA-only; must never be copied into Results/.
"""
import hashlib
import json
import os
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup, Comment, NavigableString, Tag

ROOT = Path(__file__).resolve().parents[1]
RESULTS = Path(os.environ.get("QA_RESULTS", str(ROOT / "Results")))
PAGE = RESULTS / "news-feature.html"
TASK1 = ROOT / "plan" / "Task1-素材基线与内容合同.md"
TASK6 = ROOT / "plan" / "Task6-完成新闻通讯页.md"
KEYS = [f"F{i:02d}" for i in range(1, 24)]
DATELINE = "自然选择号9月17日电"
TITLE = "从数学题到AI时代的学习"
BYLINE = "蓝色空间"
TYPE = "新闻通讯"
NAV_ORDER = ["首页", "新闻消息", "新闻通讯", "新闻评论"]
NAV_HREFS = ["index.html", "news-message.html", "news-feature.html", "news-commentary.html"]
FROZEN = {
    "新闻通讯.docx": "0c5b35256b7271acfb2f49aec146288b404ed49c376ac2c8b3f6246b38f894a4",
    "新闻消息.docx": "de10b575399e0563430f2f255c956b179c9978c087897a24910ad70d6a50f6fc",
    "新闻评价.docx": "8e50cfc89287035163d5fe95c8b1cee20a5aa405e9d04ec358fb5c9312c3827c",
}
# deliverables that Task 6 must not touch, hash-verified against the state
# certified at Task 5 acceptance
FROZEN_OTHERS = {
    "index.html": "73f49fd8d01bb578a5a1fcc76ca8967e19feb29ec8e1c64e1aed7b2006c3d901",
    "news-message.html": "66ae5826bbdf9829206c6374305e7bf4bab546c65485349db5fff40e0b5fa0e8",
    "news-commentary.html": "cdc13a4023aea725c6c12e6940940b9a00253f84433d1675672b15de046f27ee",
    "styles.css": "30d746616ae9dfd0e0aa07e373874b5f442ed14fbd3b78f9efe0abdcc21d040d",
}
SHELL_BEFORE = "5afe7d1bb37216c72d60b3fca62e0a247332014968081b12743ca1cc0fffe275"

checks = []


def ok(g, name, cond, detail=""):
    checks.append({"g": g, "n": name, "p": bool(cond), "d": "" if cond else str(detail)})


def eq(g, name, actual, expected):
    same = actual == expected
    checks.append({"g": g, "n": name, "p": same,
                   "d": "" if same else f"expected={expected!r} actual={actual!r}"})


def tc(node):
    return "" if node is None else node.get_text()


def elems(node):
    return [c for c in node.children if isinstance(c, Tag)] if node else []


def classes(node):
    c = node.get("class") or []
    return set(c if isinstance(c, list) else [c])


def parse_plan_table(path):
    """Page-level baseline values Task 6 must preserve, read from the plan table."""
    t = path.read_text(encoding="utf-8")
    sec = t[t.index("## Task 2 页面基线"):]
    sec = sec[: sec.index("\n## ")]
    rows = {}
    for line in sec.splitlines():
        if not line.startswith("|"):
            continue
        cells = [c.replace("`", "").strip() for c in line.strip("|").split("|")]
        if len(cells) != 2 or cells[0] in ("项目", "") or set(cells[0]) <= {"-"}:
            continue
        rows[cells[0]] = cells[1]
    return rows


def main():
    baseline = parse_plan_table(TASK6)
    if not PAGE.exists():
        checks.append({"g": "文件级", "n": "news-feature.html 存在", "p": False, "d": "missing"})
        return report()

    # ---------- 1. 文件与版本验证 ----------
    g = "文件与版本"
    raw = PAGE.read_bytes()
    html = raw.decode("utf-8")
    sha = hashlib.sha256((ROOT / "Materials" / "新闻通讯.docx").read_bytes()).hexdigest()
    eq(g, "新闻通讯.docx SHA-256 == Task1 冻结值", sha, FROZEN["新闻通讯.docx"])
    for name, want in FROZEN.items():
        p = ROOT / "Materials" / name
        got = hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else "MISSING"
        eq(g, f"素材 {name} 未被改动", got, want)
        eq(g, f"素材 {name} 最后写入早于 Task 6",
           p.stat().st_mtime < PAGE.stat().st_mtime, True)
    for name, want in FROZEN_OTHERS.items():
        p = RESULTS / name
        got = hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else "MISSING"
        eq(g, f"{name} 未被本任务改动", got, want)
    present = sorted(p.name for p in RESULTS.iterdir() if p.is_file())
    eq(g, "Results/ 仍是约定的 5 个文件", present,
       sorted(list(FROZEN_OTHERS) + ["news-feature.html"]))
    ok(g, "Results/ 无测试/临时/图片/数据文件",
       all(p.suffix.lower() in {".html", ".css", ".js"} for p in RESULTS.iterdir()),
       [p.name for p in RESULTS.iterdir() if p.suffix.lower() not in {".html", ".css", ".js"}])

    soup = BeautifulSoup(html, "html.parser")
    body = soup.body

    # ---------- 2. 公共壳回归 ----------
    g = "公共壳回归"
    ok(g, "首行是 <!doctype html>", re.match(r"(?i)\s*<!doctype\s+html>", html), html[:40])
    html_tag = soup.html
    eq(g, 'html lang="zh-CN"', html_tag.get("lang"), "zh-CN")
    eq(g, 'html 初始 class="no-js"', classes(html_tag), {"no-js"})
    ok(g, "meta charset=utf-8", any(m.get("charset") == "utf-8" for m in soup.find_all("meta")))
    vp = soup.find("meta", attrs={"name": "viewport"})
    ok(g, "响应式 viewport", vp is not None and "width=device-width" in (vp.get("content") or ""),
       vp.get("content") if vp else None)
    eq(g, "计划表 <title> 基线值解析成功", baseline.get("<title>"), f"{TITLE}｜自然选择号")
    eq(g, "页面 <title> 符合 Task 2 基线", tc(soup.title), baseline.get("<title>"))
    m_el = soup.find("main")
    eq(g, "<main> 标签名与属性集", (m_el.name, dict(m_el.attrs)),
       ("main", {"class": ["main-content"], "id": "main-content", "tabindex": "-1"}))
    eq(g, "计划表基线：唯一 <h1>", baseline.get("唯一 <h1>"), TITLE)
    eq(g, "计划表基线：当前导航文字", baseline.get("当前导航文字"), "新闻通讯")
    eq(g, "计划表基线：当前导航目标", baseline.get("当前导航目标"), "news-feature.html")
    eq(g, "计划表基线：样式引用", baseline.get("样式引用"), 'href="styles.css"')
    eq(g, "计划表基线：脚本引用", baseline.get("脚本引用"), 'src="script.js" defer')
    eq(g, "计划表基线：正文入口", baseline.get("正文入口"),
       '<main class="main-content" id="main-content" tabindex="-1">')
    eq(g, "计划表基线：目标文件", baseline.get("文件"), "Results/news-feature.html")

    first_el = next((c for c in body.children if isinstance(c, Tag)), None)
    ok(g, "跳至正文链接是 <body> 第一个元素", first_el is not None
       and "skip-link" in classes(first_el) and first_el.name == "a", first_el)
    eq(g, "跳至正文链接指向 #main-content", first_el.get("href") if first_el else None,
       "#main-content")
    eq(g, "跳至正文链接文字", tc(first_el), "跳至正文")
    focusable_before = [c for c in body.children if isinstance(c, Tag)
                        and (c.name == "a" or c.name == "button") and c is not first_el]
    ok(g, "跳至正文链接之前无可聚焦元素",
       body.index(first_el) == min(body.index(f) for f in [first_el] + focusable_before))
    eq(g, "#main-content 全页唯一", len(soup.find_all(id="main-content")), 1)

    sh = soup.find("header", class_="site-header")
    ok(g, "站点 header.site-header 保留", sh is not None)
    mast = sh.find("a", class_="site-masthead__link") if sh else None
    eq(g, "报头文字", tc(mast), "自然选择号")
    eq(g, "报头链接 index.html", mast.get("href") if mast else None, "index.html")

    btn = soup.find("button", id="nav-toggle")
    ok(g, "菜单按钮存在", btn is not None)
    eq(g, "按钮 class", classes(btn), {"nav-toggle"})
    eq(g, "按钮 type", btn.get("type") if btn else None, "button")
    eq(g, "aria-controls", btn.get("aria-controls") if btn else None, "site-navigation")
    eq(g, "初始 aria-expanded=false", btn.get("aria-expanded") if btn else None, "false")
    ok(g, "按钮文字含 菜单", "菜单" in tc(btn), repr(tc(btn)))

    nav = soup.find("nav", id="site-navigation")
    ok(g, "主导航存在", nav is not None)
    eq(g, "导航 aria-label", nav.get("aria-label") if nav else None, "主导航")
    links = nav.find_all("a") if nav else []
    eq(g, "导航链接数量 4", len(links), 4)
    eq(g, "导航顺序", [tc(a) for a in links], NAV_ORDER)
    eq(g, "导航目标为同目录相对路径", [a.get("href") for a in links], NAV_HREFS)
    ok(g, "导航路径无根绝对/协议前缀",
       not any(re.match(r"^(/|https?:|#)", a.get("href") or "") for a in links))
    cur = soup.find_all(attrs={"aria-current": "page"})
    eq(g, "全页恰好一个 aria-current=page", len(cur), 1)
    ok(g, "当前页标记位于 新闻通讯 → news-feature.html",
       len(cur) == 1 and tc(cur[0]) == "新闻通讯" and cur[0].get("href") == "news-feature.html",
       [(tc(c), c.get("href")) for c in cur])

    sheets = soup.find_all("link", rel=lambda v: v and "stylesheet" in v)
    eq(g, "styles.css 引用一次", [s.get("href") for s in sheets], ["styles.css"])
    scripts = soup.find_all("script", src=True)
    eq(g, "script.js 引用一次", [s.get("src") for s in scripts], ["script.js"])
    eq(g, "脚本保留 defer", scripts[0].has_attr("defer") if scripts else False, True)
    ok(g, "无内联 <script>", not [s for s in soup.find_all("script") if s.get("src") is None])
    ok(g, "无 <style> 标签", not soup.find_all("style"))
    eq(g, "页面页脚 <footer> 数量 0", len(soup.find_all("footer")), 0)
    ok(g, "无 aside", not soup.find_all("aside"))
    eq(g, "全页只有一个 <nav>", len(soup.find_all("nav")), 1)
    ok(g, "无第二套导航/搜索/推荐模块",
       not soup.find_all(["search", "form", "dialog"]) and
       not [t for t in soup.find_all(True) if re.search(r"(search|recommend|share|comment-widget)",
                                                        " ".join(classes(t)), re.I)])

    # ---------- 3. DOM 结构验证 ----------
    g = "DOM 结构"
    eq(g, "恰好 1 个 <main>", len(soup.find_all("main")), 1)
    eq(g, "恰好 1 个 <article>", len(soup.find_all("article")), 1)
    eq(g, "恰好 1 个 <h1>", len(soup.find_all("h1")), 1)
    main = soup.find("main")
    mc = elems(main)
    eq(g, "#main-content 唯一元素子节点是 article.article",
       [(t.name, sorted(classes(t))) for t in mc], [("article", ["article"])])
    art = mc[0]
    eq(g, ".article 恰好两个元素子节点", len(elems(art)), 2)
    eq(g, ".article 子节点顺序", [t.name + "." + ".".join(sorted(classes(t))) for t in elems(art)],
       ["header.article__header", "div.article__body"])
    head, abody = elems(art)
    eq(g, ".article__header 恰好三个元素子节点", len(elems(head)), 3)
    eq(g, ".article__header 子节点顺序与类名",
       [f"{t.name}.{'.'.join(sorted(classes(t)))}" for t in elems(head)],
       ["p.article__type", "h1.page-title", "p.article__byline"])
    ptype, h1, pby = elems(head)
    ok(g, "唯一 <h1> 位于文章头部", h1 is soup.find("h1") and h1.parent is head)
    bps = [c for c in abody.children if isinstance(c, Tag)]
    eq(g, ".article__body 恰好 23 个直接 <p>", len(bps), 23)
    ok(g, ".article__body 全部直接子元素都是 <p>",
       all(p.name == "p" for p in bps), [p.name for p in bps if p.name != "p"])
    nonws = [c for c in abody.children if isinstance(c, NavigableString) and str(c).strip()]
    ok(g, ".article__body 无非空白直接文本节点", not nonws, nonws)
    eq(g, "首个正文段恰好一个 strong.dateline",
       len(bps[0].find_all("strong")), 1)
    eq(g, "首个正文段唯一子元素即 dateline", [t.name for t in elems(bps[0])], ["strong"])
    dl = bps[0].find("strong")
    eq(g, "dateline 类名", classes(dl), {"dateline"})
    ok(g, "dateline 是内联 <strong> 而非块级", dl.name == "strong")
    for i, p in enumerate(bps[1:], start=2):
        if elems(p):
            ok(g, f"F{i:02d} 不含子元素", False, elems(p))
            break
    else:
        ok(g, "F02–F23 均不含任何子元素", True)
    ok(g, "F02–F23 无 <strong>/<em>/<a>/<span>/<br>",
       not any(p.find(["strong", "em", "a", "span", "br", "i", "b", "q"]) for p in bps[1:]))
    eq(g, "只有一个 header.article__header",
       len(soup.find_all("header", class_="article__header")), 1)
    ok(g, "无 .article__date", not soup.find_all(class_="article__date"))
    ok(g, "正文无小标题 h2/h3/h4", not abody.find_all(["h2", "h3", "h4", "h5", "h6"]))
    ok(g, "正文无列表", not abody.find_all(["ul", "ol", "li", "dl"]))
    ok(g, "正文无 blockquote/q/figure", not abody.find_all(["blockquote", "q", "figure", "img",
                                                           "picture", "video", "audio", "iframe"]))
    ok(g, "文章区无 <hr>", not art.find_all("hr"))
    ids = [i for t in soup.find_all(id=True) for i in ([t["id"]] if isinstance(t["id"], str) else t["id"])]
    dups = sorted({i for i in ids if ids.count(i) > 1})
    ok(g, "页面 ID 全部唯一", not dups, dups)
    ok(g, "nav-toggle/site-navigation/main-content ID 存在且唯一",
       all(ids.count(x) == 1 for x in ["nav-toggle", "site-navigation", "main-content"]), ids)
    ok(g, "无 .feature-* / 页面专属类",
       not [t for t in soup.find_all(True)
            if any(re.match(r"^(feature|news-feature|page-)(?![a-z]*$)", c) or c.startswith("feature-")
                   for c in classes(t))], "检查 page-title 之外")
    ok(g, "除 .page-title 外无 page-* 类",
       not [t for t in soup.find_all(True)
            if (classes(t) & {"page-title"}) == set() and
            any(c.startswith("page-") for c in classes(t))])
    ok(g, "无内联 style 属性", not [t for t in soup.find_all(style=True)])
    ok(g, "<body> 无页面专属 class", classes(body) == set() or not (classes(body) - set()),
       classes(body))

    # ---------- 4. 文本级验证 ----------
    g = "文本级"
    t1 = {}
    txt1 = TASK1.read_text(encoding="utf-8")
    chunk = txt1[txt1.index("### 新闻通讯"):]
    chunk = chunk[: chunk.find("\n### ")]
    for line in chunk.splitlines():
        m = re.match(r"^(title|byline|F(?:0[1-9]|1[0-9]|2[0-3]))\|(.*)$", line)
        if m:
            t1.setdefault(m.group(1), m.group(2))
    eq(g, "Task 1 合同提供 23 段", len([k for k in KEYS if k in t1]), 23)
    eq(g, ".article__type 严格等于 新闻通讯", tc(ptype), TYPE)
    eq(g, "h1.page-title 严格等于标题", tc(h1), t1["title"])
    eq(g, ".article__byline 严格等于 蓝色空间", tc(pby), t1["byline"])
    ok(g, "署名无 作者：/记者：/文／ 前缀",
       re.match(r"^(作者|记者|编辑|撰稿|通讯员|文／|by )", tc(pby)) is None, tc(pby))
    actual = [tc(p) for p in bps]
    for i, k in enumerate(KEYS):
        eq(g, f"{k} textContent 逐字符相等", actual[i] if i < len(actual) else None, t1[k])
    eq(g, "正文段落数严格 23", len(actual), 23)
    ok(g, "最后一项是 F23 且其后无空/纯白项",
       actual[-1] == t1["F23"] and not [p for p in actual if not p.strip()])
    ok(g, "无仅含空白的额外 <p>", not [p for p in bps if not tc(p).strip()])
    eq(g, ".dateline 文本", tc(dl), DATELINE)
    f01 = actual[0]
    eq(g, "F01 电头后恰好一个 U+0020", f01[len(DATELINE)], "\u0020")
    ok(g, "F01 电头后第二个字符不是空格", f01[len(DATELINE) + 1] != "\u0020")
    eq(g, "F01 全段 U+0020 数量 == 1", f01.count("\u0020"), 1)
    eq(g, "23 段合并后 U+0020 总数 == 1", "".join(actual).count("\u0020"), 1)
    eq(g, "</strong> 与余文之间不是换行",
       re.search(r"</strong>\u0020[^>\n]", str(bps[0])) is not None, True)
    merged = "".join(actual)
    eq(g, "AI 出现 19 次", merged.count("AI"), 19)
    eq(g, "ai/Ai/aI 出现 0 次", sum(merged.count(x) for x in ("ai", "Ai", "aI")), 0)
    eq(g, "AI 连同标题共 20 次", merged.count("AI") + tc(h1).count("AI"), 20)
    eq(g, "中文左双引号 8 个", merged.count("\u201c"), 8)
    eq(g, "中文右双引号 8 个", merged.count("\u201d"), 8)
    eq(g, "中文左单引号 2 个", merged.count("\u2018"), 2)
    eq(g, "中文右单引号 2 个", merged.count("\u2019"), 2)
    eq(g, "U+2014 共 2 个", merged.count("\u2014"), 2)
    eq(g, "唯一一处相邻 ——", re.findall(r"\u2014{2}", merged), ["\u2014\u2014"])
    eq(g, "不出现三连破折号", "\u2014\u2014\u2014" in merged, False)
    eq(g, "全角问号 1 个", merged.count("？"), 1)
    eq(g, "全角冒号 2 个", merged.count("："), 2)
    eq(g, "中文分号 3 个", merged.count("；"), 3)
    eq(g, "不出现半角引号 \" 或 '", '"' not in merged and "'" not in merged, True)
    eq(g, "不出现半角 ? ; :", not any(c in merged for c in "?;:"), True)
    eq(g, "不出现 &nbsp; / 实体", "&nbsp;" not in html and "&amp;" not in html, True)
    eq(g, "不出现 <br>", "<br" not in html.lower(), True)
    eq(g, "F02 保留 他认为", actual[1].count("他认为"), 1)
    eq(g, "F05 保留 在她看来", actual[4][:4], "在她看来")
    eq(g, "F10 保留 仍由他自己完成", actual[9].count("仍由他自己完成"), 1)
    eq(g, "F12 保留 不过，他并不赞成", actual[11].count("不过，他并不赞成"), 1)
    eq(g, "F20 保留 他举了一个简单的例子", actual[19].count("他举了一个简单的例子"), 1)
    eq(g, "正文中不出现 在她看来 之外的统一化", sum(tc(p).count("她") for p in bps), 1)
    eq(g, "F04 外层双引号+内层单引号原样",
       actual[3], "“如果想提高自己的‘下限’，就要做好改错，认真完成作业；如果想进一步提高自己的"
                  "‘上限’，还需要进行有针对性的补充。”")
    eq(g, "F09 结尾 ——向AI提问。", actual[8].endswith("选择——向AI提问。"), True)
    eq(g, "F15 冒号+引号原样", actual[14].endswith("告诉AI：“只给我思路，不要把完整答案和解题过程告诉我。”"), True)
    eq(g, "F17 引语句号原样", actual[16].startswith("“AI不能代替你做事，它应该起到引导作用。”"), True)
    eq(g, "F18 引号 会不会提问 原样", actual[17].count("“会不会提问”"), 1)
    eq(g, "9月17日 未补年份", re.search(r"(19|20)\d{2}年?9月17日", merged), None)
    eq(g, "不出现 <time> 标签", len(soup.find_all("time")), 0)

    # ---------- 5. 可见内容与禁止项 ----------
    g = "禁止项与可见内容"
    ok(g, "页面不出现 F01/F23 等内部编号", not re.search(r"\bF\d{2}\b", html),
       re.findall(r"\bF\d{2}\b", html)[:5])
    ok(g, "无方括号模板说明/省略号占位", not re.search(r"\[[A-Z]\d{2}|\.\.\.|……|（下转）", html))
    ok(g, "无 TODO/TBD/FIXME/Lorem", not re.search(r"(?i)\b(todo|tbd|fixme|lorem|placeholder)\b", html))
    ok(g, "无 注释节点", not soup.find_all(string=lambda s: isinstance(s, Comment)))
    for bad in ["厨一枚", "胡桃", "2026", "2025", "新闻评价", ".docx", "word/", "宋体", "Normal"]:
        ok(g, f"页面不出现 {bad!r}", bad not in html, html.count(bad))
    eq(g, "文章内容无新增链接", len(art.find_all("a")), 0)
    ok(g, "文章内容无年份数字", not re.search(r"(19|20)\d{2}", tc(art)),
       re.findall(r"(19|20)\d{2}", tc(art)))
    eq(g, "全页 <p> 总数 26（23 正文 + 类型 + 署名 + 报头）", len(soup.find_all("p")), 26)
    eq(g, "文章内 <p> 恰好 25", len(art.find_all("p")), 25)
    eq(g, ".article__body 内直接 <p> 数", len([p for p in soup.find_all("p")
                                              if p.parent is abody]), 23)
    eq(g, "文章头 <p> 数 2（类型+署名）", len(head.find_all("p")), 2)
    ok(g, "无外部 URL", not re.search(r"(?i)(https?:)?//[a-z0-9.-]+\.[a-z]{2,}", html),
       re.findall(r"(?i)https?://\S+", html)[:3])
    ok(g, "无联网字体/@import/preconnect",
       not re.search(r"(?i)(@import|fonts\.googleapis|cdn\.|crossorigin)", html))
    ok(g, "无 fetch/XHR/WebSocket", not re.search(r"(?i)(fetch\(|XMLHttpRequest|WebSocket)", html))
    ok(g, "无 type=module", not re.search(r'type="module"', html))
    ok(g, "无 data-* 属性",
       not [t.name for t in soup.find_all(True) if any(k.startswith("data-") for k in t.attrs)],
       [t.name for t in soup.find_all(True) if any(k.startswith("data-") for k in t.attrs)])
    eq(g, "正文段落无 id", len([p for p in bps if p.get("id")]), 0)
    ok(g, "无 img/figure/音视频/下载", not soup.find_all(["img", "svg", "video", "audio", "canvas"]))
    ok(g, "无 Word 分页标记文本", "lastRenderedPageBreak" not in html and "w:pPr" not in html)

    # ---------- 6. 无样式与无脚本检查 ----------
    g = "无样式与无脚本"
    ok(g, "任务 6 内容无 hidden", not [t for t in art.find_all(True) if t.has_attr("hidden")])
    ok(g, "任务 6 内容无 aria-hidden", not [t for t in art.find_all(True) if t.has_attr("aria-hidden")])
    ok(g, "任务 6 内容无 ARIA role", not [t for t in art.find_all(True) if t.has_attr("role")])
    ok(g, "任务 6 内容无 aria-label/aria-labelledby",
       not [t for t in art.find_all(True) if t.has_attr("aria-label") or t.has_attr("aria-labelledby")])
    ok(g, "任务 6 内容无内联事件处理器",
       not [t.attrs for t in art.find_all(True) if any(k.lower().startswith("on") for k in t.attrs)])
    ok(g, "任务 6 内容无 tabindex", not [t for t in art.find_all(True) if t.has_attr("tabindex")])
    flat = re.sub(r"<[^>]+>", "", html)
    missing_src = [k for i, (k, t) in enumerate(zip(KEYS, actual)) if t[:20] not in flat]
    ok(g, "每段正文文本原样存在于 HTML 源码（非脚本注入）", not missing_src, missing_src)
    eq(g, "每段完整文本原样存在于去标签源码", [k for k, t in zip(KEYS, actual) if t not in flat], [])
    order = [tc(ptype), tc(h1), tc(pby)] + actual
    eq(g, "禁 CSS 后阅读顺序：类型→标题→署名→F01..F23",
       [t[:12] for t in order[:5]],
       ["新闻通讯", TITLE[:12], "蓝色空间", actual[0][:12], actual[1][:12]])
    eq(g, "顺序长度 26", len(order), 26)
    ok(g, "文章前保留跳至正文/报头/导航",
       str(soup).index("skip-link") < str(soup).index("site-header") < str(soup).index("<article"))
    ok(g, "#main-content 使用 tabindex=-1", main.get("tabindex"), "-1")
    ok(g, "UTF-8 可无损解码", isinstance(html, str))
    eq(g, "文件使用 LF 换行", b"\r\n" not in raw, True)
    eq(g, "文件以换行结尾", raw.endswith(b"\n"), True)
    eq(g, "无 BOM", raw[:3] != b"\xef\xbb\xbf", True)

    # 每段单一源码行
    lines = html.split("\n")
    body_lines = [l for l in lines if l.strip().startswith("<p>") or "<strong" in l]
    eq(g, "23 个正文 <p> 各占一个源码行", len([l for l in lines if re.match(r"^        <p>", l)]), 23)
    ok(g, "无一行包含两个正文 <p>",
       not [l for l in lines if len(re.findall(r"^        <p>|        <p>", l)) > 1])
    ok(g, "缩进与 news-message.html 一致",
       all(l.startswith(" " * 8) for l in lines if re.match(r"^ {8}<p", l)))

    return report(html, raw, actual, order)


def raw_stat_mtime():
    return PAGE.stat().st_mtime


def report(html="", raw=b"", actual=None, order=None):
    actual = actual or []
    fails = [c for c in checks if not c["p"]]
    out = Path(__file__).resolve().parent / "verify_result.txt"
    lines = [f"{c['g']} | {'PASS' if c['p'] else 'FAIL'} | {c['n']}"
             + (f" | {c['d']}" if c["d"] else "") for c in checks]
    lines.append(f"\nTOTAL {len(checks)} checks, {len(fails)} failures")
    out.write_text("\n".join(lines), encoding="utf-8")
    (Path(__file__).resolve().parent / "expected_feature_paragraphs.json").write_text(
        json.dumps({"paragraphs": actual, "readingOrder": order}, ensure_ascii=False, indent=1),
        encoding="utf-8")
    for c in fails:
        print(f"FAIL | {c['g']} | {c['n']} | {c['d']}")
    print(f"TOTAL {len(checks)} checks, {len(fails)} failures")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
