# Seibi App — Architect-Builder Context

Live URL: https://seibi-app.web.app
GitHub: https://github.com/markjosephdsgatdula-dotcom/seibi-app

---

## Stack
- **Frontend**: Vanilla HTML / CSS / JavaScript (no framework)
- **Database**: Firebase Realtime Database (asia-southeast1 RTDB)
- **Storage**: Firebase Cloud Storage (`/photos/` path)
- **Auth**: Firebase Authentication (email/password, role-based: Admin / Operator)
- **Hosting**: Firebase Hosting
- **Notifications**: Firebase Cloud Messaging (FCM) + Cloud Functions (Gen 2)
- **PWA**: `manifest.json` + `sw.js` (Service Worker, cache-busting `?v=37`)

---

## Architecture

```
Firebase RTDB ──► FirebaseSync (firebase-config.js)
                      │  real-time .on('value') listeners
                      ▼
              In-memory cache (FirebaseSync.cache)
                      │
        ┌─────────────┼──────────────┐
        ▼             ▼              ▼
   Data Stores    Services        Views
  (notices.js,  (asset-service, (assets.js,
   history.js,   notice-service, notice.js,
   assets.js)    image-service,  history.js,
                 auth-service,   home.js,
                 calendar-svc,   wiremap.js,
                 notifications)  manual.js)
                      │
              Components (reusable UI)
          (asset-card, asset-modal,
           notice-card, login-modal,
           calendar-grid, wiremap-svg)
```

- **Photos**: Compressed to JPEG Blob client-side (`image-service.js`) → uploaded to Cloud Storage → only HTTPS URL saved to RTDB.
- **History**: Limited to last 50 records via `.limitToLast(50)`. Writes use targeted child paths, not full-array overwrites.
- **Auth flow**: Auth token resolved before database listeners attach (prevents Permission Denied on first login).

---

## Key Features / Current State

**Stable Baseline — v27 (script cache `?v=37`)**

- ✅ Role-based login (Admin / Operator) with Firebase Auth
- ✅ Asset management with per-asset custom checklist templates
- ✅ Monthly inspection checklists with photo capture (Cloud Storage upload)
- ✅ Notice Board: incident/defect reporting with photo, auto-repair task generation
- ✅ History Log: completed inspections + repair records, sorted by date or machine
- ✅ Wire Map: interactive SVG floor plan with drag-and-drop equipment editor
- ✅ Calendar: monthly view with daily task drawer + custom work orders
- ✅ Manual tab: PDF/reference manual viewer
- ✅ EN/JP bilingual UI (full i18n via `i18n.js`)
- ✅ Push notifications via FCM + scheduled Cloud Functions
- ✅ Firebase Storage migration: no Base64 images in RTDB (99.9% bandwidth reduction)
- ✅ Live database sanitized: all test/mock entries purged from `/notices`, `/history`, `/tasks`, `/assets`
- ✅ Custom robot checklist reference photos restored to Cloud Storage with token URLs
- ✅ P0 Security Fixes: Stored XSS protection (HTML escaping for author/initials in notices), role-based delete action guards (delete button restricted to Admin, deleteNotice function-level guard), and removal of unauthenticated test Cloud Function.
- ✅ P1 NoticeStore Targeted Writes: Replaced full array overwrites with single-item path writes (`set`, `update`, `remove`) and added automatic legacy array to ID-keyed object migration.
- ✅ P2 Data-View Decoupling: Decoupled data stores from views by replacing 21 direct view controller calls with a centralized `seibi_data_changed` custom event system.

---

## Known Issues

None currently (Stable Baseline).

---

## Rules (Architect-Builder Workflow)

1. **Keep functions modular.** One responsibility per function. Do not add logic to unrelated modules.
2. **Do not modify unrelated components.** If a change affects file X, touch only file X (and its direct dependency if unavoidable).
3. **Return only changed lines (Diff-only).** When proposing code changes, output only the modified lines with context — never rewrite entire files.
4. **Do not scan whole directories without permission.** Read only files explicitly mentioned in the prompt or their direct imports.
5. **Plan before building.** For any non-trivial change, produce an implementation plan first and wait for explicit approval before writing code.
