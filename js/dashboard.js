import { initNavbar } from "./navbar.js";
import { dateFromInput, escapeHTML, formatDate, getDaysRemaining, loadData, saveData } from "./utils.js";

const data = loadData();
const completionTimers = new Map();
const formatTime = (value) => value ? new Date(`1970-01-01T${value}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";

function timeLabel(date) {
  if (!date) return "No date";
  const days = getDaysRemaining(date);
  return days < 0 ? `${Math.abs(days)} days ago` : days === 0 ? "Today" : `${days} days left`;
}

function statusClass(date) {
  if (!date) return "";
  const days = getDaysRemaining(date);
  return days < 0 ? "danger" : days <= 3 ? "warning" : "";
}

function widget(targetId, items, title, detail, collection) {
  const target = document.getElementById(targetId);
  target.innerHTML = items.length
    ? items.slice(0, 4).map((item) => `<div class="list-item"><div><p class="item-title">${escapeHTML(title(item))}</p><p class="item-meta">${detail(item)}</p></div><div class="item-actions"><span class="badge ${statusClass(item.date)}">${timeLabel(item.date)}</span><button type="button" class="secondary reminder-check-button" data-complete-collection="${collection}" data-complete-id="${item.id}" aria-label="Mark as done" title="Mark as done"></button></div></div>`).join("")
    : `<div class="empty-state">Nothing yet</div>`;

  target.querySelectorAll("[data-complete-id]").forEach((button) => {
    button.addEventListener("click", () => completeItem(button.dataset.completeCollection, button.dataset.completeId, button.closest(".list-item"), button));
  });
}

function completeItem(collection, id, listItem, button) {
  const timerKey = `${collection}:${id}`;

  if (completionTimers.has(timerKey)) {
    window.clearTimeout(completionTimers.get(timerKey));
    completionTimers.delete(timerKey);
    button.textContent = "";
    button.classList.remove("is-completing");
    button.setAttribute("aria-label", "Mark reminder as done");
    button.title = "Mark as done";
    listItem.classList.remove("reminder-completing");
    return;
  }

  button.textContent = "";
  button.classList.add("is-completing");
  button.setAttribute("aria-label", "Marked as done");
  button.title = "Undo completion";
  listItem.classList.add("reminder-completing");

  completionTimers.set(timerKey, window.setTimeout(() => {
    completionTimers.delete(timerKey);
    data[collection] = data[collection].map((item) => item.id === id ? { ...item, completed: true } : item);
    saveData(data);
    render();
  }, 1000));
}

function render() {
  const incompleteAssignments = data.assignments.filter((assignment) => !assignment.completed).length;
  const upcomingTests = data.tests.filter((test) => !test.completed && getDaysRemaining(test.date) >= 0).length;
  const activePersonalReminders = data.personalReminders.filter((reminder) => !reminder.completed).length;
  const completedItems = [...data.assignments, ...data.tests, ...data.personalReminders]
    .filter((item) => item.completed).length;
  document.getElementById("totalTasksStat").textContent = incompleteAssignments;
  document.getElementById("completedTasksStat").textContent = completedItems;
  document.getElementById("upcomingExamsStat").textContent = upcomingTests;
  document.getElementById("personalRemindersStat").textContent = activePersonalReminders;

  widget("dashboardAssignments", data.assignments.filter((assignment) => !assignment.completed).sort((a, b) => dateFromInput(a.date) - dateFromInput(b.date)), (assignment) => assignment.lesson, (assignment) => `${assignment.title ? `${escapeHTML(assignment.title)} · ` : ""}Due ${formatDate(assignment.date)}${assignment.time ? ` at ${formatTime(assignment.time)}` : ""}`, "assignments");
  widget("dashboardTests", data.tests.filter((test) => !test.completed && getDaysRemaining(test.date) >= 0).sort((a, b) => dateFromInput(a.date) - dateFromInput(b.date)), (test) => test.lesson, (test) => `${test.description ? `${escapeHTML(test.description)} · ` : ""}${formatDate(test.date)}`, "tests");
  widget("dashboardReminders", data.personalReminders.filter((reminder) => !reminder.completed).sort((a, b) => (a.date || "9999-12-31").localeCompare(b.date || "9999-12-31")), (reminder) => reminder.title, (reminder) => `${escapeHTML(reminder.type)}${reminder.date ? ` · ${formatDate(reminder.date)}` : ""}`, "personalReminders");
}

function init() {
  initNavbar();
  document.getElementById("todayText").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  render();
}

init();
