/**
 * router.js — Instant view-switching router for Seibi
 *
 * Design decisions:
 * - Pure DOM show/hide (display flex/none).  No CSS transitions,
 *   no animation frames — keeps old iPad GPU pressure at zero.
 * - ARIA roles (tablist/tab/tabpanel) maintained in sync with DOM state.
 * - Active view stored in sessionStorage so a page reload restores position.
 * - Hash-based URL (#home, #assets, #history, #notice) for bookmarkability
 *   and back-button support without a server.
 *
 * Phase 2 note: swap the VIEWS registry with a dynamic import() map when
 * new views (e.g., WireCableManagement) are added.
 */

'use strict';

const Router = (() => {

  // ─── Registry ────────────────────────────────────────────────────────────
  /** Map of viewId → { tab, panel } DOM elements */
  const VIEWS = {
    home:    { tabId: 'tab-home',    panelId: 'view-home'    },
    assets:  { tabId: 'tab-assets',  panelId: 'view-assets'  },
    history: { tabId: 'tab-history', panelId: 'view-history' },
    notice:  { tabId: 'tab-notice',  panelId: 'view-notice'  },
  };

  const DEFAULT_VIEW = 'home';
  let _currentView   = null;

  // ─── Internal helpers ─────────────────────────────────────────────────────

  function _resolveHash() {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    return VIEWS[hash] ? hash : null;
  }

  function _deactivateAll() {
    for (const [id, { tabId, panelId }] of Object.entries(VIEWS)) {
      const tab   = document.getElementById(tabId);
      const panel = document.getElementById(panelId);

      if (tab) {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
        tab.setAttribute('tabindex', '-1');
      }
      if (panel) {
        panel.classList.remove('active');
      }
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Navigate to a view instantly.
   * @param {string} viewId  — key from VIEWS registry
   * @param {boolean} [updateHash=true]
   */
  function navigate(viewId, updateHash = true) {
    if (!VIEWS[viewId]) {
      console.warn(`[Router] Unknown view: "${viewId}"`);
      return;
    }
    if (viewId === _currentView) return;   // No-op if already there

    _deactivateAll();

    const { tabId, panelId } = VIEWS[viewId];
    const tab   = document.getElementById(tabId);
    const panel = document.getElementById(panelId);

    if (tab) {
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      tab.setAttribute('tabindex', '0');
    }
    if (panel) {
      panel.classList.add('active');
      // Scroll panel to top on tab switch
      panel.scrollTop = 0;
    }

    _currentView = viewId;

    // Persist for session restore
    try { sessionStorage.setItem('seibi_view', viewId); } catch (_) {}

    // Update URL hash without pushing a new history entry
    if (updateHash) {
      history.replaceState(null, '', `#${viewId}`);
    }
  }

  /** Restore view from URL hash → session storage → default */
  function init() {
    const fromHash    = _resolveHash();
    let   fromSession = null;
    try { fromSession = sessionStorage.getItem('seibi_view'); } catch (_) {}

    const target = fromHash || (VIEWS[fromSession] ? fromSession : null) || DEFAULT_VIEW;
    navigate(target, /* updateHash */ true);

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      const hash = _resolveHash();
      if (hash) navigate(hash, false);
    });
  }

  /** Expose current view id (read-only) */
  function current() { return _currentView; }

  return { navigate, init, current };

})();
