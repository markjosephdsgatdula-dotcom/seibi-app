const fs = require('fs');

function cleanFile(inputFile, outputFile) {
  try {
    let data = fs.readFileSync(inputFile, 'utf8');
    let modifications = 0;
    
    // Replace any JSON key-value pair where the value is a base64 image
    data = data.replace(/"([^"]+)":\s*"data:image\/[^"]+"/g, (match, key) => {
      modifications++;
      return `"${key}":"generic-check.png"`;
    });

    fs.writeFileSync(outputFile, data);
    console.log(`Successfully cleaned ${modifications} images in ${inputFile} -> saved to ${outputFile}.`);
  } catch (err) {
    console.error(`Error processing ${inputFile}:`, err.message);
  }
}

cleanFile('history_dump.json', 'history_cleaned.json');
cleanFile('notices_dump.json', 'notices_cleaned.json');
