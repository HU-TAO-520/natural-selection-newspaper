# Task 16 实现归档视觉系统

## 任务定位

本文件把归档总方案中的 Task 16 细化为一个可独立执行、独立验收的工作包。Task 16 只做一件事：给 Task 15 刚落地的 12 个新类（三张栏目列表页的 `entry-list*`、首页最新区的 `home-latest*`）建立与 v1 纸媒基线同源的视觉规则，并在既有的**那一个** `@media (max-width: 768px)` 块内补齐移动端口径。

Task 16 的唯一交付文件是 `Results/styles.css`。它不得改动任何 HTML、任何正文、`script.js`、`content/`、`build/`。它与第一版的顺序相反——v1 是先有桌面视觉系统（Task 3）再有内容（Task 4–7），本轮必须先有 DOM 才有可样式化的宿主，所以 Task 16 排在 Task 15 之后。副作用是 Task 15 完成时新页面视觉裸奔，本包负责收口，且**在 Task 16 通过之前不得发布**。

本包最大的两个陷阱都已被第一版实测证明过，因此合同把它们写成硬性验收而非注意事项：

1. **`a:visited` 覆盖**（Task 11 的真实缺陷）：给链接类设了颜色却没写同色的 `:visited` 伴生规则，浏览器就会用默认紫色重绘，而 `getComputedStyle().color` 因隐私规则**读不出真实结果**——只有截图采样像素能暴露。本包为 12 个新类立了"配对合同"。
2. **声明存在不等于渲染成立**（Task 11 变异侧的真实教训）：`min-block-size: 44px` 写在行内元素上无效，或被 padding 撑过后变异成 28px 也照样 ≥44。触控目标一律以**实测渲染盒的两个维度**判定（`Task12:312` 要求 44×44 CSS px，高与宽各自 ≥44），不以 CSS 声明判定。

## 目标

- 为 `entry-list*` 与 `home-latest*` 建立桌面规则，全部复用 `Task3` 既有变量，不新增变量、不新增颜色值。
- 在既有单一移动块内追加移动规则：条目堆叠、44×44 触控目标（高与宽各自 ≥44px）、长中文标题安全换行。
- 保持 `H` 组既有 19 行／18 个标签断言（对账口径见 表 3 末注）的语义全部成立（外部资源、远程字体、关键变量、ID 选择器、`!important`、被禁视觉模式、断点误写、`content` 注入、页面专属 class、第二套移动主题变量、花括号配对、`@media` 唯一且为最后一个块）。
- 建立并验证**链接色配对合同**：每一个新增链接类都有同色的 `:visited` 伴生规则，并用像素采样在真实浏览器中确认报头、导航、列表链接、最新区链接四者颜色一致。
- 证明新规则**不污染既有版式**：切换后的页面集合是**七页** = 首页 ＋ 三个栏目列表页 ＋ 三个详情页（详情页不是 v1 的四页之一）。在 375／768／769／1280 下实测：首页引言区与 v1 一致；三个详情页 `<main>` 的字号／行高／版心／段落位置盒与 `qa/_qa_task15/before/news-<column>.html`（同栏目 v1 页）一致；三张列表页只要求新规则区生效、既有壳区不变。哈希层面 `styles.css` 的既有规则区除追加外不得改写。
- 定义并交付两条给 Task 18 的新断言：**H13 visited 配对**与 **H14 class 集合与死规则**。
- 证明"日期节点整体缺席"时布局不塌（缺席条件只写成一个：该条目缺 `display_date`——`Task12:273` 与 R9；`date` 缺失**不**导致节点缺席）。

## 前置条件与后续依赖

- 合同前置条件：Task 12 已完成（R3 首页用 `div.home-latest[role="region"]`、R4 首页新计数、R6 未注册类禁令）；Task 15 已完成切换并登记 v2 九文件基线。
- 输入前置条件：`Results/` 九文件与 `qa/_qa_task15/hashes_after.txt` 一致；`qa/_qa_task14/out/` 与 `qa/_qa_task13/baseline/` 完好；`qa/_qa_task15/report.md` 已交接 12 个新类的实际位置与 `display_date` 存在性。
- 结构前置条件：七个 HTML 页面在本包期间**一比特不动**（`styles.css` 是唯一被改文件）。
- 直接依赖本包的工作：Task 17（打包发布，必须以样式完成为前提）、Task 18（闸门，需本包交付的 H13／H14 定义与"既有规则区未被改写"的判定方法）、Task 19（浏览器回归，继承本包的测量手段与视口矩阵）。
- 阻断规则一：若某条视觉需求必须由 HTML 结构变更才能满足（例如需要在条目里加一个 `<span>` 分隔符、或需要 `<nav>` 地标），停止并回流 Task 14／15，**不得为了好看改 DOM**。
- 阻断规则二：若发现既有 `H` 组断言与新类天然冲突（例如"未注册 class"），冲突的解决方式是回 `Task0 §稳定接口` 补登记（Task 12 已在 R6/接口清单完成，本包只核对），**不得放宽断言**。
- 阻断规则三：`qa/_qa_task15/before/` 缺失时本包不得开工——没有切换前的 CSS 与页面参照，"不污染既有版式"就无法证明。

## 交付物与文件所有权

Task 16 执行时**修改**：

- `Results/styles.css`（唯一交付文件；**写入权依据 `Task12` R10**：本包是 `Results/styles.css` 的唯一写入者，Task 15 只拥有 `Results/*.html` 的写入权，`Results/script.js` 本轮无写入者；两处变更：移动块之前的桌面新规则区、移动块内部的追加行，且只追加不改写既有规则）

Task 16 执行时**新建**（QA 产物，位于 `Results/` 之外）：

- `qa/_qa_task16/css_rules.txt`（新规则的选择器与声明清单，含每条对应设计意图）
- `qa/_qa_task16/measure.mjs`（同域 iframe 视口探针：375／640／768／769／1024／1280）
- `qa/_qa_task16/cdp_probe.mjs`（CDP 实测：渲染盒高度与宽度、`deviceScaleFactor`、异常与控制台）
- `qa/_qa_task16/shot.html`、`qa/_qa_task16/png.mjs`、`qa/_qa_task16/shots/`（同步固定宽度截图与像素采样）
- `qa/_qa_task16/verify_css16.py`（静态 CSS 核验：配对、变量白名单、类集合、插入位置、既有区未改写）
- `qa/_qa_task16/mutate16.py`（变异对照，含"变异自证有效"前置断言）
- `qa/_qa_task16/report.md`

