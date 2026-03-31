const STORAGE_KEY = "inknote-cognition-v3";
const DRAFT_KEY = "inknote-cognition-draft-v3";
const LANGUAGE_KEY = "inknote-language-v1";
const LEGACY_STORAGE_KEYS = ["inknote-cognition-v2", "inknote-cognition-draft-v2"];

const elements = {
  composeView: document.querySelector("#compose-view"),
  loadingView: document.querySelector("#loading-view"),
  feedbackView: document.querySelector("#feedback-view"),
  returningCard: document.querySelector("#returning-card"),
  returningKicker: document.querySelector("#returning-kicker"),
  returningSummary: document.querySelector("#returning-summary"),
  languageSelect: document.querySelector("#language-select"),
  reflectionAnchorCard: document.querySelector("#reflection-anchor-card"),
  reflectionAnchorLabel: document.querySelector("#reflection-anchor-label"),
  reflectionAnchorText: document.querySelector("#reflection-anchor-text"),
  heroLine: document.querySelector("#hero-line"),
  entryInput: document.querySelector("#entry-input"),
  saveHint: document.querySelector("#save-hint"),
  submitButton: document.querySelector("#submit-entry-button"),
  backToWriteButton: document.querySelector("#back-to-write-button"),
  loadingText: document.querySelector("#loading-text"),
  feedbackEyebrow: document.querySelector("#feedback-eyebrow"),
  feedbackSummary: document.querySelector("#feedback-summary"),
  feedbackEmotion: document.querySelector("#feedback-emotion"),
  feedbackKeywords: document.querySelector("#feedback-keywords"),
  feedbackReflection: document.querySelector("#feedback-reflection"),
  feedbackAnchor: document.querySelector("#feedback-anchor"),
  insightCard: document.querySelector("#insight-card"),
  streakText: document.querySelector("#streak-text"),
  patternText: document.querySelector("#pattern-text"),
  historyToggle: document.querySelector("#history-toggle"),
  historyBackdrop: document.querySelector("#history-backdrop"),
  historyPanel: document.querySelector("#history-panel"),
  historyTitle: document.querySelector("#history-title"),
  closeHistoryButton: document.querySelector("#close-history-button"),
  historySearchInput: document.querySelector("#history-search-input"),
  historyList: document.querySelector("#history-list"),
  floatingWriteButton: document.querySelector("#floating-write-button"),
  historyGroupTemplate: document.querySelector("#history-item-template"),
  historyEntryTemplate: document.querySelector("#history-entry-template"),
};

const HERO_LINES = [
  "把你的生活，变成可以被看懂的数据。",
  "写下此刻，让模糊的感受慢慢显形。",
  "留下一句话，给今天一个清晰的切面。",
  "把没有说清的部分，安静地写出来。",
  "记录不是堆积，它是慢慢看见自己。",
];

const UI_COPY = {
  "zh-CN": {
    entryPlaceholder: "写下此刻。",
    reflectionAnchor: "上一问",
    saveEmpty: "自动保存草稿",
    saveDraft: "草稿已自动保存",
    saveIdle: "可以按 Cmd/Ctrl + Enter 提交",
    submit: "完成",
    loading: "正在理解这一条记录…",
    feedback: "即时反馈",
    continueWrite: "继续写",
    history: "记录",
    historyTitle: "历史记录",
    closeHistory: "返回输入",
    historySearch: "搜索记录、情绪、关键词",
    noResults: "没有匹配的记录",
    started: "你已开始记录自己",
    streak: (days) => `你已连续记录 ${days} 天`,
    previous: (summary) => `上一次你写到：${summary}`,
    insight: (days) => `已连续记录 ${days} 天`,
    patternFallback: "继续记录，模式会慢慢出现。",
    feedbackAnchor: "本工具用于帮助你识别和理解自己的行为模式。",
    today: "今天",
    yesterday: "昨天",
    earlier: "更早",
  },
  en: {
    entryPlaceholder: "Write this moment.",
    reflectionAnchor: "Last Question",
    saveEmpty: "Draft autosaves",
    saveDraft: "Draft saved",
    saveIdle: "Press Cmd/Ctrl + Enter to submit",
    submit: "Done",
    loading: "Understanding this entry…",
    feedback: "Instant Feedback",
    continueWrite: "Keep Writing",
    history: "History",
    historyTitle: "History",
    closeHistory: "Back to Write",
    historySearch: "Search entries, emotions, keywords",
    noResults: "No matching entries",
    started: "You have started recording yourself",
    streak: (days) => `You have recorded ${days} days in a row`,
    previous: (summary) => `Last time you wrote: ${summary}`,
    insight: (days) => `${days} day streak`,
    patternFallback: "Keep writing. Patterns will appear.",
    feedbackAnchor: "This tool helps you recognize and understand your behavior patterns.",
    today: "Today",
    yesterday: "Yesterday",
    earlier: "Earlier",
  },
};

