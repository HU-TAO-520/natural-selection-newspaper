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

预期（N=6，2026-10-03 实测）：`rc=0`，输出目录里出现 `4+N` 个 `.html`——本轮 10 个（首页＋3 栏目页＋6 详情页）。
零副作用判据：**除首页与新增稿件所属栏目页外**，临时目录里每个文件都应与 `Results/` 同名文件逐字节相同。本轮实测漂移面正好两个：`index.html`（只有最新区第 2、3 行换文）与 `news-message.html`（多一条），五篇详情页 `cmp` 全 SAME。
**坑**：构建器**不产出** `styles.css`／`script.js`（样式包归 Task 16），临时目录里只有 HTML。用 `for f in Results/*; do cmp -s "$f" ".tmp-verify/$(basename $f)"` 逐文件比，会给这两个文件报**假 DIFF**（`cmp` 对不存在的文件返回非 0，看着像"样式包漂移"）。遍历**临时目录**的文件清单，或显式跳过这两个。

**只有试跑干净**才写正式产物：

```bash
python build/build.py --out Results
```

- `--out` 必填且不会自建目录；不带 `--out` 直接参数错误。
- 退出码含义：`0` 成功｜`2` 输入不合法（点名文件／行号／条款）｜`3` 构建器自检失败｜`4` 前置基线缺失或被篡改（例如 `qa/_qa_task13/baseline/*`、`expected-spec.json` 的哈希对不上）。
- 加稿后**必须**看三处是否会连带：首页最新区只渲染全局序前 3 条；`deploy/manifest.json` 的 `counts.articles` 会变；三个数字 `6+N／7+N／4+N` 随之变化。

## 5. 打包

```bash
python build/pack.py            # 等价于 all：manifest → zip → 自校验
python build/pack.py verify     # 只回验，不写盘
```

预期输出（N=6，2026-10-03 实测）：

```
已产出 deploy/site.zip：13 文件条目／0 目录条目／23468 字节 cbb41a508e27025eab9ba55265f77ad895af478aa0ea91b82963f27574ed57f3
已产出 deploy/manifest.json、deploy/UPLOAD.md：counts={'pages': 12, 'html': 10, 'config': 1, 'articles': 6}
```

（N=5 那轮是 12 条目／22191 字节 `e5d6307c…`／`{'pages': 11, 'html': 9, 'config': 1, 'articles': 5}`。）控制台中文会因 GBK 代码页显示成乱码，**认数字与哈希即可**，或先 `export PYTHONIOENCODING=utf-8`。

要点：zip 内条目时间戳被固定为 `(1980,1,1,0,0,0)`，所以**同一内容重打包必然得到同一 SHA-256**；比对包一律用哈希而不是"看起来一样"。`manifest.json`／`UPLOAD.md` 只进 `deploy/`，绝不进 `Results/` 也不进 zip。退出码 `4` = 发现清单外文件，此时**只报告、不删除**，交用户定夺。

## 6. 三道闸门（顺序固定，红就停在那一步）

```bash
python qa/_qa_task17/verify_pack.py                                   # 包形态：解包回验、条目属性、可复现
node qa/_qa_task18/probe_task18.mjs && node qa/_qa_task18/verify_task18.mjs   # 文件级：结构＋逐字符＋清单＋链接＋禁止项
QODER_PASS=all node qa/_qa_task19/cdp_regression19.mjs                # 渲染级：真实浏览器 17 段
node qa/_qa_task19/make_report19.mjs                                  # 报告由数据重出，勿手改
```

本轮（N=6，2026-10-03）实测基准，迁移后必须复现同数：

| 闸门 | 基准 |
| --- | --- |
| `verify_pack.py` | 52 条断言，FAIL 0，rc=0（**不随篇数变**，它核的是包形态） |
| `verify_task18.mjs` | **1515 条，PASS 1515／FAIL 0／PENDING 0**（N=5 时 1395；一篇 2 段新稿实测 +120：多一页详情页的 C/F/L/P 组＋首页换文＋栏目页换文。分组表见 `qa/_qa_task18/verify_report.md`） |
| `src_check.py`（由上一条内部先跑） | rc=0，JSON 里 `fail_count: 0`、`article_count: 6` |
| `cdp_regression19.mjs QODER_PASS=all` | 合计 3655、计分 **3589**、PENDING 0（合同下限 1400）。**上传前跑必然有 9 条 FAIL，全在 R-O 且只指向新增那一页**（线上还是 N=5，Pages 用首页冒充 404，实测 `身份命中=false`、`<title>` 变成《自然选择号》报社简介）——这 9 条是**时点项不是缺陷**，用户上传新包后转 FAIL 0。除此之外的任何 FAIL 才是缺陷 |
| 变异对照 | Task 18 全量 137 例全捕获；Task 19 12 例（有效 10、捕获 10、0 未捕获）。**加稿轮可暂不重跑**：137 例钉的是三篇迁移稿的字面量，只要没改那三篇就仍绿；一旦任一闸门红且指向判据本身，必须回来补两台差分 |

