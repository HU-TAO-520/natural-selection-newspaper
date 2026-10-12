# Task 10 结构与内容自动核验

## 任务定位

本文件将总方案中的 Task 10 细化为一个可以独立执行、独立验收的工作包。它负责对 `Results/` 中已经完成的六个正式交付文件执行一次性、可重复、以合同为准绳的自动核验，确认四页 HTML 的结构、导航、ARIA、逐字符正文，以及 `styles.css`、`script.js` 的静态合同全部符合 Task 1–Task 9 的冻结要求，并确认所有禁止项没有进入正式交付目录。

Task 10 是只读核验任务。它不录入内容、不编写视觉、不实现交互、不修复缺陷。发现任何不符时，Task 10 只定位、记录并移交对应上游任务，绝不在核验过程中直接修改六个交付文件或三份 Word 素材。Task 10 也不做真实浏览器中的视觉、缩放、键盘交互与控制台回归——那属于 Task 11；Task 10 聚焦可以用确定性断言判定的结构、文本、哈希与静态模式。

完成本任务后，项目应得到一份逐项通过／失败的核验结论，作为进入 Task 11 浏览器回归前的质量闸门。

## 目标

- 用一组确定性断言覆盖六个交付文件，判定标准全部来自 Task 1–Task 9 的既有合同，不引入新的内容或视觉要求。
- 确认 `Results/` 恰好是六个文件，没有第七个交付文件、临时文件、测试脚本、截图、README、JSON 或备份。
- 确认三份 Word 素材的 SHA-256 仍等于 Task 1 冻结值，且素材未被本流程修改。
- 逐页确认公共壳、导航矩阵、唯一 `aria-current="page"`、唯一 `<main>`／`<h1>` 与 ARIA 初值符合 Task 2。
- 确认首页三个语义区块的节点数量、标题、ID、`aria-labelledby` 与顺序符合 Task 4。
- 确认三篇文章页的 `.article` 结构、正文段落数量（4／23／29+1）、电头边界、末尾日期位置符合 Task 5–Task 7。
- 以逐字符、不归一化的方式比较全部正文 `textContent` 与 Task 1 权威合同，任何单字符差异即判失败。
- 静态确认 `styles.css` 不含外部资源、`!important`、ID 选择器、被禁视觉模式，且移动区段精确为 `max-width: 768px`。
- 静态确认 `script.js` 为唯一共享脚本、无外部依赖、无 `console`／`debugger`、断点为 `(min-width: 769px)`，且只写入约定三处状态。
- 对 `Results/` 执行禁止项全局扫描（元数据作者、推断年份、内部来源名、段落编号、文件路径、哈希、占位记号），结果必须为 0。
- 产出可追溯到断言编号的核验结论；核验脚本与报告是临时 QA 产物，绝不落入 `Results/`。

## 前置条件与后续依赖

- 前置条件：Task 2–Task 9 的正式实现均已落地，`Results/` 中六个文件都存在且非空壳。Task 10 不在半成品上签署“通过”。
- 内容前置条件：Task 1 的三份哈希与逐段合同、Task 4 的首页三个冻结文本、Task 5–Task 7 的段落数组均已冻结。首页三段文本已于 2026-09-19 冻结在 Task 4，因此 E6 必须执行逐字符比较，不再作为 `PENDING` 处理。
- 直接依赖本任务的工作：Task 11 浏览器回归。Task 10 通过后，Task 11 才在真实浏览器中做视觉、缩放、键盘、禁用脚本与控制台回归。
- 阻断规则：任一交付文件缺失、为占位空壳，或三份素材哈希不匹配时，Task 10 停止签署整体通过，先移交对应上游任务，不在核验中代写或代改。
- 只读规则：Task 10 全程不写入 `Results/` 与 `Materials/`。唯一允许产生的文件是位于 `Results/` 之外的临时核验脚本与报告。

## 权威来源与优先级

Task 10 不自定义“正确值”，只把下列合同当作断言的唯一真值来源。出现冲突时，以更高优先级合同为准，并把冲突本身作为一条失败项移交，不在核验中自行裁决：

1. `plan/Task1-素材基线与内容合同.md`：三份哈希、段落数量、逐段文本、末尾日期、禁止项与高风险字符。
2. `plan/Task2-建立共享HTML壳与导航.md`：公共壳、`<head>`、稳定 class／ID、导航矩阵、`aria-current`、`no-js` 初值、按钮 ARIA。
3. `plan/Task3-实现桌面端纸媒视觉系统.md`：`styles.css` 变量、选择器范围、被禁视觉模式、不使用 ID／`!important`。
4. `plan/Task4-完成首页内容.md`：首页三区块节点、标题、ID、`aria-labelledby`、三个权威文本与可见内容白名单。
5. `plan/Task5`–`plan/Task7`：三篇文章的 DOM 映射、段落数组、电头与日期边界、高风险计数。
6. `plan/Task8-实现移动端响应式布局.md`：移动区段断点、被禁模式（`100vw`、`overflow-x:hidden/clip`、`word-break:break-all`）、不新增页面专属 class。
7. `plan/Task9-实现导航脚本与渐进增强.md`：`script.js` 唯一性、`defer` 引用、无外部依赖、三处状态写入、断点字符串。

