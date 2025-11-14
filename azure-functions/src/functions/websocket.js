const { app } = require('@azure/functions');
const webpubsub = require('../webpubsub');
const { requireAuth } = require('../auth');

// GET /api/websocket/token - Get WebSocket connection token
app.http('getWebSocketToken', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'websocket/token',
  handler: requireAuth(async (request, context) => {
    try {
      const userId = request.user.userId;
      const token = await webpubsub.getClientAccessToken(userId);

      if (!token) {
        return {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
          jsonBody: { error: 'Failed to generate WebSocket token' }
        };
      }

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        jsonBody: {
          success: true,
          data: {
            url: token.url,
            token: token.token
          }
        }
      };

    } catch (error) {
      console.error('Error getting WebSocket token:', error);
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: { error: 'Failed to get WebSocket token', message: error.message }
      };
    }
  })
});

// POST /api/websocket/negotiate - Negotiate WebSocket connection (for Azure Functions integration)
app.http('negotiateWebSocket', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'websocket/negotiate',
  handler: requireAuth(async (request, context) => {
    try {
      const userId = request.user.userId;
      const token = await webpubsub.getClientAccessToken(userId);

      if (!token) {
        return {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
          jsonBody: { error: 'Failed to negotiate WebSocket connection' }
        };
      }

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        jsonBody: {
          url: token.url,
          accessToken: token.token
        }
      };

    } catch (error) {
      console.error('Error negotiating WebSocket:', error);
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: { error: 'Failed to negotiate WebSocket', message: error.message }
      };
    }
  })
});
