# Task 9 导航脚本与渐进增强

## 任务定位

本文件将总方案中的 Task 9 细化为一个可以独立执行、独立验收的工作包。它负责创建唯一的共享脚本 `Results/script.js`，把 Task 2 预留的静态导航接口变成可用的渐进增强行为：将 `html.no-js` 切换为 `html.js`，通过 `#nav-toggle` 控制 `#site-navigation` 的 `.is-open` 状态，并同步按钮的 `aria-expanded`，同时实现 Esc 关闭、点击导航链接关闭、关闭后焦点返回按钮，以及跨到桌面断点（≥769px）时的状态重置。

Task 9 只编写菜单的状态与无障碍同步逻辑。它不定义任何视觉显示规则（归 Task 8），不修改 CSS 变量或桌面视觉（归 Task 3），不改动四个 HTML 的结构、类名、ID、ARIA 初值或正文（归 Task 2、Task 4–Task 7），也不重新解释新闻内容（归 Task 1）。完成本任务后，汉堡菜单在 `file://` 环境下可真实点击、可键盘操作、可在断点切换时自我清理，并可由 Task 11 做跨断点与无脚本回归。

## 目标

- 用一个共享脚本覆盖 `index.html`、`news-message.html`、`news-feature.html` 和 `news-commentary.html`，四页行为一致，不产生单页脚本分支。
- 脚本一旦执行，立即把 `html` 的 `no-js` 替换为 `js`，使 Task 8 的 `.js`／`.no-js` 显示规则正确生效。
- 通过原生 `#nav-toggle` 按钮切换 `#site-navigation` 的 `.is-open`，并让 `aria-expanded` 与展开状态严格一一对应。
- JavaScript 不可用时，脚本不运行，`html` 保持 `no-js`，四项导航由 CSS 常显，链接仍在文档与无障碍树中。
- 实现键盘可达：Esc 关闭菜单并把焦点返回按钮；原生按钮的 Enter／Space 激活不重复绑定。
- 点击任一导航链接后关闭菜单，避免同页链接或返回时残留展开状态。
- 视口跨到 ≥769px 时清除 `.is-open` 并把 `aria-expanded` 重置为 `false`，与 Task 8 的断点合同对齐。
- 脚本不抛异常、不产生控制台报错、不引入任何外部依赖或网络请求。

## 前置条件与后续依赖

- 前置条件：Task 2 已完成，四个 HTML 均带有 `#nav-toggle`、`#site-navigation`、`aria-controls="site-navigation"`、初始 `aria-expanded="false"`、初始 `class="no-js"`，且 `<head>` 中以 `<script src="script.js" defer>` 引用脚本。
- 可并行工作：Task 3 桌面视觉、Task 8 移动端显示规则可与本任务并行设计；但 Task 8 的"显示"与本任务的"状态"必须在集成验收时一致，二者不得无协调地互相改写对方的接口。
- 直接依赖本任务的工作：Task 11 浏览器回归（真实点击、键盘、跨断点、禁用 JavaScript）。Task 8 的菜单集成验收在 Task 9 完成后才能从"运行时模拟"升级为"真实交互"。
- 阻断规则：若四个 HTML 缺少 `#nav-toggle` 或 `#site-navigation`，或 `aria-controls` 与导航实际 ID 不匹配，必须先回到 Task 2 修复结构，再编写脚本；不得在脚本中用易变的中文链接文本或位置索引代替稳定 ID 查询。
- 接口稳定规则：本任务只消费 Task 2 冻结的 ID 与类名（`#nav-toggle`、`#site-navigation`、`.site-navigation`、`.is-open`、`html.no-js`／`html.js`）和按钮的 `aria-expanded`。确需变更任一接口时，必须同步检查四页 HTML、`styles.css`、`script.js` 和 Task 10／Task 11 的核验规则。

## 权威来源与优先级

Task 9 按以下优先级执行：

