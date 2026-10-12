# Task 17 执行报告：重建打包与发布产物

执行时间：2026-10-02 05:03–05:49（UTC）／13:03–13:49（本地）。合同依据：`plan/Task17-重建打包与发布产物.md`。

结论：**Task 17 完成并验收通过**。52 条独立回验断言 0 失败，13 类变异全部被指定断言捕获，
真实树 29 项指纹在开工、变异中、完工三个时点逐项相等。发布边界已就绪，上传动作仍待用户手工执行。

## 0. 交付物

| 文件 | 字节 | SHA-256 | 归属 |
| --- | --- | --- | --- |
| `build/pack.py` | 本包新增 | 唯一打包与回验入口 | Task 17 |
| `deploy/manifest.json` | 2644 | `9ef9eec9501eda39c8a8a049ca31464a8ab7854e6ef1a4c2cda54ef7e23c69f2` | Task 17 |
| `deploy/site.zip` | 18774 | `c9b6b72ad58b8abc16be39d80c0494d4f6e6aa1663f634f5c51fac1717868007` | Task 17（覆盖 v1） |
| `deploy/UPLOAD.md` | 2945 | `6353a782e06eec2cc64ac082934149a04be510d6b1149154c0edbe665a45bc7b` | Task 17 |
| `_qa_task17/preflight.txt` | QA | 17.1 输入登记 | Task 17 |
| `_qa_task17/verify_pack.py` + `verify_result.txt` | QA | 独立回验链（52 断言） | Task 17 |
| `_qa_task17/mutate_pack.py` + `mutation_log.txt` | QA | 13 类变异对照 | Task 17 |
| `_qa_task17/s01_preflight.py` | QA | 生成 `preflight.txt` 的脚本 | Task 17 |

`deploy/` 最终恰为四文件（`_headers` 未动，mtime 仍是 2026-09-19 22:28）。`Results/` 仍为九文件，
未新增、未删除、未改名任何文件；`build/__pycache__` 不存在（`sys.dont_write_bytecode` 生效）。

三个数字（`counts` 生成，非硬编码）：**交付文件 9**（`6 + N`，N=3）、**zip 文件条目 10**（`7 + N`，含 `_headers`）、
**站点 HTML 页面 7**（`4 + N`）。

## 1. 17.1 输入复核（详见 `preflight.txt`）

- 期望页集合由 `build/build.py` 的 `build_pages` 装配出口推导：7 个装配页 ∪ `FOREIGN_ALLOWED` 两个静态文件 = 9 项。
  磁盘 `Results/` 与之双向相等；装配出口字节与磁盘字节**逐字节相等**（漂移 0），这条同时证明
  `Results/` 里的 HTML 确实是当前 `content/` 装配出来的，不是"目录里看到什么就是什么"。
- 九文件哈希逐项追溯：八个等于 `_qa_task15/hashes_after.txt`，`styles.css` =
  `de2d9022…`／15340 B，等于 `_qa_task16/report.md` 的完工值——即 Task 16 的合法改写，非漂移。
- `deploy/_headers` = 518 B／`b0273f2f…ba7a`，与合同 §实测基线 逐字节相等；本包未改动它。
- 清单外文件：合同撰写时（2026-09-30）`Results/` 内确有 `d9e2b35cb26c98dfbff2d77290cf1f0a.txt`，
  2026-10-02 用户授权以**移动**方式放到项目根（决定记录 `_qa_task13/report.md` §1），故本包开工时
  `Results/` 已是九文件集合，preflight 如实返回 **0** 而非 4。
  这条不是"preflight 没在看目录"的反证：同一份代码在副本目录注入 `.txt` 与 `Results/_headers` 时
  立即以 **4** 拒绝（§4 的 2a／2b），且当年 Task 13 门禁就是被这个 `.txt` 以 4 拦停过。
  合同 §验证方法 2 的"第一次就绿反而是异常"在本包转化为**双轨证据**：真实目录 0（因输入已干净）＋
  副本目录 4（因判据确实在跑）。

