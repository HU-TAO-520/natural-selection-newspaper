/* Task 19 — R-A 加载与资源 / R-B 桌面视觉 / R-C 移动视觉 */
import { CSS_BLOB, listGeom, homeGeom } from './pass_util19.mjs';
import { openProbe, probeMeasure } from './probe_page19.mjs';

export async function loadPass(ctx) {
  const { A, eq, okf, C, PAGES, RESULTS, state, send, openFile, metrics, measure, js, path, fs, sha, baseName, noiseSince } = ctx;
  try { await send('Network.enable', {}); } catch {}
  for (const file of PAGES) {
    const n0 = state.noise.length;
    const ok = await openFile(file);
    await metrics(1280, 900);
    const m = await measure();
    eq('RA1', C.titleSubject[file] + C.titleSuffix, m.title, { page: file, width: '1280px', step: 'file:// 直开：document.title 逐字符等于矩阵期望', expect: C.titleSubject[file] + C.titleSuffix, actual: m.title, handoff: 'Task 15' });
    okf('RA1', ok === true, { page: file, width: '1280px', step: 'load 事件确实派发（不是超时兜底）', expect: 'true', actual: String(ok), handoff: 'Task 15' });
    okf('RA2', m.sheets.length === 1 && /styles\.css$/.test(m.sheets[0].href || '') && m.sheets[0].rules >= 40, { page: file, width: '1280px', step: 'styles.css 加载并解析（非 404、规则可读）', expect: '1 张表 ≥40 规则', actual: JSON.stringify(m.sheets), handoff: 'Task 17' });
    okf('RA2', m.htmlClasses.includes('js'), { page: file, width: '1280px', step: 'script.js 执行（no-js→js 已发生）', expect: 'js', actual: m.htmlClass, handoff: 'Task 17' });
    const rt = await send('Page.getResourceTree').catch(() => null);
    const rl = rt && rt.frameTree.resources.map((r) => ({ n: baseName(r.url), failed: !!r.failed, local: String(r.url).startsWith('file://') }));
    okf('RA2', rl && rl.length >= 2 && rl.every((r) => r.local && !r.failed) && rl.some((r) => r.n === 'styles.css') && rl.some((r) => r.n === 'script.js'), { page: file, width: '1280px', step: '资源树：全部本目录资源成功、无 failed、无外部 URL', expect: '全 file:// 且成功', actual: JSON.stringify(rl), handoff: 'Task 17' });
    const ext = await js('(() => { var bad=[]; document.querySelectorAll("*").forEach(function(e){ for (var i=0;i<e.attributes.length;i++){ var a=e.attributes[i], v=a.value; if(/^(https?:)?\\/\\//.test(v)||v.indexOf("data:")===0) bad.push(e.tagName+"@"+a.name+"="+v.slice(0,40)); if(/[?]/.test(v)&&e.tagName==="A") bad.push("QUERY:"+v.slice(0,40)); } }); var rules=[]; var ss=document.styleSheets; for (var j=0;j<ss.length;j++){ try{ for (var k=0;k<ss[j].cssRules.length;k++){ var t=ss[j].cssRules[k].cssText; if(t.indexOf("url(")>=0||t.indexOf("@import")>=0||/https?:/.test(t)) rules.push(t.slice(0,70)); } }catch(e){ rules.push("READERR"); } } return JSON.stringify({bad:bad,rules:rules}); })()');
    eq('RA2', [], ext.bad, { page: file, width: '1280px', step: 'DOM 属性无 http(s)/协议相对/data:/查询串', expect: '0 条', actual: ext.bad.join(' | ') || '0 条', handoff: 'Task 15' });
    eq('RA2', [], ext.rules, { page: file, width: '1280px', step: 'CSSOM 规则无 url()/@import/远程地址', expect: '0 条', actual: ext.rules.join(' | ') || '0 条', handoff: 'Task 16' });
    for (const h of m.hrefs) {
      const href = String(h.href);
      const isAnchor = /^#[^/]/.test(href);
      const fileForm = /^[A-Za-z0-9._-]+$/.test(href) && !/^\//.test(href) && !/[?#\\]/.test(href);
      okf('RA5', isAnchor || (fileForm && /\.html$/i.test(href)), { page: file, width: '1280px', step: '链接形态：同目录文件名且带 .html 后缀（file:// 无目录默认页、无 URL 重写，去后缀本地必然打不开）', expect: '形如 index.html 或 #锚点', actual: href + '（' + h.text + '）', handoff: 'Task 15' });
      if (!isAnchor) okf('RA5', fs.existsSync(path.join(RESULTS, href)), { page: file, width: '1280px', step: '链接目标在本目录真实存在（无死链）', expect: '存在', actual: href, handoff: 'Task 15' });
    }
    eq('RA3', [], noiseSince(n0), { page: file, width: '1280px', step: '加载阶段控制台 0 错误 0 警告 0 未捕获异常', expect: '0 条', actual: noiseSince(n0).join(' | ') || '0 条', handoff: 'Task 15／16' });
  }
  const plain = [...new Set(state.netEvents.map((u) => String(u).replace(/^RESP \d+ /, '')))];
  const external = plain.filter((u) => !/^(file:|about:|data:|RESP |FAILED::)/.test(u));
  eq('RA4', [], external, { page: '全部 HTML 页汇总', width: '-', step: 'Network 域全程事件中外部（http/CDN/远程字体）请求数为 0 —— Task0 正向验收"全站网络请求数为 0"', expect: '0 条外部请求', actual: external.slice(0, 5).join(' , ') || '0 条', handoff: 'Task 15' });
  const failed = plain.filter((u) => /^FAILED::/.test(u) || / 40[0-9] | 5[0-9][0-9] /.test(' ' + u + ' '));
  eq('RA4', [], failed, { page: '全部 HTML 页汇总', width: '-', step: 'Network 域无 404／失败资源', expect: '0 条', actual: failed.slice(0, 5).join(' , ') || '0 条', handoff: 'Task 17' });
  A('RA6', 'rec', { page: '七页汇总', width: '-', step: 'Network 事件总数', detail: String(plain.length) });
}

