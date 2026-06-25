/**
 * services/history-service.js — History Analytics Service
 *
 * Responsibilities:
 *   - Filter records by date range, type, and search query
 *   - Compute summary statistics from a filtered record set
 *   - Compute per-machine health scores from the full record set
 *   - Detect recurring checklist item failures across inspection records
 *
 * Design rules:
 *   - Pure functions only. No DOM access, no HTML, no Firebase calls.
 *   - All functions are stateless — inputs in, data out.
 */

'use strict';

const HistoryService = (() => {

  // ─── Internal: date range cutoff ────────────────────────────────────────

  function _cutoffDate(range) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    switch (range) {
      case '30d':  { const d = new Date(now); d.setDate(d.getDate() - 30);       return d; }
      case '90d':  { const d = new Date(now); d.setDate(d.getDate() - 90);       return d; }
      case '6m':   { const d = new Date(now); d.setMonth(d.getMonth() - 6);      return d; }
      case 'year': { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d; }
      default:     return null; // 'all'
    }
  }

  // ─── Internal: sub-filters ───────────────────────────────────────────────

  function _byRange(records, range) {
    const cutoff = _cutoffDate(range);
    if (!cutoff) return records;
    return records.filter(r => new Date(r.completedAt) >= cutoff);
  }

  function _byType(records, type) {
    switch (type) {
      case 'inspection': return records.filter(r => r.type !== 'repair');
      case 'repair':     return records.filter(r => r.type === 'repair');
      // 'failure' = inspections where defects were found (priority high)
      case 'failure':    return records.filter(r => r.type !== 'repair' && r.priority === 'high');
      default:           return records; // 'all'
    }
  }

  function _bySearch(records, query) {
    if (!query || !query.trim()) return records;
    const q = query.trim().toLowerCase();
    return records.filter(r =>
      (r.assetName  && r.assetName.toLowerCase().includes(q)) ||
      (r.completedBy && r.completedBy.toLowerCase().includes(q))
    );
  }

  // ─── Public: filterRecords ────────────────────────────────────────────────

  /**
   * Apply all active filters to a record set.
   * @param {Array}  records  Full or pre-filtered record array
   * @param {{ range: string, type: string, search: string }} filter
   * @returns {Array} Filtered records
   */
  function filterRecords(records, filter) {
    let result = records;
    result = _byRange(result,  filter.range  || 'all');
    result = _byType(result,   filter.type   || 'all');
    result = _bySearch(result, filter.search || '');
    return result;
  }

  // ─── Public: computeStats ────────────────────────────────────────────────

  /**
   * Compute display statistics from a (possibly filtered) record set.
   * @param {Array} records
   * @returns {{ totalInspections, totalRepairs, totalDefects, mostActiveAsset }}
   */
  function computeStats(records) {
    let totalInspections = 0;
    let totalRepairs     = 0;
    let totalDefects     = 0;
    const assetCounts    = new Map();

    for (const rec of records) {
      if (rec.type === 'repair') {
        totalRepairs++;
      } else {
        totalInspections++;
        if (Array.isArray(rec.checklist)) {
          totalDefects += rec.checklist.filter(i => i.status === 'fail').length;
        }
      }

      if (rec.assetId && rec.assetName) {
        assetCounts.set(rec.assetId, {
          name:  rec.assetName,
          count: (assetCounts.get(rec.assetId)?.count || 0) + 1,
        });
      }
    }

    let mostActiveAsset = '—';
    if (assetCounts.size > 0) {
      const top = [...assetCounts.values()].sort((a, b) => b.count - a.count)[0];
      mostActiveAsset = top.name;
    }

    return { totalInspections, totalRepairs, totalDefects, mostActiveAsset };
  }

  // ─── Public: computeMachineHealth ────────────────────────────────────────

  /**
   * Compute a health score for every registered machine.
   * Always operates on the FULL unfiltered record set.
   *
   * Score logic (first match wins):
   *   'risk'    — repairCount >= 2 in last 90d, OR passRate < 0.50
   *   'watch'   — repairCount >= 1 in last 90d, OR passRate < 0.80, OR daysSince > 35
   *   'healthy' — otherwise
   *
   * @param {Array} allRecords  Full unfiltered history
   * @returns {Map<string, { assetName, score, passRate, repairCount, daysSinceInspection }>}
   */
  function computeMachineHealth(allRecords) {
    const ninety = new Date();
    ninety.setDate(ninety.getDate() - 90);
    ninety.setHours(0, 0, 0, 0);

    // Group records by assetId — skip custom/unregistered
    const byAsset = new Map();
    for (const rec of allRecords) {
      if (!rec.assetId) continue;
      if (!byAsset.has(rec.assetId)) {
        byAsset.set(rec.assetId, { assetName: rec.assetName, inspections: [], repairs: [] });
      }
      const grp = byAsset.get(rec.assetId);
      if (rec.type === 'repair') {
        grp.repairs.push(rec);
      } else {
        grp.inspections.push(rec);
      }
    }

    const result = new Map();

    for (const [assetId, { assetName, inspections, repairs }] of byAsset) {
      // Sort inspections newest-first
      inspections.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

      // Pass rate: average over last 3 inspections
      const last3 = inspections.slice(0, 3);
      let passRate = 1;
      const checklistInspections = last3.filter(r => Array.isArray(r.checklist) && r.checklist.length > 0);
      if (checklistInspections.length > 0) {
        const ratios = checklistInspections.map(r => {
          const total  = r.checklist.length;
          const passed = r.checklist.filter(i => i.status === 'pass').length;
          return total > 0 ? passed / total : 1;
        });
        passRate = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
      }

      // Repair count in last 90 days
      const repairCount = repairs.filter(r => new Date(r.completedAt) >= ninety).length;

      // Days since last inspection
      let daysSinceInspection = 0;
      if (inspections.length > 0) {
        const last = new Date(inspections[0].completedAt);
        daysSinceInspection = Math.floor((Date.now() - last.getTime()) / 86400000);
      } else {
        daysSinceInspection = 999; // Never inspected
      }

      // Score
      let score;
      if (repairCount >= 2 || passRate < 0.50) {
        score = 'risk';
      } else if (repairCount >= 1 || passRate < 0.80 || daysSinceInspection > 35) {
        score = 'watch';
      } else {
        score = 'healthy';
      }

      result.set(assetId, { assetName, score, passRate, repairCount, daysSinceInspection });
    }

    return result;
  }

  // ─── Public: detectRecurringFailures ─────────────────────────────────────

  /**
   * Find checklist items that have failed 2+ times on the same machine.
   * Always operates on the FULL unfiltered record set.
   *
   * @param {Array} allRecords
   * @returns {Array<{ assetName, itemTitle, failCount, isConsecutive }>}
   *          Sorted by failCount descending. Only items with failCount >= 2.
   */
  function detectRecurringFailures(allRecords) {
    // Build: Map<assetId, { assetName, inspections: [] }>
    const byAsset = new Map();
    for (const rec of allRecords) {
      if (rec.type === 'repair' || !Array.isArray(rec.checklist) || !rec.assetId) continue;
      if (!byAsset.has(rec.assetId)) {
        byAsset.set(rec.assetId, { assetName: rec.assetName, inspections: [] });
      }
      byAsset.get(rec.assetId).inspections.push(rec);
    }

    const findings = [];

    for (const [, { assetName, inspections }] of byAsset) {
      // Sort oldest-first so we can check consecutive order
      inspections.sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));

      // Build Map<itemId, { title, failsPerInspection: boolean[] }>
      const itemMap = new Map();

      for (const rec of inspections) {
        for (const item of rec.checklist) {
          if (!item.itemId) continue;
          if (!itemMap.has(item.itemId)) {
            const title = item.title_en || item.title || `Item ${item.itemId}`;
            itemMap.set(item.itemId, { title, fails: [] });
          }
          itemMap.get(item.itemId).fails.push(item.status === 'fail');
        }
      }

      for (const [, { title, fails }] of itemMap) {
        const failCount = fails.filter(Boolean).length;
        if (failCount < 2) continue;

        // Check if the last 2+ entries are consecutive failures
        let consecutiveTrail = 0;
        for (let i = fails.length - 1; i >= 0; i--) {
          if (fails[i]) consecutiveTrail++;
          else break;
        }
        const isConsecutive = consecutiveTrail >= 2;

        findings.push({ assetName, itemTitle: title, failCount, isConsecutive });
      }
    }

    return findings.sort((a, b) => b.failCount - a.failCount);
  }

  // ─── Public: rangeLabel ───────────────────────────────────────────────────

  /**
   * Human-readable label for a date range key.
   * @param {string} range
   * @param {boolean} isJp
   */
  function rangeLabel(range, isJp) {
    const labels = {
      en: { all: 'All Time', '30d': 'Last 30 Days', '90d': 'Last 90 Days', '6m': 'Last 6 Months', year: 'This Year' },
      jp: { all: '全期間',   '30d': '過去30日',     '90d': '過去90日',     '6m': '過去6ヶ月',     year: '今年' },
    };
    return (isJp ? labels.jp : labels.en)[range] || range;
  }

  return {
    filterRecords,
    computeStats,
    computeMachineHealth,
    detectRecurringFailures,
    rangeLabel,
  };

})();
