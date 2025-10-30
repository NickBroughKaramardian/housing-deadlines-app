import { getGraphClient } from './msalService';

async function debugConnection() {
  try {
    console.log('=== DEBUGGING SHAREPOINT CONNECTION ===');
    
    const client = await getGraphClient();
    console.log('Graph client created successfully');
    
    // Test 1: Get site info
    console.log('Test 1: Getting site info...');
    try {
      const siteInfo = await client
        .api('/sites/ccdapstest.sharepoint.com:/sites/CCProjectManager:')
        .get();
      console.log('Site info:', siteInfo);
    } catch (error) {
      console.error('Site info error:', error);
    }
    
    // Test 2: Get lists without filter
    console.log('Test 2: Getting all lists...');
    try {
      const lists = await client
        .api('/sites/ccdapstest.sharepoint.com:/sites/CCProjectManager:/lists')
        .get();
      console.log('Lists found:', lists.value?.length || 0);
      console.log('List names:', lists.value?.map(l => l.displayName) || []);
    } catch (error) {
      console.error('Lists error:', error);
    }
    
    // Test 3: Get items without filter
    console.log('Test 3: Getting items without filter...');
    try {
      const items = await client
        .api('/sites/ccdapstest.sharepoint.com:/sites/CCProjectManager:/lists/7c7184bc-6b3b-453e-a60d-00a3317abc36/items')
        .expand('fields')
        .get();
      console.log('Items found:', items.value?.length || 0);
      console.log('Item IDs:', items.value?.map(i => i.id) || []);
      
      // Show the structure of the first item
      if (items.value?.length > 0) {
        console.log('First item structure:', items.value[0]);
        console.log('First item fields:', items.value[0].fields);
        console.log('Available field names:', Object.keys(items.value[0].fields || {}));
      }
    } catch (error) {
      console.error('Items error:', error);
    }
    
    // Test 4: Get list columns
    console.log('Test 4: Getting list columns...');
    try {
      const columns = await client
        .api('/sites/ccdapstest.sharepoint.com:/sites/CCProjectManager:/lists/7c7184bc-6b3b-453e-a60d-00a3317abc36/columns')
        .get();
      console.log('Columns found:', columns.value?.length || 0);
      console.log('Column details:', columns.value?.map(c => ({
        name: c.displayName,
        internalName: c.name,
        type: c.columnType,
        required: c.required
      })) || []);
    } catch (error) {
      console.error('Columns error:', error);
    }
    
    // Test 5: Try to create a minimal item
    console.log('Test 5: Trying to create a minimal item...');
    try {
      const minimalData = {
        Title: 'Test Item ' + Date.now(),
        Project: 'Test Project'
      };
      
      console.log('Creating with minimal data:', minimalData);
      const result = await client
        .api('/sites/ccdapstest.sharepoint.com:/sites/CCProjectManager:/lists/7c7184bc-6b3b-453e-a60d-00a3317abc36/items')
        .post({
          fields: minimalData
        });
      
      console.log('✅ Minimal item created successfully:', result);
      
      // Clean up - delete the test item
      await client
        .api(`/sites/ccdapstest.sharepoint.com:/sites/CCProjectManager:/lists/7c7184bc-6b3b-453e-a60d-00a3317abc36/items/${result.id}`)
        .delete();
      console.log('Test item deleted');
      
    } catch (error) {
      console.log('❌ Minimal item creation failed:', error.message);
    }
    
    // Test 6: Try to create an item with all fields (excluding ResponsibleParty)
    console.log('Test 6: Trying to create an item with all fields...');
    try {
      const fullData = {
        Title: 'Test Full Item ' + Date.now(),
        Project: 'Test Project',
        Deadline: '2024-12-31',
        Notes: 'Test notes',
        Recurring: 'No',
        Interval: '',
        FinalDate: '',
        Completed_x003f_: 'No',
        Priority: 'Normal',
        Instance: '0'
        // Note: Excluding ResponsibleParty to avoid SharePoint Person field issues
      };
      
      console.log('Creating with full data:', fullData);
      const result = await client
        .api('/sites/ccdapstest.sharepoint.com:/sites/CCProjectManager:/lists/7c7184bc-6b3b-453e-a60d-00a3317abc36/items')
        .post({
          fields: fullData
        });
      
      console.log('✅ Full item created successfully:', result);
      
      // Clean up - delete the test item
      await client
        .api(`/sites/ccdapstest.sharepoint.com:/sites/CCProjectManager:/lists/7c7184bc-6b3b-453e-a60d-00a3317abc36/items/${result.id}`)
        .delete();
      console.log('Test item deleted');
      
    } catch (error) {
      console.log('❌ Full item creation failed:', error.message);
    }
    
  } catch (error) {
    console.error('Debug connection failed:', error);
  }
}

// Auto-run when imported
debugConnection();
