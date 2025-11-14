// LAZY LOAD: Don't require mssql at module load time
// This allows functions to register even if mssql dependencies are corrupted
let sql = null;
let DefaultAzureCredential = null;
let pool = null;

function lazyLoadMssql() {
  if (!sql) {
    try {
      sql = require('mssql');
      DefaultAzureCredential = require('@azure/identity');
    } catch (err) {
      console.error('Failed to load mssql module:', err);
      throw new Error('Database module (mssql) is not available. Please check node_modules installation.');
    }
  }
  return { sql, DefaultAzureCredential };
}

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
  // Lazy load mssql only when actually needed
  const { sql: mssql } = lazyLoadMssql();
  
  if (!pool) {
    try {
      pool = await mssql.connect(config);
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
