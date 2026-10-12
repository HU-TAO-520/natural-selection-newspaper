# Task20 进度

## 当前状态

- 当前 N：6。
- 完成步骤：Task 20.0 现场基线与影响登记；Task 20.1 R14 合同与机器锚点；Task 20.2 静态叙事与模板；Task 20.3 纯逻辑与状态规则；Task 20.4 DOM 绑定、进度与降级；Task 20.5 样式；Task 20.6 主站渲染接入与入口包装；Task 20.7 预览目标与双目标同源证明；Task 20.8 双目标打包、清单与说明。
- 当前步骤：Task 20.9 既有闸门迁移与独立核验器。
- 本地/线上状态：INCOMPLETE；尚未发布。

## 完成步骤

### Task 20.6 — 完成

- 新增 `build/easteregg.py` 单一渲染器；修改 `build/build.py`，默认 main 并支持 `--target main|easteregg`。main 返回的 `pages` 仍只含 HTML，`assets` 单列游戏 CSS/JS；角色拆为 PAPER、EGG、ERROR。首页 partial 精确匹配 R14 完整包装一次，逆包装后与 Task13 字节和旧 SHA 完全相等，golden 比较也先逆包装。
- 构建 `--check` 改为内存产物与磁盘逐文件比较，取消旧随机临时 staging 写入路径。`python build/build.py --out qa/_qa_task20/stage-main --check` 退出码 0；旧 Paper CSS 与导航 JS及十个既有 HTML（除允许变更的首页外）逐字节保持一致。
- 候选 `qa/_qa_task20/stage-main` 通过 16 文件、12 HTML、唯一首页包装、独立彩蛋资源和旧页保真核验后，生成正式 `Results/`。执行 `python build/build.py --out Results` 和 `python build/build.py --out Results --check` 均退出码 0；Results 现有 16 个文件，HTML 12 张。
- `python qa/_qa_task20/verify20.py --phase main-candidate --root Results` 通过；`story`、`binding`、`style` 三阶段再次通过。候选和正式成品绑定同一份当前 build.py 输出哈希。
- 实际修改：`build/build.py`、新增 `build/easteregg.py`、首页 partial；生成 `Results/index.html`、`easteregg.html/css/js`；普通原页除首页外字节不变。

### Task 20.7 — 完成

- 创建并装配 `deploy/easteregg/`，其中恰为 `index.html`、`404.html`、`easteregg.css`、`easteregg.js`。构建器 `--target easteregg --out deploy/easteregg` 及其 `--check` 均退出码 0。
- `python qa/_qa_task20/verify20.py --phase dual-target --root Results --preview-root deploy/easteregg` 通过：两份终端在仅归一化返回链接/CSS/JS 三组 URL 后逐字节相等，CSS/JS 逐字节相同，preview 404 使用根路径样式且不加载游戏 JS。
- 真实 HTTP 根路径与 404 浏览器行为尚未测，留 Task20.10；本步骤仅证明离线装配集合及同源资源字节。

### Task 20.8 — 完成

- 重写 `build/pack.py` 为显式 profile，保留 `all/manifest/zip/verify`、`--root`、`--zip`，新增 `--target main|easteregg`；默认 main。清单/ZIP/上传说明两套路径独立，main columns 保留三栏文章顺序，preview columns=[]、articles=0。
- 打包和回验全部在内存 ZIP buffer 中逐条核对条目名、元数据、内容与磁盘 SHA/字节数，已移除临时解包目录，修复 20.0 记录的 PermissionError。
- `python build/pack.py all`、默认 `verify`、`all --target easteregg`、`verify --target easteregg` 均退出码 0。计数分别 main 16/17/12、preview 4/5/2。两目标重复 `all` 后 ZIP SHA256 分别保持 `df3692829ffe1fc0031214a27bdbfbdcde50419b2b3080391fae12b8d3a1292f` 与 `1c9c2b2e4454533c239b14134278018a5fdc9b715805792c5160c921b3349c84`。
- P04 负向交叉检查 `python build/pack.py verify --target easteregg --zip deploy/site.zip` 按预期失败（退出码 1；捕获多出的文章、主站资源、彩蛋文件及内容身份不符），未改动任何包。最终两目标 verify 又各自通过。
- 现有 `deploy/_headers` 哈希仍是保护值；ZIP 中含一项 `_headers`，成品目录不含；报告/清单不打进包。

