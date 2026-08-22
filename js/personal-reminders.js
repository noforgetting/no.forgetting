import { initNavbar } from "./navbar.js";
import { createId, dateFromInput, escapeHTML, formatDate, getDaysRemaining, isOverdue, loadData, saveData } from "./utils.js";

const form = document.getElementById("personalReminderForm");
const title = document.getElementById("personalReminderTitle");
const type = document.getElementById("personalReminderType");
const date = document.getElementById("personalReminderDate");
const list = document.getElementById("personalReminderList");
let data = loadData();

function render() {
  const items = [...data.personalReminders].sort((a, b) => (a.date || "9999-12-31").localeCompare(b.date || "9999-12-31"));

  list.innerHTML = items.length ? items.map((reminder) => {
    const hasDate = Boolean(reminder.date);
    const overdue = hasDate && isOverdue(reminder);
    const days = hasDate ? getDaysRemaining(reminder.date) : null;
    const label = reminder.completed ? "Done" : overdue ? "Overdue" : days === null ? "No date" : days === 0 ? "Today" : `${days} days left`;
    const style = reminder.completed ? "success" : overdue ? "danger" : days !== null && days <= 3 ? "warning" : "";

    return `<div class="list-item ${reminder.completed ? "completed" : ""} ${overdue ? "overdue" : ""}"><div><p class="item-title">${escapeHTML(reminder.title)} <span class="badge">${escapeHTML(reminder.type)}</span> <span class="badge ${style}">${label}</span></p><p class="item-meta">${hasDate ? formatDate(reminder.date) : "No date"}</p></div><div class="item-actions"><button class="secondary" data-toggle="${reminder.id}">${reminder.completed ? "Undo" : "Done"}</button><button class="ghost" data-delete="${reminder.id}">Delete</button></div></div>`;
  }).join("") : `<div class="empty-state">No personal reminders yet</div>`;

  document.querySelectorAll("[data-toggle]").forEach((button) => {
    button.onclick = () => {
      data.personalReminders = data.personalReminders.map((reminder) => reminder.id === button.dataset.toggle ? { ...reminder, completed: !reminder.completed } : reminder);
      saveData(data);
      render();
    };
  });

  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.onclick = () => {
      if (confirm("Delete this reminder?")) {
        data.personalReminders = data.personalReminders.filter((reminder) => reminder.id !== button.dataset.delete);
        saveData(data);
        render();
      }
    };
  });
}

form.onsubmit = (event) => {
  event.preventDefault();
  if (!title.value.trim()) return alert("Please add a title.");
  data.personalReminders.push({ id: createId(), title: title.value.trim(), type: type.value, date: date.value, completed: false });
  saveData(data);
  form.reset();
  render();
};

initNavbar();
render();