## 2. 17.2 preflight 与集合来源

退出码：**0** 通过／**2** 缺文件或输入基线不符／**3** 回验失败／**4** 清单外文件·子目录·大小写。

四类错误各有独立实现路径与独立文案（缺、多、子目录、大小写），且 `Results/` 内出现名为 `_headers`
的文件时，消息额外点名"zip 要求它在场于 `deploy/`，`Results/` 禁止它在场"——两条合同要求同时可核。

集合来源唯一：`derive_page_set()` 只调用 `builder.build_pages()` 取 `pages` 键并集 `builder.FOREIGN_ALLOWED`，
不重写命名逻辑（`article-<slug>.html` 仍取 `Article.output_name`，排序仍取 `sort_articles` 结果）。
函数体内 `glob(`/`iglob`/`iterdir`/`listdir`/`scandir` token 数为 0（由 `verify_pack.py` A3 静态核）。
`scan_results()` 里的 `rglob` 只服务**子目录检测**那一侧，不参与页集合推导。

## 3. 17.3／17.4 manifest 与 zip

manifest 六条契约由 `verify_pack.py` 的 M 组独立复核（不 import `pack.py`）：顶层键序
`schema/columns/pages/config/counts`、`schema: 1`；`pages` 恰为九项按 `path` 字典序，逐项 `bytes`＋`sha256`
实测相等；`config` 仅 `_headers` 且等于基线；`columns` 三栏按注册表序，`articles` 序列与三张列表页
`entry-list__link` 实际序列逐栏相等；`counts` 四式独立成立（`9 == len(pages) == 6+N`、`7 == html == pages-2`、
`1 == config`、`3 == Σ articles`）；无 `date` 键、无 ISO 串、无时间戳、无绝对路径、字符串值无四位年份
（SHA-256 值本身豁免年份扫描，否则 `…02075df9a5` 这类摘要会假红）。字节形态：UTF-8 无 BOM、纯 LF、
两空格缩进、恰好一个末尾 LF。连续三次从空目录生成，manifest 哈希恒为 `9ef9eec9…`。

zip 形态（合同 3–5）与回验（合同 6 (a)–(e)）：10 个文件条目、0 个目录条目、条目名均为裸文件名且按
`sorted(名)` 排列、全部 `ZIP_DEFLATED(8)`、`date_time` 恒为 `(1980,1,1,0,0,0)`、`create_system=0`、
`external_attr` 统一、`extra`/`comment` 全空；`_headers` 在场且等于基线；包内无 `manifest.json`／
`UPLOAD.md`／`.txt`／`__pycache__`；逐条目把**解包字节、解包 SHA-256、磁盘源文件、清单承诺值**四者
一并比较（只比哈希不比字节即视为未核完）。回验用 `zipfile` 读盘解到 `tempfile.mkdtemp()` 再 `hashlib`
实测，不复用打包时的内存对象；临时目录用完即删且只删自己创建的目录。

可复现性（v1 不具备的新能力）：删掉三个产物后连续三次 `pack.py all`，`site.zip` 恒为
`c9b6b72a…`、`manifest.json` 恒为 `9ef9eec9…`、`UPLOAD.md` 恒为 `6353a782…`。
`verify_pack.py` 的 R 组另外用**全新子进程**重跑 `all` 两次比对字节，而不是采信 `pack.py` 的自我声明。

原子性（合同 7）：`manifest.json`／`UPLOAD.md` 只在 zip 回验成功后才写；首次运行时清单契约失败
（年份扫描命中摘要串），三个产物一个都没落盘，`deploy/` 保持原状——这条路径被真实观察到过。

## 4. 17.8 变异对照（13 类全部捕获）

每条先自证"确实构成违约"，再要求指定断言翻红；全部注入 `_qa_task17/mutants/<id>/` 副本，真实树零触碰。

