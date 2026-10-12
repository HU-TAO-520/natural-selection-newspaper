#!/usr/bin/env python3
# Task 13.4 反向抽取 + 13.5 日期校验 + 13.6 禁项与年份扫描（作用于 content/）。
# 只读 content/；产物 _qa_task13/extracted_sources.json。解析错误退出码 2，并给出文件、行号与条款编号。
import hashlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONTENT = os.path.join(ROOT, "content")
QA = os.path.join(ROOT, "qa/_qa_task13")

EXIT_OK, EXIT_INPUT = 0, 2
KEYS = ["slug", "column", "title", "byline", "date", "display_date", "end_date", "order"]
RESERVED = ["con", "aux", "prn", "nul"] + ["com%d" % i for i in range(1, 10)] + ["lpt%d" % i for i in range(1, 10)]
VALUE_BAD_STARTS = "\"'>|&*"
DATELINE_CLOSE = "**"
FORBID_STRINGS = ["厨一枚", "胡桃", "新闻评价", "作者：", "记者：", "来源：", "出处：",
                  "Materials/", "TODO", "TBD", "{{", "}}"]
MATERIAL_HASHES = ["de10b575399e0563430f2f255c956b179c9978c087897a24910ad70d6a50f6fc",
                   "0c5b35256b7271acfb2f49aec146288b404ed49c376ac2c8b3f6246b38f894a4",
                   "8e50cfc89287035163d5fe95c8b1cee20a5aa405e9d04ec358fb5c9312c3827c"]
ZERO_WIDTH = ["U+200B", "U+200C", "U+200D", "U+2060", "U+FEFF"]
ERRORS = []


def err(path, line, clause, detail):
    ERRORS.append("FAIL exit=2 [%s] %s:%s :: %s" % (clause, rel(path), line if line else "-", detail))
    raise StopValidation()


class StopValidation(Exception):
    pass


def rel(path):
    return os.path.relpath(path, ROOT).replace("\\", "/")


def codepoints(text):
    return ["U+%04X" % ord(ch) for ch in text]


def byte_layer(path, raw):
    if raw[:3] == b"\xef\xbb\xbf":
        err(path, 1, "§1 字节层", "存在 UTF-8 BOM")
    if b"\r" in raw:
        err(path, None, "§1 字节层", "存在 CR 或 CRLF 行尾")
    if b"\t" in raw:
        err(path, None, "§1 字节层", "存在 TAB 字符")
    if not raw.endswith(b"\n") or raw.endswith(b"\n\n"):
        err(path, None, "§1 字节层", "文件未以恰好一个 LF 结束")
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        err(path, None, "§1 字节层", "非合法 UTF-8：%s" % exc)
    for i, line in enumerate(text.split("\n"), start=1):
        if line.endswith(" "):
            err(path, i, "§1 字节层", "行尾存在空白字符")
        if line.endswith("\\"):
            err(path, i, "§1 字节层", "行尾反斜杠")
    for i, ch in enumerate(text):
        cp = ord(ch)
        if cp < 0x20 and ch != "\n":
            err(path, text[:i].count("\n") + 1, "§1 字节层", "控制字符 U+%04X" % cp)
        if cp == 0x7F:
            err(path, text[:i].count("\n") + 1, "§1 字节层", "控制字符 U+007F")
        if ch in ("​", "‌", "‍", "⁠", "﻿"):
            err(path, text[:i].count("\n") + 1, "§1 字节层 第7条", "零宽字符 U+%04X，须原样登记不得静默删除" % cp)
    if "\n\n\n" in text:
        err(path, None, "§1 字节层", "出现连续三个及以上空行")
    return text


