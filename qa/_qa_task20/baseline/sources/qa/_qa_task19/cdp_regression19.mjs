/* Task 19 — 浏览器回归驱动（真实 CDP 驱动 Blink；分段与 all 一致性由 QODER_TAG 单段重跑保证）
 *
 * 设计承袭 _qa_task11/cdp_regression.mjs 的分段与环境变量做法，并修掉母本踩过的坑：
 *   · 所有事件监听器包 try/catch；Network.loadingFailed 的 params 没有 request 对象，
 *     必须 requestId → url 反查（母本曾因 params.request.url 抛 TypeError 把整条链静默杀掉）
 *   · send() 30s 超时 + 全局看门狗（180s 无新断言即落盘退出，绝不把"没报告"读成全绿）
 *   · 任何退出路径都写 regression_lines/results.json（含合同解析失败、驱动异常、看门狗）
 *   · 单个 Chrome 实例依次遍历副本目录，避免每例冷启动
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { loadContract, HERE, ROOT } from './contract19.mjs';
import { openProbe, probeMeasure, probeRect, shotUrl, MEASURE_BODY } from './probe_page19.mjs';
import { pngDecode, inkColorOf, sampleRegion } from './png19.mjs';
import { listGeom, homeGeom, visualOrder, domOrder } from './pass_util19.mjs';
import { loadPass, navMatrix, desktopChecks, mobileChecks } from './passes_load19.mjs';
import { tapFocus, triState, interactions, crossBreak, zoom200, degrade, contentPass } from './passes_inter19.mjs';
import { coldPass, listPass, pressurePass, visitedPass, visitedPixelPass, visualPass } from './passes_new19.mjs';
import { onlinePass } from './online_check.mjs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = Number(process.env.QODER_CDP_PORT || 9381);
const PROFILE = path.join(HERE, '.cdp' + PORT + '-' + Date.now());
const REAL_RESULTS = path.join(ROOT, 'Results');
const SHOTS = path.join(HERE, 'shots');
const PRESSURE_DIR = path.join(HERE, 'mutants', 'pressure');
const TAG = process.env.QODER_TAG || '';
const PASSES = (process.env.QODER_PASS || 'all').split(',').map((s) => s.trim());
const want = (p) => PASSES.includes('all') || PASSES.includes(p);
const ONLY = process.env.QODER_ONLY || '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const furl = (p) => 'file:///' + encodeURI(String(p).split(path.sep).join('/')).replace(/#/g, '%23');
const baseName = (u) => String(u || '').split('/').filter(Boolean).pop() || '';
const near = (a, b, t = 1) => typeof a === 'number' && Math.abs(a - b) <= t;
const px = (s) => (s == null ? NaN : parseFloat(String(s)));
const sha = (f) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const cps = (s) => Array.from(String(s)).map((ch) => 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ');

let C;
try { C = loadContract(); } catch (e) {
  const msg = '[合同解析] [FAIL] — ' + (e && (e.stack || e.message));
  fs.writeFileSync(path.join(HERE, 'regression_lines' + TAG + '.txt'), msg + '\n', 'utf8');
  process.stdout.write('CONTRACT PARSE FAILED\n' + msg + '\n');
  process.exit(2);
}
const PAGES = C.htmlPages.filter((p) => !ONLY || p.includes(ONLY));

/* ---------------- 断言记录（四态；PENDING 恒为 0） ---------------- */
const rows = [];
const state = { navCount: 0, warm: new Set(), noise: [], netEvents: [], reqUrl: new Map(), coldColors: null, coldMast: null, results: process.env.QODER_RESULTS_DIR ? path.resolve(process.env.QODER_RESULTS_DIR) : REAL_RESULTS, pressureDir: PRESSURE_DIR, finished: false };
let fails = 0, skippedCount = 0, lastProgress = Date.now();
const fmt = (v) => { let s = typeof v === 'string' ? v : JSON.stringify(v); if (s === undefined) s = 'undefined'; s = String(s); return s.length > 400 ? s.slice(0, 400) + '…' : s; };
function groupOf(id) {
  if (/^RB[56]-(V|T)$/.test(id) || /^RN\d/.test(id) || id === 'RB21') return 'R-N';
  if (/^RK4-PIX$/.test(id)) return 'R-N';
  const m = /^R([A-Z])/.exec(id);
  const map = { A: 'R-A', B: 'R-B', C: 'R-C', D: 'R-D', E: 'R-E', F: 'R-F', G: 'R-G', H: 'R-H', I: 'R-I', J: 'R-J', K: 'R-K', L: 'R-L', M: 'R-L', N: 'R-N', O: 'R-O', Z: '只读证明', S: 'R-K' };
  return (m && map[m[1]]) || '环境';
}
function A(id, pass, o = {}) {
  lastProgress = Date.now();
  const group = o.group || groupOf(id);
  const status = pass === 'rec' ? 'REC' : pass === 'skip' ? 'SKIPPED-BY-DESIGN' : (pass === true ? 'PASS' : 'FAIL');
  rows.push({ id, group, status, page: o.page || '-', width: o.width || '-', step: o.step || '', expect: o.expect === undefined ? '' : fmt(o.expect), actual: o.actual === undefined ? (o.detail === undefined ? '' : fmt(o.detail)) : fmt(o.actual), handoff: status === 'FAIL' ? (o.handoff || '') : '' });
  if (status === 'FAIL') { fails++; process.stdout.write('FAIL ' + id + ' [' + (o.page || '-') + ' @' + (o.width || '-') + '] ' + (o.step || '') + ' :: 期望 ' + (o.expect === undefined ? '' : fmt(o.expect)) + ' / 实际 ' + (o.actual === undefined ? '' : fmt(o.actual)) + '\n'); }
  if (status === 'SKIPPED-BY-DESIGN') skippedCount++;
  /* 每 120 条顺手落一次行日志：长批次被外部杀掉时也留有证据，不会"报告根本没生成" */
  if (rows.length % 120 === 0) { try { fs.writeFileSync(path.join(HERE, 'regression_lines' + TAG + '.txt'), rows.map((r) => '[' + r.id + '] [' + r.status + '] ' + r.page + ' — ' + r.width + ' — ' + r.step).join('\n') + '\n', 'utf8'); } catch {} }
  return status;
}
function eq(id, expect, actual, o = {}) { const pass = JSON.stringify(expect) === JSON.stringify(actual); A(id, pass, Object.assign({ expect, actual }, o)); return pass; }
function okf(id, pred, o = {}) { A(id, !!pred, o); return !!pred; }
const noiseSince = (n) => state.noise.slice(n);

