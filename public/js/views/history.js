/**
 * views/history.js — History Log view controller
 *
 * Two sort modes:
 *  - By Date:    records grouped by calendar day, newest group first
 *  - By Machine: records grouped by assetName, each machine sorted by
 *                completedAt descending; machines sorted by most-recent activity
 *
 * Analytics panels (all use HistoryService):
 *  - Machine health score cards  (#hist-health-panel)
 *  - Recurring failure alerts    (#hist-alerts-panel)
 *  - Summary stats bar           (#hist-stats-bar)
 *  - Filter bar                  (#hist-filter-bar)
 */

'use strict';

const HistoryView = (() => {

  const SORTS = ['date', 'machine'];
  let _currentSort = 'date';
  let _allRecords  = [];   // full unfiltered set — source of truth for health/alerts
  let _records     = [];   // filtered working set — what the list renders

  let _filter = { range: 'all', type: 'all', search: '' };
  let _searchTimer = null;

  // ─── Date helpers ─────────────────────────────────────────────────────────

  function _dateLabel(isoStr) {
    const d     = new Date(isoStr);
    const today = new Date(); today.setHours(0,0,0,0);
    const yest  = new Date(today); yest.setDate(yest.getDate() - 1);
    const rec   = new Date(d); rec.setHours(0,0,0,0);

    const isJp = I18n.getLang() === 'jp';
    if (rec.getTime() === today.getTime()) return isJp ? '今日' : 'Today';
    if (rec.getTime() === yest.getTime())  return isJp ? '昨日' : 'Yesterday';
    return d.toLocaleDateString(isJp ? 'ja-JP' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  function _timeStr(isoStr) {
    return new Date(isoStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  // Helper function to extract date key YYYY-MM-DD
  function _dayKey(isoStr) {
    const d = new Date(isoStr);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 10);
  }

  // ─── Card renderer ────────────────────────────────────────────────────────

  function _renderCard(rec) {
    const isRepair = rec.type === 'repair';
    const isJp = I18n.getLang() === 'jp';
    const notesHtml = rec.notes
      ? `<p class="hist-card-notes">${isRepair ? `🔧 <strong>${isJp ? '対処・修理ノート: ' : 'Action Note: '}</strong>` : ''}"${rec.notes}"</p>`
      : '';

    const reportNotesHtml = isRepair && rec.reportNotes
      ? `<p class="hist-card-notes" style="margin-bottom: var(--space-1); color: var(--clr-text-secondary); font-size: var(--font-size-xs);">🚨 <strong>${isJp ? '発生時の詳細: ' : 'Reported Issue: '}</strong>"${rec.reportNotes}"</p>`
      : '';

    return `
      <article class="hist-card priority-${rec.priority} ${isRepair ? 'hist-card--repair' : ''}" id="hist-${rec.id}">
        <div class="hist-strip" style="${isRepair ? 'background: var(--clr-success);' : ''}"></div>
        <div class="hist-card-body">
          <div class="hist-card-top">
            <h3 class="hist-card-title">${rec.title}</h3>
            <div class="hist-card-top-right">
              <span class="hist-card-duration">⏱ ${rec.durationMins}${I18n.t('min')}</span>
              ${AuthService.isAdmin() ? `
              <button
                class="hist-delete-btn"
                onclick="HistoryView.deleteRecord('${rec.id}')"
                title="${isJp ? 'このレコードを削除' : 'Delete this record'}"
                aria-label="Delete record"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
              ` : ''}
            </div>
          </div>
          <div class="hist-card-meta">
            <span class="hist-meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
              ${rec.assetName}
            </span>
            <span class="hist-meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${rec.location}
            </span>
            <span class="hist-meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              ${rec.completedBy}
            </span>
            <span class="hist-meta-item hist-meta-time">
              ✅ ${_timeStr(rec.completedAt)}
            </span>
          </div>
          ${reportNotesHtml}
          ${notesHtml}
          ${(() => {
            let photos = [];
            if (rec.checklist) {
              photos = rec.checklist
                .filter(item => item.status === 'fail' && item.photo)
                .map(item => item.photo);
            } else {
              if (rec.reportPhoto) photos.push({ url: rec.reportPhoto, label: isJp ? '発生状況写真' : 'Report Photo' });
              if (rec.repairPhoto) photos.push({ url: rec.repairPhoto, label: isJp ? '対応・修理写真' : 'Resolution Photo' });
            }
            if (photos.length === 0) return '';
            return `
              <div class="hist-card-photos" style="margin-top: var(--space-2); display: flex; gap: var(--space-2); flex-wrap: wrap;">
                ${photos.map(p => {
                  const url   = typeof p === 'string' ? p : p.url;
                  const label = typeof p === 'string' ? 'Photo' : p.label;
                  return `
                    <div class="hist-photo-wrapper" onclick="AssetsView.openLightbox('${url}', '${label}')" style="border-radius: var(--radius-sm); border: 1px solid var(--clr-border); overflow: hidden; width: 64px; height: 48px; cursor: pointer; transition: border-color var(--transition-fast);">
                      <img class="hist-photo-img" src="${url}" alt="History photo" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
                    </div>
                  `;
                }).join('')}
              </div>
            `;
          })()}
        </div>
      </article>
    `;
  }

  // ─── By Date render ───────────────────────────────────────────────────────

  function _renderByDate(records) {
    const groups = new Map();
    for (const rec of records) {
      const key = _dayKey(rec.completedAt);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(rec);
    }

    let html = '';
    for (const [key, recs] of groups) {
      const labelKey   = recs.length === 1 ? 'record' : 'records';
      const countLabel = I18n.getLang() === 'jp'
        ? `${recs.length}${I18n.t(labelKey)}`
        : `${recs.length} ${I18n.t(labelKey)}`;

      html += `
        <div class="hist-group">
          <h2 class="hist-group-label">
            <span class="hist-group-day">${_dateLabel(key + 'T12:00:00')}</span>
            <span class="hist-group-count">${countLabel}</span>
          </h2>
          ${recs.map(_renderCard).join('')}
        </div>
      `;
    }
    return html;
  }

  // ─── By Machine render ────────────────────────────────────────────────────

  function _renderByMachine(records) {
    const groups = new Map();
    for (const rec of records) {
      const grpId   = rec.assetId || 'custom-mach';
      const grpName = rec.assetId ? rec.assetName : (I18n.getLang() === 'jp' ? '臨時点検・作業' : 'Custom / Unregistered');
      if (!groups.has(grpId)) {
        groups.set(grpId, { assetName: grpName, records: [] });
      }
      groups.get(grpId).records.push(rec);
    }

    const sorted = [...groups.entries()].sort((a, b) => {
      const latestA = Math.max(...a[1].records.map(r => new Date(r.completedAt)));
      const latestB = Math.max(...b[1].records.map(r => new Date(r.completedAt)));
      return latestB - latestA;
    });

    let html = '';
    for (const [assetId, { assetName, records: recs }] of sorted) {
      const lastDate   = _dateLabel(recs[0].completedAt);
      const labelKey   = recs.length === 1 ? 'record' : 'records';
      const countLabel = I18n.getLang() === 'jp'
        ? `${recs.length}${I18n.t(labelKey)}`
        : `${recs.length} ${I18n.t(labelKey)}`;

      html += `
        <div class="hist-group hist-machine-group" id="machine-${assetId}">
          <h2 class="hist-group-label hist-machine-label">
            <span class="hist-machine-icon" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
            </span>
            <span class="hist-group-day">${assetName}</span>
            <span class="hist-group-count">${countLabel}</span>
            <span class="hist-machine-last">${I18n.t('last')}: ${lastDate}</span>
          </h2>
          ${recs.map(_renderCard).join('')}
        </div>
      `;
    }
    return html;
  }

  // ─── Core list render ────────────────────────────────────────────────────

  function _renderList() {
    const container = document.getElementById('history-list');
    if (!container) return;

    if (_records.length === 0) {
      const hasActiveFilter = _filter.range !== 'all' || _filter.type !== 'all' || _filter.search;
      const isJp = I18n.getLang() === 'jp';
      container.innerHTML = `
        <div class="hist-empty">
          <div class="hist-empty-icon">${hasActiveFilter ? '🔍' : '📜'}</div>
          <p>${hasActiveFilter
            ? (isJp ? '現在のフィルター条件に一致するレコードがありません。' : 'No records match the current filters.')
            : I18n.t('hist_empty')
          }</p>
          ${hasActiveFilter ? `<button class="hist-clear-filter-btn" onclick="HistoryView.clearFilters()">${isJp ? 'フィルターをクリア' : 'Clear Filters'}</button>` : ''}
        </div>`;
      return;
    }

    container.innerHTML = _currentSort === 'date'
      ? _renderByDate(_records)
      : _renderByMachine(_records);
  }

  // ─── Analytics: Stats bar ────────────────────────────────────────────────

  function _renderStats() {
    const container = document.getElementById('hist-stats-bar');
    if (!container) return;

    const stats = HistoryService.computeStats(_records);
    const isJp  = I18n.getLang() === 'jp';
    const label = HistoryService.rangeLabel(_filter.range, isJp);

    container.innerHTML = `
      <div class="hist-stats-bar">
        <div class="hist-stat-tile">
          <span class="hist-stat-value">${stats.totalInspections}</span>
          <span class="hist-stat-label">${isJp ? '点検' : 'Inspections'}</span>
        </div>
        <div class="hist-stat-tile">
          <span class="hist-stat-value hist-stat-value--repair">${stats.totalRepairs}</span>
          <span class="hist-stat-label">${isJp ? '修理' : 'Repairs'}</span>
        </div>
        <div class="hist-stat-tile">
          <span class="hist-stat-value hist-stat-value--defect">${stats.totalDefects}</span>
          <span class="hist-stat-label">${isJp ? '不具合検出' : 'Defects Found'}</span>
        </div>
        <div class="hist-stat-range-label">${label}</div>
      </div>
    `;
  }

  // ─── Analytics: Machine health cards ────────────────────────────────────

  function _renderHealthCards() {
    const container = document.getElementById('hist-health-panel');
    if (!container) return;

    const healthMap = HistoryService.computeMachineHealth(_allRecords);
    if (healthMap.size === 0) { container.innerHTML = ''; return; }

    const isJp = I18n.getLang() === 'jp';

    const scoreConfig = {
      healthy: { label: isJp ? '正常'   : 'Healthy', icon: '🟢', cls: 'hist-health-score--healthy' },
      watch:   { label: isJp ? '要注意' : 'Watch',   icon: '🟡', cls: 'hist-health-score--watch'   },
      risk:    { label: isJp ? '要対応' : 'At Risk',  icon: '🔴', cls: 'hist-health-score--risk'    },
    };

    const cards = [...healthMap.entries()].map(([assetId, data]) => {
      const cfg      = scoreConfig[data.score];
      const passText = `${Math.round(data.passRate * 100)}% ${isJp ? '合格率' : 'pass'}`;
      const daysText = data.daysSinceInspection === 999
        ? (isJp ? '未点検' : 'Never')
        : `${data.daysSinceInspection}${isJp ? '日前' : 'd ago'}`;
      const record = _allRecords.find(r => r.assetId === assetId);
      const assetNameJp = record ? (record.assetName_jp || record.assetName) : null;
      const displayName = (isJp && assetNameJp) ? assetNameJp : data.assetName;

      return `
        <div class="hist-health-card ${cfg.cls}">
          <div class="hist-health-card-score">${cfg.icon} ${cfg.label}</div>
          <div class="hist-health-card-name" title="${displayName}">${displayName}</div>
          <div class="hist-health-card-meta">${passText}</div>
          <div class="hist-health-card-meta">${daysText}</div>
          ${data.repairCount > 0 ? `<div class="hist-health-card-repairs">🔧 ${data.repairCount} ${isJp ? '修理' : 'repair(s)'}</div>` : ''}
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="hist-health-panel">
        <div class="hist-health-header">
          <span class="hist-health-title">${isJp ? '設備ヘルス' : 'Machine Health'}</span>
          <span class="hist-health-subtitle">${isJp ? '全期間データに基づく' : 'Based on all-time data'}</span>
        </div>
        <div class="hist-health-scroll">${cards}</div>
      </div>
    `;
  }

  // ─── Analytics: Recurring failure alerts ────────────────────────────────

  function _renderAlerts() {
    const container = document.getElementById('hist-alerts-panel');
    if (!container) return;

    const failures = HistoryService.detectRecurringFailures(_allRecords);
    if (failures.length === 0) { container.innerHTML = ''; return; }

    const isJp = I18n.getLang() === 'jp';
    const hasConsecutive = failures.some(f => f.isConsecutive);

    const rows = failures.map(f => {
      const badge = f.isConsecutive
        ? `<span class="hist-alert-badge hist-alert-badge--consecutive">${isJp ? '連続失敗' : 'Consecutive'}</span>`
        : `<span class="hist-alert-badge">${isJp ? '繰り返し' : 'Recurring'}</span>`;
      return `
        <div class="hist-alert-row ${f.isConsecutive ? 'hist-alert-row--consecutive' : ''}">
          <span class="hist-alert-machine">${f.assetName}</span>
          <span class="hist-alert-item">${f.itemTitle}</span>
          <span class="hist-alert-count">${f.failCount}×</span>
          ${badge}
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="hist-alerts-panel ${hasConsecutive ? 'hist-alerts-panel--urgent' : ''}">
        <div class="hist-alerts-header">
          <span class="hist-alerts-icon">⚠️</span>
          <span class="hist-alerts-title">${isJp ? '繰り返し不具合の検出' : 'Recurring Failure Detection'}</span>
          <span class="hist-alerts-subtitle">${isJp ? '同一項目が2回以上失敗' : 'Items failing 2+ times on the same machine'}</span>
        </div>
        <div class="hist-alerts-list">${rows}</div>
      </div>
    `;
  }

  // ─── Filter bar ──────────────────────────────────────────────────────────

  function _renderFilterBar() {
    const container = document.getElementById('hist-filter-bar');
    if (!container) return;

    const isJp = I18n.getLang() === 'jp';

    const ranges = [
      { key: 'all',  label: isJp ? '全期間'   : 'All' },
      { key: '30d',  label: isJp ? '30日'     : '30d' },
      { key: '90d',  label: isJp ? '90日'     : '90d' },
      { key: '6m',   label: isJp ? '6ヶ月'    : '6 mo' },
      { key: 'year', label: isJp ? '今年'     : 'Year' },
    ];

    const types = [
      { key: 'all',         label: isJp ? '全て'     : 'All'         },
      { key: 'inspection',  label: isJp ? '点検'     : 'Inspections' },
      { key: 'repair',      label: isJp ? '修理'     : 'Repairs'     },
      { key: 'failure',     label: isJp ? '異常あり' : 'Failures'    },
    ];

    const rangePills  = ranges.map(r =>
      `<button class="hist-filter-pill ${_filter.range === r.key ? 'active' : ''}" onclick="HistoryView.setFilter('range','${r.key}')">${r.label}</button>`
    ).join('');

    const typePills = types.map(t =>
      `<button class="hist-filter-pill ${_filter.type === t.key ? 'active' : ''}" onclick="HistoryView.setFilter('type','${t.key}')">${t.label}</button>`
    ).join('');

    const hasActive = _filter.range !== 'all' || _filter.type !== 'all' || _filter.search;

    container.innerHTML = `
      <div class="hist-filter-bar">
        <div class="hist-filter-row">
          <div class="hist-filter-group" role="group" aria-label="${isJp ? '期間' : 'Date range'}">
            ${rangePills}
          </div>
          <div class="hist-filter-group" role="group" aria-label="${isJp ? '種別' : 'Record type'}">
            ${typePills}
          </div>
        </div>
        <div class="hist-filter-search-row">
          <input
            type="search"
            id="hist-search-input"
            class="hist-search-input"
            placeholder="${isJp ? '設備名・担当者で検索…' : 'Search by machine or operator…'}"
            value="${_filter.search}"
            oninput="HistoryView._onSearchInput(this.value)"
            autocomplete="off"
          />
          ${hasActive ? `<button class="hist-clear-btn" onclick="HistoryView.clearFilters()">${isJp ? 'クリア' : 'Clear'}</button>` : ''}
        </div>
      </div>
    `;
  }

  function _updateFilterPills() {
    // Update pill active states without re-rendering the whole bar
    document.querySelectorAll('#hist-filter-bar .hist-filter-pill').forEach(btn => {
      const onclick = btn.getAttribute('onclick') || '';
      const rangeMatch = onclick.match(/'range','([^']+)'/);
      const typeMatch  = onclick.match(/'type','([^']+)'/);
      if (rangeMatch) btn.classList.toggle('active', _filter.range === rangeMatch[1]);
      if (typeMatch)  btn.classList.toggle('active', _filter.type  === typeMatch[1]);
    });

    // Show/hide clear button
    const clearBtn = document.querySelector('#hist-filter-bar .hist-clear-btn');
    const hasActive = _filter.range !== 'all' || _filter.type !== 'all' || _filter.search;
    if (clearBtn && !hasActive) {
      clearBtn.remove();
    } else if (!clearBtn && hasActive) {
      const row = document.querySelector('#hist-filter-bar .hist-filter-search-row');
      if (row) {
        const isJp = I18n.getLang() === 'jp';
        const btn  = document.createElement('button');
        btn.className = 'hist-clear-btn';
        btn.textContent = isJp ? 'クリア' : 'Clear';
        btn.setAttribute('onclick', 'HistoryView.clearFilters()');
        row.appendChild(btn);
      }
    }
  }

  // ─── Sort toggle ─────────────────────────────────────────────────────────

  function _updateSortButtons() {
    document.querySelectorAll('#view-history .sort-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sort === _currentSort);
      btn.setAttribute('aria-pressed', String(btn.dataset.sort === _currentSort));
    });
  }

  function setSort(sort) {
    if (!SORTS.includes(sort) || sort === _currentSort) return;
    _currentSort = sort;
    _updateSortButtons();
    _renderList();
  }

  // ─── Public: filter API ───────────────────────────────────────────────────

  function setFilter(key, value) {
    if (!['range', 'type', 'search'].includes(key)) return;
    _filter[key] = value;
    _records = HistoryService.filterRecords(_allRecords, _filter);
    _updateFilterPills();
    _renderStats();
    _renderList();
  }

  function clearFilters() {
    _filter = { range: 'all', type: 'all', search: '' };
    const input = document.getElementById('hist-search-input');
    if (input) input.value = '';
    _records = _allRecords;
    _renderFilterBar(); // full re-render to reset all pill states and clear button
    _renderStats();
    _renderList();
  }

  // Debounced search handler (called from oninput inline)
  function _onSearchInput(value) {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => setFilter('search', value), 250);
  }

  // ─── Utility ─────────────────────────────────────────────────────────────

  function _truncate(str, max) {
    if (!str || str.length <= max) return str;
    return str.slice(0, max) + '…';
  }

  // ─── Delete ──────────────────────────────────────────────────────────────

  function deleteRecord(id) {
    const rec = _allRecords.find(r => r.id === id);
    if (!rec) return;
    if (!confirm(I18n.t('confirm_delete_history'))) return;

    HistoryStore.deleteRecord(id).then(() => {
      _allRecords = _allRecords.filter(r => r.id !== id);
      _records    = HistoryService.filterRecords(_allRecords, _filter);
      _renderList();
      _renderStats();
      _renderHealthCards();
      _renderAlerts();

      if (rec.type === 'repair') {
        const noticeId = id.replace('hist-repair-', '');
        if (typeof NoticeStore !== 'undefined') {
          NoticeStore.markUnresolved(noticeId).then(() => {
            if (typeof NoticeView !== 'undefined') NoticeView.refreshFeed();
          });
        }
        if (typeof MockDB !== 'undefined') {
          MockDB.markPending(`task-repair-${noticeId}`).then(() => {
            if (typeof HomeView !== 'undefined') HomeView.refresh();
            if (typeof CalendarView !== 'undefined') CalendarView.init();
          });
        }
      } else {
        if (typeof MockDB !== 'undefined') {
          MockDB.rollbackCompletedInspection(rec.assetId, rec.completedAt).then(() => {
            if (typeof HomeView !== 'undefined') HomeView.refresh();
            if (typeof CalendarView !== 'undefined') CalendarView.init();
          });
        }
      }
    });
  }

  // ─── Init ────────────────────────────────────────────────────────────────

  function init() {
    HistoryStore.getAll().then(records => {
      _allRecords = records;
      _records    = HistoryService.filterRecords(_allRecords, _filter);
      _renderHealthCards();
      _renderAlerts();
      _renderStats();
      _renderFilterBar();
      _updateSortButtons();
      _renderList();
    });
  }

  return {
    setSort,
    init,
    refresh: init,
    deleteRecord,
    setFilter,
    clearFilters,
    _onSearchInput,  // exposed for inline oninput handler
  };

})();
