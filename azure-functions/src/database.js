const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

let client = null;
let container = null;
let taskPartitionKeyFieldPromise = null;
let userAssignmentsContainerPromise = null;

// Fields owned by the server / Cosmos that clients must never overwrite.
const SERVER_OWNED_FIELDS = ['id', '_etag', '_rid', '_ts', '_self', '_attachments'];

const USER_ASSIGNMENTS_CONTAINER_ID = 'userAssignments';

function statusCodeOf(err) {
  const code = err && (err.statusCode ?? err.code);
  return typeof code === 'number' ? code : null;
}

function httpError(statusCode, message) {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
}

function getClient() {
  if (!client) {
    const endpoint = process.env.COSMOS_ENDPOINT;
    const key = process.env.COSMOS_PRIMARY_KEY;

    if (!endpoint) {
      throw new Error('Cosmos DB connection not configured. Set COSMOS_ENDPOINT (and optionally COSMOS_PRIMARY_KEY)');
    }

    if (key) {
      client = new CosmosClient({ endpoint, key });
    } else {
      // No key configured: authenticate with the Function App's managed
      // identity / developer credentials via AAD.
      client = new CosmosClient({ endpoint, aadCredentials: new DefaultAzureCredential() });
    }
  }
  return client;
}

function getDatabaseId() {
  return process.env.COSMOS_DATABASE_ID || 'housing-deadlines-db';
}

function getContainer() {
  if (!container) {
    const containerId = process.env.COSMOS_CONTAINER_ID || 'tasks';
    container = getClient().database(getDatabaseId()).container(containerId);
  }
  return container;
}

/**
 * Top-level field name of the tasks container's partition key (cached).
 */
