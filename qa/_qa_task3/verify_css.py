#!/usr/bin/env python3
"""Task 3 静态验收：Results/styles.css 合同核对。只读，不修改交付文件。"""
import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
RESULTS = ROOT / "Results"
CSS = RESULTS / "styles.css"
PAGES = ["index.html", "news-message.html", "news-feature.html", "news-commentary.html"]

checks = []


def check(name, ok, detail=""):
    checks.append((name, bool(ok), detail))


text = CSS.read_text(encoding="utf-8")
raw = CSS.read_bytes()

# --- 1. 文件与资源 ---
check("styles.css 存在", CSS.is_file(), f"{CSS} ({len(raw)} bytes)")
check("UTF-8 无 BOM", not raw.startswith(b"\xef\xbb\xbf"))
check("普通文本 CSS（无 NUL/控制字符）",
      not re.search(rb"[\x00-\x08\x0e-\x1f]", raw.replace(b"\n", b"").replace(b"\r", b"").replace(b"\t", b"")))

# 去注释后扫描，避免注释文字误判
code = re.sub(r"/\*.*?\*/", "", text, flags=re.S)

# 规则表：[(规范化的完整选择器, [各逗号分段], 规范化声明体)]
RULES = []
for _sel, _body in re.findall(r"([^{}]+)\{([^{}]*)\}", code):
    _sel = re.sub(r"\s+", " ", _sel).strip()
    RULES.append((_sel, [p.strip() for p in _sel.split(",")], " ".join(_body.split())))


def rules_for(sel):
    """返回选择器分段精确等于 sel 的所有声明体（含分组选择器）。"""
    return [b for _, parts, b in RULES if sel in parts]


def block(sel):
    """返回完整选择器恰为 sel 的单一声明体。"""
    hits = [b for s, _, b in RULES if s == sel]
    return hits[0] if hits else ""


def decl(sel, prop):
    """返回该选择器（含分组）中某个属性的最后取值。"""
    vals = [re.findall(rf"(?<![\w-]){prop}\s*:\s*([^;]+);", b) for b in rules_for(sel)]
    return [v for sub in vals for v in sub]

forbidden_res = {
    "@import": r"@import",
    "@font-face": r"@font-face",
    "url( 资源引用": r"url\s*\(",
    "http://": r"http://",
    "https://": r"https://",
    "// 协议相对": r"(?<!:)//[a-z0-9.-]+\.[a-z]{2,}",
    "本机盘符路径": r"[A-Za-z]:[\\/]",
}
for label, pat in forbidden_res.items():
    m = re.search(pat, code)
    check(f"禁止资源：无 {label}", not m, m.group(0) if m else "")

for p in PAGES:
    html = (RESULTS / p).read_text(encoding="utf-8")
    links = re.findall(r'<link[^>]*>', html)
    check(f"{p} 仅引用 styles.css",
          all('href="styles.css"' in l for l in links) and len(links) == 1, str(links))
    check(f"{p} 无 <style> 内联样式表", "<style" not in html)
    check(f"{p} 无 style= 属性", not re.search(r"\sstyle\s*=", html))

extra = sorted(x.name for x in RESULTS.iterdir()
               if x.name not in PAGES + ["styles.css"])
check("Results/ 无 Task 3 范围外新文件", not extra, ",".join(extra))

# Task 2 公共接口在四页中数量一致，样式无需为重复容器写专用规则
for p in PAGES:
    html = (RESULTS / p).read_text(encoding="utf-8")
    counts = {
        ".skip-link": len(re.findall(r'class="[^"]*\bskip-link\b', html)),
        ".site-header": len(re.findall(r'class="[^"]*\bsite-header\b"', html)),
        ".site-masthead": len(re.findall(r'class="site-masthead"', html)),
        ".site-navigation": len(re.findall(r'class="site-navigation"', html)),
        ".site-navigation__link": len(re.findall(r'class="site-navigation__link"', html)),
        ".main-content": len(re.findall(r'class="main-content"', html)),
        ".page-title": len(re.findall(r'class="page-title"', html)),
        "nav 元素": len(re.findall(r"<nav\b", html)),
        "h1 元素": len(re.findall(r"<h1\b", html)),
        "stylesheet 引用": len(re.findall(r'<link[^>]*rel="stylesheet"', html)),
    }
    expect = {".skip-link": 1, ".site-header": 1, ".site-masthead": 1, ".site-navigation": 1,
              ".site-navigation__link": 4, ".main-content": 1, ".page-title": 1,
              "nav 元素": 1, "h1 元素": 1, "stylesheet 引用": 1}
    wrong = {k: v for k, v in counts.items() if v != expect[k]}
    check(f"{p} 公共接口数量符合 Task 2 合同", not wrong, str(wrong))

