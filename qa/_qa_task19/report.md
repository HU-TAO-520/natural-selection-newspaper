# Task 19 浏览器回归与整站验收 — 结论报告

> R13 状态：下方完整站点回归和线上记录来自 2026-10-03。当前发布包新增线上专用 404 页；本轮本地 HTTP／真实浏览器回归另有 25 条 PASS。新包尚未由用户上传，因此下方历史线上结论不代表 R13 发布包已通过线上验收。

- 执行时间：2026-10-03 13:55（本机时钟，UTC）
- 历史完整回归对象：`Results/`（12 个交付文件 / 10 张普通 HTML 页，清单驱动）与线上 `old-ns-news.pages.dev`；当前 R13 包为 13 个交付文件 / 11 张 HTML（10 张普通页 + 1 张线上专用 404）
- 环境：Chrome/154.0.8037.93 · CDP（`Emulation.setDeviceMetricsOverride` / `Input.dispatch*` / `setScriptExecutionDisabled` / `styleSheets[].disabled` / `Page.captureScreenshot`）· 零第三方测试框架
- 命令：`QODER_PASS=all node _qa_task19/cdp_regression19.mjs`；变异：`node _qa_task19/mutate_task19.mjs`；线上：`node _qa_task19/online_check.mjs`
- **总判定：浏览器回归全绿（计分 3589 条，FAIL 0，PENDING 0）；回归器有效性 100% 捕获（10/10 有效变异））**
- 断言下限：合同要求 ≥ 1400，实际计分 **3589** 条（另 REC 66 条为落点说明，不计通过也不计失败）
- 四态口径：PASS／FAIL／SKIPPED-BY-DESIGN／REC；**PENDING 恒为 0**（等待外部动作只有 SKIPPED-BY-DESIGN 这一个名字）

---

## 1. 分组计数（机器输出 `results.json` → `groups`）

| 组 | 内容 | v1 条数 | 本包计分 | PASS | FAIL | SKIPPED-BY-DESIGN | 遍历对象 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-A | 加载与资源（file:// 直开、外部请求 0、链接带 .html、主导航路径 = 页数 × 4 由清单推导） | 51 | 411 | 411 | 0 | 0 | manifest.pages 的 HTML 子集（10） |
| R-B | 桌面视觉（769／1024／1280 几何、版心、双细线、配色、R4 白名单与标签计数） | 275 | 1020 | 1020 | 0 | 0 | manifest.pages 的 HTML 子集（10） |
| R-C | 移动视觉（375／768 堆叠、overflow-wrap、nowrap、同域 iframe 双量具） | 138 | 394 | 394 | 0 | 0 | manifest.pages 的 HTML 子集（10） |
| R-D | 点击区与焦点（实测渲染盒 ≥44×44、轮廓不被裁、关闭态真正退出 Tab） | 40 | 137 | 137 | 0 | 0 | manifest.pages 的 HTML 子集（10） |
| R-E | 菜单三态（Task0 三态表逐行核对 × 全部 HTML 页） | 104 | 363 | 363 | 0 | 0 | manifest.pages 的 HTML 子集（10） |
| R-F | 交互行为（Enter/Space/点击各恰好一次、Esc 与焦点归还、合成键相位） | 60 | 220 | 220 | 0 | 0 | manifest.pages 的 HTML 子集（10） |
| R-G | 跨断点重置（768→769→768 往复，CDP 覆盖派发 change） | 36 | 90 | 90 | 0 | 0 | manifest.pages 的 HTML 子集（10） |
| R-H | 200% 缩放（布局 1280÷2 + 绘制 dpr=2 两效分离） | 44 | 120 | 120 | 0 | 0 | manifest.pages 的 HTML 子集（10） |
| R-I | 降级回归（禁 JS／禁 CSS 各留证据、恢复回基线） | 37 | 104 | 104 | 0 | 0 | manifest.pages 的 HTML 子集（10） |
| R-J | 内容运行时一致性（逐段码点等于 Task13 基线） | 32 | 222 | 222 | 0 | 0 | manifest.pages 的 HTML 子集（10） |
| R-K | 导航链与**渲染出来的**条目次序（新增） | —（新增） | 131 | 131 | 0 | 0 | manifest.pages 的 HTML 子集（10） |
| R-L | 列表容量压力（30 条副本，新增） | —（新增） | 164 | 164 | 0 | 0 | qa/_qa_task19/mutants/pressure 副本 |
| R-N | visited 配色（计算样式＋轮询时序链 A、像素簇链 B，新增独立成组） | 81（v1 的 visited + visited-pixel 两段合计，本包两段都在 R-N 有下家） | 90 | 90 | 0 | 0 | manifest.pages 的 HTML 子集（10） |
| R-O | 发布与线上一致（新增） | —（新增） | 100 | 100 | 0 | 0 | 线上真实标签页 |
| 只读证明 | 19.1 前置核对与 19.10 只读证明、快照绑定、断言下限自检 | — | 23 | 23 | 0 | 0 | manifest.pages 的 HTML 子集（10） |
| **合计** | | **819** | **3589** | **3589** | **0** | **0** | |

