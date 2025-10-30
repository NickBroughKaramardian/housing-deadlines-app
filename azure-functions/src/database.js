const sql = require('mssql');
const { DefaultAzureCredential } = require('@azure/identity');

let pool = null;

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

async function getPool() {
  if (!pool) {
    try {
      pool = await sql.connect(config);
      console.log('Connected to Azure SQL Database');
    } catch (err) {
      console.error('Database connection failed:', err);
      throw err;
    }
  }
  return pool;
}

async function query(sqlQuery, params = {}) {
  const pool = await getPool();
  const request = pool.request();
  
  // Add parameters
  Object.keys(params).forEach(key => {
    request.input(key, params[key]);
  });
  
  const result = await request.query(sqlQuery);
  return result.recordset;
}

async function execute(sqlQuery, params = {}) {
  const pool = await getPool();
  const request = pool.request();
  
  // Add parameters
  Object.keys(params).forEach(key => {
    request.input(key, params[key]);
  });
  
  const result = await request.query(sqlQuery);
  return result;
}

module.exports = {
  query,
  execute,
  getPool
};
