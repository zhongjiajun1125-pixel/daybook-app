/**
 * Trace - 认知显影系统 (System Build v5.0 - 原旨主义版本)
 * 核心：认知拓扑重构 + 留存狙击手 + 绝对命中感引擎
 */

const DB_NAME = "TraceCognitionDB";
const STORE_NAME = "entries";
const DRAFT_KEY = "trace-draft-v1";
const BIO_KEY = "trace-bio-enrolled";
const LAST_ACTIVE_KEY = "trace-last-active";

const elements = {
  globalTools: document.getElementById("global-tools"),
  importBtn: document.getElementById("import-data-btn"),
  importInput: document.getElementById("import-file-input"),
  exportBtn: document.getElementById("export-data-btn"),
  historyToggle: document.getElementById("history-toggle"),
  unlockView: document.getElementById("unlock-view"),
  unlockBtn: document.getElementById("unlock-btn"),
  onboardingView: document.getElementById("onboarding-view"),
  enterWritingBtn: document.getElementById("enter-writing-btn"),
  composeView: document.getElementById("compose-view"),
  systemEchoPanel: document.getElementById("system-echo-panel"),
  rawMemoryInput: document.getElementById("raw-memory-input"),
  anchorBtns: document.querySelectorAll(".anchor-btn"),
  saveStatus: document.getElementById("save-status"),
  saveEntryBtn: document.getElementById("save-entry-btn"),
  swallowBtn: document.getElementById("swallow-btn"),
  historyPanel: document.getElementById("history-panel"),
  historyPatternLayer: document.getElementById("history-pattern-layer"),
  historyList: document.getElementById("history-list"),
  historyEntryTemplate: document.getElementById("history-entry-template"),
  closeHistoryBtn: document.getElementById("close-history-btn")
};

let state = { 
  entries: [], 
  draft: localStorage.getItem(DRAFT_KEY) || "", 
  historyOpen: false, 
  editingId: null, 
  isLoaded: false, 
  activeAnchor: null 
};

let implicitSession = { startMs: null, backspaceCount: 0, hasTyped: false };

// ----------------------------------------------------------------------
// Module 1: Pattern Engine (绝对命中引擎，100%采用原版文案)
// ----------------------------------------------------------------------
const PatternEngine = {
  analyze(entries) {
    if (!entries || entries.length < 3) return null;
    const latest = entries[0];
    const now = Date.now();

    // ==========================================
    // 狙击 1：【动机与行为的撕裂】
    // ==========================================
    const recentWeek = entries.filter(e => (now - new Date(e.timestamp).getTime()) <= 7 * 24 * 3600 * 1000);
    const intentEntries = recentWeek.filter(e => e.content.includes("准备开始"));
    
    if (intentEntries.length >= 4 && latest.content.includes("准备开始") && latest.context.durationSec > 180 && latest.context.friction >= 10) {
      return "这是你本周第 4 次记录‘准备开始’，但单次平均输入耗时超过 3 分钟，且伴随高频删改。系统观测到极高的行动启动阻力。";
    }

    // ==========================================
    // 狙击 2：【情绪的无意识淤积】
    // ==========================================
    const recent72h = entries.filter(e => (now - new Date(e.timestamp).getTime()) <= 72 * 3600 * 1000);
    const detachedEntries = recent72h.filter(e => e.metadata?.anchor === "游离" && e.content.trim() === "");
    
    if (detachedEntries.length >= 5 && latest.metadata?.anchor === "游离" && latest.content.trim() === "") {
      return "过去 72 小时内，你 5 次点击了「游离」锚点，且均未留下任何解释性文本。这是一种纯粹的能量逃逸状态。";
    }

    // ==========================================
    // 狙击 3：【特定相位的规律曝光】
    // ==========================================
    // 定义“深度剖析”：字数较长且耗时较长
    const deepReflections = entries.filter(e => e.content.length > 50 && e.context.durationSec > 120);
    
    if (deepReflections.length >= 3 && latest.context.timePhase !== "深夜" && latest.content.length <= 15) {
      const allDeepAreNight = deepReflections.every(e => e.context.timePhase === "深夜");
      if (allDeepAreNight) {
        return "系统数据表明，你对‘自我结构’的深度剖析（长文本+高耗时）100% 集中在 23:00 之后。白天的你处于完全的认知防御状态。";
      }
    }

    // ==========================================
    // 基础防线：常规模式识别（兜底）
    // ==========================================
    const recent5 = entries.slice(0, 5);
    if (latest.content === "" && latest.context.friction > 10) {
      return `系统捕获到 ${latest.context.friction} 次按键摩擦，但未留下任何文本。潜意识处于防御或失语状态。`;
    }
    const emptyWithAnchors = recent5.filter(e => e.content === "" && e.metadata?.anchor);
    if (emptyWithAnchors.length >= 3 && emptyWithAnchors[0].id === latest.id) {
      return `近期连续发生无文本陈述，仅依赖锚点标记状态。观测到对外输出意愿的收缩。`;
    }
    const prevEntry = entries[1];
    if (prevEntry && prevEntry.context.timePhase === "日间" && latest.context.timePhase === "深夜" && latest.context.friction > 5) {
      return `伴随输入阻力的上升，潜意识活跃度打破了日间的休眠，在深夜产生偏移。`;
    }
    
    return null;
  },

  generateTopologyReport(entries) {
    if (!entries || entries.length < 5) return null;
    const recent30Days = entries.filter(e => (Date.now() - new Date(e.timestamp).getTime()) / (1000 * 3600 * 24) <= 30);
    if (recent30Days.length === 0) return null;

    let report = `系统观测报告 (近30日):\n`;
    report += `· 共捕获 ${recent30Days.length} 个认知切片。\n`;

    const anchors = {};
    let highFrictionNightCount = 0;
    
    recent30Days.forEach(e => {
      if (e.metadata?.anchor) anchors[e.metadata.anchor] = (anchors[e.metadata.anchor] || 0) + 1;
      if (e.context.friction >= 8 && e.context.timePhase === "深夜") highFrictionNightCount++;
    });

    const topAnchor = Object.keys(anchors).sort((a,b) => anchors[b] - anchors[a])[0];
    if (topAnchor) report += `· 高频锚点淤积于「${topAnchor}」(${anchors[topAnchor]}次)。\n`;
    
    if (highFrictionNightCount >= 3) {
      report += `· 高阻力内耗行为显著集中于「深夜」时段。\n`;
    } else if (recent30Days.filter(e => e.content === "").length >= 3) {
      report += `· 存在多次无文本的“虚空捕获”，认知处于强防御态。\n`;
    } else {
      report += `· 认知流动态相对平稳。\n`;
    }

    return report;
  }
};

