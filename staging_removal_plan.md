# Implementation Plan: Staging Environment Decommissioning

This plan describes how to safely remove all staging configurations, staging database environments, and environment detection checks from the Seibi application. All updates and builds will target **Production** (`seibi-app`) directly.

---

## User Review Required

> [!CAUTION]
> * **Firebase Project Deletion:** Once this plan is executed, your local command line will no longer recognize `seibi-app-staging`. 
> * To delete the staging project completely from the cloud, you must follow the manual steps below to avoid keeping empty, active staging databases or hosting domains on Google Cloud.

---

## Manual Steps: Deleting Staging in Firebase Web Console

Since the AI cannot log in to your Firebase Web Console, you must perform these steps manually:
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select the project: **seibi-app-staging**.
3. Click the gear icon next to "Project Overview" in the left sidebar and select **Project Settings**.
4. Scroll to the very bottom of the page and click **Delete Project**.
5. Accept all warnings and confirm deletion.

---

## Proposed Codebase Changes

We will remove the environment detection and staging configs, simplifying the app initialization.

### 1. [MODIFY] [.firebaserc](file:///C:/Users/SHOP4/.gemini/antigravity/scratch/seibi-app/seibi-app-main/.firebaserc)
Remove the staging alias from your Firebase project configuration.

```diff
  {
    "projects": {
-     "default": "seibi-app",
-     "staging": "seibi-app-staging"
+     "default": "seibi-app"
    }
  }
```

---

### 2. [MODIFY] [firebase-config.js](file:///C:/Users/SHOP4/.gemini/antigravity/scratch/seibi-app/seibi-app-main/public/js/data/firebase-config.js)
Clean up environment detection checks and completely delete the `stagingConfig`.

* **Changes to make:**
  * Delete lines 12–33 (Environment detection/URL search parameters check).
  * Delete `stagingConfig` constants (lines 46–55).
  * Change `const prodConfig` to `const firebaseConfig`.
  * Simplify `firebase.initializeApp(config)` to load `firebaseConfig` directly.
  * Update the indicator text in `updateStatusUI` to remove `(v34 · STAGING)` formatting.

---

### 3. [MODIFY] [index.html](file:///C:/Users/SHOP4/.gemini/antigravity/scratch/seibi-app/seibi-app-main/public/index.html)
Remove the unused environment query param from the service worker registration code (around lines 341–354).

```diff
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
-       const env = typeof SEIBI_ENV !== 'undefined' ? SEIBI_ENV : 'production';
-       navigator.serviceWorker.register(`./sw.js?env=${env}&v=34`)
+       navigator.serviceWorker.register('./sw.js?v=34')
          .then(registration => { ... })
      });
    }
  </script>
```

---

## Verification Plan

### Automated Verification
* Run local testing server.
* Ensure the console prints no reference errors, and confirms: `[Firebase] Successfully connected to the cloud database.`
* Run `git diff` to verify the codebase contains no occurrences of `stagingConfig` or `staging` environment variables.

### Manual Verification
* Navigate to the local host site.
* Verify that the database connection indicator reads: `🟢 Cloud Sync Active (v34)` (with no staging suffix).
* Test database actions (read/write notices, tasks) and verify they are updating directly to the production database `seibi-app`.
