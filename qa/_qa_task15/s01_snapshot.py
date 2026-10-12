#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Task 15.1 切换前快照与哈希门禁（表 1，v1 六文件）。"""
import datetime
import hashlib
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'Results')
SNAP = os.path.join(ROOT, '_qa_task15', 'before')

TABLE1 = [
    ('index.html', '971e57a5f85bae99c389e58d7a132e96c02388432de997c4df3d4af495e6416a', 2629),
    ('news-message.html', '66ae5826bbdf9829206c6374305e7bf4bab546c65485349db5fff40e0b5fa0e8', 3011),
    ('news-feature.html', '73ff75678c453badbc1edcb1ff590001dc93cade3260ff364e042d02075df9a5', 6962),
    ('news-commentary.html', 'a2dbf4aac57472e8a8728f80908dc366d3aa9076310bbb39b24d71f251ea8d52', 8486),
    ('styles.css', '2c23817299492ea9a3fd7ad23237cfabd6723d166bd99194febbed09ad418ba1', 12401),
    ('script.js', 'abb39e4a6d218546b45eded0fa601540d2c5195d93c9fe1dfa8aaaabca13c666', 2204),
]


def sha256(path):
    with open(path, 'rb') as handle:
        return hashlib.sha256(handle.read()).hexdigest()


def stat(path):
    size = os.path.getsize(path)
    mtime = datetime.datetime.fromtimestamp(os.path.getmtime(path)).strftime('%Y-%m-%d %H:%M:%S')
    return size, mtime, sha256(path)


fails = []
results = []
names = [n for n, _, _ in TABLE1]

V2 = sorted(names + ['article-school-course-volunteer.html', 'article-math-to-ai-learning.html',
                     'article-classroom-screen-upgrade.html'])
live = sorted(os.listdir(SRC))
pre_switch = (live == sorted(names))
subdirs = [n for n in live if os.path.isdir(os.path.join(SRC, n))]
if subdirs:
    fails.append(f'Results 子目录: {subdirs}')
if pre_switch:
    if live != sorted(names):
        fails.append(f'Results 集合 != 表 1 六行: {live}')
elif live != V2:
    fails.append(f'Results 既不是 v1 六文件也不是 v2 九文件: {live}')

snap = sorted(os.listdir(SNAP))
if snap != sorted(names):
    fails.append(f'快照集合 != 表 1 六行: {snap}')

for name, want_hash, want_size in TABLE1:
    live_path = os.path.join(SRC, name)
    snap_path = os.path.join(SNAP, name)
    lsize, lmtime, lhash = stat(live_path)
    ssize, smtime, shash = stat(snap_path)
    # 门禁对象是快照：快照 == 表 1 才是可回滚的证明；切换后 Results/ 必然不等于表 1
    snap_ok = (shash == want_hash and ssize == want_size)
    live_match = (lhash == want_hash and lsize == want_size)
    if not snap_ok:
        fails.append(f'{name} 快照 != 表 1')
    if pre_switch and not live_match:
        fails.append(f'{name} 切换前 Results 与表 1 不符')
    results.append(f'{name}: 快照 {ssize} B {shash[:16]}… 表1 {"PASS" if snap_ok else "FAIL"} | 当前 Results {lsize} B {lhash[:16]}… {"== 表1" if live_match else "已切换(v2)"}')

lines = ['# path\tsha256\tbytes\tmtime',
         f'# Task 15.1 切换前基线（表 1，v1 六文件）',
         '# 本文件是 v1 基线记录：每行都取 _qa_task15/before/ 快照的实测值（快照在切换前建立、不得覆盖），',
         '# 因此重复运行本脚本不会把切换后的哈希写进基线。切换后 Results/ 的九文件哈希见 hashes_after.txt。']
for name, _, _ in TABLE1:
    p = os.path.join(SNAP, name)
    size, mtime, digest = stat(p)
    lines.append(f'Results/{name}\t{digest}\t{size}\t{mtime}')
    lines.append(f'_qa_task15/before/{name}\t{digest}\t{size}\t{mtime}')
    want_hash, want_size = [(h, s) for n, h, s in TABLE1 if n == name][0]
    lines.append(f'# 对表 {name}: 期望 {want_hash} {want_size} B -> '
                 + ('PASS' if (digest == want_hash and size == want_size) else 'FAIL'))

out = os.path.join(ROOT, '_qa_task15', 'hashes_before.txt')
with open(out, 'w', encoding='utf-8', newline='\n') as handle:
    handle.write('\n'.join(lines) + '\n')

for line in results:
    print(line)
print(f'\nResults 条目: {live}')
print(f'快照条目:   {snap}')
print(f'写出 {out}')
print('\n15.1 ' + ('PASS' if not fails else 'FAIL'))
for f in fails:
    print('  FAIL: ' + f)
sys.exit(1 if fails else 0)
