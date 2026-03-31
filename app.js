const STORAGE_KEY = "inknote-notes-v3";
const PAPER_ORDER = ["lined", "plain", "grid", "dots"];

const state = {
  notes: loadNotes(),
  selectedId: null,
  search: "",
  view: "all",
  fileMode: "all",
  settingsOpen: false,
  sidebarCollapsed: false,
  eyeMode: false,
  ambientOn: false,
};

const elements = {
  createButton: document.querySelector("#create-note-button"),
  deleteButton: document.querySelector("#delete-note-button"),
  pinButton: document.querySelector("#pin-note-button"),
  toggleSidebarButton: document.querySelector("#toggle-sidebar-button"),
  toggleEyeModeButton: document.querySelector("#toggle-eye-mode-button"),
  toggleAmbientButton: document.querySelector("#toggle-ambient-button"),
  toggleSettingsButton: document.querySelector("#toggle-settings-button"),
  searchInput: document.querySelector("#search-input"),
  noteList: document.querySelector("#note-list"),
  noteCount: document.querySelector("#note-count"),
  todayLabel: document.querySelector("#today-label"),
  titleText: document.querySelector("#editor-title-text"),
  editorMeta: document.querySelector("#editor-meta"),
  createdAt: document.querySelector("#created-at"),
  wordCount: document.querySelector("#word-count"),
  statusStrip: document.querySelector("#status-strip"),
  statusDot: document.querySelector("#status-dot"),
  statusText: document.querySelector("#status-text"),
  titleInput: document.querySelector("#note-title"),
  moodInput: document.querySelector("#note-mood"),
  tagsInput: document.querySelector("#note-tags"),
  fontInput: document.querySelector("#note-font"),
  paperInput: document.querySelector("#note-paper"),
  fileModeInput: document.querySelector("#note-file-mode"),
  ambientVolumeInput: document.querySelector("#ambient-volume"),
  noteMetaPanel: document.querySelector("#note-meta-panel"),
  contentInput: document.querySelector("#note-content"),
  paperSurface: document.querySelector("#paper-surface"),
  assetBoard: document.querySelector("#asset-board"),
  viewFilter: document.querySelector("#view-filter"),
  noteTemplate: document.querySelector("#note-item-template"),
  assetTemplate: document.querySelector("#asset-template"),
  canvas: document.querySelector("#doodle-canvas"),
  appShell: document.querySelector(".app-shell"),
  imageUploadInput: document.querySelector("#image-upload-input"),
  colorChips: document.querySelectorAll(".color-chip"),
  bottomToolButtons: document.querySelectorAll(".bottom-tool-button"),
  fileModeFilter: document.querySelector("#file-mode-filter"),
  focusTextButton: document.querySelector("#focus-text-button"),
  toggleDrawButton: document.querySelector("#toggle-draw-button"),
  insertShapeButton: document.querySelector("#insert-shape-button"),
  insertImageButton: document.querySelector("#insert-image-button"),
  dictateButton: document.querySelector("#dictate-button"),
  insertTemplateButton: document.querySelector("#insert-template-button"),
  togglePaperButton: document.querySelector("#toggle-paper-button"),
};

const canvasState = {
  context: null,
  isDrawing: false,
  isDrawMode: false,
  color: "#111111",
  size: 3,
  isErasing: false,
};

let recognition = null;
const dictationState = {
  baseValue: "",
  selectionStart: 0,
  selectionEnd: 0,
};
const ambientState = {
  audioContext: null,
  masterGain: null,
  noiseNode: null,
  filterNode: null,
};

initialize();

function initialize() {
  migrateLegacyNotes();

  if (!state.notes.length) {
    const firstNote = createNote({
      title: "今天",
      mood: "平静",
      tags: ["日记"],
      font: "hand",
      paper: "lined",
      content: "",
      assets: [createPlaceholderAsset()],
      isJournal: true,
      fileMode: "fleeting",
    });
    state.notes = [firstNote];
    state.selectedId = firstNote.id;
    persistNotes();
  } else {
    sortNotes();
    state.selectedId = state.notes[0].id;
  }

  elements.todayLabel.textContent = formatTodayLabel(new Date());
  setupCanvas();
  setupSpeechRecognition();
  bindEvents();
  render();
  setStatus("ready", "准备就绪");
  updateBottomActionState();
  updateColorSelection(canvasState.color);
}

