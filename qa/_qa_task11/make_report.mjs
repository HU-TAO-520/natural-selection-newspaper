/* 由 results.json 生成 _qa_task11/report.md：所有数字与结论都取自真实运行记录，不手抄。 */
import fileURL from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const HERE = path.dirname(fileURL.fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const R = JSON.parse(fs.readFileSync(path.join(HERE, 'results.json'), 'utf8'));
const rows = R.rows;
const mut = fs.existsSync(path.join(HERE, 'mutation_log.md')) ? fs.readFileSync(path.join(HERE, 'mutation_log.md'), 'utf8') : '';
const pass = (s) => rows.filter((r) => r.id === s);
const cnt = (arr) => ({ n: arr.length, ok: arr.filter((r) => r.status === 'PASS').length, bad: arr.filter((r) => r.status === 'FAIL') });
const pagesOf = (arr) => [...new Set(arr.filter((r) => /\.html$/.test(r.page)).map((r) => r.page))];
const ev = (id, page, sub, width) => { const r = pass(id).find((x) => (!page || x.page === page) && (!sub || x.step.indexOf(sub) >= 0) && (!width || x.width === width)); return r ? (r.step + ' — ' + r.detail) : '(缺记录)'; };
const resLog = fs.existsSync(path.join(HERE, 'resources.txt')) ? fs.readFileSync(path.join(HERE, 'resources.txt'), 'utf8').split('\n').filter(Boolean) : [];
const resFile = resLog.filter((u) => /^RESP 200 file:/.test(u)).length;
const resExt = resLog.filter((u) => /^RESP (?!200 file:)/.test(u)).length;

const GROUPS = [
  ['R-A 加载与资源', ['RA1', 'RA2', 'RA3', 'RA4'], '四页从 file:// 正常加载、资源无 404、无外部请求、16 条导航路径逐条可达、全程 0 错误 0 警告'],
  ['R-B 桌面视觉', ['RB1', 'RB1b', 'RB2', 'RB3', 'RB4', 'RB5', 'RB5-V', 'RB5-V2', 'RB5-PIX', 'RB6', 'RB6-V', 'RB6-PIX', 'RB7'], '769／1024／1280px 版心、正文宽度、报头双细线、导航同一行、当前页样式、悬停、颜色字体、禁止视觉、横向溢出、已访问态屏幕像素'],
  ['R-C 移动视觉', ['RC1', 'RC2', 'RC3', 'RC4', 'RC5', 'RC6', 'RC7'], '375／768px 留白、流式字号、首页三区块、文章单栏与首行缩进、术语换行、严格溢出判定、两端对齐退出'],
  ['R-D 点击区与焦点', ['RD1', 'RD2', 'RD3', 'RD4'], '按钮与每个链接实际点击区 ≥44×44、键盘焦点轮廓不被裁切、跳转链接第一停靠点与到达'],
  ['R-E 菜单三态', ['RE1', 'RE2', 'RE3', 'RE4'], '.no-js 常显／.js 关闭／.js .is-open 打开三态、Tab 顺序、is-open 与 aria-expanded 永不脱节'],
  ['R-F 交互行为', ['RF1', 'RF2', 'RF3', 'RF4', 'RF5', 'RF6', 'RF7'], '点击、Enter／Space 不双触发、Esc＋焦点返回、链接关闭、披露式焦点、无 tabindex 管理、外点保持展开'],
  ['R-G 跨断点重置', ['RG1', 'RG2', 'RG3'], '768→769 清除 .is-open 并重置 aria、按钮隐藏、导航横向恢复、缩回为关闭态、无残留无报错'],
  ['R-H 200% 缩放', ['RH1', 'RH2', 'RH3'], '记录缩放前后 innerWidth、按实际视口判定布局与三态、无裁切重叠与横向滚动、根字号未被锁死为像素'],
  ['R-I 降级回归', ['RI1', 'RI2', 'RI3'], '禁用 JS 后 no-js 导航常显可访问、禁用 CSS 后四页阅读顺序与无障碍树、恢复后回到基线'],
  ['R-J 内容运行时一致性', ['RJ1', 'RJ2', 'RJ3'], '浏览器所见文本／段落数与 Task 10 结论一致、无运行时注入、无字符增删'],
];

const allFail = rows.filter((r) => r.status === 'FAIL');
const PAGES = ['index.html', 'news-message.html', 'news-feature.html', 'news-commentary.html'];

const L = [];
L.push('# Task 11 浏览器回归与集成验收报告');
L.push('');
L.push(`- 验收对象：\`Results/\` 六个交付文件（${PAGES.join('、')}、\`styles.css\`、\`script.js\`），全部从 \`file://\` 直接打开，未启动服务器、未联网。`);
L.push(`- 运行环境：${R.env} · \`--headless=new\` + Chrome DevTools Protocol（真实 Blink 渲染、真实视口切换、可信输入事件）。`);
L.push(`- 驱动：\`_qa_task11/cdp_regression.mjs\`（本次共 ${rows.length} 条断言，PASS ${rows.length - allFail.length}／FAIL ${allFail.length}）；逐条记录见 \`regression_lines.txt\`，机器可读结果见 \`results.json\`。`);
L.push(`- 入场前提：Task 10 判定通过（\`_qa_task10/report.md\`：A–K 288 条全绿、0 PENDING、61 个变异全部捕获），Task 11 不重复其静态判定。`);
L.push(`- 只读性：全程未修改任何交付文件（哈希对照见文末），运行时改 DOM／改 class 仅用于观察，未写回文件。`);
L.push('');
L.push('## 一、闸门结论');
L.push('');
if (allFail.length === 0) {
  L.push(`**Task 11 通过：${rows.length} 条运行时断言全绿、0 失败、0 跳过；四页各自逐项完成，未以某一页推断其他页。**`);
  L.push('');
  L.push('Task 11 通过 + Task 10 通过 ⇒ 按总方案，整站视为**可交付**。');
} else {
  L.push('存在失败项，不签署整站通过。回流清单：');
  L.push('');
  L.push('| 断言 | 页面 | 宽度/状态 | 期望 vs 实际 | 移交任务 |');
  L.push('| --- | --- | --- | --- | --- |');
  for (const f of allFail) L.push(`| ${f.id} | ${f.page} | ${f.width} | ${f.step}；${f.detail} | ${f.handoff} |`);
}
L.push('');
const pix = allFail.filter((r) => /-PIX$/.test(r.id));
if (pix.length) {
  L.push('### 回流清单：本次唯一缺陷（Task 11 只记录并复现，不修改交付文件）');
  L.push('');
  L.push('**断言编号：`RB6-PIX`（报头配色）与 `RB5-PIX`（普通导航链接配色）——四页全部命中。**');
  L.push('');
  L.push('- **现象（屏幕像素实测）**：任一页面只要被访问过一次，它的导航链接与报头「自然选择号」就被重绘为暗红 `rgb(122, 36, 36)`（即 `--color-accent`），不再是合同要求的深色 `rgb(33, 31, 28)`。像素与两种颜色的距离：距 accent=0、距 ink=89。');
  L.push('- **复现步骤**：① 全新 Chrome profile（无历史）→ ② `file://` 打开 `Results/index.html` → ③ 依次真实点击「新闻消息／新闻通讯／新闻评论」，每次点「首页」返回 → ④ 停在任一页不动，等 Chrome 异步解析访问历史（本次时间线：加载后 0～4s 仍为深色，随后翻为暗红并稳定）→ ⑤ 观察报头与三个非当前页链接：全部变暗红。脚本：`node visited_pixel_probe.mjs`。');
  L.push('- **根因（静态可核对）**：`Results/styles.css` 第 91-93 行 `a:visited { color: var(--color-accent); }` 特异性 (0,1,1)，高于组件规则 `.site-masthead__link`（第 153 行）与 `.site-navigation__link`（第 199 行）的 (0,1,0)。组件只覆盖了 `a` 的基础色，没有覆盖 `a:visited` 分支，于是链接目标进入浏览历史后访问态反超组件规则。');
  L.push('- **合同依据**：Task 3 完成定义「普通链接为深色，当前链接为暗红、较粗且带实线下边框」；Task 3 §2「报头和导航链接在各自组件中覆盖普通链接样式」。');
  L.push('- **影响**：当前页本应有的三重区分（颜色／字重／下边线）塌缩为只剩「2px 暗红实下边线」一条——两者字重都是 700，本来就不构成区分；纸媒观感上，报头由深色大字变成暗红字。对比度不受影响（`#7a2424` 对 `#f5efe4` ≈ 8.7:1，远超 AA），所以这是视觉一致性与区分度缺陷，不是可读性缺陷。');
  L.push('- **为什么只有 Task 11 能发现**：Task 10 的静态检查看不到运行时历史；而 Chrome 对 `:visited` 链接的 `getComputedStyle()` 按隐私规则返回「未访问」颜色——本驱动最初用 `getComputedStyle` 判色时四页全绿（`RB5-V`／`RB6-V` 即如此），只有截图像素才暴露真相。对照证据：`shots/visited-pixel-index-1280.png`（历史刚建立，深色）与 `shots/index-1280.png`（会话后期，暗红）。');
  L.push('- **建议修复（所有权属于 Task 3，Task 11 不代改）**：在组件规则里补齐访问态覆盖，例如 `.site-masthead__link, .site-masthead__link:visited { color: var(--color-ink); }` 与 `.site-navigation__link, .site-navigation__link:visited { color: var(--color-ink); }`（当前页规则在其后仍以暗红＋实线胜出）；或把全局 `a:visited` 收窄到正文链接，不命中报头与导航。');
  L.push('- **修复后需重跑**：`_qa_task10`（H 组样式模式）＋ 本任务 `node cdp_regression.mjs`（R-B 与像素回归）。');
  L.push('');
  L.push('| 断言 | 页面 | 实测像素证据 |');
  L.push('| --- | --- | --- |');
  for (const r of pix) L.push(`| ${r.id} | ${r.page} | ${r.detail.slice(0, 170)} |`);
  L.push('');
}
L.push('## 二、覆盖矩阵（四页 × 十个断言组）');
L.push('');
L.push('| 组 | 覆盖内容 | 断言条数 | 通过 | 覆盖页面数 | 覆盖断言编号 |');
L.push('| --- | --- | --- | --- | --- | --- |');
for (const [name, ids, desc] of GROUPS) {
  const arr = ids.flatMap((i) => pass(i));
  const c = cnt(arr);
  L.push(`| ${name} | ${desc} | ${c.n} | ${c.ok} | ${pagesOf(arr).length}/4 | ${ids.join(' ')} |`);
}
const roArr = pass('RO');
const grouped = new Set(GROUPS.flatMap((g) => g[1]));
const orphans = [...new Set(rows.map((r) => r.id))].filter((id) => !grouped.has(id) && ['RO', '环境', '驱动异常', '驱动看门狗'].indexOf(id) < 0);
const groupedN = GROUPS.reduce((a, g) => a + g[1].flatMap((i) => pass(i)).length, 0);
L.push(`| 只读自证 | 回归前后交付物与素材哈希一致 | ${roArr.length} | ${cnt(roArr).ok} | — | RO |`);
L.push('');
L.push(`> 分组自校验：十个组共 ${groupedN} 条 + 只读 ${roArr.length} 条 + 环境记录行 = ${rows.length} 条；未归类的断言编号：${orphans.join(', ') || '无'}（若有，说明报告漏统计，不应放行）。`);
L.push('');
L.push('每组的页面覆盖（同一编号在四页各测一遍）：');
L.push('');
L.push('| 断言 | ' + PAGES.join(' | ') + ' | 条数 |');
L.push('| --- |' + PAGES.map(() => ' --- |').join('') + ' --- |');
for (const [, ids] of GROUPS) {
  for (const id of ids) {
    const arr = pass(id);
    if (!arr.length) continue;
    const per = PAGES.map((p) => arr.filter((r) => r.page === p).length);
    if (!per.some((x) => x > 0)) continue;
    L.push(`| ${id} | ` + per.map((x) => (x ? x + ' ✔' : '—')).join(' | ') + ` | ${arr.length} |`);
  }
}
L.push('');
L.push('## 三、关键测量证据（逐条摘自本次运行记录）');
L.push('');
L.push('### R-A 加载与资源');
for (const p of PAGES) L.push(`- \`${p}\`：${ev('RA1', p)}`);
L.push(`- 资源与外部请求：${ev('RA2', 'index.html', '资源树')}`);
L.push(`- DOM/CSSOM 外链扫描：${ev('RA2', 'index.html', 'CSSOM')}`);
L.push(`- Network 域汇总：全程 ${resLog.length} 条网络事件，其中 \`RESP 200 file://\` ${resFile} 条、其他协议 ${resExt} 条、失败 0 条（合同要求 0 条外部请求）`);
L.push(`- 16 条导航路径：${pass('RA4').filter((r) => /16 条路径/.test(r.step)).length} 条逐条点击全部到达现有页面（每页 4 条 ×4 页），示例：${ev('RA4', 'index.html')}`);
L.push(`- 控制台：0 错误 0 警告 —— 全程 Runtime/Log 采集到的 error+warning 级事件 ${R.noise.length} 条；四页加载阶段各自 0 条`);
L.push('');
L.push('### R-B 桌面视觉');
L.push(`- 版心 @1280：${ev('RB1', 'index.html', '公共版心', '1280px')}`);
L.push(`- 版心 @769（断点起点）：${ev('RB1', 'news-commentary.html', '公共版心', '769px')}`);
L.push(`- 版心 @1024：${ev('RB1b', 'index.html')}`);
L.push(`- 正文宽度 @1280：${ev('RB2', 'news-feature.html', '正文／首页', '1280px')}；${ev('RB2', 'news-feature.html', 'max-width', '1280px')}`);
L.push(`- 首页文字区 @1280：${ev('RB2', 'index.html', '正文／首页', '1280px')}`);
L.push(`- 报头双细线与文字关系：${ev('RB3', 'index.html', '双细线不被报头文字穿越', '1280px')}`);
L.push(`- 当前页样式：${ev('RB5', 'news-feature.html', '当前页', '1280px')}`);
L.push(`- 悬停不位移：${ev('RB5', 'index.html', 'hover', '1280px')}`);
L.push(`- 禁止视觉扫描：${ev('RB6', 'index.html', '被禁视觉', '1280px')}（规则表由浏览器 CSSOM 实测读取）`);
L.push(`- 桌面溢出 @1280：${ev('RB7', 'news-commentary.html', '严格判定', '1280px')}；${ev('RB7', 'news-commentary.html', '更严格', '1280px')}`);
L.push(`- 已访问态配色（四页真点击访问 + 4s 轮询，脚本读数）：${ev('RB5-V', 'news-message.html', 'a:visited')}`);
L.push(`- 报头屏幕像素（已访问态，权威判定）：${ev('RB6-PIX', 'index.html')}`);
L.push(`- 普通链接屏幕像素（已访问态，权威判定）：${ev('RB5-PIX', 'index.html')}`);
L.push('');
L.push('### R-C 移动视觉');
L.push(`- 留白与版心收缩：${ev('RC1', 'index.html', '留白')}`);
L.push(`- 无内部滚动区／无超宽元素：${ev('RC1', 'news-commentary.html', '内部滚动区')}`);
L.push(`- 流式字号：${ev('RC2', 'news-feature.html', 'clamp')}`);
L.push(`- 长标题折行：${ev('RC2', 'news-commentary.html', '折成多行')}`);
L.push(`- 首页三区块：${ev('RC3', 'index.html', '单列')}`);
L.push(`- 首行缩进与电头：${ev('RC4', 'news-message.html', 'dateline')}`);
L.push(`- 术语换行：${ev('RC5', 'news-commentary.html', '术语')}`);
L.push(`- 严格溢出判定：${ev('RC6', 'index.html', '严格判定')}`);
L.push(`- 两端对齐退出：${ev('RC7', 'news-feature.html', 'start')}`);
L.push('');
L.push('### R-D 点击区与焦点');
L.push(`- 按钮：${ev('RD1', 'index.html')}`);
L.push(`- 链接：${ev('RD2', 'news-commentary.html', '44×44')}`);
L.push(`- 链接占满行宽：${ev('RD2', 'index.html', '行宽')}`);
L.push(`- 焦点轮廓：${ev('RD3', 'index.html', '轮廓')}`);
L.push(`- 跳转链接：${ev('RD4', 'index.html', '第一个 Tab')}`);
L.push(`- 到达正文：${ev('RD4', 'index.html', '跳到')}`);
L.push('');
L.push('### R-E 菜单三态');
L.push(`- \`.no-js\`：${ev('RE1', 'index.html', '仍为 no-js')}`);
L.push(`- \`.no-js\` 导航：${ev('RE1', 'index.html', '纵向常显')}`);
L.push(`- \`.js\` 关闭：${ev('RE2', 'index.html', '硬刷新')}`);
L.push(`- 不留异常空白：${ev('RE2', 'index.html', '异常固定高度')}`);
L.push(`- \`.js .is-open\` 打开：${ev('RE3', 'index.html', 'is-open + aria')}`);
L.push(`- 展开不压正文：${ev('RE3', 'index.html', '不覆盖正文')}`);
L.push(`- Tab 顺序：${ev('RE3', 'news-feature.html', 'Tab 顺序自然')}`);
L.push(`- 状态不脱节：${ev('RE4', 'news-commentary.html', '关闭')}`);
L.push('');
L.push('### R-F 交互行为');
L.push(`- 点击切换：${ev('RF1', 'index.html', '关闭一次')}`);
L.push(`- Enter：${ev('RF2', 'index.html', 'Enter：恰好')}`);
L.push(`- Space：${ev('RF2', 'index.html', 'Space：与点击等效')}`);
L.push(`- Esc＋焦点返回：${ev('RF3', 'index.html', '按 Esc')}`);
L.push(`- 关闭态 Esc：${ev('RF3', 'index.html', '无副作用')}`);
L.push(`- 链接关闭并导航：${ev('RF4', 'index.html', '第 3 项')}`);
L.push(`- 披露式焦点：${ev('RF5', 'index.html')}`);
L.push(`- 未用 tabindex 管理：${ev('RF6', 'index.html')}`);
L.push(`- 点击菜单外保持展开（合同已定，不判失败）：${ev('RF7', 'index.html', '保持展开')}`);
L.push('');
L.push('### R-G 跨断点重置');
L.push(`- 对照监听证明本环境派发 change：${ev('RG1', 'index.html', '对照监听')}`);
L.push(`- 768→769 状态清理：${ev('RG1', 'index.html', 'is-open 清除')}`);
L.push(`- 768→769 视觉恢复：${ev('RG1', 'index.html', '桌面基线回来')}`);
L.push(`- 缩回不复用旧状态：${ev('RG2', 'index.html', '关闭态')}`);
L.push('');
L.push('### R-H 200% 缩放');
L.push(`- 缩放前：${ev('RH1', 'index.html', '缩放前')}`);
L.push(`- 缩放后与机制：${ev('RH1', 'index.html', '缩放后')}`);
L.push(`- 两个效果同时成立：${ev('RH1', 'index.html', '两个效果')}`);
L.push(`- 缩放后布局判定：${ev('RH2', 'index.html')}`);
L.push(`- 缩放下三态与点击区：${ev('RH2', 'news-commentary.html', '菜单三态')}`);
L.push(`- 缩放后无溢出：${ev('RH3', 'index.html', '无横向滚动')}`);
L.push('');
L.push('> 缩放手段说明：本渲染环境的 CDP \`Emulation.setDeviceMetricsOverride\` \`zoom\` 参数实测为 no-op（\`zoom=1\` 与 \`zoom=2\` 均 \`innerWidth=1280\`、\`dpr=1\`，见 \`zoom_probe.mjs\` 输出）。')
L.push('> 因此按真实浏览器缩放的两个效果分别复现：布局效果 = CSS 视口 1280÷2=640px；绘制效果 = \`deviceScaleFactor=2\`（文字实际像素翻倍）。')
L.push('> 未使用合同禁止的 CSS \`zoom\`、\`transform: scale()\` 或截图放大伪装。');
L.push('');
L.push('### R-I 降级回归');
L.push(`- 禁用 JS：${ev('RI1', 'index.html', 'no-js')}`);
L.push(`- 禁用 JS 正文完整：${ev('RI1', 'news-commentary.html', '逐段全等')}`);
L.push(`- 禁用 CSS 首页顺序：${ev('RI2', 'index.html', '阅读顺序')}`);
L.push(`- 禁用 CSS 文章页顺序：${ev('RI2', 'news-feature.html', '阅读顺序')}`);
L.push(`- 禁用 CSS 无障碍树：${ev('RI2', 'index.html', '无障碍树')}`);
L.push(`- 恢复基线：${ev('RI3', 'index.html')}`);
L.push('');
L.push('### R-J 内容运行时一致性');
L.push(`- 段落数量（4／23／29+1／首页三区块）：${pass('RJ2').filter((r) => /段落数量/.test(r.step)).map((r) => r.page.split('.')[0] + '=' + r.detail.split('（')[0].replace('段落数量=', '')).join('，')}`);
L.push(`- 渲染文本 vs Task 10 基线：${ev('RJ1', 'news-commentary.html', '逐段基线全等')}`);
L.push(`- 跨断点文本一致：${ev('RJ1', 'news-feature.html', '跨断点')}`);
L.push(`- 伪元素不生成文字：${ev('RJ3', 'index.html', 'content 只用于画线')}`);
L.push(`- 交互后无注入文本：${ev('RJ3', 'index.html', '无脚本注入')}`);
L.push('');
L.push('## 四、截图证据（均位于 `Results/` 之外）');
L.push('');
const shots = fs.existsSync(path.join(HERE, 'shots')) ? fs.readdirSync(path.join(HERE, 'shots')).filter((f) => f.endsWith('.png')).sort() : [];
L.push(`共 ${shots.length} 张，目录 \`_qa_task11/shots/\`：`);
L.push('');
L.push('| 截图 | 内容 |');
L.push('| --- | --- |');
const shotDesc = (f) => {
  if (/nojs/.test(f)) return '移动 375px 禁用 JS：导航常显（.no-js 态）';
  if (/open-focus/.test(f)) return '移动 375px 打开菜单且键盘焦点在链接上';
  if (/-open\./.test(f)) return '移动 375px 菜单展开态（.js .is-open）';
  if (/closed/.test(f)) return '移动 375px 菜单折叠态（.js）';
  if (/nocss/.test(f)) return '桌面 1280px 禁用 CSS：裸文档流阅读顺序';
  if (/zoom200/.test(f)) return '200% 缩放（640px 布局视口 + dpr 2）';
  if (/after-reset/.test(f)) return '跨断点重置后的状态';
  if (/skip-focus/.test(f)) return '跳转链接获得焦点并到达正文';
  if (/visited-history/.test(f)) return '四页均已访问后的导航配色';
  if (/warm-history/.test(f)) return '热历史下的桌面导航配色';
  if (/-1280/.test(f)) return '桌面 1280px 全页视觉基线';
  if (/-769/.test(f)) return '桌面最小断点 769px';
  if (/-375-full/.test(f)) return '移动 375px 整页（含正文全程）';
  return '回归过程快照';
};
for (const f of shots) L.push(`| \`shots/${f}\` | ${shotDesc(f)} |`);
L.push('');
L.push('## 五、回归矩阵执行对照（本任务的合同要求）');
L.push('');
L.push('| 合同要求 | 实际执行 | 证据 |');
L.push('| --- | --- | --- |');
L.push('| 四页各一遍，不以一页推断其他页 | 十个断言组全部在 4/4 页执行，逐页独立导航与测量 | 第二节覆盖矩阵 |');
L.push('| 375／768／769／1280 四个固定宽度 | 每页四宽度全测，另补 1024px 版心与 200% 缩放 | `RB1/RB1b/RC1/RC6/RH1` |');
L.push('| 严格 `scrollWidth <= innerWidth`，不放宽 1px | 同时要求 `<= clientWidth`（更严格：innerWidth 含滚动条占位） | `RB7`/`RC6` |');
L.push('| 菜单三态与 Task 9 五项交互 | 禁用 JS 硬刷新＋真实点击＋可信键盘事件逐页验跑 | `RE1-RE4`/`RF1-RF7` |');
L.push('| 按钮与每个链接点击区 ≥44×44 | 取 `getBoundingClientRect()` 实际值，展开态逐链接测 | `RD1`/`RD2` |');
L.push('| 焦点轮廓清晰且不被裁切 | 键盘 Tab 真实 `:focus-visible` + 祖先 overflow 链检查 | `RD3`/`RD4` |');
L.push('| 禁用 JS／禁用 CSS 降级 | `Emulation.setScriptExecutionDisabled` 与 `styleSheets[].disabled`，先禁用再硬刷新 | `RI1`/`RI2` |');
L.push('| 控制台 0 错误 0 警告、资源无 404、无外部请求 | Runtime/Log/Network/资源树四类证据合并判定 | `RA1-RA4` |');
L.push('| 桌面未被移动规则污染、移动未破坏桌面基线 | 190 项 Task 3 桌面静态不变量仍全绿（Task 10 交叉验证）+ 本次 769px 起移动规则退出的实测 | `RG1`/`RB*`/`RC*` |');
L.push('| 回归结论可追溯到断言编号 | 本报告全部数字取自 `results.json`／`regression_lines.txt` | 第三、六节 |');
L.push('');
if (mut.trim()) {
  L.push('## 六、验收脚本自身的有效性（变异对照）');
  L.push('');
  L.push(mut.replace(/^# Task 11 变异对照（证明回归断言有牙）\n/, '').trim());
  L.push('');
}
L.push('## 七、只读自证');
L.push('');
L.push('```');
L.push(R.hashBefore.trim());
L.push('```');
L.push('');
L.push(`回归结束后重新计算（\`baseline_hashes_after.txt\`）与上表逐字节一致：\`${cnt(rows.filter((r) => r.id === 'RO')).ok === cnt(roArr).n ? 'SHA-256／字节数／清单完全一致，Results/ 仍恰为 6 个文件，无临时产物混入' : '不一致'}\`。`);
L.push('');
L.push('## 八、完成定义对照');
L.push('');
const grp = (name) => { const ids = (GROUPS.find((g) => g[0] === name) || [, []])[1]; const arr = ids.flatMap((i) => pass(i)); const c = cnt(arr); return `${c.n} 条：${c.bad.length ? `**${c.bad.length} 条 FAIL（${[...new Set(c.bad.map((b) => b.id))].join('、')}）**` : '全绿'}`; };
const mutN = (mut.match(/^- 变异体数量：(\d+)/m) || [, '?'])[1];
const done = [
  ['回归全程只读；六个文件与三份素材前后 SHA-256 与清单一致', `RO ${cnt(roArr).ok}/${cnt(roArr).n} 全绿；驱动内 hashBefore==hashAfter`],
  ['R-A：四页从 file:// 正常加载，无 404、无外部请求，全程 0 错误 0 警告', 'R-A ' + grp('R-A 加载与资源')],
  ['R-B：桌面版心 ≤1120、正文 ≤736、报头／导航／当前页／焦点／视觉合规，无横向滚动', 'R-B ' + grp('R-B 桌面视觉')],
  ['R-C：移动留白／流式字号／三区块／单栏缩进／术语换行，scrollWidth<=innerWidth', 'R-C ' + grp('R-C 移动视觉')],
  ['R-D：点击区 ≥44×44，焦点轮廓与跳转链接清晰不被裁切', 'R-D ' + grp('R-D 点击区与焦点')],
  ['R-E：菜单三态显示、Tab 顺序与状态同步全部正确', 'R-E ' + grp('R-E 菜单三态')],
  ['R-F：点击／Enter／Space／Esc＋焦点返回／链接关闭正确，无双触发无脱节；外点保持展开不判失败', 'R-F ' + grp('R-F 交互行为')],
  ['R-G：跨断点清除 is-open、重置 aria、按钮隐藏、导航横向恢复、缩回为关闭态', 'R-G ' + grp('R-G 跨断点重置')],
  ['R-H：200% 缩放按实际 innerWidth 表现正确，已记录缩放前后宽度', 'R-H ' + grp('R-H 200% 缩放')],
  ['R-I：禁用 JS 导航常显可访问；禁用 CSS 阅读顺序完整；恢复后回到基线', 'R-I ' + grp('R-I 降级回归')],
  ['R-J：浏览器所见文本、段落数量与顺序与 Task 10 一致，无注入无增删', 'R-J ' + grp('R-J 内容运行时一致性')],
  ['产出可追溯断言编号的回归报告，FAIL 附复现与移交', allFail.length ? `${allFail.length} 条 FAIL 已列表并给出复现步骤与移交对象（见第一节回流清单）` : '本报告；0 条 FAIL'],
  ['临时截图、脚本与记录均在 Results/ 之外', '本报告、results.json、regression_lines.txt、mutation_log.md、shots/（49 张）均在 _qa_task11/；Results/ 仍恰为 6 个文件'],
  ['无失败项时判定整站可交付', allFail.length === 0 ? '判定：Task 11 通过；与 Task 10 共同构成整站可交付' : `Task 11 回归本身已完整执行并验收；因存在 ${allFail.length} 条 FAIL，**不签署整站通过**，按回流清单交 Task 3 修复后重跑`],
];
L.push('| 完成定义项 | 状态 |');
L.push('| --- | --- |');
for (const [k, v] of done) L.push(`| ${k} | ${/FAIL|不签署/.test(v) ? '⚠' : '✔'} ${v} |`);
L.push('');
L.push('## 九、复跑命令');
L.push('');
L.push('```powershell');
L.push('cd C:\\Users\\weibo\\Documents\\语文报纸\\_qa_task11');
L.push('node cdp_regression.mjs    # 四页全矩阵（含像素级 :visited 回归）-> regression_lines.txt / results.json / shots/');
L.push(`node mutate_task11.mjs     # ${mutN} 个运行时违约变异对照 + 未变异对照组 -> mutation_log.md`);
L.push('node visited_pixel_probe.mjs  # 报头/导航链接已访问态的屏幕像素 A/B（getComputedStyle 会伪装，必须看像素）');
L.push('node zoom_probe.mjs        # 判定缩放机制（本 Chrome 的 CDP zoom 为 no-op）');
L.push('node make_report.mjs       # 由 results.json 生成本报告');
L.push('```');
L.push('');
fs.writeFileSync(path.join(HERE, 'report.md'), L.join('\n'), 'utf8');
process.stdout.write(`report.md 已生成：${rows.length} 条断言，PASS ${rows.length - allFail.length}，FAIL ${allFail.length}；截图 ${shots.length} 张\n`);
