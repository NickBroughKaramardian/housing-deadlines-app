// Microsoft Graph API service for enterprise user data
import { getGraphClient } from './msalService';

export const microsoftDataService = {
  users: {
    async getEnterpriseUsers() {
      try {
        const client = await getGraphClient();
        const response = await client
          .api('/users')
          .select('id,displayName,mail,userPrincipalName,department,jobTitle')
          .get();
        
        console.log('MicrosoftDataService: Loaded', response.value?.length || 0, 'enterprise users');
        return response.value || [];
      } catch (error) {
        console.error('MicrosoftDataService: Error loading enterprise users:', error);
        // Return empty array on error instead of crashing
        return [];
      }
    },
  },
};



