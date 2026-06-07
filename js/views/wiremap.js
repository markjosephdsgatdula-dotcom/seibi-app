/**
 * js/views/wiremap.js — Wire Map View Controller
 *
 * Renders an interactive factory floor map matching the hand-drawn
 * workshop sketch. Equipment items are clickable and open a side
 * panel showing all wires connected to that item.
 *
 * Canvas: 1060 × 545 px
 *  Main room  : x=14, y=22 → w=1032, h=374  (bottom wall at y=396)
 *  Extension  : x=14, y=396 → w=155, h=130  (bottom-left storage, y=526)
 */

'use strict';

const WireMapView = (() => {

  // Canvas & room bounds
  const W = 1060, H = 545;
  const R = { x1:14, y1:22, x2:1046, y2:396 };   // main room
  const E = { x1:14, y1:396, x2:169, y2:526 };   // extension

  let _sel = null; // currently selected equipment id

  // ─── Type visual config ────────────────────────────────────────────────────
  const CFG = {
    'pillar':     { color:'#6b7099', label:'Pillar'     },
    'tank':       { color:'#e07b39', label:'Gas Tank'   },
    'controller': { color:'#4f7cff', label:'Controller' },
    'welder-tig': { color:'#00b4d8', label:'TIG Welder' },
    'welder-co2': { color:'#f72585', label:'CO2 Welder' },
    'robot':      { color:'#f4a261', label:'Robot'      },
    'weld-table': { color:'#2ec4b6', label:'Weld Table' },
    'torch':      { color:'#e63946', label:'Torch'      },
  };

  const COND = { Good:'#52c41a', Fair:'#faad14', Poor:'#ff4d4f' };

  // ─── Floor plan SVG ────────────────────────────────────────────────────────
  function _svgFloor() {
    const wall  = '#5a6090';
    const grid  = 'rgba(255,255,255,0.028)';
    const fill  = 'rgba(255,255,255,0.012)';
    const wallW = 3.5;

    let g = '';
    // grid lines inside main room
    for (let x = R.x1; x <= R.x2; x += 50)
      g += `<line x1="${x}" y1="${R.y1}" x2="${x}" y2="${R.y2}" stroke="${grid}" stroke-width="1"/>`;
    for (let y = R.y1; y <= R.y2; y += 50)
      g += `<line x1="${R.x1}" y1="${y}" x2="${R.x2}" y2="${y}" stroke="${grid}" stroke-width="1"/>`;
    // grid inside extension
    for (let x = E.x1; x <= E.x2; x += 50)
      g += `<line x1="${x}" y1="${E.y1}" x2="${x}" y2="${E.y2}" stroke="${grid}" stroke-width="1"/>`;
    for (let y = E.y1; y <= E.y2; y += 50)
      g += `<line x1="${E.x1}" y1="${y}" x2="${E.x2}" y2="${y}" stroke="${grid}" stroke-width="1"/>`;

    // Main room rectangle
    const mainRoom = `<rect x="${R.x1}" y="${R.y1}" width="${R.x2-R.x1}" height="${R.y2-R.y1}"
      fill="${fill}" stroke="${wall}" stroke-width="${wallW}" rx="2"/>`;

    // Extension — draw left/bottom/right walls only (top is the main room floor)
    // Opening in the main room bottom wall between x1 and x2 of extension is handled
    // by drawing the extension walls OVER the bottom wall of the main room
    const ext = `
      <rect x="${E.x1}" y="${E.y1}" width="${E.x2-E.x1}" height="${E.y2-E.y1}" fill="${fill}"/>
      <line x1="${E.x1}" y1="${E.y1}" x2="${E.x1}" y2="${E.y2}" stroke="${wall}" stroke-width="${wallW}"/>
      <line x1="${E.x1}" y1="${E.y2}" x2="${E.x2}" y2="${E.y2}" stroke="${wall}" stroke-width="${wallW}"/>
      <line x1="${E.x2}" y1="${E.y2}" x2="${E.x2}" y2="${E.y1}" stroke="${wall}" stroke-width="${wallW}"/>
    `;

    // Erase the bottom-wall segment over the opening (cover it with bg colour)
    const opening = `<line x1="${E.x1+wallW/2}" y1="${R.y2}" x2="${E.x2-wallW/2}" y2="${R.y2}"
      stroke="#0f1117" stroke-width="${wallW+2}"/>`;

    // Room labels
    const labels = `
      <text x="${(R.x1+R.x2)/2}" y="${R.y2-7}"
        text-anchor="middle" fill="rgba(255,255,255,0.06)"
        font-size="11" font-family="Inter,sans-serif" letter-spacing="5">WELDING FLOOR</text>
      <text x="${(E.x1+E.x2)/2}" y="${E.y2-8}"
        text-anchor="middle" fill="rgba(255,255,255,0.07)"
        font-size="9" font-family="Inter,sans-serif" letter-spacing="2">STORAGE</text>
    `;

    return `<svg xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"
      style="position:absolute;top:0;left:0;pointer-events:none;z-index:0;">
      ${g}${mainRoom}${ext}${opening}${labels}
    </svg>`;
  }

  // ─── Build one equipment DOM element ──────────────────────────────────────
  function _buildEl(eq) {
    const cfg = CFG[eq.type] || { color:'#888', label:eq.type };
    const wireCount = WireMapStore.getWiresFor(eq.id).length;
    const lang = (typeof I18n !== 'undefined') ? I18n.getLang() : 'en';
    const lbl = (lang === 'jp' && eq.labelJP) ? eq.labelJP : eq.label;
    const badge = wireCount > 0
      ? `<span class="wm-wire-badge">${wireCount}</span>` : '';

    if (eq.shape === 'circle') {
      const d = eq.r * 2;
      const el = document.createElement('div');
      el.className = 'wm-equipment wm-circle';
      el.id = `wm-eq-${eq.id}`;
      el.dataset.eqId = eq.id;
      el.title = lbl;
      el.style.cssText = `left:${eq.cx-eq.r}px;top:${eq.cy-eq.r}px;width:${d}px;height:${d}px;--eq-color:${cfg.color};`;
      el.innerHTML = `
        <div style="width:${d}px;height:${d}px;border-radius:50%;
          background:${cfg.color}20;border:2px solid ${cfg.color};
          display:flex;align-items:center;justify-content:center;">
          <span style="font-size:${Math.max(7,eq.r-5)}px;font-weight:700;color:${cfg.color};font-family:Inter,sans-serif;">
            ${eq.type==='tank'?'T':eq.type==='torch'?'🔥':'R'}
          </span>
        </div>
        ${badge}`;
      return el;
    }

    // Rectangle
    const el = document.createElement('div');
    el.className = 'wm-equipment wm-rect';
    el.id = `wm-eq-${eq.id}`;
    el.dataset.eqId = eq.id;
    el.title = lbl;
    el.style.cssText = `left:${eq.x}px;top:${eq.y}px;width:${eq.w}px;height:${eq.h}px;
      --eq-color:${cfg.color};border-color:${cfg.color}80;`;

    // Short labels that fit inside each box
    const inner = _innerLabel(eq, cfg);
    const noteEl = eq.note
      ? `<span class="wm-pillar-note">${eq.note}</span>` : '';

    el.innerHTML = `
      ${noteEl}
      <div class="wm-eq-inner" style="color:${cfg.color};">
        <span class="wm-eq-text" style="font-size:${_fontSize(eq)}px;">${inner}</span>
      </div>
      ${badge}`;
    return el;
  }

  function _fontSize(eq) {
    if (eq.w >= 90) return 9;
    if (eq.w >= 65) return 8;
    return 7;
  }

  function _innerLabel(eq, cfg) {
    if (eq.type === 'pillar')     return eq.label.replace('Pillar ', 'PILLAR<br>');
    if (eq.type === 'robot')      return eq.label.replace('Robot ', 'ROBOT ');
    if (eq.type === 'weld-table') return 'WELD<br>TABLE';
    if (eq.type === 'welder-tig') return 'TIG<br>Weld Mach';
    if (eq.type === 'welder-co2') return 'CO2<br>Weld Mach';
    if (eq.type === 'controller') return 'Controller<br>+ Weld Mach';
    return eq.label;
  }

  // ─── Detail panel ─────────────────────────────────────────────────────────
  function _makePanel() {
    const d = document.createElement('div');
    d.id = 'wm-detail-panel';
    d.className = 'wm-detail-panel';
    d.innerHTML = `
      <div class="wm-panel-header">
        <div>
          <div class="wm-panel-type-badge" id="wm-panel-badge"></div>
          <h2 class="wm-panel-title" id="wm-panel-title">—</h2>
        </div>
        <button class="wm-panel-close" id="wm-panel-close" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="wm-panel-body" id="wm-panel-body">
        <div class="wm-panel-empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.25">
            <polyline points="9 11 12 14 22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <p>Click any item on the map<br>to see its wires</p>
        </div>
      </div>`;
    return d;
  }

  function _fillPanel(eqId) {
    const eq = WireMapStore.getEquipment(eqId);
    if (!eq) return;
    const cfg = CFG[eq.type] || { color:'#888', label:eq.type };
    const lang = (typeof I18n !== 'undefined') ? I18n.getLang() : 'en';
    const lbl = (lang === 'jp' && eq.labelJP) ? eq.labelJP : eq.label;
    const wires = WireMapStore.getWiresFor(eqId);

    const badge = document.getElementById('wm-panel-badge');
    const title = document.getElementById('wm-panel-title');
    const body  = document.getElementById('wm-panel-body');

    if (badge) {
      badge.textContent = cfg.label;
      badge.style.cssText = `background:${cfg.color}20;color:${cfg.color};border-color:${cfg.color}50;`;
    }
    if (title) title.textContent = lbl;
    if (!body) return;

    if (!wires.length) {
      body.innerHTML = `<div class="wm-panel-empty"><p>No wires registered for this item.</p></div>`;
      return;
    }

    const rows = wires.map(w => {
      const isFrom = w.from === eqId;
      const other  = WireMapStore.getEquipment(isFrom ? w.to : w.from);
      const otherLbl = other
        ? ((lang==='jp'&&other.labelJP) ? other.labelJP : other.label)
        : (isFrom ? w.to : w.from);
      const cc = COND[w.condition] || '#888';
      return `
        <div class="wm-wire-row">
          <div class="wm-wire-label-row">
            <span class="wm-wire-label">${w.label}</span>
            <span class="wm-wire-condition" style="color:${cc};background:${cc}18;border-color:${cc}44;">${w.condition}</span>
          </div>
          <div class="wm-wire-endpoint">
            <span class="wm-wire-dir">${isFrom?'→':'←'}</span>
            <span class="wm-wire-peer">${otherLbl}</span>
          </div>
          <div class="wm-wire-specs">
            <span class="wm-wire-spec"><span class="wm-spec-key">Type</span>${w.type}</span>
            <span class="wm-wire-spec"><span class="wm-spec-key">Gauge</span>${w.gauge}</span>
            <span class="wm-wire-spec"><span class="wm-spec-key">Color</span>${w.color}</span>
            <span class="wm-wire-spec"><span class="wm-spec-key">Length</span>${w.length}</span>
          </div>
          ${w.notes ? `<div class="wm-wire-notes">📝 ${w.notes}</div>` : ''}
        </div>`;
    }).join('');

    body.innerHTML = `
      <div class="wm-wire-count">${wires.length} wire${wires.length!==1?'s':''} connected</div>
      <div class="wm-wire-list">${rows}</div>`;
  }

  // ─── Select / deselect ────────────────────────────────────────────────────
  function _select(id) {
    if (_sel) {
      const prev = document.getElementById(`wm-eq-${_sel}`);
      if (prev) prev.classList.remove('selected');
    }
    const panel = document.getElementById('wm-detail-panel');

    if (_sel === id) { // toggle off
      _sel = null;
      if (panel) panel.classList.remove('open');
      return;
    }

    _sel = id;
    const el = document.getElementById(`wm-eq-${id}`);
    if (el) el.classList.add('selected');
    _fillPanel(id);
    if (panel) panel.classList.add('open');
  }

  // ─── Legend ───────────────────────────────────────────────────────────────
  function _legend() {
    const items = ['welder-tig','welder-co2','robot','weld-table','controller','tank','torch','pillar'];
    return `<div class="wm-legend">
      ${items.map(t => {
        const c = CFG[t];
        return `<div class="wm-legend-item">
          <span class="wm-legend-dot" style="background:${c.color};"></span>
          <span>${c.label}</span>
        </div>`;
      }).join('')}
    </div>`;
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  function init() {
    const view = document.getElementById('view-wiremap');
    if (!view) return;

    _sel = null;

    view.innerHTML = `
      <div class="wm-toolbar">
        <div class="wm-toolbar-left">
          <h1 class="view-title">Wire Map</h1>
          <span class="wm-hint">Tap any item to view its wires</span>
        </div>
        ${_legend()}
      </div>
      <div class="wm-layout">
        <div class="wm-scroll-wrapper">
          <div class="wm-map-container" id="wm-map" style="width:${W}px;height:${H}px;position:relative;">
            ${_svgFloor()}
          </div>
        </div>
      </div>`;

    const layout = view.querySelector('.wm-layout');
    layout.appendChild(_makePanel());

    const mapEl = document.getElementById('wm-map');

    // Render equipment
    WireMapStore.EQUIPMENT.forEach(eq => {
      const el = _buildEl(eq);
      el.addEventListener('click', e => { e.stopPropagation(); _select(eq.id); });
      mapEl.appendChild(el);
    });

    // Click blank map → deselect
    mapEl.addEventListener('click', () => {
      if (_sel) {
        const prev = document.getElementById(`wm-eq-${_sel}`);
        if (prev) prev.classList.remove('selected');
        _sel = null;
        const panel = document.getElementById('wm-detail-panel');
        if (panel) panel.classList.remove('open');
      }
    });

    // Close button
    const closeBtn = document.getElementById('wm-panel-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (_sel) {
          const prev = document.getElementById(`wm-eq-${_sel}`);
          if (prev) prev.classList.remove('selected');
          _sel = null;
        }
        const panel = document.getElementById('wm-detail-panel');
        if (panel) panel.classList.remove('open');
      });
    }
  }

  function refresh() { init(); }

  return { init, refresh };

})();
