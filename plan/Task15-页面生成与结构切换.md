# Task 15 页面生成与结构切换

## 后续有效合同补充 R13（2026-10-04）

当前 Cloudflare Pages 发布集合额外包含构建器生成的线上专用 `Results/404.html`。它以根路径引用 CSS、JS、首页和导航，供 Pages 对未知 URL 返回 HTTP 404；错误页不改动首页、栏目、文章或 `manifest.columns`，且不要求支持 `file://`。本补充覆盖本文件关于 HTML 页集合和写入者归属的旧口径；构建器是它的唯一生成方，线上错误响应由 Task 19 核验。

## 任务定位

本文件把归档总方案中的 Task 15 细化为一个可独立执行、独立验收的工作包。Task 15 是整轮归档的**切换点**：`Results/` 的 HTML 第一次由构建器写入（按 R10，本包的写入面仅为 `Results/*.html`），三个栏目页从"写死一篇新闻"变成"倒序文章列表"，三篇旧文以 `article-<slug>.html` 独立成页，首页新增「最新报道」区。切换完成后，`Results/` 从六个文件变为九个文件，站点结构冻结，交给 Task 16 上样式。

Task 15 同时是本轮**唯一拥有 `Results/*.html` 写入权**的包；按 `Task12` R10，`Results/styles.css` 的唯一写入者是 Task 16，`Results/script.js` 本轮无写入者（预期零改动，需改动即回流 Task 9）。这个特权（仅指 `Results/*.html`）只使用一次、只以"跑一条构建命令"的形式使用：本包不得手工编辑任何 HTML，不得为了先看效果而绕过构建器。所有页面都必须是 `python build/build.py --out Results` 的直接产物，且与 Task 14 在 `qa/_qa_task14/out/` 里已经证明过的字节**逐文件相等**。

还有一个必须说清的现实：本包不是 git 仓库（当前工作目录无版本控制），所以**快照就是唯一的回滚手段**。Task 15 开工前的第一件事就是把 `Results/` 六文件完整复制到 `qa/_qa_task15/before/` 并锁定哈希；这份快照在 Task 19 验收通过之前不得删除、不得覆盖。

## 目标

- 在动笔之前建立可回滚的切换前快照与哈希清单。
- 用构建器把九文件集合中的**七份 HTML** 写入 `Results/`：`index.html`、三张栏目列表页、三个详情页，加上不改动一个比特的 `styles.css`（R10：Task 16 独占）与 `script.js`（R10：本轮无写入者）。
- 证明"内容一个字没变"：三个详情页的 `<main>` 内部字节与 `qa/_qa_task13/main_slices/` 基线切片相等（S1 的部署根重验），三处署名、63 段正文、两处电头、一个结尾行全部原样。
- 证明"壳一个字没变"：七个 HTML 页面 `<main>` 之外的公共壳全等，`aria-current` 落在矩阵规定的链接上，16 条主导航路径（v1 四页 × 4 链接）的目标文件名不变；这 16 条是切换后 28 条（7 页 × 4 链接，见 §页面合同 4 与 15.6）的**子集**，两个口径同时成立，不得互相替换。
- 让首页满足 `Task12 R4` 的新计数：三个直接子元素、`h2` 四个、`<main>` 内标签集合 `{main:1,h1:1,div:2,section:3,h2:4,p:3,ul:1,li:3,a:3,span:6}`、可见内容白名单按序 14 项；三段冻结文本逐字符不变。
- 建立**本轮新增的两类全站闸门**：死链检测（每个 `href` 都指向 `Results/` 内真实存在的文件）与孤儿页面检测（每个详情页至少被所属列表页与首页最新区各引用一次）。
- 建立新的基线链起点：切换后九文件哈希清单，供 Task 16／17／18／19 逐级继承。
- 把 URL 语义变化带来的真实影响登记清楚，不让它以后被当成缺陷重新讨论。

## 前置条件与后续依赖

- 合同前置条件：Task 12 已完成（R1–R7，执行期追加 R8–R10），Task 13 已完成双向对表，Task 14 已完成构建器且 S1–S13 全绿。
- 输入前置条件：`qa/_qa_task14/out/` 内七份 HTML 与 `qa/_qa_task14/report.md` 的逐文件哈希存在；`qa/_qa_task13/baseline/`、`main_slices/` 完好；`content/` 五文件哈希与 Task 13 记录一致。
- 运行环境前置条件：`python build/build.py --out Results` 可执行；`Results/` 目录存在且可写；`build/pack.py` 尚不存在（那是 Task 17 的第一个文件）。
- 直接依赖本包的工作：Task 16（样式，必须先有 DOM）、Task 17（打包，必须知道最终页面集合）、Task 18（闸门，必须知道翻转项从哪一刻开始）、Task 19（浏览器回归）。
- 阻断规则一：`Results/` 当前哈希与表 1 的切换前基线不符时停止，先定位漂移并回到对应上游任务；不得"以现况为基线继续切换"。
- 阻断规则二：`qa/_qa_task14/out/` 与 `Results/` 目标产物出现任何一字节差异时，本包不得手工调平；差异要么由构建器解释（重新构建），要么回流 Task 13／14 修正，二选一，不允许第三种路径。
- 阻断规则三：本包完成后 `Results/` 处于**无样式中间态**，列表页与最新区视觉裸奔是预期结果。此时**严禁上传 Cloudflare Pages**——唯一发布点在 Task 17 之后。
- 阻断规则四：三篇旧文的真实 `date` 若仍未由用户提供，按 `Task12` R9（它更正 R5④ 的触发键）以未分组方式落地：**未分组只影响次序**（排在末尾），不产生任何可见差异；**仅当缺 `display_date` 时不输出日期节点**，且不得用空 `<span>`／占位文本／"日期未知"填充。三篇旧文的 `display_date` 已由用户声明（消息 `9月18日`、通讯 `9月17日`、评论 `9月18日`），因此切换后首页最新区恒为三条带日期的条目。本包不得补日期。