| # | 变异 | 自证 | 结果 | 关键证据 |
| --- | --- | --- | --- | --- |
| 1 | 删掉一个详情页 | 是 | 码 2 红 | `缺文件：Results/article-math-to-ai-learning.html`（v1"只传上 styles.css"事故的最小复现） |
| 2a | `Results/notes.txt` | 是 | 码 4 红 | `清单外文件：Results/notes.txt` ＋ "请勿删除，请由用户确认处置" |
| 2b | `Results/_headers` | 是 | 码 4 红 | 同时点名"只进包不进 Results/"，未被任何排除逻辑放过 |
| 3 | `Results/articles/` 子目录 | 是 | 码 4 红 | `子目录：Results/articles/，内含 articles/article-notes-page.html` |
| 4 | `styles.css`→`Styles.css` | 是（目录列举确认） | 码 4 红 | `大小写不符：Results/Styles.css（清单期望 styles.css…）` |
| 5 | 用 `Results.zip` 当包体 | 是 | 五类全命中 | 39 条失败，见 §5 |
| 6 | 打包漏 `_headers` | 是 | 6(d) 红 | `_headers 不在包内`＋6(a) 缺＋6(e) 9≠10 |
| 7 | 时间戳继承 mtime | 是 | 可复现性红 | 改一次 mtime 包字节即变（`fddd4f973f≠4d037ff720`）；固定时间戳同样改 mtime 仍相等 |
| 8 | `manifest.json` 塞进 zip | 是 | 集合红 | `合同4：zip 含禁止条目 ['manifest.json']`＋顺序红 |
| 9 | 篡改某个 `sha256` | 是 | 双红 | 清单↔磁盘实测红 ＋ 解包↔清单承诺红 |
| 10 | manifest 写 `date: 2026-09-18` | 是（盘上确认存在该键） | 四红 | date 字段＋ISO 串＋四位年份＋键序；`verify` 也拒（码 3） |
| 11 | `columns.articles` 顺序与页面顺序交换 | 是 | 契约3 红 | 页面 `[volunteer, math]` vs 清单 `[math, volunteer]` |
| 12 | 只改 manifest 不重打包（分裂态） | 是 | 码 3 红 | `文件条目数 10 ≠ 9`＋`不在清单内`＋`pages 集合与装配出口不等` |

注 1：N=3 时每栏恰 1 篇，"栏内两条交换"无法用真实内容构造，故 11 用副本里"页面含两条目、清单声明反序"
来驱动同一条断言，证明它比较的是**序列**而非集合。
注 2：7 的教训值得写进历史——v1 的缺陷不是"两次打包字节不同"，而是**包字节跟着 mtime 走**；
只有把 `date_time` 钉成常量，"zip 哈希相等"才真的等于"内容相等"。

变异结束后 `Results/` 九文件、`deploy/` 四文件、`build/`、`content/`、`_qa_task13/`、根目录 `.txt`
共 29 项指纹与变异前逐项相等。

## 5. 17.6 反面样本：`Results.zip` 为什么危险（可复现判断，非猜测）

对 2026-09-19 的 `Results.zip`（36421 B／`f41b021c…`）跑**同一套**回验，命中 39 条失败，五类各有实证：

1. **目录条目**：`['Results/']`——合同判为缺陷，Pages 会据此在根下建出 `Results/` 目录。
2. **条目名带前缀**：六个条目全是 `Results/<name>`，站点根路径下没有任何页面 ⇒ **首页 404**。
3. **旧 CSS**：`Results/styles.css` 解包 12062 B／`14a4a204…` ≠ 清单 15340 B／`de2d9022…`
   （比 v1 的 12401 还旧）⇒ **样式退回旧版**，Task 16 的归档视觉系统整段丢失。
4. **缺 `_headers`**：CSP／HSTS／`X-Frame-Options` 等安全头全部不生效。
5. **集合与数量**：文件条目 6 ≠ 期望 10（缺三张详情页与 `_headers`）；`index.html` 是 R7 修订**之前**的
   2612 B／`73f49fd8…`（仍含"报社成立于2024年。"），`news-commentary.html` 等三页其实是旧栏目页字节。
