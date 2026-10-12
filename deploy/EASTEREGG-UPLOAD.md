# 彩蛋预览上传核对单

本单由 `build/pack.py` 随包生成，三个计数分别表示文件、ZIP 条目和 HTML 页面。

## 数量核对

| 数字 | 含义 | 当前值 |
| --- | --- | --- |
| 交付文件数 `4` | 目标目录的文件数 | 4 |
| ZIP 文件条目数 `5` | ZIP 内文件条目，含仅进 ZIP 的 `_headers` | 5 |
| HTML 页面数 `2` | 目标内 HTML 页面数 | 2 |

- 文章数 N = 0
- `deploy/easteregg.zip`：13481 字节，SHA-256 `1c9c2b2e4454533c239b14134278018a5fdc9b715805792c5160c921b3349c84`

Preview 部署：分支填 easteregg，根域名应为 https://easteregg.old-ns-news.pages.dev/

## 包内文件（字典序）

| 文件 | 类别 | 字节 | SHA-256 前 16 位 |
| --- | --- | ---: | --- |
| `404.html` | HTML | 716 | `527feda89e8a9cba` |
| `_headers` | 只进 ZIP | 518 | `b0273f2ff60c2c95` |
| `easteregg.css` | 资源 | 8402 | `510ae50df442199d` |
| `easteregg.js` | 资源 | 23211 | `7d1e107fe649caa9` |
| `index.html` | HTML | 13294 | `48bfde92db590d05` |

## 上传步骤

- 使用 Cloudflare Pages Direct Upload；本工具不执行上传或修改账户设置。
- Preview 部署：分支填 easteregg，根域名应为 https://easteregg.old-ns-news.pages.dev/
- 上传 `deploy/easteregg.zip`；核对 ZIP 中恰有 5 个文件、0 个目录项、2 张 HTML。
- 核对 Cloudflare 部署后的页面身份与资源 SHA-256；只看 HTTP 200 不算通过。
- Auto-Minify 与 Rocket Loader 保持关闭，以保留所列资源哈希。
- `manifest.json`、上传说明和 ZIP 本身不在目标文件目录或 ZIP 内容中。

