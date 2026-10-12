# Task 15 切换报告（v1 六文件 → v2 九文件）

- 生效时刻：**2026-10-02 10:51:11**（`python build/build.py --out Results` 退出码 0，stdout/stderr 均空）
- 唯一写入面：`Results/*.html`（七份）。`styles.css`、`script.js` 一比特未动（mtime 仍为 2026-09-19）
- 结论：**切换成功，本站结构自本条起冻结**，Task 16 可上样式

## 1. 基线链

| 链 | 内容 | 位置 | 用途 |
| --- | --- | --- | --- |
| v1 | `Results/` 六文件（首页 + 三张"一页一文"栏目页 + CSS + JS） | `_qa_task15/before/`、`hashes_before.txt` | 切换前门禁、回滚参照 |
| v2 | `Results/` 九文件（首页 + 三张列表页 + 三张详情页 + CSS + JS） | `hashes_after.txt` | Task 16/17/18/19 逐级继承的起点 |

v1 六项哈希与 `Task12` 表 1 逐项相等（15.1 实测），v2 七份 HTML 与 `_qa_task14/out/` 逐项相等、两份继承文件与 v1 逐项相等（15.3 实测）。构建器随后对 `Results/` 执行 `--check` 返回 0（`无漂移`），证明真相仍在 `content/` + `build/` 一侧。

`build/build.py` 本轮参与构建的三份文件哈希：`build.py` `ee7b3672a9c51bb5…`（40983 B，Task 14 报告未记录其自身哈希，本值作为 v2 链记录）、`shell.html` `86e47c3be239da08…`（1704 B）、`partials/home-intro.html` `622d8cce02633b64…`（823 B）。`content/` 五文件与 Task 13 记录逐项相等。

## 2. 页面合同实测

| 合同 | 实测值 |
| --- | --- |
| 详情页 `<main>` 内部 | 与 `_qa_task13/main_slices/` 三切片逐字节相等（1269／5224／6735 B，哈希 `4b941f8e…`／`f3d6517a…`／`0a10c977…`），切片在页内唯一出现，两侧边界仅为 `\n` 与两空格缩进 |
| 详情页 `<main>` 之外 | 与 `_qa_task15/before/` 同栏目页**逐字节相同**（差异 0 行）。合同允许的 `<title>` 与 `aria-current` 两处差异实测也没有发生：v1 的 `news-<column>.html` 本来就是该文的文章页，宿主文件名换了、字节没变。这是比合同更强的结果，不是口径放宽 |
| 段落与字符 | 4／23／29 段；63 项长度闸门（6+25+32）全中；三处署名 `蓝色空间`；两处电头后 U+0020 恰 1；`安 装` 命中 0（`安装` 命中 8）；`她` 1 次／`他` 5 次未统一；`86英寸` 1 次、`Windows 10` 2 次、`.exe` 3 次；C29 单段（36 字符）；评论结尾行 `（自然选择号9月18日）` 位于 `.article__body` 之后、`<article>` 之内 |
| 浏览器侧 | 三详情页逐段 `textContent` 与 `_qa_task13/extracted_baseline.json` 严格相等（无归一化），真实 Blink 渲染，见 `browser_lines.txt`（90 条全 PASS） |
| 列表页 | `<main>` 直接子元素恰 2（`h1.page-title` → `ul.entry-list`），`<h1>` 逐字为栏目名，条目 1／1／1，行内 `entry-list__title` + `entry-list__date` 各一，无 `article`/`h2`/`p` 正文标签，无空态文案 |
| 首页 | `#main-content` 直接子元素恰 3（`h1.page-title` → `div.home-sections` → `div.home-latest`）；标签集合实测 `{main:1,h1:1,div:2,section:3,h2:4,p:3,ul:1,li:3,a:3,span:6}`；可见内容白名单按序 14 项逐字符相等；`div.home-latest` 为 `role="region" aria-labelledby="latest-title"` 而非 `<nav>`；`div.home-sections` 与 `build/partials/home-intro.html` 逐字节相等（823 B，页内唯一）；`.home-section` 计数恰 3，最新区内无该类、无 `<section>`、无第二个 `<nav>` |
| 当前项 | 七页各恰一个 `aria-current="page"` 且都落在 `.site-navigation__list` 内的链接上（报头那一处 `href="index.html"` 未被命中），归属符合扩展矩阵：详情页 → 所属栏目页 |
| 命名 | 三个新建详情页逐个匹配 `^article-[a-z0-9][a-z0-9-]{2,40}\.html$`，主干等于对应 `content/articles/<slug>.md` 的 `slug`；`Results/` 内命中该正则的文件恰为这三个（双向相等），集合恰 9 文件、无子目录 |

