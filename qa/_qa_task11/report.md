# Task 11 浏览器回归与集成验收报告

- 验收对象：`Results/` 六个交付文件（index.html、news-message.html、news-feature.html、news-commentary.html、`styles.css`、`script.js`），全部从 `file://` 直接打开，未启动服务器、未联网。
- 运行环境：Chrome/153.0.8010.52 · `--headless=new` + Chrome DevTools Protocol（真实 Blink 渲染、真实视口切换、可信输入事件）。
- 驱动：`_qa_task11/cdp_regression.mjs`（本次共 819 条断言，PASS 819／FAIL 0）；逐条记录见 `regression_lines.txt`，机器可读结果见 `results.json`。
- 入场前提：Task 10 判定通过（`_qa_task10/report.md`：A–K 288 条全绿、0 PENDING、61 个变异全部捕获），Task 11 不重复其静态判定。
- 只读性：全程未修改任何交付文件（哈希对照见文末），运行时改 DOM／改 class 仅用于观察，未写回文件。

## 一、闸门结论

**Task 11 通过：819 条运行时断言全绿、0 失败、0 跳过；四页各自逐项完成，未以某一页推断其他页。**

Task 11 通过 + Task 10 通过 ⇒ 按总方案，整站视为**可交付**。

## 二、覆盖矩阵（四页 × 十个断言组）

| 组 | 覆盖内容 | 断言条数 | 通过 | 覆盖页面数 | 覆盖断言编号 |
| --- | --- | --- | --- | --- | --- |
| R-A 加载与资源 | 四页从 file:// 正常加载、资源无 404、无外部请求、16 条导航路径逐条可达、全程 0 错误 0 警告 | 51 | 51 | 4/4 | RA1 RA2 RA3 RA4 |
| R-B 桌面视觉 | 769／1024／1280px 版心、正文宽度、报头双细线、导航同一行、当前页样式、悬停、颜色字体、禁止视觉、横向溢出、已访问态屏幕像素 | 275 | 275 | 4/4 | RB1 RB1b RB2 RB3 RB4 RB5 RB5-V RB5-V2 RB5-PIX RB6 RB6-V RB6-PIX RB7 |
| R-C 移动视觉 | 375／768px 留白、流式字号、首页三区块、文章单栏与首行缩进、术语换行、严格溢出判定、两端对齐退出 | 138 | 138 | 4/4 | RC1 RC2 RC3 RC4 RC5 RC6 RC7 |
| R-D 点击区与焦点 | 按钮与每个链接实际点击区 ≥44×44、键盘焦点轮廓不被裁切、跳转链接第一停靠点与到达 | 40 | 40 | 4/4 | RD1 RD2 RD3 RD4 |
| R-E 菜单三态 | .no-js 常显／.js 关闭／.js .is-open 打开三态、Tab 顺序、is-open 与 aria-expanded 永不脱节 | 104 | 104 | 4/4 | RE1 RE2 RE3 RE4 |
| R-F 交互行为 | 点击、Enter／Space 不双触发、Esc＋焦点返回、链接关闭、披露式焦点、无 tabindex 管理、外点保持展开 | 60 | 60 | 4/4 | RF1 RF2 RF3 RF4 RF5 RF6 RF7 |
| R-G 跨断点重置 | 768→769 清除 .is-open 并重置 aria、按钮隐藏、导航横向恢复、缩回为关闭态、无残留无报错 | 36 | 36 | 4/4 | RG1 RG2 RG3 |
| R-H 200% 缩放 | 记录缩放前后 innerWidth、按实际视口判定布局与三态、无裁切重叠与横向滚动、根字号未被锁死为像素 | 44 | 44 | 4/4 | RH1 RH2 RH3 |
| R-I 降级回归 | 禁用 JS 后 no-js 导航常显可访问、禁用 CSS 后四页阅读顺序与无障碍树、恢复后回到基线 | 37 | 37 | 4/4 | RI1 RI2 RI3 |
| R-J 内容运行时一致性 | 浏览器所见文本／段落数与 Task 10 结论一致、无运行时注入、无字符增删 | 32 | 32 | 4/4 | RJ1 RJ2 RJ3 |
| 只读自证 | 回归前后交付物与素材哈希一致 | 1 | 1 | — | RO |

> 分组自校验：十个组共 817 条 + 只读 1 条 + 环境记录行 = 819 条；未归类的断言编号：无（若有，说明报告漏统计，不应放行）。

