const { exec } = require('child_process');
const fs = require('fs');

console.log('Fetching templates from live database using firebase CLI...');

exec('firebase database:get /templates', { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
  if (err) {
    console.error('Error executing firebase CLI:', err);
    return;
  }
  
  console.log('Firebase CLI output length:', stdout.length);
  
  try {
    // Try parsing the stdout string directly
    const data = JSON.parse(stdout);
    console.log('Success! Parsed stdout directly. Number of templates:', data.length);
    
    // Save it as a clean UTF-8 JSON file
    fs.writeFileSync('templates_live_clean.json', JSON.stringify(data, null, 2), 'utf8');
    console.log('Saved clean live templates to templates_live_clean.json');
  } catch (parseErr) {
    console.error('JSON.parse of stdout failed:', parseErr.message);
    
    // Let's write the raw stdout to a debug file to inspect it
    fs.writeFileSync('templates_stdout_raw.json', stdout, 'utf8');
  }
});
