# Task 8 实现移动端响应式布局

## 任务定位

本文件将总方案中的 Task 8 细化为一个可以独立实施、分阶段验收的工作包。Task 8 负责在 Task 3 的桌面视觉系统之上，为《自然选择号》的四个页面统一补充移动端响应式布局规则，使首页、新闻消息页、新闻通讯页和新闻评论页在窄屏、断点边界和页面缩放后仍可完整阅读与操作。

Task 8 的实现对象只有共享样式文件 `Results/styles.css` 中的移动端规则。它不拥有任何新闻正文，不修改四个 HTML 文件，不修改导航脚本，也不通过增加页面专属 class、包装节点或不可见字符解决排版问题。Task 1 的逐段文本是不可变内容基线，Task 2 的公共 HTML 壳是不可变结构基线，Task 3 提供桌面样式和共享 class，Task 4–Task 7 提供四页真实内容结构，Task 9 负责菜单状态和 ARIA 同步。

Task 8 可以在 Task 5、Task 6、Task 7 尚未全部落地时先完成本计划中的规则设计和静态 CSS 蓝图，但不得据此提前修改正式的 `Results/styles.css`。**CSS 实施和最终验收都必须等待 Task 5、Task 6 和 Task 7 的真实页面内容全部完成，且三篇文章先通过 Task 1 的段落与逐字符基线。**不得用临时文本、Lorem ipsum、隐藏测试节点或只测试新闻评论页代替四页实现与最终回归。

## 目标

- 用一套共享移动端规则覆盖 `index.html`、`news-message.html`、`news-feature.html` 和 `news-commentary.html`，不产生单页 CSS 分支。
- 明确 `768px` 属于移动布局、`769px` 起恢复桌面布局，不留下断点空档或重叠。
- 在移动端显示原有菜单按钮，把原有四项主导航改为纵向菜单；不复制第二套导航。
- 保证 JavaScript 可用时菜单可以折叠，JavaScript 不可用时四项导航始终可见。
- 保证菜单按钮和每个导航链接的实际点击区域均不小于 `44px × 44px`。
- 用 `clamp()` 缩放报头和页面标题，同时保持正常换行、可读行高和纸媒风格。
- 让首页三个简介区块、三篇单栏文章和评论日期都随可用宽度自然收缩。
- 为中英文混排和技术术语提供纯 CSS 的紧急换行保护，不改变 `.exe`、`Windows 10`、`AI`、`UOS`、`USB`、`OPS`、`Linux`、`4K` 等原文字符。
- 在 375px、768px、769px、1280px 和 200% 浏览器缩放下完成四页回归，并确认不存在横向溢出。
- 建立 Task 7 与 Task 8 的明确所有权边界，杜绝内容 Agent 为视觉问题修改共享 CSS，或样式 Agent 为换行问题改动正文。

## 权威来源与优先级

Task 8 按以下优先级执行：

1. `plan/Task1-素材基线与内容合同.md`
   - 决定三篇文章的标题、署名、段落数量、逐段文字、空格、标点、大小写和末尾日期。
   - 任何 CSS 方案都不得改变 DOM 文本或通过伪元素补入内容。
2. `plan/Task2-建立共享HTML壳与导航.md`
   - 决定四页公共壳、稳定 class 与 ID、导航顺序、当前页标记、`no-js` 初始状态及菜单按钮结构。
   - Task 8 只能使用这些现有接口，不创建移动端专用 HTML。
3. `plan/Task3-实现桌面端纸媒视觉系统.md`
   - 决定颜色、字体、版心、共享变量、桌面布局、首页接口和文章接口。
   - Task 8 只在文件末尾添加移动覆盖，不重写桌面视觉系统。
4. `plan/Task4-完成首页内容.md` 至 `plan/Task7-完成新闻评论页.md`
   - 决定四页 `<main>` 中的真实节点、顺序和内容数量。
   - Task 8 只消费这些稳定接口，不修改其 HTML。
5. Task 9 导航脚本合同
   - 决定 `no-js` 到 `js` 的切换、`.site-navigation.is-open`、`aria-expanded`、Esc、链接关闭和跨至 769px 时的状态重置。
   - Task 8 只定义这些状态对应的视觉显示规则。

若上游合同发生冲突，应暂停对应实现并交回上游任务修订，不能在 `styles.css` 中同时兼容多个错误结构。内容与结构的正确性优先于视觉便利。

## Task 1 内容不变基线

Task 8 不重新提取或解释 Word 内容，只把下表作为实施前后的不可变核验门槛：

| 页面 | 只读源文件 SHA-256 | 网页内容边界 |
| --- | --- | --- |
| 新闻消息 | `DE10B575399E0563430F2F255C956B179C9978C087897A24910AD70D6A50F6FC` | 标题 1、署名 1、正文 4 |
| 新闻通讯 | `0C5B35256B7271ACFB2F49AEC146288B404ED49C376AC2C8B3F6246B38F894A4` | 标题 1、署名 1、正文 23；不生成 Word 末尾空段 |
| 新闻评论 | `8E50CFC89287035163D5FE95C8B1CEE20A5AA405E9D04EC358FB5C9312C3827C` | 标题 1、署名 1、正文 29、末尾日期 1 |

Task 8 不能以“改善移动阅读”为理由润色、纠错、统一人称、改变标点、合并空格、拆分段落或添加小标题。Word 元数据作者“厨一枚~ 胡桃”、文件时间和由此推断的年份仍属于禁止发布内容。相关字符串可存在于本内部计划的风险说明中，但不得进入 `Results/`。

## 分阶段门禁

### 阶段 A：规则设计

阶段 A 可以在真实文章页尚未全部完成时进行，包括：

- 冻结断点、选择器、状态矩阵、点击目标和安全换行策略。
- 编写本计划中的 CSS 规则蓝图、验收矩阵和异常处理规则。
- 核对 Task 1–Task 7 已约定的 class，不接触任何正文。

阶段 A 完成不代表 Task 8 完成，也不得写成“移动端已验收”。

### 阶段 B：CSS 实现

开始修改 `Results/styles.css` 前必须满足：

