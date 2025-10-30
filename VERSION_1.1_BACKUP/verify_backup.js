#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying C&C Project Manager Version 1.1 Backup...\n');

// Essential files that must exist
const essentialFiles = [
  'package.json',
  'package-lock.json',
  'tailwind.config.js',
  'postcss.config.js',
  'firebase.json',
  'firestore.rules',
  'firestore.indexes.json',
  'README.md',
  'VERSION_INFO.txt',
  'BACKUP_DOCUMENTATION.md',
  'BACKUP_SUMMARY.md'
];

// Essential directories
const essentialDirs = [
  'src',
  'public'
];

// Essential source files
const essentialSrcFiles = [
  'src/App.js',
  'src/index.js',
  'src/firebase.js',
  'src/Auth.js',
  'src/Dashboard.js',
  'src/GanttChart.js',
  'src/CalendarView.js',
  'src/TaskForm.js',
  'src/BatchEntry.js',
  'src/DataManagement.js',
  'src/DocumentLinkModal.js',
  'src/UserManagement.js',
  'src/SettingsPage.js',
  'src/Messages.js',
  'src/TeamsWrapper.js'
];

let allGood = true;

// Check essential files
console.log('📄 Checking essential files...');
essentialFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    allGood = false;
  }
});

// Check essential directories
console.log('\n📁 Checking essential directories...');
essentialDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    console.log(`  ✅ ${dir}/`);
  } else {
    console.log(`  ❌ ${dir}/ - MISSING`);
    allGood = false;
  }
});

// Check essential source files
console.log('\n🔧 Checking essential source files...');
essentialSrcFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    allGood = false;
  }
});

// Check package.json integrity
console.log('\n📦 Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  const requiredFields = ['name', 'version', 'dependencies', 'scripts'];
  
  requiredFields.forEach(field => {
    if (packageJson[field]) {
      console.log(`  ✅ ${field}: ${typeof packageJson[field] === 'object' ? 'Present' : packageJson[field]}`);
    } else {
      console.log(`  ❌ ${field} - MISSING`);
      allGood = false;
    }
  });
} catch (error) {
  console.log(`  ❌ package.json - INVALID JSON: ${error.message}`);
  allGood = false;
}

// Check for document linking functionality
console.log('\n🔗 Checking document linking functionality...');
try {
  const appJs = fs.readFileSync(path.join(__dirname, 'src/App.js'), 'utf8');
  const documentLinkModal = fs.readFileSync(path.join(__dirname, 'src/DocumentLinkModal.js'), 'utf8');
  
  // Check for document link handlers
  if (appJs.includes('handleSaveDocumentLink') && appJs.includes('handleRemoveDocumentLink')) {
    console.log('  ✅ Document link handlers present in App.js');
  } else {
    console.log('  ❌ Document link handlers missing in App.js');
    allGood = false;
  }
  
  // Check for DocumentLinkModal component
  if (documentLinkModal.includes('DocumentLinkModal') && documentLinkModal.includes('documentLink')) {
    console.log('  ✅ DocumentLinkModal component present');
  } else {
    console.log('  ❌ DocumentLinkModal component missing or incomplete');
    allGood = false;
  }
  
  // Check for browse feature removal
  if (!appJs.includes('browse') && !documentLinkModal.includes('browse')) {
    console.log('  ✅ Browse feature completely removed');
  } else {
    console.log('  ⚠️  Browse feature references may still exist');
  }
  
} catch (error) {
  console.log(`  ❌ Error checking document linking: ${error.message}`);
  allGood = false;
}

// Summary
console.log('\n🔧 Backup Verification Complete!');
console.log('================================');
if (allGood) {
  console.log('✅ SUCCESS: Version 1.1 backup is complete and ready for restoration!');
  console.log('\n📖 To restore this backup:');
  console.log('1. Copy all files from VERSION_1.1_BACKUP/ to your project root');
  console.log('2. Run: npm install');
  console.log('3. Update Firebase configuration in src/firebase.js');
  console.log('4. Run: npm start (for development)');
  console.log('5. Run: npm run build (for production build)');
  console.log('6. Deploy: firebase deploy');
  console.log('\n📖 See BACKUP_DOCUMENTATION.md for detailed restoration instructions.');
} else {
  console.log('❌ ISSUES FOUND: Some files may be missing or incomplete.');
  console.log('Please check the errors above and ensure all files are properly backed up.');
}

console.log('\n🎉 Version 1.1 Backup Verification Complete!');
console.log('Key Features:');
console.log('  • Fully Functional Document Linking');
console.log('  • Permission Error Resolution');
console.log('  • Browse Feature Removal');
console.log('  • Enhanced User Experience');
console.log('  • Production Ready Codebase'); 