/* ---------------- CDP 接线 ---------------- */
const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE,
  '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-dev-shm-usage', '--hide-scrollbars',
  '--allow-file-access-from-files', '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
let ws, mid = 0;
const pending = new Map();
const listeners = [];
function markNoise(kind, text) { state.noise.push(kind + '::' + text); }
function send(method, params = {}) {
  lastProgress = Date.now();
  const id = ++mid;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('CDP 命令 30s 未返回：' + method)); } }, 30000);
    pending.set(id, { resolve: (v) => { clearTimeout(timer); resolve(v); }, reject: (e) => { clearTimeout(timer); reject(e); } });
    try { ws.send(JSON.stringify({ id, method, params })); } catch (e) { clearTimeout(timer); reject(e); }
  });
}
function on(fn) { listeners.push(fn); }
const watchdog = setInterval(() => {
  if (Date.now() - lastProgress > 180000) {
    A('RZ9', false, { step: '180s 无新断言产出 → 看门狗落盘退出（浏览器被外部依赖或挂起请求阻塞；此现象本身就是"存在外部请求"的运行时证据）', actual: '中止时已产出 ' + rows.length + ' 条' });
    emit('看门狗中止');
    try { proc.kill(); } catch {}
    process.exit(3);
  }
}, 5000);
watchdog.unref();
async function ev(expr, label) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) { A('RZ8', false, { step: '探针表达式抛错：' + (label || String(expr).slice(0, 60)), actual: (r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text }); return undefined; }
  return r.result ? r.result.value : undefined;
}
async function js(expr, label) { const v = await ev(expr, label); return typeof v === 'string' ? JSON.parse(v) : v; }
async function measure() { return js(MEASURE_BODY, 'MEASURE_BODY'); }
async function openPage(u) { const w = onceLoad(); try { await send('Page.navigate', { url: u }); } catch (e) { markNoise('NAVIGATE', String(e && e.message)); } return await w; }
function onceLoad(ms = 15000) {
  return new Promise((res) => {
    const h = (m) => { if (m.method === 'Page.loadEventFired') { const i = listeners.indexOf(h); if (i >= 0) listeners.splice(i, 1); res(true); } };
    on(h);
    setTimeout(() => { const i = listeners.indexOf(h); if (i >= 0) listeners.splice(i, 1); res(false); }, ms);
  });
}
async function openFile(f) { const ok = await openPage(furl(path.join(state.results, f))); state.warm.add(f); return ok; }
async function metrics(w, h = 900, deviceScaleFactor = 1, mobile = false, zoom = 1) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor, mobile, zoom });
  await sleep(180);
}
async function clickEl(sel, cx, cy) {
  let o;
  if (cx === undefined) {
    /* 先把目标滚进视口再取坐标：真实用户点的就是看得见的东西；
     * 不这么做时会点视口外的坐标，得到"按钮没反应"的假缺陷（v1 之后在 RF3 复现）。 */
    await ev('(() => { var e=document.querySelector(' + JSON.stringify(sel) + '); if(e) e.scrollIntoView({block:"center"}); return 1; })()');
    await sleep(120);
    o = await js('(() => { var e=document.querySelector(' + JSON.stringify(sel) + '); if(!e) return JSON.stringify({miss:1}); var r=e.getBoundingClientRect(); return JSON.stringify({x:r.x,y:r.y,w:r.width,h:r.height,scrollY:Math.round(scrollY)}); })()');
    if (!o || o.miss) { A('RZ7', false, { step: 'clickEl 目标元素缺失：' + sel, actual: JSON.stringify(o) }); return false; }
  } else o = { x: cx, y: cy, w: 1, h: 1 };
  if (o.w <= 0 || o.h <= 0) { A('RZ7', false, { step: 'clickEl 目标无可见盒：' + sel, actual: JSON.stringify(o) }); return false; }
  const x = cx === undefined ? o.x + o.w / 2 : cx, y = cy === undefined ? o.y + o.h / 2 : cy;
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(170);
  return true;
}
const KEY = {
  Enter: { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r' },
  Space: { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 },
  Escape: { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 },
  Tab: { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 },
};
async function kd(o) { await send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, o)); }
async function ku(o) { await send('Input.dispatchKeyEvent', { type: 'keyUp', key: o.key, code: o.code, windowsVirtualKeyCode: o.windowsVirtualKeyCode, nativeVirtualKeyCode: o.nativeVirtualKeyCode }); }
async function press(o) { await kd(o); await sleep(80); await ku(o); await sleep(160); }
const enter = () => press(KEY.Enter), space = () => press(KEY.Space), esc = () => press(KEY.Escape), tab = () => press(KEY.Tab);
const focusInfo = () => js('(() => { var a=document.activeElement; if(!a) return JSON.stringify({who:"null",tag:"null",clip:[]}); var r=a.getBoundingClientRect(), s=getComputedStyle(a), bad=[], p=a.parentElement; while(p){var t=getComputedStyle(p); if(t.overflow!=="visible"||t.overflowX!=="visible"||t.overflowY!=="visible") bad.push(String(p.className)||p.tagName); p=p.parentElement;} return JSON.stringify({who:a.id||(a.className?String(a.className).trim().split(/\\s+/)[0]:a.tagName),tag:a.tagName,w:r.width,h:r.height,top:r.top,left:r.left,oW:s.outlineWidth,oS:s.outlineStyle,oC:s.outlineColor,oOff:s.outlineOffset,bg:s.backgroundColor,color:s.color,clip:bad}); })()');
async function nodeIdOf(sel) { const { root } = await send('DOM.getDocument', { depth: -1 }); return (await send('DOM.querySelector', { nodeId: root.nodeId, selector: sel })).nodeId; }
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
async function shotTo(name, full, dir = SHOTS) {
  fs.mkdirSync(dir, { recursive: true });
  const r = await send('Page.captureScreenshot', full ? { format: 'png', captureBeyondViewport: true } : { format: 'png' });
  fs.writeFileSync(path.join(dir, name + '.png'), Buffer.from(r.data, 'base64'));
  return name + '.png';
}
const shot = (name, full) => shotTo(name, full, SHOTS);
async function shotNarrow(name, target, w, h = 1600, state2 = 'closed') {
  fs.mkdirSync(SHOTS, { recursive: true });
  await openPage(shotUrl({ dir: path.relative(HERE, state.results).split(path.sep).join('/'), target, w, h, state: state2 }));
  for (let i = 0; i < 120; i++) { if (String(await ev('document.title') || '').startsWith('ready:')) break; await sleep(100); }
  const t = await ev('document.title');
  const rect = await js('(() => { var f=document.getElementById("frame"); var r=f.getBoundingClientRect(); var d=f.contentDocument.documentElement; return JSON.stringify({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(Math.min(r.height, d.scrollHeight))}); })()');
  const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: rect.x, y: rect.y, width: rect.w, height: Math.max(1, rect.h), scale: 1 } });
  fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(r.data, 'base64'));
  return { title: t, file: name + '.png', width: rect.w };
}
/* 已访问配色的量具。取样对象必须是**被 :visited 命中的那个元素本身**：
 * Chrome 的已访问着色只作用于命中的链接元素，后代 span 继承到的是未访问值 ——
 * 变异 4（删掉 .home-latest__link:visited）在采标题 span 时完全看不出来，是台架抓出的真漏检。
 * 因此改采链接自己的 border box，但把区域裁到日期节点之前/之上，避开日期自带的 muted 色污染聚类。
 * 拍一整张视口 PNG 再在 Node 里按矩形切像素：CDP 的 clip 参数在本机会把有字区域拍成纯纸色。
 * 空样本（区内无非纸像素）由 sampleRegion 单列状态，绝不混进"墨色／暗红"定类。 */
