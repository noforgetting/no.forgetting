import { cloneDefaultStudyData, loadData, normalizeStudyData, saveData } from "./utils.js";
import { getFirebaseServices, isFirebaseConfigured } from "./firebase.js";

let currentUser = null;
let stopListening = null;
let saveTimer = null;
let authListenerStarted = false;
let connectivityListenersStarted = false;
let syncAttemptVersion = 0;
let isLeavingSyncMode = false;
let leaveSyncTimer = null;
let resolveLeaveSync = null;
const SYNC_PENDING_KEY = "NoForgettingSyncPending";
const LAST_SYNC_USER_KEY = "NoForgettingLastSyncUser";
const SYNC_OVERLAY_KEY = "NoForgettingShowSyncOverlay";
const statusEvent = (state, message = "", { blocking = false } = {}) => window.dispatchEvent(new CustomEvent("noforgetting:sync-status", { detail: { state, message, user: currentUser, blocking } }));
const userDocument = (firestoreSdk, db, uid) => firestoreSdk.doc(db, "users", uid, "appData", "current");
const hasPendingChanges = () => localStorage.getItem(SYNC_PENDING_KEY) === "true";
const markPending = () => localStorage.setItem(SYNC_PENDING_KEY, "true");
const clearPending = () => localStorage.removeItem(SYNC_PENDING_KEY);
const hasKnownSyncUser = () => Boolean(currentUser || localStorage.getItem(LAST_SYNC_USER_KEY));

export function requestSyncOverlay() { sessionStorage.setItem(SYNC_OVERLAY_KEY, "true"); }
export function clearRequestedSyncOverlay() { sessionStorage.removeItem(SYNC_OVERLAY_KEY); }
const consumeRequestedSyncOverlay = () => {
  const requested = sessionStorage.getItem(SYNC_OVERLAY_KEY) === "true";
  sessionStorage.removeItem(SYNC_OVERLAY_KEY);
  return requested;
};

async function pushLatest() {
  if (!currentUser || !hasPendingChanges()) return;
  if (!navigator.onLine) {
    statusEvent("offline", "Offline, changes will sync when you reconnect");
    return;
  }
  try {
    const { db, firestoreSdk } = await getFirebaseServices();
    await firestoreSdk.setDoc(userDocument(firestoreSdk, db, currentUser.uid), { data: normalizeStudyData(loadData()), updatedAt: firestoreSdk.serverTimestamp() }, { merge: true });
    clearPending();
    statusEvent("synced", "Synced");
  } catch (error) {
    console.error("Could not sync reminders.", error);
    statusEvent("error", "Changes are still saved on this device.");
  }
}

export function queueSync() {
  if (!hasKnownSyncUser()) return;
  markPending();
  if (!currentUser) {
    statusEvent("offline", "Offline, changes will sync when you reconnect");
    return;
  }
  if (!navigator.onLine) {
    statusEvent("offline", "Offline, changes will sync when you reconnect");
    return;
  }
  statusEvent("syncing", "Syncing…");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(pushLatest, 450);
}

export async function cancelSync() {
  clearTimeout(saveTimer);
  syncAttemptVersion += 1;
  stopListening?.();
  stopListening = null;
  if (!currentUser) return;

  const { auth, authSdk } = await getFirebaseServices();
  await authSdk.signOut(auth);
}

export async function leaveSyncMode() {
  if (!currentUser || isLeavingSyncMode) return;

  isLeavingSyncMode = true;
  statusEvent("unloading", "Starting local-only mode... (reminders will only be saved on this device)", { blocking: "local" });
  return new Promise((resolve, reject) => {
    resolveLeaveSync = resolve;
    leaveSyncTimer = setTimeout(async () => {
      leaveSyncTimer = null;
      try {
        const { auth, authSdk } = await getFirebaseServices();
        await authSdk.signOut(auth);
        resolveLeaveSync?.();
        resolveLeaveSync = null;
      } catch (error) {
        isLeavingSyncMode = false;
        resolveLeaveSync = null;
        statusEvent("error", "Couldn't switch to local mode. Please try again.");
        reject(error);
      }
    }, 2000);
  });
}

export function cancelLeavingSyncMode() {
  if (!isLeavingSyncMode || !leaveSyncTimer) return;
  clearTimeout(leaveSyncTimer);
  leaveSyncTimer = null;
  isLeavingSyncMode = false;
  resolveLeaveSync?.();
  resolveLeaveSync = null;
  statusEvent("sync-cancelled", "Local mode transition cancelled");
}

export async function initSync() {
  if (!isFirebaseConfigured()) { statusEvent("local", "Local-only mode"); return; }
  if (!connectivityListenersStarted) {
    connectivityListenersStarted = true;
    window.addEventListener("online", () => {
      initSync().then(() => {
        if (currentUser && hasPendingChanges()) queueSync();
      }).catch(() => undefined);
    });
    window.addEventListener("offline", () => {
      if (hasKnownSyncUser() && hasPendingChanges()) statusEvent("offline", "Offline, changes will sync when you reconnect");
    });
  }
  const { auth, authSdk } = await getFirebaseServices();
  if (authListenerStarted) return;
  authListenerStarted = true;
  authSdk.onAuthStateChanged(auth, (user) => {
    const syncAttempt = ++syncAttemptVersion;
    currentUser = user;
    stopListening?.(); stopListening = null;
    if (!user) {
      localStorage.removeItem(LAST_SYNC_USER_KEY);
      clearPending();
      if (isLeavingSyncMode) {
        saveData(cloneDefaultStudyData(), { sync: false });
        isLeavingSyncMode = false;
      }
      statusEvent("local", "Local-only mode");
      return;
    }
    localStorage.setItem(LAST_SYNC_USER_KEY, user.uid);
    statusEvent("loading", "Loading your synced reminders…", { blocking: consumeRequestedSyncOverlay() ? "sync" : null });
    getFirebaseServices().then(({ db, firestoreSdk }) => {
      if (currentUser?.uid !== user.uid || syncAttempt !== syncAttemptVersion) return;
      const ref = userDocument(firestoreSdk, db, user.uid);
      stopListening = firestoreSdk.onSnapshot(ref, (snapshot) => {
        if (syncAttempt !== syncAttemptVersion) return;
        // Never replace edits made locally while offline with an older cloud copy.
        if (hasPendingChanges()) {
          queueSync();
        } else if (snapshot.exists() && snapshot.data().data) { saveData(snapshot.data().data, { sync: false }); statusEvent("synced", "Synced"); }
        else queueSync();
      }, () => statusEvent("error", "Sync is unavailable; local changes are safe."));
    });
  });
}

export function getSyncUser() { return currentUser; }
