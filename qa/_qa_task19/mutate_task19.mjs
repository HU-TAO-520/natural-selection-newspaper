/* Task 19 — 回归器自身有效性（十例变异注入，全部在 _qa_task19/mutants/ 副本目录）
 *
 * 核验器全绿只证明交付物没坏，不证明回归器有牙（_qa_task10 的结论，本包同样适用）。
 *
 * 两台一套：每例都跑 **control（只含结构性准备、不含违约）** 与 **mutant（含违约）** 两遍，
 * 捕获 = 指定判据在 mutant 红、且在 control 绿（FAIL 集合做差）。
 * 为什么必须做差：多条目副本（变异 1 的靶页）里"视觉次序 == manifest 次序"这一腿
 * 在 control 下也红（假文章标题本就不是清单标题），不做差就会把一条既有红灯当成
 * 本例捕获，那等于没有对照。
 *
 * 每台带前置自证：违约必须在字节层与（能测的地方）渲染层确实成立；
 * 不成立的记"无效变异"，不计入捕获率，也不给闸门打分。
 * 第 1 例（column-reverse）必须红：红不了就说明 K2 退化成读源码顺序。
 *
 * 台架守卫（v1 教训）：
 *   · SELF-SHA：变异跑期间编辑 _qa_task19 脚本 → 整批作废（读到半写入源码会得到"0 条 FAIL"）
 *   · 副本目录自带 styles.css / script.js，避免"相对路径解析不到样式"被误读为样式没生效
 *   · 真实 Results/ 批次前后逐项哈希必须相等
 *   · Chrome profile 目录带时间戳且删除容错：复用同名目录会被上一台的占用撞出 EPERM 崩掉整批
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { loadContract, HERE, ROOT } from './contract19.mjs';
import { buildPressureListPage } from './pressure_page19.mjs';

const C = loadContract();
const REAL = path.join(ROOT, 'Results');
const MDIR = path.join(HERE, 'mutants');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sha = (f) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const NOTES = [];
function selfSha() { return fs.readdirSync(HERE).filter((f) => /\.(mjs|html)$/.test(f)).sort().map((f) => f + '@' + sha(path.join(HERE, f))).join('\n'); }
function resultsHash() { return fs.readdirSync(REAL).sort().map((f) => f + '@' + sha(path.join(REAL, f))).join('\n'); }
const SHA_START = selfSha();
const REAL_START = resultsHash();

/* 复制九文件；prep 对 control 与 mutant 都施加，inj 只施加给 mutant */
function buildCopy(name, prep, inj, forReal) {
  const dst = path.join(MDIR, name);
  fs.rmSync(dst, { recursive: true, force: true });
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(REAL)) {
    const s = path.join(REAL, f);
    if (!fs.statSync(s).isFile()) continue;
    let text = fs.readFileSync(s, 'utf8');
    if (prep && prep[f]) text = prep[f](text);
    if (forReal && inj && inj[f]) text = inj[f](text);
    fs.writeFileSync(path.join(dst, f), text);
  }
  return { dst, read: (f) => fs.readFileSync(path.join(dst, f), 'utf8') };
}
const mustHave = (t, n, label) => { if (!t.includes(n)) throw new Error('注入锚点缺失：' + label); };