function bindEvents() {
  elements.createButton.addEventListener("click", () => {
    const note = createNote({
      title: formatNewEntryTitle(),
      tags: ["日记"],
      paper: "lined",
      font: "hand",
      assets: [createPlaceholderAsset()],
      isJournal: true,
      fileMode: "fleeting",
    });
    state.notes.unshift(note);
    state.selectedId = note.id;
    persistNotes();
    render();
    elements.titleInput.focus();
  });

  elements.deleteButton.addEventListener("click", () => {
    if (!state.selectedId) return;
    state.notes = state.notes.filter((note) => note.id !== state.selectedId);

    if (!state.notes.length) {
      state.notes = [
        createNote({
          title: "今天",
          tags: ["日记"],
          paper: "lined",
          font: "hand",
          assets: [createPlaceholderAsset()],
          isJournal: true,
          fileMode: "fleeting",
        }),
      ];
    }

    sortNotes();
    state.selectedId = state.notes[0].id;
    persistNotes();
    render();
  });

  elements.pinButton.addEventListener("click", () => {
    const note = getSelectedNote();
    if (!note) return;
    note.isPinned = !note.isPinned;
    note.updatedAt = new Date().toISOString();
    sortNotes();
    persistNotes();
    render();
  });

  elements.toggleSidebarButton.addEventListener("click", () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    renderChrome();
  });

  elements.toggleEyeModeButton.addEventListener("click", () => {
    state.eyeMode = !state.eyeMode;
    renderChrome();
  });

  elements.toggleAmbientButton.addEventListener("click", async () => {
    if (state.ambientOn) {
      stopAmbientSound();
      setStatus("ready", "雨声已关闭");
    } else {
      await startAmbientSound();
      setStatus("ready", "雨声已开启");
    }
    renderChrome();
  });

  elements.toggleSettingsButton.addEventListener("click", () => {
    state.settingsOpen = !state.settingsOpen;
    renderSettingsPanel();
  });

  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderSidebar();
  });

  elements.viewFilter.addEventListener("click", (event) => {
    const button = event.target.closest("[data-view]");
    if (!button) return;
    state.view = button.dataset.view;
    renderSidebar();
  });

  elements.fileModeFilter.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (!button) return;
    state.fileMode = button.dataset.mode;
    renderSidebar();
  });

  elements.titleInput.addEventListener("input", handleEditorChange);
  elements.moodInput.addEventListener("change", handleEditorChange);
  elements.tagsInput.addEventListener("input", handleEditorChange);
  elements.fontInput.addEventListener("change", handleEditorChange);
  elements.paperInput.addEventListener("change", handleEditorChange);
  elements.fileModeInput.addEventListener("change", handleEditorChange);
  elements.ambientVolumeInput.addEventListener("input", () => {
    updateAmbientVolume();
  });
  elements.contentInput.addEventListener("input", handleEditorChange);

  elements.focusTextButton.addEventListener("click", () => {
    toggleDrawMode(false);
    elements.contentInput.focus();
    setStatus("ready", "文字输入模式");
  });

  elements.toggleDrawButton.addEventListener("click", () => {
    toggleDrawMode(!canvasState.isDrawMode);
    setStatus("ready", canvasState.isDrawMode ? "涂鸦模式已开启" : "涂鸦模式已关闭");
  });

  elements.insertShapeButton.addEventListener("click", () => {
    insertTextBlock("\n[重点]\n");
  });

  elements.insertImageButton.addEventListener("click", () => {
    elements.imageUploadInput.click();
  });

  elements.imageUploadInput.addEventListener("change", handleImageUpload);

  elements.dictateButton.addEventListener("click", () => {
    if (!recognition) return;
    const active = elements.dictateButton.classList.contains("active");
    if (active) {
      recognition.stop();
    } else {
      dictationState.baseValue = elements.contentInput.value;
      dictationState.selectionStart = elements.contentInput.selectionStart;
      dictationState.selectionEnd = elements.contentInput.selectionEnd;
      recognition.start();
    }
  });

  elements.insertTemplateButton.addEventListener("click", () => {
    addAsset(createPlaceholderAsset());
    setStatus("ready", "已插入占位框");
  });

  elements.togglePaperButton.addEventListener("click", () => {
    const note = getSelectedNote();
    if (!note) return;
    const next = PAPER_ORDER[(PAPER_ORDER.indexOf(note.paper) + 1) % PAPER_ORDER.length];
    note.paper = next;
    elements.paperInput.value = next;
    note.updatedAt = new Date().toISOString();
    persistNotes();
    renderEditor();
    renderSidebar();
  });

  elements.colorChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      canvasState.color = chip.dataset.color;
      canvasState.isErasing = false;
      updateColorSelection(chip.dataset.color);
      updateBottomActionState();
      setStatus("ready", "画笔颜色已切换");
    });
  });

  elements.bottomToolButtons.forEach((button) => {
    if (button.dataset.insert) {
      button.addEventListener("click", () => handleBottomInsert(button.dataset.insert));
    }
    if (button.dataset.action) {
      button.addEventListener("click", () => handleBottomAction(button.dataset.action));
    }
  });
}

