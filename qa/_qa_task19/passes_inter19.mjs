/* Task 19 — R-D 触控焦点 / R-E 三态 / R-F 交互 / R-G 跨断点 / R-H 200% / R-I 降级 / R-J 内容 */
import { stateExpect } from './pass_util19.mjs';

/* 重复文本（三个栏目里有两条同为"9月18日"）必须按出现顺序贪心配对：
 * 逐个 indexOf 会把第二次出现也定位回第一次，读出"阅读顺序倒退"的假缺陷。 */
function seqIndex(hay, want) { let from = 0; const out = []; for (const w of want) { const i = hay.indexOf(w, from); out.push(i); if (i >= 0) from = i + 1; } return out; }

export async function tapFocus(ctx, file) {
  const { eq, okf, C, metrics, openFile, measure, js, clickEl, tab, focusInfo, enter, sleep, near, px, shot } = ctx;
  await openFile(file); await metrics(375, 900);
  await tab();
  const f0 = await focusInfo();
  eq('RD4', 'skip-link', f0.who, { page: file, width: '375px', step: '跳转链接是第一个 Tab 停靠点', expect: 'skip-link', actual: f0.who + '/' + f0.tag, handoff: 'Task 15' });
  okf('RD4', f0.top >= -0.5 && near(f0.left, 0, 0.6) && f0.h >= 24 && f0.oS === 'solid' && f0.oC === C.ACCENT, { page: file, width: '375px', step: '首次 Tab 后出现在左上角且带暗红实线轮廓', expect: 'solid ' + C.ACCENT, actual: JSON.stringify([f0.top, f0.left, f0.h, f0.oW, f0.oS, f0.oC]), handoff: 'Task 16' });
  await enter();
  const after = await measure();
  okf('RD4', after.active === 'main-content' && after.activeTag === 'MAIN', { page: file, width: '375px', step: '激活跳转链接后 #main-content 获得焦点', expect: 'MAIN/#main-content', actual: after.activeTag + '/' + after.active, handoff: 'Task 15' });
  eq('RD4', 0, after.scrollX, { page: file, width: '375px', step: '跳转不产生横向滚动', expect: 0, actual: after.scrollX, handoff: 'Task 16' });
  okf('RD4', /solid/.test(after.mainFocus.outline), { page: file, width: '375px', step: '正文焦点轮廓可感知', expect: 'solid', actual: after.mainFocus.outline, handoff: 'Task 16' });
  for (const w of [375, 768, 1280]) {
    await openFile(file); await metrics(w, 900);
    const m = await measure();
    const targets = [];
    if (m.entryList) m.entryList.items.forEach((it, i) => targets.push({ sel: '.entry-list__item:nth-of-type(' + (i + 1) + ') .entry-list__link', label: 'entry-list#' + (i + 1) }));
    if (m.homeLatest) m.homeLatest.items.forEach((it, i) => targets.push({ sel: '.home-latest__item:nth-of-type(' + (i + 1) + ') .home-latest__link', label: 'home-latest#' + (i + 1) }));
    for (const t of targets) {
      const rect = await js('(() => { var e=document.querySelector(' + JSON.stringify(t.sel) + '); if(!e) return JSON.stringify({miss:1}); var r=e.getBoundingClientRect(); return JSON.stringify({w:r.width,h:r.height}); })()');
      okf('RD1', rect && !rect.miss && rect.w >= C.tapMin.w && rect.h >= C.tapMin.h, { page: file, width: w + 'px', step: t.label + ' 实测渲染盒 ≥' + C.tapMin.w + '×' + C.tapMin.h + ' CSS px（量 getBoundingClientRect，不读 CSS 声明）', expect: '≥' + C.tapMin.w + '×' + C.tapMin.h, actual: rect ? Math.round(rect.w) + '×' + Math.round(rect.h) : 'miss', handoff: 'Task 16' });
    }
    if (!targets.length) ctx.A('RD1', 'rec', { page: file, width: w + 'px', step: '本页无列表/最新区链接（适用面为空，不判通过也不判失败）', detail: 'targets=0' });
  }
  await openFile(file); await metrics(375, 900);
  for (let i = 0; i < 8 && (await focusInfo()).who !== 'nav-toggle'; i++) await tab();
  const tf = await focusInfo();
  okf('RD3', tf.who === 'nav-toggle' && tf.oS === 'solid' && px(tf.oW) >= 2 && tf.oC === C.ACCENT && tf.clip.length === 0, { page: file, width: '375px', step: '纯键盘到达菜单按钮：暗红实线轮廓清晰且不被裁切', expect: 'solid ≥2px ' + C.ACCENT, actual: JSON.stringify([tf.who, tf.oW, tf.oS, tf.oC, tf.clip]), handoff: 'Task 16' });
  await clickEl('#nav-toggle');
  const m = await measure();
  okf('RD1', m.tog.w >= 44 && m.tog.h >= 44, { page: file, width: '375px', step: '.nav-toggle 实测渲染盒 ≥44×44', expect: '≥44×44', actual: Math.round(m.tog.w) + '×' + Math.round(m.tog.h), handoff: 'Task 16' });
  okf('RD2', m.links.length === C.navSpec.length && m.links.every((l) => l.w >= C.tapMin.w && l.h >= C.tapMin.h), { page: file, width: '375px/展开', step: '展开态每个导航链接实测点击区 ≥44×44', expect: '≥' + C.tapMin.w + '×' + C.tapMin.h, actual: m.links.map((l) => Math.round(l.w) + '×' + Math.round(l.h)).join(','), handoff: 'Task 16' });
  okf('RD2', m.links.every((l) => near(l.w, m.nav.rect.w, 1.5) && near(l.left, m.nav.rect.left, 1.5)), { page: file, width: '375px/展开', step: '链接占满行宽便于触控', expect: '≈' + Math.round(m.nav.rect.width), actual: m.links.map((l) => Math.round(l.w)).join(','), handoff: 'Task 16' });
  const linkFocus = [];
  for (let i = 0; i < C.navSpec.length; i++) { await tab(); linkFocus.push(await focusInfo()); }
  okf('RD3', linkFocus.every((f) => /site-navigation__link/.test(f.who) && f.oS === 'solid' && px(f.oW) >= 2 && f.oC === C.ACCENT && f.clip.length === 0), { page: file, width: '375px/展开', step: '逐个链接键盘焦点轮廓清晰且不被容器裁切', expect: 'solid ≥2px accent 无裁切', actual: JSON.stringify(linkFocus.map((f) => [f.who, f.oW + f.oS, f.clip.join('+')])), handoff: 'Task 16' });
  okf('RD3', linkFocus.every((f) => f.left >= 0 && f.top >= 0), { page: file, width: '375px/展开', step: '焦点环不被视口边界切掉', expect: 'left/top ≥0', actual: JSON.stringify(linkFocus.map((f) => [Math.round(f.left), Math.round(f.top)])), handoff: 'Task 16' });
  await shot(file.replace(/\.html$/, '') + '-375-open');
}

