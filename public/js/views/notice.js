/**
 * views/notice.js — Notice Board view controller
 *
 * Renders a real-time-style scrollable post feed with a fixed compose bar.
 * Posts are persisted in localStorage via NoticeStore.
 *
 * Phase 2 / backend note:
 *  - Replace NoticeStore.post() with fetch('/api/notices', { method:'POST' })
 *  - Replace NoticeStore.getAll() with fetch('/api/notices')
 *  - Add polling or WebSocket for live updates from other users
 */

'use strict';

const NoticeView = (() => {

  // Remembered across the session so the user doesn't retype their name
  const AUTHOR_KEY = 'seibi_notice_author';

  let _activeFilter = 'all';
  let _searchQuery = '';
  let _allNotices = [];

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function _savedAuthor() {
    try { return localStorage.getItem(AUTHOR_KEY) || ''; } catch (_) { return ''; }
  }

  function _saveAuthor(name) {
    try { localStorage.setItem(AUTHOR_KEY, name); } catch (_) {}
  }




  function _renderFeed(notices) {
    const feed = document.getElementById('notice-feed');
    if (!feed) return;

    if (notices.length === 0) {
      feed.innerHTML = `
        <div class="notice-empty">
          <div class="notice-empty-icon">📣</div>
          <p>${I18n.t('notice_empty')}</p>
        </div>`;
      return;
    }

    // Newest last (chat-style chronological order)
    feed.innerHTML = notices.map(NoticeCard.renderNotice).join('');

    // Scroll to bottom so newest post is visible
    feed.scrollTop = feed.scrollHeight;
  }

  // ─── Compose bar ─────────────────────────────────────────────────────────

  function _renderCompose() {
    const panel = document.getElementById('view-notice');
    if (!panel) return;

    const savedAuthor = _savedAuthor();
    const isJp = I18n.getLang() === 'jp';

    const cats = Object.entries(NoticeStore.CATEGORIES)
      .filter(([key]) => key !== 'incident')
      .map(([key, val]) => {
        const label = {
          'info': isJp ? '情報' : 'Info',
          'alert': isJp ? '警告' : 'Alert',
          'safety': isJp ? '安全' : 'Safety',
          'update': isJp ? '連絡' : 'Updates',
          'defect': isJp ? '異常' : 'Defect'
        }[key] || val.label;
        return [key, { emoji: val.emoji, label }];
      });

    panel.innerHTML = `
      <div class="notice-view-inner">
        <!-- Search & Filter bar -->
        <div class="notice-toolbar" style="display: flex; flex-direction: column; gap: var(--space-3); margin-bottom: var(--space-3); background: var(--clr-surface-raised); border: 1px solid var(--clr-border); border-radius: var(--radius-md); padding: var(--space-3);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-2);">
            <div class="notice-search-wrap" style="flex: 1; max-width: 320px;">
              <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                id="notice-search-input"
                class="notice-search-input"
                type="text"
                placeholder="${isJp ? '掲示板を検索...' : 'Search notices...'}"
                oninput="NoticeView.onSearchInput(this.value)"
              />
            </div>
            <button class="cal-today-btn" style="background: linear-gradient(135deg, #ef4444, #b91c1c); color: #fff; border: none; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.25); display: flex; align-items: center; gap: var(--space-1); padding: 8px 16px; border-radius: var(--radius-md); font-weight: 600; cursor: pointer;" onclick="NoticeView.openIncidentModal()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
              ${I18n.t('btn_report_incident')}
            </button>
          </div>
          <div class="notice-filter-chips" role="group" aria-label="Filter notices by category">
            <button class="filter-chip active" data-filter="all" onclick="NoticeView.setCategoryFilter('all')">${isJp ? 'すべて' : 'All'}</button>
            <button class="filter-chip" data-filter="info" onclick="NoticeView.setCategoryFilter('info')">${isJp ? 'ℹ️ 情報' : 'ℹ️ Info'}</button>
            <button class="filter-chip" data-filter="alert" onclick="NoticeView.setCategoryFilter('alert')">${isJp ? '⚠️ 警告' : '⚠️ Alert'}</button>
            <button class="filter-chip" data-filter="safety" onclick="NoticeView.setCategoryFilter('safety')">${isJp ? '🛡️ 安全' : '🛡️ Safety'}</button>
            <button class="filter-chip" data-filter="update" onclick="NoticeView.setCategoryFilter('update')">${isJp ? '📢 連絡' : '📢 Updates'}</button>
            <button class="filter-chip" data-filter="defect" onclick="NoticeView.setCategoryFilter('defect')">${isJp ? '🔧 異常' : '🔧 Defects'}</button>
            <button class="filter-chip" data-filter="incident" onclick="NoticeView.setCategoryFilter('incident')">${isJp ? '🚨 突発異常' : '🚨 Incidents'}</button>
          </div>
        </div>

        <!-- Feed (scrollable) -->
        <div id="notice-feed" class="notice-feed" role="log" aria-live="polite" aria-label="Notice board feed"></div>

        <!-- Compose bar (fixed at bottom of view) -->
        <div class="notice-compose" id="notice-compose">

          <!-- Row 1: Author + Category -->
          <div class="compose-top-row">
            <input
              id="compose-author"
              class="compose-input compose-author"
              type="text"
              placeholder="${I18n.t('placeholder_name')}"
              value="${Utils.escapeAttr(savedAuthor)}"
              maxlength="40"
              aria-label="Your name"
            />
            <select id="compose-category" class="compose-select" aria-label="Category">
              ${cats.map(([key, val]) =>
                `<option value="${key}">${val.emoji} ${val.label}</option>`
              ).join('')}
            </select>
          </div>

          <!-- Row 2: Message + Post -->
          <div class="compose-bottom-row">
            <textarea
              id="compose-message"
              class="compose-textarea"
              placeholder="${I18n.t('placeholder_post')}"
              rows="2"
              maxlength="500"
              aria-label="Message"
            ></textarea>
            <button
              id="compose-post-btn"
              class="compose-post-btn"
              onclick="NoticeView.submitPost()"
              aria-label="Post notice"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>

        </div>
      </div>
    `;

    // Submit on Ctrl+Enter / Cmd+Enter inside textarea
    document.getElementById('compose-message').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        NoticeView.submitPost();
      }
    });
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  function submitPost() {
    const authorEl  = document.getElementById('compose-author');
    const catEl     = document.getElementById('compose-category');
    const msgEl     = document.getElementById('compose-message');
    const btn       = document.getElementById('compose-post-btn');

    const author   = authorEl.value.trim();
    const category = catEl.value;
    const message  = msgEl.value.trim();

    // Validation
    if (!author) {
      authorEl.focus();
      authorEl.classList.add('compose-input--error');
      setTimeout(() => authorEl.classList.remove('compose-input--error'), 1200);
      return;
    }
    if (!message) {
      msgEl.focus();
      msgEl.classList.add('compose-input--error');
      setTimeout(() => msgEl.classList.remove('compose-input--error'), 1200);
      return;
    }

    // Remember author name
    _saveAuthor(author);

    // Disable button while posting
    btn.disabled = true;

    NoticeStore.post({ author, category, message }).then((notice) => {
      msgEl.value = '';
      btn.disabled = false;
      refreshFeed();
      msgEl.focus();
    });
  }

  // ─── Delete notice ────────────────────────────────────────────────────────

  function deleteNotice(id) {
    if (!confirm(I18n.t('confirm_delete_notice'))) return;
    NoticeStore.deleteNotice(id).then(() => {
      const card = document.getElementById(`notice-${id}`);
      if (card) card.remove();
    });
  }

  // ─── Repair form ──────────────────────────────────────────────────────────

  function openRepairForm(id) {
    const form = document.getElementById(`repair-form-${id}`);
    if (form) {
      form.style.display = 'flex';
      const input = document.getElementById(`repair-by-${id}`);
      // Pre-fill name from saved notice author name if available
      if (input && !input.value) {
        input.value = localStorage.getItem('seibi_notice_author') || '';
      }
      if (input) input.focus();
    }
  }

  function closeRepairForm(id) {
    const form = document.getElementById(`repair-form-${id}`);
    if (form) form.style.display = 'none';
  }

  function onRepairPhotoSelected(id, input) {
    const file = input.files[0];
    if (!file) return;
    const nameEl  = document.getElementById(`repair-photo-name-${id}`);
    const preview = document.getElementById(`repair-photo-preview-${id}`);
    if (nameEl) nameEl.textContent = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (preview) {
        preview.src = e.target.result;
        preview.style.display = 'block';
      }
    };
    reader.readAsDataURL(file);
  }

  function submitRepair(id) {
    const byEl   = document.getElementById(`repair-by-${id}`);
    const noteEl = document.getElementById(`repair-note-${id}`);
    const repairedBy = byEl ? byEl.value.trim() : '';
    const repairNote = noteEl ? noteEl.value.trim() : '';

    if (!repairedBy) {
      byEl.classList.add('compose-input--error');
      setTimeout(() => byEl.classList.remove('compose-input--error'), 1200);
      byEl.focus();
      return;
    }

    const previewEl   = document.getElementById(`repair-photo-preview-${id}`);
    const repairPhoto  = (previewEl && previewEl.src && previewEl.src.startsWith('data:')) ? previewEl.src : null;

    NoticeStore.markRepaired(id, { repairedBy, repairNote, repairPhoto }).then(() => {
      refreshFeed();
    });
  }

  function _applyFilterAndRender() {
    const filtered = NoticeService.filterAndSearchNotices(_allNotices, _activeFilter, _searchQuery);
    _renderFeed(filtered);
  }

  function onSearchInput(val) {
    _searchQuery = val.trim();
    _applyFilterAndRender();
  }

  function setCategoryFilter(cat) {
    _activeFilter = cat;
    
    // Update active class on chips
    const container = document.querySelector('.notice-filter-chips');
    if (container) {
      container.querySelectorAll('.filter-chip').forEach(btn => {
        const isActive = btn.dataset.filter === cat;
        btn.classList.toggle('active', isActive);
      });
    }

    _applyFilterAndRender();
  }

  function refreshFeed() {
    NoticeStore.getAll().then(notices => {
      _allNotices = notices;
      _applyFilterAndRender();
    });
  }

  function openIncidentModal(preSelectedAssetId = null) {
    const existing = document.getElementById('incident-report-modal');
    if (existing) existing.remove();

    const isJp = I18n.getLang() === 'jp';
    
    AssetStore.getAll().then(assets => {
      const activeAssets = assets.filter(a => a.status !== 'decommissioned');
      
      const now = new Date();
      const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

      const modal = document.createElement('div');
      modal.id = 'incident-report-modal';
      modal.className = 'inspection-modal-backdrop';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', I18n.t('modal_report_incident'));

      const incidentTypes = [
        { value: 'stoppage', label: I18n.t('inc_stoppage') },
        { value: 'spark',    label: I18n.t('inc_spark') },
        { value: 'noise',    label: I18n.t('inc_noise') },
        { value: 'leak',     label: I18n.t('inc_leak') },
        { value: 'overheat', label: I18n.t('inc_overheat') },
        { value: 'other',    label: I18n.t('inc_other') }
      ];

      modal.innerHTML = `
        <div class="inspection-modal-panel" style="max-width: 500px;">
          <header class="inspection-modal-header">
            <h2 class="inspection-modal-title">${I18n.t('modal_report_incident')}</h2>
            <button class="inspection-modal-close" onclick="NoticeView.closeIncidentModal()" aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </header>
          <form onsubmit="NoticeView.submitIncident(event)">
            <div class="inspection-modal-body" style="display: flex; flex-direction: column; gap: var(--space-4);">
              <div class="form-group" style="display: flex; flex-direction: column; gap: var(--space-1);">
                <label class="inspector-input-label" for="inc-reporter">${I18n.t('placeholder_name')} *</label>
                <input type="text" id="inc-reporter" required class="inspector-input" value="${Utils.escapeAttr(_savedAuthor())}" placeholder="${I18n.t('placeholder_name')}" maxlength="40">
              </div>
              <div class="form-group" style="display: flex; flex-direction: column; gap: var(--space-1);">
                <label class="inspector-input-label" for="inc-machine">${I18n.t('label_machine')}</label>
                <select id="inc-machine" required class="form-select" style="width: 100%;" onchange="NoticeView.onMachineSelectChange(this)">
                  <option value="" disabled ${!preSelectedAssetId ? 'selected' : ''}>-- ${isJp ? '設備を選択してください' : 'Select Equipment'} --</option>
                  ${activeAssets.map(a => `
                    <option value="${a.id}" ${preSelectedAssetId === a.id ? 'selected' : ''}>${a.name} (${a.location})</option>
                  `).join('')}
                  <option value="custom" ${preSelectedAssetId === 'custom' ? 'selected' : ''}>-- ${isJp ? 'その他（直接入力）' : 'Other (Custom Input)'} --</option>
                </select>
              </div>
              <div class="form-group" id="inc-custom-machine-container" style="display: ${preSelectedAssetId === 'custom' ? 'flex' : 'none'}; flex-direction: column; gap: var(--space-1);">
                <label class="inspector-input-label" for="inc-custom-machine">${isJp ? '設備名（直接入力） *' : 'Custom Machine Name *'}</label>
                <input type="text" id="inc-custom-machine" class="inspector-input" placeholder="${isJp ? '設備名を入力してください' : 'Enter machine name'}" maxlength="100" ${preSelectedAssetId === 'custom' ? 'required' : ''}>
              </div>
              <div class="inspector-sign-bar" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); border: none; padding: 0; background: none;">
                <div class="form-group" style="display: flex; flex-direction: column; gap: var(--space-1);">
                  <label class="inspector-input-label" for="inc-type">${I18n.t('label_incident_type')}</label>
                  <select id="inc-type" required class="form-select" style="width: 100%;">
                    ${incidentTypes.map(t => `
                      <option value="${t.value}">${t.label}</option>
                    `).join('')}
                  </select>
                </div>
                <div class="form-group" style="display: flex; flex-direction: column; gap: var(--space-1);">
                  <label class="inspector-input-label" for="inc-time">${I18n.t('label_incident_time')}</label>
                  <input type="datetime-local" id="inc-time" required class="inspector-input" value="${localISO}">
                </div>
              </div>
              <div class="form-group" style="display: flex; flex-direction: column; gap: var(--space-1);">
                <label class="inspector-input-label" for="inc-notes">${isJp ? '詳細・状況メモ *' : 'Details / Notes *'}</label>
                <textarea id="inc-notes" required class="fail-notes-input" style="min-height: 80px;" placeholder="${I18n.t('placeholder_incident_notes')}" maxlength="400"></textarea>
              </div>
              <div class="form-group" style="display: flex; flex-direction: column; gap: var(--space-1);">
                <span class="inspector-input-label">📷 ${isJp ? '写真を添付 (任意)' : 'Attach photo (optional)'}</span>
                <input type="file" id="inc-photo" accept="image/*" style="display:none;"
                  onchange="NoticeView.onIncidentPhotoSelected(this)">
                <div class="repair-photo-trigger" onclick="document.getElementById('inc-photo').click()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span id="inc-photo-name" class="repair-photo-placeholder">${isJp ? '写真を選択...' : 'Choose photo...'}</span>
                </div>
                <img id="inc-photo-preview" class="repair-photo-preview" style="display:none; margin-top: 5px;" alt="Preview" />
              </div>
            </div>
            <footer class="inspection-modal-footer" style="padding: var(--space-4); border-top: 1px solid var(--clr-border); display: flex; justify-content: flex-end; gap: var(--space-3); background: var(--clr-surface);">
              <button type="button" class="btn-cancel" onclick="NoticeView.closeIncidentModal()">${I18n.t('cancel')}</button>
              <button type="submit" class="btn-submit" style="background: linear-gradient(135deg, #ef4444, #b91c1c); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3); border: none;">${I18n.t('btn_submit_incident')}</button>
            </footer>
          </form>
        </div>
      `;

      document.getElementById('app-shell').appendChild(modal);
    });
  }

  function closeIncidentModal() {
    const modal = document.getElementById('incident-report-modal');
    if (modal) modal.remove();
  }

  function onMachineSelectChange(select) {
    const customContainer = document.getElementById('inc-custom-machine-container');
    const customInput = document.getElementById('inc-custom-machine');
    if (!customContainer || !customInput) return;
    
    if (select.value === 'custom') {
      customContainer.style.display = 'flex';
      customInput.required = true;
      customInput.focus();
    } else {
      customContainer.style.display = 'none';
      customInput.required = false;
      customInput.value = '';
    }
  }

  function onIncidentPhotoSelected(input) {
    const file = input.files[0];
    if (!file) return;
    const nameEl  = document.getElementById('inc-photo-name');
    const preview = document.getElementById('inc-photo-preview');
    if (nameEl) nameEl.textContent = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (preview) {
        preview.src = e.target.result;
        preview.style.display = 'block';
      }
    };
    reader.readAsDataURL(file);
  }

  function submitIncident(event) {
    event.preventDefault();
    const reporterEl = document.getElementById('inc-reporter');
    const machineEl = document.getElementById('inc-machine');
    const typeEl = document.getElementById('inc-type');
    const timeEl = document.getElementById('inc-time');
    const notesEl = document.getElementById('inc-notes');
    const customMachineEl = document.getElementById('inc-custom-machine');
    const previewEl = document.getElementById('inc-photo-preview');

    const author = reporterEl ? reporterEl.value.trim() : '';
    const assetId = machineEl ? machineEl.value : '';
    const incidentType = typeEl ? typeEl.value : '';
    const message = notesEl ? notesEl.value.trim() : '';
    const photo = (previewEl && previewEl.src && previewEl.src.startsWith('data:')) ? previewEl.src : null;
    
    let timeVal = timeEl ? timeEl.value : '';
    let occurrenceTime = '';
    if (timeVal) {
      try {
        occurrenceTime = new Date(timeVal).toISOString();
      } catch (_) {}
    }
    if (!occurrenceTime) {
      occurrenceTime = new Date().toISOString();
    }

    // Validation
    let isValid = true;
    if (!author) {
      reporterEl.classList.add('compose-input--error');
      setTimeout(() => reporterEl.classList.remove('compose-input--error'), 1200);
      reporterEl.focus();
      isValid = false;
    }
    if (!assetId) {
      machineEl.classList.add('compose-input--error');
      setTimeout(() => machineEl.classList.remove('compose-input--error'), 1200);
      machineEl.focus();
      isValid = false;
    }
    if (assetId === 'custom') {
      const customName = customMachineEl ? customMachineEl.value.trim() : '';
      if (!customName) {
        customMachineEl.classList.add('compose-input--error');
        setTimeout(() => customMachineEl.classList.remove('compose-input--error'), 1200);
        customMachineEl.focus();
        isValid = false;
      }
    }
    if (!incidentType) {
      typeEl.classList.add('compose-input--error');
      setTimeout(() => typeEl.classList.remove('compose-input--error'), 1200);
      typeEl.focus();
      isValid = false;
    }
    if (!message) {
      notesEl.classList.add('compose-input--error');
      setTimeout(() => notesEl.classList.remove('compose-input--error'), 1200);
      notesEl.focus();
      isValid = false;
    }

    if (!isValid) return;

    _saveAuthor(author);

    let postPromise;
    if (assetId === 'custom') {
      const customName = customMachineEl.value.trim();
      postPromise = NoticeStore.post({
        author,
        category: 'incident',
        message,
        assetId: null,
        assetName: customName,
        incidentType,
        occurrenceTime,
        photo
      });
    } else {
      postPromise = AssetStore.getById(assetId).then(asset => {
        const assetName = asset ? asset.name : 'Unknown Equipment';
        return NoticeStore.post({
          author,
          category: 'incident',
          message,
          assetId,
          assetName,
          incidentType,
          occurrenceTime,
          photo
        });
      });
    }

    postPromise.then(() => {
      closeIncidentModal();
      setCategoryFilter('incident');
      refreshFeed();
      
      if (typeof HomeView !== 'undefined') HomeView.refresh();
      if (typeof AssetsView !== 'undefined') AssetsView.refresh();
    }).catch(err => {
      console.error('Failed to submit incident:', err);
    });
  }

  function openRepairModal(noticeId) {
    const existing = document.getElementById('repair-modal');
    if (existing) existing.remove();

    const isJp = I18n.getLang() === 'jp';
    
    NoticeStore.getAll().then(notices => {
      const notice = notices.find(n => n.id === noticeId);
      if (!notice) return;

      const modal = document.createElement('div');
      modal.id = 'repair-modal';
      modal.className = 'inspection-modal-backdrop';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', notice.category === 'incident' ? I18n.t('modal_report_incident') : I18n.t('btn_mark_repaired'));

      const categoryLabel = notice.category === 'incident'
        ? (isJp ? '突発異常' : 'Incident')
        : (isJp ? '異常検知' : 'Defect');

      const title = notice.category === 'incident'
        ? I18n.t('btn_resolve_incident')
        : I18n.t('btn_mark_repaired');

      modal.innerHTML = `
        <div class="inspection-modal-panel" style="max-width: 500px;">
          <header class="inspection-modal-header">
            <h2 class="inspection-modal-title">${title}</h2>
            <button class="inspection-modal-close" onclick="document.getElementById('repair-modal').remove()" aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </header>
          <form onsubmit="NoticeView.submitRepairModal(event, '${notice.id}')">
            <div class="inspection-modal-body" style="display: flex; flex-direction: column; gap: var(--space-3);">
              
              <!-- Incident Details Card -->
              <div style="background: var(--clr-surface-raised); border: 1px solid var(--clr-border); border-radius: var(--radius-sm); padding: var(--space-3); display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-2);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: 600; font-size: 13px; color: var(--clr-text-primary);">${categoryLabel} details:</span>
                  <span style="font-size: 11px; color: var(--clr-text-secondary);">${new Date(notice.timestamp).toLocaleString(isJp ? 'ja-JP' : 'en-US')}</span>
                </div>
                <div style="font-size: 13px; line-height: 1.5; color: var(--clr-text-secondary); word-break: break-word;">
                  ${Utils.escapeHtml(notice.message)}
                </div>
                ${notice.photo ? `
                  <div class="notice-photo-wrapper" style="margin-top: 5px; max-width: 150px; max-height: 112px;" onclick="AssetsView.openLightbox('${notice.photo}', 'Report Photo')">
                    <img class="notice-photo-img" src="${notice.photo}" alt="Report photo" />
                  </div>
                ` : ''}
              </div>

              <!-- Form Inputs -->
              <div class="form-group" style="display: flex; flex-direction: column; gap: var(--space-1);">
                <label class="inspector-input-label" for="modal-repair-by">${notice.category === 'incident' ? I18n.t('resolved_by_placeholder') : I18n.t('repair_by_placeholder')} *</label>
                <input type="text" id="modal-repair-by" required class="inspector-input" placeholder="${notice.category === 'incident' ? I18n.t('resolved_by_placeholder') : I18n.t('repair_by_placeholder')}" maxlength="40">
              </div>
              
              <div class="form-group" style="display: flex; flex-direction: column; gap: var(--space-1);">
                <label class="inspector-input-label" for="modal-repair-note">${notice.category === 'incident' ? I18n.t('resolution_notes_placeholder') : I18n.t('repair_notes_placeholder')} *</label>
                <textarea id="modal-repair-note" required class="fail-notes-input" style="min-height: 80px;" placeholder="${notice.category === 'incident' ? I18n.t('resolution_notes_placeholder') : I18n.t('repair_notes_placeholder')}" maxlength="300"></textarea>
              </div>

              <div class="form-group" style="display: flex; flex-direction: column; gap: var(--space-1);">
                <span class="inspector-input-label">📷 ${isJp ? '写真を添付 (任意)' : 'Attach photo (optional)'}</span>
                <input type="file" id="modal-repair-photo" accept="image/*" style="display:none;"
                  onchange="NoticeView.onModalRepairPhotoSelected(this)">
                <div class="repair-photo-trigger" onclick="document.getElementById('modal-repair-photo').click()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span id="modal-repair-photo-name" class="repair-photo-placeholder">${isJp ? '写真を選択...' : 'Choose photo...'}</span>
                </div>
                <img id="modal-repair-photo-preview" class="repair-photo-preview" style="display:none; margin-top: 5px;" alt="Preview" />
              </div>

            </div>
            <footer class="inspection-modal-footer" style="padding: var(--space-4); border-top: 1px solid var(--clr-border); display: flex; justify-content: flex-end; gap: var(--space-3); background: var(--clr-surface);">
              <button type="button" class="btn-cancel" onclick="document.getElementById('repair-modal').remove()">${I18n.t('cancel')}</button>
              <button type="submit" class="btn-submit" style="background: linear-gradient(135deg, #10b981, #047857); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); border: none;">${notice.category === 'incident' ? I18n.t('confirm_resolve_incident') : I18n.t('confirm_repair')}</button>
            </footer>
          </form>
        </div>
      `;

      document.getElementById('app-shell').appendChild(modal);
      
      // Focus on repair-by field and prefill if author exists
      const byEl = document.getElementById('modal-repair-by');
      if (byEl) {
        byEl.value = localStorage.getItem('seibi_notice_author') || '';
        byEl.focus();
      }
    });
  }

  function onModalRepairPhotoSelected(input) {
    const file = input.files[0];
    if (!file) return;
    const nameEl  = document.getElementById('modal-repair-photo-name');
    const preview = document.getElementById('modal-repair-photo-preview');
    if (nameEl) nameEl.textContent = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (preview) {
        preview.src = e.target.result;
        preview.style.display = 'block';
      }
    };
    reader.readAsDataURL(file);
  }

  function submitRepairModal(event, noticeId) {
    event.preventDefault();
    const byEl = document.getElementById('modal-repair-by');
    const noteEl = document.getElementById('modal-repair-note');
    const previewEl = document.getElementById('modal-repair-photo-preview');

    const repairedBy = byEl ? byEl.value.trim() : '';
    const repairNote = noteEl ? noteEl.value.trim() : '';
    const repairPhoto = (previewEl && previewEl.src && previewEl.src.startsWith('data:')) ? previewEl.src : null;

    if (!repairedBy) {
      byEl.classList.add('compose-input--error');
      setTimeout(() => byEl.classList.remove('compose-input--error'), 1200);
      byEl.focus();
      return;
    }
    if (!repairNote) {
      noteEl.classList.add('compose-input--error');
      setTimeout(() => noteEl.classList.remove('compose-input--error'), 1200);
      noteEl.focus();
      return;
    }

    _saveAuthor(repairedBy);

    NoticeStore.markRepaired(noticeId, { repairedBy, repairNote, repairPhoto }).then(() => {
      const modal = document.getElementById('repair-modal');
      if (modal) modal.remove();
      refreshFeed();
    });
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    _renderCompose();

    NoticeStore.getAll().then(notices => {
      _allNotices = notices;
      _applyFilterAndRender();
    });
  }

  return { init, submitPost, deleteNotice, openRepairForm, closeRepairForm, onRepairPhotoSelected, submitRepair, refreshFeed, onSearchInput, setCategoryFilter, openIncidentModal, closeIncidentModal, submitIncident, onMachineSelectChange, onIncidentPhotoSelected, openRepairModal, onModalRepairPhotoSelected, submitRepairModal };

})();
