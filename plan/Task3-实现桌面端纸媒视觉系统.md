# Task 3 实现桌面端纸媒视觉系统

## 任务定位

Task 3 负责创建 `Results/styles.css`，把 Task 2 已冻结的四页公共 HTML 壳渲染为统一的桌面端传统纸媒视觉，并提前定义首页区块和文章内容所需的样式接口。

本任务只处理桌面基线样式、通用可访问性样式和后续内容组件的视觉合同，不录入任何新闻正文，不修改 Word 素材，不实现汉堡菜单交互，也不完成 `max-width: 768px` 的移动端折叠布局。移动端覆盖规则由 Task 8 追加，导航状态切换由 Task 9 实现。

## 目标

1. 使用一个共享样式文件统一四个页面，不在 HTML 中复制内联样式。
2. 通过暖白纸色、宋体类字体、黑灰正文、暗红点缀和细分隔线形成克制的传统报纸气质。
3. 在 1024px 和 1280px 桌面宽度下建立稳定的居中版心，页面最大宽度为 `70rem`，阅读正文最大宽度为 `46rem`。
4. 为报头、主导航、当前页、页面标题、首页介绍区块和新闻文章建立清晰且可复用的视觉层级。
5. 提供不依赖颜色单一表达的当前页状态、清晰的键盘焦点，以及仅在获得焦点时出现的“跳至正文”链接。
6. 保持 CSS 对 Task 8 易于覆盖：不使用高特异性 ID 选择器、`!important`、固定像素版心或隐藏横向溢出的补丁。
7. 不引入图片、纹理、阴影卡片、渐变、联网字体、外部样式表或现代资讯流式布局。

## 前置条件与依赖关系

- 必须先完成 Task 2，四个 HTML 文件已存在并遵守其公共结构合同。
- 本任务以 Task 2 中的 class 和 ID 为权威接口，不通过改写 HTML 结构来迁就样式。
- Task 4–Task 7 将使用本任务规定的首页与文章内容类名填入真实内容。
- Task 8 在本文件末尾追加 `max-width: 768px` 的覆盖规则，并将报头和标题字号改为 `clamp()` 或等效流式值。
- Task 9 只负责 `no-js`／`js`、`is-open` 和 `aria-expanded` 的状态同步；本任务不编写 JavaScript。
- Task 10 将检查资源路径、禁止项和结构；Task 11 执行最终跨断点、缩放和键盘回归。

若 Task 2 尚未完成、公共类名不一致或四页使用了不同结构，应先修正 Task 2，不得在 `styles.css` 中为错误结构叠加页面专用补丁。

## 交付物与文件所有权

本任务执行时只创建或修改：

- `Results/styles.css`

本任务不得创建或修改：

- `Results/index.html`
- `Results/news-message.html`
- `Results/news-feature.html`
- `Results/news-commentary.html`
- `Results/script.js`
- `Materials/` 中的任何 Word 素材
- `Results/` 中的截图、测试脚本、字体、图片、README 或其他额外文件

如果 `styles.css` 已存在，实施前必须先读取其内容并保留不冲突的用户修改；不得直接整文件覆盖。若现有规则与本合同冲突，应先确认冲突来源，只调整属于 Task 3 的桌面基础样式。

## 设计原则

### 1. 纸媒感的实现方式

传统报纸感只通过以下元素形成：

- 暖白、非纯白的页面底色。
- 深色宋体类文字与适中的正文行距。
- 居中、醒目但不过度装饰的“自然选择号”报头。
- 暗红色用于当前页、栏目类型和少量交互强调。
- 双细线报头分隔、单细线栏目分隔。
- 有节制的留白、明确的标题—署名—正文层级。
- 单栏正文和稳定的阅读行长。

不得用下列手段制造“纸张感”：

- 背景图片、噪点图片、SVG 纹理、Canvas 或 data URI。
- 渐变、投影、发光、浮层卡片、圆角资讯卡。
- 报纸多栏正文、瀑布流、文章卡片网格或侧栏推荐。
- 仿旧污渍、折痕、旋转文字等影响阅读的装饰。

### 2. 内容与表现分离

- CSS 不得通过 `content` 属性插入栏目名、作者、日期、标点或其他可见内容。
- 不得使用 `text-transform` 改变 `AI`、`Windows`、`UOS`、`USB`、`OPS`、`Linux`、`4K` 或 `.exe` 的显示形式。
- 不得用伪元素模拟中文引号、首字、文章编号或段落文本。
- 首行缩进只改变排版，不改变 DOM 文本；不得在 HTML 正文前写全角空格实现缩进。
- 不用 `white-space`、字间距或伪元素伪造源文要求的半角空格。

### 3. 桌面优先但可覆盖