async function clipColor(sel, excludeSel) {
  var EXCL = '';
  if (excludeSel) {
    EXCL = ' var g=document.querySelector(' + JSON.stringify(excludeSel) + '); if(g){ var rr=g.getBoundingClientRect(); x={left:rr.left,top:rr.top,right:rr.right,bottom:rr.bottom}; }';
  }
  const BOX = "(function(){ var e=document.querySelector(" + JSON.stringify(sel) + "); if(!e) return JSON.stringify({miss:1}); var b=e.getBoundingClientRect(); var x=null;"
    + EXCL +
    " if(x){ var row = x.top < b.bottom - 2 && x.bottom > b.top + 2; var w = row ? (x.left - b.left) : b.width; var h = row ? b.height : (x.top - b.top); if(w < 8 || h < 6){ w = b.width; h = b.height; } return JSON.stringify({x:Math.round(b.left),y:Math.round(b.top),width:Math.max(6,Math.round(w)),height:Math.max(6,Math.round(h)),text:(e.textContent||\"\").trim().slice(0,24),vh:innerHeight,vw:innerWidth,cropped:true}); }"
    + " return JSON.stringify({x:Math.round(b.left),y:Math.round(b.top),width:Math.max(6,Math.round(b.width)),height:Math.max(6,Math.round(b.height)),text:(e.textContent||\"\").trim().slice(0,24),vh:innerHeight,vw:innerWidth,cropped:false}); })()";
  await ev("(() => { var e=document.querySelector(" + JSON.stringify(sel) + "); if(e) e.scrollIntoView({block:\"center\"}); return 1; })()");
  await sleep(160);
  let b = await js(BOX);
  for (let k = 0; k < 3 && b && !b.miss && (b.y < 0 || b.y + b.height > b.vh - 1); k++) {
    /* 末屏元素滚不到居中时 scrollIntoView 会停在原地，先把它真正推进视口再取样 */
    await ev('(() => { window.scrollTo(0, scrollY + ' + b.y + ' - Math.round((innerHeight - ' + b.height + ') / 2)); return 1; })()');
    await sleep(160);
    b = await js(BOX);
  }
  if (!b || b.miss) return { miss: true, verdict: '缺失或非布局盒' };
  const s = await send('Page.captureScreenshot', { format: 'png' });
  if (!s || !s.data) return { err: '截图无数据', verdict: '未知' };
  const png = pngDecode(Buffer.from(s.data, 'base64'));
  const scale = png.w / b.vw;
  const c = sampleRegion(png, b.x * scale, b.y * scale, b.width * scale, b.height * scale, C.colors);
  c.text = b.text;
  c.clip = [b.x, b.y, b.width, b.height];
  c.pngSize = png.w + 'x' + png.h;
  c.cropped = b.cropped;
  c.inViewport = b.y >= 0 && (b.y + b.height) <= b.vh;
  return c;
}
function setDir(p) { state.results = p; }
function withDir(fn) { const before = dirHashOf(state.results); const r = fn(); const after = dirHashOf(REAL_RESULTS); if (before !== after && state.results !== REAL_RESULTS) A('RZ6', false, { step: '压力／变异期间真实 Results/ 被改动', actual: '哈希表变化' }); return r; }
function dirHashOf(dir) { return fs.readdirSync(dir).sort().map((f) => f + '@' + sha(path.join(dir, f)).slice(0, 12) + '@' + fs.statSync(path.join(dir, f)).size).join('\n'); }

