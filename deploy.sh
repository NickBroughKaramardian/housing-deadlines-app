#!/bin/bash

# Auto-deploy script for C&C Project Manager
# Builds and deploys to production on every change

set -e

echo "🚀 Building and deploying to production..."

# Build the app
echo "📦 Building React app..."
npm run build

# Deploy to Firebase Hosting (if you're using Firebase)
if command -v firebase &> /dev/null; then
    echo "🔥 Deploying to Firebase Hosting..."
    firebase deploy --only hosting
else
    echo "⚠️  Firebase CLI not found. Please install: npm install -g firebase-tools"
    echo "📁 Build files ready in ./build directory"
    echo "   You can manually upload these to your hosting provider"
fi

echo "✅ Deployment complete!"
echo "🌐 Your app should be live at: https://ccprojectmanager.web.app"
