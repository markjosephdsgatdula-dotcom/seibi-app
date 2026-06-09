# Seibi Application — Conversation Context

This file serves as a handoff context document for the next Antigravity AI coding assistant session. If you are starting a new session, please read this document to understand the codebase state, design decisions, and upcoming phases.

---

## Conversation Identity & Logs
* **Latest Conversation ID (Home PC):** `683c8ea3-7e81-48af-b646-cc11271fc721`
* **Local Transcript Location:** `C:\Users\markj\.gemini\antigravity\brain\683c8ea3-7e81-48af-b646-cc11271fc721\.system_generated\logs\transcript.jsonl`
* **User Project Workspace Cwd:** `C:\Users\markj\.gemini\antigravity\scratch\seibi-app`

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

### Stage 4: Wire Map Tab
* **New Tab:** Added **"Wire Map"** tab between Assets and History in the bottom navigation bar. Has a custom monitor/map SVG icon.
* **Floor Plan Layout (canvas: 1060 × 545 px):** Renders the SVG floor plan, injects clickable equipment elements, and manages the slide-in detail panel showing all connected wires (W-001... W-030).

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

1. **Wire Map Refinements**:
   * Add interactive wire editing or rename wire labels (e.g. W-001 -> A1/B1) if required by the user.
2. **Task Reminders & Notifications (Phase 5)**:
   * Alert operators via email or push notifications when maintenance tasks are overdue.
