#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Task 16.9 变异对照：向 Results/ 的副本注入 14 类违约，要求"指定断言"翻红。
每条变异先自证"确实构成违约"（文本层 + 需要时的渲染层），否则不得计入捕获。
真实 Results/ 只读：全部前后重算九文件哈希并比对 _qa_task15/hashes_after.txt。
"""
import hashlib
import io
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
MUT_ROOT = os.path.join(HERE, 'mutants')
RESULTS = os.path.join(ROOT, 'Results')
GOOD = io.open(os.path.join(RESULTS, 'styles.css'), encoding='utf-8').read()
PAGES4 = ['index.html', 'news-message.html', 'news-feature.html', 'news-commentary.html']
PORT = [9551]


def run(cmd, env=None):
    e = dict(os.environ)
    e['PYTHONIOENCODING'] = 'utf-8'
    if env:
        e.update(env)
    return subprocess.run(cmd, cwd=ROOT, env=e, capture_output=True, text=True, encoding='utf-8', errors='replace')


def build(mid, css_text):
    d = os.path.join(MUT_ROOT, mid)
    if os.path.isdir(d):
        shutil.rmtree(d)
    os.makedirs(d)
    for f in os.listdir(RESULTS):
        shutil.copyfile(os.path.join(RESULTS, f), os.path.join(d, f))
    with io.open(os.path.join(d, 'styles.css'), 'w', encoding='utf-8', newline='') as f:
        f.write(css_text)
    return d


def static_fails(d):
    out = os.path.join(HERE, 'verify_%s.txt' % os.path.basename(d))
    r = run(['python', os.path.join(HERE, 'verify_css16.py'), '--css', os.path.join(d, 'styles.css'),
             '--results', d, '--out', out])
    ids = set()
    if os.path.exists(out):
        for line in io.open(out, encoding='utf-8'):
            if line.startswith('FAIL '):
                ids.add(line.split()[1])
    else:
        ids.add('VERIFY-CRASH-rc%d' % r.returncode)
    return ids, r.returncode, out


def h_fails(d, tag, pages=None):
    pages = pages or PAGES4
    facts = os.path.join(HERE, 'dom_facts_%s.json' % tag)
    rep = os.path.join(HERE, 'h_rows_%s.txt' % tag)
    PORT[0] += 1
    p1 = run(['node', os.path.join(HERE, 'dom_facts_probe.mjs')],
             {'QODER_RESULTS_DIR': d, 'QODER_FACTS_OUT': facts, 'H_PAGES': ','.join(pages), 'H_PORT': str(PORT[0])})
    p2 = run(['node', os.path.join(HERE, 'h_group_runner.mjs')],
             {'QODER_RESULTS_DIR': d, 'QODER_FACTS': facts, 'QODER_REPORT': rep})
    ids = set()
    if os.path.exists(rep):
        for line in io.open(rep, encoding='utf-8'):
            if line.startswith('FAIL '):
                ids.add(line.split()[1])
    return ids, (p1.returncode, p2.returncode)


def browser_fails(d, tag, need_shots=False):
    PORT[0] += 1
    cmd = ['node', os.path.join(HERE, 'cdp_probe.mjs'), '--dir', os.path.relpath(d, ROOT), '--tag', tag, '--port', str(PORT[0])]
    if not need_shots:
        cmd.append('--skip-shots')
    run(cmd)
    lines = os.path.join(HERE, 'cdp_lines_%s.txt' % tag)
    ids, detail = set(), []
    if os.path.exists(lines):
        for line in io.open(lines, encoding='utf-8'):
            if line.startswith('FAIL '):
                ids.add(line.split()[1].split('/')[0] + '/' + line.split()[1].split('/')[1] if line.split()[1].count('/') > 0 else line.split()[1])
                detail.append(line.strip())
    return ids, detail


def sub(txt, old, new, count=1):
    assert old in txt, '锚点缺失：' + old[:60]
    return txt.replace(old, new, count)


def drop_block(txt, sel):
    pat = re.compile(r'\n*' + re.escape(sel) + r'\s*\{[^}]*\}')
    out, n = pat.subn('', txt, count=1)
    assert n == 1, '规则块未删成：' + sel
    return out


BANNER = '/* ============================================================\n   Task 8：移动端布局覆盖（视口宽度 ≤ 768px）'
MEDIA_TAIL = '  .article__body {\n    margin-top: var(--space-5);\n    text-align: start;\n    text-justify: auto;\n  }\n}'

MUTS = []


def mut(mid, title, fn, self_proof, expect, browser=False, note=''):
    MUTS.append(dict(id=mid, title=title, fn=fn, proof=self_proof, expect=expect, browser=browser, note=note))


# 1 删掉 .entry-list__link:visited
mut('m01', '删掉 .entry-list__link:visited（H13 静态面 + 像素面）',
    lambda t: drop_block(t, '.entry-list__link:visited'),
    lambda d, t: ('.entry-list__link:visited' not in t, '伴生规则已从文件中消失'),
    {'S4/H13'}, browser=True,
    note='像素面判据：全局 a:visited 把已访问标题重绘为 --color-accent（暗红），故红项是 accent 分类而非 UA 紫')
# 2 :visited 色值改成 accent
mut('m02', '把 .entry-list__link:visited 的色值改成 --color-accent（配对值不等）',
    lambda t: sub(t, '.entry-list__link:visited {\n  color: var(--color-ink);\n}',
                  '.entry-list__link:visited {\n  color: var(--color-accent);\n}'),
    lambda d, t: ('.entry-list__link:visited {\n  color: var(--color-accent);\n}' in t, '两侧色值确实不等'),
    {'S4/H13'}, browser=False)
# 3 新增页面专属类
mut('m03', '新增页面专属类 .feature-list（H11 与本包类集合禁令）',
    lambda t: sub(t, '\n' + BANNER, '\n.feature-list {\n  list-style: none;\n}\n\n' + BANNER),
    lambda d, t: ('.feature-list' in t and '.feature-list' not in io.open(os.path.join(d, 'news-feature.html'), encoding='utf-8').read(),
                  'CSS 出现 .feature-list 而任何页面 DOM 都没有它'),
    {'S2/selectors', 'S2/class-whitelist', 'H11'})
# 4 新变量
mut('m04', '在移动 :root 里新增 --font-size-list（第二套主题变量）',
    lambda t: sub(t, '@media (max-width: 768px) {\n  :root {\n',
                  '@media (max-width: 768px) {\n  :root {\n    --font-size-list: 1.05rem;\n'),
    lambda d, t: ('--font-size-list: 1.05rem' in t, '移动 :root 内确实多出一条表外变量'),
    {'S3/novar', 'S3/var-whitelist', 'H11'})
# 5 ID 选择器
mut('m05', '用 #latest-title 设样式（ID 选择器）',
    lambda t: sub(t, '\n' + BANNER, '\n#latest-title {\n  color: var(--color-accent);\n}\n\n' + BANNER),
    lambda d, t: ('#latest-title' in t, '新规则区确实含 ID 选择器'),
    {'S5/banned', 'H5/id'})
# 6 content 注入
mut('m06', 'content: "·" 注入分隔点（H10 与本包双重禁止）',
    lambda t: sub(t, '\n' + BANNER, '\n.entry-list__link::after {\n  content: "\\00B7";\n}\n\n' + BANNER),
    lambda d, t: ('content: "\\00B7"' in t, '确实注入了可见字形'),
    {'S5/banned', 'S2/selectors'},
    note='v1 的 H10 只禁中文 content，"·" 不命中；本包的 S5/banned 命中——此口径差已写入交接')
# 7 桌面新规则整体移进 @media
def m07(t):
    i = t.index('/* ---------- 9.')
    j = t.index(BANNER)
    block = t[i:j]
    t2 = (t[:i] + t[j:]).rstrip('\n')
    k = t2.rfind('}')  # 唯一 @media 块的闭合 brace
    assert t2.count('@media') == 1 and k > t2.index('@media'), 'm07 锚点失效'
    return t2[:k] + block.rstrip() + '\n\n' + t2[k:] + '\n'


mut('m07', '把桌面新规则整体移进 @media 内部（插入位置合同/H8 语义）', m07,
    lambda d, t: (t.index('/* ---------- 9.') > t.index('@media (max-width: 768px)'), '新规则确实在 @media 之后'),
    {'S2/desktop-rules', 'S1/two-zones', 'S6/media'})
# 8 第二个媒体块
mut('m08', '复制一份 @media (max-width: 769px)（H8/H8/other）',
    lambda t: t + '\n@media (max-width: 769px) {\n  .entry-list {\n    margin-top: var(--space-6);\n  }\n}\n',
    lambda d, t: (t.count('@media') == 2 and '769px' in t, '确实出现第二个媒体块且断点误写'),
    {'S6/media', 'S6/breakpoint', 'H8', 'H8/other'})
# 9 触控两维同改为 28px 并压掉 padding（须实测 <44 才算有效变异）
mut('m09', 'min-block-size/min-inline-size 同改 28px 且 padding-block 压到 0、gap 归零',
    lambda t: sub(t, '    gap: var(--space-1);\n    min-block-size: 44px;\n    min-inline-size: 44px;\n    padding-block: var(--space-3);\n',
                  '    gap: 0;\n    min-block-size: 28px;\n    min-inline-size: 28px;\n    padding-block: 0;\n'),
    lambda d, t: ('min-block-size: 28px' in t and 'padding-block: 0' in t, '声明与 padding 同时被压，等待渲染层自证'),
    {'S8/mobile-44', 'B/touch'}, browser=True)
# 9b 只改宽度的分支
mut('m09b', '只压宽度：min-inline-size 与 inline-size 同改 20px，高度维持 ≥44',
    lambda t: sub(t, '    min-block-size: 44px;\n    min-inline-size: 44px;\n',
                  '    min-block-size: 44px;\n    min-inline-size: 20px;\n    inline-size: 20px;\n'),
    lambda d, t: ('inline-size: 20px' in t and 'min-inline-size: 20px' in t, '渲染宽度将被压到 20px，而 min-block-size 仍 44（等待渲染层自证）'),
    {'S8/mobile-44', 'B/touch'}, browser=True,
    note='合同设想的"只改 min-inline-size 而高度不变"若不同时钉死 inline-size 不构成有效变异（块级铺满使宽度仍 ≥44，实测已证），故按 §变异自证 规则加 inline-size 把宽度钉小')
# 10 overflow-wrap → word-break: break-all
mut('m10', 'overflow-wrap: anywhere 改成 word-break: break-all（H9）',
    lambda t: sub(t, '    min-width: 0;\n    overflow-wrap: anywhere;\n    word-break: normal;\n    hyphens: none;\n  }\n\n  /* ---------- 归档列表与首页最新区（Task 16 移动端追加） ---------- */',
                  '    min-width: 0;\n    overflow-wrap: anywhere;\n    word-break: normal;\n    hyphens: none;\n  }\n\n  /* ---------- 归档列表与首页最新区（Task 16 移动端追加） ---------- */',
                  ),
    lambda d, t: (True, ''),
    {'S5/banned', 'H9'})
# 11 改一行既有 .home-section 的 padding-block（污染既有区）
mut('m11', '把既有 .home-section 的 padding-block 从 --space-5 改成 --space-4（改写既有区）',
    lambda t: sub(t, '.home-section {\n  padding-block: var(--space-5);', '.home-section {\n  padding-block: var(--space-4);'),
    lambda d, t: ('.home-section {\n  padding-block: var(--space-4);' in t, '既有第 7 分区被就地改写'),
    {'S1/only-add'})
# 12 !important
mut('m12', '给新规则加 !important（H5/important）',
    lambda t: sub(t, '.entry-list__title {\n  flex: 1 1 auto;\n  font-size: var(--font-size-reading);',
                  '.entry-list__title {\n  flex: 1 1 auto;\n  font-size: var(--font-size-reading) !important;'),
    lambda d, t: ('!important' in t, '确实出现 !important'),
    {'S5/banned', 'H5/important'})
# 13 transition
mut('m13', '给链接加 transition: color .2s（本包禁止清单）',
    lambda t: sub(t, '.entry-list__link {\n  display: flex;', '.entry-list__link {\n  transition: color .2s;\n  display: flex;'),
    lambda d, t: ('transition: color .2s' in t, '确实出现 transition'),
    {'S5/banned'})
# 14 删掉 .entry-list__date 的全部规则（死规则反向）
mut('m14', '删掉 .entry-list__date 的全部 CSS 规则（H14 规则在场半项，无条件红）',
    lambda t: drop_block(t, '.entry-list__date'),
    lambda d, t: ('.entry-list__date' not in t and 'class="entry-list__date"' in io.open(os.path.join(d, 'news-message.html'), encoding='utf-8').read(),
                  'CSS 规则被删光而 DOM 节点仍在输出'),
    {'S2/desktop-rules'})

# m10 需要一个真实的双替换：把新区的 overflow-wrap 改掉
MUTS[10] = dict(id='m10', title='overflow-wrap: anywhere 保持，word-break: normal 改成 break-all（H9）',
               fn=lambda t: sub(t, '  .entry-list__title,\n  .home-latest__entry {\n    min-width: 0;\n    overflow-wrap: anywhere;\n    word-break: normal;\n    hyphens: none;\n  }',
                                '  .entry-list__title,\n  .home-latest__entry {\n    min-width: 0;\n    overflow-wrap: anywhere;\n    word-break: break-all;\n    hyphens: none;\n  }'),
               proof=lambda d, t: ('word-break: break-all' in t, '移动块内确实出现被禁的 break-all'),
               expect={'S5/banned', 'H9'}, browser=False, note='')


def main():
    if os.path.isdir(MUT_ROOT):
        shutil.rmtree(MUT_ROOT)
    os.makedirs(MUT_ROOT)
    pre = {f: hashlib.sha256(open(os.path.join(RESULTS, f), 'rb').read()).hexdigest() for f in sorted(os.listdir(RESULTS))}
    lines = ['# Task 16.9 变异对照（全部注入 _qa_task16/mutants/ 副本，真实 Results/ 只读）', '']
    uncaptured = []
    for m in MUTS:
        mid = m['id']
        try:
            css = m['fn'](GOOD)
        except Exception as e:
            lines.append('## %s %s\n  构造失败：%r\n' % (mid, m['title'], e))
            uncaptured.append(mid + ' 构造失败')
            continue
        d = build(mid, css)
        okp, why = m['proof'](d, css)
        sf, src, sfile = static_fails(d)
        hf, hrc = h_fails(d, mid)
        bf, bdetail = (set(), []) if not m['browser'] else browser_fails(d, mid)
        got = set(sf) | set(hf) | set(bf)
        exp_static = {e for e in m['expect'] if not e.startswith(('E/', 'B/'))}
        exp_browser = {e for e in m['expect'] if e.startswith(('E/', 'B/'))}
        miss_static = sorted(exp_static - got)
        miss_browser = sorted(exp_browser - bf) if exp_browser else []
        ok = okp and not miss_static and not miss_browser
        if not ok:
            uncaptured.append(mid)
        lines.append('## %s — %s' % (mid, m['title']))
        lines.append('  自证有效：%s（%s）' % ('是' if okp else '否', why))
        lines.append('  指定断言：%s' % ','.join(sorted(m['expect'])))
        lines.append('  静态实际红项：%s' % (','.join(sorted(sf)) or '无'))
        lines.append('  H 组实际红项：%s' % (','.join(sorted(hf)) or '无'))
        if exp_browser:
            lines.append('  浏览器实际红项：%s' % (','.join(sorted(bf)) or '无'))
            for x in bdetail[:6]:
                lines.append('    ' + x[:400])
        lines.append('  未命中：%s' % (','.join(miss_static + miss_browser) or '无'))
        lines.append('  判定：%s' % ('捕获' if ok else '未捕获'))
        lines.append('  备注：%s' % (m.get('note') or '—'))
        lines.append('  （verify rc=%d，H 组 rc=%s）' % (src, hrc))
        lines.append('')
    post = {f: hashlib.sha256(open(os.path.join(RESULTS, f), 'rb').read()).hexdigest() for f in sorted(os.listdir(RESULTS))}
    lines.append('## 真实 Results/ 未被触碰')
    lines.append('  前后九文件哈希一致：%s' % (pre == post))
    base = {}
    for line in io.open(os.path.join(ROOT, '_qa_task15', 'hashes_after.txt'), encoding='utf-8'):
        if line.startswith('#') or not line.strip():
            continue
        parts = line.split('\t')
        base[os.path.basename(parts[0])] = parts[1]
    drift = [f for f, h in post.items() if f != 'styles.css' and base.get(f) != h]
    lines.append('  除 styles.css 外八项等于 _qa_task15/hashes_after.txt：%s（漂移：%s）' % (not drift, ','.join(drift) or '无'))
    lines.append('')
    lines.append('## 结论：%d 类变异，捕获 %d，未捕获 %d' % (len(MUTS), len(MUTS) - len(uncaptured), len(uncaptured)))
    lines.append('  未捕获清单：%s' % (','.join(uncaptured) or '无'))
    txt = '\n'.join(lines) + '\n'
    with io.open(os.path.join(HERE, 'mutation_log.txt'), 'w', encoding='utf-8', newline='') as f:
        f.write(txt)
    sys.stdout.buffer.write(txt.encode('utf-8', 'replace'))
    return 1 if uncaptured or pre != post else 0


if __name__ == '__main__':
    sys.exit(main())
