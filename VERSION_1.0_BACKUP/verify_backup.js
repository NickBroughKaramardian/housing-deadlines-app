#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying C&C Project Manager Version 1.0 Backup...\n');

// Essential files that must be present
const essentialFiles = [
  'package.json',
  'package-lock.json',
  'tailwind.config.js',
  'postcss.config.js',
  'README.md',
  'BACKUP_DOCUMENTATION.md',
  'src/App.js',
  'src/index.js',
  'src/index.css',
  'src/Dashboard.js',
  'src/GanttChart.js',
  'src/CalendarView.js',
  'src/TaskForm.js',
  'src/DataManagement.js',
  'src/Auth.js',
  'src/themeService.js',
  'src/notificationService.js',
  'src/teamsService.js',
  'public/index.html',
  'public/manifest.json'
];

// Check if files exist
let allFilesPresent = true;
const missingFiles = [];

console.log('📁 Checking essential files...');

essentialFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    missingFiles.push(file);
    allFilesPresent = false;
  }
});

console.log('\n📊 Backup Verification Results:');
console.log('================================');

if (allFilesPresent) {
  console.log('🎉 SUCCESS: All essential files are present in the backup!');
  console.log('✅ The backup is complete and ready for restoration.');
} else {
  console.log('⚠️  WARNING: Some files are missing from the backup:');
  missingFiles.forEach(file => {
    console.log(`   - ${file}`);
  });
  console.log('\nPlease ensure all files are copied before proceeding.');
}

// Check package.json for dependencies
console.log('\n📦 Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  console.log(`✅ Package name: ${packageJson.name}`);
  console.log(`✅ Version: ${packageJson.version}`);
  console.log(`✅ Dependencies count: ${Object.keys(packageJson.dependencies || {}).length}`);
  console.log(`✅ Scripts available: ${Object.keys(packageJson.scripts || {}).join(', ')}`);
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
}

// Check source files count
console.log('\n📂 Checking source files...');
try {
  const srcDir = path.join(__dirname, 'src');
  if (fs.existsSync(srcDir)) {
    const srcFiles = fs.readdirSync(srcDir).filter(file => file.endsWith('.js') || file.endsWith('.css'));
    console.log(`✅ Source files count: ${srcFiles.length}`);
    console.log(`✅ Source files: ${srcFiles.join(', ')}`);
  } else {
    console.log('❌ src directory not found');
  }
} catch (error) {
  console.log('❌ Error reading src directory:', error.message);
}

console.log('\n🔧 Backup Verification Complete!');
console.log('================================');
console.log('To restore this backup:');
console.log('1. Copy all files from VERSION_1.0_BACKUP/ to your project root');
console.log('2. Run: npm install');
console.log('3. Run: npm start');
console.log('\n📖 See BACKUP_DOCUMENTATION.md for detailed restoration instructions.'); 