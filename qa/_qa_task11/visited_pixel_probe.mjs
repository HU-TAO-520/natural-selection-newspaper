/* :visited 像素级 A/B：同一个元素、同一个页面，唯一变量是「目标页是否被访问过」。
 * 冷：全新 profile 只打开过 index.html → 新闻评论链接的目标尚未访问。
 * 热：真实点击访问 news-commentary.html 后回到 index.html → 同一链接再测。
 * 同时打印 getComputedStyle 的读数，用来暴露「脚本读数与屏幕像素不一致」这一验证陷阱。
 */
import { spawn } from 'node:child_process';
import fileURL from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { pngDecode, inkColorOf } from './png.mjs';

const HERE = path.dirname(fileURL.fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const RESULTS = path.join(ROOT, 'Results');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = Number(process.env.QODER_CDP_PORT || 9481);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const furl = (p) => 'file:///' + encodeURI(p.split(path.sep).join('/'));

const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.join(HERE, '.visitpixel' + PORT)}`,
  '--disable-gpu', '--no-sandbox', '--no-first-run', '--allow-file-access-from-files', '--hide-scrollbars', '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
let ws, mid = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++mid; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
for (let i = 0; i < 160; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break; } catch {} await sleep(250); }
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.res(null) : p.res(d.result); } };
await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

async function box(sel) {
  const r = await send('Runtime.evaluate', { expression: '(() => { const e = document.querySelector(' + JSON.stringify(sel) + '); const b = e.getBoundingClientRect(); return JSON.stringify({x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height), text: e.textContent.trim()}); })()', returnByValue: true });
  return JSON.parse(r.result.value);
}
async function computed(sel) {
  const r = await send('Runtime.evaluate', { expression: 'getComputedStyle(document.querySelector(' + JSON.stringify(sel) + ')).color', returnByValue: true });
  return r.result.value;
}
async function painted(sel, tag) {
  const b = await box(sel);
  const s = await send('Page.captureScreenshot', { format: 'png', clip: { x: b.x, y: b.y, width: Math.max(6, b.width), height: Math.max(6, b.height), scale: 1 } });
  if (!s || !s.data) return { err: '截图失败' };
  fs.mkdirSync(path.join(HERE, 'shots', 'crops'), { recursive: true });
  fs.writeFileSync(path.join(HERE, 'shots', 'crops', tag + '.png'), Buffer.from(s.data, 'base64'));
  return Object.assign({ sel, text: b.text, box: [b.x, b.y, b.width, b.height], css: await computed(sel) }, inkColorOf(pngDecode(Buffer.from(s.data, 'base64'))));
}
async function goto(f) { await send('Page.navigate', { url: furl(path.join(RESULTS, f)) }); await sleep(1300); }

const rows = [];
await goto('index.html');
rows.push(['冷：只打开过 index.html', await painted('.site-masthead__link', 'cold-mast'), await painted('#site-navigation li:nth-child(4) .site-navigation__link', 'cold-link4')]);
await goto('news-commentary.html');
await goto('index.html');
rows.push(['热：news-commentary.html 已被访问', await painted('.site-masthead__link', 'hot-mast'), await painted('#site-navigation li:nth-child(4) .site-navigation__link', 'hot-link4')]);
await goto('news-message.html');
await goto('news-feature.html');
await goto('index.html');
const all = [];
for (const i of [1, 2, 3, 4]) all.push(await painted('#site-navigation li:nth-child(' + i + ') .site-navigation__link', 'warm-link' + i));

const fmt = (p) => (p && !p.err ? `屏幕像素=${p.verdict} rgb(${p.rgb.join(',')}) 红度=${p.redness} 距ink=${p.distInk} 距accent=${p.distAccent}｜getComputedStyle=${p.css}` : JSON.stringify(p));
for (const [label, mast, link4] of rows) {
  process.stdout.write(`\n${label}\n  报头 .site-masthead__link：${fmt(mast)}\n  第4项 新闻评论：      ${fmt(link4)}\n`);
}
process.stdout.write('\n四页全部访问后，首页四个导航链接的屏幕像素：\n');
for (const p of all) process.stdout.write(`  ${p.text}：${fmt(p)}\n`);
const shot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(HERE, 'shots', 'visited-pixel-index-1280.png'), Buffer.from(shot.data, 'base64'));
try { await send('Browser.close'); } catch {}
proc.kill();
