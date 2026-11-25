# 朱文语艺术作品网站

多页面静态作品集。网站运行时仍只需要 HTML、CSS、JavaScript、JSON 与图片；**Eleventy / Nunjucks 只在开发和发布构建时运行，不需要常驻后端**。

## 快速开始

需要 Node.js 22 或更新版本：

```bash
npm ci
npm run dev
```

默认预览为 `http://127.0.0.1:8001/`。修改模板、内容或资源后会自动重新构建 `dist/`，**浏览器目前仍需手动刷新**。构建失败会提示错误，并保留上一份构建成功的预览。

### 在本机查看远程机器上的页面

在你自己的电脑执行，用平时的 SSH 主机别名替换 `你的SSH主机`：

```bash
ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:18001:127.0.0.1:8001 你的SSH主机
```

保持连接，浏览器打开 `http://127.0.0.1:18001/`。VS Code Remote SSH 也可以在 Ports 面板转发远程 `8001` 并保持私有。

默认只监听远程本机，不开放公网端口。可信内网／VPN 设备需要直连时，可显式启动：

```bash
npm run dev -- --host 0.0.0.0 --port 8001
```

通过远程可达 IP 访问，不是通过 `0.0.0.0`。开发服务没有登录、TLS 或生产防护，不应直接暴露公网。浏览器自动回归测试使用独立的 `18765` 端口。

## 源码、内容与产物

```text
src/
  index.njk                   首页模板，输出 /
  about/index.njk             关于页，输出 /about/
  portfolios/index.njk        作品页，输出 /portfolios/
  contact/index.njk           联系页，输出 /contact/
  _includes/
    layouts/base.njk          唯一 HTML 文档骨架
    components/header.njk     四页共用导航与移动菜单
    components/footer.njk     四页共用页脚
    pages/*/head.njk          各页原有 head 资源顺序
  assets/css/                 首轮提取的样式（内容未改）
  assets/js/                  首轮提取的脚本（内容未改）
content/artwork.json          唯一作品目录
public/
  image/                     展示图片，输出 URL 仍为 /image/
  portfolios/                原作品页布局依赖与自定义 CSS
  wp-content/、wp-includes/   过渡期保留原 URL 的 WordPress 前端资源
  CNAME                      自定义域名文件
scripts/                     预览、构建与发布契约检查
legacy/                      旧样例；不直接复制到发布目录
image_origin/                原图保留在仓库，但不进入 dist/
tests/                       结构、DOM、行为与视觉回归
docs/                        开发与部署说明
dist/                        自动生成，不提交、不手改，只发布这里
```

- `.njk` 仍以 HTML 为主，`{% include ... %}` 在构建时插入公共模板。
- 公共导航用 `activeUrl` 和 `pageId` 保留每页原有选中态和属性，不在浏览器运行时拼导航。
- `bodyAttributes` / `htmlAttributes` 保留旧页面属性。基础布局中的 `safe` 仅用于仓库维护者编写的标记，不用于作品表单输入。
- 作品页交互：`src/assets/js/portfolio/gallery.js`。
- 作品页自定义样式：`public/portfolios/mine_style.css`。
- 新增作品：`content/artwork.json` 和 `public/image/`。数据字段与现有 52 条记录未改，尚未接入 CMS。
- CSS/JS 本轮只迁移，不合并、不升级。`src/assets/` 的分块仍是保持历史顺序的过渡结构。
- `/single_portfolio/` 旧详情 URL 暂保留：模板包含 `legacy/single_portfolio/index.html`，没有生成第二份维护源。

### URL 映射

`eleventy.config.cjs` 明确配置复制，不依赖目录名的隐式行为：

| 源文件 | 发布产物 |
| --- | --- |
| `src/about/index.njk` | `dist/about/index.html` |
| `src/assets/` | `dist/assets/` |
| `content/artwork.json` | `dist/artwork.json` |
| `public/image/` | `dist/image/` |
| `public/wp-content/` | `dist/wp-content/` |

