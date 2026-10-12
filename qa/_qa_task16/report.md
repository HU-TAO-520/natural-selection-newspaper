# Task 16 归档视觉系统 — 执行与验收报告

- 交付文件：`Results/styles.css`（本包唯一被改文件）
- 开工基线：`Results/styles.css` = `2c23817299492ea9a3fd7ad23237cfabd6723d166bd99194febbed09ad418ba1`，12401 B，555 行（等于表 1 与 `_qa_task15/hashes_after.txt`）
- 完工值：`de2d9022625d6c6a6c2833c09ad4cccd73dd0582689d018374ed09f68f3f5cc4`，15340 B，692 行 + 单个末尾 LF
- 结论：**通过**。新页面已具备与 v1 同源的纸媒观感，`H` 组既有语义一条未减，既有规则区逐字节未动。
- 时刻：2026-10-02（本地）

## 0. 文件所有权与实际改动

| 文件 | 本包动作 | 证据 |
| --- | --- | --- |
| `Results/styles.css` | 修改（两处新增） | 区段比对只含 insert，无 replace/delete（`verify_static.txt` S1） |
| 其余八文件（七页 HTML + `script.js`） | 未动 | 变异轮前后九文件哈希一致；`S7/readonly-others` PASS（`verify_css16.py`） |
| `content/`、`build/`、`deploy/`、`plan/`、`Materials/` | 未动 | 无写入动作；`deploy/` 未新增产物 |
| `_qa_task1/` … `_qa_task15/` | 只读 | 只读守卫：跑前后 size+mtime+sha256 比对，**被写入的历史 QA 文件=无**（`h_group_diff.py`） |
| `_qa_task16/` | 新建全部 QA 产物 | 见 §9 |

## 1. 插入位置与结构（16.1.4／§插入位置合同）

```text
第 1–8 分区（既有，逐字节不变）      行 1–359
第 9 分区（本包新增桌面区）           行 360–477   /* ---------- 9. 归档列表与首页最新区（Task 16） ---------- */
Task 8 banner（既有，不变）           行 478 起
@media (max-width: 768px) {         行 479（唯一、且仍是最后一个规则块）
  既有移动声明（不变）                行 480–667
  本包追加的移动端行                  行 668–691   /* ---------- 归档列表与首页最新区（Task 16 移动端追加） ---------- */
}                                   行 692
文件末尾单个 LF
```

判据 `S1/only-add`（无改写）、`S1/two-zones`（恰两处新增，且分别落在 @media 之前与 @media 内部）、`S6/media`（唯一 + prelude 精确 + 末块 + 桌面区在前）全部 PASS。
既有分区标题行号（新文件）：1／48／83／109／130／239／259／291 分区 + 本包 360 分区；移动块内既有子分区 488／506／521／587／623／636／647，本包追加 668。

## 2. 16.2 实测既有重置面（用 v2 七页 HTML + v1 `styles.css` 的"裸奔态"副本 `_qa_task16/bare/`）

| 实测项 | 裸奔态（Task 15 交接） | 本包之后 | 结论 |
| --- | --- | --- | --- |
| `.entry-list` 的 `list-style-type` | `disc`（`::marker` 已绘制） | `none` | 全局 `ul` 重置只写 `margin: 0; padding: 0`，**不含 list-style**，故必须在新容器局部消除项目符号——这就是 `css_rules.txt` 里记的原因 |
| `.home-latest__list` | `disc` | `none` | 同上 |
| 链接渲染盒 | `display: inline`，高 18px、宽 231–294px（375 与 1280 同） | `display: flex`，高 47.5–74.5px、宽 343–736px | 行内元素上 `min-*-size` 无效，本包把声明落在已 `display: flex` 的链接上 |
| 全局 `a`／`a:visited` | `color: var(--color-accent)`（0,1,0 与 0,1,1） | 未改 | 新链接类必须自带同色 `:visited`，否则被全局规则重绘 |
| `:focus-visible` | `outline: var(--focus-width) solid var(--color-accent); outline-offset: 3px` | 未改、未覆盖 | 新链接不新增焦点规则，沿用全局轮廓（§2 第 6 行） |

