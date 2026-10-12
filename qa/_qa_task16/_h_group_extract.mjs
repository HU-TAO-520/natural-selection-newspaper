/* Task 10 — 结构与内容自动核验器（只读）
 * 真值全部解析自 plan/Task1（哈希、逐段合同、字符数）、plan/Task2（页面登记表）、
 * plan/Task4（首页三段冻结文本）；DOM 事实来自 dom_facts.json（真实浏览器 textContent）。
 * 本脚本不写入 Results/ 与 Materials/；报告输出到 _qa_task10/。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const RESULTS = process.env.QODER_RESULTS_DIR ? path.resolve(process.env.QODER_RESULTS_DIR)
  : path.join(ROOT, 'Results');
const MATERIALS = process.env.QODER_MATERIALS_DIR ? path.resolve(process.env.QODER_MATERIALS_DIR) : path.join(ROOT, 'Materials');
const PLAN = path.join(ROOT, 'plan');
const FACTS = JSON.parse(fs.readFileSync(process.env.QODER_FACTS || path.join(HERE, 'dom_facts.json'), 'utf8'));

const PAGES = ["index.html", "news-message.html", "news-feature.html", "news-commentary.html", "article-school-course-volunteer.html", "article-math-to-ai-learning.html", "article-classroom-screen-upgrade.html"];
const ART = {
  'news-message.html': { key: 'M', label: '新闻消息', type: '新闻消息', n: 4 },
  'news-feature.html': { key: 'F', label: '新闻通讯', type: '新闻通讯', n: 23 },
  'news-commentary.html': { key: 'C', label: '新闻评论', type: '新闻评论', n: 29 },
};

/* ---------------- 合同解析 ---------------- */
const read = (p) => fs.readFileSync(p, 'utf8');
function contractBlock(file, heading) {
  const src = read(path.join(PLAN, file));
  const i = src.indexOf(heading);
  if (i < 0) throw new Error('合同小节缺失: ' + heading);
  const seg = src.slice(i);
  const m = seg.match(/```text\n([\s\S]*?)```/);
  if (!m) throw new Error('合同代码块缺失: ' + heading);
  const out = {};
  for (const line of m[1].split('\n')) {
    if (!line.trim()) continue;
    const j = line.indexOf('|');
    if (j < 0) throw new Error('合同行缺少分隔符: ' + line);
    out[line.slice(0, j)] = line.slice(j + 1);
  }
  return out;
}
const T1_MSG = contractBlock('Task1-素材基线与内容合同.md', '### 新闻消息\n');
const T1_FEAT = contractBlock('Task1-素材基线与内容合同.md', '### 新闻通讯\n');
const T1_COMM = contractBlock('Task1-素材基线与内容合同.md', '### 新闻评论\n');
const T4_HOME = contractBlock('Task4-完成首页内容.md', '### 文本级验证');

