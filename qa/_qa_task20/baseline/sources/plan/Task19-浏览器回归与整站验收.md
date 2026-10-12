# Task 19 浏览器回归与整站验收

## 后续有效合同补充 R13（2026-10-04）

错误页单独通过本地 HTTP fixture 与真实浏览器验收；其响应必须是 HTTP 404 并保留请求 URL。测试未知单层、嵌套、尾斜杠、更深层、带查询参数和不存在文章路径。确认根路径 CSS/JS 状态与 MIME 正确、页面样式生效、脚本运行、桌面与移动布局、菜单交互、四项导航、首页入口和跳至正文都可用；禁用 JavaScript 时仍显示提示、导航和首页入口。错误页不得回显请求路径。普通 10 个 HTML 页面原有 `file://` 验收不变。`/_headers` 等部署配置路径在线上应返回错误页与 HTTP 404，正文不得泄漏配置内容。

新增本地负向对照：部署包删掉 `404.html` 必须被包/清单核验发现，错误页将 `/styles.css` 或 `/script.js` 错改为相对地址必须被结构与浏览器请求检查发现。当前三个核对数字：交付文件 `7 + N`（13）、zip 条目 `8 + N`（14）、HTML 页面 `5 + N`（11），N=6。线上未上传前，本包报告状态仍为“线上未复验”；上传后的真实 Pages 检查单独进行。

## 任务定位

本文件把归档总方案中的 Task 19 细化为一个可独立执行、独立验收的工作包，也是本轮的**最后一份工作包合同**。Task 19 在真实浏览器里对归档层做全站回归：接管 `qa/_qa_task11` 的 R-A…R-J 十组语义并把遍历对象从四页扩到七张 HTML 页，另加**四组**只有归档层才存在的判据——R-K（列表↔详情的真实导航链与**渲染出来的**条目顺序）、R-L（列表容量压力下的几何）、R-N（已访问态的像素配色）、R-O（发布之后的线上一致性）。

本包与 Task 18 的分工必须先划清，否则两边会互相重复并且互相掩盖：

| 关注点 | 归属 | 判据形态 |
| --- | --- | --- |
| 文件集合、清单一致性、字节级保真、静态结构、禁止项、链接图（静态解析） | **Task 18** | 只读快照 + 哈希 + 解析 |
| 渲染结果、几何尺寸、真实点击、焦点与键盘、菜单三态、降级表现、像素配色、跨断点事件、线上行为 | **Task 19** | CDP 驱动真实浏览器 |

一句话：**Task 18 看"文件和字节对不对"，Task 19 看"打开来对不对"**。典型例子是条目顺序——manifest 与源码里的顺序正确，并不等于屏幕上正确：一条 `flex-direction: column-reverse` 或 `order` 属性能在源码不动的情况下把视觉顺序整个反过来。这类缺陷只有真实布局能暴露，因此本包必须按 bounding box 判视觉次序，而不是再读一遍 HTML。

本包只读：不修改 `Results/`、`content/`、`build/`、`deploy/`、`plan/`、`Materials/` 任何文件，也不修改 `qa/_qa_task13`…`qa/_qa_task18` 的历史产物。发现缺陷一律回流对应上游包，修复后**先重跑 Task 18，再重跑本包**。

## 目标

- 把 `qa/_qa_task11` 的 R-A…R-J 十组回归语义**一条不丢地**重锚到归档结构：遍历对象从四页改为 `manifest.pages` 的 HTML 子集（7 张），期望值从写死改为清单／合同解析，禁止任何一条以"结构变了"为由删除或放宽。
- 交付四个只有归档层才需要的组：R-K（真实导航链与**渲染出来的**条目次序）、R-L（列表容量压力下的几何）、R-N（`visited` 与 `visited-pixel` 两条像素配色链）、R-O（发布与线上一致）。
- 落实 `Task12 R1` 的正向要求：任一页面在**禁 JS**与**禁 CSS**两种降级下仍按正确顺序完整可读、链接仍可点、全站网络请求数为 0。
- 证明回归器自己有牙：至少十例变异全部被指定判据捕获，且 `column-reverse` 一例必须红——它红不了就说明 K2 退化成了读源码顺序，本包与 Task 18 的分工随之塌陷。
- 给出可被第三方复核的整站签署结论：`report.md` + `results.json` + `shots/` + 两个 SELF-SHA；结论必须区分"通过／真回归／结构性失效／SKIPPED-BY-DESIGN"四态，且 `PENDING` 恒为 0。
- 为日常回归留下一条命令的常态（放 md → 跑构建 → 跑打包 → 跑回归），并把"三个数字不得混用"（交付文件 `6 + N`、zip 条目 `7 + N`、HTML 页面 `4 + N`）钉进线上复验步骤。

## 前置条件与后续依赖

