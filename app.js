/**
 * Trace - 认知显影系统 (Engineering v2.5)
 * 核心升级：幽灵锚点注入 + 冲突模式识别引擎
 */

const DB_NAME = "TraceCognitionDB";
const STORE_NAME = "entries";
const DRAFT_KEY = "trace-draft-v1";
const BIO_KEY = "trace-bio-enrolled";

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
  historyList: document.getElementById("history-list"),
  closeHistoryBtn: document.getElementById("close-history-btn"),
  historyEntryTemplate: document.getElementById("history-entry-template")
};

let state = { 
  entries: [], 
  draft: localStorage.getItem(DRAFT_KEY) || "", 
  historyOpen: false,
  editingId: null,
  isLoaded: false,
  activeAnchor: null // 潜意识锚点状态
};

// 核心物理指标追踪
let implicitSession = { startMs: null, backspaceCount: 0 };
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTraceFeedback() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine'; 
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.4);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.1, now + 0.02); 
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
  osc.start(now);
  osc.stop(now + 0.6);
}

// ----------------------------------------------------------------------
// Pattern Engine v2 - 认知模式引擎 (客观映射，不予评判)
// ----------------------------------------------------------------------
const PatternEngine = {
  analyze(entries) {
    if (!entries || entries.length === 0) return null;
    const latest = entries[0];
    const recent5 = entries.slice(0, 5);

    // 1. 冲突侦测 (Conflict) —— 主观锚点与客观物理阻力的对撞
    if (latest.metadata && latest.metadata.anchor === "澄明" && latest.context.friction >= 8) {
      return `你刚刚的主观标记为「澄明」，但输入行为产生了高频修改（${latest.context.friction}次退格）。你的潜意识中存在未消除的认知摩擦。`;
    }
    if (latest.metadata && latest.metadata.anchor === "焦滞" && latest.context.durationSec < 10 && latest.context.friction <= 1) {
      return `你在极短的时间内毫无阻力地留下了「焦滞」锚点。这符合本能情绪宣泄的特征，而非深度反刍。`;
    }

    // 2. 重复侦测 (Repetition) —— 状态淤积
    const recentAnchors = recent5.map(e => e.metadata?.anchor).filter(Boolean);
    if (recentAnchors.length >= 3 && recentAnchors.every(a => a === recentAnchors[0])) {
      return `过去多次记录，你的认知锚点始终停留在「${recentAnchors[0]}」。系统未观测到状态的流动或破局动作。`;
    }

    // 3. 漂移侦测 (Drift) —— 边缘时间收缩
    const lateNight = recent5.filter(e => e.context.timePhase === "深夜");
    if (lateNight.length >= 3 && latest.context.timePhase === "深夜") {
      return "连续的深度输出均发生于深夜。系统感知到你的活跃认知周期正在向边缘时间偏移。";
    }

    return null;
  }
};

const db = {
  instance: null,
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 2); // 升级 DB 版本
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

function setAmbientLight() {
  const hour = new Date().getHours();
  document.body.classList.remove('time-morning', 'time-day', 'time-night');
  if (hour >= 5 && hour < 10) document.body.classList.add('time-morning');
  else if (hour >= 10 && hour < 19) document.body.classList.add('time-day');
  else document.body.classList.add('time-night');
}

async function unlockWithBiometrics() {
  if (!window.PublicKeyCredential) return true;
  const isEnrolled = localStorage.getItem(BIO_KEY);
  try {
    const challenge = new Uint8Array(32); window.crypto.getRandomValues(challenge);
    if (!isEnrolled) {
      const userId = new Uint8Array(16); window.crypto.getRandomValues(userId);
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Trace System" },
          user: { id: userId, name: "Trace", displayName: "Trace User" },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
          authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
          timeout: 60000
        }
      });
      if (credential) localStorage.setItem(BIO_KEY, "true");
      return !!credential;
    } else {
      const credential = await navigator.credentials.get({
        publicKey: { challenge, userVerification: "required", timeout: 60000 }
      });
      return !!credential;
    }
  } catch (err) {
    return false;
  }
}

async function bootSystem() {
  try {
    await db.init();
    state.entries = await db.getAll();
    state.isLoaded = true;
    elements.rawMemoryInput.value = state.draft;
    if (!state.entries || state.entries.length === 0) showView("onboarding");
    else { showView("compose"); triggerSystemEcho(); }
  } catch (err) {
    elements.unlockBtn.textContent = "系统核心启动失败";
  }
}

