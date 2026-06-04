/**
 * views/history.js — History Log view controller (full implementation)
 *
 * Two sort modes:
 *  - By Date:    records grouped by calendar day, newest group first
 *  - By Machine: records grouped by assetName, each machine sorted by
 *                completedAt descending; machines sorted by most-recent activity
 *
 * Phase 2 note: grouping/sorting logic lives entirely in this file —
 * swapping HistoryStore.getAll() for an IndexedDB cursor or API call
 * requires zero changes here.
 */

'use strict';

const HistoryView = (() => {

  const SORTS = ['date', 'machine'];
  let _currentSort = 'date';
  let _records = [];

  // ─── Date helpers ─────────────────────────────────────────────────────────

  function _dateLabel(isoStr) {
    const d     = new Date(isoStr);
    const today = new Date(); today.setHours(0,0,0,0);
    const yest  = new Date(today); yest.setDate(yest.getDate() - 1);
    const rec   = new Date(d); rec.setHours(0,0,0,0);

    if (rec.getTime() === today.getTime()) return 'Today';
    if (rec.getTime() === yest.getTime())  return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  function _timeStr(isoStr) {
    return new Date(isoStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function _dayKey(isoStr) {
    return new Date(isoStr).toISOString().slice(0, 10);
  }

  // ─── Card renderer ────────────────────────────────────────────────────────

  function _renderCard(rec) {
    const notesHtml = rec.notes
      ? `<p class="hist-card-notes">"${rec.notes}"</p>`
      : '';

    return `
      <article class="hist-card priority-${rec.priority}" id="hist-${rec.id}">
        <div class="hist-strip"></div>
        <div class="hist-card-body">
          <div class="hist-card-top">
            <h3 class="hist-card-title">${rec.title}</h3>
            <span class="hist-card-duration">⏱ ${rec.durationMins}min</span>
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
          ${notesHtml}
        </div>
      </article>
    `;
  }

  // ─── By Date render ───────────────────────────────────────────────────────

  function _renderByDate(records) {
    // Group by calendar day key (YYYY-MM-DD), preserving newest-first order
    const groups = new Map();
    for (const rec of records) {
      const key = _dayKey(rec.completedAt);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(rec);
    }

    let html = '';
    for (const [key, recs] of groups) {
      html += `
        <div class="hist-group">
          <h2 class="hist-group-label">
            <span class="hist-group-day">${_dateLabel(key + 'T12:00:00')}</span>
            <span class="hist-group-count">${recs.length} inspection${recs.length !== 1 ? 's' : ''}</span>
          </h2>
          ${recs.map(_renderCard).join('')}
        </div>
      `;
    }
    return html;
  }

  // ─── By Machine render ────────────────────────────────────────────────────

  function _renderByMachine(records) {
    // Group by assetId
    const groups = new Map();
    for (const rec of records) {
      if (!groups.has(rec.assetId)) {
        groups.set(rec.assetId, { assetName: rec.assetName, records: [] });
      }
      groups.get(rec.assetId).records.push(rec);
    }

    // Sort groups by most recent activity
    const sorted = [...groups.entries()].sort((a, b) => {
      const latestA = Math.max(...a[1].records.map(r => new Date(r.completedAt)));
      const latestB = Math.max(...b[1].records.map(r => new Date(r.completedAt)));
      return latestB - latestA;
    });

    let html = '';
    for (const [assetId, { assetName, records: recs }] of sorted) {
      const lastDate = _dateLabel(recs[0].completedAt);
      html += `
        <div class="hist-group hist-machine-group" id="machine-${assetId}">
          <h2 class="hist-group-label hist-machine-label">
            <span class="hist-machine-icon" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
            </span>
            <span class="hist-group-day">${assetName}</span>
            <span class="hist-group-count">${recs.length} record${recs.length !== 1 ? 's' : ''}</span>
            <span class="hist-machine-last">Last: ${lastDate}</span>
          </h2>
          ${recs.map(_renderCard).join('')}
        </div>
      `;
    }
    return html;
  }

  // ─── Core render ─────────────────────────────────────────────────────────

  function _renderList() {
    const container = document.getElementById('history-list');
    if (!container) return;

    if (_records.length === 0) {
      container.innerHTML = `
        <div class="hist-empty">
          <div class="hist-empty-icon">📜</div>
          <p>No completed inspections yet.</p>
        </div>`;
      return;
    }

    container.innerHTML = _currentSort === 'date'
      ? _renderByDate(_records)
      : _renderByMachine(_records);
  }

  // ─── Sort toggle ──────────────────────────────────────────────────────────

  function _updateSortButtons() {
    document.querySelectorAll('#view-history .sort-btn').forEach(btn => {
      const isDate    = btn.dataset.sort === 'date';
      const isActive  = _currentSort === (isDate ? 'date' : 'machine');
      btn.classList.toggle('active', isDate
        ? _currentSort === 'date'
        : _currentSort === 'machine');
      btn.setAttribute('aria-pressed', String(
        isDate ? _currentSort === 'date' : _currentSort === 'machine'
      ));
    });
  }

  function setSort(sort) {
    if (!SORTS.includes(sort) || sort === _currentSort) return;
    _currentSort = sort;
    _updateSortButtons();
    _renderList();
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    HistoryStore.getAll().then(records => {
      _records = records;
      _updateSortButtons();
      _renderList();
    });
  }

  return { setSort, init };

})();