每组的页面覆盖（同一编号在四页各测一遍）：

| 断言 | index.html | news-message.html | news-feature.html | news-commentary.html | 条数 |
| --- | --- | --- | --- | --- | --- |
| RA1 | 1 ✔ | 1 ✔ | 1 ✔ | 1 ✔ | 4 |
| RA2 | 4 ✔ | 4 ✔ | 4 ✔ | 4 ✔ | 18 |
| RA3 | 1 ✔ | 1 ✔ | 1 ✔ | 1 ✔ | 5 |
| RA4 | 6 ✔ | 6 ✔ | 6 ✔ | 6 ✔ | 24 |
| RB1 | 6 ✔ | 6 ✔ | 6 ✔ | 6 ✔ | 24 |
| RB1b | 1 ✔ | 1 ✔ | 1 ✔ | 1 ✔ | 4 |
| RB2 | 3 ✔ | 6 ✔ | 6 ✔ | 6 ✔ | 21 |
| RB3 | 15 ✔ | 15 ✔ | 15 ✔ | 15 ✔ | 60 |
| RB4 | 6 ✔ | 6 ✔ | 6 ✔ | 6 ✔ | 24 |
| RB5 | 11 ✔ | 9 ✔ | 9 ✔ | 9 ✔ | 38 |
| RB5-V | 2 ✔ | 1 ✔ | 1 ✔ | 1 ✔ | 5 |
| RB5-V2 | 1 ✔ | — | — | — | 1 |
| RB5-PIX | 1 ✔ | 1 ✔ | 1 ✔ | 1 ✔ | 4 |
| RB6 | 16 ✔ | 15 ✔ | 15 ✔ | 15 ✔ | 61 |
| RB6-V | 2 ✔ | 1 ✔ | 1 ✔ | 1 ✔ | 5 |
| RB6-PIX | 1 ✔ | 1 ✔ | 1 ✔ | 1 ✔ | 4 |
| RB7 | 6 ✔ | 6 ✔ | 6 ✔ | 6 ✔ | 24 |
| RC1 | 10 ✔ | 10 ✔ | 10 ✔ | 10 ✔ | 40 |
| RC2 | 6 ✔ | 6 ✔ | 6 ✔ | 10 ✔ | 28 |
| RC3 | 4 ✔ | — | — | — | 4 |
| RC4 | — | 6 ✔ | 6 ✔ | 8 ✔ | 20 |
| RC5 | 6 ✔ | 6 ✔ | 6 ✔ | 6 ✔ | 24 |
| RC6 | 4 ✔ | 4 ✔ | 4 ✔ | 4 ✔ | 16 |
| RC7 | — | 2 ✔ | 2 ✔ | 2 ✔ | 6 |
| RD1 | 1 ✔ | 1 ✔ | 1 ✔ | 1 ✔ | 4 |
| RD2 | 2 ✔ | 2 ✔ | 2 ✔ | 2 ✔ | 8 |
| RD3 | 3 ✔ | 3 ✔ | 3 ✔ | 3 ✔ | 12 |
| RD4 | 4 ✔ | 4 ✔ | 4 ✔ | 4 ✔ | 16 |
| RE1 | 9 ✔ | 9 ✔ | 9 ✔ | 9 ✔ | 36 |
| RE2 | 6 ✔ | 6 ✔ | 6 ✔ | 6 ✔ | 24 |
| RE3 | 9 ✔ | 9 ✔ | 9 ✔ | 9 ✔ | 36 |
| RE4 | 2 ✔ | 2 ✔ | 2 ✔ | 2 ✔ | 8 |
| RF1 | 2 ✔ | 2 ✔ | 2 ✔ | 2 ✔ | 8 |
| RF2 | 4 ✔ | 4 ✔ | 4 ✔ | 4 ✔ | 16 |
| RF3 | 3 ✔ | 3 ✔ | 3 ✔ | 3 ✔ | 12 |
| RF4 | 2 ✔ | 2 ✔ | 2 ✔ | 2 ✔ | 8 |
| RF5 | 1 ✔ | 1 ✔ | 1 ✔ | 1 ✔ | 4 |
| RF6 | 1 ✔ | 1 ✔ | 1 ✔ | 1 ✔ | 4 |
| RF7 | 2 ✔ | 2 ✔ | 2 ✔ | 2 ✔ | 8 |
| RG1 | 6 ✔ | 6 ✔ | 6 ✔ | 6 ✔ | 24 |
| RG2 | 2 ✔ | 2 ✔ | 2 ✔ | 2 ✔ | 8 |
| RG3 | 1 ✔ | 1 ✔ | 1 ✔ | 1 ✔ | 4 |
| RH1 | 4 ✔ | 4 ✔ | 4 ✔ | 4 ✔ | 16 |
| RH2 | 2 ✔ | 2 ✔ | 2 ✔ | 2 ✔ | 8 |
| RH3 | 5 ✔ | 5 ✔ | 5 ✔ | 5 ✔ | 20 |
| RI1 | 4 ✔ | 4 ✔ | 4 ✔ | 4 ✔ | 16 |
| RI2 | 4 ✔ | 4 ✔ | 4 ✔ | 5 ✔ | 17 |
| RI3 | 1 ✔ | 1 ✔ | 1 ✔ | 1 ✔ | 4 |
| RJ1 | 3 ✔ | 5 ✔ | 5 ✔ | 6 ✔ | 19 |
| RJ2 | 2 ✔ | 1 ✔ | 1 ✔ | 1 ✔ | 5 |
| RJ3 | 2 ✔ | 2 ✔ | 2 ✔ | 2 ✔ | 8 |