1. `plan/Task2-建立共享HTML壳与导航.md`
   - 决定脚本可依赖的唯一接口：`html.no-js` 初值、`#nav-toggle` 按钮、`#site-navigation` 导航、`aria-controls`／`aria-expanded` 关系、`<script defer>` 引用方式，以及"不含内联事件属性"这一前提。
   - Task 9 不创建新的 HTML 接口，不改变按钮的可访问名称"菜单"，不把导航改成 `role="menu"`。
2. `plan/Task8-实现移动端响应式布局.md`
   - 决定 `.is-open` 是移动端唯一展开状态、`769px` 起恢复桌面横向导航、关闭态导航用 `display: none` 真正移出 Tab 顺序。
   - Task 9 只维护这些状态类与 ARIA，不重写媒体查询、不改移动尺寸、不靠脚本设置任何布局像素值。
3. `plan/Task1-素材基线与内容合同.md` 与 `plan/Task4`–`plan/Task7`
   - 决定四页正文不可变。Task 9 不得操作、隐藏、重排或重写任何文章内容节点。

若上游合同冲突（例如导航 ID 与 `aria-controls` 不一致），应暂停脚本实现并交回 Task 2 修订，不在 `script.js` 中同时兼容多个错误结构。

## 交付物与文件所有权

### 本计划编写阶段

本次计划细化只创建：

- `plan/Task9-导航脚本与渐进增强.md`

本次不修改 `Results/` 中的任何正式交付文件。

### Task 9 实施阶段

Task 9 只创建或修改：

- `Results/script.js`

Task 9 不创建、不删除且不修改：

- `Results/index.html`、`Results/news-message.html`、`Results/news-feature.html`、`Results/news-commentary.html`
- `Results/styles.css`
- `Materials/` 中任何 Word 文件
- Task 1–Task 8 的计划文件
- 图片、字体、测试脚本、截图、README、JSON 数据或其他正式交付外文件

`Results/` 的正式交付集合始终是六个文件：四个 HTML + `styles.css` + `script.js`。Task 9 不得新增第七个交付文件（例如第二个脚本、polyfill 文件或配置 JSON）。若 `script.js` 已存在用户改动，先读取并识别，不整文件盲覆盖。

## Agent 所有权边界

| 责任方 | 允许修改 | 必须复用 | 禁止事项 |
| --- | --- | --- | --- |
| Task 9 Agent | `Results/script.js` 的共享菜单行为 | `#nav-toggle`、`#site-navigation`、`html.js`／`html.no-js`、`.is-open`、`aria-expanded` | 不得修改任何 HTML、正文、CSS、媒体查询或视觉变量；不得用脚本写入布局尺寸或隐藏内容 |
| Task 8 Agent | `Results/styles.css` 末尾移动端显示规则 | `.js`／`.no-js`、`.site-navigation.is-open` | 不得编写 JavaScript；显示与折叠由 CSS 负责，状态由 Task 9 负责 |
| Task 11 | 一次性浏览器回归 | 上游全部合同 | 临时记录、截图、控制台脚本不得进入正式 `Results/` 六文件集合 |

若 Task 9 发现菜单"显示了但样式错乱"，属于 Task 8 的显示规则问题，只记录复现状态并移交；若 Task 8 发现"`aria-expanded` 未同步或跨断点未重置"，属于 Task 9 的状态问题，交回 Task 9，不由 CSS 补救。

## 脚本接口合同

### 输入接口（只读，来自 Task 2）

| 接口 | 类型 | Task 9 的用法与不变量 |
| --- | --- | --- |
| `html.no-js` | 初始状态类 | 脚本执行后移除，并加入 `js`；源码初值不得被改写为 `js` |
| `#nav-toggle` | 原生 `<button type="button">` | 唯一交互入口；通过此 ID 绑定 `click`；维护其 `aria-expanded` |
| `#site-navigation` | `<nav>` | 通过此 ID 切换 `.is-open`；必须与按钮 `aria-controls` 一致 |
| `.site-navigation__link` | 四个导航 `<a>` | 仅用于"点击链接后关闭"，通过类名而非中文文本匹配 |
| `aria-expanded` | 按钮属性 | 展开为 `true`，折叠为 `false`；与 `.is-open` 严格同步 |

