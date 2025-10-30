const fs = require('fs');

// Read the GanttChart.js file
let content = fs.readFileSync('src/GanttChart.js', 'utf8');

// Add import for databaseDataService
content = content.replace(
  /import React, { useState, useEffect, useMemo } from 'react';/,
  `import React, { useState, useEffect, useMemo } from 'react';
import { databaseDataService } from './databaseDataService';`
);

// Replace the useEffect that loads tasks with database data service
const oldUseEffectPattern = /useEffect\(\(\) => \{\s*const loadTasks = async \(\) => \{[\s\S]*?\};\s*loadTasks\(\);\s*\}, \[\]\);/g;

const newUseEffectPattern = `useEffect(() => {
    const loadGanttData = async () => {
      try {
        const ganttData = await databaseDataService.getGanttData();
        setTasks(ganttData);
        console.log('Gantt data loaded:', ganttData.length, 'tasks');
      } catch (error) {
        console.error('Error loading gantt data:', error);
      }
    };
    
    loadGanttData();
  }, []);`;

content = content.replace(oldUseEffectPattern, newUseEffectPattern);

// Write the updated content back
fs.writeFileSync('src/GanttChart.js', content);

console.log('GanttChart updated to use database data service');
