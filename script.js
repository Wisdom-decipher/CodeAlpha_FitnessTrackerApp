// ---------- Storage keys ----------
const LOG_KEY = "fitnessLogs";
const GOAL_KEY = "stepGoal";
const DEFAULT_GOAL = 10000;

// ---------- State ----------
let logs = loadLogs();
let editingId = null;
let chart = null;

// ---------- Elements ----------
const todaySteps = document.getElementById("todaySteps");
const todayMinutes = document.getElementById("todayMinutes");
const todayCalories = document.getElementById("todayCalories");
const streakCount = document.getElementById("streakCount");
const stepGoalInput = document.getElementById("stepGoalInput");
const stepProgressBar = document.getElementById("stepProgressBar");
const stepProgressLabel = document.getElementById("stepProgressLabel");

const logForm = document.getElementById("logForm");
const editIdInput = document.getElementById("editId");
const dateInput = document.getElementById("dateInput");
const typeInput = document.getElementById("typeInput");
const stepsInput = document.getElementById("stepsInput");
const durationInput = document.getElementById("durationInput");
const caloriesInput = document.getElementById("caloriesInput");
const formTitle = document.getElementById("formTitle");
const saveBtn = document.getElementById("saveBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const logList = document.getElementById("logList");
const emptyLog = document.getElementById("emptyLog");
const clearAllBtn = document.getElementById("clearAllBtn");
const darkModeToggle = document.getElementById("darkModeToggle");

// ---------- Storage helpers ----------
function loadLogs() {
  const saved = localStorage.getItem(LOG_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveLogs() {
  localStorage.setItem(LOG_KEY, JSON.stringify(logs));
}

function loadGoal() {
  return Number(localStorage.getItem(GOAL_KEY)) || DEFAULT_GOAL;
}

function saveGoal(goal) {
  localStorage.setItem(GOAL_KEY, goal);
}

// ---------- Date helpers ----------
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function lastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function getNextId() {
  return logs.length ? Math.max(...logs.map(l => l.id)) + 1 : 1;
}

// ---------- Dashboard calculations ----------
function getTodayTotals() {
  const todays = logs.filter(l => l.date === todayStr());
  return {
    steps: todays.reduce((sum, l) => sum + (Number(l.steps) || 0), 0),
    minutes: todays.reduce((sum, l) => sum + (Number(l.duration) || 0), 0),
    calories: todays.reduce((sum, l) => sum + (Number(l.calories) || 0), 0),
  };
}

function getStreak() {
  const datesWithLogs = new Set(logs.map(l => l.date));
  let streak = 0;
  let cursor = new Date();
  while (datesWithLogs.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getWeeklyCalories() {
  const days = lastNDays(7);
  return days.map(day => ({
    day,
    total: logs.filter(l => l.date === day).reduce((sum, l) => sum + (Number(l.calories) || 0), 0),
  }));
}

// ---------- Rendering ----------
function renderDashboard() {
  const totals = getTodayTotals();
  todaySteps.textContent = totals.steps.toLocaleString();
  todayMinutes.textContent = totals.minutes;
  todayCalories.textContent = totals.calories;
  streakCount.textContent = getStreak();

  const goal = loadGoal();
  stepGoalInput.value = goal;
  const pct = Math.min(100, Math.round((totals.steps / goal) * 100));
  stepProgressBar.style.width = `${pct}%`;
  stepProgressLabel.textContent = `${totals.steps.toLocaleString()} / ${goal.toLocaleString()} steps`;
}

function renderChart() {
    if (typeof chart === "undefined") return;
  const weekly = getWeeklyCalories();
  const labels = weekly.map(w => new Date(w.day).toLocaleDateString(undefined, { weekday: "short" }));
  const data = weekly.map(w => w.total);

  const ctx = document.getElementById("weeklyChart");
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Calories", data, backgroundColor: "#059669", borderRadius: 6 }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

function renderList() {
  if (logs.length === 0) {
    emptyLog.hidden = false;
    logList.innerHTML = "";
    clearAllBtn.hidden = true;
    return;
  }
  emptyLog.hidden = true;
  clearAllBtn.hidden = false;

  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  logList.innerHTML = sorted.map(log => `
    <li>
      <div class="list-item-text">
        <strong>${log.type} — ${log.date}</strong>
        <span>${log.duration} min · ${log.calories} cal${log.steps ? ` · ${log.steps} steps` : ""}</span>
      </div>
      <div class="list-item-actions">
        <button class="edit-btn" data-id="${log.id}" title="Edit">✏️</button>
        <button class="delete-btn" data-id="${log.id}" title="Delete">🗑</button>
      </div>
    </li>
  `).join("");
}

function renderAll() {
  renderDashboard();
  renderChart();
  renderList();
}

// ---------- Form (Add / Edit) ----------
logForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const entry = {
    date: dateInput.value,
    type: typeInput.value,
    steps: stepsInput.value ? Number(stepsInput.value) : 0,
    duration: Number(durationInput.value),
    calories: Number(caloriesInput.value),
  };

  if (editingId) {
    const log = logs.find(l => l.id === Number(editingId));
    Object.assign(log, entry);
    exitEditMode();
  } else {
    logs.push({ id: getNextId(), ...entry });
  }

  saveLogs();
  logForm.reset();
  dateInput.value = todayStr();
  renderAll();
});

function enterEditMode(id) {
  const log = logs.find(l => l.id === id);
  if (!log) return;
  editingId = id;
  editIdInput.value = id;
  dateInput.value = log.date;
  typeInput.value = log.type;
  stepsInput.value = log.steps || "";
  durationInput.value = log.duration;
  caloriesInput.value = log.calories;
  formTitle.textContent = "Edit activity";
  saveBtn.textContent = "Save Changes";
  cancelEditBtn.hidden = false;
  dateInput.scrollIntoView({ behavior: "smooth", block: "center" });
}

function exitEditMode() {
  editingId = null;
  editIdInput.value = "";
  formTitle.textContent = "Log an activity";
  saveBtn.textContent = "Add Entry";
  cancelEditBtn.hidden = true;
  logForm.reset();
  dateInput.value = todayStr();
}

cancelEditBtn.addEventListener("click", exitEditMode);

function deleteLog(id) {
  const confirmed = window.confirm("Delete this activity entry? This cannot be undone.");
  if (!confirmed) return;
  logs = logs.filter(l => l.id !== id);
  if (editingId === id) exitEditMode();
  saveLogs();
  renderAll();
}

logList.addEventListener("click", (e) => {
  const editBtn = e.target.closest(".edit-btn");
  const deleteBtn = e.target.closest(".delete-btn");
  if (editBtn) enterEditMode(Number(editBtn.dataset.id));
  if (deleteBtn) deleteLog(Number(deleteBtn.dataset.id));
});

// ---------- Step goal ----------
stepGoalInput.addEventListener("change", () => {
  const goal = Number(stepGoalInput.value) || DEFAULT_GOAL;
  saveGoal(goal);
  renderDashboard();
});

// ---------- Clear all ----------
clearAllBtn.addEventListener("click", () => {
  const confirmed = window.confirm("This will permanently delete ALL logged activities. Continue?");
  if (!confirmed) return;
  logs = [];
  saveLogs();
  renderAll();
});

// ---------- Dark mode ----------
function applySavedTheme() {
  const theme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", theme);
  darkModeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
}

darkModeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  darkModeToggle.textContent = next === "dark" ? "☀️" : "🌙";
  renderChart();
});

// ---------- Init ----------
dateInput.value = todayStr();
applySavedTheme();
renderAll();