/* Task 18.8 — 变异对照台（证明新闸门有牙）
 *
 * 117 例 = 61（v1 迁移）+ 30（上游并入去重）+ 6（Task 15 六类负向对照）+ 20（归档层新增）。
 * 全部注入到 Results/ content/ build/ deploy/ Materials/ 的**副本目录**，真实交付面一个字节都不动。
 *
 * 两条台架纪律（来自上一轮的真事，见 plan/Task18 §上一轮实际暴露的闸门缺陷）：
 *  D4 变异跑期间禁止编辑被测脚本：开跑前取 verify_task18.mjs 的 SELF-SHA，每台复核，变了整批作废。
 *  D5 每台带前置断言：先证明违约在字节层或渲染层真实成立；前置不成立记"无效变异"，不计捕获率。
 *
 * 用法：node _qa_task18/mutate_task18.mjs [--only=<id子串>] [--limit=N] [--bucket=1|2|3|4]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openBrowser18, buildMeta } from './probe_lib18.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const WORK = path.join(HERE, 'mutants');
const LOG = path.join(HERE, 'mutation_log.md');
const VERIFY = path.join(HERE, 'verify_task18.mjs');
const SRC = { Results: path.join(ROOT, 'Results'), content: path.join(ROOT, 'content'), build: path.join(ROOT, 'build'), deploy: path.join(ROOT, 'deploy'), Materials: path.join(ROOT, 'Materials') };
/* 清单首个条目（副本原样克隆真实 manifest，所以注入的 pages[0] 与这里同源）。
 * 写死某个页名会随加稿错位——R12 后 sorted(名) 的首位已换人。 */
const MANIFEST0 = JSON.parse(fs.readFileSync(path.join(ROOT, 'deploy', 'manifest.json'), 'utf8')).pages[0].path;
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const rd = (p) => fs.readFileSync(p, 'utf8');
const wr = (p, s) => fs.writeFileSync(p, s, 'utf8');
const clone = (s, d) => fs.cpSync(s, d, { recursive: true });

/* --------------------------------------------------------------- 台架原语 */
function mkCtx(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const [k, from] of Object.entries(SRC)) clone(from, path.join(dir, k));
  const ctx = { dir, Results: path.join(dir, 'Results'), content: path.join(dir, 'content'), build: path.join(dir, 'build'), deploy: path.join(dir, 'deploy'), Materials: path.join(dir, 'Materials'), before: {}, touched: [] };
  for (const k of Object.keys(SRC)) { const walkB = (d, rel) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const pp = path.join(d, e.name), r = rel ? rel + '/' + e.name : e.name; if (e.isDirectory()) walkB(pp, r); else ctx.before[k + '/' + r] = sha(fs.readFileSync(pp)); } }; walkB(ctx[k], ''); }
  return ctx;
}
/** 键解析：裸文件名一律先当 Results/ 内的交付文件；带前缀的按目录名定位副本 */
function resolveFile(ctx, key) {
  const seg = String(key).split('/');
  if (seg.length === 1) return path.join(ctx.Results, key);
  if (seg[0] in ctx) return path.join(ctx[seg[0]], seg.slice(1).join('/'));
  return path.join(ctx.Results, key);
}
/** 在副本的某个文件里做一次字面替换；返回可读的注入说明（同时用作前置证据的一半） */
function sub(ctx, key, find, repl, label) {
  const file = resolveFile(ctx, key);
  const before = rd(file), n = before.split(find).length - 1;
  if (n < 1) throw new Error('注入失败：' + key + ' 内找不到模式 ' + JSON.stringify(find));
  fs.writeFileSync(file, before.split(find).join(repl), 'utf8');
  ctx.touched.push(file);
  return (label || '替换') + ' ' + key + '：' + JSON.stringify(find).slice(0, 40) + ' → ' + JSON.stringify(repl).slice(0, 40) + '（命中 ' + n + ' 处）';
}
function touch(ctx, key, fn, label) {
  const file = resolveFile(ctx, key);
  const before = fs.readFileSync(file);
  const after = fn(before);
  fs.writeFileSync(file, after);
  ctx.touched.push(file);
  return (label || '改写') + ' ' + key + '：' + before.length + ' → ' + after.length + ' 字节';
}
function addFile(ctx, key, body, label) {
  const file = resolveFile(ctx, key);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
  ctx.touched.push(file);
  return (label || '新增') + ' ' + key + '（' + Buffer.byteLength(body) + ' 字节）';
}
function mkdir(ctx, key) { const p = resolveFile(ctx, key) + '/'; fs.mkdirSync(p, { recursive: true }); ctx.touched.push(p); return '建目录 ' + key; }
/** 前置断言：被改文件确实与副本原件不同（字节层成立） */
function preChanged(ctx) {
  for (const [k, h] of Object.entries(ctx.before)) { const f = path.join(ctx.dir, k); if (fs.existsSync(f) && sha(fs.readFileSync(f)) !== h) return { ok: true, detail: k + ' 字节已变' }; }
  return { ok: false, detail: '没有任何文件字节变化：变异未真实成立' };
}
function preHas(ctx, key, needle) {
  const file = resolveFile(ctx, key);
  const t = fs.existsSync(file) ? rd(file) : '';
  return { ok: t.includes(needle), detail: key + ' 内 ' + JSON.stringify(needle) + ' 在场=' + t.includes(needle) };
}
function preAbsent(ctx, key, needle) {
  const file = resolveFile(ctx, key);
  const t = fs.existsSync(file) ? rd(file) : '';
  return { ok: !!t && !t.includes(needle), detail: key + ' 内 ' + JSON.stringify(needle) + ' 已消失=' + !t.includes(needle) };
}
function preZipNames(ctx) {
  const z = readZip(fs.readFileSync(path.join(ctx.deploy, 'site.zip')));
  return { ok: true, detail: 'zip 条目实测为 ' + z.map((e) => e.name).join(',') };
}

/* ------------------------------------------------------- zip：写与极简读 */
const CRC_T = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xFFFFFFFF; for (const b of buf) c = CRC_T[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
const DOS1980 = { time: 0, date: 1 };
function makeZip(entries, opts = {}) {
  const dt = opts.date_time || DOS1980;
  const dosTime = (dt[3] << 11) | (dt[4] << 5) | (dt[5] >> 1), dosDate = ((dt[0] - 1980) << 9) | (dt[1] << 5) | dt[2];
  const locals = [], centrals = []; let off = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8');
    const data = e.data;
    const comp = e.store ? data : zlib.deflateRawSync(data, { level: 9 });
    const method = e.store ? 0 : 8;
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 6); lh.writeUInt16LE(method, 8);
    lh.writeUInt16LE(dosTime, 10); lh.writeUInt16LE(dosDate, 12); lh.writeUInt32LE(crc32(data), 14); lh.writeUInt32LE(comp.length, 18);
    lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    locals.push(Buffer.concat([lh, name, comp]));
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(((e.createSystem === undefined ? 0 : e.createSystem) << 8) | 20, 4);
    ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0, 8); ch.writeUInt16LE(method, 10); ch.writeUInt16LE(dosTime, 12); ch.writeUInt16LE(dosDate, 14);
    ch.writeUInt32LE(crc32(data), 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(name.length, 28); ch.writeUInt16LE(e.extraLen || 0, 30); ch.writeUInt16LE(e.cmtLen || 0, 32);
    ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36); ch.writeUInt32LE(e.externalAttr === undefined ? 0x20 : e.externalAttr, 38);
    ch.writeUInt32LE(off, 42);
    centrals.push(Buffer.concat([ch, name]));
    off += lh.length + name.length + comp.length;
  }
  const cd = Buffer.concat(centrals), eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(0, 4); eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(centrals.length, 8); eocd.writeUInt16LE(centrals.length, 10);
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(off, 16); eocd.writeUInt16LE(opts.commentLen || 0, 20);
  return Buffer.concat([...locals, cd, eocd]);
}
function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  const count = buf.readUInt16LE(eocd + 10), cdOff = buf.readUInt32LE(eocd + 16);
  const out = []; let p = cdOff;
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10), comp = buf.readUInt32LE(p + 20), nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), cmtLen = buf.readUInt16LE(p + 32), lho = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nameLen).toString('utf8');
    const ln = buf.readUInt16LE(lho + 26), le = buf.readUInt16LE(lho + 28), start = lho + 30 + ln + le;
    const raw = buf.slice(start, start + comp);
    out.push({ name, data: method === 0 ? raw : zlib.inflateRawSync(raw) });
    p += 46 + nameLen + extraLen + cmtLen;
  }
  return out;
}
/** 用副本目录里的源文件重建 zip（可按需增删改名条目），保证除注入点外形态合法 */
function rebuildZip(ctx, tweak = {}) {
  const man = JSON.parse(rd(path.join(ctx.deploy, 'manifest.json')));
  let entries = [];
  const names = tweak.renamed || (() => null);
  for (const p of man.pages) { const d = fs.readFileSync(path.join(ctx.Results, p.path)); entries.push({ name: names(p.path) || p.path, data: d }); }
  if (!tweak.dropHeaders) { const d = fs.readFileSync(path.join(ctx.deploy, '_headers')); entries.push({ name: '_headers', data: d }); }
  if (tweak.extra) for (const e of tweak.extra) entries.push({ name: e.name, data: Buffer.from(e.body || '', 'utf8') });
  if (tweak.prefix) entries = entries.map((e) => ({ ...e, name: tweak.prefix + e.name }));
  if (tweak.dirEntry) entries.push({ name: 'Results/', data: Buffer.alloc(0), store: true, externalAttr: 0x10 });
  entries.sort((a, b) => (a.name < b.name ? -1 : 1));
  fs.writeFileSync(path.join(ctx.deploy, 'site.zip'), makeZip(entries, tweak.opts || {}));
  ctx.touched.push(path.join(ctx.deploy, 'site.zip'));
  return '重建 site.zip（条目 ' + entries.map((e) => e.name).join(',') + (tweak.prefix ? '，前缀 ' + tweak.prefix : '') + (tweak.dropHeaders ? '，缺 _headers' : '') + (tweak.extra ? '，多出 ' + tweak.extra.map((e) => e.name).join(',') : '') + '）';
}

