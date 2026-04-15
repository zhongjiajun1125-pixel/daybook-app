import {
  buildBlueprintFromText,
  buildRecordFromBlueprint,
  type AnalysisBlueprint,
  type Mode,
  type ReviewStatus,
  type Resource,
  type PathOption
} from "@/lib/workspace-core"

type AnalyzeThoughtInput = {
  thought: string
  mode: Mode
  id: string
  createdAt: string
  parentId?: string | null
  preferredPathId?: string | null
  previousContext?: {
    thought: string
    summary: string
    selectedPathTitle: string
    reviewStatus: ReviewStatus
    reviewNote: string
  } | null
}

type OpenAIAnalysisShape = {
  title: string
  thoughtLabel: string
  summary: string
  coreProblem: string
  direction: string
  assumptions: string[]
  resources: Resource[]
  paths: PathOption[]
  selectedPathId: string
  planBase: {
    today: string[]
    thisWeek: string[]
    metric: string
    guardrail: string
  }
}

const openAiAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "thoughtLabel", "summary", "coreProblem", "direction", "assumptions", "resources", "paths", "selectedPathId", "planBase"],
  properties: {
    title: { type: "string" },
    thoughtLabel: { type: "string" },
    summary: { type: "string" },
    coreProblem: { type: "string" },
    direction: { type: "string" },
    assumptions: {
      type: "array",
      minItems: 3,
      maxItems: 4,
      items: { type: "string" }
    },
    resources: {
      type: "array",
      minItems: 3,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "title", "note", "reason"],
        properties: {
          category: { type: "string" },
          title: { type: "string" },
          note: { type: "string" },
          reason: { type: "string" }
        }
      }
    },
    paths: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "summary", "cost", "outcome", "firstMove", "weeklyFocus", "reviewTrigger"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          summary: { type: "string" },
          cost: { type: "string" },
          outcome: { type: "string" },
          firstMove: { type: "string" },
          weeklyFocus: { type: "string" },
          reviewTrigger: { type: "string" }
        }
      }
    },
    selectedPathId: { type: "string" },
    planBase: {
      type: "object",
      additionalProperties: false,
      required: ["today", "thisWeek", "metric", "guardrail"],
      properties: {
        today: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: { type: "string" }
        },
        thisWeek: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: { type: "string" }
        },
        metric: { type: "string" },
        guardrail: { type: "string" }
      }
    }
  }
} as const

const analysisSystemPrompt = [
  "You generate structured Chinese analysis for TRACE, a repeated-use thinking workspace.",
  "This is not a motivational coach, not a generic chatbot, and not a landing page.",
  "Keep tone objective, calm, specific, and slightly philosophical only when it improves clarity.",
  "Do not flatter the user. Do not exaggerate certainty. Do not invent external facts or citations.",
  "Deep Mode must emphasize framing, assumptions, tradeoffs, and why paths differ.",
  "Action Mode must emphasize executable sequencing, low-friction steps, and review triggers.",
  "Every path must be meaningfully distinct. Avoid producing three variations of the same advice.",
  "The plan should feel usable in a real workspace over time, not like abstract life advice."
].join(" ")

const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini"
const OPENAI_TIMEOUT_MS = 20000

function trimList(items: string[], fallback: string[], minLength = 3) {
  const cleaned = items.map((item) => item.trim()).filter(Boolean)

  if (cleaned.length >= minLength) {
    return cleaned
  }

  return fallback
}

function trimText(value: string | undefined, fallback: string, maxLength?: number) {
  const cleaned = value?.trim()

  if (!cleaned) {
    return fallback
  }

  return maxLength ? cleaned.slice(0, maxLength) : cleaned
}

function slugifyId(value: string, fallback: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return normalized || fallback
}

function sanitizePaths(paths: PathOption[], fallbackPaths: PathOption[]) {
  if (!Array.isArray(paths) || paths.length < 3) {
    return fallbackPaths
  }

  const seen = new Set<string>()

  return paths.slice(0, 3).map((path, index) => {
    const fallback = fallbackPaths[index] ?? fallbackPaths[0]
    let nextId = slugifyId(path.id || path.title || fallback.id, fallback.id)

    while (seen.has(nextId)) {
      nextId = `${nextId}-${index + 1}`
    }

    seen.add(nextId)

    return {
      id: nextId,
      title: trimText(path.title, fallback.title, 24),
      summary: trimText(path.summary, fallback.summary, 90),
      cost: trimText(path.cost, fallback.cost, 90),
      outcome: trimText(path.outcome, fallback.outcome, 90),
      firstMove: trimText(path.firstMove, fallback.firstMove, 80),
      weeklyFocus: trimText(path.weeklyFocus, fallback.weeklyFocus, 90),
      reviewTrigger: trimText(path.reviewTrigger, fallback.reviewTrigger, 90)
    }
  })
}

function sanitizeResources(resources: Resource[], fallbackResources: Resource[]) {
  if (!Array.isArray(resources) || resources.length < 3) {
    return fallbackResources
  }

  return resources.slice(0, 4).map((resource, index) => {
    const fallback = fallbackResources[index] ?? fallbackResources[0]

    return {
      category: trimText(resource.category, fallback.category, 20),
      title: trimText(resource.title, fallback.title, 48),
      note: trimText(resource.note, fallback.note, 90),
      reason: trimText(resource.reason, fallback.reason, 90)
    }
  })
}

