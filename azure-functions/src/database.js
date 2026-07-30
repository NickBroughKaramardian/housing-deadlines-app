const { CosmosClient } = require('@azure/cosmos');

let client = null;
let container = null;

function getClient() {
  if (!client) {
    const endpoint = process.env.COSMOS_ENDPOINT;
    const key = process.env.COSMOS_PRIMARY_KEY;
    
    if (!endpoint || !key) {
      throw new Error('Cosmos DB connection not configured. Set COSMOS_ENDPOINT and COSMOS_PRIMARY_KEY');
    }
    
    client = new CosmosClient({ endpoint, key });
  }
  return client;
}

function getContainer() {
  if (!container) {
    const databaseId = process.env.COSMOS_DATABASE_ID || 'housing-deadlines-db';
    const containerId = process.env.COSMOS_CONTAINER_ID || 'tasks';
    
    const client = getClient();
    const database = client.database(databaseId);
    container = database.container(containerId);
  }
  return container;
}

async function queryTasks() {
  try {
    const container = getContainer();
    const { resources } = await container.items.readAll().fetchAll();
    return resources;
  } catch (err) {
    console.error('Error querying tasks:', err);
    throw err;
  }
}

async function createTask(taskData) {
  try {
    const container = getContainer();
    
    // Ensure the task has an id field (Cosmos DB requires it)
    if (!taskData.id) {
      // Generate a simple ID if not provided
      taskData.id = taskData.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    const { resource } = await container.items.create(taskData);
    return resource;
  } catch (err) {
    console.error('Error creating task:', err);
    console.error('Task data:', JSON.stringify(taskData, null, 2));
    console.error('Error details:', JSON.stringify(err, null, 2));
    throw err;
  }
}

async function updateTask(id, updates) {
  try {
    const container = getContainer();
    
    // Query for the item first to get its partition key
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.id = @id',
      parameters: [{ name: '@id', value: id }]
    };
    
    const { resources } = await container.items.query(querySpec).fetchAll();
    
    if (!resources || resources.length === 0) {
      throw new Error(`Task with id ${id} not found`);
    }
    
    const existingItem = resources[0];
    
    // Merge updates with existing item
    const updated = { ...existingItem, ...updates };
    
    // Use the partition key from the existing item (usually 'id' field)
    // Cosmos DB typically uses /id as partition key, so partition key value = id
    const partitionKey = existingItem.id || id;
    const { resource } = await container.item(id, partitionKey).replace(updated);
    return resource;
  } catch (err) {
    console.error('Error updating task:', err);
    console.error('Error details:', JSON.stringify(err, null, 2));
    throw err;
  }
}

async function deleteTask(id) {
  try {
    const container = getContainer();
    
    // First, try direct delete assuming /id is the partition key
    // This is the most common Cosmos DB setup
    try {
      await container.item(id, id).delete();
      return { success: true };
    } catch (directDeleteError) {
      // If direct delete fails, try querying first to get the item
      // This handles cases where partition key might be different
      console.log('Direct delete failed, trying query-based approach:', directDeleteError.message);
      
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: id }]
      };
      
      const { resources } = await container.items.query(querySpec).fetchAll();
      
      if (!resources || resources.length === 0) {
        throw new Error(`Task with id ${id} not found`);
      }
      
      const item = resources[0];
      
      // Try delete with id as partition key (most common case)
      try {
        await container.item(id, id).delete();
        return { success: true };
      } catch (secondDeleteError) {
        // If still failing, the partition key might be different
        // Log the error for debugging
        console.error('Delete failed even after query:', secondDeleteError);
        console.error('Item found:', JSON.stringify(item, null, 2));
        throw new Error(`Failed to delete task: ${secondDeleteError.message}`);
      }
    }
  } catch (err) {
    console.error('Error deleting task:', err);
    console.error('Error details:', JSON.stringify(err, null, 2));
    throw err;
  }
}

module.exports = {
  queryTasks,
  createTask,
  updateTask,
  deleteTask,
  getClient,
  getContainer
};