export async function triState(ctx, file) {
  const { eq, okf, A, C, metrics, openFile, measure, js, ev, clickEl, tab, focusInfo, sleep, send, shot, baseName, near } = ctx;
  const rows = C.stateRows;
  await send('Emulation.setScriptExecutionDisabled', { value: true });
  await openFile(file); await metrics(375, 900);
  let m = await measure();
  for (const e of stateExpect(rows[0], { htmlClasses: m.htmlClasses, open: m.nav.open, aria: m.togAria, togDisp: m.tog.disp, navDisp: m.nav.disp }))
    okf('RE1', e.pass, { page: file, width: '375px/禁用JS', step: '三态表「' + rows[0][0] + '」— ' + e.step + ' 与 Task0 合同单元格一致', expect: e.expect, actual: JSON.stringify({ cls: m.htmlClass, open: m.nav.open, aria: m.togAria, tog: m.tog.disp, nav: m.nav.disp }), handoff: 'Task 16／15' });
  okf('RE1', m.links.length === C.navSpec.length && m.links.every((l) => l.shown && l.h >= C.tapMin.h), { page: file, width: '375px/禁用JS', step: '无脚本时导航纵向常显、可点击、可聚焦', expect: '全部 shown 且高≥' + C.tapMin.h, actual: JSON.stringify(m.links.map((l) => [l.shown, Math.round(l.h)])), handoff: 'Task 16' });
  eq('RE1', 'column', m.navList.dir, { page: file, width: '375px/禁用JS', step: '无脚本时导航为纵向列表', expect: 'column', actual: m.navList.dir, handoff: 'Task 16' });
  const nojsTab = [];
  for (let i = 0; i < 4; i++) { await tab(); nojsTab.push(await focusInfo()); }
  okf('RE1', !nojsTab.some((f) => f.who === 'nav-toggle'), { page: file, width: '375px/禁用JS', step: '隐藏按钮不进入 Tab 顺序', expect: '不含 nav-toggle', actual: nojsTab.map((f) => f.who).join('>'), handoff: 'Task 16' });
  okf('RE1', nojsTab.some((f) => /site-navigation__link/.test(f.who)), { page: file, width: '375px/禁用JS', step: '无脚本态导航链接仍可 Tab 到达', expect: '含 site-navigation__link', actual: nojsTab.map((f) => f.who).join('>'), handoff: 'Task 16' });
  ctx.state.navCount = 0;
  await clickEl('#site-navigation li:nth-child(2) a');
  await sleep(800);
  const landed = await measure();
  okf('RE1', ctx.state.navCount > 0 && baseName(landed.url) === C.navSpec[1].href, { page: file, width: '375px/禁用JS', step: '无脚本时链接仍可点击并真实导航（Task0 正向验收）', expect: '导航 + 落地 ' + C.navSpec[1].href, actual: 'navigated=' + ctx.state.navCount + ' 落地=' + baseName(landed.url), handoff: 'Task 15' });
  await shot(file.replace(/\.html$/, '') + '-375-nojs');
  await send('Emulation.setScriptExecutionDisabled', { value: false });

  await openFile(file); await metrics(375, 900);
  m = await measure();
  for (const e of stateExpect(rows[1], { htmlClasses: m.htmlClasses, open: m.nav.open, aria: m.togAria, togDisp: m.tog.disp, navDisp: m.nav.disp }))
    okf('RE2', e.pass, { page: file, width: '375px', step: '三态表「' + rows[1][0] + '」— ' + e.step + ' 与合同一致', expect: e.expect, actual: JSON.stringify({ cls: m.htmlClass, open: m.nav.open, aria: m.togAria, tog: m.tog.disp, nav: m.nav.disp }), handoff: 'Task 16／15' });
  okf('RE2', m.links.every((l) => l.shown === false && l.nrects === 0), { page: file, width: '375px', step: '关闭态隐藏链接 offsetParent===null 且无布局盒（真正退出 Tab 顺序）', expect: 'shown=false 且 rects=0', actual: JSON.stringify(m.links.map((l) => [l.shown, l.nrects])), handoff: 'Task 16' });
  const closedH = m.header.h, closedMainTop = m.main.top;
  const t2 = [];
  for (let i = 0; i < 3; i++) { await tab(); t2.push((await focusInfo()).who); }
  okf('RE2', !t2.some((x) => /site-navigation__link/.test(x)), { page: file, width: '375px', step: '关闭态 Tab 序列不含导航链接', expect: '不含', actual: t2.join('>'), handoff: 'Task 16' });

  await openFile(file); await metrics(375, 900);
  const pre = await measure();
  await clickEl('#nav-toggle');
  m = await measure();
  for (const e of stateExpect(rows[2], { htmlClasses: m.htmlClasses, open: m.nav.open, aria: m.togAria, togDisp: m.tog.disp, navDisp: m.nav.disp }))
    okf('RE3', e.pass, { page: file, width: '375px', step: '三态表「' + rows[2][0] + '」— ' + e.step + ' 与合同一致', expect: e.expect, actual: JSON.stringify({ cls: m.htmlClass, open: m.nav.open, aria: m.togAria, tog: m.tog.disp, nav: m.nav.disp }), handoff: 'Task 16／15' });
  const ys = m.links.map((l) => Math.round(l.top));
  okf('RE3', ys.every((y, i) => i === 0 || y > ys[i - 1]), { page: file, width: '375px', step: '展开菜单项纵向排列互不重叠', expect: '严格递增', actual: ys.join(' > '), handoff: 'Task 16' });
  okf('RE3', m.nav.rect.bottom <= m.main.top + 0.6, { page: file, width: '375px', step: '展开菜单不覆盖正文起点', expect: 'nav.bottom<=main.top', actual: 'nav.bottom=' + m.nav.rect.bottom.toFixed(1) + ' main.top=' + m.main.top.toFixed(1), handoff: 'Task 16' });
  eq('RE3', pre.mastBox.top, m.mastBox.top, { page: file, width: '375px', step: '展开不使报头位移或被截断', expect: pre.mastBox.top, actual: m.mastBox.top, handoff: 'Task 16' });
  okf('RE3', m.scrollW <= m.innerWidth, { page: file, width: '375px', step: '展开态仍无横向溢出', expect: 'scrollW<=inner', actual: m.scrollW + '<=' + m.innerWidth, handoff: 'Task 16' });
  okf('RE2', m.header.h - closedH >= m.links.reduce((a, l) => a + l.h, 0) - 4 && m.main.top > closedMainTop, { page: file, width: '375px', step: '只有展开才增高并把正文下推（隐藏导航不留异常空白）', expect: 'Δheader≈Σ链接高 且 main.top 下移', actual: 'Δ=' + Math.round(m.header.h - closedH) + ' Σ=' + Math.round(m.links.reduce((a, l) => a + l.h, 0)) + ' main.top ' + closedMainTop + '->' + m.main.top, handoff: 'Task 16' });
  const btn = await focusInfo();
  eq('RE3', 'nav-toggle', btn.who, { page: file, width: '375px', step: '点击打开后焦点仍在按钮（披露式，不强制移入）', expect: 'nav-toggle', actual: btn.who, handoff: 'Task 15' });
  const who = [];
  for (let i = 0; i < C.navSpec.length + 1; i++) { await tab(); who.push((await focusInfo()).who); }
  okf('RE3', who.slice(0, C.navSpec.length).every((x) => /site-navigation__link/.test(x)), { page: file, width: '375px', step: 'Tab 顺序自然：按钮→' + C.navSpec.length + ' 个导航链接（无焦点陷阱）', expect: '前 ' + C.navSpec.length + ' 站全是链接', actual: who.join('>'), handoff: 'Task 16' });
  okf('RE4', m.nav.open === (m.togAria === 'true'), { page: file, width: '375px', step: 'is-open 与 aria-expanded 同步（打开）', expect: '同步', actual: 'open=' + m.nav.open + ' aria=' + m.togAria, handoff: 'Task 15' });
  await clickEl('#nav-toggle');
  m = await measure();
  okf('RE4', m.nav.open === false && m.togAria === 'false', { page: file, width: '375px', step: 'is-open 与 aria-expanded 同步（关闭）', expect: 'false/false', actual: 'open=' + m.nav.open + ' aria=' + m.togAria, handoff: 'Task 15' });

  await metrics(C.breakpoints.desktopMin, 900);
  const dm = await measure();
  for (const e of stateExpect(rows[3], { htmlClasses: dm.htmlClasses, open: dm.nav.open, aria: dm.togAria, togDisp: dm.tog.disp, navDisp: dm.nav.disp }))
    okf('RE5', e.pass, { page: file, width: C.breakpoints.desktopMin + 'px', step: '三态表「' + rows[3][0] + '」— ' + e.step + ' 与合同一致', expect: e.expect, actual: JSON.stringify({ cls: dm.htmlClass, open: dm.nav.open, aria: dm.togAria, tog: dm.tog.disp, nav: dm.nav.disp }), handoff: 'Task 16／15' });
  if (dm.entryList) {
    await metrics(375, 900); await clickEl('#nav-toggle');
    const hit = await js('(() => { var e=document.querySelector(".entry-list__item:last-child .entry-list__link"); var r=e.getBoundingClientRect(); var t=document.elementFromPoint(r.x+r.width/2, Math.min(r.y+r.height/2, innerHeight-1)); return JSON.stringify({below:r.bottom>innerHeight, hit:(t&&(t.className||t.tagName)||"null")}); })()');
    okf('RE3', hit.below || /entry-list/.test(String(hit.hit)), { page: file, width: '375px/展开', step: '展开菜单不遮挡末条目可点性（elementFromPoint 命中条目自身节点）', expect: '命中 entry-list 内部节点', actual: JSON.stringify(hit), handoff: 'Task 16' });
  }
}