- Task 2 的四个 HTML 公共壳已经存在且结构一致。
- Task 3 已创建 `Results/styles.css`，桌面端 1024px 和 1280px 基线通过。
- Task 4 已完成首页的三个既定语义区块。
- Task 5、Task 6、Task 7 已完成三篇真实文章页，且分别通过 Task 1 的段落数量和逐字符核验。
- 样式表末尾尚无来源不明、功能重叠的移动端规则；若已有用户修改，先识别并保留不冲突内容。
- Task 8 不与 Task 3 无协调地同时编辑同一 `styles.css`。

若 `styles.css` 尚不存在或 Task 4–Task 7 的真实内容尚未完成，Task 8 停止正式 CSS 实施并等待对应上游任务；不代写桌面基线，不创建空样式文件，也不在短壳上先定型移动规则。

### 阶段 C：真实内容最终验收

最终验收至少等待以下内容全部满足：

- 首页已有 Task 4 约定的一个主标题和三个真实语义区块。
- 新闻消息页已有 4 个真实正文段落，首段电头和其后的一个 U+0020 半角空格正确。
- 新闻通讯页已有 23 个真实非空正文段落，没有 Word 末尾空段，首段电头空格及原文特殊字符正确。
- 新闻评论页已有 29 个真实正文段落和正文后的一个 `p.article__date`，技术术语与末尾日期均符合 Task 1。
- Task 5、Task 6、Task 7 已分别完成结构和逐字符核验；页面不是临时壳或节选内容。

以上任一项未满足时，可以检查 CSS 语法和状态规则，但不得签署本任务的最终完成清单。

### 与 Task 9 的集成关系

Task 9 不是阶段 B 写入移动 CSS 的前置条件。Task 9 尚未完成时，Task 8 可以在浏览器开发者工具中只修改当前页面的运行时 class 和 `aria-expanded`，分别模拟 `no-js`、`js` 关闭和 `js` 打开状态，验证 CSS 显隐、点击区域与布局；这些临时运行时变化不得保存回 HTML。

真实按钮点击、Enter／Space、Esc、点击链接关闭、焦点返回和跨到 769px 时清理状态属于 Task 9 与 Task 11 的集成验收。若 `script.js` 尚不存在，Task 8 记录“待 Task 9 集成”，不创建临时脚本，也不把缺少这些行为误判为 CSS 失败。Task 9 完成后必须再跑集成流程，整个网站才能通过 Task 11。

## 交付物与文件所有权

### 本计划编写阶段

本次计划细化只创建：

- `plan/Task8-实现移动端响应式布局.md`

本次不修改 `Results/` 中的任何正式交付文件。

### Task 8 实施阶段

Task 8 只修改：

- `Results/styles.css`

修改应集中在文件末尾一个清晰标注的 `@media (max-width: 768px)` 移动端区段。除非用户后来批准新的响应式需求，不另建第二个样式文件，不把四页拆成四套媒体查询。

Task 8 不创建、不删除且不修改：

- `Results/index.html`
- `Results/news-message.html`
- `Results/news-feature.html`
- `Results/news-commentary.html`
- `Results/script.js`
- `Materials/` 中任何 Word 文件
- Task 1–Task 7 的计划文件
- 图片、字体、测试脚本、截图、README 或其他正式交付外文件

## Agent 所有权边界

| 责任方 | 允许修改 | 必须复用 | 禁止事项 |
| --- | --- | --- | --- |
| Task 7 Agent | `Results/news-commentary.html` 的新闻评论内容区域 | `.article`、`.article__header`、`.article__type`、`.page-title`、`.article__byline`、`.article__body`、`.article__date` | 不得修改 `styles.css`，不得添加 `commentary-*` 等页面专属 class，不得用内联样式处理窄屏 |
| Task 8 Agent | `Results/styles.css` 文件末尾的移动端覆盖 | Task 2–Task 7 已约定的共享 class 和状态类 | 不得修改任何 HTML、新闻正文、段落边界、ARIA 属性或 `script.js` |
| Task 9 Agent | `Results/script.js` 的共享菜单行为 | `#nav-toggle`、`#site-navigation`、`html.js`、`.is-open`、`aria-expanded` | 不得修改正文、内容节点或用脚本写入布局尺寸 |
| Task 10／11 | 一次性核验与浏览器回归 | 上游内容、结构和样式合同 | 核验脚本、截图和临时记录不得进入正式 `Results/` 六文件集合 |

若 Task 7 在录入真实内容时发现移动端显示问题，只记录复现宽度和受影响的既有 class，并移交 Task 8；Task 7 不得直接修 CSS。若 Task 8 发现评论页结构、段落、日期或术语错误，只报告并退回 Task 7；Task 8 不得直接改 HTML。

## 四页覆盖矩阵

Task 8 的每一条共享规则都必须在四页中评估，最终验收不能只抽查最长的新闻评论页。

| 页面 | 必须存在的真实内容结构 | 移动端重点 | Task 8 不得做的事 |
| --- | --- | --- | --- |
| `index.html` | `h1.page-title`；一个 `.home-sections`；三个 `.home-section`，每个含标题和文本 | 三个区块继续单列；长标题与占位文本自然换行；分隔线不越界 | 不改成卡片、轮播、折叠面板或脚本组件，不改占位符 |
| `news-message.html` | 一个 `.article`；4 个 `.article__body > p`；首段内联 `.dateline` | 标题、4 段正文、首行缩进和电头在 375px 下完整可读 | 不拆电头为块，不改变电头后的半角空格，不改 4 段边界 |
| `news-feature.html` | 一个 `.article`；23 个非空 `.article__body > p`；首段内联 `.dateline` | 长段、引号、双破折号和 `AI` 混排自然换行 | 不添加第 24 个空段，不统一“她／他”，不把引语改为引用块 |
| `news-commentary.html` | 一个 `.article`；29 个 `.article__body > p`；正文后一个 `.article__date` | 长标题、`.exe`、`Windows 10`、`UOS`、`USB`、`OPS`、`Linux`、`4K` 和右对齐日期不溢出 | 不插入换行字符或专属 span，不改 29+1 结构，不给日期加年份 |

四页共有的报头、菜单按钮、四项主导航、跳至正文链接、主标题和版心也必须逐页检查。当前导航项不同不构成样式分叉。

## 稳定 HTML 与 CSS 接口

### 公共壳接口

Task 8 只使用以下 Task 2 接口：

