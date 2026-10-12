/* R13: Exercise the Pages 404 document through an HTTP fixture and a real browser.
 * Local: node qa/_qa_task19/not_found_check.mjs
 * Online after manual upload: node qa/_qa_task19/not_found_check.mjs --online
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const RESULTS = path.join(ROOT, 'Results');
const ERROR_PAGE = '404.html';
const ERROR_FILE = path.join(RESULTS, ERROR_PAGE);
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'deploy', 'manifest.json'), 'utf8'));
const ERROR_BYTES = fs.readFileSync(ERROR_FILE);
const ERROR_HTML = ERROR_BYTES.toString('utf8');
const ERROR_SHA = createHash('sha256').update(ERROR_BYTES).digest('hex');
const online = process.argv.includes('--online');
const REPORT_DIR = path.resolve(process.env.QODER_REPORT_DIR || HERE);
const reportPath = path.join(REPORT_DIR, online ? 'not_found_online_report.json' : 'not_found_local_report.json');
const rows = [];
const network = [];
const consoleErrors = [];
let httpResponses = [];
let harnessError = null;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sha = (data) => createHash('sha256').update(data).digest('hex');
const record = (name, pass, actual = '') => {
  rows.push({ name, status: pass ? 'PASS' : 'FAIL', actual: String(actual) });
  return pass;
};
const rootRefsOk = (html) => html.includes('href="/styles.css"') && html.includes('src="/script.js"')
  && html.includes('href="/">首页') && html.includes('href="/news-message.html"')
  && html.includes('href="/news-feature.html"') && html.includes('href="/news-commentary.html"');
const requiredCopy = (html) => html.includes('<title>页面不存在｜自然选择号</title>')
  && html.includes('<h1 class="page-title" id="not-found-title">页面不存在</h1>')
  && html.includes('这个页面不存在，或已经被移走。') && html.includes('<a href="/">返回首页</a>')
  && !html.includes('aria-current');

let server;
let base;
let ws;
let cdpId = 0;
const pending = new Map();

async function startFixture() {
  const pageNames = new Set(MANIFEST.pages.map((entry) => entry.path));
  const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
  server = http.createServer((req, res) => {
    const requestUrl = new URL(req.url || '/', 'http://fixture.local');
    const pathname = decodeURIComponent(requestUrl.pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
    const known = pageNames.has(relative);
    const file = known ? path.join(RESULTS, relative) : ERROR_FILE;
    const data = fs.readFileSync(file);
    res.statusCode = known ? 200 : 404;
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(data);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
}

async function waitForDebugger(port) {
  for (let i = 0; i < 120; i++) {
    try {
      const response = await fetch('http://127.0.0.1:' + port + '/json/list');
      if (response.ok) return await response.json();
    } catch {}
    await sleep(250);
  }
  throw new Error('Chrome DevTools endpoint did not start');
}

function zipEntryNames(zipPath) {
  const data = fs.readFileSync(zipPath);
  let eocd = -1;
  for (let i = data.length - 22; i >= Math.max(0, data.length - 22 - 0xffff); i--) {
    if (data.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('ZIP end-of-central-directory record not found');
  const count = data.readUInt16LE(eocd + 10);
  let offset = data.readUInt32LE(eocd + 16);
  const names = [];
  for (let i = 0; i < count; i++) {
    if (data.readUInt32LE(offset) !== 0x02014b50) throw new Error('ZIP central directory entry is invalid');
    const nameLength = data.readUInt16LE(offset + 28);
    const extraLength = data.readUInt16LE(offset + 30);
    const commentLength = data.readUInt16LE(offset + 32);
    names.push(data.subarray(offset + 46, offset + 46 + nameLength).toString('utf8'));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return names;
}

function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++cdpId;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('CDP timeout: ' + method));
    }, 20000);
    pending.set(id, { resolve, reject, timer });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function openPage(url) {
  const loaded = new Promise((resolve) => {
    const handler = (message) => {
      if (message.method !== 'Page.loadEventFired') return;
      ws.removeEventListener('message', handler);
      resolve(true);
    };
    ws.addEventListener('message', handler);
    setTimeout(() => {
      ws.removeEventListener('message', handler);
      resolve(false);
    }, 20000);
  });
  await cdp('Page.navigate', { url });
  return loaded;
}

async function evaluate(expression) {
  const response = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || 'Runtime.evaluate failed');
  return response.result && response.result.value;
}

async function snapshot() {
  const raw = await evaluate(`(() => {
    const d = document, links = Array.from(d.querySelectorAll('.site-navigation__link'));
    const sheet = d.querySelector('link[rel="stylesheet"]'), script = d.querySelector('script[defer]');
    return JSON.stringify({
      url: location.pathname + location.search, title: d.title,
      h1: (d.querySelector('h1') || {}).textContent,
      message: (d.querySelector('.home-section__text') || {}).textContent,
      home: (d.querySelector('main a[href="/"]') || {}).textContent,
      bg: getComputedStyle(d.body).backgroundColor,
      cls: d.documentElement.className,
      css: sheet && sheet.getAttribute('href'), cssLoaded: !!(sheet && sheet.sheet),
      script: script && script.getAttribute('src'), current: d.querySelectorAll('[aria-current]').length,
      nav: links.map((a) => a.getAttribute('href')),
      navDisplay: getComputedStyle(d.querySelector('#site-navigation')).display,
      menuExpanded: d.querySelector('#nav-toggle').getAttribute('aria-expanded'),
      skip: d.querySelector('.skip-link').getAttribute('href'),
      mainId: d.querySelector('main').id,
      overflow: d.documentElement.scrollWidth > d.documentElement.clientWidth
    });
  })()`);
  return JSON.parse(raw);
}

async function runHttpCases() {
  const requests = [
    '/task19-missing', '/foo/bar', '/foo/bar/', '/foo/a/b/c',
    '/article-task19-does-not-exist.html', '/foo/bar?from=qa', '/_headers',
  ];
  const responses = [];
  for (const route of requests) {
    const response = await fetch(base + route, { redirect: 'manual', cache: 'no-store' });
    const body = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || '';
    const requestPath = new URL(response.url).pathname + new URL(response.url).search;
    const good = response.status === 404 && /text\/html/i.test(contentType)
      && sha(body) === ERROR_SHA && requestPath === route && !body.toString('utf8').includes(route);
    record('HTTP ' + route + ' → 404 HTML with URL retained and no path echo', good,
      response.status + ' ' + contentType + ' sha256=' + sha(body) + ' url=' + response.url);
    responses.push({ route, status: response.status, contentType, url: response.url, bodySha256: sha(body) });
  }
  const css = await fetch(base + '/styles.css', { cache: 'no-store' });
  const js = await fetch(base + '/script.js', { cache: 'no-store' });
  record('root CSS returns stylesheet MIME', css.ok && /text\/css/i.test(css.headers.get('content-type') || ''), css.status + ' ' + css.headers.get('content-type'));
  record('root JS returns JavaScript MIME', js.ok && /javascript/i.test(js.headers.get('content-type') || ''), js.status + ' ' + js.headers.get('content-type'));
  const manifestPaths = new Set(MANIFEST.pages.map((entry) => entry.path));
  const zipNames = zipEntryNames(path.join(ROOT, 'deploy', 'site.zip'));
  record('deployment ZIP contains 404.html', zipNames.includes(ERROR_PAGE), zipNames.join(','));
  const missingMutant = zipNames.filter((name) => name !== ERROR_PAGE);
  const missingFromManifestSet = [...manifestPaths, '_headers'].filter((name) => !missingMutant.includes(name));
  record('negative case: ZIP missing 404.html is detected by manifest-set comparison',
    manifestPaths.has(ERROR_PAGE) && missingFromManifestSet.includes(ERROR_PAGE),
    'mutant removed 404.html; expected-set difference contains ' + missingFromManifestSet.join(','));
  record('404 document fixed copy and root references', requiredCopy(ERROR_HTML) && rootRefsOk(ERROR_HTML),
    'sha256=' + ERROR_SHA + ' bytes=' + ERROR_BYTES.length);
  const cssMutant = ERROR_HTML.replace('href="/styles.css"', 'href="styles.css"');
  const jsMutant = ERROR_HTML.replace('src="/script.js"', 'src="script.js"');
  record('negative case: relative CSS is detected', !rootRefsOk(cssMutant), 'mutated href="styles.css"');
  record('negative case: relative JS is detected', !rootRefsOk(jsMutant), 'mutated src="script.js"');
  return responses;
}

async function runBrowserCases() {
  const debugPort = Number(process.env.QODER_CDP_PORT || 0);
  if (!debugPort) throw new Error('请通过 run_not_found_check.ps1 启动隐藏 Chrome 并设置 QODER_CDP_PORT');
  const targets = await waitForDebugger(debugPort);
  const target = targets.find((item) => item.type === 'page');
  if (!target) throw new Error('Chrome returned no page target');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const item = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(item.timer);
      if (message.error) item.reject(new Error(JSON.stringify(message.error)));
      else item.resolve(message.result);
      return;
    }
    if (message.method === 'Network.responseReceived') {
      const response = message.params.response;
      network.push({ url: response.url, status: response.status, mimeType: response.mimeType });
    }
    if (message.method === 'Runtime.exceptionThrown') consoleErrors.push(message.params.exceptionDetails?.text || 'runtime exception');
    if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'warn'].includes(message.params.type)) {
      consoleErrors.push(String(message.params.args?.[0]?.value || message.params.type));
    }
  });
  await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable'); await cdp('Log.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  const route = '/foo/bar?probe=desktop';
  await openPage(base + route);
  await sleep(500);
  const desktop = await snapshot();
  record('desktop nested URL remains in address bar', desktop.url === route, desktop.url);
  record('desktop error content and root CSS/JS work', desktop.title === '页面不存在｜自然选择号'
    && desktop.h1 === '页面不存在' && desktop.message === '这个页面不存在，或已经被移走。'
    && desktop.home === '返回首页' && desktop.bg === 'rgb(245, 239, 228)' && desktop.cls === 'js'
    && desktop.css === '/styles.css' && desktop.cssLoaded && desktop.script === '/script.js'
    && desktop.current === 0 && !desktop.overflow,
  JSON.stringify(desktop));
  record('desktop navigation has four root paths and skip link works',
    JSON.stringify(desktop.nav) === JSON.stringify(['/', '/news-message.html', '/news-feature.html', '/news-commentary.html'])
      && desktop.skip === '#main-content' && desktop.mainId === 'main-content', JSON.stringify(desktop.nav));
  record('browser received 404 document plus stylesheet and script with correct MIME',
    network.some((item) => item.url === base + route && item.status === 404 && /html/i.test(item.mimeType))
      && network.some((item) => item.url.endsWith('/styles.css') && item.status === 200 && /css/i.test(item.mimeType))
      && network.some((item) => item.url.endsWith('/script.js') && item.status === 200 && /javascript/i.test(item.mimeType)),
  JSON.stringify(network.filter((item) => item.url.includes('foo/bar') || item.url.endsWith('/styles.css') || item.url.endsWith('/script.js'))));
  await evaluate('document.querySelector(".skip-link").click()');
  await sleep(100);
  record('skip link reaches main content', await evaluate('location.hash === "#main-content" && document.activeElement.id === "main-content"'), String(await evaluate('location.hash + "/" + document.activeElement.id')));

  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const mobileRoute = '/foo/bar/?probe=mobile';
  await openPage(base + mobileRoute);
  await sleep(450);
  const mobile = await snapshot();
  record('mobile layout stays within viewport and keeps error content', mobile.url === mobileRoute && !mobile.overflow
    && mobile.h1 === '页面不存在' && mobile.bg === 'rgb(245, 239, 228)', JSON.stringify(mobile));
  await evaluate('document.querySelector("#nav-toggle").click()');
  const opened = await snapshot();
  record('mobile menu opens and synchronizes ARIA', opened.menuExpanded === 'true' && opened.navDisplay === 'block',
    'aria-expanded=' + opened.menuExpanded + ' display=' + opened.navDisplay);
  await openPage(base + '/foo/bar/?probe=menu');
  await sleep(250);
  await evaluate('document.querySelector("#nav-toggle").click(); document.querySelectorAll(".site-navigation__link")[2].click()');
  await sleep(700);
  record('mobile navigation reaches the root-level column page', await evaluate('location.pathname === "/news-feature.html"'), String(await evaluate('location.pathname')));
  await openPage(base + '/foo/bar/?probe=home-link');
  await sleep(250);
  await evaluate('document.querySelector(".home-section__text a").click()');
  await sleep(650);
  record('return-home link opens the site root', await evaluate('location.pathname === "/" && !!document.querySelector("#latest-title")'),
    String(await evaluate('location.pathname + "/" + !!document.querySelector("#latest-title")')));

  await cdp('Emulation.setScriptExecutionDisabled', { value: true });
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await openPage(base + '/no-js/nested');
  await sleep(400);
  let noJs = null;
  try { noJs = await snapshot(); } catch (error) { consoleErrors.push('no-js snapshot: ' + error.message); }
  if (noJs) record('without JavaScript, error copy and navigation remain visible', noJs.cls === 'no-js'
    && noJs.navDisplay === 'block' && noJs.h1 === '页面不存在' && noJs.home === '返回首页', JSON.stringify(noJs));
  else record('without JavaScript, error copy and navigation remain visible', false, 'DOM runtime inspection unavailable');
  await cdp('Emulation.setScriptExecutionDisabled', { value: false });
  record('error-page browser run has no console errors', consoleErrors.length === 0, consoleErrors.join(' | ') || '0');
  const report = { mode: online ? 'online' : 'local-http-fixture', base, errorPage: ERROR_PAGE,
    errorPageSha256: ERROR_SHA, errorPageBytes: ERROR_BYTES.length, rows, network, consoleErrors };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  return report;
}

try {
  if (online) base = (process.env.QODER_ONLINE_BASE || 'https://old-ns-news.pages.dev').replace(/\/+$/, '');
  else await startFixture();
  httpResponses = await runHttpCases();
  const browserReport = await runBrowserCases();
  browserReport.http = httpResponses;
  fs.writeFileSync(reportPath, JSON.stringify(browserReport, null, 2) + '\n', 'utf8');
} catch (error) {
  harnessError = error && error.stack ? error.stack : String(error);
  record('test harness completed', false, error && error.stack ? error.stack : String(error));
} finally {
  try { if (ws && ws.readyState === WebSocket.OPEN) ws.close(); } catch {}
  try { if (server) await new Promise((resolve) => server.close(resolve)); } catch {}
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({ mode: online ? 'online' : 'local-http-fixture', base,
    errorPage: ERROR_PAGE, errorPageSha256: ERROR_SHA, errorPageBytes: ERROR_BYTES.length,
    rows, http: httpResponses, network, consoleErrors, harnessError }, null, 2) + '\n', 'utf8');
}

const failed = rows.filter((row) => row.status === 'FAIL');
process.stdout.write('404 ' + (online ? '线上' : '本地 HTTP') + ' 核验：' + (rows.length - failed.length)
  + ' PASS / ' + failed.length + ' FAIL\n');
for (const row of failed) process.stdout.write('FAIL ' + row.name + ': ' + row.actual + '\n');
if (failed.length) process.exit(1);