新规则不重复声明既有重置（未再写 `margin/padding` 于 ul），也不与其冲突。

## 3. 16.3 桌面新规则区（12 类）

逐条规则、声明与参照见 `_qa_task16/css_rules.txt`（与本包 §设计接口合同 第 1–2 条一一对应）。要点核对：

- 条目行 = `border-top` 细线 + `padding-block`，末条补 `border-bottom`，与 `.home-section` 同构；区块上边距 `--space-7`（列表页）／`--space-8`（首页最新区）。
- 标题默认 `--color-ink`，悬停才 `--color-accent` + 下划线；日期 `--color-muted` + `--font-size-small` + `white-space: nowrap` 靠右。
- 无项目符号、无箭头、无分隔点字符（`content` 在新规则区命中 0）；对齐关系由 flex 两端与细线表达。
- 取值 100% 来自表 2：`S3/var-whitelist`、`S3/novar`、`S3/nocolor`、`S3/numeric`（新区唯一字面长度值是合同点名的 `44px`）、`S3/table2-literal`（30 条变量与 `styles.css:10-45` 逐字符相等）全部 PASS。

## 4. 16.4 移动端追加（既有唯一块内部）

| 合同条 | 实现 | 实测 |
| --- | --- | --- |
| 1 堆叠 | `flex-direction: column`；`align-items: flex-start`；`gap: var(--space-1)` | 375/640/768 三档链接高 71.75–74.5px（标题在上、月日在下），769px 起回到 47.5–48.5px 的单行基线 |
| 2 触控目标 | `min-block-size: 44px` **且** `min-inline-size: 44px` + `padding-block: var(--space-3)` | 以 `getBoundingClientRect()` 实测**高与宽各自** ≥44，见 §5 表 |
| 3 安全换行 | `overflow-wrap: anywhere`（未用被禁的 `word-break: break-all`）+ `min-width: 0` + `hyphens: none` | 375 档最长标题折行数 1（列表页）与 1（首页最新区），`scrollWidth <= clientWidth` |
| 4 条目留白收敛 | 两类条目 `padding-block: var(--space-4)` | 条目高 99.5px（375）仍在线条节奏内 |
| 5 无新 `:root` 变量 | 追加区内无 `:root`、无 `--*:` 定义 | `S3/novar`、`H11/root` PASS |
| 6 禁令 | 无 `100vw`／`overflow-x`／`break-all`／`!important` | `S5/banned`、`H9` PASS |

`S1/only-add` 证明移动块内既有声明未被改写：比对结果**只含新增行**（`mutation_stdout`/`verify_static.txt`）。

## 5. 16.5 真实浏览器测量

两套手段并用：`measure.mjs`（同域 `file://` iframe 视口矩阵，规避本机无头 Chrome 的约 500px 顶层窗口下限）与 `cdp_probe.mjs`（`Emulation.setDeviceMetricsOverride` 真实视口 + 像素 + 控制台）。完整数据：`measure_results.json`／`measure_table.txt`／`cdp_facts_final.json`／`cdp_lines_final.txt`（含固定宽度截图，151 条断言 FAIL 0）／`cdp_facts_final3.json`／`cdp_lines_final.txt`（加入 E0 阳性对照后的最终轮，146 条断言 **FAIL 0**）。

### 5.1 视口矩阵（七页 × 375/640/768/769/1024/1280）

- 横向溢出：**0**（42 条记录全部 `scrollWidth <= clientWidth`；iframe 与 CDP 两口径一致）
- 链接实测渲染盒（最小值，逐条见 `measure_table.txt`）：

| 页 | 375 | 640 | 768 | 769 | 1024 | 1280 |
| --- | --- | --- | --- | --- | --- | --- |
| `index.html`（最新区 3 条） | 74.5×343 | 74.5×608 | 74.5×736 | 48.5×705 | 48.5×736 | 48.5×736 |
| 三张列表页（各 1 条） | 71.75×343 | 71.75×608 | 71.75×736 | 47.5×705 | 47.5×736 | 47.5×736 |

  全部**高与宽各自 ≥44 CSS px**（`Task12:312` 的 44×44 口径，v1 先例 `styles.css:411-414` 同样两维同写）。CDP 侧另用真实视口复核同一判据（`B/touch/*` 24 档全 PASS）。
