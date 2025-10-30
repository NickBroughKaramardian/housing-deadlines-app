const fs = require('fs');

// Read the App.js file
let content = fs.readFileSync('src/App.js', 'utf8');

// 1. Replace Messages import with Database import
content = content.replace(/import Messages from '\.\/Messages';/g, 'import Database from \'./Database\';');

// 2. Comment out AddTasks import
content = content.replace(/import AddTasks from '\.\/AddTasks';/g, '// import AddTasks from \'./AddTasks\';');

// 3. Remove Messages state
content = content.replace(/const \[showMessages, setShowMessages\] = useState\(false\);/g, '// const [showMessages, setShowMessages] = useState(false);');

// 4. Replace Messages buttons with Database buttons
content = content.replace(/<button onClick=\{\(\) => \{ setActiveTab\('messages'\); setIsMobileMenuOpen\(false\); \}\} className=\{`w-full px-4 py-3 rounded-lg text-left font-medium \$\{activeTab === 'messages' \? 'bg-theme-primary text-white' : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'\}`\}>Messages<\/button>/g, '<button onClick={() => { setActiveTab(\'database\'); setIsMobileMenuOpen(false); }} className={`w-full px-4 py-3 rounded-lg text-left font-medium ${activeTab === \'database\' ? \'bg-theme-primary text-white\' : \'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300\'}`}>Database</button>');

content = content.replace(/<button onClick=\{\(\) => setActiveTab\('messages'\)\} className=\{`flex-1 px-4 py-2 rounded text-center \$\{activeTab === 'messages' \? 'bg-theme-primary text-white' : 'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'\}`\}>Messages<\/button>/g, '<button onClick={() => setActiveTab(\'database\')} className={`flex-1 px-4 py-2 rounded text-center ${activeTab === \'database\' ? \'bg-theme-primary text-white\' : \'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600\'}`}>Database</button>');

// 5. Remove Add Tasks buttons
content = content.replace(/<button onClick=\{\(\) => \{ setActiveTab\('add'\); setIsMobileMenuOpen\(false\); \}\} className=\{`w-full px-4 py-3 rounded-lg text-left font-medium \$\{activeTab === 'add' \? 'bg-theme-primary text-white' : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'\}`\}>Add Tasks<\/button>/g, '// <button onClick={() => { setActiveTab(\'add\'); setIsMobileMenuOpen(false); }} className={`w-full px-4 py-3 rounded-lg text-left font-medium ${activeTab === \'add\' ? \'bg-theme-primary text-white\' : \'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300\'}`}>Add Tasks</button>');

content = content.replace(/<button onClick=\{\(\) => setActiveTab\('add'\)\} className=\{`hidden lg:block flex-1 px-4 py-2 rounded text-center \$\{activeTab === 'add' \? 'bg-theme-primary text-white' : 'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'\}`\}>Add Tasks<\/button>/g, '// <button onClick={() => setActiveTab(\'add\')} className={`hidden lg:block flex-1 px-4 py-2 rounded text-center ${activeTab === \'add\' ? \'bg-theme-primary text-white\' : \'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600\'}`}>Add Tasks</button>');

// 6. Replace Messages tab content with Database tab content
content = content.replace(/\{activeTab === 'messages' && \(\s*<div className="max-w-6xl mx-auto">\s*<Messages \/>\s*<\/div>\s*\)\}/g, '{activeTab === \'database\' && (\n          <div className="max-w-7xl mx-auto">\n            <Database />\n          </div>\n        )}');

// 7. Remove Add Tasks tab content
content = content.replace(/\{activeTab === 'add' && \(\s*<div className="max-w-7xl mx-auto">\s*<AddTasks addTask=\{handleAddTask\} \/>\s*<\/div>\s*\)\}/g, '/* {activeTab === \'add\' && (\n          <div className="max-w-7xl mx-auto">\n            <AddTasks addTask={handleAddTask} />\n          </div>\n        )} */');

// 8. Fix imports for Microsoft services
content = content.replace(/from 'firebase\/firestore'/g, 'from \'./firebase/firestore\'');
content = content.replace(/import { db } from '\.\/firebase';/g, 'import { db } from \'./firebase\';\nimport { microsoftDataService } from \'./microsoftDataService\';\nimport { debugSharePoint } from \'./debugSharePoint\';');

// 9. Fix tasks loading to use Microsoft services
const oldTasksPattern = /const tasksQuery = query\(\s*collection\(db, 'tasks'\),\s*where\('organizationId', '==', userProfile\.organizationId\)\s*\);\s*console\.log\('Setting up tasks query with organizationId:', userProfile\.organizationId\);\s*const unsub = onSnapshot\(tasksQuery, \(snapshot\) => \{\s*const tasksData = snapshot\.docs\.map\(doc => \(\{ id: doc\.id, \.\.\.doc\.data\(\) \}\)\);\s*console\.log\('Tasks query result:', tasksData\.length, 'tasks found'\);\s*console\.log\('Sample task:', tasksData\[0\]\);\s*setTasks\(tasksData\);\s*\}, \(error\) => \{\s*console\.error\('Tasks query error:', error\);\s*\}\);\s*return unsub;/g;

const newTasksPattern = `const loadTasks = async () => {
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

content = content.replace(oldTasksPattern, newTasksPattern);

// 10. Fix handleAddTask to use Microsoft service
content = content.replace(/addDoc\(collection\(db, 'tasks'\), taskWithOrg\);/g, 'microsoftDataService.tasks.add(taskWithOrg);');
content = content.replace(/const docRef = await/g, 'const result = await');
content = content.replace(/docRef\.id/g, 'result.id');

// Write the fixed content back
fs.writeFileSync('src/App.js', content);

console.log('Clean fix applied: Replaced Messages with Database, removed Add Tasks, fixed Microsoft integration');
