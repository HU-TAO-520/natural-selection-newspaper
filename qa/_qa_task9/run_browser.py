"""Task 9 browser acceptance over file://.

Drives the real Results/script.js inside a same-origin file:// iframe (the built-in
browser has a 0x0 viewport here) for all four deliverable pages: mobile open/close,
Esc + focus return, link-click close, non-link and outside clicks staying open,
768 -> 769 -> 768 cross-breakpoint reset, JS-disabled degradation and the
interface-missing safe-exit path. Also asserts a clean console via stderr logging.
QA-only; nothing is written to Results/.
"""
import hashlib
import json
import re
import subprocess
import sys
import urllib.parse
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]
HERE = ROOT / "_qa_task9"
RESULTS = ROOT / "Results"
PROBE = HERE / "probe.html"
SHOT = HERE / "shot.html"
MUT = HERE / "mutants"
SHOTS = HERE / "shots"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PAGES = [("index", "index.html"), ("news-message", "news-message.html"),
         ("news-feature", "news-feature.html"), ("news-commentary", "news-commentary.html")]
TARGETS = Path(sys.argv[1]) if len(sys.argv) > 1 else None
if TARGETS:
    RESULTS = TARGETS
ONLY = __import__("os").environ.get("QODER_ONLY_PAGE")
if ONLY:
    PAGES = [p for p in PAGES if p[1] == ONLY]
SKIP_EXTRA = bool(__import__("os").environ.get("QODER_SKIP_EXTRA"))


def file_url(p):
    return "file:///" + urllib.parse.quote(str(p).replace("\\", "/"), safe="/:")


def chrome(args, url, budget=90000, dump=True, log=False):
    cmd = ([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
            "--force-device-scale-factor=1", "--allow-file-access-from-files",
            f"--virtual-time-budget={budget}", f"--user-data-dir={HERE / '.ud'}"]
           + (["--enable-logging=stderr", "--v=0"] if log else [])
           + (["--dump-dom"] if dump else [])
           + list(args) + [url])
    return subprocess.run(cmd, capture_output=True, text=True,
                          encoding="utf-8", errors="replace", timeout=300)


def run_probe(target_url, kind):
    url = file_url(PROBE) + "?" + urllib.parse.urlencode(
        {"t": target_url, "k": kind, "w": "375", "d": "1000", "cache": "#v" + kind})
    p = chrome([f"--window-size=1400,1000"], url)
    m = re.search(r"PROBE(.*?)\|ENDPROBE", p.stdout or "", flags=re.S)
    if not m:
        return [{"name": "probe 无输出", "pass": False,
                 "detail": ((p.stdout or "")[-200:] + " || " + (p.stderr or "")[-200:])}], p
    return json.loads(urllib.parse.unquote(m.group(1))), p


def build_mutants():
    """Interface-violating copies of index.html, used only to prove the safe-exit path."""
    MUT.mkdir(exist_ok=True)
    for asset in ("script.js", "styles.css"):
        (MUT / asset).write_bytes((RESULTS / asset).read_bytes())
    html = (RESULTS / "index.html").read_text(encoding="utf-8")
    assert 'id="nav-toggle"' in html and 'id="site-navigation"' in html
    no_btn = re.sub(r"\n\s*<button\b.*?</button>\n", "\n", html, flags=re.S)
    no_btn = re.sub(r"\n\s*<span class=\"nav-toggle__[a-z]+\"[^>]*>.*?</span>\n", "\n", no_btn, flags=re.S)
    no_nav = re.sub(r"\n\s*<nav\b.*?</nav>\n", "\n", html, flags=re.S)
    assert 'id="nav-toggle"' not in no_btn and 'nav-toggle__' not in no_btn, "按钮未被完整移除"
    assert 'id="site-navigation"' not in no_nav and 'site-navigation__link' not in no_nav, "导航未被完整移除"
    (MUT / "m_no_toggle.html").write_text(no_btn, encoding="utf-8")
    (MUT / "m_no_nav.html").write_text(no_nav, encoding="utf-8")
    same = hashlib.sha256((MUT / "script.js").read_bytes()).hexdigest() == \
        hashlib.sha256((RESULTS / "script.js").read_bytes()).hexdigest()
    return same


def console_scan(url, label):
    p = chrome([f"--window-size={1000},1000"], url, budget=25000, dump=False, log=True)
    err = p.stderr or ""
    hits = [l for l in err.splitlines()
            if re.search(r"CONSOLE\(|Uncaught|ReferenceError|TypeError|SyntaxError", l)
            and "DevTools" not in l and "GPU" not in l]
    return hits, err


