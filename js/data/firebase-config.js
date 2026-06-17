/**
 * data/firebase-config.js — Firebase Configuration & Initialization
 *
 * Firebase is the SINGLE SOURCE OF TRUTH for all app data.
 * In-memory cache (FirebaseSync.cache) provides fast access during a session.
 * Firebase .on('value') listeners keep the cache updated in real-time.
 * No localStorage is used for data persistence.
 */

'use strict';

// Detect environment
let isStaging = false;

if (typeof window !== 'undefined') {
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get('env') === 'staging' || window.location.hostname.includes('staging')) {
    isStaging = true;
  } else if (window.location.hash.includes('env=staging')) {
    isStaging = true;
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
let firebaseAuth;
let firebaseDb;
let firebaseMessaging;
if (typeof firebase !== 'undefined') {
  const config = SEIBI_ENV === 'staging' ? stagingConfig : prodConfig;
  firebaseApp = firebase.initializeApp(config);
  if (typeof firebaseApp.auth === 'function') {
    firebaseAuth = firebaseApp.auth();
  }
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
  let _readyResolve = null;
  let _readyPromise = new Promise(resolve => { _readyResolve = resolve; });
  let _nodesReady = { assets: false, templates: false, tasks: false, notices: false, history: false };

  // ─── In-memory cache: THE source of truth for the UI ─────────────────────
  const cache = {
    assets: [],
    templates: [],
    tasks: [],
    notices: [],
    history: []
  };

  // ─── Seed data (pushed to Firebase only if the node is completely empty) ──

  const _assetsSeed = [
    { id: 'asset-robot-01', name: 'Welding Robot #1 (CO2/MAG)', type: 'CO2_MAG', status: 'decommissioned', lastInspected: '2025-11-12', dueDate: null, model: 'DAIHEN DP-350', location: 'Bay A (Offline)', templateId: 'template-co2-mag' },
    { id: 'asset-robot-02', name: 'Welding Robot #2 (CO2/MAG)', type: 'CO2_MAG', status: 'decommissioned', lastInspected: '2025-12-10', dueDate: null, model: 'DAIHEN DP-350', location: 'Bay A (Offline)', templateId: 'template-co2-mag' },
    { id: 'asset-robot-03', name: 'Welding Robot #3 (CO2/MAG)', type: 'CO2_MAG', status: 'healthy', lastInspected: '2026-05-13', dueDate: '2026-06-10', model: 'DAIHEN DP-350', location: 'Bay B', templateId: 'template-co2-mag' },
    { id: 'asset-robot-04', name: 'Welding Robot #4 (CO2/MAG)', type: 'CO2_MAG', status: 'healthy', lastInspected: '2026-05-13', dueDate: '2026-06-10', model: 'DAIHEN DP-350', location: 'Bay B', templateId: 'template-co2-mag' },
    { id: 'asset-robot-05', name: 'Welding Robot #5 (CO2/MAG)', type: 'CO2_MAG', status: 'healthy', lastInspected: '2026-05-13', dueDate: '2026-06-10', model: 'DAIHEN DP-400R', location: 'Bay C', templateId: 'template-co2-mag' },
    { id: 'asset-robot-06', name: 'Welding Robot #6 (CO2/MAG)', type: 'CO2_MAG', status: 'healthy', lastInspected: '2026-05-13', dueDate: '2026-06-10', model: 'DAIHEN DP-400R', location: 'Bay C', templateId: 'template-co2-mag' },
    { id: 'asset-robot-tig-01', name: 'TIG Welding Robot #1', type: 'TIG', status: 'healthy', lastInspected: '2026-05-13', dueDate: '2026-06-10', model: 'DAIHEN Welbee T500', location: 'Bay D', templateId: 'template-co2-mag' },
    { id: 'asset-regulator-01', name: 'Regulator Pillar Left', type: 'REGULATOR', status: 'healthy', lastInspected: '2026-05-13', dueDate: '2026-06-10', model: 'Standard Regulator', location: 'Pillar Left', templateId: 'template-regulator' },
    { id: 'asset-regulator-02', name: 'Regulator Pillar Right', type: 'REGULATOR', status: 'healthy', lastInspected: '2026-05-13', dueDate: '2026-06-10', model: 'Standard Regulator', location: 'Pillar Right', templateId: 'template-regulator' },
    { id: 'asset-utility-gas-01', name: 'Main Gas Utility', type: 'UTILITY', status: 'healthy', lastInspected: '2026-05-13', dueDate: '2026-06-10', model: 'Gas Gauge', location: '1F Courtyard', templateId: 'template-utility-gas' }
  ];

  const _tasksSeed = [
    { id: 'task-robot-03', title: 'Welding Robot #3 — Monthly Inspection', assetId: 'asset-robot-03', assetName: 'Welding Robot #3', location: 'Bay B', priority: 'high', status: 'pending', dueDate: '2026-06-10', dueTime: '09:00', estimatedMins: 25, assignedTo: 'Unassigned', tags: ['robot', 'welding'] },
    { id: 'task-robot-04', title: 'Welding Robot #4 — Monthly Inspection', assetId: 'asset-robot-04', assetName: 'Welding Robot #4', location: 'Bay B', priority: 'high', status: 'pending', dueDate: '2026-06-10', dueTime: '10:00', estimatedMins: 25, assignedTo: 'Unassigned', tags: ['robot', 'welding'] },
    { id: 'task-robot-05', title: 'Welding Robot #5 — Monthly Inspection', assetId: 'asset-robot-05', assetName: 'Welding Robot #5', location: 'Bay C', priority: 'high', status: 'pending', dueDate: '2026-06-10', dueTime: '11:00', estimatedMins: 25, assignedTo: 'Unassigned', tags: ['robot', 'welding'] },
    { id: 'task-robot-06', title: 'Welding Robot #6 — Monthly Inspection', assetId: 'asset-robot-06', assetName: 'Welding Robot #6', location: 'Bay C', priority: 'high', status: 'pending', dueDate: '2026-06-10', dueTime: '13:00', estimatedMins: 25, assignedTo: 'Unassigned', tags: ['robot', 'welding'] },
    { id: 'task-robot-tig-01', title: 'TIG Welding Robot #1 — Monthly Inspection', assetId: 'asset-robot-tig-01', assetName: 'TIG Welding Robot #1', location: 'Bay D', priority: 'high', status: 'pending', dueDate: '2026-06-10', dueTime: '14:00', estimatedMins: 25, assignedTo: 'Unassigned', tags: ['robot', 'welding'] },
    { id: 'task-regulator-01', title: 'Regulator Pillar Left — Monthly Inspection', assetId: 'asset-regulator-01', assetName: 'Regulator Pillar Left', location: 'Pillar Left', priority: 'high', status: 'pending', dueDate: '2026-06-10', dueTime: '15:00', estimatedMins: 15, assignedTo: 'Unassigned', tags: ['regulator', 'gas'] },
    { id: 'task-regulator-02', title: 'Regulator Pillar Right — Monthly Inspection', assetId: 'asset-regulator-02', assetName: 'Regulator Pillar Right', location: 'Pillar Right', priority: 'high', status: 'pending', dueDate: '2026-06-10', dueTime: '16:00', estimatedMins: 15, assignedTo: 'Unassigned', tags: ['regulator', 'gas'] }
  ];

  // Templates seed is kept in assets.js (the _templatesSeed constant)

  function _checkAllReady() {
    if (Object.values(_nodesReady).every(v => v)) {
      console.log('[Firebase] All data nodes loaded. App is ready.');
      if (_readyResolve) {
        _readyResolve();
        _readyResolve = null;
      }
    }
  }

  function _markReady(node) {
    if (!_nodesReady[node]) {
      _nodesReady[node] = true;
      _checkAllReady();
    }
  }

  function updateStatusUI(status, text) {
    const el = document.getElementById('firebase-status-indicator');
    const dot = el ? el.querySelector('.status-dot') : null;
    const txt = document.getElementById('firebase-status-text');
    if (dot && txt) {
      dot.className = `status-dot status-dot--${status}`;
      const envText = SEIBI_ENV === 'staging' ? ' · STAGING' : '';
      txt.textContent = `${text} (v25${envText})`;
    }
  }

  function start() {
    if (_started) return _readyPromise;
    _started = true;

    const db = firebaseDb;
    const auth = firebaseAuth;
    if (!db) {
      console.warn('[Firebase] No database connection. App will run with empty data.');
      _readyResolve && _readyResolve();
      return _readyPromise;
    }

    const handleErr = name => err => {
      console.error(`[Firebase] Sync error on node '${name}':`, err);
      if (err.code === 'PERMISSION_DENIED') {
        console.error('[Firebase] Permission Denied! Please update your Realtime Database rules.');
        updateStatusUI('disconnected', 'Permission Error');
      } else {
        updateStatusUI('disconnected', 'Sync Error');
      }
      _markReady(name); // Don't block boot on error
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

    const setupDatabaseListeners = () => {
    // 1. Assets sync
    db.ref('assets').on('value', snapshot => {
      const data = snapshot.val();
      if (data) {
        cache.assets = Array.isArray(data) ? data : Object.values(data);
      } else {
        // Firebase is empty — seed it
        db.ref('assets').set(_assetsSeed);
        cache.assets = [..._assetsSeed];
      }
      _markReady('assets');
      if (typeof AssetsView !== 'undefined') AssetsView.refresh();
      if (typeof HomeView !== 'undefined') HomeView.refresh();
    }, handleErr('assets'));

    // 2. Templates sync — seed data is in AssetStore._templatesSeed
    db.ref('templates').on('value', snapshot => {
      const data = snapshot.val();
      if (data) {
        cache.templates = Array.isArray(data) ? data : Object.values(data);
      } else {
        // Seed templates from AssetStore's _templatesSeed (defined in assets.js)
        // We duplicate the seed here to avoid circular dependency
        const templatesSeed = [
          { id: 'template-co2-mag', name: 'CO2/MAG Robot Template', items: [
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
          ]},
          { id: 'template-regulator', name: 'Gas Regulator Template', items: [
            { id: 1, title: 'Check gas leak', desc: 'ガス漏れ確認（レギュレーター、カプラ、配管接続部に探知スプレー）', freq: 'monthly', image: 'image8.jpeg' },
            { id: 2, title: 'Adjust and verify flow rate', desc: '流量12L/min調整・動作確認', freq: 'monthly', image: 'image8.jpeg' }
          ]},
          { id: 'template-utility-gas', name: 'Main Gas Utility Template', items: [
            { id: 1, title: 'Check gas pressure needle', desc: '1F中庭 ガス圧計ゲージの針確認（異常時は大丸エナウィンに連絡）', freq: 'monthly', image: 'image2.jpeg' }
          ]},
          { id: 'template-grinder', name: 'Grinder & Sander Template', items: [
            { id: 1, title: 'Inspect power cable', desc: '電気配線の破損確認（目視による被覆の亀裂や断線の有無）', freq: 'monthly', image: 'generic-check.png' },
            { id: 2, title: 'Check grinding stone / belt wear', desc: '砥石・研磨ベルトの摩耗、ひび割れ、目詰まりの確認', freq: 'monthly', image: 'generic-check.png' },
            { id: 3, title: 'Verify safety guard', desc: '安全カバーが正しく取り付けられており、緩みや破損が無いか確認', freq: 'monthly', image: 'generic-check.png' },
            { id: 4, title: 'Test abnormal vibration / sound', desc: '無負荷状態で運転させ、スイッチの作動、異音・異常振動が無いか確認', freq: 'monthly', image: 'generic-check.png' }
          ]}
        ];
        db.ref('templates').set(templatesSeed);
        cache.templates = [...templatesSeed];
      }
      _markReady('templates');
    }, handleErr('templates'));

    // 3. Tasks sync
    db.ref('tasks').on('value', snapshot => {
      const data = snapshot.val();
      if (data) {
        cache.tasks = Array.isArray(data) ? data : Object.values(data);
      } else {
        db.ref('tasks').set(_tasksSeed);
        cache.tasks = [..._tasksSeed];
      }
      _markReady('tasks');
      if (typeof HomeView !== 'undefined') HomeView.refresh();
      if (typeof CalendarView !== 'undefined') CalendarView.init();
    }, handleErr('tasks'));

    // 4. Notices sync
    db.ref('notices').on('value', snapshot => {
      const data = snapshot.val();
      if (data) {
        cache.notices = Array.isArray(data) ? data : Object.values(data);
      } else {
        cache.notices = [];
      }
      _markReady('notices');
      if (typeof NoticeView !== 'undefined') NoticeView.refreshFeed();
    }, handleErr('notices'));

    // 5. History sync
    db.ref('history').on('value', snapshot => {
      const data = snapshot.val();
      if (data) {
        cache.history = Array.isArray(data) ? data : Object.values(data);
      } else {
        cache.history = [];
      }
      _markReady('history');
      if (typeof HistoryView !== 'undefined') HistoryView.init();
    }, handleErr('history'));

    console.log('[Firebase] Real-time synchronization listeners attached.');
    }; // end setupDatabaseListeners

    if (auth) {
      auth.signInAnonymously()
        .then(() => {
          console.log('[Firebase] Authenticated anonymously.');
          setupDatabaseListeners();
        })
        .catch(err => {
          console.warn('[Firebase] Anonymous Auth failed. Attempting to proceed without auth.', err);
          setupDatabaseListeners();
        });
    } else {
      setupDatabaseListeners();
    }

    return _readyPromise;
  }

  /** Returns a Promise that resolves when all data nodes have loaded their first snapshot. */
  function ready() {
    return _readyPromise;
  }

  return { start, ready, cache };

})();