- `html.no-js`、`html.js`
- `.skip-link`
- `.site-header`
- `.site-header__inner`
- `.site-masthead`
- `.site-masthead__link`
- `.nav-toggle`
- `.nav-toggle__icon`
- `.nav-toggle__text`
- `.site-navigation`
- `.site-navigation.is-open`
- `.site-navigation__list`
- `.site-navigation__item`
- `.site-navigation__link`
- `.site-navigation__link[aria-current="page"]`
- `.main-content`
- `.page-title`

`#nav-toggle`、`#site-navigation` 和 `#main-content` 保留为脚本、ARIA 与锚点接口。Task 8 的 CSS 不使用 ID 选择器提高特异性。

### 首页接口

- `.home-sections`
- `.home-section`
- `.home-section__title`
- `.home-section__text`

Task 8 不按 `origin-title`、`work-title`、`founded-title` 等 ID 写视觉规则，也不使用 `:nth-child()` 给某一个区块打补丁。

### 文章接口

- `.article`
- `.article__header`
- `.article__type`
- `.article__byline`
- `.article__body`
- `.article__body > p`
- `.dateline`
- `.article__date`

`.dateline` 同时可能出现在新闻消息和新闻通讯首段，必须保持内联。`.article__date` 只出现在新闻评论页，位于 `.article__body` 之后；它不是第 30 个正文段落，不能继承正文段落的 `2em` 首行缩进。

### 禁止新增的接口

不得为了响应式布局新增以下内容或等效实现：

- 页面专属 `body` class。
- `.mobile-*`、`.message-*`、`.feature-*`、`.commentary-*`、`.news-commentary-*` 等专属内容 class。
- 第二个导航、移动端复制链接或移动端专用标题。
- 包裹技术术语的 `.nowrap`、`.technical-term` 或专属 `<span>`。
- 用于撑开高度、画分隔线或定位日期的空 HTML 节点。
- 内联 `style`、页面内 `<style>` 或 CSS-in-JS。

## 断点合同

### 精确边界

- 移动端规则使用 `@media (max-width: 768px)`。
- 视口宽度恰好为 `768px` 时必须命中移动规则。
- 视口宽度恰好为 `769px` 时移动规则必须停止生效，并恢复 Task 3 的桌面横向导航。
- 不使用 `767px`、`48rem`、`770px` 或设备型号查询近似替代此边界。
- 不依据 user agent、触摸能力或屏幕物理像素切换布局。

这里使用精确像素断点是为了与 Task 9 的 `769px` 状态重置合同一致。桌面样式继续作为无媒体查询的基线，Task 8 不需要另写大段 `min-width: 769px` 重复规则；在 769px 下应依靠媒体查询自然退出恢复桌面基线。

### 浏览器缩放解释

媒体查询依据浏览器的 CSS 视口宽度，而不是窗口外框或设备物理像素。200% 缩放采用统一、可复现的起点：先在 100% 缩放下把浏览器内容区设为 `window.innerWidth === 1280`，再把浏览器真实缩放调到 200%，硬刷新页面并记录新的 `window.innerWidth`。随后按实际 CSS 视口判断：

- 若 `innerWidth <= 768`，出现移动菜单是正确结果。
- 若 `innerWidth >= 769`，应使用桌面横向导航。
- 不用 CSS `zoom`、`transform: scale()` 或截图放大模拟浏览器真实缩放。

典型的 1280px 浏览器内容区在 200% 缩放后可能约为 640 CSS px，因此进入移动布局并不算断点失败。若缩放后的实际宽度不超过 768px，四页都要复查 `.no-js` 常显、`.js` 关闭和 `.js .is-open` 打开三种视觉状态；不能只测其中一个状态。

## 移动端版心与留白合同

Task 3 已规定 `.site-header__inner` 和 `.main-content` 共用以下版心逻辑：

```css
width: calc(100% - var(--page-gutter) - var(--page-gutter));
max-width: var(--layout-max);
margin-inline: auto;
```

Task 8 在移动媒体查询内把 `--page-gutter` 覆盖为 `1rem`，因此：

| 视口宽度 | 左右留白 | 可用版心宽度 |
| --- | ---: | ---: |
| 375px | 各 16px | 343px |
| 768px | 各 16px | 736px |
| 769px | 回到桌面变量各 32px | 705px |

769px 处留白随桌面基线恢复是预期断点变化，不应通过跨断点插值或页面专属补丁抹平。任何宽度都不得使用 `width: 100vw`，避免把滚动条宽度算入布局造成横向溢出。

移动端还必须满足：

- `.site-header__inner`、`.main-content`、`.article`、`.article__header`、`.article__body`、`.article__date`、`.home-sections` 和 `.page-title` 能在父容器内收缩。
- 不设置固定内容宽度、固定高度、内部滚动区或裁切。
- 主内容建议将上内边距缩至约 `2rem`、下内边距缩至约 `3rem`，保持内容与屏幕边缘有明显呼吸空间。
- 首页和文章仍是单栏，不使用 CSS columns、并排卡片或侧栏。

## 流式字号合同

在 `max-width: 768px` 内覆盖 Task 3 的现有变量：

```css
:root {
  --font-size-reading: 1.0625rem;
  --font-size-section-title: clamp(1.25rem, 4.5vw, 1.375rem);
  --font-size-page-title: clamp(1.75rem, 7vw, 2.25rem);
  --font-size-masthead: clamp(2.5rem, 11vw, 3.5rem);
  --page-gutter: 1rem;
}
```

这些值的作用是：

- 报头在 375px 下明显缩小，但仍比页面标题醒目。
- 页面标题在长评论标题换行时保持清晰，不依赖固定高度。
- 首页二级标题与正文层级仍可辨识。
- 移动正文保持接近 17px 的舒适字号；浏览器缩放仍以根字号为基础。

固定不变量：

- 不把根字号锁成像素，不禁用浏览器文字缩放。
- 不给标题设置 `white-space: nowrap`。
- 不通过缩小到难读字号、压缩字距或降低行高来勉强塞入一行。
- 不改变颜色和字体栈，不创建第二套移动端主题变量。
- 桌面变量在 769px 及以上保持 Task 3 的 `2.5rem` 页面标题和 `4rem` 报头基线。

## 移动菜单视觉状态合同

### 状态矩阵

