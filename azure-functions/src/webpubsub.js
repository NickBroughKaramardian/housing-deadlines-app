const { WebPubSubServiceClient } = require('@azure/web-pubsub');

// Single hub name, used both when constructing the client and for tokens.
const HUB_NAME = 'ccprojectmanager';

let serviceClient = null;

function getServiceClient() {
  if (!serviceClient) {
    const connectionString = process.env.WEB_PUBSUB_CONNECTION_STRING;
    if (!connectionString) {
      console.warn('WEB_PUBSUB_CONNECTION_STRING not set, real-time features disabled');
      return null;
    }
    serviceClient = new WebPubSubServiceClient(connectionString, HUB_NAME);
  }
  return serviceClient;
}

async function publishEvent(eventType, data, userId = null) {
  const client = getServiceClient();
  if (!client) return;

  const event = {
    type: eventType,
    data,
    timestamp: new Date().toISOString(),
    userId,
  };

  if (userId) {
    await client.sendToUser(userId, event);
  } else {
    await client.sendToAll(event);
  }
}

async function getClientAccessToken(userId) {
  const client = getServiceClient();
  if (!client) return null;

  return client.getClientAccessToken({
    userId,
    roles: ['webpubsub.sendToGroup.tasks', 'webpubsub.joinLeaveGroup.tasks'],
  });
}

module.exports = {
  publishEvent,
  getClientAccessToken,
  HUB_NAME,
};
