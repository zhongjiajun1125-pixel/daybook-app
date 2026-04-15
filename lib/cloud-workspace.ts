import { get, put } from "@vercel/blob"

import { type PersistedWorkspaceState } from "@/lib/workspace-core"

export const TRACE_WORKSPACE_COOKIE = "trace_workspace_session"

function normalizeSessionId(value: string | undefined | null) {
  if (!value) {
    return null
  }

  return /^[a-z0-9-]{12,64}$/i.test(value) ? value : null
}

function getWorkspacePath(sessionId: string) {
  return `trace-workspaces/${sessionId}/workspace.json`
}

export function getOrCreateWorkspaceSessionId(current?: string | null) {
  return normalizeSessionId(current) ?? crypto.randomUUID()
}

export async function readWorkspaceState(sessionId: string) {
  const pathname = getWorkspacePath(sessionId)

  try {
    const result = await get(pathname, {
      access: "private",
      useCache: false
    })

    if (!result || result.statusCode !== 200) {
      return null
    }

    const response = new Response(result.stream)

    return (await response.json()) as PersistedWorkspaceState
  } catch {
    return null
  }
}

export async function writeWorkspaceState(sessionId: string, state: PersistedWorkspaceState) {
  return put(getWorkspacePath(sessionId), JSON.stringify(state), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json"
  })
}
