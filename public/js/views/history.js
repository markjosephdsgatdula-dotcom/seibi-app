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

    const isJp = I18n.getLang() === 'jp';
    if (rec.getTime() === today.getTime()) return isJp ? '今日' : 'Today';
    if (rec.getTime() === yest.getTime())  return isJp ? '昨日' : 'Yesterday';
    return d.toLocaleDateString(isJp ? 'ja-JP' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  function _timeStr(isoStr) {
    return new Date(isoStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

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
      ? `<p class="hist-card-notes" style="margin-bottom: var(--space-1); color: var(--clr-text-secondary); font-size: var(--font-size-xs);">🚨 <strong>${I18n.getLang() === 'jp' ? '発生時の詳細: ' : 'Reported Issue: '}</strong>"${rec.reportNotes}"</p>`
      : '';

    return `
      <article class="hist-card priority-${rec.priority} ${isRepair ? 'hist-card--repair' : ''}" id="hist-${rec.id}">
        <div class="hist-strip" style="${isRepair ? 'background: var(--clr-success);' : ''}"></div>
        <div class="hist-card-body">
          <div class="hist-card-top">
            <h3 class="hist-card-title">${rec.title}</h3>
            <div class="hist-card-top-right">
              <span class="hist-card-duration">⏱ ${rec.durationMins}${I18n.t('min')}</span>
              <button
                class="hist-delete-btn"
                onclick="HistoryView.deleteRecord('${rec.id}')"
                title="${I18n.getLang() === 'jp' ? 'このレコードを削除' : 'Delete this record'}"
                aria-label="Delete record"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
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
                  const url = typeof p === 'string' ? p : p.url;
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
    // Group by calendar day key (YYYY-MM-DD), preserving newest-first order
    const groups = new Map();
    for (const rec of records) {
      const key = _dayKey(rec.completedAt);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(rec);
    }

    let html = '';
    for (const [key, recs] of groups) {
      const labelKey = recs.length === 1 ? 'record' : 'records';
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
    // Group by assetId
    const groups = new Map();
    for (const rec of records) {
      const grpId = rec.assetId || 'custom-mach';
      const grpName = rec.assetId ? rec.assetName : (I18n.getLang() === 'jp' ? '臨時点検・作業' : 'Custom / Unregistered');
      if (!groups.has(grpId)) {
        groups.set(grpId, { assetName: grpName, records: [] });
      }
      groups.get(grpId).records.push(rec);
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
      const labelKey = recs.length === 1 ? 'record' : 'records';
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

  // ─── Core render ─────────────────────────────────────────────────────────

  function _renderList() {
    const container = document.getElementById('history-list');
    if (!container) return;

    if (_records.length === 0) {
      container.innerHTML = `
        <div class="hist-empty">
          <div class="hist-empty-icon">📜</div>
          <p>${I18n.t('hist_empty')}</p>
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

  // ─── Delete ───────────────────────────────────────────────────────────────

  function deleteRecord(id) {
    const rec = _records.find(r => r.id === id);
    if (!rec) return;
    if (!confirm(I18n.t('confirm_delete_history'))) return;

    HistoryStore.deleteRecord(id).then(() => {
      _records = _records.filter(r => r.id !== id);
      _renderList();

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

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    HistoryStore.getAll().then(records => {
      _records = records;
      _updateSortButtons();
      _renderList();
    });
  }

  return { setSort, init, deleteRecord };

})();