export async function interactions(ctx, file) {
  const { A, eq, okf, C, metrics, openFile, measure, js, ev, clickEl, tab, enter, space, esc, focusInfo, sleep, state, noiseSince } = ctx;
  const n0 = state.noise.length;
  await openFile(file); await metrics(375, 900);
  await clickEl('#nav-toggle');
  let m = await measure();
  okf('RF1', m.nav.open === true && m.togAria === 'true', { page: file, width: '375px', step: '鼠标点击打开一次：状态与 ARIA 同步', expect: 'true/true', actual: m.nav.open + '/' + m.togAria, handoff: 'Task 15' });
  await clickEl('#nav-toggle');
  m = await measure();
  okf('RF1', m.nav.open === false && m.togAria === 'false', { page: file, width: '375px', step: '鼠标点击关闭一次：状态与 ARIA 同步', expect: 'false/false', actual: m.nav.open + '/' + m.togAria, handoff: 'Task 15' });
  await openFile(file); await metrics(375, 900);
  await ev('window.__c = 0; document.getElementById("nav-toggle").addEventListener("click", function () { window.__c++; });');
  let c = await ev('window.__c');
  await clickEl('#nav-toggle');
  let c2 = await ev('window.__c');
  m = await measure();
  eq('RF2', 1, c2 - c, { page: file, width: '375px', step: '鼠标点击：click 计数器 Δ===1（不双触发）', expect: 1, actual: c2 - c, handoff: 'Task 15' });
  okf('RF2', m.nav.open === (m.togAria === 'true') && m.nav.open === true, { page: file, width: '375px', step: '点击后 is-open 与 aria-expanded 同步为 true', expect: 'true/true', actual: m.nav.open + '/' + m.togAria, handoff: 'Task 15' });
  for (let i = 0; i < 8 && (await focusInfo()).who !== 'nav-toggle'; i++) await tab();
  /* 键盘激活一律用"翻转判据"而非绝对状态：本段前面已额外测过一次鼠标点击 Δ，
   * 菜单处于打开态，按绝对态断言会因奇偶错位得到假缺陷（判据只许加严，此处是把它改准）。 */
  for (let k = 0; k < 4; k++) {
    const isEnter = k % 2 === 0;
    const was = (await measure()).nav.open;
    c = await ev('window.__c');
    await (isEnter ? enter() : space());
    m = await measure();
    c2 = await ev('window.__c');
    eq('RF2', 1, c2 - c, { page: file, width: '375px', step: (isEnter ? 'Enter（keydown 相位激活）' : 'Space（keyup 相位激活，两相位间隔 80ms）') + ' 第 ' + (Math.floor(k / 2) + 1) + ' 轮：click 计数器 Δ===1，无双触发', expect: 1, actual: c2 - c, handoff: 'Task 15' });
    okf('RF2', m.nav.open === !was && m.togAria === String(!was), { page: file, width: '375px', step: (isEnter ? 'Enter' : 'Space') + ' 激活后状态由 ' + was + ' 翻转为 ' + !was + '，且 is-open 与 aria-expanded 同步', expect: 'open=' + (!was) + ' / aria=' + (!was), actual: 'open=' + m.nav.open + ' / aria=' + m.togAria, handoff: 'Task 15' });
  }
  await openFile(file); await metrics(375, 900);
  await clickEl('#nav-toggle');
  m = await measure();
  const diag = await js('(() => { var t=document.getElementById("nav-toggle"); if(!t) return JSON.stringify({miss:1}); var r=t.getBoundingClientRect(); var e=document.elementFromPoint(Math.round(r.x+r.width/2), Math.round(r.y+r.height/2)); return JSON.stringify({rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)], hit:(e&&(e.id||e.className||e.tagName)||null), scrollY:Math.round(scrollY), open:document.getElementById("site-navigation").classList.contains("is-open"), doc:location.pathname.split("/").pop()}); })()');
  A('RF0', 'rec', { page: file, width: '375px', step: 'RF3 前置诊断：按钮盒位置／点击实际命中元素／滚动量／当前文档（判据落点说明，不计分）', detail: JSON.stringify(diag) });
  okf('RF3', m.nav.open === true, { page: file, width: '375px', step: '前置：菜单为打开态', expect: 'true', actual: String(m.nav.open) + ' 诊断=' + JSON.stringify(diag), handoff: 'Task 15' });
  await tab();
  const onLink = (await focusInfo()).who;
  await esc(); m = await measure();
  const af = await focusInfo();
  okf('RF3', m.nav.open === false && m.togAria === 'false' && af.who === 'nav-toggle', { page: file, width: '375px', step: '打开态（焦点在 ' + onLink + '）按 Esc：关闭菜单且焦点归还按钮', expect: 'open=false aria=false focus=nav-toggle', actual: JSON.stringify([m.nav.open, m.togAria, af.who]), handoff: 'Task 15' });
  const s1 = await measure();
  await esc(); await metrics(375, 1300); await esc(); await metrics(375, 900); await sleep(200);
  const s2 = await measure();
  okf('RF3', s2.nav.open === false && s2.active === s1.active && s2.scrollY === s1.scrollY, { page: file, width: '375px', step: '关闭态按 Esc 无副作用（不抢焦点、不滚动）', expect: '状态/焦点/滚动均不变', actual: JSON.stringify([s2.nav.open, s2.active, s2.scrollY, s1.active, s1.scrollY]), handoff: 'Task 15' });
  for (const idx of [2, C.navSpec.length]) {
    await openFile(file); await metrics(375, 900);
    await clickEl('#nav-toggle');
    m = await measure();
    if (!m.nav.open) { okf('RF4', false, { page: file, width: '375px', step: '前置打开（第 ' + idx + ' 项）', expect: 'true', actual: 'open=' + m.nav.open, handoff: 'Task 15' }); continue; }
    state.navCount = 0;
    const wantTxt = await js('(() => { var a=document.querySelectorAll(".site-navigation__link")[' + (idx - 1) + ']; return JSON.stringify({text:a.textContent, href:a.getAttribute("href")}); })()');
    await clickEl('#site-navigation li:nth-child(' + idx + ') a');
    await sleep(900);
    const land = await measure();
    okf('RF4', state.navCount > 0 && land.nav.open === false && land.togAria === 'false', { page: file, width: '375px', step: '打开态点击第 ' + idx + ' 项「' + wantTxt.text + '」：先关闭再导航，落地无展开残留', expect: 'navigated>0 且 open=false', actual: 'navigated=' + state.navCount + ' open=' + land.nav.open + ' aria=' + land.togAria, handoff: 'Task 15' });
    eq('RF4', C.titleSubject[wantTxt.href] + C.titleSuffix, land.title, { page: file, width: '375px', step: '点击「' + wantTxt.text + '」到达现有页面且标题正确', expect: C.titleSubject[wantTxt.href] + C.titleSuffix, actual: land.title, handoff: 'Task 15' });
  }
  await openFile(file); await metrics(375, 900);
  await clickEl('#nav-toggle');
  const mm = await measure();
  const safe = await js('(() => { var main=document.querySelector(".main-content");'
    + 'var els=[].slice.call(main.querySelectorAll("p,h1,h2,li"));'
    + 'for (var i=els.length-1;i>=0;i--){ var e=els[i]; if(e.closest("nav")||e.closest("a")||e.closest("button")) continue;'
    + 'var r=e.getBoundingClientRect(); var x=Math.round(r.left+r.width/2), y=Math.round(r.top+Math.min(r.height/2,24));'
    + 'if (y<1||y>window.innerHeight-1) continue; var t=document.elementFromPoint(x,y);'
    + 'if (t && (t===e||e.contains(t)) && !t.closest("a") && !t.closest("button") && !t.closest("nav")) return JSON.stringify({x:x,y:y,txt:(t.textContent||"").trim().slice(0,18)}); }'
    + 'return JSON.stringify({x:6,y:Math.max(1,window.innerHeight-6),txt:"fallback"}); })()');
  await clickEl(null, safe.x, safe.y);
  m = await measure();
  okf('RF7', m.nav.open === true && m.togAria === 'true', { page: file, width: '375px', step: '点击菜单外正文区域：菜单保持展开（合同未要求外点关闭，此项记录不判失败）', expect: 'true/true', actual: m.nav.open + '/' + m.togAria, handoff: '—' });
  okf('RF6', m.navFlagged.length === 0 && ['block', 'flex'].includes(m.nav.disp), { page: file, width: '375px', step: '折叠由 CSS display 负责：脚本未用 tabindex/aria-hidden/hidden/inert 管理可聚焦性', expect: '无被标记属性', actual: JSON.stringify(m.navFlagged) + ' nav=' + m.nav.disp, handoff: 'Task 15' });
  eq('RF5', [], noiseSince(n0), { page: file, width: '375px', step: '全部交互过程控制台 0 报错 0 异常失焦', expect: '0 条', actual: noiseSince(n0).join(' | ') || '0 条', handoff: 'Task 15' });
}

