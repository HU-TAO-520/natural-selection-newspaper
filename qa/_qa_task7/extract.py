"""Task 7 QA step 1: independently re-extract the Word paragraphs from
Materials/新闻评价.docx and three-way compare them against the Task 1 and the
Task 7 plan contracts. QA-only, read-only over Materials/ and plan/.

Text is read verbatim from every w:p's w:t values (no trim, no normalisation).
"""
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCX = ROOT / "Materials" / "新闻评价.docx"
TASK1 = ROOT / "plan" / "Task1-素材基线与内容合同.md"
TASK7 = ROOT / "plan" / "Task7-完成新闻评论页.md"
HERE = Path(__file__).resolve().parent
SHA = "8E50CFC89287035163D5FE95C8B1CEE20A5AA405E9D04EC358FB5C9312C3827C"

KEYS = [f"C{i:02d}" for i in range(1, 30)]
LENGTHS = {
    "title": 15, "byline": 4,
    "C01": 80, "C02": 56, "C03": 15, "C04": 64, "C05": 138, "C06": 101, "C07": 50,
    "C08": 75, "C09": 100, "C10": 118, "C11": 34, "C12": 167, "C13": 16, "C14": 98,
    "C15": 68, "C16": 70, "C17": 17, "C18": 65, "C19": 30, "C20": 126, "C21": 100,
    "C22": 13, "C23": 65, "C24": 35, "C25": 24, "C26": 163, "C27": 37, "C28": 77,
    "C29": 36, "closing_date": 12,
}

failures = []
log = []