## 3. 链接图（`link_graph.txt`）

死链 **0**、孤儿 **0**、非法引用形式 **0**。每个详情页被所属列表页引用 1 次、被首页最新区引用 1 次；反向亦成立。主导航路径两口径同时成立：**28 条**（7 页 × 4 链接）与其中 v1 四页贡献的 **16 条**，`link_graph.txt` 第五节分栏逐条列出，16 ⊂ 28。四条导航链接的文字、顺序、目标文件名与 v1 完全一致。

## 4. 禁止项与降级（`s07_scan.py` + `browser_lines.txt`）

- R6 扩充清单在九个文件上命中 **0**。七个 front-matter 字段名一律整词匹配：负向证明显示裸子串扫描会在 `date`／`byline` 上产生 4 处假阳性，整词匹配把它们全部排除。
- **说明项（需 Task 18 采纳同一口径）**：`styles.css` 第 385／493 行含整词 `column`，上下文是 `flex-direction: column;`，属 CSS 关键字而非字段名；R6① 的禁令文本是"作为**字段名**出现在**公开页面**"，样式表不是页面，且该文件按 R10 归 Task 16 独占。七个 HTML 的整词字段名命中为 0。
- 年份形态 `(19|20)\d{2}` 在九文件命中 **0**；七个 HTML 与 `script.js` 不含任何四位数字串。裸 `\d{4}` 在 `styles.css` 上会命中 `2424`／`9375`／`0625`，因此闸门必须用年份形态（R6／勘误表 E2）。
- 首页三段逐字符等于 `Task4` 冻结表，第三条为 R7 修订后的 `报社成立于"鸽子衔枝之年"。`，长度序列 `[18, 19, 14]`。
- 禁 CSS：七页样式表全部 `disabled` 后 DOM 顺序与文本与带样式时完全一致，导航四条与生成区链接均为非零高度可点击盒（截图 `shots/nocss-*.png`）。
- 禁 JS（`Emulation.setScriptExecutionDisabled`）：七页 `#site-navigation` 常显（`display: block`）、`#nav-toggle` 隐藏、body 文本与正常模式逐字节等长、根元素保持 `no-js`（截图 `shots/nojs-*.png`）。
- 断网等价：56 次请求全部 `file://`，非 `file://` 请求 **0**，控制台与日志错误 **0**；加载资源集合恰为九文件本身。
- 离线运行期依赖扫描：七 HTML + `script.js` 中 `fetch`／`XMLHttpRequest`／`import`／`localStorage`／`http-equiv`／`location.href` 命中 0。

## 5. URL 语义变更登记（不是缺陷，不要回退）

| URL | 切换前 | 切换后 | 影响 |
| --- | --- | --- | --- |
| `/news-message`（及 `news-message.html`） | 消息文章页 | 消息栏目列表页 | 已分享的直链仍可用、不 404，落地内容从"一篇文章"变为"该栏目文章列表"；当前该栏目仅一篇，一跳即达 |
| `/news-feature`、`/news-commentary` | 各自文章页 | 各自栏目列表页 | 同上 |
| `/article-<slug>.html` | 不存在 | 详情页 | 纯新增，不破坏任何既有链接 |
| `/` | 首页 | 首页 + 最新区 | 兼容 |

三条旧文没有"旧 URL 保留"问题：正文迁到详情页，原栏目 URL 语义升级。Cloudflare Pages 的 `.html → 无扩展名` 308 行为切换前后一致，根深度平铺使相对引用在跳转前后解析一致。本包未引入任何重定向脚本、`<meta http-equiv>` 刷新或 JS 跳转；若将来要为广泛分享过的栏目 URL 做进一步处置，属新需求，须回 `Task12` 修订合同另立任务。

## 6. 中间态与发布边界

`Results/` 现为**无样式中间态**：三张列表页与首页最新区只有 v1 的 CSS 规则可用，视觉裸奔是合同的一部分。禁止内联样式或 `<style>` 临时美化。**本包未生成 `deploy/` 任何产物**（`build/pack.py`、`deploy/manifest.json` 均确认不存在；`deploy/site.zip` 仍是 2026-09-19 的陈旧打包件，15362 B），**未上传 Cloudflare Pages**。线上在用户下次上传前仍是 v1，这不是漂移。

## 7. 预期内翻转清单（实测，交 Task 18 接管）

判定用失败集合差分（`regression_diff.txt`）：基线轮输入 `_qa_task15/before/`（v1 六文件），当前轮输入 `Results/`（v2 九文件）。**未登记的新增失败 0 条**。

