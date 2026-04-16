/* eslint-disable no-alert */
const STORAGE_KEY = "task_manager_tasks_v1";

/** @type {{id: string, text: string, completed: boolean, createdAt: number}[]} */
let tasks = [];

const els = {
  taskForm: document.getElementById("taskForm"),
  taskInput: document.getElementById("taskInput"),
  taskList: document.getElementById("taskList"),
  filter: document.getElementById("filter"),
  clearCompleted: document.getElementById("clearCompleted"),
  stats: document.getElementById("stats"),
  taskStatus: document.getElementById("taskStatus"),
  emptyState: document.getElementById("emptyState"),
};

function safeParseTasks(raw) {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter((t) => t && typeof t === "object")
      .map((t) => ({
        id: typeof t.id === "string" ? t.id : uid(),
        text: typeof t.text === "string" ? t.text : "",
        completed: Boolean(t.completed),
        createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
      }))
      .filter((t) => t.text.trim().length > 0);
  } catch {
    return [];
  }
}

function loadTasks() {
  tasks = safeParseTasks(localStorage.getItem(STORAGE_KEY));
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function uid() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return `t_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function announce(message) {
  // Screen-reader friendly updates.
  els.taskStatus.textContent = "";
  window.setTimeout(() => {
    els.taskStatus.textContent = message;
  }, 50);
}

function getFilteredTasks() {
  const mode = els.filter.value;
  const list = tasks.slice().sort((a, b) => a.createdAt - b.createdAt);
  if (mode === "active") return list.filter((t) => !t.completed);
  if (mode === "completed") return list.filter((t) => t.completed);
  return list;
}

function render() {
  const filtered = getFilteredTasks();
  els.taskList.innerHTML = "";

  const activeCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.length - activeCount;
  els.stats.textContent = `${activeCount} active • ${completedCount} completed`;

  const showEmpty = filtered.length === 0;
  els.emptyState.hidden = !showEmpty;

  for (const task of filtered) {
    const li = document.createElement("li");
    li.className = `task${task.completed ? " completed" : ""}`;

    const checkboxId = `task_cb_${task.id}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = checkboxId;
    checkbox.checked = task.completed;
    checkbox.addEventListener("change", () => {
      task.completed = checkbox.checked;
      saveTasks();
      render();
      announce(task.completed ? "Marked complete" : "Marked active");
    });

    const textWrap = document.createElement("div");
    textWrap.className = "text";
    textWrap.textContent = task.text;

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => editTask(task.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "danger";
    deleteBtn.addEventListener("click", () => deleteTask(task.id));

    // Layout: checkbox, text, actions.
    li.appendChild(checkbox);
    li.appendChild(textWrap);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    li.appendChild(actions);

    els.taskList.appendChild(li);
  }
}

function addTask(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  tasks.push({
    id: uid(),
    text: trimmed,
    completed: false,
    createdAt: Date.now(),
  });

  saveTasks();
  render();
  announce("Task added");
}

function deleteTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  const ok = window.confirm(`Delete "${task.text}"?`);
  if (!ok) return;

  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  render();
  announce("Task deleted");
}

function editTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  const next = window.prompt("Edit task:", task.text);
  if (next === null) return; // Cancel

  const trimmed = next.trim();
  if (!trimmed) return; // Keep original if blank.

  task.text = trimmed;
  saveTasks();
  render();
  announce("Task updated");
}

function clearCompleted() {
  const before = tasks.length;
  tasks = tasks.filter((t) => !t.completed);
  const removed = before - tasks.length;
  if (removed > 0) {
    saveTasks();
    render();
    announce("Cleared completed tasks");
  }
}

function init() {
  loadTasks();
  render();

  els.taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    addTask(els.taskInput.value);
    els.taskInput.value = "";
    els.taskInput.focus();
  });

  els.filter.addEventListener("change", () => render());
  els.clearCompleted.addEventListener("click", clearCompleted);
}

init();