def check(name, ok, detail=""):
    log.append(f"{'PASS' if ok else 'FAIL'} | {name}{(' | ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


# --- 1. version gate -------------------------------------------------------
actual_sha = hashlib.sha256(DOCX.read_bytes()).hexdigest().upper()
check("source SHA-256 equals frozen baseline", actual_sha == SHA, actual_sha)
if actual_sha != SHA:
    print("\n".join(log))
    sys.exit("hash mismatch: stop, return to Task 1")
check("docx size == 20014 bytes", DOCX.stat().st_size == 20014, str(DOCX.stat().st_size))

# --- 2. independent extraction --------------------------------------------
with zipfile.ZipFile(DOCX) as z:
    names = z.namelist()
    xml = z.read("word/document.xml").decode("utf-8")

check("no footnotes/endnotes references in document.xml",
      "w:footnoteReference" not in xml and "w:endnoteReference" not in xml)
check("no hyperlinks in document.xml", "<w:hyperlink" not in xml)
check("no tables / images in document.xml",
      "<w:tbl" not in xml and "<w:drawing" not in xml and "<w:pict" not in xml)
check("no revisions (w:ins/w:del) in document.xml", "<w:ins" not in xml and "<w:del" not in xml)

para_nodes = re.findall(r"<w:p[ >].*?</w:p>|<w:p/>", xml, flags=re.S)
texts = []
for p in para_nodes:
    body = re.sub(r"<w:(?:instrText|delText)[ >].*?</w:(?:instrText|delText)>", "", p, flags=re.S)
    if "<w:br" in body or "<w:tab/>" in body:
        log.append(f"WARN | paragraph contains w:br or w:tab: node index {len(texts)}")
    parts = re.findall(r"<w:t(?:\s[^>]*)?>(.*?)</w:t>|(<w:t(?:\s[^>]*)?/>)", body, flags=re.S)
    s = "".join((a if a else "") for a, b in parts)
    s = s.replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&apos;", "'")
    s = re.sub(r"&#(\d+);", lambda m: chr(int(m.group(1))), s)
    texts.append(s)

check("no w:br / w:tab anywhere", "<w:br" not in xml and "<w:tab/>" not in xml)
check("paragraph node count == 32", len(para_nodes) == 32, f"got {len(para_nodes)}")
check("visible non-empty paragraph count == 32", sum(1 for t in texts if t != ""),
      f"got {sum(1 for t in texts if t != '')}")
check("every paragraph has no leading/trailing whitespace",
      all(t == t.strip() for t in texts if t != ""))
check("no paragraph contains two consecutive U+0020", all("  " not in t for t in texts))

docx_title, docx_byline = texts[0], texts[1]
docx_paras = texts[2:31]
docx_date = texts[31]
check("Word 3rd..31st nodes map to C01-C29", len(docx_paras) == 29, str(len(docx_paras)))
check("Word 32nd node is closing_date", docx_date != "")
check("lastRenderedPageBreak markers == 4", xml.count("lastRenderedPageBreak") == 4,
      str(xml.count("lastRenderedPageBreak")))
marked = [i + 1 for i, p in enumerate(para_nodes) if "lastRenderedPageBreak" in p]
check("page-break cache nodes are 8/14/21/28", marked == [8, 14, 21, 28], str(marked))

# run-splitting seam checks (must be joined seamlessly, no inserted space)
def runs_of(node_xml):
    return [r for r in re.findall(r"<w:t(?:\s[^>]*)?>(.*?)</w:t>", node_xml, flags=re.S)]

seams = {8: ("接口的位置就", "应该考虑"), 14: ("只能在", "Windows环境下运行"),
         28: ("统一安", "装，对确实需要")}
for node, (left, right) in seams.items():
    rs = runs_of(para_nodes[node - 1])
    joined = "".join(rs)
    check(f"node {node} splits into {len(rs)} runs >= 2 with seam {left!r}|{right!r}",
          len(rs) >= 2 and any(left in r and r.endswith(left) for r in rs)
          and any(r.startswith(right) for r in rs)
          and f"{left}{right}" in joined and f"{left} {right}" not in joined,
          f"runs={len(rs)}")

# --- 3. parse the two contracts -------------------------------------------
def section(path, header, to_next="### "):
    txt = path.read_text(encoding="utf-8")
    start = txt.index(header)
    rest = txt[start + len(header):]
    nxt = rest.find("\n" + to_next)
    return rest if nxt < 0 else rest[:nxt]


def contract_lines(chunk, pattern):
    out = {}
    for line in chunk.splitlines():
        m = re.match(pattern, line)
        if m:
            out.setdefault(m.group(1), m.group(2))
    return out


PAT = r"^(type|title|byline|closing_date|C(?:0[1-9]|1[0-9]|2[0-9]))\|(.*)$"
t1 = contract_lines(section(TASK1, "### 新闻评论"), PAT)
t7 = contract_lines(section(TASK7, "## 权威文本合同", "## "), PAT)

need = ["title", "byline"] + KEYS + ["closing_date"]
check("Task 1 defines title/byline/C01-C29/closing_date", all(k in t1 for k in need),
      str([k for k in need if k not in t1]))
check("Task 7 defines type/title/byline/C01-C29/closing_date",
      all(k in t7 for k in ["type"] + need), str([k for k in ["type"] + need if k not in t7]))
check("Task 7 type is 新闻评论", t7.get("type") == "新闻评论", t7.get("type"))

for k in ["title", "byline"] + KEYS:
    a, b = t1.get(k), t7.get(k)
    check(f"{k} Task7 == Task1", a == b, "" if a == b else f"{b!r} vs {a!r}")
check("closing_date Task7 == Task1", t7["closing_date"] == t1["closing_date"])
check("title docx == Task1", docx_title == t1["title"], f"{docx_title!r} vs {t1['title']!r}")
check("byline docx == Task1", docx_byline == t1["byline"], f"{docx_byline!r} vs {t1['byline']!r}")
for i, k in enumerate(KEYS):
    check(f"{k} docx == Task1", docx_paras[i] == t1[k],
          "" if docx_paras[i] == t1[k] else f"{docx_paras[i]!r} vs {t1[k]!r}")
check("closing_date docx == Task1", docx_date == t1["closing_date"],
      f"{docx_date!r} vs {t1['closing_date']!r}")

# --- 4. per-paragraph character counts (Task 1 table) ----------------------
measured = {"title": len(t1["title"]), "byline": len(t1["byline"])}
measured.update({k: len(t1[k]) for k in KEYS})
measured["closing_date"] = len(t1["closing_date"])
for k, want in LENGTHS.items():
    check(f"len {k} == {want}", measured[k] == want, f"got {measured[k]}")
check("32 items total == 2069 chars", sum(measured.values()) == 2069, str(sum(measured.values())))

# --- 5. high-risk character counts over merged body C01-C29 ----------------
merged = "".join(t1[k] for k in KEYS)
counts = {
    ".exe": merged.count(".exe"), "exe_without_dot": merged.count("exe") - merged.count(".exe"),
    "。exe": merged.count("。exe"), "Windows10": merged.count("Windows10"),
    "Windows 10": merged.count("Windows 10"), "Windows": merged.count("Windows"),
    "安 装": merged.count("安 装"), "安装": merged.count("安装"),
    "86英寸": merged.count("86英寸"), "86 英寸": merged.count("86 英寸"),
    "同窗AI大屏": merged.count("同窗AI大屏"), "AI": merged.count("AI"), "ai": merged.count("ai"),
    "UOS": merged.count("UOS"), "uos": merged.count("uos"), "U盘": merged.count("U盘"),
    "USB": merged.count("USB"), "usb": merged.count("usb"), "OPS": merged.count("OPS"),
    "Linux": merged.count("Linux"), "linux": merged.count("linux"), "4K": merged.count("4K"),
    "4k": merged.count("4k"), "5次碰撞": merged.count("5次碰撞"), "3个U盘被撞坏": merged.count("3个U盘被撞坏"),
    "不完全统计": merged.count("不完全统计"), "还需要进一步检查": merged.count("还需要进一步检查"),
    "科大讯飞": merged.count("科大讯飞"), "U+0020": merged.count("\u0020"),
    "ldquo": merged.count("\u201c"), "rdquo": merged.count("\u201d"),
    "全角分号；": merged.count("；"), "全角冒号：": merged.count("："), "顿号、": merged.count("、"),
    "halfwidth;": merged.count(";"), "halfwidth:": merged.count(":"), "halfwidth,": merged.count(","),
    "nbsp": merged.count("\u00a0"), "zero_width": len(re.findall(r"[\u200b-\u200f\ufeff\u00ad]", merged)),
}
expected_counts = {
    ".exe": 3, "exe_without_dot": 0, "。exe": 0, "Windows10": 0, "Windows 10": 2,
    "Windows": 8, "安 装": 0, "86英寸": 1, "86 英寸": 0, "同窗AI大屏": 1, "AI": 1,
    "ai": 0, "UOS": 4, "uos": 0, "U盘": 7, "USB": 4, "usb": 0, "OPS": 1, "Linux": 1,
    "linux": 0, "4K": 1, "4k": 0, "5次碰撞": 1, "3个U盘被撞坏": 1, "不完全统计": 1,
    "还需要进一步检查": 1, "科大讯飞": 1, "U+0020": 2, "ldquo": 5, "rdquo": 5,
    "全角分号；": 5, "全角冒号：": 1, "顿号、": 20, "halfwidth;": 0, "halfwidth:": 0,
    "halfwidth,": 0, "nbsp": 0, "zero_width": 0,
}
for k, want in expected_counts.items():
    check(f"count {k} == {want}", counts[k] == want, f"got {counts[k]}")
check("安装 appears at least once (seam joined)", counts["安装"] >= 1, str(counts["安装"]))
check("closing_date has no year and full-width brackets",
      t1["closing_date"] == "（自然选择号9月18日）" and not re.search(r"\d{4}", t1["closing_date"]))
check("no 2024/2025/2026 anywhere in the 33 units",
      not re.search(r"20\d\d", merged + t1["title"] + t1["byline"] + t1["closing_date"]))
check("no & < > needing entity escaping",
      not any(set("&<>") & set(v) for v in [t1["title"], t1["byline"], t1["closing_date"]] + [t1[k] for k in KEYS]))
check("C29 keeps title echo + quote in one unit",
      t1["C29"] == "设备升级了，使用门槛也该降下来。“科技不是高高在上的，而应该服务人民。”")
check("public name is 新闻评论 and 新闻评价 only in source path",
      "新闻评价" not in "".join([t1["title"], t1["byline"], t1["closing_date"]] + [t1[k] for k in KEYS]))

(HERE / "docx_extraction.json").write_text(json.dumps({
    "type": t7["type"], "title": t1["title"], "byline": t1["byline"],
    "C": {k: t1[k] for k in KEYS}, "closing_date": t1["closing_date"],
    "lengths": measured, "counts": counts}, ensure_ascii=False, indent=1), encoding="utf-8")

(HERE / "extract_result.txt").write_text("\n".join(log) + "\n", encoding="utf-8")
print("\n".join([l for l in log if l.startswith("FAIL")] or ["ALL EXTRACTION CHECKS PASS"]))
print(f"{len(log)} checks, {len(failures)} failures")
sys.exit(1 if failures else 0)