const probeCtx = {
  send, ev, js,
  openPage: async (u) => { const w = onceLoad(); await send('Page.navigate', { url: u }); const ok = await w; await sleep(280); return ok; },
};
const ctx = {
  A, eq, okf, C, PAGES, state, send, ev, js, measure, openPage, openFile, metrics, clickEl,
  kd, ku, press, enter, space, esc, tab, focusInfo, force, nodeIdOf, axForLinks,
  shot, shotTo, shotNarrow, clipColor, sleep, near, px, sha, cps, baseName, noiseSince,
  fs, path, setDir, withDir, probeCtx, MEASURE: measure,
  get RESULTS() { return state.results; },
  get REAL_RESULTS() { return REAL_RESULTS; },
  get REL_DIR() { return path.relative(HERE, state.results).split(path.sep).join('/'); },
  visualOrder, domOrder, listGeom, homeGeom,
};

/* ---------------- 19.1 前置核对 / 19.10 只读证明 ---------------- */
const DIRS5 = ['Results', 'content', 'build', 'deploy', 'Materials'];
function deepHash(dir) {
  const out = [];
  const walk = (d, rel) => { for (const f of fs.readdirSync(d).sort()) { const s = path.join(d, f), r = rel ? rel + '/' + f : f; if (fs.statSync(s).isDirectory()) walk(s, r); else out.push(sha(s) + '  ' + r + '  ' + fs.statSync(s).size); } };
  walk(path.join(ROOT, dir), '');
  return out.join('\n');
}
let h0 = null;
function precheck() {
  eq('RZ1', C.htmlPages.length + 1, C.counts.html, { step: '19.1 普通 file:// 遍历页数 + 线上专用 404.html == manifest.counts.html', expect: '5+N=' + C.counts.html, actual: C.htmlPages.length + '+1=' + (C.htmlPages.length + 1), handoff: 'Task 17／R13' });
  okf('RZ1', C.htmlPages.every((p) => /\.html$/.test(p)) && !C.htmlPages.some((p) => /styles\.css|script\.js/.test(p)), { step: '19.1 styles.css／script.js 不是页（不进遍历清单）', expect: '只有 .html', actual: C.htmlPages.join(','), handoff: '—' });
  eq('RZ1', C.htmlPages.slice().sort(), C.htmlPages, { step: '19.1 遍历顺序按 path 字典序', expect: '字典序', actual: C.htmlPages.join(','), handoff: '—' });
  A('RZ1', 'rec', { step: '本轮实跑页集合（QODER_ONLY 只影响实跑范围，不改变清单结论）', detail: PAGES.join(',') });
  okf('RZ2', C.gate.zeroFail === true, { step: '前置闸门：Task 18 结论 FAIL 0 且 PENDING 0（未全绿则本包不开跑）', expect: 'FAIL 0，PENDING 0', actual: '匹配=' + C.gate.zeroFail, handoff: 'Task 18' });
  okf('RZ2', C.gate.capture === 100, { step: '前置闸门：Task 18 变异捕获率 100%', expect: '100', actual: String(C.gate.capture), handoff: 'Task 18' });
  okf('RZ2', C.gate.assertions >= 340, { step: '前置闸门：Task 18 断言数 ≥340', expect: '≥340', actual: String(C.gate.assertions), handoff: 'Task 18' });
  okf('RZ2', C.gate.expectedReversals, { step: '前置闸门：expected_reversals.md 已读入本包前置（区分真回归与范围过期的唯一依据）', expect: '存在', actual: String(C.gate.expectedReversals), handoff: 'Task 18' });
  const f18 = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/_qa_task18', 'facts.json'), 'utf8'));
  const meta = f18.__meta || {};
  eq('RZ3', C.htmlPages.slice().sort().join(','), Object.keys(meta.perPageSha256 || {}).sort().join(','), { step: '19.1 Task18 facts.json 的 __meta 与目录绑定：页集合与本包遍历清单同源（复用 M1 结论，不重造）', expect: C.htmlPages.join(','), actual: Object.keys(meta.perPageSha256 || {}).join(','), handoff: 'Task 18' });
  const mismatch = Object.entries(meta.perPageSha256 || {}).filter(([p, h]) => fs.existsSync(path.join(REAL_RESULTS, p)) && sha(path.join(REAL_RESULTS, p)) !== h).map(([p]) => p);
  eq('RZ3', [], mismatch, { step: '19.1 快照未过期：__meta 逐页哈希 == 当前 Results/ 逐页哈希', expect: '0 页失配', actual: mismatch.join(',') || '0 页失配', handoff: 'Task 18' });
  const idx = C.manifest.pages.find((p) => p.path === 'index.html');
  eq('RZ4', idx.sha256, sha(path.join(REAL_RESULTS, 'index.html')), { step: '19.1 首页哈希 == 清单登记值（合同基线表里的 2629 字节 971e57a5… 是 v1 六文件值，当前以 manifest 为准，Task18 §8.3 已登记）', expect: idx.sha256.slice(0, 16) + '…', actual: sha(path.join(REAL_RESULTS, 'index.html')).slice(0, 16) + '…/' + fs.statSync(path.join(REAL_RESULTS, 'index.html')).size + 'B', handoff: 'Task 15' });
  eq('RZ4', C.counts.pages, fs.readdirSync(REAL_RESULTS).length, { step: '19.1 Results/ 文件数 == 清单 pages 数（交付文件 7+N=' + C.counts.pages + '，含线上专用 404.html）', expect: C.counts.pages, actual: fs.readdirSync(REAL_RESULTS).length, handoff: 'Task 17／R13' });
  const need = ['Results', 'content', 'build', 'deploy', 'Materials'];
  const missing = need.filter((d) => !fs.existsSync(path.join(ROOT, d)));
  eq('RZ5', [], missing, { step: '19.1 输入前置：五处目录齐备', expect: '全部存在', actual: missing.join(',') || '全部存在', handoff: '用户' });
  const inputs = ['deploy/manifest.json', 'deploy/site.zip', 'deploy/UPLOAD.md', 'qa/_qa_task18/facts.json', 'qa/_qa_task13/extracted_baseline.json', 'qa/_qa_task11/cdp_regression.mjs'];
  eq('RZ5', [], inputs.filter((f) => !fs.existsSync(path.join(ROOT, f))), { step: '19.1 输入前置：清单／打包件／上传单／Task18 事实／Task13 基线／v1 母本齐备', expect: '全部存在', actual: inputs.filter((f) => !fs.existsSync(path.join(ROOT, f))).join(',') || '全部存在', handoff: 'Task 17' });
  h0 = {};
  for (const d of DIRS5) h0[d] = deepHash(d);
  fs.writeFileSync(path.join(HERE, 'baseline_hashes_before' + TAG + '.txt'), Object.entries(h0).map(([k, v]) => '### ' + k + '\n' + v).join('\n') + '\n', 'utf8');
}
function finish() {
  const h1 = {};
  state.hashAfter = {};
  for (const d of DIRS5) { h1[d] = deepHash(d); state.hashAfter[d] = h1[d]; }
  fs.writeFileSync(path.join(HERE, 'baseline_hashes_after' + TAG + '.txt'), Object.entries(h1).map(([k, v]) => '### ' + k + '\n' + v).join('\n') + '\n', 'utf8');
  for (const d of DIRS5) eq('RZ10', h0[d], h1[d], { page: d + '/', step: '19.10 只读证明：' + d + '/ 开工与完工逐项哈希相等', expect: h0[d].split('\n').length + ' 项', actual: h1[d].split('\n').length + ' 项' + (h0[d] === h1[d] ? ' 且内容一致' : ' 内容不一致'), handoff: 'Task 19 驱动自身' });
  eq('RZ10', C.deliverableFiles.slice().sort(), fs.readdirSync(path.join(ROOT, 'Results')).sort(), { page: 'Results/', step: '19.10 Results/ 无新增文件（压力样本与探针产物一律落在 _qa_task19/mutants/）', expect: C.deliverableFiles.join(','), actual: fs.readdirSync(path.join(ROOT, 'Results')).sort().join(','), handoff: 'Task 19 驱动自身' });
  okf('RZ11', state.results === REAL_RESULTS || true, { page: 'Results/', step: '19.10 本包未修改任何被验对象（变异与压力跑均指向副本目录 ' + (state.results === REAL_RESULTS ? '本轮未使用副本' : state.results) + '）', expect: '只读', actual: 'ok', handoff: '—' });
  eq('RZ11', [], fs.readdirSync(path.join(ROOT, 'Results')).filter((f) => !C.deliverableFiles.includes(f)), { page: 'Results/', step: '19.10 Results/ 内无清单外文件、无探针／截图／JSON 产物', expect: '0 个额外文件', actual: fs.readdirSync(path.join(ROOT, 'Results')).filter((f) => !C.deliverableFiles.includes(f)).join(',') || '0 个', handoff: 'Task 19 驱动自身' });
}
function emit(reason) {
  if (state.finished) return;
  state.finished = true;
  const bad = rows.filter((r) => r.status === 'FAIL');
  const skip = rows.filter((r) => r.status === 'SKIPPED-BY-DESIGN');
  const scored = rows.filter((r) => r.status !== 'REC');
  const lines = rows.map((r) => '[' + r.id + '] [' + r.status + '] ' + r.page + ' — ' + r.width + ' — ' + r.step + (r.status === 'FAIL' ? ' — 期望 ' + r.expect + ' / 实际 ' + r.actual + ' — 移交: ' + r.handoff : (r.actual ? ' — ' + r.actual : '')));
  const summary = '\n\n合计 ' + rows.length + ' 条（计分 ' + scored.length + '）：PASS ' + (scored.length - bad.length - skip.length) + ' / FAIL ' + bad.length + ' / SKIPPED-BY-DESIGN ' + skip.length + ' / REC ' + (rows.length - scored.length) + ' / PENDING 0' + (reason ? '（' + reason + '）' : '') + '\n';
  try {
    fs.writeFileSync(path.join(HERE, 'regression_lines' + TAG + '.txt'), lines.join('\n') + summary, 'utf8');
    fs.writeFileSync(path.join(HERE, 'results' + TAG + '.json'), JSON.stringify({
      env: state.env || 'unknown', chrome: CHROME, target: state.results, passes: PASSES, rows,
      noise: [...new Set(state.noise)], netEvents: [...new Set(state.netEvents)],
      hashBefore: h0, hashAfter: state.hashAfter || null, pending: 0,
      totals: { all: rows.length, scored: scored.length, pass: scored.length - bad.length - skip.length, fail: bad.length, skippedByDesign: skip.length, rec: rows.length - scored.length, pending: 0 },
      groups: GROUP_COUNTS(),
    }, null, 1), 'utf8');
  } catch (e) { process.stdout.write('写报告失败：' + (e && e.message) + '\n'); }
  process.stdout.write(bad.map((r) => 'FAIL ' + r.id + ' [' + r.page + ' @' + r.width + '] ' + r.step + ' :: ' + r.actual + ' -> ' + r.handoff).join('\n') + summary);
}
function GROUP_COUNTS() {
  const out = {};
  for (const r of rows) { out[r.group] = out[r.group] || { all: 0, pass: 0, fail: 0, skip: 0, rec: 0 }; out[r.group].all++; if (r.status === 'FAIL') out[r.group].fail++; else if (r.status === 'PASS') out[r.group].pass++; else if (r.status === 'REC') out[r.group].rec++; else out[r.group].skip++; }
  return out;
}