function coerceBlueprint(raw: OpenAIAnalysisShape, fallback: AnalysisBlueprint): AnalysisBlueprint {
  const paths = sanitizePaths(raw.paths, fallback.paths)
  const selectedPathId = paths.some((path) => path.id === raw.selectedPathId) ? raw.selectedPathId : paths[0].id

  return {
    templateId: fallback.templateId,
    title: trimText(raw.title, fallback.title, 32),
    thoughtLabel: trimText(raw.thoughtLabel, fallback.thoughtLabel, 24),
    analysis: {
      summary: trimText(raw.summary, fallback.analysis.summary, 90),
      coreProblem: trimText(raw.coreProblem, fallback.analysis.coreProblem, 180),
      direction: trimText(raw.direction, fallback.analysis.direction, 180)
    },
    assumptions: trimList(raw.assumptions, fallback.assumptions),
    paths,
    selectedPathId,
    planBase: {
      today: trimList(raw.planBase?.today ?? [], fallback.planBase.today),
      thisWeek: trimList(raw.planBase?.thisWeek ?? [], fallback.planBase.thisWeek),
      metric: trimText(raw.planBase?.metric, fallback.planBase.metric, 90),
      guardrail: trimText(raw.planBase?.guardrail, fallback.planBase.guardrail, 90)
    },
    resources: sanitizeResources(raw.resources, fallback.resources)
  }
}

function extractJsonText(payload: any) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text
  }

  const content = payload?.output?.flatMap((item: any) => item.content ?? []) ?? []
  const block = content.find((item: any) => typeof item.text === "string")

  return block?.text ?? null
}

function extractRefusal(payload: any) {
  const content = payload?.output?.flatMap((item: any) => item.content ?? []) ?? []
  const refusalBlock = content.find((item: any) => item?.type === "refusal" && typeof item?.refusal === "string")

  return refusalBlock?.refusal ?? null
}

function buildOpenAIInput(
  thought: string,
  mode: Mode,
  fallback: AnalysisBlueprint,
  previousContext?: AnalyzeThoughtInput["previousContext"]
) {
  const sections = [
    `Mode: ${mode}`,
    "User thought:",
    thought,
    "",
    "Workspace object target:",
    JSON.stringify(fallback, null, 2),
    "",
    "Output requirements:",
    "- Return concise Chinese only.",
    "- Keep the same object structure as the target blueprint.",
    "- Make paths mutually distinct in strategy, cost, and likely result.",
    "- Make path ids short ASCII slugs.",
    "- Keep execution items concrete enough for repeated use in a workspace.",
    "- If the user input is ambiguous, narrow the problem instead of pretending certainty."
  ]

  if (previousContext) {
    sections.push(
      "",
      "Previous iteration context:",
      `- Previous thought: ${previousContext.thought}`,
      `- Previous summary: ${previousContext.summary}`,
      `- Previous selected path: ${previousContext.selectedPathTitle}`,
      `- Previous review status: ${previousContext.reviewStatus}`,
      `- Previous review note: ${previousContext.reviewNote || "（无）"}`,
      "- Use this context to refine the next analysis rather than repeating the previous output."
    )
  }

  return sections.join("\n")
}

async function generateWithOpenAI(
  thought: string,
  mode: Mode,
  fallback: AnalysisBlueprint,
  previousContext?: AnalyzeThoughtInput["previousContext"]
) {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return null
  }

  const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS)
  let response: Response

  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        max_output_tokens: 1800,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: analysisSystemPrompt
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: buildOpenAIInput(thought, mode, fallback, previousContext)
              }
            ]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "trace_workspace_analysis",
            description: "Structured TRACE workspace analysis for thought, assumptions, paths, action plan, and review.",
            strict: true,
            schema: openAiAnalysisSchema
          }
        }
      })
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    throw new Error(`OpenAI request failed with ${response.status}`)
  }

  const payload = await response.json()
  const refusal = extractRefusal(payload)

  if (refusal) {
    throw new Error(`OpenAI refusal: ${refusal}`)
  }

  const text = extractJsonText(payload)

  if (!text) {
    throw new Error("OpenAI response did not include text output")
  }

  return JSON.parse(text) as OpenAIAnalysisShape
}

export async function analyzeThoughtToRecord({
  thought,
  mode,
  id,
  createdAt,
  parentId,
  preferredPathId,
  previousContext
}: AnalyzeThoughtInput) {
  const fallback = buildBlueprintFromText(thought, mode, preferredPathId)

  try {
    const generated = await generateWithOpenAI(thought, mode, fallback, previousContext)

    if (!generated) {
      return buildRecordFromBlueprint(thought, mode, fallback, {
        id,
        createdAt,
        parentId,
        analysisProvider: "heuristic"
      })
    }

    return buildRecordFromBlueprint(thought, mode, coerceBlueprint(generated, fallback), {
      id,
      createdAt,
      parentId,
      analysisProvider: "openai"
    })
  } catch (error) {
    console.error("[TRACE analyzeThoughtToRecord] falling back to heuristic analysis", error)
    return buildRecordFromBlueprint(thought, mode, fallback, {
      id,
      createdAt,
      parentId,
      analysisProvider: "heuristic"
    })
  }
}
