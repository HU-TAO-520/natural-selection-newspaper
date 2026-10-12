# Task 17 重建打包与发布产物

## 后续有效合同补充 R13（2026-10-04）

当前发布集合增加构建器生成的 `404.html`。它进入 `Results/`、`manifest.pages` 和 zip，保持 schema 与字段形状不变，不进入 `manifest.columns`。数量公式更新为交付文件 `7 + N`、zip 条目 `8 + N`、HTML 页面 `5 + N`；当前 N=6 时分别为 13、14、11。`404.html` 计入 HTML 页，但只服务线上未知路径，不作为普通离线页面打开。

打包前将上一个已验证的 `deploy/site.zip` 复制到 `qa/_audit_20261004/` 留存。Direct Upload 仍由用户手工执行，打包脚本不调用 Cloudflare API。新部署必须在线验证未知路径（HTTP 404、错误页内容、根路径资源、导航）；失败时由用户在 Pages 恢复先前部署，本任务提供旧包作为恢复依据。线上验收尚未由本地模拟替代。

## 后续有效合同补充 R14（2026-10-05）

打包器使用显式 `main` 与 `easteregg` profile；默认仍为 main。两目标清单、ZIP 和上传说明互不复用，预览 `columns=[]`、文章数 0。有效数量及固定文件唯一取自 Task20 §4.2：主站 `10+N／11+N／6+N`，预览 `4／5／2`。`_headers` 只进入对应 ZIP。两包仍须双向比对磁盘/清单/ZIP、零目录项、字典序与可复现元数据；不得用 glob 扩展集合。旧 R13 数值保留为历史。

## 任务定位

本文件把归档总方案中的 Task 17 细化为一个可独立执行、独立验收的工作包。Task 17 交付三样东西：机器可读的页面清单 `deploy/manifest.json`、可复现的部署包 `deploy/site.zip`、以及把两者钉在一起的 `build/pack.py`。它同时是整轮归档的**发布边界**——在此之前没有任何一次上传是被允许的，在此之后上传动作由用户手工执行，本包止于产物与核对单。

Task 17 的存在价值集中在一点：**证明"要传的东西"和"目录里的东西"是同一套**。第一版出过一次真实事故——Cloudflare 上传向导只传上了 `styles.css` 一个文件就点了部署，而当时没有任何机制能察觉。事后回看，"数一下文件个数"也拦不住它，因为上传成功的清单本身没被核对。本包的解法不是加提醒，而是加两道机械证据：打包前 `Results/` 与清单必须**双向集合相等**，打包后必须把 zip **解压回临时目录逐文件比哈希**。

本包不写 `Results/`（Task 15 是唯一写入者），不改样式（Task 16），不改 `deploy/_headers` 的内容，不做任何上传动作，也不修改构建器 `build/build.py`（Task 14 拥有）。

## 实测基线（2026-09-30，本包立论的事实依据）

| 项 | 实测值 |
| --- | --- |
| `deploy/site.zip` | 15362 字节，`1863d8f7a6b3e9a1ff31fe4ab49fa22d953e856fb9ea23aaf0cbbece4365c90e`；**7 个条目全部位于压缩包根**，与 v1 的 `Results/` 六文件 + `_headers` 逐项哈希一致；压缩方式 `ZIP_DEFLATED`(8)；条目时间戳 `(2026,9,19,22,28,24)`。注意其 `index.html` 条目仍是 R7 修订**之前**的 2612 字节 `73f49fd8…`（含 `报社成立于2024年。`），因此这个包既缺归档结构、也缺那条文本改动，必须由本包重做 |
| `deploy/_headers` | 518 字节，`b0273f2ff60c2c95d24899b8bd8a72ae050d233bc38e8b9903a28421d6f9ba7a`；CSP `default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests`，另含 `X-Frame-Options: DENY`、HSTS、`nosniff`、`Referrer-Policy`、`Permissions-Policy` |
| 根目录 `Results.zip` | 36421 字节，`f41b021cf874621da785eaca206c1e324549ced340571da1076303ac10a9b5f3`；**含 `Results/` 目录条目与 7 个带前缀条目**，其中 `Results/styles.css` 为 12062 字节 `14a4a204f62e5c59…`（早于当前 `2c23817299492ea9…`／12401 字节的旧版本）。若把它直接上传，Pages 会在根下生成 `Results/` 目录而首页 404 |
| `Results/` 现况 | 打包时应为**九个文件**（六壳 + 三详情页）。核验当天实测到目录内另有 `d9e2b35cb26c98dfbff2d77290cf1f0a.txt`（40 字节，`2180fd91c28fe23a9d3cdf0c435cd6d531f50445ecf472eed6b945c3cf680258`，内容为一串 40 位十六进制 SHA-1）——**用户已确认是其本人放入的个人校验文件**，但它不属于交付集合。本包**不删除、不移动、不改名**，只把它作为"清单外文件"触发退出码 4 并报告，处置由用户当场决定 |
| zip 可复现性 | 默认行为下 `ZipInfo` 继承文件 mtime，因此"重新打包一次"必然产生不同字节。这是本包必须消除的一个真实缺陷，见 §打包合同 第 5 条 |

