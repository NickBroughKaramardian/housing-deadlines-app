const { app } = require('@azure/functions');
const webpubsub = require('../webpubsub');
const { requireAuth } = require('../auth');

// GET /api/websocket/token - Get WebSocket connection token
app.http('getWebSocketToken', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'websocket/token',
  handler: requireAuth(async (context, req) => {
    try {
      const userId = req.user.userId;
      const token = await webpubsub.getClientAccessToken(userId);

      if (!token) {
        context.res = {
          status: 500,
          body: { error: 'Failed to generate WebSocket token' }
        };
        return;
      }

      context.res = {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          success: true,
          data: {
            url: token.url,
            token: token.token
          }
        }
      };

    } catch (error) {
      console.error('Error getting WebSocket token:', error);
      context.res = {
        status: 500,
        body: { error: 'Failed to get WebSocket token', message: error.message }
      };
    }
  })
});

// POST /api/websocket/negotiate - Negotiate WebSocket connection (for Azure Functions integration)
app.http('negotiateWebSocket', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'websocket/negotiate',
  handler: requireAuth(async (context, req) => {
    try {
      const userId = req.user.userId;
      const token = await webpubsub.getClientAccessToken(userId);

      if (!token) {
        context.res = {
          status: 500,
          body: { error: 'Failed to negotiate WebSocket connection' }
        };
        return;
      }

      context.res = {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          url: token.url,
          accessToken: token.token
        }
      };

    } catch (error) {
      console.error('Error negotiating WebSocket:', error);
      context.res = {
        status: 500,
        body: { error: 'Failed to negotiate WebSocket', message: error.message }
      };
    }
  })
});
