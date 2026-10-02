#!/usr/bin/env node

/**
 * Backup Script - Creates a full backup of the app
 * Usage: node create-backup.js [version]
 * If version is not provided, it will increment the last version by 0.0.1
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read current version from package.json
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

// Parse version or increment
let version;
if (process.argv[2]) {
  version = process.argv[2];
} else {
  // Increment patch version (0.0.1)
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  version = `${major}.${minor}.${patch + 1}`;
}

console.log(`Creating backup for version ${version}...`);

// Backup directory name
const backupDir = path.join(__dirname, `VERSION_${version}_BACKUP`);

// Directories and files to backup
const itemsToBackup = [
  'src',
  'public',
  'package.json',
  'package-lock.json',
  'tailwind.config.js',
  'postcss.config.js',
  'firebase.json',
  'firestore.rules',
  'firestore.indexes.json',
  'README.md'
];

// Create backup directory
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Copy files and directories
itemsToBackup.forEach(item => {
  const sourcePath = path.join(__dirname, item);
  const destPath = path.join(backupDir, item);
  
  if (fs.existsSync(sourcePath)) {
    const stat = fs.statSync(sourcePath);
    
    if (stat.isDirectory()) {
      // Copy directory recursively
      copyDirectory(sourcePath, destPath);
    } else {
      // Copy file
      fs.copyFileSync(sourcePath, destPath);
    }
    console.log(`✓ Backed up ${item}`);
  }
});

// Create version info file
const versionInfo = {
  version: version,
  date: new Date().toISOString(),
  gitCommit: getGitCommit(),
  description: 'Full app backup'
};

fs.writeFileSync(
  path.join(backupDir, 'VERSION_INFO.json'),
  JSON.stringify(versionInfo, null, 2)
);

// Update package.json version
packageJson.version = version;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

// Update SettingsPage.js version
updateSettingsPageVersion(version);

console.log(`\n✅ Backup created: ${backupDir}`);
console.log(`✅ Version updated to ${version} in package.json`);
console.log(`✅ Settings page updated to show v${version}`);

// Helper function to copy directory recursively
function copyDirectory(source, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(source, { withFileTypes: true });
  
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

// Get git commit hash
function getGitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

// Update SettingsPage.js version
function updateSettingsPageVersion(version) {
  const settingsPath = path.join(__dirname, 'src', 'SettingsPage.js');
  let content = fs.readFileSync(settingsPath, 'utf8');
  
  // Replace version in SettingsPage - matches "Version v3.1.0" format
  content = content.replace(
    /Version v\d+\.\d+\.\d+/,
    `Version v${version}`
  );
  
  fs.writeFileSync(settingsPath, content);
}