最后一行还有一条推论要写进历史说明：**Task 13／15 里"两次构建哈希相等"这类断言只适用于 `Results/`，不适用于 `site.zip`**——除非 zip 时间戳被固定。二者若不区分，将来会有人拿"zip 每次都不一样"去质疑构建器的确定性，或反过来以为 zip 相等就证明过内容相等。

## 目标

- 用 `build/pack.py` 一条命令产出 `deploy/manifest.json` 与 `deploy/site.zip`，并在同一次运行内完成打包前 preflight 与打包后解包回验。
- 让 `manifest.json` 成为页面集合的**唯一机器真值**：Task 18 的 A1b 集合比对、Task 19 的回归页遍历、上传后的人工核对，全部以它为准；禁止任何下游用目录通配推断页集合。
- 让 `site.zip` 成为**可复现产物**：固定条目时间戳与压缩参数后，同一份 `Results/` 连续打包两次得到相同字节（哈希相等）。
- 固化"全部条目位于压缩包根、不含目录条目、`_headers` 必须在场、无路径分隔符"这四条形态约束，并有机械回验。
- 以 `Results.zip` 为反面样本，把"带前缀目录的包为什么是危险的"写成可断言的形态检查，而不是口头提醒。
- 给出处置 `Results.zip` 与那个清单外 `.txt` 的**经用户确认**方案（本包不删除、不移动、不改名任何文件）。
- 产出一份人读的 `deploy/UPLOAD.md` 核对单，让"9 个交付文件 + `_headers` = 10 个 zip 条目，其中 HTML 页面 7 张"成为肉眼可核的清单。

## 前置条件与后续依赖

- 合同前置条件：Task 12 已完成（R2 清单驱动交付集合、manifest 属部署期文件且永不进 `Results/`）；Task 15 已切换并登记 v2 九文件基线；Task 16 已完成样式并交付 `styles.css` 的 v2 哈希。
- 输入前置条件：`Results/` 九文件哈希与 `qa/_qa_task16/report.md` 一致；`build/build.py` 存在且 `qa/_qa_task14/out/` 校验可用；`deploy/_headers` 哈希等于实测基线值。
- 直接依赖本包的工作：Task 18（闸门，A1b 依赖 `manifest.json` 存在且格式稳定；N 组依赖本包的解包回验实现）、Task 19（线上复验依赖用户按 `UPLOAD.md` 完成上传）。
- 阻断规则一：`Results/` 存在任何**清单外文件**（当前就有一个）时，打包必须以退出码 4 终止。构建器不猜、不忽略、不清理。
- 阻断规则二：`deploy/_headers` 内容任何改动都属于安全策略变更，须用户明确批准并单独记录；本包默认它逐字节不变。
- 阻断规则三：本包不得执行任何上传、不得调用 Cloudflare API、不得改动 DNS 或子域名，也不得为了"验证线上"而发布未经 Task 18／19 验收的包。
- 阻断规则四：若 `Results/` 六项交付文件或三个详情页哈希与 Task 15／16 记录不符，停止并回流，不得"以现况为准"生成清单。

## 交付物与文件所有权

Task 17 执行时**新建**：

- `build/pack.py`（唯一打包与回验入口；`build/` 内本包只拥有这一个文件）
- `deploy/manifest.json`（机器可读清单）
- `deploy/site.zip`（部署包，覆盖 v1 版本）
- `deploy/UPLOAD.md`（人读核对单）

Task 17 执行时**新建**（QA 产物，位于 `Results/` 与 `deploy/` 之外）：

- `qa/_qa_task17/preflight.txt`、`qa/_qa_task17/verify_pack.py`、`qa/_qa_task17/mutate_pack.py`
- `qa/_qa_task17/report.md`

本包**不建立任何接收目录**：本包不搬动任何文件，清单外文件的去处只由用户本人决定。

Task 17 **不创建、不修改、不删除**：

- `Results/` 下任何文件（**只读**；包括不得删除那个清单外 `.txt`）
- `deploy/_headers`（只读，除非用户单独批准安全头变更）
- `build/build.py`、`build/shell.html`、`build/partials/`（Task 14 拥有）
- `content/`、`plan/`、`Materials/`、`qa/_qa_task1/` … `qa/_qa_task16/`

