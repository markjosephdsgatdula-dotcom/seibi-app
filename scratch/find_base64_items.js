const fs = require('fs');

try {
  const raw = fs.readFileSync('templates_dump.json', 'utf8');
  console.log('File length:', raw.length);

  // We want to find each occurrence of a Base64 image, and find its context (like the item title, and the template it belongs to).
  // Let's split the file or scan it. Since the file is large, we can scan it using a regex.
  // A template starts with: {"id":"template-... or similar.
  // Let's find all template IDs and their character positions.
  const templateRegex = /\{"id"\s*:\s*"([^"]+)"/g;
  const templates = [];
  let tMatch;
  while ((tMatch = templateRegex.exec(raw)) !== null) {
    templates.push({
      id: tMatch[1],
      index: tMatch.index
    });
  }
  console.log('Found templates at indices:', templates);

  // Now, find all Base64 images and see which template they belong to by checking their position.
  const base64Regex = /"image"\s*:\s*"(data:image\/[^"]+)"/g;
  let imgMatch;
  let matchCount = 0;
  while ((imgMatch = base64Regex.exec(raw)) !== null) {
    matchCount++;
    const pos = imgMatch.index;
    const base64Data = imgMatch[1];
    
    // Find which template this position falls into
    let activeTemplate = 'unknown';
    for (let i = 0; i < templates.length; i++) {
      if (pos >= templates[i].index) {
        if (i === templates.length - 1 || pos < templates[i+1].index) {
          activeTemplate = templates[i].id;
          break;
        }
      }
    }
    
    // Let's search backwards from the image position to find the item details (like category, id, title_en).
    // Let's grab 1000 characters before the image position.
    const beforeText = raw.substring(Math.max(0, pos - 1000), pos);
    
    // Search for title_en and id inside beforeText
    const titleEnMatch = beforeText.match(/"title_en"\s*:\s*"([^"]+)"/);
    const itemTitleMatch = beforeText.match(/"title"\s*:\s*"([^"]+)"/);
    const idMatch = beforeText.match(/"id"\s*:\s*([0-9]+)/);
    
    console.log(`\n--- Base64 Image ${matchCount} ---`);
    console.log('Template:', activeTemplate);
    console.log('Item ID:', idMatch ? idMatch[1] : 'unknown');
    console.log('Item Title:', itemTitleMatch ? itemTitleMatch[1] : 'unknown');
    console.log('Item Title En:', titleEnMatch ? titleEnMatch[1] : 'unknown');
    console.log('Base64 Length:', base64Data.length);
  }

} catch (err) {
  console.error(err);
}
