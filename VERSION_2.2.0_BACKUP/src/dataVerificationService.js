import { microsoftDataService } from './microsoftDataService';


import { sharePointService } from './graphService';

// Function to verify data integrity between Firebase and SharePoint
export const verifyDataIntegrity = async () => {
  try {
    console.log('Starting data integrity verification...');
    
    const collections = ['tasks', 'users', 'checklistTemplates', 'checklists', 'messages', 'departmentMappings', 'nameAliases', 'invites'];
    const verificationResults = {};
    
    for (const collectionName of collections) {
      try {
        console.log(`Verifying ${collectionName}...`);
        
        // Get Firebase data
        const firebaseSnapshot = await microsoftDataService.microsoftDataService.db, collectionName));
        const firebaseData = firebaseSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Get SharePoint data
        const lists = await sharePointService.getLists();
        const list = lists.find(l => l.displayName.toLowerCase().replace(/\s+/g, '') === collectionName.toLowerCase());
        
        let sharePointData = [];
        if (list) {
          const sharePointItems = await sharePointService.getListItems(list.id);
          sharePointData = sharePointItems.map(item => ({
            id: item.id,
            ...item.fields
          }));
        }
        
        verificationResults[collectionName] = {
          firebaseCount: firebaseData.length,
          sharePointCount: sharePointData.length,
          firebaseData: firebaseData,
          sharePointData: sharePointData,
          isComplete: firebaseData.length === sharePointData.length
        };
        
        console.log(`${collectionName}: Firebase ${firebaseData.length} items, SharePoint ${sharePointData.length} items`);
        
      } catch (error) {
        console.error(`Error verifying ${collectionName}:`, error);
        verificationResults[collectionName] = {
          error: error.message,
          isComplete: false
        };
      }
    }
    
    console.log('Data integrity verification completed:', verificationResults);
    return verificationResults;
    
  } catch (error) {
    console.error('Data integrity verification failed:', error);
    throw error;
  }
};

// Function to get data summary
export const getDataSummary = async () => {
  try {
    console.log('Getting data summary...');
    
    const collections = ['tasks', 'users', 'checklistTemplates', 'checklists', 'messages', 'departmentMappings', 'nameAliases', 'invites'];
    const summary = {};
    
    for (const collectionName of collections) {
      try {
        const snapshot = await microsoftDataService.microsoftDataService.db, collectionName));
        summary[collectionName] = {
          count: snapshot.docs.length,
          lastModified: snapshot.docs.length > 0 ? 
            Math.max(...snapshot.docs.map(doc => doc.data().modifiedDate || doc.data().createdDate || 0)) : null
        };
      } catch (error) {
        console.error(`Error getting summary for ${collectionName}:`, error);
        summary[collectionName] = { count: 0, error: error.message };
      }
    }
    
    console.log('Data summary:', summary);
    return summary;
    
  } catch (error) {
    console.error('Error getting data summary:', error);
    throw error;
  }
};

// Function to check if data migration is needed
export const isDataMigrationNeeded = async () => {
  try {
    const summary = await getDataSummary();
    const totalItems = Object.values(summary).reduce((sum, item) => sum + (item.count || 0), 0);
    
    console.log(`Total items in Firebase: ${totalItems}`);
    
    // If there are items in Firebase, migration might be needed
    return totalItems > 0;
    
  } catch (error) {
    console.error('Error checking if migration is needed:', error);
    return false;
  }
};
