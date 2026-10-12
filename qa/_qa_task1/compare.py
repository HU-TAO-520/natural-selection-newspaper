# -*- coding: utf-8 -*-
"""Strict, character-for-character comparison of Word visible text vs Task 1 contract."""
import json
import re
import sys
import zipfile
import io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
PLAN = ROOT / "plan" / "Task1-素材基线与内容合同.md"
DATA = json.loads((ROOT / "_qa_task1" / "extracted.json").read_text(encoding="utf-8"))

md = PLAN.read_text(encoding="utf-8")


def parse_contract(md_text):
    blocks = {}
    lines = md_text.split("\n")
    heading = None
    i = 0
    while i < len(lines):
        m = re.match(r"^### (\S+)\s*$", lines[i])
        if m:
            heading = m.group(1)
        if lines[i].strip() == "```text":
            body = []
            i += 1
            while i < len(lines) and lines[i].strip() != "```":
                body.append(lines[i])
                i += 1
            entries = [(l.split("|", 1)[0].strip(), l.split("|", 1)[1])
                       for l in body if "|" in l]
            if entries:
                blocks[heading] = entries
        i += 1
    return blocks


CONTRACT = parse_contract(md)
DOC_FOR = {"新闻消息": "新闻消息", "新闻通讯": "新闻通讯", "新闻评论": "新闻评价"}

# expected structural counts from the "输入文件与冻结基线" table
EXPECTED_COUNTS = {
    "新闻消息": {"total_nodes": 6, "nonempty": 6, "title": 1, "byline": 1, "body": 4, "date": 0},
    "新闻通讯": {"total_nodes": 26, "nonempty": 25, "title": 1, "byline": 1, "body": 23, "date": 0},
    "新闻评论": {"total_nodes": 32, "nonempty": 32, "title": 1, "byline": 1, "body": 29, "date": 1},
}

failures = []
report = []

for section, entries in CONTRACT.items():
    doc = DATA[DOC_FOR[section]]
    keys = [k for k, _ in entries]
    texts = [v for _, v in entries]
    visible_paras = [p for p in doc["paras"] if p["visible"] != ""]
    report.append("\n### %s  (source: %s)" % (section, doc["file"]))
    report.append("SHA-256 : %s" % doc["sha256"])
    report.append("paragraph nodes=%d  non-empty=%d  contract items=%d  tables=%d"
                  % (doc["para_count_total"], doc["nonempty_count"], len(entries), doc["table_count"]))

    exp = EXPECTED_COUNTS[section]
    if doc["para_count_total"] != exp["total_nodes"]:
        failures.append("%s: node count %d != %d" % (section, doc["para_count_total"], exp["total_nodes"]))
    if doc["nonempty_count"] != exp["nonempty"]:
        failures.append("%s: non-empty count %d != %d" % (section, doc["nonempty_count"], exp["nonempty"]))
    if len(entries) != exp["title"] + exp["byline"] + exp["body"] + exp["date"]:
        failures.append("%s: contract item count mismatch" % section)

    if len(visible_paras) != len(texts):
        failures.append("%s: visible paragraphs (%d) != contract items (%d)"
                        % (section, len(visible_paras), len(texts)))

    for idx, key in enumerate(keys):
        expected = texts[idx]
        if idx >= len(visible_paras):
            failures.append("%s/%s: missing paragraph" % (section, key))
            continue
        actual = visible_paras[idx]["visible"]
        if actual == expected:
            report.append("  OK   %-13s chars=%-4d runs=%d" % (key, len(actual), visible_paras[idx]["runs"]))
            continue
        failures.append("%s/%s: CHARACTER MISMATCH" % (section, key))
        report.append("  FAIL %s" % key)
        report.append("       expected(%d): %r" % (len(expected), expected))
        report.append("       actual  (%d): %r" % (len(actual), actual))
        for pos, (a, b) in enumerate(zip(expected, actual)):
            if a != b:
                report.append("       first diff at index %d: exp %r(U+%04X) vs act %r(U+%04X)"
                              % (pos, a, ord(a), b, ord(b)))
                break
        else:
            pos = min(len(expected), len(actual))
            report.append("       length differs at index %d" % pos)

    # byline rule
    if len(texts) > 1:
        if texts[1] != "蓝色空间":
            failures.append("%s: byline is not exactly 蓝色空间 -> %r" % (section, texts[1]))
    # title rule
    if not texts[0].strip():
        failures.append("%s: empty title" % section)

