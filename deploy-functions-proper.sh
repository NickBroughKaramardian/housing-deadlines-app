#!/bin/bash

# Proper Azure Functions Deployment - Uses func tool which handles dependencies correctly

set -e

FUNCTIONS_APP="cc-project-api"
RESOURCE_GROUP="CCDEVTEST"

echo "🚀 Deploying Azure Functions using func tool..."

cd azure-functions

# Check if func is installed
if ! command -v func &> /dev/null; then
    echo "📦 Installing Azure Functions Core Tools..."
    npm install -g azure-functions-core-tools@4 --unsafe-perm true
fi

# Deploy using func - this handles dependency installation correctly
echo "🚀 Deploying to $FUNCTIONS_APP..."
func azure functionapp publish $FUNCTIONS_APP --build remote

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Wait 2-3 minutes for Azure to install dependencies and start"
echo "2. Check Log Stream for '========== INDEX.JS LOADING ==========' messages"
echo "3. Go to Functions menu - should see your functions"
echo "4. Test: https://cc-project-api.azurewebsites.net/api/test"
echo ""


