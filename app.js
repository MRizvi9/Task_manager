/* eslint-disable no-alert */
const API_BASE = "";

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

async function apiRequest(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let details = "";
    try {
      const data = await res.json();
      details = data?.error ? String(data.error) : JSON.stringify(data);
    } catch {
      try {
        details = await res.text();
      } catch {
        details = "";
      }
    }
    throw new Error(details || `Request failed (${res.status})`);
  }

  if (res.status === 204) return null;
  return res.json();
}

function announce(message) {
  // Screen-reader friendly updates.
  els.taskStatus.textContent = "";
  window.setTimeout(() => {
    els.taskStatus.textContent = message;
  }, 50);
}

async function refreshTasks() {
  tasks = await apiRequest("GET", "/api/tasks");
  render();
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
    checkbox.addEventListener("change", async () => {
      try {
        await apiRequest("PATCH", `/api/tasks/${encodeURIComponent(task.id)}`, {
          completed: checkbox.checked,
        });
        await refreshTasks();
        announce(checkbox.checked ? "Marked complete" : "Marked active");
      } catch (err) {
        console.error(err);
        announce("Update failed");
      }
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

async function addTask(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  await apiRequest("POST", "/api/tasks", { text: trimmed });
  await refreshTasks();
  announce("Task added");
}

async function deleteTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  const ok = window.confirm(`Delete "${task.text}"?`);
  if (!ok) return;

  await apiRequest("DELETE", `/api/tasks/${encodeURIComponent(id)}`);
  await refreshTasks();
  announce("Task deleted");
}

async function editTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  const next = window.prompt("Edit task:", task.text);
  if (next === null) return; // Cancel

  const trimmed = next.trim();
  if (!trimmed) return; // Keep original if blank.

  await apiRequest("PUT", `/api/tasks/${encodeURIComponent(id)}`, { text: trimmed });
  await refreshTasks();
  announce("Task updated");
}

async function clearCompleted() {
  try {
    const result = await apiRequest("DELETE", "/api/tasks/completed");
    await refreshTasks();
    const removed = result?.removed ?? 0;
    if (removed > 0) announce("Cleared completed tasks");
  } catch (err) {
    console.error(err);
    announce("Clear failed");
  }
}

async function init() {
  els.taskForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await addTask(els.taskInput.value);
      els.taskInput.value = "";
      els.taskInput.focus();
    } catch (err) {
      console.error(err);
      announce("Add failed");
    }
  });

  els.filter.addEventListener("change", () => render());
  els.clearCompleted.addEventListener("click", clearCompleted);

  try {
    await refreshTasks();
  } catch (err) {
    console.error(err);
    announce("Could not load tasks");
  }
}

init();

