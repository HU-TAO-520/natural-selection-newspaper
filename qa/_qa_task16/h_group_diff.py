#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Task 16.6.4 H 组失败集合差分驱动。
基线轮 = 当前七页 HTML + _qa_task16/before_styles.css；当前轮 = 当前七页 HTML + 本包 styles.css。
断言代码逐字取自 _qa_task10/verify_task10.mjs 的 H 组（见 h_group_runner.mjs 的切片说明）。
判据：允许翻转的只有 H11（含 H11/root），其余标签新增失败必须为 0；另跑一轮七页口径复核表 3 的 H1/H12。
只读守卫：跑前后比对历史 QA 产物的 size+mtime+sha256，任何历史文件被写即 rc=2（Task 15 事故教训）。
"""
import hashlib
import io
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WORK = os.path.join(HERE, 'hdiff')
PAGES4 = ['index.html', 'news-message.html', 'news-feature.html', 'news-commentary.html']
PAGES7 = PAGES4 + ['article-school-course-volunteer.html', 'article-math-to-ai-learning.html', 'article-classroom-screen-upgrade.html']

GUARD = []
for d in sorted(os.listdir(ROOT)):
    if d.startswith('_qa_task') and d != '_qa_task16':
        p = os.path.join(ROOT, d)
        for name in sorted(os.listdir(p)):
            f = os.path.join(p, name)
            if os.path.isfile(f) and (name.endswith(('.md', '.txt', '.json'))):
                st = os.stat(f)
                GUARD.append((f, st.st_size, int(st.st_mtime), hashlib.sha256(open(f, 'rb').read()).hexdigest()))


def fingerprint():
    out = []
    for (f, sz, mt, sh) in GUARD:
        st = os.stat(f)
        out.append((f, st.st_size, int(st.st_mtime), hashlib.sha256(open(f, 'rb').read()).hexdigest()))
    return out


def run(cmd, env=None, tag=''):
    e = dict(os.environ)
    e['PYTHONIOENCODING'] = 'utf-8'
    if env:
        e.update(env)
    r = subprocess.run(cmd, cwd=ROOT, env=e, capture_output=True, text=True, encoding='utf-8', errors='replace')
    return r


def fails_of(report):
    got = set()
    lines = []
    with io.open(report, encoding='utf-8') as f:
        for line in f:
            lines.append(line.rstrip('\n'))
            if line.startswith('FAIL '):
                got.add(line.split(' ')[1])
    return got, lines


def build_copy(name, css_src):
    dst = os.path.join(WORK, name)
    if os.path.isdir(dst):
        shutil.rmtree(dst)
    os.makedirs(dst)
    for f in os.listdir(os.path.join(ROOT, 'Results')):
        shutil.copyfile(os.path.join(ROOT, 'Results', f), os.path.join(dst, f))
    shutil.copyfile(css_src, os.path.join(dst, 'styles.css'))
    return dst


before_fp = fingerprint()
os.makedirs(WORK, exist_ok=True)
rows = []
report_paths = {}
for name, css, port in (('baseline', os.path.join(HERE, 'before_styles.css'), 9541),
                        ('current', os.path.join(ROOT, 'Results', 'styles.css'), 9542)):
    d = build_copy(name, css)
    facts = os.path.join(HERE, 'dom_facts_%s.json' % name)
    rep = os.path.join(HERE, 'h_rows_%s.txt' % name)
    report_paths[name] = rep
    p1 = run(['node', os.path.join(HERE, 'dom_facts_probe.mjs')],
             {'QODER_RESULTS_DIR': d, 'QODER_FACTS_OUT': facts, 'H_PAGES': ','.join(PAGES4), 'H_PORT': str(port)})
    p2 = run(['node', os.path.join(HERE, 'h_group_runner.mjs')],
             {'QODER_RESULTS_DIR': d, 'QODER_FACTS': facts, 'QODER_REPORT': rep})
    fset, lines = fails_of(rep)
    rows.append((name, p1.returncode, p2.returncode, fset, lines))
    print('%s 轮：探针 rc=%d H 组 rc=%d FAIL 标签=%s' % (name, p1.returncode, p2.returncode, ','.join(sorted(fset)) or '无'))

# 七页口径（表 3 的 H1/H12 逐页语义）
d7 = os.path.join(WORK, 'current7')
if os.path.isdir(d7):
    shutil.rmtree(d7)
os.makedirs(d7)
for f in os.listdir(os.path.join(ROOT, 'Results')):
    shutil.copyfile(os.path.join(ROOT, 'Results', f), os.path.join(d7, f))
facts7 = os.path.join(HERE, 'dom_facts_seven.json')
rep7 = os.path.join(HERE, 'h_rows_seven.txt')
p1 = run(['node', os.path.join(HERE, 'dom_facts_probe.mjs')],
         {'QODER_RESULTS_DIR': d7, 'QODER_FACTS_OUT': facts7, 'H_PAGES': ','.join(PAGES7), 'H_PORT': '9543'})
p2 = run(['node', os.path.join(HERE, 'h_group_runner.mjs')],
         {'QODER_RESULTS_DIR': d7, 'QODER_FACTS': facts7, 'QODER_REPORT': rep7, 'H_PAGES': ','.join(PAGES7)})
fset7, lines7 = fails_of(rep7)
print('七页口径轮：探针 rc=%d H 组 rc=%d FAIL 标签=%s' % (p1.returncode, p2.returncode, ','.join(sorted(fset7)) or '无'))

base_f, cur_f = rows[0][3], rows[2 - 1][3] if len(rows) > 1 else set()
baseline, current = rows[0], rows[1]
new_fail = sorted(current[3] - baseline[3])
healed = sorted(baseline[3] - current[3])
allowed = {'H11', 'H11/root'}
problems = []
if not set(new_fail) <= allowed:
    problems.append('新增失败超出允许翻转范围：' + ','.join(new_fail))
if 'H13' in json.dumps(list(current[3])) or 'H14' in json.dumps(list(current[3])):
    problems.append('H13/H14 不应出现在 verify_task10 的 H 组里')

out = io.open(os.path.join(HERE, 'h_group_diff.txt'), 'w', encoding='utf-8', newline='')
out.write('# Task 16.6.4 H 组失败集合差分\n\n')
out.write('基线轮 = 当前七页 HTML + before_styles.css；当前轮 = 当前七页 HTML + 本包 styles.css\n')
out.write('断言代码逐字取自 _qa_task10/verify_task10.mjs 的 H 组（h_group_runner.mjs 按行切片，仅 PAGES 由 H_PAGES 改写）\n\n')
for name, rc1, rc2, fset, lines in rows:
    out.write('## %s 轮（探针 rc=%d，H 组 rc=%d，行数=%d，标签数=%d）\n' % (name, rc1, rc2, len(lines), len(set(l.split(' ')[1] for l in lines if l.split()))))
    for l in lines:
        out.write('  ' + l + '\n')
    out.write('\n')
out.write('## 七页口径（表 3：H1 逐页 = 首页 + 三列表页 + 三详情页）\n')
for l in lines7:
    out.write('  ' + l + '\n')
out.write('\n## 差分\n')
out.write('  基线轮 FAIL 标签：%s\n' % (','.join(sorted(baseline[3])) or '无'))
out.write('  当前轮 FAIL 标签：%s\n' % (','.join(sorted(current[3])) or '无'))
out.write('  新增失败：%s（允许集合：%s）\n' % (','.join(new_fail) or '无', ','.join(sorted(allowed))))
out.write('  消失失败：%s\n' % (','.join(healed) or '无'))
out.write('  七页口径 FAIL 标签：%s\n' % (','.join(sorted(fset7)) or '无'))
out.write('  19 行／18 标签对账：基线轮行数=%d 标签数=%d；当前轮行数=%d 标签数=%d\n' % (
    len(baseline[4]), len(set(l.split(' ')[1] for l in baseline[4] if l.split())),
    len(current[4]), len(set(l.split(' ')[1] for l in current[4] if l.split()))))
out.write('  H13／H14 不在本脚本内（属 Task 18 重写后的闸门），本包只交付定义：' + ('确认未出现\n' if not ({'H13', 'H14'} & (baseline[3] | current[3])) else '异常出现\n'))
out.close()

after_fp = fingerprint()
touched = [(a[0]) for a, b in zip(before_fp, after_fp) if a != b]
print('\n差分结论：新增失败=%s；允许=%s' % (','.join(new_fail) or '无', ','.join(sorted(allowed))))
print('只读守卫：被写入的历史 QA 文件=%s' % (','.join(touched) or '无'))
if touched:
    problems.append('历史 QA 产物被写入：' + ','.join(touched))
if problems:
    for p in problems:
        print('PROBLEM: ' + p)
    sys.exit(1 if not touched else 2)
print('OK：H 组差分在允许范围内，历史文件未被触碰')
sys.exit(0)