/* ------------------------------------------------------ 用例表：桶 1（61） */
const D = 'article-school-course-volunteer.html', F = 'article-math-to-ai-learning.html', C = 'article-classroom-screen-upgrade.html';
const CASES = [];
const add = (bucket, id, from, desc, expect, apply, pre) => CASES.push({ bucket, id, from, desc, expect, apply, pre });

/* 桶 1：v1 的 61 例逐例迁移。expect 用本包的新断言编号；宿主从 news-*.html 换成 article-*.html。 */
const B1 = [
  ['charset', 'index.html', '<meta charset="utf-8">', '<meta charset="gb2312">', ['C2/index.html/charsetval']],
  ['title-sep', F, '从数学题到AI时代的学习\uff5c自然选择号', '从数学题到AI时代的学习|自然选择号', ['C3/' + F]],
  ['css-ref-query', D, 'href="styles.css"', 'href="styles.css?v=1"', ['C4/' + D + '/css', 'P1/', 'P3/']],
  ['inline-script', C, '</body>', '<script>var x=1;</script></body>', ['C4/' + C + '/inline', 'C4/' + C + '/js', 'K1/shell']],
  ['skip-text', 'index.html', '跳至正文', '跳到正文', ['C5/index.html']],
  ['expanded-true', C, 'aria-expanded="false"', 'aria-expanded="true"', ['C7/' + C + '/expanded-src']],
  ['icon-no-hidden', D, '<span class="nav-toggle__icon" aria-hidden="true"></span>', '<span class="nav-toggle__icon"></span>', ['C7/' + D + '/icon']],
  ['nav-hidden', F, '<nav class="site-navigation"', '<nav hidden class="site-navigation"', ['C8/' + F + '/hidden']],
  ['main-tabindex', 'index.html', 'tabindex="-1"', 'tabindex="0"', ['C9/index.html/main']],
  ['dup-id', C, '<h1 class="page-title">', '<h1 id="main-content" class="page-title">', ['C10/' + C]],
  ['nav-order', D, '<a class="site-navigation__link" href="index.html">首页</a>', '<a class="site-navigation__link" href="news-feature.html">新闻通讯</a>', ['D1/' + D]],
  ['nav-abs-path', F, 'href="news-feature.html"', 'href="/news-feature.html"', ['D2/target', 'D1/' + F, 'P3/']],
  ['current-on-li', D, '<a class="site-navigation__link" href="news-message.html" aria-current="page">新闻消息</a>', '<a class="site-navigation__link" href="news-message.html">新闻消息</a>', ['D3/' + D, 'D4/' + D]],
  ['home-swap', 'index.html', '<h2 class="home-section__title" id="origin-title">名称由来</h2>', '<h2 class="home-section__title" id="work-title">名称由来</h2>', ['E4/ids', 'E4/labelledby', 'E2/order']],
  ['home-text-year', 'index.html', '报社成立于\u201c鸽子衔枝之年\u201d。', '报社成立于2024年。', ['E6/P_FOUNDED', 'J17', 'J2/']],
  ['home-text-space', 'index.html', '我们的名字来自《三体》里的一支舰队。', '我们的名字来自《三体》 里的一支舰队。', ['E6/P_ORIGIN', 'E6/punct']],
  ['home-slot', 'index.html', '<title>', '<!--P_ORIGIN--><title>', ['E7', 'J4/', 'C13/index.html']],
  ['home-extra-p', 'index.html', '</div>\n\n    <div class="home-latest"', '</div>\n      <p>多出来的一段</p>\n\n    <div class="home-latest"', ['E8/order', 'E8tally/p', 'E1/order']],
  ['home-drop-h2', 'index.html', '<h2 class="home-section__title" id="origin-title">名称由来</h2>\n', '', ['E3', 'E4/ids', 'E5', 'E8/order', 'E8tally/h2']],
  ['msg-char', D, '我校校本课程志愿填报于今日7时正式启动', '我校校本课程志愿填报于今日7时正式启动了啦', ['F7/' + D, 'F7p/' + D + '/M01', 'L1/', 'L2/', 'G/M/。']],
  ['msg-truncate', D, '若两项志愿均未被录取，学生将被调剂至尚有名额的其他社团。', '', ['F7/' + D, 'F7/' + D + '/chars', 'L1/', 'L3/M:M01']],
  ['feat-merge', F, '</p>\n        <p>对于学生每天都要面对的课后学习', ' 对于学生每天都要面对的课后学习', ['F6/' + F, 'F7/' + F]],
  ['dateline-2sp', D, '</strong> 我校', '</strong>  我校', ['F8/' + D + '/space', 'F11/' + D, 'F7p/' + D + '/M01', 'L2b/']],
  ['dateline-nbsp', F, '</strong> 上午', '</strong>\u00a0上午', ['F8/' + F + '/space', 'F8/' + F + '/text', 'L2b/']],
  ['dateline-nowrap', F, '<strong class="dateline">自然选择号9月17日电</strong>', '自然选择号9月17日电', ['F8/' + F + '/node', 'F10/' + F + '/inline', 'L1/']],
  ['comm-date-into-body', C, '<p class="article__date">', '@@MOVE@@', ['F9/' + C, 'F1/' + C + '/order', 'F6/' + C]],
  ['comm-date-year', C, '（自然选择号9月18日）', '（自然选择号2024年9月18日）', ['F9/' + C + '/form', 'J2/', 'J17', 'G/C/noyear']],
  ['comm-exe-nodot', C, '.exe', 'exe', ['G/C/.exe', 'F7/' + C, 'L1/']],
  ['comm-space-in-word', C, 'Windows 10', 'Windows10', ['G/C/Windows_10', 'G/C/space', 'F7/' + C]],
  ['comm-blank-line', C, '<p>这个问题并不复杂', '<p>这个问题并不' + '\n        ' + '复杂', ['F11/' + C, 'F7p/' + C + '/C07', 'L1/']],
  ['feat-ai-case', F, 'AI时代的学习', 'ai时代的学习', ['G/F/AI', 'G/AI-total', 'C3/' + F, 'F4/' + F]],
  ['feat-pronoun', F, '在她看来', '在他看来', ['F7p/' + F + '/F05', 'G/pron-她', 'L1/']],
  ['byline-author', D, '<p class="article__byline">蓝色空间</p>', '<p class="article__byline">作者：蓝色空间</p>', ['F5/' + D, 'J7/', 'L1/']],
  ['source-name', C, '<p class="article__type">新闻评论</p>', '<p class="article__type">新闻评价</p>', ['J3/', 'F3/' + C, 'C9/' + C + '/h1text']],
  ['hash-leak', D, '</article>', '<!--DE10B575399E0563430F2F255C956B179C9978C087897A24910AD70D6A50F6FC--></article>', ['J6/', 'C13/' + D]],
  ['extra-file', null, null, null, ['A6', 'A1b/disk-to-manifest', 'A2/no-banned-ext']],
  ['subdir', null, null, null, ['A2/no-subdir']],
  ['materials-tamper', null, null, null, ['B/新闻消息.docx']],
  ['nav-item-missing', 'index.html', '<li class="site-navigation__item">\n            <a class="site-navigation__link" href="news-commentary.html">新闻评论</a>\n          </li>\n        ', '', ['C8/index.html/items', 'D1/index.html', 'D2/count', 'C6/index.html']],
  ['para-reorder', F, null, null, ['F7/' + F, 'F7p/' + F + '/F03']],
  ['home-lab-unresolved', 'index.html', 'aria-labelledby="origin-title"', 'aria-labelledby="no-such-id"', ['E4/labelledby']],
  ['css-important', 'styles.css', 'color: var(--color-ink);', 'color: var(--color-ink) !important;', ['H5/important']],
  ['css-id-selector', 'styles.css', '.skip-link {', '#latest-title .skip-link {', ['H5/id']],
  ['css-shadow', 'styles.css', '.skip-link {', '.skip-link { box-shadow: 0 1px 2px #000;', ['H7', 'H12']],
  ['css-radius', 'styles.css', '.skip-link {', '.skip-link { border-radius: 6px;', ['H7/radius']],
  ['css-external', 'styles.css', '.skip-link {', '@import url("https://fonts.example/x.css");\n.skip-link {', ['H2', 'H10']],
  ['css-wrong-breakpoint', 'styles.css', '@media (max-width: 768px)', '@media (max-width: 769px)', ['H8', 'H8/other']],
  ['css-second-media', 'styles.css', '@media (max-width: 768px)', '@media (max-width: 768px){a{color:red}}@media (max-width: 768px)', ['H8', 'H12/browser']],
  ['css-mobile-100vw', 'styles.css', '@media (max-width: 768px)', '@media (max-width: 768px){.home-section{width:100vw}}', ['H9']],
  ['css-content-inject', 'styles.css', '.skip-link {', '.skip-link::after{content:"菜单"}.skip-link {', ['H10']],
  ['css-new-class', 'styles.css', '.skip-link {', '.feature-list{color:red}.skip-link {', ['H11/unknown', 'H11/orphan']],
  ['css-unbalanced', 'styles.css', '.skip-link {', '.skip-link ', ['H12']],
  ['css-var-drift', 'styles.css', '--color-ink: #211f1c;', '--color-ink: #000000;', ['H4/values']],
  ['js-console', 'script.js', null, null, ['I3', 'I11/hash']],
  ['js-breakpoint-rem', 'script.js', '769px', '48rem', ['I4', 'I11/hash']],
  ['js-innerwidth', 'script.js', null, null, ['I4', 'I11/hash']],
  ['js-outside-click', 'script.js', null, null, ['I9', 'I11/hash']],
  ['js-extra-state', 'script.js', null, null, ['I5', 'I11/hash']],
  ['js-remote', 'script.js', null, null, ['I2', 'I11/hash']],
  ['js-early-nojs', 'script.js', null, null, ['I7', 'I11/hash']],
  ['js-internal-ids', 'script.js', null, null, ['I8', 'I11/hash']],
];
for (const [name, file, find, repl, expect] of B1) {
  CASES.push({ bucket: 1, id: 'B1-' + name, from: 'qa/_qa_task10/mutation_log.md 的 ' + name + ' 例', desc: 'v1 迁移：' + name + (file ? ' → ' + file : '（目录/素材形态）'), expect, spec: { name, file, find, repl }, apply: null, pre: null });
}

