const fs = require('fs');

try {
  const fileContent = fs.readFileSync('notices_dump.json', 'utf8');
  const notices = JSON.parse(fileContent);

  const list = Array.isArray(notices) ? notices.filter(Boolean) : Object.values(notices);
  console.log('Total notices:', list.length);

  let base64Count = 0;
  let totalLengthOfBase64 = 0;
  const noticesWithBase64 = [];

  list.forEach((item, index) => {
    const strRepresentation = JSON.stringify(item);
    if (strRepresentation.includes('data:image/')) {
      base64Count++;
      const regex = /data:image\/[a-zA-Z]+;base64,[^"\']+/g;
      let match;
      while ((match = regex.exec(strRepresentation)) !== null) {
        totalLengthOfBase64 += match[0].length;
      }
      noticesWithBase64.push({
        id: item.id,
        timestamp: item.timestamp,
        author: item.author,
        message: item.message,
        index
      });
    }
  });

  console.log('Notices with Base64 images:', base64Count);
  console.log('Approximate size of all Base64 strings (MB):', (totalLengthOfBase64 / (1024 * 1024)).toFixed(2));
  console.log('Sample of notices containing Base64:');
  console.log(noticesWithBase64.slice(0, 5));

} catch (err) {
  console.error('Error analyzing notices_dump.json:', err);
}
