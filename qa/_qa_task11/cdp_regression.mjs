/* Task 11 — 浏览器端到端回归与集成验收（真实 CDP 驱动 Blink 渲染器）
 *
 * 只读：绝不写入 Results/ 或 Materials/；全部产物落在 _qa_task11/。
 * 手段：Emulation.setDeviceMetricsOverride（真实视口/缩放/跨断点，会派发 mediaquery change）、
 * Input.dispatchMouseEvent / dispatchKeyEvent（可信点击与键盘）、
 * Emulation.setScriptExecutionDisabled（真禁用 JS）、styleSheets[].disabled（真禁用 CSS）、
 * Runtime/Log/Network/Page.getResourceTree（0 报错 0 警告、资源与外部请求）、Accessibility（无障碍树）。
 * 冷/热历史 A/B：:visited 只在真实浏览器带历史时才暴露，先用全新 profile 取冷色基线，
 * 再访问其他页后回看同一条链接，分离出「组件覆盖是否完整」这一运行时专属缺陷。
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fileURL from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { pngDecode, inkColorOf } from './png.mjs';

const HERE = path.dirname(fileURL.fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const RESULTS = process.env.QODER_RESULTS_DIR ? path.resolve(process.env.QODER_RESULTS_DIR || path.join(ROOT, 'Results')) : path.join(ROOT, 'Results');
const MATERIALS = path.join(ROOT, 'Materials');
const SHOTS = path.join(HERE, 'shots');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = Number(process.env.QODER_CDP_PORT || 9351);
const PROFILE = path.join(HERE, '.cdp' + PORT + '-' + Date.now());   // 每次运行全新 profile（冷历史）
const ONLY = process.env.QODER_ONLY || '';
const TAG = process.env.QODER_TAG || '';
const PASSES = (process.env.QODER_PASS || 'all').split(',');
const want = (p) => PASSES.indexOf('all') >= 0 || PASSES.indexOf(p) >= 0;
const INK_RGB = [33, 31, 28];
const INK = 'rgb(33, 31, 28)';
const ACCENT = 'rgb(122, 36, 36)';
const PAPER = 'rgb(245, 239, 228)';

const PAGES = ['index.html', 'news-message.html', 'news-feature.html', 'news-commentary.html'];
const TITLES = {
  'index.html': '《自然选择号》报社简介｜自然选择号',
  'news-message.html': '我校启动校本课程志愿填报｜自然选择号',
  'news-feature.html': '从数学题到AI时代的学习｜自然选择号',
  'news-commentary.html': '设备升级了，使用门槛也该降下来｜自然选择号',
};
const PARAS = { 'index.html': 0, 'news-message.html': 4, 'news-feature.html': 23, 'news-commentary.html': 29 };
const SKIP_MUTANT = !!process.env.QODER_RESULTS_DIR && process.env.QODER_RESULTS_DIR.indexOf('mutants') >= 0;
const FACTS = JSON.parse(fs.readFileSync(path.join(ROOT, '_qa_task10', 'dom_facts.json'), 'utf8'));

const rows = [];
const warm = new Set();          // 本次运行内已被导航到的目标文件（= :visited 会变热的链接）
let fails = 0;
function A(id, pass, o = {}) {
  lastProgress = Date.now();
  if (pass === 'rec') { rows.push({ id, status: 'REC', page: o.page || '-', width: o.width || '-', step: o.step || '', detail: o.detail || '', handoff: '' }); return; }
  const ok = pass === true;
  rows.push({ id, status: ok ? 'PASS' : 'FAIL', page: o.page || '-', width: o.width || '-', step: o.step || '', detail: o.detail || '', handoff: ok ? '' : (o.handoff || '') });
  if (!ok) { fails++; process.stdout.write(`FAIL ${id} [${o.page || '-'} @${o.width || '-'}] ${o.step || ''} :: ${o.detail || ''} -> ${o.handoff || ''}\n`); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const furl = (p) => 'file:///' + encodeURI(p.split(path.sep).join('/')).replace(/#/g, '%23');
const base = (p) => String(p || '').split('/').pop();
const near = (a, b, t = 1) => typeof a === 'number' && Math.abs(a - b) <= t;
const px = (s) => (s == null ? NaN : parseFloat(String(s)));
const sha = (f) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function hashAll() {
  const out = [];
  for (const f of fs.readdirSync(RESULTS).sort()) out.push(`${sha(path.join(RESULTS, f))}  ${f}  ${fs.statSync(path.join(RESULTS, f)).size}`);
  for (const f of fs.readdirSync(MATERIALS).sort()) out.push(`${sha(path.join(MATERIALS, f))}  Materials/${f}  ${fs.statSync(path.join(MATERIALS, f)).size}`);
  return { list: out.join('\n'), entries: fs.readdirSync(RESULTS).sort().join(',') };
}

const proc = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
  '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-dev-shm-usage', '--hide-scrollbars',
  '--allow-file-access-from-files', '--window-size=1400,1000', 'about:blank',
], { stdio: 'ignore' });

let ws, mid = 0;
const pending = new Map();
const listeners = [];
const noise = [];
let tag = '';
function send(method, params = {}) {
  const id = ++mid;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('CDP 命令 30s 未返回：' + method + '（常见于外部资源请求把加载挂住）')); } }, 30000);
    pending.set(id, {
      resolve: (v) => { clearTimeout(timer); resolve(v); },
      reject: (e) => { clearTimeout(timer); reject(e); },
    });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
let lastProgress = Date.now();
const watchdog = setInterval(() => {
  if (Date.now() - lastProgress > 75000) {
    A('驱动看门狗', false, { step: '75s 无新断言产出（浏览器被外部依赖或挂起请求阻塞）', detail: '该现象本身就是"存在外部请求"的运行时证据；移交 Task 2', handoff: 'Task 2' });
    try {
      const bad = rows.filter((r) => r.status === 'FAIL');
      fs.writeFileSync(path.join(HERE, 'regression_lines' + TAG + '.txt'), rows.map((r) => `[${r.id}] [${r.status}] ${r.page} — ${r.width} — ${r.step}${r.detail ? ' — ' + r.detail : ''}`).join('\n') + `\n\n合计 ${rows.length} 条：PASS ${rows.length - bad.length} / FAIL ${bad.length}（看门狗中止）\n`, 'utf8');
    } catch {}
    try { proc.kill(); } catch {}
    process.exit(3);
  }
}, 5000);
watchdog.unref();
async function waitReady() {
  for (let i = 0; i < 200; i++) {
    try { const l = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (l.ok) return l.json(); } catch {}
    await sleep(250);
  }
  throw new Error('chrome did not start');
}
function on(fn) { listeners.push(fn); }
async function ev(expr, label) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) { A('探针表达式', false, { step: label || expr.slice(0, 60), detail: (r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text, handoff: 'Task 11 驱动自身' }); return undefined; }
  return r.result ? r.result.value : undefined;
}
async function js(expr, label) { const v = await ev(expr, label); return typeof v === 'string' ? JSON.parse(v) : v; }

/* ---------- 统一测量探针 ---------- */
const MEASURE = `(() => {
  const de = document.documentElement, body = document.body;
  const q = (s) => document.querySelector(s), qa = (s) => [].slice.call(document.querySelectorAll(s));
  const R = (e) => { const r = e.getBoundingClientRect(); return {x:r.x, y:r.y, w:r.width, h:r.height, top:r.top, bottom:r.bottom, left:r.left, right:r.right}; };
  const C = (e) => getComputedStyle(e);
  const linesOf = (e) => { const r = document.createRange(); r.selectNodeContents(e); return [].slice.call(r.getClientRects()).filter((x) => x.width > 0.5).length; };
  const clipAnc = (e) => { const bad = []; let p = e.parentElement; while (p) { const s = C(p); if (s.overflow !== 'visible' || s.overflowX !== 'visible' || s.overflowY !== 'visible') bad.push(String(p.className) || p.tagName); p = p.parentElement; } return bad; };
  const main = q('.main-content'), hi = q('.site-header__inner'), mastLink = q('.site-masthead__link'), mast = q('.site-masthead');
  const nav = q('#site-navigation'), tog = q('#nav-toggle'), navList = q('.site-navigation__list');
  const abody = q('.article__body'), date = q('.article__date');
  const paras = qa('.article__body > p'), links = qa('.site-navigation__link');
  return JSON.stringify({
    url: location.href, title: document.title, file: location.pathname.split('/').pop(),
    innerWidth: innerWidth, clientWidth: de.clientWidth, scrollW: de.scrollWidth, bodyScrollW: body ? body.scrollWidth : null,
    docH: de.scrollHeight, dpr: devicePixelRatio,
    htmlClass: de.className, htmlClasses: [].slice.call(de.classList), rootFont: C(de).fontSize, hasFocus: document.hasFocus(),
    scrollX: scrollX, scrollY: scrollY, mqM: matchMedia('(max-width: 768px)').matches, mqD: matchMedia('(min-width: 769px)').matches,
    bodyBg: C(body).backgroundColor, bodyColor: C(body).color, bodyFF: C(body).fontFamily,
    sheets: [].slice.call(document.styleSheets).map((s) => ({ href: s.href, rules: (function () { try { return s.cssRules.length; } catch (e) { return 'ERR:' + e.name; } })(), disabled: s.disabled })),
    resources: performance.getEntriesByType('resource').map((r) => r.name),
    scrollAreas: qa('*').filter((e) => { const s = C(e); return /auto|scroll/.test(s.overflowX) || /auto|scroll/.test(s.overflowY); }).map((e) => (String(e.className) || e.tagName) + ':' + C(e).overflowX + '/' + C(e).overflowY),
    fixedWide: qa('*').filter((e) => { const s = C(e); return /px$/.test(s.width) && parseFloat(s.width) > de.clientWidth; }).map((e) => (String(e.className) || e.tagName) + '=' + s2(e)),
    headerInner: hi ? { w: R(hi).w, left: R(hi).left, right: R(hi).right, rightGap: de.clientWidth - R(hi).right, disp: C(hi).display, fdir: C(hi).flexDirection, h: R(hi).h } : null,
    header: (() => { const e = q('.site-header'); return e ? { h: Math.round(R(e).h), top: Math.round(R(e).top), bottom: Math.round(R(e).bottom) } : null; })(),
    main: main ? { w: R(main).w, left: R(main).left, right: R(main).right, rightGap: de.clientWidth - R(main).right, top: Math.round(R(main).top), pt: C(main).paddingTop, maxw: C(main).maxWidth } : null,
    mainFocus: main ? { outline: C(main).outlineWidth + ' ' + C(main).outlineStyle + ' ' + C(main).outlineColor, tab: main.getAttribute('tabindex') } : null,
    mast: mastLink ? { fs: C(mastLink).fontSize, color: C(mastLink).color, w: R(mastLink).w, px: Math.round(R(mastLink).w * devicePixelRatio), sw: mastLink.scrollWidth, cw: mastLink.clientWidth, sh: mastLink.scrollHeight, ch: mastLink.clientHeight, text: mastLink.textContent, lines: linesOf(mastLink), clip: clipAnc(mastLink), deco: C(mastLink).textDecorationLine } : null,
    mastBox: mast ? { top: Math.round(R(mast).top), bottom: Math.round(R(mast).bottom), bt: C(mast).borderTopWidth + ' ' + C(mast).borderTopStyle + ' ' + C(mast).borderTopColor, bb: C(mast).borderBottomWidth + ' ' + C(mast).borderBottomStyle + ' ' + C(mast).borderBottomColor, w: Math.round(R(mast).w), align: C(mast).textAlign } : null,
    nav: nav ? { disp: C(nav).display, open: nav.classList.contains('is-open'), rect: R(nav), clip: clipAnc(nav) } : null,
    navList: navList ? { disp: C(navList).display, dir: C(navList).flexDirection, gap: C(navList).gap } : null,
    tog: tog ? { disp: C(tog).display, rect: R(tog), aria: tog.getAttribute('aria-expanded'), text: tog.textContent, clip: clipAnc(tog), ctrls: tog.getAttribute('aria-controls'), type: tog.getAttribute('type') } : null,
    links: links.map((a) => { const r = a.getBoundingClientRect(); return {
      text: a.textContent, href: a.getAttribute('href'), cur: a.getAttribute('aria-current'),
      w: r.width, h: r.height, top: r.top, left: r.left, right: r.right, bottom: r.bottom,
      disp: C(a).display, color: C(a).color, fw: C(a).fontWeight, bb: C(a).borderBottomWidth + ' ' + C(a).borderBottomStyle + ' ' + C(a).borderBottomColor,
      transform: C(a).transform, shown: a.offsetParent !== null && a.getClientRects().length > 0, nrects: a.getClientRects().length,
      attrs: [].slice.call(a.attributes).map((t) => t.name), clip: clipAnc(a),
    }; }),
    secs: qa('.home-section').map((s) => ({ w: R(s).w, left: R(s).left, top: R(s).top, bottom: R(s).bottom, bt: C(s).borderTopWidth + ' ' + C(s).borderTopStyle, radius: C(s).borderTopLeftRadius, shadow: C(s).boxShadow, pos: C(s).position })),
    pageTitle: (() => { const e = q('.page-title'); if (!e) return null; return { text: e.textContent, fs: C(e).fontSize, lines: linesOf(e), w: R(e).w, sw: e.scrollWidth, cw: e.clientWidth, align: C(e).textAlign }; })(),
    artType: (() => { const e = q('.article__type'); return e ? { text: e.textContent, top: R(e).top, color: C(e).color, fs: C(e).fontSize } : null; })(),
    artTitle: (() => { const e = q('.article__header h1') || q('.article h1'); return e ? { text: e.textContent, top: R(e).top, w: R(e).w, fs: C(e).fontSize, lines: linesOf(e), sw: e.scrollWidth, cw: e.clientWidth } : null; })(),
    byline: (() => { const e = q('.article__byline'); return e ? { text: e.textContent, top: R(e).top, color: C(e).color } : null; })(),
    abody: abody ? { w: R(abody).w, maxw: C(abody).maxWidth, align: C(abody).textAlign, justify: C(abody).textJustify, wb: C(abody).wordBreak, hy: C(abody).hyphens, ow: C(abody).overflowWrap, fs: C(abody).fontSize, lh: C(abody).lineHeight, cols: C(abody).columnCount, radius: C(abody).borderTopLeftRadius, shadow: C(abody).boxShadow } : null,
    paras: paras.map((p) => p.textContent),
    pIndent: paras.length ? C(paras[0]).textIndent : null, pTop: paras.length ? R(paras[0]).top : null,
    date: date ? { text: date.textContent, align: C(date).textAlign, indent: C(date).textIndent, w: R(date).w, rightGap: de.clientWidth - R(date).right, top: R(date).top, lines: linesOf(date), sw: date.scrollWidth, cw: date.clientWidth } : null,
    dateline: (() => { const e = q('.dateline'); if (!e) return { present: false }; const r = e.getBoundingClientRect(); const pp = e.closest('p'); return { present: true, text: e.textContent.slice(0, 24), disp: C(e).display, fw: C(e).fontWeight, top: r.top, pTop: pp ? pp.getBoundingClientRect().top : null, isFirstP: !!pp && pp === q('.article__body > p') }; })(),
    skip: (() => { const e = q('.skip-link'); if (!e) return null; const r = e.getBoundingClientRect(); return { text: e.textContent, top: r.top, left: r.left, w: r.width, h: r.height, bg: C(e).backgroundColor, color: C(e).color }; })(),
    active: (() => { const a = document.activeElement; if (!a) return 'null'; return a.id || (a.className && String(a.className).trim().split(/\\s+/)[0]) || a.tagName; })(),
    activeTag: document.activeElement ? document.activeElement.tagName : 'null',
    mainText: main ? main.textContent : null,
    navFlagged: (() => { const bad = []; if (!nav) return bad; nav.querySelectorAll('*').forEach((e) => { for (const at of e.attributes) if (['tabindex', 'hidden', 'aria-hidden', 'inert'].indexOf(at.name) >= 0) bad.push((String(e.className) || e.tagName) + '@' + at.name); }); return bad; })(),
  });
  function s2(e) { return getComputedStyle(e).width; }
})()`;