Task 16 **不创建、不修改、不删除**：

- `Results/` 下其它八个文件（含三份详情页与三张列表页的 HTML；按 R10 其写入者是 Task 15，`script.js` 本轮无写入者）
- `content/`、`build/`、`deploy/`、`plan/`、`Materials/`
- `qa/_qa_task1/` … `qa/_qa_task15/`（只读引用）

按 `Task12` R10 的划分是本包的开工前提而非可选项：`Results/` 的 HTML 归 Task 15、`Results/styles.css` 归本包、`Results/script.js` 本轮无写入者。本包若发现任何需求要改 HTML 或脚本，一律回流对应上游包，不得越界写入（越界即同时违反 R10 与"单一写入者"铁律）。

## 输入与权威顺序

1. `plan/Task15-页面生成与结构切换.md` 交接的实测 DOM 事实（12 个新类的位置、嵌套层级、`display_date` 当前是否输出）——**选择器面不得超出它**。
2. `plan/Task12` 的 R2／R3／R4／R6／R9／R10 与 §新增稳定接口、§断点与状态合同 —— 交付集合与命名正则、类名清单（12 个）、首页容器语义、未注册类禁令、日期节点在场性（`*__date` 可整体缺席）、`Results/styles.css` 的写入权归属。
3. `plan/Task0 §样式变量`（Task 3 桌面基线）与 `Results/styles.css` 现状 —— 变量名与取值的唯一来源。
4. `plan/Task0 §断点与状态合同` —— `@media (max-width: 768px)` 与 `min-width: 769px` 互补、菜单三态、44×44 触控、`:focus-visible` 不裁切。
5. `plan/Task3`、`plan/Task8` 的既有规则合同 —— 本包是**追加**，不是重写。
6. `qa/_qa_task10/verify_task10.mjs` 的 H 组实现 —— 19 行／18 个标签既有断言的原始语义（对账口径见 表 3 末注；该脚本没有 H13／H14）。
7. 本文件 —— 只细化，不扩张变量、不新增色值、不改变断点。

## 结构或数据基线（基线与门禁）

### 表 1 输入基线

| 项 | 值 |
| --- | --- |
| `Results/styles.css`（本包开工时） | Task 15 `hashes_after.txt` 中等于 v1 值的那一项：`2c23817299492ea9a3fd7ad23237cfabd6723d166bd99194febbed09ad418ba1`，12401 字节，555 行 |
| `Results/` 其余八文件 | 与 `qa/_qa_task15/hashes_after.txt` 逐项相等，本包全程不变 |
| 既有 `@media` 块 | 唯一一个，prelude 恰为 `@media (max-width: 768px)`，且为文件最后一个规则块（H8） |

### 表 2 允许使用的变量（取值不得改、不得新增）

颜色：`--color-paper: #f5efe4`、`--color-ink: #211f1c`、`--color-muted: #665d56`、`--color-accent: #7a2424`、`--color-rule: #b8aa98`。
字体：`--font-serif`（`"Songti SC", "STSong", "SimSun", serif`）。
版心：`--layout-max: 70rem`、`--reading-max: 46rem`、`--title-max: 52rem`、`--page-gutter: 2rem`。
字号：`--font-size-small: 0.9375rem`、`--font-size-body: 1rem`、`--font-size-reading: 1.125rem`、`--font-size-section-title: 1.5rem`、`--font-size-page-title: 2.5rem`、`--font-size-masthead: 4rem`。
行高：`--line-height-tight: 1.25`、`--line-height-ui: 1.5`、`--line-height-reading: 1.9`。
间距：`--space-1: 0.25rem`、`--space-2: 0.5rem`、`--space-3: 0.75rem`、`--space-4: 1rem`、`--space-5: 1.5rem`、`--space-6: 2rem`、`--space-7: 3rem`、`--space-8: 4rem`。
线宽：`--rule-thin: 1px`、`--rule-double: 3px`、`--focus-width: 2px`。

**摘自实测的逐字符口径**：上表每一行的字面值都从 `Results/styles.css:10-45` 原样抄录（含逗号后空格与前导零）——`--font-serif` 的空格数由 H3（`verify_task10.mjs:513` 比 `FONT_STACK`）逐字符比对，五个颜色与 `--layout-max`／`--reading-max`／`--page-gutter` 由 H4 逐字符比对（`verify_task10.mjs:518-526`）。因此"多一个空格、少一个前导零"（写成 `.9375rem`）即为 FAIL，不得以"等价写法"放行。

### 表 3 本包不得破坏的既有断言语义（H 组报告 19 行／18 个标签，逐页口径为七页）

| 断言 | 语义 |
| --- | --- |
| H1 | **七个 HTML 页面**（首页＋三张列表页＋三个详情页）各恰好一个 `rel="stylesheet"` 且指向 `styles.css` |
| H2 | 无 `@import`、`@font-face`、`url(`、`http(s)`、协议相对 `//`、盘符路径 |
| H3/noremote | 无远程字体 |
| H4 | 表 2 的关键变量存在且取值等于 `Task3` 基线 |
| H5/id | CSS 不使用 ID 选择器（`#nav-toggle`、`#site-navigation`、`#main-content`、**新增的 `#latest-title` 同样不得成为选择器**） |
| H5/important | 无 `!important` |
| H5/pagepatch | 无 `:root` 页面识别补丁、无 `:nth-child(`、无 `body.xxx` 前缀 |
| H6 | 存在 `.site-navigation__link[aria-current="page"]` 当前页样式 |
| H7 | 无 `box-shadow`／`text-shadow`、渐变、`background-image`、`column-*` 分栏、被禁视觉模式（阴影／圆角卡片／分栏） |
| H8 | 恰一个 `@media (max-width: 768px)`，且它仍是最后一个规则块 |
| H8/other | 无 `max-width: 767px`、`min-width: 768px`、`max-width: 769px` 及以上等误写断点 |
| H9 | 移动声明内无 `100vw`、无 `overflow-x: hidden/clip`、无 `word-break: break-all`、无 `!important` |
| H10 | `content` 只允许 `""`／`''`／`none`（装饰线），且不得含中文——**本包新规则内 `content` 声明命中数必须为 0** |
| H11 | 无页面专属 class（`.message-*`／`.feature-*`／`.commentary-*` 等）、无未注册 class、移动 `:root` 不引入第二套主题变量 |
| H12 | 花括号配对、媒体查询可解析、语法无错、无异常结尾 |
| H12/browser | 浏览器实际加载 `styles.css` 成功、`document.styleSheets` 无错误条目 |

