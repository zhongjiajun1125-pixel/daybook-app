# TRACE

一个从模糊想法出发，把认知拆解成结构与行动路径的思考工作台原型。

## Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS

## Run

```bash
npm run dev
```

## Model Setup

优先支持 `Groq`，回退到 `OpenAI`，最后才回退到本地 heuristic。

复制 `.env.example` 到 `.env.local` 后按需填写：

```bash
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-20b
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
```

## Validate

```bash
npm run typecheck
npm run build
```
