# Task 8 验收报告 — 移动端响应式布局 `Results/styles.css`

验收时间：2026-09-19 ｜ 唯一改动文件：`Results/styles.css`（7068 → 11087 字节，仅在文件末尾追加一个 `@media (max-width: 768px)` 区段）

## 1. 结论

**Task 8 通过验收（阶段 B CSS 实施 + 阶段 C 真实内容最终验收）。**

| 层次 | 脚本 | 结果 |
| --- | --- | --- |
| 变更边界 / 媒体查询合同 / 选择器白名单 / 禁止声明 / 文本不变 | `_qa_task8/verify.py` | 174 项，0 失败 |
| 真实浏览器四页 × 三态 × 五宽度 + 跨断点 | `_qa_task8/run_browser.py` + `probe.html` | 1843 项，0 失败 |
| 变异捕获（34 静态 + 10 浏览器） | `_qa_task8/mutate.py` | 44/44 捕获，对照组 rc=0 |
| 真实像素截图（状态回读确认） | `_qa_task8/shot.py` | 11/11 采集成功 |
| Task 3 桌面基线回归 | `_qa_task3/verify_css.py` | 199 项中 191 通过；8 项为“Task 3 阶段不得含移动规则”类过期门禁，见第 6 节 |
| Task 2 公共壳回归（失败集合差分） | `_qa_task2/verify.py` | 改动前 47 项失败 → 改动后 47 项失败，**新增 0 项** |
| Task 4／5／6／7 回归 | 各自 `verify*.py` | 仅新增“styles.css 未被本任务改动”一类过期断言，内容项全绿 |

交付文件 `Results/styles.css` SHA-256 =
`14a4a204f62e5c59be9a9edbab7f8dd2a09b81d43346769645223b72a599e093`（实施前 `30d74661…d040d`）。

## 2. 阶段门禁核对（实施前）

- Task 2 四页公共壳存在且 class/ID 一致（Task 2 回归 0 新增失败）。
- Task 3 `Results/styles.css` 存在，桌面 1024／1280 基线 199 项全绿（实施前实测 rc=0）。
- Task 4 首页三个语义区块、Task 5 的 4 段、Task 6 的 23 段、Task 7 的 29+1 段均已落地并通过各自逐字符合同。
- 三份 Word 素材哈希仍等于 Task 1 冻结值（`DE10B575…`、`0C5B3525…`、`8E50CFC8…`）。
- 样式表末尾在实施前无任何来源不明的移动端规则（Task 3 明确“不实现 `max-width: 768px`”）。
- 本窗口内无 Task 3 并发编辑：实施前快照 `_qa_task8/baseline/styles.before.css`，实施后桌面区段逐字节为其前缀。

## 3. 变更边界

- 唯一变更：`Results/styles.css`。四个 HTML 的 SHA-256 与实施前逐项一致
  （`73f49fd8…`、`66ae5826…`、`73ff7567…`、`a2dbf4aa…`）。
- 未创建、未修改 `Results/script.js`（本窗口开始时即不存在，结束时仍不存在）。
- `Results/` 仍是 5 个约定文件；QA 脚本、探针、截图、JSON 全部在 `_qa_task8/`。
- 三份 Word 素材未被打开改写。
- 移动区段是文件末尾唯一新增块，桌面区段（`@media` 之前）与 Task 3 基线逐字节相同。

## 4. 实施内容（对应计划“推荐的移动端 CSS 蓝图”）

- 断点：精确 `@media (max-width: 768px)`；768 命中移动、769 整体退出恢复桌面基线，无 `767px`／`48rem`／设备查询。
- 变量：`:root` 内只覆盖 `--page-gutter: 1rem`、`--font-size-reading: 1.0625rem` 与三个 `clamp()` 字号；未重定义颜色、字体族、桌面 `--layout-max`／`--reading-max`／`--title-max`。
- 版心：报头内部与主内容共用 Task 3 公式，留白 375→343px、768→736px、769→705px（实测逐项相等）。
- 菜单按钮：仅 `html.js` 且 ≤768px 显示；可见文字“菜单”保留；三条线全部由现有 `.nav-toggle__icon` 及其 `content: ""` 伪元素绘制；`[aria-expanded="true"]` 时变为关闭符号（只改 `background`/`transform`/`inset-block-start`）。
- 三态：`.js` 折叠用 `display: none`（关闭链接 `focus()` 无效、`getClientRects()` 为 0）；`.js .site-navigation.is-open` 与 `.no-js .site-navigation` 展开；769px 起按钮隐藏、导航横向常显。
- 纵向列表：`flex-direction: column`、`gap: 0`、相邻项 `border-top` 分隔、链接 `display: flex` 占满整行并保留当前页暗红 + 2px 实线下边线。
- 点击区：`.js .nav-toggle` 与 `.site-navigation__link` 均声明 44px 下限，实测矩形见第 5 节。
- 四页收缩：主内容上下内边距 2rem／3rem、报头纵向堆叠、首页区块 1.25rem、文章头部 1.25rem + 与正文 1.5rem、正文 `text-align: start`、日期仍右对齐无缩进。
- 安全换行：只在 `.page-title`、`.home-section__title/__text`、`.article__body > p`、`.article__date` 上声明
  `overflow-wrap: anywhere; word-break: normal; hyphens: none`；未用 `break-all`、`nowrap`、`overflow-x` 隐藏、`wbr`、软连字符、零宽字符或 `&nbsp;`。
