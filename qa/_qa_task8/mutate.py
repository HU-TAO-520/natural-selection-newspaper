#!/usr/bin/env python3
"""Task 8 变异对照：给 styles.css / HTML 注入违约，确认 verify.py 与浏览器探针都能捕获。

QA-only。产物写入 _qa_task8/mutants/，不触碰 Results/。
rc==1 表示记录到真实 FAIL；rc==2 表示脚本崩溃，不算捕获。
"""
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.parse
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]
HERE = ROOT / "_qa_task8"
RESULTS = ROOT / "Results"
MUT = HERE / "mutants"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

# (编号, 变异描述, 目标文件, 原文片段, 替换片段)
CSS = "styles.css"
MUTATIONS = [
    ("M01 断点下界错成 767px", CSS, "@media (max-width: 768px)", "@media (max-width: 767px)"),
    ("M02 断点错成 rem", CSS, "@media (max-width: 768px)", "@media (max-width: 48rem)"),
    ("M03 断点上界含 769px", CSS, "@media (max-width: 768px)", "@media (max-width: 769px)"),
    ("M04 出现第二个同断点区段", CSS, "@media (max-width: 768px) {",
     "@media (max-width: 768px) { .page-title { font-size: 1rem; } }\n@media (max-width: 768px) {"),
    ("M05 移动区段整体前移到桌面规则之前", CSS, "@@MOVE_TOP", "@@MOVE_TOP"),
    ("M06 !important 提高特异性", CSS, "  .main-content {\n    padding-top: var(--space-6);",
     "  .main-content {\n    padding-top: var(--space-6) !important;"),
    ("M07 使用 ID 选择器", CSS, "  .js .nav-toggle {", "  #nav-toggle.js-toggle { display: flex; }\n  .js .nav-toggle {"),
    ("M08 用 100vw 定宽", CSS, "    inline-size: 100%;", "    inline-size: 100vw;"),
    ("M09 掩盖横向溢出", CSS, "  .main-content {\n    padding-top",
     "  body { overflow-x: hidden; }\n  .main-content {\n    padding-top"),
    ("M10 break-all 破坏术语", CSS, "    word-break: normal;", "    word-break: break-all;"),
    ("M11 折叠菜单改为透明度隐藏", CSS, "  .js .site-navigation {\n    display: none;",
     "  .js .site-navigation {\n    opacity: 0;"),
    ("M12 缺失 .js 折叠规则", CSS, "  .js .site-navigation {\n    display: none;\n  }\n", ""),
    ("M13 缺失 no-js 常显兜底", CSS, "  .js .site-navigation.is-open,\n  .no-js .site-navigation {\n    display: block;\n  }\n",
     "  .js .site-navigation.is-open {\n    display: block;\n  }\n"),
    ("M14 缺失 no-js 按钮隐藏", CSS, "  .no-js .nav-toggle {\n    display: none;\n  }\n", ""),
    ("M15 按钮点击区小于 44px", CSS, "    min-block-size: 44px;\n    align-items: center;\n    align-self: flex-end;",
     "    min-block-size: 30px;\n    align-items: center;\n    align-self: flex-end;"),
    ("M16 导航链接点击区不足", CSS, "    min-block-size: 44px;\n    align-items: center;\n    justify-content: center;",
     "    min-block-size: 24px;\n    align-items: center;\n    justify-content: center;"),
    ("M17 桌面 gap 未清除", CSS, "    gap: 0;", "    gap: 2.5rem;"),
    ("M18 列表仍为横向", CSS, "  .site-navigation__list {\n    flex-direction: column;",
     "  .site-navigation__list {\n    flex-direction: row;"),
    ("M19 新增 is-open 别名", CSS, "  .js .site-navigation.is-open,", "  .js .site-navigation.menu-visible,\n  .js .site-navigation.is-open,"),
    ("M20 页面专属 class 补丁", CSS, "  .home-section {\n    padding-block: 1.25rem;",
     "  .home-section.commentary-only {\n    text-indent: 2em;\n  }\n  .home-section {\n    padding-block: 1.25rem;"),
    ("M21 :nth-child 打补丁", CSS, "  .home-section {\n    padding-block: 1.25rem;",
     "  .home-section:nth-child(2) {\n    padding-block: 0;\n  }\n  .home-section {\n    padding-block: 1.25rem;"),
    ("M22 移动端重定义颜色变量", CSS, "    --page-gutter: 1rem;", "    --color-ink: #000000;\n    --page-gutter: 1rem;"),
    ("M23 留白小于 16px", CSS, "    --page-gutter: 1rem;", "    --page-gutter: 0.5rem;"),
    ("M24 正文退回两端对齐", CSS, "    text-align: start;", "    text-align: justify;"),
    ("M25 电头被改为块级", CSS, "  .site-navigation {", "  .dateline {\n    display: block;\n  }\n  .site-navigation {"),
    ("M26 日期获得首行缩进", CSS, "  .article__body {\n    margin-top: var(--space-5);",
     "  .article__date {\n    text-indent: 2em;\n  }\n  .article__body {\n    margin-top: var(--space-5);"),
    ("M27 content 注入文字", CSS, '    content: "";', '    content: "已展开";'),
    ("M28 菜单动画/固定高度", CSS, "  .site-navigation {",
     "  .site-navigation {\n    max-height: 200px;\n    transition: max-height 0.3s;\n    overflow: hidden;\n  }\n  .zz-site-navigation {"),
    ("M29 标题强制不换行", CSS, "  .page-title,", "  .page-titleX {\n    white-space: nowrap;\n  }\n  .page-title,"),
    ("M30 改动桌面基线（重写 Task 3）", CSS, ".article__body {\n  max-width: var(--reading-max);\n  margin: var(--space-6) auto 0;",
     ".article__body {\n  max-width: 40rem;\n  margin: var(--space-6) auto 0;"),
    ("M31 删除移动区段结尾花括号", CSS, "    text-justify: auto;\n  }\n}", "    text-justify: auto;\n  }"),
    ("M32 HTML 注入 <wbr> 断行", "news-commentary.html", "<p>这个问题并不复杂。", "<p><wbr>这个问题并不复杂。"),
    ("M33 HTML 注入内联样式", "index.html", '<main class="main-content" id="main-content" tabindex="-1">',
     '<main class="main-content" id="main-content" tabindex="-1" style="font-size:9px">'),
    ("M34 HTML 改动正文一个字符", "news-message.html", "共有47个社团", "共有47个社团。"),
]


