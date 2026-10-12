#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Task 18.6 — Q 组：内容源合法性独立解析器（只读，零第三方依赖）

刻意不复用 build/build.py：本包 §真值解析合同与 Task 12 §给 Task 18 都要求
"闸门不能拿被测对象的自我声明当真值"。构建器有自己的 S1–S13 自检，那是实现者自查；
若 Q 组 import 构建器，构建器里一个系统性错误会同时污染自检与闸门，两边一起绿。
因此这里按 plan/Task13 §`content/` 格式合同 + plan/Task12 字段表**另实现一份**最小解析器，
两条互不知情的链在同一批断言上会师；不一致由核验器判 FAIL，不取其一。

规则不写死：字面正则、键白名单、保留设备名、禁标记字符集、全序键序列一律从 plan/ 解析。
用法：python _qa_task18/src_check.py [--content D] [--plan D] [--manifest F] [--out F]
退出码：0 无 FAIL / 1 有 FAIL / 2 崩溃或锚点缺失。
"""
import io
import json
import os
import re
import sys

EXIT_OK, EXIT_FAIL, EXIT_CRASH = 0, 1, 2
YES = "\u2714"   # front-matter 表的必填标记
NO = "\u2716"    # 选填标记
BT = "\u0001"    # 反引号在合同里写成三个反引号转义形态，解析前先占位


def die(code, msg):
    sys.stderr.write(msg.rstrip() + "\n")
    sys.exit(code)


def backticked(s):
    return re.findall(r"`([^`\n]+)`", s)


def first_in(lst, prefix):
    for x in lst:
        if x.startswith(prefix):
            return x
    return None


def plain(p):
    """去掉首段电头的一对星号，得到渲染后的文本节点内容。"""
    if p.startswith("**"):
        j = p.find("**", 2)
        if j >= 0:
            return p[2:j] + p[j + 2:]
    return p


class Anchors:
    """从 plan/ 解析真值；任一锚点缺失即退出码 2 并指出锚点，绝不回退到写死常量。"""

    def __init__(self, plan_dir):
        self.plan = plan_dir
        self.t12 = self._read("Task12-归档总方案与全局合同修订.md")
        self.t13 = self._read("Task13-素材迁移与内容源基线.md")
        self._resolve()

    def _read(self, name):
        p = os.path.join(self.plan, name)
        if not os.path.isfile(p):
            die(EXIT_CRASH, "锚点文件缺失：%s" % p)
        return io.open(p, encoding="utf-8").read()

    def section(self, src, heading, name):
        i = src.find(heading)
        if i < 0:
            die(EXIT_CRASH, "锚点小节缺失：%s（%s）" % (name, heading))
        level = len(heading) - len(heading.lstrip("#"))
        m = re.compile(r"^#{1,%d} " % level, re.M).search(src, i + len(heading))
        return src[i + len(heading):m.start() if m else len(src)]

    def subseg(self, src, marker, name):
        i = src.find(marker)
        if i < 0:
            die(EXIT_CRASH, "锚点缺失：%s（%s）" % (name, marker))
        m = re.compile(r"^#{1,6} ", re.M).search(src, i + len(marker))
        return src[i:m.start() if m else len(src)]

    def _resolve(self):
        # 锚点 4：Task12 §front-matter 字段合同 —— 八字段表（键序 + 必填标记）
        tbl = self.section(self.t12, "### front-matter 字段合同", "Task12 front-matter 字段合同")
        self.fields, reqs = [], []
        for line in tbl.splitlines():
            mm = re.match(r"^\|\s*`([a-z_]+)`\s*\|\s*[" + YES + NO + r"]\s*\|", line)
            if mm:
                mark = re.match(r"^\|\s*`[a-z_]+`\s*\|\s*(" + YES + "|" + NO + r")\s*\|", line)
                self.fields.append(mm.group(1))
                reqs.append(mark.group(1) == YES)
        if len(self.fields) != 8:
            die(EXIT_CRASH, "Task12 front-matter 表未解析出八个字段，实际 %d 个：%s" % (len(self.fields), self.fields))
        self.field_required = dict(zip(self.fields, reqs))
        self.required_keys = [f for f in self.fields if self.field_required[f]]

        # 锚点 4：同节内的三行栏目注册表 fenced 块
        mm = re.search(r"```text\n(message\|[^\n]*\nfeature\|[^\n]*\ncommentary\|[^\n]*)\n```", tbl)
        if not mm:
            die(EXIT_CRASH, "锚点缺失：Task12 content/columns.md 三行注册表 fenced 块")
        self.registry = [tuple(x.split("|")) for x in mm.group(1).splitlines()]
        self.column_order = [r[0] for r in self.registry]
        self.column_label = {r[0]: r[1] for r in self.registry}
        self.column_list = {r[0]: r[2] for r in self.registry}

        # 锚点 4：Task12 R2② 详情页命名合同
        m = re.search(r"`(\^article-\[a-z0-9\]\[a-z0-9-\]\{2,40\}\\.html\$)`", self.t12)
        if not m:
            die(EXIT_CRASH, "锚点缺失：Task12 R2② 详情页命名正则")
        self.page_re = m.group(1)

        # 锚点 5：Task13 §content/ 格式合同 → §3 文章源文件
        art = self.section(self.t13, "### 3. 文章源文件", "Task13 文章源文件")
        item4 = re.search(r"^4\.\s+`slug`.*?(?=^\d+\.\s|\Z)", art, re.M | re.S)
        if not item4:
            die(EXIT_CRASH, "锚点缺失：Task13 §3 第 4 条（slug 规则）")
        b = backticked(item4.group(0))
        self.slug_page_re = first_in(b, "^[MFC]")
        self.date_forms = [x for x in b if x.startswith("\\d")]
        self.reserved = [x for x in b if x in ("con", "aux", "prn", "nul")
                         or re.fullmatch(r"(?:com|lpt)[1-9]", x)]
        m = re.search(r"`(\^\[a-z0-9\]\[a-z0-9-\]\{2,40\}\$)`", art)
        self.slug_re = m.group(1) if m else first_in(b, "^[a-z0-9]")
        if not (self.slug_re and self.slug_page_re and self.reserved and self.date_forms):
            die(EXIT_CRASH, "锚点解析失败：slug 正则 / 编号形态 / 保留设备名 / 日期形态有缺失")

        # 锚点 5：date 与 display_date 的字面正则（Task13 §3 第 7／8 条）
        m = re.search(r"`(\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$)`", art)
        self.date_re = m.group(1) if m else None
        # 两处锚点（Task13 §3 第 8 条 与 Task12 字段表行）必须给同一个正则；不同即冲突，停并回流
        _pd = [m.group(1) for src_ in (art, tbl)
               for m in [re.search(r"`(\^[^`]*?月[^`]*?\$)`", src_)] if m]
        if len(set(_pd)) > 1:
            die(EXIT_CRASH, "两处锚点对 display_date 给出不同正则：%r（回流 Task 12/13）" % (_pd,))
        self.display_date_re = _pd[0] if _pd else None
        if not (self.date_re and self.display_date_re):
            die(EXIT_CRASH, "锚点缺失：date / display_date 的字面正则")
        m = re.search(r"^\|\s*`date`\s*\|\s*[" + YES + NO + r"]\s*\|\s*`([^`]+)`", tbl, re.M)
        self.date_literal = m.group(1) if m else None

        # 锚点 5：字节层规则（Task13 §1）
        self.byte_rules = self.section(self.t13, "### 1. 字节层", "Task13 字节层")

        # 锚点 5：正文区规则 1／3／5（段落单行、电头、禁标记字符集）
        body = self.subseg(art, "正文区规则（", "Task13 正文区规则")
        r5 = re.search(r"^5\.\s.*?(?=^\d+\.\s|\Z)", body, re.M | re.S)
        if not r5 or "以及行首的" not in r5.group(0):
            die(EXIT_CRASH, "锚点缺失或形态不符：Task13 正文区规则 5（禁标记字符集）")
        seg = r5.group(0).replace("`` ` ``", BT)
        head, tail = seg.split("以及行首的", 1)
        self.inline_forbidden = [c for c in backticked(head) if len(c) == 1]
        if BT in head:
            self.inline_forbidden.insert(0, "`")
        self.line_start_forbidden = [c for c in backticked(tail.split("（")[0]) if len(c) == 1 and c != "."]
        self.ordered_list_form = "有序列表形态" in seg
        r1 = re.search(r"^1\.\s.*?(?=^\d+\.\s|\Z)", body, re.M | re.S)
        r3 = re.search(r"^3\.\s.*?(?=^\d+\.\s|\Z)", body, re.M | re.S)
        if not r1 or not r3:
            die(EXIT_CRASH, "锚点缺失：Task13 正文区规则 1／3")
        self.para_single_line = "恰好一行" in r1.group(0)
        self.dateline_rule = r3.group(0)
        self.dateline_space = "恰好一个 U+0020" in r3.group(0)
        if not (self.inline_forbidden and self.line_start_forbidden and self.para_single_line
                and self.dateline_space and self.ordered_list_form):
            die(EXIT_CRASH, "锚点解析失败：禁标记字符集或段落／电头规则未取全")

        # 锚点 4：Task12 §排序全序（R11 四键）—— 只认以"排序全序"开头的权威行
        so = re.search(r"^排序全序[^\n]*$", self.t12, re.M)
        if not so:
            die(EXIT_CRASH, "锚点缺失：Task12 §排序全序权威行")
        self.sort_line = so.group(0)
        tail = self.sort_line.split("：", 1)[1].split("。")[0]
        self.sort_keys = []
        for k in re.findall(r"`(date|order|column|slug)`", tail):
            if k not in self.sort_keys:
                self.sort_keys.append(k)
        self.sort_desc = ["date"] if "降序" in tail else []

    def self_consistency(self):
        out = []
        for name, pat in (("slug", self.slug_re), ("page", self.page_re),
                          ("display_date", self.display_date_re), ("date", self.date_re),
                          ("slug-contract-id", self.slug_page_re)):
            try:
                re.compile(pat)
                out.append([name, pat, "ok"])
            except re.error as e:
                out.append([name, str(pat), "re.error: %s" % e])
        for p in self.date_forms:
            try:
                re.compile(p)
                out.append(["date-form:" + p, p, "ok"])
            except re.error as e:
                out.append(["date-form:" + p, p, "re.error: %s" % e])
        return out


class ParseError(Exception):
    pass


def parse_source(path_, an):
    """按 Task13 §content/ 格式合同实现的最小 front-matter + 正文解析器。"""
    raw = io.open(path_, "rb").read()
    text = raw.decode("utf-8")
    lines = text.split("\n")
    stem = os.path.splitext(os.path.basename(path_))[0]

    byte_checks = [
        ["BOM", not raw.startswith(b"\xef\xbb\xbf"), "无 BOM"],
        ["CR", b"\r" not in raw, "无 CRLF 与孤立 CR"],
        ["TAB", b"\t" not in raw, "无 TAB"],
        ["行尾空白", all(l == l.rstrip(" \t") for l in lines), "行尾无空白"],
        ["末尾LF", text.endswith("\n") and not text.endswith("\n\n"), "恰好一个末尾 LF"],
        ["连续空行", not re.search(r"\n\n\n", text), "无连续三个及以上空行"],
        ["控制字符", not [c for c in text if ord(c) < 32 and c != "\n"], "除 LF 外无控制字符"],
        ["零宽字符", not [c for c in text if ord(c) in (0x200B, 0x200C, 0x200D, 0xFEFF)], "无零宽字符"],
    ]

    if not lines or lines[0].strip() != "---":
        raise ParseError("第 1 行不是 ---")
    idx = [i for i, l in enumerate(lines) if l.strip() == "---"]
    if len(idx) != 2:
        raise ParseError("独立成行的 --- 数量为 %d（合同要求恰两处）" % len(idx))
    fm_lines = lines[idx[0] + 1:idx[1]]
    body_lines = lines[idx[1] + 1:]
    if body_lines and body_lines[0].strip() != "":
        raise ParseError("正文区前的 --- 之后必须恰好一个空行")

    fields, seen, dup_keys = {}, [], []
    for ln, l in enumerate(fm_lines):
        if not l.strip():
            raise ParseError("front-matter 区不得有空行（第 %d 行）" % (idx[0] + 1 + ln))
        j = l.find(": ")
        if j < 0:
            raise ParseError("front-matter 行缺少 ASCII 冒号加空格：%r" % l)
        k, v = l[:j], l[j + 2:].strip(" ")
        if not re.fullmatch(r"[a-z_]+", k):
            raise ParseError("键名含非 [a-z_] 字符：%r" % k)
        if k in fields:
            # 重复键是"违约"而不是"无法解析"：记录后继续，交给 Q1/no-duplicate 判红。
            # 若在此抛错，整篇被丢弃、该判据永远不响，等于把变异吃进解析失败里。
            dup_keys.append("%s=%r" % (k, fields.get(k)))
        if v == "":
            raise ParseError("空值：%s" % k)
        if v[0] in "\"'>|&*":
            raise ParseError("值以被禁 YAML 形态字符开头：%s=%r" % (k, v))
        fields[k] = v
        seen.append(k)

    blocks, cur = [], []
    for l in body_lines:
        if l.strip() == "":
            if cur:
                blocks.append(cur)
                cur = []
        else:
            cur.append(l)
    if cur:
        blocks.append(cur)
    multi = [i + 1 for i, bl in enumerate(blocks) if len(bl) != 1]
    para_lines = [bl[0] for bl in blocks if len(bl) == 1]

    inline_hits, start_hits = [], []
    for i, p in enumerate(para_lines):
        probe = p
        if i == 0 and p.startswith("**"):
            j = p.find("**", 2)
            if j >= 0:
                probe = BT * (j + 2) + p[j + 2:]
        for c in an.inline_forbidden:
            n = probe.count(c)
            if n:
                inline_hits.append("段%d 含禁标记 %r×%d" % (i + 1, c, n))
        for c in an.line_start_forbidden:
            if probe.startswith(c):
                start_hits.append("段%d 行首禁标记 %r" % (i + 1, c))
        if an.ordered_list_form and re.match(r"^\d+\.", probe):
            start_hits.append("段%d 行首有序列表形态" % (i + 1,))

    dl = {"allowed": False, "text": None, "space_ok": None, "count": 0, "star_total": 0,
          "stars_outside_first": [], "unterminated": False, "extra_pairs": False,
          "after": "", "nbsp": False}
    for i, p in enumerate(para_lines):
        if i > 0 and "*" in p:
            dl["stars_outside_first"].append("段%d 出现 *" % (i + 1,))
    if para_lines:
        first = para_lines[0]
        dl["star_total"] = first.count("*")
        dl["after"] = first[:3]
        if first.startswith("**"):
            j = first.find("**", 2)
            if j < 0:
                dl["unterminated"] = True
            else:
                dl["allowed"] = True
                dl["text"] = first[2:j]
                dl["count"] = first.count("**")
                dl["extra_pairs"] = "**" in first[j + 2:]
                rest = first[j + 2:]
                dl["after"] = rest[:3]
                dl["space_ok"] = rest.startswith("\u0020") and not rest.startswith("\u0020\u0020")
                dl["nbsp"] = bool(re.search(r"[\u00A0\u3000]", rest[:2]))

    body_text = "\u0020".join(plain(p) for p in para_lines)
    if fields.get("end_date"):
        body_text += "\n" + fields["end_date"]

    q1 = {"unknown_keys": [k for k in seen if k not in an.fields],
          "duplicate_keys": dup_keys or (len(seen) != len(set(seen))),
          "missing_required": [k for k in an.required_keys if k not in fields],
          "empty_values": [k for k, v in fields.items() if v == ""],
          "keys_seen": seen}
    return {"path": path_, "stem": stem, "byte_checks": byte_checks, "fields": fields,
            "q1": q1, "para_count": len(para_lines), "multi_line_blocks": multi,
            "empty_body": len(blocks) == 0, "inline_hits": inline_hits, "start_hits": start_hits,
            "dateline": dl, "body_text": body_text, "paragraphs": para_lines}


def sort_key(an, a):
    f = a["fields"]
    d = f.get("date")
    col = an.column_order.index(f["column"]) if f.get("column") in an.column_order else 99
    # date 降序、缺失者排"未分组"末尾；order 升序（缺失记 0）；column 注册表序；slug 升序
    inv = "".join(chr(0x10FFFF - ord(c)) for c in d) if d else ""
    return (0 if d else 1, inv, "%010d" % int(f.get("order") or 0), "%02d" % col, a["stem"])


END_DATE_RE = r"^（自然选择号\d{1,2}月\d{1,2}日）$"


def run_checks(an, res, manifest_path):
    rows = []

    def add(cid, obj, ok, detail):
        rows.append({"id": cid, "obj": obj, "ok": bool(ok),
                     "detail": detail if isinstance(detail, str) else json.dumps(detail, ensure_ascii=False)})

    arts = res["articles"]

    for name, pat, st in an.self_consistency():
        add("Q0/anchor", name, st == "ok", "%s -> %s" % (pat, st))
    add("Q0/anchor-required", "Task12 front-matter", len(an.required_keys) == 4,
        "必填键=%s" % an.required_keys)
    add("Q0/anchor-forbidden-set", "Task13 正文区规则 5", len(an.inline_forbidden) >= 7 and len(an.line_start_forbidden) >= 5,
        "段内禁标记=%s 行首禁标记=%s" % (an.inline_forbidden, an.line_start_forbidden))
    add("Q0/anchor-sortkeys", "Task12 排序全序", an.sort_keys == ["date", "order", "column", "slug"],
        "解析到 %s｜%s" % (an.sort_keys, an.sort_line[:70]))

    cf = res["columns_file"]
    add("Q7/registry-matches-plan", "content/columns.md", cf["rows"] == [list(r) for r in an.registry],
        "实测 %s vs Task12 %s" % (cf["rows"], [list(r) for r in an.registry]))
    add("Q7/registry-exactly-3", "content/columns.md", cf["line_count"] == 3, "非空行数=%d" % cf["line_count"])
    add("Q7/registry-no-header", "content/columns.md", cf["no_header"] and cf["no_comment"],
        "无表头行、无注释行")
    add("Q7/registry-label-form", "content/columns.md", cf["label_ok"],
        "label 逐个匹配 ^新闻(消息|通讯|评论)$：%s" % cf["labels"])
    add("Q7/registry-order", "content/columns.md", [r[0] for r in cf["rows"]] == an.column_order,
        "次序=%s 须为 消息→通讯→评论" % [r[0] for r in cf["rows"]])
    add("Q3/registry-bytes", "content/columns.md", cf["bytes_ok"], cf["bytes_detail"])

    for a in arts:
        s, f, q1 = a["stem"], a["fields"], a["q1"]
        add("Q1/whitelist", s, not q1["unknown_keys"], "未知键=%s 白名单=%s" % (q1["unknown_keys"], an.fields))
        add("Q1/no-duplicate", s, not q1["duplicate_keys"], "重复键=%s（键序 %s）" % (q1["duplicate_keys"], q1["keys_seen"]))
        add("Q1/required", s, not q1["missing_required"], "缺失必填=%s" % q1["missing_required"])
        add("Q1/no-empty-value", s, not q1["empty_values"], "无空值")
        add("Q2/slug==stem", s, f.get("slug") == s, "slug=%r 文件名主干=%r" % (f.get("slug"), s))
        add("Q2/slug-regex", s, re.fullmatch(an.slug_re, f.get("slug", "")) is not None,
            "%r 对 %s" % (f.get("slug"), an.slug_re))
        add("Q2/reserved-name", s, s.lower() not in an.reserved,
            "整干全等比较 %d 个保留名，主干=%r" % (len(an.reserved), s.lower()))
        add("Q2/no-contract-id", s, re.fullmatch(an.slug_page_re, f.get("slug", "")) is None,
            "slug 不得匹配 %s" % an.slug_page_re)
        hits = [p for p in an.date_forms if re.search(p, s)]
        add("Q2/no-date-form", s, not hits, "命中日期形态=%s（判据 %s）" % (hits, an.date_forms))
        add("Q3/para-single-line", s, not a["multi_line_blocks"] and not a["empty_body"],
            "跨行块=%s 段数=%d 空正文=%s" % (a["multi_line_blocks"], a["para_count"], a["empty_body"]))
        add("Q3/no-inline-markup", s, not a["inline_hits"], "段内禁标记=%s" % a["inline_hits"])
        add("Q3/no-line-start-markup", s, not a["start_hits"], "行首禁标记=%s" % a["start_hits"])
        add("Q3/byte-layer", s, all(c[1] for c in a["byte_checks"]),
            "字节层异常=%s" % [c[0] for c in a["byte_checks"] if not c[1]])
        # 内容源侧的独立保真腿：段落数与逐段文本必须等于 Task1 合同（不看 Results/、不看构建器）。
        # R12：这条腿只对"标题与某个 Task1 合同块逐字符相等"的文章成立；新稿的权威文本是它自己的 md。
        seq = res["task1_seq_by_stem"].get(s)
        if seq is not None:
            add("Q3/para-count", s, a["para_count"] == len(seq),
                "本文段数=%d vs Task1 合同 %s 段" % (a["para_count"], len(seq)))
            bad = []
            for i in range(min(len(seq), len(a["paragraphs"]))):
                if plain(a["paragraphs"][i]) != seq[i]:
                    bad.append("%s%02d" % (f.get("column"), i + 1))
            add("Q3/body", s, len(seq) == a["para_count"] and not bad,
                "逐段与 Task1 合同不符=%s（合同 %d 段 / 实测 %d 段）" % (bad or "无", len(seq), a["para_count"]))
        dl = a["dateline"]
        add("Q4/dateline-unique", s, not dl["unterminated"] and not dl["extra_pairs"]
            and not dl["stars_outside_first"] and dl["count"] in (0, 2) and dl["star_total"] in (0, 4),
            "首段 ** 对数=%s 星号总数=%d 其他段 * =%s" % (dl["count"], dl["star_total"], dl["stars_outside_first"]))
        if dl["allowed"]:
            add("Q4/dateline-space", s, dl["space_ok"] is True and not dl["nbsp"],
                "闭合后首三字符=%r 码点=%s" % (dl["after"], " ".join("%x" % ord(c) for c in dl["after"])))
        ed = f.get("end_date")
        if ed is not None:
            # R12：end_date 与栏目无关，只受值形态约束（全角括号、只到月日、无年份）。
            add("Q5/end_date-format", s, re.fullmatch(END_DATE_RE, ed) is not None,
                "end_date=%r 对 ^（自然选择号\\d{1,2}月\\d{1,2}日）$" % ed)
        if "end_date" in f and s in res["task1_closing"]:
            add("Q5/end_date==task1-closing", s, f["end_date"] == res["task1_closing"].get(s),
                "end_date=%r vs Task1 closing_date=%r" % (f["end_date"], res["task1_closing"].get(s)))
        if "date" in f:
            add("Q2/date-iso", s, re.fullmatch(an.date_re, f["date"]) is not None,
                "date=%r 对 %s（表内字面写法 %r）" % (f["date"], an.date_re, an.date_literal))
        if "order" in f:
            add("Q2/order-nonneg-int", s, re.fullmatch(r"\d+", f["order"]) is not None,
                "order=%r 须为非负整数" % f["order"])
        dd = f.get("display_date")
        if dd is not None:
            add("Q6/display_date-form", s, re.fullmatch(an.display_date_re, dd) is not None,
                "%r 对 %s" % (dd, an.display_date_re))
            add("Q6/substring", s, dd in a["body_text"],
                "%r 是否为本文 textContent 子串（text 长度 %d）" % (dd, len(a["body_text"])))
        add("Q7/column-registered", s, f.get("column") in an.column_order,
            "column=%r 注册表=%s" % (f.get("column"), an.column_order))
        if s in res["task1_title"]:
            add("Q1/title==task1", s, f.get("title") == res["task1_title"].get(s),
                "title=%r vs Task1 %r" % (f.get("title"), res["task1_title"].get(s)))
            add("Q1/byline==task1", s, f.get("byline") == res["task1_byline"].get(s),
                "byline=%r vs Task1 %r" % (f.get("byline"), res["task1_byline"].get(s)))

    counts = {}
    for a in arts:
        counts[a["fields"].get("column")] = counts.get(a["fields"].get("column"), 0) + 1
    for c in an.column_order:
        add("Q7/column-nonempty", c, counts.get(c, 0) >= 1, "该栏目文章数=%s" % counts.get(c, 0))
    add("Q7/registry-fully-used", "content/columns.md", set(counts) == set(an.column_order),
        "被使用栏目=%s" % sorted(counts))
    slugs = [a["fields"].get("slug") for a in arts]
    add("Q2/slug-unique", "content/articles", len(slugs) == len(set(slugs)), "slug=%s" % slugs)
    add("Q3/article-count>=3", "content/articles", len(arts) >= 3,
        "可解析文章数=%d（R11① 首页取前 3 条的下限；R12 后不再钉死恰好 3 篇）解析失败=%s" % (len(arts), res["errors"]))
    # R12 复盘补的 fail-closed 腿：parse_source 抛错的 md 只进 res["errors"]，此前三者都不出红行，
    # 于是"某篇 md 静默掉出站点"只能靠它恰好让某个栏目变空才被间接撞见。栏目一文→多文之后，
    # 那层巧合就没了。这里把"磁盘上的 md 篇篇都要解析成功"本身钉成判据。
    add("Q3/md-error-free", "content/articles/*.md", not res["errors"],
        "解析失败的 md=%s" % (res["errors"] or "无"))

    ordered = sorted(arts, key=lambda a: sort_key(an, a))
    res["derived_order"] = [a["stem"] for a in ordered]
    res["derived_page"] = ["article-%s.html" % a["stem"] for a in ordered]
    for i, a in enumerate(ordered):
        add("Q8/recompute-rank", a["stem"], i == ordered.index(a),
            "四键全序位置=%d（date=%r order=%r column=%r slug=%r）"
            % (i, a["fields"].get("date"), a["fields"].get("order"), a["fields"].get("column"), a["stem"]))

    try:
        man = json.load(io.open(manifest_path, encoding="utf-8"))
    except Exception as e:
        add("Q8/manifest-readable", manifest_path, False, str(e))
        res["checks"]["items"] = rows
        return sum(1 for r in rows if not r["ok"])
    res["manifest_columns"] = [[c["key"], [x["slug"] for x in c["articles"]], c["list"]] for c in man["columns"]]
    # 同上：可解析篇数必须等于清单承诺的篇数。floor（>=3）挡不住"5 篇里静默少 1 篇"，这条挡得住。
    add("Q3/article-count==manifest", "content/articles ↔ deploy/manifest.json",
        len(arts) == (man.get("counts") or {}).get("articles"),
        "可解析 md=%d vs manifest.counts.articles=%s" % (len(arts), (man.get("counts") or {}).get("articles")))
    by_col = {}
    for a in ordered:
        by_col.setdefault(a["fields"]["column"], []).append(a["fields"]["slug"])
    for c in man["columns"]:
        want = [x["slug"] for x in c["articles"]]
        add("Q8/order-" + c["key"], c["key"], by_col.get(c["key"], []) == want,
            "独立推导 %s vs manifest.columns %s" % (by_col.get(c["key"], []), want))
        add("Q2/page-name-" + c["key"], c["key"],
            all(re.fullmatch(an.page_re, x["page"]) for x in c["articles"]),
            "详情页文件名逐个匹配 %s" % an.page_re)
        add("Q8/page-slug-" + c["key"], c["key"],
            all(x["page"] == "article-%s.html" % x["slug"] for x in c["articles"]),
            "page == article-<slug>.html")
    add("Q7/manifest-column-count", "deploy/manifest.json", len(man["columns"]) == len(an.registry),
        "manifest 栏目数=%d 注册表=%d" % (len(man["columns"]), len(an.registry)))
    add("Q7/manifest-column-order", "deploy/manifest.json",
        [c["key"] for c in man["columns"]] == an.column_order,
        "manifest 栏目序=%s 注册表序=%s" % ([c["key"] for c in man["columns"]], an.column_order))
    add("Q7/manifest-list-name", "deploy/manifest.json",
        all(c["list"] == an.column_list[c["key"]] for c in man["columns"]),
        "列表页文件名逐字等于注册表第三列")
    add("Q5/manifest-no-date", "deploy/manifest.json", "date" not in json.dumps(man, ensure_ascii=False),
        "排序键 date 不得出现在 manifest 任何位置（R5①）")
    add("Q1/manifest-title-agrees", "deploy/manifest.json ↔ content/",
        all(x["title"] == next((a["fields"]["title"] for a in arts if a["fields"].get("slug") == x["slug"]), None)
            for c in man["columns"] for x in c["articles"]),
        "manifest.columns[*].articles[*].title 与 front-matter title 逐字相同")
    # R12：Task1 那条交叉腿只能按文章绑定，但"绑上了几篇"必须被钉住——
    # 少一篇就意味着某篇迁移文静默掉腿，闸门会看着全绿而实际没人比过正文。
    add("Q3/task1-leg-scope", "Task1 合同块 ↔ content/",
        all(len(v) == 1 for v in res["task1_bind"].values()),
        "合同块 %d 个，绑定数=%s；未绑定或一绑多片的=%s"
        % (len(res["task1_by_head"]),
           {h: len(v) for h, v in res["task1_bind"].items()},
           [h for h, v in res["task1_bind"].items() if len(v) != 1] or "无"))
    res["checks"]["items"] = rows
    return sum(1 for r in rows if not r["ok"])


def main():
    args = sys.argv[1:]

    def opt(name, dft):
        for i, a in enumerate(args):
            if a == name:
                return args[i + 1]
        return dft

    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(os.path.dirname(here))
    content = opt("--content", os.path.join(root, "content"))
    plan = opt("--plan", os.path.join(root, "plan"))
    manifest = opt("--manifest", os.path.join(root, "deploy", "manifest.json"))
    out = opt("--out", "")

    an = Anchors(plan)
    res = {"anchors": {
        "fields": an.fields, "required": an.field_required, "required_keys": an.required_keys,
        "registry": [list(r) for r in an.registry], "slug_re": an.slug_re, "page_re": an.page_re,
        "display_date_re": an.display_date_re, "date_re": an.date_re, "date_literal": an.date_literal,
        "reserved": an.reserved, "date_forms": an.date_forms,
        "inline_forbidden": an.inline_forbidden, "line_start_forbidden": an.line_start_forbidden,
        "ordered_list_form": an.ordered_list_form, "para_single_line": an.para_single_line,
        "dateline_space": an.dateline_space,
        "sort_keys": an.sort_keys, "sort_desc": an.sort_desc, "sort_line": an.sort_line,
        "self_consistency": an.self_consistency(),
    }, "articles": [], "checks": {}, "errors": []}

    reg_path = os.path.join(content, "columns.md")
    reg_raw = io.open(reg_path, "rb").read()
    reg_lines = reg_raw.decode("utf-8").splitlines()
    nonblank = [l for l in reg_lines if l.strip()]
    rows = [list(l.split("|")) for l in nonblank if "|" in l]
    res["columns_file"] = {
        "rows": rows, "line_count": len(nonblank),
        "no_header": not any(r[0] in ("key", "字段", "栏目", "公开类型") for r in rows),
        "no_comment": not any(l.lstrip().startswith("#") for l in reg_lines),
        "label_ok": rows and all(re.fullmatch(r"新闻(?:消息|通讯|评论)", r[1]) for r in rows),
        "labels": [r[1] for r in rows],
        "bytes_ok": (not reg_raw.startswith(b"\xef\xbb\xbf")) and b"\r" not in reg_raw
                    and b"\t" not in reg_raw and reg_raw.endswith(b"\n") and not reg_raw.endswith(b"\n\n"),
        "bytes_detail": "BOM=%s CR=%s TAB=%s 末尾LF=%s" % (
            reg_raw.startswith(b"\xef\xbb\xbf"), b"\r" in reg_raw, b"\t" in reg_raw,
            reg_raw.endswith(b"\n") and not reg_raw.endswith(b"\n\n")),
    }

    # 锚点 1：Task1 的 title / byline / closing_date 作为独立对表源（不读 Results/、不调构建器）
    t1 = io.open(os.path.join(plan, "Task1-素材基线与内容合同.md"), encoding="utf-8").read()
    heads = {"message": "### 新闻消息", "feature": "### 新闻通讯", "commentary": "### 新闻评论"}
    per_head = {}
    for h in heads.values():
        i = t1.find(h)
        if i < 0:
            die(EXIT_CRASH, "锚点缺失：Task1 %s" % h)
        m = re.search(r"```text\n(.*?)```", t1[i:], re.S)
        if not m:
            die(EXIT_CRASH, "锚点缺失：Task1 %s 的 text 合同块" % h)
        d = {}
        for line in m.group(1).splitlines():
            if "|" in line:
                k, v = line.split("|", 1)
                d[k] = v
        per_head[h] = d
    res["task1_head_keys"] = {h: sorted(per_head[h]) for h in per_head}
    # R12：Task1 合同按"文章"绑定，不再按栏目取期望值——一个栏目可以有多篇文章。
    res["task1_by_head"] = {}
    for col, h in heads.items():
        d = per_head[h]
        keys = sorted([k for k in d if re.fullmatch(r"[MFC][0-9]{2}", k)], key=lambda k: int(k[1:]))
        res["task1_by_head"][h] = {"col": col, "title": d.get("title"), "byline": d.get("byline"),
                                   "closing_date": d.get("closing_date"),
                                   "seq": [d[k] for k in keys], "seq_len": len(keys)}
    res["task1_seq"] = {m["col"]: m["seq"] for m in res["task1_by_head"].values()}
    res["task1_seq_len"] = {m["col"]: m["seq_len"] for m in res["task1_by_head"].values()}

    adir = os.path.join(content, "articles")
    for f in sorted(x for x in os.listdir(adir) if x.endswith(".md")):
        try:
            a = parse_source(os.path.join(adir, f), an)
        except ParseError as e:
            res["errors"].append("%s: %s" % (f, e))
            continue
        res["articles"].append(a)

    # R12：某篇文章属于"迁移文"，当且仅当它的 title 与某个 Task1 合同块的 title 逐字符相等。
    # 这样绑定不写死 slug，也不依赖"每栏目恰好一篇"；新稿不在表内，即不享有 Task1 那条交叉腿。
    res["task1_title"], res["task1_byline"], res["task1_closing"] = {}, {}, {}
    res["task1_seq_by_stem"], res["migrated_stems"], res["task1_bind"] = {}, [], {}
    for h, meta in res["task1_by_head"].items():
        t = meta.get("title")
        hits = [a["stem"] for a in res["articles"] if t and a["fields"].get("title") == t]
        res["task1_bind"][h] = hits
        if len(hits) != 1:
            continue
        s = hits[0]
        res["migrated_stems"].append(s)
        res["task1_title"][s] = t
        res["task1_byline"][s] = meta.get("byline")
        res["task1_closing"][s] = meta.get("closing_date")
        res["task1_seq_by_stem"][s] = meta["seq"]

    fails = run_checks(an, res, manifest)
    res["fail_count"] = fails
    res["article_count"] = len(res["articles"])
    text = json.dumps(res, ensure_ascii=False, indent=1)
    if out:
        io.open(out, "w", encoding="utf-8", newline="\n").write(text + "\n")
    else:
        sys.stdout.write(text + "\n")
    return EXIT_FAIL if fails else EXIT_OK


if __name__ == "__main__":
    try:
        sys.exit(main())
    except SystemExit:
        raise
    except Exception as e:
        import traceback
        die(EXIT_CRASH, "src_check.py 崩溃：%s\n%s" % (e, traceback.format_exc()))
