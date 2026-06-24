/**
 * components/login-modal.js — Login Screen HTML Component
 *
 * Pure HTML string generator for the login modal.
 * No DOM access. No state. Receives error message as parameter.
 */

'use strict';

const LoginModal = (() => {

  /**
   * Returns the full login modal HTML.
   * @param {string} [errorMsg] — optional error message to display
   * @returns {string} HTML string
   */
  function render(errorMsg) {
    const isJp = typeof I18n !== 'undefined' && I18n.getLang() === 'jp';

    return `
      <div class="login-modal-backdrop">
        <div class="login-modal-panel">

          <!-- Logo / App Name -->
          <div class="login-header">
            <div class="login-logo">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              </svg>
            </div>
            <h1 class="login-app-name">Seibi</h1>
            <p class="login-subtitle">${isJp ? '設備管理システム' : 'Equipment Management System'}</p>
          </div>

          <!-- Form -->
          <div class="login-form">

            ${errorMsg ? `
              <div class="login-error" id="login-error-msg">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                ${Utils.escapeHtml(errorMsg)}
              </div>
            ` : ''}

            <div class="login-field">
              <label class="login-label" for="login-username">
                ${isJp ? 'ユーザー名' : 'Username'}
              </label>
              <input
                id="login-username"
                class="login-input"
                type="text"
                placeholder="${isJp ? 'ユーザー名を入力' : 'Enter username'}"
                autocomplete="username"
                autocapitalize="none"
                spellcheck="false"
              />
            </div>

            <div class="login-field">
              <label class="login-label" for="login-password">
                ${isJp ? 'パスワード' : 'Password'}
              </label>
              <input
                id="login-password"
                class="login-input"
                type="password"
                placeholder="${isJp ? 'パスワードを入力' : 'Enter password'}"
                autocomplete="current-password"
              />
            </div>

            <button
              id="login-submit-btn"
              class="login-submit-btn"
              onclick="App.Auth.submitLogin()"
            >
              ${isJp ? 'ログイン' : 'Sign In'}
            </button>

          </div>

        </div>
      </div>
    `;
  }

  return { render };

})();