async function measure() { return js(MEASURE, 'MEASURE'); }

/* ---------- 浏览器控制 ---------- */
function onceLoad(ms = 12000) {
  return new Promise((res) => {
    const h = (m) => { if (m.method === 'Page.loadEventFired') { const i = listeners.indexOf(h); if (i >= 0) listeners.splice(i, 1); res(true); } };
    on(h);
    setTimeout(() => { const i = listeners.indexOf(h); if (i >= 0) listeners.splice(i, 1); res(false); }, ms);
  });
}
let navCount = 0;
async function openPage(u) { const w = onceLoad(); await send('Page.navigate', { url: u }); const ok = await w; await sleep(300); return ok; }
async function openFile(f) { warm.add(f); return openPage(furl(path.join(RESULTS, f))); }
async function metrics(w, h = 900, zoom = 1, mobile = false) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile, zoom });
  await sleep(170);
}
async function clickEl(sel, cx, cy) {
  let o;
  if (cx === undefined) {
    o = await js(`(() => { const e = document.querySelector('${sel}'); if (!e) return JSON.stringify({miss:1}); const r = e.getBoundingClientRect(); return JSON.stringify({x:r.x, y:r.y, w:r.width, h:r.height}); })()`);
    if (o.miss) { A(`元素存在：${sel}`, false, { step: 'clickEl', handoff: 'Task 2' }); return false; }
  } else o = { x: cx, y: cy, w: 1, h: 1 };
  if (o.w <= 0 || o.h <= 0) { A(`可见可点区域：${sel}`, false, { detail: JSON.stringify(o), handoff: 'Task 8' }); return false; }
  const x = cx === undefined ? o.x + o.w / 2 : cx, y = cy === undefined ? o.y + o.h / 2 : cy;
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(150);
  return true;
}
async function kd(o) { await send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, o)); }
async function ku(o) { await send('Input.dispatchKeyEvent', { type: 'keyUp', key: o.key, code: o.code, windowsVirtualKeyCode: o.windowsVirtualKeyCode, nativeVirtualKeyCode: o.nativeVirtualKeyCode }); }
const ENTER = { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r' };
const SPACE = { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 };
const ESCK = { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 };
const TABK = { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 };
async function press(o) { await kd(o); await sleep(80); await ku(o); await sleep(150); }
const enter = () => press(ENTER);
const space = () => press(SPACE);
const esc = () => press(ESCK);
const tab = () => press(TABK);
const focusInfo = () => js('(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); const s = getComputedStyle(a); const bad = []; let p = a.parentElement; while (p) { const t = getComputedStyle(p); if (t.overflow !== "visible" || t.overflowX !== "visible" || t.overflowY !== "visible") bad.push(String(p.className) || p.tagName); p = p.parentElement; } return JSON.stringify({ who: a.id || (a.className ? String(a.className).trim().split(/\\s+/)[0] : a.tagName), tag: a.tagName, w: r.width, h: r.height, top: r.top, left: r.left, oW: s.outlineWidth, oS: s.outlineStyle, oC: s.outlineColor, oOff: s.outlineOffset, bg: s.backgroundColor, color: s.color, clip: bad }); })()');
async function nodeIdOf(sel) {
  const { root } = await send('DOM.getDocument', { depth: -1 });
  const r = await send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
  return r.nodeId;
}
async function force(sel, states) { const id = await nodeIdOf(sel); if (id) await send('CSS.forcePseudoState', { nodeId: id, forcedPseudoClasses: states }); return id; }
async function axForLinks() {
  const { root } = await send('DOM.getDocument', { depth: -1 });
  const { nodeIds } = await send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '.site-navigation__link' });
  const out = [];
  for (const id of nodeIds || []) {
    const r = await send('Accessibility.getPartialAXTree', { nodeId: id, fetchRelatives: false });
    const n = (r.nodes || []).find((x) => x.role || x.name);
    out.push({ role: n && n.role ? n.role.value : null, name: n && n.name ? n.name.value : null });
  }
  return out;
}
async function shot(name, full) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const r = await send('Page.captureScreenshot', full ? { format: 'png', captureBeyondViewport: true } : { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(r.data, 'base64'));
}
const noiseSince = (n) => noise.slice(n);
function markNoise(kind, text) { noise.push(`${kind}::${tag}::${text}`); }

const CSS_BLOB = '(() => { try { const acc = []; const walk = (rs) => { for (const r of rs) { if (r.cssText) acc.push(r.cssText); if (r.cssRules) walk(r.cssRules); } }; for (const s of document.styleSheets) { try { walk(s.cssRules); } catch (e) { acc.push("READERR:" + e.name); } } return JSON.stringify({ ok: true, blob: acc.join("\\n"), n: acc.length }); } catch (e) { return JSON.stringify({ ok: false, blob: String(e), n: 0 }); } })()';

/* ---------- 冷历史：导航链接基础色必须在组件覆盖下生效 ---------- */
let coldColors = null;
async function coldPass() {
  await openFile('index.html');
  await metrics(1280, 900);
  const m = await measure();
  coldColors = m.links.map((l) => ({ text: l.text, href: l.href, color: l.color, bb: l.bb, fw: l.fw }));
  const notVisited = m.links.filter((l) => !warm.has(l.href));
  A('RB5', notVisited.length > 0 && notVisited.every((l) => l.color === INK), { page: 'index.html', width: '1280px/冷历史', step: '未访问过的导航链接为墨色（组件覆盖 a 基础色）', detail: JSON.stringify(notVisited.map((l) => [l.text, l.color])), handoff: 'Task 3' });
  A('RB5', m.links.filter((l) => l.cur === 'page').length === 1 && m.links.filter((l) => l.cur === 'page')[0].bb === '2px solid ' + ACCENT, { page: 'index.html', width: '1280px/冷历史', step: '当前页带 2px 暗红实下边线', detail: JSON.stringify(m.links.map((l) => [l.text, l.cur, l.bb])), handoff: 'Task 3' });
  A('RB6', m.mast.color === INK, { page: 'index.html', width: '1280px/冷历史', step: '报头链接冷历史下为墨色（深色文字基线）', detail: m.mast.color, handoff: 'Task 3' });
  return m;
}

/* ---------- 热历史：同一页同一链接，访问过后颜色是否仍守住合同 ---------- */
async function visitedPass() {
  for (const f of ['news-message.html', 'news-feature.html', 'news-commentary.html']) { await metrics(1280, 900); await openFile(f); }
  await openFile('index.html'); await metrics(1280, 900);
  const m = await measure();
  const now = m.links.map((l) => ({ text: l.text, href: l.href, color: l.color, bb: l.bb, fw: l.fw, cur: l.cur }));
  const flipped = [];
  for (let i = 0; i < now.length; i++) {
    const c0 = coldColors[i];
    if (now[i].color !== c0.color) flipped.push(`${c0.text}: ${c0.color} → ${now[i].color}（其目标页 ${c0.href} 已被访问）`);
  }
  A('RB5-V', flipped.length === 0, { page: 'index.html', width: '1280px/热历史', step: '访问过目标页后，普通导航链接仍为深色（Task 3 完成定义：普通链接为深色，当前链接为暗红）', detail: `翻转 ${flipped.length} 条 :: ${flipped.join(' ; ')} || 现在色值=${JSON.stringify(now.map((l) => [l.text, l.color, l.cur ? 'current' : '']))}`, handoff: 'Task 3' });
  const cur = now.filter((l) => l.cur === 'page');
    const isTransparent = (bb) => /transparent|rgba\(0, 0, 0, 0\)/.test(bb);
  const others = now.filter((l) => l.cur !== 'page');
  A('RB5-V2', cur.length === 1 && cur[0].bb.indexOf('solid ' + ACCENT) > 0 && others.every((l) => isTransparent(l.bb)), { page: 'index.html', width: '1280px/热历史', step: '退化后的残余区分能力：当前页仍有暗红实下边线，其余为透明线', detail: `current=${JSON.stringify(cur.map((l) => l.bb))} others=${JSON.stringify(others.map((l) => l.bb))}`, handoff: 'Task 3' });
  A('RB6-V', m.mast.color === INK, { page: 'index.html', width: '1280px/热历史', step: '报头"自然选择号"访问后仍为深色文字', detail: `实测=${m.mast.color}（冷历史=${coldColors ? '' : ''}${JSON.stringify(coldColors && coldColors[0])}）`, handoff: 'Task 3' });
  await shot('index-1280-warm-history');
}