v1 的 R-A…R-J 十组 **817 条**语义在本包全部有下家且逐组增长（页集合 4→7）。没有任何一条以"结构变了"为由删除或放宽：

- 判据形态只有三处按合同换成了更强的形态：条目次序换成 bounding box 视觉次序（K2）、已访问配色换成像素簇采样（R-N 链 B）、窄视口溢出换成同域 iframe 量具（R-C 双链）。
- 触控下限、焦点轮廓、44×44、768/769 互补、零网络请求、逐段码点：判据对象与 v1 一致，未改口径。

## 2. 判据落点（凡几何／配色／导航，写明测的是什么对象）

| 判据 | 测量对象 | 落点 |
| --- | --- | --- |
| 条目次序 K2／RL5 | `Element.getBoundingClientRect()` 的 y（同 x 带内）排序后的标题序列 | 视觉次序 == DOM 次序 == `manifest.columns[*].articles` 次序，三者两两相等 |
| 已访问配色 R-N 链 B | `Page.captureScreenshot` 的 PNG 像素簇（与纸色距离最大的前 2% 求均色，按到 ink／accent／浏览器默认紫的距离定类） | 报头／主导航／`entry-list__link`／`home-latest__link` 四处链接；**不用** `getComputedStyle().color` |
| 已访问时序 R-N 链 A | 轮询采样（每 0.5s 一次，覆盖加载后 0–4s 异步翻色窗口）+ `getComputedStyle` | 链 A 只能证明计算样式，配色定论以链 B 为准；两条链互为独立证据 |
| 静态 :visited 配对 | 由 Task 18 的 **H13** 负责（本包不重复实现） | 静态写了不代表生效（链 B 抓），生效了不代表每处都写了（H13 抓） |
| 横向溢出 R-C／RL2 | `documentElement.scrollWidth <= clientWidth`，窄视口一律在同域 iframe 内量 | 顶层窗口约 500px 下限会把左裁剪伪装成溢出，故 375／768 档不用顶层宽度判 |
| 折行数 RB13／RC2 | `Range.getClientRects().length` | 行盒数量，不读 CSS |
| 触控下限 RD1／RL4 | `getBoundingClientRect()` 实测渲染盒 | 不读 `min-block-size` 声明；padding 撑住即算通过（v1 教训反向同样成立） |
| 关闭态退出 Tab RD／RE2 | `offsetParent === null` 且 `getClientRects().length === 0` | `display:none` 子树里 `getComputedStyle` 仍返回自身值，不能用它判可聚焦 |
| 导航是否真的发生 RA7／RK1／RE1 | `Page.frameNavigated` 计数增量 | 点当前页链接时路径不变，故不用 URL 差异判 |
| 跨断点 R-G | matchMedia('(min-width: 769px)') 的 change 监听确实触发 | `--dump-dom` 无头模式不派发 change，用它判会得到"永不触发"的假失败 |
| 200% 缩放 R-H | `innerWidth`（布局）+ `deviceScaleFactor`（绘制）+ `rect.width × dpr` 佐证 | CDP 的 `zoom` 参数在本机 Chrome 为 no-op，已由 `zoom_probe19.mjs` 单独取证 |
| 禁 JS R-I／R-J | `Emulation.setScriptExecutionDisabled`（CDP 级，非 iframe sandbox 也非 noscript 表象） | 与 `Task0 §离线`"正向验收"逐字对应 |
| 禁 CSS R-I | 父页对同域文档置 `styleSheets[].disabled = true`，并验 `body` 背景回退为 `rgba(0, 0, 0, 0)` | 恢复后重新加载并复核哈希未变 |
| 内容保真 R-J | 浏览器 `textContent` 逐段 → 码点序列与 `qa/_qa_task13/extracted_baseline.json` 比较 | 比较前不 trim、不折叠空白、不做任何标准化 |

## 3. 四个新组逐条结论

### R-K 导航链与渲染次序

