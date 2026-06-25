const fs = require('fs');

try {
  let raw = fs.readFileSync('templates_dump.json', 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) {
    raw = raw.slice(1);
  }
  
  const pos = 1060064;
  console.log('--- Original Substring around 1060064 ---');
  console.log(raw.substring(pos - 100, pos + 100));
  
  console.log('\n--- Original Char codes around 1060064 ---');
  for (let i = pos - 20; i < pos + 40; i++) {
    console.log(i, raw[i], raw.charCodeAt(i).toString(16), JSON.stringify(raw[i]));
  }
} catch (err) {
  console.error(err);
}