## 三、关键测量证据（逐条摘自本次运行记录）

### R-A 加载与资源
- `index.html`：从 file:// 直接打开并完成 load 事件 — load=true title=《自然选择号》报社简介｜自然选择号
- `news-message.html`：从 file:// 直接打开并完成 load 事件 — load=true title=我校启动校本课程志愿填报｜自然选择号
- `news-feature.html`：从 file:// 直接打开并完成 load 事件 — load=true title=从数学题到AI时代的学习｜自然选择号
- `news-commentary.html`：从 file:// 直接打开并完成 load 事件 — load=true title=设备升级了，使用门槛也该降下来｜自然选择号
- 资源与外部请求：DevTools 资源树：本目录资源全部成功、无 failed、无外部 URL — [{"n":"styles.css","t":"Stylesheet","failed":false,"local":true},{"n":"script.js","t":"Script","failed":false,"local":true}]
- DOM/CSSOM 外链扫描：DOM 属性与 CSSOM 规则中无 http(s)/协议相对/data/@import/url() 外链（远程字体、CDN 均无） — {"bad":[],"rules":[]}
- Network 域汇总：全程 12 条网络事件，其中 `RESP 200 file://` 6 条、其他协议 0 条、失败 0 条（合同要求 0 条外部请求）
- 16 条导航路径：16 条逐条点击全部到达现有页面（每页 4 条 ×4 页），示例：点击第 1 项「首页」→ index.html（16 条路径逐条） — 目标文件存在=true navigated=1 落地=index.html 标题=《自然选择号》报社简介｜自然选择号
- 控制台：0 错误 0 警告 —— 全程 Runtime/Log 采集到的 error+warning 级事件 0 条；四页加载阶段各自 0 条

