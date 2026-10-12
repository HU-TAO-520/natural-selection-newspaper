# 自然选择号报社

中文静态报纸网站，包括新闻消息、新闻通讯、新闻评论、文章归档、投稿页面和彩蛋页面。

## 目录

- content/：文章 Markdown 和栏目配置。
- build/：Python 构建器、页面模板和彩蛋源文件。
- Results/：主站 HTML、CSS、JavaScript 静态文件。
- deploy/：部署说明、清单、响应头配置和彩蛋站点。
- tools/：投稿处理工具。
- plan/、qa/：项目合同、测试和验证资料；构建器依赖部分 QA 基线，请保留。
- skills/：添加文章、处理投稿的操作说明。
- Materials/：原始文章素材。

## 构建与验证

使用 Python 3，在仓库根目录执行：

```sh
python build/build.py --out Results
python build/pack.py all
python build/pack.py verify
```

彩蛋站点：

```sh
python build/pack.py all --target easteregg
python build/pack.py verify --target easteregg
```

详细修改流程见 skills/skill-添加新文章.md。上传步骤见 deploy/UPLOAD.md 和 deploy/EASTEREGG-UPLOAD.md。主站打包输出为 deploy/site.zip，可用于现有 Cloudflare Pages Direct Upload。

## 版本管理

```sh
git status
git add .
git commit -m "说明本次修改"
git push
```

仓库忽略本地凭据、浏览器临时数据、投稿处理状态、旧版压缩包和可重建的部署 ZIP。新建仓库不会自动改变现有网站部署方式。
