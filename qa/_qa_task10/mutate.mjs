/* Task 10 验收自校验（变异对照）：把违约注入 Results/ 的副本，确认对应断言真的判 FAIL。
 * 目的：证明 284 条断言全绿不是空跑。真实 Results/ 与 Materials/ 全程只读，不受影响。
 * 用法：node mutate.mjs [名称过滤]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openBrowser } from './probe_lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const RESULTS = path.join(ROOT, 'Results');
const MATERIALS = path.join(ROOT, 'Materials');
const MUT = path.join(HERE, 'mutants');
const PORT = Number(process.env.QODER_CDP_PORT || 9345);
const FILTER = process.argv[2];

const rd = (p) => fs.readFileSync(p, 'utf8');
const wr = (p, s) => fs.writeFileSync(p, s, 'utf8');

/* 每个变异：注入一处违约；expect = 必须翻红的断言编号前缀；kind=html 需重新采集 DOM 快照 */
const MUTANTS = [
  { n: 'charset', k: 'html', f: 'index.html', e: ['C2/'], edit: (t) => t.replace(/\n\s*<meta charset="utf-8">/, '') },
  { n: 'title-sep', k: 'html', f: 'news-feature.html', e: ['C3/'], edit: (t) => t.replace('从数学题到AI时代的学习｜自然选择号', '从数学题到AI时代的学习|自然选择号') },
  { n: 'css-ref-query', k: 'html', f: 'news-message.html', e: ['C4/'], edit: (t) => t.replace('href="styles.css"', 'href="styles.css?v=1"') },
  { n: 'inline-script', k: 'html', f: 'news-commentary.html', e: ['C4/', 'K1/'], edit: (t) => t.replace('</head>', '  <style>body{color:red}</style>\n</head>') },
  { n: 'skip-text', k: 'html', f: 'index.html', e: ['C5/'], edit: (t) => t.replace('跳至正文', '跳到正文') },
  { n: 'expanded-true', k: 'html', f: 'news-commentary.html', e: ['C7/news-commentary.html/expanded-src'], edit: (t) => t.replace('aria-expanded=\"false\"', 'aria-expanded=\"true\"') },
  { n: 'icon-no-hidden', k: 'html', f: 'news-message.html', e: ['C7/'], edit: (t) => t.replace('<span class="nav-toggle__icon" aria-hidden="true"></span>', '<span class="nav-toggle__icon"></span>') },
  { n: 'nav-hidden', k: 'html', f: 'news-feature.html', e: ['C8/'], edit: (t) => t.replace('<nav class="site-navigation"', '<nav hidden class="site-navigation"') },
  { n: 'main-tabindex', k: 'html', f: 'index.html', e: ['C9/'], edit: (t) => t.replace('tabindex="-1"', 'tabindex="0"') },
  { n: 'dup-id', k: 'html', f: 'news-commentary.html', e: ['C10/'], edit: (t) => t.replace('<a class="skip-link"', '<a id="site-navigation" class="skip-link"') },
  { n: 'nav-order', k: 'html', f: 'news-message.html', e: ['D1/'], edit: (t) => t.replace('href=\"index.html\">首页', 'href=\"news-message.html\">首页').replace('href=\"news-message.html\" aria-current=\"page\">新闻消息', 'href=\"index.html\" aria-current=\"page\">新闻消息') },
  { n: 'nav-abs-path', k: 'html', f: 'news-feature.html', e: ['D2', 'D1/'], edit: (t) => t.replace('href=\"news-commentary.html\">新闻评论', 'href=\"./sub/news-commentary.html\">新闻评论') },
  { n: 'current-on-li', k: 'html', f: 'news-message.html', e: ['D3/', 'D4/'], edit: (t) => t.replace('<a class=\"site-navigation__link\" href=\"news-message.html\" aria-current=\"page\">', '<a class=\"site-navigation__link\" href=\"news-message.html\">').replace('<li class=\"site-navigation__item\">\n            <a class=\"site-navigation__link\" href=\"news-message.html\">', '<li class=\"site-navigation__item\" aria-current=\"page\">\n            <a class=\"site-navigation__link\" href=\"news-message.html\">') },
  { n: 'home-swap', k: 'html', f: 'index.html', e: ['E2/order'], edit: (t) => t.replace('>主要工作与报道方向</h2>', '>成立时间T</h2>').replace('id=\"founded-title\">成立时间', 'id=\"founded-title\">主要工作与报道方向').replace('>成立时间T<', '>成立时间<') },
  { n: 'home-text-year', k: 'html', f: 'index.html', e: ['E6/P_FOUNDED'], edit: (t) => t.replace('报社成立于2024年。', '报社成立于2025年。') },
  { n: 'home-text-space', k: 'html', f: 'index.html', e: ['E6/P_FOUNDED'], edit: (t) => t.replace('报社成立于2024年。', '报社成立于 2024 年。') },
  { n: 'home-slot', k: 'html', f: 'index.html', e: ['E7', 'J4'], edit: (t) => t.replace('我们主要记录一些自己觉得有价值的东西。', 'P_WORK') },
  { n: 'home-extra-p', k: 'html', f: 'index.html', e: ['E8'], edit: (t) => t.replace('    </div>\n  </main>', '    </div>\n    <p>本报由学生自主运营。</p>\n  </main>') },
  { n: 'home-drop-h2', k: 'html', f: 'index.html', e: ['E3', 'E4', 'E5'], edit: (t) => t.replace('<h2 class="home-section__title" id="work-title">主要工作与报道方向</h2>', '') },
  { n: 'msg-char', k: 'html', f: 'news-message.html', e: ['F7/news-message.html'], edit: (t) => t.replace('工作正在进行中。', '工作正在进行中.') },
  { n: 'msg-truncate', k: 'html', f: 'news-message.html', e: ['F7/news-message.html', 'F7/news-message.html/chars'], edit: (t) => t.replace('共有47个社团供学生选择。', '共有47个社团供学生选择') },
  { n: 'feat-merge', k: 'html', f: 'news-feature.html', e: ['F6/', 'F7/'], edit: (t) => t.replace('过程。</p>\n        <p>对于学生来说', '过程。对于学生来说') },
  { n: 'dateline-2sp', k: 'html', f: 'news-message.html', e: ['F8/', 'F11'], edit: (t) => t.replace('7时电</strong> 我校', '7时电</strong>  我校') },
  { n: 'dateline-nbsp', k: 'html', f: 'news-feature.html', e: ['F8/'], edit: (t) => t.replace('9月17日电</strong> 上午', '9月17日电</strong>&nbsp;上午') },
  { n: 'dateline-nowrap', k: 'html', f: 'news-feature.html', e: ['F8/', 'F10/'], edit: (t) => t.replace('<strong class="dateline">自然选择号9月17日电</strong>', '自然选择号9月17日电') },
  { n: 'comm-date-into-body', k: 'html', f: 'news-commentary.html', e: ['F1/', 'F9/'], edit: (t) => { const m = t.match(/\n\s*<p class="article__date">（自然选择号9月18日）<\/p>/)[0]; return t.replace(m, '').replace('</p>\n  </div>', '</p>' + m + '\n  </div>'); } },
  { n: 'comm-date-year', k: 'html', f: 'news-commentary.html', e: ['F9/', 'J2'], edit: (t) => t.replace('（自然选择号9月18日）', '（自然选择号2026年9月18日）') },
  { n: 'comm-exe-nodot', k: 'html', f: 'news-commentary.html', e: ['G3'], edit: (t) => t.replace('熟悉的“.exe”文件', '熟悉的“exe”文件') },
  { n: 'comm-space-in-word', k: 'html', f: 'news-commentary.html', e: ['G3'], edit: (t) => t.replace('统一安装', '统一安 装') },
  { n: 'comm-blank-line', k: 'html', f: 'news-commentary.html', e: ['F6/', 'F7/', 'F11'], edit: (t) => t.replace('</p>\n        <p>老师当然应该学习', '</p>\n        <p> </p>\n        <p>老师当然应该学习') },
  { n: 'feat-ai-case', k: 'html', f: 'news-feature.html', e: ['G2'], edit: (t) => t.replace('随着生成式人工智能逐渐进入学习生活，学生面对问题时又多了一种选择——向AI提问。', '随着生成式人工智能逐渐进入学习生活，学生面对问题时又多了一种选择——向Ai提问。') },
  { n: 'feat-pronoun', k: 'html', f: 'news-feature.html', e: ['F7/', 'G2/pron'], edit: (t) => t.replace('在她看来，认真完成', '在他看来，认真完成') },
  { n: 'byline-author', k: 'html', f: 'news-message.html', e: ['F5/', 'J7'], edit: (t) => t.replace('<p class="article__byline">蓝色空间</p>', '<p class="article__byline">作者：蓝色空间</p>') },
  { n: 'source-name', k: 'html', f: 'news-commentary.html', e: ['J3', 'F3/'], edit: (t) => t.replace('新系统的学习成本还体现在界面上。', '新系统的学习成本还体现在界面上。（原载新闻评价）') },
  { n: 'hash-leak', k: 'html', f: 'news-message.html', e: ['J6'], edit: (t) => t.replace('目前，校本课程志愿填报工作正在进行中。', '目前，校本课程志愿填报工作正在进行中。DE10B575399E0563') },
  { n: 'extra-file', k: 'static', f: null, e: ['A1', 'A2'], edit: null, extra: (d) => wr(path.join(d, 'index.backup.html'), rd(path.join(RESULTS, 'index.html'))) },
  { n: 'subdir', k: 'static', f: null, e: ['A2'], edit: null, extra: (d) => { fs.mkdirSync(path.join(d, 'shots'), { recursive: true }); wr(path.join(d, 'shots', 'a.png'), 'x'); } },
  { n: 'materials-tamper', k: 'materials', f: null, e: ['B2'], edit: null },
  { n: 'nav-item-missing', k: 'html', f: 'index.html', e: ['C8/', 'D1/', 'D2'], edit: (t) => t.replace(/\s*<li class="site-navigation__item">\s*<a class="site-navigation__link" href="news-commentary.html">[^<]*<\/a>\s*<\/li>/, '') },
  { n: 'para-reorder', k: 'html', f: 'news-feature.html', e: ['F7/'], edit: (t) => { const A = '<p>李老师认为，教师有实际教学过程中积累起来的经验，而AI没有教师这样的教学经验。对于教师来说，AI可以成为提高效率的助手；而对于学生，AI能够发挥作用的场景则更加广泛。'; const B = '<p>不过，他并不赞成让AI直接代替学生完成学习任务。'; const i = t.indexOf(A), j = t.indexOf(B, i); if (i < 0 || j < 0) return t; const ie = t.indexOf('</p>', i), je = t.indexOf('</p>', j); const PA = t.slice(i, ie), PB = t.slice(j, je); return t.slice(0, i) + PB + t.slice(ie, j) + PA + t.slice(je); } },
  { n: 'home-lab-unresolved', k: 'html', f: 'index.html', e: ['E4/labelledby'], edit: (t) => t.replace('aria-labelledby="origin-title"', 'aria-labelledby="origin-x"') },
  { n: 'css-important', k: 'static', f: 'styles.css', e: ['H5/important'], edit: (t) => t.replace('font-family: var(--font-serif);', 'font-family: var(--font-serif) !important;') },
  { n: 'css-id-selector', k: 'static', f: 'styles.css', e: ['H5/id'], edit: (t) => t + '\n#main-content { letter-spacing: 1px; }\n' },
  { n: 'css-shadow', k: 'static', f: 'styles.css', e: ['H7'], edit: (t) => t + '\n.article { box-shadow: 0 2px 4px #000; }\n' },
  { n: 'css-radius', k: 'static', f: 'styles.css', e: ['H7'], edit: (t) => t + '\n.home-section { border-radius: 8px; }\n' },
  { n: 'css-external', k: 'static', f: 'styles.css', e: ['H2'], edit: (t) => t + '\n.site-masthead { background-image: url("https://x/y.png"); }\n' },
  { n: 'css-wrong-breakpoint', k: 'static', f: 'styles.css', e: ['H8'], edit: (t) => t.replace('@media (max-width: 768px)', '@media (max-width: 767px)') },
  { n: 'css-second-media', k: 'static', f: 'styles.css', e: ['H8'], edit: (t) => t + '\n@media (max-width: 900px) { .site-masthead { font-size: 3rem; } }\n' },
  { n: 'css-mobile-100vw', k: 'static', f: 'styles.css', e: ['H9'], edit: (t) => t.replace('  .home-sections {\n    max-width: 100%;', '  .home-sections {\n    width: 100vw;\n    max-width: 100%;') },
  { n: 'css-content-inject', k: 'static', f: 'styles.css', e: ['H10'], edit: (t) => t + '\n.article__byline::before { content: "作者："; }\n' },
  { n: 'css-new-class', k: 'static', f: 'styles.css', e: ['H11'], edit: (t) => t + '\n.commentary-note { color: red; }\n' },
  { n: 'css-unbalanced', k: 'static', f: 'styles.css', e: ['H12'], edit: (t) => t.replace(/\}\s*$/, '') },
  { n: 'css-var-drift', k: 'static', f: 'styles.css', e: ['H4'], edit: (t) => t.replace('--reading-max: 46rem;', '--reading-max: 48rem;') },
  { n: 'js-console', k: 'static', f: 'script.js', e: ['I3'], edit: (t) => t.replace("'use strict';", "'use strict';\n  console.log('nav');") },
  { n: 'js-breakpoint-rem', k: 'static', f: 'script.js', e: ['I4'], edit: (t) => t.replace("'(min-width: 769px)'", "'(min-width: 48rem)'") },
  { n: 'js-innerwidth', k: 'static', f: 'script.js', e: ['I4'], edit: (t) => t.replace('function isOpen() {', 'function isOpen() {\n    void window.innerWidth;') },
  { n: 'js-outside-click', k: 'static', f: 'script.js', e: ['I9'], edit: (t) => t.replace('})();', "  document.addEventListener('click', function (e) { if (!navigation.contains(e.target)) closeMenu(); });\n})();") },
  { n: 'js-extra-state', k: 'static', f: 'script.js', e: ['I5'], edit: (t) => t.replace('function isOpen() {', "function isOpen() {\n    document.querySelector('.skip-link').setAttribute('aria-hidden', 'true');") },
  { n: 'js-remote', k: 'static', f: 'script.js', e: ['I2'], edit: (t) => t.replace('})();', "  void fetch('https://cdn.example/x.js');\n})();") },
  { n: 'js-early-nojs', k: 'static', f: 'script.js', e: ['I7'], edit: (t) => t.replace("  root.classList.remove('no-js');\n  root.classList.add('js');\n", '').replace('})();', "  root.classList.remove('no-js');\n  root.classList.add('js');\n})();") },
  { n: 'js-internal-ids', k: 'static', f: 'script.js', e: ['I8'], edit: (t) => t.replace('})();', '  /* 覆盖 C05 与 F01 段 */\n})();') },
];

