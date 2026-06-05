# Seibi Application — Conversation Context

This file serves as a handoff context document for the next Antigravity AI coding assistant session. If you are starting a new session, please read this document to understand the codebase state, design decisions, and upcoming phases.

---

## Conversation Identity & Logs
* **Active Conversation ID:** `63fc3114-d59f-44d5-9309-be0b9700737c`
* **Local Transcript Location:** `C:\Users\SHOP4\.gemini\antigravity\brain\63fc3114-d59f-44d5-9309-be0b9700737c\.system_generated\logs\transcript.jsonl`
* **User Project Workspace Cwd:** `C:\Users\SHOP4\.gemini\antigravity\scratch\seibi-app\seibi-app-main`

---

## 🚀 Accomplished Roadmap Stages

### Stage 1 & 2: Multi-Language (EN/JP) & Custom Calendar Work Orders (Completed in Phase 1)
* **Floating Language Toggle:** Added a premium toggle switcher (`🇺🇸 EN | 🇯🇵 JP`) floating in the app shell. Persists to `localStorage` and dynamically updates the UI via the `seibi_language_changed` event.
* **Custom Calendar Work Orders:** Added a **"＋ Custom Work Order"** modal allowing creation of calendar tasks not associated with a permanent asset (`assetId: null`). Custom tasks are interactive and can be checked/unchecked from both the calendar day drawer and home daily checklist.

### Stage 3: Robot & Regulator Checklist Decoupling & Categorization (Completed in Phase 2)
* **Decoupled Checklists:**
  * Removed the regulator gas check item (originally #8) from the main Welding Robot checklist, reducing the robot checksheet to a clean 11-item layout.
  * Created a dedicated monthly **2-item checklist template** for Gas Regulators (`template-regulator`):
    1. Check for gas leaks (spray check, utilizing `image8.jpeg` reference).
    2. Check/adjust flow rate (12 L/min, utilizing `image8.jpeg` reference).
* **Seeded Assets:**
  * Seeded two Gas Regulator assets: `Regulator Pillar Left` (Pillar Left) and `Regulator Pillar Right` (Pillar Right) in the `_assetsSeed`.
  * Scheduled default monthly inspection tasks for these regulators on the calendar database seed (due 2026-06-10).
* **Grinder & Sander Templates:** Defined checklist templates for Hand Grinder, Belt Grinder, and Mini Sander in the template registry. However, **per user instruction, do not add grinders/sanders as default seeded assets yet** (their definitions remain in the code, but they are not pre-populated in the database).
* **App Version Migration Reset:**
  * Bumped `APP_VERSION` to `'v8_clean'` in `js/app.js`.
  * Added `localStorage.removeItem('seibi_templates');` to the reset block. This ensures that the user's browser wipes the old template cache and successfully populates the new Gas Regulator assets with exactly 2 checklist items.
* **Categorized Asset List:** Grouped the assets tab into distinct headers: "Active Welding Robots", "Active Gas Regulators", "Active Grinders & Sanders" (empty for now), and "Offline Equipment".

---

## 📋 Database Schema & Keys

* `seibi_app_version`: Tracks migration resets (`v8_clean`).
* `seibi_assets`: Stores active/decommissioned equipment.
* `seibi_templates`: Stores checklist templates (`template-co2-mag`, `template-regulator`, `template-grinder`, etc.).
* `seibi_tasks`: Stores scheduled inspection tasks and custom work orders.
* `seibi_history`: Stores completed inspection records.
* `seibi_notices`: Stores notice board messages and defect repair logs.
* `seibi_language`: Stores preferred user language (`en` or `jp`).

---

## 🔮 Next Steps (Phase 3 and onwards)

1. **Phase 3: Wires & Hoses Map:**
   * **Goal:** Create a visual grid map tab for maintaining workshop wires and cables.
   * **Requirements:** Wires will have labels (e.g. A1, B1, B2). Tracks 3 states: lifetime/age, damaged, or healthy.
   * **Status:** Currently paused until the user shares their copy/image of the workshop layout map.
2. **Phase 4: Cloud & Firebase Integration:**
   * **Goal:** Migrate local storage database to Firebase free tier.
   * **Requirements:** Store pictures and history. Support offline editing (save to tablet temporarily on slow/no connection) and upload when WiFi is online.
3. **Phase 5: Task Reminders & Notifications:**
   * **Goal:** Operational email or push alert notification system when maintenance tasks are overdue or defects are logged.
