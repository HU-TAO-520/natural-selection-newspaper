/* Task 18 — 带 __meta 的只读快照探针库（修 D1）
 * 复用 _qa_task10/probe_lib.mjs 的页内提取体，但出口重写：
 *   facts = { __meta: { resultsDir, generatedBy, pages, perPageSha256, perPageBytes }, <page>: {...} }
 * 关键点（D1 的正解）：每条 DOM 事实必须与"被探测文件的字节哈希"绑定，
 * 核验器据此判定快照是否过期；不绑定哈希的快照可以被旧文本冒充真值。
 * 本包另加归档结构（home-latest / entry-list / 全站 href / 全站 class）的提取体。
 * 零依赖：Node 标准库 + CDP + WebSocket。不写入被探测目录。
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
/* 复用 v1 探针的页内提取体（A–K 组语义的母本），只重写出口与补充归档层事实 */
import { EXTRACT } from '../_qa_task10/probe_lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
export { EXTRACT };

export const CHROME = process.env.QODER_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
export const GENERATED_BY = 'probe_task18';

/* 归档层补充提取体：最新区、列表区、全站 href、全站 class/id、main 内标签计数 */
export const EXTRACT18 = String.raw`(() => {
  const D = document;
  const txt = (n) => (n === undefined || n === null) ? null : n.textContent;
  const attrsOf = (el) => { const o = {}; for (const a of el.attributes) o[a.name] = a.value; return o; };
  const clsOf = (el) => (el.getAttribute('class') || '').split(/\s+/).filter(Boolean);
  const main = D.querySelector('main');

  const latest = D.querySelector('.home-latest');
  const latestItems = latest ? Array.from(latest.querySelectorAll('li')).map((li) => {
    const a = li.querySelector('a');
    const spans = a ? Array.from(a.querySelectorAll('span')) : [];
    return {
      tag: li.tagName.toLowerCase(), cls: clsOf(li), childTags: Array.from(li.children).map(c => c.tagName.toLowerCase()),
      linkTag: a ? a.tagName.toLowerCase() : null, linkCls: a ? clsOf(a) : null,
      href: a ? a.getAttribute('href') : null, linkText: a ? txt(a) : null,
      linkChildTags: a ? Array.from(a.children).map(c => c.tagName.toLowerCase() + '.' + clsOf(c).join(',')) : null,
      spans: spans.map(s => ({ cls: clsOf(s), text: txt(s), attrs: attrsOf(s) })),
      spanCount: spans.length, aCount: li.querySelectorAll('a').length,
    };
  }) : null;
  const homeLatest = latest ? {
    present: true, tag: latest.tagName.toLowerCase(), attrs: attrsOf(latest), cls: clsOf(latest),
    labelById: latest.getAttribute('aria-labelledby'),
    labelByIdResolvedCount: latest.getAttribute('aria-labelledby')
      ? D.querySelectorAll('#' + latest.getAttribute('aria-labelledby')).length : 0,
    labelByIdTargetTag: (() => { const id = latest.getAttribute('aria-labelledby'); const e = id ? D.getElementById(id) : null; return e ? e.tagName.toLowerCase() : null; })(),
    title: (() => { const h = latest.querySelector('h2'); return h ? { cls: clsOf(h), id: h.id, text: txt(h) } : null; })(),
    ulCount: latest.querySelectorAll('ul').length,
    liCount: latest.querySelectorAll('li').length,
    aCount: latest.querySelectorAll('a').length,
    spanCount: latest.querySelectorAll('span').length,
    navCountInside: latest.querySelectorAll('nav').length,
    sectionCountInside: latest.querySelectorAll('section').length,
    homeSectionClsInside: latest.querySelectorAll('.home-section').length,
    items: latestItems,
    html: latest.outerHTML,
  } : { present: false };

  const list = D.querySelector('.entry-list');
  const entryList = list ? {
    present: true, tag: list.tagName.toLowerCase(), cls: clsOf(list), attrs: attrsOf(list),
    isDirectChildOfMain: list.parentElement === main,
    itemCount: list.querySelectorAll('li').length,
    linkCount: list.querySelectorAll('a').length,
    spanCount: list.querySelectorAll('span').length,
    items: Array.from(list.querySelectorAll('li')).map((li) => {
      const a = li.querySelector('a');
      const t = a ? a.querySelector('.entry-list__title') : null;
      const dt = a ? a.querySelector('.entry-list__date') : null;
      return {
        tag: li.tagName.toLowerCase(), cls: clsOf(li),
        href: a ? a.getAttribute('href') : null, linkCls: a ? clsOf(a) : null,
        linkChildTags: a ? Array.from(a.children).map(c => c.tagName.toLowerCase() + '.' + clsOf(c).join(',')) : null,
        titleCls: t ? clsOf(t) : null, titleText: t ? txt(t) : null,
        datePresent: !!dt, dateCls: dt ? clsOf(dt) : null, dateText: dt ? txt(dt) : null,
        text: txt(li),
      };
    }),
    html: list.outerHTML,
  } : { present: false };

  const tally = {};
  if (main) for (const m of main.outerHTML.matchAll(/<([a-z][\w-]*)/g)) { const t = m[1]; tally[t] = (tally[t] || 0) + 1; }

  const hrefs = Array.from(D.querySelectorAll('[href]')).map(e => ({
    tag: e.tagName.toLowerCase(), cls: clsOf(e), href: e.getAttribute('href'),
    inNav: !!e.closest('nav'), inMain: !!(main && main.contains(e)), inSkip: e.classList.contains('skip-link'),
    text: txt(e),
  }));
  const srcHrefs = Array.from(D.querySelectorAll('[src]')).map(e => ({ tag: e.tagName.toLowerCase(), src: e.getAttribute('src') }));
  const classesAll = [];
  for (const e of D.querySelectorAll('[class]')) for (const c of clsOf(e)) if (!classesAll.includes(c)) classesAll.push(c);
  const tagsAll = {};
  for (const e of D.querySelectorAll('*')) { const t = e.tagName.toLowerCase(); tagsAll[t] = (tagsAll[t] || 0) + 1; }
  const dataAttrs = [];
  for (const e of D.querySelectorAll('*')) for (const a of e.attributes) if (/^(data-|datetime$|^on)/i.test(a.name)) dataAttrs.push(e.tagName.toLowerCase() + '@' + a.name);
  const dateNodes = Array.from(D.querySelectorAll('.entry-list__date,.home-latest__date')).map(e => ({ cls: clsOf(e), text: txt(e) }));
  const comments = [];
  const walk = (n) => { for (const c of n.childNodes) { if (c.nodeType === 8) comments.push(c.nodeValue); else if (c.childNodes) walk(c); } };
  walk(D.documentElement);

  return {
    file: location.pathname.split('/').pop(),
    homeLatest, entryList,
    mainTagTally: tally,
    mainChildSignature: main ? Array.from(main.children).map(c => c.tagName.toLowerCase() + (c.getAttribute('class') ? '.' + c.getAttribute('class') : '')).join(',') : null,
    hrefs, srcHrefs, classesAll: classesAll.sort(), tagsAll, dataAttrs, dateNodes,
    commentCount: comments.length, comments: comments.join('\u0001'),
    bodyText: txt(D.body),
    documentURI: document.documentURI,
  };
})()`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toUrl = (p) => 'file:///' + encodeURI(String(p).replace(/\\/g, '/')).replace(/#/g, '%23');
const shaLower = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

export async function openBrowser18(port) {
  const ud = path.join(HERE, '.cdp' + port);
  fs.rmSync(ud, { recursive: true, force: true });
  const proc = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${ud}`,
    '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage',
    '--allow-file-access-from-files', '--window-size=1300,900', 'about:blank',
  ], { stdio: 'ignore' });
  let ws, mid = 0, loadCount = 0;
  const pending = new Map();
  for (let i = 0; i < 200; i++) {
    try { const l = await fetch(`http://127.0.0.1:${port}/json/version`); if (l.ok) break; } catch (e) { /* 等待启动 */ }
    await sleep(200);
    if (i === 199) { try { proc.kill(); } catch (e) {} throw new Error('chrome 未启动'); }
  }
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = list.find((t) => t.type === 'page');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (msg) => {
    const p = JSON.parse(msg.data);
    if (p.id && pending.has(p.id)) { const q = pending.get(p.id); pending.delete(p.id); p.error ? q.reject(new Error(p.error.message)) : q.resolve(p.result); }
    else if (p.method === 'Page.loadEventFired') loadCount++;
  };
  const send = (method, params) => new Promise((resolve, reject) => {
    const id = ++mid; pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });
  await send('Runtime.enable');
  await send('Page.enable');
  return {
    /* 禁用 requestAnimationFrame（v1 教训：--virtual-time-budget 下可能永不触发），改为 load 事件 + 固定等待 */
    async snapOne(resultsDir, page) {
      const before = loadCount;
      await send('Page.navigate', { url: toUrl(path.join(resultsDir, page)) });
      for (let i = 0; i < 120 && loadCount === before; i++) await sleep(50);
      await sleep(500);
      const out = {};
      for (const [k, expr] of [['base', EXTRACT], ['arch', EXTRACT18]]) {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
        if (r.exceptionDetails) throw new Error(page + ' 探针(' + k + ')异常: ' + JSON.stringify(r.exceptionDetails).slice(0, 300));
        if (!r.result || !r.result.value) throw new Error(page + ' 探针(' + k + ')无返回值');
        Object.assign(out, r.result.value);
      }
      return out;
    },
    /* 真实页截图：Task 18.8 跑完变异段后清空 shots/ 并重跑真实交付页用（本包不做视觉断言，截图只是留档） */
    async shot(resultsDir, page) {
      const before = loadCount;
      await send('Page.navigate', { url: toUrl(path.join(resultsDir, page)) });
      for (let i = 0; i < 100 && loadCount === before; i++) await sleep(50);
      await sleep(300);
      try { const r = await send('Page.captureScreenshot', { format: 'png' }); return r && r.data; } catch (e) { return null; }
    },
    close() { try { ws.close(); } catch (e) {} try { proc.kill(); } catch (e) {} },
  };
}

/* 出口：facts 带 __meta，__meta 记录被探测目录与逐页哈希/字节，供 M 组绑定校验 */
export function buildMeta(resultsDir, pages, extra) {
  const perPageSha256 = {}, perPageBytes = {};
  for (const p of pages) {
    const f = path.join(resultsDir, p);
    // 清单登记而磁盘缺失：记 <missing>，交给 M1／A1b 判红，绝不在探针里抛异常（D3）
    if (!fs.existsSync(f)) { perPageSha256[p] = '<missing>'; perPageBytes[p] = 0; continue; }
    const buf = fs.readFileSync(f);
    perPageSha256[p] = shaLower(buf);
    perPageBytes[p] = buf.length;
  }
  return Object.assign({
    resultsDir: path.resolve(resultsDir),
    generatedBy: GENERATED_BY,
    pages: pages.slice(),
    perPageSha256, perPageBytes,
  }, extra || {});
}
