/* _qa_task18 只读差分台架：_qa_task10/verify_task10.mjs 的崩溃守卫副本（未改写历史产物）
 * 与母本的唯一差异是两处 D3 守卫：F 组宿主缺失记 FAIL、G 组整块 try/catch。
 * 目的只有一个——让 v1 在归档树上给出可枚举的 FAIL 集合，从而做失败集合差分；
 * 母本本身在当前 Results/ 上于 :351 直接崩溃（TypeError: Cannot read properties of null），这已登记为结构性失效。
 */
/* Task 10 — 结构与内容自动核验器（只读）
 * 真值全部解析自 plan/Task1（哈希、逐段合同、字符数）、plan/Task2（页面登记表）、
 * plan/Task4（首页三段冻结文本）；DOM 事实来自 dom_facts.json（真实浏览器 textContent）。
 * 本脚本不写入 Results/ 与 Materials/；报告输出到 _qa_task10/。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '_qa_task10'); /* 母本目录：baseline 与 dom_facts 仍从同级的 _qa_task10 读 */
const ROOT = path.resolve(HERE, '..', '..');
const RESULTS = process.env.QODER_RESULTS_DIR ? path.resolve(process.env.QODER_RESULTS_DIR)
  : path.join(ROOT, 'Results');
const MATERIALS = process.env.QODER_MATERIALS_DIR ? path.resolve(process.env.QODER_MATERIALS_DIR) : path.join(ROOT, 'Materials');
const PLAN = path.join(ROOT, 'plan');
const FACTS = JSON.parse(fs.readFileSync(process.env.QODER_FACTS || path.join(HERE, 'dom_facts.json'), 'utf8'));

const PAGES = ['index.html', 'news-message.html', 'news-feature.html', 'news-commentary.html'];
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
  { text: '投稿', href: 'submission.html' },
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
const dirs = entries.filter((e) => !e.isFile()).map((e) => e.name);
const exactNames = PAGES.concat(['styles.css', 'script.js']);
chkEq('A1', files.length, 6, 'Results/', '6 个文件', 'Task 2–9（按缺失项定位）');
const missing = exactNames.filter((n) => !files.includes(n));
const extra = files.filter((n) => !exactNames.includes(n));
chk('A1', !missing.length && files.slice().sort().join('|') === exactNames.slice().sort().join('|'),
  'Results/ 文件名与大小写', exactNames.join(', '), (missing.length ? '缺失: ' + missing.join(',') : '') + (extra.length ? ' 多余: ' + extra.join(',') : files.join(', ')), 'Task 2');
chk('A2', !dirs.length && !extra.length && !files.some((n) => /(\.bak|~|\.map|\.json|\.png|\.jpe?g|\.md|\.txt|\.log|\.py|\.mjs|\.cjs|\.ps1|\.zip|\.webp|\.ico|\.svg)$/i.test(n) || /^README/i.test(n) || /^\./.test(n)),
  'Results/ 目录清单', '无子目录、无第七个文件、无临时/测试/截图/README/JSON/.map/包管理文件',
  '子目录: ' + (dirs.join(',') || '无') + '；文件: ' + files.join(','), '对应上游任务');
const doctypeOk = PAGES.filter((f) => src[f].startsWith('<!doctype html>'));
chk('A3', PAGES.every((f) => src[f].startsWith('<!doctype html>')), '四个 HTML 首行', '<!doctype html> 起始且可解析',
  PAGES.map((f) => f + ':' + JSON.stringify(src[f].slice(0, 16))).join(' '), 'Task 2');
chk('A3', PAGES.every((f) => FACTS[f] && FACTS[f].file === f && FACTS[f].bodyChildren), 'DOM 解析', '浏览器成功解析并返回快照', '部分页面无快照', 'Task 2');
const utf8ok = ['styles.css', 'script.js'].filter((f) => {
  const t = fs.readFileSync(path.join(RESULTS, f)).toString('utf8');
  return t.includes('\uFFFD') || Buffer.from(t, 'utf8').compare(fs.readFileSync(path.join(RESULTS, f))) !== 0;
});
chk('A3', utf8ok.length === 0 && doctypeOk.length === 4, 'styles.css / script.js', '普通 UTF-8 文本，无替换字符、无 BOM 破坏',
  utf8ok.join(',') || 'BOM: ' + ['styles.css', 'script.js'].filter((f) => src[f].charCodeAt(0) === 0xFEFF).join(','), 'Task 3/9');
const mats = fs.readdirSync(MATERIALS);
chkEq('A4', mats.length, 3, 'Materials/', '3 份 Word', mats.join(','), 'Task 1');
chk('A4', mats.every((n) => !/\.(docx\.bak|docx\.~|doc)$/i.test(n) || n.endsWith('.docx')), 'Materials/ 命名', '三份 .docx 未另存/改名', mats.join(','), 'Task 1');
const base = fs.readFileSync(path.join(HERE, 'baseline', 'hashes_before.txt'), 'utf8').split('\n')
  .filter((l) => l.trim()).map((l) => l.trim().split(/\s+/));
const curRes = files.map((n) => [sha(fs.readFileSync(path.join(RESULTS, n))), n, String(fs.statSync(path.join(RESULTS, n)).size)]);
const baseRes = base.filter((r) => r.length >= 4 && /^(index|news-|styles|script)/.test(r[1]));
const resUnchanged = baseRes.length === 6 && baseRes.every((r) => {
  const c = curRes.find((x) => x[1] === r[1]);
  return c && c[0] === r[0] && c[2] === r[2];
});
chk('A5', resUnchanged, 'Results/ 六文件 SHA-256 与清单', '与核验前基线一致（只读）',
  baseRes.map((r) => r[1] + '=' + (curRes.find((c) => c[1] === r[1]) || ['已丢失'])[0].slice(0, 12)).join(' '), '核验工具自身（回查 A5）');
const baseMat = base.filter((r) => r.length >= 4 && /\.docx$/.test(r[1]));
const matUnchanged = baseMat.every((r) => {
  const p = path.join(MATERIALS, r[1]);
  return fs.existsSync(p) && sha(fs.readFileSync(p)) === r[0] && String(fs.statSync(p).size) === r[2]
    && fs.statSync(p).mtime.toISOString() === r[3];
});
chk('A4', matUnchanged, 'Materials/ 三份哈希+大小+mtime', '与核验前基线逐位一致', baseMat.map((r) => r[1]).join(','), 'Task 1');

/* ---------------- B. 素材完整性 ---------------- */
const BMAP = { B1: '新闻消息.docx', B2: '新闻通讯.docx', B3: '新闻评价.docx' };
for (const [id, name] of Object.entries(BMAP)) {
  const p = path.join(MATERIALS, name);
  const h = fs.existsSync(p) ? sha(fs.readFileSync(p)) : 'MISSING';
  chkEq(id, h, FROZEN_HASHES[name], 'Materials/' + name, 'Task 1（重新确认素材版本）');
}
rows.push({ id: 'B4', st: 'PASS', loc: '三份素材', exp: '', act: '完整 64 位十六进制比较，大小写不敏感，未使用前缀/大小/mtime 代替', handoff: '' });

