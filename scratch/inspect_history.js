const fs = require('fs');

try {
  const fileContent = fs.readFileSync('history_dump.json', 'utf8');
  const history = JSON.parse(fileContent);

  console.log('Total history records:', Array.isArray(history) ? history.length : Object.keys(history).length);

  const records = Array.isArray(history) ? history.filter(Boolean) : Object.values(history);
  let base64Count = 0;
  let totalLengthOfBase64 = 0;

  const recordsWithBase64 = [];

  records.forEach((record, index) => {
    let hasBase64 = false;
    const strRepresentation = JSON.stringify(record);
    if (strRepresentation.includes('data:image/')) {
      hasBase64 = true;
      base64Count++;
      // Find the base64 match
      const regex = /data:image\/[a-zA-Z]+;base64,[^"\']+/g;
      let match;
      while ((match = regex.exec(strRepresentation)) !== null) {
        totalLengthOfBase64 += match[0].length;
      }
      recordsWithBase64.push({
        id: record.id,
        completedAt: record.completedAt,
        assetName: record.assetName || record.title,
        index
      });
    }
  });

  console.log('Records with Base64 images:', base64Count);
  console.log('Approximate size of all Base64 strings (MB):', (totalLengthOfBase64 / (1024 * 1024)).toFixed(2));
  console.log('Sample of records containing Base64:');
  console.log(recordsWithBase64.slice(0, 5));

} catch (err) {
  console.error('Error analyzing history_dump.json:', err);
}