- Task 3 写入无媒体查询的桌面基础规则，验收宽度为 1024px 和 1280px。
- 桌面导航默认可见，汉堡按钮默认隐藏。
- 本任务不添加 `max-width: 768px` 的菜单折叠规则，也不绘制汉堡图标。
- 所有尺寸尽量通过语义变量和 class 选择器定义，方便 Task 8 在文件末尾覆盖。
- 不用 `overflow-x: hidden` 或 `overflow-x: clip` 掩盖布局错误。

## CSS 变量合同

`styles.css` 顶部必须在 `:root` 中定义以下变量。名称和值是后续任务的共享接口；Task 8 可以在媒体查询内覆盖少量尺寸变量，但不得重新定义另一套颜色或字体。

```css
:root {
  --color-paper: #f5efe4;
  --color-ink: #211f1c;
  --color-muted: #665d56;
  --color-accent: #7a2424;
  --color-rule: #b8aa98;

  --font-serif: "Songti SC", "STSong", "SimSun", serif;

  --layout-max: 70rem;
  --reading-max: 46rem;
  --title-max: 52rem;
  --page-gutter: 2rem;

  --font-size-small: 0.9375rem;
  --font-size-body: 1rem;
  --font-size-reading: 1.125rem;
  --font-size-section-title: 1.5rem;
  --font-size-page-title: 2.5rem;
  --font-size-masthead: 4rem;

  --line-height-tight: 1.25;
  --line-height-ui: 1.5;
  --line-height-reading: 1.9;

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-7: 3rem;
  --space-8: 4rem;

  --rule-thin: 1px;
  --rule-double: 3px;
  --focus-width: 2px;
}
```

### 变量解释与固定决策

| 变量 | 计算结果或用途 | 固定决策 |
| --- | --- | --- |
| `--layout-max` | 根字号为 16px 时等于 1120px | 报头、导航和主内容的最大版心宽度 |
| `--reading-max` | 根字号为 16px 时等于 736px | 首页文字区和文章正文最大宽度 |
| `--title-max` | 根字号为 16px 时等于 832px | 长文章标题可比正文稍宽，仍保持居中 |
| `--page-gutter` | 桌面两侧各 32px | 1024px 下版心宽度为 960px；Task 8 改为不小于 16px |
| `--font-size-reading` | 18px | 正文及首页介绍文字的桌面字号 |
| `--font-size-page-title` | 40px | 桌面页面主标题字号；Task 8 后续流式缩放 |
| `--font-size-masthead` | 64px | 桌面报头字号；Task 8 后续流式缩放 |
| `--rule-double` | 3px | 配合 `double` 样式产生双细线，不代表 3px 实线 |

不得新增与以上变量语义重复但数值不同的变量，例如同时出现 `--bg` 与 `--color-paper`、`--container-width` 与 `--layout-max`。确有新增需要时，应使用语义清晰的名称并在本文合同中补充用途。

## 样式表组织顺序

`styles.css` 按以下顺序编排，便于审查和后续覆盖：

1. `:root` 设计变量。
2. 盒模型和基础元素重置。
3. 文档背景、字体、链接和通用焦点。
4. 跳至正文链接。
5. 报头及主导航。
6. 主内容版心和页面标题。
7. 首页介绍区块接口。
8. 新闻文章接口。
9. Task 8 后续追加的移动端媒体查询。

每个区段使用简短注释标明用途即可。不要把四个页面拆成四组重复规则，不要使用 CSS 嵌套、预处理器语法、CSS Modules 或需要构建步骤的写法。

## 全局基础样式

### 1. 盒模型与文档基线

必须实现以下行为：

- `html`、所有元素及其 `::before`、`::after` 使用 `box-sizing: border-box`。
- `html` 使用 `--color-paper` 作为背景、`--color-ink` 作为文字色，并应用 `--font-serif`。
- `html` 保留浏览器默认根字号，不把根字号写成固定像素。
- `body` 清除默认外边距，最小高度为 `100vh`，背景和文字色继承设计变量。
- `body` 基准字号为 `--font-size-body`，界面行高为 `--line-height-ui`。
- `button`、`input` 等表单控件若出现，应继承字体；本项目不得因此新增表单控件。
- 标题和段落的默认外边距由组件规则明确控制，避免依赖浏览器默认差异。
- 不设置 `width: 100vw`；版心使用百分比减边距，避免把垂直滚动条宽度计入后造成横向溢出。

建议的核心规则：

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  background: var(--color-paper);
  color: var(--color-ink);
  font-family: var(--font-serif);
  font-size: 100%;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  min-height: 100vh;
  margin: 0;
  background: var(--color-paper);
  color: var(--color-ink);
  font-size: var(--font-size-body);
  line-height: var(--line-height-ui);
}

