const { exec } = require('child_process');
const fs = require('fs');

function fetchAndCleanNode(pathName) {
  return new Promise((resolve, reject) => {
    console.log(`Fetching /${pathName} from database...`);
    exec(`firebase database:get /${pathName}`, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        console.error(`Error fetching ${pathName}:`, err);
        return reject(err);
      }
      
      try {
        const data = JSON.parse(stdout);
        console.log(`Success! Fetched /${pathName}.`);
        
        // Log keys and sample
        const items = Array.isArray(data) ? data : Object.values(data);
        console.log(`Total items in ${pathName}:`, items.length);
        if (items.length > 0) {
          console.log(`Sample item from ${pathName}:`, JSON.stringify(items[0], null, 2));
        }
        
        // Recursively walk the object and replace "generic-check.png" with null
        let cleanData = cleanObject(data);
        
        resolve(cleanData);
      } catch (parseErr) {
        console.error(`JSON parse error for ${pathName}:`, parseErr.message);
        reject(parseErr);
      }
    });
  });
}

function cleanObject(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => cleanObject(item));
  }
  
  if (typeof obj === 'object') {
    const newObj = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val === 'generic-check.png') {
        // Set to null to hide from the UI (broken image icon)
        newObj[key] = null;
      } else {
        newObj[key] = cleanObject(val);
      }
    }
    return newObj;
  }
  
  if (obj === 'generic-check.png') {
    return null;
  }
  
  return obj;
}

Promise.all([
  fetchAndCleanNode('notices'),
  fetchAndCleanNode('history')
]).then(([cleanNotices, cleanHistory]) => {
  // Save clean data locally
  fs.writeFileSync('notices_cleaned.json', JSON.stringify(cleanNotices, null, 2), 'utf8');
  fs.writeFileSync('history_cleaned.json', JSON.stringify(cleanHistory, null, 2), 'utf8');
  console.log('Saved cleaned data locally to notices_cleaned.json and history_cleaned.json');
  
  // Upload to live database
  console.log('Uploading clean notices and history to Firebase Database...');
  
  exec('firebase database:set /notices notices_cleaned.json -f', (err1, out1) => {
    if (err1) console.error('Error setting /notices:', err1);
    else console.log('Successfully updated /notices in Firebase!');
    
    exec('firebase database:set /history history_cleaned.json -f', (err2, out2) => {
      if (err2) console.error('Error setting /history:', err2);
      else console.log('Successfully updated /history in Firebase!');
    });
  });
}).catch(err => {
  console.error('Failure:', err);
});
