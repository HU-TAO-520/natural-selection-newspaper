# Task 2 建立共享 HTML 壳与导航

## 任务定位

本文件将总方案中的 Task 2 细化为一个可以独立执行、独立验收的工作包。它负责在 `Results/` 中建立四个页面的统一 HTML 外壳，固定站点报头、主导航、移动菜单按钮、跳至正文链接、正文入口以及共享资源引用。

Task 2 只建立结构和接口，不录入首页介绍、文章署名或文章正文，不实现视觉样式，也不实现菜单交互。完成本任务后，Task 3、Task 4–Task 9 可以在不改动公共壳接口的前提下继续工作。

## 目标

- 同时创建四个可独立打开、结构有效的 HTML 页面。
- 让四页共用一套稳定的报头和导航结构，避免页面之间产生漂移。
- 固定每页的文档标题、唯一主标题和当前导航项。
- 为桌面导航、移动端折叠菜单和无 JavaScript 降级预留一致的 DOM 接口。
- 保证所有页面、样式和脚本引用均可在 `file://` 环境下通过同目录相对路径解析。
- 为后续样式、内容、交互和自动核验任务提供明确且不可含糊的结构合同。

## 前置条件与后续依赖

- 前置条件：Task 1 已完成，三个文章标题和公开页面类型已经冻结。
- 直接依赖本任务的工作：Task 3 桌面视觉、Task 4 首页内容、Task 5–Task 7 三个文章页、Task 8 移动端布局、Task 9 导航脚本、Task 10 结构核验、Task 11 浏览器回归。
- 阻断规则：如果页面文件名、导航名称、文章标题或输出目录发生变更，应先更新本任务的页面登记表和导航矩阵，再创建 HTML；不得一边实现一边猜测新名称。
- 接口稳定规则：本任务完成后，后续任务不得随意重命名本文件规定的公共类名和 ID。确需变更时，必须同步检查四页、`styles.css`、`script.js` 和 Task 10 的核验规则。

## 交付物与文件所有权

Task 2 创建或修改以下四个文件：

- `Results/index.html`
- `Results/news-message.html`
- `Results/news-feature.html`
- `Results/news-commentary.html`

本任务只在四个 HTML 中写入对以下共享文件的引用，不负责创建或填充它们：

- `Results/styles.css`：由 Task 3 创建并由 Task 8 补充响应式规则。
- `Results/script.js`：由 Task 9 创建。

在 Task 2 的独立中间状态下，`styles.css` 或 `script.js` 尚不存在不视为本任务失败；不得为了消除临时的资源缺失提示而创建空占位文件。若这两个文件已经存在，本任务不得改动其内容。

## 页面登记表

下表中的值是 Task 2 写入四页的唯一页面级差异。文章标题不添加书名号，首页主标题按总方案保留书名号。

| 文件 | `<title>` 完整文本 | `<h1>` 完整文本 | 当前导航项 | 后续内容任务 |
| --- | --- | --- | --- | --- |
| `index.html` | `《自然选择号》报社简介｜自然选择号` | `《自然选择号》报社简介` | 首页 | Task 4 |
| `news-message.html` | `我校启动校本课程志愿填报｜自然选择号` | `我校启动校本课程志愿填报` | 新闻消息 | Task 5 |
| `news-feature.html` | `从数学题到AI时代的学习｜自然选择号` | `从数学题到AI时代的学习` | 新闻通讯 | Task 6 |
| `news-commentary.html` | `设备升级了，使用门槛也该降下来｜自然选择号` | `设备升级了，使用门槛也该降下来` | 新闻评论 | Task 7 |

页面登记表中的 `｜` 是全角竖线，属于浏览器标签页标题；它不属于新闻原文的文章标题。四页的 `<h1>` 不包含该分隔符和站点名后缀。

## 公共结构合同

### 1. 文档级结构

每个页面都必须按以下顺序包含：

1. `<!doctype html>`。
2. 带有 `lang="zh-CN"` 和初始 `class="no-js"` 的 `<html>`。
3. 唯一的 `<head>`。
4. 唯一的 `<body>`。
5. 作为 `<body>` 第一个可聚焦元素的跳至正文链接。
6. 唯一的站点 `<header>`，内部依次为报头、菜单按钮和主导航。
7. 唯一的 `<main id="main-content">`。

