#!/bin/bash

# Minimal Azure Functions Deployment Script
# Creates a small zip without node_modules and deploys it

set -e

FUNCTIONS_APP="cc-project-api"

echo "🚀 Creating minimal deployment package..."

cd azure-functions

# Create a clean zip without node_modules
echo "📦 Creating deployment zip (excluding node_modules)..."
zip -r ../functionapp-minimal.zip . \
  -x "node_modules/*" \
  -x ".git/*" \
  -x "*.log" \
  -x ".DS_Store" \
  -x ".vscode/*" \
  -x ".idea/*" \
  -x "*.md" \
  -x "local.settings.json" \
  > /dev/null 2>&1

ZIP_SIZE=$(du -h ../functionapp-minimal.zip | cut -f1)
echo "✅ Created deployment package: $ZIP_SIZE"

# Deploy using Azure CLI
echo "🚀 Deploying to Azure..."
az functionapp deployment source config-zip \
  --resource-group CCDEVTEST \
  --name $FUNCTIONS_APP \
  --src ../functionapp-minimal.zip

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Wait 2-3 minutes for Azure to process the deployment"
echo "2. Go to Azure Portal → cc-project-api → Functions"
echo "3. You should see: test, getTasks, createTask, updateTask, deleteTask"
echo "4. Test: https://cc-project-api.azurewebsites.net/api/test"
echo ""


