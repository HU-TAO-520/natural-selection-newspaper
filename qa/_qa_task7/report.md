# Task 7 验收报告 — 新闻评论页 `Results/news-commentary.html`

验收时间：2026-09-19 ｜ 唯一改动文件：`Results/news-commentary.html`（1829 → 8486 字节）

## 1. 结论

**Task 7 通过验收。** 源文件独立重提取 162 项、页面静态/DOM 核验 108 项、真实浏览器核验 293 项
（6 种场景）、独立第二代码路径复核 35 项全部通过；76 个变异全部被捕获且对照组零误报。

| 层次 | 脚本 | 结果 |
| --- | --- | --- |
| 哈希门禁 + docx 独立重提取 + 三方比对 + 逐段字符数 | `_qa_task7/extract.py` | 162 项，0 失败 |
| 结构 / 逐字符 / 高风险计数 / 禁止项 / 变更边界 | `_qa_task7/verify.py` | 108 项，0 失败 |
| 变异捕获率（含 rc=0 对照） | `_qa_task7/mutate.py` | 76/76 捕获，control rc=0 |
| 真实浏览器（无头 Chrome + 同域 iframe 视口） | `_qa_task7/run_browser.py` | 293 项，0 失败 |
| 纯 regex 独立复核 + 跨页一致性（不用 bs4） | `_qa_task7/final_check.py` | 35 项，0 失败 |
| Task 3 / 5 / 6 回归 | 各自 `verify*.py` | 见第 7 节，仅“本任务不得改动他页”类过期断言变化 |

交付文件 `Results/news-commentary.html` SHA-256 =
`a2dbf4aac57472e8a8728f80908dc366d3aa9076310bbb39b24d71f251ea8d52`（8486 字节）。

## 2. 版本门禁与三方比对（Task 7.1）

- `Materials/新闻评价.docx` SHA-256 = `8E50CFC8…C3827C`，与 Task 1 冻结值逐字符相等，20014 字节未变。
- 独立重提取：Word 32 个 `w:p` 节点全部可见非空，无空段；无 `w:br`／`w:tab`／表格／图片／链接／域代码／修订；
  `lastRenderedPageBreak` 恰 4 处，位于第 8、14、21、28 节点，与 Task 1 登记一致，未迁移进 HTML。
- 角色边界：第 1 段标题、第 2 段署名、第 3–31 段 `C01`–`C29`、第 32 段 `closing_date`。
- **三方逐字符全等**：docx 实测 ↔ Task 1 合同 ↔ Task 7 计划副本，共 32 条（含 `type` 之外的全部单元）无分叉。
- 逐段字符数与 Task 1 表完全一致（`title=15`、`byline=4`、`C01=80`…`C29=36`、`closing_date=12`，合计 2069）。
- run 拼接实测：第 8、14、28 段各 2 个 run、第 31 段 4 个 run，接缝处无空格、无额外节点，
  全页 `安 装` 命中 0、`安装` 正常连续。

## 3. 变更边界（Task 7.9）

- `build.py` 只替换 `<main>…</main>`；写入前后 `<main>` 之外的公共壳字节全等（SHA 前缀 `f73082bb`）。
- 写入前快照 `_qa_task7/before.html` SHA-256 = `cdc13a40…6f27ee`，与 Task 6 验收时记录的评论页基线一致
  → 证明 Task 2 之后、本任务之前该页无人改动，不存在需逐项比较的用户新增正文。
- `index.html` `73f49fd8…`、`news-message.html` `66ae5826…`、`news-feature.html` `73ff7567…`、
  `styles.css` `30d74661…` 四个哈希与实施前逐位一致；三份素材哈希与字节数未变。
- `Results/` 仍是 5 个约定文件，未新增脚本、JSON、截图或 README；QA 产物全部在 `_qa_task7/`。
- 未新建 `script.js`（Task 9 交付物），页面继续按 Task 2 引用 `styles.css` 与带 `defer` 的 `script.js`。

## 4. 完成定义逐项（对应计划第“完成定义”21 项）

- [x] `Materials/新闻评价.docx` SHA-256 与 Task 1 冻结值一致
- [x] 只修改 `Results/news-commentary.html`
- [x] `<title>`、公共壳、共享资源引用、四项导航符合 Task 2（`｜` 全角分隔符逐字符核验）
- [x] 全局唯一 `<main>`、唯一 `<h1>`、唯一 `aria-current="page"`
- [x] 当前导航项“新闻评论”，链接 `news-commentary.html`
- [x] 正式页面不存在“新闻评价”、源文件路径、哈希、内部编号、HTML 注释
- [x] `#main-content` 恰好一个 `.article`，顺序 `header.article__header → div.article__body → p.article__date`
- [x] 页面类型逐字符等于“新闻评论”
- [x] 标题逐字符等于“设备升级了，使用门槛也该降下来”（复用 Task 2 的 `h1.page-title`，未新建第二个 `<h1>`）
- [x] 署名只显示“蓝色空间”，无“作者：/评论员：”等前缀
- [x] `.article__body` 恰好 29 个直接 `<p>`，无其他元素子节点，依次对应 C01–C29
- [x] 29 段原始 `textContent` 与 Task 1 逐项严格相等（未 trim、未折叠空白、未归一化）
- [x] `p.article__date` 恰一个，紧随正文容器且在容器之外，文本等于 `（自然选择号9月18日）`
- [x] 无 `<time>`、`datetime`、推断年份、额外发布日期或版权年份
- [x] `86英寸`、`Windows 10`×2、`.exe`×3、`UOS`×4、`USB`×4、`OPS`、`Linux`、`4K`、`5次碰撞`、`3个U盘` 原样保留
- [x] 全页无 `安 装` 等 run 拆词；正文 U+0020 总数恰为 2（两处 `Windows 10`）
- [x] C26 仍是单个普通段落（163 字，未转列表），C29 标题复述与引语同段（未用 `<blockquote>`）
- [x] 科大讯飞资料为纯文本，无链接、脚注或来源说明
- [x] 无 Word 元数据作者、摘要、小标题、段落编号、图片、外链或其他新增资料
- [x] 禁用 CSS / 禁用 JavaScript 时，33 个公开单元按类型→标题→署名→C01–C29→日期顺序完整可读，导航四项仍可访问
- [x] 已向 Task 10 交付固定 DOM 数量、顺序、C01–C29 数组与日期边界规则（见第 6 节）

