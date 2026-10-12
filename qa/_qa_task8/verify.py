#!/usr/bin/env python3
"""Task 8 静态验收：Results/styles.css 移动端区段合同 + 变更边界 + 文本不变。

只读检查，不修改交付文件。QA-only。
支持 QA_RESULTS=<目录> 指向副本以对变异体运行同一套断言。
"""
import hashlib
import json
import os
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]
RESULTS = Path(os.environ.get("QA_RESULTS", ROOT / "Results"))
BASE = ROOT / "_qa_task8" / "baseline"
TASK1 = ROOT / "plan" / "Task1-素材基线与内容合同.md"
PAGES = ["index.html", "news-message.html", "news-feature.html", "news-commentary.html"]
DELIVERABLES = PAGES + ["styles.css"]

checks = []


def check(name, ok, detail=""):
    checks.append((name, bool(ok), str(detail)))


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def parse_blocks(code):
    """顶层扫描：返回 [(prelude, body)]，body 为 {} 内原始文本。"""
    out, depth, start, pre, prelude = [], 0, 0, 0, ""
    for i, ch in enumerate(code):
        if ch == "{":
            if depth == 0:
                start, prelude = i + 1, code[pre:i]
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                out.append((re.sub(r"\s+", " ", prelude).strip(), code[start:i]))
                pre = i + 1
    return out


css_text = (RESULTS / "styles.css").read_text(encoding="utf-8")
css_bytes = (RESULTS / "styles.css").read_bytes()
code = re.sub(r"/\*.*?\*/", "", css_text, flags=re.S)
TOP = parse_blocks(code)
media_idx = [i for i, (p, _) in enumerate(TOP) if p.startswith("@media")]
MEDIA = [TOP[i] for i in media_idx]
desktop_code = code[: code.index("@media")] if MEDIA else code
mobile_code = MEDIA[0][1] if len(MEDIA) == 1 else ""
MOB = parse_blocks(mobile_code)
mob_sel = [re.sub(r"\s+", " ", s).strip() for s, _ in MOB]
mob_parts = [p.strip() for s, _ in MOB for p in re.split(r",(?![^()]*\))", s)]
mob_body = " ".join(" ".join(b.split()) for _, b in MOB)
all_sel_blob = " ".join(re.sub(r"\s+", " ", s) for s, _ in TOP)

# --- 1. 变更范围与文件集合 ---
present = sorted(p.name for p in RESULTS.iterdir())
check("Results/ 恰为 5 个交付文件", present == sorted(DELIVERABLES), ",".join(present))
check("Task 8 未创建 script.js（Task 9 交付物）", not (RESULTS / "script.js").exists())
base_html = {v: k for k, v in re.findall(r"^([0-9a-f]{64}) \*?(Results/[\w.\-]+)$",
                                         (BASE / "html.sha256.txt").read_text(encoding="utf-8").replace("\r", ""), re.M)}
for p in PAGES:
    check(f"HTML 未被 Task 8 改动 {p}",
          sha(RESULTS / p) == base_html.get("Results/" + p), sha(RESULTS / p)[:16])
check("styles.css 哈希确已改变（唯一变更的正式文件）",
      sha(RESULTS / "styles.css") != sha(BASE / "styles.before.css"))
before_css = (BASE / "styles.before.css").read_text(encoding="utf-8")
check("Task 8 只在文件末尾追加（桌面区段逐字节未变）",
      css_text.startswith(before_css), f"len {len(before_css)} -> {len(css_text)}")
baseline_blob = (BASE / "html.sha256.txt").read_bytes()
FROZEN = {"新闻消息.docx": "de10b575399e0563430f2f255c956b179c9978c087897a24910ad70d6a50f6fc",
          "新闻通讯.docx": "0c5b35256b7271acfb2f49aec146288b404ed49c376ac2c8b3f6246b38f894a4",
          "新闻评价.docx": "8e50cfc89287035163d5fe95c8b1cee20a5aa405e9d04ec358fb5c9312c3827c"}
for f, h in FROZEN.items():
    check(f"Word 素材哈希仍为 Task 1 冻结值 {f}",
          h.encode() in baseline_blob and sha(ROOT / "Materials" / f) == h, sha(ROOT / "Materials" / f)[:16])
raw = css_bytes
check("CSS 为 UTF-8 无 BOM 普通文本", not raw.startswith(b"\xef\xbb\xbf") and
      not re.search(rb"[\x00-\x08\x0b\x0c\x0e-\x1f]", raw))
