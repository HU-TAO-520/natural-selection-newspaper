# Task 6 验收报告 — 新闻通讯页 `Results/news-feature.html`

验收时间：2026-09-19 ｜ 唯一改动文件：`Results/news-feature.html`（1803 → 6962 字节）

## 1. 结论

**Task 6 通过验收。** 静态/DOM 核验 202 项全通过，真实浏览器核验 189 项（5 种场景）全通过，
62 个变异全部被捕获且对照组零误报。

| 层次 | 脚本 | 结果 |
| --- | --- | --- |
| 源文件独立重提取 + 三方比对 | `_qa_task6/extract.py` | 84 项，0 失败 |
| 页面结构 / 字符 / 禁止项 | `_qa_task6/verify.py` | 202 项，0 失败 |
| 变异捕获率 | `_qa_task6/mutate.py` | 62/62 捕获，对照组 rc=0 |
| 真实浏览器（无头 Chrome + 同域 iframe） | `_qa_task6/run_browser.py` | 189 项，0 失败 |
| 独立复核（不用 bs4，纯 regex 另一条代码路径） | `_qa_task6/final_check.py` | 18 项，0 失败 |
| Task 5 回归 | `_qa_task5/verify.py` | 154/155；唯一 FAIL 是"news-feature.html 未被改动"，正是本任务的合法改动 |

`final_check.py` 另外确认了跨页一致性：本页 `header.site-header` 块与导航 `<ul>`（去掉 `aria-current` 后）与
`news-message.html` 逐字节相同，`aria-current="page"` 精确落在 `href="news-feature.html">新闻通讯`。
`Results/news-feature.html` 最终 SHA-256 = `73ff75678c453badbc1edcb1ff590001dc93cade3260ff364e042d02075df9a5`（6962 字节）。

## 2. 版本门禁

- `Materials/新闻通讯.docx` SHA-256 = `0C5B3525…F894A4`，与 Task 1 冻结值逐字符相等。
- 三份素材（新闻消息/新闻通讯/新闻评价）哈希与修改时间均未变；`Materials/` 未被写入。
- 独立重提取：Word 26 个 `w:p` 节点，P01 标题、P02 署名、P03–P25 正文、P26 无可见字符；
  3 个 `lastRenderedPageBreak`；无 `w:br`、无 `w:tab`、无表格/图片/链接/域/修订。
- **三方逐字符全等**：docx 实测 ↔ Task 1 合同 ↔ Task 6 计划副本，标题、署名、`F01`–`F23` 共 25 条全部相等，两份合同无分叉。

## 3. 变更边界

- `build.py` 只替换 `<main>…</main>`；写入前断言 `<main>` 之外的公共壳字节全等
  （前后 SHA-256 前缀同为 `2f9e7be4fba33ffc`）。
- 写入前快照 `_qa_task6/before.html` = `5afe7d1b…fe275`，与 Task 5 验收时记录的
  `news-feature.html` 基线一致 → 证明 Task 2 之后、本任务之前该页无人改动。
- `index.html` `73f49fd8…`、`news-message.html` `66ae5826…`、`news-commentary.html` `cdc13a40…`、
  `styles.css` `30d74661…` 四个哈希与实施前完全一致。
- `Results/` 仍是 5 个约定文件，未新增测试脚本、JSON、截图或 README；QA 产物全部在 `_qa_task6/`。

## 4. 完成定义逐项

- [x] SHA-256 与 Task 1 冻结值一致
- [x] 只修改 `Results/news-feature.html`
- [x] Task 2 的 `<head>`、公共壳、四项导航、相对路径、唯一 `aria-current="page"` 正确
- [x] 页面类型精确为"新闻通讯"，标题精确为"从数学题到AI时代的学习"
- [x] 署名只显示"蓝色空间"，无前缀
- [x] 全页一个 `<main>`、一个 `<article>`、一个 `<h1>`
- [x] 使用共享 `.article*` 接口，无 `.feature-*`、无内联 `style`、无页面内 `<style>`
- [x] `.article__body` 恰好 23 个直接 `<p>`，无空尾段
- [x] F01 电头用 `strong.dateline`，其后恰好一个 U+0020（浏览器实测为文本节点首字符 0x20、次字符"上"）
- [x] `F01`–`F23` 顺序、边界、`textContent` 与 Task 1 逐项相等（未 trim / 未折叠空白）
- [x] "她／他"、中文引号、内层单引号、`——`、问号、冒号、`AI` 大小写均未改动
- [x] 无小标题、引用块、日期段、链接、脚注、图片或新增资料
- [x] 无 Word 元数据、推断年份、内部编号、占位说明、空段
- [x] 禁用 CSS / 禁用 JavaScript 时全文顺序完整可读（浏览器实测）
- [x] 已向 Task 10 交付核验基线（见第 6 节）

## 5. 高风险字符实测计数

23 段合并 `textContent`：`AI` 19 次（`ai`/`Ai`/`aI` 各 0），连同标题共 20 次；
中文左/右双引号各 8、左/右单引号各 2；U+2014 共 2 且唯一相邻成 `——`；
全角问号 1、全角冒号 2、中文分号 3；U+0020 共 1；无 U+00A0、无零宽字符、无 `<br>`。
人称分布：F02 他认为 / F05 在她看来 / F10 仍由他自己完成 / F12 不过，他并不赞成 / F20 他举了一个简单的例子，全页"她"仅 1 次。

## 6. Task 10 交接基线

- 期望数组：`_qa_task6/docx_extraction.json` 与 `_qa_task6/expected_feature_paragraphs.json`
  （均直接来自 Task 1 合同，非页面反向生成）。
- DOM 数量：`main` 1、`article` 1、`h1` 1、`.article` 直接子元素 2、`.article__header` 子元素 3、
  `.article__body > p` 23、全页 `<p>` 26（含报头 `site-masthead`）、`<footer>` 0、`<aside>` 0、`<nav>` 1。
- 禁止项命中数（当前均为 0）：`厨一枚`、`胡桃`、`2026`、`2025`、`新闻评价`、`.docx`、`F01`…`F23` 编号、
  `[F24 的完整文本]`、`TODO/TBD`、HTML 注释、`data-*`、`<style>`、内联 `style`、外部 URL、`fetch`、`<time>`、`<img>`。
- 可复用命令：`python _qa_task6/verify.py`（支持 `QA_RESULTS=<目录>` 指向变异副本）、
  `python _qa_task6/mutate.py`、`python _qa_task6/run_browser.py`。

## 7. 遗留与边界说明

- `Results/script.js` 仍不存在 —— 属 Task 9 交付物，本任务不得创建；页面已按 Task 2 引用它并保留 `defer`，
  缺失时浏览器静默忽略，不影响正文可读性（禁 JS 场景已实测）。
- 移动端 375 / 768 / 769px 断点属 Task 8；本任务只在 1280 / 1024 / 640px 确认无横向溢出。
- 全站浏览器回归与焦点顺序、200% 缩放终检属 Task 11。