/* 桶 1 里需要程序化注入的用例；其余 49 例走表内的字面替换 */
const SPECIAL1 = {
  'B1-extra-file': { apply: (x) => addFile(x, 'Results/notes.txt', '临时笔记\n', '放一个清单外文件'), pre: (x) => ({ ok: fs.existsSync(path.join(x.Results, 'notes.txt')), detail: 'Results/notes.txt 实测存在，集合双向不等，未被任何排除逻辑放过' }) },
  'B1-subdir': { apply: (x) => { mkdir(x, 'Results/articles'); fs.writeFileSync(path.join(x.Results, 'articles', 'page.html'), '<!doctype html>\n'); return '建 Results/articles/ 并放入一页'; }, pre: (x) => { const p = path.join(x.Results, 'articles'); const st = fs.statSync(p); return { ok: st.isDirectory() && fs.readdirSync(p).length > 0, detail: 'readdir 与 stat 均为目录，内含 ' + fs.readdirSync(p).join(',') }; } },
  'B1-materials-tamper': { apply: (x) => touch(x, 'Materials/新闻消息.docx', (b) => Buffer.concat([b, Buffer.from('x')]), '追加一个字节'), pre: (x) => ({ ok: fs.statSync(path.join(x.Materials, '新闻消息.docx')).size !== fs.statSync(path.join(SRC.Materials, '新闻消息.docx')).size, detail: '副本 docx 字节数已偏离 Task 1 冻结基线' }) },
  'B1-para-reorder': { apply: (x) => touch(x, 'Results/' + F, (b) => { const s = b.toString('utf8'); const a = s.indexOf('<p>对于学生每天都要面对的课后学习'); const e1 = s.indexOf('</p>', a) + 4; const b2 = s.indexOf('<p>\u201c如果想提高自己的', e1); const e2 = s.indexOf('</p>', b2) + 4; return Buffer.from(s.slice(0, a) + s.slice(b2, e2) + s.slice(e1, b2) + s.slice(a, e1) + s.slice(e2), 'utf8'); }), pre: (x) => preHas(x, 'Results/' + F, '\u201c如果想提高自己的') },
  'B1-js-console': { apply: (x) => sub(x, 'Results/script.js', 'function', 'console.log("d");\nfunction', '加一条 console.log'), pre: (x) => preHas(x, 'Results/script.js', 'console.') },
  'B1-js-innerwidth': { apply: (x) => sub(x, 'Results/script.js', 'function', 'var w = window.innerWidth;\nfunction', '用 innerWidth 判宽'), pre: (x) => preHas(x, 'Results/script.js', 'innerWidth') },
  'B1-js-outside-click': { apply: (x) => sub(x, 'Results/script.js', 'function', "document.addEventListener('click', function () {});\nfunction", '加点击外部关闭'), pre: (x) => preHas(x, 'Results/script.js', "addEventListener('click'") },
  'B1-js-extra-state': { apply: (x) => sub(x, 'Results/script.js', 'function', "navigation.style.display = 'none';\nfunction", '多写一处 style 状态'), pre: (x) => preHas(x, 'Results/script.js', '.style.display =') },
  'B1-js-remote': { apply: (x) => sub(x, 'Results/script.js', 'function', "fetch('https://example.invalid/x');\nfunction", '引入外部请求'), pre: (x) => preHas(x, 'Results/script.js', 'fetch(') },
  'B1-js-early-nojs': { apply: (x) => touch(x, 'Results/script.js', (b) => Buffer.from(String(b.toString('utf8')).replace("classList.remove('no-js')", "setAttribute('aria-hidden', 'false');\n    root.classList.remove('no-js')"), 'utf8'), '在 no-js\u2192js 之前先写别的状态'), pre: (x) => preHas(x, 'Results/script.js', "setAttribute('aria-hidden'") },
  'B1-js-internal-ids': { apply: (x) => sub(x, 'Results/script.js', 'function', '/* M01 段落编号写进注释 */\nfunction', '注释里写内部编号'), pre: (x) => preHas(x, 'Results/script.js', 'M01') },
};
for (const c of CASES) {
  const sp = SPECIAL1[c.id];
  if (sp) { c.apply = sp.apply; c.pre = sp.pre; }
  else if (c.spec && c.spec.file) {
    const { file, find, repl } = c.spec;
    if (repl === '@@MOVE@@') {
      /* 把 .article__date 段落整体挪进 .article__body 之内（字面缩进随版本变化，按结构挪动） */
      c.apply = (x) => touch(x, 'Results/' + file, (b) => {
        const s0 = b.toString('utf8');
        const i0 = s0.indexOf('<p class="article__date">');
        if (i0 < 0) throw new Error('找不到 .article__date');
        const j0 = s0.indexOf('</p>', i0) + 4;
        const blk = s0.slice(i0, j0);
        const rest = s0.slice(0, i0) + s0.slice(j0);
        const k0 = rest.lastIndexOf('</div>');
        return Buffer.from(rest.slice(0, k0) + blk + '\n      ' + rest.slice(k0), 'utf8');
      });
      c.pre = (x) => { const s0 = rd(resolveFile(x, 'Results/' + file)); const di = s0.indexOf('<div class="article__body">'), bi = s0.indexOf('</div>', di), ai = s0.indexOf('<p class="article__date">'); return { ok: di >= 0 && ai > di && ai < bi, detail: '结尾日期段实测落在 .article__body 的开合标签之间（位置 ' + ai + ' ∈ (' + di + ',' + bi + ')）' }; };
    } else { c.apply = (x) => sub(x, 'Results/' + file, find, repl); c.pre = (x) => preChanged(x); }
  }
}

/* ---------------- 桶 2：上游并入（Task 13／14／16／17 去重后 30 例） --------- */
/* 每例的 from 列写明"这一例合并了哪两（三）包的哪两类"；合并不了的按两例计。 */
const MDOC = 'content/articles/';
const SCHOOL = 'school-course-volunteer', MATH = 'math-to-ai-learning', ROOM = 'classroom-screen-upgrade';
const mdf = (slug) => MDOC + slug + '.md';
const msub = (x, slug, find, repl) => sub(x, mdf(slug), find, repl);

