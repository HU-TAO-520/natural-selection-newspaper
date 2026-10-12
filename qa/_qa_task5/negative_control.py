"""Negative control for the browser probe: the same assertions must FAIL on mutants.

Proves run_browser.py's checks are not vacuously green. QA-only.
"""
import json
import re
import urllib.parse
from pathlib import Path

import run_browser as rb

HERE = Path(__file__).resolve().parent
SHADOW = HERE / "shadow"

cases = {
    "m02-nbsp": "m02",
    "m25-newline-in-p": "m25",
    "m29-visible-M04-label": "m29",
    "m03-dateline-own-paragraph": "m03",
    "m07-article-date-2026": "m07",
    "m10-trailing-space-in-strong": "m10",
    "m23-no-strong": "m23",
    "m04-author-prefix": "m04",
}

orig = rb.PAGE
rows = []
for label, mid in cases.items():
    page = SHADOW / mid / "Results" / "news-message.html"
    if not page.exists():
        rows.append((label, "MISSING-SHADOW", []))
        continue
    rb.PAGE = page
    res = rb.probe("neg_" + mid, 1024, None)
    fails = [c["name"] for c in res if not c["pass"]]
    rows.append((label, f"{len(fails)} 项 FAIL", fails))
rb.PAGE = orig

lines = []
for label, verdict, fails in rows:
    lines.append(f"{label}: {verdict}")
    for f in fails:
        lines.append(f"    - {f}")
text = "\n".join(lines) + "\n"
(HERE / "negative_control.txt").write_text(text, encoding="utf-8")
print(text)
missing = [l for l, v, f in rows if not f]
print("未被浏览器捕获的变异:", missing or "无")
