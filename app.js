/**
 * Trace - 认知显影系统
 * 核心：结构化认知引擎 + 分层记忆 + 克制输出
 */

const DB_NAME = "TraceCognitionDB";
const STORE_NAME = "entries";
const DRAFT_KEY = "trace-draft-v1";
const LAST_ACTIVE_KEY = "trace-last-active";
const FONT_STYLE_KEY = "trace-font-style";
const BIO_KEY = "trace-bio-enrolled";
const SYSTEM_STATE_KEY = "trace_system_v1";

const SYSTEM_PROMPT_V1 = `
你不是助手，不是心理医生，也不是安慰者。
你是一个冷静、克制、长期观察用户的认知镜面。
你的任务不是复述用户写了什么，而是识别这段表达里最真实的内部张力。

你要优先判断：
1. 用户表面在说什么
2. 用户真正卡住的矛盾是什么
3. 用户是否在回避、合理化、压抑或拖延
4. 这条记录是否和过去的模式重复
5. 现在是否值得发出一句命中的回声

语言必须：
- 短
- 准
- 克制
- 无鸡汤
- 无说教
- 不装作绝对确定
- 证据不足时宁可保守
`.trim();

const elements = {
  globalTools: document.getElementById("global-tools"),
  importBtn: document.getElementById("import-data-btn"),
  importInput: document.getElementById("import-file-input"),
  exportBtn: document.getElementById("export-data-btn"),
  fontToggleBtn: document.getElementById("font-toggle-btn"),
  historyToggle: document.getElementById("history-toggle"),
  unlockView: document.getElementById("unlock-view"),
  unlockBtn: document.getElementById("unlock-btn"),
  unlockTitle: document.getElementById("unlock-title"),
  unlockSubtitle: document.getElementById("unlock-subtitle"),
  onboardingView: document.getElementById("onboarding-view"),
  enterWritingBtn: document.getElementById("enter-writing-btn"),
  composeView: document.getElementById("compose-view"),
  systemEchoPanel: document.getElementById("system-echo-panel"),
  echoCardLayer: document.getElementById("echo-card-layer"),
  echoCard: document.getElementById("echo-card"),
  echoCardClose: document.getElementById("echo-card-close"),
  echoCardLine1: document.getElementById("echo-card-line-1"),
  echoCardLine2: document.getElementById("echo-card-line-2"),
  echoCardLine3: document.getElementById("echo-card-line-3"),
  fontStyleLabel: document.getElementById("font-style-label"),
  rawMemoryInput: document.getElementById("raw-memory-input"),
  anchorBtns: document.querySelectorAll(".anchor-btn"),
  saveStatus: document.getElementById("save-status"),
  saveEntryBtn: document.getElementById("save-entry-btn"),
  swallowBtn: document.getElementById("swallow-btn"),
  historyPanel: document.getElementById("history-panel"),
  historyPatternLayer: document.getElementById("history-pattern-layer"),
  insightCanvas: document.getElementById("insight-canvas"),
  trendEnergy: document.getElementById("trend-energy"),
  trendFocus: document.getElementById("trend-focus"),
  historyList: document.getElementById("history-list"),
  historyEntryTemplate: document.getElementById("history-entry-template"),
  closeHistoryBtn: document.getElementById("close-history-btn"),
};

let state = {
  entries: [],
  draft: window.localStorage.getItem(DRAFT_KEY) || "",
  historyOpen: false,
  editingId: null,
  isLoaded: false,
  activeAnchor: null,
  fontStyle: window.localStorage.getItem(FONT_STYLE_KEY) || "system",
  bioEnrolled: window.localStorage.getItem(BIO_KEY) === "1",
  echoChain: {},
  pendingEcho: null,
  lastEchoText: null,
  echoCooldownUntil: 0,
};

let implicitSession = {
  startMs: null,
  backspaceCount: 0,
  hasTyped: false,
};

let echoCardTimer = null;

const health = {
  dbReady: false,
  lastError: "",
  checks: {
    booted: false,
    canSubmit: false,
    canRenderHistory: false,
  },
};

const Lexicon = {
  emotions: {
    焦虑: ["焦虑", "慌", "不安", "压力", "紧张", "害怕", "悬着"],
    疲惫: ["累", "疲惫", "耗", "没劲", "撑不住", "困", "麻木"],
    压抑: ["憋", "压着", "说不出", "闷", "忍着", "收着"],
    平静: ["平静", "还好", "慢慢", "安静", "稳住"],
    积极: ["开心", "轻松", "顺", "好起来", "有劲", "舒服"],
    低落: ["难过", "失落", "空", "糟糕", "委屈", "沮丧"],
  },
  topics: {
    工作: ["工作", "上班", "项目", "任务", "邮件", "开会", "汇报", "老板"],
    关系: ["关系", "他", "她", "我们", "家里", "父母", "朋友", "爱"],
    身体: ["身体", "睡觉", "失眠", "头疼", "胃", "运动", "健康"],
    金钱: ["钱", "工资", "房租", "消费", "存款", "成本"],
    未来: ["未来", "选择", "方向", "以后", "人生", "长期"],
    身份感: ["自己", "价值", "证明", "身份", "意义", "失败"],
  },
  defense: {
    回避: ["不想碰", "不想打开", "算了", "先不", "拖着", "躲", "逃开"],
    合理化: ["其实", "应该", "按理说", "我知道", "也不是", "没那么"],
    压抑: ["没事", "还好", "忍一忍", "不用说", "算正常"],
    漂移: ["不知道", "说不上", "随便", "空白", "散掉"],
  },
  tensionPairs: [
    {
      label: "认知和行动脱节",
      when: (text) => containsAny(text, ["知道", "明白", "清楚"]) && containsAny(text, ["不想", "拖", "不敢", "躲"]),
    },
    {
      label: "想开始，但被结果感压住",
      when: (text) => containsAny(text, ["开始", "重启", "打开", "动手"]) && containsAny(text, ["怕", "后果", "必须", "持续"]),
    },
    {
      label: "在维持表面平稳，但内部已经过载",
      when: (text) => containsAny(text, ["还好", "没事", "正常"]) && containsAny(text, ["累", "烦", "撑", "压"]),
    },
    {
      label: "想表达，但又在主动收回",
      when: (text) => containsAny(text, ["想说", "想写", "其实"]) && containsAny(text, ["算了", "删掉", "忍着"]),
    },
  ],
};

