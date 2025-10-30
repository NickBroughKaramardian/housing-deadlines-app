#!/bin/bash

# Microsoft 365 Only Deployment Script
# This script deploys the Microsoft 365-only version of your app

echo "🚀 Deploying Microsoft 365-Only Version..."

# Backup current App.js
echo "📦 Backing up current App.js..."
cp src/App.js src/App.js.firebase-backup-$(date +%Y%m%d_%H%M%S)

# Replace with Microsoft 365-only version
echo "🔄 Switching to Microsoft 365-only version..."
cp src/microsoftOnlyApp.js src/App.js

# Update package.json to remove Firebase dependencies
echo "📝 Updating package.json..."
cat > package.json << 'PACKAGE_EOF'
{
  "name": "c-and-c-project-manager",
  "version": "1.6.0",
  "private": true,
  "dependencies": {
    "@azure/msal-browser": "^3.5.0",
    "@microsoft/microsoft-graph-client": "^3.0.7",
    "@heroicons/react": "^2.0.18",
    "date-fns": "^2.30.0",
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

# Remove Firebase dependencies
echo "🗑️ Removing Firebase dependencies..."
npm uninstall firebase

# Install Microsoft dependencies
echo "📦 Installing Microsoft 365 dependencies..."
npm install

# Build the app
echo "🔨 Building Microsoft 365-only app..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Deploy to Firebase Hosting
    echo "🚀 Deploying to Firebase Hosting..."
    npx --yes firebase-tools@latest deploy --only hosting
    
    if [ $? -eq 0 ]; then
        echo "🎉 Microsoft 365-only deployment complete!"
        echo "🌐 Your app is now running at: https://ccprojectmanager.web.app"
        echo "🔧 Environment: Test (Safe for testing)"
        echo ""
        echo "📋 Next steps:"
        echo "1. Complete the SharePoint setup in your app"
        echo "2. Test all functionality"
        echo "3. When ready for enterprise, update microsoftOnlyConfig.js"
        echo ""
        echo "🔄 To switch back to Firebase version, run: ./restore-firebase.sh"
    else
        echo "❌ Deployment failed!"
        exit 1
    fi
else
    echo "❌ Build failed!"
    exit 1
fi
