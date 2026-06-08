/**
 * data/notices.js — Notice Board data store
 *
 * Persists to localStorage so posts survive page refreshes.
 * Shape is backend-ready: swap localStorage.getItem/setItem for
 * fetch('/api/notices') when a server is introduced.
 *
 * Notice schema:
 *  { id, author, initials, category, message, timestamp (ISO string) }
 */

'use strict';

const NoticeStore = (() => {

  const STORAGE_KEY = 'seibi_notices';

  const CATEGORIES = {
    info:       { label: 'Info',       emoji: 'ℹ️' },
    alert:      { label: 'Alert',      emoji: '⚠️' },
    safety:     { label: 'Safety',     emoji: '🛡️' },
    update:     { label: 'Update',     emoji: '📢' },
    defect:     { label: 'Defect',     emoji: '🔧' },
    incident:   { label: 'Incident',   emoji: '🚨' },
  };

  // ─── Seed data (shown only when localStorage is empty) ───────────────────
  const _seed = [];

  // ─── Internal load/save ──────────────────────────────────────────────────

  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    // First load: seed the store
    _save(_seed);
    return [..._seed];
  }

  function _save(notices) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notices));
    } catch (_) {}
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  function getAll() {
    return Promise.resolve(_load());
  }

  /**
   * Post a new notice.
   * @param {{ author: string, category: string, message: string }} data
   */
  function post({ author, category, message, assetId = null, assetName = null, photo = null, incidentType = null, occurrenceTime = null }) {
    const notices = _load();
    const initials = author
      .trim()
      .split(/\s+/)
      .map(w => w[0].toUpperCase())
      .slice(0, 2)
      .join('');

    const notice = {
      id: `notice-${Date.now()}`,
      author: author.trim(),
      initials,
      category,
      message: message.trim(),
      timestamp: occurrenceTime || new Date().toISOString(),
      assetId,
      assetName,
      photo,
      incidentType
    };

    notices.push(notice);
    _save(notices);

    // Bidirectional sync: if it is an incident or defect, update asset status to needs_repair
    if (assetId && (category === 'incident' || category === 'defect') && typeof AssetStore !== 'undefined') {
      AssetStore.setRepairStatus(assetId, 'needs_repair');
    }

    return Promise.resolve(notice);
  }

  /** Clear all notices (dev helper) */
  function clearAll() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /** Delete a notice by id */
  function deleteNotice(id) {
    const notices = _load().filter(n => n.id !== id);
    _save(notices);
    return Promise.resolve();
  }

  /**
   * Mark a defect notice as repaired.
   * @param {string} id
   * @param {{ repairedBy: string, repairNote: string }} data
   */
  function markRepaired(id, { repairedBy, repairNote }) {
    const notices = _load();
    const notice = notices.find(n => n.id === id);
    if (!notice) return Promise.resolve();
    notice.repaired   = true;
    notice.repairedBy = repairedBy.trim();
    notice.repairedAt = new Date().toISOString();
    notice.repairNote = repairNote.trim();
    _save(notices);

    // Sync back to AssetStore: resolve the asset's repair status!
    if (notice.assetId && typeof AssetStore !== 'undefined') {
      AssetStore.resolveRepair(notice.assetId);
    }

    return Promise.resolve(notice);
  }

  return { getAll, post, deleteNotice, markRepaired, clearAll, CATEGORIES };

})();