function copyResults(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(RESULTS)) fs.copyFileSync(path.join(RESULTS, f), path.join(dir, f));
}

const results = [];
const needProbe = MUTANTS.filter((m) => (FILTER ? m.n.includes(FILTER) : m.k === 'html'));
const browser = needProbe.length ? await openBrowser(PORT) : null;
let probeIdx = 0;

for (const mu of MUTANTS) {
  if (FILTER && !mu.n.includes(FILTER)) continue;
  const dir = path.join(MUT, mu.n);
  let matsDir = null;
  if (mu.k === 'materials') {
    matsDir = path.join(MUT, mu.n + '__materials');
    fs.rmSync(matsDir, { recursive: true, force: true });
    fs.mkdirSync(matsDir, { recursive: true });
    for (const f of fs.readdirSync(MATERIALS)) fs.copyFileSync(path.join(MATERIALS, f), path.join(matsDir, f));
    const victim = path.join(matsDir, '新闻通讯.docx');
    const b = fs.readFileSync(victim);
    b[b.length - 20] = b[b.length - 20] ^ 0x01;
    fs.writeFileSync(victim, b);
    copyResults(dir);
  } else {
    copyResults(dir);
    if (mu.extra) mu.extra(dir);
    else if (mu.edit) {
      const p = path.join(dir, mu.f);
      const before = rd(p);
      const after = mu.edit(before);
      if (after === before) { results.push({ n: mu.n, bad: '变异未生效（源串未命中）' }); continue; }
      wr(p, after);
    }
  }
  let factsFile = path.join(HERE, 'dom_facts.json');
  if (mu.k === 'html') {
    factsFile = path.join(MUT, `facts_${mu.n}.json`);
    const facts = await browser.snapshot(dir);
    fs.writeFileSync(factsFile, JSON.stringify(facts, null, 1), 'utf8');
    probeIdx++;
  }
  const rep = path.join(MUT, `report_${mu.n}.md`);
  const r = spawnSync(process.execPath, [path.join(HERE, 'verify_task10.mjs')], {
    encoding: 'utf8',
    env: { ...process.env, QODER_RESULTS_DIR: dir, QODER_FACTS: factsFile, QODER_REPORT: rep, QODER_MATERIALS_DIR: matsDir || MATERIALS },
  });
  const out = (r.stdout || '') + (r.stderr || '');
  const failIds = [...out.matchAll(/^\[([^\]]+)\] FAIL/gm)].map((m) => m[1]);
  const crashed = /核验器异常|SyntaxError|TypeError/.test(out);
  const hit = mu.e.filter((pre) => failIds.some((f) => f === pre || f.startsWith(pre)));
  const missed = mu.e.filter((pre) => !hit.includes(pre));
  results.push({ n: mu.n, rc: r.status, crashed, failCount: failIds.length, hit, missed, bad: (hit.length === 0 ? '未捕获' : '') + (crashed ? ' 崩溃' : '') });
  process.stderr.write(`  ${mu.n}: ${hit.length === 0 && !crashed ? 'MISSED' : 'captured'} (${failIds.length} FAIL) ${missed.length ? '漏: ' + missed.join(',') : ''}\n`);
}
if (browser) browser.close();

