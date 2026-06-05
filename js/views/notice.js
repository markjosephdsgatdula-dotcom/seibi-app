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

  function _relativeTime(isoStr) {
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days  = Math.floor(hours / 24);
    const isJp = I18n.getLang() === 'jp';
    if (mins < 1)   return isJp ? 'たった今' : 'just now';
    if (mins < 60)  return isJp ? `${mins}分前` : `${mins}m ago`;
    if (hours < 24) return isJp ? `${hours}時間前` : `${hours}h ago`;
    return isJp ? `${days}日前` : `${days}d ago`;
  }

  // Avatar colour palette — deterministic from initials so same author always
  // gets the same colour without storing it
  const AVATAR_COLOURS = [
    '#4f7cff','#f97316','#22d3ee','#a855f7',
    '#ec4899','#10b981','#f59e0b','#6366f1',
  ];

  function _avatarColour(initials) {
    let hash = 0;
    for (const ch of initials) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
    return AVATAR_COLOURS[hash % AVATAR_COLOURS.length];
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  function _renderRepairBanner(notice) {
    if (!notice.repaired) return '';
    const isJp = I18n.getLang() === 'jp';
    const time = new Date(notice.repairedAt).toLocaleString(isJp ? 'ja-JP' : 'en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    });
    const label = isJp
      ? `修理完了 · ${time} · 担当: ${_escapeHtml(notice.repairedBy)}`
      : `Repaired · ${time} · by ${_escapeHtml(notice.repairedBy)}`;

    return `
      <div class="notice-repaired-banner">
        <span class="notice-repaired-icon">✅</span>
        <div class="notice-repaired-info">
          <span class="notice-repaired-label">${label}</span>
          ${notice.repairNote ? `<span class="notice-repaired-note">${_escapeHtml(notice.repairNote)}</span>` : ''}
        </div>
      </div>
    `;
  }

  function _renderNotice(notice) {
    const cat    = NoticeStore.CATEGORIES[notice.category] || NoticeStore.CATEGORIES.info;
    const colour = _avatarColour(notice.initials);
    const isDefect   = notice.category === 'defect';
    const isRepaired = !!notice.repaired;
    const isJp = I18n.getLang() === 'jp';

    const catLabel = {
      'info': isJp ? '情報' : 'Info',
      'alert': isJp ? '警告' : 'Alert',
      'safety': isJp ? '安全' : 'Safety',
      'update': isJp ? '連絡' : 'Updates',
      'defect': isJp ? '異常' : 'Defect'
    }[notice.category] || cat.label;

    const repairBtn = isDefect && !isRepaired
      ? `<button class="notice-repair-btn" onclick="NoticeView.openRepairForm('${notice.id}')" title="${I18n.t('btn_mark_repaired')}">${I18n.t('btn_mark_repaired')}</button>`
      : '';

    const formattedTime = new Date(notice.timestamp).toLocaleString(isJp ? 'ja-JP' : 'en-US');

    return `
      <article class="notice-card" id="notice-${notice.id}">
        <div class="notice-avatar" style="background:${colour}" aria-hidden="true">
          ${notice.initials}
        </div>
        <div class="notice-body${isRepaired ? ' notice-body--repaired' : ''}">
          <div class="notice-meta">
            <span class="notice-author">${notice.author}</span>
            <span class="notice-time" title="${formattedTime}">
              ${_relativeTime(notice.timestamp)}
            </span>
            <span class="notice-cat notice-cat--${notice.category}">
              ${cat.emoji} ${catLabel}
            </span>
            <button
              class="notice-delete-btn"
              onclick="NoticeView.deleteNotice('${notice.id}')"
              title="${isJp ? '投稿を削除' : 'Delete notice'}"
              aria-label="Delete notice"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </div>
          <p class="notice-message">${_escapeHtml(notice.message)}</p>
          ${notice.photo ? `
            <div class="notice-photo-wrapper" onclick="AssetsView.openLightbox('${notice.photo}', 'Defect Photo')">
              <img class="notice-photo-img" src="${notice.photo}" alt="Attached defect photo" />
            </div>
          ` : ''}
          ${_renderRepairBanner(notice)}
          ${repairBtn}
          <div class="notice-repair-form" id="repair-form-${notice.id}" style="display:none;">
            <input id="repair-by-${notice.id}" class="repair-input" type="text" placeholder="${I18n.t('repair_by_placeholder')}" maxlength="40" />
            <textarea id="repair-note-${notice.id}" class="repair-textarea" placeholder="${I18n.t('repair_notes_placeholder')}" rows="2" maxlength="300"></textarea>
            <div class="repair-actions">
              <button class="repair-cancel-btn" onclick="NoticeView.closeRepairForm('${notice.id}')">${I18n.t('cancel')}</button>
              <button class="repair-submit-btn" onclick="NoticeView.submitRepair('${notice.id}')">${I18n.t('confirm_repair')}</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function _escapeHtml(str) {
    return str
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/\n/g,'<br>');
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
    feed.innerHTML = notices.map(_renderNotice).join('');

    // Scroll to bottom so newest post is visible
    feed.scrollTop = feed.scrollHeight;
  }

  // ─── Compose bar ─────────────────────────────────────────────────────────

  function _renderCompose() {
    const panel = document.getElementById('view-notice');
    if (!panel) return;

    const savedAuthor = _savedAuthor();
    const isJp = I18n.getLang() === 'jp';

    const cats = Object.entries(NoticeStore.CATEGORIES).map(([key, val]) => {
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
        <div class="notice-toolbar">
          <div class="notice-search-wrap">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              id="notice-search-input"
              class="notice-search-input"
              type="text"
              placeholder="${isJp ? '掲示板を検索...' : 'Search notices...'}"
              oninput="NoticeView.onSearchInput(this.value)"
            />
          </div>
          <div class="notice-filter-chips" role="group" aria-label="Filter notices by category">
            <button class="filter-chip active" data-filter="all" onclick="NoticeView.setCategoryFilter('all')">${isJp ? 'すべて' : 'All'}</button>
            <button class="filter-chip" data-filter="info" onclick="NoticeView.setCategoryFilter('info')">${isJp ? 'ℹ️ 情報' : 'ℹ️ Info'}</button>
            <button class="filter-chip" data-filter="alert" onclick="NoticeView.setCategoryFilter('alert')">${isJp ? '⚠️ 警告' : '⚠️ Alert'}</button>
            <button class="filter-chip" data-filter="safety" onclick="NoticeView.setCategoryFilter('safety')">${isJp ? '🛡️ 安全' : '🛡️ Safety'}</button>
            <button class="filter-chip" data-filter="update" onclick="NoticeView.setCategoryFilter('update')">${isJp ? '📢 連絡' : '📢 Updates'}</button>
            <button class="filter-chip" data-filter="defect" onclick="NoticeView.setCategoryFilter('defect')">${isJp ? '🔧 異常' : '🔧 Defects'}</button>
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
              value="${_escapeHtml(savedAuthor)}"
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

    NoticeStore.markRepaired(id, { repairedBy, repairNote }).then(() => {
      refreshFeed();
    });
  }

  function _applyFilterAndRender() {
    let filtered = _allNotices;
    
    // 1. Filter by category
    if (_activeFilter !== 'all') {
      filtered = filtered.filter(n => n.category === _activeFilter);
    }

    // 2. Filter by search query
    if (_searchQuery) {
      const q = _searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.author.toLowerCase().includes(q) || 
        n.message.toLowerCase().includes(q) ||
        (n.repairedBy && n.repairedBy.toLowerCase().includes(q)) ||
        (n.repairNote && n.repairNote.toLowerCase().includes(q))
      );
    }

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

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    _renderCompose();

    NoticeStore.getAll().then(notices => {
      _allNotices = notices;
      _applyFilterAndRender();
    });
  }

  return { init, submitPost, deleteNotice, openRepairForm, closeRepairForm, submitRepair, refreshFeed, onSearchInput, setCategoryFilter };

})();