// ----------------------------------------------------------------------
// Module 2: Retention Sniper (静默狙击手)
// ----------------------------------------------------------------------
const RetentionSniper = {
  check() {
    const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
    if (!lastActive) return null;

    const hoursSince = (Date.now() - parseInt(lastActive)) / (1000 * 60 * 60);
    
    if (hoursSince > 120) {
      return "Trace 已静默超过 120 小时。你的认知黑匣子处于真空状态。";
    }
    
    if (hoursSince > 48 && state.entries.length > 0) {
      const lastEntry = state.entries[0];
      if (lastEntry.metadata?.anchor === "焦滞" || lastEntry.context.friction > 10) {
        return `距上一次高摩擦力的「${lastEntry.metadata?.anchor || '未知'}」显影已过 48 小时。该认知回路尚未闭环。`;
      }
    }
    return null;
  },
  updateActivity() {
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  },
  requestNotification() {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }
};

// ----------------------------------------------------------------------
// Core DB & Audio Feedback
// ----------------------------------------------------------------------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTraceFeedback() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine'; osc.connect(gain); gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  osc.frequency.setValueAtTime(440, now); osc.frequency.exponentialRampToValueAtTime(220, now + 0.4);
  gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.1, now + 0.02); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
  osc.start(now); osc.stop(now + 0.6);
}

const db = {
  instance: null,
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 2);
      request.onupgradeneeded = (e) => {
        const _db = e.target.result;
        if (!_db.objectStoreNames.contains(STORE_NAME)) _db.createObjectStore(STORE_NAME, { keyPath: "id" });
      };
      request.onsuccess = (e) => { this.instance = e.target.result; resolve(); };
      request.onerror = (e) => reject(e);
    });
  },
  async getAll() {
    if (!this.instance) return [];
    const tx = this.instance.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    });
  },
  async put(entry) {
    if (!this.instance) return;
    const tx = this.instance.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(entry);
    return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
  }
};