function init() {
  setAmbientLight();
  setInterval(setAmbientLight, 60000 * 30);
  bindEvents();
}

function bindEvents() {
  elements.unlockBtn.addEventListener("click", async () => {
    const passed = await unlockWithBiometrics();
    if (passed) {
      elements.unlockBtn.textContent = "解构成功";
      setTimeout(bootSystem, 400);
    } else {
      elements.unlockBtn.textContent = "验证中断";
      setTimeout(() => elements.unlockBtn.textContent = "触碰以唤醒", 2000);
    }
  });

  elements.enterWritingBtn.addEventListener("click", () => { showView("compose"); elements.rawMemoryInput.focus(); });

  elements.rawMemoryInput.addEventListener("focus", () => {
    if (!implicitSession.startMs) implicitSession.startMs = Date.now();
    document.body.classList.add("focus-mode"); 
  });
  
  elements.rawMemoryInput.addEventListener("blur", () => {
    document.body.classList.remove("focus-mode"); 
  });

  elements.rawMemoryInput.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" || e.key === "Delete") implicitSession.backspaceCount++;
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submitEntry();
    }
  });

  elements.rawMemoryInput.addEventListener("input", (e) => {
    state.draft = e.target.value;
    localStorage.setItem(DRAFT_KEY, state.draft);
  });

  // 绑定锚点幽灵按钮
  elements.anchorBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const anchor = e.target.dataset.anchor;
      if (state.activeAnchor === anchor) {
        state.activeAnchor = null;
        e.target.classList.remove("active");
      } else {
        elements.anchorBtns.forEach(b => b.classList.remove("active"));
        state.activeAnchor = anchor;
        e.target.classList.add("active");
      }
    });
  });

  elements.saveEntryBtn.addEventListener("click", submitEntry);
  elements.swallowBtn.addEventListener("click", triggerBlackHole);
  elements.historyToggle.addEventListener("click", openHistory);
  elements.closeHistoryBtn.addEventListener("click", closeHistory);
  elements.exportBtn.addEventListener("click", exportData);
  elements.importBtn.addEventListener("click", () => elements.importInput.click());
  elements.importInput.addEventListener("change", importData);
}

function triggerBlackHole() {
  const content = elements.rawMemoryInput.value.trim();
  if (!content && !state.activeAnchor) return;
  playTraceFeedback();
  elements.rawMemoryInput.classList.add("ink-dissolve");
  document.body.classList.remove("focus-mode");
  setTimeout(resetComposeState, 800);
}

async function submitEntry() {
  const content = elements.rawMemoryInput.value.trim();
  // 即使没有文本，只要点了锚点也能提交（纯潜意识捕获）
  if (!content && !state.activeAnchor) return; 

  const now = new Date();
  const durationSec = implicitSession.startMs ? Math.round((Date.now() - implicitSession.startMs) / 1000) : 0;
  const friction = implicitSession.backspaceCount;
  const hour = now.getHours();
  const timePhase = (hour < 5 || hour >= 23) ? "深夜" : (hour < 10 ? "清晨" : "日间");

  let entry;

  if (state.editingId) {
    const oldEntry = state.entries.find(e => e.id === state.editingId);
    entry = { 
      ...oldEntry, 
      content, 
      lastModified: now.toISOString(), 
      context: { ...oldEntry.context, isEdited: true },
      metadata: state.activeAnchor ? { anchor: state.activeAnchor } : oldEntry.metadata 
    };
    state.editingId = null;
  } else {
    entry = {
      id: `mem-${now.getTime()}`,
      content,
      timestamp: now.toISOString(),
      context: { durationSec, friction, timePhase },
      metadata: state.activeAnchor ? { anchor: state.activeAnchor } : null
    };
  }

  playTraceFeedback();
  elements.rawMemoryInput.classList.add("ink-dissolve");
  document.body.classList.remove("focus-mode");

  await db.put(entry);
  const index = state.entries.findIndex(e => e.id === entry.id);
  if (index !== -1) state.entries[index] = entry;
  else state.entries.unshift(entry);

  setTimeout(() => {
    resetComposeState();
    elements.saveStatus.textContent = "已捕获 ✓";
    setTimeout(() => elements.saveStatus.textContent = "", 2000);
    triggerSystemEcho(); 
  }, 800); 
}

