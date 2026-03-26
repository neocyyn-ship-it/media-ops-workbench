# 个人新媒体运营工作台 MVP

一个面向服装类小红书运营岗位的本地可运行工作台，先把任务、内容排期、素材沉淀、竞品观察、热点词和日报整理放到一个地方。

当前项目基于：

- Next.js 16
- TypeScript
- Tailwind CSS 4
- SQLite (`better-sqlite3`)
- OpenAI official SDK

## 已完成功能

- Dashboard 今日工作台
- 任务管理
- 内容排期
  - 月 / 周 / 日三种视图
  - 颜色标签与标签说明
  - 星期几展示
  - 法定节假日标注
  - 节假日前 3 天自动高亮“直播预热期”
  - 节后 2 天自动高亮“节后回流期”
  - 拖拽改日期
- 爆款素材库
- 竞品观察
- 热点词整理
- 日报生成器
- 站内 AI 运营助理 MVP
  - 右下角聊天入口
  - 服务端 OpenAI 接口 `/api/assistant/chat`
  - 默认参考站内任务、排期、热点词和日报草稿

## 本地启动

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
npm run db:setup
```

如果你想重置成示例数据：

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

## 环境变量

参考 [`.env.example`](/E:/media-ops-workbench/.env.example)

### 数据库

```bash
MEDIA_OPS_DB_PATH=./data/workbench.db
```

本地通常可以不配，默认就会落到 `./data/workbench.db`。

### AI 助理

```bash
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-5-mini
```

说明：

- `OPENAI_API_KEY` 只在服务端使用，不会暴露到浏览器
- `OPENAI_MODEL` 不填时，当前代码默认使用 `gpt-5-mini`

## Vercel 部署

### 推荐做法

1. 把仓库推到 GitHub
2. 在 Vercel 导入仓库
3. 配好环境变量
4. Deploy

### Vercel 环境变量

至少加上：

```bash
MEDIA_OPS_DB_PATH=/tmp/media-ops-workbench.db
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-5-mini
```

### 重要说明

- 现在的 AI 助理可以在 Vercel 上运行
- 但当前数据库仍然是 SQLite
- SQLite 在 Vercel 上只能算演示方案，因为 `/tmp` 不是长期持久存储
- 所以：
  - 前端和 AI 可以线上用
  - 数据持久化不适合长期正式依赖

## 数据库注意事项

### 现在适合

- 本地长期使用
- GitHub 展示
- Vercel 线上演示
- 临时跨设备访问

### 现在不适合

- 长期稳定线上持久化
- 多人协同正式生产使用

### 后续最省事的替代方案

- Turso
- Supabase Postgres
- Neon / 其他托管 PostgreSQL

## AI 助理接法说明

当前 AI 接入采用官方推荐的路线：

- 使用官方 `openai` SDK
- 使用 `Responses API`
- 通过 Next.js 服务端路由调用
- API Key 只放在服务器环境变量里

当前实现位置：

- [assistant chat route](/E:/media-ops-workbench/src/app/api/assistant/chat/route.ts)
- [assistant dock](/E:/media-ops-workbench/src/components/assistant-dock.tsx)

如果没有配置 `OPENAI_API_KEY`：

- 网站仍然能正常打开
- 右下角 AI 助理会提示你去配置环境变量
- 不会导致整站崩掉

## GitHub 上传

```bash
git add .
git commit -m "feat: add planner drag-drop and ai assistant"
git push
```

如果你的 Vercel 已经连了这个仓库，推送后会自动触发新部署。

## 验证状态

我已经实际跑过：

- `npm run db:setup`
- `npm run lint`
- `npm run build`

## 官方 OpenAI 文档

这次 AI 接入参考的是官方文档：

- [Using the API](https://platform.openai.com/docs/quickstart/using-the-api)
- [Text generation](https://platform.openai.com/docs/guides/text)
- [Models](https://platform.openai.com/docs/models)

说明：

- 官方文档当前推荐优先使用 `Responses API`
- 模型选择上，示例常用 `gpt-5`
- 这次项目里我默认落成 `gpt-5-mini`，这是基于站内运营助理场景对成本和速度的权衡判断
