/**
 * data/history.js — History Log data store with LocalStorage persistence
 *
 * Provides completed inspection records for the History Log view.
 * Persisted in localStorage so completed inspections survive page refreshes.
 *
 * Schema:
 *  {
 *    id: string,
 *    title: string,
 *    assetId: string,
 *    assetName: string,
 *    location: string,
 *    priority: 'high' | 'medium' | 'low',
 *    completedAt: string (ISO Timestamp),
 *    durationMins: number,
 *    completedBy: string,
 *    notes: string,
 *    checklist: Array<{ itemId: number, title: string, status: 'pass'|'fail', notes: string }>
 *  }
 */

'use strict';

const HistoryStore = (() => {

  const STORAGE_KEY = 'seibi_history';

  // Helper: ISO date string N days ago at a given HH:MM
  function _at(daysAgo, time = '09:00') {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const [h, m] = time.split(':');
    d.setHours(Number(h), Number(m), 0, 0);
    return d.toISOString();
  }

  const _seed = [];

  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    _save(_seed);
    return [..._seed];
  }

  function _save(records) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (_) {}
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  function getAll() {
    return Promise.resolve(
      _load().sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    );
  }

  function addRecord(record) {
    const records = _load();
    
    // Generate a unique ID if not present
    if (!record.id) {
      record.id = `hist-${Date.now()}`;
    }
    
    records.push(record);
    _save(records);
    return Promise.resolve(record);
  }

  return { getAll, addRecord };

})();
