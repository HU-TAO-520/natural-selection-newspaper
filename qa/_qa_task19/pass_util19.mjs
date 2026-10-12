/* Task 19 — 判据库（各段共用；判据对象一律是渲染结果） */
export const CSS_BLOB = '(() => { try { var acc=[]; var walk=function(rs){ for (var i=0;i<rs.length;i++){ var r=rs[i]; if(r.cssText) acc.push(r.cssText); if(r.cssRules) walk(r.cssRules);} }; var ss=document.styleSheets; for (var j=0;j<ss.length;j++){ try{ walk(ss[j].cssRules); }catch(e){ acc.push("READERR:"+e.name);} } return JSON.stringify({ ok:true, blob:acc.join("\\n"), n:acc.length }); } catch(e){ return JSON.stringify({ok:false, blob:String(e), n:0}); } })()';

export const visualOrder = (items) => items.slice()
  .sort((a, b) => (Math.abs(a.title.top - b.title.top) <= 2 ? a.title.left - b.title.left : a.title.top - b.title.top))
  .map((it) => it.title.text);
export const domOrder = (items) => items.map((it) => it.title.text);

export function listGeom(ctx, m, file, W, expectItems, mode) {
  const { eq, okf, C, near, px } = ctx;
  const READING_MAX = C.readingMaxRem * 16;
  const el = m.entryList;
  if (!el || !el.items.length) return;
  eq('RB8', expectItems, el.items.length, { page: file, width: W, step: '条目数 == manifest 该栏目 articles 数（清单驱动）', expect: expectItems, actual: el.items.length, handoff: 'Task 15' });
  okf('RB8', el.items.every((it) => it.link && it.title && it.date), { page: file, width: W, step: '每条 = 一个链接包标题与日期两个节点', expect: '三件套齐备', actual: el.items.map((it) => [!!it.link, !!it.title, !!it.date].join('/')).join(','), handoff: 'Task 15' });
  if (mode === 'desktop') {
    /* 版心 = min(--reading-max, 视口−2×gutter)：769px 档容器本就窄于 736px，
     * 把"恰等于 reading-max"写在 769 上是错的期望值（不是放宽，1024／1280 档仍逐像素要求等于 736） */
    const avail = m.clientWidth - 2 * (mode === 'mobile' ? 1 : C.gutterRem) * px(m.rootFont);
    const cap = Math.min(READING_MAX, avail);
    okf('RB9', near(el.container.w, cap, 1.2), { page: file, width: W, step: '列表版心 == min(--reading-max, 视口−2×gutter) 实测值', expect: cap.toFixed(1) + 'px±1.2（reading-max=' + READING_MAX + '，可用=' + avail.toFixed(1) + '）', actual: el.container.w.toFixed(1) + 'px', handoff: 'Task 16' });
    okf('RB9b', el.container.w <= cap + 1.2 && el.container.w > 0, { page: file, width: W, step: '列表版心不越出可用宽度', expect: '≤' + cap.toFixed(1), actual: el.container.w.toFixed(1), handoff: 'Task 16' });
  }
  okf('RB10', el.items.every((it, i) => i === 0 || it.item.top >= el.items[i - 1].item.bottom - 0.6), { page: file, width: W, step: '条目盒互不重叠（无重叠像素错位）', expect: '纵向不重叠', actual: el.items.map((it) => Math.round(it.item.top) + '-' + Math.round(it.item.bottom)).join(','), handoff: 'Task 16' });
  okf('RB11', el.items.every((it) => px(it.item.bt.split(' ')[0]) > 0 && /solid/.test(it.item.bt)), { page: file, width: W, step: '条目细线连续（每条有上界线）', expect: 'border-top>0 solid', actual: el.items.map((it) => it.item.bt).join('|'), handoff: 'Task 16' });
  okf('RB11', px(el.items[el.items.length - 1].item.bb.split(' ')[0]) > 0 && /solid/.test(el.items[el.items.length - 1].item.bb), { page: file, width: W, step: '末条有下界线（细线不半路消失）', expect: '末条 border-bottom>0 solid', actual: el.items[el.items.length - 1].item.bb, handoff: 'Task 16' });
  okf('RB12', el.items.every((it) => near(it.title.left, el.container.left, 1.5)), { page: file, width: W, step: '标题左缘与版心左缘对齐', expect: '≈' + el.container.left.toFixed(1), actual: el.items.map((it) => it.title.left.toFixed(1)).join(','), handoff: 'Task 16' });
  if (mode === 'desktop') {
    okf('RB12', el.items.every((it) => near(it.date.right, el.container.right, 1.5)), { page: file, width: W, step: '桌面同行两列：日期右缘与版心右缘对齐', expect: '≈' + el.container.right.toFixed(1), actual: el.items.map((it) => it.date.right.toFixed(1)).join(','), handoff: 'Task 16' });
  } else {
    /* 移动档按合同是"标题在上、日期在下"的堆叠版式，日期本来就不贴右缘；
     * 把桌面判据套到移动档会得到假红。堆叠档对齐的是同一条左缘。 */
    okf('RB12m', el.items.every((it) => near(it.date.left, el.container.left, 1.5)), { page: file, width: W, step: '移动堆叠档：日期与标题同贴版心左缘（对齐面随版式换，不放宽）', expect: '≈' + el.container.left.toFixed(1), actual: el.items.map((it) => it.date.left.toFixed(1)).join(','), handoff: 'Task 16' });
  }
  okf('RB13', el.items.every((it) => it.title.lines >= 1), { page: file, width: W, step: '标题折行数由 Range.getClientRects().length 判得 ≥1', expect: '≥1', actual: el.items.map((it) => it.title.lines).join(','), handoff: 'Task 16' });
  okf('RK2b', domOrder(el.items).join('\u0001') === visualOrder(el.items).join('\u0001'), { page: file, width: W, step: '视觉次序（bounding box 排序）== DOM 次序', expect: domOrder(el.items).join('|'), actual: visualOrder(el.items).join('|'), handoff: 'Task 16' });
}

