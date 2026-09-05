import { getFirebaseServices, isFirebaseConfigured } from "./firebase.js";
import { cancelLeavingSyncMode, cancelSync, clearRequestedSyncOverlay, initSync, getSyncUser, leaveSyncMode, requestSyncOverlay } from "./sync.js";

const friendlyError = (error) => ({ "auth/invalid-email": "Enter a valid email address", "auth/invalid-credential": "Email or password is wrong", "auth/email-already-in-use": "That email already has an account", "auth/weak-password": "Use a password with at least 6 characters", "auth/too-many-requests": "Too many attempts. Please try again later" }[error.code] || "Couldn't complete the request. Please try again.");

export function initAuth() {
  const panel = document.createElement("section");
  panel.className = "account-panel";
  panel.innerHTML = `<div class="account-copy"><strong class="account-title">Sync reminders</strong><p class="account-description">Sign in to securely access your reminders on all your devices.</p></div><p class="account-status" aria-live="polite">Currently on local only mode</p><button type="button" class="secondary account-open">Sign in to sync</button><dialog class="account-dialog"><form method="dialog" class="account-form"><h2>Sign in</h2><p>Signing in is optional, but your reminders will only stay on this device</p><label>Email<input type="email" name="email" autocomplete="email" required></label><label>Password<input type="password" name="password" autocomplete="current-password" minlength="6" required></label><p class="account-error" aria-live="polite"></p><div><button type="button" class="secondary account-cancel">Cancel</button><button type="button" class="secondary account-signin">Sign in</button><button type="button" class="account-signup">Create account</button></div></form></dialog>`;
  document.querySelector(".sidebar")?.append(panel);
  const syncOverlay = document.createElement("dialog");
  syncOverlay.className = "sync-overlay";
  syncOverlay.setAttribute("aria-labelledby", "syncOverlayTitle");
  syncOverlay.innerHTML = `<div class="sync-overlay__content"><span class="sync-overlay__spinner" aria-hidden="true"></span><div><h2 id="syncOverlayTitle">Getting everything ready</h2><p class="sync-overlay__message" aria-live="polite">Loading your synced reminders…</p></div><button type="button" class="secondary sync-overlay__cancel">Cancel sync</button></div>`;
  document.body.append(syncOverlay);
  const localOverlay = document.createElement("dialog");
  localOverlay.className = "sync-overlay sync-overlay--local";
  localOverlay.setAttribute("aria-labelledby", "localOverlayTitle");
  localOverlay.innerHTML = `<div class="sync-overlay__content"><span class="sync-overlay__spinner" aria-hidden="true"></span><div><h2 id="localOverlayTitle">Switching to local mode</h2><p class="sync-overlay__message" aria-live="polite">Starting local-only mode... (reminders will only be saved on this device)</p></div><button type="button" class="secondary sync-overlay__cancel">Cancel</button></div>`;
  document.body.append(localOverlay);
  const status = panel.querySelector(".account-status"), title = panel.querySelector(".account-title"), description = panel.querySelector(".account-description"), open = panel.querySelector(".account-open"), dialog = panel.querySelector("dialog"), form = panel.querySelector("form"), error = panel.querySelector(".account-error");
  const syncMessage = syncOverlay.querySelector(".sync-overlay__message"), syncCancel = syncOverlay.querySelector(".sync-overlay__cancel");
  const minimumSyncDisplay = 1500, minimumLocalDisplay = 2500;
  let syncOverlayShownAt = 0, localOverlayShownAt = 0, syncOverlayCloseTimer, localOverlayCloseTimer;
  const setSyncOverlay = (visible, message) => {
    if (visible) {
      clearTimeout(syncOverlayCloseTimer);
      syncMessage.textContent = message || "Loading your synced reminders…";
      syncCancel.disabled = false;
      syncCancel.textContent = "Cancel sync";
      if (!syncOverlay.open) { syncOverlayShownAt = Date.now(); syncOverlay.showModal(); }
    } else if (syncOverlay.open) {
      clearTimeout(syncOverlayCloseTimer);
      syncOverlayCloseTimer = setTimeout(() => syncOverlay.close(), Math.max(0, minimumSyncDisplay - (Date.now() - syncOverlayShownAt)));
    }
  };
  const localCancel = localOverlay.querySelector(".sync-overlay__cancel");
  const setLocalOverlay = (visible, message, closeImmediately = false) => {
    if (visible) {
      clearTimeout(localOverlayCloseTimer);
      localOverlay.querySelector(".sync-overlay__message").textContent = message || "Starting local-only mode... (reminders will only be saved on this device)";
      if (!localOverlay.open) { localOverlayShownAt = Date.now(); localOverlay.showModal(); }
    } else if (localOverlay.open) {
      clearTimeout(localOverlayCloseTimer);
      localOverlayCloseTimer = setTimeout(() => localOverlay.close(), closeImmediately ? 0 : Math.max(0, minimumLocalDisplay - (Date.now() - localOverlayShownAt)));
    }
  };
  const cancelCurrentSync = async () => {
    syncCancel.disabled = true;
    syncCancel.textContent = "Cancelling…";
    try { await cancelSync(); } catch (err) { syncMessage.textContent = friendlyError(err); syncCancel.disabled = false; syncCancel.textContent = "Cancel sync"; }
  };
  syncCancel.addEventListener("click", cancelCurrentSync);
  syncOverlay.addEventListener("cancel", (event) => { event.preventDefault(); cancelCurrentSync(); });
  localCancel.addEventListener("click", cancelLeavingSyncMode);
  localOverlay.addEventListener("cancel", (event) => { event.preventDefault(); cancelLeavingSyncMode(); });
  panel.querySelector(".account-cancel").addEventListener("click", () => dialog.close());
  const run = async (signUp) => { error.textContent = ""; if (!form.reportValidity()) return; requestSyncOverlay(); try { const { auth, authSdk } = await getFirebaseServices(); const email = form.elements.email.value.trim(), password = form.elements.password.value; await (signUp ? authSdk.createUserWithEmailAndPassword(auth, email, password) : authSdk.signInWithEmailAndPassword(auth, email, password)); dialog.close(); } catch (err) { clearRequestedSyncOverlay(); error.textContent = friendlyError(err); } };
  open.addEventListener("click", async () => { if (getSyncUser()) { await leaveSyncMode(); } else if (isFirebaseConfigured()) dialog.showModal(); else status.textContent = "Firebase setup is needed before sync can be enabled."; });
  panel.querySelector(".account-signin").addEventListener("click", () => run(false));
  panel.querySelector(".account-signup").addEventListener("click", () => run(true));
  window.addEventListener("noforgetting:sync-status", (event) => { const { state, message, user, blocking } = event.detail; status.textContent = message; title.textContent = user ? "Your reminders are synced" : "Sync reminders"; description.textContent = user ? "All your reminders are synced to signed in devices" : "Sign in to access your reminders on all devices"; open.textContent = user ? "Sign out" : "Sign in to sync"; panel.classList.toggle("is-error", state === "error"); setSyncOverlay(state === "loading" && blocking === "sync", message); setLocalOverlay(state === "unloading" && blocking === "local", message, state === "sync-cancelled"); });
  initSync().catch(() => { status.textContent = "Sync could not start, currently in local only mode"; });
}