async function bootSystem() {
  try {
    await db.init();
    state.entries = await db.getAll();
    state.isLoaded = true;
    RetentionSniper.requestNotification();
    
    elements.rawMemoryInput.value = state.draft;
    
    if (!state.entries || state.entries.length === 0) {
      showView("onboarding");
    } else {
      showView("compose");
      const sniperEcho = RetentionSniper.check();
      if (sniperEcho) renderEcho(sniperEcho);
      else triggerSystemEcho();
    }
    RetentionSniper.updateActivity();
  } catch (err) { elements.unlockBtn.textContent = "系统核心启动失败"; }
}

function renderEcho(text) {
  const panel = elements.systemEchoPanel;
  panel.innerHTML = "";
  if (!text) { panel.classList.add("empty"); return; }
  panel.classList.remove("empty");
  const p = document.createElement("p"); p.className = "echo-text"; p.textContent = text; panel.appendChild(p);
}

function triggerSystemEcho() { renderEcho(PatternEngine.analyze(state.entries)); }

// ----------------------------------------------------------------------
// Interaction & Event Binding
// ----------------------------------------------------------------------
function init() { bindEvents(); }

function bindEvents() {
  elements.unlockBtn.addEventListener("click", async () => { elements.unlockBtn.textContent = "解构成功"; setTimeout(bootSystem, 400); });
  elements.enterWritingBtn.addEventListener("click", () => { showView("compose"); elements.rawMemoryInput.focus(); });
  
  elements.rawMemoryInput.addEventListener("focus", () => { if (!implicitSession.startMs) implicitSession.startMs = Date.now(); document.body.classList.add("focus-mode"); });
  elements.rawMemoryInput.addEventListener("blur", () => {
    document.body.classList.remove("focus-mode"); 
    if (implicitSession.hasTyped && elements.rawMemoryInput.value.trim() === "" && implicitSession.backspaceCount > 5) captureVoidEntry();
  });
  elements.rawMemoryInput.addEventListener("keydown", (e) => {
    implicitSession.hasTyped = true;
    if (e.key === "Backspace" || e.key === "Delete") implicitSession.backspaceCount++;
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); submitEntry(); }
  });
  elements.rawMemoryInput.addEventListener("input", (e) => {
    state.draft = e.target.value;
    localStorage.setItem(DRAFT_KEY, state.draft);
  });

  elements.anchorBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const anchor = e.target.dataset.anchor;
      if (state.activeAnchor === anchor) { state.activeAnchor = null; e.target.classList.remove("active"); } 
      else { elements.anchorBtns.forEach(b => b.classList.remove("active")); state.activeAnchor = anchor; e.target.classList.add("active"); }
    });
  });

  elements.saveEntryBtn.addEventListener("click", submitEntry);
  elements.swallowBtn.addEventListener("click", submitEntry);
  elements.historyToggle.addEventListener("click", () => { state.historyOpen = true; elements.historyPanel.classList.remove("hidden"); renderHistory(); });
  elements.closeHistoryBtn.addEventListener("click", () => { state.historyOpen = false; elements.historyPanel.classList.add("hidden"); elements.rawMemoryInput.focus(); });
}

// 虚空捕获：捕获高摩擦力的放弃行为
async function captureVoidEntry() {
  const now = new Date();
  const entry = {
    id: `mem-${now.getTime()}`, content: "", timestamp: now.toISOString(),
    context: { durationSec: Math.round((Date.now() - implicitSession.startMs) / 1000), friction: implicitSession.backspaceCount, timePhase: "虚空" },
    metadata: { anchor: "未言明" }
  };
  await db.put(entry); state.entries.unshift(entry); resetComposeState();
}

// 提交认知并执行 "Hit and Run" 驱逐
async function submitEntry() {
  const content = elements.rawMemoryInput.value.trim();
  if (!content && !state.activeAnchor && implicitSession.backspaceCount === 0) return; 

  const now = new Date();
  const durationSec = implicitSession.startMs ? Math.round((Date.now() - implicitSession.startMs) / 1000) : 0;
  const friction = implicitSession.backspaceCount;
  const hour = now.getHours();
  const timePhase = (hour < 5 || hour >= 23) ? "深夜" : (hour < 10 ? "清晨" : "日间");

  let entry = {
    id: state.editingId || `mem-${now.getTime()}`, content, timestamp: now.toISOString(),
    context: { durationSec, friction, timePhase },
    metadata: state.activeAnchor ? { anchor: state.activeAnchor } : null
  };

  elements.rawMemoryInput.classList.add("ink-dissolve");
  document.body.classList.remove("focus-mode");

  await db.put(entry);
  const index = state.entries.findIndex(e => e.id === entry.id);
  if (index !== -1) state.entries[index] = entry; else state.entries.unshift(entry);

  RetentionSniper.updateActivity();

  // Hit and Run 视觉驱逐
  document.body.style.opacity = "0.2";
  elements.saveStatus.textContent = "认知已封装。系统休眠。";
  
  setTimeout(() => { 
    document.body.style.opacity = "1"; 
    resetComposeState(); 
    triggerSystemEcho(); 
  }, 2500); 
}