export async function crossBreak(ctx, file) {
  const { eq, okf, C, metrics, openFile, measure, ev, clickEl, tab, focusInfo, sleep, shot, near, px } = ctx;
  const MB = C.breakpoints.mobileMax, DB = C.breakpoints.desktopMin;
  await openFile(file); await metrics(MB, 900);
  await clickEl('#nav-toggle');
  let m = await measure();
  okf('RG1', m.nav.open === true && m.mqM && !m.mqD, { page: file, width: MB + 'px', step: '前置：' + MB + 'px 打开菜单', expect: 'open=true 且命中移动断点', actual: 'open=' + m.nav.open + ' mqM=' + m.mqM, handoff: 'Task 15' });
  await ev('(() => { window.__mq = []; var x = matchMedia("(min-width: ' + DB + 'px)"); x.addEventListener("change", function (e) { window.__mq.push("change:" + e.matches); }); return 1; })()');
  await metrics(DB, 900);
  await sleep(420);
  m = await measure();
  const mq = await ev('JSON.stringify(window.__mq || [])');
  okf('RG1', String(mq).includes('true'), { page: file, width: MB + '→' + DB + 'px', step: '对照监听：本渲染环境确实派发 mediaquery change 事件（判据成立的前提；--dump-dom 模式不派发，故本段一律 CDP 覆盖）', expect: '含 change:true', actual: String(mq), handoff: 'Task 19 驱动自身' });
  okf('RG1', m.nav.open === false && m.togAria === 'false', { page: file, width: MB + '→' + DB + 'px', step: '跨到桌面断点：is-open 清除且 aria-expanded 重置 false', expect: 'false/false', actual: 'open=' + m.nav.open + ' aria=' + m.togAria, handoff: 'Task 15' });
  okf('RG1', m.tog.disp === 'none' && m.nav.disp !== 'none' && m.links.every((l) => l.shown), { page: file, width: DB + 'px', step: '按钮隐藏、导航恢复横向常显', expect: 'tog=none nav≠none 全 shown', actual: m.tog.disp + '/' + m.nav.disp, handoff: 'Task 15' });
  const tops = m.links.map((l) => Math.round(l.top));
  okf('RG1', tops.every((t) => Math.abs(t - tops[0]) <= 1), { page: file, width: DB + 'px', step: '移动 display:none/纵向规则不再作用（同一行）', expect: 'tops 全等±1', actual: tops.join(','), handoff: 'Task 16' });
  const avail = m.clientWidth - 2 * C.gutterRem * px(m.rootFont);
  okf('RG1', px(m.mast.fs) === 64 && near(m.headerInner.w, avail, 1.2) && m.navList.gap !== '0px', { page: file, width: DB + 'px', step: '移动字号与移动间距退出，桌面基线回来（报头 64px、版心=视口−2×2rem、gap 恢复）', expect: 'mast=64px 版心=' + avail.toFixed(1) + ' gap≠0', actual: 'mast=' + m.mast.fs + ' 版心=' + m.headerInner.w.toFixed(1) + ' gap=' + m.navList.gap, handoff: 'Task 16' });
  await metrics(MB, 900); await sleep(400);
  m = await measure();
  okf('RG2', m.nav.open === false && m.togAria === 'false', { page: file, width: MB + 'px', step: '缩回 ≤' + MB + 'px：菜单为关闭态，不复用旧展开状态', expect: 'false/false', actual: 'open=' + m.nav.open, handoff: 'Task 15' });
  await clickEl('#nav-toggle'); m = await measure();
  okf('RG2', m.nav.open === true && m.togAria === 'true', { page: file, width: MB + 'px', step: '缩回后仍可正常打开', expect: 'true/true', actual: 'open=' + m.nav.open, handoff: 'Task 15' });
  await metrics(DB, 900); await sleep(280); await metrics(1280, 900); await sleep(240);
  const z = await measure();
  okf('RG3', z.scrollW <= z.innerWidth && z.nav.open === false, { page: file, width: MB + '→' + DB + '→' + MB + '→' + DB + '→1280 往复', step: '切换过程无布局跳变残留、无横向溢出', expect: 'scrollW<=inner 且 open=false', actual: 'scrollW=' + z.scrollW + ' inner=' + z.innerWidth + ' open=' + z.nav.open, handoff: 'Task 16' });
  await shot(file.replace(/\.html$/, '') + '-after-reset');
}