另附形态细节：压缩方式为 STORED(0) 而非 DEFLATED、条目时间戳各自继承 mtime（六页六个时间）、
每条都携带 NTFS `extra` 字段——这正是"每次重打包字节都不同"的根因。

因此结论不是提醒而是测量结果：**上传 `Results.zip` ⇒ 首页 404 ＋ 样式退回 2026-09-19 之前 ＋ 安全头缺失**。

## 6. 变更边界审查

- 只读面：`Results/` 九文件、`deploy/_headers`、`build/build.py`／`shell.html`／`partials/`、`content/`、
  `_qa_task13/` 全部逐项哈希不变（§1、§4、`verify_pack.py` O 组两次复验）。
- 未做：任何上传、Cloudflare API、DNS／子域名／口令改动（`pack.py` 源码中 `cloudflare`/`requests`/
  `urllib`/`socket`/`http(s)://`/`subprocess` token 数为 0，X1 静态核）；未删除、未移动、未改名任何
  来历不明文件；未在产物里写时间戳／绝对路径／构建人；未引入第三方依赖（仅标准库＋`build`）；
  未建 `.bak`、未加 zip comment、未做分卷。
- 唯一被覆盖的既有文件是 `deploy/site.zip`（合同 §交付物 明令"覆盖 v1 版本"且不留 .bak）。
  覆盖前实测其哈希为 `1863d8f7…`，与合同 §实测基线 登记的 15362 B 一致，故 v1 的证据链未断。
- 写盘范围：`deploy/` 三产物 ＋ 系统 TEMP 下自建的临时目录（用完即删）。项目根 `.txt` 零操作。

## 7. 17.7 处置决定（经用户确认）

| 项 | 实测 | 用户决定 | 本包动作 |
| --- | --- | --- | --- |
| `d9e2b35cb26c98dfbff2d77290cf1f0a.txt`（项目根，40 B，`2180fd91…`，内容 `e31995f16836a82db054fddc6823afabbde57157`） | 已于 2026-10-02 移出 `Results/`，preflight 不再因此停 | **留在项目根** | 零操作。已登记为"属正常，不是清单外交付项" |
| `Results.zip`（根目录，36421 B，`f41b021c…`） | 带前缀的过期包，高危混淆源 | **由用户本人改名**，本包记录结果 | 零操作。改名后不影响复跑：三份 QA 脚本按内容哈希 `f41b021c…` 定位反面样本，不依赖文件名 |

用户改名后建议登记新名，例如 `旧包-Results-勿上传.zip`；本包不代为搬动，也不代为删除。
在改名完成前，`Results.zip` 与 `deploy/site.zip` 同时存在，上传时**只选 `deploy/site.zip`**。

## 8. 完成定义逐条核销

| 合同勾 | 证据 |
| --- | --- |
| 四文件建立，Task 14 文件哈希不变 | §0；O 组 27 项（verify）／29 项（mutate GUARD）；X6 |
| 开工如实报告清单外文件状态，本包未删未移 | §1、§7（真实目录 0 ＋ 副本 4 双轨） |
| 用户对 `.txt` 与 `Results.zip` 作出处置，报告留前后哈希 | §7 |
| `Results/` 恰九文件，preflight 返回 0，四类错误各有路径 | §1、§2、§4 的 1／2a／2b／3／4 |
| `pages` 双向相等、`counts.pages=9`、`config` 仅 `_headers`、无日期泄漏 | M1–M9、D1 |
| manifest 两次生成相等；`columns` 顺序与列表页一致 | §3；M7；R1（子进程重跑） |
| zip 10 文件条目、0 目录条目、无分隔符、`_headers`==基线 | Z1–Z12 |
| zip 两次打包相等且 `date_time` 不再继承 mtime | §3；R1／R2；变异 7 |
| 回验 (a)–(e) 全通过且独立读盘 | Z 组 12 条；`verify_pack.py` 不 import `pack.py` |
| `Results.zip` 五类失败逐项命中 | §5 |
| 12 类变异全捕获且各自先自证 | §4（13 行，2a／2b 拆分） |
| `UPLOAD.md` 数字由 `counts`／实测生成，无硬编码页数与时间戳 | U1–U4；D1 |
| 完工时九文件与 `_headers` 哈希==开工 | O 组"重跑打包之后"全等 |
| 未上传、未调外部服务、未改 `_headers` | §6；X1 |