# --- 2. 变量合同 ---
required_vars = {
    "--color-paper": "#f5efe4", "--color-ink": "#211f1c", "--color-muted": "#665d56",
    "--color-accent": "#7a2424", "--color-rule": "#b8aa98",
    "--font-serif": '"Songti SC", "STSong", "SimSun", serif',
    "--layout-max": "70rem", "--reading-max": "46rem", "--title-max": "52rem",
    "--page-gutter": "2rem",
    "--font-size-small": "0.9375rem", "--font-size-body": "1rem",
    "--font-size-reading": "1.125rem", "--font-size-section-title": "1.5rem",
    "--font-size-page-title": "2.5rem", "--font-size-masthead": "4rem",
    "--line-height-tight": "1.25", "--line-height-ui": "1.5", "--line-height-reading": "1.9",
    "--space-1": "0.25rem", "--space-2": "0.5rem", "--space-3": "0.75rem",
    "--space-4": "1rem", "--space-5": "1.5rem", "--space-6": "2rem",
    "--space-7": "3rem", "--space-8": "4rem",
    "--rule-thin": "1px", "--rule-double": "3px", "--focus-width": "2px",
}
root_block = re.search(r":root\s*\{(.*?)\}", code, re.S)
check("存在 :root 变量块", root_block)
root_body = root_block.group(1) if root_block else ""
root_decls = dict(re.findall(r"(--[\w-]+)\s*:\s*([^;]+);", root_body))
for name, value in required_vars.items():
    got = root_decls.get(name)
    check(f"变量 {name}: {value}", got is not None and got.strip() == value, f"实际={got!r}")

all_decls = re.findall(r"^\s*(--[\w-]+)\s*:", code, re.M)
dupes = sorted({d for d in all_decls if all_decls.count(d) > 1})
check("自定义属性无重复声明", not dupes, ",".join(dupes))
undefined = sorted({v for v in re.findall(r"var\(\s*(--[\w-]+)", code) if v not in root_decls})
check("var() 引用的变量均已定义", not undefined, ",".join(undefined))

# 不允许语义重复的别名变量
alias = sorted(set(re.findall(r"--(?:bg|background|container-width|content-width|max-width|color-primary|font)(?![-\w])", code)))
check("无与合同语义重复的别名变量", not alias, ",".join(alias))

# 字号通过变量引用
for prop, var in [("--font-size-reading", "正文/介绍字号"),
                  ("--font-size-page-title", "页面主标题字号"),
                  ("--font-size-masthead", "报头字号"),
                  ("--font-size-small", "小字号")]:
    used = len(re.findall(rf"var\(\s*{re.escape(prop)}\s*\)", code))
    check(f"{var} 由 {prop} 引用", used >= 1, f"{used} 次")

# --- 3. 结构接口 ---
selectors = [s.strip() for s in re.findall(r"([^{}]+)\{", code) if s.strip()]
sel_blob = " ".join(re.sub(r"\s+", " ", s) for s in selectors)
SEL_PARTS = {re.sub(r"\s+", " ", p) for _, parts, _ in RULES for p in parts}
SEL_RULES = {}
for _s, _parts, _b in RULES:
    for _p in _parts:
        SEL_RULES.setdefault(re.sub(r"\s+", " ", _p).strip(), []).append(_b)

required_selectors = [
    ".skip-link", ".site-header", ".site-header__inner", ".site-masthead",
    ".site-masthead__link", ".nav-toggle", ".site-navigation", ".no-js .site-navigation",
    ".site-navigation__list", ".site-navigation__link",
    '.site-navigation__link[aria-current="page"]',
    ".main-content", ".page-title",
    ".home-sections", ".home-section", ".home-section__title", ".home-section__text",
    ".article", ".article__header", ".article__type", ".article__byline", ".article__body",
    ".article__body > p", ".dateline", ".article__date", ":focus-visible",
]
for s in required_selectors:
    variants = [s, s.replace('"', "'")]
    if s == ":focus-visible":
        hit = any(p.endswith("focus-visible") for p in SEL_PARTS)
    else:
        hit = any(v in SEL_PARTS for v in variants)
    check(f"选择器存在 {s}", hit)

