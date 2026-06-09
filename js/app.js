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

  // ─── Database Self-Healing Cleanup ────────────────────────────────────────

  function _cleanOrphanedCompletedTasks() {
    try {
      const tasks = JSON.parse(localStorage.getItem('seibi_tasks') || '[]');
      const history = JSON.parse(localStorage.getItem('seibi_history') || '[]');
      const assets = JSON.parse(localStorage.getItem('seibi_assets') || '[]');

      let tasksChanged = false;
      let assetsChanged = false;

      // Group history by asset
      const historyByAsset = {};
      history.forEach(rec => {
        if (!historyByAsset[rec.assetId]) historyByAsset[rec.assetId] = [];
        historyByAsset[rec.assetId].push(rec);
      });

      // 1. Revert completed tasks with no history back to pending
      const updatedTasks = tasks.map(task => {
        if (task.status === 'done') {
          // Exclude repair and custom tasks from inspection task verification
          const isRepairOrCustom = task.id.startsWith('task-repair-') || task.id.startsWith('task-custom-') || (task.tags && (task.tags.includes('repair') || task.tags.includes('custom')));
          if (isRepairOrCustom) {
            return task;
          }

          const completionDay = task.dueDate;
          const hasHistory = (historyByAsset[task.assetId] || []).some(rec => 
            rec.completedAt.slice(0, 10) === completionDay
          );

          if (!hasHistory) {
            task.status = 'pending';
            if (task.originalDueDate) {
              task.dueDate = task.originalDueDate;
            }
            tasksChanged = true;
          }
        }
        return task;
      });

      // 2. Remove future duplicate tasks generated when the now-reverted task was done
      const finalTasks = [];
      updatedTasks.forEach(task => {
        const isRepairOrCustom = task.id.startsWith('task-repair-') || task.id.startsWith('task-custom-') || (task.tags && (task.tags.includes('repair') || task.tags.includes('custom')));
        if (isRepairOrCustom) {
          finalTasks.push(task);
          return;
        }

        const isFuturePending = task.status === 'pending' && 
                                (!historyByAsset[task.assetId] || historyByAsset[task.assetId].length === 0);
        
        if (isFuturePending) {
          const otherTasksForAsset = updatedTasks.filter(t => t.assetId === task.assetId);
          const earliestDueDate = otherTasksForAsset.reduce((min, t) => t.dueDate < min ? t.dueDate : min, '9999-99-99');
          if (task.dueDate > earliestDueDate) {
            tasksChanged = true;
            return; // delete duplicate future task
          }
        }
        finalTasks.push(task);
      });

      if (tasksChanged) {
        localStorage.setItem('seibi_tasks', JSON.stringify(finalTasks));
        console.log('[Seibi Cleanup] Cleaned up orphaned completed tasks.');
      }

      // 3. Revert asset registry health if history was removed
      const updatedAssets = assets.map(asset => {
        const hasHistory = (historyByAsset[asset.id] || []).length > 0;
        if (!hasHistory && asset.status === 'healthy') {
          asset.status = 'inspection_due';
          const pendingTask = finalTasks.find(t => t.assetId === asset.id && t.status === 'pending');
          if (pendingTask) {
            asset.dueDate = pendingTask.dueDate;
          }
          asset.lastInspected = null;
          assetsChanged = true;
        }
        return asset;
      });

      if (assetsChanged) {
        localStorage.setItem('seibi_assets', JSON.stringify(updatedAssets));
        console.log('[Seibi Cleanup] Reset assets with no history.');
      }

    } catch (e) {
      console.warn('[Seibi Cleanup] Failed to run database cleanup:', e);
    }
  }

  // ─── Translations & Language Switcher ─────────────────────────────────────

  function _translateStaticShell() {
    if (typeof I18n === 'undefined') return;
    const mappings = {
      '#tab-home .nav-label': 'nav_home',
      '#tab-assets .nav-label': 'nav_assets',
      '#tab-history .nav-label': 'nav_history',
      '#tab-notice .nav-label': 'nav_notice',
      '#view-assets .view-title': 'nav_assets',
      '#view-history .view-title': 'hist_title'
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

    // Migration check: Reset local storage keys if on an older version
    const APP_VERSION = 'v17_sequential_reset';

    function proceedBoot() {
      // Clean up any old completed tasks that are missing history logs
      _cleanOrphanedCompletedTasks();

      // Initialise view controllers
      HomeView.init();
      CalendarView.init();
      HistoryView.init();
      NoticeView.init();
      AssetsView.init();
      WireMapView.init();

      // Start Firebase Sync before router starts so initial views can render updated synced data
      if (typeof FirebaseSync !== 'undefined') {
        FirebaseSync.start();
      }

      // Initialise router last (it will activate the first view)
      Router.init();
    }

    try {
      if (localStorage.getItem('seibi_app_version') !== APP_VERSION) {
        localStorage.removeItem('seibi_notices');
        localStorage.removeItem('seibi_history');
        localStorage.removeItem('seibi_assets');
        localStorage.removeItem('seibi_tasks');
        localStorage.removeItem('seibi_templates');
        localStorage.setItem('seibi_app_version', APP_VERSION);
        if (typeof firebaseDb !== 'undefined') {
          console.log('[Seibi] Clearing Firebase for version reset...');
          firebaseDb.ref().remove()
            .then(() => {
              console.log('[Seibi] Firebase cleared. Seeding database...');
              proceedBoot();
            })
            .catch(err => {
              console.error('[Seibi] Failed to clear Firebase:', err);
              proceedBoot();
            });
          return;
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
  };

})();