## 9. 后续任务交接

**给 Task 18（闸门）**
- A1b 的比对基准就是 `deploy/manifest.json`：页集合、逐项 `bytes`、逐项 `sha256`。禁止用目录通配推断页集合。
- 本包交付**两份清单**：zip 形态不变量（条目全在压缩包根／0 目录条目／0 含分隔符条目／`_headers` 在场且
  哈希==基线／无 `manifest.json`·`UPLOAD.md`·`.txt`·`__pycache__`／`date_time` 恒为 `(1980,1,1,0,0,0)`／
  全部 DEFLATED／无 extra·comment／`create_system` 与 `external_attr` 统一／条目序==`sorted(名)`），
  以及逐条目哈希＋字节清单（`pages`＋`config` 全量 10 条）。
- **N 组不得调用 `build/pack.py verify`**：闸门不得把被测对象的自我声明当验收。N 组必须自行 `zipfile`
  解压到临时目录，独立做集合、逐文件 SHA-256、逐文件字节数、形态四类比较（`_qa_task17/verify_pack.py`
  的 Z 组可作参考实现，但请另写一份，两条链互不知情）。
- §4 的 13 类变异清单可直接并入其变异矩阵；1／2a／2b／3／4 属 preflight 侧，5／6／7／8／9／12 属回验侧，
  10／11 属清单侧。
- 必须区分**两类不同断言**：`Results/` 两次构建哈希相等（构建器确定性，与 zip 无关）与
  `site.zip` 两次打包相等（靠固定 `date_time` 才成立）。不要把后者当成前者的证据，也不要用 v1 的
  "zip 每次都不一样"去质疑构建器确定性。
- 一条口径供 N 组沿用：清单条目按 `sorted(名)` 排列时 `_headers` 排第一（`_` 的码位小于字母），
  而 `manifest.pages`/`config` 是分开的两段。`UPLOAD.md` 已改成按 zip 实际顺序逐行列出，避免两处打架。

**给 Task 19（浏览器回归与线上复验）**
- `deploy/UPLOAD.md` 是唯一人工核对入口；遍历顺序取 `manifest.pages`／`columns`，不要自行扫描目录。
- 线上要核对的是**三个不同的数字**：交付文件 `6+N`=9、zip 文件条目 `7+N`=10、Pages 后台 "Pages" 计数
  `4+N`=7。三者不等是因为 `_headers` 只进包不进 `Results/`、`styles.css`／`script.js` 是文件不是页面。
- 上传若发现条目缺失或数量不符：当场中止并报告差异条目，不做补救式重传，也不重跑构建。

**给用户**
- 产物就绪：`deploy/site.zip`（18774 B／`c9b6b72a…`，10 个文件条目）、`deploy/UPLOAD.md`（核对单）、
  `deploy/manifest.json`（机器清单）。上传由你手工执行（Direct Upload），建议保持 Auto-Minify、
  Rocket Loader、Bot Fight Mode 关闭，`.pages.dev` 口令保护保持关闭。
- 待你动手：把根目录 `Results.zip` 改名，让它不再可能被误选为上传包。本包没有替你删改任何东西。
- 现在整套交付的 HTML 页面是 7 张（首页＋三张列表页＋三张详情页），不是四张——第一版只打了 7 个条目
  且缺三张详情页，这正是本次重做的理由。