## 交付物与文件所有权

Task 15 执行时**修改或新建**（且只能经由构建器）：

- `Results/index.html`（修改：`<main>` 内新增 `div.home-latest`）
- `Results/news-message.html`（修改：栏目列表页）
- `Results/news-feature.html`（修改：栏目列表页）
- `Results/news-commentary.html`（修改：栏目列表页）
- `Results/article-school-course-volunteer.html`（新建）
- `Results/article-math-to-ai-learning.html`（新建）
- `Results/article-classroom-screen-upgrade.html`（新建）

Task 15 执行时**新建**（QA 产物，全部位于 `Results/` 之外）：

- `qa/_qa_task15/before/`（切换前 `Results/` 六文件完整副本）
- `qa/_qa_task15/hashes_before.txt`、`qa/_qa_task15/hashes_after.txt`
- `qa/_qa_task15/rollback.md`（逐文件回滚步骤与哈希校验方法）
- `qa/_qa_task15/link_graph.txt`（七页 href 图、死链与孤儿检查结果）
- `qa/_qa_task15/report.md`（切换结论、新基线链起点、URL 语义变更登记）

Task 15 **不创建、不修改、不删除**：

- `Results/styles.css`（按 `Task12` R10 由 Task 16 **独占写入**，本包不得触碰）、`Results/script.js`（R10：本轮**无写入者**，预期零改动，需改动即回流 Task 9，不得由 13–19 任何一包就地修改；两者哈希必须逐项不变，见 Task 16 前置）
- `content/`（Task 13 拥有；发现内容源缺陷回流，不在本包改）
- `build/`（Task 14 拥有；本包只调用不修改，包括不"顺手加个选项"）
- `deploy/`、`Materials/`、`plan/`
- `qa/_qa_task1/` … `qa/_qa_task14/`（只读引用）

`Results/` 的文件总数在切换后恰为 **9**，且**不得有子目录**。

## 输入与权威顺序

1. `qa/_qa_task13/main_slices/` 与 `qa/_qa_task13/baseline/` —— 正文与公共壳的字节真值。
2. `plan/Task1`、`plan/Task4` 的冻结文本字面量 —— 可见文本的最终真值。
3. `plan/Task12` 的 R2／R3／R4／R6／R7／R8／R9／R10、`<title>`／`<h1>`／`aria-current` 扩展矩阵 —— 页面结构、命名正则、标题与当前项、禁止项扫描、换值基线、首页最新区边界、日期键位、`Results/` 按文件写入权的唯一口径；本包在 15.5 执行 R4／R8／R9，在 15.7 执行 R6／R7，在"交付物与文件所有权"与 15.3 执行 R2／R10。
4. `plan/Task14` 的装配合同与 `qa/_qa_task14/out/` 的期望产物哈希 —— **切换产物必须与之相等**，本包不得自行调整 HTML。
5. `plan/Task13` 的 `content/` 格式合同 —— 输入合法性判据。
6. `plan/Task2`（公共壳、导航矩阵）与 `plan/Task0` 未修订条款 —— 离线约束、禁止项、大小写规则。

冲突时以更高优先级为准并回流；本包不修改上游合同，也不手工"补齐"构建器的输出。

## 结构或数据基线：切换前基线与快照门禁

### 表 1 切换前 `Results/`（即 v1 六文件基线，与 Task 12 表 1 一致）

> 口径注：本表是 **v1 四页**（`index` ＋ 三张"一页一文"的栏目页）的快照基线，只用于切换前门禁与回滚；切换后的页面集合是**七页**（首页 ＋ 三张列表页 ＋ 三个详情页），七页之间的公共壳一致性另按 §页面合同 与 `Task12` §断言影响矩阵 C／D／K 判定，不得把"四页"当本轮判据。`qa/_qa_task15/before/` 保存的正是本表六个文件，15.4 的详情页壳比对按**同栏目**对表（详情页 ↔ 它所属的那张 v1 栏目页）。

> 口径注：本表是 **v1 四页**（`index` ＋ 三张"一页一文"的栏目页）的基线，只用于切换前快照与回滚；切换后的页面集合是**七页**（首页 ＋ 三张列表页 ＋ 三个详情页），七个 HTML 页面之间的一致性另有合同，不得用 v1 的四页数当本轮判据（`Task12` R2、§断言影响矩阵 C／D／K"集合从四页扩到全部页"）。`qa/_qa_task15/before/` 保存的正是本表的六个文件，15.4 的详情页壳比对按**同栏目**对表。

| 文件 | SHA-256 | 字节 |
| --- | --- | --- |
| `index.html` | `971e57a5f85bae99c389e58d7a132e96c02388432de997c4df3d4af495e6416a` | 2629 |
| `news-message.html` | `66ae5826bbdf9829206c6374305e7bf4bab546c65485349db5fff40e0b5fa0e8` | 3011 |
| `news-feature.html` | `73ff75678c453badbc1edcb1ff590001dc93cade3260ff364e042d02075df9a5` | 6962 |
| `news-commentary.html` | `a2dbf4aac57472e8a8728f80908dc366d3aa9076310bbb39b24d71f251ea8d52` | 8486 |
| `styles.css` | `2c23817299492ea9a3fd7ad23237cfabd6723d166bd99194febbed09ad418ba1` | 12401 |
| `script.js` | `abb39e4a6d218546b45eded0fa601540d2c5195d93c9fe1dfa8aaaabca13c666` | 2204 |

### 表 2 切换后 `Results/`（九文件，`styles.css`／`script.js` 两行原样继承）