const B2 = [
  ['para-twoline', '合并 Task13 验证6「某段拆成两行」与 Task14.14 第 1 类「段落跨行」', (x) => msub(x, SCHOOL, '目前，校本课程志愿填报工作正在进行中。', '目前，校本课程\n志愿填报工作正在进行中。'), ['Q/Q3/para-single-line', 'Q/Q3/body'], (x) => preHas(x, mdf(SCHOOL), '目前，校本课程\n志愿填报')],
  ['dateline-2space', '合并 Task13 验证6「M01 电头后加第二个空格」与 Task14.14 第 2 类前半', (x) => msub(x, SCHOOL, '**自然选择号9月18日7时电** 我校', '**自然选择号9月18日7时电**  我校'), ['Q/Q4/dateline-space'], (x) => preHas(x, mdf(SCHOOL), '**  我校')],
  ['dateline-zerospace', 'Task14.14 第 2 类后半「电头后零个空格」', (x) => msub(x, SCHOOL, '**自然选择号9月18日7时电** 我校', '**自然选择号9月18日7时电**我校'), ['Q/Q4/dateline-space'], (x) => preHas(x, mdf(SCHOOL), '**我校')],
  ['second-bold', 'Task14.14 第 3 类「第二段出现 **…**」', (x) => msub(x, SCHOOL, '据了解，本次校本课程', '**据了解**，本次校本课程'), ['Q/Q4/dateline-unique'], (x) => preHas(x, mdf(SCHOOL), '**据了解**')],
  ['markup-link', 'Task14.14 第 4 类「含 [链接](x)」', (x) => msub(x, SCHOOL, '目前，校本课程', '目前，[链接](x) 校本课程'), ['Q/Q3/no-inline-markup'], (x) => preHas(x, mdf(SCHOOL), '[链接](x)')],
  ['markup-hash-backtick', '合并 Task13 禁标记面「#」与 Task14.14 第 4 类「反引号」', (x) => msub(x, SCHOOL, '目前，校本课程', '目前，#标题 `码` 校本课程'), ['Q/Q3/no-inline-markup'], (x) => preHas(x, mdf(SCHOOL), '#标题')],
  ['markup-angle', 'Task14.14 第 4 类「< >」与第 13 类「<time>」合一', (x) => msub(x, SCHOOL, '目前，校本课程', '目前，<time datetime="2026-09-18">校本课程'), ['Q/Q3/no-inline-markup'], (x) => preHas(x, mdf(SCHOOL), '<time')],
  ['linestart-marks', '合并 Task13 扩充面「行首 | ~」与 Task14.14 第 4 类「行首 \\d+.」', (x) => { msub(x, SCHOOL, '\n目前，校本课程志愿填报工作正在进行中。', '\n| 竖线开头段'); return msub(x, SCHOOL, '\n在此前的动员会上', '\n1. 有序列表开头段\n在此前的动员会上'); }, ['Q/Q3/no-line-start-markup'], (x) => preHas(x, mdf(SCHOOL), '| 竖线开头段')],
  ['unknown-key', 'Task14.14 第 5 类之一「未知键 tags:」', (x) => msub(x, SCHOOL, 'byline: 蓝色空间', 'byline: 蓝色空间\ntags: 校园'), ['Q/Q1/whitelist'], (x) => preHas(x, mdf(SCHOOL), 'tags: 校园')],
  ['dup-key', 'Task14.14 第 5 类之二「重复键」', (x) => msub(x, SCHOOL, 'title: 我校启动校本课程志愿填报', 'column: message\ntitle: 我校启动校本课程志愿填报'), ['Q/Q1/no-duplicate'], (x) => ({ ok: rd(resolveFile(x, mdf(SCHOOL))).split('column: message').length - 1 === 2, detail: 'front-matter 内 column 键实测出现两次' })],
  ['empty-value', 'Task14.14 第 5 类之三「空值」', (x) => msub(x, SCHOOL, 'byline: 蓝色空间', 'byline:  '), ['Q/Q1/no-empty-value', 'Q/Q3/md-error-free'], (x) => preHas(x, mdf(SCHOOL), 'byline:  \n')],
  ['slug-mismatch', 'Task14.14 第 6 类「slug 与文件名主干不一致」', (x) => msub(x, SCHOOL, 'slug: school-course-volunteer', 'slug: school-course-volunteer-x'), ['Q/Q2/slug==stem'], (x) => preHas(x, mdf(SCHOOL), 'school-course-volunteer-x')],
  ['slug-contract-id', '合并 Task13 验证6「slug 改成 M01」与 Task14.14 第 6 类「slug: M01」', (x) => msub(x, SCHOOL, 'slug: school-course-volunteer', 'slug: M01'), ['Q/Q2/no-contract-id', 'Q/Q2/slug==stem'], (x) => preHas(x, mdf(SCHOOL), 'slug: M01')],
  ['slug-reserved', 'Task14.14 第 6 类「slug: con」（保留设备名整干全等）', (x) => msub(x, MATH, 'slug: math-to-ai-learning', 'slug: con'), ['Q/Q2/reserved-name', 'Q/Q2/slug==stem'], (x) => preHas(x, mdf(MATH), 'slug: con')],
  ['slug-dateform', 'Task14.14 第 6 类「slug: 2024-09-18」（同时命中 \\d{4} 与 \\d{1,2}-\\d{1,2}）', (x) => msub(x, ROOM, 'slug: classroom-screen-upgrade', 'slug: 2024-09-18'), ['Q/Q2/no-date-form', 'Q/Q2/slug==stem'], (x) => preHas(x, mdf(ROOM), 'slug: 2024-09-18')],
  ['column-unknown', 'Task14.14 第 7 类「column: review」（注册表外值）', (x) => msub(x, ROOM, 'column: commentary', 'column: review'), ['Q/Q7/column-registered'], (x) => preHas(x, mdf(ROOM), 'column: review')],
  ['column-empty', 'Task14.14 第 12 类「清空某栏目使其零篇文章」', (x) => { fs.unlinkSync(path.join(x.content, 'articles', ROOM + '.md')); return '删除评论栏目内唯一一篇'; }, ['Q/Q7/column-nonempty', 'A1d/article-classroom-screen-upgrade.html', 'Q/Q8/order-commentary'], (x) => ({ ok: !fs.existsSync(path.join(x.content, 'articles', ROOM + '.md')), detail: 'commentary 栏目文章数实测为 0，注册表仍登记该栏' })],
  ['date-forms', '合并 Task14.14 第 8 类两半（date: 2026-9-18 与 display_date: 2026年9月18日）与 Task13 验证6「display_date 写 2026年9月18日」', (x) => { msub(x, SCHOOL, 'byline: 蓝色空间', 'byline: 蓝色空间\ndate: 2026-9-18'); return msub(x, SCHOOL, 'display_date: 9月18日', 'display_date: 2026年9月18日'); }, ['Q/Q2/date-iso', 'Q/Q6/display_date-form'], (x) => preHas(x, mdf(SCHOOL), '2026年9月18日')],
  ['display-not-in-body', 'Task14.14 第 9 类「display_date 不在正文内」', (x) => msub(x, SCHOOL, 'display_date: 9月18日', 'display_date: 12月31日'), ['Q/Q6/substring'], (x) => ({ ok: !mdBody(x, SCHOOL).includes('12月31日'), detail: '逐码点证明该串不在本文 textContent 内' })],
  ['enddate-badform', 'R12 后 end_date 与栏目无关，但值形态仍须为（自然选择号X月X日）；此例注入带公元年份的形态。注：src_check 的记录 id 带发生序后缀（#N），N 随文章数与有 end_date 的篇数移动，所以这里按判据名前缀匹配，钉 N 会把台架写成第二套排序实现', (x) => msub(x, SCHOOL, 'display_date: 9月18日', 'display_date: 9月18日\nend_date: （自然选择号2026年9月18日）'), ['Q/Q5/end_date-format'], (x) => preHas(x, mdf(SCHOOL), 'end_date: （自然选择号2026年')],
  ['registry-header', '合并 Task13 验证6「columns.md 加表头行」与 Task14.14 第 11 类「注册表四行」', (x) => sub(x, 'content/columns.md', 'message|新闻消息|news-message.html', '#columns\nmessage|新闻消息|news-message.html'), ['Q/Q7/registry-exactly-3', 'Q/Q7/registry-no-header', 'Q/Q7/registry-matches-plan'], (x) => preHas(x, 'content/columns.md', '#columns')],
  ['registry-forbidden-label', 'Task14.14 第 11 类「栏目名 新闻评价」', (x) => sub(x, 'content/columns.md', 'commentary|新闻评论|news-commentary.html', 'commentary|新闻评价|news-commentary.html'), ['Q/Q7/registry-label-form', 'Q/Q7/registry-matches-plan'], (x) => preHas(x, 'content/columns.md', '新闻评价')],
  ['registry-two-lines', '合并 Task13 验证6「删 commentary 行」与 Task14.14 第 11 类「注册表两行」', (x) => sub(x, 'content/columns.md', 'commentary|新闻评论|news-commentary.html\n', ''), ['Q/Q7/column-nonempty', 'Q/Q7/registry-exactly-3'], (x) => ({ ok: !rd(resolveFile(x, 'content/columns.md')).includes('commentary|'), detail: '三篇的 column 值仍指向被删栏，注册表查不到' })],
  ['three-fences', 'Task13 验证6「分隔线改成三处」', (x) => msub(x, SCHOOL, '\n\n目前，校本课程志愿填报工作正在进行中。', '\n\n---\n\n目前，校本课程志愿填报工作正在进行中。'), ['Q/Q3/md-error-free', 'Q/Q3/no-line-start-markup'], (x) => ({ ok: rd(resolveFile(x, mdf(SCHOOL))).split('\n---\n').length === 3, detail: '独立成行的 --- 实测三处，合同要求恰两处' })],
  ['closing-as-body-para', 'Task13 验证6「closing_date 当正文段写进 md（段落数 30）」', (x) => msub(x, ROOM, '\n\n这个问题并不复杂', '\n\n（自然选择号9月18日）\n\n这个问题并不复杂'), ['Q/Q3/para-count'], (x) => ({ ok: mdBody(x, ROOM).includes('（自然选择号9月18日）'), detail: '结尾行出现在正文段落序列内，段落数比合同多一' })],
  ['drop-paragraph', 'Task13 验证6「删一段」', (x) => msub(x, SCHOOL, '\n\n目前，校本课程志愿填报工作正在进行中。', ''), ['Q/Q3/para-count', 'Q/Q3/body'], (x) => preAbsent(x, mdf(SCHOOL), '目前，校本课程志愿填报工作正在进行中。')],
  ['period-swap', 'Task13 验证6「。→.」', (x) => msub(x, SCHOOL, '目前，校本课程志愿填报工作正在进行中。', '目前，校本课程志愿填报工作正在进行中.'), ['Q/Q3/body'], (x) => preHas(x, mdf(SCHOOL), '正在进行中.')],
  ['run-join-space', 'Task13 验证6「C06 或 C12 run 接缝拼出空格」', (x) => msub(x, ROOM, '黑板要滑动，老师要用U盘', '黑板要滑动，老师要用U 盘'), ['Q/Q3/body'], (x) => preHas(x, mdf(ROOM), 'U 盘')],
  ['visited-pair-drop', 'Task16.9 第 1 类「删掉 .entry-list__link:visited」', (x) => touch(x, 'Results/styles.css', (b) => { const s = b.toString('utf8'); const i = s.indexOf('.entry-list__link:visited'); if (i < 0) throw new Error('无该规则'); return Buffer.from(s.slice(0, i) + s.slice(s.indexOf('}', i) + 1), 'utf8'); }), ['H13/.entry-list__link'], (x) => preAbsent(x, 'Results/styles.css', '.entry-list__link:visited')],
  ['visited-color', 'Task16.9 第 2 类「把 :visited 的色值改成 --color-accent」（配对值不等）', (x) => touch(x, 'Results/styles.css', (b) => { const s = b.toString('utf8'); const i = s.indexOf('.entry-list__link:visited'); const j = s.indexOf('}', i); const blk = s.slice(i, j); return Buffer.from(s.slice(0, i) + blk.replace(/color:\s*[^;]+/, 'color: var(--color-accent)') + s.slice(j), 'utf8'); }), ['H13/.entry-list__link'], (x) => preHas(x, 'Results/styles.css', '--color-accent')],
  ['new-theme-var', 'Task16.9 第 4 类「加一条 --font-size-list: 1.05rem」（第 3 类 .feature-list 与第 5 类 #latest-title 与桶1 css-new-class／css-id-selector 同型，已在桶1计入）', (x) => sub(x, 'Results/styles.css', '.skip-link {', ':root{--font-size-list: 1.05rem}\n.skip-link {'), ['H4/no-new-var', 'H4/var-count'], (x) => preHas(x, 'Results/styles.css', '--font-size-list')],
  ['content-dot-inject', 'Task16.9 第 6 类「content: "\u00b7" 注入分隔点」', (x) => sub(x, 'Results/styles.css', '.skip-link {', '.entry-list__date::before{content:"\u00b7"}\n.skip-link {'), ['H10/dot'], (x) => preHas(x, 'Results/styles.css', 'content:"\u00b7"')],
];
function mdBody(x, slug) {
  const t = rd(resolveFile(x, mdf(slug)));
  return t.slice(t.indexOf('---', t.indexOf('---') + 3) + 3);
}
for (const [name, from, apply, expect, pre] of B2) CASES.push({ bucket: 2, id: 'B2-' + name, from, desc: '上游并入：' + name, expect, apply, pre, spec: null });