export async function zoom200(ctx, file) {
  const { eq, okf, C, metrics, openFile, measure, js, clickEl, tab, focusInfo, sleep, send, shot, near } = ctx;
  await openFile(file); await metrics(1280, 900);
  const before = await measure();
  eq('RH1', 1280, before.innerWidth, { page: file, width: '1280px/100%', step: '记录缩放前 CSS 视口', expect: 1280, actual: before.innerWidth, handoff: '—' });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false, zoom: 2 }).catch(() => {});
  await sleep(320);
  const zp = await measure();
  const noop = zp.innerWidth >= 1280 && zp.dpr === 1;
  await send('Emulation.setDeviceMetricsOverride', { width: C.widths.zoom, height: 900, deviceScaleFactor: 2, mobile: false });
  await sleep(320);
  let m = await measure();
  okf('RH1', m.innerWidth === C.widths.zoom && m.dpr === 2, { page: file, width: '200%（1280÷2 布局 + dpr2 绘制）', step: '缩放两效同时成立：CSS 视口折半且绘制翻倍（CDP zoom 参数在本机为 no-op=' + noop + '，已由 zoom_probe19.mjs 单独取证）', expect: 'innerWidth=' + C.widths.zoom + ' dpr=2', actual: 'inner=' + m.innerWidth + ' dpr=' + m.dpr, handoff: '—' });
  okf('RH1', Math.round(m.mast.w * m.dpr) >= Math.round(before.mast.w * before.dpr) * 1.5, { page: file, width: '200%', step: '以 rect.width × dpr 佐证实际绘制像素翻倍', expect: '≥100% 时 1.5 倍', actual: Math.round(m.mast.w * m.dpr) + ' vs ' + Math.round(before.mast.w * before.dpr), handoff: '—' });
  eq('RH1', before.rootFont, m.rootFont, { page: file, width: '200%', step: '根字号未锁死为像素（缩放按 CSS px 等比生效）', expect: before.rootFont, actual: m.rootFont, handoff: 'Task 16' });
  if (m.innerWidth <= C.breakpoints.mobileMax) {
    okf('RH2', m.mqM === true && m.mqD === false && m.tog.disp !== 'none' && m.nav.disp === 'none', { page: file, width: '200%→' + m.innerWidth + 'px', step: '缩放后进入移动布局（预期正确结果）：按钮可见、导航折叠', expect: 'mqM=true tog≠none nav=none', actual: 'mqM=' + m.mqM + ' tog=' + m.tog.disp + ' nav=' + m.nav.disp, handoff: '—' });
    await clickEl('#nav-toggle');
    m = await measure();
    okf('RH2', m.nav.open === true && m.links.every((l) => l.shown && l.w >= 44 && l.h >= 44), { page: file, width: '200%→' + m.innerWidth + 'px', step: '缩放下复查菜单三态与触控下限', expect: 'open + ≥44×44', actual: JSON.stringify(m.links.map((l) => [Math.round(l.w), Math.round(l.h)])), handoff: 'Task 16' });
    const list = (m.entryList && m.entryList.items) || (m.homeLatest && m.homeLatest.items) || [];
    okf('RH2', list.every((it) => it.link.w >= 44 && it.link.h >= 44), { page: file, width: '200%→' + m.innerWidth + 'px', step: '缩放下列表/最新区链接实测仍 ≥44×44', expect: '≥44×44', actual: list.map((it) => Math.round(it.link.w) + '×' + Math.round(it.link.h)).join(',') || '（本页无此类链接）', handoff: 'Task 16' });
    await tab();
    const f = await focusInfo();
    okf('RH3', f.oS === 'solid' && f.oC === C.ACCENT, { page: file, width: '200%→' + m.innerWidth + 'px', step: '缩放下焦点未丢失：Tab 后仍有暗红实线轮廓', expect: 'solid accent', actual: JSON.stringify([f.who, f.oW, f.oS, f.oC]), handoff: 'Task 16' });
    await clickEl('#nav-toggle');
  } else {
    okf('RH2', m.mqD === true && m.links.every((l) => l.shown) && m.tog.disp === 'none', { page: file, width: '200%→' + m.innerWidth + 'px', step: '缩放后仍 ≥桌面断点：保持横向导航', expect: 'mqD=true', actual: 'inner=' + m.innerWidth, handoff: 'Task 16' });
  }
  okf('RH3', m.scrollW <= m.innerWidth && m.scrollW <= m.clientWidth, { page: file, width: '200%→' + m.innerWidth + 'px', step: '200% 下无横向滚动', expect: 'scrollW<=inner/client', actual: m.scrollW + '<=' + m.innerWidth + '/' + m.clientWidth, handoff: 'Task 16' });
  okf('RH3', m.mast.sw <= m.mast.cw + 0.5 && m.pageTitle.sw <= m.pageTitle.cw + 0.5 && m.nav.rect.right <= m.clientWidth + 0.5, { page: file, width: '200%→' + m.innerWidth + 'px', step: '无文字裁切、元素不越界', expect: 'scroll<=client 且不越界', actual: 'mast ' + m.mast.sw + '/' + m.mast.cw + ' title ' + m.pageTitle.sw + '/' + m.pageTitle.cw, handoff: 'Task 16' });
  const hit = await js('(() => { var n=document.getElementById("site-navigation"), mn=document.querySelector(".main-content"); var a=n.getBoundingClientRect(), b=mn.getBoundingClientRect(); return JSON.stringify({hidden:getComputedStyle(n).display==="none", overlap:a.bottom>b.top+0.6}); })()');
  okf('RH3', hit.hidden === true || hit.overlap === false, { page: file, width: '200%→' + m.innerWidth + 'px', step: '元素不重叠（折叠时导航不占位，展开时不压正文）', expect: '折叠或不相交', actual: JSON.stringify(hit), handoff: 'Task 16' });
  await shot(file.replace(/\.html$/, '') + '-zoom200');
  await metrics(1280, 900); await sleep(240);
  const back = await measure();
  okf('RH3', back.innerWidth === 1280 && back.nav.open === false && near(back.headerInner.w, before.headerInner.w, 1), { page: file, width: '1280px/回到100%', step: '恢复 100% 后布局与状态无残留', expect: 'inner=1280 open=false 版心回基线', actual: 'inner=' + back.innerWidth + ' 版心=' + back.headerInner.w.toFixed(1) + ' open=' + back.nav.open, handoff: 'Task 15' });
}