- 闸门前置条件：**Task 18 全绿**（≥ 340 条断言、PENDING = 0、变异捕获率 100%、`expected_reversals.md` 闭合）。Task 18 未通过时本包不开跑——静态结构没锁定就跑浏览器，等于对着一堵没干透的墙刷漆。
- 输入前置条件：`Results/` 九文件、`content/` 五文件、`build/` 三文件、`deploy/manifest.json`、`deploy/site.zip`、`deploy/UPLOAD.md` 齐备且哈希与 Task 15／16／17 记录一致；`qa/_qa_task18/facts.json` 带 `__meta` 且与目录哈希绑定。
- 发布前置条件：`deploy/site.zip` 由**用户手工上传**到 Cloudflare Pages 项目 `old-ns-news`；本包不代为实现上传，只在上传后做线上复验。
- 直接依赖本包的工作：无（本轮终点）。本包通过后，归档层签署完成，交付物进入"加文章只需放 md + 跑一条构建 + 跑一条回归"的常态。
- 阻断规则一：任一 `file://` 断言失败时，**不得先怀疑浏览器**，也不得以"线上肯定没问题"跳过；离线路径是本站的一等公民（`Task0 §离线约束`）。
- 阻断规则二：若某条 v1 的 R 组断言在新结构下无法成立（不是被破坏，而是判据本身已被结构变更取代），必须登记为"结构性失效"并写明接管者，**禁止删除或放宽**。
- 阻断规则三：本包不得为了让回归通过而修改被验对象或修改 Task 18 的断言；这是第一版两条铁律的延续（"不得为了让断言通过而放宽合同、改真值或修改交付文件"）。
- 阻断规则四：本包的 **`PENDING` 恒为 0**——一条断言也不许挂着不跑。用户尚未上传时，线上复验一节记 **`SKIPPED-BY-DESIGN`**（"按设计跳过"态：它计入选跑数、不计入通过数，与 PENDING 不同名也不同义，不得互相顶替），**不得**用它宣称本包完成；完成定义要求该节要么通过、要么由用户明确决定"本轮不做线上复验"并留字。

## 交付物与文件所有权

Task 19 执行时**新建**（全部在 `Results/` 与 `deploy/` 之外）：

- `qa/_qa_task19/cdp_regression19.mjs`（回归驱动，继承 `qa/_qa_task11/cdp_regression.mjs` 的分段与环境变量设计）
- `qa/_qa_task19/probe_page19.mjs`、`qa/_qa_task19/measure19.html`（同域 iframe 视口探针，专测窄视口几何）
- `qa/_qa_task19/shot19.html`（同步固定宽度截图页，`<title>ready:{clientWidth}:{state}</title>` 回读真实视口）
- `qa/_qa_task19/png19.mjs`（PNG 解码采样，配色像素判定）
- `qa/_qa_task19/zoom_probe19.mjs`（200% 缩放两效分离）
- `qa/_qa_task19/mutate_task19.mjs` + `mutation_log19.md`（回归器自身有效性）
- `qa/_qa_task19/mutants/`（**副本目录**：§回归器有效性 的十例注入与 R-L 的 30 条假文章列表页都在这里做，真实 `Results/` 一个字节不动；跑完保留以供第三方复核，不得只在内存或临时目录里跑掉）
- `qa/_qa_task19/shots/`、`qa/_qa_task19/results.json`、`qa/_qa_task19/regression_lines.txt`
- `qa/_qa_task19/online_check.mjs`（线上复验，真实标签页／无头，不用 iframe）
- `qa/_qa_task19/report.md`（分组结论、翻转登记、只读证明、签署结论）

Task 19 **不创建、不修改、不删除**：任何被验对象与历史 `_qa_taskNN/` 产物。

## 输入与权威顺序

1. `deploy/manifest.json` —— 页遍历清单（HTML 子集 = `counts.html`，当前 7）、栏目→文章映射、条目次序真值。
2. `plan/Task12` 的扩展矩阵与 R3／R4 —— 每页 `<title>`、`<h1>`、`aria-current` 归属、首页最新区固定顺序。
3. `plan/Task1` 与 `plan/Task4` —— 浏览器里可见文本的最终真值（逐段 `textContent` 码点级比较）。
4. `qa/_qa_task18/report.md` 与 `expected_reversals.md` —— 前置闸门结论与"哪些红是范围过期"。
5. `qa/_qa_task13/extracted_baseline.json` —— 三篇详情页的浏览器文本基线。
6. `plan/Task0 §断点与状态合同` 与 `§离线约束` —— 三态表、768／769 互补、零网络依赖。
7. `qa/_qa_task11/report.md` 与 `cdp_regression.mjs` —— 十组回归判据的**原始语义**母本。
8. `deploy/UPLOAD.md` —— 线上复验要核对的三个数字（`6 + N`／`7 + N`／`4 + N`）。

冲突时以更高优先级为准并回流，不在驱动里兼容两版。

## 结构或数据基线

本包一切判据的落点（2026-10-01 实测；期望值一律从 `deploy/manifest.json`、`plan/Task12` 与 `qa/_qa_task13/extracted_baseline.json` 解析，**不得写死在驱动里**）：