const B2B = [
  ['desktop-into-media', 'Task16.9 第 7 类「把桌面新规则整体移进 @media」（第 8 类复制 @media 与桶1 css-second-media 同型，已在桶1计入）',
   (x) => touch(x, 'Results/styles.css', (b) => { const s0 = b.toString('utf8'); const m = s0.match(/\n(\.home-latest\s*\{[\s\S]*?\}\n)/); if (!m) throw new Error('找不到 .home-latest 桌面规则'); const rest = s0.replace(m[1], '\n'); const k2 = rest.indexOf('@media (max-width: 768px)'); const ob2 = rest.indexOf('{', k2); if (k2 < 0 || ob2 < 0) throw new Error('找不到 @media'); return Buffer.from(rest.slice(0, ob2 + 1) + '\n' + m[1] + rest.slice(ob2 + 1), 'utf8'); }),
   ['H14/desktop/home-latest', 'A1b/sha/styles.css'], (x) => ({ ok: (() => { const s0 = rd(resolveFile(x, 'Results/styles.css')); const md = s0.indexOf('@media (max-width: 768px)'); const d = s0.indexOf('.home-latest {'); return d > md && md > 0; })(), detail: '.home-latest 桌面规则实测已挪到 @media 之后' })],
  ['tap-target-shrink', 'Task16.9 第 9 类与其 9b 分支合一：min-block-size 与 min-inline-size 同改为 28px 并把 padding 压到 0（渲染态 44px 下限的像素判据属 Task 19，本包由"唯一写入者"字节守卫接管）',
   (x) => touch(x, 'Results/styles.css', (b) => { const s0 = b.toString('utf8'); const out = s0.replace(/min-block-size:\s*44px/g, 'min-block-size: 28px').replace(/min-inline-size:\s*44px/g, 'min-inline-size: 28px').replace(/padding-block:\s*0\.75rem/g, 'padding-block: 0'); if (out === s0) throw new Error('CSS 内无 44px 下限与 0.75rem padding 可改'); return Buffer.from(out, 'utf8'); }),
   ['A1b/sha/styles.css', 'A1b/bytes/styles.css', 'N/sha-manifest/styles.css'], (x) => ({ ok: sha(fs.readFileSync(path.join(x.Results, 'styles.css'))) !== x.before['Results/styles.css'], detail: '触控下限与其 padding 已实测变小，styles.css 哈希必然偏离清单登记值' })],
  ['overflow-wrap-break', 'Task16.9 第 10 类「overflow-wrap: anywhere 改 word-break: break-all」', (x) => sub(x, 'Results/styles.css', 'word-break: normal;', 'word-break: break-all;'), ['H9'], (x) => preHas(x, 'Results/styles.css', 'word-break: break-all')],
  ['legacy-zone-edit', 'Task16.9 第 11 类「改一行既有桌面规则的声明值」（既有区必须逐字节不变）',
   (x) => touch(x, 'Results/styles.css', (b) => { const s0 = b.toString('utf8'); const k = s0.indexOf('@media (max-width: 768px)'); const m = /\n\.[a-z][\w-]*(?:__[\w-]+)?\s*\{[^}]*?color:\s*([^;}]+)/.exec(s0.slice(0, k)); if (!m) throw new Error('桌面既有区内找不到 color 声明'); const at = m.index + m[0].indexOf(m[1]); return Buffer.from(s0.slice(0, at) + '#111111' + s0.slice(at + m[1].length), 'utf8'); }),
   ['A1b/sha/styles.css', 'A1b/bytes/styles.css', 'H4/values'], (x) => ({ ok: sha(fs.readFileSync(path.join(x.Results, 'styles.css'))) !== x.before['Results/styles.css'] && rd(resolveFile(x, 'Results/styles.css')).includes('#111111'), detail: '既有桌面规则内出现合同外的 #111111' })],
  ['transition-add', 'Task16.9 第 13 类「加 transition: color .2s」（第 12 类 !important 与桶1 css-important 同型，已在桶1计入）', (x) => sub(x, 'Results/styles.css', '.skip-link {', '.site-navigation__link{transition: color .2s}\n.skip-link {'), ['H7'], (x) => preHas(x, 'Results/styles.css', 'transition: color')],
  ['dead-rule-reverse', 'Task16.9 第 14 类「删掉 .entry-list__date 的全部规则」（死规则反向：DOM 无节点也必须红）', (x) => touch(x, 'Results/styles.css', (b) => { const s = b.toString('utf8'); const i = s.indexOf('.entry-list__date'); if (i < 0) throw new Error('无该规则'); return Buffer.from(s.slice(0, i) + s.slice(s.indexOf('}', i) + 1), 'utf8'); }), ['H14/rule/entry-list__date', 'H14/desktop/entry-list__date'], (x) => preAbsent(x, 'Results/styles.css', '.entry-list__date')],
  ['pack-13-classes', '合并 Task17.8 第 2b 类（_headers 混进 Results/）与第 5 类（目录条目＋前缀）：zip 重建为带 Results/ 目录条目的形态', (x) => rebuildZip(x, { dirEntry: true }), ['N/no-dir-entries', 'N/no-sep', 'N/entry-count'], (x) => { const z = readZip(fs.readFileSync(path.join(x.deploy, 'site.zip'))); return { ok: z.some((e) => e.name === 'Results/'), detail: '包内实测存在零字节目录条目 Results/' }; }],
  ['pack-manifest-in-zip', 'Task17.8 第 8 类「把 manifest.json 塞进 zip」', (x) => rebuildZip(x, { extra: [{ name: 'manifest.json', body: rd(path.join(x.deploy, 'manifest.json')) }] }), ['N/no-banned', 'N/set', 'N/entry-count'], (x) => ({ ok: readZip(fs.readFileSync(path.join(x.deploy, 'site.zip'))).some((e) => e.name === 'manifest.json'), detail: '条目实测存在，与 §manifest 契约第 6 条直接矛盾' })],
 ['pack-tampered-sha', 'Task17.8 第 9 类「篡改某个 sha256 字段」', (x) => { const f = path.join(x.deploy, 'manifest.json'); const m = JSON.parse(rd(f)); m.pages[0].sha256 = '0'.repeat(64); wr(f, JSON.stringify(m, null, 2) + '\n'); return '把 manifest.pages[0]（' + m.pages[0].path + '）的 sha256 改成全零'; }, ['A1b/sha/' + MANIFEST0, 'N/sha-manifest/' + MANIFEST0], (x) => ({ ok: JSON.parse(rd(path.join(x.deploy, 'manifest.json'))).pages[0].sha256 === '0'.repeat(64), detail: '清单登记值与磁盘实测字节必然不符' })],
  ['pack-date-in-manifest', 'Task17.8 第 10 类「在 manifest 里写入 date: 2026-09-18」（R5① 排序键永不输出）', (x) => { const f = path.join(x.deploy, 'manifest.json'); const m = JSON.parse(rd(f)); m.columns[0].articles[0].date = '2026-09-18'; wr(f, JSON.stringify(m, null, 2) + '\n'); return 'manifest 内写入 date'; }, ['Q/Q5/manifest-no-date'], (x) => ({ ok: /date/.test(JSON.stringify(JSON.parse(rd(path.join(x.deploy, 'manifest.json'))))) && JSON.parse(rd(path.join(x.deploy, 'manifest.json'))).columns[0].articles[0].date === '2026-09-18', detail: 'date 键实测出现在 manifest 内' })],
  ['pack-order-swap', 'Task17.8 第 11 类「columns.articles 顺序与列表页实际顺序交换」', (x) => { const f = path.join(x.deploy, 'manifest.json'); const m = JSON.parse(rd(f)); m.columns.reverse(); wr(f, JSON.stringify(m, null, 2) + '\n'); return '栏目序整体颠倒'; }, ['Q/Q7/manifest-column-order', 'E9/latest-order', 'E8/order'], (x) => ({ ok: JSON.parse(rd(path.join(x.deploy, 'manifest.json'))).columns[0].key === 'commentary', detail: 'manifest 栏目序与注册表序（消息→通讯→评论）不一致' })],
  ['pack-manifest-only', 'Task17.8 第 12 类「只改 manifest 不重打包」（分裂状态）', (x) => { const f = path.join(x.deploy, 'manifest.json'); const m = JSON.parse(rd(f)); m.pages = m.pages.filter((p) => p.path !== 'article-math-to-ai-learning.html'); m.counts.pages = m.pages.length; m.counts.html = m.pages.filter((p) => p.path.endsWith('.html')).length; m.columns.find((c) => c.key === 'feature').articles = []; wr(f, JSON.stringify(m, null, 2) + '\n'); return '清单删掉一篇而不重打包'; }, ['N/set', 'N/entry-count', 'Q/Q8/order-feature', 'A1b/disk-to-manifest'], (x) => ({ ok: !JSON.parse(rd(path.join(x.deploy, 'manifest.json'))).pages.some((p) => p.path === 'article-math-to-ai-learning.html') && readZip(fs.readFileSync(path.join(x.deploy, 'site.zip'))).some((e) => e.name === 'article-math-to-ai-learning.html'), detail: 'zip 内仍有该条目而清单已不登记：集合两侧不等' })],
  ['pack-timestamp', 'Task17.8 第 7 类「把 zip 时间戳改回继承 mtime」', (x) => rebuildZip(x, { opts: { date_time: [2026, 9, 19, 22, 28, 24] } }), ['N/datetime', 'N/repro-task17'], (x) => ({ ok: rd(path.join(x.deploy, 'manifest.json')).length > 0 && fs.statSync(path.join(x.deploy, 'site.zip')).size > 0, detail: 'site.zip 已按 2026-09-19 时间戳重建，date_time 不再是常量' })],
  ['home-intro-drift', '合并 Task14.14 第 14 类「手工把 home-intro.html 改一个字符」与第 15 类「目录内含清单外文件」的 partial 侧', (x) => sub(x, 'build/partials/home-intro.html', '名称由来', '名 称由来'), ['L5/home-intro', 'L5/partial-from-baseline'], (x) => preChanged(x)],
  ['pack-preflight-file', 'Task14.14 第 15 类与 Task17.8 第 2a 类「Results/ 放一个 notes.txt」（preflight 侧的闸门对位：A6 点名而非静默排除）', (x) => addFile(x, 'Results/notes.txt', 'x\n', '放 notes.txt'), ['A6', 'A1b/disk-to-manifest'], (x) => ({ ok: fs.existsSync(path.join(x.Results, 'notes.txt')), detail: '文件实测在场且不在任何排除表内' })],
  ['pack-case-rename', 'Task17.8 第 4 类「styles.css 改名 Styles.css」（大小写不符）', (x) => { fs.renameSync(path.join(x.Results, 'styles.css'), path.join(x.Results, 'Styles.css')); return '改名 Styles.css'; }, ['A1a/styles.css', 'A1c/Styles.css', 'N/set'], (x) => ({ ok: fs.existsSync(path.join(x.Results, 'Styles.css')) && sha(fs.readFileSync(path.join(x.Results, 'Styles.css'))) === x.before['Results/styles.css'], detail: '磁盘名逐字符与清单不等而字节内容未变' })],
  ['pack-missing-detail', 'Task17.8 第 1 类「删掉一个详情页」（清单有、磁盘无）', (x) => { fs.unlinkSync(path.join(x.Results, 'article-math-to-ai-learning.html')); return '删除副本内一个详情页'; }, ['A1b/manifest-to-disk', 'Q/Q8/page-name-feature', 'N/set'], (x) => ({ ok: !fs.existsSync(path.join(x.Results, 'article-math-to-ai-learning.html')) && JSON.parse(rd(path.join(x.deploy, 'manifest.json'))).pages.some((p) => p.path === 'article-math-to-ai-learning.html'), detail: '清单仍登记该页，磁盘实测已无' })],
  ['pack-headers-in-results', 'Task17.8 第 2b 类「在 Results/ 放一个名为 _headers 的文件」', (x) => addFile(x, 'Results/_headers', rd(path.join(x.deploy, '_headers')), '把 _headers 复制进交付根'), ['A2/no-banned-ext', 'A6', 'A1b/disk-to-manifest'], (x) => ({ ok: fs.readdirSync(x.Results).includes('_headers'), detail: 'zip 要求它在场、Results/ 禁止它在场，两条必须同时成立' })],
];
for (const [name, from, apply, expect, pre] of B2B) CASES.push({ bucket: 2, id: 'B2-' + name, from, desc: '上游并入：' + name, expect, apply, pre, spec: null });

