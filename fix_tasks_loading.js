const fs = require('fs');

// Read the App.js file
let content = fs.readFileSync('src/App.js', 'utf8');

// Replace the Firebase tasks loading with Microsoft service
const oldPattern = /const tasksQuery = query\(\s*collection\(db, 'tasks'\),\s*where\('organizationId', '==', userProfile\.organizationId\)\s*\);\s*console\.log\('Setting up tasks query with organizationId:', userProfile\.organizationId\);\s*const unsub = onSnapshot\(tasksQuery, \(snapshot\) => \{\s*const tasksData = snapshot\.docs\.map\(doc => \(\{ id: doc\.id, \.\.\.doc\.data\(\) \}\)\);\s*console\.log\('Tasks query result:', tasksData\.length, 'tasks found'\);\s*console\.log\('Sample task:', tasksData\[0\]\);\s*setTasks\(tasksData\);\s*\}, \(error\) => \{\s*console\.error\('Tasks query error:', error\);\s*\}\);\s*return unsub;/g;

const newPattern = `const loadTasks = async () => {
      try {
        await debugSharePoint();
        const tasksData = await microsoftDataService.tasks.getAll();
        console.log('Tasks query result:', tasksData.length, 'tasks found');
        console.log('Sample task:', tasksData[0]);
        setTasks(tasksData);
      } catch (error) {
        console.error('Tasks query error:', error);
      }
    };
    
    loadTasks();`;

content = content.replace(oldPattern, newPattern);

// Write the fixed content back
fs.writeFileSync('src/App.js', content);

console.log('Fixed tasks loading in App.js');
