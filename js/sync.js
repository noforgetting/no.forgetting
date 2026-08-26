import { loadData, normalizeStudyData, saveData } from "./utils.js";
import { getFirebaseServices, isFirebaseConfigured } from "./firebase.js";

let currentUser = null;
let stopListening = null;
let saveTimer = null;
const SYNC_PENDING_KEY = "NoForgettingSyncPending";
const statusEvent = (state, message = "") => window.dispatchEvent(new CustomEvent("noforgetting:sync-status", { detail: { state, message, user: currentUser } }));
const userDocument = (firestoreSdk, db, uid) => firestoreSdk.doc(db, "users", uid, "appData", "current");
const hasPendingChanges = () => localStorage.getItem(SYNC_PENDING_KEY) === "true";
const markPending = () => localStorage.setItem(SYNC_PENDING_KEY, "true");
const clearPending = () => localStorage.removeItem(SYNC_PENDING_KEY);

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
  if (!currentUser) return;
  markPending();
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
  const { auth, authSdk } = await getFirebaseServices();
  authSdk.onAuthStateChanged(auth, (user) => {
    currentUser = user;
    stopListening?.(); stopListening = null;
    if (!user) { statusEvent("local", "Local-only mode"); return; }
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
  window.addEventListener("online", () => {
    if (currentUser && hasPendingChanges()) queueSync();
  });
  window.addEventListener("offline", () => {
    if (currentUser && hasPendingChanges()) statusEvent("offline", "Offline, changes will sync when you reconnect");
  });
}

export function getSyncUser() { return currentUser; }
