/**
 * js/views/wiremap.js — Wire Map View Controller
 *
 * Renders an interactive factory floor map matching the hand-drawn
 * workshop sketch. Equipment items are clickable and open a side
 * panel showing all wires connected to that item.
 *
 * Provides a Layout Edit mode allowing users to drag and reposition
 * items, add new ones, and delete items.
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

  let _sel = null; // currently selected equipment id in view mode
  let _editMode = false;
  let _draftEquipment = [];
  let _selectedEditId = null; // selected equipment id in edit mode
  
  // Dragging state
  let _draggedId = null;
  let _dragStartX = 0;
  let _dragStartY = 0;
  let _dragStartPos = {}; // starting coordinates

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

  // Bounding check helper to keep dragged elements inside workshop bounds
  function _boundPosition(cx, cy, radius, shape, rectW, rectH) {
    const halfW = shape === 'circle' ? radius : rectW / 2;
    const halfH = shape === 'circle' ? radius : rectH / 2;
    
    let x = cx;
    let y = cy;

    // Check if within extension zone (left area below main floor)
    const isLeft = x <= (169 + 50); // allow slightly wider transition margin
    
    if (isLeft) {
      x = Math.max(14 + halfW, Math.min(1046 - halfW, x));
      // If x is positioned within extension bounds, let y go down to 526
      if (x <= 169 - halfW) {
        y = Math.max(22 + halfH, Math.min(526 - halfH, y));
      } else {
        y = Math.max(22 + halfH, Math.min(396 - halfH, y));
      }
    } else {
      x = Math.max(14 + halfW, Math.min(1046 - halfW, x));
      y = Math.max(22 + halfH, Math.min(396 - halfH, y));
    }
    
    return { x, y };
  }

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
      g += `<line x1="${E.x1}" y1="${y}" x2="${E.x2}" y2="${E.y2}" stroke="${grid}" stroke-width="1"/>`;

    // Main room rectangle
    const mainRoom = `<rect x="${R.x1}" y="${R.y1}" width="${R.x2-R.x1}" height="${R.y2-R.y1}"
      fill="${fill}" stroke="${wall}" stroke-width="${wallW}" rx="2"/>`;

    // Extension — draw left/bottom/right walls only
    const ext = `
      <rect x="${E.x1}" y="${E.y1}" width="${E.x2-E.x1}" height="${E.y2-E.y1}" fill="${fill}"/>
      <line x1="${E.x1}" y1="${E.y1}" x2="${E.x1}" y2="${E.y2}" stroke="${wall}" stroke-width="${wallW}"/>
      <line x1="${E.x1}" y1="${E.y2}" x2="${E.x2}" y2="${E.y2}" stroke="${wall}" stroke-width="${wallW}"/>
      <line x1="${E.x2}" y1="${E.y2}" x2="${E.x2}" y2="${E.y1}" stroke="${wall}" stroke-width="${wallW}"/>
    `;

    // Erase the bottom-wall segment over the opening
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
    const badge = (wireCount > 0 && !_editMode)
      ? `<span class="wm-wire-badge">${wireCount}</span>` : '';

    const el = document.createElement('div');
    el.id = `wm-eq-${eq.id}`;
    el.dataset.eqId = eq.id;
    el.title = lbl;

    if (eq.shape === 'circle') {
      const d = eq.r * 2;
      el.className = 'wm-equipment wm-circle';
      if (_editMode && _selectedEditId === eq.id) el.classList.add('edit-selected');
      el.style.cssText = `left:${eq.cx-eq.r}px;top:${eq.cy-eq.r}px;width:${d}px;height:${d}px;--eq-color:${cfg.color};`;
      el.innerHTML = `
        <div style="width:${d}px;height:${d}px;border-radius:50%;
          background:${cfg.color}20;border:2px solid ${cfg.color};
          display:flex;align-items:center;justify-content:center;pointer-events:none;">
          <span style="font-size:${Math.max(7,eq.r-5)}px;font-weight:700;color:${cfg.color};font-family:Inter,sans-serif;">
            ${eq.type==='tank'?'T':eq.type==='torch'?'🔥':'R'}
          </span>
        </div>
        ${badge}`;
    } else {
      // Rectangle
      el.className = 'wm-equipment wm-rect';
      if (_editMode && _selectedEditId === eq.id) el.classList.add('edit-selected');
      el.style.cssText = `left:${eq.x}px;top:${eq.y}px;width:${eq.w}px;height:${eq.h}px;
        --eq-color:${cfg.color};border-color:${cfg.color}80;`;

      const inner = _innerLabel(eq, cfg);
      const noteEl = eq.note
        ? `<span class="wm-pillar-note">${eq.note}</span>` : '';

      el.innerHTML = `
        ${noteEl}
        <div class="wm-eq-inner" style="color:${cfg.color};pointer-events:none;">
          <span class="wm-eq-text" style="font-size:${_fontSize(eq)}px;">${inner}</span>
        </div>
        ${badge}`;
    }

    // Attach Pointer Drag listeners in edit mode
    if (_editMode) {
      el.addEventListener('pointerdown', e => {
        e.stopPropagation();
        _selectEdit(eq.id);
        
        _draggedId = eq.id;
        _dragStartX = e.clientX;
        _dragStartY = e.clientY;
        
        if (eq.shape === 'circle') {
          _dragStartPos = { cx: eq.cx, cy: eq.cy };
        } else {
          _dragStartPos = { x: eq.x, y: eq.y };
        }
        
        el.classList.add('dragging');
        el.setPointerCapture(e.pointerId);
      });

      el.addEventListener('pointermove', e => {
        if (_draggedId !== eq.id) return;
        e.stopPropagation();
        
        const dx = e.clientX - _dragStartX;
        const dy = e.clientY - _dragStartY;
        const draft = _draftEquipment.find(item => item.id === eq.id);
        
        if (draft) {
          if (draft.shape === 'circle') {
            const newCx = _dragStartPos.cx + dx;
            const newCy = _dragStartPos.cy + dy;
            const bounded = _boundPosition(newCx, newCy, draft.r, 'circle');
            
            draft.cx = bounded.x;
            draft.cy = bounded.y;
            
            el.style.left = `${bounded.x - draft.r}px`;
            el.style.top = `${bounded.y - draft.r}px`;
          } else {
            const newX = _dragStartPos.x + dx;
            const newY = _dragStartPos.y + dy;
            
            // Bounding needs center coordinates
            const cx = newX + draft.w / 2;
            const cy = newY + draft.h / 2;
            const bounded = _boundPosition(cx, cy, 0, 'rect', draft.w, draft.h);
            
            draft.x = bounded.x - draft.w / 2;
            draft.y = bounded.y - draft.h / 2;
            
            el.style.left = `${draft.x}px`;
            el.style.top = `${draft.y}px`;
          }
        }
      });

      el.addEventListener('pointerup', e => {
        if (_draggedId !== eq.id) return;
        e.stopPropagation();
        
        el.classList.remove('dragging');
        el.releasePointerCapture(e.pointerId);
        _draggedId = null;
      });

      el.addEventListener('click', e => {
        e.stopPropagation();
      });
    }

    return el;
  }

  function _fontSize(eq) {
    if (eq.w >= 90) return 9;
    if (eq.w >= 65) return 8;
    return 7;
  }

  function _innerLabel(eq, cfg) {
    const lang = (typeof I18n !== 'undefined') ? I18n.getLang() : 'en';
    const labelText = (lang === 'jp' && eq.labelJP) ? eq.labelJP : eq.label;
    if (eq.type === 'pillar')     return labelText.replace('Pillar ', 'PILLAR<br>').replace('柱', '柱 ');
    if (eq.type === 'robot')      return labelText.replace('Robot ', 'ROBOT ').replace('ロボット', 'ロボット ');
    if (eq.type === 'weld-table') return lang === 'jp' ? '溶接台' : 'WELD<br>TABLE';
    if (eq.type === 'welder-tig') return lang === 'jp' ? 'TIG溶接機' : 'TIG<br>Weld Mach';
    if (eq.type === 'welder-co2') return lang === 'jp' ? 'CO2溶接機' : 'CO2<br>Weld Mach';
    if (eq.type === 'controller') return lang === 'jp' ? '制御盤' : 'Controller';
    return labelText;
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
          <p>${(typeof I18n !== 'undefined' && I18n.getLang() === 'jp') ? '設備を選択すると<br>配線一覧が表示されます' : 'Click any item on the map<br>to see its wires'}</p>
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
      body.innerHTML = `<div class="wm-panel-empty"><p>${lang === 'jp' ? 'この設備に登録されている配線はありません。' : 'No wires registered for this item.'}</p></div>`;
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

  // ─── Select / deselect in View Mode ─────────────────────────────────────────
  function _select(id) {
    if (_editMode) return;
    if (_sel) {
      const prev = document.getElementById(`wm-eq-${_sel}`);
      if (prev) prev.classList.remove('selected');
    }
    const panel = document.getElementById('wm-detail-panel');

    if (_sel === id) {
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

  // ─── Select in Edit Mode ───────────────────────────────────────────────────
  function _selectEdit(id) {
    if (!_editMode) return;
    if (_selectedEditId) {
      const prev = document.getElementById(`wm-eq-${_selectedEditId}`);
      if (prev) prev.classList.remove('edit-selected');
    }
    
    _selectedEditId = id;
    const el = document.getElementById(`wm-eq-${id}`);
    if (el) el.classList.add('edit-selected');

    // Enable delete button
    const deleteBtn = document.getElementById('btn-wm-delete');
    if (deleteBtn) deleteBtn.disabled = false;
  }

  function _deselectEdit() {
    if (_selectedEditId) {
      const prev = document.getElementById(`wm-eq-${_selectedEditId}`);
      if (prev) prev.classList.remove('edit-selected');
      _selectedEditId = null;
    }
    const deleteBtn = document.getElementById('btn-wm-delete');
    if (deleteBtn) deleteBtn.disabled = true;
  }

  // ─── Edit Mode Toggles ─────────────────────────────────────────────────────
  function startEdit() {
    _editMode = true;
    _draftEquipment = JSON.parse(JSON.stringify(WireMapStore.EQUIPMENT)); // clone
    _selectedEditId = null;
    
    // Close detail panel
    const panel = document.getElementById('wm-detail-panel');
    if (panel) panel.classList.remove('open');
    _sel = null;
    
    render();
  }

  function cancelEdit() {
    _editMode = false;
    _draftEquipment = [];
    _selectedEditId = null;
    render();
  }

  function saveEdit() {
    if (!_editMode) return;
    
    WireMapStore.saveEquipment(_draftEquipment).then(() => {
      _editMode = false;
      _draftEquipment = [];
      _selectedEditId = null;
      render();
    });
  }

  // ─── Add Item Logic ────────────────────────────────────────────────────────
  function openAddModal() {
    const modal = document.getElementById('wm-add-modal');
    if (modal) modal.classList.add('open');
  }

  function closeAddModal() {
    const modal = document.getElementById('wm-add-modal');
    if (modal) modal.classList.remove('open');
  }

  function submitAddItem() {
    const type = document.getElementById('wm-add-type').value;
    const label = document.getElementById('wm-add-label').value.trim() || 'New Item';
    const labelJP = document.getElementById('wm-add-label-jp').value.trim() || label;
    
    // Set sensible dimensions based on shape & type
    const shape = (type === 'tank' || type === 'torch') ? 'circle' : 'rect';
    const newItem = {
      id: `custom-eq-${Date.now()}`,
      label,
      labelJP,
      type,
      shape
    };

    if (shape === 'circle') {
      newItem.cx = 500;
      newItem.cy = 200;
      newItem.r = 15;
    } else {
      newItem.x = 450;
      newItem.y = 170;
      // Dimensions
      if (type === 'pillar') { newItem.w = 45; newItem.h = 70; newItem.note = 'regulators'; }
      else if (type === 'controller') { newItem.w = 70; newItem.h = 42; }
      else if (type === 'welder-tig' || type === 'welder-co2') { newItem.w = 62; newItem.h = 68; }
      else if (type === 'robot') { newItem.w = 66; newItem.h = 48; }
      else if (type === 'weld-table') { newItem.w = 92; newItem.h = 82; }
      else { newItem.w = 60; newItem.h = 40; }
    }

    _draftEquipment.push(newItem);
    closeAddModal();
    render();
    
    // Select the newly added item
    _selectEdit(newItem.id);
  }

  // ─── Delete Item Logic ─────────────────────────────────────────────────────
  function deleteSelected() {
    if (!_selectedEditId) return;
    if (!confirm('Are you sure you want to delete the selected equipment? All wire links for this equipment will become inactive.')) return;
    
    _draftEquipment = _draftEquipment.filter(eq => eq.id !== _selectedEditId);
    _selectedEditId = null;
    render();
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

  // ─── Add Item Modal HTML ───────────────────────────────────────────────────
  function _modalHtml() {
    return `
      <div class="wm-modal" id="wm-add-modal">
        <div class="wm-modal-content">
          <div class="wm-modal-header">
            <h3>Add Equipment</h3>
            <button class="wm-modal-close" id="btn-modal-close">×</button>
          </div>
          <div class="wm-modal-body">
            <div class="form-group">
              <label>Type / タイプ</label>
              <select id="wm-add-type">
                <option value="robot">Robot / ロボット</option>
                <option value="weld-table">Weld Table / 溶接台</option>
                <option value="controller">Controller / コントローラー</option>
                <option value="welder-tig">TIG Welder / TIG溶接機</option>
                <option value="welder-co2">CO2 Welder / CO2溶接機</option>
                <option value="tank">Gas Tank / ガスタンク</option>
                <option value="pillar">Pillar / 柱</option>
                <option value="torch">Torch / トーチ</option>
              </select>
            </div>
            <div class="form-group">
              <label>Label (EN) / 英語名称</label>
              <input type="text" id="wm-add-label" placeholder="e.g. Robot 7">
            </div>
            <div class="form-group">
              <label>Label (JP) / 日本語名称</label>
              <input type="text" id="wm-add-label-jp" placeholder="e.g. ロボット 7">
            </div>
          </div>
          <div class="wm-modal-footer">
            <button class="btn-wm" id="btn-modal-cancel">Cancel</button>
            <button class="btn-wm btn-wm-primary" id="btn-modal-submit">Add to Map</button>
          </div>
        </div>
      </div>`;
  }

  // ─── Main Render ──────────────────────────────────────────────────────────
  function render() {
    const view = document.getElementById('view-wiremap');
    if (!view) return;

    const lang = (typeof I18n !== 'undefined') ? I18n.getLang() : 'en';

    // 1. Render toolbar header
    let toolbarHtml = '';
    if (!_editMode) {
      toolbarHtml = `
        <div class="wm-toolbar-left">
          <h1 class="view-title">Wire Map</h1>
          <span class="wm-hint">${lang === 'jp' ? '設備をタップして配線を確認' : 'Tap any item to view its wires'}</span>
        </div>
        <div class="wm-toolbar-right">
          ${_legend()}
          <button class="btn-wm btn-wm-primary" id="btn-wm-edit-mode">
            🔧 ${lang === 'jp' ? 'レイアウト編集' : 'Edit Layout'}
          </button>
        </div>`;
    } else {
      toolbarHtml = `
        <div class="wm-toolbar-left">
          <h1 class="view-title" style="color:var(--clr-accent)">🔧 Layout Editor</h1>
          <span class="wm-hint" style="color:var(--clr-accent)">Drag elements to position them</span>
        </div>
        <div class="wm-toolbar-right">
          <button class="btn-wm btn-wm-primary" id="btn-wm-add">＋ Add Item</button>
          <button class="btn-wm btn-wm-danger" id="btn-wm-delete" disabled>🗑️ Delete</button>
          <div style="width:1px;height:24px;background:var(--clr-border);margin:0 var(--space-2);"></div>
          <button class="btn-wm" id="btn-wm-cancel">Cancel</button>
          <button class="btn-wm btn-wm-primary" id="btn-wm-save" style="background:#10b981;border-color:#10b981">💾 Save</button>
        </div>`;
    }

    view.innerHTML = `
      <div class="wm-toolbar">${toolbarHtml}</div>
      <div class="wm-layout">
        <div class="wm-scroll-wrapper">
          <div class="wm-map-container" id="wm-map" style="width:${W}px;height:${H}px;position:relative;">
            ${_svgFloor()}
          </div>
        </div>
      </div>
      ${_modalHtml()}`;

    // Add Side Detail Panel in view mode
    if (!_editMode) {
      const layout = view.querySelector('.wm-layout');
      layout.appendChild(_makePanel());
      
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

    const mapEl = document.getElementById('wm-map');
    const items = _editMode ? _draftEquipment : WireMapStore.EQUIPMENT;

    // Render equipment items
    items.forEach(eq => {
      const el = _buildEl(eq);
      if (!_editMode) {
        el.addEventListener('click', e => { e.stopPropagation(); _select(eq.id); });
      }
      mapEl.appendChild(el);
    });

    // Tap canvas backdrop → deselect
    mapEl.addEventListener('click', () => {
      if (!_editMode) {
        if (_sel) {
          const prev = document.getElementById(`wm-eq-${_sel}`);
          if (prev) prev.classList.remove('selected');
          _sel = null;
          const panel = document.getElementById('wm-detail-panel');
          if (panel) panel.classList.remove('open');
        }
      } else {
        _deselectEdit();
      }
    });

    // Attach button event listeners
    if (!_editMode) {
      const editBtn = document.getElementById('btn-wm-edit-mode');
      if (editBtn) editBtn.addEventListener('click', startEdit);
    } else {
      const addBtn = document.getElementById('btn-wm-add');
      if (addBtn) addBtn.addEventListener('click', openAddModal);

      const deleteBtn = document.getElementById('btn-wm-delete');
      if (deleteBtn) deleteBtn.addEventListener('click', deleteSelected);

      const cancelBtn = document.getElementById('btn-wm-cancel');
      if (cancelBtn) cancelBtn.addEventListener('click', cancelEdit);

      const saveBtn = document.getElementById('btn-wm-save');
      if (saveBtn) saveBtn.addEventListener('click', saveEdit);

      // Modal buttons
      const modalClose = document.getElementById('btn-modal-close');
      if (modalClose) modalClose.addEventListener('click', closeAddModal);

      const modalCancel = document.getElementById('btn-modal-cancel');
      if (modalCancel) modalCancel.addEventListener('click', closeAddModal);

      const modalSubmit = document.getElementById('btn-modal-submit');
      if (modalSubmit) modalSubmit.addEventListener('click', submitAddItem);
    }
  }

  function init() {
    _sel = null;
    _editMode = false;
    _draftEquipment = [];
    _selectedEditId = null;
    render();
  }

  function refresh() {
    // Only re-render if not in edit mode (so we don't discard unsaved drag drafts)
    if (!_editMode) {
      render();
    }
  }

  return { init, refresh, closeAddModal, submitAddItem };

})();