button {
  font: inherit;
}
```

不得设置 `user-select: none`、禁用文本缩放、移除点击高亮或全局禁用焦点轮廓。

### 2. 普通链接

- 普通正文链接若未来出现，使用暗红色并保留下划线；当前需求不主动添加任何正文链接。
- 下划线与文字之间留出轻微偏移，避免穿过中文笔画。
- 报头和导航链接在各自组件中覆盖普通链接样式。
- 已访问状态不得降低到与背景对比不足的颜色，也不必单独引入新的紫色。

## 版心计算合同

`.site-header__inner` 与 `.main-content` 使用同一横向版心公式：

```css
.site-header__inner,
.main-content {
  width: calc(100% - var(--page-gutter) - var(--page-gutter));
  max-width: var(--layout-max);
  margin-inline: auto;
}
```

该公式产生以下可验收结果：

| 视口宽度 | 左右外边距 | 版心宽度 |
| --- | ---: | ---: |
| 1024px | 各 32px | 960px |
| 1280px | 各 80px | 1120px，达到上限 |

允许浏览器出现不超过 1px 的子像素舍入差异。不得再给这两个容器设置会改变上述结果的左右 padding；组件内部需要留白时，在组件自身设置垂直或局部间距。

## 键盘焦点与跳至正文链接

### 1. 通用焦点

所有可交互链接和按钮在 `:focus-visible` 时使用：

- `2px` 暗红实线轮廓，即 `var(--focus-width) solid var(--color-accent)`。
- `3px` 的 `outline-offset`，避免轮廓压住文字或边线。
- 不依赖背景色变化作为唯一焦点提示。

不得使用 `outline: none`、`outline: 0` 或仅用颜色变化移除浏览器焦点。鼠标点击是否显示浏览器默认焦点由浏览器决定，本任务只增强 `:focus-visible`，不强制通过 `:focus:not(:focus-visible)` 清除轮廓。

`#main-content` 带有 `tabindex="-1"`。通过跳转链接到达正文时，允许它显示清晰轮廓；不得为了视觉整洁而无条件移除 `.main-content:focus` 的焦点提示。

### 2. `.skip-link`

默认状态下，`.skip-link` 必须移出可视区域但仍保留在 DOM、焦点顺序和无障碍树中；获得焦点后显示在左上角，并覆盖报头而不是推动页面布局。

固定视觉合同：

- `position: fixed`，位于页面左上区域。
- 高层级 `z-index`，不得被报头遮挡。
- 暖白背景、深色文字、暗红边框。
- 至少 `0.75rem 1rem` 的内边距。
- 默认使用 `transform: translateY(-150%)`；聚焦时恢复 `translateY(0)`。
- 不用 `display: none`、`visibility: hidden`、`opacity: 0` 或负 `tabindex` 隐藏。
- 不添加自动动画；聚焦后立即可见。

## 报头视觉合同

### 1. `.site-header`

- 页面顶部保留约 `1.5rem` 的呼吸空间。
- 背景保持暖白，不设置固定定位、粘性定位或投影。
- 不铺满暗红背景，不形成现代应用栏。

### 2. `.site-header__inner`

- 使用公共版心公式居中。
- 桌面端按垂直顺序排列报头和导航。
- 不用绝对定位摆放导航，不依赖固定高度。

### 3. `.site-masthead`

- 清除段落默认外边距。
- 文字居中。
- 上下分别使用 `var(--rule-double) double var(--color-rule)`。
- 上下内边距建议为 `1.25rem`。
- 不设置背景图片、渐变、阴影或圆角。

### 4. `.site-masthead__link`

- 使用 `--font-size-masthead`，行高为 `--line-height-tight`。
- 字重使用 `700`；若系统宋体没有独立粗体，可接受浏览器合成粗体，不加载外部字库。
- 文字色为 `--color-ink`，默认无下划线。
- 使用约 `0.16em` 字间距；为保持视觉居中，可用等量 `text-indent` 补偿最后一个字符后不存在的可见字距。
- 鼠标悬停时可变为暗红色；键盘焦点仍必须显示通用轮廓。
- 不强制 `white-space: nowrap`，避免该规则在 Task 8 前后形成小屏溢出隐患。

桌面端“自然选择号”必须保持一行，视觉宽度明显小于 960px 版心，不得触碰双线。

## 桌面主导航合同

### 1. 显示规则

- `.nav-toggle` 在 Task 3 的桌面基线中使用 `display: none`。
- `.site-navigation` 默认可见，不带固定高度，不用 `hidden`、`visibility` 或负定位隐藏。
- `.no-js .site-navigation` 必须与普通桌面导航同样可见。
- 本任务不得定义 `.site-navigation.is-open` 的视觉差异；该状态只在 Task 8/Task 9 的移动端组合中生效。

### 2. `.site-navigation`