## 交付物与文件所有权

### 本计划编写阶段

本次计划细化只创建：

- `plan/Task10-结构与内容自动核验.md`

本次不修改 `Results/` 中任何正式交付文件。

### Task 10 执行阶段

Task 10 不创建、不删除、不修改任何正式交付文件：

- `Results/index.html`、`Results/news-message.html`、`Results/news-feature.html`、`Results/news-commentary.html`
- `Results/styles.css`、`Results/script.js`
- `Materials/` 下任何 Word 文件
- `plan/` 下任何计划文件

Task 10 允许产生的，仅限位于 `Results/` 之外的临时 QA 产物：

- 一次性核验脚本（例如项目临时目录下的 `.mjs`／`.ps1`，或直接在浏览器控制台运行后不保存）。
- 一次性核验报告（通过／失败清单），保存在 `Results/` 之外，或仅作为对话结论呈现。

这些临时产物绝不进入六文件交付集合。核验结束后，落在项目内的临时脚本与报告应清理或明确保留在 `Results/` 之外；`Results/` 的文件数量在 Task 10 前后必须保持不变。

## Agent 所有权边界

| 责任方 | 允许修改 | 必须复用 | 禁止事项 |
| --- | --- | --- | --- |
| Task 10 Agent | 仅 `Results/` 之外的临时核验脚本与报告 | Task 1–Task 9 的全部合同作为断言真值 | 不得修改六个交付文件、三份素材或任何计划文件；不得为了让断言通过而放宽合同或改真值 |
| 上游各 Task Agent | 各自拥有的单一交付文件 | 上游冻结接口 | 收到 Task 10 的失败移交后，只在自己所有权范围内修复，不跨文件打补丁 |
| Task 11 | 一次性浏览器回归 | 上游全部合同 | 视觉、交互、控制台回归不得回写正式文件；临时记录不进入 `Results/` |

核心原则：Task 10 发现问题只“报告并移交”，修复由拥有该文件的上游任务执行。例如正文段落数错误移交 Task 5／6／7，移动区段断点错误移交 Task 8，脚本写入越权移交 Task 9，公共壳漂移移交 Task 2。Task 10 绝不代为修改，也不得用“看起来对”“视觉相似”“差异很小”作为通过理由。

## 核验范围与不核验范围

### Task 10 核验（确定性、可断言）

- 文件存在性、数量、命名、大小写、UTF-8 可解析性。
- 三份素材 SHA-256 与 Task 1 冻结值一致。
- HTML 结构：节点数量、标签、class、ID、属性、父子与兄弟顺序。
- 导航矩阵：四页各四个链接、目标、顺序、唯一 `aria-current="page"`。
- 逐字符 `textContent` 比较（不归一化）。
- 高风险字符串存在性与计数。
- `styles.css`、`script.js` 的静态文本模式（含禁止模式扫描）。
- 禁止项全局扫描（仅针对 `Results/`）。
- 跨页公共壳一致性（规范化后比较）。

### Task 10 不核验（移交 Task 11）

- 真实渲染下的版心像素、字号、行高、颜色对比度的视觉效果。
- 375／768／769／1280px 与 200% 缩放下的实际布局与横向溢出。
- 菜单真实点击、Enter／Space、Esc、焦点返回、跨断点重置的运行时行为。
- 禁用 JavaScript／CSS 的真实降级表现（Task 10 只静态确认源码不带 `hidden`／`aria-hidden`／`is-open` 等会破坏降级的标记）。
- 浏览器控制台是否 0 报错、是否有资源 404。

Task 10 可以对上述项目做“静态前提检查”（例如确认脚本断点字符串正确、确认导航源码未被隐藏），但不得据此宣称浏览器行为已通过；运行时结论一律留给 Task 11。

## 核验环境与工具

Task 10 在本地 `file://` 语境下工作，不联网、不安装运行时依赖到 `Results/`。推荐两条互补路径：

### 路径 A：浏览器 DOM 核验（首选，保真度最高）

用浏览器（含可用时的 browser-use 工具）逐页打开 `file://` 页面，通过一次性 `evaluate_script` 读取真实 DOM 的 `textContent`、节点数量、属性与顺序，再与合同比较。此路径天然处理实体解码、内联标签与文本节点边界，最贴近 Task 5–Task 7 定义的 `textContent` 语义。

- 读取用的脚本只在控制台运行或保存在 `Results/` 之外，绝不写入 `Results/script.js`。
- 读取过程不得修改 DOM；只 `querySelector`／`getAttribute`／读取 `textContent`，不 `setAttribute`、不改 `className`、不注入节点。

