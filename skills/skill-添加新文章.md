---
name: add-news-article
description: 《自然选择号》静态报纸站"加一篇文章"的保姆级流程：从微信正文到 content/articles/<slug>.md，再到构建、打包、三道闸门、用户手工上传 Cloudflare Pages，含每一步的预期输出、红了怎么办、以及本仓库的硬性约定。当用户说"加一篇文章／这是新稿／放进报纸里／更新一下站点"时使用。
metadata:
  type: project
---

# 添加新文章（保姆级流程）

仓库根：`C:\Users\weibo\Documents\语文报纸`
线上：`https://old-ns-news.pages.dev/`（Cloudflare Pages 项目 `old-ns-news`，用户手工 Direct Upload）

**2026-10-03 目录约定：** QA 工具链整体收在 `qa/` 下（`qa/_qa_task13`…`qa/_qa_task19`）。构建器与全部 QA 脚本的仓库根都取"脚本目录的上两级"，所以命令必须从**仓库根**执行，路径写 `qa/_qa_taskN/...`。

## 0. 先记住这七条铁律

1. **内容是唯一真相**：每篇文章的权威文本是它自己的 `content/articles/<slug>.md`；`plan/Task1` 的合同块只是三篇迁移文的第二条腿（R12②）。
2. **构建器是 `Results/` 里 HTML 的唯一写入口**。手工改 `Results/*.html` 会在下一次构建被覆盖，并且会被 Task 18 的字节级保真判据判红。`Results/styles.css`／`script.js` 是样式包（Task 16 的产物），不归构建器。
3. **全有或全无**：`build.py` 任何一篇 md 解析失败就整批不落盘（退出码非 0）。绝不允许"少一篇也绿"。
4. **不放宽断言换取绿灯**。红了先定性：是产品缺陷、是期望值写死、还是我的操作失误。改判据要在 `plan/` 里留痕。
5. **闸门不得用构建器验证构建器**：`qa/_qa_task18/src_check.py` 与 `qa/_qa_task19/contract19.mjs` 各自独立再解析一次 md，与 `build.py` 互不知情。
6. **面向读者的任何位置都不出现公元年份**；`date:` 字段只参与排序、永不输出。
7. **上传由用户本人执行**，助手止于 `deploy/site.zip` 与 `deploy/UPLOAD.md`。

**Task20 R14 双目标口径：**加文章只进入 `main`，不要求重建或重发彩蛋 `preview`。主站当前文件/页面数为 `10+N`，HTML 为 `6+N`，ZIP 条目为 `11+N`（均含主站 404；ZIP 另含 `_headers`）。彩蛋预览固定为 4 个文件、2 个 HTML、5 个 ZIP 条目，不含文章。游戏文案/规则改在 `build/easteregg/`，之后分别构建、核验和手工发布 main 与 preview。维护命令见 `qa/_qa_task20/progress.md` 与 `deploy/EASTEREGG-UPLOAD.md`。

## 1. 拿到正文后先做入站清洗（要逐条向用户核对）

| 处理 | 做法 | 反例（不要这样） |
| --- | --- | --- |
| 微信表情码 | 删除 `[嘿哈] [社会社会] [捂脸] [哇] [合十]` 这类码；删完段末若无标点，补一个中文句号 `。` | 留着码，或把整段删掉 |
| 结尾日期行 | `（自然选择号9月27日）` 这类整串 → 填进 `end_date`，**不要留在正文里** | 正文最后一段夹着日期 |
| 空格与引号 | **原样保留**：数字两侧半角空格（`Windows 10`、`4K 电视`）、全角引号「」“”、破折号 | 顺手"美化"成半角或去掉空格 |
| 自我限定句 | 原样保留（如"可能是记错了吧"） | 为了"更严谨"删掉 |
| 分段 | 用空行分段，**每段一行**；段内不回车 | 把一段拆成两行（会被判跨行块） |
| 电头 | 只有首段可用 `**自然选择号9月18日7时电**`，闭合星号后恰好一个半角空格 | 第二条加粗、或星号后紧接汉字 |

段落数要在动手前报给用户："这篇 N 段，对吗？"——详情页段落数由 md 的空行决定，构建器不做自动分段，事后改段数会连带动 Task 18 的 `F6/F7` 逐段判据。