- 在报头双线下方显示。
- 使用 `1px solid var(--color-rule)` 作为底部分隔线。
- 不增加第二个导航容器，不把导航改成固定或粘性工具栏。

### 3. `.site-navigation__list`

- 清除列表符号、默认 margin 和 padding。
- 使用 `display: flex` 和 `justify-content: center` 横向排列。
- 桌面端不换行，项目间距固定约 `2.5rem`。
- 不给四个项目设置各占四分之一宽度，避免短标签被人为拉散。

### 4. `.site-navigation__link`

默认状态：

- `display: block`。
- 文字色为 `--color-ink`，无普通下划线。
- 字号 `1rem`，字重 `700`，字间距约 `0.08em`。
- 使用 `white-space: nowrap`，只保护四个短导航标签不在桌面端拆字；正文和标题不得继承该规则。
- 上下点击内边距分别约 `0.875rem` 和 `0.75rem`。
- 预留 `2px solid transparent` 的下边框，防止悬停或当前页时布局跳动。

悬停状态：

- 文字变为 `--color-accent`。
- 下边框变为 `--color-rule` 或显示等效下划线。
- 不使用位移、缩放或改变字号，避免导航抖动。

当前页 `.site-navigation__link[aria-current="page"]`：

- 文字为 `--color-accent`。
- 保持与其他导航项相同的 `700` 字重，避免切换页面时整个导航组宽度发生变化。
- 下边框为 `2px solid var(--color-accent)`。
- 同时依靠颜色和线条区分，不能只靠暗红色。
- 链接仍保持可点击，不降低透明度，不移除 `href`。

焦点状态在上述状态之上叠加通用轮廓，轮廓不能被导航容器的 `overflow` 裁切。因此 `.site-navigation` 和列表不得设置 `overflow: hidden`。

## 主内容与页面标题合同

### 1. `.main-content`

- 使用公共版心公式居中。
- 上内边距为 `3rem`，下内边距为 `4rem` 至 `5rem`，推荐使用 `5rem`。
- `min-width: 0`，允许内部长标题正确收缩。
- 不设置白色卡片背景、边框盒、圆角、投影或固定高度。
- 不使用 CSS columns、grid 多栏或侧栏布局。

### 2. `.page-title`

- 每页唯一的 `<h1>` 均使用此类。
- 最大宽度为 `--title-max`，水平居中。
- 清除浏览器默认 margin，统一设置标题下方间距。
- 字号为 `--font-size-page-title`，行高为 `--line-height-tight`，字重为 `700`。
- 文字居中、颜色为 `--color-ink`。
- 对长标题允许自然换行，可使用 `text-wrap: balance` 作为渐进增强；不依赖该属性才能正确布局。
- 使用 `overflow-wrap: break-word` 作为极端情况下的保护，但不使用 `word-break: break-all`。
- 不把标题全局改为暗红色，不加阴影、描边、背景色块或装饰引号。

`news-commentary.html` 的长标题在 1024px 和 1280px 下应位于一行或形成自然、居中的两行；两种结果均可接受，但不能越出版心或在字符中出现人为空格。

## 首页内容样式接口

Task 4 填充首页时使用以下类名。本任务先在 `styles.css` 中定义这些规则，即使 Task 3 执行当下对应元素尚未加入 HTML，也不视为无效或冗余样式。

建议结构：

```html
<main class="main-content" id="main-content" tabindex="-1">
  <h1 class="page-title">《自然选择号》报社简介</h1>

  <div class="home-sections">
    <section class="home-section" aria-labelledby="origin-title">
      <h2 class="home-section__title" id="origin-title">名称由来</h2>
      <p class="home-section__text">[请补充：《自然选择号》的名称由来]</p>
    </section>
    <!-- 其余两个区块使用相同结构 -->
  </div>
</main>
```

### `.home-sections`

- 最大宽度为 `--reading-max`，水平居中。
- 与主标题之间保留约 `3rem` 间距。
- 不使用卡片网格、三列布局或横向轮播。

### `.home-section`

- 使用上方 `1px solid var(--color-rule)` 区分相邻主题。
- 纵向内边距约 `1.5rem`。
- 最后一个区块可增加同样的底部分隔线，使三段结构收束。
- 不加独立背景、圆角、阴影或悬停效果。

### `.home-section__title`

- 使用 `--font-size-section-title`、`--line-height-tight` 和 `700` 字重。
- 颜色为 `--color-accent`。
- 标题左对齐，底部间距约 `0.75rem`。
- 不自动添加编号或标点。

### `.home-section__text`

- 使用 `--font-size-reading` 和 `--line-height-reading`。
- 颜色为 `--color-ink`，清除默认 margin。
- 占位符保持普通直立文字，不使用低对比度、删除线或闪烁提示。
- 不对占位符应用首行缩进；它是待补资料提示，不是假装完成的文章正文。