**"19 条"的对账口径**（供 Task 18 核对，行数与标签数不得混用）：`qa/_qa_task10/report.md` 的 H 组共 **19 行**，去重后是 **18 个标签**。表 3 列出其中 16 个；未列出的 2 个是 `H3`（`--font-serif` 字体栈逐字符比对，`verify_task10.mjs:513`，取值见表 2）与 `H11/root`（移动 `:root` 内只允许既有变量名，`verify_task10.mjs:576`，语义并入表 3 的 H11 行）。余下 1 行是 `H12` 的第二行——`verify_task10.mjs:587` 记录的顶层块／声明块计数行（同标签、两行输出）。故 16 + `H3` + `H11/root` = 18 标签，`H12` 出 2 行 = 19 行。本包对上述 18 个标签的语义一条不减。

### 表 4 本包新增、交付给 Task 18 的两条断言

| 断言 | 语义 |
| --- | --- |
| **H13 visited 配对** | **辖域是封闭清单，共四个链接类**：既有两对 `.site-masthead__link`（`Results/styles.css:153`／`:166`）与 `.site-navigation__link`（`:204`／`:218`），加本包新增的 `.entry-list__link`、`.home-latest__link`。清单内每个类 `X` 都必须存在 `X:visited` 伴生规则，且二者 `color` 值**逐字符相等**；缺伴生规则或值不等即 FAIL。理由：类选择器特异性 (0,1,0) 低于全局 `a:visited`（`:91`，`color: var(--color-accent)`）的 (0,1,1)，缺伴生规则时已访问链接会被全局规则重绘为暗红。**明确豁免 `.skip-link`**（`:112`，`color: var(--color-ink)`，无 `:visited` 伴生，见"既有事实登记"）——若把辖域写成"任何 `color` 为非 accent 色的链接类"，H13 在 v1 基线上必红，与本包"既有区逐字节不变"的约束互相抵消，故辖域只按上述四个类点名，不得外延。本断言由 **Task 18 重写后的闸门**实现，本包不改 `verify_task10.mjs`（v1 真实缺陷的静态面）。 |
| **H14 类集合与死规则** | `styles.css` 出现的 class 选择器集合 ⊆（`Task0` 注册类 26 个 ∪ 归档新增 12 个）；且这 12 个新类**每个都至少被一条 CSS 规则使用**——这一半**无条件成立**，不因节点缺席而豁免（否则日期样式可以整段不写）。DOM 在场性那一半**只在节点被输出时断言**：`entry-list__date` 与 `home-latest__date` 按 `Task12:273`／R9 在该条目无 `display_date` 时**整体不输出**，故对这两个类写成"某页输出了日期节点 ⇒ 该类必须出现在该页 DOM"；没有任何日期节点被输出时该项记 N/A（不是 FAIL），但它们的 CSS 规则仍必须在场，缺失即按死规则 FAIL。其余 10 个新类必须每个至少在某个页面 DOM 中出现一次。超出注册集合即 FAIL（对应 R6 第 6 条）。 |

### 既有事实登记（本包不修，只留痕）

审计 `.skip-link`（`:112`，`color: var(--color-ink)`，无 `:visited` 伴生规则）发现一个 v1 遗留的不一致：该跳转链接被访问过且获得焦点时，全局 `a:visited`（特异性 0,1,1）会压过 `.skip-link`（0,1,0），使其显示为暗红而非墨色。它不在 H13 的辖域内（H13 的辖域是表 4 点名的四个链接类**封闭清单**，`.skip-link` 已被显式豁免；写成"一切非 accent 色的链接类"就会让 H13 在 v1 基线上必红），且修复它需要**改写既有区**——与"既有规则逐字节不变"的约束冲突。因此本包的处置是：登记事实、测量时一并采样记录、**不擅自修改**；是否修、何时修由用户决定，若批准则回 Task 3／8 的合同变更后单独执行。

## 设计接口合同

### 1. 视觉取向（与 v1 同源，不新造语言）

归档层的两条新列表必须**读起来像同一份报纸的目录**，而不是插件卡片。做法是复用首页引言区的既有手法：细线分隔（`--rule-thin solid --color-rule`）、区块上边距用 `--space-7`、标题用 `--color-accent` + `--font-size-section-title`、次要信息用 `--color-muted` + `--font-size-small`。因此：

- 条目行 = 一条 `border-top` 细线 + `padding-block` 留白，末条补 `border-bottom`，与 `.home-section` 同构。
- 标题文字色用 `--color-ink`（正文墨色），悬停才转 `--color-accent`；**不得**用暗红作默认色——那会让列表读起来像满屏链接。
- 日期靠右、`white-space: nowrap`、`--color-muted`、`--font-size-small`。
- 不引入项目符号、不引入箭头字形、不引入分隔点字符（`content` 注入受 H10 与本包约束双重禁止）；对齐关系靠 `flex` 的两端与细线表达。

### 2. 桌面规则清单（12 类，逐条可核对）