try:
    css_bytes.decode("utf-8")
    check("CSS 可按 UTF-8 解码", True)
except UnicodeDecodeError as e:
    check("CSS 可按 UTF-8 解码", False, e)

# --- 2. 媒体查询边界 ---
check("恰好一个移动端 @media", len(MEDIA) == 1, " | ".join(p for p, _ in MEDIA))
check("@media 条件精确为 max-width: 768px", MEDIA and MEDIA[0][0] == "@media (max-width: 768px)",
      MEDIA[0][0] if MEDIA else "none")
check("@media 位于全部桌面规则之后",
      all(not p.startswith("@media") for p, _ in TOP[:-1]) and TOP[-1][0].startswith("@media"))
check("桌面部分不含 @media", "@media" not in desktop_code)
for bad in [r"max-width\s*:\s*76[0-7]px", r"max-width\s*:\s*7[7-9]\dpx", r"min-width\s*:\s*76[0-9]px",
            r"48rem", r"min-device-width", r"max-device-width", r"\(\s*hover\s*:", r"pointer\s*:",
            r"orientation\s*:"]:
    check(f"断点误写不存在的查询 {bad}", not re.search(bad, code), "".join(re.findall(bad, code)))
check("整体花括号配对", code.count("{") == code.count("}"), f"{code.count('{')}/{code.count('}')}")
check("媒体查询内花括号自洽", mobile_code.count("{") == mobile_code.count("}"),
      f"{mobile_code.count('{')}/{mobile_code.count('}')}")
check("移动区段无空规则体", not re.search(r"\{\s*\}", mobile_code))
check("移动区段声明均以分号结束",
      all(re.fullmatch(r"(?:[\w-]+\s*:\s*[^;]+;\s*)+", " ".join(b.split())) or not b.strip() for _, b in MOB),
      " | ".join(s for s, b in MOB if not re.fullmatch(r"(?:[\w-]+\s*:\s*[^;]+;\s*)+", " ".join(b.split())))[:180])
check("无 SCSS/嵌套/其它 at-rule 残留",
      not re.search(r"@import|@use|@layer|@supports|@keyframes|^\s*&", code, re.M))

# --- 3. 选择器合同 ---
ALLOWED = re.compile(
    r"^(:(?:root|focus-visible)|\.site-header(__inner)?|\.site-masthead(__link)?|\.main-content|"
    r"\.page-title|\.home-sections|\.home-section|\.home-section__title|\.home-section__text|"
    r"\.article|\.article__header|\.article__type|\.article__byline|\.article__body|"
    r"\.article__body > p|\.article__date|\.dateline|\.nav-toggle|\.nav-toggle__icon|"
    r"\.nav-toggle__icon::(?:before|after)|\.nav-toggle\[aria-expanded=\"true\"\][\w:.\"=\[\]\s-]*|"
    r"\.js \.nav-toggle|\.no-js \.nav-toggle|\.site-navigation|\.site-navigation\.is-open|"
    r"\.js \.site-navigation(?:\.is-open)?|\.no-js \.site-navigation|"
    r"\.site-navigation__list|\.site-navigation__item(?: \+ \.site-navigation__item)?|"
    r"\.site-navigation__link|\.skip-link)$")
for s in mob_parts:
    check(f"移动选择器在许可接口集合内 {s}", bool(ALLOWED.match(s)), "")
check("未使用 ID 选择器", not re.search(r"(^|[\s,>+~])#[A-Za-z][\w-]*", all_sel_blob),
      ",".join(re.findall(r"(?:^|[\s,>+~])(#[A-Za-z][\w-]*)", all_sel_blob)))
check("无 :root 后代选择器（Task3 该条为 blob 拼接误报）",
      not any(re.match(r"^:root\s+\S", s) for s in mob_parts + [p for p, _ in TOP]))
for bad in [":nth-child", ":nth-of-type", "body.index", "body.home", ".mobile-", ".message-",
            ".feature-", ".commentary-", ".news-commentary-", ".nowrap", ".technical-term",
            "index.html", "新闻评论页"]:
    check(f"无禁用选择器/页面专属补丁 {bad}", bad not in code)
check("唯一展开状态类为 .site-navigation.is-open",
      ".site-navigation.is-open" in " ".join(mob_parts) and
      not re.search(r"\.(?:open|active-menu|menu-visible)\b", code))
check("未用 html.js/no-js 识别页面类型",
      not re.search(r"\.(?:js|no-js)\s*\.(?:index|home|article|page)", code))

