# Task 2 浏览器实测记录（file:// 直开）

工具：Qoder 内置浏览器（Chrome），URL 前缀
`file:///C:/Users/weibo/Documents/%E8%AF%AD%E6%96%87%E6%8A%A5%E7%BA%B8/Results/`
时间：2026-09-19 00:47–00:48。四页全部真实打开，无 JS 运行错误。

## 逐页实测结果

| 页面 | `document.title` | `h1.page-title` | `[aria-current]` | `html.className` | `lang` | `<main>` 元素子节点 |
| --- | --- | --- | --- | --- | --- | --- |
| `index.html` | `《自然选择号》报社简介｜自然选择号` | `《自然选择号》报社简介` | `A｜首页｜page` | `no-js` | `zh-CN` | 1（H1） |
| `news-message.html` | `我校启动校本课程志愿填报｜自然选择号` | `我校启动校本课程志愿填报` | `A｜新闻消息｜page` | `no-js` | `zh-CN` | 1（H1） |
| `news-feature.html` | `从数学题到AI时代的学习｜自然选择号` | `从数学题到AI时代的学习` | `A｜新闻通讯｜page` | `no-js` | `zh-CN` | 1（H1） |
| `news-commentary.html` | `设备升级了，使用门槛也该降下来｜自然选择号` | `设备升级了，使用门槛也该降下来` | `A｜新闻评论｜page` | `no-js` | `zh-CN` | 1（H1） |

每页导航链接实测均为 `首页>index.html | 新闻消息>news-message.html | 新闻通讯>news-feature.html | 新闻评论>news-commentary.html`，
四页合计 16 条；每页 `[aria-current]` 数组长度恰为 1；重复 ID 列表四页均为空，`[id]` 实测为
`nav-toggle, site-navigation, main-content` 各一次。

## 无障碍树实测（index.html）

```
RootWebArea "《自然选择号》报社简介｜自然选择号"
  link "跳至正文"  url=...index.html#main-content
  banner
    link "自然选择号"  url=...index.html
    button "菜单"  controls="site-navigation"  expandable  invalid="false"
    navigation "主导航"
      link "首页" / link "新闻消息" / link "新闻通讯" / link "新闻评论"
  main focusable
    heading "《自然选择号》报社简介" level="1"
```

- 报头是普通段落，未占用任何标题层级：`h1` 计数 1，`h2–h6` 计数 0。
- 导航在无障碍树中完整可见（源码未加 `hidden`/`aria-hidden`/`is-open`，实测
  `navOpen = ["site-navigation", false, null]`），即无 JavaScript 时四个链接仍可访问。
- `<button>` 实测 `BUTTON, type=button, aria-controls=site-navigation, aria-expanded=false, textContent=菜单`，
  内部 `aria-hidden="true"` 装饰节点 1 个且无文本。

## 键盘顺序与跳转实测

- 焦点顺序（DOM 顺序，无正向 `tabindex`）：
  `skip-link:跳至正文 → site-masthead__link:自然选择号 → nav-toggle:菜单 → 首页 → 新闻消息 → 新闻通讯 → 新闻评论`
  汉堡按钮位于其受控导航之前，符合合同。
- 跳至正文实测：对 `.skip-link` 调用 `click()` 后 `location.hash = "#main-content"`，
  `document.activeElement = MAIN.main-content` —— 证明 `tabindex="-1"` 的作用正确，
  且它不是常规 Tab 停靠点（顺序里未出现 main）。
- `document.compatMode = CSS1Compat`（标准模式，doctype 生效）。

## 链接解析实测

在 `index.html` 用真实点击（不是脚本跳转）点击导航第 2 项，浏览器实际导航到
`.../Results/news-message.html`；四页 16 个目标在 `file://` 下全部可解析，
未出现任何导航目标的 `ERR_FILE_NOT_FOUND`。

## 控制台消息（全部 2 条，均为预期的资源缺失）

```
[error] Failed to load resource: net::ERR_FILE_NOT_FOUND  (.../Results/styles.css)
[error] Failed to load resource: net::ERR_FILE_NOT_FOUND  (.../Results/script.js)
```

按本任务边界，`styles.css` 属 Task 3、`script.js` 属 Task 9，中间态不存在不视为 Task 2 失败；
引用本身实测为同目录相对路径（`link.href = stylesheet|styles.css`、
`script.src = script.js, defer=true, type="", 内联长度=0`）。未创建空占位文件来掩盖这两条提示。
