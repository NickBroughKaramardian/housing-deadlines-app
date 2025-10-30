const fs = require('fs');

// Read the App.js file
let content = fs.readFileSync('src/App.js', 'utf8');

// Make the changes
content = content.replace(/from 'firebase\/firestore'/g, "from './firebase/firestore'");
content = content.replace(/from 'firebase'/g, "from './firebase'");
content = content.replace(/import Messages from '\.\/Messages';/g, '');
content = content.replace(/Messages/g, '');
content = content.replace(/showMessages/g, '');
content = content.replace(/hidden lg:block flex-1/g, 'flex-1');
content = content.replace(/\{hasPermission\(ROLES\.EDITOR\) && \(/g, '');
content = content.replace(/\)\}/g, '}');

// Add microsoftDataService import after firebase imports
content = content.replace(
  /(import.*firebase.*\n)/,
  "$1import { microsoftDataService } from './microsoftDataService';\n"
);

// Update handleAddTask to use SharePoint Lists
content = content.replace(
  /const docRef = await addDoc\(collection\(db, 'tasks'\), taskWithOrg\);/g,
  'const result = await microsoftDataService.tasks.add(taskWithOrg);'
);
content = content.replace(/docRef\.id/g, 'result.id');

// Write the file back
fs.writeFileSync('src/App.js', content);
console.log('App.js updated successfully!');
