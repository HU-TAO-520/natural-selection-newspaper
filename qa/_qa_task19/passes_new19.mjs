/* Task 19 — R-K 导航链与渲染次序 / R-L 列表容量压力 / R-N visited 配色（计算样式链 + 像素链） / 视觉截图
 *
 * K2 判的是"屏幕上看到的次序"：条目按 bounding box 的 y（同一 x 带内）排序后的标题序列。
 * 源码顺序、DOM 顺序都不作数 —— 一条 column-reverse 或 order 属性能在源码不动的情况下
 * 把视觉顺序整个反过来，那类缺陷只有真实布局能暴露。
 */
import { visualOrder, domOrder } from './pass_util19.mjs';
import { makePressureDir } from './pressure_page19.mjs';

export async function coldPass(ctx) {
  const { eq, okf, C, metrics, openFile, measure, state } = ctx;
  await openFile('index.html'); await metrics(1280, 900);
  const m = await measure();
  state.coldColors = m.links.map((l) => ({ text: l.text, href: l.href, color: l.color, bb: l.bb, fw: l.fw }));
  state.coldMast = m.mast.color;
  const notVisited = m.links.filter((l, i) => m.linkCur[i] !== 'page' && !state.warm.has(l.href));
  okf('RB20', notVisited.length > 0 && notVisited.every((l) => l.color === C.INK), { page: 'index.html', width: '1280px/冷历史', step: '未访问过的导航链接为墨色（组件覆盖 a 基础色；冷历史基线，供 R-N 对照）', expect: C.INK, actual: notVisited.map((l) => l.text + '=' + l.color).join(','), handoff: 'Task 16' });
  const cur = m.links.filter((l, i) => m.linkCur[i] === 'page');
  okf('RB20', cur.length === 1 && cur[0].bb === (/solid/.test(cur[0].bb) ? cur[0].bb : '') && cur[0].bb.endsWith(C.ACCENT), { page: 'index.html', width: '1280px/冷历史', step: '当前页带实色暗红下边线（冷历史）', expect: 'solid ' + C.ACCENT, actual: cur.map((l) => l.bb).join(','), handoff: 'Task 16' });
  eq('RB21', C.INK, m.mast.color, { page: 'index.html', width: '1280px/冷历史', step: '报头链接冷历史下为墨色', expect: C.INK, actual: m.mast.color, handoff: 'Task 16' });
  return m;
}

