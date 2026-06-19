# Seibi Application — Conversation Context

This file serves as a handoff context document for the next Antigravity AI coding assistant session. If you are starting a new session, please read this document to understand the codebase state, design decisions, and upcoming phases.

---

## Conversation Identity & Logs
* **Latest Conversation ID (Office PC):** `2b463725-39fb-409e-90be-d644223a925c`
* **Local Transcript Location (Office PC):** `C:\Users\SHOP4\.gemini\antigravity\brain\2b463725-39fb-409e-90be-d644223a925c\.system_generated\logs\transcript.jsonl`
* **User Project Workspace Cwd (Office PC):** `C:\Users\SHOP4\.gemini\antigravity\scratch\seibi-app`

---

## 🚀 Accomplished Roadmap Stages

### Stage 1 & 2: Multi-Language (EN/JP) & Custom Calendar Work Orders
* **Floating Language Toggle:** Added a premium toggle switcher (`🇺🇸 EN | 🇯🇵 JP`) floating in the app shell. Persists to `localStorage` and dynamically updates the UI via the `seibi_language_changed` event.
* **Custom Calendar Work Orders:** Added a **"＋ Custom Work Order"** modal allowing creation of calendar tasks not associated with a permanent asset (`assetId: null`). Custom tasks are interactive and can be checked/unchecked from both the calendar day drawer and home daily checklist.

### Stage 3: Robot & Regulator Checklist Decoupling & Categorization
* **Decoupled Checklists:**
  * Created a dedicated monthly **2-item checklist template** for Gas Regulators (`template-regulator`).
* **Seeded Assets:**
  * Seeded two Gas Regulator assets: `Regulator Pillar Left` (Pillar Left) and `Regulator Pillar Right` (Pillar Right) in the `_assetsSeed`.
* **Grinder & Sander Templates:** Defined checklist templates for Hand Grinder, Belt Grinder, and Mini Sander in the template registry. (Their definitions remain in the code, but they are not pre-populated as default seeded assets).
* **Categorized Asset List:** Grouped the assets tab into distinct headers: "Active Welding Robots", "Active Gas Regulators", "Active Grinders & Sanders" (empty for now), and "Offline Equipment".

### Stage 4: Wire Map Tab & Interactive Layout Builder
* **New Tab:** Added **"Wire Map"** tab between Assets and History in the bottom navigation bar. Has a custom monitor/map SVG icon.
* **Expanded Canvas Floor Plan (1160 × 630 px):** Enlarged the drawing space by approximately one weld table size (+100px width, +85px height). Main room right wall moved to `x=1146` and bottom wall to `y=478`. Storage extension bottom wall moved to `y=608`.
* **Interactive Layout Editor**:
  * Added "Edit Layout" mode. Reposition equipment elements (circles/rectangles) with drag-and-drop. Drag bounds are locked within room boundaries.
  * Added "Add Item" toolbar option with custom English/Japanese labels.
  * Added "Delete" (trash icon) to remove items from the draft layout.
  * Click events are captured (propagation stopped) on equipment in Edit Mode to prevent deselection on drag release.
  * Integrates with Firebase Realtime Database: "Save" locks the layout and syncs new positions/additions/deletions; "Cancel" reverts changes.

### Stage 5: Sudden Incident Reporting & Auto-Generation of Repair Tasks
* **Dedicated Logging Flow:** Added a prominent "Report Incident" modal button in the Notice Board toolbar and directly on each asset card in the Assets tab. Supports custom machine input.
* **Auto-generated Repair Work Orders**: When an incident or defect is logged, the system automatically schedules a **High-Priority Repair Work Order** on today's calendar and daily tasks checklist.
* **Bidirectional Task & Notice Sync**: Resolving notices checks off daily tasks, and completing repair tasks resolves notices.

### Stage 6: Cloud & Firebase Integration (v20 – v22)
* **Firebase Realtime Database Synchronization**:
  * Configured real-time, offline-capable synchronization loaders and listeners in `js/data/firebase-config.js` for `/assets`, `/templates`, `/notices`, `/tasks`, and `/history`.
  * Removed all blocking network promises from UI actions to prevent UI freeze during offline states.
* **Live Connection Status & Version Indicator**:
  * Added a connection badge in the top bar: `🟢 Cloud Sync Active (v22)` showing the live WebSocket state of the database and app cache version.
* **Safe Migration & Boot (v20)**:
  * Disabled the dangerous `firebaseDb.ref().remove()` call on client boot and version updates.
  * Version updates now only safely clear local storage keys starting with `seibi_` on the client (schema cleanup) and download the latest live data from Firebase without touching the remote data.
* **Timezone-Safe History Deletion (v21)**:
  * Resolved timezone offset issues where UTC history logs (`completedAt`) were directly sliced to match local JST dates.
  * Now, history deletions convert the UTC ISO string to JST local date format first, ensuring the completed checklist task properly rolls back to **Pending** status on the daily tasks.
* **Set Aside Checklist Items 6 & 8 (v22)**:
  * Commented out items 6 (`Check torch nozzle & tip`) and 8 (`Clean feeding rollers`) in the seed checklist for CO2/MAG robots.
  * Configured a one-time Firebase templates wipe check on `v22` upgrade to re-seed the templates list dynamically across all devices.
* **Asset Save & Template Recovery Fix (v23)**:
  * Solved a bug where editing assets with deleted custom templates caused silent failures on save. Added auto-recreation of custom templates on template updates.
  * Bypassed checklist filtering (using `null` month) in the edit modal to prevent deleting un-scheduled checklist items (semi-annual/annual checks) when saving edits.
* **Firebase Hosting**:
  * Deployed the site live at `https://seibi-app.web.app`.

---

## 📋 Database Schema & Keys

* `seibi_app_version`: Tracks migration resets (`v22_remove_items_6_8`).
* `seibi_assets`: Stores active/decommissioned equipment.
* `seibi_templates`: Stores checklist templates.
* `seibi_tasks`: Stores scheduled inspection tasks and custom work orders.
* `seibi_history`: Stores completed inspection records.
* `seibi_notices`: Stores notice board messages and defect repair logs.
* `seibi_language`: Stores preferred user language (`en` or `jp`).
* Wire map data remains in `js/data/wiremap.js` as static constants.

---

## 🔮 Next Steps

1. **Wire Map Line Editing**:
   * Add interactive wire/connection editing or line drawing between items on the map after locking the positions.
   * Customize wire naming or routing on the layout.

### Stage 7: PWA, Manual View, & Push Notifications
* **Manual View:** Added a dedicated PDF manual viewer tab in the main navigation.
* **Progressive Web App (PWA):** Created `manifest.json` and `sw.js` to enable "Add to Home Screen" installation and offline asset caching (stale-while-revalidate strategy).
* **Push Notifications (FCM):**
  * Created `firebase-messaging-sw.js` and `js/services/notifications.js`.
  * Set up `vapidKey` for both production and staging environments to uniquely identify Chrome pushes.
  * Added UI banner to politely request notification permissions on login.
* **Cloud Functions & Staging Environment:**
  * Created a Firebase Cloud Function `dailyMaintenanceReminder` scheduled for 8:30 AM JST.
  * Created a test HTTP endpoint `testNotification` to manually trigger the reminder broadcast for testing.
  * Deployed a separate `seibi-app-staging` project for development and isolated testing of FCM endpoints.
