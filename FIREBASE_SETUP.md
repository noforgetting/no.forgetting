# Firebase sync setup

The app works without Firebase and keeps reminders only in the browser. Signing in is optional; it enables sync for the signed-in account.

## One-time Firebase Console setup

1. Create a Firebase project on the Spark plan and register a **Web app**.
2. In **Authentication → Sign-in method**, enable **Email/Password**. Do not enable anonymous sign-in for this app: a real account is the boundary that protects each user's data. Enable Firebase's email-enumeration protection and password policy if they are available in your project settings.
3. Create a **Cloud Firestore** database. Start in production mode, then deploy the included rules:

   ```powershell
   firebase login
   firebase use YOUR_PROJECT_ID
   firebase deploy --only firestore:rules
   ```

4. Copy the Firebase web configuration from Project settings into `js/firebase-config.js`. Those values are public identifiers, not credentials. Never add a service-account JSON file, Admin SDK key, or private reCAPTCHA secret to this static site.
5. In **App Check**, register the Web app with reCAPTCHA v3, paste only the resulting site key into `appCheckSiteKey`, test it, then enforce App Check for Cloud Firestore. Enforcement should be enabled only after a real-device test, otherwise valid clients will be blocked.
6. Deploy over HTTPS (Firebase Hosting, Netlify, GitHub Pages, etc.). Service workers and App Check require a secure origin; `localhost` is fine for development. `firebase.json` is already set up for Firebase Hosting, so `firebase deploy --only hosting,firestore:rules` will deploy both the site and its rules.

## Security model

Firestore stores one document at `users/{uid}/appData/current`. The included rules permit only that signed-in UID to read or write it, reject deletes, restrict the expected data shape, and cap each reminder list at 500 items. Firestore rules are the authorization layer here—there is no server and no service account in the browser.

The web API key in Firebase configuration is expected to be public. Protect the project with Authentication, Firestore Rules, App Check enforcement, and API-key application restrictions in Google Cloud Console; do not treat the API key as a secret.

## Abuse monitoring

- Watch **Firestore → Usage** and **App Check → Metrics** in Firebase Console during the first weeks after launch.
- Review **Authentication → Users** and the authentication quota/errors for suspicious sign-up bursts.
- Spark projects have fixed quota limits. If a billing account is ever attached, also create Google Cloud budget alerts. Firebase's usage dashboard is the useful no-cost baseline.

This app performs only direct client-to-Firestore writes, so there is no server-side authorization code to maintain. If you later add privileged actions (admin dashboards, emails, bulk changes), use Cloud Functions/Cloud Run and verify Firebase ID tokens there—never expose service-account credentials to the client.
