// Root entry point for Azure Functions v4 programming model
// CRITICAL: This file MUST be at the root and MUST export the app singleton
// Azure Functions v4 Node.js programming model REQUIRES module.exports = app

// Force immediate logging to verify this file loads
console.error('========== INDEX.JS LOADING ==========');
console.error('Timestamp:', new Date().toISOString());
console.error('Process PID:', process.pid);

const { app } = require('@azure/functions');

console.error('========== APP REQUIRED ==========');
console.error('App exists:', !!app);
console.error('Node version:', process.version);
console.error('Current directory:', __dirname);
console.error('File name:', __filename);

console.error('========== REGISTERING FUNCTIONS ==========');

try {
  // Register a simple test function FIRST to verify deployment
  console.error('Registering test function...');
  app.http('test', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'test',
    handler: async (request, context) => {
      context.log('Test function called');
      return { 
        status: 200, 
        headers: {
          'Content-Type': 'application/json',
          // CORS is handled automatically by Azure portal configuration
        },
        jsonBody: { 
          message: 'API is working!', 
          timestamp: new Date().toISOString(),
          functions: ['test', 'getTasks', 'createTask', 'updateTask', 'deleteTask']
        } 
      };
    }
  });
  console.error('✓ Test function registered');

  // CRITICAL: Import function modules AFTER app is created but BEFORE export
  // Functions register themselves when their modules are loaded
  console.error('Loading tasks module...');
  require('./src/functions/tasks');
  console.error('✓ Tasks functions loaded');

  console.error('Loading websocket module...');
  require('./src/functions/websocket');
  console.error('✓ WebSocket functions loaded');

  // Log registered functions for debugging
  const registeredFunctions = [];
  try {
    // Try to get list of registered functions (if available)
    if (app.registeredHttpFunctions) {
      registeredFunctions.push(...Object.keys(app.registeredHttpFunctions));
    }
  } catch (e) {
    // Ignore if not available
  }
  console.error(`Registered HTTP functions: ${registeredFunctions.length > 0 ? registeredFunctions.join(', ') : 'Unable to enumerate'}`);

  console.error('========== STARTUP COMPLETE - ABOUT TO EXPORT ==========');
} catch (error) {
  console.error('=== STARTUP ERROR ===');
  console.error('Error during function registration:', error);
  console.error('Stack:', error.stack);
  throw error;
}

// Export the app instance - REQUIRED for Azure Functions v4
// This is how Azure discovers and registers all functions
console.error('========== EXPORTING APP ==========');
module.exports = app;
console.error('========== APP EXPORTED ==========');

// Azure Functions v4 Node.js programming model REQUIRES module.exports = app

// Force immediate logging to verify this file loads
console.error('========== INDEX.JS LOADING ==========');
console.error('Timestamp:', new Date().toISOString());
console.error('Process PID:', process.pid);

const { app } = require('@azure/functions');

console.error('========== APP REQUIRED ==========');
console.error('App exists:', !!app);
console.error('Node version:', process.version);
console.error('Current directory:', __dirname);
console.error('File name:', __filename);

console.error('========== REGISTERING FUNCTIONS ==========');

try {
  // Register a simple test function FIRST to verify deployment
  console.error('Registering test function...');
  app.http('test', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'test',
    handler: async (request, context) => {
      context.log('Test function called');
      return { 
        status: 200, 
        headers: {
          'Content-Type': 'application/json',
          // CORS is handled automatically by Azure portal configuration
        },
        jsonBody: { 
          message: 'API is working!', 
          timestamp: new Date().toISOString(),
          functions: ['test', 'getTasks', 'createTask', 'updateTask', 'deleteTask']
        } 
      };
    }
  });
  console.error('✓ Test function registered');

  // CRITICAL: Import function modules AFTER app is created but BEFORE export
  // Functions register themselves when their modules are loaded
  console.error('Loading tasks module...');
  require('./src/functions/tasks');
  console.error('✓ Tasks functions loaded');

  console.error('Loading websocket module...');
  require('./src/functions/websocket');
  console.error('✓ WebSocket functions loaded');

  // Log registered functions for debugging
  const registeredFunctions = [];
  try {
    // Try to get list of registered functions (if available)
    if (app.registeredHttpFunctions) {
      registeredFunctions.push(...Object.keys(app.registeredHttpFunctions));
    }
  } catch (e) {
    // Ignore if not available
  }
  console.error(`Registered HTTP functions: ${registeredFunctions.length > 0 ? registeredFunctions.join(', ') : 'Unable to enumerate'}`);

  console.error('========== STARTUP COMPLETE - ABOUT TO EXPORT ==========');
} catch (error) {
  console.error('=== STARTUP ERROR ===');
  console.error('Error during function registration:', error);
  console.error('Stack:', error.stack);
  throw error;
}

// Export the app instance - REQUIRED for Azure Functions v4
// This is how Azure discovers and registers all functions
console.error('========== EXPORTING APP ==========');
module.exports = app;
console.error('========== APP EXPORTED ==========');

