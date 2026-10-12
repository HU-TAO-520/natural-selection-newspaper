# Task 19 变异对照日志（回归器自身有效性）

- 台架：`qa/_qa_task19/mutate_task19.mjs`；副本目录：`qa/_qa_task19/mutants/<变异名>` 与 `qa/_qa_task19/mutants/<变异名>-control`（真实 `Results/` 一个字节未改）
- **两台一套（control + mutant）**：捕获 = 指定判据在 mutant 红**且**在 control 绿（FAIL 集合做差）。
  不做差会出两种错：一条既有红灯被冒领成本例捕获；或对照组本就该红的判据让人误以为漏检。
- 登记 12 例　实跑 12 例　有效变异 10　无效 2　捕获 10　未捕获 0　**捕获率 100%**
- 第 1 例 `column-reverse` 必须红：`捕获`

## 逐例

| # | 变异名 | 结构性准备（两台共有） | 注入内容（只给 mutant） | 来源与为什么不合并 | 前置自证 | 指定应翻红 | 差分命中 | 对照组已红 | 结论 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `m01-column-reverse` | 两张台架都各铺 4 条（假文章标题，非清单标题）：单条栏目反不出顺序 | 副本 styles.css 追加 `.entry-list{display:flex;flex-direction:column-reverse}`（DOM 源码顺序保持不动） | 合同第 1 例。字面只加 flex-direction 对 block 级 ul 不产生视觉变化，故同时声明 display:flex；前置自证以"bounding box 反序确实成立"为准 | 渲染层（bounding box 与 DOM 序列确实反序） 实测={"n":4,"dom0":"新闻消息样本条目1（含 Windows 10 与 4K 混排长标题 volunteer-club-note）","vis0":"新闻消息样本条目4（含 Windows 10 与 4K 混排长标题 volunteer-club-note）","reversed":true} → 成立；control 同一表达式={"n":4,"dom0":"新闻消息样本条目1（含 Windows 10 与 4K 混排长标题 volunteer-club-note）","vis0":"新闻消息样本条目1（含 Windows 10 与 4K 混排长标题 volunte（对照组不得已反序） | RK2b | RK2b | — | **捕获** |
| 2 | `m02-aria-current-self` | 无（直接复制九文件） | article-school-course-volunteer.html 的 aria-current 从所属栏目 news-message.html 挪到「首页」链接上 | 合同第 2 例。详情页在四链接导航里没有"自身"节点，挪到非所属链接是同一违约面：当前项归属错 | 字节层 + 渲染层（当前项落在首页链接） 实测={"cur":["index.html"]} → 成立；control 同一表达式={"cur":["news-message.html"]}（对照组不得已反序） | RK4 | RK4 | — | **捕获** |
| 3 | `m03-latest-href-other-column` | 无（直接复制九文件） | 首页最新区第 2 条 href 改为全局序末位页 article-classroom-screen-upgrade.html（不在最新三条内），标题仍是该条原标题（R11①：判据取自全局序，不再假设每栏目一条） | 合同第 3 例：K3 要求标题与 href 双一致，本例破坏 href 一侧 | 渲染层（第二条 href 已指向最新区外页面，标题仍是第 2 条原标题 → href/标题双一致被单边破坏） 实测={"href":"article-classroom-screen-upgrade.html","title":"坝河以北，走过的东坝"} → 成立；control 同一表达式={"href":"article-north-of-dam-river.html","title":"坝河以北，走过的东坝"}（对照组不得已反序） | RK3 | RK3 | — | **捕获** |
| 4 | `m04-drop-home-latest-visited` | 无（直接复制九文件） | 删除 `.home-latest__link:visited{color:var(--color-ink)}` 整条规则（全局 `a:visited{color:accent}` 随即接管） | 合同第 4 例：静态写了 :visited 不代表生效（运行面），生效了不代表每处都写了（静态面由 Task 18 的 H13 抓）。本例用渲染层差分做前置自证，而不是只看 CSS 文本 | 字节层（组件 :visited 覆盖已删，全局 a:visited 仍在） → 成立；RN7 两台采到的像素逐条相同（共 3 条）→ 违约没有落到屏幕，属无效变异；该 DOM 形状由静态链（Task 18 H13）守 | RN7 | — | — | **无效变异（前置自证不成立 → 修台架，不改判据也不改产品代码）** |
| 5 | `m04b-drop-site-navigation-visited` | 无（直接复制九文件） | 删除 `.site-navigation__link:visited{color:var(--color-ink)}` 整条规则（主导航链接的文字是 `<a>` 的直接子节点） | 与合同第 4 例同一违约面、换一个 DOM 形状：用来证明 R-N 像素链确实能分辨"已访问覆盖被删"，而不是只会看 CSS 文本 | 字节层（主导航 :visited 覆盖已删） → 成立；RN4 两台采到的像素逐条相同（共 27 条）→ 违约没有落到屏幕，属无效变异；该 DOM 形状由静态链（Task 18 H13）守 | RN4 | — | — | **无效变异（前置自证不成立 → 修台架，不改判据也不改产品代码）** |
| 6 | `m04c-paint-current-link-paper` | 无（直接复制九文件） | 副本 styles.css 追加 `.site-navigation__link[aria-current="page"]{color:var(--color-paper)!important; border-bottom-color:var(--color-paper)!important;}`（当前项高亮在屏幕上整体消失：文字与 2px 实线都涂成纸色） | 与第 4 例同一判据面（R-N 链 B 的像素定类 + K4 的当前项配色），换一个在渲染层确实可见的违约形状。注：第一次尝试只改文字色时被判"两台像素相同"—— 当前项的 2px 暗红实下边线本身是区内最强的纯色像素，只改文字不动线，聚类仍被那条线定类；这条正好说明判据量的是"屏幕上那一块到底长什么样" | 渲染层（当前页链接的计算色与下边线颜色都变成纸色） 实测={"color":"rgb(245, 239, 228)","bb":"rgb(245, 239, 228)"} → 成立；control 同一表达式={"color":"rgb(122, 36, 36)","bb":"rgb(122, 36, 36)"}（对照组不得已反序）；RN5 渲染层差分成立：control rgb(122,36,36) 距ink=89 距accent=0 ≠ mutant rgb(245,239,228) 距ink=null 距accent=null | RN5, RK4-PIX | RN5 | — | **捕获** |
| 7 | `m05-shrink-tap-target` | 无（直接复制九文件） | 移动档 `.entry-list__link` min-block-size 44px→28px，并 padding-block:0、gap:0、标题与日期字号压到 9px/line-height 1 | 合同第 5 例（v1 真实教训）：只改声明而 padding 仍撑住时渲染层没有违约，那种是无效变异而不是漏检 | 渲染层（375px 下实测高度 <44 而宽度仍 ≥44） 实测={"h":28,"w":343} → 成立；control 同一表达式={"h":72,"w":343}（对照组不得已反序） | RD1 | RD1 | — | **捕获** |
| 8 | `m06-drop-matchmedia-reset` | 无（直接复制九文件） | 删除 `media.addEventListener("change", handleBreakpoint)` 的注册分支（其余行为不动） | 合同第 6 例：跨到桌面断点必须自动关闭菜单 | 字节层（matchMedia 仍在但 change 监听已摘除） → 成立 | RG1 | RG1 | — | **捕获** |
| 9 | `m07-inject-console-log` | 无（直接复制九文件） | script.js 末尾注入 `console.log("task19-mutant-noise")` 并置 window.__mutantRan | 合同第 7 例：R-J 断言控制台 0 输出 | 渲染层（注入语句确实被执行过，排除"读到半写入脚本"的假漏检） 实测={"ran":true,"cls":"js"} → 成立；control 同一表达式={"ran":false,"cls":"js"}（对照组不得已反序） | RJ4 | RJ4 | — | **捕获** |
| 10 | `m08-inject-external-image` | 无（直接复制九文件） | 首页 </main> 前注入 `<img src="https://task19-mutant.invalid/x.png" alt="">` | 合同第 8 例：全站外部网络请求数必须为 0 | 渲染层（DOM 里真有指向 http(s) 的图片） 实测={"n":1,"src":"https://task19-mutant.invalid/x.png"} → 成立；control 同一表达式={"n":0,"src":null}（对照组不得已反序） | RA2 | RA2 | — | **捕获** |
| 11 | `m09-punctuation-swap` | 无（直接复制九文件） | article-classroom-screen-upgrade.html 首个段落末尾的 `。`（U+3002）替换为 `.`（U+002E） | 合同第 9 例：逐段码点比较必须抓到单字符差异 | 渲染层（确有某段末尾字符码点变成 U+002E；不假设它落在第一段） 实测={"idx":0,"last":"U+002E","paras":29} → 成立；control 同一表达式={"idx":-1,"last":null,"paras":29}（对照组不得已反序） | RJ1 | RJ1 | — | **捕获** |
| 12 | `m10-h1-add-booktitle-mark` | 无（直接复制九文件） | article-along-the-north-small-river.html 的 <h1> 外加书名号《》，<title> 保持原样 | 合同第 10 例：K5 要求 <h1> 与标签页标题主体逐字符一致 | 渲染层（h1 以《开头而 <title> 未变） 实测={"h1":"《封路之后，沿北小河往南》","title":"封路之后，沿北小河往南｜自然选择号"} → 成立；control 同一表达式={"h1":"封路之后，沿北小河往南","title":"封路之后，沿北小河往南｜自然选择号"}（对照组不得已反序） | RK5 | RK5 | — | **捕获** |