### 路径 B：Node／PowerShell 批量核验（哈希与静态文本模式）

用 Node（环境已具备）或 PowerShell 计算素材哈希、扫描 `styles.css`／`script.js` 的静态文本模式、对 `Results/` 做禁止项全文搜索。Node 侧若需解析 HTML，可使用运行环境已存在的解析能力；不得为此在 `Results/` 内新增依赖或配置文件。

- 哈希示例（PowerShell，只读）：

```powershell
(Get-FileHash -Algorithm SHA256 -LiteralPath 'Materials/新闻消息.docx').Hash
(Get-FileHash -Algorithm SHA256 -LiteralPath 'Materials/新闻通讯.docx').Hash
(Get-FileHash -Algorithm SHA256 -LiteralPath 'Materials/新闻评价.docx').Hash
```

无论采用哪条路径，断言的真值一律取自 Task 1–Task 9 合同；工具只是执行手段，不构成新的标准。

## 核验断言清单

下列每条断言都应在核验报告中以编号记录通过／失败。失败项必须附：所在文件、定位（选择器／行号／模式）、期望值、实际值、应移交的上游任务。

### A. 交付集合与文件范围

- **A1** `Results/` 恰好包含六个文件：`index.html`、`news-message.html`、`news-feature.html`、`news-commentary.html`、`styles.css`、`script.js`；文件名与大小写精确一致。
- **A2** `Results/` 内不存在第七个文件、子目录、临时文件、备份（`*.bak`、`*~`）、测试脚本、截图、README、JSON、`.map` 或包管理文件。
- **A3** 四个 HTML 均以 `<!doctype html>` 开始，可被解析；`styles.css`、`script.js` 为普通 UTF-8 文本。
- **A4** `Materials/` 三份 Word 未被本流程另存、改名或修改（哈希见 B 组；修改时间不应因核验而变化）。
- **A5** Task 10 执行前后 `Results/` 的文件清单与六个文件的 SHA-256 保持不变（证明核验只读）。

### B. 素材完整性（只读）

- **B1** `新闻消息.docx` 的 SHA-256 等于 `DE10B575399E0563430F2F255C956B179C9978C087897A24910AD70D6A50F6FC`。
- **B2** `新闻通讯.docx` 的 SHA-256 等于 `0C5B35256B7271ACFB2F49AEC146288B404ED49C376AC2C8B3F6246B38F894A4`。
- **B3** `新闻评价.docx` 的 SHA-256 等于 `8E50CFC89287035163D5FE95C8B1CEE20A5AA405E9D04EC358FB5C9312C3827C`。
- **B4** 哈希比较为完整相等（十六进制大小写不敏感），不得只比较前缀、文件名、大小或修改时间。任一不匹配即停止整体签署，移交 Task 1 重新确认素材版本。

### C. 公共壳与 `<head>`（Task 2，四页逐页）

- **C1** `<html lang="zh-CN">` 且源码初始 `class="no-js"`；源码中不预写 `js`。
- **C2** `<head>` 内恰好一个 `<meta charset="utf-8">`、一个 `width=device-width, initial-scale=1` 的 viewport、一个 `<title>`。
- **C3** 四个 `<title>` 逐字符等于页面登记表：
  - `index.html` → `《自然选择号》报社简介｜自然选择号`
  - `news-message.html` → `我校启动校本课程志愿填报｜自然选择号`
  - `news-feature.html` → `从数学题到AI时代的学习｜自然选择号`
  - `news-commentary.html` → `设备升级了，使用门槛也该降下来｜自然选择号`
  - 分隔符为全角 `｜`。
- **C4** 每页恰好一次 `<link rel="stylesheet" href="styles.css">`、一次 `<script src="script.js" defer>`；无 `type="module"`、无 `async`、无内联脚本、无内联事件属性、无 `<base>`、无内联 `<style>`、无 `style="..."`。
- **C5** `<body>` 第一个可聚焦元素是 `.skip-link[href="#main-content"]`，文字为“跳至正文”。
- **C6** 唯一 `.site-header` → `.site-header__inner` → 报头 `.site-masthead`／`.site-masthead__link[href="index.html"]`（文字“自然选择号”）、`button#nav-toggle.nav-toggle[type="button"]`、`nav#site-navigation.site-navigation[aria-label="主导航"]`。
- **C7** `#nav-toggle` 的 `aria-controls` 精确等于 `site-navigation`，初始 `aria-expanded="false"`；含 `.nav-toggle__icon[aria-hidden="true"]` 与文字为“菜单”的 `.nav-toggle__text`。
- **C8** 导航源码不带 `hidden`、`aria-hidden`、`is-open`；`.site-navigation__list` 下恰好四个 `.site-navigation__item`，每项一个 `.site-navigation__link`。
- **C9** 唯一 `main#main-content.main-content[tabindex="-1"]`；全页恰好一个 `<h1 class="page-title">`。
- **C10** 页面内无重复 ID；`#nav-toggle`、`#site-navigation`、`#main-content` 各出现一次。

