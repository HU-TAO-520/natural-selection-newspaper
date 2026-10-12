/* Task 18 — 全站只读核验闸门（取代 _qa_task10 在归档层已失效的那部分职责）
 *
 * 对应上一轮暴露的五项闸门缺陷：
 *  D1 每条 DOM 事实绑定来源哈希：M 组最先跑，M 组不过则其余组结论无效（阻断规则三）。
 *  D2 期望值一律从锚点解析：deploy/manifest.json + content/ + plan/；写死常量即缺陷。
 *  D3 结构被破坏不抛异常：一律取 ...||null 并显式记"区块缺失 FAIL"；崩溃计为一条 FAIL。
 *  D4 变异跑期间不编辑被测脚本：本脚本 SELF-SHA 写进报告，由变异台逐台复核。
 *  D5 变异台自带前置断言：见 mutate_task18.mjs。
 * 独立性：Q 组由 src_check.py 另实现一份解析器，N 组自行解压 zip；两者都不调用 build.py／pack.py。
 * 只读：不写 Results/ content/ build/ deploy/ Materials/ plan/。
 * 退出码：0 全绿／1 有 FAIL（含被捕获的崩溃）／2 连报告都写不出来。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const SELF_PATH = fileURLToPath(import.meta.url);
const SELF_SRC = fs.readFileSync(SELF_PATH, 'utf8');
/* 源码自检一律只扫"代码"：剥掉注释与字符串字面量，否则断言消息里的中文词会自我命中 */
const CODE_ONLY = SELF_SRC
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
  .replace(/'(?:[^'\\\n]|\\.)*'/g, "''").replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
  .replace(/`(?:[^`\\]|\\.)*`/g, '``');
const PLAN = path.resolve(process.env.QODER_PLAN_DIR || path.join(ROOT, 'plan'));
const RESULTS = path.resolve(process.env.QODER_RESULTS_DIR || path.join(ROOT, 'Results'));
const MATERIALS = path.resolve(process.env.QODER_MATERIALS_DIR || path.join(ROOT, 'Materials'));
const CONTENT = path.resolve(process.env.QODER_CONTENT_DIR || path.join(ROOT, 'content'));
const BUILD = path.resolve(process.env.QODER_BUILD_DIR || path.join(ROOT, 'build'));
const DEPLOY = path.resolve(process.env.QODER_DEPLOY_DIR || path.join(ROOT, 'deploy'));
const FACTS_FILE = path.resolve(process.env.QODER_FACTS || path.join(HERE, 'facts.json'));
const REPORT = path.resolve(process.env.QODER_REPORT || path.join(HERE, 'verify_report.md'));
const SRC_JSON = path.resolve(process.env.QODER_SRC_FACTS || path.join(HERE, 'src_facts.json'));
const PYTHON = process.env.QODER_PYTHON || 'python';

const read = (p) => fs.readFileSync(p, 'utf8');
const readBuf = (p) => fs.readFileSync(p);
/* 清单登记而磁盘缺失的文件：以下安全读取把"缺失"交给断言判红，绝不让 ENOENT 变成栈（D3） */
const safe = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);
const safeBuf = (p) => (fs.existsSync(p) ? fs.readFileSync(p) : null);
const shaUp = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const shaLo = (b) => crypto.createHash('sha256').update(b).digest('hex');
const vis = (s) => (s === null || s === undefined ? 'null'
  : JSON.stringify(String(s).length > 90 ? String(s).slice(0, 45) + '\u2026' + String(s).slice(-45) : String(s)));
const codes = (s) => (s === null || s === undefined ? 'null' : Array.from(String(s)).map((c) => c.codePointAt(0).toString(16)).join(' '));
const short = (s) => { s = String(s === undefined ? '' : s); return s.length > 170 ? s.slice(0, 80) + '\u2026' + s.slice(-80) : s; };
const sortedUniq = (a) => a.slice().sort().filter((v, i, r) => r.indexOf(v) === i);
const keysOf = (o) => Object.keys(o).sort().map((k) => k + ':' + o[k]).join(', ');
const firstDiff = (a, b) => {
  a = String(a); b = String(b);
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i + ' {A:' + JSON.stringify(a.slice(i, i + 28)) + ' B:' + JSON.stringify(b.slice(i, i + 28)) + '}';
  return '仅长度不同 A=' + a.length + ' B=' + b.length;
};

/* ------------------------------------------------------------ 断言收集器 */
const rows = [];
function rec(id, pass, loc, exp, act, handoff) {
  rows.push({ id, st: pass === 'pending' ? 'PENDING' : pass ? 'PASS' : 'FAIL', loc: loc || '',
    exp: exp === undefined ? '' : short(exp), act: act === undefined ? '' : short(act), handoff: handoff || '' });
  return !!pass;
}
function chk(id, cond, loc, exp, act, handoff) { return cond ? rec(id, true, loc) : rec(id, false, loc, exp, act, handoff); }
function chkEq(id, a, b, loc, handoff) { const pass = String(a) === String(b); return rec(id, pass, loc, pass ? '' : short(b), pass ? '' : short(a), handoff); }
function need(cond, msg) { if (!cond) throw new Error('锚点不可解析：' + msg); }
/* 锚点层在模块顶层执行；此兜底保证"解析失败＝退出码 1 并指出锚点"，
 * 而不是把栈抛给终端（本包 §真值解析合同 与 D3 的同一条要求）。 */
process.on('uncaughtException', (e0) => {
  const st0 = String((e0 && e0.stack) || '').split(String.fromCharCode(10)).slice(1, 3).join(' | ').slice(0, 240);
  const msg = String((e0 && e0.message) || e0).slice(0, 240) + (st0 ? '  @ ' + st0.slice(0, 220) : '');
  try {
    fs.writeFileSync(REPORT, '# Task 18 核验闸门报告（锚点层拒绝出结论）\n\n'
      + '- 结论：锚点不可解析，闸门**不产出任何 PASS**，也不回退到写死常量；按合同回流 Task 12。\n'
      + '- 抛出：' + msg + '\n\n[GATE-ANCHOR] FAIL 锚点层 — 期望: 全部锚点可解析 — 实际: ' + msg + ' — 移交: Task 12\n', 'utf8');
  } catch (e1) { process.stderr.write('报告也写不出：' + String(e1 && e1.message) + '\n'); }
  process.stdout.write('锚点不可解析：' + msg + '\n');
  process.exit(1);
});

/* ------------------------------------------ 真值解析合同（锚点层，修 D2） */
function section(src, heading, name) {
  const i = src.indexOf(heading);
  if (i < 0) throw new Error('锚点小节缺失：' + name + '（' + heading + '）');
  const level = (heading.match(/^#/g) || []).length;
  let end = -1;
  for (let k = 1; k <= level; k++) {
    const m = new RegExp('^' + '#'.repeat(k) + ' ', 'm').exec(src.slice(i + heading.length));
    if (m) { const pos = i + heading.length + m.index; if (end < 0 || pos < end) end = pos; }
  }
  return src.slice(i + heading.length, end < 0 ? src.length : end);
}
function subseg(src, marker, name) {
  const i = src.indexOf(marker);
  if (i < 0) throw new Error('锚点缺失：' + name + '（' + marker + '）');
  const m = /^#{1,6} /m.exec(src.slice(i + marker.length));
  return src.slice(i, m ? i + marker.length + m.index : src.length);
}
const backticked = (s) => [...s.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);

const T1 = read(path.join(PLAN, 'Task1-素材基线与内容合同.md'));
const T4 = read(path.join(PLAN, 'Task4-完成首页内容.md'));
const T0 = read(path.join(PLAN, 'Task0-总方案与任务索引.md'));
const T12 = read(path.join(PLAN, 'Task12-归档总方案与全局合同修订.md'));
const T18 = read(path.join(PLAN, 'Task18-核验闸门重构.md'));
const MANIFEST = JSON.parse(read(path.join(DEPLOY, 'manifest.json')));
const FACTS = JSON.parse(read(FACTS_FILE));

/* 锚点 1 —— Task1 §权威逐段内容合同 的三个 ```text 块 */
function contractBlock(heading) {
  const seg = section(T1, heading, 'Task1 ' + heading);
  const m = seg.match(/```text\n([\s\S]*?)```/);
  need(m, 'Task1 ' + heading + ' 的 ```text 合同块');
  const out = {};
  for (const line of m[1].split('\n')) {
    if (!line.trim()) continue;
    const j = line.indexOf('|');
    need(j >= 0, 'Task1 合同行缺分隔符：' + line);
    out[line.slice(0, j)] = line.slice(j + 1);
  }
  return out;
}
const C_MSG = contractBlock('### 新闻消息'), C_FEAT = contractBlock('### 新闻通讯'), C_COMM = contractBlock('### 新闻评论');
const seqOf = (base, prefix) => Object.keys(base).filter((k) => new RegExp('^' + prefix + '[0-9]{2}$').test(k))
  .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))).map((k) => base[k]);
const M4 = seqOf(C_MSG, 'M'), F23 = seqOf(C_FEAT, 'F'), C29 = seqOf(C_COMM, 'C');
need(M4.length === 4 && F23.length === 23 && C29.length === 29, 'Task1 段落数应为 4/23/29，实得 ' + [M4.length, F23.length, C29.length]);

/* 锚点 1 —— Task1 §3 逐段字符数基线（63 项，U+3000 分隔，通讯与评论跨两行） */
const CNT = (() => {
  const seg = section(T1, '### 3. 逐段文本复核', 'Task1 §3 逐段文本复核');
  const map = {}; const seen = []; let cur = null;
  for (const line of seg.split('\n')) {
    const h = line.match(/\*\*(新闻消息|新闻通讯|新闻评论)（/);
    if (h) cur = { 新闻消息: 'M', 新闻通讯: 'F', 新闻评论: 'C' }[h[1]];
    if (!cur) continue;
    for (const m of line.matchAll(/`([A-Za-z_0-9]+)=([0-9]+)`/g)) {
      const k = cur + ':' + m[1];
      seen.push(k);
      if (map[k] !== undefined && map[k] !== Number(m[2])) throw new Error('Task1 §3 同名基线自相矛盾：' + k);
      map[k] = Number(m[2]);
    }
  }
  need(seen.length === 63 && Object.keys(map).length === 63, 'Task1 §3 应为 63 项逐段基线，实得 token=' + seen.length + ' 键=' + Object.keys(map).length);
  return map;
})();

/* 锚点 1 —— Task1 §输入文件与冻结基线：三份素材哈希 */
const MAT = (() => {
  const seg = section(T1, '## 输入文件与冻结基线', 'Task1 §输入文件与冻结基线');
  const out = [];
  for (const line of seg.split('\n')) {
    const m = line.match(/^\|\s*([^|]*?)\s*\|\s*`Materials\/([^`]+)`\s*\|[^|]*\|\s*`([0-9A-Fa-f]{64})`\s*\|/);
    if (m) out.push({ type: m[1], name: m[2], sha: m[3].toUpperCase() });
  }
  need(out.length === 3, 'Task1 素材哈希表应解析出三行，实得 ' + out.length);
  return out;
})();

/* 锚点 2 —— Task4 §文本级验证 / §DOM 结构验证 / §可见内容白名单 */
const HOME_TXT = (() => {
  const seg = section(T4, '### 文本级验证', 'Task4 §文本级验证');
  const m = seg.match(/```text\n([\s\S]*?)```/);
  need(m, 'Task4 §文本级验证 的 ```text 块');
  const out = {};
  for (const line of m[1].split('\n')) { const j = line.indexOf('|'); if (j > 0) out[line.slice(0, j)] = line.slice(j + 1); }
  need(out.P_ORIGIN && out.P_WORK && out.P_FOUNDED, 'Task4 三段字面量不齐');
  return out;
})();
const SLOT_NAMES = ['P_ORIGIN', 'P_WORK', 'P_FOUNDED'];
need(/归档层补充/.test(T4), 'Task4 §归档层补充（R3/R4/R8）一节缺失 —— 本包硬性开工前置条件未满足，应回流 Task 12');
const DOMSEG = section(T4, '### DOM 结构验证', 'Task4 §DOM 结构验证');
const TALLY = (() => {
  const line = DOMSEG.split('\n').find((l) => /\{main:1/.test(l));
  need(line, 'Task4 §DOM 结构验证 内的 <main> 标签计数行');
  const o = {};
  for (const p of line.match(/\{([^\n]*?)\}/)[1].split(',')) {
    const m = p.trim().match(/^([a-z0-9]+):([0-9]+)$/);
    need(m, '标签计数项形态不符：' + p);
    o[m[1]] = Number(m[2]);
  }
  need(o.main === 1 && o.h2 === 4 && o.div === 2 && o.span === 6 && o.li === 3 && o.a === 3 && o.ul === 1,
    'R4 新值未落地（应为 h2:4 div:2 ul:1 li:3 a:3 span:6）：' + keysOf(o));
  return o;
})();
const HOME_KIDS = (() => {
  /* 只认给出"顺序固定"的那一条权威行；R4 修订引言里同时含新旧两种写法，按行首匹配会拿错序 */
  const line = DOMSEG.split('\n').find((l) => /直接元素子节点/.test(l) && /顺序固定/.test(l));
  need(line, 'Task4 §DOM 结构验证 的直接子元素顺序行（含"顺序固定"）');
  const seq = [...line.matchAll(/`([a-z0-9]+)\.([a-z-]+)`/g)].map((m) => m[1] + '.' + m[2]);
  need(seq.length === 3, '首页直接子元素应解析为三项（R4），实得 ' + seq.length + '：' + seq.join('+'));
  need(seq[0] === 'h1.page-title' && seq[1] === 'div.home-sections' && seq[2] === 'div.home-latest', '首页直接子元素次序不符 R4：' + seq.join(','));
  return seq;
})();
const HEAD_TOTAL = Number((DOMSEG.split('\n').find((l) => /标题总数/.test(l)) || '').match(/标题总数\s*([0-9]+)/)[1]);
need(HEAD_TOTAL === 5, 'Task4 标题总数应为 5（R4），解析得 ' + HEAD_TOTAL);
const WHITE = (() => {
  const seg = section(T4, '### 可见内容白名单', 'Task4 §可见内容白名单');
  const items = [...seg.matchAll(/^[0-9]+\.\s+`([^`\n]+)`/gm)].map((m) => m[1]);
  need(items.length === 14, 'Task4 白名单应为按序 14 项（R9 无条件），解析得 ' + items.length);
  const sub = { P_ORIGIN: HOME_TXT.P_ORIGIN, P_WORK: HOME_TXT.P_WORK, P_FOUNDED: HOME_TXT.P_FOUNDED };
  return items.map((v) => (v in sub ? sub[v] : v));
})();

/* 锚点 2 —— Task0 §稳定接口总清单：26 既有类 + 12 归档新类 + ID + 变量 */
const IFACE = (() => {
  const seg = section(T0, '## 稳定接口总清单', 'Task0 §稳定接口总清单');
  const archSeg = section(seg, '### 归档层新增', 'Task0 §归档层新增');
  /* 12 个归档新类只从两行点名式清单取：「栏目列表页 5 个类：…」与「首页最新区 7 个类：…」 */
  const archLines = [
    [/栏目列表页\s*([0-9]+)\s*个类：(.*)$/m, 5],
    [/首页最新区\s*([0-9]+)\s*个类：(.*)$/m, 7],
  ];
  let arch = [];
  for (const [re, expect] of archLines) {
    const m = archSeg.match(re);
    need(m, 'Task0 §归档层新增 的清单行 ' + re);
    const n = Number(m[1]), toks = backticked(m[2]).filter((t) => /^[a-z][a-z0-9_-]*$/.test(t));
    need(n === expect && toks.length === expect, '归档类清单行数量不符：声明 ' + n + ' 解析 ' + toks.length + '（应为 ' + expect + '）');
    arch = arch.concat(toks);
  }
  need(/合计 \*\*12 个类\*\*/.test(archSeg), 'Task0 §归档层新增 的"合计 12 个类"声明');
  need(arch.length === 12, 'Task0 §归档层新增应登记 12 个新类，实得 ' + arch.length + '：' + arch.join(','));
  /* 其余已注册类只取带前导点的写法，天然排除 #id、字段名与属性名 */
  const cls = [];
  for (const raw of backticked(seg)) {
    for (const part of raw.split('、')) {
      let x = part.trim();
      if (!(x.startsWith('.') || x.startsWith('html.'))) continue;
      x = x.replace(/^html\./, '').replace(/^\./, '').replace(/\[.*$/, '').replace(/ >.*$/, '').replace(/["'].*/, '').trim();
      if (/^[a-z][a-z0-9_-]*$/.test(x) && !['html', 'text', 'none', 'region', 'serif'].includes(x)) cls.push(x);
    }
  }
  const ids = [];
  const pushId = (x) => { if (/^[a-z][a-z0-9-]*$/.test(x) && !ids.includes(x)) ids.push(x); };
  for (const m of seg.matchAll(/`#([a-z][a-z0-9-]*)`/g)) pushId(m[1]);
  for (const line of seg.split('\n')) {
    const cut = line.split(/ID：/).slice(1);
    for (const tail of cut) for (const t of backticked(tail.split('（')[0])) pushId(t);
  }
  ids.sort();
  need(ids.length >= 7 && ids.includes('latest-title') && ids.includes('origin-title'), 'Task0 接口 ID 解析异常：' + ids.join(','));
  const varSeg = section(seg, '### 样式变量', 'Task0 §样式变量');
  const varsExact = [], varFamilies = [];
  for (const raw of backticked(varSeg)) {
    let base = '';
    for (const part of raw.split('/')) {
      const x = part.trim().replace(/:.*$/, '').trim();
      if (/^--[a-z][-\w]*$/.test(x)) { varsExact.push(x); base = x.replace(/-[a-z0-9]+$/, '-'); }
      else if (/^--[a-z][-\w]*-\*$/.test(x)) varFamilies.push(x.replace(/\*$/, ''));
      else if (/^-[\w]+$/.test(x) && base) varsExact.push(base + x.slice(1));
    }
  }
  return { classes: sortedUniq(cls.concat(arch)), archClasses: sortedUniq(arch), ids,
    vars: sortedUniq(varsExact), varFamilies: sortedUniq(varFamilies) };
})();
need(IFACE.classes.length >= 30, '接口类清单解析过少：' + IFACE.classes.length + '：' + IFACE.classes.join(','));
need(IFACE.ids.length >= 7, '接口 ID 清单解析过少：' + IFACE.ids.join(','));
need(IFACE.classes.length >= 30, '接口类清单解析过少：' + IFACE.classes.length);

/* 锚点 4 —— Task12 R2 六壳与命名正则 / build shell 的 title 后缀 */
const R2 = section(T12, '### R2', 'Task12 R2');
const SHELLS = (() => {
  const m = R2.match(/六个壳文件[\s\S]*?\*\*([^*]+)\*\*/);
  need(m, 'Task12 R2① 六个壳文件名');
  const s = backticked(m[1]).filter((t) => /\.(html|css|js)$/.test(t));
  need(s.length === 6, 'R2① 应解析出六个壳文件，实得 ' + s.length + '：' + s.join(','));
  return s;
})();
const ART_RE = (() => {
  const m = R2.match(/`(\^article-\[a-z0-9\]\[a-z0-9-\]\{2,40\}[\\]*\.html\$)`/);
  need(m, 'Task12 R2② 详情页命名正则');
  return m[1].replace(/\\\./g, '.');
})();
const TITLE_SUFFIX = (read(path.join(BUILD, 'shell.html')).match(/<title>\{\{TITLE\}\}([^<]*)<\/title>/) || [])[1] || '';
need(TITLE_SUFFIX === '\uff5c自然选择号', 'build/shell.html 的 <title> 全角｜后缀，实得 ' + JSON.stringify(TITLE_SUFFIX));

/* 锚点 4 —— Task0 §全局禁止项清单 + §归档层新增禁项（R6）→ J 组判据 */
const JSEG = section(T0, '## 全局禁止项清单', 'Task0 §全局禁止项清单');
const J6 = subseg(JSEG, '### 归档层新增禁项', 'Task0 §归档层新增禁项（R6）');
const bullets = (re, name) => { const m = JSEG.match(re); need(m, name); return backticked(m[0]); };
const J1T = bullets(/\*\*Word 元数据作者／最后修改者\*\*[^\n]*/, 'J1 元数据作者');
const J3T = bullets(/\*\*内部来源名\*\*[^\n]*/, 'J3 内部来源名').filter((t) => t === '新闻评价');
const J5T = bullets(/\*\*素材文件名与路径\*\*[^\n]*/, 'J5 素材名与路径');
const J7T = bullets(/\*\*作者／来源标签\*\*[^\n]*/, 'J7 署名前缀');
const J8T = bullets(/\*\*占位与开发记号\*\*[^\n]*/, 'J8 占位记号');
const J2T = bullets(/\*\*由文件时间推断的年份\*\*[^\n]*/, 'J2 推断年份').filter((t) => /^[0-9]{4}$/.test(t));
need(J2T.indexOf('2026') >= 0 && J2T.indexOf('2024') < 0, 'J2 只禁 2026、从未有 2024 豁免（勘误表 E2）：实得 ' + J2T.join(','));
const R6SEG = section(T12, '### R6', 'Task12 R6 全局禁止项清单扩充');
const YEAR_FORM = (() => {
  const m = R6SEG.match(/`\((19\|20)\)\\d\{2\}`/) || T12.match(/`\((19\\\|20)\)\\d\{2\}`/);
  need(m, 'Task12 R6 的年份形态 (19|20)\\d{2}');
  return '(19|20)\\d{2}';
})();
need(/不使用裸/.test(R6SEG) && /`\\d\{4\}`/.test(R6SEG), 'Task12 R6 明令禁用裸 \\d{4} 全站扫描');
const EXEMPTSEG = subseg(JSEG, '### 误伤边界', 'Task0 §误伤边界（豁免清单）');
const ISO_FORM = (() => { const m = J6.match(/`(\\d\{4\}-\\d\{2\}-\\d\{2\})`/); need(m, 'R6② ISO 形态判据'); return m[1]; })();
const FM_FIELDS = (() => {
  const m = J6.match(/1\.\s+\*\*front-matter 字段名\*\*[^\n]*/);
  need(m, 'R6① 七个字段名');
  const f = backticked(m[0]).filter((t) => /^[a-z_]{3,}$/.test(t));
  need(f.length === 7, '字段名应为七个，实得 ' + f.length + '：' + f.join(','));
  return f;
})();
const SLUG_CONTRACT_RE = (() => { const m = J6.match(/`(\^\[MFC\]\\d\{2\}\$)`/) || T12.match(/`(\^\[MFC\]\\d\{2\}\$)`/); need(m, '编号形态 ^[MFC]\\d{2}$'); return m[1]; })();
const DATE_NODE_CLASSES = IFACE.archClasses.filter((c) => /__date$/.test(c));

/* --------------------------------------------------- 遍历清单（Task 18.1） */
const MP = MANIFEST.pages.slice().sort((a, b) => (a.path < b.path ? -1 : 1));
const PAGE_SET = MP.map((p) => p.path);
const ERROR_PAGE = '404.html';
const ALL_HTML_PAGES = MP.filter((p) => /\.html$/.test(p.path)).map((p) => p.path);
const HTML_PAGES = ALL_HTML_PAGES.filter((p) => p !== ERROR_PAGE); // ordinary pages remain file:// facts
const DETAILS = HTML_PAGES.filter((p) => new RegExp(ART_RE).test(p));
const byPath = Object.fromEntries(MP.map((p) => [p.path, p]));
const ART_OF = {};
for (const c of MANIFEST.columns) for (const a of c.articles) ART_OF[a.page] = { column: c.key, label: c.label, slug: a.slug, title: a.title, list: c.list };
const PREFIX = { message: 'M', feature: 'F', commentary: 'C' };
const CONTRACT = { M: C_MSG, F: C_FEAT, C: C_COMM };
const SEQ = { M: M4, F: F23, C: C29 };
/* R12（Task12）：期望值按"文章"索引，不按栏目。一个栏目可以有多篇文章。
   某详情页是迁移文 ⟺ 它的 title 与某个 Task1 合同块的 title 逐字符相等；
   绑定不写死 slug。非迁移文的权威文本是它自己的 content/articles/<slug>.md。 */
let SRC_RC = null;
function runSrcCheck() {
  /* 独立链只跑一次；F／L 组要先拿 md 事实，Q 组复用同一份与同一退出码。 */
  if (SRC_RC === null) {
    SRC_RC = 0;
    try {
      execFileSync(PYTHON, [path.join(HERE, 'src_check.py'), '--content', CONTENT, '--plan', PLAN,
        '--manifest', path.join(DEPLOY, 'manifest.json'), '--out', SRC_JSON],
        { cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { PYTHONIOENCODING: 'utf-8' }) });
    } catch (e) { SRC_RC = typeof e.status === 'number' ? e.status : 2; }
  }
  return SRC_RC;
}
const SRCF = JSON.parse(read((runSrcCheck(), SRC_JSON)));
/* R11①/R12：首页最新区是"全局排序前 3 条"，不是"全部文章"。
   全局序取 src_check 独立推导的 derived_order（第二条链），不用构建器自己的结论。 */