# 首页与文章接口必须逐类存在且带声明（不得用改名选择器蒙混）
for s in [".home-sections", ".home-section", ".home-section__title", ".home-section__text",
          ".article", ".article__header", ".article__type", ".article__byline",
          ".article__body", ".article__body > p", ".dateline", ".article__date"]:
    bodies = " ".join(SEL_RULES.get(s, []))
    check(f"接口 {s} 已定义且含声明", bool(bodies.strip()), f"命中规则={len(SEL_RULES.get(s, []))}")
check("首页接口类名齐全（4 个）",
      all(f".home-{k}" in SEL_PARTS for k in ["sections", "section", "section__title", "section__text"]))
check("文章接口类名齐全（7 个）",
      all(s in SEL_PARTS for s in [".article", ".article__header", ".article__type",
                                   ".article__byline", ".article__body", ".article__body > p",
                                   ".article__date"]))

check("未使用 ID 选择器", not re.search(r"(^|[\s,>+~])#[A-Za-z][\w-]*", sel_blob),
      ",".join(re.findall(r"(?:^|[\s,>+~])(#[A-Za-z][\w-]*)", sel_blob)))
for bad in ["body.index", "body.home", ":nth-child", ":root ."]:
    check(f"无 {bad} 页面识别补丁", bad not in sel_blob)
home_sel = sorted(p for p in SEL_PARTS if re.search(r"\.home", p))
check("首页接口只用合同 .home-* 类",
      all(p in {".home-sections", ".home-section", ".home-section__title", ".home-section__text",
                ".home-section:last-child"} for p in home_sel), ",".join(home_sel))
check("段落缩进选择器限定为 .article__body > p",
      not re.search(r"\.(?:main-content|article)\s+p\b", code))

# --- 4. 禁止项 ---
forbidden_style = {
    "box-shadow": r"box-shadow",
    "text-shadow": r"text-shadow",
    "渐变 gradient": r"(?:linear|radial|conic|repeating-linear|repeating-radial)-gradient",
    "background-image": r"background-image",
    "border-radius": r"border-radius",
    "column-count": r"column-count",
    "column-width": r"column-width",
    "columns 简写": r"(?<![\w-])columns\s*:",
    "column-rule": r"column-rule",
    "overflow-x hidden/clip": r"overflow-x\s*:\s*(?:hidden|clip)",
    "overflow 简写含 hidden/clip": r"overflow(?:-y)?\s*:\s*(?:hidden|clip|scroll|auto)",
    "word-break: break-all": r"word-break\s*:\s*break-all",
    "!important": r"!important",
    "content 注入": r"(?<![\w-])content\s*:",
    "text-transform": r"text-transform",
    "font-style: italic": r"font-style\s*:\s*italic",
    "user-select: none": r"user-select\s*:\s*none",
    "opacity 降低": r"(?<![\w-])opacity\s*:",
    "outline: none/0": r"outline\s*:\s*(?:none|0)\b",
    "appearance 禁用高亮": r"tap-highlight-color",
    "grid 布局": r"display\s*:\s*(?:grid|inline-grid|grid-\w+|flex-grid)|grid-template",
    "position: fixed（除跳转链接）": r"position\s*:\s*fixed",
    "position: sticky": r"position\s*:\s*sticky",
    "transition/animation": r"(?<![\w-])(?:transition|animation)(?:-[\w-]+)?\s*:",
    "transform 位移缩放": r"transform\s*:\s*(?:scale|translate\(\s*-?\d+px|translateX|rotate)",
    "width: 100vw": r"100vw",
    "min-width/max-width px 版心": r"(?<![\w-])(?:max-|min-)?width\s*:\s*\d+px",
    "font-size px 固定根字号": r"html[^{}]*font-size\s*:\s*[\d.]+px",
    "letter-spacing 全局（html/body/*）": r"(?:^|\})\s*(?:html|body|\*)\s*\{[^{}]*letter-spacing",
}
for label, pat in forbidden_style.items():
    hits = re.findall(pat, code)
    if label == "position: fixed（除跳转链接）":
        ok = len(re.findall(r"position\s*:\s*fixed", code)) == 1 and \
            "position: fixed" in code[code.index(".skip-link"):code.index(".skip-link") + 400]
        check(f"仅 .skip-link 使用 position: fixed", ok, f"{hits}")
        continue
    check(f"禁止项：无 {label}", not hits, f"{hits[:3]}")

# white-space: nowrap 只允许出现在导航链接
nowrap_blocks = [b for b in re.findall(r"([^{}]+)\{([^{}]*)\}", code)
                 if re.search(r"white-space\s*:\s*nowrap", b[1])]
