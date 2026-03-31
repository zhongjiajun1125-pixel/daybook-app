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
  editingId: null 
};

let implicitSession = { startMs: null, backspaceCount: 0 };

// 黑洞模式：易失性記憶棧
class BlackHoleStack {
  constructor() { this.tempMemory = []; }
  pour(noise) { if (noise) this.tempMemory.push(noise); }
  swallow() {
    for (let i = 0; i < this.tempMemory.length; i++) this.tempMemory[i] = "VOID";
    this.tempMemory.length = 0;
    this.tempMemory = [];
  }
}
const voidStack = new BlackHoleStack();

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Zen Pulse：空靈脈衝音效 (方案 A)
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

const db = {
  instance: null,
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const _db = e.target.result;
        if (!_db.objectStoreNames.contains(STORE_NAME)) _db.createObjectStore(STORE_NAME, { keyPath: "id" });
      };
      request.onsuccess = (e) => { this.instance = e.target.result; resolve(); };
      request.onerror = (e) => reject(e);
    });
  },
  async getAll() {
    return new Promise((resolve) => {
      const tx = this.instance.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    });
  },
  async put(entry) {
    return new Promise((resolve) => {
      const tx = this.instance.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(entry);
      tx.oncomplete = () => resolve();
    });
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
  await db.init();
  state.entries = await db.getAll();
  elements.rawMemoryInput.value = state.draft;
  if (state.entries.length === 0) showView("onboarding");
  else { showView("compose"); checkSystemEcho(); }
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
      elements.unlockBtn.textContent = "已解構";
      setTimeout(bootSystem, 400);
    } else {
      elements.unlockBtn.textContent = "驗證中斷";
      setTimeout(() => elements.unlockBtn.textContent = "觸碰以喚醒", 2000);
    }
  });

  elements.enterWritingBtn.addEventListener("click", () => {
    showView("compose");
    elements.rawMemoryInput.focus();
  });

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
  if (!content) return;
  voidStack.pour(content);
  voidStack.swallow(); 
  playTraceFeedback();
  elements.rawMemoryInput.classList.add("ink-dissolve");
  document.body.classList.remove("focus-mode");
  setTimeout(() => {
    elements.rawMemoryInput.value = "";
    elements.rawMemoryInput.classList.remove("ink-dissolve");
    state.draft = "";
    localStorage.removeItem(DRAFT_KEY);
    state.editingId = null;
    elements.saveStatus.textContent = "已湮滅";
    setTimeout(() => elements.saveStatus.textContent = "", 2000);
  }, 800);
}

async function submitEntry() {
  const content = elements.rawMemoryInput.value.trim();
  if (!content) return;

  const now = new Date();
  let entry;

  if (state.editingId) {
    const oldEntry = state.entries.find(e => e.id === state.editingId);
    entry = {
      ...oldEntry,
      content,
      lastModified: now.toISOString(),
      context: { ...oldEntry.context, isEdited: true }
    };
    state.editingId = null;
  } else {
    const hour = now.getHours();
    let timePhase = hour < 5 || hour >= 23 ? "深夜" : (hour < 10 ? "清晨" : "日間");
    entry = {
      id: `mem-${now.getTime()}`,
      content,
      timestamp: now.toISOString(),
      context: { 
        durationSec: Math.round((Date.now() - (implicitSession.startMs || Date.now())) / 1000), 
        friction: implicitSession.backspaceCount, 
        timePhase 
      },
      tags: {} 
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
    elements.rawMemoryInput.value = "";
    elements.rawMemoryInput.classList.remove("ink-dissolve");
    state.draft = "";
    localStorage.removeItem(DRAFT_KEY);
    elements.saveStatus.textContent = "已封存";
    setTimeout(() => elements.saveStatus.textContent = "", 2000);
    silentAnalyze(entry);
    checkSystemEcho(); 
    implicitSession = { startMs: null, backspaceCount: 0 };
  }, 800); 
}

async function silentAnalyze(entry) {
  entry.tags = {
    emotion: detectEmotion(entry.content),
    keywords: extractKeywords(entry.content)
  };
  await db.put(entry);
}

