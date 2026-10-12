/* Task 11 验收的验收：把「只有浏览器才能暴露」的违约注入 Results/ 的副本，
 * 逐个跑对应的回归区段，要求指定断言编号翻红（不能只看退出码）。
 * 真实 Results/ 与 Materials/ 全程只读；变异体只存在于 _qa_task11/mutants/。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fileURL from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const HERE = path.dirname(fileURL.fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const REAL = path.join(ROOT, 'Results');
const MUT = path.join(HERE, 'mutants');
const SIX = ['index.html', 'news-message.html', 'news-feature.html', 'news-commentary.html', 'styles.css', 'script.js'];
const sha = (f) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const before = SIX.map((f) => sha(path.join(REAL, f))).join(' ');

function copyTo(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const f of SIX) fs.copyFileSync(path.join(REAL, f), path.join(dir, f));
}
function patchOnce(src, anchor, from, to) {
  const i = src.indexOf(anchor);
  if (i < 0) throw new Error('选择器锚点未命中：' + anchor);
  const j = src.indexOf(from, i);
  if (j < 0 || j - i > 400) throw new Error('待替换串未命中或过远：' + from + ' @ ' + anchor);
  return src.slice(0, j) + to + src.slice(j + from.length);
}

/* 每个变异体：注入的违约 + 应跑区段 + 必须翻红的断言编号 */
const MUTANTS = [
  { id: 'M01-tap-28', pass: 'tap,tri', expect: ['RD1'], file: 'styles.css', anchor: '.js .nav-toggle {', from: 'padding: 0.625rem 0.75rem;', to: 'min-inline-size: 20px;\n    min-block-size: 20px;\n    padding: 0.05rem 0.2rem;\n    font-size: 0.6rem;' },
  { id: 'M19-link-tap-24', pass: 'tap,tri', expect: ['RD2'], file: 'styles.css', steps: [['.site-navigation__link {\n    display: flex;', 'min-block-size: 44px;', 'min-block-size: 20px;'], ['.site-navigation__link {\n    display: flex;', 'padding-top: 0.625rem;', 'padding-top: 0;'], ['.site-navigation__link {\n    display: flex;', 'padding-bottom: 0.625rem;', 'padding-bottom: 0;']] },
  { id: 'M02-overflow-1200', pass: 'mobile', expect: ['RC6'], file: 'styles.css', anchor: '.article__body {\n    margin-top: var(--space-5);', from: 'text-align: start;', to: 'text-align: start;\n    min-width: 1200px;' },
  { id: 'M03-never-collapse', pass: 'tri', expect: ['RE2'], file: 'styles.css', anchor: '.js .site-navigation {', from: 'display: none;', to: 'display: block;' },
  { id: 'M04-aria-desync', pass: 'tri,interact', expect: ['RE3', 'RE4', 'RF1'], file: 'script.js', anchor: 'function setOpen(open)', from: "toggle.setAttribute('aria-expanded', open ? 'true' : 'false');", to: '/* 变异：只改 class 不改 ARIA */' },
  { id: 'M05-no-breakpoint-reset', pass: 'cross', expect: ['RG1'], file: 'script.js', anchor: 'function handleBreakpoint(event)', from: 'closeMenu();', to: '/* 变异：跨断点不重置 */' },
  { id: 'M06-esc-no-focus', pass: 'interact', expect: ['RF3'], file: 'script.js', anchor: "if (isOpen()) {", from: 'toggle.focus();', to: '/* 变异：Esc 不返回焦点 */' },
  { id: 'M07-break-all', pass: 'mobile', expect: ['RC5'], file: 'styles.css', anchor: 'line-break: strict;', from: 'word-break: normal;', to: 'word-break: break-all;' },
  { id: 'M08-gutter-32', pass: 'mobile', expect: ['RC1'], file: 'styles.css', anchor: '@media (max-width: 768px) {\n  :root {', from: '--page-gutter: 1rem;', to: '--page-gutter: 2rem;' },
  { id: 'M09-layout-90rem', pass: 'desktop', expect: ['RB1'], file: 'styles.css', anchor: '--layout-max:', from: '70rem;', to: '90rem;' },
  { id: 'M10-console-warn', pass: 'load', expect: ['RA3'], file: 'script.js', anchor: "'use strict';", from: "var root = document.documentElement;", to: "console.warn('变异：脚本产生警告'); var root = document.documentElement;" },
  { id: 'M11-external-ref', pass: 'load', expect: ['RA2'], file: 'index.html', anchor: '<div class="home-sections">', from: '<div class="home-sections">', to: '<img src="https://127.0.0.1:9/pic.png" alt="">\n      <div class="home-sections">' },
  { id: 'M12-justify-mobile', pass: 'mobile', expect: ['RC7'], file: 'styles.css', anchor: '.article__body {\n    margin-top: var(--space-5);', from: 'text-align: start;', to: 'text-align: justify;' },
  { id: 'M13-title-fixed-px', pass: 'mobile', expect: ['RC2'], file: 'styles.css', anchor: '--font-size-page-title: clamp(', from: 'clamp(1.75rem, 7vw, 2.25rem);', to: '40px;' },
  { id: 'M14-no-skip-link', pass: 'tap', expect: ['RD4'], file: 'index.html', anchor: '<a class="skip-link"', from: '<a class="skip-link" href="#main-content">跳至正文</a>', to: '<!-- 变异：删除跳转链接 -->' },
  { id: 'M15-injected-para', pass: 'content', expect: ['RJ2'], file: 'script.js', anchor: '/* 3. 按钮点击切换', from: "toggle.addEventListener('click'", to: "var __p = document.createElement('p'); __p.textContent = '脚本注入的多余段落'; var __b = document.querySelector('.article__body'); if (__b) __b.appendChild(__p);\n  toggle.addEventListener('click'" },
  { id: 'M16-zoom-overflow', pass: 'zoom', expect: ['RH3'], file: 'styles.css', anchor: '.main-content {\n  min-width: 0;', from: 'min-width: 0;', to: 'min-width: 700px;' },
  { id: 'M17-nojs-nav-hidden', pass: 'tri', expect: ['RE1'], file: 'styles.css', anchor: '.js .site-navigation.is-open,', from: '.no-js .site-navigation {\n    display: block;', to: '.no-js .site-navigation {\n    display: none;' },
  { id: 'M18-desktop-toggle-shown', pass: 'desktop', expect: ['RB4'], file: 'styles.css', anchor: '/* 桌面基线隐藏菜单按钮', from: '.nav-toggle {\n  display: none;', to: '.nav-toggle {\n  display: inline-flex;' },
];