### 输出状态（Task 9 唯一可写入的三处）

1. `document.documentElement` 的类：`no-js` → `js`。
2. `#site-navigation` 的类：切换 `is-open`。
3. `#nav-toggle` 的 `aria-expanded`：`"true"` ↔ `"false"`。

除以上三处外，脚本不得写入任何 DOM 属性、类、内联样式或文本。

### 状态矩阵（与 Task 2／Task 8 对齐）

| 环境与状态 | `html` 类 | `#site-navigation` | `aria-expanded` | 谁负责 |
| --- | --- | --- | --- | --- |
| JavaScript 不可用 | `no-js` | 无 `is-open`，CSS 常显 | 源码 `false`（按钮不可见、不可操作） | 脚本不运行 |
| 可用、移动端关闭 | `js` | 无 `is-open`，CSS `display:none` | `false` | Task 9 维护 |
| 可用、移动端打开 | `js` | 有 `is-open`，CSS 显示 | `true` | Task 9 维护 |
| 宽度 ≥769px | `js` | 无 `is-open`（桌面横向常显） | 重置为 `false` | Task 9 重置 |

## 行为规范

### 1. `no-js` → `js` 切换

- 切换必须是脚本执行的第一件实质工作，先于任何元素查询之后的状态写入。
- 使用 `classList.remove('no-js')` 与 `classList.add('js')`，不改写 `class` 字符串整体，避免误删 Task 2 之外的类。
- 即使后续找不到 `#nav-toggle` 或 `#site-navigation`，`no-js → js` 仍应完成，因为它同时影响 Task 8 对按钮与导航的显示判定。

### 2. 按钮切换（click）

- 在 `#nav-toggle` 上绑定一次 `click`：若当前为关闭则打开，若为打开则关闭。
- 打开＝给 `#site-navigation` 加 `is-open` 且按钮 `aria-expanded="true"`；关闭＝移除 `is-open` 且 `aria-expanded="false"`。两步必须原子完成，不得只改其一。
- 原生 `<button>` 已把 Enter／Space 转为 `click`，因此**不得**再为按钮单独绑定 `keydown` 处理 Enter／Space，否则会双重触发。

### 3. Esc 关闭并返回焦点

- 在 `document` 上监听 `keydown`；当按键为 `Escape`（兼容旧值 `Esc`）且菜单当前为打开时：关闭菜单，并把焦点移到 `#nav-toggle`。
- 菜单本就关闭时，Esc 不做任何事，不抢焦点、不滚动。
- 焦点返回只发生在用户用 Esc 主动关闭时；点击链接导致的关闭随后会发生页面导航，不强制设焦点。

### 4. 点击导航链接后关闭

- 在 `#site-navigation` 上委托监听 `click`；当命中的是 `.site-navigation__link`（含其子节点）且菜单为打开时，关闭菜单。
- 目的是覆盖同页链接、当前页链接（仍为可点击 `<a>`）以及任何不触发整页导航的场景，避免展开状态残留。
- 通过类名匹配，不依赖链接的中文文本（"首页／新闻消息／新闻通讯／新闻评论"）。

### 5. 跨断点重置（≥769px）

- 使用 `window.matchMedia('(min-width: 769px)')`，与 Task 8 的 `max-width: 768px` 移动断点严格互补。
- 监听 `change`：当结果变为匹配（进入桌面）时，关闭菜单并把 `aria-expanded` 重置为 `false`。
- 兼容旧版 Safari：若 `addEventListener` 不可用，回退到 `addListener`。
- 不在脚本中读取或写入任何像素尺寸、`offsetWidth`、`innerWidth` 数值来决定布局；断点判定完全交给 `matchMedia`，显示交给 CSS。

### 6. 焦点策略（披露式菜单，非模态）

- 采用 WAI-ARIA "disclosure（折叠/展开）"模式：打开后**不**把焦点强制移入菜单，焦点保持在按钮，用户按 Tab 自然进入四个链接，再到正文后续可聚焦元素。
- 关闭态下，Task 8 用 `display: none` 让链接真正退出 Tab 顺序；Task 9 **不得**用 `tabindex` 增删、`aria-hidden` 或 `hidden` 来管理可聚焦性。
- 唯一一次程序化设焦点是 Esc 关闭后返回按钮。

