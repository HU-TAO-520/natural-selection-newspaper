/* 结论性探针：本渲染环境能否用真实「浏览器缩放」改变 CSS 视口？
 * 依次尝试 CDP zoom 参数、zoom+deviceScaleFactor、--force-device-scale-factor，
 * 记录 innerWidth/clientWidth/dpr/visualViewport.scale/报头实际像素，判定 Task 11 R-H 应采用哪种机制。
 */
import { spawn } from 'node:child_process';
import fileURL from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURL.fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const TARGET = 'file:///' + encodeURI(path.join(ROOT, 'Results', 'index.html').split(path.sep).join('/'));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(port, extraArgs, overrides) {
  const proc = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(HERE, '.zoomprobe' + port)}`,
    '--disable-gpu', '--no-sandbox', '--no-first-run', '--allow-file-access-from-files', '--window-size=1400,1000', 'about:blank',
    ...extraArgs,
  ], { stdio: 'ignore' });
  let ws;
  for (let i = 0; i < 120; i++) { try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break; } catch {} await sleep(250); }
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let mid = 0; const pending = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(JSON.stringify(d.error))) : p.res(d.result); } };
  const send = (method, params = {}) => new Promise((res, rej) => { const id = ++mid; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
  const out = { label: overrides.label, args: extraArgs.join(' ') };
  try {
    await send('Runtime.enable'); await send('Page.enable');
    for (const o of overrides.cases) {
      if (o.set) { try { await send('Emulation.setDeviceMetricsOverride', o.set); } catch (e) { out.paramError = String(e.message).slice(0, 120); } }
      await send('Page.navigate', { url: TARGET });
      await sleep(1200);
      const v = await send('Runtime.evaluate', { expression: 'JSON.stringify({inner: innerWidth, client: document.documentElement.clientWidth, dpr: devicePixelRatio, vvScale: (window.visualViewport && window.visualViewport.scale) || null, vvW: (window.visualViewport && Math.round(window.visualViewport.width)) || null, mastFs: getComputedStyle(document.querySelector(".site-masthead__link")).fontSize, mastPx: Math.round(document.querySelector(".site-masthead__link").getBoundingClientRect().width * devicePixelRatio), layoutMax: Math.round(document.querySelector(".site-header__inner").getBoundingClientRect().width)})', returnByValue: true });
      out[o.name] = JSON.parse(v.result.value);
    }
  } catch (e) { out.err = String(e.message).slice(0, 160); }
  try { await send('Browser.close'); } catch {}
  proc.kill();
  return out;
}

const results = [];
results.push(await run(9381, [], {
  label: 'CDP setDeviceMetricsOverride zoom / deviceScaleFactor',
  cases: [
    { name: 'w1280 zoom=1 dsf=1', set: { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false, zoom: 1 } },
    { name: 'w1280 zoom=2 dsf=1', set: { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false, zoom: 2 } },
    { name: 'w1280 zoom=2 dsf=2', set: { width: 1280, height: 900, deviceScaleFactor: 2, mobile: false, zoom: 2 } },
    { name: 'w1280 dsf=2 only', set: { width: 1280, height: 900, deviceScaleFactor: 2, mobile: false } },
    { name: 'w640 equivalent', set: { width: 640, height: 900, deviceScaleFactor: 1, mobile: false } },
    { name: 'w640 dsf=2 (200% 合成)', set: { width: 640, height: 900, deviceScaleFactor: 2, mobile: false } },
  ],
}));
results.push(await run(9382, ['--force-device-scale-factor=2'], {
  label: '命令行 --force-device-scale-factor=2（HiDPI，非缩放）',
  cases: [{ name: 'launch dsf2', set: { width: 1280, height: 900, deviceScaleFactor: 0, mobile: false } }],
}));
process.stdout.write(JSON.stringify(results, null, 1) + '\n');
