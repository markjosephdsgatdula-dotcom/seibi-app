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
    activeTasks.forEach(t => {
      t.status = STATUS.DONE;
      t.dueDate = new Date().toISOString().slice(0, 10);
    });

    const assetNameMap = {
      'asset-robot-03': 'Welding Robot #3',
      'asset-robot-04': 'Welding Robot #4',
      'asset-robot-05': 'Welding Robot #5',
      'asset-robot-06': 'Welding Robot #6',
      'asset-robot-tig-01': 'TIG Welding Robot #1'
    };
    const locationMap = {
      'asset-robot-03': 'Bay B',
      'asset-robot-04': 'Bay B',
      'asset-robot-05': 'Bay C',
      'asset-robot-06': 'Bay C',
      'asset-robot-tig-01': 'Bay D'
    };

    // 2. Schedule the next check on the calendar
    const newTask = {
      id: `task-robot-${Date.now()}`,
      title: `${assetNameMap[assetId] || 'Robot'} — Monthly Inspection`,
      assetId: assetId,
      assetName: assetNameMap[assetId] || 'Robot',
      location: locationMap[assetId] || 'Workshop',
      priority: PRIORITY.HIGH,
      status: STATUS.PENDING,
      dueDate: nextDueDate,
      dueTime: '09:00',
      estimatedMins: 25,
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

  return { getTodaysTasks, getAllTasks, getTaskById, markDone, reschedule, syncCompletedInspection, scheduleInspectionTask, syncAssetDetails, PRIORITY, STATUS };

})();
