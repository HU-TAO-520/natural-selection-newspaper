# Task 18 全站只读核验闸门报告（核验器机器输出）

- 核验时间：2026-10-02T08:27:02.776Z
- 被核验目录：C:\Users\weibo\Documents\语文报纸\Results（"页"=7 张 HTML，"文件"=9 个交付文件）
- 真值锚点：plan/Task1（素材哈希／逐段合同／§3 字符数）、plan/Task4（三段字面量／§DOM 结构验证／§可见内容白名单）、plan/Task0（§稳定接口总清单／§全局禁止项清单／§归档层新增禁项）、plan/Task12（R2 六壳与命名正则／§排序全序）、plan/Task13+Task12（Q 组字段表与格式合同）、deploy/manifest.json、content/、_qa_task13/{baseline,main_slices}、build/{shell.html,partials/home-intro.html}
- DOM 事实：C:\Users\weibo\Documents\语文报纸\_qa_task18\facts.json（__meta.generatedBy=probe_task18，逐页 sha256 绑定；M 组最先跑）
- 快照一致性（M）：已通过，其余组结论可用
- 断言总数：1149　PASS：1147　FAIL：2　PENDING：0

## 分组计数

| 组 | 条数 | PASS | FAIL | PENDING |
| --- | --- | --- | --- | --- |
| A | 64 | 64 | 0 | 0 |
| B | 4 | 4 | 0 | 0 |
| C | 266 | 266 | 0 | 0 |
| D | 37 | 37 | 0 | 0 |
| E | 47 | 45 | 2 | 0 |
| F | 144 | 144 | 0 | 0 |
| G | 76 | 76 | 0 | 0 |
| H | 74 | 74 | 0 | 0 |
| I | 14 | 14 | 0 | 0 |
| J | 33 | 33 | 0 | 0 |
| K | 12 | 12 | 0 | 0 |
| L | 98 | 98 | 0 | 0 |
| M | 26 | 26 | 0 | 0 |
| N | 66 | 66 | 0 | 0 |
| P | 53 | 53 | 0 | 0 |
| Q | 124 | 124 | 0 | 0 |
| R0 | 11 | 11 | 0 | 0 |

