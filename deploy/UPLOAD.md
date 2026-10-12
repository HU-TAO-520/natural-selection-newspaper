# 上传核对单

本单由 `build/pack.py` 随包生成，三个计数分别表示文件、ZIP 条目和 HTML 页面。

## 数量核对

| 数字 | 含义 | 当前值 |
| --- | --- | --- |
| 交付文件数 `11 + N` | 目标目录的文件数 | 17 |
| ZIP 文件条目数 `12 + N` | ZIP 内文件条目，含仅进 ZIP 的 `_headers` | 18 |
| HTML 页面数 `7 + N` | 目标内 HTML 页面数 | 13 |

- 文章数 N = 6
- `deploy/site.zip`：41255 字节，SHA-256 `50faa65d908ba231c9fb1f556e80e21c3dfc2bfa6c40aa94fd3a0818ddd0294d`

Production 部署：上传到 old-ns-news 项目主站 https://old-ns-news.pages.dev/。

## 包内文件（字典序）

| 文件 | 类别 | 字节 | SHA-256 前 16 位 |
| --- | --- | ---: | --- |
| `404.html` | HTML | 2192 | `6522089d2c0d1a80` |
| `_headers` | 只进 ZIP | 518 | `b0273f2ff60c2c95` |
| `article-along-the-north-small-river.html` | HTML | 3269 | `c7316dd329a00a36` |
| `article-classroom-screen-upgrade.html` | HTML | 8626 | `e75ff133866912db` |
| `article-math-to-ai-learning.html` | HTML | 7102 | `69b146f874d90ba3` |
| `article-north-of-dam-river.html` | HTML | 3432 | `2739b2cfc0455c38` |
| `article-school-course-selection-results.html` | HTML | 2648 | `a4ac377ee8f822dd` |
| `article-school-course-volunteer.html` | HTML | 3151 | `9541e54fae113100` |
| `easteregg.css` | 资源 | 8402 | `510ae50df442199d` |
| `easteregg.html` | HTML | 13232 | `6d6f572c222dbce8` |
| `easteregg.js` | 资源 | 23211 | `7d1e107fe649caa9` |
| `index.html` | HTML | 3828 | `0689ce3bd4d129be` |
| `news-commentary.html` | HTML | 2207 | `52fa8647be8a58d7` |
| `news-feature.html` | HTML | 2689 | `8fa7c99d3d3c9901` |
| `news-message.html` | HTML | 2460 | `892ef97d71c1c1df` |
| `script.js` | 资源 | 2204 | `abb39e4a6d218546` |
| `styles.css` | 资源 | 15628 | `25941dccb28885d6` |
| `submission.html` | HTML | 9442 | `f55bc02bb758bec8` |

栏目及文章顺序（以页面实际条目顺序为准）：

- 新闻消息（`news-message.html`）：`article-school-course-selection-results.html`、`article-school-course-volunteer.html`
- 新闻通讯（`news-feature.html`）：`article-along-the-north-small-river.html`、`article-north-of-dam-river.html`、`article-math-to-ai-learning.html`
- 新闻评论（`news-commentary.html`）：`article-classroom-screen-upgrade.html`

## 上传步骤

- 使用 Cloudflare Pages Direct Upload；本工具不执行上传或修改账户设置。
- Production 部署：上传到 old-ns-news 项目主站 https://old-ns-news.pages.dev/。
- 上传 `deploy/site.zip`；核对 ZIP 中恰有 18 个文件、0 个目录项、13 张 HTML。
- 核对 Cloudflare 部署后的页面身份与资源 SHA-256；只看 HTTP 200 不算通过。
- Auto-Minify 与 Rocket Loader 保持关闭，以保留所列资源哈希。
- `manifest.json`、上传说明和 ZIP 本身不在目标文件目录或 ZIP 内容中。

