# Task 9 验收报告 —— 导航脚本与渐进增强

- 验收日期：2026-09-19
- 被测交付物：`Results/script.js`（本任务唯一正式文件变更，UTF-8 无 BOM，2204 字节）
- 合同来源：`plan/Task9-实现导航脚本与渐进增强.md`（接口取自 Task 2，显示规则取自 Task 8）
- QA 目录：`_qa_task9/`（所有探针、变异体、截图、报告均不入 `Results/`）

## 1. 交付与文件所有权

`Results/` 现为六个正式文件，无第七个：

| 文件 | 实施前 SHA-256 | 实施后 SHA-256 | 结论 |
| --- | --- | --- | --- |
| `index.html` | `73f49fd8…06c3d901` | 同 | 未改 |
| `news-message.html` | `66ae5826…0b5fa0e8` | 同 | 未改 |
| `news-feature.html` | `73ff7567…075df9a5` | 同 | 未改 |
| `news-commentary.html` | `a2dbf4aa…51ea8d52` | 同 | 未改 |
| `styles.css` | `14a4a204…a599e093` | 同 | 未改 |
| `script.js` | 不存在 | `9b4…`（新建） | 本任务唯一变更 |

`Materials/` 内 Word 素材最后修改时间均早于 `script.js`，未被触碰。四页 HTML 未新增内联 `<script>` 或内联事件属性（静态门禁 4×2 项）。

## 2. 门禁与结果

| 门禁 | 脚本 | 覆盖 | 结果 |
| --- | --- | --- | --- |
| 静态合同 | `verify_static.py` | 85 项：交付集合、经典脚本零依赖、三处状态写入白名单、五项行为存在性、无单页分支、范围禁区、四页接口、哈希 | **85/85 PASS** |
| 行为矩阵（同域 iframe，真实脚本） | `probe.html` + `run_browser.py` | 四页 × {交互全矩阵, 禁用 JS} + 2 个接口缺失变异体 + 控制台 + 截图回读 | **241/241 PASS**，控制台错误 0 |
| 行为矩阵（真实渲染 CDP） | `cdp_check.mjs` | 四页全矩阵 + 四页禁用 JS（含真实点击导航）+ 2 变异体，trusted 鼠标/键盘事件 | **173/173 PASS** |
| Enter/Space 激活溯源 | `space_probe.mjs` | 事件轨迹：keydown/keyup/click 与状态、滚动 | 每次按键恰 1 次 click、1 次翻转 |
| 变异门控 | `mutate.py` | 20 个违约变异是否被至少一道门禁捕获 | **20/20 被捕获**，对照组全绿 |

## 3. 变异门控（证明验收不是空跑）

`mutate.py` 把 `script.js` 按合同条款各改坏一处，落到 `_qa_task9/mut_dirs/<变异名>/`
（四个 HTML + `styles.css` 原样复制，仅 `script.js` 不同），再对每个变异体跑静态门与
行为门（`QODER_ONLY_PAGE=index.html`）。20/20 全部被捕获，捕获分布：