| 文件 | 期望哈希来源 | 说明 |
| --- | --- | --- |
| `index.html` | `qa/_qa_task14/out/index.html` | 首页 + 最新区 |
| `news-message.html` | `qa/_qa_task14/out/news-message.html` | 栏目列表页（**不再是文章页**） |
| `news-feature.html` | `qa/_qa_task14/out/news-feature.html` | 栏目列表页 |
| `news-commentary.html` | `qa/_qa_task14/out/news-commentary.html` | 栏目列表页 |
| `article-school-course-volunteer.html` | `qa/_qa_task14/out/同名` | 4 段正文 + 电头 |
| `article-math-to-ai-learning.html` | `qa/_qa_task14/out/同名` | 23 段正文 + 电头 |
| `article-classroom-screen-upgrade.html` | `qa/_qa_task14/out/同名` | 29 段正文 + 结尾行 |
| `styles.css` | 表 1 原值 | **本包不得改动**（R10：Task 16 独占写入） |
| `script.js` | 表 1 原值 | **本包不得改动**，R10：本轮无写入者，需改动即回流 Task 9 |

切换后的七份 HTML 哈希必须与 `qa/_qa_task14/out/` 对应文件**逐项相等**；两份额外文件哈希必须与表 1 逐项相等。任何"只有部分相等"都不算切换成功。

## 页面合同（对部署根的实测口径）

### 1. 详情页

`<main>` 内部与 `qa/_qa_task13/main_slices/news-message.html`（对应 slug 的那一份）逐字节相等；`<title>` 主体 = 文章标题；`aria-current="page"` 落在**所属栏目**链接上（例如 `article-school-course-volunteer.html` → `href="news-message.html"` 那一处）；`<h1 class="page-title">` 逐字等于 `Task1` 的 `title`；`p.article__type` = 栏目名；`p.article__byline` = `蓝色空间`；消息与通讯首段含 `strong.dateline` 且其后恰一个 U+0020；评论页含 `p.article__date` = `（自然选择号9月18日）`，位于 `.article__body` 之后、`</article>` 之内。

### 2. 栏目列表页

`<main>` 内恰两个直接元素子节点：`h1.page-title`（逐字 = 栏目名）与 `ul.entry-list`。`<title>` 主体 = 栏目名；`aria-current` 落在自链接上。每个 `<li class="entry-list__item">` 内恰一个 `a.entry-list__link`，其内为 `span.entry-list__title` + 可选 `span.entry-list__date`。当前三篇各自是所属栏目的**唯一**条目，因此每张列表页各 1 个 `<li>`。条目顺序遵循 `Task14 §排序合同`；无 `display_date` 时**不输出日期节点**（不空 `span`、不写"日期未知"）。列表页不得出现 `article`、`h2`、`p`（正文段）等文章结构标签，也不得出现"暂无文章"字样。

### 3. 首页

`#main-content` 直接子元素恰好三个，顺序 `h1.page-title` → `div.home-sections` → `div.home-latest`；`div.home-latest` 为 `role="region"` + `aria-labelledby="latest-title"`，**不是 `<nav>`**（R3）；其内 `h2.home-latest__title#latest-title` = `最新报道`，`ul.home-latest__list` 三行，顺序固定为消息 → 通讯 → 评论；标签集合与 14 项白名单等于 `Task12 R4` 的精确值；`div.home-sections` 区块与 `build/partials/home-intro.html` 逐字节相等（三段文本、ID、`aria-labelledby` 全部原样）；`aria-current` 落在 `.site-navigation__list` 内的首页链接上（不得命中报头那一处 `href="index.html"`）。

### 4. 全站链接图（本包新增的两类断言）

- **死链检测**：七页中每一个非 `#` 片段、非同资源名的 `href`，其目标文件名必须存在于切换后的 `Results/` 集合中，大小写逐字符一致。主导航 4 个目标在 7 页 × 4 链接 = 28 条路径上全部可达；其中 v1 四页贡献的 16 条（`Task12 §导航矩阵` 与 `Task0` 登记口径）是这 28 条的子集，16 与 28 同时成立、不得互换。
- **孤儿检测**：每个 `article-*.html` 至少被一个栏目列表页引用；当前三篇还必须各被首页最新区引用一次（因为各栏目只有一篇）。反向亦成立：列表页与首页引用的每个详情页都必须真实存在。
- **相对引用形式**：所有 `href`／`src` 为同目录文件名，不以 `/` 开头、不含盘符、反斜杠、查询参数或片段（`#main-content` 除外，它是跳至正文锚点）。

## URL 语义变更登记（不是缺陷，不要回退）

| URL | 切换前 | 切换后 | 影响 |
| --- | --- | --- | --- |
| `/news-message`（及 `news-message.html`） | 消息文章页 | 消息栏目列表页 | 已分享过的该直链**仍然可用、不产生 404**，但落地内容从"一篇文章"变成"该栏目文章列表"；当前该栏目只有一篇，读者一跳即达 |
| `/news-feature`、`/news-commentary` | 各自文章页 | 各自栏目列表页 | 同上 |
| `/article-<slug>.html` | 不存在 | 详情页 | 纯新增，不破坏任何既有链接 |
| `/` | 首页 | 首页 + 最新区 | 兼容 |

三条旧文章没有"旧 URL 保留"问题（其正文迁移到详情页，原栏目 URL 语义升级）。若未来需要为已广泛分享的栏目 URL 做进一步处置，属于新需求，须另立任务并先回 Task 12 修订合同；本包**不**为此引入任何重定向脚本、`<meta http-equiv>` 刷新或 JS 跳转（它们同时违反 `Task0` 的离线与无脚本注入约束）。

Cloudflare Pages 的 `.html → 无扩展名` 308 行为在切换前后一致，且平铺根深度使相对引用不受影响（`Task12 §平铺条款`）。

