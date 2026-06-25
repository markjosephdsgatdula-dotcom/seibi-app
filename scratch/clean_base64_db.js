const fs = require('fs');

function cleanFile(inputFile, outputFile) {
  try {
    let data = fs.readFileSync(inputFile, 'utf8');
    let modifications = 0;
    
    // Replace base64 data:image/... strings
    data = data.replace(/"image":\s*"data:image\/[^"]+"/g, () => {
      modifications++;
      return '"image":"generic-check.png"';
    });
    
    // Replace any extremely long image strings (>1000 chars)
    data = data.replace(/"image":\s*"([^"]{1000,})"/g, () => {
      modifications++;
      return '"image":"generic-check.png"';
    });

    fs.writeFileSync(outputFile, data);
    console.log(`Successfully cleaned ${modifications} images in ${inputFile}.`);
  } catch (err) {
    console.error(`Error processing ${inputFile}:`, err.message);
  }
}

cleanFile('templates_dump2.json', 'templates_cleaned.json');
cleanFile('assets_dump2.json', 'assets_cleaned.json');
