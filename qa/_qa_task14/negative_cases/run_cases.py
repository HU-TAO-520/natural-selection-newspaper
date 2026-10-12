#!/usr/bin/env python3
"""Task 14.8 错误路径样本与预期退出码。

每个用例在工作区 content/ · build/ · _qa_task13/ 的临时副本上施加一处变异，断言三件事：
退出码相符、输出目录零落盘、报错三段命中对应合同条款。样本文件另存于 samples/caseNN/。

0 = 全部符合预期；3 = 有用例不符。
"""

import contextlib
import io
import shutil
import sys
import tempfile
from pathlib import Path

sys.dont_write_bytecode = True

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / 'build'))

import build  # noqa: E402

F = 'math-to-ai-learning.md'
M = 'school-course-volunteer.md'
C = 'classroom-screen-upgrade.md'
A = 'content/articles/'
K = 'content/columns.md'
P = 'build/partials/home-intro.html'


def sub(old, new, count=1):
    return lambda t: t.replace(old, new, count)


# (期望退出码, 报错须命中的条款, 被变异文件, 变异, 改名后的文件名)
CASES = [
    (2, '正文区规则 1', A + F, sub('“数学是一门基础学科', '“数学是一门\n基础学科')),
    (2, '§4 电头高风险点', A + F, sub('9月17日电** 上午', '9月17日电**  上午')),
    (2, '§4 电头高风险点', A + F, sub('9月17日电** 上午', '9月17日电**上午')),
    (2, '正文区规则 4', A + F, sub('，是面对下一个问题时', '，*是面对下一个问题时')),
    (2, '正文区规则 5', A + F, sub('向AI提问', '向[链接](x)AI提问')),
    (2, '正文区规则 5', A + F, sub('向AI提问', '向#AI提问')),
    (2, '正文区规则 5', A + F, sub('向AI提问', '向`AI`提问')),
    (2, '正文区规则 5', A + F, sub('向AI提问', '向<time>AI提问')),
    (2, '正文区规则 5', A + F, sub('向AI提问', '向AI]提问')),
    (2, '正文区规则 5', A + F, sub('向AI提问', '向AI!提问')),
    (2, '正文区规则 5', A + F, sub('\n在她看来', '\n|在她看来')),
    (2, '正文区规则 5', A + F, sub('\n在她看来', '\n~在她看来')),
    (2, '正文区规则 5', A + F, sub('“数学是一门基础学科', '3. “数学是一门基础学科')),
    (2, '正文区规则 5', A + F, sub('“数学是一门基础学科', '-“数学是一门基础学科')),
    (2, '正文区规则 5', A + F, sub('“数学是一门基础学科', '>“数学是一门基础学科')),
    (2, '3 规则 2', A + F, sub('byline: 蓝色空间', 'byline: 蓝色空间\ntags: 校园')),
    (2, '3 规则 2', A + F, sub('byline: 蓝色空间', 'byline: 蓝色空间\nbyline: 别人')),
    (2, '格式合同 1', A + F, sub('byline: 蓝色空间', 'byline: ')),
    (2, '3 规则 4', A + F, sub('slug: math-to-ai-learning', 'slug: other-name')),
    (2, '3 规则 4', A + M, sub('slug: school-course-volunteer', 'slug: M01'), 'M01.md'),
    (2, '3 规则 4', A + M, sub('slug: school-course-volunteer', 'slug: m01'), 'm01.md'),
    (2, '3 规则 4', A + M, sub('slug: school-course-volunteer', 'slug: 2024-09-18'), '2024-09-18.md'),
    (2, '3 规则 5', A + F, sub('column: feature', 'column: review')),
    (2, '3 规则 7', A + F, sub('column: feature', 'column: feature\ndate: 2026-9-18')),
    (2, '3 规则 7', A + F, sub('column: feature', 'column: feature\ndate: 2026-13-45')),
    (2, '3 规则 8', A + F, sub('display_date: 9月17日', 'display_date: 2026年9月18日')),
    (2, '3 规则 8', A + F, sub('display_date: 9月17日', 'display_date: 2月30日')),
    (2, '3 规则 9', A + M, sub('display_date: 9月18日', 'display_date: 9月18日\nend_date: （自然选择号9月18日）')),
    (2, 'Task13 §content/columns.md', K, lambda t: t + 'extra|新闻副刊|news-extra.html\n'),
    (2, 'Task13 §content/columns.md', K, sub('commentary|新闻评论|news-commentary.html\n', '')),
    (2, 'Task13 §content/columns.md', K, sub('新闻评论', '新闻评价')),
    (2, 'Task13 §content/columns.md', K, sub('message|新闻消息', '#columns\nmessage|新闻消息')),
    (2, '自检清单 S11', A + F, sub('column: feature', 'column: message')),
    (3, '自检清单 S4', P, sub('名称由来', '名称来由')),
]

