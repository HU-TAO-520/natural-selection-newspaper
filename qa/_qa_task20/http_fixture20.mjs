import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const RUN = path.resolve(process.env.QODER_RUN_DIR || path.join(HERE, 'runs', 'fixture'));
const headersFile = path.join(ROOT, 'deploy', '_headers');
const rawHeaders = fs.readFileSync(headersFile, 'utf8');
const securityHeaders = Object.fromEntries([...rawHeaders.matchAll(/^\s+([A-Za-z0-9-]+):\s*(.+)\s*$/gm)]
  .map((match) => [match[1], match[2].trim()]));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const records = [];
const apps = [
  { name: 'main', root: path.join(ROOT, 'Results'), port: 9390, fallback: '404.html' },
  { name: 'preview', root: path.join(ROOT, 'deploy', 'easteregg'), port: 9391, fallback: '404.html' },
];
const servers = [];

function appServer(app) {
  return http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://127.0.0.1:${app.port}`);
    if (url.pathname === '/__qa/stop') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end('fixture stopping');
      setTimeout(() => stop().finally(() => process.exit(0)), 50);
      return;
    }
    const decoded = decodeURIComponent(url.pathname);
    const rel = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
    const resolved = path.resolve(app.root, rel);
    const insideRoot = resolved.startsWith(path.resolve(app.root) + path.sep);
    const file = insideRoot && fs.existsSync(resolved) && fs.statSync(resolved).isFile()
      ? resolved : path.join(app.root, app.fallback);
    const status = file === resolved ? 200 : 404;
    const body = fs.readFileSync(file);
    const mimeType = mime[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(status, { ...securityHeaders, 'Content-Type': mimeType, 'Content-Length': body.length,
      'Cache-Control': 'no-store', 'X-Task20-Fixture': app.name });
    res.end(body);
    records.push({ target: app.name, method: req.method, path: url.pathname, status, file: path.relative(app.root, file).replaceAll(path.sep, '/'),
      contentType: mimeType, csp: securityHeaders['Content-Security-Policy'] || null });
  });
}

for (const app of apps) {
  const server = appServer(app);
  await new Promise((resolve, reject) => server.listen(app.port, '127.0.0.1', resolve).once('error', reject));
  servers.push(server);
}
console.log(JSON.stringify({ state: 'ready', endpoints: apps.map((app) => `http://127.0.0.1:${app.port}/`),
  csp: securityHeaders['Content-Security-Policy'], protectedHeadersSha256: (await import('node:crypto')).createHash('sha256').update(fs.readFileSync(headersFile)).digest('hex') }));

let closing = false;
if (process.argv.includes('--smoke')) {
  const checks = [];
  const recordCheck = (id, ok, expected, actual) => checks.push({ id, status: ok ? 'PASS' : 'FAIL', expected, actual });
  for (const app of apps) {
    const base = `http://127.0.0.1:${app.port}`;
    const landingPath = app.name === 'main' ? '/easteregg.html' : '/';
    const landing = await fetch(base + landingPath);
    const landingText = await landing.text();
    const expectedTitle = '自然选择号：最后的回波';
    const title = landingText.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
    const h1 = landingText.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] || '';
    recordCheck(`${app.name}-landing`, landing.status === 200 && title === expectedTitle && h1 === '自然选择号：最后的回波',
      { status: 200, title: expectedTitle, h1: '自然选择号：最后的回波' }, { status: landing.status, title, h1 });
    recordCheck(`${app.name}-landing-csp`, landing.headers.get('content-security-policy') === securityHeaders['Content-Security-Policy'],
      securityHeaders['Content-Security-Policy'], landing.headers.get('content-security-policy'));

    const cssPath = landingText.match(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/)?.[1];
    const jsPath = landingText.match(/<script\b[^>]*src="([^"]+\.js)"[^>]*>/)?.[1];
    for (const [kind, ref] of [['css', cssPath], ['js', jsPath]]) {
      const url = ref && new URL(ref, base + landingPath);
      const response = ref ? await fetch(url) : null;
      recordCheck(`${app.name}-${kind}`, !!response && response.status === 200 && url.origin === base,
        { status: 200, sameOrigin: true }, { status: response?.status ?? null, url: url?.href ?? null });
    }
    const badPaths = app.name === 'preview' ? ['/__task20_missing', '/nested/__task20_missing'] : ['/__task20_missing'];
    for (const badPath of badPaths) {
      const response = await fetch(base + badPath);
      const body = await response.text();
      const expectedErrorTitle = app.name === 'main' ? '页面不存在｜自然选择号' : '档案不存在｜自然选择号';
      const errorTitle = body.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
      const errorCss = body.match(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/)?.[1] || '';
      const errorIdentity = body.includes(app.name === 'main' ? '页面不存在</h1>' : '档案不存在</h1>');
      const cssResponse = errorCss ? await fetch(new URL(errorCss, base + badPath)) : null;
      const cssOk = !!cssResponse && cssResponse.status === 200 && new URL(errorCss, base + badPath).origin === base;
      recordCheck(`${app.name}-404-${badPath}`, response.status === 404 && errorTitle === expectedErrorTitle && errorIdentity && cssOk,
        { status: 404, title: expectedErrorTitle, css: 'same-origin and 200' },
        { status: response.status, title: errorTitle, errorIdentity, cssStatus: cssResponse?.status ?? null, errorCss });
      recordCheck(`${app.name}-404-csp-${badPath}`, response.headers.get('content-security-policy') === securityHeaders['Content-Security-Policy'],
        securityHeaders['Content-Security-Policy'], response.headers.get('content-security-policy'));
    }
  }
  fs.mkdirSync(RUN, { recursive: true });
  fs.writeFileSync(path.join(RUN, 'http_fixture_smoke.json'), JSON.stringify({ checks, summary: {
    pass: checks.filter((row) => row.status === 'PASS').length,
    fail: checks.filter((row) => row.status === 'FAIL').length
  } }, null, 2) + '\n');
  await stop();
  const fail = checks.filter((row) => row.status === 'FAIL');
  console.log(`HTTP fixture smoke: PASS=${checks.length - fail.length} FAIL=${fail.length}`);
  for (const row of fail) console.log(`FAIL ${row.id}: ${JSON.stringify(row.actual)}`);
  process.exit(fail.length === 0 ? 0 : 1);
}

async function stop() {
  if (closing) return;
  closing = true;
  await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
  fs.mkdirSync(RUN, { recursive: true });
  fs.writeFileSync(path.join(RUN, 'http_fixture_requests.json'), JSON.stringify({ records, csp: securityHeaders['Content-Security-Policy'], headersSha256: (await import('node:crypto')).createHash('sha256').update(fs.readFileSync(headersFile)).digest('hex') }, null, 2) + '\n');
}
process.on('SIGINT', () => stop().finally(() => process.exit(0)));
process.on('SIGTERM', () => stop().finally(() => process.exit(0)));
