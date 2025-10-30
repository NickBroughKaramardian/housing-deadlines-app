#!/bin/bash

# Restore Firebase Version Script
# This script restores the Firebase version of your app

echo "🔄 Restoring Firebase Version..."

# Restore App.js from backup
echo "📦 Restoring App.js from backup..."
if [ -f "src/App.js.firebase-backup" ]; then
    cp src/App.js.firebase-backup src/App.js
    echo "✅ App.js restored from backup"
else
    echo "❌ No Firebase backup found!"
    echo "Please restore manually from VERSION_1.4.10_BACKUP/"
    exit 1
fi

# Restore package.json with Firebase dependencies
echo "📝 Restoring package.json with Firebase dependencies..."
cat > package.json << 'PACKAGE_EOF'
{
  "name": "c-and-c-project-manager",
  "version": "1.4.9",
  "private": true,
  "dependencies": {
    "@azure/msal-browser": "^3.5.0",
    "@microsoft/microsoft-graph-client": "^3.0.7",
    "@heroicons/react": "^2.0.18",
    "date-fns": "^2.30.0",
    "firebase": "^10.7.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "react-select": "^5.8.0",
    "xlsx": "^0.18.5",
    "papaparse": "^5.4.1",
    "web-vitals": "^2.1.4"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "homepage": "https://ccprojectmanager.web.app"
}
PACKAGE_EOF

# Install Firebase dependencies
echo "📦 Installing Firebase dependencies..."
npm install firebase

# Build the app
echo "🔨 Building Firebase version..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Deploy to Firebase Hosting
    echo "🚀 Deploying to Firebase Hosting..."
    npx --yes firebase-tools@latest deploy --only hosting
    
    if [ $? -eq 0 ]; then
        echo "🎉 Firebase version restored and deployed!"
        echo "🌐 Your app is now running at: https://ccprojectmanager.web.app"
        echo "🔥 Environment: Firebase + Microsoft 365 (Hybrid)"
    else
        echo "❌ Deployment failed!"
        exit 1
    fi
else
    echo "❌ Build failed!"
    exit 1
fi
