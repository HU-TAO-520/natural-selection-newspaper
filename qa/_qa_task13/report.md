# Task 13 执行与验收记录（素材迁移与内容源基线）

执行时间：2026-10-02 09:46～09:59（本地）。执行范围严格限于 `plan/Task13-素材迁移与内容源基线.md` 的 13.1–13.8。
本轮**未生成任何 HTML、未实现任何渲染器、未改动 `Results/` 一个字节**。

## 0. 迁移前基线（此后不得改写）

本表即金标准。此后任何闸门（含 Task 18 的 L 组）都以 `_qa_task13/baseline/` 的这六份副本为准；若某处哈希与本表不符，先回上游任务定位漂移，**禁止把当前状态改写成基线**。

| 文件 | SHA-256 | 字节 | mtime | 副本哈希 |
| --- | --- | --- | --- | --- |
| `Results/index.html` | `971e57a5f85bae99c389e58d7a132e96c02388432de997c4df3d4af495e6416a` | 2629 | 2026-09-30T22:33:24 | 相等 |
| `Results/news-message.html` | `66ae5826bbdf9829206c6374305e7bf4bab546c65485349db5fff40e0b5fa0e8` | 3011 | 2026-09-19T09:53:19 | 相等 |
| `Results/news-feature.html` | `73ff75678c453badbc1edcb1ff590001dc93cade3260ff364e042d02075df9a5` | 6962 | 2026-09-19T12:52:40 | 相等 |
| `Results/news-commentary.html` | `a2dbf4aac57472e8a8728f80908dc366d3aa9076310bbb39b24d71f251ea8d52` | 8486 | 2026-09-19T14:34:41 | 相等 |
| `Results/styles.css` | `2c23817299492ea9a3fd7ad23237cfabd6723d166bd99194febbed09ad418ba1` | 12401 | 2026-09-19T21:20:52 | 相等 |
| `Results/script.js` | `abb39e4a6d218546b45eded0fa601540d2c5195d93c9fe1dfa8aaaabca13c666` | 2204 | 2026-09-19T15:38:02 | 相等 |

`Results/index.html` 是 **2629 字节的 R7 新版首页**（第三条为 `报社成立于“鸽子衔枝之年”。`），不是 2612 字节的 `73f49fd8d01bb578…` 旧版；快照来源正确。

## 1. 开工门禁（实施前检查 第 1–7 条）

| 条 | 检查 | 结果 |
| --- | --- | --- |
| 1 | 表 1 六项＋表 2 三项哈希逐条重算 | 九项全部匹配，退出码不为 4 |
| 2 | `Results/` 目录集合与表 1 六行**双向相等** | 通过（见下"外来文件处置"） |
| 3 | `content/`、`build/` 不存在或为空；`_qa_task13/` 快照产物不存在 | 开工时通过（`content/`、`build/` 均不存在） |
| 4 | 三页＋首页均 UTF-8 无 BOM、LF、无 CR、无 TAB、`<main>` 唯一、`.article__body` 唯一、无 `&` 实体 | 通过 |
| 5 | 三页 `<main>` 起止偏移与**内部字节**切片 | 见 §2 |
| 6 | 每个正文 `<p>` 恰占一行；`.article__body` 内段落间无空行；评论页 `</div>` 与 `p.article__date` 之间恰一个空行且该 `<p>` 在 `<article>` 内、`.article__body` 之后 | 通过（脚本逐条断言，非目测） |
| 7 | `index.html` 三段文本逐字等于 `Task4` 冻结表（含 R7 修订后的第三条） | 通过 |

### 外来文件处置（须用户在场确认的一条）

开工门禁第 2 条在首轮即**以退出码 4 停止**：`Results/` 实际有 7 个文件，多出 `d9e2b35cb26c98dfbff2d77290cf1f0a.txt`（40 字节，`2180fd91c28fe23a9d3cdf0c435cd6d531f50445ecf472eed6b945c3cf680258`，内容为一串 40 位十六进制 `e31995f16836a82db054fddc6823afabbde57157`）。

按 `Task12 §未登记入交付集合的外来文件` 与 `Task13 实施前检查 第 2 条`，本包**不得代为删除或移动**，故先停止并向用户请求处置。用户 2026-10-02 明确授权"移出到 `Results/` 外"后，执行了**移动**（非删除）：

