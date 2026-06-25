const fs = require('fs');

try {
  const buf = fs.readFileSync('templates_cleaned.json');
  const sliced = buf.slice(6);
  const jsonStr = sliced.toString('utf16le');
  
  const pos = 1421;
  console.log('Context around position 1421:');
  console.log(jsonStr.substring(Math.max(0, pos - 100), Math.min(jsonStr.length, pos + 100)));
  
  // Let's print character by character around pos
  for (let i = pos - 15; i < pos + 15; i++) {
    console.log(i, jsonStr[i], jsonStr.charCodeAt(i).toString(16), JSON.stringify(jsonStr[i]));
  }
} catch (err) {
  console.error(err);
}