const bad = results.filter((x) => x.bad);
const lines = [];
lines.push('# Task 10 核验器变异对照（证明断言非空跑）');
lines.push('');
lines.push(`| 变异 | 注入的违约 | 期望翻红 | 实际 | 结论 |`);
lines.push('| --- | --- | --- | --- | --- |');
for (const x of results) {
  const mu = MUTANTS.find((m) => m.n === x.n);
  lines.push(`| ${x.n} | ${mu && mu.f ? mu.f : mu ? mu.k : ''} | ${(mu ? mu.e : []).join(', ')} | ${x.crashed ? '崩溃' : (x.hit || []).join(', ') || '无'}（共 ${x.failCount} 项 FAIL） | ${x.n === undefined ? '' : (x.bad ? '**未捕获**' : '捕获')} |`);
}
lines.push('');
lines.push(`- 变异体总数：${results.length}　捕获：${results.length - bad.length}　未捕获/崩溃：${bad.length}`);
lines.push(`- 全部变异体均写入 ${path.relative(ROOT, MUT)}\\，真实 Results/ 与 Materials/ 未被触碰（见 A5 复核）。`);
wr(path.join(HERE, 'mutation_log.md'), lines.join('\n'), 'utf8');
process.stdout.write(lines.join('\n') + '\n');
process.exit(bad.length ? 1 : 0);
