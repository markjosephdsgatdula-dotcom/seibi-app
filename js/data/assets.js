/**
 * data/assets.js — Asset Management & Checklist Template data stores
 *
 * Persists assets and inspection templates to localStorage.
 */

'use strict';

const AssetStore = (() => {

  const ASSETS_KEY = 'seibi_assets';
  const TEMPLATES_KEY = 'seibi_templates';

  // Helper: compute second Wednesday of next month
  function getSecondWednesdayOfNextMonth(fromDate = new Date()) {
    const nextMonthDate = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 1);
    const dayOfWeek = nextMonthDate.getDay();
    
    let daysToFirstWednesday = (3 - dayOfWeek + 7) % 7;
    const secondWednesdayDay = 1 + daysToFirstWednesday + 7;
    
    const secondWednesday = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), secondWednesdayDay);
    const y = secondWednesday.getFullYear();
    const m = String(secondWednesday.getMonth() + 1).padStart(2, '0');
    const d = String(secondWednesday.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Seed default checklist template items (Decoupled Regulator check #8, re-numbered to 11 items)
  const _defaultChecklistItems = [
    { id: 1, title: 'Clean rear filter', desc: '溶接機裏側のフィルターを清掃', freq: 'monthly', image: 'image1.jpeg' },
    { id: 2, title: 'Check gas pressure needle', desc: '1F中庭 ガス圧計ゲージの針確認（異常時は大丸エナウィンに連絡）', freq: 'monthly', image: 'image2.jpeg' },
    { id: 3, title: 'Check abnormal sounds', desc: '溶接機電源を入れ異音が無いか確認（ファン等）', freq: 'monthly', image: 'image3.jpeg' },
    { id: 4, title: 'Test emergency stop button', desc: '非常停止ボタンを押して作動するか確認（運転準備を入れて行う）', freq: 'monthly', image: 'image4.jpeg' },
    { id: 5, title: 'Inspect electrical wiring', desc: '電気配線の破損確認（目視による亀裂等の有無）', freq: 'monthly', image: 'image5.jpeg' },
    { id: 6, title: 'Check torch nozzle & tip', desc: 'トーチノズル、チップ、Sワッシャーの有無・清掃・緩み確認', freq: 'monthly', image: 'image7.jpeg' },
    { id: 7, title: 'Verify gas button test', desc: '溶接機左下のガスチェックボタンを押し、清掃したトーチからガスが出るか確認', freq: 'monthly', image: 'image6.jpeg' },
    { id: 8, title: 'Clean feeding rollers', desc: '送給装置のローラーにエアーブローする（送給圧は3.5に調整）', freq: 'monthly', image: 'image9.jpeg' },
    { id: 9, title: 'Verify robot alignment', desc: 'ロボットと定盤の位置出し確認（定盤A、B、C）', freq: 'monthly', image: 'image10.jpeg' },
    { id: 10, title: 'Blow air inside machine', desc: '溶接機内のエアブロー清掃', freq: 'annual', image: 'image12.jpeg' },
    { id: 11, title: 'Clean conduit hose', desc: 'コンジットホース内のアルコール清掃', freq: 'semi-annual', image: 'image11.jpeg' }
  ];

  // Seed templates
  const _templatesSeed = [
    {
      id: 'template-co2-mag',
      name: 'CO2/MAG Robot Template',
      items: _defaultChecklistItems
    },
    {
      id: 'template-regulator',
      name: 'Gas Regulator Template',
      items: [
        { id: 1, title: 'Check gas leak', desc: 'ガス漏れ確認（レギュレーター、カプラ、配管接続部に探知スプレー）', freq: 'monthly', image: 'image8.jpeg' },
        { id: 2, title: 'Adjust and verify flow rate', desc: '流量12L/min調整・動作確認', freq: 'monthly', image: 'image8.jpeg' }
      ]
    },
    {
      id: 'template-grinder',
      name: 'Grinder & Sander Template',
      items: [
        { id: 1, title: 'Inspect power cable', desc: '電気配線の破損確認（目視による被覆の亀裂や断線の有無）', freq: 'monthly', image: 'generic-check.png' },
        { id: 2, title: 'Check grinding stone / belt wear', desc: '砥石・研磨ベルトの摩耗、ひび割れ、目詰まりの確認', freq: 'monthly', image: 'generic-check.png' },
        { id: 3, title: 'Verify safety guard', desc: '安全カバーが正しく取り付けられており、緩みや破損が無いか確認', freq: 'monthly', image: 'generic-check.png' },
        { id: 4, title: 'Test abnormal vibration / sound', desc: '無負荷状態で運転させ、スイッチの作動、異音・異常振動が無いか確認', freq: 'monthly', image: 'generic-check.png' }
      ]
    }
  ];

  // Seed assets
  const _assetsSeed = [
    {
      id: 'asset-robot-01',
      name: 'Welding Robot #1 (CO2/MAG)',
      type: 'CO2_MAG',
      status: 'decommissioned',
      lastInspected: '2025-11-12',
      dueDate: null,
      model: 'DAIHEN DP-350',
      location: 'Bay A (Offline)',
      templateId: 'template-co2-mag'
    },
    {
      id: 'asset-robot-02',
      name: 'Welding Robot #2 (CO2/MAG)',
      type: 'CO2_MAG',
      status: 'decommissioned',
      lastInspected: '2025-12-10',
      dueDate: null,
      model: 'DAIHEN DP-350',
      location: 'Bay A (Offline)',
      templateId: 'template-co2-mag'
    },
    {
      id: 'asset-robot-03',
      name: 'Welding Robot #3 (CO2/MAG)',
      type: 'CO2_MAG',
      status: 'healthy',
      lastInspected: '2026-05-13',
      dueDate: '2026-06-10',
      model: 'DAIHEN DP-350',
      location: 'Bay B',
      templateId: 'template-co2-mag'
    },
    {
      id: 'asset-robot-04',
      name: 'Welding Robot #4 (CO2/MAG)',
      type: 'CO2_MAG',
      status: 'healthy',
      lastInspected: '2026-05-13',
      dueDate: '2026-06-10',
      model: 'DAIHEN DP-350',
      location: 'Bay B',
      templateId: 'template-co2-mag'
    },
    {
      id: 'asset-robot-05',
      name: 'Welding Robot #5 (CO2/MAG)',
      type: 'CO2_MAG',
      status: 'healthy',
      lastInspected: '2026-05-13',
      dueDate: '2026-06-10',
      model: 'DAIHEN DP-400R',
      location: 'Bay C',
      templateId: 'template-co2-mag'
    },
    {
      id: 'asset-robot-06',
      name: 'Welding Robot #6 (CO2/MAG)',
      type: 'CO2_MAG',
      status: 'healthy',
      lastInspected: '2026-05-13',
      dueDate: '2026-06-10',
      model: 'DAIHEN DP-400R',
      location: 'Bay C',
      templateId: 'template-co2-mag'
    },
    {
      id: 'asset-robot-tig-01',
      name: 'TIG Welding Robot #1',
      type: 'TIG',
      status: 'healthy',
      lastInspected: '2026-05-13',
      dueDate: '2026-06-10',
      model: 'DAIHEN Welbee T500',
      location: 'Bay D',
      templateId: 'template-co2-mag'
    },
    {
      id: 'asset-regulator-01',
      name: 'Regulator Pillar Left',
      type: 'REGULATOR',
      status: 'healthy',
      lastInspected: '2026-05-13',
      dueDate: '2026-06-10',
      model: 'Standard Regulator',
      location: 'Pillar Left',
      templateId: 'template-regulator'
    },
    {
      id: 'asset-regulator-02',
      name: 'Regulator Pillar Right',
      type: 'REGULATOR',
      status: 'healthy',
      lastInspected: '2026-05-13',
      dueDate: '2026-06-10',
      model: 'Standard Regulator',
      location: 'Pillar Right',
      templateId: 'template-regulator'
    }
  ];

  // ─── Templates database operations ──────────────────────────────────────────

  function _loadTemplates() {
    try {
      const raw = localStorage.getItem(TEMPLATES_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    _saveTemplates(_templatesSeed);
    return [..._templatesSeed];
  }

  function _saveTemplates(templates) {
    try {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    } catch (_) {}
  }

  function getTemplates() {
    return Promise.resolve(_loadTemplates());
  }

  function getTemplateById(id) {
    const templates = _loadTemplates();
    return Promise.resolve(templates.find(t => t.id === id) || null);
  }

  function createTemplate(name, items) {
    const templates = _loadTemplates();
    const newTemplate = {
      id: `template-custom-${Date.now()}`,
      name: name.trim() || 'Custom Checklist',
      items: items.map((item, idx) => ({
        id: idx + 1,
        title: item.title.trim() || `Check #${idx + 1}`,
        desc: item.desc.trim() || '',
        freq: item.freq || 'monthly',
        // If clowned from standard items, preserve image, else default to generic check icon
        image: item.image || 'generic-check.png'
      }))
    };
    templates.push(newTemplate);
    _saveTemplates(templates);
    return Promise.resolve(newTemplate.id);
  }

  // ─── Assets database operations ─────────────────────────────────────────────

  function _loadAssets() {
    try {
      const raw = localStorage.getItem(ASSETS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    _saveAssets(_assetsSeed);
    return [..._assetsSeed];
  }

  function _saveAssets(assets) {
    try {
      localStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
    } catch (_) {}
  }

  function getAll() {
    const assets = _loadAssets();
    const todayStr = new Date().toISOString().slice(0, 10);
    let changed = false;

    const updated = assets.map(asset => {
      if (asset.status === 'healthy' && asset.dueDate && asset.dueDate <= todayStr) {
        asset.status = 'inspection_due';
        changed = true;
      }
      return asset;
    });

    if (changed) _saveAssets(updated);
    return Promise.resolve(updated);
  }

  function getById(id) {
    const assets = _loadAssets();
    return Promise.resolve(assets.find(a => a.id === id) || null);
  }

  function register({ name, model, location, type, dueDate, templateId, customTemplateName, customTemplateItems }) {
    return Promise.resolve().then(() => {
      // If user selected "Create Custom", create the template first
      if (templateId === 'custom' && customTemplateItems) {
        return createTemplate(customTemplateName || `${name} Custom Checklist`, customTemplateItems);
      }
      return templateId || 'template-co2-mag';
    }).then(resolvedTemplateId => {
      const assets = _loadAssets();
      const newAsset = {
        id: `asset-robot-${Date.now()}`,
        name: name.trim(),
        model: model.trim(),
        location: location.trim(),
        type: type,
        status: 'healthy',
        lastInspected: null,
        dueDate: dueDate,
        templateId: resolvedTemplateId
      };

      const todayStr = new Date().toISOString().slice(0, 10);
      if (dueDate && dueDate <= todayStr) {
        newAsset.status = 'inspection_due';
      }

      assets.push(newAsset);
      _saveAssets(assets);

      if (typeof MockDB !== 'undefined' && dueDate) {
        MockDB.scheduleInspectionTask(newAsset.id, newAsset.name, newAsset.location, newAsset.dueDate);
      }

      return newAsset;
    });
  }

  function completeInspection(id, completedDateStr = new Date().toISOString().slice(0, 10), hasFailures = false) {
    const assets = _loadAssets();
    const asset = assets.find(a => a.id === id);
    if (!asset) return Promise.reject(new Error('Asset not found'));

    const completedDate = new Date(completedDateStr);
    const nextDueDate = getSecondWednesdayOfNextMonth(completedDate);

    asset.status = hasFailures ? 'needs_repair' : 'healthy';
    asset.lastInspected = completedDateStr;
    asset.dueDate = nextDueDate;

    _saveAssets(assets);

    if (typeof MockDB !== 'undefined') {
      MockDB.syncCompletedInspection(id, nextDueDate);
    }

    return Promise.resolve(asset);
  }

  /**
   * Filter checklist items dynamically based on the month.
   * Looks up the checklist template linked to the given assetId.
   */
  function getChecklistTemplate(monthIndex = new Date().getMonth(), assetId = null) {
    let templateId = 'template-co2-mag';

    if (assetId) {
      const assets = _loadAssets();
      const asset = assets.find(a => a.id === assetId);
      if (asset && asset.templateId) {
        templateId = asset.templateId;
      }
    }

    const templates = _loadTemplates();
    const template = templates.find(t => t.id === templateId) || templates[0];
    const items = template ? template.items : _defaultChecklistItems;

    const filtered = items.filter(item => {
      if (item.freq === 'annual') {
        return monthIndex === 11; // December
      }
      if (item.freq === 'semi-annual') {
        return monthIndex === 5 || monthIndex === 11; // June and December
      }
      return true; // Monthly
    });

    return Promise.resolve(filtered);
  }

  function updateAsset(id, { name, model, location, type, templateId }) {
    const assets = _loadAssets();
    const asset = assets.find(a => a.id === id);
    if (!asset) return Promise.reject(new Error('Asset not found'));

    if (name !== undefined) asset.name = name.trim();
    if (model !== undefined) asset.model = model.trim();
    if (location !== undefined) asset.location = location.trim();
    if (type !== undefined) asset.type = type;
    if (templateId !== undefined) asset.templateId = templateId;

    _saveAssets(assets);

    if (typeof MockDB !== 'undefined') {
      MockDB.syncAssetDetails(id, asset.name, asset.location);
    }

    return Promise.resolve(asset);
  }

  function updateTemplate(templateId, items) {
    const templates = _loadTemplates();
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return Promise.reject(new Error('Template not found'));

    tpl.items = items.map((item, idx) => ({
      id: idx + 1,
      title: item.title.trim() || `Check #${idx + 1}`,
      desc: item.desc.trim() || '',
      freq: item.freq || 'monthly',
      image: item.image || 'generic-check.png'
    }));

    _saveTemplates(templates);
    return Promise.resolve(tpl);
  }

  function cloneTemplate(templateId) {
    const templates = _loadTemplates();
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return Promise.reject(new Error('Template not found'));

    const newId = `template-custom-${Date.now()}`;
    const newTemplate = {
      id: newId,
      name: `${tpl.name} (Clone)`,
      items: tpl.items.map(item => ({ ...item }))
    };

    templates.push(newTemplate);
    _saveTemplates(templates);
    return Promise.resolve(newId);
  }

  function resolveRepair(id) {
    const assets = _loadAssets();
    const asset = assets.find(a => a.id === id);
    if (!asset) return Promise.reject(new Error('Asset not found'));

    const todayStr = new Date().toISOString().slice(0, 10);
    if (asset.dueDate && asset.dueDate <= todayStr) {
      asset.status = 'inspection_due';
    } else {
      asset.status = 'healthy';
    }

    _saveAssets(assets);

    if (typeof AssetsView !== 'undefined') {
      AssetsView.refresh();
    }

    return Promise.resolve(asset);
  }

  return { 
    getAll, 
    getById, 
    completeInspection, 
    getChecklistTemplate, 
    getSecondWednesdayOfNextMonth, 
    register,
    getTemplates,
    getTemplateById,
    createTemplate,
    updateAsset,
    updateTemplate,
    cloneTemplate,
    resolveRepair
  };

})();