不得在公共壳之外增加页脚、侧栏、搜索框、面包屑、文章推荐、版权年份或其他站点级区域。

### 2. `<head>` 合同

四页的 `<head>` 采用相同顺序，仅 `<title>` 文本不同：

```html
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>页面登记表中的完整标题</title>
  <link rel="stylesheet" href="styles.css">
  <script src="script.js" defer></script>
</head>
```

具体要求：

- `charset`、viewport、`<title>`、样式引用和脚本引用各出现一次。
- `styles.css` 和 `script.js` 均使用同目录相对路径，不带 `/` 前缀、盘符、反斜杠、查询参数或 URL 片段。
- 脚本是普通脚本，只使用 `defer`；不使用 `type="module"`、`async` 或内联初始化代码。
- 不使用 `<base>`，防止改变 `file://` 下的相对路径解析。
- 不添加联网字体、预连接、canonical、Open Graph、外部图标或其他未经要求的元数据。
- 不在四个页面中复制内联 `<style>` 或内联事件处理器。

### 3. 正文前公共壳合同

以下模板是四页公共结构的权威版本：

```html
<body>
  <a class="skip-link" href="#main-content">跳至正文</a>

  <header class="site-header">
    <div class="site-header__inner">
      <p class="site-masthead">
        <a class="site-masthead__link" href="index.html">自然选择号</a>
      </p>

      <button
        class="nav-toggle"
        id="nav-toggle"
        type="button"
        aria-controls="site-navigation"
        aria-expanded="false"
      >
        <span class="nav-toggle__icon" aria-hidden="true"></span>
        <span class="nav-toggle__text">菜单</span>
      </button>

      <nav class="site-navigation" id="site-navigation" aria-label="主导航">
        <ul class="site-navigation__list">
          <li class="site-navigation__item">
            <a class="site-navigation__link" href="index.html">首页</a>
          </li>
          <li class="site-navigation__item">
            <a class="site-navigation__link" href="news-message.html">新闻消息</a>
          </li>
          <li class="site-navigation__item">
            <a class="site-navigation__link" href="news-feature.html">新闻通讯</a>
          </li>
          <li class="site-navigation__item">
            <a class="site-navigation__link" href="news-commentary.html">新闻评论</a>
          </li>
        </ul>
      </nav>
    </div>
  </header>

  <main class="main-content" id="main-content" tabindex="-1">
    <h1 class="page-title">页面登记表中的主标题</h1>
  </main>
</body>
```

创建具体页面时，必须在对应导航链接上加入且只加入一个 `aria-current="page"`。上方模板为了保持中立没有预设当前项，不能原样作为任何一个最终页面交付。

### 4. 最小正文状态

Task 2 完成时，每页 `<main>` 中只保留页面登记表规定的一个 `<h1>`：

- `<h1>` 不是临时占位符，后续任务必须保留其文字和唯一性。
- Task 4 负责在首页 `<main>` 中加入三个介绍区块及占位文本。
- Task 5–Task 7 负责在文章页加入页面类型、署名、正文和评论页日期。
- 后续内容任务可以为 `<main>` 增加 `<article>`、内容头部或正文容器，但不得改变 `main-content` 的 ID，也不得生成第二个 `<h1>`。
- Task 2 不写入“内容待补充”、Lorem ipsum、正文编号、开发注释或其他可见临时文本。

## 公共接口清单

下列接口一经 Task 2 建立，即视为后续任务共同依赖的合同：