- 新路径：项目根 `d9e2b35cb26c98dfbff2d77290cf1f0a.txt`（根目录，而非 `_qa_task13/`——`Task12` 记明它不属于任何 `_qa_taskNN` 产物）。
- 字节数 40、内容、mtime（2026-09-30 22:27）与移动前逐项一致；SHA-256 前后相等。
- 移动后 `Results/` 集合 == 表 1 六行，门禁第 2 条转绿，快照才开始执行。

## 2. Task 13.1 快照与 `<main>` 内部切片

- `_qa_task13/baseline/`：六文件逐字节副本（不重新格式化、不改行尾），副本哈希与原件**逐项相等**；`hashes_before.txt` 为「路径⇥SHA-256⇥字节数⇥mtime」四列六行。
- `_qa_task13/main_slices/`：三页 `<main>` **内部**字节切片（不含两条标签行），另含 `tags.txt` 逐页记录两条标签行原文。

| 页面 | `<main>` 起始标签偏移 | 内部字节起点 | `</main>` 偏移 | 内部字节数 | 内部字节 SHA-256 | 落盘一致 |
| --- | --- | --- | --- | --- | --- | --- |
| `news-message.html` | 1654 | 1716 | 2985 | 1269 | `4b941f8e6b101558919f9877dce152373999a35fe0fc7f8a11302931d13c212a` | 是 |
| `news-feature.html` | 1650 | 1712 | 6936 | 5224 | `f3d6517a076b10a39455f6e15ef89a9b094d1dd1c7a937ddab1ce45576b86834` | 是 |
| `news-commentary.html` | 1663 | 1725 | 8460 | 6735 | `0a10c97742f8ee50033ee81ea62515aecfd0c8d53ef4b0e9acccf14fcb2b2a17` | 是 |

内部字节的定义是"`  <main class="main-content" id="main-content" tabindex="-1">\n` 之后、`  </main>` 之前的全部字节"，**两条标签行不参与切片**——它们归 `build/shell.html` 所有，Task 14 的 S1 与 14.2 消费的都是这份 interior。两条标签行的原文（含行首两个空格与行尾 LF）逐页存于 `main_slices/tags.txt`，格式为「页面名⇥标签⇥标签原文（LF 结尾）」六行，信息一项不丢：

```text
news-message.html	<main>	  <main class="main-content" id="main-content" tabindex="-1">
news-message.html	</main>	  </main>
（news-feature.html、news-commentary.html 两条与上完全相同）
```

三页的两条标签行**逐字节相同**，这正是 Task 14 能用一份壳生成三页的事实基础。

## 3. Task 13.2 正向抽取（`extracted_baseline.json`）

从基线 HTML 抽取每页的 `<title>` 主体、`p.article__type`、`h1.page-title`、`p.article__byline`、`.article__body` 下**有序**段落数组（保留原始 `textContent`，不 `trim`、不折叠空白）、首段 `strong.dateline` 归属与电头文本、`p.article__date`；每段附码点数组与 U+0020 计数。

完成条件逐项达成：段落数 **4／23／29**；三处署名均为 `蓝色空间`；评论页结尾行 **1 个**；`M01` 与 `F01` 后 U+0020 计数均为 **1**。

## 4. Task 13.3 `content/` 五个文件

集合恰为 5 个：

| 文件 | 字节 | SHA-256 |
| --- | --- | --- |
| `content/columns.md` | 123 | `c97465a56e6dbd02289d5c792ef8991c0290bc2f62fbac619b009c9c3eccf2a4` |
| `content/_模板.md` | 637 | `6264baf96a65d49b5eaf89476422ee5497ed924e006e4521df1b6b4d5b83abeb` |
| `content/articles/school-course-volunteer.md` | 1003 | `890232940a6c5de4fc2eadc56bd0b2e2f238ef3c53de50bd4c9ff4dae1dd949e` |
| `content/articles/math-to-ai-learning.md` | 4688 | `e92c5b9b9a27abcdabd2d480e2cad498f8d52f39c5557c6db97ec626bdc3af71` |
| `content/articles/classroom-screen-upgrade.md` | 6127 | `8baf673e6f1bf38a930115073e650020da4e526cfc18d169efc6749e90de2d2a` |

正文来源：三份 md 的 56 个段落文本由脚本**直接从 `plan/Task1` 的三个合同代码块解析得到**，未重新录入、未手敲；写入前还做了一道额外证明——`Task1` 文本与基线 HTML 的 `textContent` **逐篇逐段逐字符相等**（56 段全中），故 `content/` 同时锁住了两个权威。

