#!/usr/bin/env python3
# Task 13.1 快照迁移前基线 + Task 13.2 从基线 HTML 正向抽取结构。
# 对 Results/ 与 Materials/ 只读；全部产物写入 _qa_task13/。
import hashlib
import json
import os
import re
import shutil
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
QA = os.path.join(ROOT, "qa/_qa_task13")
BASELINE = os.path.join(QA, "baseline")
SLICES = os.path.join(QA, "main_slices")

EXIT_OK, EXIT_INPUT, EXIT_ASSERT, EXIT_GATE = 0, 2, 3, 4

TABLE1 = {
    "Results/index.html": ("971e57a5f85bae99c389e58d7a132e96c02388432de997c4df3d4af495e6416a", 2629),
    "Results/news-message.html": ("66ae5826bbdf9829206c6374305e7bf4bab546c65485349db5fff40e0b5fa0e8", 3011),
    "Results/news-feature.html": ("73ff75678c453badbc1edcb1ff590001dc93cade3260ff364e042d02075df9a5", 6962),
    "Results/news-commentary.html": ("a2dbf4aac57472e8a8728f80908dc366d3aa9076310bbb39b24d71f251ea8d52", 8486),
    "Results/styles.css": ("2c23817299492ea9a3fd7ad23237cfabd6723d166bd99194febbed09ad418ba1", 12401),
    "Results/script.js": ("abb39e4a6d218546b45eded0fa601540d2c5195d93c9fe1dfa8aaaabca13c666", 2204),
}
TABLE2 = {
    "Materials/新闻消息.docx": "de10b575399e0563430f2f255c956b179c9978c087897a24910ad70d6a50f6fc",
    "Materials/新闻通讯.docx": "0c5b35256b7271acfb2f49aec146288b404ed49c376ac2c8b3f6246b38f894a4",
    "Materials/新闻评价.docx": "8e50cfc89287035163d5fe95c8b1cee20a5aa405e9d04ec358fb5c9312c3827c",
}
PAGES = [
    ("news-message.html", "school-course-volunteer", "message", "新闻消息", 4),
    ("news-feature.html", "math-to-ai-learning", "feature", "新闻通讯", 23),
    ("news-commentary.html", "classroom-screen-upgrade", "commentary", "新闻评论", 29),
]
HOME_TEXTS = [
    "我们的名字来自《三体》里的一支舰队。",
    "我们主要记录一些自己觉得有价值的东西。",
    "报社成立于“鸽子衔枝之年”。",
]
MAIN_OPEN = '  <main class="main-content" id="main-content" tabindex="-1">'
MAIN_CLOSE = "  </main>"
DATELINE_OPEN = '<strong class="dateline">'
DATELINE_CLOSE = "</strong>"

CREATED = False
FAILURES = []


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def fail(code, clause, detail):
    FAILURES.append((code, clause, detail))
    raise SystemExit(flush_and_report())


def flush_and_report():
    for code, clause, detail in FAILURES:
        print("FAIL exit=%d [%s] %s" % (code, clause, detail), file=sys.stderr)
    if CREATED and os.path.isdir(QA):
        shutil.rmtree(QA)
    return FAILURES[0][0] if FAILURES else EXIT_ASSERT


def load(rel):
    with open(os.path.join(ROOT, rel), "rb") as handle:
        return handle.read()


