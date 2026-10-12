#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Task 15.3 切换后哈希登记与表 2 逐项比对。"""
import datetime
import hashlib
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.abspath(os.environ.get('QODER_RESULTS_DIR') or os.path.join(ROOT, 'Results'))
OUT = os.path.join(ROOT, '_qa_task14', 'out')
QA = os.path.join(ROOT, '_qa_task15')

TABLE1 = {
    'index.html': '971e57a5f85bae99c389e58d7a132e96c02388432de997c4df3d4af495e6416a',
    'news-message.html': '66ae5826bbdf9829206c6374305e7bf4bab546c65485349db5fff40e0b5fa0e8',
    'news-feature.html': '73ff75678c453badbc1edcb1ff590001dc93cade3260ff364e042d02075df9a5',
    'news-commentary.html': 'a2dbf4aac57472e8a8728f80908dc366d3aa9076310bbb39b24d71f251ea8d52',
    'styles.css': '2c23817299492ea9a3fd7ad23237cfabd6723d166bd99194febbed09ad418ba1',
    'script.js': 'abb39e4a6d218546b45eded0fa601540d2c5195d93c9fe1dfa8aaaabca13c666',
}
HTML7 = ['index.html', 'news-message.html', 'news-feature.html', 'news-commentary.html',
         'article-school-course-volunteer.html', 'article-math-to-ai-learning.html',
         'article-classroom-screen-upgrade.html']
INHERITED = ['styles.css', 'script.js']
EXPECTED9 = sorted(HTML7 + INHERITED)


def sha256(path):
    with open(path, 'rb') as handle:
        return hashlib.sha256(handle.read()).hexdigest()


fails = []
listing = sorted(os.listdir(RES))
subdirs = [n for n in listing if os.path.isdir(os.path.join(RES, n))]
if subdirs:
    fails.append(f'Results 存在子目录: {subdirs}')
if listing != EXPECTED9:
    fails.append(f'Results 集合 != 期望九文件: {listing}')
nfiles = len([n for n in listing if os.path.isfile(os.path.join(RES, n))])
print('Results 文件数 = %d（期望 9），子目录 %d（期望 0）' % (nfiles, len(subdirs)))

lines = ['# path\tsha256\tbytes\tmtime',
         f'# Task 15.3 切换后基线（v2 九文件），登记 {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}',
         '# 期望来源：七份 HTML == _qa_task14/out/，styles.css 与 script.js == 表 1 原值']
print('\n表 2 逐项比对')
for name in EXPECTED9:
    p = os.path.join(RES, name)
    if not os.path.exists(p):
        fails.append('%s 缺失（期望九文件之一）' % name)
        print('  %-40s 缺失  FAIL' % name)
        continue
    size = os.path.getsize(p)
    mtime = datetime.datetime.fromtimestamp(os.path.getmtime(p)).strftime('%Y-%m-%d %H:%M:%S')
    digest = sha256(p)
    if name in INHERITED:
        want = TABLE1[name]
        src = '表 1（本包不得改动）'
    else:
        want = sha256(os.path.join(OUT, name))
        src = '_qa_task14/out/' + name
    equal = (digest == want)
    if not equal:
        fails.append(f'{name} != 期望（{src}）')
    print(f'  {name:<40} {size:>6} B  {"PASS" if equal else "FAIL"}  来源 {src}')
    lines.append(f'Results/{name}\t{digest}\t{size}\t{mtime}')
    lines.append(f'# 期望 {want} <- {src}')

out = os.path.join(QA, 'hashes_after.txt')
if os.environ.get('QODER_RESULTS_DIR'):
    out = os.path.join(QA, 'hashes_after_mutant.txt')
with open(out, 'w', encoding='utf-8', newline='\n') as handle:
    handle.write('\n'.join(lines) + '\n')

print('\n无副作用复核')
for label, path, want in [
    ('styles.css', os.path.join(RES, 'styles.css'), TABLE1['styles.css']),
    ('script.js', os.path.join(RES, 'script.js'), TABLE1['script.js']),
]:
    ok = sha256(path) == want
    if not ok:
        fails.append(f'{label} 相对表 1 发生变化（违反 R10）')
    print(f'  {label} 未变: {"PASS" if ok else "FAIL"}')