function handleEditorChange() {
  const note = getSelectedNote();
  if (!note) return;

  note.title = elements.titleInput.value.trim();
  note.mood = elements.moodInput.value;
  note.tags = parseTags(elements.tagsInput.value);
  note.font = elements.fontInput.value;
  note.paper = elements.paperInput.value;
  note.fileMode = elements.fileModeInput.value;
  note.content = elements.contentInput.value;
  note.updatedAt = new Date().toISOString();
  note.isJournal = note.tags.includes("日记") || looksLikeJournal(note);

  sortNotes();
  persistNotes();
  render();
}

function handleBottomInsert(type) {
  const snippets = {
    timestamp: `\n[${formatExactTime(new Date())}] `,
    checklist: "\n- [ ] \n- [ ] \n- [ ] ",
    shape: "\n\n□ 重点区域\n\n",
  };
  insertTextBlock(snippets[type] ?? "");
}

function handleBottomAction(action) {
  if (action === "erase") {
    canvasState.isErasing = !canvasState.isErasing;
    if (canvasState.isErasing) toggleDrawMode(true);
    updateBottomActionState();
    setStatus("ready", canvasState.isErasing ? "橡皮已开启" : "橡皮已关闭");
    return;
  }

  if (action === "save-image") {
    downloadCanvas();
    setStatus("ready", "涂鸦已导出");
  }
}

function insertTextBlock(text) {
  const field = elements.contentInput;
  const start = field.selectionStart;
  const end = field.selectionEnd;
  field.setRangeText(text, start, end, "end");
  field.dispatchEvent(new Event("input"));
  field.focus();
}

function handleImageUpload(event) {
  const [file] = event.target.files;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    addAsset({
      id: createId(),
      type: "image",
      src: reader.result,
      alt: file.name,
    });
    event.target.value = "";
    setStatus("ready", "图片已插入");
  };
  reader.readAsDataURL(file);
}

function addAsset(asset) {
  const note = getSelectedNote();
  if (!note) return;
  note.assets.push(asset);
  note.updatedAt = new Date().toISOString();
  persistNotes();
  renderEditor();
  renderSidebar();
}

function removeAsset(assetId) {
  const note = getSelectedNote();
  if (!note) return;
  note.assets = note.assets.filter((asset) => asset.id !== assetId);
  note.updatedAt = new Date().toISOString();
  persistNotes();
  renderEditor();
  renderSidebar();
}

function render() {
  renderSidebar();
  renderEditor();
  renderChrome();
}

function renderSidebar() {
  const notes = getFilteredNotes();
  elements.noteList.innerHTML = "";
  elements.noteCount.textContent = `${notes.length} 篇`;

  [...elements.viewFilter.querySelectorAll("[data-view]")].forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });

  [...elements.fileModeFilter.querySelectorAll("[data-mode]")].forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === state.fileMode);
  });

  if (!notes.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "没有符合条件的记录";
    elements.noteList.appendChild(empty);
    return;
  }

  notes.forEach((note) => {
    const item = elements.noteTemplate.content.firstElementChild.cloneNode(true);
    item.classList.toggle("active", note.id === state.selectedId);
    item.querySelector(".note-title").textContent = note.title || "无标题";
    item.querySelector(".note-pin").textContent = note.isPinned ? "置顶" : "";
    item.querySelector(".note-snippet").textContent = getSnippet(note.content);
    item.querySelector(".note-mode").textContent = formatFileMode(note.fileMode ?? "fleeting");
    item.querySelector(".note-date").textContent = formatSidebarDate(note.updatedAt);
    item.querySelector(".note-mood").textContent = note.mood || "";
    item.addEventListener("click", () => {
      state.selectedId = note.id;
      render();
    });
    elements.noteList.appendChild(item);
  });
}

