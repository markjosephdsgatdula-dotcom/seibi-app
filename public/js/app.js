/**
 * app.js — Seibi Application Bootstrap
 *
 * Boot sequence:
 *  1. Init language engine
 *  2. Check for existing Firebase session (AuthService.restoreSession)
 *  3a. No session → show login modal, block all views
 *  3b. Session found → fetch role → init views → init router
 *
 * Auth flow:
 *  App.Auth.submitLogin()  — called by login modal submit button
 *  App.Auth.logout()       — called by logout button in header
 */

'use strict';

const App = (() => {

  // ─── Nav ──────────────────────────────────────────────────────────────────

  const Nav = {
    switchTo(viewId) { Router.navigate(viewId); },
  };

  // ─── Translations & Language Switcher ────────────────────────────────────

  function _translateStaticShell() {
    if (typeof I18n === 'undefined') return;
    const mappings = {
      '#tab-home .nav-label':      'nav_home',
      '#tab-assets .nav-label':    'nav_assets',
      '#tab-history .nav-label':   'nav_history',
      '#tab-notice .nav-label':    'nav_notice',
      '#tab-manual .nav-label':    'nav_manual',
      '#view-assets .view-title':  'nav_assets',
      '#view-history .view-title': 'hist_title',
      '#view-manual .view-title':  'manual_title'
    };
    for (const [selector, key] of Object.entries(mappings)) {
      const el = document.querySelector(selector);
      if (el) el.textContent = I18n.t(key);
    }
  }

  function _updateLangUI(lang) {
    const enBtn = document.getElementById('lang-btn-en');
    const jpBtn = document.getElementById('lang-btn-jp');
    if (enBtn && jpBtn) {
      enBtn.classList.toggle('active', lang === 'en');
      jpBtn.classList.toggle('active', lang === 'jp');
    }
  }

  // ─── User badge & logout button in header ─────────────────────────────────

  function _renderUserBadge(username, role) {
    const container = document.getElementById('user-badge-slot');
    if (!container) return;
    const isJp  = I18n.getLang() === 'jp';
    const label = role === 'admin' ? (isJp ? '管理者' : 'Admin') : (isJp ? '作業員' : 'Operator');
    container.innerHTML = `
      <div class="user-badge">
        <span>${Utils.escapeHtml(username)}</span>
        <span class="user-badge-role ${role === 'admin' ? 'user-badge-role--admin' : ''}">${label}</span>
        <button class="logout-btn" onclick="App.Auth.logout()">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          ${isJp ? 'ログアウト' : 'Sign Out'}
        </button>
      </div>
    `;
  }

  // ─── Notification permission prompt banner ────────────────────────────────

  function _showNotifPromptBanner() {
    const header = document.querySelector('.view-header');
    if (!header || document.getElementById('notif-prompt-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'notif-prompt-banner';
    banner.style.cssText = [
      'background:#252a3e', 'border-left:4px solid #4f7cff', 'color:#ffffff',
      'padding:var(--space-3) var(--space-4)', 'border-radius:var(--radius-sm)',
      'margin-bottom:var(--space-4)', 'display:flex', 'justify-content:space-between',
      'align-items:center', 'font-size:var(--font-size-sm)',
      'box-shadow:0 4px 12px rgba(0,0,0,0.4)',
    ].join(';');

    banner.innerHTML = `
      <span style="display:flex;align-items:center;gap:var(--space-2);font-weight:var(--font-weight-medium);color:#ffffff;">
        <span style="font-size:16px;">🔔</span> 点検アラートのプッシュ通知を有効にしますか？
      </span>
      <div style="display:flex;align-items:center;gap:var(--space-3);">
        <button id="btn-notif-allow" style="background:#4f7cff;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:var(--font-weight-bold);font-size:var(--font-size-xs);">許可する</button>
        <button id="btn-notif-dismiss" style="background:none;border:none;color:#a1a8c9;cursor:pointer;padding:4px;font-size:16px;font-weight:bold;">✕</button>
      </div>
    `;

    header.parentNode.insertBefore(banner, header.nextSibling);
    document.getElementById('btn-notif-allow').addEventListener('click', () => {
      NotificationService.requestPermission().then(() => { banner.remove(); });
    });
    document.getElementById('btn-notif-dismiss').addEventListener('click', () => { banner.remove(); });
  }

  // ─── Login modal ──────────────────────────────────────────────────────────

  function _showLoginModal(errorMsg) {
    let overlay = document.getElementById('login-overlay');
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = 'login-overlay';
    overlay.innerHTML = LoginModal.render(errorMsg);
    document.body.appendChild(overlay);

    // Submit on Enter key in password field
    setTimeout(() => {
      const pwEl = document.getElementById('login-password');
      if (pwEl) pwEl.addEventListener('keydown', e => {
        if (e.key === 'Enter') Auth.submitLogin();
      });
    }, 50);
  }

  function _hideLoginModal() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.remove();
  }

  // ─── Auth namespace (exposed on App.Auth) ─────────────────────────────────

  const Auth = {
    submitLogin() {
      const usernameEl = document.getElementById('login-username');
      const passwordEl = document.getElementById('login-password');
      const btn        = document.getElementById('login-submit-btn');

      const username = usernameEl ? usernameEl.value.trim() : '';
      const password = passwordEl ? passwordEl.value : '';
      const isJp     = I18n.getLang() === 'jp';

      if (!username || !password) {
        _showLoginModal(isJp ? 'ユーザー名とパスワードを入力してください。' : 'Please enter your username and password.');
        return;
      }

      if (btn) { btn.disabled = true; btn.textContent = isJp ? 'ログイン中...' : 'Signing in...'; }

      AuthService.login(username, password)
        .then(({ role, username: uname }) => {
          _hideLoginModal();
          _initApp(uname, role);
        })
        .catch(err => {
          console.error('[Auth] Login failed:', err);
          const msg = isJp ? 'ユーザー名またはパスワードが正しくありません。' : 'Incorrect username or password.';
          _showLoginModal(msg);
        });
    },

    logout() {
      const isJp = I18n.getLang() === 'jp';
      if (!confirm(isJp ? 'ログアウトしますか？' : 'Sign out?')) return;
      AuthService.logout().then(() => {
        // Clear user badge
        const badge = document.getElementById('user-badge-slot');
        if (badge) badge.innerHTML = '';
        // Show login modal
        _showLoginModal();
      });
    },
  };

  // ─── Core app initialisation (runs after successful login) ───────────────

  function _initApp(username, role) {
    _renderUserBadge(username, role);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('[App] ServiceWorker registered:', reg.scope);
          if (typeof ReminderStore !== 'undefined') ReminderStore.setServiceWorker(reg);
        })
        .catch(err => console.warn('[App] ServiceWorker failed:', err));
    }

    // Notification permission prompt
    if (typeof NotificationService !== 'undefined') {
      const { needsPrompt } = NotificationService.init();
      if (needsPrompt) _showNotifPromptBanner();
    }

    // Start Firebase sync then init all views
    if (typeof FirebaseSync !== 'undefined') {
      FirebaseSync.start().then(() => {
        _initViews();
        Router.init();
        _registerDataListeners();
      });
    } else {
      _initViews();
      Router.init();
      _registerDataListeners();
    }
  }

  function _initViews() {
    HomeView.init();
    CalendarView.init();
    HistoryView.init();
    NoticeView.init();
    AssetsView.init();
    WireMapView.init();
    ManualView.init();
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────

  function _boot() {
    if (typeof I18n !== 'undefined') {
      I18n.init();
      _updateLangUI(I18n.getLang());
      _translateStaticShell();
    }

    const APP_VERSION = 'v35_rbac';
    try {
      const currentVer = localStorage.getItem('seibi_app_version');
      if (currentVer !== APP_VERSION) {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith('seibi_')) localStorage.removeItem(key);
        }
        localStorage.setItem('seibi_app_version', APP_VERSION);
      }
    } catch (_) {}

    // Check for existing Firebase session before showing anything
    AuthService.restoreSession().then(session => {
      if (session) {
        // Already logged in (page refresh) — go straight to app
        _initApp(session.username, session.role);
      } else {
        // Not logged in — show login screen
        _showLoginModal();
      }
    });

    // Language change listener
    window.addEventListener('seibi_language_changed', (e) => {
      const lang = e.detail;
      _updateLangUI(lang);
      _translateStaticShell();
      if (typeof NotificationService !== 'undefined') NotificationService.updateTokenLang(lang);
      if (typeof HomeView    !== 'undefined') HomeView.refresh();
      if (typeof CalendarView !== 'undefined') CalendarView.init();
      if (typeof HistoryView !== 'undefined') HistoryView.init();
      if (typeof NoticeView  !== 'undefined') NoticeView.init();
      if (typeof AssetsView  !== 'undefined') AssetsView.refresh();
      if (typeof WireMapView !== 'undefined') WireMapView.refresh();
      if (typeof ManualView  !== 'undefined') ManualView.refresh();
    });

    console.log('[Seibi] App booted.');
  }

  // ─── Data change subscriptions ────────────────────────────────────────────

  function _registerDataListeners() {
    window.addEventListener('seibi_data_changed', (e) => {
      const node = e.detail && e.detail.node;
      switch (node) {
        case 'assets':
          if (typeof AssetsView !== 'undefined') AssetsView.refresh();
          if (typeof HomeView   !== 'undefined') HomeView.refresh();
          break;
        case 'tasks':
          if (typeof HomeView     !== 'undefined') HomeView.refresh();
          if (typeof CalendarView !== 'undefined') CalendarView.init();
          break;
        case 'notices':
          if (typeof NoticeView !== 'undefined') NoticeView.refreshFeed();
          break;
        case 'history':
          if (typeof HistoryView !== 'undefined') HistoryView.init();
          break;
        case 'equipment':
        case 'wires':
          if (typeof WireMapView !== 'undefined') WireMapView.refresh();
          break;
        default:
          console.warn('[App] seibi_data_changed: unknown node:', node);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _boot);
  } else {
    _boot();
  }

  // ─── Public surface ───────────────────────────────────────────────────────

  return {
    Nav,
    Auth,
    HomeView,
    CalendarView,
    HistoryView,
    NoticeView,
    AssetsView,
    WireMapView,
    ManualView,
  };

})();
