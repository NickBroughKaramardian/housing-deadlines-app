const fs = require('fs');

// Read the App.js file
let content = fs.readFileSync('src/App.js', 'utf8');

// 1. Fix imports
content = content.replace(/import Messages from '\.\/Messages';/g, '// import Messages from \'./Messages\';');
content = content.replace(/from 'firebase\/firestore'/g, 'from \'./firebase/firestore\'');
content = content.replace(/import { db } from '\.\/firebase';/g, 'import { db } from \'./firebase\';\nimport { microsoftDataService } from \'./microsoftDataService\';\nimport { debugSharePoint } from \'./debugSharePoint\';');

// 2. Remove Messages state
content = content.replace(/const \[showMessages, setShowMessages\] = useState\(false\);/g, '// const [showMessages, setShowMessages] = useState(false);');

// 3. Remove Messages buttons
content = content.replace(/<button onClick=\{\(\) => \{ setActiveTab\('messages'\); setIsMobileMenuOpen\(false\); \}\} className=\{`w-full px-4 py-3 rounded-lg text-left font-medium \$\{activeTab === 'messages' \? 'bg-theme-primary text-white' : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'\}`\}>Messages<\/button>/g, '// <button onClick={() => { setActiveTab(\'messages\'); setIsMobileMenuOpen(false); }} className={`w-full px-4 py-3 rounded-lg text-left font-medium ${activeTab === \'messages\' ? \'bg-theme-primary text-white\' : \'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300\'}`}>Messages</button>');

content = content.replace(/<button onClick=\{\(\) => setActiveTab\('messages'\)\} className=\{`flex-1 px-4 py-2 rounded text-center \$\{activeTab === 'messages' \? 'bg-theme-primary text-white' : 'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'\}`\}>Messages<\/button>/g, '// <button onClick={() => setActiveTab(\'messages\')} className={`flex-1 px-4 py-2 rounded text-center ${activeTab === \'messages\' ? \'bg-theme-primary text-white\' : \'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600\'}`}>Messages</button>');

// 4. Remove Messages tab content
content = content.replace(/\{activeTab === 'messages' && \(\s*<div className="max-w-6xl mx-auto">\s*<Messages \/>\s*<\/div>\s*\)\}/g, '/* {activeTab === \'messages\' && (\n          <div className="max-w-6xl mx-auto">\n            <Messages />\n          </div>\n        )} */');

// 5. Fix Add Tasks button - remove permission check and hidden class
content = content.replace(/\{hasPermission\(ROLES\.EDITOR\) && \(\s*<button onClick=\{\(\) => setActiveTab\('add'\)\} className=\{`hidden lg:block flex-1 px-4 py-2 rounded text-center \$\{activeTab === 'add' \? 'bg-theme-primary text-white' : 'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'\}`\}>Add Tasks<\/button>\s*\)\}/g, '<button onClick={() => setActiveTab(\'add\')} className={`flex-1 px-4 py-2 rounded text-center ${activeTab === \'add\' ? \'bg-theme-primary text-white\' : \'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600\'}`}>Add Tasks</button>');

// 6. Fix tasks loading to use Microsoft services
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

// 7. Fix handleAddTask to use Microsoft service
content = content.replace(/addDoc\(collection\(db, 'tasks'\), taskWithOrg\);/g, 'microsoftDataService.tasks.add(taskWithOrg);');
content = content.replace(/const docRef = await/g, 'const result = await');
content = content.replace(/docRef\.id/g, 'result.id');

// Write the fixed content back
fs.writeFileSync('src/App.js', content);

console.log('Comprehensive fix applied: Removed Messages, made Add Tasks visible, fixed backend');
