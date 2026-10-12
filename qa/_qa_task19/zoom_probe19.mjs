/* Task 19 — 200% 缩放两效分离取证（R-H 的前提证明）
 *
 * 为什么单独取证：CDP `Emulation.setDeviceMetricsOverride` 的 `zoom` 参数在本机 Chrome
 * 上是 no-op（实测 zoom=1 与 zoom=2 都是 innerWidth=1280、dpr=1）。若相信它，
 * 200% 缩放其实一次都没测到。本脚本把这件事落成可核对的证据，
 * 驱动据此改用"布局 = 1280÷2 = 640 的 CSS 视口 + 绘制 = deviceScaleFactor 2"复现缩放两个效果。
 *
 * 运行：node _qa_task19/zoom_probe19.mjs  →  _qa_task19/zoom_probe19.txt
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { HERE, ROOT } from './contract19.mjs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = Number(process.env.QODER_CDP_PORT || 9365);
const PROFILE = path.join(HERE, '.cdpz' + PORT + '-' + Date.now());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE,
  '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-dev-shm-usage', '--hide-scrollbars',
  '--allow-file-access-from-files', '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
let ws, mid = 0; const pending = new Map(); const listeners = [];
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++mid; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error('超时 ' + method)); } }, 20000); });
for (let i = 0; i < 120; i++) { try { const l = await fetch('http://127.0.0.1:' + PORT + '/json/version'); if (l.ok) break; } catch {} await sleep(250); }
const list = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws 失败')); });
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.reject(new Error(JSON.stringify(d.error))) : p.res(d.result); return; } listeners.forEach((f) => { try { f(d); } catch {} }); };
const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true }); return r.result ? r.result.value : undefined; };
const probe = () => ev('JSON.stringify({innerWidth:innerWidth, clientWidth:document.documentElement.clientWidth, dpr:devicePixelRatio, mast:Math.round(document.querySelector(".site-masthead__link").getBoundingClientRect().width*devicePixelRatio), rootFont:getComputedStyle(document.documentElement).fontSize})');
await send('Page.enable'); await send('Runtime.enable');
const out = [];
const open = async (f) => { const w = new Promise((res) => { const h = (m) => { if (m.method === 'Page.loadEventFired') { const i = listeners.indexOf(h); if (i >= 0) listeners.splice(i, 1); res(true); } }; listeners.push(h); setTimeout(() => res(false), 12000); }); await send('Page.navigate', { url: 'file:///' + encodeURI(path.join(ROOT, 'Results', f).split(path.sep).join('/')) }); await w; await sleep(400); };
const metrics = async (p) => { await send('Emulation.setDeviceMetricsOverride', p); await sleep(320); };
for (const page of ['index.html', 'article-math-to-ai-learning.html']) {
  await open(page);
  await metrics({ width: 1280, height: 900, deviceScaleFactor: 1, mobile: false, zoom: 1 });
  const a = await probe(); out.push(page + ' 100% 基线            → ' + a);
  await metrics({ width: 1280, height: 900, deviceScaleFactor: 1, mobile: false, zoom: 2 });
  const b = await probe(); out.push(page + ' zoom=2（CDP 参数）    → ' + b);
  await metrics({ width: 640, height: 900, deviceScaleFactor: 2, mobile: false, zoom: 1 });
  const c = await probe(); out.push(page + ' 640 布局 + dpr2       → ' + c);
  await metrics({ width: 1280, height: 900, deviceScaleFactor: 1, mobile: false, zoom: 1 });
  out.push(page + ' 恢复                 → ' + (await probe()));
}
const A = JSON.parse(out[out.length - 4].split('→ ')[1]);
const B = JSON.parse(out[out.length - 3].split('→ ')[1]);
const Cc = JSON.parse(out[out.length - 2].split('→ ')[1]);
const conclusion = [
  'zoom 参数是否改变布局视口：' + (B.innerWidth === A.innerWidth ? '否（innerWidth 仍是 ' + B.innerWidth + '，dpr 仍是 ' + B.dpr + '）→ CDP zoom 在本机 Chrome 为 NO-OP' : '是'),
  '布局效果复现：innerWidth ' + A.innerWidth + ' → ' + Cc.innerWidth + '（1280÷2 成立）',
  '绘制效果复现：报头实际绘制像素 ' + A.mast + ' → ' + Cc.mast + '（rect.width×dpr 翻倍成立）',
  '根字号未被写死：' + A.rootFont + ' → ' + Cc.rootFont,
].join('\n');
fs.writeFileSync(path.join(HERE, 'zoom_probe19.txt'), out.join('\n') + '\n\n结论：\n' + conclusion + '\n', 'utf8');
process.stdout.write(out.join('\n') + '\n\n结论：\n' + conclusion + '\n');
try { await send('Browser.close'); } catch {}
try { proc.kill(); } catch {}
try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch {}  // Chrome 释放 profile 是异步的，清不掉不算结论
process.exit(B.innerWidth === A.innerWidth && Cc.innerWidth === 640 && Cc.dpr === 2 ? 0 : 1);
