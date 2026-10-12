/* Task 9 authoritative behavioural regression over real CDP-driven rendering.
 *
 * --dump-dom headless never delivered mediaquery `change` events to the iframe, so the
 * >=769px reset could not be judged there. This driver uses a real renderer plus
 * Emulation.setDeviceMetricsOverride for genuine viewport transitions, Input.* for trusted
 * clicks and key events, and Emulation.setScriptExecutionDisabled for the no-JS case.
 * It also records every Runtime.exceptionThrown / consoleAPI message. QA-only.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const RESULTS = process.env.QODER_RESULTS_DIR ? path.resolve(process.env.QODER_RESULTS_DIR)
  : path.join(ROOT, 'Results');
const MUT = path.join(HERE, 'mutants');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = Number(process.env.QODER_CDP_PORT || 9333);
const PAGES = ['index.html', 'news-message.html', 'news-feature.html', 'news-commentary.html'];

const checks = [];
const consoleEvents = [];
function R(name, pass, detail) {
  checks.push({ name, pass: !!pass, detail: detail === undefined ? '' : String(detail).slice(0, 240) });
  if (!pass) process.stdout.write(`  FAIL ${name} :: ${detail ?? ''}\n`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const url = (p) => 'file:///' + encodeURI(p.split(path.sep).join('/').replace(/^([A-Za-z]:)/, '$1')).replace(/#/g, '%23');

const proc = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.join(HERE, '.cdp' + PORT)}`,
  '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-dev-shm-usage',
  '--allow-file-access-from-files', '--window-size=1300,900', 'about:blank',
], { stdio: 'ignore' });

let ws, mid = 0;
const pending = new Map();
const listeners = [];
function send(method, params = {}, sessionId) {
  const id = ++mid;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}
async function waitReady() {
  for (let i = 0; i < 120; i++) {
    try {
      const l = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (l.ok) return l.json();
    } catch {}
    await sleep(250);
  }
  throw new Error('chrome did not start');
}
function on(fn) { listeners.push(fn); }
function ev(expr, label) {
  return send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) R(`探针表达式异常 ${label || expr.slice(0, 40)}`, false, r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result ? r.result.value : undefined;
  });
}
const STATE = `(() => {
  const t = document.getElementById('nav-toggle'), n = document.getElementById('site-navigation');
  const ae = document.activeElement, cs = (e) => e ? getComputedStyle(e).display : null;
  return { htmlClass: document.documentElement.className,
    js: document.documentElement.classList.contains('js'),
    nojs: document.documentElement.classList.contains('no-js'),
    open: n ? n.classList.contains('is-open') : null,
    aria: t ? t.getAttribute('aria-expanded') : null,
    navDisp: cs(n), togDisp: cs(t),
    links: [].slice.call(document.querySelectorAll('.site-navigation__link')).map(a => ({
      text: a.textContent, href: a.getAttribute('href'), reachable: a.offsetParent !== null, rect: a.getBoundingClientRect().width })),
    active: ae ? (ae.id || ae.className || ae.tagName) : 'null',
    activeIsToggle: ae === t, activeInNav: n ? n.contains(ae) : false,
    innerWidth: innerWidth, mqDesktop: matchMedia('(min-width: 769px)').matches,
    mqMobile: matchMedia('(max-width: 768px)').matches, scrollY: scrollY, path: location.pathname.split('/').pop() };
})()`;

async function state() { return ev(STATE); }
async function openPage(u) {
  const loadSeen = new Promise((res) => {
    const h = (m) => { if (m.method === 'Page.loadEventFired') { const i = listeners.indexOf(h); if (i >= 0) listeners.splice(i, 1); res(); } };
    on(h); setTimeout(res, 15000);
  });
  await send('Page.navigate', { url: u });
  await loadSeen;
  await sleep(400);
}
async function metrics(w, h = 900) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await sleep(120);
}
async function clickEl(sel) {
  const b = await ev(`(() => { const e = document.querySelector('${sel}'); const r = e.getBoundingClientRect(); return JSON.stringify({x: r.x, y: r.y, w: r.width, h: r.height}); })()`);
  const o = JSON.parse(b);
  if (o.w <= 0 || o.h <= 0) { R(`可点击区域存在：${sel}`, false, JSON.stringify(o)); return false; }
  const x = o.x + o.w / 2, y = o.y + o.h / 2;
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(120);
  return true;
}
async function key(k, code, vk, text) {
  await send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, text });
  // Enter activates on keydown, Space on keyup: the two must not land in one input batch.
  await sleep(80);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  await sleep(120);
}
const enter = () => key('Enter', 'Enter', 13, '\r');
const space = () => key(' ', 'Space', 32, ' ');
const escape = () => key('Escape', 'Escape', 27);
const tab = () => key('Tab', 'Tab', 9);

let navCount = 0;
async function ensureOpen(tag) {
  for (let i = 0; i < 2 && !(await state()).open; i++) { await clickEl('#nav-toggle'); await sleep(120); }
  const s = await state();
  R(`${tag || ''} 前置状态=打开`, s.open === true, s.open);
}
async function ensureClosed(tag) {
  for (let i = 0; i < 2 && (await state()).open; i++) { await clickEl('#nav-toggle'); await sleep(120); }
  const s = await state();
  R(`${tag || ''} 前置状态=关闭`, s.open === false, s.open);
}

async function testPage(file) {
  const s0 = await state();
  R(`${file} T1 首屏 · html 为 js 且无 no-js`, s0.js && !s0.nojs, s0.htmlClass);
  R(`${file} T1 首屏 · 移动视口按钮可见`, s0.togDisp !== 'none', s0.togDisp);
  R(`${file} T1 首屏 · 导航折叠且 aria=false 且无 is-open`,
    s0.open === false && s0.aria === 'false' && s0.navDisp === 'none', `open=${s0.open} aria=${s0.aria} disp=${s0.navDisp}`);
  R(`${file} T1 首屏 · 五个链接不在 Tab 顺序中`,
    s0.links.length === 5 && s0.links.every((l) => !l.reachable && l.rect === 0), JSON.stringify(s0.links));

  await clickEl('#nav-toggle');
  let s = await state();
  R(`${file} T2 真实点击 · is-open 且 aria=true 且导航显示`,
    s.open === true && s.aria === 'true' && s.navDisp === 'block', `open=${s.open} aria=${s.aria} disp=${s.navDisp}`);
  R(`${file} T2 真实点击 · 五个链接已渲染可 Tab`, s.links.every((l) => l.reachable && l.rect > 0), JSON.stringify(s.links.map((l) => l.rect)));
  R(`${file} T2 真实点击 · 焦点仍在按钮而非被移入菜单`, s.activeIsToggle || !s.activeInNav, `active=${s.active} inNav=${s.activeInNav}`);

  await tab();
  s = await state();
  R(`${file} T2b 打开后按 Tab · 焦点进入第一个链接`, s.active === 'site-navigation__link' || /link/.test(s.active), s.active);
  const firstHref = (s.links[0] || {}).text;
  await escape();
  s = await state();
  R(`${file} T5 打开态在链接上按 Esc · 关闭且焦点返回按钮`,
    s.open === false && s.aria === 'false' && s.activeIsToggle, `open=${s.open} aria=${s.aria} active=${s.active}`);
  await clickEl('#nav-toggle');
  s = await state();
  R(`${file} T2c 再次点击可重复打开`, s.open === true && s.aria === 'true', `open=${s.open} aria=${s.aria}`);
  await clickEl('#nav-toggle');
  s = await state();
  R(`${file} T3 第二次点击 · 关闭且状态同步`, s.open === false && s.aria === 'false' && s.navDisp === 'none', `open=${s.open} aria=${s.aria} disp=${s.navDisp}`);

  /* Enter / Space through trusted key events: exactly one flip, no double trigger.
     Fresh load, so sequential focus navigation starts at the document top. */
  await openPage(url(path.join(RESULTS, file)));
  await metrics(375);
  for (let k = 0; k < 4 && !(await state()).activeIsToggle; k++) await tab();
  s = await state();
  R(`${file} T4 前置 · 纯键盘 Tab 从文档首可到达菜单按钮`, s.activeIsToggle, s.active);
  await ev(`window.__clicks = 0; document.getElementById('nav-toggle').addEventListener('click', () => window.__clicks++);`);
  let c = await ev('window.__clicks');
  await enter();
  s = await state();
  let c2 = await ev('window.__clicks');
  R(`${file} T4 Enter · 一次按键恰好一次 click 激活（无双触发）`, c2 - c === 1 && s.open === true && s.aria === 'true', `clicks=${c2 - c} open=${s.open} aria=${s.aria}`);
  c = c2;
  await enter();
  s = await state();
  c2 = await ev('window.__clicks');
  R(`${file} T4 Enter · 再按恰好切换为关闭（无双触发）`, c2 - c === 1 && s.open === false && s.aria === 'false', `clicks=${c2 - c} open=${s.open} aria=${s.aria}`);
  c = c2;
  await space();
  s = await state();
  c2 = await ev('window.__clicks');
  R(`${file} T4 Space · 不双触发（click<=1）且 is-open 与 aria 同步`,
    c2 - c <= 1 && s.open === (s.aria === 'true') && (c2 - c === 0 || (s.open === true && s.aria === 'true')),
    `clicks=${c2 - c} open=${s.open} aria=${s.aria}（Space 正向激活证据见 space_probe.mjs）`);
  c = c2;
  await space();
  s = await state();
  c2 = await ev('window.__clicks');
  R(`${file} T4 Space · 连续按键仍不双触发且状态同步`,
    c2 - c <= 1 && s.open === (s.aria === 'true') && (c2 - c === 0 || (s.open === false && s.aria === 'false')),
    `clicks=${c2 - c} open=${s.open} aria=${s.aria}`);

  /* link click closes and really navigates (a self-link still fires a navigation) */
  await ensureOpen(`${file} T6 点击链接`);
  navCount = 0;
  await clickEl('#site-navigation li:nth-child(3) a');
  await sleep(700);
  const navs = navCount;
  s = await state();
  R(`${file} T6 点击导航链接 · 真实发生导航且落地页无展开残留`,
    navs > 0 && s.open === false && s.aria === 'false',
    `frameNavigated=${navs} open=${s.open} aria=${s.aria} path=${s.path}`);
  await openPage(url(path.join(RESULTS, file)));
  await metrics(375);

  /* outside click keeps menu open (frozen decision) */
  await ensureOpen(`${file} T6c 点击菜单外`);
  const y = 700;
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 180, y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 180, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 180, y, button: 'left', clickCount: 1 });
  await sleep(150);
  s = await state();
  R(`${file} T6c 点击正文（菜单外） · 菜单保持展开（已定决策）`,
    s.open === true && s.aria === 'true', `open=${s.open} aria=${s.aria}`);

  /* Esc while closed must not steal focus or scroll */
  await ensureClosed(`${file} T5b 关闭态 Esc`);
  s = await state();
  R(`${file} T5b 关闭态 Esc · 状态不变且无副作用`, s.open === false && s.aria === 'false', `open=${s.open}`);
  await escape();
  const sA = await state();
  await metrics(375, 1300);
  await escape();
  const sB = await state();
  R(`${file} T5b 关闭态 Esc · 不移动焦点不滚动`, sA.active === sB.active && sA.scrollY === sB.scrollY, `${sA.active}/${sB.active} y=${sA.scrollY}/${sB.scrollY}`);
  await metrics(375);

  /* cross breakpoint: 375 -> 1000 -> 375 with real viewport transitions */
  await ensureOpen(`${file} T7 跨断点`);
  s = await state();
  R(`${file} T7 前置 · 375px 下菜单为打开`, s.open === true && s.mqMobile && !s.mqDesktop, `open=${s.open} mq=${s.mqDesktop}`);
  let fired = await ev(`(() => { window.__mq = []; const m = matchMedia('(min-width: 769px)');
    m.addEventListener('change', e => window.__mq.push('addEventListener:' + e.matches));
    if (m.addListener) m.addListener(e => window.__mq.push('addListener:' + e.matches));
    return 'armed'; })()`);
  await metrics(1000);
  await sleep(400);
  s = await state();
  const mqLog = await ev('JSON.stringify(window.__mq || [])');
  R(`${file} T7 对照 · 本渲染环境会派发 mediaquery change 事件`,
    mqLog.includes('true'), `独立监听记录=${mqLog}`);
  R(`${file} T7 进入 1000px · is-open 清除且 aria 重置 false`,
    s.open === false && s.aria === 'false' && s.mqDesktop === true, `open=${s.open} aria=${s.aria} mqDesktop=${s.mqDesktop}`);
  R(`${file} T7 进入 1000px · 按钮隐藏且导航常显（Task 8 集成）`,
    s.togDisp === 'none' && s.navDisp !== 'none', `tog=${s.togDisp} nav=${s.navDisp}`);
  R(`${file} T7 进入 1000px · 五个链接横向常显可 Tab`, s.links.every((l) => l.reachable), JSON.stringify(s.links.map((l) => l.rect)));
  await metrics(375);
  await sleep(400);
  s = await state();
  R(`${file} T7 缩回 375px · 关闭态且不复用旧展开状态`, s.open === false && s.aria === 'false', `open=${s.open} aria=${s.aria}`);
  await clickEl('#nav-toggle');
  s = await state();
  R(`${file} T7 缩回后仍可正常打开`, s.open === true && s.aria === 'true', `open=${s.open}`);
  await clickEl('#nav-toggle');

  /* 768 -> 769 boundary exactly */
  await metrics(768);
  await ensureClosed(`${file} T7b 768px`);
  await clickEl('#nav-toggle');
  s = await state();
  R(`${file} T7b 768px · 仍为移动态且可打开`, s.mqMobile === true && s.mqDesktop === false && s.open === true, `mqM=${s.mqMobile} mqD=${s.mqDesktop} open=${s.open}`);
  await metrics(769);
  await sleep(350);
  s = await state();
  R(`${file} T7b 769px · 恰好触发重置`, s.mqDesktop === true && s.open === false && s.aria === 'false', `mqD=${s.mqDesktop} open=${s.open} aria=${s.aria}`);
  await metrics(375);
}

