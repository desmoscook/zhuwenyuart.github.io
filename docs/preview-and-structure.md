# 远程预览与源码结构

## 查看当前工作区

远程仓库运行：

```bash
npm ci
npm run dev
```

默认 `127.0.0.1:8001`。Eleventy 在保存 `.njk`、作品 JSON、图片或资源后重建 `dist/`；浏览器目前手动刷新。页面不是实时解释模板：浏览器始终接收生成好的 HTML。构建失败仍保留上一次成功的预览，并在终端提示。

在你自己的电脑建立 SSH 隧道：

```bash
ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:18001:127.0.0.1:8001 你的SSH主机
```

用实际 SSH 别名或 `用户名@地址` 替换占位符，保持连接，再打开：

- <http://127.0.0.1:18001/>
- <http://127.0.0.1:18001/about/>
- <http://127.0.0.1:18001/portfolios/>
- <http://127.0.0.1:18001/contact/>

如果本地 `18001` 占用，换一个本地端口即可。VS Code Remote SSH 的 Ports 面板也可转发远程 `8001`，保持私有。

默认没有开放公网监听。可信局域网或 VPN 中需要直接访问时：

```bash
npm run dev -- --host 0.0.0.0 --port 8001
```

使用远程可达 IP 加端口；`0.0.0.0` 不是浏览器地址。开发服务没有身份认证或 TLS，不应开放公网，更不应关闭防火墙。默认只服务 `dist/` 中允许的公开文件，不列目录，也不提供原图、开发文件或越界符号链接。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 初次构建、监听、重建、预览；浏览器手动刷新 |
| `npm run build` | 在临时目录校验和构建，通过后替换 `dist/` |
| `npm run preview` | 查看上次成功的 `dist/`，不监听源码 |
| `npm run check` | 构建、Node 检查、完整功能／DOM／截图检查 |
| `npm run test:browser` | 无像素检查的浏览器功能与 DOM 测试 |
| `npm run test:visual` | 22 张固定环境下的严格截图对比 |

自动测试使用 `18765`，手动预览使用 `8001`，不会抢同一个端口。`8000` 是远程其他项目的端口，不应覆盖。

## 实际目录与维护入口

```text
src/
├── index.njk
├── about/index.njk
├── portfolios/index.njk
├── contact/index.njk
├── single_portfolio/index.njk
├── _includes/
│   ├── layouts/base.njk
│   ├── components/header.njk
│   ├── components/footer.njk
│   └── pages/{home,about,contact,portfolio}/head.njk
└── assets/{css,js}/
content/artwork.json
public/
├── media/
│   ├── artworks/                  CMS 唯一图片媒体区
│   ├── site/{home,about}/          手工维护网站配图
│   └── brand/                     手工维护品牌图片
├── portfolios/{css,js}/
├── portfolios/{style.css,mine_style.css}
├── wp-content/
├── wp-includes/
└── CNAME
legacy/{portfolios,single_portfolio}/
image_origin/
scripts/
tests/
docs/
dist/
```

### 公共模板

- 基础布局只写一次 `html/head/body`，各页用 front matter 指定 `layout`、`permalink`、`activeUrl`、旧页面 ID 和属性。
- 导航与页脚由 Nunjucks 在构建时合成，不在浏览器请求另一个导航文件。
- 每页 head 仍保留旧资源顺序；这样不把模板迁移和依赖整顿混在一起。
- 页脚保留联系页原有图片优先级差异，其他组件属性也有 DOM 对照测试。

### 样式与交互

本轮不强制按新命名移动所有 CSS/JS：`src/assets/` 保留第一轮提取文件的原内容和命名，复制到同样的 `/assets/` URL。

- `src/assets/js/portfolio/gallery.js`：作品渲染、筛选与弹窗。
- `public/portfolios/mine_style.css`：作品自定义样式。
- `public/wp-content/`：旧 WordPress 主题／插件资源，暂不改网址。

未来再把作品代码拆成 `data/render/filters/modal` 模块、统一公共样式或去掉重复依赖；每个改变单独用原截图和功能测试验证。

### 内容与图片

- `content/artwork.json` 是唯一作品目录源，复制为 `dist/artwork.json`，现在已配置为 CMS 唯一内容入口。
- `public/media/artworks/` 是作品图源，复制为 `dist/media/artworks/`；数据记录 `/media/artworks/...`，前端不再拼接 `../` 图片路径。
- 非作品图在 `public/media/site/` 和 `public/media/brand/`，用同一 Git 存储／构建方式，但不交给 CMS。
- 图片迁移字节不变，页面 URL 不变，旧图片站外直链不自动重定向；CMS 上传格式与路径需真实回读验证。
- 12 个旧可选细节图路径明确登记为缺失例外，构建提示但保留数据；新增缺图和无效图片会阻止发布。
- 原图留在 `image_origin/` 且排除构建，不等于从公开 GitHub 仓库历史中隐藏原图。

### 发布产物

只允许模板输出的 5 个 HTML、作品 JSON、声明的 public 资源与 assets 进入 `dist/`。构建检查完整文件清单，不发布 `src/`、配置、测试、截图、文档、原图、Node 依赖或 `legacy/`。

`dist/` 不手改，也不提交到源码分支；CI 上传并部署同一份被测试的产物。旧单作品页暂通过显式模板保留 URL，其他旧样例只归档不发布。

## 继续小步重构的边界

本轮接入作品 CMS 并统一自有图片目录，不开放非作品内容编辑，也不升级第三方依赖或重新设计外观。迁移约束已转为长期内容检查，原截图用固定作品 fixture 保留；媒体目录调整与数据契约脚本通过显式映射与安全输入测试验证。

参见 [CMS 与图片说明](cms-and-media.md) 和 [部署说明](deployment.md)。