- 属性名沿用：`.main-content`／`.article__header`／`.site-header` 的移动覆盖继续使用桌面的物理 `padding-top/bottom`，未与逻辑属性混写同一间距；导航与报头宽度用逻辑属性，避免与 Task 3 的“容器无固定宽高”合同冲突。

## 5. 浏览器实测

方法：无头 Chrome + 同域 `iframe` 作为精确 CSS 布局视口（本机内置浏览器视口为 0×0）；`js`／`js-open` 状态只在探针运行时改运行时 class 与 `aria-expanded`，**不写回 HTML**。判定溢出严格用 `scrollWidth <= documentElement.clientWidth`（比计划的 `innerWidth` 更紧）。

| 条件 | 覆盖 | 结果 |
| --- | --- | --- |
| 375px × 4 页 × `no-js`／`js` 关闭／`js` 打开 | 12 组 | 留白各 16px、版心 343px；按钮与四个链接实测矩形 ≥44×44；无横向溢出 |
| 768px × 4 页 × 三态 | 12 组 | 版心 736px；移动按钮仍在；列表纵向、`gap: 0` |
| 769px × 4 页 × 三态 | 12 组 | 按钮 `display: none`；导航横向常显、`gap: 40px`、四项同一行；版心 705px（各 32px 留白） |
| 1280px × 4 页 × 三态 | 12 组 | 版心 1120px（`--layout-max` 生效）、正文 736px、报头 64px、页面标题 40px、正文 18px 两端对齐 |
| 640px（1280／100% → 200% 缩放后的实际 CSS 视口）× 4 页 × 三态 | 12 组 | 进入移动断点为正确重排；三态全部复查通过；无裁切、无重叠、无横向滚动 |
| 跨断点 768 → 769 → 768 → 1280 | 每页每态 | 769 时移动 `display:none` 立即失效；回到 768 显隐规则再次生效；`.is-open`／`aria-expanded` 不被 Task 8 改动 |

关键实测值：375px 下报头 41.25px、页面标题 28px、正文 17px（层级仍为报头 > 标题 > 正文），版心 343px、左右留白各 16px，按钮矩形 86×46、四个链接矩形 343×46；768px 下版心 736px、字号 56/36/17、链接矩形 736×46；评论页长标题在 375px 由 Range 行数实测自然折为 2 行。

`200%` 缩放的等效做法与限度（如实记录）：本机无法用命令行驱动浏览器真实缩放——实测
`--force-device-scale-factor=2 --window-size=1280` 得到的仍是 `topInnerWidth=1258 dpr=2`，
即 `--window-size` 以 DIP 计，CSS 视口并未减半。因此本任务按计划“媒体查询依据 CSS 视口宽度”的口径，
直接在 **640 CSS px**（1280／100% 缩放到 200% 后的实际视口宽度）上完成四页三态复查，
实测 `clientWidth=640 innerWidth=640`、`matchMedia("(max-width: 768px)").matches === true`、
移动菜单出现且三态全部正确；未使用 CSS `zoom` 或 `transform: scale()` 模拟。**在真实浏览器里
手动把缩放调到 200% 并硬刷新的一步属于 Task 11 的终检**，本任务已把判定口径与预期结果交接过去。

焦点与触控：`skip-link` 未聚焦时 `bottom <= 0`，聚焦后完整落在左上且宽度 > 60px、轮廓 2px 实线；`#main-content` 可聚焦且轮廓 2px；导航及其祖先链 `overflow` 全为 `visible`，`js` 关闭态四个链接 `focus()` 后 `activeElement` 不变（不留在 Tab 顺序）。

