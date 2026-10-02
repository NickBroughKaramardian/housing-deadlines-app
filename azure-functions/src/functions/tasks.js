const { app } = require('@azure/functions');
const db = require('../database');
const { requireAuth } = require('../auth');
const { corsHeaders, preflightResponse } = require('../cors');
const { publishEvent } = require('../webpubsub');

function serverError(request, context, err, message) {
  context.error(`${message}:`, err);
  return {
    status: 500,
    headers: corsHeaders(request),
    jsonBody: { error: message, correlationId: context.invocationId },
  };
}

// Fire-and-forget realtime notification: never fail the request over it.
function publishTaskEvent(context, eventType, payload) {
  Promise.resolve()
    .then(() => publishEvent(eventType, payload))
    .catch((err) => context.error(`Failed to publish ${eventType} event:`, err));
}

// GET /api/tasks
app.http('getTasks', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: requireAuth(async (request, context) => {
    try {
      const tasks = await db.queryTasks();
      return {
        status: 200,
        headers: corsHeaders(request),
        jsonBody: { success: true, data: tasks, count: tasks.length },
      };
    } catch (err) {
      return serverError(request, context, err, 'Failed to get tasks');
    }
  }),
});

// POST /api/tasks
app.http('createTask', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: requireAuth(async (request, context) => {
    try {
      const body = await request.json();
      if (!body?.title || !body?.deadline_date) {
        return {
          status: 400,
          headers: corsHeaders(request),
          jsonBody: { error: 'title and deadline_date are required' },
        };
      }
      const task = await db.createTask(body);
      publishTaskEvent(context, 'task.created', task);
      return { status: 201, headers: corsHeaders(request), jsonBody: { success: true, data: task } };
    } catch (err) {
      return serverError(request, context, err, 'Failed to create task');
    }
  }),
});

// PUT /api/tasks?id=...
app.http('updateTask', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: requireAuth(async (request, context) => {
    try {
      const url = new URL(request.url);
      const id = url.searchParams.get('id');
      if (!id) {
        return { status: 400, headers: corsHeaders(request), jsonBody: { error: 'id is required' } };
      }
      const updates = await request.json();
      const updated = await db.updateTask(id, updates);
      publishTaskEvent(context, 'task.updated', updated);
      return { status: 200, headers: corsHeaders(request), jsonBody: { success: true, data: updated } };
    } catch (err) {
      if (err.statusCode === 404) {
        return { status: 404, headers: corsHeaders(request), jsonBody: { error: 'Task not found' } };
      }
      if (err.statusCode === 412) {
        return {
          status: 409,
          headers: corsHeaders(request),
          jsonBody: { error: 'Conflict: task was modified by another request; reload and retry' },
        };
      }
      return serverError(request, context, err, 'Failed to update task');
    }
  }),
});

// DELETE /api/tasks?id=...
app.http('deleteTask', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: requireAuth(async (request, context) => {
    try {
      const url = new URL(request.url);
      const id = url.searchParams.get('id');
      if (!id) {
        return { status: 400, headers: corsHeaders(request), jsonBody: { error: 'id is required' } };
      }
      await db.deleteTask(id);
      publishTaskEvent(context, 'task.deleted', { id });
      // 204 No Content: no body, no Content-Type
      return { status: 204, headers: corsHeaders(request) };
    } catch (err) {
      if (err.statusCode === 404) {
        return { status: 404, headers: corsHeaders(request), jsonBody: { error: 'Task not found' } };
      }
      return serverError(request, context, err, 'Failed to delete task');
    }
  }),
});

// OPTIONS /api/tasks (CORS preflight — must not require auth)
app.http('optionsTasks', {
  methods: ['OPTIONS'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: async (request) => preflightResponse(request),
});