### 7. 健壮性与降级

- 全部逻辑包裹在一个立即执行函数（IIFE）中，使用严格模式，不向 `window` 暴露全局变量。
- 因为脚本带 `defer`，执行时文档已解析完成，可直接在顶层查询 DOM，无需再等待 `DOMContentLoaded`。
- 若 `#nav-toggle` 或 `#site-navigation` 任一缺失：完成 `no-js → js` 后安全返回，不绑定任何监听，不抛异常，不打印错误（Task 11 要求控制台 0 报错）。
- 启动时把状态归一化为"关闭"（移除可能误存的 `is-open`、`aria-expanded` 置 `false`），保证首屏一致。
- 不使用 `fetch`、`XMLHttpRequest`、ES module、`import`、构建产物、第三方库或任何外部 URL。

### 已知取舍：defer 造成的瞬时闪烁

Task 2 明确禁止内联脚本与内联初始化代码，`no-js → js` 只能在 `defer` 的 `script.js` 中完成。因此在移动端首帧，理论上可能出现"导航短暂以 `no-js` 常显、随后折叠"的瞬时闪烁。这是合同约束下的既定取舍：

- 不得为消除闪烁而在 `<head>` 加内联 `document.documentElement.className` 脚本（违反 Task 2）。
- 把 `no-js → js` 放在脚本第一行可把窗口压到最小。
- 若用户后续明确要求零闪烁，应作为新的需求，由 Task 2 放宽"禁止内联脚本"约束后再处理，不在 Task 9 私自加内联代码。

## 推荐的 `script.js` 蓝图

以下为推荐实现骨架。接口名、断点值、三处状态写入、健壮性降级属于固定合同；变量命名与注释可在不改变行为的前提下微调。

```js
/* Task 9: 共享导航行为 —— 渐进增强、菜单状态与 ARIA 同步 */
(function () {
  'use strict';

  var root = document.documentElement;

  /* 1. 脚本执行的第一件实质工作：no-js -> js */
  root.classList.remove('no-js');
  root.classList.add('js');

  var toggle = document.getElementById('nav-toggle');
  var navigation = document.getElementById('site-navigation');

  /* 接口缺失：完成 no-js->js 后安全退出，不抛错、不污染控制台 */
  if (!toggle || !navigation) {
    return;
  }

  function isOpen() {
    return navigation.classList.contains('is-open');
  }

  /* 唯一的状态写入点：is-open 与 aria-expanded 原子同步 */
  function setOpen(open) {
    navigation.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function closeMenu() {
    setOpen(false);
  }

  /* 2. 启动归一化为关闭态（源码本不应带 is-open） */
  closeMenu();

  /* 3. 按钮点击切换；原生 button 已处理 Enter/Space，不重复绑定 keydown */
  toggle.addEventListener('click', function () {
    setOpen(!isOpen());
  });

  /* 4. Esc 关闭并把焦点返回按钮（仅在打开时） */
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' || event.key === 'Esc') {
      if (isOpen()) {
        closeMenu();
        toggle.focus();
      }
    }
  });

  /* 5. 点击导航链接后关闭菜单；按类名委托，不依赖中文文本 */
  navigation.addEventListener('click', function (event) {
    var target = event.target;
    if (target && typeof target.closest === 'function' &&
        target.closest('.site-navigation__link') && isOpen()) {
      closeMenu();
    }
  });

  /* 6. 跨到桌面断点（>=769px）时重置为关闭态 */
  var media = window.matchMedia('(min-width: 769px)');
  function handleBreakpoint(event) {
    if (event.matches) {
      closeMenu();
    }
  }
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', handleBreakpoint);
  } else if (typeof media.addListener === 'function') {
    media.addListener(handleBreakpoint); /* 旧版 Safari 兼容 */
  }
})();
```

## 任务范围

### 必须完成

