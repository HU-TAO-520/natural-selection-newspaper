/* Task 19 — 一致性核对：QODER_PASS=all 与逐段跑的断言集合差必须为空
 *
 * 这是"分段不遗漏也不重复计"的唯一证据：分段跑各自只出一段结论，
 * 若某段在 all 模式里被跳过或被合并，差集就会露出来。
 * 键 = 判据 ID + 页 + 视口 + 判据文字（集合语义，不按条数比）。
 *
 * 运行：node _qa_task19/consistency19.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPORT_DIR } from './contract19.mjs';
const OUT_DIR = REPORT_DIR;

const keyOf = (r) => [r.id, r.page, r.width, r.step].join('§');
const load = (f) => { const j = JSON.parse(fs.readFileSync(path.join(OUT_DIR, f), 'utf8')); return j.rows || []; };
/* RZ12（断言总数下限）是全包闸门：单段跑按定义不可能达到，驱动在单段模式把它记 REC。
 * 这条判据天然只属于 all，故两侧集合同时剔除，并在 report.md 里写明这一处刻意排除。 */
const GATE_ONLY = new Set(['RZ12']);
const dropGate = (rows) => rows.filter((r) => !GATE_ONLY.has(r.id));
let all = [];
try { all = dropGate(load('results.json')); }
catch (error) {
  const out = { segments: 0, allCounted: 0, mergedCounted: 0, onlyInAll: [], onlyInSegments: [],
    diffEmpty: false, statusDifferences: [], perSegment: [], error: 'missing-or-invalid all report: ' + String(error.message || error) };
  fs.writeFileSync(path.join(OUT_DIR, 'consistency19.json'), JSON.stringify(out, null, 1), 'utf8');
  process.stdout.write('一致性核对失败：' + out.error + '\n');
  process.exit(2);
}
const allKeys = new Set(all.map(keyOf));
const segFiles = fs.readdirSync(OUT_DIR).filter((f) => /^results-seg-.*\.json$/.test(f)).sort();
if (!segFiles.length) {
  const out = { segments: 0, allCounted: allKeys.size, mergedCounted: 0,
    onlyInAll: [...allKeys].slice(0, 40), onlyInSegments: [], diffEmpty: false,
    statusDifferences: [], perSegment: [], error: 'no fresh results-seg-*.json reports' };
  fs.writeFileSync(path.join(OUT_DIR, 'consistency19.json'), JSON.stringify(out, null, 1), 'utf8');
  process.stdout.write('没有找到 results-seg-*.json：一致性未通过，先跑逐段回归\n');
  process.exit(2);
}
const merged = new Map();
const perSeg = [];
for (const f of segFiles) {
  const seg = f.replace(/^results-seg-/, '').replace(/\.json$/, '');
  const rows = dropGate(load(f));
  const st = { all: rows.length, pass: rows.filter((r) => r.status === 'PASS').length, fail: rows.filter((r) => r.status === 'FAIL').length, skip: rows.filter((r) => r.status === 'SKIPPED-BY-DESIGN').length, rec: rows.filter((r) => r.status === 'REC').length };
  perSeg.push({ seg, file: f, keys: new Set(rows.map(keyOf)).size, ...st });
  for (const r of rows) if (!merged.has(keyOf(r))) merged.set(keyOf(r), r);
}
const mergedKeys = new Set(merged.keys());
const onlyAll = [...allKeys].filter((k) => !mergedKeys.has(k));
const onlySeg = [...mergedKeys].filter((k) => !allKeys.has(k));
const statusDiff = [];
for (const [k, r] of merged) { const a = all.find((x) => keyOf(x) === k); if (a && a.status !== r.status) statusDiff.push({ k, all: a.status, seg: r.status }); }
const out = {
  segments: segFiles.length,
  allCounted: allKeys.size,
  mergedCounted: mergedKeys.size,
  onlyInAll: onlyAll.slice(0, 40),
  onlyInSegments: onlySeg.slice(0, 40),
  diffEmpty: onlyAll.length === 0 && onlySeg.length === 0,
  statusDifferences: statusDiff.slice(0, 40),
  perSegment: perSeg,
};
fs.writeFileSync(path.join(OUT_DIR, 'consistency19.json'), JSON.stringify(out, null, 1), 'utf8');
process.stdout.write('逐段：' + perSeg.map((p) => p.seg + '(' + p.keys + ')').join(' ') + '\n'
  + 'all 键集 ' + allKeys.size + ' ／ 逐段并集 ' + mergedKeys.size + '\n'
  + '只在 all 出现：' + onlyAll.length + ' 条；只在分段出现：' + onlySeg.length + ' 条；状态不一致：' + statusDiff.length + ' 条\n'
  + (out.diffEmpty ? '两段一致性：差集为空 ✓\n' : '两段一致性：不通过 ✗\n' + onlyAll.slice(0, 12).join('\n') + '\n---\n' + onlySeg.slice(0, 12).join('\n') + '\n'));
process.exit(out.diffEmpty && statusDiff.length === 0 ? 0 : 1);