# --- 4. 禁止的声明 ---
FORBIDDEN = {
    "!important": r"!important", "100vw": r"100vw", "word-break: break-all": r"word-break\s*:\s*break-all",
    "overflow-x hidden/clip": r"overflow-x\s*:\s*(?:hidden|clip)",
    "overflow hidden/clip/scroll/auto": r"overflow(?:-y)?\s*:\s*(?:hidden|clip|scroll|auto)",
    "text-overflow": r"text-overflow", "line-clamp": r"line-clamp",
    "固定高度": r"(?<![\w-])(?:max-|min-)?height\s*:\s*\d+(?:px|rem|em|vh)",
    "height px": r"(?<![\w-])height\s*:\s*\d+(?:px|vh)", "opacity": r"(?<![\w-])opacity\s*:",
    "visibility": r"visibility\s*:", "white-space: nowrap": r"white-space\s*:\s*nowrap",
    "transition/animation": r"(?<![\w-])(?:transition|animation)(?:-[\w-]+)?\s*:",
    "position fixed/sticky": r"position\s*:\s*(?:fixed|sticky)",
    "columns": r"column-count|column-width|(?<![\w-])columns\s*:",
    "transform scale/translate": r"transform\s*:\s*(?:scale|translate)",
    "zoom": r"(?<![\w-])zoom\s*:", "box-shadow": r"box-shadow", "border-radius": r"border-radius",
    "text-transform": r"text-transform", "url 资源": r"url\s*\(", "background 色值": r"#[0-9a-fA-F]{3,8}",
    "font-family 重写": r"font-family\s*:", "页面专属 max-width px": r"(?<![\w-])max-width\s*:\s*\d+px",
}
for label, pat in FORBIDDEN.items():
    hits = re.findall(pat, mobile_code)
    check(f"移动区段禁止项：无 {label}", not hits, str(hits[:3]))
contents = re.findall(r"(?<![\w-])content\s*:\s*([^;]+);", mobile_code)
bsizes = re.findall(r"(?<![\w-])((?:max-|min-)?block-size)\s*:\s*([^;]+);", mobile_code)
check("block-size 类声明仅 44px 触控下限与 2px 装饰线",
      all(v.strip() in ("44px", "2px") for k, v in bsizes), str(bsizes))
check("内容容器无任何固定高度",
      not re.search(r"(?<![\w-])(?:max-|min-)?(?:height|block-size|inline-size)\s*:\s*\d+(?:px|rem|em|vh)",
                    " ".join(b for s_, b in MOB
                            if re.match(r"^\.(?:main-content|article|page-title|home|site-masthead|site-header)", s_))),
      " ".join(s_ for s_, b in MOB if re.match(r"^\.(?:main-content|article|page-title|home|site-masthead|site-header)", s_)))
check("content 只用于空字符串装饰", all(c.strip() in ('""', "''") for c in contents), str(contents))
check("伪元素 content 未注入菜单/日期/正文文字",
      not re.search(r"content\s*:\s*[\"'“‘][^\"'”’]", mobile_code))
check("移动区段不重新声明颜色变量",
      not re.search(r"--(?:color|font|layout|reading|title|line-height|rule|focus|space)[\w-]*\s*:",
                    " ".join(b for s, b in MOB if s == ":root") .replace("--page-gutter", "X")
                    .replace("--font-size-reading", "Y").replace("--font-size-section-title", "Z")
                    .replace("--font-size-page-title", "W").replace("--font-size-masthead", "V"),
                    re.M))
root_mobile = [b for s, b in MOB if s == ":root"]
check("移动 :root 只覆盖合同 5 个尺寸变量",
      len(root_mobile) == 1 and sorted(re.findall(r"(--[\w-]+)\s*:", root_mobile[0])) ==
      sorted(["--page-gutter", "--font-size-reading", "--font-size-section-title",
              "--font-size-page-title", "--font-size-masthead"]),
      str(re.findall(r"(--[\w-]+)\s*:", root_mobile[0]) if root_mobile else "none"))
check("未隐藏任何正文/标题内容",
      not re.search(r"\.(?:page-title|article__body|article__header|home-section\w*|article__date)[^{]*\{[^}]*display\s*:\s*none",
                    mobile_code))

# --- 5. 状态矩阵与 44px ---
def mob_decl(sel, prop):
    out = []
    for s, b in MOB:
        if re.sub(r"\s+", " ", s).strip() == sel:
            out += re.findall(rf"(?<![\w-]){prop}\s*:\s*([^;]+);", " ".join(b.split()))
    return out