def parse_registry(path):
    text = byte_layer(path, open(path, "rb").read())
    lines = [ln for ln in text.split("\n") if ln != ""]
    if lines and not lines[0].startswith("message|"):
        err(path, 1, "§2 注册表", "首个非空行不以 message| 开头：%r" % lines[0])
    if len(lines) != 3:
        err(path, None, "§2 注册表 第1条", "注册条目应恰为 3 行（不得有表头或第四条），实测 %d" % len(lines))
    entries = []
    for no, line in enumerate(lines, start=1):
        parts = line.split("|")
        if len(parts) != 3 or any(p == "" for p in parts):
            err(path, no, "§2 注册表", "字段须以单个 ASCII 竖线分隔且非空：%r" % line)
        if " " in line:
            err(path, no, "§2 注册表", "注册表不得有空格填充：%r" % line)
        key, label, page = parts
        if not re.match(r"^新闻(消息|通讯|评论)$", label):
            err(path, no, "§2 注册表", "栏目名不合规：%r" % label)
        entries.append({"row": no, "key": key, "label": label, "list_page": page})
    if len({e["key"] for e in entries}) != 3 or len({e["label"] for e in entries}) != 3:
        err(path, None, "§2 注册表", "key 或 label 不唯一")
    if [e["key"] for e in entries] != ["message", "feature", "commentary"]:
        err(path, None, "§2 注册表 第6条", "注册表顺序必须是 消息→通讯→评论")
    if [e["list_page"] for e in entries] != ["news-message.html", "news-feature.html", "news-commentary.html"]:
        err(path, None, "§2 注册表 第3条", "第三列必须等于既有列表页文件名")
    return entries


def parse_article(path, registry):
    text = byte_layer(path, open(path, "rb").read())
    lines = text.split("\n")
    if lines[0] != "---":
        err(path, 1, "§3 结构", "第 1 行必须是 ---")
    sep_rows = [i for i, ln in enumerate(lines, start=1) if ln == "---"]
    if sep_rows != [1, sep_rows[-1]] or len(sep_rows) != 2:
        err(path, sep_rows[1] if len(sep_rows) > 1 else None, "§3 结构",
            "独立成行的 --- 必须恰为两处（第 1 行与正文区前），实测行号 %r" % (sep_rows,))
    fm_lines = lines[1:sep_rows[1] - 1]
    if lines[sep_rows[1]] != "":
        err(path, sep_rows[1] + 1, "§3 结构", "正文区前的 --- 之后必须恰有一个空行")
    fields = {}
    for offset, line in enumerate(fm_lines, start=2):
        if line == "":
            err(path, offset, "§3 front-matter", "front-matter 区内不得有空行")
        if ": " not in line:
            err(path, offset, "§3 front-matter 第1条", "键值须以第一个 ASCII 冒号加空格分界：%r" % line)
        key, value = line.split(": ", 1)
        if not re.match(r"^[a-z_]+$", key):
            err(path, offset, "§3 front-matter 第1条", "键含非 [a-z_] 字符：%r" % key)
        if key not in KEYS:
            err(path, offset, "§3 front-matter 第2条", "未知键 %r，八键白名单之外" % key)
        if key in fields:
            err(path, offset, "§3 front-matter 第2条", "重复键 %r" % key)
        value = value.strip(" ")
        if value == "":
            err(path, offset, "§3 front-matter 第2条", "键 %r 取值为空" % key)
        if value[0] in VALUE_BAD_STARTS:
            err(path, offset, "§3 front-matter 第3条", "值以被禁 YAML 形态字符开头：%r" % value)
        fields[key] = {"line": offset, "value": value}
    body = lines[sep_rows[1] + 1:]
    while body and body[-1] == "":
        body.pop()
    paragraphs = parse_body(path, body, sep_rows[1] + 2)
    return validate(path, fields, paragraphs, registry)


def parse_body(path, body, first_line):
    if not body:
        err(path, first_line, "正文区规则 第7条", "正文为空，一篇文章至少要有段落")
    if any(ln == "---" for ln in body):
        err(path, first_line + [i for i, ln in enumerate(body) if ln == "---"][0],
            "正文区规则 第6条", "正文不得包含独立成行的 ---")
    paragraphs = []
    for i, line in enumerate(body):
        number = first_line + i
        if i % 2 == 1:
            if line != "":
                err(path, number, "正文区规则 第1条", "段落之间必须恰好一个空行（第 %d 行非空）" % number)
            continue
        if line == "":
            err(path, number, "正文区规则 第1条", "段落跨行或出现多余空行")
        if line[:1] in (" ", "\t"):
            err(path, number, "正文区规则 第2条", "段内出现 ASCII 行首空白")
        paragraphs.append({"line": number, "raw": line})
    if len(body) % 2 == 0:
        err(path, first_line + len(body), "正文区规则 第1条", "末段之后出现空行")
    return paragraphs