const RetentionSniper = {
  check() {
    const lastActive = window.localStorage.getItem(LAST_ACTIVE_KEY);
    if (!lastActive) return null;

    const hoursSince = (Date.now() - Number.parseInt(lastActive, 10)) / (1000 * 60 * 60);

    if (hoursSince > 96) {
      return "你有几天没来了，上次写下的那件事还在这里。";
    }

    if (hoursSince > 48 && state.entries.length > 0) {
      const latest = state.entries[0];
      const latestQuestion = latest.analysis?.response?.question;
      if (latestQuestion) {
        return `上次的问题还在：${latestQuestion}`;
      }
    }

    return null;
  },
  updateActivity() {
    window.localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  },
};

const db = {
  instance: null,
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 2);
      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = (event) => {
        this.instance = event.target.result;
        resolve();
      };
      request.onerror = (event) => reject(event);
    });
  },
  async getAll() {
    if (!this.instance) return [];
    const tx = this.instance.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve(request.result.sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp)));
      };
    });
  },
  async put(entry) {
    if (!this.instance) return;
    const tx = this.instance.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(entry);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  },
  async delete(id) {
    if (!this.instance) return;
    const tx = this.instance.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  },
};

function persistSystemState() {
  window.localStorage.setItem(
    SYSTEM_STATE_KEY,
    JSON.stringify({
      echoChain: state.echoChain,
      pendingEcho: state.pendingEcho,
      lastEchoText: state.lastEchoText,
      echoCooldownUntil: state.echoCooldownUntil,
    }),
  );
}

function loadSystemState() {
  const raw = window.localStorage.getItem(SYSTEM_STATE_KEY);
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    state.echoChain = data.echoChain || {};
    state.pendingEcho = data.pendingEcho || null;
    state.lastEchoText = data.lastEchoText || null;
    state.echoCooldownUntil = data.echoCooldownUntil || 0;
  } catch {
    state.echoChain = {};
    state.pendingEcho = null;
    state.lastEchoText = null;
    state.echoCooldownUntil = 0;
  }
}

let audioCtx = null;

function playTraceFeedback() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 880;
    osc.type = "sine";
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(310, now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.025, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
    osc.start(now);
    osc.stop(now + 0.4);
  } catch {
    // stay silent if audio is unavailable
  }
}

const AIEngine = {
  createPromptEnvelope(currentEntry, memoryContext) {
    return {
      system_prompt: SYSTEM_PROMPT_V1,
      current_entry: currentEntry.content,
      current_anchor: currentEntry.metadata?.anchor || "",
      recent_entries: memoryContext.shortWindow.map((entry) => entry.content || "[空白记录]"),
      active_patterns: memoryContext.activePatterns,
      open_loops: memoryContext.openLoops,
      signals: currentEntry.context,
    };
  },

  analyze(currentEntry, entries) {
    const memory = MemoryEngine.build(entries, currentEntry.id);
    const promptEnvelope = this.createPromptEnvelope(currentEntry, memory);
    const interpretation = this.interpret(currentEntry, memory);
    const response = this.composeResponse(interpretation, memory);

    return {
      promptEnvelope,
      memory,
      interpretation,
      response,
      analyzedAt: new Date().toISOString(),
    };
  },

  interpret(entry, memory) {
    const text = (entry.content || "").trim();
    const surfaceEmotion = inferSurfaceEmotion(text, entry);
    const topicEntities = inferTopics(text, entry);
    const defenseSignal = inferDefenseSignal(text, entry);
    const coreTension = inferCoreTension(text, entry, memory);
    const patternLink = inferPatternLink(topicEntities, surfaceEmotion, memory);
    const confidence = inferConfidence(entry, surfaceEmotion, coreTension, patternLink);
    const shouldEcho = confidence >= 0.36 || Boolean(patternLink) || Boolean(coreTension);

    return {
      surface_emotion: surfaceEmotion,
      core_tension: coreTension,
      defense_signal: defenseSignal,
      topic_entities: topicEntities,
      pattern_link: patternLink,
      confidence,
      should_echo: shouldEcho,
    };
  },

  composeResponse(interpretation, memory) {
    if (!interpretation.should_echo) {
      return {
        echo: "",
        question: "",
        pattern_hint: "",
      };
    }

    const echo = buildEcho(interpretation, memory);
    const question = buildQuestion(interpretation, memory);
    const patternHint = interpretation.pattern_link && interpretation.confidence >= 0.58
      ? interpretation.pattern_link
      : "";

    return {
      echo,
      question,
      pattern_hint: patternHint,
    };
  },
};

const MemoryEngine = {
  build(entries, currentId) {
    const currentIndex = entries.findIndex((entry) => entry.id === currentId);
    const entriesForMemory = currentIndex === -1 ? entries : entries.slice(currentIndex + 1);
    const shortWindow = entriesForMemory.slice(0, 6);
    const activePatterns = collectActivePatterns(shortWindow);
    const openLoops = collectOpenLoops(entriesForMemory);
    const longIdentityMemory = collectIdentityMemory(entriesForMemory);

    return {
      shortWindow,
      activePatterns,
      openLoops,
      longIdentityMemory,
    };
  },
};

async function bootSystem() {
  try {
    await db.init();
    health.dbReady = true;
    state.entries = normalizeEntries(await db.getAll());
    await reanalyzeEntriesIfNeeded();
    state.isLoaded = true;
    elements.rawMemoryInput.value = state.draft;
    applyFontStyle(state.fontStyle);

    if (!state.entries.length) {
      showView("onboarding");
    } else {
      showView("compose");
      const sniperEcho = RetentionSniper.check();
      if (sniperEcho) {
        renderEchoBlock({ echo: sniperEcho, question: "", pattern_hint: "" });
      } else {
        triggerSystemEcho();
      }
    }

    RetentionSniper.updateActivity();
    runHealthChecks();
  } catch (error) {
    health.lastError = error instanceof Error ? error.message : String(error);
    if (elements.unlockBtn) {
      elements.unlockBtn.textContent = "打开失败";
    }
  }
}

function getBioCopy() {
  if (state.bioEnrolled) {
    return {
      idle: "使用面容继续",
      active: "识别中",
      success: "已解锁",
      failed: "解锁失败",
    };
  }

  return {
    idle: "启用面容保护",
    active: "设置中",
    success: "已启用",
    failed: "设置失败",
  };
}