## 台架与驱动退出码

| # | 跑哪几段 | control 目录 | mutant 目录 | control 行数 | mutant 行数 |
| --- | --- | --- | --- | --- | --- |
| 1 | `desktop,mobile` | `mutants/m01-column-reverse-control` | `mutants/m01-column-reverse` | 542 | 542 |
| 2 | `list` | `mutants/m02-aria-current-self-control` | `mutants/m02-aria-current-self` | 113 | 113 |
| 3 | `list` | `mutants/m03-latest-href-other-column-control` | `mutants/m03-latest-href-other-column` | 113 | 113 |
| 4 | `visited-pixel` | `mutants/m04-drop-home-latest-visited-control` | `mutants/m04-drop-home-latest-visited` | 91 | 91 |
| 5 | `visited-pixel` | `mutants/m04b-drop-site-navigation-visited-control` | `mutants/m04b-drop-site-navigation-visited` | 91 | 91 |
| 6 | `visited-pixel` | `mutants/m04c-paint-current-link-paper-control` | `mutants/m04c-paint-current-link-paper` | 91 | 91 |
| 7 | `tap` | `mutants/m05-shrink-tap-target-control` | `mutants/m05-shrink-tap-target` | 164 | 164 |
| 8 | `cross` | `mutants/m06-drop-matchmedia-reset-control` | `mutants/m06-drop-matchmedia-reset` | 107 | 107 |
| 9 | `content` | `mutants/m07-inject-console-log-control` | `mutants/m07-inject-console-log` | 231 | 231 |
| 10 | `load` | `mutants/m08-inject-external-image-control` | `mutants/m08-inject-external-image` | 219 | 219 |
| 11 | `content` | `mutants/m09-punctuation-swap-control` | `mutants/m09-punctuation-swap` | 231 | 231 |
| 12 | `list` | `mutants/m10-h1-add-booktitle-mark-control` | `mutants/m10-h1-add-booktitle-mark` | 113 | 113 |