BAD_CHARS = ["`", "<", ">", "#", "[", "]", "!"]
BAD_LINE_START = ["-", "*", ">", "|", "~"]


def scan_forbidden_marks(path, paragraphs):
    for para in paragraphs:
        line, raw = para["line"], para["raw"]
        for ch in BAD_CHARS:
            if ch in raw:
                err(path, line, "正文区规则 第5条", "段落含被禁标记 %r" % ch)
        if raw[:1] in BAD_LINE_START or re.match(r"^\d+\.", raw):
            if para is paragraphs[0] and raw.startswith("*"):
                pass
            else:
                err(path, line, "正文区规则 第5条", "段落以被禁标记起行：%r" % raw[:2])
        if line != paragraphs[0]["line"]:
            if "*" in raw:
                err(path, line, "正文区规则 第4条", "第二段及以后出现星号")
        else:
            if "*" not in raw:
                continue
            if raw.count("**") != 2 or not raw.startswith("**"):
                err(path, line, "正文区规则 第3／4条", "只有首段允许恰好一对 ** 电头，且必须置于段首")
            close = raw.index("**", 2)
            if close <= 2:
                err(path, line, "正文区规则 第3条", "电头内容为空")
            after = raw[close + 2:]
            if after[:1] != " " or after[1:2] == " " or after == "":
                err(path, line, "正文区规则 第3条／高风险字符表", "电头闭合后必须紧跟恰好一个 U+0020")


