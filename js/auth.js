import { getFirebaseServices, isFirebaseConfigured } from "./firebase.js";
import { initSync, getSyncUser } from "./sync.js";

const friendlyError = (error) => ({ "auth/invalid-email": "Enter a valid email address", "auth/invalid-credential": "Email or password is wrong", "auth/email-already-in-use": "That email already has an account", "auth/weak-password": "Use a password with at least 6 characters", "auth/too-many-requests": "Too many attempts. Please try again later" }[error.code] || "Couldn't complete the request. Please try again.");

export function initAuth() {
  const panel = document.createElement("section");
  panel.className = "account-panel";
  panel.innerHTML = `<div class="account-copy"><strong class="account-title">Keep reminders in sync</strong><p class="account-description">Sign in to securely access your reminders on all your devices.</p></div><p class="account-status" aria-live="polite">Currently on local only mode</p><button type="button" class="secondary account-open">Sign in to sync</button><dialog class="account-dialog"><form method="dialog" class="account-form"><h2>Sign in</h2><p>Signing in is optional, but your reminders will only stay on this device</p><label>Email<input type="email" name="email" autocomplete="email" required></label><label>Password<input type="password" name="password" autocomplete="current-password" minlength="6" required></label><p class="account-error" aria-live="polite"></p><div><button type="button" class="secondary account-cancel">Cancel</button><button type="button" class="secondary account-signin">Sign in</button><button type="button" class="account-signup">Create account</button></div></form></dialog>`;
  document.querySelector(".sidebar")?.append(panel);
  const status = panel.querySelector(".account-status"), title = panel.querySelector(".account-title"), description = panel.querySelector(".account-description"), open = panel.querySelector(".account-open"), dialog = panel.querySelector("dialog"), form = panel.querySelector("form"), error = panel.querySelector(".account-error");
  panel.querySelector(".account-cancel").addEventListener("click", () => dialog.close());
  const run = async (signUp) => { error.textContent = ""; if (!form.reportValidity()) return; try { const { auth, authSdk } = await getFirebaseServices(); const email = form.elements.email.value.trim(), password = form.elements.password.value; await (signUp ? authSdk.createUserWithEmailAndPassword(auth, email, password) : authSdk.signInWithEmailAndPassword(auth, email, password)); dialog.close(); } catch (err) { error.textContent = friendlyError(err); } };
  open.addEventListener("click", async () => { if (getSyncUser()) { const { auth, authSdk } = await getFirebaseServices(); await authSdk.signOut(auth); } else if (isFirebaseConfigured()) dialog.showModal(); else status.textContent = "Firebase setup is needed before sync can be enabled."; });
  panel.querySelector(".account-signin").addEventListener("click", () => run(false));
  panel.querySelector(".account-signup").addEventListener("click", () => run(true));
  window.addEventListener("noforgetting:sync-status", (event) => { const { state, message, user } = event.detail; status.textContent = message; title.textContent = user ? "Your reminders are synced" : "Keep reminders in sync"; description.textContent = user ? "All your reminders are synced to signed in devices" : "Sign in to access your reminders on all devices"; open.textContent = user ? "Sign out" : "Sign in to sync"; panel.classList.toggle("is-error", state === "error"); });
  initSync().catch(() => { status.textContent = "Sync could not start, currently in local only mode"; });
}