- **K1 真实导航链**：首页最新区→详情页 3 条、栏目页→详情页 12 条、详情页→所属栏目页 6 条，每跳都以 `frameNavigated` 计数增量为证。
- **K2 视觉次序**：三张栏目页各自的条目按 bounding box 排序后的标题序列逐等于 `manifest.columns[*].articles`，且同 DOM 次序；30 条压力副本上同样成立（列表页每栏当前各 2 条，单条栏目反不出顺序，所以有效性证明打在副本上）。
- **K3 首页最新区**：恒 3 条，每条一个 `a.home-latest__link` 包两个 `span`（标题＋月日，R8 结构），三条分别等于三张列表页各自的第一条（标题与 href 双一致），且排列逐等于 `manifest.columns` 的栏目序。**判据与排序键无关**：本包不写死"消息→通讯→评论"，全序第一键 `date` 尚未由用户提供，写死等于把未定键当合同。
- **K4 当前项归属**：详情页的 `aria-current` 只出现在所属栏目链接上；其配色同时由链 A（计算样式）与链 B（像素簇，`RK4-PIX`）证明与未访问态一致。
- **K5 标题关系**：每页 `<title>` == `<h1>` + 全角「｜自然选择号」，后缀不进入 `<h1>`。

### R-L 列表容量压力（30 条假文章，全部在副本目录）

- 生成方式：`qa/_qa_task19/mutants/pressure/` 内复制九文件后，把 news-message.html 的 `.entry-list` 换成 30 条（标题含中英混排与长串），href 全部指向副本里真实存在的详情页，避免把"链接打不开"混进几何判据。真实 `Results/` 在压力段前后各取一次哈希，逐项相等（见 §5）。
- 定性：**几何类判据入闸门**（溢出／触控／遮挡／重叠 FAIL 即本包不通过）；**观感类记录为 informative** 并附截图，截图单独留在 `qa/_qa_task19/mutants/pressure-shots/`（v1 教训：变异副本相对 `styles.css` 解析不到会被误读为"样式没生效"）。
- 跑完按合同清空 `shots/` 并重跑真实交付页截图（`RL9` 两条）。

### R-N visited 配色（两段 pass 都在本组有下家）

- 链 A（母本 `visitedPass()` + `visitedTimingPass()`）：24 条 —— 已访问全部目标页后普通链接的计算样式仍为墨色，且 0–4s 窗口逐 0.5s 轮询采样。丢掉这半组会让计算样式与时序判据静默消失，正是本包最不该重演的缺陷形态。
- 链 B（母本 `visitedPixelPass()`）：69 条 —— 四处链接的像素簇分类，判定方法只用截图采样。
- 取样区用 Range 的**文字行盒并集**而非 border box：`flex: 1 1 auto` 的标题盒比字形宽得多，按 border box 截会混进大片纸色。

### R-O 发布与线上一致

- 状态：计分 100 条，PASS 100，FAIL 0；全程真实标签页／无头，未用 iframe（`frame-ancestors 'none'` 下借 iframe 量视口会被拒，那不是站点坏了）。
- O1 站点可访问 + 清单页全部 200；O2 去后缀 308 直达不破坏相对引用（跳后 styles.css／script.js 仍生效，纸色底与 `js` 类为证）；O3 详情页两种形态都打开且与本地同版本（线上 CSS／JS 的 SHA-256 == manifest 登记值，等于 Auto-Minify／Rocket Loader 确实关闭）；O4 安全头实测：`_headers` 不可下载、`X-Frame-Options: DENY`、HSTS、`nosniff`、CSP `frame-ancestors 'none'`；O5 线上首页第三条已是 R7 修订文本（含"鸽子衔枝之年"、无四位数字、不含"2024年"）；O6 0 个 404／0 控制台错误／无混合内容／站内链接不带查询串；O7 三个数字分开核对。
- **三个数字不得混用**：交付文件 `6 + N` = **12**（`Results/` 内文件）、zip 条目 `7 + N` = **13**（含只进包的 `_headers`）、HTML 页面 `4 + N` = **10**（Pages 后台 "Pages" 口径）。N = 6。Pages 后台计数由用户按 `deploy/UPLOAD.md` 核对，本包不调 Cloudflare API、不代上传。

## 4. 回归器自身有效性（变异对照）

```
登记 12 例　实跑 12 例　有效变异 10　无效变异 2　捕获 10　未捕获 0　捕获率 100%
第 1 例 column-reverse：捕获（必须红——它红不了就说明 K2 退化成读源码顺序，本包与 Task 18 的分工塌陷）
真实 Results/ 变异批次前后哈希相等：true　　台架 SELF-SHA 全程未变：true
```