/* ---------- 桌面视觉 ---------- */
async function desktopChecks(file, w) {
  await openFile(file);
  await metrics(w, 900);
  const m = await measure();
  A('RB1', m.headerInner.w <= 1120.5 && near(m.headerInner.left, m.headerInner.rightGap, 1.2), { page: file, width: w + 'px', step: '量公共版心 .site-header__inner ≤1120 且左右留白对称', detail: `版心=${m.headerInner.w}px 留白 L${m.headerInner.left}/R${m.headerInner.rightGap.toFixed(1)}`, handoff: 'Task 3' });
  A('RB1', m.main.w <= 1120.5 && near(m.main.left, m.main.rightGap, 1.2) && near(m.main.w, m.headerInner.w, 0.6), { page: file, width: w + 'px', step: '正文容器 .main-content 与报头同宽同边距', detail: `main=${m.main.w}px L${m.main.left}/R${m.main.rightGap.toFixed(1)}`, handoff: 'Task 3' });
  if (w === 1024) {
    await metrics(1024, 900, 1, true);
    const mm = await measure();
    A('RB1b', near(mm.headerInner.w, 960, 2), { page: file, width: '1024px(无滚动条占位)', step: '1024 版心≈960（100% − 2×2rem）', detail: `版心=${mm.headerInner.w}px inner=${mm.innerWidth} client=${mm.clientWidth}（桌面测量含滚动条占位 ${m.innerWidth - m.clientWidth}px）`, handoff: 'Task 3' });
    await metrics(1024, 900);
  }
  const wide = m.abody ? m.abody.w : (m.secs.length ? Math.max.apply(null, m.secs.map((s) => s.w)) : m.main.w);
  A('RB2', wide <= 736.5, { page: file, width: w + 'px', step: '正文／首页文字区宽度 ≤736', detail: `文字块=${wide}px`, handoff: 'Task 3' });
  if (m.abody) A('RB2', px(m.abody.maxw) <= 736.5, { page: file, width: w + 'px', step: '.article__body max-width ≤736', detail: `max-width=${m.abody.maxw}`, handoff: 'Task 3' });
  A('RB3', m.mast.sw <= m.mast.cw + 0.5 && m.mast.w > 0 && m.mast.lines === 1 && m.mast.text === '自然选择号', { page: file, width: w + 'px', step: '报头单行完整显示、不被裁切', detail: `scrollW=${m.mast.sw} clientW=${m.mast.cw} 行=${m.mast.lines} 文本=${m.mast.text}`, handoff: 'Task 3' });
  A('RB3', /double/.test(m.mastBox.bt) && /double/.test(m.mastBox.bb), { page: file, width: w + 'px', step: '报头上下双细线', detail: `上=${m.mastBox.bt} 下=${m.mastBox.bb} 宽=${m.mastBox.w}`, handoff: 'Task 3' });
  const mTop = await js('(() => { const l = document.querySelector(".site-masthead__link"), b = document.querySelector(".site-masthead"); const a = l.getBoundingClientRect(), c = b.getBoundingClientRect(); const t = parseFloat(getComputedStyle(b).borderTopWidth); return JSON.stringify({ above: Math.round((a.top - c.top - t) * 10) / 10, below: Math.round((c.bottom - t - a.bottom) * 10) / 10 }); })()');
  A('RB3', mTop.above >= 0 && mTop.below >= 0, { page: file, width: w + 'px', step: '双细线不被报头文字穿越（文字盒完全位于两条线之间）', detail: `文字距上线 ${mTop.above}px、距下线 ${mTop.below}px`, handoff: 'Task 3' });
  const tops = m.links.map((l) => Math.round(l.top));
  A('RB3', m.links.length === 5 && tops.every((t) => Math.abs(t - tops[0]) <= 1), { page: file, width: w + 'px', step: '五项导航同一行', detail: `tops=${JSON.stringify(tops)}`, handoff: 'Task 3' });
  let overlap = false;
  for (let i = 1; i < m.links.length; i++) if (m.links[i].left < m.links[i - 1].right - 0.5) overlap = true;
  const order = m.links.map((l) => l.text).join('|');
  A('RB3', !overlap && order === '首页|新闻消息|新闻通讯|新闻评论', { page: file, width: w + 'px', step: '导航顺序正确、无重叠', detail: `${order}${overlap ? ' — 存在重叠' : ''}`, handoff: 'Task 3' });
  A('RB4', m.tog.disp === 'none', { page: file, width: w + 'px', step: '桌面隐藏汉堡按钮', detail: `display=${m.tog.disp}`, handoff: 'Task 3/8' });
  A('RB4', m.nav.disp !== 'none' && m.links.every((l) => l.shown) && m.navList.dir === 'row', { page: file, width: w + 'px', step: '主导航横向常显', detail: `nav=${m.nav.disp} dir=${m.navList.dir} shown=${m.links.map((l) => l.shown).join(',')}`, handoff: 'Task 3' });
  const cur = m.links.filter((l) => l.cur === 'page');
  A('RB5', cur.length === 1 && cur[0].color === ACCENT && cur[0].fw === '700' && cur[0].bb === '2px solid ' + ACCENT, { page: file, width: w + 'px', step: '当前页=暗红+700+2px 暗红实下边线', detail: cur.length ? `color=${cur[0].color} fw=${cur[0].fw} bb=${cur[0].bb}` : '无 aria-current', handoff: 'Task 3' });
  const normUnvisited = m.links.filter((l) => l.cur !== 'page' && !warm.has(l.href));
  if (normUnvisited.length) A('RB5', normUnvisited.every((l) => l.color === INK), { page: file, width: w + 'px', step: '未访问普通链接为深色', detail: JSON.stringify(normUnvisited.map((l) => [l.text, l.color])), handoff: 'Task 3' });
  A('RB5', m.links.every((l) => l.transform === 'none'), { page: file, width: w + 'px', step: '链接默认无 transform（不缩放不位移）', detail: m.links.map((l) => l.transform).join(','), handoff: 'Task 3' });
  const hi = m.links.findIndex((l) => l.cur !== 'page');
  const before = m.links.map((l) => ({ t: l.top, l: l.left, w: l.w, h: l.h }));
  await force(`.site-navigation__list li:nth-child(${hi + 1}) .site-navigation__link`, ['hover']);
  const hm = await measure();
  const moved = hm.links.some((l, i) => !near(l.top, before[i].t, 0.5) || !near(l.left, before[i].l, 0.5) || !near(l.w, before[i].w, 0.5) || !near(l.h, before[i].h, 0.5));
  A('RB5', !moved && hm.links[hi].color === ACCENT, { page: file, width: w + 'px', step: `强制 hover 第 ${hi + 1} 项：仅变暗红，不位移不缩放`, detail: moved ? '几何发生变化' : `色 ${before[hi] ? '' : ''}${m.links[hi].color} → ${hm.links[hi].color}`, handoff: 'Task 3' });
  await force(`.site-navigation__list li:nth-child(${hi + 1}) .site-navigation__link`, []);
  A('RB6', m.bodyBg === PAPER && m.bodyColor === INK, { page: file, width: w + 'px', step: '暖白纸色底 + 深色文字（Task 3 变量）', detail: `bg=${m.bodyBg} color=${m.bodyColor}`, handoff: 'Task 3' });
  A('RB6', /SimSun|Songti SC|STSong/.test(m.bodyFF) && /serif/.test(m.bodyFF), { page: file, width: w + 'px', step: '宋体字体栈且保留 serif 回退', detail: m.bodyFF, handoff: 'Task 3' });
  const css = await js(CSS_BLOB);
  A('RB6', css.ok && css.blob.indexOf('READERR') < 0, { page: file, width: w + 'px', step: '样式表可解析（' + css.n + ' 条规则）', detail: css.ok ? '' : css.blob.slice(0, 120), handoff: 'Task 3/8' });
  const badVis = ['gradient', 'box-shadow:', 'text-shadow', 'border-radius', 'column-count', 'columns:', 'filter:', 'transform: scale', 'transition'].filter((k) => css.blob.includes(k));
  A('RB6', badVis.length === 0, { page: file, width: w + 'px', step: '无渐变/阴影/圆角/分栏/滤镜/缩放过渡等被禁视觉', detail: badVis.join(','), handoff: 'Task 3' });
  A('RB6', m.abody ? m.abody.align === 'justify' : true, { page: file, width: w + 'px', step: '桌面正文两端对齐', detail: m.abody ? m.abody.align : 'n/a', handoff: 'Task 3' });
  A('RB7', m.scrollW <= m.innerWidth, { page: file, width: w + 'px', step: `横向溢出严格判定 scrollWidth<=innerWidth（${m.scrollW}<=${m.innerWidth}）`, detail: `scrollW=${m.scrollW} inner=${m.innerWidth} client=${m.clientWidth} scrollX=${m.scrollX}`, handoff: 'Task 3' });
  A('RB7', m.scrollW <= m.clientWidth, { page: file, width: w + 'px', step: '更严格：scrollWidth<=clientWidth', detail: `${m.scrollW}<=${m.clientWidth}`, handoff: 'Task 3' });
  return m;
}

