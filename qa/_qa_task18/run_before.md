# Task 10 结构与内容自动核验报告

- 核验时间：2026-10-02T08:28:27.394Z
- 交付目录：C:\Users\weibo\Documents\语文报纸\_qa_task15\before（核验前后 SHA-256 与清单见 A5）
- 真值来源：plan/Task1（哈希/逐段合同/字符数）、plan/Task2（页面登记表）、plan/Task4（首页三段冻结文本）、plan/Task3/5/6/7/8/9 合同
- DOM 真值：真实无头 Chrome（CDP）逐页只读快照 dom_facts.json；文本比较一律逐字符、不归一化
- 断言总数：289　PASS：288　FAIL：1　PENDING：0

```text
[A1] PASS Results/
[A1] PASS Results/ 文件名与大小写
[A2] PASS Results/ 目录清单
[A3] PASS 四个 HTML 首行
[A3] PASS DOM 解析
[A3] PASS styles.css / script.js
[A4] PASS Materials/
[A4] PASS Materials/ 命名
[A5] FAIL Results/ 六文件 SHA-256 与清单 — 期望: 与核验前基线一致（只读） — 实际: index.html=971E57A5F85B news-commentary.html=A2DBF4AAC574 news-feature.html=73FF75678C45 news-message.html=66AE5826BBDF script.js=ABB39E4A6D21 styles.css=2C2381729949 — 移交: 核验工具自身（回查 A5）
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
[C3/news-message.html] PASS news-message.html <title> textContent（全角｜）
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
[C3/news-feature.html] PASS news-feature.html <title> textContent（全角｜）
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
[C3/news-commentary.html] PASS news-commentary.html <title> textContent（全角｜）
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
[E1] PASS index.html #main-content 直接元素子节点
[E1/h1] PASS index.html h1 文本
[E2] PASS index.html 区块数量
[E2/order] PASS index.html 三区块顺序
[E3] PASS index.html .home-section 子节点
[E4/ids] PASS index.html h2 id 顺序
[E4/labelledby] PASS index.html aria-labelledby
[E4/dup] PASS index.html 标题 ID 唯一
[E5] PASS index.html 标题层级
[E6/P_ORIGIN] PASS index.html 第 1 段（名称由来）逐字符
[E6/P_WORK] PASS index.html 第 2 段（主要工作与报道方向）逐字符
[E6/P_FOUNDED] PASS index.html 第 3 段（成立时间）逐字符
[E6/len] PASS index.html 三段字符数（Task 4 冻结值长度）
[E6/punct] PASS index.html 三段标点与空格
[E6/all] PASS E6 汇总
[E7] PASS index.html 未替换记号
[E8] PASS index.html 可见内容白名单（按序 7 项）
[E8/noEighth] PASS index.html 无第八项可见正文
[F1/news-message.html] PASS news-message.html #main-content 唯一子节点
[F1/news-message.html/order] PASS news-message.html .article 子节点顺序
[F2/news-message.html] PASS news-message.html .article__header 直接子元素
[F3/news-message.html] PASS news-message.html .article__type
[F3/news-message.html/no评价] PASS news-message.html 不出现“新闻评价”
[F4/news-message.html] PASS news-message.html h1.page-title textContent
[F4/news-message.html/cls] PASS news-message.html h1 class
[F5/news-message.html] PASS news-message.html .article__byline
[F5/news-message.html/prefix] PASS news-message.html 署名前缀
[F6/news-message.html] PASS news-message.html .article__body > p 数量
[F7/news-message.html] PASS news-message.html 逐段 textContent 严格相等
[F7/news-message.html/chars] PASS news-message.html 逐段字符数（Task 1 §3 字符数基线）
[F8/news-message.html/node] PASS news-message.html 电头为首个正文 <p> 的首个子节点
[F8/news-message.html/text] PASS news-message.html strong.dateline textContent
[F8/news-message.html/space] PASS news-message.html 电头后紧邻空格
[F8/news-message.html/one] PASS news-message.html 电头唯一性与无多余空格
[F9/news-message.html] PASS news-message.html 不得出现 .article__date
[F10/news-message.html] PASS news-message.html 正文禁用内联/块级标签
[F10/news-message.html/ul] PASS news-message.html 唯一 <ul> 为导航列表
[F11] PASS news-message.html 段落空白规范
[F1/news-feature.html] PASS news-feature.html #main-content 唯一子节点
[F1/news-feature.html/order] PASS news-feature.html .article 子节点顺序
[F2/news-feature.html] PASS news-feature.html .article__header 直接子元素
[F3/news-feature.html] PASS news-feature.html .article__type
[F3/news-feature.html/no评价] PASS news-feature.html 不出现“新闻评价”
[F4/news-feature.html] PASS news-feature.html h1.page-title textContent
[F4/news-feature.html/cls] PASS news-feature.html h1 class
[F5/news-feature.html] PASS news-feature.html .article__byline
[F5/news-feature.html/prefix] PASS news-feature.html 署名前缀
[F6/news-feature.html] PASS news-feature.html .article__body > p 数量
[F7/news-feature.html] PASS news-feature.html 逐段 textContent 严格相等
[F7/news-feature.html/chars] PASS news-feature.html 逐段字符数（Task 1 §3 字符数基线）
[F8/news-feature.html/node] PASS news-feature.html 电头为首个正文 <p> 的首个子节点
[F8/news-feature.html/text] PASS news-feature.html strong.dateline textContent
[F8/news-feature.html/space] PASS news-feature.html 电头后紧邻空格
[F8/news-feature.html/one] PASS news-feature.html 电头唯一性与无多余空格
[F9/news-feature.html] PASS news-feature.html 不得出现 .article__date
[F10/news-feature.html] PASS news-feature.html 正文禁用内联/块级标签
[F10/news-feature.html/ul] PASS news-feature.html 唯一 <ul> 为导航列表
[F11] PASS news-feature.html 段落空白规范
[F1/news-commentary.html] PASS news-commentary.html #main-content 唯一子节点
[F1/news-commentary.html/order] PASS news-commentary.html .article 子节点顺序
[F2/news-commentary.html] PASS news-commentary.html .article__header 直接子元素
[F3/news-commentary.html] PASS news-commentary.html .article__type
[F3/news-commentary.html/no评价] PASS news-commentary.html 不出现“新闻评价”
[F4/news-commentary.html] PASS news-commentary.html h1.page-title textContent
[F4/news-commentary.html/cls] PASS news-commentary.html h1 class
[F5/news-commentary.html] PASS news-commentary.html .article__byline
[F5/news-commentary.html/prefix] PASS news-commentary.html 署名前缀
[F6/news-commentary.html] PASS news-commentary.html .article__body > p 数量
[F7/news-commentary.html] PASS news-commentary.html 逐段 textContent 严格相等
[F7/news-commentary.html/chars] PASS news-commentary.html 逐段字符数（Task 1 §3 字符数基线）
[F8/news-commentary.html] PASS news-commentary.html 评论页无 .dateline
[F9/news-commentary.html] PASS news-commentary.html .article__date 位置
[F9/news-commentary.html/text] PASS news-commentary.html 末尾日期逐字符
[F9/news-commentary.html/form] PASS news-commentary.html 末尾日期全角括号/无年份
[F10/news-commentary.html] PASS news-commentary.html 正文禁用内联/块级标签
[F10/news-commentary.html/ul] PASS news-commentary.html 唯一 <ul> 为导航列表
[F11] PASS news-commentary.html 段落空白规范
[G1/has:今日7时] PASS news-message.html 正文含 今日7时
[G1/has:47个社团] PASS news-message.html 正文含 47个社团
[G1/has:第一志愿、第二志愿] PASS news-message.html 正文含 第一志愿、第二志愿
[G1/has:9月18日7时电] PASS news-message.html 正文含 9月18日7时电
[G1/semi] PASS news-message.html M02 中文分号
[G1/noyear] PASS news-message.html 9月18日 前无年份
[G2] PASS news-feature.html 23 段合并计数
[G2/contract] PASS G2 期望值与 Task 1 合同一致性
[G2/dash-adj] PASS news-feature.html 破折号
[G2/pron] PASS news-feature.html 人称未统一
[G2/title-ai] PASS news-feature.html 标题+正文 AI 合计 20
[G3] PASS news-commentary.html 高风险计数
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
[H11] PASS styles.css 页面专属 class / 第二套移动主题变量
[H11/root] PASS styles.css 移动 :root 覆盖范围
[H12] PASS styles.css 花括号与语法
[H12/browser] PASS styles.css 浏览器解析证据
[H12] PASS styles.css — 顶层块=45，声明块=72，移动区段规则=28，浏览器顶层规则=45
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
[J 说明] PASS Results/ — “记者”仅出现在 C05 冻结正文（news-commentary.html），被禁的是“记者：”署名前缀；扫描范围仅 Results/ 六文件
[K1/head] PASS 四页 <head> 规范化后一致
[K1/shell] PASS 四页 body（除 main）规范化后一致
[K1/html] PASS 四页 <html> 属性一致
[K2] PASS 四页 body 子元素序列一致
[K2/mains] PASS K2 差异仅在各页 main 内容区
[K3] PASS K3 页面独有结构
```