1. 确认四个 HTML 都带有 Task 2 规定的脚本接口（`#nav-toggle`、`#site-navigation`、`aria-controls`、初始 `no-js` 与 `aria-expanded="false"`、`<script defer>`）。
2. 创建 `Results/script.js`，实现 `no-js → js`、按钮切换、Esc 关闭并返回焦点、链接点击关闭、≥769px 重置五项行为。
3. 保证三处状态写入（`html` 类、`is-open`、`aria-expanded`）始终一致。
4. 接口缺失时安全降级，不抛异常、不打印错误。
5. 在四页上行为一致；脚本不含任何页面分支或中文文本判定。
6. 交由 Task 11 做真实浏览器集成回归。

### 明确不做

- 不编写或修改任何 CSS、媒体查询、视觉变量或显示规则（归 Task 3／Task 8）。
- 不修改四个 HTML 的结构、类名、ID、ARIA 初值、`<title>`、`<h1>` 或正文（归 Task 2、Task 4–Task 7）。
- 不操作、隐藏、重排或重写任何文章内容节点。
- 不用脚本设置任何布局像素值、宽高、`style` 或 `transform`。
- 不新增第二个导航、复制菜单节点或注入任何可见文本。
- 不为按钮额外绑定 Enter／Space 的 `keydown`（原生 `click` 已覆盖）。
- 不用 `tabindex`、`aria-hidden` 或 `hidden` 管理链接可聚焦性（由 CSS `display:none` 负责）。
- 不加入“点击菜单外部关闭”行为——用户已明确决定不实现（见“已定决策”）。
- 不使用 `fetch`、`XMLHttpRequest`、ES module、`import`、第三方库、polyfill 文件或任何外部 URL。
- 不创建测试脚本、截图、README、JSON 数据或第二个脚本文件。
- 不在生产脚本中保留 `console.log`／`debugger`（Task 11 要求控制台干净）。
- 不把 Word 元数据作者、文件时间或推断年份写入脚本或注释。

## 已定决策：不实现“点击菜单外部关闭”

用户已于 2026-09-19 明确决定**不实现**“点击菜单外部关闭”。Task 9 的交互范围固定为合同内的五项行为：`no-js → js`、按钮切换、Esc 关闭并返回焦点、点击导航链接关闭、≥769px 跨断点重置。

- 脚本中不得出现监听 `document`／`window` 的 `click`、`pointerdown`、`mousedown` 或 `touchstart` 来判断“点击是否在菜单之外”的代码。
- 移动端打开菜单后点击菜单外区域，菜单保持展开是**预期行为**，不属于缺陷；Task 10／Task 11 不得据此判失败，Task 9 也不得“顺手”补上。
- 若用户日后改变主意，属于超出当前合同的新需求：必须先更新本文件的这一决策、行为清单与蓝图，再同步 Task 8 的显示验收与 Task 11 的回归矩阵（新增“点击外部→菜单保持展开／关闭”的预期条目），然后才实现。

## 实施步骤

1. **核对接口**：逐页检查四个 HTML 的 `#nav-toggle`、`#site-navigation`、`aria-controls="site-navigation"`、初始 `class="no-js"`、`aria-expanded="false"` 与 `<script src="script.js" defer>`；任一不符先交回 Task 2。
2. **记录脚本前状态**：记录 `Results/script.js` 是否已存在；若存在，读取并识别用户改动，记录实施前四个 HTML 的 SHA-256，作为 Task 9 未改 HTML 的证据。
3. **编写脚本**：按蓝图创建 `script.js`，`no-js → js` 置于首位，五项行为依次实现，全部包在 IIFE 与严格模式中。
4. **自检状态一致性**：确认 `is-open` 与 `aria-expanded` 永不脱节；不存在只改其一的代码路径。
5. **本地静态检查**：确认无外部 URL、无 `import`／module、无 `console`／`debugger`、无对 HTML／CSS 的写入。
6. **四页冒烟**：在 `file://` 下逐页打开，硬刷新确认 `html` 变为 `js`、移动端按钮可切换、桌面端按钮隐藏且导航常显。
7. **集成 Task 8**：与 Task 8 的 `.js`／`.no-js`／`.is-open` 显示规则联合验证三种移动状态；显示异常交回 Task 8，状态异常留在 Task 9。
8. **交接 Task 11**：把真实点击、Enter／Space、Esc、链接关闭、焦点返回与跨断点重置交给 Task 11 做完整回归。