def build(tag, mid, desc, fname, old, new):
    d = MUT / tag
    if d.exists():
        shutil.rmtree(d)
    d.mkdir(parents=True)
    for f in RESULTS.iterdir():
        shutil.copy2(f, d / f.name)
    p = d / fname
    s = p.read_text(encoding="utf-8")
    if old == "@@MOVE_TOP":
        i = s.index("@media (max-width: 768px)")
        p.write_text(s[i:] + "\n" + s[:i], encoding="utf-8")
        return d, True
    if old not in s:
        return d, None
    p.write_text(s.replace(old, new, 1), encoding="utf-8")
    return d, s != p.read_text(encoding="utf-8")


def run_verify(d):
    env = dict(os.environ, QA_RESULTS=str(d), PYTHONIOENCODING="utf-8")
    r = subprocess.run([sys.executable, str(HERE / "verify.py")], capture_output=True,
                       text=True, encoding="utf-8", errors="replace", env=env, timeout=120)
    fails = re.findall(r"^FAIL  (.+)$", r.stdout or "", re.M)
    return r.returncode, fails, (r.stderr or "")[-200:]


def run_probe(d, state="js", widths="375,768"):
    """对一个变异体跑真实浏览器断言（证明探针不是空跑）。"""
    url = "file:///" + urllib.parse.quote(str(d / "index.html").replace("\\", "/"), safe="/:")
    q = {"t": url, "k": "index", "s": state, "w": "375", "widths": widths, "cache": "#m"}
    p = subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                        "--force-device-scale-factor=1", "--allow-file-access-from-files",
                        "--virtual-time-budget=60000", f"--user-data-dir={HERE / '.ud'}",
                        "--dump-dom", "--window-size=1000,900",
                        "file:///" + urllib.parse.quote(str(HERE / "probe.html").replace("\\", "/"), safe="/:")
                        + "?" + urllib.parse.urlencode(q)],
                       capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=200)
    m = re.search(r"PROBE(.*?)\|ENDPROBE", p.stdout or "", flags=re.S)
    if not m:
        return None, ["probe 无输出"]
    rs = json.loads(urllib.parse.unquote(m.group(1)))
    return len(rs), [r["name"] for r in rs if not r["pass"]]


