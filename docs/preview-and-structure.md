# 远程预览与前端目录规划

## 1. 现在怎样查看网站

### 在远程机器启动

```bash
cd /home/cyh/wp/other/zhuwenyuart.github.io
npm run dev
```

默认监听 `127.0.0.1:8001`，使用当前工作区文件，不是 GitHub 上的已发布版本。刷新浏览器可看修改；没有热更新，也不会自动部署。按 `Ctrl+C` 可停止前台预览。

机器的 `8000` 已被其他项目使用，这里不修改或停止那个服务。手动预览用 `8001`，Playwright 自动测试用 `18765`。

### 推荐：SSH 端口转发

在你自己的电脑执行，把 `你的SSH主机` 替换为平时登录远程机器使用的 SSH 别名，或 `用户名@主机地址`：

```bash
ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:18001:127.0.0.1:8001 你的SSH主机
```

然后在自己电脑浏览器打开：

- 首页：<http://127.0.0.1:18001/>
- 关于：<http://127.0.0.1:18001/about/>
- 作品：<http://127.0.0.1:18001/portfolios/>
- 联系：<http://127.0.0.1:18001/contact/>

命令中 `18001` 是你电脑上的端口，`8001` 是远程预览端口；二者可以不同。`-N` 表示只转发、不执行远程命令。保持 SSH 连接，关闭后这条访问路径断开。使用非标准 SSH 端口时，加平时使用的 `-p` 参数。若本地 `18001` 已占用，改为另一个本地端口即可。

如果使用 VS Code Remote SSH，可在 Ports 面板转发远程 `8001`，然后打开它提供的本地地址；保持端口私有，不需要上传代码或开放公网端口。

### 可选：可信内网／VPN 直连

只有明确需要其他设备直接连接时才运行：

```bash
npm run dev -- --host 0.0.0.0 --port 8001
```

用 `http://远程可达IP:8001/` 访问。`0.0.0.0` 只是“所有网卡监听”，不是网址。机器上的私有地址不一定对你的电脑可路由；是否连通还取决于 VPN、路由、防火墙和安全组。不要直接关闭防火墙或把开发服务器暴露到公网。

该预览服务没有认证、TLS 或生产流量防护。它只允许当前站点所需的公开目录／文件，不提供目录列表，并拒绝开发文件、原图和仓库外符号链接。这不等于经过完整安全审计；正式对外分享仍应使用 GitHub Pages 或受保护的预览部署。

### 自己怎样验收

打开首页、About、Portfolios、Contact，检查桌面与手机宽度。作品页测试系列／年份筛选、图片大图、关闭按钮、遮罩点击、Escape、作品区滚动与手机菜单。

自动回归：

```bash
npm run test:dev-server
npm run test:structure
npm test
```

浏览测试报告：

```bash
npx playwright show-report --host 127.0.0.1 --port 9323
```

若需要在本机看远程报告，同样建立另一条 SSH 转发，例如本地 `19323` 到远程 `9323`。报告是测试记录，不是网站本身；当前预览不代表部署上线。

## 2. “业界最佳实践”应怎样理解

没有所有前端项目都通用的唯一目录。React 应用、后台管理系统、静态作品集的需求不同。对本项目，更合适的是“轻量多页面静态站 + 明确内容契约 + 可复现构建 + 回归测试”，而不是为了目录看起来现代而引入单页应用框架。

应遵守的原则：

1. 源码、内容、公开资源、生成产物分开；每类文件只有一个权威来源。
2. 共享布局、导航与页脚只维护一处；生成后的 HTML 不手改。
3. 浏览器代码按功能内聚，共享代码确有复用后再提取。
4. 页面运行依赖与 Node 开发／构建依赖分开。
5. 原始素材、凭证、测试报告不进入公开发布产物。
6. 部署同一份已通过检查的产物，不在部署时隐式重建另一份。

## 3. 推荐的下一轮目标结构（尚未迁移）

