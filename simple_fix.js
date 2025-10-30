const fs = require('fs');

// Read the App.js file
let content = fs.readFileSync('src/App.js', 'utf8');

// 1. Replace Messages with Database
content = content.replace(/import Messages from '\.\/Messages';/g, 'import Database from \'./Database\';');
content = content.replace(/setActiveTab\('messages'\)/g, 'setActiveTab(\'database\')');
content = content.replace(/activeTab === 'messages'/g, 'activeTab === \'database\'');
content = content.replace(/Messages<\/button>/g, 'Database</button>');
content = content.replace(/<Messages \/>/g, '<Database />');

// 2. Remove AddTasks import
content = content.replace(/import AddTasks from '\.\/AddTasks';/g, '');

// 3. Remove Add Tasks buttons - find and remove the entire block
const addTasksButtonPattern = /{hasPermission\(ROLES\.EDITOR\) && \(\s*<button[^>]*>Add Tasks<\/button>\s*\)}/g;
content = content.replace(addTasksButtonPattern, '');

// 4. Remove Add Tasks tab content
const addTasksTabPattern = /{activeTab === 'add' && \(\s*<div[^>]*>\s*<AddTasks[^>]*\/>\s*<\/div>\s*\)}/g;
content = content.replace(addTasksTabPattern, '');

// 5. Add Microsoft imports
content = content.replace(/import { db } from '\.\/firebase';/g, 'import { db } from \'./firebase\';\nimport { microsoftDataService } from \'./microsoftDataService\';\nimport { debugSharePoint } from \'./debugSharePoint\';');

// 6. Fix Firebase import
content = content.replace(/from 'firebase\/firestore'/g, 'from \'./firebase/firestore\'');

// Write the fixed content back
fs.writeFileSync('src/App.js', content);

console.log('Simple fix applied: Messages->Database, removed Add Tasks, added Microsoft imports');