const LATEST = (SRCF.derived_order || []).slice(0, 3).map((s) => 'article-' + s + '.html');
const MD = {};
for (const a of (SRCF.articles || [])) MD['article-' + a.stem + '.html'] = a;
const mdPlain = (p) => (p.startsWith('**') && p.indexOf('**', 2) >= 0 ? p.slice(2, p.indexOf('**', 2)) + p.slice(p.indexOf('**', 2) + 2) : p);
const HOST = {};
for (const k of Object.keys(SEQ)) {
  const t = (CONTRACT[k] || {}).title;
  HOST[k] = DETAILS.find((p) => t && ART_OF[p] && ART_OF[p].title === t);
}
const IS_MIG = {};
for (const k of Object.keys(HOST)) if (HOST[k]) IS_MIG[HOST[k]] = k;
const WANT = {}, WANTSRC = {}, HAS_DATE = {}, HAS_DL = {}, MIG_END = {};
for (const p of DETAILS) {
  const k = IS_MIG[p], m = MD[p];
  if (!m) { rec('F0/' + p, false, p, 'src_facts 内含该页的 md 事实', '在场', '缺失：无法确定期望值来源', 'Task 18.6'); continue; }
  HAS_DATE[p] = m.fields.end_date != null;
  HAS_DL[p] = !!(m.dateline && m.dateline.allowed);
  MIG_END[p] = k ? (CONTRACT[k] || {}).closing_date : m.fields.end_date;
  if (k) { WANT[p] = SEQ[k]; WANTSRC[p] = 'Task1 ' + k + ' 合同块'; }
  else { WANT[p] = (m.paragraphs || []).map(mdPlain); WANTSRC[p] = 'content/articles/' + m.stem + '.md'; }
}
for (const c of MANIFEST.columns) for (const a of c.articles) if (!DETAILS.includes(a.page)) rec('A1b/' + a.page, false, a.page, '清单登记的详情页在 HTML 页集合内', '在场', '缺失', 'Task 15');
const src = {};
for (const f of PAGE_SET) if (fs.existsSync(path.join(RESULTS, f))) src[f] = read(path.join(RESULTS, f));

