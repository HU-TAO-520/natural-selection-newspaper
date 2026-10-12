# Task 5 验收报告 — 完成新闻消息页

验收时间：2026-09-19 · 唯一交付物变更：`Results/news-message.html`

## 1. 验收手段

| 脚本 | 作用 | 结果 |
| --- | --- | --- |
| `_qa_task5/build.py` | 从 `plan/Task5-完成新闻消息页.md` 的权威合同逐字符生成 `#main-content` 片段并替换进页面，避免人工转录 | 已执行；正文文本全部来自计划文件 |
| `_qa_task5/verify.py` | 155 条静态 + DOM 断言（文件级、合同一致性、公共壳回归、DOM 数量与顺序、逐字符文本、电头边界、高风险字符串、可见内容白名单、禁止项、变更边界） | **155 / 155 PASS**，详见 `report.txt` |
| `_qa_task5/mutate.py` | 32 个违约变异体，验证 `verify.py` 不是空跑 | 对照组 PASS；**32 / 32 全部以真实 FAIL 记录被捕获**，0 漏检、0 崩溃，详见 `mutation_log.txt` |
| `_qa_task5/run_browser.py` + `probe.html` | 无头 Chrome 通过同域 iframe 真实布局视口在浏览器 DOM 中复核（`document.querySelectorAll` 的 `textContent`、`innerText` 阅读顺序、`strong.nextSibling` 字符码、禁用 CSS / 禁用 JS、1024 / 1280 / 768 / 640 / 375 溢出） | **145 / 145 PASS**（7 组 × 20–23 条），详见 `browser_report.txt` |
| `_qa_task5/negative_control.py` | 对 8 个浏览器级变异体跑同一套探针，证明浏览器断言同样不是空跑 | 8 / 8 被捕获，0 漏检，详见 `negative_control.txt` |
| `_qa_task5/shots/*.png` | 1024 / 1280 / 768 真实渲染截图 | 目视确认：类型行、标题、署名、加粗电头、4 段正文、当前导航下划线均正确 |

## 2. 关键结论

- 源文件门禁：`Materials/新闻消息.docx` SHA-256 = `DE10B575…F6FC`，与 Task 1 冻结值全等。
- 逐字符：`.article__type` / `h1.page-title` / `.article__byline` 与 M01–M04 的 `textContent` 在 Python DOM 与真实浏览器 DOM 中均与合同严格相等（未 `trim()`、未归一化）。
- 电头边界：`strong.dateline` 为首个正文段落的第一个子节点，13 个字符，`</strong>` 后是文本节点，`charCodeAt(0) === 0x20`、`charCodeAt(1) === 0x6211`（“我”），无第二个连续空格，无 `&nbsp;`、无 `<br>`。
- 结构：`main > article.article > (header.article__header > p+h1+p) + (div.article__body > p×4)`；全页 1 个 `<main>`、1 个 `<h1>`、1 个 `aria-current="page"`；`.article__date` / `<time>` / `<blockquote>` / 正文 `<h2>` / 列表 / 图片 / 正文链接 / `role` / 注释 / 内联样式与脚本均为 0。
- 变更边界：`index.html`、`news-feature.html`、`news-commentary.html`、`styles.css` 的 SHA-256 与实施前快照逐一相等；`Results/` 仍是 5 个约定文件，未新增测试脚本、JSON、截图或 README。
- 禁止项：`Results/` 全目录中 `厨一枚`、`胡桃`、`2026`、`作者：`、`记者：`、`文／`、`M01`–`M04`、`.docx`、`SHA-256`、`TODO/TBD/Lorem ipsum`、外部 URL、`url(`、`<img` 的命中数均为 0。
- Task 2 公共壳回归：`lang`/`no-js`/UTF-8/viewport、`<title>` 全角 `｜`、`styles.css` 与带 `defer` 的 `script.js` 各一次、跳至正文为 body 首个可聚焦元素、报头链接 `index.html`、`#nav-toggle` 的 `aria-controls`/`aria-expanded=false`、导航源码无 `hidden`/`aria-hidden`/`is-open`、四项文字与 `href` 顺序、`#main-content` 的 ID/class/`tabindex="-1"`、无重复 ID —— 全部通过。