### D. 导航矩阵与当前页（Task 2，四页合计）

- **D1** 每页四个导航链接的文字与顺序固定为：首页→`index.html`、新闻消息→`news-message.html`、新闻通讯→`news-feature.html`、新闻评论→`news-commentary.html`。
- **D2** 四页合计 16 条主导航链接，目标全部落在四个已存在文件；无绝对路径、无 `file://`、无反斜杠、无 `href="#"`、无查询参数、无 URL 片段、无 `target`。
- **D3** 每页恰好一个 `aria-current="page"`，且落在该页对应的自链接上（`index.html` 页在首页链接、消息页在消息链接，以此类推）。
- **D4** 报头链接与其余三个导航链接都不带 `aria-current`；`aria-current` 只在 `<a>` 上，不在 `<li>`／`<nav>` 上；值精确为 `page`。

### E. 首页内容（Task 4）

- **E1** `#main-content` 忽略空白文本节点后恰好两个直接元素子节点：先 `h1.page-title`（`《自然选择号》报社简介`），再 `div.home-sections`。
- **E2** `.home-sections` 恰好一个；其下恰好三个 `.home-section`，顺序为名称由来、主要工作与报道方向、成立时间。
- **E3** 每个 `.home-section` 恰好一个直接 `h2.home-section__title` 与一个直接 `p.home-section__text`，无其他元素子节点。
- **E4** 三个 `<h2>` 文本与顺序严格等于“名称由来”“主要工作与报道方向”“成立时间”；三个标题 ID 依次为 `origin-title`、`work-title`、`founded-title`；每个 `<section>` 的 `aria-labelledby` 解析到本区块唯一 `<h2 id>`；无重复 ID。
- **E5** 标题层级为一个 `h1` 后接三个同级 `h2`，无跳级、无额外标题、无 `<h3>`。
- **E6** 三个 `.home-section__text` 的 `textContent` 按顺序逐字符等于 Task 4 的冻结值，映射不错位：
  - `我们的名字来自《三体》里的一支舰队。`
  - `我们主要记录一些自己觉得有价值的东西。`
  - `报社成立于“鸽子衔枝之年”。`
  - 三条都含末尾中文句号 `。`，第一条含书名号 `《》`，第三条含一对全角引号 `“”`，且都不含半角空格。
- **E7** 页面不存在内部槽位名 `P_ORIGIN`／`P_WORK`／`P_FOUNDED`、模板方括号说明、`{{...}}`、`TODO`、`TBD` 或“页面登记表中的主标题”一类未替换记号。
- **E8** 首页正文可见内容白名单恰好七项并按序：主标题、名称由来、`我们的名字来自《三体》里的一支舰队。`、主要工作与报道方向、`我们主要记录一些自己觉得有价值的东西。`、成立时间、`报社成立于“鸽子衔枝之年”。`；无第八项可见正文。

#### 首页文本核验基线

首页三段文本冻结在 `plan/Task4-完成首页内容.md`（第三条已于 2026-09-30 经用户修订，见 Task 4 与 Task 0 的变更记录），因此 E6 一律执行逐字符比较，不存在 `PENDING` 情形。核验以 Task 4 冻结表为唯一真值；若发现 `Results/index.html` 与冻结值不一致而怀疑合同过时，先回 Task 4 与 Task 0 核对是否已记录经批准的变更，不得以页面现状反推合同。修订后首页不含任何四位数字，J2 的 `2026` 扫描不再需要 `2024` 豁免。

### F. 三篇文章页结构与逐字符（Task 5／6／7）

对 `news-message.html`（消息）、`news-feature.html`（通讯）、`news-commentary.html`（评论）分别执行。

