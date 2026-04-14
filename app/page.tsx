"use client"

import { startTransition, useEffect, useMemo, useRef, useState } from "react"

type Mode = "deep" | "action"

type ReviewStatus = "not_started" | "in_progress" | "completed" | "blocked"

type Resource = {
  category: string
  title: string
  note: string
  reason: string
}

type PathOption = {
  id: string
  title: string
  summary: string
  cost: string
  outcome: string
  firstMove: string
  weeklyFocus: string
  reviewTrigger: string
}

type AnalysisFrame = {
  summary: string
  coreProblem: string
  direction: string
  assumptions: string[]
}

type PlanBase = {
  today: string[]
  thisWeek: string[]
  metric: string
  guardrail: string
}

type WorkspaceTemplate = {
  templateId: string | null
  title: string
  thoughtLabel: string
  resources: Resource[]
  paths: PathOption[]
  defaultPathByMode: Record<Mode, string>
  planBase: PlanBase
  frames: Record<Mode, AnalysisFrame>
}

type ScenarioTemplate = WorkspaceTemplate & {
  id: string
  chip: string
  prompt: string
  keywords: string[]
}

type WorkspaceRecord = {
  id: string
  title: string
  mode: Mode
  createdAt: string
  templateId: string | null
  parentId: string | null
  thought: {
    label: string
    body: string
  }
  analysis: {
    summary: string
    coreProblem: string
    direction: string
  }
  assumptions: string[]
  paths: PathOption[]
  selectedPathId: string
  planBase: PlanBase
  resources: Resource[]
  review: {
    status: ReviewStatus
    note: string
    updatedAt: string | null
  }
}

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

