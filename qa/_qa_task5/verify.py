"""Task 5 acceptance: static + DOM verification of Results/news-message.html.

Covers plan sections 验证方法 1-7 and 完成定义. FAILs instead of raising so the
mutation harness can measure capture rate. QA-only.
"""
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

from bs4 import BeautifulSoup, Comment, NavigableString, Tag

ROOT = Path(__file__).resolve().parents[1]
PLAN5 = ROOT / "plan" / "Task5-完成新闻消息页.md"
PLAN1 = ROOT / "plan" / "Task1-素材基线与内容合同.md"
RESULTS = Path(os.environ.get("QA_RESULTS", str(ROOT / "Results")))
PAGE = RESULTS / "news-message.html"
DOCX = ROOT / "Materials" / "新闻消息.docx"
FROZEN_SHA = "de10b575399e0563430f2f255c956b179c9978c087897a24910ad70d6a50f6fc"
OTHER_FILES = ["index.html", "news-feature.html", "news-commentary.html", "styles.css"]
BASELINE_HASHES = {
    "Results/index.html": "73f49fd8d01bb578a5a1fcc76ca8967e19feb29ec8e1c64e1aed7b2006c3d901",
    "Results/news-commentary.html": "cdc13a4023aea725c6c12e6940940b9a00253f84433d1675672b15de046f27ee",
    "Results/news-feature.html": "5afe7d1bb37216c72d60b3fca62e0a247332014968081b12743ca1cc0fffe275",
    "Results/styles.css": "30d746616ae9dfd0e0aa07e373874b5f442ed14fbd3b78f9efe0abdcc21d040d",
}
DATELINE = "自然选择号9月18日7时电"

checks = []


def ok(group, name, cond, detail=""):
    checks.append({"group": group, "name": name, "pass": bool(cond), "detail": detail})


def eq(group, name, actual, expected):
    same = actual == expected
    checks.append(
        {
            "group": group,
            "name": name,
            "pass": same,
            "detail": "" if same else f"expected={expected!r} actual={actual!r}",
        }
    )


def contract(path):
    out = {}
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        return out, str(exc)
    for line in text.splitlines():
        m = re.match(r"^(type|title|byline|M0[1-4])\|(.+)$", line)
        if m and m.group(1) not in out:
            out[m.group(1)] = m.group(2)
    return out, None


