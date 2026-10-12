# -*- coding: utf-8 -*-
"""Assemble the final Task 2 acceptance report: static run + mutation run + browser + checklist."""
import io
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QA = os.path.join(ROOT, "_qa_task2")
REPORT = os.path.join(QA, "report.md")

env = dict(os.environ, PYTHONIOENCODING="utf-8")
v = subprocess.run([sys.executable, os.path.join(QA, "verify.py")],
                   capture_output=True, text=True, encoding="utf-8", env=env)
print(v.stdout.strip(), v.stderr.strip())
m = subprocess.run([sys.executable, os.path.join(QA, "mutate.py")],
                   capture_output=True, text=True, encoding="utf-8", env=env)
print(m.stdout.strip().splitlines()[-1] if m.stdout else m.stderr.strip())

# 静态 + 变异必须同时为 0 失败
if v.returncode != 0 or m.returncode != 0:
    sys.exit("核验或变异未通过，拒绝生成最终报告")

CHECKLIST = """
## 完成定义逐条判定（plan/Task2 第「完成定义」节 13 项）

| # | 完成定义条款 | 判定 | 证据（本报告内断言名 / 文件） |
| --- | --- | --- | --- |
| 1 | 四个 HTML 已创建在 `Results/`，名称准确 | 满足 | 「Results/ 恰好含四个 Task 2 HTML，名称与大小写准确」＋逐文件存在性 4 条 |
| 2 | doctype、语言、编码、viewport 正确 | 满足 | 「以 <!doctype html> 开始」「唯一 lang=zh-CN」「恰好一个 meta charset=utf-8」「viewport 值为 width=device-width, initial-scale=1」；浏览器 compatMode=CSS1Compat |
| 3 | 四个 `<title>` 与四个唯一 `<h1>` 与登记表一致 | 满足 | 「<title> 与页面登记表逐字符一致」「<h1> 为 class=page-title 且文字与登记表逐字符一致」；真值由 plan 表格逐字符解析，非手写 |
| 4 | 跳至正文、报头、按钮、导航、正文入口符合公共结构合同 | 满足 | 结构节 76 条断言（19 项 × 4 页）：body 子元素顺序、header 内 p→button→nav、aria-controls、报头为 p、main 的 ID/class/tabindex、合同外标签为 0 |
| 5 | 四页各四个链接，16 条路径全部指向现有 HTML | 满足 | 「四页合计 16 条主导航路径」「导航目标…已存在」「16 条链接目标全部属于四个已创建页面」；浏览器真实点击导航成功 |
| 6 | 四页各有且只有一个正确的 `aria-current=\"page\"` | 满足 | 「全页恰好一个 aria-current，值精确为 page」「落在矩阵指定的自链接」「其余三个链接不带」「报头链接不带」 |
| 7 | 按钮、受控导航与初始 ARIA 关系正确 | 满足 | 「按钮 aria-controls 精确等于导航实际 ID」「按钮初始 aria-expanded=false」「按钮位于受控导航之前」 |
| 8 | 保留 `no-js` 降级入口，导航源码未被隐藏 | 满足 | 「<html> 源码初始类恰为 no-js」「源码无预写 js 类」「导航源码无 hidden/aria-hidden/is-open」「无 JS 时导航链接仍在文档树」 |
| 9 | `styles.css`／`script.js` 引用为准确的同目录相对路径 | 满足 | 「恰好一次 styles.css 同目录相对引用」「恰好一次 script.js 引用且仅用 defer」「无根路径/盘符/反斜杠」；控制台证明相对解析落在 Results/ |
| 10 | 除三处允许差异外四页公共结构一致 | 满足 | 一致性节：规范化 DOM 相同、规范化源码逐字节相同、后三页可由 index.html 施加三处替换逐字节重建 |
| 11 | 没有提前实现正文、视觉、交互或范围外功能 | 满足 | 「<main> 除唯一 h1 外无其他元素或可见文本」「可见文本集合精确等于 8 项」「未创建空 styles.css/script.js」「无内联事件/内联脚本/style 属性」；范围与禁止项节 118 条断言全通过（含 93 个禁用串逐页命中 0） |
| 12 | 没有引入 Word 元数据、推断年份、外部资源或本机绝对路径 | 满足 | 「厨一枚/胡桃/2026/2025/2024/蓝色空间/新闻评价/Materials/.docx/三个 SHA/9月/http/favicon 等命中 0」＋素材 SHA-256 与 Task 1 冻结值一致 |
| 13 | 后续任务获得稳定的类名、ID、页面登记表与导航矩阵 | 满足 | 交叉核对节：15 个公共接口在四页全部就位、3 个 ID 各一次、硬编码 NAV 与 plan 导航合同逐条一致、Task 0 与 Task 2 登记表互校一致；接口清单见下方交接节 |

结论：13/13 满足。静态断言 468 条全通过；55 个针对性变异全部被同一条核验脚本捕获（0 漏检），
证明上述通过不是空跑；四页在真实浏览器 `file://` 下逐页复核，控制台仅有 styles.css／script.js
两条预期缺失提示（属 Task 3／Task 9 边界，按合同不视为本任务失败）。

## 后续任务交接（本任务已冻结的接口）

- 结构合同（Task 3 桌面视觉 / Task 8 移动布局 / Task 9 脚本）：
  `html.no-js`、`.skip-link`、`.site-header`、`.site-header__inner`、`.site-masthead`、
  `.site-masthead__link`、`#nav-toggle`＋`.nav-toggle`、`.nav-toggle__icon[aria-hidden=true]`、
  `.nav-toggle__text`、`#site-navigation`＋`.site-navigation`（初始无 `is-open`）、
  `.site-navigation__list`、`.site-navigation__item`、`.site-navigation__link`、
  `#main-content`＋`.main-content[tabindex=-1]`、`.page-title`。以上均四页齐备且 ID 唯一。
- 内容合同（Task 4–Task 7）：每页 `<main>` 现仅含一个 `<h1 class=\"page-title\">`，
  其文字与页面登记表逐字符一致，追加内容时不得改 `main-content` 的 ID、不得产生第二个 `<h1>`。
- 核验合同（Task 10）：本目录 `verify.py` 的 C／D／K 三节断言可直接并入 Task 10；
  页面登记表与导航矩阵从 `plan/Task2-建立共享HTML壳与导航.md` 逐字符解析，不硬编码内容真值。
- 回归合同（Task 11）：实测已确认焦点顺序为「跳至正文 → 报头 → 菜单按钮 → 四个导航链接」，
  且禁用 JavaScript 时导航仍在无障碍树中；按钮点击行为与 `js` 类切换待 Task 9。

## 交付文件清单（Task 2 全部产物）

| 文件 | 字节 | 说明 |
| --- | --- | --- |
"""

rows = []
for f in ["index.html", "news-message.html", "news-feature.html", "news-commentary.html"]:
    p = os.path.join(ROOT, "Results", f)
    rows.append("| `Results/%s` | %d | 公共壳＋本页 title/h1/当前页标记，正文仅唯一 `<h1>` |"
                % (f, os.path.getsize(p)))

browser = io.open(os.path.join(QA, "browser.md"), encoding="utf-8").read()
report = io.open(REPORT, encoding="utf-8").read()
report += CHECKLIST + "\n".join(rows) + "\n\n---\n\n" + browser
io.open(REPORT, "w", encoding="utf-8", newline="\n").write(report)
print("报告已生成: %s（%d 字符）" % (os.path.relpath(REPORT, ROOT), len(report)))
