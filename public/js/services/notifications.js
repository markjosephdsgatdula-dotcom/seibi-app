/**
 * services/notifications.js — Pure notification & FCM service
 *
 * Responsibilities:
 *   - Check notification permission state
 *   - Set up Firebase Cloud Messaging (FCM) token
 *   - Save/update device token in Firebase
 *   - Fire local SW notifications for due tasks
 *
 * NO DOM access here. The permission prompt banner is rendered
 * by app.js (the boot orchestrator) after calling init().
 */

'use strict';

const NotificationService = (() => {
  let isSupported = 'Notification' in window && 'serviceWorker' in navigator;
  let hasGranted  = isSupported && Notification.permission === 'granted';
  let _currentToken = null;

  // ─── Public: initialise ────────────────────────────────────────────────

  /**
   * Initialise the notification service.
   * @returns {{ needsPrompt: boolean }}
   *   needsPrompt — true when the browser has not yet been asked for permission.
   *   The caller (app.js) is responsible for showing the UI prompt if needed.
   */
  function init() {
    try {
      _currentToken = localStorage.getItem('seibi_fcm_token');
    } catch (_) {}

    if (!isSupported) {
      console.warn('[Notifications] Not supported in this browser.');
      return { needsPrompt: false };
    }

    if (Notification.permission === 'granted') {
      hasGranted = true;
      _setupFCM();
      _checkAndNotifyDueTasks();
      return { needsPrompt: false };
    }

    if (Notification.permission === 'denied') {
      return { needsPrompt: false };
    }

    // Permission is 'default' — caller should show a prompt
    return { needsPrompt: true };
  }

  // ─── Public: request permission (called when user taps Allow) ─────────

  /**
   * Trigger the browser permission dialog.
   * Resolves to true if granted, false otherwise.
   * @returns {Promise<boolean>}
   */
  function requestPermission() {
    return Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        hasGranted = true;
        _setupFCM();
        _checkAndNotifyDueTasks();
        return true;
      }
      return false;
    });
  }

  // ─── Public: update token language after lang switch ──────────────────

  function updateTokenLang(lang) {
    if (!_currentToken) {
      try { _currentToken = localStorage.getItem('seibi_fcm_token'); } catch (_) {}
    }
    if (_currentToken && typeof firebaseDb !== 'undefined') {
      firebaseDb.ref(`fcmTokens/${_currentToken}/lang`).set(lang)
        .catch(e => console.error('[FCM] Error updating token lang:', e));
    }
  }

  // ─── Private: FCM setup ───────────────────────────────────────────────

  function _setupFCM() {
    if (typeof firebaseMessaging === 'undefined' || !firebaseMessaging) {
      console.warn('[FCM] Messaging not initialized.');
      return;
    }

    const VAPID_KEYS = {
      staging:    'BB5uw1Q-xcfAOEtRc5518F8Tv3CrfLYvx0JoMDxvXPRKGqtfavoBDgaNWCq8Bdp7D16VtIrKU1LqfLOela94Jeo',
      production: 'BCKRHaLHf6L4CZJx9HEF4vgSllQE9FWupTGOXnJwFfIJYvyuy2YP5UH4wT0cVM6wfh5sy1TJiPI6HxIeriGYh8o'
    };

    const env      = typeof SEIBI_ENV !== 'undefined' ? SEIBI_ENV : 'production';
    const vapidKey = VAPID_KEYS[env];

    navigator.serviceWorker.ready
      .then(registration => firebaseMessaging.getToken({ vapidKey, serviceWorkerRegistration: registration }))
      .then(currentToken => {
        if (currentToken) {
          console.log(`[FCM] Got device token (${env}):`, currentToken);
          _saveTokenToDb(currentToken);
        } else {
          console.warn('[FCM] No registration token. Request permission first.');
        }
      })
      .catch(err => console.error('[FCM] Error retrieving token:', err));

    firebaseMessaging.onMessage(payload => {
      console.log('[FCM] Message received:', payload);
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
    try { localStorage.setItem('seibi_fcm_token', token); } catch (_) {}

    if (typeof firebaseDb !== 'undefined') {
      firebaseDb.ref('fcmTokens/' + token).set({
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        lang: typeof I18n !== 'undefined' ? I18n.getLang() : 'en'
      }).catch(e => console.error('[FCM] Error saving token:', e));
    }
  }

  // ─── Private: local due-task check ────────────────────────────────────

  function _checkAndNotifyDueTasks() {
    if (!hasGranted || typeof MockDB === 'undefined') return;

    setTimeout(() => {
      MockDB.getAllTasks().then(tasks => {
        const offset   = new Date().getTimezoneOffset() * 60000;
        const todayStr = new Date(Date.now() - offset).toISOString().slice(0, 10);

        const dueTasks     = tasks.filter(t => t.status !== 'done' && t.dueDate <= todayStr);
        const overdueCount = dueTasks.filter(t => t.dueDate < todayStr).length;

        if (dueTasks.length > 0) {
          const title = '整備点検リマインダー';
          let body    = `本日の点検タスクが ${dueTasks.length} 件あります。`;
          if (overdueCount > 0) body += `（期限超過 ${overdueCount} 件！）`;

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

  return { init, requestPermission, updateTokenLang, checkDueTasks: _checkAndNotifyDueTasks };

})();