### Task 20.4 — 完成

- 新增 `build/easteregg/ui.js`，模板按 §7.4 保留所需 ID 与原生 label/select/range/form。DOM 只委托一次 click/input/change/submit；表单 Enter 与按钮 click 共用一次 submit 路径。
- sessionStorage 读取/写入/删除均捕获异常并退回内存；启动失败回到 no-js 静态完整档案并隐藏交互控件。动态波形用预注册 class 与节点更新，不写 style/data 属性；文本节点使用 textContent。
- `node --check build/easteregg/ui.js` 与 `python qa/_qa_task20/verify20.py --phase binding` 退出码 0；selector、label、单次绑定、存储退化与初始化失败分支均通过静态映射核对。实际交互浏览器验收留至 20.10。

### Task 20.5 — 完成

- 新增 `build/easteregg/styles.css`：深色舰桥、面板/信号色、波形、窄屏单列/769px 桌面双列、焦点与 reduced-motion；所有可读色与两种背景实测至少 4.5:1。
- `Results/styles.css` 只追加标记的 `.home-easteregg-link` 区段。其 15,340 字节旧前缀完全一致，新增区段只针对指定类；鼠标/键盘状态可见，操作热区最小高度 44px。
- `python qa/_qa_task20/verify20.py --phase story|binding|style`（逐条调用）全部退出码 0；style 阶段验证旧 CSS 前缀、孤立 selector、类登记、对比度、断点与 reduced-motion。视觉截图尚未验收。

### Task 20.2 — 完成

- 新增 `build/easteregg/terminal.html`、`not-found.html`，新增 `qa/_qa_task20/verify20.py` 的 story 核验阶段。
- 模板以无 JS 时可读的完整档案为默认状态；四个 JS 专用交互组初始 `hidden`。固定文案来自 Task20 §5.3；预览错误页使用固定根路径 CSS/终端/报社地址。
- `python qa/_qa_task20/verify20.py --phase story` 退出码 0，17 段逐字匹配，模板结构和预览错误页通过。首次执行捕获到核验器引文对照录入错误，按计划修正核验器后复跑通过。

### Task 20.3 — 完成

- 新增 `build/easteregg/core.js` 与 `qa/_qa_task20/core_tests.mjs`。实现固定 Caesar 译码、答案 NFKC/移除空白、七舰精确分组、落在目标格的信号校验、纯不可变状态转移、提示代解、状态恢复与解法重验。
- `node --check build/easteregg/core.js`、`node --check qa/_qa_task20/core_tests.mjs`、`node qa/_qa_task20/core_tests.mjs` 均退出码 0（T20-C01–C12）。
- 覆盖 shift/答案、人数相同但归属错、三路同位但未到目标、越幕、幂等、hints 代解、有效/非法缓存和 reducer 不修改旧对象。

### Task 20.1 — 完成

- 实际修改：plan/Task0、Task4、Task12、Task14、Task17、Task18、Task19 增加 R14 有效补充；Task4 首页计数明示由历史 a=3 转为有效 a=4；Task0 索引与 Task20/接口类登记更新；新增 qa/_qa_task20/contract20.mjs。
- 机器锚点只读取 Task20 §4.2 两标记之间唯一 JSON 代码块，并校验固定集合、目标数、首页入口和核心规则常量；不读取生产 core.js 取得答案。
- 验收：`node --check qa/_qa_task20/contract20.mjs` 退出码 0；动态导入读取 R14，输出 main=10、preview=4，退出码 0。
- 本步骤未改任何产品运行代码；旧核验器过渡期断言仍未迁移，按计划留待 Task20.9 接管。

