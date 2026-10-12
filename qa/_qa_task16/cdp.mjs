/* Task 16 共用 CDP 客户端（零依赖：Node 自带 WebSocket + fetch）
 * 为什么走 CDP：--dump-dom + --virtual-time-budget 不会为"iframe 反复 resize 后测量"这种
 * 真实事件循环 settle（探针会停在 running）；CDP 是权威手段，且
 * Emulation.setDeviceMetricsOverride 能给出真实 375px 视口（顶层窗口有约 500px 下限）。
 */
import path from 'node:path';
import { spawn } from 'node:child_process';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const toUrl = (p) => 'file:///' + encodeURI(String(p).replace(/\\/g, '/')) + '';
export const dirOf = (p) => path.dirname(p);

export async function openBrowser(port, userDataDir, extraArgs) {
  const proc = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${userDataDir}`,
    '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-dev-shm-usage',
    '--allow-file-access-from-files', '--force-device-scale-factor=1', '--hide-scrollbars',
    '--window-size=1400,1200', ...(extraArgs || []), 'about:blank',
  ], { stdio: 'ignore' });

  let ws, mid = 0;
  const pending = new Map();
  const events = { console: [], exceptions: [], log: [], requests: [], failures: [], navigations: 0, loads: 0 };
  const send = (method, params) => new Promise((resolve, reject) => {
    const id = ++mid;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params: params || {} }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error(method + ' 超时 30s')); } }, 30000);
  });

  for (let i = 0; i < 200; i++) {
    try { const l = await fetch(`http://127.0.0.1:${port}/json/version`); if (l.ok) break; } catch (e) { /* 等待启动 */ }
    await sleep(250);
  }
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = list.find((t) => t.type === 'page');
  if (!target) { proc.kill(); throw new Error('没有可连的页面目标'); }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('WebSocket 连接失败')); });
  ws.onmessage = (msg) => {
    const p = JSON.parse(msg.data);
    if (p.id && pending.has(p.id)) {
      const q = pending.get(p.id); pending.delete(p.id);
      p.error ? q.reject(new Error(p.error.message)) : q.resolve(p.result);
      return;
    }
    try {
      if (p.method === 'Page.loadEventFired') events.loads++;
      else if (p.method === 'Page.frameNavigated' && !p.params.frame.parentId) events.navigations++;
      else if (p.method === 'Runtime.consoleAPICalled') events.console.push({ type: p.params.type, text: (p.params.args || []).map((a) => a.value ?? a.description ?? a.type).join(' ') });
      else if (p.method === 'Runtime.exceptionThrown') events.exceptions.push({ text: p.params.exceptionDetails?.exception?.description || p.params.exceptionDetails?.text || '', line: p.params.exceptionDetails?.lineNumber });
      else if (p.method === 'Log.entryAdded') events.log.push({ level: p.params.entry.level, source: p.params.entry.source, text: p.params.entry.text, url: p.params.entry.url });
      else if (p.method === 'Network.requestWillBeSent') events.requests.push(p.params.request.url);
      else if (p.method === 'Network.loadingFailed') events.failures.push({ requestId: p.params.requestId, error: p.params.errorText, type: p.params.type, blocked: p.params.blockedReason });
    } catch (e) {
      events.log.push({ level: 'error', source: 'probe', text: '监听器异常 ' + String(e && e.message) });
    }
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');
  await send('Network.enable');

  return {
    proc, events, send,
    async navigate(urlOrPath, waitMs) {
      const url = /^file:|^about:|^https?:/.test(urlOrPath) ? urlOrPath : toUrl(urlOrPath);
      const before = events.loads;
      await send('Page.navigate', { url });
      for (let i = 0; i < 120 && events.loads === before; i++) await sleep(50);
      await sleep(waitMs === undefined ? 320 : waitMs);
      return url;
    },
    async evaluate(expression) {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error('探针异常：' + JSON.stringify(r.exceptionDetails).slice(0, 300));
      return r.result ? r.result.value : undefined;
    },
    async setMetrics(width, height, deviceScaleFactor) {
      await send('Emulation.setDeviceMetricsOverride', {
        width, height: height || 900, deviceScaleFactor: deviceScaleFactor || 1, mobile: false,
      });
      await sleep(160);
    },
    async clearMetrics() { await send('Emulation.clearDeviceMetricsOverride', {}); },
    async screenshot(clip) {
      const params = { format: 'png' };
      if (clip) params.clip = { x: clip.x, y: clip.y, width: clip.w, height: clip.h, scale: clip.scale || 1 };
      if (clip && clip.full) params.captureBeyondViewport = true;
      const r = await send('Page.captureScreenshot', params);
      return Buffer.from(r.data, 'base64');
    },
    async setCacheDisabled(v) { await send('Network.setCacheDisabled', { cacheDisabled: !!v }); },
    close() { try { ws.close(); } catch (e) {} proc.kill(); }
  };
}