四页专项：首页三区块顺序与文本逐字符不变、单列、分隔线不越界；消息页 4 段与电头后单个 U+0020 不变、“今日7时／47个社团”完整；通讯页 23 段无第 24 空段、引号与双破折号原样；评论页 29 段 + 独立 `p.article__date`，`86英寸`、`Windows 10`×2、`.exe`×3、`UOS`×4、`USB`×4、`OPS`、`Linux`、`4K`、`5次碰撞`、`3个U盘` 计数原样，正文 U+0020 总数仍为 2，无 `安 装` 拆词。

截图（`_qa_task8/shots/`，每张均回读 `clientWidth` 与状态）：`commentary_nojs_500`（无按钮、四项纵向常显）、`commentary_js_500`（汉堡 + “菜单”，导航折叠且无残留空白）、`commentary_jsopen_500`（✕ + “菜单”，纵向菜单展开、当前页暗红下划线）、`index_jsopen_500`、`message_jsopen_500`、`feature_js_500`、`commentary_jsopen_640_zoom200`、`commentary_js_768`、`desktop_1280_commentary` 等 11 张。

## 6. 上游回归与过期断言说明

`_qa_task3/verify_css.py` 实施前 199／199 全绿，实施后新增 8 项失败，全部属于“Task 3 阶段样式表尚不得含移动规则”一类时点门禁或其解析器副作用：

1. `无 @media（含 768px 折叠规则）`——Task 3 计划第 24 行明确“Task 8 在本文件末尾追加 `max-width: 768px` 的覆盖规则”。
2. `自定义属性无重复声明`——Task 8 合同要求在媒体查询内覆盖同样 5 个尺寸变量。
3. `无 :root . 页面识别补丁`——该检查把 `sel_blob` 用空格拼接后做子串匹配，`@media { :root {…} .site-header {…} }` 被拼成 `":root .site-header"`；已用精确断言证明不存在任何以 `:root` 为前件的后代选择器（`verify.py` 同名项）。
4. `禁止项：无 content 注入`——命中 `content: ""`，为空串装饰（Task 8 计划要求用现有伪元素画三条线）；已加断言限定 `content` 只能为 `""`，非空注入会被捕获（变异 M27）。
5. `禁止项：无 transform 位移缩放`——命中 `transform: rotate(±45deg)`，即计划蓝图给定的展开态关闭符号；`scale/translate` 仍为 0（变异 M 组另有覆盖）。
6. `禁止项：无 min-width/max-width px 版心`——正则命中媒体查询条件里的 `max-width: 768px`，不是内容宽度；已加断言限定移动区段不得出现 `max-width: Npx` 版心。
7. `花括号配对`——`{=71 }=71` 实际配对，失败仅因该脚本把 at-rule 的 `{` 也计入规则数（`rules=70`）；已用自写解析器断言整体与区段内花括号均自洽。
8. `无嵌套/preprocessor 语法残留`——`^@media` 命中，属 SCSS 残留检查，非本任务违约。

其余 191 项（版心公式、颜色与字体栈、跳至正文、焦点轮廓、导航当前页非颜色提示、正文 `2em` 缩进、电头内联、日期右对齐无缩进、桌面 1280／1024 尺寸）全部保持通过 → 移动规则未污染桌面基线。

Task 2（`QODER_RESULTS_DIR` 基线差分）47 → 47，新增 0；Task 4 新增 1 项“styles.css mtime 晚于 index.html”；Task 5／6／7 各新增 1 项“styles.css 未被本任务改动”。这些均为跨任务改动的必然结果，其内容、结构与逐字符断言全部保持通过。

## 7. 完成定义逐项

