const fs = require('fs');
const { exec } = require('child_process');

try {
  // 1. Clean Notices
  const notices = JSON.parse(fs.readFileSync('notices_cleaned.json', 'utf8'));
  const realNoticeIds = [
    'notice-1782079100615',
    'notice-1782079100617',
    'notice-1782079130087',
    'notice-1782079183059',
    'notice-1782089804544'
  ];
  const cleanedNotices = notices.filter(n => realNoticeIds.includes(n.id));
  console.log(`Notices cleaned: ${notices.length} -> ${cleanedNotices.length}`);
  fs.writeFileSync('notices_cleaned.json', JSON.stringify(cleanedNotices, null, 2), 'utf8');

  // 2. Clean History
  const history = JSON.parse(fs.readFileSync('history_cleaned.json', 'utf8'));
  const realHistoryIds = [
    'hist-repair-notice-1782089804544',
    'hist-1782079207888',
    'hist-1782079183056',
    'hist-1782079130084',
    'hist-1782079100607',
    'hist-1782078785185',
    'hist-1782078767507',
    'hist-1782075810178'
  ];
  const cleanedHistory = history.filter(h => realHistoryIds.includes(h.id));
  console.log(`History cleaned: ${history.length} -> ${cleanedHistory.length}`);
  fs.writeFileSync('history_cleaned.json', JSON.stringify(cleanedHistory, null, 2), 'utf8');

  // 3. Upload to Firebase RTDB
  console.log('Uploading cleaned notices to Firebase Database...');
  exec('firebase database:set /notices notices_cleaned.json -f', (err1, out1) => {
    if (err1) console.error('Error setting /notices:', err1);
    else console.log('Successfully updated /notices in Firebase!');
    
    console.log('Uploading cleaned history to Firebase Database...');
    exec('firebase database:set /history history_cleaned.json -f', (err2, out2) => {
      if (err2) console.error('Error setting /history:', err2);
      else console.log('Successfully updated /history in Firebase!');
    });
  });

} catch (err) {
  console.error('Error cleaning tests:', err);
}