- 折行：375 档最长中文标题（"设备升级了，使用门槛也该降下来"）在列表页与首页最新区各 1 行，`overflow-wrap: anywhere` 在场，无溢出。
- 768 ↔ 769 往复（768→769→768→769→768）：移动三次状态完全一致 `[mqMobile=true, mqDesktop=false, nav display=none, toggle=flex, clientWidth=768]`，桌面两次一致 `[false, true, block, none, 769]`，**无半态**（`C/往复一致` PASS）。

### 5.2 `:visited` 像素判定（含阳性对照）

**先给对照，再给结论。** 像素采样只有在 visited 真的被触发时才有意义，所以本包加了一条 A/B 阳性对照（`visited_control.html`，QA 产物）：同一页里两个链接指向**同一已访问目标**，唯一变量是有没有同色 `:visited` 伴生规则。

| 对照 | 像素均值 | 最近色 | `matches(':visited')` | `getComputedStyle` |
| --- | --- | --- | --- | --- |
| `.t16-pair`（有伴生） | `#372c2f` | ink Δ32 | false | `rgb(33, 31, 28)` |
| `.t16-nopair`（无伴生，按全局 `a:visited` 应变暗红） | `#33282c` | ink Δ26 | false | `rgb(33, 31, 28)` |

**实测结论（重要，且与合同的设想不同）**：在本机的 headless Chrome 上，**`file://` 链接不施加 visited 重绘**——即便先用 A 会话访问过目标页、关掉后换同一 `user-data-dir` 开 B 会话采样（`visited` 历史落盘再读），无伴生的对照链接仍然是墨色，`:visited` 匹配恒为 false。因此：

- 像素采样在本环境**只能证明**"四处链接默认渲染同为墨色、既不是浏览器默认紫也不是暗红"，**不能**用来证明 visited 保护生效。合同 §陷阱 1 与 16.9.1 设想的"删掉伴生就能看见紫"在离线 `file://` 下不可执行——这条已作为**环境限制**登记，连同复现方法交给 Task 19 在 https 实况下复验（线上部署后同一套控制页可直接重跑）。
- visited 配对的**实际判据**因此落在静态面：`S4/H13` 对四个链接类逐个比较 `.X` 与 `.X:visited` 的 `color` 字面值，要求**逐字符相等**（特异性 (0,1,0) < (0,1,1) 的推导见合同表 4）。变异 `m01`（删伴生）与 `m02`（伴生改 accent）都由这条判据捕获（§8）。

四处默认渲染的像素结果（`Page.captureScreenshot` 按元素盒裁剪 → `png.mjs` 解码 → 取与纸色距离最大的前 2% 像素均值）：

| 取样点 | 像素均值 | 到 ink | 到 accent | 到 UA 紫 | 判定 |
| --- | --- | --- | --- | --- | --- |
| 报头 `.site-masthead__link` | `#211f1c` | 0 | 89 | 123 | 墨色 |
| 导航 `.site-navigation__link`（非当前页） | `#2e2124` | 15 | 76 | 110 | 墨色 |
| 最新区 `.home-latest__entry` | `#2a2124` | 12 | 80 | 112 | 墨色 |
| 列表页 `.entry-list__title` | `#221f1d` | 1 | 88 | 121 | 墨色 |

四处同为 `--color-ink` 系，非紫非暗红。`getComputedStyle().color` 四处都报 `rgb(33, 31, 28)`（隐私规则下的假绿，Task 11 已踩过），已记录但不作为判据。

### 5.3 200% 缩放（三效分离）

CDP `zoom` 在本 Chrome 为 no-op，故拆开复现：布局 = CSS 视口 1280÷2 = 640（`innerWidth=640`），绘制 = `deviceScaleFactor: 2`（`devicePixelRatio=2`）。佐证：首条链接 `rect.width × dpr` 由 608 → **1216** 设备像素（文字实际像素翻倍），且 640 布局下仍 `scrollWidth <= clientWidth`（无溢出）。

### 5.4 控制台、样式表与降级

