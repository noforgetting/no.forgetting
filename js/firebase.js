import { firebaseConfig, appCheckSiteKey } from "./firebase-config.js";

const configured = ["apiKey", "authDomain", "projectId", "appId"].every((key) => Boolean(firebaseConfig[key]));
let servicesPromise;

export function isFirebaseConfigured() { return configured; }

export async function getFirebaseServices() {
  if (!configured) throw new Error("Firebase has not been configured yet.");
  if (!servicesPromise) {
    servicesPromise = Promise.all([
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-check.js")
    ]).then(([appSdk, authSdk, firestoreSdk, appCheckSdk]) => {
      const app = appSdk.initializeApp(firebaseConfig);
      if (appCheckSiteKey) appCheckSdk.initializeAppCheck(app, { provider: new appCheckSdk.ReCaptchaV3Provider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
      return { auth: authSdk.getAuth(app), db: firestoreSdk.getFirestore(app), authSdk, firestoreSdk };
    });
  }
  return servicesPromise;
}
