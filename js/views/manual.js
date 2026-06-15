/**
 * views/manual.js — Maintenance Manual View Controller
 *
 * Renders step-by-step how-to guides for all checklist items.
 * Includes search filtering, accordion expansion, and deep-linking from checklist items.
 */

'use strict';

const ManualView = (() => {

  let _container = null;
  let _searchQuery = '';
  let _expandedGuides = {}; // Map of linkedItemTitle -> boolean

  function init() {
    _container = document.getElementById('view-manual');
    if (!_container) return;

    // Redraw view
    refresh();
  }

  function refresh() {
    if (!_container) return;

    const isJp = I18n.getLang() === 'jp';
    const manuals = ManualStore.getAll();

    // Filter manuals based on search query
    const query = _searchQuery.trim().toLowerCase();
    const filtered = manuals.filter(m => {
      if (!query) return true;
      
      const title = (isJp ? m.title_jp : m.title_en).toLowerCase();
      const linkedTitle = m.linkedItemTitle.toLowerCase();
      
      // Match in title or category name
      if (title.includes(query) || linkedTitle.includes(query)) return true;

      // Match in step text
      return m.steps.some(s => {
        const text = (isJp ? s.text_jp : s.text_en).toLowerCase();
        const safety = (isJp ? (s.safety_jp || '') : (s.safety_en || '')).toLowerCase();
        return text.includes(query) || safety.includes(query);
      });
    });

    _container.innerHTML = `
      <div class="manual-header-sticky">
        <h1 class="view-title">${I18n.t('manual_title')}</h1>
        
        <!-- Search Bar -->
        <div class="manual-search-wrapper">
          <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input 
            type="text" 
            class="manual-search-input" 
            placeholder="${I18n.t('manual_search')}" 
            value="${_escapeHtml(_searchQuery)}"
            oninput="ManualView.onSearchInput(this.value)"
          />
          ${_searchQuery ? `
            <button class="manual-search-clear" onclick="ManualView.onSearchClear()" aria-label="Clear search">
              ✕
            </button>
          ` : ''}
        </div>
      </div>

      <div class="manual-scrollable-content">
        ${filtered.length === 0 ? `
          <div class="manual-empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p>${isJp ? '一致するマニュアルは見つかりませんでした。' : 'No matching manuals found.'}</p>
          </div>
        ` : _renderGroupedGuides(filtered, isJp)}
      </div>
    `;
  }

  function _renderGroupedGuides(manuals, isJp) {
    // Group manuals by category for clean structure
    const groups = {
      'template-co2-mag': { name_en: 'CO2/MAG Welding Robots', name_jp: 'CO2/MAG 溶接ロボット', items: [] },
      'template-regulator': { name_en: 'Gas Regulators', name_jp: 'ガス調整器・レギュレーター', items: [] },
      'template-utility-gas': { name_en: 'Main Gas Utilities', name_jp: '主要ガスユーティリティ', items: [] }
    };

    manuals.forEach(m => {
      if (groups[m.category]) {
        groups[m.category].items.push(m);
      }
    });

    return Object.entries(groups)
      .filter(([_, group]) => group.items.length > 0)
      .map(([catId, group]) => {
        const groupName = isJp ? group.name_jp : group.name_en;
        return `
          <div class="manual-group" id="manual-group-${catId}">
            <h2 class="manual-group-title">${groupName}</h2>
            <div class="manual-accordion-list">
              ${group.items.map(m => _renderAccordionItem(m, isJp)).join('')}
            </div>
          </div>
        `;
      }).join('');
  }

  function _renderAccordionItem(m, isJp) {
    const isExpanded = !!_expandedGuides[m.linkedItemTitle];
    const title = isJp ? m.title_jp : m.title_en;

    return `
      <article class="manual-card ${isExpanded ? 'is-expanded' : ''}" id="manual-card-${_domId(m.linkedItemTitle)}">
        <header class="manual-card-header" onclick="ManualView.toggleGuide('${_escapeQuote(m.linkedItemTitle)}')">
          <div class="manual-card-header-content">
            <span class="manual-card-icon">📖</span>
            <h3 class="manual-card-title">${title}</h3>
          </div>
          <svg class="manual-card-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </header>

        <div class="manual-card-body">
          <div class="manual-steps-timeline">
            ${m.steps.map(step => `
              <div class="manual-step-item">
                <div class="manual-step-num-col">
                  <span class="manual-step-badge">${I18n.t('manual_step')} ${step.step}</span>
                </div>
                <div class="manual-step-content-col">
                  <p class="manual-step-text">${isJp ? step.text_jp : step.text_en}</p>
                  
                  ${step.safety_en || step.safety_jp ? `
                    <div class="manual-safety-box">
                      <div class="manual-safety-header">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        <strong>${I18n.t('manual_safety')}</strong>
                      </div>
                      <p class="manual-safety-text">${isJp ? step.safety_jp : step.safety_en}</p>
                    </div>
                  ` : ''}

                  <!-- Step Image Container -->
                  <div class="manual-step-image-container">
                    <img 
                      class="manual-step-image" 
                      src="${step.image}" 
                      alt="Step ${step.step} - ${title}"
                      onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                    />
                    <div class="manual-image-placeholder" style="display: none;">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <span>No Photo Reference</span>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </article>
    `;
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  function toggleGuide(itemTitle) {
    _expandedGuides[itemTitle] = !_expandedGuides[itemTitle];
    
    // Find element and toggle classes manually for instantaneous response
    const el = document.getElementById(`manual-card-${_domId(itemTitle)}`);
    if (el) {
      el.classList.toggle('is-expanded', _expandedGuides[itemTitle]);
    }
  }

  function scrollToGuide(itemTitle) {
    // Force expand this specific guide
    _expandedGuides[itemTitle] = true;
    
    // Refresh the view so it is expanded
    refresh();

    // Scroll into view
    setTimeout(() => {
      const el = document.getElementById(`manual-card-${_domId(itemTitle)}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Brief highlighting animation
        el.classList.add('highlight-flash');
        setTimeout(() => el.classList.remove('highlight-flash'), 1200);
      }
    }, 100);
  }

  function onSearchInput(val) {
    _searchQuery = val;
    // Debounced or direct refresh
    refresh();
  }

  function onSearchClear() {
    _searchQuery = '';
    refresh();
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function _domId(str) {
    return str.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  }

  function _escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function _escapeQuote(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'");
  }

  return { init, refresh, toggleGuide, scrollToGuide, onSearchInput, onSearchClear };

})();
