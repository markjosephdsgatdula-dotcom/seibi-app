const fs = require('fs');

try {
  const buf = fs.readFileSync('current_live_templates.json');
  console.log('Byte length:', buf.length);
  
  let encoding = 'utf8';
  if (buf[0] === 0xFF && buf[1] === 0xFE) {
    encoding = 'utf16le';
    console.log('Detected UTF-16 LE BOM');
  } else if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    encoding = 'utf8';
    console.log('Detected UTF-8 BOM');
  }
  
  let content = buf.toString(encoding);
  if (content.charCodeAt(0) === 0xFEFF || content.charCodeAt(0) === 0xFFFE) {
    content = content.slice(1);
  }
  
  const data = JSON.parse(content);
  console.log('Success! current_live_templates.json parsed successfully.');
  
  const templates = Array.isArray(data) ? data : Object.values(data);
  console.log('Number of templates:', templates.length);
  templates.forEach((t, i) => {
    console.log(`[${i}] ID: ${t.id}, Name: ${t.name || 'custom'}`);
    if (t.items) {
      console.log(`   - Number of items: ${t.items.length}`);
      const itemsWithGeneric = t.items.filter(item => item.image === 'generic-check.png');
      console.log(`   - Items with generic-check.png: ${itemsWithGeneric.length}`);
    }
  });
} catch (err) {
  console.error('Error parsing live templates file:', err.message);
}