| 历史脚本 | 实测表现 | 翻转原因 |
| --- | --- | --- |
| `_qa_task2/verify.py` | FAIL 47 → 40，新增 27 条，全部落在集合/正文/白名单/`article` 标签一类时点断言 | 页面集合 4→7，正文迁出栏目页 |
| `_qa_task5/verify.py` | FAIL 5 → 36，新增 32 条（"逐段正文在 `news-message.html` 的 `<main>` 内"等） | 正文宿主改为详情页 |
| `_qa_task6/verify.py` | 基线 FAIL 4；当前轮**直接崩溃** `ValueError: not enough values to unpack`（`.article` 已不在栏目页） | 同上，脚本按 v1 结构解析 |
| `_qa_task7/verify.py` | 基线 FAIL 3；当前轮崩溃 `IndexError: list index out of range`（`art[0]`） | 同上 |
| `_qa_task8/verify.py` | 基线 FAIL 5；当前轮崩溃（正则找不到 `<div class="article__body">`） | 同上 |
| `_qa_task10/verify_task10.mjs` | 基线 FAIL 5；当前轮崩溃（读 v1 四页 DOM 快照的断言路径） | A1 六文件、E1/E5/E8 计数、F/G 宿主、C/D/K 页面集合 |
| `_qa_task4/verify_home.py` | 当前 FAIL 20／184（无重定向环境变量，只能对真实 `Results/` 跑）：`#main-content` 直接子元素 2→3、E8 白名单 7→14、第三条冻结文本已换 R7 值、其他页 mtime 晚于 `index.html` | 最新区追加 + 首页重写 + R7 |

仍然全绿且必须全绿的不变量（本包实测）：`content/` 与 `Materials/` 三份 docx 哈希、63 项逐段字符合同、H 组前提（`styles.css` 一比特未动）、I 组前提（`script.js` 一比特未动）、G 组高风险字符计数、C/D/K 的"公共壳跨页一致"语义（`<main>` 之外壳字节全站相同，见 §2 详情页行）。

## 8. 回滚能力

`_qa_task15/before/` 六文件 + `rollback.md` + `hashes_before.txt`（该文件每行取快照实测值，切换后重复运行 `s01_snapshot.py` 不会把 v2 哈希写进 v1 基线；快照门禁的对象是 `before/` 而非当前 `Results/`）。回滚程序已在 `_qa_task15/rollback_drill/Results` 副本上完整演练一次（不触碰真实 `Results/`）：按第 1–2 步恢复六文件并删除三详情页后，`verify_pre_state` 判定与表 1 逐项相等、无残留，真实 `Results/` 演练前后哈希一致（`rollback_drill.txt`）。快照保留到 Task 19 通过并经用户确认之后。

## 9. 负向对照（验证方法 9，`negative_controls.txt`）

八类变异全部注入 `_qa_task15/mutants/` 副本，真实 `Results/` 九文件哈希在变异前后逐项一致：

| 变异 | 变红的检查 |
| --- | --- |
| M1 详情页 `。`→`.` | `s04` 切片逐字节 + 逐段 textContent + 长度闸门（9 条 FAIL） |
| M2 页面多一个 `<nav>` | `s05` 每页 `<nav>` 数 == 1 |
| M3 删掉首页最新区一个 `<span>` | `s05` 标签集合 == R4 + 白名单 14 项（7 条 FAIL） |
| M4 给 `div.home-latest` 加 `.home-section` | `s05` `.home-section` 计数 == 3 |
| M5 详情页改名 `Article-*.HTML` | `s05` R2② 正则双向相等（`s06` 同时报死链） |
| M6 放一个 `README.md` | `s03` 集合双向相等（构建器 `--check` 亦以退出码 4 拒绝） |
| M7 建 `Results/articles/` 子目录并移入一页 | `s03` 子目录 + 集合双重变红 |
| M8 `styles.css` 改一个字节 | `s03` 表 1 继承值 + 无副作用复核 |

## 10. 事故记录：三个历史 QA 报告被误覆盖（已恢复内容等价，无版本控制可逐字节回退）

差分回归的初版驱动把"环境变量名→值"的映射写反，导致 `_qa_task2/verify.py`、`_qa_task5/verify.py`、`_qa_task10/verify_task10.mjs` 在 2026-10-02 11:15 以默认路径运行，就地重写了它们的输出文件 `_qa_task2/report.md`、`_qa_task5/report.txt`、`_qa_task10/report.md`（原 mtime 2026-09-19）。

处置与现状：