所以访客的原 URL 和脚本里的相对请求不变。`src/`、`public/`、`content/` 不成为 URL 前缀。每份内容只有一个维护来源，根目录不再保留生成后的四个 HTML 或作品 JSON。

## 构建和预览产物

```bash
npm run build
npm run preview
```

`build` 先验证作品字段和主图，在独立临时目录生成站点，核对发布文件清单后替换 `dist/`。模板错误或校验失败不覆盖当前成功产物。发布清单排除原图、源码、测试、文档、配置和 Node 依赖；过渡期第三方目录仍完整复制。

`preview` 只查看已有产物，不监听源码；`dev` 会先构建、监听改动并重建。不要直接用 `file://` 打开模板或作品页。`dist/` 不应手改，更不能仅把 `.njk` 上传到静态托管平台就期待它自动执行。

## 验证

第一次运行浏览测试需安装固定浏览器：

```bash
npx playwright install chromium
npm run check
```

`check` 会按顺序构建，然后执行：

- `test:dev-server`：3 项开发服务检查。
- `test:structure`：15 项结构、内容、资源字节、产物边界与旧版提取约束检查。
- `test:build`：在隔离副本验证重复构建、旧产物清理、失败保护与保存自动重建。
- `npm test`：37 项浏览测试，包含页面功能、资源、四页完整 DOM 对照与 22 张旧版截图。

单独检查：

```bash
npm run test:browser
npm run test:visual
npx playwright show-report --host 127.0.0.1 --port 9323
```

`test:browser` 不含像素测试，适合 CI 的不同系统字体。完整 `npm test` 依然严格比较 22 张旧版截图，容差为零。基准使用 Linux / Chromium 159.0.8154.6，详情在 `tests/fixtures/visual-baseline.json`。外部字体、统计被一致隔离；不代表其他浏览器、真实手机和外部服务都已验证。

不得为让检查通过而直接重建截图。模板重排允许格式化空白变化，但实际浏览器解析的元素、属性和文字必须与第一轮提交 `21761d5` 一致，JS/CSS 字节仍和原提交一致。

迁移检查读取原站旧提交 `6846f0f`，完整克隆或 CI `fetch-depth: 0` 才能运行。第一轮 `21761d5` 的 DOM 已保存为 `tests/fixtures/template-dom.json`，因此第一轮即使被 squash 合并，也不需要保留该中间提交才能验收。这些是迁移约束，不是永远禁止修改内容；未来有意变更应明确调整对应断言。

## CI 与 GitHub Pages

`.github/workflows/site.yml` 对 PR 构建、检查内容和 DOM／功能，保存可下载的 `static-site` 与测试报告。CI 不自动重建本地截图基线。

部署默认关闭：需要原仓库维护者把 Pages 发布源设为 **GitHub Actions**，并设置仓库变量 `ENABLE_PAGES_DEPLOY=true`。这样只有原仓库的 `main` 才能部署，PR 和 fork 不会发布。部署上传的是同一份已验证 `dist/`，不二次构建。

**不要在仍从 `main` 根目录直接发布时，单独合并模板迁移。** 根目录不再是可直接发布的网站；管理员应按 [发布切换说明](docs/deployment.md)协调合并与发布源切换，避免旧发布流程把源码当站点发出。

本轮没有更改线上 Pages 设置、合并 PR 或发布正式站点。

## 已知问题与刻意保留

- 原库仍有重复第三方加载、两套 jQuery 和重复 `lazyloadRunObserver` 声明；运行测试显式登记这个旧异常，拒绝新增错误。
- 原本失效的本机字体地址、12 个可选细节图缺失引用仍保留并提示，未偷偷改动外观或作品数据。
- 元素 `style` 属性和 JSON `speculationrules` 保留；它们不等同于普通内联脚本。
- 原图未删除、未重写 Git 历史。排除部署不会使公开仓库或历史里的原图变成私密文件。
- 旧样例归入 `legacy/`，除显式保留的详情 URL 外不发布。
- 不在此轮引入 CMS、升级依赖或按新风格重写作品交互。

更完整说明：[远程预览与源码结构](docs/preview-and-structure.md)、[发布切换](docs/deployment.md)。