## 10. CLI 端到端退出码与回滚证明

上面的表全是函数级证据；这里补一次进程级证据，因为"退出码"是合同对外的契约。

| 命令 | 目标 | 期望 | 实测 |
| --- | --- | --- | --- |
| `python build/pack.py verify` | 真实根 | 0 | **0**（回验全绿，10 文件条目、0 目录条目） |
| `python build/pack.py all --root _qa_task17/mutants/02a` | 含 `Results/notes.txt` 的副本 | 4 且只点名该文件、不写盘 | **rc=4**，消息仅 `清单外文件：Results/notes.txt` ＋ "请勿删除，请由用户确认处置"；该 mutant 的 `deploy/` 未出现 `site.zip` |
| `python build/pack.py all --root _qa_task17/mutants/m01` | 缺一张详情页的副本 | 2 | **rc=2**，`缺文件：Results/article-math-to-ai-learning.html` |
| `command_zip(mutant, date_time=None)` | 时间戳继承 mtime 的副本 | 3 且删除半成品 zip | **rc=3**，`已删除半成品 site.zip：合同5：…未固定为 (1980,1,1,0,0,0)`，删除确认 `True` |

三次 mutant 运行前后，真实 `deploy/site.zip`／`manifest.json`／`UPLOAD.md` 三份哈希逐字节相同
（`c9b6b72a…`／`9ef9eec9…`／`6353a782…`）——闸门跑在副本上不会顺手改写真实产物。

## 11. 执行中的返工记录（六条，全部已闭环）

写下来不是为了自贬，而是这六条正是"形态检查为什么必须存在"的现场版，Task 18 的变异矩阵会重用到。

1. **年份扫描假红**：对 manifest 全部字符串值扫 `(19|20)\d{2}`，命中了 `73ff…4e042d02075df9a5` 里的
   `2075`——摘要不是年份。首次 `all` 因此 rc=3 退出。修法：64 位十六进制摘要值豁免。
   副产品是一条真实观察到的**原子性证据**：这次失败没有落下任何产物，`deploy/` 保持原状。
2. **`--root` 解析但未生效**：`main()` 读了 `args.root` 却只用形参，导致第一次"CLI 对 mutant 的退出码测试"
   实际跑在真实根上。已修（`args.root` 优先）。诚实说明影响面：那次运行按幂等重写真实 `deploy/` 三产物，
   输入未变 ⇒ 输出逐字节相同（已核对），只读面（`Results/`、`build/`、`content/`、`_headers`）零触碰；
   但它确实不构成 mutant 证据，故 §10 重跑了一遍。
3. **UPLOAD 清单顺序与 zip 顺序打架**：合同既要求"按字典序"又要求"与 zip 内顺序一致"，而 `sorted()`
   把 `_headers` 排在全集第一（`_` 码位小于字母），与"先 `pages` 后 `config`"的两段式列表冲突。
   以 zip 实际顺序为准重写，并让 `UPLOAD.md` 增加类别列。期间 `UPLOAD.md` 哈希由 `a2d0ba6f…` 变为
   `6353a782…`，前者是返工前的中间态，不再有效。
4. **大小写分类永不成立**：原判据要求"异写名与规范名同时在盘上"，而 Windows 文件系统大小写不敏感，
   二者本就是同一个文件，永远只会有一个名字。改为按期望集合查同名的异写；变异 4 随即从"未捕获"转红。
5. **带前缀条目被回验跳过**：解包循环对 `Results/x.html` 这类条目 `continue`，导致反面样本的
   "旧 `styles.css` 哈希不符"这一类根本不会被测到（回验只报形态红）。改为记形态红的同时按裸名继续做
   内容与字节比对，五类才齐全（39 条失败）。
6. **条目属性检查同样跳过带前缀条目**：同一处 `continue` 使 STORED 压缩、非固定时间戳、NTFS `extra`
   三类在反面样本上漏报；一并去掉。

