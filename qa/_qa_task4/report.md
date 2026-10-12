# Task 4 验收报告：完成首页内容

- 交付文件：`Results/index.html`（唯一被修改的文件；正文由 1 行 `<h1>` 扩展为 20 行 `<main>` 块）
- 内容来源：`plan/Task4-完成首页内容.md`「占位符输入合同」第 1 节的三条冻结字面值，逐字符照抄
- 验收工具（全部位于 `Results/` 之外，不属于交付物）：
  - `_qa_task4/verify_home.py` —— 184 项静态结构/文本合同检查
  - `_qa_task4/mutate_home.py` —— 70 个违约变异体 + 1 个对照组
  - `_qa_task4/probe_live.html` + `_qa_task4/run_browser.py` —— 无头 Chrome 真实 DOM 断言（CSS/JS 启用、禁用 CSS、禁用 JS、640px 窄视口）
  - `_qa_task4/shots/` —— 真实渲染截图 5 张

## 1. 结果总览

| 层次 | 手段 | 结果 |
| --- | --- | --- |
| 静态合同 | `python _qa_task4/verify_home.py` | 共 184 项，通过 184，失败 0 |
| 变异测试 | `python _qa_task4/mutate_home.py` | 变异 70 个 + 对照组 1 个；未达预期 0 个 |
| 模板一致性 | 与计划「权威 HTML 结构合同」逐行比对 | 20 行，逐行差异 0（含缩进） |
| 真实 DOM（1280px） | 无头 Chrome 探针 | 99 项断言全通过（含禁用 CSS、禁用 JS 场景） |
| 真实 DOM（640px，200% 缩放等效） | 无头 Chrome 探针 | 97 项断言全通过 |
| 渲染截图 | `--headless=new` | 1280 / 1280@200% / 768 / 375 / 1280 无 CSS，共 5 张 |

## 2. 冻结文本核验（逐字符，不做 trim 与归一化）

浏览器实时 `textContent` 与 `innerText` 均与冻结值完全一致：

| 区块 | 标题（h2） | 段落 textContent |
| --- | --- | --- |
| 1 | `名称由来` | `我们的名字来自《三体》里的一支舰队。` |
| 2 | `主要工作与报道方向` | `我们主要记录一些自己觉得有价值的东西。` |
| 3 | `成立时间` | `报社成立于2024年。` |

- 三条均保留末尾中文句号 `。`（且只有一个），`《三体》` 书名号在浏览器中可见。
- `2024年` 数字与「年」之间无空格；三条文本内不含任何半角空格、不换行空格或全角空格。
- 无字段前缀（「名称由来：」等）、无引号包围、无解释文字、无扩写。
- 源码中不存在内部槽位名 `P_ORIGIN`/`P_WORK`/`P_FOUNDED`，不存在 `[经确认的……]` 方括号计划说明，
  不存在「暂无资料」「待补充」「成立时间未知」等自拟文字。

## 3. DOM 结构与语义

- `<main>` × 1、`<h1>` × 1、简介 `<section>` × 3、区块 `<h2>` × 3、文本 `<p>` × 3。
- `#main-content` 的直接元素子节点（忽略排版空白）恰为 `h1.page-title` → `div.home-sections`。
- `.home-sections` 恰有 3 个直接 `.home-section` 子元素；每个区块内恰为 `h2.home-section__title` → `p.home-section__text`，
  区块内元素总数为 2（无装饰空节点）。
- 三个 `<h2>` 文本与顺序严格为「名称由来 / 主要工作与报道方向 / 成立时间」；
  ID 依次为 `origin-title`、`work-title`、`founded-title`，与各自 `aria-labelledby` 一一互指，
  本文档 `getElementById` 命中本区块标题；全页无重复 ID，且不与公共壳 ID 冲突。
- 标题序列恰为 `h1 → h2 → h2 → h2`，无跳级、无额外标题；未使用 `<h3>`、加粗段落或纯视觉大字。
- 未使用 `<article>`/`<aside>`/`<details>`/选项卡/折叠面板/ARIA widget role；标题无冗余 `aria-label`。
- 阅读顺序（真实渲染 rect 顶部单调不降）为 `H1>H2>P>H2>P>H2>P`，左边缘无分栏漂移。

## 4. 可见内容白名单

忽略公共壳后，正文可见文本恰为 7 项且顺序一致，无第 8 项：
`《自然选择号》报社简介` → `名称由来` → 冻结文本 1 → `主要工作与报道方向` → 冻结文本 2 → `成立时间` → 冻结文本 3。

禁止项零命中：正文内无 `a / button / img / svg / form / input / iframe / ul / ol / li / table / time / footer / br / span`
等元素；无文章预览、卡片、轮播、摘要、页脚、版权、联系方式、宣传语；
无 `厨一枚`、`胡桃`、`2026`、`datetime` 或新闻月日；无外部 URL、联网字体、内联 `<script>`、
内联 `style`、内联事件、页面专属 `<style>`、`url()`；未新增页面专属 body class。

## 5. 渐进增强（禁用 CSS / 禁用 JS）

