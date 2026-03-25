# 个人新媒体运营工作台 MVP

一个面向服装类小红书运营岗位的本地可运行工作台，优先解决这些问题：

- 每天任务很多、很碎，容易忘
- 需要同时管理固定任务和临时任务
- 需要把直播预告、拍摄、脚本、文案、发布、数据复盘放到一个地方
- 需要沉淀爆款素材、竞品观察、热点词
- 需要电脑端和手机端都能打开
- 需要日报生成、复制和导出能力

当前版本基于 `Next.js + TypeScript + Tailwind + SQLite`，目标是先做一个本地能跑、页面完整、可演示的 MVP。

## 技术栈

- Next.js 16
- TypeScript
- Tailwind CSS 4
- SQLite（`better-sqlite3` 本地直连）
- `xlsx` 导出 Excel
- `docx` 导出 Word
- 浏览器语音输入（Web Speech API）

## 已完成功能

### 1. 今日工作台 Dashboard

- 今日三件最重要的事
- 今日任务列表
- 临时任务收集框
- 今日进度状态
- 下班前复盘输入框

### 2. 任务管理 Task List

- 任务名称
- 类型
- 优先级
- 截止时间
- 相关人
- 状态
- 备注
- 快速新增
- 今日 / 本周 / 全部视图
- 状态切换
- 今日重点标记

### 3. 内容排期 Content Planner

- 选题标题
- 内容类型
- 目标人群
- 场景
- 对应产品
- 脚本
- 发布时间
- 状态
- 数据回填
- 内容排期视图
- 轻量内容结构建议

### 4. 爆款素材库 Inspiration Library

- 链接 / 截图占位
- 来源账号
- 类型
- 爆点总结
- 可复用点
- 标签
- 搜索
- 标签筛选

### 5. 竞品观察 Competitor Tracker

- 账号名
- 平台
- 内容链接
- 内容主题
- 爆点
- 评论区洞察
- 对我的启发
- 日期

### 6. 热点词 / 周话题 Hot Topics

- 关键词
- 类型
- 来源
- 日期
- 可用方向
- 今天 / 本周 / 全部视图

### 7. 日报生成器 Report Generator

- 口语化输入整理为日报
- 口语化输入整理为周报草稿
- 邮件主题与邮件正文模板
- 一键复制
- 导出为 `txt` / `md` / `docx`

### 8. 兼容导出方案

- 导出 Excel 工作簿
- 复制文本 / Markdown 以便粘贴到企业微信
- 预留邮件发送接口

## 当前明确未完成

- 企业微信私有 API 未接入
- SMTP / 企业邮箱直接发送未接入
- 真正的大模型 AI 分析未接入，当前是规则式轻量整理
- 任务拖拽看板未做，当前先支持状态切换
- 素材真实图片上传未做，当前先用链接 / 截图占位
- 线上持久化数据库未做，当前仍是 SQLite 本地 / 临时文件方案