def preflight():
    entries = sorted(os.listdir(os.path.join(ROOT, "Results")))
    if entries != sorted(os.path.basename(p) for p in TABLE1):
        fail(EXIT_GATE, "实施前检查 第2条", "Results/ 目录集合 != 表 1 六行，实测 %r" % (entries,))
    for rel, (digest, size) in TABLE1.items():
        data = load(rel)
        if sha256(data) != digest or len(data) != size:
            fail(EXIT_GATE, "实施前检查 第1条／表 1",
                 "%s 实测 (sha=%s, bytes=%d) 期望 (sha=%s, bytes=%d)" % (rel, sha256(data), len(data), digest, size))
    mats = sorted(os.listdir(os.path.join(ROOT, "Materials")))
    if mats != sorted(os.path.basename(p) for p in TABLE2):
        fail(EXIT_GATE, "实施前检查 第1条／表 2", "Materials/ 集合异常 %r" % (mats,))
    for rel, digest in TABLE2.items():
        if sha256(load(rel)) != digest:
            fail(EXIT_GATE, "实施前检查 第1条／表 2", "%s 哈希不符" % rel)
    force = "--force" in sys.argv
    for extra in ("build",):
        path = os.path.join(ROOT, extra)
        if os.path.isdir(path) and os.listdir(path):
            fail(EXIT_GATE, "实施前检查 第3条", "%s/ 已存在且非空" % extra)
    content = os.path.join(ROOT, "content")
    if os.path.isdir(content) and os.listdir(content):
        expected = {"columns.md", "_模板.md", "articles"}
        got = set(os.listdir(content))
        articles = os.path.join(content, "articles")
        n_articles = len(os.listdir(articles)) if os.path.isdir(articles) else 0
        if not force or got != expected or n_articles != 3:
            fail(EXIT_GATE, "实施前检查 第3条",
                 "content/ 已存在且非空（根集合 %r、文章 %d 篇）；重跑需 --force 且集合须恰为交付的 5 个文件"
                 % (sorted(got), n_articles))
    if os.path.exists(QA) and not os.listdir(QA):
        fail(EXIT_GATE, "实施前检查 第3条", "qa/_qa_task13/ 存在但为空，状态不合预期")
    stale = [n for n in ("baseline", "main_slices", "extracted_baseline.json",
                         "extracted_sources.json", "expected-spec.json")
             if os.path.exists(os.path.join(QA, n))]
    if stale and "--force" not in sys.argv:
        fail(EXIT_GATE, "实施前检查 第3条",
             "qa/_qa_task13/ 已存在快照产物 %r（重跑需 --force，全程不改写 Results/）" % (stale,))


def read_page(rel):
    data = load("Results/" + rel)
    if data[:3] == b"\xef\xbb\xbf":
        fail(EXIT_GATE, "实施前检查 第4条", "%s 含 BOM" % rel)
    if b"\r" in data:
        fail(EXIT_GATE, "实施前检查 第4条", "%s 含 CR／CRLF" % rel)
    if b"\t" in data:
        fail(EXIT_GATE, "实施前检查 第4条", "%s 含 TAB" % rel)
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        fail(EXIT_GATE, "实施前检查 第4条", "%s 非合法 UTF-8：%s" % (rel, exc))
    if text.count("<main") != 1 or text.count("</main>") != 1:
        fail(EXIT_GATE, "实施前检查 第4条", "%s 的 <main> 不唯一" % rel)
    if "&" in text:
        fail(EXIT_GATE, "实施前检查 第4条", "%s 含字符 &，去标签抽取不适用" % rel)
    if re.search(r"(19|20)\d{2}", text):
        fail(EXIT_GATE, "实施前检查 第7条／R6", "%s 命中年份形态数字 (19|20)\\d{2}" % rel)
    return data, text


def main_offsets(data, rel):
    open_at = data.find((MAIN_OPEN + "\n").encode("utf-8"))
    if open_at < 0:
        fail(EXIT_GATE, "实施前检查 第5条", "%s 找不到 <main> 起始标签行原文" % rel)
    if data.find((MAIN_OPEN + "\n").encode("utf-8"), open_at + 1) >= 0:
        fail(EXIT_GATE, "实施前检查 第5条", "%s 出现第二条 <main> 标签行" % rel)
    interior_start = open_at + len(MAIN_OPEN) + 1
    close_at = data.find(MAIN_CLOSE.encode("utf-8"), interior_start)
    if close_at < 0:
        fail(EXIT_GATE, "实施前检查 第5条", "%s 找不到 </main> 标签行" % rel)
    if data.find(MAIN_CLOSE.encode("utf-8"), close_at + 1) >= 0:
        fail(EXIT_GATE, "实施前检查 第5条", "%s 出现第二条 </main> 标签行" % rel)
    return open_at, close_at, interior_start, data[interior_start:close_at]