## 中间态与发布边界

- 本包完成时，`styles.css` 仍只有 v1 的规则：三个列表页与首页最新区**无样式**，视觉上等于纯 HTML。这是合同的一部分，不是缺陷，也不得通过内联样式"临时美化"（内联样式同时被 CSP 与 `Task0` 禁止）。
- `script.js` 的菜单行为在新页面上照常工作（依赖 `#nav-toggle`／`#site-navigation`／`.site-navigation__link`，全部由公共壳提供），无需为长列表调整。若发现需要改动，回流 Task 9。
- **禁止上传**：`deploy/site.zip` 由 Task 17 产出，本包不得生成、不得打包、不得触碰 `deploy/`。
- **不得删除快照**：`qa/_qa_task15/before/` 保留到 Task 19 通过并由用户确认之后。
- 线上在用户下次上传前仍是 v1，因此"线上 `/news-message` 是文章页、本地是列表页"**不是漂移**；`Task18`／`Task19` 的线上复验以最终发布点为准。

## 预期内翻转（本包立刻发生，不得误判为回归）

切换后下列历史核验脚本会出现**必然失败**的断言。它们是 v1 的时点门禁，不是全站不变量：

- `qa/_qa_task5/verify.py`、`qa/_qa_task6/verify.py`、`qa/_qa_task7/verify.py`：断言"逐段正文位于对应 `news-*.html` 的 `<main>` 内"——正文已迁到详情页，必然红。接管方：Task 18 的 L 组 + F 组改指详情页。
- `qa/_qa_task4/verify_home.py`：`#main-content` 两个直接子元素的计数（E1 类）必然红；"其他页 mtime 早于 `index.html`"也必然红（本包重写了四个页面）。接管方：Task 18 按 R4 新值重写。
- `qa/_qa_task2/verify.py`：`Results/` 文件集合、"不得有 `article` 标签／正文"一类时点断言必然红。
- `qa/_qa_task10/verify_task10.mjs:133`：A1"恰好 6 个文件"必然红；F 组宿主页面亦失配。接管方：Task 18 的 A1a/A1b/A1c 与 F 组重锚。
- `qa/_qa_task8/verify.py` 的文件集合类断言：数量与集合必然红。
- 仍然有效、必须全绿的：`Task1` 的 63 项逐段合同、`Task0 §素材冻结基线`、H 组（`styles.css` 未变）、I 组（`script.js` 未变）、G 组高风险字符计数（随 F 组改指详情页）、C/D/K 中"公共壳跨页一致"的语义。

判定方法沿用第一版惯例：**失败集合差分**而非退出码。回归时以 `qa/_qa_task15/before/` 作为 `QODER_RESULTS_DIR` 跑一轮基线、再以当前 `Results/` 跑一轮，diff `^  FAIL:` 行，新增失败项只应落在被改页面上。

## 子任务拆分

### Task 15.1 建立切换前快照与回滚能力

输入：`Results/` 六文件、表 1。

执行：

1. 完整复制六文件到 `qa/_qa_task15/before/`（保留字节，不重新格式化）。
2. 生成 `hashes_before.txt`（路径、SHA-256、字节数、mtime 四列）并逐条比对表 1。
3. 写 `rollback.md`：把 `qa/_qa_task15/before/` 六文件复制回 `Results/` 并删除三个 `article-*.html` 的具体步骤，以及回滚后用 `hashes_before.txt` 校验的方法。
4. 确认 `Results/` 内除六文件外无其它文件、无子目录。

输出：可回滚的切换前状态。

完成条件：快照哈希与表 1 逐项相等；回滚步骤无需口头知识即可执行。

### Task 15.2 复核构建器输入与产物期望

输入：`content/` 五文件哈希、`qa/_qa_task14/out/` 七文件哈希、`qa/_qa_task14/report.md`、`qa/_qa_task13/main_slices/`。

执行：

1. 重算 `content/` 五文件哈希并与 Task 13／14 记录比对（证明输入未变）。
2. 登记 `qa/_qa_task14/out/` 七文件的 SHA-256 作为切换后期望值。
3. 确认 `build/pack.py` 不存在、`deploy/manifest.json` 不存在（那是 Task 17 的产物）。
4. 确认 `--check` 在 `qa/_qa_task14/out/` 上返回 0（无漂移）。

输出：一张"切换后应为何值"的对照表。

完成条件：三项哈希集合彼此一致且来源可追溯；越界文件确实不存在。

### Task 15.3 执行切换（本包唯一一次 `Results/*.html` 写入；`styles.css` 与 `script.js` 不在写入面内，见 R10）

输入：`build/build.py`、`content/`、表 2。

执行：

1. 运行 `python build/build.py --out Results`。
2. 记录退出码、标准输出与文件写入清单（构建器为全有或全无，故不存在半套状态）。
3. 重算 `Results/` 九文件哈希写入 `hashes_after.txt`。
4. 与表 2 逐项比对：七份 HTML 必须等于 `qa/_qa_task14/out/` 对应值；`styles.css`／`script.js` 必须等于表 1 原值。

输出：切换后的 `Results/`。

完成条件：九项全部相等；文件总数恰为 9；无子目录。任一项不等即触发 15.8 的回滚，不得手工调平。

### Task 15.4 详情页保真重验（部署根侧）

输入：三个 `article-*.html`、`qa/_qa_task13/main_slices/`、`Task1` 合同。

执行：

