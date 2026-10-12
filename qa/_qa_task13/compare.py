#!/usr/bin/env python3
# Task 13.4 双向解析对表 + 逐段长度门禁 + 高风险字符校验 + Task 13.8 期望产物规格。
# --selftest 在临时目录的副本上跑负向变异与反向对照，绝不触碰 content/ 与 Results/。
import hashlib
import json
import os
import re
import shutil
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
QA = os.path.join(ROOT, "qa/_qa_task13")
CONTENT = os.path.join(ROOT, "content")
sys.dont_write_bytecode = True
sys.path.insert(0, QA)
import extract_sources as es  # noqa: E402  与 13.4 共用同一份解析合同

EXIT_OK, EXIT_INPUT, EXIT_ASSERT = 0, 2, 3
ORDER = ["school-course-volunteer", "math-to-ai-learning", "classroom-screen-upgrade"]
PINNED_DISPLAY_DATE = {"school-course-volunteer": "9月18日",
                       "math-to-ai-learning": "9月17日",
                       "classroom-screen-upgrade": "9月18日"}
CLOSING_DATE = "（自然选择号9月18日）"
LENGTH_BASELINE = {
    "school-course-volunteer": [("title", 12), ("byline", 4), ("M01", 96), ("M02", 109), ("M03", 64), ("M04", 19)],
    "math-to-ai-learning": [("title", 12), ("byline", 4), ("F01", 58), ("F02", 114), ("F03", 36), ("F04", 58),
                            ("F05", 81), ("F06", 106), ("F07", 85), ("F08", 99), ("F09", 78), ("F10", 70),
                            ("F11", 83), ("F12", 24), ("F13", 83), ("F14", 21), ("F15", 49), ("F16", 37),
                            ("F17", 43), ("F18", 97), ("F19", 43), ("F20", 44), ("F21", 79), ("F22", 80),
                            ("F23", 61)],
    "classroom-screen-upgrade": [("title", 15), ("byline", 4), ("C01", 80), ("C02", 56), ("C03", 15), ("C04", 64),
                                 ("C05", 138), ("C06", 101), ("C07", 50), ("C08", 75), ("C09", 100), ("C10", 118),
                                 ("C11", 34), ("C12", 167), ("C13", 16), ("C14", 98), ("C15", 68), ("C16", 70),
                                 ("C17", 17), ("C18", 65), ("C19", 30), ("C20", 126), ("C21", 100), ("C22", 13),
                                 ("C23", 65), ("C24", 35), ("C25", 24), ("C26", 163), ("C27", 37), ("C28", 77),
                                 ("C29", 36), ("closing_date", 12)],
}
TOTALS = {"school-course-volunteer": 304, "math-to-ai-learning": 1545, "classroom-screen-upgrade": 2069}
TOKENS = ["86英寸", "47个社团", "5次碰撞", "3个U盘", "Windows 10", ".exe", "UOS", "USB", "OPS", "Linux", "4K",
          "AI", "“", "”", "‘", "’", "——", "她", "他", "；", "不完全统计"]
FIXED_TOKEN_COUNT = {"Windows 10": 2, ".exe": 3}
DIFFS = []
BASELINE = {}


def note(clause, detail):
    DIFFS.append("[%s] %s" % (clause, detail))


def load_json(name):
    path = os.path.join(QA, name)
    if not os.path.exists(path):
        print("FAIL exit=2 [13.4 输入] 缺少 %s" % name, file=sys.stderr)
        raise SystemExit(EXIT_INPUT)
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def baseline_structure(rec):
    dateline = None
    if rec["dateline"]:
        dateline = {"is_first_paragraph": True, "text": rec["dateline"]["text"],
                    "followed_by_exactly_one_u0020": rec["dateline"]["followed_by_exactly_one_u0020"]}
    return {
        "slug": rec["slug"],
        "column": rec["column"],
        "title": rec["h1"],
        "title_subject": rec["title_subject"],
        "byline": rec["byline"],
        "paragraph_count": rec["paragraph_count"],
        "paragraph_char_total": rec["paragraph_char_total"],
        "dateline": dateline,
        "end_date": rec["article_date"]["text"] if rec["article_date"]["present"] else None,
        "paragraphs": [{"index": p["index"], "text": p["text"], "length": p["length"],
                        "u0020_count": p["u0020_count"], "codepoints": p["codepoints"]}
                       for p in rec["paragraphs"]],
    }


