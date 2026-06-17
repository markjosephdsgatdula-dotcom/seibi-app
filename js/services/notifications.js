'use strict';

const NotificationService = (() => {
  let isSupported = 'Notification' in window && 'serviceWorker' in navigator;
  let hasGranted = isSupported && Notification.permission === 'granted';
  let _currentToken = null;

  function init() {
    try {
      _currentToken = localStorage.getItem('seibi_fcm_token');
    } catch (_) {}

    if (!isSupported) {
      console.warn('[Notifications] Not supported in this browser.');
      return;
    }

    if (Notification.permission === 'granted') {
      hasGranted = true;
      _setupFCM();
      _checkAndNotifyDueTasks(); // Fallback local check
    } else if (Notification.permission !== 'denied') {
      _showPermissionPrompt();
    }
  }

  function _showPermissionPrompt() {
    const header = document.querySelector('.view-header');
    if (!header || document.getElementById('notif-prompt-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'notif-prompt-banner';
    banner.style.cssText = `
      background: #252a3e; /* Solid elevated dark blue-gray */
      border-left: 4px solid #4f7cff; /* Solid brand blue accent border */
      color: #ffffff; /* Explicit pure white for text */
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-sm);
      margin-bottom: var(--space-4);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: var(--font-size-sm);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    `;
    
    banner.innerHTML = `
      <span style="display:flex; align-items:center; gap:var(--space-2); font-weight:var(--font-weight-medium); color:#ffffff;">
        <span style="font-size:16px;">🔔</span> \${I18n.t('notif_prompt_text')}
      </span>
      <div style="display:flex; align-items:center; gap:var(--space-3);">
        <button id="btn-notif-allow" style="background:#4f7cff; color:#ffffff; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-weight:var(--font-weight-bold); font-size:var(--font-size-xs); box-shadow: 0 2px 4px rgba(0,0,0,0.2);">\${I18n.t('notif_prompt_allow')}</button>
        <button id="btn-notif-dismiss" style="background:none; border:none; color:#a1a8c9; cursor:pointer; padding:4px; font-size:16px; font-weight:bold;">✕</button>
      </div>
    `;

    header.parentNode.insertBefore(banner, header.nextSibling);

    document.getElementById('btn-notif-allow').addEventListener('click', () => {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          hasGranted = true;
          banner.remove();
          _setupFCM();
          _checkAndNotifyDueTasks();
        } else {
          banner.remove();
        }
      });
    });

    document.getElementById('btn-notif-dismiss').addEventListener('click', () => {
      banner.remove();
    });
  }

  function _setupFCM() {
    if (typeof firebaseMessaging === 'undefined' || !firebaseMessaging) {
      console.warn('[FCM] Messaging not initialized.');
      return;
    }

    const VAPID_KEYS = {
      staging: 'BB5uw1Q-xcfAOEtRc5518F8Tv3CrfLYvx0JoMDxvXPRKGqtfavoBDgaNWCq8Bdp7D16VtIrKU1LqfLOela94Jeo',
      production: 'BCKRHaLHf6L4CZJx9HEF4vgSllQE9FWupTGOXnJwFfIJYvyuy2YP5UH4wT0cVM6wfh5sy1TJiPI6HxIeriGYh8o'
    };

    const env = typeof SEIBI_ENV !== 'undefined' ? SEIBI_ENV : 'production';
    const vapidKey = VAPID_KEYS[env];

    // Use the main Service Worker registration for FCM
    navigator.serviceWorker.ready
      .then((registration) => {
        return firebaseMessaging.getToken({
          vapidKey: vapidKey,
          serviceWorkerRegistration: registration
        });
      })
      .then((currentToken) => {
        if (currentToken) {
          console.log(`[FCM] Got device token (${env}):`, currentToken);
          _saveTokenToDb(currentToken);
        } else {
          console.warn('[FCM] No registration token available. Request permission to generate one.');
        }
      }).catch((err) => {
        console.error('[FCM] An error occurred while retrieving token. ', err);
      });

    firebaseMessaging.onMessage((payload) => {
      console.log('[FCM] Message received. ', payload);
      const { title, body } = payload.notification || {};
      if (title && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          payload: { title, body, tag: 'fcm-push' }
        });
      }
    });
  }

  function _saveTokenToDb(token) {
    _currentToken = token;
    try {
      localStorage.setItem('seibi_fcm_token', token);
    } catch (_) {}

    if (typeof firebaseDb !== 'undefined') {
      // Store token with device info/timestamp and current language preference
      firebaseDb.ref('fcmTokens/' + token).set({
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        lang: typeof I18n !== 'undefined' ? I18n.getLang() : 'en'
      }).catch(e => console.error('[FCM] Error saving token:', e));
    }
  }

  function updateTokenLang(lang) {
    if (!_currentToken) {
      try {
        _currentToken = localStorage.getItem('seibi_fcm_token');
      } catch (_) {}
    }
    if (_currentToken && typeof firebaseDb !== 'undefined') {
      firebaseDb.ref(`fcmTokens/${_currentToken}/lang`).set(lang)
        .catch(e => console.error('[FCM] Error updating token lang:', e));
    }
  }

  function _checkAndNotifyDueTasks() {
    if (!hasGranted || typeof MockDB === 'undefined') return;

    setTimeout(() => {
      MockDB.getAllTasks().then(tasks => {
        const dueTasks = tasks.filter(t => t.status === 'pending' || t.status === 'overdue');
        if (dueTasks.length > 0) {
          const overdueCount = dueTasks.filter(t => t.status === 'overdue').length;
          let title = I18n.t('notif_title');
          let body = I18n.t('notif_body_tasks').replace('{count}', dueTasks.length);
          if (overdueCount > 0) {
            body += I18n.t('notif_body_overdue').replace('{count}', overdueCount);
          }

          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_NOTIFICATION',
              payload: { title, body, tag: 'seibi-daily-reminder' }
            });
          } else {
            new Notification(title, { body, icon: './images/icon.svg', tag: 'seibi-daily-reminder' });
          }
        }
      });
    }, 2000);
  }

  return { init, checkDueTasks: _checkAndNotifyDueTasks, updateTokenLang };
})();
