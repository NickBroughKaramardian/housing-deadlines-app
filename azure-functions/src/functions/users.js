const { app } = require('@azure/functions');
const db = require('../database');
const { requireAuth, VALID_ROLES } = require('../auth');
const { corsHeaders, preflightResponse } = require('../cors');

function serverError(request, context, err, message) {
  context.error(`${message}:`, err);
  return {
    status: 500,
    headers: corsHeaders(request),
    jsonBody: { error: message, correlationId: context.invocationId },
  };
}

// GET /api/me — identity + resolved role for the calling user
app.http('getMe', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'me',
  handler: requireAuth(async (request, context, user) => {
    return {
      status: 200,
      headers: corsHeaders(request),
      jsonBody: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
        departments: user.departments,
      },
    };
  }),
});

// OPTIONS /api/me (CORS preflight — must not require auth)
app.http('optionsMe', {
  methods: ['OPTIONS'],
  authLevel: 'anonymous',
  route: 'me',
  handler: async (request) => preflightResponse(request),
});

// GET /api/userAssignments — all assignment docs (any authenticated user)
app.http('getUserAssignments', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'userAssignments',
  handler: requireAuth(async (request, context) => {
    try {
      const assignments = await db.listUserAssignments();
      return {
        status: 200,
        headers: corsHeaders(request),
        jsonBody: { success: true, data: assignments, count: assignments.length },
      };
    } catch (err) {
      return serverError(request, context, err, 'Failed to get user assignments');
    }
  }),
});

// PUT /api/userAssignments — upsert one assignment (ADMIN only)
app.http('putUserAssignment', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'userAssignments',
  handler: requireAuth(
    async (request, context) => {
      try {
        const body = await request.json();
        const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
        const role = body?.role;
        if (!email) {
          return { status: 400, headers: corsHeaders(request), jsonBody: { error: 'email is required' } };
        }
        if (!VALID_ROLES.includes(role)) {
          return {
            status: 403,
            headers: corsHeaders(request),
            jsonBody: { error: `role must be one of ${VALID_ROLES.join('|')}` },
          };
        }
        const saved = await db.upsertUserAssignment({ email, role, departments: body?.departments });
        return { status: 200, headers: corsHeaders(request), jsonBody: { success: true, data: saved } };
      } catch (err) {
        return serverError(request, context, err, 'Failed to save user assignment');
      }
    },
    { adminOnly: true }
  ),
});

// OPTIONS /api/userAssignments (CORS preflight — must not require auth)
app.http('optionsUserAssignments', {
  methods: ['OPTIONS'],
  authLevel: 'anonymous',
  route: 'userAssignments',
  handler: async (request) => preflightResponse(request),
});