/* ---------- 移动视觉 ---------- */
async function mobileChecks(file, w) {
  await openFile(file);
  await metrics(w, 900);
  const m = await measure();
  A('RC1', near(m.headerInner.left, 16, 0.6) && near(m.headerInner.rightGap, 16, 0.6), { page: file, width: w + 'px', step: '左右留白各约 16px（--page-gutter:1rem）', detail: `L${m.headerInner.left} R${m.headerInner.rightGap.toFixed(1)}`, handoff: 'Task 8' });
  A('RC1', near(m.headerInner.w, m.clientWidth - 32, 1.2) && near(m.main.w, m.clientWidth - 32, 1.2), { page: file, width: w + 'px', step: '版心随可用宽度收缩（=视口−2×16px），无固定内容宽度', detail: `报头版心=${m.headerInner.w} main=${m.main.w} client=${m.clientWidth}`, handoff: 'Task 8' });
  A('RC1', m.scrollAreas.length === 0 && m.fixedWide.length === 0, { page: file, width: w + 'px', step: '无内部滚动区、无超出视口的固定像素宽元素、无裁切', detail: `内部滚动元素=${JSON.stringify(m.scrollAreas)} 过宽元素=${JSON.stringify(m.fixedWide)}`, handoff: 'Task 8' });
  A('RC1', m.headerInner.disp === 'flex' && m.headerInner.fdir === 'column', { page: file, width: w + 'px', step: '报头内部改为纵向流', detail: `${m.headerInner.disp}/${m.headerInner.fdir}`, handoff: 'Task 8' });
  A('RC2', px(m.mast.fs) < 64 && px(m.mast.fs) >= 40 && near(px(m.mast.fs), Math.min(56, Math.max(40, w * 0.11)), 0.6), { page: file, width: w + 'px', step: '报头按 clamp(2.5rem,11vw,3.5rem) 流式缩小（1280 基线 64px）', detail: `实测=${m.mast.fs}`, handoff: 'Task 8' });
  const refFs = m.abody ? px(m.abody.fs) : px(m.rootFont);
  A('RC2', px(m.pageTitle.fs) < 40 && px(m.pageTitle.fs) > refFs, { page: file, width: w + 'px', step: '页面标题流式缩小但仍比正文醒目', detail: `title=${m.pageTitle.fs} 参照正文=${refFs}px（1280 基线 40px）`, handoff: 'Task 8' });
  A('RC2', m.mast.sw <= m.mast.cw + 0.5 && m.pageTitle.sw <= m.pageTitle.cw + 0.5, { page: file, width: w + 'px', step: '报头与页面标题不溢出', detail: `mast ${m.mast.sw}/${m.mast.cw} · title ${m.pageTitle.sw}/${m.pageTitle.cw}`, handoff: 'Task 8' });
  if (file === 'news-commentary.html') {
    A('RC2', m.artTitle.lines >= (w <= 400 ? 2 : 1) && m.artTitle.sw <= m.artTitle.cw + 0.5 && m.artTitle.w <= m.clientWidth, { page: file, width: w + 'px', step: '长评论标题在窄宽度自然折成多行、任一移动宽度都不溢出（768px 下单行即为正确结果）', detail: `行数=${m.artTitle.lines} ${m.artTitle.sw}<=${m.artTitle.cw} 盒宽=${m.artTitle.w} client=${m.clientWidth}`, handoff: 'Task 8' });
    const ll = await js('(() => { const e = document.querySelector(".article__header h1"); const r = document.createRange(); r.selectNodeContents(e); const rs = [].slice.call(r.getClientRects()).filter((x) => x.width > 0); const last = rs[rs.length - 1]; return JSON.stringify({ w: last ? Math.round(last.width) : -1, size: parseFloat(getComputedStyle(e).fontSize), n: rs.length }); })()');
    A('RC2', ll.w > 0 && ll.w / ll.size >= 2, { page: file, width: w + 'px', step: '末行不残留单字孤悬', detail: `末行宽=${ll.w}px ≈ ${(ll.w / ll.size).toFixed(1)} 字（字号 ${ll.size}px，共 ${ll.n} 行片段）`, handoff: 'Task 8' });
  }
  if (file === 'index.html') {
    const s = m.secs;
    A('RC3', s.length === 3 && s.every((x, i) => near(x.left, s[0].left, 0.6) && near(x.w, s[0].w, 0.6) && (i === 0 || s[i - 1].bottom <= x.top + 0.6)), { page: file, width: w + 'px', step: '首页三区块保持单列、顺序不变', detail: JSON.stringify(s.map((x) => [Math.round(x.left), Math.round(x.w), Math.round(x.top), Math.round(x.bottom)])), handoff: 'Task 8' });
    A('RC3', s.every((x) => x.radius === '0px' && x.shadow === 'none' && x.pos === 'static' && /solid/.test(x.bt)), { page: file, width: w + 'px', step: '未变成卡片/轮播/折叠面板，分隔线仍在', detail: JSON.stringify(s.map((x) => [x.radius, x.shadow, x.pos, x.bt])), handoff: 'Task 8' });
  }
  if (m.abody) {
    A('RC4', m.paras.length === PARAS[file] && (m.abody.cols === '1' || m.abody.cols === 'auto') && m.abody.w <= m.clientWidth, { page: file, width: w + 'px', step: `文章保持单栏、段落数=${PARAS[file]}`, detail: `段=${m.paras.length} column-count=${m.abody.cols} 宽=${m.abody.w}`, handoff: 'Task 5/6/7' });
    A('RC4', near(px(m.pIndent), px(m.abody.fs) * 2, 0.6), { page: file, width: w + 'px', step: '正文段落首行缩进 2em', detail: `text-indent=${m.pIndent} 正文字号=${m.abody.fs}`, handoff: 'Task 3/8' });
    const lh = m.abody ? px(m.abody.lh) : 30;
    A('RC4', m.dateline.present ? (m.dateline.disp === 'inline' && m.dateline.isFirstP === true && m.dateline.fw === '700' && m.dateline.top >= m.pTop - 2 && m.dateline.top < m.pTop + lh) : !m.dateline.present, { page: file, width: w + 'px', step: '.dateline 仍内联于首段首行', detail: `${JSON.stringify(m.dateline)} 行高=${lh}（内联盒与行盒 top 允许相差 <1 行）`, handoff: 'Task 5/6/7' });
    if (m.date) A('RC4', m.date.align === 'right' && px(m.date.indent) === 0 && m.date.sw <= m.date.cw + 0.5, { page: file, width: w + 'px', step: '末尾日期右对齐、无首行缩进、极窄宽度下不溢出', detail: `align=${m.date.align} indent=${m.date.indent} ${m.date.sw}<=${m.date.cw} 折行=${m.date.lines}`, handoff: 'Task 7' });
  }
  const terms = ['AI', '.exe', 'Windows 10', 'UOS', 'USB', 'OPS', 'Linux', '4K'];
  const src = FACTS[file].mainHTML;
  const present = terms.filter((t) => src.indexOf(t) >= 0);
  const rendered = m.mainText || '';
  A('RC5', present.every((t) => rendered.indexOf(t) >= 0), { page: file, width: w + 'px', step: `基线命中的 ${present.length} 个中英文混排术语（${present.join(', ')}）在渲染文本中原样完整`, detail: present.filter((t) => rendered.indexOf(t) < 0).join(',') || '全部命中', handoff: 'Task 8' });
  const wrap = m.abody ? { wb: m.abody.wb, hy: m.abody.hy, ow: m.abody.ow } : await js('(() => { const e = document.querySelector(".home-section__text"); return JSON.stringify({ wb: getComputedStyle(e).wordBreak, hy: getComputedStyle(e).hyphens, ow: getComputedStyle(e).overflowWrap }); })()');
  A('RC5', wrap.wb === 'normal' && wrap.hy === 'none', { page: file, width: w + 'px', step: '安全换行只用 overflow-wrap，未用 break-all/hyphens 打断术语', detail: `word-break=${wrap.wb} hyphens=${wrap.hy} overflow-wrap=${wrap.ow}`, handoff: 'Task 8' });
  const soft = [].slice.call(rendered).filter((ch) => { const c = ch.codePointAt(0); return c === 0xAD || (c >= 0x200B && c <= 0x200D) || c === 0x2060 || c === 0xFEFF; });
  A('RC5', soft.length === 0 && src.indexOf('<wbr') < 0, { page: file, width: w + 'px', step: '未插入 <wbr>／软连字符／零宽字符，原文字符不变', detail: `不可见断行字符 ${soft.length} 个`, handoff: 'Task 8' });
  A('RC6', m.scrollW <= m.innerWidth, { page: file, width: w + 'px', step: `scrollWidth<=innerWidth 严格判定（不放宽 1px）`, detail: `${m.scrollW}<=${m.innerWidth}`, handoff: 'Task 8' });
  A('RC6', m.scrollW <= m.clientWidth && m.bodyScrollW <= m.clientWidth, { page: file, width: w + 'px', step: '更严格：documentElement/body scrollWidth<=clientWidth', detail: `de=${m.scrollW} body=${m.bodyScrollW} client=${m.clientWidth}`, handoff: 'Task 8' });
  if (m.abody) A('RC7', m.abody.align === 'start', { page: file, width: w + 'px', step: '移动端正文改为 text-align: start（窄行不留大空隙）', detail: `text-align=${m.abody.align}`, handoff: 'Task 8' });
  A('RE2', m.tog.disp !== 'none' && m.nav.disp === 'none' && m.nav.open === false && m.tog.aria === 'false', { page: file, width: w + 'px', step: '.js 关闭态：按钮可见、导航折叠、aria-expanded=false', detail: `tog=${m.tog.disp} nav=${m.nav.disp} open=${m.nav.open} aria=${m.tog.aria}`, handoff: 'Task 8/9' });
  A('RC1', m.mqM === true && m.mqD === false, { page: file, width: w + 'px', step: '命中移动断点且未命中桌面断点', detail: `mqM=${m.mqM} mqD=${m.mqD}`, handoff: 'Task 8' });
  return m;
}

/* ---------- R-D 点击区与焦点 ---------- */
async function tapFocus(file) {
  await openFile(file); await metrics(375, 900);
  await tab();
  const f0 = await focusInfo();
  A('RD4', f0.who === 'skip-link', { page: file, width: '375px', step: '跳转链接是第一个 Tab 停靠点', detail: `active=${f0.who}/${f0.tag}`, handoff: 'Task 3' });
  A('RD4', f0.top >= -0.5 && near(f0.left, 0, 0.6) && f0.h >= 24 && f0.h < 200 && f0.oS === 'solid' && f0.oC === ACCENT && f0.bg === PAPER && f0.color === INK, { page: file, width: '375px', step: '首次 Tab 后出现在左上角、文字与背景清晰、带轮廓', detail: `top=${f0.top} left=${f0.left} h=${f0.h} outline=${f0.oW} ${f0.oS} ${f0.oC} bg=${f0.bg} color=${f0.color}`, handoff: 'Task 3' });
  const before = await measure();
  const hdrTop = before.header.top;
  await enter();
  const after = await measure();
  A('RD4', after.active === 'main-content' && after.activeTag === 'MAIN', { page: file, width: '375px', step: '激活跳转链接后跳到 #main-content 且正文获得焦点', detail: `active=${after.active}/${after.activeTag}`, handoff: 'Task 3' });
  const hdrDoc = hdrTop + before.scrollY, hdrDocAfter = after.header.top + after.scrollY;
  A('RD4', after.scrollX === 0 && near(hdrDoc, hdrDocAfter, 1) && /solid/.test(after.mainFocus.outline), { page: file, width: '375px', step: '报头未被推动（文档坐标不变，只有到达目标的纵向滚动）、无横向滚动、正文焦点轮廓可感知', detail: `scrollX=${after.scrollX} header 文档坐标 ${hdrDoc}->${hdrDocAfter}（视口 ${hdrTop}->${after.header.top}，scrollY ${before.scrollY}->${after.scrollY}） outline=${after.mainFocus.outline}`, handoff: 'Task 3' });
  await shot(`${file.replace('.html', '')}-375-skip-focus`);

  await openFile(file); await metrics(375, 900);
  for (let i = 0; i < 6 && (await focusInfo()).who !== 'nav-toggle'; i++) await tab();
  const tf = await focusInfo();
  A('RD3', tf.who === 'nav-toggle' && tf.oS === 'solid' && px(tf.oW) >= 2 && tf.oC === ACCENT && tf.clip.length === 0, { page: file, width: '375px', step: '纯键盘到达菜单按钮，暗红实线轮廓清晰且不被裁切', detail: `active=${tf.who} outline=${tf.oW} ${tf.oS} ${tf.oC} offset=${tf.oOff} 裁切祖先=${JSON.stringify(tf.clip)}`, handoff: 'Task 3/8' });
  await clickEl('#nav-toggle');
  const m = await measure();
  A('RD1', m.tog.rect.w >= 44 && m.tog.rect.h >= 44, { page: file, width: '375px', step: '.nav-toggle 实际 getBoundingClientRect ≥44×44 CSS px', detail: `${m.tog.rect.w}×${m.tog.rect.h}`, handoff: 'Task 8' });
  A('RD2', m.links.length === 5 && m.links.every((l) => l.w >= 44 && l.h >= 44), { page: file, width: '375px', step: '每个可见 .site-navigation__link 实际点击区 ≥44×44', detail: JSON.stringify(m.links.map((l) => [Math.round(l.w), Math.round(l.h)])), handoff: 'Task 8' });
  A('RD2', m.links.every((l) => near(l.w, m.nav.rect.w, 1.5) && near(l.left, m.nav.rect.left, 1.5)), { page: file, width: '375px', step: '链接占满行宽便于触控', detail: `导航宽=${Math.round(m.nav.rect.w)} 链接宽=${m.links.map((l) => Math.round(l.w)).join(',')}`, handoff: 'Task 8' });
  const linkFocus = [];
  for (let i = 0; i < 4; i++) { await tab(); linkFocus.push(await focusInfo()); }
  A('RD3', linkFocus.every((f) => /site-navigation__link/.test(f.who) && f.oS === 'solid' && px(f.oW) >= 2 && f.oC === ACCENT && f.clip.length === 0), { page: file, width: '375px', step: '逐个链接键盘焦点轮廓清晰且不被边框/展开菜单/容器裁切', detail: JSON.stringify(linkFocus.map((f) => [f.who, f.oW + ' ' + f.oS + ' ' + f.oC, f.clip.join('+')])), handoff: 'Task 3/8' });
  A('RD3', linkFocus.every((f) => f.left >= 0 && f.top >= 0), { page: file, width: '375px', step: '焦点环不被视口边界切掉', detail: JSON.stringify(linkFocus.map((f) => [Math.round(f.left), Math.round(f.top)])), handoff: 'Task 3/8' });
  await shot(`${file.replace('.html', '')}-375-open`);
}

