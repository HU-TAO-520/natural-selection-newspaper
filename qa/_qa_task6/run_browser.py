"""Task 6 browser acceptance over file:// using headless Chrome + a same-origin
iframe as a real layout viewport (the built-in browser has no usable viewport).

Reads the expected 23 paragraphs straight from Task 1, never from the page.
QA-only.
"""
import json
import re
import subprocess
import sys
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HERE = Path(__file__).resolve().parent
RESULTS = Path(__file__).resolve().parents[1] / "Results"
PAGE = RESULTS / "news-feature.html"
PROBE = HERE / "probe.html"
TASK1 = ROOT / "plan" / "Task1-素材基线与内容合同.md"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
SHOTS = HERE / "shots"
KEYS = [f"F{i:02d}" for i in range(1, 24)]
DATELINE = "自然选择号9月17日电"

txt1 = TASK1.read_text(encoding="utf-8")
chunk = txt1[txt1.index("### 新闻通讯"):]
chunk = chunk[: chunk.find("\n### ")]
contract = {}
for line in chunk.splitlines():
    m = re.match(r"^(title|byline|F(?:0[1-9]|1[0-9]|2[0-3]))\|(.*)$", line)
    if m:
        contract.setdefault(m.group(1), m.group(2))
assert len([k for k in KEYS if k in contract]) == 23, "Task 1 contract incomplete"

expect = {"type": "新闻通讯", "title": contract["title"], "byline": contract["byline"],
          "dateline": DATELINE, "body": [contract[k] for k in KEYS]}
(HERE / "expected.js").write_text("window.EXPECT = " + json.dumps(expect, ensure_ascii=False) + ";\n",
                                  encoding="utf-8")


def file_url(p):
    return "file:///" + urllib.parse.quote(str(p).replace("\\", "/"), safe="/:")


def chrome(args, url, budget=30000, dump=True):
    return subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
         "--force-device-scale-factor=1", "--allow-file-access-from-files",
         f"--virtual-time-budget={budget}", f"--user-data-dir={HERE / '.ud'}",
         *(["--dump-dom"] if dump else []), *args, url],
        capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=240)


def probe(name, width, extra=None):
    q = {"t": file_url(PAGE), "w": str(width), "cache": "#v=" + name}
    if extra:
        q.update(extra)
    url = file_url(PROBE) + "?" + urllib.parse.urlencode(q)
    p = chrome([f"--window-size={max(width, 1280)},1000"], url)
    m = re.search(r"PROBE([A-Za-z0-9%._~-]*)", p.stdout or "")
    if not m:
        return [{"name": "probe 无输出", "pass": False,
                 "detail": ((p.stdout or "")[-200:] + (p.stderr or "")[-200:])}]
    return json.loads(urllib.parse.unquote(m.group(1)))


def main():
    if not Path(CHROME).exists():
        sys.exit("chrome not found: " + CHROME)
    SHOTS.mkdir(exist_ok=True)
    for old in SHOTS.glob("*.png"):
        old.unlink()

    all_results = {}
    scenarios = [("d1280", 1280, None), ("d1024", 1024, None),
                 ("nocss_1280", 1280, {"nocss": "1"}),
                 ("nojs_1280", 1280, {"nojs": "1"}),
                 ("zoom640", 640, None)]
    lines = []
    total_fail = 0
    for name, width, extra in scenarios:
        rs = probe(name, width, extra)
        all_results[name] = rs
        fails = [r for r in rs if not r["pass"]]
        total_fail += len(fails)
        lines.append(f"[{name}] {len(rs) - len(fails)}/{len(rs)} pass")
        for f in fails:
            lines.append(f"    FAIL {f['name']} :: {f['detail']}")

    # real screenshots of the deliverable itself (top-level window)
    for name, width, height in (("shot_1280", 1280, 1400), ("shot_1024", 1024, 1400),
                                ("shot_full", 1280, 3200)):
        out = SHOTS / f"{name}.png"
        chrome([f"--window-size={width},{height}", f"--screenshot={out}"], file_url(PAGE), dump=False)
        lines.append(f"screenshot {name}: {'ok' if out.exists() and out.stat().st_size > 5000 else 'MISSING'} "
                     f"{out.stat().st_size if out.exists() else 0} bytes")

    # network requests: prove nothing loads remotely
    lines.append("\n--- 资源引用（页面源码枚举） ---")
    src = PAGE.read_text(encoding="utf-8")
    urls = re.findall(r'(?:src|href)="([^"]+)"', src)
    lines.append("全部引用: " + ", ".join(sorted(set(urls))))
    lines.append("外部/绝对 URL: " + (", ".join(u for u in urls
                                            if re.match(r"^(https?:|//|/)", u)) or "无"))

    # no-style text dump via --dump-dom of the deliverable
    p = chrome(["--window-size=1280,1200"], file_url(PAGE))
    dom = p.stdout or ""
    paras = re.findall(r"<p>(.*?)</p>", dom, flags=re.S)
    lines.append(f"\n--dump-dom 正文 <p> 命中: {len(paras)} (需 23 纯文本段 + 类型/署名)")
    lines.append(f"--dump-dom 含 AI 次数: {dom.count('AI')}")
    lines.append(f"--dump-dom 含 2026/厨一枚/胡桃: {dom.count('2026')}/{dom.count('厨一枚')}/{dom.count('胡桃')}")
    lines.append(f"DOM 文件大小: {len(dom.encode('utf-8'))} bytes")

    text = "\n".join(lines)
    (HERE / "browser_report.txt").write_text(text, encoding="utf-8")
    print(text)
    print(f"\nBROWSER FAILURES: {total_fail}")
    return 1 if total_fail else 0


if __name__ == "__main__":
    sys.exit(main())
