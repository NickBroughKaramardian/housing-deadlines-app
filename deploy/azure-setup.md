# Azure Setup Instructions

## What You Need to Do (5 minutes)

### 1. Create Azure Resources

Run these commands in Azure Cloud Shell or Azure CLI:

```bash
# Set variables
RESOURCE_GROUP="cc-project-manager"
LOCATION="eastus"
SQL_SERVER="ccprojectmanager-sql"
SQL_DATABASE="ccprojectmanager"
FUNCTIONS_APP="ccprojectmanager-functions"
WEBPUBSUB="ccprojectmanager-pubsub"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create SQL Server
az sql server create \
  --name $SQL_SERVER \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --admin-user "ccadmin" \
  --admin-password "YourSecurePassword123!"

# Create SQL Database
az sql db create \
  --name $SQL_DATABASE \
  --resource-group $RESOURCE_GROUP \
  --server $SQL_SERVER \
  --service-objective "S0"

# Create Functions App
az functionapp create \
  --name $FUNCTIONS_APP \
  --resource-group $RESOURCE_GROUP \
  --consumption-plan-location $LOCATION \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4

# Create Web PubSub
az webpubsub create \
  --name $WEBPUBSUB \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_S1

# Get connection strings
echo "SQL Connection String:"
az sql db show-connection-string --server $SQL_SERVER --name $SQL_DATABASE --client ado.net

echo "Web PubSub Connection String:"
az webpubsub key show --name $WEBPUBSUB --resource-group $RESOURCE_GROUP --query primaryConnectionString -o tsv
```

### 2. Configure Database

1. Go to Azure Portal → SQL Database → Query Editor
2. Run the SQL script from `database/schema.sql`
3. This creates all tables and stored procedures

### 3. Configure Functions App

1. Go to Azure Portal → Function App → Configuration
2. Add these Application Settings:

```
AZURE_SQL_SERVER=ccprojectmanager-sql.database.windows.net
AZURE_SQL_DATABASE=ccprojectmanager
WEB_PUBSUB_CONNECTION_STRING=Endpoint=https://ccprojectmanager-pubsub.webpubsub.azure.com;AccessKey=...
AZURE_CLIENT_ID=your-client-id
AZURE_TENANT_ID=your-tenant-id
```

### 4. Deploy Functions Code

```bash
# Install Azure Functions Core Tools
npm install -g azure-functions-core-tools@4 --unsafe-perm true

# Deploy from the azure-functions directory
cd azure-functions
func azure functionapp publish $FUNCTIONS_APP
```

### 5. Update Frontend Environment

Create `.env` file in your React app root:

```env
REACT_APP_API_URL=https://ccprojectmanager-functions.azurewebsites.net/api
REACT_APP_AZURE_CLIENT_ID=your-client-id
REACT_APP_AZURE_TENANT_ID=your-tenant-id
```

### 6. Run Migration Script

```bash
cd migration
npm install
node migrate-from-sharepoint.js
```

## That's It!

Your app will now use Azure SQL instead of SharePoint. All the benefits:

✅ **No more SharePoint errors**  
✅ **Real-time updates across devices**  
✅ **Fast, reliable database**  
✅ **Full control over your data**  
✅ **Much cheaper than SharePoint issues**

## Troubleshooting

- **Database connection issues**: Check firewall rules in Azure SQL
- **Functions not working**: Check Application Settings in Azure Portal
- **WebSocket not connecting**: Verify Web PubSub connection string
- **Migration errors**: Check SharePoint permissions and list IDs

## Cost Estimate

- Azure SQL (S0): ~$15-30/month
- Azure Functions: ~$5-20/month  
- Web PubSub: ~$10-20/month
- **Total: ~$30-70/month** (vs. hours of debugging SharePoint)
