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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_seed));
    } catch (_) {}
    return [..._seed];
  }

  function _save(notices) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notices));
      if (typeof firebaseDb !== 'undefined') {
        firebaseDb.ref('notices').set(notices);
      }
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

    // Auto-generate Repair Work Order Task
    if ((category === 'incident' || category === 'defect') && typeof MockDB !== 'undefined') {
      MockDB.scheduleRepairTask({
        noticeId: notice.id,
        assetId: assetId,
        assetName: assetName || (I18n.getLang() === 'jp' ? '不明な設備' : 'Unknown Machine'),
        category: category,
        message: message
      });
    }

    return Promise.resolve(notice);
  }

  /**
   * Delete a notice and clean up all associated side-effects.
   * Clears corresponding repair tasks, history records, and resets asset repair status if appropriate.
   */
  function deleteNotice(id) {
    const notices = _load();
    const notice = notices.find(n => n.id === id);
    if (!notice) return Promise.resolve();

    const updatedNotices = notices.filter(n => n.id !== id);
    _save(updatedNotices);

    const promises = [];

    // Clean up corresponding repair task if present
    if (typeof MockDB !== 'undefined') {
      promises.push(MockDB.deleteTask(`task-repair-${id}`));
    }

    // Clean up corresponding history record if present
    if (typeof HistoryStore !== 'undefined') {
      promises.push(HistoryStore.deleteRecord(`hist-repair-${id}`));
    }

    // Bidirectional sync: if notice was unresolved and has assetId, reset repair status on the asset if no other unresolved notices exist for it
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

  /**
   * Clear all notices from storage.
   */
  function clearAll() {
    _save([]);
    return Promise.resolve();
  }

  /**
   * Mark a notice as repaired/resolved.
   */
  function markRepaired(id, { repairedBy, repairNote, repairPhoto = null }) {
    const notices = _load();
    const notice = notices.find(n => n.id === id);
    if (!notice) return Promise.resolve();
    notice.repaired    = true;
    notice.repairedBy  = repairedBy.trim();
    notice.repairedAt  = new Date().toISOString();
    notice.repairNote  = repairNote.trim();
    notice.repairPhoto = repairPhoto || null;
    _save(notices);

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
    const notices = _load();
    const notice = notices.find(n => n.id === id);
    if (!notice) return Promise.resolve();
    
    delete notice.repaired;
    delete notice.repairedBy;
    delete notice.repairedAt;
    delete notice.repairNote;
    delete notice.repairPhoto;
    _save(notices);

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