1. 断言每页 `<main>` 内部字节与对应基线切片相等。
2. 断言 `<main>` 之外字节与**该详情页所属栏目页**的切换前副本相等，逐页对表：`article-school-course-volunteer.html` ↔ `qa/_qa_task15/before/news-message.html`、`article-math-to-ai-learning.html` ↔ `qa/_qa_task15/before/news-feature.html`、`article-classroom-screen-upgrade.html` ↔ `qa/_qa_task15/before/news-commentary.html`。`<main>` 之外**只允许两处差异**：`<title>` 主体（`Results/news-message.html:6` 现含消息文章标题，故另两个栏目的详情页 `<title>` 必然与各自 `before/news-<column>.html` 不同）与 `aria-current="page"` 所在链接；`<head>` 其余字节、`<body>` 公共壳、报头、导航、`styles.css`／`script.js` 引用一律逐字节相等。比对须输出差异行的行号与内容，出现第三处差异即 FAIL 并回滚。不得把 feature／commentary 详情页锚到 `before/news-message.html` 上。
3. 断言段落数 4／23／29、63 项字符数、电头后 U+0020 计数为 1、`安 装` 命中为 0、`她`未被改写、C29 为单段。
4. 用真实浏览器打开三页，逐段 `textContent` 与 `qa/_qa_task13/extracted_baseline.json` 相等（不做任何归一化）。

输出：部署根侧的保真结论。

完成条件：四条全部相等；任何一条不满足立即回滚并回流 Task 13／14 定位。

### Task 15.5 列表页与首页结构核验

输入：四份页面、`Task12 R3/R4`、`Task14 §装配合同`。

执行：

1. 三张列表页：`<main>` 直接子元素两个、`entry-list` 结构正确、条目数为 1／1／1、`<h1>` 为栏目名、无正文标签、无占位文案。
2. 首页：三个直接子元素、标签集合与 14 项白名单逐项实测、`div.home-latest` 为 `role="region"` 而非 `<nav>`、`#latest-title` 唯一且被正确 `aria-labelledby` 引用、`div.home-sections` 与 partial 逐字节相等。
3. 全站 `<nav>` 计数仍为每页 1（R3 的直接后果，亦是 C6——`verify_task10.mjs:213-216` 的"公共壳节点数量"——能保持不动的前提；C5 是 `:210` 的 `.skip-link` 断言，与本项无关）。同一步实测首页 `.home-section` 计数恰为 **3**（E3 不动），且 `div.home-latest` 区段内既无 `.home-section` 类、也无 `<section>`、亦无第二个 `<nav>`。
4. 七页 `aria-current` 恰好一个且位置符合扩展矩阵。
5. 三个新建详情页文件名逐个匹配 `Task12` R2② 的 `^article-[a-z0-9][a-z0-9-]{2,40}\.html$`，大小写逐字符一致，且主干等于对应 `content/articles/<slug>.md` 的 `slug`；`Results/` 内不得有其它命中该正则的文件（清单双向相等）。

输出：结构核验结论。

完成条件：上述五项全部实测通过，而不是"由构建器正确性推定"。

### Task 15.6 链接图、死链与孤儿检测

输入：七页 HTML。

执行：

1. 抽取每页 `href`／`src` 集合，生成 `link_graph.txt`（来源页 → 目标 → 出现次数）。
2. 死链检测：所有目标文件名 ∈ 切换后 `Results/` 集合；`styles.css`、`script.js`、`#main-content` 之外无其它资源。
3. 孤儿检测：三个详情页各被所属列表页引用，且各被首页最新区引用。
4. 相对引用形式检测：无 `/` 开头、无盘符、无反斜杠、无查询串、无 URL 片段（跳至正文锚点除外）。
5. 28 条主导航路径（7 页 × 4 链接）逐条确认目标存在且文案与顺序不变；其中 v1 四页贡献的 16 条在 `link_graph.txt` 里单列一栏并逐条确认，16 ⊂ 28，两个口径同时成立，不得用其中一个替换另一个。

输出：链接图与三项检测结论。

完成条件：死链 0、孤儿 0、非法引用形式 0。

### Task 15.7 禁止项、离线与降级复扫

输入：切换后 `Results/` 九文件。

执行：

1. 全站禁止项扫描（`Task12 R6` 扩充后的清单）：`厨一枚`、`胡桃`、`新闻评价`、`2026`、ISO 日期（`\d{4}-\d{2}-\d{2}`）、`data-*`、`<time`、`datetime=`、`{{`／`}}`、**R6① 的七个 front-matter 字段名**（`date`、`display_date`、`end_date`、`order`、`slug`、`column`、`byline`；`title` 不在清单内）、`M01`–`M99`／`F01`–`F99`／`C01`–`C99`、素材文件名与路径、素材哈希片段、`TODO`／`TBD`、作者与来源标签、外部资源（`http`、`//`、`url(`、`@import`、`@font-face`）。七个字段名一律**整词匹配**（命中串前后不得再接 `[A-Za-z0-9_-]`），并豁免已注册类名与标签：`.entry-list__date`、`.home-latest__date`、`.article__date`、`<title>`、`.page-title`；裸子串扫描禁用（否则上述五项必假阳性）。年份形态扫描一律用 `(19|20)\d{2}`，**禁用裸 `\d{4}`**（`styles.css` 的 `#7a2424`、`0.9375rem`、`1.0625rem` 会误报）。
2. 确认首页三段文本逐字符等于 `Task4` 冻结表（第三条为 R7 修订后的 `报社成立于“鸽子衔枝之年”。`），并确认七个 HTML 文件与 `script.js` **不含任何四位数字串**、全部九文件的 `(19|20)\d{2}` 命中为 **0**（R7 之后不再有 `2024` 豁免项；`styles.css` 允许含 `0.9375rem` 一类非年份四位串）。
3. 禁用 CSS 打开七页：结构顺序正确、可读、链接可点。
4. 禁用 JS 打开七页：`no-js` 下导航常显，正文完整。
5. 断网双击抽查：无网络请求、无控制台错误。

输出：禁止项与降级结论。