| 项 | 基线值 | 归属组 |
| --- | --- | --- |
| 遍历页集合 | `manifest.pages` 的 HTML 子集 = **10 张**（首页＋三栏目页＋六详情页，2026-10-03 后 N=6），顺序按 `path` 字典序；`styles.css`／`script.js` 不是页。本表与下文的"七页／7 张"是 R12 前的口径，一律读作"全部 HTML 页"，实跑值由清单推导 | 全部 |
| 断言总数 | v1 **819**（R-A…R-J 十组 817 + 2 条只读检查）→ 本包 **≥ 1400**，`PENDING` = **0** | 全组 |
| 主导航路径 | **40** 条（10 页 × 4 链接；R12 前为 28 条，N=5 时为 36 条），四页时代的 16 条与七页时代的 28 条继续全部成立（是子集，不是替换） | R-A、R-K |
| 视口档位 | 桌面 769／1024／1280，移动 375／768，200% 缩放复现档 640（= 1280÷2 的布局宽 + `deviceScaleFactor: 2` 的绘制） | R-B／C／H |
| 触控目标 | 列表链接与最新区链接的实测渲染盒 ≥ **44×44 CSS px**（量 `getBoundingClientRect()`） | R-D |
| 配色取样 | ink `rgb(33,31,28)`、accent `rgb(122,36,36)`、paper `rgb(245,239,228)`；判定用截图像素簇，**不用** `getComputedStyle().color` | R-N |
| visited 异步窗口 | 真实访问后 0–4 s 翻色，须轮询采样，不得单次判定 | R-N |
| 内容码点 | 迁移三篇段落 **4／23／29**（评论页另有 `p.article__date`）、`strong.dateline` 后恰好一个 U+0020，浏览器所见逐段等于 `qa/_qa_task13/extracted_baseline.json`；R12 后另两篇新稿 **4／5** 段，权威文本是各自的 md（`content/articles/<slug>.md` 独立再解析），末尾日期行由 `end_date` 驱动 | R-J |
| 首页最新区 | 恒 3 条，每条 = 一个 `a.home-latest__link` 包两个 `span`（标题 + 月日），带日期节点（R9） | R-K |
| 条目次序 | `manifest.columns[*].articles` 次序 = 屏幕 bounding box 次序 = 列表页 DOM 次序，三者两两相等；排序键为 R11 四键：`date` 降序 → `order` 升序 → `column` 注册表序 → `slug` 升序 | R-K |
| 三个核对数字 | 交付文件 `6 + N`（12）、zip 文件条目 `7 + N`（13，含 `_headers`）、HTML 页面 `4 + N`（10），分开核对、互不顶替（2026-10-03 按 R11⑤ 换值：N 由 5 增至 6；R12 时为 N=5 的 11／12／9） | R-O |
| 线上参照 | `https://old-ns-news.pages.dev/`；`frame-ancestors 'none'` 使线上**不能**用同域 iframe 量视口，故 R-O 一律真实标签页／无头 | R-O |
| 只读证明 | 开工与完工各一次，五处目录（`Results/`／`content/`／`build/`／`deploy/`／`Materials/`）哈希逐项相等，含 `index.html` = 2629 字节 `971e57a5…` | 19.1／19.10 |

铁律在本包只有一处体现方式：**判据只许加严，不许因为浏览器不配合就放宽**（例如把 44px 改成"声明值达标即可"、把像素采样改成计算样式、把视觉次序改成源码次序，都算放宽）。

## 断言体系

预计 **≥ 1400 条**（v1 为 819：其中 R-A…R-J 十组 817 条 + 2 条只读检查；页集合从 4 扩到 7，逐页类组按 1.75 倍自然增长，**再加四个新组 R-K／R-L／R-N／R-O**），`PENDING` 必须为 **0**（等待外部动作的态叫 `SKIPPED-BY-DESIGN`，不叫 PENDING，见阻断规则四）。

### 继承并扩容（页集合改为 manifest HTML 子集）