const state = {
  entries: sanitizeEntries(loadEntries()).sort(
    (left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt),
  ),
  draft: loadDraft(),
  language: loadLanguage(),
  currentView: "compose",
  currentFeedback: null,
  historyOpen: false,
  historyQuery: "",
  idleHintTimer: null,
  selfCheck: { failures: [] },
};

initialize();

function initialize() {
  clearLegacyStorage();
  persistEntries();
  elements.entryInput.value = state.draft;
  elements.languageSelect.value = state.language;
  bindEvents();
  syncStateFromHash();
  renderHeroLine();
  syncSaveHint();
  render();
  runSelfCheck("initialize");
  requestAnimationFrame(() => {
    elements.entryInput.focus();
  });
}

function bindEvents() {
  elements.entryInput.addEventListener("input", () => {
    state.draft = elements.entryInput.value;
    persistDraft();
    syncSaveHint();
    scheduleIdleHint();
  });

  elements.entryInput.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      submitEntry();
    }
  });

  elements.submitButton.addEventListener("click", submitEntry);
  elements.backToWriteButton.addEventListener("click", backToWrite);
  elements.languageSelect.addEventListener("change", () => {
    state.language = elements.languageSelect.value;
    persistLanguage();
    render();
  });
  elements.historyToggle.addEventListener("click", openHistory);
  elements.historyBackdrop.addEventListener("click", closeHistory);
  elements.closeHistoryButton.addEventListener("click", closeHistory);
  elements.floatingWriteButton.addEventListener("click", closeHistory);
  elements.historySearchInput.addEventListener("input", () => {
    state.historyQuery = elements.historySearchInput.value.trim().toLowerCase();
    renderHistory();
    runSelfCheck("history-search");
  });

  window.addEventListener("hashchange", () => {
    syncStateFromHash();
    render();
    runSelfCheck("hashchange");
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.historyOpen) {
      closeHistory();
    }
  });
}

function render() {
  renderLanguage();
  renderHeroLine();
  renderViews();
  renderReturningHint();
  renderInsights();
  renderReflectionAnchor();
  renderFeedback();
  renderHistory();
}

function renderViews() {
  elements.composeView.classList.toggle("hidden", state.currentView !== "compose");
  elements.loadingView.classList.toggle("hidden", state.currentView !== "loading");
  elements.feedbackView.classList.toggle("hidden", state.currentView !== "feedback");
  elements.historyBackdrop.classList.toggle("hidden", !state.historyOpen);
  elements.historyPanel.classList.toggle("hidden", !state.historyOpen);
  elements.historyPanel.setAttribute("aria-hidden", String(!state.historyOpen));
}

function renderReturningHint() {
  if (!elements.returningCard || !elements.returningKicker || !elements.returningSummary) return;

  if (!state.entries.length) {
    elements.returningCard.classList.add("hidden");
    return;
  }

  const lastEntry = state.entries[0];
  const streak = getStreakCount();
  const label = state.entries.length === 1 ? t().started : t().streak(streak);

  elements.returningCard.classList.remove("hidden");
  elements.returningKicker.textContent = label;
  elements.returningSummary.textContent = t().previous(lastEntry.feedback.summary);
}

function renderInsights() {
  if (!elements.insightCard || !elements.streakText || !elements.patternText) return;

  if (state.entries.length < 3) {
    elements.insightCard.classList.add("hidden");
    return;
  }

  elements.insightCard.classList.remove("hidden");
  elements.streakText.textContent = t().insight(getStreakCount());
  elements.patternText.textContent = getPatternHint();
}