- **F1** `#main-content` 唯一直接元素子节点是 `article.article`；其下依次 `header.article__header`、`div.article__body`，评论页在 `.article__body` 之后还有一个 `p.article__date`。
- **F2** `.article__header` 的直接元素子节点顺序固定为 `p.article__type`、`h1.page-title`、`p.article__byline`，恰好三项。
- **F3** `.article__type.textContent` 分别等于“新闻消息”“新闻通讯”“新闻评论”；评论页不得出现“新闻评价”。
- **F4** `h1.page-title.textContent` 分别等于三篇冻结标题（同 C3 中去掉 `｜自然选择号` 的部分）。
- **F5** `.article__byline.textContent` 三页均等于“蓝色空间”，无“作者：”“记者：”“评论员：”“文／”等前缀。
- **F6** `.article__body > p` 数量：消息页 4、通讯页 23、评论页 29；正文容器无其他元素子节点、无空段。
- **F7** `Array.from(document.querySelectorAll(".article__body > p"), p => p.textContent)` 与对应权威数组（`M01`–`M04`／`F01`–`F23`／`C01`–`C29`）长度相同且逐项严格相等。
- **F8** 电头边界（消息页、通讯页）：第一个正文 `<p>` 的首个子节点是 `strong.dateline`；其 `textContent` 分别精确等于 `自然选择号9月18日7时电`、`自然选择号9月17日电`；`</strong>` 后紧邻的文本节点首字符为 U+0020、次字符为正文首字（“我”／“上”）；电头后只有一个 U+0020，无 `&nbsp;`、无全角空格、无第二个连续空格。评论页不得出现 `.dateline`。
- **F9** 末尾日期（仅评论页）：恰好一个 `p.article__date`，是 `.article` 最后一个直接元素子节点，不在 `.article__body` 内，不是第 30 个正文段落；`textContent` 逐字符等于 `（自然选择号9月18日）`（全角括号，仅月日，无年份）；无 `<time>`、无 `datetime`、无隐藏机器可读年份。消息页与通讯页不得出现 `.article__date`。
- **F10** 三页均无 `<blockquote>`、`<q>`、`<cite>`、正文 `<h2>`、正文列表（`<ul>`／`<ol>`／`<li>`）、图片、正文链接、`<time>`；正文 `<p>` 内除允许的电头 `<strong>` 外无其他内联标签。
- **F11** 正文段落无前导／尾随空白，无因源码折行产生的段内额外空白（以 DOM `textContent` 为准，不以肉眼版式为准）。

### G. 高风险字符与计数（Task 5／6／7 的强化断言）

以下为快速定位漂移的计数断言，通过它们不替代 F7 的逐段严格比较；但任一计数不符即判失败。

- **G1（消息页）** 正文含 `今日7时`、`47个社团`、`第一志愿、第二志愿`、`9月18日7时电`；M02 含中文分号 `；`；`9月18日` 前无年份。
- **G2（通讯页）** 23 段合并 `textContent` 中：`AI` 出现 19 次，`ai`／`Ai`／`aI` 均为 0；中文左、右双引号各 8 个；中文左、右单引号各 2 个；U+2014 共 2 个且相邻组成唯一一处 `——`；全角问号 1 个、全角冒号 2 个、中文分号 3 个；U+0020 共 1 个（即 F01 电头后的空格）；人称 `她`（F05“在她看来”）与 `他`（F02／F10／F12／F20 等）按段保留，未被统一。标题另含 1 次 `AI`，连同标题共 20 次。
- **G3（评论页）** 正文中 `.exe` 恰好 3 次且前导 ASCII 句点完整；`安 装` 出现 0 次；`Windows 10` 在 C01、C14 各保留一个 U+0020；`UOS`、`USB`、`OPS`、`Linux`、`4K`、`86英寸`、`5次碰撞`、`3个U盘` 大小写与数字原样；C05 同时含 `不完全统计`、`5次碰撞`、`3个U盘被撞坏`、“还需要进一步检查”；C21 的 `科大讯飞` 为纯文本不在 `<a>` 内；C26 为单一普通段落无列表；C29 为单一普通段落含标题复述与结尾引语；日期 `9月18日` 前无年份；不出现 `Windows10`、`。exe` 等错误变体。

### H. `styles.css` 静态合同（Task 3／Task 8）

- **H1** 四页均只通过 `href="styles.css"` 引用样式；`Results/` 内只有一个样式文件。
- **H2** 不存在 `@import`、`@font-face`、`url(`、`http://`、`https://`、`//` 协议相对地址或本机盘符／绝对路径。
- **H3** 字体栈精确为 `"Songti SC", "STSong", "SimSun", serif`；无远程字体。
- **H4** 关键变量存在且值符合 Task 3：`--layout-max: 70rem`、`--reading-max: 46rem`、`--page-gutter: 2rem`（桌面），五个颜色变量逐字一致；无与既有变量语义重复但数值不同的并行变量。
- **H5** 不使用 ID 选择器（无 `#nav-toggle`、`#site-navigation`、`#main-content` 作为 CSS 选择器）；不使用 `!important`；不使用 `body.页面名`、文件名 class、`:nth-child()` 页面识别补丁。
- **H6** 当前页样式使用 `.site-navigation__link[aria-current="page"]`。
- **H7** 不含被禁视觉模式：`box-shadow`、`text-shadow`、`linear-gradient`／`radial-gradient` 等渐变、`background-image`、用于卡片化主要内容的 `border-radius`、`column-count`／`column-width`、`overflow-x: hidden`／`overflow-x: clip`、`word-break: break-all`。
- **H8** 移动区段存在且精确为 `@media (max-width: 768px)`，位于样式表末尾、桌面规则之后；不存在误写的 `max-width: 767px`、`min-width: 768px` 或会导致 769px 仍命中移动的查询。
- **H9** 移动区段不含 `100vw`、固定内容高度、`overflow-x: hidden`／`clip`、`word-break: break-all`、`!important`；换行保护使用 `overflow-wrap: anywhere`（或退化的 `break-word`）配 `word-break: normal`、`hyphens: none`。
- **H10** 不存在用 CSS `content` 注入正文、作者、日期、电头、菜单状态文字的非空 `content`（装饰性 `content: ""` 允许，仅限绘制汉堡图形等）。
- **H11** 未新增页面专属 class（`.mobile-*`、`.message-*`、`.feature-*`、`.commentary-*`、`.news-commentary-*`、`.nowrap`、`.technical-term` 等）或第二套移动主题变量。
- **H12** 花括号配对、媒体查询可被解析；样式表整体语法有效（无未闭合规则导致的静默丢弃）。