## 12. 追加记录（2026-10-03，R12 后文章数 N 由 3 变 5）

本篇正文是 2026-09-19 那次执行的快照，按合同**不重写**；此处只补三条会误导后来人的事实。

1. **产物已换代**。正文 §"给用户"与 §"给 Task 19"里的数字描述的是 N=3 的包：
   `deploy/site.zip` 18774 B／`c9b6b72a…`／10 个文件条目，三个数字 9／10／7。
   两篇新闻通讯并入后 N=5，盘上实况为 **22191 B／`e5d6307ca1717482…`／12 个文件条目**，
   三个数字变成 **交付 11／zip 条目 12／HTML 页面 9**。逐条哈希以 `deploy/UPLOAD.md` 为准——
   它由 `pack.py` 从实测值生成，永远是当前包的入口；报告正文不是。
2. **本包闸门里有两处把 N=3 钉死的过期值**，重跑时假红，已改为推导：
   `U3/人工可读：三数各 6+N／7+N／4+N` 原写作 `entries==10 and pages==9 and html==7 and articles==3`，
   现由 `counts['articles']` 推导（`6+N`／`7+N`／`4+N` 三式互校）；
   `Z12` 的通过消息原是字面量 `'10/10 相等'`，现取实际核对条目数。
   这与我给 Task 18 登记的 D 类台架自缺陷同源：**把篇数当常量写进判据**，加一篇就红一次。
3. **`X7/无 __pycache__ 副作用` 曾因 `build/__pycache__` 存在而红**。那是外部导入 `build` 模块时
   写下的字节码缓存（本闸门自己 `sys.dont_write_bytecode = True`，不落这个），不是交付文件、
   不在 `Results/` 也不在 `deploy/`，删除后重跑转绿。这条判据的口径请按"任何导入方都可能重新生成"理解，
   它守的是打包链不写缓存，不是仓库里永远不许出现该目录。

重跑实况（只读，R 组按合同在临时副本里重打包做可复现比对）：**52 条断言，FAIL 0，rc=0**；
`site.zip=e5d6307ca171…`、`manifest.json=14d1e276bbcb…`、`UPLOAD.md=958473ad08a5…`，
27 项指纹在跑前跑后逐项相同。

## R13 补充验收（2026-10-04）

本报告上文记录的是此前版本；本节更新 404 页纳入后的当前发布结果。当前 `N=6`：`Results/` 交付文件 13 个，zip 文件条目 14 个，HTML 页面 11 张，数量合同为 `7+N`／`8+N`／`5+N`。

- 构建器 `python -B build/build.py --out Results --check` 返回 0（无漂移）；`python -B build/pack.py verify` 返回 0（14 个文件条目、0 个目录条目）。QA17 独立回验 **52 条断言 PASS 52／FAIL 0**，并复核 manifest 的 13/13 页面哈希、ZIP 的 14/14 条目字节与哈希、连续重建可复现；本轮逐条输出保存在 `qa/_qa_task17/verify_result_R13.txt`。
- 当前 `deploy/site.zip` SHA-256：`72870029e94964f79d57ec5f7ce830004b180d2e8460662ecd96b8765f5821c8`。上传核对单见 `deploy/UPLOAD.md`。
- 新增的线上专用 `Results/404.html` 属于部署和 HTML 计数，不属于文章、栏目或首页最新报道。错误页被登记在 `manifest.pages` 并打入 zip；正常页面仍使用原相对资源路径。
- 修改前的已验证包保存在 `qa/_audit_20261004/site_pre_404_verified.zip`，SHA-256 `cbb41a508e27025eab9ba55265f77ad895af478aa0ea91b82963f27574ed57f3`。原 `Results/` 的 12 个文件与开工字节／哈希清单逐项一致，404 页为唯一新增页面。
- 仍待用户按既有 Direct Upload 流程上传后执行线上核验；本包未访问 Cloudflare 上传接口。

