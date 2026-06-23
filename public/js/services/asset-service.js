/**
 * js/services/asset-service.js — Asset Service Logic
 * 
 * Contains validation, date formatting/manipulation, and sorting/grouping
 * logic for assets. Safe from DOM access and rendering mechanisms.
 */

'use strict';

const AssetService = (() => {

  function getTodayString() {
    return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function groupAssetsByCategory(assets) {
    const active = assets.filter(a => a.status !== 'decommissioned');
    const offline = assets.filter(a => a.status === 'decommissioned');

    return {
      robots: active.filter(a => a.type === 'CO2_MAG' || a.type === 'TIG'),
      regulators: active.filter(a => a.type === 'REGULATOR'),
      utilities: active.filter(a => a.type === 'UTILITY'),
      tools: active.filter(a => a.type === 'GRINDER' || a.type === 'BELT_GRINDER' || a.type === 'SANDER'),
      offline: offline
    };
  }

  function validateRegistrationForm(form) {
    let isValid = form.name && form.name.trim().length > 0 &&
                  form.model && form.model.trim().length > 0 &&
                  form.location && form.location.trim().length > 0 &&
                  form.dueDate && form.dueDate.length > 0;

    if (form.templateId === 'custom') {
      const nameValid = form.customTemplateName && form.customTemplateName.trim().length > 0;
      const itemsValid = form.customTemplateItems && form.customTemplateItems.length > 0 &&
                         form.customTemplateItems.every(item => item.title && item.title.trim().length > 0);
      isValid = isValid && nameValid && itemsValid;
    }
    return !!isValid;
  }

  function validateEditForm(form) {
    let isValid = form.name && form.name.trim().length > 0 &&
                  form.model && form.model.trim().length > 0 &&
                  form.location && form.location.trim().length > 0;

    const itemsValid = form.items && form.items.length > 0 &&
                       form.items.every(item => item.title && item.title.trim().length > 0);
    
    return !!(isValid && itemsValid);
  }

  return {
    getTodayString,
    groupAssetsByCategory,
    validateRegistrationForm,
    validateEditForm
  };

})();
