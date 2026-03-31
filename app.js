const STORAGE_KEY = "inknote-cognition-v2";
const DRAFT_KEY = "inknote-cognition-draft-v2";

const elements = {
  composeView: document.querySelector("#compose-view"),
  loadingView: document.querySelector("#loading-view"),
  feedbackView: document.querySelector("#feedback-view"),
  returningCard: document.querySelector("#returning-card"),
  returningKicker: document.querySelector("#returning-kicker"),
  returningSummary: document.querySelector("#returning-summary"),
  entryInput: document.querySelector("#entry-input"),
  saveHint: document.querySelector("#save-hint"),
  submitButton: document.querySelector("#submit-entry-button"),
  backToWriteButton: document.querySelector("#back-to-write-button"),
  feedbackSummary: document.querySelector("#feedback-summary"),
  feedbackEmotion: document.querySelector("#feedback-emotion"),
  feedbackKeywords: document.querySelector("#feedback-keywords"),
  feedbackReflection: document.querySelector("#feedback-reflection"),
  feedbackAnchor: document.querySelector("#feedback-anchor"),
  insightCard: document.querySelector("#insight-card"),
  streakText: document.querySelector("#streak-text"),
  patternText: document.querySelector("#pattern-text"),
  historyToggle: document.querySelector("#history-toggle"),
  historyPanel: document.querySelector("#history-panel"),
  closeHistoryButton: document.querySelector("#close-history-button"),
  historySearchInput: document.querySelector("#history-search-input"),
  historyList: document.querySelector("#history-list"),
  historyDetailCard: document.querySelector("#history-detail-card"),
  historyDetailDate: document.querySelector("#history-detail-date"),
  historyDetailEmotion: document.querySelector("#history-detail-emotion"),
  historyDetailSummary: document.querySelector("#history-detail-summary"),
  historyDetailKeywords: document.querySelector("#history-detail-keywords"),
  historyDetailContent: document.querySelector("#history-detail-content"),
  historyDetailReflection: document.querySelector("#history-detail-reflection"),
  floatingWriteButton: document.querySelector("#floating-write-button"),
  historyItemTemplate: document.querySelector("#history-item-template"),
};

const state = {
  entries: loadEntries().sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
  draft: loadDraft(),
  currentView: "compose",
  currentFeedback: null,
  historyOpen: false,
  historyQuery: "",
  selectedHistoryId: null,
  selfCheck: { failures: [] },
};

initialize();

function initialize() {
  elements.entryInput.value = state.draft;
  bindEvents();
  syncStateFromHash();
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
    elements.saveHint.textContent = state.draft.trim() ? "草稿已自动保存" : "自动保存草稿";
  });

  elements.entryInput.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      submitEntry();
    }
  });

  elements.submitButton.addEventListener("click", submitEntry);
  elements.backToWriteButton.addEventListener("click", backToWrite);
  elements.historyToggle.addEventListener("click", openHistory);
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
}

function render() {
  renderViews();
  renderReturningHint();
  renderInsights();
  renderFeedback();
  renderHistory();
}

function renderViews() {
  elements.composeView.classList.toggle("hidden", state.currentView !== "compose");
  elements.loadingView.classList.toggle("hidden", state.currentView !== "loading");
  elements.feedbackView.classList.toggle("hidden", state.currentView !== "feedback");
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
  const label = state.entries.length === 1 ? "你已开始记录自己" : `你已连续记录 ${streak} 天`;

  elements.returningCard.classList.remove("hidden");
  elements.returningKicker.textContent = label;
  elements.returningSummary.textContent = `上一次你写到：${lastEntry.feedback.summary}`;
}

function renderInsights() {
  if (!elements.insightCard || !elements.streakText || !elements.patternText) return;

  if (state.entries.length < 3) {
    elements.insightCard.classList.add("hidden");
    return;
  }

  elements.insightCard.classList.remove("hidden");
  elements.streakText.textContent = `已连续记录 ${getStreakCount()} 天`;
  elements.patternText.textContent = getPatternHint();
}

function renderFeedback() {
  if (!state.currentFeedback) return;

  elements.feedbackSummary.textContent = state.currentFeedback.summary;
  elements.feedbackReflection.textContent = state.currentFeedback.reflection;
  elements.feedbackAnchor.textContent = "本工具用于帮助你识别和理解自己的行为模式。";

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
    empty.textContent = "没有匹配的记录";
    elements.historyList.appendChild(empty);
    return;
  }

  filtered.forEach((entry) => {
    const node = elements.historyItemTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".history-date").textContent = formatDate(entry.createdAt);
    node.querySelector(".history-emotion").textContent = entry.feedback.emotion;
    node.querySelector(".history-summary").textContent = entry.feedback.summary;

    const keywordWrap = node.querySelector(".history-keywords");
    entry.feedback.keywords.forEach((keyword) => {
      const tag = document.createElement("span");
      tag.className = "keyword-tag";
      tag.textContent = keyword;
      keywordWrap.appendChild(tag);
    });

    node.addEventListener("click", () => {
      state.selectedHistoryId = entry.id;
      renderHistoryDetail(entry);
      runSelfCheck("history-open-detail");
      render();
    });

    elements.historyList.appendChild(node);
  });

  const selectedEntry =
    filtered.find((entry) => entry.id === state.selectedHistoryId) || filtered[0] || null;

  if (selectedEntry) {
    state.selectedHistoryId = selectedEntry.id;
    renderHistoryDetail(selectedEntry);
  } else {
    hideHistoryDetail();
  }
}

