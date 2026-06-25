const fs = require('fs');
const path = require('path');

function searchInFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('v26') || line.includes('v25') || line.includes('version') || line.includes('Version')) {
      console.log(`Found in ${filePath}:${idx + 1}: ${line.trim()}`);
    }
  });
}

// Search in common files
searchInFile('public/index.html');
searchInFile('public/js/data/firebase-config.js');
searchInFile('public/js/app.js');
searchInFile('public/sw.js');