## 验证方法

### 静态验证（脚本文件级）

- `Results/script.js` 存在，为普通 UTF-8 脚本，可经 `file://` 加载；不是 ES module，不含 `import`／`export`。
- 本任务唯一正式文件变更是 `script.js`；四个 HTML 与 `styles.css` 的实施前后 SHA-256 一致；`Materials/` 未被修改。
- 脚本中不出现外部 URL、`fetch`、`XMLHttpRequest`、第三方库、`console.`、`debugger`。
- 脚本只写入三处状态：`documentElement` 的 `no-js`／`js`、`#site-navigation` 的 `is-open`、`#nav-toggle` 的 `aria-expanded`；不存在对其他元素的 `setAttribute`、`style`、`innerHTML`、`className` 写入。
- 脚本不以中文链接文本或元素位置索引作为判定依据；查询基于 `#nav-toggle`、`#site-navigation` 与 `.site-navigation__link`。
- 断点查询字符串为 `(min-width: 769px)`，与 Task 8 的 `max-width: 768px` 互补。

### 行为验证（浏览器，四页各一遍）

| 操作 | 预期结果 |
| --- | --- |
| 硬刷新（JS 可用，移动宽度） | `html` 含 `js`、不含 `no-js`；按钮可见；导航折叠；`aria-expanded="false"` |
| 点击按钮 | 导航获得 `.is-open` 并显示；`aria-expanded="true"` |
| 再次点击按钮 | 移除 `.is-open`；`aria-expanded="false"` |
| 聚焦按钮按 Enter／Space | 与点击等效切换一次，不双触发 |
| 打开后按 Esc | 关闭菜单，焦点回到按钮，`aria-expanded="false"` |
| 打开后点击某导航链接 | 菜单关闭；随后正常导航到目标页 |
| 移动宽度打开菜单后拉宽到 ≥769px | `.is-open` 清除、`aria-expanded="false"`、按钮隐藏、导航横向常显 |
| 再缩回 ≤768px | 菜单为关闭态，不复用旧的展开状态 |
| 禁用 JavaScript 并硬刷新 | `html` 保持 `no-js`；按钮不可见；四项导航纵向常显、可点击、可聚焦 |

### 无报错验证

- 上述全部操作过程中，浏览器控制台 0 错误、0 警告（脚本自身的 `console` 输出也应为 0）。
- 故意在一个缺少 `#nav-toggle` 的测试副本上加载脚本时（仅用于验证健壮性，测试副本不得进入 `Results/`），脚本应静默返回、不抛异常。

## 异常处理

- **HTML 缺少脚本接口或 `aria-controls` 不匹配**：停止脚本实现，交回 Task 2 修复结构，不在脚本中用文本或索引兜底。
- **菜单展开但视觉错乱／未折叠**：判定为 Task 8 显示规则问题，记录复现状态并移交，不在脚本中设置样式补救。
- **`aria-expanded` 与 `.is-open` 脱节**：属于 Task 9 缺陷，修正 `setOpen` 的原子写入，不靠 CSS 或 HTML 掩盖。
- **跨到 769px 未重置**：检查 `matchMedia` 查询字符串与 `change` 监听（含旧 Safari 的 `addListener` 回退）。
- **Enter／Space 触发两次**：确认没有为按钮重复绑定 `keydown`；只保留原生 `click`。
- **禁用脚本后导航消失**：通常是 CSS 的 `.no-js`／`.js` 特异性问题，交回 Task 8；脚本本身在不运行时不会移除 `no-js`。
- **控制台报错**：定位并消除；不得用 `try/catch` 吞掉错误来"制造"零报错，应修复根因。
- **需要点击外部关闭等新交互**：视为超出当前合同的新需求，先取得用户批准并更新本文件与 Task 11，再实现。