export async function listPass(ctx) {
  const { eq, okf, A, C, PAGES, metrics, openFile, measure, js, clickEl, sleep, baseName, state, RESULTS } = ctx;
  /* ---- K1 真实点击链路：每跳用 Page.frameNavigated 计数证明"真的导航了" ---- */
  await openFile('index.html'); await metrics(1280, 900);
  const home = await measure();
  for (let i = 0; i < home.homeLatest.items.length; i++) {
    const nav0 = state.navCount;
    await clickEl('.home-latest__item:nth-of-type(' + (i + 1) + ') .home-latest__link');
    await sleep(800);
    const landed = await measure();
    const want = C.latestPages[i];   /* R11①/R12：全局序前 N 条，不是"注册表第 i 栏目的首条" */
    okf('RK1', state.navCount > nav0 && baseName(landed.url) === want, { page: 'index.html', width: '1280px', step: 'K1 首页最新区第 ' + (i + 1) + ' 条 → 详情页：frameNavigated 计数 +' + (state.navCount - nav0), expect: '导航发生且落地=' + want, actual: '落地=' + baseName(landed.url), handoff: 'Task 15' });
    await openFile('index.html'); await metrics(1280, 900);
  }
  for (const col of C.columns) {
    await openFile(col.list); await metrics(1280, 900);
    const lm = await measure();
    for (let i = 0; i < lm.entryList.items.length; i++) {
      const nav0 = state.navCount;
      await clickEl('.entry-list__item:nth-of-type(' + (i + 1) + ') .entry-list__link');
      await sleep(800);
      const landed = await measure();
      okf('RK1', state.navCount > nav0 && baseName(landed.url) === col.articles[i].page, { page: col.list, width: '1280px', step: 'K1 栏目页「' + col.label + '」第 ' + (i + 1) + ' 条 → 详情页真实导航', expect: col.articles[i].page, actual: baseName(landed.url), handoff: 'Task 15' });
      await openFile(col.list); await metrics(1280, 900);
    }
  }
  for (const col of C.columns) {
    for (const art of col.articles) {
      await openFile(art.page); await metrics(1280, 900);
      const idx = (await js('(() => { var ls=[].slice.call(document.querySelectorAll(".site-navigation__link")); return JSON.stringify(ls.findIndex(function(a){return a.getAttribute("aria-current")==="page";})); })()'));
      const nav0 = state.navCount;
      await clickEl('#site-navigation li:nth-child(' + (idx + 1) + ') a');
      await sleep(800);
      const landed = await measure();
      okf('RK1', state.navCount > nav0 && baseName(landed.url) === col.list, { page: art.page, width: '1280px', step: 'K1 详情页 → 所属栏目页（点的是带 aria-current 的那一项，路径变化即证明跳转）', expect: col.list, actual: baseName(landed.url) + '（起点自身=' + art.page + '）', handoff: 'Task 15' });
    }
  }

  /* ---- K2 视觉次序：bounding box 排序 == DOM 次序 == manifest 次序 ---- */
  for (const col of C.columns) {
    await openFile(col.list); await metrics(1280, 900);
    const m = await measure();
    const items = m.entryList.items;
    eq('RK2', domOrder(items).join('\u0001'), visualOrder(items).join('\u0001'), { page: col.list, width: '1280px', step: 'K2 视觉次序（bounding box y 排序）== DOM 次序', expect: '视觉=DOM', actual: visualOrder(items).join('|'), handoff: 'Task 16' });
    eq('RK2', col.articles.map((a) => a.title).join('\u0001'), visualOrder(items).join('\u0001'), { page: col.list, width: '1280px', step: 'K2 视觉次序 == manifest.columns[*].articles 次序（源码顺序正确而屏幕顺序颠倒也判 FAIL）', expect: col.articles.map((a) => a.title).join('|'), actual: visualOrder(items).join('|'), handoff: 'Task 16' });
    eq('RK2', col.articles.map((a) => a.page).join('\u0001'), items.map((it) => it.href).join('\u0001'), { page: col.list, width: '1280px', step: 'K2 条目链接目标次序同样等于清单次序', expect: col.articles.map((a) => a.page).join('|'), actual: items.map((it) => it.href).join('|'), handoff: 'Task 15' });
    for (let i = 0; i < items.length; i++) {
      const prev = i > 0 ? items[i - 1] : null;
      okf('RK2', !prev || prev.item.bottom <= items[i].item.top + 0.6, { page: col.list, width: '1280px', step: 'K2 第 ' + (i + 1) + ' 条在屏幕上的位置紧随上一条（无反序、无重叠）', expect: '上一条 bottom ≤ 本条 top', actual: prev ? Math.round(prev.item.bottom) + '→' + Math.round(items[i].item.top) : '首条', handoff: 'Task 16' });
    }
    await metrics(375, 900);
    const mm = await measure();
    eq('RK2', col.articles.map((a) => a.title).join('\u0001'), visualOrder(mm.entryList.items).join('\u0001'), { page: col.list, width: '375px', step: 'K2 移动档视觉次序同样等于清单次序', expect: col.articles.map((a) => a.title).join('|'), actual: visualOrder(mm.entryList.items).join('|'), handoff: 'Task 16' });
  }

  /* ---- K3（R11①/R12）：首页最新区 == 独立推导全局序的前 latestN 条 ----
     旧实现把第 i 条对位到"注册表第 i 个栏目的首条"，即隐含"每栏目一条"；
     稿件多于栏目数后那条判据本身就是错的（RK3 曾因此成片翻红）。 */
  await openFile('index.html'); await metrics(1280, 900);
  const hm = await measure();
  const hl = hm.homeLatest.items;
  eq('RK3', C.latestPages.length, hl.length, { page: 'index.html', width: '1280px', step: 'K3 最新区条数 == 合同 latestN（R11①全局前 N 条，与稿件总数无关）', expect: C.latestPages.length, actual: hl.length, handoff: 'Task 15' });
  for (let i = 0; i < hl.length; i++) {
    const page = C.latestPages[i], m = C.mdMeta[page];
    eq('RK3', page, hl[i].href, { page: 'index.html', width: '1280px', step: 'K3 第 ' + (i + 1) + ' 条 href == 全局序第 ' + (i + 1) + ' 篇（date 降序→order→栏目序→slug）', expect: page, actual: hl[i].href, handoff: 'Task 15' });
    eq('RK3', m ? m.title : '<无 md>', hl[i].title.text, { page: 'index.html', width: '1280px', step: 'K3 第 ' + (i + 1) + ' 条标题 == 该篇 md 的 title（标题与 href 双一致）', expect: m ? m.title : '<无 md>', actual: hl[i].title.text, handoff: 'Task 15' });
    if (!m) continue;
    await openFile(m.column.list); await metrics(1280, 900);
    const lm = await measure();
    const at = lm.entryList.items.findIndex((it) => it.href === page);
    eq('RK3', true, at >= 0, { page: m.column.list, width: '1280px', step: 'K3 该篇出现在其栏目列表页内（真实比对渲染结果，非源码）', expect: '存在', actual: at >= 0 ? '第 ' + (at + 1) + ' 项' : '未出现', handoff: 'Task 15' });
    if (at === 0) eq('RK3', lm.entryList.items[0].title.text, hl[i].title.text, { page: m.column.list, width: '1280px', step: 'K3 该篇正是该栏目首条时，列表页首条与首页同条', expect: lm.entryList.items[0].title.text, actual: hl[i].title.text, handoff: 'Task 15' });
  }
  await openFile('index.html'); await metrics(1280, 900);
  eq('RK3', visualOrder(hl).join('\u0001'), C.latestPages.map((p) => C.mdMeta[p].title).join('\u0001'), { page: 'index.html', width: '1280px', step: 'K3 最新区视觉次序 == 全局序前 N 条（bounding box 判，CSS order/反向 flex 也拦得住）', expect: C.latestPages.map((p) => C.mdMeta[p].title).join('|'), actual: visualOrder(hl).join('|'), handoff: 'Task 16' });
  eq('RK3/dup', C.latestPages.join('\u0001'), hl.map((x) => x.href).join('\u0001'), { page: 'index.html', width: '1280px', step: 'K3 最新区 href 集合（含重复项与顺序）逐等于全局序前 N 条', expect: C.latestPages.join('|'), actual: hl.map((x) => x.href).join('|'), handoff: 'Task 15' });

  /* ---- K4 详情页当前项高亮在所属栏目链接上 ---- */
  for (const col of C.columns) {
    for (const art of col.articles) {
      await openFile(art.page); await metrics(1280, 900);
      const m = await measure();
      const curIdx = m.linkCur.findIndex((v) => v === 'page');
      eq('RK4', col.list, curIdx >= 0 ? m.links[curIdx].href : null, { page: art.page, width: '1280px', step: 'K4 aria-current 出现在所属栏目链接上（不在详情页自身、不在首页）', expect: col.list, actual: curIdx >= 0 ? m.links[curIdx].href + '（' + m.links[curIdx].text + '）' : 'none', handoff: 'Task 15' });
      eq('RK4', 1, m.linkCur.filter((v) => v === 'page').length, { page: art.page, width: '1280px', step: 'K4 详情页恰好一个当前项高亮', expect: 1, actual: m.linkCur.filter((v) => v === 'page').length, handoff: 'Task 15' });
      const cur = m.links[curIdx];
      okf('RK4', cur && cur.color === C.ACCENT && /solid /.test(cur.bb) && cur.bb.endsWith(C.ACCENT), { page: art.page, width: '1280px', step: 'K4 当前项样式为暗红+实下边线（与冷历史基线同一配色，链 A：计算样式）', expect: C.ACCENT, actual: cur ? cur.color + ' / ' + cur.bb : 'none', handoff: 'Task 16' });
      const pxv = await ctx.clipColor('#site-navigation li:nth-child(' + (curIdx + 1) + ') .site-navigation__link');
      okf('RK4-PIX', pxv.verdict === '暗红(accent)', { page: art.page, width: '1280px', step: 'K4 当前项像素簇为暗红色系（链 B：截图采样；配色与未访问态一致，未被 visited 隐私规则改写）', expect: '暗红(accent) 距 accent 更近', actual: 'rgb(' + (pxv.rgb || []).join(',') + ') 距ink=' + pxv.distInk + ' 距accent=' + pxv.distAccent + ' 距默认紫=' + pxv.distBrowserPurple, handoff: 'Task 16' });
    }
  }

  /* ---- K5 <h1> 与标签页标题主体逐字符一致 ---- */
  for (const file of PAGES) {
    await openFile(file); await metrics(1280, 900);
    const m = await measure();
    eq('RK5', m.pageTitle.text + C.titleSuffix, m.title, { page: file, width: '1280px', step: 'K5 <title> == <h1> + 全角后缀（标签页标题主体逐字符等于 h1）', expect: m.pageTitle.text + C.titleSuffix, actual: m.title, handoff: 'Task 15' });
    okf('RK5', m.title.endsWith(C.titleSuffix) && m.pageTitle.text.indexOf(C.titleSuffix) < 0, { page: file, width: '1280px', step: 'K5 后缀「' + C.titleSuffix + '」只出现在标签页标题，不进入 <h1>', expect: 'title 含后缀 / h1 不含', actual: 'title 末=' + m.title.slice(-C.titleSuffix.length) + ' h1=' + m.pageTitle.text, handoff: 'Task 15' });
    if (C.detail[file]) okf('RK5', !/[《》]/.test(m.pageTitle.text) || C.detail[file].titleSubject.indexOf('《') >= 0, { page: file, width: '1280px', step: 'K5 详情页 <h1> 不含矩阵外的书名号（"同 <title> 主体，不含书名号"）', expect: '无额外书名号', actual: m.pageTitle.text, handoff: 'Task 15' });
  }
}