## 新闻文章样式接口

Task 5–Task 7 填充文章页时统一使用以下类名。三页不得创建页面专属类来改变基本排版。

建议结构：

```html
<main class="main-content" id="main-content" tabindex="-1">
  <article class="article">
    <header class="article__header">
      <p class="article__type">新闻消息</p>
      <h1 class="page-title">我校启动校本课程志愿填报</h1>
      <p class="article__byline">蓝色空间</p>
    </header>

    <div class="article__body">
      <p><strong class="dateline">自然选择号9月18日7时电</strong> 正文……</p>
    </div>

    <!-- 仅评论页在正文后加入 article__date -->
  </article>
</main>
```

### `.article`

- 宽度由父级 `.main-content` 控制，不另设卡片外框。
- 不使用多栏、侧栏、悬浮目录或相关推荐区域。

### `.article__header`

- 最大宽度为 `--title-max`，水平居中并居中文本。
- 标题区底部使用 `1px solid var(--color-rule)`。
- 底部内边距约 `1.5rem`，与正文之间保留约 `2rem` 间距。
- 不给整个标题区设置独立背景色或投影。

### `.article__type`

- 清除默认 margin，在标题上方显示。
- 使用 `--font-size-small`、`700` 字重、`--color-accent`。
- 字间距约 `0.18em`，保持原中文栏目名，不自动转大写或补标点。
- 与主标题之间留 `0.75rem` 至 `1rem`。

### 文章页中的 `.page-title`

- 继续使用全站主标题合同，不创建 `.article-title` 取代它。
- 在 `.article__header` 内控制上下间距，避免标题与栏目类型或署名粘连。

### `.article__byline`

- 清除默认 margin，位于标题下方约 `1rem`。
- 使用 `--font-size-small`、`--color-muted`，居中显示。
- 不通过 CSS 自动添加“作者：”“记者：”或其他前缀。
- 不使用斜体，以免中文字体回退产生不稳定仿斜效果。

### `.article__body`

- 最大宽度为 `--reading-max`，水平居中。
- 使用 `--font-size-reading` 和 `--line-height-reading`。
- 文字色为 `--color-ink`。
- 使用单栏排版；不得出现 `column-count`、`column-width` 或分栏线。
- 可使用 `text-align: justify` 与 `text-justify: inter-ideograph` 形成中文报纸式齐行；浏览器不支持时自然退化为普通排版。
- 使用 `line-break: strict`、`word-break: normal` 和 `hyphens: none`；不得自动插入软连字符或改变英文术语。
- 不设置固定高度、内部滚动条或裁切。

### `.article__body > p`

- 每个源文段落对应一个 `<p>`，CSS 只处理排版，不合并或拆分节点。
- 清除默认 margin，使用 `2em` 首行缩进。
- 相邻段落之间保留约 `0.75em` 的垂直间距。
- 不给首段、引语段或短段自动添加首字下沉、边框或不同字体。
- 不使用 `word-break: break-all`，也不对英文术语应用 `white-space: nowrap`。
- 桌面端正常换行不足以造成溢出时，不应在 `.exe`、`Windows 10` 等词中强制断开；窄屏保护由 Task 8 实现。

选择器必须限定为 `.article__body > p`，不得用 `.main-content p` 或 `.article p` 统一缩进，否则会错误缩进栏目类型、署名和评论页日期。

### `.dateline`

- 只使用 `font-weight: 700` 强调电头。
- 保持内联显示，不转成块级元素，不增加伪元素或外边距。
- 电头后的一个半角空格必须来自 HTML 原文，CSS 不负责生成。

### `.article__date`

- 仅供新闻评论末尾的“（自然选择号9月18日）”使用。
- 最大宽度为 `--reading-max`，水平居中后文字右对齐。
- 上方间距约 `1.5rem`，首行缩进为 `0`。
- 使用 `--font-size-reading`，字重可为 `700`，颜色保持 `--color-ink`。
- 不通过 CSS 或伪元素补年份、括号、站点名或日期标签。

## 色彩、对比度与状态要求

- 正文 `#211f1c` 与暖白 `#f5efe4` 形成主要阅读对比。
- 次要文字 `#665d56` 只用于署名等辅助信息，不用于正文或小字号关键操作。
- 暗红 `#7a2424` 用于栏目类型、当前页、焦点和少量悬停状态，不大面积铺底。
- 分隔线 `#b8aa98` 是装饰和分组辅助，重要状态不得只靠该浅色线表达。
- 不通过 `opacity` 降低整块文字或链接对比度。
- 当前导航项必须同时有暗红色、较粗字重和可见下边线。
- 焦点必须使用轮廓，与悬停状态有明确区别。

## 字体与文字处理要求