export async function degrade(ctx, file) {
  const { eq, okf, C, metrics, openFile, measure, js, ev, clickEl, tab, focusInfo, sleep, send, shot, baseName, axForLinks, near } = ctx;
  await send('Emulation.setScriptExecutionDisabled', { value: true });
  await openFile(file); await metrics(1280, 900);
  let m = await measure();
  okf('RI1', m.htmlClasses.includes('no-js') && m.sheets.length === 1 && m.sheets[0].rules >= 40, { page: file, width: '1280px/禁用JS', step: '禁用 JS 并重新加载：html 保持 no-js 且 CSS 仍生效（样式不依赖脚本）', expect: 'no-js + 1 张表 ≥40 规则', actual: m.htmlClass + ' rules=' + (m.sheets[0] || {}).rules, handoff: 'Task 15' });
  const wantParas = C.detail[file] ? C.detail[file].paragraphs.map((p) => p.text) : [];
  if (wantParas.length) eq('RI1', wantParas, m.paras, { page: file, width: '1280px/禁用JS', step: '无脚本时正文完整可见且逐段等于 Task13 基线（内容不是运行时拼装）', expect: wantParas.length + ' 段，首段起 ' + String(wantParas[0]).slice(0, 24), actual: m.paras.length + ' 段，首段起 ' + String(m.paras[0] || '').slice(0, 24), handoff: 'Task 15' });
  if (file === 'index.html') {
    eq('RI1', [C.frozen.P_ORIGIN, C.frozen.P_WORK, C.frozen.P_FOUNDED], m.secTexts, { page: file, width: '1280px/禁用JS', step: '无脚本时首页三段仍逐字符等于 Task4 冻结值', expect: C.frozen.P_FOUNDED, actual: (m.secTexts || [])[2], handoff: 'Task 15' });
    eq('RI1', C.latestN, m.homeLatest ? m.homeLatest.items.length : 0, { page: file, width: '1280px/禁用JS', step: '无脚本时首页最新区仍完整可读', expect: C.latestN, actual: m.homeLatest ? m.homeLatest.items.length : '缺失', handoff: 'Task 15' });
  }
  if (m.entryList) okf('RI1', m.entryList.items.length > 0 && m.entryList.items.every((it) => it.link.shown), { page: file, width: '1280px/禁用JS', step: '无脚本时列表页条目仍完整可见', expect: '全部 shown', actual: JSON.stringify(m.entryList.items.map((it) => [it.link.shown, it.title.text.slice(0, 8)])), handoff: 'Task 15' });
  const linksOk = await js('(() => { var a=document.querySelectorAll("a"); return JSON.stringify({n:a.length, withHref:[].slice.call(a).filter(function(x){return x.getAttribute("href");}).length}); })()');
  okf('RI1', linksOk.n === linksOk.withHref && linksOk.n >= 5, { page: file, width: '1280px/禁用JS', step: '无脚本时链接属性齐备（链接可点的前提）', expect: '全部带 href 且 ≥5 个', actual: JSON.stringify(linksOk), handoff: 'Task 15' });
  ctx.state.navCount = 0;
  await clickEl('#site-navigation li:nth-child(1) a');
  await sleep(800);
  const landed = await measure();
  okf('RI1', ctx.state.navCount > 0 && baseName(landed.url) === 'index.html', { page: file, width: '1280px/禁用JS', step: '无脚本时点击导航真的完成导航（落地页校验）', expect: 'index.html', actual: 'navigated=' + ctx.state.navCount + ' 落地=' + baseName(landed.url), handoff: 'Task 15' });
  await shot(file.replace(/\.html$/, '') + '-1280-nojs');
  await send('Emulation.setScriptExecutionDisabled', { value: false });

  await openFile(file); await metrics(1280, 900);
  const withCss = await measure();
  await ev('(() => { var ss=document.styleSheets; for (var i=0;i<ss.length;i++) ss[i].disabled=true; return 1; })()');
  await sleep(240);
  const m2 = await measure();
  okf('RI2', m2.sheets.length > 0 && m2.sheets.every((s) => s.disabled === true) && m2.bodyBg === 'rgba(0, 0, 0, 0)', { page: file, width: '1280px/禁用CSS', step: 'CSS 已真实停用（纸色底回退为浏览器默认）', expect: 'disabled=true + 透明底', actual: JSON.stringify(m2.sheets.map((s) => s.disabled)) + ' bg=' + m2.bodyBg, handoff: '—' });
  okf('RI2', m2.paras.length === withCss.paras.length && m2.mainText === withCss.mainText, { page: file, width: '1280px/禁用CSS', step: '无内容因样式缺失而消失（main textContent 全等）', expect: '文本不变', actual: '段=' + m2.paras.length + ' 字符=' + m2.mainText.length, handoff: 'Task 15' });
  const texts = await js('(() => { var out=[]; var w=document.createTreeWalker(document.querySelector(".main-content"), NodeFilter.SHOW_TEXT); while(w.nextNode()){ var t=w.currentNode.nodeValue.trim(); if(t) out.push(t); } return JSON.stringify(out); })()');
  if (file === 'index.html') {
    const founded = String(C.frozen.P_FOUNDED);
    const entry = C.homeEntryText || '鸽子衔枝之年';
    const at = founded.indexOf(entry);
    const foundedNodes = at < 0 ? [founded]
      : [founded.slice(0, at), entry, founded.slice(at + entry.length)].filter((x) => x !== '');
    const want = [C.h1Expected[file], m.secTitles[0], C.frozen.P_ORIGIN, m.secTitles[1], C.frozen.P_WORK, m.secTitles[2]]
      .concat(foundedNodes).concat(['最新报道'])
      .concat(withCss.homeLatest ? withCss.homeLatest.items.map((it) => [it.title.text, it.date.text]).flat() : []);
    const idx = seqIndex(texts, want);
    okf('RI2', idx.every((i) => i >= 0) && idx.every((v, i) => i === 0 || v > idx[i - 1]), { page: file, width: '1280px/禁用CSS', step: '首页禁 CSS 后阅读顺序：主标题→三区块→最新区（含每条标题与月日）', expect: '索引严格递增且全部命中', actual: JSON.stringify(idx) + '（文本节点 ' + texts.length + ' 个）', handoff: 'Task 15' });
  } else if (C.detail[file]) {
    const b = C.detail[file];
    const [iType, iTitle, iBy] = seqIndex(texts, [b.articleType, b.h1, b.byline]);
    const iBody = texts.findIndex((x, i) => i > iBy && x.length > 1 && b.paragraphs[0].text.indexOf(x) === 0);
    okf('RI2', iType >= 0 && iTitle > iType && iBy > iTitle && iBody > iBy, { page: file, width: '1280px/禁用CSS', step: '详情页禁 CSS 后阅读顺序：类型→标题→署名→正文', expect: '索引递增', actual: JSON.stringify([iType, iTitle, iBy, iBody]) + '/共 ' + texts.length, handoff: 'Task 15' });
    if (b.date && b.date.present) eq('RI2', texts.length - 1, texts.lastIndexOf(b.date.text), { page: file, width: '1280px/禁用CSS', step: '末尾日期位于阅读顺序最后一步', expect: texts.length - 1, actual: texts.lastIndexOf(b.date.text), handoff: 'Task 15' });
  } else {
    const idxList = [C.h1Expected[file]].concat(m2.entryList ? m2.entryList.items.map((it) => [it.title.text, it.date.text]).flat() : []);
    const idx = seqIndex(texts, idxList);
    okf('RI2', idx.every((i) => i >= 0) && idx.every((v, i) => i === 0 || v > idx[i - 1]), { page: file, width: '1280px/禁用CSS', step: '栏目页禁 CSS 后阅读顺序：栏目名→各条目（标题+月日）', expect: '索引递增且全部命中', actual: JSON.stringify(idx), handoff: 'Task 15' });
  }
  const navNow = await js('(() => { var n=document.getElementById("site-navigation"); return JSON.stringify({disp:getComputedStyle(n).display, links:n.querySelectorAll("a").length}); })()');
  okf('RI2', navNow.disp !== 'none' && navNow.links === C.navSpec.length, { page: file, width: '1280px/禁用CSS', step: '禁 CSS 后导航仍在文档树中且链接数不变', expect: '显示 + ' + C.navSpec.length + ' 链接', actual: JSON.stringify(navNow), handoff: 'Task 16' });
  const ax = await axForLinks();
  eq('RI2', withCss.links.map((l) => l.text), ax.map((n) => n.name), { page: file, width: '1280px/禁用CSS', step: '导航链接仍在无障碍树中（role/name 不因禁 CSS 消失）', expect: withCss.links.map((l) => l.text).join('|'), actual: ax.map((n) => n.name).join('|'), handoff: 'Task 16' });
  await openFile(file); await metrics(1280, 900);
  const m3 = await measure();
  okf('RI3', m3.htmlClasses.includes('js') && m3.sheets.every((s) => !s.disabled) && m3.bodyBg === C.PAPER && near(m3.headerInner.w, withCss.headerInner.w, 0.6), { page: file, width: '1280px', step: '恢复启用并重新加载：回到基线、无残留', expect: 'js + 启用 + ' + C.PAPER, actual: m3.htmlClass + ' bg=' + m3.bodyBg + ' 版心=' + m3.headerInner.w.toFixed(1), handoff: 'Task 15' });
}

