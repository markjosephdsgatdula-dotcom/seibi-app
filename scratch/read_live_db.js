const https = require('https');

const url = 'https://seibi-app-default-rtdb.asia-southeast1.firebasedatabase.app/templates.json';

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status code:', res.statusCode);
    if (res.statusCode === 200) {
      try {
        const json = JSON.parse(data);
        console.log('Successfully read live templates!');
        console.log('Keys:', Object.keys(json));
        if (Array.isArray(json)) {
          console.log('It is an array of length:', json.length);
          json.forEach(t => {
            console.log(`- Template ID: ${t.id}, name: ${t.name}`);
          });
        } else {
          console.log('It is an object');
        }
      } catch (err) {
        console.error('Failed to parse JSON response:', err.message);
      }
    } else {
      console.log('Response body:', data);
    }
  });
}).on('error', (err) => {
  console.error('Request error:', err.message);
});
