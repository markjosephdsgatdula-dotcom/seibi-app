const fs = require('fs');

try {
  const content = fs.readFileSync('templates_restored_with_urls.json', 'utf8');
  const templates = JSON.parse(content);
  
  const robot3Template = templates.find(t => t.id === 'template-custom-1781675243671');
  if (robot3Template) {
    console.log('Found Robot 3 Custom Template!');
    robot3Template.items.forEach(item => {
      console.log(`Item ID: ${item.id}`);
      console.log(`  - Title: ${item.title}`);
      console.log(`  - Image: ${item.image}`);
    });
  } else {
    console.log('Robot 3 Custom Template NOT found in templates_restored_with_urls.json');
    console.log('Available template IDs:', templates.map(t => t.id));
  }
} catch (err) {
  console.error(err);
}
