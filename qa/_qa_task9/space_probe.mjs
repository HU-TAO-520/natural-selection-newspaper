/* Replicates the main driver's exact T4 order (Tab x N, Enter, Enter, Space, Space) with an
   event trace on #nav-toggle, to locate where a synthetic Space activation is lost. QA-only. */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS = path.join(path.dirname(HERE), 'Results');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9345;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const url = 'file:///' + encodeURI(RESULTS.split(path.sep).join('/'));

const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${path.join(HERE, '.cdp3')}`, '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--allow-file-access-from-files', '--window-size=1300,900', 'about:blank'], { stdio: 'ignore' });

let ws, mid = 0; const pending = new Map(); const listeners = [];
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = ++mid; pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params }));
});
async function ev(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
}
const key = (type, extra) => send('Input.dispatchKeyEvent', { type, ...extra });
const ENTER = { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 };
const SPACE = { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 };
const SNAP = `(() => { const t=document.getElementById('nav-toggle'),n=document.getElementById('site-navigation');
  return JSON.stringify({open:n.classList.contains('is-open'),aria:t.getAttribute('aria-expanded'),
  clicks:window.__clicks,active:(document.activeElement.id||document.activeElement.tagName),
  y:Math.round(scrollY),tr:window.__tr}); })()`;

async function press(label, base) {
  await ev('window.__tr=[]; window.__clicks=0');
  await key('keyDown', base);
  await sleep(80);
  await key('keyUp', { key: base.key, code: base.code, windowsVirtualKeyCode: base.windowsVirtualKeyCode });
  await sleep(140);
  console.log(label.padEnd(16), await ev(SNAP));
}

async function main() {
  for (let i = 0; i < 120; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break; } catch {} await sleep(250); }
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  ws.onmessage = (m) => { const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(JSON.stringify(d.error))) : p.res(d.result); return; }
    if (d.method) listeners.slice().forEach((f) => f(d)); };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  const loaded = new Promise((r) => { const h = (m) => { if (m.method === 'Page.loadEventFired') { listeners.splice(listeners.indexOf(h), 1); r(); } }; listeners.push(h); setTimeout(r, 12000); });
  await send('Page.navigate', { url: url + '/index.html' });
  await loaded; await sleep(400);

  await ev(`window.__tr=[];window.__clicks=0;const b=document.getElementById('nav-toggle');
    b.addEventListener('click',()=>{window.__clicks++;window.__tr.push('click');});
    ['keydown','keyup'].forEach(t=>b.addEventListener(t,e=>window.__tr.push(t+':'+e.key)));
    document.addEventListener('keydown',e=>window.__tr.push('doc:'+e.key),true);`);
  for (let k = 0; k < 4 && !(JSON.parse(await ev(SNAP)).active.includes('nav-toggle')); k++) {
    await key('rawKeyDown', { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await sleep(80);
    await key('keyUp', { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await sleep(140);
  }
  console.log('after Tab loop ', await ev(SNAP));

  await press('Enter#1', { ...ENTER, text: '\r' });
  await press('Enter#2', { ...ENTER, text: '\r' });
  await press('Space#1', { ...SPACE, text: ' ' });
  await press('Space#2', { ...SPACE, text: ' ' });
  await press('Space#3 keyonly', { ...SPACE });
  await press('Space#4 rawkey+char', { ...SPACE });
  try { await send('Browser.close'); } catch {}
  ws.close(); proc.kill(); process.exit(0);
}
main().catch((e) => { console.log('ERR', e && (e.stack || e)); try { proc.kill(); } catch {} process.exit(1); });
