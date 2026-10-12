# Task 10 结构与内容自动核验报告

- 核验时间：2026-10-02T08:28:27.614Z
- 交付目录：C:\Users\weibo\Documents\语文报纸\Results（核验前后 SHA-256 与清单见 A5）
- 真值来源：plan/Task1（哈希/逐段合同/字符数）、plan/Task2（页面登记表）、plan/Task4（首页三段冻结文本）、plan/Task3/5/6/7/8/9 合同
- DOM 真值：真实无头 Chrome（CDP）逐页只读快照 dom_facts.json；文本比较一律逐字符、不归一化
- 断言总数：222　PASS：206　FAIL：16　PENDING：0

```text
[A1] FAIL Results/ — 期望: 6 — 实际: 9 — 移交: 6 个文件
[A1] FAIL Results/ 文件名与大小写 — 期望: index.html, news-message.html, news-feature.html, news-commentary.html, styles.css, script.js — 实际:  多余: article-classroom-screen-upgrade.html,article-math-to-ai-learning.html,article-school-course-volunteer.html — 移交: Task 2
[A2] FAIL Results/ 目录清单 — 期望: 无子目录、无第七个文件、无临时/测试/截图/README/JSON/.map/包管理文件 — 实际: 子目录: 无；文件: article-classroom-screen-upgrade.html,article-math-to-ai-learning.html,article-school-course-volunteer.html,index.html,news-commentary.html,news-feature.html,news-message.html,script.js,styles.css — 移交: 对应上游任务
[A3] PASS 四个 HTML 首行
[A3] PASS DOM 解析
[A3] PASS styles.css / script.js
[A4] PASS Materials/
[A4] PASS Materials/ 命名
[A5] FAIL Results/ 六文件 SHA-256 与清单 — 期望: 与核验前基线一致（只读） — 实际: index.html=475E02F8BBF1 news-commentary.html=76AA950D2967 news-feature.html=485A8750D996 news-message.html=3A267591A4A9 script.js=ABB39E4A6D21 styles.css=DE2D9022625D — 移交: 核验工具自身（回查 A5）
[A4] PASS Materials/ 三份哈希+大小+mtime
[B1] PASS Materials/新闻消息.docx
[B2] PASS Materials/新闻通讯.docx
[B3] PASS Materials/新闻评价.docx
[B4] PASS 三份素材 — 完整 64 位十六进制比较，大小写不敏感，未使用前缀/大小/mtime 代替
[C1/index.html/lang] PASS index.html <html lang>
[C1/index.html/no-js] PASS index.html <html class>
[C1/index.html/runtime] PASS index.html 运行时 <html class>（渐进增强前提）
[C2/index.html/charset] PASS index.html meta[charset] 数量
[C2/index.html/charsetval] PASS index.html meta charset 值
[C2/index.html/viewport] PASS index.html viewport 数量
[C2/index.html/vpval] PASS index.html viewport 内容
[C2/index.html/titleN] PASS index.html <title> 数量
[C3/index.html] PASS index.html <title> textContent（全角｜）
[C4/index.html/css] PASS index.html 样式引用
[C4/index.html/js] PASS index.html 脚本引用
[C4/index.html/inline] PASS index.html 内联/内联事件/base/style 属性
[C4/index.html/noregex] PASS index.html 源码禁用模式
[C5/index.html] PASS index.html .skip-link
[C6/index.html] PASS index.html 公共壳节点数量
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
[C9/index.html/h1] PASS index.html <h1> 数量
[C9/index.html/h1cls] PASS index.html <h1> class
[C10/index.html] PASS index.html ID 唯一性
[C1/news-message.html/lang] PASS news-message.html <html lang>
[C1/news-message.html/no-js] PASS news-message.html <html class>
[C1/news-message.html/runtime] PASS news-message.html 运行时 <html class>（渐进增强前提）
[C2/news-message.html/charset] PASS news-message.html meta[charset] 数量
[C2/news-message.html/charsetval] PASS news-message.html meta charset 值
[C2/news-message.html/viewport] PASS news-message.html viewport 数量
[C2/news-message.html/vpval] PASS news-message.html viewport 内容
[C2/news-message.html/titleN] PASS news-message.html <title> 数量
[C3/news-message.html] FAIL news-message.html <title> textContent（全角｜） — 期望: 我校启动校本课程志愿填报｜自然选择号 — 实际: 新闻消息｜自然选择号 — 移交: Task 2
[C4/news-message.html/css] PASS news-message.html 样式引用
[C4/news-message.html/js] PASS news-message.html 脚本引用
[C4/news-message.html/inline] PASS news-message.html 内联/内联事件/base/style 属性
[C4/news-message.html/noregex] PASS news-message.html 源码禁用模式
[C5/news-message.html] PASS news-message.html .skip-link
[C6/news-message.html] PASS news-message.html 公共壳节点数量
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
[C9/news-message.html/h1] PASS news-message.html <h1> 数量
[C9/news-message.html/h1cls] PASS news-message.html <h1> class
[C10/news-message.html] PASS news-message.html ID 唯一性
[C1/news-feature.html/lang] PASS news-feature.html <html lang>
[C1/news-feature.html/no-js] PASS news-feature.html <html class>
[C1/news-feature.html/runtime] PASS news-feature.html 运行时 <html class>（渐进增强前提）
[C2/news-feature.html/charset] PASS news-feature.html meta[charset] 数量
[C2/news-feature.html/charsetval] PASS news-feature.html meta charset 值
[C2/news-feature.html/viewport] PASS news-feature.html viewport 数量
[C2/news-feature.html/vpval] PASS news-feature.html viewport 内容
[C2/news-feature.html/titleN] PASS news-feature.html <title> 数量
[C3/news-feature.html] FAIL news-feature.html <title> textContent（全角｜） — 期望: 从数学题到AI时代的学习｜自然选择号 — 实际: 新闻通讯｜自然选择号 — 移交: Task 2
[C4/news-feature.html/css] PASS news-feature.html 样式引用
[C4/news-feature.html/js] PASS news-feature.html 脚本引用
[C4/news-feature.html/inline] PASS news-feature.html 内联/内联事件/base/style 属性
[C4/news-feature.html/noregex] PASS news-feature.html 源码禁用模式
[C5/news-feature.html] PASS news-feature.html .skip-link
[C6/news-feature.html] PASS news-feature.html 公共壳节点数量
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
[C9/news-feature.html/h1] PASS news-feature.html <h1> 数量
[C9/news-feature.html/h1cls] PASS news-feature.html <h1> class
[C10/news-feature.html] PASS news-feature.html ID 唯一性
[C1/news-commentary.html/lang] PASS news-commentary.html <html lang>
[C1/news-commentary.html/no-js] PASS news-commentary.html <html class>
[C1/news-commentary.html/runtime] PASS news-commentary.html 运行时 <html class>（渐进增强前提）
[C2/news-commentary.html/charset] PASS news-commentary.html meta[charset] 数量
[C2/news-commentary.html/charsetval] PASS news-commentary.html meta charset 值
[C2/news-commentary.html/viewport] PASS news-commentary.html viewport 数量
[C2/news-commentary.html/vpval] PASS news-commentary.html viewport 内容
[C2/news-commentary.html/titleN] PASS news-commentary.html <title> 数量
[C3/news-commentary.html] FAIL news-commentary.html <title> textContent（全角｜） — 期望: 设备升级了，使用门槛也该降下来｜自然选择号 — 实际: 新闻评论｜自然选择号 — 移交: Task 2
[C4/news-commentary.html/css] PASS news-commentary.html 样式引用
[C4/news-commentary.html/js] PASS news-commentary.html 脚本引用
[C4/news-commentary.html/inline] PASS news-commentary.html 内联/内联事件/base/style 属性
[C4/news-commentary.html/noregex] PASS news-commentary.html 源码禁用模式
[C5/news-commentary.html] PASS news-commentary.html .skip-link
[C6/news-commentary.html] PASS news-commentary.html 公共壳节点数量
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
[C9/news-commentary.html/h1] PASS news-commentary.html <h1> 数量
[C9/news-commentary.html/h1cls] PASS news-commentary.html <h1> class
[C10/news-commentary.html] PASS news-commentary.html ID 唯一性
[D1/index.html] PASS index.html 导航四项文字/目标/顺序
[D1/news-message.html] PASS news-message.html 导航四项文字/目标/顺序
[D1/news-feature.html] PASS news-feature.html 导航四项文字/目标/顺序
[D1/news-commentary.html] PASS news-commentary.html 导航四项文字/目标/顺序
[D2] PASS 四页主导航链接总数
[D2] PASS 16 条导航目标
[D3/index.html] PASS index.html 唯一 aria-current="page"
[D4/index.html] PASS index.html 其余链接/报头无 aria-current；仅 <a>，值为 page
[D4/index.html/noli] PASS index.html <li>/<nav> 无 aria-current
[D3/news-message.html] PASS news-message.html 唯一 aria-current="page"
[D4/news-message.html] PASS news-message.html 其余链接/报头无 aria-current；仅 <a>，值为 page
[D4/news-message.html/noli] PASS news-message.html <li>/<nav> 无 aria-current
[D3/news-feature.html] PASS news-feature.html 唯一 aria-current="page"
[D4/news-feature.html] PASS news-feature.html 其余链接/报头无 aria-current；仅 <a>，值为 page
[D4/news-feature.html/noli] PASS news-feature.html <li>/<nav> 无 aria-current
[D3/news-commentary.html] PASS news-commentary.html 唯一 aria-current="page"
[D4/news-commentary.html] PASS news-commentary.html 其余链接/报头无 aria-current；仅 <a>，值为 page
[D4/news-commentary.html/noli] PASS news-commentary.html <li>/<nav> 无 aria-current
[E1] FAIL index.html #main-content 直接元素子节点 — 期望: h1.page-title → div.home-sections（忽略空白文本节点后恰两个） — 实际: h1.page-title , div.home-sections , div.home-latest — 移交: Task 4
[E1/h1] PASS index.html h1 文本
[E2] PASS index.html 区块数量
[E2/order] PASS index.html 三区块顺序
[E3] PASS index.html .home-section 子节点
[E4/ids] PASS index.html h2 id 顺序
[E4/labelledby] PASS index.html aria-labelledby
[E4/dup] PASS index.html 标题 ID 唯一
[E5] FAIL index.html 标题层级 — 期望: 1 个 h1 + 3 个同级 h2，无跳级/额外标题/h3 — 实际: h1=1 h2=4 h3=0 标题总数=5 — 移交: Task 4
[E6/P_ORIGIN] PASS index.html 第 1 段（名称由来）逐字符
[E6/P_WORK] PASS index.html 第 2 段（主要工作与报道方向）逐字符
[E6/P_FOUNDED] PASS index.html 第 3 段（成立时间）逐字符
[E6/len] PASS index.html 三段字符数（Task 4 冻结值长度）
[E6/punct] PASS index.html 三段标点与空格
[E6/all] PASS E6 汇总
[E7] PASS index.html 未替换记号
[E8] PASS index.html 可见内容白名单（按序 7 项）
[E8/noEighth] FAIL index.html 无第八项可见正文 — 期望: main 内仅 main/h1/div/section×3/h2×3/p×3，无 h3/列表/图片/链接 — 实际: a=3,div=2,h1=1,h2=4,li=3,main=1,p=3,section=3,span=6,ul=1 — 移交: Task 4
[F0-host/news-message.html] FAIL news-message.html 已不含 .article／dateline（归档层结构变更） — 期望: article 区块在场 — 实际: 区块缺失：显式 FAIL，不抛异常 — 移交: 接管：L1／L2／L3 + F 组重锚
[F0-host/news-feature.html] FAIL news-feature.html 已不含 .article／dateline（归档层结构变更） — 期望: article 区块在场 — 实际: 区块缺失：显式 FAIL，不抛异常 — 移交: 接管：L1／L2／L3 + F 组重锚
[F0-host/news-commentary.html] FAIL news-commentary.html 已不含 .article／dateline（归档层结构变更） — 期望: article 区块在场 — 实际: 区块缺失：显式 FAIL，不抛异常 — 移交: 接管：L1／L2／L3 + F 组重锚
[G0-host] FAIL G 组宿主 news-*.html — 期望: 可判定 — 实际: 崩溃被捕获：Cannot read properties of undefined (reading 'includes') — 移交: 接管：F／G 组重锚到 article-*.html
[H1] PASS 四页样式引用 / Results 样式文件数
[H2] PASS styles.css 外部资源
[H3] PASS styles.css 字体栈
[H3/noremote] PASS styles.css 远程字体
[H4] PASS styles.css 关键变量
[H5/id] PASS styles.css ID 选择器
[H5/important] PASS styles.css !important
[H5/pagepatch] PASS styles.css 页面识别补丁
[H6] PASS styles.css 当前页样式
[H7] PASS styles.css 被禁视觉模式
[H8] PASS styles.css 移动区段
[H8/other] PASS styles.css 误写断点
[H9] PASS styles.css 移动区段内容
[H10] PASS styles.css content 注入
[H11] FAIL styles.css 页面专属 class / 第二套移动主题变量 — 期望: 无 .mobile-*/.message-*/.feature-*/.commentary-*/.nowrap/.technical-term；CSS 类均可在 HTML 中找到 — 实际: 禁用命中=；HTML 中不存在的 CSS 类=article,article__header,article__type,article__byline,article__body,dateline,article__date — 移交: Task 8
[H11/root] PASS styles.css 移动 :root 覆盖范围
[H12] PASS styles.css 花括号与语法
[H12/browser] PASS styles.css 浏览器解析证据
[H12] PASS styles.css — 顶层块=63，声明块=93，移动区段规则=31，浏览器顶层规则=63
[I1] PASS script.js 唯一性与 defer
[I1/extra] PASS 第二脚本/polyfill/配置 JSON
[I2] PASS script.js 模块与外部依赖
[I3] PASS script.js console/debugger
[I4] PASS script.js 断点字符串
[I5] PASS script.js 状态写入范围
[I5/assign] PASS script.js 改写禁令
[I6] PASS script.js 查询依据
[I7] PASS script.js no-js→js 位置
[I8] PASS script.js 禁止信息（含注释）
[I9] PASS script.js 点击外部关闭
[I 事件绑定] PASS script.js — click , keydown , click , change
[J1] PASS Results/ 全文（3 个禁止串）
[J2] PASS Results/ 全文（1 个禁止串）
[J3] PASS Results/ 全文（1 个禁止串）
[J4] PASS Results/ 全文（60 个禁止串）
[J5] PASS Results/ 全文（8 个禁止串）
[J6] PASS Results/ 全文（9 个禁止串）
[J7] PASS Results/ 全文（6 个禁止串）
[J8] PASS Results/ 全文（10 个禁止串）
[J9] PASS Results/ 全文（2 个禁止串）
[J10] PASS Results/ 全文（6 个禁止串）
[J 说明] PASS Results/ — “记者”仅出现在 C05 冻结正文（article-classroom-screen-upgrade.html），被禁的是“记者：”署名前缀；扫描范围仅 Results/ 六文件
[K1/head] PASS 四页 <head> 规范化后一致
[K1/shell] PASS 四页 body（除 main）规范化后一致
[K1/html] PASS 四页 <html> 属性一致
[K2] PASS 四页 body 子元素序列一致
[K2/mains] FAIL K2 差异仅在各页 main 内容区 — 期望: 首页 h1.page-title+div.home-sections；三文章页 article.article — 实际: index.html:h1.page-title+div.home-sections+div.home-latest || news-message.html:h1.page-title+ul.entry-list || news-feature.html:h1.page-title+ul.entry-list || news-commentary.html:h1.page-title+ul.entry-list — 移交: Task 2
[K3] PASS K3 页面独有结构
```

