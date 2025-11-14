const { DefaultAzureCredential } = require('@azure/identity');

// Simple auth middleware for Azure Functions
function authenticateRequest(request) {
  // In production, you'd validate the JWT token from the frontend
  // For now, we'll extract user info from headers or use a simple approach
  
  const authHeader = request.headers?.authorization || request.headers?.get?.('authorization');
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
  return async (request, context) => {
    try {
      const user = authenticateRequest(request);
      request.user = user;
      return await handler(request, context);
    } catch (error) {
      return {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: { error: 'Unauthorized', message: error.message }
      };
    }
  };
}

module.exports = {
  authenticateRequest,
  requireAuth
};
