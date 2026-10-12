# Task 18 真值锚点登记表（`contract_index.md`）

逐条登记"断言编号 ↔ 真值来源锚点"。**未登记锚点的断言视为手抄，即为本包缺陷。**
锚点编号沿用 `plan/Task18 §真值解析合同` 的 1–8 号。

## 0. 唯一一处刻意重复的代码，及其理由

`_qa_task18/src_check.py` 按 `plan/Task13 §content/ 格式合同` 与 `plan/Task12 §front-matter 字段合同`
**另实现一份**内容源解析器，与 `build/build.py` 互不知情；`_qa_task18/verify_task18.mjs` 的 N 组
自行用 Node `zlib` 解压 `deploy/site.zip`，不调 `build/pack.py verify`。

理由（本包 §任务定位 的原文口径）：闸门不能拿被测对象的自我声明当真值。构建器有自己的 S1–S13 自检，
那是实现者自查；若 Q 组 `import build.py`，构建器里一个系统性错误（例如把所有 `。` 静默换成 `.`）
会同时污染自检与闸门，两边一起绿。两条独立链在同一批断言上会师，不一致即判 FAIL，不取均值、不任选其一。
代码层自证：`Q/independence`（src_check.py 剥注释后无 `import build`／`build.py`／`pack.py`）、
`Q/no-results-read`（推导侧不读 `Results/`）、`J17/nobare`、`J17/noexempt`、`E8/nobranch`。

## 1. 锚点 → 解析位置 → 消费它的断言组

