/* Task 16 视口探针（同域 file:// iframe，逐宽度实测）
 * 为什么用同域 iframe：本机无头 Chrome 顶层窗口有约 500px 下限，--window-size=375 实际是
 * 500px 布局的左裁剪，会把裁剪假象伪装成"移动端横向溢出"。iframe 是真实布局视口，
 * 媒体查询按 iframe 宽度求值；溢出判据用 scrollWidth <= clientWidth。
 * 为什么由 CDP 驱动而不是 --dump-dom --virtual-time-budget：反复 resize + await load 的真实
 * 事件循环在虚拟时间下不 settle（探针会停在 running），CDP 每次 evaluate 一个页面 × 六档宽度。
 * 探针内不使用 requestAnimationFrame（虚拟时间/后台页可能永不触发），统一 setTimeout + 强制回流。
 *
 * 用法：node _qa_task16/measure.mjs --root Results --out _qa_task16/measure_results.json
 *       node _qa_task16/measure.mjs --root _qa_task15/before --out _qa_task16/measure_v1.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBrowser } from './cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const arg = (name, dflt) => { const i = process.argv.indexOf('--' + name); return i >= 0 ? process.argv[i + 1] : dflt; };

const resultsDir = path.resolve(ROOT, arg('root', 'Results'));
const outPath = path.resolve(ROOT, arg('out', path.join('_qa_task16', 'measure_results.json')));
const widths = String(arg('widths', '375,640,768,769,1024,1280')).split(',').map(Number);
const registry = JSON.parse(fs.readFileSync(path.join(HERE, 'pages.json'), 'utf8'));
const key = Object.keys(registry).find((k) => resultsDir.replace(/\\/g, '/').endsWith('/' + k)) || 'results';
const pages = registry[key];

const HOST = String.raw`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>task16 视口探针</title>
<style>html,body{margin:0;padding:0;background:#ffffff}#f{border:0;display:block;background:#f5efe4}</style>
</head><body><iframe id="f" width="375" height="1500"></iframe>
<script>
const f = document.getElementById('f');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const num = (v) => Math.round(v * 1000) / 1000;

function attach(href) {
  return new Promise((res, rej) => {
    f.onload = () => res();
    f.onerror = () => rej(new Error('iframe 加载失败 ' + href));
    f.src = href;
  });
}

function probe(doc, win, w) {
  const de = doc.documentElement;
  const q = (s) => Array.from(doc.querySelectorAll(s));
  const cs = (el, pseudo) => win.getComputedStyle(el, pseudo);
  const rect = (el) => { const r = el.getBoundingClientRect(); return { x: num(r.x), y: num(r.y + win.scrollY), w: num(r.width), h: num(r.height) }; };
  const lines = (el) => { const r = doc.createRange(); r.selectNodeContents(el); return r.getClientRects().length; };
  const linkInfo = (el, cls) => {
    const c = cs(el), r = el.getBoundingClientRect();
    return {
      cls, text: (el.textContent || '').trim().slice(0, 20),
      h: num(r.height), w: num(r.width), x: num(r.x), y: num(r.y + win.scrollY),
      color: c.color, textDecoration: c.textDecorationLine, display: c.display,
      flexDirection: c.flexDirection, alignItems: c.alignItems, justifyContent: c.justifyContent,
      gap: c.gap, fontSize: c.fontSize, lineHeight: c.lineHeight,
      outline: [c.outlineStyle, c.outlineWidth, c.outlineColor].join(' '), outlineOffset: c.outlineOffset,
      focusable: el.tabIndex >= 0 && el.getClientRects().length > 0
    };
  };
  const o = {
    viewport: w, frameClientWidth: de.clientWidth, frameScrollWidth: de.scrollWidth,
    overflowX: de.scrollWidth - de.clientWidth, innerWidth: win.innerWidth,
    links: [], titles: [], dates: [], shell: {}, extras: {}
  };
  for (const el of q('.entry-list__link')) o.links.push(linkInfo(el, 'entry-list__link'));
  for (const el of q('.home-latest__link')) o.links.push(linkInfo(el, 'home-latest__link'));
  for (const el of q('.entry-list__title')) o.titles.push({ cls: 'entry-list__title', text: el.textContent.trim().slice(0, 20), lines: lines(el), ...rect(el), overflowWrap: cs(el).overflowWrap, wordBreak: cs(el).wordBreak, hyphens: cs(el).hyphens });
  for (const el of q('.home-latest__entry')) o.titles.push({ cls: 'home-latest__entry', text: el.textContent.trim().slice(0, 20), lines: lines(el), ...rect(el), overflowWrap: cs(el).overflowWrap, wordBreak: cs(el).wordBreak, hyphens: cs(el).hyphens });
  for (const el of q('.entry-list__date, .home-latest__date')) o.dates.push({ cls: el.className, text: el.textContent.trim(), ...rect(el), whiteSpace: cs(el).whiteSpace, color: cs(el).color, fontSize: cs(el).fontSize, flex: cs(el).flex });
  const put = (k, sel, keep) => { const el = doc.querySelector(sel); if (el) o.shell[k] = Object.assign(keep ? keep(el, cs) : {}, rect(el)); };
  put('masthead', '.site-masthead__link', (el, c) => ({ fontSize: c(el).fontSize, lineHeight: c(el).lineHeight, color: c(el).color, letterSpacing: c(el).letterSpacing }));
  put('navLink', '.site-navigation__link', (el, c) => ({ fontSize: c(el).fontSize, lineHeight: c(el).lineHeight, color: c(el).color, borderBottom: c(el).borderBottom }));
  put('navCurrent', '.site-navigation__link[aria-current="page"]', (el, c) => ({ fontSize: c(el).fontSize, lineHeight: c(el).lineHeight, color: c(el).color, borderBottom: c(el).borderBottom }));
  put('main', '.main-content', (el, c) => ({ maxWidth: c(el).maxWidth, paddingTop: c(el).paddingTop, paddingBottom: c(el).paddingBottom, fontSize: c(el).fontSize }));
  put('pageTitle', '.page-title', (el, c) => ({ fontSize: c(el).fontSize, lineHeight: c(el).lineHeight, maxWidth: c(el).maxWidth }));
  put('articleBody', '.article__body', (el, c) => ({ maxWidth: c(el).maxWidth, fontSize: c(el).fontSize, lineHeight: c(el).lineHeight, textAlign: c(el).textAlign, textIndent: c(el).textIndent }));
  put('articleHeader', '.article__header', (el, c) => ({ maxWidth: c(el).maxWidth, paddingBottom: c(el).paddingBottom, borderBottom: c(el).borderBottom }));
  put('articleType', '.article__type', (el, c) => ({ fontSize: c(el).fontSize, color: c(el).color, letterSpacing: c(el).letterSpacing }));
  put('articleByline', '.article__byline', (el, c) => ({ fontSize: c(el).fontSize, color: c(el).color }));
  put('articleDate', '.article__date', (el, c) => ({ fontSize: c(el).fontSize, color: c(el).color, textAlign: c(el).textAlign }));
  put('entryList', '.entry-list', (el, c) => ({ maxWidth: c(el).maxWidth, marginTop: c(el).marginTop, listStyleType: c(el).listStyleType, marginLeft: c(el).marginLeft, paddingLeft: c(el).paddingLeft }));
  put('homeLatest', '.home-latest', (el, c) => ({ maxWidth: c(el).maxWidth, marginTop: c(el).marginTop, display: c(el).display }));
  put('latestTitle', '.home-latest__title', (el, c) => ({ fontSize: c(el).fontSize, color: c(el).color, lineHeight: c(el).lineHeight, marginTop: c(el).marginTop, marginBottom: c(el).marginBottom, textAlign: c(el).textAlign }));
  put('entryItem', '.entry-list__item', (el, c) => ({ paddingTop: c(el).paddingTop, paddingBottom: c(el).paddingBottom, borderTop: c(el).borderTop, borderBottom: c(el).borderBottom, listStyleType: c(el).listStyleType }));
  put('latestItem', '.home-latest__item', (el, c) => ({ paddingTop: c(el).paddingTop, paddingBottom: c(el).paddingBottom, borderTop: c(el).borderTop, borderBottom: c(el).borderBottom }));
  o.shell.homeSectionTexts = q('.home-section__text').map((el) => Object.assign({ text: el.textContent.trim().slice(0, 10), fontSize: cs(el).fontSize, lineHeight: cs(el).lineHeight, color: cs(el).color }, rect(el)));
  o.shell.homeSectionTitles = q('.home-section__title').map((el) => Object.assign({ text: el.textContent.trim().slice(0, 10), fontSize: cs(el).fontSize, lineHeight: cs(el).lineHeight, color: cs(el).color }, rect(el)));
  o.shell.homeSections = q('.home-section').map((el) => Object.assign({ borderTop: cs(el).borderTop, borderBottom: cs(el).borderBottom, paddingTop: cs(el).paddingTop, paddingBottom: cs(el).paddingBottom }, rect(el)));
  o.shell.articleParagraphs = q('.article__body > p').map((el) => rect(el));
  o.shell.skipLink = (() => { const el = doc.querySelector('.skip-link'); if (!el) return null; const c = cs(el); return Object.assign({ color: c.color, position: c.position }, rect(el)); })();
  o.extras.docHeight = num(de.scrollHeight);
  o.extras.markerText = (() => { const el = doc.querySelector('.entry-list__item'); if (!el) return null; const c = cs(el, '::marker'); return c ? c.content + '|' + c.fontFamily : null; })();
  return o;
}

window.runOne = async function (href, ws) {
  const out = [];
  await attach(href);
  for (const w of ws) {
    f.style.width = w + 'px';
    f.style.height = '1500px';
    f.getBoundingClientRect();
    void f.contentDocument.documentElement.offsetHeight;
    await sleep(90);
    const doc = f.contentDocument;
    if (!doc || !doc.documentElement) { out.push({ viewport: w, error: '读不到 contentDocument' }); continue; }
    try { out.push(Object.assign({ page: href }, probe(doc, f.contentWindow, w))); }
    catch (e) { out.push({ page: href, viewport: w, error: String(e && e.message) }); }
  }
  return out;
};
</script></body></html>`;

const hostPath = path.join(HERE, '_measure_host.html');
fs.writeFileSync(hostPath, HOST, 'utf8');

const br = await openBrowser(Number(arg('port', 9511)), path.join(HERE, '.cdp' + arg('port', 9511)));
await br.navigate(hostPath, 500);

const all = [];
for (const p of pages) {
  const rel = path.relative(ROOT, path.join(resultsDir, p)).replace(/\\/g, '/');
  const rows = await br.evaluate('window.runOne(' + JSON.stringify('../' + rel) + ',' + JSON.stringify(widths) + ')');
  all.push(...rows);
  console.log('测完 ' + p + '：' + rows.length + ' 档');
}
br.close();

fs.writeFileSync(outPath, JSON.stringify(all, null, 1), 'utf8');

const fail = [];
for (const r of all) {
  const tag = (r.page || '') + '@' + r.viewport;
  if (r.error) { fail.push(tag + ' 探针异常 ' + r.error); continue; }
  if (r.overflowX > 0) fail.push(tag + ' 横向溢出 ' + r.overflowX + 'px（scrollWidth ' + r.frameScrollWidth + ' > clientWidth ' + r.frameClientWidth + '）');
  if (r.frameClientWidth > r.viewport || r.viewport - r.frameClientWidth > 20) {
    fail.push(tag + ' iframe 视口未生效（clientWidth=' + r.frameClientWidth + '，宽差 ' + (r.viewport - r.frameClientWidth) + 'px 超出滚动条槽合理范围 ≤20px）');
  }
  for (const l of r.links) {
    if (!(l.h >= 44)) fail.push(tag + ' ' + l.cls + ' 实测高 ' + l.h + 'px < 44');
    if (!(l.w >= 44)) fail.push(tag + ' ' + l.cls + ' 实测宽 ' + l.w + 'px < 44');
  }
}
console.log('root=%s 页=%d 档=%d 记录=%d 判据失败=%d → %s', path.relative(ROOT, resultsDir), pages.length, widths.length, all.length, fail.length, path.relative(ROOT, outPath));
for (const f2 of fail) console.log('  FAIL: ' + f2);
process.exit(fail.length ? 1 : 0);