- 未捕获异常 **0**；控制台 error/warning **0**；`document.styleSheets` 每页 1 条、无错误条目、可读出 82 条顶层规则、`mediaText = "(max-width: 768px)"` 且为最后一条规则（七页全部）。
- 请求总数 21，非 `file://` 请求 **0**，加载失败 **0**（离线 `file://` 等价断网）。
- 禁 CSS（运行时把样式表全部 `disabled`）：七页 `textContent` 长度与校验和不变、`<main>` 内 DOM 顺序不变、链接仍为非零可点盒（导航 24×32／24×64，条目链接满宽）。
- 禁 JS（`Emulation.setScriptExecutionDisabled`）：七页根元素保持 `no-js`，`#site-navigation` `display: block` 且真实可见，`#nav-toggle` `display: none`。

### 5.5 缺席容错（16.5.7）

在副本 `_qa_task16/nodate/` 删掉三张列表页各自的 `entry-list__date` 节点、并删掉首页最新区第一个 `home-latest__date`（保留两个，使同一页同时出现两种形态），重跑六档视口：

- 三张列表页 `dates` 数组为 0（节点确实整体缺席），首页最新区剩 2 个日期节点；
- 单元素条目的链接实测仍 71.75×343（375）／47.5×736（1280），**高宽均 ≥44**，无高度塌陷；
- 标题 `x` 与链接 `x` 相等（`space-between` 在单元素下等价起始对齐），**无居中错位、无空洞**；
- 条目 `border-top`／`border-bottom` 两条细线均在场，条目高 > 60px。
真实 `Results/` 未被写（前后九文件哈希一致）。`display_date` 缺席是节点缺席的**唯一**触发条件（`Task12:273`／R9），`date` 缺失只改排序不改任何可见节点。

## 6. 16.6 既有版式未被污染

七页口径 = 首页 + 三张列表页 + 三个详情页（详情页不是 v1 四页之一）。数据：`compare_layout.py`（问题 0）、`measure_v1.json`（v1 四页 × 6 档）、`measure_results.json`。

1. **详情页**：`_qa_task15/before/news-<column>.html`（v1）与 `Results/article-<slug>.html`（本包之后）在六档视口下逐项相等，容差 0 —— `.article__body` 的 `font-size`／`line-height`／`max-width`／`text-align`／`text-indent`，`.article__header`／`.article__type`／`.article__byline`／`.article__date`／`.page-title` 的计算值与位置盒，**全部段落的位置盒列表逐元素相等**，报头字号与导航行高亦相等。
2. **首页引言区**：`.home-section__text`／`.home-section__title`／`.home-section` 的文本、字号、行高、颜色与位置盒与 v1 逐元素相等；`.main-content` 的**高度**按定义会因最新区追加而增长，故该字段不参与"引言区一致"判据（其余壳区计算值相等）。
3. **三张列表页**：只要求新规则区生效 + 既有壳区不变 —— 壳区计算值与 v1 相等，且条目链接 `display: flex`、高宽均 ≥44（新规则确实生效）。
4. **HTML 未动**：详情页 `<main>` 内部去掉前导 `\n` 与尾随两空格后与 `_qa_task13/main_slices/*.main-interior.html` 逐字节相等（切片 1269／5224／6735 B 在整页中逐字节出现；内部 1272／5227／6738 B = `\n` + 切片 + 两空格），见 `main_bytes_check.txt`；除 `styles.css` 外八文件哈希等于 `_qa_task15/hashes_after.txt`。
5. **H 组失败集合差分**（`h_group_diff.py` + `h_group_diff.txt`）：基线轮 = 当前七页 HTML + `before_styles.css`，当前轮 = 当前七页 HTML + 本包 `styles.css`，断言代码逐字取自 `_qa_task10/verify_task10.mjs` 的 H 组（`h_group_runner.mjs` 按行切片；唯一文本改动是把 `PAGES` 常量按 `H_PAGES` 换成四页/七页口径，断言一条不减）。

| 轮 | FAIL 标签 |
| --- | --- |
| 基线（未加新样式） | `H11` |
| 当前（本包之后） | `H11` |
| **新增失败** | **无**（允许集合：`H11`／`H11/root`） |
| 七页口径（本包之后） | **无 FAIL** |