function syncUnlockLabel(status = "idle") {
  if (!elements.unlockBtn) return;
  const copy = getBioCopy();
  const current = copy[status] || copy.idle;
  if (elements.unlockTitle) {
    elements.unlockTitle.textContent = "解锁";
  }
  if (elements.unlockSubtitle) {
    elements.unlockSubtitle.textContent = current;
  }
  elements.unlockBtn.textContent = state.bioEnrolled ? "继续" : "启用";
}

async function handleUnlock() {
  syncUnlockLabel("active");

  try {
    if (!state.bioEnrolled) {
      state.bioEnrolled = true;
      window.localStorage.setItem(BIO_KEY, "1");
    }

    syncUnlockLabel("success");
    window.setTimeout(() => {
      bootSystem();
    }, 280);
  } catch {
    syncUnlockLabel("failed");
  }
}

function init() {
  syncUnlockLabel("idle");
  bindEvents();
}

function bindEvents() {
  if (elements.unlockBtn) {
    elements.unlockBtn.addEventListener("click", handleUnlock);
  }

  if (elements.enterWritingBtn) {
    elements.enterWritingBtn.addEventListener("click", () => {
      showView("compose");
      elements.rawMemoryInput.focus();
    });
  }

  elements.rawMemoryInput.addEventListener("focus", () => {
    if (!implicitSession.startMs) implicitSession.startMs = Date.now();
    document.body.classList.add("focus-mode");
  });

  elements.rawMemoryInput.addEventListener("blur", () => {
    document.body.classList.remove("focus-mode");
  });

  elements.rawMemoryInput.addEventListener("keydown", (event) => {
    implicitSession.hasTyped = true;
    if (event.key === "Backspace" || event.key === "Delete") implicitSession.backspaceCount += 1;
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      submitEntry();
    }
  });

  elements.rawMemoryInput.addEventListener("input", (event) => {
    state.draft = event.target.value;
    window.localStorage.setItem(DRAFT_KEY, state.draft);
  });

  elements.anchorBtns.forEach((button) => {
    button.addEventListener("click", () => {
      const anchor = button.dataset.anchor;
      if (state.activeAnchor === anchor) {
        state.activeAnchor = null;
        button.classList.remove("active");
        return;
      }

      state.activeAnchor = anchor;
      elements.anchorBtns.forEach((item) => item.classList.toggle("active", item.dataset.anchor === anchor));
    });
  });

  elements.saveEntryBtn.addEventListener("click", submitEntry);
  if (elements.swallowBtn) elements.swallowBtn.addEventListener("click", submitEntry);
  if (elements.historyToggle) {
    elements.historyToggle.addEventListener("click", () => {
      state.historyOpen = true;
      elements.historyPanel.classList.remove("hidden");
      renderHistory();
    });
  }

  if (elements.closeHistoryBtn) {
    elements.closeHistoryBtn.addEventListener("click", () => {
      closeHistory();
    });
  }

  if (elements.echoCardClose) {
    elements.echoCardClose.addEventListener("click", () => hideEchoCard());
  }

  if (elements.exportBtn) {
    elements.exportBtn.addEventListener("click", exportEntries);
  }

  if (elements.fontToggleBtn) {
    elements.fontToggleBtn.addEventListener("click", cycleFontStyle);
  }

  if (elements.importBtn && elements.importInput) {
    elements.importBtn.addEventListener("click", () => elements.importInput.click());
    elements.importInput.addEventListener("change", importEntries);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.historyOpen) {
      closeHistory();
    }
  });

  document.addEventListener("click", (event) => {
    if (!state.historyOpen) return;
    if (elements.historyPanel.contains(event.target) || elements.historyToggle.contains(event.target)) return;
    closeHistory();
  });
}

async function submitEntry() {
  const content = elements.rawMemoryInput.value.trim();
  if (!content && !state.activeAnchor) return;

  const now = new Date();
  const durationSec = implicitSession.startMs
    ? Math.round((Date.now() - implicitSession.startMs) / 1000)
    : 0;
  const friction = implicitSession.backspaceCount;
  const timePhase = resolveTimePhase(now);

  const entry = {
    id: state.editingId || `mem-${now.getTime()}`,
    content,
    timestamp: now.toISOString(),
    context: {
      durationSec,
      friction,
      timePhase,
    },
    tags: {
      emotion: null,
      keywords: [],
    },
    system: {
      weight: 0,
      echo: null,
      echoLevel: null,
      echoType: null,
    },
    metadata: state.activeAnchor ? { anchor: state.activeAnchor } : null,
  };

  elements.rawMemoryInput.blur();
  elements.rawMemoryInput.classList.add("ink-dissolve");
  document.body.classList.remove("focus-mode");
  elements.saveStatus.textContent = "封存中…";
  playTraceFeedback();

  await db.put(entry);
  upsertStateEntry(entry);
  RetentionSniper.updateActivity();

  window.setTimeout(() => {
    elements.saveStatus.textContent = "已封存";
  }, 280);

  window.setTimeout(async () => {
    elements.rawMemoryInput.value = "";
    elements.rawMemoryInput.classList.remove("ink-dissolve");
    state.draft = "";
    state.editingId = null;
    state.activeAnchor = null;
    window.localStorage.removeItem(DRAFT_KEY);
    elements.anchorBtns.forEach((button) => button.classList.remove("active"));
    elements.saveStatus.textContent = "已封存";

    await silentAnalyze(entry);
    triggerSystemEcho();

    if (entry.system?.echo) {
      window.setTimeout(() => {
        showEchoCard(entry.system.echo);
      }, 360);
    } else {
      hideEchoCard(true);
    }

    window.setTimeout(() => {
      elements.saveStatus.textContent = "";
    }, 2000);

    implicitSession = { startMs: null, backspaceCount: 0, hasTyped: false };
  }, 800);

  runHealthChecks();
}

function upsertStateEntry(entry) {
  const existingIndex = state.entries.findIndex((item) => item.id === entry.id);
  if (existingIndex === -1) {
    state.entries.unshift(entry);
    return;
  }
  state.entries[existingIndex] = entry;
  state.entries.sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
}

function resetComposeState() {
  elements.rawMemoryInput.value = "";
  elements.rawMemoryInput.classList.remove("ink-dissolve");
  state.draft = "";
  state.editingId = null;
  state.activeAnchor = null;
  implicitSession = { startMs: null, backspaceCount: 0, hasTyped: false };
  window.localStorage.removeItem(DRAFT_KEY);
  elements.anchorBtns.forEach((button) => button.classList.remove("active"));
}