function renderEditor() {
  const note = getSelectedNote();
  if (!note) return;

  elements.titleText.textContent = note.title || "新的笔记";
  elements.editorMeta.textContent = `${note.isPinned ? "已置顶 · " : ""}上次编辑 ${formatMetaTime(note.updatedAt)}`;
  elements.createdAt.textContent = `创建于 ${formatFullDate(note.createdAt)}`;
  elements.wordCount.textContent = `${countCharacters(note.content)} 字`;
  elements.pinButton.classList.toggle("active", note.isPinned);
  elements.pinButton.textContent = note.isPinned ? "取消置顶" : "置顶";
  elements.titleInput.value = note.title;
  elements.moodInput.value = note.mood;
  elements.tagsInput.value = note.tags.join(", ");
  elements.fontInput.value = note.font;
  elements.paperInput.value = note.paper;
  elements.fileModeInput.value = note.fileMode ?? "fleeting";
  elements.contentInput.value = note.content;
  applyFontClass(note.font);
  applyPaperClass(note.paper);
  renderAssets(note.assets);
  loadCanvas(note.doodle);
  updateBottomActionState();
  renderSettingsPanel();
}

function renderAssets(assets) {
  elements.assetBoard.innerHTML = "";

  assets.forEach((asset) => {
    const card = elements.assetTemplate.content.firstElementChild.cloneNode(true);
    card.dataset.assetId = asset.id;
    const body = card.querySelector(".asset-body");

    if (asset.type === "placeholder") {
      card.classList.add("placeholder");
    }

    if (asset.type === "image") {
      const image = document.createElement("img");
      image.src = asset.src;
      image.alt = asset.alt || "附图";
      body.appendChild(image);
    }

    card.querySelector(".asset-remove").addEventListener("click", () => {
      removeAsset(asset.id);
    });

    elements.assetBoard.appendChild(card);
  });
}

function getFilteredNotes() {
  return state.notes.filter((note) => {
    const text = [note.title, note.content, note.tags.join(" "), note.mood].join(" ").toLowerCase();
    const matchesSearch = !state.search || text.includes(state.search);
    const matchesMode = state.fileMode === "all" || (note.fileMode ?? "fleeting") === state.fileMode;
    const matchesView =
      state.view === "all" ||
      (state.view === "pinned" && note.isPinned) ||
      (state.view === "journal" && note.isJournal);

    return matchesSearch && matchesView && matchesMode;
  });
}

function getSelectedNote() {
  return state.notes.find((note) => note.id === state.selectedId) ?? null;
}

function loadNotes() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function persistNotes() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.notes));
}

function migrateLegacyNotes() {
  if (state.notes.length) return;

  const legacyKeys = ["daybook-notes-v2", "papertrail-notes-v1"];
  for (const key of legacyKeys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      state.notes = parsed.map((note) => ({
        id: note.id ?? createId(),
        title: note.title ?? "",
        tags: Array.isArray(note.tags) ? note.tags : [],
        content: note.content ?? "",
        mood: note.mood ?? "",
        isPinned: note.isPinned ?? false,
        isJournal: note.isJournal ?? false,
        font: note.font ?? "sans",
        paper: note.paper ?? "lined",
        fileMode: note.fileMode ?? inferFileMode(note),
        doodle: note.doodle ?? "",
        assets: Array.isArray(note.assets) ? note.assets : [],
        createdAt: note.createdAt ?? new Date().toISOString(),
        updatedAt: note.updatedAt ?? new Date().toISOString(),
      }));
      persistNotes();
      return;
    } catch {
      state.notes = [];
    }
  }
}

function createNote(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title: overrides.title ?? "",
    tags: overrides.tags ?? [],
    content: overrides.content ?? "",
    mood: overrides.mood ?? "",
    isPinned: overrides.isPinned ?? false,
    isJournal: overrides.isJournal ?? true,
    font: overrides.font ?? "sans",
    paper: overrides.paper ?? "lined",
    fileMode: overrides.fileMode ?? "fleeting",
    doodle: overrides.doodle ?? "",
    assets: overrides.assets ?? [],
    createdAt: now,
    updatedAt: now,
  };
}

function createPlaceholderAsset() {
  return {
    id: createId(),
    type: "placeholder",
  };
}

function inferFileMode(note) {
  if (note.isJournal) return "fleeting";
  if ((note.tags || []).includes("项目")) return "project";
  return "lasting";
}

function formatFileMode(mode) {
  const labels = {
    fleeting: "零碎",
    lasting: "长期",
    project: "项目",
    archive: "归档",
  };
  return labels[mode] ?? "零碎";
}

