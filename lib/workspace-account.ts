import { get, put } from "@vercel/blob"
import { createHash, randomBytes } from "node:crypto"

export const TRACE_IDENTITY_COOKIE = "trace_workspace_identity"

export type WorkspaceIdentity = {
  handle: string
  displayName: string
  workspaceId: string
  passwordSalt: string
  passwordHash: string
  createdAt: string
  updatedAt: string
}

export type PublicWorkspaceIdentity = Pick<WorkspaceIdentity, "handle" | "displayName" | "workspaceId" | "updatedAt">

function getIdentityPath(handle: string) {
  return `trace-identities/${handle}.json`
}

function hashPassphrase(passphrase: string, salt: string) {
  return createHash("sha256").update(`${salt}:${passphrase}`).digest("hex")
}

export function normalizeHandle(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32)
}

export function toPublicIdentity(identity: WorkspaceIdentity): PublicWorkspaceIdentity {
  return {
    handle: identity.handle,
    displayName: identity.displayName,
    workspaceId: identity.workspaceId,
    updatedAt: identity.updatedAt
  }
}

export async function readIdentity(handle: string) {
  const normalized = normalizeHandle(handle)

  if (!normalized) {
    return null
  }

  try {
    const result = await get(getIdentityPath(normalized), {
      access: "private",
      useCache: false
    })

    if (!result || result.statusCode !== 200) {
      return null
    }

    const response = new Response(result.stream)
    const identity = (await response.json()) as WorkspaceIdentity

    return identity.handle ? identity : null
  } catch {
    return null
  }
}

export async function createIdentity(options: {
  handle: string
  displayName: string
  passphrase: string
  workspaceId: string
  now: string
}) {
  const handle = normalizeHandle(options.handle)
  const displayName = options.displayName.trim().slice(0, 40)
  const passphrase = options.passphrase.trim()

  if (handle.length < 3) {
    throw new Error("Handle 至少需要 3 个字符。")
  }

  if (displayName.length < 2) {
    throw new Error("显示名称至少需要 2 个字符。")
  }

  if (passphrase.length < 8) {
    throw new Error("同步口令至少需要 8 位。")
  }

  const existing = await readIdentity(handle)

  if (existing) {
    throw new Error("这个 handle 已经被占用。")
  }

  const passwordSalt = randomBytes(16).toString("hex")
  const identity: WorkspaceIdentity = {
    handle,
    displayName,
    workspaceId: options.workspaceId,
    passwordSalt,
    passwordHash: hashPassphrase(passphrase, passwordSalt),
    createdAt: options.now,
    updatedAt: options.now
  }

  await put(getIdentityPath(handle), JSON.stringify(identity), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: "application/json"
  })

  return identity
}

export async function verifyIdentity(options: { handle: string; passphrase: string }) {
  const identity = await readIdentity(options.handle)

  if (!identity) {
    return null
  }

  const passphrase = options.passphrase.trim()

  if (!passphrase) {
    return null
  }

  const candidateHash = hashPassphrase(passphrase, identity.passwordSalt)

  return candidateHash === identity.passwordHash ? identity : null
}