### Task 20.0 — 完成（现场失败已如实记录）

- 实际修改/新增：仅新增 qa/_qa_task20/ 下的基线、影响登记、进度与原命令日志。项目源文件与成品没有改动。
- 快照：23 个允许修改的现有源文件副本；Results 初始 13 个文件；deploy 当前 manifest/site.zip/UPLOAD.md/_headers 副本。baseline_hashes.json 登记 43 个受保护文件。
- 实测：Python 3.14.3、Node v26.2.0、Chrome C:\Program Files\Google\Chrome\Application\chrome.exe；文章源 N=6。
- 只读 manifest/ZIP/磁盘核对：qa/_qa_task20/baseline/manifest-zip-readonly.json 的 5 项通过，当前 pages=13、html=11、config=1、articles=6；ZIP 14 个文件项，无目录项。
- 旧命令 python build/build.py --out Results --check：退出码 1。self_check 后在临时 staging 文件写入时 PermissionError；命令输出在 qa/_qa_task20/baseline/build-check.log。已设置 TEMP/TMP 指向项目 QA 目录重试，仍因 tempfile 的随机子目录写入受限。非产品内容漂移结论。
- 旧命令 python build/pack.py verify：退出码 1。ZIP 回验在随机临时目录解包时 PermissionError；输出在 qa/_qa_task20/baseline/pack-verify.log。只读替代核验全部通过。Task20.6/20.8 将去除这两条临时写入路径并重验。
- 工作目录没有 Git 元数据；本轮已用受保护集合、源快照和交付哈希替代 git diff 作为审计依据。

## 实际文件