function createId() {
  return `note-${crypto.randomUUID()}`;
}

function sortNotes() {
  state.notes.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return Number(b.isPinned) - Number(a.isPinned);
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
}

function parseTags(value) {
  return [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))];
}

function looksLikeJournal(note) {
  const created = new Date(note.createdAt);
  const updated = new Date(note.updatedAt);
  return created.toDateString() === updated.toDateString();
}

function countCharacters(text) {
  return text.replace(/\s+/g, "").length;
}

function getSnippet(content) {
  return content.trim() || "还没有内容";
}

function applyFontClass(font) {
  elements.contentInput.classList.remove("font-sans", "font-serif", "font-hand");
  elements.contentInput.classList.add(`font-${font}`);
}

function applyPaperClass(paper) {
  elements.paperSurface.classList.remove("paper-plain", "paper-lined", "paper-grid", "paper-dots");
  elements.paperSurface.classList.add(`paper-${paper}`);
}

function formatNewEntryTitle() {
  return `笔记 ${new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(new Date())}`;
}

function formatTodayLabel(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function formatSidebarDate(isoString) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(isoString));
}

function formatMetaTime(isoString) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoString));
}

function formatFullDate(isoString) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(isoString));
}

function formatExactTime(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function setupCanvas() {
  canvasState.context = elements.canvas.getContext("2d");
  canvasState.context.lineCap = "round";
  canvasState.context.lineJoin = "round";

  elements.canvas.addEventListener("pointerdown", startDrawing);
  elements.canvas.addEventListener("pointermove", draw);
  elements.canvas.addEventListener("pointerup", stopDrawing);
  elements.canvas.addEventListener("pointerleave", stopDrawing);
}

function toggleDrawMode(enabled) {
  canvasState.isDrawMode = enabled;
  elements.canvas.classList.toggle("drawing", enabled);
  elements.toggleDrawButton.classList.toggle("active", enabled);
  if (!enabled) {
    canvasState.isErasing = false;
    updateBottomActionState();
  }
}

function startDrawing(event) {
  if (!canvasState.isDrawMode) return;
  const point = getCanvasPoint(event);
  canvasState.isDrawing = true;
  elements.canvas.setPointerCapture(event.pointerId);
  canvasState.context.beginPath();
  canvasState.context.moveTo(point.x, point.y);
}

function draw(event) {
  if (!canvasState.isDrawing || !canvasState.isDrawMode) return;
  const point = getCanvasPoint(event);
  canvasState.context.strokeStyle = canvasState.isErasing ? "#fffefb" : canvasState.color;
  canvasState.context.lineWidth = canvasState.size;
  canvasState.context.lineTo(point.x, point.y);
  canvasState.context.stroke();
}

function stopDrawing() {
  if (!canvasState.isDrawing) return;
  canvasState.isDrawing = false;
  canvasState.context.closePath();
  saveCanvasToNote();
}

function saveCanvasToNote() {
  const note = getSelectedNote();
  if (!note) return;
  note.doodle = elements.canvas.toDataURL("image/png");
  note.updatedAt = new Date().toISOString();
  persistNotes();
  renderSidebar();
}

function loadCanvas(dataUrl) {
  clearCanvas();
  if (!dataUrl) return;

  const image = new Image();
  image.onload = () => {
    canvasState.context.drawImage(image, 0, 0, elements.canvas.width, elements.canvas.height);
  };
  image.src = dataUrl;
}

function clearCanvas() {
  canvasState.context.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
}

function getCanvasPoint(event) {
  const rect = elements.canvas.getBoundingClientRect();
  const scaleX = elements.canvas.width / rect.width;
  const scaleY = elements.canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function updateColorSelection(color) {
  elements.colorChips.forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.color === color);
  });
}

function updateBottomActionState() {
  elements.bottomToolButtons.forEach((button) => {
    if (button.dataset.action === "erase") {
      button.classList.toggle("active", canvasState.isErasing);
    }
  });
}