def validate(path, fields, paragraphs, registry):
    for key in ("slug", "column", "title", "byline"):
        if key not in fields:
            err(path, None, "§3 front-matter 第2条", "必填键 %s 缺失" % key)
    stem = os.path.basename(path)[:-3]
    slug = fields["slug"]["value"]
    if slug != stem:
        err(path, fields["slug"]["line"], "§3 第4条", "slug %r 不等于文件名主干 %r" % (slug, stem))
    if not re.match(r"^[a-z0-9][a-z0-9-]{2,40}$", slug):
        err(path, fields["slug"]["line"], "§3 第4条", "slug 不匹配 ^[a-z0-9][a-z0-9-]{2,40}$：%r" % slug)
    if stem.lower() in RESERVED:
        err(path, fields["slug"]["line"], "§3 第4条", "文件名主干整干等于 Windows 保留设备名")
    if re.match(r"^[MFC]\d{2}$", slug):
        err(path, fields["slug"]["line"], "§3 第4条／R6 第4条", "slug 命中编号形态 ^[MFC]\\d{2}$")
    for pattern in (r"\d{4}", r"\d{1,2}-\d{1,2}", r"\d{8}"):
        if re.search(pattern, slug):
            err(path, fields["slug"]["line"], "§3 第4条", "slug 含日期形态数字（%s）：%r" % (pattern, slug))
    keys = {e["key"]: e for e in registry}
    if fields["column"]["value"] not in keys:
        err(path, fields["column"]["line"], "§3 第5条", "column %r 不在注册表内" % fields["column"]["value"])
    if fields["byline"]["value"] not in ("蓝色空间", "站外投稿"):
        err(path, fields["byline"]["line"], "§3 第6条／R15",
            "byline 不在白名单 {蓝色空间, 站外投稿} 内：%r" % fields["byline"]["value"])
    for prefix in ("作者：", "记者：", "评论员："):
        if prefix in fields["byline"]["value"]:
            err(path, fields["byline"]["line"], "§3 第6条", "byline 含被禁前缀 %r" % prefix)
    if "date" in fields and not re.match(r"^\d{4}-\d{2}-\d{2}$", fields["date"]["value"]):
        err(path, fields["date"]["line"], "§3 第7条", "date 必须匹配 ^\\d{4}-\\d{2}-\\d{2}$")
    if "order" in fields and not re.match(r"^(0|[1-9]\d*)$", fields["order"]["value"]):
        err(path, fields["order"]["line"], "§3 第10条", "order 必须为非负整数：%r" % fields["order"]["value"])
    if "end_date" in fields and fields["column"]["value"] != "commentary":
        err(path, fields["end_date"]["line"], "§3 第9条", "非评论类不得出现 end_date")
    if "display_date" not in fields:
        err(path, None, "§3 第8条／R9②", "display_date 缺失，日期节点无法判定")
    dd = fields["display_date"]["value"]
    if not re.match(r"^\d{1,2}月\d{1,2}日$", dd):
        err(path, fields["display_date"]["line"], "§3 第8条", "display_date 不匹配 ^\\d{1,2}月\\d{1,2}日$：%r" % dd)
    scan_forbidden_marks(path, paragraphs)
    texts = [p["raw"] for p in paragraphs]
    dateline = None
    if texts[0].startswith("**"):
        close = texts[0].index("**", 2)
        dateline = {"is_first_paragraph": True, "text": texts[0][2:close],
                    "followed_by_exactly_one_u0020": texts[0][close + 2:close + 3] == " " and texts[0][close + 3:close + 4] != " "}
        texts[0] = texts[0][2:close] + texts[0][close + 2:]
    haystacks = [("paragraph[%d]" % (i + 1), t) for i, t in enumerate(texts)]
    if "end_date" in fields:
        haystacks.append(("end_date", fields["end_date"]["value"]))
    positions = []
    for label, hay in haystacks:
        start = hay.find(dd)
        while start >= 0:
            positions.append({"field": label, "offset": start})
            start = hay.find(dd, start + 1)
    if not positions:
        err(path, fields["display_date"]["line"], "§3 第8条／R5②", "display_date %r 不是本文 textContent 的子串" % dd)
    return {
        "source_file": rel(path),
        "slug": slug,
        "column": fields["column"]["value"],
        "column_label": keys[fields["column"]["value"]]["label"],
        "list_page": keys[fields["column"]["value"]]["list_page"],
        "title": fields["title"]["value"],
        "title_length": len(fields["title"]["value"]),
        "title_line": fields["title"]["line"],
        "byline": fields["byline"]["value"],
        "byline_length": len(fields["byline"]["value"]),
        "byline_codepoints": codepoints(fields["byline"]["value"]),
        "paragraph_count": len(texts),
        "paragraph_char_total": sum(len(t) for t in texts),
        "paragraphs": [{"index": i + 1, "source_line": p["line"], "text": t, "length": len(t),
                        "u0020_count": t.count(" "), "codepoints": codepoints(t)}
                       for i, (p, t) in enumerate(zip(paragraphs, texts))],
        "dateline": dateline,
        "end_date": fields["end_date"]["value"] if "end_date" in fields else None,
        "end_date_codepoints": codepoints(fields["end_date"]["value"]) if "end_date" in fields else [],
        "display_date": {"present": True, "value": dd, "line": fields["display_date"]["line"],
                         "matches_regex": bool(re.match(r"^\d{1,2}月\d{1,2}日$", dd)),
                         "no_four_digit_year": not re.search(r"(19|20)\d{2}", dd),
                         "positions": positions},
        "date": {"present": "date" in fields, "value": fields["date"]["value"] if "date" in fields else None,
                 "status": "已声明" if "date" in fields else "未提供 → 未分组"},
        "order": {"present": "order" in fields, "value": fields["order"]["value"] if "order" in fields else None},
        "front_matter_keys": sorted(fields),
    }


FORBID_PATTERNS = [(r"[MFC]\d{2}", "13.6 第3条 编号串", False),
                   (r"[0-9a-f]{16}", "13.6 第1条 16 位十六进制片段", False),
                   (r"[0-9A-F]{16}", "13.6 第1条 16 位十六进制片段", False),
                   (r"\d{4}-\d{2}-\d{2}", "13.6 第2条 ISO 形态", True),
                   (r"(19|20)\d{2}", "13.6 第2条 年份形态", True),
                   (r"2026", "13.6 第2条 年份 2026", True),
                   (r"\.docx", "13.6 第1条 素材扩展名", False)]


