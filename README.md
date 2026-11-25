# 朱文语艺术作品网站

多页面静态作品集。Eleventy / Nunjucks 在构建时生成 HTML；GitHub Actions 检查并发布 `dist/` 到 GitHub Pages，不需要常驻业务服务器。

**Pages CMS 只管理作品。** 网站配图、个人照片、Logo 等也存于同一 GitHub 仓库，但不开放 CMS 内容或媒体入口。

## 开发与远程查看

需要 Node.js 22 或更新版本：

```bash
npm ci
npm run dev
```

预览为 `http://127.0.0.1:8001/`。保存模板、作品数据或图片会重新构建 `dist/`，浏览器目前手动刷新。失败时保留上次成功产物。

在自己的电脑建立 SSH 隧道：

```bash
ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:18001:127.0.0.1:8001 你的SSH主机
```

打开 `http://127.0.0.1:18001/`。也可在 VS Code Remote SSH 的 Ports 面板转发 `8001`，保持私有。开发服务没有认证或生产防护，不直接暴露公网。

## 维护目录

```text
.pages.yml                         仅作品 CMS 配置
content/
  artwork.json                     唯一作品数据源
  legacy-missing-details.json       仅记录历史缺失细节图例外
public/media/
  artworks/                        作品展示图与细节图（CMS 唯一媒体库）
  site/home/                       首页及背景配图（手工维护）
  site/about/                      关于页照片（手工维护）
  brand/                           Logo、favicon、社交图标（手工维护）
src/
  index.njk、各页面目录              页面模板
  _includes/layouts/base.njk        文档骨架
  _includes/components/            共享导航、页脚
  assets/css/                      页面与共享样式
  assets/js/portfolio/
    artwork-data.js                浏览器／构建共用数据与路径契约
    gallery.js                     安全渲染、筛选和弹窗
public/portfolios/                 原布局依赖与 mine_style.css
public/wp-content/、wp-includes/   保留原位置的第三方依赖及导出样式
scripts/                          构建、图片验证、CMS 校验、预览
legacy/                           旧样例，不直接全部发布
image_origin/                     原始素材，保持原样且不进 dist/
tests/                            内容、功能、DOM 和视觉测试
docs/                             使用与发布说明
dist/                             自动生成，不提交、不手改
```

### 图片路径

- `public/media/artworks/...` 输出为 `/media/artworks/...`，作品 JSON 也记录这个根相对地址。
- `public/media/site/...` 与 `public/media/brand/...` 使用同一存储和发布方式，不由 CMS 管理。
- 图片已按原字节迁移，无压缩、裁切或缩略图生成。两张误标为 JPG 的 PNG 只修正扩展名和引用。
- 站内 `src`、`srcset`、背景、图标、旧详情页引用已更新；旧图片站外直链不自动重定向。页面 URL 不变。
- 插件附带图标留在第三方目录，原图不搬动、不删除、不改写 Git 历史。
- 所有 public 资源都会公开。原图虽不进入 dist，公开 Git 历史中的文件仍非私密备份。

见 [图片目录与 CMS 使用说明](docs/cms-and-media.md)。

## Pages CMS 接入与使用

`.pages.yml` 只暴露：

- `content/artwork.json` 的作品数组及全部八个字段。
- `public/media/artworks/` 图片库，JPEG／PNG／WebP，随机新文件名。

合并代码后，由仓库所有者到 [app.pagescms.org](https://app.pagescms.org) 登录 GitHub，审查 GitHub App 权限，仅授权这个仓库。先在非发布分支完成真实上传、保存、回读测试，再使用 main。**配置和本地测试完成不等于托管 CMS 授权已完成。**

作品字段填好并保存后，CMS 创建 GitHub 提交；main 更新触发现有 Actions。保存成功不是上线成功，要看同一提交的 `check` / `deploy`。只上传图片不自动生成作品记录。若需要审核，在编辑分支保存后用 PR 合入 main。

分类文字、引号和 HTML 字符按普通数据处理；不会把作品输入作为 HTML 执行。图片路径只接受作品目录，发布前检查真实格式、完整解码、**5 MiB / 2400 万像素 / 单边 8000 像素**上限。不自动压缩，上传前请自行导出适合网页的展示图。

`des`、`detail` 保留资料，但当前公开弹窗尚未展示作品说明或细节图。已有 12 个缺失细节路径明确登记为例外，新增缺图会失败。

## 构建和预览产物

```bash
npm run build
npm run preview
```

构建先校验 CMS 配置、数据与图片，在临时目录生成并核对产物清单，成功后替换 `dist/`。只发布 HTML、JSON、公开媒体与运行资源，不发布 `.pages.yml`、素材原图、源码、测试、文档或依赖。

`preview` 只查看已有产物；`dev` 同时监听保存。不要直接用 `file://` 打开作品页，也不要手动编辑 dist。

## 测试

```bash
npx playwright install chromium
npm run check
```

- `test:dev-server`：3 项预览服务访问边界检查。
- `test:structure`：当前作品数据、CMS 范围、图片内容、HTML／资源与发布目录检查，允许正常新增／修改／删除作品。
- `test:build`：隔离验证 CMS 内容变动、重复构建、失败保护、保存重建和端口冲突。
- `npm test`：功能、安全输入、失败状态、完整 DOM 对照和 22 张视觉基线。

其他命令：

```bash
npm run test:browser
npm run test:visual
npm run test:media-migration
npx playwright show-report --host 127.0.0.1 --port 9323
```

`test:media-migration` 仅用于本次图片搬迁的字节／元数据证明，不是永久冻结媒体内容。常规 Actions 不运行它。

视觉测试使用固定作品 fixture 和原图片 Git blob；CMS 合法内容更新不会要求改基准图。基线固定 Linux、Playwright 1.65.1 / Chromium 159.0.8154.6、相同替代字体，零像素容差。外部字体、统计、真实手机和其他浏览器仍须独立验证。测试中的大照片 `srcset` 候选固定仅用于消除截图噪声，不修改网站本身行为。

不要直接更新截图让失败通过。DOM 对照允许本轮明确的媒体路径迁移与新增数据契约脚本，除此之外仍对照既有模板结构。

## Actions 与发布

`.github/workflows/site.yml` 继续按 main 变动构建、检查并发布。原站已切换到 Actions 并完成过首次部署；本轮不修改平台设置。部署仍受原仓库／main／非 PR／`ENABLE_PAGES_DEPLOY=true` 条件保护。

CI 运行长期内容、功能和 DOM 检查；字体环境相关截图在固定开发环境运行。检查失败不发布，上一版正式站保留。

详见 [部署说明](docs/deployment.md)、[预览与源码结构](docs/preview-and-structure.md)、[CMS 与图片](docs/cms-and-media.md)。
