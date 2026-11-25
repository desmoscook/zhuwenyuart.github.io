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
├── image/
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

- `content/artwork.json` 是唯一作品目录源，复制为 `dist/artwork.json`。
- `public/image/` 是展示图源，复制为 `dist/image/`。
- 原对外路径不变，因此网页 `../artwork.json`、`../image/...` 请求保持。
- 图片与原数据均未改动；新增数据验证只限制既有必填字段、年份、路径和主图存在性。
- 12 个旧可选细节图路径仍缺失，构建提示但保留数据，不在这一轮强行删作品资料。
- 原图留在 `image_origin/` 且排除构建，不等于从公开 GitHub 仓库历史中隐藏原图。

### 发布产物

只允许模板输出的 5 个 HTML、作品 JSON、声明的 public 资源与 assets 进入 `dist/`。构建检查完整文件清单，不发布 `src/`、配置、测试、截图、文档、原图、Node 依赖或 `legacy/`。

`dist/` 不手改，也不提交到源码分支；CI 上传并部署同一份被测试的产物。旧单作品页暂通过显式模板保留 URL，其他旧样例只归档不发布。

## 继续小步重构的边界

本轮是 Eleventy 模板、源码目录和构建发布边界，不是视觉重设计、依赖升级或 CMS 接入。首轮源码约束的比较方式从 HTML 原始字符串升级为浏览器完整 DOM 对照；实际元素、属性、文字、CSS/JS 字节和原截图仍保持不变。

参见 [发布切换说明](deployment.md)。