| 环境 | 菜单按钮 | 主导航 | 列表方向 | 说明 |
| --- | --- | --- | --- | --- |
| `no-js` 且不超过 768px | 隐藏 | 始终可见 | 纵向 | 无脚本也能访问四个链接 |
| `js` 且不超过 768px，关闭 | 可见 | `display: none` | 纵向规则已定义但不可见 | 关闭的链接不得留在 Tab 顺序中 |
| `js` 且不超过 768px，打开 | 可见 | `.is-open` 后可见 | 纵向 | `aria-expanded="true"` 由 Task 9 同步 |
| 769px 及以上 | 隐藏 | 始终可见 | 横向 | Task 3 桌面基线恢复；Task 9 重置状态 |

### 按钮

- 只在 `html.js` 且不超过 768px 时显示现有 `.nav-toggle`。
- 按钮保留可见文字“菜单”，不能只剩汉堡图形。
- 实际 `getBoundingClientRect()` 的宽和高都不得小于 44 CSS px。
- 使用现有 `.nav-toggle__icon` 及其空伪元素绘制三条线，不新增 HTML、SVG、图片或图标字体。
- 伪元素的 `content: ""` 只承担装饰，不得注入“打开”“关闭”等可见文本。
- 可依据按钮现有 `[aria-expanded="true"]` 把三条线即时变为关闭符号，但不增加动画要求，也不改变按钮的可访问名称。
- 通用 `:focus-visible` 轮廓必须保留，按钮边框和展开菜单不能裁切轮廓。

### 导航

- 移动端 `.site-navigation__list` 改为纵向 `flex`，清除桌面约 `2.5rem` 的横向 gap。
- 四个 `.site-navigation__link` 继续保持相同顺序、文字、链接目标和当前页状态。
- 每个可见导航链接实际高度和宽度均不小于 44 CSS px；链接使用完整行宽，方便触控。
- 当前页仍同时依靠暗红色与下边线表达，不因纵向布局丢失非颜色提示。
- `.site-navigation` 和列表不得使用 `overflow: hidden`，避免裁切键盘焦点。
- 不使用固定 `max-height`、负定位、透明但可聚焦的隐藏方式或滑动动画折叠菜单。
- JavaScript 关闭时必须先禁用脚本再硬刷新本地页面，确认 `html.no-js` 下按钮隐藏且导航可见。

## 首页移动布局合同

- `.home-sections` 保持单列，宽度随 `.main-content` 收缩，不建立移动卡片网格。
- 主标题与区块组之间的距离可由桌面约 `3rem` 缩至约 `2rem`。
- `.home-section` 的纵向内边距可由约 `1.5rem` 缩至约 `1.25rem`，但分隔线、阅读顺序和三个区块边界不变。
- `.home-section__title` 和 `.home-section__text` 使用正常中文换行；极端长的连续字符串只允许 CSS 紧急换行。
- 三个区块标题仍按“名称由来”“主要工作与报道方向”“成立时间”顺序出现。
- 不隐藏占位符、不截断文本、不使用省略号，不把区块改成手风琴或需要点击展开的组件。

## 三个文章页移动布局合同

### 文章头部

- `.article__header` 保持居中、单栏和底部分隔线，宽度不超过父容器。
- 标题区底部内边距可缩至约 `1.25rem`，与正文间距可缩至约 `1.5rem`。
- `.article__type`、`.page-title`、`.article__byline` 的 DOM 顺序和文字保持不变。
- 长标题允许自然换成两行或更多行，不能通过插入 `<br>`、空格或软连字符控制断行。
- 署名不得与标题重叠，也不能因固定高度而被裁切。

### 正文

- `.article__body` 保持单栏、正常文档流和完整高度。
- 移动端可把桌面的两端对齐改为 `text-align: start`，避免窄行中英文混排产生过大的字间空隙。
- `.article__body > p` 继续保持 `2em` 首行缩进和段落边界；CSS 只改变绘制，不拆分或合并节点。
- `.dateline` 继续是内联粗体，不设为 `block`，不通过伪元素生成其后的空格。
- `.article__date` 保持阅读宽度内右对齐、无首行缩进，并允许在极窄宽度下自然换行；不能强制单行造成溢出。

## 安全换行与文本保真合同

### 允许的 CSS 保护

对 `.page-title`、`.home-section__title`、`.home-section__text`、`.article__body > p` 和 `.article__date` 使用以下原则：

```css
overflow-wrap: anywhere;
word-break: normal;
hyphens: none;
```

`overflow-wrap: anywhere` 只在正常换行机会不足以容纳连续字符串时提供最后兜底；正常中文行规则和原有空格仍优先。若实际目标浏览器对 `anywhere` 的处理出现异常，可退回 `overflow-wrap: break-word`，但仍不得使用 `word-break: break-all`。

### 明确禁止

- 不在 HTML 中插入 `<wbr>`、`<br>`、软连字符、零宽空格、零宽连接符、额外 U+0020 或 `&nbsp;`。
- 不删除或替换 `Windows 10` 中原有的半角空格；它可以在该正常空格处自然换行。
- 不为 `AI`、`.exe`、`UOS`、`USB`、`OPS`、`Linux`、`4K` 建立不可换行 span。
- 不对正文或标题使用 `white-space: nowrap`、`word-break: break-all`、自动连字符或字符缩放。
- 不使用 `overflow-x: hidden`、`overflow-x: clip` 掩盖真正的宽度错误。
- 不用 CSS `content` 注入作者、日期、电头、标点、空格或正文。
- 不使用行数截断、`text-overflow: ellipsis`、固定高度或渐隐遮罩隐藏原文。

CSS 换行不会改变 `textContent`。Task 8 实施前后，三篇文章的段落数组、数量和逐字符值必须完全相同。

## 推荐的移动端 CSS 蓝图

以下代码是 Task 8 的推荐实现骨架。断点、状态、最小点击尺寸、禁止项和选择器范围属于固定合同；间距可在真实四页回归后做小幅调整，但只能在这个媒体查询内调整共享规则。

