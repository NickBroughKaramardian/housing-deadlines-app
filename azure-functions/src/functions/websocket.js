const { app } = require('@azure/functions');
const webpubsub = require('../webpubsub');
const { requireAuth } = require('../auth');
const { corsHeaders, preflightResponse } = require('../cors');

function serverError(request, context, err, message) {
  context.error(`${message}:`, err);
  return {
    status: 500,
    headers: corsHeaders(request),
    jsonBody: { error: message, correlationId: context.invocationId },
  };
}

// GET /api/websocket/token - Get WebSocket connection token
app.http('getWebSocketToken', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'websocket/token',
  handler: requireAuth(async (request, context, user) => {
    try {
      const token = await webpubsub.getClientAccessToken(user.userId);
      if (!token) {
        return {
          status: 503,
          headers: corsHeaders(request),
          jsonBody: { error: 'Real-time service is not configured' },
        };
      }
      return {
        status: 200,
        headers: corsHeaders(request),
        jsonBody: { success: true, data: { url: token.url, token: token.token } },
      };
    } catch (err) {
      return serverError(request, context, err, 'Failed to get WebSocket token');
    }
  }),
});

// POST /api/websocket/negotiate - Negotiate WebSocket connection
app.http('negotiateWebSocket', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'websocket/negotiate',
  handler: requireAuth(async (request, context, user) => {
    try {
      const token = await webpubsub.getClientAccessToken(user.userId);
      if (!token) {
        return {
          status: 503,
          headers: corsHeaders(request),
          jsonBody: { error: 'Real-time service is not configured' },
        };
      }
      return {
        status: 200,
        headers: corsHeaders(request),
        jsonBody: { url: token.url, accessToken: token.token },
      };
    } catch (err) {
      return serverError(request, context, err, 'Failed to negotiate WebSocket');
    }
  }),
});

// OPTIONS preflight handlers (must not require auth)
app.http('optionsWebSocketToken', {
  methods: ['OPTIONS'],
  authLevel: 'anonymous',
  route: 'websocket/token',
  handler: async (request) => preflightResponse(request),
});

app.http('optionsWebSocketNegotiate', {
  methods: ['OPTIONS'],
  authLevel: 'anonymous',
  route: 'websocket/negotiate',
  handler: async (request) => preflightResponse(request),
});
