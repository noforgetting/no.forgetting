import { getFirebaseServices, isFirebaseConfigured } from "./firebase.js";
import { initSync, getSyncUser } from "./sync.js";

const friendlyError = (error) => ({ "auth/invalid-email": "Enter a valid email address.", "auth/invalid-credential": "Email or password is incorrect.", "auth/email-already-in-use": "That email already has an account.", "auth/weak-password": "Use a password with at least 6 characters.", "auth/too-many-requests": "Too many attempts. Please try again later." }[error.code] || "We could not complete that request. Please try again.");

export function initAuth() {
  const panel = document.createElement("section");
  panel.className = "account-panel";
  panel.innerHTML = `<p class="account-status" aria-live="polite">Local-only mode</p><button type="button" class="secondary account-open">Sign in to sync</button><dialog class="account-dialog"><form method="dialog" class="account-form"><button class="account-close" value="cancel" aria-label="Close">×</button><h2>Sync your reminders</h2><p>Signing in is optional. Your reminders stay on this device unless you choose to sync.</p><label>Email<input type="email" name="email" autocomplete="email" required></label><label>Password<input type="password" name="password" autocomplete="current-password" minlength="6" required></label><p class="account-error" aria-live="polite"></p><div><button type="button" class="secondary account-signin">Sign in</button><button type="button" class="account-signup">Create account</button></div></form></dialog>`;
  document.querySelector(".sidebar")?.append(panel);
  const status = panel.querySelector(".account-status"), open = panel.querySelector(".account-open"), dialog = panel.querySelector("dialog"), form = panel.querySelector("form"), error = panel.querySelector(".account-error");
  const run = async (signUp) => { error.textContent = ""; if (!form.reportValidity()) return; try { const { auth, authSdk } = await getFirebaseServices(); const email = form.elements.email.value.trim(), password = form.elements.password.value; await (signUp ? authSdk.createUserWithEmailAndPassword(auth, email, password) : authSdk.signInWithEmailAndPassword(auth, email, password)); dialog.close(); } catch (err) { error.textContent = friendlyError(err); } };
  open.addEventListener("click", async () => { if (getSyncUser()) { const { auth, authSdk } = await getFirebaseServices(); await authSdk.signOut(auth); } else if (isFirebaseConfigured()) dialog.showModal(); else status.textContent = "Firebase setup is needed before sync can be enabled."; });
  panel.querySelector(".account-signin").addEventListener("click", () => run(false));
  panel.querySelector(".account-signup").addEventListener("click", () => run(true));
  window.addEventListener("noforgetting:sync-status", (event) => { const { state, message, user } = event.detail; status.textContent = message; open.textContent = user ? "Sign out" : "Sign in to sync"; panel.classList.toggle("is-error", state === "error"); });
  initSync().catch(() => { status.textContent = "Sync could not start; local-only mode is active."; });
}