- 全站字体栈精确使用 `"Songti SC", "STSong", "SimSun", serif`。
- 不使用 `@import`、`@font-face`、Google Fonts、CDN、远程 URL 或本地绝对字体路径。
- 不假设每个平台都安装同一种宋体；最终 `serif` 回退必须仍可读。
- 不设置全局 `letter-spacing`；只在报头、导航和栏目类型的短文本上使用小幅字距。
- 正文保持正常字距，避免中文标点两侧出现异常间隔。
- 不启用可能改变可见文本的自动连字符；可明确使用 `hyphens: none`。
- 不设置 `font-style: italic` 模拟中文强调。
- 不使用极细字重；正文为 `400`，标题和强调为 `700`。

## 与 Task 8 的响应式边界

Task 3 必须预留但不实现以下移动端行为：

| 项目 | Task 3 桌面基线 | Task 8 移动端覆盖 |
| --- | --- | --- |
| 页面边距 | `--page-gutter: 2rem` | 在不超过 768px 时改为至少 `1rem` |
| 报头字号 | 固定 `4rem` | 使用 `clamp()` 或等效值缩小 |
| 页面标题 | 固定 `2.5rem` | 使用 `clamp()` 或等效值缩小 |
| 菜单按钮 | 隐藏 | 仅 `.js` 状态显示，点击区至少 44px |
| 导航 | 横向且始终可见 | `.js` 时折叠为纵向；`.no-js` 时仍可见 |
| 导航列表 | 单行 flex | 纵向排列并移除桌面横向间距 |
| 正文宽度 | 最大 `46rem` | 随可用宽度收缩 |
| 长英文术语 | 正常换行规则 | 添加窄屏安全换行保护 |

Task 8 应把移动端媒体查询放在 `styles.css` 末尾，通过同等或略高的 class 特异性覆盖桌面规则。为保证这一点，Task 3：

- 不在样式选择器中使用 `#site-navigation`、`#nav-toggle` 等 ID。
- 不使用 `!important`。
- 不给导航写内联样式。
- 不对导航容器设置固定宽度或固定高度。
- 不把桌面布局包在难以覆盖的多层选择器中。

## 明确不做

本任务不包含：

- 修改四个 HTML 文件或填充页面内容。
- 创建文章预览、页脚、搜索、评论、推荐、面包屑或侧栏。
- 创建移动端汉堡图标、折叠菜单动画或 `is-open` 规则。
- 编写或修改 `script.js`。
- 添加打印样式、深色模式、主题切换或用户可选字体。
- 使用 CSS Grid 制作资讯卡片或多栏新闻布局。
- 添加背景图、Logo 图片、图标字体、内联 SVG 或任何联网资源。
- 推断或展示文章年份、Word 元数据作者、文件时间或其他素材外信息。
- 在 `Results/` 中保存视觉参考、截图或一次性 QA 文件。

## 实施步骤

1. **核对 Task 2 接口**：确认四页包含 `.skip-link`、`.site-header`、`.site-header__inner`、`.site-masthead`、`.site-masthead__link`、`.nav-toggle`、`.site-navigation`、导航子类、`.main-content` 和 `.page-title`。
2. **检查现有文件**：若 `Results/styles.css` 已存在，先读取并标记用户已有规则，避免覆盖无关修改。
3. **建立变量层**：在 `:root` 中写入本文固定的颜色、字体、宽度、字号、行高、间距和线条变量。
4. **写入全局基线**：完成盒模型、文档背景、字体、正文行高、按钮继承字体和普通链接基础样式。
5. **实现可访问性样式**：加入通用 `:focus-visible` 和 `.skip-link` 默认／聚焦状态。
6. **实现统一版心**：为报头内部和主内容应用相同宽度公式，确认 1024px 与 1280px 的计算结果。
7. **实现报头**：完成双细线、居中宋体大字和简洁的链接悬停状态。
8. **实现桌面导航**：隐藏按钮，显示横向四项导航，完成普通、悬停、焦点和当前页状态。
9. **实现主标题**：统一四页标题宽度、字号、行高、居中和换行保护。
10. **定义首页接口**：写入 `.home-sections`、`.home-section`、标题和文字规则，等待 Task 4 使用。
11. **定义文章接口**：写入文章头部、类型、署名、正文、段落、电头和日期规则，等待 Task 5–Task 7 使用。
12. **静态审查 CSS**：确认不存在外部资源、图片、渐变、阴影、分栏、ID 选择器、`!important` 或横向溢出隐藏。
13. **桌面浏览器检查**：直接打开四页，在 1024px 和 1280px 下检查报头、导航、主标题、焦点与横向溢出。
14. **交接后续任务**：记录 Task 4–Task 8 必须复用的内容类名和可覆盖变量，不修改 HTML 以提前演示内容。

