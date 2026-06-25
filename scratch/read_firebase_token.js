const fs = require('fs');
const path = require('path');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\SHOP4';
const paths = [
  path.join(userProfile, '.config', 'configstore', '@firebase', 'tools.json'),
  path.join(userProfile, '.config', 'configstore', 'firebase-tools.json'),
  path.join(userProfile, '.config', 'configstore', '@firebase-tools.json')
];

paths.forEach(p => {
  if (fs.existsSync(p)) {
    console.log('Found config file at:', p);
    try {
      const content = fs.readFileSync(p, 'utf8');
      const json = JSON.parse(content);
      console.log('Keys in config file:', Object.keys(json));
      if (json.tokens) {
        console.log('Tokens found:', Object.keys(json.tokens));
      }
      if (json.user) {
        console.log('User logged in:', json.user.email);
      }
    } catch (err) {
      console.error('Error reading config file:', err.message);
    }
  } else {
    console.log('No file at:', p);
  }
});