check("white-space: nowrap 仅用于导航链接",
      all(".site-navigation__link" in b[0] for b in nowrap_blocks),
      " | ".join(re.sub(r"\s+", " ", b[0]) for b in nowrap_blocks))
check("导航列表桌面端不换行", "flex-wrap: nowrap" in " ".join(rules_for(".site-navigation__list")))

# 移动端媒体查询不属于 Task 3
check("无 @media（含 768px 折叠规则）", "@media" not in code,
      ",".join(re.findall(r"@media[^{]*", code)))

# --- 5. 版心公式 ---
formula = re.search(r"\.site-header__inner,\s*\.main-content\s*\{([^}]*)\}", code, re.S)
check("公共版心公式块存在", formula)
if formula:
    f = " ".join(formula.group(1).split())
    check("版心 width 公式", "calc(100% - var(--page-gutter) - var(--page-gutter))" in f, f)
    check("版心 max-width: var(--layout-max)", "max-width: var(--layout-max)" in f, f)
    check("版心 margin-inline: auto", "margin-inline: auto" in f, f)
    check("版心块无左右 padding", not re.search(r"padding-(?:left|right|inline)\s*:", f), f)

# --- 6. 关键行为断言 ---
b_skip = block(".skip-link")
check("skip-link 默认 translateY(-150%)", "translateY(-150%)" in b_skip, b_skip)
check("skip-link padding >= 0.75rem 1rem",
      re.search(r"padding\s*:\s*var\(--space-3\) var\(--space-4\)|padding:\s*0\.75rem\s+1rem", b_skip), b_skip)
check("skip-link z-index 高于报头", re.search(r"z-index\s*:\s*(\d+)", b_skip)
      and int(re.search(r"z-index\s*:\s*(\d+)", b_skip).group(1)) >= 10, b_skip)
check("skip-link 聚焦恢复 translateY(0)", "translateY(0)" in block(".skip-link:focus"), block(".skip-link:focus"))
check("skip-link 未用 display:none/visibility/opacity 隐藏",
      not re.search(r"display\s*:\s*none|visibility|opacity", b_skip), b_skip)

check("nav-toggle 桌面 display: none", "display: none" in block(".nav-toggle"), block(".nav-toggle"))
check("site-navigation 未隐藏", not re.search(r"display\s*:\s*none|visibility\s*:\s*hidden",
      block(".site-navigation")), block(".site-navigation"))
check("site-navigation 无 overflow 裁切", "overflow" not in block(".site-navigation")
      + block(".site-navigation__list"), "")
check("导航列表 flex + 居中", "display: flex" in block(".site-navigation__list")
      and "justify-content: center" in block(".site-navigation__list"), block(".site-navigation__list"))
check("导航列表清除符号/margin/padding",
      "list-style: none" in block(".site-navigation__list")
      and re.search(r"margin\s*:\s*0", block(".site-navigation__list"))
      and re.search(r"padding\s*:\s*0", block(".site-navigation__list")), block(".site-navigation__list"))
check("导航项目间距约 2.5rem", "gap: 2.5rem" in block(".site-navigation__list"), block(".site-navigation__list"))
check("导航未使用四等分宽度", not re.search(r"25%|flex\s*:\s*1", code))
nav_cur = " ".join(rules_for('.site-navigation__link[aria-current="page"]'))
check("当前页：暗红 + 实线下边框 + 700 字重",
      "var(--color-accent)" in nav_cur and "solid" in nav_cur and "font-weight: 700" in nav_cur, nav_cur)
check("当前页下边框 2px 且为暗红实线",
      re.search(r"border-bottom\s*:\s*(?:var\(--focus-width\)|2px)\s+solid\s+var\(--color-accent\)", nav_cur), nav_cur)
check("当前页状态不得只靠颜色（下边框不能透明/无）",
      "transparent" not in nav_cur and not re.search(r"border-bottom\s*:\s*(?:0|none)", nav_cur), nav_cur)
check("普通导航链接预留 2px 透明下边框",
      re.search(r"border-bottom\s*:\s*(?:var\(--focus-width\)|2px)\s+solid\s+transparent", block(".site-navigation__link")),
      block(".site-navigation__link"))

b_mast = block(".site-masthead")
check("报头上下 double 3px 分隔线",
      b_mast.count("var(--rule-double) double var(--color-rule)") == 2, b_mast)
check("报头居中且 margin 清零", "text-align: center" in b_mast and re.search(r"margin\s*:\s*0", b_mast), b_mast)
b_link = block(".site-masthead__link")
check("报头链接字号/行高/字重", "var(--font-size-masthead)" in b_link
      and "var(--line-height-tight)" in b_link and "font-weight: 700" in b_link, b_link)