/* ---------- 渲染层前置自证：独立最小 CDP 会话量真实结果 ---------- */
async function renderProof(dir, page, expr, port) {
  const PROFILE = path.join(HERE, '.cdpmut' + port + '-' + Date.now());
  const clean = () => { try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch { /* 被 Chrome 占住就留着，下一台换名 */ } };
  clean();
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + PROFILE,
    '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-dev-shm-usage', '--hide-scrollbars',
    '--allow-file-access-from-files', '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
  let ws, mid = 0; const pending = new Map(); const listeners = [];
  const send = (method, params = {}) => new Promise((res, rej) => { const id = ++mid; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error('CDP 超时 ' + method)); } }, 20000); });
  try {
    for (let i = 0; i < 120; i++) { try { const l = await fetch('http://127.0.0.1:' + port + '/json/version'); if (l.ok) break; } catch {} await sleep(200); }
    const list = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
    ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws 失败')); });
    ws.onmessage = (m) => {
      let d; try { d = JSON.parse(m.data); } catch { return; }
      if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(JSON.stringify(d.error))) : p.res(d.result); return; }
      listeners.forEach((f) => { try { f(d); } catch {} });
    };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 1000, deviceScaleFactor: 1, mobile: false });
    const w = new Promise((res) => { const h = (m) => { if (m.method === 'Page.loadEventFired') { const i = listeners.indexOf(h); if (i >= 0) listeners.splice(i, 1); res(true); } }; listeners.push(h); setTimeout(() => res(false), 12000); });
    await send('Page.navigate', { url: 'file:///' + encodeURI(path.join(dir, page).split(path.sep).join('/')) });
    await w; await sleep(500);
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    return r.result ? r.result.value : null;
  } finally {
    try { ws && ws.close(); } catch {}
    try { proc.kill(); } catch {}
    clean();
  }
}

async function runDriver(seg, dir, tag, port, extra) {
  return new Promise((res) => {
    const out = fs.openSync(path.join(HERE, 'mutant_run' + tag + '.txt'), 'a');
    const p = spawn(process.execPath, [path.join(HERE, 'cdp_regression19.mjs')], {
      env: Object.assign({}, process.env, { QODER_PASS: seg, QODER_RESULTS_DIR: dir, QODER_TAG: tag, QODER_CDP_PORT: String(port) }, extra || {}),
      stdio: ['ignore', out, out],
    });
    p.on('exit', (code) => { fs.closeSync(out); res(code); });
  });
}
function failIds(tag) {
  const rf = path.join(HERE, 'results' + tag + '.json');
  if (!fs.existsSync(rf)) return null;
  const rj = JSON.parse(fs.readFileSync(rf, 'utf8'));
  return { fail: new Set(rj.rows.filter((r) => r.status === 'FAIL').map((r) => r.id)), n: rj.rows.length, rows: rj.rows };
}
/* 渲染层差分前置自证：同一判据在 control 与 mutant 两次独立采样里读到的像素值必须不同，
 * 否则"违约"只存在于 CSS 文本、没有落到屏幕（例如 :visited 色不传播给后代文本节点）。 */
function renderDelta(fc, fm, id) {
  if (!fc || !fm) return { ok: false, detail: '两台之一没出报告，无法做渲染层差分' };
  const c = fc.rows.filter((r) => r.id === id), m = fm.rows.filter((r) => r.id === id);
  if (!c.length || !m.length) return { ok: false, detail: id + ' 在两台中至少一台没跑出条目（control ' + c.length + ' 条 / mutant ' + m.length + ' 条）' };
  let diff = null;
  for (const a of c) { const b = m.find((x) => x.page === a.page && x.step === a.step); if (b && b.actual !== a.actual) { diff = { ctl: a.actual, mut: b.actual, page: a.page }; break; } }
  return diff
    ? { ok: true, detail: id + ' 渲染层差分成立：control ' + diff.ctl.slice(0, 90) + ' ≠ mutant ' + diff.mut.slice(0, 90) }
    : { ok: false, detail: id + ' 两台采到的像素逐条相同（共 ' + c.length + ' 条）→ 违约没有落到屏幕，属无效变异；该 DOM 形状由静态链（Task 18 H13）守' };
}

/* 多条目准备：把三张栏目页各铺 4 条（保留真实壳与真实 href）。
 * control 与 mutant 都施加，唯一差别是有没有那条反序 CSS。
 * 假文章标题不是清单标题，所以"视觉==manifest 次序"那条腿在对照组也红 ——
 * 本例因此指定"视觉==DOM 次序"这条腿（RK2b），并用差分排除既有红灯。 */
