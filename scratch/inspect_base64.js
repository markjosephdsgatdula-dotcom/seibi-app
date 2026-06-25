const fs = require('fs');

try {
  const raw = fs.readFileSync('templates_dump.json', 'utf8');
  console.log('File length:', raw.length);
  
  // Search for base64 data:image
  const regex = /"image":\s*"(data:image\/[^"]+)"/g;
  let match;
  let count = 0;
  while ((match = regex.exec(raw)) && count < 5) {
    count++;
    console.log(`\nMatch ${count}:`);
    console.log(`- Base64 Length: ${match[1].length}`);
    console.log(`- Prefix: ${match[1].substring(0, 80)}...`);
    console.log(`- Suffix: ...${match[1].substring(match[1].length - 20)}`);
  }
  
  console.log(`\nTotal Base64 images found: ${count}`);
} catch (err) {
  console.error(err);
}
