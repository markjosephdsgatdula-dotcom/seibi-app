const fs = require('fs');

try {
  const raw = fs.readFileSync('templates_dump.json', 'utf8');
  
  // Let's grab the context around position 994 in the raw file
  const pos = 994;
  const target = raw.substring(pos - 150, pos + 100);
  console.log('Target string:', JSON.stringify(target));
  
  // Test regex Pattern 2
  const pattern2 = /:(\s*)"([^"\}\{\]]*)\},\{"category"/;
  const match2 = target.match(pattern2);
  console.log('Match result with simple regex:', match2);
  
} catch (err) {
  console.error(err);
}
