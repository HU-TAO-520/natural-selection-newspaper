/* Task 19 — 同域 iframe 视口探针（窄视口几何的唯一可信量具）
 *
 * 为什么需要它：本机无头 Chrome 顶层窗口有约 500px 下限，`--window-size=375` 实际得到
 * 500px 内容并左裁剪，会把"裁剪"伪装成"横向溢出"。375／768 档的溢出与堆叠判据必须在
 * 一个布局视口恰好等于目标宽度的容器里量——同域 iframe 满足这个条件（媒体查询、
 * scrollWidth/clientWidth 都按 iframe 自身视口计算），前提是 Chrome 以
 * --allow-file-access-from-files 启动。
 *
 * 本文件同时是**量具母本**：MEASURE_BODY 这一段表达式既在顶层文档里求值（CDP 覆盖视口时），
 * 也在 iframe 的 contentWindow 里求值（窄视口时），两条链读的是同一份代码，
 * 不存在"iframe 版判据比顶层版松"的分叉。
 *
 * 单独运行：node _qa_task19/probe_page19.mjs —— 对七页 × 窄视口做一次取证，写 probe_page19.json。
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import fileURL from 'node:url';

export const HERE = path.dirname(fileURL.fileURLToPath(import.meta.url));
import { REPORT_DIR } from './contract19.mjs';

/* 被测文档内求值的几何/文本探针。返回可结构化克隆的普通对象（不返回 DOM 节点）。 */
export const MEASURE_BODY = `(function () {
  var de = document.documentElement, body = document.body;
  function q(s) { try { return document.querySelector(s); } catch (e) { return null; } }
  function qa(s) { try { return [].slice.call(document.querySelectorAll(s)); } catch (e) { return []; } }
  function R(e) { if (!e) return null; var r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right }; }
  function C(e) { return e ? getComputedStyle(e) : null; }
  function txt(e) { return e ? e.textContent : null; }
  function linesOf(e) { if (!e) return 0; var r = document.createRange(); r.selectNodeContents(e); return [].slice.call(r.getClientRects()).filter(function (x) { return x.width > 0.5; }).length; }
  function clipAnc(e) { var bad = [], p = e ? e.parentElement : null; while (p) { var s = C(p); if (s.overflow !== 'visible' || s.overflowX !== 'visible' || s.overflowY !== 'visible') bad.push(String(p.className) || p.tagName); p = p.parentElement; } return bad; }
  function box(e) { if (!e) return null; var r = e.getBoundingClientRect(), s = C(e); return { text: txt(e), href: e.getAttribute ? e.getAttribute('href') : null, w: r.width, h: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right, rightGap: de.clientWidth - r.right, lines: linesOf(e), sw: e.scrollWidth, cw: e.clientWidth, disp: s.display, fd: s.flexDirection, order: s.order, ws: s.whiteSpace, ow: s.overflowWrap, wb: s.wordBreak, ta: s.textAlign, ti: s.textIndent, color: s.color, fw: s.fontWeight, fs: s.fontSize, lh: s.lineHeight, bt: s.borderTopWidth + ' ' + s.borderTopStyle + ' ' + s.borderTopColor, bb: s.borderBottomWidth + ' ' + s.borderBottomStyle + ' ' + s.borderBottomColor, shown: e.offsetParent !== null && e.getClientRects().length > 0, nrects: e.getClientRects().length, clip: clipAnc(e), attrs: [].slice.call(e.attributes).map(function (a) { return a.name; }) }; }
  var nav = q('#site-navigation'), tog = q('#nav-toggle'), navList = q('.site-navigation__list');
  var abody = q('.article__body'), date = q('.article__date'), dateline = q('.dateline');
  var paras = qa('.article__body > p');
  var entryList = q('.entry-list'), homeLatest = q('.home-latest');
  var a = document.activeElement;
  var scrollAreas = qa('*').filter(function (e) { var s = C(e); return /auto|scroll/.test(s.overflowX) || /auto|scroll/.test(s.overflowY); }).map(function (e) { return (String(e.className) || e.tagName) + ':' + C(e).overflowX + '/' + C(e).overflowY; });
  var fixedWide = qa('*').filter(function (e) { var s = C(e); return /px$/.test(s.width) && parseFloat(s.width) > de.clientWidth; }).map(function (e) { return (String(e.className) || e.tagName) + '=' + C(e).width; });
  var flagged = [];
  if (nav) { nav.querySelectorAll('*').forEach(function (e) { for (const at of e.attributes) { if (['tabindex', 'hidden', 'aria-hidden', 'inert'].indexOf(at.name) >= 0) flagged.push((String(e.className) || e.tagName) + '@' + at.name); } }); }
  function items(sel) {
    return qa(sel).map(function (li) {
      var link = li.querySelector('a');
      var t = li.querySelector('span:nth-of-type(1)'), d = li.querySelector('span:nth-of-type(2)');
      var s = link ? C(link) : null;
      return {
        item: box(li), link: box(link), title: box(t), date: box(d),
        href: link ? link.getAttribute('href') : null,
        linkColor: s ? s.color : null, linkDisplay: s ? s.display : null,
        linkFlexDir: s ? s.flexDirection : null, linkOrder: s ? s.order : null,
        nestedSpans: link ? [].slice.call(link.querySelectorAll(':scope > span')).length : 0,
        nestedTags: link ? [].slice.call(link.querySelectorAll('*')).map(function (e) { return e.tagName.toLowerCase(); }) : [],
      };
    });
  }
  return {
    url: location.href, title: document.title, file: (location.pathname.split('/').pop() || ''),
    innerWidth: innerWidth, clientWidth: de.clientWidth, scrollW: de.scrollWidth, bodyScrollW: body ? body.scrollWidth : null,
    innerHeight: innerHeight, docH: de.scrollHeight, dpr: devicePixelRatio, scrollX: scrollX, scrollY: scrollY,
    htmlClass: de.className, htmlClasses: [].slice.call(de.classList), rootFont: C(de).fontSize,
    mqM: matchMedia('(max-width: 768px)').matches, mqD: matchMedia('(min-width: 769px)').matches,
    bodyBg: C(body).backgroundColor, bodyColor: C(body).color, bodyFF: C(body).fontFamily,
    sheets: [].slice.call(document.styleSheets).map(function (s) { var n = 0; try { n = s.cssRules.length; } catch (e) { n = -1; } return { href: s.href, rules: n, disabled: s.disabled }; }),
    resources: performance.getEntriesByType('resource').map(function (r) { return r.name; }),
    navCount: qa('nav').length, h1s: qa('h1').length,
    scrollAreas: scrollAreas, fixedWide: fixedWide, navFlagged: flagged,
    hrefs: [].slice.call(document.querySelectorAll('a')).map(function (e) { return { text: txt(e), href: e.getAttribute('href') }; }),
    header: box(q('.site-header')), headerInner: box(q('.site-header__inner')),
    main: box(q('.main-content')), mainTabindex: q('.main-content') ? q('.main-content').getAttribute('tabindex') : null,
    mainFocus: q('.main-content') ? { outline: C(q('.main-content')).outlineWidth + ' ' + C(q('.main-content')).outlineStyle + ' ' + C(q('.main-content')).outlineColor } : null,
    mast: box(q('.site-masthead__link')), mastBox: box(q('.site-masthead')),
    nav: nav ? { disp: C(nav).display, open: nav.classList.contains('is-open'), rect: R(nav) } : null,
    navList: navList ? { disp: C(navList).display, dir: C(navList).flexDirection, gap: C(navList).gap } : null,
    tog: box(tog), togAria: tog ? tog.getAttribute('aria-expanded') : null, togCtrls: tog ? tog.getAttribute('aria-controls') : null,
    links: qa('.site-navigation__link').map(function (e) { return box(e); }),
    linkCur: qa('.site-navigation__link').map(function (e) { return e.getAttribute('aria-current'); }),
    skip: box(q('.skip-link')), skipHref: q('.skip-link') ? q('.skip-link').getAttribute('href') : null,
    pageTitle: box(q('.page-title')), h1Text: txt(q('h1')),
    artType: box(q('.article__type')), artTitle: box(q('.article__header h1')), byline: box(q('.article__byline')),
    abody: box(abody), paras: paras.map(function (p) { return p.textContent; }),
    pIndent: paras.length ? C(paras[0]).textIndent : null, pTop: paras.length ? R(paras[0]).top : null,
    date: box(date),
    dateline: dateline ? { text: txt(dateline), disp: C(dateline).display, fw: C(dateline).fontWeight, top: R(dateline).top, firstP: dateline.closest('p') === paras[0] } : null,
    secs: qa('.home-section').map(function (e) { return box(e); }),
    secTitles: qa('.home-section__title').map(function (e) { return txt(e); }),
    secTexts: qa('.home-section__text').map(function (e) { return txt(e); }),
    entryList: entryList ? { container: box(entryList), maxw: C(entryList).maxWidth, items: items('.entry-list__item') } : null,
    homeLatest: homeLatest ? { container: box(homeLatest), maxw: C(homeLatest).maxWidth, items: items('.home-latest__item'), title: txt(q('.home-latest__title')) } : null,
    tagTally: (function () { var o = {}; qa('main *').forEach(function (e) { var t = e.tagName.toLowerCase(); o[t] = (o[t] || 0) + 1; }); return o; })(),
    mainText: q('.main-content') ? txt(q('.main-content')) : null,
    active: a ? (a.id || (a.className ? String(a.className).trim().split(/\\s+/)[0] : a.tagName)) : 'null',
    activeTag: a ? a.tagName : 'null',
  };
})()`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function probeUrl({ dir = '../Results', target, w, h = 1400, state = 'closed' }) {
  const q = new URLSearchParams({ t: target, w: String(w), h: String(h), state, dir });
  return 'file:///' + encodeURI(path.join(HERE, 'measure19.html').split(path.sep).join('/')) + '?' + q.toString();
}