/* ---------- R-E 菜单三态 ---------- */
async function triState(file) {
  await send('Emulation.setScriptExecutionDisabled', { value: true });
  await openFile(file); await metrics(375, 900);
  let m = await measure();
  A('RE1', m.htmlClasses.indexOf('no-js') >= 0 && m.htmlClasses.indexOf('js') < 0, { page: file, width: '375px/禁用JS', step: '先禁用 JS 再硬刷新：html 仍为 no-js', detail: m.htmlClass, handoff: 'Task 2/9' });
  A('RE1', m.tog.disp === 'none', { page: file, width: '375px/禁用JS', step: '按钮不可见', detail: `display=${m.tog.disp}`, handoff: 'Task 8' });
  A('RE1', m.nav.disp === 'block' && m.links.length === 5 && m.links.every((l) => l.shown && l.h >= 44), { page: file, width: '375px/禁用JS', step: '五项导航纵向常显、可点击、可聚焦', detail: `nav=${m.nav.disp} ${JSON.stringify(m.links.map((l) => [Math.round(l.w), Math.round(l.h), l.shown]))}`, handoff: 'Task 8' });
  A('RE1', m.navList.dir === 'column', { page: file, width: '375px/禁用JS', step: '无脚本时导航为纵向列表', detail: m.navList.dir, handoff: 'Task 8' });
  const cur = m.links.filter((l) => l.cur === 'page');
  A('RE1', cur.length === 1 && /solid/.test(cur[0].bb) && (cur[0].color === ACCENT || cur[0].color === INK), { page: file, width: '375px/禁用JS', step: '当前页仍以颜色与线条区分', detail: `color=${cur[0].color} bb=${cur[0].bb}`, handoff: 'Task 3' });
  const nojsTab = [];
  for (let i = 0; i < 3; i++) { await tab(); nojsTab.push(await focusInfo()); }
  A('RE1', nojsTab.every((f) => f.who !== 'nav-toggle'), { page: file, width: '375px/禁用JS', step: '隐藏按钮不进入 Tab 顺序', detail: nojsTab.map((f) => f.who).join('>'), handoff: 'Task 8' });
  A('RE1', nojsTab.some((f) => /site-navigation__link/.test(f.who)) && nojsTab.some((f) => f.who === 'skip-link'), { page: file, width: '375px/禁用JS', step: '跳转链接与导航链接均可 Tab 到达', detail: nojsTab.map((f) => f.who).join('>'), handoff: 'Task 8' });
  const fo = nojsTab.find((f) => /site-navigation__link/.test(f.who));
  if (fo) A('RE1', fo.oS === 'solid' && px(fo.oW) >= 2 && fo.oC === ACCENT && fo.clip.length === 0, { page: file, width: '375px/禁用JS', step: '无脚本态焦点轮廓不被裁切', detail: `${fo.oW} ${fo.oS} ${fo.oC} 祖先=${JSON.stringify(fo.clip)}`, handoff: 'Task 3' });
  navCount = 0;
  await clickEl('#site-navigation li:nth-child(2) a');
  await sleep(900);
  const landed = await measure();
  A('RE1', navCount > 0 && base(landed.url) === 'news-message.html', { page: file, width: '375px/禁用JS', step: '无脚本时链接仍可点击并真实导航', detail: `frameNavigated=${navCount} 落地=${base(landed.url)}`, handoff: 'Task 2' });
  await shot(`${file.replace('.html', '')}-375-nojs`);
  await send('Emulation.setScriptExecutionDisabled', { value: false });

  await openFile(file); await metrics(375, 900);
  m = await measure();
  A('RE2', m.htmlClasses.indexOf('js') >= 0 && m.htmlClasses.indexOf('no-js') < 0, { page: file, width: '375px', step: 'JS 可用硬刷新后 html 为 js 且不含 no-js', detail: m.htmlClass, handoff: 'Task 9' });
  A('RE2', m.links.every((l) => !l.shown && l.nrects === 0), { page: file, width: '375px', step: '关闭态隐藏链接不生成布局盒（因而不在 Tab 顺序）', detail: JSON.stringify(m.links.map((l) => [l.shown, l.nrects])), handoff: 'Task 8/9' });
  const closedH = m.header.h, closedMainTop = m.main.top;
  const t2 = [];
  for (let i = 0; i < 2; i++) { await tab(); t2.push((await focusInfo()).who); }
  A('RE2', !t2.some((w2) => /site-navigation__link/.test(w2)), { page: file, width: '375px', step: '关闭态 Tab 序列不含导航链接', detail: t2.join('>'), handoff: 'Task 8' });
  await shot(`${file.replace('.html', '')}-375-closed`);

  await openFile(file); await metrics(375, 900);
  const pre = await measure();
  await clickEl('#nav-toggle');
  m = await measure();
  A('RE3', m.nav.open === true && m.tog.aria === 'true' && m.nav.disp === 'block', { page: file, width: '375px', step: '激活按钮后：.is-open + aria-expanded=true + 导航显示', detail: `open=${m.nav.open} aria=${m.tog.aria} disp=${m.nav.disp}`, handoff: 'Task 9' });
  A('RE3', m.navList.dir === 'column' && m.links.every((l) => l.shown && l.w >= 44 && l.h >= 44), { page: file, width: '375px', step: '四项纵向完整显示且点击区达标', detail: JSON.stringify(m.links.map((l) => [Math.round(l.w), Math.round(l.h)])), handoff: 'Task 8' });
  const ys = m.links.map((l) => Math.round(l.top));
  A('RE3', ys.every((y, i) => i === 0 || y > ys[i - 1]), { page: file, width: '375px', step: '展开菜单项纵向排列互不重叠', detail: ys.join(' > '), handoff: 'Task 8' });
  A('RE3', m.nav.rect.bottom <= m.main.top + 0.6 && m.headerInner.right <= m.clientWidth + 0.5, { page: file, width: '375px', step: '展开菜单不覆盖正文、不横向推挤报头', detail: `nav.bottom=${Math.round(m.nav.rect.bottom)} main.top=${m.main.top} inner.right=${m.headerInner.right.toFixed(1)} client=${m.clientWidth}`, handoff: 'Task 8' });
  A('RE3', m.mastBox.top === pre.mastBox.top, { page: file, width: '375px', step: '展开不使报头位移或被截断', detail: `masthead.top ${pre.mastBox.top} -> ${m.mastBox.top}`, handoff: 'Task 8' });
  A('RE3', m.scrollW <= m.innerWidth, { page: file, width: '375px', step: '展开态仍无横向溢出', detail: `${m.scrollW}<=${m.innerWidth}`, handoff: 'Task 8' });
  const openH = m.header.h, openMainTop = m.main.top;
  A('RE2', openH - closedH >= m.links.reduce((a, l) => a + l.h, 0) - 4 && openMainTop > closedMainTop, { page: file, width: '375px', step: '页面不因隐藏导航留下异常固定高度或空白（只有展开才增高、把正文下推）', detail: `header 高 闭=${closedH} 开=${openH} Δ=${openH - closedH} 四链接合计=${Math.round(m.links.reduce((a, l) => a + l.h, 0))}; main.top ${closedMainTop}->${openMainTop}`, handoff: 'Task 8' });
  const btn = await focusInfo();
  A('RE3', btn.who === 'nav-toggle', { page: file, width: '375px', step: '点击打开后焦点仍在按钮（披露式，不强制移入）', detail: btn.who, handoff: 'Task 9' });
  const who = [];
  for (let i = 0; i < 5; i++) { await tab(); who.push((await focusInfo()).who); }
  A('RE3', who.slice(0, 4).every((w2) => /site-navigation__link/.test(w2)), { page: file, width: '375px', step: 'Tab 顺序自然：按钮→四个导航链接（第 5 次离开导航）', detail: `nav-toggle > ${who.join(' > ')}`, handoff: 'Task 8/9' });
  A('RE3', !/nav-toggle/.test(who.slice(0, 4).join('>')), { page: file, width: '375px', step: '按钮之后不重复回到按钮/焦点陷阱', detail: who.join('>'), handoff: 'Task 9' });
  A('RE4', m.nav.open === (m.tog.aria === 'true'), { page: file, width: '375px', step: 'is-open 与 aria-expanded 同步（打开）', detail: `open=${m.nav.open} aria=${m.tog.aria}`, handoff: 'Task 9' });
  await clickEl('#nav-toggle');
  m = await measure();
  A('RE4', m.nav.open === false && m.tog.aria === 'false', { page: file, width: '375px', step: 'is-open 与 aria-expanded 同步（关闭）', detail: `open=${m.nav.open} aria=${m.tog.aria}`, handoff: 'Task 9' });
}

/* ---------- R-F 交互 ---------- */
async function interactions(file) {
  const n0 = noise.length;
  await openFile(file); await metrics(375, 900);
  await clickEl('#nav-toggle');
  let m = await measure();
  A('RF1', m.nav.open === true && m.tog.aria === 'true', { page: file, width: '375px', step: '点击按钮打开一次，状态与 ARIA 同步', detail: `open=${m.nav.open} aria=${m.tog.aria}`, handoff: 'Task 9' });
  await clickEl('#nav-toggle');
  m = await measure();
  A('RF1', m.nav.open === false && m.tog.aria === 'false', { page: file, width: '375px', step: '再次点击关闭一次，状态与 ARIA 同步', detail: `open=${m.nav.open} aria=${m.tog.aria}`, handoff: 'Task 9' });
  A('RF5', (await focusInfo()).who === 'nav-toggle', { page: file, width: '375px', step: '披露式焦点策略：焦点保持在按钮，未强制移入菜单', detail: (await focusInfo()).who, handoff: 'Task 9' });

  await openFile(file); await metrics(375, 900);
  for (let i = 0; i < 6 && (await focusInfo()).who !== 'nav-toggle'; i++) await tab();
  await ev('window.__c = 0; document.getElementById("nav-toggle").addEventListener("click", function () { window.__c++; });');
  let c = await ev('window.__c');
  await enter(); m = await measure(); let c2 = await ev('window.__c');
  A('RF2', c2 - c === 1 && m.nav.open === true && m.tog.aria === 'true', { page: file, width: '375px', step: '聚焦按钮按 Enter：恰好一次激活（keydown 激活）', detail: `Δclick=${c2 - c} open=${m.nav.open} aria=${m.tog.aria}`, handoff: 'Task 9' });
  c = c2; await enter(); m = await measure(); c2 = await ev('window.__c');
  A('RF2', c2 - c === 1 && m.nav.open === false && m.tog.aria === 'false', { page: file, width: '375px', step: 'Enter 再按：恰好切回关闭', detail: `Δclick=${c2 - c} open=${m.nav.open}`, handoff: 'Task 9' });
  c = c2; await space(); m = await measure(); c2 = await ev('window.__c');
  A('RF2', c2 - c === 1 && m.nav.open === true && m.tog.aria === 'true', { page: file, width: '375px', step: 'Space：与点击等效、恰好一次激活（keyup 激活）', detail: `Δclick=${c2 - c} open=${m.nav.open} aria=${m.tog.aria}`, handoff: 'Task 9' });
  c = c2; await space(); m = await measure(); c2 = await ev('window.__c');
  A('RF2', c2 - c === 1 && m.nav.open === false && m.tog.aria === 'false', { page: file, width: '375px', step: 'Space 再按恰好切回，无双触发', detail: `Δclick=${c2 - c} open=${m.nav.open}`, handoff: 'Task 9' });

  await clickEl('#nav-toggle');
  m = await measure();
  A('RF3', m.nav.open === true, { page: file, width: '375px', step: '前置：菜单为打开态', detail: `open=${m.nav.open}`, handoff: 'Task 9' });
  await tab();
  const onLink = (await focusInfo()).who;
  await esc(); m = await measure();
  A('RF3', m.nav.open === false && m.tog.aria === 'false' && (await focusInfo()).who === 'nav-toggle', { page: file, width: '375px', step: `打开态（焦点在 ${onLink}）按 Esc：关闭菜单且焦点返回 #nav-toggle`, detail: `open=${m.nav.open} aria=${m.tog.aria} active=${(await focusInfo()).who}`, handoff: 'Task 9' });
  const s1 = await measure();
  await esc();
  await metrics(375, 1300); await esc(); await metrics(375, 900); await sleep(200);
  const s2 = await measure();
  A('RF3', s2.nav.open === false && s2.active === s1.active && s2.scrollY === s1.scrollY, { page: file, width: '375px', step: '关闭态按 Esc 无副作用（不抢焦点、不滚动）', detail: `active ${s1.active}->${s2.active} scrollY ${s1.scrollY}->${s2.scrollY}`, handoff: 'Task 9' });

  for (const idx of [3, 1]) {
    await openFile(file); await metrics(375, 900);
    await clickEl('#nav-toggle');
    m = await measure();
    if (!m.nav.open) { A('RF4', false, { page: file, width: '375px', step: `前置打开（第 ${idx} 项）`, detail: `open=${m.nav.open}`, handoff: 'Task 9' }); continue; }
    navCount = 0;
    const want = await js(`(() => { const a = document.querySelectorAll('.site-navigation__link')[${idx - 1}]; return JSON.stringify({ text: a.textContent, href: a.getAttribute('href') }); })()`);
    await clickEl(`#site-navigation li:nth-child(${idx}) a`);
    await sleep(1000);
    const land = await measure();
    A('RF4', navCount > 0 && land.nav.open === false && land.tog.aria === 'false', { page: file, width: '375px', step: `打开态点击第 ${idx} 项「${want.text}」：先关闭再导航，落地无展开残留`, detail: `navigated=${navCount} 落地=${base(land.url)} open=${land.nav.open} aria=${land.tog.aria}`, handoff: 'Task 9' });
    A('RA4', !!TITLES[base(land.url)] && land.title === TITLES[base(land.url)], { page: file, width: '375px', step: `点击「${want.text}」到达现有页面`, detail: `${base(land.url)} :: ${land.title}`, handoff: 'Task 2' });
  }

  await openFile(file); await metrics(375, 900);
  await clickEl('#nav-toggle');
  const mm = await measure();
  await clickEl(null, Math.round(mm.clientWidth / 2), Math.min(700, mm.docH - 20));
  m = await measure();
  A('RF7', m.nav.open === true && m.tog.aria === 'true', { page: file, width: '375px', step: '点击菜单外正文区域：菜单保持展开（合同已定，不实现外点关闭，不判失败）', detail: `open=${m.nav.open} aria=${m.tog.aria}`, handoff: '—' });
  A('RF7', noiseSince(n0).length === 0, { page: file, width: '375px', step: '外点过程无报错、无异常失焦', detail: noiseSince(n0).join(' | '), handoff: 'Task 9' });
  A('RF6', m.navFlagged.length === 0 && m.nav.disp === 'block', { page: file, width: '375px', step: '折叠由 CSS display 负责：脚本未用 tabindex/aria-hidden/hidden/inert 管理链接可聚焦性', detail: `导航子树被标记属性=${JSON.stringify(m.navFlagged)} main.tabindex=${m.mainFocus.tab}`, handoff: 'Task 9' });
}