function renderFeedback() {
  if (!state.currentFeedback) return;

  elements.feedbackSummary.textContent = state.currentFeedback.summary;
  elements.feedbackReflection.textContent = state.currentFeedback.reflection;
  elements.feedbackAnchor.textContent = t().feedbackAnchor;

  elements.feedbackEmotion.innerHTML = "";
  const emotionTag = document.createElement("span");
  emotionTag.className = "emotion-tag";
  emotionTag.textContent = state.currentFeedback.emotion;
  elements.feedbackEmotion.appendChild(emotionTag);

  elements.feedbackKeywords.innerHTML = "";
  state.currentFeedback.keywords.forEach((keyword) => {
    const tag = document.createElement("span");
    tag.className = "keyword-tag";
    tag.textContent = keyword;
    elements.feedbackKeywords.appendChild(tag);
  });
}

function renderReflectionAnchor() {
  if (!state.currentFeedback?.reflection) {
    elements.reflectionAnchorCard.classList.add("hidden");
    return;
  }

  elements.reflectionAnchorCard.classList.remove("hidden");
  elements.reflectionAnchorText.textContent = state.currentFeedback.reflection;
}

function renderHistory() {
  if (!state.historyOpen) return;

  const filtered = state.entries.filter((entry) => {
    const haystack = [
      entry.content,
      entry.feedback.summary,
      entry.feedback.emotion,
      entry.feedback.keywords.join(" "),
    ]
      .join(" ")
      .toLowerCase();
    return !state.historyQuery || haystack.includes(state.historyQuery);
  });

  elements.historyList.innerHTML = "";

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "feedback-card";
    empty.textContent = t().noResults;
    elements.historyList.appendChild(empty);
    return;
  }

  groupHistoryEntries(filtered).forEach(([label, entries]) => {
    const group = elements.historyGroupTemplate.content.firstElementChild.cloneNode(true);
    group.querySelector(".history-group-label").textContent = label;
    const itemsWrap = group.querySelector(".history-group-items");

    entries.forEach((entry) => {
      const node = elements.historyEntryTemplate.content.firstElementChild.cloneNode(true);
      node.querySelector(".history-date").textContent = formatDate(entry.createdAt);
      node.querySelector(".history-emotion").textContent = entry.feedback.emotion;
      setHighlightedText(node.querySelector(".history-summary"), entry.feedback.summary, state.historyQuery);
      setHighlightedText(node.querySelector(".history-preview"), entry.content, state.historyQuery);

      const keywordWrap = node.querySelector(".history-keywords");
      entry.feedback.keywords.forEach((keyword) => {
        const tag = document.createElement("span");
        tag.className = "keyword-tag";
        if (state.historyQuery && keyword.toLowerCase().includes(state.historyQuery)) {
          tag.innerHTML = highlightMatch(keyword, state.historyQuery);
        } else {
          tag.textContent = keyword;
        }
        keywordWrap.appendChild(tag);
      });

      node.addEventListener("click", () => {
        openEntryForWriting(entry);
      });

      itemsWrap.appendChild(node);
    });
    elements.historyList.appendChild(group);
  });
}

async function submitEntry() {
  const content = elements.entryInput.value.trim();
  if (!content) return;

  state.currentView = "loading";
  render();

  await delay(700);

  const now = new Date().toISOString();
  const feedback = analyzeEntry(content, state.entries);
  const duplicateEntry = findRecentDuplicateEntry(content);

  if (duplicateEntry) {
    duplicateEntry.feedback = feedback;
    duplicateEntry.updatedAt = now;
  } else {
    const entry = {
      id: `entry-${crypto.randomUUID()}`,
      content,
      createdAt: now,
      updatedAt: now,
      feedback,
    };

    state.entries.unshift(entry);
  }

  sortEntries();
  state.currentFeedback = feedback;
  state.currentView = "feedback";
  state.draft = "";
  persistEntries();
  persistDraft();
  elements.entryInput.value = "";
  syncSaveHint();
  render();
  runSelfCheck("submit");
}

function backToWrite() {
  state.currentView = "compose";
  render();
  syncSaveHint();
  requestAnimationFrame(() => {
    elements.entryInput.focus();
  });
}

