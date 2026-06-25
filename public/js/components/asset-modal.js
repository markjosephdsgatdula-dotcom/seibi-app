/**
 * components/asset-modal.js — Asset Modal HTML Generators
 *
 * Pure HTML string-building functions for the three asset modals:
 *   AssetModal.renderRegisterModal(form, templates) → Registration modal body
 *   AssetModal.renderEditModal(editForm)             → Edit asset & checklist modal body
 *   AssetModal.renderInspectionModal(asset, template, inspector) → Inspection modal body
 *   AssetModal.renderChecklistItem(item)             → Single checklist item card
 *   AssetModal.renderImageSelector(...)              → Image picker widget
 *
 * Rules:
 *   - No DOM queries or mutations. No document.* calls.
 *   - No access to AssetsView internal state. All data received via parameters.
 *   - May use global I18n (translations) and Utils (escaping).
 */

'use strict';

const AssetModal = (() => {

  // ─── Private pure helpers ─────────────────────────────────────────────────

  function _resolveImagePath(imageName) {
    if (!imageName || imageName === 'generic-check.png') return null;
    if (/^image\d+\.jpeg$/.test(imageName)) return `images/reference/${imageName}`;
    return imageName;
  }

  function _circleNumber(num) {
    const circles = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮'];
    return circles[num - 1] || `${num}.`;
  }

  function _escapeQuote(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'");
  }

  // ─── Image Selector Widget ────────────────────────────────────────────────

  /**
   * Renders a file/URL image picker for a checklist item row.
   * @param {string} imageValue        — current image value
   * @param {string} onchangeSelect    — JS callback name for the <select> onchange
   * @param {string} onchangeCustom    — JS callback name for the custom text input oninput
   * @param {number} index             — row index
   * @returns {string} HTML string
   */
  function renderImageSelector(imageValue, onchangeSelect, onchangeCustom, index) {
    const standardOptions = [
      'generic-check.png',
      'image1.jpeg',  'image2.jpeg',  'image3.jpeg',  'image4.jpeg',
      'image5.jpeg',  'image6.jpeg',  'image7.jpeg',  'image8.jpeg',
      'image9.jpeg',  'image10.jpeg', 'image11.jpeg', 'image12.jpeg'
    ];

    const optionLabels = {
      'generic-check.png': 'Default Icon',
      'image1.jpeg':  'Excel Image 1 (Clean rear filter)',
      'image2.jpeg':  'Excel Image 2 (Gas pressure needle)',
      'image3.jpeg':  'Excel Image 3 (Abnormal sounds)',
      'image4.jpeg':  'Excel Image 4 (Emergency stop)',
      'image5.jpeg':  'Excel Image 5 (Electrical wiring)',
      'image6.jpeg':  'Excel Image 6 (Gas button test)',
      'image7.jpeg':  'Excel Image 7 (Torch nozzle & tip)',
      'image8.jpeg':  'Excel Image 8 (Gas leak & flow)',
      'image9.jpeg':  'Excel Image 9 (Clean feeding rollers)',
      'image10.jpeg': 'Excel Image 10 (Robot alignment)',
      'image11.jpeg': 'Excel Image 11 (Clean conduit hose)',
      'image12.jpeg': 'Excel Image 12 (Blow air inside)'
    };

    const isStandard      = standardOptions.includes(imageValue);
    const selectedOption  = isStandard ? imageValue : 'custom';
    const customValue     = isStandard ? '' : imageValue;
    const showCustom      = selectedOption === 'custom' ? 'block' : 'none';

    return `
      <div class="image-select-wrapper" style="display:flex;flex-direction:column;gap:4px;width:100%;">
        <select class="form-select" style="min-height:30px;padding:2px;" onchange="${onchangeSelect}(${index}, this.value)">
          ${standardOptions.map(opt => `
            <option value="${opt}" ${selectedOption === opt ? 'selected' : ''}>${optionLabels[opt] || opt}</option>
          `).join('')}
          <option value="custom" ${selectedOption === 'custom' ? 'selected' : ''}>Custom Path/URL</option>
        </select>
        <input
          type="text"
          class="editor-input"
          placeholder="e.g. images/reference/my-image.jpg or Base64"
          style="display:${showCustom};min-height:24px;padding:2px 6px;font-size:11px;"
          value="${Utils.escapeAttr(customValue)}"
          oninput="${onchangeCustom}(${index}, this.value)"
        />
        <input
          type="file"
          accept="image/*"
          style="display:${showCustom};font-size:10px;margin-top:2px;border:none;background:transparent;padding:0;max-width:100%;"
          onchange="AssetsView.handleImageUpload(event, ${index}, '${onchangeCustom}')"
        />
      </div>
    `;
  }

  // ─── Checklist Item Card ──────────────────────────────────────────────────

  /**
   * Renders a single inspection checklist item card.
   * @param {object} item — checklist item from the template
   * @returns {string} HTML string
   */
  function renderChecklistItem(item) {
    const resolvedPath = _resolveImagePath(item.image);
    const isJp = I18n.getLang() === 'jp';

    const title = isJp ? (item.title_jp || item.title) : (item.title_en || item.title);
    const desc  = isJp
      ? (item.desc_jp  || item.desc  || '詳細な指示はありません。')
      : (item.desc_en  || item.desc  || item.desc_jp || 'No detailed instructions.');

    return `
      <div class="checklist-item-card" id="item-card-${item.id}">

        <!-- Top Row (Title + Actions) -->
        <div class="checklist-item-header">
          <div class="checklist-item-title-row" style="flex-wrap:wrap;gap:var(--space-2);align-items:center;">
            <span class="checklist-item-num-title">
              ${_circleNumber(item.id)} ${title}
            </span>
            <span class="checklist-item-freq">${item.freq}</span>
            <button
              class="btn-howto-link"
              onclick="AssetsView.openManualGuide('${_escapeQuote(item.title)}')"
              style="background:none;border:none;padding:0;color:var(--clr-accent);font-size:var(--font-size-xs);font-weight:var(--font-weight-medium);cursor:pointer;display:inline-flex;align-items:center;gap:4px;text-decoration:underline;"
            >
              📖 ${I18n.t('manual_howto')}
            </button>
          </div>

          <div class="checklist-item-actions">
            <button
              class="btn-toggle btn-toggle-pass"
              onclick="AssetsView.setItemStatus(${item.id}, 'pass')"
              id="btn-pass-${item.id}"
              aria-label="Pass task ${item.id}"
            >〇</button>
            <button
              class="btn-toggle btn-toggle-fail"
              onclick="AssetsView.setItemStatus(${item.id}, 'fail')"
              id="btn-fail-${item.id}"
              aria-label="Fail task ${item.id}"
            >✕</button>
          </div>
        </div>

        <!-- Details Row -->
        <div class="checklist-item-details">
          <p class="checklist-item-desc">${desc}</p>
          ${resolvedPath ? `
            <div
              class="ref-photo-wrapper"
              onclick="AssetsView.openLightbox('${resolvedPath}', '${_escapeQuote(item.title)}')"
              title="${isJp ? '基準写真を表示' : 'View reference photo'}"
            >
              <img src="${resolvedPath}" class="ref-photo-img" alt="${Utils.escapeAttr(item.title)} reference photo" />
              <div class="ref-photo-overlay">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                </svg>
              </div>
            </div>
          ` : `
            <div class="ref-photo-wrapper" style="cursor:default;background:var(--clr-surface);display:flex;align-items:center;justify-content:center;color:var(--clr-text-disabled);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          `}
        </div>

        <!-- Fail Notes (hidden until status = fail) -->
        <div class="checklist-item-fail-notes" id="fail-notes-${item.id}" style="display:none;">
          <label class="inspector-input-label" style="color:var(--clr-priority-high);" for="notes-input-${item.id}">
            ${isJp ? '異常内容 (必須) *' : 'Defect Description (異常内容) *'}
          </label>
          <textarea
            id="notes-input-${item.id}"
            class="fail-notes-input"
            placeholder="${isJp ? '問題の詳細を入力してください...' : 'Please describe the issue...'}"
            rows="2"
            oninput="AssetsView.setItemNotes(${item.id}, this.value)"
          ></textarea>

          <div class="defect-photo-upload-group" style="margin-top:var(--space-2);">
            <label class="inspector-input-label" style="color:var(--clr-text-secondary);" for="photo-input-${item.id}">
              ${isJp ? '写真添付 (アップロード)' : 'Photo Attachment (Photo upload)'}
            </label>
            <div class="defect-photo-picker-row">
              <input
                id="photo-input-${item.id}"
                class="defect-photo-file-input"
                type="file"
                accept="image/*"
                onchange="AssetsView.onDefectPhotoSelected(${item.id}, this)"
                style="display:none;"
              />
              <button class="btn-photo-picker" type="button" onclick="document.getElementById('photo-input-${item.id}').click()">
                📷 ${isJp ? '写真をアップロード' : 'Upload Photo'}
              </button>
              <span id="photo-filename-${item.id}" class="photo-filename-label">
                ${isJp ? '写真未添付' : 'No photo attached'}
              </span>
              <button
                id="btn-photo-remove-${item.id}"
                class="btn-photo-remove"
                type="button"
                onclick="AssetsView.removeDefectPhoto(${item.id})"
                style="display:none;"
              >✕ ${isJp ? '削除' : 'Remove'}</button>
            </div>
            <div id="photo-preview-container-${item.id}" class="photo-preview-container" style="display:none;margin-top:var(--space-2);">
              <img id="photo-preview-${item.id}" class="defect-photo-preview" src="" alt="Defect preview"
                style="max-height:120px;border-radius:var(--radius-sm);border:1px solid var(--clr-border);" />
            </div>
          </div>
        </div>

      </div>
    `;
  }

  // ─── Register Modal ───────────────────────────────────────────────────────

  /**
   * Returns the innerHTML for the register-modal panel.
   * @param {object} form       — _newAssetForm state snapshot
   * @param {Array}  templates  — _availableTemplates array
   * @returns {string} HTML string
   */
  function renderRegisterModal(form, templates) {
    const isJp       = I18n.getLang() === 'jp';
    const showBuilder = form.templateId === 'custom';

    return `
      <div class="inspection-modal-panel" style="max-width:620px;">
        <header class="inspection-modal-header">
          <h2 class="inspection-modal-title">${isJp ? '新規設備登録' : 'Register Machine'}</h2>
          <button class="inspection-modal-close" onclick="AssetsView.closeRegisterModal()" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </header>

        <div class="inspection-modal-body">
          <div class="register-form-grid">

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);">
              <div class="form-group">
                <label class="inspector-input-label" for="reg-name">${isJp ? '設備名 (Machine Name) *' : 'Machine Name *'}</label>
                <input id="reg-name" class="inspector-input" type="text" placeholder="e.g. Welding Robot #7"
                  value="${Utils.escapeAttr(form.name)}" oninput="AssetsView.onRegFormChange('name', this.value)" />
              </div>
              <div class="form-group">
                <label class="inspector-input-label" for="reg-model">${isJp ? '設備呼称/型式 (Model) *' : 'Model *'}</label>
                <input id="reg-model" class="inspector-input" type="text" placeholder="e.g. DAIHEN DP-350"
                  value="${Utils.escapeAttr(form.model)}" oninput="AssetsView.onRegFormChange('model', this.value)" />
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);">
              <div class="form-group">
                <label class="inspector-input-label" for="reg-location">${isJp ? '配置場所 (Location) *' : 'Location *'}</label>
                <input id="reg-location" class="inspector-input" type="text" placeholder="e.g. Bay C"
                  value="${Utils.escapeAttr(form.location)}" oninput="AssetsView.onRegFormChange('location', this.value)" />
              </div>
              <div class="form-group">
                <label class="inspector-input-label" for="reg-type">${isJp ? '設備分類 (Machine Type) *' : 'Machine Type *'}</label>
                <select id="reg-type" class="form-select" onchange="AssetsView.onRegFormChange('type', this.value)">
                  <option value="CO2_MAG"     ${form.type === 'CO2_MAG'     ? 'selected' : ''}>${I18n.t('type_co2_mag')}</option>
                  <option value="TIG"         ${form.type === 'TIG'         ? 'selected' : ''}>${I18n.t('type_tig')}</option>
                  <option value="REGULATOR"   ${form.type === 'REGULATOR'   ? 'selected' : ''}>${I18n.t('type_regulator')}</option>
                  <option value="UTILITY"     ${form.type === 'UTILITY'     ? 'selected' : ''}>${I18n.t('type_utility')}</option>
                  <option value="GRINDER"     ${form.type === 'GRINDER'     ? 'selected' : ''}>${I18n.t('type_grinder')}</option>
                  <option value="BELT_GRINDER"${form.type === 'BELT_GRINDER'? 'selected' : ''}>${I18n.t('type_belt_grinder')}</option>
                  <option value="SANDER"      ${form.type === 'SANDER'      ? 'selected' : ''}>${I18n.t('type_sander')}</option>
                </select>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);">
              <div class="form-group">
                <label class="inspector-input-label" for="reg-duedate">${isJp ? '次回点検日 (Due Date) *' : 'Next Inspection Due Date *'}</label>
                <input id="reg-duedate" class="inspector-input" type="date"
                  value="${Utils.escapeAttr(form.dueDate)}" onchange="AssetsView.onRegFormChange('dueDate', this.value)" />
              </div>
              <div class="form-group">
                <label class="inspector-input-label" for="reg-template">${isJp ? '点検チェックシートのテンプレート *' : 'Inspection Sheet Template *'}</label>
                <select id="reg-template" class="form-select" onchange="AssetsView.onRegTemplateSelect(this.value)">
                  ${templates.map(tpl => {
                    let name = tpl.name;
                    if      (tpl.id === 'template-co2-mag')      name = isJp ? `溶接ロボット用テンプレート (${tpl.items.length}項目)` : `CO2/MAG Robots Template (${tpl.items.length} items)`;
                    else if (tpl.id === 'template-regulator')    name = isJp ? `ガス調整器用テンプレート (${tpl.items.length}項目)` : `Gas Regulators Template (${tpl.items.length} items)`;
                    else if (tpl.id === 'template-utility-gas')  name = isJp ? `主要ガスユーティリティテンプレート (${tpl.items.length}項目)` : `Main Gas Utility Template (${tpl.items.length} items)`;
                    else if (tpl.id === 'template-grinder')      name = isJp ? `グラインダー・サンダー用テンプレート (${tpl.items.length}項目)` : `Grinders & Sanders Template (${tpl.items.length} items)`;
                    return `<option value="${tpl.id}" ${form.templateId === tpl.id ? 'selected' : ''}>${name}</option>`;
                  }).join('')}
                  <option value="custom" ${form.templateId === 'custom' ? 'selected' : ''}>
                    ${isJp ? 'カスタムチェックシートの作成...' : 'Create Custom Checksheet...'}
                  </option>
                </select>
              </div>
            </div>

            ${showBuilder ? `
              <div class="template-builder-container" id="template-builder">
                <h3 class="template-builder-title">Customize Inspection Sheet Items</h3>
                <div class="form-group" style="margin-bottom:8px;">
                  <label class="inspector-input-label" for="reg-custom-tpl-name">Checklist Name *</label>
                  <input id="reg-custom-tpl-name" class="inspector-input" type="text"
                    placeholder="e.g. Robot 7 Checklist"
                    value="${Utils.escapeAttr(form.customTemplateName)}"
                    oninput="AssetsView.onRegFormChange('customTemplateName', this.value)" />
                </div>
                <div class="template-items-editor" id="template-items-editor">
                  ${form.customTemplateItems.map((item, idx) => `
                    <div class="editor-row" id="editor-row-${idx}">
                      <span class="editor-num">${idx + 1}</span>
                      <input class="editor-input" type="text" placeholder="Title"
                        value="${Utils.escapeAttr(item.title)}" oninput="AssetsView.onEditRowItem(${idx}, 'title', this.value)" />
                      <input class="editor-input" type="text" placeholder="Description"
                        value="${Utils.escapeAttr(item.desc)}" oninput="AssetsView.onEditRowItem(${idx}, 'desc', this.value)" />
                      <select class="form-select" style="min-height:30px;padding:2px;" onchange="AssetsView.onEditRowItem(${idx}, 'freq', this.value)">
                        <option value="monthly"     ${item.freq === 'monthly'     ? 'selected' : ''}>Monthly</option>
                        <option value="semi-annual" ${item.freq === 'semi-annual' ? 'selected' : ''}>Semi-Ann</option>
                        <option value="annual"      ${item.freq === 'annual'      ? 'selected' : ''}>Annual</option>
                      </select>
                      ${renderImageSelector(item.image, 'AssetsView.onRegImageSelectChange', 'AssetsView.onRegImageCustomInputChange', idx)}
                      <button class="btn-delete-row" onclick="AssetsView.onDeleteRowItem(${idx})" aria-label="Delete item ${idx + 1}">✕</button>
                    </div>
                  `).join('')}
                </div>
                <button class="btn-add-row" onclick="AssetsView.onAddRowItem()">＋ Add Checklist Item</button>
              </div>
            ` : ''}

          </div>
        </div>

        <footer class="inspection-modal-footer">
          <button class="btn-cancel" onclick="AssetsView.closeRegisterModal()">Cancel</button>
          <button id="btn-submit-registration" class="btn-submit" onclick="AssetsView.submitRegistration()" disabled>
            Register Machine
          </button>
        </footer>
      </div>
    `;
  }

  // ─── Edit Modal ───────────────────────────────────────────────────────────

  /**
   * Returns the innerHTML for the edit-asset-modal panel.
   * @param {object} editForm — _editForm state snapshot
   * @returns {string} HTML string
   */
  function renderEditModal(editForm) {
    const isJp = I18n.getLang() === 'jp';

    return `
      <div class="inspection-modal-panel" style="max-width:720px;width:90vw;">
        <header class="inspection-modal-header">
          <h2 class="inspection-modal-title">Edit Asset & Checklist</h2>
          <button class="inspection-modal-close" onclick="AssetsView.closeEditModal()" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </header>

        <div class="inspection-modal-body">

          <div class="asset-details-edit-grid">
            <div class="form-group">
              <label class="inspector-input-label" for="edit-name">Machine Name (設備名) *</label>
              <input id="edit-name" class="inspector-input" type="text" placeholder="e.g. Welding Robot #3"
                value="${Utils.escapeAttr(editForm.name)}" oninput="AssetsView.onEditFormChange('name', this.value)" />
            </div>
            <div class="form-group">
              <label class="inspector-input-label" for="edit-model">Model (設備呼称/型式) *</label>
              <input id="edit-model" class="inspector-input" type="text" placeholder="e.g. DAIHEN DP-350"
                value="${Utils.escapeAttr(editForm.model)}" oninput="AssetsView.onEditFormChange('model', this.value)" />
            </div>
            <div class="form-group">
              <label class="inspector-input-label" for="edit-location">Location (配置) *</label>
              <input id="edit-location" class="inspector-input" type="text" placeholder="e.g. Bay B"
                value="${Utils.escapeAttr(editForm.location)}" oninput="AssetsView.onEditFormChange('location', this.value)" />
            </div>
            <div class="form-group">
              <label class="inspector-input-label" for="edit-type">${isJp ? '設備分類 (Machine Type) *' : 'Machine Type *'}</label>
              <select id="edit-type" class="form-select" onchange="AssetsView.onEditFormChange('type', this.value)">
                <option value="CO2_MAG"     ${editForm.type === 'CO2_MAG'     ? 'selected' : ''}>${I18n.t('type_co2_mag')}</option>
                <option value="TIG"         ${editForm.type === 'TIG'         ? 'selected' : ''}>${I18n.t('type_tig')}</option>
                <option value="REGULATOR"   ${editForm.type === 'REGULATOR'   ? 'selected' : ''}>${I18n.t('type_regulator')}</option>
                <option value="UTILITY"     ${editForm.type === 'UTILITY'     ? 'selected' : ''}>${I18n.t('type_utility')}</option>
                <option value="GRINDER"     ${editForm.type === 'GRINDER'     ? 'selected' : ''}>${I18n.t('type_grinder')}</option>
                <option value="BELT_GRINDER"${editForm.type === 'BELT_GRINDER'? 'selected' : ''}>${I18n.t('type_belt_grinder')}</option>
                <option value="SANDER"      ${editForm.type === 'SANDER'      ? 'selected' : ''}>${I18n.t('type_sander')}</option>
              </select>
            </div>
          </div>

          <div class="template-builder-container" style="border-top:none;padding-top:0;margin-top:0;">
            <h3 class="template-builder-title">Edit Checklist Items</h3>
            <div class="template-items-editor" id="edit-template-items-editor" style="max-height:300px;">
              ${editForm.items.map((item, idx) => `
                <div class="editor-row" id="editor-row-${idx}">
                  <span class="editor-num">${idx + 1}</span>
                  <input class="editor-input" type="text" placeholder="Title"
                    value="${Utils.escapeAttr(isJp ? (item.title_jp || item.title) : (item.title_en || item.title))}" oninput="AssetsView.onEditModalRowItem(${idx}, 'title', this.value)" />
                  <input class="editor-input" type="text" placeholder="Description"
                    value="${Utils.escapeAttr(isJp ? (item.desc_jp || item.desc) : (item.desc_en || item.desc))}" oninput="AssetsView.onEditModalRowItem(${idx}, 'desc', this.value)" />
                  <select class="form-select" style="min-height:30px;padding:2px;" onchange="AssetsView.onEditModalRowItem(${idx}, 'freq', this.value)">
                    <option value="monthly"     ${item.freq === 'monthly'     ? 'selected' : ''}>Monthly</option>
                    <option value="semi-annual" ${item.freq === 'semi-annual' ? 'selected' : ''}>Semi-Ann</option>
                    <option value="annual"      ${item.freq === 'annual'      ? 'selected' : ''}>Annual</option>
                  </select>
                  ${renderImageSelector(item.image, 'AssetsView.onEditImageSelectChange', 'AssetsView.onEditImageCustomInputChange', idx)}
                  <button class="btn-delete-row" onclick="AssetsView.onEditModalDeleteRowItem(${idx})" aria-label="Delete item ${idx + 1}">✕</button>
                </div>
              `).join('')}
            </div>
            <button class="btn-add-row" onclick="AssetsView.onEditModalAddRowItem()">＋ Add Checklist Item</button>
          </div>

        </div>

        <footer class="inspection-modal-footer">
          <button class="btn-cancel" onclick="AssetsView.closeEditModal()">Cancel</button>
          <button id="btn-save-edits" class="btn-submit" onclick="AssetsView.submitEdits()" disabled>Save Changes</button>
        </footer>
      </div>
    `;
  }

  // ─── Inspection Modal ─────────────────────────────────────────────────────

  /**
   * Returns the innerHTML for the inspection-modal panel.
   * @param {object} asset      — the active asset object
   * @param {Array}  template   — checklist template items
   * @param {string} inspector  — saved inspector name (from localStorage)
   * @returns {string} HTML string
   */
  function renderInspectionModal(asset, template, inspector) {
    const isJp      = I18n.getLang() === 'jp';
    const assetName = (isJp && asset.name_jp) ? asset.name_jp : asset.name;

    return `
      <div class="inspection-modal-panel">

        <header class="inspection-modal-header">
          <h2 class="inspection-modal-title">${isJp ? '点検' : 'Inspection'}: ${assetName}</h2>
          <button class="inspection-modal-close" onclick="AssetsView.closeInspection()" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </header>

        <div class="inspection-modal-body">

          <div class="inspector-sign-bar">
            <div class="inspector-input-group">
              <label class="inspector-input-label" for="insp-name">
                ${isJp ? '点検者 (Inspector)' : 'Inspector (点検者)'}
              </label>
              <input
                id="insp-name"
                class="inspector-input"
                type="text"
                placeholder="${isJp ? '名前を入力' : 'Enter your name'}"
                value="${Utils.escapeAttr(inspector)}"
                maxlength="30"
                oninput="AssetsView.onInspectorNameChange(this.value)"
              />
            </div>
            <div class="inspector-input-group">
              <label class="inspector-input-label" for="insp-duration">
                ${isJp ? '所要時間（分）' : 'Duration (mins)'}
              </label>
              <input id="insp-duration" class="inspector-input" type="number" value="25" min="5" max="120" />
            </div>
          </div>

          <h3 class="checklist-items-title">${isJp ? '点検チェックリスト' : 'Inspection Checklist'}</h3>

          <div class="checklist-items" id="checklist-items-list">
            ${template.map(renderChecklistItem).join('')}
          </div>

        </div>

        <footer class="inspection-modal-footer">
          <button class="btn-cancel" onclick="AssetsView.closeInspection()">${I18n.t('cancel')}</button>
          <button id="btn-submit-inspection" class="btn-submit" onclick="AssetsView.submitInspection()" disabled>
            ${isJp ? '報告書を提出する' : 'Submit Report'}
          </button>
        </footer>

      </div>
    `;
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  return {
    renderImageSelector,
    renderChecklistItem,
    renderRegisterModal,
    renderEditModal,
    renderInspectionModal,
  };

})();