/* ---------- R-G 跨断点 ---------- */
async function crossBreak(file) {
  await openFile(file); await metrics(768, 900);
  await clickEl('#nav-toggle');
  let m = await measure();
  A('RG1', m.nav.open === true && m.mqM && !m.mqD, { page: file, width: '768px', step: '前置：768px 打开菜单', detail: `open=${m.nav.open} mqM=${m.mqM} mqD=${m.mqD}`, handoff: 'Task 9' });
  await ev('(() => { window.__mq = []; const x = matchMedia("(min-width: 769px)"); x.addEventListener("change", function (e) { window.__mq.push("change:" + e.matches); }); return 1; })()');
  await metrics(769, 900);
  await sleep(450);
  m = await measure();
  const mq = await ev('JSON.stringify(window.__mq || [])');
  A('RG1', mq.indexOf('true') >= 0, { page: file, width: '768→769px', step: '对照监听：本渲染环境确实派发 mediaquery change 事件', detail: mq, handoff: '—' });
  A('RG1', m.nav.open === false && m.tog.aria === 'false', { page: file, width: '768→769px', step: '跨到 769px：.is-open 清除且 aria-expanded 重置 false', detail: `open=${m.nav.open} aria=${m.tog.aria}`, handoff: 'Task 9' });
  A('RG1', m.tog.disp === 'none' && m.nav.disp !== 'none' && m.links.every((l) => l.shown), { page: file, width: '768→769px', step: '按钮隐藏、导航立即恢复横向常显', detail: `tog=${m.tog.disp} nav=${m.nav.disp} shown=${m.links.map((l) => l.shown).join(',')}`, handoff: 'Task 3/8/9' });
  const tops = m.links.map((l) => Math.round(l.top));
  A('RG1', tops.every((t) => Math.abs(t - tops[0]) <= 1), { page: file, width: '768→769px', step: '移动 display:none/纵向规则不再作用（同一行）', detail: tops.join(','), handoff: 'Task 8' });
  A('RG1', px(m.mast.fs) === 64 && near(m.headerInner.w, m.clientWidth - 64, 1.2) && m.navList.gap !== '0px', { page: file, width: '768→769px', step: '移动字号与移动间距退出，桌面基线回来（报头 64px、版心=视口−2×2rem、导航 gap 恢复）', detail: `mast=${m.mast.fs} 版心=${m.headerInner.w} client=${m.clientWidth} 期望=${m.clientWidth - 64} gap=${m.navList.gap}`, handoff: 'Task 8' });
  await metrics(375, 900); await sleep(400);
  m = await measure();
  A('RG2', m.nav.open === false && m.tog.aria === 'false', { page: file, width: '375px', step: '再缩回 ≤768px：菜单为关闭态，不复用旧展开状态', detail: `open=${m.nav.open} aria=${m.tog.aria}`, handoff: 'Task 9' });
  await clickEl('#nav-toggle'); m = await measure();
  A('RG2', m.nav.open === true && m.tog.aria === 'true', { page: file, width: '375px', step: '缩回后仍可正常打开', detail: `open=${m.nav.open}`, handoff: 'Task 9' });
  await shot(`${file.replace('.html', '')}-after-reset`);
  await metrics(769, 900); await sleep(300); await metrics(1280, 900); await sleep(250);
  const z = await measure();
  A('RG3', z.scrollW <= z.innerWidth && z.nav.open === false, { page: file, width: '断点连续切换', step: '切换过程无布局跳变残留、无横向溢出', detail: `scrollW=${z.scrollW} inner=${z.innerWidth} open=${z.nav.open}`, handoff: 'Task 8/9' });
}

/* ---------- R-H 200% 缩放 ---------- */
async function zoom200(file) {
  await openFile(file); await metrics(1280, 900, 1);
  const before = await measure();
  A('RH1', before.innerWidth === 1280, { page: file, width: '1280px/100%', step: `记录缩放前 innerWidth=${before.innerWidth}`, detail: `client=${before.clientWidth} 根字号=${before.rootFont} 报头=${before.mast.fs} 版心=${before.headerInner.w}`, handoff: '—' });
  /* 本环境实测（zoom_probe.mjs）：CDP setDeviceMetricsOverride 的 zoom 参数是 no-op
     （zoom=1 与 zoom=2 均为 innerWidth=1280、dpr=1），deviceScaleFactor 只改物理像素。
     故分别复现真实 200% 缩放的两个效果：布局 = CSS 视口 1280/2=640px；绘制 = dpr=2（文字实际像素翻倍）。
     不使用 CSS zoom、transform: scale() 或截图放大来伪装缩放。 */
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false, zoom: 2 }).catch(() => {});
  await sleep(320);
  const zp = await measure();
  const noop = zp.innerWidth >= 1280 && zp.dpr === 1;
  await send('Emulation.setDeviceMetricsOverride', { width: 640, height: 900, deviceScaleFactor: 2, mobile: false });
  await sleep(320);
  let m = await measure();
  const mech = noop ? 'CDP zoom=2 在本 Chrome 为 no-op（zoom_probe.mjs 已证实）→ 用 640px 布局视口 + deviceScaleFactor=2 复现 200% 的布局与绘制两个效果' : 'CDP zoom=2 直接生效';
  A('RH1', m.innerWidth === 640 && m.dpr === 2 && m.mast.px >= before.mast.px * 1.5, { page: file, width: '200%', step: '缩放的两个效果同时成立：CSS 视口折半（1280→640）且文字实际像素翻倍', detail: `inner=${m.innerWidth} dpr=${m.dpr} 报头 CSS=${m.mast.fs} 实际=${m.mast.px} 设备像素（100% 时 ${before.mast.px}px）`, handoff: '—' });
  A('RH1', m.innerWidth < before.innerWidth, { page: file, width: '200%', step: `记录缩放后 innerWidth=${m.innerWidth}（100% 时为 ${before.innerWidth}）`, detail: `机制=${mech}；dpr=${m.dpr} client=${m.clientWidth}`, handoff: '—' });
  A('RH1', m.rootFont === before.rootFont && px(m.rootFont) === 16, { page: file, width: '200%', step: '根字号由 html{font-size:100%} 派生、未锁死为像素（缩放按 CSS px 等比生效）', detail: `100%=${before.rootFont} → 200%=${m.rootFont}`, handoff: 'Task 3' });
  if (m.innerWidth <= 768) {
    A('RH2', m.mqM === true && m.mqD === false && m.tog.disp !== 'none' && m.nav.disp === 'none', { page: file, width: `200%→${m.innerWidth}px`, step: '缩放后 innerWidth≤768：进入移动布局（属预期正确结果），按钮可见、导航折叠', detail: `inner=${m.innerWidth} tog=${m.tog.disp} nav=${m.nav.disp}`, handoff: '—' });
    await clickEl('#nav-toggle');
    m = await measure();
    A('RH2', m.nav.open === true && m.tog.aria === 'true' && m.links.every((l) => l.shown && l.w >= 44 && l.h >= 44), { page: file, width: `200%→${m.innerWidth}px`, step: '复查菜单三态与 44px 点击区', detail: `open=${m.nav.open} ${JSON.stringify(m.links.map((l) => [Math.round(l.w), Math.round(l.h)]))}`, handoff: 'Task 8/9' });
    await tab();
    const f = await focusInfo();
    A('RH3', f.oS === 'solid' && f.oC === ACCENT, { page: file, width: `200%→${m.innerWidth}px`, step: '缩放下焦点未丢失：Tab 后仍有暗红实线轮廓', detail: JSON.stringify([f.who, f.oW + ' ' + f.oS + ' ' + f.oC]), handoff: 'Task 3' });
    await clickEl('#nav-toggle');
  } else {
    A('RH2', m.mqD === true && m.links.every((l) => l.shown) && m.tog.disp === 'none', { page: file, width: `200%→${m.innerWidth}px`, step: '缩放后仍 ≥769px：保持桌面横向导航', detail: `inner=${m.innerWidth}`, handoff: 'Task 8' });
  }
  A('RH3', m.scrollW <= m.innerWidth && m.scrollW <= m.clientWidth, { page: file, width: `200%→${m.innerWidth}px`, step: '200% 下无横向滚动', detail: `scrollW=${m.scrollW} inner=${m.innerWidth} client=${m.clientWidth}`, handoff: 'Task 8' });
  A('RH3', m.mast.sw <= m.mast.cw + 0.5 && m.pageTitle.sw <= m.pageTitle.cw + 0.5 && m.nav.rect.right <= m.clientWidth + 0.5, { page: file, width: `200%→${m.innerWidth}px`, step: '无文字裁切、元素不越界', detail: `mast ${m.mast.sw}/${m.mast.cw} · title ${m.pageTitle.sw}/${m.pageTitle.cw} · nav.right=${Math.round(m.nav.rect.right)}`, handoff: 'Task 8' });
  const hit = await js('(() => { const n = document.getElementById("site-navigation"), mn = document.querySelector(".main-content"); const a = n.getBoundingClientRect(), b = mn.getBoundingClientRect(); return JSON.stringify({ hidden: getComputedStyle(n).display === "none", overlap: a.bottom > b.top + 0.6 }); })()');
  A('RH3', hit.hidden === true || hit.overlap === false, { page: file, width: `200%→${m.innerWidth}px`, step: '元素不重叠（折叠时导航不占位，展开时不压正文）', detail: JSON.stringify(hit), handoff: 'Task 8' });
  await shot(`${file.replace('.html', '')}-zoom200`);
  await metrics(1280, 900, 1); await sleep(250);
  const back = await measure();
  A('RH3', back.innerWidth === 1280 && back.nav.open === false && near(back.headerInner.w, before.headerInner.w, 1), { page: file, width: '1280px/回到100%', step: '恢复 100% 后布局与状态无残留', detail: `inner=${back.innerWidth} 版心=${back.headerInner.w} open=${back.nav.open}`, handoff: 'Task 9' });
}

