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
    // Monthly (7 Items)
    { 
      id: 1, 
      title: 'Clean welder rear filter', title_en: 'Clean Welder Rear Filter', title_jp: '溶接機裏側のフィルター清掃',
      desc: 'Clean or replace controller cabinet door air filters.', desc_en: 'Clean or replace controller cabinet door air filters.', desc_jp: 'コントローラー冷却ファン・ドアフィルターの清掃・交換',
      freq: 'monthly', image: 'image1.jpeg' 
    },
    { 
      id: 2, 
      title: 'Check startup noise & fans', title_en: 'Check Startup Noise & Fans', title_jp: '電源ON時の異音確認',
      desc: 'Verify that internal exhaust and intake fans run smoothly.', desc_en: 'Verify that internal exhaust and intake fans run smoothly.', desc_jp: 'ファンモーターの回転異音、風量、目視確認',
      freq: 'monthly', image: 'image3.jpeg' 
    },
    { 
      id: 3, 
      title: 'Verify robot alignment', title_en: 'Verify Robot Alignment', title_jp: 'ロボットと定盤の位置出し確認',
      desc: 'Load alignment program and check TCP to fixture alignment.', desc_en: 'Load alignment program and check TCP to fixture alignment.', desc_jp: 'ロボットと定盤の位置出し確認（定盤A、B、C）',
      freq: 'monthly', image: 'image10.jpeg' 
    },
    { 
      id: 4, 
      title: 'Test emergency stop button', title_en: 'Test Emergency Stop Button', title_jp: '非常停止ボタンの作動確認',
      desc: 'Test all emergency stop buttons and gate interlocks.', desc_en: 'Test all emergency stop buttons and gate interlocks.', desc_jp: '非常停止ボタン、安全柵インターロックの遮断作動テスト',
      freq: 'monthly', image: 'image4.jpeg' 
    },
    { 
      id: 5, 
      title: 'Check welding ground cable', title_en: 'Check Welding Ground Cable', title_jp: 'アースケーブルの点検',
      desc: 'Inspect grounding clamp and table connections.', desc_en: 'Inspect grounding clamp and table connections.', desc_jp: 'アースケーブル接続部、溶接テーブル接続ボルトの緩み点検',
      freq: 'monthly', image: 'generic-check.png' 
    },
    { 
      id: 6, 
      title: 'Test torch shock sensor', title_en: 'Test Torch Shock Sensor', title_jp: 'トーチ衝突検知センサー動作テスト',
      desc: 'Test the torch collision safety guard switch.', desc_en: 'Test the torch collision safety guard switch.', desc_jp: 'トーチ衝突検知センサーの作動・断線チェック',
      freq: 'monthly', image: 'generic-check.png' 
    },
    { 
      id: 7, 
      title: 'Inspect gearbox grease leaks', title_en: 'Inspect Gearbox Grease Leaks', title_jp: '各軸減速機のグリス漏れ点検',
      desc: 'Inspect axis joints (Axis 1–6) for grease leaks.', desc_en: 'Inspect axis joints (Axis 1–6) for grease leaks.', desc_jp: '各軸減速機のグリス漏れ点検（1〜6軸）',
      freq: 'monthly', image: 'generic-check.png' 
    },

    // Semi-Annual (3 Items)
    { 
      id: 8, 
      title: 'Clean conduit hose', title_en: 'Clean Conduit Hose', title_jp: 'コンジットホース内のアルコール清掃',
      desc: 'Clean conduit hose internally with alcohol.', desc_en: 'Clean conduit hose internally with alcohol.', desc_jp: 'コンジットホース内のアルコール清掃',
      freq: 'semi-annual', image: 'image11.jpeg' 
    },
    { 
      id: 9, 
      title: 'Verify wire feed pressure (3.5)', title_en: 'Verify Wire Feed Pressure (3.5)', title_jp: '送給装置の送給圧調整（3.5に調整）',
      desc: 'Inspect roll groove wear and gear backlash. Adjust pressure to 3.5.', desc_en: 'Inspect roll groove wear and gear backlash. Adjust pressure to 3.5.', desc_jp: '送給ローラーの摩耗、溝サイズ、ギア部の清掃と加圧チェック（3.5に調整）',
      freq: 'semi-annual', image: 'generic-check.png' 
    },
    { 
      id: 10, 
      title: 'Verify joint alignment marks', title_en: 'Verify Joint Alignment Marks', title_jp: '各軸の合わせマーク（原点矢印）の一致確認',
      desc: 'Verify the zero-position alignment marks on all joints.', desc_en: 'Verify the zero-position alignment marks on all joints.', desc_jp: '各軸の合わせマーク（原点矢印）の一致確認',
      freq: 'semi-annual', image: 'generic-check.png' 
    },

    // Annual (3 Items)
    { 
      id: 11, 
      title: 'Blow air inside machine', title_en: 'Blow Air Inside Machine', title_jp: '溶接機内のエアブロー清掃',
      desc: 'Blow dust out of the welding power source interior.', desc_en: 'Blow dust out of the welding power source interior.', desc_jp: '溶接機内のエアブロー清掃',
      freq: 'annual', image: 'image12.jpeg' 
    },
    { 
      id: 12, 
      title: 'Visual check of mounting bolts', title_en: 'Visual Check of Mounting Bolts', title_jp: 'ロボット台座・取付ボルト緩みの目視点検',
      desc: 'Visual check of base mounting bolts (no torque wrench).', desc_en: 'Visual check of base mounting bolts (no torque wrench).', desc_jp: 'ロボット台座・取付ボルト緩みの目視点検',
      freq: 'annual', image: 'generic-check.png' 
    },
    { 
      id: 13, 
      title: 'Sand & oil welding table', title_en: 'Sand & Oil Welding Table', title_jp: '定盤・溶接台の清掃（研磨・防錆油塗布）',
      desc: 'Sand and oil the welding table.', desc_en: 'Sand and oil the welding table.', desc_jp: '定盤・溶接台の清掃（研磨・防錆油塗布）',
      freq: 'annual', image: 'generic-check.png' 
    },

    // Long-Term (2 Items)
    { 
      id: 14, 
      title: 'Replace encoder batteries (Power ON)', title_en: 'Replace Encoder Batteries (Power ON)', title_jp: '本体エンコーダ用バッテリー交換（通電中）',
      desc: 'Replace manipulator internal encoder backup batteries. Power must be ON.', desc_en: 'Replace manipulator internal encoder backup batteries. Power must be ON.', desc_jp: 'ロボット本体エンコーダ用バックアップバッテリーの交換（通電中）',
      freq: 'every-3-years', image: 'generic-check.png' 
    },
    { 
      id: 15, 
      title: 'Replace CPU batteries (Power ON)', title_en: 'Replace CPU Batteries (Power ON)', title_jp: 'コントローラーCPU用バッテリー交換（通電中）',
      desc: 'Replace controller CPU board memory backup batteries. Power must be ON.', desc_en: 'Replace controller CPU board memory backup batteries. Power must be ON.', desc_jp: 'コントローラーCPUボード用バックアップバッテリーの交換（通電中）',
      freq: 'every-3-years', image: 'generic-check.png' 
    }
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
      id: 'template-utility-gas',
      name: 'Main Gas Utility Template',
      items: [
        { id: 1, title: 'Check gas pressure needle', desc: '1F中庭 ガス圧計ゲージの針確認（異常時は大丸エナウィンに連絡）', freq: 'monthly', image: 'image2.jpeg' }
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
    },
    {
      id: 'asset-utility-gas-01',
      name: 'Main Gas Utility',
      type: 'UTILITY',
      status: 'healthy',
      lastInspected: '2026-05-13',
      dueDate: '2026-06-10',
      model: 'Gas Gauge',
      location: '1F Courtyard',
      templateId: 'template-utility-gas'
    }
  ];

  // ─── Templates database operations ──────────────────────────────────────────

  function _loadTemplates() {
    try {
      const raw = localStorage.getItem(TEMPLATES_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    try {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(_templatesSeed));
    } catch (_) {}
    return [..._templatesSeed];
  }

  function _saveTemplates(templates) {
    try {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
      if (typeof firebaseDb !== 'undefined') {
        firebaseDb.ref('templates').set(templates).catch(err => {
          console.error('[Firebase] Write error on templates:', err);
        });
      }
    } catch (_) {}
    return Promise.resolve();
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
    try {
      localStorage.setItem(ASSETS_KEY, JSON.stringify(_assetsSeed));
    } catch (_) {}
    return [..._assetsSeed];
  }

  function _saveAssets(assets) {
    try {
      localStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
      if (typeof firebaseDb !== 'undefined') {
        firebaseDb.ref('assets').set(assets).catch(err => {
          console.error('[Firebase] Write error on assets:', err);
        });
      }
    } catch (_) {}
    return Promise.resolve();
  }

  function getAll() {
    const assets = _loadAssets();
    const offset = new Date().getTimezoneOffset() * 60000;
    const todayStr = new Date(Date.now() - offset).toISOString().slice(0, 10);
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

      const offset = new Date().getTimezoneOffset() * 60000;
      const todayStr = new Date(Date.now() - offset).toISOString().slice(0, 10);
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

  function completeInspection(id, completedDateStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10), hasFailures = false) {
    const assets = _loadAssets();
    const asset = assets.find(a => a.id === id);
    if (!asset) return Promise.reject(new Error('Asset not found'));

    const completedDate = new Date(completedDateStr);
    const nextDueDate = getSecondWednesdayOfNextMonth(completedDate);

    asset.status = hasFailures ? 'needs_repair' : 'healthy';
    asset.lastInspected = completedDateStr;
    asset.dueDate = nextDueDate;

    const savePromise = _saveAssets(assets);

    let syncPromise = Promise.resolve();
    if (typeof MockDB !== 'undefined') {
      syncPromise = MockDB.syncCompletedInspection(id, nextDueDate);
    }

    return Promise.all([savePromise, syncPromise]).then(() => asset);
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
      if (item.freq === 'every-3-years') {
        return monthIndex === 11 && (new Date().getFullYear() % 3 === 0);
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

    const offset = new Date().getTimezoneOffset() * 60000;
    const todayStr = new Date(Date.now() - offset).toISOString().slice(0, 10);
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

  function setRepairStatus(id, status) {
    const assets = _loadAssets();
    const asset = assets.find(a => a.id === id);
    if (!asset) return Promise.reject(new Error('Asset not found'));

    asset.status = status;
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
    resolveRepair,
    setRepairStatus
  };

})();
