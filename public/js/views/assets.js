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

  function _renderList(assets) {
    const container = document.getElementById('assets-container');
    if (!container) return;

    const categories = AssetService.groupAssetsByCategory(assets);

    container.innerHTML = `
      <!-- Top Action Bar -->
      <div class="assets-actions-bar">
        ${AuthService.isAdmin() ? `
          <button class="asset-btn-primary" onclick="AssetsView.openRegisterModal()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ${I18n.t('btn_register_machine')}
          </button>
        ` : ''}
      </div>

      <!-- Welding Robots Section -->
      ${categories.robots.length > 0 ? `
        <div class="assets-section">
          <h2 class="assets-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
            ${I18n.t('section_active_robots')} (${categories.robots.length})
          </h2>
          <div class="asset-grid">
            ${categories.robots.map(AssetCard.renderCard).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Gas Regulators Section -->
      ${categories.regulators.length > 0 ? `
        <div class="assets-section" style="margin-top: 32px;">
          <h2 class="assets-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 12L16 8M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
            ${I18n.t('section_active_regulators')} (${categories.regulators.length})
          </h2>
          <div class="asset-grid">
            ${categories.regulators.map(AssetCard.renderCard).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Facility Utilities Section -->
      ${categories.utilities.length > 0 ? `
        <div class="assets-section" style="margin-top: 32px;">
          <h2 class="assets-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="16"/><line x1="15" y1="22" x2="15" y2="16"/><line x1="9" y1="16" x2="15" y2="16"/><path d="M8 6h2v2H8V6zm0 4h2v2H8v-2zm0 4h2v2H8v-2zm8-8h2v2h-2V6zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z"/></svg>
            ${I18n.t('section_active_utilities')} (${categories.utilities.length})
          </h2>
          <div class="asset-grid">
            ${categories.utilities.map(AssetCard.renderCard).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Grinders & Sanders Section -->
      ${categories.tools.length > 0 ? `
        <div class="assets-section" style="margin-top: 32px;">
          <h2 class="assets-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            ${I18n.t('section_active_tools')} (${categories.tools.length})
          </h2>
          <div class="asset-grid">
            ${categories.tools.map(AssetCard.renderCard).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Inactive / Offline Section -->
      <div class="assets-section" style="margin-top: 32px;">
        <h2 class="assets-section-title" style="color: var(--clr-text-disabled);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><rect x="2" y="7" width="20" height="14" rx="2" stroke="var(--clr-text-disabled)"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="var(--clr-text-disabled)"/></svg>
          ${I18n.t('section_inactive_robots')} (${categories.offline.length})
        </h2>
        <div class="asset-grid">
          ${categories.offline.map(AssetCard.renderCard).join('')}
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
      _newAssetForm.customTemplateItems = defaultItems.map((item, idx) => ({
        ...item,
        id: idx + 1,
        title: (item.title || '').trim() || `Check #${idx + 1}`,
        desc: (item.desc || '').trim() || '',
        freq: item.freq || 'monthly',
        image: item.image || 'generic-check.png'
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
    modal.innerHTML = AssetModal.renderRegisterModal(_newAssetForm, _availableTemplates);
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
    const isValid = AssetService.validateRegistrationForm(_newAssetForm);
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

      const isJp = I18n.getLang() === 'jp';
      const msg = isJp
        ? `${(newAsset.name_jp || newAsset.name)} を登録しました`
        : `Registered ${newAsset.name}`;
      _showSuccessBanner(msg);
    });
  }


  // Helper callbacks for Registration Modal Image Picker
  function onRegImageSelectChange(index, value) {
    const textInput = document.querySelector(`#register-modal #editor-row-${index} .image-select-wrapper input[type="text"]`);
    const fileInput = document.querySelector(`#register-modal #editor-row-${index} .image-select-wrapper input[type="file"]`);
    
    if (value === 'custom') {
      if (textInput) {
        textInput.style.display = 'block';
        _newAssetForm.customTemplateItems[index].image = textInput.value.trim() || 'generic-check.png';
      }
      if (fileInput) fileInput.style.display = 'block';
    } else {
      if (textInput) textInput.style.display = 'none';
      if (fileInput) fileInput.style.display = 'none';
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
    const textInput = document.querySelector(`#edit-asset-modal #editor-row-${index} .image-select-wrapper input[type="text"]`);
    const fileInput = document.querySelector(`#edit-asset-modal #editor-row-${index} .image-select-wrapper input[type="file"]`);
    
    if (value === 'custom') {
      if (textInput) {
        textInput.style.display = 'block';
        _editForm.items[index].image = textInput.value.trim() || 'generic-check.png';
      }
      if (fileInput) fileInput.style.display = 'block';
    } else {
      if (textInput) textInput.style.display = 'none';
      if (fileInput) fileInput.style.display = 'none';
      _editForm.items[index].image = value;
    }
    _validateEditForm();
  }

  function onEditImageCustomInputChange(index, value) {
    _editForm.items[index].image = value.trim() || 'generic-check.png';
    _validateEditForm();
  }

  function handleImageUpload(event, index, customInputCallbackName) {
    const file = event.target.files[0];
    if (!file) return;

    ImageService.compressAndPreview(file, { maxWidth: 1000, maxHeight: 800, quality: 0.8 }, (err, result) => {
      if (err) {
        console.error('[AssetsView] Image compression failed:', err);
        return;
      }
      const base64Url = result.base64;
      
      // Update text input value visually
      const wrapper = event.target.closest('.image-select-wrapper');
      if (wrapper) {
        const textInput = wrapper.querySelector('input[type="text"]');
        if (textInput) {
          textInput.value = base64Url;
        }
      }
      
      // Call appropriate callback to update internal state
      if (customInputCallbackName === 'AssetsView.onRegImageCustomInputChange') {
        onRegImageCustomInputChange(index, base64Url);
      } else if (customInputCallbackName === 'AssetsView.onEditImageCustomInputChange') {
        onEditImageCustomInputChange(index, base64Url);
      }
    });
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
      AssetStore.getChecklistTemplate(null, assetId) // Load all checklist items for editing
    ]).then(([asset, template]) => {
      if (!asset) return;
      const isJp = I18n.getLang() === 'jp';
      _editForm = {
        id: asset.id,
        name: asset.name,
        name_jp: asset.name_jp || asset.name,
        model: asset.model,
        location: asset.location,
        type: asset.type,
        templateId: asset.templateId,
        items: template.map(item => {
          const titleVal = isJp ? (item.title_jp || item.title) : (item.title_en || item.title);
          const descVal = isJp ? (item.desc_jp || item.desc) : (item.desc_en || item.desc || item.desc_jp);
          const newItem = {
            ...item,
            title: (titleVal || '').trim(),
            desc: (descVal || '').trim()
          };
          delete newItem.title_jp;
          delete newItem.title_en;
          delete newItem.desc_jp;
          delete newItem.desc_en;
          return newItem;
        })
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
    modal.innerHTML = AssetModal.renderEditModal(_editForm);
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
    const isValid = AssetService.validateEditForm(_editForm);
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
    if (_editForm.templateId && !_editForm.templateId.startsWith('template-custom-')) {
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
    }).catch(err => {
      console.error('[submitEdits] Error saving edits:', err);
      alert('Error saving changes: ' + err.message);
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
    const isJp = I18n.getLang() === 'jp';
    const assetName = (isJp && _activeAsset.name_jp) ? _activeAsset.name_jp : _activeAsset.name;
    const modal = document.createElement('div');
    modal.id = 'inspection-modal';
    modal.className = 'inspection-modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', isJp ? `点検フォーム: ${assetName}` : `Inspection form for ${assetName}`);
    modal.innerHTML = AssetModal.renderInspectionModal(_activeAsset, _template, _savedInspector());
    document.getElementById('app-shell').appendChild(modal);
    _validateForm();
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
    const banner = document.getElementById('return-inspection-banner');
    if (banner) banner.remove();
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
    const assetName = (isJp && _activeAsset.name_jp) ? _activeAsset.name_jp : _activeAsset.name;
    const priority = totalDefects > 0 ? 'high' : 'low';

    const submitBtn = document.getElementById('btn-submit-inspection');
    const originalText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = isJp ? '送信中...' : 'Uploading...';
    }

    // Find and upload all photos attached to checklist items
    const uploadPromises = _checklistState.map(item => {
      if (item.photoBlob) {
        const filename = `defect-${_activeAsset.id}-${item.itemId}-${Date.now()}.jpg`;
        return FirebaseSync.uploadPhoto(item.photoBlob, 'photos/' + filename)
          .then(downloadUrl => {
            item.photo = downloadUrl;
            delete item.photoBlob; // Clean up local blob state
          })
          .catch(err => {
            console.error(`[Firebase Storage] Upload failed for item ${item.itemId}:`, err);
            item.photo = null;
            delete item.photoBlob;
          });
      }
      // If photo was a localObjectURL preview but no Blob, clean it up
      if (item.photo && item.photo.startsWith('blob:')) {
        item.photo = null;
      }
      return Promise.resolve();
    });

    Promise.all(uploadPromises).then(() => {
      // Re-query failed items now that their photo properties contain live Firebase URLs
      const updatedFailedItems = _checklistState.filter(item => item.status === 'fail');

      const historyRecord = {
        title: isJp ? `${assetName} — 月次点検` : `${_activeAsset.name} — Monthly Inspection`,
        title_jp: `${assetName} — 月次点検`,
        assetId: _activeAsset.id,
        assetName: _activeAsset.name,
        assetName_jp: _activeAsset.name_jp || _activeAsset.name,
        location: _activeAsset.location,
        priority: priority,
        completedAt: new Date().toISOString(),
        durationMins: duration,
        completedBy: name,
        notes: totalDefects === 0 
          ? (isJp ? 'すべての項目に合格しました。' : 'All items passed.') 
          : (isJp ? `${totalDefects}件の不具合が報告されました` : `${totalDefects} issue(s) reported`),
        checklist: _checklistState,
        type: 'inspection'
      };

      return HistoryStore.addRecord(historyRecord).then(() => {
        // ── Auto-post a Defect notice for each failed checklist item ──
        let noticePromise = Promise.resolve();
        if (updatedFailedItems.length > 0 && typeof NoticeStore !== 'undefined') {
          const postPromises = updatedFailedItems.map(item => {
            const itemTitle = isJp ? (item.title_jp || item.title) : (item.title_en || item.title);
            const messageText = isJp
              ? `【異常検知】 ${assetName} — ${_activeAsset.location}\n` +
                `点検中に「${itemTitle}」で異常が報告されました。`
              : `[DEFECT FOUND] ${assetName} — ${_activeAsset.location}\n` +
                `Defect reported during inspection of "${itemTitle}".`;

            return NoticeStore.post({
              author: name,
              category: 'defect',
              assetId: _activeAsset.id,
              photo: item.photo || null,
              message: messageText
            });
          });
          noticePromise = Promise.all(postPromises).then(() => {
            if (typeof NoticeView !== 'undefined') NoticeView.refreshFeed();
          });
        }

        return noticePromise.then(() => {
          const todayStr = AssetService.getTodayString();
          return AssetStore.completeInspection(_activeAsset.id, todayStr, updatedFailedItems.length > 0);
        });
      });
    }).then(() => {
      closeInspection();

      refresh();
      if (typeof HomeView !== 'undefined') HomeView.refresh();
      if (typeof CalendarView !== 'undefined') CalendarView.init();
      if (typeof HistoryView !== 'undefined') HistoryView.init();

      _showSuccessBanner(assetName);
    }).catch(err => {
      console.error('[AssetsView] Error submitting inspection:', err);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
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
      <div class="toast-content" style="display: flex; align-items: center; gap: 8px;">
        <span class="toast-icon">✅</span>
        <span>${message}</span>
      </div>
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

    ImageService.compressAndPreview(file, { maxWidth: 1000, maxHeight: 800, quality: 0.8 }, (err, result) => {
      if (err) {
        console.error('[AssetsView] Image compression failed:', err);
        if (labelEl) labelEl.textContent = 'Error';
        return;
      }
      const localUrl = URL.createObjectURL(result.blob);
      record.photo = localUrl;
      record.photoBlob = result.blob;

      if (labelEl) labelEl.textContent = file.name;
      if (removeBtn) removeBtn.style.display = 'inline-block';
      if (previewImg) previewImg.src = localUrl;
      if (previewContainer) previewContainer.style.display = 'block';
    });
  }

  function removeDefectPhoto(itemId) {
    const record = _checklistState.find(item => item.itemId === itemId);
    if (record) {
      delete record.photo;
      delete record.photoBlob;
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

  function openManualGuide(itemTitle) {
    const modal = document.getElementById('inspection-modal');
    if (modal) {
      modal.style.display = 'none';
      _renderReturnToInspectionBanner();
    }

    if (typeof App !== 'undefined' && App.Nav) {
      App.Nav.switchTo('manual');
      if (typeof ManualView !== 'undefined' && ManualView.scrollToGuide) {
        ManualView.scrollToGuide(itemTitle);
      }
    }
  }

  function _renderReturnToInspectionBanner() {
    const existing = document.getElementById('return-inspection-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'return-inspection-banner';
    banner.style.position = 'fixed';
    banner.style.bottom = '72px';
    banner.style.right = '16px';
    banner.style.zIndex = '9999';
    banner.style.display = 'flex';
    banner.style.alignItems = 'center';

    const isJp = I18n.getLang() === 'jp';
    const assetName = (isJp && _activeAsset.name_jp) ? _activeAsset.name_jp : _activeAsset.name;
    const btnText = isJp
      ? `🔧 ${assetName} の点検に戻る`
      : `🔧 Return to Inspection of ${assetName}`;

    banner.innerHTML = `
      <button onclick="AssetsView.resumeInspection()" style="
        background: var(--clr-accent);
        color: #fff;
        border: none;
        border-radius: var(--radius-md);
        padding: 12px 20px;
        font-family: var(--font-family);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-bold);
        box-shadow: 0 4px 16px rgba(79, 124, 255, 0.4);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: transform var(--transition-fast), background var(--transition-fast);
      " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
        ${btnText}
      </button>
    `;

    document.getElementById('app-shell').appendChild(banner);
  }

  function resumeInspection() {
    const banner = document.getElementById('return-inspection-banner');
    if (banner) banner.remove();

    const modal = document.getElementById('inspection-modal');
    if (modal) {
      modal.style.display = 'flex';
    }

    if (typeof App !== 'undefined' && App.Nav) {
      App.Nav.switchTo('assets');
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
    handleImageUpload,
    openInspection,
    closeInspection,
    setItemStatus,
    setItemNotes,
    onInspectorNameChange,
    submitInspection,
    openLightbox,
    closeLightbox,
    onDefectPhotoSelected,
    removeDefectPhoto,
    openManualGuide,
    resumeInspection
  };

})();
