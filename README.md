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
tests/                            少量数据规则与核心操作测试
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

## 测试：少而稳定，不冻结内容

```bash
npm test                 # 快速数据／安全规则检查
npm run test:browser     # 桌面与手机核心操作
npm run check            # 构建 + 上述两类检查
```

第一次运行浏览测试需 `npx playwright install chromium`。

保留的检查只覆盖容易造成真实故障的契约：数据可增删改且允许空列表、非法路径／损坏图片被拒绝、筛选有效、弹窗对应选中作品、手机菜单可跳转，以及普通文字不执行 HTML。

测试不保存当前作品名单、数量、顺序、年份、分类、文案或图片哈希。业务测试从当前目录取样；异常输入用少量虚构数据，不依赖网站内容。改标题、加作品、换图、新增分类或调整排版无需更新测试。只有有意改变数据规则或核心功能行为时，才需要更新对应测试。

历史 DOM／像素快照、迁移字节证明、分类／断点穷举和反复复制整站构建的测试已移除。既有重构证明可从 Git 历史或旧 PR 查阅，不作为长期发布门槛。样式调整用预览人工确认，不要求维护整页截图基线。

失败时查看报告：

```bash
npx playwright show-report --host 127.0.0.1 --port 9323
```

## Actions 与发布

`.github/workflows/site.yml` 继续按 main 变动构建、检查并发布。原站已切换到 Actions 并完成过首次部署；本轮不修改平台设置。部署仍受原仓库／main／非 PR／`ENABLE_PAGES_DEPLOY=true` 条件保护。

CI 使用相同的轻量流程：构建时校验当前内容，运行快速规则测试，再做核心桌面／手机冒烟检查。没有历史 DOM／像素冻结或旧提交依赖。检查失败不发布，上一版正式站保留。

详见 [部署说明](docs/deployment.md)、[预览与源码结构](docs/preview-and-structure.md)、[CMS 与图片](docs/cms-and-media.md)。