完成条件：扫描命中为 0（R7 之后无 `2024` 豁免项）；两种降级均可读；控制台 0 错误。

### Task 15.8 失败时的回滚演练

输入：`qa/_qa_task15/before/`、`rollback.md`。

执行：

1. 15.3／15.4／15.5 任一步失败：按 `rollback.md` 恢复六文件、删除三个详情页。
2. 恢复后用 `hashes_before.txt` 校验六文件。
3. 在 `report.md` 记录失败现象、定位到的合同条款与回流任务号；**不得**通过修改断言或手工改 HTML 来"让检查过"。
4. 即便一切成功，也要在副本目录上**演练一次回滚**（不动真实 `Results/`），证明 `rollback.md` 可执行。

输出：一次成功的回滚演练记录。

完成条件：演练后真实 `Results/` 哈希与 15.3 结果一致；回滚步骤可被他人照做。

### Task 15.9 登记新基线链并交接

输入：`hashes_before.txt`、`hashes_after.txt`、本包全部结论。

执行：

1. 把九文件哈希登记为**基线链 v2 起点**，写明"v1 六文件基线 → v2 九文件基线"的继承关系与生效时刻。
2. 向 Task 16 交付：12 个新类的实际出现位置与嵌套层级、`entry-list__date`／`home-latest__date` 的在场情况（本轮三篇均带用户声明的 `display_date`，按 R9 两类节点当前都在场；缺席口径只在副本实验里成立，不得被当成放宽 H14 的理由）、"必须等样式完成才发布"的边界、`Results/styles.css` 的写入权按 R10 移交。
3. 向 Task 17 交付：打包集合 = 九文件 + `_headers`（清单来源为构建器，不得目录通配）。
4. 向 Task 18 交付：预期内翻转清单（含具体脚本与断言名）、新基线链、`link_graph.txt` 可作为其新增断言的种子。
5. 向用户说明：本地已切换、线上仍是 v1，发布动作留到 Task 17 之后由用户执行。

输出：`qa/_qa_task15/report.md`。

完成条件：Task 16–19 的执行者无需回读 Task 12–14 即可开工。

## 验证方法

1. **切换原子性**：`Results/` 九文件集合与 `qa/_qa_task14/out/` + 两份继承文件**双向相等**（无多、无少、无子目录）。
2. **写入路径唯一**：全部 HTML 由 `build/build.py` 产生（按 R10，本包的写入面只有 `Results/*.html`）；`hashes_after.txt` 与 out 目录相等即证明未发生手工编辑（手工编辑任何一处都会破坏相等）。
3. **无副作用**：`styles.css`、`script.js` 哈希与表 1 逐项相等；`content/` 五文件哈希与 Task 13 记录相等；`build/` 三文件哈希与 Task 14 记录相等；`deploy/` 未被创建新文件。
4. **保真**：详情页 `<main>` 字节相等 + 浏览器 `textContent` 逐段相等 + 63 项字符数 + 高风险点逐项（电头空格、`安 装`、`她`、C29 单段、`86英寸`、`Windows 10` 两次、`.exe` 三次）。
5. **结构**：首页三个直接子元素与 `{main:1,h1:1,div:2,section:3,h2:4,p:3,ul:1,li:3,a:3,span:6}` 标签集合、14 项白名单（R9④：无条件值）、每页 `nav` 数为 1、每页 `aria-current` 数为 1；首页 `.home-section` 计数恰为 3，`div.home-latest` 区段内 `.home-section` 命中为 0、`<section>` 命中为 0、区内 `<nav>` 命中为 0（C6 与 E3 同时保持）；三个新建详情页文件名逐个匹配 R2② 的 `^article-[a-z0-9][a-z0-9-]{2,40}\.html$`，且 `Results/` 内命中该正则的文件恰为这三个。
6. **链接图**：死链 0、孤儿 0（每个详情页被所属列表页与首页最新区各引用一次）、非法引用 0、28 条主导航路径成立，其中 v1 的 16 条为其子集。
7. **禁止项与降级**：R6 全站扫描命中为 0（年份形态用 `(19|20)\d{2}`，裸 `\d{4}` 禁用；R7 之后首页已无 `2024`，无豁免项）；禁 CSS、禁 JS 两种模式各读一遍七页。
8. **可回滚**：15.8 演练成功，`rollback.md` 步骤被独立执行一次。
9. **负向对照**（证明本包检查有牙，在副本目录上进行）：手工把某详情页一个 `。` 改成 `.` → 第 4 项变红；手工给某页加一个 `<nav>` → 第 5 项变红；把首页最新区一个 `<span>` 删掉 → 标签集合变红；给 `div.home-latest` 或其条目加 `.home-section` 类 → 第 5 项的 `.home-section` 计数（应为 3）变红；把某新建详情页改名为 `Article-X.HTML` 或 `article-X.htm` → 第 5 项的 R2② 命名正则变红；在 `Results/` 放一个 `README.md` → 集合双向相等变红；创建 `Results/articles/` 子目录并移入一页 → 集合与相对引用双重变红；把 `styles.css` 改一个字节 → 第 3 项变红。

## 变更边界

### 必须完成