## 台架守卫

- SELF-SHA（全程未变 → 本批结论有效）：变异跑期间编辑被测脚本或驱动，会得到"0 条 FAIL"的假漏检。
- 真实 `Results/`：批次前后逐项哈希相等 ✓（含 control/mutant 两批共 20 个副本目录全部在 `qa/_qa_task19/mutants/` 下）
- 副本目录带完整 `styles.css`／`script.js`：v1 教训是相对路径解析不到样式会被误读成"样式没生效"。
- Chrome profile 目录带时间戳且删除容错：复用同名目录会被上一台占用撞出 EPERM 把整批带崩（本包真实事故形态）。
- 副本跑完**保留**在 `qa/_qa_task19/mutants/` 以供第三方复核，不只在内存或临时目录里跑掉。

## 无效变异处置

- `m04-drop-home-latest-visited`：字节层（组件 :visited 覆盖已删，全局 a:visited 仍在） → 成立；RN7 两台采到的像素逐条相同（共 3 条）→ 违约没有落到屏幕，属无效变异；该 DOM 形状由静态链（Task 18 H13）守 → 修台架后重跑，不计捕获率。
- `m04b-drop-site-navigation-visited`：字节层（主导航 :visited 覆盖已删） → 成立；RN4 两台采到的像素逐条相同（共 27 条）→ 违约没有落到屏幕，属无效变异；该 DOM 形状由静态链（Task 18 H13）守 → 修台架后重跑，不计捕获率。

## 与 Task 18 的两条独立链

- 变异 4（删 `.home-latest__link:visited`）：运行面由本包 R-N 链 B（像素簇）抓，静态面由 Task 18 的 **H13**（`:visited` 配对）抓。本包不重复实现 H13，只引用其结论——两条链各自都能独立翻红，才叫两条链。
- 变异 5（触控下限）按 v1 真实教训做成"改声明 + 同时压掉 padding/gap/字号"的双动作注入，并以 375px 实测渲染盒 <44 为前置自证：只改 `min-block-size` 而 padding 仍撑住时，渲染层其实没有违约，那种是无效变异而不是漏检。
- 变异 1（`column-reverse`）打在多条目副本上并指定 K2 的"视觉次序 == DOM 次序"这条腿：今天的真实内容每栏目只有 1 条，源码顺序无从反序，单条页面对这条 CSS 没有分辨力——这是内容状态，不是判据缺陷，因此台架提供 ≥2 条的副本，并把"manifest 次序"那条腿（对照组同样红）用差分排除。