`H11` 在基线轮就已红——因为 `verify_task10.mjs` 的类名对照面只有 v1 四页，而详情页的 `.article*` 类已迁到 `article-*.html`；本包没有让它变得更红，也没有放宽它。接管方是 `Task12` R6⑥ 与 `Task0 §稳定接口`（12 个新类已登记）。
`H13`／`H14` **不在**这场差分里：`verify_task10.mjs` 的 H 组只有 19 行／18 个标签（H1…H12/browser），本包不据不存在的断言报绿，两条定义在 §7 交付给 Task 18。
只读守卫：本次差分跑**未写入任何历史 QA 产物**（`_qa_task1`…`_qa_task15` 的 size+mtime+sha256 前后一致）。

## 7. H13／H14 定义（交付 Task 18 的两条新断言）

**H13 visited 配对** — 辖域是封闭清单，四个链接类：`.site-masthead__link`、`.site-navigation__link`、`.entry-list__link`、`.home-latest__link`。清单内每个类 `X` 必须存在 `X:visited` 伴生规则，且两者 `color` 值**逐字符相等**；缺伴生或不等即 FAIL。**`.skip-link` 显式豁免**（它无 `:visited` 伴生，见"既有事实登记"）；不得把辖域写成"任何非 accent 色的链接类"，否则 H13 在 v1 基线上必红。理由：类选择器 (0,1,0) 低于全局 `a:visited` (0,1,1)。实现要点：以类名白名单硬编码（本包的 `verify_css16.py` S4 即模板，见 `color_of()` 的逐字符比较）。

**H14 类集合与死规则** — (a) `styles.css` 的 class 选择器集合 ⊆（`Task0` 注册类 ∪ 归档新增 12 类），超出即 FAIL（R6⑥）；(b) 12 个新类**每个都至少被一条 CSS 规则使用**，这一半**无条件成立**，不因节点缺席而豁免；(c) DOM 在场性**只在节点被输出时断言**：`entry-list__date`／`home-latest__date` 在该条目缺 `display_date` 时整体不输出，未输出记 **N/A**（不是 FAIL），但它们的 CSS 规则仍必须在场，缺失按死规则 FAIL；其余 10 个新类每个至少在某个页面 DOM 中出现一次。判据实现见 `verify_css16.py` 的 `S2/selectors`、`S2/desktop-rules`、`S2/class-whitelist`、`S2/dom`、`S2/dom-date`（本包与 Task 18 共用同一套口径，不得各写一份）。

**既有区逐字节不变的判定方法**（可直接作通用闸门）：对 `before_styles.css` 与新文件做行级 `difflib` 比对，要求 ①无 replace/delete  opcode；②insert opcode 恰两段，一段全部位于 `@media` 行之前、一段全部位于 `@media` 行之后；③新增段内规则块的选择器并集 ⊆ 该任务授权的新类集合。本包 `S1/only-add`＋`S1/two-zones`＋`S2/selectors` 即此三条。

## 8. 16.8／16.9 静态核验与变异对照

`verify_css16.py`：基线模式（`--pre`，零新规则）21 条 **FAIL 0**（PASS 14／N-A 1／SKIP 6），全量模式 24 条 **FAIL 0**。16.1.3 要求的"脚本不是恒真"由两处证明：基线模式对新规则判据显式记 SKIP 而非伪造 PASS；`S7/css-changed` 在 --pre 下改判 `S7/pre-css-baseline`（被核验文件必须等于表 1 哈希）。

`mutate16.py` 14 类（+1 条宽度分支，共 **15 条**）变异全部注入 `_qa_task16/mutants/` 副本，每条**先自证确实构成违约**，再要求指定断言翻红。结果：**捕获 15／未捕获 0**，且全部变异前后真实 `Results/` 九文件哈希一致、除 `styles.css` 外八项等于 `_qa_task15/hashes_after.txt`（`mutation_log.txt` 末节）。预期映射：

