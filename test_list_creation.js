// Test script to force create the AppData list
import { sharePointService } from './src/graphService.js';

async function testCreateAppDataList() {
  try {
    console.log('Testing AppData list creation...');
    
    // First, check if AppData list exists
    const lists = await sharePointService.getLists();
    console.log('Current lists:', lists.map(l => l.displayName));
    
    let appDataList = lists.find(l => l.displayName === 'AppData');
    
    if (!appDataList) {
      console.log('AppData list not found, creating it...');
      appDataList = await sharePointService.createList('AppData', 'Main database for C&C Project Manager', [
        { name: 'Type', type: 'SingleLineOfText', required: true },
        { name: 'Data', type: 'MultipleLinesOfText', required: true },
        { name: 'ID', type: 'SingleLineOfText', required: true },
        { name: 'Created', type: 'DateTime', required: true },
        { name: 'Modified', type: 'DateTime', required: true }
      ]);
      console.log('AppData list created successfully:', appDataList);
    } else {
      console.log('AppData list already exists:', appDataList);
    }
    
    // Test adding a task
    console.log('Testing task addition...');
    const testTask = {
      Type: 'Task',
      Data: JSON.stringify({
        projectName: 'Test Project',
        description: 'Test task',
        deadline: '2025-12-31',
        responsibleParty: 'Test User'
      }),
      ID: 'Task_test_' + Date.now(),
      Created: new Date().toISOString(),
      Modified: new Date().toISOString()
    };
    
    const result = await sharePointService.addListItem(appDataList.id, testTask);
    console.log('Test task added successfully:', result);
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

testCreateAppDataList();
