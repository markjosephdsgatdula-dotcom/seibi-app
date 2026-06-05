/**
 * views/calendar.js — CalendarView controller
 *
 * Renders a monthly grid calendar with:
 *  - Priority-coloured task pills in each day cell
 *  - Drag-and-drop rescheduling (mouse + touch via pointer events)
 *  - Day detail drawer (tap a cell to see full task list for that day)
 *  - Prev/Next/Today month navigation
 *
 * Design constraints:
 *  - No CSS transitions on grid layout (old iPad perf)
 *  - Pointer events API for unified mouse + touch drag
 *  - No external libraries
 */

'use strict';

const CalendarView = (() => {

  // ─── State ────────────────────────────────────────────────────────────────
  let _year  = new Date().getFullYear();
  let _month = new Date().getMonth();   // 0-indexed
  let _tasks = [];
  let _draggingTaskId = null;
  let _touchDragEl    = null;   // cloned ghost element for touch drag

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function _getDayNames() {
    return I18n.getLang() === 'jp'
      ? ['日', '月', '火', '水', '木', '金', '土']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  }

  function _getMonthNames() {
    return I18n.getLang() === 'jp'
      ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
      : [
          'January','February','March','April','May','June',
          'July','August','September','October','November','December',
        ];
  }

  function _toDateStr(year, month, day) {
    return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  function _todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function _tasksForDate(dateStr) {
    return _tasks.filter(t => t.dueDate === dateStr);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  function _renderHeader() {
    const isJp = I18n.getLang() === 'jp';
    const monthName = _getMonthNames()[_month];
    const monthYearHtml = isJp
      ? `<span class="cal-year">${_year}年</span><span class="cal-month-name">${monthName}</span>`
      : `<span class="cal-month-name">${monthName}</span><span class="cal-year">${_year}</span>`;

    return `
      <div class="cal-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-3);">
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <button class="cal-nav-btn" id="cal-prev" onclick="CalendarView.prevMonth()" aria-label="Previous month">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div class="cal-month-title" style="flex: none; display: flex; align-items: baseline; gap: var(--space-2);">
            ${monthYearHtml}
          </div>
          <button class="cal-nav-btn" id="cal-next" onclick="CalendarView.nextMonth()" aria-label="Next month">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <button class="cal-today-btn" onclick="CalendarView.goToToday()">${I18n.t('btn_today')}</button>
          <button class="cal-today-btn" style="background: linear-gradient(135deg, #4f7cff, #3054c4); color: #fff; border: none; box-shadow: 0 4px 10px rgba(79, 124, 255, 0.25); display: flex; align-items: center; gap: var(--space-1);" onclick="CalendarView.openCreateOrderModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ${I18n.t('btn_new_work_order')}
          </button>
        </div>
      </div>
    `;
  }

  function _renderDayHeaders() {
    return `<div class="cal-day-headers">${_getDayNames().map(d => `<div class="cal-day-name">${d}</div>`).join('')}</div>`;
  }

  function _renderPill(task) {
    const short = task.title.length > 18 ? task.title.slice(0, 17) + '…' : task.title;
    const isDone = task.status === 'done';
    return `
      <div
        class="cal-pill priority-pill--${task.priority} status-pill--${task.status}"
        data-task-id="${task.id}"
        draggable="${isDone ? 'false' : 'true'}"
        style="${isDone ? 'cursor:default;' : ''}"
        title="${task.title} — ${task.dueTime}"
      >${short}</div>
    `;
  }

  function _renderCell(year, month, day) {
    const dateStr   = _toDateStr(year, month, day);
    const todayStr  = _todayStr();
    const isToday   = dateStr === todayStr;
    const dayTasks  = _tasksForDate(dateStr);
    const MAX_PILLS = 3;
    const extra     = dayTasks.length - MAX_PILLS;

    const pillsHtml = dayTasks.slice(0, MAX_PILLS).map(_renderPill).join('');
    const moreHtml  = extra > 0
      ? `<div class="cal-more">+${extra} ${I18n.getLang() === 'jp' ? '件以上' : 'more'}</div>`
      : '';

    return `
      <div
        class="cal-cell${isToday ? ' cal-cell--today' : ''}"
        data-date="${dateStr}"
        onclick="CalendarView.openDayDetail('${dateStr}')"
      >
        <span class="cal-cell-day${isToday ? ' cal-cell-day--today' : ''}">${day}</span>
        <div class="cal-cell-pills">
          ${pillsHtml}
          ${moreHtml}
        </div>
      </div>
    `;
  }

  function _renderGrid() {
    const firstDay    = new Date(_year, _month, 1).getDay();   // 0=Sun
    const daysInMonth = new Date(_year, _month + 1, 0).getDate();

    let cells = '';

    // Leading empty cells
    for (let i = 0; i < firstDay; i++) {
      cells += `<div class="cal-cell cal-cell--empty"></div>`;
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      cells += _renderCell(_year, _month, d);
    }

    return `<div class="cal-grid" id="cal-grid">${cells}</div>`;
  }

  function _render() {
    const panel = document.getElementById('home-calendar');
    if (!panel) return;

    panel.innerHTML = _renderHeader() + _renderDayHeaders() + _renderGrid();
    _bindDragEvents();
  }

  // ─── Day Detail Drawer ────────────────────────────────────────────────────

  function openDayDetail(dateStr) {
    // Don't open if a drag just finished or a modal is open
    if (_draggingTaskId || document.getElementById('create-order-modal')) return;

    const existing = document.getElementById('cal-drawer');
    if (existing) existing.remove();

    const dayTasks = _tasksForDate(dateStr);
    const label    = new Date(dateStr + 'T00:00:00').toLocaleDateString(I18n.getLang() === 'jp' ? 'ja-JP' : 'en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });

    const tasksHtml = dayTasks.length
      ? dayTasks.map(t => {
          const clickHandler = t.assetId
            ? (t.status !== 'done' ? `onclick="AssetsView.openInspection('${t.assetId}'); CalendarView.closeDrawer();"` : '')
            : `onclick="HomeView.toggleDone('${t.id}'); CalendarView.closeDrawer();"`;
          const cursorStyle = (t.assetId && t.status !== 'done') || !t.assetId
            ? 'style="cursor: pointer;"'
            : '';

          const statusKey = {
            'pending': 'card_pending',
            'done':    'card_done',
            'overdue': 'card_overdue',
          }[t.status] ?? t.status;
          const statusLabel = I18n.t(statusKey);
          
          const assetName = t.assetId ? t.assetName : (I18n.getLang() === 'jp' ? '臨時点検・作業' : 'Custom');

          return `
            <div class="drawer-task-row priority-row--${t.priority}" ${clickHandler} ${cursorStyle}>
              <div class="drawer-task-strip"></div>
              <div class="drawer-task-info">
                <div class="drawer-task-title">${t.title}</div>
                <div class="drawer-task-meta">${t.dueTime} · ${assetName} · ${t.assignedTo}</div>
              </div>
              <span class="chip chip-status--${t.status}">${statusLabel}</span>
            </div>`;
        }).join('')
      : `<p class="drawer-empty">${I18n.t('cal_empty')}</p>`;

    const drawer = document.createElement('div');
    drawer.id = 'cal-drawer';
    drawer.className = 'cal-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-label', `Tasks for ${label}`);
    drawer.innerHTML = `
      <div class="cal-drawer-backdrop" onclick="CalendarView.closeDrawer()"></div>
      <div class="cal-drawer-panel">
        <div class="cal-drawer-header">
          <h2 class="cal-drawer-title">${label}</h2>
          <button class="cal-drawer-close" onclick="CalendarView.closeDrawer()" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="cal-drawer-body">${tasksHtml}</div>
      </div>
    `;
    document.getElementById('app-shell').appendChild(drawer);
  }

  function closeDrawer() {
    const drawer = document.getElementById('cal-drawer');
    if (drawer) drawer.remove();
  }

  // ─── Custom Work Order Modal ──────────────────────────────────────────────

  function openCreateOrderModal() {
    const existing = document.getElementById('create-order-modal');
    if (existing) existing.remove();

    const todayStr = _todayStr();

    const modal = document.createElement('div');
    modal.id = 'create-order-modal';
    modal.className = 'inspection-modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', I18n.t('modal_create_order'));

    modal.innerHTML = `
      <div class="inspection-modal-panel" style="max-width: 500px;">
        <header class="inspection-modal-header">
          <h2 class="inspection-modal-title">${I18n.t('modal_create_order')}</h2>
          <button class="inspection-modal-close" onclick="CalendarView.closeCreateOrderModal()" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </header>
        <form onsubmit="CalendarView.createCustomOrder(event)">
          <div class="inspection-modal-body" style="display: flex; flex-direction: column; gap: var(--space-4);">
            <div class="form-group" style="display: flex; flex-direction: column; gap: var(--space-1);">
              <label class="inspector-input-label" for="order-title">${I18n.t('label_title')}</label>
              <input type="text" id="order-title" required class="inspector-input" placeholder="${I18n.getLang() === 'jp' ? '例：工場の清掃、配線の点検' : 'e.g. Workshop cleanup, electrical check'}">
            </div>
            
            <div class="inspector-sign-bar" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); border: none; padding: 0; background: none;">
              <div class="form-group" style="display: flex; flex-direction: column; gap: var(--space-1);">
                <label class="inspector-input-label" for="order-date">${I18n.t('label_date')}</label>
                <input type="date" id="order-date" required class="inspector-input" value="${todayStr}">
              </div>
              <div class="form-group" style="display: flex; flex-direction: column; gap: var(--space-1);">
                <label class="inspector-input-label" for="order-time">${I18n.t('label_time')}</label>
                <input type="time" id="order-time" required class="inspector-input" value="09:00">
              </div>
            </div>

            <div class="inspector-sign-bar" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); border: none; padding: 0; background: none;">
              <div class="form-group" style="display: flex; flex-direction: column; gap: var(--space-1);">
                <label class="inspector-input-label" for="order-assignee">${I18n.t('label_assignee')}</label>
                <input type="text" id="order-assignee" class="inspector-input" placeholder="${I18n.getLang() === 'jp' ? '担当者名' : 'Name'}">
              </div>
              <div class="form-group" style="display: flex; flex-direction: column; gap: var(--space-1);">
                <label class="inspector-input-label" for="order-priority">${I18n.t('label_priority')}</label>
                <select id="order-priority" class="form-select" style="width: 100%;">
                  <option value="high">${I18n.getLang() === 'jp' ? '高 (High)' : 'High'}</option>
                  <option value="medium" selected>${I18n.getLang() === 'jp' ? '中 (Medium)' : 'Medium'}</option>
                  <option value="low">${I18n.getLang() === 'jp' ? '低 (Low)' : 'Low'}</option>
                </select>
              </div>
            </div>

            <div class="form-group" style="display: flex; flex-direction: column; gap: var(--space-1);">
              <label class="inspector-input-label" for="order-notes">${I18n.t('label_notes')}</label>
              <textarea id="order-notes" class="fail-notes-input" style="min-height: 80px;" placeholder="${I18n.getLang() === 'jp' ? '作業の詳細メモを入力...' : 'Enter details or instructions...'}"></textarea>
            </div>
          </div>
          <footer class="inspection-modal-footer" style="padding: var(--space-4); border-top: 1px solid var(--clr-border); display: flex; justify-content: flex-end; gap: var(--space-3); background: var(--clr-surface);">
            <button type="button" class="btn-cancel" onclick="CalendarView.closeCreateOrderModal()">${I18n.t('cancel')}</button>
            <button type="submit" class="btn-submit" style="background: var(--clr-accent); box-shadow: 0 4px 12px rgba(79, 124, 255, 0.3);">${I18n.t('btn_create')}</button>
          </footer>
        </form>
      </div>
    `;

    document.getElementById('app-shell').appendChild(modal);
  }

  function closeCreateOrderModal() {
    const modal = document.getElementById('create-order-modal');
    if (modal) modal.remove();
  }

  function createCustomOrder(event) {
    event.preventDefault();
    const title = document.getElementById('order-title').value;
    const dueDate = document.getElementById('order-date').value;
    const dueTime = document.getElementById('order-time').value;
    const assignedTo = document.getElementById('order-assignee').value;
    const priority = document.getElementById('order-priority').value;
    const notes = document.getElementById('order-notes').value;

    MockDB.scheduleCustomTask({ title, dueDate, dueTime, assignedTo, priority, notes }).then(() => {
      closeCreateOrderModal();
      init();
      if (typeof HomeView !== 'undefined') {
        HomeView.refresh();
      }
    });
  }

  // ─── Drag-and-Drop (Mouse — HTML5 DnD API) ───────────────────────────────

  function _bindDragEvents() {
    const grid = document.getElementById('cal-grid');
    if (!grid) return;

    // ── Drag start (pills) ──
    grid.addEventListener('dragstart', (e) => {
      const pill = e.target.closest('.cal-pill');
      if (!pill) return;
      _draggingTaskId = pill.dataset.taskId;
      pill.classList.add('cal-pill--dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', _draggingTaskId);
    });

    grid.addEventListener('dragend', (e) => {
      const pill = e.target.closest('.cal-pill');
      if (pill) pill.classList.remove('cal-pill--dragging');
      _clearDropHighlights();
      // Small delay so openDayDetail click doesn't fire
      setTimeout(() => { _draggingTaskId = null; }, 50);
    });

    // ── Drop targets (cells) ──
    grid.addEventListener('dragover', (e) => {
      const cell = e.target.closest('.cal-cell:not(.cal-cell--empty)');
      if (!cell) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      _clearDropHighlights();
      cell.classList.add('cal-cell--drop-target');
    });

    grid.addEventListener('dragleave', (e) => {
      const cell = e.target.closest('.cal-cell');
      if (cell) cell.classList.remove('cal-cell--drop-target');
    });

    grid.addEventListener('drop', (e) => {
      e.preventDefault();
      const cell = e.target.closest('.cal-cell:not(.cal-cell--empty)');
      if (!cell || !_draggingTaskId) return;
      const newDate = cell.dataset.date;
      _clearDropHighlights();
      MockDB.reschedule(_draggingTaskId, newDate).then(() => {
        MockDB.getAllTasks().then(tasks => {
          _tasks = tasks;
          _render();
          // Keep Daily Tasks tab in sync
          if (typeof HomeView !== 'undefined') HomeView.refresh();
        });
      });
    });

    // ── Touch drag (Pointer Events) ──
    grid.addEventListener('pointerdown', _onPointerDown, { passive: false });
  }

  function _clearDropHighlights() {
    document.querySelectorAll('.cal-cell--drop-target').forEach(el => {
      el.classList.remove('cal-cell--drop-target');
    });
  }

  // ─── Touch drag via Pointer Events ───────────────────────────────────────

  let _touchOriginCell = null;
  let _ghostEl         = null;
  let _pointerStarted  = false;

  function _onPointerDown(e) {
    const pill = e.target.closest('.cal-pill');
    if (!pill || e.pointerType === 'mouse') return;  // mouse handled by HTML5 DnD

    e.preventDefault();
    _pointerStarted  = true;
    _draggingTaskId  = pill.dataset.taskId;
    _touchOriginCell = pill.closest('.cal-cell');

    // Create ghost
    _ghostEl = pill.cloneNode(true);
    _ghostEl.classList.add('cal-pill--ghost');
    _ghostEl.style.width   = pill.offsetWidth + 'px';
    _ghostEl.style.left    = e.clientX - pill.offsetWidth / 2 + 'px';
    _ghostEl.style.top     = e.clientY - pill.offsetHeight / 2 + 'px';
    document.body.appendChild(_ghostEl);

    pill.classList.add('cal-pill--dragging');
    pill.setPointerCapture(e.pointerId);

    pill.addEventListener('pointermove', _onPointerMove, { passive: false });
    pill.addEventListener('pointerup',   _onPointerUp);
    pill.addEventListener('pointercancel', _onPointerCancel);
  }

  function _onPointerMove(e) {
    if (!_pointerStarted || !_ghostEl) return;
    e.preventDefault();
    _ghostEl.style.left = e.clientX - _ghostEl.offsetWidth / 2 + 'px';
    _ghostEl.style.top  = e.clientY - _ghostEl.offsetHeight / 2 + 'px';

    // Highlight cell under finger
    _ghostEl.style.display = 'none';
    const elBelow = document.elementFromPoint(e.clientX, e.clientY);
    _ghostEl.style.display = '';

    _clearDropHighlights();
    const targetCell = elBelow && elBelow.closest('.cal-cell:not(.cal-cell--empty)');
    if (targetCell) targetCell.classList.add('cal-cell--drop-target');
  }

  function _onPointerUp(e) {
    if (!_pointerStarted) return;

    _ghostEl && _ghostEl.remove();
    _ghostEl = null;

    _pointerStarted = false;

    // Find drop target cell
    const pill = e.target.closest('.cal-pill');
    if (pill) pill.classList.remove('cal-pill--dragging');

    const ghostHidden = document.createElement('div');
    ghostHidden.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;';
    ghostHidden.style.left = e.clientX + 'px';
    ghostHidden.style.top  = e.clientY + 'px';
    document.body.appendChild(ghostHidden);
    const elBelow = document.elementFromPoint(e.clientX, e.clientY);
    ghostHidden.remove();

    _clearDropHighlights();

    const targetCell = elBelow && elBelow.closest('.cal-cell:not(.cal-cell--empty)');
    if (targetCell && _draggingTaskId) {
      const newDate = targetCell.dataset.date;
      MockDB.reschedule(_draggingTaskId, newDate).then(() => {
        MockDB.getAllTasks().then(tasks => {
          _tasks = tasks;
          setTimeout(() => { _draggingTaskId = null; }, 50);
          _render();
          // Keep Daily Tasks tab in sync
          if (typeof HomeView !== 'undefined') HomeView.refresh();
        });
      });
    } else {
      setTimeout(() => { _draggingTaskId = null; }, 50);
    }

    e.target.removeEventListener('pointermove',   _onPointerMove);
    e.target.removeEventListener('pointerup',     _onPointerUp);
    e.target.removeEventListener('pointercancel', _onPointerCancel);
  }

  function _onPointerCancel() {
    _ghostEl && _ghostEl.remove();
    _ghostEl = null;
    _pointerStarted = false;
    _draggingTaskId = null;
    _clearDropHighlights();
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  function prevMonth() {
    _month--;
    if (_month < 0) { _month = 11; _year--; }
    _render();
  }

  function nextMonth() {
    _month++;
    if (_month > 11) { _month = 0; _year++; }
    _render();
  }

  function goToToday() {
    const now = new Date();
    _year  = now.getFullYear();
    _month = now.getMonth();
    _render();
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    // If a modal or drawer is open, close them to avoid state overlap during hot reload
    closeDrawer();
    closeCreateOrderModal();

    MockDB.getAllTasks().then(tasks => {
      _tasks = tasks;
      _render();
    });
  }

  return { init, prevMonth, nextMonth, goToToday, openDayDetail, closeDrawer, openCreateOrderModal, closeCreateOrderModal, createCustomOrder };

})();