| # | 变异 | 指定翻红 | 像素/渲染证据 |
| --- | --- | --- | --- |
| 1 | 删 `.entry-list__link:visited` | `S4/H13`（逐字符配对判据） | 同时跑 `cdp_probe --dir mutants/m01` 记录像素面：四处仍报墨色、`:visited` 恒不匹配——**本环境对 `file://` 不施加 visited 重绘**（§5.2 对照已证），故像素不能作为该违约的判据，如实登记 |
| 2 | `:visited` 色值改 accent | `S4/H13` | 同上（静态判据捕获；像素面无鉴别力） |
| 3 | 新增页面专属类 `.feature-list` | `H11` + `S2/selectors`/`S2/class-whitelist`/`S2/dom` | — |
| 4 | 移动 `:root` 加 `--font-size-list` | `H11/root` + `S3/novar`/`S3/var-whitelist` | — |
| 5 | `#latest-title` 设样式 | `H5/id` + `S5/banned` | — |
| 6 | `content: "·"` 注入分隔点 | `S5/banned`（+ `S2/selectors`） | v1 的 `H10` 只禁中文 content，`"·"` 不命中——**口径差已登记给 Task 18** |
| 7 | 桌面新规则整体移进 `@media` | `S2/desktop-rules` + `S1/two-zones` + `S6/media` | — |
| 8 | 复制一份 `@media (max-width: 769px)` | `H8` + `H8/other` + `S6/media`/`S6/breakpoint` | — |
| 9 | 两维 min-size→28px 且 padding 压到 0、gap 归零 | `S8/mobile-44` + `B/touch` | 实测高 <44（自证：渲染盒确实塌到 40px 级） |
| 9b | 只压宽度：`min-inline-size` 与 `inline-size` 同改 20px | `S8/mobile-44` + `B/touch` | 实测宽 =20px 而高仍 ≥44，证明宽度判据在跑。**合同设想的"只改 `min-inline-size` 而高度不变"经自证不构成有效变异**——链接是块级铺满，宽度仍 ≥44，渲染没变（首轮实测过），必须再用 `inline-size` 钉死宽度 |
| 10 | `word-break: break-all` | `H9` + `S5/banned` | — |
| 11 | 改一行既有 `.home-section` 的 `padding-block` | `S1/only-add`（区段比对） | 详情页与首页引言区实测数值会漂移 |
| 12 | 加 `!important` | `H5/important` + `S5/banned` | — |
| 13 | 加 `transition: color .2s` | `S5/banned`（本包禁止清单） | — |
| 14 | 删 `.entry-list__date` 全部规则 | `S2/desktop-rules`（H14 规则半项，无条件红） | DOM 节点仍在场，规则缺席即死规则 |

## 9. 16.7 对比度与焦点

| 组合 | 比值 | 普通文本 AA(≥4.5) | 大文本 AA(≥3.0) |
| --- | --- | --- | --- |
| `--color-ink` 于 `--color-paper` | **14.364:1** | 是 | 是 |
| `--color-muted` 于 `--color-paper` | **5.620:1** | 是 | 是 |
| `--color-accent` 于 `--color-paper` | **8.716:1** | 是 | 是 |
| `--color-rule` 于 `--color-paper`（装饰线，非文本） | 1.986:1 | 不适用 | 不适用 |

`--color-muted` 在本包新增用法只出现在 `.entry-list__date`／`.home-latest__date`（`--font-size-small` 的次要信息），未用于正文段落，未越界。焦点轮廓实测：`outline: solid 2px rgb(122, 36, 36)`、`outline-offset: 3px`，新链接上未被裁切或覆盖，新规则区内无 `outline: none`。

## 10. QA 产物清单（全部在 `Results/` 之外）

`_qa_task16/`：`before_styles.css`、`css_rules.txt`、`verify_css16.py`、`verify_static.txt`、`verify_baseline.txt`、`measure.mjs`、`_measure_host.html`、`measure_results.json`、`measure_v1.json`、`measure_bare.json`、`measure_nodate.json`、`measure_table.txt`、`cdp.mjs`、`cdp_probe.mjs`、`cdp_facts_final.json`、`cdp_lines_final.txt`、`png.mjs`（沿用 `_qa_task11/png.mjs` 的解码器）、`shot.html`、`shots/`（固定宽度截图 + visited 采样图）、`h_group_runner.mjs`、`dom_facts_probe.mjs`、`dom_facts_*.json`、`h_rows_*.txt`、`h_group_diff.py`、`h_group_diff.txt`、`compare_layout.py`、`main_bytes_check.txt`、`mutate16.py`、`mutants/`、`mutation_log.txt`、`nodate/`、`bare/`、`pages.json`、`report.md`。
`Results/` 仍为九文件，无 `before_styles.css`、无截图、无 `.map`、无备份。