1. 切换前快照与回滚说明先于任何写入动作完成。
2. 只用构建器写 `Results/` 的 HTML（按 R10，本包的写入面是 `Results/*.html`；`styles.css` 归 Task 16、`script.js` 本轮无写入者），一条命令，全有或全无。
3. 九文件集合与 `qa/_qa_task14/out/` + 继承值逐项相等。
4. 详情页 `<main>` 与基线切片字节相等，并在浏览器侧独立复核一次。
5. 首页满足 R4 新计数与 14 项白名单，`div.home-sections` 与 partial 逐字节相等。
6. 每页 `<nav>` 数为 1、`aria-current` 数为 1 且位置符合扩展矩阵。
7. 死链、孤儿、非法引用形式三项检测成立。
8. 全站禁止项扫描与两种降级模式通过。
9. 回滚演练执行一次。
10. 基线链 v2 起点登记并完成对 Task 16／17／18／19 的交接。
11. 实测并记录首页 `.home-section` 计数恰为 3，`div.home-latest` 区段内无 `.home-section` 类、无 `<section>`、无第二个 `<nav>`（C6 `nav === 1` 保持不动）。
12. 逐个校验三个新建详情页文件名匹配 `Task12` R2② 的 `^article-[a-z0-9][a-z0-9-]{2,40}\.html$`，大小写逐字符一致，并证明 `Results/` 内没有该正则之外的多余 HTML 文件。

### 明确不做

- 不手工编辑 `Results/` 下任何文件（哪怕只是补一个空格）。
- 不改 `styles.css`、不新增任何样式规则、不加内联 `style=`、不加 `<style>`。
- 不改 `script.js`，不新增第二个脚本，不为长列表加交互。
- 不写 `deploy/`、不生成 zip、不生成 `manifest.json`（Task 17）。
- 不上传 Cloudflare Pages，不做任何发布动作。
- 不改 `content/` 的字符，包括"看起来是错字"的地方（人称不一致、无出处引语、限定语均属 `Task1 §7` 原样保留项）。
- 不补年份、不补发布日期、不因"列表页没日期不好看"而代填 `display_date`。
- 不新增第四个栏目、不引入标签／期次／分页／搜索／"显示更多"。
- 不给栏目页做 URL 跳转、`<meta http-equiv>` 刷新或任何重定向技巧。
- 不删除 `qa/_qa_task15/before/`、不改写任何历史 `_qa_taskNN/` 报告。
- 不为了让旧 verify 脚本继续绿而修改它们的断言。
- 不把 `qa/_qa_task14/out/` 的中间产物留在 `Results/` 里，也不留下 `.orig`、备份、临时文件。

## 异常处理

- **15.3 九项哈希与期望不等**：立即按 `rollback.md` 回滚，然后定位差异属于哪一层——`content/` 变了（回 Task 13）、构建器行为变了（回 Task 14）、还是 `Results/` 被外部工具改写过（编辑器、格式化器、云盘同步）。禁止手工调平。
- **构建器退出码非 0**：按其报错的"文件:行号 + 条款编号"回流对应上游包；本包不修改构建器，也不修改内容源来"绕开"报错。
- **`Results/` 出现清单外文件**：先判来源。若为用户手工放置且有意保留，说明本轮合同不足以覆盖该需求，须回 Task 12 讨论；若为意外产物（备份、`.map`、`__pycache__`），移到 `Results/` 外并报告，**不得静默删除**（可能是用户的东西）。
- **详情页 `<main>` 与基线切片不等**：这是最高级别异常，说明"改字"风险已真实发生。停止切换、回滚、回流 Task 14；不允许以"只差一个空格，可忽略"通过。
- **列表页条目顺序与排序合同不符**：先查 `content/` 的 `date`／`order` 值，再查构建器排序是否引入了 `readdir` 顺序或 locale 比较；不得靠重命名文件来"凑顺序"。
- **首页白名单出现第 15 项或不足 14 项**：这是一处缺陷，不是一种口径。`Task12` R4 的 14 项白名单与 `{main:1,h1:1,div:2,section:3,h2:4,p:3,ul:1,li:3,a:3,span:6}` 计数是**无条件值**（R9④：三篇旧文的 `display_date` 已由用户声明，恒输出日期节点），合同里不存在、也不得出现"12／14 两种口径"。命中此情形即说明构建器或 `content/` 有误——停止切换、回滚、回流 Task 13／14 定位，不得给正文补日期凑数，也不得改动白名单期望值。
- **禁用 JS 后菜单打不开**：属第一版既定行为（`no-js` 下 CSS 常显，按钮隐藏）。若新页面样式导致常显失效，是 Task 16 的接口问题，不是 Task 15 的缺陷；记录并移交，不在本包改 CSS。
- **误以为线上需要立刻同步**：不发布。`Task15` 之后线上仍是 v1 是合同的一部分。
- **有人建议顺手把样式也改了**：拒绝并转 Task 16——按 `Task12` R10，`Results/styles.css` 的唯一写入者是 Task 16，本包只有 `Results/*.html` 的写入权，本包不碰 `styles.css`。

## 常见返工风险

- 手工编辑 `Results/` 里的生成页面来"修一个小问题"——真相从此与 `content/` 分叉，下一次构建会把它无声覆盖。
- 先跑构建、再补快照：一旦构建有副作用，回滚参照已经丢失。快照必须在前。
- 只比文件数量不比哈希：九文件齐了但其中一个是 out 目录的旧版本，肉眼完全看不出。
- 用文本 diff 工具看保真（会把行尾、BOM、码点差异显示成"一样"）；必须用哈希与 `textContent` 逐段比较。
- 把列表页当详情页改，或反过来，导致 `aria-current` 全部错位而页面看起来仍"有下划线"。
- 首页最新区被写成 `<nav>` 或第四个 `.home-section`，前者撞 C6（`verify_task10.mjs:213-216` 的 `nav === 1`）、后者撞 E3。
- 为"暂时只有一篇"的栏目写空态文案，引入合同外文本；合同要求由注册表与拒绝构建来兜底。
- 忘记 `href="index.html"` 在壳内出现两处，误把当前项加到报头链接上。
- 把 `styles.css`／`script.js` 的哈希变化当作"构建器的正常副作用"而放行——本包它们必须一比特不动。
- 用 `qa/_qa_task14/out/` 直接覆盖 `Results/`（复制文件而不是跑构建器）：绕过了构建，未来 out 目录与 `Results/` 就会各说各话。
- 在 `Results/` 留下 `_out`、`.bak`、`__pycache__` 之类产物，等 Task 17 用目录通配打包时一起上了线。
- 把"预期内翻转"的旧脚本当回归去修，反而削弱了它们当时有效过的事实；正确做法是登记并交给 Task 18 接管。
- 忘记回滚演练：真出问题时才发现 `rollback.md` 里的路径写错。

