const https = require('https');

const url = 'https://firebasestorage.googleapis.com/v0/b/seibi-app.firebasestorage.app/o/templates%2Fcustom_e265cd11190aaaa1d510eaafa2614f79.jpeg?alt=media&token=410fe25e-4460-40d7-a7d0-f3994edc51f1';

https.get(url, (res) => {
  console.log('Status code:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.log('Error Body:', body);
    } else {
      console.log('Successfully fetched! Body length:', body.length);
    }
  });
}).on('error', err => {
  console.error('Request error:', err);
});
