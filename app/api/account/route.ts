import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { TRACE_WORKSPACE_COOKIE, getOrCreateWorkspaceSessionId } from "@/lib/cloud-workspace"
import {
  TRACE_IDENTITY_COOKIE,
  createIdentity,
  normalizeHandle,
  readIdentity,
  toPublicIdentity,
  verifyIdentity
} from "@/lib/workspace-account"
import { formatTimestamp } from "@/lib/workspace-core"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function applyAccountCookies(response: NextResponse, options: { workspaceId: string; handle?: string | null }) {
  const secure = process.env.NODE_ENV === "production"

  response.cookies.set({
    name: TRACE_WORKSPACE_COOKIE,
    value: options.workspaceId,
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: 60 * 60 * 24 * 365,
    path: "/"
  })

  if (options.handle) {
    response.cookies.set({
      name: TRACE_IDENTITY_COOKIE,
      value: options.handle,
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: 60 * 60 * 24 * 365,
      path: "/"
    })
  } else {
    response.cookies.set({
      name: TRACE_IDENTITY_COOKIE,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: 0,
      path: "/"
    })
  }
}

export async function GET() {
  const cookieStore = cookies()
  const currentHandle = normalizeHandle(cookieStore.get(TRACE_IDENTITY_COOKIE)?.value ?? "")
  const identity = currentHandle ? await readIdentity(currentHandle) : null
  const workspaceId = identity?.workspaceId ?? getOrCreateWorkspaceSessionId(cookieStore.get(TRACE_WORKSPACE_COOKIE)?.value)
  const response = NextResponse.json({
    identity: identity ? toPublicIdentity(identity) : null,
    workspaceId
  })

  applyAccountCookies(response, {
    workspaceId,
    handle: identity?.handle ?? null
  })

  return response
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: string
      handle?: string
      displayName?: string
      passphrase?: string
    }
    const cookieStore = cookies()
    const currentWorkspaceId = getOrCreateWorkspaceSessionId(cookieStore.get(TRACE_WORKSPACE_COOKIE)?.value)

    if (body.action === "create") {
      const identity = await createIdentity({
        handle: body.handle ?? "",
        displayName: body.displayName ?? "",
        passphrase: body.passphrase ?? "",
        workspaceId: currentWorkspaceId,
        now: formatTimestamp()
      })

      const response = NextResponse.json({
        identity: toPublicIdentity(identity),
        workspaceId: identity.workspaceId
      })

      applyAccountCookies(response, {
        workspaceId: identity.workspaceId,
        handle: identity.handle
      })

      return response
    }

    if (body.action === "sign_in") {
      const identity = await verifyIdentity({
        handle: body.handle ?? "",
        passphrase: body.passphrase ?? ""
      })

      if (!identity) {
        return NextResponse.json({ error: "账号或口令不正确。" }, { status: 401 })
      }

      const response = NextResponse.json({
        identity: toPublicIdentity(identity),
        workspaceId: identity.workspaceId
      })

      applyAccountCookies(response, {
        workspaceId: identity.workspaceId,
        handle: identity.handle
      })

      return response
    }

    return NextResponse.json({ error: "不支持的账号动作。" }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "账号请求失败。"
      },
      { status: 400 }
    )
  }
}

export async function DELETE() {
  const workspaceId = crypto.randomUUID()
  const response = NextResponse.json({
    identity: null,
    workspaceId
  })

  applyAccountCookies(response, {
    workspaceId,
    handle: null
  })

  return response
}