1. 发现后立即停止，改正映射并加了只读守卫（每次跑前后比对 12 个历史报告/快照的 size+mtime+sha）。修正后的差分回归**未再写入任何历史文件**（`regression_diff.txt` 末节：无）。
2. 用与历史同源的输入（`_qa_task15/before/` 的 v1 六文件 + 未改动的 `_qa_task10/dom_facts.json` v1 DOM 快照）重跑三个脚本，把输出恢复到原路径，副本留在 `_qa_task15/incident/`。
3. 忠实性证据：`_qa_task2` 恢复件为 468 项／421 PASS／47 FAIL，与独立同日副本 `_qa_task8/reg_task2_after.txt` 的汇总行**完全相同**；差异仅限 22 行环境观察项（项目根新增 `_qa_task13/14/15`、`build/`、`content/`，`plan/` mtime 变新）与时间戳行。`_qa_task5` 恢复件 150 条 PASS。`_qa_task10` 恢复件 289 项／284 PASS／5 FAIL，5 条 FAIL 均为已登记的时点项。
4. 无法逐字节复原的部分：三个文件的"核验时间"行必然显示 2026-10-02；`_qa_task5`/`_qa_task10` 的历史原件没有第三方副本可对照。**交付物 `Results/` 未受影响**（其真值由 v1 快照与 out 目录双向哈希独立锁定）。根因是本目录非 git 仓库，历史 QA 产物没有快照层——已作为对 Task 18/19 的操作性提醒写入下方交接。

## 11. 交接

**给 Task 16（样式，`Results/styles.css` 唯一写入者，R10）**

- 12 个新类在七页中的实际位置与层级：
  - 列表页：`main#main-content > h1.page-title`；`main > ul.entry-list > li.entry-list__item > a.entry-list__link > span.entry-list__title + span.entry-list__date`（每页恰 1 个 `li`）
  - 首页：`main#main-content > div.home-latest[role=region] > h2.home-latest__title#latest-title`；`div.home-latest > ul.home-latest__list > li.home-latest__item > a.home-latest__link > span.home-latest__entry + span.home-latest__date`（恰 3 个 `li`）
- `entry-list__date` 与 `home-latest__date` **当前都在场**（三篇 `display_date` 已由用户声明，R9）。样式仍须按"节点可能缺席"设计；缺席口径只在副本实验里成立，不得放宽 H14。
- `div.home-latest` 是 region 不是导航地标，不得为其新增 `<nav>` 语义；`div.home-sections` 区块字节由构建器锁定，改它要回流 Task 14。
- 样式完成前禁止发布。追加规则前请先读 `Task12` R6⑥（12 类之外不得新增 class）与 H 组基线。

**给 Task 17（打包）**：集合 = 构建器清单七页 + `styles.css` + `script.js` + `deploy/_headers`，全部位于压缩包根；**不得**用目录通配。三个数字分开核对：`Results/` 交付 9、zip 条目 10（含 `_headers`）、Pages 后台 HTML 7。`hashes_after.txt` 是 zip 逐文件哈希的对照源。

**给 Task 18（闸门重构）**：`hashes_before.txt`（差分基线副本）与 `hashes_after.txt`（v2）；§7 翻转清单含具体脚本与断言名，其中 task6/7/8/10 的新表现是**崩溃而非 FAIL**，重写时需把这些宿主改指详情页；`link_graph.txt` 可直接作为死链/孤儿断言的种子（28 与 16 两口径都在文件里）；`s07_scan.py` 的整词匹配 + 豁免口径与 §4 的 `styles.css` `column` 说明项请照抄；§10 的教训建议落地为：任何重跑历史脚本都必须带报告重定向并做只读守卫。

**给 Task 19（浏览器回归）**：起点 = `hashes_after.txt` 九文件；三篇详情页的浏览器文本基线是 `_qa_task13/extracted_baseline.json`（本轮已逐段严格相等，`browser_facts.json` 存了本轮真实 DOM）；导航链与 `aria-current` 归属见 `link_graph.txt`；"线上仍是 v1、发布留到 Task 17 之后"是前提，不要把它报成缺陷。

**给用户**：本地结构切换完成，**站点未发布、新页面暂无样式**；下一次可视检查在 Task 16 之后，上传动作在 Task 17 产出 `deploy/site.zip` 之后由你执行。三篇旧文的真实 `date` 若要显示，随时补进 `content/` 并重跑 `python build/build.py --out Results` 一条命令即可——本包没有替你猜。另外请留意 §9：三个历史 QA 报告的内容已按 v1 输入复现恢复，但时间戳必然变为今天，若你在别处留有 2026-09-19 的原件，可以用它覆盖并删除 `_qa_task15/incident/` 里的对应副本。