- [x] Task 5／6／7 真实内容已完成并先通过 Task 1 逐段核验（第 2 节；回归中逐字符项仍全绿）
- [x] 首页具备 Task 4 三个真实语义区块，已纳入四页回归
- [x] 唯一正式文件变更是 `Results/styles.css` 的移动端规则（桌面区段为其逐字节前缀）
- [x] 四个 HTML、`script.js`（仍不存在）与三份 Word 素材均未被 Task 8 修改
- [x] 媒体查询精确 `max-width: 768px`，769px 恢复桌面基线（实测 `matchMedia` 与几何两侧均验证）
- [x] 四页 375px／768px 使用移动布局，左右内边距 16px（版心 343／736px 实测相等）
- [x] 四页 769px／1280px 恢复桌面布局，移动规则未泄漏（字号 64/40/18、gap 40px、按钮隐藏）
- [x] 报头与页面标题使用 `clamp()`，长标题折行 2 行且无裁切、无横向溢出
- [x] `.js` 关闭、`.js .is-open` 打开、`.no-js` 常显三种移动导航状态全部正确（四页 × 375/768/640）
- [x] Task 9 尚未完成：已记“待 Task 9 集成”并交接 Task 11；未创建任何临时脚本，运行时 class 改动未写回 HTML
- [x] 菜单按钮与四个可见链接实际点击矩形均 ≥44×44（`getBoundingClientRect()` 实测，非按 padding 推断）
- [x] 关闭态链接不留在 Tab 顺序（`focus()` 无效 + `getClientRects()` 为 0），展开态焦点轮廓完整未被裁切
- [x] 首页三区块、消息 4 段、通讯 23 段、评论 29 段 + 独立日期在窄屏完整显示
- [x] 四页在 375／768／769／1280／200%（640）关键状态下 `scrollWidth <= clientWidth`
- [x] 换行保护纯 CSS：无 `<wbr>`、软连字符、零宽字符、额外空格、`&nbsp;`、正文专属 span
- [x] 三篇文章段落数与逐项 `textContent`（未 trim、未归一化）在 Task 8 前后完全一致
- [x] 无 `!important`、ID 选择器、`100vw`、`word-break: break-all`、溢出遮盖、固定内容高度、页面专属补丁
- [x] 200% 缩放后（=640 CSS px 实际视口）四页跳至正文、菜单、标题、署名、正文、日期与焦点完整可用，三种菜单状态均覆盖；手动调真实缩放那一步已按口径交 Task 11
- [x] Task 7 未改移动 CSS（评论页哈希未变）；Task 8 未改任何正文（四个 HTML 哈希未变）
- [x] 每次修正后重跑四页完整宽度矩阵、菜单三态、文本不变与桌面回归（第 8 节）

## 8. 验收脚本自身的可信度

`_qa_task8/mutate.py` 注入 44 个违约变异并全部被捕获，未变异对照组 `rc=0`：

- 静态 34 项：断点 767／`48rem`／769、第二个同断点区段、移动区段整体前移、`!important`、ID 选择器、`100vw`、`overflow-x: hidden`、`break-all`、`opacity` 折叠、删 `.js` 折叠、删 `.no-js` 兜底、删按钮隐藏、按钮/链接点击区不足、`gap` 未清、列表仍横向、`is-open` 别名、页面专属 class、`:nth-child` 补丁、重定义颜色变量、留白 <16px、正文退回 `justify`、电头改块级、日期获缩进、`content` 注入文字、菜单动画 + `max-height`、标题 `nowrap`、重写桌面基线、删结尾花括号、HTML 注入 `<wbr>`／内联 `style`／正文改一个字符。
- 浏览器 10 项：断点 769／767、按钮实测矩形 <44px、`.js` 折叠缺失、透明度折叠、`no-js` 降级失效、列表仍横向、留白 8px、放弃 `clamp()`、区块固定高度截断。
- 过程中据此修掉 3 个真实缺陷：`flex-direction` 锚点歧义（先命中 `.site-header__inner`）、`.no-js` 兜底在现有级联下不可被误伤（改选可观测的降级变异）、以及 `--screenshot` 抓到异步 resize 中间态（改用 `shot.html` 固定宽度并回读 `clientWidth`）。

## 9. 遗留与交接

- **待 Task 9 集成**：真实按钮点击、Enter／Space、Esc、点链接关闭、焦点返回、跨到 769px 时清除 `.is-open` 与 `aria-expanded`。`Results/script.js` 仍不存在，Task 8 未创建占位脚本；本任务只定义这些状态对应的视觉规则，并已证明 CSS 不阻碍状态显示。
- Task 10：继续按 Task 1 数组核验 4／23／29+1 与禁止项；本任务未改任何 HTML，可直接复用 `_qa_task8/verify.py` 的哈希与逐段断言。
- Task 11：在真实浏览器（含真实缩放与键盘、禁用 JavaScript）跑四页 375／768／769／1280／200% 与跨断点集成。
- 若 Task 5–7 正文日后更正，须先过各自内容合同，再重跑本文全部四页矩阵；`_qa_task8/baseline/` 保存了实施前快照，`QA_RESULTS=<副本目录>` 可让 `verify.py` 指向变异或候选副本。
