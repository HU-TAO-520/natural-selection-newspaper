/* Task 19 — 合同解析器（驱动的一切期望值都从这里来，不许在驱动里写死）
 *
 * 权威顺序（Task19 §输入与权威顺序）：
 *   1. deploy/manifest.json        页遍历清单 / 栏目→文章映射 / 条目次序真值
 *   2. plan/Task12                 扩展矩阵（每页 title、h1、aria-current 归属）与 R1–R11
 *   3. plan/Task4 + plan/Task0     首页三段冻结字面值（逐字符）
 *   4. plan/Task1 + _qa_task13     详情页浏览器可见文本基线（逐段码点）
 *   5. plan/Task0                  断点与状态合同、离线 file:// 约束
 *   6. plan/Task19 自身            断言下限、视口档位、触控下限、压力样本条数、三个核对数字
 *   7. _qa_task18/report.md        前置闸门结论
 * 解析不到即抛错（宁可拒绝出结论，也不回退成常量）。
 */
import fs from 'node:fs';
import path from 'node:path';
import fileURL from 'node:url';
import { contract as TASK20 } from '../_qa_task20/contract20.mjs';

export const HERE = path.dirname(fileURL.fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..');
export const REPORT_DIR = path.resolve(process.env.QODER_REPORT_DIR || HERE);
export const FACTS_PATH = path.resolve(process.env.QODER_FACTS || path.join(HERE, 'facts.json'));
export const TASK18_REPORT_PATH = path.resolve(process.env.QODER_TASK18_REPORT || path.join(ROOT, 'qa/_qa_task18/verify_report.md'));
export const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const planMd = (name) => {
  const f = fs.readdirSync(path.join(ROOT, 'plan')).find((x) => x.startsWith(name));
  if (!f) throw new Error('缺少计划文件：' + name);
  return rd(path.join('plan', f));
};

function need(cond, msg) { if (!cond) throw new Error('合同解析失败：' + msg); return cond; }
const unback = (s) => (String(s).match(/`([^`]+)`/) || [])[1];
const allBack = (s) => (String(s).match(/`([^`]+)`/g) || []).map((x) => x.replace(/`/g, ''));
const tableRows = (seg) => seg.split('\n').filter((l) => /^\|/.test(l)).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
/* 取 marker 之后**第一张连续**管道表的数据行。同一节里往往还跟着别的表，
 * 全文级 tableRows 会把它们混进来（菜单三态表实测就被并进了 13 行）。 */
function firstTableAfter(seg, marker) {
  const i = seg.indexOf(marker);
  need(i >= 0, '锚点缺失：' + marker);
  const lines = seg.slice(i).split('\n');
  const start = lines.findIndex((l) => /^\|/.test(l));
  need(start >= 0, '锚点后没有表格：' + marker);
  const block = [];
  for (let k = start; k < lines.length && /^\|/.test(lines[k]); k++) block.push(lines[k]);
  return block.slice(2).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
}
function sliceSection(md, headingText, stop = '\n## ') {
  const i = md.indexOf(headingText);
  need(i >= 0, '锚点缺失：' + headingText);
  const j = md.indexOf(stop, i + headingText.length);
  return md.slice(i, j < 0 ? md.length : j);
}
const hexToRgb = (h) => { const m = String(h).match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i); need(m, '不是合法十六进制色值：' + h); const x = m[1]; const six = x.length === 3 ? x.split('').map((c) => c + c).join('') : x; return [0, 2, 4].map((i) => parseInt(six.slice(i, i + 2), 16)); };

export function loadContract() {
  const manifest = JSON.parse(rd('deploy/manifest.json'));
  const task12 = planMd('Task12');
  const task0 = planMd('Task0');
  const task4 = planMd('Task4');
  const task1 = planMd('Task1');
  const task19 = planMd('Task19');
  const css = fs.readFileSync(path.join(ROOT, 'Results', 'styles.css'), 'utf8');
  const baseline13 = JSON.parse(rd(path.join('qa/_qa_task13', 'extracted_baseline.json')));
  const gate18 = fs.readFileSync(TASK18_REPORT_PATH, 'utf8');

  /* ---- 1. 遍历清单：manifest.pages 的 HTML 子集（不扫目录） ---- */
  const allHtmlPages = manifest.pages.filter((p) => /\.html$/i.test(p.path)).map((p) => p.path).sort();
  const errorPage = allHtmlPages.includes('404.html') ? '404.html' : null;
  need(errorPage, 'manifest.pages 缺线上专用 404.html（R13）');
  const eggPages = [TASK20.main.egg_html].filter((p) => allHtmlPages.includes(p));
  const htmlPages = allHtmlPages.filter((p) => p !== errorPage && !eggPages.includes(p));
  const paperPages = htmlPages.slice();
  const ordinaryHtmlPages = paperPages.concat(eggPages).sort();
  need(eggPages.length === 1 && new Set(paperPages.concat(eggPages, [errorPage])).size === allHtmlPages.length
    && paperPages.concat(eggPages, [errorPage]).every((p) => allHtmlPages.includes(p))
    && allHtmlPages.length === manifest.counts.html && ordinaryHtmlPages.length + 1 === manifest.counts.html,
    'R14 allHtmlPages 必须由 paperPages + eggPages + errorPage 无交叠覆盖');

  /* ---- 2. 扩展矩阵 → 每页 title / h1 / aria-current ---- */
  const mseg = sliceSection(task12, '### `<title>`、`<h1>` 与 `aria-current` 扩展矩阵', '\n### ');
  const mrows = firstTableAfter(mseg, '### ');
  need(mrows.length >= 5, '扩展矩阵行数不足：' + mrows.length);
  const suffixM = mseg.match(/<title>` 一律带全角 `([^`]+)` 后缀/);
  need(suffixM, '矩阵未登记 <title> 后缀');
  const titleSuffix = suffixM[1];
  const matrix = {};
  for (const r of mrows) {
    const page = unback(r[0]);
    need(page, '矩阵行页面名解析失败：' + r[0]);
    matrix[page] = { titleCell: r[1], h1Cell: r[2], ariaCell: r[3], listRow: /列表/.test(r[0]), detailRow: /详情/.test(r[0]) };
  }
  need(matrix['index.html'], '矩阵缺 index.html 行');
  need(matrix['article-<slug>.html'], '矩阵缺详情页模式行');
  const colByList = {};
  for (const col of manifest.columns) colByList[col.list] = col;
  const colByArticle = {};
  for (const col of manifest.columns) for (const a of col.articles) colByArticle[a.page] = col;

  /* 标题主体解析：详情页取文章标题（矩阵声明"逐字 = Task1 的 title"），列表页取栏目标签 */
  const titleSubject = {};
  const h1Expected = {};
  const ariaExpected = {};
  const migrated = [];
  const fresh = [];
  for (const p of htmlPages) {
    let row = matrix[p];
    if (!row) { need(p.startsWith('article-'), '矩阵里没有这一页的模式：' + p); row = matrix['article-<slug>.html']; }
    let ts;
    if (/文章标题/.test(row.titleCell)) {
      const art = colByArticle[p];
      need(art, '详情页找不到所属栏目：' + p);
      const a = art.articles.find((x) => x.page === p);
      ts = a.title;
      /* R12：Task1 只登记迁移三篇。新稿的权威文本是它自己的 md（已由 manifest 承载），
         因此这里按"是否在 Task1 内"分流，而不是要求所有稿件都出自 Task1。 */
      if (new RegExp('`' + a.slug + '`|' + a.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(task1)) migrated.push(p); else fresh.push(p);
    } else {
      ts = unback(row.titleCell);
      need(ts, '矩阵标题主体解析失败：' + p);
      if (colByList[p]) need(colByList[p].label === ts, '矩阵 <title> 主体与 manifest 栏目标签不一致：' + p + ' [' + ts + '] vs [' + colByList[p].label + ']');
    }
    titleSubject[p] = ts;
    h1Expected[p] = /同 `<title>` 主体/.test(row.h1Cell) ? ts : unback(row.h1Cell);
    need(h1Expected[p], '矩阵 h1 解析失败：' + p);
    ariaExpected[p] = /所属栏目页/.test(row.ariaCell) ? colByList && colByArticle[p] && colByArticle[p].list : unback(row.ariaCell);
    need(ariaExpected[p], '矩阵 aria-current 解析失败：' + p);
  }
  /* R12 守卫：分流不能变成"谁都不比"——Task1 登记的每一篇都必须对上稿件集合里的唯一一篇。 */
  const t1Titles = [...task1.matchAll(/^title\|(.+)$/gm)].map((m) => m[1]);
  need(t1Titles.length >= 3, 'Task1 合同里解析到的 title 行数异常：' + t1Titles.length);
  for (const t of t1Titles) {
    const hits = migrated.filter((p) => titleSubject[p] === t);
    need(hits.length === 1, 'Task1 的标题「' + t + '」应恰好对应 1 张迁移详情页，实得 ' + hits.length);
  }
  need(migrated.length === t1Titles.length, '迁移页数量与 Task1 title 行数不符：' + migrated.length + ' vs ' + t1Titles.length + '（新稿 ' + fresh.length + ' 张走 md 权威）');
  /* ---- 3. 主导航规格（Task0：顺序与目标固定） ---- */
  const navSent = task0.match(/主导航顺序与目标固定：[^\n]+/);
  need(navSent, 'Task0 缺"主导航顺序与目标固定"句');
  const navSpec = [...navSent[0].matchAll(/([^\u3001、：]+)→`([^`]+)`/g)].map((m) => ({ text: m[1], href: m[2] }));
  need(navSpec.length === 5, '主导航规格应为 5 项（R15 第五项为投稿），实得 ' + navSpec.length);
  const navPaths = htmlPages.length * navSpec.length;

  /* ---- 4. 断点与状态合同（Task0） ---- */
  const bseg = sliceSection(task0, '## 断点与状态合同（全局一致）');
  const mob = bseg.match(/@media \(max-width: (\d+)px\)/);
  const des = bseg.match(/\(min-width: (\d+)px\)/);
  need(mob && des, '断点解析失败');
  const breakpoints = { mobileMax: Number(mob[1]), desktopMin: Number(des[1]) };
  need(breakpoints.desktopMin - breakpoints.mobileMax === 1, '768/769 不互补');
  const stateRows = firstTableAfter(bseg, '菜单三态');
  need(stateRows.length >= 4, '菜单三态表行数不足：' + stateRows.length);
  need(/no-js/.test(stateRows[0][1]) && /隐藏/.test(stateRows[0][4]), '菜单三态表首行不是"JS 不可用"态：' + JSON.stringify(stateRows[0]));

  /* ---- 5. 离线 file:// 约束（Task0）：正向验收条款 ---- */
  const offtxt = sliceSection(task0, '## 离线 `file://` 全局约束（不可违背）', '\n## ');
  need(/禁用 JavaScript[\s\S]*?禁用 CSS[\s\S]*?网络请求数为 \*\*0\*\*/.test(offtxt), 'Task0 缺"禁 JS／禁 CSS + 网络请求 0"正向验收条款');

  /* ---- 6. 首页三段冻结字面值（Task4 权威表） ---- */
  const fseg = sliceSection(task4, '### 1. 已冻结的字面值', '\n### ');
  const frozen = {};
  for (const r of tableRows(fseg).slice(2)) { const k = unback(r[0]), v = unback(r[2]); if (k && v) frozen[k] = v; }
  for (const k of ['P_ORIGIN', 'P_WORK', 'P_FOUNDED']) need(frozen[k], 'Task4 冻结表缺 ' + k);

  /* R4 可见内容白名单（14 项，按序） */
  const r4 = sliceSection(task12, '### R4 首页 DOM 计数与可见内容白名单的新值', '\n### ');
  const r4RevisedIdx = r4.indexOf('修订后条文');
  const wlM = r4.slice(r4RevisedIdx).match(/可见内容白名单按序 (\d+) 项[^：:]{0,4}[：:]([\s\S]*?)（其中/);
  need(wlM, 'R4 白名单条款解析失败');
  const whitelist = allBack(wlM[2]).map((x) => (/^P_(ORIGIN|WORK|FOUNDED)$/.test(x) ? frozen[x] : x));
  need(whitelist.length === Number(wlM[1]), 'R4 白名单项数 ' + whitelist.length + ' != ' + wlM[1]);
  /* 危险锚点：R4 的"既有原文"里先出现 v1 旧值 `{main:1,h1:1,div:1,section:3,h2:3,p:3}`，
   * 修订后条文才是新值。只在"修订后条文"之后取第一个计数对象，防止把 v1 旧值当期望。 */
  const r4Revised = r4.slice(r4.indexOf('修订后条文'));
  need(r4Revised.length > 20, 'R4 缺"修订后条文"段');
  const tallySrc = (r4Revised.match(/\{[^{}]*main:\s*1[^{}]*\}/) || [])[0];
  need(tallySrc, 'R4 标签计数解析失败');
  const r4Tally = {}; /* R14 之后首页标签计数的唯一机器真值在 plan/Task20 合同，下面按其覆盖 */
  for (const m of tallySrc.matchAll(/([a-z0-9]+):\s*(\d+)/g)) r4Tally[m[1]] = Number(m[2]);
  need(Object.keys(r4Tally).length >= 8, 'R4 标签计数项过少：' + JSON.stringify(r4Tally));
  for (const [tag, count] of Object.entries(TASK20.home.tags)) r4Tally[tag] = count;

  /* R11 全序键 + 最新区条数 */
  const r11 = sliceSection(task12, '### R11 首页最新区的选取与末位破序键', '\n### ');
  /* 排序全序取 §front-matter 字段合同 的规范单行（R11 的"既有原文"里还留着补 column 键之前的三键旧式） */
  const sortLine = task12.match(/排序全序[^\n：:]*[：:][^\n]+/);
  need(sortLine, '缺排序全序规范行');
  const sortKeys = sortLine[0];
  need(/column/.test(sortKeys), '排序全序未含 R11 补入的 column 键：' + sortKeys);
  need(sortKeys, 'R11 全序键解析失败');
  const latestN = (r11.match(/条数恒为 (\d+)/) || r11.match(/条数固定为 (\d+)/) || [])[1];
  need(latestN, 'R11 最新区条数解析失败');

  /* ---- 7. Task13 逐段基线 → 详情页期望 ---- */
  const detail = {};
  for (const [v1page, e] of Object.entries(baseline13.pages)) {
    const col = manifest.columns.find((c) => c.key === e.column);
    need(col, '基线栏目在 manifest 中不存在：' + e.column);
    const art = col.articles.find((a) => a.slug === e.slug);
    need(art, '基线文章在 manifest 中不存在：' + e.slug);
    need(htmlPages.includes(art.page), '基线页不在遍历清单：' + art.page);
    detail[art.page] = {
      source: v1page, paragraphs: e.paragraphs, paragraphCount: e.paragraph_count, paragraphCharTotal: e.paragraph_char_total,
      h1: e.h1, byline: e.byline, articleType: e.article_type, dateline: e.dateline, date: e.article_date,
      titleSubject: e.title_subject, titleFull: e.title_subject_full,
    };
    need(titleSubject[art.page] === e.title_subject, '矩阵标题主体与 Task13 基线不一致：' + art.page);
  }

  /* ---- 7b. 每篇稿件的 md 独立再解析一次（R12②：新稿的权威文本是自己的 md）。
        Task 19 不 import build.py，也不读它的结论；这里与构建器互不知情地解析同一批源文件。 ---- */
  const stripDl = (p) => (/^\*\*[^*]+\*\*/.test(p) ? p.replace(/^\*\*([^*]+)\*\*/, '$1') : p);
  /* 码点表与 Task13 基线同形（数组，驱动侧再 .join(' ') 与 DOM 实测比较）；
   * 实现必须与 cdp_regression19.mjs 的 cps() 逐字符一致，否则"基线"与"实测"来自两套口径。 */
  const cpsOf = (s) => Array.from(String(s)).map((ch) => 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'));
  const mdMeta = {};
  for (const col of manifest.columns) for (const a of col.articles) {
    const rel = 'content/articles/' + a.slug + '.md';
    need(fs.existsSync(path.join(ROOT, rel)), '缺内容源文件：' + rel);
    const raw = rd(rel).replace(/\r\n?/g, '\n');
    const fm = {};
    for (const line of raw.split('\n').slice(1)) { if (line === '---') break; const j = line.indexOf(': '); if (j > 0) fm[line.slice(0, j)] = line.slice(j + 2); }
    const blocks = (raw.split('---\n')[2] || '').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
    need(fm.title === a.title, 'md 的 title 与 manifest 不一致：' + a.slug);
    mdMeta[a.page] = { column: col, slug: a.slug, title: fm.title, byline: fm.byline, label: col.label,
                       date: fm.date || null, order: Number(fm.order || 0), end_date: fm.end_date || null,
                       dateline: /^\*\*/.test(blocks[0] || '') ? (blocks[0].match(/^\*\*([^*]+)\*\*/) || [null, null])[1] : null,
                       paragraphs: blocks.map(stripDl) };
  }
  const invDate = (s) => [...s].map((c) => String.fromCharCode(0x10ffff - c.codePointAt(0))).join('');
  const rankOf = (key) => String(manifest.columns.findIndex((c) => c.key === key)).padStart(2, '0');
  /* 全序：date 降序（缺失排末尾）→ order 升序 → 注册表栏目序 → slug 升序（R11②四键） */
  const globalOrder = Object.values(mdMeta)
    .map((m) => ({ key: (m.date ? '0' + invDate(m.date) : '1') + String(m.order).padStart(10, '0') + rankOf(m.column.key) + m.slug, m }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)).map((x) => x.m);
  const latestPages = globalOrder.slice(0, latestN).map((m) => m.slug).map((s) => 'article-' + s + '.html');
  for (const p of htmlPages.filter((x) => x.startsWith('article-'))) {
    if (detail[p]) continue;
    const m = mdMeta[p];
    need(m, 'manifest 里没有该详情页：' + p);
    /* 形状必须与 Task13 基线逐字段对齐（paragraphs 是对象数组、date/dateline 是 {present,text,codepoints} 结构）：
     * R-I／R-J 那几个段（禁用 JS、禁用 CSS、码点全等、末尾日期位置）都是按这个形状写的，
     * 给新稿塞裸字符串会让它们**静默不成立**（实测：判据读到 undefined 直接崩或整段跳过）。 */
    const paras = m.paragraphs.map((t, i) => ({
      index: i, text: t, codepoints: cpsOf(t), length: Array.from(t).length,
      u0020_count: t.split('\u0020').length - 1, dateline_text: i === 0 ? m.dateline : null,
    }));
    detail[p] = {
      source: 'content/articles/' + m.slug + '.md', paragraphs: paras, paragraphCount: paras.length,
      paragraphCharTotal: m.paragraphs.join('').length, h1: m.title, byline: m.byline, articleType: m.label,
      dateline: m.dateline ? { text: m.dateline, is_first_paragraph: true, paragraph_u0020_count: paras[0].u0020_count, followed_by_exactly_one_u0020: paras[0].u0020_count === 1 } : null,
      date: { present: !!m.end_date, text: m.end_date || null, codepoints: m.end_date ? cpsOf(m.end_date) : [], length: m.end_date ? Array.from(m.end_date).length : 0 },
      titleSubject: m.title, titleFull: m.title + '｜自然选择号',
    };
    need(titleSubject[p] === m.title, '新稿矩阵标题与 md 不一致：' + p);
  }

  /* ---- 8. 配色与尺寸（styles.css :root） ---- */
  const varOf = (name) => { const m = css.match(new RegExp('--' + name + ':\\s*([^;]+);')); need(m, 'styles.css 缺变量 --' + name); return m[1].trim(); };
  const colors = { ink: hexToRgb(varOf('color-ink')), accent: hexToRgb(varOf('color-accent')), paper: hexToRgb(varOf('color-paper')) };
  const rgbStr = (a) => 'rgb(' + a.join(', ') + ')';
  const readingMaxRem = parseFloat(varOf('reading-max'));
  const gutterRem = parseFloat(varOf('page-gutter'));

  /* ---- 9. Task19 自身的量化合同 ---- */
  const minAssertions = Number((task19.match(/本包 \*\*≥ (\d+)\*\*/) || [])[1]);
  need(minAssertions, '缺断言总数下限');
  const tapM = task19.match(/≥ \*\*(\d+)×(\d+) CSS px\*\*/);
  need(tapM, '缺触控下限');
  const vpM = task19.match(/桌面 ([\d／,，\s]+)，移动 ([\d／,，\s]+)，200% 缩放复现档 (\d+)/);
  need(vpM, '缺视口档位');
  const nums = (s) => [...String(s).matchAll(/\d+/g)].map((m) => Number(m[0]));
  const widths = { desktop: nums(vpM[1]), mobile: nums(vpM[2]), zoom: Number(vpM[3]) };
  const pressureN = Number((task19.match(/(\d+) 条假文章/) || [])[1]);
  need(pressureN, '缺压力样本条数');
  const nArticles = Number(manifest.counts.articles);
  const threeNum = [
    { formula: '11 + N', expect: TASK20.main.files_base + nArticles },
    { formula: '12 + N', expect: TASK20.main.zip_base + nArticles },
    { formula: '7 + N', expect: TASK20.main.html_base + nArticles },
  ];
  need(new Set(threeNum.map((x) => x.formula)).size === 3, 'Task20 R14 三个数字公式必须互异');
  const v1Group = {};
  for (const m of task19.matchAll(/\| R-([A-J]) [^|]*\| (\d+) \|/g)) v1Group['R-' + m[1]] = Number(m[2]);
  const v1Total = Number((task19.match(/v1 \*\*(\d+)\*\*（R-A…R-J 十组 (\d+) \+ 2 条只读检查）/) || [])[1]);
  need(v1Total, '缺 v1 断言总数');

  /* ---- 10. Task18 前置闸门结论 ---- */
  const gate = {
    reportExists: fs.existsSync(TASK18_REPORT_PATH),
    zeroFail: /FAIL[：:\s]+0[^\n]{0,40}PENDING[：:\s]+0/.test(gate18)
      || /FAIL 0[\s\S]{0,80}PENDING 0/.test(gate18),
    capture: Number((gate18.match(/捕获率：([\d.]+)%/) || [])[1]),
    assertions: Number((gate18.match(/(\d+) 条断言/) || gate18.match(/断言总数[：:]\s*(\d+)/) || [])[1]),
    expectedReversals: fs.existsSync(path.join(ROOT, 'qa/_qa_task20', 'expected_reversals.md')),
  };

  /* 交付集合（清单驱动，不扫目录） */
  const deliverableFiles = manifest.pages.map((p) => p.path).sort();
  const zipEntries = manifest.pages.length + manifest.config.length;

  return {
    manifest, htmlPages, paperPages, eggPages, ordinaryHtmlPages, allHtmlPages, errorPage, counts: manifest.counts, deliverableFiles, zipEntries,
    columns: manifest.columns, colByList, colByArticle,
    titleSuffix, titleSubject, h1Expected, ariaExpected, matrix,
    navSpec, navPaths, breakpoints, stateRows,
    frozen, whitelist, whitelistN: Number(wlM[1]), r4Tally, homeEntryText: TASK20.home.entry_text, sortKeys, latestN: Number(latestN),
    detail, colors, rgbStr, INK: rgbStr(colors.ink), ACCENT: rgbStr(colors.accent), PAPER: rgbStr(colors.paper),
    mdMeta, globalOrder, latestPages,
    readingMaxRem, gutterRem,
    minAssertions, tapMin: { w: Number(tapM[1]), h: Number(tapM[2]) }, widths, pressureN, threeNum, v1Group, v1Total,
    gate, reportDir: REPORT_DIR, factsPath: FACTS_PATH, task18ReportPath: TASK18_REPORT_PATH,
    onlineBase: (process.env.QODER_ONLINE_BASE || 'https://old-ns-news.pages.dev').replace(/\/+$/, '') + '/',
  };
}
