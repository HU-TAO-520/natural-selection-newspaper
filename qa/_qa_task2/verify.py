# -*- coding: utf-8 -*-
"""Task 2 acceptance verifier: every bullet of 验证方法 + 完成定义.

Read-only against Results/. Report -> _qa_task2/report.md. Exit 0 = PASS.
"""
import difflib
import hashlib
import io
import os
import re
import sys
import time
from collections import Counter, defaultdict
from html.parser import HTMLParser

from bs4 import BeautifulSoup
from bs4.element import Tag

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESULTS = os.environ.get("QODER_RESULTS_DIR") or os.path.join(ROOT, "Results")
PLAN_DIR = os.path.join(ROOT, "plan")
PLAN2 = os.path.join(PLAN_DIR, "Task2-建立共享HTML壳与导航.md")
PLAN0 = os.path.join(PLAN_DIR, "Task0-总方案与任务索引.md")
PLAN1 = os.path.join(PLAN_DIR, "Task1-素材基线与内容合同.md")
REPORT = os.environ.get("QODER_REPORT") or os.path.join(ROOT, "_qa_task2", "report.md")

PAGES = ["index.html", "news-message.html", "news-feature.html", "news-commentary.html"]
NAV = [("首页", "index.html"), ("新闻消息", "news-message.html"),
       ("新闻通讯", "news-feature.html"), ("新闻评论", "news-commentary.html")]
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"}
ALLOWED_TAGS = {"html", "head", "meta", "title", "link", "script", "body", "a", "header",
                "div", "p", "button", "span", "nav", "ul", "li", "main", "h1"}

results = []


def check(section, name, ok, detail=""):
    results.append((section, name, bool(ok), detail))


def load(p):
    return io.open(os.path.join(RESULTS, p), encoding="utf-8").read()


def parse(src):
    return BeautifulSoup(src, "lxml")


def kids(el):
    """Direct element children only; None-safe."""
    if el is None or not isinstance(el, Tag):
        return []
    return [c for c in el.children if getattr(c, "name", None)]


NULL = Tag(name="missing")


def F(root, *a, **k):
    """find() that never returns None, so missing elements fail as assertions."""
    try:
        r = root.find(*a, **k) if root is not None else None
    except Exception:
        r = None
    return r if r is not None else NULL


def S1(root, sel):
    try:
        r = root.select_one(sel) if root is not None else None
    except Exception:
        r = None
    return r if r is not None else NULL


def RX(pattern, text, flags=0):
    m = re.search(pattern, text, flags)
    return m.group(0) if m else "<missing-match:%s>" % pattern[:24]


def plan_registry(path):
    text = io.open(path, encoding="utf-8").read()
    rows = re.findall(
        r"^\| `(index\.html|news-(?:message|feature|commentary)\.html)` \| `([^`]+)` \| `([^`]+)` \| ([^|]+?) \|",
        text, re.M)
    out = {}
    for f, ti, h, cu in rows:
        cu = cu.strip().strip("`").strip()
        if cu not in ("首页", "新闻消息", "新闻通讯", "新闻评论"):
            continue
        out.setdefault(f, {"title": ti, "h1": h, "current": cu})
    return out


def tag_balance(src):
    stack, errs = [], []

    class P(HTMLParser):
        def handle_starttag(self, tag, attrs):
            if tag not in VOID:
                stack.append(tag)

        def handle_endtag(self, tag):
            if tag in VOID:
                errs.append("%s 是空元素不应有结束标签" % tag)
            elif not stack:
                errs.append("多余结束标签 </%s>" % tag)
            elif stack[-1] != tag:
                errs.append("</%s> 与 </%s> 交叉嵌套" % (tag, stack[-1]))
                if tag in stack:
                    while stack and stack.pop() != tag:
                        pass
            else:
                stack.pop()

    p = P(convert_charrefs=False)
    p.feed(src)
    p.close()
    if stack:
        errs.append("未闭合: %s" % ", ".join(stack))
    return errs


def focusable(el):
    if el.name == "a" and el.get("href"):
        return True
    if el.name in ("button", "input", "select", "textarea"):
        return True
    ti = el.get("tabindex")
    try:
        return ti is not None and int(ti) >= 0
    except ValueError:
        return False


def first_focusable(root):
    return next((el for el in root.find_all(focusable)), None)


def attr_values(src, name):
    return re.findall(r'\b%s\s*=\s*"([^"]*)"' % name, src)


