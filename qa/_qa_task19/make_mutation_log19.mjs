/* Task 19 — 变异日志生成器：mutation_summary19.json → mutation_log19.md
 * 逐例给出：注入内容 / 来源与为什么不合并 / 前置自证 / 指定应翻红 / 差分命中 / 结论。
 * 无效变异单列，不计入捕获率，也不给闸门打分（合同 §回归器有效性）。 */
import fs from 'node:fs';
import path from 'node:path';
import { HERE } from './contract19.mjs';

const j = JSON.parse(fs.readFileSync(path.join(HERE, 'mutation_summary19.json'), 'utf8'));
const L = [];
const w = (s) => L.push(s);
w('# Task 19 变异对照日志（回归器自身有效性）');
w();
if (!j.summary) {
  w('**本批未完成**：台架异常，无 summary。错误如下，修复台架后整批重跑（不改判据、不改产品代码）。');
  w();
  w('```');
  w(String(j.error || '未知错误'));
  w('```');
  fs.writeFileSync(path.join(HERE, 'mutation_log19.md'), L.join('\n') + '\n', 'utf8');
  process.stdout.write('mutation_log19.md：本批异常，未出结论\n');
  process.exit(1);
}
const s = j.summary;
w('- 台架：`qa/_qa_task19/mutate_task19.mjs`；副本目录：`qa/_qa_task19/mutants/<变异名>` 与 `qa/_qa_task19/mutants/<变异名>-control`（真实 `Results/` 一个字节未改）');
w('- **两台一套（control + mutant）**：捕获 = 指定判据在 mutant 红**且**在 control 绿（FAIL 集合做差）。');
w('  不做差会出两种错：一条既有红灯被冒领成本例捕获；或对照组本就该红的判据让人误以为漏检。');
w('- 登记 ' + s.registered + ' 例　实跑 ' + s.ran + ' 例　有效变异 ' + s.validMutations + '　无效 ' + s.invalid + '　捕获 ' + s.captured + '　未捕获 ' + s.missed + '　**捕获率 ' + s.captureRate + '**');
w('- 第 1 例 `column-reverse` 必须红：`' + s.firstCaseMustRed + '`');
w();
w('## 逐例');
w();
w('| # | 变异名 | 结构性准备（两台共有） | 注入内容（只给 mutant） | 来源与为什么不合并 | 前置自证 | 指定应翻红 | 差分命中 | 对照组已红 | 结论 |');
w('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
(j.results || []).forEach((r, i) => {
  w('| ' + (i + 1) + ' | `' + r.name + '` | ' + (r.prep || '—') + ' | ' + r.inject + ' | ' + r.why + ' | ' + r.preDetail + ' | ' + r.expectIds.join(', ') + ' | ' + ((r.hitDelta || []).join(', ') || '—') + ' | ' + ((r.redInControl || []).join(', ') || '—') + ' | **' + r.verdict + '** |');
});
w();
w('## 台架与驱动退出码');
w();
w('| # | 跑哪几段 | control 目录 | mutant 目录 | control 行数 | mutant 行数 |');
w('| --- | --- | --- | --- | --- | --- |');
(j.results || []).forEach((r, i) => w('| ' + (i + 1) + ' | `' + r.seg + '` | `' + r.controlDir + '` | `' + r.mutantDir + '` | ' + r.controlRows + ' | ' + r.mutantRows + ' |'));
w();
w('## 台架守卫');
w();
w('- SELF-SHA（' + (s.selfShaUnchanged ? '全程未变 → 本批结论有效' : '**变化 → 整批作废**') + '）：变异跑期间编辑被测脚本或驱动，会得到"0 条 FAIL"的假漏检。');
w('- 真实 `Results/`：批次前后逐项哈希' + (s.realResultsUnchanged ? '相等 ✓（含 control/mutant 两批共 20 个副本目录全部在 `qa/_qa_task19/mutants/` 下）' : '**不一致 ✗**'));
w('- 副本目录带完整 `styles.css`／`script.js`：v1 教训是相对路径解析不到样式会被误读成"样式没生效"。');
w('- Chrome profile 目录带时间戳且删除容错：复用同名目录会被上一台占用撞出 EPERM 把整批带崩（本包真实事故形态）。');
w('- 副本跑完**保留**在 `qa/_qa_task19/mutants/` 以供第三方复核，不只在内存或临时目录里跑掉。');
w();
w('## 无效变异处置');
w();
const invalid = (j.results || []).filter((r) => !r.preOk);
if (!invalid.length) w('本轮 0 例无效变异：每例前置自证都在字节层或渲染层成立。若出现无效变异，处置是**修台架**（换注入点、铺条目、压 padding），不改产品代码，也不改判据。');
else for (const r of invalid) w('- `' + r.name + '`：' + r.preDetail + ' → 修台架后重跑，不计捕获率。');
w();
w('## 与 Task 18 的两条独立链');
w();
w('- 变异 4（删 `.home-latest__link:visited`）：运行面由本包 R-N 链 B（像素簇）抓，静态面由 Task 18 的 **H13**（`:visited` 配对）抓。本包不重复实现 H13，只引用其结论——两条链各自都能独立翻红，才叫两条链。');
w('- 变异 5（触控下限）按 v1 真实教训做成"改声明 + 同时压掉 padding/gap/字号"的双动作注入，并以 375px 实测渲染盒 <44 为前置自证：只改 `min-block-size` 而 padding 仍撑住时，渲染层其实没有违约，那种是无效变异而不是漏检。');
w('- 变异 1（`column-reverse`）打在多条目副本上并指定 K2 的"视觉次序 == DOM 次序"这条腿：今天的真实内容每栏目只有 1 条，源码顺序无从反序，单条页面对这条 CSS 没有分辨力——这是内容状态，不是判据缺陷，因此台架提供 ≥2 条的副本，并把"manifest 次序"那条腿（对照组同样红）用差分排除。');
fs.writeFileSync(path.join(HERE, 'mutation_log19.md'), L.join('\n') + '\n', 'utf8');
process.stdout.write('mutation_log19.md 已生成（' + L.length + ' 行，捕获率 ' + s.captureRate + '，第 1 例=' + s.firstCaseMustRed + '）\n');