/* ---------------- R-L 列表容量压力（只在 mutants/ 副本里做） ---------------- */
export async function pressurePass(ctx) {
  const { eq, okf, A, C, metrics, measure, js, clickEl, tab, focusInfo, sleep, send, state, setDir, withDir, visualOrderOf, shotTo } = ctx;
  const dst = state.pressureDir;
  const built = withDir(() => makePressureDir({ srcDir: ctx.REAL_RESULTS, dstDir: dst, n: C.pressureN, manifest: C.manifest }));
  const page = built.pressurePage;
  A('RL0', 'rec', { page, width: '-', step: '压力副本已生成于 _qa_task19/mutants/pressure（真实 Results/ 一个字节未改，见前后哈希证明）', detail: '条目数=' + C.pressureN + ' 目录=' + dst });
  setDir(dst);
  try {
    for (const w of [375, 640, 768, 1280]) {
      await ctx.openFile(page); await metrics(w, 900);
      const m = await measure();
      eq('RL1', C.pressureN, m.entryList.items.length, { page, width: w + 'px', step: '压力样本条目数 == 合同规定的假文章条数', expect: C.pressureN, actual: m.entryList.items.length, handoff: 'Task 19 台架' });
      okf('RL2', m.scrollW <= m.clientWidth, { page, width: w + 'px', step: '30 条容量下无横向溢出（scrollWidth<=clientWidth）', expect: 'scrollW<=client', actual: m.scrollW + '<=' + m.clientWidth, handoff: 'Task 16' });
      okf('RL2', m.bodyScrollW <= m.clientWidth, { page, width: w + 'px', step: 'body.scrollWidth<=clientWidth 同样成立', expect: '≤' + m.clientWidth, actual: String(m.bodyScrollW), handoff: 'Task 16' });
      eq('RL2', [], m.scrollAreas, { page, width: w + 'px', step: '不因容量增长产生内部滚动区', expect: '0 个', actual: m.scrollAreas.join(',') || '0 个', handoff: 'Task 16' });
      eq('RL2', [], m.fixedWide, { page, width: w + 'px', step: '无超出视口的固定像素宽元素', expect: '0 个', actual: m.fixedWide.join(',') || '0 个', handoff: 'Task 16' });
      const stacked = m.entryList.items.every((it) => it.title.top < it.date.top);
      const side = m.entryList.items.every((it) => it.date.top <= it.title.bottom + 0.6 && it.date.left > it.title.right - it.title.w);
      okf('RL3', w <= C.breakpoints.mobileMax ? stacked : true, { page, width: w + 'px', step: '窄档 30 条仍保持堆叠（标题在上、日期在下）', expect: '全部 title.top<date.top', actual: m.entryList.items.slice(0, 6).map((it) => Math.round(it.title.top) + '<' + Math.round(it.date.top)).join(',') + (m.entryList.items.length > 6 ? ' …共' + m.entryList.items.length + '条' : ''), handoff: 'Task 16' });
      okf('RL3', w > C.breakpoints.mobileMax ? m.entryList.items.every((it) => it.title.top <= it.date.bottom && it.date.left >= it.title.left) : true, { page, width: w + 'px', step: '桌面档 30 条为同行两列（标题在左、日期在右）', expect: '同行且日期在标题右侧带内', actual: m.entryList.items.slice(0, 4).map((it) => Math.round(it.title.left) + '/' + Math.round(it.date.left)).join(','), handoff: 'Task 16' });
      for (let i = 0; i < m.entryList.items.length; i++) {
        const it = m.entryList.items[i];
        okf('RL4', it.link.w >= C.tapMin.w && it.link.h >= C.tapMin.h, { page, width: w + 'px', step: '第 ' + (i + 1) + '/' + C.pressureN + ' 条链接实测渲染盒 ≥' + C.tapMin.w + '×' + C.tapMin.h, expect: '≥' + C.tapMin.w + '×' + C.tapMin.h, actual: Math.round(it.link.w) + '×' + Math.round(it.link.h), handoff: 'Task 16' });
      }
      okf('RL5', m.entryList.items.every((it, i) => i === 0 || m.entryList.items[i - 1].item.bottom <= it.item.top + 0.6), { page, width: w + 'px', step: '30 条互不重叠错位（逐条 bounding box 检查）', expect: '纵向严格不重叠', actual: m.entryList.items.slice(0, 5).map((it) => Math.round(it.item.bottom) + '→' + Math.round(it.item.top)).join(','), handoff: 'Task 16' });
      okf('RL5', m.entryList.items.every((it) => it.title.sw <= it.title.cw + 0.5 && it.date.sw <= it.date.cw + 0.5), { page, width: w + 'px', step: '长标题与日期在 30 条密度下仍不溢出自身盒', expect: 'sw<=cw', actual: m.entryList.items.filter((it) => it.title.sw > it.title.cw + 0.5).length + ' 条溢出', handoff: 'Task 16' });
      eq('RL5', visualOrder(m.entryList.items).join('\u0001'), domOrder(m.entryList.items).join('\u0001'), { page, width: w + 'px', step: '压力页视觉次序 == DOM 次序（变异 1 就是打在这里）', expect: '视觉=DOM', actual: visualOrder(m.entryList.items).slice(0, 3).join('|') + '…', handoff: 'Task 16' });
      await shotTo('pressure-' + page.replace(/\.html$/, '') + '-' + w, m.docH > 1400 ? false : true);
    }
    /* 菜单展开不遮末条（30 条时末条在折叠线以下，滚动后判） */
    await ctx.openFile(page); await metrics(375, 900);
    await clickEl('#nav-toggle');
    const om = await measure();
    okf('RL6', om.nav.open === true && om.entryList.items.length === C.pressureN, { page, width: '375px/展开', step: '前置：30 条页上菜单已展开', expect: 'open=true 且条目数=' + C.pressureN, actual: 'open=' + om.nav.open + ' 条=' + om.entryList.items.length, handoff: 'Task 16' });
    const hit = await js('(() => { var li=document.querySelectorAll(".entry-list__item"); var e=li[li.length-1].querySelector("a"); e.scrollIntoView({block:"center"}); var r=e.getBoundingClientRect(); var t=document.elementFromPoint(r.x+r.width/2, r.y+r.height/2); return JSON.stringify({hit:(t&&(t.className||t.tagName)||"null"), navRect:(function(){var n=document.getElementById("site-navigation").getBoundingClientRect(); return [Math.round(n.top),Math.round(n.bottom)];})(), linkTop:Math.round(r.top)}); })()');
    okf('RL6', /entry-list/.test(String(hit.hit)) && hit.linkTop >= hit.navRect[1] - 0.5, { page, width: '375px/展开', step: '末条目在菜单展开态仍可点（elementFromPoint 命中条目自身，且位于菜单下缘之外）', expect: '命中 entry-list 且 top≥nav.bottom', actual: JSON.stringify(hit), handoff: 'Task 16' });
    const scroll = await measure();
    okf('RL6', scroll.scrollW <= scroll.clientWidth, { page, width: '375px/展开', step: '30 条 + 展开菜单仍无横向溢出', expect: 'scrollW<=client', actual: scroll.scrollW + '<=' + scroll.clientWidth, handoff: 'Task 16' });
    await shotTo('pressure-menu-open-last-item', true);
  } finally {
    setDir(ctx.REAL_RESULTS);
  }
}

