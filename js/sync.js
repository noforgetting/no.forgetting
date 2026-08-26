import { loadData, normalizeStudyData, saveData } from "./utils.js";
import { getFirebaseServices, isFirebaseConfigured } from "./firebase.js";

let currentUser = null;
let stopListening = null;
let saveTimer = null;
let authListenerStarted = false;
let connectivityListenersStarted = false;
const SYNC_PENDING_KEY = "NoForgettingSyncPending";
const LAST_SYNC_USER_KEY = "NoForgettingLastSyncUser";
const statusEvent = (state, message = "") => window.dispatchEvent(new CustomEvent("noforgetting:sync-status", { detail: { state, message, user: currentUser } }));
const userDocument = (firestoreSdk, db, uid) => firestoreSdk.doc(db, "users", uid, "appData", "current");
const hasPendingChanges = () => localStorage.getItem(SYNC_PENDING_KEY) === "true";
const markPending = () => localStorage.setItem(SYNC_PENDING_KEY, "true");
const clearPending = () => localStorage.removeItem(SYNC_PENDING_KEY);
const hasKnownSyncUser = () => Boolean(currentUser || localStorage.getItem(LAST_SYNC_USER_KEY));

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
    currentUser = user;
    stopListening?.(); stopListening = null;
    if (!user) {
      localStorage.removeItem(LAST_SYNC_USER_KEY);
      clearPending();
      statusEvent("local", "Local-only mode");
      return;
    }
    localStorage.setItem(LAST_SYNC_USER_KEY, user.uid);
    statusEvent("syncing", "Loading your synced reminders…");
    getFirebaseServices().then(({ db, firestoreSdk }) => {
      const ref = userDocument(firestoreSdk, db, user.uid);
      stopListening = firestoreSdk.onSnapshot(ref, (snapshot) => {
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
