# 🧠 Seibi App — Checklist & Asset Brainstorming (Option B)

This is an interactive document for brainstorming the new checklists and the implementation of **Option B (Separate Main Gas Utility Asset)**. Both of us can edit this file to share ideas, refine the templates, and finalize the data schemas before modifying any code.

---

## 💬 Brainstorming Sandbox
*Use this section to write notes, questions, or alternative ideas.*

* **[AI Note]:** I have drafted the new **Main Gas Utility** asset structure below. Since the "Courtyard Gas pressure gauge" is a facility-wide utility, having it as a separate asset is highly clean. It prevents the check from being duplicated or misplaced under individual welding robots.
* **[User Comment]:** *(Feel free to add your thoughts here!)*

---

## 🛠️ Proposed Asset Registry & Templates (Option B)

Here is how we can model the assets and templates in the codebase:

### 1. New Asset: Main Gas Utility (1F Courtyard)
We will register a new asset under the Utility category:
```json
{
  "id": "asset-utility-gas-01",
  "name": "Main Gas Utility (1F Courtyard)",
  "type": "UTILITY",
  "status": "healthy",
  "lastInspected": "2026-06-10",
  "dueDate": "2026-07-08",
  "model": "Main Gas Supply System",
  "location": "1F Courtyard",
  "templateId": "template-utility-gas"
}
```

### 2. New Template: Main Gas Utility Template (`template-utility-gas`)
This template will hold the facility-level gas gauge checks:
```json
{
  "id": "template-utility-gas",
  "name": "Main Gas Utility Template",
  "items": [
    {
      "id": 1,
      "title": "Check gas pressure needle",
      "desc": "1F中庭 ガス圧計ゲージの針確認（異常時は大丸エナウィンに連絡）",
      "freq": "monthly",
      "image": "image2.jpeg"
    }
  ]
}
```

---

## 🦾 Draft: Periodic Checksheets (Revised)

Below are the proposed technical periodic checklist items for all equipment.

### Category 1: CO2/MAG Welding Robots (`template-co2-mag`)
*Nozzle/tip cleaning and feeding roller air blows are removed (moved to daily operations). Courtyard gas pressure needle check is moved to Utility.*

* **Monthly Checks:**
  1. **Clean rear filter (溶接機裏側のフィルター清掃):** Prevents overheating in welder power electronics.
  2. **Check abnormal joint & fan noises (電源ON時の異音確認):** Verifies gear and cooling fan motors.
  3. **Test E-Stop & Safety Gates (非常停止・インターロック作動確認):** Tests teach pendant E-stop and safety door gates.
  4. **Inspect cable harness wear (電気配線の目視破損確認):** Checks external cables/flexible conduit for cracking.
  5. **Inspect robot alignment (定盤位置出し確認):** Verifies TCP alignment against fixtures (A, B, C).
  6. **Inspect gearbox grease leaks (各軸減速機のグリス漏れ点検):** Check joints for leaks.
  7. **Inspect shock sensor safety (トーチ衝突検知センサー動作テスト):** Verifies robot halts on torch bump.
  8. **Clean feeder drive rolls (送給ローラー摩耗・ギヤ部の点検):** Technical check of roll groove wear and gear backlash.
* **Semi-Annual Checks:**
  9. **Clean conduit hose (コンジットホース内のアルコール清掃):** Internal cable liner cleaning.
  10. **Inspect mechanical limits (ストッパー・リミットスイッチの緩み点検):** Physically inspects travel buffers.
* **Annual Checks:**
  11. **Blow air inside machine (溶接機内のエアブロー清掃):** Dust removal.
  12. **Torque main terminal screws (溶接機内部の端子台ねじ締め付け):** Prevents heat build-up.
  13. **Replace encoder backup batteries (本体エンコーダ用バッテリーの交換):** **Must be done with power ON** to prevent origin loss.
  14. **Replace CPU backup battery (コントローラーCPUボード用バッテリーの交換):** Protects jobs/programs from being wiped on power down.