| 组 | v1 条数 | 归档层的扩展要求 |
| --- | --- | --- |
| R-A 加载与资源 | 51 | 七页各自 `file://` 加载、资源 0 个 404、**外部网络请求数为 0**、28 条主导航路径在浏览器中全部可达。**本地一律按"文件名必须带 `.html` 后缀"判**：站内每个 `href` 都写全名，`file://` 下没有目录默认页、也没有 URL 重写，去后缀形态在本地**必然**打不开——若出现无后缀链接即为缺陷。"去后缀也能直达"是 Cloudflare Pages 的 308 行为，只在 **R-O** 里测，不得写进本组 |
| R-B 桌面视觉 | 275 | 769／1024／1280 下新增：列表页版心等于 `--reading-max`、条目细线连续且末条有下界线、日期右缘与标题左缘对齐、标题折行数用 `Range.getClientRects().length` 判；首页最新区与引言区的视觉层级不粘连 |
| R-C 移动视觉 | 138 | 375／768 下新增：条目堆叠（标题在上、日期在下）、`overflow-wrap: anywhere` 生效、长标题不撑出横向滚动、日期 `white-space: nowrap` 不被挤断 |
| R-D 点击区与焦点 | 40 | 全部**列表链接与最新区链接**的实际渲染盒 ≥44×44 CSS px（量 `getBoundingClientRect()`，不读声明）；焦点轮廓不被 `overflow` 裁切；关闭态菜单内链接用 `offsetParent === null` 判"真正退出 Tab 顺序" |
| R-E 菜单三态 | 104 | 七页 × 三态；列表页在条目较多时展开菜单不遮挡末条目的可点性 |
| R-F 交互行为 | 60 | 点击／Enter／Space 不双触发（按钮上加 `click` 计数器，断言 `Δclicks === 1` 且 `is-open` 与 `aria-expanded` 同步）；Esc + 焦点归还；点列表链接后菜单自动关闭；合成键相位（Enter 在 keydown 激活、Space 在 keyup 激活，两者之间留 ~80ms） |
| R-G 跨断点重置 | 36 | 768→769→768 往复序列；**必须用 CDP `Emulation.setDeviceMetricsOverride`**（`--dump-dom` 无头模式不派发媒体查询 `change` 事件，v1 已实测） |
| R-H 200% 缩放 | 44 | 七页；CDP 的 `zoom` 参数在本机 Chrome 是 no-op，必须拆两效复现：布局 = CSS 视口 1280÷2 = 640，绘制 = `deviceScaleFactor: 2`，并以 `rect.width * dpr` 佐证 |
| R-I 降级回归 | 37 | 七页：禁 JS 用 `Emulation.setScriptExecutionDisabled`（比 iframe `sandbox` 更真），列表页与详情页在**无脚本**下仍完整可读且链接可点；禁 CSS 后阅读顺序正确、`no-js` 导航常显；恢复后回到基线 |
| R-J 内容运行时一致性 | 32 | 七页浏览器所见逐段 `textContent` 码点等于 `qa/_qa_task13/extracted_baseline.json` 与 `Task1`；无运行时注入、无 `console` 输出、无未捕获异常 |

### 新增组（只有归档层才有的判据）

| 组 | 内容 |
| --- | --- |
| **R-K 导航链与渲染次序**（新） | K1 真实点击链路：首页最新区→详情页、栏目页→详情页、详情页→所属栏目页，每跳用 `Page.frameNavigated` 计数证明**真的导航了**（点当前页链接时路径不变，故不得用 path 差异判）；K2 **视觉次序**：列表页各条目按 bounding box 的 `y`（同一 `x` 带内）排序后的标题序列，必须逐等于 `manifest.columns[*].articles` 顺序——源码顺序正确而屏幕顺序颠倒也判 FAIL；K3 首页最新区三条 = 三张列表页各自的第一条（标题与 href 双一致），**且三者的排列逐等于 `manifest.columns` 的栏目序**——本包**不写死"消息→通讯→评论"这类固定栏目序列**：最新区按全序键取条目，而全序的第一键 `date` 尚未由用户提供，写死序列等于把未定的排序键当成合同，用户补日期后它就以"回归失败"的形式假报警。排序全序为 **`date` 降序 → `order` 升序 → `slug` 升序**，本包只断言"渲染次序 == `manifest.columns` 次序"，具体序列随 `date` 落定而变而判据不变；K4 详情页的当前项高亮出现在**所属栏目**链接上，且其配色与未访问态一致（配合 R-N 的像素判据）；K5 详情页 `<h1>` 与浏览器标签页标题主体逐字符一致，`｜自然选择号` 只出现在标签页 |
| **R-L 列表容量压力**（新） | 在 `qa/_qa_task19/mutants/` 的**副本目录**里生成 30 条假文章的列表页（真实 `Results/` 一个字节不动），复测：无横向溢出、条目堆叠仍正确、触控高度仍 ≥44、菜单展开不遮末条、页面无重叠像素错位。定性：**几何类判据入闸门**（溢出／触控／遮挡 FAIL 即本包不通过），**观感类记录为 informative** 并附截图。跑完必须单独重跑真实交付页并在开头清空 `shots/`（v1 教训：变异副本相对 `styles.css` 解析不到会被误读为"样式没生效"） |
| **R-N visited 配色像素回归**（新，独立成组） | **接收 v1 的 `visited` 与 `visited-pixel` 两段 pass，两段都落到本组**（丢掉 `visited` 那半组会让已访问态的计算样式与时序判据静默消失）。v1 的真实缺陷面：`getComputedStyle().color` 对已访问链接按隐私规则返回"未访问"色，且 visited 样式异步解析（加载后 0–4s 常仍是基线色）。因此本组**只用截图采样判定**：先真实访问过目标链接，再 `Page.captureScreenshot` + PNG 解码，取与纸色距离最大的前 2% 像素聚类，比较四处链接（报头、主导航、`entry-list__link`、`home-latest__link`）在已访问态下是否仍为墨色系而非浏览器默认紫。这条与 Task 18 的 H13 静态配对互为两条独立链：静态写了 `:visited` 不代表生效，生效了不代表每处都写了 |
| **R-O 发布与线上一致**（新） | 用户上传后执行，全程真实标签页或无头浏览器（`_headers` 的 `frame-ancestors 'none'` 使线上**不能**再用同域 iframe 量视口）：O1 Pages 后台 HTML 页面数 = `4 + N`（9，R12 后）、站点可访问；O2 `/news-message.html` → `/news-message` 的 308 不破坏相对引用（跳后 `styles.css`／`script.js` 仍 200 且渲染一致）；O3 `/article-<slug>.html` 与去后缀形态都能打开且样式脚本同版本；O4 安全头实测生效：`_headers` 不可下载（返回首页 HTML）、`X-Frame-Options: DENY`、HSTS、`nosniff`；O5 **首页第三条已是 R7 修订后的文本**（含"鸽子衔枝之年"，不含任何四位数字），即那条未发布的文本变更随本轮一并上线；O6 全站 0 个 404、0 条控制台错误、无混合内容；O7 三个数字分开核对，不得混用"页"与"文件"。缓存与传播延迟：可用带查询串的测试 URL 绕开边缘缓存，但**站内链接本身不得带查询参数**（那是 `Task0` 的约束，不是被测对象的问题） |

