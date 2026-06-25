const fs = require('fs');
const https = require('https');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\SHOP4';
const configPath = path.join(userProfile, '.config', 'configstore', 'firebase-tools.json');

// Helper to hash string
function getMd5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

console.log('Refreshing Firebase CLI token...');
exec('firebase database:get /roles', { maxBuffer: 10 * 1024 * 1024 }, (err) => {
  if (err) {
    console.error('Error refreshing token:', err);
    return;
  }
  
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (readErr) {
    console.error('Error reading config:', readErr.message);
    return;
  }
  
  const accessToken = config.tokens.access_token;
  console.log('Access token obtained.');
  
  try {
    const repairedTemplates = JSON.parse(fs.readFileSync('templates_repaired.json', 'utf8'));
    const liveTemplates = JSON.parse(fs.readFileSync('templates_live_clean.json', 'utf8'));
    
    console.log(`Loaded ${repairedTemplates.length} repaired templates and ${liveTemplates.length} live templates.`);
    
    // Extract unique Base64 images and generate download tokens (UUIDs)
    const base64Map = {};
    repairedTemplates.forEach(t => {
      if (!t.items) return;
      t.items.forEach(item => {
        if (item.image && item.image.startsWith('data:image/')) {
          const base64Data = item.image;
          const hash = getMd5(base64Data);
          
          if (!base64Map[hash]) {
            const mimeType = base64Data.match(/data:([^;]+);/)[1];
            const ext = mimeType.split('/')[1] || 'jpg';
            const filename = `templates/custom_${hash}.${ext}`;
            const token = crypto.randomUUID(); // Download token!
            
            base64Map[hash] = {
              base64: base64Data,
              mimeType: mimeType,
              filename: filename,
              token: token,
              fbUrl: null
            };
          }
        }
      });
    });
    
    const uniqueHashes = Object.keys(base64Map);
    console.log(`Found ${uniqueHashes.length} unique Base64 images.`);
    
    // Run sequential upload and metadata updates
    processUniqueImages(uniqueHashes, base64Map, accessToken, 0, () => {
      // Merge URLs back and upload
      updateTemplatesAndUpload(repairedTemplates, liveTemplates, base64Map);
    });
    
  } catch (err) {
    console.error('Processing error:', err);
  }
});

function processUniqueImages(hashes, map, accessToken, index, callback) {
  if (index >= hashes.length) {
    console.log('All unique image uploads and metadata updates completed.');
    callback();
    return;
  }
  
  const hash = hashes[index];
  const item = map[hash];
  const bucketName = 'seibi-app.firebasestorage.app';
  
  console.log(`\n[${index + 1}/${hashes.length}] Processing unique image (hash: ${hash})...`);
  
  // 1. Upload the image binary
  const base64Content = item.base64.split(',')[1];
  const buffer = Buffer.from(base64Content, 'base64');
  
  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(item.filename)}`;
  
  console.log(`- Uploading binary as ${item.filename}...`);
  const req = https.request(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': item.mimeType,
      'Content-Length': buffer.length
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`- Upload successful. Now setting metadata download token...`);
        patchMetadata(bucketName, item, accessToken, () => {
          // Go to next image after metadata is set
          processUniqueImages(hashes, map, accessToken, index + 1, callback);
        });
      } else {
        console.error(`- Upload failed (status: ${res.statusCode}):`, body);
        processUniqueImages(hashes, map, accessToken, index + 1, callback);
      }
    });
  });
  
  req.on('error', err => {
    console.error(`- Upload request error:`, err.message);
    processUniqueImages(hashes, map, accessToken, index + 1, callback);
  });
  
  req.write(buffer);
  req.end();
}

function patchMetadata(bucketName, item, accessToken, callback) {
  const patchUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeURIComponent(item.filename)}`;
  
  const patchData = JSON.stringify({
    metadata: {
      firebaseStorageDownloadTokens: item.token
    }
  });
  
  const req = https.request(patchUrl, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(patchData)
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        // Construct the authenticated download URL
        const fbUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(item.filename)}?alt=media&token=${item.token}`;
        item.fbUrl = fbUrl;
        console.log(`- Metadata updated successfully! URL: ${fbUrl}`);
      } else {
        console.error(`- Metadata update failed (status: ${res.statusCode}):`, body);
      }
      callback();
    });
  });
  
  req.on('error', err => {
    console.error(`- Metadata request error:`, err.message);
    callback();
  });
  
  req.write(patchData);
  req.end();
}

function updateTemplatesAndUpload(repairedTemplates, liveTemplates, base64Map) {
  console.log('\nUpdating templates with new Storage URLs containing tokens...');
  
  const repairedImageLookup = {};
  repairedTemplates.forEach(t => {
    if (!t.items) return;
    t.items.forEach(item => {
      repairedImageLookup[`${t.id}_${item.id}`] = item.image;
    });
  });
  
  let restoredCount = 0;
  liveTemplates.forEach(t => {
    if (!t.items) return;
    t.items.forEach(item => {
      const repairedImg = repairedImageLookup[`${t.id}_${item.id}`];
      if (repairedImg) {
        if (repairedImg.startsWith('data:image/')) {
          const hash = crypto.createHash('md5').update(repairedImg).digest('hex');
          const mapped = base64Map[hash];
          if (mapped && mapped.fbUrl) {
            item.image = mapped.fbUrl;
            restoredCount++;
          }
        } else {
          if (repairedImg !== 'generic-check.png' && item.image === 'generic-check.png') {
            item.image = repairedImg;
          }
        }
      }
    });
  });
  
  console.log(`Restored ${restoredCount} checklist items with authenticated Storage URLs.`);
  
  fs.writeFileSync('templates_restored_with_urls.json', JSON.stringify(liveTemplates, null, 2), 'utf8');
  console.log('Saved templates_restored_with_urls.json locally.');
  
  console.log('Uploading restored templates to Firebase Database...');
  exec('firebase database:set /templates templates_restored_with_urls.json -f', (err, stdout, stderr) => {
    if (err) {
      console.error('Error uploading to database:', err);
      return;
    }
    console.log('Firebase Database upload success!');
    console.log(stdout);
  });
}
