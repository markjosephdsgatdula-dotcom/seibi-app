const fs = require('fs');
const path = require('path');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\SHOP4';
const configPath = path.join(userProfile, '.config', 'configstore', 'firebase-tools.json');

try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log('Tokens object keys:', Object.keys(config.tokens));
  
  // Let's check if there is a client_id in the tokens or user or configuration
  // We can search the whole JSON (recursively check keys) for 'client' or 'id'
  function findKeys(obj, prefix = '') {
    if (!obj || typeof obj !== 'object') return;
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (k.toLowerCase().includes('client') || k.toLowerCase().includes('id')) {
        console.log(`Found matching key at: ${path}`);
        if (typeof v === 'string' && v.length < 200) {
          console.log(`  - Value: ${v}`);
        }
      }
      findKeys(v, path);
    }
  }
  
  findKeys(config);
  
} catch (err) {
  console.error(err);
}