| 锚点 | 文档小节（字面标题） | 解析出的真值 | 消费的断言 |
| --- | --- | --- | --- |
| A1 | `plan/Task1` §`## 权威逐段内容合同` 下 `### 新闻消息`／`### 新闻通讯`／`### 新闻评论` 的三个 ` ```text ` 块 | 63 项逐段文本、`title`／`byline`／`closing_date`、段落数 4／23／29（**不写死**） | `F4`、`F5`、`F6`、`F7`、`F7p/*`、`F8/*/text`、`F9/*/text`、`G/*` 全部计数、`L2`、`L3/*`、`J4`、`C3`（详情页标题） |
| A2 | `plan/Task1` §`### 3. 逐段文本复核（全部逐字符一致）` | 63 项 `KEY=数字` 字符数基线（U+3000 分隔，通讯／评论各跨两行） | `F7/*/chars`、`L3/*`、`F9/*/form` |
| A3 | `plan/Task1` §`## 输入文件与冻结基线` 表格第 4 列 | 三份 docx 的 64 位 SHA-256 | `B/*`、`J6`、`I8`、`A4` |
| B1 | `plan/Task4` §`### 文本级验证` 的 ` ```text ` 块 | `P_ORIGIN`／`P_WORK`／`P_FOUNDED` 三段字面量（含 R7 换值后的第三条） | `E6/*`、`E6/len`、`E6/punct`、`E6/third-new`、`E8/14`、`E8/order`、`L5/three-slots` |
| B2 | `plan/Task4` §`### DOM 结构验证`（含"顺序固定"行与 `{main:1, …}` 行与"标题总数 5"行） | 三个直接子元素及次序、`<main>` 标签计数集、标题总数 5 | `E1/count`、`E1/order`、`E5`、`E8/noEighth`、`E8tally/*`、`E8zero/*`、`K2/main/index.html`、`C6/*/section` |
| B3 | `plan/Task4` §`### 可见内容白名单（R4 换值：7 项 → 14 项）` 有序列表 1–14 | **按序 14 项**（`P_*` 三项代入 B1 的字面量）；R9 之后为无条件值 | `E8/14`、`E8/order`、`E1/h1`、`C3/index.html` |
| B4 | `plan/Task4` §`## 归档层补充（R3／R4／R8，2026-10-01）` | 开工前置条件（缺则该节内容不存在 → 本包停止并回流 Task 12） | 由 `need(/归档层补充/)` 直接把关，不产出 PASS 行 |
| C1 | `plan/Task0` §`## 稳定接口总清单` 的 `### 公共壳`／`### 首页`／`### 文章页` 段（带前导点的写法） | 既有 26 类 + 全部已注册类名 | `H11/unknown`、`H14/subset`、`A2`、`J14` 的豁免面 |
| C2 | 同上 §`### 归档层新增（R3／R4；…）` 的「栏目列表页 5 个类：…」与「首页最新区 7 个类：…」两行，并核 "合计 **12 个类**" | 12 个归档新类（逐类，不按集合） | `H14/rule/*`（死规则）、`H14/desktop/*`（不得整体挪进 `@media`）、`H14/dom/*`、`H11/unknown`、`K2/main/*`、`J14` 豁免、`F12/*/cls*` |
| C3 | 同上 "新增 ID：`latest-title`…" 与各 `#id` 写法 | 已注册 ID 清单 | `C11/*`、`E4/latest` |
| C4 | 同上 §`### 样式变量（Task 3，桌面基线）` | `--layout-max` 等点名变量 + `--font-size-*`／`--space-*`／`--rule-*` 三族 | `H4`、`H4/declared`、`H4/no-new-var`、`H11/root` |
| C5 | `plan/Task0` §`## 全局禁止项清单` 各粗体条目 | J1／J2／J3／J5／J7／J8／J9／J10 的禁止串集合；并核 `J2` 只含 `2026`、**不含 `2024`** | `J1`…`J10`、`I8`、`E7` |
| C6 | `plan/Task0` §`### 归档层新增禁项（R6，2026-10-01）` 第 1／2／3／4 条 | 七个字段名（`title` 不在内）、ISO 形态 `\d{4}-\d{2}-\d{2}`、编号形态 `^[MFC]\d{2}$` | `J11`、`J12`、`J14`、`J14b`、`J15`、`J16`、`I8` |
| C7 | `plan/Task0` §`### 误伤边界（豁免清单，不得判违规）` | "四位数字禁令只作用于日期节点／不做全站裸扫／CSS-JS 内 19xx-20xx 仍判违规"三条口径 | `J17/exempt-scope`、`J13`、`G/*/noyear` |
| D1 | `plan/Task12` §`### R2 交付集合由"固定六文件"改为"清单驱动"` 的 ① 与 ② | 六个壳文件名；详情页命名正则 `^article-…\.html$` | `A1a/*`、`A1c/*`、`A1d/*`、`DETAILS` 遍历集合 |
| D2 | `plan/Task12` §`### R6`／§`### R7` 内给出的年份形态字面量 | `(19\|20)\d{2}`（解析后再构造正则，不手抄） | `J17`、`J17/form-literal`、`J13b`、`F9/*/form` |
| D3 | `plan/Task12` §`### \`<title>\`、\`<h1>\` 与 \`aria-current\` 扩展矩阵` 表 | 每类页面的 `<title>` 主体、`<h1>`、当前项归属（详情页→所属栏目页） | `C3/*`、`C3b/*`、`C9/*/h1*`、`D3/*`、`D3b/*` |
| D4 | `plan/Task12` §`排序全序（R11 补入 \`column\` 键）` 行（只认以"排序全序"开头的权威行） | 四键序列 `date`→`order`→`column`→`slug` 与降序键 | `E8/from-manifest`、`E9/latest-order`、`Q8/order-*`（src_check 同一锚点） |
| D5 | `plan/Task12` §`### front-matter 字段合同` 表 + 同节三行注册表 ` ```text ` 块 | 八字段及必填标记；`key\|栏目名\|列表页文件名` | `Q1/*`、`Q7/registry-matches-plan`、`Q7/manifest-*`（由 src_check 消费） |
| E1 | `plan/Task13` §`### 3. 文章源文件` 第 4 条与 §`正文区规则（…）` 第 1／3／5 条 | slug 正则、21 个保留设备名、三条日期形态、段内／行首禁标记字符集、段落单行、电头 U+0020 | `Q2/*`、`Q3/*`、`Q4/*`、`F8/*/space` |
| F1 | `deploy/manifest.json` 的 `pages`／`config`／`columns`／`counts` | 页集合、逐项 `sha256` 与 `bytes`、栏目→文章映射、三个计数 | `A1b/*`、`A1c/html-count`、`A1d/*`、`C3/*`、`D3b/*`、`F12/*/order`、`L3`（页↔合同映射）、`N/*`、`P1`、`Q8` |
| F2 | `content/columns.md` 与 `content/articles/*.md` | A1d 与 H14 的**独立推导侧**（不读 `Results/`、不调构建器） | `A1d/*`、`Q*`（src_check 侧） |
| G1 | `_qa_task13/main_slices/*.main-interior.html` | 迁移前三段正文的 `<main>` 内部字节切片 | `L1/*`、`L1b/*` |
| G2 | `_qa_task13/baseline/`（`index.html`、`script.js`） | 六壳 v1 快照；`script.js` 的 v1 基线哈希；首页引言区 partial 的字节来源 | `I11/hash`、`L5/partial-from-baseline` |
| H1 | `build/shell.html` | 公共壳字节、`{{TITLE}}` 与全角 `｜自然选择号` 后缀 | `L4/head/*`、`L4/tail/*`、`C3b/*`、`J15/shell-allowed` |
| H2 | `build/partials/home-intro.html` | 首页引言区 partial 字节 | `L5/home-intro` |
| H3 | `_qa_task16/before_styles.css` | Task 16 追加之前的样式基线（"既有区逐字节不变"与"未新造变量"的对照组） | `H4/no-new-var`、`H4/var-count` |
| H4 | `_qa_task17/report.md` §登记哈希表 | `deploy/site.zip` 的登记值与两次／三次重打包相等的实测结论 | `N/zip-sha-recorded`、`N/repro-task17`（本包只读，不重打包） |
| I1 | `plan/Task18` §断言体系 的 `\| **G**` 行 | 高风险字符清单（不写死于核验器） | `G/*` 全部 |
| I2 | `plan/Task18` §断言体系 的 `\| **J**` 行 | J11–J17 七条新增的判据口径 | `J11`…`J17`、`J 说明` |

## 2. 无锚点即不实现（本包刻意不产出的判据）

- **不做视觉／视口／交互断言**：`Task16` 的六档视口链接高宽、四处 visited 像素分类、`Task19` 的
  缩放／菜单交互／禁 JS 降级全部移交 Task 19。本包的 M／L 组只比字节与码点，与视口无关。
- **不实现白名单"条件版本"**：R9④ 之后 14 项与 `{…span:6}` 是无条件值；`E8/nobranch` 反而断言
  核验器代码里 `white.length` 只与 `14` 比较一次。
- **不实现任何年份豁免分支**：`J17/noexempt`、`J17/nobare` 用剥掉注释与字符串后的代码自检，
  并以 `J17/canary-*` 三条行为反证（`2024`／`2026` 必命中、CSS 数值不误报、裸 `\d{4}` 会误报）。
- **不复用 `_qa_task10/dom_facts.json`**：它没有 `__meta`，正是 D1 的现场；本包事实文件一律由
  `probe_task18.mjs` 现跑现取，M 组先判绑定再谈其余。

## 3. 抽查证据

`plan/Task18 §验证方法` 第 4 条要求的"改锚点看期望是否随动"由 `_qa_task18/anchor_spotcheck.py` 执行：
把 `plan/` 整目录复制成副本、每次只改一处锚点字面、用 `QODER_PLAN_DIR` 指向副本重跑核验器，
结果见 `_qa_task18/anchor_spotcheck.md`。`plan/` 本身全程未写。
