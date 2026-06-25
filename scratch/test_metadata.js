const fs = require('fs');
const https = require('https');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\SHOP4';
const configPath = path.join(userProfile, '.config', 'configstore', 'firebase-tools.json');

// 1. Refresh token and read access token
exec('firebase database:get /roles', { maxBuffer: 10 * 1024 * 1024 }, (err) => {
  if (err) {
    console.error('Error refreshing token:', err);
    return;
  }
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const accessToken = config.tokens.access_token;
  
  testPatchMetadata(accessToken);
});

function testPatchMetadata(accessToken) {
  const bucketName = 'seibi-app.firebasestorage.app';
  const objectName = 'templates/custom_e265cd11190aaaa1d510eaafa2614f79.jpeg';
  const uuid = crypto.randomUUID(); // Generate a random download token
  
  console.log(`Setting download token ${uuid} on ${objectName}...`);
  
  // GCS REST API expects the object name to be URL-encoded in the path
  const patchUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeURIComponent(objectName)}`;
  
  const patchData = JSON.stringify({
    metadata: {
      firebaseStorageDownloadTokens: uuid
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
      console.log('Metadata PATCH response status:', res.statusCode);
      if (res.statusCode === 200) {
        console.log('Metadata updated successfully!');
        
        // Now let's try to fetch it with the token
        const fbUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(objectName)}?alt=media&token=${uuid}`;
        console.log('Testing public fetch from:', fbUrl);
        
        https.get(fbUrl, (fetchRes) => {
          console.log('Public fetch status code:', fetchRes.statusCode);
          let fetchBody = '';
          fetchRes.on('data', chunk => {
            // Only output length and type, not binary data
            fetchBody += chunk.length; 
          });
          fetchRes.on('end', () => {
            if (fetchRes.statusCode === 200) {
              console.log('Success! File read publicly using token. Content length (bytes):', fetchBody.length);
            } else {
              console.error('Public fetch failed. Status:', fetchRes.statusCode);
            }
          });
        }).on('error', fetchErr => {
          console.error('Public fetch error:', fetchErr);
        });
        
      } else {
        console.error('Metadata update failed. Body:', body);
      }
    });
  });
  
  req.on('error', err => console.error('PATCH request error:', err));
  req.write(patchData);
  req.end();
}