| # | 变异名 | 注入内容 | 前置自证（违约确实落到屏幕／字节） | 指定应翻红 | 差分命中 | 对照组已红 | 结论 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `m01-column-reverse` | 副本 styles.css 追加 `.entry-list{display:flex;flex-direction:column-reverse}`（DOM 源码顺序保持不动） | 渲染层（bounding box 与 DOM 序列确实反序） 实测={"n":4,"dom0":"新闻消息样本条目1（含 Windows 10 与 4K 混排长标题 volunteer-club-note）","vis0":"新闻消息样本条目4（含 Windows 10 与 4K 混排长标题 volunteer-club-note）","reversed":true} → 成立；control 同一表达式={"n":4,"dom0":"新闻消息样本条目1（含 Windows 10 与 4K 混排长标题 volunteer-club-note）","vis0":"新闻消息样本条目1（含 Windows 10 与 4K 混排长标题 volunte（对照组不得已反序） | RK2b | RK2b | — | **捕获** |
| 2 | `m02-aria-current-self` | article-school-course-volunteer.html 的 aria-current 从所属栏目 news-message.html 挪到「首页」链接上 | 字节层 + 渲染层（当前项落在首页链接） 实测={"cur":["index.html"]} → 成立；control 同一表达式={"cur":["news-message.html"]}（对照组不得已反序） | RK4 | RK4 | — | **捕获** |
| 3 | `m03-latest-href-other-column` | 首页最新区第 2 条 href 改为全局序末位页 article-classroom-screen-upgrade.html（不在最新三条内），标题仍是该条原标题（R11①：判据取自全局序，不再假设每栏目一条） | 渲染层（第二条 href 已指向最新区外页面，标题仍是第 2 条原标题 → href/标题双一致被单边破坏） 实测={"href":"article-classroom-screen-upgrade.html","title":"坝河以北，走过的东坝"} → 成立；control 同一表达式={"href":"article-north-of-dam-river.html","title":"坝河以北，走过的东坝"}（对照组不得已反序） | RK3 | RK3 | — | **捕获** |
| 4 | `m04-drop-home-latest-visited` | 删除 `.home-latest__link:visited{color:var(--color-ink)}` 整条规则（全局 `a:visited{color:accent}` 随即接管） | 字节层（组件 :visited 覆盖已删，全局 a:visited 仍在） → 成立；RN7 两台采到的像素逐条相同（共 3 条）→ 违约没有落到屏幕，属无效变异；该 DOM 形状由静态链（Task 18 H13）守 | RN7 | — | — | **无效变异（前置自证不成立 → 修台架，不改判据也不改产品代码）** |
| 5 | `m04b-drop-site-navigation-visited` | 删除 `.site-navigation__link:visited{color:var(--color-ink)}` 整条规则（主导航链接的文字是 `<a>` 的直接子节点） | 字节层（主导航 :visited 覆盖已删） → 成立；RN4 两台采到的像素逐条相同（共 27 条）→ 违约没有落到屏幕，属无效变异；该 DOM 形状由静态链（Task 18 H13）守 | RN4 | — | — | **无效变异（前置自证不成立 → 修台架，不改判据也不改产品代码）** |
| 6 | `m04c-paint-current-link-paper` | 副本 styles.css 追加 `.site-navigation__link[aria-current="page"]{color:var(--color-paper)!important; border-bottom-color:var(--color-paper)!important;}`（当前项高亮在屏幕上整体消失：文字与 2px 实线都涂成纸色） | 渲染层（当前页链接的计算色与下边线颜色都变成纸色） 实测={"color":"rgb(245, 239, 228)","bb":"rgb(245, 239, 228)"} → 成立；control 同一表达式={"color":"rgb(122, 36, 36)","bb":"rgb(122, 36, 36)"}（对照组不得已反序）；RN5 渲染层差分成立：control rgb(122,36,36) 距ink=89 距accent=0 ≠ mutant rgb(245,239,228) 距ink=null 距accent=null | RN5, RK4-PIX | RN5 | — | **捕获** |
| 7 | `m05-shrink-tap-target` | 移动档 `.entry-list__link` min-block-size 44px→28px，并 padding-block:0、gap:0、标题与日期字号压到 9px/line-height 1 | 渲染层（375px 下实测高度 <44 而宽度仍 ≥44） 实测={"h":28,"w":343} → 成立；control 同一表达式={"h":72,"w":343}（对照组不得已反序） | RD1 | RD1 | — | **捕获** |
| 8 | `m06-drop-matchmedia-reset` | 删除 `media.addEventListener("change", handleBreakpoint)` 的注册分支（其余行为不动） | 字节层（matchMedia 仍在但 change 监听已摘除） → 成立 | RG1 | RG1 | — | **捕获** |
| 9 | `m07-inject-console-log` | script.js 末尾注入 `console.log("task19-mutant-noise")` 并置 window.__mutantRan | 渲染层（注入语句确实被执行过，排除"读到半写入脚本"的假漏检） 实测={"ran":true,"cls":"js"} → 成立；control 同一表达式={"ran":false,"cls":"js"}（对照组不得已反序） | RJ4 | RJ4 | — | **捕获** |
| 10 | `m08-inject-external-image` | 首页 </main> 前注入 `<img src="https://task19-mutant.invalid/x.png" alt="">` | 渲染层（DOM 里真有指向 http(s) 的图片） 实测={"n":1,"src":"https://task19-mutant.invalid/x.png"} → 成立；control 同一表达式={"n":0,"src":null}（对照组不得已反序） | RA2 | RA2 | — | **捕获** |
| 11 | `m09-punctuation-swap` | article-classroom-screen-upgrade.html 首个段落末尾的 `。`（U+3002）替换为 `.`（U+002E） | 渲染层（确有某段末尾字符码点变成 U+002E；不假设它落在第一段） 实测={"idx":0,"last":"U+002E","paras":29} → 成立；control 同一表达式={"idx":-1,"last":null,"paras":29}（对照组不得已反序） | RJ1 | RJ1 | — | **捕获** |
| 12 | `m10-h1-add-booktitle-mark` | article-along-the-north-small-river.html 的 <h1> 外加书名号《》，<title> 保持原样 | 渲染层（h1 以《开头而 <title> 未变） 实测={"h1":"《封路之后，沿北小河往南》","title":"封路之后，沿北小河往南｜自然选择号"} → 成立；control 同一表达式={"h1":"封路之后，沿北小河往南","title":"封路之后，沿北小河往南｜自然选择号"}（对照组不得已反序） | RK5 | RK5 | — | **捕获** |

