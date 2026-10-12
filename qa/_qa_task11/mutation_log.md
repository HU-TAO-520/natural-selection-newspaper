# Task 11 变异对照（证明回归断言有牙）

- 变异体数量：19；捕获：19；漏检或异常：0
- 真实 Results/ 六文件回归前后 SHA-256 集合 完全一致
- 对照组（未变异副本，全区段）：818 条断言，FAIL=[RB6-PIX,RB5-PIX]；相对真实运行的新增失败=[无]（判定用失败集合差分，不看 rc）

| 变异体 | 注入的违约 | 应跑区段 | 期望翻红 | 实际 FAIL 集合 | 判定 |
| --- | --- | --- | --- | --- | --- |
| M01-tap-28 | `styles.css` .js .nav-toggle { 内 padding: 0.625rem 0.75rem; → min-inline-size: 20px; | tap,tri | RD1 | RD1 | 捕获 |
| M19-link-tap-24 | `styles.css` .site-navigation__link { 内 min-block-size: 44px; → min-block-size: 20px; ; padding-top: 0.625rem; → padding-top: 0; ; padding-b | tap,tri | RD2 | RD2, RE1, RE3 | 捕获 |
| M02-overflow-1200 | `styles.css` .article__body { 内 text-align: start; → text-align: start; | mobile | RC6 | RC1, RC4, RC6 | 捕获 |
| M03-never-collapse | `styles.css` .js .site-navigation { 内 display: none; → display: block; | tri | RE2 | RE2 | 捕获 |
| M04-aria-desync | `script.js` function setOpen(open) 内 toggle.setAttribute('aria-expanded', open ? 'true' : 'false'); → /* 变异：只改 class 不改 ARIA */ | tri,interact | RE3, RE4, RF1 | RE3, RE4, RF1, RF2, RF7 | 捕获 |
| M05-no-breakpoint-reset | `script.js` function handleBreakpoint(event) 内 closeMenu(); → /* 变异：跨断点不重置 */ | cross | RG1 | RG1, RG2 | 捕获 |
| M06-esc-no-focus | `script.js` if (isOpen()) { 内 toggle.focus(); → /* 变异：Esc 不返回焦点 */ | interact | RF3 | RF3 | 捕获 |
| M07-break-all | `styles.css` line-break: strict; 内 word-break: normal; → word-break: break-all; | mobile | RC5 | RC5 | 捕获 |
| M08-gutter-32 | `styles.css` @media (max-width: 768px) { 内 --page-gutter: 1rem; → --page-gutter: 2rem; | mobile | RC1 | RC1 | 捕获 |
| M09-layout-90rem | `styles.css` --layout-max: 内 70rem; → 90rem; | desktop | RB1 | RB1 | 捕获 |
| M10-console-warn | `script.js` 'use strict'; 内 var root = document.documentElement; → console.warn('变异：脚本产生警告'); var root = document.documentElemen | load | RA3 | RA3 | 捕获 |
| M11-external-ref | `index.html` <div class="home-sections"> 内 <div class="home-sections"> → <img src="https://127.0.0.1:9/pic.png" alt=""> | load | RA2 | RA2, RA3 | 捕获 |
| M12-justify-mobile | `styles.css` .article__body { 内 text-align: start; → text-align: justify; | mobile | RC7 | RC7 | 捕获 |
| M13-title-fixed-px | `styles.css` --font-size-page-title: clamp( 内 clamp(1.75rem, 7vw, 2.25rem); → 40px; | mobile | RC2 | RC2 | 捕获 |
| M14-no-skip-link | `index.html` <a class="skip-link" 内 <a class="skip-link" href="#main-content">跳至正文</a> → <!-- 变异：删除跳转链接 --> | tap | RD4 | RD4 | 捕获 |
| M15-injected-para | `script.js` /* 3. 按钮点击切换 内 toggle.addEventListener('click' → var __p = document.createElement('p'); __p.textContent = '脚本注入的多余段 | content | RJ2 | RJ2, RJ1 | 捕获 |
| M16-zoom-overflow | `styles.css` .main-content { 内 min-width: 0; → min-width: 700px; | zoom | RH3 | RH3 | 捕获 |
| M17-nojs-nav-hidden | `styles.css` .js .site-navigation.is-open, 内 .no-js .site-navigation { | tri | RE1 | RE1, 可见可点区域：#site-navigation li:nth-child(2) a, RE3, RE2 | 捕获 |
| M18-desktop-toggle-shown | `styles.css` /* 桌面基线隐藏菜单按钮 内 .nav-toggle { | desktop | RB4 | RB4 | 捕获 |

## 结论

全部 19 个违约均被指定断言编号捕获，对照组全绿：Task 11 回归矩阵不是空跑。