| 变异 | 违约条款 | 捕获门禁 |
| --- | --- | --- |
| m01 | 未把 `no-js` 替换为 `js` | 静态 + 行为 T1 |
| m02 | `no-js → js` 整段下移到元素查询之后 | 静态（"先于任何元素查询"） |
| m03 | 只改 `.is-open` 不同步 `aria-expanded` | 静态 + 行为 T2 |
| m04 | `aria-expanded` 写成布尔 | 静态 |
| m05 | 整体改写 `className` 字符串 | 静态 |
| m06 | 为按钮重复绑定 Enter/Space `keydown` | 静态（双触发禁令） |
| m07 | 断点错位为 `min-width: 768px` | 静态 |
| m08 | 删除跨断点重置 | 静态 |
| m09 | 进入桌面时条件取反（不关闭） | 静态 + 行为 T7 |
| m10 | 擅自实现"点击菜单外关闭" | 静态（监听器数=4 禁令）+ 行为 T6c |
| m11 | 用中文链接文本判定导航链接 | 静态（写对象白名单 + 中文禁令）+ 行为 T6 |
| m12 | 接口缺失时不 early return | 静态 |
| m13 | Esc 不把焦点返回按钮 | 静态 + 行为/CDP T5 |
| m14 | 点击链接不关闭菜单 | 行为 T6（唯一门禁：需拦截导航后原地读状态） |
| m15 | 用脚本写 `style.display` | 静态 |
| m16 | 残留 `console.log` | 静态 |
| m17 | 对链接事件 `preventDefault` | 静态 |
| m18 | 用 `tabindex` 管可聚焦性 | 静态 |
| m19 | 启动未归一化为关闭态 | 静态 |
| m20 | 向 `window` 暴露全局变量 | 静态 |

首轮 m02 曾是漏网项，原因是变异写法有误（在顶部保留原句的同时又下移复制一份，行为与对照等价），
改为整段下移后由静态门捕获——记为一次变异集自纠，不是产品缺陷。
m14 只能被 iframe 行为门捕获，印证了静态/行为/CDP 三门并存的必要性。


### 3.1 为何三门并存

两套行为门禁并存的原因：`--dump-dom` 无头模式下媒体查询 `change` 事件不派发（对照组监听记录为空），跨断点重置只能在 CDP 真实渲染下判定；而"点击链接后关闭"这一项在真实导航后落地页本就是关闭态，只有 iframe 探针（拦截默认导航、原地读状态）能证明关闭发生在导航之前。两者互补，缺一即有盲区。

## 4. 完成定义逐条对照

| # | 合同条款 | 证据 |
| --- | --- | --- |
| 1 | 唯一正式变更是 `script.js`，HTML/CSS/素材未改 | 第 1 节哈希表；静态 5 项哈希门禁 |
| 2 | 执行后立即 `no-js → js`，且位于首位实质逻辑 | 静态"先于任何元素查询/其它写入"；四页 T1 `htmlClass=js`；截图 `375:js:…` |
| 3 | 点击 `#nav-toggle` 切换 `.is-open` 并原子同步 `aria-expanded` | T2/T3（iframe + CDP ×4 页）：`open=true aria=true navDisp=block` ↔ `open=false aria=false navDisp=none`；静态"唯一 `setOpen` 写入点、各仅 1 处" |
| 4 | Enter／Space 经原生按钮等效触发一次，无双触发 | CDP T4：Enter 每次 `Δclicks=1` 且状态翻转；Space 门禁断言 `Δclicks≤1` 且 `is-open` 与 `aria` 恒同步；正向轨迹证据在 `space_probe.mjs`（Enter 于 keydown、Space 于 keyup 各恰一次 `click`）；静态"不为按钮绑定 keydown" |
| 5 | 打开态 Esc 关闭并返回焦点；关闭态 Esc 无副作用 | CDP T5（在链接上按 Esc → `activeIsToggle=true`）、T5b（焦点与 `scrollY` 不变）；静态"focus 仅 1 处且在 `isOpen()` 分支内" |
| 6 | 打开态点击任一 `.site-navigation__link` 关闭，不按中文文本匹配 | iframe T6（拦截导航后原地断言关闭、含链接子节点 `closest` 命中、当前页链接）；CDP T6（`frameNavigated>0` 且落地无残留）；静态"全文无中文、无文本判定、无位置索引" |
| 7 | ≥769px 清除 `is-open` 并重置 `aria-expanded`；缩回为关闭态 | CDP T7：375→1000→375 全绿；T7b 恰好 768（移动，可打开）→769（重置）；含"本环境确实派发 change 事件"对照项 |
| 8 | 禁用 JS 后保持 `no-js`，四项导航常显可点可聚焦 | CDP `Emulation.setScriptExecutionDisabled` 四页 + iframe `sandbox` 四页：`no-js`、按钮 `display:none`、`navDisp=block`、四链接 `offsetParent≠null`、`aria=false`；CDP 另在禁用 JS 下真实点击链接，`Page.frameNavigated`>0 证明仍可导航 |
| 9 | 只写三处状态，不设布局尺寸/内联样式/正文 | 静态白名单：`setAttribute` 仅 `toggle.aria-expanded`；`classList` 仅三组合同项；无 `style/innerHTML/textContent/className/dataset/createElement`；无 `offsetWidth/innerWidth` |
| 10 | 接口缺失安全降级不抛异常；四页控制台 0 报错 | `m_no_toggle`/`m_no_nav` 变异体：`no-js→js` 仍完成、后补接口上无任何状态写入（证明未绑定监听）、`Runtime.exceptionThrown` 为 0；`--enable-logging=stderr` 六目标全 CLEAN |
| 11 | 无外部依赖/网络/module/`console`/`debugger`，无第七文件 | 静态禁用项 15 项 + `Results/` 恰六文件 |
| 12 | 未实现"点击菜单外部关闭"，无其他合同外行为 | 静态：`document/window` 上无 `click/pointerdown/mousedown/touchstart` 监听、监听器总数恰为 4；行为：iframe T6c 与 CDP T6c 均证明点击正文后菜单**保持展开**（预期行为） |
| 13 | Task 8 集成由"运行时模拟"升级为"真实交互"；Task 11 获得可执行基线 | 第 5 节；`cdp_check.mjs` / `run_browser.py` 可直接复跑 |