## 常见返工风险

- 为按钮额外绑定 Enter／Space 的 `keydown`，与原生 `click` 双重触发。
- 只切换 `.is-open` 而忘记同步 `aria-expanded`，或反之，导致无障碍状态与视觉不一致。
- 用脚本写 `style.display`、宽高或 `transform` 来做折叠，越权侵入 Task 8 的显示职责。
- 用 `tabindex="-1"`／`aria-hidden`／`hidden` 管理链接可聚焦性，与 Task 8 的 `display:none` 方案冲突。
- 断点用 `768px`、`48rem` 或读取 `innerWidth` 数值判定，与 Task 8 的 `769px` 合同错位。
- 用中文链接文本匹配导航链接，文本一旦调整即失效。
- 把 `no-js → js` 放在异步回调或 `DOMContentLoaded` 之后，放大首帧闪烁。
- 为消除闪烁在 `<head>` 偷加内联脚本，违反 Task 2。
- 保留 `console.log`／`debugger`，导致 Task 11 控制台不干净。
- 引入外部库、polyfill 文件或第二个脚本，突破"六文件"交付集合。
- 擅自加入"点击外部关闭"等合同外行为，未同步 Task 11 验收。

## 完成定义

Task 9 只有在以下条件全部满足时才算完成：

- [ ] 唯一正式文件变更是 `Results/script.js`；四个 HTML、`styles.css`、三份 Word 素材均未被修改。
- [ ] 脚本执行后立即把 `html` 的 `no-js` 替换为 `js`，且该切换位于脚本首位实质逻辑。
- [ ] 点击 `#nav-toggle` 能在 `#site-navigation` 上切换 `.is-open`，并原子同步 `aria-expanded`（`true`／`false`）。
- [ ] Enter／Space 经原生按钮等效触发一次切换，无双重触发。
- [ ] 打开状态下按 Esc 关闭菜单并把焦点返回按钮；关闭状态下 Esc 无副作用。
- [ ] 打开状态下点击任一 `.site-navigation__link` 会关闭菜单，且不依赖中文文本匹配。
- [ ] 视口跨到 ≥769px 时清除 `.is-open` 并把 `aria-expanded` 重置为 `false`；缩回 ≤768px 为关闭态。
- [ ] 禁用 JavaScript 并硬刷新后，`html` 保持 `no-js`，四项导航常显、可点击、可聚焦。
- [ ] 脚本只写入约定的三处状态，不设置任何布局尺寸、内联样式或正文内容。
- [ ] 接口缺失时安全降级，不抛异常；四页全部操作过程控制台 0 报错。
- [ ] 脚本无外部依赖、无网络请求、无 module、无 `console`／`debugger`，未新增第七个交付文件。
- [ ] 未实现“点击菜单外部关闭”，与用户 2026-09-19 的明确决定一致；未加入任何其他合同外行为。
- [ ] Task 8 的菜单集成验收已从"运行时模拟"升级为"真实交互"并通过；Task 11 获得可执行的导航交互回归基线。

## 后续任务交接

- Task 8 使用 `html.js`／`html.no-js`、`.site-navigation.is-open` 与按钮 `[aria-expanded]` 驱动移动显示；Task 9 不改其媒体查询或移动尺寸，二者集成后共同通过菜单三态验收。
- Task 10 检查 `script.js` 为唯一共享脚本资源、引用方式为 `<script defer>`、无外部 URL，并确认脚本未改动四个 HTML 的结构与正文（哈希与 Task 1 段落数组不变）。
- Task 11 在真实浏览器中执行四页的点击、Enter／Space、Esc、链接关闭、焦点返回、跨断点重置、禁用 JavaScript 降级与控制台无报错回归；从 `Results/index.html` 直接进入。
- 若后续 HTML 接口（ID、类名、ARIA 关系）发生经批准的变更，必须先更新 Task 2 合同，再同步本任务的查询选择器与 Task 10／Task 11 的核验规则；不得只改 `script.js` 形成未记录的新版本。
