/**
 * views/home.js — HomeView controller (Phase 1: Daily Tasks)
 *
 * Responsibilities:
 *  1. Sub-tab toggle (Daily Tasks ↔ Calendar)
 *  2. Render today's task list with priority strips + status badges
 *  3. Handle mark-as-done tap with instant UI feedback
 *
 * Phase 2 note: Calendar drag-and-drop engine will be injected into
 * _renderCalendar() without touching the rest of this controller.
 */

'use strict';

const HomeView = (() => {

  const MODES = ['daily', 'calendar'];
  let _currentMode = 'daily';
  let _tasks = [];

  // ─── Mode toggle ──────────────────────────────────────────────────────────

  function _updateMode(mode) {
    if (!MODES.includes(mode)) return;
    _currentMode = mode;

    MODES.forEach((m) => {
      const panel = document.getElementById(`home-${m}`);
      const btn   = document.getElementById(`subtab-${m}`);
      if (!panel || !btn) return;
      const isActive = m === mode;
      panel.classList.toggle('active', isActive);
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
  }

  function setMode(mode) { _updateMode(mode); }

  // ─── Summary bar ─────────────────────────────────────────────────────────

  function _renderDashboard(tasks, assets = []) {
    const total   = tasks.length;
    const done    = tasks.filter(t => t.status === 'done').length;
    const pct     = total ? Math.round((done / total) * 100) : 0;

    const today = new Date().toLocaleDateString(I18n.getLang() === 'jp' ? 'ja-JP' : 'en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });

    const activeAssets = assets.filter(a => a.status !== 'decommissioned');
    const totalActiveAssets = activeAssets.length;
    const defectsCount = activeAssets.filter(a => a.status === 'needs_repair').length;
    const healthyCount = activeAssets.filter(a => a.status === 'healthy').length;
    const healthPct = totalActiveAssets ? Math.round((healthyCount / totalActiveAssets) * 100) : 100;

    return `
      <div class="daily-summary">
        <div class="daily-date">${today}</div>
        <div class="dashboard-grid">
          
          <div class="dashboard-card card-progress">
            <div class="dashboard-card-header">
              <span class="dashboard-card-icon">📈</span>
              <span class="dashboard-card-title">${I18n.t('task_progress')}</span>
            </div>
            <div class="dashboard-card-value">${done} / ${total}</div>
            <div class="dashboard-card-meta">
              <div class="dashboard-progress-wrap">
                <div class="dashboard-progress-fill" style="width: ${pct}%"></div>
              </div>
              <span class="dashboard-progress-label">${pct}% ${I18n.t('completed_pct')}</span>
            </div>
          </div>

          <div class="dashboard-card card-defects ${defectsCount > 0 ? 'card-defects--warning' : ''}">
            <div class="dashboard-card-header">
              <span class="dashboard-card-icon">${defectsCount > 0 ? '⚠️' : '✅'}</span>
              <span class="dashboard-card-title">${I18n.t('active_defects')}</span>
            </div>
            <div class="dashboard-card-value">${defectsCount}</div>
            <div class="dashboard-card-meta">
              <span>${defectsCount > 0 ? I18n.t('requires_action') : I18n.t('all_healthy')}</span>
            </div>
          </div>

          <div class="dashboard-card card-health">
            <div class="dashboard-card-header">
              <span class="dashboard-card-icon">⚙️</span>
              <span class="dashboard-card-title">${I18n.t('asset_health')}</span>
            </div>
            <div class="dashboard-card-value">${healthPct}%</div>
            <div class="dashboard-card-meta">
              <span>${healthyCount} ${I18n.t('of')} ${totalActiveAssets} ${I18n.t('healthy_ratio')}</span>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  // ─── Task card ────────────────────────────────────────────────────────────

  function _priorityLabel(p) {
    return {
      high: I18n.getLang() === 'jp' ? '高' : 'High',
      medium: I18n.getLang() === 'jp' ? '中' : 'Medium',
      low: I18n.getLang() === 'jp' ? '低' : 'Low'
    }[p] ?? p;
  }

  function _statusLabel(s) {
    return {
      'pending': I18n.t('card_pending'),
      'done':    I18n.t('card_done'),
      'overdue': I18n.t('card_overdue'),
    }[s] ?? s;
  }

  function _renderCard(task) {
    const isDone = task.status === 'done';
    const isRepair = task.id.startsWith('task-repair-') || (task.tags && task.tags.includes('repair'));
    const isCustom = task.id.startsWith('task-custom-');
    
    // Card click: only active when task is pending/overdue
    const cardClickHandler = isDone
      ? ''
      : (isRepair
        ? `NoticeView.openRepairModal('${task.id.replace('task-repair-', '')}')`
        : (task.assetId
          ? `AssetsView.openInspection('${task.assetId}')`
          : `HomeView.toggleDone('${task.id}')`));

    // Checkbox click: can check/uncheck
    const btnClickHandler = isDone
      ? `HomeView.toggleDone('${task.id}')`
      : (task.assetId && !isRepair
        ? `AssetsView.openInspection('${task.assetId}')`
        : `HomeView.toggleDone('${task.id}')`);

    const deleteBtnHtml = isCustom
      ? `<button
           class="task-delete-btn"
           onclick="event.stopPropagation(); HomeView.deleteCustomTask('${task.id}')"
           title="${I18n.getLang() === 'jp' ? 'カスタム作業指示を削除' : 'Delete custom work order'}"
           aria-label="Delete custom work order"
           style="background:none; border:none; color:var(--clr-text-secondary); cursor:pointer; padding:4px; display:flex; align-items:center; justify-content:center; transition:color var(--transition-fast);"
           onmouseover="this.style.color='#ef4444'"
           onmouseout="this.style.color='var(--clr-text-secondary)'"
         >
           <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
             <polyline points="3 6 5 6 21 6"/>
             <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
             <path d="M10 11v6M14 11v6"/>
             <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
           </svg>
         </button>`
      : '';

    const isJp = typeof I18n !== 'undefined' && I18n.getLang() === 'jp';
    const displayTitle = (isJp && task.title_jp) ? task.title_jp : task.title;
    const displayAssetName = (isJp && task.assetName_jp) ? task.assetName_jp : task.assetName;

    return `
      <article
        class="task-card priority-${task.priority} status-${task.status}"
        id="card-${task.id}"
        data-task-id="${task.id}"
        aria-label="${displayTitle}"
        ${cardClickHandler ? `onclick="${cardClickHandler}"` : ''}
        style="${isDone ? 'cursor: default;' : 'cursor: pointer;'}"
      >
        <!-- Left priority colour strip -->
        <div class="task-strip" aria-hidden="true"></div>

        <div class="task-body">
          <!-- Row 1: Title + done button -->
          <div class="task-top-row">
            <h2 class="task-title ${isDone ? 'task-title--done' : ''}">${displayTitle}</h2>
            <div style="display: flex; align-items: center; gap: var(--space-2);">
              ${deleteBtnHtml}
              <button
                class="task-done-btn ${isDone ? 'task-done-btn--checked' : ''}"
                aria-label="${isDone ? 'Mark as pending' : 'Mark as done'}: ${displayTitle}"
                data-task-id="${task.id}"
                onclick="event.stopPropagation(); ${btnClickHandler}"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  ${isDone
                    ? '<circle cx="10" cy="10" r="9"/><polyline points="5.5,10.5 8.5,13.5 14.5,7"/>'
                    : '<circle cx="10" cy="10" r="9"/>'}
                </svg>
              </button>
            </div>
          </div>

          <!-- Row 2: Asset name + location -->
          <div class="task-meta-row">
            <span class="task-asset">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
              ${displayAssetName}
            </span>
            <span class="task-location">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${task.location}
            </span>
          </div>

          <!-- Row 3: Chips (time, assignee, priority, status) -->
          <div class="task-chips-row">
            <span class="chip chip-time">⏰ ${task.dueTime}</span>
            <span class="chip chip-duration">~${task.estimatedMins}${I18n.t('min')}</span>
            <span class="chip chip-assignee">👤 ${task.assignedTo}</span>
            <span class="chip chip-priority chip-priority--${task.priority}">${_priorityLabel(task.priority)}</span>
            <span class="chip chip-status chip-status--${task.status}">${_statusLabel(task.status)}</span>
          </div>
        </div>
      </article>
    `;
  }

  // ─── Task list render ─────────────────────────────────────────────────────

  function _groupTasks(tasks) {
    const order = ['overdue', 'pending', 'done'];
    const groups = {};
    order.forEach(s => { groups[s] = []; });
    tasks.forEach(t => {
      if (groups[t.status]) groups[t.status].push(t);
      else groups['pending'].push(t);
    });
    return { groups, order };
  }

  const GROUP_LABELS = {
    get overdue() { return I18n.t('group_overdue'); },
    get pending() { return I18n.t('group_pending'); },
    get done() { return I18n.t('group_done'); }
  };

  function _renderList(tasks, assets = []) {
    const panel = document.getElementById('home-daily');
    if (!panel) return;

    if (tasks.length === 0) {
      panel.innerHTML = `
        <div class="tasks-empty">
          <div class="tasks-empty-icon">🎉</div>
          <p>${I18n.t('tasks_empty')}</p>
        </div>`;
      return;
    }

    const { groups, order } = _groupTasks(tasks);

    let html = _renderDashboard(tasks, assets);
    html += '<div class="task-list" id="task-list">';

    order.forEach(status => {
      const group = groups[status];
      if (group.length === 0) return;

      html += `<div class="task-group">
        <h3 class="task-group-label">${GROUP_LABELS[status]}</h3>`;
      group.forEach(task => { html += _renderCard(task); });
      html += `</div>`;
    });

    html += '</div>';
    panel.innerHTML = html;
  }

  // ─── Toggle done ──────────────────────────────────────────────────────────

  function toggleDone(taskId) {
    const task = _tasks.find(t => t.id === taskId);
    if (!task) return;

    const isDone = task.status === 'done';
    const isRepair = taskId.startsWith('task-repair-') || (task.tags && task.tags.includes('repair'));

    if (task.assetId && !isDone && !isRepair) {
      if (typeof AssetsView !== 'undefined') {
        AssetsView.openInspection(task.assetId);
      }
      return;
    }

    if (isDone) {
      MockDB.markPending(taskId).then(() => {
        if (isRepair && typeof NoticeStore !== 'undefined') {
          const noticeId = taskId.replace('task-repair-', '');
          return NoticeStore.markUnresolved(noticeId).then(() => {
            if (typeof NoticeView !== 'undefined') NoticeView.refreshFeed();
          });
        }
      }).then(() => refresh());
    } else {
      MockDB.markDone(taskId).then(() => {
        if (isRepair && typeof NoticeStore !== 'undefined') {
          const noticeId = taskId.replace('task-repair-', '');
          return NoticeStore.markRepaired(noticeId, {
            repairedBy: task.assignedTo && task.assignedTo !== 'Unassigned' ? task.assignedTo : (I18n.getLang() === 'jp' ? '作業員' : 'Operator'),
            repairNote: I18n.getLang() === 'jp' ? 'デイリータスクのチェックリスト経由で解決済みに変更' : 'Resolved via Daily Tasks checklist'
          }).then(() => {
            if (typeof NoticeView !== 'undefined') NoticeView.refreshFeed();
          });
        }
      }).then(() => refresh());
    }
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  /** Public: re-fetch tasks and re-render (call after any external data change) */
  function refresh() {
    Promise.all([
      MockDB.getTodaysTasks(),
      typeof AssetStore !== 'undefined' ? AssetStore.getAll() : Promise.resolve([])
    ]).then(([tasks, assets]) => {
      _tasks = tasks;
      _renderList(tasks, assets);
    });
  }

  function deleteCustomTask(id) {
    const isJp = I18n.getLang() === 'jp';
    if (!confirm(isJp ? 'このカスタム作業指示を削除しますか？' : 'Are you sure you want to delete this custom work order?')) return;
    MockDB.deleteTask(id).then(() => {
      refresh();
      if (typeof CalendarView !== 'undefined') CalendarView.init();
    });
  }

  function init() {
    _updateMode(_currentMode);
    refresh();
  }

  return { setMode, init, refresh, toggleDone, deleteCustomTask };

})();
