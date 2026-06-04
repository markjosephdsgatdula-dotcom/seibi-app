/**
 * app.js — Seibi Application Bootstrap
 *
 * Assembles all modules into the global `App` namespace that inline handlers
 * in index.html reference.  Runs after the DOM is ready.
 *
 * Module map:
 *   App.Nav          → wraps Router.navigate()
 *   App.HomeView     → HomeView controller
 *   App.HistoryView  → HistoryView controller
 *
 * Phase 2: additional view controllers (Assets, Notice, WiresCables) will
 * be registered here without modifying the router or nav component.
 */

'use strict';

const App = (() => {

  // ─── Namespace assembly ───────────────────────────────────────────────────

  const Nav = {
    /**
     * Called by bottom-nav onclick handlers.
     * @param {'home'|'assets'|'history'|'notice'} viewId
     */
    switchTo(viewId) {
      Router.navigate(viewId);
    },
  };

  // ─── Initialisation ───────────────────────────────────────────────────────

  function _boot() {
    // Migration check: Reset local storage keys if on an older version
    const APP_VERSION = 'v5_clean';
    try {
      if (localStorage.getItem('seibi_app_version') !== APP_VERSION) {
        localStorage.removeItem('seibi_notices');
        localStorage.removeItem('seibi_history');
        localStorage.removeItem('seibi_assets');
        localStorage.removeItem('seibi_tasks');
        localStorage.setItem('seibi_app_version', APP_VERSION);
        console.log('[Seibi] LocalStorage cleared for clean data seed.');
      }
    } catch (_) {}

    // Initialise view controllers
    HomeView.init();
    CalendarView.init();
    HistoryView.init();
    NoticeView.init();
    AssetsView.init();

    // Initialise router last (it will activate the first view)
    Router.init();

    console.log('[Seibi] App booted successfully.');
  }

  // Wait for DOM before booting
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _boot);
  } else {
    _boot();
  }

  // ─── Public surface ───────────────────────────────────────────────────────
  return {
    Nav,
    HomeView,
    CalendarView,
    HistoryView,
    NoticeView,
    AssetsView,
  };

})();