export async function navMatrix(ctx) {
  const { eq, okf, C, PAGES, metrics, openFile, measure, js, clickEl, sleep, baseName, state, noiseSince } = ctx;
  for (const file of PAGES) {
    for (let i = 1; i <= C.navSpec.length; i++) {
      await openFile(file); await metrics(1280, 900);
      const href = await js('(() => { var a=document.querySelectorAll(".site-navigation__link")[' + (i - 1) + ']; return JSON.stringify({href:a.getAttribute("href"), text:a.textContent}); })()');
      const n0 = state.noise.length, nav0 = state.navCount;
      await clickEl('#site-navigation li:nth-child(' + i + ') a');
      await sleep(750);
      const m = await measure();
      okf('RA7', state.navCount > nav0 && baseName(m.url) === href.href, { page: file, width: '1280px', step: '主导航路径 ' + file + ' → ' + href.href + '：真实导航由 Page.frameNavigated 计数证明（点当前页链接时路径不变，故不用 path 差异判）', expect: 'frameNavigated +1 且落地=' + href.href, actual: 'navigated=+' + (state.navCount - nav0) + ' 落地=' + baseName(m.url), handoff: 'Task 15' });
      eq('RA7', C.titleSubject[href.href] + C.titleSuffix, m.title, { page: file, width: '1280px', step: '落地页 <title> 与矩阵期望一致', expect: C.titleSubject[href.href] + C.titleSuffix, actual: m.title, handoff: 'Task 15' });
      eq('RA7', C.navSpec[i - 1].text, href.text, { page: file, width: '1280px', step: '第 ' + i + ' 项文字与 Task0 主导航规格逐字一致', expect: C.navSpec[i - 1].text, actual: href.text, handoff: 'Task 15' });
      eq('RA7', C.navSpec[i - 1].href, href.href, { page: file, width: '1280px', step: '第 ' + i + ' 项目标文件与 Task0 主导航规格一致', expect: C.navSpec[i - 1].href, actual: href.href, handoff: 'Task 15' });
      eq('RA7', [], noiseSince(n0), { page: file, width: '1280px', step: '该路径导航过程 0 控制台噪声', expect: '0 条', actual: noiseSince(n0).join('|') || '0 条', handoff: 'Task 15' });
    }
  }
  okf('RA8', C.navPaths === C.htmlPages.length * C.navSpec.length, { page: '全站', width: '-', step: '主导航路径条数 == 全部 HTML 页 × 四链接（页集合由 manifest 推导；四页时代 16 条、七页时代 28 条继续都是子集）', expect: C.htmlPages.length + ' 页 × ' + C.navSpec.length + ' = ' + C.navPaths, actual: C.navPaths + ' 条已逐条跑完', handoff: '—' });
}

