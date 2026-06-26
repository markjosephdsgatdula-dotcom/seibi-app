/**
 * cleanup_db.js — One-shot database cleanup script for Seibi App
 * Uses the firebase-tools library directly (same as firebase CLI) to authenticate
 * Run with: node scratch/cleanup_db.js
 */

const https = require('https');
const { execSync } = require('child_process');
const path = require('path');

const DB_URL = 'https://seibi-app-default-rtdb.asia-southeast1.firebasedatabase.app';

// ─── Get access token via firebase configstore ───────────────────────────────
async function getToken() {
  const fs = require('fs');
  // Discovered path: %USERPROFILE%\.config\configstore\firebase-tools.json
  const configstorePath = path.join(
    process.env.USERPROFILE || process.env.HOME,
    '.config', 'configstore', 'firebase-tools.json'
  );
  try {
    const config = JSON.parse(fs.readFileSync(configstorePath, 'utf8'));
    const tokens = config.tokens;
    if (!tokens) throw new Error('No tokens found in configstore');
    if (tokens.access_token && (!tokens.expires_at || tokens.expires_at > Date.now())) {
      return tokens.access_token;
    }
    if (tokens.refresh_token) {
      return await refreshAccessToken(tokens.refresh_token);
    }
    throw new Error('No valid token found');
  } catch (e) {
    throw new Error('Could not get auth token: ' + e.message);
  }
}