无效变异单列（不计入捕获率、不给闸门打分；处置是修台架，不改判据也不改产品代码）：

- `m04-drop-home-latest-visited` — 字节层（组件 :visited 覆盖已删，全局 a:visited 仍在） → 成立；RN7 两台采到的像素逐条相同（共 3 条）→ 违约没有落到屏幕，属无效变异；该 DOM 形状由静态链（Task 18 H13）守。该违约面在本环境不改变屏幕，由 **Task 18 的 H13 静态配对链**守"每处都写了 `:visited`"；运行面"写了要生效"则由本批 `m04c`（把当前项高亮的文字与 2px 实线一起涂成纸色 → `RN5` 立刻翻红）证明像素链本身有牙。
- `m04b-drop-site-navigation-visited` — 字节层（主导航 :visited 覆盖已删） → 成立；RN4 两台采到的像素逐条相同（共 27 条）→ 违约没有落到屏幕，属无效变异；该 DOM 形状由静态链（Task 18 H13）守。该违约面在本环境不改变屏幕，由 **Task 18 的 H13 静态配对链**守"每处都写了 `:visited`"；运行面"写了要生效"则由本批 `m04c`（把当前项高亮的文字与 2px 实线一起涂成纸色 → `RN5` 立刻翻红）证明像素链本身有牙。

逐例的"跑哪几段／control 与 mutant 两台的行数与退出码"见 `mutation_log19.md`。

## 5. 只读证明与快照绑定（开工／完工各一次）

- 五处目录（`Results/` `content/` `build/` `deploy/` `Materials/`）逐项哈希在 19.1 与 19.10 相等：**全部相等 ✓**（`RZ10/*` 五条）
- `Results/` 无新增文件、无探针／截图／JSON 产物：PASS；实际文件集 12 个与清单双向相等。
- Task 18 的 `__meta` 逐页哈希 == 当前 `Results/` 逐页哈希（快照未过期，浏览器事实钉在来源文件哈希上）：PASS
- 前置闸门：Task 18 1515 条全绿、PENDING 0、变异捕获率 100%、`expected_reversals.md` 已读入 —— 四条 全部 PASS ✓。
- 本包未修改任何被验对象、未修改 `_headers`、未改站点设置、未代用户上传；未把执行记录写回 `plan/`（该目录由 Task 12 管辖）。

## 6. 两段一致性（`all` 与逐段并集）

- all 键集 **3464** 条／逐段并集 **3464** 条；只在 all 出现 0 条、只在分段出现 0 条、状态不一致 0 条 → **差集为空，分段不遗漏也不重复计 ✓**
- 逐段条数：`content` 245　`cross` 114　`degrade` 128　`desktop` 1017　`interact` 234　`list` 120　`load` 130　`mobile` 486　`nav` 165　`online` 126　`pressure` 200　`tap` 179　`tri` 387　`visited-pixel` 96　`visited` 62　`visual` 34　`zoom` 144