```css
/* Task 8: mobile layout, 768px and below */
@media (max-width: 768px) {
  :root {
    --page-gutter: 1rem;
    --font-size-reading: 1.0625rem;
    --font-size-section-title: clamp(1.25rem, 4.5vw, 1.375rem);
    --font-size-page-title: clamp(1.75rem, 7vw, 2.25rem);
    --font-size-masthead: clamp(2.5rem, 11vw, 3.5rem);
  }

  .site-header {
    padding-block-start: var(--space-4);
  }

  .site-header__inner {
    display: flex;
    min-width: 0;
    flex-direction: column;
    align-items: stretch;
  }

  .site-masthead {
    min-inline-size: 0;
    padding-block: var(--space-4);
  }

  .site-masthead__link {
    display: inline-block;
    max-inline-size: 100%;
    overflow-wrap: break-word;
    letter-spacing: 0.12em;
    text-indent: 0.12em;
  }

  .js .nav-toggle {
    display: inline-flex;
    min-inline-size: 44px;
    min-block-size: 44px;
    align-items: center;
    align-self: flex-end;
    justify-content: center;
    gap: var(--space-2);
    margin-block-start: var(--space-3);
    padding: 0.625rem 0.75rem;
    border: var(--rule-thin) solid var(--color-rule);
    background: transparent;
    color: var(--color-ink);
  }

  .no-js .nav-toggle {
    display: none;
  }

  .nav-toggle__icon {
    position: relative;
    display: inline-block;
    flex: 0 0 auto;
    inline-size: 1.25rem;
    block-size: 2px;
    background: currentColor;
  }

  .nav-toggle__icon::before,
  .nav-toggle__icon::after {
    position: absolute;
    inset-inline: 0;
    block-size: 2px;
    background: currentColor;
    content: "";
  }

  .nav-toggle__icon::before {
    inset-block-start: -0.375rem;
  }

  .nav-toggle__icon::after {
    inset-block-start: 0.375rem;
  }

  .nav-toggle[aria-expanded="true"] .nav-toggle__icon {
    background: transparent;
  }

  .nav-toggle[aria-expanded="true"] .nav-toggle__icon::before,
  .nav-toggle[aria-expanded="true"] .nav-toggle__icon::after {
    inset-block-start: 0;
  }

  .nav-toggle[aria-expanded="true"] .nav-toggle__icon::before {
    transform: rotate(45deg);
  }

  .nav-toggle[aria-expanded="true"] .nav-toggle__icon::after {
    transform: rotate(-45deg);
  }

  .site-navigation {
    min-inline-size: 0;
    inline-size: 100%;
    margin-block-start: var(--space-3);
  }

  .js .site-navigation {
    display: none;
  }

  .js .site-navigation.is-open,
  .no-js .site-navigation {
    display: block;
  }

  .site-navigation__list {
    flex-direction: column;
    align-items: stretch;
    gap: 0;
  }

  .site-navigation__item + .site-navigation__item {
    border-block-start: var(--rule-thin) solid var(--color-rule);
  }

  .site-navigation__link {
    display: flex;
    min-block-size: 44px;
    align-items: center;
    justify-content: center;
    padding: 0.625rem 0.5rem;
  }

  .main-content {
    padding-block-start: var(--space-6);
    padding-block-end: var(--space-7);
  }

  .page-title,
  .home-section__title,
  .home-section__text,
  .article__body > p,
  .article__date {
    min-width: 0;
    overflow-wrap: anywhere;
    word-break: normal;
    hyphens: none;
  }

  .home-sections {
    max-width: 100%;
    margin-block-start: var(--space-6);
  }

  .home-section {
    padding-block: 1.25rem;
  }

  .article,
  .article__header,
  .article__body,
  .article__date {
    min-width: 0;
    max-width: 100%;
  }

  .article__header {
    padding-block-end: 1.25rem;
    margin-block-end: var(--space-5);
  }

  .article__body {
    text-align: start;
    text-justify: auto;
  }
}
```

实施时必须先对照 Task 3 的真实属性名，避免为同一间距同时残留冲突的物理属性和逻辑属性。若 Task 3 的桌面规则与本蓝图命名一致，可直接使用；若不一致，应只调整移动覆盖的声明，不整段覆盖用户已有 CSS。

## CSS 组织与特异性规则

- 移动媒体查询放在 `styles.css` 最末尾，位于所有 Task 3 基础和组件规则之后。
- 选择器使用与 Task 3 相同或略高的 class 特异性，不使用 ID、`!important` 或无意义的多层祖先链。
- `html.js`／`html.no-js` 只用于菜单渐进增强状态，不用于识别页面类型。
- `.site-navigation.is-open` 是唯一展开状态，不新增 `.open`、`.active-menu`、`.menu-visible` 等别名。
- 移动规则不重新声明颜色、字体族、桌面最大宽度或内容文本。
- 若样式表已有同一断点的批准规则，应合并为一个清晰区段，避免两个远距离媒体查询互相覆盖。
- 不添加动画是默认决策；这样无需额外的 `prefers-reduced-motion` 分支，也避免菜单在状态变化时暂时保留可聚焦但不可见的链接。

## 实施步骤

1. **确认阶段状态**：明确当前是规则设计、CSS 实现还是最终内容验收；不得把阶段 A 的计划完成误报为 Task 8 完成。
2. **核对真实内容门禁**：确认 Task 4–Task 7 均已完成，尤其是 Task 5–Task 7 的 4、23、29+1 内容结构和逐字符比较均通过；未通过就停止正式 CSS 实施。
3. **读取现有文件**：实施前完整读取 `Results/styles.css` 和四个 HTML，识别用户已有修改；不得直接整文件覆盖。
4. **核对 Task 2 公共壳**：确认四页都有相同的 `.site-header__inner`、按钮、导航和 `.main-content` 接口。
5. **核对内容接口**：确认首页使用 `.home-*`，三个文章页使用 `.article*`；评论日期使用 `.article__date`。
6. **记录不可修改文件快照**：记录四个 HTML 的 SHA-256；同时记录 `script.js` 是不存在还是已存在，若已存在则记录其 SHA-256，作为 Task 8 未改内容与脚本的证据。
7. **检查桌面基线**：在 1024px 和 1280px 确认 Task 3 的版心、横向导航、正文宽度与焦点样式已经通过。
8. **追加单一移动区段**：把 `@media (max-width: 768px)` 放在样式表末尾，先覆盖变量、版心和垂直间距。
9. **实现菜单按钮视觉**：仅在 `.js` 移动状态显示按钮，保证 44×44 点击区并用现有装饰 span 画图形。
10. **实现状态矩阵**：写入 `.js` 关闭、`.js .is-open` 打开和 `.no-js` 常显三种导航规则。
11. **切换列表方向**：将原四项列表纵向排列，清除桌面 gap，扩大链接点击区并保留当前页和焦点状态。
12. **实现四页内容收缩**：调整主内容、首页区块、文章头部、正文和日期的移动间距与宽度。
13. **加入安全换行**：只在既有文本容器上设置 `overflow-wrap`、`word-break` 和 `hyphens`，不改 HTML。
14. **执行 375／768／769 边界检查**：先逐页检查布局，再检查菜单三种状态和实际点击矩形。
15. **回归桌面与缩放**：复查 1280px 桌面基线及四页 200% 缩放后的实际 CSS 视口行为。
16. **核对文件与文本不变**：重新计算四个 HTML 的哈希；确认 Task 8 没有创建或修改 `script.js`；再执行 Task 1／Task 10 的逐段比较。