### R-B 桌面视觉
- 版心 @1280：量公共版心 .site-header__inner ≤1120 且左右留白对称 — 版心=1120px 留白 L80/R80.0
- 版心 @769（断点起点）：量公共版心 .site-header__inner ≤1120 且左右留白对称 — 版心=705px 留白 L32/R32.0
- 版心 @1024：1024 版心≈960（100% − 2×2rem） — 版心=960px inner=1024 client=1024（桌面测量含滚动条占位 0px）
- 正文宽度 @1280：正文／首页文字区宽度 ≤736 — 文字块=736px；.article__body max-width ≤736 — max-width=736px
- 首页文字区 @1280：正文／首页文字区宽度 ≤736 — 文字块=736px
- 报头双细线与文字关系：双细线不被报头文字穿越（文字盒完全位于两条线之间） — 文字距上线 20px、距下线 20px
- 当前页样式：当前页=暗红+700+2px 暗红实下边线 — color=rgb(122, 36, 36) fw=700 bb=2px solid rgb(122, 36, 36)
- 悬停不位移：强制 hover 第 2 项：仅变暗红，不位移不缩放 — 色 rgb(33, 31, 28) → rgb(122, 36, 36)
- 禁止视觉扫描：无渐变/阴影/圆角/分栏/滤镜/缩放过渡等被禁视觉 — （规则表由浏览器 CSSOM 实测读取）
- 桌面溢出 @1280：横向溢出严格判定 scrollWidth<=innerWidth（1280<=1280） — scrollW=1280 inner=1280 client=1280 scrollX=0；更严格：scrollWidth<=clientWidth — 1280<=1280
- 已访问态配色（四页真点击访问 + 4s 轮询，脚本读数）：用户已访问全部目标页后，普通导航链接仍为深色（未被 a:visited 覆盖为暗红） — 刚加载=[["首页","rgb(33, 31, 28)"],["新闻通讯","rgb(33, 31, 28)"],["新闻评论","rgb(33, 31, 28)"]] → 轮询 4s 后=[["首页","rgb(33, 31, 28)"],["新闻通讯","rgb(33, 31, 28)"],["新闻评论","rgb(33, 31, 28)"]]；当前页=[["新闻消息","rgb(122, 36, 36)"]]
- 报头屏幕像素（已访问态，权威判定）：屏幕像素：报头"自然选择号"必须是深色文字（Task 3 纸媒基线），不得被 a:visited 重绘为暗红 — 实测 rgb(33,31,28) 距ink=0 距accent=89 → 深色(ink)；时间线 1.8s: 报头=深色(ink) 非当前链接=深色(ink),深色(ink),深色(ink) ; 3.6s: 报头=深色(ink) 非当前链接=深色(ink),深色(ink),深色(ink) ; 5.4s: 报头=深色(ink) 非当前链接=深色(ink),深色(ink),深色(ink)
- 普通链接屏幕像素（已访问态，权威判定）：屏幕像素：三个非当前页导航链接必须是深色（合同：普通链接为深色、当前链接为暗红） — [["新闻消息","rgb(46,33,36)","深色(ink)"],["新闻通讯","rgb(38,31,33)","深色(ink)"],["新闻评论","rgb(41,32,36)","深色(ink)"]]；时间线 5.4s: 报头=深色(ink) 非当前链接=深色(ink),深色(ink),深色(ink)

### R-C 移动视觉
- 留白与版心收缩：左右留白各约 16px（--page-gutter:1rem） — L16 R16.0
- 无内部滚动区／无超宽元素：无内部滚动区、无超出视口的固定像素宽元素、无裁切 — 内部滚动元素=[] 过宽元素=[]
- 流式字号：报头按 clamp(2.5rem,11vw,3.5rem) 流式缩小（1280 基线 64px） — 实测=41.25px
- 长标题折行：长评论标题在窄宽度自然折成多行、任一移动宽度都不溢出（768px 下单行即为正确结果） — 行数=2 343<=343 盒宽=343 client=375
- 首页三区块：首页三区块保持单列、顺序不变 — [[16,343,263,373],[16,343,373,483],[16,343,483,594]]
- 首行缩进与电头：.dateline 仍内联于首段首行 — {"present":true,"text":"自然选择号9月18日7时电","disp":"inline","fw":"700","top":358.5625,"pTop":352.5625,"isFirstP":true} 行高=32.3（内联盒与行盒 top 允许相差 <1 行）
- 术语换行：基线命中的 8 个中英文混排术语（AI, .exe, Windows 10, UOS, USB, OPS, Linux, 4K）在渲染文本中原样完整 — 全部命中
- 严格溢出判定：scrollWidth<=innerWidth 严格判定（不放宽 1px） — 375<=375
- 两端对齐退出：移动端正文改为 text-align: start（窄行不留大空隙） — text-align=start

### R-D 点击区与焦点
- 按钮：.nav-toggle 实际 getBoundingClientRect ≥44×44 CSS px — 86×46
- 链接：每个可见 .site-navigation__link 实际点击区 ≥44×44 — [[343,46],[343,46],[343,46],[343,46]]
- 链接占满行宽：链接占满行宽便于触控 — 导航宽=343 链接宽=343,343,343,343
- 焦点轮廓：纯键盘到达菜单按钮，暗红实线轮廓清晰且不被裁切 — active=nav-toggle outline=2px solid rgb(122, 36, 36) offset=3px 裁切祖先=[]
- 跳转链接：跳转链接是第一个 Tab 停靠点 — active=skip-link/A
- 到达正文：激活跳转链接后跳到 #main-content 且正文获得焦点 — active=main-content/MAIN

