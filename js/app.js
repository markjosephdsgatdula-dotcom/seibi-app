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
          const hasHistory = (historyByAsset[task.assetId] || []).some(rec => {
            const rd = new Date(rec.completedAt);
            const rDay = new Date(rd.getTime() - rd.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
            return rDay === completionDay;
          });

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

    const APP_VERSION = 'v22_remove_items_6_8';

    function _runMigrationV23() {
      try {
        const MIGRATION_FLAG = 'seibi_migration_v23_gas_utility_v2';
        if (localStorage.getItem(MIGRATION_FLAG) === 'true') {
          return;
        }

        console.log('[Migration V23] Running migration for Gas Utility separation...');

        // 1. Migrate Templates
        let templates = [];
        try {
          const rawTpl = localStorage.getItem('seibi_templates');
          if (rawTpl) templates = JSON.parse(rawTpl);
        } catch (_) {}

        if (templates.length > 0) {
          // Find CO2/MAG template and remove the gas needle item
          let co2Template = templates.find(t => t.id === 'template-co2-mag');
          if (co2Template && co2Template.items) {
            co2Template.items = co2Template.items.filter(item => {
              return item.id !== 2 && item.title !== 'Check gas pressure needle';
            });
          }

          // Add Main Gas Utility template if not exists
          if (!templates.some(t => t.id === 'template-utility-gas')) {
            templates.push({
              id: 'template-utility-gas',
              name: 'Main Gas Utility Template',
              items: [
                { id: 1, title: 'Check gas pressure needle', desc: '1F中庭 ガス圧計ゲージの針確認（異常時は大丸エナウィンに連絡）', freq: 'monthly', image: 'image2.jpeg' }
              ]
            });
          }

          localStorage.setItem('seibi_templates', JSON.stringify(templates));
          if (typeof firebaseDb !== 'undefined') {
            firebaseDb.ref('templates').set(templates).catch(err => {
              console.error('[Firebase Migration] Templates sync error:', err);
            });
          }
        }

        // 2. Migrate Assets
        let assets = [];
        try {
          const rawAssets = localStorage.getItem('seibi_assets');
          if (rawAssets) assets = JSON.parse(rawAssets);
        } catch (_) {}

        if (assets.length > 0) {
          let assetIndex = assets.findIndex(a => a.id === 'asset-utility-gas-01');
          if (assetIndex !== -1) {
            // Update existing asset dates
            assets[assetIndex].lastInspected = '2026-05-13';
            assets[assetIndex].dueDate = '2026-06-10';
            
            // Since it's past June 10, mark it as inspection due
            const offset = new Date().getTimezoneOffset() * 60000;
            const todayStr = new Date(Date.now() - offset).toISOString().slice(0, 10);
            if (assets[assetIndex].status === 'healthy' && todayStr >= '2026-06-10') {
              assets[assetIndex].status = 'inspection_due';
            }
          } else {
            assets.push({
              id: 'asset-utility-gas-01',
              name: 'Main Gas Utility',
              type: 'UTILITY',
              status: 'inspection_due',
              lastInspected: '2026-05-13',
              dueDate: '2026-06-10',
              model: 'Gas Gauge',
              location: '1F Courtyard',
              templateId: 'template-utility-gas'
            });
          }

          localStorage.setItem('seibi_assets', JSON.stringify(assets));
          if (typeof firebaseDb !== 'undefined') {
            firebaseDb.ref('assets').set(assets).catch(err => {
              console.error('[Firebase Migration] Assets sync error:', err);
            });
          }
        }

        // 3. Migrate Tasks (Reset old pending task if scheduled, then schedule with new date)
        let tasks = [];
        try {
          const rawTasks = localStorage.getItem('seibi_tasks');
          if (rawTasks) tasks = JSON.parse(rawTasks);
        } catch (_) {}

        if (tasks.length > 0) {
          // Clear any duplicate/old pending tasks for the utility
          tasks = tasks.filter(t => !(t.assetId === 'asset-utility-gas-01' && t.status !== 'done'));
          localStorage.setItem('seibi_tasks', JSON.stringify(tasks));
          if (typeof firebaseDb !== 'undefined') {
            firebaseDb.ref('tasks').set(tasks).catch(err => {
              console.error('[Firebase Migration] Tasks sync error:', err);
            });
          }
        }

        if (typeof MockDB !== 'undefined') {
          MockDB.scheduleInspectionTask(
            'asset-utility-gas-01',
            'Main Gas Utility',
            '1F Courtyard',
            '2026-06-10'
          );
        }

        localStorage.setItem(MIGRATION_FLAG, 'true');
        console.log('[Migration V23] Migration successfully completed.');
      } catch (err) {
        console.warn('[Migration V23] Migration failed:', err);
      }
    }

    function _runMigrationV24() {
      try {
        const MIGRATION_FLAG = 'seibi_migration_v24_robot_checklist_v1';
        if (localStorage.getItem(MIGRATION_FLAG) === 'true') {
          return;
        }

        console.log('[Migration V24] Running migration for upgraded 15-item CO2/MAG checklist...');

        let templates = [];
        try {
          const rawTpl = localStorage.getItem('seibi_templates');
          if (rawTpl) templates = JSON.parse(rawTpl);
        } catch (_) {}

        if (templates.length > 0) {
          let co2Template = templates.find(t => t.id === 'template-co2-mag');
          if (co2Template) {
            // Replace with the new 15 items
            co2Template.items = [
              { id: 1, title: 'Clean welder rear filter', title_en: 'Clean Welder Rear Filter', title_jp: '溶接機裏側のフィルター清掃', desc: 'Clean or replace controller cabinet door air filters.', desc_en: 'Clean or replace controller cabinet door air filters.', desc_jp: 'コントローラー冷却ファン・ドアフィルターの清掃・交換', freq: 'monthly', image: 'image1.jpeg' },
              { id: 2, title: 'Check startup noise & fans', title_en: 'Check Startup Noise & Fans', title_jp: '電源ON時の異音確認', desc: 'Verify that internal exhaust and intake fans run smoothly.', desc_en: 'Verify that internal exhaust and intake fans run smoothly.', desc_jp: 'ファンモーターの回転異音、風量、目視確認', freq: 'monthly', image: 'image3.jpeg' },
              { id: 3, title: 'Verify robot alignment', title_en: 'Verify Robot Alignment', title_jp: 'ロボットと定盤の位置出し確認', desc: 'Load alignment program and check TCP to fixture alignment.', desc_en: 'Load alignment program and check TCP to fixture alignment.', desc_jp: 'ロボットと定盤の位置出し確認（定盤A、B、C）', freq: 'monthly', image: 'image10.jpeg' },
              { id: 4, title: 'Test emergency stop button', title_en: 'Test Emergency Stop Button', title_jp: '非常停止ボタンの作動確認', desc: 'Test all emergency stop buttons and gate interlocks.', desc_en: 'Test all emergency stop buttons and gate interlocks.', desc_jp: '非常停止ボタン、安全柵インターロックの遮断作動テスト', freq: 'monthly', image: 'image4.jpeg' },
              { id: 5, title: 'Check welding ground cable', title_en: 'Check Welding Ground Cable', title_jp: 'アースケーブルの点検', desc: 'Inspect grounding clamp and table connections.', desc_en: 'Inspect grounding clamp and table connections.', desc_jp: 'アースケーブル接続部、溶接テーブル接続ボルトの緩み点検', freq: 'monthly', image: 'generic-check.png' },
              { id: 6, title: 'Test torch shock sensor', title_en: 'Test Torch Shock Sensor', title_jp: 'トーチ衝突検知センサー動作テスト', desc: 'Test the torch collision safety guard switch.', desc_en: 'Test the torch collision safety guard switch.', desc_jp: 'トーチ衝突検知センサーの作動・断線チェック', freq: 'monthly', image: 'generic-check.png' },
              { id: 7, title: 'Inspect gearbox grease leaks', title_en: 'Inspect Gearbox Grease Leaks', title_jp: '各軸減速機のグリス漏れ点検', desc: 'Inspect axis joints (Axis 1–6) for grease leaks.', desc_en: 'Inspect axis joints (Axis 1–6) for grease leaks.', desc_jp: '各軸減速機のグリス漏れ点検（1〜6軸）', freq: 'monthly', image: 'generic-check.png' },
              { id: 8, title: 'Clean conduit hose', title_en: 'Clean Conduit Hose', title_jp: 'コンジットホース内のアルコール清掃', desc: 'Clean conduit hose internally with alcohol.', desc_en: 'Clean conduit hose internally with alcohol.', desc_jp: 'コンジットホース内のアルコール清掃', freq: 'semi-annual', image: 'image11.jpeg' },
              { id: 9, title: 'Verify wire feed pressure (3.5)', title_en: 'Verify Wire Feed Pressure (3.5)', title_jp: '送給装置の送給圧調整（3.5に調整）', desc: 'Inspect roll groove wear and gear backlash. Adjust pressure to 3.5.', desc_en: 'Inspect roll groove wear and gear backlash. Adjust pressure to 3.5.', desc_jp: '送給ローラーの摩耗、溝サイズ、ギア部の清掃と加圧チェック（3.5に調整）', freq: 'semi-annual', image: 'generic-check.png' },
              { id: 10, title: 'Verify joint alignment marks', title_en: 'Verify Joint Alignment Marks', title_jp: '各軸の合わせマーク（原点矢印）の一致確認', desc: 'Verify the zero-position alignment marks on all joints.', desc_en: 'Verify the zero-position alignment marks on all joints.', desc_jp: '各軸の合わせマーク（原点矢印）の一致確認', freq: 'semi-annual', image: 'generic-check.png' },
              { id: 11, title: 'Blow air inside machine', title_en: 'Blow Air Inside Machine', title_jp: '溶接機内のエアブロー清掃', desc: 'Blow dust out of the welding power source interior.', desc_en: 'Blow dust out of the welding power source interior.', desc_jp: '溶接機内のエアブロー清掃', freq: 'annual', image: 'image12.jpeg' },
              { id: 12, title: 'Visual check of mounting bolts', title_en: 'Visual Check of Mounting Bolts', title_jp: 'ロボット台座・取付ボルト緩みの目視点検', desc: 'Visual check of base mounting bolts (no torque wrench).', desc_en: 'Visual check of base mounting bolts (no torque wrench).', desc_jp: 'ロボット台座・取付ボルト緩みの目視点検', freq: 'annual', image: 'generic-check.png' },
              { id: 13, title: 'Sand & oil welding table', title_en: 'Sand & Oil Welding Table', title_jp: '定盤・溶接台の清掃（研磨・防錆油塗布）', desc: 'Sand and oil the welding table.', desc_en: 'Sand and oil the welding table.', desc_jp: '定盤・溶接台の清掃（研磨・防錆油塗布）', freq: 'annual', image: 'generic-check.png' },
              { id: 14, title: 'Replace encoder batteries (Power ON)', title_en: 'Replace Encoder Batteries (Power ON)', title_jp: '本体エンコーダ用バッテリー交換（通電中）', desc: 'Replace manipulator internal encoder backup batteries. Power must be ON.', desc_en: 'Replace manipulator internal encoder backup batteries. Power must be ON.', desc_jp: 'ロボット本体エンコーダ用バックアップバッテリーの交換（通電中）', freq: 'every-3-years', image: 'generic-check.png' },
              { id: 15, title: 'Replace CPU batteries (Power ON)', title_en: 'Replace CPU Batteries (Power ON)', title_jp: 'コントローラーCPU用バッテリー交換（通電中）', desc: 'Replace controller CPU board memory backup batteries. Power must be ON.', desc_en: 'Replace controller CPU board memory backup batteries. Power must be ON.', desc_jp: 'コントローラーCPUボード用バックアップバッテリーの交換（通電中）', freq: 'every-3-years', image: 'generic-check.png' }
            ];
          }

          localStorage.setItem('seibi_templates', JSON.stringify(templates));
          if (typeof firebaseDb !== 'undefined') {
            firebaseDb.ref('templates').set(templates).catch(err => {
              console.error('[Firebase Migration] Templates sync error:', err);
            });
          }
        }

        localStorage.setItem(MIGRATION_FLAG, 'true');
        console.log('[Migration V24] Migration successfully completed.');
      } catch (err) {
        console.warn('[Migration V24] Migration failed:', err);
      }
    }

    function proceedBoot() {
      // Run migration
      _runMigrationV23();
      _runMigrationV24();

      // Clean up any old completed tasks that are missing history logs
      _cleanOrphanedCompletedTasks();

      // Initialise view controllers
      HomeView.init();
      CalendarView.init();
      HistoryView.init();
      NoticeView.init();
      AssetsView.init();
      WireMapView.init();
      ManualView.init();

      // Initialize PWA Reminders
      if (typeof NotificationService !== 'undefined') {
        NotificationService.init();
      }

      // Start Firebase Sync before router starts so initial views can render updated synced data
      if (typeof FirebaseSync !== 'undefined') {
        FirebaseSync.start();
      }

      // Initialise router last (it will activate the first view)
      Router.init();
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