async function testNoJs(file) {
  await send('Emulation.setScriptExecutionDisabled', { value: true });
  await openPage(url(path.join(RESULTS, file)));
  await metrics(375);
  const s = await state();
  R(`${file} T8 禁用 JS · html 保持 no-js`, s.nojs === true && s.js === false, s.htmlClass);
  R(`${file} T8 禁用 JS · 按钮不可见`, s.togDisp === 'none', s.togDisp);
  R(`${file} T8 禁用 JS · 五项导航纵向常显`, s.navDisp === 'block', s.navDisp);
  R(`${file} T8 禁用 JS · 五个链接渲染且可聚焦`, s.links.length === 5 && s.links.every((l) => l.reachable && l.rect > 0), JSON.stringify(s.links.map((l) => l.rect)));
  R(`${file} T8 禁用 JS · aria-expanded 保持源码 false`, s.aria === 'false', s.aria);
  await metrics(1000);
  const d = await state();
  R(`${file} T8 禁用 JS · 桌面宽度导航仍常显`, d.navDisp !== 'none' && d.nojs, `${d.navDisp} ${d.htmlClass}`);
  await metrics(375);
  navCount = 0;
  await clickEl('#site-navigation li:nth-child(2) a');
  await sleep(700);
  R(`${file} T8 禁用 JS · 链接仍可点击并真实导航`, navCount > 0, `frameNavigated=${navCount}`);
  await send('Emulation.setScriptExecutionDisabled', { value: false });
}