check("存在 .js .nav-toggle 显示规则", mob_decl(".js .nav-toggle", "display") == ["flex"] or
      mob_decl(".js .nav-toggle", "display") == ["inline-flex"], str(mob_decl(".js .nav-toggle", "display")))
check("存在 .no-js .nav-toggle 隐藏规则", mob_decl(".no-js .nav-toggle", "display") == ["none"])
check("存在 .js .site-navigation 折叠规则", mob_decl(".js .site-navigation", "display") == ["none"])
check("展开与降级常显规则同体存在",
      any(".js .site-navigation.is-open" in s and ".no-js .site-navigation" in s for s, _ in MOB))
check("按钮最小点击尺寸声明 44px",
      "44px" in " ".join(mob_decl(".js .nav-toggle", "min-inline-size") + mob_decl(".js .nav-toggle", "min-block-size")),
      str(mob_decl(".js .nav-toggle", "min-*")))
check("导航链接最小高度声明 44px", "44px" in " ".join(mob_decl(".site-navigation__link", "min-block-size")),
      str(mob_decl(".site-navigation__link", "min-block-size")))
check("列表纵向且清除桌面 gap",
      mob_decl(".site-navigation__list", "flex-direction") == ["column"] and
      mob_decl(".site-navigation__list", "gap") in (["0"], ["0px"]),
      str(mob_decl(".site-navigation__list", "flex-direction")) + str(mob_decl(".site-navigation__list", "gap")))
check("移动报头内部改为纵向堆叠",
      mob_decl(".site-header__inner", "flex-direction") == ["column"] and
      mob_decl(".site-header__inner", "display") == ["flex"],
      str(mob_decl(".site-header__inner", "flex-direction")))
check("三条线由现有装饰 span 的伪元素绘制（无 SVG/图片/字体图标）",
      ".nav-toggle__icon::before" in " ".join(mob_parts) and ".nav-toggle__icon::after" in " ".join(mob_parts)
      and not re.search(r"background-image|<svg|\.png|\.svg", mobile_code))
check("展开态关闭符号只改 top/transform/background",
      all(re.fullmatch(r"(?:background|transform|inset-block-start)\s*:\s*[^;]+;", " ".join(b.split()))
          for s, b in MOB if 'aria-expanded="true"' in s), "")
check("移动正文 17px / 标题与报头使用 clamp",
      mob_decl(":root", "--font-size-reading") == ["1.0625rem"] and
      all("clamp(" in " ".join(mob_decl(":root", v)) for v in
          ["--font-size-section-title", "--font-size-page-title", "--font-size-masthead"]))
check("移动 --page-gutter 为 1rem（16px）", mob_decl(":root", "--page-gutter") == ["1rem"])
check("安全换行三属性成组出现",
      ".article__body > p" in " ".join(mob_parts) and "overflow-wrap: anywhere" in mob_body and
      "word-break: normal" in mob_body and "hyphens: none" in mob_body)
check("未给 .dateline 设 display:block",
      not any(s == ".dateline" and "display" in b for s, b in MOB))
check(".article__date 未获得首行缩进",
      not any(re.search(r"article__date[^{]*\{[^}]*text-indent\s*:\s*(?:2em|[\d.]+(?:em|rem|px))",
                        f"{s} {{{b}}}") for s, b in MOB))
check("正文两端对齐在移动改为 start", mob_decl(".article__body", "text-align") == ["start"],
      str(mob_decl(".article__body", "text-align")))
PHYSICAL_MIX = {".main-content": "padding-top", ".article__header": "padding-bottom", ".site-header": "padding-top"}
for sel, prop in PHYSICAL_MIX.items():
    check(f"{sel} 移动覆盖沿用桌面物理属性名 {prop}", mob_decl(sel, prop) != [],
          str([b for s, b in MOB if s == sel]))
check("同一间距不残留逻辑属性冲突",
      not any(re.search(r"padding-block-(?:start|end)", " ".join(b.split())) for s, b in MOB
              if s in PHYSICAL_MIX))

# --- 6. 文本与内容不变 ---
def contract(name):
    txt = TASK1.read_text(encoding="utf-8")
    i = txt.index("### " + name)
    rest = txt[i:]
    j = rest.find("\n### ", 5)
    out = {}
    for line in (j > 0 and rest[:j] or rest).splitlines():
        m = re.match(r"^([A-Za-z_0-9]+)\|(.*)$", line)
        if m:
            out[m.group(1)] = m.group(2)
    return out


