import { sharePointService } from './graphService';

export const debugColumns = async () => {
  try {
    console.log('=== DEBUGGING SHAREPOINT COLUMNS ===');
    
    const lists = await sharePointService.getLists();
    const tasksList = lists.find(l => l.displayName === 'Tasks' || l.name === 'Tasks');
    
    if (!tasksList) {
      console.log('Tasks list not found');
      return;
    }
    
    console.log('Tasks list found:', tasksList.id);
    
    // Get list columns
    const columns = await sharePointService.getListColumns(tasksList.id);
    console.log('All columns:');
    columns.forEach(col => {
      console.log(`  - ${col.displayName} (${col.name}) [${col.type}]`);
    });
    
    // Get a sample item to see actual field names
    const items = await sharePointService.getListItems(tasksList.id);
    if (items.length > 0) {
      console.log('Sample item fields:');
      const sampleItem = items[0];
      Object.keys(sampleItem.fields || {}).forEach(fieldName => {
        console.log(`  - ${fieldName}: ${typeof sampleItem.fields[fieldName]}`);
      });
    }
    
    console.log('=== END COLUMN DEBUG ===');
  } catch (error) {
    console.error('Error debugging columns:', error);
  }
};
