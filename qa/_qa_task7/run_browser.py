"""Task 7 browser acceptance over file:// using headless Chrome + a same-origin
iframe as a real layout viewport (the built-in browser has no usable viewport).

Reads the expected C01-C29 + closing_date straight from the Task 1 contract,
never from the page. QA-only.
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
HERE = ROOT / "_qa_task7"
RESULTS = ROOT / "Results"
PAGE = RESULTS / "news-commentary.html"
PROBE = HERE / "probe.html"
TASK1 = ROOT / "plan" / "Task1-素材基线与内容合同.md"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
SHOTS = HERE / "shots"
KEYS = [f"C{i:02d}" for i in range(1, 30)]

txt1 = TASK1.read_text(encoding="utf-8")
chunk = txt1[txt1.index("### 新闻评论"):]
chunk = chunk[: chunk.find("\n### ")]
contract = {}
for line in chunk.splitlines():
    m = re.match(r"^(title|byline|closing_date|C(?:0[1-9]|1[0-9]|2[0-9]))\|(.*)$", line)
    if m:
        contract.setdefault(m.group(1), m.group(2))
assert all(k in contract for k in ["title", "byline", "closing_date"] + KEYS), "Task 1 contract incomplete"

expect = {"type": "新闻评论", "title": contract["title"], "byline": contract["byline"],
          "body": [contract[k] for k in KEYS], "date": contract["closing_date"]}
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
    m = re.search(r"PROBE(.*?)\|ENDPROBE", p.stdout or "", flags=re.S)
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

    lines = []
    total = 0
    total_fail = 0
    scenarios = [("d1280", 1280, None), ("d1024", 1024, None), ("d768", 768, None),
                 ("nocss_1280", 1280, {"nocss": "1"}), ("nojs_1280", 1280, {"nojs": "1"}),
                 ("zoom640", 640, None)]
    for name, width, extra in scenarios:
        rs = probe(name, width, extra)
        fails = [r for r in rs if not r["pass"]]
        total += len(rs)
        total_fail += len(fails)
        lines.append(f"[{name} @{width}px] {len(rs) - len(fails)}/{len(rs)} pass")
        for f in fails:
            lines.append(f"    FAIL {f['name']} :: {f['detail']}")

    for name, width, height in (("shot_1280", 1280, 1600), ("shot_1024", 1024, 1600),
                                ("shot_full", 1280, 4200)):
        out = SHOTS / f"{name}.png"
        chrome([f"--window-size={width},{height}", f"--screenshot={out}"], file_url(PAGE), dump=False)
        lines.append(f"screenshot {name}: {'ok' if out.exists() and out.stat().st_size > 5000 else 'MISSING'} "
                     f"{out.stat().st_size if out.exists() else 0} bytes")

    lines.append("\n--- 资源引用（页面源码枚举） ---")
    src = PAGE.read_text(encoding="utf-8")
    urls = re.findall(r'(?:src|href)="([^"]+)"', src)
    lines.append("全部引用: " + ", ".join(sorted(set(urls))))
    lines.append("外部/绝对 URL: " + (", ".join(u for u in urls if re.match(r"^(https?:|//|/)", u)) or "无"))

    p = chrome(["--window-size=1280,1200"], file_url(PAGE))
    dom = p.stdout or ""
    paras = re.findall(r"<p>(.*?)</p>", dom, flags=re.S)
    lines.append(f"\n--dump-dom 纯文本 <p> 命中: {len(paras)}（应为 29 段正文，另有类型/署名/日期带 class）")
    lines.append(f"--dump-dom 中 2026/厨一枚/胡桃/新闻评价 命中: "
                 f"{dom.count('2026')}/{dom.count('厨一枚')}/{dom.count('胡桃')}/{dom.count('新闻评价')}")
    lines.append(f"--dump-dom 中 <time>/<blockquote>/<img>/<a href> 命中: "
                 f"{dom.count('<time')}/{dom.count('<blockquote')}/{dom.count('<img')}/{len(re.findall(chr(60) + 'a ', dom))}")
    lines.append(f"渲染 DOM 大小: {len(dom.encode('utf-8'))} bytes")
    lines.append(f"交付文件大小: {len(src.encode('utf-8'))} bytes, "
                 f"SHA-256 {hashlib.sha256(src.encode('utf-8')).hexdigest()}")

    text = "\n".join(lines) + f"\n\nBROWSER: {total} checks, {total_fail} failures\n"
    (HERE / "browser_report.txt").write_text(text, encoding="utf-8")
    print(text)
    return 1 if total_fail else 0


if __name__ == "__main__":
    sys.exit(main())