M, F, C = contract("新闻消息"), contract("新闻通讯"), contract("新闻评论")
EXPECT = {"news-message.html": [M[f"M{i:02d}"] for i in range(1, 5)],
          "news-feature.html": [F[f"F{i:02d}"] for i in range(1, 24)],
          "news-commentary.html": [C[f"C{i:02d}"] for i in range(1, 30)]}
HOME = ["我们的名字来自《三体》里的一支舰队。", "我们主要记录一些自己觉得有价值的东西。", "报社成立于2024年。"]
for page, exp in EXPECT.items():
    src = (RESULTS / page).read_text(encoding="utf-8")
    body = re.search(r'<div class="article__body">(.*?)</div>', src, re.S).group(1)
    paras = [re.sub(r"<[^>]+>", "", x) for x in re.findall(r"<p>(.*?)</p>", body, re.S)]
    check(f"{page} 段落数 {len(exp)}", len(paras) == len(exp), len(paras))
    check(f"{page} 逐段文本与 Task 1 合同逐项严格相等", paras == exp,
          "首个差异 index=" + str(next((i for i, (a, b) in enumerate(zip(paras, exp)) if a != b), -1)))
src = (RESULTS / "index.html").read_text(encoding="utf-8")
check("index.html 三区块文本逐项等于 Task 4 冻结值",
      re.findall(r'<p class="home-section__text">(.*?)</p>', src) == HOME)
check("通讯页无第 24 段空段", len(re.findall(r"<p>", re.search(r'<div class="article__body">(.*?)</div>',
      (RESULTS / "news-feature.html").read_text(encoding="utf-8"), re.S).group(1))) == 23)
check("评论页日期独立于正文容器且文本不变",
      re.search(r'</div>\s*<p class="article__date">（自然选择号9月18日）</p>\s*</article>',
                (RESULTS / "news-commentary.html").read_text(encoding="utf-8")))
check("电头内联 strong 且其后仍是单个 U+0020",
      (RESULTS / "news-message.html").read_text(encoding="utf-8").count(
          '<strong class="dateline">自然选择号9月18日7时电</strong> 我校') == 1 and
      (RESULTS / "news-feature.html").read_text(encoding="utf-8").count(
          '<strong class="dateline">自然选择号9月17日电</strong> 上午') == 1)
comm = (RESULTS / "news-commentary.html").read_text(encoding="utf-8")
for term, cnt in [("Windows 10", 2), (".exe", 3), ("UOS", 4), ("USB", 4), ("OPS", 1),
                  ("Linux", 1), ("4K", 1), ("86英寸", 1), ("5次碰撞", 1), ("3个U盘", 1)]:
    check(f"评论页术语原样计数 {term}", comm.count(term) == cnt, f"{comm.count(term)} != {cnt}")
check("评论页正文 U+0020 总数仍为 2（两处 Windows 10）",
      sum(p.count(" ") for p in re.findall(r"<p>(.*?)</p>", comm, re.S)) == 2)
for page in PAGES:
    s = (RESULTS / page).read_text(encoding="utf-8")
    check(f"{page} 无 wbr/br/soft-hyphen/零宽字符/nbsp",
          not re.search(r"<wbr|<br|&nbsp;|­|​|‍|﻿", s))
    check(f"{page} 无内联 style / 页面内 <style>", "<style" not in s and not re.search(r"\sstyle\s*=", s))
ALL_RESULTS = "".join((RESULTS / p).read_text(encoding="utf-8") for p in DELIVERABLES)
for banned in ["厨一枚", "胡桃", "2026", "新闻评价", "Lorem", "TODO", "placeholder 未替换"]:
    check(f"禁止内容未进入 Results/：{banned}", banned not in ALL_RESULTS)
check("CSS 未注入作者/日期/电头文本",
      not re.search(r"(自然选择号|蓝色空间|9月1[0-9]日|电)", css_text.split("@media")[1] if "@media" in css_text else ""))

# --- 7. 汇总 ---
failed = [c for c in checks if not c[1]]
out = "\n".join(f"{'PASS' if ok else 'FAIL'}  {n}" + (f"  -> {d}" if (d and not ok) else "")
                for n, ok, d in checks)
if str(RESULTS) != str(ROOT / "Results"):
    Path(os.environ.get("QA_REPORT", BASE / "mutant_report.txt")).write_text(out, encoding="utf-8")
print(out)
print(f"\n共 {len(checks)} 项，通过 {len(checks) - len(failed)}，失败 {len(failed)}")
sys.exit(1 if failed else 0)