function triggerSystemEcho() {
  if (!state.entries.length) {
    renderEchoBlock({ echo: "", question: "", pattern_hint: "" });
    return;
  }

  const latest = state.entries[0];
  const response = latest.analysis?.response || {
    echo: latest.analysis?.interpretation?.core_tension || "",
    question: "",
    pattern_hint: "",
  };
  renderEchoBlock(response);
}

function closeHistory() {
  state.historyOpen = false;
  elements.historyPanel.classList.add("hidden");
  elements.rawMemoryInput.focus();
}

function renderEchoBlock(response) {
  const panel = elements.systemEchoPanel;
  panel.innerHTML = "";

  const pieces = [response?.echo, response?.question, response?.pattern_hint].filter(Boolean);
  if (!pieces.length) {
    panel.classList.add("empty");
    return;
  }

  panel.classList.remove("empty");
  pieces.forEach((text, index) => {
    const line = document.createElement("p");
    line.className = "echo-text";
    line.textContent = text;
    if (index > 0) line.style.marginTop = "8px";
    panel.appendChild(line);
  });
}

async function silentAnalyze(entry) {
  entry.tags = {
    emotion: detectEmotion(entry.content || "", entry),
    keywords: extractKeywords(entry.content || ""),
  };
  entry.system.weight = calculateWeight(entry, state.entries);
  entry.analysis = AIEngine.analyze(entry, [entry, ...state.entries.filter((item) => item.id !== entry.id)]);

  const echoResult = scheduleEcho(entry, state.entries);

  if (echoResult?.immediate) {
    entry.system.echo = echoResult.text;
    entry.system.echoLevel = echoResult.level;
    entry.system.echoType = echoResult.type || null;
  } else if (echoResult?.delayed) {
    state.pendingEcho = {
      text: echoResult.text,
      createdAt: Date.now(),
      level: echoResult.level,
      sourceEntryId: entry.id,
    };
    persistSystemState();
  }

  await db.put(entry);
  upsertStateEntry(entry);
}

function calculateWeight(entry, recentEntries) {
  let weight = 0;

  const friction = entry.context?.friction || 0;
  const timePhase = entry.context?.timePhase;

  if (friction >= 8) weight += 2;
  if (friction >= 15) weight += 3;
  if (timePhase === "深夜") weight += 2;

  const keywords = extractKeywords(entry.content || "");
  const recentKeywords = recentEntries.flatMap((item) => item.tags?.keywords || []);

  keywords.forEach((keyword) => {
    if (recentKeywords.filter((recentKeyword) => recentKeyword === keyword).length >= 2) {
      weight += 2;
    }
  });

  return weight;
}

function scheduleEcho(entry, allEntries) {
  if (Date.now() < state.echoCooldownUntil) return null;

  const recent = allEntries.slice(0, 12);
  const patterns = detectPatterns(recent, entry);

  if (!patterns.length) return null;

  const top = patterns[0];
  const key = top.type;

  if (!state.echoChain[key]) {
    state.echoChain[key] = { count: 0, lastTimestamp: 0 };
  }

  const chain = state.echoChain[key];
  chain.count += 1;
  chain.lastTimestamp = Date.now();

  const level = Math.min(chain.count, 3);
  const text = buildEcho(top, level);
  const textHash = JSON.stringify(text);

  if (state.lastEchoText === textHash) return null;
  state.lastEchoText = textHash;
  state.echoCooldownUntil = Date.now() + (level >= 3 ? 6 * 60 * 60 * 1000 : 30 * 60 * 1000);
  persistSystemState();

  if (level >= 3 || entry.system.weight >= 6) {
    return {
      delayed: true,
      text,
      level,
    };
  }

  return {
    immediate: true,
    text,
    level,
    type: top.type || null,
  };
}

function buildEcho(pattern, level) {
  const { type } = pattern;

  if (type === "repeat") {
    if (level === 1) {
      return {
        l1: "某个内容再次出现。",
        l2: "",
        l3: "",
        level,
      };
    }
    if (level === 2) {
      return {
        l1: "某个内容再次出现。",
        l2: "它在不同时间重复出现。",
        l3: "",
        level,
      };
    }
    return {
      l1: "某个内容再次出现。",
      l2: "它在不同时间重复出现。",
      l3: "但没有继续展开。",
      level,
    };
  }

  if (type === "time") {
    return {
      l1: "一些内容总是在相似的时段出现。",
      l2: "",
      l3: "",
      level,
    };
  }

  if (type === "friction") {
    if (level === 1) {
      return {
        l1: "这段记录有一些停顿。",
        l2: "",
        l3: "",
        level,
      };
    }
    if (level === 2) {
      return {
        l1: "这段记录存在停顿。",
        l2: "你在反复修改。",
        l3: "",
        level,
      };
    }
    return {
      l1: "这段记录存在停顿。",
      l2: "你在反复修改。",
      l3: "某个点没有被写出来。",
      level,
    };
  }

  if (type === "open_loop") {
    return {
      l1: "有一个内容持续被提到。",
      l2: "它一直没有变化。",
      l3: "也没有继续往下发展。",
      level,
    };
  }

  return {
    l1: pattern.text?.l1 || "",
    l2: pattern.text?.l2 || "",
    l3: pattern.text?.l3 || "",
    level,
  };
}

function detectPatterns(recentEntries, currentEntry) {
  const patterns = [];
  const keywords = recentEntries.flatMap((entry) => entry.tags?.keywords || []);
  const frictions = recentEntries.map((entry) => entry.context?.friction || 0);
  const timePhases = recentEntries.map((entry) => entry.context?.timePhase);
  const contents = recentEntries.map((entry) => entry.content || "");

  const keywordFrequency = {};
  keywords.forEach((keyword) => {
    keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1;
  });
  const topKeyword = Object.entries(keywordFrequency).sort((left, right) => right[1] - left[1])[0];

  if (topKeyword && topKeyword[1] >= 3) {
    patterns.push({
      type: "repeat",
      level: 1,
      key: topKeyword[0],
    });
  }

  const timeFrequency = {};
  timePhases.forEach((timePhase) => {
    if (timePhase) timeFrequency[timePhase] = (timeFrequency[timePhase] || 0) + 1;
  });
  const topTime = Object.entries(timeFrequency).sort((left, right) => right[1] - left[1])[0];

  if (topTime && topTime[1] >= 3) {
    patterns.push({
      type: "time",
      level: 2,
      key: topTime[0],
    });
  }

  const avgFriction = frictions.length ? frictions.reduce((sum, value) => sum + value, 0) / frictions.length : 0;
  if (avgFriction >= 8) {
    patterns.push({
      type: "friction",
      level: 2,
    });
  }

  const openLoopHits = contents.filter((text) => ["想", "应该", "但是"].some((anchor) => text.includes(anchor))).length;
  if (openLoopHits >= 3) {
    patterns.push({
      type: "open_loop",
      level: 3,
    });
  }

  return patterns.sort((left, right) => right.level - left.level);
}