根目录 `Results.zip` 的处置（改名归档或删除）**必须先取得用户确认**，未确认前原样保留并在 `report.md` 标注为高危混淆源。

## 输入与权威顺序

1. `build/build.py` 的装配函数（import 后调用）—— **页集合的唯一推导方**：应有页面 = 六个壳文件 ∪ 由 `content/articles/*.md` 装配出的 `article-<slug>.html`。`Results/` 磁盘实测与 `content/` 推导都是**被比较的两边**，不是推导方；三者不一致时以 `build.py` 的装配结果为基准并回流（缺页→Task 15／14，清单未重生成→本包），不存在"取磁盘所见即真值"的第三条路；禁止 `glob('Results/*')`、`glob('Results/*.html')` 或任何目录通配充当页集合来源。
2. `Results/` 九文件 + `deploy/_headers` —— **字节实体来源**：本包把磁盘字节原样写进 zip 并实测其哈希，但"应有哪些页"不由磁盘枚举决定。
3. `plan/Task12 §R2` 与 `plan/Task14 §输入只读证明` —— "集合双向相等"与"清单来源为构建器而非目录通配"的合同依据。
4. `plan/Task15 §给 Task 17 的交接` —— 打包集合 = 九文件 + `_headers`、禁止目录通配。
5. `plan/Task16 §给 Task 17 的交接` —— `styles.css` v2 哈希、样式已完成的确认。
6. 本包实测基线（上一节）—— zip 形态与 `_headers` 哈希的参照。
7. `plan/Task0 §离线 file:// 全局约束` —— 决定清单里只能出现自包含静态页，任何"运行时数据文件"入包即为违约。

冲突时以更高优先级为准并回流；本包不修改上游合同，也不放宽任何一条 preflight。

## `manifest.json` 契约

结构固定，键顺序固定，LF 行尾，UTF-8 无 BOM，缩进两个空格，**不含时间戳、不含绝对路径、不含 mtime、不含构建器版本**：

```json
{
  "schema": 1,
  "columns": [
    { "key": "message", "label": "新闻消息", "list": "news-message.html", "articles": [
      { "slug": "school-course-volunteer", "page": "article-school-course-volunteer.html", "title": "我校启动校本课程志愿填报" }
    ] }
  ],
  "pages": [
    { "path": "index.html", "bytes": 2629, "sha256": "971e57a5…" }
  ],
  "config": [
    { "path": "_headers", "bytes": 518, "sha256": "b0273f2f…" }
  ],
  "counts": { "pages": 9, "html": 7, "config": 1, "articles": 3 }
}
```

规则：

1. `pages` 恰好等于 `Results/` 的应有集合（6 壳 + N 详情页），按 `path` 字典序排列；每一项的 `bytes` 与 `sha256` 必须实测得出，不得由上游文档转抄。
2. `config` 只允许 `_headers` 一项，且**不得**把 `manifest.json` 自身、`UPLOAD.md`、`site.zip` 写进 `pages`。
3. `columns` 为可读性冗余（供 Task 19 遍历列表页与详情页配对）；其 `articles` 顺序必须等于列表页实际条目顺序，二者不一致即为本包缺陷。
4. `counts.pages` 是 `UPLOAD.md` 与人工核对的**唯一"文件数"数字**（它只回答"交付文件有几个"，不回答"页有几张"、也不回答"包里有几个条目"），等式恒为 `counts.pages == len(pages)`；`counts.html == len([p for p in pages if p.endswith('.html')])`（当前 9 与 7），且 `pages + config` 条目数 == zip 内文件条目数。**三个数字各自独立、不得互相顶替、不得合并成一个**：交付文件 `6 + N`（= `counts.pages`，当前 9）、zip 文件条目 `7 + N`（= `counts.pages + counts.config`，当前 10，含 `_headers`）、站点 HTML 页面 `4 + N`（= `counts.html`，当前 7）。Pages 后台数的"页"是 `html`，不是 `pages`。
5. 内容源里的 `date` **不得**出现在 manifest 任何位置（`Task12 R5①`：排序键永不输出）。`slug` 只以"已编码进详情页文件名"的形式出现是允许的（`article-<slug>.html` 本身即公开 URL）。
6. manifest 是部署期文件，位置固定为 `deploy/manifest.json`，**永不进 `Results/`、永不进 zip**（zip 内出现 `manifest.json` 即 N 组失败）。

## 打包合同

`python build/pack.py`（子命令：`manifest`／`zip`／`verify`／`all`，默认 `all`）

