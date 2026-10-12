# Task 3 验收报告：桌面端纸媒视觉系统

- 交付文件：`Results/styles.css`（新建，348 行，UTF-8 无 BOM，7 680 字节，解析出 42 条规则）
- 范围核对：`Results/` 目录仍只有 `index.html`、`news-message.html`、`news-feature.html`、
  `news-commentary.html`、`styles.css` 五个文件；四个 HTML 与 `Materials/` 未被修改。
- 验收工具：`_qa_task3/verify_css.py`（199 项静态合同检查）、`_qa_task3/mutate.py`（53 个变异体）、
  无头 Chrome 真实渲染截图（`_qa_task3/shots/`）、Qoder 内置浏览器同域 iframe 精确布局测量。

## 1. 静态合同检查（verify_css.py）

```
共 199 项，通过 199，失败 0        # python _qa_task3/verify_css.py
```

覆盖：文件与资源、`:root` 变量逐字比对、结构接口选择器、版心公式、
各组件行为断言、色彩使用、语法完整性，以及计划「禁止项验证」列出的全部模式。

关键结果：

- 五个颜色变量、字体栈、`--layout-max: 70rem`、`--reading-max: 46rem` 与合同逐字一致；
  自定义属性无重复声明，`var()` 引用全部有定义，无 `--bg`/`--container-width` 之类语义重复别名。
- 样式表中不存在 `@import`、`@font-face`、`url(`、`http(s)://`、盘符路径；十六进制色值只出现在 `:root`。
- 禁止项零命中：`box-shadow`、`text-shadow`、渐变、`background-image`、`border-radius`、
  `column-count`/`column-width`、`overflow-x: hidden/clip`、`word-break: break-all`、`!important`、
  CSS `content`、`text-transform`、`font-style: italic`、`user-select: none`、`opacity`、
  `outline: none/0`、Grid、`transition`/`animation`、`100vw`、固定像素版心、全局 `letter-spacing`。
- 无 ID 选择器、无 `body.index`／`:nth-child()` 页面识别补丁、无 `@media`（移动端规则留给 Task 8）。
- `white-space: nowrap` 仅出现在 `.site-navigation__link`；标题与正文均未继承。
- 首行缩进选择器严格为 `.article__body > p`，不存在 `.main-content p`／`.article p`。
- 四页公共接口数量与 Task 2 合同一致（每页 1 个 `.skip-link`／`.site-navigation`／`.main-content`／
  `h1.page-title`、4 个 `.site-navigation__link`、1 次 stylesheet 引用），未新增第二个导航容器。

## 2. 变异测试（证明验收脚本不是空跑）

```
变异 53 个 + 对照组 1 个；未达预期 0 个     # python _qa_task3/mutate.py
```

对照组（真实交付）通过，53 个违约变异全部被至少一项检查捕获，包括：
注入 `box-shadow`／渐变／`url()` 背景／`@font-face`、`!important`、`#site-navigation` ID 选择器、
`content: "作者："` 注入、`text-transform: uppercase`、改色值与改 `70rem`/`46rem`、
重复变量、报头字号写死 `64px`、报头改单线、汉堡按钮显示、导航默认隐藏、`.no-js` 导航隐藏、
导航 `overflow: hidden`、**当前页下边框改为 transparent（只靠颜色区分）**、导航四等分、
移除焦点轮廓、跳转链接 `display: none`／无 `:focus` 规则／`z-index: 0`、版心用 `100vw`、
版心加 `padding-inline`、标题 `nowrap`、`.main-content p` 全局缩进、段落取消缩进、
`:nth-child` 补丁、提前写 `@media (max-width: 768px)`、`transition`、Grid 卡片、署名斜体、
别名变量、**改名伪造 `.home-*`／`.article*` 接口**、电头转块级、日期左对齐并缩进、
HTML 内联 `<style>`、`style=` 属性、`Results/` 多余文件、复制第二套导航。

其中「当前页只改颜色」「改名伪造接口」三个变异最初未被捕获，已据此加强脚本
（下边框必须为暗红实线、接口选择器改为精确匹配而非子串匹配），现全部捕获。

## 3. 1024px / 1280px 真实布局测量

Qoder 内置浏览器无可见表板（`viewport=0x0, visible=false`），改用**同域 iframe 构造真实
Chromium 布局视口**，把 `documentElement.clientWidth` 精确设为 1024 与 1280 后测量。
四页 × 两宽度共 8 组，结果完全一致：

| 视口 | `.site-header__inner` | `.main-content` | 左/右边距 | `scrollWidth` | 横向溢出 |
| --- | --- | --- | --- | --- | --- |
| 1024px | 960.00px | 960.00px | 32.00 / 32.00 | 1024 | 无 |
| 1280px | 1120.00px | 1120.00px | 80.00 / 80.00 | 1280 | 无 |