def source_structure(art):
    dateline = None
    if art["dateline"]:
        dateline = {"is_first_paragraph": True, "text": art["dateline"]["text"],
                    "followed_by_exactly_one_u0020": art["dateline"]["followed_by_exactly_one_u0020"]}
    return {
        "slug": art["slug"],
        "column": art["column"],
        "title": art["title"],
        "title_subject": art["title"],
        "byline": art["byline"],
        "paragraph_count": art["paragraph_count"],
        "paragraph_char_total": art["paragraph_char_total"],
        "dateline": dateline,
        "end_date": art["end_date"],
        "paragraphs": [{"index": p["index"], "text": p["text"], "length": p["length"],
                        "u0020_count": p["u0020_count"], "codepoints": p["codepoints"]}
                       for p in art["paragraphs"]],
    }


def deep_diff(a, b, path=""):
    if isinstance(a, dict) and isinstance(b, dict):
        for key in sorted(set(a) | set(b)):
            if key not in a:
                note("13.4 深度对表", "%s.%s 仅存在于反向侧：%r" % (path, key, b[key]))
            elif key not in b:
                note("13.4 深度对表", "%s.%s 仅存在于正向侧：%r" % (path, key, a[key]))
            else:
                deep_diff(a[key], b[key], "%s.%s" % (path, key))
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            note("13.4 深度对表", "%s 长度不等 正向 %d／反向 %d" % (path, len(a), len(b)))
        for i, (x, y) in enumerate(zip(a, b)):
            deep_diff(x, y, "%s[%d]" % (path, i))
    elif isinstance(a, (str, int, float, bool, type(None))) and a != b:
        note("13.4 深度对表", "%s 码点序列不等：正向 %r／反向 %r" % (path, a, b))
    elif type(a) is not type(b):
        note("13.4 深度对表", "%s 两侧类型不同：%r／%r" % (path, type(a).__name__, type(b).__name__))


def length_gate(sources):
    checked = 0
    for slug, table in LENGTH_BASELINE.items():
        art = sources[slug]
        values = dict(zip([k for k, _ in table],
                          [len(art["title"]), len(art["byline"])]
                          + [p["length"] for p in art["paragraphs"]]
                          + ([len(art["end_date"])] if art["end_date"] is not None else [])))
        for name, expected in table:
            if values.get(name) != expected:
                note("逐段长度门禁", "%s %s 实测 %r 期望 %d" % (slug, name, values.get(name), expected))
            checked += 1
        if sum(values.get(n, 0) or 0 for n, _ in table) != TOTALS[slug]:
            note("长度合计门禁", "%s 实测 %d 期望 %d" % (slug, sum(values.get(n, 0) or 0 for n, _ in table), TOTALS[slug]))
    return checked


