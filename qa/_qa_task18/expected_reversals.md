# Task 18 预期内翻转登记表（`expected_reversals.md`）

本表是将来判断"真回归 vs 范围过期"的**唯一依据**（Task 12 §验证方法 5 的闭合规则：每个标为
"预期内翻转"的旧脚本都要在这里出现；未标出的脚本仍须全绿）。

四列口径：**脚本／断言／失效原因／接管断言**。实测证据分两处：
`_qa_task15/regression_diff.txt`（Task 15 切换当日的两跑差分，本次只读引用）与
`_qa_task18/regression_diff.txt`（本包 18.9 两跑差分，台架 `_qa_task18/v1_guarded.mjs`）。

## 一、本包 18.9 实测：v1 闸门 `_qa_task10/verify_task10.mjs` 的两跑差分

两跑命令与三个环境变量逐字按 `plan/Task18` §Task 18.9 执行（副本配副本的快照、现网配现网的快照）：

| 跑 | `QODER_RESULTS_DIR` | `QODER_FACTS`（本包探针在同一目录重取） | `QODER_REPORT` | 结果 |
| --- | --- | --- | --- | --- |
| 第一跑 | `_qa_task15/before`（v1 六文件） | `_qa_task18/facts_before.json`（4 页，带 `__meta`） | `_qa_task18/run_before.md` | 289 条：PASS 288／FAIL 1 |
| 第二跑 | `Results`（v2 九文件） | `_qa_task18/facts.json`（7 页，带 `__meta`） | `_qa_task18/run_after.md` | 222 条：PASS 206／FAIL 16（其中**新增** 15 条，另 1 条与第一跑共有） |

**用母本原文件跑第二跑的结果是先崩溃后无报告**：`verify_task10.mjs:351`
`TypeError: Cannot read properties of null (reading 'childOrder')`——栏目页里已无 `.article`。
这正是缺陷 **D3** 的现场形态（`rc==2` 与真实 FAIL 混淆），也是本包把 F 组宿主显式改判"区块缺失 FAIL"的理由。
为使差分可枚举，本包在 `_qa_task18/v1_guarded.mjs` 里放了母本的一份**崩溃守卫副本**（唯一差异：F 组宿主缺失记
FAIL、G 组整块 `try/catch`），历史产物 `_qa_task10/` 未被改写；跑前跑后 `_qa_task10/` 与 `Results/`
的 mtime+size 清单逐项相等（`_qa_task18/_fingerprint_before.txt` ↔ `_fingerprint_after.txt`）。

### 1.1 新增 FAIL 全部 15 条，逐条已有归属与接管者（未登记的新增 FAIL = 0）

| 脚本 | 断言 | 失效原因 | 接管断言 |
| --- | --- | --- | --- |
| `_qa_task10` | `[A1] FAIL Results/`（"恰好 6 个文件"） | 交付集合改为清单驱动：9 个文件 | **A1a**（六壳命名）＋**A1b**（双向集合）＋**A1b/pages-count** |
| `_qa_task10` | `[A1] FAIL Results/ 文件名与大小写` | 同上，`exactNames` 写死六项 | **A1a**／**A1c**／**A1d** |
| `_qa_task10` | `[A2] FAIL Results/ 目录清单` | v1 的 A2 把"第七个文件"当违约 | **A2** 三条（no-subdir／no-banned-ext／no-cache）＋**A6** |
| `_qa_task10` | `[C3/news-message.html]`、`[C3/news-feature.html]`、`[C3/news-commentary.html]` | 三页 `<title>` 主体从文章标题改为栏目名（URL 语义升级，Task 15 §5） | **C3**（七页，期望由 `Task12` 扩展矩阵派生）＋**D3b** |
| `_qa_task10` | `[E1] FAIL index.html #main-content 直接元素子节点` | R4：两个→三个直接子元素 | **E1/count**＋**E1/order**（期望解析自 `Task4 §DOM 结构验证`） |
| `_qa_task10` | `[E5] FAIL index.html 标题层级` | R4：`h2` 3→4、标题总数 4→5 | **E5**＋**E8tally/h2** |
| `_qa_task10` | `[E8/noEighth] FAIL index.html 无第八项可见正文` | R4：标签集合改为 `{main:1,h1:1,div:2,section:3,h2:4,p:3,ul:1,li:3,a:3,span:6}` | **E8/noEighth**＋**E8tally/\***＋**E8zero/\***＋**E8/14** |
| `_qa_task10` | `[F0-host/news-message.html]`、`[F0-host/news-feature.html]`、`[F0-host/news-commentary.html]`（守卫副本新增行） | 正文宿主从栏目页迁到详情页；母本在此处直接崩溃 | **F 组**（宿主改指三个 `article-*.html`）＋**L1／L2／L3** |
| `_qa_task10` | `[G0-host]`（守卫副本新增行） | 同上，G 组按 `news-*.html` 取快照 | **G 组**（随 F 组改指详情页） |
| `_qa_task10` | `[H11] FAIL styles.css 页面专属 class / 第二套移动主题变量` | **Task 15 与 Task 16 均已登记：该条在 v1 基线轮就红，非归档层引入**（Task 16 §11 第 ⑤ 点："本次四页口径产出 19 行／18 标签，其中 FAIL 只有 H11（且基线轮已红，非本包引入）"） | **H11**（禁用类名）＋**H11/unknown**＋**H11/orphan**——本包把"类名对照面"从四页扩到七页后转绿 |
| `_qa_task10` | `[K2/mains] FAIL K2 差异仅在各页 main 内容区` | 首页 `main` 多了 `div.home-latest`，栏目页 `main` 改为 `h1 + ul.entry-list` | **K2/main/\<page\>** 七页逐页签名，期望解析自 `Task4` 与 `Task0 §归档层新增` |