## 静态验证

### 文件与变更范围

- Task 8 实施后的唯一正式文件差异是 `Results/styles.css`。
- 四个 HTML 的实施前后 SHA-256 完全一致。
- Task 8 没有创建或修改 `script.js`；若脚本在本任务的稳定实施窗口开始时已存在且没有 Task 9 并发写入，其实施前后 SHA-256 应一致。
- `Materials/` 未被打开后另存、改名或修改；三份源文件哈希仍符合 Task 1。
- `Results/` 没有新增移动专用 CSS、图片、字体、图标、测试文件或截图。
- 样式表仍为普通 UTF-8 CSS，可通过 `file://` 本地加载。

### 媒体查询与选择器

- 移动区段精确使用 `max-width: 768px`。
- 不存在误写的 `max-width: 767px`、`min-width: 768px` 或导致 769px 仍命中的查询。
- 移动规则位于 Task 3 规则之后，花括号完整，浏览器能够解析媒体查询内的全部声明。
- 不使用 `#nav-toggle`、`#site-navigation` 或页面 ID 作为 CSS 选择器。
- 不存在页面文件名、中文栏目文字、`:nth-child()` 或页面专属 body class 选择器。
- 不存在 `!important`、`100vw`、固定内容高度、`overflow-x: hidden`、`overflow-x: clip` 或 `word-break: break-all`。

### 内容保护

- CSS 中不存在非空 `content` 注入正文、作者、日期、电头或菜单状态文字。
- Task 8 没有给正文添加 `display: none`、行数截断、透明度隐藏或内部滚动。
- `.dateline` 仍保持内联，`.article__date` 仍不继承正文首行缩进。
- 三篇文章的 DOM 文本数组与 Task 1 逐项严格相等，段落数仍为 4、23、29+1。
- `厨一枚`、`胡桃`、推断年份 `2026` 和公开类型“新闻评价”没有进入 `Results/`。

## 浏览器验收矩阵

四个页面都必须完成下表，不得用某一页通过推断其他页面也通过。仅 375px、768px、769px、1280px 四个固定宽度就有 16 个页面／宽度组合；还要另做四页 200% 缩放。

| 条件 | 预期布局 | 必查项目 |
| --- | --- | --- |
| 375px，100% | 移动 | 16px 留白；流式报头与标题；按钮和链接不小于 44px；四页无横向溢出 |
| 768px，100% | 移动 | 仍显示移动按钮；`.js` 关闭／打开与 `.no-js` 状态全部正确；列表纵向 |
| 769px，100% | 桌面 | 按钮隐藏；导航立即恢复横向并始终可见；移动间距和字号停止生效 |
| 1280px，100% | 桌面回归 | 版心不超过 1120px；正文不超过 736px；Task 3 视觉未被移动规则污染 |
| 从 1280px／100% 切到 200% 浏览器缩放 | 按缩放后的实际 `innerWidth` 决定 | 记录前后宽度；若进入移动断点则复查三种菜单视觉状态；无裁切、重叠或横向滚动 |

元素几何测量可记录浏览器的子像素舍入，但横向溢出的判定仍严格使用 `scrollWidth <= innerWidth`，不能额外放宽 1px。

## 导航状态验收

### JavaScript 不可用

1. 禁用 JavaScript。
2. 对 `file://` 页面执行硬刷新，确保源码的 `html.no-js` 生效。
3. 在 375px 和 768px 检查菜单按钮不可见且不在 Tab 顺序中。
4. 检查四项导航纵向、完整可见、可点击、可键盘聚焦。
5. 检查当前页仍以颜色和线条区分，焦点轮廓不被裁切。

只在脚本已经运行后临时关闭 JavaScript不能证明降级正确，因为 DOM 可能仍遗留 `html.js`。

### JavaScript 可用、菜单关闭

- Task 9 已完成时，硬刷新后 `no-js` 应自动替换为 `js`；Task 9 尚未完成时，只在开发者工具中把当前运行时状态模拟为 `js`。
- 按钮可见，`aria-expanded="false"`，导航无 `.is-open`。
- 导航视觉折叠，四个隐藏链接不出现在 Tab 顺序中。
- 页面主体不因隐藏导航留下异常固定高度或空白。

### JavaScript 可用、菜单打开

- 激活原生按钮后导航获得 `.is-open`，`aria-expanded="true"`。
- 四项导航完整显示为纵向，链接点击矩形均不小于 44×44。
- 展开菜单不覆盖、截断或横向推挤报头和正文。
- Tab 焦点按按钮、导航链接、正文后续交互元素的自然顺序移动。
- Task 9 尚未完成时，可以手动加入 `.is-open` 并把 `aria-expanded` 设为 `true`，但不能把这种模拟当作真实交互通过。
- Esc、链接点击关闭和焦点返回由 Task 9 实现；若集成行为失败，Task 8 只确认 CSS 没有阻碍状态显示，不直接修改脚本。

### 跨断点

Task 9 完成后执行以下集成流程；在此之前只验证第 3 步的 CSS 桌面恢复，不验证脚本状态重置：

1. 在 768px 打开菜单。
2. 把视口扩大到 769px。
3. 确认按钮隐藏、四项导航横向可见，移动 `display: none` 不再生效。
4. 集成 Task 9 后确认 `.is-open` 已清除且 `aria-expanded` 已重置为 `false`。
5. 再缩回 768px，确认菜单处于关闭状态而不是复用旧的展开状态。

若 769px 的视觉错误来自媒体查询，应由 Task 8 修 CSS；若 ARIA 或 class 未重置，应交回 Task 9。Task 9 尚未完成时，把后者明确记录为“待集成”，不能由 Task 8 补写脚本。

## 点击区域与焦点验证

在移动菜单展开状态，可用浏览器控制台检查所有可见目标的实际矩形：