CONTROLS = [('slug 整干 console-x 必须放行', A + M, sub('slug: school-course-volunteer', 'slug: console-x'), 'console-x.md'),
            ('slug 整干 aux-term 必须放行', A + M, sub('slug: school-course-volunteer', 'slug: aux-term'), 'aux-term.md'),
            ('slug 整干 null-set 必须放行', A + M, sub('slug: school-course-volunteer', 'slug: null-set'), 'null-set.md'),
            ('date: 2026-09-18 是合法 ISO，必须放行', A + M, sub('column: message', 'column: message\ndate: 2026-09-18'), None)]

CAPTURED = ['']


def capture(func):
    buffer = io.StringIO()
    with contextlib.redirect_stderr(buffer), contextlib.redirect_stdout(buffer):
        value = func()
    CAPTURED[0] = buffer.getvalue().strip()
    return value


def make_root(tmp: Path) -> None:
    for part in ('content', '_qa_task13', 'build'):
        shutil.copytree(ROOT / part, tmp / part)
    (tmp / 'out').mkdir()


def files_in(directory: Path) -> dict:
    return {p.relative_to(directory).as_posix(): p.read_bytes()
            for p in sorted(directory.rglob('*')) if p.is_file()}


def main() -> int:
    lines = ['# Task 14.8 错误路径样本与预期退出码', '',
             '退出码合同：0 成功｜2 输入错误｜3 自检失败｜4 环境或基线门禁失败。',
             '判据三件：退出码相符、`--out` 目录零落盘、报错三段命中对应条款。',
             '样本文件见 `samples/caseNN/`。', '']
    fails = 0

    for index, case in enumerate(CASES, start=1):
        expect, clause, rel, mutate = case[:4]
        rename = case[4] if len(case) > 4 else None
        tmp = Path(tempfile.mkdtemp())
        make_root(tmp)
        path = tmp / rel
        mutated = mutate(path.read_text(encoding='utf-8'))
        if mutated == path.read_text(encoding='utf-8'):
            lines.append('BAD-SAMPLE 用例 %02d：变异未改动样本，用例本身失效' % index)
            fails += 1
            shutil.rmtree(tmp, ignore_errors=True)
            continue
        target = path
        if rename:
            target = path.parent / rename
            path.unlink()
        target.write_text(mutated, encoding='utf-8', newline='\n')
        sample = HERE / 'samples' / ('case%02d' % index)
        sample.mkdir(parents=True, exist_ok=True)
        (sample / target.name).write_text(mutated, encoding='utf-8', newline='\n')
        code = capture(lambda: build.main(['--out', str(tmp / 'out')], root=tmp, spec_check=False))
        written = files_in(tmp / 'out')
        shutil.rmtree(tmp, ignore_errors=True)
        ok = code == expect and not written and clause in CAPTURED[0]
        fails += 0 if ok else 1
        lines.append('%s  用例 %02d｜期望退出码 %d／实得 %d｜条款 %s｜零落盘 %s｜报错 %s'
                     % ('PASS' if ok else 'FAIL', index, expect, code, clause,
                        'yes' if not written else 'NO', CAPTURED[0]))

    extras = []
    tmp = Path(tempfile.mkdtemp())
    make_root(tmp)
    code = capture(lambda: build.main(['--out', str(tmp / 'nowhere')], root=tmp, spec_check=False))
    extras.append(('PASS' if code == 4 else 'FAIL', '输出目录不存在 → 4 且不自建', CAPTURED[0]))
    stray = tmp / 'out' / 'stray.txt'
    stray.write_text('do not delete me\n', encoding='utf-8')
    code = capture(lambda: build.main(['--out', str(tmp / 'out')], root=tmp, spec_check=False))
    kept = stray.is_file() and stray.read_text(encoding='utf-8') == 'do not delete me\n'
    extras.append(('PASS' if code == 4 and kept and not (tmp / 'out' / 'index.html').exists() else 'FAIL',
                   '输出目录含清单外文件 → 4 且不删除它', CAPTURED[0]))
    (tmp / '_qa_task13/main_slices/news-message.main-interior.html').write_bytes(b'x' * 1269)
    code = capture(lambda: build.main(['--out', str(tmp / 'out')], root=tmp, spec_check=False))
    extras.append(('PASS' if code == 4 else 'FAIL', 'main_slices 哈希被改写 → 开工门禁 4', CAPTURED[0]))
    shutil.rmtree(tmp, ignore_errors=True)

    built = capture(lambda: build.build_pages(ROOT))
    poisoned = built['pages']['index.html'].replace(
        b'<h2 class="home-latest__title" id="latest-title">',
        b'<time datetime="2026-09-18"><h2 class="home-latest__title" id="latest-title">', 1)
    caught = None
    try:
        build.check_forbidden('index.html', poisoned)
    except build.Fail as failure:
        caught = failure
    extras.append(('PASS' if caught and caught.code == 3 and 'S6' in caught.rendered else 'FAIL',
                   '渲染结果注入 <time datetime="2026-09-18"> → S6 退出 3', caught.rendered if caught else '未捕获'))
    caught2 = None
    try:
        build.check_forbidden('index.html', built['pages']['index.html'].replace(
            b'role="region"', b'data-date="x" role="region"', 1))
    except build.Fail as failure:
        caught2 = failure
    extras.append(('PASS' if caught2 and caught2.code == 3 else 'FAIL',
                   '属性注入 data-date → S6／S7 退出 3', caught2.rendered if caught2 else '未捕获'))

    reserved_hits, wrong_allows, wrong_refusals = [], [], []
    for bad in ('con', 'aux', 'prn', 'nul', 'com1', 'com9', 'lpt1', 'lpt9'):
        try:
            build.validate_slug(bad, bad, 'unit')
            wrong_allows.append(bad)
        except build.Fail as failure:
            reserved_hits.append((bad, failure.code, failure.rendered.split('｜')[-1]))
    for good in ('console-x', 'aux-term', 'null-set', 'printer1', 'com10x', 'lpt10', 'screen1'):
        try:
            build.validate_slug(good, good, 'unit')
        except build.Fail as failure:
            wrong_refusals.append('%s→%s' % (good, failure.rendered.split('｜')[-1]))
    extras.append(('PASS' if len(reserved_hits) == 8 and not wrong_allows and not wrong_refusals else 'FAIL',
                   '保留设备名整干全等拒绝 8 项、console-x 一类近似名放行 7 项',
                   '拒绝 %d｜误放 %s｜误拒 %s' % (len(reserved_hits), wrong_allows or '无', wrong_refusals or '无')))

    leaks = []
    home = built['pages']['index.html']
    for label, poisoned in {
            '注释内藏字段名': home.replace(b'</main>', b'<!-- byline -->\n  </main>', 1),
            '注释内藏禁串': home.replace(b'</main>', b'<!-- TODO -->\n  </main>', 1),
            '属性值内藏字段名': home.replace(b'role="region"', b'title="slug" role="region"', 1),
            '可见文本内藏 ISO': home.replace('最新报道'.encode(), ('最新报道 2026-09-18').encode(), 1),
            '属性内藏年份形态': home.replace(b'role="region"', b'role="region" id="y2024"', 1),
    }.items():
        try:
            build.check_forbidden('index.html', poisoned)
            leaks.append(label)
        except build.Fail as failure:
            if failure.code != 3:
                leaks.append(label)
    extras.append(('PASS' if not leaks else 'FAIL',
                   'S6／S7 为整文件扫描：注释、属性值与文本节点三处泄漏均被捕获（5 项）',
                   '漏网 %s' % (leaks or '无')))

    original = build.render_paragraph
    build.render_paragraph = lambda d, b: original(d, b).replace('“', '&quot;').replace('”', '&quot;')
    code = capture(lambda: build.main(['--out', str(ROOT / '_qa_task14/out')], root=ROOT))
    build.render_paragraph = original
    extras.append(('PASS' if code == 3 and 'S1' in CAPTURED[0] else 'FAIL',
                   '变异反证：渲染器改为同时转义引号 → S1 立刻变红', CAPTURED[0]))
    restored = files_in(ROOT / '_qa_task14/out')
    extras.append(('PASS' if len(restored) == 7 else 'FAIL',
                   '变异反证后 out 目录仍为 7 项且未写坏文件', '%d 项' % len(restored)))

    for label, rel, mutate, rename in CONTROLS:
        tmp = Path(tempfile.mkdtemp())
        make_root(tmp)
        path = tmp / rel
        text = mutate(path.read_text(encoding='utf-8'))
        target = path
        if rename:
            target = path.parent / rename
            path.unlink()
        target.write_text(text, encoding='utf-8', newline='\n')
        article = None
        failure = None
        try:
            article = capture(lambda: build.parse_article(target, rel, build.load_registry(tmp))[0])
        except build.Fail as caught3:
            failure = caught3
        ok = article is not None and failure is None
        extras.append(('PASS' if ok else 'FAIL', '对照放行：' + label,
                       'slug=%s column=%s date=%s' % (article.slug, article.column, article.date)
                       if ok else (failure.rendered if failure else '意外')))
        shutil.rmtree(tmp, ignore_errors=True)

    lines.append('')
    lines.append('## 附加用例与对照放行')
    for status, label, detail in extras:
        fails += 0 if status == 'PASS' else 1
        lines.append('%s  %s：%s' % (status, label, detail))

    (HERE / 'results.txt').write_text('\n'.join(lines) + '\n', encoding='utf-8', newline='\n')
    for line in lines:
        print(line)
    print('不合预期用例数：%d' % fails)
    return 3 if fails else 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except build.Fail as failure:
        print('FAIL  %s' % failure.rendered)
        sys.exit(failure.code)