async function refreshAccessToken(refreshToken) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8vu8h7o1BI2xKLV6M',
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });
    const options = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try {
          const data = JSON.parse(raw);
          resolve(data.access_token);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────
function firebaseRequest(method, dbPath, data, token) {
  return new Promise((resolve, reject) => {
    const urlStr = `${DB_URL}${dbPath}.json?access_token=${encodeURIComponent(token)}`;
    const url = new URL(urlStr);
    const body = data !== undefined ? JSON.stringify(data) : undefined;
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {})
      }
    };
    const req = https.request(options, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
          return;
        }
        try { resolve(raw ? JSON.parse(raw) : null); }
        catch (e) { resolve(raw); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const dbGet = (p, t) => firebaseRequest('GET', p, undefined, t);
const dbSet = (p, d, t) => firebaseRequest('PUT', p, d, t);
const dbDel = (p, t) => firebaseRequest('DELETE', p, undefined, t);

// ─── July auto-generated task copies to DELETE ───────────────────────────────
const JULY_COPIES = new Set([
  'task-robot-1782078767510',
  'task-robot-1782079100657',
  'task-robot-1782079130112',
  'task-robot-1782200155744',
  'task-robot-1782079207929',
  'task-robot-1782075810181',
  'task-robot-1782079183085',
]);

// ─── Stale repair/done test tasks to DELETE ───────────────────────────────────
const STALE_TASKS = new Set([
  'task-repair-notice-1782079100617',
  'task-repair-notice-1782079130087',
  'task-repair-notice-1782079183059',
  'task-repair-notice-1782089804544',
  'task-repair-notice-1782200155495',
  'task-robot-1782374310454',
  'task-custom-1781840603995',
]);

// ─── June inspection tasks to reset to "pending" ─────────────────────────────
const JUNE_RESET = new Set([
  'task-robot-03',
  'task-robot-05',
  'task-robot-06',
  'task-robot-tig-01',
  'task-utility-gas-01',
  'task-regulator-01',
  'task-regulator-02',
]);

// ─── Asset status resets ──────────────────────────────────────────────────────
const ASSET_RESETS = {
  'asset-robot-03':       { status: 'healthy', dueDate: '2026-06-10', lastInspected: '2026-05-13', location: 'Bay B', templateId: 'template-co2-mag' },
  'asset-robot-04':       { status: 'healthy', dueDate: '2026-06-10', lastInspected: '2026-05-13', location: 'Bay B', templateId: 'template-co2-mag' },
  'asset-robot-05':       { status: 'healthy', dueDate: '2026-06-10', lastInspected: '2026-05-13', location: 'Bay C', templateId: 'template-co2-mag' },
  'asset-robot-06':       { status: 'healthy', dueDate: '2026-06-10', lastInspected: '2026-05-13', location: 'Bay C', templateId: 'template-co2-mag' },
  'asset-robot-tig-01':   { status: 'healthy', dueDate: '2026-06-10', lastInspected: '2026-05-13', location: 'Bay D', templateId: 'template-co2-mag' },
  'asset-regulator-01':   { status: 'healthy', dueDate: '2026-06-10', lastInspected: '2026-05-13', location: 'Pillar Left', templateId: 'template-regulator' },
  'asset-regulator-02':   { status: 'healthy', dueDate: '2026-06-10', lastInspected: '2026-05-13', location: 'Pillar Right', templateId: 'template-regulator' },
  'asset-utility-gas-01': { status: 'healthy', dueDate: '2026-06-10', lastInspected: '2026-05-13', location: '1F Courtyard', templateId: 'template-utility-gas' },
};

async function main() {
  console.log('=== Seibi DB Cleanup Starting ===\n');

  // Get token
  const token = await getToken();
  if (!token) {
    console.error('❌ Could not get auth token. Please run: firebase login');
    process.exit(1);
  }
  console.log('✓ Auth token obtained.\n');

  // 1. Clear /history
  console.log('[1/4] Clearing /history...');
  await dbDel('/history', token);
  console.log('      ✓ /history cleared.\n');

  // 2. Clear /notices
  console.log('[2/4] Clearing /notices...');
  await dbDel('/notices', token);
  console.log('      ✓ /notices cleared.\n');

  // 3. Tasks
  console.log('[3/4] Cleaning up /tasks...');
  const rawTasks = await dbGet('/tasks', token);
  if (!rawTasks) {
    console.log('      (no tasks found)\n');
  } else {
    const list = Array.isArray(rawTasks) ? rawTasks : Object.values(rawTasks);
    let deleted = 0, reset = 0;

    const cleaned = list
      .filter(t => {
        if (!t) return false;
        if (JULY_COPIES.has(t.id))  { console.log(`      🗑  July copy:  ${t.id}`); deleted++; return false; }
        if (STALE_TASKS.has(t.id))  { console.log(`      🗑  Stale:      ${t.id}`); deleted++; return false; }
        return true;
      })
      .map(t => {
        if (JUNE_RESET.has(t.id)) {
          console.log(`      ♻️  → pending:   ${t.id}`);
          reset++;
          return { ...t, status: 'pending' };
        }
        return t;
      });

    await dbSet('/tasks', cleaned, token);
    console.log(`\n      ✓ Done. Deleted: ${deleted}, Reset: ${reset}, Remaining: ${cleaned.length}\n`);
  }

  // 4. Assets
  console.log('[4/4] Resetting /assets...');
  const rawAssets = await dbGet('/assets', token);
  if (!rawAssets) {
    console.log('      (no assets found)\n');
  } else {
    const list = Array.isArray(rawAssets) ? rawAssets : Object.values(rawAssets);
    const reset = list.map(a => {
      if (ASSET_RESETS[a.id]) {
        console.log(`      ♻️  ${a.id}: ${a.status} → healthy`);
        return { ...a, ...ASSET_RESETS[a.id] };
      }
      return a;
    });
    await dbSet('/assets', reset, token);
    console.log('      ✓ Assets reset.\n');
  }

  console.log('=== ✅ Cleanup Complete! ===');
  console.log('  /history    → cleared');
  console.log('  /notices    → cleared');
  console.log('  July copies → deleted');
  console.log('  June tasks  → pending');
  console.log('  Assets      → healthy');
}

main().catch(err => {
  console.error('\n❌ Error:', err.message || err);
  process.exit(1);
});
