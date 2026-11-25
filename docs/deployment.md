# 切换到 Eleventy 构建发布

## 当前状态与重要限制

原站的 Pages 设置是：`Deploy from a branch`，`main` 分支，`/(root)`。这项设置在本次工作中没有变更。

模板迁移后，仓库根目录不再有正式站点的 HTML；源码在 `src/`，产物在 `dist/`。**不能在维持原发布设置的情况下单独合并迁移，再假定 Pages 会解析 `.njk`。** 请维护者协调下面的发布源切换与合并。

部署工作流已准备，但默认禁用自动部署。启用需要：

1. 仓库 Pages source 改为 **GitHub Actions**。
2. 仓库 Actions variable `ENABLE_PAGES_DEPLOY` 设置为字符串 `true`。

只有 `zhuwenyuart/zhuwenyuart.github.io` 的 `main`，且不是 PR 事件，才会尝试正式部署。fork、PR、普通分支不部署。工作流没有 `pull_request_target`，不在不可信 PR 上使用写权限密钥。

## 建议维护者操作顺序

1. 第一轮 PR 先独立审阅、合并。模板迁移 PR 依赖第一轮。
2. 审阅模板迁移 PR 的 Actions 构建与功能／DOM 检查，下载 `static-site` 产物复核。固定 Linux 字体环境下的 22 张严格截图另由本地完整测试确认，CI 不会重建它们。
3. 在准备上线时，将 **Settings → Pages → Build and deployment → Source** 切换为 **GitHub Actions**。不要更改现有自定义域名或 DNS，除非另有需求。
4. 在 **Settings → Secrets and variables → Actions → Variables** 新建 `ENABLE_PAGES_DEPLOY=true`。它是开关，不是密钥。
5. 合并模板迁移 PR 到 `main`。工作流构建、检查后上传同一份 `dist/` 并部署。若流程没触发，可在 Actions 手动运行 **Check and build static site**，选择 `main`。
6. 如 `github-pages` environment 要求审批，按平台规则批准部署。
7. 检查部署成功、四页、自定义域名、52 件作品、图片、筛选、弹窗与手机布局。保存上线版本的提交编号。

上述操作需要原仓库管理员权限。创建 PR 的账号当前没有该权限，因此本轮没有代做。发布源切换和合并应在同一次上线窗口内完成；平台设置变更、首次发布或域名/CDN 的瞬时表现不能作零中断承诺。

## 工作流为什么不重新构建

`check` job 在 `ubuntu-24.04` 使用锁定依赖、Node 22 和固定 Playwright 版本，依次完成：

1. 构建到临时目录，验证产物后切换 `dist/`。
2. 预览、内容、文件清单、资源字节和构建生命周期测试。
3. Chromium 功能、加载与完整 DOM 对照测试。
4. 上传普通 `static-site` artifact 和浏览测试报告。
5. 如果正式部署开关开启，再把同一目录上传为 Pages artifact。

`deploy` job 只部署已上传的 Pages artifact，不重新执行模板生成，因此上线的是检查过的那一份内容。

## 视觉基线与 CI 的边界

旧截图来自固定 Linux / Chromium 环境及系统字体。不同 CI 系统字体会产生无业务意义的像素差异，所以工作流只运行功能、资源和 DOM 测试，不假装已在 CI 通过零像素对比。完整 `npm run check` 包含本地 22 张基线，既有基线未放宽也未改写。

## 失败与回退

- 本地模板或校验失败：只清理本次临时构建目录，上一次成功的 `dist/` 保留。
- CI 检查失败：不会执行 deploy；看浏览报告与日志后修复。
- 新版本已部署但需要回退：优先恢复到已验证的 Eleventy 提交并重新部署，或重跑之前成功的 Pages 工作流产物。
- 如必须退回迁移前的静态根目录模式：先回退代码到可直接发布的静态提交，再恢复旧 Pages 分支发布设置；不要让“模板源码”与“根目录直发”混用。
- GitHub Pages 不负责备份原图；公开仓库文件不因排除 `dist/` 变私密。

## 发布参考

- [GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Eleventy 配置与输出目录](https://www.11ty.dev/docs/config/)
- [Eleventy 静态文件复制](https://www.11ty.dev/docs/copy/)