### R-E 菜单三态
- `.no-js`：先禁用 JS 再硬刷新：html 仍为 no-js — no-js
- `.no-js` 导航：四项导航纵向常显、可点击、可聚焦 — nav=block [[343,46,true],[343,46,true],[343,46,true],[343,46,true]]
- `.js` 关闭：JS 可用硬刷新后 html 为 js 且不含 no-js — js
- 不留异常空白：页面不因隐藏导航留下异常固定高度或空白（只有展开才增高、把正文下推） — header 高 闭=164 开=364 Δ=200 四链接合计=184; main.top 164->364
- `.js .is-open` 打开：激活按钮后：.is-open + aria-expanded=true + 导航显示 — open=true aria=true disp=block
- 展开不压正文：展开菜单不覆盖正文、不横向推挤报头 — nav.bottom=364 main.top=364 inner.right=359.0 client=375
- Tab 顺序：Tab 顺序自然：按钮→四个导航链接（第 5 次离开导航） — nav-toggle > site-navigation__link > site-navigation__link > site-navigation__link > site-navigation__link > skip-link
- 状态不脱节：is-open 与 aria-expanded 同步（关闭） — open=false aria=false

### R-F 交互行为
- 点击切换：再次点击关闭一次，状态与 ARIA 同步 — open=false aria=false
- Enter：聚焦按钮按 Enter：恰好一次激活（keydown 激活） — Δclick=1 open=true aria=true
- Space：Space：与点击等效、恰好一次激活（keyup 激活） — Δclick=1 open=true aria=true
- Esc＋焦点返回：打开态（焦点在 site-navigation__link）按 Esc：关闭菜单且焦点返回 #nav-toggle — open=false aria=false active=nav-toggle
- 关闭态 Esc：关闭态按 Esc 无副作用（不抢焦点、不滚动） — active nav-toggle->nav-toggle scrollY 0->0
- 链接关闭并导航：打开态点击第 3 项「新闻通讯」：先关闭再导航，落地无展开残留 — navigated=1 落地=news-feature.html open=false aria=false
- 披露式焦点：披露式焦点策略：焦点保持在按钮，未强制移入菜单 — nav-toggle
- 未用 tabindex 管理：折叠由 CSS display 负责：脚本未用 tabindex/aria-hidden/hidden/inert 管理链接可聚焦性 — 导航子树被标记属性=[] main.tabindex=-1
- 点击菜单外保持展开（合同已定，不判失败）：点击菜单外正文区域：菜单保持展开（合同已定，不实现外点关闭，不判失败） — open=true aria=true

### R-G 跨断点重置
- 对照监听证明本环境派发 change：对照监听：本渲染环境确实派发 mediaquery change 事件 — ["change:true"]
- 768→769 状态清理：跨到 769px：.is-open 清除且 aria-expanded 重置 false — open=false aria=false
- 768→769 视觉恢复：移动字号与移动间距退出，桌面基线回来（报头 64px、版心=视口−2×2rem、导航 gap 恢复） — mast=64px 版心=705 client=769 期望=705 gap=40px
- 缩回不复用旧状态：再缩回 ≤768px：菜单为关闭态，不复用旧展开状态 — open=false aria=false

### R-H 200% 缩放
- 缩放前：记录缩放前 innerWidth=1280 — client=1280 根字号=16px 报头=64px 版心=1120
- 缩放后与机制：记录缩放后 innerWidth=640（100% 时为 1280） — 机制=CDP zoom=2 在本 Chrome 为 no-op（zoom_probe.mjs 已证实）→ 用 640px 布局视口 + deviceScaleFactor=2 复现 200% 的布局与绘制两个效果；dpr=2 client=640
- 两个效果同时成立：缩放的两个效果同时成立：CSS 视口折半（1280→640）且文字实际像素翻倍 — inner=640 dpr=2 报头 CSS=56px 实际=641 设备像素（100% 时 381px）
- 缩放后布局判定：缩放后 innerWidth≤768：进入移动布局（属预期正确结果），按钮可见、导航折叠 — inner=640 tog=flex nav=none
- 缩放下三态与点击区：复查菜单三态与 44px 点击区 — open=true [[608,46],[608,46],[608,46],[608,46]]
- 缩放后无溢出：200% 下无横向滚动 — scrollW=640 inner=640 client=640

> 缩放手段说明：本渲染环境的 CDP `Emulation.setDeviceMetricsOverride` `zoom` 参数实测为 no-op（`zoom=1` 与 `zoom=2` 均 `innerWidth=1280`、`dpr=1`，见 `zoom_probe.mjs` 输出）。
> 因此按真实浏览器缩放的两个效果分别复现：布局效果 = CSS 视口 1280÷2=640px；绘制效果 = `deviceScaleFactor=2`（文字实际像素翻倍）。
> 未使用合同禁止的 CSS `zoom`、`transform: scale()` 或截图放大伪装。

