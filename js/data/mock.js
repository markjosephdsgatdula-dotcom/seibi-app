/**
 * data/mock.js — Task data store with LocalStorage persistence for Seibi
 *
 * Manages active/scheduled inspection tasks plotted on the calendar and
 * checklist views.
 */

'use strict';

const MockDB = (() => {

  const STORAGE_KEY = 'seibi_tasks';

  /** @type {'high'|'medium'|'low'} */
  const PRIORITY = { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' };

  /** @type {'pending'|'done'|'overdue'} */
  const STATUS = {
    PENDING: 'pending',
    DONE:    'done',
    OVERDUE: 'overdue',
  };

  // Seed tasks: Active robots due on Wednesday of next week (2026-06-10)
  const _seed = [
    {
      id: 'task-robot-03',
      title: 'Welding Robot #3 — Monthly Inspection',
      assetId: 'asset-robot-03',
      assetName: 'Welding Robot #3',
      location: 'Bay B',
      priority: PRIORITY.HIGH,
      status: STATUS.PENDING,
      dueDate: '2026-06-10',
      dueTime: '09:00',
      estimatedMins: 25,
      assignedTo: 'Unassigned',
      tags: ['robot', 'welding'],
    },
    {
      id: 'task-robot-04',
      title: 'Welding Robot #4 — Monthly Inspection',
      assetId: 'asset-robot-04',
      assetName: 'Welding Robot #4',
      location: 'Bay B',
      priority: PRIORITY.HIGH,
      status: STATUS.PENDING,
      dueDate: '2026-06-10',
      dueTime: '10:00',
      estimatedMins: 25,
      assignedTo: 'Unassigned',
      tags: ['robot', 'welding'],
    },
    {
      id: 'task-robot-05',
      title: 'Welding Robot #5 — Monthly Inspection',
      assetId: 'asset-robot-05',
      assetName: 'Welding Robot #5',
      location: 'Bay C',
      priority: PRIORITY.HIGH,
      status: STATUS.PENDING,
      dueDate: '2026-06-10',
      dueTime: '11:00',
      estimatedMins: 25,
      assignedTo: 'Unassigned',
      tags: ['robot', 'welding'],
    },
    {
      id: 'task-robot-06',
      title: 'Welding Robot #6 — Monthly Inspection',
      assetId: 'asset-robot-06',
      assetName: 'Welding Robot #6',
      location: 'Bay C',
      priority: PRIORITY.HIGH,
      status: STATUS.PENDING,
      dueDate: '2026-06-10',
      dueTime: '13:00',
      estimatedMins: 25,
      assignedTo: 'Unassigned',
      tags: ['robot', 'welding'],
    },
    {
      id: 'task-robot-tig-01',
      title: 'TIG Welding Robot #1 — Monthly Inspection',
      assetId: 'asset-robot-tig-01',
      assetName: 'TIG Welding Robot #1',
      location: 'Bay D',
      priority: PRIORITY.HIGH,
      status: STATUS.PENDING,
      dueDate: '2026-06-10',
      dueTime: '14:00',
      estimatedMins: 25,
      assignedTo: 'Unassigned',
      tags: ['robot', 'welding'],
    },
    {
      id: 'task-regulator-01',
      title: 'Regulator Pillar Left — Monthly Inspection',
      assetId: 'asset-regulator-01',
      assetName: 'Regulator Pillar Left',
      location: 'Pillar Left',
      priority: PRIORITY.HIGH,
      status: STATUS.PENDING,
      dueDate: '2026-06-10',
      dueTime: '15:00',
      estimatedMins: 15,
      assignedTo: 'Unassigned',
      tags: ['regulator', 'gas'],
    },
    {
      id: 'task-regulator-02',
      title: 'Regulator Pillar Right — Monthly Inspection',
      assetId: 'asset-regulator-02',
      assetName: 'Regulator Pillar Right',
      location: 'Pillar Right',
      priority: PRIORITY.HIGH,
      status: STATUS.PENDING,
      dueDate: '2026-06-10',
      dueTime: '16:00',
      estimatedMins: 15,
      assignedTo: 'Unassigned',
      tags: ['regulator', 'gas'],
    }
  ];

  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    _save(_seed);
    return [..._seed];
  }

  function _save(tasks) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (_) {}
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
    const todayStr = now.toISOString().slice(0, 10);

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
    const tasks = _load();
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.status = STATUS.DONE;
      task.dueDate = new Date().toISOString().slice(0, 10);
      _save(tasks);
    }
    return Promise.resolve(task);
  }

  function markPending(id) {
    const tasks = _load();
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.status = STATUS.PENDING;
      _save(tasks);
    }
    return Promise.resolve(task);
  }

  function reschedule(id, newDate) {
    const tasks = _load();
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.dueDate = newDate;
      _save(tasks);
      
      // Bidirectional Sync with AssetStore: update next due date on the Asset registry card
      if (task.assetId && typeof AssetStore !== 'undefined') {
        AssetStore.getAll().then(assets => {
          const asset = assets.find(a => a.id === task.assetId);
          if (asset) {
            asset.dueDate = newDate;
            try {
              localStorage.setItem('seibi_assets', JSON.stringify(assets));
            } catch (_) {}
            
            // Refresh assets view dynamically if initialized
            if (typeof AssetsView !== 'undefined') AssetsView.refresh();
          }
        });
      }
    }
    return Promise.resolve(task);
  }

  /**
   * Called by AssetStore when an inspection is completed.
   * Marks the pending check as done, and creates a new pending task for the next Wednesday date.
   */
  function syncCompletedInspection(assetId, nextDueDate) {
    const tasks = _load();

    // 1. Mark existing pending/overdue task for this asset as completed today
    const activeTasks = tasks.filter(t => t.assetId === assetId && t.status !== STATUS.DONE);

    // Grab name/location from the live task data — respects any user edits
    const referenceTask = activeTasks[0] || tasks.filter(t => t.assetId === assetId)[0];
    const assetName = referenceTask ? referenceTask.assetName : 'Robot';
    const location  = referenceTask ? referenceTask.location  : 'Workshop';
    const dueTime   = referenceTask ? referenceTask.dueTime   : '09:00';
    const estMins   = referenceTask ? referenceTask.estimatedMins : 25;

    activeTasks.forEach(t => {
      t.status = STATUS.DONE;
      t.originalDueDate = t.originalDueDate || t.dueDate;
      t.dueDate = new Date().toISOString().slice(0, 10);
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
    _save(tasks);
    return Promise.resolve();
  }

  function scheduleInspectionTask(assetId, assetName, location, dueDate) {
    const tasks = _load();
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
    const tasks = _load();
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

  function syncAssetDetails(assetId, assetName, location) {
    const tasks = _load();
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
    const tasks = _load();
    const completionDay = completedAtStr.slice(0, 10);

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
              const remainingForAsset = records.filter(r => 
                r.assetId === assetId && 
                r.completedAt.slice(0, 10) !== completionDay
              );
              if (remainingForAsset.length > 0) {
                asset.lastInspected = remainingForAsset[0].completedAt.slice(0, 10);
              } else {
                asset.lastInspected = null;
              }
              localStorage.setItem('seibi_assets', JSON.stringify(assets));
              if (typeof AssetsView !== 'undefined') AssetsView.refresh();
            });
          } else {
            asset.lastInspected = null;
            localStorage.setItem('seibi_assets', JSON.stringify(assets));
            if (typeof AssetsView !== 'undefined') AssetsView.refresh();
          }
        }
      });
    }

    return Promise.resolve();
  }

  return { getTodaysTasks, getAllTasks, getTaskById, markDone, markPending, reschedule, syncCompletedInspection, scheduleInspectionTask, syncAssetDetails, rollbackCompletedInspection, scheduleCustomTask, PRIORITY, STATUS };

})();