function resetComposeState() {
  elements.rawMemoryInput.value = "";
  elements.rawMemoryInput.classList.remove("ink-dissolve");
  state.draft = "";
  localStorage.removeItem(DRAFT_KEY);
  implicitSession = { startMs: null, backspaceCount: 0 };
  state.activeAnchor = null;
  elements.anchorBtns.forEach(b => b.classList.remove("active"));
}

// 引擎驱动的回声系统
function triggerSystemEcho() {
  const panel = elements.systemEchoPanel;
  panel.innerHTML = "";
  panel.classList.add("empty");
  
  const echoResult = PatternEngine.analyze(state.entries);

  if (echoResult) {
    panel.classList.remove("empty");
    const p = document.createElement("p");
    p.className = "echo-text"; 
    p.textContent = echoResult; 
    panel.appendChild(p);
  }
}

async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (!Array.isArray(imported)) throw new Error();
      for (const entry of imported) await db.put(entry);
      state.entries = await db.getAll();
      elements.saveStatus.textContent = "导入成功";
      setTimeout(() => elements.saveStatus.textContent = "", 2000);
      if (state.historyOpen) renderHistory();
    } catch (err) {
      alert("导入失败：数据结构不兼容。");
    }
  };
  reader.readAsText(file);
}

function exportData() {
  const dataStr = JSON.stringify(state.entries, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `Trace-Cognition-${new Date().toISOString().split('T')[0]}.json`;
  a.click(); URL.revokeObjectURL(url);
}

function loadEntryForEdit(id) {
  const entry = state.entries.find(e => e.id === id);
  if (!entry) return;
  elements.rawMemoryInput.value = entry.content || "";
  state.editingId = id; state.draft = entry.content || "";
  
  // 恢复锚点状态
  state.activeAnchor = entry.metadata?.anchor || null;
  elements.anchorBtns.forEach(btn => {
    if (btn.dataset.anchor === state.activeAnchor) btn.classList.add("active");
    else btn.classList.remove("active");
  });

  closeHistory();
  elements.rawMemoryInput.focus();
}

function showView(viewName) {
  elements.unlockView.classList.toggle("hidden", viewName !== "unlock");
  elements.onboardingView.classList.toggle("hidden", viewName !== "onboarding");
  elements.composeView.classList.toggle("hidden", viewName !== "compose");
  elements.globalTools.classList.toggle("hidden", viewName === "onboarding" || viewName === "unlock");
}

function openHistory() { state.historyOpen = true; elements.historyPanel.classList.remove("hidden"); renderHistory(); }
function closeHistory() { state.historyOpen = false; elements.historyPanel.classList.add("hidden"); elements.rawMemoryInput.focus(); }

function renderHistory() {
  elements.historyList.innerHTML = "";
  if (!state.isLoaded) return;
  
  if (!state.entries || state.entries.length === 0) {
    elements.historyList.innerHTML = '<p style="text-align: center; margin-top: 40px; opacity: 0.5;">暂无切片</p>';
    return;
  }
  
  state.entries.forEach(entry => {
    const node = elements.historyEntryTemplate.content.firstElementChild.cloneNode(true);
    const date = new Date(entry.timestamp);
    
    node.querySelector(".history-time").textContent = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    
    // 高阻力状态透出
    if (entry.context?.friction >= 8) {
      const fNode = node.querySelector(".history-friction");
      if (fNode) {
        fNode.textContent = "• 高阻力"; 
        fNode.classList.remove("hidden");
      }
    }

    // 文本处理
    if (entry.content) {
      node.querySelector(".history-raw-text").textContent = entry.content;
    } else {
      node.querySelector(".history-raw-text").style.display = 'none';
    }

    // 隐式映射 Metadata 透出
    if (entry.metadata?.anchor) {
      const mNode = node.querySelector(".history-metadata");
      mNode.textContent = `[ ${entry.metadata.anchor} ]`;
      mNode.classList.remove("hidden");
    }

    node.style.cursor = "pointer";
    node.addEventListener("click", () => loadEntryForEdit(entry.id));
    elements.historyList.appendChild(node);
  });
}

window.addEventListener("load", init);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}