check("报头链接不强制 nowrap", "nowrap" not in b_link, b_link)
check("报头链接默认无下划线", "text-decoration: none" in b_link, b_link)

b_title = block(".page-title")
check("页面标题 max-width --title-max + 居中", "var(--title-max)" in b_title
      and "margin: 0 auto" in b_title and "text-align: center" in b_title, b_title)
check("页面标题字号/行高/字重", "var(--font-size-page-title)" in b_title
      and "var(--line-height-tight)" in b_title and "font-weight: 700" in b_title, b_title)
check("页面标题 overflow-wrap: break-word", "overflow-wrap: break-word" in b_title, b_title)

b_body = block(".article__body")
check("正文最大宽度 --reading-max", "var(--reading-max)" in b_body, b_body)
check("正文 18px / 行高 1.9 变量", "var(--font-size-reading)" in b_body
      and "var(--line-height-reading)" in b_body, b_body)
check("正文 justify + inter-ideograph", "text-align: justify" in b_body
      and "text-justify: inter-ideograph" in b_body, b_body)
check("正文 line-break: strict / hyphens: none", "line-break: strict" in b_body and "hyphens: none" in b_body, b_body)
b_p = block(".article__body > p")
check("段落 2em 首行缩进 + margin 清零", "text-indent: 2em" in b_p and re.search(r"margin\s*:\s*0", b_p), b_p)
check("相邻段落间距约 0.75em", "0.75em" in block(".article__body > p + p"), block(".article__body > p + p"))
check("电头只加粗且保持内联", block(".dateline") == "font-weight: 700;", block(".dateline"))
b_date = block(".article__date")
check("评论日期：reading-max + 右对齐 + 无缩进", "var(--reading-max)" in b_date
      and "text-align: right" in b_date and "text-indent: 0" in b_date, b_date)
check("byline 不自动加前缀且非斜体", "before" not in block(".article__byline")
      and "italic" not in block(".article__byline"), block(".article__byline"))

b_main = " ".join(rules_for(".main-content"))
check("主内容 min-width: 0", "min-width: 0" in b_main, b_main)
check("主内容上 3rem / 下 5rem", "padding-top: var(--space-7)" in b_main
      and "padding-bottom: 5rem" in b_main, b_main)
check("主内容未设置左右 padding",
      not re.search(r"padding-(?:left|right|inline)", b_main), b_main)
check("no-js 导航同样 display: block",
      "display: block" in " ".join(rules_for(".no-js .site-navigation")), rules_for(".no-js .site-navigation"))
check("导航容器无固定宽高",
      not re.search(r"(?<![\w-])(?:max-|min-)?(?:width|height)\s*:", " ".join(rules_for(".site-navigation"))),
      " ".join(rules_for(".site-navigation")))

# 色彩使用一致性
for v in ["--color-paper", "--color-ink", "--color-muted", "--color-accent", "--color-rule"]:
    check(f"{v} 被实际使用", len(re.findall(rf"var\(\s*{v}\s*\)", code)) >= 1)
check("正文色未用于大面积底色", len(re.findall(r"background\s*:\s*var\(--color-ink\)", code)) == 0)
check("hex 颜色仅在 :root", not re.search(r"#[0-9a-fA-F]{3,8}\b", code[code.index("}", code.index(":root")) + 1:]))

# --- 7. 语法完整性 ---
check("花括号配对", code.count("{") == code.count("}") and len(RULES) == code.count("{"),
      f"{{={code.count('{')} }}={code.count('}')} rules={len(RULES)}")
check("注释成对闭合", text.count("/*") == text.count("*/"), f"{text.count('/*')}/{text.count('*/')}")
check("无空声明体", not re.search(r"\{\s*\}", code))
check("声明均以分号结束",
      all(re.fullmatch(r"(?:[\w-]+\s*:\s*[^;]+;\s*)+", b) or b == "" for _, _, b in RULES),
      " | ".join(b for _, _, b in RULES if not re.fullmatch(r"(?:[\w-]+\s*:\s*[^;]+;\s*)+", b))[:200])
check("无嵌套/preprocessor 语法残留", not re.search(r"^\s*&|@media|@supports|@layer", code, re.M))

# --- 汇总 ---
failed = [c for c in checks if not c[1]]
for name, ok, detail in checks:
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  -> {detail}" if (detail and not ok) else ""))
print(f"\n共 {len(checks)} 项，通过 {len(checks) - len(failed)}，失败 {len(failed)}")
sys.exit(1 if failed else 0)
