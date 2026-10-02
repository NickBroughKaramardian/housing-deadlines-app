#!/bin/bash

# Direct Azure Functions Deployment Script
# No GitHub required - deploys directly from your local machine

set -e

echo "🚀 Deploying Azure Functions directly to Azure..."

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI not found. Please install it first:"
    echo "   https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if user is logged in
if ! az account show &> /dev/null; then
    echo "❌ Please log in to Azure CLI first:"
    echo "   az login"
    exit 1
fi

# Function App name (from your Azure Portal)
FUNCTIONS_APP="cc-project-api"

echo "📦 Deploying to: $FUNCTIONS_APP"

# Navigate to functions directory
cd azure-functions

# Don't install dependencies locally - Azure will do it remotely
# This keeps the deployment package small

# Deploy using Azure Functions Core Tools
echo "🚀 Deploying functions (Azure will install dependencies remotely)..."
if command -v func &> /dev/null; then
    func azure functionapp publish $FUNCTIONS_APP --build remote --no-bundle
else
    echo "⚠️  Azure Functions Core Tools not found."
    echo "   Installing via npm..."
    npm install -g azure-functions-core-tools@4 --unsafe-perm true
    func azure functionapp publish $FUNCTIONS_APP --build remote --no-bundle
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Go to Azure Portal → cc-project-api → Functions"
echo "2. You should see: test, getTasks, createTask, updateTask, deleteTask"
echo "3. Test the API: https://cc-project-api.azurewebsites.net/api/test"
echo ""