## 2. 决定三个字段值（问用户，不要猜）

- `column` ∈ `message|feature|commentary`，必须与 `content/columns.md` 注册表已有行一致；**要新增栏目属于合同变更**，得先改注册表并同步 `plan/Task12` 的三行表，不是加一篇文章的动作。
- `date`：ISO `YYYY-MM-DD`，只用于排序。用户没给就留空（缺 `date` 的排在最后）。三篇旧文至今没有 `date`，这是内容状态不是缺陷。
- `display_date`：「9月27日」这样的月日，列表页与首页显示用。留空则该条目不显示日期（不是显示"日期未知"）——但**会进首页前 3 的稿件必填**，且值必须是正文里逐字出现过的写法（把"号"改"日"，见 §10 头两条）。
- `end_date`：可选，值必须**整串**匹配 `^（自然选择号\d{1,2}月\d{1,2}日）$`，渲染为正文之后的 `p.article__date`。R12 起与栏目无关，通讯稿也能用。

## 3. 写文件 `content/articles/<slug>.md`

模板（**注意：说明性模板在 `content/_模板.md`，它被哈希钉住，只读不可改**）：

```markdown
---
slug: north-of-dam-river
column: feature
title: 坝河以北，走过的东坝
byline: 蓝色空间
date: 2026-09-27
display_date: 9月27日
end_date: （自然选择号9月27日）
---

从单店中路一直往北走，走过坝河，就到了北中……

第二段……
```

字段规则（违反任何一条，构建以退出码 **2**（输入错误）点名文件、行号与条款号拒绝）：

| 字段 | 必填 | 规则 |
| --- | --- | --- |
| `slug` | ✅ | `^[a-z0-9][a-z0-9-]{2,40}$`；文件名主干必须等于 slug；不得等于保留名，不得长得像 `article-*.html` 或含日期形态；详情页名固定 `article-<slug>.html`（平铺 URL，无日期层） |
| `column` | ✅ | 必须是注册表里的键 |
| `title` | ✅ | 逐字符即 `<h1>` 与 `<title>` 主体（后缀 `｜自然选择号` 由壳补） |
| `byline` | ✅ | 逐字符，不加"作者：""记者："（这些是被禁词） |
| `date` | ⬜ | ISO；**永不输出**；缺失排最后 |
| `display_date` | ⬜ | 「X月X日」，且必须是正文里出现过的写法（R5②） |
| `end_date` | ⬜ | 上面第 2 节的整串正则 |
| `order` | ⬜ | 同日次级排序，缺失按整数 0 |

正文禁止：`` ` `` `<` `>` `#` `[` `]` `!`；行首禁止 `-` `*` `>` `|` `~`（所以正文里不能出现第三条 `---`）；段内不得有第二个加粗对；不得空正文。
文件字节形态：UTF-8 **无 BOM**、纯 **LF**、末尾**恰好一个**换行。

## 4. 构建（先试跑，再落盘）

```bash
mkdir .tmp-verify && python build/build.py --out .tmp-verify   # 试跑到临时目录
```

预期（R14，当前 N=6）：main 目标有 `10+N=16` 个文件，其中 `6+N=12` 个 HTML（首页、3 栏目页、6 详情页、主站 404、彩蛋页及资源）。更新文章时只构建 main；彩蛋游戏有改动时，按交接命令构建两个目标。
零副作用判据：**除首页与新增稿件所属栏目页外**，临时目录里每个文件都应与 `Results/` 同名文件逐字节相同。本轮实测漂移面正好两个：`index.html`（只有最新区第 2、3 行换文）与 `news-message.html`（多一条），五篇详情页 `cmp` 全 SAME。
**坑**：构建器**不产出** `styles.css`／`script.js`（样式包归 Task 16），临时目录里只有 HTML。用 `for f in Results/*; do cmp -s "$f" ".tmp-verify/$(basename $f)"` 逐文件比，会给这两个文件报**假 DIFF**（`cmp` 对不存在的文件返回非 0，看着像"样式包漂移"）。遍历**临时目录**的文件清单，或显式跳过这两个。

**只有试跑干净**才写正式产物：

```bash
python build/build.py --out Results
```

