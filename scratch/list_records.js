const fs = require('fs');

try {
  const notices = JSON.parse(fs.readFileSync('notices_cleaned.json', 'utf8'));
  console.log('--- Notices ---');
  notices.forEach((n, idx) => {
    console.log(`[Notice ${idx}] ID: ${n.id}`);
    console.log(`  - Author: ${n.author}`);
    console.log(`  - Category: ${n.category}`);
    console.log(`  - Message: ${n.message}`);
    console.log(`  - Repaired: ${n.repaired ? 'Yes by ' + n.repairedBy : 'No'}`);
  });
  
  const history = JSON.parse(fs.readFileSync('history_cleaned.json', 'utf8'));
  console.log('\n--- History ---');
  history.forEach((h, idx) => {
    console.log(`[History ${idx}] ID: ${h.id}`);
    console.log(`  - Completed By: ${h.completedBy}`);
    console.log(`  - Title: ${h.title}`);
    console.log(`  - Notes: ${h.notes}`);
  });
} catch (err) {
  console.error(err);
}