export function homeGeom(ctx, m, file, W) {
  const { eq, okf, C } = ctx;
  const hl = m.homeLatest;
  if (!hl) return;
  eq('RK3', C.latestN, hl.items.length, { page: file, width: W, step: '首页最新区条数恒等于 R11 合同值', expect: C.latestN, actual: hl.items.length, handoff: 'Task 15' });
  okf('RK3', hl.items.every((it) => it.nestedSpans === 2 && it.href && /\.html$/.test(it.href)), { page: file, width: W, step: 'R8：每条只允许一个 a.home-latest__link 包两个 span（标题+月日）', expect: '2 个直接子 span + .html 链接', actual: hl.items.map((it) => it.nestedSpans + '/' + it.href).join(','), handoff: 'Task 15' });
  okf('RK3', hl.items.every((it) => it.nestedTags.every((t) => t === 'span')), { page: file, width: W, step: '最新区条目内不得出现 img/time/p 等第二层结构', expect: '只有 span', actual: hl.items.map((it) => it.nestedTags.join('+')).join('|'), handoff: 'Task 15' });
  okf('RK9', hl.items.every((it) => it.date && it.date.text), { page: file, width: W, step: 'R9③：display_date 齐备 → 每条带日期节点', expect: '每条有日期', actual: hl.items.map((it) => it.date && it.date.text).join(','), handoff: 'Task 15' });
  const lastSec = m.secs.length ? m.secs[m.secs.length - 1] : null;
  if (lastSec) okf('RB14', hl.container.top - lastSec.bottom >= 1, { page: file, width: W, step: '最新区与引言区不粘连（正向间距且无重叠）', expect: 'gap≥1px', actual: 'gap=' + (hl.container.top - lastSec.bottom).toFixed(1) + 'px', handoff: 'Task 16' });
  okf('RB14', hl.title === '最新报道' && (m.tagTally.h2 || 0) === 4, { page: file, width: W, step: 'R4③：最新区标题是 h2（1×h1 + 4×h2，无跳级）', expect: '最新报道 / h2=4', actual: hl.title + ' / h2=' + (m.tagTally.h2 || 0), handoff: 'Task 15' });
  okf('RK2b', domOrder(hl.items).join('\u0001') === visualOrder(hl.items).join('\u0001'), { page: file, width: W, step: '最新区视觉次序 == DOM 次序', expect: domOrder(hl.items).join('|'), actual: visualOrder(hl.items).join('|'), handoff: 'Task 16' });
}

export function stateExpect(row, o) {
  const [clsCell, navCell, ariaCell, btnCell] = [row[1], row[2], row[3], row[4]];
  return [
    { step: 'html 类', expect: clsCell, pass: /`no-js`/.test(clsCell) && !/`js`／`no-js`/.test(clsCell) ? o.htmlClasses.includes('no-js') : (/`js`/.test(clsCell) ? o.htmlClasses.includes('js') : true) },
    { step: 'is-open', expect: navCell, pass: /无 `is-open`/.test(navCell) ? o.open === false : (/有 `is-open`/.test(navCell) ? o.open === true : true) },
    { step: 'aria-expanded', expect: ariaCell, pass: /`true`/.test(ariaCell) ? o.aria === 'true' : (/`false`/.test(ariaCell) ? o.aria === 'false' : true) },
    { step: '按钮', expect: btnCell, pass: /隐藏/.test(btnCell) ? o.togDisp === 'none' : (/可见/.test(btnCell) ? o.togDisp !== 'none' : true) },
    { step: '导航显隐', expect: navCell, pass: /display:none/.test(navCell) ? o.navDisp === 'none' : (/常显/.test(navCell) ? o.navDisp !== 'none' : true) },
  ];
}