/* ---------- R-I 降级 ---------- */
async function degrade(file) {
  await send('Emulation.setScriptExecutionDisabled', { value: true });
  await openFile(file); await metrics(1280, 900);
  let m = await measure();
  A('RI1', m.htmlClasses.indexOf('no-js') >= 0 && m.sheets.length === 1 && m.sheets[0].rules >= 40, { page: file, width: '1280px/禁用JS', step: '禁用 JS 并硬刷新：html 保持 no-js，CSS 仍生效（样式不依赖脚本）', detail: `class=${m.htmlClass} rules=${m.sheets[0].rules}`, handoff: 'Task 9' });
  const f0 = FACTS[file];
  const want = (f0.paragraphs || []).map((p) => p.text);
  A('RI1', m.paras.length === want.length && m.paras.join('\u0001') === want.join('\u0001'), { page: file, width: '1280px/禁用JS', step: `无脚本时正文完整可见、与 Task 10 基线逐段全等（${want.length} 段）`, detail: `实测=${m.paras.length} 段`, handoff: 'Task 5/6/7' });
  A('RI1', want.length === 0 || m.paras.map((p) => p.length).join(',') === want.map((t) => t.length).join(','), { page: file, width: '1280px/禁用JS', step: '逐段字符数与基线一致（内容不依赖脚本注入）', detail: want.length ? `基线=${want.map((t) => t.length).join(',')} 实测=${m.paras.map((p) => p.length).join(',')}` : '本页无正文段落', handoff: 'Task 10' });
  const secs = await js('(() => { const t = document.querySelector(".main-content"); return JSON.stringify({ n: t.querySelectorAll("h1,h2,p").length, len: t.textContent.replace(/\\s+/g, "").length }); })()');
  A('RI1', secs.n >= 3 && secs.len > 60, { page: file, width: '1280px/禁用JS', step: '主内容节点与字符量在非脚本状态下保持', detail: JSON.stringify(secs), handoff: 'Task 4/5/6/7' });
  await send('Emulation.setScriptExecutionDisabled', { value: false });

  await openFile(file); await metrics(1280, 900);
  const withCss = await measure();
  await ev('(() => { for (const s of document.styleSheets) s.disabled = true; return 1; })()');
  await sleep(250);
  const m2 = await measure();
  A('RI2', m2.sheets.length > 0 && m2.sheets.every((s) => s.disabled === true) && m2.bodyBg === 'rgba(0, 0, 0, 0)', { page: file, width: '1280px/禁用CSS', step: 'CSS 已真实停用（纸色底回退为浏览器默认）', detail: `disabled=${JSON.stringify(m2.sheets.map((s) => s.disabled))} body背景=${m2.bodyBg} 版心=${m2.headerInner.w}`, handoff: '—' });
  A('RI2', m2.paras.length === withCss.paras.length && m2.mainText === withCss.mainText, { page: file, width: '1280px/禁用CSS', step: '无内容因样式缺失而消失（主内容 textContent 全等）', detail: `段=${m2.paras.length} 字符=${m2.mainText.length}`, handoff: 'Task 5/6/7' });
  const texts = await js('(() => { const out = []; const w = document.createTreeWalker(document.querySelector(".main-content"), NodeFilter.SHOW_TEXT); while (w.nextNode()) { const t = w.currentNode.nodeValue.trim(); if (t) out.push(t); } return JSON.stringify(out); })()');
  if (file === 'index.html') {
    const want = [f0.h1s[0].text];
    for (const s of f0.sections) { want.push(s.h2Text); want.push(s.pText); }
    const idx = want.map((s) => texts.indexOf(s));
    A('RI2', idx.every((i) => i >= 0) && idx.every((v, i) => i === 0 || v > idx[i - 1]), { page: file, width: '1280px/禁用CSS', step: '首页阅读顺序：主标题→三区块标题及其文本', detail: `序=${JSON.stringify(idx)}（文本节点 ${texts.length} 个）`, handoff: 'Task 4' });
  } else {
    const t = f0.article.header.texts.map((s) => s.split(' :: ').slice(1).join(' :: '));
    const iType = texts.indexOf(t[0]), iTitle = texts.indexOf(t[1]), iBy = texts.indexOf(t[2]);
    const iBody = texts.findIndex((x) => x.length > 1 && withCss.paras[0].indexOf(x) === 0);
    A('RI2', iType >= 0 && iTitle > iType && iBy > iTitle && iBody > iBy, { page: file, width: '1280px/禁用CSS', step: '文章页阅读顺序：页面类型→标题→署名→正文', detail: `类型=${iType} 标题=${iTitle} 署名=${iBy} 正文首段=${iBody} / 共 ${texts.length} 个文本节点`, handoff: 'Task 5/6/7' });
    if (f0.article.date) {
      const iDate = texts.indexOf(f0.article.date.text);
      A('RI2', iDate === texts.length - 1, { page: file, width: '1280px/禁用CSS', step: '末尾日期位于正文之后（阅读顺序最后一步）', detail: `日期位置=${iDate} 文本节点=${texts.length} 值=${f0.article.date.text}`, handoff: 'Task 7' });
    }
  }
  const ax = await axForLinks();
  A('RI2', ax.length === 5 && ax.every((n, i) => n.role === 'link' && n.name === withCss.links[i].text), { page: file, width: '1280px/禁用CSS', step: '导航链接仍在文档树与无障碍树中（role=link + 可访问名）', detail: JSON.stringify(ax), handoff: 'Task 2' });
  await shot(`${file.replace('.html', '')}-1280-nocss`);
  await openFile(file); await metrics(1280, 900);
  const m3 = await measure();
  A('RI3', m3.htmlClasses.indexOf('js') >= 0 && m3.sheets.every((s) => !s.disabled) && m3.bodyBg === PAPER && near(m3.headerInner.w, withCss.headerInner.w, 0.6), { page: file, width: '1280px', step: '恢复启用并硬刷新：回到正常基线、无残留', detail: `class=${m3.htmlClass} bg=${m3.bodyBg} 版心=${m3.headerInner.w}`, handoff: 'Task 9' });
}

/* ---------- R-J 运行时内容一致性 ---------- */
async function content(file) {
  const f0 = FACTS[file];
  await openFile(file); await metrics(1280, 900);
  const d = await measure();
  await metrics(375, 900);
  const m = await measure();
  const want = (f0.paragraphs || []).map((p) => p.text);
  A('RJ2', m.paras.length === want.length && d.paras.length === want.length, { page: file, width: '1280 与 375px', step: `段落数量=${want.length}（与 Task 10 基线一致）`, detail: `桌面=${d.paras.length} 移动=${m.paras.length}`, handoff: 'Task 5/6/7/10' });
  A('RJ1', m.paras.join('\u0001') === want.join('\u0001'), { page: file, width: '375px', step: '移动渲染正文与 Task 10 逐段基线全等（CSS 换行/clamp/安全换行未增删字符）', detail: `渲染字符=${m.paras.join('').length} 基线=${want.join('').length}`, handoff: 'Task 10' });
  A('RJ1', d.paras.join('\u0001') === m.paras.join('\u0001'), { page: file, width: '1280 vs 375', step: '跨断点所见正文文本一致', detail: '', handoff: 'Task 8' });
  A('RJ1', d.pageTitle.text === f0.h1s[0].text && d.mast.text === '自然选择号', { page: file, width: '1280px', step: '页面标题与报头文本与基线一致', detail: d.pageTitle.text, handoff: 'Task 10' });
  const hdr = f0.article && f0.article.header ? f0.article.header.texts.map((s) => s.split(' :: ').slice(1).join(' :: ')) : [];
  if (hdr.length === 3) {
    A('RJ1', d.artType.text === hdr[0] && d.artTitle.text === hdr[1] && d.byline.text === hdr[2], { page: file, width: '1280px', step: '页面类型／标题／署名与基线逐字符一致', detail: `[${d.artType.text}][${d.artTitle.text}][${d.byline.text}]`, handoff: 'Task 10' });
    A('RJ1', d.artType.top < d.artTitle.top && d.artTitle.top < d.byline.top, { page: file, width: '1280px', step: '渲染顺序：类型→标题→署名', detail: `${Math.round(d.artType.top)} < ${Math.round(d.artTitle.top)} < ${Math.round(d.byline.top)}`, handoff: 'Task 5/6/7' });
  }
  const fdate = f0.article && f0.article.date ? f0.article.date.text : null;
  if (fdate) A('RJ1', !!d.date && d.date.text === fdate, { page: file, width: '1280px', step: '末尾日期与基线一致且可见', detail: `基线[${fdate}] 实测[${d.date ? d.date.text : 'null'}]`, handoff: 'Task 10' });
  if (file === 'index.html') {
    const home = await js('(() => { const a = [].slice.call(document.querySelectorAll(".home-section__text")).map(function (e) { return e.textContent; }); const b = [].slice.call(document.querySelectorAll(".home-section__title")).map(function (e) { return e.textContent; }); return JSON.stringify({ a, b }); })()');
    A('RJ2', home.b.join('\u0001') === f0.sections.map((s) => s.h2Text).join('\u0001') && home.a.join('\u0001') === f0.sections.map((s) => s.pText).join('\u0001'), { page: file, width: '375px', step: '首页三区块标题与文本按基线顺序逐字符一致', detail: JSON.stringify(home.b) + JSON.stringify(home.a.map((t) => t.length)), handoff: 'Task 4' });
  }
  const css = await js(CSS_BLOB);
  const cm = css.blob.match(/(^|[;{\s])[a-z-]*content\s*:\s*[^;}]+/g) || [];
  const real = cm.map((s) => s.trim()).filter((s) => /^content\s*:/.test(s));
  const badContent = real.filter((s) => !/^content\s*:\s*(""|''|none|normal)\s*$/.test(s.trim()));
  A('RJ3', badContent.length === 0, { page: file, width: '-', step: '伪元素 content 只用于画线（空串），未生成任何可见文字', detail: `content 声明 ${real.length} 处：${JSON.stringify(real)}；可疑：${JSON.stringify(badContent)}`, handoff: 'Task 3' });
  const after = await measure();
  A('RJ3', after.mainText === m.mainText, { page: file, width: '375px', step: '全部交互与降级之后主内容无脚本注入文本、无字符增删', detail: `字符 ${m.mainText.length} -> ${after.mainText.length}`, handoff: 'Task 9' });
  await metrics(1280, 900);
}

/* ---------- R-A 加载与资源 ---------- */
async function loadPass() {
  const net = [];
  const reqUrl = new Map();
  try { await send('Network.enable', {}); } catch {}
  on((msg) => {
    if (msg.method === 'Network.requestWillBeSent') { net.push(msg.params.request.url); reqUrl.set(msg.params.requestId, msg.params.request.url); }
    if (msg.method === 'Network.responseReceived') net.push('RESP ' + msg.params.response.status + ' ' + msg.params.response.url);
    /* loadingFailed 事件里没有 request 对象：必须用 requestId 反查，否则监听器抛错会整跑挂掉 */
    if (msg.method === 'Network.loadingFailed') net.push('FAILED::' + (reqUrl.get(msg.params.requestId) || msg.params.requestId) + '::' + (msg.params.errorText || ''));
  });
  for (const file of PAGES) {
    tag = file;
    const n0 = noise.length;
    const ok = await openFile(file);
    await metrics(1280, 900);
    const m = await measure();
    A('RA1', ok === true && m.title === TITLES[file], { page: file, width: '1280px', step: '从 file:// 直接打开并完成 load 事件', detail: `load=${ok} title=${m.title}`, handoff: 'Task 2' });
    A('RA2', m.sheets.length === 1 && /styles\.css$/.test(m.sheets[0].href || '') && m.sheets[0].rules >= 40, { page: file, width: '1280px', step: 'styles.css 成功加载并解析（非 404，规则可读）', detail: JSON.stringify(m.sheets), handoff: 'Task 2' });
    A('RA2', m.htmlClasses.indexOf('js') >= 0, { page: file, width: '1280px', step: 'script.js 成功加载并执行（no-js→js 已发生）', detail: m.htmlClass, handoff: 'Task 2' });
    const rt = await send('Page.getResourceTree').catch(() => null);
    const rl = rt ? rt.frameTree.resources.map((r) => ({ n: base(r.url), t: r.type, failed: !!r.failed, local: String(r.url).slice(0, 7) === 'file://' })) : [];
    A('RA2', rl.length >= 2 && rl.every((r) => r.local && !r.failed) && rl.some((r) => r.n === 'styles.css') && rl.some((r) => r.n === 'script.js'), { page: file, width: '1280px', step: 'DevTools 资源树：本目录资源全部成功、无 failed、无外部 URL', detail: JSON.stringify(rl), handoff: 'Task 2' });
    const ext = await js('(() => { const bad = []; document.querySelectorAll("*").forEach(function (e) { for (const a of e.attributes) { const v = a.value; if (v.indexOf("http:") === 0 || v.indexOf("https:") === 0 || v.indexOf("//") === 0 || v.indexOf("data:") === 0) bad.push(e.tagName + "@" + a.name + "=" + v.slice(0, 40)); } }); const rules = []; for (const s of document.styleSheets) { try { for (const r of s.cssRules) { const t = r.cssText; if (t.indexOf("url(") >= 0 || t.indexOf("@import") >= 0 || t.indexOf("http:") >= 0 || t.indexOf("https:") >= 0) rules.push(t.slice(0, 70)); } } catch (e) { rules.push("READERR"); } } return JSON.stringify({ bad, rules }); })()');
    A('RA2', ext.bad.length === 0 && ext.rules.length === 0, { page: file, width: '1280px', step: 'DOM 属性与 CSSOM 规则中无 http(s)/协议相对/data/@import/url() 外链（远程字体、CDN 均无）', detail: JSON.stringify(ext), handoff: 'Task 2' });
    A('RA3', noiseSince(n0).length === 0, { page: file, width: '1280px', step: '加载阶段控制台 0 错误 0 警告', detail: noiseSince(n0).join(' | '), handoff: 'Task 9/3/8' });
  }
  const plain = [...new Set(net)].map((u) => String(u).replace(/^RESP \d+ /, ''));
  const external = plain.filter((u) => u.slice(0, 5) !== 'file:' && u.slice(0, 6) !== 'about:' && u.slice(0, 5) !== 'data:');
  A('RA2', external.length === 0, { page: '四页汇总', width: '-', step: `Network 域全程 ${new Set(net).size} 条事件中无 http(s)/CDN/远程字体请求`, detail: external.slice(0, 5).join(' , '), handoff: 'Task 2' });
  const failed = [...new Set(net)].filter((u) => String(u).indexOf('FAILED::') === 0 || / 40[0-9] | 5[0-9][0-9] /.test(' ' + u + ' '));
  A('RA2', failed.length === 0, { page: '四页汇总', width: '-', step: 'Network 域无 404/失败资源', detail: failed.slice(0, 5).join(' , '), handoff: 'Task 2' });
  return net;
}