export async function desktopChecks(ctx, file, w) {
  const { eq, okf, C, PAGES, metrics, openFile, measure, js, force, warm, near, px, rgbStr } = ctx;
  await openFile(file); await metrics(w, 900);
  const m = await measure();
  const W = w + 'px';
  const col = C.colByList[file];
  okf('RB1', m.scrollW <= m.clientWidth, { page: file, width: W, step: '桌面无横向溢出（scrollWidth<=clientWidth）', expect: 'scrollW<=client', actual: m.scrollW + '<=' + m.clientWidth, handoff: 'Task 16' });
  const avail = m.clientWidth - 2 * C.gutterRem * px(m.rootFont);
  okf('RB1', m.headerInner.w <= avail + 1, { page: file, width: W, step: '报头版心不超出 视口−2×--page-gutter', expect: '≤' + avail.toFixed(1), actual: m.headerInner.w.toFixed(1), handoff: 'Task 16' });
  okf('RB1', near(m.headerInner.left, m.headerInner.rightGap, 1.2), { page: file, width: W, step: '报头版心左右留白对称', expect: 'L≈R', actual: 'L=' + m.headerInner.left.toFixed(1) + ' R=' + m.headerInner.rightGap.toFixed(1), handoff: 'Task 16' });
  okf('RB1', near(m.main.w, m.headerInner.w, 0.6), { page: file, width: W, step: '正文容器与报头同宽', expect: '相等', actual: m.main.w.toFixed(1) + ' vs ' + m.headerInner.w.toFixed(1), handoff: 'Task 16' });
  eq('RB2', C.h1Expected[file], m.pageTitle && m.pageTitle.text, { page: file, width: W, step: '<h1> 逐字符等于矩阵期望', expect: C.h1Expected[file], actual: m.pageTitle && m.pageTitle.text, handoff: 'Task 15' });
  eq('RB2', 1, m.h1s, { page: file, width: W, step: '每页恰好一个 <h1>', expect: 1, actual: m.h1s, handoff: 'Task 15' });
  eq('RB2', 1, m.navCount, { page: file, width: W, step: 'R3：每页 <nav> 数恒为 1（最新区不得引入第二个 nav）', expect: 1, actual: m.navCount, handoff: 'Task 15' });
  const siteName = C.titleSuffix.replace(/^｜/, '');
  okf('RB3', m.mast.sw <= m.mast.cw + 0.5 && m.mast.lines === 1 && m.mast.text === siteName, { page: file, width: W, step: '报头单行完整显示、不被裁切（站点名取自矩阵后缀）', expect: siteName + ' 单行', actual: m.mast.text + ' 行=' + m.mast.lines + ' ' + m.mast.sw + '/' + m.mast.cw, handoff: 'Task 16' });
  okf('RB3', /double/.test(m.mastBox.bt) && /double/.test(m.mastBox.bb), { page: file, width: W, step: '报头上下双细线（v1 RB3 语义无损迁移）', expect: 'double', actual: m.mastBox.bt + ' / ' + m.mastBox.bb, handoff: 'Task 16' });
  const mTop = await js('(() => { var l=document.querySelector(".site-masthead__link"), b=document.querySelector(".site-masthead"); var a=l.getBoundingClientRect(), c=b.getBoundingClientRect(); var t=parseFloat(getComputedStyle(b).borderTopWidth); return JSON.stringify({above:Math.round((a.top-c.top-t)*10)/10, below:Math.round((c.bottom-t-a.bottom)*10)/10}); })()');
  okf('RB3', mTop.above >= 0 && mTop.below >= 0, { page: file, width: W, step: '双细线不被报头文字穿越', expect: '文字盒位于两线之间', actual: JSON.stringify(mTop), handoff: 'Task 16' });
  const tops = m.links.map((l) => Math.round(l.top));
  okf('RB3', m.links.length === C.navSpec.length && tops.every((t) => Math.abs(t - tops[0]) <= 1), { page: file, width: W, step: '主导航 ' + C.navSpec.length + ' 项同一行', expect: 'tops 全等±1', actual: tops.join(','), handoff: 'Task 16' });
  let overlap = false;
  for (let i = 1; i < m.links.length; i++) if (m.links[i].left < m.links[i - 1].right - 0.5) overlap = true;
  eq('RB3', C.navSpec.map((n) => n.text).join('|'), m.links.map((l) => l.text).join('|'), { page: file, width: W, step: '桌面导航顺序按 bounding box 读屏（不读源码顺序）', expect: C.navSpec.map((n) => n.text).join('|'), actual: m.links.map((l) => l.text).join('|'), handoff: 'Task 16' });
  okf('RB3', !overlap, { page: file, width: W, step: '导航项互不重叠', expect: '无重叠', actual: m.links.map((l) => Math.round(l.left) + '-' + Math.round(l.right)).join(','), handoff: 'Task 16' });
  okf('RB4', m.tog.disp === 'none', { page: file, width: W, step: '桌面隐藏菜单按钮（三态表末行）', expect: 'display:none', actual: m.tog.disp, handoff: 'Task 16' });
  okf('RB4', m.nav.disp !== 'none' && m.nav.open === false && m.links.every((l) => l.shown) && m.navList.dir === 'row', { page: file, width: W, step: '主导航横向常显、无 is-open 残留', expect: 'row/无 is-open', actual: m.nav.disp + '/' + m.navList.dir + '/open=' + m.nav.open, handoff: 'Task 16' });
  const curIdx = m.linkCur.findIndex((v) => v === 'page');
  eq('RB5', C.ariaExpected[file], curIdx >= 0 ? m.links[curIdx].href : null, { page: file, width: W, step: 'aria-current 落在矩阵规定的链接上（自身／所属栏目页）', expect: C.ariaExpected[file], actual: curIdx >= 0 ? m.links[curIdx].href + '（' + m.links[curIdx].text + '）' : 'none', handoff: 'Task 15' });
  eq('RB5', 1, m.linkCur.filter((v) => v === 'page').length, { page: file, width: W, step: '每页恰好一个 aria-current="page"', expect: 1, actual: m.linkCur.filter((v) => v === 'page').length, handoff: 'Task 15' });
  const cur = m.links[curIdx];
  okf('RB5', cur && cur.color === C.ACCENT && cur.fw === '700' && /solid /.test(cur.bb) && cur.bb.endsWith(C.ACCENT), { page: file, width: W, step: '当前项=暗红+700+实下边线（三重区分，不单靠颜色）', expect: C.ACCENT + '/700/solid', actual: cur ? cur.color + '/' + cur.fw + '/' + cur.bb : 'none', handoff: 'Task 16' });
  const normUnvisited = m.links.filter((l, i) => m.linkCur[i] !== 'page');
  okf('RB5', normUnvisited.every((l) => l.color === C.INK), { page: file, width: W, step: '非当前项导航链接为墨色（组件覆盖 a 基础色；已访问态另有 R-N 两条链，不在此放宽）', expect: C.INK, actual: normUnvisited.map((l) => l.text + '=' + l.color).join(','), handoff: 'Task 16' });
  okf('RB5', m.links.every((l) => (l.clip || []).length === 0), { page: file, width: W, step: '链接无 overflow 裁切祖先（焦点轮廓不被裁）', expect: '0 个裁切祖先', actual: m.links.map((l) => (l.clip || []).join('+') || 'ok').join(','), handoff: 'Task 16' });
  const hi = m.linkCur.findIndex((v) => v !== 'page');
  const before = m.links.map((l) => [l.top, l.left, l.w, l.h]);
  if (hi >= 0) {
    await force('.site-navigation__list li:nth-child(' + (hi + 1) + ') .site-navigation__link', ['hover']);
    const hm = await measure();
    const moved = hm.links.some((l, i) => !near(l.top, before[i][0], 0.5) || !near(l.left, before[i][1], 0.5) || !near(l.w, before[i][2], 0.5) || !near(l.h, before[i][3], 0.5));
    okf('RB5', !moved && hm.links[hi].color === C.ACCENT, { page: file, width: W, step: '强制 hover 第 ' + (hi + 1) + ' 项：仅变暗红，不位移不缩放', expect: '几何不变+accent', actual: moved ? '几何变化' : m.links[hi].color + '→' + hm.links[hi].color, handoff: 'Task 16' });
    await force('.site-navigation__list li:nth-child(' + (hi + 1) + ') .site-navigation__link', []);
  }
  eq('RB6', C.PAPER, m.bodyBg, { page: file, width: W, step: '暖白纸色底（--color-paper 解析值）', expect: C.PAPER, actual: m.bodyBg, handoff: 'Task 16' });
  eq('RB6', C.INK, m.bodyColor, { page: file, width: W, step: '深色文字（--color-ink 解析值）', expect: C.INK, actual: m.bodyColor, handoff: 'Task 16' });
  okf('RB6', /SimSun|Songti SC|STSong/.test(m.bodyFF) && /serif/.test(m.bodyFF), { page: file, width: W, step: '宋体字体栈且保留 serif 回退', expect: 'SimSun/Songti + serif', actual: m.bodyFF, handoff: 'Task 16' });
  const css = await js(CSS_BLOB);
  okf('RB6', css.ok && css.blob.indexOf('READERR') < 0, { page: file, width: W, step: '样式表可解析（' + css.n + ' 条规则）', expect: '无 READERR', actual: css.ok ? '规则 ' + css.n : String(css.blob).slice(0, 120), handoff: 'Task 16' });
  const badVis = ['gradient', 'box-shadow:', 'text-shadow', 'border-radius', 'column-count', 'columns:', 'filter:', 'transform: scale', 'transition'].filter((k) => css.blob.includes(k));
  eq('RB6', [], badVis, { page: file, width: W, step: '无被禁视觉（渐变/阴影/圆角/分栏/滤镜/缩放过渡）', expect: '0 类', actual: badVis.join(',') || '0 类', handoff: 'Task 16' });
  if (m.abody) {
    const READING_MAX = C.readingMaxRem * 16;
    okf('RB7', px(m.abody.w) <= READING_MAX + 0.5, { page: file, width: W, step: '详情页正文宽度 ≤ --reading-max 实测值', expect: '≤' + READING_MAX, actual: m.abody.w.toFixed(1), handoff: 'Task 16' });
    eq('RB7', 'justify', m.abody.ta, { page: file, width: W, step: '桌面正文两端对齐', expect: 'justify', actual: m.abody.ta, handoff: 'Task 16' });
    eq('RB7', C.detail[file].paragraphCount, m.paras.length, { page: file, width: W, step: '段落数 == Task13 基线', expect: C.detail[file].paragraphCount, actual: m.paras.length, handoff: 'Task 15' });
    if (C.detail[file].dateline) okf('RB7', m.dateline && m.dateline.disp === 'inline' && m.dateline.firstP === true && m.dateline.fw === '700', { page: file, width: W, step: '电头 .dateline 内联于首段首行且加粗', expect: 'inline/首段/700', actual: JSON.stringify(m.dateline), handoff: 'Task 15' });
  }
  if (m.date && C.detail[file] && C.detail[file].date && C.detail[file].date.present) {
    eq('RB7', C.detail[file].date.text, m.date.text, { page: file, width: W, step: '末尾日期与 Task13 基线逐字符一致', expect: C.detail[file].date.text, actual: m.date.text, handoff: 'Task 15' });
    okf('RB7', m.date.ta === 'right' && px(m.date.ti) === 0, { page: file, width: W, step: '末尾日期右对齐、无首行缩进', expect: 'right/indent 0', actual: m.date.ta + '/' + m.date.ti, handoff: 'Task 16' });
  }
  listGeom(ctx, m, file, W, col ? col.articles.length : null, 'desktop');
  homeGeom(ctx, m, file, W);
  if (file === 'index.html') {
    okf('RB15', m.secs.length === 3 && m.secs.every((s, i) => i === 0 || m.secs[i - 1].bottom <= s.top + 0.6), { page: file, width: W, step: '首页三区块单列、顺序不变', expect: '3 区块纵向不重叠', actual: m.secs.map((s) => Math.round(s.top) + '-' + Math.round(s.bottom)).join(','), handoff: 'Task 16' });
    const mismatch = Object.entries(C.r4Tally).filter(([k]) => k !== 'main').filter(([k, v]) => (m.tagTally[k] || 0) !== v).map(([k, v]) => k + ' 期望' + v + '/实际' + (m.tagTally[k] || 0));
    eq('RB16', [], mismatch, { page: file, width: W, step: 'R4②：main 内标签计数逐类相等（不得出现第八种标签）', expect: JSON.stringify(C.r4Tally), actual: JSON.stringify(m.tagTally), handoff: 'Task 15' });
    const seq = [m.pageTitle.text, m.secTitles[0], m.secTexts[0], m.secTitles[1], m.secTexts[1], m.secTitles[2], m.secTexts[2], (m.homeLatest && m.homeLatest.title) || '']
      .concat((m.homeLatest ? m.homeLatest.items : []).map((it) => [it.title.text, it.date.text]).flat());
    eq('RB16', C.whitelist, seq, { page: file, width: W, step: 'R4④：可见内容白名单按序 ' + C.whitelistN + ' 项逐字符命中（P_* 由 Task4 冻结表解析）', expect: C.whitelist.join('、'), actual: seq.join('、'), handoff: 'Task 15' });
  }
  return m;
}
const state_warm = (ctx, href) => { try { return ctx.state.warm.has(String(href).replace(/\.html$/, '.html')); } catch { return false; } };

