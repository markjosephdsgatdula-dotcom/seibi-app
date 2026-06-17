/**
 * data/mock.js — Task data store
 *
 * Manages active/scheduled inspection tasks plotted on the calendar and
 * checklist views. Reads/writes directly to Firebase Realtime Database
 * via FirebaseSync cache. No localStorage persistence.
 */

'use strict';

const MockDB = (() => {

  /** @type {'high'|'medium'|'low'} */
  const PRIORITY = { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' };

  /** @type {'pending'|'done'|'overdue'} */
  const STATUS = {
    PENDING: 'pending',
    DONE:    'done',
    OVERDUE: 'overdue',
  };

  function _load() {
    return (typeof FirebaseSync !== 'undefined' && FirebaseSync.cache.tasks) || [];
  }

  function _save(tasks) {
    if (typeof FirebaseSync !== 'undefined') {
      FirebaseSync.cache.tasks = tasks;
    }
    if (typeof firebaseDb !== 'undefined') {
      firebaseDb.ref('tasks').set(tasks).catch(err => {
        console.error('[Firebase] Write error on tasks:', err);
      });
    }
    return Promise.resolve();
  }

  function _computeStatus(task) {
    if (task.status === STATUS.DONE) return task;
    const today = new Date(); today.setHours(0,0,0,0);
    const dueDate = new Date(task.dueDate + 'T00:00:00');
    const derived = dueDate < today ? STATUS.OVERDUE : STATUS.PENDING;
    return derived === task.status ? task : { ...task, status: derived };
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  function getTodaysTasks() {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const offset = now.getTimezoneOffset() * 60000;
    const todayStr = new Date(Date.now() - offset).toISOString().slice(0, 10);

    return Promise.resolve(
      _load()
        .filter(t => {
          const due = new Date(t.dueDate + 'T00:00:00');
          due.setHours(0, 0, 0, 0);

          if (t.status === STATUS.DONE) {
            return t.dueDate === todayStr;
          }
          return due <= now;
        })
        .map(_computeStatus)
    );
  }

  function getAllTasks() {
    return Promise.resolve(_load().map(_computeStatus));
  }

  function getTaskById(id) {
    return Promise.resolve(_load().find(t => t.id === id) || null);
  }

  function markDone(id) {
    const tasks = _load().slice(); // clone
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.status = STATUS.DONE;
      const offset = new Date().getTimezoneOffset() * 60000;
      task.dueDate = new Date(Date.now() - offset).toISOString().slice(0, 10);
      _save(tasks);
    }
    return Promise.resolve(task);
  }

  function markPending(id) {
    const tasks = _load().slice(); // clone
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.status = STATUS.PENDING;
      _save(tasks);
    }
    return Promise.resolve(task);
  }

  function reschedule(id, newDate) {
    const tasks = _load().slice(); // clone
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.dueDate = newDate;
      _save(tasks);
      
      // Bidirectional Sync with AssetStore: update next due date on the Asset registry card
      if (task.assetId && typeof AssetStore !== 'undefined') {
        AssetStore.updateDueDate(task.assetId, newDate);
      }
    }
    return Promise.resolve(task);
  }

  /**
   * Called by AssetStore when an inspection is completed.
   * Marks the pending check as done, and creates a new pending task for the next Wednesday date.
   */
  function syncCompletedInspection(assetId, nextDueDate) {
    const tasks = _load().slice(); // clone

    // 1. Mark existing pending/overdue task for this asset as completed today
    const activeTasks = tasks.filter(t => t.assetId === assetId && t.status !== STATUS.DONE);

    // Grab name/location from the live task data — respects any user edits
    const referenceTask = activeTasks[0] || tasks.filter(t => t.assetId === assetId)[0];
    const assetName = referenceTask ? referenceTask.assetName : 'Robot';
    const location  = referenceTask ? referenceTask.location  : 'Workshop';
    const dueTime   = referenceTask ? referenceTask.dueTime   : '09:00';
    const estMins   = referenceTask ? referenceTask.estimatedMins : 25;

    const offset = new Date().getTimezoneOffset() * 60000;
    const localTodayStr = new Date(Date.now() - offset).toISOString().slice(0, 10);
    activeTasks.forEach(t => {
      t.status = STATUS.DONE;
      t.originalDueDate = t.originalDueDate || t.dueDate;
      t.dueDate = localTodayStr;
    });

    // 2. Schedule the next check on the calendar
    const newTask = {
      id: `task-robot-${Date.now()}`,
      title: `${assetName} — Monthly Inspection`,
      assetId: assetId,
      assetName: assetName,
      location: location,
      priority: PRIORITY.HIGH,
      status: STATUS.PENDING,
      dueDate: nextDueDate,
      dueTime: dueTime,
      estimatedMins: estMins,
      assignedTo: 'Unassigned',
      tags: ['robot', 'welding']
    };

    tasks.push(newTask);
    return _save(tasks);
  }

  function scheduleInspectionTask(assetId, assetName, location, dueDate) {
    const tasks = _load().slice(); // clone
    const exists = tasks.some(t => t.assetId === assetId && t.dueDate === dueDate && t.status !== STATUS.DONE);
    if (exists) return Promise.resolve();

    const newTask = {
      id: `task-robot-${Date.now()}`,
      title: `${assetName} — Monthly Inspection`,
      assetId: assetId,
      assetName: assetName,
      location: location,
      priority: PRIORITY.HIGH,
      status: STATUS.PENDING,
      dueDate: dueDate,
      dueTime: '09:00',
      estimatedMins: 25,
      assignedTo: 'Unassigned',
      tags: ['robot', 'welding']
    };

    tasks.push(newTask);
    _save(tasks);
    return Promise.resolve(newTask);
  }

  function scheduleCustomTask({ title, dueDate, dueTime, assignedTo, priority, notes }) {
    const tasks = _load().slice(); // clone
    const newTask = {
      id: `task-custom-${Date.now()}`,
      title: title.trim(),
      assetId: null,
      assetName: 'Custom',
      location: 'Workshop',
      priority: priority || PRIORITY.MEDIUM,
      status: STATUS.PENDING,
      dueDate: dueDate,
      dueTime: dueTime || '09:00',
      estimatedMins: 30,
      assignedTo: assignedTo || 'Unassigned',
      tags: ['custom', 'work-order']
    };
    if (notes) {
      newTask.notes = notes.trim();
    }
    tasks.push(newTask);
    _save(tasks);
    return Promise.resolve(newTask);
  }

  function scheduleRepairTask({ noticeId, assetId, assetName, category, message }) {
    const tasks = _load().slice(); // clone
    const offset = new Date().getTimezoneOffset() * 60000;
    const todayStr = new Date(Date.now() - offset).toISOString().slice(0, 10);
    const isJp = typeof I18n !== 'undefined' && I18n.getLang() === 'jp';
    
    // Check if task already exists to prevent duplicates
    const taskId = `task-repair-${noticeId}`;
    const exists = tasks.some(t => t.id === taskId);
    if (exists) return Promise.resolve();

    const titlePrefix = category === 'incident' 
      ? (isJp ? '修理（突発）: ' : 'Repair (Incident): ')
      : (isJp ? '修理（異常）: ' : 'Repair (Defect): ');

    const newTask = {
      id: taskId,
      title: `${titlePrefix}${assetName}`,
      assetId: assetId || null,
      assetName: assetName,
      location: 'Workshop',
      priority: PRIORITY.HIGH,
      status: STATUS.PENDING,
      dueDate: todayStr,
      dueTime: '09:00',
      estimatedMins: 30,
      assignedTo: 'Unassigned',
      tags: ['repair', 'work-order'],
      notes: message
    };

    if (assetId && typeof AssetStore !== 'undefined') {
      return AssetStore.getById(assetId).then(asset => {
        if (asset) {
          newTask.location = asset.location;
          newTask.assetName = asset.name;
        }
        tasks.push(newTask);
        return _save(tasks).then(() => newTask);
      });
    } else {
      tasks.push(newTask);
      return _save(tasks).then(() => newTask);
    }
  }

  function syncAssetDetails(assetId, assetName, location) {
    const tasks = _load().slice(); // clone
    let changed = false;
    tasks.forEach(t => {
      if (t.assetId === assetId) {
        t.assetName = assetName;
        t.location = location;
        t.title = `${assetName} — Monthly Inspection`;
        changed = true;
      }
    });
    if (changed) {
      _save(tasks);
    }
    return Promise.resolve();
  }

  function rollbackCompletedInspection(assetId, completedAtStr) {
    const tasks = _load().slice(); // clone
    const d = new Date(completedAtStr);
    const completionDay = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

    // 1. Find the task that was completed for this asset on that completion day
    const completedTasks = tasks.filter(t => 
      t.assetId === assetId && 
      t.status === STATUS.DONE && 
      t.dueDate === completionDay
    );

    // 2. Revert those completed tasks to pending/overdue
    let restoredDueDate = completionDay;
    completedTasks.forEach(t => {
      t.status = STATUS.PENDING;
      if (t.originalDueDate) {
        t.dueDate = t.originalDueDate;
        restoredDueDate = t.originalDueDate;
      }
    });

    // 3. Find and delete the future task that was scheduled for this asset
    const filteredTasks = tasks.filter(t => {
      const isFuturePending = t.assetId === assetId && t.status === STATUS.PENDING && t.dueDate > completionDay;
      return !isFuturePending;
    });

    // Save the updated tasks
    _save(filteredTasks);

    // 4. Update the asset registry state
    if (typeof AssetStore !== 'undefined') {
      AssetStore.getAll().then(assets => {
        const asset = assets.find(a => a.id === assetId);
        if (asset) {
          asset.status = 'inspection_due';
          asset.dueDate = restoredDueDate;

          // Find the previous history record for this asset to restore lastInspected date
          if (typeof HistoryStore !== 'undefined') {
            HistoryStore.getAll().then(records => {
              const remainingForAsset = records.filter(r => {
                const rd = new Date(r.completedAt);
                const rDay = new Date(rd.getTime() - rd.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
                return r.assetId === assetId && rDay !== completionDay;
              });
              if (remainingForAsset.length > 0) {
                const r0d = new Date(remainingForAsset[0].completedAt);
                asset.lastInspected = new Date(r0d.getTime() - r0d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
              } else {
                asset.lastInspected = null;
              }
              AssetStore.updateAsset(asset.id, { lastInspected: asset.lastInspected, status: asset.status, dueDate: asset.dueDate });
            });
          } else {
            asset.lastInspected = null;
            AssetStore.updateAsset(asset.id, { lastInspected: asset.lastInspected, status: asset.status, dueDate: asset.dueDate });
          }
        }
      });
    }

    return Promise.resolve();
  }

  function deleteTask(id) {
    const tasks = _load().filter(t => t.id !== id);
    _save(tasks);
    return Promise.resolve();
  }

  return { getTodaysTasks, getAllTasks, getTaskById, markDone, markPending, reschedule, syncCompletedInspection, scheduleInspectionTask, syncAssetDetails, rollbackCompletedInspection, scheduleCustomTask, scheduleRepairTask, deleteTask, PRIORITY, STATUS };

})();
