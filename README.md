# TRACE v1

桌面优先的安静写作环境。  
主入口是 `/capture`，其余能力都应保持次级和低噪。

## Tech Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Supabase Auth + Database
- Framer Motion
- next-themes

## Routes

- `/auth`
- `/capture`
- `/reflect`
- `/insights`
- `/settings`

## Environment Variables

复制 `.env.example` 为 `.env.local`，填入：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

## Deploy

当前默认按 **Cloudflare Workers** 部署准备。

### Cloudflare 环境变量

在 Cloudflare Workers / Pages 项目里配置：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

其中：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

可以作为普通环境变量。

`SUPABASE_SERVICE_ROLE_KEY` 建议作为 secret。

### Workers scripts

```bash
npm run cf:build
npm run cf:preview
npm run cf:deploy
```

### 本地 Cloudflare 预览

复制：

```bash
.dev.vars.example -> .dev.vars
```

填入同样的 Supabase 变量后再运行 `npm run cf:preview`。

### 数据库初始化

先在 Supabase SQL Editor 执行：

```bash
supabase/schema.sql
```

### 备用

仓库里仍保留 `vercel.json`，如果未来要切 Vercel，也不需要重新整理 Next 结构。

## Database

Supabase SQL 在：

```bash
supabase/schema.sql
```

先在 Supabase SQL Editor 执行这份 schema，再运行应用。

## Notes

- `app/capture/page.tsx` 是产品真正首页
- `/insights` 为显式打开的分析空间，不应反过来主导 capture
- voice 支持浏览器语音识别；若环境不支持，会保持低噪降级
- insights 当前为真实结构 + mock pipeline，后续可接真实模型