function seq(base, prefix, n) {
  const a = [];
  for (let i = 1; i <= n; i++) {
    const k = prefix + String(i).padStart(2, '0');
    if (base[k] === undefined) throw new Error('合同缺项 ' + k);
    a.push(base[k]);
  }
  return a;
}
/* Task 1 §3 逐段字符数基线（截断/漏段的独立交叉断言） */
function charCounts() {
  const src = read(path.join(PLAN, 'Task1-素材基线与内容合同.md'));
  const i = src.indexOf('### 3. 逐段文本复核');
  const seg = src.slice(i, src.indexOf('### 4.', i));
  const map = {};
  let cur = null;
  for (const line of seg.split('\n')) {
    const h = line.match(/\*\*(新闻消息|新闻通讯|新闻评论)（/);
    if (h) cur = { 新闻消息: 'M', 新闻通讯: 'F', 新闻评论: 'C' }[h[1]];
    if (!cur) continue;
    for (const m of line.matchAll(/`([A-Za-z_0-9]+)=(\d+)`/g)) {
      const k = m[1] === 'title' || m[1] === 'byline' ? 'common_' + m[1] : cur + ':' + m[1];
      map[k] = Number(m[2]);
    }
  }
  return map;
}
const CNT = charCounts();
function registry() {
  const src = read(path.join(PLAN, 'Task2-建立共享HTML壳与导航.md'));
  const i0 = src.indexOf('## 页面登记表');
  const i1 = src.indexOf('\n## ', i0 + 5);
  const table = src.slice(i0, i1 < 0 ? src.length : i1);
  const out = {};
  for (const line of table.split('\n')) {
    const m = line.match(/^\|\s*`([\w.-]+\.html)`\s*\|\s*`([^`]*)`\s*\|\s*`([^`]*)`\s*\|\s*([^|]*?)\s*\|/);
    if (m) out[m[1]] = { title: m[2], h1: m[3], current: m[4] };
  }
  return out;
}
const REG = registry();
const NAV = [
  { text: '首页', href: 'index.html' },
  { text: '新闻消息', href: 'news-message.html' },
  { text: '新闻通讯', href: 'news-feature.html' },
  { text: '新闻评论', href: 'news-commentary.html' },
];
const FROZEN_HASHES = {
  '新闻消息.docx': 'DE10B575399E0563430F2F255C956B179C9978C087897A24910AD70D6A50F6FC',
  '新闻通讯.docx': '0C5B35256B7271ACFB2F49AEC146288B404ED49C376AC2C8B3F6246B38F894A4',
  '新闻评价.docx': '8E50CFC89287035163D5FE95C8B1CEE20A5AA405E9D04EC358FB5C9312C3827C',
};
const CSS_VARS = {
  '--color-paper': '#f5efe4', '--color-ink': '#211f1c', '--color-muted': '#665d56',
  '--color-accent': '#7a2424', '--color-rule': '#b8aa98',
  '--layout-max': '70rem', '--reading-max': '46rem', '--page-gutter': '2rem',
};
const FONT_STACK = '"Songti SC", "STSong", "SimSun", serif';

/* ---------------- 报告收集 ---------------- */
const rows = [];
function rec(id, pass, loc, exp, act, handoff) {
  rows.push({ id, st: pass ? 'PASS' : 'FAIL', loc: loc || '', exp: exp === undefined ? '' : String(exp), act: act === undefined ? '' : String(act), handoff: handoff || '' });
  return !!pass;
}
function chk(id, cond, loc, exp, act, handoff) {
  if (cond) return rec(id, true, loc);
  return rec(id, false, loc, exp, act, handoff);
}
function chkEq(id, a, b, loc, handoff) {
  const pass = a === b;
  return rec(id, pass, loc, pass ? '' : short(b), pass ? '' : short(a), handoff);
}
const short = (s) => { s = String(s === undefined ? '' : s); return s.length > 160 ? s.slice(0, 78) + '…' + s.slice(-78) : s; };
const vis = (s) => s === null ? 'null' : JSON.stringify(s.length > 90 ? s.slice(0, 45) + '…' + s.slice(-45) : s);
const src = {};
for (const f of PAGES.concat(['styles.css', 'script.js'])) src[f] = read(path.join(RESULTS, f));
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();