/* ---------- RA4 16 条导航路径 ---------- */
async function navMatrix() {
  for (const file of PAGES) {
    for (let i = 1; i <= 4; i++) {
      await openFile(file); await metrics(1280, 900);
      const want = await js(`(() => { const a = document.querySelectorAll('.site-navigation__link')[${i - 1}]; return JSON.stringify({ href: a.getAttribute('href'), text: a.textContent }); })()`);
      const exists = fs.existsSync(path.join(RESULTS, want.href));
      const n0 = noise.length;
      navCount = 0;
      await clickEl(`#site-navigation li:nth-child(${i}) a`);
      await sleep(900);
      const m = await measure();
      A('RA4', exists && navCount > 0 && base(m.url) === want.href && m.title === TITLES[want.href] && noiseSince(n0).length === 0, { page: file, width: '1280px', step: `点击第 ${i} 项「${want.text}」→ ${want.href}（16 条路径逐条）`, detail: `目标文件存在=${exists} navigated=${navCount} 落地=${base(m.url)} 标题=${m.title}${noiseSince(n0).length ? ' 噪声:' + noiseSince(n0).join('|') : ''}`, handoff: 'Task 2' });
    }
  }
}

/* ---------- 访问历史 A/B：真实点击把四个目标页都访问过，再回看同页非当前链接配色 ----------
 * Chrome 的 :visited 配色在历史解析后才异步生效，且 file:// 是否计入访问历史需实测；
 * 上一轮曾把「强制 hover 泄漏」误读为 visited 效应，故这里用真实点击 + 轮询定论。
 */
async function visitedTimingPass() {
  await openFile('index.html'); await metrics(1280, 900);
  for (const t of ['news-message.html', 'news-feature.html', 'news-commentary.html']) {
    await clickEl('#site-navigation li:nth-child(' + (PAGES.indexOf(t) + 1) + ') a');
    await sleep(700);
    await clickEl('#site-navigation li:nth-child(1) a');
    await sleep(700);
  }
  for (const file of PAGES) {
    await openFile(file); await metrics(1280, 900);
    let m = await measure();
    const first = m.links.filter((l) => l.cur !== 'page').map((l) => [l.text, l.color]);
    for (let k = 0; k < 16; k++) { await sleep(250); m = await measure(); }
    const norm = m.links.filter((l) => l.cur !== 'page');
    A('RB5-V', norm.every((l) => l.color === INK), { page: file, width: '1280px/四页均已访问', step: '用户已访问全部目标页后，普通导航链接仍为深色（未被 a:visited 覆盖为暗红）', detail: '刚加载=' + JSON.stringify(first) + ' → 轮询 4s 后=' + JSON.stringify(norm.map((l) => [l.text, l.color])) + '；当前页=' + JSON.stringify(m.links.filter((l) => l.cur === 'page').map((l) => [l.text, l.color])), handoff: 'Task 3' });
    A('RB6-V', m.mast.color === INK, { page: file, width: '1280px/四页均已访问', step: '报头"自然选择号"在访问后仍为深色文字', detail: m.mast.color, handoff: 'Task 3' });
  }
  await shot('index-1280-visited-history');
}


/* ---------- 像素级配色回归：屏幕实际颜色，不受 visited 隐私伪装影响 ---------- */
async function clipColor(sel) {
  const b = await js('(() => { const e = document.querySelector(' + JSON.stringify(sel) + '); if (!e) return JSON.stringify({miss:1}); const r = e.getBoundingClientRect(); return JSON.stringify({x: Math.round(r.x), y: Math.round(r.y), width: Math.max(6, Math.round(r.width)), height: Math.max(6, Math.round(r.height)), text: e.textContent.trim()}); })()');
  if (b.miss) return { miss: true, verdict: '缺失' };
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: b.x, y: b.y, width: b.width, height: b.height, scale: 1 } });
  if (!shot || !shot.data) return { err: '截图无数据', verdict: '未知' };
  const c = inkColorOf(pngDecode(Buffer.from(shot.data, 'base64')));
  c.text = b.text;
  return c;
}
async function visitedPixelPass() {
  for (let k = 0; k < 2; k++) for (const f of PAGES) { await openFile(f); await sleep(260); }
  for (const file of PAGES) {
    await openFile(file); await metrics(1280, 900);
    const idx = [];
    const links = await js('(() => JSON.stringify([].slice.call(document.querySelectorAll(".site-navigation__link")).map(a => ({ text: a.textContent, cur: a.getAttribute("aria-current") }))))()');
    links.forEach((l, i) => { if (!l.cur) idx.push(i + 1); });
    const timeline = [];
    let last = ''; let stable = 0;
    for (let k = 0; k < 12; k++) {
      await sleep(1800);
      const mast = await clipColor('.site-masthead__link');
      const cols = [];
      for (const i of idx) cols.push(await clipColor('#site-navigation li:nth-child(' + i + ') .site-navigation__link'));
      const sig = mast.verdict + '|' + cols.map((c) => c.verdict).join(',');
      timeline.push((k + 1) * 1.8 + 's: 报头=' + mast.verdict + ' 非当前链接=' + cols.map((c) => c.verdict).join(','));
      if (sig === last) { stable++; if (stable >= 2) break; } else { stable = 0; last = sig; }
    }
    const fin = timeline[timeline.length - 1];
    const mast = await clipColor('.site-masthead__link');
    const cols = [];
    for (const i of idx) cols.push(await clipColor('#site-navigation li:nth-child(' + i + ') .site-navigation__link'));
    A('RB6-PIX', mast.verdict === '深色(ink)', { page: file, width: '1280px/四页均已访问', step: '屏幕像素：报头"自然选择号"必须是深色文字（Task 3 纸媒基线），不得被 a:visited 重绘为暗红', detail: '实测 rgb(' + mast.rgb.join(',') + ') 距ink=' + mast.distInk + ' 距accent=' + mast.distAccent + ' → ' + mast.verdict + '；时间线 ' + timeline.slice(0, 6).join(' ; '), handoff: 'Task 3' });
    A('RB5-PIX', cols.every((c) => c.verdict === '深色(ink)'), { page: file, width: '1280px/四页均已访问', step: '屏幕像素：三个非当前页导航链接必须是深色（合同：普通链接为深色、当前链接为暗红）', detail: JSON.stringify(cols.map((c) => [c.text, 'rgb(' + c.rgb.join(',') + ')', c.verdict])) + '；时间线 ' + fin, handoff: 'Task 3' });
    await shot(file.replace('.html', '') + '-1280-visited-pixels');
  }
}

/* ---------- 视觉截图（纸媒风格人工比对，存于 Results/ 之外） ---------- */
async function visualPass() {
  for (const file of PAGES) {
    await openFile(file); await metrics(1280, 1200, 1);
    await shot(`${file.replace('.html', '')}-1280`);
    await metrics(769, 1000, 1);
    await shot(`${file.replace('.html', '')}-769`);
    await metrics(375, 1500, 1);
    await shot(`${file.replace('.html', '')}-375-closed`);
    await shot(`${file.replace('.html', '')}-375-full`, true);
  }
}

async function main() {
  const h0 = hashAll();
  fs.writeFileSync(path.join(HERE, 'baseline_hashes_before' + TAG + '.txt'), h0.list + '\n', 'utf8');
  await waitReady();
  const ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws open failed')); });
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.reject(new Error(JSON.stringify(d.error))) : p.resolve(d.result); return; }
    if (d.method) listeners.slice().forEach((f) => { try { f(d); } catch (e) { markNoise('LISTENER', String((e && e.message) || e)); } });
  };
  on((msg) => {
    if (msg.method === 'Page.frameNavigated' && !msg.params.frame.parentId) navCount++;
    if (msg.method === 'Runtime.exceptionThrown') { const e = msg.params.exceptionDetails; markNoise('EXCEPTION', (e.exception && e.exception.description) || e.text); }
    if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'warn', 'assert'].indexOf(msg.params.type) >= 0) markNoise('CONSOLE:' + msg.params.type, String((msg.params.args[0] && msg.params.args[0].value) ?? ''));
    if (msg.method === 'Log.entryAdded' && ['error', 'warning'].indexOf(msg.params.entry.level) >= 0) markNoise('LOG:' + msg.params.entry.level, `${msg.params.entry.source || ''}:${base(msg.params.entry.url || '')}:${msg.params.entry.text}`);
  });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');
  await send('DOM.enable');
  await send('CSS.enable');
  await send('Accessibility.enable');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  A('环境', 'rec', { page: 'Results/', width: '-', step: `验收环境：${ver['Browser']} · headless=new · file:// 直开 · profile=${base(PROFILE)}`, detail: '' });

  let net = [];
  await coldPass();
  if (want('load')) net = await loadPass();
  if (want('visited')) { await visitedPass(); await visitedTimingPass(); }
  if (want('nav')) await navMatrix();

  for (const file of PAGES) {
    if (ONLY && ONLY.indexOf(file) < 0) continue;
    tag = file;
    if (want('desktop')) for (const w of (process.env.QODER_WIDTHS || '769,1024,1280').split(',').map(Number)) await desktopChecks(file, w);
    if (want('mobile')) for (const w of (process.env.QODER_WIDTHS_M || '375,768').split(',').map(Number)) await mobileChecks(file, w);
    if (want('tap')) await tapFocus(file);
    if (want('tri')) await triState(file);
    if (want('interact')) await interactions(file);
    if (want('cross')) await crossBreak(file);
    if (want('zoom')) await zoom200(file);
    if (want('degrade')) await degrade(file);
    if (want('content')) await content(file);
  }
  if (want('visited-pixel')) await visitedPixelPass();
  if (want('visual')) await visualPass();

  A('RA3', noise.length === 0, { page: '四页全程', width: '全部宽度/状态/操作', step: '控制台 0 错误 0 警告（含未捕获异常与浏览器日志，探针自身不使用 console）', detail: [...new Set(noise)].slice(0, 8).join(' || '), handoff: 'Task 9/3/8' });
  try { await send('Emulation.clearDeviceMetricsOverride'); } catch {}

  const h1 = hashAll();
  fs.writeFileSync(path.join(HERE, 'baseline_hashes_after' + TAG + '.txt'), h1.list + '\n', 'utf8');
  A('RO', h0.list === h1.list && h0.entries === h1.entries && h0.entries === 'index.html,news-commentary.html,news-feature.html,news-message.html,script.js,styles.css', { page: 'Results/ + Materials/', width: '-', step: '回归前后六个交付文件与三份素材的 SHA-256/字节数/清单逐项一致，Results/ 仍恰为六个文件', detail: `前=[${h0.entries}] 后=[${h1.entries}] 哈希表=${h0.list === h1.list ? '一致' : '不一致'}`, handoff: 'Task 11 驱动自身' });
  fs.writeFileSync(path.join(HERE, 'resources' + TAG + '.txt'), [...new Set(net)].join('\n') + '\n', 'utf8');

  const bad = rows.filter((r) => r.status === 'FAIL');
  const lines = rows.map((r) => `[${r.id}] [${r.status}] ${r.page} — ${r.width} — ${r.step}${r.status === 'FAIL' ? ' — 期望vs实际: ' + r.detail + ' — 移交: ' + r.handoff : (r.detail ? ' — ' + r.detail : '')}`);
  fs.writeFileSync(path.join(HERE, 'regression_lines' + TAG + '.txt'), lines.join('\n') + `\n\n合计 ${rows.length} 条：PASS ${rows.length - bad.length} / FAIL ${bad.length}\n`, 'utf8');
  fs.writeFileSync(path.join(HERE, 'results' + TAG + '.json'), JSON.stringify({ env: ver['Browser'], chrome: CHROME, rows, noise: [...new Set(noise)], hashBefore: h0.list, hashAfter: h1.list }, null, 1), 'utf8');
  process.stdout.write(bad.map((r) => `FAIL ${r.id} [${r.page} @${r.width}] ${r.step} :: ${r.detail} -> ${r.handoff}`).join('\n') + `\n\n== Task 11 CDP 回归：${rows.length - bad.length} PASS / ${bad.length} FAIL / 共 ${rows.length} 条 ==\n`);
  try { await send('Browser.close'); } catch {}
  try { ws.close(); } catch {}
  try { proc.kill(); } catch {}
  process.exit(bad.length ? 1 : 0);
}

main().catch(async (e) => {
  A('驱动异常', false, { step: 'main()', detail: (e && (e.stack || e.message)) || String(e), handoff: 'Task 11 驱动自身' });
  fs.writeFileSync(path.join(HERE, 'regression_lines' + TAG + '.txt'), rows.map((r) => `[${r.id}] [${r.status}] ${r.page} — ${r.width} — ${r.step} — ${r.detail}`).join('\n') + '\n', 'utf8');
  process.stdout.write('DRIVER ERROR\n' + ((e && (e.stack || e.message)) || e) + '\n');
  try { proc.kill(); } catch {}
  process.exit(2);
});
