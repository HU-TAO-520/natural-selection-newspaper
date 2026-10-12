#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Task 4 首页内容静态合同核验（非交付文件，位于 Results/ 之外）。

核验对象：Results/index.html
合同来源：plan/Task4-完成首页内容.md
"""
from __future__ import annotations

import os
import re
import sys
import unicodedata
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESULTS = os.path.join(ROOT, "Results")
INDEX = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(RESULTS, "index.html")

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input",
        "link", "meta", "param", "source", "track", "wbr"}


# --------------------------------------------------------------------------
# 迷你 DOM
# --------------------------------------------------------------------------
class Node:
    def __init__(self, tag, attrs, parent):
        self.tag = tag
        self.attrs = attrs          # list[(name, value|None)] 保留顺序与重复
        self.parent = parent
        self.children = []          # Node(元素) 或 str(文本)

    # ---- 工具 ----
    def attr(self, name):
        for k, v in self.attrs:
            if k == name:
                return v
        return None

    def has_attr(self, name):
        return any(k == name for k, _ in self.attrs)

    @property
    def classes(self):
        return (self.attr("class") or "").split()

    def text(self):
        """textContent 语义：拼接本节点所有后代文本，不做任何归一化。"""
        out = []
        for c in self.children:
            out.append(c if isinstance(c, str) else c.text())
        return "".join(out)

    def elements(self):
        return [c for c in self.children if isinstance(c, Node)]

    def walk(self):
        for c in self.children:
            if isinstance(c, Node):
                yield c
                yield from c.walk()

    def __repr__(self):
        return f"<{self.tag}>"


class Builder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("#document", [], None)
        self.stack = [self.root]
        self.errors = []

    def handle_starttag(self, tag, attrs):
        node = Node(tag, list(attrs), self.stack[-1])
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.stack[-1].children.append(Node(tag, list(attrs), self.stack[-1]))

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                return
        self.errors.append(f"游离结束标签 </{tag}>")

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def parse(src):
    b = Builder()
    b.feed(src)
    b.close()
    return b.root, b.errors


# --------------------------------------------------------------------------
# 断言收集
# --------------------------------------------------------------------------
class Report:
    def __init__(self):
        self.items = []
        self.section = ""

    def begin(self, name):
        self.section = name

    def check(self, ok, label, detail=""):
        self.items.append((self.section, bool(ok), label, detail))
        return ok

    def eq(self, actual, expected, label):
        ok = actual == expected
        detail = "" if ok else f"期望 {expected!r} / 实际 {actual!r}"
        self.items.append((self.section, ok, label, detail))
        return ok

    def fail(self, label, detail=""):
        self.items.append((self.section, False, label, detail))

    def summary(self):
        total = len(self.items)
        bad = [i for i in self.items if not i[1]]
        for sec, ok, label, detail in self.items:
            if not ok:
                print(f"  [FAIL] {sec} / {label}" + (f" —— {detail}" if detail else ""))
        print(f"\n共 {total} 项，通过 {total - len(bad)}，失败 {len(bad)}")
        return len(bad)


# --------------------------------------------------------------------------
# 冻结基线（逐字符，与计划冻结表一致）
# --------------------------------------------------------------------------
P_ORIGIN = "我们的名字来自《三体》里的一支舰队。"
P_WORK = "我们主要记录一些自己觉得有价值的东西。"
P_FOUNDED = "报社成立于2024年。"

BLOCKS = [
    ("origin-title", "名称由来", P_ORIGIN),
    ("work-title", "主要工作与报道方向", P_WORK),
    ("founded-title", "成立时间", P_FOUNDED),
]

HAS_SPACE_ASCII = re.compile(r"[ \u00a0\u3000]")


def main():
    r = Report()
    with open(INDEX, "rb") as f:
        raw = f.read()
    r.begin("文件级")
    r.check(not raw.startswith(b"\xef\xbb\xbf"), "index.html 无 UTF-8 BOM")
    r.check(b"\r" not in raw, "index.html 使用 LF 换行，无 CR")
    try:
        src = raw.decode("utf-8")
        r.check(True, "index.html 为合法 UTF-8")
    except UnicodeDecodeError as e:
        r.fail("index.html 为合法 UTF-8", str(e))
        print(r.summary())
        return 1

    dom, perr = parse(src)
    r.check(not perr, "HTML 可解析且无游离结束标签", "; ".join(perr))

    html = next(dom.walk())
    head = None
    body = None
    for n in dom.walk():
        if n.tag == "head":
            head = n
        elif n.tag == "body":
            body = n

    def find(tag, node=None):
        return [n for n in (node or dom).walk() if n.tag == tag]

    def one(tag, node=None):
        els = find(tag, node)
        return els[0] if len(els) == 1 else None

    all_els = list(dom.walk())
    ids = {}
    for n in all_els:
        v = n.attr("id")
        if v is not None:
            ids.setdefault(v, []).append(n)
    dup = {k: v for k, v in ids.items() if len(v) > 1}

    # ---------------------------------------------------------------- 公共壳
    r.begin("公共壳回归")
    r.eq(html.attr("lang"), "zh-CN", '<html lang="zh-CN"> 保持')
    r.check("no-js" in (html.attr("class") or "").split(), "html.class 仍含 no-js")
    title = one("title", head)
    r.eq(title.text() if title else None, "《自然选择号》报社简介｜自然选择号",
         "<title> 文本逐字保持")
    meta_cs = [n for n in find("meta", head) if n.attr("charset")]
    r.check(len(meta_cs) == 1 and meta_cs[0].attr("charset").lower() == "utf-8",
            "唯一 UTF-8 charset 声明")
    meta_vp = [n for n in find("meta", head) if n.attr("name") == "viewport"]
    r.eq(meta_vp[0].attr("content") if meta_vp else None,
         "width=device-width, initial-scale=1", "响应式 viewport 保持")
    links = [n for n in find("link", head)]
    css = [n for n in links if "stylesheet" in (n.attr("rel") or "")]
    r.check(len(css) == 1 and css[0].attr("href") == "styles.css",
            "styles.css 以同目录相对路径引用一次")
    scripts = find("script", head) + find("script", body)
    ext = [n for n in scripts if n.attr("src")]
    r.check(len(ext) == 1 and ext[0].attr("src") == "script.js" and ext[0].has_attr("defer"),
            "script.js 以同目录相对路径 + defer 引用一次")
    r.check(len(scripts) == len(ext), "页面不存在内联 <script>")

    skip = [n for n in find("a") if "skip-link" in n.classes]
    r.check(len(skip) == 1 and skip[0].attr("href") == "#main-content",
            "唯一跳至正文链接指向 #main-content")
    r.eq(one("main") is not None, True, "存在唯一 <main>")
    r.eq(len(find("main")), 1, "页面只有 1 个 <main>")
    r.check(one("main").attr("tabindex") == "-1", "#main-content 保留 tabindex=-1")

    header = one("header")
    mast = [n for n in find("a", header) if "site-masthead__link" in n.classes]
    r.check(len(mast) == 1 and mast[0].text() == "自然选择号"
            and mast[0].attr("href") == "index.html",
            "报头“自然选择号”仍链接 index.html")

    nav = one("nav", header)
    r.check(nav is not None and nav.attr("aria-label") == "主导航", "nav[aria-label=主导航] 保持")
    nav_links = find("a", nav)
    r.eq([a.text() for a in nav_links], ["首页", "新闻消息", "新闻通讯", "新闻评论"],
         "四项导航文本与顺序保持")
    r.eq([a.attr("href") for a in nav_links],
         ["index.html", "news-message.html", "news-feature.html", "news-commentary.html"],
         "四项导航链接保持")
    cur = [a for a in find("a") if a.has_attr("aria-current")]
    r.check(len(cur) == 1 and cur[0].attr("aria-current") == "page"
            and cur[0].text() == "首页",
            "全页恰好只有“首页”带 aria-current=page")
    btn = one("button", header)
    r.check(btn is not None and btn.attr("id") == "nav-toggle"
            and btn.attr("type") == "button"
            and btn.attr("aria-controls") == "site-navigation"
            and btn.attr("aria-expanded") == "false",
            "菜单按钮 ID/type/aria-controls/aria-expanded 不变")
    tog_txt = [n for n in find("span", btn) if "nav-toggle__text" in n.classes]
    r.eq([t.text() for t in tog_txt], ["菜单"], "菜单按钮可见文本不变")
    tog_icon = [n for n in find("span", btn) if "nav-toggle__icon" in n.classes]
    r.check(len(tog_icon) == 1 and tog_icon[0].attr("aria-hidden") == "true",
            "nav-toggle__icon 仍 aria-hidden=true")

    # ------------------------------------------------------------ DOM 结构合同
    r.begin("DOM 结构")
    h1s = find("h1")
    r.eq(len(h1s), 1, "页面恰好 1 个 <h1>")
    r.eq(h1s[0].text(), "《自然选择号》报社简介", "<h1> 文本保持")
    r.eq(h1s[0].classes, ["page-title"], "<h1> class 仍为 page-title")
    main_el = one("main")
    r.eq([c for c in main_el.classes], ["main-content"], "<main> class 仍为 main-content")
    r.eq(len(find("h3", main_el)) + len(find("h4", main_el))
         + len(find("h5", main_el)) + len(find("h6", main_el)), 0, "正文无 h3~h6，层级不跳级")

    kids = main_el.elements()
    r.eq([k.tag for k in kids], ["h1", "div"],
         "#main-content 直接元素子节点（忽略空白文本）恰为 h1 → div")
    r.eq([k.classes for k in kids], [["page-title"], ["home-sections"]],
         "直接子节点 class 分别为 page-title / home-sections")
    ws_ok = all((c.strip() == "") for c in main_el.children if isinstance(c, str))
    r.check(ws_ok, "#main-content 的非元素子节点均为排版空白")

    groups = [n for n in find("div", main_el) if "home-sections" in n.classes]
    r.eq(len(groups), 1, "正文恰好 1 个 .home-sections")
    grp = groups[0] if groups else Node("#missing", [], main_el)
    secs = grp.elements()
    r.eq(len(secs), 3, ".home-sections 恰好 3 个直接子元素")
    r.eq([s.tag for s in secs], ["section"] * 3, "三个子元素均为 <section>")
    r.eq([s.classes for s in secs], [["home-section"]] * 3, "三个 section 的 class 均为 home-section")
    r.eq(len(find("section", main_el)), 3, "正文恰好 3 个 <section>")
    r.eq(len(find("h2", main_el)), 3, "正文恰好 3 个区块 <h2>")
    r.eq(len(find("article", main_el)) + len(find("aside", main_el))
         + len(find("details", main_el)), 0, "未使用 article/aside/details")
    for s in secs:
        r.check(s.attr("role") is None, "section 未使用 ARIA widget role")

    for idx, (tid, h2txt, ptxt) in enumerate(BLOCKS, start=1):
        if idx > len(secs):
            r.fail(f"区块{idx} 缺失", "该位置的 <section> 不存在")
            continue
        sec = secs[idx - 1]
        inner = sec.elements()
        r.eq([i.tag for i in inner], ["h2", "p"],
             f"区块{idx} 只含 h2 → p 两个元素子节点且顺序正确")
        r.eq([i.classes for i in inner],
             [["home-section__title"], ["home-section__text"]],
             f"区块{idx} h2/p 的 class 正确")
        h2 = next((i for i in inner if i.tag == "h2"), None)
        p = next((i for i in inner if i.classes == ["home-section__text"]), None)
        if h2 is None or p is None:
            r.fail(f"区块{idx} 标题或文本节点不可定位")
            continue
        r.eq(h2.text(), h2txt, f"区块{idx} <h2> 文本逐字正确")
        r.eq(h2.attr("id"), tid, f"区块{idx} <h2 id> 为 {tid}")
        r.eq(sec.attr("aria-labelledby"), tid,
             f"区块{idx} aria-labelledby 精确指向本区块标题 {tid}")
        r.check(h2.attr("aria-label") is None and sec.attr("aria-label") is None,
                f"区块{idx} 未添加冗余 aria-label")
        r.eq(p.text(), ptxt, f"区块{idx} <p> textContent 逐字符等于冻结值")
        r.check(all((c.strip() == "") for c in sec.children if isinstance(c, str)),
                f"区块{idx} section 内非元素子节点均为排版空白")

    # aria-labelledby 解析目标 = 本区块唯一 h2
    for sec in secs:
        ref = sec.attr("aria-labelledby")
        target = [n for n in all_els if n.attr("id") == ref]
        r.check(len(target) == 1 and target[0].tag == "h2"
                and target[0] in sec.elements(),
                f"aria-labelledby={ref} 解析到本区块内唯一 h2")

    r.eq([ids.get(t, [None])[0].tag if t in ids else None
          for t, _, _ in BLOCKS], ["h2"] * 3, "三个标题 ID 均存在且挂在 h2 上")
    r.check(not dup, "页面不存在重复 ID", f"重复: {sorted(dup)}")
    shell_ids = {"main-content", "nav-toggle", "site-navigation"}
    r.check(not (shell_ids & {t for t, _, _ in BLOCKS}),
            "区块标题 ID 未与公共壳 ID 冲突")

    # 标题层级序列
    headings = [(n.tag, n) for n in all_els if re.fullmatch(r"h[1-6]", n.tag)]
    r.eq([t for t, _ in headings], ["h1", "h2", "h2", "h2"],
         "全文标题序列恰为 h1 → 三个同级 h2")

    # -------------------------------------------------------------- 可见白名单
    r.begin("可见内容白名单")
    visible = [n.text() for n in main_el.walk()
               if n.tag in ("h1", "h2", "p") and n.text().strip()]
    r.eq(visible, ["《自然选择号》报社简介",
                   "名称由来", P_ORIGIN,
                   "主要工作与报道方向", P_WORK,
                   "成立时间", P_FOUNDED],
         "正文可见文本恰为 7 项且顺序正确（无第 8 项）")
    r.eq([n.tag for n in main_el.walk() if n.tag == "p"], ["p"] * 3,
         "正文只有 3 个 <p>，无额外段落")

    # -------------------------------------------------------------- 文本保真
    r.begin("文本保真")
    ps = [n for n in main_el.walk() if n.classes == ["home-section__text"]]
    r.eq(len(ps), 3, "可定位到 3 个 .home-section__text 段落")
    for p, expect in zip(ps, [P_ORIGIN, P_WORK, P_FOUNDED]):
        t = p.text()
        r.eq(t, expect, "段落文本未经 trim/归一化改动")
        r.check(t == t.strip(), "段落首尾无多余空白")
        r.check(not HAS_SPACE_ASCII.search(t), "段内不含半角空格/全角空格")
        r.check(t.endswith("。") and not t.endswith("。。"), "以单个中文句号结尾")
        r.check("：" not in t and ":" not in t, "段内不含冒号前缀")
        r.check('"' not in t and "“" not in t and "”" not in t, "段内不含引号")
        inner_txt = [c for c in p.children if isinstance(c, str)]
        r.check(len(p.elements()) == 0 and len(inner_txt) == 1,
                "段落内只有单个纯文本节点，无内联标记")
        r.check("<br" not in src, "整页未使用 <br> 人工断行")
        r.check("&nbsp;" not in src, "未插入 &nbsp; 调整版面")
    r.check(len(ps) == 3 and "2024年" in ps[2].text() and "2024 年" not in ps[2].text(),
            "成立于 2024 年：数字与“年”之间无空格")
    r.check(len(ps) == 3 and "《三体》" in ps[0].text(), "名称由来含需显示的书名号《三体》")
    for p in ps:
        r.check(p.has_attr("title") is False and p.attr("aria-label") is None,
                "文本未放入 title/aria-label")
        r.check(not any(k.startswith("data-") for k, _ in p.attrs),
                "文本未放入 data-* 属性")
    for slot in ("P_ORIGIN", "P_WORK", "P_FOUNDED"):
        r.check(slot not in src, f"源码中不存在内部槽位名 {slot}")
    r.check(not re.search(r"\[[^\]\n]{0,40}(经确认|占位|待补充|示例)[^\]\n]{0,40}\]", src),
            "不存在方括号计划说明")
    for bad in ("暂无资料", "待补充", "成立时间未知", "名称由来：", "简介：", "答："):
        r.check(bad not in src, f"不含自行拟定文字“{bad}”")
    hidden = [n for n in main_el.walk()
              if n.attr("hidden") is not None or "sr-only" in n.classes
              or "visually-hidden" in n.classes or n.attr("aria-hidden") == "true"]
    r.eq(len(hidden), 0, "正文无仅供屏幕阅读器的隐藏节点")
    main_src = src[src.index("<main"):src.index("</main>")]
    r.check("<!--" not in main_src, "正文范围内无 HTML 注释承载内容")

    # -------------------------------------------------------------- 禁止项
    r.begin("禁止项")
    for tag in ("img", "svg", "picture", "video", "audio", "iframe", "canvas",
                "form", "input", "textarea", "select", "footer", "nav", "ul",
                "ol", "li", "table", "time", "figure", "blockquote", "a",
                "strong", "em", "b", "i", "u", "mark", "code", "span", "button",
                "h3", "br"):
        r.eq(len(find(tag, main_el)), 0, f"正文内无 <{tag}>")
    r.check("厨一枚" not in src and "胡桃" not in src, "不含作者名/无关人名")
    r.check("2026" not in src, "不含由文件属性推断的 2026")
    r.check("datetime" not in src, "不含 datetime 机器可读时间")
    r.check(not re.search(r"\b(1月|3月|9月)\d{1,2}日", src), "未补入新闻月日")
    r.check(not re.search(r"https?://|//fonts\.|@import", src), "不含外部 URL / 联网字体")
    r.check(not re.search(r"\son[a-z]+\s*=", src), "不含内联事件处理器")
    r.check(not re.search(r"\b(fetch|XMLHttpRequest|import\s*\()\b", src), "不含运行时数据请求")
    r.check(not re.search(r"\bstyle\s*=", src), "不含内联 style 属性")
    r.check(len(find("style")) == 0, "页面不含专属 <style>")
    r.check(not re.search(r"url\s*\(", src), "不含 url() 资源引用")
    r.check(src.count("<body") == 1, "单一 <body>")
    body_el = one("body")
    extra_body_cls = [c for c in body_el.classes if c not in ()]
    r.eq(extra_body_cls, [], "未新增页面专属 body class")

    # -------------------------------------------------------------- 范围核对
    r.begin("范围与交接")
    r.eq(sorted(os.listdir(RESULTS)),
         ["index.html", "news-commentary.html", "news-feature.html",
          "news-message.html", "styles.css"],
         "Results/ 目录文件集合未因本任务扩张（无脚本/截图/JSON）")
    for name in ("news-message.html", "news-feature.html", "news-commentary.html",
                 "styles.css"):
        p = os.path.join(RESULTS, name)
        r.check(os.path.getmtime(p) < os.path.getmtime(INDEX),
                f"{name} 未在本任务修改（mtime 早于 index.html）")
    mats = os.path.join(ROOT, "Materials")
    if os.path.isdir(mats):
        newest = max(os.path.getmtime(os.path.join(mats, f))
                     for f in os.listdir(mats)
                     if os.path.isfile(os.path.join(mats, f)))
        r.check(newest < os.path.getmtime(INDEX), "Materials/ 未被本任务修改")
    for p, expect in zip(ps, [P_ORIGIN, P_WORK, P_FOUNDED]):
        r.check(f'>{expect}<' in src, f"冻结文本以单行字面量存在于源码（不依赖脚本注入）")
    for cls in ("home-sections", "home-section", "home-section__title", "home-section__text"):
        r.check(f'class="{cls}"' in src, f"样式接口 class .{cls} 已提供")
    r.eq(grp.attr("aria-labelledby"), None, ".home-sections 外层无多余标注")
    deco = [n for n in grp.walk() if not n.text().strip() and n.tag in ("div", "span", "hr", "p")]
    r.eq(len(deco), 0, "未添加无语义空装饰节点")

    # -------------------------------------------------------------- 无 CSS 依赖
    r.begin("无样式与无脚本")
    order = [n.text() for n in main_el.walk() if n.tag in ("h1", "h2", "p")]
    expect_order = ["《自然选择号》报社简介", "名称由来", P_ORIGIN,
                    "主要工作与报道方向", P_WORK, "成立时间", P_FOUNDED]
    r.eq(order, expect_order, "源码顺序即阅读顺序（禁用 CSS 仍可顺序阅读）")
    r.check("getElementById" not in src and "querySelector" not in src,
            "首页内容不经脚本查询/注入")

    print(f"检查项覆盖：公共壳 / DOM 结构 / 文本保真 / 白名单 / 禁止项 / 范围 / 渐进增强")
    return r.summary()


if __name__ == "__main__":
    sys.exit(1 if main() else 0)
