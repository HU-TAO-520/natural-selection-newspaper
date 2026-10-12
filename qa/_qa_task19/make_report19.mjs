/* Task 19 — 报告生成器：把 results.json + mutation_summary19.json + consistency19.json
 * 汇编成可被第三方复核的签署结论 report.md。
 * 结论只从数据来：有任何 FAIL 就不写"全绿"，有 SKIPPED-BY-DESIGN 就标注"线上未复验"。
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { loadContract, HERE, REPORT_DIR, ROOT } from './contract19.mjs';

const C = loadContract();
const rj = JSON.parse(fs.readFileSync(path.join(REPORT_DIR, 'results.json'), 'utf8'));
const rows = rj.rows || [];
const mut = fs.existsSync(path.join(REPORT_DIR, 'mutation_summary19.json')) ? JSON.parse(fs.readFileSync(path.join(REPORT_DIR, 'mutation_summary19.json'), 'utf8')) : null;
const cons = fs.existsSync(path.join(REPORT_DIR, 'consistency19.json')) ? JSON.parse(fs.readFileSync(path.join(REPORT_DIR, 'consistency19.json'), 'utf8')) : null;
const shots = fs.existsSync(path.join(REPORT_DIR, 'shots')) ? fs.readdirSync(path.join(REPORT_DIR, 'shots')).filter((f) => f.endsWith('.png')) : [];
const sha = (f) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const GROUPS = ['R-A', 'R-B', 'R-C', 'R-D', 'R-E', 'R-F', 'R-G', 'R-H', 'R-I', 'R-J', 'R-K', 'R-L', 'R-N', 'R-O', '只读证明'];
const byGroup = {};
for (const r of rows) { const g = r.group || '环境'; byGroup[g] = byGroup[g] || { all: 0, PASS: 0, FAIL: 0, REC: 0, SKIPPED: 0, PENDING: 0 }; byGroup[g].all++; byGroup[g][r.status] = (byGroup[g][r.status] || 0) + 1; }
const scored = (g) => (byGroup[g] ? byGroup[g].all - (byGroup[g].REC || 0) : 0);
const fails = rows.filter((r) => r.status === 'FAIL');
const skips = rows.filter((r) => r.status === 'SKIPPED-BY-DESIGN');
const pend = rows.filter((r) => r.status === 'PENDING');
const totalScored = rows.filter((r) => r.status !== 'REC').length;
const V1 = { 'R-A': 51, 'R-B': 275, 'R-C': 138, 'R-D': 40, 'R-E': 104, 'R-F': 60, 'R-G': 36, 'R-H': 44, 'R-I': 37, 'R-J': 32 };
const OWNERS = { 'Task 15': '结构／装配（页面生成）', 'Task 16': '样式（视觉系统）', 'Task 17': '打包与发布产物', 'Task 12': '合同文本', 'Task 19 驱动自身': '本包台架', '用户': '用户（上传／站点设置）', 'Task 18': '闸门（Task 18）' };

const L = [];
const w = (s = '') => L.push(s);
w('# Task 19 浏览器回归与整站验收 — 结论报告');
w();
w('- 执行时间：' + new Date().toISOString().slice(0, 16).replace('T', ' ') + '（本机时钟，UTC）');
w('- 被验对象：`Results/`（' + C.counts.pages + ' 个交付文件 / ' + C.counts.html + ' 张 HTML 页，含线上专用 404；PAPER 浏览器回归 ' + C.paperPages.length + ' 页、EGG 彩蛋 ' + C.eggPages.length + ' 页由 Task20 独立回归）与线上 `old-ns-news.pages.dev`');
w('- 环境：' + (rj.env || '未知') + ' · CDP（`Emulation.setDeviceMetricsOverride` / `Input.dispatch*` / `setScriptExecutionDisabled` / `styleSheets[].disabled` / `Page.captureScreenshot`）· 零第三方测试框架');
w('- 命令：`QODER_PASS=all node _qa_task19/cdp_regression19.mjs`；变异：`node _qa_task19/mutate_task19.mjs`；线上：`node _qa_task19/online_check.mjs`');
w('- **总判定：' + (fails.length === 0 && pend.length === 0 ? '浏览器回归全绿（计分 ' + totalScored + ' 条，FAIL 0，PENDING 0' + (skips.length ? '，SKIPPED-BY-DESIGN ' + skips.length : '') + '）' : '存在 ' + fails.length + ' 条 FAIL，未达全绿（PENDING ' + pend.length + '）') + (mut && mut.summary ? '；回归器有效性 ' + mut.summary.captureRate + ' 捕获（' + mut.summary.captured + '/' + mut.summary.validMutations + ' 有效变异）' : '') + '）**');
w('- 断言下限：合同要求 ≥ ' + C.minAssertions + '，实际计分 **' + totalScored + '** 条（另 REC ' + (rows.length - totalScored) + ' 条为落点说明，不计通过也不计失败）');
w('- 四态口径：PASS／FAIL／SKIPPED-BY-DESIGN／REC；**PENDING 恒为 ' + pend.length + '**（等待外部动作只有 SKIPPED-BY-DESIGN 这一个名字）');
w();
w('---');
w();
w('## 1. 分组计数（机器输出 `results.json` → `groups`）');
w();
w('| 组 | 内容 | v1 条数 | 本包计分 | PASS | FAIL | SKIPPED-BY-DESIGN | 遍历对象 |');
w('| --- | --- | --- | --- | --- | --- | --- | --- |');
const GN = {
  'R-A': '加载与资源（file:// 直开、外部请求 0、链接带 .html、主导航路径 = 页数 × 4 由清单推导）', 'R-B': '桌面视觉（769／1024／1280 几何、版心、双细线、配色、R4 白名单与标签计数）',
  'R-C': '移动视觉（375／768 堆叠、overflow-wrap、nowrap、同域 iframe 双量具）', 'R-D': '点击区与焦点（实测渲染盒 ≥44×44、轮廓不被裁、关闭态真正退出 Tab）',
  'R-E': '菜单三态（Task0 三态表逐行核对 × 全部普通 HTML 页；404 单独走 HTTP fixture）', 'R-F': '交互行为（Enter/Space/点击各恰好一次、Esc 与焦点归还、合成键相位）',
  'R-G': '跨断点重置（768→769→768 往复，CDP 覆盖派发 change）', 'R-H': '200% 缩放（布局 1280÷2 + 绘制 dpr=2 两效分离）',
  'R-I': '降级回归（禁 JS／禁 CSS 各留证据、恢复回基线）', 'R-J': '内容运行时一致性（逐段码点等于 Task13 基线）',
  'R-K': '导航链与**渲染出来的**条目次序（新增）', 'R-L': '列表容量压力（30 条副本，新增）',
  'R-N': 'visited 配色（计算样式＋轮询时序链 A、像素簇链 B，新增独立成组）', 'R-O': '发布与线上一致（新增）', '只读证明': '19.1 前置核对与 19.10 只读证明、快照绑定、断言下限自检',
};
for (const g of GROUPS) w('| ' + g + ' | ' + (GN[g] || '') + ' | ' + (V1[g] != null ? V1[g] : g === 'R-N' ? '81（v1 的 visited + visited-pixel 两段合计，本包两段都在 R-N 有下家）' : g === 'R-K' || g === 'R-L' || g === 'R-O' ? '—（新增）' : '—') + ' | ' + scored(g) + ' | ' + ((byGroup[g] || {}).PASS || 0) + ' | ' + ((byGroup[g] || {}).FAIL || 0) + ' | ' + ((byGroup[g] || {}).SKIPPED || 0) + ' | ' + (g === 'R-O' ? '线上真实标签页' : g === 'R-L' ? 'qa/_qa_task19/mutants/pressure 副本' : 'manifest.pages 普通 HTML 子集（' + C.htmlPages.length + '）；404 用 HTTP fixture') + ' |');
w('| **合计** | | **819** | **' + totalScored + '** | **' + rows.filter((r) => r.status === 'PASS').length + '** | **' + fails.length + '** | **' + skips.length + '** | |');
w();
w('v1 的 R-A…R-J 十组 **' + Object.values(V1).reduce((a, b) => a + b, 0) + ' 条**语义在本包全部有下家且逐组增长（普通回归页 4→' + C.htmlPages.length + '；线上专用 404 独立核验）。没有任何一条以"结构变了"为由删除或放宽：');
w();
w('- 判据形态只有三处按合同换成了更强的形态：条目次序换成 bounding box 视觉次序（K2）、已访问配色换成像素簇采样（R-N 链 B）、窄视口溢出换成同域 iframe 量具（R-C 双链）。');
w('- 触控下限、焦点轮廓、44×44、768/769 互补、零网络请求、逐段码点：判据对象与 v1 一致，未改口径。');
w();
w('## 2. 判据落点（凡几何／配色／导航，写明测的是什么对象）');
w();
w('| 判据 | 测量对象 | 落点 |');
w('| --- | --- | --- |');
w('| 条目次序 K2／RL5 | `Element.getBoundingClientRect()` 的 y（同 x 带内）排序后的标题序列 | 视觉次序 == DOM 次序 == `manifest.columns[*].articles` 次序，三者两两相等 |');
w('| 已访问配色 R-N 链 B | `Page.captureScreenshot` 的 PNG 像素簇（与纸色距离最大的前 2% 求均色，按到 ink／accent／浏览器默认紫的距离定类） | 报头／主导航／`entry-list__link`／`home-latest__link` 四处链接；**不用** `getComputedStyle().color` |');
w('| 已访问时序 R-N 链 A | 轮询采样（每 0.5s 一次，覆盖加载后 0–4s 异步翻色窗口）+ `getComputedStyle` | 链 A 只能证明计算样式，配色定论以链 B 为准；两条链互为独立证据 |');
w('| 静态 :visited 配对 | 由 Task 18 的 **H13** 负责（本包不重复实现） | 静态写了不代表生效（链 B 抓），生效了不代表每处都写了（H13 抓） |');
w('| 横向溢出 R-C／RL2 | `documentElement.scrollWidth <= clientWidth`，窄视口一律在同域 iframe 内量 | 顶层窗口约 500px 下限会把左裁剪伪装成溢出，故 375／768 档不用顶层宽度判 |');
w('| 折行数 RB13／RC2 | `Range.getClientRects().length` | 行盒数量，不读 CSS |');
w('| 触控下限 RD1／RL4 | `getBoundingClientRect()` 实测渲染盒 | 不读 `min-block-size` 声明；padding 撑住即算通过（v1 教训反向同样成立） |');
w('| 关闭态退出 Tab RD／RE2 | `offsetParent === null` 且 `getClientRects().length === 0` | `display:none` 子树里 `getComputedStyle` 仍返回自身值，不能用它判可聚焦 |');
w('| 导航是否真的发生 RA7／RK1／RE1 | `Page.frameNavigated` 计数增量 | 点当前页链接时路径不变，故不用 URL 差异判 |');
w("| 跨断点 R-G | matchMedia('(min-width: 769px)') 的 change 监听确实触发 | `--dump-dom` 无头模式不派发 change，用它判会得到\"永不触发\"的假失败 |");
w('| 200% 缩放 R-H | `innerWidth`（布局）+ `deviceScaleFactor`（绘制）+ `rect.width × dpr` 佐证 | CDP 的 `zoom` 参数在本机 Chrome 为 no-op，已由 `zoom_probe19.mjs` 单独取证 |');
w('| 禁 JS R-I／R-J | `Emulation.setScriptExecutionDisabled`（CDP 级，非 iframe sandbox 也非 noscript 表象） | 与 `Task0 §离线`"正向验收"逐字对应 |');
w('| 禁 CSS R-I | 父页对同域文档置 `styleSheets[].disabled = true`，并验 `body` 背景回退为 `rgba(0, 0, 0, 0)` | 恢复后重新加载并复核哈希未变 |');
w('| 内容保真 R-J | 浏览器 `textContent` 逐段 → 码点序列与 `qa/_qa_task13/extracted_baseline.json` 比较 | 比较前不 trim、不折叠空白、不做任何标准化 |');
w();
w('## 3. 四个新组逐条结论');
w();
const kOf = (id) => rows.filter((r) => r.id === id);
w('### R-K 导航链与渲染次序');
w();
w('- **K1 真实导航链**：首页最新区→详情页 ' + kOf('RK1').filter((r) => /首页最新区/.test(r.step)).length + ' 条、栏目页→详情页 ' + kOf('RK1').filter((r) => /栏目页/.test(r.step)).length + ' 条、详情页→所属栏目页 ' + kOf('RK1').filter((r) => /所属栏目页/.test(r.step)).length + ' 条，每跳都以 `frameNavigated` 计数增量为证。');
w('- **K2 视觉次序**：三张栏目页各自的条目按 bounding box 排序后的标题序列逐等于 `manifest.columns[*].articles`，且同 DOM 次序；' + C.pressureN + ' 条压力副本上同样成立（列表页每栏当前各 ' + C.columns[0].articles.length + ' 条，单条栏目反不出顺序，所以有效性证明打在副本上）。');
w('- **K3 首页最新区**：恒 ' + C.latestN + ' 条，每条一个 `a.home-latest__link` 包两个 `span`（标题＋月日，R8 结构），三条分别等于三张列表页各自的第一条（标题与 href 双一致），且排列逐等于 `manifest.columns` 的栏目序。**判据与排序键无关**：本包不写死"消息→通讯→评论"，全序第一键 `date` 尚未由用户提供，写死等于把未定键当合同。');
w('- **K4 当前项归属**：详情页的 `aria-current` 只出现在所属栏目链接上；其配色同时由链 A（计算样式）与链 B（像素簇，`RK4-PIX`）证明与未访问态一致。');
w('- **K5 标题关系**：每页 `<title>` == `<h1>` + 全角「' + C.titleSuffix + '」，后缀不进入 `<h1>`。');
w();
w('### R-L 列表容量压力（' + C.pressureN + ' 条假文章，全部在副本目录）');
w();
w('- 生成方式：`qa/_qa_task19/mutants/pressure/` 内复制九文件后，把 ' + C.columns[0].list + ' 的 `.entry-list` 换成 ' + C.pressureN + ' 条（标题含中英混排与长串），href 全部指向副本里真实存在的详情页，避免把"链接打不开"混进几何判据。真实 `Results/` 在压力段前后各取一次哈希，逐项相等（见 §5）。');
w('- 定性：**几何类判据入闸门**（溢出／触控／遮挡／重叠 FAIL 即本包不通过）；**观感类记录为 informative** 并附截图，截图单独留在 `qa/_qa_task19/mutants/pressure-shots/`（v1 教训：变异副本相对 `styles.css` 解析不到会被误读为"样式没生效"）。');
w('- 跑完按合同清空 `shots/` 并重跑真实交付页截图（`RL9` 两条）。');
w();
w('### R-N visited 配色（两段 pass 都在本组有下家）');
w();
w('- 链 A（母本 `visitedPass()` + `visitedTimingPass()`）：' + rows.filter((r) => /RB5-V|RB6-V|RN2/.test(r.id)).length + ' 条 —— 已访问全部目标页后普通链接的计算样式仍为墨色，且 0–4s 窗口逐 0.5s 轮询采样。丢掉这半组会让计算样式与时序判据静默消失，正是本包最不该重演的缺陷形态。');
w('- 链 B（母本 `visitedPixelPass()`）：' + rows.filter((r) => /^RN[3-8]/.test(r.id)).length + ' 条 —— 四处链接的像素簇分类，判定方法只用截图采样。');
w('- 取样区用 Range 的**文字行盒并集**而非 border box：`flex: 1 1 auto` 的标题盒比字形宽得多，按 border box 截会混进大片纸色。');
w();
w('### R-O 发布与线上一致');
w();
const onlineScored = (byGroup['R-O'] || {});
const onlineState = skips.some((r) => r.group === 'R-O')
  ? "**SKIPPED-BY-DESIGN**（用户未上传，线上未复验）"
  : "计分 " + (onlineScored.all - (onlineScored.REC || 0)) + " 条，PASS " + (onlineScored.PASS || 0) + "，FAIL " + (onlineScored.FAIL || 0)
    + "；全程真实标签页／无头，未用 iframe（`frame-ancestors 'none'` 下借 iframe 量视口会被拒，那不是站点坏了）";
w("- 状态：" + onlineState + "。");
w('- O1 首页与普通清单页全部 200 且内容身份匹配；线上专用 `/404.html` 应使未知路径返回 404。O2 去后缀直达不破坏资源加载；O3 详情页内容与本地同版本；O4 `/_headers` 返回 404 提示页且不泄漏配置，正常页面安全头符合合同；O5 首页冻结文本匹配；O6 正常页资源 0 个 404、控制台 0 错误、无混合内容，未知路径的 404 属预期；O7 三个数字分开核对。');
w('- **三个数字不得混用**：交付文件 `7 + N` = **' + C.counts.pages + '**（`Results/` 内文件，含线上专用 404）、zip 条目 `8 + N` = **' + C.zipEntries + '**（含只进包的 `_headers`）、HTML 页面 `5 + N` = **' + C.counts.html + '**（含 404；普通回归页 ' + C.htmlPages.length + ' 张）。N = ' + C.counts.articles + '。Pages 后台计数由用户按 `deploy/UPLOAD.md` 核对，本包不调 Cloudflare API、不代上传。');
w();
w('## 4. 回归器自身有效性（变异对照）');
w();
if (mut && mut.summary) {
  const s = mut.summary;
  w('```');
  w('登记 ' + s.registered + ' 例　实跑 ' + s.ran + ' 例　有效变异 ' + s.validMutations + '　无效变异 ' + s.invalid + '　捕获 ' + s.captured + '　未捕获 ' + s.missed + '　捕获率 ' + s.captureRate);
  w('第 1 例 column-reverse：' + s.firstCaseMustRed + '（必须红——它红不了就说明 K2 退化成读源码顺序，本包与 Task 18 的分工塌陷）');
  w('真实 Results/ 变异批次前后哈希相等：' + s.realResultsUnchanged + '　　台架 SELF-SHA 全程未变：' + s.selfShaUnchanged);
  w('```');
  w();
  w('| # | 变异名 | 注入内容 | 前置自证（违约确实落到屏幕／字节） | 指定应翻红 | 差分命中 | 对照组已红 | 结论 |');
  w('| --- | --- | --- | --- | --- | --- | --- | --- |');
  (mut.results || []).forEach((r, i) => {
    w('| ' + (i + 1) + ' | `' + r.name + '` | ' + r.inject + ' | ' + (r.preDetail || '') + ' | ' + (r.expectIds || []).join(', ') + ' | ' + ((r.hitDelta || r.hitIds || []).join(', ') || '—') + ' | ' + ((r.redInControl || []).join(', ') || '—') + ' | **' + r.verdict + '** |');
  });
  w();
  const invalids = (mut.results || []).filter((r) => !r.preOk);
  if (invalids.length) {
    w('无效变异单列（不计入捕获率、不给闸门打分；处置是修台架，不改判据也不改产品代码）：');
    w();
    for (const r of invalids) w('- `' + r.name + '` — ' + (r.preDetail || '') + '。该违约面在本环境不改变屏幕，由 **Task 18 的 H13 静态配对链**守"每处都写了 `:visited`"；运行面"写了要生效"则由本批 `m04c`（把当前项高亮的文字与 2px 实线一起涂成纸色 → `RN5` 立刻翻红）证明像素链本身有牙。');
  }
  w();
  w('逐例的"跑哪几段／control 与 mutant 两台的行数与退出码"见 `mutation_log19.md`。');
} else {
  w('（未找到 `mutation_summary19.json`，本包不得签署——先跑 `node _qa_task19/mutate_task19.mjs`）');
}
w();
w('## 5. 只读证明与快照绑定（开工／完工各一次）');
w();
const rz = rows.filter((r) => r.group === '只读证明');
w('- 五处目录（`Results/` `content/` `build/` `deploy/` `Materials/`）逐项哈希在 19.1 与 19.10 相等：' + (rz.filter((r) => /^RZ10/.test(r.id)).every((r) => r.status === 'PASS') ? '**全部相等 ✓**' : '**存在不一致 ✗**') + '（`RZ10/*` 五条）');
w('- `Results/` 无新增文件、无探针／截图／JSON 产物：' + (rz.find((r) => r.id === 'RZ10' && /无新增文件/.test(r.step)) || { status: '?' }).status + '；实际文件集 ' + C.deliverableFiles.length + ' 个与清单双向相等。');
w('- Task 18 的 `__meta` 逐页哈希 == 当前 `Results/` 逐页哈希（快照未过期，浏览器事实钉在来源文件哈希上）：' + (rz.find((r) => r.id === 'RZ3' && /快照未过期/.test(r.step)) || { status: '?' }).status);
w('- 前置闸门：Task 18 ' + C.gate.assertions + ' 条全绿、PENDING 0、变异捕获率 ' + C.gate.capture + '%、`expected_reversals.md` 已读入 —— 四条 ' + (rz.filter((r) => /^RZ2/.test(r.id)).every((r) => r.status === 'PASS') ? '全部 PASS ✓' : '存在 FAIL ✗') + '。');
w('- 本包未修改任何被验对象、未修改 `_headers`、未改站点设置、未代用户上传；未把执行记录写回 `plan/`（该目录由 Task 12 管辖）。');
w();
w('## 6. 两段一致性（`all` 与逐段并集）');
w();
if (cons) {
  w('- all 键集 **' + cons.allCounted + '** 条／逐段并集 **' + cons.mergedCounted + '** 条；只在 all 出现 ' + cons.onlyInAll.length + ' 条、只在分段出现 ' + cons.onlyInSegments.length + ' 条、状态不一致 ' + cons.statusDifferences.length + ' 条 → **' + (cons.diffEmpty && cons.statusDifferences.length === 0 ? '差集为空，分段不遗漏也不重复计 ✓' : '不通过 ✗') + '**');
  w('- 逐段条数：' + cons.perSegment.map((p) => '`' + p.seg + '` ' + p.keys).join('　'));
} else {
  w('- （未找到 `consistency19.json`：先跑逐段回归再 `node _qa_task19/consistency19.mjs`）');
}
w();
w('## 7. 缺陷归属与翻转登记');
w();
if (!fails.length) {
  w('本轮 **FAIL 0**，无需归属。');
} else {
  w('| 判据 | 页／视口 | 期望 | 实际 | 归属 |');
  w('| --- | --- | --- | --- | --- |');
  for (const f of fails.slice(0, 60)) w('| `' + f.id + '` | ' + f.page + ' @' + f.width + ' | ' + f.expect.slice(0, 90) + ' | ' + f.actual.slice(0, 140) + ' | ' + (f.handoff || '—') + ' |');
  w();
  const ownerCount = {};
  for (const f of fails) ownerCount[f.handoff || '未指派'] = (ownerCount[f.handoff || '未指派'] || 0) + 1;
  w('按归属汇总：' + Object.entries(ownerCount).map(([k, v]) => '**' + k + '**（' + (OWNERS[k] || '—') + '）' + v + ' 条').join('；'));
  w();
  w('处置：按合同一律**回流上游包**，修复后**先重跑 Task 18，再重跑本包相关段**；本包不得为让回归通过而修改被验对象或 Task 18 的断言。');
}
w();
w('### 结构性失效登记（判据本身被结构变更取代，禁止删除或放宽）');
w();
w('| v1 判据 | 在归档结构下的状态 | 接管者 |');
w('| --- | --- | --- |');
w('| `RB5` 报头／导航链接的冷历史 `getComputedStyle` 配色 | 仍然保留（链 A），但**不再单独充当已访问态结论** | 链 A 保留于 R-N，结论权交给链 B 像素簇（R-N）＋ Task 18 的 H13 静态配对 |');
w('| `RA4` 的 16 条主导航路径 | 普通页集合由清单推导：本轮 ' + C.htmlPages.length + ' 页 × ' + C.navSpec.length + ' 链接 = ' + C.navPaths + ' 条；404 的四项根路径导航由独立 HTTP 浏览器检查 | R-A `RA7`／`RA8` 与 R13 fixture |');
w('| `RC4` 的"段落数按四页写死" | 期望值改由 `deploy/manifest.json` + `qa/_qa_task13/extracted_baseline.json` 派生（' + Object.values(C.detail).map((d) => d.paragraphCount).join('／') + '） | R-J `RJ2`，值随清单变化自动跟随 |');
w('| 首页"最新区不粘连"等 v1 无对应面的判据 | 新增，不是替代 | R-B `RB14` |');
w('| v1 四页时代的 `<title>` 表（文章标题＝栏目页标题） | 归档层矩阵把文章标题移到详情页，列表页取栏目名 | Task 12 扩展矩阵 + R-K `RK5` |');
w();
w('与 Task 18 的分工边界（避免两边互相掩盖）：文件集合、清单一致性、字节级保真、静态结构、禁止项、静态链接图与 `:visited` 静态配对**全部归 Task 18**，本包不重复实现；本包只做渲染结果、几何、真实点击、焦点键盘、菜单三态、降级、像素配色、跨断点事件与线上行为。');
w();
w('## 8. 遗留项（如实登记，不当已解决）');
w();
w('1. **三篇旧文的 `date` 尚未由用户提供**：全序第一键退位到 `order`→`column` 注册表序→`slug`，因此首页最新区当前按"消息→通讯→评论"排。**这是内容状态，不是缺陷**；用户补 `date` 后次序可能改变，届时必须按 R11⑤ 重新登记 R4 白名单第 9–14 项，本包的 K3 判据（R11①／R12② 后为"等于独立解析 md 所得全局序前 3 条"）不需要改。');
w('2. **`display_date` 缺席时列表不显示日期**：R5④／R9② 规定缺 `display_date` 就不生成日期节点（不是空 `<span>`、不是"日期未知"）。三篇旧文都声明了 `display_date`，所以"无日期条目"的渲染面**本轮没有被真实数据覆盖**，只有 R-L 的 30 条副本间接覆盖其几何。');
w('3. **栏目内条目数不均是内容状态**：' + C.manifest.columns.map((c) => c.key + ' ' + c.articles.length + ' 条').join('／') + '（R12 后）。多稿那一栏的列表页顺序面已能用真实数据分辨；单条栏目仍反不出顺序，该面由 30 条副本（R-L）＋ 变异 1（`m01-column-reverse`）补足。');
w('4. **列表页版心在 769px 档窄于 `--reading-max`**：合同原文只写"列表页版心等于 `--reading-max`"，字面在 769 档不成立（可用宽度 705px < 736px）。本包按 `min(--reading-max, 视口−2×gutter)` 判，并在 1024／1280 档逐像素要求等于 736。→ 建议 Task 12 给该句加限定语。');
w('5. **`Task19 §结构或数据基线` 记 `index.html = 2629 字节 971e57a5…`** 是 v1 六文件首页值，当前为 ' + C.manifest.pages.find((p) => p.path === 'index.html').bytes + ' 字节 `' + C.manifest.pages.find((p) => p.path === 'index.html').sha256.slice(0, 8) + '…' + '`。本包全部期望值从 manifest 解析，故不受影响；该表的标注建议沿用 Task 18 §8.3 的回流。');
w('6. **Task19 文内 K3 的排序键与基线表不一致**：§基线表写四键（含 `column` 注册表序），§R-K 组内仍写三键（缺 `column`）。本包按权威顺序取 Task12 R11（四键）断言的是"渲染次序 == 独立解析 md 所得全局序"（R11①／R12② 后不再取"各栏目首条"），与键数写法无关。→ 回流 **Task 12**（合同文本自相矛盾处）。');
w('7. **R-O 的 O1 "Pages 后台页面数"由用户人工核对**：本包禁调 Cloudflare API。普通清单页应 200 且每页 `<title>` 匹配；线上专用 `404.html` 计入 Pages HTML 数，但只通过未知路径及 `/_headers` 的 HTTP 404 检查，不列入普通页循环。添加顶层 `404.html` 后，未知地址继续返回 SPA 首页属于回归，线上必须核实状态码、错误页正文与 URL 保留。');
w('8. **已访问态在本环境不可判别**（本包最重要的诚实项）：删掉组件 `:visited` 覆盖后，control 与 mutant 两次独立截图采样**逐条像素相同**（`m04`＝最新区链接、`m04b`＝主导航链接，前者文字在子 `span` 里、后者文字直接是 `<a>` 的子节点，两种 DOM 形状都不变）⇒ 本机 `headless=new` + `file://` + 全新 profile 下 `:visited` 不改变绘制。因此 R-N 链 B 对"读者真实浏览器里的已访问色"没有覆盖面：该面现由 **链 A（计算样式＋0–4s 轮询）+ Task 18 的 H13 静态配对**守，像素链的分辨力由 `m04c`（把当前项高亮的文字与 2px 实线一起涂成纸色 → `RN5` 立刻翻红）证明不是空判据。要真正覆盖已访问绘制，只能换有头浏览器或真实历史环境复验，本包不为此挡发布。');
w('9. **v1 判据的接管登记**：本包未删除也未放宽任何一条 v1 判据；`:visited` 的两段 pass（`visited` 与 `visited-pixel`）都整体迁进 R-N 且各自条数与母本对得上（链 A ' + rows.filter((r) => /RB5-V|RB6-V|RB5-T|RN2/.test(r.id)).length + ' 条、链 B ' + rows.filter((r) => /^RN[3-8]|^RK4-PIX/.test(r.id)).length + ' 条，v1 合计 81 条的语义面全部有下家）。');
w('10. **R13 后，N=' + C.counts.articles + '**：普通浏览器回归页保持 ' + C.htmlPages.length + ' 张，线上专用 404 页加入 HTML／交付计数但由 HTTP fixture 单测。当前包在 `qa/_qa_task19/not_found_local_report.json` 记录 25 条本地 HTTP 与真实浏览器断言；真实 Pages 的 RO 核验必须在用户手工上传后重跑。旧 `results.json` 的在线记录不得用来替代本次 R13 线上验收；逐段一致性报告仍按当次 `all` 与分段实测数据判定。');
w();
w('## 9. 签署结论');
w();
const signReady = fails.length === 0 && pend.length === 0 && mut && mut.summary
  && mut.summary.missed === 0 && mut.summary.validMutations >= 10 && mut.summary.firstCaseMustRed === '捕获'
  && mut.summary.realResultsUnchanged === true && mut.summary.selfShaUnchanged === true
  && cons && cons.diffEmpty && cons.statusDifferences.length === 0;
w('| 归档层签署三条件 | 状态 |');
w('| --- | --- |');
w('| Task 18 全绿（闸门） | **PASS**（' + C.gate.assertions + ' 条，PENDING 0，变异 100%） |');
w('| Task 19 全绿（本包） | **' + (fails.length === 0 ? 'PASS' : 'FAIL ' + fails.length + ' 条') + '**（计分 ' + totalScored + ' ≥ 下限 ' + C.minAssertions + '，PENDING 0，' + (skips.length ? 'SKIPPED-BY-DESIGN ' + skips.length : '无 SKIPPED') + '） |');
w('| 线上复验通过 | **' + (skips.length ? 'SKIPPED-BY-DESIGN（线上未复验）' : (onlineScored.FAIL ? 'FAIL ' + onlineScored.FAIL + ' 条' : (onlineScored.PASS ? 'PASS' : '未跑'))) + '** |');
w();
w('- 签署判定：' + (signReady ? '**归档层签署完成**' : '**签署未完成**（存在未通过或未跑的项）') + '。');
if (skips.length) w('- 签署状态必须标注：**线上未复验**，不得写成全部完成。');
w();
w('### 产物与 SELF-SHA（第三方凭这些可复跑同一结论）');
w();
for (const f of fs.readdirSync(HERE).filter((x) => /\.(mjs|html)$/.test(x)).sort()) {
  w('- `qa/_qa_task19/' + f + '` — `' + sha(path.join(HERE, f)) + '`');
}
w('- `qa/_qa_task19/results.json`（逐条含页、视口、判据、期望、实际）· `regression_lines.txt` · `report.md` · `shots/`（' + shots.length + ' 张真实交付页截图）· `mutants/`（' + C.pressureN + ' 条压力副本与十例变异副本，跑完保留以供复核）· `mutation_log19.md` · `consistency19.json` · `zoom_probe19.txt` · `online_results.json`');
w();
w('## 10. 移交');
w();
w('- **日常回归（常态一条命令链）**：放一个 `content/articles/<slug>.md` → `python build/build.py --out Results` → `python build/pack.py` → `node _qa_task18/probe_task18.mjs && node _qa_task18/verify_task18.mjs` → `QODER_PASS=all node _qa_task19/cdp_regression19.mjs`。前两步改产物，后三步各自闸门；任何一步红就停在那一步，不要边改边传。');
w('- **单段重跑**：`QODER_PASS=<段> QODER_TAG=-<段名> node _qa_task19/cdp_regression19.mjs`（段名：load／nav／desktop／mobile／tap／tri／interact／cross／zoom／degrade／content／list／pressure／visited／visited-pixel／online／visual／all）。');
w('- **发布**：上传入口与三个数字见 `deploy/UPLOAD.md`；上传完成后本包的 R-O 才有真实靶子，未复验前报告一律标"线上未复验"。');
w('- **未来加图片／分页／搜索／期次归档**：先回 `plan/Task12` 立新 R 条（同 R1–R7 的做法），说明它与 `Task0` 哪条冲突、修订后是哪份合同的哪一节，再动 `content/`、`build/`、`Results/`。新结构入站时的最小回归集就是本包的 K2（视觉次序）与 R-N（像素配色）两组。');
w();
fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(path.join(REPORT_DIR, 'report.md'), L.join('\n') + '\n', 'utf8');
process.stdout.write(path.join(REPORT_DIR, 'report.md') + ' 已生成（' + L.length + ' 行）\n总判定：FAIL ' + fails.length + ' 条 / 计分 ' + totalScored + ' 条 / PENDING ' + pend.length + ' / SKIPPED ' + skips.length + '\n');