## 本地启动

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
npm run db:setup
```

如果想重置为示例数据：

```bash
npm run db:reset
```

### 3. 启动开发环境

```bash
npm run dev
```

打开：

- [http://localhost:3000](http://localhost:3000)

### 4. 生产构建验证

```bash
npm run build
```

## 数据库初始化说明

本项目默认不提交真实 SQLite 数据库文件到 GitHub。

当前采用的方式是：

- 提交代码
- 提交自动建表与示例数据初始化逻辑
- 通过 `npm run db:setup` 自动生成本地数据库

默认数据库路径：

- 本地开发：`./data/workbench.db`
- Vercel 演示环境：建议配置为 `/tmp/media-ops-workbench.db`

## 环境变量

项目当前只有一个可选环境变量：

```bash
MEDIA_OPS_DB_PATH=./data/workbench.db
```

说明：

- 本地通常不配置也能跑
- 如果部署到 Vercel，建议设置为：

```bash
MEDIA_OPS_DB_PATH=/tmp/media-ops-workbench.db
```

可参考仓库中的 `./.env.example`。

## SQLite 与 Vercel 注意事项

### 现在的现状

这个项目现在可以整理成“尽可能接近 Vercel 可部署”的版本，但 SQLite 并不适合长期作为 Vercel 线上正式数据库。

原因很直接：

- Vercel 运行环境是无状态、临时文件系统
- 即使把数据库写到 `/tmp`，数据也不能保证长期持久保存
- 部署、重启、扩容后，数据都可能丢失或不一致

### 这意味着什么

- 现在这套方案适合：
  - 本地长期使用
  - GitHub 展示
  - Vercel 线上演示
  - 临时预览链接
- 现在这套方案不适合：
  - 真正长期线上多人/多端稳定持久使用

### 最省事的后续替代方案

如果你后面要正式线上长期使用，建议优先考虑：

1. Turso
   - 和 SQLite 思路最接近
   - 对当前项目迁移成本相对低
2. Supabase Postgres
   - 生态成熟
   - 后续扩展登录、存储、权限更方便
3. Neon / 其他托管 PostgreSQL
   - 也适合做正式线上数据库

当前我没有假装帮你完成云数据库迁移，这一步还没有做。

## GitHub 上传步骤

### 1. 初始化或检查 Git 仓库

如果当前目录还没初始化：

```bash
git init
```

### 2. 添加文件

```bash
git add .
```

### 3. 提交

```bash
git commit -m "feat: initial media ops workbench mvp"
```

### 4. 关联 GitHub 仓库

把下面地址替换成你自己的仓库地址：

```bash
git remote add origin https://github.com/your-name/media-ops-workbench.git
```

如果已经有远程地址，改成：

```bash
git remote set-url origin https://github.com/your-name/media-ops-workbench.git
```

### 5. 推送

如果你的默认分支是 `main`：

```bash
git branch -M main
git push -u origin main
```

## Vercel 部署步骤

### 方案定位

当前更适合这条路径：

- 先上传 GitHub
- 先部署到 Vercel，得到一个可访问网址
- 先把它当作线上演示版 / 轻量试用版
- 后续再替换成真正的线上数据库

### 1. 导入 GitHub 仓库

- 登录 [Vercel](https://vercel.com/)
- 点击 `Add New Project`
- 选择你的 GitHub 仓库

### 2. 构建配置

本项目默认就是 Next.js 项目，通常不用改：

- Framework Preset：`Next.js`
- Build Command：`npm run build`
- Install Command：`npm install`

### 3. 配置环境变量

在 Vercel 项目设置里新增：

```bash
MEDIA_OPS_DB_PATH=/tmp/media-ops-workbench.db
```

### 4. 部署

- 点击 Deploy
- 等待构建完成
- 获得一个线上访问地址

## 数据库注意事项

部署到 Vercel 后请记住：

- 线上环境的 SQLite 只适合作演示
- 数据可能因为实例重启、重新部署而重置
- 不要把它当正式生产数据库

如果你的目标是：

- 异地手机和电脑稳定长期同步使用
- 数据不丢
- 后面继续加账号体系或文件上传

那下一步应该是把数据库迁移到云端。

## 适合提交到 GitHub 的内容

当前仓库建议提交：

- 源代码
- `README.md`
- `package.json`
- `package-lock.json`
- `.env.example`
- 数据库初始化逻辑

当前仓库不建议提交：

- `node_modules`
- `.next`
- `.env`
- 本地 SQLite 数据库文件
- 本地日志和缓存文件

## 已验证命令

我已经在当前项目上验证过这些命令：

- `npm install`
- `npm run db:setup`
- `npm run build`

## 最简操作清单

### 第一步

把项目推到 GitHub：

```bash
git add .
git commit -m "feat: prepare github and vercel deployment"
git branch -M main
git push -u origin main
```

### 第二步

去 Vercel 导入这个 GitHub 仓库，并设置环境变量：

```bash
MEDIA_OPS_DB_PATH=/tmp/media-ops-workbench.db
```

### 第三步

先把它当“线上演示版”使用；如果后面要长期稳定跨设备同步，再把数据库迁移到 Turso / Supabase / PostgreSQL。