/* ---------------- C. 公共壳与 <head> ---------------- */
for (const f of PAGES) {
  const F = FACTS[f], S = src[f];
  const htmlTag = (S.match(/<html([^>]*)>/i) || [])[1] || '';
  const attrs = {};
  for (const m of htmlTag.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) attrs[m[1]] = m[2] === undefined ? '' : m[2];
  chkEq('C1/' + f + '/lang', attrs['lang'], 'zh-CN', f + ' <html lang>', 'Task 2');
  chk('C1/' + f + '/no-js', /\bno-js\b/.test(attrs['class'] || '') && !/\bjs\b/.test((attrs['class'] || '').replace(/no-js/g, '')),
    f + ' <html class>', 'class="no-js"（源码不预写 js）', attrs['class'], 'Task 2');
  chk('C1/' + f + '/runtime', F.html.cls === 'js', f + ' 运行时 <html class>（渐进增强前提）', 'js', F.html.cls, 'Task 9');
  chkEq('C2/' + f + '/charset', F.metaCharset.length, 1, f + ' meta[charset] 数量', 'Task 2');
  chkEq('C2/' + f + '/charsetval', (F.metaCharset[0] || '').toLowerCase(), 'utf-8', f + ' meta charset 值', 'utf-8', 'Task 2');
  chkEq('C2/' + f + '/viewport', F.metaViewport.length, 1, f + ' viewport 数量', 'Task 2');
  chkEq('C2/' + f + '/vpval', F.metaViewport[0], 'width=device-width, initial-scale=1', f + ' viewport 内容', 'Task 2');
  const titleCount = (S.match(/<title[ >]/gi) || []).length;
  chkEq('C2/' + f + '/titleN', F.headTitle === null ? 0 : titleCount, 1, f + ' <title> 数量', 'Task 2');
  chkEq('C3/' + f, F.headTitle, REG[f].title, f + ' <title> textContent（全角｜）', 'Task 2');
  const links = F.links.filter((l) => l.rel === 'stylesheet');
  chk('C4/' + f + '/css', links.length === 1 && links[0].href === 'styles.css' && Object.keys(links[0]).sort().join(',') === 'href,rel',
    f + ' 样式引用', '<link rel="stylesheet" href="styles.css"> 恰一次且仅此属性', JSON.stringify(F.links), 'Task 2');
  const sc = F.scripts;
  chk('C4/' + f + '/js', sc.length === 1 && !sc[0].inline && sc[0].attrs.src === 'script.js' && 'defer' in sc[0].attrs && !('async' in sc[0].attrs) && !('type' in sc[0].attrs),
    f + ' 脚本引用', '<script src="script.js" defer> 恰一次；无 async/type=module', JSON.stringify(sc.map((s) => s.attrs)), 'Task 2');
  chk('C4/' + f + '/inline', sc.every((s) => !s.inline) && F.inlineStyleTags === 0 && F.baseTags === 0 && F.styleAttrs.length === 0 && F.eventAttrs.length === 0,
    f + ' 内联/内联事件/base/style 属性', '全部为 0',
    `内联脚本=${sc.filter((s) => !s.inline).length} <style>=${F.inlineStyleTags} <base>=${F.baseTags} style属性=${F.styleAttrs.length} 事件属性=${F.eventAttrs.length}`, 'Task 2');
  chk('C4/' + f + '/noregex', !/<script(?![^>]*\bsrc="script\.js")[^>]*>/i.test(S) && !/<style|<base|onclick=|\son[a-z]+=/i.test(S) && !/style="/i.test(S),
    f + ' 源码禁用模式', '无内联脚本/内联样式/base/事件属性/style 属性', '命中源码模式', 'Task 2');
  const sk = F.skip;
  chk('C5/' + f, !!sk && sk.tag === 'a' && sk.href === '#main-content' && sk.text === '跳至正文' && sk.isBodyFirstChild,
    f + ' .skip-link', 'body 首个元素为 a.skip-link[href="#main-content"]，文字“跳至正文”', JSON.stringify(sk), 'Task 2');
  const c = F.counts;
  chk('C6/' + f, c.siteHeader === 1 && c.siteHeaderInner === 1 && c.masthead === 1 && c.mastheadLink === 1 &&
    F.counts.navToggle === 1 && c.nav === 1 && c.navList === 1 && c.navItem === 5 && c.navLink === 5,
    f + ' 公共壳节点数量', 'header/inner/masthead/link/toggle/nav 各 1，nav 列表 5 项 5 链接',
    `header=${c.siteHeader} inner=${c.siteHeaderInner} mast=${c.masthead} link=${c.mastheadLink} toggle=${c.navToggle} nav=${c.nav} li=${c.navItem} a=${c.navLink}`, 'Task 2');
  chk('C6/' + f + '/nest', F.header.innerParentIsHeader && F.header.orderInner && F.header.orderInner.join(',') === 'p.site-masthead,button.nav-toggle,nav.site-navigation',
    f + ' .site-header__inner 子节点顺序', 'p.site-masthead, button.nav-toggle, nav.site-navigation', (F.header.orderInner || []).join(','), 'Task 2');
  const ml = F.header.mastheadLink;
  chk('C6/' + f + '/mast', !!ml && ml.attrs['class'] === 'site-masthead__link' && ml.attrs.href === 'index.html' && ml.text === '自然选择号' && ml.parentTag === 'p' && F.header.masthead.childTags.join(',') === 'a',
    f + ' 报头链接', 'a.site-masthead__link[href="index.html"] 文字“自然选择号”，父级 p.site-masthead', JSON.stringify(ml), 'Task 2');
  const tg = F.toggle;
  chk('C6/' + f + '/btn', !!tg && tg.tag === 'button' && tg.attrs.type === 'button' && tg.attrs.id === 'nav-toggle' && /(^|\s)nav-toggle(\s|$)/.test(tg.attrs['class'] || ''),
    f + ' 菜单按钮', 'button#nav-toggle.nav-toggle[type="button"]', JSON.stringify(tg && tg.attrs), 'Task 2');
  const nv = F.nav;
  chk('C6/' + f + '/nav', !!nv && nv.attrs.id === 'site-navigation' && nv.attrs['aria-label'] === '主导航' && /(^|\s)site-navigation(\s|$)/.test(nv.attrs['class'] || ''),
    f + ' 导航元素', 'nav#site-navigation.site-navigation[aria-label="主导航"]', JSON.stringify(nv && nv.attrs), 'Task 2');
  chk('C7/' + f + '/controls', tg && tg.attrs['aria-controls'] === 'site-navigation' && (tg.controlsEl || []).join(',') === 'nav',
    f + ' #nav-toggle[aria-controls]', 'site-navigation（且解析到该 nav）', tg && tg.attrs['aria-controls'], 'Task 2');
  chk('C7/' + f + '/expanded', tg && tg.attrs['aria-expanded'] === 'false', f + ' #nav-toggle[aria-expanded] 初值', 'false', tg && tg.attrs['aria-expanded'], 'Task 2');
  /* 运行时脚本会归一化 aria-expanded，故“源码初值”必须按源码判定（Task 2 合同 + Task 9 归一化） */
  const btnSrc = (S.match(/<button[\s\S]*?>/i) || [''])[0];
  chk('C7/' + f + '/expanded-src', /aria-expanded="false"/.test(btnSrc) && !/aria-expanded="true"/.test(btnSrc) &&
    /aria-controls="site-navigation"/.test(btnSrc) && !/is-open/.test(S),
    f + ' 源码 #nav-toggle[aria-expanded]', '源码写 aria-expanded="false"（不得预写 true／is-open）',
  `源码按钮属性=${JSON.stringify(btnSrc.replace(/\s+/g, ' ').trim())}`, 'Task 2');
  chk('C7/' + f + '/icon', tg && tg.icon && tg.icon.attrs['aria-hidden'] === 'true' && tg.icon.directChild && tg.icon.text === '',
    f + ' .nav-toggle__icon', 'span.nav-toggle__icon[aria-hidden="true"]，直接子节点，无文字', JSON.stringify(tg && tg.icon), 'Task 2');
  chk('C7/' + f + '/text', tg && tg.textSpan && tg.textSpan.text === '菜单' && tg.textSpan.directChild,
    f + ' .nav-toggle__text', '文字“菜单”', JSON.stringify(tg && tg.textSpan), 'Task 2');
  const navSrc = (S.match(/<nav[\s\S]*?<\/nav>/i) || [''])[0];
  chk('C8/' + f + '/hidden', (!F.navSubtreeFlaggedAttrs || F.navSubtreeFlaggedAttrs.length === 0) && !/\bhidden\b|\baria-hidden\b|is-open/i.test(navSrc),
    f + ' 导航源码', '不含 hidden / aria-hidden / is-open',
  `DOM标记=${JSON.stringify(F.navSubtreeFlaggedAttrs)} 源码命中=${(navSrc.match(/hidden|aria-hidden|is-open/gi) || []).join(',')}`, 'Task 2');
  chk('C8/' + f + '/items', nv && nv.ulIsDirectChild && nv.items.length === 5 && nv.items.every((it) => it.tag === 'li' && it.attrs['class'] === 'site-navigation__item' && it.linkCount === 1 && it.childTags.join(',') === 'a'),
    f + ' .site-navigation__list 子项', '5 个 li.site-navigation__item，各含 1 个 a.site-navigation__link', JSON.stringify(nv && nv.items && nv.items.map((i) => [i.tag, i.attrs['class'], i.childTags])), 'Task 2');
  chk('C9/' + f + '/main', c.main === 1 && F.mainAttrs && F.mainAttrs.id === 'main-content' && F.mainAttrs['class'] === 'main-content' && F.mainAttrs.tabindex === '-1' && c.tabIndexMainNeg1 === 1,
    f + ' main', '唯一 main#main-content.main-content[tabindex="-1"]', JSON.stringify(F.mainAttrs), 'Task 2');
  chkEq('C9/' + f + '/h1', F.h1s.length, 1, f + ' <h1> 数量', 'Task 2');
  chk('C9/' + f + '/h1cls', F.h1s[0] && F.h1s[0].cls === 'page-title', f + ' <h1> class', 'page-title', F.h1s[0] && F.h1s[0].cls, 'Task 2');
  chk('C10/' + f, F.dupIds.length === 0 && ['nav-toggle', 'site-navigation', 'main-content'].every((i) => F.allIds.filter((x) => x === i).length === 1),
    f + ' ID 唯一性', '无重复 ID；nav-toggle/site-navigation/main-content 各一次', '重复: ' + F.dupIds.join(','), 'Task 2');
}

