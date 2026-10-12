# -*- coding: utf-8 -*-
"""Task 1 supplementary checks: hidden content, numbering, footnotes, metadata, invariance."""
import io
import json
import os
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
MAT = ROOT / "Materials"
W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
FILES = ["新闻消息.docx", "新闻通讯.docx", "新闻评价.docx"]
out = []

BASELINE_SHA = {
    "新闻消息.docx": "DE10B575399E0563430F2F255C956B179C9978C087897A24910AD70D6A50F6FC",
    "新闻通讯.docx": "0C5B35256B7271ACFB2F49AEC146288B404ED49C376AC2C8B3F6246B38F894A4",
    "新闻评价.docx": "8E50CFC89287035163D5FE95C8B1CEE20A5AA405E9D04EC358FB5C9312C3827C",
}

out.append("### A. 哈希复核")
for f in FILES:
    import hashlib
    h = hashlib.sha256((MAT / f).read_bytes()).hexdigest().upper()
    out.append("  %-16s %s  %s" % (f, h, "MATCH" if h == BASELINE_SHA[f] else "MISMATCH"))

out.append("\n### B. 隐藏内容 / 列表 / 域 / 修订 扫描（word/document.xml）")
HIDDEN_PATTERNS = {
    "w:vanish": "隐藏文字", "w:numPr": "编号列表", "w:ilvl": "列表层级",
    "w:highlight": "高亮", "w:webHidden": "web隐藏", "w:rPrChange": "格式修订",
    "w:pPrChange": "段落修订", "w:moveFrom": "移动删除", "w:moveTo": "移动插入",
    "w:customXml": "自定义XML", "w:altText": "替代文字", "w:proofErr": "拼写校验标记",
    "w:noProof": "免校验", "w:delText": "删除文本", "w:smartTag": "智能标签",
    "w:clrSchemeOVERRIDE": "", "v:imagedata": "图片", "w:pict": "图形",
}
for f in FILES:
    with zipfile.ZipFile(str(MAT / f)) as z:
        raw = z.read("word/document.xml").decode("utf-8")
        names = z.namelist()
    hits = {k: raw.count(k) for k in HIDDEN_PATTERNS if k in raw}
    out.append("  %s: %s" % (f, json.dumps(hits, ensure_ascii=False)))
    # 颜色：检查是否有白色/隐藏色文本
    colors = set(re.findall(r'<w:color w:val="([0-9A-Fa-f]{6})"', raw))
    if colors:
        out.append("      文本颜色值: %s" % sorted(colors))
    fonts = set(re.findall(r'w:eastAsia="([^"]+)"', raw))
    out.append("      部件清单: %s" % json.dumps(names, ensure_ascii=False))

out.append("\n### C. footnotes.xml / endnotes.xml 内容（仅默认分隔符？）")
for f in FILES:
    with zipfile.ZipFile(str(MAT / f)) as z:
        for part in ("word/footnotes.xml", "word/endnotes.xml"):
            if part not in z.namelist():
                continue
            x = z.read(part).decode("utf-8")
            root = ET.fromstring(x)
            items = []
            for node in root:
                fid = node.get("{%s}id" % W)
                typ = node.get("{%s}type" % W)
                texts = "".join(t.text or "" for t in node.iter("{%s}t" % W))
                items.append({"id": fid, "type": typ, "text": texts})
            out.append("  %s / %s -> %s" % (f, part, json.dumps(items, ensure_ascii=False)))

out.append("\n### D. 段落样式与 run 拆分实况")
for f in FILES:
    with zipfile.ZipFile(str(MAT / f)) as z:
        x = z.read("word/document.xml").decode("utf-8")
    root = ET.fromstring(x)
    body = root.find("{%s}body" % W)
    styles = {}
    multi_run = []
    for i, p in enumerate([c for c in body if c.tag == "{%s}p" % W], 1):
        st = p.find("{%s}pPr/{%s}pStyle" % (W, W))
        sv = st.get("{%s}val" % W) if st is not None else "(默认 Normal)"
        styles[sv] = styles.get(sv, 0) + 1
        ts = [t.text or "" for t in p.iter("{%s}t" % W)]
        if len(ts) > 1:
            multi_run.append({"para": i, "runs": ts})
    out.append("  %s: 样式分布 %s" % (f, json.dumps(styles, ensure_ascii=False)))
    for mr in multi_run:
        out.append("      第%d段被拆为%d个run: %s" % (mr["para"], len(mr["runs"]),
                                                     json.dumps(mr["runs"], ensure_ascii=False)))

out.append("\n### E. Word 元数据（仅登记为禁止项，不得进入 Results/）")
for f in FILES:
    with zipfile.ZipFile(str(MAT / f)) as z:
        core = z.read("docProps/core.xml").decode("utf-8")
        app = z.read("docProps/app.xml").decode("utf-8") if "docProps/app.xml" in z.namelist() else ""
    creator = re.findall(r"<dc:creator>(.*?)</dc:creator>", core)
    lastmod = re.findall(r"<cp:lastModifiedBy>(.*?)</cp:lastModifiedBy>", core)
    created = re.findall(r"<dcterms:created[^>]*>(.*?)</dcterms:created>", core)
    modified = re.findall(r"<dcterms:modified[^>]*>(.*?)</dcterms:modified>", core)
    pages = re.findall(r"<Pages>(.*?)</Pages>", app)
    app_ = re.findall(r"<Application>(.*?)</Application>", app)
    out.append("  %s: creator=%s lastModifiedBy=%s created=%s modified=%s Pages=%s App=%s"
               % (f, creator, lastmod, created, modified, pages, app_))

out.append("\n### F. 源文件修改时间未变 / Results 仍为空")
mt = {"新闻消息.docx": "2026-09-18 19:09", "新闻通讯.docx": "2026-09-17 22:59", "新闻评价.docx": "2026-09-18 21:38"}
for f in FILES:
    st = os.stat(MAT / f)
    import datetime
    iso = datetime.datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d %H:%M")
    out.append("  %s: mtime=%s size=%d" % (f, iso, st.st_size))
res = ROOT / "Results"
entries = sorted(os.listdir(res)) if res.exists() else []
out.append("  Results/ 内容: %s (共 %d 项)" % (json.dumps(entries, ensure_ascii=False), len(entries)))
out.append("  Materials/ 内容: %s" % json.dumps(sorted(os.listdir(MAT)), ensure_ascii=False))

(ROOT / "_qa_task1" / "report2.txt").write_text("\n".join(out), encoding="utf-8")
print("\n".join(out))
