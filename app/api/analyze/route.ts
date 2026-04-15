import { NextResponse } from "next/server"

import { analyzeThoughtToRecord } from "@/lib/server-analysis"
import { isMode, isReviewStatus } from "@/lib/workspace-core"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const thought = typeof body?.thought === "string" ? body.thought.trim() : ""
    const mode = body?.mode
    const id = typeof body?.id === "string" ? body.id : ""
    const createdAt = typeof body?.createdAt === "string" ? body.createdAt : ""
    const parentId = typeof body?.parentId === "string" ? body.parentId : null
    const preferredPathId = typeof body?.preferredPathId === "string" ? body.preferredPathId : null
    const previousContext =
      body?.previousContext &&
      typeof body.previousContext === "object" &&
      typeof body.previousContext.thought === "string" &&
      typeof body.previousContext.summary === "string" &&
      typeof body.previousContext.selectedPathTitle === "string" &&
      isReviewStatus(body.previousContext.reviewStatus)
        ? {
            thought: body.previousContext.thought,
            summary: body.previousContext.summary,
            selectedPathTitle: body.previousContext.selectedPathTitle,
            reviewStatus: body.previousContext.reviewStatus,
            reviewNote: typeof body.previousContext.reviewNote === "string" ? body.previousContext.reviewNote : ""
          }
        : null

    if (!thought) {
      return NextResponse.json({ error: "Thought is required." }, { status: 400 })
    }

    if (!isMode(mode)) {
      return NextResponse.json({ error: "Mode is invalid." }, { status: 400 })
    }

    if (!id || !createdAt) {
      return NextResponse.json({ error: "Record id and createdAt are required." }, { status: 400 })
    }

    const record = await analyzeThoughtToRecord({
      thought,
      mode,
      id,
      createdAt,
      parentId,
      preferredPathId,
      previousContext
    })

    return NextResponse.json({ record })
  } catch {
    return NextResponse.json({ error: "Analyze request failed." }, { status: 500 })
  }
}