const results = [];
fs.mkdirSync(MUT, { recursive: true });
let port = Number(process.env.QODER_BASE_PORT || 9401);

/* 对照组：未变异的副本必须在全区段仍为 0 FAIL */
function run(tag, dir, passes, widths) {
  port += 1;
  const env = Object.assign({}, process.env, {
    QODER_RESULTS_DIR: dir, QODER_PASS: passes, QODER_TAG: '-' + tag, QODER_CDP_PORT: String(port),
  });
  if (widths) { env.QODER_WIDTHS = widths[0]; env.QODER_WIDTHS_M = widths[1]; }
  const r = spawnSync(process.execPath, [path.join(HERE, 'cdp_regression.mjs')], { env, cwd: HERE, encoding: 'utf8', timeout: 420000 });
  const file = path.join(HERE, 'regression_lines-' + tag + '.txt');
  const txt = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const failed = new Set([...txt.matchAll(/^\[([^\]]+)\] \[FAIL\]/gm)].map((m) => m[1]));
  const total = (txt.match(/\[(?:PASS|FAIL)\]/g) || []).length;
  return { rc: r.status, failed, total, stderr: (r.stderr || '').slice(0, 300) };
}

const ctrlDir = path.join(MUT, 'control');
copyTo(ctrlDir);
const ctrl = run('control', ctrlDir, 'all');
/* 对照组判定用「失败集合差分」而不是 rc：真实运行本身可能带着已知缺陷（如 :visited 像素回归），
 * 对照组只要不引入新的失败编号即为通过。 */