时间紧时可以只跑受影响分段：`QODER_PASS=load,nav,list,desktop,mobile,visual,visited-pixel`——但**每轮都要交出可直接上传的包**，少跑分段不等于放宽校验。

### 加稿后最容易红的四类，以及正确处置

| 红项长相 | 含义 | 处置 |
| --- | --- | --- |
| `Q/Q3/md-error-free`／`Q3/article-count==manifest` | 有 md 解析失败被丢弃，篇数与清单不符 | 改那篇 md 的字段／正文，**不要**去放宽篇数判据 |
| `F6/<页>`（段落数）／`F7/<页>`（逐段文本） | 渲染段落与 md 不一致 | 先看 md 是否多空行或段内回车；构建器不会自动分段 |
| `E8/order`／`E9/latest-order`／`RK3` | 首页最新区次序变了 | 白名单第 9–14 项**有两处、被两个机器各读一处，必须同改**：`plan/Task4-完成首页内容.md:292-297`（`verify_task18.mjs:200-206` 按 `/^[0-9]+\.\s+`([^`\n]+)`/gm` 逐字符取，行式 `N. \`文本\`` 一字节不能动）与 `plan/Task12…md:152`（`contract19.mjs:151-156` 读单行，`按序 14 项**：` 与行尾 `（其中` 是正则锚点）。再在 `plan/Task0` 记一行带日期的变更（含 `index.html` 新哈希与字节数）。只改一处必红 |
| `N/counts-html`／`RO7`／`RZ1` | 三个数字（`6+N`／`7+N`／`4+N`）与清单不符 | 重跑 `pack.py` 生成新 `manifest.json`，并把 `plan/Task19` 的三个数字行按新 N 换值。注意 `contract19.mjs:260` 是 `matchAll` + Map **同式取末次匹配**：`plan/Task19` 里凡是 `` `6 + N`（数字）`` 形态的地方都必须对齐，别留旧值。同一张表里 `:74`「HTML 子集 = `4+N` 张」与 `:76`「主导航路径 `4×(4+N)` 条」不被机器解析，但也要跟着换（N=6 → 10 张／40 条），否则下一轮把正常当异常 |

## 7. 上传（用户本人）

1. 打开 Cloudflare Pages → 项目 `old-ns-news` → Direct Upload。
2. 拖 **`deploy/site.zip` 这个文件本身**；不要拖目录，也不要拖根目录那个 `旧版Results-请不要上传！.zip`。
3. 上传面板里确认 **Auto-Minify、Rocket Loader、Bot Fight Mode、`.pages.dev` 口令保护**全部关闭——前两项会改写 `script.js`，而我们核对的正是原文件哈希。
4. 上传后按 `deploy/UPLOAD.md` **分别**核对三个数字：交付文件 `6+N`、zip 条目 `7+N`、Pages 后台 "Pages" 计数 `4+N`。数量不符当场中止并报告差异条目，不做补救式重传、不重跑构建。

## 8. 上传后把这一轮签上

```bash
# 1) 逐段：17 段全部按当前构建重跑。段名要同时给 QODER_PASS 和 QODER_TAG，
#    产物名才会是 results-seg-<段名>.json（consistency19 就按这个前缀找文件）
for s in load nav list desktop mobile tap tri interact cross zoom degrade content visited visited-pixel visual pressure online; do
  QODER_PASS=$s QODER_TAG=-seg-$s node qa/_qa_task19/cdp_regression19.mjs > .tmp-sign/$s.log 2>&1
  echo "== $s rc=$? :: $(grep -aE '^合计' .tmp-sign/$s.log | tail -1)"
done
# 2) all（一趟跑完 17 段，本机约 10 分钟；分段之间不要并发，会抢 CDP 端口）
QODER_PASS=all  node qa/_qa_task19/cdp_regression19.mjs        # 与逐段并集做键集差分用
# 3) 两段一致性 + 报告重出
node qa/_qa_task19/consistency19.mjs                            # all 键集 == 逐段并集，差集必须为空
node qa/_qa_task19/make_report19.mjs                            # report.md 重出，签署结论由数据决定
```

**加稿轮不能只跑 `online` + `all`**：`consistency19.mjs` 比的是键集（`判据ID § 页 § 视口 § 判据文字`，:13），要求 17 个 `results-seg-*.json` **全是本轮产物**；只要有一个还是上一轮的，新稿那页的逐页判据就掉进 `onlyInAll`，直接判不通过。R12 轮全量重跑的闭合值是 3162=3162，本轮（N=6）是 **3464=3464，只在 all 0／只在分段 0／状态漂移 0**。唯一刻意剔除的是 `RZ12`（断言总数下限，单段按定义达不到），两侧同时摘掉。

**`make_report19.mjs` 会引用 Task 18 的手写结论**：`contract19.mjs:59` 读 `qa/_qa_task18/report.md`，`:272` 用 `/(\d+) 条断言/` 取**首个匹配**（第 7 行总判定）。加稿让条数变了而那一行没换值，签署报告里就会印出过期的"前置闸门 1395 条"。所以先改那一行的条数（保留 provenance 括注），再按该文件 §11 的先例**追加一节**记差异与血缘（历史小节不重写），然后才跑 `make_report19.mjs`。

**变异台架（Task 18 的 137 例／Task 19 的 12 例）在加稿轮可以沿用上一批结论**，但必须写清血缘：总判定行的括注里点明"本轮未重跑、上批跑于何时"，并在追加小节里保留一句限定——判据本轮是净增的，上批 100% 捕获并不覆盖新增那部分。一旦触及三篇迁移稿或公共壳，必须连台一起重跑。

R-O 里最值钱的两条：清单内每页 200 **且该页 `<title>` 内容身份命中**（Pages 有 404/SPA 回退，"200"单独不构成证据）；线上 `styles.css`／`script.js` 的 SHA-256 等于清单值（这就是 Auto-Minify 真关着的证明）。

## 9. 完工检查清单

- [ ] `content/articles/<slug>.md` 八键在白名单内、键序正确、无空值
- [ ] 正文无禁字符、无行首禁标记、`---` 只出现在 front-matter
- [ ] UTF-8 无 BOM／纯 LF／单个末尾换行
- [ ] `python build/build.py --out Results` rc=0，且旧页面逐字节未漂移
- [ ] `python build/pack.py` 后 `site.zip` 哈希与条目数已更新，`UPLOAD.md` 三个数字一致
- [ ] `verify_pack.py`／`verify_task18.mjs`／`cdp_regression19.mjs` 全绿，条数与基准一致
- [ ] 首页三条若换人：`plan/Task4` 白名单与 `plan/Task0` 变更记录已同步
- [ ] 双击 `Results/index.html` 能离线打开、新稿在列表页与详情页都读得到
- [ ] 用户上传后：R-O 与两段一致性闭合，`report.md` 由生成器重出

## 10. 常见返工（本项目真实踩过）

- 把 `end_date` 当评论专用字段——R12 起它只看值形态，与 `column` 无关。
- 把电头按微信原话写成「自然选择号9月29**号**7时电」，`display_date` 填「9月29日」——构建**退出码 2**，条款 `Task13 §3 规则 8`：`display_date` 必须是本文渲染文本的子串（`build.py:443`），而 `MDATE_RE:72` 只收 `日`。入站时把"号"改成"日"是硬性要求，不是文风选择；既有先例 `**自然选择号9月18日7时电**`。
- 以为 `display_date` 可选就把它留空——**会进首页最新区前 3 的稿件它是必填**：`HOME_TAG_COUNTS:49`（`span:6`）与 `check_home_inner:677-683` 要求前三条各带日期节点，缺一个就**退出码 3**。只有排在第 4 位及以后、或不带 `date` 落到未分组的稿件才可以不显示日期。
- 期望值按栏目索引写死（`columns[i].articles[0]`）——一栏多稿就崩，一律按文章／全局序推导。
- 用 `getComputedStyle().color` 判已访问链接配色——实测不向子节点传播，必须截像素采样；且本机 headless 下删组件 `:visited` 不改绘制，该面由静态链（Task 18 的 `H13`）守。
- 变异台架钉 `#N` 发生序或字面日期／标题——加稿必错位，改按判据名前缀与被测对象自身推导。
- 手改 `Results/*.html` 图快——下一次构建覆盖，且 `M1/L1` 字节判据会红。
- 改了 `deploy/site.zip` 却没同步 `UPLOAD.md`——核对单是 `pack.py` 生成的，手写必然失真。