## 5. 与 Task 8 的集成、与 Task 10/11 的交接

菜单三态在真实脚本下复现（Task 8 此前只能运行时模拟）：

| 状态 | `html` | `#site-navigation` | `aria-expanded` | 实测显示 |
| --- | --- | --- | --- | --- |
| 无脚本 | `no-js` | 无 `is-open` | `false`（源码） | 按钮 `none`，导航 `block` |
| 移动·关闭 | `js` | 无 `is-open` | `false` | 按钮 `flex`，导航 `none`，四链接不可聚焦 |
| 移动·打开 | `js` | `is-open` | `true` | 按钮 `flex`，导航 `block`，四链接可 Tab |
| ≥769px | `js` | 无 `is-open`（脚本重置） | `false` | 按钮 `none`，导航常显可 Tab |

截图回读（`_qa_task9/shots/`，PNG 均 >30 KB，`<title>` 同时回读真实视口与状态）：
`index_mobile_closed = 375:js:closed:false:none`、`index_mobile_open = 375:js:open:true:block`、
`index_desktop = 1000:js:closed:false:block`、`index_nojs_mobile = 375:no-js:closed:false:block`、
`commentary_mobile_open = 375:js:open:true:block`。

Task 11 可直接复用的导航交互基线：`node _qa_task9/cdp_check.mjs`（真实事件 + 跨断点 + 禁用 JS + 控制台）
与 `python _qa_task9/run_browser.py`（四页矩阵 + 变异体 + 截图）。

## 6. 已知取舍与限制

- `defer` 首帧闪烁：Task 2 禁止内联初始化，`no-js → js` 只能在 `script.js` 首行完成，本项目按合同接受该取舍，未加内联脚本。
- "点击菜单外不关闭"是 2026-09-19 已定决策，本报告将其作为**预期行为**验证（两项门禁），Task 10/11 不得据此判失败。
- 本环境 Chrome 无头 `--dump-dom` 不派发媒体查询 `change` 事件；跨断点一项的证据一律以 CDP 真实渲染为准，探针侧已用对照监听显式标注"该项移交"。
- 窗口未获系统焦点时 `:focus` 伪类不匹配，焦点判定一律读 `document.activeElement`（配合 `Emulation.setFocusEmulationEnabled`）。
