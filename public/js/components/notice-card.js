/**
 * components/notice-card.js — HTML Rendering for Notice Cards
 */

'use strict';

const NoticeCard = (() => {

  function renderRepairBanner(notice) {
    if (!notice.repaired) return '';
    const isJp = I18n.getLang() === 'jp';
    const isIncident = notice.category === 'incident';
    const time = new Date(notice.repairedAt).toLocaleString(isJp ? 'ja-JP' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    
    const resolvedTxt = isIncident
      ? (isJp ? '解決済み' : 'Resolved')
      : (isJp ? '修理完了' : 'Repaired');
      
    const byTxt = isJp ? '担当' : 'by';
    
    const label = `${resolvedTxt} · ${time} · ${byTxt} ${Utils.escapeHtml(notice.repairedBy)}`;

    return `
      <div class="notice-repaired-banner" style="${isIncident ? 'border-color: var(--clr-success); background: rgba(16, 185, 129, 0.1);' : ''}">
        <span class="notice-repaired-icon">${isIncident ? '✅' : '🔧'}</span>
        <div class="notice-repaired-info">
          <span class="notice-repaired-label" style="${isIncident ? 'color: var(--clr-success);' : ''}">${label}</span>
          ${notice.repairNote ? `<span class="notice-repaired-note">${Utils.escapeHtml(notice.repairNote)}</span>` : ''}
          ${notice.repairPhoto ? `
            <div class="repair-photo-display" onclick="AssetsView.openLightbox('${notice.repairPhoto}', '${isJp ? '解決写真' : 'Resolution Photo'}')">
              <img class="repair-photo-thumb" src="${notice.repairPhoto}" alt="Resolution photo" />
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  function renderNotice(notice) {
    const cat    = NoticeStore.CATEGORIES[notice.category] || NoticeStore.CATEGORIES.info;
    const colour = NoticeService.avatarColour(notice.initials);
    const isDefect   = notice.category === 'defect';
    const isIncident = notice.category === 'incident';
    const isDefectOrIncident = isDefect || isIncident;
    const isRepaired = !!notice.repaired;
    const isJp = I18n.getLang() === 'jp';

    const catLabel = {
      'info': isJp ? '情報' : 'Info',
      'alert': isJp ? '警告' : 'Alert',
      'safety': isJp ? '安全' : 'Safety',
      'update': isJp ? '連絡' : 'Updates',
      'defect': isJp ? '異常' : 'Defect',
      'incident': isJp ? '突発異常' : 'Incident'
    }[notice.category] || cat.label;

    const repairBtn = isDefectOrIncident && !isRepaired
      ? `<button class="notice-repair-btn" onclick="NoticeView.openRepairForm('${notice.id}')" title="${isIncident ? I18n.t('btn_resolve_incident') : I18n.t('btn_mark_repaired')}">${isIncident ? I18n.t('btn_resolve_incident') : I18n.t('btn_mark_repaired')}</button>`
      : '';

    const formattedTime = new Date(notice.timestamp).toLocaleString(isJp ? 'ja-JP' : 'en-US');

    // Incident details badge
    let incidentDetailsHtml = '';
    if (isIncident && notice.incidentType) {
      const typeLabel = I18n.t(`inc_${notice.incidentType}`);
      const assetLabel = notice.assetName || (isJp ? '不明な設備' : 'Unknown Machine');
      incidentDetailsHtml = `
        <div class="notice-incident-details" style="display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: 6px; margin-bottom: 8px;">
          <span class="chip-incident-machine" style="background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); padding: 2px 8px; border-radius: var(--radius-sm); font-size: 11px; font-weight: 600;">
            ⚙️ ${assetLabel}
          </span>
          <span class="chip-incident-type" style="background: rgba(245, 158, 11, 0.12); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); padding: 2px 8px; border-radius: var(--radius-sm); font-size: 11px; font-weight: 600;">
            🚨 ${typeLabel}
          </span>
        </div>
      `;
    }

    // Dynamic warning class for unresolved incidents
    const incidentClass = isIncident && !isRepaired ? ' notice-card--incident-alert' : '';

    return `
      <article class="notice-card${incidentClass}" id="notice-${notice.id}">
        <div class="notice-avatar" style="background:${colour}" aria-hidden="true">
          ${notice.initials}
        </div>
        <div class="notice-body${isRepaired ? ' notice-body--repaired' : ''}">
          <div class="notice-meta">
            <span class="notice-author">${notice.author}</span>
            <span class="notice-time" title="${formattedTime}">
              ${NoticeService.relativeTime(notice.timestamp)}
            </span>
            <span class="notice-cat notice-cat--${notice.category}">
              ${cat.emoji} ${catLabel}
            </span>
            <button
              class="notice-delete-btn"
              onclick="NoticeView.deleteNotice('${notice.id}')"
              title="${isJp ? '投稿を削除' : 'Delete notice'}"
              aria-label="Delete notice"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </div>
          ${incidentDetailsHtml}
          <p class="notice-message">${Utils.escapeHtml(notice.message)}</p>
          ${notice.photo ? `
            <div class="notice-photo-wrapper" onclick="AssetsView.openLightbox('${notice.photo}', 'Defect Photo')">
              <img class="notice-photo-img" src="${notice.photo}" alt="Attached defect photo" />
            </div>
          ` : ''}
          ${renderRepairBanner(notice)}
          ${repairBtn}
          <div class="notice-repair-form" id="repair-form-${notice.id}" style="display:none;">
            <input id="repair-by-${notice.id}" class="repair-input" type="text" placeholder="${isIncident ? I18n.t('resolved_by_placeholder') : I18n.t('repair_by_placeholder')}" maxlength="40" />
            <textarea id="repair-note-${notice.id}" class="repair-textarea" placeholder="${isIncident ? I18n.t('resolution_notes_placeholder') : I18n.t('repair_notes_placeholder')}" rows="2" maxlength="300"></textarea>
            <div class="repair-photo-row">
              <span class="repair-photo-label">📷 ${isJp ? '写真を添付 (任意)' : 'Attach photo (optional)'}</span>
              <input type="file" id="repair-photo-${notice.id}" accept="image/*" style="display:none;"
                onchange="NoticeView.onRepairPhotoSelected('${notice.id}', this)">
              <div class="repair-photo-trigger" onclick="document.getElementById('repair-photo-${notice.id}').click()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span id="repair-photo-name-${notice.id}" class="repair-photo-placeholder">${isJp ? '写真を選択...' : 'Choose photo...'}</span>
              </div>
              <img id="repair-photo-preview-${notice.id}" class="repair-photo-preview" style="display:none;" alt="Preview" />
            </div>
            <div class="repair-actions">
              <button class="repair-cancel-btn" onclick="NoticeView.closeRepairForm('${notice.id}')">${I18n.t('cancel')}</button>
              <button class="repair-submit-btn" onclick="NoticeView.submitRepair('${notice.id}')">${isIncident ? I18n.t('confirm_resolve_incident') : I18n.t('confirm_repair')}</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  return {
    renderRepairBanner,
    renderNotice
  };

})();
