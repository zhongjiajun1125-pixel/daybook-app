import type { Metadata } from "next"
import type { ReactNode } from "react"

import "./globals.css"

export const metadata: Metadata = {
  title: "Objective Thinking Board",
  description: "从模糊想法出发，生成结构化认知与可执行路径。"
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