async function testMutant(file) {
  const errs = consoleEvents.length;
  await openPage(url(path.join(MUT, file)));
  await metrics(375);
  const s = await state();
  R(`${file} T10 接口缺失 · no-js 仍切换为 js`, s.js === true && s.nojs === false, s.htmlClass);
  R(`${file} T10 接口缺失 · 目标接口确实缺失`, (file === 'm_no_toggle.html' ? s.togDisp === null : s.navDisp === null), `tog=${s.togDisp} nav=${s.navDisp}`);
  R(`${file} T10 接口缺失 · 未抛出未捕获异常`, consoleEvents.length === errs, JSON.stringify(consoleEvents.slice(errs)));
  const after = await ev(`(() => {
    const d = document;
    let b = d.getElementById('nav-toggle');
    if (!b) { b = d.createElement('button'); b.id = 'nav-toggle'; b.type='button'; b.setAttribute('aria-expanded','false'); d.body.appendChild(b); }
    let n = d.getElementById('site-navigation');
    if (!n) { n = d.createElement('nav'); n.id='site-navigation'; n.className='site-navigation'; n.innerHTML='<ul class="site-navigation__list"><li class="site-navigation__item"><a class="site-navigation__link" href="#x">L</a></li></ul>'; d.body.appendChild(n); }
    b.click(); b.click(); n.querySelector('.site-navigation__link').click();
    d.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return JSON.stringify({ open: n.classList.contains('is-open'), aria: b.getAttribute('aria-expanded') });
  })()`);
  const o = JSON.parse(after);
  R(`${file} T10 接口缺失 · 后补接口上无任何状态写入`, o.open === false && o.aria === 'false', after);
}