### I. `script.js` 静态合同（Task 9）

- **I1** 四页均以 `<script src="script.js" defer>` 引用；`Results/` 内只有一个脚本文件，无第二个脚本、polyfill 或配置 JSON。
- **I2** 为普通脚本，不含 `import`／`export`、不是 ES module；不含外部 URL、`fetch`、`XMLHttpRequest`、第三方库。
- **I3** 不含 `console.`、`debugger`。
- **I4** 断点查询字符串为 `(min-width: 769px)`，与 Task 8 的 `max-width: 768px` 互补；不出现 `768px`、`48rem` 或读取 `innerWidth`／`offsetWidth` 数值来判定布局。
- **I5** 脚本只写入三处状态：`documentElement` 的 `no-js`／`js`、`#site-navigation` 的 `is-open`、`#nav-toggle` 的 `aria-expanded`；不存在对其他元素的 `setAttribute`、`style`／`style.*`、`innerHTML`、`className` 整体改写或文本注入。
- **I6** 查询基于 `#nav-toggle`、`#site-navigation`、`.site-navigation__link`；不以中文链接文本或元素位置索引作为判定依据。
- **I7** `no-js → js` 切换位于脚本首位实质逻辑（元素查询之后、任何状态写入之前即完成），不使用 `tabindex`／`aria-hidden`／`hidden` 管理链接可聚焦性。
- **I8** 不含 Word 元数据作者、推断年份、文件路径、哈希或内部段落编号（含注释）。
- **I9** 未实现“点击菜单外部关闭”：脚本不监听 `document`／`window` 的 `click`、`pointerdown`、`mousedown` 或 `touchstart` 来判断点击是否落在菜单之外（用户已于 2026-09-19 决定不实现；出现该逻辑即为越权，移交 Task 9 移除）。

> 说明：I 组是对脚本源码的静态模式核验，用于确认合同前提；脚本的真实运行行为（点击、Esc、焦点、跨断点重置、控制台 0 报错）由 Task 11 在浏览器中验证，Task 10 不据静态检查宣称交互通过。

### J. 禁止项全局扫描（仅针对 `Results/`）

对 `Results/` 六个文件的全文执行搜索，下列每一项结果必须为 0。扫描范围严格限定 `Results/`，不得把 `plan/` 或 `Materials/` 计入（计划文档合法包含风险说明与源文件名，会造成误报）。

- **J1** Word 元数据作者／最后修改者：`厨一枚`、`胡桃`（含 `厨一枚~ 胡桃`）。
- **J2** 由文件时间推断的年份：`2026`。
- **J3** 内部来源名：`新闻评价`。
- **J4** 内部段落编号与合同标记：`M01`–`M04`、`F01`–`F23`、`C01`–`C29`、`closing_date`、`P_ORIGIN`、`P_WORK`、`P_FOUNDED`。
- **J5** 素材文件名与路径：`新闻消息.docx`、`新闻通讯.docx`、`新闻评价.docx`、`Materials/`、`Materials\`、任何盘符绝对路径。
- **J6** 三份素材的 SHA-256 十六进制串（完整或部分片段）。
- **J7** 作者／来源标签：`作者：`、`记者：`、`评论员：`、`文／`、`来源：`、`出处：`。
- **J8** 占位与开发记号：`TODO`、`TBD`、`Lorem`、`Lorem ipsum`、`{{`、`}}`、`待补充`、`占位`、`示例文本`、“页面登记表中的主标题”。
- **J9** 机器可读推断日期：`datetime=`、`<time`。
- **J10** 外部资源与联网：`http://`、`https://`、`//cdn`、`@import`、`@font-face`、`url(`。

> `自然选择号9月18日`、`9月17日` 等正文内的月日属于 Task 1 冻结文本，是合法的；J9 只禁止 `<time>`／`datetime` 这类机器可读标记，不禁止正文可见月日。

### K. 跨页公共壳一致性（Task 2）