与「版心计算合同」表格逐项吻合，两容器共享同一中轴线（1024 下中心 512，1280 下中心 640）。

其他实测值（四页一致）：

- 报头 `自然选择号`：单行，宽 381.44px、高 80px（=64×1.25），左右留白各 289.28px 精确居中；
  距上下双线各 20px，文字不触碰双线；`letter-spacing` 与 `text-indent` 均为 10.24px（0.16em）。
- 报头上下边框 computed：`3px double rgb(184, 170, 152)`。
- 主导航：`.nav-toggle` computed `display: none`、`offsetHeight = 0`；
  `.site-navigation` computed `display: block`、`offsetHeight = 53`（无脚本 `html.no-js` 状态下同样可见）。
- 四个链接 `top` 同为 150、`height` 同为 52，相邻间距实测恒为 40.0px（2.5rem），
  宽度 34.6/69.1/69.1/69.1，未被拉成 240px 四等分。
- 页面标题：宽 832px（`--title-max`）、字号 40px、行高 50px，居中且左右对称。
- 正文基准 16px、`body` 背景 `rgb(245, 239, 228)`、字体栈 `"Songti SC", STSong, SimSun, serif`。
- 每页 `h1` 数量 1，可聚焦元素 7 个。

## 4. 键盘与跳转链接

- 真实按下 Tab 键：`document.activeElement` 为 `.skip-link`（跳至正文），确认它是第一个 Tab 停靠点。
- 焦点顺序（DOM 实测）：`skip-link → 报头链接 → 菜单按钮 → 首页 → 新闻消息 → 新闻通讯 → 新闻评论`。
- `.skip-link` computed：`position: fixed`、`z-index: 100`、`padding: 12px 16px`、
  `border: 2px solid rgb(122, 36, 36)`、未聚焦 `transform: translateY(-78px)`（=−150%）且 `top = -78`（移出视口）。
- 在 1024px 视口内触发聚焦后：`transform → translateY(0)`、出现在左上角，
  `.site-header` 的 `getBoundingClientRect()` 前后完全相同（不推动布局），
  `scrollWidth` 不变（不产生横向滚动），`z-index 100` 覆盖静态定位的报头。
- 点击跳转后 `location.hash = "#main-content"` 且 `activeElement` 变为 `MAIN#main-content`；
  `.main-content:focus` 保留 `outline` 与 `outline-offset: 3px`，未移除焦点提示。
- 内置浏览器因窗口未获系统焦点，`:focus-visible` 与 `:focus` 伪类不匹配（`hasFocus() = false`），
  故改用 `--allow-file-access-from-files` 无头渲染 + 运行时克隆真实声明的方式完成像素级确认（见第 6 节）。

## 5. 内容组件接口（Task 3 即时验证）

用 `_qa_task3/probe-content.html`（位于 `Results/` 之外，仅引用同一份 `styles.css`）
在 1024 与 1280 下实测，两宽度结果一致：

| 项 | 实测 |
| --- | --- |
| `.home-sections` | 宽 736px（`--reading-max`）、水平居中、与主标题间距 48px（3rem） |
| `.home-section` | 上边框 `1px solid rgb(184,170,152)`、纵向内边距 24px、仅末块有下边框 |
| `.home-section__title` | `rgb(122,36,36)`、24px、左对齐、`text-indent: 0`、下边距 12px |
| `.home-section__text` | 18px / 34.2px（1.9）、`text-indent: 0`（占位符不缩进） |
| `.article__header` | 宽 832px 居中、下边框 1px、下内边距 24px |
| `.article__type` | 15px、`rgb(122,36,36)`、字间距 2.7px、`text-transform: none`、无缩进 |
| `.article__byline` | `rgb(102,93,86)`、15px、居中、`font-style: normal`、**`text-indent: 0`**、距标题 16px |
| `.article__body` | 宽 736px、`column-count: auto`（单栏）、`justify` + `inter-ideograph`、`strict`/`normal`/`hyphens: none` |
| `.article__body > p` | `margin: 0`、`text-indent: 36px`（2em）、相邻段落 `margin-top: 13.5px`（0.75em） |
| `.dateline` | `STRONG`、`display: inline`、`font-weight: 700`、`margin: 0`，电头后保留原文半角空格 |
| `.article__date` | 宽 736px、右对齐、`text-indent: 0`、上间距 24px、`rgb(33,31,28)` |
| 横向溢出 | 两宽度下 `overflow` 元素列表为空，`scrollWidth == clientWidth` |