function getTaskPartitionKeyField() {
  if (!taskPartitionKeyFieldPromise) {
    taskPartitionKeyFieldPromise = getContainer()
      .read()
      .then(({ resource }) => {
        const path = (resource && resource.partitionKey && resource.partitionKey.paths && resource.partitionKey.paths[0]) || '/id';
        return path.replace(/^\//, '').split('/')[0];
      })
      .catch((err) => {
        // Don't cache failures.
        taskPartitionKeyFieldPromise = null;
        throw err;
      });
  }
  return taskPartitionKeyFieldPromise;
}

/**
 * userAssignments container in the same database as tasks (create-if-not-exists, cached).
 */
function getUserAssignmentsContainer() {
  if (!userAssignmentsContainerPromise) {
    userAssignmentsContainerPromise = getClient()
      .database(getDatabaseId())
      .containers.createIfNotExists({
        id: USER_ASSIGNMENTS_CONTAINER_ID,
        partitionKey: { paths: ['/id'] },
      })
      .then(({ container: c }) => c)
      .catch((err) => {
        userAssignmentsContainerPromise = null;
        // The identity may lack management-plane rights; fall back to a plain
        // handle so reads still work if the container already exists.
        if (statusCodeOf(err) === 403) {
          return getClient().database(getDatabaseId()).container(USER_ASSIGNMENTS_CONTAINER_ID);
        }
        throw err;
      });
  }
  return userAssignmentsContainerPromise;
}

async function queryTasks() {
  const container = getContainer();
  const maxTotal = Number.parseInt(process.env.MAX_TASKS_READ, 10) > 0
    ? Number.parseInt(process.env.MAX_TASKS_READ, 10)
    : 20000;

  // Page through the container instead of a single unbounded fetchAll().
  const iterator = container.items.readAll({ maxItemCount: 200 });
  const results = [];
  while (iterator.hasMoreResults() && results.length < maxTotal) {
    const { resources } = await iterator.fetchNext();
    if (resources && resources.length) {
      results.push(...resources);
    }
  }
  if (results.length > maxTotal) results.length = maxTotal;
  return results;
}

async function createTask(taskData) {
  const container = getContainer();

  if (!taskData.id) {
    taskData.id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  const { resource } = await container.items.create(taskData);
  return resource;
}

async function updateTask(id, updates) {
  const container = getContainer();
  const pkField = await getTaskPartitionKeyField();

  // Prefer a point-read (cheap, returns the etag) when the partition key is /id.
  let existingItem = null;
  if (pkField === 'id') {
    try {
      const { resource } = await container.item(id, id).read();
      existingItem = resource || null;
    } catch (err) {
      if (statusCodeOf(err) !== 404) throw err;
    }
  } else {
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.id = @id',
      parameters: [{ name: '@id', value: id }],
    };
    const { resources } = await container.items.query(querySpec).fetchAll();
    existingItem = (resources && resources[0]) || null;
  }

  if (!existingItem) {
    throw httpError(404, `Task with id ${id} not found`);
  }

  // Strip server-owned fields so clients can't mass-assign them; also protect
  // the partition key field from being changed via update.
  const sanitized = { ...updates };
  for (const field of SERVER_OWNED_FIELDS) delete sanitized[field];
  delete sanitized[pkField];

  const updated = { ...existingItem, ...sanitized };
  const partitionKeyValue = existingItem[pkField] !== undefined ? existingItem[pkField] : id;

  try {
    const { resource } = await container.item(id, partitionKeyValue).replace(updated, {
      accessCondition: { type: 'IfMatch', condition: existingItem._etag },
    });
    return resource;
  } catch (err) {
    if (statusCodeOf(err) === 412) {
      throw httpError(412, 'Task was modified by another request');
    }
    throw err;
  }
}

async function deleteTask(id) {
  const container = getContainer();

  // Fast path: partition key value equals the id (the common /id setup).
  try {
    await container.item(id, id).delete();
    return { success: true };
  } catch (directDeleteError) {
    if (statusCodeOf(directDeleteError) !== 404) throw directDeleteError;
  }

  // Fallback: find the item cross-partition and delete with its ACTUAL
  // partition key value.
  const querySpec = {
    query: 'SELECT * FROM c WHERE c.id = @id',
    parameters: [{ name: '@id', value: id }],
  };
  const { resources } = await container.items.query(querySpec).fetchAll();
  if (!resources || resources.length === 0) {
    throw httpError(404, `Task with id ${id} not found`);
  }

  const item = resources[0];
  const pkField = await getTaskPartitionKeyField();
  const partitionKeyValue = item[pkField];

  try {
    await container.item(id, partitionKeyValue).delete();
    return { success: true };
  } catch (err) {
    if (statusCodeOf(err) === 404) {
      throw httpError(404, `Task with id ${id} not found`);
    }
    throw err;
  }
}

// ---------------- userAssignments ----------------

async function getUserAssignment(email) {
  const id = String(email).toLowerCase();
  const c = await getUserAssignmentsContainer();
  try {
    const { resource } = await c.item(id, id).read();
    return resource || null;
  } catch (err) {
    if (statusCodeOf(err) === 404) return null;
    throw err;
  }
}

async function listUserAssignments() {
  const c = await getUserAssignmentsContainer();
  const { resources } = await c.items.readAll({ maxItemCount: 200 }).fetchAll();
  return resources;
}

async function userAssignmentsIsEmpty() {
  const c = await getUserAssignmentsContainer();
  const iterator = c.items.query('SELECT TOP 1 c.id FROM c', { maxItemCount: 1 });
  const { resources } = await iterator.fetchNext();
  return !resources || resources.length === 0;
}

async function upsertUserAssignment({ email, role, departments }) {
  const id = String(email).toLowerCase();
  const c = await getUserAssignmentsContainer();
  const doc = {
    id,
    email: id,
    role,
    departments: Array.isArray(departments) ? departments : [],
  };
  const { resource } = await c.items.upsert(doc);
  return resource;
}

module.exports = {
  queryTasks,
  createTask,
  updateTask,
  deleteTask,
  getClient,
  getContainer,
  getUserAssignment,
  listUserAssignments,
  userAssignmentsIsEmpty,
  upsertUserAssignment,
};