### 1.2 断言数量下降本身（阻断规则二要求的报告项）

v1 289 条 → 守卫副本 222 条，**69 条在新世界不可求值**（不是被删除，是宿主不存在）：
F 组 57 条（`F1×6 F2×3 F3×6 F4×6 F5×6 F6×3 F7×6 F8×9 F9×5 F10×6 F11×1`，其中 `F11` v1 只出 1 行）＋
G 组 12 条（`G1×6 G2×5 G3×1`）。接管者一律为 **L1／L2／L3 三腿 + F／G 组重锚到 `article-*.html`**；
本包对应组的实际条数为 F=144、G=76，**净增而非净减**。

### 1.3 本包发现的合同缺陷（登记并回流，不在闸门里"兼容"）

- **`plan/Task18` §Task 18.9 的 grep 口径与母本输出格式不符**：命令写的是 `grep '^  FAIL:'`，
  而 `verify_task10.mjs:703` 写出的失败行格式是 `[ID] FAIL <定位> — 期望: …`，两种都不以两个空格加 `FAIL:` 开头。
  按字面执行该命令，两跑各得 0 行，差集恒空 → 得到"0 条新增 FAIL"的**假闭合**，与 D1 的假绿同型。
  本包据母本实际格式改为 `grep '^\[.*\] FAIL'`，其余（两跑、三变量、副本配副本快照）逐字不变。回流 **Task 12**（该节属合同文本）。
- **`plan/Task12` 与 `plan/Task18` 关于"`_qa_task9` 仍须全绿"的断言与实测不符**（见下表第二节）。回流 **Task 12**。

## 二、仍然有效的真不变量（必须继续全绿；谁红谁越权）

| 脚本 | 断言面 | 本包实测 |
| --- | --- | --- |
| `_qa_task1/compare.py` | 三份素材哈希 + 逐段字符数 | rc=0，`RESULT: ALL CHECKS PASS`（`_qa_task18/_qa_task1_compare.txt`） |
| `_qa_task1/deepcheck.py` | 逐段文本与结构深度对表 | rc=0（`_qa_task18/_qa_task1_deepcheck.txt`） |
| `_qa_task1/forbidden_scan.py` | 禁止串只出现在 `plan/`，`Results/` 为零 | rc=0（`_qa_task18/_qa_task1_forbidden_scan.txt`） |
| `_qa_task9/verify_static.py` | `script.js` 静态合同 85 项中的**合同面**（非"实施前哈希"那 6 项） | 见下方冲突登记 |
| 本包 **B 组** | 三份素材 SHA-256 | 4 条全绿 |
| 本包 **C6** | 每页 `nav === 1`（母本 `:213-216`） | 266 条 C 组全绿，未放宽 |
| 本包 **C5** | `.skip-link`（母本 `:210`） | 全绿，与 C6 未混称 |
| 本包 **D3／D4** | 每页恰好一个 `aria-current="page"` | 37 条 D 组全绿 |
| 本包 **I 组** | `script.js` 哈希 == v1 基线 | `I11/hash` 全绿（R10 无写入者） |

### 2.1 与合同冲突的一条（不掩盖、不判绿）

`plan/Task12 §预期内翻转清单` 与本包 `plan/Task18 §完成定义` 都点名"`_qa_task9` 及其余各包自身产物仍须全绿"，
理由是 `script.js` 本轮零改动。实测 `_qa_task9/verify_static.py`（不带 argv，只读跑）在 v2 树上为
**79/85 pass, 6 failures**，而 6 条失败**全部不是** `script.js` 合同面：

| 失败行 | 实质 | 判定 |
| --- | --- | --- |
| `Results/ 恰为六个交付文件（无第七个）` | 时点断言：v1 六文件集合 | **范围过期**，接管＝本包 **A1a／A1b／A1c／A1d／A6** |
| `index.html／news-message.html／news-feature.html／news-commentary.html／styles.css 与实施前 SHA-256 一致` | 拿 Task 9 **自己开工前**的哈希当"当前应等值"——既随 R7 首页文本修订换值，又随 Task 15／16 换值 | **时点断言**，接管＝本包 **A1b/sha/\***（对清单）＋**I11/hash**（对 script.js）＋**R0/\***（轮内只读证明） |