## 3. 完成定义

- [x] `Materials/新闻消息.docx` 的 SHA-256 与 Task 1 冻结值一致
- [x] 本任务只修改了 `Results/news-message.html`，没有触碰其他正式文件或素材
- [x] 消息页 `<title>`、公共壳、共享资源引用和导航仍符合 Task 2
- [x] 页面全局只有一个 `<main>`、一个 `<h1>` 和一个 `aria-current="page"`
- [x] 当前导航项仍是“新闻消息”，其链接仍为 `news-message.html`
- [x] `#main-content` 中恰好有一个 `.article`，文章头部与正文容器顺序正确
- [x] 页面类型逐字符等于“新闻消息”
- [x] 标题逐字符等于“我校启动校本课程志愿填报”
- [x] 公开署名只显示“蓝色空间”，没有前缀或附加作者信息
- [x] `.article__body` 恰好有 4 个直接正文 `<p>`，依次对应 M01–M04
- [x] 4 个段落的原始 `textContent` 与 Task 1 权威合同逐项严格相等
- [x] M01 开头只有一个 `strong.dateline`，其后恰好一个 U+0020 半角空格
- [x] `今日7时`、`47个社团`、中文顿号和中文分号等高风险内容均原样保留
- [x] 页面没有独立日期段、推断年份、额外作者、摘要、小标题、链接、图片或引用资料
- [x] 正式目录中不存在 Word 元数据作者、文件时间、内部段落编号或开发占位符
- [x] 禁用 CSS 或 JavaScript 时，文章及导航仍完整、按顺序可读
- [x] Task 10 获得固定 DOM 数量、顺序、M01–M04 数组和电头边界规则

## 4. 交给 Task 8 / 10 / 11 的基线

- 选择器：`.article`、`.article__header`、`.article__type`、`h1.page-title`、`.article__byline`、`.article__body`、`.article__body > p`、`strong.dateline`。
- 数量：1 / 1 / 1 / 1 / 1 / 1 / 4 / 1；`.article__body` 的直接元素子节点恰为 4 个无 class 的 `<p>`。
- 数组：M01–M04 逐字符见 `plan/Task5-完成新闻消息页.md`「权威文本合同」；比较前禁止 `trim()`、`\s+` 归一化、Unicode 标准化与标点替换。
- 电头规则：`strong.dateline` 是首段第一个子节点；其后同级文本节点 `charCodeAt(0)===0x20 && charCodeAt(1)!==0x20`；`strong` 内无尾随空格；M01 保持单行源码。
- Task 10 禁止项搜索只针对 `Results/`。

## 5. 已知非 Task 5 问题（不阻塞，勿在本任务修复）

1. `Results/script.js` 尚不存在（Task 9 未执行）。页面仍引用它，浏览器会记录一条 404；Task 5 按计划不得创建空文件规避，文章内容与导航降级不依赖该脚本，已用 `sandbox="allow-same-origin"`（禁用 JS）探针确认完整可读。
2. 375px 下的间距与换行由 Task 8 追加（`styles.css` 首行注释已声明）。本次浏览器探针在真实 375 布局视口下测得 `scrollWidth === clientWidth`，Task 5 正文未引入横向溢出。
3. 截图复核注意：无头 Chrome 的 `--window-size=375` 实际顶层 `innerWidth` 为 500（最小窗口宽度），因此 `shots/mobile375_375.png` 是 500px 布局的左裁剪，不能用来判断移动端溢出；移动端判断一律以 iframe 真实布局视口的测量为准（`_qa_task5/measure.html` 可复现）。