```text
[M0] PASS facts.__meta — resultsDir=C:\Users\weibo\Documents\语文报纸\Results generatedBy=probe_task18
[M1/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 快照哈希 == 目录实测 — 期望(快照)=a2dbf4aac57472e8 实际(磁盘)=a2dbf4aac57472e8
[M1b/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 快照字节数 == 目录实测 — 快照=8486 磁盘=8486
[M1/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 快照哈希 == 目录实测 — 期望(快照)=73ff75678c453bad 实际(磁盘)=73ff75678c453bad
[M1b/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 快照字节数 == 目录实测 — 快照=6962 磁盘=6962
[M1/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 快照哈希 == 目录实测 — 期望(快照)=66ae5826bbdf9829 实际(磁盘)=66ae5826bbdf9829
[M1b/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 快照字节数 == 目录实测 — 快照=3011 磁盘=3011
[M1/index.html] PASS index.html 快照哈希 == 目录实测 — 期望(快照)=475e02f8bbf195ca 实际(磁盘)=475e02f8bbf195ca
[M1b/index.html] PASS index.html 快照字节数 == 目录实测 — 快照=3635 磁盘=3635
[M1/news-commentary.html] PASS news-commentary.html 快照哈希 == 目录实测 — 期望(快照)=76aa950d2967b064 实际(磁盘)=76aa950d2967b064
[M1b/news-commentary.html] PASS news-commentary.html 快照字节数 == 目录实测 — 快照=2067 磁盘=2067
[M1/news-feature.html] PASS news-feature.html 快照哈希 == 目录实测 — 期望(快照)=485a8750d996bcba 实际(磁盘)=485a8750d996bcba
[M1b/news-feature.html] PASS news-feature.html 快照字节数 == 目录实测 — 快照=2049 磁盘=2049
[M1/news-message.html] PASS news-message.html 快照哈希 == 目录实测 — 期望(快照)=3a267591a4a976ef 实际(磁盘)=3a267591a4a976ef
[M1b/news-message.html] PASS news-message.html 快照字节数 == 目录实测 — 快照=2057 磁盘=2057
[M2/set] PASS 事实文件覆盖页集合 == manifest HTML 子集（无缺无多） — 快照=article-classroom-screen-upgrade.html,article-math-to-ai-learning.html,articl…lunteer.html,index.html,news-commentary.html,news-feature.html,news-message.html
[M2/count] PASS __meta 页数 == manifest.counts.html — 快照=7 counts.html=7
[M3/dir] PASS 探测目录 == 被核验目录（防拿别处快照混用） — 快照=C:\Users\weibo\Documents\语文报纸\Results 核验=C:\Users\weibo\Documents\语文报纸\Results
[M4/by] PASS __meta.generatedBy == 本包探针而非旧文件 — probe_task18
[M5/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 事实条目在场且 file 与页名一致 — article-classroom-screen-upgrade.html
[M5/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 事实条目在场且 file 与页名一致 — article-math-to-ai-learning.html
[M5/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 事实条目在场且 file 与页名一致 — article-school-course-volunteer.html
[M5/index.html] PASS index.html 事实条目在场且 file 与页名一致 — index.html
[M5/news-commentary.html] PASS news-commentary.html 事实条目在场且 file 与页名一致 — news-commentary.html
[M5/news-feature.html] PASS news-feature.html 事实条目在场且 file 与页名一致 — news-feature.html
[M5/news-message.html] PASS news-message.html 事实条目在场且 file 与页名一致 — news-message.html
[A1a/index.html] PASS Results/ 六壳命名精确（大小写逐字符）
[A1a/news-message.html] PASS Results/ 六壳命名精确（大小写逐字符）
[A1a/news-feature.html] PASS Results/ 六壳命名精确（大小写逐字符）
[A1a/news-commentary.html] PASS Results/ 六壳命名精确（大小写逐字符）
[A1a/styles.css] PASS Results/ 六壳命名精确（大小写逐字符）
[A1a/script.js] PASS Results/ 六壳命名精确（大小写逐字符）
[A1b/manifest-to-disk] PASS manifest.pages ⊆ Results/（磁盘不缺页）
[A1b/disk-to-manifest] PASS Results/ ⊆ manifest.pages（磁盘不多页，集合双向相等）
[A1b/sha/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html SHA-256 == manifest 登记值
[A1b/bytes/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 字节数 == manifest 登记值
[A1b/sha/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html SHA-256 == manifest 登记值
[A1b/bytes/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 字节数 == manifest 登记值
[A1b/sha/article-school-course-volunteer.html] PASS article-school-course-volunteer.html SHA-256 == manifest 登记值
[A1b/bytes/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 字节数 == manifest 登记值
[A1b/sha/index.html] PASS index.html SHA-256 == manifest 登记值
[A1b/bytes/index.html] PASS index.html 字节数 == manifest 登记值
[A1b/sha/news-commentary.html] PASS news-commentary.html SHA-256 == manifest 登记值
[A1b/bytes/news-commentary.html] PASS news-commentary.html 字节数 == manifest 登记值
[A1b/sha/news-feature.html] PASS news-feature.html SHA-256 == manifest 登记值
[A1b/bytes/news-feature.html] PASS news-feature.html 字节数 == manifest 登记值
[A1b/sha/news-message.html] PASS news-message.html SHA-256 == manifest 登记值
[A1b/bytes/news-message.html] PASS news-message.html 字节数 == manifest 登记值
[A1b/sha/script.js] PASS script.js SHA-256 == manifest 登记值
[A1b/bytes/script.js] PASS script.js 字节数 == manifest 登记值
[A1b/sha/styles.css] PASS styles.css SHA-256 == manifest 登记值
[A1b/bytes/styles.css] PASS styles.css 字节数 == manifest 登记值
[A1c/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 命名形态：壳名逐字符等值 或 详情页正则
[A1c/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 命名形态：壳名逐字符等值 或 详情页正则
[A1c/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 命名形态：壳名逐字符等值 或 详情页正则
[A1c/index.html] PASS index.html 命名形态：壳名逐字符等值 或 详情页正则
[A1c/news-commentary.html] PASS news-commentary.html 命名形态：壳名逐字符等值 或 详情页正则
[A1c/news-feature.html] PASS news-feature.html 命名形态：壳名逐字符等值 或 详情页正则
[A1c/news-message.html] PASS news-message.html 命名形态：壳名逐字符等值 或 详情页正则
[A1c/script.js] PASS script.js 命名形态：壳名逐字符等值 或 详情页正则
[A1c/styles.css] PASS styles.css 命名形态：壳名逐字符等值 或 详情页正则
[A1c/html-count] PASS manifest HTML 子集大小 == counts.html（"页"不等于"文件"）
[A1b/pages-count] PASS manifest.pages 条目数 == counts.pages（交付文件数 9）
[A1d/derived-in-manifest] PASS 六壳 ∪ content/ 独立推导 ⊆ manifest.pages（清单不缺）
[A1d/manifest-in-derived] PASS manifest.pages ⊆ 六壳 ∪ content/ 独立推导（清单不多）
[A1d/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 由 content/articles/<slug>.md 推导并登记（不读 Results/、不调构建器）
[A1d/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 由 content/articles/<slug>.md 推导并登记（不读 Results/、不调构建器）
[A1d/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 由 content/articles/<slug>.md 推导并登记（不读 Results/、不调构建器）
[A2/no-subdir] PASS Results/ 无子目录
[A2/no-banned-ext] PASS Results/ 无禁用扩展名/README/点文件/_headers
[A2/no-cache] PASS Results/ 无 __pycache__ 与包管理产物
[A3/doctype/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 首行
[A3/doctype/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 首行
[A3/doctype/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 首行
[A3/doctype/index.html] PASS index.html 首行
[A3/doctype/news-commentary.html] PASS news-commentary.html 首行
[A3/doctype/news-feature.html] PASS news-feature.html 首行
[A3/doctype/news-message.html] PASS news-message.html 首行
[A3/utf8] PASS 九交付文件为普通 UTF-8、无 BOM、无替换字符
[A4/count] PASS Materials/ 三份 Word
[A4/新闻消息.docx] PASS Materials/ 含 新闻消息.docx
[A4/新闻通讯.docx] PASS Materials/ 含 新闻通讯.docx
[A4/新闻评价.docx] PASS Materials/ 含 新闻评价.docx
[A5/Results] PASS Results/ 核验前基线 — 9 条目已登记，核验结束逐项比对
[A5/content] PASS content/ 核验前基线 — 6 条目已登记，核验结束逐项比对
[A5/build] PASS build/ 核验前基线 — 5 条目已登记，核验结束逐项比对
[A5/deploy] PASS deploy/ 核验前基线 — 4 条目已登记，核验结束逐项比对
[A5/Materials] PASS Materials/ 核验前基线 — 3 条目已登记，核验结束逐项比对
[A6] PASS Results/ 清单外条目必须报错而非被忽略（无排除逻辑）
[A6/nopolite] PASS A6 实现方式 — 排除清单为空：任何非 manifest 条目都进入 FAIL 集合，判据与 Task 17 preflight 一致
[B/新闻消息.docx] PASS Materials/新闻消息.docx SHA-256 == Task1 冻结值
[B/新闻通讯.docx] PASS Materials/新闻通讯.docx SHA-256 == Task1 冻结值
[B/新闻评价.docx] PASS Materials/新闻评价.docx SHA-256 == Task1 冻结值
[B4] PASS 三份素材 — 完整 64 位十六进制比较，大小写不敏感，未以前缀/字节数/mtime 代替
[C0/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html DOM 事实可用（快照绑定后该页可解析）
[C1/article-classroom-screen-upgrade.html/lang] PASS article-classroom-screen-upgrade.html <html lang>
[C1/article-classroom-screen-upgrade.html/no-js] PASS article-classroom-screen-upgrade.html <html class> 源码不预写 js
[C1/article-classroom-screen-upgrade.html/runtime] PASS article-classroom-screen-upgrade.html 运行时 <html class>（渐进增强前提）
[C2/article-classroom-screen-upgrade.html/charset] PASS article-classroom-screen-upgrade.html meta[charset] 数量
[C2/article-classroom-screen-upgrade.html/charsetval] PASS article-classroom-screen-upgrade.html meta charset 值
[C2/article-classroom-screen-upgrade.html/viewport] PASS article-classroom-screen-upgrade.html viewport 数量
[C2/article-classroom-screen-upgrade.html/vpval] PASS article-classroom-screen-upgrade.html viewport 内容
[C2/article-classroom-screen-upgrade.html/titleN] PASS article-classroom-screen-upgrade.html <title> 数量
[C3/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html <title> 逐字 == 扩展矩阵主体 + 全角｜后缀
[C3b/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 全角｜后缀位于 <title> 末尾
[C4/article-classroom-screen-upgrade.html/css] PASS article-classroom-screen-upgrade.html 样式引用
[C4/article-classroom-screen-upgrade.html/js] PASS article-classroom-screen-upgrade.html 脚本引用
[C4/article-classroom-screen-upgrade.html/inline] PASS article-classroom-screen-upgrade.html 内联/事件/base/style 属性
[C4/article-classroom-screen-upgrade.html/noregex] PASS article-classroom-screen-upgrade.html 源码禁用模式
[C5/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html C5 == .skip-link 断言（母本 :210，不得与 C6 混称）
[C6/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html C6 公共壳节点数量（nav === 1 未放宽）
[C6/article-classroom-screen-upgrade.html/total] PASS article-classroom-screen-upgrade.html 全页 <nav> 标签总数 == 1（R3 未新增容器标签）
[C6/article-classroom-screen-upgrade.html/section] PASS article-classroom-screen-upgrade.html <section> 数 == Task4 R4 值（首页 3／其余 0；最新区不是 section）
[C6/article-classroom-screen-upgrade.html/nest] PASS article-classroom-screen-upgrade.html .site-header__inner 子节点顺序
[C6/article-classroom-screen-upgrade.html/mast] PASS article-classroom-screen-upgrade.html 报头链接
[C6/article-classroom-screen-upgrade.html/btn] PASS article-classroom-screen-upgrade.html 菜单按钮
[C6/article-classroom-screen-upgrade.html/nav] PASS article-classroom-screen-upgrade.html 导航元素
[C7/article-classroom-screen-upgrade.html/controls] PASS article-classroom-screen-upgrade.html #nav-toggle[aria-controls]
[C7/article-classroom-screen-upgrade.html/expanded] PASS article-classroom-screen-upgrade.html #nav-toggle[aria-expanded] 初值
[C7/article-classroom-screen-upgrade.html/expanded-src] PASS article-classroom-screen-upgrade.html 源码 #nav-toggle[aria-expanded]
[C7/article-classroom-screen-upgrade.html/icon] PASS article-classroom-screen-upgrade.html .nav-toggle__icon
[C7/article-classroom-screen-upgrade.html/text] PASS article-classroom-screen-upgrade.html .nav-toggle__text
[C8/article-classroom-screen-upgrade.html/hidden] PASS article-classroom-screen-upgrade.html 导航源码
[C8/article-classroom-screen-upgrade.html/items] PASS article-classroom-screen-upgrade.html .site-navigation__list 子项
[C9/article-classroom-screen-upgrade.html/main] PASS article-classroom-screen-upgrade.html main
[C9/article-classroom-screen-upgrade.html/h1] PASS article-classroom-screen-upgrade.html <h1> 数量（扩展矩阵：每页恰 1）
[C9/article-classroom-screen-upgrade.html/h1cls] PASS article-classroom-screen-upgrade.html <h1> class
[C9/article-classroom-screen-upgrade.html/h1text] PASS article-classroom-screen-upgrade.html <h1> textContent == 矩阵主体（｜后缀不进 <h1>）
[C10/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html ID 唯一性
[C11/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 该页应含的已注册 ID 在场
[C12/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html DOM 无 data-*/datetime/on* 属性
[C13/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 无 HTML 注释（字段名泄漏的常见盲区）
[C0/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html DOM 事实可用（快照绑定后该页可解析）
[C1/article-math-to-ai-learning.html/lang] PASS article-math-to-ai-learning.html <html lang>
[C1/article-math-to-ai-learning.html/no-js] PASS article-math-to-ai-learning.html <html class> 源码不预写 js
[C1/article-math-to-ai-learning.html/runtime] PASS article-math-to-ai-learning.html 运行时 <html class>（渐进增强前提）
[C2/article-math-to-ai-learning.html/charset] PASS article-math-to-ai-learning.html meta[charset] 数量
[C2/article-math-to-ai-learning.html/charsetval] PASS article-math-to-ai-learning.html meta charset 值
[C2/article-math-to-ai-learning.html/viewport] PASS article-math-to-ai-learning.html viewport 数量
[C2/article-math-to-ai-learning.html/vpval] PASS article-math-to-ai-learning.html viewport 内容
[C2/article-math-to-ai-learning.html/titleN] PASS article-math-to-ai-learning.html <title> 数量
[C3/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html <title> 逐字 == 扩展矩阵主体 + 全角｜后缀
[C3b/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 全角｜后缀位于 <title> 末尾
[C4/article-math-to-ai-learning.html/css] PASS article-math-to-ai-learning.html 样式引用
[C4/article-math-to-ai-learning.html/js] PASS article-math-to-ai-learning.html 脚本引用
[C4/article-math-to-ai-learning.html/inline] PASS article-math-to-ai-learning.html 内联/事件/base/style 属性
[C4/article-math-to-ai-learning.html/noregex] PASS article-math-to-ai-learning.html 源码禁用模式
[C5/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html C5 == .skip-link 断言（母本 :210，不得与 C6 混称）
[C6/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html C6 公共壳节点数量（nav === 1 未放宽）
[C6/article-math-to-ai-learning.html/total] PASS article-math-to-ai-learning.html 全页 <nav> 标签总数 == 1（R3 未新增容器标签）
[C6/article-math-to-ai-learning.html/section] PASS article-math-to-ai-learning.html <section> 数 == Task4 R4 值（首页 3／其余 0；最新区不是 section）
[C6/article-math-to-ai-learning.html/nest] PASS article-math-to-ai-learning.html .site-header__inner 子节点顺序
[C6/article-math-to-ai-learning.html/mast] PASS article-math-to-ai-learning.html 报头链接
[C6/article-math-to-ai-learning.html/btn] PASS article-math-to-ai-learning.html 菜单按钮
[C6/article-math-to-ai-learning.html/nav] PASS article-math-to-ai-learning.html 导航元素
[C7/article-math-to-ai-learning.html/controls] PASS article-math-to-ai-learning.html #nav-toggle[aria-controls]
[C7/article-math-to-ai-learning.html/expanded] PASS article-math-to-ai-learning.html #nav-toggle[aria-expanded] 初值
[C7/article-math-to-ai-learning.html/expanded-src] PASS article-math-to-ai-learning.html 源码 #nav-toggle[aria-expanded]
[C7/article-math-to-ai-learning.html/icon] PASS article-math-to-ai-learning.html .nav-toggle__icon
[C7/article-math-to-ai-learning.html/text] PASS article-math-to-ai-learning.html .nav-toggle__text
[C8/article-math-to-ai-learning.html/hidden] PASS article-math-to-ai-learning.html 导航源码
[C8/article-math-to-ai-learning.html/items] PASS article-math-to-ai-learning.html .site-navigation__list 子项
[C9/article-math-to-ai-learning.html/main] PASS article-math-to-ai-learning.html main
[C9/article-math-to-ai-learning.html/h1] PASS article-math-to-ai-learning.html <h1> 数量（扩展矩阵：每页恰 1）
[C9/article-math-to-ai-learning.html/h1cls] PASS article-math-to-ai-learning.html <h1> class
[C9/article-math-to-ai-learning.html/h1text] PASS article-math-to-ai-learning.html <h1> textContent == 矩阵主体（｜后缀不进 <h1>）
[C10/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html ID 唯一性
[C11/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 该页应含的已注册 ID 在场
[C12/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html DOM 无 data-*/datetime/on* 属性
[C13/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 无 HTML 注释（字段名泄漏的常见盲区）
[C0/article-school-course-volunteer.html] PASS article-school-course-volunteer.html DOM 事实可用（快照绑定后该页可解析）
[C1/article-school-course-volunteer.html/lang] PASS article-school-course-volunteer.html <html lang>
[C1/article-school-course-volunteer.html/no-js] PASS article-school-course-volunteer.html <html class> 源码不预写 js
[C1/article-school-course-volunteer.html/runtime] PASS article-school-course-volunteer.html 运行时 <html class>（渐进增强前提）
[C2/article-school-course-volunteer.html/charset] PASS article-school-course-volunteer.html meta[charset] 数量
[C2/article-school-course-volunteer.html/charsetval] PASS article-school-course-volunteer.html meta charset 值
[C2/article-school-course-volunteer.html/viewport] PASS article-school-course-volunteer.html viewport 数量
[C2/article-school-course-volunteer.html/vpval] PASS article-school-course-volunteer.html viewport 内容
[C2/article-school-course-volunteer.html/titleN] PASS article-school-course-volunteer.html <title> 数量
[C3/article-school-course-volunteer.html] PASS article-school-course-volunteer.html <title> 逐字 == 扩展矩阵主体 + 全角｜后缀
[C3b/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 全角｜后缀位于 <title> 末尾
[C4/article-school-course-volunteer.html/css] PASS article-school-course-volunteer.html 样式引用
[C4/article-school-course-volunteer.html/js] PASS article-school-course-volunteer.html 脚本引用
[C4/article-school-course-volunteer.html/inline] PASS article-school-course-volunteer.html 内联/事件/base/style 属性
[C4/article-school-course-volunteer.html/noregex] PASS article-school-course-volunteer.html 源码禁用模式
[C5/article-school-course-volunteer.html] PASS article-school-course-volunteer.html C5 == .skip-link 断言（母本 :210，不得与 C6 混称）
[C6/article-school-course-volunteer.html] PASS article-school-course-volunteer.html C6 公共壳节点数量（nav === 1 未放宽）
[C6/article-school-course-volunteer.html/total] PASS article-school-course-volunteer.html 全页 <nav> 标签总数 == 1（R3 未新增容器标签）
[C6/article-school-course-volunteer.html/section] PASS article-school-course-volunteer.html <section> 数 == Task4 R4 值（首页 3／其余 0；最新区不是 section）
[C6/article-school-course-volunteer.html/nest] PASS article-school-course-volunteer.html .site-header__inner 子节点顺序
[C6/article-school-course-volunteer.html/mast] PASS article-school-course-volunteer.html 报头链接
[C6/article-school-course-volunteer.html/btn] PASS article-school-course-volunteer.html 菜单按钮
[C6/article-school-course-volunteer.html/nav] PASS article-school-course-volunteer.html 导航元素
[C7/article-school-course-volunteer.html/controls] PASS article-school-course-volunteer.html #nav-toggle[aria-controls]
[C7/article-school-course-volunteer.html/expanded] PASS article-school-course-volunteer.html #nav-toggle[aria-expanded] 初值
[C7/article-school-course-volunteer.html/expanded-src] PASS article-school-course-volunteer.html 源码 #nav-toggle[aria-expanded]
[C7/article-school-course-volunteer.html/icon] PASS article-school-course-volunteer.html .nav-toggle__icon
[C7/article-school-course-volunteer.html/text] PASS article-school-course-volunteer.html .nav-toggle__text
[C8/article-school-course-volunteer.html/hidden] PASS article-school-course-volunteer.html 导航源码
[C8/article-school-course-volunteer.html/items] PASS article-school-course-volunteer.html .site-navigation__list 子项
[C9/article-school-course-volunteer.html/main] PASS article-school-course-volunteer.html main
[C9/article-school-course-volunteer.html/h1] PASS article-school-course-volunteer.html <h1> 数量（扩展矩阵：每页恰 1）
[C9/article-school-course-volunteer.html/h1cls] PASS article-school-course-volunteer.html <h1> class
[C9/article-school-course-volunteer.html/h1text] PASS article-school-course-volunteer.html <h1> textContent == 矩阵主体（｜后缀不进 <h1>）
[C10/article-school-course-volunteer.html] PASS article-school-course-volunteer.html ID 唯一性
[C11/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 该页应含的已注册 ID 在场
[C12/article-school-course-volunteer.html] PASS article-school-course-volunteer.html DOM 无 data-*/datetime/on* 属性
[C13/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 无 HTML 注释（字段名泄漏的常见盲区）
[C0/index.html] PASS index.html DOM 事实可用（快照绑定后该页可解析）
[C1/index.html/lang] PASS index.html <html lang>
[C1/index.html/no-js] PASS index.html <html class> 源码不预写 js
[C1/index.html/runtime] PASS index.html 运行时 <html class>（渐进增强前提）
[C2/index.html/charset] PASS index.html meta[charset] 数量
[C2/index.html/charsetval] PASS index.html meta charset 值
[C2/index.html/viewport] PASS index.html viewport 数量
[C2/index.html/vpval] PASS index.html viewport 内容
[C2/index.html/titleN] PASS index.html <title> 数量
[C3/index.html] PASS index.html <title> 逐字 == 扩展矩阵主体 + 全角｜后缀
[C3b/index.html] PASS index.html 全角｜后缀位于 <title> 末尾
[C4/index.html/css] PASS index.html 样式引用
[C4/index.html/js] PASS index.html 脚本引用
[C4/index.html/inline] PASS index.html 内联/事件/base/style 属性
[C4/index.html/noregex] PASS index.html 源码禁用模式
[C5/index.html] PASS index.html C5 == .skip-link 断言（母本 :210，不得与 C6 混称）
[C6/index.html] PASS index.html C6 公共壳节点数量（nav === 1 未放宽）
[C6/index.html/total] PASS index.html 全页 <nav> 标签总数 == 1（R3 未新增容器标签）
[C6/index.html/section] PASS index.html <section> 数 == Task4 R4 值（首页 3／其余 0；最新区不是 section）
[C6/index.html/nest] PASS index.html .site-header__inner 子节点顺序
[C6/index.html/mast] PASS index.html 报头链接
[C6/index.html/btn] PASS index.html 菜单按钮
[C6/index.html/nav] PASS index.html 导航元素
[C7/index.html/controls] PASS index.html #nav-toggle[aria-controls]
[C7/index.html/expanded] PASS index.html #nav-toggle[aria-expanded] 初值
[C7/index.html/expanded-src] PASS index.html 源码 #nav-toggle[aria-expanded]
[C7/index.html/icon] PASS index.html .nav-toggle__icon
[C7/index.html/text] PASS index.html .nav-toggle__text
[C8/index.html/hidden] PASS index.html 导航源码
[C8/index.html/items] PASS index.html .site-navigation__list 子项
[C9/index.html/main] PASS index.html main
[C9/index.html/h1] PASS index.html <h1> 数量（扩展矩阵：每页恰 1）
[C9/index.html/h1cls] PASS index.html <h1> class
[C9/index.html/h1text] PASS index.html <h1> textContent == 矩阵主体（｜后缀不进 <h1>）
[C10/index.html] PASS index.html ID 唯一性
[C11/index.html] PASS index.html 该页应含的已注册 ID 在场
[C12/index.html] PASS index.html DOM 无 data-*/datetime/on* 属性
[C13/index.html] PASS index.html 无 HTML 注释（字段名泄漏的常见盲区）
[C0/news-commentary.html] PASS news-commentary.html DOM 事实可用（快照绑定后该页可解析）
[C1/news-commentary.html/lang] PASS news-commentary.html <html lang>
[C1/news-commentary.html/no-js] PASS news-commentary.html <html class> 源码不预写 js
[C1/news-commentary.html/runtime] PASS news-commentary.html 运行时 <html class>（渐进增强前提）
[C2/news-commentary.html/charset] PASS news-commentary.html meta[charset] 数量
[C2/news-commentary.html/charsetval] PASS news-commentary.html meta charset 值
[C2/news-commentary.html/viewport] PASS news-commentary.html viewport 数量
[C2/news-commentary.html/vpval] PASS news-commentary.html viewport 内容
[C2/news-commentary.html/titleN] PASS news-commentary.html <title> 数量
[C3/news-commentary.html] PASS news-commentary.html <title> 逐字 == 扩展矩阵主体 + 全角｜后缀
[C3b/news-commentary.html] PASS news-commentary.html 全角｜后缀位于 <title> 末尾
[C4/news-commentary.html/css] PASS news-commentary.html 样式引用
[C4/news-commentary.html/js] PASS news-commentary.html 脚本引用
[C4/news-commentary.html/inline] PASS news-commentary.html 内联/事件/base/style 属性
[C4/news-commentary.html/noregex] PASS news-commentary.html 源码禁用模式
[C5/news-commentary.html] PASS news-commentary.html C5 == .skip-link 断言（母本 :210，不得与 C6 混称）
[C6/news-commentary.html] PASS news-commentary.html C6 公共壳节点数量（nav === 1 未放宽）
[C6/news-commentary.html/total] PASS news-commentary.html 全页 <nav> 标签总数 == 1（R3 未新增容器标签）
[C6/news-commentary.html/section] PASS news-commentary.html <section> 数 == Task4 R4 值（首页 3／其余 0；最新区不是 section）
[C6/news-commentary.html/nest] PASS news-commentary.html .site-header__inner 子节点顺序
[C6/news-commentary.html/mast] PASS news-commentary.html 报头链接
[C6/news-commentary.html/btn] PASS news-commentary.html 菜单按钮
[C6/news-commentary.html/nav] PASS news-commentary.html 导航元素
[C7/news-commentary.html/controls] PASS news-commentary.html #nav-toggle[aria-controls]
[C7/news-commentary.html/expanded] PASS news-commentary.html #nav-toggle[aria-expanded] 初值
[C7/news-commentary.html/expanded-src] PASS news-commentary.html 源码 #nav-toggle[aria-expanded]
[C7/news-commentary.html/icon] PASS news-commentary.html .nav-toggle__icon
[C7/news-commentary.html/text] PASS news-commentary.html .nav-toggle__text
[C8/news-commentary.html/hidden] PASS news-commentary.html 导航源码
[C8/news-commentary.html/items] PASS news-commentary.html .site-navigation__list 子项
[C9/news-commentary.html/main] PASS news-commentary.html main
[C9/news-commentary.html/h1] PASS news-commentary.html <h1> 数量（扩展矩阵：每页恰 1）
[C9/news-commentary.html/h1cls] PASS news-commentary.html <h1> class
[C9/news-commentary.html/h1text] PASS news-commentary.html <h1> textContent == 矩阵主体（｜后缀不进 <h1>）
[C10/news-commentary.html] PASS news-commentary.html ID 唯一性
[C11/news-commentary.html] PASS news-commentary.html 该页应含的已注册 ID 在场
[C12/news-commentary.html] PASS news-commentary.html DOM 无 data-*/datetime/on* 属性
[C13/news-commentary.html] PASS news-commentary.html 无 HTML 注释（字段名泄漏的常见盲区）
[C0/news-feature.html] PASS news-feature.html DOM 事实可用（快照绑定后该页可解析）
[C1/news-feature.html/lang] PASS news-feature.html <html lang>
[C1/news-feature.html/no-js] PASS news-feature.html <html class> 源码不预写 js
[C1/news-feature.html/runtime] PASS news-feature.html 运行时 <html class>（渐进增强前提）
[C2/news-feature.html/charset] PASS news-feature.html meta[charset] 数量
[C2/news-feature.html/charsetval] PASS news-feature.html meta charset 值
[C2/news-feature.html/viewport] PASS news-feature.html viewport 数量
[C2/news-feature.html/vpval] PASS news-feature.html viewport 内容
[C2/news-feature.html/titleN] PASS news-feature.html <title> 数量
[C3/news-feature.html] PASS news-feature.html <title> 逐字 == 扩展矩阵主体 + 全角｜后缀
[C3b/news-feature.html] PASS news-feature.html 全角｜后缀位于 <title> 末尾
[C4/news-feature.html/css] PASS news-feature.html 样式引用
[C4/news-feature.html/js] PASS news-feature.html 脚本引用
[C4/news-feature.html/inline] PASS news-feature.html 内联/事件/base/style 属性
[C4/news-feature.html/noregex] PASS news-feature.html 源码禁用模式
[C5/news-feature.html] PASS news-feature.html C5 == .skip-link 断言（母本 :210，不得与 C6 混称）
[C6/news-feature.html] PASS news-feature.html C6 公共壳节点数量（nav === 1 未放宽）
[C6/news-feature.html/total] PASS news-feature.html 全页 <nav> 标签总数 == 1（R3 未新增容器标签）
[C6/news-feature.html/section] PASS news-feature.html <section> 数 == Task4 R4 值（首页 3／其余 0；最新区不是 section）
[C6/news-feature.html/nest] PASS news-feature.html .site-header__inner 子节点顺序
[C6/news-feature.html/mast] PASS news-feature.html 报头链接
[C6/news-feature.html/btn] PASS news-feature.html 菜单按钮
[C6/news-feature.html/nav] PASS news-feature.html 导航元素
[C7/news-feature.html/controls] PASS news-feature.html #nav-toggle[aria-controls]
[C7/news-feature.html/expanded] PASS news-feature.html #nav-toggle[aria-expanded] 初值
[C7/news-feature.html/expanded-src] PASS news-feature.html 源码 #nav-toggle[aria-expanded]
[C7/news-feature.html/icon] PASS news-feature.html .nav-toggle__icon
[C7/news-feature.html/text] PASS news-feature.html .nav-toggle__text
[C8/news-feature.html/hidden] PASS news-feature.html 导航源码
[C8/news-feature.html/items] PASS news-feature.html .site-navigation__list 子项
[C9/news-feature.html/main] PASS news-feature.html main
[C9/news-feature.html/h1] PASS news-feature.html <h1> 数量（扩展矩阵：每页恰 1）
[C9/news-feature.html/h1cls] PASS news-feature.html <h1> class
[C9/news-feature.html/h1text] PASS news-feature.html <h1> textContent == 矩阵主体（｜后缀不进 <h1>）
[C10/news-feature.html] PASS news-feature.html ID 唯一性
[C11/news-feature.html] PASS news-feature.html 该页应含的已注册 ID 在场
[C12/news-feature.html] PASS news-feature.html DOM 无 data-*/datetime/on* 属性
[C13/news-feature.html] PASS news-feature.html 无 HTML 注释（字段名泄漏的常见盲区）
[C0/news-message.html] PASS news-message.html DOM 事实可用（快照绑定后该页可解析）
[C1/news-message.html/lang] PASS news-message.html <html lang>
[C1/news-message.html/no-js] PASS news-message.html <html class> 源码不预写 js
[C1/news-message.html/runtime] PASS news-message.html 运行时 <html class>（渐进增强前提）
[C2/news-message.html/charset] PASS news-message.html meta[charset] 数量
[C2/news-message.html/charsetval] PASS news-message.html meta charset 值
[C2/news-message.html/viewport] PASS news-message.html viewport 数量
[C2/news-message.html/vpval] PASS news-message.html viewport 内容
[C2/news-message.html/titleN] PASS news-message.html <title> 数量
[C3/news-message.html] PASS news-message.html <title> 逐字 == 扩展矩阵主体 + 全角｜后缀
[C3b/news-message.html] PASS news-message.html 全角｜后缀位于 <title> 末尾
[C4/news-message.html/css] PASS news-message.html 样式引用
[C4/news-message.html/js] PASS news-message.html 脚本引用
[C4/news-message.html/inline] PASS news-message.html 内联/事件/base/style 属性
[C4/news-message.html/noregex] PASS news-message.html 源码禁用模式
[C5/news-message.html] PASS news-message.html C5 == .skip-link 断言（母本 :210，不得与 C6 混称）
[C6/news-message.html] PASS news-message.html C6 公共壳节点数量（nav === 1 未放宽）
[C6/news-message.html/total] PASS news-message.html 全页 <nav> 标签总数 == 1（R3 未新增容器标签）
[C6/news-message.html/section] PASS news-message.html <section> 数 == Task4 R4 值（首页 3／其余 0；最新区不是 section）
[C6/news-message.html/nest] PASS news-message.html .site-header__inner 子节点顺序
[C6/news-message.html/mast] PASS news-message.html 报头链接
[C6/news-message.html/btn] PASS news-message.html 菜单按钮
[C6/news-message.html/nav] PASS news-message.html 导航元素
[C7/news-message.html/controls] PASS news-message.html #nav-toggle[aria-controls]
[C7/news-message.html/expanded] PASS news-message.html #nav-toggle[aria-expanded] 初值
[C7/news-message.html/expanded-src] PASS news-message.html 源码 #nav-toggle[aria-expanded]
[C7/news-message.html/icon] PASS news-message.html .nav-toggle__icon
[C7/news-message.html/text] PASS news-message.html .nav-toggle__text
[C8/news-message.html/hidden] PASS news-message.html 导航源码
[C8/news-message.html/items] PASS news-message.html .site-navigation__list 子项
[C9/news-message.html/main] PASS news-message.html main
[C9/news-message.html/h1] PASS news-message.html <h1> 数量（扩展矩阵：每页恰 1）
[C9/news-message.html/h1cls] PASS news-message.html <h1> class
[C9/news-message.html/h1text] PASS news-message.html <h1> textContent == 矩阵主体（｜后缀不进 <h1>）
[C10/news-message.html] PASS news-message.html ID 唯一性
[C11/news-message.html] PASS news-message.html 该页应含的已注册 ID 在场
[C12/news-message.html] PASS news-message.html DOM 无 data-*/datetime/on* 属性
[C13/news-message.html] PASS news-message.html 无 HTML 注释（字段名泄漏的常见盲区）
[D1/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 导航四项文字/目标/顺序
[D1/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 导航四项文字/目标/顺序
[D1/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 导航四项文字/目标/顺序
[D1/index.html] PASS index.html 导航四项文字/目标/顺序
[D1/news-commentary.html] PASS news-commentary.html 导航四项文字/目标/顺序
[D1/news-feature.html] PASS news-feature.html 导航四项文字/目标/顺序
[D1/news-message.html] PASS news-message.html 导航四项文字/目标/顺序
[D2/count] PASS 主导航链接总数 == 7 页 × 4（P4 的 28 条同源）
[D2/target] PASS 28 条导航目标
[D3/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 唯一 aria-current="page" 归属
[D3b/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 当前项 href（详情页指向所属栏目页）
[D4/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 其余链接/报头无 aria-current；仅 <a> 值为 page
[D4/article-classroom-screen-upgrade.html/noli] PASS article-classroom-screen-upgrade.html <li>/<nav> 无 aria-current
[D3/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 唯一 aria-current="page" 归属
[D3b/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 当前项 href（详情页指向所属栏目页）
[D4/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 其余链接/报头无 aria-current；仅 <a> 值为 page
[D4/article-math-to-ai-learning.html/noli] PASS article-math-to-ai-learning.html <li>/<nav> 无 aria-current
[D3/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 唯一 aria-current="page" 归属
[D3b/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 当前项 href（详情页指向所属栏目页）
[D4/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 其余链接/报头无 aria-current；仅 <a> 值为 page
[D4/article-school-course-volunteer.html/noli] PASS article-school-course-volunteer.html <li>/<nav> 无 aria-current
[D3/index.html] PASS index.html 唯一 aria-current="page" 归属
[D3b/index.html] PASS index.html 当前项 href（详情页指向所属栏目页）
[D4/index.html] PASS index.html 其余链接/报头无 aria-current；仅 <a> 值为 page
[D4/index.html/noli] PASS index.html <li>/<nav> 无 aria-current
[D3/news-commentary.html] PASS news-commentary.html 唯一 aria-current="page" 归属
[D3b/news-commentary.html] PASS news-commentary.html 当前项 href（详情页指向所属栏目页）
[D4/news-commentary.html] PASS news-commentary.html 其余链接/报头无 aria-current；仅 <a> 值为 page
[D4/news-commentary.html/noli] PASS news-commentary.html <li>/<nav> 无 aria-current
[D3/news-feature.html] PASS news-feature.html 唯一 aria-current="page" 归属
[D3b/news-feature.html] PASS news-feature.html 当前项 href（详情页指向所属栏目页）
[D4/news-feature.html] PASS news-feature.html 其余链接/报头无 aria-current；仅 <a> 值为 page
[D4/news-feature.html/noli] PASS news-feature.html <li>/<nav> 无 aria-current
[D3/news-message.html] PASS news-message.html 唯一 aria-current="page" 归属
[D3b/news-message.html] PASS news-message.html 当前项 href（详情页指向所属栏目页）
[D4/news-message.html] PASS news-message.html 其余链接/报头无 aria-current；仅 <a> 值为 page
[D4/news-message.html/noli] PASS news-message.html <li>/<nav> 无 aria-current
[K1/head] PASS 七页（可得页）<head> 规范化后一致
[K1/shell] PASS 七页（可得页）body（除 main）规范化后一致
[K1/html] PASS 七页 <html> 属性一致
[K2] PASS 七页 body 子元素序列一致
[K2/main/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html <main> 直接子元素签名（首页取 Task4 R4，列表/详情取注册表与详情页模板）
[K2/main/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html <main> 直接子元素签名（首页取 Task4 R4，列表/详情取注册表与详情页模板）
[K2/main/article-school-course-volunteer.html] PASS article-school-course-volunteer.html <main> 直接子元素签名（首页取 Task4 R4，列表/详情取注册表与详情页模板）
[K2/main/index.html] PASS index.html <main> 直接子元素签名（首页取 Task4 R4，列表/详情取注册表与详情页模板）
[K2/main/news-commentary.html] PASS news-commentary.html <main> 直接子元素签名（首页取 Task4 R4，列表/详情取注册表与详情页模板）
[K2/main/news-feature.html] PASS news-feature.html <main> 直接子元素签名（首页取 Task4 R4，列表/详情取注册表与详情页模板）
[K2/main/news-message.html] PASS news-message.html <main> 直接子元素签名（首页取 Task4 R4，列表/详情取注册表与详情页模板）
[K3] PASS K3 页面独有结构
[E1/count] PASS index.html #main-content 直接元素子节点数（R4：三个）
[E1/order] PASS index.html 直接子元素顺序
[E1/h1] PASS index.html h1 文本 == 白名单第 1 项
[E2] PASS index.html 区块数量（.home-section 仍为 3，R3）
[E2/order] PASS index.html 三区块顺序
[E3] PASS index.html .home-section 子节点
[E4/ids] PASS index.html h2 id 顺序
[E4/labelledby] PASS index.html aria-labelledby
[E4/dup] PASS index.html 标题 ID 唯一
[E4/latest] PASS index.html div.home-latest 容器（R3/R8）
[E4/latest-not-nav] PASS index.html 最新区不是 nav/section/.home-section（R3）
[E4/latest-ul] PASS index.html 最新区恰 1 个 ul.home-latest__list
[E5] PASS index.html 标题层级（R4：1 个 h1 + 4 个 h2，总数 5）
[E6/P_ORIGIN] PASS index.html 第 1 段（名称由来）逐字符
[E6/P_WORK] PASS index.html 第 2 段（主要工作与报道方向）逐字符
[E6/P_FOUNDED] PASS index.html 第 3 段（成立时间）逐字符
[E6/all] PASS E6 汇总
[E6/len] PASS index.html 三段字符数 == Task4 冻结值长度
[E6/punct] PASS index.html 三段标点与空格
[E6/third-new] PASS index.html 第三条为 R7 新句且不含公元年份
[E7] PASS index.html 未替换记号
[E8/14] PASS index.html 可见内容白名单条数 == 14（R9 无条件，无收缩分支）
[E8/order] PASS index.html 白名单按序 14 项逐字符
[E8/nobranch] PASS 核验器代码里 white.length 只与 14 比较过一次（R9④：不存在"按条目是否带日期取 12／14 两种口径"的收缩分支）
[E8/from-manifest] PASS 白名单第 9–14 项 == 由 manifest.columns 派生的同一序列（R11：不另立口径）
[E8/noEighth] FAIL index.html <main> 标签计数 == Task4 R4 值（无第八项可见正文） — 期望: a:3, div:2, h1:1, h2:4, li:3, main:1, p:4, section:3, span:6, ul:1 — 实际: a:3, div:2, h1:1, h2:4, li:3, main:1, p:3, section:3, span:6, ul:1 — 移交: Task 12 R4
[E8tally/main] PASS index.html <main> 内 <main> 计数 == R4
[E8tally/h1] PASS index.html <main> 内 <h1> 计数 == R4
[E8tally/div] PASS index.html <main> 内 <div> 计数 == R4
[E8tally/section] PASS index.html <main> 内 <section> 计数 == R4
[E8tally/h2] PASS index.html <main> 内 <h2> 计数 == R4
[E8tally/p] FAIL index.html <main> 内 <p> 计数 == R4 — 期望: 4 — 实际: 3 — 移交: Task 12 R4
[E8tally/ul] PASS index.html <main> 内 <ul> 计数 == R4
[E8tally/li] PASS index.html <main> 内 <li> 计数 == R4
[E8tally/a] PASS index.html <main> 内 <a> 计数 == R4
[E8tally/span] PASS index.html <main> 内 <span> 计数 == R4
[E8zero/h3] PASS index.html <main> 内 <h3> == 0（R4 第 2 条）
[E8zero/h4] PASS index.html <main> 内 <h4> == 0（R4 第 2 条）
[E8zero/img] PASS index.html <main> 内 <img> == 0（R4 第 2 条）
[E8zero/article] PASS index.html <main> 内 <article> == 0（R4 第 2 条）
[E8zero/nav] PASS index.html <main> 内 <nav> == 0（R4 第 2 条）
[E8zero/time] PASS index.html <main> 内 <time> == 0（R4 第 2 条）
[E9/items] PASS index.html 最新区条目数恒为 3（R8/R11①：全局排序取前 3 条）
[E9/itemshape] PASS index.html 每条 = a.home-latest__link 包两个 span（标题 + 月日）
[E9/no-summary] PASS index.html 最新区不含摘要/阅读全文/了解更多文案
[E9/date-nodes] PASS index.html 三条均带用户声明的 display_date 节点（R9③）
[E9/latest-order] PASS index.html 最新区次序 == manifest 栏目序展开（R11②四键全序）
[F1/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html #main-content 唯一子节点
[F1/article-classroom-screen-upgrade.html/order] PASS article-classroom-screen-upgrade.html .article 子节点顺序
[F2/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html .article__header 直接子元素
[F3/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html .article__type 为栏目名（注册表第二列）
[F3/article-classroom-screen-upgrade.html/no评价] PASS article-classroom-screen-upgrade.html 不出现"新闻评价"
[F4/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html h1.page-title textContent == Task1 title
[F4b/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html h1 == manifest.columns[*].articles[*].title
[F4/article-classroom-screen-upgrade.html/cls] PASS article-classroom-screen-upgrade.html h1 class
[F5/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html .article__byline == Task1 byline
[F5/article-classroom-screen-upgrade.html/prefix] PASS article-classroom-screen-upgrade.html 署名前缀
[F6/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html .article__body > p 数量（段落数由 Task1 合同推导，不写死）
[F7/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 逐段 textContent 严格相等
[F7p/article-classroom-screen-upgrade.html/C01] PASS article-classroom-screen-upgrade.html 第 1 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C02] PASS article-classroom-screen-upgrade.html 第 2 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C03] PASS article-classroom-screen-upgrade.html 第 3 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C04] PASS article-classroom-screen-upgrade.html 第 4 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C05] PASS article-classroom-screen-upgrade.html 第 5 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C06] PASS article-classroom-screen-upgrade.html 第 6 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C07] PASS article-classroom-screen-upgrade.html 第 7 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C08] PASS article-classroom-screen-upgrade.html 第 8 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C09] PASS article-classroom-screen-upgrade.html 第 9 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C10] PASS article-classroom-screen-upgrade.html 第 10 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C11] PASS article-classroom-screen-upgrade.html 第 11 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C12] PASS article-classroom-screen-upgrade.html 第 12 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C13] PASS article-classroom-screen-upgrade.html 第 13 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C14] PASS article-classroom-screen-upgrade.html 第 14 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C15] PASS article-classroom-screen-upgrade.html 第 15 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C16] PASS article-classroom-screen-upgrade.html 第 16 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C17] PASS article-classroom-screen-upgrade.html 第 17 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C18] PASS article-classroom-screen-upgrade.html 第 18 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C19] PASS article-classroom-screen-upgrade.html 第 19 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C20] PASS article-classroom-screen-upgrade.html 第 20 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C21] PASS article-classroom-screen-upgrade.html 第 21 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C22] PASS article-classroom-screen-upgrade.html 第 22 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C23] PASS article-classroom-screen-upgrade.html 第 23 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C24] PASS article-classroom-screen-upgrade.html 第 24 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C25] PASS article-classroom-screen-upgrade.html 第 25 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C26] PASS article-classroom-screen-upgrade.html 第 26 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C27] PASS article-classroom-screen-upgrade.html 第 27 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C28] PASS article-classroom-screen-upgrade.html 第 28 段逐字符（一条不减）
[F7p/article-classroom-screen-upgrade.html/C29] PASS article-classroom-screen-upgrade.html 第 29 段逐字符（一条不减）
[F7/article-classroom-screen-upgrade.html/chars] PASS article-classroom-screen-upgrade.html 逐段字符数 == Task1 §3 基线
[F8/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 评论页无 .dateline
[F9/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html .article__date 位置
[F9/article-classroom-screen-upgrade.html/text] PASS article-classroom-screen-upgrade.html 末尾日期逐字符 == Task1 closing_date
[F9/article-classroom-screen-upgrade.html/form] PASS article-classroom-screen-upgrade.html 末尾日期全角括号且无年份
[F10/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 正文禁用内联/块级标签
[F10/article-classroom-screen-upgrade.html/inline] PASS article-classroom-screen-upgrade.html 正文 p 内除电头 <strong> 外无其他标签
[F10/article-classroom-screen-upgrade.html/ul] PASS article-classroom-screen-upgrade.html 唯一 <ul> 为导航列表（正文 0）
[F11/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 段落空白规范
[F1/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html #main-content 唯一子节点
[F1/article-math-to-ai-learning.html/order] PASS article-math-to-ai-learning.html .article 子节点顺序
[F2/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html .article__header 直接子元素
[F3/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html .article__type 为栏目名（注册表第二列）
[F3/article-math-to-ai-learning.html/no评价] PASS article-math-to-ai-learning.html 不出现"新闻评价"
[F4/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html h1.page-title textContent == Task1 title
[F4b/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html h1 == manifest.columns[*].articles[*].title
[F4/article-math-to-ai-learning.html/cls] PASS article-math-to-ai-learning.html h1 class
[F5/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html .article__byline == Task1 byline
[F5/article-math-to-ai-learning.html/prefix] PASS article-math-to-ai-learning.html 署名前缀
[F6/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html .article__body > p 数量（段落数由 Task1 合同推导，不写死）
[F7/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 逐段 textContent 严格相等
[F7p/article-math-to-ai-learning.html/F01] PASS article-math-to-ai-learning.html 第 1 段逐字符（一条不减）
[F7p/article-math-to-ai-learning.html/F02] PASS article-math-to-ai-learning.html 第 2 段逐字符（一条不减）
[F7p/article-math-to-ai-learning.html/F03] PASS article-math-to-ai-learning.html 第 3 段逐字符（一条不减）
[F7p/article-math-to-ai-learning.html/F04] PASS article-math-to-ai-learning.html 第 4 段逐字符（一条不减）
[F7p/article-math-to-ai-learning.html/F05] PASS article-math-to-ai-learning.html 第 5 段逐字符（一条不减）
[F7p/article-math-to-ai-learning.html/F06] PASS article-math-to-ai-learning.html 第 6 段逐字符（一条不减）
[F7p/article-math-to-ai-learning.html/F07] PASS article-math-to-ai-learning.html 第 7 段逐字符（一条不减）
[F7p/article-math-to-ai-learning.html/F08] PASS article-math-to-ai-learning.html 第 8 段逐字符（一条不减）
[F7p/article-math-to-ai-learning.html/F09] PASS article-math-to-ai-learning.html 第 9 段逐字符（一条不减）
[F7p/article-math-to-ai-learning.html/F10] PASS article-math-to-ai-learning.html 第 10 段逐字符（一条不减）
[F7p/article-math-to-ai-learning.html/F11] PASS article-math-to-ai-learning.html 第 11 段逐字符（一条不减）
[F7p/article-math-to-ai-learning.html/F12] PASS article-math-to-ai-learning.html 第 12 段逐字符（一条不减）
[F7p/article-math-to-ai-learning.html/F13] PASS article-math-to-ai-learning.html 第 13 段逐字符（一条不减）
[F7p/article-math-to-ai-learning.html/F14] PASS article-math-to-ai-learning.html 第 14 段逐字符（一条不减）
[F7p/article-math-to-ai-learning.html/F15] PASS article-math-to-ai-learning.html 第 15 段逐字符（一条不减）
[F7p/article-math-to-ai-learning.html/F16] PASS article-math-to-ai-learning.html 第 16 段逐字符（一条不减）
[F7p/article-math-to-ai-learning.html/F17] PASS article-math-to-ai-learning.html 第 17 段逐字符（一条不减）
[F7p/article-math-to-ai-learning.html/F18] PASS article-math-to-ai-learning.html 第 18 段逐字符（一条不减）
[F7p/article-math-to-ai-learning.html/F19] PASS article-math-to-ai-learning.html 第 19 段逐字符（一条不减）
[F7p/article-math-to-ai-learning.html/F20] PASS article-math-to-ai-learning.html 第 20 段逐字符（一条不减）
[F7p/article-math-to-ai-learning.html/F21] PASS article-math-to-ai-learning.html 第 21 段逐字符（一条不减）
[F7p/article-math-to-ai-learning.html/F22] PASS article-math-to-ai-learning.html 第 22 段逐字符（一条不减）
[F7p/article-math-to-ai-learning.html/F23] PASS article-math-to-ai-learning.html 第 23 段逐字符（一条不减）
[F7/article-math-to-ai-learning.html/chars] PASS article-math-to-ai-learning.html 逐段字符数 == Task1 §3 基线
[F8/article-math-to-ai-learning.html/node] PASS article-math-to-ai-learning.html 电头为首个正文 <p> 的首个子节点
[F8/article-math-to-ai-learning.html/text] PASS article-math-to-ai-learning.html strong.dateline textContent（由 Task1 首段的首个 U+0020 之前推导）
[F8/article-math-to-ai-learning.html/space] PASS article-math-to-ai-learning.html 电头后紧邻空格
[F8/article-math-to-ai-learning.html/rest] PASS article-math-to-ai-learning.html 首段 DOM textContent 逐字符等于合同首段（电头与正文接缝无损耗）
[F8/article-math-to-ai-learning.html/one] PASS article-math-to-ai-learning.html 电头唯一性与无多余空格
[F9/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 不得出现 .article__date（R9②：仅评论类有 end_date）
[F10/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 正文禁用内联/块级标签
[F10/article-math-to-ai-learning.html/inline] PASS article-math-to-ai-learning.html 正文 p 内除电头 <strong> 外无其他标签
[F10/article-math-to-ai-learning.html/ul] PASS article-math-to-ai-learning.html 唯一 <ul> 为导航列表（正文 0）
[F11/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 段落空白规范
[F1/article-school-course-volunteer.html] PASS article-school-course-volunteer.html #main-content 唯一子节点
[F1/article-school-course-volunteer.html/order] PASS article-school-course-volunteer.html .article 子节点顺序
[F2/article-school-course-volunteer.html] PASS article-school-course-volunteer.html .article__header 直接子元素
[F3/article-school-course-volunteer.html] PASS article-school-course-volunteer.html .article__type 为栏目名（注册表第二列）
[F3/article-school-course-volunteer.html/no评价] PASS article-school-course-volunteer.html 不出现"新闻评价"
[F4/article-school-course-volunteer.html] PASS article-school-course-volunteer.html h1.page-title textContent == Task1 title
[F4b/article-school-course-volunteer.html] PASS article-school-course-volunteer.html h1 == manifest.columns[*].articles[*].title
[F4/article-school-course-volunteer.html/cls] PASS article-school-course-volunteer.html h1 class
[F5/article-school-course-volunteer.html] PASS article-school-course-volunteer.html .article__byline == Task1 byline
[F5/article-school-course-volunteer.html/prefix] PASS article-school-course-volunteer.html 署名前缀
[F6/article-school-course-volunteer.html] PASS article-school-course-volunteer.html .article__body > p 数量（段落数由 Task1 合同推导，不写死）
[F7/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 逐段 textContent 严格相等
[F7p/article-school-course-volunteer.html/M01] PASS article-school-course-volunteer.html 第 1 段逐字符（一条不减）
[F7p/article-school-course-volunteer.html/M02] PASS article-school-course-volunteer.html 第 2 段逐字符（一条不减）
[F7p/article-school-course-volunteer.html/M03] PASS article-school-course-volunteer.html 第 3 段逐字符（一条不减）
[F7p/article-school-course-volunteer.html/M04] PASS article-school-course-volunteer.html 第 4 段逐字符（一条不减）
[F7/article-school-course-volunteer.html/chars] PASS article-school-course-volunteer.html 逐段字符数 == Task1 §3 基线
[F8/article-school-course-volunteer.html/node] PASS article-school-course-volunteer.html 电头为首个正文 <p> 的首个子节点
[F8/article-school-course-volunteer.html/text] PASS article-school-course-volunteer.html strong.dateline textContent（由 Task1 首段的首个 U+0020 之前推导）
[F8/article-school-course-volunteer.html/space] PASS article-school-course-volunteer.html 电头后紧邻空格
[F8/article-school-course-volunteer.html/rest] PASS article-school-course-volunteer.html 首段 DOM textContent 逐字符等于合同首段（电头与正文接缝无损耗）
[F8/article-school-course-volunteer.html/one] PASS article-school-course-volunteer.html 电头唯一性与无多余空格
[F9/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 不得出现 .article__date（R9②：仅评论类有 end_date）
[F10/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 正文禁用内联/块级标签
[F10/article-school-course-volunteer.html/inline] PASS article-school-course-volunteer.html 正文 p 内除电头 <strong> 外无其他标签
[F10/article-school-course-volunteer.html/ul] PASS article-school-course-volunteer.html 唯一 <ul> 为导航列表（正文 0）
[F11/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 段落空白规范
[F12/news-message.html/count] PASS news-message.html .entry-list 条目数 == manifest 该栏目文章数
[F12/news-message.html/order] PASS news-message.html 条目顺序 == manifest.columns[*].articles 顺序
[F12/news-message.html/direct] PASS news-message.html .entry-list 是 <main> 的直接子元素
[F12/news-message.html/title0] PASS news-message.html 条目 0 标题逐字 == manifest title
[F12/news-message.html/cls0] PASS news-message.html 条目 0 两个 span 类名
[F12/news-message.html/href0] PASS news-message.html 条目 0 href == manifest page
[F12/news-message.html/noyear] PASS news-message.html 日期节点内无年份形态与 ISO 形态
[F12/news-feature.html/count] PASS news-feature.html .entry-list 条目数 == manifest 该栏目文章数
[F12/news-feature.html/order] PASS news-feature.html 条目顺序 == manifest.columns[*].articles 顺序
[F12/news-feature.html/direct] PASS news-feature.html .entry-list 是 <main> 的直接子元素
[F12/news-feature.html/title0] PASS news-feature.html 条目 0 标题逐字 == manifest title
[F12/news-feature.html/cls0] PASS news-feature.html 条目 0 两个 span 类名
[F12/news-feature.html/href0] PASS news-feature.html 条目 0 href == manifest page
[F12/news-feature.html/noyear] PASS news-feature.html 日期节点内无年份形态与 ISO 形态
[F12/news-commentary.html/count] PASS news-commentary.html .entry-list 条目数 == manifest 该栏目文章数
[F12/news-commentary.html/order] PASS news-commentary.html 条目顺序 == manifest.columns[*].articles 顺序
[F12/news-commentary.html/direct] PASS news-commentary.html .entry-list 是 <main> 的直接子元素
[F12/news-commentary.html/title0] PASS news-commentary.html 条目 0 标题逐字 == manifest title
[F12/news-commentary.html/cls0] PASS news-commentary.html 条目 0 两个 span 类名
[F12/news-commentary.html/href0] PASS news-commentary.html 条目 0 href == manifest page
[F12/news-commentary.html/noyear] PASS news-commentary.html 日期节点内无年份形态与 ISO 形态
[G/M/安_装] PASS article-school-course-volunteer.html 正文中 "安 装" 次数 == Task1 合同推导 — 期望(合同)=0 实际(DOM)=0
[G/M/她] PASS article-school-course-volunteer.html 正文中 "她" 次数 == Task1 合同推导 — 期望(合同)=0 实际(DOM)=0
[G/M/Windows_10] PASS article-school-course-volunteer.html 正文中 "Windows 10" 次数 == Task1 合同推导 — 期望(合同)=0 实际(DOM)=0
[G/M/.exe] PASS article-school-course-volunteer.html 正文中 ".exe" 次数 == Task1 合同推导 — 期望(合同)=0 实际(DOM)=0
[G/M/86英寸] PASS article-school-course-volunteer.html 正文中 "86英寸" 次数 == Task1 合同推导 — 期望(合同)=0 实际(DOM)=0
[G/M/47个社团] PASS article-school-course-volunteer.html 正文中 "47个社团" 次数 == Task1 合同推导 — 期望(合同)=1 实际(DOM)=1
[G/M/5次碰撞] PASS article-school-course-volunteer.html 正文中 "5次碰撞" 次数 == Task1 合同推导 — 期望(合同)=0 实际(DOM)=0
[G/M/3个U盘] PASS article-school-course-volunteer.html 正文中 "3个U盘" 次数 == Task1 合同推导 — 期望(合同)=0 实际(DOM)=0
[G/M/punct“] PASS article-school-course-volunteer.html 全角标点 “ 次数 == 合同 — 期望=0 实际=0
[G/M/punct”] PASS article-school-course-volunteer.html 全角标点 ” 次数 == 合同 — 期望=0 实际=0
[G/M/punct‘] PASS article-school-course-volunteer.html 全角标点 ‘ 次数 == 合同 — 期望=0 实际=0
[G/M/punct’] PASS article-school-course-volunteer.html 全角标点 ’ 次数 == 合同 — 期望=0 实际=0
[G/M/punct—] PASS article-school-course-volunteer.html 全角标点 — 次数 == 合同 — 期望=0 实际=0
[G/M/punct：] PASS article-school-course-volunteer.html 全角标点 ： 次数 == 合同 — 期望=0 实际=0
[G/M/punct；] PASS article-school-course-volunteer.html 全角标点 ； 次数 == 合同 — 期望=1 实际=1
[G/M/punct？] PASS article-school-course-volunteer.html 全角标点 ？ 次数 == 合同 — 期望=0 实际=0
[G/M/punct、] PASS article-school-course-volunteer.html 全角标点 、 次数 == 合同 — 期望=1 实际=1
[G/M/punct。] PASS article-school-course-volunteer.html 全角标点 。 次数 == 合同 — 期望=8 实际=8
[G/M/punct，] PASS article-school-course-volunteer.html 全角标点 ， 次数 == 合同 — 期望=11 实际=11
[G/M/space] PASS article-school-course-volunteer.html 半角空格次数 == 合同 — 期望=1 实际=1
[G/M/nohalfparen] PASS article-school-course-volunteer.html 正文无半角括号（合同用全角）
[G/M/noyear] PASS article-school-course-volunteer.html 正文无年份形态（月日前无四位年份）
[G/M/join-eq] PASS article-school-course-volunteer.html 正文（段以 \n 连接）与 Task1 合同逐字符相等
[G/F/安_装] PASS article-math-to-ai-learning.html 正文中 "安 装" 次数 == Task1 合同推导 — 期望(合同)=0 实际(DOM)=0
[G/F/她] PASS article-math-to-ai-learning.html 正文中 "她" 次数 == Task1 合同推导 — 期望(合同)=1 实际(DOM)=1
[G/F/Windows_10] PASS article-math-to-ai-learning.html 正文中 "Windows 10" 次数 == Task1 合同推导 — 期望(合同)=0 实际(DOM)=0
[G/F/.exe] PASS article-math-to-ai-learning.html 正文中 ".exe" 次数 == Task1 合同推导 — 期望(合同)=0 实际(DOM)=0
[G/F/86英寸] PASS article-math-to-ai-learning.html 正文中 "86英寸" 次数 == Task1 合同推导 — 期望(合同)=0 实际(DOM)=0
[G/F/47个社团] PASS article-math-to-ai-learning.html 正文中 "47个社团" 次数 == Task1 合同推导 — 期望(合同)=0 实际(DOM)=0
[G/F/5次碰撞] PASS article-math-to-ai-learning.html 正文中 "5次碰撞" 次数 == Task1 合同推导 — 期望(合同)=0 实际(DOM)=0
[G/F/3个U盘] PASS article-math-to-ai-learning.html 正文中 "3个U盘" 次数 == Task1 合同推导 — 期望(合同)=0 实际(DOM)=0
[G/F/punct“] PASS article-math-to-ai-learning.html 全角标点 “ 次数 == 合同 — 期望=8 实际=8
[G/F/punct”] PASS article-math-to-ai-learning.html 全角标点 ” 次数 == 合同 — 期望=8 实际=8
[G/F/punct‘] PASS article-math-to-ai-learning.html 全角标点 ‘ 次数 == 合同 — 期望=2 实际=2
[G/F/punct’] PASS article-math-to-ai-learning.html 全角标点 ’ 次数 == 合同 — 期望=2 实际=2
[G/F/punct—] PASS article-math-to-ai-learning.html 全角标点 — 次数 == 合同 — 期望=2 实际=2
[G/F/punct：] PASS article-math-to-ai-learning.html 全角标点 ： 次数 == 合同 — 期望=2 实际=2
[G/F/punct；] PASS article-math-to-ai-learning.html 全角标点 ； 次数 == 合同 — 期望=3 实际=3
[G/F/punct？] PASS article-math-to-ai-learning.html 全角标点 ？ 次数 == 合同 — 期望=1 实际=1
[G/F/punct、] PASS article-math-to-ai-learning.html 全角标点 、 次数 == 合同 — 期望=11 实际=11
[G/F/punct。] PASS article-math-to-ai-learning.html 全角标点 。 次数 == 合同 — 期望=40 实际=40
[G/F/punct，] PASS article-math-to-ai-learning.html 全角标点 ， 次数 == 合同 — 期望=69 实际=69
[G/F/space] PASS article-math-to-ai-learning.html 半角空格次数 == 合同 — 期望=1 实际=1
[G/F/nohalfparen] PASS article-math-to-ai-learning.html 正文无半角括号（合同用全角）
[G/F/noyear] PASS article-math-to-ai-learning.html 正文无年份形态（月日前无四位年份）
[G/F/join-eq] PASS article-math-to-ai-learning.html 正文（段以 \n 连接）与 Task1 合同逐字符相等
[G/C/安_装] PASS article-classroom-screen-upgrade.html 正文中 "安 装" 次数 == Task1 合同推导 — 期望(合同)=0 实际(DOM)=0
[G/C/她] PASS article-classroom-screen-upgrade.html 正文中 "她" 次数 == Task1 合同推导 — 期望(合同)=0 实际(DOM)=0
[G/C/Windows_10] PASS article-classroom-screen-upgrade.html 正文中 "Windows 10" 次数 == Task1 合同推导 — 期望(合同)=2 实际(DOM)=2
[G/C/.exe] PASS article-classroom-screen-upgrade.html 正文中 ".exe" 次数 == Task1 合同推导 — 期望(合同)=3 实际(DOM)=3
[G/C/86英寸] PASS article-classroom-screen-upgrade.html 正文中 "86英寸" 次数 == Task1 合同推导 — 期望(合同)=1 实际(DOM)=1
[G/C/47个社团] PASS article-classroom-screen-upgrade.html 正文中 "47个社团" 次数 == Task1 合同推导 — 期望(合同)=0 实际(DOM)=0
[G/C/5次碰撞] PASS article-classroom-screen-upgrade.html 正文中 "5次碰撞" 次数 == Task1 合同推导 — 期望(合同)=1 实际(DOM)=1
[G/C/3个U盘] PASS article-classroom-screen-upgrade.html 正文中 "3个U盘" 次数 == Task1 合同推导 — 期望(合同)=1 实际(DOM)=1
[G/C/punct“] PASS article-classroom-screen-upgrade.html 全角标点 “ 次数 == 合同 — 期望=5 实际=5
[G/C/punct”] PASS article-classroom-screen-upgrade.html 全角标点 ” 次数 == 合同 — 期望=5 实际=5
[G/C/punct‘] PASS article-classroom-screen-upgrade.html 全角标点 ‘ 次数 == 合同 — 期望=0 实际=0
[G/C/punct’] PASS article-classroom-screen-upgrade.html 全角标点 ’ 次数 == 合同 — 期望=0 实际=0
[G/C/punct—] PASS article-classroom-screen-upgrade.html 全角标点 — 次数 == 合同 — 期望=0 实际=0
[G/C/punct：] PASS article-classroom-screen-upgrade.html 全角标点 ： 次数 == 合同 — 期望=1 实际=1
[G/C/punct；] PASS article-classroom-screen-upgrade.html 全角标点 ； 次数 == 合同 — 期望=5 实际=5
[G/C/punct？] PASS article-classroom-screen-upgrade.html 全角标点 ？ 次数 == 合同 — 期望=0 实际=0
[G/C/punct、] PASS article-classroom-screen-upgrade.html 全角标点 、 次数 == 合同 — 期望=20 实际=20
[G/C/punct。] PASS article-classroom-screen-upgrade.html 全角标点 。 次数 == 合同 — 期望=58 实际=58
[G/C/punct，] PASS article-classroom-screen-upgrade.html 全角标点 ， 次数 == 合同 — 期望=89 实际=89
[G/C/space] PASS article-classroom-screen-upgrade.html 半角空格次数 == 合同 — 期望=2 实际=2
[G/C/nohalfparen] PASS article-classroom-screen-upgrade.html 正文无半角括号（合同用全角）
[G/C/noyear] PASS article-classroom-screen-upgrade.html 正文无年份形态（月日前无四位年份）
[G/C/join-eq] PASS article-classroom-screen-upgrade.html 正文（段以 \n 连接）与 Task1 合同逐字符相等
[G/pron-她] PASS article-math-to-ai-learning.html "她"所在段索引集合 == Task1 合同（人称不统一是素材原貌，不得统一）
[G/pron-他] PASS article-math-to-ai-learning.html "他"所在段索引集合 == Task1 合同
[G/AI-total] PASS article-math-to-ai-learning.html 标题+正文 AI 合计 == Task1 合同
[G/ai] PASS article-math-to-ai-learning.html 大小写变体 ai 次数 == 合同
[G/Ai] PASS article-math-to-ai-learning.html 大小写变体 Ai 次数 == 合同
[G/aI] PASS article-math-to-ai-learning.html 大小写变体 aI 次数 == 合同
[G/dash-adj] PASS article-math-to-ai-learning.html 无孤立破折号（U+2014 均两两成对）
[H1] PASS 七页样式引用 / Results 样式文件数
[H2] PASS styles.css 外部资源
[H3] PASS styles.css 字体栈声明唯一
[H3/noremote] PASS styles.css 远程字体
[H4] PASS styles.css 首个 :root 内已注册变量无重复声明
[H4/values] PASS styles.css 首个 :root 的变量数值逐字符等于 plan/Task3 桌面基线（v1 H4 语义，期望值由锚点解析）
[H4/values-cover] PASS H4 变量对照覆盖 Task3 解析出的全部变量
[H4/nodup] PASS styles.css 同一 :root 内不得重复声明同一变量
[H4/declared] PASS styles.css 首个 :root 覆盖 §样式变量 点名的全部变量
[H4/no-new-var] PASS styles.css 归档区段未新造任何自定义属性（Task 16 变异 4 的禁令：--font-size-list 一类）
[H4/var-count] PASS styles.css 自定义属性总数 == Task 16 之前（零新增即零并行主题）
[H4/families] PASS §样式变量 解析出字号／间距／分隔线三族（--font-size-*、--space-*、--rule-*）
[H5/id] PASS styles.css ID 选择器
[H5/important] PASS styles.css !important
[H5/pagepatch] PASS styles.css 页面识别补丁
[H6] PASS styles.css 当前页样式
[H7] PASS styles.css 被禁视觉模式
[H7/radius] PASS styles.css 不以 border-radius 卡片化内容
[H8] PASS styles.css 移动区段
[H8/other] PASS styles.css 误写断点
[H9] PASS styles.css 移动区段内容
[H10] PASS styles.css content 注入
[H10/dot] PASS styles.css 不得以 content 注入分隔点（Task 16 §7 登记给本包的 H10 口径差）
[H11] PASS styles.css 页面专属 class
[H11/unknown] PASS styles.css 每个 class 选择器都在 Task0 §稳定接口总清单 内（R6⑥）
[H11/orphan] PASS styles.css 类均可在七页 HTML 或 script.js 状态类中找到（对照面从四页扩到七页；is-open 由脚本运行时写入）
[H11/root] PASS styles.css 移动区段仅覆盖桌面 :root 已有变量，不新增第二套主题变量
[H12] PASS styles.css 花括号与语法
[H12/browser] PASS styles.css 浏览器解析证据（七页）
[H12/n] PASS styles.css — 顶层块=63，声明块=93，移动区段规则=31
[H13/.site-masthead__link] PASS styles.css H13 visited 配对 .site-masthead__link
[H13/.site-navigation__link] PASS styles.css H13 visited 配对 .site-navigation__link
[H13/.entry-list__link] PASS styles.css H13 visited 配对 .entry-list__link
[H13/.home-latest__link] PASS styles.css H13 visited 配对 .home-latest__link
[H13/scope] PASS H13 辖域是封闭清单四类（显式豁免 .skip-link，不得外延）
[H13/skip-exempt] PASS styles.css 不存在 .skip-link:visited（按合同豁免）
[H14/rule/entry-list] PASS styles.css 归档新类 .entry-list 至少被一条规则使用（H14b 无条件，死规则检查）
[H14/rule/entry-list__date] PASS styles.css 归档新类 .entry-list__date 至少被一条规则使用（H14b 无条件，死规则检查）
[H14/rule/entry-list__item] PASS styles.css 归档新类 .entry-list__item 至少被一条规则使用（H14b 无条件，死规则检查）
[H14/rule/entry-list__link] PASS styles.css 归档新类 .entry-list__link 至少被一条规则使用（H14b 无条件，死规则检查）
[H14/rule/entry-list__title] PASS styles.css 归档新类 .entry-list__title 至少被一条规则使用（H14b 无条件，死规则检查）
[H14/rule/home-latest] PASS styles.css 归档新类 .home-latest 至少被一条规则使用（H14b 无条件，死规则检查）
[H14/rule/home-latest__date] PASS styles.css 归档新类 .home-latest__date 至少被一条规则使用（H14b 无条件，死规则检查）
[H14/rule/home-latest__entry] PASS styles.css 归档新类 .home-latest__entry 至少被一条规则使用（H14b 无条件，死规则检查）
[H14/rule/home-latest__item] PASS styles.css 归档新类 .home-latest__item 至少被一条规则使用（H14b 无条件，死规则检查）
[H14/rule/home-latest__link] PASS styles.css 归档新类 .home-latest__link 至少被一条规则使用（H14b 无条件，死规则检查）
[H14/rule/home-latest__list] PASS styles.css 归档新类 .home-latest__list 至少被一条规则使用（H14b 无条件，死规则检查）
[H14/rule/home-latest__title] PASS styles.css 归档新类 .home-latest__title 至少被一条规则使用（H14b 无条件，死规则检查）
[H14/subset] PASS styles.css class 集合 ⊆ Task0 注册类（26 既有 ∪ 12 归档）
[H14/arch-count] PASS H14 的归档新类面 == 12（来自 Task0 §归档层新增）
[H14/desktop/entry-list] PASS 归档新类 .entry-list 的桌面规则在场（不得整体挪进 @media 内部）
[H14/desktop/entry-list__date] PASS 归档新类 .entry-list__date 的桌面规则在场（不得整体挪进 @media 内部）
[H14/desktop/entry-list__item] PASS 归档新类 .entry-list__item 的桌面规则在场（不得整体挪进 @media 内部）
[H14/desktop/entry-list__link] PASS 归档新类 .entry-list__link 的桌面规则在场（不得整体挪进 @media 内部）
[H14/desktop/entry-list__title] PASS 归档新类 .entry-list__title 的桌面规则在场（不得整体挪进 @media 内部）
[H14/desktop/home-latest] PASS 归档新类 .home-latest 的桌面规则在场（不得整体挪进 @media 内部）
[H14/desktop/home-latest__date] PASS 归档新类 .home-latest__date 的桌面规则在场（不得整体挪进 @media 内部）
[H14/desktop/home-latest__entry] PASS 归档新类 .home-latest__entry 的桌面规则在场（不得整体挪进 @media 内部）
[H14/desktop/home-latest__item] PASS 归档新类 .home-latest__item 的桌面规则在场（不得整体挪进 @media 内部）
[H14/desktop/home-latest__link] PASS 归档新类 .home-latest__link 的桌面规则在场（不得整体挪进 @media 内部）
[H14/desktop/home-latest__list] PASS 归档新类 .home-latest__list 的桌面规则在场（不得整体挪进 @media 内部）
[H14/desktop/home-latest__title] PASS 归档新类 .home-latest__title 的桌面规则在场（不得整体挪进 @media 内部）
[H14/dom/entry-list] PASS 归档新类 .entry-list 至少在某个页面 DOM 中出现一次
[H14/dom/entry-list__date] PASS 归档日期类 .entry-list__date 的 DOM 在场性（无节点则 N/A，不 FAIL）
[H14/dom/entry-list__item] PASS 归档新类 .entry-list__item 至少在某个页面 DOM 中出现一次
[H14/dom/entry-list__link] PASS 归档新类 .entry-list__link 至少在某个页面 DOM 中出现一次
[H14/dom/entry-list__title] PASS 归档新类 .entry-list__title 至少在某个页面 DOM 中出现一次
[H14/dom/home-latest] PASS 归档新类 .home-latest 至少在某个页面 DOM 中出现一次
[H14/dom/home-latest__date] PASS 归档日期类 .home-latest__date 的 DOM 在场性（无节点则 N/A，不 FAIL）
[H14/dom/home-latest__entry] PASS 归档新类 .home-latest__entry 至少在某个页面 DOM 中出现一次
[H14/dom/home-latest__item] PASS 归档新类 .home-latest__item 至少在某个页面 DOM 中出现一次
[H14/dom/home-latest__link] PASS 归档新类 .home-latest__link 至少在某个页面 DOM 中出现一次
[H14/dom/home-latest__list] PASS 归档新类 .home-latest__list 至少在某个页面 DOM 中出现一次
[H14/dom/home-latest__title] PASS 归档新类 .home-latest__title 至少在某个页面 DOM 中出现一次
[I1] PASS script.js 唯一性与 defer（七页）
[I1/extra] PASS 第二脚本/polyfill/配置 JSON
[I2] PASS script.js 模块与外部依赖
[I3] PASS script.js console/debugger
[I4] PASS script.js 断点字符串
[I5] PASS script.js 状态写入范围（三处）
[I5/assign] PASS script.js 改写禁令
[I6] PASS script.js 查询依据
[I7] PASS script.js no-js→js 位置
[I8] PASS script.js 禁止信息（含注释）
[I9] PASS script.js 点击外部关闭
[I10/fs] PASS v1 基线 script.js 参照在场
[I11/hash] PASS script.js 哈希 == v1 基线（R10：本轮无写入者，预期零改动）
[I 事件绑定] PASS script.js — click , keydown , click , change
[J1] PASS Results/ 九文件整文扫描 J1（3 个禁止串/形态）
[J2] PASS Results/ 九文件整文扫描 J2（1 个禁止串/形态）
[J3] PASS Results/ 九文件整文扫描 J3（1 个禁止串/形态）
[J4] PASS Results/ 九文件整文扫描 J4（60 个禁止串/形态）
[J5] PASS Results/ 九文件整文扫描 J5（4 个禁止串/形态）
[J6] PASS Results/ 九文件整文扫描 J6（15 个禁止串/形态）
[J7] PASS Results/ 九文件整文扫描 J7（6 个禁止串/形态）
[J8] PASS Results/ 九文件整文扫描 J8（8 个禁止串/形态）
[J9] PASS Results/ 九文件整文扫描 J9（2 个禁止串/形态）
[J10] PASS Results/ 九文件整文扫描 J10（6 个禁止串/形态）
[J11] PASS Results/ 九文件整文扫描 J11（1 个禁止串/形态）
[J12] PASS Results/ 九文件整文扫描 J12（3 个禁止串/形态）
[J16] PASS Results/ 九文件整文扫描 J16（1 个禁止串/形态）
[J13] PASS 日期节点（entry-list__date/home-latest__date）内无四位数字
[J13b] PASS 日期节点内无年份形态 (19|20)\d{2}
[J13/count] PASS 日期节点数 == 首页 3 + 各列表页条目数（R9③ 恒在场）
[J14] PASS 七个 front-matter 字段名在七张公开页面内按整词命中 0（豁免已注册类名 article__date/entry-list__date/home-latest__date）
[J14/css-keyword] PASS styles.css 的整词 column 只允许出现在 flex-direction 关键字上下文（登记在册的说明项，不得被用来扩豁免面）
[J14/scope-anchor] PASS J14 辖域锚点在场：R6① 条文 + Task 15 §4 说明项
[J15] PASS J15 模板槽位记号 {{／}} 扫全部 Results/ 九文件（沿用 J8 全站口径，不降级为仅首页）
[J15/shell-allowed] PASS R6⑤ 的另一半：{{／}} 确实只允许存在于 build/shell.html
[J14b] PASS 注释与全文内不得出现字段名或 ISO 日期形态（含 styles.css／script.js）
[J17] PASS 年份形态 (19|20)\d{2} 扫全部 Results/ 九文件（含 styles.css 与 script.js），零豁免
[J17/form] PASS J17 扫描模式逐字符等于合同给出的年份形态
[J17/exempt-scope] PASS Task0 §误伤边界三条口径齐备：四位数字禁令只作用于日期节点、不做全站裸扫、但 CSS／JS 里的 19xx／20xx 仍判违规
[J17/anchor-e2] PASS 勘误表 E2 锚点在场：v1 从未实现 2024 豁免，本包是补上从未存在的年份扫描而非"取消豁免"
[J17/nobare] PASS 核验器代码不以裸 \d{4} 做年份扫描（避免 #7a2424／0.9375rem 误报逼出豁免）
[J17/canary-2024] PASS 年份扫描的行为自证：重新引入 2024 必被命中，说明扫描里没有豁免分支
[J17/canary-2026] PASS 行为自证：2026 同样被年份形态命中（J2 禁令继续有效且不依赖豁免表）
[J17/canary-css] PASS 行为自证：年份形态对 CSS 数值零误报，而裸 \d{4} 会命中 #7a2424 —— 这正是 R6 禁用裸四位的理由，扫描器无需任何豁免
[J17/noexempt] PASS 核验器代码（剥掉注释与字符串后）不含年份豁免表项或豁免跳转
[J17/form-literal] PASS J17 扫描模式逐字符等于合同给出的年份形态，且 §误伤边界 的豁免面非空（月日与正文数字按 R6 原样保留）
[J 说明] PASS Results/ — J1–J10 迁移 v1 语义（母本 verify_task10.mjs:640-651），J11–J17 为本包新增七条，共 18 条门禁；扫描范围从六文件扩到九文件；"记者"仅出现在冻结正文，被禁的是"记者："前缀
[L1/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html <main> 内部字节 == _qa_task13/main_slices/news-commentary.main-interior.html
[L1b/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html <main> 内部字节数 == 切片字节数
[L1/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html <main> 内部字节 == _qa_task13/main_slices/news-feature.main-interior.html
[L1b/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html <main> 内部字节数 == 切片字节数
[L1/article-school-course-volunteer.html] PASS article-school-course-volunteer.html <main> 内部字节 == _qa_task13/main_slices/news-message.main-interior.html
[L1b/article-school-course-volunteer.html] PASS article-school-course-volunteer.html <main> 内部字节数 == 切片字节数
[L2/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 浏览器 DOM 逐段 textContent 码点相等（第二条腿）
[L2c/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html DOM 层 article__date == Task1 closing_date
[L2d/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html DOM 正文总字符数 == Task1 合同总字符数
[L2/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 浏览器 DOM 逐段 textContent 码点相等（第二条腿）
[L2b/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html DOM 层 strong.dateline 后紧邻 U+0020
[L2d/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html DOM 正文总字符数 == Task1 合同总字符数
[L2/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 浏览器 DOM 逐段 textContent 码点相等（第二条腿）
[L2b/article-school-course-volunteer.html] PASS article-school-course-volunteer.html DOM 层 strong.dateline 后紧邻 U+0020
[L2d/article-school-course-volunteer.html] PASS article-school-course-volunteer.html DOM 正文总字符数 == Task1 合同总字符数
[L3/M:M01] PASS Task1 §3 M:M01 字符数与合同块自洽（第三条腿）
[L3/M:M02] PASS Task1 §3 M:M02 字符数与合同块自洽（第三条腿）
[L3/M:M03] PASS Task1 §3 M:M03 字符数与合同块自洽（第三条腿）
[L3/M:M04] PASS Task1 §3 M:M04 字符数与合同块自洽（第三条腿）
[L3/F:F01] PASS Task1 §3 F:F01 字符数与合同块自洽（第三条腿）
[L3/F:F02] PASS Task1 §3 F:F02 字符数与合同块自洽（第三条腿）
[L3/F:F03] PASS Task1 §3 F:F03 字符数与合同块自洽（第三条腿）
[L3/F:F04] PASS Task1 §3 F:F04 字符数与合同块自洽（第三条腿）
[L3/F:F05] PASS Task1 §3 F:F05 字符数与合同块自洽（第三条腿）
[L3/F:F06] PASS Task1 §3 F:F06 字符数与合同块自洽（第三条腿）
[L3/F:F07] PASS Task1 §3 F:F07 字符数与合同块自洽（第三条腿）
[L3/F:F08] PASS Task1 §3 F:F08 字符数与合同块自洽（第三条腿）
[L3/F:F09] PASS Task1 §3 F:F09 字符数与合同块自洽（第三条腿）
[L3/F:F10] PASS Task1 §3 F:F10 字符数与合同块自洽（第三条腿）
[L3/F:F11] PASS Task1 §3 F:F11 字符数与合同块自洽（第三条腿）
[L3/F:F12] PASS Task1 §3 F:F12 字符数与合同块自洽（第三条腿）
[L3/F:F13] PASS Task1 §3 F:F13 字符数与合同块自洽（第三条腿）
[L3/F:F14] PASS Task1 §3 F:F14 字符数与合同块自洽（第三条腿）
[L3/F:F15] PASS Task1 §3 F:F15 字符数与合同块自洽（第三条腿）
[L3/F:F16] PASS Task1 §3 F:F16 字符数与合同块自洽（第三条腿）
[L3/F:F17] PASS Task1 §3 F:F17 字符数与合同块自洽（第三条腿）
[L3/F:F18] PASS Task1 §3 F:F18 字符数与合同块自洽（第三条腿）
[L3/F:F19] PASS Task1 §3 F:F19 字符数与合同块自洽（第三条腿）
[L3/F:F20] PASS Task1 §3 F:F20 字符数与合同块自洽（第三条腿）
[L3/F:F21] PASS Task1 §3 F:F21 字符数与合同块自洽（第三条腿）
[L3/F:F22] PASS Task1 §3 F:F22 字符数与合同块自洽（第三条腿）
[L3/F:F23] PASS Task1 §3 F:F23 字符数与合同块自洽（第三条腿）
[L3/C:C01] PASS Task1 §3 C:C01 字符数与合同块自洽（第三条腿）
[L3/C:C02] PASS Task1 §3 C:C02 字符数与合同块自洽（第三条腿）
[L3/C:C03] PASS Task1 §3 C:C03 字符数与合同块自洽（第三条腿）
[L3/C:C04] PASS Task1 §3 C:C04 字符数与合同块自洽（第三条腿）
[L3/C:C05] PASS Task1 §3 C:C05 字符数与合同块自洽（第三条腿）
[L3/C:C06] PASS Task1 §3 C:C06 字符数与合同块自洽（第三条腿）
[L3/C:C07] PASS Task1 §3 C:C07 字符数与合同块自洽（第三条腿）
[L3/C:C08] PASS Task1 §3 C:C08 字符数与合同块自洽（第三条腿）
[L3/C:C09] PASS Task1 §3 C:C09 字符数与合同块自洽（第三条腿）
[L3/C:C10] PASS Task1 §3 C:C10 字符数与合同块自洽（第三条腿）
[L3/C:C11] PASS Task1 §3 C:C11 字符数与合同块自洽（第三条腿）
[L3/C:C12] PASS Task1 §3 C:C12 字符数与合同块自洽（第三条腿）
[L3/C:C13] PASS Task1 §3 C:C13 字符数与合同块自洽（第三条腿）
[L3/C:C14] PASS Task1 §3 C:C14 字符数与合同块自洽（第三条腿）
[L3/C:C15] PASS Task1 §3 C:C15 字符数与合同块自洽（第三条腿）
[L3/C:C16] PASS Task1 §3 C:C16 字符数与合同块自洽（第三条腿）
[L3/C:C17] PASS Task1 §3 C:C17 字符数与合同块自洽（第三条腿）
[L3/C:C18] PASS Task1 §3 C:C18 字符数与合同块自洽（第三条腿）
[L3/C:C19] PASS Task1 §3 C:C19 字符数与合同块自洽（第三条腿）
[L3/C:C20] PASS Task1 §3 C:C20 字符数与合同块自洽（第三条腿）
[L3/C:C21] PASS Task1 §3 C:C21 字符数与合同块自洽（第三条腿）
[L3/C:C22] PASS Task1 §3 C:C22 字符数与合同块自洽（第三条腿）
[L3/C:C23] PASS Task1 §3 C:C23 字符数与合同块自洽（第三条腿）
[L3/C:C24] PASS Task1 §3 C:C24 字符数与合同块自洽（第三条腿）
[L3/C:C25] PASS Task1 §3 C:C25 字符数与合同块自洽（第三条腿）
[L3/C:C26] PASS Task1 §3 C:C26 字符数与合同块自洽（第三条腿）
[L3/C:C27] PASS Task1 §3 C:C27 字符数与合同块自洽（第三条腿）
[L3/C:C28] PASS Task1 §3 C:C28 字符数与合同块自洽（第三条腿）
[L3/C:C29] PASS Task1 §3 C:C29 字符数与合同块自洽（第三条腿）
[L3/M:title] PASS Task1 §3 M:title 长度基线与合同块逐字符自洽（第三条腿）
[L3/M:byline] PASS Task1 §3 M:byline 长度基线与合同块逐字符自洽（第三条腿）
[L3/F:title] PASS Task1 §3 F:title 长度基线与合同块逐字符自洽（第三条腿）
[L3/F:byline] PASS Task1 §3 F:byline 长度基线与合同块逐字符自洽（第三条腿）
[L3/C:title] PASS Task1 §3 C:title 长度基线与合同块逐字符自洽（第三条腿）
[L3/C:byline] PASS Task1 §3 C:byline 长度基线与合同块逐字符自洽（第三条腿）
[L3/C:closing_date] PASS Task1 §3 C:closing_date 长度基线与合同块逐字符自洽（第三条腿）
[L3/total] PASS Task1 §3 逐段基线覆盖 63 项（L3 组总数）
[L4/head/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html <main> 之前字节 == build/shell.html 装配结果（仅 TITLE 槽与 aria-current 两处差异）
[L4/tail/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html </main> 之后字节 == shell.html 尾部（逐字节，无归一）
[L4/head/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html <main> 之前字节 == build/shell.html 装配结果（仅 TITLE 槽与 aria-current 两处差异）
[L4/tail/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html </main> 之后字节 == shell.html 尾部（逐字节，无归一）
[L4/head/article-school-course-volunteer.html] PASS article-school-course-volunteer.html <main> 之前字节 == build/shell.html 装配结果（仅 TITLE 槽与 aria-current 两处差异）
[L4/tail/article-school-course-volunteer.html] PASS article-school-course-volunteer.html </main> 之后字节 == shell.html 尾部（逐字节，无归一）
[L4/head/index.html] PASS index.html <main> 之前字节 == build/shell.html 装配结果（仅 TITLE 槽与 aria-current 两处差异）
[L4/tail/index.html] PASS index.html </main> 之后字节 == shell.html 尾部（逐字节，无归一）
[L4/head/news-commentary.html] PASS news-commentary.html <main> 之前字节 == build/shell.html 装配结果（仅 TITLE 槽与 aria-current 两处差异）
[L4/tail/news-commentary.html] PASS news-commentary.html </main> 之后字节 == shell.html 尾部（逐字节，无归一）
[L4/head/news-feature.html] PASS news-feature.html <main> 之前字节 == build/shell.html 装配结果（仅 TITLE 槽与 aria-current 两处差异）
[L4/tail/news-feature.html] PASS news-feature.html </main> 之后字节 == shell.html 尾部（逐字节，无归一）
[L4/head/news-message.html] PASS news-message.html <main> 之前字节 == build/shell.html 装配结果（仅 TITLE 槽与 aria-current 两处差异）
[L4/tail/news-message.html] PASS news-message.html </main> 之后字节 == shell.html 尾部（逐字节，无归一）
[L4/count] PASS L4 覆盖页集合大小 == counts.html（7 张页）
[L5/home-intro] PASS index.html 首页引言区 == build/partials/home-intro.html（字节子串）
[L5/three-slots] PASS index.html 三段字面量在场且无残留槽位记号
[L5/partial-bytes] PASS home-intro.html 字节数自洽
[L5/partial-from-baseline] PASS home-intro.html 是 _qa_task13/baseline/index.html 的字节子串（partial 来源合法）
[Q0/rc] PASS src_check.py 退出码 == 0（1 有 FAIL／2 崩溃或锚点缺失）
[Q0/json] PASS src_check.py 输出 JSON 可读
[Q/Q0/anchor#1] PASS src_check Q0/anchor [slug]
[Q/Q0/anchor#2] PASS src_check Q0/anchor [page]
[Q/Q0/anchor#3] PASS src_check Q0/anchor [display_date]
[Q/Q0/anchor#4] PASS src_check Q0/anchor [date]
[Q/Q0/anchor#5] PASS src_check Q0/anchor [slug-contract-id]
[Q/Q0/anchor#6] PASS src_check Q0/anchor [date-form:\d{4}]
[Q/Q0/anchor#7] PASS src_check Q0/anchor [date-form:\d{1,2}-\d{1,2}]
[Q/Q0/anchor#8] PASS src_check Q0/anchor [date-form:\d{8}]
[Q/Q0/anchor-required#1] PASS src_check Q0/anchor-required [Task12 front-matter]
[Q/Q0/anchor-forbidden-set#1] PASS src_check Q0/anchor-forbidden-set [Task13 正文区规则 5]
[Q/Q0/anchor-sortkeys#1] PASS src_check Q0/anchor-sortkeys [Task12 排序全序]
[Q/Q7/registry-matches-plan#1] PASS src_check Q7/registry-matches-plan [content/columns.md]
[Q/Q7/registry-exactly-3#1] PASS src_check Q7/registry-exactly-3 [content/columns.md]
[Q/Q7/registry-no-header#1] PASS src_check Q7/registry-no-header [content/columns.md]
[Q/Q7/registry-label-form#1] PASS src_check Q7/registry-label-form [content/columns.md]
[Q/Q7/registry-order#1] PASS src_check Q7/registry-order [content/columns.md]
[Q/Q3/registry-bytes#1] PASS src_check Q3/registry-bytes [content/columns.md]
[Q/Q1/whitelist#1] PASS src_check Q1/whitelist [classroom-screen-upgrade]
[Q/Q1/no-duplicate#1] PASS src_check Q1/no-duplicate [classroom-screen-upgrade]
[Q/Q1/required#1] PASS src_check Q1/required [classroom-screen-upgrade]
[Q/Q1/no-empty-value#1] PASS src_check Q1/no-empty-value [classroom-screen-upgrade]
[Q/Q2/slug==stem#1] PASS src_check Q2/slug==stem [classroom-screen-upgrade]
[Q/Q2/slug-regex#1] PASS src_check Q2/slug-regex [classroom-screen-upgrade]
[Q/Q2/reserved-name#1] PASS src_check Q2/reserved-name [classroom-screen-upgrade]
[Q/Q2/no-contract-id#1] PASS src_check Q2/no-contract-id [classroom-screen-upgrade]
[Q/Q2/no-date-form#1] PASS src_check Q2/no-date-form [classroom-screen-upgrade]
[Q/Q3/para-single-line#1] PASS src_check Q3/para-single-line [classroom-screen-upgrade]
[Q/Q3/no-inline-markup#1] PASS src_check Q3/no-inline-markup [classroom-screen-upgrade]
[Q/Q3/no-line-start-markup#1] PASS src_check Q3/no-line-start-markup [classroom-screen-upgrade]
[Q/Q3/byte-layer#1] PASS src_check Q3/byte-layer [classroom-screen-upgrade]
[Q/Q3/para-count#1] PASS src_check Q3/para-count [classroom-screen-upgrade]
[Q/Q3/body#1] PASS src_check Q3/body [classroom-screen-upgrade]
[Q/Q4/dateline-unique#1] PASS src_check Q4/dateline-unique [classroom-screen-upgrade]
[Q/Q5/end_date-commentary#1] PASS src_check Q5/end_date-commentary [classroom-screen-upgrade]
[Q/Q5/end_date==task1-closing#1] PASS src_check Q5/end_date==task1-closing [classroom-screen-upgrade]
[Q/Q6/display_date-form#1] PASS src_check Q6/display_date-form [classroom-screen-upgrade]
[Q/Q6/substring#1] PASS src_check Q6/substring [classroom-screen-upgrade]
[Q/Q7/column-registered#1] PASS src_check Q7/column-registered [classroom-screen-upgrade]
[Q/Q1/title==task1#1] PASS src_check Q1/title==task1 [classroom-screen-upgrade]
[Q/Q1/byline==task1#1] PASS src_check Q1/byline==task1 [classroom-screen-upgrade]
[Q/Q1/whitelist#2] PASS src_check Q1/whitelist [math-to-ai-learning]
[Q/Q1/no-duplicate#2] PASS src_check Q1/no-duplicate [math-to-ai-learning]
[Q/Q1/required#2] PASS src_check Q1/required [math-to-ai-learning]
[Q/Q1/no-empty-value#2] PASS src_check Q1/no-empty-value [math-to-ai-learning]
[Q/Q2/slug==stem#2] PASS src_check Q2/slug==stem [math-to-ai-learning]
[Q/Q2/slug-regex#2] PASS src_check Q2/slug-regex [math-to-ai-learning]
[Q/Q2/reserved-name#2] PASS src_check Q2/reserved-name [math-to-ai-learning]
[Q/Q2/no-contract-id#2] PASS src_check Q2/no-contract-id [math-to-ai-learning]
[Q/Q2/no-date-form#2] PASS src_check Q2/no-date-form [math-to-ai-learning]
[Q/Q3/para-single-line#2] PASS src_check Q3/para-single-line [math-to-ai-learning]
[Q/Q3/no-inline-markup#2] PASS src_check Q3/no-inline-markup [math-to-ai-learning]
[Q/Q3/no-line-start-markup#2] PASS src_check Q3/no-line-start-markup [math-to-ai-learning]
[Q/Q3/byte-layer#2] PASS src_check Q3/byte-layer [math-to-ai-learning]
[Q/Q3/para-count#2] PASS src_check Q3/para-count [math-to-ai-learning]
[Q/Q3/body#2] PASS src_check Q3/body [math-to-ai-learning]
[Q/Q4/dateline-unique#2] PASS src_check Q4/dateline-unique [math-to-ai-learning]
[Q/Q4/dateline-space#1] PASS src_check Q4/dateline-space [math-to-ai-learning]
[Q/Q5/end_date-commentary#2] PASS src_check Q5/end_date-commentary [math-to-ai-learning]
[Q/Q6/display_date-form#2] PASS src_check Q6/display_date-form [math-to-ai-learning]
[Q/Q6/substring#2] PASS src_check Q6/substring [math-to-ai-learning]
[Q/Q7/column-registered#2] PASS src_check Q7/column-registered [math-to-ai-learning]
[Q/Q1/title==task1#2] PASS src_check Q1/title==task1 [math-to-ai-learning]
[Q/Q1/byline==task1#2] PASS src_check Q1/byline==task1 [math-to-ai-learning]
[Q/Q1/whitelist#3] PASS src_check Q1/whitelist [school-course-volunteer]
[Q/Q1/no-duplicate#3] PASS src_check Q1/no-duplicate [school-course-volunteer]
[Q/Q1/required#3] PASS src_check Q1/required [school-course-volunteer]
[Q/Q1/no-empty-value#3] PASS src_check Q1/no-empty-value [school-course-volunteer]
[Q/Q2/slug==stem#3] PASS src_check Q2/slug==stem [school-course-volunteer]
[Q/Q2/slug-regex#3] PASS src_check Q2/slug-regex [school-course-volunteer]
[Q/Q2/reserved-name#3] PASS src_check Q2/reserved-name [school-course-volunteer]
[Q/Q2/no-contract-id#3] PASS src_check Q2/no-contract-id [school-course-volunteer]
[Q/Q2/no-date-form#3] PASS src_check Q2/no-date-form [school-course-volunteer]
[Q/Q3/para-single-line#3] PASS src_check Q3/para-single-line [school-course-volunteer]
[Q/Q3/no-inline-markup#3] PASS src_check Q3/no-inline-markup [school-course-volunteer]
[Q/Q3/no-line-start-markup#3] PASS src_check Q3/no-line-start-markup [school-course-volunteer]
[Q/Q3/byte-layer#3] PASS src_check Q3/byte-layer [school-course-volunteer]
[Q/Q3/para-count#3] PASS src_check Q3/para-count [school-course-volunteer]
[Q/Q3/body#3] PASS src_check Q3/body [school-course-volunteer]
[Q/Q4/dateline-unique#3] PASS src_check Q4/dateline-unique [school-course-volunteer]
[Q/Q4/dateline-space#2] PASS src_check Q4/dateline-space [school-course-volunteer]
[Q/Q5/end_date-commentary#3] PASS src_check Q5/end_date-commentary [school-course-volunteer]
[Q/Q6/display_date-form#3] PASS src_check Q6/display_date-form [school-course-volunteer]
[Q/Q6/substring#3] PASS src_check Q6/substring [school-course-volunteer]
[Q/Q7/column-registered#3] PASS src_check Q7/column-registered [school-course-volunteer]
[Q/Q1/title==task1#3] PASS src_check Q1/title==task1 [school-course-volunteer]
[Q/Q1/byline==task1#3] PASS src_check Q1/byline==task1 [school-course-volunteer]
[Q/Q7/column-nonempty#1] PASS src_check Q7/column-nonempty [message]
[Q/Q7/column-nonempty#2] PASS src_check Q7/column-nonempty [feature]
[Q/Q7/column-nonempty#3] PASS src_check Q7/column-nonempty [commentary]
[Q/Q7/registry-fully-used#1] PASS src_check Q7/registry-fully-used [content/columns.md]
[Q/Q2/slug-unique#1] PASS src_check Q2/slug-unique [content/articles]
[Q/Q3/article-count==3#1] PASS src_check Q3/article-count==3 [content/articles]
[Q/Q8/recompute-rank#1] PASS src_check Q8/recompute-rank [school-course-volunteer]
[Q/Q8/recompute-rank#2] PASS src_check Q8/recompute-rank [math-to-ai-learning]
[Q/Q8/recompute-rank#3] PASS src_check Q8/recompute-rank [classroom-screen-upgrade]
[Q/Q8/order-message#1] PASS src_check Q8/order-message [message]
[Q/Q2/page-name-message#1] PASS src_check Q2/page-name-message [message]
[Q/Q8/page-slug-message#1] PASS src_check Q8/page-slug-message [message]
[Q/Q8/order-feature#1] PASS src_check Q8/order-feature [feature]
[Q/Q2/page-name-feature#1] PASS src_check Q2/page-name-feature [feature]
[Q/Q8/page-slug-feature#1] PASS src_check Q8/page-slug-feature [feature]
[Q/Q8/order-commentary#1] PASS src_check Q8/order-commentary [commentary]
[Q/Q2/page-name-commentary#1] PASS src_check Q2/page-name-commentary [commentary]
[Q/Q8/page-slug-commentary#1] PASS src_check Q8/page-slug-commentary [commentary]
[Q/Q7/manifest-column-count#1] PASS src_check Q7/manifest-column-count [deploy/manifest.json]
[Q/Q7/manifest-column-order#1] PASS src_check Q7/manifest-column-order [deploy/manifest.json]
[Q/Q7/manifest-list-name#1] PASS src_check Q7/manifest-list-name [deploy/manifest.json]
[Q/Q5/manifest-no-date#1] PASS src_check Q5/manifest-no-date [deploy/manifest.json]
[Q/Q1/manifest-title-agrees#1] PASS src_check Q1/manifest-title-agrees [deploy/manifest.json ↔ content/]
[Q1/group] PASS Q1 组内全部成立（19 条独立判据）
[Q2/group] PASS Q2 组内全部成立（19 条独立判据）
[Q3/group] PASS Q3 组内全部成立（20 条独立判据）
[Q4/group] PASS Q4 组内全部成立（5 条独立判据）
[Q5/group] PASS Q5 组内全部成立（5 条独立判据）
[Q6/group] PASS Q6 组内全部成立（6 条独立判据）
[Q7/group] PASS Q7 组内全部成立（15 条独立判据）
[Q8/group] PASS Q8 组内全部成立（9 条独立判据）
[Q0/item-count] PASS src_check 判据条数自洽（109 条，FAIL 0）
[Q/independence] PASS src_check.py 的代码（剥注释后）不 import／调用构建器与打包器（两条链互不知情）
[Q/no-results-read] PASS src_check.py 不读 Results/（清单 vs 内容源的独立推导侧）
[Q6/three-display-date] PASS 三篇旧文均带用户声明的 display_date（R9③：白名单 14 项的前提）
[Q6/derived-order] PASS 独立推导的四键全序与 src_check 报告一致（可复算）
[P1/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 无死链：每个 href（除 #main-content）的目标都在目录集合内，大小写逐字符
[P3/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 引用形态合法：无 / 开头、无盘符、无反斜杠、无查询串、无越界片段
[P1/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 无死链：每个 href（除 #main-content）的目标都在目录集合内，大小写逐字符
[P3/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 引用形态合法：无 / 开头、无盘符、无反斜杠、无查询串、无越界片段
[P1/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 无死链：每个 href（除 #main-content）的目标都在目录集合内，大小写逐字符
[P3/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 引用形态合法：无 / 开头、无盘符、无反斜杠、无查询串、无越界片段
[P1/index.html] PASS index.html 无死链：每个 href（除 #main-content）的目标都在目录集合内，大小写逐字符
[P3/index.html] PASS index.html 引用形态合法：无 / 开头、无盘符、无反斜杠、无查询串、无越界片段
[P1/news-commentary.html] PASS news-commentary.html 无死链：每个 href（除 #main-content）的目标都在目录集合内，大小写逐字符
[P3/news-commentary.html] PASS news-commentary.html 引用形态合法：无 / 开头、无盘符、无反斜杠、无查询串、无越界片段
[P1/news-feature.html] PASS news-feature.html 无死链：每个 href（除 #main-content）的目标都在目录集合内，大小写逐字符
[P3/news-feature.html] PASS news-feature.html 引用形态合法：无 / 开头、无盘符、无反斜杠、无查询串、无越界片段
[P1/news-message.html] PASS news-message.html 无死链：每个 href（除 #main-content）的目标都在目录集合内，大小写逐字符
[P3/news-message.html] PASS news-message.html 引用形态合法：无 / 开头、无盘符、无反斜杠、无查询串、无越界片段
[P1/total] PASS 全站 href 总数 == 每页公共壳 7（skip 1 + 报头 1 + 导航 4 + 样式表 1）× 7 页 + 每篇详情 2 条入链
[P2/orphan/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 被其栏目列表页 news-message.html 引用（非孤儿）
[P2/home/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 被首页最新区恰好引用一次
[P2/inbound/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 入链总数 == 栏目列表页 1 + 首页最新区 1
[P2/orphan/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 被其栏目列表页 news-feature.html 引用（非孤儿）
[P2/home/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 被首页最新区恰好引用一次
[P2/inbound/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 入链总数 == 栏目列表页 1 + 首页最新区 1
[P2/orphan/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 被其栏目列表页 news-commentary.html 引用（非孤儿）
[P2/home/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 被首页最新区恰好引用一次
[P2/inbound/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 入链总数 == 栏目列表页 1 + 首页最新区 1
[P4/article-classroom-screen-upgrade.html/0] PASS 主导航路径 article-classroom-screen-upgrade.html → index.html
[P4/article-classroom-screen-upgrade.html/1] PASS 主导航路径 article-classroom-screen-upgrade.html → news-message.html
[P4/article-classroom-screen-upgrade.html/2] PASS 主导航路径 article-classroom-screen-upgrade.html → news-feature.html
[P4/article-classroom-screen-upgrade.html/3] PASS 主导航路径 article-classroom-screen-upgrade.html → news-commentary.html
[P4/article-math-to-ai-learning.html/0] PASS 主导航路径 article-math-to-ai-learning.html → index.html
[P4/article-math-to-ai-learning.html/1] PASS 主导航路径 article-math-to-ai-learning.html → news-message.html
[P4/article-math-to-ai-learning.html/2] PASS 主导航路径 article-math-to-ai-learning.html → news-feature.html
[P4/article-math-to-ai-learning.html/3] PASS 主导航路径 article-math-to-ai-learning.html → news-commentary.html
[P4/article-school-course-volunteer.html/0] PASS 主导航路径 article-school-course-volunteer.html → index.html
[P4/article-school-course-volunteer.html/1] PASS 主导航路径 article-school-course-volunteer.html → news-message.html
[P4/article-school-course-volunteer.html/2] PASS 主导航路径 article-school-course-volunteer.html → news-feature.html
[P4/article-school-course-volunteer.html/3] PASS 主导航路径 article-school-course-volunteer.html → news-commentary.html
[P4/index.html/0] PASS 主导航路径 index.html → index.html
[P4/index.html/1] PASS 主导航路径 index.html → news-message.html
[P4/index.html/2] PASS 主导航路径 index.html → news-feature.html
[P4/index.html/3] PASS 主导航路径 index.html → news-commentary.html
[P4/news-commentary.html/0] PASS 主导航路径 news-commentary.html → index.html
[P4/news-commentary.html/1] PASS 主导航路径 news-commentary.html → news-message.html
[P4/news-commentary.html/2] PASS 主导航路径 news-commentary.html → news-feature.html
[P4/news-commentary.html/3] PASS 主导航路径 news-commentary.html → news-commentary.html
[P4/news-feature.html/0] PASS 主导航路径 news-feature.html → index.html
[P4/news-feature.html/1] PASS 主导航路径 news-feature.html → news-message.html
[P4/news-feature.html/2] PASS 主导航路径 news-feature.html → news-feature.html
[P4/news-feature.html/3] PASS 主导航路径 news-feature.html → news-commentary.html
[P4/news-message.html/0] PASS 主导航路径 news-message.html → index.html
[P4/news-message.html/1] PASS 主导航路径 news-message.html → news-message.html
[P4/news-message.html/2] PASS 主导航路径 news-message.html → news-feature.html
[P4/news-message.html/3] PASS 主导航路径 news-message.html → news-commentary.html
[P1/srcset] PASS 无外部资源引用与 srcset
[N0/readable] PASS 本包自行解压 deploy/site.zip（不调 pack.py verify，避免自证）
[N/entry-count] PASS zip 文件条目数 == counts.pages + counts.config（10）
[N/set] PASS zip 条目集合 == manifest.pages ∪ manifest.config（双向）
[N/order] PASS 条目顺序 == sorted(名)（_headers 因 _ 码位排第一）
[N/sha-manifest/_headers] PASS _headers 条目 SHA-256 == manifest 登记值
[N/sha-disk/_headers] PASS _headers 条目 SHA-256 == 磁盘源文件
[N/bytes/_headers] PASS _headers 条目 uncompressedSize == manifest.bytes（清单承诺了字节数，回验必须核它）
[N/bytes-disk/_headers] PASS _headers 条目实解字节数 == 磁盘源文件字节数
[N/method/_headers] PASS _headers 条目压缩方法 == ZIP_DEFLATED(8)
[N/sha-manifest/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 条目 SHA-256 == manifest 登记值
[N/sha-disk/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 条目 SHA-256 == 磁盘源文件
[N/bytes/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 条目 uncompressedSize == manifest.bytes（清单承诺了字节数，回验必须核它）
[N/bytes-disk/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 条目实解字节数 == 磁盘源文件字节数
[N/method/article-classroom-screen-upgrade.html] PASS article-classroom-screen-upgrade.html 条目压缩方法 == ZIP_DEFLATED(8)
[N/sha-manifest/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 条目 SHA-256 == manifest 登记值
[N/sha-disk/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 条目 SHA-256 == 磁盘源文件
[N/bytes/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 条目 uncompressedSize == manifest.bytes（清单承诺了字节数，回验必须核它）
[N/bytes-disk/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 条目实解字节数 == 磁盘源文件字节数
[N/method/article-math-to-ai-learning.html] PASS article-math-to-ai-learning.html 条目压缩方法 == ZIP_DEFLATED(8)
[N/sha-manifest/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 条目 SHA-256 == manifest 登记值
[N/sha-disk/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 条目 SHA-256 == 磁盘源文件
[N/bytes/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 条目 uncompressedSize == manifest.bytes（清单承诺了字节数，回验必须核它）
[N/bytes-disk/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 条目实解字节数 == 磁盘源文件字节数
[N/method/article-school-course-volunteer.html] PASS article-school-course-volunteer.html 条目压缩方法 == ZIP_DEFLATED(8)
[N/sha-manifest/index.html] PASS index.html 条目 SHA-256 == manifest 登记值
[N/sha-disk/index.html] PASS index.html 条目 SHA-256 == 磁盘源文件
[N/bytes/index.html] PASS index.html 条目 uncompressedSize == manifest.bytes（清单承诺了字节数，回验必须核它）
[N/bytes-disk/index.html] PASS index.html 条目实解字节数 == 磁盘源文件字节数
[N/method/index.html] PASS index.html 条目压缩方法 == ZIP_DEFLATED(8)
[N/sha-manifest/news-commentary.html] PASS news-commentary.html 条目 SHA-256 == manifest 登记值
[N/sha-disk/news-commentary.html] PASS news-commentary.html 条目 SHA-256 == 磁盘源文件
[N/bytes/news-commentary.html] PASS news-commentary.html 条目 uncompressedSize == manifest.bytes（清单承诺了字节数，回验必须核它）
[N/bytes-disk/news-commentary.html] PASS news-commentary.html 条目实解字节数 == 磁盘源文件字节数
[N/method/news-commentary.html] PASS news-commentary.html 条目压缩方法 == ZIP_DEFLATED(8)
[N/sha-manifest/news-feature.html] PASS news-feature.html 条目 SHA-256 == manifest 登记值
[N/sha-disk/news-feature.html] PASS news-feature.html 条目 SHA-256 == 磁盘源文件
[N/bytes/news-feature.html] PASS news-feature.html 条目 uncompressedSize == manifest.bytes（清单承诺了字节数，回验必须核它）
[N/bytes-disk/news-feature.html] PASS news-feature.html 条目实解字节数 == 磁盘源文件字节数
[N/method/news-feature.html] PASS news-feature.html 条目压缩方法 == ZIP_DEFLATED(8)
[N/sha-manifest/news-message.html] PASS news-message.html 条目 SHA-256 == manifest 登记值
[N/sha-disk/news-message.html] PASS news-message.html 条目 SHA-256 == 磁盘源文件
[N/bytes/news-message.html] PASS news-message.html 条目 uncompressedSize == manifest.bytes（清单承诺了字节数，回验必须核它）
[N/bytes-disk/news-message.html] PASS news-message.html 条目实解字节数 == 磁盘源文件字节数
[N/method/news-message.html] PASS news-message.html 条目压缩方法 == ZIP_DEFLATED(8)
[N/sha-manifest/script.js] PASS script.js 条目 SHA-256 == manifest 登记值
[N/sha-disk/script.js] PASS script.js 条目 SHA-256 == 磁盘源文件
[N/bytes/script.js] PASS script.js 条目 uncompressedSize == manifest.bytes（清单承诺了字节数，回验必须核它）
[N/bytes-disk/script.js] PASS script.js 条目实解字节数 == 磁盘源文件字节数
[N/method/script.js] PASS script.js 条目压缩方法 == ZIP_DEFLATED(8)
[N/sha-manifest/styles.css] PASS styles.css 条目 SHA-256 == manifest 登记值
[N/sha-disk/styles.css] PASS styles.css 条目 SHA-256 == 磁盘源文件
[N/bytes/styles.css] PASS styles.css 条目 uncompressedSize == manifest.bytes（清单承诺了字节数，回验必须核它）
[N/bytes-disk/styles.css] PASS styles.css 条目实解字节数 == 磁盘源文件字节数
[N/method/styles.css] PASS styles.css 条目压缩方法 == ZIP_DEFLATED(8)
[N/headers] PASS _headers 在 zip 内在场（只进 zip，绝不进 Results/）
[N/headers-not-in-results] PASS Results/ 内不得存在 _headers
[N/no-sep] PASS 0 个条目名含路径分隔符（全部位于压缩包根）
[N/no-dir-entries] PASS 0 个目录条目（Results/ 这类零字节条目一律视为缺陷）
[N/no-banned] PASS zip 内无 manifest.json／UPLOAD.md／.txt／__pycache__
[N/datetime] PASS 每个条目 date_time == 固定常量 (1980,1,1,0,0,0)（可复现性的字节层前提）
[N/no-extra-comment] PASS 无 zip comment 与条目 extra field
[N/uniform-meta] PASS create_system 与 external_attr 全站统一
[N/counts-html] PASS 站点 HTML 页数 == 7（三数字分开核对：文件 9／zip 条目 10／页 7）
[N/zip-sha-recorded] PASS deploy/site.zip 当前哈希 == Task 17 登记的哈希（打包之后交付面未再漂移）
[N/repro-task17] PASS 两次／三次重打包字节相等由 Task 17 用全新子进程实测登记（本包只读，不重打包，也不调 pack.py verify 自证）
[N/zip-bytes] PASS deploy/site.zip 可读且非空
[R0/Results] PASS C:\Users\weibo\Documents\语文报纸\Results 核验前后哈希清单逐项相等（只读证明）
[R0/content] PASS C:\Users\weibo\Documents\语文报纸\content 核验前后哈希清单逐项相等（只读证明）
[R0/build] PASS C:\Users\weibo\Documents\语文报纸\build 核验前后哈希清单逐项相等（只读证明）
[R0/deploy] PASS C:\Users\weibo\Documents\语文报纸\deploy 核验前后哈希清单逐项相等（只读证明）
[R0/Materials] PASS C:\Users\weibo\Documents\语文报纸\Materials 核验前后哈希清单逐项相等（只读证明）
[R0/no-new-file] PASS Results/ 内无新增文件（核验后仍为 9 个）
[R0/mtime] PASS 五处目录内无任何文件 mtime 变化（核验器与被测对象都未被触碰）
[R0/self-sha] PASS 闸门自身 — verify_task18=dd5b3a9ebb5b07c9 probe_task18=2d3ab0fa17784ec8 probe_lib18=36e6ed840a8f7965 src_check=305590410f96babd
[R0/env] PASS 运行环境 — node v26.2.0；python 版本由变异台与报告登记
[R0/gate-not-in-results] PASS 闸门不进 Results/（产物全在 _qa_task18/）
[R0/facts-not-in-results] PASS 快照文件不写进 Results/（也不复用 _qa_task10/dom_facts.json）
```