export async function contentPass(ctx, file) {
  const { eq, okf, C, metrics, openFile, measure, js, cps } = ctx;
  await openFile(file); await metrics(1280, 900);
  const d = await measure();
  await metrics(375, 900);
  const m = await measure();
  if (C.detail[file]) {
    const b = C.detail[file];
    eq('RJ2', b.paragraphCount, m.paras.length, { page: file, width: '375px', step: '段落数量 == Task13 基线', expect: b.paragraphCount, actual: m.paras.length, handoff: 'Task 15' });
    b.paragraphs.forEach((p, i) => {
      eq('RJ1', p.codepoints.join(' '), cps(m.paras[i] || ''), { page: file, width: '375px', step: '第 ' + (i + 1) + '/' + b.paragraphCount + ' 段浏览器所见与基线码点级全等（移动档）', expect: p.codepoints.length + ' 码点', actual: cps(m.paras[i] || '').split(' ').length + ' 码点', handoff: 'Task 15' });
      eq('RJ1', p.codepoints.join(' '), cps(d.paras[i] || ''), { page: file, width: '1280px', step: '第 ' + (i + 1) + '/' + b.paragraphCount + ' 段桌面档码点级全等（跨断点文本不受 CSS 影响）', expect: '基线第 ' + (i + 1) + ' 段', actual: '桌面第 ' + (i + 1) + ' 段 ' + cps(d.paras[i] || '').split(' ').length + ' 码点', handoff: 'Task 16' });
    });
    eq('RJ1', b.paragraphs.map((p) => p.text).join('\u0001'), m.paras.join('\u0001'), { page: file, width: '375px', step: '整篇正文拼接后逐字符全等', expect: b.paragraphCharTotal + ' 字符', actual: m.paras.join('').length + ' 字符', handoff: 'Task 15' });
    eq('RJ1', d.paras.join('\u0001'), m.paras.join('\u0001'), { page: file, width: '1280 vs 375', step: '跨断点所见正文文本一致', expect: '两档相同', actual: '桌面 ' + d.paras.join('').length + ' 字符 / 移动 ' + m.paras.join('').length + ' 字符', handoff: 'Task 16' });
    eq('RJ1', b.h1, d.artTitle ? d.artTitle.text : null, { page: file, width: '1280px', step: '详情页 <h1> 与基线逐字符一致', expect: b.h1, actual: d.artTitle && d.artTitle.text, handoff: 'Task 15' });
    eq('RJ1', b.byline, d.byline ? d.byline.text : null, { page: file, width: '1280px', step: '署名与基线逐字符一致', expect: b.byline, actual: d.byline && d.byline.text, handoff: 'Task 15' });
    eq('RJ1', b.articleType, d.artType ? d.artType.text : null, { page: file, width: '1280px', step: '页面类型标签与基线一致', expect: b.articleType, actual: d.artType && d.artType.text, handoff: 'Task 15' });
    okf('RJ1', d.artType.top < d.artTitle.top && d.artTitle.top < d.byline.top, { page: file, width: '1280px', step: '渲染顺序：类型→标题→署名（bounding box）', expect: 'top 递增', actual: [d.artType.top, d.artTitle.top, d.byline.top].map(Math.round).join('<'), handoff: 'Task 16' });
    if (b.dateline) {
      eq('RJ1', b.dateline.text, d.dateline ? d.dateline.text : null, { page: file, width: '1280px', step: '电头文本与基线一致', expect: b.dateline.text, actual: d.dateline && d.dateline.text, handoff: 'Task 15' });
      eq('RJ1', b.dateline.paragraph_u0020_count, (m.paras[0] || '').split('\u0020').length - 1, { page: file, width: '375px', step: 'strong.dateline 后恰好一个 U+0020（首段空格计数）', expect: b.dateline.paragraph_u0020_count, actual: (m.paras[0] || '').split('\u0020').length - 1, handoff: 'Task 15' });
    }
    if (b.date && b.date.present) eq('RJ1', cps(b.date.text), cps(d.date ? d.date.text : ''), { page: file, width: '1280px', step: '末尾日期与基线码点一致', expect: b.date.text, actual: d.date && d.date.text, handoff: 'Task 15' });
  }
  if (file === 'index.html') {
    eq('RJ2', [C.frozen.P_ORIGIN, C.frozen.P_WORK, C.frozen.P_FOUNDED], d.secTexts, { page: file, width: '1280px', step: '首页三段逐字符等于 Task4 冻结表', expect: C.frozen.P_FOUNDED, actual: (d.secTexts || [])[2], handoff: 'Task 15' });
    eq('RJ2', cps([C.frozen.P_ORIGIN, C.frozen.P_WORK, C.frozen.P_FOUNDED].join('\u0001')), cps((d.secTexts || []).join('\u0001')), { page: file, width: '1280px', step: '首页三段码点级全等（含全角引号与书名号）', expect: '三段码点', actual: cps((d.secTexts || []).join('\u0001')).length + ' 码点', handoff: 'Task 15' });
    eq('RJ2', ['名称由来', '主要工作与报道方向', '成立时间'], d.secTitles, { page: file, width: '1280px', step: '首页三区块标题逐字符一致', expect: '三个合同标题', actual: (d.secTitles || []).join('|'), handoff: 'Task 15' });
    eq('RJ2', C.latestPages.map((p) => C.mdMeta[p].title).join('|'), d.homeLatest.items.map((it) => it.title.text).join('|'), { page: file, width: '1280px', step: '首页最新区标题序列 == 独立解析 md 所得全局序前 3 条标题（R11①／R12②：一栏可多稿，不再取"各栏目首条"）', expect: C.latestPages.map((p) => C.mdMeta[p].title).join('|'), actual: d.homeLatest.items.map((it) => it.title.text).join('|'), handoff: 'Task 12 R11' });
    const dates = d.homeLatest.items.map((it) => it.date.text);
    okf('RJ9', dates.every((x) => /^\d{1,2}月\d{1,2}日$/.test(x)), { page: file, width: '1280px', step: 'R5②：display_date 形态为「月日」且不含年份', expect: '^\\d{1,2}月\\d{1,2}日$', actual: dates.join(','), handoff: 'Task 15' });
    okf('RJ9', dates.length === C.latestPages.length && dates.every((x, i) => { const b = C.detail[C.latestPages[i]]; if (!b) return false; const domText = b.paragraphs.map((p) => p.text).join('') + (b.date && b.date.present ? b.date.text : '') + b.h1 + b.byline + b.articleType; return domText.indexOf(x) >= 0; }), { page: file, width: '1280px', step: 'R5②：第 i 条的月日必须在它**所链那篇文章**的 DOM 文本之内（正文段落或末尾日期行 p.article__date）；页取 latestPages[i]，R12 后不再假设每栏目一条', expect: '逐条命中该页 DOM 文本', actual: dates.join(','), handoff: 'Task 12 R11／R12' });
  }
  const css = await js('(() => { var out=[]; var ss=document.styleSheets; for (var j=0;j<ss.length;j++){ try{ for (var k=0;k<ss[j].cssRules.length;k++){ var t=ss[j].cssRules[k].cssText; var mm=t.match(/(^|[;{\\s])content\\s*:\\s*[^;}]+/g)||[]; for (var i=0;i<mm.length;i++) out.push(mm[i].trim()); } }catch(e){} } return JSON.stringify(out.filter(function(s){return /^content\\s*:/.test(s);})); })()');
  eq('RJ3', [], (css || []).filter((s) => !/^content\s*:\s*(""|''|none|normal)\s*$/.test(s.trim())), { page: file, width: '-', step: '伪元素 content 只用于画线（空串），未生成任何可见文字', expect: '0 处非空 content', actual: (css || []).join(' | ') || '0 处', handoff: 'Task 16' });
  await metrics(375, 900);
  const after = await measure();
  eq('RJ3', m.mainText, after.mainText, { page: file, width: '375px', step: '交互与降级之后主内容无脚本注入文本、无字符增删', expect: m.mainText.length + ' 字符', actual: after.mainText.length + ' 字符', handoff: 'Task 15' });
  eq('RJ4', [], ctx.state.noise.filter((x) => /EXCEPTION|CONSOLE|LOG:/.test(x)), { page: file, width: '-', step: '全站运行期无未捕获异常、无任何 console 输出（log/info/debug/warn/error/assert 全部计入；探针自身不使用 console）', expect: '0 条', actual: ctx.state.noise.join(' | ') || '0 条', handoff: 'Task 15' });
  await metrics(1280, 900);
}
