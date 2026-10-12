# Task20 本地验收报告

日期：2026-10-05（Asia/Taipei）  
合同：R14 / ns-bridge-v1  
文章数：N=6  
结论：**INCOMPLETE；未达到 LOCAL_ACCEPTED**。产品、双目标打包和静态验收已完成。完整验收被 Task18/19 独立 Chrome/CDP 无法启动及未完成的浏览器负向用例阻断。没有上传或访问线上域名。

## 交付包

| 目标 | 磁盘文件 | HTML | ZIP 条目 | SHA-256 |
| --- | ---: | ---: | ---: | --- |
| main `deploy/site.zip` | 16 | 12 | 17 | `df3692829ffe1fc0031214a27bdbfbdcde50419b2b3080391fae12b8d3a1292f` |
| preview `deploy/easteregg.zip` | 4 | 2 | 5 | `1c9c2b2e4454533c239b14134278018a5fdc9b715805792c5160c921b3349c84` |

main 的 16 个文件和 preview 的 4 个文件都与各自 manifest 对应；各 ZIP 条目、磁盘字节、SHA-256、元数据和确定性重建独立核验通过。`easteregg.css` 与 `easteregg.js` 在两目标中的哈希一致。上传指南与当前包哈希/大小相符。

## 通过项目

- 两目标构建、自检、打包及打包器回验：8 条命令均退出码 0。
- C01–C12 纯规则测试：源 core 与生产 `Results/easteregg.js` bundle 均退出码 0。
- story 19、binding 6、style 5、main-candidate 6、dual-target 4、static 26 项通过。
- 独立包核验：27 PASS / 0 FAIL。
- Loopback HTTP fixture 使用真实 `deploy/_headers`：14 PASS / 0 FAIL，包含 main/preview 身份、同源 CSS/JS、未知路径 404、错误页身份与 CSP。
- Task18 独立文章源检查：退出码 0，`fail_count=0`，文章数 6。
- 本机 Codex In-app Browser 手动走查：三幕按实际控件通关，错误反馈、终幕、刷新恢复、重放、Enter/Space、阶段标题焦点均观察通过；新增实测首页链接可用 Tab 聚焦并按 Enter 打开同标签彩蛋页。浏览器控制台错误/警告为空。
- 视口 320、360、768、769、1440 的文档宽度均无横向溢出；桌面与手机布局已目视检查。
- Task20 kickoff 的受保护文件哈希检查通过；`deploy/_headers` 仍为 518 字节、SHA-256 `b0273f2ff60c2c95d24899b8bd8a72ae050d233bc38e8b9903a28421d6f9ba7a`。Task18 历史报告和源事实文件与 `qa/_audit_20261004/` 的对应备份哈希相等。

## 未通过或未完成

- Task18 浏览器探针退出码 2：`Error: chrome 未启动`，只产出绑定当前页面哈希的 `facts.json`，没有 DOM 快照。源检查虽通过，整站闸门仍为 762 条中 PASS 642 / FAIL 120 / PENDING 0；失败包括 `M0/browser` 及依赖 DOM 的结构、首页、文章链接/段落等断言。它们没有被当作通过。
- Task19 all 退出码 2：驱动记录 `RZ99 TypeError: fetch failed`，未进入断言阶段。没有运行 17 个同轮分段；一致性核验退出码 2，报告明确显示找不到 `results-seg-*.json`。Task19 报告自身生成命令退出码 0，但其判定为 FAIL 1。
- Task20 浏览器矩阵是部分手工证据，不是全套通过：200% 缩放、storage 异常注入、禁 JS/CSS、无关存储键、`prefers-reduced-motion`、浏览器级网络请求追踪和完整读屏检查未完成。规定的截图文件未保存；M01–M14 负向变异未运行。
- 线上 O01–O04 均未运行，当前没有用户上传状态；保持“待用户手工上传，线上未验证”。

## 本轮机器摘要与证据位置

`run20.ps1 -Phase local` 的原始新 run 摘要：**PASS 13 / FAIL 4 / SKIPPED-BY-DESIGN 2，状态 INCOMPLETE**。四个失败为 Task18 探针/闸门、Task19 all、一致性；两项跳过为同轮纸媒分段与自动浏览器/负向用例，原因是 Chrome/CDP 阻塞。人工走查补记于同目录的 `browser_observations.json`，不改变机器摘要的原始结论。

- 本轮 run：`qa/_qa_task20/runs/task20-local-20261005-133941/`
- 自动编排：`qa/_qa_task20/run20.ps1`
- 双包独立检查：`qa/_qa_task20/verify_packages20.py`
- HTTP 夹具：`qa/_qa_task20/http_fixture20.mjs`
- 主包上传说明：`deploy/UPLOAD.md`
- 预览包上传说明：`deploy/EASTEREGG-UPLOAD.md`
- 加稿维护流程：`skills/skill-添加新文章.md`（已更新 R14 数量与双目标区分）

要达到完整本地验收，需要在能启动独立 Chrome/CDP 的环境重跑 Task18/19 与 17 段一致性，并完成尚缺的浏览器用例、截图和负向变异；随后重跑 `run20.ps1 -Phase local`。上传仍由用户操作；上传后才运行线上复验。
