#!/usr/bin/env python3
"""Task 8 真实像素截图：固定宽度 iframe + 运行时菜单状态，无异步 resize。

无头 Chrome 顶层窗口有约 500px 下限，故窄屏截图取 500/640；375px 的几何由
probe.html 的同域 iframe 数值断言覆盖。QA-only。
"""
import re
import subprocess
import sys
import urllib.parse
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = Path(__file__).resolve().parents[1]
HERE = ROOT / "_qa_task8"
RESULTS = ROOT / "Results"
SHOTS = HERE / "shots"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
UD = HERE / ".udshot"


def url(p):
    return "file:///" + urllib.parse.quote(str(p).replace("\\", "/"), safe="/:")


def run(args, target, budget=8000):
    return subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                           "--force-device-scale-factor=1", "--allow-file-access-from-files",
                           f"--virtual-time-budget={budget}", f"--user-data-dir={UD}", *args, target],
                          capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=180)


def main():
    SHOTS.mkdir(exist_ok=True)
    for old in SHOTS.glob("*.png"):
        old.unlink()
    plan = [("index_jsopen_500", "index.html", 500, "jsopen"),
            ("index_js_500", "index.html", 500, "js"),
            ("index_nojs_500", "index.html", 500, "nojs"),
            ("message_jsopen_500", "news-message.html", 500, "jsopen"),
            ("feature_js_500", "news-feature.html", 500, "js"),
            ("commentary_jsopen_500", "news-commentary.html", 500, "jsopen"),
            ("commentary_js_500", "news-commentary.html", 500, "js"),
            ("commentary_nojs_500", "news-commentary.html", 500, "nojs"),
            ("commentary_jsopen_640_zoom200", "news-commentary.html", 640, "jsopen"),
            ("commentary_js_768", "news-commentary.html", 768, "js"),
            ("desktop_1280_commentary", "news-commentary.html", 1280, "js")]
    bad = 0
    for name, page, w, st in plan:
        q = urllib.parse.urlencode({"t": url(RESULTS / page), "w": str(w), "h": "1400", "s": st})
        target = url(HERE / "shot.html") + "?" + q
        out = SHOTS / f"{name}.png"
        p = run([f"--window-size={w + 16},1400", f"--screenshot={out}", "--dump-dom"], target)
        m = re.search(r"<title>ready:(\d+):(\w+)</title>", p.stdout or "")
        got = m.group(1) if m else "无"
        state = m.group(2) if m else "-"
        okpx = out.exists() and out.stat().st_size > 8000
        ok = bool(m) and int(got) >= w - 2 and okpx and state == st
        bad += 0 if ok else 1
        print(f"{'OK ' if ok else 'BAD'} {name}: iframe clientWidth={got} state={state} "
              f"png={out.stat().st_size if out.exists() else 0}B")
    print(f"\nSHOTS: {len(plan) - bad}/{len(plan)} 采集成功（clientWidth 与状态均已回读确认）")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
