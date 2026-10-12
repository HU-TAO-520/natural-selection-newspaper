/* Task 18.2 — 快照探针入口（只读）
 * 用法：node _qa_task18/probe_task18.mjs [结果目录] [输出事实文件]
 * 默认：Results → _qa_task18/facts.json
 * 页遍历清单来自 deploy/manifest.json 的 HTML 子集（数量 == counts.html），不扫目录。
 * 完成条件（18.2）：同一目录跑两次，除 __meta 外的字节一致；__meta 哈希与磁盘实测一致。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBrowser18, buildMeta } from './probe_lib18.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

const DIR = path.resolve(process.argv[2] || process.env.QODER_RESULTS_DIR || path.join(ROOT, 'Results'));
const OUT = path.resolve(process.argv[3] || process.env.QODER_FACTS || path.join(HERE, 'facts.json'));
const MANIFEST = process.env.QODER_MANIFEST || path.join(ROOT, 'deploy', 'manifest.json');

const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
/* 普通页继续走 file:// 快照；线上专用 404.html 由 Task 19 的 HTTP fixture 单独绑定哈希。 */
const HTTP_ONLY = new Set(['404.html']);
const pages = (process.env.QODER_PAGES ? String(process.env.QODER_PAGES).split(',').map((s) => s.trim()).filter(Boolean)
  : m.pages.filter((p) => p.path.endsWith('.html') && !HTTP_ONLY.has(p.path)).map((p) => p.path).sort());
const offlineHtmlCount = m.pages.filter((p) => p.path.endsWith('.html') && !HTTP_ONLY.has(p.path)).length;
if (pages.length !== offlineHtmlCount && !process.env.QODER_PAGES) {
  process.stderr.write(`探针拒绝执行：file:// 普通页数 ${offlineHtmlCount} 与探针页数 ${pages.length} 不符\n`);
  process.exit(1);
}

const port = Number(process.env.QODER_CDP_PORT || 9348);
let browser, facts, probeError = null;
try {
  browser = await openBrowser18(port);
  facts = {};
  for (const page of pages) {
    for (let attempt = 1; ; attempt++) {
      try { facts[page] = await browser.snapOne(DIR, page); break; }
      catch (e) { if (attempt >= 3) throw e; await new Promise((r) => setTimeout(r, 400 * attempt)); }
    }
    process.stderr.write(`探测 ${page} (${facts[page].file})\n`);
  }
} catch (error) {
  probeError = String((error && (error.stack || error.message)) || error).slice(0, 1000);
} finally { if (browser) browser.close(); }

const meta = buildMeta(DIR, pages, { node: process.version, probePort: port });
if (probeError) meta.browserError = probeError;
const out = { __meta: meta, ...(facts || {}) };
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n', 'utf8');
if (probeError) {
  process.stderr.write('浏览器探针失败；仅写入文件哈希绑定和明确错误，不伪造 DOM 事实：' + probeError + '\n');
  process.exitCode = 2;
} else process.stdout.write(`快照已写入 ${path.relative(ROOT, OUT)}：${pages.length} 页，__meta.perPageSha256 已绑定\n`);
