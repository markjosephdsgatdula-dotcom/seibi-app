/**
 * data/firebase-config.js — Firebase Configuration & Initialization
 */

'use strict';

// Detect environment: Check query string ?env=staging or check the hash segment for env=staging
let isStaging = false;

if (typeof window !== 'undefined') {
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get('env') === 'staging') {
    isStaging = true;
  } else if (window.location.hash.includes('env=staging')) {
    isStaging = true;
    // Normalize the URL: Move ?env=staging to standard search param and clean hash
    const cleanHash = window.location.hash.replace(/\?env=staging/i, '').replace(/&env=staging/i, '');
    const searchPart = window.location.search ? `${window.location.search}&env=staging` : '?env=staging';
    window.history.replaceState(null, '', `${searchPart}${cleanHash}`);
  }
} else if (typeof self !== 'undefined' && self.location) {
  // Service Worker context
  const searchParams = new URLSearchParams(self.location.search);
  if (searchParams.get('env') === 'staging' || self.location.hostname.includes('staging')) {
    isStaging = true;
  }
}

const SEIBI_ENV = isStaging ? 'staging' : 'production';

// Intercept localStorage to isolate staging environment data from production data
if (SEIBI_ENV === 'staging' && typeof localStorage !== 'undefined') {
  const origGetItem = localStorage.getItem;
  const origSetItem = localStorage.setItem;
  const origRemoveItem = localStorage.removeItem;
  const origKey = localStorage.key;

  localStorage.getItem = function(key) {
    return origGetItem.call(localStorage, key && key.startsWith('seibi_') ? `staging_${key}` : key);
  };

  localStorage.setItem = function(key, value) {
    origSetItem.call(localStorage, key && key.startsWith('seibi_') ? `staging_${key}` : key, value);
  };

  localStorage.removeItem = function(key) {
    origRemoveItem.call(localStorage, key && key.startsWith('seibi_') ? `staging_${key}` : key);
  };

  localStorage.key = function(index) {
    const realKey = origKey.call(localStorage, index);
    if (realKey && realKey.startsWith('staging_seibi_')) {
      return realKey.substring(8); // Remove 'staging_' prefix for virtual key matching
    }
    return realKey;
  };
}

const prodConfig = {
  apiKey: "AIzaSyA8Of3keXXlECF3ADaNQe6EOOvAIifYJ5Q",
  authDomain: "seibi-app.firebaseapp.com",
  projectId: "seibi-app",
  storageBucket: "seibi-app.firebasestorage.app",
  messagingSenderId: "469528639419",
  appId: "1:469528639419:web:cc1f4261b1c9e20150f69e",
  measurementId: "G-CPRLTXF9WW",
  databaseURL: "https://seibi-app-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const stagingConfig = {
  apiKey: "AIzaSyByW32vjzjWFbrsnghcOan2DNAkcI6vYdM",
  authDomain: "seibi-app-staging.firebaseapp.com",
  databaseURL: "https://seibi-app-staging-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "seibi-app-staging",
  storageBucket: "seibi-app-staging.firebasestorage.app",
  messagingSenderId: "1071070088047",
  appId: "1:1071070088047:web:699fa3afd7c7ba4a4b769a",
  measurementId: "G-SQ94K29CZX"
};

let firebaseApp;
let firebaseDb;
let firebaseMessaging;
if (typeof firebase !== 'undefined') {
  const config = SEIBI_ENV === 'staging' ? stagingConfig : prodConfig;
  firebaseApp = firebase.initializeApp(config);
  if (typeof firebaseApp.database === 'function') {
    firebaseDb = firebaseApp.database();
  }
  try {
    firebaseMessaging = firebaseApp.messaging();
  } catch (e) {
    console.warn('[Firebase] Messaging not supported or setup failed.', e);
  }
}

const FirebaseSync = (() => {

  let _started = false;

  function updateStatusUI(status, text) {
    const el = document.getElementById('firebase-status-indicator');
    const dot = el ? el.querySelector('.status-dot') : null;
    const txt = document.getElementById('firebase-status-text');
    if (dot && txt) {
      dot.className = `status-dot status-dot--${status}`;
      const envText = SEIBI_ENV === 'staging' ? ' · STAGING' : '';
      txt.textContent = `${text} (v24${envText})`;
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
          if (local) {
            console.log('[Firebase] Empty cloud notices detected (First-run). Seeding Firebase with local notices:', JSON.parse(local));
            db.ref('notices').set(JSON.parse(local));
          }
          localStorage.setItem(syncedKey, 'true');
        } else {
          console.log('[Firebase] Cloud notices is empty. Clearing local notices to match.');
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
