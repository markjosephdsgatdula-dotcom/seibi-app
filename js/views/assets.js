/**
 * views/assets.js — Asset Management, Registration & Checksheet Builder controller
 */

'use strict';

const AssetsView = (() => {

  const INSPECTOR_KEY = 'seibi_inspector_name';

  // In-memory state for the active inspection
  let _activeAsset = null;
  let _checklistState = []; // Array of { itemId, status: 'pass'|'fail'|null, notes: string }
  let _template = [];

  // In-memory state for new asset registration
  let _newAssetForm = {
    name: '',
    model: '',
    location: '',
    type: 'CO2_MAG',
    dueDate: '',
    templateId: 'template-co2-mag',
    customTemplateName: '',
    customTemplateItems: []
  };

  // Get saved inspector name
  function _savedInspector() {
    try {
      return localStorage.getItem(INSPECTOR_KEY) || '';
    } catch (_) {
      return '';
    }
  }

  function _saveInspector(name) {
    try {
      localStorage.setItem(INSPECTOR_KEY, name);
    } catch (_) {}
  }

  // ─── Render Asset List ───────────────────────────────────────────────────

  function _statusBadge(status) {
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

  function _renderCard(asset) {
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
            <div>
              <h3 class="asset-name">${asset.name}</h3>
              <span class="asset-model">${asset.model}</span>
            </div>
            ${_statusBadge(asset.status)}
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
        </div>
      </article>
    `;
  }

  function _renderList(assets) {
    const container = document.getElementById('assets-container');
    if (!container) return;

    const active = assets.filter(a => a.status !== 'decommissioned');
    const offline = assets.filter(a => a.status === 'decommissioned');

    const robots = active.filter(a => a.type === 'CO2_MAG' || a.type === 'TIG');
    const regulators = active.filter(a => a.type === 'REGULATOR');
    const tools = active.filter(a => a.type === 'GRINDER' || a.type === 'BELT_GRINDER' || a.type === 'SANDER');

    container.innerHTML = `
      <!-- Top Action Bar -->
      <div class="assets-actions-bar">
        <button class="asset-btn-primary" onclick="AssetsView.openRegisterModal()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          ${I18n.t('btn_register_machine')}
        </button>
      </div>

      <!-- Welding Robots Section -->
      ${robots.length > 0 ? `
        <div class="assets-section">
          <h2 class="assets-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
            ${I18n.t('section_active_robots')} (${robots.length})
          </h2>
          <div class="asset-grid">
            ${robots.map(_renderCard).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Gas Regulators Section -->
      ${regulators.length > 0 ? `
        <div class="assets-section" style="margin-top: 32px;">
          <h2 class="assets-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 12L16 8M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
            ${I18n.t('section_active_regulators')} (${regulators.length})
          </h2>
          <div class="asset-grid">
            ${regulators.map(_renderCard).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Grinders & Sanders Section -->
      ${tools.length > 0 ? `
        <div class="assets-section" style="margin-top: 32px;">
          <h2 class="assets-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            ${I18n.t('section_active_tools')} (${tools.length})
          </h2>
          <div class="asset-grid">
            ${tools.map(_renderCard).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Inactive / Offline Section -->
      <div class="assets-section" style="margin-top: 32px;">
        <h2 class="assets-section-title" style="color: var(--clr-text-disabled);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><rect x="2" y="7" width="20" height="14" rx="2" stroke="var(--clr-text-disabled)"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="var(--clr-text-disabled)"/></svg>
          ${I18n.t('section_inactive_robots')} (${offline.length})
        </h2>
        <div class="asset-grid">
          ${offline.map(_renderCard).join('')}
        </div>
      </div>
    `;
  }

  // ─── Registration Modal & Template Builder ──────────────────────────────

  let _availableTemplates = [];

  function openRegisterModal() {
    // Reset form state
    _newAssetForm = {
      name: '',
      model: '',
      location: '',
      type: 'CO2_MAG',
      dueDate: '',
      templateId: 'template-co2-mag',
      customTemplateName: '',
      customTemplateItems: []
    };

    // Load dynamic templates first, then pre-populate custom checklist row items
    Promise.all([
      AssetStore.getTemplates(),
      AssetStore.getChecklistTemplate(11)
    ]).then(([templates, defaultItems]) => {
      _availableTemplates = templates;
      _newAssetForm.customTemplateItems = defaultItems.map(item => ({
        title: item.title,
        desc: item.desc,
        freq: item.freq,
        image: item.image
      }));
      _renderRegisterModal();
    });
  }

  function _renderRegisterModal() {
    const existing = document.getElementById('register-modal');
    if (existing) existing.remove();

    const isJp = I18n.getLang() === 'jp';

    const modal = document.createElement('div');
    modal.id = 'register-modal';
    modal.className = 'inspection-modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', isJp ? '新規設備登録' : 'Register New Machine');

    const showBuilder = _newAssetForm.templateId === 'custom';

    modal.innerHTML = `
      <div class="inspection-modal-panel" style="max-width: 620px;">
        <!-- Header -->
        <header class="inspection-modal-header">
          <h2 class="inspection-modal-title">${isJp ? '新規設備登録' : 'Register Machine'}</h2>
          <button class="inspection-modal-close" onclick="AssetsView.closeRegisterModal()" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </header>

        <!-- Body -->
        <div class="inspection-modal-body">
          <div class="register-form-grid">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
              <div class="form-group">
                <label class="inspector-input-label" for="reg-name">${isJp ? '設備名 (Machine Name) *' : 'Machine Name *'}</label>
                <input id="reg-name" class="inspector-input" type="text" placeholder="e.g. Welding Robot #7" value="${_newAssetForm.name}" oninput="AssetsView.onRegFormChange('name', this.value)" />
              </div>

              <div class="form-group">
                <label class="inspector-input-label" for="reg-model">${isJp ? '設備呼称/型式 (Model) *' : 'Model *'}</label>
                <input id="reg-model" class="inspector-input" type="text" placeholder="e.g. DAIHEN DP-350" value="${_newAssetForm.model}" oninput="AssetsView.onRegFormChange('model', this.value)" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
              <div class="form-group">
                <label class="inspector-input-label" for="reg-location">${isJp ? '配置場所 (Location) *' : 'Location *'}</label>
                <input id="reg-location" class="inspector-input" type="text" placeholder="e.g. Bay C" value="${_newAssetForm.location}" oninput="AssetsView.onRegFormChange('location', this.value)" />
              </div>

              <div class="form-group">
                <label class="inspector-input-label" for="reg-type">${isJp ? '設備分類 (Machine Type) *' : 'Machine Type *'}</label>
                <select id="reg-type" class="form-select" onchange="AssetsView.onRegFormChange('type', this.value)">
                  <option value="CO2_MAG" ${_newAssetForm.type === 'CO2_MAG' ? 'selected' : ''}>${I18n.t('type_co2_mag')}</option>
                  <option value="TIG" ${_newAssetForm.type === 'TIG' ? 'selected' : ''}>${I18n.t('type_tig')}</option>
                  <option value="REGULATOR" ${_newAssetForm.type === 'REGULATOR' ? 'selected' : ''}>${I18n.t('type_regulator')}</option>
                  <option value="GRINDER" ${_newAssetForm.type === 'GRINDER' ? 'selected' : ''}>${I18n.t('type_grinder')}</option>
                  <option value="BELT_GRINDER" ${_newAssetForm.type === 'BELT_GRINDER' ? 'selected' : ''}>${I18n.t('type_belt_grinder')}</option>
                  <option value="SANDER" ${_newAssetForm.type === 'SANDER' ? 'selected' : ''}>${I18n.t('type_sander')}</option>
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
              <div class="form-group">
                <label class="inspector-input-label" for="reg-duedate">${isJp ? '次回点検日 (Due Date) *' : 'Next Inspection Due Date *'}</label>
                <input id="reg-duedate" class="inspector-input" type="date" value="${_newAssetForm.dueDate}" onchange="AssetsView.onRegFormChange('dueDate', this.value)" />
              </div>

              <div class="form-group">
                <label class="inspector-input-label" for="reg-template">${isJp ? '点検チェックシートのテンプレート *' : 'Inspection Sheet Template *'}</label>
                <select id="reg-template" class="form-select" onchange="AssetsView.onRegTemplateSelect(this.value)">
                  ${_availableTemplates.map(tpl => {
                    let displayName = tpl.name;
                    if (tpl.id === 'template-co2-mag') {
                      displayName = isJp ? `溶接ロボット用テンプレート (${tpl.items.length}項目)` : `CO2/MAG Robots Template (${tpl.items.length} items)`;
                    } else if (tpl.id === 'template-regulator') {
                      displayName = isJp ? `ガス調整器用テンプレート (${tpl.items.length}項目)` : `Gas Regulators Template (${tpl.items.length} items)`;
                    } else if (tpl.id === 'template-grinder') {
                      displayName = isJp ? `グラインダー・サンダー用テンプレート (${tpl.items.length}項目)` : `Grinders & Sanders Template (${tpl.items.length} items)`;
                    }
                    return `<option value="${tpl.id}" ${_newAssetForm.templateId === tpl.id ? 'selected' : ''}>${displayName}</option>`;
                  }).join('')}
                  <option value="custom" ${_newAssetForm.templateId === 'custom' ? 'selected' : ''}>${isJp ? 'カスタムチェックシートの作成...' : 'Create Custom Checksheet...'}</option>
                </select>
              </div>
            </div>

            <!-- Dynamic Checklist Builder Panel -->
            ${showBuilder ? `
              <div class="template-builder-container" id="template-builder">
                <h3 class="template-builder-title">Customize Inspection Sheet Items</h3>
                <div class="form-group" style="margin-bottom: 8px;">
                  <label class="inspector-input-label" for="reg-custom-tpl-name">Checklist Name *</label>
                  <input id="reg-custom-tpl-name" class="inspector-input" type="text" placeholder="e.g. Robot 7 Checklist" value="${_newAssetForm.customTemplateName}" oninput="AssetsView.onRegFormChange('customTemplateName', this.value)" />
                </div>
                
                <!-- Items list -->
                <div class="template-items-editor" id="template-items-editor">
                  ${_newAssetForm.customTemplateItems.map((item, idx) => `
                    <div class="editor-row" id="editor-row-${idx}">
                      <span class="editor-num">${idx + 1}</span>
                      <input class="editor-input" type="text" placeholder="Title" value="${_escapeHtml(item.title)}" oninput="AssetsView.onEditRowItem(${idx}, 'title', this.value)" />
                      <input class="editor-input" type="text" placeholder="Description" value="${_escapeHtml(item.desc)}" oninput="AssetsView.onEditRowItem(${idx}, 'desc', this.value)" />
                      <select class="form-select" style="min-height:30px; padding:2px;" onchange="AssetsView.onEditRowItem(${idx}, 'freq', this.value)">
                        <option value="monthly" ${item.freq === 'monthly' ? 'selected' : ''}>Monthly</option>
                        <option value="semi-annual" ${item.freq === 'semi-annual' ? 'selected' : ''}>Semi-Ann</option>
                        <option value="annual" ${item.freq === 'annual' ? 'selected' : ''}>Annual</option>
                      </select>
                      ${_renderImageSelector(item.image, 'AssetsView.onRegImageSelectChange', 'AssetsView.onRegImageCustomInputChange', idx)}
                      <button class="btn-delete-row" onclick="AssetsView.onDeleteRowItem(${idx})" aria-label="Delete item ${idx + 1}">
                        ✕
                      </button>
                    </div>
                  `).join('')}
                </div>

                <button class="btn-add-row" onclick="AssetsView.onAddRowItem()">
                  ＋ Add Checklist Item
                </button>
              </div>
            ` : ''}

          </div>
        </div>

        <!-- Footer -->
        <footer class="inspection-modal-footer">
          <button class="btn-cancel" onclick="AssetsView.closeRegisterModal()">Cancel</button>
          <button id="btn-submit-registration" class="btn-submit" onclick="AssetsView.submitRegistration()" disabled>
            Register Machine
          </button>
        </footer>
      </div>
    `;

    document.getElementById('app-shell').appendChild(modal);
    _validateRegForm();
  }

  function onRegFormChange(key, value) {
    _newAssetForm[key] = value;
    _validateRegForm();
  }

  function onRegTemplateSelect(value) {
    _newAssetForm.templateId = value;
    if (value === 'custom' && _newAssetForm.customTemplateName === '') {
      _newAssetForm.customTemplateName = _newAssetForm.name ? `${_newAssetForm.name} Checklist` : 'Custom Robot Checklist';
    }
    // Re-render to show/hide template builder
    _renderRegisterModal();
  }

  // Builder row callbacks
  function onEditRowItem(index, key, value) {
    if (_newAssetForm.customTemplateItems[index]) {
      _newAssetForm.customTemplateItems[index][key] = value;
    }
    _validateRegForm();
  }

  function onAddRowItem() {
    _newAssetForm.customTemplateItems.push({
      title: '',
      desc: '',
      freq: 'monthly',
      image: 'generic-check.png'
    });
    _renderRegisterModal();
  }

  function onDeleteRowItem(index) {
    _newAssetForm.customTemplateItems.splice(index, 1);
    _renderRegisterModal();
  }

  function _validateRegForm() {
    let isValid = _newAssetForm.name.trim().length > 0 &&
                  _newAssetForm.model.trim().length > 0 &&
                  _newAssetForm.location.trim().length > 0 &&
                  _newAssetForm.dueDate.length > 0;

    if (_newAssetForm.templateId === 'custom') {
      const nameValid = _newAssetForm.customTemplateName.trim().length > 0;
      const itemsValid = _newAssetForm.customTemplateItems.length > 0 &&
                          _newAssetForm.customTemplateItems.every(item => item.title.trim().length > 0);
      isValid = isValid && nameValid && itemsValid;
    }

    const submitBtn = document.getElementById('btn-submit-registration');
    if (submitBtn) {
      submitBtn.disabled = !isValid;
    }
  }

  function closeRegisterModal() {
    const modal = document.getElementById('register-modal');
    if (modal) modal.remove();
  }

  function submitRegistration() {
    AssetStore.register(_newAssetForm).then((newAsset) => {
      closeRegisterModal();
      refresh();

      if (typeof HomeView !== 'undefined') HomeView.refresh();
      if (typeof CalendarView !== 'undefined') CalendarView.init();

      const msg = I18n.getLang() === 'jp'
        ? `${newAsset.name} を登録しました`
        : `Registered ${newAsset.name}`;
      _showSuccessBanner(msg);
    });
  }

  // ─── Image Path Resolution Helper ─────────────────────────────────────────

  function _resolveImagePath(imageName) {
    if (!imageName || imageName === 'generic-check.png') return null;
    if (/^image\d+\.jpeg$/.test(imageName)) {
      return `images/reference/${imageName}`;
    }
    return imageName;
  }

  // ─── Image Selector Render Helper ─────────────────────────────────────────

  function _renderImageSelector(imageValue, onchangeSelect, onchangeCustomInput, index) {
    const standardOptions = [
      'generic-check.png',
      'image1.jpeg',
      'image2.jpeg',
      'image3.jpeg',
      'image4.jpeg',
      'image5.jpeg',
      'image6.jpeg',
      'image7.jpeg',
      'image8.jpeg',
      'image9.jpeg',
      'image10.jpeg',
      'image11.jpeg',
      'image12.jpeg'
    ];

    const optionLabels = {
      'generic-check.png': 'Default Icon',
      'image1.jpeg': 'Excel Image 1 (Clean rear filter)',
      'image2.jpeg': 'Excel Image 2 (Gas pressure needle)',
      'image3.jpeg': 'Excel Image 3 (Abnormal sounds)',
      'image4.jpeg': 'Excel Image 4 (Emergency stop)',
      'image5.jpeg': 'Excel Image 5 (Electrical wiring)',
      'image6.jpeg': 'Excel Image 6 (Gas button test)',
      'image7.jpeg': 'Excel Image 7 (Torch nozzle & tip)',
      'image8.jpeg': 'Excel Image 8 (Gas leak & flow)',
      'image9.jpeg': 'Excel Image 9 (Clean feeding rollers)',
      'image10.jpeg': 'Excel Image 10 (Robot alignment)',
      'image11.jpeg': 'Excel Image 11 (Clean conduit hose)',
      'image12.jpeg': 'Excel Image 12 (Blow air inside)'
    };

    const isStandard = standardOptions.includes(imageValue);
    const selectedOption = isStandard ? imageValue : 'custom';
    const customValue = isStandard ? '' : imageValue;

    return `
      <div class="image-select-wrapper">
        <select class="form-select" style="min-height:30px; padding:2px;" onchange="${onchangeSelect}(${index}, this.value)">
          ${standardOptions.map(opt => `
            <option value="${opt}" ${selectedOption === opt ? 'selected' : ''}>${optionLabels[opt] || opt}</option>
          `).join('')}
          <option value="custom" ${selectedOption === 'custom' ? 'selected' : ''}>Custom Path/URL</option>
        </select>
        <input 
          type="text" 
          class="editor-input" 
          placeholder="e.g. image1.jpeg" 
          style="display: ${selectedOption === 'custom' ? 'block' : 'none'}; min-height: 24px; padding: 2px 6px; font-size: 11px;"
          value="${_escapeHtml(customValue)}"
          oninput="${onchangeCustomInput}(${index}, this.value)"
        />
      </div>
    `;
  }

  // Helper callbacks for Registration Modal Image Picker
  function onRegImageSelectChange(index, value) {
    if (value === 'custom') {
      const input = document.querySelector(`#register-modal #editor-row-${index} .image-select-wrapper input`);
      if (input) {
        input.style.display = 'block';
        _newAssetForm.customTemplateItems[index].image = input.value.trim() || 'generic-check.png';
      }
    } else {
      const input = document.querySelector(`#register-modal #editor-row-${index} .image-select-wrapper input`);
      if (input) input.style.display = 'none';
      _newAssetForm.customTemplateItems[index].image = value;
    }
    _validateRegForm();
  }

  function onRegImageCustomInputChange(index, value) {
    _newAssetForm.customTemplateItems[index].image = value.trim() || 'generic-check.png';
    _validateRegForm();
  }

  // Helper callbacks for Edit Modal Image Picker
  function onEditImageSelectChange(index, value) {
    if (value === 'custom') {
      const input = document.querySelector(`#edit-asset-modal #editor-row-${index} .image-select-wrapper input`);
      if (input) {
        input.style.display = 'block';
        _editForm.items[index].image = input.value.trim() || 'generic-check.png';
      }
    } else {
      const input = document.querySelector(`#edit-asset-modal #editor-row-${index} .image-select-wrapper input`);
      if (input) input.style.display = 'none';
      _editForm.items[index].image = value;
    }
    _validateEditForm();
  }

  function onEditImageCustomInputChange(index, value) {
    _editForm.items[index].image = value.trim() || 'generic-check.png';
    _validateEditForm();
  }

  // ─── Edit Asset & Checklist Modal ─────────────────────────────────────────

  let _editForm = {
    id: '',
    name: '',
    model: '',
    location: '',
    type: 'CO2_MAG',
    templateId: '',
    items: []
  };

  function openEditModal(assetId) {
    Promise.all([
      AssetStore.getById(assetId),
      AssetStore.getChecklistTemplate(11, assetId) // Load all checklist items for editing
    ]).then(([asset, template]) => {
      if (!asset) return;
      _editForm = {
        id: asset.id,
        name: asset.name,
        model: asset.model,
        location: asset.location,
        type: asset.type,
        templateId: asset.templateId,
        items: template.map(item => ({
          title: item.title,
          desc: item.desc,
          freq: item.freq,
          image: item.image
        }))
      };
      _renderEditModal();
    });
  }

  function _renderEditModal() {
    const existing = document.getElementById('edit-asset-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'edit-asset-modal';
    modal.className = 'inspection-modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Edit Asset & Checklist');

    modal.innerHTML = `
      <div class="inspection-modal-panel" style="max-width: 720px; width: 90vw;">
        <!-- Header -->
        <header class="inspection-modal-header">
          <h2 class="inspection-modal-title">Edit Asset & Checklist</h2>
          <button class="inspection-modal-close" onclick="AssetsView.closeEditModal()" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </header>

        <!-- Body -->
        <div class="inspection-modal-body">
          
          <!-- Asset Details Edit Section -->
          <div class="asset-details-edit-grid">
            <div class="form-group">
              <label class="inspector-input-label" for="edit-name">Machine Name (設備名) *</label>
              <input id="edit-name" class="inspector-input" type="text" placeholder="e.g. Welding Robot #3" value="${_escapeHtml(_editForm.name)}" oninput="AssetsView.onEditFormChange('name', this.value)" />
            </div>

            <div class="form-group">
              <label class="inspector-input-label" for="edit-model">Model (設備呼称/型式) *</label>
              <input id="edit-model" class="inspector-input" type="text" placeholder="e.g. DAIHEN DP-350" value="${_escapeHtml(_editForm.model)}" oninput="AssetsView.onEditFormChange('model', this.value)" />
            </div>

            <div class="form-group">
              <label class="inspector-input-label" for="edit-location">Location (配置) *</label>
              <input id="edit-location" class="inspector-input" type="text" placeholder="e.g. Bay B" value="${_escapeHtml(_editForm.location)}" oninput="AssetsView.onEditFormChange('location', this.value)" />
            </div>

            <div class="form-group">
              <label class="inspector-input-label" for="edit-type">${I18n.getLang() === 'jp' ? '設備分類 (Machine Type) *' : 'Machine Type *'}</label>
              <select id="edit-type" class="form-select" onchange="AssetsView.onEditFormChange('type', this.value)">
                <option value="CO2_MAG" ${_editForm.type === 'CO2_MAG' ? 'selected' : ''}>${I18n.t('type_co2_mag')}</option>
                <option value="TIG" ${_editForm.type === 'TIG' ? 'selected' : ''}>${I18n.t('type_tig')}</option>
                <option value="REGULATOR" ${_editForm.type === 'REGULATOR' ? 'selected' : ''}>${I18n.t('type_regulator')}</option>
                <option value="GRINDER" ${_editForm.type === 'GRINDER' ? 'selected' : ''}>${I18n.t('type_grinder')}</option>
                <option value="BELT_GRINDER" ${_editForm.type === 'BELT_GRINDER' ? 'selected' : ''}>${I18n.t('type_belt_grinder')}</option>
                <option value="SANDER" ${_editForm.type === 'SANDER' ? 'selected' : ''}>${I18n.t('type_sander')}</option>
              </select>
            </div>
          </div>

          <!-- Checklist Items Editor -->
          <div class="template-builder-container" style="border-top: none; padding-top: 0; margin-top: 0;">
            <h3 class="template-builder-title">Edit Checklist Items</h3>
            
            <div class="template-items-editor" id="edit-template-items-editor" style="max-height: 300px;">
              ${_editForm.items.map((item, idx) => `
                <div class="editor-row" id="editor-row-${idx}">
                  <span class="editor-num">${idx + 1}</span>
                  <input class="editor-input" type="text" placeholder="Title" value="${_escapeHtml(item.title)}" oninput="AssetsView.onEditModalRowItem(${idx}, 'title', this.value)" />
                  <input class="editor-input" type="text" placeholder="Description" value="${_escapeHtml(item.desc)}" oninput="AssetsView.onEditModalRowItem(${idx}, 'desc', this.value)" />
                  <select class="form-select" style="min-height:30px; padding:2px;" onchange="AssetsView.onEditModalRowItem(${idx}, 'freq', this.value)">
                    <option value="monthly" ${item.freq === 'monthly' ? 'selected' : ''}>Monthly</option>
                    <option value="semi-annual" ${item.freq === 'semi-annual' ? 'selected' : ''}>Semi-Ann</option>
                    <option value="annual" ${item.freq === 'annual' ? 'selected' : ''}>Annual</option>
                  </select>
                  ${_renderImageSelector(item.image, 'AssetsView.onEditImageSelectChange', 'AssetsView.onEditImageCustomInputChange', idx)}
                  <button class="btn-delete-row" onclick="AssetsView.onEditModalDeleteRowItem(${idx})" aria-label="Delete item ${idx + 1}">
                    ✕
                  </button>
                </div>
              `).join('')}
            </div>

            <button class="btn-add-row" onclick="AssetsView.onEditModalAddRowItem()">
              ＋ Add Checklist Item
            </button>
          </div>

        </div>

        <!-- Footer -->
        <footer class="inspection-modal-footer">
          <button class="btn-cancel" onclick="AssetsView.closeEditModal()">Cancel</button>
          <button id="btn-save-edits" class="btn-submit" onclick="AssetsView.submitEdits()" disabled>
            Save Changes
          </button>
        </footer>
      </div>
    `;

    document.getElementById('app-shell').appendChild(modal);
    _validateEditForm();
  }

  function onEditFormChange(key, value) {
    _editForm[key] = value;
    _validateEditForm();
  }

  function onEditModalRowItem(index, key, value) {
    if (_editForm.items[index]) {
      _editForm.items[index][key] = value;
    }
    _validateEditForm();
  }

  function onEditModalAddRowItem() {
    _editForm.items.push({
      title: '',
      desc: '',
      freq: 'monthly',
      image: 'generic-check.png'
    });
    _renderEditModal();
  }

  function onEditModalDeleteRowItem(index) {
    _editForm.items.splice(index, 1);
    _renderEditModal();
  }

  function _validateEditForm() {
    let isValid = _editForm.name.trim().length > 0 &&
                  _editForm.model.trim().length > 0 &&
                  _editForm.location.trim().length > 0;

    const itemsValid = _editForm.items.length > 0 &&
                       _editForm.items.every(item => item.title.trim().length > 0);
    
    isValid = isValid && itemsValid;

    const saveBtn = document.getElementById('btn-save-edits');
    if (saveBtn) {
      saveBtn.disabled = !isValid;
    }
  }

  function closeEditModal() {
    const modal = document.getElementById('edit-asset-modal');
    if (modal) modal.remove();
  }

  function submitEdits() {
    let templateIdPromise;
    if (_editForm.templateId === 'template-co2-mag') {
      templateIdPromise = AssetStore.cloneTemplate(_editForm.templateId);
    } else {
      templateIdPromise = Promise.resolve(_editForm.templateId);
    }

    templateIdPromise.then(templateId => {
      _editForm.templateId = templateId;
      return Promise.all([
        AssetStore.updateTemplate(templateId, _editForm.items),
        AssetStore.updateAsset(_editForm.id, {
          name: _editForm.name,
          model: _editForm.model,
          location: _editForm.location,
          type: _editForm.type,
          templateId: templateId
        })
      ]);
    }).then(() => {
      closeEditModal();
      refresh();
      if (typeof HomeView !== 'undefined') HomeView.refresh();
      if (typeof CalendarView !== 'undefined') CalendarView.init();

      const msg = I18n.getLang() === 'jp'
        ? `${_editForm.name} を更新しました`
        : `Updated ${_editForm.name}`;
      _showSuccessBanner(msg);
    });
  }

  // ─── Modal Inspection Form ───────────────────────────────────────────────

  function openInspection(assetId) {
    Promise.all([
      AssetStore.getById(assetId),
      AssetStore.getChecklistTemplate(new Date().getMonth(), assetId)
    ]).then(([asset, template]) => {
      if (!asset) return;
      _activeAsset = asset;
      _template = template;

      _checklistState = template.map(item => ({
        itemId: item.id,
        title: item.title,
        status: null,
        notes: ''
      }));

      _renderInspectionModal();
    });
  }

  function _renderInspectionModal() {
    const existing = document.getElementById('inspection-modal');
    if (existing) existing.remove();

    const inspector = _savedInspector();
    const isJp = I18n.getLang() === 'jp';

    const modal = document.createElement('div');
    modal.id = 'inspection-modal';
    modal.className = 'inspection-modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', isJp ? `点検フォーム: ${_activeAsset.name}` : `Inspection form for ${_activeAsset.name}`);

    modal.innerHTML = `
      <div class="inspection-modal-panel">
        
        <!-- Header -->
        <header class="inspection-modal-header">
          <h2 class="inspection-modal-title">${isJp ? '点検' : 'Inspection'}: ${_activeAsset.name}</h2>
          <button class="inspection-modal-close" onclick="AssetsView.closeInspection()" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </header>

        <!-- Body (Scrollable) -->
        <div class="inspection-modal-body">
          
          <!-- Inspector Info Sign-off -->
          <div class="inspector-sign-bar">
            <div class="inspector-input-group">
              <label class="inspector-input-label" for="insp-name">${isJp ? '点検者 (Inspector)' : 'Inspector (点検者)'}</label>
              <input
                id="insp-name"
                class="inspector-input"
                type="text"
                placeholder="${isJp ? '名前を入力' : 'Enter your name'}"
                value="${inspector}"
                maxlength="30"
                oninput="AssetsView.onInspectorNameChange(this.value)"
              />
            </div>
            <div class="inspector-input-group">
              <label class="inspector-input-label" for="insp-duration">${isJp ? '所要時間（分）' : 'Duration (mins)'}</label>
              <input
                id="insp-duration"
                class="inspector-input"
                type="number"
                value="25"
                min="5"
                max="120"
              />
            </div>
          </div>

          <h3 class="checklist-items-title">${isJp ? '点検チェックリスト' : 'Inspection Checklist'}</h3>
          
          <!-- Checklist Items -->
          <div class="checklist-items" id="checklist-items-list">
            ${_template.map(_renderChecklistItem).join('')}
          </div>

        </div>

        <!-- Footer -->
        <footer class="inspection-modal-footer">
          <button class="btn-cancel" onclick="AssetsView.closeInspection()">${I18n.t('cancel')}</button>
          <button id="btn-submit-inspection" class="btn-submit" onclick="AssetsView.submitInspection()" disabled>
            ${isJp ? '報告書を提出する' : 'Submit Report'}
          </button>
        </footer>

      </div>
    `;

    document.getElementById('app-shell').appendChild(modal);
    _validateForm();
  }

  function _renderChecklistItem(item) {
    const resolvedPath = _resolveImagePath(item.image);
    const isJp = I18n.getLang() === 'jp';

    return `
      <div class="checklist-item-card" id="item-card-${item.id}">
        
        <!-- Top Row (Title + Actions) -->
        <div class="checklist-item-header">
          <div class="checklist-item-title-row">
            <span class="checklist-item-num-title">
              ${_circleNumber(item.id)} ${item.title}
            </span>
            <span class="checklist-item-freq">${item.freq}</span>
          </div>
          
          <div class="checklist-item-actions">
            <button 
              class="btn-toggle btn-toggle-pass" 
              onclick="AssetsView.setItemStatus(${item.id}, 'pass')"
              id="btn-pass-${item.id}"
              aria-label="Pass task ${item.id}"
            >
              〇
            </button>
            <button 
              class="btn-toggle btn-toggle-fail" 
              onclick="AssetsView.setItemStatus(${item.id}, 'fail')"
              id="btn-fail-${item.id}"
              aria-label="Fail task ${item.id}"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Details Row -->
        <div class="checklist-item-details">
          <p class="checklist-item-desc">${item.desc || (isJp ? '詳細な指示はありません。' : 'No detailed instructions.')}</p>
          ${resolvedPath ? `
            <div 
              class="ref-photo-wrapper" 
              onclick="AssetsView.openLightbox('${resolvedPath}', '${item.title}')"
              title="${isJp ? '基準写真を表示' : 'View reference photo'}"
            >
              <img src="${resolvedPath}" class="ref-photo-img" alt="${item.title} reference photo" />
              <div class="ref-photo-overlay">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              </div>
            </div>
          ` : `
            <div class="ref-photo-wrapper" style="cursor: default; background: var(--clr-surface); display: flex; align-items: center; justify-content: center; color: var(--clr-text-disabled);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          `}
        </div>

        <!-- Hidden Fail Notes field -->
        <div class="checklist-item-fail-notes" id="fail-notes-${item.id}" style="display: none;">
          <label class="inspector-input-label" style="color: var(--clr-priority-high);" for="notes-input-${item.id}">${isJp ? '異常内容 (必須) *' : 'Defect Description (異常内容) *'}</label>
          <textarea
            id="notes-input-${item.id}"
            class="fail-notes-input"
            placeholder="${isJp ? '問題の詳細を入力してください...' : 'Please describe the issue...'}"
            rows="2"
            oninput="AssetsView.setItemNotes(${item.id}, this.value)"
          ></textarea>

          <div class="defect-photo-upload-group" style="margin-top: var(--space-2);">
            <label class="inspector-input-label" style="color: var(--clr-text-secondary);" for="photo-input-${item.id}">${isJp ? '写真添付 (アップロード)' : 'Photo Attachment (Photo upload)'}</label>
            <div class="defect-photo-picker-row">
              <input
                id="photo-input-${item.id}"
                class="defect-photo-file-input"
                type="file"
                accept="image/*"
                onchange="AssetsView.onDefectPhotoSelected(${item.id}, this)"
                style="display: none;"
              />
              <button
                class="btn-photo-picker"
                type="button"
                onclick="document.getElementById('photo-input-${item.id}').click()"
              >
                📷 ${isJp ? '写真をアップロード' : 'Upload Photo'}
              </button>
              <span id="photo-filename-${item.id}" class="photo-filename-label">${isJp ? '写真未添付' : 'No photo attached'}</span>
              <button
                id="btn-photo-remove-${item.id}"
                class="btn-photo-remove"
                type="button"
                onclick="AssetsView.removeDefectPhoto(${item.id})"
                style="display: none;"
              >
                ✕ ${isJp ? '削除' : 'Remove'}
              </button>
            </div>
            <div id="photo-preview-container-${item.id}" class="photo-preview-container" style="display: none; margin-top: var(--space-2);">
              <img id="photo-preview-${item.id}" class="defect-photo-preview" src="" alt="Defect preview" style="max-height: 120px; border-radius: var(--radius-sm); border: 1px solid var(--clr-border);" />
            </div>
          </div>
        </div>

      </div>
    `;
  }

  function _circleNumber(num) {
    const circles = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫'];
    return circles[num - 1] || `${num}.`;
  }

  // ─── Form Interactions & Callbacks ───────────────────────────────────────

  function setItemStatus(itemId, status) {
    const record = _checklistState.find(item => item.itemId === itemId);
    if (!record) return;

    record.status = status;

    const passBtn = document.getElementById(`btn-pass-${itemId}`);
    const failBtn = document.getElementById(`btn-fail-${itemId}`);
    const notesDiv = document.getElementById(`fail-notes-${itemId}`);
    const card = document.getElementById(`item-card-${itemId}`);

    if (status === 'pass') {
      passBtn.classList.add('active');
      failBtn.classList.remove('active');
      notesDiv.style.display = 'none';
      card.classList.remove('has-error');
      // Clear photo state and inputs
      removeDefectPhoto(itemId);
    } else {
      failBtn.classList.add('active');
      passBtn.classList.remove('active');
      notesDiv.style.display = 'flex';
      const text = notesDiv.querySelector('textarea');
      if (text) text.focus();
    }

    _validateForm();
  }

  function setItemNotes(itemId, notes) {
    const record = _checklistState.find(item => item.itemId === itemId);
    if (record) {
      record.notes = notes.trim();
    }
    _validateForm();
  }

  function onInspectorNameChange(value) {
    _saveInspector(value.trim());
    _validateForm();
  }

  function _validateForm() {
    const nameEl = document.getElementById('insp-name');
    const nameVal = nameEl ? nameEl.value.trim() : '';

    const allChecked = _checklistState.every(item => item.status !== null);
    const allFailNotesFilled = _checklistState.every(item => {
      if (item.status === 'fail') {
        return item.notes.length > 0;
      }
      return true;
    });

    const submitBtn = document.getElementById('btn-submit-inspection');
    if (submitBtn) {
      const isValid = nameVal.length > 0 && allChecked && allFailNotesFilled;
      submitBtn.disabled = !isValid;
    }
  }

  function closeInspection() {
    const modal = document.getElementById('inspection-modal');
    if (modal) modal.remove();
    _activeAsset = null;
    _checklistState = [];
  }

  function submitInspection() {
    const nameEl = document.getElementById('insp-name');
    const durEl = document.getElementById('insp-duration');
    const name = nameEl ? nameEl.value.trim() : 'Unknown';
    const duration = durEl ? Math.max(1, Number(durEl.value) || 25) : 25;
    const isJp = I18n.getLang() === 'jp';

    if (!name) {
      if (nameEl) nameEl.classList.add('error');
      return;
    }

    const failedItems = _checklistState.filter(item => item.status === 'fail');
    const totalDefects = failedItems.length;
    
    let reportNotes = totalDefects === 0 
      ? (isJp ? 'すべての項目に合格しました。' : 'All items passed.') 
      : (isJp ? `${totalDefects}件の不具合が報告されました: ` : `${totalDefects} issue(s) reported: `);
    
    if (totalDefects > 0) {
      reportNotes += failedItems.map(item => `[${item.title}: ${item.notes}]`).join(', ');
    }

    const priority = totalDefects > 0 ? 'high' : 'low';

    const historyRecord = {
      title: `${_activeAsset.name} — Monthly Inspection`,
      assetId: _activeAsset.id,
      assetName: _activeAsset.name,
      location: _activeAsset.location,
      priority: priority,
      completedAt: new Date().toISOString(),
      durationMins: duration,
      completedBy: name,
      notes: reportNotes,
      checklist: _checklistState
    };

    HistoryStore.addRecord(historyRecord).then(() => {

      // ── Auto-post a Defect notice for each failed checklist item ──
      if (failedItems.length > 0 && typeof NoticeStore !== 'undefined') {
        const postPromises = failedItems.map(item => {
          const messageText = isJp
            ? `【異常検知】 ${_activeAsset.name} — ${_activeAsset.location}\n` +
              `不合格項目: ${item.title}\n` +
              `異常内容: ${item.notes}\n` +
              `報告点検: 定期点検 (${duration}分)`
            : `[DEFECT FOUND] ${_activeAsset.name} — ${_activeAsset.location}\n` +
              `Failed Check: ${item.title}\n` +
              `Issue: ${item.notes}\n` +
              `Reported during: Monthly Inspection (${duration} mins)`;

          return NoticeStore.post({
            author: name,
            category: 'defect',
            assetId: _activeAsset.id,
            photo: item.photo || null,
            message: messageText
          });
        });
        Promise.all(postPromises).then(() => {
          if (typeof NoticeView !== 'undefined') NoticeView.refreshFeed();
        });
      }

      AssetStore.completeInspection(_activeAsset.id, new Date().toISOString().slice(0, 10), failedItems.length > 0).then(() => {
        closeInspection();

        refresh();
        if (typeof HomeView !== 'undefined') HomeView.refresh();
        if (typeof CalendarView !== 'undefined') CalendarView.init();
        if (typeof HistoryView !== 'undefined') HistoryView.init();

        _showSuccessBanner(historyRecord.assetName);
      });
    });
  }

  function _showSuccessBanner(message) {
    const existing = document.getElementById('success-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'success-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--clr-priority-low);
      color: #fff;
      padding: var(--space-3) var(--space-5);
      border-radius: var(--radius-md);
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      font-weight: var(--font-weight-semibold);
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: var(--space-2);
      animation: slide-in-toast 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    `;

    toast.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ${message}
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fade-out-toast 0.5s ease-out forwards';
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  }

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes slide-in-toast {
      from { transform: translateY(40px) scale(0.9); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }
    @keyframes fade-out-toast {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(10px); }
    }
  `;
  document.head.appendChild(styleEl);

  function _escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ─── Lightbox / Photo Zoom Overlay ───────────────────────────────────────

  function openLightbox(imageSrc, caption) {
    const lightbox = document.createElement('div');
    lightbox.id = 'ref-lightbox';
    lightbox.className = 'ref-lightbox-backdrop';
    lightbox.onclick = AssetsView.closeLightbox;

    lightbox.innerHTML = `
      <div class="ref-lightbox-content" onclick="event.stopPropagation()">
        <button class="ref-lightbox-close" onclick="AssetsView.closeLightbox()" aria-label="Close image">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <img src="${imageSrc}" class="ref-lightbox-img" alt="${caption}" />
        <div class="ref-lightbox-caption">${caption} — Inspection Reference</div>
      </div>
    `;

    document.body.appendChild(lightbox);
    document.addEventListener('keydown', _onLightboxKeyDown);
  }

  function closeLightbox() {
    const lightbox = document.getElementById('ref-lightbox');
    if (lightbox) lightbox.remove();
    document.removeEventListener('keydown', _onLightboxKeyDown);
  }

  function _onLightboxKeyDown(e) {
    if (e.key === 'Escape') closeLightbox();
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  function refresh() {
    AssetStore.getAll().then(assets => {
      _renderList(assets);
    });
  }

  function onDefectPhotoSelected(itemId, inputEl) {
    const file = inputEl.files[0];
    if (!file) return;

    const record = _checklistState.find(item => item.itemId === itemId);
    if (!record) return;

    const labelEl = document.getElementById(`photo-filename-${itemId}`);
    const removeBtn = document.getElementById(`btn-photo-remove-${itemId}`);
    const previewContainer = document.getElementById(`photo-preview-container-${itemId}`);
    const previewImg = document.getElementById(`photo-preview-${itemId}`);

    if (labelEl) labelEl.textContent = 'Compressing image...';

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG at 80% quality (resulting in about 100-200KB Base64)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);

        record.photo = compressedBase64;

        if (labelEl) labelEl.textContent = file.name;
        if (removeBtn) removeBtn.style.display = 'inline-block';
        if (previewImg) previewImg.src = compressedBase64;
        if (previewContainer) previewContainer.style.display = 'block';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function removeDefectPhoto(itemId) {
    const record = _checklistState.find(item => item.itemId === itemId);
    if (record) {
      delete record.photo;
    }

    const fileInput = document.getElementById(`photo-input-${itemId}`);
    if (fileInput) fileInput.value = '';

    const labelEl = document.getElementById(`photo-filename-${itemId}`);
    if (labelEl) labelEl.textContent = 'No photo attached';

    const removeBtn = document.getElementById(`btn-photo-remove-${itemId}`);
    if (removeBtn) removeBtn.style.display = 'none';

    const previewContainer = document.getElementById(`photo-preview-container-${itemId}`);
    if (previewContainer) previewContainer.style.display = 'none';

    const previewImg = document.getElementById(`photo-preview-${itemId}`);
    if (previewImg) previewImg.src = '';
  }

  function reportIncidentTrigger(assetId) {
    if (typeof App !== 'undefined' && App.Nav) {
      App.Nav.switchTo('notice');
      setTimeout(() => {
        if (typeof NoticeView !== 'undefined' && NoticeView.openIncidentModal) {
          NoticeView.openIncidentModal(assetId);
        }
      }, 50);
    }
  }

  function init() {
    refresh();
  }

  return {
    init,
    refresh,
    reportIncidentTrigger,
    openRegisterModal,
    onRegFormChange,
    onRegTemplateSelect,
    onEditRowItem,
    onAddRowItem,
    onDeleteRowItem,
    closeRegisterModal,
    submitRegistration,
    openEditModal,
    closeEditModal,
    openChecklistModal: openEditModal,
    closeChecklistModal: closeEditModal,
    onEditFormChange,
    onEditModalRowItem,
    onEditModalAddRowItem,
    onEditModalDeleteRowItem,
    submitEdits,
    onRegImageSelectChange,
    onRegImageCustomInputChange,
    onEditImageSelectChange,
    onEditImageCustomInputChange,
    openInspection,
    closeInspection,
    setItemStatus,
    setItemNotes,
    onInspectorNameChange,
    submitInspection,
    openLightbox,
    closeLightbox,
    onDefectPhotoSelected,
    removeDefectPhoto
  };

})();