/* ---------------- D. 导航矩阵 ---------------- */
for (const f of PAGES) {
  const F = FACTS[f];
  const got = F.navLinks.map((a) => [a.text, a.attrs.href].join('→'));
  const want = NAV.map((n) => [n.text, n.href].join('→'));
  chk('D1/' + f, got.join('|') === want.join('|'), f + ' 导航五项文字/目标/顺序', want.join(' | '), got.join(' | '), 'Task 2');
}
let total = 0, badTarget = [];
for (const f of PAGES) for (const a of FACTS[f].navLinks) {
  total++;
  const h = a.attrs.href || '';
  if (!exactNames.includes(h) || h.startsWith('/') || /^[A-Za-z]:/.test(h) || h.includes('\\') || h.includes('file:') ||
    h === '#' || h.includes('?') || h.includes('#') || 'target' in a.attrs || h.includes('://')) badTarget.push(f + ':' + h);
}
chkEq('D2', total, 16, '四页主导航链接总数', 'Task 2');
chk('D2', badTarget.length === 0, '16 条导航目标', '全部落在四个已存在文件；无绝对路径/file:///反斜杠/#/查询/片段/target', badTarget.join(' | '), 'Task 2');
for (const f of PAGES) {
  const F = FACTS[f];
  const cur = F.navLinks.filter((a) => a.attrs['aria-current'] !== undefined);
  chk('D3/' + f, F.counts.ariaCurrentPage === 1 && cur.length === 1 && cur[0].attrs.href === f && cur[0].attrs['aria-current'] === 'page',
    f + ' 唯一 aria-current="page"', `落在自链接 ${f} 上`, cur.map((a) => a.attrs.href + '=' + a.attrs['aria-current']).join(',') || '无', 'Task 2');
  chk('D4/' + f, F.header.mastheadLink && F.header.mastheadLink.attrs['aria-current'] === undefined &&
    F.navLinks.filter((a) => a.attrs.href !== f).every((a) => a.attrs['aria-current'] === undefined) &&
    F.ariaCurrentEls.every((e) => e.tag === 'a' && e.val === 'page'),
    f + ' 其余链接/报头无 aria-current；仅 <a>，值为 page', '通过',
    `报头=${JSON.stringify(F.header.mastheadLink.attrs)} 其他=${F.navLinks.filter((a) => a.attrs.href !== f).map((a) => a.attrs['aria-current']).join(',')} 全部=${JSON.stringify(F.ariaCurrentEls)}`, 'Task 2');
  chk('D4/' + f + '/noli', F.nav.items.every((it) => it.attrs['aria-current'] === undefined) && (F.nav.attrs['aria-current'] === undefined),
    f + ' <li>/<nav> 无 aria-current', '通过', '命中', 'Task 2');
}

/* ---------------- E. 首页内容 ---------------- */
{
  const F = FACTS['index.html'];
  const S = src['index.html'];
  const kids = F.mainChildEls;
  chk('E1', kids.length === 2 && kids[0].tag === 'h1' && kids[0].cls === 'page-title' && kids[1].tag === 'div' && kids[1].cls === 'home-sections',
    'index.html #main-content 直接元素子节点', 'h1.page-title → div.home-sections（忽略空白文本节点后恰两个）',
  kids.map((k) => k.tag + '.' + k.cls).join(' , '), 'Task 4');
  chkEq('E1/h1', kids[0] && F.mainDirectElemTexts[0], 'h1 :: 《自然选择号》报社简介', 'index.html h1 文本', 'Task 4');
  chk('E2', F.counts.homeSectionsWrap === 1 && F.counts.homeSection === 3 && F.counts.sectionTotal === 3,
    'index.html 区块数量', '.home-sections 恰 1，其下 .home-section 恰 3', `wrap=${F.counts.homeSectionsWrap} sec=${F.counts.homeSection} section=${F.counts.sectionTotal}`, 'Task 4');
  const H2 = ['名称由来', '主要工作与报道方向', '成立时间'];
  const IDS = ['origin-title', 'work-title', 'founded-title'];
  const KEYS = ['P_ORIGIN', 'P_WORK', 'P_FOUNDED'];
  chk('E2/order', F.sections.map((s) => s.h2Text).join('|') === H2.join('|'), 'index.html 三区块顺序', H2.join(' | '), F.sections.map((s) => s.h2Text).join(' | '), 'Task 4');
  chk('E3', F.sections.length === 3 && F.sections.every((s) => s.childTags.join(',') === 'h2.home-section__title,p.home-section__text' && s.h2Count === 1 && s.pCount === 1 && s.directH2 && s.directP),
    'index.html .home-section 子节点', '每块恰 1 个直接 h2.home-section__title + 1 个直接 p.home-section__text，无其他元素子节点',
  F.sections.map((s) => s.childTags.join('+')).join(' | '), 'Task 4');
  chk('E4/ids', F.sections.every((s, i) => s.h2Id === IDS[i]), 'index.html h2 id 顺序', IDS.join(' → '), F.sections.map((s) => s.h2Id).join(' → '), 'Task 4');
  chk('E4/labelledby', F.sections.every((s) => s.abResolvedCount === 1 && s.abResolvesToOwnH2 && s.attrs['aria-labelledby'] === s.h2Id),
    'index.html aria-labelledby', '每区块 aria-labelledby 解析到本区块唯一 h2 的 id',
  F.sections.map((s) => `${s.ab}->${s.h2Id}(n=${s.abResolvedCount})`).join(' | '), 'Task 4');
  chk('E4/dup', new Set(F.sections.map((s) => s.h2Id)).size === 3 && F.dupIds.length === 0, 'index.html 标题 ID 唯一', '无重复 ID', F.dupIds.join(','), 'Task 4');
  chk('E5', F.h1s.length === 1 && F.h2s.length === 3 && F.h3s.length === 0 && F.h2s.every((h) => !h.inArticleBody) &&
    (F.mainHTML.match(/<h[1-6]/g) || []).length === 4, 'index.html 标题层级', '1 个 h1 + 3 个同级 h2，无跳级/额外标题/h3',
  `h1=${F.h1s.length} h2=${F.h2s.length} h3=${F.h3s.length} 标题总数=${(F.mainHTML.match(/<h[1-6]/g) || []).length}`, 'Task 4');
  const texts = F.sections.map((s) => s.pText);
  let e6 = true;
  for (let i = 0; i < 3; i++) {
    const want = T4_HOME[KEYS[i]];
    if (texts[i] !== want) {
      e6 = false;
      rec('E6/' + KEYS[i], false, `index.html .home-section:nth(${i + 1}) p`, vis(want), vis(texts[i]) + (texts[i] === want ? '' : ` [码点 期望 ${codes(want)} / 实际 ${codes(texts[i])}]`), 'Task 4');
    } else rec('E6/' + KEYS[i], true, `index.html 第 ${i + 1} 段（${H2[i]}）逐字符`, '', '');
  }
  chk('E6/len', texts.map((t) => t.length).join(',') === KEYS.map((k) => T4_HOME[k].length).join(','), 'index.html 三段字符数（Task 4 冻结值长度）', KEYS.map((k) => T4_HOME[k].length).join(','), texts.map((t) => t.length).join(','), 'Task 4');
  chk('E6/punct', texts.every((t) => t.endsWith('。')) && texts[0].includes('《') && texts[0].includes('》') && texts.every((t) => !/[\u0020\u3000]/.test(t)),
    'index.html 三段标点与空格', '均以中文句号结尾；首条含书名号；均无半角/全角空格（2024年 之间无空格）',
  texts.map((t) => JSON.stringify(t)).join(' | '), 'Task 4');
  chk('E6/all', e6, 'E6 汇总', '三段逐字符等于 Task 4 冻结值', e6 ? '' : '见分项', 'Task 4');
  const badTok = ['P_ORIGIN', 'P_WORK', 'P_FOUNDED', '{{', '}}', 'TODO', 'TBD', '页面登记表中的主标题', '［', '【说明', '待替换'];
  const hitE7 = badTok.filter((t) => S.includes(t));
  chk('E7', hitE7.length === 0 && !/<section[\s\S]*?\[[^\]]*\]/.test(S), 'index.html 未替换记号', '无槽位名/模板方括号/占位记号', '命中: ' + hitE7.join(','), 'Task 4');
  const white = [F.h1s[0].text];
  for (const s of F.sections) white.push(s.h2Text, s.pText);
  const wantWhite = ['《自然选择号》报社简介', '名称由来', T4_HOME.P_ORIGIN, '主要工作与报道方向', T4_HOME.P_WORK, '成立时间', T4_HOME.P_FOUNDED];
  chk('E8', white.join('|') === wantWhite.join('|'), 'index.html 可见内容白名单（按序 7 项）', wantWhite.join(' | '), white.join(' | '), 'Task 4');
  const mainTags = (F.mainHTML.match(/<([a-z][\w-]*)/g) || []).map((t) => t.slice(1));
  const tally = {};
  for (const t of mainTags) tally[t] = (tally[t] || 0) + 1;
  const wantTally = { main: 1, h1: 1, div: 1, section: 3, h2: 3, p: 3 };
  const tallyStr = (o) => Object.keys(o).sort().map((k) => k + '=' + o[k]).join(',');
  chk('E8/noEighth', tallyStr(tally) === tallyStr(wantTally),
    'index.html 无第八项可见正文', 'main 内仅 main/h1/div/section×3/h2×3/p×3，无 h3/列表/图片/链接',
  tallyStr(tally), 'Task 4');
}
function codes(s) { return s === null ? 'null' : Array.from(s).map((c) => c.codePointAt(0).toString(16)).join(' '); }

