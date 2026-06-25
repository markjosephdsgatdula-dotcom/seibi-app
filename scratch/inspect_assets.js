const fs = require('fs');

try {
  const buf = fs.readFileSync('current_live_assets.json');
  let encoding = 'utf8';
  if (buf[0] === 0xFF && buf[1] === 0xFE) {
    encoding = 'utf16le';
  } else if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    encoding = 'utf8';
  }
  
  let content = buf.toString(encoding);
  if (content.charCodeAt(0) === 0xFEFF || content.charCodeAt(0) === 0xFFFE) {
    content = content.slice(1);
  }

  const data = JSON.parse(content);
  console.log('Success! Parsed current_live_assets.json.');
  
  const assets = Array.isArray(data) ? data : Object.values(data);
  assets.forEach(a => {
    if (a) {
      console.log(`Asset ID: ${a.id}`);
      console.log(`  - Name: ${a.name}`);
      console.log(`  - Name JP: ${a.name_jp}`);
      console.log(`  - Template ID: ${a.templateId}`);
    }
  });
} catch (err) {
  console.error('Error:', err.message);
  // If parsing failed, print context around position
  const match = err.message.match(/at position (\d+)/);
  if (match) {
    const pos = parseInt(match[1]);
    const buf = fs.readFileSync('current_live_assets.json');
    let content = buf.toString(buf[0] === 0xFF ? 'utf16le' : 'utf8');
    console.log('Context:', content.substring(Math.max(0, pos - 100), Math.min(content.length, pos + 100)));
  }
}