function checkSystemEcho() {
  const panel = elements.systemEchoPanel;
  panel.innerHTML = "";
  panel.classList.add("empty");
  if (state.entries.length === 0) return;
  const recentEntries = state.entries.slice(0, 15);
  let echoText = "";
  const highFrictionEntries = recentEntries.filter(e => e.context?.friction > 5);
  const lateNightEntries = recentEntries.filter(e => e.context?.timePhase === "深夜");

  if (lateNightEntries.length >= 3) {
    const nightKeywords = lateNightEntries.flatMap(e => e.tags.keywords || []);
    const repeatedNight = findMostFrequent(nightKeywords);
    echoText = repeatedNight ? `你關於「${repeatedNight}」的記錄，絕大多數發生在深夜。` : `你最近習慣在深夜系統性地吐露。`;
  } else if (highFrictionEntries.length >= 3) {
    echoText = `系統監測到，你在記錄最近幾個想法時，伴隨著高頻的刪改。`;
  } else if (recentEntries.length >= 5) {
    const allKeywords = recentEntries.flatMap(e => e.tags.keywords || []);
    const repeated = findMostFrequent(allKeywords);
    if (repeated && allKeywords.filter(k => k === repeated).length >= 3) {
      echoText = `最近的系統切面裡，反覆出現了「${repeated}」。`;
    }
  }

  if (echoText) {
    panel.classList.remove("empty");
    const p = document.createElement("p");
    p.className = "echo-text";
    p.textContent = echoText; 
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
      elements.saveStatus.textContent = "導入成功";
      setTimeout(() => elements.saveStatus.textContent = "", 2000);
      if (state.historyOpen) renderHistory();
    } catch (err) {
      alert("導入失敗：無效的 Trace 文件。");
    }
  };
  reader.readAsText(file);
}

function exportData() {
  const dataStr = JSON.stringify(state.entries, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `Trace-Export-${new Date().toISOString().split('T')[0]}.json`;
  a.click(); URL.revokeObjectURL(url);
}

function loadEntryForEdit(id) {
  const entry = state.entries.find(e => e.id === id);
  if (!entry) return;
  elements.rawMemoryInput.value = entry.content;
  state.editingId = id;
  state.draft = entry.content;
  closeHistory();
  elements.saveStatus.textContent = "正在修正記錄...";
  elements.rawMemoryInput.focus();
}

function showView(viewName) {
  elements.unlockView.classList.toggle("hidden", viewName !== "unlock");
  elements.onboardingView.classList.toggle("hidden", viewName !== "onboarding");
  elements.composeView.classList.toggle("hidden", viewName !== "compose");
  elements.globalTools.classList.toggle("hidden", viewName === "onboarding" || viewName === "unlock");
}

function openHistory() {
  state.historyOpen = true; elements.historyPanel.classList.remove("hidden");
  elements.historyPanel.setAttribute("aria-hidden", "false"); renderHistory();
}

function closeHistory() {
  state.historyOpen = false; elements.historyPanel.classList.add("hidden");
  elements.historyPanel.setAttribute("aria-hidden", "true"); elements.rawMemoryInput.focus();
}

function renderHistory() {
  elements.historyList.innerHTML = "";
  if (state.entries.length === 0) {
    elements.historyList.innerHTML = '<p style="text-align: center; margin-top: 40px; opacity: 0.5;">尚無記憶。</p>';
    return;
  }
  state.entries.forEach(entry => {
    const node = elements.historyEntryTemplate.content.firstElementChild.cloneNode(true);
    const date = new Date(entry.timestamp);
    node.querySelector(".history-time").textContent = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    node.querySelector(".history-raw-text").textContent = entry.content;
    node.style.cursor = "pointer";
    node.addEventListener("click", () => loadEntryForEdit(entry.id));
    elements.historyList.appendChild(node);
  });
}

function findMostFrequent(arr) {
  if (!arr || arr.length === 0) return null;
  const counts = arr.reduce((acc, val) => { acc[val] = (acc[val] || 0) + 1; return acc; }, {});
  return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

function detectEmotion(text) {
  const words = { "焦慮": ["慌", "壓力", "煩", "不安"], "疲憊": ["累", "困", "沒勁"], "積極": ["好", "開心", "運動"] };
  for (let [emo, triggers] of Object.entries(words)) { if (triggers.some(t => text.includes(t))) return emo; }
  return "平靜";
}

function extractKeywords(text) {
  const pool = ["工作", "睡覺", "身體", "關係", "錢", "辭職", "健身"];
  return pool.filter(w => text.includes(w));
}

init();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}