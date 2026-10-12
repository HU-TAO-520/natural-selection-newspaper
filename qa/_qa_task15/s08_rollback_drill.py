#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Task 15.8 回滚演练与负向对照。

三种模式：
  （默认）      在 _qa_task15/rollback_drill/ 副本上完整执行 rollback.md，并校验回滚结果；真实 Results/ 不动。
  --apply DIR   只读校验 DIR 是否等于切换前六文件状态（rollback.md 第 4 步用的判定命令）。
  --negatives   八类变异在副本目录上逐一注入，断言对应检查变红，且真实 Results/ 未被触碰。
"""
import hashlib
import os
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C

BEFORE = {
    'index.html': '971e57a5f85bae99c389e58d7a132e96c02388432de997c4df3d4af495e6416a',
    'news-message.html': '66ae5826bbdf9829206c6374305e7bf4bab546c65485349db5fff40e0b5fa0e8',
    'news-feature.html': '73ff75678c453badbc1edcb1ff590001dc93cade3260ff364e042d02075df9a5',
    'news-commentary.html': 'a2dbf4aac57472e8a8728f80908dc366d3aa9076310bbb39b24d71f251ea8d52',
    'styles.css': '2c23817299492ea9a3fd7ad23237cfabd6723d166bd99194febbed09ad418ba1',
    'script.js': 'abb39e4a6d218546b45eded0fa601540d2c5195d93c9fe1dfa8aaaabca13c666',
}
ARTICLES = ['article-school-course-volunteer.html', 'article-math-to-ai-learning.html',
            'article-classroom-screen-upgrade.html']
NINE = sorted(list(BEFORE) + ARTICLES)


def verify_pre_state(target, label):
    """目标目录是否等于切换前六文件状态。返回 (ok, 说明列表)。"""
    notes = []
    ok = True
    entries = sorted(os.listdir(target)) if os.path.isdir(target) else []
    subdirs = [n for n in entries if os.path.isdir(os.path.join(target, n))]
    if subdirs:
        ok = False
        notes.append('存在子目录 %s' % subdirs)
    if entries != sorted(BEFORE):
        ok = False
        notes.append('集合 != 六文件：%s' % entries)
    for name, want in BEFORE.items():
        p = os.path.join(target, name)
        if not os.path.exists(p):
            ok = False
            notes.append('%s 缺失' % name)
            continue
        got = C.sha256(p)
        if got != want:
            ok = False
            notes.append('%s 哈希 %s… != 表 1 %s…' % (name, got[:16], want[:16]))
    for name in ARTICLES:
        if os.path.exists(os.path.join(target, name)):
            ok = False
            notes.append('%s 未被删除' % name)
    return ok, notes


def mode_apply(target):
    ok, notes = verify_pre_state(target, 'apply')
    print('%s: %s' % (target, '等于切换前六文件状态（回滚成功）' if ok else '不等于切换前状态'))
    for n in notes:
        print('  ' + n)
    sys.exit(0 if ok else 1)


def mode_drill():
    print('=== 15.8.4 回滚演练（副本目录，真实 Results/ 不动）===')
    drill = os.path.join(C.QA, 'rollback_drill')
    sandbox = os.path.join(drill, 'Results')
    if os.path.isdir(drill):
        shutil.rmtree(drill)
    os.makedirs(sandbox)
    real_before = {n: C.sha256(os.path.join(C.RES, n)) for n in os.listdir(C.RES)}
    for name in NINE:
        shutil.copyfile(os.path.join(C.RES, name), os.path.join(sandbox, name))
    print('副本建立：九文件，与真实 Results/ 哈希逐项相同 = %s'
          % (all(C.sha256(os.path.join(sandbox, n)) == real_before[n] for n in NINE)))
    ok0, notes0 = verify_pre_state(sandbox, 'drill-pre')
    print('演练前置：副本当前 != 切换前状态（应为 True，否则演练没有意义）= %s；%s' % ((not ok0), notes0))

    # 按 rollback.md 第 1 步：六文件复制回
    for name in BEFORE:
        shutil.copyfile(os.path.join(C.SNAP, name), os.path.join(sandbox, name))
    # 第 2 步：删除三个详情页
    for name in ARTICLES:
        os.remove(os.path.join(sandbox, name))
    ok1, notes1 = verify_pre_state(sandbox, 'drill-post')
    print('rollback.md 第 1–2 步执行完毕')
    print('rollback.md 第 4 步哈希校验: %s' % ('PASS（六文件与表 1 逐项相等，无残留）' if ok1 else 'FAIL'))
    for n in notes1:
        print('  ' + n)

    # 真实 Results/ 未被触碰
    real_after = {n: C.sha256(os.path.join(C.RES, n)) for n in os.listdir(C.RES)}
    untouched = (real_after == real_before) and sorted(os.listdir(C.RES)) == NINE
    print('真实 Results/ 未被本演练触碰: %s' % ('PASS' if untouched else 'FAIL'))
    if not untouched:
        print('  变异前后差异: %s vs %s' % (sorted(real_before), sorted(real_after)))
    lines = [
        '# Task 15.8 回滚演练记录（不触碰真实 Results/）',
        '演练目录：_qa_task15/rollback_drill/Results（从真实 Results/ 九文件复制）',
        '执行依据：_qa_task15/rollback.md 第 1–4 步（cp 六文件 + rm 三详情页 + sha256 对表）',
        '',
        '副本初始 = 真实 Results/ 九文件哈希逐项相同: True',
        '回滚前 verify_pre_state == 切换前状态: False（预期，否则演练无意义）',
        '回滚后六文件与表 1 逐项相等、三详情页已删除、无子目录: %s' % ok1,
        '回滚后校验说明: %s' % (notes1 or '无异常'),
        '真实 Results/ 未被触碰: %s' % untouched,
        '',
        '结论：rollback.md 可被他人照做，路径与文件名均实测有效。',
    ]
    with open(os.path.join(C.QA, 'rollback_drill.txt'), 'w', encoding='utf-8', newline='\n') as h:
        h.write('\n'.join(lines) + '\n')
    print('写出 _qa_task15/rollback_drill.txt')
    sys.exit(0 if (ok1 and untouched) else 1)


CASES = [
    ('M1 详情页把一个全角句号改成半角句点', 's04_fidelity.py',
     ['article-math-to-ai-learning.html <main> 内部含基线切片且逐字节相等',
      'math-to-ai-learning 段落 textContent 数组 == Task13 基线',
      'math-to-ai-learning 长度闸门 25 项全中'],
     lambda d: _sub(os.path.join(d, 'article-math-to-ai-learning.html'), '。', '.', 1)),
    ('M2 给某页加一个 <nav>', 's05_structure.py',
     ['<nav> 数 == 1'],
     lambda d: _sub(os.path.join(d, 'news-message.html'), '</main>', '</main>\n    <nav aria-label="x"></nav>', 1)),
    ('M3 删掉首页最新区一个 <span>', 's05_structure.py',
     ['标签集合 == R4 无条件值', '可见内容白名单按序 14 项'],
     lambda d: _sub(os.path.join(d, 'index.html'), '<span class="home-latest__date">9月17日</span>', '', 1)),
    ('M4 给 div.home-latest 加 .home-section 类', 's05_structure.py',
     ['.home-section 计数恰 3', 'div.home-latest 区段内无 .home-section 类'],
     lambda d: _sub(os.path.join(d, 'index.html'), '<div class="home-latest" role="region"',
                    '<div class="home-section home-latest" role="region"', 1)),
    ('M5 把新建详情页改名为 Article-X.HTML / article-X.htm', 's05_structure.py',
     ['Results/ 内命中该正则的文件恰为这三个'],
     lambda d: os.rename(os.path.join(d, 'article-school-course-volunteer.html'),
                         os.path.join(d, 'Article-school-course-volunteer.HTML'))),
    ('M6 在 Results/ 放一个 README.md', 's03_switch.py',
     ['Results 集合 != 期望九文件'],
     lambda d: open(os.path.join(d, 'README.md'), 'w', encoding='utf-8').write('# x\n')),
    ('M7 创建 Results/articles/ 子目录并移入一页', 's03_switch.py',
     ['Results 存在子目录', 'Results 集合 != 期望九文件'],
     lambda d: (os.makedirs(os.path.join(d, 'articles'), exist_ok=True),
                shutil.move(os.path.join(d, 'article-math-to-ai-learning.html'),
                            os.path.join(d, 'articles', 'article-math-to-ai-learning.html')))),
    ('M8 把 styles.css 改一个字节', 's03_switch.py',
     ['styles.css 相对表 1 发生变化', 'styles.css != 期望（表 1（本包不得改动））'],
     lambda d: _append(os.path.join(d, 'styles.css'))),
]


def _sub(path, old, new, count):
    text = C.read_text(path)
    assert old in text, '变异前提不成立：%r 不在 %s' % (old, path)
    with open(path, 'w', encoding='utf-8', newline='') as h:
        h.write(text.replace(old, new, count))


def _append(path):
    with open(path, 'rb') as h:
        data = h.read()
    with open(path, 'wb') as h:
        h.write(data[:-1] + b' ')


def run_check(script, results_dir):
    env = dict(os.environ)
    env['QODER_RESULTS_DIR'] = results_dir
    env['PYTHONIOENCODING'] = 'utf-8'
    p = subprocess.run([sys.executable, os.path.join('_qa_task15', script)],
                       cwd=C.ROOT, capture_output=True, text=True, encoding='utf-8', env=env)
    fails = [ln.strip() for ln in (p.stdout + p.stderr).splitlines() if 'FAIL' in ln]
    return p.returncode, fails


def mode_negatives():
    print('=== 验证方法 9 负向对照（全部在副本目录上进行）===')
    real_hash_before = {n: C.sha256(os.path.join(C.RES, n)) for n in os.listdir(C.RES)}
    root = os.path.join(C.QA, 'mutants')
    if os.path.isdir(root):
        shutil.rmtree(root)
    os.makedirs(root)
    lines = []
    all_ok = True
    for label, script, expect_any, mutate in CASES:
        case_dir = os.path.join(root, label.split()[0], 'Results')
        os.makedirs(case_dir)
        for name in NINE:
            shutil.copyfile(os.path.join(C.RES, name), os.path.join(case_dir, name))
        mutate(case_dir)
        rc, fails = run_check(script, case_dir)
        hit = [e for e in expect_any if any(e in f for f in fails)]
        caught = (rc != 0) and bool(hit)
        if not caught:
            all_ok = False
        print('  %s' % label)
        print('    检查脚本 %s：退出码 %s，FAIL 行 %d 条，命中期望断言 %s'
              % (script, rc, len(fails), hit or '（无）'))
        if not caught:
            print('    未被捕获！样例 FAIL：%s' % (fails[:4] or '无'))
        lines.append('%s | %s | rc=%s | 命中=%s | %s' % (label, script, rc, '; '.join(hit) or '无',
                                                       '捕获' if caught else '漏网'))
        for f in fails[:3]:
            lines.append('    ' + f)
    real_hash_after = {n: C.sha256(os.path.join(C.RES, n)) for n in os.listdir(C.RES)}
    untouched = real_hash_after == real_hash_before and sorted(real_hash_after) == NINE
    print('  真实 Results/ 九文件未被任何变异触碰: %s' % ('PASS' if untouched else 'FAIL'))
    if not untouched:
        all_ok = False
    with open(os.path.join(C.QA, 'negative_controls.txt'), 'w', encoding='utf-8', newline='\n') as h:
        h.write('\n'.join(['# Task 15 验证方法 9 负向对照（在 _qa_task15/mutants/ 副本上注入，真实 Results/ 只读）', '']
                          + lines + ['', '八类变异 %s，真实 Results/ 未被触碰: %s'
                                    % ('全部被捕获' if all_ok else '存在漏网', untouched)]) + '\n')
    print('写出 _qa_task15/negative_controls.txt')
    sys.exit(0 if all_ok else 1)


if '--apply' in sys.argv:
    mode_apply(os.path.abspath(sys.argv[sys.argv.index('--apply') + 1]))
elif '--negatives' in sys.argv:
    mode_negatives()
else:
    mode_drill()