## 7. 缺陷归属与翻转登记

本轮 **FAIL 0**，无需归属。

### 结构性失效登记（判据本身被结构变更取代，禁止删除或放宽）

| v1 判据 | 在归档结构下的状态 | 接管者 |
| --- | --- | --- |
| `RB5` 报头／导航链接的冷历史 `getComputedStyle` 配色 | 仍然保留（链 A），但**不再单独充当已访问态结论** | 链 A 保留于 R-N，结论权交给链 B 像素簇（R-N）＋ Task 18 的 H13 静态配对 |
| `RA4` 的 16 条主导航路径 | 页集合由清单推导：本轮 10 页 × 4 链接 = 40 条；四页时代 16 条与七页时代 28 条继续全部成立（是子集，不是替换） | R-A `RA7`／`RA8` 逐条遍历 |
| `RC4` 的"段落数按四页写死" | 期望值改由 `deploy/manifest.json` + `qa/_qa_task13/extracted_baseline.json` 派生（29／23／4／4／5／2） | R-J `RJ2`，值随清单变化自动跟随 |
| 首页"最新区不粘连"等 v1 无对应面的判据 | 新增，不是替代 | R-B `RB14` |
| v1 四页时代的 `<title>` 表（文章标题＝栏目页标题） | 归档层矩阵把文章标题移到详情页，列表页取栏目名 | Task 12 扩展矩阵 + R-K `RK5` |

与 Task 18 的分工边界（避免两边互相掩盖）：文件集合、清单一致性、字节级保真、静态结构、禁止项、静态链接图与 `:visited` 静态配对**全部归 Task 18**，本包不重复实现；本包只做渲染结果、几何、真实点击、焦点键盘、菜单三态、降级、像素配色、跨断点事件与线上行为。

## 8. 遗留项（如实登记，不当已解决）