function showEchoCard(payload) {
  if (!payload) return;

  elements.echoCardLine1.textContent = payload.l1 || "";
  elements.echoCardLine2.textContent = payload.l2 || "";
  elements.echoCardLine3.textContent = payload.l3 || "";
  if ((payload.level || 0) >= 3) {
    elements.echoCard.style.borderColor = "rgba(255,255,255,0.12)";
  } else {
    elements.echoCard.style.borderColor = "";
  }

  elements.echoCard.classList.remove("hidden", "fade-out", "show");
  void elements.echoCard.offsetWidth;
  elements.echoCard.classList.add("show");

  if (echoCardTimer) window.clearTimeout(echoCardTimer);
  echoCardTimer = window.setTimeout(() => {
    hideEchoCard();
  }, 4800);
}

function hideEchoCard(immediate = false) {
  if (echoCardTimer) {
    window.clearTimeout(echoCardTimer);
    echoCardTimer = null;
  }

  if (immediate) {
    elements.echoCard.classList.add("hidden");
    elements.echoCard.classList.remove("fade-out", "show");
    return;
  }

  if (elements.echoCard.classList.contains("hidden")) return;
  elements.echoCard.classList.remove("show");
  elements.echoCard.classList.add("fade-out");
  window.setTimeout(() => {
    elements.echoCard.classList.add("hidden");
    elements.echoCard.classList.remove("fade-out");
  }, 420);
}

function checkPendingEchoOnBoot() {
  if (!state.pendingEcho) return;

  const delay = 1000 * 60 * 60 * 4;
  if (Date.now() - state.pendingEcho.createdAt < delay) return;

  showEchoCard(state.pendingEcho.text);
  state.pendingEcho = null;
  persistSystemState();
}

function cleanupEchoChain() {
  const now = Date.now();

  Object.keys(state.echoChain).forEach((key) => {
    if (now - (state.echoChain[key]?.lastTimestamp || 0) > 72 * 60 * 60 * 1000) {
      delete state.echoChain[key];
    }
  });

  persistSystemState();
}

function cycleFontStyle() {
  const order = ["system", "writing", "serif"];
  const currentIndex = order.indexOf(state.fontStyle);
  const nextStyle = order[(currentIndex + 1) % order.length];
  applyFontStyle(nextStyle);
}

function applyFontStyle(style) {
  state.fontStyle = style;
  document.body.dataset.fontStyle = style;
  window.localStorage.setItem(FONT_STYLE_KEY, style);

  const labels = {
    system: "默认",
    writing: "柔和",
    serif: "衬线",
  };

  if (elements.fontStyleLabel) {
    elements.fontStyleLabel.textContent = labels[style] || labels.system;
  }
}

function renderHistory() {
  elements.historyList.innerHTML = "";
  if (elements.historyPatternLayer) {
    const hasInsight = state.entries.length > 0;
    elements.historyPatternLayer.classList.toggle("empty", !hasInsight);
    if (hasInsight) {
      renderInsightViewV2();
    }
  }

  if (!state.entries.length) {
    elements.historyList.innerHTML =
      '<p style="text-align:center;margin-top:40px;opacity:.5;">还没有记录</p>';
    return;
  }

  let currentDateLabel = "";

  state.entries.forEach((entry) => {
    const date = new Date(entry.timestamp);
    const dateLabel = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;

    if (dateLabel !== currentDateLabel) {
      const divider = document.createElement("div");
      divider.className = "history-date-divider";
      divider.textContent = dateLabel;
      elements.historyList.appendChild(divider);
      currentDateLabel = dateLabel;
    }

    const node = elements.historyEntryTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".history-time").textContent = `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes(),
    ).padStart(2, "0")}`;

    const metadataNode = node.querySelector(".history-metadata");
    if (metadataNode && entry.metadata?.anchor) {
      metadataNode.textContent = `[ ${entry.metadata.anchor} ]`;
      metadataNode.classList.remove("hidden");
    }

    const frictionNode = node.querySelector(".history-friction");
    if (frictionNode && entry.context?.friction >= 8) {
      frictionNode.textContent = `• 摩擦:${entry.context.friction}`;
      frictionNode.classList.remove("hidden");
    }

    const deleteBtn = node.querySelector(".history-delete-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async (event) => {
        event.stopPropagation();
        await deleteEntry(entry.id);
      });
    }

    const textNode = node.querySelector(".history-raw-text");
    const echoNode = node.querySelector(".history-echo-text");
    const secondaryNode = node.querySelector(".history-secondary");
    textNode.textContent = summarizeHistoryContent(entry.content || "[空白记录]");
    const echoSummary = entry.system?.echo?.l1
      ? `${entry.system.echo.l1} ${entry.system.echo.l2 || ""}`.trim()
      : summarizeHistoryEcho(
          [
            entry.analysis?.response?.echo,
            entry.analysis?.response?.question,
            entry.analysis?.response?.pattern_hint,
          ].filter(Boolean),
        );
    if (echoNode && secondaryNode && echoSummary) {
      echoNode.textContent = echoSummary;
      secondaryNode.classList.remove("hidden");
    }

    node.style.cursor = "pointer";
    node.addEventListener("click", () => loadEntryForEdit(entry.id));
    elements.historyList.appendChild(node);
  });
}

