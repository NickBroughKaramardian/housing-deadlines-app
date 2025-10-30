import { getGraphClient } from './msalService';

export const sharePointService = {
  // Get all lists
  getLists: async () => {
    try {
      const client = await getGraphClient();
      const response = await client
        .api('/sites/ccdapstest.sharepoint.com:/sites/CCProjectManager:/lists')
        .get();
      
      return response.value || [];
    } catch (error) {
      console.error('Error getting lists:', error);
      return [];
    }
  },

  // Get list items
  getListItems: async (listId, filter = null) => {
    try {
      const client = await getGraphClient();
      let apiCall = client
        .api(`/sites/ccdapstest.sharepoint.com:/sites/CCProjectManager:/lists/${listId}/items`)
        .expand('fields');

      if (filter) {
        apiCall = apiCall.filter(filter);
      }

      const response = await apiCall.get();
      return response.value || [];
    } catch (error) {
      console.error(`Error getting list items for list ${listId}:`, error);
      return [];
    }
  },

  // Add a new list item
  addListItem: async (listId, itemData) => {
    try {
      const client = await getGraphClient();
      const response = await client
        .api(`/sites/ccdapstest.sharepoint.com:/sites/CCProjectManager:/lists/${listId}/items`)
        .post({
          fields: itemData
        });
      
      return response;
    } catch (error) {
      console.error(`Error adding list item to list ${listId}:`, error);
      throw error;
    }
  },

  // Update a list item
  updateListItem: async (listId, itemId, itemData) => {
    try {
      const client = await getGraphClient();
      const response = await client
        .api(`/sites/ccdapstest.sharepoint.com:/sites/CCProjectManager:/lists/${listId}/items/${itemId}`)
        .patch({
          fields: itemData
        });
      
      return response;
    } catch (error) {
      console.error(`Error updating list item ${itemId} in list ${listId}:`, error);
      throw error;
    }
  },

  // Update a list item using SharePoint REST API (for Person fields)
  updateListItemREST: async (listId, itemId, itemData) => {
    try {
      const client = await getGraphClient();
      
      // Get the site information
      const siteResponse = await client
        .api('/sites/ccdapstest.sharepoint.com:/sites/CCProjectManager:')
        .get();
      
      const siteUrl = siteResponse.webUrl;
      
      // Build SharePoint REST API endpoint
      const restUrl = `${siteUrl}/_api/web/lists('${listId}')/items(${itemId})`;
      
      // Get access token from MSAL with SharePoint scope
      const { getMsalInstance } = await import('./msalService');
      const { sharePointRequest } = await import('./azureConfig');
      
      const msalInstance = await getMsalInstance();
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length === 0) {
        throw new Error('No authenticated user');
      }
      
      const tokenResponse = await msalInstance.acquireTokenSilent({
        ...sharePointRequest,
        account: accounts[0]
      });
      
      console.log('Using SharePoint REST API:', restUrl);
      console.log('Updating with data:', itemData);
      
      // Make direct REST call to SharePoint
      const response = await fetch(restUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json;odata=verbose',
          'Content-Type': 'application/json;odata=verbose',
          'Authorization': `Bearer ${tokenResponse.accessToken}`,
          'X-HTTP-Method': 'MERGE',
          'IF-MATCH': '*'
        },
        body: JSON.stringify({
          '__metadata': { 'type': 'SP.Data.TasksListItem' },
          ...itemData
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('SharePoint REST error:', response.status, errorText);
        throw new Error(`SharePoint REST API error: ${response.status} - ${errorText}`);
      }
      
      console.log('SharePoint REST update successful');
      return { success: true };
    } catch (error) {
      console.error(`Error updating list item ${itemId} via REST:`, error);
      throw error;
    }
  },

  // Delete a list item
  deleteListItem: async (listId, itemId) => {
    try {
      const client = await getGraphClient();
      await client
        .api(`/sites/ccdapstest.sharepoint.com:/sites/CCProjectManager:/lists/${listId}/items/${itemId}`)
        .delete();
      
      return true;
    } catch (error) {
      console.error(`Error deleting list item ${itemId} from list ${listId}:`, error);
      throw error;
    }
  },

  // Get list columns
  getListColumns: async (listId) => {
    try {
      const client = await getGraphClient();
      const response = await client
        .api(`/sites/ccdapstest.sharepoint.com:/sites/CCProjectManager:/lists/${listId}/columns`)
        .get();
      
      return response.value || [];
    } catch (error) {
      console.error(`Error getting columns for list ${listId}:`, error);
      return [];
    }
  },

  // Get organization users
  getUsers: async () => {
    try {
      const client = await getGraphClient();
      const response = await client
        .api('/users')
        .select('id,displayName,mail,userPrincipalName,jobTitle,department')
        .top(999)
        .get();
      
      console.log(`Fetched ${response.value.length} users from Microsoft`);
      return response.value || [];
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  },

  // Get SharePoint site users (for LookupId mapping)
  getSiteUsers: async () => {
    try {
      const client = await getGraphClient();
      const response = await client
        .api('/sites/ccdapstest.sharepoint.com:/sites/CCProjectManager:/lists/User Information List/items')
        .expand('fields')
        .get();
      
      console.log('Site users for lookup:', response.value);
      return response.value || [];
    } catch (error) {
      // Try alternative endpoint
      try {
        const client = await getGraphClient();
        const response = await client
          .api('/sites/ccdapstest.sharepoint.com:/sites/CCProjectManager')
          .expand('siteUsers')
          .get();
        
        console.log('Site users (alternative):', response.siteUsers);
        return response.siteUsers || [];
      } catch (altError) {
        console.error('Error getting site users:', error, altError);
        return [];
      }
    }
  },

  // Get user photo - disabled to prevent errors
  getUserPhoto: async (userId) => {
    return null;
  }
};
