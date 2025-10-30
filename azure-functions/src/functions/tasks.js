const { app } = require('@azure/functions');
const db = require('../database');

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// GET /api/tasks
app.http('getTasks', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: async () => {
    try {
      const tasks = await db.queryTasks();
      return { status: 200, headers: corsHeaders(), jsonBody: { success: true, data: tasks, count: tasks.length } };
    } catch (err) {
      return { status: 500, headers: corsHeaders(), jsonBody: { error: 'Failed to get tasks', message: String(err?.message || err) } };
    }
  },
});

// POST /api/tasks
app.http('createTask', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: async (request) => {
    try {
      const body = await request.json();
      if (!body?.title || !body?.deadline_date) {
        return { status: 400, headers: corsHeaders(), jsonBody: { error: 'title and deadline_date are required' } };
      }
      const task = await db.createTask(body);
      return { status: 201, headers: corsHeaders(), jsonBody: { success: true, data: task } };
    } catch (err) {
      return { status: 500, headers: corsHeaders(), jsonBody: { error: 'Failed to create task', message: String(err?.message || err) } };
    }
  },
});

// PUT /api/tasks?id=...
app.http('updateTask', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: async (request) => {
    try {
      const url = new URL(request.url);
      const id = url.searchParams.get('id');
      if (!id) return { status: 400, headers: corsHeaders(), jsonBody: { error: 'id is required' } };
      const updates = await request.json();
      const updated = await db.updateTask(id, updates);
      return { status: 200, headers: corsHeaders(), jsonBody: { success: true, data: updated } };
    } catch (err) {
      return { status: 500, headers: corsHeaders(), jsonBody: { error: 'Failed to update task', message: String(err?.message || err) } };
    }
  },
});

// DELETE /api/tasks?id=...
app.http('deleteTask', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: async (request) => {
    try {
      const url = new URL(request.url);
      const id = url.searchParams.get('id');
      if (!id) return { status: 400, headers: corsHeaders(), jsonBody: { error: 'id is required' } };
      await db.deleteTask(id);
      return { status: 204, headers: corsHeaders(), body: '' };
    } catch (err) {
      return { status: 500, headers: corsHeaders(), jsonBody: { error: 'Failed to delete task', message: String(err?.message || err) } };
    }
  },
});

// OPTIONS /api/tasks (CORS preflight)
app.http('optionsTasks', {
  methods: ['OPTIONS'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: async () => ({ status: 200, headers: { ...corsHeaders(), 'Access-Control-Max-Age': '86400' }, body: '' }),
});
