/**
 * js/components/asset-card.js — Asset Card UI Component
 * 
 * Pure visual component to generate HTML rendering strings for 
 * individual equipment cards and their status badges.
 */

'use strict';

const AssetCard = (() => {

  function statusBadge(status) {
    if (status === 'healthy') {
      return `<span class="status-badge status-badge--healthy">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        ${I18n.t('badge_healthy')}
      </span>`;
    }
    if (status === 'inspection_due') {
      return `<span class="status-badge status-badge--due">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/><circle cx="12" cy="12" r="10"/></svg>
        ${I18n.t('badge_due')}
      </span>`;
    }
    if (status === 'needs_repair') {
      return `<span class="status-badge status-badge--repair">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        ${I18n.t('badge_repair')}
      </span>`;
    }
    return `<span class="status-badge status-badge--decommissioned">${I18n.t('badge_offline')}</span>`;
  }

  function renderCard(asset) {
    const isDecom = asset.status === 'decommissioned';
    const lastInspectedLabel = asset.lastInspected 
      ? new Date(asset.lastInspected).toLocaleDateString(I18n.getLang() === 'jp' ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : I18n.t('never');
    const dueLabel = asset.dueDate
      ? new Date(asset.dueDate).toLocaleDateString(I18n.getLang() === 'jp' ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : I18n.t('na');

    return `
      <article class="asset-card status-${asset.status === 'inspection_due' ? 'due' : asset.status}" id="asset-card-${asset.id}">
        <div class="asset-card-content">
          <div class="asset-card-header">
            <h3 class="asset-name">${(I18n.getLang() === 'jp' && asset.name_jp) ? asset.name_jp : asset.name}</h3>
            <div class="asset-badges">${asset.model}</div>
          </div>
          
          <div class="asset-meta-rows" style="margin-top: 12px;">
            <div class="asset-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${I18n.t('meta_location')}: ${asset.location}
            </div>
            <div class="asset-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${I18n.t('meta_last_checked')}: ${lastInspectedLabel}
            </div>
            ${!isDecom ? `
              <div class="asset-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                ${I18n.t('meta_next_due')}: <strong>${dueLabel}</strong>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="asset-card-buttons" style="display: flex; gap: var(--space-2); margin-top: 12px;">
          ${AuthService.isAdmin() ? `
            <button class="asset-btn-secondary" onclick="AssetsView.openEditModal('${asset.id}')" style="flex: 1; margin: 0;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></svg>
              ${I18n.t('btn_edit_asset')}
            </button>
            ${!isDecom ? `
              <button class="asset-btn-secondary btn-report-incident-action" onclick="AssetsView.reportIncidentTrigger('${asset.id}')" style="flex: 1; margin: 0; color: #f87171; border-color: rgba(248, 113, 113, 0.3);">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                ${I18n.t('btn_report_incident')}
              </button>
            ` : ''}
          ` : ''}
        </div>
      </article>
    `;
  }

  return {
    statusBadge,
    renderCard
  };

})();
