/* 最小 PNG 解码（8bit RGB/RGBA、无交错）+ 纸底上的文字颜色分析。
 * 为什么需要像素：Chrome 对 :visited 链接的 getComputedStyle 会按隐私规则返回「未访问」颜色，
 * 脚本读到的值与屏幕上的颜色可以不一致；只有像素能定论。
 */
import zlib from 'node:zlib';

export function pngDecode(buf) {
  let pos = 8; let w = 0; let h = 0; let bitDepth = 0; let colorType = 0; let interlace = 0;
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

const PAPER = [245, 239, 228];
export function inkColorOf(png) {
  const { data, ch } = png;
  const px = [];
  for (let i = 0; i + 2 < data.length; i += ch) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    px.push([Math.abs(r - PAPER[0]) + Math.abs(g - PAPER[1]) + Math.abs(b - PAPER[2]), r, g, b]);
  }
  px.sort((x, y) => y[0] - x[0]);
  const top = px.slice(0, Math.max(6, Math.round(px.length * 0.02)));
  const avg = [0, 0, 0].map((_, k) => top.reduce((s, q) => s + q[k + 1], 0) / top.length);
  const d = (t) => Math.round(Math.sqrt(avg.reduce((s, v, k) => s + (v - t[k]) ** 2, 0)));
  return {
    rgb: avg.map((v) => Math.round(v)),
    redness: Math.round((avg[0] - (avg[1] + avg[2]) / 2) * 10) / 10,
    distInk: d([33, 31, 28]), distAccent: d([122, 36, 36]),
    verdict: d([122, 36, 36]) < d([33, 31, 28]) ? '暗红(accent)' : '深色(ink)',
  };
}