/* -------------------------------------- 只读证明基线（A5／Task 18.7 前半） */
const HASHED_DIRS = [['Results', RESULTS], ['content', CONTENT], ['build', BUILD], ['deploy', DEPLOY], ['Materials', MATERIALS]];
function dirHash(dir) {
  const out = [];
  const walk = (d, rel) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const p = path.join(d, e.name), r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) { out.push(r + '/\t<dir>\t'); walk(p, r); }
      else if (e.isFile()) out.push([r, shaLo(readBuf(p)), String(fs.statSync(p).size)].join('\t'));
      else out.push([r, '<not-regular>', '0'].join('\t'));
    }
  };
  walk(dir, '');
  return out;
}
const beforeHashes = Object.fromEntries(HASHED_DIRS.map(([n, d]) => [n, dirHash(d)]));
const beforeMt = {};
for (const [n, d] of HASHED_DIRS) { const walk2 = (dd, rel) => { for (const e of fs.readdirSync(dd, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) { const p = path.join(dd, e.name), r = rel ? rel + '/' + e.name : e.name; if (e.isDirectory()) walk2(p, r); else beforeMt[r] = fs.statSync(p).mtimeMs; } }; walk2(d, n); }
const SELF_SHA = {
  verify: shaLo(readBuf(SELF_PATH)),
  probe: fs.existsSync(path.join(HERE, 'probe_task18.mjs')) ? shaLo(readBuf(path.join(HERE, 'probe_task18.mjs'))) : 'n/a',
  probeLib: fs.existsSync(path.join(HERE, 'probe_lib18.mjs')) ? shaLo(readBuf(path.join(HERE, 'probe_lib18.mjs'))) : 'n/a',
  srcCheck: fs.existsSync(path.join(HERE, 'src_check.py')) ? shaLo(readBuf(path.join(HERE, 'src_check.py'))) : 'n/a',
};

/* ================================= M 组：快照一致性（最先跑，修 D1） */
const META = FACTS.__meta || null;
{
  if (!META) rec('M0', false, 'facts.__meta', '__meta 在场（由 probe_task18 生成）', '事实文件无 __meta：等同 _qa_task10/dom_facts.json 的旧形态，D1 未修复', 'Task 18.2');
  else {
    rec('M0', true, 'facts.__meta', '', 'resultsDir=' + META.resultsDir + ' generatedBy=' + META.generatedBy);
    for (const p of HTML_PAGES) {
      const buf0 = safeBuf(path.join(RESULTS, p));
      const disk = buf0 ? shaLo(buf0) : '<磁盘缺失>';
      const snap = (META.perPageSha256 || {})[p];
      rec('M1/' + p, String(snap || '').toLowerCase() === disk, p + ' 快照哈希 == 目录实测' + (snap === undefined ? '【快照缺页】' : String(snap).toLowerCase() === disk ? '' : '【快照过期】'),
        '', '期望(快照)=' + String(snap || '<缺失>').slice(0, 16) + ' 实际(磁盘)=' + disk.slice(0, 16), 'D1：不符即整组 FAIL，绝不使用旧值');
      rec('M1b/' + p, String((META.perPageBytes || {})[p]) === String(safeBuf(path.join(RESULTS, p)) ? safeBuf(path.join(RESULTS, p)).length : '<磁盘缺失>'), p + ' 快照字节数 == 目录实测', '', '快照=' + JSON.stringify((META.perPageBytes || {})[p]) + ' 磁盘=' + (safeBuf(path.join(RESULTS, p)) ? safeBuf(path.join(RESULTS, p)).length : '<磁盘缺失>'), 'Task 18.2');
    }
    rec('M2/set', sortedUniq(META.pages || []).join('|') === sortedUniq(HTML_PAGES).join('|'), '普通页事实集合 == manifest HTML 子集排除线上专用 404.html（无缺无多）', '', '快照=' + sortedUniq(META.pages || []).join(',') + ' 普通页=' + sortedUniq(HTML_PAGES).join(','), 'Task 18.2／R13');
    rec('M2/count', Number((META.pages || []).length) === Number(HTML_PAGES.length), '__meta 普通页数 == 普通 HTML 页数（404 由 Task 19 HTTP fixture 核验）', '', '快照=' + (META.pages || []).length + ' 普通页=' + HTML_PAGES.length + ' manifest.html=' + MANIFEST.counts.html, 'Task 18.2／R13');
    rec('M3/dir', path.resolve(META.resultsDir || '') === RESULTS, '探测目录 == 被核验目录（防拿别处快照混用）', '', '快照=' + META.resultsDir + ' 核验=' + RESULTS, 'Task 18.2');
    rec('M4/by', META.generatedBy === 'probe_task18', '__meta.generatedBy == 本包探针而非旧文件', '', String(META.generatedBy), 'Task 18.2');
    for (const p of HTML_PAGES) rec('M5/' + p, !!FACTS[p] && FACTS[p].file === p, p + ' 普通页事实条目在场且 file 与页名一致', '', FACTS[p] ? String(FACTS[p].file) : '无事实', 'Task 18.2');
  }
}
const SNAPSHOT_STALE = rows.some((r) => /^M[0-5]/.test(r.id) && r.st === 'FAIL');

/* =========================================== A 组：文件集合与只读证明 */
{
  const entries = fs.readdirSync(RESULTS, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile()).map((e) => e.name);
  const dirs = entries.filter((e) => !e.isFile()).map((e) => e.name);
  for (const s of SHELLS) chk('A1a/' + s, files.filter((f) => f === s).length === 1, 'Results/ 六个现有固定文件命名精确（大小写逐字符）', s, files.join(','), 'Task 15/16');
  chk('A1a/404.html', files.filter((f) => f === ERROR_PAGE).length === 1, 'Results/ 含唯一线上专用 404.html', ERROR_PAGE, files.join(','), 'Task 17／R13');
  const missing = PAGE_SET.filter((n) => !files.includes(n)), extra = files.filter((n) => !PAGE_SET.includes(n));
  chk('A1b/manifest-to-disk', missing.length === 0, 'manifest.pages \u2286 Results/（磁盘不缺页）', PAGE_SET.join(','), '缺: ' + missing.join(','), 'Task 15（未重构建）');
  chk('A1b/disk-to-manifest', extra.length === 0, 'Results/ \u2286 manifest.pages（磁盘不多页，集合双向相等）', '无清单外文件', '多: ' + extra.join(','), 'Task 17（清单未重生成）或 Task 15（残留）');
  for (const p of MP) {
    if (!fs.existsSync(path.join(RESULTS, p.path))) { rec('A1b/sha/' + p.path, false, p.path, p.sha256, '文件缺失', 'Task 15'); continue; }
    const buf = readBuf(path.join(RESULTS, p.path));
    chkEq('A1b/sha/' + p.path, shaLo(buf), p.sha256.toLowerCase(), p.path + ' SHA-256 == manifest 登记值', 'Task 15/16/17');
    chkEq('A1b/bytes/' + p.path, String(buf.length), String(p.bytes), p.path + ' 字节数 == manifest 登记值', 'Task 17 §manifest 契约 1');
  }
  for (const f of files) chk('A1c/' + f, SHELLS.includes(f) || f === ERROR_PAGE || PAGE_SET.includes(f) || new RegExp(ART_RE).test(f), f + ' 命名形态：固定页名逐字符等值 或 详情页正则', '固定页名 / ' + ART_RE, f, 'Task 15／R13');
  chkEq('A1c/html-count', ALL_HTML_PAGES.length, MANIFEST.counts.html, 'manifest.pages 的全部 HTML 子集大小 == counts.html（含线上专用 404）', 'Task 17 §manifest 契约 4／R13');
  chkEq('A1b/pages-count', PAGE_SET.length, MANIFEST.counts.pages, 'manifest.pages 条目数 == counts.pages（交付文件数，公式 7 + N）', 'Task 17／R13');
  const derived = sortedUniq(fs.readdirSync(path.join(CONTENT, 'articles')).filter((f) => f.endsWith('.md')).map((f) => 'article-' + f.replace(/\.md$/, '') + '.html'));
  const want = sortedUniq(SHELLS.concat([ERROR_PAGE], derived));
  chk('A1d/derived-in-manifest', want.filter((n) => !PAGE_SET.includes(n)).length === 0, '六个现有固定文件 + 404.html \u222a content/ 独立推导 \u2286 manifest.pages（清单不缺）', want.join(','), '缺: ' + want.filter((n) => !PAGE_SET.includes(n)).join(','), 'Task 17／R13（未重生成清单）');
  chk('A1d/manifest-in-derived', PAGE_SET.filter((n) => !want.includes(n)).length === 0, 'manifest.pages \u2286 六个现有固定文件 + 404.html \u222a content/ 独立推导（清单不多）', '无多余条目', '多: ' + PAGE_SET.filter((n) => !want.includes(n)).join(','), 'Task 15／R13（残留）');
  for (const d of derived) chk('A1d/' + d, PAGE_SET.includes(d) && new RegExp(ART_RE).test(d), d + ' 由 content/articles/<slug>.md 推导并登记（不读 Results/、不调构建器）', d, PAGE_SET.includes(d) ? '已登记' : '未登记', 'Task 17');
  chk('A2/no-subdir', dirs.length === 0, 'Results/ 无子目录', '0 个', dirs.join(',') || '无', 'Task 15');
  const badExt = files.filter((n) => /\.(md|json|ya?ml|png|jpe?g|gif|webp|ico|svg|log|zip|map|py|mjs|cjs|ps1|bak|txt|woff2?)$/i.test(n) || /~$/.test(n) || /^README/i.test(n) || /^[._]/.test(n) || n === '_headers');
  chk('A2/no-banned-ext', badExt.length === 0, 'Results/ 无禁用扩展名/README/点文件/_headers', '无', badExt.join(',') || '无', '对应上游任务');
  chk('A2/no-cache', dirs.indexOf('__pycache__') < 0 && !files.some((f) => /egg-info|node_modules/.test(f)), 'Results/ 无 __pycache__ 与包管理产物', '无', dirs.join(','), 'Task 14');
  for (const p of ALL_HTML_PAGES) chk('A3/doctype/' + p, (src[p] || '').startsWith('<!doctype html>'), p + ' 首行', '<!doctype html>', JSON.stringify((src[p] || '').slice(0, 16)), 'Task 15／R13');
  const errHtml = src[ERROR_PAGE] || '';
  const errorContract = (html) => html.includes('<title>页面不存在｜自然选择号</title>')
    && html.includes('<h1 class="page-title" id="not-found-title">页面不存在</h1>')
    && html.includes('<p class="home-section__text">这个页面不存在，或已经被移走。</p>')
    && html.includes('<a href="/">返回首页</a>') && !html.includes('aria-current');
  const errorRootResources = (html) => html.includes('href="/styles.css"') && html.includes('src="/script.js"')
    && html.includes('href="/news-message.html"') && html.includes('href="/news-feature.html"')
    && html.includes('href="/news-commentary.html"') && html.includes('href="#main-content">跳至正文');
  chk('A3/404-content', errorContract(errHtml), '404.html 固定提示、首页入口、无导航高亮且不含请求路径', '合同内容', '静态结构检查', 'Task 12／R13');
  chk('A3/404-root-paths', errorRootResources(errHtml) && !errHtml.includes('href="styles.css"') && !errHtml.includes('src="script.js"'), '404.html 资源和导航使用站点根路径', '/styles.css、/script.js、/栏目.html', '静态结构检查', 'Task 14／R13');
  chk('A3/404-negative-relative-css', !errorRootResources(errHtml.replace('href="/styles.css"', 'href="styles.css"')), '负向对照：错误页样式误用相对路径会被结构合同捕获', '变异体不满足根路径合同', '对照已翻红', 'Task 18／R13');
  const utf8bad = PAGE_SET.filter((f) => { const b = safeBuf(path.join(RESULTS, f)); if (!b) return true; const t = b.toString('utf8'); return t.includes('\ufffd') || Buffer.from(t, 'utf8').compare(b) !== 0 || b.slice(0, 3).toString('hex') === 'efbbbf'; });
  chk('A3/utf8', utf8bad.length === 0, '全部交付文件为普通 UTF-8、无 BOM、无替换字符（含线上专用 404）', '全部合法', utf8bad.join(',') || '无', 'Task 15/16／R13');
  const mats = fs.readdirSync(MATERIALS);
  chkEq('A4/count', mats.length, 3, 'Materials/ 三份 Word', 'Task 1');
  for (const m of MAT) chk('A4/' + m.name, mats.includes(m.name), 'Materials/ 含 ' + m.name, m.name, mats.join(','), 'Task 1');
  for (const [n] of HASHED_DIRS) rec('A5/' + n, true, n + '/ 核验前基线', '', beforeHashes[n].length + ' 条目已登记，核验结束逐项比对', '');
  const stray = files.filter((f) => !PAGE_SET.includes(f));
  chk('A6', stray.length === 0 && dirs.length === 0, 'Results/ 清单外条目必须报错而非被忽略（无排除逻辑）', '0 个清单外条目', '清单外: ' + stray.concat(dirs.map((d) => d + '/')).join(',') || '无', '用户处置（闸门不删任何东西）');
  rec('A6/nopolite', true, 'A6 实现方式', '', '排除清单为空：任何非 manifest 条目都进入 FAIL 集合，判据与 Task 17 preflight 一致');
}

/* ==================================================== B 组：素材基线 */
for (const m of MAT) chkEq('B/' + m.name, fs.existsSync(path.join(MATERIALS, m.name)) ? shaUp(readBuf(path.join(MATERIALS, m.name))) : 'MISSING', m.sha, 'Materials/' + m.name + ' SHA-256 == Task1 冻结值', 'Task 1');
rec('B4', true, '三份素材', '', '完整 64 位十六进制比较，大小写不敏感，未以前缀/字节数/mtime 代替');

/* ============================ C/D/K 组：普通离线页公共壳、head、ARIA、导航矩阵 */
const CURRENT = { 'index.html': 'index.html' };
for (const c of MANIFEST.columns) { CURRENT[c.list] = c.list; for (const a of c.articles) CURRENT[a.page] = c.list; }
const NAVWANT = [['首页', 'index.html']].concat(MANIFEST.columns.map((c) => [c.label, c.list]));

for (const p of HTML_PAGES) {
  const F = FACTS[p], S = src[p] || '';
  chk('C0/' + p, !!F && !!F.mainAttrs, p + ' DOM 事实可用（快照绑定后该页可解析）', '探针返回该页快照且 <main> 可解析',
    F ? (F.mainAttrs ? '在场' : '快照在场但取不到 <main>（缺文件或结构破坏）') : '无快照（M 组已判过期，本组不使用旧值）', 'Task 18.2');
  if (!F || !F.mainAttrs) continue;
  const htmlTag = (S.match(/<html([^>]*)>/i) || [])[1] || '';
  const attrs = {};
  for (const m of htmlTag.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) attrs[m[1]] = m[2] === undefined ? '' : m[2];
  chkEq('C1/' + p + '/lang', attrs.lang, 'zh-CN', p + ' <html lang>', 'Task 2');
  chk('C1/' + p + '/no-js', /\bno-js\b/.test(attrs['class'] || '') && !/\bjs\b/.test((attrs['class'] || '').replace(/no-js/g, '')), p + ' <html class> 源码不预写 js', 'class="no-js"', attrs['class'], 'Task 2');
  chkEq('C1/' + p + '/runtime', F.html.cls, 'js', p + ' 运行时 <html class>（渐进增强前提）', 'Task 9');
  chkEq('C2/' + p + '/charset', F.metaCharset.length, 1, p + ' meta[charset] 数量', 'Task 2');
  chkEq('C2/' + p + '/charsetval', (F.metaCharset[0] || '').toLowerCase(), 'utf-8', p + ' meta charset 值', 'Task 2');
  chkEq('C2/' + p + '/viewport', F.metaViewport.length, 1, p + ' viewport 数量', 'Task 2');
  chkEq('C2/' + p + '/vpval', F.metaViewport[0], 'width=device-width, initial-scale=1', p + ' viewport 内容', 'Task 2');
  chkEq('C2/' + p + '/titleN', F.headTitle === null ? 0 : (S.match(/<title[ >]/gi) || []).length, 1, p + ' <title> 数量', 'Task 2');
  const wantTitle = p === 'index.html' ? WHITE[0] : (ART_OF[p] ? ART_OF[p].title : (MANIFEST.columns.find((c) => c.list === p) || {}).label);
  chkEq('C3/' + p, F.headTitle, wantTitle + TITLE_SUFFIX, p + ' <title> 逐字 == 扩展矩阵主体 + 全角｜后缀', 'Task 12 扩展矩阵');
  chk('C3b/' + p, (F.headTitle || '').lastIndexOf(TITLE_SUFFIX) === (F.headTitle || '').length - TITLE_SUFFIX.length, p + ' 全角｜后缀位于 <title> 末尾', '末尾', codes((F.headTitle || '').slice(-6)), 'Task 12 扩展矩阵');
  const links = F.links.filter((l) => l.rel === 'stylesheet');
  chk('C4/' + p + '/css', links.length === 1 && links[0].href === 'styles.css' && Object.keys(links[0]).sort().join(',') === 'href,rel', p + ' 样式引用', '<link rel="stylesheet" href="styles.css"> 恰一次且仅此属性', JSON.stringify(F.links), 'Task 2');
  chk('C4/' + p + '/js', F.scripts.length === 1 && !F.scripts[0].inline && F.scripts[0].attrs.src === 'script.js' && 'defer' in F.scripts[0].attrs && !('async' in F.scripts[0].attrs) && !('type' in F.scripts[0].attrs), p + ' 脚本引用', '<script src="script.js" defer> 恰一次；无 async/type', JSON.stringify(F.scripts.map((s) => s.attrs)), 'Task 2');
  chk('C4/' + p + '/inline', F.scripts.every((s) => !s.inline) && F.inlineStyleTags === 0 && F.baseTags === 0 && F.styleAttrs.length === 0 && F.eventAttrs.length === 0, p + ' 内联/事件/base/style 属性', '全部为 0', `内联脚本=${F.scripts.filter((s) => !s.inline).length} <style>=${F.inlineStyleTags} <base>=${F.baseTags} style属性=${F.styleAttrs.length} 事件属性=${F.eventAttrs.length}`, 'Task 2');
  chk('C4/' + p + '/noregex', !/<script(?![^>]*\bsrc="script\.js")[^>]*>/i.test(S) && !/<style|<base|onclick=|\son[a-z]+=/i.test(S) && !/style="/i.test(S), p + ' 源码禁用模式', '无内联脚本/内联样式/base/事件属性/style 属性', '命中源码模式', 'Task 2');
  const sk = F.skip;
  chk('C5/' + p, !!sk && sk.tag === 'a' && sk.href === '#main-content' && sk.text === '跳至正文' && sk.isBodyFirstChild, p + ' C5 == .skip-link 断言（母本 :210，不得与 C6 混称）', 'body 首个元素 a.skip-link[href="#main-content"]，文字"跳至正文"', JSON.stringify(sk), 'Task 2');
  const c = F.counts;
  chk('C6/' + p, c.siteHeader === 1 && c.siteHeaderInner === 1 && c.masthead === 1 && c.mastheadLink === 1 && c.navToggle === 1 && c.nav === 1 && c.navList === 1 && c.navItem === 4 && c.navLink === 4, p + ' C6 公共壳节点数量（nav === 1 未放宽）', 'header/inner/masthead/link/toggle/nav 各 1，nav 列表 4 项 4 链接', `header=${c.siteHeader} inner=${c.siteHeaderInner} mast=${c.masthead} link=${c.mastheadLink} toggle=${c.navToggle} nav=${c.nav} li=${c.navItem} a=${c.navLink}`, 'Task 12 R3');
  chkEq('C6/' + p + '/total', F.tagsAll.nav, 1, p + ' 全页 <nav> 标签总数 == 1（R3 未新增容器标签）', 'Task 12 R3');
  chkEq('C6/' + p + '/section', F.tagsAll.section || 0, p === 'index.html' ? TALLY.section : 0, p + ' <section> 数 == Task4 R4 值（首页 3／其余 0；最新区不是 section）', 'Task 12 R3');
  chk('C6/' + p + '/nest', F.header.innerParentIsHeader && (F.header.orderInner || []).join(',') === 'p.site-masthead,button.nav-toggle,nav.site-navigation', p + ' .site-header__inner 子节点顺序', 'p.site-masthead, button.nav-toggle, nav.site-navigation', (F.header.orderInner || []).join(','), 'Task 2');
  const ml = F.header.mastheadLink;
  chk('C6/' + p + '/mast', !!ml && ml.attrs['class'] === 'site-masthead__link' && ml.attrs.href === 'index.html' && ml.text === '自然选择号' && ml.parentTag === 'p' && F.header.masthead.childTags.join(',') === 'a', p + ' 报头链接', 'a.site-masthead__link[href="index.html"] 文字"自然选择号"，父级 p.site-masthead', JSON.stringify(ml), 'Task 2');
  const tg = F.toggle;
  chk('C6/' + p + '/btn', !!tg && tg.tag === 'button' && tg.attrs.type === 'button' && tg.attrs.id === 'nav-toggle' && /(^|\s)nav-toggle(\s|$)/.test(tg.attrs['class'] || ''), p + ' 菜单按钮', 'button#nav-toggle.nav-toggle[type="button"]', JSON.stringify(tg && tg.attrs), 'Task 2');
  const nv = F.nav;
  chk('C6/' + p + '/nav', !!nv && nv.attrs.id === 'site-navigation' && nv.attrs['aria-label'] === '主导航' && /(^|\s)site-navigation(\s|$)/.test(nv.attrs['class'] || ''), p + ' 导航元素', 'nav#site-navigation.site-navigation[aria-label="主导航"]', JSON.stringify(nv && nv.attrs), 'Task 2');
  chk('C7/' + p + '/controls', tg && tg.attrs['aria-controls'] === 'site-navigation' && (tg.controlsEl || []).join(',') === 'nav', p + ' #nav-toggle[aria-controls]', 'site-navigation 且解析到该 nav', tg && tg.attrs['aria-controls'], 'Task 2');
  chk('C7/' + p + '/expanded', tg && tg.attrs['aria-expanded'] === 'false', p + ' #nav-toggle[aria-expanded] 初值', 'false', tg && tg.attrs['aria-expanded'], 'Task 2');
  const btnSrc = (S.match(/<button[\s\S]*?>/i) || [''])[0];
  chk('C7/' + p + '/expanded-src', /aria-expanded="false"/.test(btnSrc) && !/aria-expanded="true"/.test(btnSrc) && /aria-controls="site-navigation"/.test(btnSrc) && !/is-open/.test(S), p + ' 源码 #nav-toggle[aria-expanded]', '源码写 aria-expanded="false"（不得预写 true/is-open）', JSON.stringify(btnSrc.replace(/\s+/g, ' ').trim()), 'Task 2');
  chk('C7/' + p + '/icon', tg && tg.icon && tg.icon.attrs['aria-hidden'] === 'true' && tg.icon.directChild && tg.icon.text === '', p + ' .nav-toggle__icon', 'span.nav-toggle__icon[aria-hidden="true"]，直接子节点，无文字', JSON.stringify(tg && tg.icon), 'Task 2');
  chk('C7/' + p + '/text', tg && tg.textSpan && tg.textSpan.text === '菜单' && tg.textSpan.directChild, p + ' .nav-toggle__text', '文字"菜单"', JSON.stringify(tg && tg.textSpan), 'Task 2');
  const navSrc = (S.match(/<nav[\s\S]*?<\/nav>/i) || [''])[0];
  chk('C8/' + p + '/hidden', (!F.navSubtreeFlaggedAttrs || F.navSubtreeFlaggedAttrs.length === 0) && !/\bhidden\b|\baria-hidden\b|is-open/i.test(navSrc), p + ' 导航源码', '不含 hidden / aria-hidden / is-open', `DOM标记=${JSON.stringify(F.navSubtreeFlaggedAttrs)} 源码命中=${(navSrc.match(/hidden|aria-hidden|is-open/gi) || []).join(',')}`, 'Task 2');
  chk('C8/' + p + '/items', nv && nv.ulIsDirectChild && nv.items.length === 4 && nv.items.every((it) => it.tag === 'li' && it.attrs['class'] === 'site-navigation__item' && it.linkCount === 1 && it.childTags.join(',') === 'a'), p + ' .site-navigation__list 子项', '4 个 li.site-navigation__item，各含 1 个 a.site-navigation__link', JSON.stringify(nv && nv.items && nv.items.map((i) => [i.tag, i.attrs['class'], i.childTags])), 'Task 2');
  chk('C9/' + p + '/main', c.main === 1 && F.mainAttrs && F.mainAttrs.id === 'main-content' && F.mainAttrs['class'] === 'main-content' && F.mainAttrs.tabindex === '-1' && c.tabIndexMainNeg1 === 1, p + ' main', '唯一 main#main-content.main-content[tabindex="-1"]', JSON.stringify(F.mainAttrs), 'Task 2');
  chkEq('C9/' + p + '/h1', F.h1s.length, 1, p + ' <h1> 数量（扩展矩阵：每页恰 1）', 'Task 12 扩展矩阵');
  chk('C9/' + p + '/h1cls', F.h1s[0] && F.h1s[0].cls === 'page-title', p + ' <h1> class', 'page-title', F.h1s[0] && F.h1s[0].cls, 'Task 2');
  chkEq('C9/' + p + '/h1text', F.h1s[0] ? F.h1s[0].text : null, wantTitle, p + ' <h1> textContent == 矩阵主体（｜后缀不进 <h1>）', 'Task 12 扩展矩阵');
  chk('C10/' + p, F.dupIds.length === 0 && ['nav-toggle', 'site-navigation', 'main-content'].every((i) => F.allIds.filter((x) => x === i).length === 1), p + ' ID 唯一性', '无重复 ID；nav-toggle/site-navigation/main-content 各一次', '重复: ' + F.dupIds.join(','), 'Task 2');
  const idNeed = IFACE.ids.filter((i) => i === 'nav-toggle' || i === 'site-navigation' || i === 'main-content' || (p === 'index.html'));
  chk('C11/' + p, idNeed.every((i) => F.allIds.includes(i)), p + ' 该页应含的已注册 ID 在场', idNeed.join(','), F.allIds.join(','), 'Task 0 §稳定接口总清单');
  chk('C12/' + p, (F.dataAttrs || []).length === 0, p + ' DOM 无 data-*/datetime/on* 属性', '0 个', JSON.stringify(F.dataAttrs), 'Task 12 R6②');
  chk('C13/' + p, F.commentCount === 0, p + ' 无 HTML 注释（字段名泄漏的常见盲区）', '0 条', F.commentCount, 'Task 12 R6①');
}
for (const p of HTML_PAGES) {
  const F = FACTS[p]; if (!F) continue;
  const got = F.navLinks.map((a) => [a.text, a.attrs.href].join('\u2192'));
  chk('D1/' + p, got.join('|') === NAVWANT.map((n) => n.join('\u2192')).join('|'), p + ' 导航四项文字/目标/顺序', NAVWANT.map((n) => n.join('\u2192')).join(' | '), got.join(' | '), 'Task 12（主导航文字/顺序/目标不变）');
}
{
  let total = 0; const bad = [];
  for (const p of HTML_PAGES) for (const a of ((FACTS[p] || {}).navLinks) || []) {
    total++; const h = a.attrs.href || '';
    if (!PAGE_SET.includes(h) || h.startsWith('/') || /^[A-Za-z]:/.test(h) || h.includes('\\') || h.includes('file:') || h === '#' || h.includes('?') || h.includes('#') || 'target' in a.attrs || h.includes('://')) bad.push(p + ':' + h);
  }
  chkEq('D2/count', total, HTML_PAGES.length * 4, '主导航链接总数 == 7 页 \u00d7 4（P4 的 28 条同源）', 'Task 2');
  chk('D2/target', bad.length === 0, (HTML_PAGES.length * 4) + ' 条导航目标', '全部落在已存在文件；无绝对路径/file:///反斜杠/#/查询/片段/target', bad.join(' | '), 'Task 2');
  for (const p of HTML_PAGES) {
    const F = FACTS[p]; if (!F) continue;
    const cur = F.navLinks.filter((a) => a.attrs['aria-current'] !== undefined);
    chk('D3/' + p, F.counts.ariaCurrentPage === 1 && cur.length === 1 && cur[0].attrs['aria-current'] === 'page' && cur[0].attrs.href === CURRENT[p], p + ' 唯一 aria-current="page" 归属', CURRENT[p], cur.map((a) => a.attrs.href + '=' + a.attrs['aria-current']).join(',') || '无', 'Task 12 扩展矩阵');
    chkEq('D3b/' + p, cur.length ? cur[0].attrs.href : null, ART_OF[p] ? ART_OF[p].list : p, p + ' 当前项 href（详情页指向所属栏目页）', 'Task 12 扩展矩阵');
    chk('D4/' + p, F.header.mastheadLink && F.header.mastheadLink.attrs['aria-current'] === undefined && F.navLinks.filter((a) => a.attrs.href !== CURRENT[p]).every((a) => a.attrs['aria-current'] === undefined) && F.ariaCurrentEls.every((e) => e.tag === 'a' && e.val === 'page'), p + ' 其余链接/报头无 aria-current；仅 <a> 值为 page', '通过', `报头=${JSON.stringify((F.header && F.header.mastheadLink && F.header.mastheadLink.attrs) || null)} 全部=${JSON.stringify(F.ariaCurrentEls)}`, 'Task 2');
    chk('D4/' + p + '/noli', !!F.nav && F.nav.items.every((it) => it.attrs['aria-current'] === undefined) && F.nav.attrs['aria-current'] === undefined, p + ' <li>/<nav> 无 aria-current', '通过', '命中', 'Task 2');
  }
}
{
  const normHead = (p) => FACTS[p].headHTML.replace(/(<title>)[\s\S]*?(<\/title>)/, '$1@@TITLE@@$2');
  const normShell = (p) => FACTS[p].bodyShellHTML.join('\n').replace(/\s+aria-current="page"/g, '').replace(/<main[\s\S]*?<\/main>/g, '@@MAIN@@');
  const KPG = HTML_PAGES.filter((f) => FACTS[f] && FACTS[f].mainAttrs);
  const heads = KPG.map(normHead), shells = KPG.map(normShell);
  chk('K1/head', heads.every((h) => h === heads[0]), '普通页（可得页）<head> 规范化后一致', '与 ' + HTML_PAGES[0] + ' 完全一致', HTML_PAGES.map((f, i) => f + ':' + (heads[i] === heads[0] ? '同' : '差异@' + firstDiff(heads[i], heads[0]))).join(' '), 'Task 2');
  chk('K1/shell', shells.every((s) => s === shells[0]), '普通页（可得页）body（除 main）规范化后一致', '与 ' + HTML_PAGES[0] + ' 完全一致', HTML_PAGES.map((f, i) => f + ':' + (shells[i] === shells[0] ? '同' : '差异@' + firstDiff(shells[i], shells[0]))).join(' '), 'Task 12（壳外字节全站一致）');
  chk('K1/html', KPG.every((f) => JSON.stringify(FACTS[f].html.attrs) === JSON.stringify(FACTS[KPG[0]].html.attrs)), '普通页 <html> 属性一致', '一致', KPG.map((f) => f + ':' + JSON.stringify(FACTS[f].html.attrs)).join(' '), 'Task 2');
  const sig = (f) => FACTS[f].bodyChildren.map((k) => k.tag + '.' + (k.cls || '') + '#' + (k.id || '')).join(' , ');
  chk('K2', KPG.every((f) => sig(f) === sig('index.html')), '七页 body 子元素序列一致', sig('index.html'), KPG.map((f) => f + ':' + sig(f)).join(' || '), 'Task 2');
  const ENTRY_LIST = IFACE.archClasses.includes('entry-list') ? 'entry-list' : '<未注册>';
  const MAIN_SIG = { 'index.html': HOME_KIDS.join(',') };
  for (const c of MANIFEST.columns) MAIN_SIG[c.list] = 'h1.page-title,ul.' + ENTRY_LIST;
  for (const p of DETAILS) MAIN_SIG[p] = 'article.article';
  for (const p of KPG) chkEq('K2/main/' + p, FACTS[p].mainChildSignature, MAIN_SIG[p], p + ' <main> 直接子元素签名（首页取 Task4 R4，列表/详情取注册表与详情页模板）', 'Task 12 归档层结构合同');
  const bodyAttrs = KPG.map((f) => ((src[f] || '').match(/<body([^>]*)>/i) || [])[1] || '');
  chk('K3', new Set(bodyAttrs).size === 1 && bodyAttrs[0].trim() === '' && KPG.every((f) => FACTS[f].counts.footer === 0 && FACTS[f].counts.form === 0 && FACTS[f].eventAttrs.length === 0 && FACTS[f].dupIds.length === 0 && FACTS[f].bodyChildren.length === 3), 'K3 页面独有结构', '无页面专属 body class、无页脚、无内联脚本/事件、body 恰三子元素、无重复 ID', bodyAttrs.map((a, i) => KPG[i] + ':' + JSON.stringify(a)).join(' '), 'Task 2');
}

/* ================================================= E 组：首页结构与白名单 */
{
  const F = FACTS['index.html'], S = src['index.html'] || '';
  if (!F || !F.mainAttrs) rec('E0', false, 'index.html', 'DOM 事实在场且 <main> 可解析', F ? '快照在场但取不到 <main>' : '缺快照', 'Task 18.2');
  else {
    const kids = F.mainChildEls || [], HL = F.homeLatest || {};
    chkEq('E1/count', kids.length, HOME_KIDS.length, 'index.html #main-content 直接元素子节点数（R4：三个）', 'Task 12 R4');
    chk('E1/order', kids.map((k) => k.tag + '.' + k.cls).join(',') === HOME_KIDS.join(','), 'index.html 直接子元素顺序', HOME_KIDS.join(','), kids.map((k) => k.tag + '.' + k.cls).join(','), 'Task 12 R4');
    chkEq('E1/h1', F.mainDirectElemTexts[0], 'h1 :: ' + WHITE[0], 'index.html h1 文本 == 白名单第 1 项', 'Task 4');
    chk('E2', F.counts.homeSectionsWrap === 1 && F.counts.homeSection === 3 && F.counts.sectionTotal === 3, 'index.html 区块数量（.home-section 仍为 3，R3）', '.home-sections 1，.home-section 3，section 3', `wrap=${F.counts.homeSectionsWrap} sec=${F.counts.homeSection} section=${F.counts.sectionTotal}`, 'Task 12 R3');
    const H2 = ['名称由来', '主要工作与报道方向', '成立时间'], IDS = ['origin-title', 'work-title', 'founded-title'];
    chk('E2/order', F.sections.map((s) => s.h2Text).join('|') === H2.join('|'), 'index.html 三区块顺序', H2.join(' | '), F.sections.map((s) => s.h2Text).join(' | '), 'Task 4');
    chk('E3', F.sections.length === 3 && F.sections.every((s) => s.childTags.join(',') === 'h2.home-section__title,p.home-section__text' && s.h2Count === 1 && s.pCount === 1 && s.directH2 && s.directP), 'index.html .home-section 子节点', '每块恰 1 个直接 h2.home-section__title + 1 个直接 p.home-section__text', F.sections.map((s) => s.childTags.join('+')).join(' | '), 'Task 4');
    chk('E4/ids', F.sections.every((s, i) => s.h2Id === IDS[i]), 'index.html h2 id 顺序', IDS.join(' \u2192 '), F.sections.map((s) => s.h2Id).join(' \u2192 '), 'Task 4');
    chk('E4/labelledby', F.sections.every((s) => s.abResolvedCount === 1 && s.abResolvesToOwnH2 && s.attrs['aria-labelledby'] === s.h2Id), 'index.html aria-labelledby', '每区块解析到本区块唯一 h2', F.sections.map((s) => `${s.ab}->${s.h2Id}(n=${s.abResolvedCount})`).join(' | '), 'Task 4');
    chk('E4/dup', new Set(F.sections.map((s) => s.h2Id)).size === 3 && F.dupIds.length === 0, 'index.html 标题 ID 唯一', '无重复 ID', F.dupIds.join(','), 'Task 4');
    chk('E4/latest', HL.present === true && HL.attrs.role === 'region' && HL.labelById === 'latest-title' && HL.labelByIdResolvedCount === 1 && HL.title && HL.title.id === 'latest-title' && (HL.title.cls || []).includes('home-latest__title'), 'index.html div.home-latest 容器（R3/R8）', 'role=region aria-labelledby=latest-title，h2#latest-title.home-latest__title', JSON.stringify(HL.attrs), 'Task 12 R3');
    chk('E4/latest-not-nav', HL.present === true && HL.navCountInside === 0 && HL.sectionCountInside === 0 && HL.homeSectionClsInside === 0, 'index.html 最新区不是 nav/section/.home-section（R3）', '三者全 0', `nav=${HL.navCountInside} section=${HL.sectionCountInside} .home-section=${HL.homeSectionClsInside}`, 'Task 12 R3');
    chkEq('E4/latest-ul', HL.ulCount, 1, 'index.html 最新区恰 1 个 ul.home-latest__list', 'Task 12 R4');
    chk('E5', F.h1s.length === 1 && F.h2s.length === TALLY.h2 && F.h3s.length === 0 && (F.mainHTML.match(/<h[1-6]/g) || []).length === HEAD_TOTAL, 'index.html 标题层级（R4：1 个 h1 + ' + TALLY.h2 + ' 个 h2，总数 ' + HEAD_TOTAL + '）', `h1=1 h2=${TALLY.h2} h3=0 总数=${HEAD_TOTAL}`, `h1=${F.h1s.length} h2=${F.h2s.length} h3=${F.h3s.length} 总数=${(F.mainHTML.match(/<h[1-6]/g) || []).length}`, 'Task 12 R4');
    const texts = F.sections.map((s) => s.pText);
    let e6 = true;
    for (let i = 0; i < 3; i++) {
      const want = HOME_TXT[SLOT_NAMES[i]];
      if (texts[i] !== want) { e6 = false; rec('E6/' + SLOT_NAMES[i], false, `index.html .home-section:nth(${i + 1}) p`, vis(want), vis(texts[i]) + ` [码点 期望 ${codes(want)} / 实际 ${codes(texts[i])}]`, 'Task 4（R7 换值后）'); }
      else rec('E6/' + SLOT_NAMES[i], true, `index.html 第 ${i + 1} 段（${H2[i]}）逐字符`, '', '');
    }
    chk('E6/all', e6, 'E6 汇总', '三段逐字符等于 Task4 冻结值（第三条为 R7 修订后的"鸽子衔枝之年"）', e6 ? '' : '见分项', 'Task 4／Task 12 R7');
    chkEq('E6/len', texts.map((t) => t.length).join(','), SLOT_NAMES.map((k) => HOME_TXT[k].length).join(','), 'index.html 三段字符数 == Task4 冻结值长度', 'Task 4');
    chk('E6/punct', texts.length === 3 && texts.every((t) => t.endsWith('。')) && texts[0].includes('《') && texts[0].includes('》') && texts.every((t) => !/[\u0020\u3000]/.test(t)), 'index.html 三段标点与空格', '均以中文句号结尾；首条含书名号；无半角/全角空格', texts.map((t) => JSON.stringify(t)).join(' | '), 'Task 4');
    chk('E6/third-new', texts[2] === HOME_TXT.P_FOUNDED && !new RegExp(YEAR_FORM).test(texts[2]), 'index.html 第三条为 R7 新句且不含公元年份', vis(HOME_TXT.P_FOUNDED), vis(texts[2]), 'Task 12 R7');
    const badTok = SLOT_NAMES.concat(['{{', '}}', 'TODO', 'TBD', '待替换', '［', '【说明', '页面登记表中的主标题']);
    const hitE7 = badTok.filter((t) => S.includes(t));
    chk('E7', hitE7.length === 0 && !/<section[\s\S]*?\[[^\]]*\]/.test(S), 'index.html 未替换记号', '无槽位名/模板方括号/占位记号', '命中: ' + hitE7.join(','), 'Task 4');
    const white = [F.h1s[0].text];
    for (const s of F.sections) white.push(s.h2Text, s.pText);
    white.push(HL.title ? HL.title.text : null);
    for (const it of HL.items || []) for (const sp of it.spans) white.push(sp.text);
    chkEq('E8/14', white.length, 14, 'index.html 可见内容白名单条数 == 14（R9 无条件，无收缩分支）', 'Task 12 R9');
    chk('E8/order', white.join('|') === WHITE.join('|'), 'index.html 白名单按序 14 项逐字符', WHITE.join(' | '), white.join(' | '), 'Task 12 R4');
    const wNums = [...CODE_ONLY.matchAll(/white\.length,\s*([0-9]+)/g)].map((m) => Number(m[1]));
    chk('E8/nobranch', wNums.length === 1 && wNums[0] === 14 && rows.filter((r) => r.id === 'E8/14').length === 1 && WHITE.length === 14, '核验器代码里 white.length 只与 14 比较过一次（R9④：不存在"按条目是否带日期取 12／14 两种口径"的收缩分支）', '一处比较，值为 14', '比较点=' + wNums.join('/') + ' 判据行数=' + rows.filter((r) => r.id === 'E8/14').length, 'Task 12 R9');
    const pairLatest = [];
    for (const page of LATEST) { const a = ART_OF[page], it = (HL.items || []).find((x) => x.href === page); pairLatest.push(a ? a.title : null, it ? (((it.spans || []).find((s) => (s.cls || []).some((k) => /__date$/.test(k))) || {}).text) : null); }
    chk('E8/from-manifest', white.slice(8).join('|') === pairLatest.filter((x) => x !== undefined).join('|'), '白名单第 9–14 项 == 由独立推导的全局序前 3 条派生（R11①/R12：不另立口径）', pairLatest.join(' | '), white.slice(8).join(' | '), 'Task 12 R11');
    const tally = {};
    for (const m of F.mainHTML.matchAll(/<([a-z][\w-]*)/g)) tally[m[1]] = (tally[m[1]] || 0) + 1;
    chk('E8/noEighth', keysOf(tally) === keysOf(TALLY), 'index.html <main> 标签计数 == Task4 R4 值（无第八项可见正文）', keysOf(TALLY), keysOf(tally), 'Task 12 R4');
    for (const k of Object.keys(TALLY)) chkEq('E8tally/' + k, tally[k], TALLY[k], 'index.html <main> 内 <' + k + '> 计数 == R4', 'Task 12 R4');
    for (const z of ['h3', 'h4', 'img', 'article', 'nav', 'time']) chkEq('E8zero/' + z, tally[z] || 0, 0, 'index.html <main> 内 <' + z + '> == 0（R4 第 2 条）', 'Task 12 R4');
    chkEq('E9/items', (HL.items || []).length, 3, 'index.html 最新区条目数恒为 3（R8/R11①：全局排序取前 3 条，与稿件总数无关）', 'Task 12 R11');
    chk('E9/itemshape', (HL.items || []).every((it) => it.tag === 'li' && it.aCount === 1 && it.spanCount === 2 && (it.linkChildTags || []).join('+') === 'span.home-latest__entry+span.home-latest__date'), 'index.html 每条 = a.home-latest__link 包两个 span（标题 + 月日）', 'li > a > span.entry + span.date', JSON.stringify((HL.items || []).map((it) => [it.tag, it.aCount, it.spanCount, it.linkChildTags])), 'Task 12 R8');
    chk('E9/no-summary', (HL.items || []).every((it) => !/摘要|阅读全文|了解更多|暂无/.test(it.linkText || '')), 'index.html 最新区不含摘要/阅读全文/了解更多文案', '无', JSON.stringify((HL.items || []).map((it) => it.linkText)), 'Task 12 R8');
    chk('E9/date-nodes', (HL.items || []).every((it) => (it.spans || []).some((s) => (s.cls || []).includes('home-latest__date') && /^[0-9]{1,2}月[0-9]{1,2}日$/.test(s.text || ''))), 'index.html 三条均带用户声明的 display_date 节点（R9③）', '每条一个 date span 且匹配月日式', JSON.stringify((HL.items || []).map((it) => (it.spans || []).map((s) => s.text))), 'Task 12 R9');
    chk('E9/latest-order', (HL.items || []).map((it) => it.href).join('|') === LATEST.join('|'), 'index.html 最新区次序 == 独立推导全局序的前 3 条（R11②四键全序）', LATEST.join(' | '), (HL.items || []).map((it) => it.href).join('|'), 'Task 12 R11');
  }
}

/* ============================================ F 组：详情页结构与逐字符 */
for (const p of DETAILS) {
  const F = FACTS[p], info = ART_OF[p] || {}, pre = PREFIX[info.column];
  const want = WANT[p] || [], base = CONTRACT[pre] || {}, isMig = !!IS_MIG[p];
  if (!F) { rec('F0/' + p, false, p, '快照在场', '缺失', 'Task 18.2'); continue; }
  const A = F.article;
  if (!A) { rec('F1/' + p, false, p + ' .article', 'main 唯一子节点为 article.article', '区块缺失：详情页无 .article（显式 FAIL，不抛异常）', 'Task 15'); continue; }
  chk('F1/' + p, (F.mainChildEls || []).length === 1 && F.mainChildEls[0].tag === 'article' && F.mainChildEls[0].cls === 'article', p + ' #main-content 唯一子节点', 'article.article', (F.mainChildEls || []).map((k) => k.tag + '.' + k.cls).join(','), 'Task 5/6/7');
  const isComm = HAS_DATE[p];            /* R12：结尾日期节点由 end_date 字段决定，与栏目无关 */
  const hasDl = HAS_DL[p];               /* R12：电头由首段 **…** 决定，与栏目无关 */
  chk('F0src/' + p, want.length > 0 && !!WANTSRC[p], p + ' 期望值来源（R12 按文章索引）', WANTSRC[p], WANTSRC[p] || '无', 'Task 12 R12');
  const wantOrder = isComm ? 'header.article__header,div.article__body,p.article__date' : 'header.article__header,div.article__body';
  chk('F1/' + p + '/order', (A.childOrder || []).join(',') === wantOrder, p + ' .article 子节点顺序', wantOrder, (A.childOrder || []).join(','), 'Task 12 归档层结构合同');
  chk('F2/' + p, A.header && (A.header.order || []).join(',') === 'p.article__type,h1.page-title,p.article__byline' && A.header.order.length === 3, p + ' .article__header 直接子元素', 'p.article__type → h1.page-title → p.article__byline（恰三项）', (A.header ? A.header.order : []).join(','), 'Task 5/6/7');
  chk('F3/' + p, A.header.attrs[0]['class'] === 'article__type' && A.header.texts[0] === 'p :: ' + info.label && A.header.attrs[2]['class'] === 'article__byline', p + ' .article__type 为栏目名（注册表第二列）', 'p :: ' + info.label, A.header.texts[0], 'Task 12 归档层结构合同');
  chk('F3/' + p + '/no评价', !(src[p] || '').includes('新闻评价') && !(F.bodyText || '').includes('新闻评价'), p + ' 不出现"新闻评价"', '0 次', ((src[p] || '').match(/新闻评价/g) || []).length + ' 次', 'Task 5/6/7');
  const authTitle = isMig ? base.title : (MD[p] || {}).fields.title;
  const authByline = isMig ? base.byline : (MD[p] || {}).fields.byline;
  chkEq('F4/' + p, F.h1s[0].text, authTitle, p + ' h1.page-title textContent == 权威 title（' + WANTSRC[p] + '）', 'Task 1 合同／R12');
  chkEq('F4b/' + p, F.h1s[0].text, info.title, p + ' h1 == manifest.columns[*].articles[*].title', 'Task 17');
  chk('F4/' + p + '/cls', F.h1s[0].cls === 'page-title' && F.counts.pageTitle === 1, p + ' h1 class', 'page-title 唯一', F.h1s[0].cls, 'Task 5/6/7');
  chkEq('F5/' + p, A.header.texts[2], 'p :: ' + authByline, p + ' .article__byline == 权威署名（' + WANTSRC[p] + '）', 'Task 1 合同／R12');
  chk('F5/' + p + '/prefix', !/(作者：|记者：|评论员：|文／)/.test(A.header.texts.join('|')), p + ' 署名前缀', '无"作者：/记者：/评论员：/文／"', A.header.texts.join(' | '), 'Task 5/6/7');
  chk('F6/' + p, A.body.pCount === want.length && A.body.nonPChildren.length === 0 && A.body.emptyPs === 0 && A.body.childOrder.every((t) => t === 'p'), p + ' .article__body > p 数量（段落数由 Task1 合同推导，不写死）', `${want.length} 段，无其他元素子节点、无空段`, `${A.body.pCount} 段；非 p 子节点=${JSON.stringify(A.body.nonPChildren)}；空段=${A.body.emptyPs}`, 'Task 13');
  const got = F.paragraphs.map((x) => x.text);
  let firstDiffIdx = -1;
  for (let i = 0; i < Math.max(got.length, want.length); i++) if (got[i] !== want[i]) { firstDiffIdx = i; break; }
  chk('F7/' + p, got.length === want.length && firstDiffIdx === -1, p + ' 逐段 textContent 严格相等', want.length + ' 项，首个差异索引 -1', firstDiffIdx < 0 ? '长度不符: ' + got.length : `首个差异 index=${firstDiffIdx} (${pre}${String(firstDiffIdx + 1).padStart(2, '0')}) 期望 ${vis(want[firstDiffIdx])} 实际 ${vis(got[firstDiffIdx])}`, 'Task 13');
  for (let i = 0; i < want.length; i++) chkEq('F7p/' + p + '/' + pre + String(i + 1).padStart(2, '0'), got[i], want[i], p + ' 第 ' + (i + 1) + ' 段逐字符（一条不减）', 'Task 13');
  const ckey = (i) => pre + ':' + pre + String(i + 1).padStart(2, '0');
  const lenBad = !isMig ? [] : want.map((w, i) => [i, CNT[ckey(i)], got[i] === undefined ? null : got[i].length]).filter((x) => x[1] !== undefined && x[1] !== x[2]).map((x) => pre + String(x[0] + 1).padStart(2, '0') + ': 合同' + x[1] + '/实际' + x[2]);
  const selfBad = !isMig ? [] : want.map((w, i) => CNT[ckey(i)] === w.length ? '' : ckey(i) + '=' + CNT[ckey(i)] + '!=' + w.length).filter(String);
  /* 迁移文比"合同 §3 逐段长度"；新稿没有合同块可比，退而比 DOM 段长与该页 md 段长——
     仍是两条独立链（浏览器 vs src_check 解析器），不假装比了更强的东西。 */
  const charBad = isMig ? lenBad : want.map((w, i) => (got[i] !== undefined && got[i].length === w.length) ? '' : '第' + (i + 1) + '段 DOM ' + (got[i] === undefined ? '缺' : got[i].length) + '/md ' + w.length).filter(Boolean);
  chk('F7/' + p + '/chars', (isMig ? lenBad.length === 0 : charBad.length === 0) && selfBad.length === 0, p + ' 逐段字符数 == 权威文本长度（' + WANTSRC[p] + '）', isMig ? 'Task1 §3 长度基线' : 'md 段长', (isMig ? lenBad.join(' | ') : charBad.join(' | ')) || '实际 ' + got.map((g) => g.length).join(',') + (selfBad.length ? ' | 合同自洽: ' + selfBad.join(',') : ''), 'Task 1 §3／R12');
  const dl = F.dateline;
  if (isComm) {
    chk('F8/' + p, dl.strongCountInPage === 0 && !A.html.includes('dateline') && F.paragraphs.every((x) => x.tags.length === 0), p + ' 本文无 .dateline（md 首段无 **…**，R12）', '0 个 strong.dateline；正文 p 无内联标签', `${dl.strongCountInPage} 个；内联=${JSON.stringify(F.paragraphs.map((x) => x.tags).filter((t) => t.length))}`, 'Task 7/R12');
    const d = A.date;
    chk('F9/' + p, !!d && d.tag === 'p' && d.attrs['class'] === 'article__date' && d.isDirectChildOfArticle && !d.isInBody && d.isLastArticleChild && A.body.pCount === want.length && !d.html.includes('<time') && !/datetime/i.test(d.html), p + ' .article__date 位置', '恰 1 个 p.article__date，为 .article 最后一个直接子节点，不在 .article__body 内，无 <time>/datetime', JSON.stringify(d && { tag: d.tag, cls: d.attrs['class'], inBody: d.isInBody, last: d.isLastArticleChild, ps: A.body.pCount }), 'Task 7/R5⑤');
    chkEq('F9/' + p + '/text', d ? d.text : null, MIG_END[p], p + ' 末尾日期逐字符 == 权威文本（迁移文取 Task1 closing_date，新稿取其 md 的 end_date）', 'Task 1 / Task 12 R12');
    const wantLen = isMig ? CNT['C:closing_date'] : (MD[p].fields.end_date || '').length;
    chk('F9/' + p + '/form', !!d && /^（自然选择号\d{1,2}月\d{1,2}日）$/.test(d.text) && !new RegExp(YEAR_FORM).test(d.text) && d.text.length === wantLen, p + ' 末尾日期形如（自然选择号X月X日）且无年份', `该正则，长度 ${wantLen}`, d ? `${vis(d.text)} 长度 ${d.text.length}` : 'null', 'Task 7/R12');
  } else {
    chk('F9/' + p, A.date === null && F.counts.articleDate === 0, p + ' md 无 end_date 时不得出现 .article__date（R12：字段驱动）', '0 个', `${F.counts.articleDate} 个`, 'Task 12 R12');
  }
  if (hasDl) {
    /* 电头期望值来自该页权威文本的首段：合同块与 md 渲染前都不带 ** 标记，
       电头 = 首个 U+0020 之前的部分（Task13 §3 的渲染对应关系） */
    const sp = (want[0] || '').indexOf('\u0020');
    need(sp > 0, WANTSRC[p] + ' 首段应含且仅含一处电头分隔空格');
    const wantDl = want[0].slice(0, sp), rest = want[0].slice(sp + 1), firstChar = rest.charAt(0);
    chk('F8/' + p + '/node', dl.present && dl.strongIsFirstChild && dl.parentIsFirstP && dl.childNodes[0].nodeType === 1 && dl.childNodes[0].name === 'STRONG', p + ' 电头为首个正文 <p> 的首个子节点', '第一个 <p> 的 firstChild 为 strong.dateline', JSON.stringify(dl.childNodes.map((n) => [n.nodeType, n.name])), 'Task 5/6');
    chkEq('F8/' + p + '/text', dl.text, wantDl, p + ' strong.dateline textContent（由首段的首个 U+0020 之前推导）', 'Task 13 正文区规则 3');
    const nt = dl.nextText || '';
    chk('F8/' + p + '/space', dl.nextText !== null && nt.codePointAt(0) === 0x20 && nt.codePointAt(1) === firstChar.codePointAt(0) && nt.codePointAt(2) !== 0x20 && !/[\u00A0\u3000]/.test(nt.slice(0, 3)), p + ' 电头后紧邻空格', `</strong> 后首字符 U+0020、次字符"${firstChar}"，且只有一个 U+0020`, `${vis(nt.slice(0, 4))} 码点=${codes(nt.slice(0, 3))}`, 'Task 13 §3');
    chkEq('F8/' + p + '/rest', (F.paragraphs[0] || {}).text, want[0], p + ' 首段 DOM textContent 逐字符等于权威文本首段（电头与正文接缝无损耗）', 'Task 13 §3');
    chk('F8/' + p + '/one', (dl.pHtml.match(/<strong/g) || []).length === 1 && !/&nbsp;/.test(dl.pHtml) && !/[\u00A0\u3000]/.test(dl.pText) && !/  /.test(dl.pText), p + ' 电头唯一性与无多余空格', '仅 1 个 <strong>；正文无 &nbsp;/全角空格/连续两空格', `${(dl.pHtml.match(/<strong/g) || []).length} 个 strong`, 'Task 5/6');
  }
  const cf = F.counts;
  chk('F10/' + p, cf.blockquote === 0 && cf.q === 0 && cf.cite === 0 && cf.ol === 0 && cf.liInBody === 0 && cf.img === 0 && cf.time === 0 && cf.aInArticle === 0 && F.h2s.length === 0 && F.h3s.length === 0, p + ' 正文禁用内联/块级标签', '无 blockquote/q/cite/正文 h2/ul/ol/li/img/正文链接/<time/h3', `bq=${cf.blockquote} q=${cf.q} cite=${cf.cite} ol=${cf.ol} li=${cf.liInBody} img=${cf.img} time=${cf.time} a=${cf.aInArticle} h2=${F.h2s.length} h3=${F.h3s.length}`, 'Task 5/6/7');
  chk('F10/' + p + '/inline', F.paragraphs.every((x, i) => hasDl ? (i === 0 ? x.tags.join(',') === 'strong' : x.tags.length === 0) : x.tags.length === 0), p + ' 正文 p 内除电头 <strong> 外无其他标签', '通过', JSON.stringify(F.paragraphs.map((x) => x.tags).filter((t) => t.length)), 'Task 5/6/7/R12');
  chkEq('F10/' + p + '/ul', cf.ul, 1, p + ' 唯一 <ul> 为导航列表（正文 0）', 'Task 5/6/7');
  const wsBad = [];
  F.paragraphs.forEach((x, i) => { const t = x.text; if (/^[\s\u00A0\u3000]/.test(t) || /[\s\u00A0\u3000]$/.test(t)) wsBad.push(i + ':首尾空白 ' + codes(t.slice(0, 2)) + '/' + codes(t.slice(-2))); if (/  /.test(t) || /[\n\r\t]/.test(t)) wsBad.push(i + ':段内空白 ' + codes(t)); });
  chk('F11/' + p, wsBad.length === 0, p + ' 段落空白规范', '无前导/尾随空白，无折行造成的段内多余空白（以 textContent 为准）', wsBad.join(' | ') || '无', 'Task 5/6/7');
}
for (const c of MANIFEST.columns) {
  const F = FACTS[c.list];
  if (!F || !F.entryList || !F.entryList.present) { rec('F12/' + c.list, false, c.list + ' .entry-list', '列表页条目区在场', '区块缺失（显式 FAIL，不抛异常）', 'Task 15'); continue; }
  chkEq('F12/' + c.list + '/count', F.entryList.itemCount, c.articles.length, c.list + ' .entry-list 条目数 == manifest 该栏目文章数', 'Task 15');
  chk('F12/' + c.list + '/order', (F.entryList.items || []).map((it) => it.href).join('|') === c.articles.map((a) => a.page).join('|'), c.list + ' 条目顺序 == manifest.columns[*].articles 顺序', c.articles.map((a) => a.page).join('|'), (F.entryList.items || []).map((it) => it.href).join('|'), 'Task 17 §manifest 契约 3');
  chk('F12/' + c.list + '/direct', F.entryList.isDirectChildOfMain === true && (F.mainChildEls || []).length === 2, c.list + ' .entry-list 是 <main> 的直接子元素', 'h1 + ul.entry-list', (F.mainChildEls || []).map((k) => k.tag).join(','), 'Task 12 归档层结构合同');
  c.articles.forEach((a, i) => {
    const it = (F.entryList.items || [])[i] || {};
    chkEq('F12/' + c.list + '/title' + i, it.titleText, a.title, c.list + ' 条目 ' + i + ' 标题逐字 == manifest title', 'Task 15');
    chk('F12/' + c.list + '/cls' + i, (it.titleCls || []).join(',') === 'entry-list__title' && (it.dateCls || []).join(',') === 'entry-list__date', c.list + ' 条目 ' + i + ' 两个 span 类名', 'entry-list__title / entry-list__date', JSON.stringify([it.titleCls, it.dateCls]), 'Task 0 §归档层新增');
    chkEq('F12/' + c.list + '/href' + i, it.href, a.page, c.list + ' 条目 ' + i + ' href == manifest page', 'Task 15');
  });
  chk('F12/' + c.list + '/noyear', (F.dateNodes || []).every((d) => !new RegExp(YEAR_FORM).test(d.text || '') && !new RegExp(ISO_FORM).test(d.text || '')), c.list + ' 日期节点内无年份形态与 ISO 形态', '命中 0', JSON.stringify(F.dateNodes), 'Task 12 R6③');
}

/* ==================================== G 组：高风险字符与计数（宿主=详情页） */
{
  const tokLine = T18.split('\n').find((l) => l.startsWith('| **G**'));
  need(tokLine, 'plan/Task18 §断言体系 G 行（高风险字符清单）');
  const toks = backticked(tokLine).filter((t) => /[\u4e00-\u9fffA-Za-z0-9.]/.test(t) && t.length <= 12 && !/^\(19/.test(t));
  need(toks.length >= 8, 'G 行应解析出高风险字符，实得 ' + toks.length + '：' + toks.join(','));
  for (const [k, list] of Object.entries(SEQ)) {
    const host = HOST[k];
    if (!host || !FACTS[host]) { rec('G/' + k, false, host + ' 宿主', '详情页快照在场', '缺失', 'Task 15'); continue; }
    const dom = (FACTS[host].paragraphs || []).map((x) => x.text).join('');
    const ct = list.join('');
    for (const t of toks) rec('G/' + k + '/' + t.replace(/\s+/g, '_'), dom.split(t).length - 1 === ct.split(t).length - 1, host + ' 正文中 ' + JSON.stringify(t) + ' 次数 == Task1 合同推导', '', '期望(合同)=' + (ct.split(t).length - 1) + ' 实际(DOM)=' + (dom.split(t).length - 1), 'Task 1 §3');
    for (const q of ['\u201c', '\u201d', '\u2018', '\u2019', '\u2014', '：', '；', '？', '、', '。', '，']) rec('G/' + k + '/punct' + q, dom.split(q).length - 1 === ct.split(q).length - 1, host + ' 全角标点 ' + q + ' 次数 == 合同', '', '期望=' + (ct.split(q).length - 1) + ' 实际=' + (dom.split(q).length - 1), 'Task 1');
    rec('G/' + k + '/space', dom.split('\u0020').length - 1 === ct.split('\u0020').length - 1, host + ' 半角空格次数 == 合同', '', '期望=' + (ct.split('\u0020').length - 1) + ' 实际=' + (dom.split('\u0020').length - 1), 'Task 1');
    chk('G/' + k + '/nohalfparen', !ct.includes('(') && !dom.includes('('), host + ' 正文无半角括号（合同用全角）', '0', (dom.match(/\(/g) || []).length, 'Task 1');
    chk('G/' + k + '/noyear', !new RegExp(YEAR_FORM).test(dom), host + ' 正文无年份形态（月日前无四位年份）', '命中 0', JSON.stringify(dom.match(/.{0,4}9月[0-9]{1,2}日/g) || []), 'Task 12 R5③');
    const domNl = (FACTS[host].paragraphs || []).map((x) => x.text).join('\n');
    chk('G/' + k + '/join-eq', domNl === list.join('\n'), host + ' 正文（段以 \\n 连接）与 Task1 合同逐字符相等', '相等', '不等：定位见 F7p 分项', 'Task 13');
  }
  const idxOf = (arr, ch) => arr.map((t, i) => (t.includes(ch) ? i : -1)).filter((i) => i >= 0).join(',');
  const feGot = ((FACTS[HOST.F] || {}).paragraphs || []).map((x) => x.text);
  chk('G/pron-她', idxOf(feGot, '她') === idxOf(F23, '她'), HOST.F + ' "她"所在段索引集合 == Task1 合同（人称不统一是素材原貌，不得统一）', idxOf(F23, '她'), idxOf(feGot, '她'), 'Task 6');
  chk('G/pron-他', idxOf(feGot, '他') === idxOf(F23, '他'), HOST.F + ' "他"所在段索引集合 == Task1 合同', idxOf(F23, '他'), idxOf(feGot, '他'), 'Task 6');
  const bt = ((FACTS[HOST.F] || {}).paragraphs || []).map((x) => x.text).join('');
  const titleF = (ART_OF[HOST.F] || {}).title || '';
  chkEq('G/AI-total', (bt.match(/AI/g) || []).length + (titleF.match(/AI/g) || []).length, (F23.join('').match(/AI/g) || []).length + (C_FEAT.title.match(/AI/g) || []).length, HOST.F + ' 标题+正文 AI 合计 == Task1 合同', 'Task 6');
  for (const v of ['ai', 'Ai', 'aI']) chkEq('G/' + v, ((titleF + bt).match(new RegExp(v, 'g')) || []).length, ((C_FEAT.title + F23.join('')).match(new RegExp(v, 'g')) || []).length, HOST.F + ' 大小写变体 ' + v + ' 次数 == 合同', 'Task 6');
  const dashAlone = (s) => (s.match(/(^|[^\u2014])\u2014($|[^\u2014])/g) || []).length;
  chkEq('G/dash-adj', dashAlone(bt), dashAlone(F23.join('')), HOST.F + ' 无孤立破折号（U+2014 均两两成对）', 'Task 6');
}

/* ============================================ H 组：styles.css 静态合同 */
function scanCss(text) {
  let clean = '';
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '/' && text[i + 1] === '*') { const j = text.indexOf('*/', i + 2); const end = j < 0 ? text.length : j + 2; clean += ' '.repeat(end - i); i = end - 1; continue; }
    clean += text[i];
  }
  const rules = []; let depth = 0, buf = '', stack = [];
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '{') { stack.push({ prelude: buf.trim(), start: i }); buf = ''; depth++; continue; }
    if (ch === '}') {
      if (depth === 0) return { clean, rules, error: '多余的 }', balanced: false, trailing: '' };
      const b = stack.pop(); depth--;
      const body = clean.slice(b.start + 1, i);
      if (depth === 0) rules.push({ prelude: b.prelude, body, child: b.child || [] });
      else { const top = stack[stack.length - 1]; top.child = (top.child || []).concat([{ prelude: b.prelude, body }]); }
      buf = ''; continue;
    }
    buf += ch;
  }
  return { clean, rules, balanced: stack.length === 0 && depth === 0, error: stack.length ? '未闭合 {' + stack.map((s) => s.prelude.slice(0, 40)).join('/') : '', trailing: buf.trim() };
}
{
  const C = src['styles.css'] || '';
  const scan = scanCss(C);
  const flat = []; const flatten = (rs) => rs.forEach((r) => { if (r.prelude.startsWith('@')) flatten(r.child || []); else flat.push({ sel: r.prelude, decl: r.body }); });
  flatten(scan.rules);
  const cssClasses = new Set();
  for (const r of flat) for (const m of r.sel.matchAll(/\.([A-Za-z_][-\w]*)/g)) cssClasses.add(m[1]);
  const htmlClasses = new Set();
  for (const f of HTML_PAGES) { for (const m of (src[f] || '').matchAll(/class="([^"]*)"/g)) m[1].split(/\s+/).forEach((c) => c && htmlClasses.add(c)); for (const cl of ((FACTS[f] || {}).classesAll) || []) htmlClasses.add(cl); }
  const registered = new Set(IFACE.classes);
  chk('H1', HTML_PAGES.every((f) => (((FACTS[f] || {}).links) || []).filter((l) => l.rel === 'stylesheet').length === 1 && FACTS[f].links.filter((l) => l.rel === 'stylesheet')[0].href === 'styles.css') && MP.filter((p) => /\.css$/i.test(p.path)).length === 1, '普通页样式引用 / Results 样式文件数', '仅 href="styles.css"，且只有一个 .css', HTML_PAGES.map((f) => JSON.stringify(((FACTS[f] || {}).links) || [])).join(' '), 'Task 2/3');
  chk('H2', !/@import|@font-face|url\s*\(|https?:\/\/|["'(]\s*\/\/|[A-Za-z]:[\\/]/.test(scan.clean), 'styles.css 外部资源', '无 @import/@font-face/url(/http(s):///协议相对/盘符', (scan.clean.match(/@import|@font-face|url\s*\(|https?:\/\/|["'(]\s*\/\/|[A-Za-z]:[\\/]/g) || []).join(','), 'Task 3');
  chkEq('H3', (C.match(/--font-serif\s*:/g) || []).length, 1, 'styles.css 字体栈声明唯一', 'Task 3');
  chk('H3/noremote', !/fonts\.googleapis|https?:/.test(scan.clean), 'styles.css 远程字体', '无远程引用', String(scan.clean.match(/url\s*\([^)]*\)/g)), 'Task 3');
  const rootBlocks = scan.rules.filter((r) => r.prelude === ':root');
  const firstRoot = rootBlocks[0] ? rootBlocks[0].body : '';
  const h4 = IFACE.vars.filter((v) => (firstRoot.match(new RegExp('--' + v.replace(/^--/, '') + '\\s*:', 'g')) || []).length > 1);
  chk('H4', firstRoot.length > 0 && h4.length === 0, 'styles.css 首个 :root 内已注册变量无重复声明', '无重复', h4.join(',') || '通过', 'Task 3/8');
  /* v1 的 H4（关键变量数值）语义保留，但期望值改为从 plan/Task3 的桌面基线 CSS 块解析，不再手抄 */
  const T3 = read(path.join(PLAN, 'Task3-实现桌面端纸媒视觉系统.md'));
  const CSS_BASE = {};
  for (const m of T3.matchAll(/(--[a-z][-\w]*)\s*:\s*([^;\n]+);/g)) if (!CSS_BASE[m[1]]) CSS_BASE[m[1]] = m[2].trim();
  need(Object.keys(CSS_BASE).length >= 5, 'Task3 未解析出桌面基线变量值，实得 ' + Object.keys(CSS_BASE).length);
  const drift = [];
  for (const [v, val] of Object.entries(CSS_BASE)) {
    const m = firstRoot.match(new RegExp('--' + v.replace(/^--/, '') + '\\s*:\\s*([^;]+);'));
    if (!m) continue;
    if (m[1].trim() !== val) drift.push(v + ': 合同 ' + val + ' / 实际 ' + m[1].trim());
  }
  chk('H4/values', drift.length === 0, 'styles.css 首个 :root 的变量数值逐字符等于 plan/Task3 桌面基线（v1 H4 语义，期望值由锚点解析）', Object.keys(CSS_BASE).length + ' 个已登记变量全等', drift.join(' | '), 'Task 3');
  chkEq('H4/values-cover', drift.length + Object.keys(CSS_BASE).length, Object.keys(CSS_BASE).length, 'H4 变量对照覆盖 Task3 解析出的全部变量', 'Task 3');
  const dupSemantic = IFACE.vars.filter((v) => (firstRoot.match(new RegExp('--' + v.replace(/^--/, '') + '\\s*:', 'g')) || []).length > 1);
  chk('H4/nodup', dupSemantic.length === 0, 'styles.css 同一 :root 内不得重复声明同一变量', '无重复', dupSemantic.join(','), 'Task 3');
  const usedVars = sortedUniq((C.match(/--[a-z][-\w]*(?=\s*:)/g) || []));
  const isRegVar = (v) => IFACE.vars.includes(v) || IFACE.varFamilies.some((f) => v.startsWith(f));
  /* §样式变量 里点名的变量必须都在首个 :root 里（完备性）；"不新造并行变量"由 Task 16 前后对照证明，
   * 而不是拿 §样式变量 这份散文摘要当穷举注册表——Task 3 早已交付 --line-height-* 等未点名变量。 */
  const missingNamed = IFACE.vars.filter((v) => !new RegExp('--' + v.replace(/^--/, '') + '\\s*:').test(firstRoot));
  chk('H4/declared', missingNamed.length === 0, 'styles.css 首个 :root 覆盖 §样式变量 点名的全部变量', '无缺失', missingNamed.join(','), 'Task 3/16');
  const beforeCss = path.join(ROOT, 'qa/_qa_task16', 'before_styles.css');
  if (fs.existsSync(beforeCss)) {
    const baseVars = new Set(sortedUniq((read(beforeCss).match(/--[a-z][-\w]*(?=\s*:)/g) || [])));
    const newVars = usedVars.filter((v) => !baseVars.has(v));
    chk('H4/no-new-var', newVars.length === 0, 'styles.css 归档区段未新造任何自定义属性（Task 16 变异 4 的禁令：--font-size-list 一类）', '与 _qa_task16/before_styles.css 变量集合相等', newVars.join(','), 'Task 16 §9 变异 4／§7');
    chkEq('H4/var-count', usedVars.length, baseVars.size, 'styles.css 自定义属性总数 == Task 16 之前（零新增即零并行主题）', 'Task 16 §7');
  } else rec('H4/no-new-var', false, beforeCss, 'Task 16 前置样式基线在场', '缺失', 'Task 16');
  chk('H4/families', IFACE.varFamilies.length >= 3 && isRegVar('--font-size-list') === false || IFACE.varFamilies.length >= 3, '§样式变量 解析出字号／间距／分隔线三族（--font-size-*、--space-*、--rule-*）', '≥3 族', IFACE.varFamilies.join(','), 'Task 0 §样式变量');
  const idSel = flat.filter((r) => /(^|[\s>+~,(])#[\w-]/.test(r.sel));
  chk('H5/id', idSel.length === 0, 'styles.css ID 选择器', '不使用 #nav-toggle / #site-navigation / #main-content / #latest-title 等 ID 选择器', idSel.map((r) => r.sel).join(' | '), 'Task 3/16');
  chk('H5/important', !/!important/.test(C), 'styles.css !important', '0 次', (C.match(/!important/g) || []).length + ' 次', 'Task 3/16');
  const patchHits = [...scan.clean.matchAll(/(?<![\w-])(?:body\.[\w-]+|news-message|news-feature|news-commentary|index\.html|index)(?![\w-])/g)].map((m) => m[0]);
  chk('H5/pagepatch', patchHits.length === 0 && !/:nth-child\(/.test(scan.clean) && !flat.some((r) => /:nth-child\(|body\.[\w-]/.test(r.sel)), 'styles.css 页面识别补丁', '无 body.页面名、文件名 class、:nth-child() 页面识别（注释已剔除）', patchHits.join(',') + ' | :nth-child=' + (scan.clean.match(/:nth-child\(/g) || []).length, 'Task 3');
  chk('H6', flat.some((r) => /\.site-navigation__link\[aria-current\s*=\s*["']?page["']?\]/.test(r.sel)), 'styles.css 当前页样式', '存在 .site-navigation__link[aria-current="page"]', flat.filter((r) => /aria-current/.test(r.sel)).map((r) => r.sel).join(' | ') || '无', 'Task 3');
  const banned = { 'box-shadow': /box-shadow/, 'text-shadow': /text-shadow/, 'linear-gradient': /linear-gradient/, 'radial-gradient': /radial-gradient/, 'background-image': /background-image/, 'column-count': /column-count/, 'column-width': /column-width/, 'overflow-x hidden': /overflow-x\s*:\s*hidden/, 'overflow-x clip': /overflow-x\s*:\s*clip/, 'word-break break-all': /word-break\s*:\s*break-all/, transition: /(^|[;{}\s])transition\s*:/ };
  const hb = Object.entries(banned).filter(([, re]) => re.test(scan.clean)).map(([k]) => k);
  chk('H7', hb.length === 0, 'styles.css 被禁视觉模式', '无 box/text-shadow、渐变、background-image、column-*、overflow-x hidden|clip、word-break:break-all、transition', hb.join(',') || '无', 'Task 3/16');
  const radius = flat.filter((r) => /border-radius/.test(r.decl)).map((r) => r.sel);
  chk('H7/radius', radius.length === 0, 'styles.css 不以 border-radius 卡片化内容', '0 条', radius.join(' | ') || '无', 'Task 3/16');
  const medias = scan.rules.filter((r) => r.prelude.startsWith('@media'));
  chk('H8', medias.length === 1 && medias[0].prelude === '@media (max-width: 768px)' && scan.rules[scan.rules.length - 1] === medias[0], 'styles.css 移动区段', '恰一个 @media (max-width: 768px) 且位于末尾', medias.map((m) => JSON.stringify(m.prelude)).join(',') + ' 顶层块数=' + scan.rules.length, 'Task 8/16');
  chk('H8/other', !/max-width\s*:\s*767px|min-width\s*:\s*768px|max-width\s*:\s*(769|[78][89][0-9]|[0-9]{4,})px/.test(scan.clean), 'styles.css 误写断点', '无 767px、min-width:768px 或 769px', (scan.clean.match(/(max|min)-width\s*:\s*[0-9]+px/g) || []).join(','), 'Task 8/16');
  const mFlat = (medias[0] || {}).child || [];
  const mDecl = mFlat.map((r) => r.body).join('\n');
  chk('H9', !/100vw/.test(mDecl) && !/overflow-x\s*:\s*(hidden|clip)/.test(mDecl) && !/word-break\s*:\s*break-all/.test(mDecl) && !/!important/.test(mDecl) && /overflow-wrap\s*:\s*(anywhere|break-word)/.test(mDecl) && /word-break\s*:\s*normal/.test(mDecl) && /hyphens\s*:\s*none/.test(mDecl), 'styles.css 移动区段内容', '无 100vw/overflow-x hidden|clip/word-break:break-all/!important；使用 overflow-wrap + word-break:normal + hyphens:none', `100vw=${(mDecl.match(/100vw/g) || []).length} ow=${(mDecl.match(/overflow-wrap\s*:[^;]+/g) || []).join(',')}`, 'Task 8');
  const contents = [...C.matchAll(/[^-]\bcontent\s*:\s*([^;{}]+)/g)].map((m) => m[1].trim());
  const badContent = contents.filter((v) => !/^(""|''|none|normal)/.test(v) && /[\u4e00-\u9fff]/.test(v));
  chk('H10', badContent.length === 0, 'styles.css content 注入', '除装饰性 content:"" 外无注入正文/作者/日期/电头/菜单文字', contents.map((v) => JSON.stringify(v)).join(' | ') || '无', 'Task 3');
  chk('H10/dot', !contents.some((v) => /^[·•]$/.test(v.replace(/^["']|["']$/g, ''))), 'styles.css 不得以 content 注入分隔点（Task 16 §7 登记给本包的 H10 口径差）', '无 content:"·"', contents.join(' | '), 'Task 16 §7');
  const bannedCls = [...cssClasses].filter((cl) => /^(mobile|message|feature|commentary|news-commentary)-[\w-]*$/i.test(cl) || /^(nowrap|technical-term)$/.test(cl));
  chk('H11', bannedCls.length === 0, 'styles.css 页面专属 class', '无 .mobile-*/.message-*/.feature-*/.commentary-*/.nowrap/.technical-term', '命中=' + bannedCls.join(','), 'Task 8');
  const unknownCss = [...cssClasses].filter((cl) => !registered.has(cl) && !/^(js|no-js|is-open)$/.test(cl));
  chk('H11/unknown', unknownCss.length === 0, 'styles.css 每个 class 选择器都在 Task0 §稳定接口总清单 内（R6⑥）', '无未注册类', unknownCss.join(','), 'Task 16');
  const orphanCss = [...cssClasses].filter((cl) => !htmlClasses.has(cl) && !/^(js|no-js|is-open)$/.test(cl));
  chk('H11/orphan', orphanCss.length === 0, 'styles.css 类均可在普通 HTML 页面或 script.js 状态类中找到（线上专用 404 的壳类由 A3 单独核验；is-open 由脚本运行时写入）', '无孤儿类', orphanCss.join(','), 'Task 16 §7／R13');
  const mRoot = mFlat.filter((r) => /:root/.test(r.sel));
  const desktopVars = new Set(sortedUniq((firstRoot.match(/--[a-z][-\w]*(?=\s*:)/g) || [])));
  const mOver = sortedUniq((mFlat.map((r) => r.body).join('\n').match(/--[a-z][-\w]*(?=\s*:)/g) || []));
  chk('H11/root', mOver.every((v) => desktopVars.has(v)), 'styles.css 移动区段仅覆盖桌面 :root 已有变量，不新增第二套主题变量', '全部已在桌面 :root 声明', mOver.filter((v) => !desktopVars.has(v)).join(',') || mOver.join(','), 'Task 8');
  chk('H12', scan.balanced && !scan.error && !scan.trailing && flat.length > 0, 'styles.css 花括号与语法', '花括号配对、@media 可解析、无未闭合规则、顶层无游离文本', `balanced=${scan.balanced} error=${scan.error || '无'} trailing=${JSON.stringify((scan.trailing || '').slice(0, 40))} 规则数=${flat.length}`, 'Task 3');
  const cps = HTML_PAGES.map((f) => (FACTS[f] || {}).cssParse);
  chk('H12/browser', cps.every((x) => x && x.ok && x.href === 'styles.css') && cps.every((x) => x.top === scan.rules.length) && cps.every((x) => x.mediaCount === 1 && x.lastIsMedia && x.mediaText === '(max-width: 768px)'), 'styles.css 普通页浏览器解析证据', `每个普通页 styleSheets[0] 顶层规则数 == 源码扫描 ${scan.rules.length}；恰一个 @media 且为最后一条`, cps.map((x, i) => HTML_PAGES[i] + ':' + JSON.stringify(x)).join(' '), 'Task 3/8');
  rec('H12/n', true, 'styles.css', '', `顶层块=${scan.rules.length}，声明块=${flat.length}，移动区段规则=${mFlat.length}`);
  const VISITED_SCOPE = ['.site-masthead__link', '.site-navigation__link', '.entry-list__link', '.home-latest__link'];
  const colorOf = (sel) => { const out = []; for (const r of flat) for (const part of r.sel.split(',')) if (part.trim() === sel) { const m = r.decl.match(/(?:^|[;\s])color\s*:\s*([^;]+)/); if (m) out.push(m[1].trim()); } return out; };
  for (const s of VISITED_SCOPE) {
    const a = colorOf(s), v = colorOf(s + ':visited');
    chk('H13/' + s, a.length > 0 && v.length > 0 && v[v.length - 1] === a[a.length - 1], 'styles.css H13 visited 配对 ' + s, `${s} 与 ${s}:visited 的 color 逐字符相等`, JSON.stringify([a, v]), 'Task 16 §7 H13');
  }
  chk('H13/scope', VISITED_SCOPE.length === 4, 'H13 辖域是封闭清单四类（显式豁免 .skip-link，不得外延）', '4 类', VISITED_SCOPE.join(' | '), 'Task 16 §7 H13');
  chk('H13/skip-exempt', !flat.some((r) => /\.skip-link:visited/.test(r.sel)), 'styles.css 不存在 .skip-link:visited（按合同豁免）', '不存在', String(flat.filter((r) => /skip-link/.test(r.sel)).length) + ' 条 .skip-link 规则', 'Task 16 §7');
  for (const cl of IFACE.archClasses) { const n = flat.filter((r) => new RegExp('\\.' + cl + '(?![\\w-])').test(r.sel)).length; chk('H14/rule/' + cl, n >= 1, 'styles.css 归档新类 .' + cl + ' 至少被一条规则使用（H14b 无条件，死规则检查）', '≥1 条', n + ' 条', 'Task 16 §7 H14b'); }
  chk('H14/subset', [...cssClasses].every((cl) => registered.has(cl)), 'styles.css class 集合 \u2286 Task0 注册类（26 既有 \u222a 12 归档）', '子集成立', [...cssClasses].filter((cl) => !registered.has(cl)).join(','), 'Task 16 §7 H14a');
  chkEq('H14/arch-count', IFACE.archClasses.length, 12, 'H14 的归档新类面 == 12（来自 Task0 §归档层新增）', 'Task 0 §稳定接口总清单');
  /* Task 16 §9 第 7 类「把桌面新规则整体移进 @media」的接管判据：归档样式必须在桌面区段（@media 之前）出现 */
  const desktopRules = scan.rules.filter((r) => !r.prelude.startsWith('@'));
  for (const cl of IFACE.archClasses) {
    const n = desktopRules.filter((r) => new RegExp('\\.' + cl + '(?![\\w-])').test(r.prelude)).length;
    chk('H14/desktop/' + cl, n >= 1, '归档新类 .' + cl + ' 的桌面规则在场（不得整体挪进 @media 内部）', '≥1 条在 @media 之前', n + ' 条', 'Task 16 §9 第 7 类');
  }
  for (const cl of IFACE.archClasses) {
    const pagesWith = HTML_PAGES.filter((f) => (((FACTS[f] || {}).classesAll) || []).includes(cl));
    if (DATE_NODE_CLASSES.includes(cl)) { const anyNode = HTML_PAGES.some((f) => (((FACTS[f] || {}).dateNodes) || []).length > 0); chk('H14/dom/' + cl, pagesWith.length > 0 ? true : !anyNode, '归档日期类 .' + cl + ' 的 DOM 在场性（无节点则 N/A，不 FAIL）', '在场或 N/A', pagesWith.join(',') || 'N/A', 'Task 16 §7 H14c'); }
    else chk('H14/dom/' + cl, pagesWith.length >= 1, '归档新类 .' + cl + ' 至少在某个页面 DOM 中出现一次', '≥1 页', pagesWith.length + ' 页', 'Task 16 §7 H14c');
  }
}

/* ======================================================== I 组：script.js */
{
  const J = src['script.js'] || '';
  chk('I1', HTML_PAGES.every((f) => (((FACTS[f] || {}).scripts) || []).length === 1 && FACTS[f].scripts[0].attrs.src === 'script.js' && 'defer' in FACTS[f].scripts[0].attrs) && MP.filter((p) => /\.js$/i.test(p.path)).length === 1, '普通页 script.js 唯一性与 defer', '每个普通页恰一个 <script src="script.js" defer>，Results/ 只有一个 .js', HTML_PAGES.map((f) => f + ':' + JSON.stringify(((FACTS[f] || {}).scripts) || [])).join(' '), 'Task 9');
  chk('I1/extra', MP.filter((p) => /\.(json|map|polyfill)/i.test(p.path)).length === 0, '第二脚本/polyfill/配置 JSON', '无', PAGE_SET.join(','), 'Task 9');
  chk('I2', !/\bimport\b|\bexport\b/.test(J) && !/https?:\/\/|fetch\(|XMLHttpRequest|require\(|import\(/.test(J), 'script.js 模块与外部依赖', '普通脚本；无 import/export/URL/fetch/XHR', (J.match(/\bimport\b|\bexport\b|https?:\/\/|fetch\(|XMLHttpRequest|require\(/g) || []).join(','), 'Task 9');
  chk('I3', !/console\s*\./.test(J) && !/\bdebugger\b/.test(J), 'script.js console/debugger', '0 次', `console=${(J.match(/console\s*\./g) || []).length} debugger=${(J.match(/\bdebugger\b/g) || []).length}`, 'Task 9');
  chk('I4', (J.match(/\(\s*min-width\s*:\s*769px\s*\)/g) || []).length === 1 && !/768px|48rem|innerWidth|offsetWidth|clientWidth/.test(J), 'script.js 断点字符串', '恰一处 (min-width: 769px)；无 768px/48rem/innerWidth/offsetWidth', (J.match(/\(\s*(min|max)-width\s*:\s*[^)]*\)/g) || []).join(' , '), 'Task 9');
  const writes = [...J.matchAll(/([^;{}()\n]*?)\.(setAttribute|removeAttribute|classList|style|innerHTML|outerHTML|insertAdjacentHTML|innerText|textContent|className)(\.(add|remove|toggle|contains|setItem))?\s*\(/g)].map((m) => m[1].trim().replace(/\s+/g, ' ') + '.' + m[2] + (m[3] || ''));
  const allowed = ['root.classList.remove', 'root.classList.add', 'navigation.classList.contains', 'navigation.classList.toggle', 'toggle.setAttribute'];
  const isAllowed = (w) => allowed.some((a) => new RegExp('(?:^|[\\s.])' + a.replace(/\./g, '\\.') + '$').test(w));
  const over = writes.filter((w) => !isAllowed(w));
  chk('I5', over.length === 0 && /classList\.remove\('no-js'\)/.test(J) && /classList\.add\('js'\)/.test(J) && /classList\.toggle\('is-open'/.test(J) && /setAttribute\('aria-expanded'/.test(J), 'script.js 状态写入范围（三处）', '仅 documentElement no-js/js、#site-navigation is-open、#nav-toggle aria-expanded', `写入点=${writes.join(' , ')} | 越权=${over.join(',')}`, 'Task 9');
  chk('I5/assign', !/\.\s*style\s*\.\s*\w+\s*=|innerHTML\s*=|innerText\s*=|textContent\s*=|className\s*=[^=]/.test(J), 'script.js 改写禁令', '无 style/innerHTML/className 整体改写或文本注入', (J.match(/\.\s*style\s*\.|innerHTML\s*=|innerText\s*=|textContent\s*=|className\s*=/g) || []).join(','), 'Task 9');
  chk('I6', /getElementById\(['"]nav-toggle['"]\)/.test(J) && /getElementById\(['"]site-navigation['"]\)/.test(J) && !/querySelector[^)]*[\u4e00-\u9fff]/.test(J) && !/children\[\d|\]\.children\[/.test(J), 'script.js 查询依据', '基于 #nav-toggle / #site-navigation；不以中文文本或位置索引判定', (J.match(/getElementById\([^)]*\)|querySelector\([^)]*\)|closest\([^)]*\)/g) || []).join(' , '), 'Task 9');
  const noJsIdx = J.search(/classList\.remove\(['"]no-js['"]\)/), firstWriteIdx = J.search(/setAttribute|classList\.(add|remove|toggle)/);
  chk('I7', noJsIdx > 0 && firstWriteIdx === noJsIdx && !/['"](tabindex|aria-hidden|hidden)['"]/.test(J), 'script.js no-js\u2192js 位置', 'no-js\u2192js 是首个实质状态写入', `no-js=${noJsIdx} first=${firstWriteIdx}`, 'Task 9');
  const i8 = [];
  const banI8 = J1T.concat(J2T, J3T, SLOT_NAMES, ['closing_date'], J5T.filter((t) => /Materials|\.docx/.test(t)));
  for (const t of banI8) if (J.includes(t)) i8.push(t);
  for (const m of MAT) if (J.includes(m.sha.slice(0, 12)) || J.includes(m.sha.toLowerCase().slice(0, 12))) i8.push('hash:' + m.sha.slice(0, 12));
  if (new RegExp(SLUG_CONTRACT_RE, 'm').test(J)) i8.push('段落编号');
  chk('I8', i8.length === 0, 'script.js 禁止信息（含注释）', '无元数据作者/推断年份/文件路径/哈希/内部段落编号', i8.join(','), 'Task 9');
  const outside = [...J.matchAll(/(document|window|body|documentElement)\s*\.\s*addEventListener\(\s*['"](\w+)['"]/g)].filter((m) => /^(click|pointerdown|mousedown|touchstart|mouseup)$/.test(m[2]));
  chk('I9', outside.length === 0, 'script.js 点击外部关闭', '未监听 document/window 的 click 类事件判定菜单外点击', outside.map((m) => m[1] + ':' + m[2]).join(' , ') || '无', 'Task 9');
  const v1Baseline = path.join(ROOT, 'qa/_qa_task13', 'baseline', 'script.js');
  chk('I10/fs', fs.existsSync(v1Baseline), 'v1 基线 script.js 参照在场', 'qa/_qa_task13/baseline/script.js', fs.existsSync(v1Baseline) ? '在场' : '缺失', 'Task 13');
  if (fs.existsSync(v1Baseline)) chkEq('I11/hash', shaLo(readBuf(path.join(RESULTS, 'script.js'))), shaLo(readBuf(v1Baseline)), 'script.js 哈希 == v1 基线（R10：本轮无写入者，预期零改动）', 'Task 12 R10（变红即有人越权）');
  rec('I 事件绑定', true, 'script.js', '', (J.match(/addEventListener\(\s*['"][\w-]+['"]/g) || []).map((s) => s.replace(/addEventListener\(\s*['"]|['"]$/g, '')).join(' , '));
}

/* ============================================================ J 组：禁止项 */
{
  const all = MP.map((p) => [p.path, safe(path.join(RESULTS, p.path))]).filter((e) => e[1] !== null);
  const INTERNAL = [C_MSG, C_FEAT, C_COMM].flatMap((b) => Object.keys(b)).filter((k) => /^[MFC][0-9]{2}$/.test(k)).concat(SLOT_NAMES, ['closing_date']);
  const JG = {
    J1: J1T, J2: J2T, J3: J3T, J4: INTERNAL,
    J5: sortedUniq(J5T.concat(MAT.map((m) => m.name))),
    J6: MAT.flatMap((m) => [m.sha, m.sha.toLowerCase(), m.sha.slice(0, 16), m.sha.slice(0, 12), m.sha.toLowerCase().slice(0, 12)]),
    J7: J7T, J8: sortedUniq(J8T.filter((t) => t !== '{{...}}').concat(['{{', '}}', 'Lorem', '待补充', '占位'])),
    J9: ['<time', 'datetime='], J10: ['http://', 'https://', '//cdn', '@import', '@font-face', 'url('],
    J11: [ISO_FORM], J12: ['data-', '<time', 'datetime='], J16: [SLUG_CONTRACT_RE],
  };
  for (const [id, toks] of Object.entries(JG)) {
    const hits = [];
    for (const [f, text] of all) for (const t of toks) {
      if (id === 'J11' || id === 'J16') { const m = new RegExp(t, 'm').exec(text); if (m) hits.push(`${f}:${t}@${m.index} \u2026${text.slice(Math.max(0, m.index - 10), m.index + 22).replace(/\n/g, '\\n')}\u2026`); continue; }
      let i = text.indexOf(t);
      while (i >= 0) { hits.push(`${f}:${t}@${i} \u2026${text.slice(Math.max(0, i - 10), i + t.length + 10).replace(/\n/g, '\\n')}\u2026`); i = text.indexOf(t, i + 1); if (hits.length > 12) break; }
    }
    chk(id, hits.length === 0, `Results/ 全部交付文件整文扫描 ${id}（${toks.length} 个禁止串/形态）`, '命中数 0', hits.slice(0, 4).join(' | ') || '0', '产生该内容的上游任务');
  }
  const dn = [];
  for (const f of HTML_PAGES) for (const d of ((FACTS[f] || {}).dateNodes) || []) dn.push([f, d.text]);
  chk('J13', dn.length > 0 && dn.every(([, t]) => !/[0-9]{4}/.test(t || '')), `日期节点（${DATE_NODE_CLASSES.join('/')}）内无四位数字`, '命中 0', JSON.stringify(dn), 'Task 12 R6③');
  chk('J13b', dn.every(([, t]) => !new RegExp(YEAR_FORM).test(t || '')), '日期节点内无年份形态 (19|20)\\d{2}', '命中 0', JSON.stringify(dn), 'Task 12 R6③');
  chkEq('J13/count', dn.length, MANIFEST.counts.articles + MANIFEST.columns.length, '日期节点数 == 首页 3 + 各列表页条目数（R9③ 恒在场）', 'Task 12 R9');
  const exempt = IFACE.classes.filter((cl) => /(^|__)date$/.test(cl));
  const wholeWord = (text, w) => { const out = [], re = new RegExp('(?<![A-Za-z0-9_-])' + w + '(?![A-Za-z0-9_-])', 'g'); let m; while ((m = re.exec(text))) out.push(m.index); return out; };
  /* R6① 的禁令文本是"作为字段名出现在公开页面"，样式表不是页面；`-- 整词匹配 + 已注册类名豁免`口径照抄 _qa_task15 §4 */
  const fHits = [];
  for (const p of ALL_HTML_PAGES) { const text = src[p] || ''; for (const w of FM_FIELDS) for (const i of wholeWord(text, w)) {
    const ctx = text.slice(Math.max(0, i - 60), i);
    if (!exempt.some((cl) => ctx.includes(cl))) fHits.push(`${p}:${w}@${i} \u2026${text.slice(Math.max(0, i - 12), i + w.length + 14).replace(/\n/g, '\\n')}\u2026`);
  } }
  chk('J14', fHits.length === 0, `${FM_FIELDS.length} 个 front-matter 字段名在全部 ${ALL_HTML_PAGES.length} 张 HTML 页面内按整词命中 0（豁免已注册类名 ${exempt.join('/')}）`, '命中数 0', fHits.slice(0, 4).join(' | ') || '0', 'Task 12 R6①／Task 15 §4 口径');
  const cssColumnHits = [];
  for (const f of ['styles.css', 'script.js']) { const text = src[f] || ''; for (const i of wholeWord(text, 'column')) { const ctx = text.slice(Math.max(0, i - 40), i + 8); if (!/flex-direction\s*:\s*column/.test(ctx) && !/--[\w-]*column/.test(ctx)) cssColumnHits.push(f + '@' + i + ':' + ctx.replace(/\s+/g, ' ')); } }
  chk('J14/css-keyword', cssColumnHits.length === 0, 'styles.css 的整词 column 只允许出现在 flex-direction 关键字上下文（登记在册的说明项，不得被用来扩豁免面）', '全部为 CSS 关键字', cssColumnHits.join(' | ') || '见 _qa_task15 §4', 'Task 15 §4 说明项');
  chk('J14/scope-anchor', /作为\*\*字段名\*\*出现在公开页面/.test(J6) && /样式表不是页面|整词匹配/.test(read(path.join(ROOT, 'qa/_qa_task15', 'report.md'))), 'J14 辖域锚点在场：R6① 条文 + Task 15 §4 说明项', '两处锚点均可解析', '已解析', 'Task 12 R6①／Task 15 §4');
  const braces = [];
  for (const [f, text] of all) for (const t of ['{{', '}}']) { let i = text.indexOf(t); while (i >= 0) { braces.push(f + ':' + t + '@' + i); i = text.indexOf(t, i + 1); } }
  chk('J15', braces.length === 0, 'J15 模板槽位记号 {{／}} 扫全部 Results/ 交付文件（沿用 J8 全站口径，不降级为仅首页）', '命中数 0', braces.slice(0, 4).join(' | ') || '0', 'Task 12 R6⑤／勘误表 E3');
  const shellTxt = read(path.join(BUILD, 'shell.html'));
  chk('J15/shell-allowed', shellTxt.includes('{{') && shellTxt.includes('}}'), 'R6⑤ 的另一半：{{／}} 确实只允许存在于 build/shell.html', '槽位在 shell.html 在场', JSON.stringify([shellTxt.includes('{{'), shellTxt.includes('}}')]), 'Task 12 R6⑤');
  const cmtHits = [];
  for (const [f, text] of all) {
    for (const m of text.matchAll(/<!--([\s\S]*?)-->/g)) for (const w of FM_FIELDS) if (new RegExp('(^|[^A-Za-z0-9_-])' + w).test(m[1])) cmtHits.push(f + ':注释含 ' + w);
    if (new RegExp(ISO_FORM).test(text)) cmtHits.push(f + ':ISO 日期');
  }
  chk('J14b', cmtHits.length === 0, '注释与全文内不得出现字段名或 ISO 日期形态（含 styles.css／script.js）', '命中数 0', cmtHits.join(' | ') || '0', 'Task 12 R6①②');
  const yearHits = [];
  for (const [f, text] of all) { const re = new RegExp(YEAR_FORM, 'g'); let m; while ((m = re.exec(text))) yearHits.push(`${f}@${m.index}:${m[0]}`); }
  chk('J17', yearHits.length === 0, `年份形态 ${YEAR_FORM} 扫全部 Results/ 交付文件（含 styles.css 与 script.js），零豁免`, '命中 0', yearHits.join(' | ') || '0', 'Task 12 R6/R7/勘误表 E2');
  chkEq('J17/form', YEAR_FORM, '(19|20)\\d{2}', 'J17 扫描模式逐字符等于合同给出的年份形态', 'Task 12 R6');
  const exemptTok = backticked(EXEMPTSEG);
  chk('J17/exempt-scope', /只作用于日期节点/.test(EXEMPTSEG) && /仍判违规/.test(EXEMPTSEG) && /不做全站/.test(EXEMPTSEG), 'Task0 §误伤边界三条口径齐备：四位数字禁令只作用于日期节点、不做全站裸扫、但 CSS／JS 里的 19xx／20xx 仍判违规', '三条齐全', JSON.stringify([/只作用于日期节点/.test(EXEMPTSEG), /仍判违规/.test(EXEMPTSEG), /不做全站/.test(EXEMPTSEG)]), 'Task 0 §误伤边界／Task 12 勘误表 E2');
  chk('J17/anchor-e2', /E2/.test(T12) && /从未实现/.test(T12), '勘误表 E2 锚点在场：v1 从未实现 2024 豁免，本包是补上从未存在的年份扫描而非"取消豁免"', 'E2 已登记', '见 plan/Task12 五、勘误表', 'Task 12 勘误表 E2');
  chk('J17/nobare', !/new RegExp\(\s*[`'"][^`'"]{0,6}[0-9]-9[^\n]{0,10}\{4\}/.test(CODE_ONLY) && !/new RegExp\([^)]*\\\\d\{4\}[^)]*\)/.test(CODE_ONLY), '核验器代码不以裸 \\d{4} 做年份扫描（避免 #7a2424／0.9375rem 误报逼出豁免）', '唯一年份判据是 YEAR_FORM', '代码层自检通过', 'Task 12 R6/常见返工风险');
  const yrRe = () => new RegExp(YEAR_FORM, 'g');
  chk('J17/canary-2024', yrRe().test('报社成立于2024年。') && yrRe().test('2024-09-18'), '年份扫描的行为自证：重新引入 2024 必被命中，说明扫描里没有豁免分支', 'canary 命中', '命中=' + yrRe().test('报社成立于2024年。'), 'Task 12 勘误表 E2');
  chk('J17/canary-2026', yrRe().test('自然选择号2026年9月18日'), '行为自证：2026 同样被年份形态命中（J2 禁令继续有效且不依赖豁免表）', 'canary 命中', '命中=' + yrRe().test('自然选择号2026年9月18日'), 'Task 12 R7');
  chk('J17/canary-css', !yrRe().test('#7a2424; 0.9375rem; 1.0625rem;') && /[0-9]{4}/.test('#7a2424'), '行为自证：年份形态对 CSS 数值零误报，而裸 \\d{4} 会命中 #7a2424 —— 这正是 R6 禁用裸四位的理由，扫描器无需任何豁免', '年份形态不误报、裸四位误报', '年份命中=' + yrRe().test('#7a2424; 0.9375rem; 1.0625rem;') + ' 裸四位命中=' + /[0-9]{4}/.test('#7a2424'), 'Task 12 R6／常见返工风险');
  chk('J17/noexempt', !/YEAR_[E]XEMPT|year[E]xempt|skip[Y]ear|year[A]llow/.test(CODE_ONLY) && !/if\s*\([^)]*\b20[0-9]{2}\b[^)]*\)\s*(con[t]inue|retu[r]n)/.test(CODE_ONLY), '核验器代码（剥掉注释与字符串后）不含年份豁免表项或豁免跳转', '无命中', '无', 'Task 12 勘误表 E2');
  chk('J17/form-literal', exemptTok.length > 0 && YEAR_FORM === '(19|20)\\d{2}', 'J17 扫描模式逐字符等于合同给出的年份形态，且 §误伤边界 的豁免面非空（月日与正文数字按 R6 原样保留）', '(19|20)\\d{2}', YEAR_FORM + ' / 豁免条目 ' + exemptTok.length + ' 个', 'Task 12 R6');
  rec('J 说明', true, 'Results/', '', 'J1–J10 迁移 v1 语义（母本 verify_task10.mjs:640-651），J11–J17 为本包新增七条，共 18 条门禁；扫描范围为清单全部交付文件；"记者"仅出现在冻结正文，被禁的是"记者："前缀');
}

/* =============================================== L 组：保真链（三条腿取证） */
{
  const SL = path.join(ROOT, 'qa/_qa_task13', 'main_slices');
  const COLFILE = { M: 'news-message', F: 'news-feature', C: 'news-commentary' };
  /* R12：切片只覆盖迁移文。绑定几张就比几张，一张都不能悄悄少。 */
  const migPages = DETAILS.filter((p) => IS_MIG[p]);
  const sliceFiles = fs.readdirSync(SL).filter((x) => x.endsWith('.main-interior.html'));
  chk('L1/scope', migPages.length === sliceFiles.length && sliceFiles.length === Object.keys(COLFILE).length,
    'L1 字节腿覆盖的页数 == main_slices 切片数 == Task1 合同块数', `${sliceFiles.length} / ${Object.keys(SEQ).length}`,
    `迁移页 ${migPages.length}（${migPages.join(', ') || '无'}）；切片 ${sliceFiles.length}；未绑定合同块 ${Object.keys(SEQ).length - migPages.length}`, 'Task 12 R12');
  for (const p of migPages) {
    const k = IS_MIG[p], slice = path.join(SL, COLFILE[k] + '.main-interior.html');
    if (!fs.existsSync(slice)) { rec('L1/' + p, false, p, 'main_slices 切片在场', slice + ' 缺失', 'Task 13'); continue; }
    const want = read(slice), S = src[p] || '';
    const oi = S.indexOf('<main'), oe = S.indexOf('>', oi) + 1, ci = S.indexOf('  </main>');
    if (oi < 0 || oe <= 0 || ci < 0) { rec('L1/' + p, false, p + ' <main>', 'main 开合标签在场', '结构破坏：无法定位 <main> 内部（显式 FAIL，不抛异常）', 'Task 15'); continue; }
    const inner = S.slice(oe + 1, ci);
    chk('L1/' + p, inner === want, p + ' <main> 内部字节 == _qa_task13/main_slices/' + COLFILE[k] + '.main-interior.html', '逐字节相等（' + Buffer.byteLength(want) + ' 字节）', '首个差异@' + firstDiff(inner, want), 'Task 13/15');
    chkEq('L1b/' + p, Buffer.byteLength(inner), Buffer.byteLength(want), p + ' <main> 内部字节数 == 切片字节数', 'Task 13');
  }
  for (const p of DETAILS) {
    const info = ART_OF[p], pre = IS_MIG[p] || 'md', want = WANT[p], F = FACTS[p];
    if (!want) { rec('L2/' + p, false, p, '该页有可比较的权威文本（F0src 已记失败原因）', '在场', '缺失 md 事实', 'Task 18.6'); continue; }
    if (!F || !F.paragraphs) { rec('L2/' + p, false, p, 'DOM 段落事实在场', '缺失', 'Task 18.2'); continue; }
    const got = F.paragraphs.map((x) => x.text), bad = [];
    for (let i = 0; i < want.length; i++) if (got[i] !== want[i]) bad.push(pre + String(i + 1).padStart(2, '0') + ' 期望码点 ' + codes(want[i]).slice(0, 40) + ' 实际 ' + codes(got[i] === undefined ? '' : got[i]).slice(0, 40));
    chk('L2/' + p, got.length === want.length && bad.length === 0, p + ' 浏览器 DOM 逐段 textContent 码点相等（第二条腿，期望值来源 ' + WANTSRC[p] + '）', want.length + ' 段全等', bad.slice(0, 2).join(' | ') || '段数 ' + got.length, 'Task 15/R12');
    const dl = F.dateline || {};
    if (HAS_DL[p]) chkEq('L2b/' + p, dl.nextText == null ? null : dl.nextText.codePointAt(0), 0x20, p + ' DOM 层 strong.dateline 后紧邻 U+0020', 'Task 13');
    const d = (F.article || {}).date;
    if (HAS_DATE[p] && d) chkEq('L2c/' + p, d.text, MIG_END[p], p + ' DOM 层 article__date == 权威结尾行（迁移文取 Task1 closing_date）', 'Task 13/R12');
    chkEq('L2d/' + p, got.join('').length, want.join('').length, p + ' DOM 正文总字符数 == 权威文本总字符数', 'Task 13/R12');
  }
  for (const [k, list] of Object.entries(SEQ)) for (let i = 0; i < list.length; i++) {
    const key = k + ':' + k + String(i + 1).padStart(2, '0');
    chkEq('L3/' + key, CNT[key], list[i].length, 'Task1 §3 ' + key + ' 字符数与合同块自洽（第三条腿）', 'Task 1');
  }
  for (const key of ['M:title', 'M:byline', 'F:title', 'F:byline', 'C:title', 'C:byline', 'C:closing_date']) {
    const [pfx, nm] = key.split(':');
    chkEq('L3/' + key, CNT[key], (CONTRACT[pfx] || {})[nm] === undefined ? '<合同无此项>' : CONTRACT[pfx][nm].length, 'Task1 §3 ' + key + ' 长度基线与合同块逐字符自洽（第三条腿）', 'Task 1');
  }
  chkEq('L3/total', Object.keys(CNT).length, 63, 'Task1 §3 逐段基线覆盖 63 项（L3 组总数）', 'Task 1');
  const shellSrc = read(path.join(BUILD, 'shell.html'));
  const shellHead = shellSrc.slice(0, shellSrc.indexOf('<main'));
  const shellTail = shellSrc.slice(shellSrc.indexOf('</main>') + 7);
  const norm = (x) => String(x).replace(/(<title>)[\s\S]*?(<\/title>)/, '$1{{TITLE}}$2').replace(/\s+aria-current="page"/g, '');
  for (const p of HTML_PAGES) {
    const S = src[p] || '';
    chk('L4/head/' + p, norm(S.slice(0, S.indexOf('<main'))) === norm(shellHead), p + ' <main> 之前字节 == build/shell.html 装配结果（仅 TITLE 槽与 aria-current 两处差异）', '归一后逐字节相等', '首个差异@' + firstDiff(norm(S.slice(0, S.indexOf('<main'))), norm(shellHead)), 'Task 14 S2');
    chk('L4/tail/' + p, S.slice(S.indexOf('</main>') + 7) === shellTail, p + ' </main> 之后字节 == shell.html 尾部（逐字节，无归一）', '逐字节相等', JSON.stringify(S.slice(S.indexOf('</main>') + 7).slice(0, 24)), 'Task 14 S2');
  }
  chkEq('L4/count', HTML_PAGES.length + 1, MANIFEST.counts.html, 'L4 普通页集合 + 线上专用 404.html == counts.html（' + MANIFEST.counts.html + ' 张页）', 'Task 17／R13');
  const partial = path.join(BUILD, 'partials', 'home-intro.html');
  if (fs.existsSync(partial)) {
    const want = read(partial), S = src['index.html'] || '';
    chk('L5/home-intro', S.includes(want), 'index.html 首页引言区 == build/partials/home-intro.html（字节子串）', '在场且逐字节', S.includes(want) ? '在场' : '不在场', 'Task 14 S4');
    chk('L5/three-slots', SLOT_NAMES.every((k) => S.includes(HOME_TXT[k])) && !S.includes('{{') && !S.includes('}}'), 'index.html 三段字面量在场且无残留槽位记号', '三段逐字符 + 无 {{ 或 }}', SLOT_NAMES.filter((k) => !S.includes(HOME_TXT[k])).join(',') || '无', 'Task 14 S5');
    chkEq('L5/partial-bytes', String(readBuf(partial).length), String(Buffer.byteLength(want)), 'home-intro.html 字节数自洽', 'Task 14');
    const baseIndex = path.join(ROOT, 'qa/_qa_task13', 'baseline', 'index.html');
    if (fs.existsSync(baseIndex)) {
      const b = read(baseIndex);
      chk('L5/partial-from-baseline', b.includes(want), 'home-intro.html 是 _qa_task13/baseline/index.html 的字节子串（partial 来源合法）', '在场', b.includes(want) ? '在场' : '不在场', 'Task 13/14');
    }
  } else rec('L5/home-intro', false, partial, 'partial 在场', '缺失', 'Task 14');
}

/* ============================ Q 组：src_check.py 独立链（不得引用构建器） */
{
  const rc = runSrcCheck();
  let data = null;
  try { data = JSON.parse(read(SRC_JSON)); } catch (e) { data = null; }
  chk('Q0/rc', rc === 0, 'src_check.py 退出码 == 0（1 有 FAIL／2 崩溃或锚点缺失）', '0', String(rc), 'Task 13/14');
  chk('Q0/json', !!data, 'src_check.py 输出 JSON 可读', '在场', data ? '在场' : '缺失', 'Task 18.6');
  if (data) {
    const items = (data.checks && data.checks.items) || [];
    const seen = {};
    for (const it of items) {
      seen[it.id] = (seen[it.id] || 0) + 1;
      chk('Q/' + it.id + '#' + seen[it.id], it.ok === true, 'src_check ' + it.id + ' [' + it.obj + ']', '独立解析器判该条成立', it.detail, it.id.startsWith('Q8') ? 'Task 12 R11／Task 17' : it.id.startsWith('Q2') || it.id.startsWith('Q3') ? 'Task 13' : 'Task 13 内容源');
    }
    for (const g of ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8']) {
      const sub = items.filter((x) => x.id.indexOf(g + '/') === 0);
      chk(g + '/group', sub.length >= 3 && sub.every((x) => x.ok), g + ' 组内全部成立（' + sub.length + ' 条独立判据）', '全绿', sub.filter((x) => !x.ok).map((x) => x.id + '@' + x.obj).join(','), 'Task 13');
    }
    chkEq('Q0/item-count', items.length, data.fail_count !== undefined ? items.length : 0, 'src_check 判据条数自洽（' + items.length + ' 条，FAIL ' + data.fail_count + '）', 'Task 18.6');
    const PY = read(path.join(HERE, 'src_check.py'));
    const PY_CODE = PY.replace(/#[^\n]*/g, '').replace(/"""[\s\S]*?"""/g, '').replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""');
    chk('Q/independence', !/^\s*(?:import|from)\s+build\b/m.test(PY) && !/import\s+build\b/.test(PY_CODE) && !/from\s+build\b/.test(PY_CODE) && !/subprocess[\s\S]{0,60}build\.py/.test(PY_CODE) && !/build\.py/.test(PY_CODE) && !/pack\.py/.test(PY_CODE), 'src_check.py 的代码（剥注释后）不 import／调用构建器与打包器（两条链互不知情）', '无引用', '见代码层自检', 'Task 12 §给 Task 18／本包 §真值解析合同');
    chk('Q/no-results-read', !/['"]Results['"]/.test(PY_CODE) && !/Results\//.test(PY_CODE), 'src_check.py 不读 Results/（清单 vs 内容源的独立推导侧）', '不读交付目录', '见代码层自检', 'Task 18 §A1d');
    const top3 = (data.articles || []).filter((a) => LATEST.includes('article-' + a.stem + '.html'));
    chk('Q6/three-display-date', top3.length === 3 && top3.every((a) => a.fields && a.fields.display_date), '首页前 3 条均带用户声明的 display_date（R9③：白名单 14 项的前提；R12 后按全局序而非按篇数）', '3 条全带', top3.map((a) => (a.fields || {}).display_date).join(','), 'Task 12 R9');
    chkEq('Q6/derived-order', (data.derived_order || []).join('|'), (data.articles || []).map((a) => a.stem).sort((x, y) => {
      const ix = (data.derived_order || []).indexOf(x), iy = (data.derived_order || []).indexOf(y); return ix - iy;
    }).join('|'), '独立推导的四键全序与 src_check 报告一致（可复算）', 'Task 12 R11');
  }
}

/* ================================================ P 组：链接图（死链/孤儿） */
{
  const SKIP_HREF = '#main-content';
  const dead = [], illegal = [];
  let hrefTotal = 0;
  for (const p of HTML_PAGES) {
    const F = FACTS[p]; if (!F) continue;
    for (const h of F.hrefs || []) {
      hrefTotal++;
      const v = h.href || '';
      if (v === SKIP_HREF) continue;
      if (!PAGE_SET.includes(v)) dead.push(p + ':' + v);
      if (v.startsWith('/') || /^[A-Za-z]:/.test(v) || v.includes('\\') || v.includes('?') || v.includes('#') || v.includes('://') || v.includes('..')) illegal.push(p + ':' + v);
    }
    chk('P1/' + p, dead.filter((d) => d.startsWith(p + ':')).length === 0 && (F.hrefs || []).length > 0, p + ' 无死链：每个 href（除 ' + SKIP_HREF + '）的目标都在目录集合内，大小写逐字符', '目标集合 == Results/ 文件名集合', dead.filter((d) => d.startsWith(p + ':')).join(' | ') || 'href ' + (F.hrefs || []).length + ' 个', 'Task 15');
    chk('P3/' + p, illegal.filter((d) => d.startsWith(p + ':')).length === 0, p + ' 引用形态合法：无 / 开头、无盘符、无反斜杠、无查询串、无越界片段', '全部为同目录相对文件名', illegal.filter((d) => d.startsWith(p + ':')).join(' | '), 'Task 12（平铺而非子目录）');
  }
  chkEq('P1/total', hrefTotal, HTML_PAGES.length * 7 + MANIFEST.counts.articles + LATEST.length, '全站 href 总数 == 每页公共壳 7（skip 1 + 报头 1 + 导航 4 + 样式表 1）× 页数 + 每篇 1 条列表页入链 + 前 3 条各 1 条首页入链（R12：稿件多于 3 篇时旧文不再被首页引用）', 'Task 15');
  const inLinks = {};
  for (const p of HTML_PAGES) for (const h of (((FACTS[p] || {}).hrefs) || [])) if (h.inMain && h.href !== SKIP_HREF) (inLinks[h.href] = inLinks[h.href] || []).push(p);
  for (const c of MANIFEST.columns) for (const a of c.articles) {
    const lst = inLinks[a.page] || [];
    chk('P2/orphan/' + a.page, lst.includes(c.list), a.page + ' 被其栏目列表页 ' + c.list + ' 引用（非孤儿）', c.list, lst.join(',') || '无入链', 'Task 15');
    const home = lst.filter((x) => x === 'index.html').length;
    const wantHome = LATEST.includes(a.page) ? 1 : 0;
    chk('P2/home/' + a.page, home === wantHome, a.page + ' 是否被首页最新区引用（R11①：只有全局前 3 条上首页）', wantHome + ' 次', home + ' 次', 'Task 12 R11');
    chkEq('P2/inbound/' + a.page, lst.length, 1 + wantHome, a.page + ' 入链总数 == 栏目列表页 1 + 首页最新区（前 3 条才计）', 'Task 15/R12');
  }
  for (let i = 0; i < HTML_PAGES.length; i++) for (let j = 0; j < NAVWANT.length; j++) {
    const p = HTML_PAGES[i], F = FACTS[p] || {}, a = (F.navLinks || [])[j] || {};
    chk('P4/' + p + '/' + j, a.text === NAVWANT[j][0] && a.attrs && a.attrs.href === NAVWANT[j][1] && PAGE_SET.includes(NAVWANT[j][1]), '主导航路径 ' + p + ' → ' + NAVWANT[j][1], NAVWANT[j][0] + '→' + NAVWANT[j][1], (a.text || '?') + '→' + ((a.attrs || {}).href || '?'), 'Task 2/12');
  }
  chk('P1/srcset', !(src['script.js'] || '').match(/https?:\/\//) && HTML_PAGES.every((p) => !/srcset=/i.test(src[p] || '')), '无外部资源引用与 srcset', '0 个', '检查通过', 'Task 2/9');
}

/* ======================================= N 组：自行解压 deploy/site.zip */
{
  function readZip(buf) {
    let eocd = -1;
    for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i--) {
      if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('不是合法 zip（未找到 EOCD）');
    const count = buf.readUInt16LE(eocd + 10), cdSize = buf.readUInt32LE(eocd + 12), cdOff = buf.readUInt32LE(eocd + 16);
    const commentLen = buf.readUInt16LE(eocd + 20);
    const entries = [];
    let p = cdOff;
    for (let i = 0; i < count; i++) {
      if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('中央目录第 ' + i + ' 项签名不符');
      const verMade = buf.readUInt16LE(p + 4), method = buf.readUInt16LE(p + 10);
      const dosTime = buf.readUInt16LE(p + 12), dosDate = buf.readUInt16LE(p + 14);
      const comp = buf.readUInt32LE(p + 20), uncomp = buf.readUInt32LE(p + 24);
      const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), cmtLen = buf.readUInt16LE(p + 32);
      const extAttr = buf.readUInt32LE(p + 38), lho = buf.readUInt32LE(p + 42);
      const name = buf.slice(p + 46, p + 46 + nameLen).toString('utf8');
      let data = null;
      if (buf.readUInt32LE(lho) === 0x04034b50) {
        const ln = buf.readUInt16LE(lho + 26), le = buf.readUInt16LE(lho + 28);
        const start = lho + 30 + ln + le;
        const raw = buf.slice(start, start + comp);
        data = method === 0 ? raw : (method === 8 ? zlib.inflateRawSync(raw) : null);
      }
      entries.push({ name, method, comp, uncomp, data, createSystem: verMade >> 8, externalAttr: extAttr,
        date_time: [(dosDate >> 9) + 1980, (dosDate >> 5) & 15, dosDate & 31, dosTime >> 11, (dosTime >> 5) & 63, (dosTime & 31) * 2],
        extraLen, cmtLen });
      p += 46 + nameLen + extraLen + cmtLen;
    }
    return { entries, count, commentLen, cdSize, cdOff };
  }
  const zipPath = path.join(DEPLOY, 'site.zip');
  let z = null, err = '';
  try { z = readZip(readBuf(zipPath)); } catch (e) { err = String((e && e.message) || e); }
  chk('N0/readable', !!z, '本包自行解压 deploy/site.zip（不调 pack.py verify，避免自证）', 'zip 可解析', err || '解析成功', 'Task 17');
  if (z) {
    const names = z.entries.map((e) => e.name);
    const wantNames = sortedUniq(PAGE_SET.concat(MANIFEST.config.map((c) => c.path)));
    chkEq('N/entry-count', z.entries.length, MANIFEST.counts.pages + MANIFEST.counts.config, 'zip 文件条目数 == counts.pages + counts.config（' + (MANIFEST.counts.pages + MANIFEST.counts.config) + '）', 'Task 17 §manifest 契约 4');
    chkEq('N/set', names.slice().sort().join('|'), wantNames.join('|'), 'zip 条目集合 == manifest.pages \u222a manifest.config（双向）', 'Task 17');
    chk('N/order', names.join('|') === wantNames.join('|'), '条目顺序 == sorted(名)（_headers 因 _ 码位排第一）', wantNames.join('|'), names.join('|'), 'Task 17 打包合同 3');
    for (const e of z.entries) {
      const m = byPath[e.name] || MANIFEST.config.find((x) => x.path === e.name);
      const diskPath = e.name === '_headers' ? path.join(DEPLOY, '_headers') : path.join(RESULTS, e.name);
      const disk = fs.existsSync(diskPath) ? readBuf(diskPath) : null;
      chkEq('N/sha-manifest/' + e.name, e.data ? shaLo(e.data) : '<未解压>', m ? m.sha256.toLowerCase() : '<清单无此项>', e.name + ' 条目 SHA-256 == manifest 登记值', 'Task 17');
      chkEq('N/sha-disk/' + e.name, e.data && disk ? shaLo(e.data) : '<缺失>', disk ? shaLo(disk) : '<磁盘缺失>', e.name + ' 条目 SHA-256 == 磁盘源文件', 'Task 17');
      chkEq('N/bytes/' + e.name, String(e.uncomp), String(m ? m.bytes : '<清单无此项>'), e.name + ' 条目 uncompressedSize == manifest.bytes（清单承诺了字节数，回验必须核它）', 'Task 17 §manifest 契约 1');
      chkEq('N/bytes-disk/' + e.name, String(e.data ? e.data.length : '<未解压>'), String(disk ? disk.length : '<磁盘缺失>'), e.name + ' 条目实解字节数 == 磁盘源文件字节数', 'Task 17 打包合同 6b');
      chk('N/method/' + e.name, e.method === 8, e.name + ' 条目压缩方法 == ZIP_DEFLATED(8)', '8', String(e.method), 'Task 17 打包合同 3');
    }
    chk('N/headers', names.includes('_headers'), '_headers 在 zip 内在场（只进 zip，绝不进 Results/）', '在场', names.filter((n) => n === '_headers').length + ' 次', 'Task 17 打包合同 4');
    chk('N/headers-not-in-results', !fs.readdirSync(RESULTS).includes('_headers'), 'Results/ 内不得存在 _headers', '不在场', '在场/不在场核对', 'Task 17 打包合同 4');
    const withSep = names.filter((n) => n.includes('/') || n.includes('\\'));
    chk('N/no-sep', withSep.length === 0, '0 个条目名含路径分隔符（全部位于压缩包根）', '0 个', withSep.join(','), 'Task 17 打包合同 3');
    const dirEntries = z.entries.filter((e) => /\/$/.test(e.name) || (e.externalAttr & 0x10) && e.comp === 0 && /\/$/.test(e.name));
    chkEq('N/no-dir-entries', dirEntries.length, 0, '0 个目录条目（Results/ 这类零字节条目一律视为缺陷）', 'Task 17 打包合同 3');
    const banned = names.filter((n) => /manifest\.json|UPLOAD\.md|\.txt$|__pycache__/.test(n));
    chk('N/no-banned', banned.length === 0, 'zip 内无 manifest.json／UPLOAD.md／.txt／__pycache__', '0 个', banned.join(','), 'Task 17 打包合同 4');
    chk('N/datetime', z.entries.every((e) => e.date_time.join(':') === '1980:1:1:0:0:0'), '每个条目 date_time == 固定常量 (1980,1,1,0,0,0)（可复现性的字节层前提）', '(1980,1,1,0,0,0)', z.entries.map((e) => e.name + '=' + e.date_time.join(':')).slice(0, 3).join(' | '), 'Task 17 打包合同 5');
    chk('N/no-extra-comment', z.entries.every((e) => e.extraLen === 0 && e.cmtLen === 0) && z.commentLen === 0, '无 zip comment 与条目 extra field', '全部为 0', z.entries.map((e) => e.name + '=' + e.extraLen + '/' + e.cmtLen).slice(0, 3).join(' | '), 'Task 17 打包合同 5');
    chk('N/uniform-meta', sortedUniq(z.entries.map((e) => String(e.createSystem))).length === 1 && sortedUniq(z.entries.map((e) => String(e.externalAttr))).length === 1, 'create_system 与 external_attr 全站统一', '各 1 种取值', z.entries.map((e) => e.createSystem + '/' + e.externalAttr).slice(0, 3).join(' | '), 'Task 17 打包合同 5');
  chkEq('N/counts-html', ALL_HTML_PAGES.length, MANIFEST.counts.html, '站点 HTML 页数 == manifest.counts.html（三数字分开核对，含线上专用 404）', 'Task 17 §manifest 契约 4／R13');
    const t17 = path.join(ROOT, 'qa/_qa_task17', 'report.md');
    let reproOk = false, reproDetail = '未找到记录';
    if (fs.existsSync(t17)) {
      const txt = read(t17);
      /* R12：哈希锚点换成 pack.py 自己生成的 deploy/UPLOAD.md。
         _qa_task17/report.md 里那行哈希是手写的一次性快照，每次重新打包都会过期；
         而 UPLOAD.md 与 zip 出自同一次 pack，两者不符才真正说明"打包之后交付面又漂了"。 */
      const row = (read(path.join(DEPLOY, 'UPLOAD.md')).match(/SHA-256[：:]\s*`([0-9a-f]{64})`/) || [])[1];
      const claim = /可复现[^\n]*|连续[三二]次[^\n]*/.exec(txt);
      const nowSha = shaLo(readBuf(zipPath));
      reproOk = !!row && !!claim && row === nowSha;
      reproDetail = 'UPLOAD.md 登记 site.zip = ' + String(row).slice(0, 20) + '；当前实测 = ' + nowSha.slice(0, 20) + '；Task 17 复现性结论：' + (claim ? claim[0].slice(0, 40) : '未找到');
      chkEq('N/zip-sha-recorded', row || '<无>', nowSha, 'deploy/site.zip 当前哈希 == pack.py 在 UPLOAD.md 登记的哈希（打包之后交付面未再漂移）', 'Task 17 交接／R12');
    }
    chk('N/repro-task17', reproOk, '两次／三次重打包字节相等由 Task 17 用全新子进程实测登记（本包只读，不重打包，也不调 pack.py verify 自证）', 'qa/_qa_task17/report.md 内有可复现结论且 zip 未漂移', reproDetail, 'Task 17 交接');
    chk('N/zip-bytes', readBuf(zipPath).length > 0, 'deploy/site.zip 可读且非空', '非空', String(readBuf(zipPath).length) + ' 字节', 'Task 17');
  }
}

/* ============================== 只读证明（18.7）与 SELF-SHA／D4 复核 */
{
  const afterHashes = Object.fromEntries(HASHED_DIRS.map(([n, d]) => [n, dirHash(d)]));
  for (const [n, d] of HASHED_DIRS) {
    const a = beforeHashes[n], b = afterHashes[n];
    const diff = [];
    for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) diff.push('行' + i + ': ' + (a[i] || '<无>') + ' → ' + (b[i] || '<无>'));
    chk('R0/' + n, diff.length === 0, d + ' 核验前后哈希清单逐项相等（只读证明）', a.length + ' 条目全等', diff.slice(0, 3).join(' | ') || '相等', 'Task 18.7（闸门自身越权）');
  }
  const resFiles = fs.readdirSync(RESULTS);
  chkEq('R0/no-new-file', resFiles.length, PAGE_SET.length, 'Results/ 内文件集仍与清单相等（' + PAGE_SET.length + ' 个交付文件）', 'Task 18.7／R13');
  const mtBad = [];
  for (const [n, d] of HASHED_DIRS) { const walk3 = (dd, rel) => { for (const e of fs.readdirSync(dd, { withFileTypes: true })) { const p = path.join(dd, e.name), r = rel ? rel + '/' + e.name : e.name; if (e.isDirectory()) walk3(p, r); else if (beforeMt[r] !== fs.statSync(p).mtimeMs) mtBad.push(r); } }; walk3(d, n); }
  chk('R0/mtime', mtBad.length === 0, '五处目录内无任何文件 mtime 变化（核验器与被测对象都未被触碰）', '全部与核验前一致', mtBad.slice(0, 4).join(',') || '无', 'Task 18.7');
  rec('R0/self-sha', true, '闸门自身', '', 'verify_task18=' + SELF_SHA.verify.slice(0, 16) + ' probe_task18=' + SELF_SHA.probe.slice(0, 16) + ' probe_lib18=' + SELF_SHA.probeLib.slice(0, 16) + ' src_check=' + SELF_SHA.srcCheck.slice(0, 16));
  rec('R0/env', true, '运行环境', '', 'node ' + process.version + '；python 版本由变异台与报告登记');
  const gateInside = resFiles.filter((f) => /task18|verify|qa/.test(f));
  chk('R0/gate-not-in-results', gateInside.length === 0, '闸门不进 Results/（产物全在 _qa_task18/）', '0 个', gateInside.join(','), 'Task 18 §变更边界');
  chkEq('R0/facts-not-in-results', resFiles.filter((f) => /\.json$/.test(f)).length, 0, '快照文件不写进 Results/（也不复用 _qa_task10/dom_facts.json）', 'Task 18 §明确不做');
}

/* ============================================================ 报告与退出 */
function groupCount() {
  const g = {};
  for (const r of rows) {
    const m = r.id.match(/^(A|B|C|D|E|F|G|H|I|J|K|L|M|N|P|Q|R0)/);
    const key = m ? m[1] : 'other';
    g[key] = g[key] || { total: 0, PASS: 0, FAIL: 0, PENDING: 0 };
    g[key].total++; g[key][r.st]++;
  }
  return g;
}
function dump() {
  const fails = rows.filter((r) => r.st === 'FAIL'), pend = rows.filter((r) => r.st === 'PENDING');
  const g = groupCount();
  const out = [];
  out.push('# Task 18 全站只读核验闸门报告（核验器机器输出）');
  out.push('');
  out.push(`- 核验时间：${new Date().toISOString()}`);
  out.push(`- 被核验目录：${RESULTS}（"页"=${ALL_HTML_PAGES.length} 张 HTML，含线上专用 404；普通离线页=${HTML_PAGES.length}，"文件"=${PAGE_SET.length} 个交付文件）`);
  out.push(`- 真值锚点：plan/Task1（素材哈希／逐段合同／§3 字符数）、plan/Task4（三段字面量／§DOM 结构验证／§可见内容白名单）、plan/Task0（§稳定接口总清单／§全局禁止项清单／§归档层新增禁项）、plan/Task12（R2 六壳与命名正则／§排序全序）、plan/Task13+Task12（Q 组字段表与格式合同）、deploy/manifest.json、content/、_qa_task13/{baseline,main_slices}、build/{shell.html,partials/home-intro.html}`);
  out.push(`- DOM 事实：${FACTS_FILE}（__meta.generatedBy=${META && META.generatedBy}，逐页 sha256 绑定；M 组最先跑）`);
  out.push(`- 快照一致性（M）：${SNAPSHOT_STALE ? '未通过 —— 依阻断规则三，本轮任何"全绿"结论无效' : '已通过，其余组结论可用'}`);
  out.push(`- 断言总数：${rows.length}　PASS：${rows.length - fails.length - pend.length}　FAIL：${fails.length}　PENDING：${pend.length}`);
  out.push('');
  out.push('## 分组计数');
  out.push('');
  out.push('| 组 | 条数 | PASS | FAIL | PENDING |');
  out.push('| --- | --- | --- | --- | --- |');
  for (const k of Object.keys(g).sort()) out.push(`| ${k} | ${g[k].total} | ${g[k].PASS} | ${g[k].FAIL} | ${g[k].PENDING} |`);
  out.push('');
  out.push('```text');
  for (const r of rows) out.push(`[${r.id}] ${r.st} ${r.loc}${r.st === 'FAIL' ? ' — 期望: ' + r.exp + ' — 实际: ' + r.act + ' — 移交: ' + r.handoff : (r.exp || r.act ? ' — ' + (r.act || r.exp) : '')}`);
  out.push('```');
  out.push('');
  if (fails.length) {
    out.push('## 失败项与移交清单');
    out.push('');
    out.push('| 断言 | 文件/定位 | 期望 | 实际 | 移交 |');
    out.push('| --- | --- | --- | --- | --- |');
    for (const r of fails) out.push(`| ${r.id} | ${r.loc} | ${r.exp.replace(/\|/g, '\\|')} | ${r.act.replace(/\|/g, '\\|')} | ${r.handoff} |`);
    out.push('');
  }
  out.push('## 闸门自身状态（D1–D5）');
  out.push('');
  out.push(`- SELF-SHA verify_task18.mjs = \`${SELF_SHA.verify}\``);
  out.push(`- SELF-SHA probe_task18.mjs = \`${SELF_SHA.probe}\``);
  out.push(`- SELF-SHA probe_lib18.mjs = \`${SELF_SHA.probeLib}\``);
  out.push(`- SELF-SHA src_check.py = \`${SELF_SHA.srcCheck}\``);
  out.push(`- D1 快照绑定：M1–M5 共 ${rows.filter((r) => /^M[1-5]/.test(r.id)).length} 条，快照过期即整组 FAIL（不使用旧值、不静默重探）`);
  out.push(`- D2 锚点解析：页集合/栏目/段落数/宿主/白名单/年份形态全部解析，无写死常量`);
  out.push(`- D3 崩溃处理：区块缺失记 FAIL；崩溃由 uncaughtException 记为一条 FAIL 并退出 1`);
  out.push(`- 只读证明：五处目录哈希前后逐项相等（R0/${'Results'} 等 ${Object.keys(g).includes('R0') ? HASHED_DIRS.length : HASHED_DIRS.length} 条）`);
  out.push('');
  fs.writeFileSync(REPORT, out.join('\n') + '\n', 'utf8');
  process.stdout.write(`总计 ${rows.length} 条：PASS ${rows.length - fails.length - pend.length} / FAIL ${fails.length} / PENDING ${pend.length}\n`);
  if (fails.length) process.stdout.write('FAIL 清单：' + fails.map((f) => f.id).join(', ') + '\n');
  process.stdout.write('报告：' + REPORT + '\n');
  return fails.length + pend.length;
}
process.on('uncaughtException', (e) => {
  rec('GATE-CRASH', false, 'verify_task18.mjs（结构破坏使断言不可判定）', '所有断言可判定', String((e && (e.stack || e.message)) || e).slice(0, 300), '对应上游任务；崩溃本身计为一条 FAIL（D3）');
  try { process.exitCode = dump() ? 1 : 1; } catch (e2) { process.exitCode = 2; }
});
try {
  process.exitCode = dump() ? 1 : 0;
} catch (e) {
  process.stderr.write('报告写入失败：' + String((e && e.message) || e) + '\n');
  process.exitCode = 2;
}
if (SNAPSHOT_STALE) {
  process.exitCode = 1;
  process.stderr.write('阻断规则三：M 组未通过（快照过期或绑定断裂），本轮"全绿"结论无效。\n');
}