/* ---------------- R-N 已访问态：计算样式与时序链（母本 visitedPass + visitedTimingPass） ---------------- */
export async function visitedPass(ctx) {
  const { eq, okf, A, C, metrics, openFile, measure, clickEl, sleep, state, PAGES } = ctx;
  /* 真实访问：先点遍所有目标页（合成点击，写历史） */
  await openFile('index.html'); await metrics(1280, 900);
  for (const t of C.columns.map((c) => c.list)) {
    const idx = C.navSpec.findIndex((n) => n.href === t);
    await clickEl('#site-navigation li:nth-child(' + (idx + 1) + ') a');
    await sleep(650);
    await clickEl('#site-navigation li:nth-child(1) a');
    await sleep(650);
  }
  for (const file of PAGES) { await openFile(file); await sleep(220); }
  for (const file of PAGES) {
    await openFile(file); await metrics(1280, 900);
    let m = await measure();
    const first = m.links.filter((l, i) => m.linkCur[i] !== 'page').map((l) => [l.text, l.color]);
    /* 0–4s 异步翻色窗口必须轮询采样，不得单次判定 */
    const timeline = [];
    for (let k = 0; k < 9; k++) { await sleep(500); m = await measure(); timeline.push((0.5 * (k + 1)).toFixed(1) + 's:' + m.links.filter((l, i) => m.linkCur[i] !== 'page').map((l) => l.color).join('/')); }
    const norm = m.links.filter((l, i) => m.linkCur[i] !== 'page');
    okf('RB5-V', norm.every((l) => l.color === C.INK), { page: file, width: '1280px/全部目标页均已访问', step: 'R-N 链 A（计算样式与时序）：访问过全部目标页后普通导航链接仍为墨色，未被 a:visited 改写为暗红（母本 visitedPass 语义）', expect: C.INK, actual: '刚加载=' + JSON.stringify(first) + ' 轮询 4.5s 后=' + JSON.stringify(norm.map((l) => [l.text, l.color])), handoff: 'Task 16' });
    A('RB5-T', 'rec', { page: file, width: '1280px/全部目标页均已访问', step: 'R-N 链 A：0–4s 异步翻色窗口逐 0.5s 采样时间线（证明本段确实轮询而非单次判定）', detail: timeline.join(' ; ') });
    eq('RB6-V', C.INK, m.mast.color, { page: file, width: '1280px/全部目标页均已访问', step: 'R-N 链 A：报头「自然选择号」访问后仍为深色文字', expect: C.INK, actual: m.mast.color, handoff: 'Task 16' });
    if (m.entryList) okf('RN2', m.entryList.items.every((it) => it.link.color === C.INK), { page: file, width: '1280px/全部目标页均已访问', step: 'R-N 链 A：列表条目链接访问后仍为墨色', expect: C.INK, actual: m.entryList.items.map((it) => it.link.color).join(','), handoff: 'Task 16' });
    if (m.homeLatest) okf('RN2', m.homeLatest.items.every((it) => it.link.color === C.INK), { page: file, width: '1280px/全部目标页均已访问', step: 'R-N 链 A：首页最新区链接访问后仍为墨色', expect: C.INK, actual: m.homeLatest.items.map((it) => it.link.color).join(','), handoff: 'Task 16' });
  }
  await shotNarrowIfNeeded(ctx);
  await openFile('index.html'); await metrics(1280, 900);
  await ctx.shot('index-1280-visited-history');
}
async function shotNarrowIfNeeded(ctx) { ctx.A('RN1', 'rec', { page: '-', width: '-', step: 'R-N 链 A 已完成（计算样式＋轮询时序），像素链见 visited-pixel 段', detail: '' }); }