export function shotUrl({ dir = '../Results', target, w, h = 1400, state = 'closed' }) {
  const q = new URLSearchParams({ t: target, w: String(w), h: String(h), state, dir });
  return 'file:///' + encodeURI(path.join(HERE, 'shot19.html').split(path.sep).join('/')) + '?' + q.toString();
}

/* 在宿主页里等同域 iframe 就绪，再把表达式交给 iframe 的 contentWindow 求值。
 * 就绪信号不能只看 load 事件：无 src 的 iframe 会先为初始 about:blank 派发一次 load，
 * 只读那个标志会得到"段落数为 0"的假缺陷。这里同时要求文档里真的解析出了壳节点。 */
export async function openProbe(ctx, opts) {
  const u = probeUrl(opts);
  try { await ctx.ev('window.__ready = false; window.__error = ""; document.title = "booting"; 1'); } catch {}
  await ctx.openPage(u);
  const ready = '(() => { try { var f = document.getElementById("frame"); var d = f && f.contentDocument; if (!d) return false; if (d.location.href === "about:blank") return false; if (d.readyState !== "complete") return false; if (!d.querySelector(".site-navigation__link")) return false; return true; } catch (e) { return false; } })()';
  let isReady = false;
  for (let i = 0; i < 120; i++) {
    if (await ctx.ev(ready)) { isReady = true; break; }
    await sleep(120);
  }
  if (!isReady) throw new Error('同域 iframe 探针在 14s 内未加载出被测文档：' + opts.target + ' @' + opts.w + 'px');
  const err = await ctx.ev('String(window.__error || "")');
  if (err) throw new Error('探针宿主报错：' + err);
  const hostTitle = await ctx.ev('document.title');
  const cw = await ctx.ev('(function(){var f=document.getElementById("frame");return f&&f.contentDocument?f.contentDocument.documentElement.clientWidth:-1;})()');
  return { hostTitle, iframeClientWidth: cw, url: u };
}

