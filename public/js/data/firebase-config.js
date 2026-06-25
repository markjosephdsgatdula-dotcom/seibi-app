/**
 * data/firebase-config.js — Firebase Configuration & Initialization
 *
 * Firebase is the SINGLE SOURCE OF TRUTH for all app data.
 * In-memory cache (FirebaseSync.cache) provides fast access during a session.
 * Firebase .on('value') listeners keep the cache updated in real-time.
 * No localStorage is used for data persistence.
 */

'use strict';

const SEIBI_ENV = 'production';

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

let firebaseApp;
let firebaseAuth;
let firebaseDb;
let firebaseStorage;
let firebaseMessaging;
if (typeof firebase !== 'undefined') {
  firebaseApp = firebase.initializeApp(firebaseConfig);
  if (typeof firebaseApp.auth === 'function') {
    firebaseAuth = firebaseApp.auth();
  }
  if (typeof firebaseApp.database === 'function') {
    firebaseDb = firebaseApp.database();
  }
  if (typeof firebaseApp.storage === 'function') {
    firebaseStorage = firebaseApp.storage();
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
  let _nodesReady = { assets: false, templates: false, tasks: false, notices: false, history: false, equipment: false, wires: false };

  // ─── In-memory cache: THE source of truth for the UI ─────────────────────
  const cache = {
    assets: [],
    templates: [],
    tasks: [],
    notices: [],
    history: [],
    equipment: [],
    wires: []
  };

  // ─── Seed data (pushed to Firebase only if the node is completely empty) ──

  const _equipmentSeed = [
    { id: 'tank-a', label: 'Gas Tank A', labelJP: 'ガスタンクA', type: 'tank', shape: 'circle', cx: 29, cy: 84, r: 17 },
    { id: 'pillar-a', label: 'Pillar A', labelJP: '柱A', type: 'pillar', shape: 'rect', x: 54, y: 58, w: 45, h: 70, note: 'regulators' },
    { id: 'controller-1', label: 'Controller 1 + Weld Mach', labelJP: 'コントローラー1', type: 'controller', shape: 'rect', x: 16, y: 140, w: 90, h: 40 },
    { id: 'tig-welder-1', label: 'TIG Weld Machine 1', labelJP: 'TIG溶接機1', type: 'welder-tig', shape: 'rect', x: 150, y: 62, w: 62, h: 68 },
    { id: 'co2-welder-1', label: 'CO2 Weld Machine 1', labelJP: 'CO2溶接機1', type: 'welder-co2', shape: 'rect', x: 216, y: 62, w: 62, h: 68 },
    { id: 'tank-b', label: 'Gas Tank B', labelJP: 'ガスタンクB', type: 'tank', shape: 'circle', cx: 299, cy: 74, r: 15 },
    { id: 'controller-2', label: 'Controller 2 + Weld Mach', labelJP: 'コントローラー2', type: 'controller', shape: 'rect', x: 280, y: 118, w: 76, h: 40 },
    { id: 'pillar-b', label: 'Pillar B', labelJP: '柱B', type: 'pillar', shape: 'rect', x: 383, y: 58, w: 45, h: 70, note: 'regulators' },
    { id: 'controller-3', label: 'Controller 3 + Weld Mach', labelJP: 'コントローラー3', type: 'controller', shape: 'rect', x: 433, y: 64, w: 62, h: 42 },
    { id: 'controller-4', label: 'Controller 4 + Weld Mach', labelJP: 'コントローラー4', type: 'controller', shape: 'rect', x: 499, y: 64, w: 62, h: 42 },
    { id: 'controller-5', label: 'Controller 5 + Weld Mach', labelJP: 'コントローラー5', type: 'controller', shape: 'rect', x: 433, y: 111, w: 62, h: 42 },
    { id: 'controller-6', label: 'Controller 6 + Weld Mach', labelJP: 'コントローラー6', type: 'controller', shape: 'rect', x: 499, y: 111, w: 62, h: 42 },
    { id: 'controller-7', label: 'Controller 7 + Weld Mach', labelJP: 'コントローラー7', type: 'controller', shape: 'rect', x: 565, y: 64, w: 62, h: 42 },
    { id: 'pillar-c', label: 'Pillar C', labelJP: '柱C', type: 'pillar', shape: 'rect', x: 645, y: 58, w: 45, h: 70 },
    { id: 'tig-welder-2', label: 'TIG Weld Machine 2', labelJP: 'TIG溶接機2', type: 'welder-tig', shape: 'rect', x: 695, y: 62, w: 62, h: 68 },
    { id: 'co2-welder-2', label: 'CO2 Weld Machine 2', labelJP: 'CO2溶接機2', type: 'welder-co2', shape: 'rect', x: 761, y: 62, w: 62, h: 68 },
    { id: 'controller-8', label: 'Controller 8 + Weld Mach', labelJP: 'コントローラー8', type: 'controller', shape: 'rect', x: 638, y: 132, w: 68, h: 40 },
    { id: 'controller-9', label: 'Controller 9 + Weld Mach', labelJP: 'コントローラー9', type: 'controller', shape: 'rect', x: 862, y: 64, w: 70, h: 42 },
    { id: 'tank-c', label: 'Gas Tank C', labelJP: 'ガスタンクC', type: 'tank', shape: 'circle', cx: 950, cy: 76, r: 15 },
    { id: 'pillar-d', label: 'Pillar D', labelJP: '柱D', type: 'pillar', shape: 'rect', x: 975, y: 58, w: 38, h: 70, note: 'regulators' },
    { id: 'weld-table-right', label: 'Weld Table R', labelJP: '溶接台R', type: 'weld-table', shape: 'rect', x: 860, y: 220, w: 130, h: 122 },
    { id: 'torch-right', label: 'Torch (Right)', labelJP: 'トーチ（右）', type: 'torch', shape: 'circle', cx: 988, cy: 374, r: 15 },
    { id: 'robot-1', label: 'Robot 1', labelJP: 'ロボット1', type: 'robot', shape: 'rect', x: 157, y: 183, w: 66, h: 48 },
    { id: 'robot-2', label: 'Robot 2', labelJP: 'ロボット2', type: 'robot', shape: 'rect', x: 280, y: 183, w: 66, h: 48 },
    { id: 'robot-3', label: 'Robot 3', labelJP: 'ロボット3', type: 'robot', shape: 'rect', x: 396, y: 183, w: 66, h: 48 },
    { id: 'robot-4', label: 'Robot 4', labelJP: 'ロボット4', type: 'robot', shape: 'rect', x: 546, y: 183, w: 66, h: 48 },
    { id: 'robot-5', label: 'Robot 5', labelJP: 'ロボット5', type: 'robot', shape: 'rect', x: 655, y: 183, w: 66, h: 48 },
    { id: 'robot-6', label: 'Robot 6', labelJP: 'ロボット6', type: 'robot', shape: 'rect', x: 762, y: 183, w: 66, h: 48 },
    { id: 'weld-table-1', label: 'Weld Table 1', labelJP: '溶接台1', type: 'weld-table', shape: 'rect', x: 118, y: 264, w: 92, h: 82 },
    { id: 'weld-table-2', label: 'Weld Table 2', labelJP: '溶接台2', type: 'weld-table', shape: 'rect', x: 215, y: 264, w: 92, h: 82 },
    { id: 'weld-table-3', label: 'Weld Table 3', labelJP: '溶接台3', type: 'weld-table', shape: 'rect', x: 317, y: 264, w: 92, h: 82 },
    { id: 'weld-table-4', label: 'Weld Table 4', labelJP: '溶接台4', type: 'weld-table', shape: 'rect', x: 414, y: 264, w: 92, h: 82 },
    { id: 'weld-table-5', label: 'Weld Table 5', labelJP: '溶接台5', type: 'weld-table', shape: 'rect', x: 512, y: 264, w: 92, h: 82 },
    { id: 'weld-table-6', label: 'Weld Table 6', labelJP: '溶接台6', type: 'weld-table', shape: 'rect', x: 613, y: 264, w: 92, h: 82 },
    { id: 'weld-table-7', label: 'Weld Table 7', labelJP: '溶接台7', type: 'weld-table', shape: 'rect', x: 712, y: 264, w: 92, h: 82 },
    { id: 'weld-table-8', label: 'Weld Table 8', labelJP: '溶接台8', type: 'weld-table', shape: 'rect', x: 810, y: 264, w: 92, h: 82 },
    { id: 'torch-left', label: 'Torch (Left)', labelJP: 'トーチ（左）', type: 'torch', shape: 'circle', cx: 148, cy: 414, r: 15 },
    { id: 'weld-table-9', label: 'Weld Table 9', labelJP: '溶接台9', type: 'weld-table', shape: 'rect', x: 16, y: 432, w: 120, h: 116 }
  ];

  const _wiresSeed = [
    { id: 'w001', label: 'W-001', from: 'robot-1', to: 'tig-welder-1', type: 'Power', gauge: '4mm²', color: 'Red / Black', length: '6m', condition: 'Good', notes: '' },
    { id: 'w002', label: 'W-002', from: 'robot-1', to: 'weld-table-1', type: 'Ground', gauge: '6mm²', color: 'Green / Yellow', length: '4m', condition: 'Good', notes: '' },
    { id: 'w003', label: 'W-003', from: 'robot-1', to: 'controller-2', type: 'Signal', gauge: '0.75mm²', color: 'Blue', length: '3m', condition: 'Good', notes: '' },
    { id: 'w004', label: 'W-004', from: 'robot-2', to: 'co2-welder-1', type: 'Power', gauge: '4mm²', color: 'Red / Black', length: '5m', condition: 'Good', notes: '' },
    { id: 'w005', label: 'W-005', from: 'robot-2', to: 'weld-table-2', type: 'Ground', gauge: '6mm²', color: 'Green / Yellow', length: '4m', condition: 'Fair', notes: 'Minor insulation wear near clamp' },
    { id: 'w006', label: 'W-006', from: 'robot-2', to: 'controller-2', type: 'Signal', gauge: '0.75mm²', color: 'Blue', length: '3m', condition: 'Good', notes: '' },
    { id: 'w007', label: 'W-007', from: 'robot-3', to: 'controller-3', type: 'Power', gauge: '4mm²', color: 'Red / Black', length: '5m', condition: 'Good', notes: '' },
    { id: 'w008', label: 'W-008', from: 'robot-3', to: 'weld-table-3', type: 'Ground', gauge: '6mm²', color: 'Green / Yellow', length: '4.5m', condition: 'Good', notes: '' },
    { id: 'w009', label: 'W-009', from: 'robot-3', to: 'controller-5', type: 'Signal', gauge: '0.75mm²', color: 'Blue', length: '2.5m', condition: 'Good', notes: '' },
    { id: 'w010', label: 'W-010', from: 'robot-4', to: 'controller-4', type: 'Power', gauge: '4mm²', color: 'Red / Black', length: '5m', condition: 'Good', notes: '' },
    { id: 'w011', label: 'W-011', from: 'robot-4', to: 'weld-table-5', type: 'Ground', gauge: '6mm²', color: 'Green / Yellow', length: '4m', condition: 'Poor', notes: 'Replace ASAP — cracked insulation at connector' },
    { id: 'w012', label: 'W-012', from: 'robot-4', to: 'controller-6', type: 'Signal', gauge: '0.75mm²', color: 'Blue', length: '2.5m', condition: 'Good', notes: '' },
    { id: 'w013', label: 'W-013', from: 'robot-5', to: 'tig-welder-2', type: 'Power', gauge: '4mm²', color: 'Red / Black', length: '6m', condition: 'Good', notes: '' },
    { id: 'w014', label: 'W-014', from: 'robot-5', to: 'weld-table-6', type: 'Ground', gauge: '6mm²', color: 'Green / Yellow', length: '4m', condition: 'Good', notes: '' },
    { id: 'w015', label: 'W-015', from: 'robot-5', to: 'controller-8', type: 'Signal', gauge: '0.75mm²', color: 'Blue', length: '3m', condition: 'Fair', notes: 'Cable tie loose — needs resecuring' },
    { id: 'w016', label: 'W-016', from: 'robot-6', to: 'co2-welder-2', type: 'Power', gauge: '4mm²', color: 'Red / Black', length: '5m', condition: 'Good', notes: '' },
    { id: 'w017', label: 'W-017', from: 'robot-6', to: 'weld-table-7', type: 'Ground', gauge: '6mm²', color: 'Green / Yellow', length: '4m', condition: 'Good', notes: '' },
    { id: 'w018', label: 'W-018', from: 'robot-6', to: 'controller-9', type: 'Signal', gauge: '0.75mm²', color: 'Blue', length: '3.5m', condition: 'Good', notes: '' },
    { id: 'w019', label: 'W-019', from: 'tank-a', to: 'tig-welder-1', type: 'Gas Hose', gauge: '8mm ID', color: 'Orange', length: '3m', condition: 'Good', notes: '' },
    { id: 'w020', label: 'W-020', from: 'tank-b', to: 'co2-welder-1', type: 'Gas Hose', gauge: '8mm ID', color: 'Orange', length: '2.5m', condition: 'Good', notes: '' },
    { id: 'w021', label: 'W-021', from: 'tank-c', to: 'tig-welder-2', type: 'Gas Hose', gauge: '8mm ID', color: 'Orange', length: '3m', condition: 'Fair', notes: 'Slight kink near welder' },
    { id: 'w022', label: 'W-022', from: 'tank-c', to: 'co2-welder-2', type: 'Gas Hose', gauge: '8mm ID', color: 'Orange', length: '4m', condition: 'Good', notes: '' },
    { id: 'w023', label: 'W-023', from: 'torch-left', to: 'weld-table-9', type: 'Torch Cable', gauge: '35mm²', color: 'Yellow / Red', length: '4m', condition: 'Good', notes: '' },
    { id: 'w024', label: 'W-024', from: 'torch-right', to: 'weld-table-right', type: 'Torch Cable', gauge: '35mm²', color: 'Yellow / Red', length: '4m', condition: 'Fair', notes: 'Outer jacket abraded — needs sleeve' },
    { id: 'w025', label: 'W-025', from: 'controller-1', to: 'controller-2', type: 'Bus', gauge: '2.5mm²', color: 'Grey', length: '8m', condition: 'Good', notes: '' },
    { id: 'w026', label: 'W-026', from: 'controller-3', to: 'controller-5', type: 'Bus', gauge: '2.5mm²', color: 'Grey', length: '2m', condition: 'Good', notes: '' },
    { id: 'w027', label: 'W-027', from: 'controller-4', to: 'controller-6', type: 'Bus', gauge: '2.5mm²', color: 'Grey', length: '2m', condition: 'Good', notes: '' },
    { id: 'w028', label: 'W-028', from: 'tank-a', to: 'controller-1', type: 'Gas Hose', gauge: '6mm ID', color: 'Orange', length: '1.5m', condition: 'Good', notes: '' },
    { id: 'w029', label: 'W-029', from: 'pillar-b', to: 'controller-3', type: 'Gas Hose', gauge: '6mm ID', color: 'Orange', length: '2m', condition: 'Good', notes: '' },
    { id: 'w030', label: 'W-030', from: 'pillar-d', to: 'controller-9', type: 'Gas Hose', gauge: '6mm ID', color: 'Orange', length: '2m', condition: 'Good', notes: '' }
  ];

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
    { id: 'task-regulator-02', title: 'Regulator Pillar Right — Monthly Inspection', title_jp: 'ガス調整器 (右柱) — 月次点検', assetId: 'asset-regulator-02', assetName: 'Regulator Pillar Right', assetName_jp: 'ガス調整器 (右柱)', location: 'Pillar Right', priority: 'high', status: 'pending', dueDate: '2026-06-10', dueTime: '16:00', estimatedMins: 15, assignedTo: 'Unassigned', tags: ['regulator', 'gas'] },
    { id: 'task-utility-gas-01', title: 'Main Gas Utility — Monthly Inspection', title_jp: 'メインガス供給設備 — 月次点検', assetId: 'asset-utility-gas-01', assetName: 'Main Gas Utility', assetName_jp: 'メインガス供給設備', location: '1F Courtyard', priority: 'high', status: 'pending', dueDate: '2026-06-10', dueTime: '17:00', estimatedMins: 20, assignedTo: 'Unassigned', tags: ['utility', 'gas'] }
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
      txt.textContent = `${text} (v27)`;
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
            { id: 1, title: 'Check gas pressure needle', title_en: 'Check Gas Pressure Needle', title_jp: 'ガス圧計ゲージの針確認', desc: 'Check the gas pressure gauge needle in the 1F Courtyard (contact Daimaru Enawin if abnormal).', desc_en: 'Check the gas pressure gauge needle in the 1F Courtyard (contact Daimaru Enawin if abnormal).', desc_jp: '1F中庭 ガス圧計ゲージの針確認（異常時は大丸エナウィンに連絡）', freq: 'monthly', image: 'images/gas-utility.jpg' },
            { id: 2, title: 'Check gas leak', title_en: 'Check Gas Leak', title_jp: 'ガス漏れ確認', desc: 'Check for gas leaks (apply leak detector spray to the regulator, coupler, and pipe connections).', desc_en: 'Check for gas leaks (apply leak detector spray to the regulator, coupler, and pipe connections).', desc_jp: 'ガス漏れ確認（レギュレーター、カプラ、配管接続部に探知スプレー）', freq: 'monthly', image: 'images/gas-leak.jpg' }
          ]},
          { id: 'template-grinder', name: 'Grinder & Sander Template', items: [
            { id: 1, title: 'Inspect power cable', title_en: 'Inspect Power Cable', title_jp: '電気配線の破損確認', desc: 'Visually inspect the power cable for any damage (look for cracks in the insulation or broken wires).', desc_en: 'Visually inspect the power cable for any damage (look for cracks in the insulation or broken wires).', desc_jp: '電気配線の破損確認（目視による被覆の亀裂や断線の有無）', freq: 'monthly', image: 'generic-check.png' },
            { id: 2, title: 'Check grinding belt wear', title_en: 'Check Grinding Belt Wear', title_jp: '研磨ベルトの摩耗確認', desc: 'Check the grinding belt for wear, cracks, or clogging.', desc_en: 'Check the grinding belt for wear, cracks, or clogging.', desc_jp: '研磨ベルトの摩耗、ひび割れ、目詰まりの確認', freq: 'monthly', image: 'generic-check.png' },
            { id: 3, title: 'Test abnormal vibration / sound', title_en: 'Test Abnormal Vibration / Sound', title_jp: '異音・異常振動確認', desc: 'Run the tool without load to verify switch operation, and check for abnormal noises or vibrations.', desc_en: 'Run the tool without load to verify switch operation, and check for abnormal noises or vibrations.', desc_jp: '無負荷状態で運転させ、スイッチの作動、異音・異常振動が無いか確認', freq: 'monthly', image: 'generic-check.png' }
          ]}
        ];

      if (data) {
        let list = Array.isArray(data) ? data : Object.values(data);
        let needsMigration = false;
        
        const migratedList = list.map(tpl => {
          const seedTpl = templatesSeed.find(s => s.id === tpl.id);
          if (seedTpl) {
            const isMissingJp = tpl.items && tpl.items.some(item => {
              const seedItem = seedTpl.items.find(si => si.id === item.id);
              const seedHasJp = seedItem && /[\u3040-\u30ff\u4e00-\u9fff]/.test(seedItem.title_jp);
              const itemHasJp = item.title_jp && /[\u3040-\u30ff\u4e00-\u9fff]/.test(item.title_jp);
              return !item.title_jp || (seedHasJp && !itemHasJp);
            });
            if (isMissingJp) {
              needsMigration = true;
              console.log(`[FirebaseSync] Migrating template ${tpl.id} to include translations.`);
              const mergedItems = tpl.items.map(item => {
                const seedItem = seedTpl.items.find(si => si.id === item.id);
                if (seedItem) {
                  const seedHasJp = /[\u3040-\u30ff\u4e00-\u9fff]/.test(seedItem.title_jp);
                  const itemHasJp = item.title_jp && /[\u3040-\u30ff\u4e00-\u9fff]/.test(item.title_jp);
                  const shouldOverwriteJp = !item.title_jp || (seedHasJp && !itemHasJp);
                  return {
                    ...item,
                    title_jp: shouldOverwriteJp ? seedItem.title_jp : item.title_jp,
                    desc_jp: shouldOverwriteJp ? seedItem.desc_jp : item.desc_jp,
                    title_en: item.title_en || seedItem.title_en,
                    desc_en: item.desc_en || seedItem.desc_en
                  };
                }
                return item;
              });
              return {
                ...tpl,
                items: mergedItems
              };
            }
          }
          return tpl;
        });

        if (needsMigration) {
          db.ref('templates').set(migratedList);
          cache.templates = migratedList;
        } else {
          cache.templates = list;
        }
      } else {
        db.ref('templates').set(templatesSeed);
        cache.templates = [...templatesSeed];
      }

      _markReady('templates');
    }, handleErr('templates'));

    // 3. Tasks sync
    db.ref('tasks').on('value', snapshot => {
      const data = snapshot.val();
      let tasksList = [];
      if (data) {
        tasksList = Array.isArray(data) ? data : Object.values(data);
      } else {
        tasksList = [..._tasksSeed];
      }

      // Auto-reconcile: If 'asset-utility-gas-01' has no task in the list, seed it
      const hasUtilityTask = tasksList.some(t => t.assetId === 'asset-utility-gas-01');
      if (!hasUtilityTask) {
        console.log('[FirebaseSync] Main Gas Utility task is missing. Adding it to tasks...');
        const utilityTask = {
          id: 'task-utility-gas-01',
          title: 'Main Gas Utility — Monthly Inspection',
          title_jp: 'メインガス供給設備 — 月次点検',
          assetId: 'asset-utility-gas-01',
          assetName: 'Main Gas Utility',
          assetName_jp: 'メインガス供給設備',
          location: '1F Courtyard',
          priority: 'high',
          status: 'pending',
          dueDate: '2026-06-10',
          dueTime: '17:00',
          estimatedMins: 20,
          assignedTo: 'Unassigned',
          tags: ['utility', 'gas']
        };
        tasksList.push(utilityTask);
        // Save back to firebase
        db.ref('tasks').set(tasksList);
      }

      cache.tasks = tasksList;
      _markReady('tasks');
      if (typeof HomeView !== 'undefined') HomeView.refresh();
      if (typeof CalendarView !== 'undefined') CalendarView.init();
    }, handleErr('tasks'));

    // 4. Notices sync
    db.ref('notices').on('value', snapshot => {
      const data = snapshot.val();
      if (data) {
        const keys = Object.keys(data);
        const isLegacyArray = keys.length > 0 && keys.every(k => !isNaN(parseInt(k, 10)));

        if (isLegacyArray) {
          // One-time migration: convert numeric-keyed array to ID-keyed object.
          console.log('[FirebaseSync] Migrating /notices from array format to ID-keyed format...');
          const migrated = {};
          Object.values(data).forEach(n => { if (n && n.id) migrated[n.id] = n; });
          db.ref('notices').set(migrated); // single rewrite — safe, no race risk here
          cache.notices = Object.values(migrated);
        } else {
          cache.notices = Object.values(data);
        }
      } else {
        cache.notices = [];
      }
      _markReady('notices');
      if (typeof NoticeView !== 'undefined') NoticeView.refreshFeed();
    }, handleErr('notices'));

    // 5. History sync (limit to last 50 to save bandwidth)
    db.ref('history').orderByKey().limitToLast(50).on('value', snapshot => {
      const data = snapshot.val();
      if (data) {
        cache.history = (Array.isArray(data) ? data : Object.values(data)).filter(Boolean);
      } else {
        cache.history = [];
      }
      _markReady('history');
      if (typeof HistoryView !== 'undefined') HistoryView.init();
    }, handleErr('history'));

    // 6. Equipment sync
    db.ref('equipment').on('value', snapshot => {
      const data = snapshot.val();
      if (data) {
        cache.equipment = Array.isArray(data) ? data : Object.values(data);
      } else {
        db.ref('equipment').set(_equipmentSeed);
        cache.equipment = [..._equipmentSeed];
      }
      _markReady('equipment');
      if (typeof WireMapView !== 'undefined') WireMapView.refresh();
    }, handleErr('equipment'));

    // 7. Wires sync
    db.ref('wires').on('value', snapshot => {
      const data = snapshot.val();
      if (data) {
        cache.wires = Array.isArray(data) ? data : Object.values(data);
      } else {
        db.ref('wires').set(_wiresSeed);
        cache.wires = [..._wiresSeed];
      }
      _markReady('wires');
      if (typeof WireMapView !== 'undefined') WireMapView.refresh();
    }, handleErr('wires'));

    console.log('[Firebase] Real-time synchronization listeners attached.');
    }; // end setupDatabaseListeners

    // Force auth token propagation to the RTDB connection before attaching
    // listeners. Without this, the first read fires before the token is ready
    // and gets a Permission Denied on first login (works fine on refresh).
    const tokenReady = (firebaseAuth && firebaseAuth.currentUser)
      ? firebaseAuth.currentUser.getIdToken()
      : Promise.resolve();

    tokenReady.then(() => {
      setupDatabaseListeners();
    });

    return _readyPromise;
  }

  function uploadPhoto(blob, path) {
    if (!firebaseStorage) {
      return Promise.reject(new Error('Firebase Storage not initialized'));
    }
    const ref = firebaseStorage.ref().child(path);
    return ref.put(blob).then(snapshot => snapshot.ref.getDownloadURL());
  }

  /** Returns a Promise that resolves when all data nodes have loaded their first snapshot. */
  function ready() {
    return _readyPromise;
  }

  return { start, ready, cache, uploadPhoto };

})();