- **禁用 CSS**（运行时 `styleSheets.disabled = true`）：结构、7 项可见文本、`H1>H2>P>H2>P>H2>P` 顺序与启用 CSS 时逐项一致；
  段落仍为 UA 默认块级，区块仍占据可见高度。截图 `shots/index_1280_no_css.png` 目视确认。
- **禁用 JS**（`sandbox="allow-same-origin"`，脚本不执行）：三个区块与三条文本完整存在（内容不经脚本注入）；
  `html.class` 仍为 `no-js`；4 个导航链接与跳至正文链接均可见可点（宽高 > 0）。
- **200% 缩放等效（640px 逻辑视口）**：97 项断言全通过；三条文本随宽度换行而非裁切
  （`scrollWidth ≤ clientWidth`，无 `text-overflow: ellipsis`、无 `overflow: hidden`）。

## 6. 变异测试（证明验收脚本不是空跑）

70 个变异体全部被至少一项检查捕获，覆盖：删/增句号、改字、润色扩写、加字段前缀、插入半角空格、
`2024 年` 加空格、年份改 `2026`、补月日、引号包围、删书名号、全角转半角、段落拆分、`<br>`、`<strong>`、
`&nbsp;`、丢末尾句号、槽位名泄露（文本/注释/方括号）、区块顺序交换、`<h1>` 位置后移、少写区块、
新增第四区块、拆分区块、`section`→`div`、去掉 `.home-sections` 外层、两个 `.home-sections`、
`h2`→`h3`、标题改加粗段落、文本改 `div`、区块内加空节点、第二个 `<h1>`、区块内元素顺序颠倒、
缺 `aria-labelledby`、指向他区块、ID 改名、重复 ID、标题与 ID 错位、文本与区块错位、冗余 `aria-label`、
文本放 `data-*`、隐藏节点承载文本、widget role、文章卡片、按钮表单、图片、页脚版权、宣传语、
外部字体、内联 style/`<style>`/`<script>`/事件、`<time>`、作者名、body class、钩子改名、钩子丢失、
区块专属颜色 class，以及公共壳回归（`<title>`、`<h1>`、`no-js`、viewport、资源路径、
`aria-current` 转移、菜单按钮 ARIA、导航顺序）。

浏览器探针层同样非空跑：对 m01/m21/m24/m35 分别报出 7/16/45/6 项 FAIL；
m27（删除外层容器）导致探针无法产出任何 PASS。

首轮曾发现 6 个变异体「未达预期」，根因是核验脚本在结构被破坏时抛异常而非记 FAIL
（`h2, p = inner` 解包、`groups[0]`、`ps[2]` 越界）。已将定位改为防御式并补记「区块缺失」类 FAIL，
现 70/70 捕获、对照组 0 失败。

## 7. 范围核对

`Results/` 仍只有 5 个文件：`index.html`（09:30 修改）、`news-message.html`、`news-feature.html`、
`news-commentary.html`（08:30，未变）、`styles.css`（08:57，未变）。
`Materials/` 三个 docx 时间戳为 9-17～9-18，未读取其元数据。
本任务未创建 CSS/JS/图片/JSON/README；`script.js` 仍缺失（属 Task 9 交付），
首页内容不依赖它（禁用 JS 场景已验证）。QA 脚本与截图全部在 `_qa_task4/`。

## 8. 后续任务交接基线

- 稳定样式接口：`.home-sections`（外层组）、`.home-section`、`.home-section__title`、`.home-section__text`。
- 固定节点数量：`#main-content` 直接子元素 2 个（`h1.page-title` + `div.home-sections`）；
  3 个 `section.home-section`，每个含 1 个 `h2` + 1 个 `p`。
- 标题 ID：`origin-title` / `work-title` / `founded-title`（依次对应三条冻结文本）。
- Task 8：在 375 / 768 / 769px 检查区块间距与换行（640px 等效缩放已确认无裁切）。
- Task 10：可直接以本报告第 2、3 节的字面值与数量作为期望值（`verify_home.py` 已实现同等断言）。
- Task 11：正常 / 200% / 禁用 CSS / 禁用 JS 四态已在本轮真实浏览器下通过。

## 9. 完成定义逐条勾选

- [x] 三条区块文本采用冻结表字面值，未扩写、未润色、未错位
- [x] 只修改 `Results/index.html`
- [x] `<title>` 与唯一 `<h1>` 保持 Task 2 文本
- [x] 公共壳、四项导航与唯一当前页标记无漂移
- [x] `<h1>` 后恰有 1 个 `.home-sections` 与 3 个固定顺序语义区块
- [x] 三个区块标题的文字、层级、ID 与 `aria-labelledby` 全部正确
- [x] 三个段落与冻结值逐字符一致（含句号与书名号），无错位、无多余空格
- [x] 无内部槽位名、方括号计划说明或未替换记号
- [x] 无第四个区块、额外段落或范围外可见内容
- [x] 无新增事实、文章预览、按钮、动态模块、宣传语、图片或页脚
- [x] 无 Word 元数据、推断年份 `2026`、外部 URL 或运行时依赖
- [x] 禁用 CSS / JavaScript 时新增内容仍按正确顺序完整可读
- [x] Task 10 获得节点数量、顺序、标题、ID 与三条冻结文本的核验基线