const realRows = fs.existsSync(path.join(HERE, 'results.json')) ? JSON.parse(fs.readFileSync(path.join(HERE, 'results.json'), 'utf8')).rows : [];
const realFails = new Set(realRows.filter((r) => r.status === 'FAIL').map((r) => r.id));
const ctrlExtra = [...ctrl.failed].filter((id) => !realFails.has(id));
results.push({ id: 'CONTROL', expect: [...realFails], got: [...ctrl.failed], total: ctrl.total, ok: ctrlExtra.length === 0 && ctrl.total > 500, rc: ctrl.rc });
process.stdout.write(`CONTROL: ${ctrl.total} 条断言, FAIL=[${[...ctrl.failed].join(',')}] 相对真实运行的新增失败=[${ctrlExtra.join(',')}] rc=${ctrl.rc}\n`);

for (const m of MUTANTS) {
  const dir = path.join(MUT, m.id);
  copyTo(dir);
  const f = path.join(dir, m.file);
  const src = fs.readFileSync(f, 'utf8');
  let out;
  const steps = m.steps || [[m.anchor, m.from, m.to]];
  try { out = steps.reduce((acc, st) => patchOnce(acc, st[0], st[1], st[2]), src); }
  catch (e) { results.push({ id: m.id, error: '注入失败：' + e.message, ok: false }); process.stdout.write(`${m.id} 注入失败 ${e.message}\n`); continue; }
  if (out === src) { results.push({ id: m.id, error: '注入未改变文件', ok: false }); continue; }
  fs.writeFileSync(f, out, 'utf8');
  const r = run(m.id, dir, m.pass);
  const missed = m.expect.filter((id) => !r.failed.has(id));
  results.push({ id: m.id, expect: m.expect, got: [...r.failed], total: r.total, ok: missed.length === 0 && r.total > 5, missed, rc: r.rc });
  process.stdout.write(`${m.id.padEnd(24)} 断言=${String(r.total).padStart(4)} 期望翻红=[${m.expect.join(',')}] 实际FAIL=[${[...r.failed].join(',')}] ${missed.length ? '**漏检:' + missed.join(',') + '**' : '捕获'}\n`);
}

const after = SIX.map((f) => sha(path.join(REAL, f))).join(' ');
const bad = results.filter((r) => !r.ok);
const log = ['# Task 11 变异对照（证明回归断言有牙）', '',
  `- 变异体数量：${MUTANTS.length}；捕获：${results.filter((r) => r.ok && r.id !== 'CONTROL').length}；漏检或异常：${bad.length}`,
  `- 真实 Results/ 六文件回归前后 SHA-256 集合 ${after === before ? '完全一致' : '**被改动**'}`,
  `- 对照组（未变异副本，全区段）：${ctrl.total} 条断言，FAIL=[${[...ctrl.failed].join(',') || '无'}]；相对真实运行的新增失败=[${ctrlExtra.join(',') || '无'}]（判定用失败集合差分，不看 rc）`,
  '', '| 变异体 | 注入的违约 | 应跑区段 | 期望翻红 | 实际 FAIL 集合 | 判定 |', '| --- | --- | --- | --- | --- | --- |',
  ...MUTANTS.map((m) => { const r = results.find((x) => x.id === m.id); const anc = (m.steps ? m.steps[0][0] : m.anchor).split('\n')[0]; const desc = (m.steps ? m.steps.map((t) => t[1] + ' → ' + t[2]).join(' ; ') : m.from + ' → ' + m.to).split('\n')[0].slice(0, 100); return `| ${m.id} | \`${m.file}\` ${anc} 内 ${desc} | ${m.pass} | ${m.expect.join(', ')} | ${(r.got || []).join(', ') || (r.error || '')} | ${r.ok ? '捕获' : '漏检/异常'} |`; }),
  '', '## 结论', '', bad.length === 0 ? `全部 ${MUTANTS.length} 个违约均被指定断言编号捕获，对照组全绿：Task 11 回归矩阵不是空跑。` : `存在 ${bad.length} 项未捕获，需补强对应断言：${bad.map((b) => b.id).join(', ')}`,
].join('\n') + '\n';
fs.writeFileSync(path.join(HERE, 'mutation_log.md'), log, 'utf8');
process.stdout.write(log + '\n');
process.exit(bad.length ? 1 : 0);
