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
    alert:      { label: 'Alert',      emoji: '🚨' },
    safety:     { label: 'Safety',     emoji: '⚠️' },
    update:     { label: 'Update',     emoji: '📢' },
    defect:     { label: 'Defect',     emoji: '🔧' },
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
  function post({ author, category, message }) {
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
      timestamp: new Date().toISOString(),
    };

    notices.push(notice);
    _save(notices);
    return Promise.resolve(notice);
  }

  /** Clear all notices (dev helper) */
  function clearAll() {
    localStorage.removeItem(STORAGE_KEY);
  }

  return { getAll, post, clearAll, CATEGORIES };

})();
