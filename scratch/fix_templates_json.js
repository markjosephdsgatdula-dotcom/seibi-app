const fs = require('fs');

try {
  let raw = fs.readFileSync('templates_dump2_utf8.json', 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) {
    raw = raw.slice(1);
  }

  // Let's print the length
  console.log('File character length:', raw.length);

  // Try to parse it. If it fails, catch the error and find the position
  try {
    const data = JSON.parse(raw);
    console.log('Success! Parsed JSON without errors.');
  } catch (err) {
    console.error('JSON.parse failed:', err.message);
    
    // Find the position if mentioned in the error
    const match = err.message.match(/at position (\d+)/);
    if (match) {
      const pos = parseInt(match[1]);
      console.log('Error context around position:', pos);
      console.log('--- CONTEXT START ---');
      console.log(raw.substring(Math.max(0, pos - 100), Math.min(raw.length, pos + 100)));
      console.log('--- CONTEXT END ---');
    }
  }

} catch (err) {
  console.error('Error:', err);
}
