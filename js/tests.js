import { initNavbar } from "./navbar.js";
import { createId, dateFromInput, escapeHTML, formatDate, getDaysRemaining, isOverdue, loadData, saveData } from "./utils.js";

const form = document.getElementById("testForm");
const lesson = document.getElementById("testLesson");
const description = document.getElementById("testDescription");
const date = document.getElementById("testDate");
const list = document.getElementById("testList");
let data = loadData();

function render() {
  const items = [...data.tests].sort((a, b) => dateFromInput(a.date) - dateFromInput(b.date));

  list.innerHTML = items.length ? items.map((test) => {
    const overdue = isOverdue(test);
    const days = getDaysRemaining(test.date);
    const label = test.completed ? "Done" : overdue ? "Overdue" : days === 0 ? "Today" : `${days} days left`;
    const style = test.completed ? "success" : overdue ? "danger" : days <= 3 ? "warning" : "";

    return `<div class="list-item ${test.completed ? "completed" : ""} ${overdue ? "overdue" : ""}"><div><p class="item-title">${escapeHTML(test.lesson)} <span class="badge ${style}">${label}</span></p><p class="item-meta">${test.description ? `${escapeHTML(test.description)} · ` : ""}${formatDate(test.date)}</p></div><div class="item-actions"><button class="secondary" data-toggle="${test.id}">${test.completed ? "Undo" : "Done"}</button><button class="ghost" data-delete="${test.id}">Delete</button></div></div>`;
  }).join("") : `<div class="empty-state">No tests added yet</div>`;

  document.querySelectorAll("[data-toggle]").forEach((button) => {
    button.onclick = () => {
      data.tests = data.tests.map((test) => test.id === button.dataset.toggle ? { ...test, completed: !test.completed } : test);
      saveData(data);
      render();
    };
  });

  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.onclick = () => {
      if (confirm("Delete this test?")) {
        data.tests = data.tests.filter((test) => test.id !== button.dataset.delete);
        saveData(data);
        render();
      }
    };
  });
}

form.onsubmit = (event) => {
  event.preventDefault();
  if (!lesson.value.trim() || !date.value) return alert("Please fill in the lesson name and test date.");
  data.tests.push({ id: createId(), lesson: lesson.value.trim(), description: description.value.trim(), date: date.value, completed: false });
  saveData(data);
  form.reset();
  render();
};

initNavbar();
render();
