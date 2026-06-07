# Seibi Application — Conversation Context

This file serves as a handoff context document for the next Antigravity AI coding assistant session. If you are starting a new session, please read this document to understand the codebase state, design decisions, and upcoming phases.

---

## Conversation Identity & Logs
* **Latest Conversation ID (Home PC):** `683c8ea3-7e81-48af-b646-cc11271fc721`
* **Local Transcript Location:** `C:\Users\markj\.gemini\antigravity\brain\683c8ea3-7e81-48af-b646-cc11271fc721\.system_generated\logs\transcript.jsonl`
* **User Project Workspace Cwd:** `C:\Users\markj\.gemini\antigravity\scratch\seibi-app`

* **Previous Conversation ID (Work Laptop):** `63fc3114-d59f-44d5-9309-be0b9700737c`
* **Previous Workspace Cwd:** `C:\Users\SHOP4\.gemini\antigravity\scratch\seibi-app\seibi-app-main`

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
  * Added `localStorage.removeItem('seibi_templates');` to the reset block.
* **Categorized Asset List:** Grouped the assets tab into distinct headers: "Active Welding Robots", "Active Gas Regulators", "Active Grinders & Sanders" (empty for now), and "Offline Equipment".

### Stage 4: Wire Map Tab (Completed in Phase 3 — Home PC session)
* **New Tab:** Added **"Wire Map"** tab between Assets and History in the bottom navigation bar. Has a custom monitor/map SVG icon.
* **Files Added:**
  * `js/data/wiremap.js` — Equipment layout data (positions, types, labels EN/JP) + 30 sample wire connection records.
  * `js/views/wiremap.js` — `WireMapView` controller: renders the SVG floor plan, injects clickable equipment elements, manages the slide-in detail panel.
  * `css/wiremap.css` — All Wire Map styles. **Critical note:** `display` is NOT set on `#view-wiremap` directly — it must be managed entirely by `.view` / `.view.active` in `app.css` to avoid the ID-specificity override bug.
* **Files Modified:**
  * `index.html` — Added `<link>` for wiremap.css, `<section id="view-wiremap">`, nav tab button, and `<script>` tags for wiremap data + view.
  * `js/router.js` — Registered `wiremap` in the `VIEWS` registry.
  * `js/app.js` — Added `WireMapView.init()` in `_boot()`, added `WireMapView.refresh()` in language change listener, exposed `WireMapView` in the public return object.
* **Floor Plan Layout (canvas: 1060 × 545 px):**
  * Main welding floor room: x=14, y=22 → w=1032, h=374 (bottom wall at y=396)
  * Bottom-left storage extension: x=14, y=396 → w=155, h=130
  * Equipment: 4 Pillars (A–D), 3 Gas Tanks (A–C), 9 Controllers + Weld Mach, 2 TIG Welders, 2 CO2 Welders, 6 Robots, 9 Weld Tables (+ 1 Right), 2 Torches
  * "Regulators" labels shown as small text above Pillars A, B, D (they are labels, not separate interactive elements).
* **Wire Interaction:** Clicking any equipment item opens a sliding right panel showing all connected wires with: label (W-001…), direction (→ from / ← to), condition badge (Good/Fair/Poor), type, gauge, color, length, and notes.
* **Wire Data Schema (in `WireMapStore.WIRES`):**
  * `id`, `label` (e.g., "W-001"), `from` (equipment id), `to` (equipment id)
  * `type` (Power / Ground / Signal / Gas Hose / Bus / Torch Cable)
  * `gauge`, `color`, `length`, `condition` (Good / Fair / Poor), `notes`
* **Known Pending Refinements:** User noted the map layout is "alright for now" — exact positions of some machines may need further fine-tuning to precisely match the hand-drawn workshop sketch shared in the home PC session. The sketch image is NOT stored in the repo — refer to the home PC conversation transcript if needed.

---

## 📋 Database Schema & Keys

* `seibi_app_version`: Tracks migration resets (`v8_clean`).
* `seibi_assets`: Stores active/decommissioned equipment.
* `seibi_templates`: Stores checklist templates (`template-co2-mag`, `template-regulator`, `template-grinder`, etc.).
* `seibi_tasks`: Stores scheduled inspection tasks and custom work orders.
* `seibi_history`: Stores completed inspection records.
* `seibi_notices`: Stores notice board messages and defect repair logs.
* `seibi_language`: Stores preferred user language (`en` or `jp`).
* Wire map data is **not** in localStorage — it lives in `js/data/wiremap.js` as static JS constants (`WireMapStore`). Future phase may migrate to localStorage or Firebase.

---

## 🔮 Next Steps (Phase 4 and onwards)

1. **Phase 3 continued — Wire Map Refinements (if needed):**
   * Fine-tune equipment positions to exactly match the workshop floor sketch.
   * The user may want to add/edit wires manually in the UI (currently edit-only via `wiremap.js`).
   * Wire labels should follow the format: A1, B1, B2 (per original Phase 3 spec). Current labels are W-001, W-002 — rename if user prefers A1/B1 style.
   * Wire states to track: **lifetime/age**, **damaged**, **healthy** (per original spec — currently using Good/Fair/Poor).
2. **Phase 4: Cloud & Firebase Integration:**
   * **Goal:** Migrate local storage database to Firebase free tier.
   * **Requirements:** Store pictures and history. Support offline editing (save to tablet temporarily on slow/no connection) and upload when WiFi is online.
3. **Phase 5: Task Reminders & Notifications:**
   * **Goal:** Operational email or push alert notification system when maintenance tasks are overdue or defects are logged.
