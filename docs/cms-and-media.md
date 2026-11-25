# 作品 CMS 与统一图片存储

## 本次范围

- **Pages CMS 只管理作品。** 只有 `content/artwork.json` 和 `public/media/artworks/` 出现在 CMS 配置里。
- 非作品图片仍和作品图片一样，使用 GitHub 仓库保存、Eleventy 复制、GitHub Pages 提供访问；只是按用途分目录，不交给 CMS 编辑。
- 不引入对象存储、数据库、额外上传服务器、在线原图库或缩略图生成。
- 这份代码不等于已经完成 GitHub App 授权。必须由原仓库所有者安装 App，并完成托管 CMS 的真实保存测试。

## 图片存储目录

```text
public/media/
├── artworks/                 CMS 唯一图片媒体区
│   ├── 2021/                 保留现有年份／系列目录
│   ├── 2022/
│   ├── 2023/
│   ├── 2024/
│   ├── 2025/
│   └── <random>.jpg          CMS 新上传使用唯一名字
├── site/                     手工维护，CMS 不管理
│   ├── home/                 首页主视觉、预览图和背景
│   └── about/                个人照、工作室照片和关于页配图
└── brand/                    手工维护，CMS 不管理
                              Logo、站点图标、社交图标
```

将来需要展览配图可手工增加 `site/exhibitions/`，不必把该目录加到 CMS 中。

- 作品资料：`content/artwork.json` 是唯一维护源，保留数组和现有字段。
- 作品图片地址统一为 `/media/artworks/...`；CMS 的媒体 `input` 是仓库路径 `public/media/artworks`，`output` 是网页路径 `/media/artworks`。
- 本轮已完成的迁移没有压缩、裁切或缩放；当时 118 张自有公开图片保持原字节。`scripts/media-migration.json` 仅是路径迁移记录，不限制日常换图，也不参与发布校验。
- 两张“瞳孔”旧文件实际编码为 PNG 却命名为 JPG；只修正为 `.png` 及引用，字节保持一致。
- 首页／关于页模板、Logo、favicon、`srcset` 和背景 CSS 引用已更新。顺手修正了关于页原先不存在的 `zwy_-225x300.jpg` 候选引用，指向已有小图，不生成新图。
- 第三方插件自带图标等资源继续位于 `public/wp-content/plugins/` 等依赖目录；它们不是本人的网站素材，不在 CMS 或本轮媒体迁移范围。
- 原图 `image_origin/` 保持原样，不复制进 `dist/`。它仍在公开 Git 仓库中，不会因为排除网站发布而变私密；另做私有原图备份应单独处理。

### 对外地址变化

旧 `/image/...` 和 `/wp-content/uploads/2021|2025/...` 自有图片地址迁移到 `/media/...`，站内引用已全部调整。页面 URL 不变，旧图片的站外直链不会自动重定向。避免重复保存两份图，如确实需要照顾外部旧直链，可以另做发布期兼容映射，不要回头维护两个内容源。

所有 `public/media/` 资源都会公开发布，未被作品记录引用不等于私密。CMS 保存到非发布分支的内容也会存在公开 Git 仓库中。不要放私人照片、密码或未经允许公开的原图。

## CMS 设置

根目录 `.pages.yml` 定义：

- 一个作品媒体区：`public/media/artworks`。
- 一个作品编辑入口：`content/artwork.json`，`type: file`、`format: json`、`list: true`。
- 全部八个已有字段：`name/path/time/category/material/size/des/detail`。
- 图片控件固定使用作品媒体区，不开放 `site/`、`brand/`、模板或网站设置。
- JPEG、PNG、WebP 格式，随机文件名避免重名。年份必须是四位数字，分类用文字字段以支持新增系列。

字段名是前端读取契约，`label` 只是界面中文显示名；不要随意改字段名。`des` 和 `detail` 保留，但当前弹窗尚未显示作品说明或细节图，不将此轮扩成新展示功能。

### 仓库所有者一次性授权

代码审阅、合并后：