## 完成定义

Task 15 只有在以下条件全部满足时才算完成：

- [ ] `qa/_qa_task15/before/` 六文件快照哈希与表 1 逐项相等，`rollback.md` 已建立且被演练过一次。
- [ ] `Results/` 的 HTML 由且仅由 `python build/build.py --out Results` 写入，退出码 0；`styles.css` 与 `script.js` 未经本包写入（R10）。
- [ ] `Results/` 文件集合恰为 9、无子目录、无清单外文件；三个新建详情页文件名逐个匹配 R2② 的 `^article-[a-z0-9][a-z0-9-]{2,40}\.html$`，且命中该正则的文件恰为这三个。
- [ ] 七份 HTML 哈希与 `qa/_qa_task14/out/` 对应文件逐项相等。
- [ ] `styles.css`（R10：Task 16 独占写入）、`script.js`（R10：本轮无写入者）哈希与表 1 逐项相等（本包未触碰）。
- [ ] 三个详情页 `<main>` 内部字节与 `qa/_qa_task13/main_slices/` 对应切片相等。
- [ ] 浏览器侧逐段 `textContent` 与 `qa/_qa_task13/extracted_baseline.json` 相等，63 项字符数全中。
- [ ] 段落数 4／23／29；两处电头后 U+0020 计数为 1；`安 装` 命中 0；`她` 未被改写；评论页结尾行原样。
- [ ] 三张列表页各 1 个 `<li>`、`<h1>` 为栏目名、无正文标签、无空态文案。
- [ ] 首页 `#main-content` 三个直接子元素；标签集合等于 R4 的无条件值 `{main:1,h1:1,div:2,section:3,h2:4,p:3,ul:1,li:3,a:3,span:6}`；可见内容白名单按序 14 项（R9④，无第二种口径）。
- [ ] 首页 `div.home-latest` 为 `role="region"` 而非 `<nav>`；`div.home-sections` 与 partial 逐字节相等；`.home-section` 计数恰为 3，最新区无 `.home-section` 类、无 `<section>`。
- [ ] 每页 `<nav>` 数为 1、`aria-current` 数为 1 且位置符合扩展矩阵（详情页指向所属栏目）。
- [ ] 死链 0、孤儿 0（每个详情页被所属列表页与首页最新区各引用一次）、非法引用形式 0、28 条主导航路径成立且含 v1 的 16 条子集。
- [ ] R6 全站禁止项扫描命中为 0（七个 front-matter 字段名按整词匹配并豁免已注册类名）；首页三条引言文本逐字符等于 `Task4` 冻结表（含 R7 修订后的第三条），七个 HTML 文件与 `script.js` 无四位数字串、九文件 `(19|20)\d{2}` 命中为 0。
- [ ] 禁 CSS、禁 JS 两种模式七页均完整可读；断网双击无网络请求、控制台 0 错误。
- [ ] 负向对照八类变异全部被对应检查捕获，且真实 `Results/` 未被变异触碰。
- [ ] `qa/_qa_task15/report.md` 含 v2 基线链、URL 语义变更登记、预期内翻转清单与对 Task 16／17／18／19 的交接。
- [ ] 本包未生成 `deploy/` 产物、未上传 Pages、未修改 `content/`／`build/`／`plan/`。

## 后续任务交接

- **给 Task 16**：按 `Task12` R10，自本条交接起 `Results/styles.css` 由你**独占写入**（本包只有 `Results/*.html` 的写入权，且已证明 CSS 一比特未动）；切换后 `Results/` 九文件哈希（v2 基线）；12 个新类在七页中的实际位置与嵌套；`entry-list__date`／`home-latest__date` **当前均存在**（三篇旧文的 `display_date` 由用户声明，R9），但样式仍须按"节点可能缺席"设计；`div.home-latest` 是 region 而非 nav，样式不得为其新增导航地标；"样式完成前禁止发布"的边界。
- **给 Task 17**：打包集合 = `Results/` 九文件 + `deploy/_headers`，全部位于压缩包根；集合来源为构建器清单与 `link_graph.txt` 的页集合，**不得**用目录通配（防止快照或临时文件混入）；上传后三个数字分开核对：`Results/` 交付文件 `6 + N`（当前 9）、zip 内文件条目 `7 + N`（当前 10，含 `_headers`）、Pages 后台的 HTML 页面数 `4 + N`（当前 7）。
- **给 Task 18**：`hashes_before.txt` 与 `hashes_after.txt` 两份基线（前者用于失败集合差分的基线副本）、预期内翻转清单（`qa/_qa_task2/4/5/6/7/8/10` 的具体脚本与断言名）、`link_graph.txt`（死链与孤儿断言的种子）、R4 实测计数值。
- **给 Task 19**：切换后的九文件哈希为回归起点；三篇详情页的浏览器文本基线是 `qa/_qa_task13/extracted_baseline.json`；列表↔详情导航链与 `aria-current` 归属清单；"线上仍是 v1、发布留到 Task 17 之后"的前提，避免把线上与本地差异误报为缺陷。
- **给用户**：本地已完成结构切换，**站点尚未发布、新页面暂时无样式**；下一次可视检查在 Task 16 之后；真正的上传动作由你在 Task 17 产出 `deploy/site.zip` 后执行。三篇旧文的真实 `date` 若要显示，随时可补进 `content/` 并重跑一条命令——但本包不会替你猜。
