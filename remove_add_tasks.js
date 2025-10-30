const fs = require('fs');

// Read the App.js file
let content = fs.readFileSync('src/App.js', 'utf8');

// 1. Remove Add Tasks import
content = content.replace(/import AddTasks from '\.\/AddTasks';/g, '// import AddTasks from \'./AddTasks\';');

// 2. Remove Add Tasks buttons from mobile menu
content = content.replace(/<button onClick=\{\(\) => \{ setActiveTab\('add'\); setIsMobileMenuOpen\(false\); \}\} className=\{`w-full px-4 py-3 rounded-lg text-left font-medium \$\{activeTab === 'add' \? 'bg-theme-primary text-white' : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'\}`\}>Add Tasks<\/button>/g, '// <button onClick={() => { setActiveTab(\'add\'); setIsMobileMenuOpen(false); }} className={`w-full px-4 py-3 rounded-lg text-left font-medium ${activeTab === \'add\' ? \'bg-theme-primary text-white\' : \'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300\'}`}>Add Tasks</button>');

// 3. Remove Add Tasks button from desktop navigation
content = content.replace(/<button onClick=\{\(\) => setActiveTab\('add'\)\} className=\{`flex-1 px-4 py-2 rounded text-center \$\{activeTab === 'add' \? 'bg-theme-primary text-white' : 'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'\}`\}>Add Tasks<\/button>/g, '// <button onClick={() => setActiveTab(\'add\')} className={`flex-1 px-4 py-2 rounded text-center ${activeTab === \'add\' ? \'bg-theme-primary text-white\' : \'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600\'}`}>Add Tasks</button>');

// 4. Remove Add Tasks tab content
content = content.replace(/\{activeTab === 'add' && \(\s*<div className="max-w-7xl mx-auto">\s*<AddTasks addTask=\{handleAddTask\} \/>\s*<\/div>\s*\)\}/g, '/* {activeTab === \'add\' && (\n          <div className="max-w-7xl mx-auto">\n            <AddTasks addTask={handleAddTask} />\n          </div>\n        )} */');

// 5. Remove handleAddTask function since it's no longer needed
content = content.replace(/const handleAddTask = async \(newTask\) => \{[\s\S]*?\};/g, '// const handleAddTask = async (newTask) => { ... }; // Removed - using Database page instead');

// 6. Clean up any weird slashes or comments
content = content.replace(/\/\/ \/\/ /g, '// ');
content = content.replace(/\/\/ \/\* /g, '/* ');
content = content.replace(/\*\/ \*\//g, '*/');

// Write the fixed content back
fs.writeFileSync('src/App.js', content);

console.log('Add Tasks page removed and cleaned up');
