import { initNavbar } from "./navbar.js";
import {
  createId,
  dateFromInput,
  escapeHTML,
  formatDate,
  getDaysRemaining,
  isOverdue,
  loadData,
  saveData,
  updateStreak
} from "./utils.js";

const elements = {
  assignmentForm: document.getElementById("assignmentForm"),
  assignmentLesson: document.getElementById("assignmentLesson"),
  assignmentTitle: document.getElementById("assignmentTitle"),
  assignmentDate: document.getElementById("assignmentDate"),
  assignmentSearch: document.getElementById("assignmentSearch"),
  assignmentFilter: document.getElementById("assignmentFilter"),
  assignmentList: document.getElementById("assignmentList"),
  testForm: document.getElementById("testForm"),
  testLesson: document.getElementById("testLesson"),
  testDate: document.getElementById("testDate"),
  testList: document.getElementById("testList"),
  personalReminderForm: document.getElementById("personalReminderForm"),
  personalReminderTitle: document.getElementById("personalReminderTitle"),
  personalReminderType: document.getElementById("personalReminderType"),
  personalReminderDate: document.getElementById("personalReminderDate"),
  personalReminderList: document.getElementById("personalReminderList")
};

let appData = loadData();

function saveAndRender() {
  updateStreak(appData);
  saveData(appData);
  renderAssignments();
  renderTests();
  renderPersonalReminders();
}

function addAssignment(event) {
  event.preventDefault();

  const lesson = elements.assignmentLesson.value.trim();
  const title = elements.assignmentTitle.value.trim();
  const date = elements.assignmentDate.value;

  if (!lesson || !date) {
    alert("Please fill in the lesson name and due date.");
    return;
  }

  appData.assignments.push({
    id: createId(),
    lesson,
    title,
    date,
    completed: false
  });

  elements.assignmentForm.reset();
  saveAndRender();
}

function toggleAssignment(id) {
  appData.assignments = appData.assignments.map((assignment) => {
    if (assignment.id !== id) {
      return assignment;
    }

    return {
      ...assignment,
      completed: !assignment.completed
    };
  });

  saveAndRender();
}

function deleteAssignment(id) {
  const confirmed = confirm("Delete this assignment?");

  if (!confirmed) {
    return;
  }

  appData.assignments = appData.assignments.filter((assignment) => assignment.id !== id);
  saveAndRender();
}