function openHistory() {
  state.historyOpen = true;
  if (window.location.hash !== "#history") {
    window.location.hash = "history";
    return;
  }
  render();
  runSelfCheck("open-history");
}

function closeHistory() {
  state.historyOpen = false;
  if (window.location.hash === "#history") {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }
  render();
  runSelfCheck("close-history");
  requestAnimationFrame(() => {
    elements.entryInput.focus();
  });
}

function syncStateFromHash() {
  state.historyOpen = window.location.hash === "#history";
}

function openEntryForWriting(entry) {
  state.draft = `${entry.content}\n`;
  persistDraft();
  elements.entryInput.value = state.draft;
  state.currentFeedback = entry.feedback;
  state.currentView = "compose";
  syncSaveHint();
  closeHistory();
  requestAnimationFrame(() => {
    elements.entryInput.selectionStart = elements.entryInput.value.length;
    elements.entryInput.selectionEnd = elements.entryInput.value.length;
    elements.entryInput.focus();
  });
}

function analyzeEntry(content, previousEntries) {
  const emotion = detectEmotion(content);
  const keywords = extractKeywords(content);
  const emotionalSignals = detectEmotionalSignals(content);

  return {
    summary: buildSummary(content, emotion, keywords, emotionalSignals),
    emotion,
    keywords,
    reflection: buildReflection(emotion, keywords, previousEntries, emotionalSignals),
  };
}

function detectEmotion(text) {
  const signals = detectEmotionalSignals(text);
  return signals[0]?.score > 0 ? signals[0].label : "平静";
}

function extractKeywords(text) {
  const pool = [
    "工作",
    "睡眠",
    "压力",
    "关系",
    "身体",
    "拖延",
    "时间",
    "休息",
    "家庭",
    "效率",
    "未来",
    "生活",
  ];

  const found = pool.filter((item) => text.includes(item));
  if (found.length >= 3) return found.slice(0, 3);

  const parts = text
    .replace(/[，。！？、,.!?;:\n]/g, " ")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2 && part.length <= 6);

  return [...new Set([...found, ...parts])].slice(0, 3).length
    ? [...new Set([...found, ...parts])].slice(0, 3)
    : ["今天", "感受", "自己"];
}

function buildSummary(content, emotion, keywords, emotionalSignals) {
  const topic = keywords.slice(0, 2).join("、");
  const secondEmotion = emotionalSignals[1]?.score > 0 ? emotionalSignals[1].label : "";

  if (emotion === "焦虑") {
    return secondEmotion === "疲惫"
      ? `你一边在扛着 ${topic || "眼前的事"}，一边已经有点被它耗住了。`
      : `你这条记录里最明显的是不安，重心落在 ${topic || "当前的压力"}。`;
  }
  if (emotion === "疲惫") {
    return secondEmotion === "焦虑"
      ? `你不只是累，更像是在被 ${topic || "这件事"} 持续消耗。`
      : `你现在更像是在承受消耗，重点落在 ${topic || "眼前的负担"}。`;
  }
  if (emotion === "专注") return `你在试着把自己重新收束回来，注意力正落在 ${topic || "手上的事情"}。`;
  if (emotion === "开心") return `这条记录偏轻也偏亮，最明显的是 ${topic || "让你舒服的部分"}。`;
  if (emotion === "难过") return `你写下来的不是表面的情绪，更像是被 ${topic || "这件事"} 压低了。`;
  return `你这条记录很克制，但真正重要的还是 ${topic || "当下的状态"}。`;
}

