"""Task 6 mutation harness: prove verify.py actually catches contract drift.

Each mutation is applied to a throwaway copy of Results/, then verify.py is
re-run against that copy. A mutation that verify.py does not fail is a hole in
the acceptance gate. The unmodified copy is the negative control and must pass.
QA-only.
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "Results"
PAGE = "news-feature.html"
WORK = ROOT / "_qa_task6" / "mut"
VERIFY = ROOT / "_qa_task6" / "verify.py"

P = "<p>“数学是一门基础学科"
F23 = "<p>对于学生来说，答案可以从很多地方得到"
STRONG = "</strong> 上午第一节课"


def m(name, fn, group):
    return {"name": name, "fn": fn, "group": group}


MUTATIONS = [
    m("删除 F23（正文 22 段）", lambda s: s[:s.index(F23)] + s[s.index("      </div>"):], "段落数"),
    m("追加 Word 空尾段 <p></p>", lambda s: s.replace("      </div>", "        <p></p>\n      </div>"), "段落数"),
    m("追加仅含空白的尾段", lambda s: s.replace("      </div>", "        <p>\u0020</p>\n      </div>"), "段落数"),
    m("拆成两个 <p>（并段被拆开）", lambda s: s.replace(
        "<p>对于学生来说，答案可以从很多地方得到，",
        "<p>对于学生来说，答案可以从很多地方得到，</p>\n        <p>而", 1), "段落数"),
    m("F02/F03 顺序交换", lambda s: s.replace(
        "<p>对于学生每天都要面对的课后学习，李老师特别谈到了作业、改错和针对性练习。</p>\n        " + P,
        P, 1).replace("      </div>",
        "        <p>对于学生每天都要面对的课后学习，李老师特别谈到了作业、改错和针对性练习。</p>\n      </div>"),
      "顺序"),
    m("F04 引语改为 blockquote", lambda s: s.replace(
        "<p>“如果想提高自己的‘下限’", "<blockquote>“如果想提高自己的‘下限'", 1).replace(
        "有针对性的补充。”</p>", "有针对性的补充。”</blockquote>", 1), "语义结构"),
    m("栏目类型误作第二个标题", lambda s: s.replace(
        '<p class="article__type">新闻通讯</p>', '<h2 class="article__type">新闻通讯</h2>', 1), "语义结构"),
    m("h1 复制一份到 article 外", lambda s: s.replace(
        '    <article class="article">', '    <h1 class="page-title">从数学题到AI时代的学习</h1>\n'
        '    <article class="article">', 1), "唯一元素"),
    m("h1 降级为 h2", lambda s: s.replace('<h1 class="page-title">', '<h2 class="page-title">', 1)
     .replace("</h1>", "</h2>", 1), "唯一元素"),
    m(".article__body 类名改写", lambda s: s.replace('class="article__body"', 'class="feature-body"', 1),
      "共享接口"),
    m(".article__type/.article__byline 合并进 header 外", lambda s: s.replace(
        '<p class="article__byline">蓝色空间</p>', "", 1), "文章头部"),
    m("正文容器改用 <section>", lambda s: s.replace('<div class="article__body">',
                                                    '<section class="article__body">', 1)
     .replace("</div>", "</section>", 1), "语义结构"),
    m("</strong> 后换行+缩进代替空格", lambda s: s.replace(STRONG, "</strong>\n         上午第一节课", 1),
      "电头空格"),
    m("</strong> 后两个空格", lambda s: s.replace(STRONG, "</strong>  上午第一节课", 1), "电头空格"),
    m("</strong> 后 &nbsp;", lambda s: s.replace(STRONG, "</strong>&nbsp;上午第一节课", 1), "电头空格"),
    m("</strong> 后全角空格", lambda s: s.replace(STRONG, "</strong>\u3000上午第一节课", 1), "电头空格"),
    m("dateline 去掉 strong 包裹", lambda s: s.replace(
        '<strong class="dateline">自然选择号9月17日电</strong>', "自然选择号9月17日电", 1), "电头空格"),
    m("dateline 文本改 9月18日", lambda s: s.replace("自然选择号9月17日电", "自然选择号9月18日电", 1),
      "电头空格"),
    m("电头补年份 2026", lambda s: s.replace("自然选择号9月17日电", "自然选择号2026年9月17日电", 1),
      "禁止信息"),
    m("“在她看来”自动改成“在他看来”", lambda s: s.replace("在她看来", "在他看来", 1), "人称"),
    m("F12 他→她", lambda s: s.replace("不过，他并不赞成", "不过，她并不赞成", 1), "人称"),
    m("双破折号退化为单破折号", lambda s: s.replace("选择——向AI提问", "选择—向AI提问", 1), "标点"),
    m("破折号改连字符", lambda s: s.replace("选择——向AI提问", "选择-向AI提问", 1), "标点"),
    m("AI 改小写 ai", lambda s: s.replace("向AI提问", "向ai提问", 1), "AI 大小写"),
    m("AI 改 Ai", lambda s: s.replace("谈到AI", "谈到Ai", 1), "AI 大小写"),
    m("AI 改中文全称", lambda s: s.replace("向AI提问", "向人工智能提问", 1), "AI 大小写"),
    m("中文双引号改直引号", lambda s: s.replace(
        "<p>“数学是一门基础学科，也是一种基础工具。”", '<p>"数学是一门基础学科，也是一种基础工具。"', 1),
      "标点"),
    m("内层单引号改双引号", lambda s: s.replace("‘下限’", "“下限”", 1), "标点"),
    m("全角分号改半角", lambda s: s.replace("热爱都很重要；如果", "热爱都很重要;如果", 1), "标点"),
    m("全角问号改半角", lambda s: s.replace("怎样做到这一点？", "怎样做到这一点?", 1), "标点"),
    m("段内插入 <br>", lambda s: s.replace("是数学学习中首先要做的事情。", "是数学学习中首先要做的事情。<br>", 1),
      "装饰标签"),
    m("短段改成列表项", lambda s: s.replace(
        "<p>对于怎样判断自己是否已经过度依赖AI，李老师提出，可以从使用的范围、数量和频率来观察。</p>",
        "<ul><li>对于怎样判断自己是否已经过度依赖AI，李老师提出，可以从使用的范围、数量和频率来观察。</li></ul>", 1),
      "语义结构"),
    m("正文前全角空格缩进", lambda s: s.replace("<p>李老师以几何中的新定义问题为例",
                                               "<p>\u3000李老师以几何中的新定义问题为例", 1), "电头空格"),
    m("栏目类型文字改成 新闻评论", lambda s: s.replace('<p class="article__type">新闻通讯</p>',
                                                  '<p class="article__type">新闻评论</p>', 1), "文字"),
    m("标题改字", lambda s: s.replace("从数学题到AI时代的学习</h1>", "从数学题到人工智能时代的学习</h1>", 1),
      "文字"),
    m("署名加“作者：”前缀", lambda s: s.replace('<p class="article__byline">蓝色空间</p>',
                                            '<p class="article__byline">作者：蓝色空间</p>', 1), "文字"),
    m("新增日期段 .article__date", lambda s: s.replace(
        "      <div class=\"article__body\">",
        "      <p class=\"article__date\">2026年9月17日</p>\n      <div class=\"article__body\">", 1),
      "禁止信息"),
    m("新增来源说明段", lambda s: s.replace("      </div>",
                                        "        <p>（本报记者 胡桃）</p>\n      </div>", 1), "禁止信息"),
    m("正文新增外部链接", lambda s: s.replace("向AI提问。</p>",
                                         '向AI提问。<a href="https://example.com">来源</a></p>', 1), "禁止信息"),
    m("正文新增图片", lambda s: s.replace("      </div>",
                                       '        <p><img src="p.png" alt="图"></p>\n      </div>', 1), "禁止信息"),
    m("出现内部编号 F01", lambda s: s.replace("<p><strong", "<p>F01 <strong", 1), "禁止信息"),
    m("出现模板省略号说明", lambda s: s.replace("      </div>", "        <p>[F24 的完整文本]</p>\n      </div>", 1),
      "禁止信息"),
    m("出现 TODO", lambda s: s.replace("      </div>", "        <p>TODO 待补</p>\n      </div>", 1), "禁止信息"),
    m("正文段落被 aria-hidden 隐藏", lambda s: s.replace("<p>他举了一个简单的例子",
                                                    '<p aria-hidden="true">他举了一个简单的例子', 1), "无障碍"),
    m("正文加 data-* 编号", lambda s: s.replace("<p>这样一来，AI提供的", '<p data-id="F16">这样一来，AI提供的', 1),
      "禁止信息"),
    m("内联 style 专属样式", lambda s: s.replace("<p>不过，他并不赞成",
                                             '<p style="text-indent:2em">不过，他并不赞成', 1), "共享接口"),
    m("页面内 <style>", lambda s: s.replace("</head>", "<style>.article__body p{color:red}</style>\n</head>", 1),
      "共享接口"),
    m("正文改为脚本注入", lambda s: s.replace(
        '      <div class="article__body">',
        '      <div class="article__body" id="bb"></div>\n      <div hidden>', 1).replace(
        "      </div>\n    </article>", "      </div>\n    </article>", 1), "无脚本"),
    m("导航 aria-current 丢失", lambda s: s.replace(' href="news-feature.html" aria-current="page"',
                                                ' href="news-feature.html"', 1), "公共壳"),
    m("aria-current 移到新闻消息", lambda s: s.replace(' href="news-feature.html" aria-current="page"',
                                                  ' href="news-feature.html"', 1).replace(
        'href="news-message.html"', 'href="news-message.html" aria-current="page"', 1), "公共壳"),
    m("两处 aria-current", lambda s: s.replace('href="index.html">首页',
                                           'href="index.html" aria-current="page">首页', 1), "公共壳"),
    m("脚本去掉 defer", lambda s: s.replace('<script src="script.js" defer></script>',
                                        '<script src="script.js"></script>', 1), "公共壳"),
    m("样式引用改成子目录", lambda s: s.replace('href="styles.css"', 'href="/styles.css"', 1), "公共壳"),
    m("导航顺序交换", lambda s: s.replace('href="news-commentary.html">新闻评论',
                                      'href="news-commentary.html">新闻评论_TMP', 1).replace(
        'href="news-feature.html" aria-current="page">新闻通讯',
        'href="news-commentary.html">新闻评论', 1).replace(
        'href="news-commentary.html">新闻评论_TMP', 'href="news-feature.html" aria-current="page">新闻通讯', 1),
      "公共壳"),
    m("新增站点 footer", lambda s: s.replace("</body>", "  <footer class=\"site-footer\">版权</footer>\n</body>", 1),
      "公共壳"),
    m("新增 aside", lambda s: s.replace("    </article>", "    </article>\n    <aside>推荐</aside>", 1), "公共壳"),
    m("第二套导航", lambda s: s.replace("  <main", "  <nav aria-label=\"次导航\"><a href=\"#\">x</a></nav>\n  <main", 1),
      "公共壳"),
    m("lang 改成 zh", lambda s: s.replace('lang="zh-CN"', 'lang="zh"', 1), "公共壳"),
    m("no-js 类被移除", lambda s: s.replace('class="no-js"', 'class=""', 1), "公共壳"),
    m("<title> 改成站点名", lambda s: s.replace("<title>从数学题到AI时代的学习｜自然选择号</title>",
                                            "<title>自然选择号</title>", 1), "公共壳"),
    m("正文文本改为 HTML 实体", lambda s: s.replace("<p>不过，他并不赞成", "<p>不过&#65292;他并不赞成", 1), "文字"),
    m("追加第 24 个正文段（重复 F23）", lambda s: s.replace(
        "      </div>", "        " + F23 + "\n      </div>", 1), "段落数"),
]


def run(qa_results):
    env = dict(os.environ, QA_RESULTS=str(qa_results), PYTHONIOENCODING="utf-8")
    r = subprocess.run([sys.executable, str(VERIFY)], capture_output=True, text=True,
                       encoding="utf-8", errors="replace", env=env, cwd=str(ROOT))
    out = (r.stdout or "") + (r.stderr or "")
    failed_names = [l.split(" | ")[2].strip() for l in out.splitlines() if l.startswith("FAIL | ")]
    total = [l for l in out.splitlines() if l.startswith("TOTAL")]
    return r.returncode, failed_names, (total[-1] if total else out[-400:])


def main():
    if WORK.exists():
        shutil.rmtree(WORK)
    log = []
    dst = WORK / "control"
    shutil.copytree(RESULTS, dst)
    rc, names, tot = run(dst)
    log.append(f"NEGATIVE CONTROL (unmodified copy): rc={rc} {tot}")
    log.append("  -> must be rc=0" + (" OK" if rc == 0 else "  *** BROKEN ***"))
    control_ok = rc == 0

    caught = 0
    for i, mut in enumerate(MUTATIONS, 1):
        d = WORK / f"m{i:02d}"
        shutil.copytree(RESULTS, d)
        pf = d / PAGE
        src = pf.read_text(encoding="utf-8")
        try:
            new = mut["fn"](src)
        except Exception as exc:  # mutation itself failed to apply
            log.append(f"{i:02d} {mut['group']:8s} {mut['name']}\n    ERROR applying: {exc}")
            continue
        if new == src:
            log.append(f"{i:02d} {mut['group']:8s} {mut['name']}\n    NO-OP mutation (target text absent)")
            continue
        pf.write_text(new, encoding="utf-8", newline="\n")
        rc, names, tot = run(d)
        hit = rc != 0
        caught += hit
        log.append(f"{i:02d} {mut['group']:8s} {mut['name']}\n"
                   f"    {'CAUGHT' if hit else '*** MISSED ***'} | {tot}\n"
                   f"    first failing checks: {', '.join(names[:4]) if names else '-'}")
        shutil.rmtree(d)
    shutil.rmtree(dst)

    total_m = len([x for x in MUTATIONS])
    log.append("")
    log.append(f"mutations: {caught}/{total_m} caught; control pass = {control_ok}")
    log.append(f"coverage: {caught / total_m * 100:.1f}%")
    txt = "\n".join(log)
    (ROOT / "_qa_task6" / "mutation_log.txt").write_text(txt, encoding="utf-8")
    print(txt)
    return 0 if (caught == total_m and control_ok) else 1


if __name__ == "__main__":
    sys.exit(main())
