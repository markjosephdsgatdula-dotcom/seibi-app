# Implementation Plan: Modular Refactoring of Assets View

This plan describes how to refactor the monolithic public/js/views/assets.js (66 KB, 1,519 lines) into three clean, single-responsibility files using the existing IIFE (Immediately Invoked Function Expression) architecture.

---

## User Review Required

* **Script Loading Order:** Since this project uses standard script tags instead of ES Modules, the new component and service files must be loaded in public/index.html **before** the main view file.
* **No Structural Break:** We will not convert the codebase to modern ES module imports (type="module"), as doing so would require rewriting how all global namespaces (App, I18n, Router) interact. We will stick to the project's current robust global namespace system.

---

## Proposed Changes

We will split the assets view logic into three distinct layers:
1. **Component Layer (js/components/asset-card.js):** Pure UI layout generator (returns HTML strings for rendering).
2. **Service Layer (js/services/asset-service.js):** Pure calculation and validation logic.
3. **Controller Layer (js/views/assets.js):** Handles DOM bindings, event listeners, and data-sync triggers.

---

### 1. Create [NEW] js/components/asset-card.js
Extract all HTML string-building functions from the view. This file will only concern itself with what visual elements look like.

* **Functions to extract:**
  * _statusBadge(status): Generates status badges with SVG icons.
  * _renderCard(asset): Generates the HTML layout for individual asset cards.

---

### 2. Create [NEW] js/services/asset-service.js
Extract helper computations, form validations, and calculations from the view. This file contains no HTML generation or DOM calls.

* **Functions/Variables to extract:**
  * Date helper calculation functions.
  * groupAssetsByCategory(assets): Groups and sorts assets into Category Headers ("Active Welding Robots", "Active Gas Regulators", "Offline Equipment").
  * validateAssetForm(formData): Validates new asset fields.

---

### 3. [MODIFY] js/views/assets.js
We will clean up the view controller. It will now only bind click listeners, manage modal open/close states, handle input submissions, and trigger refreshes when language changes.

* **Key cleanups:**
  * Delete the large HTML string builders (use the new AssetCard component namespace).
  * Delete logic calculations (use the new AssetService namespace).

---

### 4. [MODIFY] public/index.html
Register the new files in the scripts section, ensuring they load in the correct order.

```diff
  <script src="js/data/assets.js?v=31"></script>
  <script src="js/views/home.js?v=31"></script>
  <script src="js/views/calendar.js?v=31"></script>
  <script src="js/views/history.js?v=31"></script>
  <script src="js/views/notice.js?v=31"></script>
+ <script src="js/components/asset-card.js?v=31"></script>
+ <script src="js/services/asset-service.js?v=31"></script>
  <script src="js/views/assets.js?v=31"></script>
  <script src="js/data/wiremap.js?v=31"></script>
```

---

## Verification Plan

### Automated Verification
* Open browser Developer Tools and check the console. Ensure no load-order errors occur (Uncaught ReferenceError: AssetCard is not defined).
* Run git diff on assets.js to ensure code line count decreases significantly.

### Manual Verification
1. **List Check:** Open the "Assets" tab and verify the Welding Robots and Gas Regulators cards load, show correct status badges, and are properly grouped.
2. **Interactive Check:** Open the inspection checklist for any asset, complete the checks, and click "Submit". Verify data saves and is updated.
3. **Form Check:** Open the "Add New Asset" form, test validation triggers, and successfully register a mock asset.