- `--out` 必填且不会自建目录；不带 `--out` 直接参数错误。
- 退出码含义：`0` 成功｜`2` 输入不合法（点名文件／行号／条款）｜`3` 构建器自检失败｜`4` 前置基线缺失或被篡改（例如 `qa/_qa_task13/baseline/*`、`expected-spec.json` 的哈希对不上）。
- 加稿后**必须**看：首页最新区只渲染全局序前 3 条；`deploy/manifest.json` 的 `counts.articles` 会变；主站文件/HTML/ZIP 三数分别为 `10+N／6+N／11+N`。预览保持 `4／2／5`，不带文章。

## 5. 打包

```bash
python build/pack.py all        # 默认 main：manifest → zip → 自校验
python build/pack.py verify     # 只回验 main，不写盘
python build/pack.py all --target easteregg
python build/pack.py verify --target easteregg
```

当前 R14 预期数量（N=6）：main 为 16 文件／12 HTML／17 ZIP 条目；preview 为 4 文件／2 HTML／5 ZIP 条目。包 SHA-256 以本次打包器实际输出及相应上传指南为准，不沿用历史示例值。

```
main：deploy/site.zip 有 17 个 ZIP 条目；deploy/manifest.json 的 pages=16、html=12、config=1、articles=N
preview：deploy/easteregg.zip 有 5 个 ZIP 条目；deploy/easteregg-manifest.json 的 pages=4、html=2、config=1、articles=0
```

旧的 N=5/N=6 包哈希和数量是历史记录，不作为 R14 期望值。控制台中文会因 GBK 代码页显示成乱码，**认数字与哈希即可**，或先设置 Python UTF-8 输出。

要点：zip 内条目时间戳被固定为 `(1980,1,1,0,0,0)`，所以**同一内容重打包必然得到同一 SHA-256**；比对包一律用哈希而不是"看起来一样"。`manifest.json`／`UPLOAD.md` 只进 `deploy/`，绝不进 `Results/` 也不进 zip。退出码 `4` = 发现清单外文件，此时**只报告、不删除**，交用户定夺。

## 6. 当前本地验收入口（R14）

从仓库根目录运行 `.\qa\_qa_task20\run20.ps1 -Phase local`。该入口把本轮报告放进新的 `qa/_qa_task20/runs/` 目录，依次检查规则/静态合同、两个包、Task18 文件闸门、Task19 纸媒浏览器回归、404 与保护哈希；任何失败都留在本轮记录里。Task18/19 历史断言数量是旧口径，不可作为 R14 通过标准。浏览器启动失败时，检查会如实失败/标为受限，不能以静态检查或旧报告替代。

单步调试可分别运行 `node qa/_qa_task20/core_tests.mjs`、`python qa/_qa_task20/verify20.py --phase story`（`binding`、`style`、`main-candidate`、`dual-target`、`static`）、以及 `python qa/_qa_task20/verify_packages20.py`。重建包后必须重跑包检查；不得把浏览器未测写成通过。

### 加稿后最容易红的四类，以及正确处置