| 选择器 | 声明要点 | 参照既有 |
| --- | --- | --- |
| `.entry-list` | `max-width: var(--reading-max)`；`margin: var(--space-7) auto 0`；复用既有 `ul` 重置，若实测出现项目符号才局部声明 `list-style: none` 与 `padding: 0`（并记录原因） | `.home-sections` |
| `.entry-list__item` | `padding-block: var(--space-5)`；`border-top: var(--rule-thin) solid var(--color-rule)` | `.home-section` |
| `.entry-list__item:last-child` | `border-bottom: var(--rule-thin) solid var(--color-rule)`（`:last-child` 为伪类，非 `:nth-child`，不触 H5/pagepatch） | `.home-section:last-child` |
| `.entry-list__link` | `display: flex`；`align-items: baseline`；`justify-content: space-between`；`gap: var(--space-4)`；`color: var(--color-ink)`；`text-decoration: none` | `.site-masthead__link` |
| `.entry-list__link:visited` | `color: var(--color-ink)`（**与上行逐字符同值**，H13） | `.site-masthead__link:visited` |
| `.entry-list__link:hover`、`.entry-list__link:focus-visible` | hover：`color: var(--color-accent)` + `text-decoration: underline`；focus-visible：沿用全局轮廓规则，**不得**新增覆盖性 `outline: none` | `.site-navigation__link:hover` |
| `.entry-list__title` | `flex: 1 1 auto`；`font-size: var(--font-size-reading)`；`font-weight: 700`；`line-height: var(--line-height-tight)` | `.article__body > p` + `.home-section__title` |
| `.entry-list__date` | `flex: 0 0 auto`；`color: var(--color-muted)`；`font-size: var(--font-size-small)`；`white-space: nowrap` | `.article__date` |
| `.home-latest` | `max-width: var(--reading-max)`；`margin: var(--space-8) auto 0`（与引言区拉开一个层级） | `.home-sections` |
| `.home-latest__title` | `margin: 0 0 var(--space-3)`；`color: var(--color-accent)`；`font-size: var(--font-size-section-title)`；`line-height: var(--line-height-tight)`；`font-weight: 700`；`text-align: left` | `.home-section__title`（逐条同构） |
| `.home-latest__list`、`.home-latest__item` | 条目 `padding-block: var(--space-4)` + `border-top`；`last-child` 补 `border-bottom` | `.home-section` |
| `.home-latest__link`（+`:visited`/`:hover`） | 同 `.entry-list__link` 一族，`color: var(--color-ink)` 且配对同值 | 同上 |
| `.home-latest__entry` | `flex: 1 1 auto`；`font-size: var(--font-size-body)`；`font-weight: 700` | — |
| `.home-latest__date` | 同 `.entry-list__date` | — |

（表格按"类"计条目，实际规则数略多；16.3 要求逐条落到 `css_rules.txt` 与本表一一对应。）

### 3. 移动端追加合同（只追加进既有块，不新建块）

追加位置：现有 `@media (max-width: 768px)` 块**内部末尾**，不得新建第二个媒体块、不得改 prelude、不得移动既有声明。

1. **堆叠**：`.entry-list__link`、`.home-latest__link` 改 `flex-direction: column`；`align-items: flex-start`；`gap: var(--space-1)`——窄屏下标题与日期上下排列，而不是把标题挤成三行。
2. **触控目标**：两类链接 `min-block-size: 44px` **且 `min-inline-size: 44px`**（`Task12:312` 要求 44×44，只声明高度不达标；v1 先例是同一移动块里的 `.js .nav-toggle`，`Results/styles.css:411-414` 同时写了 `min-inline-size: 44px` 与 `min-block-size: 44px`），并配合 `padding-block: var(--space-3)` 达成。合同要求以**实测渲染盒的高度与宽度**双维判定（见"验证方法"第 5 条），声明本身不算通过；同时记住这两条对行内元素无效，故必须落在已 `display: flex` 的链接上。窄列（375px 扣掉 `--page-gutter`）下链接为块级铺满，宽度必须实测记录而非假定。
3. **安全换行**：`.entry-list__title`、`.home-latest__entry` 加 `overflow-wrap: anywhere`（**不是** `word-break: break-all`，后者被 H9 禁止）；并在 375px 档实测最长中文标题不溢出（判据仍是同域 iframe 的 `scrollWidth <= clientWidth`）。
4. 条目 `padding-block` 在移动端收敛为 `var(--space-4)`，避免行高 + 字号 `clamp()` 之后过疏。
5. 不得在此块内新增 `:root` 变量声明；若必须覆盖，只允许覆盖既有变量名（H11/root）。
6. 不得引入 `100vw`、`overflow-x: hidden/clip`、`!important`（H9）。

### 4. 缺席容错合同

`display_date` 缺失时日期节点**整体缺席**（`Task12:273` 与 R9；缺席只由 `display_date` 触发，`date` 缺失只改排序位置、不改任何可见节点）。此时 `entry-list__item` 内只有一个 `span.entry-list__title`：`justify-content: space-between` 在单元素下等价于起始对齐，布局**不得**出现空洞、居中错位或高度塌陷。16.5 必须在副本里删除一个 `display_date` 节点后实测一次（不写回真实 `Results/`），证明布局稳健；本轮真实三篇的 `display_date` 均已由用户声明，故节点在场，缺席态只是必须成立的副本实验，不得被当成放宽 H14 的理由。

### 5. 禁止清单（本包特有）

- 不使用 `content:` 注入任何字形（含 `""` 之外的任何值），H10 与本包双重禁止。
- 不新增 CSS 自定义属性；不在 `:root` 内加任何声明。
- 不写 ID 选择器（含 `#latest-title`）。
- 不使用 `:nth-child()`、`body.*`、页面专属 class、`.mobile-*`。
- 不引入 `transition`／`animation`／`transform`（既有汉堡按钮与跳转链接之外；本包新规则内命中数必须为 0）。
- 不引入阴影、渐变、圆角卡片、多列布局、粘性定位、`position: fixed`。
- 不引入 grid 布局（v1 全用 flex 与块流；引入 grid 即引入第二套布局语言，须先回 Task 12 修订）。
- 不为"更好看"改任何既有规则的字面值，包括看似无害的 `--space-*` 调整。
- 不改 `script.js`；菜单三态与断点行为归 Task 9／15，本包不介入。

## 插入位置合同