### 回归器自身的有效性（必做，不是可选）

核验器全绿只证明交付物没坏，不证明回归器有牙——这是 `qa/_qa_task10` 的结论，本包同样适用。`mutate_task19.mjs` 至少注入并捕获：

1. 给 `.entry-list` 加 `flex-direction: column-reverse` → K2 视觉次序红（证明本包真在看屏幕而非看源码）。
2. 把列表页 `aria-current` 移到详情页自身 → K4 红。
3. 首页最新区第二条的 `href` 改成别栏文章 → K3 红。
4. 删除 `.home-latest__link:visited` → R-N 像素红（静态面由 H13 抓，两链都要红）。
5. `min-block-size: 44px` → 28px，**且同时把 padding 压到实测 <44** 才算有效变异（v1 真实教训：padding 撑过后渲染没变，会被误判成漏检）。
6. 在 `script.js` 副本里去掉 `matchMedia` 重置 → R-G 红。
7. 注入一个 `console.log` → R-J 红。
8. 注入一个外部图片 URL → R-A 网络计数红。
9. 把某段正文的 `。` 换成 `.` 的副本 → R-J 码点红。
10. 详情页 `<h1>` 改为含书名号 → K5 红。

每台变异带前置自证（"违约在渲染层确实成立"），无效变异单列，不计入捕获率。

## 子任务拆分

### Task 19.1 前置核对与遍历清单

输入：`qa/_qa_task18/report.md`、`deploy/manifest.json`、五处目录哈希。

执行：确认 Task 18 全绿且 0 PENDING；从 `manifest.pages` 取 HTML 子集生成遍历清单（不扫目录、不把 `styles.css`／`script.js` 当页）；登记开工时五处目录哈希；确认 `facts.json` 的 `__meta` 与目录绑定（复用 Task 18 的 M1 结论，不重造）。

完成条件：清单条数 == `counts.html`；前置为全绿而非"看起来绿"。

### Task 19.2 驱动改造与环境变量

输入：`qa/_qa_task11/cdp_regression.mjs`、`QODER_PASS`（v1 支持的段为 load／nav／desktop／mobile／tap／tri／interact／cross／zoom／degrade／content／**visited**／**visited-pixel**／visual／all）。**`visited` 与 `visited-pixel` 是两段不同的 pass**（母本 `:841`  dispatch `visitedPass()` + `visitedTimingPass()`，`:857` dispatch `visitedPixelPass()`），v1 两半都有断言，迁移时**两段都必须有下家**：两段一并归入 **R-N**——只迁 `visited-pixel` 会让 `visited` 那半组（含"已访问后仍为墨色"的计算样式与轮询时序判据）静默消失，而静默消失正是本包最不该重演的缺陷形态。

执行：页循环改清单驱动；新增 `list`（R-K）、`pressure`（R-L）、`online`（R-O）三段；保留 `QODER_TAG` 输出后缀以便单段重跑；**所有事件监听器包 `try/catch`**，`Network.loadingFailed` 的 params 没有 `request` 对象，必须 `requestId → url` 反查（v1 曾因 `params.request.url` 抛 TypeError 把整条链静默杀掉、报告根本不生成）；`send()` 加 30s 超时 + 全局看门狗（N 秒无新断言即落盘退出）；单个 Chrome 实例依次 `snapshot(dir)` 遍历副本，避免每例冷启动。

完成条件：`all` 与分段跑结果一致；故意抛错的探针不会让报告消失。

### Task 19.3 桌面与移动几何（R-A／R-B／R-C 扩容）

执行：七页 × 375／640／768／769／1024／1280；窄视口一律用同域 iframe（无头 Chrome 顶层窗口约 500px 下限，`--window-size=375` 实为 500px 左裁剪，会伪装成溢出）；溢出判据 `scrollWidth <= clientWidth`；折行数用 `Range.getClientRects().length`；探针内不用 `requestAnimationFrame`（`--virtual-time-budget` 下可能永不触发）。

