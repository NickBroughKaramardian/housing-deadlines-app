const fs = require('fs');

// Read the App.js file
let content = fs.readFileSync('src/App.js', 'utf8');

// Find the start and end of the sort section
const sortStart = content.indexOf("{activeTab === 'sort' && (");
const databaseStart = content.indexOf("{activeTab === 'database' && (");

if (sortStart !== -1 && databaseStart !== -1) {
  // Extract the part before sort section
  const beforeSort = content.substring(0, sortStart);
  
  // Extract the part after database section starts
  const afterDatabase = content.substring(databaseStart);
  
  // Create the new content with SortDeadlines component
  const newContent = beforeSort + 
    `{activeTab === 'sort' && (
          <SortDeadlines />
        )}

        ` + afterDatabase;
  
  // Write the new content
  fs.writeFileSync('src/App.js', newContent);
  console.log('Successfully replaced sort section with SortDeadlines component');
} else {
  console.log('Could not find sort section boundaries');
}
