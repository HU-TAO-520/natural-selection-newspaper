/* Task 16 像素采样与固定宽度截图
 * 为什么必须看像素：Chrome 对已访问链接的 getComputedStyle().color 按隐私规则返回"未访问"颜色，
 * 且 visited 样式是异步解析的（加载后 0～4s 常仍是基线色）。:visited 是否成立只能由屏幕像素定论。
 * 截图驱动沿用本项目既有做法：--screenshot 与 --user-data-dir 必须绝对路径，且用同步固定宽度
 * iframe 的 shot.html 回读真实视口（<title>ready:{clientWidth}</title>）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pngDecode } from '../_qa_task11/png.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.dirname(HERE);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

export const COLORS = {
  paper: [0xf5, 0xef, 0xe4],
  ink: [0x21, 0x1f, 0x1c],
  accent: [0x7a, 0x24, 0x24],
  muted: [0x66, 0x5d, 0x56],
  rule: [0xb8, 0xaa, 0x98],
  uaVisited: [0x55, 0x1a, 0x8b],
};
export const dist = (a, b) => Math.round(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));

/** 取与纸色距离最大的前 pct 像素求均值——即文字笔画主色（抗锯齿边缘离纸色近，被自然排除）。 */
export function textPixel(png, pct) {
  const { w, h, ch, data } = pngDecode(fs.readFileSync(png));
  const px = [];
  for (let i = 0; i < w * h; i++) {
    const p = [data[i * ch], data[i * ch + 1], data[i * ch + 2]];
    px.push({ p, d: dist(p, COLORS.paper) });
  }
  px.sort((a, b) => b.d - a.d);
  const n = Math.max(1, Math.round(px.length * (pct || 0.02)));
  const sum = [0, 0, 0];
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) sum[k] += px[i].p[k];
  const mean = sum.map((v) => Math.round(v / n));
  const named = {};
  for (const [k, v] of Object.entries(COLORS)) if (k !== 'paper') named[k] = dist(mean, v);
  const nearest = Object.entries(named).sort((a, b) => a[1] - b[1])[0];
  return { png: path.relative(ROOT, png).replace(/\\/g, '/'), w, h, sampled: n, mean: '#' + mean.map((v) => v.toString(16).padStart(2, '0')).join(''), distances: named, nearest: nearest[0], nearestDistance: nearest[1] };
}

export function shot(urlOrFile, outPng, width, height) {
  const absOut = path.resolve(outPng);
  fs.mkdirSync(path.dirname(absOut), { recursive: true });
  const profile = path.resolve(path.dirname(absOut), '_profile_shot');
  const dom = execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--allow-file-access-from-files', '--window-size=' + (width + 40) + ',' + (height || 1400),
    '--user-data-dir=' + profile, '--virtual-time-budget=6000',
    '--screenshot=' + absOut, '--dump-dom', urlOrFile,
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const title = (dom.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  if (!fs.existsSync(absOut)) throw new Error('截图未产出：' + absOut);
  return { png: absOut, bytes: fs.statSync(absOut).size, title };
}

if (import.meta.url === 'file://' + fileURLToPath(import.meta.url).replace(/\\/g, '/') && process.argv[2] === 'selftest') {
  const r = textPixel(process.argv[3]);
  console.log(JSON.stringify(r, null, 1));
}
