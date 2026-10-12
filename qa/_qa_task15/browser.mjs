/* Task 15 浏览器侧核验（真实 Blink，CDP 驱动，只读）
 *  A. 15.4.4 三详情页逐段 textContent 与 _qa_task13/extracted_baseline.json 严格相等（无归一化）
 *  B. 15.7.3 禁用 CSS：七页结构顺序正确、可读、链接可点
 *  C. 15.7.4 禁用 JS：no-js 下导航常显、正文完整
 *  D. 15.7.5 断网双击等价：零非 file:// 请求、控制台零错误
 * 不写 Results/，产物全部落在 _qa_task15/。
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const RES = path.join(ROOT, 'Results');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = Number(process.env.QODER_CDP_PORT || 9365);
const UD = path.join(HERE, '.cdp' + PORT + '-' + Date.now());
const SHOTS = path.join(HERE, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

const PAGES = ['index.html', 'news-message.html', 'news-feature.html', 'news-commentary.html', 'submission.html',
  'article-school-course-volunteer.html', 'article-math-to-ai-learning.html', 'article-classroom-screen-upgrade.html'];
const DETAIL_TO_BASELINE = {
  'article-school-course-volunteer.html': 'news-message.html',
  'article-math-to-ai-learning.html': 'news-feature.html',
  'article-classroom-screen-upgrade.html': 'news-commentary.html',
};
const baseline = JSON.parse(fs.readFileSync(path.join(ROOT, '_qa_task13', 'extracted_baseline.json'), 'utf8'));

const PROBE = String.raw`(() => {
  const D = document;
  const q = (s) => Array.from(D.querySelectorAll(s));
  const main = D.querySelector('#main-content');
  const nav = D.querySelector('#site-navigation');
  const toggle = D.querySelector('#nav-toggle');
  const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.height > 0 && r.width > 0; };
  return {
    title: D.title,
    h1: main && main.querySelector('h1') ? main.querySelector('h1').textContent : null,
    mainDirect: main ? Array.from(main.children).map(c => c.tagName.toLowerCase() + (c.className ? '.' + c.className.split(' ').join('.') : '')) : [],
    paragraphs: q('.article__body > p').map(p => p.textContent),
    paraInnerTags: q('.article__body > p').map(p => Array.from(p.children).map(c => c.tagName.toLowerCase() + (c.className ? '.' + c.className : ''))),
    articleDate: q('p.article__date').map(p => p.textContent),
    ariaCurrent: q('[aria-current="page"]').map(a => a.getAttribute('href')),
    navCount: q('nav').length,
    navVisible: vis(nav),
    navDisplay: nav ? getComputedStyle(nav).display : null,
    toggleVisible: vis(toggle),
    links: q('a[href]').map(a => a.getAttribute('href')),
    navLinks: q('.site-navigation__list a').map(a => ({ href: a.getAttribute('href'), text: a.textContent, h: Math.round(a.getBoundingClientRect().height) })),
    latestLinks: q('.home-latest__list a').map(a => ({ href: a.getAttribute('href'), text: a.textContent, h: Math.round(a.getBoundingClientRect().height) })),
    entryLinks: q('.entry-list__item a').map(a => ({ href: a.getAttribute('href'), text: a.textContent, h: Math.round(a.getBoundingClientRect().height) })),
    bodyTextLen: D.body.textContent.length,
    resources: performance.getEntriesByType('resource').map(r => r.name),
    stylesheets: Array.from(D.styleSheets).map(s => ({ href: (s.href || '').split('/').pop(), disabled: s.disabled, rules: (function(){ try { return s.cssRules.length; } catch (e) { return 'ERR'; } })() })),
    noJsClass: D.documentElement.className
  };
})()`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toUrl = (p) => 'file:///' + encodeURI(p.replace(/\\/g, '/')).replace(/#/g, '%23');

const proc = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + UD,
  '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-dev-shm-usage',
  '--allow-file-access-from-files', '--window-size=1300,1000', 'about:blank',
], { stdio: 'ignore' });

let ws, mid = 0, loadCount = 0;
const pending = new Map();
const net = [];
const noise = [];

function send(method, params) {
  const id = ++mid;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });
}
async function waitReady() {
  for (let i = 0; i < 200; i++) {
    try { const l = await fetch('http://127.0.0.1:' + PORT + '/json/version'); if (l.ok) return; } catch (e) { }
    await sleep(250);
  }
  throw new Error('chrome 未启动');
}
await waitReady();
const target = (await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json()).find((t) => t.type === 'page');
ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (msg) => {
  const p = JSON.parse(msg.data);
  if (p.id && pending.has(p.id)) {
    const q = pending.get(p.id); pending.delete(p.id);
    p.error ? q.reject(new Error(p.error.message)) : q.resolve(p.result);
  } else if (p.method === 'Page.loadEventFired') loadCount++;
  else if (p.method === 'Network.requestWillBeSent') net.push(p.params.request.url);
  else if (p.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'warn', 'assert'].includes(p.params.type)) {
    noise.push('CONSOLE:' + p.params.type + ':' + String((p.params.args[0] && p.params.args[0].value) ?? ''));
  } else if (p.method === 'Log.entryAdded' && ['error', 'warning'].includes(p.params.entry.level)) {
    noise.push('LOG:' + p.params.entry.level + ':' + String(p.params.entry.text).slice(0, 140));
  }
};
await send('Runtime.enable');
await send('Page.enable');
await send('Network.enable');
await send('Log.enable');

const results = [];
let failed = 0;
function check(label, ok, detail) {
  results.push({ label: label, ok: !!ok, detail: detail || '' });
  if (!ok) failed++;
  console.log('  [' + (ok ? 'PASS' : 'FAIL') + '] ' + label + (detail ? '  — ' + detail : ''));
}
async function open(page) {
  const before = loadCount;
  await send('Page.navigate', { url: toUrl(path.join(RES, page)) });
  for (let i = 0; i < 120 && loadCount === before; i++) await sleep(60);
  await sleep(450);
}
async function probe(page) {
  const r = await send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
  if (r.exceptionDetails) throw new Error(page + ' 探针异常: ' + JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result.value;
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(r.data, 'base64'));
}

const normal = {};
console.log('=== A. 正常模式：七页真实渲染 ===');
for (const page of PAGES) {
  await open(page);
  normal[page] = await probe(page);
  await shot('normal-' + page.replace('.html', ''));
  console.log('  ' + page + '  body ' + normal[page].bodyTextLen + ' 字符，' +
    normal[page].stylesheets.map(s => s.href + '(' + s.rules + ' 规则)').join(',') +
    '，nav=' + normal[page].navCount + '，aria-current=' + JSON.stringify(normal[page].ariaCurrent));
}

console.log('\n=== 15.4.4 详情页逐段 textContent == Task13 基线（严格相等，无归一化）===');
for (const detail of Object.keys(DETAIL_TO_BASELINE)) {
  const basePage = DETAIL_TO_BASELINE[detail];
  const want = baseline.pages[basePage].paragraphs.map(p => p.text);
  const got = normal[detail].paragraphs;
  const same = got.length === want.length && got.every((t, i) => t === want[i]);
  check(detail + ' 浏览器逐段 textContent == extracted_baseline.json（' + want.length + ' 段 / ' +
    want.reduce((a, b) => a + b.length, 0) + ' 字符）', same);
  if (!same) {
    for (let i = 0; i < Math.max(got.length, want.length); i++) {
      if (got[i] !== want[i]) console.log('      段 ' + (i + 1) + ' 不同：实测 ' + JSON.stringify(got[i]) + ' vs 基线 ' + JSON.stringify(want[i]));
    }
  }
  check(detail + ' <title> == Task1 标题｜自然选择号，h1 == 标题主体',
    normal[detail].title === baseline.pages[basePage].title_subject_full &&
    normal[detail].h1 === baseline.pages[basePage].title_subject,
    JSON.stringify(normal[detail].title) + ' / ' + JSON.stringify(normal[detail].h1));
  check(detail + ' aria-current 落在所属栏目 ' + basePage,
    normal[detail].ariaCurrent.length === 1 && normal[detail].ariaCurrent[0] === basePage,
    JSON.stringify(normal[detail].ariaCurrent));
}
{
  const c = normal['article-classroom-screen-upgrade.html'];
  check('评论详情页结尾行 p.article__date 唯一且为（自然选择号9月18日）',
    c.articleDate.length === 1 && c.articleDate[0] === '（自然选择号9月18日）', JSON.stringify(c.articleDate));
  check('消息与通讯详情页首段内层为 strong.dateline',
    normal['article-school-course-volunteer.html'].paraInnerTags[0].join() === 'strong.dateline' &&
    normal['article-math-to-ai-learning.html'].paraInnerTags[0].join() === 'strong.dateline',
    normal['article-school-course-volunteer.html'].paraInnerTags[0].join() + ' / ' + normal['article-math-to-ai-learning.html'].paraInnerTags[0].join());
  check('消息/通讯详情页无 article__date 节点',
    normal['article-school-course-volunteer.html'].articleDate.length === 0 &&
    normal['article-math-to-ai-learning.html'].articleDate.length === 0);
}

console.log('\n=== 15.5 浏览器侧结构与首页/列表页 ===');
for (const page of PAGES) {
  check(page + ' 恰一个 <nav> 且恰一个 aria-current', normal[page].navCount === 1 && normal[page].ariaCurrent.length === 1);
  check(page + ' 导航五条文字与次序不变',
    normal[page].navLinks.map(l => l.text).join('|') === '首页|新闻消息|新闻通讯|新闻评论|投稿' &&
    normal[page].navLinks.map(l => l.href).join('|') === 'index.html|news-message.html|news-feature.html|news-commentary.html|submission.html',
    normal[page].navLinks.map(l => l.href).join('|'));
  check(page + ' 正文完整可读（body 文本 > 200 字符）', normal[page].bodyTextLen > 200, 'len=' + normal[page].bodyTextLen);
}
{
  const idx = normal['index.html'];
  check('首页 #main-content 浏览器侧三个直接子元素（h1→home-sections→home-latest）',
    idx.mainDirect.length === 3 && idx.mainDirect[2] === 'div.home-latest', JSON.stringify(idx.mainDirect));
  check('首页最新区三条，每条 entry+date 双 span，次序消息→通讯→评论',
    idx.latestLinks.length === 3 &&
    idx.latestLinks.map(l => l.href).join() === 'article-school-course-volunteer.html,article-math-to-ai-learning.html,article-classroom-screen-upgrade.html' &&
    idx.latestLinks.every(l => /日$/.test(l.text)),
    JSON.stringify(idx.latestLinks.map(l => l.text)));
  for (const list of ['news-message.html', 'news-feature.html', 'news-commentary.html']) {
    check(list + ' 列表页浏览器侧恰一个条目且无正文段落',
      normal[list].entryLinks.length === 1 && normal[list].paragraphs.length === 0 &&
      normal[list].mainDirect.length === 2,
      JSON.stringify(normal[list].mainDirect) + ' 条目 ' + JSON.stringify(normal[list].entryLinks.map(e => e.text)));
  }
}

console.log('\n=== B. 禁用 CSS（七页：结构顺序正确、可读、链接可点）===');
for (const page of PAGES) {
  await open(page);
  await send('Runtime.evaluate', { expression: '(() => { for (const s of document.styleSheets) s.disabled = true; return 1; })()' });
  const p = await probe(page);
  check('禁CSS ' + page + ' 样式表已全部 disabled',
    p.stylesheets.length > 0 && p.stylesheets.every(s => s.disabled === true),
    JSON.stringify(p.stylesheets));
  check('禁CSS ' + page + ' DOM 顺序与文本与带样式时完全一致（结构不依赖 CSS）',
    JSON.stringify(p.mainDirect) === JSON.stringify(normal[page].mainDirect) && p.bodyTextLen === normal[page].bodyTextLen);
  check('禁CSS ' + page + ' 链接可点：导航五条均为非零高度可点击盒，且指向真实文件',
    p.navLinks.length === 5 && p.navLinks.every(l => l.h > 0),
    p.navLinks.map(l => l.href + '@' + l.h + 'px').join(', '));
  const extra = page === 'index.html' ? p.latestLinks : (page.startsWith('news-') && !page.startsWith('article') ? p.entryLinks : []);
  check('禁CSS ' + page + ' 生成区链接同样可点（' + extra.length + ' 条）',
    extra.every(l => l.h > 0), extra.map(l => l.href + '@' + l.h + 'px').join(', '));
  if (['index.html', 'news-feature.html', 'article-classroom-screen-upgrade.html'].includes(page)) await shot('nocss-' + page.replace('.html', ''));
}

console.log('\n=== C. 禁用 JavaScript（七页：no-js 导航常显、正文完整）===');
await send('Emulation.setScriptExecutionDisabled', { value: true });
for (const page of PAGES) {
  await open(page);
  const p = await probe(page);
  check('禁JS ' + page + ' 导航常显（#site-navigation 可见，display=' + p.navDisplay + '）',
    p.navVisible === true, 'navVisible=' + p.navVisible + ' toggleVisible=' + p.toggleVisible);
  check('禁JS ' + page + ' 正文完整（body 文本与正常模式等长）',
    p.bodyTextLen === normal[page].bodyTextLen, p.bodyTextLen + ' vs ' + normal[page].bodyTextLen);
  check('禁JS ' + page + ' 根元素保持 no-js（脚本未运行）',
    p.noJsClass.indexOf('no-js') === 0, 'class=' + JSON.stringify(p.noJsClass));
  if (['index.html', 'article-math-to-ai-learning.html'].includes(page)) await shot('nojs-' + page.replace('.html', ''));
}
await send('Emulation.setScriptExecutionDisabled', { value: false });

console.log('\n=== D. 断网双击等价：零网络请求、零控制台错误 ===');
const nonFile = net.filter(u => !u.startsWith('file:///'));
check('全部网络请求均为 file://（等价于断网双击可用）', nonFile.length === 0,
  '请求 ' + net.length + ' 条，非 file:// ' + nonFile.length + ' 条：' + JSON.stringify(nonFile.slice(0, 4)));
const uniq = Array.from(new Set(net.map(u => decodeURI(u).split('/').pop()))).sort();
console.log('  实际加载资源集合: ' + uniq.join(', '));
check('控制台与日志错误为 0', noise.length === 0, JSON.stringify(noise.slice(0, 6)));
const external = [];
for (const page of PAGES) {
  for (const r of (normal[page].resources || [])) if (!r.startsWith('file:///')) external.push(page + ' resource ' + r);
  for (const a of normal[page].links) if (/^(https?:)?\/\//.test(a) || a.startsWith('/') || /^[A-Za-z]:/.test(a)) external.push(page + ' href ' + a);
}
check('页内 href/src 无外部/绝对形式', external.length === 0, JSON.stringify(external.slice(0, 6)));

fs.writeFileSync(path.join(HERE, 'browser_facts.json'), JSON.stringify({ normal: normal, net: net, noise: noise }, null, 1), 'utf8');
fs.writeFileSync(path.join(HERE, 'browser_lines.txt'),
  results.map(r => '[' + (r.ok ? 'PASS' : 'FAIL') + '] ' + r.label + (r.detail ? ' — ' + r.detail : '')).join('\n') +
  '\n\n合计 ' + results.length + ' 条：PASS ' + (results.length - failed) + ' / FAIL ' + failed + '\n', 'utf8');
console.log('\n浏览器核验合计 ' + results.length + ' 条，FAIL ' + failed);
try { ws.close(); } catch (e) { }
try { proc.kill(); } catch (e) { }
await sleep(1200);
try { fs.rmSync(UD, { recursive: true, force: true, maxRetries: 8, retryDelay: 400 }); } catch (e) { console.log('（临时 profile 目录未能删除，可手工清理：' + UD + '）'); }
process.exit(failed ? 1 : 0);