function renderAssignments() {
  const searchText = elements.assignmentSearch.value.trim().toLowerCase();
  const filterValue = elements.assignmentFilter.value;

  const filteredAssignments = [...appData.assignments]
    .filter((assignment) => {
      const matchesSearch = `${assignment.lesson} ${assignment.title || ""}`.toLowerCase().includes(searchText);
      const matchesFilter =
        filterValue === "all" ||
        (filterValue === "active" && !assignment.completed) ||
        (filterValue === "completed" && assignment.completed) ||
        (filterValue === "overdue" && isOverdue(assignment));

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => dateFromInput(a.date) - dateFromInput(b.date));

  if (filteredAssignments.length === 0) {
    elements.assignmentList.innerHTML = `<div class="empty-state">No assignments match this view.</div>`;
    return;
  }

  elements.assignmentList.innerHTML = filteredAssignments.map((assignment) => {
    const overdue = isOverdue(assignment);
    const statusBadge = assignment.completed
      ? `<span class="badge success">Done</span>`
      : overdue
        ? `<span class="badge danger">Overdue</span>`
        : `<span class="badge">Open</span>`;

    return `
      <div class="list-item ${assignment.completed ? "completed" : ""} ${overdue ? "overdue" : ""}">
        <div>
          <p class="item-title">${escapeHTML(assignment.lesson)} ${statusBadge}</p>
          <p class="item-meta">${assignment.title ? `${escapeHTML(assignment.title)} - ` : ""}Due ${formatDate(assignment.date)}</p>
        </div>
        <div class="item-actions">
          <button type="button" class="secondary" data-assignment-id="${assignment.id}">${assignment.completed ? "Undo" : "Done"}</button>
          <button type="button" class="ghost" data-delete-assignment-id="${assignment.id}">Delete</button>
        </div>
      </div>
    `;
  }).join("");

  document.querySelectorAll("[data-assignment-id]").forEach((button) => {
    button.addEventListener("click", () => toggleAssignment(button.dataset.assignmentId));
  });

  document.querySelectorAll("[data-delete-assignment-id]").forEach((button) => {
    button.addEventListener("click", () => deleteAssignment(button.dataset.deleteAssignmentId));
  });
}

function addTest(event) {
  event.preventDefault();

  const lesson = elements.testLesson.value.trim();
  const date = elements.testDate.value;

  if (!lesson || !date) {
    alert("Please fill in the lesson name and test date.");
    return;
  }

  appData.tests.push({
    id: createId(),
    lesson,
    date
  });

  elements.testForm.reset();
  saveAndRender();
}

function deleteTest(id) {
  const confirmed = confirm("Delete this test?");

  if (!confirmed) {
    return;
  }

  appData.tests = appData.tests.filter((test) => test.id !== id);
  saveAndRender();
}

function renderTests() {
  const sortedTests = [...appData.tests]
    .sort((a, b) => dateFromInput(a.date) - dateFromInput(b.date));

  if (sortedTests.length === 0) {
    elements.testList.innerHTML = `<div class="empty-state">No tests added yet</div>`;
    return;
  }

  elements.testList.innerHTML = sortedTests.map((test) => {
    const days = getDaysRemaining(test.date);
    const label = days < 0 ? `${Math.abs(days)} days ago` : days === 0 ? "Today" : `${days} days left`;
    const badgeClass = days < 0 ? "danger" : days <= 3 ? "warning" : "";

    return `
      <div class="list-item">
        <div>
          <p class="item-title">${escapeHTML(test.lesson)} <span class="badge ${badgeClass}">${label}</span></p>
          <p class="item-meta">${formatDate(test.date)}</p>
        </div>
        <div class="item-actions">
          <button type="button" class="ghost" data-test-id="${test.id}">Delete</button>
        </div>
      </div>
    `;
  }).join("");

  document.querySelectorAll("[data-test-id]").forEach((button) => {
    button.addEventListener("click", () => deleteTest(button.dataset.testId));
  });
}

function addPersonalReminder(event) {
  event.preventDefault();

  const title = elements.personalReminderTitle.value.trim();
  const type = elements.personalReminderType.value;
  const date = elements.personalReminderDate.value;

  if (!title || !date) {
    alert("Please fill in the reminder title and date.");
    return;
  }

  appData.personalReminders.push({
    id: createId(),
    title,
    type,
    date
  });

  elements.personalReminderForm.reset();
  saveAndRender();
}

function deletePersonalReminder(id) {
  const confirmed = confirm("Delete this personal reminder?");

  if (!confirmed) {
    return;
  }

  appData.personalReminders = appData.personalReminders.filter((reminder) => reminder.id !== id);
  saveAndRender();
}

function renderPersonalReminders() {
  const personalReminders = [...appData.personalReminders]
    .sort((a, b) => dateFromInput(a.date) - dateFromInput(b.date));

  if (personalReminders.length === 0) {
    elements.personalReminderList.innerHTML = `<div class="empty-state">No personal reminders yet</div>`;
    return;
  }

  elements.personalReminderList.innerHTML = personalReminders.map((reminder) => {
    const days = getDaysRemaining(reminder.date);
    const label = days < 0 ? `${Math.abs(days)} days ago` : days === 0 ? "Today" : `${days} days left`;
    const badgeClass = days < 0 ? "danger" : days <= 3 ? "warning" : "";

    return `
      <div class="list-item">
        <div>
          <p class="item-title">${escapeHTML(reminder.title)} <span class="badge">${escapeHTML(reminder.type)}</span></p>
          <p class="item-meta">${formatDate(reminder.date)} - ${label}</p>
        </div>
        <div class="item-actions">
          <span class="badge ${badgeClass}">${label}</span>
          <button type="button" class="ghost" data-personal-reminder-id="${reminder.id}">Delete</button>
        </div>
      </div>
    `;
  }).join("");

  document.querySelectorAll("[data-personal-reminder-id]").forEach((button) => {
    button.addEventListener("click", () => deletePersonalReminder(button.dataset.personalReminderId));
  });
}

function setupEventListeners() {
  elements.assignmentForm.addEventListener("submit", addAssignment);
  elements.assignmentSearch.addEventListener("input", renderAssignments);
  elements.assignmentFilter.addEventListener("change", renderAssignments);
  elements.testForm.addEventListener("submit", addTest);
  elements.personalReminderForm.addEventListener("submit", addPersonalReminder);
}

function initReminders() {
  initNavbar();
  setupEventListeners();
  renderAssignments();
  renderTests();
  renderPersonalReminders();
}

initReminders();