1. **三篇旧文的 `date` 尚未由用户提供**：全序第一键退位到 `order`→`column` 注册表序→`slug`，因此首页最新区当前按"消息→通讯→评论"排。**这是内容状态，不是缺陷**；用户补 `date` 后次序可能改变，届时必须按 R11⑤ 重新登记 R4 白名单第 9–14 项，本包的 K3 判据（R11①／R12② 后为"等于独立解析 md 所得全局序前 3 条"）不需要改。
2. **`display_date` 缺席时列表不显示日期**：R5④／R9② 规定缺 `display_date` 就不生成日期节点（不是空 `<span>`、不是"日期未知"）。三篇旧文都声明了 `display_date`，所以"无日期条目"的渲染面**本轮没有被真实数据覆盖**，只有 R-L 的 30 条副本间接覆盖其几何。
3. **栏目内条目数不均是内容状态**：message 2 条／feature 3 条／commentary 1 条（R12 后）。多稿那一栏的列表页顺序面已能用真实数据分辨；单条栏目仍反不出顺序，该面由 30 条副本（R-L）＋ 变异 1（`m01-column-reverse`）补足。
4. **列表页版心在 769px 档窄于 `--reading-max`**：合同原文只写"列表页版心等于 `--reading-max`"，字面在 769 档不成立（可用宽度 705px < 736px）。本包按 `min(--reading-max, 视口−2×gutter)` 判，并在 1024／1280 档逐像素要求等于 736。→ 建议 Task 12 给该句加限定语。
5. **`Task19 §结构或数据基线` 记 `index.html = 2629 字节 971e57a5…`** 是 v1 六文件首页值，当前为 3631 字节 `14b82801…`。本包全部期望值从 manifest 解析，故不受影响；该表的标注建议沿用 Task 18 §8.3 的回流。
6. **Task19 文内 K3 的排序键与基线表不一致**：§基线表写四键（含 `column` 注册表序），§R-K 组内仍写三键（缺 `column`）。本包按权威顺序取 Task12 R11（四键）断言的是"渲染次序 == 独立解析 md 所得全局序"（R11①／R12② 后不再取"各栏目首条"），与键数写法无关。→ 回流 **Task 12**（合同文本自相矛盾处）。
7. **R-O 的 O1 "Pages 后台页面数"由用户人工核对**：本包禁调 Cloudflare API，改以"清单内 10 页线上 200 **且每页 HTML 里的 `<title>` 就是该页**（内容身份）"作为可达性证据。之所以必须加内容身份：实测不存在的 `/article-task19-does-not-exist.html` 在线上返回 **200 + 首页 HTML**（Pages 侧 404/SPA 回退），"200"单独不构成证据。该回退属站点设置事实、不影响清单内每一页，报告把它作为 informative 登记（`RO6` 的 REC 行），值得你在后台瞄一眼 Single-page-application 开关。
8. **已访问态在本环境不可判别**（本包最重要的诚实项）：删掉组件 `:visited` 覆盖后，control 与 mutant 两次独立截图采样**逐条像素相同**（`m04`＝最新区链接、`m04b`＝主导航链接，前者文字在子 `span` 里、后者文字直接是 `<a>` 的子节点，两种 DOM 形状都不变）⇒ 本机 `headless=new` + `file://` + 全新 profile 下 `:visited` 不改变绘制。因此 R-N 链 B 对"读者真实浏览器里的已访问色"没有覆盖面：该面现由 **链 A（计算样式＋0–4s 轮询）+ Task 18 的 H13 静态配对**守，像素链的分辨力由 `m04c`（把当前项高亮的文字与 2px 实线一起涂成纸色 → `RN5` 立刻翻红）证明不是空判据。要真正覆盖已访问绘制，只能换有头浏览器或真实历史环境复验，本包不为此挡发布。
9. **v1 判据的接管登记**：本包未删除也未放宽任何一条 v1 判据；`:visited` 的两段 pass（`visited` 与 `visited-pixel`）都整体迁进 R-N 且各自条数与母本对得上（链 A 34 条、链 B 75 条，v1 合计 81 条的语义面全部有下家）。
10. **本轮（R12 后，N=6）的口径变更与两条待闭合项**：详情页由 3 张增至 6 张，`RK1`／`RK3`／`RJ2`／`RJ9` 的期望值全部改成按文章索引的全局序；新稿的期望值形状与 Task13 基线逐字段对齐（`paragraphs[{text,codepoints}]`、`date{present,text}`），此前形状不一致会让 R-I／R-J 的相应腿**静默不成立**。上传后补跑的两腿均已闭合：① **R-O 线上复验** PASS 100 条（清单内 10 页 200 且每页 `<title>` 内容身份命中、`styles.css`／`script.js` 线上 SHA == 清单 SHA、四条安全头实测生效、三个数字 12／13／10 与 `deploy/UPLOAD.md` 一致）；② **`QODER_PASS=all` 与逐段并集的两段一致性** —— 本轮 all 3464 键 = 逐段并集 3464 键，只在 all 0 条、只在分段 0 条、状态漂移 0 条 ⇒ 差集为空。上一轮（N=3）的 `consistency19_2026-10-02_N3.json` 已改名留档，不参与本轮结论。

## 9. 签署结论

| 归档层签署三条件 | 状态 |
| --- | --- |
| Task 18 全绿（闸门） | **PASS**（1515 条，PENDING 0，变异 100%） |
| Task 19 全绿（本包） | **PASS**（计分 3589 ≥ 下限 1400，PENDING 0，无 SKIPPED） |
| 线上复验通过 | **PASS** |

- 签署判定：**归档层签署完成**。

### 产物与 SELF-SHA（第三方凭这些可复跑同一结论）

