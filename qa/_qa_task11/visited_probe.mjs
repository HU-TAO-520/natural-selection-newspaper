/* 独立探针：:visited 在本站点到底何时生效、生效成什么颜色。
 * 场景 = 真实用户依次点开四个页面后回到首页：全新 profile → 真实点击导航 → 时间线轮询颜色。
 * 目的：把「报头/导航链接变暗红」这一只有真实浏览器 + 真实历史才暴露的现象，
 * 给出可复现的时间线与截图证据（Task 11 只记录，不修复）。
 */
import { spawn } from 'node:child_process';
import fileURL from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const HERE = path.dirname(fileURL.fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const RESULTS = path.join(ROOT, 'Results');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = Number(process.env.QODER_CDP_PORT || 9471);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const furl = (p) => 'file:///' + encodeURI(p.split(path.sep).join('/'));

const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.join(HERE, '.visitedprobe' + PORT)}`,
  '--disable-gpu', '--no-sandbox', '--no-first-run', '--allow-file-access-from-files', '--hide-scrollbars', '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
let ws, mid = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++mid; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
for (let i = 0; i < 160; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break; } catch {} await sleep(250); }
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(JSON.stringify(d.error))) : p.res(d.result); } };
await send('Runtime.enable'); await send('Page.enable'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

const READ = '(() => { const c = (e) => getComputedStyle(e).color; const links = [].slice.call(document.querySelectorAll(".site-navigation__link")); return JSON.stringify({ file: location.pathname.split("/").pop(), mast: c(document.querySelector(".site-masthead__link")), nav: links.map(a => [a.textContent, c(a), a.getAttribute("aria-current") || "-"]), accentRule: [].slice.call(document.styleSheets[0].cssRules).filter(r => /:visited|^a \\{/.test(r.selectorText || "")).map(r => r.cssText.slice(0, 60)) }); })()';
async function read(label) { const r = await send('Runtime.evaluate', { expression: READ, returnByValue: true }); return Object.assign({ t: label }, JSON.parse(r.result.value)); }
async function click(sel) {
  const b = await send('Runtime.evaluate', { expression: `(() => { const r = document.querySelector('${sel}').getBoundingClientRect(); return JSON.stringify({x: r.x + r.width / 2, y: r.y + r.height / 2}); })()`, returnByValue: true });
  const o = JSON.parse(b.result.value);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: o.x, y: o.y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: o.x, y: o.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: o.x, y: o.y, button: 'left', clickCount: 1 });
  await sleep(900);
}
const out = [];
await send('Page.navigate', { url: furl(path.join(RESULTS, 'index.html')) }); await sleep(1200);
out.push(await read('① 冷历史：刚打开首页'));
for (const i of [2, 3, 4]) { await click(`#site-navigation li:nth-child(${i}) a`); out.push(await read(`② 点击第 ${i} 项后落地页`)); await click('#site-navigation li:nth-child(1) a'); }
out.push(await read('③ 真实点击访问全部四页后回到首页'));
for (const k of [1, 2, 4, 8]) { await sleep(k === 1 ? 500 : k * 1000); out.push(await read(`④ 回到首页后再等 ${k === 1 ? 0.5 : k}s`)); }
await send('Page.navigate', { url: furl(path.join(RESULTS, 'index.html')) }); await sleep(1500);
out.push(await read('⑤ 重新加载首页（历史已含四页）'));
const shot = await send('Page.captureScreenshot', { format: 'png' });
fs.mkdirSync(path.join(HERE, 'shots'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'shots', 'visited-probe-index-1280.png'), Buffer.from(shot.data, 'base64'));
process.stdout.write(out.map((o) => `${o.t}\n  页面=${o.file} 报头=${o.mast}\n  导航=${JSON.stringify(o.nav)}`).join('\n') + '\n\n规则表：\n' + JSON.stringify(out[0].accentRule, null, 1) + '\n');
try { await send('Browser.close'); } catch {}
proc.kill();
