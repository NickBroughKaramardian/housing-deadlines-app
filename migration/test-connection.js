const sql = require('mssql');
const { DefaultAzureCredential } = require('@azure/identity');

// Test Azure SQL connection
async function testConnection() {
  console.log('🔍 Testing Azure SQL connection...');

  const config = {
    server: process.env.AZURE_SQL_SERVER || 'your-server.database.windows.net',
    database: process.env.AZURE_SQL_DATABASE || 'ccprojectmanager',
    authentication: {
      type: 'azure-active-directory-default'
    },
    options: {
      encrypt: true,
      trustServerCertificate: false
    }
  };

  try {
    await sql.connect(config);
    console.log('✅ Successfully connected to Azure SQL Database');
    
    // Test a simple query
    const result = await sql.query('SELECT COUNT(*) as count FROM projects');
    console.log('✅ Database query successful. Projects count:', result.recordset[0].count);
    
    await sql.close();
    console.log('✅ Connection test passed!');
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure you\'re logged in to Azure CLI: az login');
    console.log('2. Check that the SQL server exists and is accessible');
    console.log('3. Verify the database name is correct');
    console.log('4. Check firewall rules in Azure Portal');
    process.exit(1);
  }
}

// Test SharePoint connection
async function testSharePointConnection() {
  console.log('🔍 Testing SharePoint connection...');
  
  try {
    const { Client } = require('@microsoft/microsoft-graph-client');
    const { AuthenticationProvider } = require('@microsoft/microsoft-graph-client');

    class SharePointAuthProvider extends AuthenticationProvider {
      async getAccessToken() {
        const credential = new DefaultAzureCredential();
        const tokenResponse = await credential.getToken('https://graph.microsoft.com/.default');
        return tokenResponse.token;
      }
    }

    const graphClient = Client.initWithMiddleware({
      authProvider: new SharePointAuthProvider()
    });

    // Test with a simple call
    const sites = await graphClient.api('/sites').get();
    console.log('✅ Successfully connected to Microsoft Graph');
    console.log('✅ Found', sites.value.length, 'sites');
    
  } catch (error) {
    console.error('❌ SharePoint connection test failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure you have the correct permissions');
    console.log('2. Check that your Azure AD app has the right scopes');
    console.log('3. Verify the SharePoint site ID is correct');
  }
}

// Run tests
async function runTests() {
  console.log('🧪 Running connection tests...\n');
  
  await testConnection();
  console.log('');
  await testSharePointConnection();
  
  console.log('\n🎉 All tests completed!');
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testConnection, testSharePointConnection };