def codepoint_list(content):
    return ["U+%04X" % ord(ch) for ch in content]


def extract_page(rel, slug, column, column_label, expect_paras):
    data, text = read_page(rel)
    open_at, close_at, interior_start, interior = main_offsets(data, rel)
    body_open = '<div class="article__body">'
    if text.count(body_open) != 1:
        fail(EXIT_GATE, "实施前检查 第4条", "%s 的 .article__body 出现 %d 次" % (rel, text.count(body_open)))
    body_start = text.index(body_open)
    body_end = text.index("</div>", body_start)
    body = text[body_start + len(body_open):body_end]
    if "<div" in body:
        fail(EXIT_ASSERT, "实施前检查 第6条", "%s .article__body 内出现嵌套 div" % rel)
    for banned in ("<br", "<span", "<em", "<blockquote", "<a ", "<p "):
        if banned in body:
            fail(EXIT_ASSERT, "实施前检查 第6条", "%s .article__body 命中被禁标签 %r" % (rel, banned))
    if body.count("<p>") != expect_paras or body.count("</p>") != expect_paras:
        fail(EXIT_ASSERT, "实施前检查 第6条", "%s <p>／</p> 计数不等于 %d" % (rel, expect_paras))
    if re.search(r"</p>[ \t]*\n[ \t]*\n", body):
        fail(EXIT_ASSERT, "实施前检查 第6条", "%s .article__body 内段落之间出现空行" % rel)
    matches = list(re.finditer(r"^        <p>(?P<inner>.+)</p>[ \t]*$", body, re.M))
    if len(matches) != expect_paras:
        fail(EXIT_ASSERT, "13.2 完成条件", "%s 单行段落数实测 %d 期望 %d" % (rel, len(matches), expect_paras))
    paragraphs = []
    for idx, match in enumerate(matches):
        inner = match.group("inner")
        content = re.sub(r"<[^>]+>", "", inner)
        if not content:
            fail(EXIT_ASSERT, "实施前检查 第6条", "%s 第 %d 段可见文本为空" % (rel, idx + 1))
        dateline_text = None
        if inner.startswith(DATELINE_OPEN):
            if DATELINE_CLOSE not in inner:
                fail(EXIT_ASSERT, "正文区规则 第3条", "%s 首段 dateline 未闭合" % rel)
            cut = inner.index(DATELINE_CLOSE)
            dateline_text = inner[len(DATELINE_OPEN):cut]
            if "<" in inner[cut + len(DATELINE_CLOSE):]:
                fail(EXIT_ASSERT, "正文区规则 第3条", "%s 首段 dateline 之后仍有标签" % rel)
        elif "<strong" in inner:
            fail(EXIT_ASSERT, "正文区规则 第3条", "%s 第 %d 段出现非首段 strong" % (rel, idx + 1))
        entry = {
            "index": idx + 1,
            "source_line": text[:body_start + len(body_open) + match.start()].count("\n") + 1,
            "raw_inner_html": inner,
            "text": content,
            "length": len(content),
            "u0020_count": content.count(" "),
            "codepoints": codepoint_list(content),
        }
        if dateline_text is not None:
            if idx != 0:
                fail(EXIT_ASSERT, "正文区规则 第3条", "%s 非首段出现 dateline" % rel)
            tail = content[len(dateline_text):]
            if tail[:1] != " " or tail[1:2] == " ":
                fail(EXIT_ASSERT, "高风险字符表 第1／2行", "%s 电头后 U+0020 不是恰好 1 个" % rel)
            entry["dateline_text"] = dateline_text
        paragraphs.append(entry)
    art_type = re.search(r'<p class="article__type">([^<]*)</p>', text)
    h1 = re.search(r'<h1 class="page-title">([^<]*)</h1>', text)
    byline = re.search(r'<p class="article__byline">([^<]*)</p>', text)
    title_tag = re.search(r"<title>([^<]*)</title>", text)
    if not (art_type and h1 and byline and title_tag):
        fail(EXIT_ASSERT, "13.2 第2步", "%s 缺 article__type／page-title／article__byline／title 节点" % rel)
    if art_type.group(1) != column_label:
        fail(EXIT_ASSERT, "13.2 第2步", "%s article__type=%r 期望 %r" % (rel, art_type.group(1), column_label))
    date_match = re.search(r"^      <p class=\"article__date\">(?P<d>[^<]*)</p>$", text, re.M)
    if column == "commentary":
        if not date_match:
            fail(EXIT_ASSERT, "实施前检查 第6条", "%s 缺 p.article__date" % rel)
        if text[body_end:date_match.start()] != "</div>\n\n":
            fail(EXIT_ASSERT, "实施前检查 第6条", "%s </div> 与 p.article__date 之间不是恰好一个空行" % rel)
        closer = text.index("</article>", date_match.end())
        if "<p" in text[date_match.end():closer]:
            fail(EXIT_ASSERT, "实施前检查 第6条", "%s p.article__date 之后仍有正文段" % rel)
        if not (body_end < date_match.start() < closer < text.index("</main>")):
            fail(EXIT_ASSERT, "实施前检查 第6条", "%s p.article__date 不在 <article> 内、.article__body 之后" % rel)
    elif date_match:
        fail(EXIT_ASSERT, "实施前检查 第6条", "%s 不应出现 p.article__date" % rel)
    first = paragraphs[0]
    dateline_info = None
    if "dateline_text" in first:
        dtext = first["dateline_text"]
        tail = first["text"][len(dtext):]
        dateline_info = {
            "is_first_paragraph": True,
            "text": dtext,
            "followed_by_exactly_one_u0020": tail[:1] == " " and tail[1:2] != " ",
            "paragraph_u0020_count": first["u0020_count"],
        }
    return {
        "slug": slug,
        "column": column,
        "baseline_page": "Results/" + rel,
        "title_subject": title_tag.group(1).split("｜")[0],
        "title_subject_full": title_tag.group(1),
        "article_type": art_type.group(1),
        "h1": h1.group(1),
        "h1_length": len(h1.group(1)),
        "byline": byline.group(1),
        "byline_length": len(byline.group(1)),
        "byline_codepoints": codepoint_list(byline.group(1)),
        "paragraph_count": len(paragraphs),
        "paragraph_char_total": sum(p["length"] for p in paragraphs),
        "paragraphs": paragraphs,
        "dateline": dateline_info,
        "article_date": {
            "present": bool(date_match),
            "text": date_match.group("d") if date_match else None,
            "length": len(date_match.group("d")) if date_match else 0,
            "codepoints": codepoint_list(date_match.group("d")) if date_match else [],
        },
        "main": {
            "open_tag_offset": open_at,
            "close_tag_offset": close_at,
            "interior_start": interior_start,
            "interior_byte_length": len(interior),
            "interior_sha256": sha256(interior),
            "interior_slice": "qa/_qa_task13/main_slices/" + rel.replace(".html", ".main-interior.html"),
            "tags_record": "qa/_qa_task13/main_slices/tags.txt",
        },
    }, interior