def high_risk_gate(baselines, sources):
    notes = []
    for slug in ORDER:
        base, art = baselines[slug], sources[slug]
        dd = art["display_date"]["value"]
        if dd != PINNED_DISPLAY_DATE[slug]:
            note("13.5 第2条", "%s display_date %r 不等于 slug 定稿表钉定值" % (slug, dd))
        if not art["display_date"]["matches_regex"] or not art["display_date"]["no_four_digit_year"]:
            note("13.5 第2条", "%s display_date 格式不合" % slug)
        joined = "".join(p["text"] for p in base["paragraphs"]) + (base["end_date"] or "")
        if dd not in joined:
            note("13.5 第1条", "%s display_date 不是基线 textContent 的子串" % slug)
        if art["date"]["present"]:
            note("13.5 第3条", "%s 出现了 date 值，须由用户显式声明" % slug)
        else:
            notes.append("%s：%s" % (slug, art["date"]["status"]))
    msg, fea, com = (baselines["school-course-volunteer"], baselines["math-to-ai-learning"],
                     baselines["classroom-screen-upgrade"])
    for label, rec, dl in (("M01", msg, "自然选择号9月18日7时电"), ("F01", fea, "自然选择号9月17日电")):
        if rec["dateline"]["text"] != dl or rec["dateline"]["followed_by_exactly_one_u0020"] is not True:
            note("高风险字符表 第1／2行", "%s 电头文本或其后唯一空格不合规" % label)
        if rec["paragraphs"][0]["u0020_count"] != 1:
            note("高风险字符表 第1／2行", "%s U+0020 计数不是 1" % label)
    seams = [(5, "接口的位置就应该考虑", "C06"), (11, "只能在Windows环境下运行", "C12"),
             (4, "根据记者的不完全统计", "C05"), (20, "从科大讯飞的产品资料来看", "C21")]
    for idx, probe, label in seams:
        if probe not in com["paragraphs"][idx]["text"]:
            note("高风险字符表 %s" % label, "%s 缺少 %r（疑似接缝插空格或被改写）" % (label, probe))
    if "在她看来" not in fea["paragraphs"][4]["text"]:
        note("高风险字符表 F05", "F05 的“她”被改写")
    if com["paragraphs"][28]["text"] != "设备升级了，使用门槛也该降下来。“科技不是高高在上的，而应该服务人民。”":
        note("高风险字符表 C29", "C29 四个 run 未并成同一段或引号被拆")
    if com["end_date"] != CLOSING_DATE:
        note("高风险字符表 closing_date", "结尾行不等于 %r" % CLOSING_DATE)
    blob = "".join(p["text"] for rec in (msg, fea, com) for p in rec["paragraphs"])
    blob += "".join(p["text"] for s in sources.values() for p in s["paragraphs"])
    if re.search(r"安 装", blob):
        note("高风险字符表 C26", "出现被禁的 `安 装`")
    for prefix in ("作者：", "记者：", "来源：", "出处：", "评论员："):
        if prefix in blob:
            note("高风险字符表 前缀", "正文出现被禁前缀 %r" % prefix)
    counts = {}
    for token in TOKENS:
        bcount = sum(p["text"].count(token) for rec in (msg, fea, com) for p in rec["paragraphs"])
        scount = sum(p["text"].count(token) for s in sources.values() for p in s["paragraphs"])
        if bcount != scount:
            note("高风险字符表 计数", "%r 正向 %d／反向 %d" % (token, bcount, scount))
        if token in FIXED_TOKEN_COUNT and scount != FIXED_TOKEN_COUNT[token]:
            note("高风险字符表 计数", "%r 实测 %d 期望 %d" % (token, scount, FIXED_TOKEN_COUNT[token]))
        counts[token] = scount
    if counts.get("她", 0) < 1 or counts.get("他", 0) < 1:
        note("高风险字符表 F05", "她／他 计数异常")
    return counts, notes


def content_disk_scan():
    hits = {"安 装": 0, "2026": 0, "厨一枚": 0, "胡桃": 0, "新闻评价": 0, "ISO 形态": 0, "编号串": 0}
    for base, _, names in os.walk(CONTENT):
        for name in names:
            text = open(os.path.join(base, name), encoding="utf-8").read()
            hits["安 装"] += len(re.findall(r"安 装", text))
            hits["厨一枚"] += text.count("厨一枚")
            hits["胡桃"] += text.count("胡桃")
            hits["新闻评价"] += text.count("新闻评价")
            hits["编号串"] += len(re.findall(r"[MFC]\d{2}", text))
            for line in text.split("\n"):
                if re.match(r"^date: \S", line):
                    continue
                hits["2026"] += line.count("2026")
                hits["ISO 形态"] += len(re.findall(r"\d{4}-\d{2}-\d{2}", line))
    for key, value in hits.items():
        if value:
            note("13.6 磁盘扫描", "content/ 命中 %s = %d" % (key, value))
    return hits


def compare_only(sources):
    baselines = {rec["slug"]: baseline_structure(rec) for rec in BASELINE["pages"].values()}
    DIFFS.clear()
    src = {slug: source_structure(art) for slug, art in sources.items()}
    for slug in ORDER:
        if slug not in src:
            note("13.4 深度对表", "反向侧缺 %s" % slug)
            continue
        deep_diff(baselines[slug], src[slug], slug)
    checked = length_gate(src)
    counts, date_notes = high_risk_gate(baselines, sources)
    return checked, counts, date_notes, baselines


