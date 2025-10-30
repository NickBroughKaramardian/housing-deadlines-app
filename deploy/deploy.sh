#!/bin/bash

# Azure Deployment Script for C&C Project Manager
# Run this after setting up Azure resources

set -e

echo "🚀 Deploying C&C Project Manager to Azure..."

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI not found. Please install it first: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if user is logged in
if ! az account show &> /dev/null; then
    echo "❌ Please log in to Azure CLI first: az login"
    exit 1
fi

# Set variables (update these with your values)
RESOURCE_GROUP="cc-project-manager"
FUNCTIONS_APP="ccprojectmanager-functions"
SQL_SERVER="ccprojectmanager-sql"
SQL_DATABASE="ccprojectmanager"

echo "📦 Deploying Azure Functions..."

# Deploy Functions
cd azure-functions
func azure functionapp publish $FUNCTIONS_APP --build remote

echo "✅ Functions deployed successfully!"

# Get connection strings
echo "🔗 Getting connection strings..."

SQL_CONNECTION_STRING=$(az sql db show-connection-string --server $SQL_SERVER --name $SQL_DATABASE --client ado.net --output tsv)
WEBPUBSUB_CONNECTION_STRING=$(az webpubsub key show --name ccprojectmanager-pubsub --resource-group $RESOURCE_GROUP --query primaryConnectionString --output tsv)

echo "📝 Add these to your Function App Configuration:"
echo ""
echo "AZURE_SQL_SERVER=$SQL_SERVER.database.windows.net"
echo "AZURE_SQL_DATABASE=$SQL_DATABASE"
echo "WEB_PUBSUB_CONNECTION_STRING=$WEBPUBSUB_CONNECTION_STRING"
echo ""

echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Add the connection strings to your Function App Configuration"
echo "2. Run the database schema script in Azure SQL Query Editor"
echo "3. Update your React app's .env file with the API URL"
echo "4. Run the migration script to move data from SharePoint"
echo ""
echo "Your API will be available at: https://$FUNCTIONS_APP.azurewebsites.net/api"
