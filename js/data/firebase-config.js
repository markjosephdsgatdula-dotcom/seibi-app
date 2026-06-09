/**
 * data/firebase-config.js — Firebase Configuration & Initialization
 */

'use strict';

const firebaseConfig = {
  apiKey: "AIzaSyA8Of3keXXlECF3ADaNQe6EOOvAIifYJ5Q",
  authDomain: "seibi-app.firebaseapp.com",
  projectId: "seibi-app",
  storageBucket: "seibi-app.firebasestorage.app",
  messagingSenderId: "469528639419",
  appId: "1:469528639419:web:cc1f4261b1c9e20150f69e",
  measurementId: "G-CPRLTXF9WW",
  databaseURL: "https://seibi-app-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Expose database reference globally
const firebaseDb = firebase.database();

const FirebaseSync = (() => {

  let _started = false;

  function updateStatusUI(status, text) {
    const el = document.getElementById('firebase-status-indicator');
    const dot = el ? el.querySelector('.status-dot') : null;
    const txt = document.getElementById('firebase-status-text');
    if (dot && txt) {
      dot.className = `status-dot status-dot--${status}`;
      txt.textContent = `${text} (v19)`;
    }
  }

  function start() {
    if (_started) return;
    _started = true;

    // Ensure all stores are loaded (and thus seeded in localStorage) before we attach Firebase listeners.
    // This guarantees that if Firebase is empty, the seed data is already in localStorage and will be pushed up.
    if (typeof AssetStore !== 'undefined') {
      AssetStore.getTemplates();
      AssetStore.getAll();
    }
    if (typeof MockDB !== 'undefined') {
      MockDB.getAllTasks();
    }
    if (typeof NoticeStore !== 'undefined') {
      NoticeStore.getAll();
    }
    if (typeof HistoryStore !== 'undefined') {
      HistoryStore.getAll();
    }

    const db = firebaseDb;

    const handleErr = name => err => {
      console.error(`[Firebase] Sync error on node '${name}':`, err);
      if (err.code === 'PERMISSION_DENIED') {
        console.error('[Firebase] Permission Denied! Please update your Realtime Database rules in the Firebase Console to allow read/write.');
        updateStatusUI('disconnected', 'Permission Error');
      } else {
        updateStatusUI('disconnected', 'Sync Error');
      }
    };

    // Monitor connection status
    db.ref('.info/connected').on('value', snapshot => {
      if (snapshot.val() === true) {
        console.log('[Firebase] Successfully connected to the cloud database.');
        updateStatusUI('connected', 'Cloud Sync Active');
      } else {
        console.warn('[Firebase] Disconnected from the cloud database.');
        updateStatusUI('connecting', 'Connecting...');
      }
    });

    // 1. Assets sync
    db.ref('assets').on('value', snapshot => {
      const data = snapshot.val();
      const syncedKey = 'seibi_sync_assets_done';
      if (data) {
        localStorage.setItem('seibi_assets', JSON.stringify(data));
        localStorage.setItem(syncedKey, 'true');
        if (typeof AssetsView !== 'undefined') AssetsView.refresh();
        if (typeof HomeView !== 'undefined') HomeView.refresh();
      } else {
        const isSynced = localStorage.getItem(syncedKey) === 'true';
        if (!isSynced) {
          const local = localStorage.getItem('seibi_assets');
          if (local) db.ref('assets').set(JSON.parse(local));
          localStorage.setItem(syncedKey, 'true');
        } else {
          localStorage.setItem('seibi_assets', '[]');
          if (typeof AssetsView !== 'undefined') AssetsView.refresh();
          if (typeof HomeView !== 'undefined') HomeView.refresh();
        }
      }
    }, handleErr('assets'));

    // 2. Templates sync
    db.ref('templates').on('value', snapshot => {
      const data = snapshot.val();
      const syncedKey = 'seibi_sync_templates_done';
      if (data) {
        localStorage.setItem('seibi_templates', JSON.stringify(data));
        localStorage.setItem(syncedKey, 'true');
      } else {
        const isSynced = localStorage.getItem(syncedKey) === 'true';
        if (!isSynced) {
          const local = localStorage.getItem('seibi_templates');
          if (local) db.ref('templates').set(JSON.parse(local));
          localStorage.setItem(syncedKey, 'true');
        } else {
          localStorage.setItem('seibi_templates', '[]');
        }
      }
    }, handleErr('templates'));

    // 3. Notices sync
    db.ref('notices').on('value', snapshot => {
      const data = snapshot.val();
      const syncedKey = 'seibi_sync_notices_done';
      if (data) {
        localStorage.setItem('seibi_notices', JSON.stringify(data));
        localStorage.setItem(syncedKey, 'true');
        if (typeof NoticeView !== 'undefined') NoticeView.refreshFeed();
      } else {
        const isSynced = localStorage.getItem(syncedKey) === 'true';
        if (!isSynced) {
          const local = localStorage.getItem('seibi_notices');
          if (local) db.ref('notices').set(JSON.parse(local));
          localStorage.setItem(syncedKey, 'true');
        } else {
          localStorage.setItem('seibi_notices', '[]');
          if (typeof NoticeView !== 'undefined') NoticeView.refreshFeed();
        }
      }
    }, handleErr('notices'));

    // 4. Tasks sync
    db.ref('tasks').on('value', snapshot => {
      const data = snapshot.val();
      const syncedKey = 'seibi_sync_tasks_done';
      if (data) {
        localStorage.setItem('seibi_tasks', JSON.stringify(data));
        localStorage.setItem(syncedKey, 'true');
        if (typeof HomeView !== 'undefined') HomeView.refresh();
        if (typeof CalendarView !== 'undefined') CalendarView.init();
      } else {
        const isSynced = localStorage.getItem(syncedKey) === 'true';
        if (!isSynced) {
          const local = localStorage.getItem('seibi_tasks');
          if (local) db.ref('tasks').set(JSON.parse(local));
          localStorage.setItem(syncedKey, 'true');
        } else {
          localStorage.setItem('seibi_tasks', '[]');
          if (typeof HomeView !== 'undefined') HomeView.refresh();
          if (typeof CalendarView !== 'undefined') CalendarView.init();
        }
      }
    }, handleErr('tasks'));

    // 5. History sync
    db.ref('history').on('value', snapshot => {
      const data = snapshot.val();
      const syncedKey = 'seibi_sync_history_done';
      if (data) {
        localStorage.setItem('seibi_history', JSON.stringify(data));
        localStorage.setItem(syncedKey, 'true');
        if (typeof HistoryView !== 'undefined') HistoryView.init();
      } else {
        const isSynced = localStorage.getItem(syncedKey) === 'true';
        if (!isSynced) {
          const local = localStorage.getItem('seibi_history');
          if (local) db.ref('history').set(JSON.parse(local));
          localStorage.setItem(syncedKey, 'true');
        } else {
          localStorage.setItem('seibi_history', '[]');
          if (typeof HistoryView !== 'undefined') HistoryView.init();
        }
      }
    }, handleErr('history'));

    console.log('[Firebase] Real-time synchronization listeners attached.');
  }

  return { start };

})();