1. **preflight（先于任何写盘）**：重算 `Results/` 全部文件 → 与**第 2 条由 `build.py` 装配函数推导出的应有页集合**双向比较（缺文件、多文件、子目录、大小写不符各自报明）；任何清单外文件即退出码 4，并打印"该文件不属于本项目任何任务，请勿删除，请由用户确认处置"。
2. **集合来源（唯一推导方）**：页集合只由 `build/build.py` 的装配函数推导（import `build` 复用其排序与命名，**不得**重写一份命名逻辑，也不得 `glob('Results/*.html')`、不得以 `Results/` 或 `content/` 的目录枚举结果当作集合）。判据：同一份 `content/` 下，`build.py` 的装配出口、`manifest.pages` 与 zip 条目三者必须两两相等；任何一处用磁盘枚举代替推导，即为形态缺陷。这是防止两个包各写一套"什么算一个页面"的唯一办法。
3. **zip 形态**：所有条目位于压缩包根；条目名不含 `/`、`\`；不含目录条目（`Results/` 这种零字节条目一律视为缺陷）；顺序为 `sorted(名)`；`ZIP_DEFLATED`，压缩级别固定。
4. **包含内容**：`pages` 全部 + `config` 全部（`_headers`）。不含 `manifest.json`、`UPLOAD.md`、`site.zip`、`__pycache__`、任何 `.txt`。`_headers` 与 `manifest.json` 同属部署期文件：**只进 zip，绝不进 `Results/`**；preflight 在 `Results/` 内发现名为 `_headers` 的文件即按清单外文件以退出码 4 终止（zip 要求它在场、`Results/` 禁止它在场，两条必须同时成立，缺一即本包缺陷）。
5. **可复现**：每个条目的 `ZipInfo.date_time` 固定为常量 `(1980, 1, 1, 0, 0, 0)`；不写入 zip comment／extra field；`create_system` 固定。于是**同一份 `Results/` 连续打包两次必须得到相同 SHA-256**。这条是新增的、v1 不具备的能力（v1 的 `site.zip` 携带 `2026-09-19 22:28:24` 时间戳，每次重打包字节都不同）。
6. **回验（写盘之后，同一进程内）**：用 `zipfile` 把 `deploy/site.zip` 解压到 `tempfile.mkdtemp()`，断言（a）文件条目集合 == `pages ∪ config`，(b) 逐文件 SHA-256 **与字节数**都相等：既等于磁盘源文件的实测值，也等于 `manifest` 该条目登记的 `sha256` 与 `bytes`（清单承诺了字节数，回验只比哈希就等于承诺无人核），(c) 无任何条目名含路径分隔符或目录条目，(d) `_headers` 在场且哈希等于基线，(e) 条目总数 == `counts.pages + counts.config`。任一项失败即退出码 3 并删除半成品 zip（删除仅限本包自己刚写出的 `site.zip`，不触碰其它文件）。
7. **原子性**：`manifest.json` 与 `UPLOAD.md` 在 zip 回验成功后才写；回验失败时三者都不落盘（避免"清单说 9 个文件、包里只有 8 个"的分裂状态）。

## `UPLOAD.md` 契约

给人看的核对单，随包生成、随包更新，内容仅三类：

1. 三个数字，各自含义必须写清，**不得混用"页"与"文件"**：交付文件数 `6 + N`（当前 9）、zip 文件条目数 `7 + N`（当前 10，含 `_headers`）、站点 HTML 页面数 `4 + N`（当前 7；Cloudflare Pages 后台的 "Pages" 计数按 HTML 算，与前者不是同一个数）。另附 `site.zip` 的 SHA-256 与字节数。
2. 清单：`pages` 与 `config` 的逐项路径与哈希前 16 位，按字典序，与 zip 内顺序一致。
3. 操作前提（沿用既有决定，不新提要求）：Direct Upload 由用户手工执行；保持关闭 Auto-Minify、Rocket Loader（会改写 `script.js`，我们验的是原文件）与 Bot Fight Mode（易误伤大陆正常读者 UA）；`.pages.dev` 口令保护已关闭；上传后三个数字**分别**核对，不得混用"页"与"文件"：`Results/` 交付文件 `6 + N`（当前 9）、zip 内文件条目 `7 + N`（当前 10，含 `_headers`）、Pages 后台的 "Pages" 计数 `4 + N`（当前 7，它只数 HTML）。

**不得**在 `UPLOAD.md` 里写时间戳、机器路径或"最后更新人"。

## 子任务拆分

### Task 17.1 复核输入并登记清单外文件

输入：`Results/`、`qa/_qa_task15/hashes_after.txt`、`qa/_qa_task16/report.md`、`deploy/_headers`。

执行：

1. 重算 `Results/` 全部文件哈希（当前实测为 7 项）。
2. 与"应有九文件集合"比较，**逐一列出多出的项**（当前会命中 `d9e2b35cb26c98dfbff2d77290cf1f0a.txt`）。
3. 读出其内容与字节数登记在案，**不删除、不移动、不改名**。
4. 重算 `deploy/_headers`，与实测基线 `b0273f2f…ba7a` 相等。
5. 重算九文件哈希并与 Task 15／16 记录逐项比对。

输出：`qa/_qa_task17/preflight.txt`。

完成条件：差异项完整列出且被显式判定为"需用户处置"；`_headers` 与九文件哈希全部可追溯。

### Task 17.2 实现 `build/pack.py` 的 preflight 与页集合推导

输入：`build/build.py` 的装配出口、§manifest 契约、§打包合同 1–2。

执行：

1. `import` 构建器以复用排序与命名（不重写）。若构建器未导出所需出口，回流 Task 14 补一个纯函数出口，**不在 `pack.py` 里复制一份命名逻辑**。
2. 实现双向集合比较与四类错误分类（缺、多、子目录、大小写）。
3. 清单外文件 → 退出码 4；缺文件 → 退出码 2。

输出：preflight 模块。

完成条件：在当前真实目录上跑出退出码 4 并只点名那个 `.txt`；把该文件移到别处后（用户处置后）preflight 返回 0。

### Task 17.3 生成 `deploy/manifest.json`

输入：preflight 通过的页集合、§manifest 契约六条。

执行：

1. 实测 `bytes` 与 `sha256` 填 `pages`／`config`；按 `path` 字典序。
2. 从 `content/` 读 `title`／`slug`／栏目归属填 `columns`，并核对 `articles` 顺序 == 列表页实际顺序（解析 `news-*.html` 的 `entry-list__link` 序列）。
3. 断言无 `date` 值、无 ISO 串、无绝对路径、无时间戳。
4. 序列化：固定键序、两空格缩进、LF、单一末尾 LF、UTF-8 无 BOM。

输出：`deploy/manifest.json`。

完成条件：`counts.pages == len(pages) == 9`；`columns` 三栏各一条且顺序与列表页一致；连续生成两次文件哈希相等。

### Task 17.4 实现 zip 打包与可复现性

输入：§打包合同 3–5。

执行：

1. `ZipInfo` 显式构造，`date_time` 固定常量，`compress_type=ZIP_DEFLATED`，`external_attr` 统一，无 comment／extra。
2. 条目名 = 裸文件名（断言不含分隔符、不以 `/` 结尾、非目录条目）。
3. 写入顺序 `sorted()`。
4. 同一输入连续打包两次，SHA-256 相等。

输出：`deploy/site.zip`。

完成条件：两次打包哈希相等；zip 内条目恰 10 个文件条目、0 个目录条目。

### Task 17.5 实现解包回验（本包自检；Task 18 的 N 组另实现一份独立比对）

输入：§打包合同 6。

执行：

1. `zipfile` 解压到临时目录（绝对路径、用完即删、只删自己创建的目录）。
2. 逐条目集合、SHA-256 与字节数三者一并比较（断言 a–e，含 (b) 的 `bytes` 相等）。
3. 失败即退出码 3 并删除半成品 zip。
4. 显式断言 zip 内**没有** `manifest.json`、`UPLOAD.md`、任何 `.txt`、任何 `Results/` 前缀条目。

输出：回验结果与 `qa/_qa_task17/report.md` 的回验一节（Task 18 的 N 组自行另做一份，不调用本节代码）。

完成条件：当前包全绿；对 `Results.zip` 跑同一套回验必须**逐项失败**（它就是天然的负面样本，见 17.6）。

### Task 17.6 用两个历史包做对照

输入：`Results.zip`（旧）、新生成的 `site.zip`。

执行：

1. 对 `Results.zip` 跑回验：应命中"含目录条目""条目名带 `Results/` 前缀""`styles.css` 与当前源文件哈希不符""缺 `_headers`""文件条目 6 ≠ 期望 9（或 v1 的 6+1）"。
2. 逐条记录，作为"形态检查为什么必须存在"的实证，写入 `report.md`。
3. 明确结论：若把 `Results.zip` 上传，站点首页 404 且样式退回旧版——这是可复现判断，不是猜测。

输出：对照记录。

完成条件：五类失败全部被捕获且指向正确条目。

### Task 17.7 过期与来历不明文件的处置（须用户确认）

输入：17.1 的清单外文件、根目录 `Results.zip`。

执行：

1. 向用户报告两项：`Results/d9e2b35cb26c98dfbff2d77290cf1f0a.txt`（用户已确认为其本人放入的个人校验文件）与 `Results.zip`（实测为带前缀的过期包）。
2. 只报告、只等待：**由用户本人**把它移出 `Results/`。本包不搬动、不删除、不改名，`build/pack.py`（含其子进程与临时目录）对 `Results/` 与 `deploy/` 之外的任何文件零写入，对该 `.txt` 更零操作——这与 `Task12` 的处置决定一致（"不得由助手代为删除或移动，须用户在场确认"），也与本包 :60／:292 的只读承诺一致。删除不在选项内；"原样留在 `Results/`"也不是可用状态——preflight 会一直以退出码 4 拒绝，硬绕过去就等于放弃唯一能发现"包里多了东西"的检查。
3. 用户本人移出后，重跑 17.2 的 preflight，确认 `Results/` 回到九文件集合。
4. 在 `report.md` 记录处置决定、执行时间与前后哈希（时间只写报告，不写产物）。

输出：经批准的处置记录。

完成条件：`Results/` 恰为九文件，且无任何本包自行删除、移动或改名未知文件的操作痕迹。

### Task 17.8 变异对照、变更边界审查与交接

输入：`qa/_qa_task17/mutate_pack.py`、`verify_pack.py`。

执行：对**副本目录**注入下列违约，要求指定断言翻红，且每条变异先自证"确实构成违约"：

1. 删掉一个详情页 → preflight"缺文件"红（对应 v1"只传上 `styles.css`"事故的最小复现）。
2. 在 `Results/` 放一个 `notes.txt` → preflight 退出码 4；**在 `Results/` 放一个名为 `_headers` 的文件**（zip 要求它在场，最容易被顺手复制进交付根）→ 同样退出码 4，两类都不许被排除逻辑放过。
3. 创建 `Results/articles/` 并放入一页 → 子目录错误。
4. 把 `styles.css` 改名成 `Styles.css` → 大小写错误。
5. 用 `Results.zip` 当包体跑回验 → 目录条目 + 前缀 + 哈希不符三重红。
6. 打包时漏掉 `_headers` → 回验 (d) 红。
7. 把 zip 时间戳改回继承 mtime → 两次打包哈希不等（可复现性红）。
8. 把 `manifest.json` 塞进 zip → 集合红。
9. 篡改某个 `sha256` 字段 → 与实测不符红。
10. 在 manifest 里写入 `date: 2026-09-18` → R5① 扫描红。
11. `columns.articles` 顺序与列表页实际顺序交换 → 顺序一致性红。
12. 只改 manifest 不重打包（分裂状态）→ zip 与 manifest 集合比较红。

之后重算九文件与 `_headers` 哈希，确认本包未触碰 `Results/`。

输出：变异对照结果 + 交接。

完成条件：12 类全捕获；`Results/` 与 `_headers` 哈希不变；向 Task 18 交付 A1b/N 组的实现入口与向 Task 19 交付 `UPLOAD.md`。

## 验证方法

1. **只读证明**：本包开工与完工各跑一次，`Results/` 九文件与 `deploy/_headers` 的 SHA-256 逐项相等；`build/build.py` 等 Task 14 文件哈希不变。
2. **preflight 严格性**：当前目录上必须先出现退出码 4（因为确有清单外文件），处置后才可能为 0——"第一次就绿"反而是异常，说明 preflight 没在看目录。
3. **可复现**：`manifest.json` 连续生成两次哈希相等；`site.zip` 连续打包两次哈希相等（这是 v1 不具备的能力）。
4. **形态**：zip 内 0 个目录条目、0 个含分隔符的条目名、`_headers` 在场、条目数 == `counts.pages + counts.config`。
5. **回验独立性**：回验用 `zipfile` 读盘 + `hashlib` 实测，不复用打包时的内存对象（否则打包与回验共享同一个错误）。
6. **manifest 与真实文件**：逐条把 `pages[i].sha256` **与 `pages[i].bytes`** 同磁盘实测比较（两个都要，缺一即清单的承诺没被核完）；反向把磁盘每个文件都必须在 `pages` 中出现。
7. **日期泄漏**：manifest、`UPLOAD.md`、zip 三个对象中扫描 `date` 值与 `YYYY-MM-DD`，命中为 0。
8. **对照实验**：17.6 对 `Results.zip` 的五类失败逐项命中，证明形态检查不是空跑。
9. **变异对照**：17.8 的 12 类全部被指定断言捕获。
10. **人工可读**：只看 `UPLOAD.md` 能回答"要传几个文件、包多大、包的哈希是多少、当前 N 等于几"。

## 变更边界

### 必须完成

1. preflight 双向集合比较实现，并在真实目录上如实报错。
2. 页集合来源为构建器装配出口，不是目录通配。
3. `manifest.json` 六条契约全部满足，两次生成哈希相等。
4. zip 时间戳固定、可复现，两次打包字节相等。
5. 解包回验 (a)–(e) 全部实现并独立读盘。
6. `Results.zip` 作为负面样本跑通五类失败。
7. 未知文件与过期包的用户确认处置流程走完，且全程无擅自删除。
8. 12 类变异对照全捕获。
9. `UPLOAD.md` 核对单产出并与 zip 实际内容一致。
10. 只读证明：`Results/` 与 `_headers` 哈希不变。

### 明确不做

- 不删除、不移动、不改名任何来历不明的文件（含那个 `.txt`）与历史包；**"用户批准"也不构成本包可以代动手**——批准的内容是"由用户本人去搬"，本包永远只报告、只等待。
- 不改 `Results/` 任何内容，不"为了让 preflight 通过"而临时隐藏文件。
- 不修改 `deploy/_headers` 内容（安全策略变更须单独批准）。
- 不重写页集合命名／排序逻辑，不复制构建器的规则。
- 不上传、不调用 Cloudflare API、不改子域名、不动 DNS 或访问口令。
- 不把 `manifest.json`／`UPLOAD.md`／`site.zip`／QA 产物放进 `Results/` 或放进 zip；**不把 `_headers` 放进 `Results/`**（它只进 zip，见 §打包合同 第 4 条与 §manifest 契约第 2 条：`Results/` 内出现 `_headers` 即清单外文件、退出码 4）。
- 不在任何产物里写时间戳、绝对路径、机器名、"构建人"。
- 不引入第三方打包库（`zipfile` 足够），不引入 `pip`、`npm`、CI 配置。
- 不做 zip 分卷、不留 `.bak`、不加 zip comment。
- 不为"以后可能有几百页"预先设计分页清单、增量打包或索引结构。
- 不自动打开浏览器、不自动校验线上 URL（那是 Task 19）。

## 异常处理

- **preflight 发现清单外文件**：报告并停下。判据是"它不属于任何任务的产物集合"；先确认来历（询问用户），移动或删除都由用户决定。绝不"打包时顺手排除"——那正是让垃圾长期留在部署根的原因。
- **preflight 一次就通过**：先怀疑 preflight 没真在看目录（尤其首次运行前已知存在 `.txt`）。用一个已知多出的文件自测，再信任它的结论。
- **zip 与 manifest 不一致**：视为本包最严重的可发生缺陷（分裂状态）。做法是回滚三个产物（只删自己刚写的 `site.zip`／`manifest.json`／`UPLOAD.md`），重跑 `all`。
- **`_headers` 哈希变了但没人承认改过**：立即停止并报告——它是安全策略文件，意外变更比缺文件更值得警惕。
- **两次打包不等**：逐条比对 `infolist()` 的 `date_time`、`external_attr`、`create_system`、`extra`，找出仍在继承 mtime 的那一项；不要用"反正内容一样"搪塞。
- **回验通过但上传失败**：属外部因素（网络、向导、账户）。此时证据链已经完整（zip 哈希 + 条目清单 + `UPLOAD.md`），下一步是重新上传并核对上传成功清单条目数 = `6 + N`，而不是重跑构建。
- **Pages 上传成功清单与 zip 条目不符**：这是 v1 事故的现场形态。必须当场中止发布流程并报告差异条目，不要"先上线再看"。
- **用户希望保留 `Results.zip`**：允许，原样保留并登记；同时 `report.md` 里写明它是高危混淆源（带前缀 + 旧 CSS）。
- **未来新增文章后 zip 体积增长**：正常。核对单只报条目数与哈希，不报"预期大小"，避免体积被当成断言。

## 常见返工风险

- 用 `glob('Results/*')` 推页集合：那个 `.txt` 会一路活到 CDN 上，而 preflight 永远发现不了多余东西，因为它自己就是那个多余的东西。
- 在 `pack.py` 里重写一份"什么算一个页面"的规则，与 `build.py` 各说各话——页面命名一变，两包立刻分裂。
- 忘记固定 zip 时间戳，于是"可复现"这条断言永远红，或者干脆被放弃，从此没人再比较包哈希。
- 回验复用打包时的内存对象，等于自己给自己打分。
- 只比文件个数不比集合：8 页缺 1 + 多 1 时数量看起来正确，站点却是死链。
- 把 `manifest.json` 打进 zip（它含 SHA-256，等于把校验表随货发出且必然与包内容互相矛盾），或把它放进 `Results/` 触发 `Task0` 禁 JSON 入根的禁令。
- 在 manifest 里"顺手"带上 `date` 方便排查——`Task12 R5①` 就此作废，年份从部署产物泄漏。
- 让 `columns.articles` 顺序按 slug 排而列表页按日期排，两处的"同一件事"给出两个答案。
- 为省事直接删除来历不明文件（本包明令禁止；v1 也没人授权过删除）。
- 在 `UPLOAD.md` 写死"9 个文件"而不是从 `counts` 生成——加一篇文章后核对单立刻说谎，比没有核对单更糟。
- 擅自改动 `_headers`（例如"加上缓存头更快"）而未经批准。
- 打包成功就以为发布成功：v1 的教训正是"本地产物正确、上传结果不完整"。

## 完成定义

Task 17 只有在以下条件全部满足时才算完成：

- [ ] `build/pack.py`、`deploy/manifest.json`、`deploy/site.zip`、`deploy/UPLOAD.md` 建立；`build/build.py` 等 Task 14 文件哈希不变。
- [ ] 开工时 preflight 如实以退出码 4 点名 `Results/` 内的清单外文件，且本包未删除、未移动它。
- [ ] 用户就 `.txt` 与 `Results.zip` 作出处置决定，`qa/_qa_task17/report.md` 留有前后哈希与决定内容。
- [ ] 处置后 `Results/` 恰为九文件，preflight 返回 0，缺／多／子目录／大小写四类错误各有实现路径。
- [ ] `manifest.json` 的 `pages` 与磁盘实测双向相等；`counts.pages == 9`；`config` 仅 `_headers`；无 `date`／ISO／时间戳／绝对路径。
- [ ] `manifest.json` 连续两次生成 SHA-256 相等；`columns.articles` 顺序与三张列表页实际条目顺序一致。
- [ ] `site.zip` 内 10 个文件条目、0 个目录条目、无条目名含路径分隔符、`_headers` 在场且哈希等于基线值。
- [ ] `site.zip` 连续两次打包 SHA-256 相等（zip 时间戳固定为常量，且已验证 `date_time` 不再继承 mtime）。
- [ ] 解包回验 (a)–(e) 全通过，且回验独立读盘。
- [ ] 对 `Results.zip` 的对照实验命中五类失败（目录条目、前缀、旧 CSS 哈希、缺 `_headers`、集合数量）。
- [ ] 17.8 的 12 类变异全部被指定断言捕获，每条变异先自证"确实构成违约"。
- [ ] `UPLOAD.md` 的数字与清单由 `counts`／`pages` 生成，不含硬编码页数与时间戳。
- [ ] 完工时 `Results/` 九文件与 `deploy/_headers` 哈希与开工时逐项相等。
- [ ] 本包未执行任何上传、未调用外部服务、未修改 `_headers`。

## 后续任务交接

- **给 Task 18**：`deploy/manifest.json` 即 A1b 的比对基准（页集合、`bytes`、`sha256`）；本包向 Task 18 交付的是 **zip 形态不变量清单**（条目全在压缩包根、0 目录条目、0 含分隔符条目、`_headers` 在场、无 `manifest.json`／`UPLOAD.md`／`.txt`／`__pycache__`、时间戳固定）与**逐条目哈希与字节数清单**（`pages`＋`config` 全量）；**N 组不得调用 `build/pack.py verify`**——闸门不得把被测对象的自我声明当验收（同 `Task18 §任务定位` 的"被告不当法官"），N 组必须**自行**用 `zipfile` 解压到临时目录，独立做一遍解包比对（集合、逐文件 SHA-256、逐文件字节数、形态），与本包的自检是两条互不知情的链；17.8 的 12 类变异清单可并入其变异矩阵；另需交付"zip 可复现（时间戳固定）"与"`Results/` 两次构建相等"是**两类不同断言**的区分说明。
- **给 Task 19**：`UPLOAD.md` 是唯一的人工核对入口；回归页遍历以 `manifest.pages`／`columns` 为序，不得自行扫描目录。线上复验要核对的是**三个不同的数字**，不得混用"页"与"文件"：交付文件 `6 + N`（当前 9）、zip 文件条目 `7 + N`（当前 10，含 `_headers`）、HTML 页面 `4 + N`（当前 7）。三者口径不同是因为 `_headers`、`styles.css`、`script.js` 都不是"页"：`_headers` 只进 zip、不进 `Results/`，`styles.css`／`script.js` 是文件而非页面，故 zip 条目比交付文件多 1、HTML 页数比交付文件数少 2。上传后若发现条目缺失应中止并报告差异，不做补救式重传。
- **给用户**：产物已就绪——`deploy/site.zip`（含哈希与条目数）、`deploy/UPLOAD.md`（核对单）、`deploy/manifest.json`（机器清单）。上传由你手工执行；建议保持 Auto-Minify、Rocket Loader、Bot Fight Mode 关闭。两个待处置项（`.txt` 与过期 `Results.zip`）需要你点头，本包没有替你删任何东西。