## 失败项与移交清单

| 断言 | 文件/定位 | 期望 | 实际 | 移交 |
| --- | --- | --- | --- | --- |
| A5 | Results/ 六文件 SHA-256 与清单 | 与核验前基线一致（只读） | index.html=971E57A5F85B news-commentary.html=A2DBF4AAC574 news-feature.html=73FF75678C45 news-message.html=66AE5826BBDF script.js=ABB39E4A6D21 styles.css=2C2381729949 | 核验工具自身（回查 A5） |

## 未覆盖项（按合同移交 Task 11）

- 真实渲染版心/字号/行高/对比度、375/768/769/1280px 与 200% 缩放、菜单点击/Esc/焦点/跨断点重置、禁用 JS/CSS 降级、控制台 0 报错与资源 404。

## 完成定义对照（Task 10 验收清单）

| 完成定义项 | 覆盖断言 | 状态 |
| --- | --- | --- |
| 核验全程只读；六交付文件与三份素材在核验前后 SHA-256 与清单一致 | /^A5$|^A4/ | ✘ 1 项未通过 / 4（baseline/hashes_before.txt ↔ hashes_after_check.txt） |
| A 组：Results/ 恰好六个文件、命名精确、无第七个文件或临时产物 | /^A/ | ✘ 1 项未通过 / 10 |
| B 组：三份素材 SHA-256 完整匹配 Task 1 冻结值 | /^B/ | ✔ 全绿（4 条） |
| C、D、K 组：公共壳、<head>、稳定 ID／class、ARIA、16 条导航、四个唯一当前项、跨页一致 | /^(C|D|K)/ | ✔ 全绿（144 条） |
| E 组：首页三区块节点／标题／ID／aria-labelledby／顺序／白名单，E6 逐字符 | /^E/ | ✔ 全绿（18 条） |
| F 组：三篇 .article 结构、段落数 4／23／29+1、电头与日期边界、逐项 textContent | /^F/ | ✔ 全绿（59 条） |
| G 组：三页高风险字符与计数断言 | /^G/ | ✔ 全绿（12 条） |
| H 组：styles.css 无外部资源／ID／!important／被禁视觉模式，移动区段 max-width: 768px | /^H/ | ✔ 全绿（19 条） |
| I 组：script.js 唯一、defer、无外部依赖与 console、断点 769px、三处状态、无点击外部关闭 | /^I/ | ✔ 全绿（12 条） |
| J 组：Results/ 禁止项全局扫描逐项为 0 | /^J/ | ✔ 全绿（11 条） |
| 可追溯核验报告（本报告，位于 Results/ 之外） | /^A/ | ✘ 1 项未通过 / 10（report.md） |
| 临时脚本与报告均在 Results/ 之外 | /^A2/ | ✔ 全绿（1 条）（_qa_task10/） |

## 变异对照（核验器自身有效性）

- 见 mutation_log.md：向 Results/ 副本注入违约后，对应断言必须翻红；真实交付目录未被触碰。