`columns.md` 三行与 `Task12` 注册表逐字节相同，无表头行、无空格填充、竖线分隔；栏目名恰为 `新闻消息`／`新闻通讯`／`新闻评论`，**无 `新闻评价`**；顺序为消息→通讯→评论。`_模板.md` 为八键说明加两行占位，不含任何真实正文。

## 5. Task 13.4 双向解析对表（`extracted_sources.json`）

`compare.py` 以 `slug` 为主键，对正向与反向两份结构化结果做**码点序列相等**的深度比较（比较前不 `trim()`、不折叠空白、不大小写折叠、不全半角转换、不 Unicode 标准化、不标点替换），逐项覆盖 `title`、`title_subject`、`byline`、有序段落数组（逐段 text／length／u0020_count／codepoints）、电头归属与文本、结尾行、`display_date` 与 `date` 的存在性。

结论：**0 处差异**。三份文章双向解析结果深度相等。

## 6. 逐段长度门禁（63 项）

`Task1 §3` 的 63 项字符数逐项复算并全中；三处合计亦相等：

- 消息 `title=12 byline=4 M01=96 M02=109 M03=64 M04=19`，合计 **304** ✔
- 通讯 `title=12 byline=4 F01=58 … F23=61`（25 项），合计 **1545** ✔
- 评论 `title=15 byline=4 C01=80 … C29=36 closing_date=12`（32 项），合计 **2069** ✔

反向侧段落数 4／23／29；评论页结尾行不计入正文段数，单独计 1，由 `end_date` 字段承载。

## 7. 高风险字符与已知异常（逐条校验结论）

| 项 | 结论 |
| --- | --- |
| M01 电头 `自然选择号9月18日7时电` | md 中为 `**…**` 后一个空格；反向解析后长度 96、U+0020 计数 **1** ✔ |
| F01 电头 `自然选择号9月17日电` | 长度 58、U+0020 计数 **1** ✔ |
| F05 `在她看来…` | "她"未被改写；`content/` 内 `她`=1、`他`=6，与基线逐项相等 ✔ |
| C06 `接口的位置就应该考虑` | 接缝 U+0020 计数 0，逐字符等于 `Task1`，长度 101 ✔ |
| C12 `只能在Windows环境下运行` | 六字连写无空格，长度 167 ✔ |
| C26 `统一安装` | 正则 `安 装` 在 `content/` 命中 **0** ✔ |
| C05 `根据记者的不完全统计` | 原样保留；`记者：` 命中 **0**（`记者` 二字属正文合法） ✔ |
| C29 四 run 并成同一段 | 段落数仍 29，C29 长度 36，引号未拆成 `blockquote`、未换行 ✔ |
| C21 `从科大讯飞的产品资料来看` | 保留文字，`[`／`]` 命中 0，未加链接与出处 ✔ |
| `86英寸`=1、`47个社团`=1、`5次碰撞`=1、`3个U盘`=1、`Windows 10`=2、`.exe`=3、`UOS`=4、`USB`=4、`OPS`=1、`Linux`=1、`4K`=1、`AI`=20 | 正向与反向**逐项相等**，其中 `Windows 10`=2、`.exe`=3 与 `Task1 §4` 冻结值一致 ✔ |
| `“`=13、`”`=13、`‘`=2、`’`=2、`——`=1、`；`=9 | 码点序列相等，非"看起来一样" ✔ |
| `closing_date` | 作为 `end_date` 逐字符等于 `（自然选择号9月18日）`，全角括号、无年份 ✔ |
| Word 元数据 `厨一枚~ 胡桃` 与 2026-09-17～18 时间戳 | `content/` 命中 **0**；未成为 `date` 的来源 ✔ |
| `Task1 §7` 七项已知异常 | 一律原样搬运：未统一人称、未改限定语、未拆段、未并段、未加出处、未补年份 ✔ |

## 8. Task 13.5 `display_date` 与 `date`

| slug | `display_date` | 格式匹配 | 不含四位数字 | 正文中的出处 |
| --- | --- | --- | --- | --- |
| `school-course-volunteer` | `9月18日` | ✔ | ✔ | 首段电头 `自然选择号9月18日7时电`，`paragraph[1]` 偏移 5 |
| `math-to-ai-learning` | `9月17日` | ✔ | ✔ | 首段电头 `自然选择号9月17日电`，`paragraph[1]` 偏移 5 |
| `classroom-screen-upgrade` | `9月18日` | ✔ | ✔ | 结尾行 `（自然选择号9月18日）`，`end_date` 偏移 6 |