def main():
    reg2 = plan_registry(PLAN2)
    check("前置条件", "Task 2 页面登记表可解析出 4 行", len(reg2) == 4, "%d 行" % len(reg2))
    check("前置条件", "Task 1 已冻结的三个文章标题与本任务 h1 一致",
          all(reg2[f]["h1"] in io.open(PLAN1, encoding="utf-8").read()
              for f in ("news-message.html", "news-feature.html", "news-commentary.html")))

    # ================= 1. 文件级验证 =================
    S = "文件级"
    present = sorted(os.listdir(RESULTS))
    check(S, "Results/ 恰好含四个 Task 2 HTML，名称与大小写准确", present == sorted(PAGES), "实际 %s" % present)
    check(S, "未创建空 styles.css / script.js 占位文件",
          not any(f in present for f in ("styles.css", "script.js")))
    for p in PAGES:
        src = load(p)
        raw = open(os.path.join(RESULTS, p), "rb").read()
        check(S, "%s 存在且文件名大小写与登记表一致" % p,
              p in PAGES and (p in present) and p.lower() not in [x for x in present if x != p])
        check(S, "%s 以 <!doctype html> 开始" % p,
              src.lower().startswith("<!doctype html>"), src[:20])
        errs = tag_balance(src)
        check(S, "%s 标签闭合正确、无交叉嵌套（结构有效）" % p, not errs, "; ".join(errs))
        check(S, "%s UTF-8 无 BOM、可经 file:// 直接打开" % p,
              not raw.startswith(b"\xef\xbb\xbf") and raw.decode("utf-8") is not None)
    base = time.time() - 3600
    changed = []
    for d in ("Materials", "plan"):
        for f in os.listdir(os.path.join(ROOT, d)):
            mt = os.path.getmtime(os.path.join(ROOT, d, f))
            if mt > os.path.getmtime(os.path.join(RESULTS, "index.html")):
                changed.append("%s/%s" % (d, f))
    check(S, "本任务未修改 Materials/ 与 plan/ 任何文件（mtime 均早于交付文件）", not changed, str(changed))
    stray = [f for f in os.listdir(ROOT) if f not in
             ("Materials", "plan", "Results", "_qa_task1", "_qa_task2") and not f.startswith(".")]
    check(S, "项目根目录未产生约定外的新条目", not stray, str(stray))

    # ================= 2. <head> 验证 =================
    S = "head"
    for p in PAGES:
        src, soup = load(p), parse(load(p))
        HT, HD, BO = F(soup, "html"), F(soup, "head"), F(soup, "body")
        TT, H1, MN = F(soup, "title"), F(soup, "h1", class_="page-title"), F(soup, "main")
        SK = F(soup, "a", class_="skip-link")
        HDR = F(soup, "header")
        INR = kids(HDR)[0] if kids(HDR) else NULL
        _hk = kids(INR)
        MAST, BTN, NAVEL = (_hk + [NULL, NULL, NULL])[:3]
        _scr = soup.find_all("script")
        SCR0 = _scr[0] if _scr else NULL
        CUR = soup.find_all(attrs={"aria-current": True})
        CUR0 = CUR[0] if CUR else NULL
        check(S, "%s 唯一 <html> 且 lang=\"zh-CN\"" % p,
              len(soup.find_all("html")) == 1 and HT.get("lang") == "zh-CN"
              and src.count("lang=") == 1)
        metas = soup.find_all("meta")
        check(S, "%s 恰好一个 meta charset=utf-8" % p,
              len([m for m in metas if m.get("charset")]) == 1
              and (next((m for m in metas if m.get("charset")), NULL).get("charset") or "").lower() == "utf-8")
        vp = [m for m in metas if m.get("name") == "viewport"]
        check(S, "%s 恰好一个 viewport 且值为 width=device-width, initial-scale=1" % p,
              len(vp) == 1 and (vp[0] if vp else NULL).get("content") == "width=device-width, initial-scale=1")
        check(S, "%s <meta> 总数恰为 2（无额外元数据）" % p, len(metas) == 2, str(metas))
        check(S, "%s 恰好一个 <title>" % p, len(soup.find_all("title")) == 1)
        check(S, "%s <title> 与页面登记表逐字符一致" % p,
              TT.get_text() == reg2[p]["title"], "%r != %r" % (TT.get_text(), reg2[p]["title"]))
        css = [l for l in soup.find_all("link") if "stylesheet" in (l.get("rel") or [])]
        check(S, "%s 恰好一次 styles.css 同目录相对引用" % p,
              len(css) == 1 and (css[0] if css else NULL).get("href") == "styles.css" and len(soup.find_all("link")) == 1)
        scr = soup.find_all("script")
        check(S, "%s 恰好一次 script.js 引用且 src 正确" % p,
              len(scr) == 1 and SCR0.get("src") == "script.js")
        check(S, "%s 脚本使用 defer，无 async / type=module / 内联代码" % p,
              SCR0.has_attr("defer") and not SCR0.has_attr("async")
              and not SCR0.get("type") and not (SCR0.get_text() or "").strip()
              and not re.search(r"type\s*=\s*[\"']module[\"']", src, re.I))
        check(S, "%s <head> 子节点顺序 = meta,meta,title,link,script" % p,
              [e.name for e in kids(HD)] == ["meta", "meta", "title", "link", "script"],
              str([e.name for e in kids(HD)]))
        check(S, "%s 无 <base>" % p, soup.find("base") is None)
        check(S, "%s 无内联 <style>" % p, soup.find("style") is None)
        check(S, "%s 无外部 URL / 协议相对 / 网络字体 / 预连接 / canonical / OG / 图标" % p,
              not re.search(r"https?:|url\(|@import|preconnect|dns-prefetch|canonical|"
                            r'rel="icon"|rel="shortcut icon"|og:|twitter:', src, re.I)
              and not [v for v in attr_values(src, "href") + attr_values(src, "src") if v.startswith("//")])
        check(S, "%s 无服务器根路径 / 盘符 / 反斜杠" % p,
              not [v for v in attr_values(src, "href") + attr_values(src, "src")
                   if v.startswith("/") or v.startswith("\\") or re.match(r"^[A-Za-z]:", v)])
        check(S, "%s 资源引用无查询参数或 URL 片段" % p,
              not [v for v in attr_values(src, "href") + attr_values(src, "src")
                   if ("?" in v or "#" in v) and not v.startswith("#")])
        check(S, "%s 唯一锚点型 href 只能是 #main-content" % p,
              all(v == "#main-content" for v in attr_values(src, "href") if v.startswith("#")))
        check(S, "%s charset/viewport/title/link/script 各出现一次" % p,
              len(re.findall(r"<meta\b", src)) == 2 and len(re.findall(r"<title\b", src)) == 1
              and len(re.findall(r"<link\b", src)) == 1 and len(re.findall(r"<script\b", src)) == 1)
        check(S, "%s <title> 分隔符为全角 ｜ U+FF5C 且恰好一次" % p,
              TT.get_text().count("\uFF5C") == 1)
        check(S, "%s 无内联事件处理器" % p, not re.search(r"\son[a-z]+\s*=", src, re.I))

    # ================= 3. 结构验证 =================
    S = "结构"
    for p in PAGES:
        src, soup = load(p), parse(load(p))
        HT, HD, BO = F(soup, "html"), F(soup, "head"), F(soup, "body")
        TT, H1, MN = F(soup, "title"), F(soup, "h1", class_="page-title"), F(soup, "main")
        SK = F(soup, "a", class_="skip-link")
        HDR = F(soup, "header")
        INR = kids(HDR)[0] if kids(HDR) else NULL
        _hk = kids(INR)
        MAST, BTN, NAVEL = (_hk + [NULL, NULL, NULL])[:3]
        _scr = soup.find_all("script")
        SCR0 = _scr[0] if _scr else NULL
        CUR = soup.find_all(attrs={"aria-current": True})
        CUR0 = CUR[0] if CUR else NULL
        body = BO
        check(S, "%s 恰好一个跳至正文链接 / <header> / <nav> / <main> / <h1>" % p,
              len(soup.find_all("a", class_="skip-link")) == 1 and len(soup.find_all("header")) == 1
              and len(soup.find_all("nav")) == 1 and len(soup.find_all("main")) == 1
              and len(soup.find_all("h1")) == 1)
        check(S, "%s skip-link 文字固定为“跳至正文”且 href=#main-content" % p,
              SK.get_text() == "跳至正文"
              and SK.get("href") == "#main-content")
        check(S, "%s skip-link 是 <body> 第一个可聚焦元素" % p,
              first_focusable(body) is SK)
        check(S, "%s skip-link 是 <body> 第一个元素子节点" % p,
              kids(body)[:1] == [SK])
        check(S, "%s <body> 直接子元素顺序 = a, header, main" % p,
              [e.name for e in kids(body)] == ["a", "header", "main"],
              str([e.name for e in kids(body)]))
        check(S, "%s <html> 直接子元素 = head, body" % p,
              [e.name for e in kids(HT)] == ["head", "body"])
        hdr = HDR
        check(S, "%s <header> 顺序为 .site-header > .site-header__inner > 报头,按钮,导航" % p,
              hdr.get("class") == ["site-header"] and INR.get("class") == ["site-header__inner"]
              and [e.name for e in _hk] == ["p", "button", "nav"],
              str([e.name for e in _hk]))
        inner = INR
        _ik = kids(inner)
        mast, btn, nav = MAST, BTN, NAVEL
        check(S, "%s 报头为 <p class=site-masthead>，不占用标题层级" % p,
              mast.name == "p" and mast.get("class") == ["site-masthead"]
              and mast.find(re.compile("^h[1-6]$")) is None
              and hdr.find_all(re.compile("^h[1-6]$")) == [])
        ml = F(mast, "a", class_="site-masthead__link")
        check(S, "%s 报头链接文字“自然选择号”且始终指向 index.html" % p,
              ml is not NULL and ml.get_text() == "自然选择号" and ml.get("href") == "index.html")
        ids = [el["id"] for el in soup.find_all(id=True)]
        dup = [k for k, v in Counter(ids).items() if v > 1]
        check(S, "%s 页面内无重复 ID" % p, not dup, "重复 %s" % dup)
        check(S, "%s #nav-toggle / #site-navigation / #main-content 各一次" % p,
              ids.count("nav-toggle") == 1 and ids.count("site-navigation") == 1
              and ids.count("main-content") == 1, str(ids))
        check(S, "%s 按钮 aria-controls 精确等于导航实际 ID" % p,
              btn.get("aria-controls") == nav.get("id") == "site-navigation")
        check(S, "%s 按钮位于受控导航之前（DOM 与源码顺序一致）" % p,
              btn in _ik and nav in _ik and _ik.index(btn) < _ik.index(nav)
              and -1 < src.find('id="nav-toggle"') < src.find('id="site-navigation"'))
        main_el = MN
        _bk = kids(body)
        check(S, "%s <main> 为 body 直接子元素且在 <header> 之后" % p,
              main_el.parent is body and main_el in _bk and _bk.index(main_el) == 2)
        check(S, "%s <main> 的 ID/class/tabindex 符合合同" % p,
              main_el.get("id") == "main-content" and main_el.get("class") == ["main-content"]
              and main_el.get("tabindex") == "-1")
        mk = kids(main_el)
        check(S, "%s <main> 在 Task 2 阶段除唯一 <h1> 外无其他元素或可见文本" % p,
              len(mk) == 1 and mk[0].name == "h1"
              and not "".join(main_el.stripped_strings).replace(mk[0].get_text(), "").strip(),
              str([e.name for e in mk]))
        check(S, "%s <h1> 为 class=page-title 且文字与登记表逐字符一致" % p,
              H1.get("class") == ["page-title"] and H1.get_text() == reg2[p]["h1"],
              "%r != %r" % (H1.get_text(), reg2[p]["h1"]))
        check(S, "%s <h1> 不含全角竖线 ｜ 与站点名后缀" % p,
              "\uFF5C" not in H1.get_text()
              and (p == "index.html") == ("\u300a" in H1.get_text()))
        used = {e.name for e in soup.find_all()}
        check(S, "%s 无公共壳合同外的标签（多出 %s）" % (p, sorted(used - ALLOWED_TAGS) or "无"),
              not (used - ALLOWED_TAGS), str(sorted(used - ALLOWED_TAGS)))

    # ================= 4. 导航验证 =================
    S = "导航"
    total = 0
    targets = set()
    for p in PAGES:
        src, soup = load(p), parse(load(p))
        HT, HD, BO = F(soup, "html"), F(soup, "head"), F(soup, "body")
        TT, H1, MN = F(soup, "title"), F(soup, "h1", class_="page-title"), F(soup, "main")
        SK = F(soup, "a", class_="skip-link")
        HDR = F(soup, "header")
        INR = kids(HDR)[0] if kids(HDR) else NULL
        _hk = kids(INR)
        MAST, BTN, NAVEL = (_hk + [NULL, NULL, NULL])[:3]
        _scr = soup.find_all("script")
        SCR0 = _scr[0] if _scr else NULL
        CUR = soup.find_all(attrs={"aria-current": True})
        CUR0 = CUR[0] if CUR else NULL
        links = soup.select(".site-navigation__list > .site-navigation__item > .site-navigation__link")
        total += len(links)
        items = soup.select(".site-navigation__list > li")
        check(S, "%s 主导航恰好四个链接，每项恰一个链接" % p,
              len(links) == 4 and len(items) == 4
              and all(len(kids(it)) == 1 and kids(it)[0].name == "a" for it in items))
        check(S, "%s 导航文本与顺序 = 首页/新闻消息/新闻通讯/新闻评论" % p,
              [(a.get_text(), a.get("href")) for a in links] == NAV,
              str([(a.get_text(), a.get("href")) for a in links]))
        check(S, "%s 列表为 <ul class=site-navigation__list> 且 aria-label=主导航" % p,
              S1(soup, "ul.site-navigation__list") is not NULL
              and F(soup, "nav").get("aria-label") == "主导航")
        cur = soup.find_all(attrs={"aria-current": True})
        check(S, "%s 全页恰好一个 aria-current，值精确为 page" % p,
              len(CUR) == 1 and CUR0.get("aria-current") == "page",
              "%d 个: %s" % (len(CUR), [c.get("aria-current") for c in CUR]))
        check(S, "%s aria-current 只落在 <a> 上（不在 <li>/<nav>/<span>）" % p,
              all(c.name == "a" for c in cur) and not soup.select("li[aria-current], nav[aria-current], span[aria-current]"))
        check(S, "%s aria-current 落在矩阵指定的自链接（%s → %s）" % (p, reg2[p]["current"], p),
              len(CUR) == 1 and CUR0.get_text() == reg2[p]["current"] and CUR0.get("href") == p)
        check(S, "%s 其余三个导航链接不带 aria-current" % p,
              sum(1 for a in links if a.has_attr("aria-current")) == 1)
        check(S, "%s 报头链接不带 aria-current（不计入 16 条）" % p,
              S1(soup, ".site-masthead__link").get("aria-current") is None)
        check(S, "%s 当前页链接仍可点击、未被替换为 <span> 或去 href" % p,
              CUR0.name == "a" and CUR0.has_attr("href") and not CUR0.find("span"))
        check(S, "%s 无 aria-selected / aria-pressed 表达当前页" % p,
              "aria-selected" not in src and "aria-pressed" not in src)
        for a in links:
            h = a.get("href") or ""
            targets.add(h)
            check(S, "%s 导航目标 %s 合规（同目录文件名、已存在、无绝对路径/片段/查询/新窗口/JS URL）" % (p, h),
                  h in PAGES and re.fullmatch(r"[a-z\-]+\.html", h) is not None
                  and not a.has_attr("target") and "javascript:" not in h.lower()
                  and os.path.exists(os.path.join(RESULTS, h)))
    check(S, "四页合计 16 条主导航路径", total == 16, "实际 %d" % total)
    check(S, "16 条链接目标全部属于四个已创建页面", targets == set(PAGES), str(sorted(targets)))
    check(S, "每页导航目标集合与登记表四页文件集合一致（含自链接）",
          len(targets) == 4)

    # ================= 5. 渐进增强静态验证 =================
    S = "渐进增强"
    for p in PAGES:
        src, soup = load(p), parse(load(p))
        HT, HD, BO = F(soup, "html"), F(soup, "head"), F(soup, "body")
        TT, H1, MN = F(soup, "title"), F(soup, "h1", class_="page-title"), F(soup, "main")
        SK = F(soup, "a", class_="skip-link")
        HDR = F(soup, "header")
        INR = kids(HDR)[0] if kids(HDR) else NULL
        _hk = kids(INR)
        MAST, BTN, NAVEL = (_hk + [NULL, NULL, NULL])[:3]
        _scr = soup.find_all("script")
        SCR0 = _scr[0] if _scr else NULL
        CUR = soup.find_all(attrs={"aria-current": True})
        CUR0 = CUR[0] if CUR else NULL
        check(S, "%s <html> 源码初始类恰为 no-js" % p,
              HT.get("class") == ["no-js"], str(HT.get("class")))
        check(S, "%s 源码无预写 js 类、无 no-js 之外的类" % p,
              len(re.findall(r'class="js\b', src)) == 0 and 'class="no-js"' in src
              and re.search(r'<html[^>]*class="no-js"', src) is not None)
        btn = F(soup, "button", id="nav-toggle")
        check(S, "%s 菜单按钮为原生 <button> 且 type=button" % p,
              btn is not NULL and btn.name == "button" and btn.get("type") == "button")
        check(S, "%s 按钮 class=nav-toggle 且无 role / tabindex" % p,
              btn.get("class") == ["nav-toggle"] and not btn.get("role") and not btn.get("tabindex"))
        check(S, "%s 按钮初始 aria-expanded=false" % p, btn.get("aria-expanded") == "false")
        check(S, "%s 按钮含可见文字“菜单”（非纯图标）" % p,
              S1(btn, "span.nav-toggle__text").get_text() == "菜单")
        icon = S1(btn, "span.nav-toggle__icon")
        check(S, "%s 装饰图形 .nav-toggle__icon 保持 aria-hidden=true 且无文本" % p,
              icon is not NULL and icon.get("aria-hidden") == "true"
              and not icon.get_text().strip() and not icon.find_all())
        check(S, "%s 按钮可访问名称只来自“菜单”" % p, " ".join(btn.stripped_strings) == "菜单")
        nav = F(soup, id="site-navigation")
        check(S, "%s 导航源码无 hidden / aria-hidden / is-open / style 隐藏" % p,
              not nav.has_attr("hidden") and not nav.has_attr("aria-hidden")
              and "is-open" not in (nav.get("class") or []) and not nav.get("style")
              and not nav.find_all(attrs={"hidden": True}) and not nav.find_all(attrs={"aria-hidden": True}))
        check(S, "%s 无 JS 时导航链接仍在文档树（未用 hidden/aria-hidden 隐藏）" % p,
              "hidden" not in str(nav), str(nav)[:60])
        check(S, "%s 全页 aria-hidden 仅图标一处" % p,
              len(soup.find_all(attrs={"aria-hidden": True})) == 1
              and F(soup, attrs={"aria-hidden": True}) is icon)
        check(S, "%s 无内联事件属性（onclick/onkeydown 等）" % p,
              not re.search(r"\son[a-z]+\s*=", src, re.I) and not re.search(r"\son\w+\s*=", str(btn.attrs)))
        check(S, "%s 无 style 属性 / 内联隐藏样式" % p, "style=" not in src)
        check(S, "%s 导航未使用应用菜单专用 role=menu/menuitem/menubar" % p,
              not re.search(r'role\s*=\s*["\'](menu|menuitem|menubar|navigation|list|listitem)["\']', src))
        check(S, "%s 原生 nav/ul/li/a 结构且 <nav> 有可访问名称" % p,
              nav.name == "nav" and nav.find("ul") is not None and nav.get("aria-label") == "主导航")
        check(S, "%s <main> tabindex=-1 而非 0，未成为常规 Tab 停靠点" % p,
              MN.get("tabindex") == "-1" and 'tabindex="0"' not in src)
        tis = [int(v) for v in attr_values(src, "tabindex")]
        check(S, "%s 除 <main> 外无 tabindex，无负值使链接退出键盘顺序" % p,
              tis == [-1], str(tis))
        check(S, "%s 无重复屏幕阅读器当前页专用文本" % p,
              "当前页面" not in src and "当前位置" not in src and "aria-describedby" not in src)
        check(S, "%s 无内联初始化脚本（Task 9 不与之重复绑定）" % p,
              len(re.findall(r"<script\b", src)) == 1 and "document." not in src and "addEventListener" not in src)

    # ================= 6. 一致性验证 =================
    S = "一致性"

    def norm_dom(src):
        soup = parse(src)
        _t = soup.find("title")
        if _t is not None:
            _t.string = "@@TITLE@@"
        _h = soup.find("h1", class_="page-title")
        if _h is not None:
            _h.string = "@@H1@@"
        for a in soup.find_all(attrs={"aria-current": True}):
            del a["aria-current"]
        return str(F(soup, "html"))

    def norm_src(src):
        out = re.sub(r"<title>.*?</title>", "<title>@@T@@</title>", src, flags=re.S)
        out = re.sub(r'(<h1 class="page-title">).*?(</h1>)', r"\1@@H@@\2", out, flags=re.S)
        return out.replace(' aria-current="page"', "")

    doms = {p: norm_dom(load(p)) for p in PAGES}
    srcs = {p: norm_src(load(p)) for p in PAGES}
    check(S, "规范化（title/h1/aria-current 三处）后四页 DOM 完全一致",
          len(set(doms.values())) == 1)
    check(S, "规范化后四页源码逐字节一致（严于 DOM 比较，含标签与属性顺序）",
          len(set(srcs.values())) == 1)
    for i in range(1, len(PAGES)):
        a, b = srcs[PAGES[0]], srcs[PAGES[i]]
        d = [l for l in difflib.unified_diff(a.split("\n"), b.split("\n"),
                                             PAGES[0], PAGES[i], lineterm="")
             if l.startswith(("-", "+")) and not l.startswith(("---", "+++"))]
        check(S, "%s 与 index.html 规范化后无差异行" % PAGES[i], not d, " | ".join(d[:6]))
    for p in PAGES[1:]:
        blocks = [l for l in difflib.unified_diff(
                      load(PAGES[0]).replace(' aria-current="page"', "").split("\n"),
                      load(p).replace(' aria-current="page"', "").split("\n"),
                      lineterm="", n=0)
                  if l.startswith(("-", "+")) and not l.startswith(("---", "+++"))]
        kinds = set()
        for ln in blocks:
            if "<title>" in ln:
                kinds.add("title")
            elif "page-title" in ln:
                kinds.add("h1")
            else:
                kinds.add("OTHER")
        check(S, "%s 去除当前页标记后与 index.html 的行级差异只落在 title / h1" % p,
              "OTHER" not in kinds, str(sorted(kinds)))
        # 决定性检查：index.html 经且仅经三处替换即可逐字节重建该页
        exp = load(PAGES[0])
        exp = re.sub(r"<title>[^<]*</title>",
                     lambda m, t=reg2[p]["title"]: "<title>%s</title>" % t, exp)
        exp = re.sub(r'(<h1 class="page-title">)[^<]*(</h1>)',
                     lambda m, h=reg2[p]["h1"]: m.group(1) + h + m.group(2), exp)
        exp = exp.replace(' href="index.html" aria-current="page"', ' href="index.html"')
        exp = exp.replace('href="%s"' % p, 'href="%s" aria-current="page"' % p, 1)
        check(S, "%s 等于 index.html 应用三处允许差异后的逐字节结果（无第四类差异）" % p,
              exp == load(p),
              "长度 %d vs %d" % (len(exp), len(load(p))))
    check(S, "四页均无页面专属 body class / 额外 wrapper / 页脚",
          all(not parse(load(p)).body.get("class") and parse(load(p)).find("footer") is None for p in PAGES))
    def frozen(el):
        return tuple(sorted((k, tuple(v) if isinstance(v, list) else v)
                            for k, v in el.attrs.items()))

    check(S, "四页 <main> 属性集合一致",
          len({frozen(F(parse(load(p)), "main")) for p in PAGES}) == 1)
    check(S, "四页 <html>/<meta>/<link>/<script> 标签文本一致（除 title）",
          len({RX(r"<html[^>]*>", load(p)) for p in PAGES}) == 1
          and len({m for p in PAGES for m in re.findall(r"<meta[^>]*>", load(p))}) == 2
          and len({RX(r"<link[^>]*>", load(p)) for p in PAGES}) == 1
          and len({RX(r"<script[^>]*>", load(p)) for p in PAGES}) == 1)
    check(S, "四页导航块（去 aria-current 后）源码完全一致",
          len({RX(r"<ul[^>]*site-navigation__list.*?</ul>", load(p), re.S)
                  .replace(' aria-current="page"', "") for p in PAGES}) == 1)
    check(S, "四页报头 + 按钮块源码完全一致",
          len({RX(r"<p class=\"site-masthead\">.*?</button>", load(p), re.S) for p in PAGES}) == 1)

    # ================= 7. 范围与禁止项验证 =================
    S = "范围与禁止项"
    forbidden = ["厨一枚", "胡桃", "2026", "2025", "2024", "{{", "}}", "TODO", "TBD", "@@",
                 "待补充", "内容待补充", "Lorem", "ipsum", "页面登记表中的主标题", "页面登记表中的完整标题",
                 "新闻评价", "作者", "记者", "评论员", "来源", "出处", "署名", "蓝色空间",
                 "Materials", ".docx", "DE10B575", "0C5B3525", "8E50CFC8", "M01", "M04", "F01",
                 "F23", "C01", "C29", "closing_date", "9月", "自然选择号9月", "电头",
                 "http://", "https://", "www.", "localhost", "127.0.0.1", "://", "cdn", "favicon",
                 "aria-selected", "aria-pressed", "<footer", "footer", "<img", "<svg", "<picture",
                 "background-image", "<video", "<iframe", "<form", "<input", "<search", "搜索",
                 "推荐", "版权所有", "©", "Copyright", "breadcrumb", "面包屑", "<aside", "aside",
                 "target=", "<base", "<style", "role=", "is-open", "display:", "<h2", "<h3",
                 "placeholder", "注释", "<!--", "<article", "datetime", "<time", "<figure",
                 "<blockquote", "<noscript", "document.write", "addEventListener", "<section",
                 "<table", "<button type=\"submit", "rem", "px", "@media"]
    for tok in forbidden:
        hits = [p for p in PAGES if tok in load(p)]
        check(S, "禁止串 “%s” 在四页命中 0" % tok, not hits, str(hits))
    check(S, "搜索结果 厨一枚 / 胡桃 / 2026 均为 0（合同点名项）",
          all(not any(tok in load(p) for p in PAGES) for tok in ("厨一枚", "胡桃", "2026")))
    for p in PAGES:
        src, soup = load(p), parse(load(p))
        HT, HD, BO = F(soup, "html"), F(soup, "head"), F(soup, "body")
        TT, H1, MN = F(soup, "title"), F(soup, "h1", class_="page-title"), F(soup, "main")
        SK = F(soup, "a", class_="skip-link")
        HDR = F(soup, "header")
        INR = kids(HDR)[0] if kids(HDR) else NULL
        _hk = kids(INR)
        MAST, BTN, NAVEL = (_hk + [NULL, NULL, NULL])[:3]
        _scr = soup.find_all("script")
        SCR0 = _scr[0] if _scr else NULL
        CUR = soup.find_all(attrs={"aria-current": True})
        CUR0 = CUR[0] if CUR else NULL
        texts = [t.strip() for t in soup.find_all(string=True)
                 if t.parent is not None
                 and t.parent.name not in ("title", "script", "style", "[document]")
                 and t.strip()]
        want = ["跳至正文", "自然选择号", "菜单", "首页", "新闻消息", "新闻通讯", "新闻评论", reg2[p]["h1"]]
        check(S, "%s 可见文本集合精确等于 %s" % (p, " / ".join(want)), texts == want, str(texts))
        check(S, "%s 无文章正文/署名/新闻日期/Word 属性的额外文本" % p, len(texts) == 8, str(len(texts)))
        check(S, "%s 无未替换模板记号" % p,
              not re.search(r"\{\{|\}\}|@@|\bTBD\b|TODO|页面登记表中", src))
        check(S, "%s 无 HTML 注释（不写入开发注释）" % p, "<!--" not in src)
        check(S, "%s 无页脚/搜索/评论/推荐/图片/外链/宣传语" % p,
              not soup.find_all(["footer", "img", "svg", "aside", "form", "article", "section"]))
    matfrozen = {"新闻消息.docx": "DE10B575399E0563430F2F255C956B179C9978C087897A24910AD70D6A50F6FC",
                 "新闻通讯.docx": "0C5B35256B7271ACFB2F49AEC146288B404ED49C376AC2C8B3F6246B38F894A4",
                 "新闻评价.docx": "8E50CFC89287035163D5FE95C8B1CEE20A5AA405E9D04EC358FB5C9312C3827C"}
    for k, v in matfrozen.items():
        fp = os.path.join(ROOT, "Materials", k)
        got = hashlib.sha256(open(fp, "rb").read()).hexdigest().upper() if os.path.exists(fp) else None
        check(S, "素材未被改动: %s SHA-256 匹配 Task 1 冻结值" % k, got == v)

    # ================= 8. 与总方案交叉核对 =================
    S = "交叉核对"
    reg0 = plan_registry(PLAN0)
    for f in PAGES:
        check(S, "Task 0 与 Task 2 对 %s 的 title/h1/当前导航项一致" % f,
              f in reg0 and reg0[f] == reg2[f], "%s vs %s" % (reg0.get(f), reg2.get(f)))
    t2nav = re.findall(r"^(\d)\. `(首页|新闻消息|新闻通讯|新闻评论)` → `(index\.html|news-[a-z]+\.html)`$",
                       io.open(PLAN2, encoding="utf-8").read(), re.M)
    check(S, "代码中硬编码的 NAV 与 Task 2 导航合同逐条一致",
          [(lab, tgt) for _, lab, tgt in sorted(t2nav)] == NAV, str(t2nav))
    iface = ["no-js", "skip-link", "site-header", "site-header__inner", "site-masthead",
             "site-masthead__link", "nav-toggle", "nav-toggle__icon", "nav-toggle__text",
             "site-navigation", "site-navigation__list", "site-navigation__item",
             "site-navigation__link", "main-content", "page-title"]
    for tok in iface:
        hits = [p for p in PAGES if tok not in load(p)]
        check(S, "公共接口 “%s” 在四页全部就位" % tok, not hits, str(hits))
    for i in ["nav-toggle", "site-navigation", "main-content"]:
        check(S, "ID 接口 #%s 四页各一次" % i,
              all(load(p).count('id="%s"' % i) == 1 for p in PAGES))
    check(S, "Task 2 未提前实现样式/交互（Results/ 无 css/js，页面无 CSS 类定义）",
          not any(os.path.exists(os.path.join(RESULTS, f)) for f in ("styles.css", "script.js")))
    check(S, "Task 2 未提前录入正文（<main> 内无 <article>/<p>/日期）",
          all(not F(parse(load(p)), "main").find_all(["article", "p", "time", "section", "div"])
              for p in PAGES))

    # ================= 输出 =================
    fails = [r for r in results if not r[2]]
    bysec = defaultdict(list)
    for r in results:
        bysec[r[0]].append(r)
    out = ["# Task 2 验收报告",
           "",
           "- 核验时间: %s" % time.strftime("%Y-%m-%d %H:%M:%S"),
           "- 核验脚本: `_qa_task2/verify.py`（只读；生成脚本 `_qa_task2/gen.py`）",
           "- 权威真值: `plan/Task2-建立共享HTML壳与导航.md` 页面登记表与导航合同（逐字符解析）+ `plan/Task0` 交叉核对",
           "- 断言总数 **%d** ｜ 通过 **%d** ｜ 失败 **%d** ｜ 结论 **%s**" % (
               len(results), len(results) - len(fails), len(fails), "PASS" if not fails else "FAIL"),
           ""]
    for sec in bysec:
        ok = sum(1 for r in bysec[sec] if r[2])
        out.append("## %s — %d/%d %s" % (sec, ok, len(bysec[sec]), "PASS" if ok == len(bysec[sec]) else "FAIL"))
        out.append("")
        for _, name, passed, detail in bysec[sec]:
            line = "- [%s] %s" % ("x" if passed else " ", name)
            if detail and (not passed or os.environ.get("VERBOSE")):
                line += "\n    - %s" % detail
            out.append(line)
        out.append("")
    io.open(REPORT, "w", encoding="utf-8", newline="\n").write("\n".join(out))
    print("断言 %d 项 | 失败 %d 项 => %s" % (len(results), len(fails), "PASS" if not fails else "FAIL"))
    for _, name, _, detail in fails:
        print("  FAIL:", name, "||", detail)
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
