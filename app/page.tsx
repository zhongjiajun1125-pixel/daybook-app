"use client"

import { startTransition, useEffect, useMemo, useRef, useState } from "react"
import {
  STORAGE_KEY,
  buildRecordFromText,
  buildSeedRecords,
  deriveActionPlan,
  formatTimestamp,
  getCompletionSummary,
  getExecutionProgress,
  getNextRunNumber,
  getSelectedPath,
  hydrateStoredRecord,
  isMode,
  isReviewStatus,
  normalizeText,
  pickScenario,
  scenarios,
  toggleEntry,
  type Mode,
  type PersistedWorkspaceState,
  type ReviewStatus,
  type ScenarioTemplate,
  type WorkspaceRecord
} from "@/lib/workspace-core"

const modeMeta: Record<Mode, { label: string; note: string; action: string }> = {
  deep: {
    label: "Deep Mode",
    note: "优先拆解问题、前提和路径差异。",
    action: "切换到行动模式"
  },
  action: {
    label: "Action Mode",
    note: "优先把当前选择压成执行板与复盘点。",
    action: "切换到深度模式"
  }
}

const reviewMeta: Record<ReviewStatus, { label: string; tone: string }> = {
  not_started: {
    label: "未开始",
    tone: "border-white/10 bg-white/[0.03] text-white/[0.56]"
  },
  in_progress: {
    label: "执行中",
    tone: "border-white/[0.18] bg-white/[0.08] text-white/[0.82]"
  },
  completed: {
    label: "已完成",
    tone: "border-white/[0.2] bg-white/[0.12] text-white"
  },
  blocked: {
    label: "受阻",
    tone: "border-white/[0.18] bg-black/[0.22] text-white/[0.78]"
  }
}

const analysisProviderMeta = {
  heuristic: "Local Engine",
  openai: "OpenAI"
} as const

type AnalyzeResponse = {
  record: WorkspaceRecord
}

