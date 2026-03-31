const STORAGE_KEY = "daybook-notes-v2";

const state = {
  notes: loadNotes(),
  selectedId: null,
  search: "",
  view: "all",
};

const elements = {
  createButton: document.querySelector("#create-note-button"),
  deleteButton: document.querySelector("#delete-note-button"),
  pinButton: document.querySelector("#pin-note-button"),
  searchInput: document.querySelector("#search-input"),
  noteList: document.querySelector("#note-list"),
  noteCount: document.querySelector("#note-count"),
  todayLabel: document.querySelector("#today-label"),
  titleText: document.querySelector("#editor-title-text"),
  editorMeta: document.querySelector("#editor-meta"),
  createdAt: document.querySelector("#created-at"),
  wordCount: document.querySelector("#word-count"),
  titleInput: document.querySelector("#note-title"),
  moodInput: document.querySelector("#note-mood"),
  tagsInput: document.querySelector("#note-tags"),
  contentInput: document.querySelector("#note-content"),
  viewFilter: document.querySelector("#view-filter"),
  noteTemplate: document.querySelector("#note-item-template"),
  toolButtons: document.querySelectorAll(".tool-button"),
};

initialize();

function initialize() {
  migrateLegacyNotes();

  if (!state.notes.length) {
    const firstNote = createNote({
      title: "今天",
      mood: "平静",
      tags: ["日记"],
      content: "写一点今天发生的事。\n\n也可以记一个待办清单，或者一句突然想到的话。",
      isJournal: true,
    });
    state.notes = [firstNote];
    state.selectedId = firstNote.id;
    persistNotes();
  } else {
    sortNotes();
    state.selectedId = state.notes[0].id;
  }

  elements.todayLabel.textContent = formatTodayLabel(new Date());
  bindEvents();
  render();
}

function bindEvents() {
  elements.createButton.addEventListener("click", () => {
    const note = createNote({
      title: formatNewEntryTitle(),
      tags: ["日记"],
      isJournal: true,
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
      const note = createNote({ title: "今天", tags: ["日记"], isJournal: true });
      state.notes = [note];
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

  elements.titleInput.addEventListener("input", handleEditorChange);
  elements.moodInput.addEventListener("change", handleEditorChange);
  elements.tagsInput.addEventListener("input", handleEditorChange);
  elements.contentInput.addEventListener("input", handleEditorChange);

  elements.toolButtons.forEach((button) => {
    button.addEventListener("click", () => insertSnippet(button.dataset.insert));
  });
}

function handleEditorChange() {
  const note = getSelectedNote();
  if (!note) return;

  note.title = elements.titleInput.value.trim();
  note.mood = elements.moodInput.value;
  note.tags = parseTags(elements.tagsInput.value);
  note.content = elements.contentInput.value;
  note.updatedAt = new Date().toISOString();
  note.isJournal = note.tags.includes("日记") || looksLikeJournal(note);

  sortNotes();
  persistNotes();
  render();
}

function insertSnippet(type) {
  const field = elements.contentInput;
  const note = getSelectedNote();
  if (!note) return;

  const snippets = {
    timestamp: `\n[${formatExactTime(new Date())}] `,
    checklist: "\n- [ ] \n- [ ] \n- [ ] ",
    divider: "\n\n----------------\n\n",
  };

  const insertText = snippets[type] ?? "";
  const start = field.selectionStart;
  const end = field.selectionEnd;
  field.setRangeText(insertText, start, end, "end");
  field.dispatchEvent(new Event("input"));
  field.focus();
}

function render() {
  renderSidebar();
  renderEditor();
}

function renderSidebar() {
  const notes = getFilteredNotes();
  elements.noteList.innerHTML = "";
  elements.noteCount.textContent = `${notes.length} 篇`;

  [...elements.viewFilter.querySelectorAll("[data-view]")].forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
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

  elements.titleText.textContent = note.title || "新的日记";
  elements.editorMeta.textContent = `${note.isPinned ? "已置顶 · " : ""}上次编辑 ${formatMetaTime(note.updatedAt)}`;
  elements.createdAt.textContent = `创建于 ${formatFullDate(note.createdAt)}`;
  elements.wordCount.textContent = `${countCharacters(note.content)} 字`;
  elements.pinButton.classList.toggle("active", note.isPinned);
  elements.pinButton.textContent = note.isPinned ? "取消置顶" : "置顶";
  elements.titleInput.value = note.title;
  elements.moodInput.value = note.mood;
  elements.tagsInput.value = note.tags.join(", ");
  elements.contentInput.value = note.content;
}

function getFilteredNotes() {
  return state.notes.filter((note) => {
    const text = [note.title, note.content, note.tags.join(" "), note.mood].join(" ").toLowerCase();
    const matchesSearch = !state.search || text.includes(state.search);
    const matchesView =
      state.view === "all" ||
      (state.view === "pinned" && note.isPinned) ||
      (state.view === "journal" && note.isJournal);

    return matchesSearch && matchesView;
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

  try {
    const legacy = window.localStorage.getItem("papertrail-notes-v1");
    if (!legacy) return;

    const parsed = JSON.parse(legacy);
    state.notes = parsed.map((note) => ({
      id: note.id ?? `note-${crypto.randomUUID()}`,
      title: note.title ?? "",
      tags: Array.isArray(note.tags) ? note.tags : [],
      content: note.content ?? "",
      mood: "",
      isPinned: false,
      isJournal: Array.isArray(note.tags) ? note.tags.includes("日记") : false,
      createdAt: note.createdAt ?? new Date().toISOString(),
      updatedAt: note.updatedAt ?? new Date().toISOString(),
    }));
    persistNotes();
  } catch {
    state.notes = [];
  }
}

function createNote(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: `note-${crypto.randomUUID()}`,
    title: overrides.title ?? "",
    tags: overrides.tags ?? [],
    content: overrides.content ?? "",
    mood: overrides.mood ?? "",
    isPinned: overrides.isPinned ?? false,
    isJournal: overrides.isJournal ?? true,
    createdAt: now,
    updatedAt: now,
  };
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

function formatNewEntryTitle() {
  return `日记 ${new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
  }).format(new Date())}`;
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