- 新增 qa/_qa_task20/baseline_hashes.json
- 新增 qa/_qa_task20/impact.md
- 新增 qa/_qa_task20/baseline/**（源和当前产物快照、命令日志及只读包核对）
- 新增 qa/_qa_task20/tmp/**（调查 tempfile 写权限时创建的测试目录与失败暂存目录）
- 新增 qa/_qa_task20/progress.md

## 本步运行命令与退出码

| 命令/操作 | 退出码/结果 |
| --- | --- |
| python build/build.py --out Results --check | 1，PermissionError（临时 staging 写入） |
| python build/pack.py verify | 1，PermissionError（ZIP 临时解包写入） |
| baseline manifest/ZIP/磁盘独立只读核对 | 0，5 项通过 |
| git status --short | 128，目录不是 Git 仓库；已在 impact 登记 |

## 下一步

Task 20.6：实现统一渲染器、build.py 默认 main / 新 easteregg 目标分派、首页唯一包装与逆包装校验；先候选生成后再更新正式 Results。

## 未解决问题

- 旧构建器和打包器的临时目录写入限制尚未处理，归属 Task20.6/20.8。
- 旧检查完整 PASS 尚未确认；原始失败保持记录。
- 浏览器视觉、游戏、包和 Task18/19 回归均尚未运行；线上待用户手工上传。


## 最新状态 — 2026-10-05 收尾验收

### 本轮完成

- R14 产品构建已从头重建两目标并自检；main=16 文件/12 HTML/17 ZIP 条目，preview=4/2/5。ZIP 哈希分别为 `df3692829ffe1fc0031214a27bdbfbdcde50419b2b3080391fae12b8d3a1292f` 与 `1c9c2b2e4454533c239b14134278018a5fdc9b715805792c5160c921b3349c84`。
- 新增并语法核验 `qa/_qa_task20/run20.ps1`；本轮实际执行 `-Phase local`，原始摘要 PASS=13、FAIL=4、SKIPPED=2，状态 INCOMPLETE。没有借用历史 Task19 分段结果。
- `core_tests.mjs` 支持默认源码和 `--bundle`，二者 C01–C12 均退出码 0。
- `verify20.py` story/binding/style/main-candidate/dual-target/static 六阶段全部通过；`verify_packages20.py` 为 27/0。
- `http_fixture20.mjs --smoke` 加入真实 `_headers` 响应的自动检查，本轮 14 PASS/0 FAIL。浏览器手工记录、页面哈希和未测项保存在 run 的 `browser_observations.json`。
- 首页入口在 In-app Browser 里用 Tab 聚焦并按 Enter 成功打开同标签 `/easteregg.html`。已更新 `skills/skill-添加新文章.md` 的 R14 三个数量、双目标构建/打包/手工发布命令与当前核验入口。
- Task20.13 仅完成发布交接资料；没有上传或运行线上检查。

### 失败与环境阻断

- Task18 `src_check.py` 退出码 0，`fail_count=0`；浏览器 probe 退出码 2，报 `chrome 未启动`。旧全站门禁 762 项 PASS=642/FAIL=120/PENDING=0，因没有真实 DOM 快照且 M0/browser 未通过，不能签为全绿。
- Task19 all 退出码 2，驱动异常 `TypeError: fetch failed`（RZ99）；一致性检查退出码 2，缺本轮 `results-seg-*.json`。task19 `report.md` 已在本轮目录生成并判 FAIL 1。分段没有运行。
- 浏览器矩阵还有 200% 缩放、storage 异常、禁 JS/CSS、无关 storage key、reduced-motion、完整读屏/网络请求追踪、持久截图和 M01–M14 负向变异未做。完整验收状态必须保持 INCOMPLETE。

### 实际命令与退出码

| 命令 | 结果 |
| --- | --- |
| `python build/build.py --out Results` 与 `--check` | 0 / 0 |
| `python build/build.py --target easteregg --out deploy/easteregg` 与 `--check` | 0 / 0 |
| `python build/pack.py all` 与 `verify` | 0 / 0 |
| `python build/pack.py all --target easteregg` 与 `verify --target easteregg` | 0 / 0 |
| 源 core、生产 bundle core C01–C12 | 0 / 0 |
| verify20 六阶段 / 独立包 / HTTP fixture | 全通过；包 27/0，fixture 14/0 |
| Task18 source check / probe / verify | 0 / 2 / 1 |
| Task19 all / consistency / report generation | 2 / 2 / 0（报告判 FAIL 1） |

### 下一步与未解决项

需要在可由 Node/CDP 启动的独立 Chrome 环境中重跑 Task18 probe/verify、Task19 all 和全部 17 个新鲜分段；完成浏览器矩阵剩余测试、截图与负向变异，然后重跑 run20。当前状态不是 LOCAL_ACCEPTED。用户手工上传 main 与 preview 之后，再以只读方式执行 `run20.ps1 -Phase online`；线上状态仍未验证。

## Task21 R15（2026-10-06 第二轮）

- 五项导航与投稿页落地：主站 17 文件／13 HTML／18 ZIP 条目（N=6），预览 4／2／5。task18 闸门 1640 条全 PASS，package checks 27/0，protected-hashes PASS（11 条按实测换值），static PASS，浏览器回归真实执行。
- 仍红 4 条：task19-all 的 RZ2（变异捕获率报告缺失）与 RB16（首页 main 标签计数写死 a:3，Task20 入口链使实际为 4）、task19-segments 与 task20-browser（run20 设计行）。均为 R14 既有账，详见 plan/Task21 §17.4。
- 收稿侧：tools/intake.py 六子命令、intake/{config,ledger,台账} 落地；真实 poll/ingest/verify 跑通，夹具端到端跑通并撤回演示稿。
- 2026-10-06 R15 收口：task18 1640/1640 全绿、package 27/0、protected-hashes/static/http-fixture PASS；run20 local 总结 PASS=15 FAIL=4 SKIPPED=0，四条红项逐条定性（变异台架缺件／本轮分段文件缺件／browser20 套件不存在／run20 结构行），见 plan/Task21 §17.4。浏览器整跑 3911 行只剩 1 条红。投稿页已按用户指示改写为具法律效力的收稿声明并钉进构建器（plan/Task21 §7.1、§17.5）。
