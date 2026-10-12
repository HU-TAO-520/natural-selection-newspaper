"""Task 8 browser acceptance over file://.

Headless Chrome + a same-origin iframe used as an exact CSS layout viewport
(the built-in browser has no usable viewport on this machine). Each run walks
375 / 768 / 769 / 1280 / 640 px for one page in one nav state, then performs the
768 -> 769 -> 768 cross-boundary sequence. QA-only; nothing is written to Results/.
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
HERE = ROOT / "_qa_task8"
RESULTS = ROOT / "Results"
PROBE = HERE / "probe.html"
TASK1 = ROOT / "plan" / "Task1-素材基线与内容合同.md"
TASK4 = ROOT / "plan" / "Task4-完成首页内容.md"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
SHOTS = HERE / "shots"
WIDTHS = "375,768,769,1280,640"


def contract_section(name):
    txt = TASK1.read_text(encoding="utf-8")
    start = txt.index("### " + name)
    rest = txt[start:]
    end = rest.find("\n### ", 5)
    chunk = rest[: end if end > 0 else len(rest)]
    out = {}
    for line in chunk.splitlines():
        m = re.match(r"^([A-Za-z_0-9]+)\|(.*)$", line)
        if m:
            out[m.group(1)] = m.group(2)
    return out


def keys(prefix, count):
    return [f"{prefix}{i:02d}" for i in range(1, count + 1)]


msg = contract_section("新闻消息")
fea = contract_section("新闻通讯")
com = contract_section("新闻评论")
assert len(msg) >= 6 and len(fea) >= 25 and len(com) >= 32, (len(msg), len(fea), len(com))

HOME = ["我们的名字来自《三体》里的一支舰队。",
        "我们主要记录一些自己觉得有价值的东西。",
        "报社成立于2024年。"]
task4 = TASK4.read_text(encoding="utf-8")
assert all(h in task4 for h in HOME), "首页冻结文本未出现在 Task4 计划中"

EXPECT = {
    "index": {"title": "《自然选择号》报社简介", "body": HOME},
    "news-message": {"title": msg["title"], "byline": msg["byline"],
                     "body": [msg[k] for k in keys("M", 4)],
                     "dateline": "自然选择号9月18日7时电"},
    "news-feature": {"title": fea["title"], "byline": fea["byline"],
                     "body": [fea[k] for k in keys("F", 23)],
                     "dateline": "自然选择号9月17日电"},
    "news-commentary": {"title": com["title"], "byline": com["byline"],
                        "body": [com[k] for k in keys("C", 29)],
                        "date": com["closing_date"], "longTitle": True,
                        "terms": ["86英寸", "Windows 10", ".exe", "UOS", "USB", "OPS",
                                  "Linux", "4K", "5次碰撞", "3个U盘", "AI"]},
}
(HERE / "expected.js").write_text("window.EXPECT = " + json.dumps(EXPECT, ensure_ascii=False) + ";\n",
                                  encoding="utf-8")

PAGES = [("index", "index.html"), ("news-message", "news-message.html"),
         ("news-feature", "news-feature.html"), ("news-commentary", "news-commentary.html")]
STATES = ["nojs", "js", "jsopen"]


def file_url(p):
    return "file:///" + urllib.parse.quote(str(p).replace("\\", "/"), safe="/:")


def chrome(args, url, budget=60000, dump=True):
    return subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
         "--force-device-scale-factor=1", "--allow-file-access-from-files",
         f"--virtual-time-budget={budget}", f"--user-data-dir={HERE / '.ud'}",
         *(["--dump-dom"] if dump else []), *args, url],
        capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=300)


def probe(kind, page, state, extra=None, width_window=1400):
    q = {"t": file_url(RESULTS / page), "k": kind, "s": state, "w": "375",
         "widths": WIDTHS, "cache": "#v=" + kind + state}
    if extra:
        q.update(extra)
    url = file_url(PROBE) + "?" + urllib.parse.urlencode(q)
    p = chrome([f"--window-size={width_window},1000"], url)
    m = re.search(r"PROBE(.*?)\|ENDPROBE", p.stdout or "", flags=re.S)
    if not m:
        return [{"name": "probe 无输出", "pass": False,
                 "detail": ((p.stdout or "")[-300:] + "||" + (p.stderr or "")[-300:])}]
    return json.loads(urllib.parse.unquote(m.group(1)))


def main():
    if not Path(CHROME).exists():
        sys.exit("chrome not found: " + CHROME)
    SHOTS.mkdir(exist_ok=True)

    lines = []
    total = fails = 0
    for kind, page in PAGES:
        for state in STATES:
            rs = probe(kind, page, state)
            bad = [r for r in rs if not r["pass"]]
            total += len(rs)
            fails += len(bad)
            lines.append(f"[{page} | {state}] {len(rs) - len(bad)}/{len(rs)} pass")
            for f in bad:
                lines.append(f"    FAIL {f['name']} :: {f['detail']}")

    lines.append("\n--- 200% 浏览器缩放等效起点实测 ---")
    for dsf, win in ((1, 1280), (2, 1280), (2, 640)):
        out = HERE / f"zoom_probe.txt"
        p = chrome([f"--window-size={win},900", f"--force-device-scale-factor={dsf}"],
                   file_url(PROBE) + "?" + urllib.parse.urlencode(
                       {"t": file_url(RESULTS / "index.html"), "k": "index", "s": "js",
                        "w": "640", "widths": "640", "cache": "#z" + str(dsf) + str(win)}))
        m = re.search(r"PROBE(.*?)\|ENDPROBE", p.stdout or "", flags=re.S)
        rs = json.loads(urllib.parse.unquote(m.group(1))) if m else []
        geo = [r for r in rs if "布局视口" in r["name"] or "媒体查询" in r["name"]]
        lines.append(f"  DSF={dsf} window-size={win} -> " +
                     " | ".join(f"{r['name']}: {'PASS' if r['pass'] else 'FAIL'} {r['detail']}" for r in geo))

    lines.append("\n--- 截图 ---\n  由 _qa_task8/shot.py 单独采集（固定宽度 iframe + 状态回读确认）。"
                 "\n  本脚本不再截图：异步 resize 会让 --screenshot 抓到中间态。")
    for name in sorted(SHOTS.glob("*.png")):
        lines.append(f"  {name.name}: {name.stat().st_size} bytes")

    lines.append("\n--- 交付文件哈希（本任务只应改 styles.css） ---")
    for f in sorted(RESULTS.iterdir()):
        lines.append(f"  {f.name}: {hashlib.sha256(f.read_bytes()).hexdigest()}")

    text = "\n".join(lines) + f"\n\nBROWSER: {total} checks, {fails} failures\n"
    (HERE / "browser_report.txt").write_text(text, encoding="utf-8")
    print(text)
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