## 5. 浏览器与视觉实测

- 场景：1280px、1024px、768px、640px、禁 CSS、禁 JS（iframe `sandbox="allow-same-origin"`），
  每场景 47–53 项断言，合计 293 项全通过；无横向溢出，`file://` 离线打开文字完整。
- 渲染阅读顺序用 `main.innerText` 实测为 33 行，与白名单逐行相等；禁 CSS 场景仍为 33 行且 29 段 `textContent` 不变。
- 日期由共享样式 `.article__date` 右对齐（`getComputedStyle` 实测 `text-align: right`），
  文本节点首字符为全角左括号 `（`，未用空格或 `&nbsp;` 模拟对齐；几何位置实测在 C29 之下。
- 截图 `_qa_task7/shots/shot_1280.png`、`shot_1024.png`、`shot_full.png`、`shot_tail.png`：
  报头、导航当前项、类型眉题、标题、署名、29 段正文与右对齐日期均按 Task 3 桌面纸媒版式呈现，正文两端对齐、首行缩进。
- 页面引用资源仅 `styles.css`、`script.js` 与四个站内链接，外部/绝对 URL 为 0；
  `script.js` 缺失属 Task 9 范围，禁 JS 场景已证明正文与导航不依赖脚本。

## 6. Task 10 交接基线

- 期望数组与逐段字符数：`_qa_task7/expected_commentary_paragraphs.json`（直接来自 Task 1 合同，非页面反向生成）。
- DOM 数量：`main` 1、`article` 1（`main` 唯一元素子节点）、`header` 1、`.article__type` 1、`h1.page-title` 1、
  `.article__byline` 1、`.article__body` 1、`.article__body > p` 29、`p.article__date` 1、全页 `<p>` 33
  （`<main>` 内 32 个 ＋ 报头 `site-masthead` 1 个）、`<footer>` 0、`<aside>` 0、`<nav>` 1。
- 比较规则：选择器取原始 `textContent`，禁止 `trim()`、空白折叠、Unicode 归一化；日期段不得计入 29 段。
- 禁止项命中数（当前均为 0）：`新闻评价`、`厨一枚`、`胡桃`、`2026`、`作者：`、`记者：`、`评论员：`、
  `来源：`、`出处：`、`Materials/`、`.docx`、`C01`–`C29` 编号、`closing_date`、SHA 片段、HTML 注释、
  `data-*`、`<style>`、内联 `style`、`<time>`、`datetime`、`&nbsp;`、外部 URL、`<img>`、`<a>`（正文内）。
- 可复用命令：`python _qa_task7/verify.py`（支持 `QA_RESULTS=<目录>` 指向变异副本）、
  `python _qa_task7/mutate.py`、`python _qa_task7/run_browser.py`、`python _qa_task7/final_check.py`。

## 7. 回归与说明

- Task 3 `verify_css.py`：199/199 通过（共享样式未被本任务改动）。
- Task 5 `verify.py`：155 项中 153 通过，2 项失败均为“本任务不得改动 `news-commentary.html`／`news-feature.html`”
  的过期范围断言，实际变化分别由 Task 7、Task 6 授权发生。
- Task 6 `verify.py`：202 项中 201 通过，唯一失败同样是“`news-commentary.html` 未被本任务改动”，即本任务的合法改动。
- Task 4 `verify_home.py`：184 项中 181 通过，3 项失败是“其他三页 mtime 早于 index.html”的过期范围断言
  （首页内容哈希本身未变）。
- Task 2 `verify.py`（`QODER_RESULTS_DIR` 基线对照）：改动前 40 项失败 → 改动后 47 项失败，
  新增 7 项全部是评论页“Task 2 阶段尚不得含正文/文章标签”类断言，属 Task 5–7 录入内容的必然结果；
  其他三页的失败集合未增加，公共壳、导航矩阵与 ARIA 合同仍通过。
- 说明：Task 2 的禁止串“记者”在四页命中 1 次，位于 C05“根据记者的不完全统计”，是 Task 1 冻结正文的既有文字；
  Task 7 禁止的是“记者：”一类署名前缀（实测 0 次），二者不冲突。

## 8. 遗留与边界

- 移动端 375 / 768 / 769px 断点细化属 Task 8；本任务只在 1280 / 1024 / 768 / 640px 确认无横向溢出与换行异常。
- 导航脚本与 `no-js` 切换属 Task 9；`Results/script.js` 仍不存在，本任务未创建占位文件。
- 全站浏览器终检（200% 缩放、焦点顺序、跨页导航）属 Task 11。
- 若日后收到更正或新版 Word，须先回 Task 1 更新哈希与逐段合同，再改本页。