完成条件：全部档位无横向溢出；列表与最新区在两端的几何判据成立；截图证据入 `shots/`。

### Task 19.4 触控、三态与交互（R-D／R-E／F／G）

执行：实测渲染盒高度；三态 × 七页；合成键与计数证明不双触发；跨断点用 `Emulation.setDeviceMetricsOverride`；`display:none` 子树后代判据用 `offsetParent`/`getClientRects`；`<button>` 上 `inline-flex` 的计算值接受 `flex`（Chrome 会 blockify 表单控件）。

完成条件：四条链全部通过；列表页链接触控高度实测 ≥44px。

### Task 19.5 缩放与降级（R-H／R-I）

执行：200% 两效分离；禁 JS 用 `setScriptExecutionDisabled`，禁 CSS 用父页对同域 iframe 置 `styleSheets[].disabled`；恢复后回到基线并复核哈希未变。

完成条件：七页在两种降级态下完整可读、可点；无 JS 时最新区与列表页仍可读（这是 `Task12 R1` 正向要求的真实验收）。

### Task 19.6 内容一致性与导航链（R-J／R-K）

执行：逐段码点比对基线；真实点击链与 `frameNavigated` 计数；bounding box 视觉次序；首页最新三条与列表首条一致性；详情页当前项归属与配色。

完成条件：R-K 五条全部成立；无运行时注入、控制台 0 错误。

### Task 19.7 列表容量压力（R-L）

输入：`qa/_qa_task19/mutants/` 副本目录。

执行：造 30 条假文章的列表页副本，跑几何判据；真实 `Results/` 一个字节不改（前后哈希证明）；跑完清空 `shots/` 并重跑真实页。

完成条件：几何类判据全过；观感截图入报告并标 informative。

### Task 19.8 visited 像素回归（R-N）

执行：本段接收 v1 的**两段** pass——`visited`（母本 `visitedPass()` + `visitedTimingPass()`）与 `visited-pixel`（母本 `visitedPixelPass()`），两者都归 R-N，迁移后两段各自的断言数都要与母本对得上；先真实访问，再截图采样；对 0–4s 异步翻色窗口做轮询而非单次判定；分类阈值沿用 `qa/_qa_task11/png.mjs` 的做法（与纸色距离最大的前 2% 像素求均值，按到 ink／accent 的距离定类）。

完成条件：四处链接在已访问态下同为墨色系；与 Task 18 的 H13 静态结论相互印证。

### Task 19.9 回归器有效性（变异对照）

输入：`mutate_task19.mjs`、§回归器自身的有效性 十例。

执行：逐例注入副本、跑驱动、要求指定判据红；前置自证不成立的记"无效变异"；变异跑期间**禁止编辑被测脚本与驱动**（读到半写入源码会得到"0 条断言"的假漏检）。

完成条件：捕获率 100%，未捕获清单为空。

### Task 19.10 线上复验与签署（R-O）

执行：等待用户上传 `deploy/site.zip`；上传后跑 O1–O7；`report.md` 给出归档层签署结论（Task 18 全绿 + 本包全绿 + 线上复验通过）；列出遗留项（例如三篇旧文 `date` 未提供导致的未分组排序、`display_date` 缺席时列表不显示日期）。**不得把执行记录写回 `plan/`**——该目录由 Task 12 管辖。

完成条件：三个数字分别核对且互不顶替；线上首页文本已是 R7 版本；结论可被第三方凭 `report.md` + `results.json` + `shots/` 复核。

## 验证方法

1. **两段一致性**：`QODER_PASS=all` 与逐段跑合并的断言集合相同（差集为空），证明分段不遗漏也不重复计。
2. **前置绑定**：M1 快照哈希绑定在开工与完工各查一次；页面若在回归期间被改动，本包结论立即作废。
3. **判据落点**：凡几何、配色、导航类判据，报告须写明测的是什么对象（bounding box／像素簇／事件计数），不接受"看起来正常"。
4. **只读证明**：五处目录哈希在 19.1 与 19.10 逐项相等；`Results/` 无新增文件。
5. **降级真实**：禁 JS 用 CDP 级手段而非仅 `noscript` 表象；两条链（禁 JS、禁 CSS）各留截图。
6. **有效性**：十类变异全捕获；其中第 1 例（`column-reverse`）必须红——它证明本包与 Task 18 不重叠，若这一例红不了，说明 K2 退化成源码顺序检查。
7. **线上独立**：R-O 不依赖本地任何结论，单独从公网地址取证；`frame-ancestors` 限制下不得使用 iframe 量视口。
8. **可复现**：任何人拿本包脚本 + `UPLOAD.md` 能对同一版本重跑出相同结论；`results.json` 逐条含页、视口、判据、期望、实际。

## 变更边界

### 必须完成