function downloadCanvas() {
  const link = document.createElement("a");
  link.href = elements.canvas.toDataURL("image/png");
  link.download = `${(getSelectedNote()?.title || "inknote").replace(/\s+/g, "-")}-sketch.png`;
  link.click();
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    elements.dictateButton.disabled = true;
    elements.dictateButton.title = "当前浏览器不支持语音转文字";
    setStatus("error", "当前浏览器不支持语音转文字");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "zh-CN";
  recognition.interimResults = true;
  recognition.continuous = true;

  recognition.onstart = () => {
    elements.dictateButton.classList.add("active");
    setStatus("active", "正在听你说话…");
  };

  recognition.onend = () => {
    elements.dictateButton.classList.remove("active");
    if (elements.statusStrip.classList.contains("active")) {
      setStatus("ready", "语音输入已结束");
    }
  };

  recognition.onresult = (event) => {
    let transcript = "";
    for (let index = 0; index < event.results.length; index += 1) {
      transcript += event.results[index][0].transcript;
    }

    const before = dictationState.baseValue.slice(0, dictationState.selectionStart);
    const after = dictationState.baseValue.slice(dictationState.selectionEnd);
    elements.contentInput.value = `${before}${transcript}${after}`;
    elements.contentInput.selectionStart = before.length + transcript.length;
    elements.contentInput.selectionEnd = before.length + transcript.length;
    elements.contentInput.dispatchEvent(new Event("input"));
    setStatus("active", transcript ? `识别中：${transcript.slice(-16)}` : "正在听你说话…");
  };

  recognition.onerror = (event) => {
    elements.dictateButton.classList.remove("active");
    setStatus("error", `语音不可用：${formatSpeechError(event.error)}`);
  };
}

function renderSettingsPanel() {
  elements.noteMetaPanel.classList.toggle("hidden", !state.settingsOpen);
  elements.toggleSettingsButton.classList.toggle("active", state.settingsOpen);
  elements.toggleSettingsButton.textContent = state.settingsOpen ? "收起设置" : "设置";
}

function renderChrome() {
  elements.appShell.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
  document.body.classList.toggle("eye-mode", state.eyeMode);
  elements.toggleSidebarButton.classList.toggle("active", state.sidebarCollapsed);
  elements.toggleSidebarButton.textContent = state.sidebarCollapsed ? "展开侧栏" : "收起侧栏";
  elements.toggleEyeModeButton.classList.toggle("active", state.eyeMode);
  elements.toggleEyeModeButton.textContent = state.eyeMode ? "关闭护眼" : "护眼";
  elements.toggleAmbientButton.classList.toggle("active", state.ambientOn);
  elements.toggleAmbientButton.textContent = state.ambientOn ? "关闭雨声" : "雨声";
}

function setStatus(type, text) {
  elements.statusText.textContent = text;
  elements.statusStrip.classList.toggle("active", type === "active");
  elements.statusStrip.classList.toggle("error", type === "error");
}

function formatSpeechError(code) {
  const map = {
    "not-allowed": "麦克风权限未允许",
    "service-not-allowed": "浏览器限制了语音服务",
    "no-speech": "没有识别到语音",
    "audio-capture": "没有可用麦克风",
    aborted: "语音已中断",
  };
  return map[code] ?? "当前环境不支持";
}

async function startAmbientSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  if (!ambientState.audioContext) {
    ambientState.audioContext = new AudioContextClass();
    ambientState.masterGain = ambientState.audioContext.createGain();
    ambientState.filterNode = ambientState.audioContext.createBiquadFilter();
    ambientState.filterNode.type = "lowpass";
    ambientState.filterNode.frequency.value = 1100;
    ambientState.filterNode.Q.value = 0.4;

    const bufferSize = ambientState.audioContext.sampleRate * 2;
    const noiseBuffer = ambientState.audioContext.createBuffer(1, bufferSize, ambientState.audioContext.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let index = 0; index < bufferSize; index += 1) {
      data[index] = (Math.random() * 2 - 1) * 0.28;
    }

    ambientState.noiseNode = ambientState.audioContext.createBufferSource();
    ambientState.noiseNode.buffer = noiseBuffer;
    ambientState.noiseNode.loop = true;
    ambientState.noiseNode.connect(ambientState.filterNode);
    ambientState.filterNode.connect(ambientState.masterGain);
    ambientState.masterGain.connect(ambientState.audioContext.destination);
    ambientState.noiseNode.start();
  }

  if (ambientState.audioContext.state === "suspended") {
    await ambientState.audioContext.resume();
  }

  state.ambientOn = true;
  updateAmbientVolume();
}

function stopAmbientSound() {
  if (ambientState.masterGain) {
    ambientState.masterGain.gain.value = 0;
  }
  state.ambientOn = false;
}

function updateAmbientVolume() {
  if (!ambientState.masterGain) return;
  const volume = Number(elements.ambientVolumeInput.value) / 100;
  ambientState.masterGain.gain.value = state.ambientOn ? volume * 0.18 : 0;
}
