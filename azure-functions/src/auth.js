const { DefaultAzureCredential } = require('@azure/identity');

// Simple auth middleware for Azure Functions
function authenticateRequest(req) {
  // In production, you'd validate the JWT token from the frontend
  // For now, we'll extract user info from headers or use a simple approach
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid authorization header');
  }

  // In a real implementation, you'd decode and validate the JWT
  // For now, we'll extract user info from the token or use a mock
  const token = authHeader.substring(7);
  
  // Mock user extraction - replace with real JWT validation
  return {
    userId: 'mock-user-id',
    email: 'user@example.com',
    name: 'Test User'
  };
}

function requireAuth(handler) {
  return async (context, req) => {
    try {
      const user = authenticateRequest(req);
      req.user = user;
      return await handler(context, req);
    } catch (error) {
      context.res = {
        status: 401,
        body: { error: 'Unauthorized', message: error.message }
      };
    }
  };
}

module.exports = {
  authenticateRequest,
  requireAuth
};