```text
[1] :root 与既有分区 1–8 …（本包不得改写）
[2] 既有桌面规则 …（本包不得改写）
[3] >>> 本包追加：/* ---------- N. 归档列表与首页最新区（Task 16） ---------- */ 桌面新规则 <<<
[4] @media (max-width: 768px) {  …既有声明…  >>> 本包追加的移动端行 <<<  }
[5] 文件末尾（单一 LF）
```

两条硬性判据：新桌面区必须出现在 `@media` **之前**；`@media` 之后不得再有任何规则块（H8 的 `mLast`）。既有规则区（除本包追加的两处）必须**逐字节不变**——判定方式见"验证方法"第 1 条。

## 子任务拆分

### Task 16.1 复核输入并建立"既有区不变"参照

输入：`Results/` 九文件、`qa/_qa_task15/hashes_after.txt`、`qa/_qa_task15/before/styles.css`。

执行：

1. 重算九文件哈希，确认除 `styles.css` 外八项与 Task 15 记录一致。
2. 把当前 `styles.css` 复制为 `qa/_qa_task16/before_styles.css` 并记录哈希。
3. 用 16.8 的脚本先跑一次基线（零新规则时它必须绿），证明脚本本身不是恒真。
4. 记录既有分区标题与 `@media` 起止行号。

输出：本包开工前的样式基线。

完成条件：八项不变、`before_styles.css` 哈希等于表 1；核验脚本在基线上全绿。

### Task 16.2 实测既有 `ul`／`a`／`:focus-visible` 重置面

输入：`Results/styles.css` 第 2、3 分区。

执行：

1. 读出全局 `ul`、`a`、`a:visited`、`:focus-visible`、`.main-content:focus` 的实际声明。
2. 判定新条目 `<ul>` 是否需要局部 `list-style`／`padding`（只有实测出现项目符号或额外缩进才补，并在 `css_rules.txt` 记原因）。
3. 确认 `.entry-list__link` 在 `text-decoration: none` 下仍可被识别为可点（悬停与焦点态必须给出可见反馈，符合 `Task0 §可访问性`）。

输出：一份"哪些重置已存在、哪些必须局部补"的结论。

完成条件：新规则不重复声明既有重置，也不与其冲突。

### Task 16.3 编写桌面新规则区

输入：§设计接口合同 第 1–2 条、表 2 变量白名单。

执行：

1. 按 12 类清单逐条写入，位置在 `@media` 之前，带一条分区注释（注释内不得出现合同编号 `M01`／`F01` 形态串，也不得出现 `Task12` R6① 的七个 front-matter 字段名 `date`／`display_date`／`end_date`／`order`／`slug`／`column`／`byline` 的整词形态；已注册类名 `.entry-list__date`／`.home-latest__date`／`.article__date` 与 `.page-title` 不算命中）。
2. 每个链接类立即补 `:visited` 伴生规则（配对不靠事后检查）。
3. 所有取值必须来自表 2；出现表 2 之外的颜色字面值即视为违约。
4. 导出 `css_rules.txt`（选择器｜声明｜参照既有）。

输出：桌面样式规则。

完成条件：H13（辖域为表 4 点名的四个链接类）／H14（规则在场无条件、DOM 在场按节点条件）静态检查通过；H 组既有 19 行／18 个标签的静态面通过。

### Task 16.4 追加移动端规则

输入：§移动端追加合同、既有移动块。

执行：

1. 只在既有移动块内部末尾追加，不新建块、不改 prelude。
2. 堆叠 + `min-block-size: 44px` + `min-inline-size: 44px`（44×44，`Task12:312`；两维同写，只写高度不达标）+ `overflow-wrap: anywhere`。
3. 确认未引入 `100vw`／`overflow-x`／`word-break: break-all`／`!important`／新 `:root` 变量。
4. 用 `git`-无关的方式自证"既有移动声明未被改写"：对 `before_styles.css` 与新版做区段比对，只允许"新增行"，不允许"修改行"或"删除行"。

输出：移动端样式。

完成条件：移动块仍是唯一且最后一个块；比对结果只含新增行。

### Task 16.5 真实浏览器测量（视口矩阵与像素采样）

输入：`qa/_qa_task16/measure.mjs`、`cdp_probe.mjs`、`shot.html`、`png.mjs`。

执行：

1. **视口宽度**用同域 `file://` iframe 设定（无头 Chrome 顶层窗口有约 500px 下限，`--window-size=375` 实际是 500px 左裁剪，会伪装成"横向溢出"）；判定溢出用 `scrollWidth <= clientWidth`。
2. 依次测 375／640／768／769／1024／1280，一次探针跑遍历多视口；对每个 `entry-list__link`／`home-latest__link` 取 `getBoundingClientRect()`，**断言 `rect.height >= 44` 且 `rect.width >= 44`（44×44，`Task12:312`；v1 先例 `Results/styles.css:411-414` 同时声明两维）**，逐条记录实测高宽；取标题折行数用 `Range.getClientRects().length`（块级元素 `getClientRects()` 恒为 1，不能用）。
3. **`:visited` 只能用像素判定**：`getComputedStyle().color` 对已访问链接返回未访问色，且 visited 样式异步解析（0–4s 仍可能是基线色）。做法是先访问过目标页，再 `Page.captureScreenshot` + PNG 解码采样，取与纸色距离最大的像素聚类，比较报头、导航、列表链接、最新区链接四处是否同为 `--color-ink` 系。
4. **200% 缩放**：CDP 的 `zoom` 参数在本 Chrome 是 no-op，须拆两效复现——布局用 CSS 视口 1280÷2=640，绘制用 `deviceScaleFactor: 2`，并以 `rect.width * dpr` 佐证文字实际像素翻倍。
5. 截图用同步建固定宽度 iframe 的 `shot.html`，同一次调用同时给 `--screenshot` 与 `--dump-dom`，用 `<title>ready:{clientWidth}:{state}</title>` 回读真实视口；`--screenshot` 与 `--user-data-dir` 必须绝对路径。
6. 探针内禁用 `requestAnimationFrame`（`--virtual-time-budget` 下可能永不触发）。
7. 缺席容错：在副本目录删除一个 `display_date` 节点后重测一次第 2 步，确认不塌。

输出：`qa/_qa_task16/report.md` 的测量表。