## 失败项与移交清单

| 断言 | 文件/定位 | 期望 | 实际 | 移交 |
| --- | --- | --- | --- | --- |
| A1 | Results/ | 6 | 9 | 6 个文件 |
| A1 | Results/ 文件名与大小写 | index.html, news-message.html, news-feature.html, news-commentary.html, styles.css, script.js |  多余: article-classroom-screen-upgrade.html,article-math-to-ai-learning.html,article-school-course-volunteer.html | Task 2 |
| A2 | Results/ 目录清单 | 无子目录、无第七个文件、无临时/测试/截图/README/JSON/.map/包管理文件 | 子目录: 无；文件: article-classroom-screen-upgrade.html,article-math-to-ai-learning.html,article-school-course-volunteer.html,index.html,news-commentary.html,news-feature.html,news-message.html,script.js,styles.css | 对应上游任务 |
| A5 | Results/ 六文件 SHA-256 与清单 | 与核验前基线一致（只读） | index.html=475E02F8BBF1 news-commentary.html=76AA950D2967 news-feature.html=485A8750D996 news-message.html=3A267591A4A9 script.js=ABB39E4A6D21 styles.css=DE2D9022625D | 核验工具自身（回查 A5） |
| C3/news-message.html | news-message.html <title> textContent（全角｜） | 我校启动校本课程志愿填报｜自然选择号 | 新闻消息｜自然选择号 | Task 2 |
| C3/news-feature.html | news-feature.html <title> textContent（全角｜） | 从数学题到AI时代的学习｜自然选择号 | 新闻通讯｜自然选择号 | Task 2 |
| C3/news-commentary.html | news-commentary.html <title> textContent（全角｜） | 设备升级了，使用门槛也该降下来｜自然选择号 | 新闻评论｜自然选择号 | Task 2 |
| E1 | index.html #main-content 直接元素子节点 | h1.page-title → div.home-sections（忽略空白文本节点后恰两个） | h1.page-title , div.home-sections , div.home-latest | Task 4 |
| E5 | index.html 标题层级 | 1 个 h1 + 3 个同级 h2，无跳级/额外标题/h3 | h1=1 h2=4 h3=0 标题总数=5 | Task 4 |
| E8/noEighth | index.html 无第八项可见正文 | main 内仅 main/h1/div/section×3/h2×3/p×3，无 h3/列表/图片/链接 | a=3,div=2,h1=1,h2=4,li=3,main=1,p=3,section=3,span=6,ul=1 | Task 4 |
| F0-host/news-message.html | news-message.html 已不含 .article／dateline（归档层结构变更） | article 区块在场 | 区块缺失：显式 FAIL，不抛异常 | 接管：L1／L2／L3 + F 组重锚 |
| F0-host/news-feature.html | news-feature.html 已不含 .article／dateline（归档层结构变更） | article 区块在场 | 区块缺失：显式 FAIL，不抛异常 | 接管：L1／L2／L3 + F 组重锚 |
| F0-host/news-commentary.html | news-commentary.html 已不含 .article／dateline（归档层结构变更） | article 区块在场 | 区块缺失：显式 FAIL，不抛异常 | 接管：L1／L2／L3 + F 组重锚 |
| G0-host | G 组宿主 news-*.html | 可判定 | 崩溃被捕获：Cannot read properties of undefined (reading 'includes') | 接管：F／G 组重锚到 article-*.html |
| H11 | styles.css 页面专属 class / 第二套移动主题变量 | 无 .mobile-*/.message-*/.feature-*/.commentary-*/.nowrap/.technical-term；CSS 类均可在 HTML 中找到 | 禁用命中=；HTML 中不存在的 CSS 类=article,article__header,article__type,article__byline,article__body,dateline,article__date | Task 8 |
| K2/mains | K2 差异仅在各页 main 内容区 | 首页 h1.page-title+div.home-sections；三文章页 article.article | index.html:h1.page-title+div.home-sections+div.home-latest \|\| news-message.html:h1.page-title+ul.entry-list \|\| news-feature.html:h1.page-title+ul.entry-list \|\| news-commentary.html:h1.page-title+ul.entry-list | Task 2 |

