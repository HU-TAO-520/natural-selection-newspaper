# Task20 现场影响登记

测量日期：2026-10-05（Asia/Taipei）
项目根：C:\Users\weibo\Documents\语文报纸

## 当前输入与工具

- 文章源 N=6；Results/ 有 13 个文件，当前清单 counts 为 pages=13、html=11、config=1、articles=6。
- Python 3.14.3、Node v26.2.0 可用；Chrome 位于 C:\Program Files\Google\Chrome\Application\chrome.exe。
- 工作目录未被 Git 识别（git status --short 返回 fatal: not a git repository），本轮以文件快照及 SHA-256 作改动边界证据。

## 基线文件与摘要

- baseline_hashes.json 含 43 个受保护文件的实测哈希、23 个可改源文件快照的原哈希、13 个主站交付文件清单及四份现有部署文件哈希。
- baseline/sources/ 保存本轮允许改动的现有源文件；baseline/Results/ 保存构建前 13 个页面/资源；baseline/deploy/ 保存当前 manifest、ZIP、上传说明及 _headers。
- 当前文章、Materials、历史 Task13/14 冻结文件、构建共享壳、共享导航脚本及 _headers 均在保护哈希集合内。
- 旧 build.py --check 与 pack.py verify 均已运行并保存 baseline/build-check.log、baseline/pack-verify.log、对应退出码文件。两者退出码均为 1，失败发生在旧工具的临时 staging 写入，异常为 PermissionError；设置 TEMP/TMP 到本轮 QA 子目录重试仍在随机子目录文件写入处失败。错误发生于产品内容/包核验之后的暂存步骤，不能记为 PASS，也不代表观测到内容漂移。Task20.6 与 20.8 将分别取消该临时写入依赖，并重新验证。
- 只读 ZIP/清单/磁盘互核由新建独立检查补齐；原失败日志继续保留为现场基线。

## 旧限制与接管登记

| 影响面 | 当前事实 | R14/接管 |
| --- | --- | --- |
| 引言基线 | build/build.py 的 load_partial 同时要求历史字节哈希及 PARTIAL_EXPECTED；self_check 又和 qa/_qa_task14/out/index.html 冻结区逐字节比较。 | 20.1/20.6：先要求唯一完整首页包装恰一次，再做精确逆包装并按旧原文哈希/golden 比对。历史冻结文件不写。 |
| 首页计数 | build/build.py 的 HOME_TAG_COUNTS 及 Task4 规范计数为 a=3；Task18 verify_task18.mjs 的 E 组另有 o.a===3。Task19 contract 也读取首页合同数。 | 20.1：Task4 当前规范值改为 a=4、Task12 旧 R4 标成历史；Task18/19 以 4.2 R14 为有效真值并交叉核对 Task4。14 项可见白名单和其余数值不动。 |
| 输出角色 | build_pages() 只返普通 HTML；旧 self_check 将每页都作为报纸共享壳处理；普通 404.html 也服从报纸壳合同。 | 20.6/20.7：主站页面分 PAPER、EGG、ERROR，彩蛋独立渲染/自检；跨角色安全、文件集合、链接、禁止项仍覆盖全体。预览 404 由专属模板自检。 |
| 生成资源集合 | 构建器 FOREIGN_ALLOWED 仅含 styles.css、script.js；打包器据其收集合并静态资源。 | 20.6/20.8：保留两个旧共享资产并单独识别生成的 easteregg.css/js，通过显式目标 profile 装配。 |
| 文件与 HTML 数 | build/pack.py 的 SHELL_FILES=7，页面公式为 7+N；HTML 数硬编码为页面数减 2。 | 20.1/20.8：4.2 合同、profile 集合和资源项推导公式；main=10+N/11+N ZIP/6+N HTML，preview=4/5/2。 |
| 既有 Task18 快照/闸门 | probe_task18.mjs 以 manifest HTML 集合为事实源；verify_task18.mjs 有 o.a===3 和对报纸结构的检查。 | 20.9：保留 E/H/J/N 等可适用覆盖；彩蛋加入事实哈希集合，报头/报纸壳只按 PAPER 进行，静态彩蛋壳检查接管对应合同；所有页面的禁项/清单/资源覆盖继续运行。 |
| 既有 Task19 浏览器/线上集合 | contract19.mjs 由 manifest 建 htmlPages/allHtmlPages/titleSubject；回归遍历 C.htmlPages，RZ1/RZ3 绑定全页集合；online_check.mjs 有 RO1 页身份与计数。 | 20.9：明确 allHtmlPages、paperPages、eggPages、error role；纸媒布局仅走 PAPER；全部普通事实保持全 HTML；RZ1/RZ3 与 RO1 核对总集合/彩蛋身份；主站 404 本地检查保留。 |
| Task19 输出隔离 | consistency19.mjs 固定读 qa/_qa_task19/results*.json，历史目录中已有多轮变异与分段结果。 | 20.9/20.10：新增可选 QODER_REPORT_DIR、QODER_FACTS、QODER_TASK18_REPORT，Task20 调用指向本轮全新 run 子目录；默认旧接口保持。 |
| 临时 staging 环境限制 | 两个旧核验都依赖 tempfile.mkdtemp() 后写入随机新目录；此计算环境对此类嵌套路径写入返回 PermissionError。 | 20.6/20.8：check 路径保持纯比较；ZIP 验证以读取归档内容的独立内存核验方式消除 staging 写入。保留零目录项、逐项哈希/清单/磁盘相等合同。 |

## 当前运行与输出路径

- 基线命令从项目根运行；日志：qa/_qa_task20/baseline/build-check.log 和 pack-verify.log，对应 .exit 文件记录 1。
- qa/_qa_task20/baseline_hashes.json 是源、产物及保护集合的测量真值。
- 后续每步进度写入 qa/_qa_task20/progress.md；Task20 独立结果写 qa/_qa_task20/，Task19 输出绑定每个新的 qa/_qa_task20/runs/<run-id>/。