`Windows 10`、`UOS`、`Linux`、`4K`、`.exe` 混排段落未出现强制断词或溢出；
28 字长标题在 832px 内自然折为两行（高 100px = 2×50px），`text-wrap: balance` 生效且左右对称。
**未向四个正式 HTML 添加任何占位内容。**

## 6. 渲染截图（无头 Chrome，真实像素）

`--headless=new --hide-scrollbars --force-device-scale-factor=1 --allow-file-access-from-files`：

| 文件 | 视口 | 结论 |
| --- | --- | --- |
| `shots/index_1024.png` | 1024×768 | 暖白纸面、双线报头、居中宋体大字、导航单行、当前页暗红＋实线，无横向滚动条 |
| `shots/index_1280.png` | 1280×800 | 版心 1120px 居中，报头/导航/正文同一中轴 |
| `shots/commentary_1024.png` | 1024×768 | 当前页正确落在「新闻评论」，长标题单行居中 |
| `shots/message_1280.png`、`shots/feature_1024.png` | — | 当前页状态逐页正确 |
| `shots/probe_states.png` | 1024×1150 | 见下 |
| `shots/probe_content_1024.png`、`probe_content_1280.png` | — | 首页三段与文章头部/正文/日期层级清晰，单栏、两端对齐、2em 缩进 |

`probe_states.png` 把 `styles.css` 中 `:focus-visible`／`:focus`／`:hover` 的**原样声明**
运行时克隆到普通类后渲染，可确认：

- 跳转链接聚焦后以暖白底＋暗红边框出现在左上角，覆盖报头且不推动布局；
- 报头链接、导航链接的焦点环为 2px 暗红实线、离字 3px，未被导航底边线或容器裁切；
- `#main-content` 到达后显示完整轮廓框；
- 悬停时报头与导航文字转暗红、导航出现浅色下边线，位置与高度均无变化（无位移/缩放）；
- 当前页「新闻通讯」同时具备暗红文字、700 字重与 2px 暗红实线下边线，非仅靠颜色。

## 7. 控制台

四页 `file://` 直开后仅剩 3 条 `ERR_FILE_NOT_FOUND`，全部指向 `Results/script.js`
（Task 9 交付物，按中间态不视为 Task 3 失败）；`styles.css` 加载无任何报错。

## 8. 完成定义逐项

- [x] `Results/styles.css` 已创建，四页共享引用且 `file://` 离线可加载（实测 42 条规则生效）
- [x] 五个颜色值、字体栈、`70rem` 版心、`46rem` 正文宽符合合同（逐字比对 + 实测 736/1120/960）
- [x] 全局盒模型、背景、文字、链接与基础排版已建立
- [x] 跳至正文链接与 `:focus-visible` 清晰、可键盘访问（真实 Tab 实测 + 渲染截图）
- [x] 报头为醒目宋体大字＋双细线，无图片或视觉特效
- [x] 桌面主导航横向显示，汉堡按钮隐藏，当前页状态不只依赖颜色
- [x] 主内容与标题层级清晰，长标题不造成横向溢出（28 字标题实测两行居中、无溢出）
- [x] 首页三个语义区块所需 `.home-*` 接口已定义并实测渲染
- [x] 三个文章页共用 `.article*`、`.dateline` 接口已定义并实测渲染
- [x] 正文单栏、最大 736px、行高 1.9、`2em` 首行缩进
- [x] 1024px 与 1280px 版心居中、导航稳定、`scrollWidth <= clientWidth`
- [x] `.no-js` 下导航保持可见；本任务未编写任何 JavaScript
- [x] 无外部资源、联网字体、图片、渐变、阴影、卡片、多栏正文或溢出遮盖
- [x] 未修改文章文字、HTML 内容、Word 素材或范围外文件

## 9. 遗留与交接

- 本任务的 `styles.css` 只含无媒体查询的桌面基线；`--page-gutter`、`--font-size-masthead`、
  `--font-size-page-title` 与全部 class 均已留给 Task 8 在文件末尾以同等特异性覆盖。
- Task 9 需要的 `.nav-toggle`（桌面 `display: none`）、`.site-navigation`（始终可见）、
  `.no-js .site-navigation` 三条基线已就位；本任务未定义 `.is-open` 的任何视觉差异。
- 唯一未能在 Qoder 内置浏览器中直接完成的是**可视化表板截图**（该表板当前 `0x0`、`visible=false`），
  已用同域 iframe 精确视口测量 + 无头 Chrome 真实渲染截图两种等价手段覆盖；
  若需内置浏览器内的肉眼复核，请先打开 Qoder 的 in-app Browser 面板。
- Task 4–7 填充真实内容后，按第 5 节的探针方法复跑一次内容集成验证即可。