/* ---------------- F. 文章页结构与逐字符 ---------------- */
for (const f of ['news-message.html', 'news-feature.html', 'news-commentary.html']) {
  const F = FACTS[f], A = F.article, art = ART[f], S = src[f];
  if (!A || !F.dateline) { rec('F0-host/'+f, false, f + ' 已不含 .article／dateline（归档层结构变更）', 'article 区块在场', '区块缺失：显式 FAIL，不抛异常', '接管：L1／L2／L3 + F 组重锚'); continue; }
  const base = art.key === 'M' ? T1_MSG : art.key === 'F' ? T1_FEAT : T1_COMM;
  const want = seq(base, art.key, art.n);
  chk('F1/' + f, F.mainChildEls.length === 1 && F.mainChildEls[0].tag === 'article' && F.mainChildEls[0].cls === 'article' && A,
    f + ' #main-content 唯一子节点', 'article.article', F.mainChildEls.map((k) => k.tag + '.' + k.cls).join(','), 'Task 5/6/7');
  const wantOrder = art.key === 'C' ? 'header.article__header,div.article__body,p.article__date' : 'header.article__header,div.article__body';
  chk('F1/' + f + '/order', (A.childOrder || []).join(',') === wantOrder, f + ' .article 子节点顺序', wantOrder, (A.childOrder || []).join(','), 'Task 5/6/7');
  chk('F2/' + f, A.header && A.header.order.join(',') === 'p.article__type,h1.page-title,p.article__byline' && A.header.order.length === 3,
    f + ' .article__header 直接子元素', 'p.article__type → h1.page-title → p.article__byline（恰三项）', (A.header ? A.header.order : []).join(','), 'Task 5/6/7');
  chk('F3/' + f, A.header.attrs[0]['class'] === 'article__type' && A.header.texts[0] === 'p :: ' + art.type && A.header.attrs[2]['class'] === 'article__byline',
    f + ' .article__type', 'p :: ' + art.type, A.header.texts[0], 'Task 5/6/7');
  chk('F3/' + f + '/no评价', !S.includes('新闻评价') && !F.bodyText.includes('新闻评价'), f + ' 不出现“新闻评价”', '0 次', (S.match(/新闻评价/g) || []).length + ' 次', 'Task 5/6/7');
  chkEq('F4/' + f, F.h1s[0].text, REG[f].h1, f + ' h1.page-title textContent', 'Task 5/6/7');
  chk('F4/' + f + '/cls', F.h1s[0].cls === 'page-title' && F.counts.pageTitle === 1, f + ' h1 class', 'page-title 唯一', F.h1s[0].cls, 'Task 5/6/7');
  chkEq('F5/' + f, A.header.texts[2], 'p :: 蓝色空间', f + ' .article__byline', 'Task 5/6/7');
  chk('F5/' + f + '/prefix', !/(作者：|记者：|评论员：|文／)/.test(A.header.texts.join('|')), f + ' 署名前缀', '无“作者：/记者：/评论员：/文／”', A.header.texts.join(' | '), 'Task 5/6/7');
  chk('F6/' + f, A.body.pCount === art.n && A.body.nonPChildren.length === 0 && A.body.emptyPs === 0 && A.body.childOrder.every((t) => t === 'p'),
    f + ' .article__body > p 数量', `${art.n} 段，无其他元素子节点、无空段`, `${A.body.pCount} 段；非 p 子节点=${JSON.stringify(A.body.nonPChildren)}；空段=${A.body.emptyPs}`, art.key === 'M' ? 'Task 5' : art.key === 'F' ? 'Task 6' : 'Task 7');
  const got = F.paragraphs.map((p) => p.text);
  let firstDiff = -1;
  for (let i = 0; i < Math.max(got.length, want.length); i++) if (got[i] !== want[i]) { firstDiff = i; break; }
  chk('F7/' + f, got.length === want.length && firstDiff === -1, f + ' 逐段 textContent 严格相等',
    `${want.length} 项，首个差异索引 -1`, firstDiff < 0 ? '长度不符: ' + got.length : `首个差异 index=${firstDiff} (${art.key}${String(firstDiff + 1).padStart(2, '0')}) 期望 ${vis(want[firstDiff])} 实际 ${vis(got[firstDiff])}`,
    art.key === 'M' ? 'Task 5' : art.key === 'F' ? 'Task 6' : 'Task 7');
  const ckey = (i) => art.key + ':' + art.key + String(i + 1).padStart(2, '0');
  const lenBad = want.map((w, i) => [i, CNT[ckey(i)], got[i] === undefined ? null : got[i].length])
    .filter((x) => x[1] !== undefined && x[1] !== x[2])
    .map((x) => art.key + String(x[0] + 1).padStart(2, '0') + ': 合同' + x[1] + '/实际' + x[2]);
  const selfBad = want.map((w, i) => CNT[ckey(i)] === w.length ? '' : ckey(i) + '=' + CNT[ckey(i)] + '!=' + w.length).filter(String);
  chk('F7/' + f + '/chars', lenBad.length === 0 && selfBad.length === 0,
    f + ' 逐段字符数（Task 1 §3 字符数基线）', want.map((w, i) => CNT[ckey(i)]).join(','),
    (lenBad.join(' | ') || '实际 ' + got.map((g) => g.length).join(',')) + (selfBad.length ? ' | 合同自洽: ' + selfBad.join(',') : ''),
    art.key === 'M' ? 'Task 5' : art.key === 'F' ? 'Task 6' : 'Task 7');

  if (art.key === 'C') {
    chk('F8/' + f, F.dateline.strongCountInPage === 0 && !F.article.html.includes('dateline') && F.paragraphs.every((p) => p.tags.length === 0),
      f + ' 评论页无 .dateline', '0 个 strong.dateline；正文 p 无内联标签', `${F.dateline.strongCountInPage} 个；内联标签=${JSON.stringify(F.paragraphs.map((p) => p.tags).filter((t) => t.length))}`, 'Task 7');
    const d = A.date;
    chk('F9/' + f, !!d && d.tag === 'p' && d.attrs['class'] === 'article__date' && d.isDirectChildOfArticle && !d.isInBody && d.isLastArticleChild && A.body.pCount === 29 && !d.html.includes('<time') && !/datetime/i.test(d.html),
      f + ' .article__date 位置', '恰 1 个 p.article__date，是 .article 最后一个直接子节点，不在 .article__body 内，非第 30 段，无 <time>/datetime',
      JSON.stringify(d && { tag: d.tag, cls: d.attrs['class'], inBody: d.isInBody, last: d.isLastArticleChild, ps: A.body.pCount }), 'Task 7');
    chkEq('F9/' + f + '/text', d ? d.text : null, T1_COMM.closing_date, f + ' 末尾日期逐字符', 'Task 7');
    chk('F9/' + f + '/form', !!d && /^[（(]/.test(d.text) === (/^（/.test(d.text)) && d.text.startsWith('（') && d.text.endsWith('）') && !/20\d\d/.test(d.text) && d.text.length === CNT['C:closing_date'],
      f + ' 末尾日期全角括号/无年份', `（自然选择号9月18日），长度 ${CNT['C:closing_date']}`, d ? `${vis(d.text)} 长度 ${d.text.length}` : 'null', 'Task 7');
  } else {
    const dl = F.dateline, firstChar = art.key === 'M' ? '我' : '上';
    chk('F8/' + f + '/node', dl.present && dl.strongIsFirstChild && dl.parentIsFirstP && dl.childNodes[0].nodeType === 1 && dl.childNodes[0].name === 'STRONG',
      f + ' 电头为首个正文 <p> 的首个子节点', '第一个 <p> 的 firstChild 为 strong.dateline', JSON.stringify(dl.childNodes.map((n) => [n.nodeType, n.name])), art.key === 'M' ? 'Task 5' : 'Task 6');
    chkEq('F8/' + f + '/text', dl.text, art.key === 'M' ? '自然选择号9月18日7时电' : '自然选择号9月17日电', f + ' strong.dateline textContent', art.key === 'M' ? 'Task 5' : 'Task 6');
    const nt = dl.nextText || '';
    chk('F8/' + f + '/space', dl.nextText !== null && nt.codePointAt(0) === 0x20 && nt.codePointAt(1) === firstChar.codePointAt(0) && nt.codePointAt(2) !== 0x20 && nt.codePointAt(1) !== 0x20 && !/[\u00A0\u3000]/.test(nt.slice(0, 3)) && nt.codePointAt(0) === 0x20,
      f + ' 电头后紧邻空格', `</strong> 后文本节点首字符 U+0020、次字符“${firstChar}”，且只有一个 U+0020（无 &nbsp;/全角空格/第二空格）`,
      `${vis(nt.slice(0, 4))} 码点=${codes(nt.slice(0, 3))}`, art.key === 'M' ? 'Task 5' : 'Task 6');
    chk('F8/' + f + '/one', (dl.pHtml.match(/<strong/g) || []).length === 1 && !/&nbsp;/.test(dl.pHtml) && !/[\u00A0\u3000]/.test(dl.pText) && !/  /.test(dl.pText),
      f + ' 电头唯一性与无多余空格', '仅 1 个 <strong>；正文无 &nbsp;/全角空格/连续两空格', `${(dl.pHtml.match(/<strong/g) || []).length} 个 strong`, art.key === 'M' ? 'Task 5' : 'Task 6');
    chk('F9/' + f, A.date === null && F.counts.articleDate === 0, f + ' 不得出现 .article__date', '0 个', `${F.counts.articleDate} 个`, art.key === 'M' ? 'Task 5' : 'Task 6');
  }
  const cf = F.counts;
  chk('F10/' + f, cf.blockquote === 0 && cf.q === 0 && cf.cite === 0 && cf.ol === 0 && cf.liInBody === 0 && cf.img === 0 && cf.time === 0 &&
    cf.aInArticle === 0 && F.h2s.length === 0 && F.h3s.length === 0 &&
    F.paragraphs.every((p, i) => art.key === 'C' ? p.tags.length === 0 : (i === 0 ? p.tags.join(',') === 'strong' : p.tags.length === 0)),
    f + ' 正文禁用内联/块级标签', '无 blockquote/q/cite/正文 h2/ul/ol/li/img/正文链接/<time>；正文 p 内除电头 <strong> 外无其他标签',
    `bq=${cf.blockquote} q=${cf.q} cite=${cf.cite} ol=${cf.ol} li=${cf.liInBody} img=${cf.img} time=${cf.time} a=${cf.aInArticle} h2=${F.h2s.length} 内联=${JSON.stringify(F.paragraphs.map((p) => p.tags).filter((t) => t.length))}`, art.key === 'M' ? 'Task 5' : art.key === 'F' ? 'Task 6' : 'Task 7');
  chk('F10/' + f + '/ul', cf.ul === 1, f + ' 唯一 <ul> 为导航列表', '1（页面壳内），正文 0', `ul=${cf.ul} main li=${cf.liInBody}`, art.key === 'M' ? 'Task 5' : art.key === 'F' ? 'Task 6' : 'Task 7');
  const wsBad = [];
  F.paragraphs.forEach((p, i) => {
    const t = p.text;
    if (/^[\s\u00A0\u3000]/.test(t) || /[\s\u00A0\u3000]$/.test(t)) wsBad.push(i + ':首尾空白 ' + codes(t.slice(0, 2)) + '/' + codes(t.slice(-2)));
    if (/  /.test(t) || /[\n\r\t]/.test(t)) wsBad.push(i + ':段内空白 ' + codes(t));
  });
  const dbl = F.paragraphs.filter((p) => /  |[\n\r\t]/.test(p.text)).map((p) => p.i);
  chk('F11', wsBad.length === 0 && dbl.length === 0, f + ' 段落空白规范', '无前导/尾随空白，无折行造成的段内多余空白（以 textContent 为准）',
    (wsBad.concat('连续空格所在段: ' + dbl.join(','))).join(' | '), art.key === 'M' ? 'Task 5' : art.key === 'F' ? 'Task 6' : 'Task 7');
}

/* ---------------- G. 高风险字符与计数 ---------------- */
try{
  const m = FACTS['news-message.html'].paragraphs.map((p) => p.text);
  const mt = m.join('\n');
  for (const s of ['今日7时', '47个社团', '第一志愿、第二志愿', '9月18日7时电'])
    chkEq('G1/has:' + s, m[0].includes(s), true, 'news-message.html 正文含 ' + s, 'Task 5');
  chk('G1/semi', m[1].includes('；'), 'news-message.html M02 中文分号', '含 U+FF1B ；', JSON.stringify(m[1].slice(0, 0)) + ' 实际分号数=' + (m[1].match(/；/g) || []).length, 'Task 5');
  chk('G1/noyear', !/(19|20)\d\d年9月18日/.test(mt) && mt.includes('自然选择号9月18日'), 'news-message.html 9月18日 前无年份', '无四位年份前缀', mt.match(/.{4}9月18日/g) + '', 'Task 5');

  const fe = FACTS['news-feature.html'].paragraphs.map((p) => p.text);
  const ft = fe.join('');
  const want = { AI: 19, ai: 0, Ai: 0, aI: 0, '“': 8, '”': 8, '‘': 2, '’': 2, '\u2014': 2, '——': 1, '？': 1, '：': 2, '；': 3, ' ': 1 };
  const cntContract = { AI: (seq(T1_FEAT, 'F', 23).join('').match(/AI/g) || []).length, ' ': (seq(T1_FEAT, 'F', 23).join('').match(/ /g) || []).length };
  const g2 = [];
  const c2 = (k, re, str) => (str.match(re) || []).length;
  const got = {
    AI: c2('AI', /AI/g, ft), ai: c2('ai', /ai/g, ft), Ai: c2('Ai', /Ai/g, ft), aI: c2('aI', /aI/g, ft),
    '“': c2('lq', /“/g, ft), '”': c2('rq', /”/g, ft), '‘': c2('lsq', /‘/g, ft), '’': c2('rsq', /’/g, ft),
    '\u2014': c2('dash', /\u2014/g, ft), '——': c2('dbl', /——/g, ft), '？': c2('q', /？/g, ft),
    '：': c2('c', /：/g, ft), '；': c2('s', /；/g, ft), ' ': c2('sp', / /g, ft),
  };
  for (const k of Object.keys(want)) if (got[k] !== want[k]) g2.push(`${JSON.stringify(k)}: 期望 ${want[k]} 实际 ${got[k]}`);
  const contractG2 = [];
  for (const k of Object.keys(want)) {
    const cv = k === 'AI' ? cntContract.AI : k === ' ' ? cntContract[' '] : (seq(T1_FEAT, 'F', 23).join('').match(new RegExp(k === '\u2014' ? '\u2014' : k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (cv !== want[k]) contractG2.push(`${JSON.stringify(k)}: Task1 合同 ${cv} vs G2 ${want[k]}`);
  }
  chk('G2', g2.length === 0, 'news-feature.html 23 段合并计数', JSON.stringify(want), JSON.stringify(got), 'Task 6');
  chk('G2/contract', contractG2.length === 0, 'G2 期望值与 Task 1 合同一致性', 'Task1 合同与 G2 计数一致', contractG2.join(' | '), 'Task 10 合同冲突 → Task 6');
  const dashAlone = (ft.match(/(^|[^\u2014])\u2014($|[^\u2014])/g) || []).length;
  chk('G2/dash-adj', got['\u2014'] === 2 && got['——'] === 1 && dashAlone === 0, 'news-feature.html 破折号', 'U+2014 共 2 个且相邻组成唯一一处 ——，无孤立破折号', `U+2014=${got['\u2014']} ——=${got['——']} 孤立=${dashAlone}`, 'Task 6');
  const she = fe.map((t, i) => (t.includes('她') ? i : -1)).filter((i) => i >= 0);
  const ta = fe.map((t, i) => (t.includes('他') ? i : -1)).filter((i) => i >= 0);
  chk('G2/pron', fe[4].startsWith('在她看来') && she.join(',') === '4' && ta.includes(1) && ta.includes(9) && ta.includes(11) && ta.includes(19),
    'news-feature.html 人称未统一', 'F05“在她看来”（仅段索引 4 含“她”），F02/F12/F20 等保留“他”', `她段=${she.join(',')} 他段=${ta.join(',')}`, 'Task 6');
  chkEq('G2/title-ai', (REG['news-feature.html'].h1.match(/AI/g) || []).length + got.AI, 20, 'news-feature.html 标题+正文 AI 合计 20', 'Task 6');

  const cm = FACTS['news-commentary.html'].paragraphs.map((p) => p.text);
  const ct = cm.join('');
  const want3 = { '.exe': 3, '安 装': 0, 'Windows 10': 2, 'Windows10': 0, '。exe': 0 };
  const got3 = {
    '.exe': (ct.match(/\.exe/g) || []).length, '安 装': (ct.match(/安 装/g) || []).length,
    'Windows 10': (ct.match(/Windows 10/g) || []).length, 'Windows10': (ct.match(/Windows10/g) || []).length,
    '。exe': (ct.match(/。exe/g) || []).length,
  };
  const g3 = [];
  for (const k of Object.keys(want3)) if (got3[k] !== want3[k]) g3.push(`${k}: 期望 ${want3[k]} 实际 ${got3[k]}`);
  for (const k of ['UOS', 'USB', 'OPS', 'Linux', '4K', '86英寸', '5次碰撞', '3个U盘']) if (!ct.includes(k)) g3.push(`缺失 ${k}`);
  if (!/\.(exe)/.test(ct)) g3.push('.exe 前导句点缺失');
  const c05 = cm[4] || '', c21 = cm[20] || '', c26 = cm[25] || '', c29 = cm[28] || '';
  for (const s of ['不完全统计', '5次碰撞', '3个U盘被撞坏', '还需要进一步检查']) if (!c05.includes(s)) g3.push(`C05 缺失 ${s}`);
  if (!c21.includes('科大讯飞')) g3.push('C21 缺失 科大讯飞');
  if (FACTS['news-commentary.html'].counts.aInArticle !== 0) g3.push('C21 科大讯飞被包在 <a> 内');
  if (!c26.includes('；') || FACTS['news-commentary.html'].counts.liInBody !== 0) g3.push('C26 被改为列表或非单段');
  if (!(c29 === T1_COMM.C29)) g3.push('C29 与合同不符');
  if (!c29.includes('设备升级了，使用门槛也该降下来。') || !c29.includes('“科技不是高高在上的，而应该服务人民。”')) g3.push('C29 缺少标题复述或结尾引语');
  if (/(19|20)\d\d年9月18日/.test(ct)) g3.push('9月18日 前出现年份');
  if ((ct.match(/ /g) || []).length !== 2) g3.push(`正文半角空格数=${(ct.match(/ /g) || []).length}（Windows 10 两处）`);
  chk('G3', g3.length === 0, 'news-commentary.html 高风险计数', JSON.stringify(want3) + ' + UOS/USB/OPS/Linux/4K/86英寸/5次碰撞/3个U盘/C05四项/C21/C26/C29', JSON.stringify(got3) + ' | ' + g3.join(' ; '), 'Task 7');
}catch(e){rec('G0-host',false,'G 组宿主 news-*.html','可判定','崩溃被捕获：'+String(e && e.message).slice(0,120),'接管：F／G 组重锚到 article-*.html');}

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

/* ---------------- I. script.js 静态合同 ---------------- */
{
  const J = src['script.js'];
  chk('I1', PAGES.every((f) => FACTS[f].scripts.length === 1 && FACTS[f].scripts[0].attrs.src === 'script.js' && 'defer' in FACTS[f].scripts[0].attrs) && files.filter((n) => /\.js$/i.test(n)).length === 1,
    'script.js 唯一性与 defer', '四页各恰一个 <script src="script.js" defer>，Results/ 只有一个 .js',
    PAGES.map((f) => f + ':' + JSON.stringify(FACTS[f].scripts.map((s) => s.attrs))).join(' '), 'Task 9');
  chk('I1/extra', files.filter((n) => /\.(json|map|polyfill)/i.test(n)).length === 0, '第二脚本/polyfill/配置 JSON', '无', files.join(','), 'Task 9');
  chk('I2', !/\bimport\b|\bexport\b/.test(J) && !/https?:\/\/|fetch\(|XMLHttpRequest|require\(|import\(/.test(J), 'script.js 模块与外部依赖', '普通脚本；无 import/export/URL/fetch/XHR/第三方库',
    (J.match(/\bimport\b|\bexport\b|https?:\/\/|fetch\(|XMLHttpRequest|require\(/g) || []).join(','), 'Task 9');
  chk('I3', !/console\s*\./.test(J) && !/\bdebugger\b/.test(J), 'script.js console/debugger', '0 次', `console=${(J.match(/console\s*\./g) || []).length} debugger=${(J.match(/\bdebugger\b/g) || []).length}`, 'Task 9');
  chk('I4', (J.match(/\(\s*min-width\s*:\s*769px\s*\)/g) || []).length === 1 && !/768px|48rem|innerWidth|offsetWidth|clientWidth/.test(J),
    'script.js 断点字符串', '恰一处 (min-width: 769px)；无 768px/48rem/innerWidth/offsetWidth',
    (J.match(/\(\s*(min|max)-width\s*:\s*[^)]*\)/g) || []).join(' , ') + ' | ' + (J.match(/innerWidth|offsetWidth|clientWidth|48rem|768px/g) || []).join(','), 'Task 9');
  /* 枚举全部“状态写入调用点”，接收者表达式按原文截取，避免 document.querySelector('x').setAttribute 被漏检 */
  const writes = [...J.matchAll(/([^;{}()\n]*?)\.(setAttribute|removeAttribute|classList|style|innerHTML|outerHTML|insertAdjacentHTML|innerText|textContent|className)(\.(add|remove|toggle|contains|setItem))?\s*\(/g)]
    .map((m) => m[1].trim().replace(/\s+/g, ' ') + '.' + m[2] + (m[3] || ''));
  const allowed = ['root.classList.remove', 'root.classList.add', 'navigation.classList.contains', 'navigation.classList.toggle', 'toggle.setAttribute'];
  const isAllowed = (w) => allowed.some((a) => new RegExp('(?:^|[\\s.])' + a.replace(/\./g, '\\.') + '$').test(w));
  const over = writes.filter((w) => !isAllowed(w));
  chk('I5', over.length === 0 && /classList\.remove\('no-js'\)/.test(J) && /classList\.add\('js'\)/.test(J) &&
    /classList\.toggle\('is-open'/.test(J) && /setAttribute\('aria-expanded'/.test(J) &&
    (writes.filter((w) => w === 'toggle.setAttribute').length === 1) && (writes.filter((w) => w === 'navigation.classList.toggle').length === 1),
    'script.js 状态写入范围', '仅三处：documentElement 的 no-js/js、#site-navigation 的 is-open、#nav-toggle 的 aria-expanded',
    `写入点=${writes.join(' , ')} | 越权=${over.join(',')}`, 'Task 9');
  chk('I5/assign', !/\.\s*style\s*\.\s*\w+\s*=|innerHTML\s*=|innerText\s*=|textContent\s*=|className\s*=[^=]/.test(J), 'script.js 改写禁令', '无 style/innerHTML/className 整体改写或文本注入',
    (J.match(/\.\s*style\s*\.|innerHTML\s*=|innerText\s*=|textContent\s*=|className\s*=/g) || []).join(','), 'Task 9');
  chk('I6', /getElementById\(['"]nav-toggle['"]\)/.test(J) && /getElementById\(['"]site-navigation['"]\)/.test(J) && /querySelector(?:All)?\(['"]\.site-navigation__link['"]\)|closest\(['"]\.site-navigation__link['"]\)/.test(J) &&
    !/querySelector[^)]*[\u4e00-\u9fff]/.test(J) && !/children\[\d|\]\.children\[/.test(J),
    'script.js 查询依据', '基于 #nav-toggle / #site-navigation / .site-navigation__link；不以中文链接文本或位置索引判定',
    (J.match(/getElementById\([^)]*\)|querySelector\([^)]*\)|closest\([^)]*\)/g) || []).join(' , '), 'Task 9');
  const firstWriteIdx = J.search(/setAttribute|classList\.(add|remove|toggle)/);
  const noJsIdx = J.search(/classList\.remove\(['"]no-js['"]\)/);
  chk('I7', noJsIdx > 0 && (firstWriteIdx === noJsIdx) && !/['"](tabindex|aria-hidden|hidden)['"]/.test(J),
    'script.js no-js→js 位置', 'no-js→js 是首个实质状态写入；不用 tabindex/aria-hidden/hidden 管理可聚焦性',
    `no-js 位置=${noJsIdx} 首个写入位置=${firstWriteIdx} 首个写入=${JSON.stringify(J.slice(firstWriteIdx, firstWriteIdx + 24))}`, 'Task 9');
  const i8 = [];
  for (const t of ['厨一枚', '胡桃', '2026', 'Materials/', 'Materials\\', '.docx', 'C:\\', 'closing_date', 'P_ORIGIN', 'P_WORK', 'P_FOUNDED']) if (J.includes(t)) i8.push(t);
  for (const h of Object.values(FROZEN_HASHES)) if (J.includes(h.slice(0, 12))) i8.push('hash:' + h.slice(0, 12));
  if (/(^|[^A-Za-z])[MFC](0[1-9]|[12]\d|30)([^0-9]|$)/.test(J)) i8.push('段落编号（含注释）');
  chk('I8', i8.length === 0, 'script.js 禁止信息（含注释）', '无元数据作者/推断年份/文件路径/哈希/内部段落编号', i8.join(','), 'Task 9');
  const outside = [...J.matchAll(/(document|window|body|documentElement)\s*\.\s*addEventListener\(\s*['"](\w+)['"]/g)].filter((m) => /^(click|pointerdown|mousedown|touchstart|mouseup)$/.test(m[2]));
  chk('I9', outside.length === 0, 'script.js 点击外部关闭', '未监听 document/window 的 click/pointerdown/mousedown/touchstart 判定菜单外点击',
    outside.map((m) => m[1] + ':' + m[2]).join(' , ') || '无', 'Task 9（移除越权逻辑）');
  rows.push({ id: 'I 事件绑定', st: 'PASS', loc: 'script.js', exp: '', act: (J.match(/addEventListener\(\s*['"][\w-]+['"]/g) || []).map((s) => s.replace(/addEventListener\(\s*['"]|['"]$/g, '')).join(' , '), handoff: '' });
}

/* ---------------- J. 禁止项全局扫描（仅 Results/） ---------------- */
{
  const all = files.map((f) => [f, read(path.join(RESULTS, f))]);
  const M4 = seq(T1_MSG, 'M', 4), F23 = seq(T1_FEAT, 'F', 23), C29 = seq(T1_COMM, 'C', 29);
  const JGROUPS = {
    J1: ['厨一枚', '胡桃', '厨一枚~ 胡桃'],
    J2: ['2026'],
    J3: ['新闻评价'],
    J4: ['M01', 'M02', 'M03', 'M04', ...F23.map((_, i) => 'F' + String(i + 1).padStart(2, '0')), ...C29.map((_, i) => 'C' + String(i + 1).padStart(2, '0')), 'closing_date', 'P_ORIGIN', 'P_WORK', 'P_FOUNDED'],
    J5: ['新闻消息.docx', '新闻通讯.docx', '新闻评价.docx', 'Materials/', 'Materials\\', 'C:\\', 'D:\\', '.docx'],
    J6: Object.values(FROZEN_HASHES).flatMap((h) => [h, h.slice(0, 16), h.slice(0, 12)]),
    J7: ['作者：', '记者：', '评论员：', '文／', '来源：', '出处：'],
    J8: ['TODO', 'TBD', 'Lorem', 'Lorem ipsum', '{{', '}}', '待补充', '占位', '示例文本', '页面登记表中的主标题'],
    J9: ['datetime=', '<time'],
    J10: ['http://', 'https://', '//cdn', '@import', '@font-face', 'url('],
  };
  for (const [id, toks] of Object.entries(JGROUPS)) {
    const hits = [];
    for (const [f, text] of all) for (const t of toks) {
      let i = text.indexOf(t);
      while (i >= 0) { hits.push(`${f}:${t}@${i} …${text.slice(Math.max(0, i - 12), i + t.length + 12).replace(/\n/g, '\\n')}…`); i = text.indexOf(t, i + 1); if (hits.length > 6) break; }
    }
    chk(id, hits.length === 0, `Results/ 全文（${toks.length} 个禁止串）`, '命中数 0', hits.slice(0, 5).join(' | ') || '0', '产生该内容的上游任务');
  }
  const falseCheck = ['记者', '来源'].map((t) => files.filter((f) => read(path.join(RESULTS, f)).includes(t)).join(','));
  rows.push({ id: 'J 说明', st: 'PASS', loc: 'Results/', exp: '', act: `“记者”仅出现在 C05 冻结正文（${falseCheck[0] || '无'}），被禁的是“记者：”署名前缀；扫描范围仅 Results/ 六文件`, handoff: '' });
}

/* ---------------- K. 跨页公共壳一致性 ---------------- */
{
  const normHead = (f) => FACTS[f].headHTML.replace(/(<title>)[\s\S]*?(<\/title>)/, '$1@@TITLE@@$2');
  const normShell = (f) => FACTS[f].bodyShellHTML.join('\n').replace(/\s+aria-current="page"/g, '').replace(/<main[\s\S]*?<\/main>/g, '@@MAIN@@');
  const heads = PAGES.map(normHead), shells = PAGES.map(normShell);
  chk('K1/head', heads.every((h) => h === heads[0]), '四页 <head> 规范化后一致', '与 index.html 完全一致',
    PAGES.map((f, i) => f + ':' + (heads[i] === heads[0] ? '同' : '差异@' + firstDiffPos(heads[i], heads[0]))).join(' '), 'Task 2');
  chk('K1/shell', shells.every((s) => s === shells[0]), '四页 body（除 main）规范化后一致', '与 index.html 完全一致',
    PAGES.map((f, i) => f + ':' + (shells[i] === shells[0] ? '同' : '差异@' + firstDiffPos(shells[i], shells[0]))).join(' '), 'Task 2');
  chk('K1/html', PAGES.every((f) => JSON.stringify(FACTS[f].html.attrs) === JSON.stringify(FACTS['index.html'].html.attrs)), '四页 <html> 属性一致', '一致',
    PAGES.map((f) => f + ':' + JSON.stringify(FACTS[f].html.attrs)).join(' '), 'Task 2');
  const sig = (f) => FACTS[f].bodyChildren.map((k) => k.tag + '.' + (k.cls || '') + '#' + (k.id || '')).join(' , ');
  chk('K2', PAGES.every((f) => sig(f) === sig('index.html')), '四页 body 子元素序列一致', sig('index.html'), PAGES.map((f) => f + ':' + sig(f)).join(' || '), 'Task 2');
  const mains = PAGES.map((f) => FACTS[f].mainChildEls.map((k) => k.tag + '.' + k.cls).join('+'));
  chk('K2/mains', mains[0] === 'h1.page-title+div.home-sections' && mains[1] === 'article.article' && mains[2] === 'article.article' && mains[3] === 'article.article',
    'K2 差异仅在各页 main 内容区', '首页 h1.page-title+div.home-sections；三文章页 article.article', PAGES.map((f, i) => f + ':' + mains[i]).join(' || '), 'Task 2');
  const bodyAttrs = PAGES.map((f) => (src[f].match(/<body([^>]*)>/i) || [])[1] || '');
  chk('K3', new Set(bodyAttrs).size === 1 && bodyAttrs[0].trim() === '' && PAGES.every((f) => FACTS[f].counts.footer === 0) &&
    PAGES.every((f) => FACTS[f].counts.form === 0) && PAGES.every((f) => FACTS[f].eventAttrs.length === 0) &&
    PAGES.every((f) => FACTS[f].dupIds.length === 0) && PAGES.every((f) => FACTS[f].bodyChildren.length === 3),
    'K3 页面独有结构', '无页面专属 body class、无页脚、无内联脚本/事件、无额外 wrapper、无重复 ID',
    bodyAttrs.map((a, i) => PAGES[i] + ':' + JSON.stringify(a)).join(' ') + ' body子元素=' + PAGES.map((f) => FACTS[f].bodyChildren.length).join(','), 'Task 2');
}
function firstDiffPos(a, b) { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i + ' {A:' + JSON.stringify(a.slice(i, i + 40)) + ' B:' + JSON.stringify(b.slice(i, i + 40)) + '}'; }

/* ---------------- 输出 ---------------- */
function dump() {
const fails = rows.filter((r) => r.st === 'FAIL');
const pend = rows.filter((r) => r.st === 'PENDING');
const out = [];
out.push('# Task 10 结构与内容自动核验报告');
out.push('');
out.push(`- 核验时间：${new Date().toISOString()}`);
out.push(`- 交付目录：${RESULTS}（核验前后 SHA-256 与清单见 A5）`);
out.push(`- 真值来源：plan/Task1（哈希/逐段合同/字符数）、plan/Task2（页面登记表）、plan/Task4（首页三段冻结文本）、plan/Task3/5/6/7/8/9 合同`);
out.push(`- DOM 真值：真实无头 Chrome（CDP）逐页只读快照 dom_facts.json；文本比较一律逐字符、不归一化`);
out.push(`- 断言总数：${rows.length}　PASS：${rows.length - fails.length - pend.length}　FAIL：${fails.length}　PENDING：${pend.length}`);
out.push('');
out.push('```text');
for (const r of rows) out.push(`[${r.id}] ${r.st} ${r.loc}${r.st === 'FAIL' ? ' — 期望: ' + r.exp + ' — 实际: ' + r.act + ' — 移交: ' + r.handoff : (r.exp || r.act ? ' — ' + (r.act || r.exp) : '')}`);
out.push('```');
out.push('');
if (fails.length) {
  out.push('## 失败项与移交清单');
  out.push('');
  out.push('| 断言 | 文件/定位 | 期望 | 实际 | 移交 |');
  out.push('| --- | --- | --- | --- | --- |');
  for (const r of fails) out.push(`| ${r.id} | ${r.loc} | ${r.exp.replace(/\|/g, '\\|')} | ${r.act.replace(/\|/g, '\\|')} | ${r.handoff} |`);
} else {
  out.push('## 闸门判定');
  out.push('');
  out.push('全部断言通过，无 FAIL、无 PENDING：Task 10 判定 **通过**，移交 Task 11 执行浏览器回归。');
}
out.push('');
out.push('## 未覆盖项（按合同移交 Task 11）');
out.push('');
out.push('- 真实渲染版心/字号/行高/对比度、375/768/769/1280px 与 200% 缩放、菜单点击/Esc/焦点/跨断点重置、禁用 JS/CSS 降级、控制台 0 报错与资源 404。');
out.push('');
out.push('## 完成定义对照（Task 10 验收清单）');
out.push('');
out.push('| 完成定义项 | 覆盖断言 | 状态 |');
out.push('| --- | --- | --- |');
const gstat = (re) => {
  const rs = rows.filter((r) => re.test(r.id));
  if (!rs.length) return '— 无对应断言';
  const bad = rs.filter((r) => r.st !== 'PASS').length;
  return (bad ? '✘ ' + bad + ' 项未通过 / ' : '✔ 全绿（') + rs.length + (bad ? '' : ' 条）');
};
const CHECKS = [
  ['核验全程只读；六交付文件与三份素材在核验前后 SHA-256 与清单一致', /^A5$|^A4/, 'baseline/hashes_before.txt ↔ hashes_after_check.txt'],
  ['A 组：Results/ 恰好六个文件、命名精确、无第七个文件或临时产物', /^A/, ''],
  ['B 组：三份素材 SHA-256 完整匹配 Task 1 冻结值', /^B/, ''],
  ['C、D、K 组：公共壳、<head>、稳定 ID／class、ARIA、16 条导航、四个唯一当前项、跨页一致', /^(C|D|K)/, ''],
  ['E 组：首页三区块节点／标题／ID／aria-labelledby／顺序／白名单，E6 逐字符', /^E/, ''],
  ['F 组：三篇 .article 结构、段落数 4／23／29+1、电头与日期边界、逐项 textContent', /^F/, ''],
  ['G 组：三页高风险字符与计数断言', /^G/, ''],
  ['H 组：styles.css 无外部资源／ID／!important／被禁视觉模式，移动区段 max-width: 768px', /^H/, ''],
  ['I 组：script.js 唯一、defer、无外部依赖与 console、断点 769px、三处状态、无点击外部关闭', /^I/, ''],
  ['J 组：Results/ 禁止项全局扫描逐项为 0', /^J/, ''],
  ['可追溯核验报告（本报告，位于 Results/ 之外）', /^A/, 'report.md'],
  ['临时脚本与报告均在 Results/ 之外', /^A2/, 'qa/_qa_task10/'],
];
for (const [item, re, extra] of CHECKS) out.push('| ' + item + ' | ' + re + ' | ' + gstat(re) + (extra ? '（' + extra + '）' : '') + ' |');
out.push('');
out.push('## 变异对照（核验器自身有效性）');
out.push('');
out.push('- 见 mutation_log.md：向 Results/ 副本注入违约后，对应断言必须翻红；真实交付目录未被触碰。');
fs.writeFileSync(process.env.QODER_REPORT || path.join(HERE, 'report.md'), out.join('\n'), 'utf8');
process.stdout.write(rows.map((r) => `[${r.id}] ${r.st}${r.st === 'FAIL' ? ' — 期望: ' + r.exp + ' — 实际: ' + r.act + ' — 移交: ' + r.handoff : ''}`).join('\n') + '\n');
process.stdout.write(`\n总计 ${rows.length} 条：PASS ${rows.length - fails.length - pend.length} / FAIL ${fails.length} / PENDING ${pend.length}\n`);
return fails.length + pend.length;
}
process.on('uncaughtException', (e) => {
  rec('核验器异常', false, 'verify_task10.mjs（结构破坏使断言不可判定）', '所有断言可判定', e && e.message, '对应上游任务');
  process.exitCode = dump() ? 1 : 0;
});
process.exitCode = dump() ? 1 : 0;
