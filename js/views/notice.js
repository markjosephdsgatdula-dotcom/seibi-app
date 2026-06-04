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
    if (mins < 1)   return 'just now';
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
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

  function _renderNotice(notice) {
    const cat    = NoticeStore.CATEGORIES[notice.category] || NoticeStore.CATEGORIES.info;
    const colour = _avatarColour(notice.initials);

    return `
      <article class="notice-card" id="notice-${notice.id}">
        <div class="notice-avatar" style="background:${colour}" aria-hidden="true">
          ${notice.initials}
        </div>
        <div class="notice-body">
          <div class="notice-meta">
            <span class="notice-author">${notice.author}</span>
            <span class="notice-time" title="${new Date(notice.timestamp).toLocaleString()}">
              ${_relativeTime(notice.timestamp)}
            </span>
            <span class="notice-cat notice-cat--${notice.category}">
              ${cat.emoji} ${cat.label}
            </span>
          </div>
          <p class="notice-message">${_escapeHtml(notice.message)}</p>
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
          <p>No notices yet. Be the first to post.</p>
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
    const cats = Object.entries(NoticeStore.CATEGORIES);

    panel.innerHTML = `
      <div class="notice-view-inner">
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
              placeholder="Your name"
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
              placeholder="Post an operational update…"
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

      // Append single card without full re-render (snappy)
      const feed = document.getElementById('notice-feed');
      if (feed) {
        // Remove empty state if present
        const empty = feed.querySelector('.notice-empty');
        if (empty) empty.remove();

        const div = document.createElement('div');
        div.innerHTML = _renderNotice(notice);
        feed.appendChild(div.firstElementChild);
        feed.scrollTop = feed.scrollHeight;
      }

      msgEl.focus();
    });
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    _renderCompose();

    NoticeStore.getAll().then(notices => {
      _renderFeed(notices);
    });
  }

  return { init, submitPost };

})();
