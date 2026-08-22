import { initNavbar } from "./navbar.js";
import {
  calculateStats,
  formatTimer,
  getTodayKey,
  loadData,
  saveData,
  updateStreak
} from "./utils.js";

const elements = {
  timerDisplay: document.getElementById("timerDisplay"),
  startTimerBtn: document.getElementById("startTimerBtn"),
  pauseTimerBtn: document.getElementById("pauseTimerBtn"),
  resetTimerBtn: document.getElementById("resetTimerBtn"),
  studyHoursStat: document.getElementById("studyHoursStat"),
  heroStreak: document.getElementById("heroStreak"),
  completionPercent: document.getElementById("completionPercent"),
  completionBar: document.getElementById("completionBar"),
  remainingTasks: document.getElementById("remainingTasks"),
  longestStreak: document.getElementById("longestStreak")
};

let appData = loadData();
let timerSeconds = 0;
let timerInterval = null;

function renderTimer() {
  elements.timerDisplay.textContent = formatTimer(timerSeconds);
}

function renderProgress() {
  updateStreak(appData);
  saveData(appData);

  const stats = calculateStats(appData);

  elements.studyHoursStat.textContent = stats.studyHours.toFixed(1);
  elements.heroStreak.textContent = appData.streak.current;
  elements.completionPercent.textContent = `${stats.completion}%`;
  elements.completionBar.style.width = `${stats.completion}%`;
  elements.remainingTasks.textContent = stats.remainingTasks;
  elements.longestStreak.textContent = appData.streak.longest;
}

function startTimer() {
  if (timerInterval) {
    return;
  }

  timerInterval = setInterval(() => {
    timerSeconds += 1;
    appData.totalStudySeconds += 1;

    const todayKey = getTodayKey();
    appData.dailyStudySeconds[todayKey] = (appData.dailyStudySeconds[todayKey] || 0) + 1;

    updateStreak(appData);
    saveData(appData);
    renderTimer();
    renderProgress();
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  pauseTimer();
  timerSeconds = 0;
  renderTimer();
}

function setupEventListeners() {
  elements.startTimerBtn.addEventListener("click", startTimer);
  elements.pauseTimerBtn.addEventListener("click", pauseTimer);
  elements.resetTimerBtn.addEventListener("click", resetTimer);
}

function initProductivity() {
  initNavbar();
  setupEventListeners();
  renderTimer();
  renderProgress();
}

initProductivity();
