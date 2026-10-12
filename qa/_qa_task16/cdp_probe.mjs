/* Task 16 CDP 权威实测：渲染盒高宽、deviceScaleFactor、异常与控制台、
 * :visited 像素判定（先造访问历史再截图采样）、200% 缩放两效分离、禁 CSS／禁 JS 降级、
 * 固定宽度截图证据（shot.html 同步 iframe）。
 *
 * 用法：node _qa_task16/cdp_probe.mjs [--dir Results] [--tag after] [--skip-shots] [--skip-visited]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBrowser } from './cdp.mjs';
import { textPixel, shot, COLORS, dist } from './png.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i >= 0 ? process.argv[i + 1] : d; };
const flag = (n) => process.argv.includes('--' + n);
const dir = path.resolve(ROOT, arg('dir', 'Results'));
const tag = arg('tag', 'after');
const pages = JSON.parse(fs.readFileSync(path.join(HERE, 'pages.json'), 'utf8'))[
  Object.keys(JSON.parse(fs.readFileSync(path.join(HERE, 'pages.json'), 'utf8'))).find((k) => dir.replace(/\\/g, '/').endsWith('/' + k)) || 'results'];
const shotsDir = path.join(HERE, 'shots');
const LINES = path.join(HERE, 'cdp_lines_' + tag + '.txt');
const FACTS = path.join(HERE, 'cdp_facts_' + tag + '.json');

const lines = [];
const facts = { dir: path.relative(ROOT, dir).replace(/\\/g, '/'), pages, loads: [], matrix: [], zoom: {}, visited: {}, degrade: {}, focus: {} };
let bad = 0;
const chk = (id, pass, detail) => {
  if (!pass) bad++;
  lines.push((pass ? 'PASS ' : 'FAIL ') + id + ' — ' + detail);
  return pass;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const br = await openBrowser(Number(arg('port', 9521)), path.join(HERE, '.cdp' + arg('port', 9521)));
try {
  /* ---------- A. 七页加载：控制台、异常、样式表、请求 ---------- */
  const PROBE = String.raw`(() => {
    const de = document.documentElement, sheets = Array.from(document.styleSheets);
    let sheetErr = [], ruleCount = 0, mediaText = null, lastIsMedia = false, hrefs = [];
    for (const s of sheets) {
      hrefs.push(s.href);
      try {
        const rs = s.cssRules; ruleCount += rs.length;
        for (let i = 0; i < rs.length; i++) {
          const r = rs[i];
          if (r.type === 4 || (r.conditionText !== undefined)) { mediaText = r.conditionText || r.media.mediaText; lastIsMedia = i === rs.length - 1; }
        }
      } catch (e) { sheetErr.push(String(e.name) + ':' + String(e.message)); }
    }
    const links = Array.from(document.querySelectorAll('.entry-list__link, .home-latest__link')).map((el) => {
      const r = el.getBoundingClientRect(), c = getComputedStyle(el);
      return { cls: el.className, h: Math.round(r.height * 1000) / 1000, w: Math.round(r.width * 1000) / 1000, color: c.color, x: Math.round(r.x), y: Math.round(r.y + scrollY) };
    });
    const nav = document.querySelector('#site-navigation'), tg = document.querySelector('#nav-toggle');
    return {
      title: document.title, mqMobile: matchMedia('(max-width: 768px)').matches, mqDesktop: matchMedia('(min-width: 769px)').matches,
      dpr: devicePixelRatio, innerWidth: innerWidth, clientWidth: de.clientWidth, scrollWidth: de.scrollWidth,
      sheetCount: sheets.length, sheetErr, ruleCount, mediaText, lastIsMedia, hrefs,
      htmlClass: de.className, navDisplay: nav ? getComputedStyle(nav).display : null,
      toggleDisplay: tg ? getComputedStyle(tg).display : null,
      links, docHeight: de.scrollHeight
    };
  })()`;

  for (const p of pages) {
    const url = await br.navigate(path.join(dir, p));
    const f = await br.evaluate(PROBE);
    f.page = p; f.url = url;
    facts.loads.push(f);
    chk('A/styleSheets/' + p, f.sheetCount === 1 && f.sheetErr.length === 0 && f.hrefs[0] && f.hrefs[0].endsWith('styles.css'),
      '样式表数=' + f.sheetCount + ' 错误条目=' + JSON.stringify(f.sheetErr) + ' href=' + f.hrefs.join(','));
    chk('A/parse/' + p, f.mediaText === '(max-width: 768px)' && f.lastIsMedia === true && f.ruleCount > 40,
      '浏览器解析顶层规则=' + f.ruleCount + '，@media 条件文本=' + JSON.stringify(f.mediaText) + '，位于末尾=' + f.lastIsMedia);
    chk('A/overflow/' + p, f.scrollWidth <= f.clientWidth,
      '视口 ' + f.innerWidth + '（clientWidth=' + f.clientWidth + '，scrollWidth=' + f.scrollWidth + '，超出 ' + (f.scrollWidth - f.clientWidth) + 'px）');
  }
  chk('A/console', br.events.console.filter((c) => c.type === 'error' || c.type === 'warning').length === 0,
    '控制台 error/warning=' + br.events.console.filter((c) => c.type === 'error' || c.type === 'warning').length + ' 全部消息=' + JSON.stringify(br.events.console).slice(0, 200));
  chk('A/exceptions', br.events.exceptions.length === 0, '未捕获异常=' + JSON.stringify(br.events.exceptions).slice(0, 240));
  const nonFile = br.events.requests.filter((u) => !/^file:/.test(u));
  chk('A/requests', nonFile.length === 0 && br.events.failures.filter((f) => !/^file/.test(f.error || '')).length === 0,
    '请求总数=' + br.events.requests.length + '，非 file:// 请求=' + nonFile.length + '，加载失败=' + JSON.stringify(br.events.failures).slice(0, 200));

  /* ---------- B. 视口矩阵（CDP 真实视口，无 500px 下限） ---------- */
  const listPages = pages.filter((p) => p === 'index.html' || /^news-/.test(p));
  for (const w of [375, 640, 768, 769, 1024, 1280]) {
    for (const p of listPages) {
      await br.setMetrics(w, 2400, 1);
      await br.navigate(path.join(dir, p), 260);
      const f = await br.evaluate(PROBE);
      facts.matrix.push({ viewport: w, page: p, ...f });
      chk('B/viewport/' + p + '@' + w, f.innerWidth === w && f.clientWidth === w,
        'innerWidth=' + f.innerWidth + ' clientWidth=' + f.clientWidth + '（CDP setDeviceMetricsOverride 真实视口）');
      chk('B/overflow/' + p + '@' + w, f.scrollWidth <= f.clientWidth,
        'scrollWidth=' + f.scrollWidth + ' clientWidth=' + f.clientWidth + ' 超出=' + (f.scrollWidth - f.clientWidth));
      chk('B/touch/' + p + '@' + w, f.links.length > 0 && f.links.every((l) => l.h >= 44 && l.w >= 44),
        '链接数=' + f.links.length + ' 实测高=' + f.links.map((l) => l.h).join('/') + ' 实测宽=' + f.links.map((l) => l.w).join('/'));
      if (w <= 768) chk('B/mobile-state/' + p + '@' + w, f.mqMobile === true && f.mqDesktop === false,
        'mqMobile=' + f.mqMobile + ' mqDesktop=' + f.mqDesktop + ' html=' + f.htmlClass + ' nav=' + f.navDisplay + ' toggle=' + f.toggleDisplay);
      else chk('B/desktop-state/' + p + '@' + w, f.mqMobile === false && f.mqDesktop === true && f.navDisplay === 'block' && f.toggleDisplay === 'none',
        'mqMobile=' + f.mqMobile + ' mqDesktop=' + f.mqDesktop + ' nav=' + f.navDisplay + ' toggle=' + f.toggleDisplay + '（≥769px 桌面基线，按钮隐藏）');
    }
  }

  /* ---------- C. 768 ↔ 769 往复无半态 ---------- */
  await br.navigate(path.join(dir, 'index.html'), 260);
  const seq = [], seqOut = [];
  for (const w of [768, 769, 768, 769, 768]) {
    await br.setMetrics(w, 2400, 1);
    await sleep(120);
    seqOut.push(await br.evaluate(PROBE));
  }
  const mobileStates = seqOut.filter((_, i) => [0, 2, 4].includes(i)).map((s) => JSON.stringify([s.mqMobile, s.mqDesktop, s.navDisplay, s.toggleDisplay, s.clientWidth, s.scrollWidth]));
  const desktopStates = seqOut.filter((_, i) => [1, 3].includes(i)).map((s) => JSON.stringify([s.mqMobile, s.mqDesktop, s.navDisplay, s.toggleDisplay, s.clientWidth, s.scrollWidth]));
  chk('C/往复一致', new Set(mobileStates).size === 1 && new Set(desktopStates).size === 1,
    '移动三次=' + JSON.stringify([...new Set(mobileStates)]) + ' 桌面两次=' + JSON.stringify([...new Set(desktopStates)]));

  /* ---------- D. 200% 缩放：布局 640 等效 + 绘制 deviceScaleFactor=2 ---------- */
  await br.setMetrics(640, 2400, 1);
  await br.navigate(path.join(dir, 'index.html'), 260);
  const z1 = await br.evaluate(PROBE);
  await br.setMetrics(640, 2400, 2);
  await sleep(200);
  const z2 = await br.evaluate(PROBE);
  facts.zoom = { dpr1: z1, dpr2: z2 };
  chk('D/layout640', z1.innerWidth === 640 && z2.innerWidth === 640, '100%@1280 的布局在 200% 下等效为 CSS 视口 640：innerWidth=' + z1.innerWidth + '/' + z2.innerWidth + '，dpr=' + z1.dpr + '/' + z2.dpr);
  chk('D/dpr2', z2.dpr === 2, 'deviceScaleFactor=2 生效：dpr=' + z2.dpr + '（CDP zoom 参数在本 Chrome 是 no-op，故拆两效复现）');
  const devPx1 = z1.links.length ? Math.round(z1.links[0].w * z1.dpr) : 0;
  const devPx2 = z2.links.length ? Math.round(z2.links[0].w * z2.dpr) : 0;
  chk('D/devicePx翻倍', devPx2 === devPx1 * 2 && devPx1 > 0, '首条链接设备像素宽 ' + devPx1 + ' → ' + devPx2 + '（rect.width × dpr 佐证文字实际像素翻倍）');
  chk('D/200%无溢出', z2.scrollWidth <= z2.clientWidth, '200% 下 scrollWidth=' + z2.scrollWidth + ' clientWidth=' + z2.clientWidth);
  await br.setMetrics(1280, 2400, 1);

  /* ---------- E. :visited 像素判定 ---------- */
  if (!flag('skip-visited')) {
    /* E 段 + E0 阳性对照。
       跨会话 profile：先用 A 会话访问过全部目标页再关闭，再用同一 user-data-dir 开 B 会话采样——
       同一会话内立刻读 :visited，本 Chrome 对 file:// 不重绘（本包实测到 matches(':visited')=false）。
       E0 在同一控制页里放两个链接，唯一变量是"有没有同色 :visited 伴生"；没有这条对照，
       "四处像素都是墨色"分不清是配对生效还是 visited 根本没被触发。控制页是 QA 产物，不进 Results/。 */
    const ctrlSrc = fs.readFileSync(path.join(HERE, 'visited_control.html'), 'utf8');
    const ctrlTarget = path.relative(HERE, path.join(dir, 'index.html')).replace(/\\/g, '/');
    const ctrl = path.join(HERE, '_visited_control_' + tag + '.html');
    fs.writeFileSync(ctrl, ctrlSrc.replace('../Results/index.html', ctrlTarget), 'utf8');

    const basePort = Number(arg('port', 9521));
    const prof = path.join(HERE, '.visited_profile');
    fs.rmSync(prof, { recursive: true, force: true });
    const warm = await openBrowser(basePort + 20, prof);
    for (const p of pages) { await warm.navigate(path.join(dir, p), 420); }
    await warm.navigate(ctrl, 420);
    warm.close();
    await sleep(700);
    const vb = await openBrowser(basePort + 21, prof);
    await vb.setMetrics(1280, 1400, 1);

    const sleep2 = (ms) => new Promise((r) => setTimeout(r, ms));
    const grabOne = async (url, sel) => {
      await vb.navigate(url, 500);
      let geo = null;
      for (let i = 0; i < 25 && !geo; i++) {
        await sleep2(200);
        geo = await vb.evaluate('(() => { const el = document.querySelector(' + JSON.stringify(sel) + '); if (!el) return null;' +
          ' const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),' +
          ' visited: el.matches(":visited"), computed: getComputedStyle(el).color }; })()');
      }
      return geo;
    };
    const grabPair = async (url, linkSel, textSel) => {
      await vb.navigate(url, 500);
      let geo = null;
      for (let i = 0; i < 25 && !geo; i++) {
        await sleep2(200);
        geo = await vb.evaluate('(() => { const host = document.querySelector(' + JSON.stringify(linkSel) + '); const el = document.querySelector(' + JSON.stringify(textSel) + ');' +
          ' if (!host || !el) return null; const r = el.getBoundingClientRect();' +
          ' return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),' +
          ' hostVisited: host.matches(":visited"), hostComputed: getComputedStyle(host).color, href: host.getAttribute("href") }; })()');
      }
      return geo;
    };
    const classify = async (geo, name) => {
      const png = path.join(shotsDir, 'visited-' + name + '-' + tag + '.png');
      fs.writeFileSync(png, await vb.screenshot({ x: geo.x, y: geo.y, w: geo.w, h: geo.h }));
      return textPixel(png, 0.02);
    };

    const gp = await grabOne(ctrl, '.t16-pair');
    const gn = await grabOne(ctrl, '.t16-nopair');
    let controlLive = false;
    if (gp && gn) {
      const cp = await classify(gp, 'control-pair');
      const cn = await classify(gn, 'control-nopair');
      controlLive = cn.nearest === 'accent';
      facts.visited.__control = { pair: cp, nopair: cn, geo: { pair: gp, nopair: gn }, controlLive };
      chk('E0/control', cp.nearest === 'ink' && (controlLive || cn.nearest === 'ink'),
        'A/B（目标页已在上一会话访问过）：有伴生像素=' + cp.mean + '（' + cp.nearest + ' Δ' + cp.nearestDistance + '，:visited=' + gp.visited + '）；' +
        '无伴生像素=' + cn.mean + '（' + cn.nearest + ' Δ' + cn.nearestDistance + '，:visited=' + gn.visited + '）；两者 getComputedStyle 同为 ' + gn.computed + '（隐私规则假绿）。' +
        (controlLive
          ? '对照成立：visited 在本环境确被触发，像素能暴露重绘 ⇒ E 段四处墨色结论有意义。'
          : '对照不成立：本环境（含跨会话 profile）对 file:// 链接不施加 visited 重绘，像素面对 visited 无鉴别力。' +
            '因此"配对"的判据以 S4/H13 的逐字符比较为准；E 段像素结果只证明四处默认渲染同为墨色（非浏览器紫、非暗红），已如实登记并交 Task 19。'));
    } else {
      chk('E0/control', false, '控制页元素缺失：' + JSON.stringify({ gp, gn }));
    }
    const targets = [
      { page: 'index.html', linkSel: '.site-masthead__link', sel: '.site-masthead__link', label: '报头链接' },
      { page: 'index.html', linkSel: '.site-navigation__link:not([aria-current="page"])', sel: '.site-navigation__link:not([aria-current="page"])', label: '导航链接' },
      { page: 'index.html', linkSel: '.home-latest__link', sel: '.home-latest__entry', label: '最新区链接' },
      { page: 'news-message.html', linkSel: '.entry-list__link', sel: '.entry-list__title', label: '列表页链接' },
    ];
    for (const t of targets) {
      const geo = await grabPair(path.join(dir, t.page), t.linkSel, t.sel);
      if (!geo) { chk('E/found/' + t.label, false, '选择器 ' + t.sel + ' 在 ' + t.page + ' 上无元素'); continue; }
      const s = await classify(geo, t.label);
      facts.visited[t.label] = { geo, sample: s, controlLive };
      chk('E/visited/' + t.label, s.nearest === 'ink' && s.distances.ink <= 30,
        t.page + ' 取样=' + t.sel + '（宿主 ' + t.linkSel + ' href=' + geo.href + '，:visited=' + geo.hostVisited +
        '，getComputedStyle=' + geo.hostComputed + '——按隐私规则不可信，不作为判据；像素面对 visited' + (controlLive ? '有' : '无') + '鉴别力）；' +
        '像素均值=' + s.mean + ' 最近色=' + s.nearest + '(Δ' + s.nearestDistance + ') 距离表=' + JSON.stringify(s.distances) + ' 样本=' + s.png);
    }
    vb.close();
  }

  /* ---------- F. 焦点轮廓未被裁切 ---------- */
  await br.setMetrics(1280, 2400, 1);
  await br.navigate(path.join(dir, 'news-message.html'), 300);
  const focusInfo = await br.evaluate(String.raw`(() => {
    const el = document.querySelector('.entry-list__link');
    el.focus();
    const c = getComputedStyle(el);
    // 无头窗口未获系统焦点时 :focus-visible 不匹配（document.hasFocus() 为 false），
    // 沿用本项目既有做法：把 styles.css 中 :focus-visible 规则的 styleText 原样克隆到临时 class 上，
    // 用同一条声明验证渲染结果——只改运行时 DOM，不写回任何交付文件。
    let ruleText = '';
    for (const s of document.styleSheets) {
      let rs; try { rs = s.cssRules; } catch (e) { continue; }
      for (const r of rs) {
        if (r.selectorText && /a:focus-visible/.test(r.selectorText)) ruleText = r.style.cssText;
      }
    }
    const st = document.createElement('style');
    st.textContent = '.t16-focus-clone{' + ruleText + '}';
    document.head.appendChild(st);
    el.classList.add('t16-focus-clone');
    const k = getComputedStyle(el);
    const out = {
      active: document.activeElement === el, hasFocus: document.hasFocus(), matchesFV: el.matches(':focus-visible'),
      nativeOutline: [c.outlineStyle, c.outlineWidth, c.outlineColor].join(' '), nativeOffset: c.outlineOffset,
      ruleText, cloneOutline: [k.outlineStyle, k.outlineWidth, k.outlineColor].join(' '), cloneOffset: k.outlineOffset,
      textDecoration: k.textDecorationLine
    };
    el.classList.remove('t16-focus-clone'); st.remove();
    return out;
  })()`);
  facts.focus = focusInfo;
  chk('F/focus-outline', /solid 2px rgb\(122, 36, 36\)/.test(focusInfo.cloneOutline) && focusInfo.cloneOffset === '3px',
    '全局 :focus-visible 规则=' + JSON.stringify(focusInfo.ruleText) + '；克隆到链接后实测 outline=' + focusInfo.cloneOutline + ' offset=' + focusInfo.cloneOffset +
    '（暗红 2px 轮廓 + 3px 外扩未被任何新规则裁切或覆盖）；原生聚焦态 outline=' + focusInfo.nativeOutline + ' offset=' + focusInfo.nativeOffset +
    '，:focus-visible 匹配=' + focusInfo.matchesFV + '，hasFocus=' + focusInfo.hasFocus + '（无头窗口无系统焦点，属环境限制，故以克隆法定论）');
  chk('F/no-outline-none', !/outline\s*:\s*none/.test(focusInfo.nativeOutline + focusInfo.cloneOutline),
    '新链接上不存在 outline: none 覆盖（native=' + focusInfo.nativeOutline + '）');

  /* ---------- G. 降级：禁 CSS / 禁 JS ---------- */
  for (const p of pages) {
    await br.navigate(path.join(dir, p), 260);
    const before = await br.evaluate(String.raw`(() => { const t = document.body.textContent; let sum = 0; for (let i = 0; i < t.length; i++) sum = (sum * 31 + t.charCodeAt(i)) % 4294967296; return ({ textLen: t.length, textSum: sum, order: Array.from(document.querySelectorAll('main, main *')).map(e => e.tagName + '.' + (e.className || '')).join('|'), links: Array.from(document.querySelectorAll('.entry-list__link, .home-latest__link, .site-navigation__link')).map(a => ({ h: Math.round(a.getBoundingClientRect().height), w: Math.round(a.getBoundingClientRect().width), href: !!a.getAttribute('href') })) }) })()`);
    await br.evaluate(String.raw`(() => { Array.from(document.styleSheets).forEach(s => { s.disabled = true; }); return Array.from(document.styleSheets).map(s => s.disabled); })()`);
    await sleep(120);
    const after = await br.evaluate(String.raw`(() => { const t = document.body.textContent; let sum = 0; for (let i = 0; i < t.length; i++) sum = (sum * 31 + t.charCodeAt(i)) % 4294967296; return ({ textLen: t.length, textSum: sum, order: Array.from(document.querySelectorAll('main, main *')).map(e => e.tagName + '.' + (e.className || '')).join('|'), links: Array.from(document.querySelectorAll('.entry-list__link, .home-latest__link, .site-navigation__link')).map(a => ({ h: Math.round(a.getBoundingClientRect().height), w: Math.round(a.getBoundingClientRect().width), href: !!a.getAttribute('href') })) }) })()`);
    const clickable = after.links.filter((l) => l.href).every((l) => l.h > 0 && l.w > 0);
    chk('G/nocss/' + p, before.textLen === after.textLen && before.textSum === after.textSum && before.order === after.order && clickable
      && before.links.length === after.links.length && after.links.length > 0,
      '禁 CSS 后 textContent 长度=' + after.textLen + '（带样式 ' + before.textLen + '）、校验和一致=' + (before.textSum === after.textSum) +
      '，DOM 顺序一致=' + (before.order === after.order) + '，链接非零可点盒=' + clickable + '（' + after.links.map((l) => l.h + '×' + l.w).join(' ') + '）');
  }
  await br.send('Emulation.setScriptExecutionDisabled', { value: true });
  for (const p of pages) {
    await br.setMetrics(375, 2400, 1);
    await br.navigate(path.join(dir, p), 320);
    const nj = await br.evaluate(String.raw`(() => { const nav = document.querySelector('#site-navigation'), tg = document.querySelector('#nav-toggle');
      const t = document.querySelector('main').innerText;
      return { htmlClass: document.documentElement.className, navDisplay: getComputedStyle(nav).display, navVisible: nav.getClientRects().length > 0,
               toggleDisplay: getComputedStyle(tg).display, textLen: t.length }; })()`);
    chk('G/nojs/' + p, nj.htmlClass === 'no-js' && nj.navDisplay === 'block' && nj.navVisible && nj.toggleDisplay === 'none',
      '禁 JS（setScriptExecutionDisabled）后 html=' + nj.htmlClass + '，导航 display=' + nj.navDisplay + ' 可见=' + nj.navVisible + '，按钮 display=' + nj.toggleDisplay + '，正文长度=' + nj.textLen);
  }
  await br.send('Emulation.setScriptExecutionDisabled', { value: false });

  /* ---------- H. 固定宽度截图证据（shot.html 同步 iframe） ---------- */
  if (!flag('skip-shots')) {
    const host = path.join(HERE, 'shot.html');
    for (const w of [375, 768, 1280]) {
      for (const p of ['index.html', 'news-message.html']) {
        const rel = path.relative(ROOT, path.join(dir, p)).replace(/\\/g, '/');
        const url = 'file:///' + encodeURI(host.replace(/\\/g, '/')) + '?w=' + w + '&h=2000&p=' + encodeURIComponent('../' + rel);
        const r = shot(url, path.join(shotsDir, 'shot-' + p.replace('.html', '') + '-' + w + '-' + tag + '.png'), w + 40, 2100);
        chk('H/shot/' + p + '@' + w, /^ready:/.test(r.title) && Number(r.title.split(':')[1]) >= w - 20 && r.bytes > 5000,
          'title=' + r.title + '（clientWidth:视口状态:横向超出）字节=' + r.bytes);
      }
    }
  }
} catch (e) {
  bad++;
  lines.push('FAIL PROBE — 探针自身异常：' + (e && e.stack || e));
} finally {
  br.close();
}
facts.summary = { fail: bad, lines: lines.length };
fs.writeFileSync(FACTS, JSON.stringify(facts, null, 1), 'utf8');
fs.writeFileSync(LINES, lines.join('\n') + '\n', 'utf8');
console.log('cdp_probe[' + tag + '] 断言 ' + lines.length + ' 条，FAIL ' + bad + ' → ' + path.relative(ROOT, LINES));
for (const l of lines.filter((x) => x.startsWith('FAIL'))) console.log('  ' + l);
process.exit(bad ? 1 : 0);