完成条件：六档视口无横向溢出；全部链接实测**高度与宽度均** ≥44 CSS px；四处链接像素分类同为墨色；`document.styleSheets` 无错误；控制台 0 报错。

### Task 16.6 回归既有版式未被污染

输入：`qa/_qa_task15/before/`（v1 页面 + v1 `styles.css`）与当前 `Results/`。

执行：

1. 在同一个探针里并排测量：三篇详情页正文段落 `font-size`／`line-height`／`max-width`、报头字号、导航行高、首页引言区三条文本的位置盒，v1 与本包之后逐项相等（容差 0）。
2. 详情页 `<main>` 内部字节与 `main_slices/` 仍相等（证明本包没改 HTML）。
3. 除 `styles.css` 外八文件哈希不变。
4. 复用 `qa/_qa_task10/verify_task10.mjs` 的 H 组做失败集合差分：以 `before_styles.css` + 当前 HTML 为基线副本跑一轮，再以当前 `styles.css` 跑一轮，diff `^  FAIL:`——**允许翻转的只有 H11 一条**（含其 `H11/root` 子项）：新类尚未登记进该脚本的类名表时它必红，接管方是 `Task12` R6 第 6 条与 `Task0 §稳定接口`。**H13／H14 不在这场差分里**：`verify_task10.mjs` 的 H 组只有 19 行／18 个标签（H1…H12/browser，见 表 3 末注），根本没有 H13／H14，把它们列为"预期翻转项"等于引用一条不存在的断言；H13／H14 属 **Task 18 重写后的闸门**，由本包交付定义、由 Task 18 实现并断言。其余 H 组标签新增失败必须为 0。

输出：污染检查结果。

完成条件：第 1、2、3 项全等；第 4 项新增失败**只有 H11（含 `H11/root`）**，且已被 `Task12` R6／接口登记覆盖并逐条列出；H13／H14 的实现在 Task 18，本包只交付定义。

### Task 16.7 对比度与可读性核对

输入：表 2 色值。

执行：

1. 计算并记录：`--color-ink` 于 `--color-paper`、`--color-muted` 于 `--color-paper`、`--color-accent` 于 `--color-paper` 的对比度。
2. 确认 `--color-muted` 只用于 `--font-size-small` 及以上的非正文关键信息（日期），不用于正文段落——本包新增用法不得超出这个边界。
3. 确认焦点轮廓（`--focus-width` + `--color-accent`）在新链接上未被任何新规则裁掉或覆盖。

输出：对比度与焦点结论。

完成条件：三项均有数值记录，无 `outline: none`，无新的低对比文本。

### Task 16.8 静态核验脚本

输入：`verify_css16.py` 需求：表 3、表 4、§插入位置合同、§禁止清单。

执行：实现并运行，覆盖

1. 既有区逐字节不变（区段比对）。
2. 新规则选择器 ⊆ 12 类；**12 类全部有 CSS 规则（无条件，含两个 `*__date` 类）**；DOM 出现次数只在节点被输出时断言——`entry-list__date`／`home-latest__date` 依 `Task12:273`／R9 可整体不输出，未输出时记 N/A 而非 FAIL（判据与 表 4 的 H14 同一套，不得各写一份）。
3. 取值全部来自表 2（颜色字面值扫描）。
4. H13 配对，**辖域限于表 4 点名的四个链接类**（`.site-masthead__link`、`.site-navigation__link`、`.entry-list__link`、`.home-latest__link`），`.skip-link`（`styles.css:112`）显式豁免，脚本里以类名白名单硬编码，不得写成"所有非 accent 色的链接类"。
5. `content`、`:root`、ID 选择器、`:nth-child`、`body.`、`!important`、`transition`、`animation`、`transform`、`grid`、`shadow`、`gradient`、`radius`、`url(`、`@import` 在新规则区命中为 0。
6. 唯一 `@media`、prelude 精确、且为最后一个块。
7. 结构被破坏时记 **FAIL 而不是抛异常**（用 `next(... , None)` + 显式"区块缺失"，区分 `rc==1` 真实失败与 `rc==2` 崩溃）。

输出：核验脚本与结果。

完成条件：基线上全绿；注入违约后逐项红（16.9）。

### Task 16.9 变异对照与变更边界审查

输入：`mutate16.py`、`qa/_qa_task16/before_styles.css`。

执行：对 `Results/` **副本**注入下列违约，每次要求指定断言翻红，且变异体本身要先自证"确实构成违约"：

1. 删掉 `.entry-list__link:visited` → H13 红（并须在像素采样上真的看见紫）。
2. 把 `:visited` 的色值改成 `--color-accent` → H13 红（配对值不等）。
3. 新增一个 `.feature-list` 页面专属类 → H11／H14 红。
4. 加一条 `--font-size-list: 1.05rem` → H4／H11 红（新变量）。
5. 用 `#latest-title` 设样式 → H5/id 红。
6. `content: "·"` 注入分隔点 → H10 与本包禁令双红。
7. 把桌面新规则整体移进 `@media` 内部 → H8（`mLast`／prelude）或桌面检查红。
8. 复制一份 `@media (max-width: 769px)` → H8／H8/other 红。
9. `min-block-size: 44px` 与 `min-inline-size: 44px` 同改为 28px —— **必须同时把 padding 压到实测高或宽 <44 才算有效变异**（v1 教训：padding 仍撑到 ≥44 时渲染没变，会被误判为"核验器漏检"）；另设一条只改 `min-inline-size` 而高度不变的分支，证明宽度判据确实在跑。
10. `overflow-wrap: anywhere` 改 `word-break: break-all` → H9 红。
11. 改一行既有 `.home-section` 的 `padding-block` → 区段比对红（污染既有版式）。
12. 加 `!important` → H5/important 红。
13. 加 `transition: color .2s` → 本包禁止清单红。
14. 删掉 `.entry-list__date` 的全部规则（死规则反向） → H14"12 类全有 CSS 规则"红；**即使该节点未在 DOM 中出现，此项也必须红**——DOM 在场性可 N/A，规则在场性不可豁免。

之后重算九文件哈希，确认只有 `styles.css` 变化。

