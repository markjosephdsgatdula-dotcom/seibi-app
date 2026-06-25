const fs = require('fs');
const https = require('https');
const path = require('path');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\SHOP4';
const configPath = path.join(userProfile, '.config', 'configstore', 'firebase-tools.json');

try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const refreshToken = config.tokens.refresh_token;
  
  console.log('Got refresh token. Requesting fresh access token...');
  
  // Refresh the token
  const postData = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr908910m7t.apps.googleusercontent.com',
    client_secret: 'j9eV1Ry2bveMelPr358gGgG5',
    refresh_token: refreshToken
  }).toString();
  
  const req = https.request({
    hostname: 'oauth2.googleapis.com',
    path: '/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      try {
        const tokenRes = JSON.parse(body);
        if (tokenRes.access_token) {
          console.log('Successfully obtained fresh access token!');
          testUpload(tokenRes.access_token);
        } else {
          console.error('Failed to get access token:', tokenRes);
        }
      } catch (err) {
        console.error('JSON parse error:', err.message, 'body:', body);
      }
    });
  });
  
  req.on('error', err => console.error('OAuth token request error:', err));
  req.write(postData);
  req.end();
  
} catch (err) {
  console.error('Error reading Firebase token:', err.message);
}

function testUpload(accessToken) {
  console.log('Testing GCS upload...');
  const bucketName = 'seibi-app.firebasestorage.app'; // or seibi-app.appspot.com
  const objectName = 'test-upload-agent.txt';
  const fileContent = 'Hello from Antigravity agent at ' + new Date().toISOString();
  
  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(objectName)}`;
  
  const req = https.request(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'text/plain',
      'Content-Length': Buffer.byteLength(fileContent)
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('Upload response status:', res.statusCode);
      try {
        const json = JSON.parse(body);
        if (res.statusCode === 200) {
          console.log('Upload successful! Object details:');
          console.log('- Name:', json.name);
          console.log('- Bucket:', json.bucket);
          console.log('- MediaLink:', json.mediaLink);
          
          // Construct the Firebase Storage download URL
          // Format: https://firebasestorage.googleapis.com/v0/b/[BUCKET_NAME]/o/[OBJECT_NAME_ESC]?alt=media
          const fbUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(objectName)}?alt=media`;
          console.log('Firebase Storage Public Download URL:', fbUrl);
        } else {
          console.error('Upload failed. Response:', json);
        }
      } catch (err) {
        console.error('Upload response parse failed:', err.message, 'body:', body);
      }
    });
  });
  
  req.on('error', err => console.error('GCS Upload error:', err));
  req.write(fileContent);
  req.end();
}
