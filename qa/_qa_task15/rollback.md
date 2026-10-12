# Task 15 回滚程序（rollback.md）

本包**不是 git 仓库**，`_qa_task15/before/` 是唯一的回滚手段。本文件的目标是：任何人在不阅读 Task 12–15 合同、不依赖口头知识的前提下，也能把 `Results/` 恢复到切换前的 v1 状态。

## 触发条件

出现下列任一情形即执行回滚，**不得手工调平 HTML**：

- 15.3 构建后 `Results/` 九文件哈希与表 2 期望值有任何一字节差异；
- 15.4 详情页 `<main>` 内部与 `_qa_task13/main_slices/` 对应切片不等（最高级别异常）；
- 15.4 详情页 `<main>` 之外出现第三处差异（允许的两处为 `<title>` 主体与 `aria-current` 所在链接）；
- 15.5 首页 `#main-content` 直接子元素不为 3、标签集合不为 R4 值、可见内容白名单不为按序 14 项；
- `Results/` 出现清单外文件或子目录；
- `styles.css` 或 `script.js` 的哈希相对表 1 发生变化（违反 `Task12` R10）。

回滚后必须在 `_qa_task15/report.md` 记录失败现象、定位到的合同条款、回流的 upstream 任务号（`content/` 有错→Task 13；构建器行为有错→Task 14；`Results/` 被外部工具改写→定位工具）。**不得**通过修改断言或手改 HTML 让检查变绿。

## 回滚步骤

工作目录：项目根 `C:\Users\weibo\Documents\语文报纸`（下称 `.`）。

1. 恢复六个壳文件（逐字节复制，**不要**重新格式化、不要用编辑器另存）：

   ```sh
   cp -f _qa_task15/before/index.html            Results/index.html
   cp -f _qa_task15/before/news-message.html     Results/news-message.html
   cp -f _qa_task15/before/news-feature.html     Results/news-feature.html
   cp -f _qa_task15/before/news-commentary.html  Results/news-commentary.html
   cp -f _qa_task15/before/styles.css            Results/styles.css
   cp -f _qa_task15/before/script.js             Results/script.js
   ```

2. 删除本包新建的三个详情页（只有这三个文件名允许删除）：

   ```sh
   rm -f Results/article-school-course-volunteer.html
   rm -f Results/article-math-to-ai-learning.html
   rm -f Results/article-classroom-screen-upgrade.html
   ```

3. 确认 `Results/` 恰为六文件、无子目录、无 `.bak`／`_out`／`__pycache__` 之类残留：

   ```sh
   ls -1 Results
   ```

   期望且仅有：`index.html news-commentary.html news-feature.html news-message.html script.js styles.css`

4. 哈希校验（与 `_qa_task15/hashes_before.txt` 逐条相等）：

   ```sh
   (cd Results && sha256sum index.html news-message.html news-feature.html news-commentary.html styles.css script.js)
   ```

   期望值（表 1）：

   | 文件 | SHA-256 | 字节 |
   | --- | --- | --- |
   | `index.html` | `971e57a5f85bae99c389e58d7a132e96c02388432de997c4df3d4af495e6416a` | 2629 |
   | `news-message.html` | `66ae5826bbdf9829206c6374305e7bf4bab546c65485349db5fff40e0b5fa0e8` | 3011 |
   | `news-feature.html` | `73ff75678c453badbc1edcb1ff590001dc93cade3260ff364e042d02075df9a5` | 6962 |
   | `news-commentary.html` | `a2dbf4aac57472e8a8728f80908dc366d3aa9076310bbb39b24d71f251ea8d52` | 8486 |
   | `styles.css` | `2c23817299492ea9a3fd7ad23237cfabd6723d166bd99194febbed09ad418ba1` | 12401 |
   | `script.js` | `abb39e4a6d218546b45eded0fa601540d2c5195d93c9fe1dfa8aaaabca13c666` | 2204 |

   或用脚本一次性判定（退出码 0 即回滚成功）：

   ```sh
   PYTHONIOENCODING=utf-8 python _qa_task15/s08_rollback_drill.py --apply Results
   ```

5. 回滚后不得继续发布动作：`Results/` 回到 v1 即等同于"Task 15 尚未发生"，`deploy/` 仍不得写入。

## 禁止事项

- 不得删除 `_qa_task15/before/`（保留到 Task 19 通过并经用户确认）。
- 不得用 `_qa_task14/out/` 直接覆盖 `Results/`（那是复制文件而不是回滚，且绕过了构建）。
- 不得为了"先看看效果"手工编辑任何 HTML。
- 不得改动 `content/`、`build/` 来迁就 `Results/` 的现状。

## 演练记录

见 `_qa_task15/s08_rollback_drill.py` 的输出与 `report.md`：回滚程序在 `_qa_task15/rollback_drill/` 副本上完整执行一次（不触碰真实 `Results/`），并在恢复后用本文件的哈希表校验通过。