const scenarios: ScenarioTemplate[] = [
  {
    id: "balance",
    chip: "平衡工作 / 健身 / 阅读",
    prompt:
      "我最近很迷茫，不知道工作、健身、阅读到底该怎么平衡。我不想只是列计划，而是想知道到底应该先建立什么判断框架，才能不再每周都推翻自己。",
    keywords: ["工作", "健身", "阅读", "平衡", "迷茫"],
    templateId: "balance",
    title: "平衡工作 / 健身 / 阅读",
    thoughtLabel: "多目标秩序",
    defaultPathByMode: {
      deep: "mainline",
      action: "minimum-dose"
    },
    frames: {
      deep: {
        summary: "当前更缺的是目标排序原则，而不是更多任务清单。",
        coreProblem: "你不是没有目标，而是同时运行多个价值系统，却没有一个稳定的排序机制来决定今天该优先什么。",
        direction: "先把多目标生活压成主线、维持线和放弃线，再决定每天怎么安排，而不是继续同时最优。",
        assumptions: [
          "你默认三件事都应该持续增长。",
          "你把掉速理解成失败，而不是阶段性的重排。",
          "你希望先把结构彻底想对，再开始真正执行。"
        ]
      },
      action: {
        summary: "先给真正重要的事留出不可被挤掉的时间块。",
        coreProblem: "当前阻力不在理解，而在日程没有为主线任务预留稳定位置。",
        direction: "未来 7 天只锁定一个主任务块，其余目标全部降为最低维持剂量，用连续性代替全面性。",
        assumptions: [
          "你把高标准执行当成开始条件。",
          "你仍然希望一次性解决全部平衡问题。",
          "你没有接受某些目标必须暂时只保活。"
        ]
      }
    },
    paths: [
      {
        id: "mainline",
        title: "主线优先",
        summary: "先承认这段时间只能让一个方向真正向前推进。",
        cost: "其他目标短期会明显放缓。",
        outcome: "最容易恢复稳定感和连续感。",
        firstMove: "今天先锁定一个 90 分钟不可移动的主线时段。",
        weeklyFocus: "本周只允许一个目标拥有高质量时段。",
        reviewTrigger: "第 7 天只看主线是否推进，而不是是否面面俱到。"
      },
      {
        id: "rotation",
        title: "周期轮换",
        summary: "按周或按双周轮换重点，而不是每天平均分配。",
        cost: "需要接受某些维度在当前周不增长。",
        outcome: "适合不想长期压低某个目标的人。",
        firstMove: "把接下来两周明确分成主周与维持周。",
        weeklyFocus: "本周只允许一个领域承担增长任务，其余只保最低线。",
        reviewTrigger: "周末看轮换是否减少了临时推翻计划的冲动。"
      },
      {
        id: "minimum-dose",
        title: "最低剂量并行",
        summary: "先用极低门槛把三个目标都维持住。",
        cost: "成长速度较慢，不会立刻有强烈成就感。",
        outcome: "最适合先把系统稳住，再逐步加码。",
        firstMove: "训练固定 40 分钟，阅读固定 20 分钟，主任务只保一个推进动作。",
        weeklyFocus: "本周所有动作都压到能连续完成的最低版本。",
        reviewTrigger: "第 7 天看自己是否更少内耗，而不是是否瞬间高效。"
      }
    ],
    planBase: {
      today: ["停止再重写整套系统。", "只允许一个主任务拥有高强度注意力。", "睡前用 3 句话记录今天是否完成最低线。"],
      thisWeek: ["不临时新增第四个目标。", "如果某天掉线，只恢复最低版本，不整套重开。", "每晚先记录事实，再评价感受。"],
      metric: "主线推进次数 + 最低线完成率 + 自我推翻次数",
      guardrail: "不要把一两天的波动解释成结构失效。"
    },
    resources: [
      {
        category: "Book",
        title: "《少有人走的路》",
        note: "帮助处理责任承担、延迟满足与自我规训。",
        reason: "适合这类问题，因为它会逼你区分舒服和长期有效。"
      },
      {
        category: "Behavior",
        title: "行为设计",
        note: "先减少启动摩擦，再逐步提高标准。",
        reason: "你的问题不是只靠想清楚就能解决。"
      },
      {
        category: "Training",
        title: "周期化训练逻辑",
        note: "不同目标不应共享同一强度周期。",
        reason: "它能解释为什么多目标同时高压时系统会整体失衡。"
      },
      {
        category: "Philosophy",
        title: "控制区分",
        note: "先划分可控制节奏，再谈理想状态。",
        reason: "它能帮助你从追求全部兼得，转向先建立秩序。"
      }
    ]
  },
  {
    id: "fat-loss",
    chip: "减脂但不想厚重",
    prompt:
      "我想减脂，但我不想练成很厚重的肌肉，怎么做最合理？我更在意线条、轻盈感和长期能坚持的方式，不想用极端训练或者饮食。",
    keywords: ["减脂", "肌肉", "厚重", "线条", "训练", "饮食"],
    templateId: "fat-loss",
    title: "减脂但不想厚重",
    thoughtLabel: "体型目标",
    defaultPathByMode: {
      deep: "hybrid",
      action: "hybrid"
    },
    frames: {
      deep: {
        summary: "你关心的不是数字，而是体型审美、体验和长期可持续。",
        coreProblem: "你把力量训练和厚重外形直接绑定，导致目标定义和训练想象彼此冲突。",
        direction: "先把目标改写成“轻盈线条 + 代谢维护”，再决定训练结构，而不是在纯有氧和极端增肌之间做错误二选一。",
        assumptions: [
          "你默认只要练力量，就会变成自己不想要的体型。",
          "你把短期体重下降误当成体型改善的主要指标。",
          "你仍然倾向于用极端方案换取确定感。"
        ]
      },
      action: {
        summary: "先建立一个不会在第 10 天崩掉的节律。",
        coreProblem: "当前最需要的不是更激进，而是一个稳定、可恢复、能长期跑下去的模板。",
        direction: "接下来 8 周用轻力量 + 稳态有氧 + 低摩擦饮食，把结果交给连续性而不是短期用力过猛。",
        assumptions: [
          "你会把“有效”误读成“极端”。",
          "你对体型变化的判断太依赖当天镜像和情绪。",
          "你没有给饮食控制设计足够现实的默认规则。"
        ]
      }
    },
    paths: [
      {
        id: "cardio-only",
        title: "纯有氧主导",
        summary: "优先追求体重下降与轻盈感。",
        cost: "线条支持和代谢维持通常较弱。",
        outcome: "短期掉秤更明显，但长期外形不一定更接近目标。",
        firstMove: "把本周有氧频率先排稳，但不要删掉全部力量训练。",
        weeklyFocus: "只把有氧当作辅助，不要把它当成唯一结构。",
        reviewTrigger: "两周后看的是体能与体型支持，而不是只看秤。"
      },
      {
        id: "hybrid",
        title: "轻力量 + 稳态有氧",
        summary: "在体型支持和轻盈感之间取平衡。",
        cost: "需要固定周节奏和恢复纪律。",
        outcome: "最接近你要的线条、轻盈和可持续并存。",
        firstMove: "先固定一周 3 次全身力量训练和 2 次低强度有氧。",
        weeklyFocus: "优先守住模板，而不是临时加码补偿。",
        reviewTrigger: "第 14 天看执行稳定度、恢复质量和腰围变化。"
      },
      {
        id: "extreme-cut",
        title: "高压极端期",
        summary: "用更大缺口和更强刺激换取短期反馈。",
        cost: "恢复、坚持和情绪成本都高。",
        outcome: "短期刺激强，但与你的长期偏好并不匹配。",
        firstMove: "如果选择这条，先定义退出条件，避免越做越极端。",
        weeklyFocus: "每周必须评估疲劳与反扑风险。",
        reviewTrigger: "只要出现补偿性暴食或明显疲劳，就应立即退回更稳的路径。"
      }
    ],
    planBase: {
      today: ["每餐先保证蛋白质和蔬菜。", "甜食不禁掉，但改为计划内摄入。", "体重只看周均值，不做日判断。"],
      thisWeek: ["不要临时加训去补偿饮食波动。", "把恢复和睡眠当成计划的一部分。", "继续记录腰围、恢复感和训练完成率。"],
      metric: "腰围变化 + 周均体重 + 恢复感 + 模板执行率",
      guardrail: "不要因为短期波动就切换到更极端的方案。"
    },
    resources: [
      {
        category: "Book",
        title: "《Burn》",
        note: "帮助理解能量消耗、代谢适应和运动神话。",
        reason: "它能纠正“只要练更狠就一定更有效”的直觉。"
      },
      {
        category: "Behavior",
        title: "低摩擦饮食设计",
        note: "通过默认选择降低饮食失控概率。",
        reason: "长期体型变化更多依赖结构，不依赖短期意志力。"
      },
      {
        category: "Training",
        title: "全身力量训练模板",
        note: "保留瘦体重、维护线条和代谢能力。",
        reason: "这能避免减脂时只剩体重下降，外形却更空。"
      },
      {
        category: "Philosophy",
        title: "中道实践",
        note: "避免极端，把审美目标转成可持续行动。",
        reason: "它能帮助你抵抗“要么很狠，要么放弃”的二元反应。"
      }
    ]
  },
  {
    id: "knowledge-gap",
    chip: "懂很多道理却没改善",
    prompt:
      "我总觉得自己懂很多道理，但生活并没有真正改善。我会看很多书、很多观点，也会分析自己，可最后执行很弱，现实没有明显变化。",
    keywords: ["懂很多", "道理", "改善", "执行", "分析", "现实"],
    templateId: "knowledge-gap",
    title: "懂很多道理却没改善",
    thoughtLabel: "认知与行动断层",
    defaultPathByMode: {
      deep: "single-action",
      action: "single-action"
    },
    frames: {
      deep: {
        summary: "你缺的不是更多解释，而是把理解压到环境、节奏和回合反馈里。",
        coreProblem: "输入不断增长，但行为系统没有形成，所以知识长期停留在解释层，而没有变成现实中的结构变化。",
        direction: "暂停继续扩大输入，把一个高频原则翻译成最小动作和固定触发器，再让现实反馈反过来修正理解。",
        assumptions: [
          "你默认理解会自然转化成改变。",
          "你把行动当成理解完成后的下一阶段。",
          "你高估了抽象反思，低估了重复动作的塑形作用。"
        ]
      },
      action: {
        summary: "先让一个可重复动作出现，而不是继续升级理论。",
        coreProblem: "当前最大的损耗是精力都花在理解上，却没有把执行起点压到足够低。",
        direction: "选一条自己反复认同的原则，把它压成一个 10 分钟动作，连续执行 7 天，期间不允许新增输入任务。",
        assumptions: [
          "你仍然希望先把理论做对，再开始动作。",
          "你没有给执行设置足够轻的起点。",
          "你仍然把现实阻力理解成自己还没想明白。"
        ]
      }
    },
    paths: [
      {
        id: "more-input",
        title: "继续扩大输入",
        summary: "继续看书、看观点、整理理论框架。",
        cost: "安全，但低转化，容易继续停留在解释层。",
        outcome: "会增加解释能力，但不会明显改变现实结构。",
        firstMove: "如果坚持这条，先限定输入窗口，不要继续无限扩张。",
        weeklyFocus: "每周最多新增一个来源，而不是不断追加。",
        reviewTrigger: "如果现实行为仍无变化，就说明输入不是当前瓶颈。"
      },
      {
        id: "single-action",
        title: "单动作训练",
        summary: "只抓一个动作，让认知第一次真正下沉。",
        cost: "短期成就感低，也没有理论扩张的快感。",
        outcome: "最有机会把道理真正压进生活结构。",
        firstMove: "只选一个最常认同却最少执行的原则，把它改写成 10 分钟动作。",
        weeklyFocus: "七天内不新增任何新的书、课程或系统。",
        reviewTrigger: "第 7 天只问：现实摩擦有没有下降，而不是理解有没有升级。"
      },
      {
        id: "project-loop",
        title: "结果导向项目",
        summary: "通过真实项目逼迫知识转化为结果。",
        cost: "会更快暴露现实不足，也更不舒适。",
        outcome: "反馈最真实，但失败感也更直接。",
        firstMove: "给自己一个必须交付的微型项目，而不是继续抽象思考。",
        weeklyFocus: "每周只围绕项目产出复盘，而不是围绕情绪总结。",
        reviewTrigger: "如果项目推进仍然卡住，说明阻力在行为层而不是知识层。"
      }
    ],
    planBase: {
      today: ["暂停新增输入任务。", "把动作压到 10 分钟内完成。", "记录现实阻力，不写抽象感想。"],
      thisWeek: ["每天只追求完成，不追求顿悟。", "先重复，再决定是否扩展动作。", "第 7 天再判断是否升级系统。"],
      metric: "动作完成率 + 现实阻力变化 + 新输入压制程度",
      guardrail: "不要在动作刚开始后又重新回到优化理论。"
    },
    resources: [
      {
        category: "Book",
        title: "《Atomic Habits》",
        note: "把抽象目标翻译成环境与重复。",
        reason: "它能帮助你从“知道”转向“可重复发生”。"
      },
      {
        category: "Behavior",
        title: "实施意图",
        note: "把模糊决心改写成何时何地做什么。",
        reason: "这是把思考转成动作的关键中间层。"
      },
      {
        category: "Training",
        title: "技能训练日志",
        note: "让复盘基于具体回合，而不是情绪总结。",
        reason: "你需要现实反馈，而不是更多自我解释。"
      },
      {
        category: "Philosophy",
        title: "威廉·詹姆斯的习惯观",
        note: "人格稳定感更多来自反复动作，而不是抽象信念。",
        reason: "它提醒你：改变常常先发生在行为层。"
      }
    ]
  }
]