- **K1** 将四页按以下规则规范化后，剩余 DOM 结构应完全一致：把四个 `<title>` 文本替换为同一占位；把四个 `<h1>`（及文章页 `.article__type`／`.article__byline` 之外的结构差异按各自合同保留）文本替换为同一占位；从导航链接移除 `aria-current="page"`。
- **K2** 四页的跳至正文链接、报头、菜单按钮结构、导航四项顺序与目标、共享资源引用方式完全一致；差异只允许出现在 `<title>`、`<h1>`、当前页标记，以及各页 `<main>` 内的内容区（首页三区块 vs 文章页 `.article`）。
- **K3** 不存在某页独有的额外 wrapper、页脚、内联脚本、内联事件、页面专属 body class 或重复 ID 来弥补结构漂移。

## 逐字符比较规则

所有文本断言（C3、E4、E6、F3–F9、G 组）都必须遵守：

- 以浏览器 DOM 的 `textContent`（或等价的解析后文本）为准，而非源码字面或肉眼版式。
- 逐项严格相等（`===`），比较前**不得**执行 `trim()`、`replace(/\s+/g," ")`、大小写折叠、全半角转换、Unicode 标准化（NFC/NFKC）、智能标点替换或任何归一化。
- 一个字符、一个空格、一个标点的差异即判失败；不得以“视觉相似”“差异很小”“不影响阅读”作为通过理由。
- 数组比较同时校验长度与每一项；长度不同直接失败，并定位首个差异索引。
- 保留字符实体解码后的真实值（例如 `&amp;` 应比较解码后的 `&`），但本项目正文不含需要转义的保留字符，若出现应核对解码结果与合同一致。

## 执行步骤

1. **确认前置完成**：核对 Task 2–Task 9 均已实现，六个文件都存在且非占位空壳；任一缺失即停止并移交，不在半成品上核验。
2. **冻结只读基线**：记录核验开始前 `Results/` 六个文件的 SHA-256 与文件清单，作为 A5“核验未改动交付物”的对照。
3. **素材哈希核验（B 组）**：只读计算三份 Word 的 SHA-256，逐项完整比较；不匹配则停止整体签署，移交 Task 1。
4. **公共壳与导航核验（C、D、K 组）**：逐页检查 `<head>`、稳定 class／ID、按钮与导航 ARIA、16 条导航路径与四个唯一当前项，并做跨页一致性比较。
5. **首页核验（E 组）**：检查三区块节点、标题、ID、`aria-labelledby`、顺序，并把三个区块文本与 Task 4 冻结值逐字符比较。
6. **文章页核验（F 组）**：逐页检查 `.article` 结构、段落数量（4／23／29+1）、电头与日期边界、逐项 `textContent`。
7. **高风险计数核验（G 组）**：执行三页的强化计数断言，定位常见录入漂移。
8. **样式静态核验（H 组）**：扫描 `styles.css` 的外部资源、ID／`!important`、被禁视觉模式、移动区段断点与换行保护。
9. **脚本静态核验（I 组）**：扫描 `script.js` 的唯一性、`defer`、外部依赖、`console`／`debugger`、断点字符串与三处状态写入。
10. **禁止项全局扫描（J 组）**：仅对 `Results/` 六个文件全文搜索全部禁止项，逐项确认计数为 0。
11. **汇总核验报告**：按断言编号输出通过／失败清单；每条失败附文件、定位、期望值、实际值与应移交的上游任务。
12. **确认只读未变（A5）**：核验结束后重新计算六个文件的 SHA-256 与文件清单，确认与步骤 2 完全一致；确认临时脚本与报告都在 `Results/` 之外。
13. **移交与闸门判定**：全部断言通过且无“待冻结”遗留项时，判定 Task 10 通过，交 Task 11；存在失败或待冻结项时，列出移交清单，不签署整体通过。

## 核验报告格式

核验结论应可追溯，建议每条一行，至少包含：

```text
[断言编号] [PASS|FAIL|PENDING] 文件 — 定位 — 期望 vs 实际（失败时） — 移交任务（失败时）
```

- `PASS`：断言成立。
- `FAIL`：断言不成立，必须给出定位与应移交的上游任务，Task 10 不自行修复。
- `PENDING`：因上游权威值尚未冻结而无法判定（当前所有合同均已冻结，正常情况下不应出现）；必须说明缺失的具体输入与解冻条件。

报告本身是临时 QA 产物，保存在 `Results/` 之外或仅作对话结论呈现，不得写入六个交付文件，也不得作为第七个文件留在 `Results/`。

## 异常处理