export default function HomePage() {
  const initialRecords = useMemo(() => buildSeedRecords().map(hydrateStoredRecord), [])
  const [records, setRecords] = useState(initialRecords)
  const [selectedRecordId, setSelectedRecordId] = useState(initialRecords[0]?.id ?? "")
  const [draft, setDraft] = useState(initialRecords[0]?.thought.body ?? scenarios[0].prompt)
  const [mode, setMode] = useState<Mode>(initialRecords[0]?.mode ?? "deep")
  const [activeChip, setActiveChip] = useState<string>(initialRecords[0]?.templateId ?? "")
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>(initialRecords[0]?.review.status ?? "not_started")
  const [reviewDraft, setReviewDraft] = useState(initialRecords[0]?.review.note ?? "")
  const [historyQuery, setHistoryQuery] = useState("")
  const [nextRunNumber, setNextRunNumber] = useState(getNextRunNumber(initialRecords))
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisNotice, setAnalysisNotice] = useState<string | null>(null)
  const editorRef = useRef<HTMLTextAreaElement | null>(null)
  const hasHydratedWorkspace = useRef(false)

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId) ?? records[0],
    [records, selectedRecordId]
  )

  const currentPlan = selectedRecord ? deriveActionPlan(selectedRecord) : null
  const currentCompletion = selectedRecord ? getCompletionSummary(selectedRecord) : null
  const isDirty = selectedRecord ? normalizeText(draft) !== normalizeText(selectedRecord.thought.body) : false
  const canAnalyze = draft.trim().length > 0
  const filteredRecords = useMemo(() => {
    const query = normalizeText(historyQuery).toLowerCase()

    if (!query) {
      return records
    }

    return records.filter((record) =>
      [record.id, record.title, record.analysis.summary, record.thought.body, getSelectedPath(record).title].some((value) =>
        value.toLowerCase().includes(query)
      )
    )
  }, [historyQuery, records])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)

      if (!raw) {
        return
      }

      const parsed = JSON.parse(raw) as Partial<PersistedWorkspaceState>

      if (!Array.isArray(parsed.records) || parsed.records.length === 0) {
        return
      }

      const hydratedRecords = parsed.records.map((record) => hydrateStoredRecord(record))
      const fallbackRecord = hydratedRecords[0]
      const nextSelectedRecord =
        hydratedRecords.find((record) => record.id === parsed.selectedRecordId) ?? fallbackRecord

      setRecords(hydratedRecords)
      setSelectedRecordId(nextSelectedRecord.id)
      setDraft(typeof parsed.draft === "string" ? parsed.draft : nextSelectedRecord.thought.body)
      setMode(isMode(parsed.mode) ? parsed.mode : nextSelectedRecord.mode)
      setActiveChip(typeof parsed.activeChip === "string" ? parsed.activeChip : nextSelectedRecord.templateId ?? "")
      setReviewStatus(isReviewStatus(parsed.reviewStatus) ? parsed.reviewStatus : nextSelectedRecord.review.status)
      setReviewDraft(typeof parsed.reviewDraft === "string" ? parsed.reviewDraft : nextSelectedRecord.review.note)
      setHistoryQuery(typeof parsed.historyQuery === "string" ? parsed.historyQuery : "")
      setNextRunNumber(typeof parsed.nextRunNumber === "number" ? parsed.nextRunNumber : getNextRunNumber(hydratedRecords))
      setLastSavedAt(typeof parsed.lastSavedAt === "string" ? parsed.lastSavedAt : null)
    } catch {
      // Ignore invalid local workspace state and fall back to seed data.
    } finally {
      hasHydratedWorkspace.current = true
    }
  }, [])

  useEffect(() => {
    if (!hasHydratedWorkspace.current || typeof window === "undefined") {
      return
    }

    const nextSavedAt = formatTimestamp()
    const payload: PersistedWorkspaceState = {
      version: 2,
      records,
      selectedRecordId,
      draft,
      mode,
      activeChip,
      reviewStatus,
      reviewDraft,
      nextRunNumber,
      historyQuery,
      lastSavedAt: nextSavedAt
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    setLastSavedAt(nextSavedAt)
  }, [records, selectedRecordId, draft, mode, activeChip, reviewStatus, reviewDraft, nextRunNumber, historyQuery])

  function focusEditor() {
    requestAnimationFrame(() => {
      editorRef.current?.focus()
      editorRef.current?.setSelectionRange(editorRef.current.value.length, editorRef.current.value.length)
    })
  }

  function openRecord(record: WorkspaceRecord) {
    setSelectedRecordId(record.id)
    setDraft(record.thought.body)
    setMode(record.mode)
    setActiveChip(record.templateId ?? "")
    setReviewStatus(record.review.status)
    setReviewDraft(record.review.note)
    setAnalysisNotice(`当前分析来源：${analysisProviderMeta[record.analysisProvider]}`)
  }

  async function handleAnalyze() {
    if (!canAnalyze || isAnalyzing) {
      return
    }

    const parentId =
      selectedRecord && normalizeText(draft) !== normalizeText(selectedRecord.thought.body) ? selectedRecord.id : null
    const id = `run-${nextRunNumber}`
    const createdAt = formatTimestamp()
    const preferredPathId = selectedRecord?.templateId === pickScenario(draft)?.id ? selectedRecord.selectedPathId : null
    let record: WorkspaceRecord

    setIsAnalyzing(true)
    setAnalysisNotice(null)

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          thought: draft,
          mode,
          id,
          createdAt,
          parentId,
          preferredPathId
        })
      })

      if (!response.ok) {
        throw new Error("Analyze request failed")
      }

      const payload = (await response.json()) as AnalyzeResponse
      record = hydrateStoredRecord(payload.record)
      setAnalysisNotice(
        payload.record.analysisProvider === "openai"
          ? "当前分析来源：OpenAI"
          : "当前未配置模型密钥，已回退到 Local Engine。"
      )
    } catch {
      record = buildRecordFromText(draft, mode, {
        id,
        createdAt,
        parentId,
        preferredPathId,
        analysisProvider: "heuristic"
      })
      setAnalysisNotice("服务端分析暂不可用，已回退到 Local Engine。")
    } finally {
      setIsAnalyzing(false)
    }

    startTransition(() => {
      setRecords((current) => [record, ...current])
      setNextRunNumber((current) => current + 1)
    })

    openRecord(record)
  }

  function handleSelectHistory(recordId: string) {
    const record = records.find((item) => item.id === recordId)

    if (!record) {
      return
    }

    openRecord(record)
  }

  function handleExampleSelect(scenario: ScenarioTemplate) {
    setDraft(scenario.prompt)
    setActiveChip(scenario.id)
    setAnalysisNotice(null)
    focusEditor()
  }

  function handleSelectPath(pathId: string) {
    if (!selectedRecord) {
      return
    }

    setRecords((current) =>
      current.map((record) => (record.id === selectedRecord.id ? { ...record, selectedPathId: pathId } : record))
    )
  }

  function handleTogglePlanItem(scope: "today" | "week", item: string) {
    if (!selectedRecord || !currentPlan) {
      return
    }

    setRecords((current) =>
      current.map((record) => {
        if (record.id !== selectedRecord.id) {
          return record
        }

        const currentExecution = getExecutionProgress(record, currentPlan.selectedPath.id)
        const nextKey = scope === "today" ? "todayChecked" : "weekChecked"

        return {
          ...record,
          execution: {
            ...record.execution,
            [currentPlan.selectedPath.id]: {
              ...currentExecution,
              [nextKey]: toggleEntry(currentExecution[nextKey], item),
              updatedAt: formatTimestamp()
            }
          }
        }
      })
    )
  }

  function handleSaveReview() {
    if (!selectedRecord) {
      return
    }

    const updatedAt = formatTimestamp()

    setRecords((current) =>
      current.map((record) =>
        record.id === selectedRecord.id
          ? {
              ...record,
              review: {
                status: reviewStatus,
                note: reviewDraft,
                updatedAt
              }
            }
          : record
      )
    )
  }

  function handleReturnToIteration() {
    if (!selectedRecord || !currentPlan) {
      return
    }

    const followUpDraft = [
      `上一轮 Thought：${selectedRecord.thought.body}`,
      `当前选定路径：${currentPlan.selectedPath.title}`,
      `执行状态：${reviewMeta[reviewStatus].label}`,
      `复盘反馈：${reviewDraft || "（在这里补充实际执行结果、阻力和变化）"}`,
      "下一轮我想继续调整的是："
    ].join("\n\n")

    setDraft(followUpDraft)
    setActiveChip("")
    focusEditor()
  }

  function handleNewThought() {
    setDraft("")
    setActiveChip("")
    setReviewStatus("not_started")
    setReviewDraft("")
    setAnalysisNotice(null)
    focusEditor()
  }

  if (!selectedRecord || !currentPlan) {
    return null
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-[1600px] px-5 py-6 sm:px-6 md:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/[0.34]">TRACE / Workspace</div>
            <h1 className="mt-2 font-serif text-3xl tracking-tight text-white md:text-[2.45rem]">TRACE</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-white/[0.6]">
            <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">Saved Analyses {records.length}</div>
            <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
              {lastSavedAt ? `Local Save ${lastSavedAt}` : "Local Save Pending"}
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5">
              模糊想法 → 结构化认知 → 可执行路径
            </div>
          </div>
        </header>

        <div className="grid gap-6 py-6 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <section className="glass-panel rounded-shell p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white/[0.42]">Saved Analysis History</div>
                  <div className="mt-1 text-xs text-white/[0.54]">选择旧记录，直接回到当时的 Thought / 路径 / Review。</div>
                </div>
                <button
                  type="button"
                  onClick={handleNewThought}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/[0.72] transition duration-200 hover:bg-white/[0.06]"
                >
                  新建 Thought
                </button>
              </div>

              <div className="mt-4">
                <input
                  type="search"
                  value={historyQuery}
                  onChange={(event) => setHistoryQuery(event.target.value)}
                  placeholder="搜索 Thought / 路径 / run"
                  className="w-full rounded-[18px] border border-white/10 bg-black/[0.18] px-4 py-3 text-sm text-white/[0.84] outline-none transition duration-200 placeholder:text-white/[0.24] focus:border-white/[0.18] focus:bg-black/[0.24]"
                />
              </div>

              <div className="mt-4 space-y-3">
                {filteredRecords.map((record) => {
                  const active = record.id === selectedRecord.id
                  const selectedPath = getSelectedPath(record)
                  const completion = getCompletionSummary(record)

                  return (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => handleSelectHistory(record.id)}
                      className={`w-full rounded-[24px] border px-4 py-4 text-left transition duration-200 ${
                        active
                          ? "border-white/[0.2] bg-white/[0.08]"
                          : "border-white/10 bg-black/[0.16] hover:border-white/[0.16] hover:bg-white/[0.045]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-white/[0.86]">{record.title}</div>
                        <div className="text-[11px] text-white/[0.38]">{record.id}</div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-white/[0.32]">
                        <span>{record.createdAt}</span>
                        <span>{modeMeta[record.mode].label}</span>
                      </div>

                      <div className="mt-3 text-sm leading-6 text-white/[0.62]">{record.analysis.summary}</div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/[0.52]">
                          路径: {selectedPath.title}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] ${
                            reviewMeta[record.review.status].tone
                          }`}
                        >
                          {reviewMeta[record.review.status].label}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/[0.52]">
                          执行 {completion.completed}/{completion.total}
                        </span>
                      </div>

                      {record.parentId ? (
                        <div className="mt-3 text-xs text-white/[0.38]">迭代自 {record.parentId}</div>
                      ) : null}
                    </button>
                  )
                })}

                {filteredRecords.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-black/[0.16] px-4 py-5 text-sm leading-6 text-white/[0.5]">
                    没有匹配的历史记录。换一个关键词，或者直接新建 Thought。
                  </div>
                ) : null}
              </div>
            </section>
          </aside>

          <div className="space-y-6">
            <section className="glass-panel rounded-shell p-4 sm:p-5 md:p-6">
              <div className="flex flex-col gap-4 border-b border-white/10 pb-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-sm text-white/[0.42]">Current Thought</div>
                    <h2 className="mt-2 text-2xl font-semibold leading-tight text-white md:text-[2rem]">
                      当前编辑区是下一轮输入，不是展示文案。
                    </h2>
                  </div>

                  <div className="inline-flex w-fit rounded-full border border-white/10 bg-black/20 p-1 text-xs">
                    {(["deep", "action"] as Mode[]).map((item) => {
                      const active = item === mode

                      return (
                        <button
                          key={item}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setMode(item)}
                          className={`rounded-full px-3 py-2 transition duration-200 ${
                            active ? "bg-white text-black" : "text-white/[0.58] hover:text-white/[0.82]"
                          }`}
                        >
                          {modeMeta[item].label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm text-white/[0.54]">
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">{modeMeta[mode].label}</span>
                  <span>{modeMeta[mode].note}</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                    {isDirty ? "Draft changed" : "Synced with selected record"}
                  </span>
                </div>
              </div>

              <div className="mt-5 rounded-[28px] border border-white/10 bg-black/[0.22] p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between text-sm text-white/[0.46]">
                  <span>Thought Editor</span>
                  <span>{selectedRecord.id} currently open</span>
                </div>

                <textarea
                  ref={editorRef}
                  value={draft}
                  spellCheck={false}
                  onChange={(event) => {
                    setDraft(event.target.value)
                    setActiveChip("")
                  }}
                  className="h-56 w-full rounded-[24px] border border-white/10 bg-white/[0.045] px-4 py-4 text-sm leading-7 text-white/[0.88] outline-none transition duration-200 placeholder:text-white/[0.24] focus:border-white/[0.18] focus:bg-white/[0.06] md:text-[15px]"
                  placeholder="写下新的 Thought，或者在旧记录基础上继续迭代。"
                />

                <div className="mt-4 flex flex-wrap gap-2">
                  {scenarios.map((scenario) => {
                    const active = activeChip === scenario.id

                    return (
                      <button
                        key={scenario.id}
                        type="button"
                        onClick={() => handleExampleSelect(scenario)}
                        className={`rounded-full border px-4 py-2 text-xs transition duration-200 md:text-sm ${
                          active
                            ? "border-white/[0.24] bg-white/[0.12] text-white"
                            : "border-white/10 bg-white/[0.03] text-white/[0.62] hover:bg-white/[0.06] hover:text-white/[0.82]"
                        }`}
                      >
                        {scenario.chip}
                      </button>
                    )
                  })}
                </div>

              <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/[0.64]">
                  {isDirty
                    ? "当前输入尚未写入历史。点击“保存为新分析”会生成一条新记录，并保留当前选中的记录作为上一轮。"
                    : "当前输入与选中记录一致，适合直接查看 Paths、Action Plan 和 Review。"}
                </div>

                {analysisNotice ? (
                  <div className="mt-3 rounded-[22px] border border-white/10 bg-black/[0.18] px-4 py-3 text-sm text-white/[0.64]">
                    {analysisNotice}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={!canAnalyze || isAnalyzing}
                    className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black transition duration-200 hover:translate-y-[-1px] hover:bg-white/[0.92] disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50"
                  >
                    {isAnalyzing ? "正在分析…" : "保存为新分析"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode(mode === "deep" ? "action" : "deep")}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm text-white/[0.74] transition duration-200 hover:bg-white/[0.06] hover:text-white"
                  >
                    {modeMeta[mode].action}
                  </button>
                </div>
              </div>
            </section>

            <section className="glass-panel rounded-shell p-4 sm:p-5 md:p-6">
              <div className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm text-white/[0.42]">Active Workspace Objects</div>
                  <h3 className="mt-2 text-2xl font-semibold text-white">{selectedRecord.title}</h3>
                </div>

                <div className="grid gap-2 text-xs text-white/[0.56] sm:grid-cols-5">
                  {[
                    ["Run", selectedRecord.id],
                    ["Created", selectedRecord.createdAt],
                    ["Lens", modeMeta[selectedRecord.mode].label],
                    ["Provider", analysisProviderMeta[selectedRecord.analysisProvider]],
                    ["Progress", currentCompletion ? `${currentCompletion.completed}/${currentCompletion.total}` : "0/0"]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                      <div className="text-white/[0.34]">{label}</div>
                      <div className="mt-1 text-white/[0.76]">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-12">
                <section className="rounded-[28px] border border-white/10 bg-black/[0.18] p-4 xl:col-span-4">
                  <div className="text-sm text-white/[0.42]">Thought</div>
                  <div className="mt-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3 text-xs uppercase tracking-[0.16em] text-white/[0.38]">
                    {selectedRecord.thought.label}
                  </div>
                  <p className="mt-4 text-sm leading-7 text-white/[0.82]">{selectedRecord.thought.body}</p>

                  {selectedRecord.parentId ? (
                    <div className="mt-4 rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/[0.6]">
                      这是一条迭代记录，来自 {selectedRecord.parentId}。
                    </div>
                  ) : null}
                </section>

                <section
                  className={`rounded-[28px] border p-4 xl:col-span-8 ${
                    mode === "deep" ? "border-white/[0.18] bg-white/[0.06]" : "border-white/10 bg-black/[0.18]"
                  }`}
                >
                  <div className="text-sm text-white/[0.42]">Analysis</div>
                  <div className="mt-3 text-xl font-semibold text-white/[0.88]">{selectedRecord.analysis.summary}</div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-[22px] border border-white/10 bg-black/[0.18] p-4">
                      <div className="text-sm text-white/[0.42]">Core Problem</div>
                      <p className="mt-2 text-sm leading-7 text-white/80">{selectedRecord.analysis.coreProblem}</p>
                    </div>

                    <div className="rounded-[22px] border border-white/10 bg-black/[0.18] p-4">
                      <div className="text-sm text-white/[0.42]">Direction</div>
                      <p className="mt-2 text-sm leading-7 text-white/80">{selectedRecord.analysis.direction}</p>
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-white/[0.42]">Linked Knowledge</div>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {selectedRecord.resources.map((resource) => (
                      <div key={resource.title} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-white/40">
                            {resource.category}
                          </span>
                          <span className="text-sm font-medium text-white/[0.86]">{resource.title}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-white/[0.66]">{resource.note}</p>
                        <p className="mt-3 text-sm leading-6 text-white/50">{resource.reason}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section
                  className={`rounded-[28px] border p-4 xl:col-span-4 ${
                    mode === "deep" ? "border-white/[0.18] bg-white/[0.05]" : "border-white/10 bg-black/[0.18]"
                  }`}
                >
                  <div className="text-sm text-white/[0.42]">Assumptions</div>
                  <div className="mt-4 space-y-3">
                    {selectedRecord.assumptions.map((assumption, index) => (
                      <div key={assumption} className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
                        <div className="text-[11px] uppercase tracking-[0.16em] text-white/30">A0{index + 1}</div>
                        <div className="mt-2 text-sm leading-6 text-white/[0.72]">{assumption}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section
                  className={`rounded-[28px] border p-4 xl:col-span-8 ${
                    mode === "deep" ? "border-white/[0.18] bg-white/[0.06]" : "border-white/10 bg-black/[0.18]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-white/[0.42]">Paths</div>
                      <div className="mt-1 text-sm text-white/[0.58]">选择一条当前要执行或继续验证的路径。</div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/[0.58]">
                      当前选择: {currentPlan.selectedPath.title}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {selectedRecord.paths.map((path) => {
                      const active = path.id === selectedRecord.selectedPathId
                      const pathCompletion = getCompletionSummary(selectedRecord, path.id)

                      return (
                        <button
                          key={path.id}
                          type="button"
                          onClick={() => handleSelectPath(path.id)}
                          className={`rounded-[24px] border px-4 py-4 text-left transition duration-200 ${
                            active
                              ? "border-white/[0.22] bg-white/[0.09]"
                              : "border-white/10 bg-white/[0.03] hover:border-white/[0.16] hover:bg-white/[0.05]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-base font-medium text-white/[0.86]">{path.title}</div>
                            {active ? (
                              <span className="rounded-full border border-white/[0.16] bg-black/[0.2] px-2.5 py-1 text-[11px] text-white/[0.76]">
                                已选定
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-3 text-sm leading-6 text-white/70">{path.summary}</div>
                          <div className="mt-4 rounded-[18px] border border-white/10 bg-black/[0.18] px-3 py-2 text-xs text-white/[0.56]">
                            执行进度 {pathCompletion.completed}/{pathCompletion.total}
                          </div>
                          <div className="mt-4 text-[11px] uppercase tracking-[0.16em] text-white/30">代价</div>
                          <div className="mt-1 text-sm leading-6 text-white/60">{path.cost}</div>
                          <div className="mt-3 text-[11px] uppercase tracking-[0.16em] text-white/30">可能结果</div>
                          <div className="mt-1 text-sm leading-6 text-white/[0.72]">{path.outcome}</div>
                        </button>
                      )
                    })}
                  </div>
                </section>

                <section
                  className={`rounded-[28px] border p-4 xl:col-span-7 ${
                    mode === "action" ? "border-white/[0.18] bg-white/[0.06]" : "border-white/10 bg-black/[0.18]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-white/[0.42]">Action Plan</div>
                      <div className="mt-1 text-sm text-white/[0.58]">执行板始终基于当前选定路径生成。</div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/[0.58]">
                        {currentPlan.selectedPath.title}
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/[0.58]">
                        完成 {currentCompletion?.completed ?? 0}/{currentCompletion?.total ?? 0}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                    <div className="rounded-[24px] border border-white/[0.16] bg-white/[0.06] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-white/[0.42]">Today</div>
                        <div className="text-xs text-white/[0.46]">
                          {currentPlan.execution.todayChecked.length}/{currentPlan.today.length}
                        </div>
                      </div>
                      <div className="mt-3 space-y-3">
                        {currentPlan.today.map((item, index) => {
                          const checked = currentPlan.execution.todayChecked.includes(item)

                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => handleTogglePlanItem("today", item)}
                              className={`flex w-full items-start gap-3 rounded-[20px] border px-4 py-4 text-left transition duration-200 ${
                                checked
                                  ? "border-white/[0.18] bg-white/[0.1]"
                                  : "border-white/10 bg-black/[0.18] hover:border-white/[0.16] hover:bg-white/[0.05]"
                              }`}
                            >
                              <span
                                className={`mt-1 h-5 w-5 shrink-0 rounded-full border transition duration-200 ${
                                  checked ? "border-white bg-white" : "border-white/20 bg-transparent"
                                }`}
                              />
                              <span className="min-w-0">
                                <span className="text-[11px] uppercase tracking-[0.16em] text-white/30">Step {index + 1}</span>
                                <span
                                  className={`mt-2 block text-sm leading-6 ${
                                    checked ? "text-white/95 line-through decoration-white/30" : "text-white/[0.74]"
                                  }`}
                                >
                                  {item}
                                </span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[24px] border border-white/10 bg-black/[0.18] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm text-white/[0.42]">This Week</div>
                          <div className="text-xs text-white/[0.46]">
                            {currentPlan.execution.weekChecked.length}/{currentPlan.thisWeek.length}
                          </div>
                        </div>
                        <div className="mt-3 space-y-2">
                          {currentPlan.thisWeek.map((item) => {
                            const checked = currentPlan.execution.weekChecked.includes(item)

                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => handleTogglePlanItem("week", item)}
                                className={`flex w-full items-start gap-3 rounded-[18px] border px-3.5 py-3 text-left text-sm transition duration-200 ${
                                  checked
                                    ? "border-white/[0.16] bg-white/[0.08] text-white/90"
                                    : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/[0.16] hover:bg-white/[0.05]"
                                }`}
                              >
                                <span
                                  className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border transition duration-200 ${
                                    checked ? "border-white bg-white" : "border-white/20 bg-transparent"
                                  }`}
                                />
                                <span className={checked ? "line-through decoration-white/30" : ""}>{item}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-white/10 bg-black/[0.18] p-4">
                        <div className="text-sm text-white/[0.42]">Metric</div>
                        <p className="mt-2 text-sm leading-6 text-white/[0.74]">{currentPlan.metric}</p>
                      </div>

                      <div className="rounded-[24px] border border-white/10 bg-black/[0.18] p-4">
                        <div className="text-sm text-white/[0.42]">Guardrail</div>
                        <p className="mt-2 text-sm leading-6 text-white/[0.74]">{currentPlan.guardrail}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section
                  className={`rounded-[28px] border p-4 xl:col-span-5 ${
                    mode === "action" ? "border-white/[0.18] bg-white/[0.05]" : "border-white/10 bg-black/[0.18]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-white/[0.42]">Review</div>
                      <div className="mt-1 text-sm text-white/[0.58]">执行后回到这里记录现实结果，再继续下一轮。</div>
                    </div>

                    {selectedRecord.review.updatedAt ? (
                      <div className="text-xs text-white/40">Updated {selectedRecord.review.updatedAt}</div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(Object.keys(reviewMeta) as ReviewStatus[]).map((status) => {
                      const active = reviewStatus === status

                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setReviewStatus(status)}
                          className={`rounded-full border px-3 py-2 text-xs transition duration-200 ${
                            active
                              ? "border-white/[0.2] bg-white/[0.12] text-white"
                              : "border-white/10 bg-white/[0.03] text-white/[0.58] hover:bg-white/[0.06] hover:text-white/80"
                          }`}
                        >
                          {reviewMeta[status].label}
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/[0.64]">
                    当前路径的复盘触发点：{currentPlan.reviewTrigger}
                  </div>

                  <textarea
                    value={reviewDraft}
                    onChange={(event) => setReviewDraft(event.target.value)}
                    className="mt-4 h-40 w-full rounded-[24px] border border-white/10 bg-black/[0.18] px-4 py-4 text-sm leading-7 text-white/[0.84] outline-none transition duration-200 placeholder:text-white/[0.24] focus:border-white/[0.18] focus:bg-black/[0.24]"
                    placeholder="记录这条路径在现实里遇到的阻力、变化和结论。"
                  />

                  <div className="mt-4 flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={handleSaveReview}
                      className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black transition duration-200 hover:translate-y-[-1px] hover:bg-white/[0.92]"
                    >
                      保存 Review
                    </button>
                    <button
                      type="button"
                      onClick={handleReturnToIteration}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm text-white/[0.74] transition duration-200 hover:bg-white/[0.06] hover:text-white"
                    >
                      回写到 Thought，继续下一轮迭代
                    </button>
                  </div>
                </section>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