CONTENT13 = {
    'columns.md': ('c97465a56e6dbd02289d5c792ef8991c0290bc2f62fbac619b009c9c3eccf2a4', 123),
    '_模板.md': ('6264baf96a65d49b5eaf89476422ee5497ed924e006e4521df1b6b4d5b83abeb', 637),
    'articles/school-course-volunteer.md': ('890232940a6c5de4fc2eadc56bd0b2e2f238ef3c53de50bd4c9ff4dae1dd949e', 1003),
    'articles/math-to-ai-learning.md': ('e92c5b9b9a27abcdabd2d480e2cad498f8d52f39c5557c6db97ec626bdc3af71', 4688),
    'articles/classroom-screen-upgrade.md': ('8baf673e6f1bf38a930115073e650020da4e526cfc18d169efc6749e90de2d2a', 6127),
}
for rel, (want, size) in CONTENT13.items():
    p = os.path.join(ROOT, 'content', rel)
    ok = sha256(p) == want and os.path.getsize(p) == size
    if not ok:
        fails.append(f'content/{rel} 与 Task 13 记录不符')
    print(f'  content/{rel} == Task13: {"PASS" if ok else "FAIL"}')
cfiles = []
for dirpath, dirnames, filenames in os.walk(os.path.join(ROOT, 'content')):
    cfiles += [os.path.relpath(os.path.join(dirpath, f), os.path.join(ROOT, 'content')).replace('\\', '/') for f in filenames]
if sorted(cfiles) != sorted('content/' + k for k in CONTENT13):
    print('  content 集合: ' + str(cfiles))
    if sorted(cfiles) != sorted(['columns.md', '_模板.md', 'articles/school-course-volunteer.md', 'articles/math-to-ai-learning.md', 'articles/classroom-screen-upgrade.md']):
        fails.append('content/ 集合 != 五文件')

BUILD14 = {'shell.html': ('86e47c3be239da08ea06d4132b35f23b236991155d5cee7dbd13c7b1c27ea5e6', 1704),
           'partials/home-intro.html': ('622d8cce02633b64f5fe35034c24764f90727a28416213e798bfeb6bf0a13646', 823)}
for rel, (want, size) in BUILD14.items():
    p = os.path.join(ROOT, 'build', rel)
    ok = sha256(p) == want and os.path.getsize(p) == size
    if not ok:
        fails.append(f'build/{rel} 与 Task 14 记录不符')
    print(f'  build/{rel} == Task14: {"PASS" if ok else "FAIL"}')
print(f'  build/build.py 当前值: {sha256(os.path.join(ROOT, "build", "build.py"))[:16]}… {os.path.getsize(os.path.join(ROOT, "build", "build.py"))} B（Task14 报告未记录 build.py 自身哈希，本值作为 v2 链记录）')

pack = os.path.join(ROOT, 'build', 'pack.py')
manifest = os.path.join(ROOT, 'deploy', 'manifest.json')
zip_p = os.path.join(ROOT, 'deploy', 'site.zip')
if os.path.exists(pack):
    fails.append('build/pack.py 意外出现（属 Task 17）')
if os.path.exists(manifest):
    fails.append('deploy/manifest.json 意外出现（属 Task 17）')
print(f'  build/pack.py 不存在: {"PASS" if not os.path.exists(pack) else "FAIL"}')
print(f'  deploy/manifest.json 不存在: {"PASS" if not os.path.exists(manifest) else "FAIL"}')
print(f'  deploy/site.zip 未被本包改动: {os.path.getsize(zip_p)} B {sha256(zip_p)[:16]}… mtime '
      + datetime.datetime.fromtimestamp(os.path.getmtime(zip_p)).strftime('%Y-%m-%d %H:%M:%S')
      + ('（仍为 2026-09-19 陈旧打包件）' if datetime.date.fromtimestamp(os.path.getmtime(zip_p)) == datetime.date(2026, 9, 19) else ' <- 非预期 mtime'))

proc = subprocess.run([sys.executable, os.path.join('build', 'build.py'), '--out', RES, '--check'],
                      cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
print(f'\n构建器 --check（Results）: rc={proc.returncode} stdout={proc.stdout.strip()!r} stderr={proc.stderr.strip()!r}')
if proc.returncode != 0:
    fails.append('--check 在 Results 上非 0，说明产物与 content/build 有漂移')

print('\nhashes_after.txt 已写出')
print('15.3 ' + ('PASS' if not fails else 'FAIL'))
for f in fails:
    print('  FAIL: ' + f)
sys.exit(1 if fails else 0)
