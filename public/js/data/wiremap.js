/**
 * js/data/wiremap.js — Wire Map data store for Seibi
 *
 * Canvas size: 1060 × 545 px
 * Main room:  x=14, y=22  →  w=1032, h=374  (bottom at y=396)
 * Extension:  x=14, y=396 →  w=155,  h=130  (separate storage area, bottom-left)
 */

'use strict';

const WireMapStore = (() => {

  // ─── Equipment ─────────────────────────────────────────────────────────────
  const EQUIPMENT = [

    // ── FAR LEFT — PILLAR A AREA ──────────────────────────────────────────────
    {
      id: 'tank-a',
      label: 'Gas Tank A',   labelJP: 'ガスタンクA',
      type: 'tank',   shape: 'circle',
      cx: 29, cy: 84, r: 17,
    },
    {
      id: 'pillar-a',
      label: 'Pillar A',   labelJP: '柱A',
      type: 'pillar',   shape: 'rect',
      x: 54, y: 58, w: 45, h: 70,
      note: 'regulators',          // shown as label above the pillar
    },
    {
      id: 'controller-1',
      label: 'Controller 1 + Weld Mach',   labelJP: 'コントローラー1',
      type: 'controller',   shape: 'rect',
      x: 16, y: 140, w: 90, h: 40,
    },

    // ── LEFT MACHINE CLUSTER ──────────────────────────────────────────────────
    {
      id: 'tig-welder-1',
      label: 'TIG Weld Machine 1',   labelJP: 'TIG溶接機1',
      type: 'welder-tig',   shape: 'rect',
      x: 150, y: 62, w: 62, h: 68,
    },
    {
      id: 'co2-welder-1',
      label: 'CO2 Weld Machine 1',   labelJP: 'CO2溶接機1',
      type: 'welder-co2',   shape: 'rect',
      x: 216, y: 62, w: 62, h: 68,
    },
    {
      id: 'tank-b',
      label: 'Gas Tank B',   labelJP: 'ガスタンクB',
      type: 'tank',   shape: 'circle',
      cx: 299, cy: 74, r: 15,
    },
    {
      id: 'controller-2',
      label: 'Controller 2 + Weld Mach',   labelJP: 'コントローラー2',
      type: 'controller',   shape: 'rect',
      x: 280, y: 118, w: 76, h: 40,
    },

    // ── PILLAR B + CENTER-LEFT CONTROLLERS ────────────────────────────────────
    {
      id: 'pillar-b',
      label: 'Pillar B',   labelJP: '柱B',
      type: 'pillar',   shape: 'rect',
      x: 383, y: 58, w: 45, h: 70,
      note: 'regulators',
    },
    {
      id: 'controller-3',
      label: 'Controller 3 + Weld Mach',   labelJP: 'コントローラー3',
      type: 'controller',   shape: 'rect',
      x: 433, y: 64, w: 62, h: 42,
    },
    {
      id: 'controller-4',
      label: 'Controller 4 + Weld Mach',   labelJP: 'コントローラー4',
      type: 'controller',   shape: 'rect',
      x: 499, y: 64, w: 62, h: 42,
    },
    {
      id: 'controller-5',
      label: 'Controller 5 + Weld Mach',   labelJP: 'コントローラー5',
      type: 'controller',   shape: 'rect',
      x: 433, y: 111, w: 62, h: 42,
    },
    {
      id: 'controller-6',
      label: 'Controller 6 + Weld Mach',   labelJP: 'コントローラー6',
      type: 'controller',   shape: 'rect',
      x: 499, y: 111, w: 62, h: 42,
    },
    {
      id: 'controller-7',
      label: 'Controller 7 + Weld Mach',   labelJP: 'コントローラー7',
      type: 'controller',   shape: 'rect',
      x: 565, y: 64, w: 62, h: 42,
    },

    // ── PILLAR C + CENTER-RIGHT MACHINES ──────────────────────────────────────
    {
      id: 'pillar-c',
      label: 'Pillar C',   labelJP: '柱C',
      type: 'pillar',   shape: 'rect',
      x: 645, y: 58, w: 45, h: 70,
    },
    {
      id: 'tig-welder-2',
      label: 'TIG Weld Machine 2',   labelJP: 'TIG溶接機2',
      type: 'welder-tig',   shape: 'rect',
      x: 695, y: 62, w: 62, h: 68,
    },
    {
      id: 'co2-welder-2',
      label: 'CO2 Weld Machine 2',   labelJP: 'CO2溶接機2',
      type: 'welder-co2',   shape: 'rect',
      x: 761, y: 62, w: 62, h: 68,
    },
    {
      id: 'controller-8',
      label: 'Controller 8 + Weld Mach',   labelJP: 'コントローラー8',
      type: 'controller',   shape: 'rect',
      x: 638, y: 132, w: 68, h: 40,
    },

    // ── RIGHT SECTION — PILLAR D AREA ─────────────────────────────────────────
    {
      id: 'controller-9',
      label: 'Controller 9 + Weld Mach',   labelJP: 'コントローラー9',
      type: 'controller',   shape: 'rect',
      x: 862, y: 64, w: 70, h: 42,
    },
    {
      id: 'tank-c',
      label: 'Gas Tank C',   labelJP: 'ガスタンクC',
      type: 'tank',   shape: 'circle',
      cx: 950, cy: 76, r: 15,
    },
    {
      id: 'pillar-d',
      label: 'Pillar D',   labelJP: '柱D',
      type: 'pillar',   shape: 'rect',
      x: 975, y: 58, w: 38, h: 70,
      note: 'regulators',
    },
    {
      id: 'weld-table-right',
      label: 'Weld Table R',   labelJP: '溶接台R',
      type: 'weld-table',   shape: 'rect',
      x: 860, y: 220, w: 130, h: 122,
    },
    {
      id: 'torch-right',
      label: 'Torch (Right)',   labelJP: 'トーチ（右）',
      type: 'torch',   shape: 'circle',
      cx: 988, cy: 374, r: 15,
    },

    // ── 6 ROBOTS ──────────────────────────────────────────────────────────────
    { id:'robot-1', label:'Robot 1', labelJP:'ロボット1', type:'robot', shape:'rect', x:157, y:183, w:66, h:48 },
    { id:'robot-2', label:'Robot 2', labelJP:'ロボット2', type:'robot', shape:'rect', x:280, y:183, w:66, h:48 },
    { id:'robot-3', label:'Robot 3', labelJP:'ロボット3', type:'robot', shape:'rect', x:396, y:183, w:66, h:48 },
    { id:'robot-4', label:'Robot 4', labelJP:'ロボット4', type:'robot', shape:'rect', x:546, y:183, w:66, h:48 },
    { id:'robot-5', label:'Robot 5', labelJP:'ロボット5', type:'robot', shape:'rect', x:655, y:183, w:66, h:48 },
    { id:'robot-6', label:'Robot 6', labelJP:'ロボット6', type:'robot', shape:'rect', x:762, y:183, w:66, h:48 },

    // ── WELD TABLES ROW ───────────────────────────────────────────────────────
    { id:'weld-table-1', label:'Weld Table 1', labelJP:'溶接台1', type:'weld-table', shape:'rect', x:118, y:264, w:92, h:82 },
    { id:'weld-table-2', label:'Weld Table 2', labelJP:'溶接台2', type:'weld-table', shape:'rect', x:215, y:264, w:92, h:82 },
    { id:'weld-table-3', label:'Weld Table 3', labelJP:'溶接台3', type:'weld-table', shape:'rect', x:317, y:264, w:92, h:82 },
    { id:'weld-table-4', label:'Weld Table 4', labelJP:'溶接台4', type:'weld-table', shape:'rect', x:414, y:264, w:92, h:82 },
    { id:'weld-table-5', label:'Weld Table 5', labelJP:'溶接台5', type:'weld-table', shape:'rect', x:512, y:264, w:92, h:82 },
    { id:'weld-table-6', label:'Weld Table 6', labelJP:'溶接台6', type:'weld-table', shape:'rect', x:613, y:264, w:92, h:82 },
    { id:'weld-table-7', label:'Weld Table 7', labelJP:'溶接台7', type:'weld-table', shape:'rect', x:712, y:264, w:92, h:82 },
    { id:'weld-table-8', label:'Weld Table 8', labelJP:'溶接台8', type:'weld-table', shape:'rect', x:810, y:264, w:92, h:82 },

    // ── BOTTOM-LEFT EXTENSION ─────────────────────────────────────────────────
    {
      id: 'torch-left',
      label: 'Torch (Left)',   labelJP: 'トーチ（左）',
      type: 'torch',   shape: 'circle',
      cx: 148, cy: 414, r: 15,
    },
    {
      id: 'weld-table-9',
      label: 'Weld Table 9',   labelJP: '溶接台9',
      type: 'weld-table',   shape: 'rect',
      x: 16, y: 432, w: 120, h: 116,
    },
  ];

  // ─── Wires ─────────────────────────────────────────────────────────────────
  const WIRES = [
    // Robot 1
    { id:'w001', label:'W-001', from:'robot-1', to:'tig-welder-1',   type:'Power',      gauge:'4mm²',    color:'Red / Black',     length:'6m',   condition:'Good', notes:'' },
    { id:'w002', label:'W-002', from:'robot-1', to:'weld-table-1',   type:'Ground',     gauge:'6mm²',    color:'Green / Yellow',  length:'4m',   condition:'Good', notes:'' },
    { id:'w003', label:'W-003', from:'robot-1', to:'controller-2',   type:'Signal',     gauge:'0.75mm²', color:'Blue',            length:'3m',   condition:'Good', notes:'' },
    // Robot 2
    { id:'w004', label:'W-004', from:'robot-2', to:'co2-welder-1',   type:'Power',      gauge:'4mm²',    color:'Red / Black',     length:'5m',   condition:'Good', notes:'' },
    { id:'w005', label:'W-005', from:'robot-2', to:'weld-table-2',   type:'Ground',     gauge:'6mm²',    color:'Green / Yellow',  length:'4m',   condition:'Fair', notes:'Minor insulation wear near clamp' },
    { id:'w006', label:'W-006', from:'robot-2', to:'controller-2',   type:'Signal',     gauge:'0.75mm²', color:'Blue',            length:'3m',   condition:'Good', notes:'' },
    // Robot 3
    { id:'w007', label:'W-007', from:'robot-3', to:'controller-3',   type:'Power',      gauge:'4mm²',    color:'Red / Black',     length:'5m',   condition:'Good', notes:'' },
    { id:'w008', label:'W-008', from:'robot-3', to:'weld-table-3',   type:'Ground',     gauge:'6mm²',    color:'Green / Yellow',  length:'4.5m', condition:'Good', notes:'' },
    { id:'w009', label:'W-009', from:'robot-3', to:'controller-5',   type:'Signal',     gauge:'0.75mm²', color:'Blue',            length:'2.5m', condition:'Good', notes:'' },
    // Robot 4
    { id:'w010', label:'W-010', from:'robot-4', to:'controller-4',   type:'Power',      gauge:'4mm²',    color:'Red / Black',     length:'5m',   condition:'Good', notes:'' },
    { id:'w011', label:'W-011', from:'robot-4', to:'weld-table-5',   type:'Ground',     gauge:'6mm²',    color:'Green / Yellow',  length:'4m',   condition:'Poor', notes:'Replace ASAP — cracked insulation at connector' },
    { id:'w012', label:'W-012', from:'robot-4', to:'controller-6',   type:'Signal',     gauge:'0.75mm²', color:'Blue',            length:'2.5m', condition:'Good', notes:'' },
    // Robot 5
    { id:'w013', label:'W-013', from:'robot-5', to:'tig-welder-2',   type:'Power',      gauge:'4mm²',    color:'Red / Black',     length:'6m',   condition:'Good', notes:'' },
    { id:'w014', label:'W-014', from:'robot-5', to:'weld-table-6',   type:'Ground',     gauge:'6mm²',    color:'Green / Yellow',  length:'4m',   condition:'Good', notes:'' },
    { id:'w015', label:'W-015', from:'robot-5', to:'controller-8',   type:'Signal',     gauge:'0.75mm²', color:'Blue',            length:'3m',   condition:'Fair', notes:'Cable tie loose — needs resecuring' },
    // Robot 6
    { id:'w016', label:'W-016', from:'robot-6', to:'co2-welder-2',   type:'Power',      gauge:'4mm²',    color:'Red / Black',     length:'5m',   condition:'Good', notes:'' },
    { id:'w017', label:'W-017', from:'robot-6', to:'weld-table-7',   type:'Ground',     gauge:'6mm²',    color:'Green / Yellow',  length:'4m',   condition:'Good', notes:'' },
    { id:'w018', label:'W-018', from:'robot-6', to:'controller-9',   type:'Signal',     gauge:'0.75mm²', color:'Blue',            length:'3.5m', condition:'Good', notes:'' },
    // Gas supply
    { id:'w019', label:'W-019', from:'tank-a',  to:'tig-welder-1',   type:'Gas Hose',   gauge:'8mm ID',  color:'Orange',          length:'3m',   condition:'Good', notes:'' },
    { id:'w020', label:'W-020', from:'tank-b',  to:'co2-welder-1',   type:'Gas Hose',   gauge:'8mm ID',  color:'Orange',          length:'2.5m', condition:'Good', notes:'' },
    { id:'w021', label:'W-021', from:'tank-c',  to:'tig-welder-2',   type:'Gas Hose',   gauge:'8mm ID',  color:'Orange',          length:'3m',   condition:'Fair', notes:'Slight kink near welder' },
    { id:'w022', label:'W-022', from:'tank-c',  to:'co2-welder-2',   type:'Gas Hose',   gauge:'8mm ID',  color:'Orange',          length:'4m',   condition:'Good', notes:'' },
    // Torch cables
    { id:'w023', label:'W-023', from:'torch-left',  to:'weld-table-9',     type:'Torch Cable', gauge:'35mm²', color:'Yellow / Red', length:'4m', condition:'Good', notes:'' },
    { id:'w024', label:'W-024', from:'torch-right', to:'weld-table-right', type:'Torch Cable', gauge:'35mm²', color:'Yellow / Red', length:'4m', condition:'Fair', notes:'Outer jacket abraded — needs sleeve' },
    // Bus lines
    { id:'w025', label:'W-025', from:'controller-1', to:'controller-2',  type:'Bus', gauge:'2.5mm²', color:'Grey', length:'8m',  condition:'Good', notes:'' },
    { id:'w026', label:'W-026', from:'controller-3', to:'controller-5',  type:'Bus', gauge:'2.5mm²', color:'Grey', length:'2m',  condition:'Good', notes:'' },
    { id:'w027', label:'W-027', from:'controller-4', to:'controller-6',  type:'Bus', gauge:'2.5mm²', color:'Grey', length:'2m',  condition:'Good', notes:'' },
    { id:'w028', label:'W-028', from:'tank-a',       to:'controller-1',   type:'Gas Hose', gauge:'6mm ID', color:'Orange', length:'1.5m', condition:'Good', notes:'' },
    { id:'w029', label:'W-029', from:'pillar-b',     to:'controller-3',   type:'Gas Hose', gauge:'6mm ID', color:'Orange', length:'2m',  condition:'Good', notes:'' },
    { id:'w030', label:'W-030', from:'pillar-d',     to:'controller-9',   type:'Gas Hose', gauge:'6mm ID', color:'Orange', length:'2m',  condition:'Good', notes:'' },
  ];

  function getWiresFor(id) {
    return WIRES.filter(w => w.from === id || w.to === id);
  }

  function getEquipment(id) {
    return EQUIPMENT.find(e => e.id === id) || null;
  }

  return { EQUIPMENT, WIRES, getWiresFor, getEquipment };

})();