def main():
    # ---- Task 5.1 / 验证方法 1: file level -------------------------------
    g = "文件级"
    sha = hashlib.sha256(DOCX.read_bytes()).hexdigest() if DOCX.exists() else ""
    eq(g, "docx SHA-256 == Task1 冻结值", sha, FROZEN_SHA)
    for rel, want in BASELINE_HASHES.items():
        p = ROOT / rel
        got = hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else "MISSING"
        eq(g, f"{rel} 未被本任务改动", got, want)
    present = sorted(p.name for p in RESULTS.iterdir() if p.is_file())
    eq(
        g,
        "Results/ 文件集合固定为 5 个已约定文件",
        present,
        sorted(OTHER_FILES + ["news-message.html"]),
    )
    html = PAGE.read_text(encoding="utf-8") if PAGE.exists() else ""
    ok(g, "news-message.html 存在且非空", len(html) > 0)

    # ---- authoritative contract cross-check (Task1 vs Task5) -------------
    c5, e5 = contract(PLAN5)
    c1, e1 = contract(PLAN1)
    g = "合同一致性"
    ok(g, "Task5 合同可解析（7 字段）", not e5 and len(c5) == 7, str(e5))
    ok(g, "Task1 合同可解析（title/byline/M01–M04）", not e1 and len(c1) == 6, f"{str(e1)} keys={sorted(c1)}")
    for k in ("title", "byline", "M01", "M02", "M03", "M04"):
        eq(g, f"Task1[{k}] == Task5[{k}]", c1.get(k), c5.get(k))
    if not c5:
        report()
        return

    # ---- Task 5.2 / 验证方法 2: public shell regression ------------------
    g = "公共壳"
    soup = BeautifulSoup(html, "html.parser") if html else None
    if soup is None:
        report()
        return
    html_tag = soup.find("html")
    eq(g, '<html lang="zh-CN">', html_tag.get("lang") if html_tag else None, "zh-CN")
    eq(g, '<html class="no-js">', html_tag.get("class") if html_tag else None, ["no-js"])
    ok(g, "UTF-8 meta", bool(soup.find("meta", attrs={"charset": re.compile("^utf-8$", re.I)})))
    vp = soup.find("meta", attrs={"name": "viewport"})
    eq(g, "响应式 viewport", vp.get("content") if vp else None, "width=device-width, initial-scale=1")
    title = soup.find("title")
    eq(g, "<title> 全角｜分隔", title.get_text() if title else None, "我校启动校本课程志愿填报｜自然选择号")
    links = soup.find_all("link", rel=lambda v: v and "stylesheet" in v)
    eq(g, "styles.css 恰好引用一次", [l.get("href") for l in links], ["styles.css"])
    scripts = soup.find_all("script", src=True)
    eq(g, "script.js 恰好引用一次", [s.get("src") for s in scripts], ["script.js"])
    ok(g, "script.js 带 defer", scripts and scripts[0].has_attr("defer"))
    ok(g, "无内联 <script> 文本", not any(s.get_text().strip() for s in soup.find_all("script")))
    ok(g, "无内联 style 属性", not any(t.has_attr("style") for t in soup.find_all(True)))
    ok(g, "无 <style> 标签", not soup.find_all("style"))
    ok(g, "无内联事件 on* 属性", not [t for t in soup.find_all(True) if any(k.startswith("on") for k in t.attrs)])

    body = soup.body
    focusables = [
        t for t in body.find_all(["a", "button", "input", "select", "textarea", "summary"])
        if not (t.name == "a" and not t.get("href")) and not t.has_attr("disabled")
    ]
    ok(
        g,
        ".skip-link 是 body 中第一个可聚焦元素且指向 #main-content",
        focusables
        and focusables[0].name == "a"
        and "skip-link" in (focusables[0].get("class") or [])
        and focusables[0].get("href") == "#main-content",
        focusables[0].name if focusables else "none",
    )
    eq(g, "跳至正文文字", focusables[0].get_text() if focusables else None, "跳至正文")
    mast = soup.select_one(".site-masthead__link")
    eq(g, "报头链接 href", mast.get("href") if mast else None, "index.html")
    eq(g, "报头文字", mast.get_text() if mast else None, "自然选择号")
    ok(g, "站点报头仍是唯一 .site-header", len(soup.select(".site-header")) == 1)
    btn = soup.select_one("#nav-toggle")
    eq(g, "菜单按钮 type=button", btn.get("type") if btn else None, "button")
    eq(g, "aria-controls", btn.get("aria-controls") if btn else None, "site-navigation")
    eq(g, "aria-expanded=false", btn.get("aria-expanded") if btn else None, "false")
    nav = soup.select_one("#site-navigation")
    ok(g, "#site-navigation 存在", nav is not None)
    nav_html_tag_str = str(nav.attrs) if nav else ""
    ok(
        g,
        "导航自身属性不含 hidden/aria-hidden/is-open",
        nav is not None and not re.search(r"hidden|is-open", nav_html_tag_str, re.I),
        nav_html_tag_str,
    )
    ok(g, "导航源码不含 hidden/is-open", not re.search(r"hidden|is-open", html.partition('id="site-navigation"')[2].partition("</nav>")[0]))
    items = nav.select(".site-navigation__link") if nav else []
    eq(g, "四项导航文字顺序", [a.get_text() for a in items], ["首页", "新闻消息", "新闻通讯", "新闻评论"])
    eq(
        g,
        "四项导航 href 顺序",
        [a.get("href") for a in items],
        ["index.html", "news-message.html", "news-feature.html", "news-commentary.html"],
    )
    current = soup.select('[aria-current="page"]')
    eq(g, "全页恰好一个 aria-current=page", len(current), 1)
    ok(
        g,
        "当前项位于 news-message.html",
        current
        and current[0].get("href") == "news-message.html"
        and current[0].get_text() == "新闻消息",
    )
    others = [a for a in [mast] + items if a is not None and a is not (current[0] if current else None)]
    ok(g, "报头与其他导航项无 aria-current", current and not any(a.has_attr("aria-current") for a in others))
    main_el = soup.find("main")
    mains = soup.find_all("main")
    eq(g, "<main> 数量", len(mains), 1)
    eq(g, "main id/class", (main_el.get("id"), main_el.get("class")) if main_el else None, ("main-content", ["main-content"]))
    eq(g, 'main tabindex="-1"', main_el.get("tabindex") if main_el else None, "-1")
    ids = [i for i in (t.get("id") for t in soup.find_all(True) if t.get("id"))]
    eq(g, "无重复 ID", sorted(ids), sorted(set(ids)))

    # ---- Task 5.3/5.7 / 验证方法 3: DOM counts and order -----------------
    g = "DOM 结构"
    eq(g, "<h1> 数量", len(soup.find_all("h1")), 1)
    eq(g, "h1.page-title 数量", len(soup.select("h1.page-title")), 1)
    article = main_el
    kids = [c for c in main_el.children if isinstance(c, Tag)]
    eq(g, "main 唯一直接元素子节点是 article.article", [(k.name, k.get("class")) for k in kids], [("article", ["article"])] if kids else [("none", None)])
    art = kids[0] if kids and kids[0].name == "article" else None
    eq(g, ".article 数量", len(soup.select(".article")), 1)
    akids = [c for c in art.children if isinstance(c, Tag)] if art else []
    eq(
        g,
        "article 直接子级 = header + div",
        [(k.name, k.get("class")) for k in akids],
        [("header", ["article__header"]), ("div", ["article__body"])],
    )
    hdr = akids[0] if akids else None
    hkids = [c for c in hdr.children if isinstance(c, Tag)] if hdr else []
    eq(
        g,
        "article__header 直接子级顺序",
        [(k.name, k.get("class")) for k in hkids],
        [("p", ["article__type"]), ("h1", ["page-title"]), ("p", ["article__byline"])],
    )
    eq(g, "文章头部直接元素子节点数 == 3", len(hkids), 3)
    bdy = akids[1] if len(akids) > 1 else None
    bkids = [c for c in bdy.children if isinstance(c, Tag)] if bdy else []
    eq(g, ".article__body 数量", len(soup.select(".article__body")), 1)
    eq(g, "正文容器只有 4 个 <p>", [k.name for k in bkids], ["p"] * 4)
    eq(g, "正文容器无单独 class 的段落", all(not k.get("class") for k in bkids), True)
    dl = soup.select("strong.dateline")
    eq(g, "strong.dateline 数量", len(dl), 1)
    eq(g, "正文 <strong> 总数 1", len(bdy.find_all("strong")) if bdy else 0, 1)
    ok(
        g,
        "dateline 位于第一个正文段落起始",
        dl and dl[0].parent is bkids[0] and next(c for c in bkids[0].children) is dl[0]
        if bkids
        else False,
    )
    eq(g, "无 .article__date", len(soup.select(".article__date")), 0)
    for sel, label in [
        ("time", "<time>"),
        ("blockquote", "<blockquote>"),
        ("main h2", "正文 <h2>"),
        ("main ul", "列表 <ul>"),
        ("main ol", "列表 <ol>"),
        ("main li", "列表 <li>"),
        ("main img", "图片"),
        ("main a", "正文链接"),
        ("main svg", "svg"),
        ("main iframe", "iframe"),
        ("main h3, main h4, main h5, main h6", "其他标题级别"),
        ("main section", "<section>"),
        ("main aside", "<aside>"),
        ("main details", "<details>"),
        ("main figure", "<figure>"),
        ("main table", "<table>"),
        ("main br", "<br>"),
        ("[role]", "role 属性"),
        ("[data-M01], [data-paragraph]", "段落编号属性"),
        ("main .article-title", ".article-title"),
    ]:
        eq(g, f"0 个 {label}", len(soup.select(sel)), 0)
    ok(g, "除 .page-title 外无其他 .page-title", len(soup.select(".page-title")) == 1)
    eq(g, "无 HTML 注释", len([c for c in soup.find_all(string=lambda s: isinstance(s, Comment))]), 0)

    # ---- Task 5.6 / 验证方法 4: char-exact text --------------------------
    g = "逐字符文本"
    t_el = soup.select_one(".article__type")
    h1 = soup.select_one("h1.page-title")
    by = soup.select_one(".article__byline")
    eq(g, ".article__type", t_el.get_text() if t_el else None, c5["type"])
    eq(g, "h1.page-title", h1.get_text() if h1 else None, c5["title"])
    eq(g, ".article__byline", by.get_text() if by else None, c5["byline"])
    actual_paras = [p.get_text() for p in bkids]
    expected = [c5["M01"], c5["M02"], c5["M03"], c5["M04"]]
    eq(g, "四段 textContent 数组", actual_paras, expected)
    for i, (a, e) in enumerate(zip(actual_paras, expected), 1):
        eq(g, f"M0{i} 严格相等（无 trim/归一化）", a, e)
        if a != e:
            for j, (ca, ce) in enumerate(zip(a, e)):
                if ca != ce:
                    checks[-1]["detail"] += f" 首个差异 @char{j}: {ca!r}(U+{ord(ca):04X}) vs {ce!r}(U+{ord(ce):04X})"
                    break
    for p in bkids:
        txt = p.get_text()
        ok(g, f"段落{bkids.index(p)+1} 无前导/尾随空白", txt == txt.strip() or not txt)
    ok(g, "首段以“自然选择号”开始", actual_paras and actual_paras[0].startswith("自然选择号"))
    ok(g, "末段以“。”结束且无尾随空白", actual_paras and actual_paras[3] == "目前，校本课程志愿填报工作正在进行中。")

    # ---- Task 5.5 / 验证方法 5: M01 inline boundary ---------------------
    g = "电头边界"
    if bkids:
        children = list(bkids[0].children)
        first = children[0] if children else None
        is_strong = isinstance(first, Tag) and first.name == "strong"
        ok(g, "第一个子节点是 strong.dateline", is_strong and "dateline" in (first.get("class") or []))
        eq(g, "strong textContent", first.get_text() if is_strong else None, DATELINE)
        eq(g, "电头 13 个可见字符", len(first.get_text()) if is_strong else 0, 13)
        eq(g, "strong class 只有 dateline", first.get("class") if is_strong else None, ["dateline"])
        ok(g, "strong 内无尾随空格", is_strong and not first.get_text().endswith(" "))
        nxt = children[1] if len(children) > 1 else None
        ok(g, "strong 的下一个同级是文本节点", isinstance(nxt, NavigableString))
        if isinstance(nxt, NavigableString):
            s = str(nxt)
            eq(g, "文本节点首字符 U+0020", hex(ord(s[0])) if s else None, hex(0x20))
            eq(g, "文本节点第二字符“我”", s[1] if len(s) > 1 else None, "我")
            eq(g, "电头后只有一个连续空格", re.match(r"^\u0020(?! )", s) is not None, True)
        eq(g, "段落子节点数 = strong + 文本", len(children), 2)
        ok(g, "首段无 <br>/&nbsp;", "<br" not in str(bkids[0]) and "\xa0" not in bkids[0].get_text())
    ok(g, "源码中 </strong> 后紧跟一个半角空格再“我”", re.search(r"</strong> 我校", html) is not None)
    ok(g, "源码 </p> 前无换行缩进进入正文", all(re.search(r"[^\n]</p>", str(p)) for p in bkids))
    ok(g, "M01 写在同一源码行", any(len(l) > 100 and "dateline" in l for l in html.splitlines()))

    # ---- 高风险字符串 ---------------------------------------------------
    g = "高风险字符串"
    for s in [
        "自然选择号9月18日7时电",
        "今日7时",
        "第一志愿、第二志愿",
        "47个社团",
        "进行录取；部分社团",
        "目前，校本课程志愿填报工作正在进行中。",
        "调剂至尚有名额的其他社团。",
    ]:
        ok(g, f"原样存在：{s}", s in html)
    ok(g, "未把“今日7时”改成具体日期", "9月18日7时正式启动" not in html)
    ok(g, "未在 9月18日 前补年份", not re.search(r"\d{4}年9月18日", html))

    # ---- 验证方法 6: visible content whitelist ---------------------------
    g = "可见内容白名单"
    body_text = main_el.get_text()
    seq = [s for s in body_text.split("\n") if s.strip()]
    eq(g, "main 内可见文本序列（忽略空白）", seq, [c5["type"], c5["title"], c5["byline"]] + list(expected))
    eq(g, "正文无第八项可见内容", len(seq), 7)

    # ---- 验证方法 7: forbidden terms in Results/ ------------------------
    g = "禁止项"
    corpus = {p.name: p.read_text(encoding="utf-8", errors="replace") for p in RESULTS.iterdir() if p.is_file()}
    needles = [
        "厨一枚", "胡桃", "2026", "作者：", "记者：", "文／", "M01", "M02", "M03", "M04",
        ".docx", "新闻消息.docx", "TODO", "TBD", "Lorem ipsum", "sha256", "SHA-256",
        "DE10B575", "Materials/", "datetime", "&nbsp;",
    ]
    for n in needles:
        hits = [f for f, c in corpus.items() if n.lower() in c.lower()] if n not in ("TODO", "TBD", "Lorem ipsum", "SHA-256", "DE10B575") else [f for f, c in corpus.items() if n in c]
        eq(g, f"Results/ 不出现 {n}", hits, [])
    ext = [f for f, c in corpus.items() if re.search(r"(https?:)?//[a-z0-9.-]+\.[a-z]{2,}", c, re.I)]
    eq(g, "Results/ 无外部 URL", ext, [])
    eq(g, "Results/ 无 <img>/背景图 URL", [f for f, c in corpus.items() if re.search(r"<img|\burl\(", c, re.I)], [])
    ok(g, "消息页无“来源”“节选”“链接”字样", not re.search(r"来源：|节选|原文链接|推荐阅读|作者简介|版权", html))
    invisible = sorted({f"U+{ord(ch):04X}" for ch in html if ord(ch) in {0x00AD, 0x200B, 0x200C, 0x200D, 0x2060, 0xFEFF, 0x00A0}})
    eq(g, "正文无软连字符/零宽字符/NBSP", invisible, [])
    eq(g, "无 <wbr>", html.lower().count("<wbr"), 0)
    eq(g, "无 &shy;/&#173; 实体", len(re.findall(r"&shy;|&#0*173;|&#x0*6d;", html, re.I)), 0)
    eq(g, "main 内无 id 属性", len(soup.select("main [id]")), 0)
    eq(g, "main 内无 data-* 属性", sorted({k for t in main_el.find_all(True) for k in t.attrs if k.startswith("data-")}), [])
    eq(g, "main 内无 aria-label/aria-hidden", sorted({k for t in main_el.find_all(True) for k in t.attrs if k.startswith("aria-")}), [])

    # ---- 范围：只改一个文件 ---------------------------------------------
    g = "变更边界"
    ok(g, "唯一改动文件是 news-message.html", hashlib.sha256(PAGE.read_bytes()).hexdigest() != "45e898bf09eac76df94c4ed178a262ce41e45b3015f9bb204ed12e594f3d2530")
    ok(g, "无新增运行时/测试依赖文件", all((RESULTS / f).exists() for f in OTHER_FILES))
    eq(g, "文件以 LF 结尾且单个尾换行", html.endswith("\n") and html.endswith("\n\n") is False, True)

    report()


def report():
    fails = [c for c in checks if not c["pass"]]
    lines = [
        f"{c['group']} | {c['name']} | {'PASS' if c['pass'] else 'FAIL'}"
        + (f" :: {c['detail']}" if c["detail"] else "")
        for c in checks
    ]
    name = "report.txt" if "QA_RESULTS" not in os.environ else "report_mutant.txt"
    (Path(__file__).parent / name).write_text("\n".join(lines) + "\n", encoding="utf-8")
    for c in fails:
        print(f"FAIL [{c['group']}] {c['name']} :: {c['detail']}".encode("utf-8", "replace").decode(sys.stdout.encoding or "utf-8", "replace"))
    print(json.dumps({"total": len(checks), "passed": len(checks) - len(fails), "failed": len(fails)}, ensure_ascii=False))
    return 1 if fails else 0


def _exit():
    sys.exit(report())


if __name__ == "__main__":
    try:
        main()
    except Exception:
        import traceback

        traceback.print_exc()
        sys.exit(2)
    sys.exit(report())