function buildGraph(entries) {
  const nodes = {};
  const edges = {};
  const recent = entries.slice(0, 30);

  recent.forEach((entry) => {
    const keys = [...(entry.tags?.keywords || [])];
    const emotionAnchor = entry.metadata?.anchor;

    if (emotionAnchor) keys.push(emotionAnchor);

    keys.forEach((key) => {
      if (!nodes[key]) {
        nodes[key] = { id: key, weight: 0, x: 0, y: 0 };
      }
      nodes[key].weight += 1;
    });

    for (let index = 0; index < keys.length; index += 1) {
      for (let inner = index + 1; inner < keys.length; inner += 1) {
        const left = keys[index];
        const right = keys[inner];
        const edgeKey = left < right ? `${left}-${right}` : `${right}-${left}`;
        edges[edgeKey] = (edges[edgeKey] || 0) + 1;
      }
    }
  });

  return { nodes, edges };
}

function layoutGraph(graph, canvas) {
  const nodeList = Object.values(graph.nodes);
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) * 0.35;

  nodeList.forEach((node, index) => {
    const angle = (index / Math.max(nodeList.length, 1)) * Math.PI * 2;
    const hash = hashCode(node.id);
    const r = radius * (0.6 + (hash % 40) / 100);

    node.x = centerX + Math.cos(angle) * r;
    node.y = centerY + Math.sin(angle) * r;
  });
}