BROWSER_MUTANTS = [
    ("B01 断点错成 769px（768 应仍为移动）", CSS, "@media (max-width: 768px)", "@media (max-width: 769px)"),
    ("B02 断点错成 767px（768 会退回桌面）", CSS, "@media (max-width: 768px)", "@media (max-width: 767px)"),
    ("B03 按钮实际点击矩形缩到 <44px", CSS,
     "    min-block-size: 44px;\n    align-items: center;\n    align-self: flex-end;\n"
     "    justify-content: center;\n    gap: var(--space-2);\n    margin-top: var(--space-3);\n"
     "    padding: 0.625rem 0.75rem;",
     "    min-block-size: 20px;\n    align-items: center;\n    align-self: flex-end;\n"
     "    justify-content: center;\n    gap: var(--space-2);\n    margin-top: var(--space-3);\n"
     "    padding: 0.1rem 0.3rem;"),
    ("B04 缺失 .js 折叠规则（关闭态仍展开）", CSS, "  .js .site-navigation {\n    display: none;\n  }\n", ""),
    ("B05 用透明度折叠（链接仍可聚焦）", CSS, "  .js .site-navigation {\n    display: none;",
     "  .js .site-navigation {\n    opacity: 0;"),
    ("B06 无脚本降级失效（按钮错误地仍然出现）", CSS, "  .no-js .nav-toggle {\n    display: none;",
     "  .no-js .nav-toggle {\n    display: inline-flex;"),
    ("B07 列表保持横向（未改纵向）", CSS, "  .site-navigation__list {\n    flex-direction: column;",
     "  .site-navigation__list {\n    flex-direction: row;"),
    ("B08 留白缩到 8px", CSS, "    --page-gutter: 1rem;", "    --page-gutter: 0.5rem;"),
    ("B09 页面标题放弃流式字号（窄屏过大）", CSS, "    --font-size-page-title: clamp(1.75rem, 7vw, 2.25rem);",
     "    --font-size-page-title: 4rem;"),
    ("B10 首页区块固定高度并隐藏溢出截断", CSS, "  .home-section {\n    padding-block: 1.25rem;",
     "  .home-section {\n    height: 40px;\n    overflow: hidden;\n    padding-block: 1.25rem;"),
]


def main():
    MUT.mkdir(exist_ok=True)
    lines = []
    missed = 0

    d, ok = build("control", "", "", CSS, "", "")
    rc, fails, err = run_verify(d)
    lines.append(f"CONTROL 未变异副本 rc={rc}（应为 0） FAIL={len(fails)} {err[:80]}")
    if rc != 0:
        missed += 1
        lines.append("  !! 对照组未通过：" + " | ".join(fails[:6]))

    for (tag, fname, old, new) in MUTATIONS:
        d, applied = build("m" + tag.split()[0], tag.split()[0], tag, fname, old, new)
        if not applied:
            lines.append(f"{tag}: !! 变异锚点未命中（需修 mutate）")
            missed += 1
            continue
        rc, fails, err = run_verify(d)
        if rc == 1:
            lines.append(f"{tag}: 捕获 {len(fails)} 项 -> {fails[0]}")
        else:
            missed += 1
            lines.append(f"{tag}: !! 未捕获 (rc={rc}) {err[:120]}")

    lines.append("\n--- 浏览器探针变异（真实渲染断言） ---")
    for i, (tag, fname, old, new) in enumerate(BROWSER_MUTANTS):
        d, applied = build("b" + tag.split()[0], tag.split()[0], tag, fname, old, new)
        if not applied:
            lines.append(f"{tag}: !! 变异锚点未命中")
            missed += 1
            continue
        n = 0
        fails = []
        for st in ("js", "nojs", "jsopen"):
            nn, ff = run_probe(d, st)
            n += nn or 0
            fails += ff or []
            if ff:
                break
        if fails:
            lines.append(f"{tag}: 浏览器捕获 {len(fails)}/{n} -> {fails[0]}")
        else:
            missed += 1
            lines.append(f"{tag}: !! 浏览器未捕获 (n={n})")

    n, fails = run_probe(MUT / "control")
    lines.append(f"\n浏览器对照（未变异 index/js）: {n} 项，失败 {len(fails or [])} "
                 + ("OK" if n and not fails else "!! 应为 0"))
    if n and fails:
        missed += 1
        lines.append("   " + " | ".join(fails[:5]))
    total = len(MUTATIONS) + len(BROWSER_MUTANTS)
    lines.append(f"\nMUTATION: {total - missed}/{total} 捕获，对照组必须 rc=0")
    text = "\n".join(lines)
    (HERE / "mutation_log.txt").write_text(text, encoding="utf-8")
    print(text)
    return 1 if missed else 0


if __name__ == "__main__":
    sys.exit(main())
