#!/usr/bin/env python3
"""Task 14.2/14.3 交付文件生成与壳回切、切片对齐证明（只读 _qa_task13/ 与 content/）。

退出码沿用 Task13/Task14 的 0/2/3/4 合同。
"""

import hashlib
import re
import shutil
import sys
from pathlib import Path

sys.dont_write_bytecode = True

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'build'))

import build  # noqa: E402

FAILURES = []


def record(ok, label, detail=''):
    print('%s  %s%s' % ('PASS' if ok else 'FAIL', label, ('  — ' + detail) if detail else ''))
    if not ok:
        FAILURES.append(label)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    build.check_gate(ROOT, True)
    print('== 14.1 输入门禁 ==')
    for rel, (size, digest) in sorted(build.GATE_FILES.items()):
        data = (ROOT / rel).read_bytes()
        record(len(data) == size and sha(data) == digest, '门禁 %s' % rel,
               '%d %s…' % (len(data), digest[:12]))
    spec = build.load_spec(ROOT)
    for rel, digest in sorted(spec['content_files_sha256'].items()):
        path = ROOT / rel
        record(path.is_file() and sha(path.read_bytes()) == digest, 'content 只读登记 %s' % rel)

    print('== 14.2 build/shell.html ==')
    shell_path = ROOT / 'build/shell.html'
    shell_path.parent.mkdir(exist_ok=True)
    derived_shell = build.derive_shell((ROOT / '_qa_task13/baseline/news-message.html').read_bytes())
    if not shell_path.is_file():
        shell_path.write_bytes(derived_shell)
    shell = shell_path.read_bytes()
    record(shell == derived_shell, '壳 = 基线重导出（两处编辑之外零改动）')
    record((len(shell), sha(shell)) == build.SHELL_EXPECTED,
           '壳 %d 字节 / %s…（期望 %d / %s…）'
           % (len(shell), sha(shell)[:12], build.SHELL_EXPECTED[0], build.SHELL_EXPECTED[1][:12]))
    record(shell.count(b'{{TITLE}}') == 1, '{{TITLE}} 恰一处')
    record(shell.count(b'{{MAIN}}') == 1, '{{MAIN}} 恰一处')
    record(shell.count(b'aria-current') == 0, '壳内 aria-current 计数为 0')
    record(b'<article' not in shell and b'home-sections' not in shell, '壳不含页面专属正文')
    nav = shell[shell.find(build.NAV_OPEN.encode()):shell.find(b'</nav>')]
    for href, want in [('index.html', 2), ('news-message.html', 1),
                       ('news-feature.html', 1), ('news-commentary.html', 1)]:
        literal = ('href="%s"' % href).encode()
        record(shell.count(literal) == want, '整份壳内 href="%s" 命中 %d 次' % (href, shell.count(literal)),
               '期望 %d' % want)
        record(nav.count(literal) == 1, 'nav 子树内 href="%s" 恰一次' % href)

    print('== 14.3 build/partials/home-intro.html ==')
    partial_path = ROOT / 'build/partials/home-intro.html'
    partial_path.parent.mkdir(parents=True, exist_ok=True)
    index_html = (ROOT / '_qa_task13/baseline/index.html').read_bytes()
    derived_partial = build.derive_partial(index_html)
    if not partial_path.is_file():
        partial_path.write_bytes(derived_partial)
    partial = partial_path.read_bytes()
    record(partial == derived_partial, 'partial = 基线 index.html 重切片')
    record((len(partial), sha(partial)) == build.PARTIAL_EXPECTED,
           'partial %d 字节 / %s…' % (len(partial), sha(partial)[:12]))
    text = partial.decode('utf-8')
    record(text.count('<section class="home-section"') == 3, 'partial 含 3 个 section.home-section')
    record(text.count('<h2 class="home-section__title"') == 3, 'partial 含 3 个 h2.home-section__title')
    record(text.count('<p class="home-section__text">') == 3, 'partial 含 3 个 p.home-section__text')
    for frozen in build.HOME_FROZEN_TEXTS[1:7]:
        record(frozen in text, '冻结文本原样在场：%s' % frozen)
    record(not any(b in text for b in ('<h1', '<main', 'home-latest')), 'partial 无 h1／main／home-latest')

    print('== 公共壳合同 4：壳回切与切片对齐 ==')
    shell_obj = build.load_shell(ROOT)
    for page in ('index.html', 'news-message.html', 'news-feature.html', 'news-commentary.html'):
        baseline = (ROOT / ('_qa_task13/baseline/' + page)).read_bytes()
        pre, inner, post = build.split_main(baseline, page)
        head = pre.decode('utf-8')
        title_body = re.search(r'<title>(.*)｜自然选择号</title>', head).group(1)
        current = re.search(r'href="([^"]*)" aria-current="page"', head).group(1)
        record(build.assemble(shell_obj, title_body, current, inner, page) == baseline,
               '壳回切逐字节相等：%s' % page)
    for row in build.load_registry(ROOT):
        listed = (ROOT / ('_qa_task13/main_slices/%s.main-interior.html' % row.list_page[:-5])).read_bytes()
        _, inner, _ = build.split_main((ROOT / ('_qa_task13/baseline/' + row.list_page)).read_bytes(), row.list_page)
        record(listed == inner, '内部切片与基线 <main> 内字节对齐：%s' % row.list_page)

    print('== 运行时依赖边界 ==')
    source = (ROOT / 'build/build.py').read_text(encoding='utf-8')
    imports = sorted(set(re.findall(r'^import (\w+)', source, re.M)))
    allowed = {'argparse', 'hashlib', 'json', 're', 'shutil', 'sys', 'tempfile', 'dataclasses',
               'typing', 'pathlib', '__future__'}
    record(set(imports) <= allowed, 'build.py 仅用标准库白名单内模块', '、'.join(imports))
    record(not re.search(r'\bimport\s+(subprocess|socket|urllib|http\.client|time|datetime)\b|subprocess\.|urlopen', source),
           '无子进程／网络／时间来源')
    record('pip' not in source and not (ROOT / 'requirements.txt').exists()
           and not (ROOT / 'build/pack.py').exists(), '无 pip 依赖、未创建 build/pack.py')

    print('== 14.9 正向构建、确定性与内容复核 ==')
    import tempfile
    runs = []
    for _ in range(2):
        stage = Path(tempfile.mkdtemp())
        code = build.main(['--out', str(stage)], root=ROOT)
        runs.append((code, {p.name: sha(p.read_bytes()) for p in sorted(stage.iterdir())},
                     {p.name: len(p.read_bytes()) for p in sorted(stage.iterdir())}))
        shutil.rmtree(stage, ignore_errors=True)
    record(runs[0][0] == 0 and runs[1][0] == 0, '连续两次构建均返回 0',
           '%s／%s' % (runs[0][0], runs[1][0]))
    record(runs[0][1] == runs[1][1] and len(runs[0][1]) == 7,
           '连续两次构建逐文件哈希全等（7 项）')

    tmp = Path(tempfile.mkdtemp())
    for part in ('_qa_task13', 'build'):
        shutil.copytree(ROOT / part, tmp / part)
    (tmp / 'content/articles').mkdir(parents=True)
    for name in ('columns.md', '_模板.md'):
        shutil.copy2(ROOT / 'content' / name, tmp / 'content' / name)
    names = [p.name for p in sorted((ROOT / 'content/articles').glob('*.md'))]
    for name in reversed(names):
        shutil.copy2(ROOT / 'content/articles' / name, tmp / 'content/articles' / name)
    stage = tmp / 'out'
    stage.mkdir()
    code = build.main(['--out', str(stage)], root=tmp)
    shuffled = {p.name: sha(p.read_bytes()) for p in sorted(stage.iterdir())}
    shutil.rmtree(tmp, ignore_errors=True)
    record(code == 0 and shuffled == runs[0][1], '打乱 content/ 文件创建次序后产物哈希不变', 'rc=%d' % code)

    built = build.build_pages(ROOT)
    inner = built['inners']['index.html']
    golden = (ROOT / '_qa_task14/out/index.html')
    _, golden_inner, _ = build.split_main(golden.read_bytes(), '_qa_task14/out/index.html')
    record(golden_inner == inner, 'golden 首页 mainInner 与本次构建逐字节相等')
    record(built['partial'] == build.derive_partial((ROOT / '_qa_task13/baseline/index.html').read_bytes()),
           'S4：home-intro partial 与基线重切片相等')
    record(not any('安 装' in '\n'.join(a.paragraphs) + (a.end_date or '') for a in built['articles']),
           'Task1 §7：`安 装` 在三篇正文中命中 0')
    record(sum(p.count('她') for a in built['articles'] for p in a.paragraphs) == 1,
           'Task1 §7：F05 的"她"未被改写为"他"（计数恰 1）')
    for needle in ('根据记者的不完全统计', '从科大讯飞的产品资料来看', '只能在Windows环境下运行',
                   '设备升级了，使用门槛也该降下来。“科技不是高高在上的，而应该服务人民。”',
                   '（自然选择号9月18日）'):
        whole = ''.join('\n'.join(a.paragraphs) + (a.end_date or '') for a in built['articles'])
        record(needle in whole, 'Task1 §7 已知异常原样在场：%s' % needle[:24])
    corpus = ''.join('\n'.join(a.paragraphs) + (a.end_date or '')
                     for a in sorted(built['articles'], key=lambda x: x.slug))
    mismatches = [(k, corpus.count(k), v) for k, v in spec['token_counts'].items()
                  if corpus.count(k) != v]
    record(not mismatches, 'Task13 §token_counts 21 项计数逐项相等', str(mismatches))

    lines = ['# Task 14 确定性对照（两次独立构建的逐文件 SHA-256）', '',
             '第一次构建与第二次构建均写入临时目录后计算；root=工作区根，golden 取自 `_qa_task14/out/index.html`。',
             '命令行：python build/build.py --out _qa_task14/out', '',
             '%-46s %8s  %-64s  %-64s  %s' % ('文件', '字节', '第一次构建 SHA-256', '第二次构建 SHA-256', '相等')]
    for name in sorted(runs[0][1]):
        lines.append('%-46s %8d  %-64s  %-64s  %s' % (
            name, runs[0][2][name], runs[0][1][name], runs[1][1][name],
            'yes' if runs[0][1][name] == runs[1][1][name] else 'NO'))
    lines += ['', '首页 mainInner golden（S3 后半，_qa_task14/out/index.html）',
              '字节 %d' % len(inner), 'SHA-256 %s' % sha(inner),
              '', '公共壳 build/shell.html：字节 %d，SHA-256 %s' % build.SHELL_EXPECTED,
              '首页引言 build/partials/home-intro.html：字节 %d，SHA-256 %s' % build.PARTIAL_EXPECTED,
              '', '壳回切证明：index／news-message／news-feature／news-commentary 四页逐字节相等。',
              '打乱 content/articles 创建次序后重建：产物哈希不变。']
    (ROOT / '_qa_task14' / 'determinism.txt').write_text('\n'.join(lines) + '\n', encoding='utf-8', newline='\n')
    record(True, 'determinism.txt 已写出（%d 行）' % (len(lines)))

    return 3 if FAILURES else 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except build.Fail as failure:
        print('FAIL  %s' % failure.rendered)
        sys.exit(failure.code)