export async function probeMeasure(ctx) {
  const v = await ctx.js('window.__probe(' + JSON.stringify(MEASURE_BODY) + ')');
  if (!v || v.ok !== true) throw new Error('iframe 探针求值失败：' + JSON.stringify(v && v.error));
  const val = v.value;
  return typeof val === 'string' ? JSON.parse(val) : val;
}

export async function probeRect(ctx, sel) {
  return await ctx.js('window.__probe(' + JSON.stringify(
    '(function(){var e=document.querySelector(' + JSON.stringify(sel) + ');if(!e)return null;var r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,top:r.top,bottom:r.bottom,left:r.left,right:r.right};})()'
  ) + ')').then((v) => (v && v.ok ? (typeof v.value === 'string' ? JSON.parse(v.value) : v.value) : null));
}

/* ---------- 独立取证运行 ---------- */
if (process.argv[1] && path.resolve(process.argv[1]).endsWith('probe_page19.mjs')) {
  const ROOT = path.resolve(HERE, '..', '..');
  const DIR = process.env.QODER_RESULTS_REL || '../Results';
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'deploy', 'manifest.json'), 'utf8'));
  const pages = manifest.pages.filter((p) => /\.html$/.test(p.path)).map((p) => p.path).sort();
  const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const PORT = Number(process.env.QODER_CDP_PORT || 9361);
  const PROFILE = path.join(REPORT_DIR, '.cdp' + PORT + '-' + Date.now());
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE,
    '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-dev-shm-usage', '--hide-scrollbars',
    '--allow-file-access-from-files', '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
  let ws, mid = 0; const pending = new Map(); const listeners = [];
  const send = (method, params = {}) => new Promise((res, rej) => { const id = ++mid; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
  const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); return r.result ? r.result.value : undefined; };
  const ctx = { send, ev, js: async (e) => { const v = await ev(e); return typeof v === 'string' ? JSON.parse(v) : v; }, openPage: async (u) => { const w = waitForLoad(); await send('Page.navigate', { url: u }); return await w; } };
  function waitForLoad() { return new Promise((res) => { const h = (m) => { if (m.method === 'Page.loadEventFired') { const i = listeners.indexOf(h); if (i >= 0) listeners.splice(i, 1); res(true); } }; listeners.push(h); setTimeout(() => { const i = listeners.indexOf(h); if (i >= 0) listeners.splice(i, 1); res(false); }, 9000); }); }
  const out = [];
  for (let i = 0; i < 120; i++) { try { const l = await fetch('http://127.0.0.1:' + PORT + '/json/list'); if (l.ok) break; } catch {} await sleep(250); }
  const tabList = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
  ws = new WebSocket(tabList.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws 连接失败')); });
  ws.onmessage = (m) => {
    let d; try { d = JSON.parse(m.data); } catch { return; }
    if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); if (d.error) p.rej(new Error(JSON.stringify(d.error))); else p.res(d.result); return; }
    if (d.method) listeners.slice().forEach((f) => { try { f(d); } catch {} });
  };
  await send('Runtime.enable'); await send('Page.enable');
  for (const p of pages) {
    for (const w of [375, 640, 768]) {
      const info = await openProbe(ctx, { target: p, w, h: 1600, dir: DIR });
      const m = await probeMeasure(ctx);
      out.push({
        page: p, width: w, hostTitle: info.hostTitle, iframeClientWidth: info.iframeClientWidth,
        innerWidth: m.innerWidth, clientWidth: m.clientWidth, scrollW: m.scrollW, bodyScrollW: m.bodyScrollW,
        overflow: m.scrollW > m.clientWidth, mqM: m.mqM, mqD: m.mqD,
        entryItems: m.entryList ? m.entryList.items.length : null,
        stacked: m.entryList && m.entryList.items.length ? m.entryList.items.map((i) => i.title.top < i.date.top) : null,
      });
      process.stdout.write(JSON.stringify(out[out.length - 1]) + '\n');
    }
  }
  fs.writeFileSync(path.join(REPORT_DIR, 'probe_page19.json'), JSON.stringify(out, null, 1), 'utf8');
  try { await send('Browser.close'); } catch {}
  try { proc.kill(); } catch {}
  process.exit(0);
}
