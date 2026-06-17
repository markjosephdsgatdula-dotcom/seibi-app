/**
 * data/history.js — History Log data store
 *
 * Reads/writes directly to Firebase Realtime Database via FirebaseSync cache.
 * No localStorage persistence.
 */

'use strict';

const HistoryStore = (() => {

  function _load() {
    return (typeof FirebaseSync !== 'undefined' && FirebaseSync.cache.history) || [];
  }

  function _save(records) {
    if (typeof FirebaseSync !== 'undefined') {
      FirebaseSync.cache.history = records;
    }
    if (typeof firebaseDb !== 'undefined') {
      firebaseDb.ref('history').set(records).catch(err => {
        console.error('[Firebase] Write error on history:', err);
      });
    }
    return Promise.resolve();
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  function getAll() {
    return Promise.resolve(
      _load().sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    );
  }

  function addRecord(record) {
    const records = _load().slice(); // clone
    if (!record.id) {
      record.id = `hist-${Date.now()}`;
    }
    records.push(record);
    _save(records);
    return Promise.resolve(record);
  }

  function deleteRecord(id) {
    const records = _load().filter(r => r.id !== id);
    _save(records);
    return Promise.resolve();
  }

  return { getAll, addRecord, deleteRecord };

})();