```js
[...document.querySelectorAll('.nav-toggle, .site-navigation__link')]
  .map((element) => {
    const rect = element.getBoundingClientRect();
    return {
      text: element.textContent.trim(),
      width: rect.width,
      height: rect.height,
      rendered: element.getClientRects().length > 0,
      pass: rect.width >= 44 && rect.height >= 44
    };
  })
  .filter((result) => result.rendered);
```

验收要求：

- 菜单按钮与四个链接的 `pass` 均为 `true`。
- 不能只凭 CSS 声明中的 padding 猜测结果，必须检查实际矩形。
- 第一次按 Tab 时 `.skip-link` 仍能在左上方完整显示，不被报头或菜单遮住。
- 按钮、报头链接、导航链接和 `#main-content` 的焦点轮廓不被任何祖先裁切。
- 200% 缩放下重复检查可见焦点和点击区域，不允许文字增大后重叠。

## 横向溢出验证

每页在每个关键宽度与菜单状态下运行：

```js
const pageWidth = Math.max(
  document.body.scrollWidth,
  document.documentElement.scrollWidth
);

({
  pageWidth,
  viewportWidth: window.innerWidth,
  pass: pageWidth <= window.innerWidth
});
```

需要覆盖：

- 四页 × 375px × `.no-js` 常显状态。
- 四页 × 375px × `.js` 关闭／打开状态。
- 四页 × 768px × `.no-js`、`.js` 关闭、`.js` 打开状态。
- 四页 × 769px 桌面恢复状态。
- 四页 × 1280px 桌面回归状态。
- 四页 × 从 1280px／100% 切换到 200% 后的实际视口状态；若实际宽度不超过 768px，覆盖 `.no-js`、`.js` 关闭和 `.js` 打开三态。

发现失败时定位具体过宽元素，检查固定宽度、min-width、padding、字距、伪元素和换行规则。不得先加全局溢出隐藏使测试表面通过。

## 四页专项验收

### 首页

- 一个主标题和三个区块均在 375px 内完整显示。
- “主要工作与报道方向”等较长二级标题自然换行或完整保持一行，不越界。
- 三个区块仍按固定顺序单列展示，分隔线没有超出版心。
- 占位文本没有被隐藏、截断、缩成低对比度提示或改成可交互控件。

### 新闻消息页

- 4 个正文段落全部可见，段间距和 `2em` 首行缩进稳定。
- M01 的 `.dateline` 保持内联，其后的一个半角空格仍在 `textContent` 中。
- “今日7时”“47个社团”等内容没有因样式处理改变或裁切。
- 标题在 375px 与 200% 缩放下自然换行且居中。

### 新闻通讯页

- 23 个非空正文段落全部可见，没有第 24 个空段。
- F01 电头保持内联且其后的 U+0020 不变。
- 中文引号、内层单引号、双破折号和 `AI` 大小写没有变化。
- 长段在 375px 下不产生横向滚动，正文仍保持单栏和正常阅读顺序。
- “在她看来”及后续“他”的原文不一致不因任何处理被修正。

### 新闻评论页

- 29 个正文段落全部可见，日期仍是正文后的独立 `p.article__date`。
- 长标题在 375px 下自然形成多行，不裁切、不插入人为断行。
- `86英寸`、`Windows 10`、`.exe`、`UOS`、`USB`、`OPS`、`Linux`、`4K`、`5次` 和 `3个U盘` 保持原字面值。
- `Windows 10` 可以在原有空格处自然换行，但不删除、替换或冻结该空格。
- `.article__date` 在可用阅读宽度内右对齐、无首行缩进；极窄时允许自然换行，不越出版心。
- 不存在 `安 装` 等因 run、样式或人工断行引入的错误拆词。

## 文本与文件不变验证

Task 8 开始实施后，先记录：

- 四个 HTML 的 SHA-256。
- `Results/script.js` 是否存在；若已存在且本实施窗口内不会由 Task 9 并发修改，再记录其 SHA-256。
- 三份 Word 素材的 Task 1 冻结哈希。
- Task 5、Task 6、Task 7 已通过的正文数组与段落数量。

实施结束后必须满足：

- 四个 HTML 哈希逐项相同。
- Task 8 没有创建或修改 `script.js`；若脚本在稳定实施窗口开始时已存在且没有合法的 Task 9 并发变更，其哈希相同。
- 三份 Word 素材哈希仍为 Task 1 的冻结值。
- 消息页 4 段、通讯页 23 段、评论页 29 段加 1 个日期的原始 `textContent` 逐项相同。
- 比较过程不执行 `trim()`、空白折叠、Unicode 归一化或标点替换。

若 HTML 哈希变化，先停止验收并检查是否有其他 Agent 的已批准并发修改。只有确认是上游内容任务完成造成的合法变化后，才能重新建立 Task 8 的实施前快照；不得把 Task 8 自己的 HTML 修改解释为正常响应式工作。若 `script.js` 因 Task 9 的合法实施发生变化，应在 Task 9 完成后重新建立脚本快照并执行集成验收，不能把跨任务的合法变化归因于 Task 8，也不能要求 Task 9 回退。

## 异常处理

- **`styles.css` 尚不存在**：等待 Task 3；Task 8 不创建只含移动规则的残缺样式表。
- **桌面基线尚未通过**：交回 Task 3 修复 1024px／1280px 基线，再追加移动覆盖；不在媒体查询中反向补救桌面错误。
- **四页公共 class 不一致**：交回 Task 2 或对应内容任务统一结构，不在 CSS 中同时兼容多个错误类名。
- **Task 5、Task 6 或 Task 7 未完成**：只允许完成本计划中的规则设计和 CSS 蓝图；不得修改正式 `Results/styles.css`，也不能开始最终验收。
- **Task 7 Agent 请求直接改移动 CSS**：保持所有权边界；由 Task 7 提供复现信息，Task 8 在共享样式中评估四页后统一修复。
- **Task 8 发现评论正文或日期错误**：停止对该页签署验收并交回 Task 7，不能改 `news-commentary.html`。
- **无 JavaScript 时导航消失**：检查 `.no-js .site-navigation` 的顺序和特异性；只修共享 CSS，不给 HTML 添加 `hidden` 切换补丁。
- **关闭菜单后链接仍能 Tab 到**：使用真正从布局与无障碍树移除的折叠方式，如 `display: none`；不依赖透明度、偏移或零高度裁切。
- **769px 仍显示移动布局**：检查媒体查询边界和花括号；若仅状态未重置则交回 Task 9。
- **技术术语造成溢出**：先检查祖先 `min-width`、固定宽度、字距和 `white-space`；最后使用共享文本容器的 `overflow-wrap`，绝不改正文。
- **焦点轮廓被裁切**：移除导航祖先的 overflow 裁切或增加内部留白，不删除或减弱轮廓。
- **200% 缩放切换为移动菜单**：先记录实际 `innerWidth`；若不超过 768px，这是正确重排，不应强制桌面导航。
- **移动规则污染 1280px**：检查媒体查询闭合和规则位置，修复 CSS 语法后重新执行全部宽度矩阵。
- **并发编辑 `styles.css`**：停止覆盖，比较当前文件和开始时快照，合并不冲突改动后重跑桌面与移动完整回归。