function buildMultiEntry(dstDir, label, nPerCol) {
  for (const c of C.columns) {
    const real = fs.readFileSync(path.join(dstDir, c.list), 'utf8');
    const items = [];
    for (let i = 0; i < nPerCol; i++) {
      items.push('      <li class="entry-list__item">\n        <a class="entry-list__link" href="' + c.articles[0].page + '">'
        + '<span class="entry-list__title">' + c.label + '样本条目' + (i + 1) + '（含 Windows 10 与 4K 混排长标题 volunteer-club-note）</span>'
        + '<span class="entry-list__date">9月' + (i + 1) + '日</span></a>\n      </li>');
    }
    const re = /[ \t]*<ul class="entry-list">[\s\S]*?<\/ul>/;
    if (!re.test(real)) throw new Error('找不到 .entry-list：' + c.list);
    fs.writeFileSync(path.join(dstDir, c.list), real.replace(re, '    <ul class="entry-list">\n' + items.join('\n') + '\n    </ul>'));
  }
}

async function main() {
  fs.mkdirSync(MDIR, { recursive: true });
  const cases = [];
  const add = (o) => cases.push(o);
  const COL0 = C.columns[0], ART0 = C.columns[0].articles[0].page, ART1 = C.columns[1].articles[0].page;

  /* 1 —— .entry-list 反序：K2 的"视觉次序 == DOM 次序"这条腿必须红 */
  add({
    name: 'm01-column-reverse', page: COL0.list, seg: 'desktop,mobile', expectIds: ['RK2b'],
    prep: 'multi-entry', prepNote: '两张台架都各铺 4 条（假文章标题，非清单标题）：单条栏目反不出顺序',
    injDesc: '副本 styles.css 追加 `.entry-list{display:flex;flex-direction:column-reverse}`（DOM 源码顺序保持不动）',
    why: '合同第 1 例。字面只加 flex-direction 对 block 级 ul 不产生视觉变化，故同时声明 display:flex；前置自证以"bounding box 反序确实成立"为准',
    inj: { 'styles.css': (t) => { mustHave(t, '--reading-max', 'styles.css'); return t + '\n.entry-list { display: flex; flex-direction: column-reverse; }\n'; } },
    env: { QODER_WIDTHS: '1024', QODER_WIDTHS_M: '375' },
    preExpr: '(() => { var it=[].slice.call(document.querySelectorAll(".entry-list__item")); var dom=it.map(function(e){return e.querySelector(".entry-list__title").textContent;}); var vis=it.map(function(e){return [e.getBoundingClientRect().top, e.querySelector(".entry-list__title").textContent];}).sort(function(a,b){return a[0]-b[0];}).map(function(x){return x[1];}); return JSON.stringify({n:it.length, dom0:dom[0], vis0:vis[0], reversed: dom.join(">")!==vis.join(">")}); })()',
    preOk: (v) => { try { const o = JSON.parse(v); return o.n >= 2 && o.reversed === true; } catch { return false; } },
    preKind: '渲染层（bounding box 与 DOM 序列确实反序）',
  });
  /* 2 —— 详情页 aria-current 挪到非所属栏目链接 */
  add({
    name: 'm02-aria-current-self', page: ART0, seg: 'list', expectIds: ['RK4'],
    injDesc: ART0 + ' 的 aria-current 从所属栏目 ' + COL0.list + ' 挪到「首页」链接上',
    why: '合同第 2 例。详情页在四链接导航里没有"自身"节点，挪到非所属链接是同一违约面：当前项归属错',
    inj: {
      [ART0]: (t) => { const a = t.replace('<a class="site-navigation__link" href="index.html">首页</a>', '<a class="site-navigation__link" href="index.html" aria-current="page">首页</a>'); mustHave(a, 'href="index.html" aria-current="page"', '首页加 aria-current'); const b = a.replace('<a class="site-navigation__link" href="' + COL0.list + '" aria-current="page">', '<a class="site-navigation__link" href="' + COL0.list + '">'); mustHave(b, 'href="' + COL0.list + '">', '栏目链接去 aria-current'); return b; },
    },
    preExpr: '(() => { var ls=[].slice.call(document.querySelectorAll(".site-navigation__link")); return JSON.stringify({cur: ls.filter(function(a){return a.getAttribute("aria-current")==="page";}).map(function(a){return a.getAttribute("href");})}); })()',
    preOk: (v) => { try { const o = JSON.parse(v); return o.cur.length === 1 && o.cur[0] === 'index.html'; } catch { return false; } },
    preKind: '字节层 + 渲染层（当前项落在首页链接）',
  });
  /* 3 —— 首页最新区第二条 href 指向别栏文章 */
  add({
    name: 'm03-latest-href-other-column', page: 'index.html', seg: 'list', expectIds: ['RK3'],
    injDesc: '首页最新区第 2 条 href 改为全局序末位页 article-' + C.globalOrder[C.globalOrder.length - 1].slug + '.html（不在最新三条内），标题仍是该条原标题（R11①：判据取自全局序，不再假设每栏目一条）',
    why: '合同第 3 例：K3 要求标题与 href 双一致，本例破坏 href 一侧',
    inj: {
      'index.html': (t) => { let k = 0; const other = C.globalOrder[C.globalOrder.length - 1].slug, otherPage = 'article-' + other + '.html'; const out = t.replace(/<a class="home-latest__link" href="([^"]+)">/g, (mm, h) => { k++; return k === 2 ? '<a class="home-latest__link" href="' + otherPage + '">' : mm; }); if (k !== 3) throw new Error('最新区链接数=' + k); mustHave(out, 'href="' + otherPage + '"><span class="home-latest__entry">' + C.mdMeta[C.latestPages[1]].title, '第 2 条改指最新区外的别栏页'); return out; },
    },
    preExpr: '(() => { var a=document.querySelectorAll(".home-latest__link")[1]; return JSON.stringify({href:a.getAttribute("href"), title:a.querySelector(".home-latest__entry").textContent}); })()',
    /* 自证的是"违约已落在 mutant 上"，不是"mutant 仍等于合同值"：
     * href 必须已经是注入的靶页，标题必须仍是最新区第 2 条的原标题（本例破坏的是 href 一侧），
     * 且靶页确实落在最新区之外——否则这条变异什么也没破坏，红绿都无意义。 */
    preOk: (v) => { try { const o = JSON.parse(v), target = 'article-' + C.globalOrder[C.globalOrder.length - 1].slug + '.html'; return o.href === target && o.title === C.mdMeta[C.latestPages[1]].title && !C.latestPages.includes(target); } catch { return false; } },
    preKind: '渲染层（第二条 href 已指向最新区外页面，标题仍是第 2 条原标题 → href/标题双一致被单边破坏）',
  });
  /* 4 —— 删掉 .home-latest__link:visited（文本在子 span 里） */
  add({
    name: 'm04-drop-home-latest-visited', page: 'index.html', seg: 'visited-pixel', expectIds: ['RN7'],
    injDesc: '删除 `.home-latest__link:visited{color:var(--color-ink)}` 整条规则（全局 `a:visited{color:accent}` 随即接管）',
    why: '合同第 4 例：静态写了 :visited 不代表生效（运行面），生效了不代表每处都写了（静态面由 Task 18 的 H13 抓）。本例用渲染层差分做前置自证，而不是只看 CSS 文本',
    inj: { 'styles.css': (t) => { const out = t.replace(/\.home-latest__link:visited\s*\{[^}]*\}/s, '/* 变异：删除 home-latest 的 :visited 覆盖 */'); mustHave(out, '变异：删除 home-latest', ':visited 规则删除'); return out; } },
    preByte: (h) => !h.read('styles.css').includes('.home-latest__link:visited') && h.read('styles.css').includes('a:visited'),
    preKind: '字节层（组件 :visited 覆盖已删，全局 a:visited 仍在）',
    renderDiffAgainst: 'RN7',
  });
  /* 4b —— 同类违约，但文本直接写在链接里：这条必须让像素链翻红，否则链子没有牙 */
  add({
    name: 'm04b-drop-site-navigation-visited', page: 'index.html', seg: 'visited-pixel', expectIds: ['RN4'],
    injDesc: '删除 `.site-navigation__link:visited{color:var(--color-ink)}` 整条规则（主导航链接的文字是 `<a>` 的直接子节点）',
    why: '与合同第 4 例同一违约面、换一个 DOM 形状：用来证明 R-N 像素链确实能分辨"已访问覆盖被删"，而不是只会看 CSS 文本',
    inj: { 'styles.css': (t) => { const out = t.replace(/\.site-navigation__link:visited\s*\{[^}]*\}/s, '/* 变异：删除主导航链接的 :visited 覆盖 */'); mustHave(out, '变异：删除主导航链接', ':visited 规则删除'); return out; } },
    preByte: (h) => !h.read('styles.css').includes('.site-navigation__link:visited') && h.read('styles.css').includes('a:visited'),
    preKind: '字节层（主导航 :visited 覆盖已删）',
    renderDiffAgainst: 'RN4',
  });
  /* 4c —— 像素链的可分辨性正证：把当前页链接的暗红改成纸色，RN5 必须翻红。
   * 为什么需要这例：m04 与 m04b 的渲染层差分都显示"两台像素逐条相同"，
   * 说明本机 headless=new + file:// + 全新 profile 下 :visited 根本不改变绘制。
   * 那两条判据（已访问态）在本环境只能由链 A + Task 18 的 H13 静态配对守；
   * 本例证明"链 B 有牙"——只要屏幕颜色真变了，它就红。 */
  add({
    name: 'm04c-paint-current-link-paper', page: 'index.html', seg: 'visited-pixel', expectIds: ['RN5', 'RK4-PIX'],
    injDesc: '副本 styles.css 追加 `.site-navigation__link[aria-current="page"]{color:var(--color-paper)!important; border-bottom-color:var(--color-paper)!important;}`（当前项高亮在屏幕上整体消失：文字与 2px 实线都涂成纸色）',
    why: '与第 4 例同一判据面（R-N 链 B 的像素定类 + K4 的当前项配色），换一个在渲染层确实可见的违约形状。注：第一次尝试只改文字色时被判"两台像素相同"—— 当前项的 2px 暗红实下边线本身是区内最强的纯色像素，只改文字不动线，聚类仍被那条线定类；这条正好说明判据量的是"屏幕上那一块到底长什么样"',
    inj: { 'styles.css': (t) => { mustHave(t, '--color-paper', 'styles.css 变量'); return t + '\n.site-navigation__link[aria-current="page"] { color: var(--color-paper) !important; border-bottom-color: var(--color-paper) !important; }\n'; } },
    preExpr: '(() => { var ls=[].slice.call(document.querySelectorAll(".site-navigation__link")); var a=ls.filter(function(e){return e.getAttribute("aria-current")==="page";})[0]; if(!a) return JSON.stringify({miss:1}); var s=getComputedStyle(a); return JSON.stringify({color:s.color, bb:s.borderBottomColor}); })()',
    preOk: (v) => { try { const o = JSON.parse(v); return o.color === C.PAPER && o.bb === C.PAPER; } catch { return false; } },
    preKind: '渲染层（当前页链接的计算色与下边线颜色都变成纸色）',
    renderDiffAgainst: 'RN5',
  });
  /* 5 —— 触控下限 44 → 28，同时把 padding/gap/字号压到实测 <44 */
  add({
    name: 'm05-shrink-tap-target', page: COL0.list, seg: 'tap', expectIds: ['RD1'],
    injDesc: '移动档 `.entry-list__link` min-block-size 44px→28px，并 padding-block:0、gap:0、标题与日期字号压到 9px/line-height 1',
    why: '合同第 5 例（v1 真实教训）：只改声明而 padding 仍撑住时渲染层没有违约，那种是无效变异而不是漏检',
    inj: { 'styles.css': (t) => t + '\n@media (max-width: 768px) {\n  .entry-list__link { min-block-size: 28px; padding-block: 0; gap: 0; }\n  .entry-list__title, .entry-list__date { font-size: 9px; line-height: 1; }\n}\n' },
    preExpr: '(() => { var e=document.querySelector(".entry-list__link"); var r=e.getBoundingClientRect(); return JSON.stringify({h:Math.round(r.height), w:Math.round(r.width)}); })()',
    preOk: (v) => { try { const o = JSON.parse(v); return o.h < 44 && o.w >= 44; } catch { return false; } },
    preKind: '渲染层（375px 下实测高度 <44 而宽度仍 ≥44）',
  });
  /* 6 —— script.js 去掉 matchMedia 重置 → R-G 红 */
  add({
    name: 'm06-drop-matchmedia-reset', page: 'index.html', seg: 'cross', expectIds: ['RG1'],
    injDesc: '删除 `media.addEventListener("change", handleBreakpoint)` 的注册分支（其余行为不动）',
    why: '合同第 6 例：跨到桌面断点必须自动关闭菜单',
    inj: { 'script.js': (t) => { const out = t.replace(/if \(typeof media\.addEventListener === 'function'\)[\s\S]*?\n  \}\n/, '  /* 变异：不注册 matchMedia change 监听 */\n'); mustHave(out, '变异：不注册 matchMedia', '监听删除'); if (out.includes('"change"')) throw new Error('change 仍在，注入无效'); return out; } },
    preByte: (h) => !h.read('script.js').includes('"change"') && h.read('script.js').includes('matchMedia'),
    preKind: '字节层（matchMedia 仍在但 change 监听已摘除）',
  });
  /* 7 —— 注入 console.log → R-J 红 */
  add({
    name: 'm07-inject-console-log', page: 'index.html', seg: 'content', expectIds: ['RJ4'],
    injDesc: 'script.js 末尾注入 `console.log("task19-mutant-noise")` 并置 window.__mutantRan',
    why: '合同第 7 例：R-J 断言控制台 0 输出',
    inj: { 'script.js': (t) => t.replace('})();', '  console.log("task19-mutant-noise");\n  window.__mutantRan = true;\n})();') },
    preExpr: '(() => JSON.stringify({ran: window.__mutantRan === true, cls: document.documentElement.className}))()',
    preOk: (v) => { try { return JSON.parse(v).ran === true; } catch { return false; } },
    preKind: '渲染层（注入语句确实被执行过，排除"读到半写入脚本"的假漏检）',
  });
  /* 8 —— 注入外部图片 → R-A 网络计数红 */
  add({
    name: 'm08-inject-external-image', page: 'index.html', seg: 'load', expectIds: ['RA2'],
    injDesc: '首页 </main> 前注入 `<img src="https://task19-mutant.invalid/x.png" alt="">`',
    why: '合同第 8 例：全站外部网络请求数必须为 0',
    inj: { 'index.html': (t) => { const out = t.replace('</main>', '    <img src="https://task19-mutant.invalid/x.png" alt="">\n  </main>'); mustHave(out, 'task19-mutant.invalid', '外链图片注入'); return out; } },
    preExpr: '(() => { var i=document.querySelector("img"); return JSON.stringify({n:document.querySelectorAll("img").length, src:i?i.getAttribute("src"):null}); })()',
    preOk: (v) => { try { const o = JSON.parse(v); return o.n >= 1 && /^https:/.test(String(o.src)); } catch { return false; } },
    preKind: '渲染层（DOM 里真有指向 http(s) 的图片）',
  });
  /* 9 —— 正文句号换半角 → R-J 码点红 */
  const ART2 = C.columns[2].articles[0].page;
  add({
    name: 'm09-punctuation-swap', page: ART2, seg: 'content', expectIds: ['RJ1'],
    injDesc: ART2 + ' 首个段落末尾的 `。`（U+3002）替换为 `.`（U+002E）',
    why: '合同第 9 例：逐段码点比较必须抓到单字符差异',
    inj: { [ART2]: (t) => { const i = t.indexOf('。</p>'); if (i < 0) throw new Error('找不到 。</p> 锚点'); return t.slice(0, i) + '.</p>' + t.slice(i + 5); } },
    preExpr: '(() => { var ps=[].slice.call(document.querySelectorAll(".article__body > p")); var i=-1; for (var k=0;k<ps.length;k++){ var t=ps[k].textContent.trim(); if(/[.]$/.test(t) && !/[。]$/.test(t)){ i=k; break; } } return JSON.stringify({idx:i, last: i>=0 ? "U+"+ps[i].textContent.trim().slice(-1).codePointAt(0).toString(16).toUpperCase().padStart(4,"0") : null, paras:ps.length}); })()',
    preOk: (v) => { try { const o = JSON.parse(v); return o.idx >= 0 && o.last === 'U+002E'; } catch { return false; } },
    preKind: '渲染层（确有某段末尾字符码点变成 U+002E；不假设它落在第一段）',
  });
  /* 10 —— 详情页 <h1> 加书名号 → K5 红 */
  add({
    name: 'm10-h1-add-booktitle-mark', page: ART1, seg: 'list', expectIds: ['RK5'],
    injDesc: ART1 + ' 的 <h1> 外加书名号《》，<title> 保持原样',
    why: '合同第 10 例：K5 要求 <h1> 与标签页标题主体逐字符一致',
    inj: { [ART1]: (t) => { const b = C.titleSubject[ART1]; const out = t.replace('<h1 class="page-title">' + b + '</h1>', '<h1 class="page-title">《' + b + '》</h1>'); mustHave(out, '<h1 class="page-title">《', 'h1 书名号注入'); return out; } },
    preExpr: '(() => JSON.stringify({h1: document.querySelector("h1").textContent, title: document.title}))()',
    preOk: (v) => { try { return String(JSON.parse(v).h1).startsWith('《'); } catch { return false; } },
    preKind: '渲染层（h1 以《开头而 <title> 未变）',
  });

  NOTES.push('两台一套：每例先跑 control（仅结构性准备，不含违约），再跑 mutant，捕获 = 指定判据在差集中翻红。');
  let idx = 0;
  const ONLYMUT = (process.env.QODER_MUT_ONLY || '').split(',').filter(Boolean);
  for (const cs of cases) {
    idx++;
    if (ONLYMUT.length && !ONLYMUT.some((x) => cs.name.includes(x))) { NOTES.push('本轮按 QODER_MUT_ONLY 跳过 ' + cs.name); continue; }
    const tagM = '-mut' + String(idx).padStart(2, '0');
    const tagC = '-ctl' + String(idx).padStart(2, '0');
    if (selfSha() !== SHA_START) { results.push({ name: cs.name, verdict: 'BATCH-VOID', preOk: true, reason: 'SELF-SHA 变化：变异跑期间编辑了 _qa_task19 脚本，整批作废' }); break; }
    const ctl = buildCopy(cs.name + '-control', null, null, false);
    if (cs.prep === 'multi-entry') buildMultiEntry(ctl.dst, cs.name, 4);
    const mut = buildCopy(cs.name, null, cs.inj, true);
    if (cs.prep === 'multi-entry') buildMultiEntry(mut.dst, cs.name, 4);
    let pre = { ok: false, detail: '' };
    if (cs.preByte) { pre.ok = !!cs.preByte(mut); pre.detail = cs.preKind + ' → ' + (pre.ok ? '成立' : '不成立'); }
    else if (cs.preExpr) {
      const v = await renderProof(mut.dst, cs.page, cs.preExpr, 9410 + idx);
      pre.ok = !!cs.preOk(v); pre.detail = cs.preKind + ' 实测=' + String(v).slice(0, 170) + ' → ' + (pre.ok ? '成立' : '不成立');
      const vc = await renderProof(ctl.dst, cs.page, cs.preExpr, 9460 + idx);
      pre.detail += '；control 同一表达式=' + String(vc).slice(0, 120) + '（对照组不得已反序）';
    }
    await runDriver(cs.seg, ctl.dst, tagC, 9430 + idx, cs.env);
    await runDriver(cs.seg, mut.dst, tagM, 9480 + idx, cs.env);
    const fc = failIds(tagC), fm = failIds(tagM);
    if (cs.renderDiffAgainst) {
      const d = renderDelta(fc, fm, cs.renderDiffAgainst);
      pre.ok = pre.ok && d.ok;
      pre.detail += '；' + d.detail;
    }
    const controlFail = fc ? fc.fail : new Set();
    const mutantFail = fm ? fm.fail : new Set();
    const delta = cs.expectIds.filter((id) => mutantFail.has(id) && !controlFail.has(id));
    const preexisting = cs.expectIds.filter((id) => controlFail.has(id));
    const captured = pre.ok && delta.length > 0;
    results.push({
      name: cs.name, seg: cs.seg, controlDir: 'mutants/' + cs.name + '-control', mutantDir: 'mutants/' + cs.name,
      inject: cs.injDesc, why: cs.why, prep: cs.prepNote || '无（直接复制九文件）', preOk: pre.ok, preDetail: pre.detail,
      expectIds: cs.expectIds, hitDelta: delta, redInControl: preexisting,
      controlRows: fc ? fc.n : 0, mutantRows: fm ? fm.n : 0,
      verdict: !pre.ok ? '无效变异（前置自证不成立 → 修台架，不改判据也不改产品代码）'
        : (delta.length ? '捕获' : (preexisting.length ? '台架不足（指定判据在对照组就红，差分为空）' : '未捕获（真漏检，须补判据）')),
    });
    process.stdout.write('[' + idx + '/' + cases.length + '] ' + cs.name + ' → ' + results[results.length - 1].verdict
      + '（指定 ' + cs.expectIds.join(',') + '；差分命中 ' + (delta.join(',') || '无') + (preexisting.length ? '；对照组已红 ' + preexisting.join(',') : '') + '）\n');
  }
  const realEnd = resultsHash();
  const valid = results.filter((r) => r.preOk);
  const captured = valid.filter((r) => r.verdict === '捕获');
  const summary = {
    registered: cases.length, ran: results.length, validMutations: valid.length,
    invalid: results.length - valid.length, captured: captured.length,
    missed: valid.length - captured.length,
    captureRate: valid.length ? (Math.round((captured.length / valid.length) * 1000) / 10) + '%' : 'n/a',
    realResultsUnchanged: realEnd === REAL_START, selfShaUnchanged: selfSha() === SHA_START,
    firstCaseMustRed: (results.find((r) => r.name.startsWith('m01')) || {}).verdict || 'n/a',
    notes: NOTES,
  };
  fs.writeFileSync(path.join(HERE, 'mutation_summary19.json'), JSON.stringify({ summary, results }, null, 1), 'utf8');
  process.stdout.write('\n' + JSON.stringify(summary, null, 1) + '\n');
  /* 通过条件：无未捕获 ＋ 有效变异≥合同要求的 10 例 ＋ 第 1 例红 ＋ 两次守卫干净。
   * 无效变异允许存在（它是台架结论不是漏检），但必须≥10 例有效变异兜底。 */
  const okBatch = summary.missed === 0 && summary.validMutations >= 10 && summary.realResultsUnchanged && summary.selfShaUnchanged && summary.firstCaseMustRed === '捕获';
  process.exit(okBatch ? 0 : 1);
}
main().catch((e) => {
  process.stdout.write('MUTATION HARNESS ERROR\n' + ((e && (e.stack || e.message)) || e) + '\n');
  fs.writeFileSync(path.join(HERE, 'mutation_summary19.json'), JSON.stringify({ error: String((e && (e.stack || e.message)) || e), results }, null, 1), 'utf8');
  process.exit(2);
});
