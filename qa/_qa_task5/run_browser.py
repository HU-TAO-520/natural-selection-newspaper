"""Task 5.8 / 验证方法 8: real-browser checks over file:// with headless Chrome.

Runs _qa_task5/probe.html, which loads the deliverable page in a same-origin
iframe (a real layout viewport) and asserts in the live DOM. QA-only.
"""
import json
import re
import subprocess
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / "plan" / "Task5-完成新闻消息页.md"
PAGE = ROOT / "Results" / "news-message.html"
HERE = Path(__file__).resolve().parent
PROBE = HERE / "probe.html"
SHOTS = HERE / "shots"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
DATELINE = "自然选择号9月18日7时电"

contract = {}
for line in PLAN.read_text(encoding="utf-8").splitlines():
    m = re.match(r"^(type|title|byline|M0[1-4])\|(.+)$", line)
    if m and m.group(1) not in contract:
        contract[m.group(1)] = m.group(2)
expect = {
    "type": contract["type"],
    "title": contract["title"],
    "byline": contract["byline"],
    "dateline": DATELINE,
    "body": [contract[k] for k in ("M01", "M02", "M03", "M04")],
}

def prepare_shots():
    SHOTS.mkdir(exist_ok=True)
    for old in SHOTS.glob("*.png"):
        old.unlink()


def file_url(p):
    return "file:///" + urllib.parse.quote(str(p).replace("\\", "/"), safe="/:")


def probe(name, width, extra=None):
    q = {"t": file_url(PAGE), "w": str(width), "expect": json.dumps(expect, ensure_ascii=False), "cache": "#v=" + name}
    if extra:
        q.update(extra)
    url = file_url(PROBE) + "?" + urllib.parse.urlencode(q)
    proc = subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
         "--force-device-scale-factor=1", "--allow-file-access-from-files",
         "--virtual-time-budget=12000", "--window-size=%d,1000" % width,
         "--user-data-dir=%s" % (HERE / ".ud"), "--dump-dom", url],
        capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=180,
    )
    m = re.search(r"PROBE([A-Za-z0-9%._~-]*)", proc.stdout or "")
    if not m:
        return [{"name": "probe 无输出", "pass": False, "detail": (proc.stdout or "")[-300:] + (proc.stderr or "")[-300:]}]
    return json.loads(urllib.parse.unquote(m.group(1)))


def shot(name, width, height=1400):
    subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
         "--force-device-scale-factor=1", "--allow-file-access-from-files",
         "--virtual-time-budget=6000", "--window-size=%d,%d" % (width, height),
         "--user-data-dir=%s" % (HERE / ".ud2"),
         "--screenshot=%s" % (SHOTS / f"{name}_{width}.png").resolve(), file_url(PAGE)],
        capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=180,
    )


def main():
    prepare_shots()
    runs = {
        "desktop1024": (1024, None),
        "desktop1280": (1280, None),
        "mobile375": (375, None),
        "tablet768": (768, None),
        "zoom200_640": (640, None),
        "nocss_1024": (1024, {"nocss": "1"}),
        "nojs_1024": (1024, {"nojs": "1"}),
    }
    report = {}
    for name, (width, extra) in runs.items():
        report[name] = probe(name, width, extra)
    for name, (width, _) in runs.items():
        if name.startswith(("desktop", "mobile", "tablet")):
            shot(name, width)

    fails = []
    lines = []
    for name, res in report.items():
        lines.append(f"\n=== {name} ({len(res)} checks) ===")
        for c in res:
            mark = "PASS" if c["pass"] else "FAIL"
            lines.append(f"  {mark} {c['name']}" + (f" :: {c['detail']}" if c["detail"] and not c["pass"] else ""))
            if not c["pass"]:
                fails.append(f"{name}/{c['name']}")
        if not res:
            fails.append(f"{name}: 空结果")
    text = "\n".join(lines) + f"\n\n浏览器断言 {sum(len(v) for v in report.values())} 项，失败 {len(fails)}\nFAILS: {fails or '无'}\n"
    (HERE / "browser_report.txt").write_text(text, encoding="utf-8")
    print(text)
    print("screenshots:", sorted(p.name for p in SHOTS.iterdir()))


if __name__ == "__main__":
    main()