### R-I 降级回归
- 禁用 JS：禁用 JS 并硬刷新：html 保持 no-js，CSS 仍生效（样式不依赖脚本） — class=no-js rules=45
- 禁用 JS 正文完整：无脚本时正文完整可见、与 Task 10 基线逐段全等（29 段） — 实测=29 段
- 禁用 CSS 首页顺序：首页阅读顺序：主标题→三区块标题及其文本 — 序=[0,1,2,3,4,5,6]（文本节点 7 个）
- 禁用 CSS 文章页顺序：文章页阅读顺序：页面类型→标题→署名→正文 — 类型=0 标题=1 署名=2 正文首段=3 / 共 27 个文本节点
- 禁用 CSS 无障碍树：导航链接仍在文档树与无障碍树中（role=link + 可访问名） — [{"role":"link","name":"首页"},{"role":"link","name":"新闻消息"},{"role":"link","name":"新闻通讯"},{"role":"link","name":"新闻评论"}]
- 恢复基线：恢复启用并硬刷新：回到正常基线、无残留 — class=js bg=rgb(245, 239, 228) 版心=1120

### R-J 内容运行时一致性
- 段落数量（4／23／29+1／首页三区块）：index=桌面=0 移动=0，news-message=桌面=4 移动=4，news-feature=桌面=23 移动=23，news-commentary=桌面=29 移动=29
- 渲染文本 vs Task 10 基线：移动渲染正文与 Task 10 逐段基线全等（CSS 换行/clamp/安全换行未增删字符） — 渲染字符=2038 基线=2038
- 跨断点文本一致：跨断点所见正文文本一致 — 
- 伪元素不生成文字：伪元素 content 只用于画线（空串），未生成任何可见文字 — content 声明 2 处：["content: \"\"","content: \"\""]；可疑：[]
- 交互后无注入文本：全部交互与降级之后主内容无脚本注入文本、无字符增删 — 字符 193 -> 193

## 四、截图证据（均位于 `Results/` 之外）

共 49 张，目录 `_qa_task11/shots/`：