## 验证方法

### 1. 文件与资源验证

- `Results/styles.css` 存在且为普通 UTF-8 文本 CSS。
- 四个 HTML 文件均只通过 `href="styles.css"` 引用该文件。
- 样式表中不存在 `@import`、`@font-face`、`url(`、`http://`、`https://` 或本机盘符路径。
- 本任务没有在四个 HTML 中加入 `<style>` 或 `style="..."`。
- `Results/` 未出现 Task 3 以外的新文件。

### 2. 变量验证

- 五个颜色变量与需求值逐字一致。
- 字体栈的字体名称、顺序和最终 `serif` 一致。
- `--layout-max` 为 `70rem`，`--reading-max` 为 `46rem`。
- 页面、正文、标题和报头的字号均通过变量引用，不散落多组冲突数值。
- CSS 自定义属性名称唯一，没有重复声明造成静默覆盖。

### 3. 结构接口验证

- Task 2 的所有公共 class 都有清晰用途，样式不依赖中文链接文本或页面文件名。
- 当前页选择器使用 `.site-navigation__link[aria-current="page"]`。
- 不使用 ID 选择器增加特异性。
- 首页接口只使用 `.home-*` 类，文章接口只使用 `.article*` 和 `.dateline` 类。
- 不存在 `body.index`、文件名类或 `:nth-child()` 页面识别补丁。

### 4. 1024px 桌面验收

浏览器缩放保持 100%，视口宽度设为 1024px：

- `.site-header__inner` 和 `.main-content` 宽度约为 960px，左右各约 32px。
- 报头“自然选择号”完整显示在一行，双线不被文字穿越。
- 四个导航链接位于同一行、顺序正确且没有重叠。
- 汉堡按钮不可见，主导航可见。
- 页面标题完整可读，不越出版心。
- 页面 `scrollWidth <= clientWidth`，无水平滚动条。
- Tab 聚焦跳转链接、报头链接和导航链接时，焦点均清晰可见。

### 5. 1280px 桌面验收

浏览器缩放保持 100%，视口宽度设为 1280px：

- 公共版心宽度不超过 1120px，左右各约 80px。
- 报头、导航和主内容共享同一视觉中轴线。
- 页面没有被无限拉宽，文章接口的正文宽度不超过 736px。
- 导航项目间距均匀但不被拉成四等分。
- 页面 `scrollWidth <= clientWidth`。
- 背景、正文、暗红强调和分隔线与变量值一致。

### 6. 导航状态验收

逐页检查：

- 普通链接为深色，当前链接为暗红、较粗且带实线下边框。
- 当前页状态没有造成导航高度或位置跳动。
- 鼠标悬停不会缩放或移动链接。
- 键盘焦点轮廓不被底边线或容器裁切。
- `.no-js` 初始状态下主导航仍可见，菜单按钮在桌面仍隐藏。

### 7. 跳转链接验收

- 未聚焦时页面顶部看不到跳转链接，但它仍是第一个 Tab 停靠点。
- 第一次按 Tab 后链接立即出现在左上角，文字完整，背景和边框清晰。
- 激活后浏览器跳至 `#main-content`，正文区域获得可感知焦点。
- 跳转链接出现和消失不会推动报头或造成横向滚动。

### 8. 内容组件静态验收

由于 Task 3 执行时 Task 4–Task 7 可能尚未填充内容，本阶段采用两级验证：

1. **Task 3 即时验证**：检查 `.home-*`、`.article*` 和 `.dateline` 规则已存在，选择器与本文合同一致，没有语法错误。
2. **内容集成验证**：Task 4–Task 7 填充后，检查首页三段分隔、文章标题区、署名、单栏正文、首行缩进和评论日期；任何问题回到共享规则修复，不创建单页补丁。

不得为了在 Task 3 阶段预览而向正式 HTML 添加 Lorem ipsum、临时文章、假署名或隐藏测试节点。

### 9. 禁止项验证

样式表中不得出现下列模式或等效实现：

- `box-shadow`
- `text-shadow`
- `linear-gradient`、`radial-gradient` 或其他渐变
- `background-image`
- `border-radius` 用于卡片化主要内容
- `column-count`、`column-width`
- `overflow-x: hidden`、`overflow-x: clip`
- `word-break: break-all`
- `!important`
- 远程字体或其他 URL 资源
- CSS `content` 注入正文、日期、作者或栏目文字

## 异常处理

