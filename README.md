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