function formatTimestamp(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${month}-${day} ${hours}:${minutes}`
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

function pickScenario(text: string) {
  const lower = text.trim().toLowerCase()

  if (!lower) {
    return scenarios[0]
  }

  return scenarios.find((scenario) => scenario.keywords.some((keyword) => lower.includes(keyword.toLowerCase()))) ?? null
}

function buildGenericTemplate(text: string): WorkspaceTemplate {
  const cleaned = text.trim() || "当前这段想法"
  const subject = cleaned.length > 34 ? `${cleaned.slice(0, 34)}…` : cleaned

  return {
    templateId: null,
    title: "自定义 Thought",
    thoughtLabel: "自定义输入",
    defaultPathByMode: {
      deep: "scope-first",
      action: "minimum-loop"
    },
    frames: {
      deep: {
        summary: "先划定问题边界，再谈深度和路径。",
        coreProblem: `围绕“${subject}”，当前真正缺少的不是更多信息，而是一个清晰的问题边界和判断标准。`,
        direction: "先把问题压缩成一个本周就能验证的主问题，再决定需要补什么资料、比较什么路径。",
        assumptions: [
          "你可能默认要先把所有变量想清楚才能开始。",
          "你还没有为这个问题建立明确判断标准。",
          "你可能在同时处理过多维度，导致结构始终发散。"
        ]
      },
      action: {
        summary: "先让一个最小闭环出现，再决定是否扩展。",
        coreProblem: `对于“${subject}”，当前阻力更像启动过重，而不是你真的不知道该做什么。`,
        direction: "把问题压成一个今天能完成的最小动作，再配一个固定复盘点，连续跑 7 天。",
        assumptions: [
          "你把好方案理解成完整方案。",
          "你还没有给自己留下轻量版本。",
          "你可能把持续犹豫误认为继续思考。"
        ]
      }
    },
    paths: [
      {
        id: "scope-first",
        title: "先缩窄范围",
        summary: "优先确定边界，而不是马上追求完整答案。",
        cost: "会暂时放弃一部分复杂性。",
        outcome: "最容易把模糊问题转成可判断对象。",
        firstMove: "今天只写出一个最需要验证的主问题。",
        weeklyFocus: "本周不允许同时扩展多个方向。",
        reviewTrigger: "如果一周后问题仍然过大，说明边界还没有切够。"
      },
      {
        id: "minimum-loop",
        title: "最小闭环",
        summary: "先跑一个最小动作与复盘回合。",
        cost: "结论不会很完整，也不够漂亮。",
        outcome: "最快拿到现实反馈，适合当前启动阻力高时。",
        firstMove: "给这个问题一个 10 到 30 分钟内可完成的动作版本。",
        weeklyFocus: "七天内只追求闭环，不追求宏大系统。",
        reviewTrigger: "七天后看动作是否反复发生，而不是看理解是否升级。"
      },
      {
        id: "evidence-first",
        title: "先补证据层",
        summary: "先找参考系，再决定路径。",
        cost: "行动会更晚出现。",
        outcome: "适合当前问题判断标准极不明确时。",
        firstMove: "先列出 3 个值得追的参考来源，而不是继续泛化搜索。",
        weeklyFocus: "本周只收集与主问题直接相关的资料。",
        reviewTrigger: "如果资料仍然没有缩窄问题，说明收集方向不对。"
      }
    ],
    planBase: {
      today: ["只保留一个要验证的问题。", "给它一个最小动作版本。", "在结束前只记录发生了什么。"],
      thisWeek: ["不要同时扩写多个系统。", "持续记录现实阻力。", "第 7 天再决定是否升级复杂度。"],
      metric: "最小动作完成率 + 问题边界清晰度",
      guardrail: "不要在第一轮就要求完整答案。"
    },
    resources: [
      {
        category: "Book",
        title: "《The Inner Game of Work》",
        note: "把观察从情绪评价转向结构化反馈。",
        reason: "适合先学会怎样看问题，而不是急着解决。"
      },
      {
        category: "Behavior",
        title: "行为设计",
        note: "先设计可重复动作，再讨论高标准版本。",
        reason: "它几乎适用于所有模糊但需要落地的问题。"
      },
      {
        category: "Training",
        title: "最小闭环系统",
        note: "任何有效方案都应能在现实场景中反复完成。",
        reason: "它会强迫输出从概念正确回到可持续。"
      },
      {
        category: "Philosophy",
        title: "实践理性",
        note: "判断标准必须回到行动，而不是停留在观点层。",
        reason: "它适合作为这类问题的底层校准器。"
      }
    ]
  }
}

function buildRecordFromText(
  text: string,
  mode: Mode,
  options: {
    id: string
    createdAt: string
    parentId?: string | null
    preferredPathId?: string | null
    review?: Partial<WorkspaceRecord["review"]>
  }
) {
  const matchedScenario = pickScenario(text)
  const template = matchedScenario ?? buildGenericTemplate(text)
  const frame = template.frames[mode]
  const selectedPathId =
    options.preferredPathId && template.paths.some((path) => path.id === options.preferredPathId)
      ? options.preferredPathId
      : template.defaultPathByMode[mode]

  return {
    id: options.id,
    title: template.title,
    mode,
    createdAt: options.createdAt,
    templateId: template.templateId,
    parentId: options.parentId ?? null,
    thought: {
      label: template.thoughtLabel,
      body: text
    },
    analysis: {
      summary: frame.summary,
      coreProblem: frame.coreProblem,
      direction: frame.direction
    },
    assumptions: frame.assumptions,
    paths: template.paths,
    selectedPathId,
    planBase: template.planBase,
    resources: template.resources,
    review: {
      status: options.review?.status ?? "not_started",
      note: options.review?.note ?? "",
      updatedAt: options.review?.updatedAt ?? null
    }
  } satisfies WorkspaceRecord
}

function buildSeedRecords() {
  return [
    buildRecordFromText(scenarios[2].prompt, "action", {
      id: "run-103",
      createdAt: "04-14 09:40",
      preferredPathId: "single-action",
      review: {
        status: "in_progress",
        note: "已经冻结了新增输入两天，但晚上还是会想继续看资料。下一轮要把触发点再提前。",
        updatedAt: "04-14 09:55"
      }
    }),
    buildRecordFromText(scenarios[0].prompt, "deep", {
      id: "run-102",
      createdAt: "04-13 21:10",
      preferredPathId: "mainline",
      review: {
        status: "completed",
        note: "把工作当成主线后，训练和阅读反而稳定了，不再每天推翻自己。",
        updatedAt: "04-13 22:08"
      }
    }),
    buildRecordFromText(scenarios[1].prompt, "action", {
      id: "run-101",
      createdAt: "04-12 18:20",
      preferredPathId: "hybrid",
      review: {
        status: "blocked",
        note: "训练模板本身没问题，但出差后饮食失控，说明规则还不够现实。",
        updatedAt: "04-12 23:14"
      }
    })
  ]
}

function getSelectedPath(record: WorkspaceRecord) {
  return record.paths.find((path) => path.id === record.selectedPathId) ?? record.paths[0]
}

function deriveActionPlan(record: WorkspaceRecord) {
  const selectedPath = getSelectedPath(record)

  return {
    selectedPath,
    today: [selectedPath.firstMove, ...record.planBase.today],
    thisWeek: [selectedPath.weeklyFocus, ...record.planBase.thisWeek],
    metric: record.planBase.metric,
    guardrail: record.planBase.guardrail,
    reviewTrigger: selectedPath.reviewTrigger
  }
}

export default function HomePage() {
  const initialRecords = useMemo(() => buildSeedRecords(), [])
  const [records, setRecords] = useState(initialRecords)
  const [selectedRecordId, setSelectedRecordId] = useState(initialRecords[0]?.id ?? "")
  const [draft, setDraft] = useState(initialRecords[0]?.thought.body ?? scenarios[0].prompt)
  const [mode, setMode] = useState<Mode>(initialRecords[0]?.mode ?? "deep")
  const [activeChip, setActiveChip] = useState<string>(initialRecords[0]?.templateId ?? "")
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>(initialRecords[0]?.review.status ?? "not_started")
  const [reviewDraft, setReviewDraft] = useState(initialRecords[0]?.review.note ?? "")
  const [nextRunNumber, setNextRunNumber] = useState(104)
  const editorRef = useRef<HTMLTextAreaElement | null>(null)

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId) ?? records[0],
    [records, selectedRecordId]
  )

  const currentPlan = selectedRecord ? deriveActionPlan(selectedRecord) : null
  const isDirty = selectedRecord ? normalizeText(draft) !== normalizeText(selectedRecord.thought.body) : false
  const canAnalyze = draft.trim().length > 0

  useEffect(() => {
    if (!selectedRecord) {
      return
    }

    setDraft(selectedRecord.thought.body)
    setMode(selectedRecord.mode)
    setActiveChip(selectedRecord.templateId ?? "")
    setReviewStatus(selectedRecord.review.status)
    setReviewDraft(selectedRecord.review.note)
  }, [selectedRecordId])

  function focusEditor() {
    requestAnimationFrame(() => {
      editorRef.current?.focus()
      editorRef.current?.setSelectionRange(editorRef.current.value.length, editorRef.current.value.length)
    })
  }

  function handleAnalyze() {
    if (!canAnalyze) {
      return
    }

    const parentId =
      selectedRecord && normalizeText(draft) !== normalizeText(selectedRecord.thought.body) ? selectedRecord.id : null

    const record = buildRecordFromText(draft, mode, {
      id: `run-${nextRunNumber}`,
      createdAt: formatTimestamp(),
      parentId,
      preferredPathId: selectedRecord?.templateId === pickScenario(draft)?.id ? selectedRecord.selectedPathId : null
    })

    startTransition(() => {
      setRecords((current) => [record, ...current])
      setSelectedRecordId(record.id)
      setNextRunNumber((current) => current + 1)
    })
  }

  function handleSelectHistory(recordId: string) {
    setSelectedRecordId(recordId)
  }

  function handleExampleSelect(scenario: ScenarioTemplate) {
    setDraft(scenario.prompt)
    setActiveChip(scenario.id)
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
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/[0.34]">Objective Thinking Board / Workspace</div>
            <h1 className="mt-2 font-serif text-3xl tracking-tight text-white md:text-[2.45rem]">Objective Thinking Board</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-white/[0.6]">
            <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">Saved Analyses {records.length}</div>
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

              <div className="mt-4 space-y-3">
                {records.map((record) => {
                  const active = record.id === selectedRecord.id
                  const selectedPath = getSelectedPath(record)

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
                      </div>

                      {record.parentId ? (
                        <div className="mt-3 text-xs text-white/[0.38]">迭代自 {record.parentId}</div>
                      ) : null}
                    </button>
                  )
                })}
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

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={!canAnalyze}
                    className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black transition duration-200 hover:translate-y-[-1px] hover:bg-white/[0.92] disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50"
                  >
                    保存为新分析
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

                <div className="grid gap-2 text-xs text-white/[0.56] sm:grid-cols-4">
                  {[
                    ["Run", selectedRecord.id],
                    ["Created", selectedRecord.createdAt],
                    ["Lens", modeMeta[selectedRecord.mode].label],
                    ["Review", reviewMeta[selectedRecord.review.status].label]
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
                    <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/[0.58]">
                      {currentPlan.selectedPath.title}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                    <div className="rounded-[24px] border border-white/[0.16] bg-white/[0.06] p-4">
                      <div className="text-sm text-white/[0.42]">Today</div>
                      <div className="mt-3 space-y-3">
                        {currentPlan.today.map((item, index) => (
                          <div key={item} className="rounded-[20px] border border-white/10 bg-black/[0.18] px-4 py-4">
                            <div className="text-[11px] uppercase tracking-[0.16em] text-white/30">Step {index + 1}</div>
                            <div className="mt-2 text-sm leading-6 text-white/[0.74]">{item}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[24px] border border-white/10 bg-black/[0.18] p-4">
                        <div className="text-sm text-white/[0.42]">This Week</div>
                        <div className="mt-3 space-y-2">
                          {currentPlan.thisWeek.map((item) => (
                            <div key={item} className="rounded-[18px] border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white/70">
                              {item}
                            </div>
                          ))}
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