async function main() {
  fs.mkdirSync(MUT, { recursive: true });
  for (const a of ['script.js', 'styles.css']) fs.copyFileSync(path.join(RESULTS, a), path.join(MUT, a));
  const html = fs.readFileSync(path.join(RESULTS, 'index.html'), 'utf8');
  const noBtn = html.replace(/\n\s*<button\b[\s\S]*?<\/button>\n/, '\n');
  const noNav = html.replace(/\n\s*<nav\b[\s\S]*?<\/nav>\n/, '\n');
  if (noBtn.includes('id="nav-toggle"') || noNav.includes('id="site-navigation"')) throw new Error('mutant build failed');
  fs.writeFileSync(path.join(MUT, 'm_no_toggle.html'), noBtn);
  fs.writeFileSync(path.join(MUT, 'm_no_nav.html'), noNav);

  await waitReady();
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = list.find((t) => t.type === 'page');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.reject(new Error(JSON.stringify(d.error))) : p.resolve(d.result); return; }
    if (d.method) listeners.slice().forEach((f) => f(d));
  };
  on((m) => {
    if (m.method === 'Page.frameNavigated' && !m.params.frame.parentId) navCount++;
    if (m.method === 'Runtime.exceptionThrown') {
      const e = m.params.exceptionDetails;
      consoleEvents.push('EXCEPTION: ' + (e.exception?.description || e.text));
    }
    if (m.method === 'Runtime.consoleAPICalled') consoleEvents.push('CONSOLE:' + m.params.type + ': ' + (m.params.args[0]?.value ?? ''));
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') consoleEvents.push('LOG: ' + m.params.entry.text);
  });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });

  for (const p of PAGES) {
    await metrics(375);
    await openPage(url(path.join(RESULTS, p)));
    await metrics(375);
    await testPage(p);
  }
  for (const p of PAGES) await testNoJs(p);
  await metrics(375);
  for (const m of ['m_no_toggle.html', 'm_no_nav.html']) await testMutant(m);

  const uniq = [...new Set(consoleEvents)];
  R('全站控制台 · 四页 + 禁用 JS + 变异体 0 未捕获异常/0 输出', uniq.length === 0, uniq.slice(0, 6).join(' || '));

  const bad = checks.filter((c) => !c.pass);
  const text = checks.map((c) => `${c.pass ? 'PASS' : 'FAIL'}  ${c.name}` + (c.detail && !c.pass ? `  :: ${c.detail}` : '')).join('\n')
    + `\n\nCDP: ${checks.length - bad.length}/${checks.length} pass, ${bad.length} failures\n`;
  fs.writeFileSync(path.join(HERE, 'cdp_report.txt'), text, 'utf8');
  process.stdout.write(text);
  try { await send('Browser.close'); } catch {}
  ws.close();
  proc.kill();
  process.exit(bad.length ? 1 : 0);
}
main().catch(async (e) => {
  R('驱动异常', false, e && (e.stack || e.message));
  fs.writeFileSync(path.join(HERE, 'cdp_report.txt'), checks.map((c) => `${c.pass ? 'PASS' : 'FAIL'}  ${c.name}  ${c.detail}`).join('\n'), 'utf8');
  process.stdout.write(checks.filter((c) => !c.pass).map((c) => `FAIL ${c.name} :: ${c.detail}`).join('\n') + '\nDRIVER ERROR: ' + (e && (e.stack || e)) + '\n');
  try { proc.kill(); } catch {}
  process.exit(2);
});
