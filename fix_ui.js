const fs = require('fs');

// Read the App.js file
let content = fs.readFileSync('src/App.js', 'utf8');

// Remove Messages import
content = content.replace(/import Messages from '\.\/Messages';/g, '// import Messages from \'./Messages\';');

// Remove Messages state
content = content.replace(/const \[showMessages, setShowMessages\] = useState\(false\);/g, '// const [showMessages, setShowMessages] = useState(false);');

// Remove Messages buttons from mobile menu
content = content.replace(/<button onClick=\{\(\) => \{ setActiveTab\('messages'\); setIsMobileMenuOpen\(false\); \}\} className=\{`w-full px-4 py-3 rounded-lg text-left font-medium \$\{activeTab === 'messages' \? 'bg-theme-primary text-white' : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'\}`\}>Messages<\/button>/g, '// <button onClick={() => { setActiveTab(\'messages\'); setIsMobileMenuOpen(false); }} className={`w-full px-4 py-3 rounded-lg text-left font-medium ${activeTab === \'messages\' ? \'bg-theme-primary text-white\' : \'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300\'}`}>Messages</button>');

// Remove Messages buttons from desktop navigation
content = content.replace(/<button onClick=\{\(\) => setActiveTab\('messages'\)\} className=\{`flex-1 px-4 py-2 rounded text-center \$\{activeTab === 'messages' \? 'bg-theme-primary text-white' : 'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'\}`\}>Messages<\/button>/g, '// <button onClick={() => setActiveTab(\'messages\')} className={`flex-1 px-4 py-2 rounded text-center ${activeTab === \'messages\' ? \'bg-theme-primary text-white\' : \'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600\'}`}>Messages</button>');

// Remove Messages tab content
content = content.replace(/\{activeTab === 'messages' && \(\s*<div className="max-w-6xl mx-auto">\s*<Messages \/>\s*<\/div>\s*\)\}/g, '/* {activeTab === \'messages\' && (\n          <div className="max-w-6xl mx-auto">\n            <Messages />\n          </div>\n        )} */');

// Remove permission check and hidden class from Add Tasks button
content = content.replace(/\{hasPermission\(ROLES\.EDITOR\) && \(\s*<button onClick=\{\(\) => setActiveTab\('add'\)\} className=\{`hidden lg:block flex-1 px-4 py-2 rounded text-center \$\{activeTab === 'add' \? 'bg-theme-primary text-white' : 'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'\}`\}>Add Tasks<\/button>\s*\)\}/g, '<button onClick={() => setActiveTab(\'add\')} className={`flex-1 px-4 py-2 rounded text-center ${activeTab === \'add\' ? \'bg-theme-primary text-white\' : \'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600\'}`}>Add Tasks</button>');

// Add Add Tasks button to mobile menu
content = content.replace(/(<button onClick=\{\(\) => \{ setActiveTab\('deadlines'\); setIsMobileMenuOpen\(false\); \}\} className=\{`w-full px-4 py-3 rounded-lg text-left font-medium \$\{activeTab === 'deadlines' \? 'bg-theme-primary text-white' : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'\}`\}>Deadlines<\/button>)/g, '$1\n            <button onClick={() => { setActiveTab(\'add\'); setIsMobileMenuOpen(false); }} className={`w-full px-4 py-3 rounded-lg text-left font-medium ${activeTab === \'add\' ? \'bg-theme-primary text-white\' : \'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300\'}`}>Add Tasks</button>');

// Write the fixed content back
fs.writeFileSync('src/App.js', content);

console.log('Fixed UI: Removed Messages, made Add Tasks visible');