/* ---------------- R-N 已访问态：像素链（母本 visitedPixelPass，只用截图采样判定） ---------------- */
export async function visitedPixelPass(ctx) {
  const { eq, okf, A, C, metrics, openFile, measure, sleep, clipColor, shot, PAGES } = ctx;
  for (let k = 0; k < 2; k++) for (const f of PAGES) { await openFile(f); await sleep(240); }
  for (const file of PAGES) {
    await openFile(file); await metrics(1280, 900);
    const m = await measure();
    const navIdx = [];
    m.links.forEach((l, i) => { if (m.linkCur[i] !== 'page') navIdx.push(i + 1); });
    const curIdx = m.linkCur.findIndex((v) => v === 'page') + 1;
    const listIdx = m.entryList ? m.entryList.items.map((it, i) => i + 1) : [];
    const latestIdx = m.homeLatest ? m.homeLatest.items.map((it, i) => i + 1) : [];
    const sample = async () => {
      const mast = await clipColor('.site-masthead__link');
      const nav = [];
      for (const i of navIdx) nav.push(await clipColor('#site-navigation li:nth-child(' + i + ') .site-navigation__link'));
      const cur = curIdx ? await clipColor('#site-navigation li:nth-child(' + curIdx + ') .site-navigation__link') : null;
      const el = [];
      /* 采链接自身盒（裁掉日期节点）：:visited 只作用在链接元素上，采内层 span 会漏看整条缺陷 */
      for (const i of listIdx) el.push(await clipColor('.entry-list__item:nth-of-type(' + i + ') .entry-list__link', '.entry-list__item:nth-of-type(' + i + ') .entry-list__date'));
      const hl = [];
      for (const i of latestIdx) hl.push(await clipColor('.home-latest__item:nth-of-type(' + i + ') .home-latest__link', '.home-latest__item:nth-of-type(' + i + ') .home-latest__date'));
      return { mast, nav, cur, el, hl };
    };
    let prev = null, stable = 0;
    const timeline = [];
    for (let k = 0; k < 5; k++) {
      await sleep(1200);
      const s = await sample();
      const sig = [s.mast.verdict].concat(s.nav.map((c) => c.verdict), [s.cur && s.cur.verdict], s.el.map((c) => c.verdict), s.hl.map((c) => c.verdict)).join(',');
      timeline.push(((k + 1) * 1.2).toFixed(1) + 's: 报头=' + s.mast.verdict + ' 非当前=' + s.nav.map((c) => c.verdict).join('/') + ' 当前=' + (s.cur && s.cur.verdict) + ' 列表=' + s.el.map((c) => c.verdict).join('/') + ' 最新=' + s.hl.map((c) => c.verdict).join('/'));
      if (sig === prev) { stable++; if (stable >= 1) break; } else { stable = 0; prev = sig; }
    }
    const s = await sample();
    okf('RN3', s.mast.verdict === '深色(ink)', { page: file, width: '1280px/全部目标页均已访问', step: 'R-N 链 B（像素）：报头链接屏幕上是深色文字，不得被 a:visited 重绘为暗红或浏览器默认紫', expect: '深色(ink) 且距 ink 最近', actual: 'rgb(' + (s.mast.rgb || []).join(',') + ') 距ink=' + s.mast.distInk + ' 距accent=' + s.mast.distAccent + ' 距默认紫=' + s.mast.distBrowserPurple, handoff: 'Task 16' });
    for (let i = 0; i < s.nav.length; i++) {
      const c = s.nav[i];
      okf('RN4', c.verdict === '深色(ink)', { page: file, width: '1280px/全部目标页均已访问', step: 'R-N 链 B（像素）：第 ' + (i + 1) + ' 个非当前页导航链接屏幕上是深色（合同：普通链接深色、当前链接暗红）', expect: '深色(ink)', actual: 'rgb(' + (c.rgb || []).join(',') + ') 距ink=' + c.distInk + ' 距accent=' + c.distAccent + ' 距默认紫=' + c.distBrowserPurple, handoff: 'Task 16' });
    }
    if (s.cur) okf('RN5', s.cur.verdict === '暗红(accent)', { page: file, width: '1280px/全部目标页均已访问', step: 'R-N 链 B（像素）：当前项屏幕上是暗红色系（配色与未访问态一致）', expect: '暗红(accent)', actual: 'rgb(' + (s.cur.rgb || []).join(',') + ') 距ink=' + s.cur.distInk + ' 距accent=' + s.cur.distAccent, handoff: 'Task 16' });
    for (let i = 0; i < s.el.length; i++) okf('RN6', s.el[i].verdict === '深色(ink)', { page: file, width: '1280px/全部目标页均已访问', step: 'R-N 链 B（像素）：第 ' + (i + 1) + ' 条 entry-list 链接屏幕上是深色 —— 取**链接自身盒裁掉日期节点**（:visited 只作用在链接元素上，内层 span 继承的是未访问值；日期自带 muted 色会污染聚类）', expect: '深色(ink)', actual: 'rgb(' + (s.el[i].rgb || []).join(',') + ') 距ink=' + s.el[i].distInk + ' 距accent=' + s.el[i].distAccent + ' 距默认紫=' + s.el[i].distBrowserPurple + ' 非纸像素=' + s.el[i].nonPaper + '/' + s.el[i].samplePoints + ' 取样盒=' + JSON.stringify(s.el[i].clip) + ' 已裁日期=' + s.el[i].cropped, handoff: 'Task 16' });
    for (let i = 0; i < s.hl.length; i++) okf('RN7', s.hl[i].verdict === '深色(ink)', { page: file, width: '1280px/全部目标页均已访问', step: 'R-N 链 B（像素）：第 ' + (i + 1) + ' 条 home-latest 链接屏幕上是深色 —— 同样取链接自身盒裁掉日期节点（变异 4 就是打在这条上）', expect: '深色(ink)', actual: 'rgb(' + (s.hl[i].rgb || []).join(',') + ') 距ink=' + s.hl[i].distInk + ' 距accent=' + s.hl[i].distAccent + ' 距默认紫=' + s.hl[i].distBrowserPurple + ' 非纸像素=' + s.hl[i].nonPaper + '/' + s.hl[i].samplePoints + ' 取样盒=' + JSON.stringify(s.hl[i].clip) + ' 已裁日期=' + s.hl[i].cropped, handoff: 'Task 16' });
    A('RN8', 'rec', { page: file, width: '1280px/全部目标页均已访问', step: 'R-N 链 B：异步翻色窗口逐 1.2s 轮询时间线（采样稳定即提前结束，未单次定论）', detail: timeline.join(' ; ') });
    await shot(file.replace(/\.html$/, '') + '-1280-visited-pixels');
  }
}

export async function visualPass(ctx) {
  const { PAGES, metrics, openFile, shot, shotNarrow, A } = ctx;
  for (const file of PAGES) {
    await openFile(file); await metrics(1280, 1200);
    await shot(file.replace(/\.html$/, '') + '-1280');
    await metrics(769, 1000);
    await shot(file.replace(/\.html$/, '') + '-769');
    const n1 = await shotNarrow(file.replace(/\.html$/, '') + '-375-closed', file, 375, 1600, 'closed');
    const n2 = await shotNarrow(file.replace(/\.html$/, '') + '-375-full', file, 375, 3000, 'closed');
    const n3 = await shotNarrow(file.replace(/\.html$/, '') + '-375-open', file, 375, 1600, 'open');
    A('VS1', 'rec', { page: file, width: '375px/iframe', step: '窄视口截图的实际视口回读自宿主标题', detail: [n1.title, n2.title, n3.title].join(' | ') });
  }
}