| 接口 | 类型 | 用途与不变量 |
| --- | --- | --- |
| `html.no-js` | 状态类 | HTML 源码中的初始状态；Task 9 启动后替换为 `js` |
| `.skip-link` | 样式钩子 | 指向 `#main-content`，文字固定为“跳至正文” |
| `.site-header` | 结构与样式钩子 | 包含报头、按钮和导航；四页结构一致 |
| `.site-header__inner` | 布局钩子 | Task 3 和 Task 8 用于控制版心与响应式排列 |
| `.site-masthead` | 语义与样式钩子 | 使用普通段落而不是标题，避免产生第二个 `<h1>` |
| `.site-masthead__link` | 样式钩子 | 文字固定为“自然选择号”，始终链接 `index.html` |
| `#nav-toggle` | 脚本接口 | 四页唯一菜单按钮，Task 9 通过此 ID 绑定交互 |
| `.nav-toggle` | 样式钩子 | Task 8 控制移动端显示和桌面端隐藏 |
| `.nav-toggle__icon` | 装饰钩子 | 只用于 CSS 绘制图形，保持 `aria-hidden="true"` |
| `.nav-toggle__text` | 可访问名称 | 可见文字“菜单”，不得只保留无文本图标 |
| `#site-navigation` | 脚本与 ARIA 接口 | 必须与按钮的 `aria-controls` 完全匹配 |
| `.site-navigation` | 样式与状态钩子 | Task 9 在此元素上切换 `is-open`；源码初始不带该类 |
| `.site-navigation__list` | 列表布局钩子 | 只包含四个直接列表项，顺序固定 |
| `.site-navigation__item` | 列表项钩子 | 每项只包含一个导航链接 |
| `.site-navigation__link` | 链接样式钩子 | 当前页通过 `[aria-current="page"]` 区分，不另造状态文本 |
| `#main-content` | 锚点与脚本接口 | 每页唯一；承接跳至正文链接 |
| `.main-content` | 页面版心钩子 | Task 3 和 Task 8 的主要内容布局入口 |
| `.page-title` | 标题样式钩子 | 页面唯一 `<h1>`，文字由页面登记表决定 |

ID 用于唯一目标和脚本查询，class 用于样式及可复用状态。后续任务不得用重复 ID 代替 class，也不得让 JavaScript 依赖易变化的中文链接文本。

## 导航合同

### 1. 固定顺序与目标

四页的主导航都严格采用以下顺序和文本：

1. `首页` → `index.html`
2. `新闻消息` → `news-message.html`
3. `新闻通讯` → `news-feature.html`
4. `新闻评论` → `news-commentary.html`

不得使用目录绝对路径、`file://` 地址、反斜杠、`href="#"`、JavaScript URL 或新窗口打开。当前页链接保持可点击，不替换为 `<span>`。

### 2. 四页导航矩阵

| 来源页面 | 首页链接 | 新闻消息链接 | 新闻通讯链接 | 新闻评论链接 |
| --- | --- | --- | --- | --- |
| `index.html` | `index.html`，当前 | `news-message.html` | `news-feature.html` | `news-commentary.html` |
| `news-message.html` | `index.html` | `news-message.html`，当前 | `news-feature.html` | `news-commentary.html` |
| `news-feature.html` | `index.html` | `news-message.html` | `news-feature.html`，当前 | `news-commentary.html` |
| `news-commentary.html` | `index.html` | `news-message.html` | `news-feature.html` | `news-commentary.html`，当前 |

矩阵共 16 条主导航路径。每个“当前”单元格对应的 `<a>` 添加 `aria-current="page"`；同页其余三个导航链接和报头链接都不得带 `aria-current`。

### 3. 当前页语义

- `aria-current="page"` 只放在实际链接 `<a>` 上，不放在 `<li>` 或 `<nav>` 上。
- 每页恰好出现一次 `aria-current`，其值必须是 `page`。
- 不使用 `aria-selected`、`aria-pressed` 或仅靠颜色表达当前页面。
- Task 3 可以直接使用 `.site-navigation__link[aria-current="page"]` 设置视觉状态。

## 菜单按钮与渐进增强合同

### 1. Task 2 固定的初始状态

- `<html>` 初始类为 `no-js`，不能在源文件中预写 `js`。
- 菜单按钮使用原生 `<button type="button">`，不额外添加 `role="button"` 或 `tabindex="0"`。
- 按钮初始 `aria-expanded="false"`，并通过 `aria-controls="site-navigation"` 指向真实存在的导航。
- 导航初始不带 `hidden`、`aria-hidden` 或 `is-open`，确保无 JavaScript 时链接仍在文档和无障碍树中。
- 按钮必须保留可见文本“菜单”；装饰图形不参与可访问名称。
- 不在 HTML 中添加 `onclick`、`onkeydown` 或其他内联行为。

