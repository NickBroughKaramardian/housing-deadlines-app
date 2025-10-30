import { sharePointService } from './graphService';

export async function debugSharePoint() {
  console.log('=== SHAREPOINT DEBUG START ===');
  
  try {
    // Get all lists
    const lists = await sharePointService.getLists();
    console.log('All lists:', lists.map(l => ({ 
      id: l.id, 
      name: l.name, 
      displayName: l.displayName 
    })));

    // Find Tasks list
    const tasksList = lists.find(l => l.displayName === 'Tasks' || l.name === 'Tasks');
    
    if (!tasksList) {
      console.log('Target list not found');
      console.log('=== SHAREPOINT DEBUG END ===');
      return;
    }

    console.log('Using Tasks list:', {
      id: tasksList.id,
      name: tasksList.name,
      displayName: tasksList.displayName
    });

    // Get columns
    const columns = await sharePointService.getListColumns(tasksList.id);
    console.log('Tasks list columns:');
    columns.forEach(col => {
      console.log(`  - ${col.displayName} (${col.name}) [${col.columnGroup}]`);
    });

    // Get existing items
    const items = await sharePointService.getListItems(tasksList.id);
    console.log('Existing items:', items.length);
    
    // Log sample item details
    if (items.length > 0) {
      console.log('Sample item fields:', Object.keys(items[0].fields));
      console.log('Full sample item:', items[0]);
      
      // Log ResponsibleParty structure in detail
      const rpField = items[0].fields.ResponsibleParty;
      console.log('ResponsibleParty field structure:', rpField);
      console.log('ResponsibleParty type:', typeof rpField, Array.isArray(rpField) ? 'Array' : 'Not Array');
      if (rpField) {
        console.log('ResponsibleParty JSON:', JSON.stringify(rpField, null, 2));
      }
    }

  } catch (error) {
    console.error('Debug SharePoint error:', error);
  }
  
  console.log('=== SHAREPOINT DEBUG END ===');
}
