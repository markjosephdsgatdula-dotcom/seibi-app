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
  // Seed default checklist template items (CO2/MAG Robot, 10 items)
  const _defaultChecklistItems = [
    { id: 1, title: 'Clean welder rear filter', title_en: 'Clean Welder Rear Filter', title_jp: '溶接機裏側のフィルター清掃', desc: 'Remove rear filter and blow out dust with compressed air or replace with new one.', desc_en: 'Remove rear filter and blow out dust with compressed air or replace with new one.', desc_jp: 'パワーソース（溶接電源）裏側のフィルターを取り外し、粉塵をエアーブローするか、新しいものに交換する。', freq: 'monthly', image: 'image1.jpeg', category: 'A' },
    { id: 2, title: 'Verify robot & joint alignment', title_en: 'Verify Robot & Joint Alignment', title_jp: '定盤位置出し・各軸合わせマークの確認', desc: 'Run calibration program (A, B, C) and verify J1-J6 alignment marks visually.', desc_en: 'Run calibration program (A, B, C) and verify J1-J6 alignment marks visually.', desc_jp: '基準校正プログラムを実行し、定盤A、B、Cでの位置確認と同時に、J1〜J6各軸の合わせマーク（矢印・ケガキ線）が一致しているか目視確認する。', freq: 'monthly', image: 'image10.jpeg', category: 'A' },
    { id: 3, title: 'Test emergency stop button', title_en: 'Test Emergency Stop Button', title_jp: '非常停止ボタンの作動確認', desc: 'Ensure all Emergency buttons halt the robot immediately.', desc_en: 'Ensure all Emergency buttons halt the robot immediately.', desc_jp: 'すべての非常停止ボタンがロボットを即座に停止させるか確認する。', freq: 'monthly', image: 'image4.jpeg', category: 'A' },
    { id: 4, title: 'Check welding ground cable', title_en: 'Check Welding Ground Cable', title_jp: '溶接アース接続部の緩み点検', desc: 'Inspect grounding clamps and table connections for looseness.', desc_en: 'Inspect grounding clamps and table connections for looseness.', desc_jp: 'アースクランプおよび定盤の接続部に緩みがないか点検する。', freq: 'monthly', image: 'generic-check.png', category: 'A' },
    { id: 5, title: 'Test torch shock sensor', title_en: 'Test Torch Shock Sensor', title_jp: 'トーチ衝突検知センサー動作テスト', desc: 'Manually deflect the torch to ensure the collision safety circuit halts the robot.', desc_en: 'Manually deflect the torch to ensure the collision safety circuit halts the robot.', desc_jp: 'トーチの衝突検知センサーを手動で軽くたわませ、安全回路が作動してロボットが即座に一時停止することを確認する。', freq: 'monthly', image: 'generic-check.png', category: 'A' },
    { id: 6, title: 'Verify wire feed pressure (3.5)', title_en: 'Verify Wire Feed Pressure (3.5)', title_jp: '送給装置の送給圧調整（3.5に調整）', desc: 'Check and adjust wire feed roller pressure to exactly 3.5 to prevent slipping.', desc_en: 'Check and adjust wire feed roller pressure to exactly 3.5 to prevent slipping.', desc_jp: '送給装置の加圧ローラーの圧力設定を確認し、ワイヤーの滑りや潰れを防止するために「3.5」に調整・維持する。', freq: 'monthly', image: 'generic-check.png', category: 'A' },
    { id: 7, title: 'Sand & oil welding table', title_en: 'Sand & Oil Welding Table', title_jp: '定盤・溶接台の清掃（研磨・防錆油塗布）', desc: 'Remove spatter with a buffer and apply anti-rust oil to the welding table.', desc_en: 'Remove spatter with a buffer and apply anti-rust oil to the welding table.', desc_jp: 'バフ研磨機でスパッタを除去し、溶接定盤に防錆油を塗布する。', freq: 'monthly', image: 'generic-check.png', category: 'A' },
    { id: 8, title: 'Clean conduit hose inner liner', title_en: 'Clean Conduit Hose Inner Liner', title_jp: 'コンジットホース内のアルコール清掃', desc: 'Clean the conduit hose with alcohol.', desc_en: 'Clean the conduit hose with alcohol.', desc_jp: 'コンジットホースをアルコールで清掃する。', freq: 'semi-annual', image: 'image11.jpeg', category: 'A' },
    { id: 9, title: 'Blow air inside welder & boards', title_en: 'Blow Air Inside Welder & Boards', title_jp: '溶接機・基板内部のエアブロー清掃', desc: 'Remove the cover and blow dry air to remove conductive dust from PCBs and power modules.', desc_en: 'Remove the cover and blow dry air to remove conductive dust from PCBs and power modules.', desc_jp: 'カバーを取り外し、内部基板やパワー半導体に付着した導電性粉塵を乾燥したエアーで吹き飛ばす。', freq: 'annual', image: 'image12.jpeg', category: 'A' },
    { id: 10, title: 'Visual check of mounting bolts', title_en: 'Visual Check of Mounting Bolts', title_jp: 'ロボット台座・取付ボルト緩みの目視点検', desc: 'Visually check base anchor bolts and alignment marks, or perform tap testing.', desc_en: 'Visually check base anchor bolts and alignment marks, or perform tap testing.', desc_jp: 'ロボットベース固定用アンカーボルトが緩んでいないか、合いマークのズレや目視確認、または打音テストによって確認する。', freq: 'annual', image: 'generic-check.png', category: 'A' }
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
        { id: 1, title: 'Check gas leak', title_en: 'Check Gas Leak', title_jp: 'ガス漏れ確認', desc: 'Check for gas leaks (apply leak detector spray to the regulator, coupler, and pipe connections).', desc_en: 'Check for gas leaks (apply leak detector spray to the regulator, coupler, and pipe connections).', desc_jp: 'ガス漏れ確認（レギュレーター、カプラ、配管接続部に探知スプレー）', freq: 'monthly', image: 'image8.jpeg' },
        { id: 2, title: 'Adjust and verify flow rate', title_en: 'Adjust & Verify Flow Rate', title_jp: '流量12L/min調整', desc: 'Adjust the flow rate to 12L/min and verify proper operation.', desc_en: 'Adjust the flow rate to 12L/min and verify proper operation.', desc_jp: '流量12L/min調整・動作確認', freq: 'monthly', image: 'image8.jpeg' }
      ]
    },
    {
      id: 'template-utility-gas',
      name: 'Main Gas Utility Template',
      items: [
        { id: 1, title: 'Check gas pressure needle', title_en: 'Check Gas Pressure Needle', title_jp: 'ガス圧計ゲージの針確認', desc: 'Check the gas pressure gauge needle in the 1F Courtyard (contact Daimaru Enawin if abnormal).', desc_en: 'Check the gas pressure gauge needle in the 1F Courtyard (contact Daimaru Enawin if abnormal).', desc_jp: '1F中庭 ガス圧計ゲージの針確認（異常時は大丸エナウィンに連絡）', freq: 'monthly', image: 'image2.jpeg' },
        { id: 2, title: 'Check gas leak', title_en: 'Check Gas Leak', title_jp: 'ガス漏れ確認', desc: 'Check for gas leaks (apply leak detector spray to the regulator, coupler, and pipe connections).', desc_en: 'Check for gas leaks (apply leak detector spray to the regulator, coupler, and pipe connections).', desc_jp: 'ガス漏れ確認（レギュレーター、カプラ、配管接続部に探知スプレー）', freq: 'monthly', image: 'image8.jpeg' }
      ]
    },
    {
      id: 'template-grinder',
      name: 'Grinder & Sander Template',
      items: [
        { id: 1, title: 'Inspect power cable', title_en: 'Inspect Power Cable', title_jp: '電気配線の破損確認', desc: 'Visually inspect the power cable for any damage (look for cracks in the insulation or broken wires).', desc_en: 'Visually inspect the power cable for any damage (look for cracks in the insulation or broken wires).', desc_jp: '電気配線の破損確認（目視による被覆の亀裂や断線の有無）', freq: 'monthly', image: 'generic-check.png' },
        { id: 2, title: 'Check grinding belt wear', title_en: 'Check Grinding Belt Wear', title_jp: '研磨ベルトの摩耗確認', desc: 'Check the grinding belt for wear, cracks, or clogging.', desc_en: 'Check the grinding belt for wear, cracks, or clogging.', desc_jp: '研磨ベルトの摩耗、ひび割れ、目詰まりの確認', freq: 'monthly', image: 'generic-check.png' },
        { id: 3, title: 'Test abnormal vibration / sound', title_en: 'Test Abnormal Vibration / Sound', title_jp: '異音・異常振動確認', desc: 'Run the tool without load to verify switch operation, and check for abnormal noises or vibrations.', desc_en: 'Run the tool without load to verify switch operation, and check for abnormal noises or vibrations.', desc_jp: '無負荷状態で運転させ、スイッチの作動、異音・異常振動が無いか確認', freq: 'monthly', image: 'generic-check.png' }
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
    return (typeof FirebaseSync !== 'undefined' && FirebaseSync.cache.templates) || [];
  }

  function _saveTemplates(templates) {
    if (typeof FirebaseSync !== 'undefined') {
      FirebaseSync.cache.templates = templates;
    }
    if (typeof firebaseDb !== 'undefined') {
      firebaseDb.ref('templates').set(templates).catch(err => {
        console.error('[Firebase] Write error on templates:', err);
      });
    }
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
    return (typeof FirebaseSync !== 'undefined' && FirebaseSync.cache.assets) || [];
  }

  function _saveAssets(assets) {
    if (typeof FirebaseSync !== 'undefined') {
      FirebaseSync.cache.assets = assets;
    }
    if (typeof firebaseDb !== 'undefined') {
      firebaseDb.ref('assets').set(assets).catch(err => {
        console.error('[Firebase] Write error on assets:', err);
      });
    }
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
      ...item,
      id: idx + 1,
      title: (item.title || '').trim() || `Check #${idx + 1}`,
      desc: (item.desc || '').trim() || '',
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

  function updateDueDate(id, newDate) {
    const assets = _loadAssets();
    const asset = assets.find(a => a.id === id);
    if (!asset) return Promise.reject(new Error('Asset not found'));

    asset.dueDate = newDate;
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
    setRepairStatus,
    updateDueDate
  };

})();