### 2. 后续任务必须实现的状态关系

| 环境与状态 | `html` 类 | 按钮 | 导航 | `aria-expanded` |
| --- | --- | --- | --- | --- |
| JavaScript 不可用 | `no-js` | 由 CSS 隐藏 | 始终可见 | 源码为 `false`，但按钮不可操作也不可见 |
| JavaScript 可用、移动端关闭 | `js` | 可见 | 不带 `is-open`，视觉折叠 | `false` |
| JavaScript 可用、移动端打开 | `js` | 可见 | 带 `is-open`，视觉展开 | `true` |
| 宽度至少 769px | `js` 或 `no-js` | 隐藏 | 始终可见 | Task 9 重置为 `false` |

Task 8 负责上述显示规则，Task 9 负责类和 ARIA 状态同步。Task 2 只提供能够实现这些状态的正确初始 DOM，不提前编写 CSS 或 JavaScript。

## 无障碍与语义规则

- 跳至正文链接是 `<body>` 中第一个可聚焦元素，目标 `#main-content` 必须存在且唯一。
- `<main tabindex="-1">` 允许浏览器在激活跳转链接后把程序化焦点落到正文区域；不得把它改成常规 Tab 停靠点 `tabindex="0"`。
- 站点报头不能使用 `<h1>`，因为页面正文已经有唯一主标题。
- 主导航使用原生 `<nav>`、`<ul>`、`<li>` 和 `<a>`，不添加应用菜单专用的 `role="menu"` 或 `role="menuitem"`。
- `<nav>` 的可访问名称固定为“主导航”。
- 汉堡按钮在 DOM 中位于受控导航之前，Tab 顺序自然且可预测。
- 不对导航容器使用 `aria-hidden`，也不通过负 `tabindex` 让链接永久退出键盘顺序。
- 不添加重复的屏幕阅读器专用当前页文本；`aria-current` 已提供该语义。

## 本地文件兼容规则

- 四个 HTML 文件和两个共享资源都位于同一个 `Results/` 目录，因此所有 `href` 和 `src` 直接使用文件名。
- 不使用以 `/` 开头的根相对路径；在 `file://` 下这类路径会错误指向磁盘根目录。
- 不写入开发服务器地址、localhost、CDN、网络字体或远程图片。
- 不依赖 URL 重写、目录默认页、ES module、`fetch`、动态模板或构建产物。
- 文件名大小写和页面登记表完全一致，避免在大小写敏感环境中产生仅在 Windows 上不暴露的死链。

## 任务范围

### 必须完成

1. 确认或创建 `Results/` 目录，不改动 `Materials/`。
2. 按公共结构合同创建四个 HTML 文件。
3. 写入每页准确的 `<title>` 和唯一 `<h1>`。
4. 在四页重复同一套报头、按钮和主导航结构。
5. 按导航矩阵放置 16 个链接，并逐页设置唯一当前项。
6. 写入统一的 `styles.css` 和 `script.js` 相对引用。
7. 保证 HTML 源码处于正确的无 JavaScript 初始状态。
8. 对文件、结构、链接、ARIA 和允许差异执行完整核验。

### 明确不做

- 不从 Word 文件录入任何新闻正文；Task 2 不需要重新读取素材。
- 不写入首页三个占位符；它们属于 Task 4。
- 不写入“新闻消息／新闻通讯／新闻评论”页面类型、署名、正文或末尾日期；它们属于 Task 5–Task 7。
- 不编写颜色、字体、间距、断点、显示隐藏或其他 CSS。
- 不编写菜单点击、Esc、链接关闭、宽度重置或其他 JavaScript。
- 不创建空 `styles.css`、空 `script.js`、测试脚本、README、截图或临时模板文件。
- 不增加页脚、图片、图标文件、favicon、搜索、评论、推荐、按钮或宣传语。
- 不把 Word 元数据作者、文件时间或推断年份写入页面。

## 允许差异与一致性要求

四页只允许存在以下三类差异：