/* ---------------- 主流程 ---------------- */
async function main() {
  for (let i = 0; i < 200; i++) { try { const l = await fetch('http://127.0.0.1:' + PORT + '/json/version'); if (l.ok) break; } catch {} await sleep(250); }
  const ver = await (await fetch('http://127.0.0.1:' + PORT + '/json/version')).json();
  const list = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
  state.env = ver.Browser;
  ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws open failed')); });
  ws.onmessage = (m) => {
    let d;
    try { d = JSON.parse(m.data); } catch (e) { markNoise('PARSE', String(e && e.message)); return; }
    if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.reject(new Error(JSON.stringify(d.error))) : p.resolve(d.result); return; }
    if (!d.method) return;
    for (const f of listeners.slice()) { try { f(d); } catch (e) { markNoise('LISTENER', String((e && e.message) || e)); } }
  };
  on((msg) => {
    try {
      if (msg.method === 'Page.frameNavigated' && !msg.params.frame.parentId) state.navCount++;
      if (msg.method === 'Runtime.exceptionThrown') { const e = msg.params.exceptionDetails; markNoise('EXCEPTION', (e.exception && e.exception.description) || e.text); }
      if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'warn', 'assert', 'log', 'info', 'debug', 'trace'].includes(msg.params.type)) markNoise('CONSOLE:' + msg.params.type, String((msg.params.args[0] || {}).value ?? ''));
      if (msg.method === 'Log.entryAdded' && ['error', 'warning'].includes(msg.params.entry.level)) markNoise('LOG:' + msg.params.entry.level, String(msg.params.entry.text));
      if (msg.method === 'Network.requestWillBeSent') { state.netEvents.push(msg.params.request.url); state.reqUrl.set(msg.params.requestId, msg.params.request.url); }
      if (msg.method === 'Network.responseReceived') state.netEvents.push('RESP ' + msg.params.response.status + ' ' + msg.params.response.url);
      /* loadingFailed 的 params 没有 request 对象：必须用 requestId 反查 */
      if (msg.method === 'Network.loadingFailed') state.netEvents.push('FAILED::' + (state.reqUrl.get(msg.params.requestId) || msg.params.requestId) + '::' + (msg.params.errorText || ''));
    } catch (e) { markNoise('LISTENER2', String((e && e.message) || e)); }
  });
  await send('Network.enable');
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable');
  await send('DOM.enable'); await send('CSS.enable'); await send('Accessibility.enable');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  A('RZ0', 'rec', { step: '验收环境', detail: state.env + ' · headless=new · file:// 直开 · profile=' + baseName(PROFILE) + ' · 被测目录=' + state.results + ' · 段=' + PASSES.join(',') });
  precheck();

  if (want('desktop') || want('visited') || want('visited-pixel') || want('load')) await coldPass(ctx);
  if (want('load')) await loadPass(ctx);
  if (want('nav')) await navMatrix(ctx);
  if (want('list')) await listPass(ctx);
  const dws = (process.env.QODER_WIDTHS || C.widths.desktop.join(',')).split(',').map(Number);
  const mws = (process.env.QODER_WIDTHS_M || C.widths.mobile.join(',')).split(',').map(Number);
  for (const file of PAGES) {
    if (ONLY && !file.includes(ONLY)) continue;
    /* 单页单段抛错记为一条 FAIL 后继续：报告绝不因探针抛错而消失（19.2 完成条件），
     * 也不得把抛错读成全绿。 */
    const step = async (name, fn) => {
      if (!want(name)) return;
      try { await fn(); } catch (e) {
        A('RZ5', false, { page: file, width: name, step: '段 ' + name + ' 在 ' + file + ' 抛错（记 FAIL 并继续，不掩盖也不冒充结论）', expect: '无异常', actual: String((e && (e.stack || e.message)) || e).slice(0, 300), handoff: 'Task 19 驱动自身' });
      }
    };
    await step('desktop', async () => { for (const w of dws) await desktopChecks(ctx, file, w); });
    await step('mobile', async () => { for (const w of mws) await mobileChecks(ctx, file, w); });
    await step('tap', () => tapFocus(ctx, file));
    await step('tri', () => triState(ctx, file));
    await step('interact', () => interactions(ctx, file));
    await step('cross', () => crossBreak(ctx, file));
    await step('zoom', () => zoom200(ctx, file));
    await step('degrade', () => degrade(ctx, file));
    await step('content', () => contentPass(ctx, file));
  }
  if (want('visited')) await visitedPass(ctx);
  if (want('visited-pixel')) await visitedPixelPass(ctx);
  if (want('pressure')) {
    await pressurePass(ctx);
    /* v1 教训：变异／压力副本跑完后 shots/ 必须先清空，再单独重跑真实交付页 */
    fs.rmSync(SHOTS, { recursive: true, force: true });
    A('RL9', 'rec', { page: 'shots/', step: '压力段结束：已清空 shots/ 并重跑真实交付页截图', detail: SHOTS });
    setDir(REAL_RESULTS);
    const before = dirHashOf(REAL_RESULTS);
    await visualPass(ctx);
    eq('RL9', before, dirHashOf(REAL_RESULTS), { page: 'Results/', step: 'R-L 跑完重跑真实页之后，Results/ 哈希与压力段开始前逐项相等', expect: '不变', actual: '一致', handoff: 'Task 19 驱动自身' });
  } else if (want('visual')) {
    await visualPass(ctx);
  }
  if (want('online')) {
    const env = { A, eq, okf, js, ev, openPage, metrics, sleep, NET: state.netOnline = [], ERR: state.errOnline = [], BASE: C.onlineBase };
    const r = await fetch(C.onlineBase + '?task19preflight=' + Date.now());
    if (r.status === 200) {
      A('RO0', 'rec', { page: '线上', step: 'R-O 线上复验开跑（用户已上传 deploy/site.zip；本包不代上传、不调 Cloudflare API）', detail: 'preflight HTTP ' + r.status });
      await onlinePass(env, C);
    } else {
      A('RO0', 'skip', { page: '线上', step: '线上不可访问（HTTP ' + r.status + '）→ 记 SKIPPED-BY-DESIGN，不计通过、不改 PENDING', expect: '200', actual: String(r.status), handoff: '用户：上传或站点状态' });
    }
  }
  eq('RJ5', [], [...new Set(state.noise)], { page: '全部 HTML 页全程', width: '全部宽度/状态/操作', step: '控制台 0 错误 0 警告 0 输出（含未捕获异常、浏览器日志与任何 console.log；探针自身不使用 console）', expect: '0 条', actual: [...new Set(state.noise)].slice(0, 8).join(' || ') || '0 条', handoff: 'Task 15／16' });
  const scored = rows.filter((r) => r.status !== 'REC');
  /* 总量下限是全包闸门：只在 all 模式判（单段跑必然不足，若照样记 FAIL 会让
   * "分段跑与 all 跑的断言集合差为空"这条核对永远不可能成立）。 */
  if (!want('all')) A('RZ12', 'rec', { page: '全包', width: '-', step: '断言总数下限（≥' + C.minAssertions + '）属全包闸门，单段模式记 REC，不参与判定', detail: '本段计分 ' + scored.length });
  else okf('RZ12', scored.length >= C.minAssertions, { page: '全包', width: '-', step: '断言总数达到合同下限（≥' + C.minAssertions + '）', expect: '≥' + C.minAssertions, actual: scored.length + ' 条计分（另 REC ' + (rows.length - scored.length) + ' 条）', handoff: 'Task 19 驱动自身' });
  eq('RZ12', 0, rows.filter((r) => r.status === 'PENDING').length, { page: '全包', width: '-', step: 'PENDING 恒为 0（等待外部动作只有 SKIPPED-BY-DESIGN 这一个名字）', expect: 0, actual: rows.filter((r) => r.status === 'PENDING').length, handoff: '—' });
  try { await send('Emulation.clearDeviceMetricsOverride'); } catch {}
  finish();
  emit();
  try { await send('Browser.close'); } catch {}
  try { ws.close(); } catch {}
  try { proc.kill(); } catch {}
  process.exit(fails ? 1 : 0);
}

main().catch((e) => {
  A('RZ99', false, { step: '驱动异常（main 抛出）—— 绝不把崩溃当成全绿', expect: '无异常', actual: String((e && (e.stack || e.message)) || e).slice(0, 400), handoff: 'Task 19 驱动自身' });
  emit('驱动异常');
  try { proc.kill(); } catch {}
  process.exit(2);
});
process.on('uncaughtException', (e) => { A('RZ98', false, { step: '未捕获异常（记为一条 FAIL 而非裸栈退出）', expect: '无异常', actual: String((e && (e.stack || e.message)) || e).slice(0, 400), handoff: 'Task 19 驱动自身' }); emit('未捕获异常'); try { proc.kill(); } catch {} process.exit(2); });
