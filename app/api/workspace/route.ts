import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import {
  TRACE_WORKSPACE_COOKIE,
  getOrCreateWorkspaceSessionId,
  readWorkspaceState,
  writeWorkspaceState
} from "@/lib/cloud-workspace"
import { type PersistedWorkspaceState } from "@/lib/workspace-core"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function applyWorkspaceCookie(response: NextResponse, sessionId: string) {
  response.cookies.set({
    name: TRACE_WORKSPACE_COOKIE,
    value: sessionId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/"
  })
}

export async function GET() {
  const cookieStore = cookies()
  const sessionId = getOrCreateWorkspaceSessionId(cookieStore.get(TRACE_WORKSPACE_COOKIE)?.value)
  const state = await readWorkspaceState(sessionId)
  const response = NextResponse.json({
    sessionId,
    state
  })

  applyWorkspaceCookie(response, sessionId)

  return response
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<PersistedWorkspaceState>

    if (!Array.isArray(body.records) || body.records.length === 0) {
      return NextResponse.json({ error: "Workspace state is invalid." }, { status: 400 })
    }

    const cookieStore = cookies()
    const sessionId = getOrCreateWorkspaceSessionId(cookieStore.get(TRACE_WORKSPACE_COOKIE)?.value)
    await writeWorkspaceState(sessionId, body as PersistedWorkspaceState)

    const response = NextResponse.json({
      sessionId,
      state: null
    })

    applyWorkspaceCookie(response, sessionId)

    return response
  } catch {
    return NextResponse.json({ error: "Workspace save failed." }, { status: 500 })
  }
}
