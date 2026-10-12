/* Task 16：为 verify_task10 的 H 组生成浏览器事实（四页或七页口径均可）
 * 只读：不写 Results/，只写 _qa_task16/ 下的事实文件。
 * 环境变量：QODER_RESULTS_DIR（副本目录）、QODER_FACTS_OUT、H_PAGES（逗号分隔页名）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBrowser } from './cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const RESULTS = path.resolve(process.env.QODER_RESULTS_DIR || path.join(ROOT, 'Results'));
const OUT = path.resolve(process.env.QODER_FACTS_OUT || path.join(HERE, 'dom_facts_task16.json'));
const PAGES = (process.env.H_PAGES || 'index.html,news-message.html,news-feature.html,news-commentary.html').split(',');

const EXTRACT = String.raw`(() => {
  const links = Array.from(document.querySelectorAll('link')).map(l => ({ rel: (l.getAttribute('rel') || ''), href: (l.getAttribute('href') || ''), media: l.getAttribute('media') }));
  const scripts = Array.from(document.querySelectorAll('script')).map(s => ({ attrs: Object.fromEntries(Array.from(s.attributes).map(a => [a.name, a.value])) }));
  let cssParse = { ok: false, err: 'none' };
  try {
    const sh = document.styleSheets[0];
    if (!sh) throw new Error('styleSheets 为空');
    const rl = sh.cssRules;
    let mediaIdx = -1, mediaCount = 0;
    for (let i = 0; i < rl.length; i++) { if (rl[i].type === 4 || rl[i].type === CSSRule.MEDIA_RULE) { mediaCount++; if (mediaIdx < 0) mediaIdx = i; } }
    cssParse = { ok: true, top: rl.length, mediaCount, mediaIdx, lastIsMedia: (mediaIdx === rl.length - 1) && mediaCount === 1, href: (sh.href || '').split('/').pop(), mediaText: mediaIdx < 0 ? null : rl[mediaIdx].conditionText };
  } catch (e) { cssParse = { ok: false, err: String((e && e.message) || e).slice(0, 90) }; }
  return { links, scripts, cssParse, sheetCount: document.styleSheets.length };
})()`;

const br = await openBrowser(Number(process.env.H_PORT || 9531), path.join(HERE, '.cdp' + (process.env.H_PORT || 9531)));
const facts = {};
for (const p of PAGES) {
  await br.navigate(path.join(RESULTS, p), 260);
  facts[p] = await br.evaluate(EXTRACT);
}
const nonFile = br.events.requests.filter((u) => !/^file:/.test(u));
facts.__meta = { results: path.relative(ROOT, RESULTS).replace(/\\/g, '/'), pages: PAGES, exceptions: br.events.exceptions.length, consoleErrors: br.events.console.filter((c) => c.type === 'error').length, nonFileRequests: nonFile.length };
br.close();
fs.writeFileSync(OUT, JSON.stringify(facts, null, 1), 'utf8');
console.log('事实已写入 ' + path.relative(ROOT, OUT) + '：页=' + PAGES.length + ' 异常=' + facts.__meta.exceptions + ' 控制台错误=' + facts.__meta.consoleErrors + ' 非 file 请求=' + nonFile.length);
process.exit(facts.__meta.exceptions || facts.__meta.consoleErrors || nonFile.length ? 1 : 0);
