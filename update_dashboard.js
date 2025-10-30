const fs = require('fs');

// Read the Dashboard.js file
let content = fs.readFileSync('src/Dashboard.js', 'utf8');

// Add import for databaseDataService
content = content.replace(
  /import React, { useState, useEffect } from 'react';/,
  `import React, { useState, useEffect } from 'react';
import { databaseDataService } from './databaseDataService';`
);

// Replace the useEffect that loads tasks with database data service
const oldUseEffectPattern = /useEffect\(\(\) => \{\s*const loadTasks = async \(\) => \{[\s\S]*?\};\s*loadTasks\(\);\s*\}, \[\]\);/g;

const newUseEffectPattern = `useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const dashboardData = await databaseDataService.getDashboardData();
        const departmentBreakdown = await databaseDataService.getDepartmentBreakdown();
        const projectBreakdown = await databaseDataService.getProjectBreakdown();
        const priorityBreakdown = await databaseDataService.getPriorityBreakdown();
        
        // Update state with dashboard data
        setTasks(dashboardData.recentTasks);
        setUpcomingDeadlines(dashboardData.upcomingDeadlines);
        
        // You can add more state updates here for the breakdowns
        console.log('Dashboard data loaded:', dashboardData);
        console.log('Department breakdown:', departmentBreakdown);
        console.log('Project breakdown:', projectBreakdown);
        console.log('Priority breakdown:', priorityBreakdown);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };
    
    loadDashboardData();
  }, []);`;

content = content.replace(oldUseEffectPattern, newUseEffectPattern);

// Write the updated content back
fs.writeFileSync('src/Dashboard.js', content);

console.log('Dashboard updated to use database data service');