三值逐篇等于"slug 定稿"表所钉值，无第四个值、无缺失；`display_date` 同时在**基线** `textContent` 中被证明为子串（双向都过）。

`date` 状态：三篇均为**未提供 → 未分组**，按 `R5` 第 4 条与 `R9`① 只排到"未分组"末尾、**不产生任何可见差异**；日期节点的在场性只由 `display_date` 决定。本包**未从 docx 元数据、文件系统时间或上下文推断任何日期**（实测 `docProps/core.xml` 时间戳为 2026-09-17～18，已明确拒用）。

## 9. slug 定稿

| 栏目页现文件 | 标题 | slug | 详情页文件名 |
| --- | --- | --- | --- |
| `news-message.html` | 我校启动校本课程志愿填报 | `school-course-volunteer` | `article-school-course-volunteer.html` |
| `news-feature.html` | 从数学题到AI时代的学习 | `math-to-ai-learning` | `article-math-to-ai-learning.html` |
| `news-commentary.html` | 设备升级了，使用门槛也该降下来 | `classroom-screen-upgrade` | `article-classroom-screen-upgrade.html` |

三个 slug 均满足：等于文件名主干、匹配 `^[a-z0-9][a-z0-9-]{2,40}$`、整干不等于 21 个 Windows 保留设备名之一（**全等比较、不作前缀匹配**，故 `console-x` 一类放行，实测见 §11）、不匹配 `^[MFC]\d{2}$`、`\d{4}`／`\d{1,2}-\d{1,2}`／`\d{8}` 三条日期形态命中数均为 0。

## 10. Task 13.6 禁项与年份扫描

扫描范围：`content/` 全部 5 个文件；**不含 `plan/` 与 `_qa_task13/`**（那里的说明性禁串与编号是对表证据，不在公开面，计入会产生假阳性）。

豁免边界（唯一一条）：仅 `date:` 行允许携带 ISO／四位年份，因为它是排序输入且永不进入任何输出文件。本包三篇都没有 `date` 行，故实际命中为 0；`_模板.md` 的示例行 `date: 2025-01-01` 正落在该豁免内，用以证明豁免可用而非空转。

命中计数（全部为 0）：`厨一枚`、`胡桃`、`新闻评价`、`作者：`、`记者：`、`来源：`、`出处：`、`Materials/`、`.docx`、`TODO`、`TBD`、`{{`、`}}`、素材 SHA-256 全串与任意 16 位片段、`2026`、ISO 形态 `\d{4}-\d{2}-\d{2}`、年份形态 `(19|20)\d{2}`、编号串 `[MFC]\d{2}`、零宽与控制字符。

年份扫描一律用 `(19|20)\d{2}` 而非裸 `\d{4}`（后者会在 `styles.css` 的 `#7a2424`、`0.9375rem`、`1.0625rem` 上误报，`R6` 与勘误表 E2 已把裸四位数字扫描列为禁用），且**不设任何年份豁免分支**——首页第三条经 R7 修订后全站已无公元年份。

## 11. 负向对照与反向对照（证明闸门有牙且不过宽）

变异全部作用在系统临时目录的 `content/` 副本上（`%TEMP%/t13-neg-*`、`t13-pos-*`），**真实 `content/` 与 `Results/` 未被触碰**（§12 的哈希前后一致即其证明）。

| 变异 | 期望捕获于 | 实测 |
| --- | --- | --- |
| 删一段（通讯 23→22） | 对表：段落数与逐段长度 | 捕获（paragraph_count／char_total／长度表三重翻红） |
| M02 的 `。` 换成 `.` | 对表：码点序列 | 捕获（`paragraphs[1].codepoints[29]` `U+3002`→`U+002E`；长度不变故由码点比较捕获，非长度门禁） |
| M01 电头后加第二个空格 | 正文区规则 第3条 | 捕获（exit 2） |
| F05 `她`→`他` | 对表：码点序列 | 捕获（`U+5979`→`U+4ED6`） |
| 把 C03 拆成两行 | 正文区规则 第1条 | 捕获（exit 2） |
| C06 `接口的位置就`／`应该考虑` 接缝插空格 | 长度 101 与码点比较 | 捕获（两者同时翻红） |
| C12 `只能在`／`Windows` 接缝插空格 | 长度 167 与码点比较 | 捕获（两者同时翻红） |
| `display_date: 2026年9月18日` | 正则与子串双重报错 | 捕获（§3 第8条正则先翻红，同年份形态扫描亦命中） |
| `closing_date` 当正文第 30 段 | 段落数 30 报错 | 捕获 |
| `slug` 改成 `M01` | 编号形态与文件名主干双重报错 | 捕获（§3 第4条主干不等先翻红） |
| `columns.md` 删 `commentary` 行 | 未知 `column`／注册表三行 | 捕获（§2 第1条"应恰为 3 行，实测 2"） |
| `columns.md` 加 `#columns` 表头行 | 首行不以 `message\|` 开头即报错 | 捕获（§2 首行规则） |
| 分隔线改成三处 | §格式合同"恰两处" | 捕获（exit 2） |