def check_home():
    data, text = read_page("index.html")
    for lit in HOME_TEXTS:
        if text.count('<p class="home-section__text">%s</p>' % lit) != 1:
            fail(EXIT_GATE, "实施前检查 第7条", "首页三段文本缺项或重复：%s" % lit)
    for h2 in ("名称由来", "主要工作与报道方向", "成立时间"):
        if text.count('<h2 class="home-section__title" id=') != 3 or h2 not in text:
            fail(EXIT_GATE, "实施前检查 第7条", "首页区块标题缺项：%s" % h2)


def snapshot(pages, interiors):
    global CREATED
    if not os.path.isdir(QA):
        os.makedirs(QA)
        CREATED = True
    os.makedirs(BASELINE, exist_ok=True)
    os.makedirs(SLICES, exist_ok=True)
    rows = []
    for rel in sorted(TABLE1):
        data = load(rel)
        dest = os.path.join(BASELINE, os.path.basename(rel))
        with open(dest, "wb") as handle:
            handle.write(data)
        if open(dest, "rb").read() != data:
            fail(EXIT_ASSERT, "13.1 完成条件", "副本 %s 与原件字节不相等" % rel)
        mtime = time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(os.path.getmtime(os.path.join(ROOT, rel))))
        rows.append([rel, sha256(data), str(len(data)), mtime])
    write_lines(os.path.join(BASELINE, "hashes_before.txt"), ["\t".join(r) for r in rows])
    tags = []
    for rel, interior in interiors:
        name = rel.replace(".html", ".main-interior.html")
        dest = os.path.join(SLICES, name)
        with open(dest, "wb") as handle:
            handle.write(interior)
        if open(dest, "rb").read() != interior:
            fail(EXIT_ASSERT, "13.1 第5步", "%s 切片写回不一致" % name)
        data = load("Results/" + rel)
        open_at, close_at, _, _ = main_offsets(data, rel)
        open_line = data[open_at:data.index(b"\n", open_at)].decode("utf-8")
        close_line = data[close_at:data.index(b"\n", close_at)].decode("utf-8")
        if open_line != MAIN_OPEN or close_line != MAIN_CLOSE:
            fail(EXIT_GATE, "实施前检查 第5条", "%s 标签行原文异常 %r／%r" % (rel, open_line, close_line))
        tags.append("%s\t<main>\t%s" % (rel, open_line))
        tags.append("%s\t</main>\t%s" % (rel, close_line))
    write_lines(os.path.join(SLICES, "tags.txt"), tags)
    return rows


