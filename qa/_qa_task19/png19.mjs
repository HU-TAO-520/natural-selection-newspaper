/* Task 19 — 最小 PNG 解码与纸底文字配色采样（R-N 唯一判据来源）
 *
 * 为什么必须走像素：Chrome 的 getComputedStyle().color 对 :visited 链接按隐私规则返回
 * 「未访问」色，脚本读到的值与屏幕上真实颜色可以不一致。Task 19 的已访问态配色
 * 一律以本页的像素簇定论（静态面由 Task 18 的 H13 负责，两条链互相独立）。
 *
 * 与 _qa_task11/png.mjs 的关系：解码算法同源（8bit RGB/RGBA、无交错），但这里
 * 按 Task19 §配色取样 的口径显式接收 paper/ink/accent 三个参照色（由驱动从
 * Results/styles.css 的 :root 解析所得），不在本文件里写死任何颜色字面量。
 */
import zlib from 'node:zlib';

export function pngDecode(buf) {
  let pos = 8;
  let w = 0, h = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat = [];
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const chunk = buf.slice(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = chunk.readUInt32BE(0); h = chunk.readUInt32BE(4); bitDepth = chunk[8]; colorType = chunk[9]; interlace = chunk[12]; }
    else if (type === 'IDAT') idat.push(chunk);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2) || interlace !== 0) {
    throw new Error('不支持的 PNG 变体：depth=' + bitDepth + ' colorType=' + colorType + ' interlace=' + interlace);
  }
  const ch = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(stride * h);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[p++];
    const line = raw.slice(p, p + stride); p += stride;
    const cur = out.slice(y * stride, y * stride + stride);
    const prev = y ? out.slice((y - 1) * stride, (y - 1) * stride + stride) : Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0, b = prev[x], c = x >= ch ? prev[x - ch] : 0;
      let v = line[x];
      if (ft === 1) v += a; else if (ft === 2) v += b; else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      cur[x] = v & 0xff;
    }
  }
  return { w, h, ch, data: out };
}

/* 在整屏 PNG 上按矩形切像素并聚类。
 * 为什么不用 CDP 的 clip 参数：本机 headless Chrome 的 `captureScreenshot({clip})`
 * 会把部分区域拍成纯纸色（实测首页最新区第 1、3 条 clip 出来 0 个非纸像素，
 * 同一次快照整屏拍下来再按同一矩形切片则正好是 rgb(33,31,28)）。
 * 拍一张整屏、在 Node 里切矩形，既避开该缺陷，又保证"看到的确实就是屏幕上那块"。
 *
 * 空样本不当结论：区内几乎没有非纸像素时返回专门的状态，
 * 绝不退回"按距离定类"——纯纸色按距离会被判成"暗红"，那会让一条没测到东西的
 * 判据冒充测到了。 */
export function sampleRegion(png, x, y, w, h, ref, pct = 0.02, minInkRatio = 0.005) {
  const { data, ch, w: PW, h: PH } = png;
  const px = [];
  let nonPaper = 0;
  for (let row = Math.max(0, Math.floor(y)); row < Math.min(PH, Math.ceil(y + h)); row++) {
    for (let col = Math.max(0, Math.floor(x)); col < Math.min(PW, Math.ceil(x + w)); col++) {
      const i = (row * PW + col) * ch;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (ch === 4 && data[i + 3] === 0) continue;
      const d = Math.abs(r - ref.paper[0]) + Math.abs(g - ref.paper[1]) + Math.abs(b - ref.paper[2]);
      if (d > 40) nonPaper++;
      px.push([d, r, g, b]);
    }
  }
  if (!px.length) return { verdict: '取样区落在视口外', cluster: 0, samplePoints: 0, distInk: null, distAccent: null, distBrowserPurple: null };
  if (nonPaper / px.length < minInkRatio) {
    return { verdict: '取样区无非纸像素（未测到字形，不作配色结论）', cluster: nonPaper, samplePoints: px.length, rgb: [ref.paper[0], ref.paper[1], ref.paper[2]], distInk: null, distAccent: null, distBrowserPurple: null };
  }
  px.sort((a, b) => b[0] - a[0]);
  const top = px.slice(0, Math.max(6, Math.round(px.length * pct)));
  const avg = [0, 1, 2].map((k) => top.reduce((s, q) => s + q[k + 1], 0) / top.length);
  const d = (t) => Math.round(Math.sqrt(avg.reduce((s, v, k) => s + (v - t[k]) ** 2, 0)));
  const dInk = d(ref.ink), dAccent = d(ref.accent), dPurple = d([0, 0, 238]);
  return {
    rgb: avg.map((v) => Math.round(v)),
    cluster: top.length,
    samplePoints: px.length,
    nonPaper,
    redness: Math.round((avg[0] - (avg[1] + avg[2]) / 2) * 10) / 10,
    distInk: dInk, distAccent: dAccent, distBrowserPurple: dPurple,
    ...classify(avg, ref.ink, ref.accent),
  };
}

