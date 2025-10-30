const { WebPubSubServiceClient } = require('@azure/web-pubsub');

let serviceClient = null;

function getServiceClient() {
  if (!serviceClient) {
    const connectionString = process.env.WEB_PUBSUB_CONNECTION_STRING;
    if (!connectionString) {
      console.warn('WEB_PUBSUB_CONNECTION_STRING not set, real-time features disabled');
      return null;
    }
    serviceClient = new WebPubSubServiceClient(connectionString, 'ccprojectmanager');
  }
  return serviceClient;
}

async function publishEvent(eventType, data, userId = null) {
  const client = getServiceClient();
  if (!client) return;

  try {
    const event = {
      type: eventType,
      data: data,
      timestamp: new Date().toISOString(),
      userId: userId
    };

    // Publish to all users or specific user
    const hub = client.hub('tasks');
    if (userId) {
      await hub.sendToUser(userId, event);
    } else {
      await hub.broadcast(event);
    }
    
    console.log(`Published ${eventType} event:`, data);
  } catch (error) {
    console.error('Failed to publish event:', error);
  }
}

async function getClientAccessToken(userId) {
  const client = getServiceClient();
  if (!client) return null;

  try {
    const hub = client.hub('tasks');
    const token = await hub.getClientAccessToken({
      userId: userId,
      roles: ['webpubsub.sendToGroup.tasks', 'webpubsub.joinLeaveGroup.tasks']
    });
    return token;
  } catch (error) {
    console.error('Failed to get client access token:', error);
    return null;
  }
}

module.exports = {
  publishEvent,
  getClientAccessToken
};
