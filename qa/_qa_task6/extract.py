"""Task 6 QA step 1: independently re-extract the Word paragraphs and three-way
compare them against the Task 1 and Task 6 contracts. QA-only.

Reads every w:p's w:t values verbatim (no trim, no normalisation) so the
whitespace-only F01 dateline node survives.
"""
import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCX = ROOT / "Materials" / "新闻通讯.docx"
TASK1 = ROOT / "plan" / "Task1-素材基线与内容合同.md"
TASK6 = ROOT / "plan" / "Task6-完成新闻通讯页.md"
SHA = "0C5B35256B7271ACFB2F49AEC146288B404ED49C376AC2C8B3F6246B38F894A4"

import hashlib

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

# --- 2. independent extraction --------------------------------------------
with zipfile.ZipFile(DOCX) as z:
    xml = z.read("word/document.xml").decode("utf-8")

para_nodes = re.findall(r"<w:p[ >].*?</w:p>|<w:p/>", xml, flags=re.S)
check("Word paragraph node count == 26", len(para_nodes) == 26, f"got {len(para_nodes)}")

texts = []
for p in para_nodes:
    body = re.sub(r"<w:(?:instrText|delText)[ >].*?</w:(?:instrText|delText)>", "", p, flags=re.S)
    body = re.sub(r"<w:delText[ >].*?</w:delText>", "", body, flags=re.S)
    # manual line breaks / tabs would have to be migrated; assert none exist
    if "<w:br" in body or "<w:tab/>" in body:
        log.append(f"WARN | paragraph contains w:br or w:tab: {texts.__len__()}")
    parts = re.findall(r"<w:t(?:\s[^>]*)?>(.*?)</w:t>|(<w:t(?:\s[^>]*)?/>)", body, flags=re.S)
    s = "".join((a if a else "") for a, b in parts)
    s = s.replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&apos;", "'")
    s = re.sub(r"&#(\d+);", lambda m: chr(int(m.group(1))), s)
    texts.append(s)

visible = texts  # keep all nodes, index 0-based
check("P01 (title) non-empty", visible[0].strip() != "")
check("P02 (byline) non-empty", visible[1].strip() != "")
check("P26 has no visible chars", visible[25] == "", repr(visible[25]))
check("P03-P25 all non-empty", all(t != "" for t in visible[2:25]))
check("P03-P25 contain no leading/trailing whitespace", all(t == t.strip() for t in visible[2:25]))

docx_title = visible[0]
docx_byline = visible[1]
docx_paras = visible[2:25]
check("extracted body paragraph count == 23", len(docx_paras) == 23, f"got {len(docx_paras)}")

pagebreaks = xml.count("lastRenderedPageBreak")
check("lastRenderedPageBreak markers == 3", pagebreaks == 3, f"got {pagebreaks}")

# --- 3. parse contracts ----------------------------------------------------
def section(path, header):
    txt = path.read_text(encoding="utf-8")
    start = txt.index(header)
    rest = txt[start + len(header):]
    nxt = rest.find("\n### ")
    return rest if nxt < 0 else rest[:nxt]


def contract_lines(chunk, pattern):
    out = {}
    for line in chunk.splitlines():
        m = re.match(pattern, line)
        if m:
            out.setdefault(m.group(1), m.group(2))
    return out


keys = [f"F{i:02d}" for i in range(1, 24)]
t1 = contract_lines(section(TASK1, "### 新闻通讯"), r"^(title|byline|F(?:0[1-9]|1[0-9]|2[0-3]))\|(.*)$")
t6 = contract_lines(section(TASK6, "## 权威逐段文本合同"), r"^(F(?:0[1-9]|1[0-9]|2[0-3]))\|(.*)$")

check("Task 1 defines title/byline/F01-F23", all(k in t1 for k in ["title", "byline"] + keys))
check("Task 6 defines F01-F23", all(k in t6 for k in keys), str([k for k in keys if k not in t6]))

# three-way: docx <-> Task1 <-> Task6
for i, k in enumerate(keys):
    d, a, b = docx_paras[i], t1.get(k), t6.get(k)
    check(f"{k} docx == Task1", d == a, "" if d == a else f"{d!r} vs {a!r}")
    check(f"{k} Task6 == Task1", b == a, "" if b == a else f"{b!r} vs {a!r}")

check("title docx == Task1", docx_title == t1["title"], f"{docx_title!r} vs {t1['title']!r}")
check("byline docx == Task1", docx_byline == t1["byline"], f"{docx_byline!r} vs {t1['byline']!r}")

# --- 4. high-risk character counts over merged body ------------------------
merged = "".join(t1[k] for k in keys)
counts = {
    "AI": merged.count("AI"),
    "ai": merged.count("ai"),
    "Ai": merged.count("Ai"),
    "aI": merged.count("aI"),
    "ldquo": merged.count("\u201c"),
    "rdquo": merged.count("\u201d"),
    "lsquo": merged.count("\u2018"),
    "rsquo": merged.count("\u2019"),
    "U+2014": merged.count("\u2014"),
    "fenshuan": merged.count("\u2014\u2014"),
    "question": merged.count("？"),
    "colon": merged.count("："),
    "semicolon": merged.count("；"),
    "space0020": merged.count("\u0020"),
}
expected = {
    "AI": 19, "ai": 0, "Ai": 0, "aI": 0,
    "ldquo": 8, "rdquo": 8, "lsquo": 2, "rsquo": 2,
    "U+2014": 2, "fenshuan": 1, "question": 1, "colon": 2,
    "semicolon": 3, "space0020": 1,
}
for k, v in expected.items():
    check(f"count {k} == {v}", counts[k] == v, f"got {counts[k]}")

# total AI occurrences incl. title
check("AI in body+title == 20", merged.count("AI") + t1["title"].count("AI") == 20)

# person pronouns per paragraph
pron = {"F02": "他认为", "F05": "在她看来", "F10": "仍由他自己完成",
        "F12": "不过，他并不赞成", "F20": "他举了一个简单的例子"}
for k, v in pron.items():
    check(f"{k} keeps {v!r}", t1[k].count(v) == 1 and t6[k].count(v) == 1)

# dateline exactness
f01 = t1["F01"]
check("F01 starts 自然选择号9月17日电 + one U+0020",
      f01.startswith("自然选择号9月17日电\u0020") and f01[10] != " ")
check("F01 has exactly one U+0020 in whole body", f01.count(" ") == 1)
check("no <>& in any contract paragraph", not any(set("&<>") & set(t1[k]) for k in keys))
check("no year digits 2024/2025/2026 in body", not re.search(r"20\d\d", merged))

(DOCX.parent.parent / "_qa_task6" / "docx_extraction.json").write_text(
    json.dumps({"title": docx_title, "byline": docx_byline, "F": {k: t1[k] for k in keys},
                "counts": counts}, ensure_ascii=False, indent=1), encoding="utf-8")

log.append(f"total: {len(log)} checks, {len(failures)} failures")
(Path(__file__).resolve().parent / "extract_result.txt").write_text("\n".join(log), encoding="utf-8")
print("\n".join([l for l in log if l.startswith("FAIL")] or ["ALL EXTRACTION CHECKS PASS"]))
print(f"{len(log)} checks, {len(failures)} failures")
sys.exit(1 if failures else 0)