## 常见返工风险

- 只在新闻评论页测试 `.exe` 等术语，遗漏首页、消息页和通讯页的标题与长段。
- 在 Task 5–Task 7 真实正文完成前，用短占位文本宣布移动端通过。
- 把 768px 当桌面或只测试 767px／769px，漏掉需求规定的移动上界。
- 使用 `48rem` 断点，在用户根字号变化时不再严格对应 768 CSS px。
- 移动端隐藏导航时只设 `opacity: 0`，导致不可见链接仍可键盘聚焦。
- `.js .site-navigation` 的规则覆盖 `.no-js` 降级，禁用脚本后没有导航。
- 给四页各写一个页面专属媒体查询，造成共享视觉漂移。
- Task 7 为右对齐日期或窄屏术语修改 CSS，破坏 Agent 所有权边界。
- Task 8 为解决溢出插入 `<wbr>`、空格、`&nbsp;` 或专属 span，破坏 Task 1 基线。
- 使用 `word-break: break-all`，让短英文术语和数字在任意字符处破碎。
- 使用 `white-space: nowrap` 保护 `Windows 10`，反而在极窄屏制造溢出。
- 使用 `overflow-x: hidden` 让滚动条消失，却保留被裁掉的文字和焦点。
- 用固定高度或 `max-height` 动画折叠菜单，文字放大后截断链接。
- 只检查按钮 CSS 高度，不测实际 `getBoundingClientRect()` 是否达到 44px。
- 200% 缩放后仍强求桌面导航，没有按实际 CSS 视口判断断点。
- 忘记在 769px 从已打开移动菜单跨断点，遗漏 Task 9 状态重置集成问题。
- 修改桌面颜色、字体、最大宽度或正文内容，把 Task 8 扩张成视觉重做任务。

## 完成定义

Task 8 只有在以下条件全部满足时才算最终完成：

- [ ] Task 5、Task 6 和 Task 7 的真实内容均已完成并先通过 Task 1 的逐段文本核验。
- [ ] 首页也已具备 Task 4 的三个真实语义区块，可纳入四页回归。
- [ ] Task 8 的唯一正式文件变更是 `Results/styles.css` 的移动端规则。
- [ ] 四个 HTML、`script.js` 和三份 Word 素材均未被 Task 8 修改。
- [ ] 移动端媒体查询精确覆盖 `max-width: 768px`，769px 恢复桌面基线。
- [ ] 四页在 375px 和 768px 均使用移动布局，左右内边距不小于 16px。
- [ ] 四页在 769px 和 1280px 均恢复稳定桌面布局，移动规则未泄漏。
- [ ] 报头和页面标题使用 `clamp()` 或等效流式规则，长标题无裁切或横向溢出。
- [ ] `.js` 关闭、`.js .is-open` 打开和 `.no-js` 常显三种移动导航状态全部正确。
- [ ] Task 9 已完成时，真实交互集成已通过；尚未完成时，已明确记录“待 Task 9 集成”并交接 Task 11，没有创建临时脚本越权补齐行为。
- [ ] 菜单按钮和四个可见导航链接的实际点击区域均不小于 44×44 CSS px。
- [ ] 关闭状态的导航链接不留在 Tab 顺序中，展开状态的焦点轮廓完整可见。
- [ ] 首页三个区块、消息 4 段、通讯 23 段、评论 29 段和独立日期均完整显示。
- [ ] 四页在 375px、768px、769px、1280px 和 200% 缩放的关键状态下均满足 `scrollWidth <= innerWidth`。
- [ ] 安全换行只由 CSS 实现，没有 `<wbr>`、软连字符、零宽字符、额外空格、`&nbsp;` 或正文专属 span。
- [ ] 三篇文章的段落数量和逐项 `textContent` 在 Task 8 前后完全一致。
- [ ] 样式表不存在 `!important`、ID 选择器、`100vw`、`word-break: break-all`、溢出遮盖、固定内容高度或页面专属补丁。
- [ ] 从 1280px／100% 切到 200% 后，四页的跳至正文链接、菜单、标题、署名、正文、日期和焦点均完整可用；进入移动断点时三种菜单视觉状态均已覆盖。
- [ ] Task 7 Agent 未修改移动 CSS；Task 8 Agent 未修改新闻评论或其他页面正文。
- [ ] 任一修正后已重新执行四页完整宽度、菜单状态、文本不变和桌面回归检查。

只完成本计划中的 CSS 规则蓝图而未等待三篇真实文章内容时，最多可标记为“Task 8 规则设计完成”，不能开始正式 CSS 实施，也不能宣称最终完成。

## 后续任务交接

- Task 9 使用既有 `html.js`、`.site-navigation.is-open` 和 `aria-expanded` 驱动本文定义的视觉状态，不改媒体查询或移动尺寸。
- Task 10 确认 Task 8 没有改变四个 HTML，并继续按 Task 1 数组核验 4、23、29+1 段内容及禁止项。
- Task 11 在真实浏览器中执行四页 375px、768px、769px、1280px、200% 缩放、键盘、禁用 JavaScript、跨断点和控制台错误回归。
- 若 Task 5–Task 7 在 Task 8 实施后发生经批准的正文更正或结构更新，必须先重新通过各自内容合同，再重跑本文全部四页验收矩阵；不能沿用旧内容上的结论。
- 后续正文更正必须先更新 Task 1 与对应内容任务，再重新运行 Task 8 的文本不变和窄屏回归；不得直接在 CSS 中为新版文字加入单页补丁。