function buildReflection(emotion, keywords, previousEntries, emotionalSignals) {
  const anchor = keywords[0] || "这件事";
  const repeated = findRepeatedKeyword(previousEntries);
  const secondEmotion = emotionalSignals[1]?.score > 0 ? emotionalSignals[1].label : "";

  if (emotion === "焦虑") {
    return secondEmotion === "疲惫"
      ? `你现在想摆脱的，到底是“${anchor}”，还是这种一直被它拖住的感觉？`
      : `你担心的，真的是“${anchor}”本身，还是它背后的失控感？`;
  }

  if (emotion === "疲惫") {
    return repeated
      ? `你最近已经反复碰到“${repeated}”，这次的累更像身体问题，还是心里在抵抗？`
      : `这种疲惫更像来自身体透支，还是你在抗拒“${anchor}”？`;
  }

  if (emotion === "专注") {
    return `如果今天只保留一件最重要的事，你愿意把注意力继续放在“${anchor}”上吗？`;
  }

  if (emotion === "开心") {
    return `这次让你舒服的部分，能不能被你主动留下，而不只是碰巧出现？`;
  }

  if (emotion === "难过") {
    return `如果你不再把“${anchor}”说得那么轻，这里面最委屈的部分是什么？`;
  }

  return `如果把“${anchor}”说得再直接一点，你现在真正想面对的是什么？`;
}

function detectEmotionalSignals(text) {
  return [
    { label: "焦虑", words: ["焦虑", "不安", "压力", "担心", "慌", "害怕", "烦", "崩"] },
    { label: "疲惫", words: ["累", "疲惫", "困", "没劲", "撑不住", "疲", "耗尽"] },
    { label: "平静", words: ["平静", "安静", "慢", "舒服", "放松", "稳", "安定"] },
    { label: "专注", words: ["专注", "清楚", "推进", "完成", "整理", "投入", "沉下"] },
    { label: "开心", words: ["开心", "高兴", "轻松", "满足", "喜欢", "顺利", "值得"] },
    { label: "难过", words: ["难过", "失落", "委屈", "低落", "空", "无力", "沮丧"] },
  ]
    .map((item) => ({
      label: item.label,
      score: item.words.reduce((sum, word) => sum + countOccurrences(text, word), 0),
    }))
    .sort((left, right) => right.score - left.score);
}