| 红项长相 | 含义 | 处置 |
| --- | --- | --- |
| `Q/Q3/md-error-free`／`Q3/article-count==manifest` | 有 md 解析失败被丢弃，篇数与清单不符 | 改那篇 md 的字段／正文，**不要**去放宽篇数判据 |
| `F6/<页>`（段落数）／`F7/<页>`（逐段文本） | 渲染段落与 md 不一致 | 先看 md 是否多空行或段内回车；构建器不会自动分段 |
| `E8/order`／`E9/latest-order`／`RK3` | 首页最新区次序变了 | 白名单第 9–14 项**有两处、被两个机器各读一处，必须同改**：`plan/Task4-完成首页内容.md:292-297`（`verify_task18.mjs:200-206` 按 `/^[0-9]+\.\s+`([^`\n]+)`/gm` 逐字符取，行式 `N. \`文本\`` 一字节不能动）与 `plan/Task12…md:152`（`contract19.mjs:151-156` 读单行，`按序 14 项**：` 与行尾 `（其中` 是正则锚点）。再在 `plan/Task0` 记一行带日期的变更（含 `index.html` 新哈希与字节数）。只改一处必红 |
| `N/counts-html`／包数量不符 | main 三数应为 `10+N` 文件／`6+N` HTML／`11+N` ZIP 条目；preview 固定 `4／2／5` 且无文章 | 按 R14 分别运行 main 与 easteregg 目标的打包/独立核验；更新对应清单与上传指南。历史 Task19 中的旧数字仅作历史记录，不回写旧合同或手工改清单 |

## 7. 上传（用户本人）

1. 打开 Cloudflare Pages → 项目 `old-ns-news` → Direct Upload。
2. main 生产包拖 `deploy/site.zip`；彩蛋预览部署拖 `deploy/easteregg.zip` 到同一 Pages 项目的 `easteregg` 预览分支。每个目标分别核对对应的 `deploy/UPLOAD.md` 或 `deploy/EASTEREGG-UPLOAD.md`。
3. 上传面板里确认 **Auto-Minify、Rocket Loader、Bot Fight Mode、`.pages.dev` 口令保护**全部关闭——前两项会改写 JS，而我们核对的是原文件哈希。
4. main 核对文件 `10+N`、ZIP `11+N`、HTML `6+N`；preview 核对文件 4、ZIP 5、HTML 2。数量不符时停止并记录差异，不做补救式重传、不重跑构建。

## 8. 上传后把这一轮签上

用户上传两个目标后，按计划以 `.\qa\_qa_task20\run20.ps1 -Phase online` 执行只读复验。上传尚未发生时保持“待手工发布，线上未验证”；不要使用旧 `results-seg-*.json` 或线上报告冒充本轮结果。

## 9. 完工检查清单

- [ ] `content/articles/<slug>.md` 八键在白名单内、键序正确、无空值
- [ ] 正文无禁字符、无行首禁标记、`---` 只出现在 front-matter
- [ ] UTF-8 无 BOM／纯 LF／单个末尾换行
- [ ] main `python build/build.py --out Results` rc=0，且既有报纸页逐字节未漂移
- [ ] main 包文件 `10+N`／HTML `6+N`／ZIP `11+N`；preview 包文件 4／HTML 2／ZIP 5；两份上传指南与当前哈希一致
- [ ] Task20 的 `run20.ps1 -Phase local` 与独立包检查无 FAIL；Task18/19 历史断言总数仅作旧记录
- [ ] 首页三条若换人：`plan/Task4` 白名单与 `plan/Task0` 变更记录已同步
- [ ] 双击 `Results/index.html` 能离线打开、新稿在列表页与详情页都读得到
- [ ] 用户分别上传后：main 与 preview 的线上身份和资源哈希均由 `run20.ps1 -Phase online` 复验

## 10. 常见返工（本项目真实踩过）

- 把 `end_date` 当评论专用字段——R12 起它只看值形态，与 `column` 无关。
- 把电头按微信原话写成「自然选择号9月29**号**7时电」，`display_date` 填「9月29日」——构建**退出码 2**，条款 `Task13 §3 规则 8`：`display_date` 必须是本文渲染文本的子串（`build.py:443`），而 `MDATE_RE:72` 只收 `日`。入站时把"号"改成"日"是硬性要求，不是文风选择；既有先例 `**自然选择号9月18日7时电**`。
- 以为 `display_date` 可选就把它留空——**会进首页最新区前 3 的稿件它是必填**：`HOME_TAG_COUNTS:49`（`span:6`）与 `check_home_inner:677-683` 要求前三条各带日期节点，缺一个就**退出码 3**。只有排在第 4 位及以后、或不带 `date` 落到未分组的稿件才可以不显示日期。
- 期望值按栏目索引写死（`columns[i].articles[0]`）——一栏多稿就崩，一律按文章／全局序推导。
- 用 `getComputedStyle().color` 判已访问链接配色——实测不向子节点传播，必须截像素采样；且本机 headless 下删组件 `:visited` 不改绘制，该面由静态链（Task 18 的 `H13`）守。
- 变异台架钉 `#N` 发生序或字面日期／标题——加稿必错位，改按判据名前缀与被测对象自身推导。
- 手改 `Results/*.html` 图快——下一次构建覆盖，且 `M1/L1` 字节判据会红。
- 改了 `deploy/site.zip` 却没同步 `UPLOAD.md`——核对单是 `pack.py` 生成的，手写必然失真。
