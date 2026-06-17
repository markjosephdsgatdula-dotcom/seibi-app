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
    { id: 'asset-robot-01', name: 'Welding Robot #1 (CO2/MAG)', name_jp: '溶接ロボット 1号機 (CO2/MAG)', type: 'CO2_MAG', status: 'decommissioned', lastInspected: '2025-11-12', dueDate: null, model: 'DAIHEN DP-350', location: 'Bay A (Offline)', templateId: 'template-co2-mag' },
    { id: 'asset-robot-02', name: 'Welding Robot #2 (CO2/MAG)', name_jp: '溶接ロボット 2号機 (CO2/MAG)', type: 'CO2_MAG', status: 'decommissioned', lastInspected: '2025-12-10', dueDate: null, model: 'DAIHEN DP-350', location: 'Bay A (Offline)', templateId: 'template-co2-mag' },
    { id: 'asset-robot-03', name: 'Welding Robot #3 (CO2/MAG)', name_jp: '溶接ロボット 3号機 (CO2/MAG)', type: 'CO2_MAG', status: 'healthy', lastInspected: '2026-05-13', dueDate: '2026-06-10', model: 'DAIHEN DP-350', location: 'Bay B', templateId: 'template-co2-mag' },
    { id: 'asset-robot-04', name: 'Welding Robot #4 (CO2/MAG)', name_jp: '溶接ロボット 4号機 (CO2/MAG)', type: 'CO2_MAG', status: 'healthy', lastInspected: '2026-05-13', dueDate: '2026-06-10', model: 'DAIHEN DP-350', location: 'Bay B', templateId: 'template-co2-mag' },
    { id: 'asset-robot-05', name: 'Welding Robot #5 (CO2/MAG)', name_jp: '溶接ロボット 5号機 (CO2/MAG)', type: 'CO2_MAG', status: 'healthy', lastInspected: '2026-05-13', dueDate: '2026-06-10', model: 'DAIHEN DP-400R', location: 'Bay C', templateId: 'template-co2-mag' },
    { id: 'asset-robot-06', name: 'Welding Robot #6 (CO2/MAG)', name_jp: '溶接ロボット 6号機 (CO2/MAG)', type: 'CO2_MAG', status: 'healthy', lastInspected: '2026-05-13', dueDate: '2026-06-10', model: 'DAIHEN DP-400R', location: 'Bay C', templateId: 'template-co2-mag' },
    { id: 'asset-robot-tig-01', name: 'TIG Welding Robot #1', name_jp: 'TIG溶接ロボット 1号機', type: 'TIG', status: 'healthy', lastInspected: '2026-05-13', dueDate: '2026-06-10', model: 'DAIHEN Welbee T500', location: 'Bay D', templateId: 'template-co2-mag' },
    { id: 'asset-regulator-01', name: 'Regulator Pillar Left', name_jp: 'ガス調整器 (左柱)', type: 'REGULATOR', status: 'healthy', lastInspected: '2026-05-13', dueDate: '2026-06-10', model: 'Standard Regulator', location: 'Pillar Left', templateId: 'template-regulator' },
    { id: 'asset-regulator-02', name: 'Regulator Pillar Right', name_jp: 'ガス調整器 (右柱)', type: 'REGULATOR', status: 'healthy', lastInspected: '2026-05-13', dueDate: '2026-06-10', model: 'Standard Regulator', location: 'Pillar Right', templateId: 'template-regulator' },
    { id: 'asset-utility-gas-01', name: 'Main Gas Utility', name_jp: 'メインガス供給設備', type: 'UTILITY', status: 'healthy', lastInspected: '2026-05-13', dueDate: '2026-06-10', model: 'Gas Gauge', location: '1F Courtyard', templateId: 'template-utility-gas' }
  ];

  const _tasksSeed = [
    { id: 'task-robot-03', title: 'Welding Robot #3 — Monthly Inspection', title_jp: '溶接ロボット 3号機 — 月次点検', assetId: 'asset-robot-03', assetName: 'Welding Robot #3', assetName_jp: '溶接ロボット 3号機', location: 'Bay B', priority: 'high', status: 'pending', dueDate: '2026-06-10', dueTime: '09:00', estimatedMins: 25, assignedTo: 'Unassigned', tags: ['robot', 'welding'] },
    { id: 'task-robot-04', title: 'Welding Robot #4 — Monthly Inspection', title_jp: '溶接ロボット 4号機 — 月次点検', assetId: 'asset-robot-04', assetName: 'Welding Robot #4', assetName_jp: '溶接ロボット 4号機', location: 'Bay B', priority: 'high', status: 'pending', dueDate: '2026-06-10', dueTime: '10:00', estimatedMins: 25, assignedTo: 'Unassigned', tags: ['robot', 'welding'] },
    { id: 'task-robot-05', title: 'Welding Robot #5 — Monthly Inspection', title_jp: '溶接ロボット 5号機 — 月次点検', assetId: 'asset-robot-05', assetName: 'Welding Robot #5', assetName_jp: '溶接ロボット 5号機', location: 'Bay C', priority: 'high', status: 'pending', dueDate: '2026-06-10', dueTime: '11:00', estimatedMins: 25, assignedTo: 'Unassigned', tags: ['robot', 'welding'] },
    { id: 'task-robot-06', title: 'Welding Robot #6 — Monthly Inspection', title_jp: '溶接ロボット 6号機 — 月次点検', assetId: 'asset-robot-06', assetName: 'Welding Robot #6', assetName_jp: '溶接ロボット 6号機', location: 'Bay C', priority: 'high', status: 'pending', dueDate: '2026-06-10', dueTime: '13:00', estimatedMins: 25, assignedTo: 'Unassigned', tags: ['robot', 'welding'] },
    { id: 'task-robot-tig-01', title: 'TIG Welding Robot #1 — Monthly Inspection', title_jp: 'TIG溶接ロボット 1号機 — 月次点検', assetId: 'asset-robot-tig-01', assetName: 'TIG Welding Robot #1', assetName_jp: 'TIG溶接ロボット 1号機', location: 'Bay D', priority: 'high', status: 'pending', dueDate: '2026-06-10', dueTime: '14:00', estimatedMins: 25, assignedTo: 'Unassigned', tags: ['robot', 'welding'] },
    { id: 'task-regulator-01', title: 'Regulator Pillar Left — Monthly Inspection', title_jp: 'ガス調整器 (左柱) — 月次点検', assetId: 'asset-regulator-01', assetName: 'Regulator Pillar Left', assetName_jp: 'ガス調整器 (左柱)', location: 'Pillar Left', priority: 'high', status: 'pending', dueDate: '2026-06-10', dueTime: '15:00', estimatedMins: 15, assignedTo: 'Unassigned', tags: ['regulator', 'gas'] },
    { id: 'task-regulator-02', title: 'Regulator Pillar Right — Monthly Inspection', title_jp: 'ガス調整器 (右柱) — 月次点検', assetId: 'asset-regulator-02', assetName: 'Regulator Pillar Right', assetName_jp: 'ガス調整器 (右柱)', location: 'Pillar Right', priority: 'high', status: 'pending', dueDate: '2026-06-10', dueTime: '16:00', estimatedMins: 15, assignedTo: 'Unassigned', tags: ['regulator', 'gas'] }
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
      txt.textContent = `${text} (v26${envText})`;
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
        // Seed templates
        const templatesSeed = [
          { id: 'template-co2-mag', name: 'CO2/MAG Robot Template', items: [
            { id: 1, title: 'Clean welder rear filter', title_en: 'Clean Welder Rear Filter', title_jp: '溶接機裏側のフィルター清掃', desc: 'Remove rear filter and blow out dust with compressed air or replace with new one.', desc_en: 'Remove rear filter and blow out dust with compressed air or replace with new one.', desc_jp: 'パワーソース（溶接電源）裏側のフィルターを取り外し、粉塵をエアーブローするか、新しいものに交換する。', freq: 'monthly', image: 'image1.jpeg', category: 'A' },
            { id: 2, title: 'Verify robot & joint alignment', title_en: 'Verify Robot & Joint Alignment', title_jp: '定盤位置出し・各軸合わせマークの確認', desc: 'Run calibration program (A, B, C) and verify J1-J6 alignment marks visually.', desc_en: 'Run calibration program (A, B, C) and verify J1-J6 alignment marks visually.', desc_jp: '基準校正プログラムを実行し、定盤A、B、Cでの位置確認と同時に、J1〜J6各軸の合わせマーク（矢印・ケガキ線）が一致しているか目視確認する。', freq: 'monthly', image: 'image10.jpeg', category: 'A' },
            { id: 3, title: 'Test emergency stop button', title_en: 'Test Emergency Stop Button', title_jp: '非常停止ボタンの作動確認', desc: 'Ensure all Emergency buttons halt the robot immediately.', desc_en: 'Ensure all Emergency buttons halt the robot immediately.', desc_jp: 'すべての非常停止ボタンがロボットを即座に停止させるか確認する。', freq: 'monthly', image: 'image4.jpeg', category: 'A' },
            { id: 4, title: 'Check welding ground cable', title_en: 'Check Welding Ground Cable', title_jp: '溶接アース接続部の緩み点検', desc: 'Inspect grounding clamps and table connections for looseness.', desc_en: 'Inspect grounding clamps and table connections for looseness.', desc_jp: 'アースクランプおよび定盤の接続部に緩みがないか点検する。', freq: 'monthly', image: 'generic-check.png', category: 'A' },
            { id: 5, title: 'Test torch shock sensor', title_en: 'Test Torch Shock Sensor', title_jp: 'トーチ衝突検知センサー動作テスト', desc: 'Manually deflect the torch to ensure the collision safety circuit halts the robot.', desc_en: 'Manually deflect the torch to ensure the collision safety circuit halts the robot.', desc_jp: 'トーチの衝突検知センサーを手動で軽くたわませ、安全回路が作動してロボットが即座に一時停止することを確認する。', freq: 'monthly', image: 'generic-check.png', category: 'A' },
            { id: 6, title: 'Verify wire feed pressure (3.5)', title_en: 'Verify Wire Feed Pressure (3.5)', title_jp: '送給装置の送給圧調整（3.5に調整）', desc: 'Check and adjust wire feed roller pressure to exactly 3.5 to prevent slipping.', desc_en: 'Check and adjust wire feed roller pressure to exactly 3.5 to prevent slipping.', desc_jp: '送給装置の加圧ローラーの圧力設定を確認し、ワイヤーの滑りや潰れを防止するために「3.5」に調整・維持する。', freq: 'monthly', image: 'generic-check.png', category: 'A' },
            { id: 7, title: 'Sand & oil welding table', title_en: 'Sand & Oil Welding Table', title_jp: '定盤・溶接台の清掃（研磨・防錆油塗布）', desc: 'Remove spatter with a buffer and apply anti-rust oil to the welding table.', desc_en: 'Remove spatter with a buffer and apply anti-rust oil to the welding table.', desc_jp: 'バフ研磨機でスパッタを除去し、溶接定盤に防錆油を塗布する。', freq: 'monthly', image: 'generic-check.png', category: 'A' },
            { id: 8, title: 'Clean conduit hose inner liner', title_en: 'Clean Conduit Hose Inner Liner', title_jp: 'コンジットホース内のアルコール清掃', desc: 'Clean the conduit hose with alcohol.', desc_en: 'Clean the conduit hose with alcohol.', desc_jp: 'コンジットホースをアルコールで清掃する。', freq: 'semi-annual', image: 'image11.jpeg', category: 'A' },
            { id: 9, title: 'Blow air inside welder & boards', title_en: 'Blow Air Inside Welder & Boards', title_jp: '溶接機・基板内部のエアブロー清掃', desc: 'Remove the cover and blow dry air to remove conductive dust from PCBs and power modules.', desc_en: 'Remove the cover and blow dry air to remove conductive dust from PCBs and power modules.', desc_jp: 'カバーを取り外し、内部基板やパワー半導体に付着した導電性粉塵を乾燥したエアーで吹き飛ばす。', freq: 'annual', image: 'image12.jpeg', category: 'A' },
            { id: 10, title: 'Visual check of mounting bolts', title_en: 'Visual Check of Mounting Bolts', title_jp: 'ロボット台座・取付ボルト緩みの目視点検', desc: 'Visually check base anchor bolts and alignment marks, or perform tap testing.', desc_en: 'Visually check base anchor bolts and alignment marks, or perform tap testing.', desc_jp: 'ロボットベース固定用アンカーボルトが緩んでいないか、合いマークのズレや目視確認、または打音テストによって確認する。', freq: 'annual', image: 'generic-check.png', category: 'A' }
          ]},
          { id: 'template-regulator', name: 'Gas Regulator Template', items: [
            { id: 1, title: 'Check gas leak', title_en: 'Check Gas Leak', title_jp: 'ガス漏れ確認', desc: 'Check for gas leaks (apply leak detector spray to the regulator, coupler, and pipe connections).', desc_en: 'Check for gas leaks (apply leak detector spray to the regulator, coupler, and pipe connections).', desc_jp: 'ガス漏れ確認（レギュレーター、カプラ、配管接続部に探知スプレー）', freq: 'monthly', image: 'image8.jpeg' },
            { id: 2, title: 'Adjust and verify flow rate', title_en: 'Adjust & Verify Flow Rate', title_jp: '流量12L/min調整', desc: 'Adjust the flow rate to 12L/min and verify proper operation.', desc_en: 'Adjust the flow rate to 12L/min and verify proper operation.', desc_jp: '流量12L/min調整・動作確認', freq: 'monthly', image: 'image8.jpeg' }
          ]},
          { id: 'template-utility-gas', name: 'Main Gas Utility Template', items: [
            { id: 1, title: 'Check gas pressure needle', title_en: 'Check Gas Pressure Needle', title_jp: 'ガス圧計ゲージの針確認', desc: 'Check the gas pressure gauge needle in the 1F Courtyard (contact Daimaru Enawin if abnormal).', desc_en: 'Check the gas pressure gauge needle in the 1F Courtyard (contact Daimaru Enawin if abnormal).', desc_jp: '1F中庭 ガス圧計ゲージの針確認（異常時は大丸エナウィンに連絡）', freq: 'monthly', image: 'image2.jpeg' },
            { id: 2, title: 'Check gas leak', title_en: 'Check Gas Leak', title_jp: 'ガス漏れ確認', desc: 'Check for gas leaks (apply leak detector spray to the regulator, coupler, and pipe connections).', desc_en: 'Check for gas leaks (apply leak detector spray to the regulator, coupler, and pipe connections).', desc_jp: 'ガス漏れ確認（レギュレーター、カプラ、配管接続部に探知スプレー）', freq: 'monthly', image: 'image8.jpeg' }
          ]},
          { id: 'template-grinder', name: 'Grinder & Sander Template', items: [
            { id: 1, title: 'Inspect power cable', title_en: 'Inspect Power Cable', title_jp: '電気配線の破損確認', desc: 'Visually inspect the power cable for any damage (look for cracks in the insulation or broken wires).', desc_en: 'Visually inspect the power cable for any damage (look for cracks in the insulation or broken wires).', desc_jp: '電気配線の破損確認（目視による被覆の亀裂や断線の有無）', freq: 'monthly', image: 'generic-check.png' },
            { id: 2, title: 'Check grinding belt wear', title_en: 'Check Grinding Belt Wear', title_jp: '研磨ベルトの摩耗確認', desc: 'Check the grinding belt for wear, cracks, or clogging.', desc_en: 'Check the grinding belt for wear, cracks, or clogging.', desc_jp: '研磨ベルトの摩耗、ひび割れ、目詰まりの確認', freq: 'monthly', image: 'generic-check.png' },
            { id: 3, title: 'Test abnormal vibration / sound', title_en: 'Test Abnormal Vibration / Sound', title_jp: '異音・異常振動確認', desc: 'Run the tool without load to verify switch operation, and check for abnormal noises or vibrations.', desc_en: 'Run the tool without load to verify switch operation, and check for abnormal noises or vibrations.', desc_jp: '無負荷状態で運転させ、スイッチの作動、異音・異常振動が無いか確認', freq: 'monthly', image: 'generic-check.png' }
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
          return Promise.resolve();
        })
        .then(() => {
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