反向对照（必须放行，证明检查不过宽）：`slug=console-x`、`slug=aux-term`、`slug=null-set` **全部放行**（保留设备名只做整干全等）；`date: 2026-09-18` 出现在 `date:` 行上**放行**；`columns.md` 首行为 `message|新闻消息|news-message.html` **放行**。

13 例负向全部被对应检查捕获，5 项反向全部放行。

## 12. Task 13.7 变更边界审查

- **哈希不变**：`Results/` 六文件与 `Materials/` 三文件在 13.1 记录与本轮执行后**逐项相等**（九项全中），文件数量 6 与 3 不变，文件名大小写不变。
- **新增路径集合**：`_qa_task13/` 18 个文件（三个脚本＋`baseline/` 六副本＋`hashes_before.txt`＋`main_slices/` 三切片＋`tags.txt`＋两份 `extracted_*.json`＋`expected-spec.json`＋本 `report.md`）与 `content/` 5 个文件，与合同"交付物"一节逐项对齐，**无多余产物**（首轮 import 产生的 `_qa_task13/__pycache__/` 已删除，并已在 `compare.py` 置 `sys.dont_write_bytecode = True` 防其再生）。
- **未创建 `build/`**；**未修改 `deploy/`**（仍为 `_headers`、`site.zip`）；**未修改 `plan/`**（其最新 mtime 仍为 2026-10-01 22:53，早于本轮开工）；**未改动 `_qa_task1/`…`_qa_task11/`**（最新 mtime 仍为 2026-09-19 21:27）；`styles.css`／`script.js` 哈希不变。
- **只读性证明**：AST 静态审计逐一定位真实写操作（`extract_baseline.py` 9 处、`extract_sources.py` 1 处、`compare.py` 11 处），落点根集合只有两个——`_qa_task13/`（含 `baseline/`、`main_slices/`）与系统临时目录；对 `Results/` 与 `Materials/` 的全部访问都经由 `extract_baseline.py` 的 `load()`，其句柄模式恒为 `'rb'`。前后哈希比对一致即该点的机器证据。

## 13. Task 13.8 向 Task 14 交接

机读规格：`_qa_task13/expected-spec.json`，SHA-256 `e1018e2e3b87ffd77c7d86b27cb18e477184847e099d787cab88e71b6569eab5`（23039 字节）。它按 slug 给出 `column`、`column_label`、`list_page`、`output_file`、`title`、`byline`、`display_date` 及其在 `textContent` 中的位置、`date` 状态、`order`、有序段落数组与逐段长度、电头归属，以及基线 `<main>` **内部**切片的路径／偏移／字节数／哈希。Task 14 的 14.1 输入门禁与 14.4 完成条件可直接引用它。

三条 Task 14 必须复现的要求：

1. 详情页 `<main>` **内部**字节与 `main_slices/` 对应切片**字节级相等**——`main_slices/` 存的正是 interior，Task 14 消费 interior，两条标签行**不参与**该比较（它们由壳提供）。
2. `build/shell.html` 的字节来源为 `Results/news-message.html` 中 `<main>` 之外的字节**加上** `  <main class="main-content" id="main-content" tabindex="-1">` 与 `  </main>` 两条标签行；相对基线只允许两处编辑。
3. `_qa_task13/baseline/index.html` 必须是 2629 字节的新版首页。

排序全序（与 `Task14 §排序合同` 共用）：`date` 降序（缺失→未分组末尾）→ `order` 升序（缺失记整数 `0`）→ `column` 注册表序（`message`→`feature`→`commentary`，R11②）→ `slug` 升序。三条键依次用满，"缺 `order` 时直接跳到 `slug` 破序"是错误实现。