即：`_qa_task9` 的 `script.js` 合同面（无外部依赖、三处状态写入、断点字符串、无 console）85 项里其余 79 项仍绿。
所以合同那句"它变红即说明有人违反 R10"**不成立**——它红在自身两处时点判据上。本包不改写该脚本、不判它绿，
把这条冲突回流 **Task 12**（需在 §预期内翻转清单把它从"仍须全绿"改为"六条时点断言预期翻转，接管者见本表"）。

### 2.2 执行期事故与恢复（透明登记）

跑 `_qa_task9/verify_static.py` 时未带 argv，脚本按 `verify_static.py:258` 把报告写进
`_qa_task9/static_result.txt`，覆盖了 Task 9 的原始机器输出。
本包已用同一脚本的原始 stdout 留档 `_qa_task9/static_stdout.txt`（`print(text)` 与 `report.write_text(text)`
写的是同一字符串，未被本次运行触碰，mtime 仍为 2026-09-19 16:21）**逐字节还原**该文件
（3939 字节，末行 `STATIC: 85/85 pass, 0 failures`，还原副本另存 `_qa_task18/_task9_static_result_restored.txt`）。
教训：历史脚本只要支持 `argv[1]`，重跑一律带 argv 让它写到 `static_result_<目录名>.txt`，
或先确认其报告路径可被环境变量重定向——本包之后重跑历史脚本一律照此办理。

## 三、历史脚本翻转表（本包只读引用 Task 15 实测 + 本包补跑）

| 脚本 | 失效项 | 失效原因 | 接管方 |
| --- | --- | --- | --- |
| `_qa_task5/6/7 verify.py` | "逐段正文在 `news-*.html` 的 `<main>` 内"、"其他三页哈希未变"；`_qa_task6/7` 在 v2 输入下**直接崩溃**（`ValueError: not enough values to unpack`） | 正文迁入详情页，栏目页改为列表 | **L1／L2／L3** ＋ F 组重锚（本包 F=144 条） |
| `_qa_task4 verify_home.py` | `#main-content` 两个直接子元素、白名单 7 项、"其他页 mtime 早于 index.html" | R4 换值；Task 15 重写首页；mtime 判据被哈希判据取代 | **E 组新计数**（E1/E5/E8/E8tally/E8zero）＋本包 **R0/mtime** 与 **A5**（改用哈希而非 mtime） |
| `_qa_task2 verify.py` | 四页集合、"该阶段不得出现正文／`article` 标签"一类时点断言（Task 15 实测新增 27 条红，全部标"登记内"） | 集合 4→7、页面种类扩张 | **A 组** ＋ **C／D／K 扩到七页** |
| `_qa_task3 verify_css.py` | 对 `Results/styles.css` 的时点闭合判据："无 Task 3 范围外新文件"、接口类名"齐全（4 个／7 个）"、"首页接口只用合同 `.home-*` 类"、"无与合同语义重复的别名变量"（Task 15 记 v1 已知红 8 项） | Task 16 追加 12 个新类与两段归档区段 | **H 组 19 条 v1 语义原样迁移** ＋ **H13／H14**（类集合改由 `Task0 §稳定接口总清单` 解析）＋ `Task16` 的"既有区段逐字节未变"结论（本包 **H4/no-new-var** 用 `_qa_task16/before_styles.css` 复算该判据） |
| `_qa_task8 verify.py` | 文件集合与"五／六个交付文件" | 集合扩张 | **A1a／A1b／A1c／A1d** |
| `_qa_task10 verify_task10.mjs` | 见第一节 16 条 + 第二节 69 条不可求值 | 集合改清单驱动、首页换值、宿主迁移、四页→七页、J 组只禁 `2026` 且无全站年份形态扫描、M 组不存在 | 本包**全部对应组** |
| `_qa_task11 cdp_regression.mjs` | 页集合硬编码四页；`visited` 与 `visited-pixel` 两问 | 页面数 4→7；三页 `<h1>` 文本随迁移出现在详情页 | **Task 19**（视口／交互／降级／像素全部移交它，本包刻意不做视觉断言） |
| `_qa_task9 verify_static.py` | 六条时点断言（见 2.1） | 六文件集合与"实施前哈希"判据 | **A 组／I11／R0**；冲突回流 Task 12 |

## 四、闭合核对

- 断言影响矩阵标"改"的每一个组（A／C／D／K／E／F／G／J／L／N）都在本包有对应重写条目，见 `contract_index.md`。
- 表中列出的预期翻红脚本共 **9 个**：`_qa_task2`／`_qa_task3`／`_qa_task4`／`_qa_task5`／`_qa_task6`／`_qa_task7`／
  `_qa_task8`／`_qa_task10`／`_qa_task11`；本包实测另登记 `_qa_task9` 六条（合同冲突项，非本包引入）。
- 明确点名仍须全绿且实测全绿的：`_qa_task1` 三个脚本；实测部分绿并登记冲突的：`_qa_task9`。
- 18.9 差集中"消失的 FAIL"= 0（第一跑唯一那条 `[A5] FAIL Results/ 六文件 SHA-256 与清单` 在两跑都红，未翻转），
  "新增 FAIL"15 条**全部**已在上表登记 → **未登记的新增 FAIL 为 0**。