1. R-A…R-J 十组语义无损迁移，遍历改为 manifest HTML 子集（R12 后 9 张；一律由清单推导）。
2. R-K／R-L／R-N／R-O 四个新组实现并全绿。
3. 回归器自身有效性（≥ 10 例变异，100% 捕获）。
4. 只读证明与快照绑定两次核查。
5. 线上复验（若用户上传则跑完 O1–O7；否则按阻断规则四留字）。
6. `report.md` 给出分组计数表、缺陷归属、遗留项与签署结论。

### 明确不做

- 不修改 `Results/`、`content/`、`build/`、`deploy/`、`plan/`、`Materials/` 与任何历史 `_qa_taskNN/` 产物。
- 不重复 Task 18 的静态断言（文件集合、清单、字节保真、禁止项扫描、CSS 静态配对）；需要时用其结论并标注来源，不在两处各写一份实现。
- 不在真实 `Results/` 里造压力样本、不新增测试文章、不放探针页／截图／JSON 产物。
- 不代用户上传、不调 Cloudflare API、不改站点设置（Auto-Minify／Rocket Loader／Bot Fight Mode 保持关闭，口令保护保持现状）。
- 不引入第三方测试框架（无 Playwright／Puppeteer／jest），只用 Node 标准库 + CDP + 本机无头 Chrome；v1 的零依赖做法继续。
- 不用 `getComputedStyle` 判 visited、不用顶层窗口宽度判 375px、不用 `--dump-dom` 判媒体查询事件、不用源码顺序代替视觉顺序。
- 不放宽、不删除任何 v1 判据；结构性失效必须登记接管者。
- 不做性能／SEO／无障碍自动评分工具（本站不需要分数，需要具体判据）。
- 不为"以后文章更多"预留分页、懒加载或虚拟滚动的验证。

## 异常处理

- **Task 18 未全绿**：不开跑。浏览器回归在结构未锁定时产生的绿灯没有意义。
- **报告文件不生成**：先查监听器抛错与 `Network.loadingFailed` 的参数结构（v1 真实事故形态）；加看门狗与 try/catch 后重跑，不得误判为"0 条断言=全绿"。
- **某例变异未捕获**：先判前置自证是否成立；成立则真漏检，补判据；不成立则修台架，不改产品代码，也不改判据。
- **窄视口报溢出**：先确认是不是 500px 窗口下限造成的裁剪假象；只有同域 iframe 的 `scrollWidth/clientWidth` 可作判据。
- **跨断点判据"永不触发"**：确认是否用了 `--dump-dom`（不派发 `change`）；换 CDP 覆盖视口。改不动就登记为环境问题并移交，不改产品代码。
- **线上看到旧版首页**：先判边缘缓存与传播延迟，用带查询串的测试 URL 复核；若仍是旧版而 `UPLOAD.md` 显示条目数正确，判为上传不完整（v1 事故形态），中止并报告，不做"补救式重传"以外的推断。
- **线上样式与本地不一致**：优先查是否被 Pages 的 Auto-Minify 改写了 `script.js`／`styles.css`——合同要求该功能保持关闭；这属于站点设置偏离，不是代码缺陷。
- **`file://` 与线上行为分歧**：分歧点必须逐条登记（308 跳转、缓存、`frame-ancestors` 造成的探针方式差异），不得以"线上更好"为由跳过离线路径。
- **发现渲染层缺陷（错位、溢出、配色被覆盖）**：按归属回流 Task 16（样式）／15（结构）／14（装配），修复后先重跑 Task 18 再重跑本包相关段。
- **用户决定本轮不做线上复验**：在 `report.md` 把 R-O 一节记为 **`SKIPPED-BY-DESIGN`**（不是 PENDING——PENDING 恒为 0），其余结论仍成立，但归档层签署状态必须标注"线上未复验"，不得写成全部完成。

## 常见返工风险

- 把 K2 写成读源码顺序或读 DOM 顺序——那样 CSS 反序就检不出来，本包与 Task 18 的分工也塌了。
- 用 `getComputedStyle().color` 判已访问链接配色，四页七页全绿而实际是紫色。
- 用顶层 `--window-size=375` 判移动端溢出，把 500px 裁剪当成缺陷。
- 用 `--dump-dom` 判媒体查询重置，得到"永不触发"的假失败，进而误改产品代码。
- 信 CDP `zoom` 参数，200% 缩放其实一次都没测到。
- 触控目标读 CSS 声明就通过，忽略 padding／`display` 使其实际不足（或反过来，把 44px 改小时 padding 仍撑住，误判为漏检）。
- `display:none` 子树里的后代 `getComputedStyle().display` 仍返回自身值，被当成"仍可聚焦"。
- 事件监听器抛错静默杀掉整条链，报告不生成却被读成"全绿"。
- 变异跑期间编辑被测脚本，读到半写入源码得到"0 条 FAIL"。
- 压力测试的假文章或探针文件被留在 `Results/`（本包明令只能在 `qa/_qa_task19/mutants/` 副本里）。
- 用 `visited` 那半组判据当"重复"删掉，只留 `visited-pixel`：已访问态的计算样式与轮询时序从此无人守，四页七页全绿而实际是紫色。
- 把 R-O 的延后写成 PENDING：`PENDING` 恒为 0 是本包的硬底线，等待外部动作只有 `SKIPPED-BY-DESIGN` 这一个名字，混用之后"0 PENDING"就不再是任何证据。
- 把 K3 写成"消息→通讯→评论"的固定序列：`date` 一旦由用户补上，最新区的排列随之改变，固定序列会把正确的页面判成回归失败；写"等于 `manifest.columns` 次序"才与排序键无关。
- 与 Task 18 重复实现同一判据，两边阈值不同，最后谁也说不清以谁为准。
- 线上复验借用同域 iframe 量视口，被 `frame-ancestors 'none'` 挡住后误判为"站点坏了"。
- 把 `6 + N`／`7 + N`／`4 + N` 三个数字混用，用"页面数 9"这种说法核账（`Results/` 是 9 个**文件**、7 张 HTML 页）。
- 上传后只核对数量不看哈希，重演 v1"只传上 `styles.css` 就部署"的事故。

