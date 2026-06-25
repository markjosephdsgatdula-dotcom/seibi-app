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

  // ─── Public API ──────────────────────────────────────────────────────────

  function getAll() {
    return Promise.resolve(
      _load().sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    );
  }

  function addRecord(record) {
    if (!record.id) {
      record.id = `hist-${Date.now()}`;
    }
    if (typeof firebaseDb !== 'undefined') {
      return firebaseDb.ref('history/' + record.id).set(record)
        .then(() => {
          if (typeof FirebaseSync !== 'undefined' && FirebaseSync.cache.history) {
            if (!FirebaseSync.cache.history.some(r => r.id === record.id)) {
              FirebaseSync.cache.history.push(record);
            }
          }
          return record;
        })
        .catch(err => {
          console.error('[Firebase] Write error on history add:', err);
          return record;
        });
    }
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.cache.history) {
      FirebaseSync.cache.history.push(record);
    }
    return Promise.resolve(record);
  }

  function deleteRecord(id) {
    if (typeof firebaseDb !== 'undefined') {
      return firebaseDb.ref('history/' + id).remove()
        .then(() => {
          if (typeof FirebaseSync !== 'undefined' && FirebaseSync.cache.history) {
            FirebaseSync.cache.history = FirebaseSync.cache.history.filter(r => r.id !== id);
          }
        })
        .catch(err => {
          console.error('[Firebase] Write error on history delete:', err);
        });
    }
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.cache.history) {
      FirebaseSync.cache.history = FirebaseSync.cache.history.filter(r => r.id !== id);
    }
    return Promise.resolve();
  }

  return { getAll, addRecord, deleteRecord };

})();
