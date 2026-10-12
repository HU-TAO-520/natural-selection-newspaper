"""Mutation gate for the Task 9 acceptance suite.

Each mutant rewrites Results/script.js in a way that violates one clause of the plan. A
mutant is 'caught' when at least one gate fails on it, and the unmutated control must pass
every gate. This is what proves the 84 static + 241 behavioural checks are not vacuous.
QA-only: mutants are built under _qa_task9/mut_dirs/, never in Results/.
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]
HERE = ROOT / "_qa_task9"
RESULTS = ROOT / "Results"
MUT_DIRS = HERE / "mut_dirs"
PAGES = ["index.html", "news-message.html", "news-feature.html", "news-commentary.html"]
BASE = (RESULTS / "script.js").read_text(encoding="utf-8")
ONLY = sys.argv[1:]

# name -> (contract clause violated, old, new, extra gates)
MUTANTS = [
    ("m01_no_js_class", "行为1：no-js 未替换为 js",
     "root.classList.add('js');", "", []),
    ("m02_lazy_switch", "行为1：切换未置于元素查询之前（整段下移）",
     "  root.classList.remove('no-js');\n"
     "  root.classList.add('js');\n\n"
     "  var toggle = document.getElementById('nav-toggle');\n"
     "  var navigation = document.getElementById('site-navigation');",
     "  var toggle = document.getElementById('nav-toggle');\n"
     "  var navigation = document.getElementById('site-navigation');\n\n"
     "  root.classList.remove('no-js');\n"
     "  root.classList.add('js');", []),
    ("m03_no_aria_sync", "输出状态3：只改 is-open 不同步 aria-expanded",
     "    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');", "", []),
    ("m04_boolean_aria", "aria-expanded 写成布尔而非字符串",
     "toggle.setAttribute('aria-expanded', open ? 'true' : 'false');",
     "toggle.setAttribute('aria-expanded', open);", []),
    ("m05_classname_rewrite", "行为1：整体改写 class 字符串",
     "  root.classList.remove('no-js');\n  root.classList.add('js');",
     "  root.className = 'js';", []),
    ("m06_double_keydown", "常见返工：为按钮重复绑定 Enter/Space keydown",
     "  toggle.addEventListener('click', function () {",
     "  toggle.addEventListener('keydown', function (e) {\n"
     "    if (e.key === 'Enter' || e.key === ' ') { setOpen(!isOpen()); }\n  });\n"
     "  toggle.addEventListener('click', function () {", ["cdp"]),
    ("m07_breakpoint_768", "断点与 Task 8 合同错位（768px）",
     "window.matchMedia('(min-width: 769px)')",
     "window.matchMedia('(min-width: 768px)')", ["cdp"]),
    ("m08_no_breakpoint_reset", "行为5：未监听跨断点重置",
     "  var media = window.matchMedia('(min-width: 769px)');",
     "  var media = null;\n  if (!media) { return; }", ["cdp"]),
    ("m09_inverted_breakpoint", "行为5：进入桌面时未关闭（条件取反）",
     "    if (event.matches) {\n      closeMenu();",
     "    if (!event.matches) {\n      closeMenu();", ["cdp"]),
    ("m10_outside_close", "已定决策：擅自实现点击菜单外关闭",
     "  var media = window.matchMedia('(min-width: 769px)');",
     "  document.addEventListener('click', function (e) {\n"
     "    if (isOpen() && !navigation.contains(e.target)) { closeMenu(); }\n  });\n"
     "  var media = window.matchMedia('(min-width: 769px)');", []),
    ("m11_text_match_links", "禁止：以中文链接文本判定导航链接",
     "target.closest('.site-navigation__link') && isOpen()",
     "(target.textContent === '首页' || target.textContent === '新闻消息') && isOpen()", []),
    ("m12_no_early_return", "健壮性：接口缺失时未安全返回",
     "  if (!toggle || !navigation) {\n    return;\n  }",
     "  if (!toggle && !navigation) {\n    return;\n  }", []),
    ("m13_no_focus_return", "行为3：Esc 未把焦点返回按钮",
     "        closeMenu();\n        toggle.focus();", "        closeMenu();", ["cdp"]),
    ("m14_link_close_removed", "行为4：点击导航链接不关闭菜单",
     "  navigation.addEventListener('click', function (event) {",
     "  navigation.addEventListener('click', function (event) {\n    if (1) { return; }", []),
    ("m15_inline_style", "越权：用脚本写内联显示样式",
     "    navigation.classList.toggle('is-open', open);",
     "    navigation.classList.toggle('is-open', open);\n"
     "    navigation.style.display = open ? 'block' : 'none';", []),
    ("m16_console_log", "交付要求：生产脚本残留 console 输出",
     "  var root = document.documentElement;",
     "  var root = document.documentElement;\n  console.log('task9 loaded');", []),
    ("m17_prevent_default", "行为4：阻止链接默认导航",
     "      closeMenu();\n    }\n  });",
     "      closeMenu();\n      event.preventDefault();\n    }\n  });", []),
    ("m18_tabindex_focus_mgmt", "禁止：用 tabindex 管理可聚焦性",
     "    navigation.classList.toggle('is-open', open);",
     "    navigation.classList.toggle('is-open', open);\n"
     "    navigation.setAttribute('tabindex', open ? '0' : '-1');", []),
    ("m19_startup_open", "健壮性：启动未归一化为关闭态",
     "  /* 2. 启动归一化为关闭态（源码本不应带 is-open） */\n  closeMenu();",
     "  /* 2. 启动归一化为关闭态（源码本不应带 is-open） */", []),
    ("m20_global_leak", "健壮性：向 window 暴露全局变量",
     "  var toggle = document.getElementById('nav-toggle');",
     "  window.navState = { on: false };\n"
     "  var toggle = document.getElementById('nav-toggle');", []),
]


def build(name, old, new):
    if old not in BASE:
        raise SystemExit(f"变异锚点未命中：{name}\n{old[:80]}")
    mutated = BASE.replace(old, new, 1)
    if mutated == BASE:
        raise SystemExit(f"变异无效：{name}")
    d = MUT_DIRS / name
    if d.exists():
        shutil.rmtree(d)
    d.mkdir(parents=True)
    for p in PAGES + ["styles.css"]:
        shutil.copy2(RESULTS / p, d / p)
    (d / "script.js").write_text(mutated, encoding="utf-8")
    return d


def leg(cmd, env=None, tag=""):
    e = dict(os.environ)
    e.update(env or {})
    p = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                       errors="replace", timeout=900, env=e, cwd=str(ROOT))
    fails = [l.strip() for l in (p.stdout or "").splitlines()
             if l.strip().startswith("FAIL") or l.strip().startswith("    FAIL")]
    return p.returncode, fails


def main():
    MUT_DIRS.mkdir(exist_ok=True)
    rc, ctrl = leg([sys.executable, str(HERE / "verify_static.py")])
    if rc != 0:
        print("对照组静态未通过，先修脚本再谈变异：", ctrl)
        return 1
    print("对照组（真实交付）静态：PASS")

    rows, missed = [], []
    env_fast = {"QODER_ONLY_PAGE": "index.html", "QODER_SKIP_EXTRA": "1"}
    for name, clause, old, new, extra in MUTANTS:
        if ONLY and not any(name.startswith(o) or clause.startswith(o) for o in ONLY):
            continue
        d = build(name, old, new)
        s_rc, s_fail = leg([sys.executable, str(HERE / "verify_static.py"), str(d)])
        b_rc, b_fail = leg([sys.executable, str(HERE / "run_browser.py"), str(d)], env_fast)
        caught = (s_rc != 0) or (b_rc != 0)
        if "cdp" in extra and s_rc == 0 and b_rc == 0:
            c = dict(os.environ)
            c["QODER_RESULTS_DIR"] = str(d)
            c_rc, c_fail = leg(["node", str(HERE / "cdp_check.mjs")], env=c)
            caught = caught or c_rc != 0
            rows.append((name, clause, s_rc, b_rc, c_rc, caught,
                         (s_fail[:2] + b_fail[:2] + c_fail[:2])))
        else:
            rows.append((name, clause, s_rc, b_rc, "-", caught, (s_fail[:2] + b_fail[:2])))
        if not caught:
            missed.append(name)

    print(f"\n{'变异':<24}{'违约条款':<34}{'静态':<7}{'行为':<7}{'CDP':<6}捕获")
    for name, clause, s, b, c, caught, det in rows:
        print(f"{name:<24}{clause:<34}{('FAIL' if s else 'pass'):<7}"
              f"{('FAIL' if b == 1 else 'pass'):<7}{str(c):<6}{'✓' if caught else '✗ 未捕获'}")
        for x in det[:2]:
            print(f"      └─ {x[:150]}")
    print(f"\nMUTATION: {len(rows) - len(missed)}/{len(rows)} 变异被捕获")
    if missed:
        print("未被捕获（验收脚本存在盲区）：" + ", ".join(missed))
    return 1 if missed else 0


if __name__ == "__main__":
    sys.exit(main())