def shots(base):
    """One PNG per state; read back the real viewport/state from <title>."""
    plan = [("index_mobile_closed", "375", "0", "0"), ("index_mobile_open", "375", "1", "0"),
            ("index_desktop", "1000", "0", "0"), ("index_nojs_mobile", "375", "0", "1"),
            ("commentary_mobile_open", "375", "1", "0")]
    out = []
    for name, w, op, nojs in plan:
        page = "news-commentary.html" if name.startswith("commentary") else "index.html"
        url = file_url(SHOT) + "?" + urllib.parse.urlencode(
            {"t": file_url(RESULTS / page), "w": w, "open": op, "nojs": nojs, "h": "640"})
        out_path = SHOTS / f"{name}.png"
        p = chrome([f"--window-size={int(w) + 40},760", f"--screenshot={out_path}"], url, budget=30000)
        m = re.search(r"<title>ready:([^<]*)</title>", p.stdout or "")
        got = m.group(1).split(":") if m else ["?", "?", "?", "?", "?"]
        out.append({"name": name, "w": w, "open": op, "nojs": nojs,
                    "readback": ":".join(got), "png": out_path.stat().st_size if out_path.exists() else 0})
    return out


def main():
    if not Path(CHROME).exists():
        sys.exit("chrome not found: " + CHROME)
    SHOTS.mkdir(exist_ok=True)
    for old in SHOTS.glob("*.png"):
        old.unlink()
    mutants_ok = build_mutants()

    lines, total, fails = [], 0, 0
    targets = {name: RESULTS / fname for name, fname in PAGES}
    lines.append(f"mutants/script.js 与 Results/script.js 哈希一致: {mutants_ok}\n")

    for name, path in targets.items():
        for kind in ("full", "nojs"):
            rs, _ = run_probe(file_url(path), kind)
            bad = [r for r in rs if not r["pass"]]
            total += len(rs)
            fails += len(bad)
            lines.append(f"[{path.name} | kind={kind}] {len(rs) - len(bad)}/{len(rs)} pass")
            for x in bad:
                lines.append(f"    FAIL {x['name']} :: {x['detail']}")
            lines.append("")

    for mname in ("m_no_toggle.html", "m_no_nav.html"):
        rs, _ = run_probe(file_url(MUT / mname), "robust")
        bad = [r for r in rs if not r["pass"]]
        total += len(rs)
        fails += len(bad)
        lines.append(f"[{mname} | kind=robust] {len(rs) - len(bad)}/{len(rs)} pass")
        for x in bad:
            lines.append(f"    FAIL {x['name']} :: {x['detail']}")
        lines.append("")

    lines.append("--- 控制台（真实页面 + 变异体，直接加载，--enable-logging=stderr） ---")
    console_total = 0
    for name, path in ([] if SKIP_EXTRA else
                       list(targets.items()) + [("mutant_no_toggle", MUT / "m_no_toggle.html"),
                                                ("mutant_no_nav", MUT / "m_no_nav.html")]):
        hits, _ = console_scan(file_url(path), name)
        console_total += len(hits)
        lines.append(f"  {name}: {'CLEAN' if not hits else str(len(hits)) + ' 条'} "
                     + (" | ".join(h[:160] for h in hits[:4]) if hits else ""))
    lines.append(f"  控制台错误合计: {console_total}")
    fails += console_total
    total += sum(1 for _ in targets) + 2
    lines.append("")

    lines.append("--- 截图回读（title = clientWidth:htmlClass:state:aria:navDisplay） ---")
    for s in shots(None):
        ok = s["png"] > 3000
        parts = s["readback"].split(":")
        state_ok = ({"index_mobile_closed": ("js", "closed", "false", "none"),
                     "index_mobile_open": ("js", "open", "true", "block"),
                     "index_desktop": ("js", "closed", "false", "block"),
                     "index_nojs_mobile": ("no-js", "closed", "false", "block"),
                     "commentary_mobile_open": ("js", "open", "true", "block")}.get(s["name"]) == tuple(parts[1:5]))
        total += 1
        fails += 0 if (ok and state_ok) else 1
        lines.append(f"  {s['name']}: {s['png']} bytes readback={s['readback']} "
                     f"{'OK' if ok and state_ok else 'MISMATCH'}")

    text = "\n".join(lines) + f"\n\nBROWSER: {total} checks, {fails} failures\n"
    (HERE / "browser_report.txt").write_text(text, encoding="utf-8")
    print(text)
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
