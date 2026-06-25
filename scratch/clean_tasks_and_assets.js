const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCmd(cmd) {
  try {
    return execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'] }).toString();
  } catch (err) {
    console.error(`Command failed: ${cmd}`);
    if (err.stderr) console.error(err.stderr.toString());
    throw err;
  }
}

console.log('Fetching live assets and tasks...');
const assetsJson = runCmd('npx firebase database:get /assets');
const tasksJson = runCmd('npx firebase database:get /tasks');

const assets = JSON.parse(assetsJson.replace(/^\(node:\d+\).*\n/g, ''));
const tasks = JSON.parse(tasksJson.replace(/^\(node:\d+\).*\n/g, ''));

console.log(`Loaded ${assets.length} assets and ${tasks.length} tasks.`);

// 1. Clean assets
const cleanedAssets = assets.filter(asset => {
  if (asset.id === 'asset-robot-1782200246888') return false;
  if (asset.name === 'robot test') return false;
  return true;
});

// 2. Clean tasks
const keepTaskIds = new Set([
  // Real completed repair tasks
  'task-repair-notice-1782079100617',
  'task-repair-notice-1782079130087',
  'task-repair-notice-1782079183059',
  'task-repair-notice-1782089804544',
  'task-repair-notice-1782200155495',
  // Real pending/upcoming inspection tasks
  'task-robot-1782078767530',
  'task-robot-1782078785187',
  'task-robot-1782079100657',
  'task-robot-1782079130112',
  'task-robot-1782079183085',
  'task-robot-1782079207929',
  'task-robot-tig-01'
]);

const cleanedTasks = tasks.filter(task => {
  // If it is in the whitelist, keep it
  if (keepTaskIds.has(task.id)) return true;
  
  // Exclude test tasks explicitly by checking title, assetName, or notes
  if (task.assetName === 'robot test' || task.assetName === 'Unknown Machine' || task.assetName === '不明な設備' || task.assetName === 'テストメール') {
    console.log(`Removing task: ${task.id} (${task.title})`);
    return false;
  }
  if (task.title.includes('テストメール') || task.title.includes('不明な設備') || task.title.includes('Unknown Machine')) {
    console.log(`Removing task: ${task.id} (${task.title})`);
    return false;
  }
  if (task.notes && (
    task.notes.includes('テスト') || 
    task.notes.includes('test') || 
    task.notes.includes('てｓｔ') || 
    task.notes.includes('testing') || 
    task.notes.includes('mark') || 
    task.notes.includes('sfawe') || 
    task.notes.includes('Upodate')
  )) {
    console.log(`Removing task: ${task.id} (${task.title})`);
    return false;
  }
  
  // If it's a repair task (generated from notice) that wasn't whitelisted, remove it
  if (task.id.startsWith('task-repair-notice-')) {
    console.log(`Removing repair task: ${task.id} (${task.title})`);
    return false;
  }

  // If it's the test robot inspection task, remove it
  if (task.id === 'task-robot-1782200246889') {
    console.log(`Removing test robot inspection task: ${task.id}`);
    return false;
  }
  
  return true;
});

console.log(`Cleaned assets count: ${cleanedAssets.length} (was ${assets.length})`);
console.log(`Cleaned tasks count: ${cleanedTasks.length} (was ${tasks.length})`);

// Write temporary clean files
const assetsTempPath = path.join(__dirname, 'temp_assets.json');
const tasksTempPath = path.join(__dirname, 'temp_tasks.json');

fs.writeFileSync(assetsTempPath, JSON.stringify(cleanedAssets));
fs.writeFileSync(tasksTempPath, JSON.stringify(cleanedTasks));

console.log('Uploading cleaned assets and tasks to database...');
runCmd(`npx firebase database:set /assets "${assetsTempPath}" -f`);
runCmd(`npx firebase database:set /tasks "${tasksTempPath}" -f`);

// Cleanup temp files
fs.unlinkSync(assetsTempPath);
fs.unlinkSync(tasksTempPath);

console.log('Sanitization complete!');