def build_spec(checked, counts, date_notes, disk_hits, sources_data):
    pages = {}
    for rec in BASELINE["pages"].values():
        slug = rec["slug"]
        art = sources_data["articles"][slug]
        pages[slug] = {
            "slug": slug,
            "column": rec["column"],
            "column_label": rec["article_type"],
            "list_page": art["list_page"],
            "output_file": "article-%s.html" % slug,
            "title": rec["h1"],
            "title_length": rec["h1_length"],
            "byline": rec["byline"],
            "display_date": art["display_date"]["value"],
            "display_date_positions_in_textContent": art["display_date"]["positions"],
            "date_status": art["date"]["status"],
            "order": "缺失，按整数 0 参与比较",
            "sort_keys": {"date": None, "order": 0, "column": rec["column"], "slug": slug},
            "paragraph_count": rec["paragraph_count"],
            "paragraphs": [p["text"] for p in rec["paragraphs"]],
            "paragraph_lengths": [p["length"] for p in rec["paragraphs"]],
            "dateline": {"in_first_paragraph": bool(rec["dateline"]),
                         "text": rec["dateline"]["text"] if rec["dateline"] else None,
                         "render_as": '<strong class="dateline">TEXT</strong> + 恰好一个 U+0020' if rec["dateline"] else None},
            "end_date": rec["article_date"]["text"] if rec["article_date"]["present"] else None,
            "end_date_renders_as": ('<p class="article__date">…</p>，位于 </div> 之后、</article> 之内，前置恰一个空行'
                                    if rec["article_date"]["present"] else None),
            "baseline_main_interior": {
                "path": rec["main"]["interior_slice"],
                "sha256": rec["main"]["interior_sha256"],
                "byte_length": rec["main"]["interior_byte_length"],
                "open_tag_offset": rec["main"]["open_tag_offset"],
                "close_tag_offset": rec["main"]["close_tag_offset"],
                "interior_start_offset": rec["main"]["interior_start"],
                "tag_lines_record": rec["main"]["tags_record"],
            },
        }
    return {
        "generated_by": "qa/_qa_task13/compare.py",
        "scope": "Task 13.8 向 Task 14 交接的期望产物规格（机读）",
        "provenance": {
            "forward": "qa/_qa_task13/extracted_baseline.json",
            "reverse": "qa/_qa_task13/extracted_sources.json",
            "baseline_snapshot": "qa/_qa_task13/baseline/",
            "main_interiors": "qa/_qa_task13/main_slices/",
        },
        "sort_total_order": "date 降序（缺失→未分组末尾）→ order 升序（缺失记 0）→ column 注册表序（message→feature→commentary）→ slug 升序（R11②）",
        "registry": [{"key": e["key"], "label": e["label"], "list_page": e["list_page"]}
                     for e in json.load(open(os.path.join(QA, "extracted_sources.json"), encoding="utf-8"))["registry"]],
        "shell_source": {
            "file": "Results/news-message.html",
            "rule": "取 <main> 之外的全部字节，加上 '  <main class=\"main-content\" id=\"main-content\" tabindex=\"-1\">' 与 '  </main>' 两条标签行（各自行首两个空格、行尾 LF）",
            "tags_verbatim": "qa/_qa_task13/main_slices/tags.txt",
            "allowed_edits_relative_to_baseline": 2,
        },
        "task14_must_reproduce": [
            "详情页 <main> 内部字节与 main_slices/ 对应切片字节级相等（两条标签行不参与比较，由壳提供）",
            "build/shell.html 字节来源为 Results/news-message.html 中 <main> 之外的部分加上两条标签行",
            "qa/_qa_task13/baseline/index.html 必须是 2629 字节的新版首页",
            "正文允许面与 Task13 §正文区规则 第 1–7 条逐字一致，两处任一侧改动都要同步另一侧",
        ],
        "pages_order": ORDER,
        "pages": pages,
        "length_gate": {"items_checked": checked, "totals": TOTALS, "table": LENGTH_BASELINE},
        "token_counts": counts,
        "date_status_notes": date_notes,
        "content_disk_scan_hits": disk_hits,
        "baseline_hashes_before": [{"path": r[0], "sha256": r[1], "bytes": int(r[2]), "mtime": r[3]}
                                   for r in BASELINE["hashes_before_rows"]],
        "content_files_sha256": sources_data["content_files_sha256"],
        "open_items": ["三篇真实 date 待用户提供；未提供即排到未分组末尾且无任何可见差异（R5④／R9①）",
                       "三个 slug 一旦上线即为公开 URL，此后改名等同于制造死链，须另立任务处理跳转"],
    }


def edit_article(tmp, name, func):
    path = os.path.join(tmp, "content", "articles", name)
    with open(path, encoding="utf-8") as handle:
        text = handle.read()
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(func(text))


def drop_paragraph(tmp):
    edit_article(tmp, "math-to-ai-learning.md", lambda t: t[:t.rfind("\n\n")] + "\n")


def period_to_dot(tmp):
    edit_article(tmp, "school-course-volunteer.md",
                 lambda t: t.replace("定向招生两种方式。", "定向招生两种方式.", 1))