| 截图 | 内容 |
| --- | --- |
| `shots/index-1280-nocss.png` | 桌面 1280px 禁用 CSS：裸文档流阅读顺序 |
| `shots/index-1280-visited-history.png` | 四页均已访问后的导航配色 |
| `shots/index-1280-visited-pixels.png` | 桌面 1280px 全页视觉基线 |
| `shots/index-1280-warm-history.png` | 热历史下的桌面导航配色 |
| `shots/index-1280.png` | 桌面 1280px 全页视觉基线 |
| `shots/index-375-closed.png` | 移动 375px 菜单折叠态（.js） |
| `shots/index-375-full.png` | 移动 375px 整页（含正文全程） |
| `shots/index-375-nojs.png` | 移动 375px 禁用 JS：导航常显（.no-js 态） |
| `shots/index-375-open-focus.png` | 移动 375px 打开菜单且键盘焦点在链接上 |
| `shots/index-375-open.png` | 移动 375px 菜单展开态（.js .is-open） |
| `shots/index-375-skip-focus.png` | 跳转链接获得焦点并到达正文 |
| `shots/index-769.png` | 桌面最小断点 769px |
| `shots/index-after-reset.png` | 跨断点重置后的状态 |
| `shots/index-zoom200.png` | 200% 缩放（640px 布局视口 + dpr 2） |
| `shots/news-commentary-1280-nocss.png` | 桌面 1280px 禁用 CSS：裸文档流阅读顺序 |
| `shots/news-commentary-1280-visited-pixels.png` | 桌面 1280px 全页视觉基线 |
| `shots/news-commentary-1280.png` | 桌面 1280px 全页视觉基线 |
| `shots/news-commentary-375-closed.png` | 移动 375px 菜单折叠态（.js） |
| `shots/news-commentary-375-full.png` | 移动 375px 整页（含正文全程） |
| `shots/news-commentary-375-nojs.png` | 移动 375px 禁用 JS：导航常显（.no-js 态） |
| `shots/news-commentary-375-open.png` | 移动 375px 菜单展开态（.js .is-open） |
| `shots/news-commentary-375-skip-focus.png` | 跳转链接获得焦点并到达正文 |
| `shots/news-commentary-769.png` | 桌面最小断点 769px |
| `shots/news-commentary-after-reset.png` | 跨断点重置后的状态 |
| `shots/news-commentary-zoom200.png` | 200% 缩放（640px 布局视口 + dpr 2） |
| `shots/news-feature-1280-nocss.png` | 桌面 1280px 禁用 CSS：裸文档流阅读顺序 |
| `shots/news-feature-1280-visited-pixels.png` | 桌面 1280px 全页视觉基线 |
| `shots/news-feature-1280.png` | 桌面 1280px 全页视觉基线 |
| `shots/news-feature-375-closed.png` | 移动 375px 菜单折叠态（.js） |
| `shots/news-feature-375-full.png` | 移动 375px 整页（含正文全程） |
| `shots/news-feature-375-nojs.png` | 移动 375px 禁用 JS：导航常显（.no-js 态） |
| `shots/news-feature-375-open.png` | 移动 375px 菜单展开态（.js .is-open） |
| `shots/news-feature-375-skip-focus.png` | 跳转链接获得焦点并到达正文 |
| `shots/news-feature-769.png` | 桌面最小断点 769px |
| `shots/news-feature-after-reset.png` | 跨断点重置后的状态 |
| `shots/news-feature-zoom200.png` | 200% 缩放（640px 布局视口 + dpr 2） |
| `shots/news-message-1280-nocss.png` | 桌面 1280px 禁用 CSS：裸文档流阅读顺序 |
| `shots/news-message-1280-visited-pixels.png` | 桌面 1280px 全页视觉基线 |
| `shots/news-message-1280.png` | 桌面 1280px 全页视觉基线 |
| `shots/news-message-375-closed.png` | 移动 375px 菜单折叠态（.js） |
| `shots/news-message-375-full.png` | 移动 375px 整页（含正文全程） |
| `shots/news-message-375-nojs.png` | 移动 375px 禁用 JS：导航常显（.no-js 态） |
| `shots/news-message-375-open.png` | 移动 375px 菜单展开态（.js .is-open） |
| `shots/news-message-375-skip-focus.png` | 跳转链接获得焦点并到达正文 |
| `shots/news-message-769.png` | 桌面最小断点 769px |
| `shots/news-message-after-reset.png` | 跨断点重置后的状态 |
| `shots/news-message-zoom200.png` | 200% 缩放（640px 布局视口 + dpr 2） |
| `shots/visited-pixel-index-1280.png` | 桌面 1280px 全页视觉基线 |
| `shots/visited-probe-index-1280.png` | 桌面 1280px 全页视觉基线 |

## 五、回归矩阵执行对照（本任务的合同要求）

| 合同要求 | 实际执行 | 证据 |
| --- | --- | --- |
| 四页各一遍，不以一页推断其他页 | 十个断言组全部在 4/4 页执行，逐页独立导航与测量 | 第二节覆盖矩阵 |
| 375／768／769／1280 四个固定宽度 | 每页四宽度全测，另补 1024px 版心与 200% 缩放 | `RB1/RB1b/RC1/RC6/RH1` |
| 严格 `scrollWidth <= innerWidth`，不放宽 1px | 同时要求 `<= clientWidth`（更严格：innerWidth 含滚动条占位） | `RB7`/`RC6` |
| 菜单三态与 Task 9 五项交互 | 禁用 JS 硬刷新＋真实点击＋可信键盘事件逐页验跑 | `RE1-RE4`/`RF1-RF7` |
| 按钮与每个链接点击区 ≥44×44 | 取 `getBoundingClientRect()` 实际值，展开态逐链接测 | `RD1`/`RD2` |
| 焦点轮廓清晰且不被裁切 | 键盘 Tab 真实 `:focus-visible` + 祖先 overflow 链检查 | `RD3`/`RD4` |
| 禁用 JS／禁用 CSS 降级 | `Emulation.setScriptExecutionDisabled` 与 `styleSheets[].disabled`，先禁用再硬刷新 | `RI1`/`RI2` |
| 控制台 0 错误 0 警告、资源无 404、无外部请求 | Runtime/Log/Network/资源树四类证据合并判定 | `RA1-RA4` |
| 桌面未被移动规则污染、移动未破坏桌面基线 | 190 项 Task 3 桌面静态不变量仍全绿（Task 10 交叉验证）+ 本次 769px 起移动规则退出的实测 | `RG1`/`RB*`/`RC*` |
| 回归结论可追溯到断言编号 | 本报告全部数字取自 `results.json`／`regression_lines.txt` | 第三、六节 |

## 六、验收脚本自身的有效性（变异对照）

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

