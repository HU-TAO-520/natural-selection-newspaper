"""Independent final spot-check: regex-only, no bs4, no shared helpers with verify.py.

Guards against a bug in the main verifier's parsing path silently passing a
broken page. QA-only.
"""
import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
html = (ROOT / "Results" / "news-feature.html").read_text(encoding="utf-8")
t1 = (ROOT / "plan" / "Task1-素材基线与内容合同.md").read_text(encoding="utf-8")
chunk = t1[t1.index("### 新闻通讯"):]
chunk = chunk[: chunk.find("\n### ")]
arr = {}
for line in chunk.splitlines():
    m = re.match(r"^(title|byline|F\d\d)\|(.*)$", line)
    if m:
        arr.setdefault(m.group(1), m.group(2))
KEYS = [f"F{i:02d}" for i in range(1, 24)]
strip = lambda s: re.sub(r"<[^>]+>", "", s)

body = html[html.index('<div class="article__body">'): html.rindex("</div>")]
ps_raw = re.findall(r"<p>(.*?)</p>", body, flags=re.S)
ps = [strip(p) for p in ps_raw]

out = []
out.append(("合同段数 23", len([k for k in KEYS if k in arr]) == 23))
out.append(("页面正文 <p> 数 23", len(ps) == 23))
out.append(("逐段与 Task1 全等", ps == [arr[k] for k in KEYS]))
out.append(("F01 去标签后与合同全等", ps and ps[0] == arr["F01"]))
out.append(("F01 唯一内联标签是 dateline",
            re.findall(r"<[^>]+>", ps_raw[0]) == ['<strong class="dateline">', "</strong>"]))
out.append(("h1 文本", re.search(r"<h1[^>]*>(.*?)</h1>", html).group(1) == arr["title"]))
out.append(("类型段", '<p class="article__type">新闻通讯</p>' in html))
out.append(("署名段", '<p class="article__byline">蓝色空间</p>' in html))
out.append(("main/article/h1 各 1", (len(re.findall(r"<main\b", html)),
                                  len(re.findall(r"<article\b", html)),
                                  len(re.findall(r"<h1\b", html))) == (1, 1, 1)))
out.append(("aria-current 恰好 1", html.count('aria-current="page"') == 1))
msg = (ROOT / "Results" / "news-message.html").read_text(encoding="utf-8")
hdr = lambda s: s[s.index("  <header class=\"site-header\">"): s.index("  </header>") + len("  </header>")]
out.append(("站点报头块与 news-message.html 完全一致", hdr(html) != "" and
            re.sub(r' aria-current="page"','', hdr(html)) == re.sub(r' aria-current="page"','', hdr(msg))))
nav = lambda s: s[s.index('<ul class="site-navigation__list">'): s.index("</ul>")]
out.append(("导航列表去 aria-current 后与 news-message 一致",
            re.sub(r' aria-current="page"', "", nav(html)) == re.sub(r' aria-current="page"', "", nav(msg))))
out.append(("本页 aria-current 落在新闻通讯",
            bool(re.search(r'href="news-feature\.html" aria-current="page">新闻通讯', html))))
merged = "".join(ps)
out.append(("AI 19 / ai 0", (merged.count("AI"), merged.count("ai")) == (19, 0)))
out.append(("—— 一处", merged.count("——") == 1 and merged.count("—") == 2))
out.append(("U+0020 一处", merged.count(" ") == 1))
out.append(("无空段", "<p></p>" not in body and "<p> </p>" not in body))
out.append(("无 2026/厨一枚/胡桃", not any(x in html for x in ["2026", "厨一枚", "胡桃"])))
print(f"news-feature.html sha256 = {hashlib.sha256((ROOT / 'Results' / 'news-feature.html').read_bytes()).hexdigest()}")
bad = 0
for name, cond in out:
    print(("PASS " if cond else "FAIL ") + name)
    bad += not cond
print(f"FINAL SPOT-CHECK: {len(out) - bad}/{len(out)} pass")
sys.exit(1 if bad else 0)
