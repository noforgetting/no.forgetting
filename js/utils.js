export const STORAGE_KEY = "NoForgettingLocalData";
export const FIFTEEN_MINUTES = 15 * 60;

// A service worker stores the app files locally after the first online visit.
// It is unavailable for file:// pages, so test through localhost or a HTTPS host.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((error) => {
      console.warn("Offline mode could not be enabled.", error);
    });
  });
}

export const defaultStudyData = {
  assignments: [],
  tests: [],
  personalReminders: [],
  totalStudySeconds: 0,
  dailyStudySeconds: {},
  streak: {
    current: 0,
    longest: 0,
    lastQualifiedDate: null
  }
};

export function cloneDefaultStudyData() {
  return JSON.parse(JSON.stringify(defaultStudyData));
}

export function normalizeStudyData(savedData = {}) {
  const normalizedData = {
    ...cloneDefaultStudyData(),
    ...savedData
  };

  normalizedData.assignments = Array.isArray(normalizedData.assignments) ? normalizedData.assignments : [];
  normalizedData.tests = Array.isArray(normalizedData.tests) ? normalizedData.tests : [];
  normalizedData.personalReminders = Array.isArray(normalizedData.personalReminders) ? normalizedData.personalReminders : [];
  normalizedData.dailyStudySeconds = normalizedData.dailyStudySeconds && typeof normalizedData.dailyStudySeconds === "object"
    ? normalizedData.dailyStudySeconds
    : {};
  normalizedData.streak = {
    ...cloneDefaultStudyData().streak,
    ...(normalizedData.streak || {})
  };
  normalizedData.totalStudySeconds = Number(normalizedData.totalStudySeconds) || 0;

  return normalizedData;
}

export function loadData() {
  const savedData = localStorage.getItem(STORAGE_KEY);

  if (!savedData) {
    return cloneDefaultStudyData();
  }

  try {
    return normalizeStudyData(JSON.parse(savedData));
  } catch (error) {
    return cloneDefaultStudyData();
  }
}

export function saveData(appData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeStudyData(appData)));
}

export function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function dateFromInput(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

export function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getTodayKey() {
  return getLocalDateKey(new Date());
}

export function escapeHTML(text) {
  const textHolder = document.createElement("div");
  textHolder.textContent = text;
  return textHolder.innerHTML;
}

export function formatDate(dateString) {
  return dateFromInput(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function getDaysRemaining(dateString) {
  const today = dateFromInput(getTodayKey());
  const targetDate = dateFromInput(dateString);
  const difference = targetDate - today;

  return Math.ceil(difference / (1000 * 60 * 60 * 24));
}

export function formatTimer(seconds) {
  const hours = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}:${remainingSeconds}`;
}

export function isOverdue(task) {
  const today = dateFromInput(getTodayKey());
  const dueDate = dateFromInput(task.date);
  return !task.completed && dueDate < today;
}

export function calculateCurrentStreak(qualifiedDates) {
  const qualifiedSet = new Set(qualifiedDates);
  const startDate = qualifiedSet.has(getTodayKey()) ? new Date() : new Date(Date.now() - 86400000);
  let streakCount = 0;

  while (qualifiedSet.has(getLocalDateKey(startDate))) {
    streakCount += 1;
    startDate.setDate(startDate.getDate() - 1);
  }

  return streakCount;
}

export function updateStreak(appData) {
  const qualifiedDates = Object.keys(appData.dailyStudySeconds || {})
    .filter((dateKey) => appData.dailyStudySeconds[dateKey] >= FIFTEEN_MINUTES)
    .sort();

  let longest = 0;
  let running = 0;
  let previousDate = null;

  qualifiedDates.forEach((dateKey) => {
    const currentDate = dateFromInput(dateKey);

    if (previousDate) {
      const dayDifference = (currentDate - previousDate) / (1000 * 60 * 60 * 24);
      running = dayDifference === 1 ? running + 1 : 1;
    } else {
      running = 1;
    }

    longest = Math.max(longest, running);
    previousDate = currentDate;
  });

  const todayKey = getTodayKey();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);

  appData.streak.longest = longest;
  appData.streak.lastQualifiedDate = qualifiedDates[qualifiedDates.length - 1] || null;

  if (appData.streak.lastQualifiedDate === todayKey || appData.streak.lastQualifiedDate === yesterdayKey) {
    appData.streak.current = calculateCurrentStreak(qualifiedDates);
  } else {
    appData.streak.current = 0;
  }
}

export function calculateStats(appData) {
  const totalTasks = appData.assignments.length;
  const completedTasks = appData.assignments.filter((assignment) => assignment.completed).length;
  const remainingTasks = totalTasks - completedTasks;
  const upcomingExams = appData.tests.filter((test) => getDaysRemaining(test.date) >= 0).length;
  const completion = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const studyHours = (appData.totalStudySeconds || 0) / 3600;

  return {
    totalTasks,
    completedTasks,
    remainingTasks,
    upcomingExams,
    completion,
    studyHours
  };
}
