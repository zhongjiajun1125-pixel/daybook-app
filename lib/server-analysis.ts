import {
  buildBlueprintFromText,
  buildRecordFromBlueprint,
  type AnalysisBlueprint,
  type Mode,
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

function trimList(items: string[], fallback: string[], minLength = 3) {
  const cleaned = items.map((item) => item.trim()).filter(Boolean)

  if (cleaned.length >= minLength) {
    return cleaned
  }

  return fallback
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
      title: path.title?.trim() || fallback.title,
      summary: path.summary?.trim() || fallback.summary,
      cost: path.cost?.trim() || fallback.cost,
      outcome: path.outcome?.trim() || fallback.outcome,
      firstMove: path.firstMove?.trim() || fallback.firstMove,
      weeklyFocus: path.weeklyFocus?.trim() || fallback.weeklyFocus,
      reviewTrigger: path.reviewTrigger?.trim() || fallback.reviewTrigger
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
      category: resource.category?.trim() || fallback.category,
      title: resource.title?.trim() || fallback.title,
      note: resource.note?.trim() || fallback.note,
      reason: resource.reason?.trim() || fallback.reason
    }
  })
}

function coerceBlueprint(raw: OpenAIAnalysisShape, fallback: AnalysisBlueprint): AnalysisBlueprint {
  const paths = sanitizePaths(raw.paths, fallback.paths)
  const selectedPathId = paths.some((path) => path.id === raw.selectedPathId) ? raw.selectedPathId : paths[0].id

  return {
    templateId: fallback.templateId,
    title: raw.title?.trim() || fallback.title,
    thoughtLabel: raw.thoughtLabel?.trim() || fallback.thoughtLabel,
    analysis: {
      summary: raw.summary?.trim() || fallback.analysis.summary,
      coreProblem: raw.coreProblem?.trim() || fallback.analysis.coreProblem,
      direction: raw.direction?.trim() || fallback.analysis.direction
    },
    assumptions: trimList(raw.assumptions, fallback.assumptions),
    paths,
    selectedPathId,
    planBase: {
      today: trimList(raw.planBase?.today ?? [], fallback.planBase.today),
      thisWeek: trimList(raw.planBase?.thisWeek ?? [], fallback.planBase.thisWeek),
      metric: raw.planBase?.metric?.trim() || fallback.planBase.metric,
      guardrail: raw.planBase?.guardrail?.trim() || fallback.planBase.guardrail
    },
    resources: sanitizeResources(raw.resources, fallback.resources)
  }
}

function extractJsonText(payload: any) {
  const content = payload?.output?.flatMap((item: any) => item.content ?? []) ?? []
  const block = content.find((item: any) => typeof item.text === "string")

  return block?.text ?? null
}

async function generateWithOpenAI(thought: string, mode: Mode, fallback: AnalysisBlueprint) {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return null
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini"
  const reference = JSON.stringify(fallback, null, 2)
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You generate calm, objective structured analyses for a product called TRACE. Output concise Chinese. Do not flatter the user. Deep Mode should emphasize framing, assumptions, and path differences. Action Mode should emphasize executable structure, friction reduction, and review triggers."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `Mode: ${mode}`,
                "User thought:",
                thought,
                "",
                "Reference blueprint:",
                reference,
                "",
                "Instructions:",
                "1. Keep the same high-level object structure.",
                "2. Adapt the content to the exact user thought.",
                "3. Return three distinct paths with real tradeoffs.",
                "4. Keep path titles compact.",
                "5. Keep output useful for repeated workspace use, not marketing copy."
              ].join("\n")
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "trace_workspace_analysis",
          strict: true,
          schema: openAiAnalysisSchema
        }
      }
    })
  })

  if (!response.ok) {
    throw new Error(`OpenAI request failed with ${response.status}`)
  }

  const payload = await response.json()
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
  preferredPathId
}: AnalyzeThoughtInput) {
  const fallback = buildBlueprintFromText(thought, mode, preferredPathId)

  try {
    const generated = await generateWithOpenAI(thought, mode, fallback)

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
  } catch {
    return buildRecordFromBlueprint(thought, mode, fallback, {
      id,
      createdAt,
      parentId,
      analysisProvider: "heuristic"
    })
  }
}
