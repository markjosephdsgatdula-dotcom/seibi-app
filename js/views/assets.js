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
        Healthy
      </span>`;
    }
    if (status === 'inspection_due') {
      return `<span class="status-badge status-badge--due">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/><circle cx="12" cy="12" r="10"/></svg>
        Due
      </span>`;
    }
    return `<span class="status-badge status-badge--decommissioned">Offline</span>`;
  }

  function _renderCard(asset) {
    const isDecom = asset.status === 'decommissioned';
    const lastInspectedLabel = asset.lastInspected 
      ? new Date(asset.lastInspected).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Never';
    const dueLabel = asset.dueDate
      ? new Date(asset.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'N/A';

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
              Location: ${asset.location}
            </div>
            <div class="asset-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Last Checked: ${lastInspectedLabel}
            </div>
            ${!isDecom ? `
              <div class="asset-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Next Due: <strong>${dueLabel}</strong>
              </div>
            ` : ''}
          </div>
        </div>

        <button class="asset-btn-secondary" onclick="AssetsView.openEditModal('${asset.id}')" style="margin-top: 12px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></svg>
          Edit Asset & Checklist
        </button>
      </article>
    `;
  }

  function _renderList(assets) {
    const container = document.getElementById('assets-container');
    if (!container) return;

    const active = assets.filter(a => a.status !== 'decommissioned');
    const offline = assets.filter(a => a.status === 'decommissioned');

    container.innerHTML = `
      <!-- Top Action Bar -->
      <div class="assets-actions-bar">
        <button class="asset-btn-primary" onclick="AssetsView.openRegisterModal()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Register Machine
        </button>
      </div>

      <div class="assets-section">
        <h2 class="assets-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
          Active Welding Robots (${active.length})
        </h2>
        <div class="asset-grid">
          ${active.map(_renderCard).join('')}
        </div>
      </div>

      <div class="assets-section" style="margin-top: 32px;">
        <h2 class="assets-section-title" style="color: var(--clr-text-disabled);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><rect x="2" y="7" width="20" height="14" rx="2" stroke="var(--clr-text-disabled)"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="var(--clr-text-disabled)"/></svg>
          Inactive / Offline Robots (${offline.length})
        </h2>
        <div class="asset-grid">
          ${offline.map(_renderCard).join('')}
        </div>
      </div>
    `;
  }

  // ─── Registration Modal & Template Builder ──────────────────────────────

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

    // Pre-populate custom list with clones of standard items for easy cloning/editing
    AssetStore.getChecklistTemplate(11).then(defaultItems => {
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

    const modal = document.createElement('div');
    modal.id = 'register-modal';
    modal.className = 'inspection-modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Register New Machine');

    const showBuilder = _newAssetForm.templateId === 'custom';

    modal.innerHTML = `
      <div class="inspection-modal-panel" style="max-width: 620px;">
        <!-- Header -->
        <header class="inspection-modal-header">
          <h2 class="inspection-modal-title">Register Machine</h2>
          <button class="inspection-modal-close" onclick="AssetsView.closeRegisterModal()" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </header>

        <!-- Body -->
        <div class="inspection-modal-body">
          <div class="register-form-grid">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
              <div class="form-group">
                <label class="inspector-input-label" for="reg-name">Machine Name (設備名) *</label>
                <input id="reg-name" class="inspector-input" type="text" placeholder="e.g. Welding Robot #7" value="${_newAssetForm.name}" oninput="AssetsView.onRegFormChange('name', this.value)" />
              </div>

              <div class="form-group">
                <label class="inspector-input-label" for="reg-model">Model (設備呼称/型式) *</label>
                <input id="reg-model" class="inspector-input" type="text" placeholder="e.g. DAIHEN DP-350" value="${_newAssetForm.model}" oninput="AssetsView.onRegFormChange('model', this.value)" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
              <div class="form-group">
                <label class="inspector-input-label" for="reg-location">Location (配置) *</label>
                <input id="reg-location" class="inspector-input" type="text" placeholder="e.g. Bay C" value="${_newAssetForm.location}" oninput="AssetsView.onRegFormChange('location', this.value)" />
              </div>

              <div class="form-group">
                <label class="inspector-input-label" for="reg-type">Machine Type *</label>
                <select id="reg-type" class="form-select" onchange="AssetsView.onRegFormChange('type', this.value)">
                  <option value="CO2_MAG" ${_newAssetForm.type === 'CO2_MAG' ? 'selected' : ''}>CO2/MAG Welding Robot</option>
                  <option value="TIG" ${_newAssetForm.type === 'TIG' ? 'selected' : ''}>TIG Welding Robot</option>
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
              <div class="form-group">
                <label class="inspector-input-label" for="reg-duedate">Next Inspection Due Date *</label>
                <input id="reg-duedate" class="inspector-input" type="date" value="${_newAssetForm.dueDate}" onchange="AssetsView.onRegFormChange('dueDate', this.value)" />
              </div>

              <div class="form-group">
                <label class="inspector-input-label" for="reg-template">Inspection Sheet Template *</label>
                <select id="reg-template" class="form-select" onchange="AssetsView.onRegTemplateSelect(this.value)">
                  <option value="template-co2-mag" ${_newAssetForm.templateId === 'template-co2-mag' ? 'selected' : ''}>CO2/MAG Robots Template (12 items)</option>
                  <option value="custom" ${_newAssetForm.templateId === 'custom' ? 'selected' : ''}>Create Custom Checksheet...</option>
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

      _showSuccessBanner(`Registered ${newAsset.name}`);
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
              <label class="inspector-input-label" for="edit-type">Machine Type *</label>
              <select id="edit-type" class="form-select" onchange="AssetsView.onEditFormChange('type', this.value)">
                <option value="CO2_MAG" ${_editForm.type === 'CO2_MAG' ? 'selected' : ''}>CO2/MAG Welding Robot</option>
                <option value="TIG" ${_editForm.type === 'TIG' ? 'selected' : ''}>TIG Welding Robot</option>
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
      _showSuccessBanner(`Updated ${_editForm.name}`);
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

    const modal = document.createElement('div');
    modal.id = 'inspection-modal';
    modal.className = 'inspection-modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', `Inspection form for ${_activeAsset.name}`);

    modal.innerHTML = `
      <div class="inspection-modal-panel">
        
        <!-- Header -->
        <header class="inspection-modal-header">
          <h2 class="inspection-modal-title">Inspection: ${_activeAsset.name}</h2>
          <button class="inspection-modal-close" onclick="AssetsView.closeInspection()" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </header>

        <!-- Body (Scrollable) -->
        <div class="inspection-modal-body">
          
          <!-- Inspector Info Sign-off -->
          <div class="inspector-sign-bar">
            <div class="inspector-input-group">
              <label class="inspector-input-label" for="insp-name">Inspector (点検者)</label>
              <input
                id="insp-name"
                class="inspector-input"
                type="text"
                placeholder="Enter your name"
                value="${inspector}"
                maxlength="30"
                oninput="AssetsView.onInspectorNameChange(this.value)"
              />
            </div>
            <div class="inspector-input-group">
              <label class="inspector-input-label" for="insp-duration">Duration (mins)</label>
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

          <h3 class="checklist-items-title">Inspection Checklist</h3>
          
          <!-- Checklist Items -->
          <div class="checklist-items" id="checklist-items-list">
            ${_template.map(_renderChecklistItem).join('')}
          </div>

        </div>

        <!-- Footer -->
        <footer class="inspection-modal-footer">
          <button class="btn-cancel" onclick="AssetsView.closeInspection()">Cancel</button>
          <button id="btn-submit-inspection" class="btn-submit" onclick="AssetsView.submitInspection()" disabled>
            Submit Report
          </button>
        </footer>

      </div>
    `;

    document.getElementById('app-shell').appendChild(modal);
    _validateForm();
  }

  function _renderChecklistItem(item) {
    const resolvedPath = _resolveImagePath(item.image);

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
          <p class="checklist-item-desc">${item.desc || 'No detailed instructions.'}</p>
          ${resolvedPath ? `
            <div 
              class="ref-photo-wrapper" 
              onclick="AssetsView.openLightbox('${resolvedPath}', '${item.title}')"
              title="View reference photo"
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
          <label class="inspector-input-label" style="color: var(--clr-priority-high);" for="notes-input-${item.id}">Defect Description (異常内容) *</label>
          <textarea
            id="notes-input-${item.id}"
            class="fail-notes-input"
            placeholder="Please describe the issue..."
            rows="2"
            oninput="AssetsView.setItemNotes(${item.id}, this.value)"
          ></textarea>
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
    const duration = durEl ? Number(durEl.value) || 25 : 25;

    if (!name) {
      if (nameEl) nameEl.classList.add('error');
      return;
    }

    const failedItems = _checklistState.filter(item => item.status === 'fail');
    const totalDefects = failedItems.length;
    
    let reportNotes = totalDefects === 0 
      ? 'All items passed.' 
      : `${totalDefects} issue(s) reported: `;
    
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
        const postPromises = failedItems.map(item =>
          NoticeStore.post({
            author: name,
            category: 'defect',
            message:
              `[DEFECT FOUND] ${_activeAsset.name} — ${_activeAsset.location}\n` +
              `Failed Check: ${item.title}\n` +
              `Issue: ${item.notes}\n` +
              `Reported during: Monthly Inspection (${duration} mins)`
          })
        );
        Promise.all(postPromises).then(() => {
          if (typeof NoticeView !== 'undefined') NoticeView.init();
        });
      }

      AssetStore.completeInspection(_activeAsset.id).then(() => {
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

  function init() {
    refresh();
  }

  return {
    init,
    refresh,
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
    closeLightbox
  };

})();