完成条件：14 类变异全部被指定断言捕获；真实 `Results/` 未被触碰；测量重跑一次全绿。

## 验证方法

1. **区段比对**：`before_styles.css` 与新文件的既有区**逐字节相等**，变更只允许"两处新增"（桌面区一块、移动块内若干行），不允许任何"修改"或"删除"。
2. **静态合同**：`verify_css16.py` 全绿；随后 `mutate16.py` 14 类全捕获（含"变异自证有效"前置）。
3. **既有断言**：H 组既有 19 行／18 个标签（对账见 表 3 末注）以失败集合差分方式复核，新增失败只允许 H11（含 `H11/root`）这一类已被 R6/接口登记覆盖的项；H13／H14 不在该脚本内，只在 Task 18 重写后的闸门里断言。
4. **视口矩阵**：375／640／768／769／1024／1280 六档 `scrollWidth <= clientWidth`；768→769→768 往复序列内菜单与布局不出现半态。
5. **触控目标**：以 `getBoundingClientRect()` 实测**高度与宽度各自** ≥44 CSS px（`rect.height >= 44` 且 `rect.width >= 44`，不是读声明、也不只量高度），覆盖列表页与首页最新区全部链接；`Task12:312` 的口径是 44×44，v1 先例同时声明两维（`Results/styles.css:411-414`）。
6. **`:visited` 像素判定**：截图采样确认四处链接同色；`getComputedStyle` 结果不作为通过依据。
7. **不污染**：详情页与首页引言区的关键计算值（字号、行高、版心宽、段落位置盒）与 v1 逐项相等，容差 0。
8. **缺席容错**：删掉一个 `display_date` 节点后重测，布局不塌、无空洞。
9. **零 HTML 变更**：`Results/` 其余八文件哈希不变；详情页 `<main>` 仍等于 `main_slices/`。
10. **降级**：禁 CSS（结构顺序仍可读、链接可点）与禁 JS（`no-js` 下导航常显）各跑一遍七页；`document.styleSheets` 无错误条目，控制台 0 报错。

## 变更边界

### 必须完成

1. 12 个新类各至少一条规则，取值全部来自表 2。
2. 两个链接类的 `:visited` 配对补齐并通过像素验证。
3. 移动端在既有单一块内追加：堆叠、44×44 实测（高与宽各自 ≥44px）、安全换行。
4. 桌面区插在 `@media` 之前，`@media` 仍是最后一个块且 prelude 不变。
5. 既有规则区逐字节不变，详情页与首页引言区实测计算值与 v1 相等。
6. 缺席容错实测一次。
7. 静态核验 + 14 类变异对照全通过。
8. 交付 H13／H14 定义与"区段比对"方法给 Task 18。
9. 输出 `css_rules.txt`、`report.md` 与截图证据（位于 `Results/` 之外）。

### 明确不做

- 不改任何 HTML、正文、`script.js`、`content/`、`build/`、`deploy/`。
- 不新增 CSS 变量、不新增颜色字面值、不新增第二套移动主题变量。
- 不新建第二个媒体块，不改断点值，不引入 `min-width` 桌面查询。
- 不使用 `content:` 注入、ID 选择器、`:nth-child`、`body.*`、页面专属类、`!important`。
- 不引入 grid、动画、过渡、变换、阴影、圆角卡片、渐变、分栏、粘性定位。
- 不"顺手优化"任何 v1 规则（包括对齐、间距、字号微调）；发现问题记录并回流 Task 3／8。
- 不加载任何外部资源、字体或图片（H2／H3）。
- 不发布：`deploy/` 由 Task 17 负责。
- 不为"更现代的观感"擅自改变 §设计接口合同 第 1 条的视觉取向；如确有更好方案，先回 Task 12 讨论再实现。
- 不在 `Results/` 放任何 CSS 副本、`.map`、备份或探针文件。

## 异常处理

- **必须改 HTML 才能做好看**：回流 Task 14／15 的装配合同，本包不改 DOM。典型情形是"想给条目加编号"或"想加一条分隔点字符"——两者都被合同外文本禁令挡住。
- **新类与 H11 冲突**：说明 `Task0 §稳定接口` 未登记到位，回 Task 12 补登记，不在本包放宽断言。
- **`--color-muted` 对比度不够**（日期在小字号下发虚）：先用表 2 内既有变量（例如 `--color-ink` 配合既有 `--font-size-small`）解决；**不得**新造灰色值。若仍不满意，作为设计缺陷登记并回 Task 3 的色板讨论，本包不私改色板。
- **移动块出现顺序依赖**（追加的规则被既有声明覆盖）：用选择器特异性与既有风格解决，禁止 `!important`；若必须重排既有行，即为"修改既有区"，停止并报告。
- **像素采样看不到 visited 变化**：先确认链接真的被访问过、并等过异步解析窗口；`qa/_qa_task11` 的做法是加载后延时轮询采样，不要凭 `getComputedStyle` 断言"没问题"。
- **窄视口疑似横向溢出**：先看是不是无头 Chrome 500px 下限造成的裁剪假象；只有同域 iframe 的 `scrollWidth`/`clientWidth` 可作判据。
- **某档视口下链接实测高或宽 <44px**：查 padding 与 `min-block-size`／`min-inline-size` 的实际作用对象（两者对行内元素都不生效），不要只加 `line-height` 凑高度；宽度不足时须由 `min-inline-size` 补足而非 padding。
- **`--virtual-time-budget` 下探针超时**：先怀疑 `requestAnimationFrame`；改 `setTimeout`。
- **核验脚本在变异体上崩溃**：脚本必须记 FAIL 而非抛异常，区分 `rc==1` 与 `rc==2`。
- **有人要求"列表再紧凑一点"**：属于对 v1 规则的字面改动，须显式批准并记录；默认答案是"本包不动既有区"。

## 常见返工风险

