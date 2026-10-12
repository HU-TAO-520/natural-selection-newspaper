# -*- coding: utf-8 -*-
"""Task 1 verification harness (read-only on Materials/, writes only into _qa_task1/)."""
import hashlib
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAT = ROOT / "Materials"
PLAN = ROOT / "plan" / "Task1-素材基线与内容合同.md"

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def q(tag):
    return "{%s}%s" % (W, tag)


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest().upper()


def parse_contract(md_text):
    """Return {section_name: [(key, text), ...]} from the three ```text blocks."""
    blocks = {}
    lines = md_text.split("\n")
    current_heading = None
    i = 0
    while i < len(lines):
        line = lines[i]
        m = re.match(r"^### (\S+)\s*$", line)
        if m:
            current_heading = m.group(1)
        if line.strip() == "```text":
            body = []
            i += 1
            while i < len(lines) and lines[i].strip() != "```":
                body.append(lines[i])
                i += 1
            key = current_heading
            entries = []
            for bl in body:
                if "|" not in bl:
                    continue
                k, v = bl.split("|", 1)
                entries.append((k.strip(), v))
            if entries:
                blocks.setdefault(key, entries)
        i += 1
    return blocks


def para_text(p):
    """Concatenate visible w:t of a paragraph in document order, no separators."""
    out = []
    for node in p.iter():
        if node.tag == q("t"):
            out.append(node.text or "")
        elif node.tag == q("tab"):
            out.append("\t")
        elif node.tag in (q("br"), q("cr")):
            out.append("\n")
    return "".join(out)


def inspect(path):
    z = zipfile.ZipFile(str(path))
    names = sorted(z.namelist())
    xml = z.read("word/document.xml").decode("utf-8")
    root = ET.fromstring(xml)
    body = root.find(q("body"))
    paras = [c for c in body if c.tag == q("p")]
    tables = [c for c in body if c.tag == q("tbl")]

    per_para = []
    for idx, p in enumerate(paras):
        texts = [n.text or "" for n in p.iter() if n.tag == q("t")]
        visible = "".join(texts)
        flags = {}
        tags = set(n.tag for n in p.iter())
        interesting = {
            "hyperlink": "hyperlink", "drawing": "drawing", "pict": "pict",
            "footnoteReference": "footnoteReference", "endnoteReference": "endnoteReference",
            "commentReference": "commentReference", "commentRangeStart": "commentRangeStart",
            "bookmarkStart": "bookmarkStart", "instrText": "instrText",
            "ins": "ins", "del": "del", "fldSimple": "fldSimple",
            "sdt": "sdt", "tbl": "tbl", "tab": "tab", "br": "br",
            "lastRenderedPageBreak": "lastRenderedPageBreak",
        }
        for tag, label in interesting.items():
            if q(tag) in tags:
                flags[label] = True
        # style
        st = p.find(q("pPr") + "/" + q("pStyle"))
        per_para.append({
            "index": idx + 1,
            "runs": len(texts),
            "visible": visible,
            "empty": visible.strip("") == "" and visible == "",
            "style": st.get(q("val")) if st is not None else None,
            "flags": flags,
        })

    all_tags = sorted(t.split("}")[1] for t in set(n.tag for n in root.iter()))
    return {
        "file": str(path.relative_to(ROOT)),
        "sha256": sha256(path),
        "parts": names,
        "body_children_order": [c.tag.split("}")[1] for c in body],
        "para_count_total": len(paras),
        "table_count": len(tables),
        "nonempty_count": len([p for p in per_para if p["visible"] != ""]),
        "paras": per_para,
        "doc_xml_tags": all_tags,
        "raw_doc_xml": xml,
        "core_props": z.read("docProps/core.xml").decode("utf-8") if "docProps/core.xml" in names else None,
        "app_props": z.read("docProps/app.xml").decode("utf-8") if "docProps/app.xml" in names else None,
    }


def main():
    md = PLAN.read_text(encoding="utf-8")
    contract = parse_contract(md)
    sys.stdout.write("contract sections: %s\n" % json.dumps(
        {k: [e[0] for e in v] for k, v in contract.items()}, ensure_ascii=False))

    files = {
        "新闻消息": MAT / "新闻消息.docx",
        "新闻通讯": MAT / "新闻通讯.docx",
        "新闻评价": MAT / "新闻评价.docx",
    }
    result = {}
    for name, path in files.items():
        info = inspect(path)
        result[name] = info
        sys.stdout.write(
            "\n== %s ==  sha=%s  paras=%d  nonempty=%d  tables=%d\n"
            % (name, info["sha256"], info["para_count_total"], info["nonempty_count"], info["table_count"]))
        for p in info["paras"]:
            sys.stdout.write("  [%02d] runs=%-3d style=%-10s empty=%-5s flags=%s | %s\n" % (
                p["index"], p["runs"], str(p["style"]), p["empty"],
                ",".join(sorted(p["flags"])) or "-", p["visible"][:40]))
    with open(ROOT / "_qa_task1" / "extracted.json", "w", encoding="utf-8") as f:
        json.dump({k: {kk: vv for kk, vv in v.items() if kk != "raw_doc_xml"}
                   for k, v in result.items()}, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
