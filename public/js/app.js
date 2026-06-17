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

  // Database cleanup and migrations (V23/V24) have been removed
  // as the app now relies purely on Firebase as the single source of truth.

  // ─── Translations & Language Switcher ─────────────────────────────────────

  function _translateStaticShell() {
    if (typeof I18n === 'undefined') return;
    const mappings = {
      '#tab-home .nav-label': 'nav_home',
      '#tab-assets .nav-label': 'nav_assets',
      '#tab-history .nav-label': 'nav_history',
      '#tab-notice .nav-label': 'nav_notice',
      '#tab-manual .nav-label': 'nav_manual',
      '#view-assets .view-title': 'nav_assets',
      '#view-history .view-title': 'hist_title',
      '#view-manual .view-title': 'manual_title'
    };
    for (const [selector, key] of Object.entries(mappings)) {
      const el = document.querySelector(selector);
      if (el) el.textContent = I18n.t(key);
    }
  }

  function _updateLangUI(lang) {
    const enBtn = document.getElementById('lang-btn-en');
    const jpBtn = document.getElementById('lang-btn-jp');
    if (enBtn && jpBtn) {
      enBtn.classList.toggle('active', lang === 'en');
      jpBtn.classList.toggle('active', lang === 'jp');
    }
  }

  // ─── Initialisation ───────────────────────────────────────────────────────

  function _boot() {
    // Initialize language engine first
    if (typeof I18n !== 'undefined') {
      I18n.init();
      _updateLangUI(I18n.getLang());
      _translateStaticShell();
    }

    const APP_VERSION = 'v26_checklist_and_i18n';

    function proceedBoot() {
      // Initialize PWA Reminders (using Service Worker for background push notifications)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => {
            console.log('[App] ServiceWorker registered with scope:', reg.scope);
            if (typeof ReminderStore !== 'undefined') {
              ReminderStore.setServiceWorker(reg);
            }
          })
          .catch(err => {
            console.warn('[App] ServiceWorker registration failed:', err);
          });
      }

      // Initialize PWA Reminders (using Notification API directly without SW)
      if (typeof NotificationService !== 'undefined') {
        NotificationService.init();
      }

      if (typeof FirebaseSync !== 'undefined') {
        // Wait for Firebase to load cache before rendering views
        FirebaseSync.start().then(() => {
          HomeView.init();
          CalendarView.init();
          HistoryView.init();
          NoticeView.init();
          AssetsView.init();
          WireMapView.init();
          ManualView.init();

          Router.init();
        });
      } else {
        // Fallback
        HomeView.init();
        CalendarView.init();
        HistoryView.init();
        NoticeView.init();
        AssetsView.init();
        WireMapView.init();
        ManualView.init();
        Router.init();
      }
    }

    try {
      const currentVer = localStorage.getItem('seibi_app_version');
      if (currentVer !== APP_VERSION) {
        console.log(`[Seibi] App version changed from ${currentVer} to ${APP_VERSION}. Clearing local cache...`);
        // Remove all localStorage keys starting with seibi_ to clear old states and sync flags
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith('seibi_')) {
            localStorage.removeItem(key);
          }
        }
        localStorage.setItem('seibi_app_version', APP_VERSION);

        // One-time templates re-seed in Firebase
        if (typeof firebaseDb !== 'undefined') {
          console.log('[Seibi] Version update: Wiping Firebase templates to force re-seed...');
          firebaseDb.ref('templates').remove();
        }
      }
    } catch (_) {}

    proceedBoot();

    // Set up language change listener to dynamically redraw active views
    window.addEventListener('seibi_language_changed', (e) => {
      const lang = e.detail;
      _updateLangUI(lang);
      _translateStaticShell();

      // Refresh all views to pick up translations
      if (typeof HomeView !== 'undefined') HomeView.refresh();
      if (typeof CalendarView !== 'undefined') CalendarView.init();
      if (typeof HistoryView !== 'undefined') HistoryView.init();
      if (typeof NoticeView !== 'undefined') NoticeView.init();
      if (typeof AssetsView !== 'undefined') AssetsView.refresh();
      if (typeof WireMapView !== 'undefined') WireMapView.refresh();
      if (typeof ManualView !== 'undefined') ManualView.refresh();
    });

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
    WireMapView,
    ManualView,
  };

})();