## 失败项与移交清单

| 断言 | 文件/定位 | 期望 | 实际 | 移交 |
| --- | --- | --- | --- | --- |
| E8/noEighth | index.html <main> 标签计数 == Task4 R4 值（无第八项可见正文） | a:3, div:2, h1:1, h2:4, li:3, main:1, p:4, section:3, span:6, ul:1 | a:3, div:2, h1:1, h2:4, li:3, main:1, p:3, section:3, span:6, ul:1 | Task 12 R4 |
| E8tally/p | index.html <main> 内 <p> 计数 == R4 | 4 | 3 | Task 12 R4 |

## 闸门自身状态（D1–D5）

- SELF-SHA verify_task18.mjs = `dd5b3a9ebb5b07c92b8f925837f8a68db9fa5958cbcec9dc5fa69da5477f6602`
- SELF-SHA probe_task18.mjs = `2d3ab0fa17784ec80a743fb417d9615e6854ba5688c76806c9e38bec0be35caa`
- SELF-SHA probe_lib18.mjs = `36e6ed840a8f796546c0136d0c947e7cfb0d9c1f8e88104c4c02fe2bcab91412`
- SELF-SHA src_check.py = `305590410f96babd2133482ad3425e674d97ba5134a7040f35efdc9447c068e3`
- D1 快照绑定：M1–M5 共 25 条，快照过期即整组 FAIL（不使用旧值、不静默重探）
- D2 锚点解析：页集合/栏目/段落数/宿主/白名单/年份形态全部解析，无写死常量
- D3 崩溃处理：区块缺失记 FAIL；崩溃由 uncaughtException 记为一条 FAIL 并退出 1
- 只读证明：五处目录哈希前后逐项相等（R0/Results 等 5 条）

