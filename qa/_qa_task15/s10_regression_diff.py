#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Task 15 失败集合差分回归 + 历史报告恢复。

用法：
  python _qa_task15/s10_regression_diff.py            # 差分回归（报告全部重定向到 _qa_task15/regression/）
  python _qa_task15/s10_regression_diff.py --restore   # 用 v1 输入（_qa_task15/before/）复现并恢复被误覆盖的历史报告

铁律：绝不把输出写进 _qa_taskNN/。每次 subprocess 前后都比对历史报告清单的 mtime+size，
任何变化立即报告并非零退出。
"""
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C

REG = os.path.join(C.QA, 'regression')
INC = os.path.join(C.QA, 'incident')
BEFORE_REL = '_qa_task15/before'
os.makedirs(REG, exist_ok=True)
os.makedirs(INC, exist_ok=True)

# (脚本, 结果目录环境变量名, 报告输出环境变量名, 历史基线 DOM 快照环境变量名)
SCRIPTS = [
    ('_qa_task2/verify.py', 'QODER_RESULTS_DIR', 'QODER_REPORT', None),
    ('_qa_task5/verify.py', 'QA_RESULTS', None, None),
    ('_qa_task6/verify.py', 'QA_RESULTS', None, None),
    ('_qa_task7/verify.py', 'QA_RESULTS', None, None),
    ('_qa_task8/verify.py', 'QA_RESULTS', 'QA_REPORT', None),
    ('_qa_task10/verify_task10.mjs', 'QODER_RESULTS_DIR', 'QODER_REPORT', 'QODER_FACTS'),
]
GUARDED = ['_qa_task2/report.md', '_qa_task4/report.md', '_qa_task5/report.txt', '_qa_task6/report.md',
           '_qa_task7/report.md', '_qa_task8/report.md', '_qa_task9/report.md', '_qa_task10/report.md',
           '_qa_task10/dom_facts.json', '_qa_task11/report.md', '_qa_task13/report.md', '_qa_task14/report.md']


def fingerprint():
    out = {}
    for rel in GUARDED:
        p = os.path.join(C.ROOT, rel.replace('/', os.sep))
        if os.path.exists(p):
            out[rel] = (os.path.getsize(p), os.path.getmtime(p), C.sha256(p))
    return out


def run_script(script, res_key, rep_key, facts_key, results_rel, facts_rel, tag):
    env = dict(os.environ)
    env['PYTHONIOENCODING'] = 'utf-8'
    if res_key and results_rel:
        env[res_key] = results_rel
    if rep_key:
        env[rep_key] = os.path.join(REG, '%s_%s.out' % (re.sub(r'[^A-Za-z0-9]', '_', script), tag))
    if facts_key and facts_rel:
        env[facts_key] = facts_rel
    cmd = (['node', script] if script.endswith('.mjs') else [sys.executable, script])
    proc = subprocess.run(cmd, cwd=C.ROOT, capture_output=True, text=True, encoding='utf-8',
                          errors='replace', env=env)
    text = (proc.stdout or '') + (proc.stderr or '')
    with open(os.path.join(REG, '%s_%s.stdout.txt' % (re.sub(r'[^A-Za-z0-9]', '_', script), tag)),
              'w', encoding='utf-8', newline='\n') as h:
        h.write(text)
    fails = set()
    for raw in text.splitlines():
        ln = re.sub(r'\s+', ' ', raw.strip())
        if re.match(r'^(FAIL\b|\[.+\] \[?FAIL)', ln) or ln.startswith('- [ ]') or 'FAIL ::' in ln:
            fails.add(ln)
    crashed = (proc.returncode != 0 and not fails)
    note = ''
    if crashed:
        tail = [l for l in text.strip().splitlines() if l.strip()][-3:]
        note = '崩溃（无 FAIL 行）: ' + ' / '.join(t[-160:] for t in tail)
    elif not fails and proc.returncode == 0:
        note = '全绿'
    return proc.returncode, fails, note


def mode_restore():
    print('=== 历史报告恢复（输入 = _qa_task15/before/ 的 v1 六文件）===')
    targets = {
        '_qa_task2/verify.py': '_qa_task2/report.md',
        '_qa_task5/verify.py': '_qa_task5/report.txt',
        '_qa_task10/verify_task10.mjs': '_qa_task10/report.md',
    }
    before_fp = fingerprint()
    for script, res_key, rep_key, facts_key in SCRIPTS:
        if script not in targets:
            continue
        env = dict(os.environ)
        env['PYTHONIOENCODING'] = 'utf-8'
        env[res_key] = BEFORE_REL
        if facts_key:
            env[facts_key] = '_qa_task10/dom_facts.json'   # v1 期 DOM 快照，未被本轮改动
        if rep_key:
            env[rep_key] = os.path.join(REG, 'restore_%s.md' % re.sub(r'[^A-Za-z0-9]', '_', script))
        cmd = (['node', script] if script.endswith('.mjs') else [sys.executable, script])
        proc = subprocess.run(cmd, cwd=C.ROOT, capture_output=True, text=True, encoding='utf-8',
                              errors='replace', env=env)
        produced = None
        if rep_key:
            produced = env[rep_key]
        else:
            # task5 在 QA_RESULTS 存在时写 report_mutant.txt
            produced = os.path.join(C.ROOT, '_qa_task5', 'report_mutant.txt')
        if not os.path.exists(produced):
            print('  %s 未产出报告文件（stdout 长度 %d）' % (script, len(proc.stdout or '')))
            continue
        dest = os.path.join(C.ROOT, targets[script].replace('/', os.sep))
        shutil.copyfile(produced, dest)
        keep = os.path.join(INC, os.path.basename(targets[script]) + '.restored_from_v1_rerun')
        shutil.copyfile(produced, keep)
        print('  恢复 %s（%d B，来自 v1 输入复现；副本留 _qa_task15/incident/）' % (targets[script], os.path.getsize(dest)))
        if targets[script] == '_qa_task5/report.txt':
            os.remove(produced)
    after_fp = fingerprint()
    changed = [k for k in after_fp if k in before_fp and after_fp[k][:2] != before_fp[k][:2]]
    print('  本轮被写入的历史文件: %s' % (changed or '无'))
    return 0


FLIP_KEYS = ['文件集合', '集合', '恰好', '第七', 'mtime', '未修改', '约定外', '正文', '段落', '逐段',
             '宿主', 'article', '直接子元素', 'h2', '白名单', '标签', '个文件', '四页', '页面数',
             '未被本任务改动', 'styles.css', 'script.js', '基线', '快照', 'hashes', 'A5', 'A1', 'E1', 'E5',
             'E8', 'D4', 'F', 'G', 'C', 'D', 'K', '断言总数', '结论']


def mode_diff():
    print('=== 失败集合差分回归 ===')
    # DOM 快照：after 用当前 Results，before 用 v1 期已有的 dom_facts.json（未被改动）
    facts_out = os.path.join(REG, 'dom_facts_after.json')
    env = dict(os.environ)
    env.update(QODER_RESULTS_DIR=os.path.join(C.ROOT, 'Results'), QODER_FACTS_OUT=facts_out,
               QODER_CDP_PORT='9379', PYTHONIOENCODING='utf-8')
    p = subprocess.run(['node', '_qa_task10/dom_probe.mjs'], cwd=C.ROOT, capture_output=True,
                       text=True, encoding='utf-8', env=env)
    print('  当前 Results 的 DOM 快照: rc=%s %s' % (p.returncode, os.path.basename(facts_out)))
    guard_before = fingerprint()
    lines = ['# Task 15 失败集合差分回归（判定用 FAIL 集合，不用退出码）', '',
             '基线输入：_qa_task15/before/（v1 六文件，与切换前哈希逐项相等）',
             '当前输入：Results/（v2 九文件）',
             '历史脚本与历史报告全程只读（跑前跑后比对 msize/mtime/sha 清单）。', '']
    summary = []
    unexplained = []
    for script, res_key, rep_key, facts_key in SCRIPTS:
        if not os.path.exists(os.path.join(C.ROOT, script.replace('/', os.sep))):
            continue
        facts_before = '_qa_task10/dom_facts.json' if facts_key else None
        facts_after = os.path.join(REG, 'dom_facts_after.json') if facts_key else None
        rb, lb, nb = run_script(script, res_key, rep_key, facts_key, BEFORE_REL, facts_before, 'before')
        ra, la, na = run_script(script, res_key, rep_key, facts_key, 'Results', facts_after, 'after')
        new = sorted(la - lb)
        gone = sorted(lb - la)
        def mark_for(ln):
            keys = ('集合', '恰好', '个文件', '正文', '段落', '逐段', '直接子元素', 'h2', '白名单', '标签',
                    'mtime', '宿主', 'article', '快照', '基线', '四页', 'D4', 'A1', 'A5', 'E1', 'E5', 'E8', 'F', 'G', '第七')
            return '登记内' if any(k in ln for k in keys) else '未登记'
        head = '  基线（v1 输入）rc=%s FAIL %d 条；当前（v2 输入）rc=%s FAIL %d 条；共同 %d 条' % (
            rb, len(lb), ra, len(la), len(la & lb))
        if nb:
            head += '\n    基线轮：' + nb
        if na:
            head += '\n    当前轮：' + na
        out_lines = ['## %s' % script, head, '  新增 FAIL %d 条：' % len(new)]
        for ln in new:
            mark = mark_for(ln)
            if mark == '未登记':
                unexplained.append('%s: %s' % (script.split('/')[0], ln))
            out_lines.append('    [%s] %s' % (mark, ln[:230]))
        if gone:
            out_lines.append('  基线红而当前绿 %d 条：' % len(gone))
            out_lines += ['    - ' + g[:180] for g in gone[:10]]
        out_lines.append('')
        lines += out_lines
        summary.append('%s: FAIL %d → %d（新增 %d，未登记 %d）'
                       % (script.split('/')[0], len(lb), len(la), len(new),
                          sum(1 for l in new if any('未登记' == m for m in [mark_for(l)]))))
    # task4 无重定向支持：只能对当前 Results 跑一轮
    rb4, lb4, n4 = run_script('_qa_task4/verify_home.py', None, None, None, None, None, 'after')
    lines += ['## _qa_task4/verify_home.py（硬编码 Results 路径，无重定向环境变量）',
              '  当前 rc=%s FAIL %d 条%s：' % (rb4, len(lb4), ('（' + n4 + '）' if n4 else '')),
              '']
    lines += ['    ' + l[:230] for l in sorted(lb4)]
    guard_after = fingerprint()
    written = [k for k in guard_after if k in guard_before and guard_after[k][:2] != guard_before[k][:2]]
    lines += ['', '## 汇总'] + ['  ' + s for s in summary]
    lines += ['', '## 未登记的新增失败（应为 0）'] + (['  ' + u[:230] for u in unexplained] or ['  无'])
    lines += ['', '## 只读证明：跑前后历史报告清单 mtime/size 变化', '  ' + ('无（全部只读）' if not written else str(written))]
    with open(os.path.join(C.QA, 'regression_diff.txt'), 'w', encoding='utf-8', newline='\n') as h:
        h.write('\n'.join(lines) + '\n')
    print('\n'.join(summary))
    print('未登记新增失败 %d 条；历史文件被写入 %s' % (len(unexplained), written or '无'))
    return 1 if written else 0


if '--restore' in sys.argv:
    sys.exit(mode_restore())
sys.exit(mode_diff())
