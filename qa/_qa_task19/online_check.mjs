/* Task 19 — R-O 线上复验（真实标签页／无头，绝不用同域 iframe）
 *
 * 为什么不能用 iframe：`_headers` 里的 `frame-ancestors 'none'` 拒绝任何框架化，
 * 借用同域 iframe 去线上量视口只会得到"站点坏了"的假象。
 * 308 去后缀直达、边缘缓存、frame-ancestors 本来就是 file:// 与线上的合法分歧，逐条在此取证，
 * 不拿它们去免掉离线路径，也不以"线上更好"为由跳过离线结论。
 *
 * 缓存：探针 URL 一律带查询串绕开边缘缓存；站内链接本身不得带查询参数（Task0 约束），
 * 这一条同样单独断言。
 *
 * 两种运行方式：
 *   1) 由驱动调用：onlinePass(env, C)，env 提供 A/eq/okf/js/ev/openPage/metrics/sleep/NET/ERR
 *   2) 独立运行：node _qa_task19/online_check.mjs  → online_results.json + online_lines.txt
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { HERE, REPORT_DIR } from './contract19.mjs';

const sha = (b) => createHash('sha256').update(b).digest('hex');

export async function onlinePass(env, C) {
  const { eq, okf, openPage, js, ev, metrics, sleep, BASE } = env;
  const A = (id, pass, o = {}) => env.A(id, pass, Object.assign({ group: 'R-O' }, o));
  const base = BASE || C.onlineBase;
  const nonce = 'task19' + Date.now();
  const url = (p, bust = true) => base.replace(/\/+$/, '') + p + (bust ? (p.includes('?') ? '&' : '?') + 'cb=' + nonce : '');
  const netLog = env.NET || [];
  const consoleErr = env.ERR || [];
  const get = async (p, opts = {}) => fetch(url(p, true), Object.assign({ cache: 'no-store', redirect: 'follow' }, opts));

  /* ---------- O1 站点可访问 + 清单页全部可达 + 三个数字各归各口径 ---------- */
  const home = await (await get('/')).text();
  okf('RO1', /自然选择号/.test(home), { page: '/', width: '线上', step: 'O1 站点可访问：首页 HTML 含站点名', expect: '含"自然选择号"', actual: home.slice(0, 40).replace(/\s+/g, ' '), handoff: '用户：上传是否完成' });
  const onlinePages = [];
  for (const p of C.htmlPages) {
    const r = await get('/' + p);
    const html = await r.text();
    const idTitle = html.includes('<title>' + C.titleSubject[p] + C.titleSuffix + '</title>');
    onlinePages.push({ p, status: r.status, idTitle });
    /* 状态 200 单独不算证据：Pages 若开着 404/SPA 回退，任何路径都能返回 200，
     * 所以 O1 一律用内容身份（该页 <title> 逐字符命中）证明"这一页真的是这一页"。 */
    okf('RO1', r.status === 200 && idTitle, { page: p, width: '线上', step: 'O1 清单页在线上 200 且 HTML 里的 <title> 就是这一页（内容身份，不被回退页冒充）', expect: '200 且 <title>==' + C.titleSubject[p] + C.titleSuffix, actual: r.status + ' 身份命中=' + idTitle, handoff: '用户：上传是否完整' });
  }
  eq('RO1', onlinePages.length + 1, C.counts.html, { page: '站点', width: '线上', step: 'O1 普通线上页面数 + 专用 404.html == manifest.counts.html（Pages 后台计数由用户按 UPLOAD.md 核对）', expect: '5+N=' + C.counts.html, actual: onlinePages.length + '+1=' + (onlinePages.length + 1), handoff: '用户' });
  const nf = C.counts.articles;
  eq('RO7', C.counts.pages, 7 + nf, { page: 'Results/', width: '线上', step: 'O7 交付文件数按 7 + N 核对（含线上专用 404.html，N=' + nf + '）', expect: '7+N=' + (7 + nf), actual: String(C.counts.pages), handoff: 'Task 17／R13' });
  eq('RO7', C.zipEntries, 8 + nf, { page: 'deploy/site.zip', width: '线上', step: 'O7 zip 文件条目数按 8 + N 核对（含 _headers 与 404.html）', expect: '8+N=' + (8 + nf), actual: String(C.zipEntries), handoff: 'Task 17／R13' });
  eq('RO7', C.counts.html, 5 + nf, { page: '站点', width: '线上', step: 'O7 站点 HTML 页面数按 5 + N 核对（含 404.html）', expect: '5+N=' + (5 + nf), actual: String(C.counts.html), handoff: 'Task 17／R13' });
  okf('RO7', C.threeNum.length === 3 && [C.counts.pages, C.zipEntries, C.counts.html].every((v, i, a) => a.indexOf(v) === i), { page: '站点', width: '线上', step: 'O7 三个数字两两不等且分别匹配上传核对单（' + C.threeNum.map((t) => t.formula + '=' + t.expect).join('／') + '）', expect: '13／14／11', actual: [C.counts.pages, C.zipEntries, C.counts.html].join('／') + ' 与 UPLOAD.md 登记值一致=' + C.threeNum.every((t) => [C.counts.pages, C.zipEntries, C.counts.html].includes(t.expect)), handoff: 'Task 17／R13' });

  /* ---------- O4 安全头实测生效 ---------- */
  const hres = await get('/');
  const hdrs = Object.fromEntries([...hres.headers.entries()]);
  eq('RO4', 'DENY', hdrs['x-frame-options'], { page: '/', width: '线上', step: 'O4 X-Frame-Options 生效', expect: 'DENY', actual: String(hdrs['x-frame-options']), handoff: 'Task 17／站点设置' });
  okf('RO4', /max-age=31536000/.test(hdrs['strict-transport-security'] || ''), { page: '/', width: '线上', step: 'O4 HSTS 生效', expect: 'max-age=31536000', actual: String(hdrs['strict-transport-security']), handoff: 'Task 17' });
  eq('RO4', 'nosniff', hdrs['x-content-type-options'], { page: '/', width: '线上', step: 'O4 X-Content-Type-Options 生效', expect: 'nosniff', actual: String(hdrs['x-content-type-options']), handoff: 'Task 17' });
  okf('RO4', /frame-ancestors 'none'/.test(hdrs['content-security-policy'] || ''), { page: '/', width: '线上', step: "O4 CSP frame-ancestors 'none' 生效（本组因此一律真实标签页，不用 iframe）", expect: "frame-ancestors 'none'", actual: String(hdrs['content-security-policy']).slice(0, 140), handoff: 'Task 17' });
  const hd = await get('/_headers');
  const hdText = await hd.text();
  okf('RO4', hd.status === 404 && /<title>页面不存在｜自然选择号<\/title>/.test(hdText) && !/frame-ancestors|^X-Frame-Options/im.test(hdText), { page: '/_headers', width: '线上', step: 'O4 `_headers` 返回 404 提示页且不泄漏配置正文', expect: 'HTTP 404 + 页面不存在 + 不含配置行', actual: 'status=' + hd.status + ' 首 60=' + hdText.slice(0, 60).replace(/\s+/g, ' '), handoff: 'Task 17／R13' });

  /* ---------- O2 308 去后缀直达不破坏相对引用 ---------- */
  const cssRes = await get('/styles.css'); const cssText = await cssRes.text();
  const jsRes = await get('/script.js'); const jsText = await jsRes.text();
  const manCss = (C.manifest.pages.find((x) => x.path === 'styles.css') || {}).sha256;
  const manJs = (C.manifest.pages.find((x) => x.path === 'script.js') || {}).sha256;
  eq('RO3', manCss, sha(Buffer.from(cssText, 'utf8')), { page: 'styles.css', width: '线上', step: 'O3 线上样式与本地清单同版本（Auto-Minify 必须关闭，否则被改写）', expect: manCss, actual: sha(Buffer.from(cssText, 'utf8')), handoff: '站点设置：Auto-Minify' });
  eq('RO3', manJs, sha(Buffer.from(jsText, 'utf8')), { page: 'script.js', width: '线上', step: 'O3 线上脚本与本地清单同版本（Rocket Loader 必须关闭）', expect: manJs, actual: sha(Buffer.from(jsText, 'utf8')), handoff: '站点设置：Rocket Loader／Auto-Minify' });
  for (const col of C.columns) {
    const p = col.list;
    const withSuffix = await get('/' + p, { redirect: 'manual' }).catch(() => null);
    const bare = '/' + p.replace(/\.html$/i, '');
    const bareRes = await get(bare);
    okf('RO2', bareRes.status === 200, { page: p, width: '线上', step: 'O2 去后缀形态直接可达（Cloudflare Pages 的 308 行为，只在 R-O 测，不写进 R-A）', expect: 200, actual: bareRes.status, handoff: '用户' });
    await metrics(1280, 900);
    await openPage(url(bare, true));
    await sleep(600);
    const st = await js('(() => { var d=document; return JSON.stringify({title:d.title, h1:(d.querySelector("h1")||{}).textContent, bg:getComputedStyle(d.body).backgroundColor, cls:d.documentElement.className, links:d.querySelectorAll("a").length, cw:d.documentElement.clientWidth}); })()');
    eq('RO2', C.titleSubject[p] + C.titleSuffix, st.title, { page: p, width: '线上/去后缀', step: 'O2 跳转后 <title> 与合同一致（相对引用没被 308 打断）', expect: C.titleSubject[p] + C.titleSuffix, actual: st.title + '（落地 URL=' + base + bare + '）', handoff: 'Task 15' });
    eq('RO2', C.PAPER, st.bg, { page: p, width: '线上/去后缀', step: 'O2 跳转后 styles.css 真的生效（纸色底=本地合同值）', expect: C.PAPER, actual: st.bg, handoff: 'Task 16' });
    eq('RO2', 'js', st.cls, { page: p, width: '线上/去后缀', step: 'O2 跳转后 script.js 真的执行（no-js→js 发生）', expect: 'js', actual: st.cls, handoff: 'Task 15' });
  }

  /* ---------- O3 详情页两种形态都打开且渲染一致 ---------- */
  for (const col of C.columns) {
    for (const art of col.articles) {
      for (const form of ['带后缀', '去后缀']) {
        const target = form === '带后缀' ? '/' + art.page : '/' + art.page.replace(/\.html$/i, '');
        await metrics(1280, 900);
        await openPage(url(target, true));
        await sleep(560);
        const st = await js('(() => { var d=document; return JSON.stringify({title:d.title, h1:(d.querySelector("h1")||{}).textContent, bg:getComputedStyle(d.body).backgroundColor, cls:d.documentElement.className, paras:d.querySelectorAll(".article__body > p").length, cur:(d.querySelector("[aria-current=page]")||{}).getAttribute?d.querySelector("[aria-current=page]").getAttribute("href"):null}); })()');
        eq('RO3', art.title + C.titleSuffix, st.title, { page: art.page, width: '线上/' + form, step: 'O3 线上 <title> == 文章标题 + 后缀', expect: art.title + C.titleSuffix, actual: st.title, handoff: 'Task 15' });
        eq('RO3', art.title, st.h1, { page: art.page, width: '线上/' + form, step: 'O3 线上 <h1> 与文章标题逐字一致', expect: art.title, actual: st.h1, handoff: 'Task 15' });
        eq('RO3', C.PAPER + '/js/' + C.detail[art.page].paragraphCount, st.bg + '/' + st.cls + '/' + st.paras, { page: art.page, width: '线上/' + form, step: 'O3 线上渲染与本地同版本：样式生效 + 脚本执行 + 段落数等于基线', expect: C.PAPER + '/js/' + C.detail[art.page].paragraphCount, actual: st.bg + '/' + st.cls + '/' + st.paras, handoff: 'Task 15' });
        eq('RO3', col.list, st.cur, { page: art.page, width: '线上/' + form, step: 'O3 线上当前项归属仍是所属栏目页', expect: col.list, actual: String(st.cur), handoff: 'Task 15' });
      }
    }
  }

  /* ---------- O5 首页第三条已是 R7 修订文本 ---------- */
  const liveHome = await (await get('/index.html')).text();
  okf('RO5', liveHome.includes('鸽子衔枝之年'), { page: 'index.html', width: '线上', step: 'O5 线上首页含 R7 修订文本"鸽子衔枝之年"（该条未发布的文本变更随本轮一并上线）', expect: '含"鸽子衔枝之年"', actual: liveHome.includes('鸽子衔枝之年') ? '命中' : '未命中', handoff: '用户：上传不完整' });
  okf('RO5', !liveHome.includes('2024年'), { page: 'index.html', width: '线上', step: 'O5 旧文本"2024年"不在线上任何位置', expect: 'false', actual: String(liveHome.includes('2024年')), handoff: '用户：上传不完整' });
  eq('RO5', [], [...liveHome.matchAll(/(19|20)\d{2}/g)].map((x) => x[0]), { page: 'index.html', width: '线上', step: 'O5 线上首页 HTML 不含任何四位数字（R6：年份形态全站零豁免）', expect: '命中 0 处', actual: ([...liveHome.matchAll(/(19|20)\d{2}/g)].map((x) => x[0]).join(',') || '命中 0 处'), handoff: 'Task 15' });
  await metrics(1280, 900);
  await openPage(url('/index.html', true));
  await sleep(600);
  const liveThird = await ev('(() => { var s=[].slice.call(document.querySelectorAll(".home-section__text")); return s.length?s[s.length-1].textContent:null; })()');
  eq('RO5', C.frozen.P_FOUNDED, liveThird, { page: 'index.html', width: '线上', step: 'O5 线上首页第三条渲染文本逐字符等于 Task4 冻结值（P_FOUNDED）', expect: C.frozen.P_FOUNDED, actual: String(liveThird), handoff: 'Task 15' });

  /* ---------- O6 正常页 200、未知路径 404、0 控制台错误、无混合内容 ---------- */
  const statuses = [];
  for (const p of C.htmlPages) {
    const r = await get('/' + p);
    statuses.push(p + '=' + r.status);
    await openPage(url('/' + p, true));
    await sleep(500);
  }
  const brokenNormal = onlinePages.filter((x) => x.status !== 200 || !x.idTitle).map((x) => x.p + '=' + x.status);
  eq('RO6', [], brokenNormal, { page: '全站', width: '线上', step: 'O6 manifest 内普通页面逐页 200 且身份正确', expect: '无失败页', actual: brokenNormal.join(',') || '全部通过', handoff: '用户' });
  const unknownPaths = ['/task19-missing', '/foo/bar', '/foo/bar/', '/foo/a/b/c', '/article-task19-does-not-exist.html', '/foo/bar?from=qa'];
  for (const p of unknownPaths) {
    const missing = await get(p);
    const missingBody = await missing.text();
    const headers = Object.fromEntries([...missing.headers.entries()]);
    const ok = missing.status === 404 && /text\/html/i.test(headers['content-type'] || '')
      && missingBody.includes('<title>页面不存在｜自然选择号</title>')
      && missingBody.includes('这个页面不存在，或已经被移走。')
      && !/frame-ancestors|^X-Frame-Options/im.test(missingBody)
      && missing.url === url(p, true);
    okf('RO6', ok, { page: p, width: '线上', step: 'O6 未知路径保留 URL 并返回 404 提示页（含 MIME）', expect: '404 text/html + 页面不存在 + URL 保持原路径', actual: missing.status + ' ' + headers['content-type'] + ' ' + missing.url + ' ' + missingBody.slice(0, 60).replace(/\s+/g, ' '), handoff: 'Task 17／R13' });
  }
  for (const p of ['/foo/bar', '/foo/bar/']) {
    await metrics(1280, 900);
    await openPage(url(p, true));
    await sleep(500);
    const st = await js('(() => { var d=document; return JSON.stringify({url:location.pathname, title:d.title, h1:(d.querySelector("h1")||{}).textContent, message:(d.querySelector(".home-section__text")||{}).textContent, bg:getComputedStyle(d.body).backgroundColor, cls:d.documentElement.className, css:(d.querySelector("link[rel=stylesheet]")||{}).getAttribute("href"), script:(d.querySelector("script[defer]")||{}).getAttribute("src"), current:d.querySelectorAll("[aria-current]").length, nav:[].slice.call(d.querySelectorAll(".site-navigation__link")).map(function(a){return a.getAttribute("href");})}); })()');
    eq('RO6', p.split('?')[0], st.url, { page: p, width: '线上', step: 'O6 浏览器地址保留嵌套错误路径', expect: p, actual: st.url, handoff: 'Task 17／R13' });
    eq('RO6', '页面不存在｜自然选择号/页面不存在/' + C.PAPER + '/js/0', st.title + '/' + st.h1 + '/' + st.bg + '/' + st.cls + '/' + st.current, { page: p, width: '线上', step: 'O6 错误页内容、CSS、JS 与无高亮状态正确', expect: '标题+提示+CSP 自有资源正常', actual: st.title + '/' + st.h1 + '/' + st.bg + '/' + st.cls + '/' + st.current, handoff: 'Task 14／R13' });
    eq('RO6', ['/', '/news-message.html', '/news-feature.html', '/news-commentary.html', '/submission.html'], st.nav, { page: p, width: '线上', step: 'O6 错误页五项导航均使用根路径', expect: '/ + 三个栏目页 + 投稿页', actual: st.nav, handoff: 'Task 14／R13' });
  }
  eq('RO6', [], consoleErr, { page: '全站', width: '线上', step: 'O6 浏览器控制台 0 错误 0 未捕获异常（含真实标签页加载全部 HTML 页）', expect: '0 条', actual: consoleErr.join(' | ') || '0 条', handoff: 'Task 15' });
  eq('RO6', [], netLog.filter((n) => /^http:\/\//.test(String(n.u))), { page: '全站', width: '线上', step: 'O6 无混合内容：浏览器实际发出的资源请求全部 https', expect: '0 条 http:', actual: netLog.map((n) => n.u).slice(0, 4).join(' | ') + '（共 ' + netLog.length + ' 条，全 https）', handoff: 'Task 15' });
  for (const p of C.htmlPages) {
    await openPage(url('/' + p, true));
    await sleep(400);
    const bad = await js('(() => { var a=[].slice.call(document.querySelectorAll("a")); return JSON.stringify(a.map(function(e){return e.getAttribute("href");}).filter(function(h){return /[?]/.test(String(h)) || /^https?:|^\\//.test(String(h));})); })()');
    eq('RO6', [], bad, { page: p, width: '线上', step: '站内链接不带查询参数、不为绝对 URL（Task0 离线约束在线上同样成立；探针带的 ?cb 只是本脚本绕缓存用）', expect: '0 条', actual: (bad || []).join(',') || '0 条', handoff: 'Task 15' });
  }
  return { netLog, consoleErr, onlinePages, statuses };
}

/* ---------- 独立运行 ---------- */
if (process.argv[1] && path.resolve(process.argv[1]).endsWith('online_check.mjs')) {
  const { loadContract } = await import('./contract19.mjs');
  const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const HERE2 = HERE;
  const PORT = Number(process.env.QODER_CDP_PORT || 9371);
  const PROFILE = path.join(REPORT_DIR, '.cdpo' + PORT + '-' + Date.now());
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE,
    '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-dev-shm-usage', '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rows = []; const netLog = []; const consoleErr = [];
  const groupOf = (id) => 'R-O';
  const A = (id, pass, o = {}) => { const status = pass === 'rec' ? 'REC' : pass === 'skip' ? 'SKIPPED-BY-DESIGN' : (pass === true ? 'PASS' : 'FAIL'); rows.push(Object.assign({ id, group: o.group || groupOf(id), status }, o)); return status; };
  const eq = (id, expect, actual, o = {}) => A(id, JSON.stringify(expect) === JSON.stringify(actual), Object.assign({ expect, actual }, o));
  const okf = (id, pred, o = {}) => A(id, !!pred, o);
  const C = loadContract();
  let ws, mid = 0; const pending = new Map(); const listeners = [];
  const send = (method, params = {}) => new Promise((res, rej) => { const id = ++mid; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error('CDP 超时：' + method)); } }, 30000); });
  for (let i = 0; i < 120; i++) { try { const l = await fetch('http://127.0.0.1:' + PORT + '/json/list'); if (l.ok) break; } catch {} await sleep(250); }
  const list = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
  ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws 失败')); });
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.reject(new Error(JSON.stringify(d.error))) : p.res(d.result); return; } listeners.forEach((f) => { try { f(d); } catch {} }); };
  listeners.push((d) => {
    if (d.method === 'Network.responseReceived') netLog.push({ u: d.params.response.url, st: d.params.response.status });
    if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'warn'].includes(d.params.type)) consoleErr.push(String((d.params.args[0] || {}).value));
    if (d.method === 'Runtime.exceptionThrown') consoleErr.push(String((d.params.exceptionDetails || {}).text));
  });
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Log.enable');
  const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true }); return r.result ? r.result.value : undefined; };
  const js = async (e) => { const v = await ev(e); return typeof v === 'string' ? JSON.parse(v) : v; };
  const openPage = async (u) => { const w = new Promise((res) => { const h = (m) => { if (m.method === 'Page.loadEventFired') { const i = listeners.indexOf(h); if (i >= 0) listeners.splice(i, 1); res(true); } }; listeners.push(h); setTimeout(() => res(false), 20000); }); await send('Page.navigate', { url: u }); return await w; };
  const metrics = async (width, height) => { await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }); await sleep(150); };
  await onlinePass({ A, eq, okf, js, ev, openPage, metrics, sleep, NET: netLog, ERR: consoleErr }, C);
  const bad = rows.filter((r) => r.status === 'FAIL');
  fs.writeFileSync(path.join(REPORT_DIR, 'online_results.json'), JSON.stringify({ rows, net: netLog.length, consoleErr }, null, 1), 'utf8');
  fs.writeFileSync(path.join(REPORT_DIR, 'online_lines.txt'), rows.map((r) => '[' + r.id + '] [' + r.status + '] ' + r.page + ' — ' + r.width + ' — ' + r.step + ' — 期望 ' + (r.expect === undefined ? '' : JSON.stringify(r.expect)) + ' / 实际 ' + (r.actual === undefined ? '' : JSON.stringify(r.actual))).join('\n') + '\n\n合计 ' + rows.length + '：PASS ' + (rows.length - bad.length) + ' / FAIL ' + bad.length + '\n', 'utf8');
  process.stdout.write(bad.map((r) => 'FAIL ' + r.id + ' [' + r.page + '] ' + r.step + ' :: 期望 ' + JSON.stringify(r.expect) + ' / 实际 ' + JSON.stringify(r.actual) + '\n').join('') + '线上复验：' + (rows.length - bad.length) + ' PASS / ' + bad.length + ' FAIL\n');
  try { await send('Browser.close'); } catch {}
  try { proc.kill(); } catch {}
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch { /* Chrome 释放 profile 是异步的，清不掉不影响结论 */ }
  process.exit(bad.length ? 1 : 0);
}
