const fs = require('fs');

function inspectFile(filename) {
  try {
    const buf = fs.readFileSync(filename);
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
    console.log(`\n--- Inspecting ${filename} ---`);
    console.log('Is Array:', Array.isArray(data));
    const items = Array.isArray(data) ? data : Object.values(data);
    console.log('Total items:', items.length);
    
    if (items.length > 0) {
      console.log('Sample item structure:');
      console.log(JSON.stringify(items[0], null, 2));
      
      // Let's search for "generic-check.png" inside the items
      let occurrences = 0;
      items.forEach((item, idx) => {
        if (!item) return;
        const str = JSON.stringify(item);
        if (str.includes('generic-check.png')) {
          occurrences++;
          console.log(`Found generic-check.png at index ${idx}:`, item);
        }
      });
      console.log(`Total occurrences of generic-check.png: ${occurrences}`);
    }
  } catch (err) {
    console.error(`Error inspecting ${filename}:`, err.message);
  }
}

inspectFile('current_live_notices.json');
inspectFile('current_live_history.json');
