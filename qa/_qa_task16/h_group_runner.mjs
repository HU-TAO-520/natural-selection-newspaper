/* Task 16.6.4：复用 _qa_task10/verify_task10.mjs 的 H 组（断言代码逐字取自原文件，不重写、不放宽）
 * 原脚本在 v2 七页结构上会于 E/F 组崩溃（Task 15 报告 §7 已登记），因此这里把
 * 「导入与数据声明 + H 组整段」按行切出来单独运行，其余组不参与本包的差分。
 * 唯一允许的文本改动：把 PAGES 常量换成 H_PAGES 环境变量给定的页集合（四页口径 → 七页口径），
 * 断言本身一条不减。输出：逐条 PASS/FAIL 行 + 末尾汇总，供失败集合差分使用。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const ORIG = path.join(ROOT, '_qa_task10', 'verify_task10.mjs');
const lines = fs.readFileSync(ORIG, 'utf8').split('\n');
const find = (pred, from = 0) => { const i = lines.slice(from).findIndex(pred); if (i < 0) throw new Error('切片锚点缺失'); return from + i; };

const iCssVars = find((l) => l.startsWith('const CSS_VARS'));
const iFiles = find((l) => l.startsWith('const files = entries'), iCssVars);
const iH = find((l) => l.includes('H. styles.css 静态合同'));
const iI = find((l) => l.includes('I. script.js 静态合同'), iH);

let head = lines.slice(0, iCssVars).join('\n');
if (process.env.H_PAGES) {
  const before = head;
  head = head.replace(/const PAGES = \[[^\]]*\];/, 'const PAGES = [' + process.env.H_PAGES.split(',').map((s) => JSON.stringify(s.trim())).join(', ') + '];');
  if (head === before) throw new Error('PAGES 常量未按 H_PAGES 改写，切片锚点失效');
}
const decls = lines.slice(iCssVars, iFiles + 1).join('\n');
const hblock = lines.slice(iH, iI).join('\n');
const epilogue = String.raw`
const bad = rows.filter((r) => r.st === 'FAIL');
const out = rows.map((r) => r.st + ' ' + r.id + ' | ' + r.loc + (r.st === 'FAIL' ? ' | 期望: ' + r.exp + ' | 实际: ' + r.act : '')).join('\n');
fs.writeFileSync(process.env.QODER_REPORT || 'h_rows.txt', out + '\nH 组行数=' + rows.length + ' 标签数=' + new Set(rows.map(r => r.id)).size + ' FAIL=' + bad.length + '\n');
process.stdout.write(out + '\nH 组行数=' + rows.length + ' 标签数=' + new Set(rows.map(r => r.id)).size + ' FAIL=' + bad.length + '\n');
`;

const tmp = path.join(HERE, '_h_group_extract.mjs');
fs.writeFileSync(tmp, head + '\n' + decls + '\n' + hblock + '\n' + epilogue, 'utf8');

const env = {
  ...process.env,
  QODER_RESULTS_DIR: process.env.QODER_RESULTS_DIR || path.join(ROOT, 'Results'),
  QODER_FACTS: process.env.QODER_FACTS || path.join(HERE, 'dom_facts_task16.json'),
  QODER_REPORT: process.env.QODER_REPORT || path.join(HERE, 'h_rows.txt'),
};
const r = spawnSync(process.execPath, [tmp], { env, encoding: 'utf8', cwd: ROOT });
process.stdout.write(r.stdout || '');
if (r.stderr) process.stderr.write('[stderr] ' + r.stderr.slice(0, 800) + '\n');
process.exit(r.status === 0 || r.status === 1 ? 0 : r.status);