- **交付文件缺失或为空壳**：停止整体核验，移交对应内容／样式／脚本任务补齐，不在核验中代写。
- **素材哈希不匹配**：停止使用旧文本合同，移交 Task 1 确认是否为用户批准的新版本；不得假设“只是格式调整”。
- **正文段落数或逐字符不符**：定位首个差异索引与所在文件，移交 Task 5／6／7；不得在核验中改字、补段、删段或归一化后判通过。
- **公共壳漂移（ID、导航、ARIA、资源引用）**：移交 Task 2；不得靠放宽断言掩盖。
- **`styles.css` 命中被禁模式或断点错误**：移交 Task 3（桌面）或 Task 8（移动区段）。
- **`script.js` 越权写入或断点错误**：移交 Task 9。
- **禁止项命中**：定位命中文件与上下文，移交产生该内容的上游任务清除；区分 `Results/`（必须为 0）与 `plan/`（合法包含风险说明，不计入）。
- **首页文本与冻结值不符**：E6 直接判 `FAIL` 并移交 Task 4；不得以页面现状反推合同，也不得在核验中代写或代改文本。
- **核验工具本身写入了文件**：立即核查 A5，恢复只读原则；临时脚本必须放在 `Results/` 之外。
- **断言之间冲突**：以“权威来源与优先级”裁决，并把冲突作为一条失败项移交，不在核验中私自选择版本。

## 常见误判风险

- 用 `trim()`、空白折叠或 Unicode 归一化后再比较，导致本应失败的段落被判通过。
- 只检查高风险词存在，而没有逐段比较 4／23／29+1 个段落的原始 `textContent`。
- 把禁止项扫描扩大到 `plan/` 或 `Materials/`，因计划文档中的风险说明产生误报。
- 把静态脚本检查当作交互行为通过，越权替代 Task 11 的浏览器回归。
- 以“视觉相似”“差异很小”为由放行单字符差异。
- 忘记核验 `Results/` 文件数量，放过混入的第七个文件或临时产物。
- 忘记在核验前后比较六个文件哈希，未发现自己意外改动了交付物。
- 用宽松断言（如只比较段落数不比较内容）替代合同要求的逐项严格相等。
- 把评论页 `.article__date` 当成第 30 个正文段落，或把电头 `<strong>` 后的 U+0020 漏检。

## 完成定义

Task 10 只有在以下条件全部满足时才算完成：

- [ ] 核验全程只读；`Results/` 六个文件与三份素材在核验前后 SHA-256 与清单一致。
- [ ] A 组：`Results/` 恰好六个文件、命名精确、无第七个文件或临时产物混入。
- [ ] B 组：三份素材 SHA-256 完整匹配 Task 1 冻结值。
- [ ] C、D、K 组：四页公共壳、`<head>`、稳定 ID／class、按钮与导航 ARIA、16 条导航路径、四个唯一当前项、跨页一致性全部通过。
- [ ] E 组：首页三区块节点、标题、ID、`aria-labelledby`、顺序、白名单通过；E6 三个区块文本与 Task 4 冻结值逐字符通过。
- [ ] F 组：三篇文章 `.article` 结构、段落数量（4／23／29+1）、电头与日期边界、逐项 `textContent` 全部严格相等。
- [ ] G 组：三页高风险字符与计数断言全部通过。
- [ ] H 组：`styles.css` 无外部资源、无 ID／`!important`、无被禁视觉模式，移动区段精确为 `max-width: 768px` 且合规。
- [ ] I 组：`script.js` 为唯一脚本、`defer` 引用、无外部依赖与 `console`／`debugger`、断点 `(min-width: 769px)`、只写入三处状态、未实现点击外部关闭（I9）。
- [ ] J 组：`Results/` 禁止项全局扫描逐项计数为 0。
- [ ] 产出可追溯到断言编号的核验报告；所有 `FAIL` 均有定位与移交对象，所有 `PENDING` 均说明缺失输入。
- [ ] 临时核验脚本与报告均位于 `Results/` 之外，未进入六文件交付集合。
- [ ] 无失败且无遗留 `PENDING` 时判定 Task 10 通过并移交 Task 11；否则输出移交清单，不签署整体通过。

## 后续任务交接

- Task 11 在 Task 10 判定通过后，从 `Results/index.html` 起在真实浏览器中执行四页的视觉、375／768／769／1280px 与 200% 缩放、键盘操作、菜单交互、禁用 JavaScript／CSS 降级与控制台 0 报错回归；Task 10 的静态结论不替代 Task 11 的运行时结论。
- 若 Task 11 在浏览器中发现结构或文本问题，应回流为 Task 10 的失败项并移交对应上游任务修复，修复后重跑 Task 10 相关断言，再由 Task 11 复验。
- 上游任一合同（哈希、段落数组、首页权威文本、稳定 ID／class、断点值、脚本接口）发生经批准的变更时，必须先更新对应 Task 文件，再同步更新本任务的断言真值，不得只改交付文件而让 Task 10 断言滞后。
- 首页三段文本已冻结在 Task 4 与 Task 0；若此后经批准改动，必须先更新那两份合同，再同步本任务 E6／E8 的期望值，不得只改页面。