function findRepeatedKeyword(entries) {
  const keywords = entries.slice(0, 3).flatMap((entry) => entry.feedback.keywords);
  const counts = new Map();
  keywords.forEach((keyword) => {
    counts.set(keyword, (counts.get(keyword) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[1] >= 2
    ? [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    : "";
}

function getPatternHint() {
  const repeated = findRepeatedKeyword(state.entries.slice(0, 5));
  return repeated
    ? state.language === "en"
      ? `You mentioned "${repeated}" several times recently.`
      : `你最近多次提到“${repeated}”。`
    : t().patternFallback;
}

function getStreakCount() {
  const days = [...new Set(state.entries.map((entry) => entry.createdAt.slice(0, 10)))].sort().reverse();
  if (!days.length) return 0;

  let streak = 1;
  for (let index = 1; index < days.length; index += 1) {
    const current = new Date(days[index - 1]);
    const next = new Date(days[index]);
    const diff = (current - next) / (1000 * 60 * 60 * 24);
    if (diff === 1) streak += 1;
    else break;
  }
  return streak;
}

function formatDate(isoString) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoString));
}

function countOccurrences(text, token) {
  return text.split(token).length - 1;
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function loadEntries() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistEntries() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
}

function loadDraft() {
  return window.localStorage.getItem(DRAFT_KEY) ?? "";
}

function persistDraft() {
  window.localStorage.setItem(DRAFT_KEY, state.draft);
}

function syncSaveHint() {
  elements.saveHint.textContent = state.draft.trim() ? t().saveDraft : t().saveEmpty;
}

function renderHeroLine() {
  if (!elements.heroLine) return;
  const index = state.entries.length % HERO_LINES.length;
  elements.heroLine.textContent = HERO_LINES[index];
}

function renderLanguage() {
  elements.entryInput.placeholder = t().entryPlaceholder;
  elements.reflectionAnchorLabel.textContent = t().reflectionAnchor;
  elements.submitButton.textContent = t().submit;
  elements.loadingText.textContent = t().loading;
  elements.feedbackEyebrow.textContent = t().feedback;
  elements.backToWriteButton.textContent = t().continueWrite;
  elements.historyToggle.textContent = t().history;
  elements.historyTitle.textContent = t().historyTitle;
  elements.closeHistoryButton.textContent = t().closeHistory;
  elements.historySearchInput.placeholder = t().historySearch;
  syncSaveHint();
}

function groupHistoryEntries(entries) {
  const groups = new Map();
  entries.forEach((entry) => {
    const label = getHistoryGroupLabel(entry.createdAt);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(entry);
  });
  return [...groups.entries()];
}

function getHistoryGroupLabel(isoString) {
  const target = new Date(isoString);
  const today = new Date();
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const diffDays = Math.round((todayDay - targetDay) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t().today;
  if (diffDays === 1) return t().yesterday;
  return t().earlier;
}

function setHighlightedText(element, text, query) {
  if (!query) {
    element.textContent = text;
    return;
  }
  element.innerHTML = highlightMatch(text, query);
}

function highlightMatch(text, query) {
  const escapedQuery = escapeRegExp(query);
  return text.replace(new RegExp(`(${escapedQuery})`, "gi"), "<mark>$1</mark>");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scheduleIdleHint() {
  if (state.idleHintTimer) {
    window.clearTimeout(state.idleHintTimer);
  }

  if (!state.draft.trim()) return;

  state.idleHintTimer = window.setTimeout(() => {
    if (state.currentView === "compose" && state.draft.trim()) {
      elements.saveHint.textContent = t().saveIdle;
    }
  }, 1500);
}

function loadLanguage() {
  return window.localStorage.getItem(LANGUAGE_KEY) || "zh-CN";
}

function persistLanguage() {
  window.localStorage.setItem(LANGUAGE_KEY, state.language);
}

function t() {
  return UI_COPY[state.language] || UI_COPY["zh-CN"];
}

function findRecentDuplicateEntry(content) {
  const normalized = normalizeContent(content);
  const latest = state.entries[0];
  if (!latest) return null;

  const sameContent = normalizeContent(latest.content) === normalized;
  const createdAt = new Date(latest.updatedAt || latest.createdAt).getTime();
  const withinTenMinutes = Date.now() - createdAt <= 10 * 60 * 1000;

  return sameContent && withinTenMinutes ? latest : null;
}

function sortEntries() {
  state.entries.sort((left, right) => {
    const leftTime = new Date(left.updatedAt || left.createdAt).getTime();
    const rightTime = new Date(right.updatedAt || right.createdAt).getTime();
    return rightTime - leftTime;
  });
}

function sanitizeEntries(entries) {
  if (!Array.isArray(entries)) return [];

  const sorted = [...entries].sort((left, right) => {
    const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
    const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
    return rightTime - leftTime;
  });

  const kept = [];
  sorted.forEach((entry) => {
    if (!entry || typeof entry.content !== "string" || !entry.feedback) return;

    const duplicate = kept.find((existing) => isAccidentalDuplicate(entry, existing));
    if (duplicate) return;

    kept.push({
      ...entry,
      updatedAt: entry.updatedAt || entry.createdAt,
    });
  });

  return kept;
}

function isAccidentalDuplicate(left, right) {
  const sameContent = normalizeContent(left.content) === normalizeContent(right.content);
  const sameSummary = left.feedback?.summary === right.feedback?.summary;
  const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
  const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
  const withinTenMinutes = Math.abs(leftTime - rightTime) <= 10 * 60 * 1000;
  return sameContent && sameSummary && withinTenMinutes;
}

function normalizeContent(content) {
  return content.replace(/\s+/g, " ").trim();
}

function clearLegacyStorage() {
  LEGACY_STORAGE_KEYS.forEach((key) => {
    window.localStorage.removeItem(key);
  });
}

function runSelfCheck(context) {
  const failures = [];

  if (!elements.entryInput || !elements.submitButton) {
    failures.push("记录创建路径不可用");
  }

  if (state.currentView === "feedback" && !state.currentFeedback) {
    failures.push("AI 反馈页缺少反馈数据");
  }

  if (!elements.historyToggle || !elements.historyPanel) {
    failures.push("历史入口或历史容器缺失");
  }

  if (state.historyOpen && state.entries.length > 0 && !elements.historyList.children.length) {
    failures.push("历史页未加载任何记录");
  }

  state.selfCheck.failures = failures;
  window.__inknoteHealth = {
    context,
    ok: failures.length === 0,
    failures: [...failures],
    entries: state.entries.length,
    view: state.currentView,
    historyOpen: state.historyOpen,
  };

  if (failures.length) {
    console.error("[Inknote self-check failed]", context, failures);
  }
}
