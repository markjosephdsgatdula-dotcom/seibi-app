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

  function _renderSummary(tasks) {
    const total   = tasks.length;
    const done    = tasks.filter(t => t.status === 'done').length;
    const overdue = tasks.filter(t => t.status === 'overdue').length;
    const pct     = total ? Math.round((done / total) * 100) : 0;

    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });

    return `
      <div class="daily-summary">
        <div class="daily-date">${today}</div>
        <div class="daily-stats">
          <span class="stat-chip stat-done">${done}/${total} done</span>
          ${overdue > 0 ? `<span class="stat-chip stat-overdue">${overdue} overdue</span>` : ''}
        </div>
        <div class="progress-bar-wrap" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Tasks completed">
          <div class="progress-bar-fill" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }

  // ─── Task card ────────────────────────────────────────────────────────────

  function _priorityLabel(p) {
    return { high: 'High', medium: 'Medium', low: 'Low' }[p] ?? p;
  }

  function _statusLabel(s) {
    return {
      'pending': 'Pending',
      'done':    'Done',
      'overdue': 'Overdue',
    }[s] ?? s;
  }

  function _renderCard(task) {
    const isDone = task.status === 'done';
    const clickHandler = task.assetId && !isDone
      ? `AssetsView.openInspection('${task.assetId}')`
      : `HomeView.toggleDone('${task.id}')`;

    return `
      <article
        class="task-card priority-${task.priority} status-${task.status}"
        id="card-${task.id}"
        data-task-id="${task.id}"
        aria-label="${task.title}"
        onclick="${clickHandler}"
        style="cursor: pointer;"
      >
        <!-- Left priority colour strip -->
        <div class="task-strip" aria-hidden="true"></div>

        <div class="task-body">
          <!-- Row 1: Title + done button -->
          <div class="task-top-row">
            <h2 class="task-title ${isDone ? 'task-title--done' : ''}">${task.title}</h2>
            <button
              class="task-done-btn ${isDone ? 'task-done-btn--checked' : ''}"
              aria-label="${isDone ? 'Mark as pending' : 'Mark as done'}: ${task.title}"
              data-task-id="${task.id}"
              onclick="event.stopPropagation(); ${clickHandler}"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                ${isDone
                  ? '<circle cx="10" cy="10" r="9"/><polyline points="5.5,10.5 8.5,13.5 14.5,7"/>'
                  : '<circle cx="10" cy="10" r="9"/>'}
              </svg>
            </button>
          </div>

          <!-- Row 2: Asset name + location -->
          <div class="task-meta-row">
            <span class="task-asset">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
              ${task.assetName}
            </span>
            <span class="task-location">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${task.location}
            </span>
          </div>

          <!-- Row 3: Chips (time, assignee, priority, status) -->
          <div class="task-chips-row">
            <span class="chip chip-time">⏰ ${task.dueTime}</span>
            <span class="chip chip-duration">~${task.estimatedMins}min</span>
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
    'overdue': '🔴 Overdue',
    'pending': '⚪ Pending',
    'done':    '✅ Completed',
  };

  function _renderList(tasks) {
    const panel = document.getElementById('home-daily');
    if (!panel) return;

    if (tasks.length === 0) {
      panel.innerHTML = `
        <div class="tasks-empty">
          <div class="tasks-empty-icon">🎉</div>
          <p>No tasks scheduled for today.</p>
        </div>`;
      return;
    }

    const { groups, order } = _groupTasks(tasks);

    let html = _renderSummary(tasks);
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
    if (task.assetId && !isDone) {
      if (typeof AssetsView !== 'undefined') {
        AssetsView.openInspection(task.assetId);
      }
      return;
    }

    if (isDone) {
      task.status = 'pending';
    } else {
      MockDB.markDone(taskId);
    }

    refresh();
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  /** Public: re-fetch tasks and re-render (call after any external data change) */
  function refresh() {
    MockDB.getTodaysTasks().then(tasks => {
      _tasks = tasks;
      _renderList(_tasks);
    });
  }

  function init() {
    _updateMode(_currentMode);
    MockDB.getTodaysTasks().then(tasks => {
      _tasks = tasks;
      _renderList(_tasks);
    });
  }

  return { setMode, init, refresh, toggleDone };

})();
