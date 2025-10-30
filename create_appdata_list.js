const { Client } = require('@microsoft/microsoft-graph-client');
const { AuthenticationProvider } = require('@microsoft/microsoft-graph-client');

class SimpleAuthProvider {
  constructor(accessToken) {
    this.accessToken = accessToken;
  }

  async getAccessToken() {
    return this.accessToken;
  }
}

async function createAppDataList() {
  try {
    // You'll need to get an access token from your app
    // For now, let's try to create the list using the existing SharePoint lists
    console.log('This script needs to be run with a valid access token');
    console.log('The AppData list needs to be created in SharePoint');
    console.log('You can create it manually in SharePoint or we need to fix the list creation code');
  } catch (error) {
    console.error('Error:', error);
  }
}

createAppDataList();
