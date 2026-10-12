/* Task 10 — CDP 只读 DOM 快照库：一个 Chrome 实例可依次遍历多个 Results 副本。
 * 页内执行体只有 querySelector/getAttribute/textContent/outerHTML 读取，无任何写入。 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
export const PAGES = ['index.html', 'news-message.html', 'news-feature.html', 'news-commentary.html'];

export const EXTRACT = String.raw`(() => {
  const D = document;
  const txt = (n) => (n === undefined || n === null) ? null : n.textContent;
  const attrsOf = (el) => {
    const o = {};
    for (const a of el.attributes) o[a.name] = a.value;
    return o;
  };
  const kids = (el) => el ? Array.from(el.children).map(c => ({
    tag: c.tagName.toLowerCase(), id: c.id || null, cls: c.getAttribute('class'), attrs: attrsOf(c),
    text: txt(c)
  })) : null;
  const elKids = (el) => el ? Array.from(el.children).map(c => ({
    tag: c.tagName.toLowerCase(), id: c.id || null, cls: c.getAttribute('class'), attrs: attrsOf(c)
  })) : null;
  const count = (sel) => D.querySelectorAll(sel).length;
  const cp = (s) => s === null ? null : Array.from(s).map(c => c.codePointAt(0).toString(16)).join(' ');

  const main = D.querySelector('main');
  const article = D.querySelector('.article');
  const bodyP = article ? Array.from(article.querySelectorAll('.article__body > p')) : [];

  /* 电头边界：首个正文 <p> 的子节点序列 */
  let dateline = null;
  if (bodyP.length) {
    const first = bodyP[0];
    const strong = first.querySelector('strong.dateline');
    const cn = Array.from(first.childNodes).slice(0, 4).map(n => ({
      nodeType: n.nodeType,
      name: n.nodeName,
      value: n.nodeType === 3 ? n.nodeValue : null
    }));
    dateline = {
      present: !!strong,
      strongCountInPage: count('strong.dateline'),
      tag: strong ? strong.tagName.toLowerCase() : null,
      parentTag: strong && strong.parentElement ? strong.parentElement.tagName.toLowerCase() : null,
      parentIsFirstP: strong && strong.parentElement === first,
      strongIsFirstChild: !!(strong && first.firstChild === strong),
      text: strong ? strong.textContent : null,
      childNodes: cn,
      nextText: strong && strong.nextSibling ? (strong.nextSibling.nodeType === 3 ? strong.nextSibling.nodeValue : null) : null,
      pText: first.textContent,
      pHtml: first.innerHTML
    };
  }

  /* 正文段落：逐个 textContent + 内部元素标签 */
  const paragraphs = bodyP.map((p, i) => ({
    i: i,
    text: p.textContent,
    tags: Array.from(p.querySelectorAll('*')).map(e => e.tagName.toLowerCase()),
    attrs: attrsOf(p),
    html: p.innerHTML
  }));

  /* 首页三区块 */
  const sections = Array.from(D.querySelectorAll('.home-section')).map(s => {
    const h2 = s.querySelector('.home-section__title');
    const p = s.querySelector('.home-section__text');
    const ab = s.getAttribute('aria-labelledby');
    const byId = ab ? D.querySelectorAll('[id="' + ab.replace(/["\\]/g, '\\\\$&') + '"]') : [];
    return {
      attrs: attrsOf(s),
      ab: ab,
      abResolvedCount: byId.length,
      abResolvesToOwnH2: byId.length === 1 && h2 ? byId[0] === h2 : false,
      childTags: Array.from(s.children).map(c => c.tagName.toLowerCase() + '.' + (c.getAttribute('class') || '')),
      h2Count: s.querySelectorAll('h2').length,
      pCount: s.querySelectorAll('p').length,
      directH2: h2 && h2.parentElement === s,
      directP: p && p.parentElement === s,
      h2Id: h2 ? h2.id : null,
      h2Text: txt(h2),
      pText: txt(p),
      html: s.innerHTML
    };
  });

  /* 跨页壳规范化比较用的原始序列化 */
  const bodyShell = Array.from(D.body.children).filter(e => e.tagName !== 'MAIN').map(e => e.outerHTML);
  const headHTML = D.head.innerHTML;
  const mainHTML = main ? main.outerHTML : null;

  /* 全站 ID 与重复 ID */
  const allIds = Array.from(D.querySelectorAll('[id]')).map(e => e.id);
  const dupIds = allIds.filter((v, i) => allIds.indexOf(v) !== i);

  /* 内联脚本 / 内联样式 / 事件属性 / 外部引用 */
  const eventAttrs = [];
  for (const el of D.querySelectorAll('*')) {
    for (const a of el.attributes) if (/^on[a-z]+$/i.test(a.name)) eventAttrs.push(el.tagName + '@' + a.name);
  }

  const nav = D.querySelector('nav');
  const navSubtreeAttrs = nav ? Array.from(nav.querySelectorAll('*')).concat([nav]).map(e => {
    const o = attrsOf(e);
    return { tag: e.tagName.toLowerCase(), cls: e.getAttribute('class'), has: Object.keys(o).filter(k => k === 'hidden' || k === 'aria-hidden') };
  }).filter(x => x.has.length) : null;

  const dateEl = D.querySelector('.article__date');

  return {
    file: location.pathname.split('/').pop(),
    html: { attrs: attrsOf(D.documentElement), lang: D.documentElement.lang, cls: D.documentElement.className },
    headHTML: headHTML,
    headTitle: txt(D.querySelector('title')),
    metaCharset: Array.from(D.querySelectorAll('meta[charset]')).map(e => e.getAttribute('charset')),
    metaViewport: Array.from(D.querySelectorAll('meta[name="viewport"]')).map(e => e.getAttribute('content')),
    links: Array.from(D.querySelectorAll('link')).map(e => attrsOf(e)),
    scripts: Array.from(D.querySelectorAll('script')).map(e => ({ attrs: attrsOf(e), inline: !e.src, text: e.textContent })),
    inlineStyleTags: D.querySelectorAll('style').length,
    baseTags: D.querySelectorAll('base').length,
    styleAttrs: Array.from(D.querySelectorAll('[style]')).map(e => e.tagName),
    eventAttrs: eventAttrs,
    bodyChildren: kids(D.body),
    bodyShellHTML: bodyShell,
    mainHTML: mainHTML,
    mainChildEls: elKids(main),
    mainDirectElemTexts: main ? Array.from(main.children).map(e => e.tagName.toLowerCase() + ' :: ' + txt(e)) : null,
    h1s: Array.from(D.querySelectorAll('h1')).map(e => ({ cls: e.getAttribute('class'), attrs: attrsOf(e), text: txt(e) })),
    h2s: Array.from(D.querySelectorAll('h2')).map(e => ({ cls: e.getAttribute('class'), text: txt(e), inArticleBody: !!(article && e.closest('.article__body')) })),
    h3s: Array.from(D.querySelectorAll('h3')).map(e => txt(e)),
    allIds: allIds,
    dupIds: dupIds,
    skip: (() => { const a = D.querySelector('.skip-link'); return a ? { tag: a.tagName.toLowerCase(), href: a.getAttribute('href'), text: txt(a), isBodyFirstChild: D.body.firstElementChild === a } : null; })(),
    counts: {
      siteHeader: count('.site-header'), siteHeaderInner: count('.site-header__inner'),
      masthead: count('.site-masthead'), mastheadLink: count('.site-masthead__link'),
      navToggle: count('.nav-toggle'), nav: count('nav.site-navigation'),
      navList: count('.site-navigation__list'), navItem: count('.site-navigation__item'),
      navLink: count('.site-navigation__link'), main: count('main'), ariaCurrentPage: count('[aria-current="page"]'),
      ariaCurrentAny: count('[aria-current]'), article: count('.article'), articleHeader: count('.article__header'),
      articleBody: count('.article__body'), articleType: count('.article__type'), articleByline: count('.article__byline'),
      articleDate: count('.article__date'), homeSectionsWrap: count('.home-sections'), homeSection: count('.home-section'),
      tabIndexMainNeg1: count('main[tabindex="-1"]'), pageTitle: count('.page-title'),
      blockquote: count('blockquote'), q: count('q'), cite: count('cite'),
      ul: count('ul'), ol: count('ol'), liInBody: count('main li'), img: count('img'), time: count('time'),
      datetimeAttr: count('[datetime]'), aInMain: count('main a'), aInArticle: article ? article.querySelectorAll('a').length : 0,
      strongInArticle: article ? article.querySelectorAll('strong').length : 0,
      br: count('br'), hr: count('hr'), divInArticleBody: count('.article__body > div'),
      footer: count('footer'), form: count('form'), input: count('input'), svg: count('svg'),
      em: count('main em'), i: count('main i'), b: count('main b'), spanInBody: count('main span'),
      code: count('main code'), pre: count('main pre'), small: count('main small'), sub: count('main sub'), sup: count('main sup'),
      s: count('main s'), u: count('main u'), mark: count('main mark'), abbr: count('main abbr'), iframe: count('iframe'),
      objectTag: count('object'), embed: count('embed'), video: count('video'), audio: count('audio'), canvas: count('canvas'),
      figureTag: count('figure'), picture: count('picture'), tableTag: count('table'), sectionTotal: count('section')
    },
    header: (() => {
      const h = D.querySelector('.site-header');
      const inner = D.querySelector('.site-header__inner');
      const m = D.querySelector('.site-masthead');
      const ml = D.querySelector('.site-masthead__link');
      return {
        exists: !!h, html: h ? h.outerHTML : null,
        innerParentIsHeader: !!(inner && h && inner.parentElement === h),
        innerChildren: elKids(inner),
        masthead: m ? { tag: m.tagName.toLowerCase(), attrs: attrsOf(m), text: txt(m), childTags: Array.from(m.children).map(c => c.tagName.toLowerCase()) } : null,
        mastheadLink: ml ? { attrs: attrsOf(ml), text: txt(ml), parentTag: ml.parentElement.tagName.toLowerCase() } : null,
        orderInner: inner ? Array.from(inner.children).map(c => c.tagName.toLowerCase() + '.' + (c.getAttribute('class') || '')) : null
      };
    })(),
    toggle: (() => {
      const b = D.querySelector('#nav-toggle');
      if (!b) return null;
      const icon = b.querySelector('.nav-toggle__icon');
      const t = b.querySelector('.nav-toggle__text');
      return {
        tag: b.tagName.toLowerCase(), attrs: attrsOf(b), childTags: Array.from(b.children).map(c => c.tagName.toLowerCase() + '.' + (c.getAttribute('class') || '')),
        icon: icon ? { attrs: attrsOf(icon), html: icon.outerHTML, directChild: icon.parentElement === b, text: icon.textContent } : null,
        textSpan: t ? { attrs: attrsOf(t), text: txt(t), directChild: t.parentElement === b } : null,
        controlsEl: b.getAttribute('aria-controls') ? Array.from(D.querySelectorAll('#' + b.getAttribute('aria-controls'))).map(e => e.tagName.toLowerCase()) : null
      };
    })(),
    nav: (() => {
      if (!nav) return null;
      const list = nav.querySelector('.site-navigation__list');
      return {
        attrs: attrsOf(nav), html: nav.outerHTML, directChildTags: Array.from(nav.children).map(c => c.tagName.toLowerCase()),
        ulIsDirectChild: !!(list && list.parentElement === nav),
        listAttrs: list ? attrsOf(list) : null,
        items: list ? Array.from(list.children).map(li => ({
          tag: li.tagName.toLowerCase(), attrs: attrsOf(li),
          childTags: Array.from(li.children).map(c => c.tagName.toLowerCase()),
          linkCount: li.querySelectorAll('a').length,
          link: li.querySelector('a') ? { attrs: attrsOf(li.querySelector('a')), text: txt(li.querySelector('a')), directChild: li.querySelector('a').parentElement === li } : null
        })) : null
      };
    })(),
    navSubtreeFlaggedAttrs: navSubtreeAttrs,
    navLinks: Array.from(D.querySelectorAll('.site-navigation__link')).map(a => ({ text: txt(a), attrs: attrsOf(a), tag: a.tagName.toLowerCase(), parentTag: a.parentElement.tagName.toLowerCase() })),
    ariaCurrentEls: Array.from(D.querySelectorAll('[aria-current]')).map(e => ({ tag: e.tagName.toLowerCase(), cls: e.getAttribute('class'), val: e.getAttribute('aria-current'), href: e.getAttribute('href'), text: txt(e) })),
    mainAttrs: main ? attrsOf(main) : null,
    sections: sections,
    article: article ? {
      attrs: attrsOf(article),
      childEls: elKids(article),
      childOrder: Array.from(article.children).map(c => c.tagName.toLowerCase() + '.' + (c.getAttribute('class') || '')),
      header: (() => {
        const h = article.querySelector('.article__header');
        return h ? {
          directChild: h.parentElement === article,
          order: Array.from(h.children).map(c => c.tagName.toLowerCase() + '.' + (c.getAttribute('class') || '')),
          texts: Array.from(h.children).map(c => c.tagName.toLowerCase() + ' :: ' + txt(c)),
          attrs: Array.from(h.children).map(attrsOf)
        } : null;
      })(),
      body: (() => {
        const b = article.querySelector('.article__body');
        return b ? {
          directChild: b.parentElement === article,
          childOrder: Array.from(b.children).map(c => c.tagName.toLowerCase()),
          nonPChildren: Array.from(b.children).filter(c => c.tagName !== 'P').map(c => c.tagName.toLowerCase()),
          pCount: b.querySelectorAll(':scope > p').length,
          emptyPs: Array.from(b.querySelectorAll(':scope > p')).filter(p => p.textContent.trim() === '').length
        } : null;
      })(),
      date: dateEl ? {
        tag: dateEl.tagName.toLowerCase(), attrs: attrsOf(dateEl), text: txt(dateEl),
        parentTag: dateEl.parentElement.tagName.toLowerCase(),
        isDirectChildOfArticle: dateEl.parentElement === article,
        isInBody: !!(article.querySelector('.article__body') && article.querySelector('.article__body').contains(dateEl)),
        isLastArticleChild: article.lastElementChild === dateEl,
        prevSiblingTag: dateEl.previousElementSibling ? dateEl.previousElementSibling.tagName.toLowerCase() : null,
        html: dateEl.outerHTML
      } : null,
      html: article.outerHTML
    } : null,
    paragraphs: paragraphs,
    dateline: dateline,
    bodyText: txt(D.body),
    /* 浏览器自身解析器对样式表的证据：顶层规则数与 @media 位置（H12 的“语法有效/无静默丢弃”） */
    cssParse: (() => {
      try {
        const sh = document.styleSheets[0];
        if (!sh) return { ok: false, err: 'styleSheets 为空' };
        const rl = sh.cssRules;
        let mediaIdx = -1, mediaCount = 0;
        for (let i = 0; i < rl.length; i++) { if (rl[i].type === 4 || rl[i].type === CSSRule.MEDIA_RULE) { mediaCount++; if (mediaIdx < 0) mediaIdx = i; } }
        return { ok: true, top: rl.length, mediaCount, mediaIdx, lastIsMedia: (mediaIdx === rl.length - 1) && mediaCount === 1, href: (sh.href || '').split('/').pop(), mediaText: mediaIdx < 0 ? null : rl[mediaIdx].conditionText };
      } catch (e) { return { ok: false, err: String((e && e.message) || e).slice(0, 90) }; }
    })(),
    /* 逐字符边界信息：首尾字符码点，用于空白/换行折行检测 */
    paraBoundary: paragraphs.map(p => ({ i: p.i, head: cp(p.text.slice(0, 3)), tail: cp(p.text.slice(-3)) })),
    textLen: paragraphs.map(p => p.text.length),
    homeTextLen: sections.map(s => (s.pText || '').length)
  };
})()`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toUrl = (p) => 'file:///' + encodeURI(p.replace(/\\/g, '/').replace(/^([A-Za-z]:)/, '$1')).replace(/#/g, '%23');

export async function openBrowser(port) {
  const ud = path.join(HERE, '.cdp' + port);
  const proc = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${ud}`,
    '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-dev-shm-usage',
    '--allow-file-access-from-files', '--window-size=1300,900', 'about:blank',
  ], { stdio: 'ignore' });
  let ws, mid = 0;
  const pending = new Map();
  let loadCount = 0;
  async function waitReady() {
    for (let i = 0; i < 160; i++) {
      try { const l = await fetch(`http://127.0.0.1:${port}/json/version`); if (l.ok) return; } catch (e) {}
      await sleep(250);
    }
    throw new Error('chrome did not start');
  }
  function send(method, params) {
    const id = ++mid;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }
  await waitReady();
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = list.find((t) => t.type === 'page');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (msg) => {
    const p = JSON.parse(msg.data);
    if (p.id && pending.has(p.id)) { const q = pending.get(p.id); pending.delete(p.id); p.error ? q.reject(new Error(p.error.message)) : q.resolve(p.result); }
    else if (p.method === 'Page.loadEventFired') loadCount++;
  };
  await send('Runtime.enable');
  await send('Page.enable');
  return {
    async snapshot(resultsDir, pages) {
      const facts = {};
      for (const page of (pages || PAGES)) {
        const before = loadCount;
        await send('Page.navigate', { url: toUrl(path.join(resultsDir, page)) });
        for (let i = 0; i < 100 && loadCount === before; i++) await sleep(60);
        await sleep(650);
        const r = await send('Runtime.evaluate', { expression: EXTRACT, returnByValue: true });
        if (r.exceptionDetails) throw new Error(page + ' 探针异常: ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
        if (!r.result || !r.result.value) throw new Error(page + ' 探针无返回值');
        facts[page] = r.result.value;
      }
      return facts;
    },
    close() { try { ws.close(); } catch (e) {} try { proc.kill(); } catch (e) {} },
  };
}