### Category 2: Gas Regulators (`template-regulator`)
*Specifically for regulator pillar assets.*
1. **Check gas leaks (ガス漏れ確認):** Spray test regulator, coupling, and pipes with leak detection spray. (Monthly)
2. **Adjust and verify flow rate (流量12L/min調整・動作確認):** Verify correct flow output. (Monthly)

### Category 3: Main Gas Utility (`template-utility-gas`)
*Specifically for courtyard gas supply utilities.*
1. **Check gas pressure needle (ガス圧計ゲージの針確認):** Inspect 1F courtyard main gauge pressure needle. (Monthly)

---

## 🔥 Firebase & Data Safety

### Current Architecture (How It Works Right Now)

```
┌─────────────────┐         ┌────────────────────────────────────────────┐
│  Your Tablet /  │ ◄─────► │  Firebase Realtime Database (PRODUCTION)  │
│  Browser at     │  live   │  seibi-app-default-rtdb                   │
│  seibi-app.     │  sync   │  .asia-southeast1.firebasedatabase.app    │
│  web.app        │         │                                           │
└─────────────────┘         │  /assets    ← real equipment data         │
                            │  /templates ← real checklist templates    │
┌─────────────────┐         │  /tasks     ← real scheduled tasks        │
│  This Local     │ ◄─────► │  /notices   ← real incident reports       │
│  Workspace      │  ALSO   │  /history   ← real completed records      │
│  (Antigravity)  │  live   │                                           │
│                 │  sync!  │  ⚠️ THERE IS ONLY ONE DATABASE.           │
└─────────────────┘         │  ALL DEVICES SHARE THE SAME DATA.         │
                            └────────────────────────────────────────────┘
```

### ⚠️ Key Finding: YES, Local Changes Mirror to Firebase!

When you open `index.html` from this local workspace in a browser (or if the app boots), it will:
1. Connect to the **same production Firebase database** at `seibi-app-default-rtdb`
2. Any seed data changes or version bumps **will sync to your live production data**

The dangerous mechanism is in `app.js` line 168:
```js
const APP_VERSION = 'v22_remove_items_6_8';
```
If we change this version string, on next boot the app will:
1. **Wipe ALL `seibi_*` localStorage keys** (lines 196-201)
2. **Delete Firebase `/templates` entirely** (line 207)
3. Re-seed from the hardcoded defaults

**This WILL erase your real production data if we're not careful!**

---

### ✅ Safe Strategy: How to Preserve Your Real Data

Here is the plan to safely add the new Gas Utility asset and update checklists **without erasing existing data**:

#### Option A: Smart Migration (Recommended)
Instead of bumping the version (which wipes everything), we write a **one-time migration function** that:
- **Adds** the new `template-utility-gas` to the existing templates array (without replacing it)
- **Adds** the new `asset-utility-gas-01` to the existing assets array (without replacing it)
- **Removes** Item #2 ("Check gas pressure needle") from the `template-co2-mag` items in Firebase
- Uses a **migration flag** like `seibi_migration_v23_gas_utility_done` so it only runs once
- **Does NOT touch** tasks, history, notices, or any other data

#### Option B: Firebase Console Manual Edit
We manually go to your Firebase console and:
1. Add the new template and asset directly in the database
2. Remove Item #2 from the robot template
3. No code version bump needed at all

#### Option C: Create a Staging Firebase Project (Best Long-Term)
Create a **second Firebase project** (e.g., `seibi-app-staging`) for development:
- Free tier is more than enough
- We add an environment toggle so you can switch between `staging` and `production`
- All development/testing happens on staging; only deploy to production when confident

**I recommend combining Option A + Option C**: Set up a staging project now, test all changes there, then deploy the safe migration to production.

---

## 📖 New Feature: Manual Tab (How-To Guides)

### Concept
A new **"Manual"** tab after the Notice tab that serves as a knowledge base / tutorial library for each checklist item. Each checklist item gets a companion "How to?" link that opens the relevant guide.