## 11. 交接

**给 Task 17（打包）**：`Results/styles.css` 的 v2 哈希 = `de2d9022625d6c6a6c2833c09ad4cccd73dd0582689d018374ed09f68f3f5cc4`（15340 B，692 行），是基线链的下一环；**样式已完成，可以进入打包**（本包通过前不得发布的前提已解除）。打包集合仍为九文件 + `_headers`；`Results/` 内不得出现 `before_styles.css` 或截图。

**给 Task 18（闸门）**：①H13／H14 完整定义见 §7（含 `.skip-link` 豁免与 `*__date` 的 N/A 口径）；②"既有区逐字节不变"的三段判据方法见 §7 末（可作"样式任务不得污染冻结规则"的通用闸门）；③§8 的 14+1 类变异清单可直接并入其变异矩阵；④实测期望值来源：六档视口的链接高宽（§5.1 表）、四处 visited 像素分类（§5.2）、`document.styleSheets` 顶层规则数 82、`mediaText`；⑤H 组 19 行／18 标签对账：本次四页口径产出 19 行／18 标签，其中 FAIL 只有 `H11`（且基线轮已红，非本包引入）；⑥两条需在重写闸门时采纳的口径差：`H10` 不拦 `content: "·"`（只拦中文），以及 v1 页面集合从四页扩到七页后 `H11` 的类名对照面必须跟着扩；⑦`h_group_runner.mjs` 的"按行切出 H 组单独跑"办法可复用，但必须保留只读守卫（本包已验证它不改写任何历史产物）。

**给 Task 19（浏览器回归）**：视口矩阵与三效分离复现要点（布局 640 等效 200%、绘制 `deviceScaleFactor:2`、`rect.width × dpr` 翻倍佐证）；`:visited` 只能像素判定且违约色是 `--color-accent` 暗红（不是 UA 紫）；无头 Chrome 500px 下限与 `scrollWidth <= clientWidth` 判据；`display_date` 缺席场景保留为独立回归用例（缺席只由 `display_date` 触发）；触控目标回归须同时验高与宽（44×44）；`_qa_task16/nodate/` 是可直接复用的缺席态副本生成器。

**给用户**：三张栏目列表页与首页"最新报道"区现在读起来像同一份报纸的目录——细线分隔、标题左对齐墨色、月日靠右灰字，悬停才转暗红；手机端标题与日期上下排列且每行可点区域不小于 44×44。若还要改视觉（更紧凑、换字号、调间距），那属于对既有规则区的改写，需你明确批准并回流 Task 3／8；另有一处 v1 遗留的 `.skip-link` 访问态不一致，本包按合同只登记未修改。下一步是 Task 17 打包，上传仍由你执行。

## 12. 完成定义逐项勾选