## 未覆盖项（按合同移交 Task 11）

- 真实渲染版心/字号/行高/对比度、375/768/769/1280px 与 200% 缩放、菜单点击/Esc/焦点/跨断点重置、禁用 JS/CSS 降级、控制台 0 报错与资源 404。

## 完成定义对照（Task 10 验收清单）

| 完成定义项 | 覆盖断言 | 状态 |
| --- | --- | --- |
| 核验全程只读；六交付文件与三份素材在核验前后 SHA-256 与清单一致 | /^A5$|^A4/ | ✘ 1 项未通过 / 4（baseline/hashes_before.txt ↔ hashes_after_check.txt） |
| A 组：Results/ 恰好六个文件、命名精确、无第七个文件或临时产物 | /^A/ | ✘ 4 项未通过 / 10 |
| B 组：三份素材 SHA-256 完整匹配 Task 1 冻结值 | /^B/ | ✔ 全绿（4 条） |
| C、D、K 组：公共壳、<head>、稳定 ID／class、ARIA、16 条导航、四个唯一当前项、跨页一致 | /^(C|D|K)/ | ✘ 4 项未通过 / 144 |
| E 组：首页三区块节点／标题／ID／aria-labelledby／顺序／白名单，E6 逐字符 | /^E/ | ✘ 3 项未通过 / 18 |
| F 组：三篇 .article 结构、段落数 4／23／29+1、电头与日期边界、逐项 textContent | /^F/ | ✘ 3 项未通过 / 3 |
| G 组：三页高风险字符与计数断言 | /^G/ | ✘ 1 项未通过 / 1 |
| H 组：styles.css 无外部资源／ID／!important／被禁视觉模式，移动区段 max-width: 768px | /^H/ | ✘ 1 项未通过 / 19 |
| I 组：script.js 唯一、defer、无外部依赖与 console、断点 769px、三处状态、无点击外部关闭 | /^I/ | ✔ 全绿（12 条） |
| J 组：Results/ 禁止项全局扫描逐项为 0 | /^J/ | ✔ 全绿（11 条） |
| 可追溯核验报告（本报告，位于 Results/ 之外） | /^A/ | ✘ 4 项未通过 / 10（report.md） |
| 临时脚本与报告均在 Results/ 之外 | /^A2/ | ✘ 1 项未通过 / 1（_qa_task10/） |

## 变异对照（核验器自身有效性）

- 见 mutation_log.md：向 Results/ 副本注入违约后，对应断言必须翻红；真实交付目录未被触碰。