- **系统没有宋体类字体**：允许按字体栈回退到系统 `serif`，不得联网下载字体，也不得更换为无衬线字体作为主要方案。
- **长标题在 1024px 下换为两行**：只要自然居中、没有单字孤悬和横向溢出即可接受；不得减小到难读字号或强制不换行。
- **当前页加粗导致轻微宽度变化**：导航项目已有固定间距且链接预留边线；若仍抖动，可调整项目间距或统一基础字重，不得绝对定位文字。
- **版心出现 1px 差异**：视为浏览器子像素舍入；超过 1px 时检查额外 padding、border 或 `100vw`。
- **焦点轮廓被裁切**：移除祖先的 `overflow` 裁切并增加留白，不得减弱或删除焦点。
- **英文术语造成桌面溢出**：先确认是否存在错误的 `white-space: nowrap` 或不可见字符；不要直接使用 `break-all`。窄屏保护交给 Task 8。
- **HTML 类名与合同不符**：修正 Task 2 或对应内容任务的标记，并保持四页一致；不得堆叠兼容多个错误类名的重复选择器。
- **现有 CSS 含用户自定义规则**：保留无关修改，将冲突最小化并记录；不能确认意图时停止覆盖该部分。
- **样式文件未加载**：检查同目录相对引用和文件名大小写，不使用绝对路径或启动服务器规避问题。

## 常见返工风险

- 用 `.main-content p` 统一首行缩进，导致署名、栏目类型和日期也被缩进。
- 使用 ID 选择器或 `!important`，使 Task 8 无法干净覆盖移动端规则。
- 把导航默认隐藏，再依赖 JavaScript 显示，破坏 `no-js` 可用性。
- 为移动端复制第二套导航，造成结构和链接数量不再符合 Task 2。
- 用 `100vw` 设置版心，出现滚动条宽度导致的横向溢出。
- 用 `overflow-x: hidden` 掩盖过宽元素，使 Task 11 无法发现真实问题。
- 对标题或正文设置 `white-space: nowrap`，在窄屏形成不可恢复的溢出。
- 对全文设置过大字间距，破坏中文标点和英文术语。
- 当前页只改变颜色，没有实线下边框或其他非颜色提示。
- 为视觉整洁移除焦点轮廓或把跳转链接设为 `display: none`。
- 用阴影、圆角卡片或灰白卡片背景做成现代门户，而不是传统纸媒。
- 使用远程字体或图片，使 `file://` 离线打开时样式缺失。
- 为了模拟文章内容用 CSS `content` 添加文字，污染可访问名称和内容核验。
- 在 Task 3 提前写移动端折叠规则，与 Task 8 的 768px／769px 边界重复或冲突。
- 为每篇文章写一套页面专属 CSS，导致共享样式失去一致性。

## 完成定义

- [ ] `Results/styles.css` 已创建，四页共享引用且本地离线可加载。
- [ ] 五个颜色值、字体栈、`70rem` 版心和 `46rem` 正文宽度符合合同。
- [ ] 全局盒模型、背景、文字、链接和基础排版已建立。
- [ ] 跳至正文链接和 `:focus-visible` 状态清晰、可键盘访问。
- [ ] 报头使用醒目的宋体类大字及双细分隔线，无图片或视觉特效。
- [ ] 桌面主导航横向显示，汉堡按钮隐藏，当前页状态不只依赖颜色。
- [ ] 主内容与标题层级清晰，长标题不会造成横向溢出。
- [ ] 首页三个语义区块所需的 `.home-*` 样式接口已定义。
- [ ] 三个文章页共用的 `.article*`、`.dateline` 样式接口已定义。
- [ ] 正文保持单栏、最大宽度 `46rem`、舒适行高和 `2em` 首行缩进。
- [ ] 1024px 和 1280px 下版心居中、导航稳定且 `scrollWidth <= clientWidth`。
- [ ] `.no-js` 状态下导航保持可见；本任务没有实现菜单交互。
- [ ] 样式表不含外部资源、联网字体、图片、渐变、阴影、卡片、多栏正文或溢出遮盖。
- [ ] 没有修改文章文字、HTML 内容、Word 素材或范围外文件。

## 后续任务交接

- Task 4 使用 `.home-sections`、`.home-section`、`.home-section__title` 和 `.home-section__text` 录入三个首页区块，不新建卡片样式。
- Task 5–Task 7 使用 `.article`、`.article__header`、`.article__type`、`.article__byline`、`.article__body`；新闻消息电头使用 `.dateline`，评论日期使用 `.article__date`。
- Task 8 只在文件末尾追加移动端覆盖，复用 `--page-gutter` 和既有 class；不得重写桌面视觉系统或复制导航。
- Task 9 不修改视觉变量，只维护 `html.js`、`.site-navigation.is-open` 与 `aria-expanded` 状态；移动显示规则由 Task 8 提供。
- Task 10 检查 `styles.css` 为唯一共享样式资源，并扫描外部 URL、禁止内容和正式交付文件数量。
- Task 11 在完整内容存在后复查 1024px、1280px、200% 缩放、焦点、无 JavaScript 导航以及四页之间的视觉一致性。