const dist = (a, b) => Math.round(Math.sqrt(a.reduce((s, v, k) => s + (v - b[k]) ** 2, 0)));

/* 判色口径（R12 期修订，两处取样函数共用，避免分叉）：
   裸 RGB 最近邻在 63 vs 64 这种量级上等于抛硬币——次像素渲染会在字形边缘打出 b>g 的色边，
   而 ink 与纸色的任何混合都不可能 b>g。故两步判：
   ① 明显偏蓝紫 → 判"非 ink 链接色"，保住"丢了 :visited 退回默认色"这类变异必须有牙；
   ② 其余按色度比 redness/sum 定调（对"文字被纸色冲淡"不敏感：ink 与 accent 的比值差一个量级）。 */
export function classify(avg, ink, accent) {
  const sum = avg[0] + avg[1] + avg[2];
  const ratio = (a) => (a[0] - (a[1] + a[2]) / 2) / Math.max(1, a[0] + a[1] + a[2]);
  const rr = Math.round(ratio(avg) * 1000) / 1000;
  const blueExcess = Math.round((avg[2] - (avg[0] + avg[1]) / 2) * 10) / 10;
  const rInk = Math.round(ratio(ink) * 1000) / 1000;
  const rAcc = Math.round(ratio(accent) * 1000) / 1000;
  const verdict = blueExcess > 25 ? '浏览器默认链接色(蓝紫)' : (Math.abs(rr - rAcc) < Math.abs(rr - rInk) ? '暗红(accent)' : '深色(ink)');
  return { rednessRatio: rr, blueExcess, refRatios: { ink: rInk, accent: rAcc }, verdict };
}

/* 与纸色距离最大的前 pct 像素构成「文字簇」，取其均色作为该元素的实际屏幕配色。
 * 抗锯齿会把笔画边缘混成中间色，因此只看离纸最远的少数像素，与母本做法一致。 */
export function inkColorOf(png, ref, pct = 0.02) {
  const { data, ch } = png;
  const paper = ref.paper, ink = ref.ink, accent = ref.accent;
  const px = [];
  for (let i = 0; i + 2 < data.length; i += ch) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (data[ch === 4 ? i + 3 : 0] !== undefined && ch === 4 && data[i + 3] === 0) continue;
    px.push([Math.abs(r - paper[0]) + Math.abs(g - paper[1]) + Math.abs(b - paper[2]), r, g, b]);
  }
  if (px.length < 6) return { rgb: null, cluster: px.length, distInk: null, distAccent: null, distBrowserPurple: null, verdict: '取样区过小' };
  px.sort((x, y) => y[0] - x[0]);
  const top = px.slice(0, Math.max(6, Math.round(px.length * pct)));
  const avg = [0, 0, 0].map((_, k) => top.reduce((s, q) => s + q[k + 1], 0) / top.length);
  const dInk = dist(avg, ink), dAccent = dist(avg, accent);
  const dDefault = dist(avg, [0, 0, 238]);
  return {
    rgb: avg.map((v) => Math.round(v)),
    cluster: top.length,
    samplePoints: px.length,
    redness: Math.round((avg[0] - (avg[1] + avg[2]) / 2) * 10) / 10,
    distInk: dInk,
    distAccent: dAccent,
    distBrowserPurple: dDefault,
    ...classify(avg, ink, accent),
  };
}
