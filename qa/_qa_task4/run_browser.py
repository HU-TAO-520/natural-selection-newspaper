#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Task 4 真实浏览器验收：无头 Chrome 打开探针页（CSS/JS 启用、禁用、窄视口），
收集 DOM 实时断言，并输出渲染截图。非交付脚本。"""
from __future__ import annotations

import html as htmlmod
import os
import re
import subprocess
import sys
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(HERE)
PROBE = os.path.join(HERE, "probe_live.html")
TARGET = os.path.join(ROOT_DIR, "Results", "index.html")
URL = "file:///" + urllib.parse.quote(PROBE.replace("\\", "/"), safe="/:")
TARGET = os.environ.get("TASK4_TARGET", TARGET)
VIEW_URL = "file:///" + urllib.parse.quote(os.path.join(HERE, "no_css_view.html").replace("\\", "/"), safe="/:")
TARGET_URL = "file:///" + urllib.parse.quote(TARGET.replace("\\", "/"), safe="/:")
SHOTS = os.path.join(HERE, "shots")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE = ["--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--allow-file-access-from-files", "--no-first-run",
        "--disable-extensions", "--disable-sync", "--virtual-time-budget=12000"]


def run(args):
    return subprocess.run([CHROME] + BASE + args, capture_output=True,
                          text=True, encoding="utf-8", errors="replace")


def dump(width):
    p = run([f"--window-size={max(width + 120, 800)},1200", "--dump-dom",
             f"{URL}?w={width}&t={TARGET_URL}"])
    out = p.stdout or ""
    m = re.search(r'<pre id="out">(.*?)</pre>', out, re.S)
    if not m:
        print("!! 探针未产出结果", (p.stderr or "")[-800:])
        return None
    body = htmlmod.unescape(m.group(1))
    return body.splitlines()


def report(width):
    lines = dump(width)
    if lines is None:
        return 1
    fails = [l for l in lines if l.startswith("FAIL|")]
    total = [l for l in lines if l.startswith("TOTAL|")]
    print(f"\n=== 逻辑视口 {width}px ===")
    for l in fails:
        print("  " + l)
    tail = total[0] if total else f"{len(lines)} 行"
    print(f"  断言 {tail}")
    print(f"  通过 {len(lines) - len(fails) - 1} / {len(lines) - 1}")
    return len(fails)


def main():
    os.makedirs(SHOTS, exist_ok=True)
    for fn in os.listdir(SHOTS):
        os.remove(os.path.join(SHOTS, fn))
    bad = 0
    for w in (1280, 640):
        bad += report(w)
    # 真实渲染截图：交付页直接以 file:// 打开
    for name, w, h, scale in (("index_1280", 1280, 1400, 1), ("index_1280_zoom200", 1280, 1400, 2),
                              ("index_768", 768, 1200, 1), ("index_375", 375, 1000, 1),
                              ("index_1280_no_css", 1280, 1000, 1)):
        p = run([f"--window-size={w},{h}", f"--force-device-scale-factor={scale}",
                 "--screenshot=" + os.path.join(SHOTS, name + ".png").replace("\\", "/"),
                 (VIEW_URL if name.endswith("no_css") else TARGET_URL)])
        ok = os.path.exists(os.path.join(SHOTS, name + ".png"))
        print(f"截图 {name}.png {'OK' if ok else '失败'}")
    print(f"\n浏览器断言失败合计：{bad}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