def double_space_dateline(tmp):
    edit_article(tmp, "school-course-volunteer.md",
                 lambda t: t.replace("**自然选择号9月18日7时电** 我校", "**自然选择号9月18日7时电**  我校", 1))


def she_to_he(tmp):
    edit_article(tmp, "math-to-ai-learning.md", lambda t: t.replace("在她看来", "在他看来", 1))


def split_paragraph(tmp):
    edit_article(tmp, "classroom-screen-upgrade.md",
                 lambda t: t.replace("最明显的一个，就在屏幕左下角。", "最明显的一个，\n就在屏幕左下角。", 1))


def seam_space_c06(tmp):
    edit_article(tmp, "classroom-screen-upgrade.md",
                 lambda t: t.replace("接口的位置就应该考虑", "接口的位置就 应该考虑", 1))


def seam_space_c12(tmp):
    edit_article(tmp, "classroom-screen-upgrade.md",
                 lambda t: t.replace("只能在Windows环境下运行", "只能在 Windows环境下运行", 1))


def bad_display_date(tmp):
    edit_article(tmp, "school-course-volunteer.md",
                 lambda t: t.replace("display_date: 9月18日", "display_date: 2026年9月18日", 1))


def closing_as_paragraph(tmp):
    edit_article(tmp, "classroom-screen-upgrade.md", lambda t: t.rstrip("\n") + "\n\n" + CLOSING_DATE + "\n")


def slug_to_M01(tmp):
    edit_article(tmp, "school-course-volunteer.md",
                 lambda t: t.replace("slug: school-course-volunteer", "slug: M01", 1))


def drop_commentary_row(tmp):
    path = os.path.join(tmp, "content", "columns.md")
    text = open(path, encoding="utf-8").read()
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        handle.write("".join(l + "\n" for l in text.split("\n") if l and not l.startswith("commentary|")))


def add_columns_header(tmp):
    path = os.path.join(tmp, "content", "columns.md")
    old = open(path, encoding="utf-8").read()
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        handle.write("#columns\n" + old)


def add_third_separator(tmp):
    edit_article(tmp, "school-course-volunteer.md",
                 lambda t: t.replace("\n\n目前，校本课程志愿填报工作正在进行中。", "\n---\n\n目前，校本课程志愿填报工作正在进行中。", 1))