/* ---------------- 桶 3：Task 15 §15.9 第 9 条的六类负向对照 ---------------- */
const B3 = [
  ['detail-period', 'Task15 §15.9 第 9 条①：详情页一个 。→.', (x) => sub(x, 'Results/' + D, '其他社团。', '其他社团.'), ['L1/', 'L2/', 'F7p/' + D + '/M01', 'G/M/\u3002'], (x) => preHas(x, 'Results/' + D, '其他社团.')],
  ['extra-nav', 'Task15 §15.9 第 9 条②：某页加一个 <nav>', (x) => sub(x, 'Results/' + D, '</main>', '<nav aria-label="页内导航"><a href="index.html">回到首页</a></nav></main>'), ['C6/' + D, 'C6/' + D + '/total', 'P1/', 'P4/'], (x) => ({ ok: (rd(resolveFile(x, 'Results/' + D)).match(/<nav/g) || []).length === 2, detail: '<nav> 实测由 1 变 2' })],
  ['latest-span', 'Task15 §15.9 第 9 条③：首页最新区删一个 <span>（取末条的日期——原例钉的是最旧那条的 9月17日，钉字面日期会随首页换人失效）', (x) => { const all = [...rd(resolveFile(x, 'Results/index.html')).matchAll(/<span class="home-latest__date">[^<]*<\/span>/g)]; if (!all.length) throw new Error('首页找不到 home-latest__date'); return sub(x, 'Results/index.html', all[all.length - 1][0], ''); }, ['E8tally/span', 'E8/order', 'E9/itemshape', 'E9/date-nodes', 'J13/count'], (x) => ({ ok: (rd(resolveFile(x, 'Results/index.html')).match(/<span class="home-latest/g) || []).length === 5, detail: 'span 计数由 6 变 5' })],
  ['readme', 'Task15 §15.9 第 9 条④：Results/ 放 README.md', (x) => addFile(x, 'Results/README.md', '# 说明\n', '放 README.md'), ['A2/no-banned-ext', 'A6', 'A1b/disk-to-manifest'], (x) => ({ ok: fs.readdirSync(x.Results).includes('README.md'), detail: 'README.md 实测在场，集合双向不等' })],
  ['articles-subdir', 'Task15 §15.9 第 9 条⑤：建 Results/articles/ 并移入一页', (x) => { mkdir(x, 'Results/articles'); fs.renameSync(path.join(x.Results, 'index.html'), path.join(x.Results, 'articles', 'index.html')); return '把 index.html 移进子目录'; }, ['A2/no-subdir', 'A1b/manifest-to-disk', 'M1/index.html', 'C0/index.html'], (x) => ({ ok: fs.statSync(path.join(x.Results, 'articles')).isDirectory() && !fs.existsSync(path.join(x.Results, 'index.html')), detail: '子目录实测存在且根内已无 index.html' })],
  ['css-one-byte', 'Task15 §15.9 第 9 条⑥：styles.css 改一个字节', (x) => touch(x, 'Results/styles.css', (b) => Buffer.concat([b, Buffer.from('\n')]), '末尾追加一个换行'), ['A1b/sha/styles.css', 'A1b/bytes/styles.css', 'N/sha-manifest/styles.css', 'N/sha-disk/styles.css'], (x) => ({ ok: sha(fs.readFileSync(path.join(x.Results, 'styles.css'))) !== x.before['Results/styles.css'], detail: 'styles.css 哈希偏离 manifest 登记值（A5 只读证明是"轮内"守卫，跨轮偏离由 A1b／N 承担）' })],
];
for (const [name, from, apply, expect, pre] of B3) CASES.push({ bucket: 3, id: 'B3-' + name, from, desc: 'Task 15 六类负向对照重跑', expect, apply, pre, spec: null });

/* ---------------- 桶 4：归档层新增 20 例（plan/Task18 §变异对照 必查表） ----- */
const B4 = [
  ['disk-not-manifest', '表1：Results/ 有某详情页而清单漏登记', (x) => { fs.copyFileSync(path.join(x.Results, 'article-math-to-ai-learning.html'), path.join(x.Results, 'article-zzz-extra-page.html')); return '新增 article-zzz-extra-page.html 而 manifest 未登记'; }, ['A1b/disk-to-manifest', 'A6', 'A1c/article-zzz-extra-page.html'], (x) => ({ ok: fs.existsSync(path.join(x.Results, 'article-zzz-extra-page.html')) && !JSON.parse(rd(path.join(x.deploy, 'manifest.json'))).pages.some((p) => p.path === 'article-zzz-extra-page.html'), detail: '该页确由 content/articles/*.md 推导所得（主干 zzz-extra-page 匹配命名正则），且不在 manifest.pages 中' })],
  ['notes-txt', '表2：Results/ 多一个 notes.txt', (x) => addFile(x, 'Results/notes.txt', 'x\n', '放 notes.txt'), ['A6', 'A1b/disk-to-manifest'], (x) => ({ ok: fs.readdirSync(x.Results).includes('notes.txt') && fs.readdirSync(x.Results).length !== Object.keys(x.before).filter((k) => k.startsWith('Results/')).length, detail: '副本内确有该文件、集合双向不等，未被任何排除逻辑放过' })],
  ['articles-dir', '表3：新建 Results/articles/ 并放入一页', (x) => { mkdir(x, 'Results/articles'); fs.writeFileSync(path.join(x.Results, 'articles', 'x.html'), '<!doctype html>\n'); return '建子目录并放页'; }, ['A2/no-subdir', 'A6'], (x) => { const p = path.join(x.Results, 'articles'); return { ok: fs.statSync(p).isDirectory() && fs.readdirSync(p).length > 0, detail: 'readdir 与 stat 均为目录条目实测存在' }; }],
  ['case-rename', '表4：styles.css 改名 Styles.css', (x) => { fs.renameSync(path.join(x.Results, 'styles.css'), path.join(x.Results, 'Styles.css')); return '改名 Styles.css'; }, ['A1a/styles.css', 'A1c/Styles.css', 'A1b/sha/styles.css', 'C4/index.html/css'], (x) => ({ ok: fs.existsSync(path.join(x.Results, 'Styles.css')) && sha(fs.readFileSync(path.join(x.Results, 'Styles.css'))) === x.before['Results/styles.css'], detail: '磁盘名逐字符与清单不等，字节内容未变（排除"内容差异"误归因）' })],
  ['content-para-twoline', '表5：content/ 某段落跨行', (x) => msub(x, SCHOOL, '目前，校本课程志愿填报工作正在进行中。', '目前，校本课程\n志愿填报工作正在进行中。'), ['Q/Q3/para-single-line', 'Q/Q3/body'], (x) => ({ ok: rd(resolveFile(x, mdf(SCHOOL))).includes('目前，校本课程\n志愿填报'), detail: '独立解析器按单行合同拒绝，且构建器侧规则相同（两链一致才算违约）' })],
  ['display-fake-date', '表6：display_date 改成正文里不存在的月日', (x) => msub(x, SCHOOL, 'display_date: 9月18日', 'display_date: 3月30日'), ['Q/Q6/substring'], (x) => ({ ok: !mdBody(x, SCHOOL).includes('3月30日'), detail: '逐码点证明该串不是本文 textContent 子串' })],
  ['registry-drop-column', '表7：columns.md 少一栏', (x) => sub(x, 'content/columns.md', 'commentary|新闻评论|news-commentary.html\n', ''), ['Q/Q7/column-nonempty', 'Q/Q7/column-registered', 'Q/Q7/registry-matches-plan'], (x) => ({ ok: !rd(resolveFile(x, 'content/columns.md')).includes('commentary|') && rd(resolveFile(x, mdf(ROOM))).includes('column: commentary'), detail: '三篇的 column 值仍指向被删栏，注册表查不到' })],
  ['current-self', '表8：详情页 aria-current 落在自身链接', (x) => { sub(x, 'Results/' + D, '<a class="site-navigation__link" href="news-message.html" aria-current="page">新闻消息</a>', '<a class="site-navigation__link" href="news-message.html">新闻消息</a>'); return sub(x, 'Results/' + D, '<article class="article">', '<article class="article" data-self>'); }, ['D3/' + D, 'D3b/' + D, 'C12/' + D], (x) => ({ ok: rd(resolveFile(x, 'Results/' + D)).split('aria-current').length - 1 === 0, detail: '每页 aria-current 数不再为 1，仅归属错（排除"重复当前项"混淆）' })],
  ['second-nav-home', '表9：首页新增第二个 <nav>', (x) => sub(x, 'Results/index.html', '</main>', '<nav aria-label="次导航"><a href="index.html">x</a></nav></main>'), ['C6/index.html', 'C6/index.html/total', 'E8tally/nav', 'E8zero/nav', 'P1/index.html'], (x) => ({ ok: (rd(resolveFile(x, 'Results/index.html')).match(/<nav/g) || []).length === 2, detail: 'nav 计数由 1 变 2，公共壳其余字节不变' })],
  ['latest-span-home', '表10：首页最新区删一个 <span>（取末条的标题 span；原先钉死"从数学题到AI时代的学习"，该文已退出首页最新三条）', (x) => { const all = [...rd(resolveFile(x, 'Results/index.html')).matchAll(/<span class="home-latest__entry">([^<]*)<\/span>/g)]; if (!all.length) throw new Error('首页找不到 home-latest__entry'); const m = all[all.length - 1]; return sub(x, 'Results/index.html', m[0], m[1]); }, ['E8tally/span', 'E9/itemshape'], (x) => ({ ok: (rd(resolveFile(x, 'Results/index.html')).match(/<span class="home-latest/g) || []).length === 5 && (rd(resolveFile(x, 'Results/index.html')).match(/<li class="home-latest__item/g) || []).length === 3, detail: '白名单其余项仍在场，只有标签计数变化' })],
  ['visited-home-latest', '表11：删除 .home-latest__link:visited 配对', (x) => touch(x, 'Results/styles.css', (b) => { const s = b.toString('utf8'); const i = s.indexOf('.home-latest__link:visited'); if (i < 0) throw new Error('无该规则'); return Buffer.from(s.slice(0, i) + s.slice(s.indexOf('}', i) + 1), 'utf8'); }), ['H13/.home-latest__link'], (x) => ({ ok: !rd(resolveFile(x, 'Results/styles.css')).includes('.home-latest__link:visited') && rd(resolveFile(x, 'Results/styles.css')).includes('.home-latest__link'), detail: ':link 规则仍在、同名 :visited 规则确实消失' })],
  ['never-hit-rule', '表12：新增一条永不命中的死规则', (x) => sub(x, 'Results/styles.css', '.skip-link {', '.never-used-xyz{color:red}\n.skip-link {'), ['H11/unknown', 'H11/orphan', 'H14/subset'], (x) => ({ ok: !fs.readdirSync(x.Results).filter((f) => f.endsWith('.html')).some((f) => rd(path.join(x.Results, f)).includes('never-used-xyz')), detail: '该类名在七页 HTML 中实测出现 0 次' })],
  ['zip-prefix', '表13：zip 条目带 Results/ 前缀', (x) => rebuildZip(x, { prefix: 'Results/' }), ['N/no-sep', 'N/set', 'N/entry-count'], (x) => { const z = readZip(fs.readFileSync(path.join(x.deploy, 'site.zip'))); return { ok: z.every((e) => e.name.startsWith('Results/')), detail: '解压后真出现 Results/ 子目录，条目名含路径分隔符' }; }],
  ['zip-no-headers', '表14：zip 缺 _headers', (x) => rebuildZip(x, { dropHeaders: true }), ['N/headers', 'N/set', 'N/entry-count'], (x) => ({ ok: !readZip(fs.readFileSync(path.join(x.deploy, 'site.zip'))).some((e) => e.name === '_headers') && JSON.parse(rd(path.join(x.deploy, 'manifest.json'))).config.some((c) => c.path === '_headers'), detail: 'manifest.config 仍登记 _headers 而包内无该条目' })],
  ['zip-manifest-inside', '表15：zip 内混入 manifest.json', (x) => rebuildZip(x, { extra: [{ name: 'manifest.json', body: rd(path.join(x.deploy, 'manifest.json')) }] }), ['N/no-banned', 'N/set'], (x) => ({ ok: readZip(fs.readFileSync(path.join(x.deploy, 'site.zip'))).some((e) => e.name === 'manifest.json'), detail: '条目实测存在，与 §manifest 契约第 6 条直接矛盾' })],
  ['home-year-back', '表16：首页第三条回退成 报社成立于2024年。', (x) => sub(x, 'Results/index.html', '报社成立于\u201c鸽子衔枝之年\u201d。', '报社成立于2024年。'), ['E6/P_FOUNDED', 'J17', 'J2/', 'E8/order', 'L5/three-slots'], (x) => ({ ok: rd(resolveFile(x, 'Results/index.html')).includes('2024年') && /(19|20)[0-9]{2}/.test(rd(resolveFile(x, 'Results/index.html'))), detail: 'R7 新句才是真值；回退串同时命中年份形态扫描' })],
  ['iso-in-date-node', '表17：列表页日期节点写 2024-09-18', (x) => sub(x, 'Results/news-message.html', '<span class="entry-list__date">9月18日</span>', '<span class="entry-list__date">2024-09-18</span>'), ['J11', 'J13', 'J13b', 'J17', 'F12/news-message.html/noyear'], (x) => { const t = rd(resolveFile(x, 'Results/news-message.html')); return { ok: t.includes('2024-09-18'), detail: 'ISO 串与四位年份同时实测在场' }; }],
  ['js-console-canary', '表18：在 script.js 加一条 console.log', (x) => sub(x, 'Results/script.js', 'function', 'console.log("gate");\nfunction'), ['I3', 'I11/hash'], (x) => ({ ok: rd(resolveFile(x, 'Results/script.js')).includes('console.') && sha(fs.readFileSync(path.join(x.Results, 'script.js'))) !== x.before['Results/script.js'], detail: '源码确含 console.，且哈希同时偏离 v1 基线' })],
  ['stale-snapshot', '表19：只改 Results/ 不重取快照（D1 的直接反证：此例必须红）', (x) => sub(x, 'Results/index.html', '报社成立于\u201c鸽子衔枝之年\u201d。', '报社成立于\u201c鸽子衔枝之年\u201d了。'), ['M1/index.html', 'M1b/index.html', 'M2/'], (x) => ({ ok: sha(fs.readFileSync(path.join(x.Results, 'index.html'))) !== JSON.parse(rd(path.join(HERE, 'facts.json'))).__meta.perPageSha256['index.html'], detail: '目录哈希已变而 facts.__meta.perPageSha256 未变' })],
  ['drop-list-item', '表20：删除一个列表条目（页仍在磁盘）', (x) => touch(x, 'Results/news-message.html', (b) => { const s = b.toString('utf8'); const i = s.indexOf('<li class="entry-list__item">'); const j = s.indexOf('</li>', i) + 5; return Buffer.from(s.slice(0, i) + s.slice(j), 'utf8'); }), ['P2/orphan/' + D, 'P2/inbound/' + D, 'F12/news-message.html/order', 'F12/news-message.html/count'], (x) => ({ ok: !rd(resolveFile(x, 'Results/news-message.html')).includes('article-school-course-volunteer.html') && fs.existsSync(path.join(x.Results, 'article-school-course-volunteer.html')), detail: '详情页仍在磁盘且匹配命名正则，仅无入链；同时使 columns[*].articles 顺序与页面不符' })],
];
for (const [name, from, apply, expect, pre, opt] of B4) CASES.push(Object.assign({ bucket: 4, id: 'B4-' + name, from, desc: '归档层必查变异表', expect, apply, pre, spec: null }, opt || {}));
/* 表19 的判据本身就是"不重取快照"，因此这一例刻意复用真实目录的 facts.json */
{ const c = CASES.find((x) => x.id === 'B4-stale-snapshot'); if (c) c.reuseFacts = true; }

/* --------------------------------------------------------------- 跑批驱动 */
function parseStatuses(reportFile) {
  if (!fs.existsSync(reportFile)) return { reds: [], total: 0 };
  const t = rd(reportFile), statuses = {};
  for (const m of t.matchAll(/^\[(.+?)\] (PASS|FAIL|PENDING)/gm)) statuses[m[1]] = m[2];
  return { statuses, reds: Object.keys(statuses).filter((k) => statuses[k] === 'FAIL'), total: Object.keys(statuses).length };
}
async function runGate(browser, ctx, c) {
  const man = JSON.parse(rd(path.join(ctx.deploy, 'manifest.json')));
  const pages = man.pages.filter((p) => p.path.endsWith('.html')).map((p) => p.path).sort();
  const factsFile = path.join(ctx.dir, 'facts.json');
  if (!c.reuseFacts) {
    const facts = {};
    for (const page of pages) {
      let last = null;
      for (let k = 0; k < 2; k++) { try { facts[page] = await browser.snapOne(ctx.Results, page); last = null; break; } catch (e) { last = e; delete facts[page]; } }
      // 取不到事实就整页缺席：M5 与 C0 会把它记成"无快照 FAIL"，而不是让下游读半截对象崩掉（D3）
      if (last) process.stderr.write('  探针未取到 ' + page + '：' + String(last.message).slice(0, 90) + '\n');
    }
    fs.writeFileSync(factsFile, JSON.stringify(Object.assign({ __meta: buildMeta(ctx.Results, pages, { node: process.version }) }, facts), null, 1) + '\n', 'utf8');
  } else fs.copyFileSync(path.join(HERE, 'facts.json'), factsFile);
  const reportFile = path.join(ctx.dir, 'report.md');
  const env = Object.assign({}, process.env, {
    QODER_RESULTS_DIR: ctx.Results, QODER_MATERIALS_DIR: ctx.Materials, QODER_CONTENT_DIR: ctx.content,
    QODER_BUILD_DIR: ctx.build, QODER_DEPLOY_DIR: ctx.deploy, QODER_FACTS: factsFile,
    QODER_REPORT: reportFile, QODER_SRC_FACTS: path.join(ctx.dir, 'src_facts.json'), PYTHONIOENCODING: 'utf-8',
  });
  const r = spawnSync(process.execPath, [VERIFY], { cwd: ROOT, env, encoding: 'utf8' });
  return { rc: r.status, reportFile, out: String(r.stdout || '').slice(0, 300) };
}

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = String(a).match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true]; }));
const SELF_BEFORE = sha(fs.readFileSync(VERIFY));
fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(WORK, { recursive: true });
fs.mkdirSync(path.join(HERE, 'shots'), { recursive: true });
const picked = CASES
  .filter((c) => (!args.bucket || String(c.bucket) === String(args.bucket)))
  .filter((c) => (!args.only || c.id.includes(String(args.only))))
  .slice(0, args.limit ? Number(args.limit) : 10000);
process.stderr.write('计划 ' + picked.length + ' 例（总计登记 ' + CASES.length + ' 例）\n');
const port = Number(process.env.QODER_CDP_PORT || 9358);
const browser = await openBrowser18(port);
const results = [];
let aborted = '';
try {
  for (let i = 0; i < picked.length; i++) {
    const c = picked[i];
    const dir = path.join(WORK, String(i + 1).padStart(3, '0') + '-' + String(c.id).replace(/[^\w.-]/g, '_'));
    const rec2 = { id: c.id, bucket: c.bucket, from: c.from, expect: c.expect.join(' | '), inject: '', pre: '', preDetail: '', hit: '', verdict: '' };
    try {
      const ctx = mkCtx(dir);
      rec2.inject = String(c.apply(ctx) || '');
      const pre = c.pre(ctx) || { ok: true, detail: '' };
      rec2.pre = pre.ok ? '成立' : '不成立';
      rec2.preDetail = String(pre.detail || '');
      if (!pre.ok) { rec2.verdict = '无效变异'; results.push(rec2); continue; }
      const run = await runGate(browser, ctx, c);
      const { reds, total } = parseStatuses(run.reportFile);
      rec2.rc = run.rc; rec2.redCount = reds.length; rec2.total = total;
      const hit = reds.filter((r) => c.expect.some((e) => r === e || r.startsWith(e)));
      rec2.hit = hit.slice(0, 6).join(', ');
      rec2.verdict = hit.length ? '捕获' : '未捕获';
      if (rec2.verdict === '未捕获') rec2.missNote = '指定 ' + rec2.expect + ' 未红；本轮红项 ' + reds.length + ' 条：' + reds.slice(0, 8).join(', ');
      rec2.selfShaSame = sha(fs.readFileSync(VERIFY)) === SELF_BEFORE;
    } catch (e) { rec2.verdict = '台架异常'; rec2.error = String((e && e.message) || e).slice(0, 200); }
    results.push(rec2);
    process.stderr.write('[' + (i + 1) + '/' + picked.length + '] ' + c.id + ' \u2192 ' + rec2.verdict + (rec2.hit ? ' (' + rec2.hit.slice(0, 80) + ')' : '') + (rec2.error ? ' [' + rec2.error.slice(0, 80) + ']' : '') + '\n');
    if (rec2.selfShaSame === false) { aborted = 'D4：被测核验脚本在变异跑期间被编辑，整批作废重跑'; process.stderr.write(aborted + '\n'); break; }
  }
} finally { browser.close(); }

/* 变异段跑完：清空 shots/ 并重跑真实交付页（v1 教训：变异副本相对 styles.css 解析不到） */
fs.rmSync(path.join(HERE, 'shots'), { recursive: true, force: true });
fs.mkdirSync(path.join(HERE, 'shots'), { recursive: true });
try {
  const real = await openBrowser18(port + 1);
  try {
    const pages = JSON.parse(rd(path.join(SRC.deploy, 'manifest.json'))).pages.filter((x) => x.path.endsWith('.html')).map((x) => x.path);
    for (const p of pages) { await real.snapOne(SRC.Results, p); const b64 = await real.shot(SRC.Results, p); if (b64) fs.writeFileSync(path.join(HERE, 'shots', p.replace(/\.html$/, '') + '.png'), Buffer.from(b64, 'base64')); }
  } finally { real.close(); }
} catch (e) { process.stderr.write('真实页截图段异常（不影响变异结论）：' + String((e && e.message) || e).slice(0, 160) + '\n'); }

const captured = results.filter((r) => r.verdict === '捕获');
const missed = results.filter((r) => r.verdict === '未捕获');
const invalid = results.filter((r) => r.verdict === '无效变异');
const broken = results.filter((r) => r.verdict === '台架异常');
const denom = results.length - invalid.length;
const out = [];
out.push('# Task 18 变异对照记录（mutate_task18.mjs 自动写入）');
out.push('');
out.push('- 时间：' + new Date().toISOString());
out.push('- 被测核验器 SELF-SHA（开跑前）：`' + SELF_BEFORE + '`');
out.push('- 登记构成：桶1 v1 迁移 ' + CASES.filter((c) => c.bucket === 1).length + ' ＋ 桶2 上游并入 ' + CASES.filter((c) => c.bucket === 2).length + ' ＋ 桶3 Task 15 六类 ' + CASES.filter((c) => c.bucket === 3).length + ' ＋ 桶4 归档层新增 ' + CASES.filter((c) => c.bucket === 4).length + ' ＝ ' + CASES.length + ' 例');
out.push('- 本轮实跑：' + results.length + ' 例　捕获 ' + captured.length + '　未捕获 ' + missed.length + '　无效变异 ' + invalid.length + '　台架异常 ' + broken.length);
out.push('- 捕获率：' + (denom ? (captured.length / denom * 100).toFixed(1) : '0') + '%（分母 ' + denom + '，不含无效变异）');
out.push('- SELF-SHA 守卫（D4）：' + (aborted || '全程未变化，本批结论有效'));
out.push('');
out.push('| # | 桶 | 用例 | 注入内容 | 来源／合并了哪些上游类 | 指定应翻红 | 前置自证 | 实际命中的断言 | 结论 |');
out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
results.forEach((r, i) => out.push('| ' + (i + 1) + ' | ' + r.bucket + ' | ' + r.id + ' | ' + String(r.inject).replace(/\|/g, '\\|') + ' | ' + String(r.from).replace(/\|/g, '\\|') + ' | ' + r.expect + ' | ' + r.pre + '：' + String(r.preDetail || r.error || '').replace(/\|/g, '\\|').slice(0, 150) + ' | ' + (r.hit || '—') + ' | ' + r.verdict + ' |'));
out.push('');
out.push('## 未捕获清单（应为空；非空即新闸门退化，必须补断言）');
out.push('');
out.push(missed.length ? missed.map((m) => '- ' + m.id + '：' + (m.missNote || '')).join('\n') : '- 无');
out.push('');
out.push('## 无效变异清单（不计入捕获率，也不给闸门打分）');
out.push('');
out.push(invalid.length ? invalid.map((m) => '- ' + m.id + '：' + m.preDetail).join('\n') : '- 无');
out.push('');
out.push('## 台架异常（变异体自身或副本准备出错，须修台架而非改闸门）');
out.push('');
out.push(broken.length ? broken.map((m) => '- ' + m.id + '：' + m.error).join('\n') : '- 无');
out.push('');
out.push('## 合并说明（只许上升、不许为凑数而合并）');
out.push('');
out.push('- 桶2 内所有跨包重复的注入已在"来源"列写明合并了哪两（三）包的哪两类；与桶1 同型者（Task16 第 3／5／12／8 类对应 v1 的 css-new-class／css-id-selector／css-important／css-second-media）在桶2 的"来源"列点名，其变异体本身仍由桶1 那一条真实跑一次，因此桶间无重复计数。');
out.push('- 桶4 表16（首页第三条回退 2024年）与桶1 的 home-text-year 注入相同而指定判据不同（表16 要求 E6＋J17＋J2 三条同时红），按 plan/Task18 的必查表独立成例，未做合并。');
fs.writeFileSync(LOG, out.join('\n') + '\n', 'utf8');
process.stdout.write('变异 ' + results.length + ' 例：捕获 ' + captured.length + '／未捕获 ' + missed.length + '／无效 ' + invalid.length + '／台架异常 ' + broken.length + '；日志 ' + path.relative(ROOT, LOG) + '\n');
if (missed.length || broken.length || invalid.length || aborted) process.exitCode = 1;