- `qa/_qa_task19/cdp_regression19.mjs` — `281c3770b411f52732e286f7ee01a7df7ab5fbb44c03ea3e459f47d9e49574ef`
- `qa/_qa_task19/consistency19.mjs` — `68a18db3943a345e4884efd3167b5ba177ad160b334e98d16309569e9599448f`
- `qa/_qa_task19/contract19.mjs` — `27be9b2a4a8eadce11e72588cedd8bb62ffe6d25f7c6760b359d64d619e417db`
- `qa/_qa_task19/make_mutation_log19.mjs` — `e66677f0c6a8e0ed1c91c26c3ba828057f2c4b79038d7a0933057277760e3cff`
- `qa/_qa_task19/make_report19.mjs` — `5f7eb2ce936be5261589be54444f6ea533c6a802705a6ac7169f76c1af25005c`
- `qa/_qa_task19/measure19.html` — `c8e99f2cde3ade35aa80d5826e5170f133a028eb5c4b110656d2a67b023792b1`
- `qa/_qa_task19/mutate_task19.mjs` — `86ba823ed784d801a8367649fb6d8e51cd3b100bb30eaae0510db15ef8191c31`
- `qa/_qa_task19/online_check.mjs` — `21eeed616b38b6efefdb3959967fbbf790531b2e2c0d157359d2842a84138ba6`
- `qa/_qa_task19/pass_util19.mjs` — `38b2e40820facad0d176bd66033f83ba3fd030c6e5cd9fcf6c6ac789b8f74eb7`
- `qa/_qa_task19/passes_inter19.mjs` — `6f8fd92416cffde6093fbec192c71bdf6033997be87e6f1f3235727218fec057`
- `qa/_qa_task19/passes_load19.mjs` — `6d69f0a4b51538f1640e6174033f68c62a9d9d86be008872d46c707bfd1a111c`
- `qa/_qa_task19/passes_new19.mjs` — `214e28cc2258d66d1cefcf834a58ed3f1fbdb4ecdac6592417417940d6423e02`
- `qa/_qa_task19/png19.mjs` — `5fcc3e2de668eff8dfb9f1c9c350cf07e94f00bc0a33ee2619e14c84a81bf44a`
- `qa/_qa_task19/pressure_page19.mjs` — `fff7b219055a342619dce22c3c3310577863ec249fd13c0a9452ff43674d6231`
- `qa/_qa_task19/probe_page19.mjs` — `80253701c3387bf74936697e60daf3b8ee8b1252026636e94fe72e4a5336b2b8`
- `qa/_qa_task19/shot19.html` — `6b192ba8cb8fed81c7b30aa73b211004141f1a60a34f47c6d810223b29c1b4b3`
- `qa/_qa_task19/zoom_probe19.mjs` — `1205cbc211352f5fe4f0e76427ba288fd198322605ae029dfe9cfa4e47641349`
- `qa/_qa_task19/results.json`（逐条含页、视口、判据、期望、实际）· `regression_lines.txt` · `report.md` · `shots/`（50 张真实交付页截图）· `mutants/`（30 条压力副本与十例变异副本，跑完保留以供复核）· `mutation_log19.md` · `consistency19.json` · `zoom_probe19.txt` · `online_results.json`

## 10. 移交

- **日常回归（常态一条命令链）**：放一个 `content/articles/<slug>.md` → `python build/build.py --out Results` → `python build/pack.py` → `node _qa_task18/probe_task18.mjs && node _qa_task18/verify_task18.mjs` → `QODER_PASS=all node _qa_task19/cdp_regression19.mjs`。前两步改产物，后三步各自闸门；任何一步红就停在那一步，不要边改边传。
- **单段重跑**：`QODER_PASS=<段> QODER_TAG=-<段名> node _qa_task19/cdp_regression19.mjs`（段名：load／nav／desktop／mobile／tap／tri／interact／cross／zoom／degrade／content／list／pressure／visited／visited-pixel／online／visual／all）。
- **发布**：上传入口与三个数字见 `deploy/UPLOAD.md`；上传完成后本包的 R-O 才有真实靶子，未复验前报告一律标"线上未复验"。
- **未来加图片／分页／搜索／期次归档**：先回 `plan/Task12` 立新 R 条（同 R1–R7 的做法），说明它与 `Task0` 哪条冲突、修订后是哪份合同的哪一节，再动 `content/`、`build/`、`Results/`。新结构入站时的最小回归集就是本包的 K2（视觉次序）与 R-N（像素配色）两组。

## R13 补充验收（2026-10-04）

上方完整站点 CDP 回归记录对应 2026-10-03 的版本；本节记录线上专用 404 页的新增 HTTP 与浏览器验收。`qa/_qa_task19/not_found_local_report.json` 留存本地 HTTP fixture 的逐条结果：**25 PASS／0 FAIL**。

- 单层、`/foo/bar`、末尾斜杠、更深路径、缺失文章、带查询参数及 `/_headers` 均返回 404 HTML，保持原 URL，正文不回显请求路径。
- 本地真实浏览器在桌面、移动和禁用 JavaScript 三种状态下确认错误正文可见；根路径 CSS/JS 返回成功且 MIME 正确；四项导航、跳至正文、移动菜单与返回首页可用。控制台错误为 0。缺少 404 包条目、CSS 相对地址和 JS 相对地址的负向样本均被捕获。
- 此 fixture 验证的是错误页与资源在 HTTP 下的行为；它不代替 Cloudflare Pages 实际部署验收。用户按 `deploy/UPLOAD.md` 手工 Direct Upload 后，在 PowerShell 设置 `$env:QODER_ONLINE_BASE='https://text.old-ns-news.pages.dev'`，运行 `powershell -ExecutionPolicy Bypass -File qa/_qa_task19/run_not_found_check.ps1 --online`，再以 `QODER_PASS=online` 执行 Task 19 线上段，核对真实状态码与线上路由。当前报告明确保留“线上未复验”状态。