function resetComposeState() {
  elements.rawMemoryInput.value = ""; elements.rawMemoryInput.classList.remove("ink-dissolve"); elements.saveStatus.textContent = "";
  state.editingId = null; implicitSession = { startMs: null, backspaceCount: 0, hasTyped: false }; state.activeAnchor = null;
  state.draft = ""; localStorage.removeItem(DRAFT_KEY);
  elements.anchorBtns.forEach(b => b.classList.remove("active"));
}

function loadEntryForEdit(id) {
  const entry = state.entries.find(e => e.id === id); if (!entry) return;
  elements.rawMemoryInput.value = entry.content || ""; state.editingId = id; state.draft = entry.content || "";
  state.activeAnchor = entry.metadata?.anchor || null;
  elements.anchorBtns.forEach(btn => { if (btn.dataset.anchor === state.activeAnchor) btn.classList.add("active"); else btn.classList.remove("active"); });
  elements.historyPanel.classList.add("hidden"); state.historyOpen = false; elements.rawMemoryInput.focus();
}

// ----------------------------------------------------------------------
// History Rendering (拓扑视图: 模式层 + 时间折叠)
// ----------------------------------------------------------------------
function renderHistory() {
  elements.historyList.innerHTML = "";
  elements.historyPatternLayer.innerHTML = "";
  
  if (!state.entries || state.entries.length === 0) {
    elements.historyList.innerHTML = '<p style="text-align: center; margin-top: 40px; opacity: 0.5;">拓扑结构为空</p>';
    elements.historyPatternLayer.classList.add("empty");
    return;
  }

  // 渲染模式层
  const report = PatternEngine.generateTopologyReport(state.entries);
  if (report) {
    elements.historyPatternLayer.textContent = report;
    elements.historyPatternLayer.classList.remove("empty");
  } else {
    elements.historyPatternLayer.classList.add("empty");
  }

  // 时间折叠渲染
  let currentDateStr = "";

  state.entries.forEach(entry => {
    const dateObj = new Date(entry.timestamp);
    const dateStr = `${dateObj.getFullYear()}-${(dateObj.getMonth()+1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;

    if (dateStr !== currentDateStr) {
      const divider = document.createElement("div");
      divider.className = "history-date-divider";
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      divider.textContent = dateStr === todayStr ? "今日切片 (TODAY)" : dateStr;
      elements.historyList.appendChild(divider);
      currentDateStr = dateStr;
    }

    const node = elements.historyEntryTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".history-time").textContent = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
    
    if (entry.context?.friction >= 8) {
      const fNode = node.querySelector(".history-friction");
      fNode.textContent = `• 摩擦:${entry.context.friction}`; fNode.classList.remove("hidden");
    }

    if (entry.metadata?.anchor) {
      const mNode = node.querySelector(".history-metadata");
      mNode.textContent = `[ ${entry.metadata.anchor} ]`; mNode.classList.remove("hidden");
    }

    const textNode = node.querySelector(".history-raw-text");
    if (entry.content) {
      textNode.textContent = entry.content;
    } else {
      textNode.textContent = "[ 虚空捕获 ]"; textNode.style.opacity = 0.4; textNode.style.fontStyle = "italic";
    }

    node.style.cursor = "pointer";
    node.addEventListener("click", () => loadEntryForEdit(entry.id));
    elements.historyList.appendChild(node);
  });
}

function showView(viewName) {
  elements.unlockView.classList.toggle("hidden", viewName !== "unlock");
  elements.onboardingView.classList.toggle("hidden", viewName !== "onboarding");
  elements.composeView.classList.toggle("hidden", viewName !== "compose");
  elements.globalTools.classList.toggle("hidden", viewName === "onboarding" || viewName === "unlock");
}

window.addEventListener("load", init);

if ('serviceWorker' in navigator) { 
  window.addEventListener('load', () => { 
    navigator.serviceWorker.register('./sw.js').catch(() => {}); 
  }); 
}