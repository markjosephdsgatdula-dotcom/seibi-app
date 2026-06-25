const fs = require('fs');

try {
  let raw = fs.readFileSync('templates_dump.json', 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) {
    raw = raw.slice(1);
  }
  
  console.log('Original length:', raw.length);
  
  const keys = [
    'freq', 'id', 'image', 'title', 'title_en', 'title_jp', 'category',
    'desc', 'desc_en', 'desc_jp', 'name', 'name_jp', 'type', 'status',
    'lastInspected', 'dueDate', 'model', 'location', 'templateId', 'items'
  ];
  
  let repaired = raw;

  // Pattern 1: missing quote before comma + key
  const pattern1 = new RegExp(`:(\\s*)"([^"\\}\\{\\]]*),"(${keys.join('|')})"`, 'g');
  let matches1 = 0;
  repaired = repaired.replace(pattern1, (match, whitespace, value, key) => {
    matches1++;
    return `:${whitespace}"${value}","${key}"`;
  });
  console.log(`Pattern 1 made ${matches1} insertions.`);
  
  // Pattern 2: missing quote before end of item object inside array (e.g. } , { "any_key" )
  let matches2 = 0;
  const pattern2 = new RegExp(`:(\\s*)"([^"\\}\\{\\]]*)\\},\\{"(${keys.join('|')})"`, 'g');
  repaired = repaired.replace(pattern2, (match, whitespace, value, key) => {
    matches2++;
    return `:${whitespace}"${value}"\},\{"${key}"`;
  });
  console.log(`Pattern 2 made ${matches2} insertions.`);

  // Pattern 3: missing quote before end of items array (e.g. } ] )
  let matches3 = 0;
  repaired = repaired.replace(/:(\s*)"([^"\}\{\]]*)\}\]/g, (match, whitespace, value) => {
    matches3++;
    return `:${whitespace}"${value}"\}]`;
  });
  console.log(`Pattern 3 made ${matches3} insertions.`);

  // Let's test if we can parse it now
  try {
    const data = JSON.parse(repaired);
    console.log('Success! JSON parsed perfectly after repair!');
    console.log('Number of templates:', data.length);
    
    // Write repaired JSON to a file
    fs.writeFileSync('templates_repaired.json', JSON.stringify(data, null, 2), 'utf8');
    console.log('Saved repaired templates to templates_repaired.json');
  } catch (err) {
    console.error('Parsing still failed:', err.message);
    const match = err.message.match(/at position (\d+)/);
    if (match) {
      const pos = parseInt(match[1]);
      console.log('Error context:', repaired.substring(Math.max(0, pos - 100), Math.min(repaired.length, pos + 100)));
    }
  }

} catch (err) {
  console.error(err);
}