1. 打开 <https://app.pagescms.org>，用拥有原仓库权限的 GitHub 账号登录。
2. 按提示在拥有 `zhuwenyuart/zhuwenyuart.github.io` 的账号中安装 Pages CMS GitHub App。
3. 查看申请权限，选择 **Only select repositories**，只授权这个仓库。不要把 token、账号密码发给代理或写进前端。
4. 先选择非发布测试分支；确保该分支也有 `.pages.yml`。
5. 在作品管理中检查现有记录和作品图片列表：不应出现网站配图／Logo 的媒体区。
6. 用一张公开的测试作品图，上传、填写、保存、退出后重新打开。核对 JSON 仍为数组，所有旧字段与顺序保留，路径写成 `/media/artworks/...`。
7. 测试完成后确认不把测试作品误上正式站，再转到期望的编辑分支。

**这是真正需要用户在 GitHub 外部授权的一步。** 本地 YAML 语法／字段检查不能代替官方托管界面的上传、保存、重新读取验证。

CMS 界面限制不是 GitHub 安全隔离：App 本身仍获得安装时你授予的仓库权限。`site/brand` 没有 CMS 入口，不等于拥有仓库写权限的人不能通过 GitHub 改它们。

## 日常操作与发布

最简单模式：管理员在 CMS 的 `main` 分支编辑。上传图片后，再保存作品记录：

```text
图片写入 public/media/artworks/
        ↓
作品资料保存到 content/artwork.json
        ↓ main 提交
Actions：构建 → 检查 → deploy
        ↓
正式网站更新
```

- 上传图片与保存资料可能是不同提交；只传图片不自动生成作品。
- CMS 的“保存成功”只代表 GitHub 提交成功。要看该提交的 Actions `check` 和 `deploy` 成功，再把它视为已发布。
- 当前流程在 main 自动部署。若要审核，则在编辑分支保存，再由维护者用 GitHub PR 合入 main；不要假定配置已经启用 CMS 内置 PR 审批。
- 并发编辑同一个数组会有冲突风险，初期建议一次一人编辑。
- 删除作品记录不自动删除图片，避免误删共享资源；清理图片前检查引用。被删除的 Git 文件仍可能存在历史中。
- GitHub Actions 权限和 Pages 设置沿用已启用的配置，无需为 CMS 再建立上传接口、个人 token 或新的发布工作流。
- 构建失败保留上一版已发布站点，不通过删除测试或临时跳过检查强行上线。

## 内容保护

普通文本现在用 DOM 文本节点写入，名称中有引号、尖括号不会执行 HTML；筛选使用内部令牌与数据值，不用用户分类名拼 CSS 选择器。

构建与浏览器共用作品路径／数据契约；图片只能位于作品目录，不接受外站地址、目录穿越或 SVG。

作品媒体库的所有图片，包括刚上传尚未被记录引用的文件，都要通过：

- JPEG／PNG／WebP 真正格式与扩展名匹配。
- 单文件不超过 **5 MiB**。
- 不超过 **2400 万像素**、任意边不超过 **8000 像素**。
- 能完整解码，非动画／多帧文件，无目录越界符号链接。

这是发布检查，不是上传前拦截；不合格文件可能先进入 Git 提交，但不会通过本项目正常构建发布。不会自动压缩或修改用户图片，应先自行导出合适展示图再上传。

已知 12 个旧缺失细节图路径记录在 `content/legacy-missing-details.json`，只保留这些历史例外。新增缺图或主图缺失会失败；现有例外未删除，也没有虚构图片替代。

## 测试只保护必要功能

- 正常内容不冻结：允许新增、修改、删除、换图、新系列和空目录。构建仍检查实际数据与图片的合法性。
- 业务测试从当前数据选取代表作品／分类／年份，不穷举每一件，不断言具体文案、名单或顺序。
- 非法路径、损坏图片和 HTML 字符用少量独立虚构数据测试，不依赖真实作品。
- 页面样式、文案、Logo、配图和布局不做历史快照匹配；预览时人工确认即可。
- 旧 DOM、截图、迁移哈希和反复整站构建测试已退出常规代码，原验证记录留在 Git 历史／PR 中。

日常执行 `npm test`；代码或发布前执行 `npm run check`（构建、快速规则测试、核心桌面／手机操作）。内容更新不应要求维护对应测试；有意改变数据契约或功能行为时才更新测试。

## 参考

- [Pages CMS 快速开始](https://pagescms.org/docs/quick-start/)
- [媒体 input/output 与命名](https://pagescms.org/docs/configuration/media/)
- [JSON 顶层数组](https://pagescms.org/docs/configuration/content/list/)
- [图片字段](https://pagescms.org/docs/configuration/fields/image/)