### UI Flow
```
┌──────────────────────────────────────────────────┐
│  Home │ Assets │ WireMap │ History │ Notice │ 📖  │
│                                              ▲   │
│                                        Manual Tab│
└──────────────────────────────────────────────────┘

On the Checklist Screen:
┌──────────────────────────────────────────────────┐
│  ☐  Clean rear filter                           │
│      溶接機裏側のフィルター清掃                    │
│      📖 How to?  ← clickable, jumps to Manual   │
├──────────────────────────────────────────────────┤
│  ☐  Test E-Stop & Safety Gates                   │
│      非常停止ボタンの作動確認                      │
│      📖 How to?  ← clickable, jumps to Manual   │
└──────────────────────────────────────────────────┘

Inside the Manual Tab:
┌──────────────────────────────────────────────────┐
│  📖 Maintenance Manual                           │
│  ─────────────────────────────────────────────── │
│  🔍 Search...                                    │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ 📋 Clean Rear Filter                      │  │
│  │ フィルター清掃                              │  │
│  │                                            │  │
│  │ Step 1: Locate the rear filter panel...    │  │
│  │ Step 2: Remove the filter carefully...     │  │
│  │ Step 3: Blow with compressed air...        │  │
│  │                                            │  │
│  │ 📸 [Reference Photo]                      │  │
│  │ ⚠️ Safety Note: Wear a dust mask          │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ 📋 Test E-Stop & Safety Gates             │  │
│  │ ...                                        │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### Data Model for Manuals
Each manual entry is linked to a checklist item by a shared key:
```json
{
  "id": "manual-clean-rear-filter",
  "linkedItemTitle": "Clean rear filter",
  "title_en": "How to Clean the Rear Filter",
  "title_jp": "溶接機裏側のフィルター清掃の手順",
  "steps": [
    {
      "step": 1,
      "text_en": "Open the rear panel of the welding machine.",
      "text_jp": "溶接機の裏側パネルを開けます。",
      "image": "manual/filter-step1.jpeg",
      "safety_note": "Ensure the machine power is OFF before opening."
    }
  ],
  "category": "template-co2-mag"
}
```

### Implementation Considerations
- Manual content can be stored in Firebase under `/manuals` node
- OR as a static JS data file (since manuals don't change often)
- The "How to?" link on each checklist item uses the item title or ID to find the matching manual entry
- Manual content is bilingual (EN/JP) matching the existing i18n system

---

## 📝 Questions & Discussion Points

1. **How should Category headers render in the UI?**
   * Currently, the UI categorizes assets as: "Active Welding Robots", "Active Gas Regulators", and "Active Grinders/Sanders".
   * With Option B, we should add a new category header: **"Facility Utilities"** or **"Gas Utilities"** to cleanly host the "Main Gas Utility (1F Courtyard)" asset.
2. **Test/Staging Environment:**
   * Should I help you create a second Firebase project for staging? It's free and takes 5 minutes.
3. **Manual Content:**
   * Do you already have photos/steps written somewhere (paper manual, Excel)? Or should we draft them from scratch?
   * Should the manual be editable from the app, or is it read-only content that only we update through code?
4. **File Paths to update when ready:**
   * Checklist items seed data: [assets.js](file:///C:/Users/SHOP4/.gemini/antigravity/scratch/seibi-app/seibi-app-main/js/data/assets.js)
   * Japanese & English UI translations: [i18n.js](file:///C:/Users/SHOP4/.gemini/antigravity/scratch/seibi-app/seibi-app-main/js/data/i18n.js)
   * Assets view layout: [assets.js](file:///C:/Users/SHOP4/.gemini/antigravity/scratch/seibi-app/seibi-app-main/js/views/assets.js)
   * Boot migration logic: [app.js](file:///C:/Users/SHOP4/.gemini/antigravity/scratch/seibi-app/seibi-app-main/js/app.js)
   * **[NEW]** Manual data: `js/data/manuals.js`
   * **[NEW]** Manual view: `js/views/manual.js`
   * **[NEW]** Manual CSS: `css/manual.css`