1. `<title>` 文本不同。
2. `<h1>` 文本不同。
3. `aria-current="page"` 所在的导航链接不同。

在 Task 2 完成时，其余结构、标签顺序、类名、ID、属性、链接文本、链接目标和资源引用应保持一致。建议先建立一个权威模板，再复制成四页并只替换上述三个位置；不要分别手写四套壳。

不得把以下内容当成允许差异：

- 不同页面使用不同的导航顺序或链接文本。
- 仅部分页面有跳至正文链接、按钮文字、`defer` 或 `tabindex`。
- 仅部分页面添加额外 wrapper、页脚或内联脚本。
- 使用页面专属 body class、重复 ID 或不同类名来弥补结构漂移。

## 执行步骤

1. **检查目标状态**：确认项目根目录、`Results/` 和四个目标路径；若目标文件已有内容，先识别用户现有改动，不能盲目覆盖。
2. **确认页面登记表**：逐项核对文件名、浏览器标题、主标题、当前导航项和后续内容任务。
3. **建立权威模板**：按“公共结构合同”写出一份完整 HTML 壳，暂不加入正文内容。
4. **复制为四页**：从同一模板生成四个文件，避免重复手写造成属性或顺序差异。
5. **应用页面差异**：只替换 `<title>`、`<h1>` 和当前链接的 `aria-current="page"`。
6. **检查初始状态**：确认 `no-js`、按钮 `aria-expanded="false"`、导航无 `hidden` 且无 `is-open`。
7. **核对导航矩阵**：从每页检查四个链接，共检查 16 条路径及四个当前项。
8. **比较公共结构**：忽略三个允许差异后，确认四个文件的其余 DOM 完全一致。
9. **执行范围复核**：确认没有提前录入正文、样式、脚本、页脚或其他功能。
10. **交接后续任务**：把类名和 ID 接口清单交给 Task 3、Task 8、Task 9；把页面登记表和最小正文状态交给 Task 4–Task 7。

## 验证方法

### 文件级验证

- 四个目标 HTML 文件均存在于 `Results/`，文件名与大小写准确。
- 本任务没有修改 `Materials/`、`plan/` 中其他计划或已有的 CSS、JavaScript。
- 本任务没有创建约定外的临时文件或占位共享文件。
- 每个文件都以 HTML5 doctype 开始，可直接从本地打开。

### `<head>` 验证

- 每页有且只有一个 `lang="zh-CN"`、`meta charset`、viewport 和 `<title>`。
- 四个 `<title>` 与页面登记表逐字符一致。
- 每页恰好引用一次 `styles.css` 和一次 `script.js`。
- 脚本引用带 `defer`，不带 `type="module"`、`async` 或内联代码。
- 页面不存在 `<base>`、外部 URL、联网字体或服务器路径。

### 结构验证

- 每页恰好有一个跳至正文链接、一个站点 `<header>`、一个主 `<nav>`、一个 `<main>` 和一个 `<h1>`。
- `#nav-toggle`、`#site-navigation`、`#main-content` 各存在一次，且页面内没有重复 ID。
- 按钮的 `aria-controls` 值等于导航的实际 ID。
- 报头文字准确且链接 `index.html`，报头没有占用标题层级。
- `<main>` 的 ID、class 和 `tabindex="-1"` 四页一致。
- `<main>` 在 Task 2 阶段除唯一 `<h1>` 外没有其他可见内容。

### 导航验证

- 每页主导航恰好包含四个链接，文本和顺序一致。
- 四页合计存在 16 个主导航链接，目标全部属于四个已创建页面。
- 每个页面恰好一个 `aria-current="page"`，且落在导航矩阵指定的自链接上。
- 报头链接不计入 16 条主导航路径，也不得带 `aria-current`。
- 所有导航目标使用正斜杠规则下的同目录文件名，不含绝对路径、片段或新窗口属性。

### 渐进增强静态验证

- HTML 源码使用 `class="no-js"`，不存在预写的 `js` 类。
- 菜单按钮是原生 button，类型是 `button`，初始展开状态是 `false`。
- 按钮同时具有可见文字和被隐藏于无障碍树的装饰图形。
- 导航源码不带 `hidden`、`aria-hidden` 或 `is-open`。
- 页面不含内联事件属性，因此 Task 9 不会与遗留行为重复绑定。