function hashCode(str) {
  let hash = 0;
  for (let index = 0; index < str.length; index += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function renderGraph() {
  const canvas = elements.insightCanvas;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = canvas.offsetWidth;
  canvas.height = 320;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const graph = buildGraph(state.entries);
  layoutGraph(graph, canvas);

  Object.entries(graph.edges).forEach(([edgeKey, weight]) => {
    const [sourceId, targetId] = edgeKey.split("-");
    const source = graph.nodes[sourceId];
    const target = graph.nodes[targetId];
    if (!source || !target) return;

    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
    ctx.strokeStyle = `rgba(200,200,200,${Math.min(weight * 0.1, 0.3)})`;
    ctx.lineWidth = Math.min(weight, 3);
    ctx.stroke();
  });

  Object.values(graph.nodes).forEach((node) => {
    const size = Math.min(node.weight * 2, 18);
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(220,220,220,0.8)";
    ctx.fill();

    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--text-primary").trim() || "#fff";
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText(node.id, node.x + size + 2, node.y);
  });

  highlightCurrentNode(graph, state.entries[0]);
}

function highlightCurrentNode(graph, latestEntry) {
  if (!latestEntry || !elements.insightCanvas) return;

  const ctx = elements.insightCanvas.getContext("2d");
  if (!ctx) return;

  const keys = [...(latestEntry.tags?.keywords || [])];
  const emotionAnchor = latestEntry.metadata?.anchor;
  if (emotionAnchor) keys.push(emotionAnchor);

  keys.forEach((key) => {
    const node = graph.nodes[key];
    if (!node) return;

    ctx.beginPath();
    ctx.arc(node.x, node.y, 22, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.stroke();
  });
}

function calculateEnergyScore(entries) {
  const recent = entries.slice(0, 12);
  let score = 0;

  recent.forEach((entry) => {
    const anchor = entry.metadata?.anchor;
    if (anchor === "澄明") score += 2;
    if (anchor === "游离") score -= 0.5;
    if (anchor === "焦滞") score -= 1.5;
    if (anchor === "沉缩") score -= 2;
  });

  return score;
}

function getTrendDirection(entries) {
  const recent = entries.slice(0, 6);
  const older = entries.slice(6, 12);

  const recentScore = calculateEnergyScore(recent);
  const olderScore = calculateEnergyScore(older);
  const diff = recentScore - olderScore;

  if (diff > 2) return "↗";
  if (diff < -2) return "↘";
  return "→";
}

function calculateFocusTrend(entries) {
  const recent = entries.slice(0, 10);
  if (!recent.length) return "稳定";

  const avgFriction = recent.reduce((sum, entry) => sum + (entry.context?.friction || 0), 0) / recent.length;
  if (avgFriction < 4) return "稳定";
  if (avgFriction < 8) return "波动";
  return "下降";
}

function renderTrends() {
  if (!elements.trendEnergy || !elements.trendFocus) return;

  const score = calculateEnergyScore(state.entries);
  const direction = getTrendDirection(state.entries);
  const focus = calculateFocusTrend(state.entries);

  elements.trendEnergy.innerHTML = `
    <div class="trend-label">能量</div>
    <div class="trend-main">${direction}</div>
    <div class="trend-sub">${score.toFixed(1)}</div>
  `;

  elements.trendFocus.innerHTML = `
    <div class="trend-label">专注</div>
    <div class="trend-main">${focus}</div>
  `;
}

function renderInsightViewV2() {
  renderGraph();
  renderTrends();
}

function loadEntryForEdit(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;

  elements.rawMemoryInput.value = entry.content || "";
  state.draft = entry.content || "";
  state.editingId = id;
  state.activeAnchor = entry.metadata?.anchor || null;

  elements.anchorBtns.forEach((button) => {
    button.classList.toggle("active", button.dataset.anchor === state.activeAnchor);
  });

  elements.historyPanel.classList.add("hidden");
  state.historyOpen = false;
  elements.rawMemoryInput.focus();
  renderEchoBlock(entry.analysis?.response || { echo: "", question: "", pattern_hint: "" });
}

async function deleteEntry(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;

  const confirmed = window.confirm("删除这条记录？\n它会从这台设备里移除，之后不能恢复。");
  if (!confirmed) return;

  await db.delete(id);
  state.entries = state.entries.filter((item) => item.id !== id);

  if (state.editingId === id) {
    resetComposeState();
    hideEchoCard(true);
    renderEchoBlock({ echo: "", question: "", pattern_hint: "" });
  }

  if (state.historyOpen) {
    renderHistory();
  }

  runHealthChecks();
}

function showView(viewName) {
  if (elements.unlockView) elements.unlockView.classList.toggle("hidden", viewName !== "unlock");
  elements.onboardingView.classList.toggle("hidden", viewName !== "onboarding");
  elements.composeView.classList.toggle("hidden", viewName !== "compose");
  elements.globalTools.classList.toggle("hidden", viewName === "onboarding" || viewName === "unlock");
}

function exportEntries() {
  const payload = JSON.stringify(state.entries, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `trace-export-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function importEntries(event) {
  const [file] = event.target.files || [];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return;

    const importedEntries = normalizeEntries(parsed);
    const merged = new Map(state.entries.map((entry) => [entry.id, entry]));
    importedEntries.forEach((entry) => {
      merged.set(entry.id, entry);
    });

    for (const entry of merged.values()) {
      await db.put(entry);
    }

    state.entries = normalizeEntries(await db.getAll());
    await reanalyzeEntriesIfNeeded();
    triggerSystemEcho();
    runHealthChecks();
  } catch {
    // Keep silent to avoid adding UI noise.
  } finally {
    event.target.value = "";
  }
}

function buildTopologySummary(entries) {
  if (entries.length < 3) return "";

  const recent = entries.slice(0, 8);
  const topics = recent.flatMap((entry) => entry.analysis?.interpretation?.topic_entities || []);
  const emotions = recent.map((entry) => entry.analysis?.interpretation?.surface_emotion).filter(Boolean);
  const defenses = recent.map((entry) => entry.analysis?.interpretation?.defense_signal).filter(Boolean);

  const lines = [];
  const topTopic = findMostFrequent(topics);
  const topEmotion = findMostFrequent(emotions);
  const topDefense = findMostFrequent(defenses);

  if (topTopic) lines.push(`你最近常写到「${topTopic}」。`);
  if (topEmotion && topEmotion !== "平静") lines.push(`最近的情绪更接近「${topEmotion}」。`);
  if (topDefense && topDefense !== "直接表达") lines.push(`你最近常常会先「${topDefense}」。`);

  const openLoop = collectOpenLoops(entries)[0];
  if (openLoop) lines.push(openLoop);

  const repeatedQuestion = findMostFrequent(
    recent.map((entry) => entry.analysis?.response?.question).filter(Boolean),
  );
  if (repeatedQuestion) lines.push(`最近反复出现的问题是：${repeatedQuestion}`);

  return lines.join("\n");
}

function collectActivePatterns(entries) {
  const topics = entries.flatMap((entry) => inferTopics(entry.content || "", entry));
  const emotions = entries.map((entry) => inferSurfaceEmotion(entry.content || "", entry));
  const patterns = [];

  const topTopic = findMostFrequent(topics);
  if (topTopic && topics.filter((topic) => topic === topTopic).length >= 2) {
    patterns.push(`最近几次都回到了「${topTopic}」。`);
  }

  const topEmotion = findMostFrequent(emotions);
  if (topEmotion && topEmotion !== "平静" && emotions.filter((emotion) => emotion === topEmotion).length >= 2) {
    patterns.push(`「${topEmotion}」这种感觉最近反复出现。`);
  }

  return patterns;
}

function collectOpenLoops(entries) {
  const loops = [];
  const recentTexts = entries.slice(0, 6).map((entry) => entry.content || "");

  if (recentTexts.filter((text) => containsAny(text, ["开始", "准备", "打开", "重启"])).length >= 3) {
    loops.push("你最近几次都停在“开始之前”。");
  }

  if (entries.slice(0, 6).filter((entry) => entry.context?.friction >= 8).length >= 3) {
    loops.push("你最近几次写得都很费力，像是有件事还没说开。");
  }

  return loops;
}

function collectIdentityMemory(entries) {
  const identity = [];
  const allTopics = entries.flatMap((entry) => inferTopics(entry.content || "", entry));
  const topTopic = findMostFrequent(allTopics);
  if (topTopic) identity.push(`你常常会回到「${topTopic}」这件事。`);

  const frequentDefense = findMostFrequent(
    entries.map((entry) => inferDefenseSignal(entry.content || "", entry)).filter(Boolean),
  );
  if (frequentDefense && frequentDefense !== "直接表达") {
    identity.push(`你习惯先用「${frequentDefense}」来保护自己。`);
  }

  return identity;
}

function normalizeEntries(entries) {
  return entries
    .filter(Boolean)
    .map((entry) => ({
      id: entry.id || `mem-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      content: typeof entry.content === "string" ? entry.content : "",
      timestamp: entry.timestamp || new Date().toISOString(),
      context: {
        durationSec: Number.isFinite(entry.context?.durationSec) ? entry.context.durationSec : 0,
        friction: Number.isFinite(entry.context?.friction) ? entry.context.friction : 0,
        timePhase: entry.context?.timePhase || resolveTimePhase(new Date(entry.timestamp || Date.now())),
      },
      tags: {
        emotion: entry.tags?.emotion || null,
        keywords: Array.isArray(entry.tags?.keywords) ? entry.tags.keywords : [],
      },
      system: {
        weight: Number.isFinite(entry.system?.weight) ? entry.system.weight : 0,
        echo: entry.system?.echo || null,
        echoLevel: entry.system?.echoLevel || null,
        echoType: entry.system?.echoType || null,
      },
      metadata: entry.metadata || null,
      analysis: entry.analysis || null,
    }))
    .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
}

async function reanalyzeEntriesIfNeeded() {
  let changed = false;
  const rebuilt = [];

  for (let index = 0; index < state.entries.length; index += 1) {
    const entry = state.entries[index];
    const previousEntries = [...rebuilt, ...state.entries.slice(index + 1)];
    if (
      !entry.analysis?.response?.echo &&
      !entry.analysis?.response?.question &&
      !entry.tags?.emotion
    ) {
      entry.tags = {
        emotion: detectEmotion(entry.content || "", entry),
        keywords: extractKeywords(entry.content || "", entry),
      };
      entry.analysis = AIEngine.analyze(entry, [entry, ...previousEntries.filter((item) => item.id !== entry.id)]);
      await db.put(entry);
      changed = true;
    }
    rebuilt.push(entry);
  }

  if (changed) {
    state.entries = normalizeEntries(await db.getAll());
  }
}

function inferSurfaceEmotion(text, entry) {
  const scoreMap = {};

  Object.entries(Lexicon.emotions).forEach(([emotion, triggers]) => {
    scoreMap[emotion] = triggers.reduce((score, trigger) => score + (text.includes(trigger) ? 1 : 0), 0);
  });

  if (entry.context?.friction >= 8) scoreMap.焦虑 = (scoreMap.焦虑 || 0) + 1;
  if (entry.context?.durationSec >= 120) scoreMap.压抑 = (scoreMap.压抑 || 0) + 1;
  if ((text || "").length === 0 && entry.metadata?.anchor) scoreMap.压抑 = (scoreMap.压抑 || 0) + 1;

  const topEmotion = Object.keys(scoreMap).sort((left, right) => scoreMap[right] - scoreMap[left])[0];
  return scoreMap[topEmotion] > 0 ? topEmotion : "平静";
}

function inferTopics(text, entry) {
  const topics = Object.entries(Lexicon.topics)
    .filter(([, triggers]) => triggers.some((trigger) => text.includes(trigger)))
    .map(([topic]) => topic);

  if (entry.metadata?.anchor && !topics.length) {
    topics.push("身份感");
  }

  return topics.slice(0, 3);
}

function detectEmotion(text, entry) {
  return inferSurfaceEmotion(text, entry);
}

function extractKeywords(text) {
  const anchors = ["累", "不想", "想", "换", "烦", "焦虑", "逃", "困"];
  return anchors.filter((anchor) => text.includes(anchor));
}

function inferDefenseSignal(text, entry) {
  if (entry.context?.friction >= 10 && !text) return "强防御";

  for (const [signal, triggers] of Object.entries(Lexicon.defense)) {
    if (triggers.some((trigger) => text.includes(trigger))) return signal;
  }

  if (entry.context?.friction >= 8) return "斟酌";
  return "直接表达";
}

function inferCoreTension(text, entry, memory) {
  const matchedPair = Lexicon.tensionPairs.find((pair) => pair.when(text));
  if (matchedPair) return matchedPair.label;

  if (entry.context?.friction >= 10 && entry.context?.durationSec >= 120) {
    return "你不是没话说，你是在犹豫要不要说透。";
  }

  if (memory.openLoops.length > 0 && containsAny(text, ["开始", "明天", "这次", "还是"])) {
    return "你又回到了那个还没真正开始的地方。";
  }

  if (entry.metadata?.anchor === "焦滞") {
    return "你感觉到卡住了，但还没决定往哪走。";
  }

  if (entry.metadata?.anchor === "游离") {
    return "你的注意力在飘，但问题还在。";
  }

  if (entry.metadata?.anchor === "澄明") {
    return "你已经看见一点答案了，只是还没开始动。";
  }

  if (entry.metadata?.anchor === "沉缩") {
    return "你在往里收，但那件事并没有过去。";
  }

  return "";
}

function inferPatternLink(topics, surfaceEmotion, memory) {
  const topicMatch = topics.find((topic) =>
    memory.activePatterns.some((pattern) => pattern.includes(`「${topic}」`)),
  );
  if (topicMatch) {
    return `你不是第一次写到「${topicMatch}」了。`;
  }

  if (surfaceEmotion !== "平静" && memory.activePatterns.some((pattern) => pattern.includes(`「${surfaceEmotion}」`))) {
    return `这种「${surfaceEmotion}」的感觉，最近已经连续出现。`;
  }

  const openLoop = memory.openLoops[0];
  return openLoop || "";
}

function inferConfidence(entry, surfaceEmotion, coreTension, patternLink) {
  let score = 0.18;
  if (surfaceEmotion && surfaceEmotion !== "平静") score += 0.16;
  if (coreTension) score += 0.24;
  if (patternLink) score += 0.2;
  if (entry.context?.friction >= 8) score += 0.12;
  if (entry.context?.durationSec >= 120) score += 0.1;
  return Math.min(score, 0.92);
}

function buildEcho(interpretation, memory) {
  if (interpretation.core_tension) {
    return interpretation.core_tension.endsWith("。")
      ? interpretation.core_tension
      : `${interpretation.core_tension}。`;
  }

  if (interpretation.pattern_link) {
    return interpretation.pattern_link;
  }

  if (interpretation.defense_signal === "回避") {
    return "你在说问题之前，已经先往后退了一步。";
  }

  if (interpretation.surface_emotion !== "平静") {
    return `这段话看起来很平静，但里面更像是「${interpretation.surface_emotion}」。`;
  }

  if (memory.longIdentityMemory[0]) {
    return memory.longIdentityMemory[0];
  }

  return "你写下的不只是内容，还有当时的状态。";
}

function buildQuestion(interpretation, memory) {
  if (interpretation.core_tension.includes("行动")) {
    return "你是在怕结果，还是怕一开始就停不下来？";
  }

  if (interpretation.defense_signal === "回避") {
    return "你在躲开的，是这件事本身，还是它背后的现实？";
  }

  if (interpretation.defense_signal === "压抑") {
    return "如果不再假装没事，你最想先说什么？";
  }

  if (interpretation.pattern_link || memory.openLoops.length) {
    return "和前几次比，真正没有变的是什么？";
  }

  if (interpretation.topic_entities.includes("关系")) {
    return "你在这段关系里更难承认的是失望，还是需要？";
  }

  if (interpretation.topic_entities.includes("工作")) {
    return "真正压住你的，是事情本身，还是别人会怎么看？";
  }

  return "如果只留下一句，你真正想承认的是什么？";
}

function runHealthChecks() {
  health.checks.booted = state.isLoaded && health.dbReady;
  health.checks.canSubmit = typeof submitEntry === "function" && Boolean(elements.rawMemoryInput);
  health.checks.canRenderHistory = typeof renderHistory === "function" && Boolean(elements.historyList);
  window.__traceHealth = {
    ...health,
    totalEntries: state.entries.length,
    latestEcho: state.entries[0]?.analysis?.response?.echo || "",
  };
}

function resolveTimePhase(date) {
  const hour = date.getHours();
  if (hour < 5 || hour >= 23) return "深夜";
  if (hour < 10) return "清晨";
  return "日间";
}

function findMostFrequent(values) {
  if (!values || !values.length) return null;
  const counts = values.reduce((accumulator, value) => {
    accumulator[value] = (accumulator[value] || 0) + 1;
    return accumulator;
  }, {});

  return Object.keys(counts).reduce((left, right) => (counts[left] >= counts[right] ? left : right));
}

function containsAny(text, lexicon) {
  return lexicon.some((item) => text.includes(item));
}

function summarizeHistoryContent(text) {
  if (!text || text === "[空白记录]") return text;
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= 60) return normalized;
  return `${normalized.slice(0, 60)}…`;
}

function summarizeHistoryEcho(parts) {
  const firstLine = parts[0] || "";
  if (firstLine.length <= 42) return firstLine;
  return `${firstLine.slice(0, 42)}…`;
}

window.addEventListener("load", async () => {
  init();
  loadSystemState();
  cleanupEchoChain();

  if (state.bioEnrolled) {
    showView("unlock");
    return;
  }

  await bootSystem();
  checkPendingEchoOnBoot();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