- 给链接类设了 `color` 而漏写 `:visited`——静态看 CSS 完全正常，只有像素采样能抓到（v1 真出过）。
- 用 `getComputedStyle().color` 判 visited，v1 的四页全绿而实际是紫色（本轮七页同理，且七页都要采）。
- 只看 `min-block-size: 44px` 声明存在就判定触控目标达标；padding 变化后实际高度可能仍不足，或只满足了高度而宽度仍 <44，或变异后声明变了渲染没变。
- 无头 Chrome 顶层窗口 500px 下限造成的"移动端溢出"假象。
- CDP 的 `zoom` 参数当 no-op 用，200% 缩放其实没测到（须拆 640px 布局 + `deviceScaleFactor:2`）。
- 用块级元素 `getClientRects().length` 数折行（恒为 1），或直接用 `word-break: break-all` 解决长标题（被禁）。
- 新建第二个 `@media` 或把桌面规则误插进移动块内，撞穿 H8 且现象只在窄屏出现。
- 为了排版方便新增 `--font-size-list` 之类变量，形成第二套主题（H4/H11 红）。
- 用 `content: "·"` 或 `content: "—"` 造分隔符，把可见文本写进 CSS（与 H10、R6 双重冲突）。
- 用 ID 选择器 `#latest-title` 或 `:nth-child()` 简化样式（H5 红）。
- 顺手把 `.home-section` 的间距"调匀一点"，导致详情页与首页引言区实测数值漂移，等于污染冻结基线。
- 把 QA 脚本、截图、`before_styles.css` 放进 `Results/`。
- 核验脚本在结构破损时抛异常，被误读为"变异未捕获"。
- 变异体未自证有效（改了声明但渲染不变），错怪核验器漏检。
- 假设日期节点一定存在：`display_date` 缺席时布局塌陷或留出空洞，等到发布前才发现。

## 完成定义

Task 16 只有在以下条件全部满足时才算完成：

- [ ] `Results/` 仅 `styles.css` 一项哈希变化，其余八项与 `qa/_qa_task15/hashes_after.txt` 逐项相等。
- [ ] 既有规则区逐字节不变，变更只有两处新增（桌面区 + 移动块内追加）。
- [ ] 12 个新类**每个都有 CSS 规则**（无条件，无死规则、无集合外选择器）；DOM 在场性按 H14 的条件口径判定——除两个 `*__date` 类外每个都至少出现在一页 DOM 中，`*__date` 只在节点被输出时要求出现，未输出记 N/A（`Task12:273`／R9）。
- [ ] 所有新取值来自表 2；无新变量、无表外色值字面量；表 2 的抄录与 `styles.css` 逐字符一致（含空格与前导零）。
- [ ] 两个链接类均有同色 `:visited` 伴生规则，且像素采样确认报头、导航、列表、最新区四处同为墨色系（非浏览器默认紫）；H13 的辖域限于表 4 点名的四个类，`.skip-link` 未被判红。
- [ ] `@media (max-width: 768px)` 仍是唯一一个块、prelude 精确、且为文件最后一个规则块；桌面新区在其之前。
- [ ] 六档视口 `scrollWidth <= clientWidth`，无横向溢出；768↔769 往复无半态。
- [ ] 列表页与首页最新区所有链接的**实测**渲染高度与宽度**均** ≥44 CSS px（44×44，`Task12:312`）。
- [ ] 长中文标题在 375px 下按 `overflow-wrap: anywhere` 安全折行，未使用 `word-break: break-all`。
- [ ] 删除一个 `display_date` 节点的副本实测中，条目布局不塌、无空洞、无居中错位。
- [ ] 三篇详情页与首页引言区的关键计算值与 v1 逐项相等（容差 0）；`<main>` 字节仍等于 `main_slices/`。
- [ ] H 组既有 19 行／18 个标签经失败集合差分复核；新增失败只属于 H11（含 `H11/root`）这一已被 R6/接口登记覆盖的类，H13／H14 由 Task 18 的闸门断言。
- [ ] 新规则区内 `content`、`:root`、ID 选择器、`:nth-child`、`body.`、`!important`、`transition`、`animation`、`transform`、`grid`、`shadow`、`gradient`、`radius`、`url(`、`@import` 命中数全部为 0。
- [ ] `verify_css16.py` 基线全绿；`mutate16.py` 14 类变异全部被指定断言捕获，且每条变异都先自证"确实构成违约"。
- [ ] 禁 CSS／禁 JS 两态七页均完整可读；`document.styleSheets` 无错误条目、控制台 0 报错。
- [ ] 对比度三项记录在案；焦点轮廓未被覆盖。
- [ ] 全部 QA 产物位于 `qa/_qa_task16/`，`Results/` 无新增文件；本包未生成 `deploy/` 产物。

## 后续任务交接

- **给 Task 17**：`styles.css` 的 v2 哈希（新基线链一环）；"样式已完成、可以进入打包"的确认；打包集合仍为九文件 + `_headers`，且 `Results/` 内不得有 `before_styles.css` 或截图。
- **给 Task 18**：**H13 visited 配对**与 **H14 类集合与死规则**两条新断言的完整定义与实现要点（H13 辖域是四个链接类的封闭清单、`.skip-link` 显式豁免；H14 的 DOM 半项按节点在场条件判定、规则半项无条件——两者都不在 `verify_task10.mjs` 里，须由重写后的闸门实现）；"既有区逐字节不变"的区段比对方法（可直接作为"样式任务不得污染冻结规则"的通用闸门）；本包 14 类变异清单可并入其变异矩阵，避免重复劳动；实测数据（六档视口、触控**高度与宽度**）作为其 DOM/样式断言的期望值来源；H 组的 19 行／18 个标签对账口径见 表 3 末注。
- **给 Task 19**：视口矩阵与"三效分离"的复现要点（布局 640 等效 200%、绘制 `deviceScaleFactor:2`）；`:visited` 必须像素判定的既成事实；无头 Chrome 500px 下限与 `scrollWidth` 判据；`display_date` 缺席场景（缺席只由 `display_date` 触发，`Task12:273`／R9，`date` 缺失只改排序）需作为一条独立回归用例保留；触控目标回归须同时验高与宽（44×44）。
- **给用户**：新页面已具备与 v1 同源的纸媒观感，目录式列表以细线分隔、标题左对齐日期靠右；下一步才是打包与上传。视觉如要再改，属于对既有区的变更，需明确批准。