export async function mobileChecks(ctx, file, w) {
  const { eq, okf, C, metrics, openFile, measure, js, probeCtx, REL_DIR, shotNarrow, near, px } = ctx;
  await openFile(file); await metrics(w, 900);
  const m = await measure();
  const W = w + 'px';
  const col = C.colByList[file];
  const gutter = 1 * px(m.rootFont);
  okf('RC1', near(m.headerInner.left, gutter, 0.6) && near(m.headerInner.rightGap, gutter, 0.6), { page: file, width: W, step: '左右留白各约移动档 --page-gutter=1rem', expect: '≈' + gutter, actual: 'L=' + m.headerInner.left.toFixed(1) + ' R=' + m.headerInner.rightGap.toFixed(1), handoff: 'Task 16' });
  okf('RC1', near(m.headerInner.w, m.clientWidth - 2 * gutter, 1.2), { page: file, width: W, step: '版心随可用宽度收缩，无固定内容宽度', expect: (m.clientWidth - 2 * gutter).toFixed(1), actual: m.headerInner.w.toFixed(1), handoff: 'Task 16' });
  eq('RC1', [], m.scrollAreas, { page: file, width: W, step: '无内部滚动区（不靠 overflow:auto 掩盖溢出）', expect: '0 个', actual: m.scrollAreas.join(',') || '0 个', handoff: 'Task 16' });
  eq('RC1', [], m.fixedWide, { page: file, width: W, step: '无超出视口的固定像素宽元素', expect: '0 个', actual: m.fixedWide.join(',') || '0 个', handoff: 'Task 16' });
  okf('RC1', m.headerInner.disp === 'flex' && m.headerInner.fd === 'column', { page: file, width: W, step: '报头内部改为纵向流', expect: 'flex/column', actual: m.headerInner.disp + '/' + m.headerInner.fd, handoff: 'Task 16' });
  okf('RC1', m.mqM === true && m.mqD === false, { page: file, width: W, step: '命中移动断点且未命中桌面断点（' + C.breakpoints.mobileMax + '/' + C.breakpoints.desktopMin + ' 互补）', expect: 'mqM=true mqD=false', actual: 'mqM=' + m.mqM + ' mqD=' + m.mqD, handoff: 'Task 16' });
  const clampMast = Math.min(56, Math.max(40, w * 0.11));
  okf('RC2', near(px(m.mast.fs), clampMast, 0.6), { page: file, width: W, step: '报头按 clamp(2.5rem,11vw,3.5rem) 流式缩小', expect: clampMast.toFixed(2) + 'px', actual: m.mast.fs, handoff: 'Task 16' });
  okf('RC2', m.mast.sw <= m.mast.cw + 0.5 && m.pageTitle.sw <= m.pageTitle.cw + 0.5, { page: file, width: W, step: '报头与页面标题不溢出', expect: 'scroll<=client', actual: 'mast ' + m.mast.sw + '/' + m.mast.cw + ' · title ' + m.pageTitle.sw + '/' + m.pageTitle.cw, handoff: 'Task 16' });
  const longTitle = file === 'article-classroom-screen-upgrade.html';
  if (longTitle) okf('RC2', m.artTitle.lines >= (w <= 400 ? 2 : 1) && m.artTitle.sw <= m.artTitle.cw + 0.5 && m.artTitle.w <= m.clientWidth, { page: file, width: W, step: '最长详情页标题在窄宽度自然折行且任一移动宽度不溢出', expect: '行数≥' + (w <= 400 ? 2 : 1) + ' 且不溢出', actual: '行数=' + m.artTitle.lines + ' ' + m.artTitle.sw + '<=' + m.artTitle.cw + ' 盒宽=' + m.artTitle.w.toFixed(1), handoff: 'Task 16' });
  if (longTitle) {
    const ll = await js('(() => { var e=document.querySelector(".article__header h1"); var r=document.createRange(); r.selectNodeContents(e); var rs=[].slice.call(r.getClientRects()).filter(function(x){return x.width>0;}); var last=rs[rs.length-1]; return JSON.stringify({w:last?Math.round(last.width):-1, size:parseFloat(getComputedStyle(e).fontSize), n:rs.length}); })()');
    okf('RC2', ll.w > 0 && ll.w / ll.size >= 2, { page: file, width: W, step: '末行不残留单字孤悬', expect: '末行≥2 字宽', actual: ll.w + 'px ≈ ' + (ll.w / ll.size).toFixed(1) + ' 字（字号 ' + ll.size + 'px，共 ' + ll.n + ' 行片段）', handoff: 'Task 16' });
  }
  if (m.entryList) {
    okf('RC6', m.entryList.items.every((it) => it.link.fd === 'column'), { page: file, width: W, step: '窄视口条目堆叠（链接为纵向流）', expect: 'column', actual: m.entryList.items.map((it) => it.link.fd).join(','), handoff: 'Task 16' });
    okf('RC6', m.entryList.items.every((it) => it.title.top < it.date.top), { page: file, width: W, step: '堆叠次序：标题在上、日期在下（bounding box 判）', expect: 'title.top<date.top', actual: m.entryList.items.map((it) => Math.round(it.title.top) + '<' + Math.round(it.date.top)).join(','), handoff: 'Task 16' });
    okf('RC6', m.entryList.items.every((it) => it.title.ow === 'anywhere' && it.title.wb === 'normal'), { page: file, width: W, step: '紧急换行只用 overflow-wrap:anywhere（word-break 保持 normal）', expect: 'anywhere+normal', actual: m.entryList.items.map((it) => it.title.ow + '/' + it.title.wb).join(','), handoff: 'Task 16' });
    okf('RC6', m.entryList.items.every((it) => it.date.ws === 'nowrap' && it.date.lines === 1), { page: file, width: W, step: '日期 white-space:nowrap 未被挤断（行盒数=1）', expect: 'nowrap+1 行', actual: m.entryList.items.map((it) => it.date.ws + '/' + it.date.lines).join(','), handoff: 'Task 16' });
    okf('RC6', m.entryList.items.every((it) => it.date.sw <= it.date.cw + 0.5), { page: file, width: W, step: '窄视口下日期不溢出自身盒', expect: 'sw<=cw', actual: m.entryList.items.map((it) => it.date.sw + '/' + it.date.cw).join(','), handoff: 'Task 16' });
    okf('RC6', m.entryList.items.every((it) => it.title.sw <= it.title.cw + 0.5), { page: file, width: W, step: '长标题不撑出横向滚动（标题盒内自洽）', expect: 'sw<=cw', actual: m.entryList.items.map((it) => it.title.sw + '/' + it.title.cw).join(','), handoff: 'Task 16' });
  }
  if (m.homeLatest) {
    okf('RC6', m.homeLatest.items.every((it) => it.link.fd === 'column' && it.title.top < it.date.top), { page: file, width: W, step: '首页最新区在窄视口同样堆叠且标题在上', expect: 'column+标题在上', actual: m.homeLatest.items.map((it) => it.link.fd + '/' + Math.round(it.title.top) + '<' + Math.round(it.date.top)).join(','), handoff: 'Task 16' });
    okf('RC6', m.homeLatest.items.every((it) => it.title.ow === 'anywhere' && it.date.ws === 'nowrap' && it.date.lines === 1), { page: file, width: W, step: '最新区换行与日期不挤断同时成立', expect: 'anywhere + nowrap + 1 行', actual: m.homeLatest.items.map((it) => it.title.ow + '/' + it.date.ws + '/' + it.date.lines).join(','), handoff: 'Task 16' });
  }
  if (m.abody) {
    eq('RC4', C.detail[file].paragraphCount, m.paras.length, { page: file, width: W, step: '移动保持单栏且段落数=基线', expect: C.detail[file].paragraphCount, actual: m.paras.length, handoff: 'Task 15' });
    eq('RC7', 'start', m.abody.ta, { page: file, width: W, step: '移动端正文改为 text-align:start', expect: 'start', actual: m.abody.ta, handoff: 'Task 16' });
    okf('RC4', near(px(m.pIndent), px(m.abody.fs) * 2, 0.6), { page: file, width: W, step: '正文段落首行缩进 2em', expect: '≈2×字号', actual: m.pIndent + ' vs ' + m.abody.fs, handoff: 'Task 16' });
  }
  if (m.secs.length) okf('RC3', m.secs.every((x, i) => near(x.left, m.secs[0].left, 0.6) && (i === 0 || m.secs[i - 1].bottom <= x.top + 0.6)), { page: file, width: W, step: '首页三区块保持单列、顺序不变', expect: '同左缘且纵向递增不重叠', actual: m.secs.map((x) => Math.round(x.left) + '/' + Math.round(x.top)).join(','), handoff: 'Task 16' });
  const TERMS = ['AI', '.exe', 'Windows 10', 'UOS', 'USB', 'OPS', 'Linux', '4K', 'Web'];
  const srcText = C.detail[file] ? C.detail[file].paragraphs.map((p) => p.text).join('\n') : [m.pageTitle.text].concat(m.secTexts || []).join('\n');
  const present = TERMS.filter((t) => srcText.indexOf(t) >= 0);
  const rendered = m.mainText || '';
  eq('RC5', present, present.filter((t) => rendered.indexOf(t) >= 0), { page: file, width: W, step: '基线命中的中英混排术语在渲染文本中原样完整', expect: present.join(',') || '（本页无术语）', actual: present.filter((t) => rendered.indexOf(t) >= 0).join(',') || '无命中', handoff: 'Task 15' });
  const soft = [...rendered].filter((ch) => { const c = ch.codePointAt(0); return c === 0xAD || (c >= 0x200B && c <= 0x200D) || c === 0x2060 || c === 0xFEFF; });
  eq('RC5', 0, soft.length, { page: file, width: W, step: '未插入软连字符/零宽字符（原文字符不变）', expect: 0, actual: soft.length, handoff: 'Task 15' });
  okf('RC8', m.scrollW <= m.clientWidth && (m.bodyScrollW == null || m.bodyScrollW <= m.clientWidth), { page: file, width: W, step: 'CDP 覆盖档无横向溢出（不放宽 1px）', expect: 'de/body<=client', actual: 'de=' + m.scrollW + ' body=' + m.bodyScrollW + ' client=' + m.clientWidth, handoff: 'Task 16' });
  const info = await openProbe(probeCtx, { target: file, w, h: 1800, state: 'closed', dir: REL_DIR });
  const pm = await probeMeasure(probeCtx);
  eq('RC9', w, pm.clientWidth, { page: file, width: W + '/iframe', step: '同域 iframe 布局视口确实等于目标宽度（探针自证，排除顶层窗口约 500px 下限造成的裁剪假象）', expect: w, actual: pm.clientWidth + '（宿主标题=' + info.hostTitle + '）', handoff: 'Task 19 驱动自身' });
  okf('RC9', pm.scrollW <= pm.clientWidth, { page: file, width: W + '/iframe', step: 'iframe 档无横向溢出：documentElement.scrollWidth<=clientWidth', expect: '≤' + pm.clientWidth, actual: String(pm.scrollW), handoff: 'Task 16' });
  okf('RC9', pm.bodyScrollW <= pm.clientWidth, { page: file, width: W + '/iframe', step: 'iframe 档 body.scrollWidth<=clientWidth', expect: '≤' + pm.clientWidth, actual: String(pm.bodyScrollW), handoff: 'Task 16' });
  eq('RC9', m.paras.length, pm.paras.length, { page: file, width: W + '/iframe', step: '两条视口量具读到的段落数一致（探针未读到不同状态）', expect: m.paras.length, actual: pm.paras.length, handoff: 'Task 19 驱动自身' });
  if (pm.entryList && m.entryList) eq('RC9', m.entryList.items.length, pm.entryList.items.length, { page: file, width: W + '/iframe', step: '两条量具的条目数一致', expect: m.entryList.items.length, actual: pm.entryList.items.length, handoff: 'Task 19 驱动自身' });
  if (pm.entryList) okf('RC9', pm.entryList.items.every((it) => it.title.top < it.date.top), { page: file, width: W + '/iframe', step: 'iframe 档条目堆叠同样标题在上', expect: 'title.top<date.top', actual: pm.entryList.items.map((it) => Math.round(it.title.top) + '<' + Math.round(it.date.top)).join(','), handoff: 'Task 16' });
  listGeom(ctx, pm, file, W + '/iframe', col ? col.articles.length : null, 'mobile');
  homeGeom(ctx, pm, file, W + '/iframe');
  await shotNarrow(file.replace(/\.html$/, '') + '-' + w + '-iframe', file, w, 1800, 'closed');
  return m;
}