def set_slug(tmp, new):
    old = os.path.join(tmp, "content", "articles", "school-course-volunteer.md")
    text = open(old, encoding="utf-8").read().replace("slug: school-course-volunteer", "slug: " + new, 1)
    os.remove(old)
    with open(os.path.join(tmp, "content", "articles", new + ".md"), "w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)


def add_date_line(tmp):
    edit_article(tmp, "school-course-volunteer.md",
                 lambda t: t.replace("display_date: ", "date: 2026-09-18\ndisplay_date: ", 1))


def noop(tmp):
    pass


MUTATIONS = [
    ("删一段（通讯 23→22）", "对表：段落数与逐段长度", drop_paragraph),
    ("M02 的 。 换成 .", "对表：码点序列", period_to_dot),
    ("M01 电头后加第二个空格", "正文区规则 第3条", double_space_dateline),
    ("F05 她→他", "对表：码点序列", she_to_he),
    ("把 C03 拆成两行", "正文区规则 第1条", split_paragraph),
    ("C06 run 接缝插空格", "对表：长度 101 与码点", seam_space_c06),
    ("C12 中英文接缝插空格", "对表：长度 167 与码点", seam_space_c12),
    ("display_date 写成 2026年9月18日", "§3 第8条正则＋子串＋13.6 年份", bad_display_date),
    ("closing_date 当正文第 30 段", "对表：段落数 30", closing_as_paragraph),
    ("slug 改成 M01", "§3 第4条主干不等＋编号形态", slug_to_M01),
    ("columns.md 删 commentary 行", "§2 注册表恰三行", drop_commentary_row),
    ("columns.md 加 #columns 表头", "§2 首行须以 message| 开头", add_columns_header),
    ("分隔线改成三处", "§3 结构恰两处", add_third_separator),
]
REVERSE = [
    ("slug=console-x（整干全等，不前缀匹配）", lambda t: set_slug(t, "console-x")),
    ("slug=aux-term", lambda t: set_slug(t, "aux-term")),
    ("slug=null-set", lambda t: set_slug(t, "null-set")),
    ("date: 2026-09-18 位于 date: 行", add_date_line),
    ("columns.md 首行 message|新闻消息|news-message.html", noop),
]


def parse_tmp(tmp):
    es.ERRORS.clear()
    articles_dir = os.path.join(tmp, "content", "articles")
    names = sorted(os.listdir(articles_dir))
    try:
        registry = es.parse_registry(os.path.join(tmp, "content", "columns.md"))
        parsed = [es.parse_article(os.path.join(articles_dir, n), registry) for n in names]
        hits = es.forbidden_scan([os.path.join(tmp, "content", "columns.md"), os.path.join(tmp, "content", "_模板.md")]
                                 + [os.path.join(articles_dir, n) for n in names])
        if hits:
            return None, "13.6 命中 %s（%s 第 %d 行）" % (hits[0][3], hits[0][0].split("/")[-1], hits[0][1])
        return {a["slug"]: a for a in parsed}, None
    except es.StopValidation:
        return None, es.ERRORS[0] if es.ERRORS else "解析报错"


def selftest():
    rows = []
    for label, expect, mutate in MUTATIONS:
        tmp = tempfile.mkdtemp(prefix="t13-neg-")
        try:
            shutil.copytree(CONTENT, os.path.join(tmp, "content"))
            mutate(tmp)
            arts, perr = parse_tmp(tmp)
            if perr:
                rows.append((label, expect, "捕获·解析", perr))
            elif arts and set(arts) == set(ORDER):
                compare_only(arts)
                rows.append((label, expect, "捕获·对表" if DIFFS else "未捕获!!",
                             " ｜ ".join(DIFFS[:3]) if DIFFS else "无差异"))
            else:
                rows.append((label, expect, "捕获·集合", "解析出的 slug 集合 %r" % sorted(arts or {})))
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
    for label, mutate in REVERSE:
        tmp = tempfile.mkdtemp(prefix="t13-pos-")
        try:
            shutil.copytree(CONTENT, os.path.join(tmp, "content"))
            mutate(tmp)
            arts, perr = parse_tmp(tmp)
            rows.append((label, "放行", "误拒!!" if perr else "放行", perr or "解析与扫描均通过"))
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
    return rows


def main():
    global BASELINE
    BASELINE = load_json("extracted_baseline.json")
    sources_data = load_json("extracted_sources.json")
    checked, counts, date_notes, baselines = compare_only(sources_data["articles"])
    disk = content_disk_scan()
    if DIFFS:
        for item in DIFFS:
            print("FAIL exit=3 %s" % item, file=sys.stderr)
        print("FAIL exit=3 [13.4 完成条件] 对表出现 %d 处差异" % len(DIFFS), file=sys.stderr)
        spec_path = os.path.join(QA, "expected-spec.json")
        if os.path.exists(spec_path):
            os.remove(spec_path)
        return EXIT_ASSERT
    spec = build_spec(checked, counts, date_notes, disk, sources_data)
    spec_path = os.path.join(QA, "expected-spec.json")
    with open(spec_path, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(spec, handle, ensure_ascii=False, indent=1, sort_keys=True)
        handle.write("\n")
    digest = hashlib.sha256(open(spec_path, "rb").read()).hexdigest()
    print("OK 13.4 双向对表 0 差异｜长度门禁 %d 项全中｜合计 %s｜display_date 全部为基线子串｜13.6 磁盘扫描命中 0"
          % (checked, TOTALS))
    print("   expected-spec.json sha256=%s" % digest)
    print("   段落数 %s" % {s: baselines[s]["paragraph_count"] for s in ORDER})
    print("   date 状态 %s" % "；".join(date_notes))
    print("   token 计数 %s" % {k: counts[k] for k in ("Windows 10", ".exe", "86英寸", "47个社团", "5次碰撞", "3个U盘", "她", "他", "AI", "UOS", "USB", "OPS", "Linux", "4K")})
    if "--selftest" in sys.argv:
        print("   --- 负向变异与反向对照 ---")
        bad = 0
        for label, expect, verdict, detail in selftest():
            print("   [%-6s] %-34s 期望捕获于：%s ｜ %s" % (verdict, label, expect, detail[:110]))
            if verdict.endswith("!!"):
                bad += 1
        print("   自测结论：%s" % ("全部符合预期" if bad == 0 else "%d 例不符合预期" % bad))
        return EXIT_OK if bad == 0 else EXIT_ASSERT
    return EXIT_OK


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    sys.exit(main())