```text
project/
├── src/
│   ├── index.njk                     # 首页模板
│   ├── about/index.njk               # 保持 /about/
│   ├── portfolios/index.njk          # 保持 /portfolios/
│   ├── contact/index.njk             # 保持 /contact/
│   ├── _includes/
│   │   ├── layouts/base.njk          # 唯一文档骨架
│   │   └── components/
│   │       ├── header.njk            # 公共导航
│   │       └── footer.njk            # 公共页脚
│   ├── _data/site.js                 # 网站公共配置；必要时读取 content
│   └── assets/
│       ├── styles/
│       │   ├── base.css              # 基础／字体／变量
│       │   ├── layout.css            # 公共布局
│       │   ├── components/           # 真实共用组件样式
│       │   └── pages/portfolio.css   # 页面专用样式
│       └── scripts/
│           ├── main.js               # 公共交互入口
│           └── features/portfolio/
│               ├── index.js          # 协调初始化
│               ├── data.js           # 加载与验证
│               ├── render.js         # 安全生成作品卡片
│               ├── filters.js        # 系列与年份选择
│               └── modal.js          # 作品弹窗
├── content/
│   └── artwork.json                  # 作品目录唯一数据源；暂保留现有字段
├── public/
│   ├── image/                        # 展示图；输出仍为 /image/
│   ├── vendor/                       # 经检查保留的第三方资源与许可证
│   ├── wp-content/、wp-includes/      # 迁移过渡期保留原 URL 的资源
│   ├── CNAME                         # 构建时按规则复制
│   └── favicon.*
├── scripts/                          # 预览、数据校验、构建辅助脚本
├── tests/
│   ├── unit/                         # 数据／筛选等纯逻辑测试
│   ├── e2e/                          # 浏览器行为测试
│   ├── visual/                       # 截图测试与基线
│   └── fixtures/                     # 测试数据
├── docs/                             # 开发、部署与架构说明
├── .github/workflows/                # 校验与部署
├── .pages.yml                        # 后续 CMS 编辑配置
├── eleventy.config.cjs               # 静态模板生成与资源复制规则
├── playwright.config.cjs
├── package.json
├── package-lock.json
├── .gitignore
└── dist/                             # 自动生成；不手改，只发布这里
```

说明：

- `.njk` 是 Nunjucks 模板。Eleventy 可在构建时将其生成普通 HTML，不增加常驻后端。
- 这里不额外放 `src/pages/`，直接在 `src/` 保留页面路径，减少不必要的路由配置。两种布局都可以，不是目录名决定质量。
- `public/` 不是 Eleventy 自动识别的魔法目录，要显式配置复制。例如 `public/image/` 复制成 `dist/image/`，不能意外输出为 `dist/public/image/`。
- `content/artwork.json` 需要显式复制或生成到 `dist/artwork.json`，保留作品页当前请求地址。不要同时维护根目录旧文件和新文件。
- `src/assets/` 需要明确复制／打包规则。本项目可以先不引入额外打包工具，JS 模块由浏览器原生支持，CSS 保持有序引用；不要同时引入多套构建链。
- `public/vendor/` 仅作为最终第三方边界。不要为了改目录把 Elementor/Astra 的资源立即改址；先在 `public/` 保持原 URL，确认引用完整再逐步收敛。
- `dist/` 生成后，用相同产物跑回归，再交给 GitHub Pages。构建失败不覆盖上一版已发布站点。
- 原图建议保存在仓库外的备份／素材空间。只是不复制进 `dist/` 不会从公开 Git 历史隐藏原图；不能在本轮直接删除原图或重写历史。

## 4. 对应当前文件怎样迁移

| 当前 | 下一轮目标 | 必须保持 |
| --- | --- | --- |
| 四个页面的 `index.html` | `src/` 下对应页面模板 | 原 URL、DOM 类名、顺序、文字与资源顺序 |
| `assets/css/` 与 `portfolios/mine_style.css` | `src/assets/styles/` | 初期不重排层叠；先让截图保持一致 |
| `assets/js/portfolio/gallery.js` | `src/assets/scripts/features/portfolio/` | 先原样搬迁，再单独拆功能 |
| `artwork.json` | `content/artwork.json`，输出 `dist/artwork.json` | 字段、数据、顺序与请求 URL |
| `image/` | `public/image/`，输出 `dist/image/` | 图片字节和对外 URL |
| WordPress 静态资源 | `public/` 下原路径 | 初期保留目录与版本，不机械移进 vendor |
| 原始素材与旧样例 | 保留或外部归档，排除部署 | 先确认备份，不自动删除 |

本轮新增的 `scripts/dev-server.cjs` 只为立刻预览，不提前迁移上述目录。目录迁移、模板抽取、依赖去重与业务模块拆分应继续分成独立小步，每一步复用既有功能／截图基线。

## 参考

- [Eleventy 官方：模板、静态构建和预览](https://www.11ty.dev/docs/)
- [Eleventy 官方：显式资源复制与输出路径映射](https://www.11ty.dev/docs/copy/)
