// 核心修改：数据库名称和导出名称已全面更新为 Trace
const DB_NAME = "TraceCognitionDB";
const STORE_NAME = "entries";
const DRAFT_KEY = "trace-draft-v1";

const elements = {
  globalTools: document.getElementById("global-tools"),
  exportBtn: document.getElementById("export-data-btn"),
  historyToggle: document.getElementById("history-toggle"),
  onboardingView: document.getElementById("onboarding-view"),
  enterWritingBtn: document.getElementById("enter-writing-btn"),
  composeView: document.getElementById("compose-view"),
  systemEchoPanel: document.getElementById("system-echo-panel"),
  rawMemoryInput: document.getElementById("raw-memory-input"),
  saveStatus: document.getElementById("save-status"),
  saveEntryBtn: document.getElementById("save-entry-btn"),
  historyPanel: document.getElementById("history-panel"),
  historyList: document.getElementById("history-list"),
  closeHistoryBtn: document.getElementById("close-history-btn"),
  historyEntryTemplate: document.getElementById("history-entry-template")
};

let state = { entries: [], draft: localStorage.getItem(DRAFT_KEY) || "", historyOpen: false };
let implicitSession = { startMs: null, backspaceCount: 0 };

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playMuffledThud() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'triangle'; 
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
  
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

  osc.start(now);
  osc.stop(now + 0.2);
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

async function bootstrap() {
  setAmbientLight();
  setInterval(setAmbientLight, 60000 * 30); 

  await db.init();
  state.entries = await db.getAll();
  elements.rawMemoryInput.value = state.draft;
  bindEvents();
  
  if (state.entries.length === 0) showView("onboarding");
  else { showView("compose"); checkSystemEcho(); }
}

function bindEvents() {
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
  elements.historyToggle.addEventListener("click", openHistory);
  elements.closeHistoryBtn.addEventListener("click", closeHistory);
  elements.exportBtn.addEventListener("click", exportData);
}

async function submitEntry() {
  const content = elements.rawMemoryInput.value.trim();
  if (!content) return;

  const durationSec = implicitSession.startMs ? Math.round((Date.now() - implicitSession.startMs) / 1000) : 0;
  const friction = implicitSession.backspaceCount;
  implicitSession = { startMs: null, backspaceCount: 0 }; 

  playMuffledThud();
  elements.rawMemoryInput.classList.add("ink-dissolve");
  document.body.classList.remove("focus-mode");

  const now = new Date();
  const hour = now.getHours();
  let timePhase = hour < 5 || hour >= 23 ? "深夜" : (hour < 10 ? "清晨" : "日间");

  const entry = {
    id: `mem-${now.getTime()}`,
    content: content,
    timestamp: now.toISOString(),
    context: { durationSec, friction, timePhase },
    tags: {} 
  };

  await db.put(entry);
  state.entries.unshift(entry);

  setTimeout(() => {
    elements.rawMemoryInput.value = "";
    elements.rawMemoryInput.classList.remove("ink-dissolve");
    state.draft = "";
    localStorage.removeItem(DRAFT_KEY);
    
    elements.saveStatus.textContent = "已封存";
    setTimeout(() => elements.saveStatus.textContent = "", 2000);

    silentAnalyze(entry);
    checkSystemEcho(); 
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
    echoText = repeatedNight ? `你关于“${repeatedNight}”的记录，绝大多数发生在深夜。` : `你最近习惯在深夜系统性地吐露。`;
  } else if (highFrictionEntries.length >= 3) {
    echoText = `系统监测到，你在记录最近的几个想法时，伴随着高频的删改。`;
  } else if (recentEntries.length >= 5) {
    const allKeywords = recentEntries.flatMap(e => e.tags.keywords || []);
    const repeated = findMostFrequent(allKeywords);
    if (repeated && allKeywords.filter(k => k === repeated).length >= 3) {
      echoText = `最近的系统切面里，反复出现了“${repeated}”。`;
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

function exportData() {
  const dataStr = JSON.stringify(state.entries, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `Trace-Export-${new Date().toISOString().split('T')[0]}.json`;
  a.click(); URL.revokeObjectURL(url);
}

function showView(viewName) {
  elements.onboardingView.classList.toggle("hidden", viewName !== "onboarding");
  elements.composeView.classList.toggle("hidden", viewName !== "compose");
  elements.globalTools.classList.toggle("hidden", viewName === "onboarding");
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
    elements.historyList.innerHTML = '<p style="color: var(--text-ghost); font-size: 0.9rem; text-align: center; margin-top: 40px;">系统暂无封存的记忆。</p>';
    return;
  }

  state.entries.forEach(entry => {
    const node = elements.historyEntryTemplate.content.firstElementChild.cloneNode(true);
    const date = new Date(entry.timestamp);
    node.querySelector(".history-time").textContent = `${date.getMonth()+1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    if (entry.context?.friction > 5) {
      const frictionNode = node.querySelector(".history-friction");
      frictionNode.textContent = "• 重度斟酌"; frictionNode.classList.remove("hidden");
    }
    node.querySelector(".history-raw-text").textContent = entry.content;
    elements.historyList.appendChild(node);
  });
}

function findMostFrequent(arr) {
  if (!arr || arr.length === 0) return null;
  const counts = arr.reduce((acc, val) => { acc[val] = (acc[val] || 0) + 1; return acc; }, {});
  return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

function detectEmotion(text) {
  const words = { "焦虑": ["慌", "压力", "烦", "不安"], "疲惫": ["累", "困", "没劲"], "积极": ["好", "开心", "运动"] };
  for (let [emo, triggers] of Object.entries(words)) { if (triggers.some(t => text.includes(t))) return emo; }
  return "平静";
}
function extractKeywords(text) {
  const pool = ["工作", "睡觉", "身体", "关系", "钱", "辞职", "健身"];
  return pool.filter(w => text.includes(w));
}

bootstrap();

// 注册 Service Worker 让系统具备离线与安装能力
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        console.log('Trace 物理容器已启动:', registration.scope);
      })
      .catch(error => {
        console.log('容器启动失败:', error);
      });
  });
}