### 一致性验证

将四页先进行以下规范化，再比较剩余结构：

1. 把四个 `<title>` 文本替换为同一占位值。
2. 把四个 `<h1>` 文本替换为同一占位值。
3. 从导航链接中暂时移除 `aria-current="page"`。

规范化后的四个 DOM 应相同。若仍有差异，应判断其是否属于误写，而不是将新差异追加为例外。

### 范围与禁止项验证

- 四页没有文章正文、署名、新闻日期或 Word 文件属性。
- 搜索 `厨一枚`、`胡桃`、由文件属性推断的 `2026`，结果均为 0。
- 不存在页脚、搜索、评论、文章推荐、图片、外链或额外宣传语。
- 不存在未替换的模板记号，例如 `{{...}}`、`TODO`、`TBD` 或“页面登记表中的主标题”。

## 异常处理

- **目标 HTML 已存在**：先检查其内容和修改来源；保留不冲突的用户改动，不用复制模板直接覆盖未知内容。若现有结构与合同冲突，应先明确差异再合并。
- **文章标题与 Task 1 不一致**：停止创建对应页，先回到 Task 1 确认内容版本，不能自行选择看起来更合理的标题。
- **导航链接不能解析**：核对文件名、大小写和相对路径；不得改用本机绝对路径规避问题。
- **无 JavaScript 时导航不可见**：检查 HTML 是否错误加入 `hidden`、`aria-hidden` 或内联隐藏样式；源码导航必须保持可访问。
- **出现多个 `<h1>`**：把报头恢复为普通文本容器，只保留页面内容主标题。
- **公共结构产生漂移**：以本文件的权威模板为准统一四页，不为单页创建临时特例。
- **CSS 或脚本尚不存在**：按任务边界保留正确引用并继续交接，文件由 Task 3 和 Task 9 创建。

## 完成定义

Task 2 只有在以下条件全部满足时才算完成：

- [ ] 四个 HTML 文件已创建在 `Results/`，名称准确。
- [ ] 四页的 doctype、语言、编码和 viewport 正确。
- [ ] 四个 `<title>` 和四个唯一 `<h1>` 与页面登记表一致。
- [ ] 跳至正文链接、报头、按钮、导航和正文入口均符合公共结构合同。
- [ ] 四页各有四个导航链接，共 16 条路径全部指向现有 HTML。
- [ ] 四页各有且只有一个正确的 `aria-current="page"`。
- [ ] 按钮、受控导航和初始 ARIA 状态之间的关系正确。
- [ ] HTML 保留 `no-js` 降级入口，导航源码没有被隐藏。
- [ ] `styles.css` 和 `script.js` 引用使用准确的同目录相对路径。
- [ ] 除 `<title>`、`<h1>` 和当前页标记外，四页公共结构一致。
- [ ] 没有提前实现正文、视觉、交互或范围外功能。
- [ ] 没有引入 Word 元数据、推断年份、外部资源或本机绝对路径。
- [ ] 后续任务获得了稳定的公共类名、ID、页面登记表和导航矩阵。

## 后续任务交接

- Task 3 使用公共 class 完成桌面视觉；不得通过改变语义标签或复制页面结构来实现样式。
- Task 4 保留首页 `<h1>`，在 `#main-content` 中加入三个介绍区块和既定占位符。
- Task 5–Task 7 保留各自 `<h1>`，在 `#main-content` 中加入文章类型、署名、正文和必要的日期结构。
- Task 8 以 `.js`／`.no-js`、`.nav-toggle`、`.site-navigation` 和 `is-open` 实现 768px／769px 状态切换；无 JavaScript 时导航必须可见。
- Task 9 只通过 `#nav-toggle` 和 `#site-navigation` 绑定行为，将 `no-js` 替换为 `js`，并在导航元素上维护 `is-open`。
- Task 10 直接使用页面登记表、导航矩阵、唯一元素数量和允许差异规则执行自动核验。
- Task 11 从 `Results/index.html` 开始进行真实浏览器导航、键盘操作和禁用 JavaScript 回归。

