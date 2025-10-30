// Script to create a single SharePoint list that acts as a database
import { sharePointService } from './src/graphService.js';

async function createSingleListDatabase() {
  try {
    console.log('Creating single list database...');
    
    // Create the main AppData list
    const listConfig = {
      displayName: 'AppData',
      description: 'Main database for C&C Project Manager - stores all app data as JSON',
      columns: [
        { name: 'Type', type: 'SingleLineOfText', required: true },
        { name: 'Data', type: 'MultipleLinesOfText', required: true },
        { name: 'ID', type: 'SingleLineOfText', required: true },
        { name: 'Created', type: 'DateTime', required: true },
        { name: 'Modified', type: 'DateTime', required: true }
      ]
    };
    
    const result = await sharePointService.createList('AppData', listConfig.description, listConfig.columns);
    console.log('Single list database created successfully!', result);
    
    return result;
  } catch (error) {
    console.error('Error creating single list database:', error);
    throw error;
  }
}

export { createSingleListDatabase };