# ---- structural / forbidden-content checks on the raw document.xml ----
report.append("\n### 包结构与版式痕迹检查")
for section, doc in DATA.items():
    raw = None
    p = ROOT / doc["file"]
    with zipfile.ZipFile(str(p)) as z:
        raw = z.read("word/document.xml").decode("utf-8")
        parts = z.namelist()
    risky = {}
    for tag in ["w:tbl", "w:drawing", "w:pict", "w:object", "w:hyperlink", "w:footnoteReference",
                "w:endnoteReference", "w:commentReference", "w:commentRangeStart", "w:ins ", "w:del ",
                "w:instrText", "w:fldSimple", "w:sdt", "w:bookmarkStart", "w:tab/", "w:br/",
                "w:lastRenderedPageBreak", "w:sectPr", "w:headerReference", "w:footerReference"]:
        c = raw.count(tag)
        if c:
            risky[tag] = c
    report.append("  %s: parts=%d | %s" % (doc["file"], len(parts), json.dumps(risky, ensure_ascii=False)))
    nonstd = [x for x in parts if x.startswith("word/") and x not in
              ("word/document.xml", "word/settings.xml", "word/styles.xml", "word/stylesWithEffects.xml",
               "word/fontTable.xml", "word/webSettings.xml", "word/footnotes.xml", "word/endnotes.xml",
               "word/theme/theme1.xml", "word/_rels/document.xml.rels")]
    if nonstd:
        report.append("      其他 word/ 部件: %s" % json.dumps(nonstd, ensure_ascii=False))

# ---- high-risk character checkpoints from the plan ----
report.append("\n### 高风险字符专项检查")
alltext = {s: "".join([v for _, v in CONTRACT[s]]) for s in CONTRACT}


def check(label, cond):
    (report.append("  PASS " + label) if cond else failures.append("CHECK FAIL: " + label))
    if not cond:
        report.append("  FAIL " + label)


f = CONTRACT["新闻通讯"]
m = CONTRACT["新闻消息"]
c = CONTRACT["新闻评论"]
mtext = dict(m)
ftext = dict(f)
ctext = dict(c)

check("M01 电头后恰为 1 个 U+0020",
      mtext["M01"].startswith("自然选择号9月18日7时电 ") and not mtext["M01"].startswith("自然选择号9月18日7时电  "))
check("F01 电头后恰为 1 个 U+0020",
      ftext["F01"].startswith("自然选择号9月17日电 ") and not ftext["F01"].startswith("自然选择号9月17日电  "))
check("正文无连续两个及以上半角空格(消息)", not re.search(r" {2,}", "".join(v for _, v in m)))
check("正文无连续两个及以上半角空格(通讯)", not re.search(r" {2,}", "".join(v for _, v in f)))
check("评论无 '安 装'", "安 装" not in "".join(v for _, v in c))
check("评论保留 86英寸", "86英寸" in alltext["新闻评论"])
check("评论保留 'Windows 10' 半角空格 (2 次)", alltext["新闻评论"].count("Windows 10") == 2)
check("评论 .exe 共 3 次", alltext["新闻评论"].count(".exe") == 3)
check("评论无裸 'exe' 缺前导句点", not re.search(r"(?<![.\w])exe", alltext["新闻评论"]))
check("评论保留 USB/UOS/OPS/Linux/4K 大写",
      all(k in alltext["新闻评论"] for k in ["USB", "UOS", "OPS", "Linux", "4K"]))
check("评论保留 5次碰撞 / 3个U盘", "5次碰撞" in alltext["新闻评论"] and "3个U盘被撞坏" in alltext["新闻评论"])
check("closing_date 全角括号且无年份", ctext["closing_date"] == "（自然选择号9月18日）")
check("通讯 AI 全大写、无 '人工智能' 之外的替换", "AI" in alltext["新闻通讯"])
check("通讯 '生成式人工智能' 原样出现 2 次(F01/F09)", alltext["新闻通讯"].count("生成式人工智能") == 2)
check("通讯保留 她(F05)/他 不一致", "在她看来" in ftext["F05"] and ftext["F10"].startswith("谈到AI") and "他自己" in ftext["F10"] and "他并不赞成" in ftext["F12"])
check("通讯含双破折号 ——", "——" in alltext["新闻通讯"])
check("通讯含内层单引号 ‘’", "‘下限’" in ftext["F04"] and "‘上限’" in ftext["F04"])
check("消息保留 47个社团 / 第一志愿、第二志愿 / 中文分号",
      "47个社团" in alltext["新闻消息"] and "第一志愿、第二志愿" in alltext["新闻消息"] and "；" in alltext["新闻消息"])
check("三份合同均无 2026", all("2026" not in t for t in alltext.values()))
check("三份合同均无 '作者：'/'记者：'/'来源：' 等标签",
      all(g not in t for t in alltext.values() for g in ["作者：", "记者：", "评论员：", "来源：", "出处：", "文／"]))
check("三处署名恰为 '蓝色空间'",
      mtext["byline"] == ftext["byline"] == ctext["byline"] == "蓝色空间")

report.append("\n" + "=" * 70)
if failures:
    report.append("RESULT: FAIL (%d)" % len(failures))
    for x in failures:
        report.append("  - " + x)
else:
    report.append("RESULT: ALL CHECKS PASS")

out = "\n".join(report)
(ROOT / "_qa_task1" / "report.txt").write_text(out, encoding="utf-8")
print(out)
