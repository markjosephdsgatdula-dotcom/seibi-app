/**
 * data/notices.js — Notice Board data store
 *
 * Reads/writes directly to Firebase Realtime Database via FirebaseSync cache.
 * No localStorage persistence.
 *
 * Notice schema:
 *  { id, author, initials, category, message, timestamp (ISO string) }
 */

'use strict';

const NoticeStore = (() => {

  const CATEGORIES = {
    info:       { label: 'Info',       emoji: 'ℹ️' },
    alert:      { label: 'Alert',      emoji: '⚠️' },
    safety:     { label: 'Safety',     emoji: '🛡️' },
    update:     { label: 'Update',     emoji: '📢' },
    defect:     { label: 'Defect',     emoji: '🔧' },
    incident:   { label: 'Incident',   emoji: '🚨' },
  };

  // ─── Internal load/save ──────────────────────────────────────────────────

  function _load() {
    return (typeof FirebaseSync !== 'undefined' && FirebaseSync.cache.notices) || [];
  }

  function _save(notices) {
    if (typeof FirebaseSync !== 'undefined') {
      FirebaseSync.cache.notices = notices;
    }
    if (typeof firebaseDb !== 'undefined') {
      firebaseDb.ref('notices').set(notices).catch(err => {
        console.error('[Firebase] Write error on notices:', err);
      });
    }
    return Promise.resolve();
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  function getAll() {
    return Promise.resolve(_load());
  }

  function post({ author, category, message, assetId = null, assetName = null, photo = null, incidentType = null, occurrenceTime = null }) {
    const notices = _load().slice(); // clone
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

    // Write only the new notice to its own child node. No full-array overwrite.
    const saveNoticePromise = (typeof firebaseDb !== 'undefined')
      ? firebaseDb.ref('notices/' + notice.id).set(notice).catch(err => {
          console.error('[Firebase] Write error on notices/post:', err);
        })
      : Promise.resolve();

    // Keep in-memory cache in sync
    if (typeof FirebaseSync !== 'undefined') {
      if (!FirebaseSync.cache.notices.some(n => n.id === notice.id)) {
        FirebaseSync.cache.notices.push(notice);
      }
    }

    // Bidirectional sync: if it is an incident or defect, update asset status to needs_repair
    let assetPromise = Promise.resolve();
    if (assetId && (category === 'incident' || category === 'defect') && typeof AssetStore !== 'undefined') {
      assetPromise = AssetStore.setRepairStatus(assetId, 'needs_repair');
    }

    // Auto-generate Repair Work Order Task
    let taskPromise = Promise.resolve();
    if ((category === 'incident' || category === 'defect') && typeof MockDB !== 'undefined') {
      taskPromise = MockDB.scheduleRepairTask({
        noticeId: notice.id,
        assetId: assetId,
        assetName: assetName || (I18n.getLang() === 'jp' ? '不明な設備' : 'Unknown Machine'),
        category: category,
        message: message
      });
    }

    return Promise.all([saveNoticePromise, assetPromise, taskPromise]).then(() => notice);
  }

  function deleteNotice(id) {
    console.log('[NoticeStore] Deleting notice with ID:', id);
    const notices = _load();
    const notice = notices.find(n => n.id === id);
    if (!notice) {
      console.warn('[NoticeStore] Notice not found for deletion:', id);
      return Promise.resolve();
    }

    const updatedNotices = notices.filter(n => n.id !== id);
    // Remove only this notice's child node.
    if (typeof firebaseDb !== 'undefined') {
      firebaseDb.ref('notices/' + id).remove().catch(err => {
        console.error('[Firebase] Write error on notices/delete:', err);
      });
    }
    if (typeof FirebaseSync !== 'undefined') {
      FirebaseSync.cache.notices = updatedNotices;
    }

    const promises = [];

    // Clean up corresponding repair task if present
    if (typeof MockDB !== 'undefined') {
      promises.push(MockDB.deleteTask(`task-repair-${id}`));
    }

    // Clean up corresponding history record if present
    if (typeof HistoryStore !== 'undefined') {
      promises.push(HistoryStore.deleteRecord(`hist-repair-${id}`));
    }

    // Bidirectional sync: if notice was unresolved and has assetId, reset repair status
    if (notice.assetId && !notice.repaired && typeof AssetStore !== 'undefined') {
      const otherUnresolved = updatedNotices.some(n => n.assetId === notice.assetId && !n.repaired && (n.category === 'incident' || n.category === 'defect'));
      if (!otherUnresolved) {
        promises.push(AssetStore.resolveRepair(notice.assetId));
      }
    }

    return Promise.all(promises).then(() => {
      if (typeof HomeView !== 'undefined') HomeView.refresh();
      if (typeof CalendarView !== 'undefined') CalendarView.init();
      if (typeof HistoryView !== 'undefined') HistoryView.init();
    });
  }

  function clearAll() {
    _save([]);
    return Promise.resolve();
  }

  function markRepaired(id, { repairedBy, repairNote, repairPhoto = null }) {
    const notices = _load().slice(); // clone
    const notice = notices.find(n => n.id === id);
    if (!notice) return Promise.resolve();
    const repairedAt = new Date().toISOString();
    const repairFields = {
      repaired:    true,
      repairedBy:  repairedBy.trim(),
      repairedAt:  repairedAt,
      repairNote:  repairNote.trim(),
      repairPhoto: repairPhoto || null
    };

    // Merge only the repair fields — other notice fields are untouched.
    if (typeof firebaseDb !== 'undefined') {
      firebaseDb.ref('notices/' + id).update(repairFields).catch(err => {
        console.error('[Firebase] Write error on notices/markRepaired:', err);
      });
    }

    // Keep in-memory cache in sync
    if (notice) {
      Object.assign(notice, repairFields);
    }

    // Sync back to AssetStore: resolve the asset's repair status!
    if (notice.assetId && typeof AssetStore !== 'undefined') {
      AssetStore.resolveRepair(notice.assetId);
    }

    // Sync back to MockDB: mark the linked repair task as done!
    if (typeof MockDB !== 'undefined') {
      MockDB.markDone(`task-repair-${id}`).then(() => {
        if (typeof HomeView !== 'undefined') HomeView.refresh();
        if (typeof CalendarView !== 'undefined') CalendarView.init();
      });
    }

    // Add to HistoryStore
    if (typeof HistoryStore !== 'undefined') {
      const isJp = typeof I18n !== 'undefined' && I18n.getLang() === 'jp';
      let location = 'Workshop';
      let assetName = notice.assetName || (isJp ? '不明な設備' : 'Unknown Machine');

      const addHistory = () => {
        const titlePrefix = notice.category === 'incident'
          ? (isJp ? '突発異常解決: ' : 'Incident Resolution: ')
          : (isJp ? '異常修復: ' : 'Defect Repair: ');

        const historyRecord = {
          id: `hist-repair-${notice.id}`,
          title: `${titlePrefix}${assetName}`,
          assetId: notice.assetId || '',
          assetName: assetName,
          location: location,
          priority: 'high',
          completedAt: new Date().toISOString(),
          durationMins: 30,
          completedBy: repairedBy.trim(),
          notes: repairNote.trim(),
          reportNotes: notice.message,
          reportPhoto: notice.photo || null,
          repairPhoto: repairPhoto || null,
          type: 'repair'
        };

        HistoryStore.addRecord(historyRecord).then(() => {
          if (typeof HistoryView !== 'undefined') HistoryView.init();
        });
      };

      if (notice.assetId && typeof AssetStore !== 'undefined') {
        AssetStore.getById(notice.assetId).then(asset => {
          if (asset) {
            location = asset.location;
            assetName = asset.name;
          }
          addHistory();
        });
      } else {
        addHistory();
      }
    }

    return Promise.resolve(notice);
  }

  function markUnresolved(id) {
    const notices = _load().slice(); // clone
    const notice = notices.find(n => n.id === id);
    if (!notice) return Promise.resolve();
    
    // Setting a field to null in Firebase RTDB removes it from the node.
    const clearFields = {
      repaired:    null,
      repairedBy:  null,
      repairedAt:  null,
      repairNote:  null,
      repairPhoto: null
    };

    if (typeof firebaseDb !== 'undefined') {
      firebaseDb.ref('notices/' + id).update(clearFields).catch(err => {
        console.error('[Firebase] Write error on notices/markUnresolved:', err);
      });
    }

    // Keep in-memory cache in sync
    if (notice) {
      delete notice.repaired;
      delete notice.repairedBy;
      delete notice.repairedAt;
      delete notice.repairNote;
      delete notice.repairPhoto;
    }

    // Sync back to AssetStore: set status back to needs_repair!
    if (notice.assetId && typeof AssetStore !== 'undefined') {
      AssetStore.setRepairStatus(notice.assetId, 'needs_repair');
    }

    // Delete corresponding history record if present
    if (typeof HistoryStore !== 'undefined') {
      HistoryStore.deleteRecord(`hist-repair-${id}`).then(() => {
        if (typeof HistoryView !== 'undefined') HistoryView.init();
      });
    }

    return Promise.resolve(notice);
  }

  return { getAll, post, deleteNotice, markRepaired, markUnresolved, clearAll, CATEGORIES };

})();
