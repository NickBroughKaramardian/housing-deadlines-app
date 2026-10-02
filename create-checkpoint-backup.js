#!/usr/bin/env node

/**
 * Comprehensive Checkpoint Backup Script
 * Creates a complete snapshot of the entire application state
 * This backup includes EVERYTHING needed to restore the app to this exact state
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get current timestamp for checkpoint name
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const checkpointName = `CHECKPOINT_${timestamp}`;
const checkpointDir = path.join(__dirname, 'checkpoints', checkpointName);

console.log(`\n🔒 Creating comprehensive checkpoint backup: ${checkpointName}\n`);

// Create checkpoint directory structure
if (!fs.existsSync(checkpointDir)) {
  fs.mkdirSync(checkpointDir, { recursive: true });
}

// Get git commit info
let gitCommit = 'unknown';
let gitBranch = 'unknown';
let gitStatus = 'unknown';
try {
  gitCommit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  gitStatus = execSync('git status --short', { encoding: 'utf8' }).trim() || 'clean';
} catch (error) {
  console.warn('⚠️  Git info not available');
}

// Read package.json for version info
const packageJsonPath = path.join(__dirname, 'package.json');
let packageJson = {};
try {
  packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
} catch (error) {
  console.warn('⚠️  Could not read package.json');
}

// Comprehensive list of everything to backup
const itemsToBackup = [
  // Core application files
  'src',
  'public',
  
  // Configuration files
  'package.json',
  'package-lock.json',
  'tailwind.config.js',
  'postcss.config.js',
  'firebase.json',
  'firestore.rules',
  'firestore.indexes.json',
  
  // Azure Functions
  'azure-functions',
  
  // Build artifacts
  'build',
  
  // Documentation
  'README.md',
  'BACKUP_README.md',
  '*.md', // All markdown files
  
  // Scripts and utilities
  'create-backup.js',
  'deploy.sh',
  'check-azure-status.sh',
  
  // Database and migration files
  'database',
  'migration',
  'deploy',
  
  // Teams integration
  'teams-app-package',
  'teams-manifest.json',
  
  // Service account (if exists, but be careful with sensitive data)
  // 'serviceAccountKey.json', // Commented out for security - uncomment if needed
];

// Additional files to find and backup
const additionalPatterns = [
  '*.js',
  '*.json',
  '*.sh',
  '*.md',
  '*.html',
  '*.css',
  '*.config.js',
];

// Helper function to copy directory recursively
function copyDirectory(source, dest, excludePatterns = []) {
  if (!fs.existsSync(source)) {
    return;
  }
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(source, { withFileTypes: true });
  
  for (const entry of entries) {
    // Skip node_modules, .git, and other large/excluded directories
    if (entry.name === 'node_modules' || 
        entry.name === '.git' || 
        entry.name === '.firebase' ||
        entry.name === 'checkpoints' ||
        entry.name.startsWith('VERSION_') && entry.name.endsWith('_BACKUP') ||
        entry.name.startsWith('CHECKPOINT_')) {
      continue;
    }
    
    const sourcePath = path.join(source, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destPath, excludePatterns);
    } else {
      try {
        fs.copyFileSync(sourcePath, destPath);
      } catch (error) {
        console.warn(`⚠️  Could not copy ${sourcePath}: ${error.message}`);
      }
    }
  }
}

// Helper function to copy file
function copyFile(source, dest) {
  if (!fs.existsSync(source)) {
    return false;
  }
  
  try {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(source, dest);
    return true;
  } catch (error) {
    console.warn(`⚠️  Could not copy ${source}: ${error.message}`);
    return false;
  }
}

// Backup main items
console.log('📦 Backing up core application files...');
itemsToBackup.forEach(item => {
  const sourcePath = path.join(__dirname, item);
  const destPath = path.join(checkpointDir, item);
  
  if (fs.existsSync(sourcePath)) {
    const stat = fs.statSync(sourcePath);
    
    if (stat.isDirectory()) {
      copyDirectory(sourcePath, destPath);
      console.log(`  ✓ Backed up directory: ${item}`);
    } else {
      if (copyFile(sourcePath, destPath)) {
        console.log(`  ✓ Backed up file: ${item}`);
      }
    }
  } else {
    console.log(`  ⚠️  Not found: ${item}`);
  }
});

// Backup all markdown documentation files
console.log('\n📚 Backing up documentation files...');
const rootDir = __dirname;
const files = fs.readdirSync(rootDir);
files.forEach(file => {
  if (file.endsWith('.md')) {
    const sourcePath = path.join(rootDir, file);
    const destPath = path.join(checkpointDir, file);
    if (copyFile(sourcePath, destPath)) {
      console.log(`  ✓ Backed up: ${file}`);
    }
  }
});

// Backup all JavaScript utility files in root
console.log('\n🔧 Backing up utility scripts...');
files.forEach(file => {
  if (file.endsWith('.js') && file !== 'create-checkpoint-backup.js' && !file.startsWith('node_modules')) {
    const sourcePath = path.join(rootDir, file);
    const destPath = path.join(checkpointDir, file);
    if (copyFile(sourcePath, destPath)) {
      console.log(`  ✓ Backed up: ${file}`);
    }
  }
});

// Backup shell scripts
console.log('\n🐚 Backing up shell scripts...');
files.forEach(file => {
  if (file.endsWith('.sh')) {
    const sourcePath = path.join(rootDir, file);
    const destPath = path.join(checkpointDir, file);
    if (copyFile(sourcePath, destPath)) {
      console.log(`  ✓ Backed up: ${file}`);
    }
  }
});

// Create comprehensive checkpoint info file
const checkpointInfo = {
  checkpointName: checkpointName,
  timestamp: new Date().toISOString(),
  version: packageJson.version || 'unknown',
  gitCommit: gitCommit,
  gitBranch: gitBranch,
  gitStatus: gitStatus,
  description: 'Comprehensive checkpoint backup - Complete application state snapshot',
  includes: [
    'All source code (src/)',
    'Public assets (public/)',
    'Configuration files',
    'Azure Functions',
    'Build artifacts',
    'Documentation',
    'Scripts and utilities',
    'Database migrations',
    'Teams integration files'
  ],
  excludes: [
    'node_modules (can be restored via npm install)',
    '.git directory',
    '.firebase cache',
    'Previous backup directories',
    'Service account keys (for security)'
  ],
  restoreInstructions: [
    '1. Copy all files from this checkpoint to your project directory',
    '2. Run: npm install',
    '3. Run: npm run build',
    '4. Deploy using your preferred method'
  ]
};

fs.writeFileSync(
  path.join(checkpointDir, 'CHECKPOINT_INFO.json'),
  JSON.stringify(checkpointInfo, null, 2)
);

// Create a manifest of all backed up files
console.log('\n📋 Creating file manifest...');
function createManifest(dir, baseDir = dir) {
  const manifest = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (entry.isDirectory()) {
      manifest.push({
        type: 'directory',
        path: relativePath
      });
      manifest.push(...createManifest(fullPath, baseDir));
    } else {
      const stat = fs.statSync(fullPath);
      manifest.push({
        type: 'file',
        path: relativePath,
        size: stat.size,
        modified: stat.mtime.toISOString()
      });
    }
  }
  
  return manifest;
}

const manifest = createManifest(checkpointDir);
fs.writeFileSync(
  path.join(checkpointDir, 'MANIFEST.json'),
  JSON.stringify({
    totalFiles: manifest.filter(m => m.type === 'file').length,
    totalDirectories: manifest.filter(m => m.type === 'directory').length,
    totalSize: manifest.filter(m => m.type === 'file').reduce((sum, f) => sum + (f.size || 0), 0),
    files: manifest
  }, null, 2)
);

console.log(`\n✅ Checkpoint backup complete!`);
console.log(`\n📁 Location: ${checkpointDir}`);
console.log(`📊 Files backed up: ${manifest.filter(m => m.type === 'file').length}`);
console.log(`📁 Directories: ${manifest.filter(m => m.type === 'directory').length}`);
console.log(`\n💾 Checkpoint info saved to: CHECKPOINT_INFO.json`);
console.log(`📋 File manifest saved to: MANIFEST.json`);
console.log(`\n🔒 This checkpoint contains everything needed to restore the app to this exact state.`);