正文允许面与 `Task13 §正文区规则` 第 1–7 条逐字一致，两处任一侧改动都要同步另一侧。

遗留待办：三篇真实 `date` 待用户输入（可拒绝提供，届时按未分组处理且页面不显示日期，本包不代为猜测）；三个 slug 在本包定稿、Task 15 落地前仍有一次改名窗口，上线后改名即为制造死链，须另立任务处理跳转。

## 14. 退出码合同

`extract_baseline.py`、`extract_sources.py`、`compare.py` 与快照门禁共用：`0` 成功；`2` 输入或解析错误（未知键、重复键、空值、段落跨行、禁标记、`slug` 不合法、`display_date` 非正文子串、注册表格式错）；`3` 断言失败（副本哈希≠原件、双向对表出现差异、63 项长度不等、`Results/` 哈希前后不一致）；`4` 开工门禁失败（表 1／表 2 哈希不符、`Results/` 目录集合不等、`content/` 或 `_qa_task13/` 状态不合预期）。每条报错都给出文件、行号与命中的条款编号；非零退出时不留半份产物（`extract_baseline.py` 仅在门禁失败且本进程创建目录时清除 `_qa_task13/` 快照，绝不触碰 `Results/`）。

本轮实际触发记录：开工门禁 **exit 4** 一次（外来文件，见 §1），处置后转 0；`content/` 侧 **exit 2** 三次均为合同条款修正过程（评论页无电头被误判、`date:` 行年份豁免、`validate()` 参数），非缺陷遗留。

## 15. 完成定义逐条勾选

- [x] 表 1 六项与表 2 三项哈希在开工前后完全一致，`Results/`、`Materials/` 文件数量不变。
- [x] `_qa_task13/baseline/` 六份副本哈希与原件逐项相等（含 2629 字节新版 `index.html`），三页 `<main>` 内部切片、偏移、哈希与两条标签行原文均已记录。
- [x] `content/` 恰含 5 个文件：`columns.md`、`_模板.md`、`articles/` 下三个 `<slug>.md`。
- [x] 五个文件全部满足字节层合同（UTF-8 无 BOM、LF、无 TAB、无行尾空白、单 LF 结尾、无连续三空行、无零宽与控制字符）。
- [x] `columns.md` 三行注册表键／名／文件名唯一，栏目名为 `新闻消息`／`新闻通讯`／`新闻评论`，无 `新闻评价`。
- [x] 三份 md 的 `slug` 等于文件名主干、匹配正则、整干不等于 21 个保留设备名之一（全等比较，`console-x` 实测放行）、非 `^[MFC]\d{2}$`、三条日期形态命中为 0。
- [x] 三份 md 的 `title`、`byline` 逐字符等于 `Task1`；署名恰为 `蓝色空间`，无前缀。
- [x] 段落数为 4／23／29；评论页结尾行以 `end_date` 承载，逐字符等于 `（自然选择号9月18日）`。
- [x] 消息与通讯首段以 `**…**` 表示电头，其后 U+0020 计数恰为 1；评论页首段无电头。
- [x] 双向解析结果深度相等，0 处差异；63 项长度全中；合计 304／1545／2069 全中。
- [x] `Task1 §4／§5／§7` 每条高风险与已知异常都有对应校验结论；`安 装` 命中 0；"她"未被改写。
- [x] 三篇 `display_date` 逐篇等于钉定值（`9月18日`／`9月17日`／`9月18日`），均被证明是基线与反向两侧 `textContent` 的子串并给出位置；格式匹配且不含四位数字。
- [x] `date` 状态明确：三篇均为"未提供 → 未分组"，不存在推断而来的日期。
- [x] `content/` 禁项扫描除 `date:` 行的 ISO 之外命中为 0，豁免边界已写入 §10。
- [x] 负向 13 例全部被对应检查捕获，反向 5 项全部放行，真实 `content/` 与 `Results/` 未被变异脚本触碰。
- [x] 未创建 `build/`，未修改 `deploy/`、`plan/`、`styles.css`、`script.js`，未改动任何历史 `_qa_taskNN/`。
- [x] `_qa_task13/expected-spec.json` 与本报告"期望产物规格"一节一致，Task 14 可直接照它实现渲染而不必回读 Word。

**结论：Task 13 完成，验收通过。**