| # | 条款 | 状态 | 证据 |
| --- | --- | --- | --- |
| 1 | `Results/` 仅 `styles.css` 一项哈希变化，其余八项等于 `_qa_task15/hashes_after.txt` | 满足 | `verify_static.txt` S7/readonly-others + S7/collection；变异轮前后九文件哈希一致 |
| 2 | 既有规则区逐字节不变，变更只有两处新增 | 满足 | S1/only-add（无 replace/delete）+ S1/two-zones（@media 前一段 + @media 内一段） |
| 3 | 12 类每个都有 CSS 规则（无条件）；DOM 在场按 H14 条件口径 | 满足 | S2/desktop-rules（12/12）、S2/dom（10 类逐页计数）、S2/dom-date（当前两日期类都在场，输出 3+3 次）、`class_dom_map.json` |
| 4 | 取值全来自表 2，无新变量、无表外色值，表 2 与文件逐字符一致 | 满足 | S3/var-whitelist、S3/novar、S3/nocolor、S3/numeric、S3/table2-literal（30 条） |
| 5 | 两个链接类有同色 `:visited` 伴生；像素确认四处同为墨色；H13 辖域四类、`.skip-link` 未判红 | 满足（字面判据全部成立），但有一项**环境限制**须知情 | 伴生与逐字符同色：S4/H13 PASS；四处像素同为墨色系（非紫非暗红）：E 段 4/4 PASS（Δ0/15/12/1）；`.skip-link` 记 N/A 未判红。**限制**：E0 阳性对照实测本环境（headless Chrome + 离线 `file://`，含跨会话 profile）根本不施加 visited 重绘，所以"用像素暴露未配对时的重绘"这一步在此不可执行——配对的证明因此由静态逐字符判据与 m01/m02 两处针对性变异承担，像素面只承担合同字面要求的那一半（同为墨色系）。已交接 Task 19 在 https 实况下用同一控制页复验（§5.2） |
| 6 | `@media (max-width: 768px)` 唯一、prelude 精确、最后一个块；桌面新区在其之前 | 满足 | S6/media + H8/H8/other 七页口径 PASS + 浏览器解析证据（`mediaText`、`lastIsMedia`，七页） |
| 7 | 六档视口无横向溢出；768↔769 往复无半态 | 满足 | `measure_results.json` 42 条 0 溢出；CDP `B/viewport`/`B/overflow` 24 档；`C/往复一致` PASS |
| 8 | 列表页与最新区所有链接实测高宽均 ≥44 | 满足 | §5.1 表（iframe）+ CDP `B/touch` 24 档，逐条记录在 `measure_table.txt` |
| 9 | 长中文标题 375px 下 `overflow-wrap: anywhere` 安全折行，未用 break-all | 满足 | 375 档折行数 1（`Range.getClientRects()`）；H9/S5 无 break-all |
| 10 | 删一个 `display_date` 节点的副本实测布局不塌、无空洞、无居中错位 | 满足 | `nodate/` 副本 24 条记录 0 判据失败；`compare_layout.py` A 段 0 问题 |
| 11 | 三篇详情页与首页引言区关键计算值与 v1 逐项相等（容差 0）；`<main>` 仍等于 `main_slices/` | 满足 | `compare_layout.py` B 段 0 问题；`main_bytes_check.txt`（切片 1269/5224/6735 B 逐字节出现在整页中） |
| 12 | H 组既有 19 行／18 标签经失败集合差分复核；新增失败只属 H11；H13/H14 归 Task 18 | 满足 | `h_group_diff.txt`：基线轮与当前轮 FAIL 都只有 `H11`（差分为空），七页口径 18 标签全 PASS；行数 19／标签 18 对账一致 |
| 13 | 新规则区 15 类禁用命中为 0 | 满足 | S5/banned（含 `min-width` 查询与 fixed/sticky 定位的窄口径）+ S5/comments |
| 14 | `verify_css16.py` 基线全绿；变异全部被指定断言捕获且每条自证有效 | 满足 | 基线 `--pre` 21 条 FAIL 0；全量 24 条 FAIL 0；`mutation_log.txt`（15 类，含 9b 宽度分支） |
| 15 | 禁 CSS／禁 JS 两态七页完整可读；`styleSheets` 无错误、控制台 0 报错 | 满足 | `cdp_lines_final3.txt` G 段 14 条 + A 段 21 条 |
| 16 | 对比度三项记录在案；焦点轮廓未被覆盖 | 满足 | §9（14.364／5.620／8.716）；F 段 outline=solid 2px rgb(122,36,36)、offset=3px，无 `outline: none` |
| 17 | 全部 QA 产物在 `_qa_task16/`，`Results/` 无新增文件，未生成 `deploy/` 产物 | 满足 | §10 清单 + S7/collection；`deploy/` 仍为 9-19 的 `_headers` 与陈旧 `site.zip`，本包未写 |

17 项按合同字面判据全部满足。唯一需要向下游交代的是第 5 项的**环境限制**：本机的离线 `file://` + headless Chrome 不施加 `:visited` 重绘（E0 阳性对照已证），因此像素面无法证明"未配对会被重绘"，该证明由静态逐字符判据与 m01/m02 变异承担，实况 https 下的复验留给 Task 19。
