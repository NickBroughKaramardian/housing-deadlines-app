const fs = require('fs');

// Read the CalendarView.js file
let content = fs.readFileSync('src/CalendarView.js', 'utf8');

// Add import for databaseDataService
content = content.replace(
  /import React, { useState, useEffect } from 'react';/,
  `import React, { useState, useEffect } from 'react';
import { databaseDataService } from './databaseDataService';`
);

// Replace the useEffect that loads tasks with database data service
const oldUseEffectPattern = /useEffect\(\(\) => \{\s*const loadTasks = async \(\) => \{[\s\S]*?\};\s*loadTasks\(\);\s*\}, \[\]\);/g;

const newUseEffectPattern = `useEffect(() => {
    const loadCalendarData = async () => {
      try {
        const calendarData = await databaseDataService.getCalendarData();
        setEvents(calendarData);
        console.log('Calendar data loaded:', calendarData.length, 'events');
      } catch (error) {
        console.error('Error loading calendar data:', error);
      }
    };
    
    loadCalendarData();
  }, []);`;

content = content.replace(oldUseEffectPattern, newUseEffectPattern);

// Write the updated content back
fs.writeFileSync('src/CalendarView.js', content);

console.log('CalendarView updated to use database data service');
