# 上传核对单

本单由 `build/pack.py` 随包生成，数字全部取自 `deploy/manifest.json` 的 `counts`，不要手改。

## 三个数字（口径不同，不得混用"页"与"文件"）

| 数字 | 含义 | 当前值 |
| --- | --- | --- |
| 交付文件数 `7 + N` | `Results/` 内要交付的文件（含线上专用 `404.html`），N 为详情页篇数 | 13 |
| zip 文件条目数 `8 + N` | `deploy/site.zip` 内的文件条目，含只进包不进 `Results/` 的 `_headers` | 14 |
| 站点 HTML 页面数 `5 + N` | 站点页面数（含线上专用 `404.html`）；Pages 后台的 "Pages" 计数只数 HTML | 11 |

- N = 6（内容源文章数，即详情页张数）
- `deploy/site.zip`：24314 字节
- `deploy/site.zip` SHA-256：`72870029e94964f79d57ec5f7ce830004b180d2e8460662ecd96b8765f5821c8`

三个数不相等的原因：`_headers` 只进 zip、不进 `Results/`（zip 条目比交付文件多 1）；
`styles.css` 与 `script.js` 是文件而非页面（HTML 页数比交付文件数少 2）。
`404.html` 由构建器生成并参与部署与 HTML 页计数；它仅供线上 Pages 处理未知路径，不属于文章或栏目列表，也不得按本地文件页面验收。

## 包内清单（按字典序，与 zip 内条目顺序逐行一致）

| 条目 | 类别 | 字节 | SHA-256 前 16 位 |
| --- | --- | --- | --- |
| `404.html` | 页面 | 2051 | `d7f7be1ba8546fbd` |
| `_headers` | 配置（只进包，不进 Results/） | 518 | `b0273f2ff60c2c95` |
| `article-along-the-north-small-river.html` | 页面 | 3129 | `28a18f3a37e0577d` |
| `article-classroom-screen-upgrade.html` | 页面 | 8486 | `a2dbf4aac57472e8` |
| `article-math-to-ai-learning.html` | 页面 | 6962 | `73ff75678c453bad` |
| `article-north-of-dam-river.html` | 页面 | 3292 | `2b6d2d5d51f8247a` |
| `article-school-course-selection-results.html` | 页面 | 2508 | `58da6cff5b241140` |
| `article-school-course-volunteer.html` | 页面 | 3011 | `66ae5826bbdf9829` |
| `index.html` | 页面 | 3631 | `14b82801fc5c1a96` |
| `news-commentary.html` | 页面 | 2067 | `76aa950d2967b064` |
| `news-feature.html` | 页面 | 2549 | `203a111b51988e1f` |
| `news-message.html` | 页面 | 2320 | `2e84e8001fa4bb1a` |
| `script.js` | 资源 | 2204 | `abb39e4a6d218546` |
| `styles.css` | 资源 | 15340 | `de2d9022625d6c6a` |

栏目与详情页配对（列表页 → 条目顺序即页面上的实际条目顺序）：

- 新闻消息（`news-message.html`）：`article-school-course-selection-results.html`、`article-school-course-volunteer.html`
- 新闻通讯（`news-feature.html`）：`article-along-the-north-small-river.html`、`article-north-of-dam-river.html`、`article-math-to-ai-learning.html`
- 新闻评论（`news-commentary.html`）：`article-classroom-screen-upgrade.html`

## 操作前提

- Direct Upload 由用户本人手工执行；打包脚本不上传、不调用 Cloudflare API。
- 保持 Auto-Minify 关闭：它会改写 `script.js`，而核对的是原文件哈希。
- 保持 Rocket Loader 关闭：同上，脚本被改写后哈希必然失配。
- 保持 Bot Fight Mode 关闭：易误伤大陆正常读者 UA。
- `.pages.dev` 口令保护保持关闭。
- 上传完成后，把 Pages 给出的"上传成功清单"与上表逐条核对，三个数字**分别**核对：
  交付文件 13、zip 文件条目 14、Pages 后台 "Pages" 计数 11。
- 条目缺失或数量不符时当场中止发布并报告差异条目，不做补救式重传，也不重跑构建。
- `manifest.json` 与 `UPLOAD.md` 都是部署期文件：只进 `deploy/`，绝不进 `Results/`，绝不进 zip。