## 七、只读自证

```
73f49fd8d01bb578a5a1fcc76ca8967e19feb29ec8e1c64e1aed7b2006c3d901  index.html  2612
a2dbf4aac57472e8a8728f80908dc366d3aa9076310bbb39b24d71f251ea8d52  news-commentary.html  8486
73ff75678c453badbc1edcb1ff590001dc93cade3260ff364e042d02075df9a5  news-feature.html  6962
66ae5826bbdf9829206c6374305e7bf4bab546c65485349db5fff40e0b5fa0e8  news-message.html  3011
abb39e4a6d218546b45eded0fa601540d2c5195d93c9fe1dfa8aaaabca13c666  script.js  2204
2c23817299492ea9a3fd7ad23237cfabd6723d166bd99194febbed09ad418ba1  styles.css  12401
de10b575399e0563430f2f255c956b179c9978c087897a24910ad70d6a50f6fc  Materials/新闻消息.docx  14742
8e50cfc89287035163d5fe95c8b1cee20a5aa405e9d04ec358fb5c9312c3827c  Materials/新闻评价.docx  20014
0c5b35256b7271acfb2f49aec146288b404ed49c376ac2c8b3f6246b38f894a4  Materials/新闻通讯.docx  17155
```

回归结束后重新计算（`baseline_hashes_after.txt`）与上表逐字节一致：`SHA-256／字节数／清单完全一致，Results/ 仍恰为 6 个文件，无临时产物混入`。

## 八、完成定义对照

| 完成定义项 | 状态 |
| --- | --- |
| 回归全程只读；六个文件与三份素材前后 SHA-256 与清单一致 | ✔ RO 1/1 全绿；驱动内 hashBefore==hashAfter |
| R-A：四页从 file:// 正常加载，无 404、无外部请求，全程 0 错误 0 警告 | ✔ R-A 51 条：全绿 |
| R-B：桌面版心 ≤1120、正文 ≤736、报头／导航／当前页／焦点／视觉合规，无横向滚动 | ✔ R-B 275 条：全绿 |
| R-C：移动留白／流式字号／三区块／单栏缩进／术语换行，scrollWidth<=innerWidth | ✔ R-C 138 条：全绿 |
| R-D：点击区 ≥44×44，焦点轮廓与跳转链接清晰不被裁切 | ✔ R-D 40 条：全绿 |
| R-E：菜单三态显示、Tab 顺序与状态同步全部正确 | ✔ R-E 104 条：全绿 |
| R-F：点击／Enter／Space／Esc＋焦点返回／链接关闭正确，无双触发无脱节；外点保持展开不判失败 | ✔ R-F 60 条：全绿 |
| R-G：跨断点清除 is-open、重置 aria、按钮隐藏、导航横向恢复、缩回为关闭态 | ✔ R-G 36 条：全绿 |
| R-H：200% 缩放按实际 innerWidth 表现正确，已记录缩放前后宽度 | ✔ R-H 44 条：全绿 |
| R-I：禁用 JS 导航常显可访问；禁用 CSS 阅读顺序完整；恢复后回到基线 | ✔ R-I 37 条：全绿 |
| R-J：浏览器所见文本、段落数量与顺序与 Task 10 一致，无注入无增删 | ✔ R-J 32 条：全绿 |
| 产出可追溯断言编号的回归报告，FAIL 附复现与移交 | ⚠ 本报告；0 条 FAIL |
| 临时截图、脚本与记录均在 Results/ 之外 | ✔ 本报告、results.json、regression_lines.txt、mutation_log.md、shots/（49 张）均在 _qa_task11/；Results/ 仍恰为 6 个文件 |
| 无失败项时判定整站可交付 | ✔ 判定：Task 11 通过；与 Task 10 共同构成整站可交付 |

## 九、复跑命令

```powershell
cd C:\Users\weibo\Documents\语文报纸\_qa_task11
node cdp_regression.mjs    # 四页全矩阵（含像素级 :visited 回归）-> regression_lines.txt / results.json / shots/
node mutate_task11.mjs     # 19 个运行时违约变异对照 + 未变异对照组 -> mutation_log.md
node visited_pixel_probe.mjs  # 报头/导航链接已访问态的屏幕像素 A/B（getComputedStyle 会伪装，必须看像素）
node zoom_probe.mjs        # 判定缩放机制（本 Chrome 的 CDP zoom 为 no-op）
node make_report.mjs       # 由 results.json 生成本报告
```