/* ---------------- A. 交付集合与文件范围 ---------------- */
const entries = fs.readdirSync(RESULTS, { withFileTypes: true });
const files = entries.filter((e) => e.isFile()).map((e) => e.name);
/* ---------------- H. styles.css 静态合同 ---------------- */
function scanCss(text) {
  let clean = '';
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '/' && text[i + 1] === '*') { const j = text.indexOf('*/', i + 2); const end = j < 0 ? text.length : j + 2; clean += ' '.repeat(end - i); i = end - 1; continue; }
    clean += text[i];
  }
  const rules = [];
  let depth = 0, buf = '', stack = [];
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '{') { stack.push({ prelude: buf.trim(), start: i }); buf = ''; depth++; continue; }
    if (ch === '}') {
      if (depth === 0) return { clean, rules, error: '多余的 }', balanced: false };
      const b = stack.pop(); depth--;
      const body = clean.slice(b.start + 1, i);
      if (depth === 0) rules.push({ prelude: b.prelude, body, start: b.start, end: i, child: b.child || [] });
      else { const top = stack[stack.length - 1]; top.child = (top.child || []).concat([{ prelude: b.prelude, body, start: b.start, end: i }]); }
      buf = '';
      continue;
    }
    buf += ch;
  }
  return { clean, rules, balanced: stack.length === 0 && depth === 0, error: stack.length ? '未闭合 {' + stack.map((s) => s.prelude.slice(0, 40)).join('/') : '', trailing: buf.trim() };
}
{
  chk('H1', PAGES.every((f) => FACTS[f].links.filter((l) => l.rel === 'stylesheet').length === 1 && FACTS[f].links.filter((l) => l.rel === 'stylesheet')[0].href === 'styles.css') && files.filter((n) => /\.css$/i.test(n)).length === 1,
    '四页样式引用 / Results 样式文件数', '仅 href="styles.css"，且 Results/ 只有一个 .css', PAGES.map((f) => JSON.stringify(FACTS[f].links)).join(' '), 'Task 2/3');
  const C = src['styles.css'];
  const scan = scanCss(C);
  chk('H2', !/@import|@font-face|url\s*\(|https?:\/\/|["'(]\s*\/\/|[A-Za-z]:[\\/]/.test(scan.clean), 'styles.css 外部资源', '无 @import/@font-face/url(/http(s):///协议相对/盘符绝对路径',
    (scan.clean.match(/@import|@font-face|url\s*\(|https?:\/\/|["'(]\s*\/\/|[A-Za-z]:[\\/]/g) || []).join(','), 'Task 3');
  chkEq('H3', (C.match(/--font-serif:\s*([^;]+);/) || [])[1], FONT_STACK, 'styles.css 字体栈', 'Task 3');
  chk('H3/noremote', !/url\s*\(|@font-face|fonts\.googleapis|https?:/.test(scan.clean), 'styles.css 远程字体', '无远程字体引用', scan.clean.match(/url\s*\([^)]*\)/g) + '', 'Task 3');
  const rootBlocks = scan.rules.filter((r) => r.prelude === ':root');
  const firstRoot = rootBlocks[0] ? rootBlocks[0].body : '';
  const h4 = [];
  for (const [k, v] of Object.entries(CSS_VARS)) {
    const re = new RegExp('\\' + k.replace(/^\-/, '-') + ':\\s*([^;]+);', 'g');
    const decls = [...C.matchAll(re)].map((m) => m[1].trim());
    const inFirst = [...firstRoot.matchAll(re)].map((m) => m[1].trim());
    if (!inFirst.length) h4.push(`${k} 桌面 :root 缺失（实际: ${decls.join('/') || '无'}）`);
    else if (inFirst[0] !== v) h4.push(`${k}: 首个 :root 期望 ${v} 实际 ${inFirst[0]}`);
    if (inFirst.length > 1) h4.push(`${k} 在同一 :root 内重复声明: ${inFirst.join('/')}`);
  }
  chk('H4', h4.length === 0, 'styles.css 关键变量', Object.entries(CSS_VARS).map(([k, v]) => `${k}: ${v}`).join(' ; '), h4.join(' | '), 'Task 3');
  const flat = [];
  const flatten = (rs) => rs.forEach((r) => {
    if (r.prelude.startsWith('@')) { if (r.child) flatten(r.child); }
    else flat.push({ sel: r.prelude, decl: r.body });
  });
  flatten(scan.rules);
  const idSel = flat.filter((r) => /(^|[\s>+~,(])#[\w-]/.test(r.sel));
  chk('H5/id', idSel.length === 0, 'styles.css ID 选择器', '不使用 #nav-toggle / #site-navigation / #main-content 等 ID 选择器', idSel.map((r) => r.sel).join(' | '), 'Task 3');
  chk('H5/important', !/!important/.test(C), 'styles.css !important', '0 次', (C.match(/!important/g) || []).length + ' 次', 'Task 3');
  const noComment = scan.clean;
  const patchHits = [...noComment.matchAll(/(?<![\w-])(?:body\.[\w-]+|news-message|news-feature|news-commentary|index\.html|index)(?![\w-])/g)].map((m) => m[0]);
  chk('H5/pagepatch', patchHits.length === 0 && !/:nth-child\(/.test(noComment) && !flat.some((r) => /:nth-child\(|body\.[\w-]/.test(r.sel)),
    'styles.css 页面识别补丁', '无 body.页面名、文件名 class、:nth-child() 页面识别（注释已剔除）',
    patchHits.join(',') + ' | :nth-child=' + (noComment.match(/:nth-child\(/g) || []).length, 'Task 3');
  chk('H6', flat.some((r) => /\.site-navigation__link\[aria-current\s*=\s*["']?page["']?\]/.test(r.sel)), 'styles.css 当前页样式', '存在 .site-navigation__link[aria-current="page"] 选择器',
    flat.filter((r) => /aria-current/.test(r.sel)).map((r) => r.sel).join(' | ') || '无', 'Task 3');
  const banned = { 'box-shadow': /box-shadow/, 'text-shadow': /text-shadow/, 'linear-gradient': /linear-gradient/, 'radial-gradient': /radial-gradient/, 'background-image': /background-image/, 'column-count': /column-count/, 'column-width': /column-width/, 'overflow-x:\s*hidden': /overflow-x\s*:\s*hidden/, 'overflow-x:\s*clip': /overflow-x\s*:\s*clip/, 'word-break:\s*break-all': /word-break\s*:\s*break-all/ };
  const hb = Object.entries(banned).filter(([, re]) => re.test(scan.clean)).map(([k]) => k);
  const radius = flat.filter((r) => /border-radius/.test(r.decl)).map((r) => r.sel + ' {' + r.decl.match(/border-radius:[^;]+/) + '}');
  chk('H7', hb.length === 0 && radius.length === 0, 'styles.css 被禁视觉模式', '无 box/text-shadow、渐变、background-image、column-*、overflow-x hidden/clip、word-break: break-all；border-radius 不用于卡片化内容',
    hb.join(',') + ' || border-radius: ' + radius.join(' ; '), 'Task 3');
  const medias = scan.rules.filter((r) => r.prelude.startsWith('@media'));
  const mLast = medias.length === 1 && scan.rules[scan.rules.length - 1] === medias[0];
  chk('H8', medias.length === 1 && medias[0].prelude === '@media (max-width: 768px)' && mLast, 'styles.css 移动区段', '恰一个 @media (max-width: 768px) 且位于样式表末尾、桌面规则之后',
    medias.map((m) => JSON.stringify(m.prelude)).join(',') + ' 末尾=' + mLast + ' 顶层块数=' + scan.rules.length, 'Task 8');
  chk('H8/other', !/max-width\s*:\s*767px|min-width\s*:\s*768px|max-width\s*:\s*(769|[78][89]\d|\d{4,})px/.test(scan.clean), 'styles.css 误写断点', '无 767px、min-width:768px 或 769px 仍命中移动的查询',
    (scan.clean.match(/(max|min)-width\s*:\s*\d+px/g) || []).join(','), 'Task 8');
  const mobile = medias[0] ? medias[0].body : '';
  const mFlat = ((scan.rules.find((r) => r.prelude.startsWith('@media')) || {}).child) || [];
  const mDecl = mFlat.map((r) => r.body).join('\n');
  chk('H9', !/100vw/.test(mDecl) && !/overflow-x\s*:\s*(hidden|clip)/.test(mDecl) && !/word-break\s*:\s*break-all/.test(mDecl) && !/!important/.test(mDecl) &&
    !/[^-]\bheight\s*:\s*\d+(px|rem)\s*[;}]/.test(mDecl + '}') &&
    /overflow-wrap\s*:\s*(anywhere|break-word)/.test(mDecl) && /word-break\s*:\s*normal/.test(mDecl) && /hyphens\s*:\s*none/.test(mDecl),
    'styles.css 移动区段内容', '无 100vw/固定内容高度/overflow-x hidden|clip/word-break:break-all/!important；使用 overflow-wrap:anywhere(break-word) + word-break:normal + hyphens:none',
    `100vw=${(mDecl.match(/100vw/g) || []).length} fixedH=${(mDecl.match(/[^-]height\s*:\s*\d+(px|rem)/g) || []).join(',')} ow=${(mDecl.match(/overflow-wrap\s*:[^;]+/g) || []).join(',')} wb=${(mDecl.match(/word-break\s*:[^;]+/g) || []).join(',')} hy=${(mDecl.match(/hyphens\s*:[^;]+/g) || []).join(',')}`, 'Task 8');
  const contents = [...C.matchAll(/[^-]\bcontent\s*:\s*([^;{}]+)/g)].map((m) => m[1].trim());
  const badContent = contents.filter((v) => !/^(""|''|none|normal|url\(.*\)|\a[0-9a-f]{1,6}(\s|$))/i.test(v) && /[\u4e00-\u9fff]/.test(v));
  chk('H10', badContent.length === 0 && contents.every((v) => /^(""|''|none)/.test(v) || !/[\u4e00-\u9fff]/.test(v)), 'styles.css content 注入', '除装饰性 content:"" 外无注入正文/作者/日期/电头/菜单文字',
    contents.map((v) => JSON.stringify(v)).join(' | '), 'Task 3');
  const cssClasses = new Set();
  for (const r of flat) for (const m of r.sel.matchAll(/\.([A-Za-z_][-\w]*)/g)) cssClasses.add(m[1]);
  const htmlClasses = new Set();
  for (const f of PAGES) for (const m of src[f].matchAll(/class="([^"]*)"/g)) m[1].split(/\s+/).forEach((c) => c && htmlClasses.add(c));
  const bannedCls = [...cssClasses].filter((c) => /^(mobile|message|feature|commentary|news-commentary)-[\w-]*$/i.test(c) || /^(nowrap|technical-term)$/.test(c));
  const unknown = [...cssClasses].filter((c) => !htmlClasses.has(c) && !/^(js|no-js|is-open)$/.test(c));
  chk('H11', bannedCls.length === 0 && unknown.length === 0, 'styles.css 页面专属 class / 第二套移动主题变量',
    '无 .mobile-*/.message-*/.feature-*/.commentary-*/.nowrap/.technical-term；CSS 类均可在 HTML 中找到',
    '禁用命中=' + bannedCls.join(',') + '；HTML 中不存在的 CSS 类=' + unknown.join(','), 'Task 8');
  const mRoot = mFlat.filter((r) => /:root/.test(r.sel));
  chk('H11/root', mRoot.length === 0 || [...new Set(mRoot.flatMap((r) => (r.body.match(/\s--[\w-]+(?=\s*:)/g) || []).map((s) => s.trim())))].every((v) => v in CSS_VARS) && /max-width\s*:\s*768px/.test(medias[0] ? medias[0].prelude : ''),
    'styles.css 移动 :root 覆盖范围', '移动区段仅覆盖既有变量，不新增第二套主题变量', mRoot.map((r) => (r.body.match(/--[\w-]+(?=\s*:)/g) || []).join(',')).join(' | ') || '无 :root 覆盖', 'Task 8');
  chk('H12', scan.balanced && !scan.error && !scan.trailing && flat.length > 0, 'styles.css 花括号与语法', '花括号配对、媒体查询可解析、无未闭合规则、顶层无游离文本',
    `balanced=${scan.balanced} error=${scan.error || '无'} trailing=${JSON.stringify((scan.trailing || '').slice(0, 40))} 规则数=${flat.length}`, 'Task 3');
  /* 浏览器自身解析器的独立证据：顶层规则数必须与源码扫描一致，且 @media 条件文本精确、位于末尾（无静默丢弃） */
  const cps = PAGES.map((f) => FACTS[f].cssParse);
  chk('H12/browser', cps.every((c) => c && c.ok && c.href === 'styles.css') &&
    cps.every((c) => c.top === scan.rules.length) &&
    cps.every((c) => c.mediaCount === 1 && c.lastIsMedia && c.mediaText === '(max-width: 768px)'),
    'styles.css 浏览器解析证据', `四页 styleSheets[0] 顶层规则数 = 源码扫描的 ${scan.rules.length}；恰一个 @media 且为最后一条规则，条件文本 (max-width: 768px)`,
    cps.map((c, i) => PAGES[i] + ':' + JSON.stringify(c)).join(' '), 'Task 3/8');
  rows.push({ id: 'H12', st: 'PASS', loc: 'styles.css', exp: '', act: `顶层块=${scan.rules.length}，声明块=${flat.length}，移动区段规则=${mFlat.length}，浏览器顶层规则=${cps[0] && cps[0].top}`, handoff: '' });
}


const bad = rows.filter((r) => r.st === 'FAIL');
const out = rows.map((r) => r.st + ' ' + r.id + ' | ' + r.loc + (r.st === 'FAIL' ? ' | 期望: ' + r.exp + ' | 实际: ' + r.act : '')).join('\n');
fs.writeFileSync(process.env.QODER_REPORT || 'h_rows.txt', out + '\nH 组行数=' + rows.length + ' 标签数=' + new Set(rows.map(r => r.id)).size + ' FAIL=' + bad.length + '\n');
process.stdout.write(out + '\nH 组行数=' + rows.length + ' 标签数=' + new Set(rows.map(r => r.id)).size + ' FAIL=' + bad.length + '\n');