def forbidden_scan(paths):
    findings = []
    for path in paths:
        text = open(path, encoding="utf-8").read()
        for no, line in enumerate(text.split("\n"), start=1):
            for s in FORBID_STRINGS:
                if s in line:
                    findings.append((rel(path), no, "13.6 第1条 禁串", s, line))
            for digest in MATERIAL_HASHES:
                if digest in line:
                    findings.append((rel(path), no, "13.6 第1条 素材哈希", digest, line))
            for pattern, clause, date_line_exempt in FORBID_PATTERNS:
                if date_line_exempt and re.match(r"^date: \S", line):
                    continue
                for match in re.finditer(pattern, line):
                    findings.append((rel(path), no, clause, match.group(0), line))
    return findings


def main():
    if not os.path.isdir(CONTENT):
        print("FAIL exit=2 [§交付物] content/ 不存在", file=sys.stderr)
        return EXIT_INPUT
    columns = parse_registry(os.path.join(CONTENT, "columns.md"))
    for name in ("_模板.md",):
        byte_layer(os.path.join(CONTENT, name), open(os.path.join(CONTENT, name), "rb").read())
    articles_dir = os.path.join(CONTENT, "articles")
    names = sorted(os.listdir(articles_dir))
    if any(not n.endswith(".md") for n in names):
        err(os.path.join(articles_dir, "-"), None, "§3 结构", "content/articles/ 只允许 .md 文件：%r" % names)
    articles = []
    for name in names:
        articles.append(parse_article(os.path.join(articles_dir, name), columns))
    if len(articles) != 3:
        print("FAIL exit=3 [13.3 完成条件] 文章源文件应恰为 3 篇，实测 %d" % len(articles), file=sys.stderr)
        return 3
    scan = forbidden_scan([os.path.join(CONTENT, f) for f in ("columns.md", "_模板.md")]
                          + [os.path.join(articles_dir, n) for n in names])
    out = {
        "generated_by": "qa/_qa_task13/extract_sources.py",
        "scope": "Task 13.4 反向抽取 + 13.5 日期校验 + 13.6 禁项扫描",
        "registry": columns,
        "articles": {a["slug"]: a for a in articles},
        "article_count": len(articles),
        "forbidden_scan": {
            "scope": "content/ 全部 5 个文件；不含 plan/ 与 _qa_task13/",
            "exemption": "仅 date: 行允许 ISO／四位年份（排序输入，且永不进入输出文件）",
            "hits": [{"file": f, "line": n, "clause": c, "token": t, "text": ln} for f, n, c, t, ln in scan],
            "hit_count": len(scan),
        },
        "content_files_sha256": {},
    }
    for f in ("columns.md", "_模板.md"):
        out["content_files_sha256"][rel(os.path.join(CONTENT, f))] = hashlib.sha256(
            open(os.path.join(CONTENT, f), "rb").read()).hexdigest()
    for n in names:
        p = os.path.join(articles_dir, n)
        out["content_files_sha256"][rel(p)] = hashlib.sha256(open(p, "rb").read()).hexdigest()
    if scan:
        for item in out["forbidden_scan"]["hits"]:
            print("FAIL exit=2 [%s] %s:%d :: %r" % (item["clause"], item["file"], item["line"], item["token"]),
                  file=sys.stderr)
        return EXIT_INPUT
    path = os.path.join(QA, "extracted_sources.json")
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(out, handle, ensure_ascii=False, indent=1, sort_keys=True)
        handle.write("\n")
    print("OK 13.4＋13.5＋13.6：反向解析 %s 段/篇；display_date 均已指认位置；禁项扫描命中 0"
          % [a["paragraph_count"] for a in articles])
    return EXIT_OK


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    try:
        code = main()
    except StopValidation as exc:
        for line in ERRORS:
            print(line, file=sys.stderr)
        code = EXIT_INPUT
    except SystemExit as exc:
        code = exc.code if isinstance(exc.code, int) else EXIT_INPUT
        for line in ERRORS:
            print(line, file=sys.stderr)
    except Exception as exc:
        print("FAIL exit=2 运行异常 %r" % (exc,), file=sys.stderr)
        code = EXIT_INPUT
    sys.exit(code)