async function submitEntry() {
  const content = elements.entryInput.value.trim();
  if (!content) return;

  state.currentView = "loading";
  render();

  await delay(700);

  const feedback = analyzeEntry(content, state.entries);
  const entry = {
    id: `entry-${crypto.randomUUID()}`,
    content,
    createdAt: new Date().toISOString(),
    feedback,
  };

  state.entries.unshift(entry);
  state.selectedHistoryId = entry.id;
  state.currentFeedback = feedback;
  state.currentView = "feedback";
  state.draft = "";
  persistEntries();
  persistDraft();
  elements.entryInput.value = "";
  elements.saveHint.textContent = "自动保存草稿";
  render();
  runSelfCheck("submit");
}

function backToWrite() {
  state.currentView = "compose";
  render();
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

function renderHistoryDetail(entry) {
  elements.historyDetailCard.classList.remove("hidden");
  elements.historyDetailDate.textContent = formatDate(entry.createdAt);
  elements.historyDetailEmotion.textContent = entry.feedback.emotion;
  elements.historyDetailSummary.textContent = entry.feedback.summary;
  elements.historyDetailContent.textContent = entry.content;
  elements.historyDetailReflection.textContent = entry.feedback.reflection;
  elements.historyDetailKeywords.innerHTML = "";

  entry.feedback.keywords.forEach((keyword) => {
    const tag = document.createElement("span");
    tag.className = "keyword-tag";
    tag.textContent = keyword;
    elements.historyDetailKeywords.appendChild(tag);
  });
}

function hideHistoryDetail() {
  elements.historyDetailCard.classList.add("hidden");
  elements.historyDetailKeywords.innerHTML = "";
}

function analyzeEntry(content, previousEntries) {
  const emotion = detectEmotion(content);
  const keywords = extractKeywords(content);

  return {
    summary: buildSummary(content, emotion, keywords),
    emotion,
    keywords,
    reflection: buildReflection(emotion, keywords, previousEntries),
  };
}

function detectEmotion(text) {
  const scores = [
    { label: "焦虑", words: ["焦虑", "不安", "压力", "担心", "慌", "害怕"] },
    { label: "疲惫", words: ["累", "疲惫", "困", "没劲", "撑不住", "疲"] },
    { label: "平静", words: ["平静", "安静", "慢", "舒服", "放松", "稳"] },
    { label: "专注", words: ["专注", "清楚", "推进", "完成", "整理", "投入"] },
    { label: "开心", words: ["开心", "高兴", "轻松", "满足", "喜欢", "顺利"] },
  ].map((item) => ({
    label: item.label,
    score: item.words.reduce((sum, word) => sum + countOccurrences(text, word), 0),
  }));

  return scores.sort((left, right) => right.score - left.score)[0].score > 0
    ? scores.sort((left, right) => right.score - left.score)[0].label
    : "平静";
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

function buildSummary(content, emotion, keywords) {
  const topic = keywords.slice(0, 2).join("、");

  if (emotion === "焦虑") return `你在记录里表达了不安，核心围绕 ${topic || "当前的压力"}。`;
  if (emotion === "疲惫") return `你现在更像是在承受消耗，重点落在 ${topic || "眼前的负担"}。`;
  if (emotion === "专注") return `你正在试图把自己重新收束回来，注意力放在 ${topic || "手上的事情"}。`;
  if (emotion === "开心") return `你这次留下的是偏轻的情绪，最明显的是 ${topic || "让你舒服的部分"}。`;
  return `你这条记录是克制的，但真正重要的还是 ${topic || "当下的状态"}。`;
}

function buildReflection(emotion, keywords, previousEntries) {
  const anchor = keywords[0] || "这件事";
  const repeated = findRepeatedKeyword(previousEntries);

  if (emotion === "焦虑") {
    return `你担心的，真的是“${anchor}”本身，还是它背后的失控感？`;
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

  return `如果把“${anchor}”说得再直接一点，你现在真正想面对的是什么？`;
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
  return repeated ? `你最近多次提到“${repeated}”。` : "继续记录，模式会慢慢出现。";
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

  if (
    state.historyOpen &&
    state.entries.length > 0 &&
    state.selectedHistoryId &&
    elements.historyDetailCard.classList.contains("hidden")
  ) {
    failures.push("历史记录详情未展开");
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