def write_lines(path, lines):
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        handle.write("\n".join(lines) + "\n")


def main():
    preflight()
    check_home()
    pages = {}
    interiors = []
    for rel, slug, column, label, expect in PAGES:
        record, interior = extract_page(rel, slug, column, label, expect)
        pages[rel] = record
        interiors.append((rel, interior))
    for rel, rec in pages.items():
        if rec["byline"] != "蓝色空间":
            fail(EXIT_ASSERT, "13.2 完成条件", "%s 署名不是 蓝色空间：%r" % (rel, rec["byline"]))
    for rel in ("news-message.html", "news-feature.html"):
        dl = pages[rel]["dateline"]
        if dl is None or not dl["followed_by_exactly_one_u0020"]:
            fail(EXIT_ASSERT, "13.2 完成条件", "%s 电头缺失或其后空格不是恰好 1 个" % rel)
    if pages["news-commentary.html"]["dateline"] is not None:
        fail(EXIT_ASSERT, "正文区规则 第3条", "评论页首段不应出现 dateline")
    rows = snapshot(pages, interiors)
    out = {
        "generated_by": "qa/_qa_task13/extract_baseline.py",
        "scope": "Task 13.1 快照迁移前基线 + Task 13.2 正向抽取",
        "results_are_read_only": True,
        "hashes_before_rows": rows,
        "materials_before": {rel: sha256(load(rel)) for rel in TABLE2},
        "home_texts_verified": HOME_TEXTS,
        "pages": pages,
    }
    with open(os.path.join(QA, "extracted_baseline.json"), "w", encoding="utf-8", newline="\n") as handle:
        json.dump(out, handle, ensure_ascii=False, indent=1, sort_keys=True)
        handle.write("\n")
    print("OK 13.1＋13.2：段落数 %s；三页 <main> 内部切片与 tags.txt 已写入 main_slices/；副本哈希逐项相等"
          % [pages[rel]["paragraph_count"] for rel, *_ in PAGES])
    return EXIT_OK


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    try:
        code = main()
    except SystemExit:
        raise
    except Exception as exc:
        print("FAIL exit=2 运行异常 %r" % (exc,), file=sys.stderr)
        if CREATED and os.path.isdir(QA):
            shutil.rmtree(QA)
        code = EXIT_INPUT
    sys.exit(code)
