/**
 * services/auth-service.js — Authentication & Role Service
 *
 * Responsibilities:
 *   - Login / logout via Firebase Email+Password (username@seibi.internal pattern)
 *   - Fetch and cache the user's role from /roles/{uid}
 *   - Expose role checks: isAdmin(), getUsername()
 *
 * NO DOM access. All UI is handled by app.js and components/login-modal.js.
 */

'use strict';

const AuthService = (() => {

  const DOMAIN     = '@seibi.internal';
  const ROLE_PATH  = 'roles';

  let _role     = null;   // 'admin' | 'user' | null
  let _username = null;   // display name (without domain)
  let _uid      = null;

  // ─── Internal helpers ─────────────────────────────────────────────────────

  function _toEmail(username) {
    return username.trim().toLowerCase() + DOMAIN;
  }

  function _fromEmail(email) {
    return email.replace(DOMAIN, '');
  }

  // ─── Public: login ────────────────────────────────────────────────────────

  /**
   * Sign in with username + password.
   * Fetches role from /roles/{uid} after successful auth.
   * @param {string} username
   * @param {string} password
   * @returns {Promise<{ role: string, username: string }>}
   */
  function login(username, password) {
    const email = _toEmail(username);

    return firebaseAuth.signInWithEmailAndPassword(email, password)
      .then(credential => {
        _uid      = credential.user.uid;
        _username = _fromEmail(credential.user.email);
        return _fetchRole(_uid);
      })
      .then(role => {
        _role = role;
        console.log(`[Auth] Logged in as "${_username}" with role "${_role}"`);
        return { role: _role, username: _username };
      });
  }

  // ─── Public: logout ───────────────────────────────────────────────────────

  function logout() {
    return firebaseAuth.signOut().then(() => {
      _role     = null;
      _username = null;
      _uid      = null;
      console.log('[Auth] Logged out.');
    });
  }

  // ─── Public: restore session on page reload ───────────────────────────────

  /**
   * Check if Firebase already has an active session (e.g. after page refresh).
   * Resolves with { role, username } if session exists, or null if not logged in.
   * @returns {Promise<{ role: string, username: string } | null>}
   */
  function restoreSession() {
    return new Promise(resolve => {
      firebaseAuth.onAuthStateChanged(user => {
        // No session, or a leftover anonymous session — sign out and show login
        if (!user || user.isAnonymous || !user.email) {
          firebaseAuth.signOut().then(() => resolve(null));
          return;
        }
        _uid      = user.uid;
        _username = _fromEmail(user.email);
        _fetchRole(_uid).then(role => {
          _role = role;
          console.log(`[Auth] Session restored for "${_username}" (${_role})`);
          resolve({ role: _role, username: _username });
        });
      });
    });
  }

  // ─── Public: role checks ──────────────────────────────────────────────────

  function isAdmin()     { return _role === 'admin'; }
  function getRole()     { return _role; }
  function getUsername() { return _username || ''; }
  function getUid()      { return _uid; }

  // ─── Private: fetch role from Firebase ───────────────────────────────────

  function _fetchRole(uid) {
    return firebaseDb.ref(`${ROLE_PATH}/${uid}`).once('value')
      .then(snap => {
        const role = snap.val();
        if (!role) {
          console.warn(`[Auth] No role found for uid ${uid}. Defaulting to "user".`);
          return 'user';
        }
        return role;
      });
  }

  return {
    login,
    logout,
    restoreSession,
    isAdmin,
    getRole,
    getUsername,
    getUid,
  };

})();