## 完成定义

Task 19 只有在以下条件全部满足时才算完成：

- [ ] Task 18 结论为全绿且 0 PENDING，其 `report.md` 与 `expected_reversals.md` 已读取入本包前置。
- [ ] 遍历清单等于 `manifest.pages` 的 HTML 子集（7 张），非目录扫描所得。
- [ ] R-A…R-J 十组全部通过，且无一条 v1 判据被删除或放宽（结构性失效者已登记接管者）。
- [ ] R-K 五条成立：真实导航链、**视觉次序**等于 manifest 次序、首页最新三条等于各栏目首条、详情页当前项归属正确、`<h1>` 与标签页标题关系正确。
- [ ] R-L 几何判据通过（30 条副本无溢出、无遮挡、触控达标），真实 `Results/` 哈希未变，观感截图标为 informative。
- [ ] R-N 四处链接在已访问态下像素同为墨色系；判定方法是截图采样而非 `getComputedStyle`；v1 的 `visited` 与 `visited-pixel` **两段 pass 都在本组有下家**，一条不丢。
- [ ] R-O 通过，或按阻断规则四记为 **`SKIPPED-BY-DESIGN`**（由用户书面决定延后，报告中留"线上未复验"字样）；无论哪种，`PENDING` 都为 0。
- [ ] 七页在禁 JS 与禁 CSS 两种降级下均完整可读、可点（`Task12 R1` 正向要求）。
- [ ] 全部外部网络请求数为 0；控制台 0 错误 0 未捕获异常；无 404、无混合内容。
- [ ] 断言总数 ≥ 1400，`PENDING` = 0；`results.json` 逐条含页、视口、判据、期望、实际。
- [ ] 十类变异全捕获，其中 `column-reverse` 一例必须红（证明 K2 看的是屏幕）。
- [ ] 分段跑与 `all` 跑的断言集合差为空。
- [ ] 五处目录哈希在开工与完工逐项相等；`Results/` 无新增文件、无探针产物。
- [ ] 未修改任何被验对象、未修改 `_headers`、未改站点设置、未代用户上传。
- [ ] `report.md` 给出签署结论与遗留项清单（三篇旧文 `date` 是否提供、`display_date` 缺席时的无日期显示）。

## 后续任务交接

- **给用户（日常回归清单）**：以后新增一篇文章只需四步——放一个 `content/articles/<slug>.md`；`python build/build.py --out Results`；`python build/pack.py`；跑一条 `QODER_PASS=all node qa/_qa_task19/cdp_regression19.mjs`。前两步改产物，后两步各自闸门；任何一步红就停在那一步，不要边改边传。
- **给用户（发布）**：上传入口与核对数字见 `deploy/UPLOAD.md`（交付文件 `6 + N`、zip 条目 `7 + N`、HTML 页面 `4 + N`）。上传完成后本轮才算闭环；未复验前，报告里的签署状态一律标"线上未复验"。
- **给未来合同变更**：若将来要加图片、分页、搜索或期次归档，一律先回 `plan/Task12` 立新的 R 条（同 R1–R7 的做法），说明它与 `Task0` 哪条冲突、修订后是哪份合同的哪一节，再动 `content/`、`build/`、`Results/`。本包的判据面（尤其 R-K2 视觉次序与 R-N 像素配色）应作为新结构加入时的最小回归集。
- **对历史产物**：`qa/_qa_task11/` 的 819 条回归与 `qa/_qa_task10/` 的 289 条静态核验保留不改，作为 v1 上线状态的取证；本包不重跑它们，也不得把它们的红灯当成本轮缺陷（区分依据是 `qa/_qa_task18/expected_reversals.md`）。
- **记忆维护**：本轮收尾后需更新 `qa-regression-assertions`（归档层的翻转项与快照绑定要求）、`news-site-plan-structure`（交付集合已是清单驱动、Task12–19 全部执行完成）、`news-site-deployment`（线上页面数变为 `4 + N`、首页第三条已随发布上线）、`archive-system-decisions`（三篇旧文 `date` 的最终处置）。
