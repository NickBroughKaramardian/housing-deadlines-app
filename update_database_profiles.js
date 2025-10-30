const fs = require('fs');

// Read the Database.js file
let content = fs.readFileSync('src/Database.js', 'utf8');

// Replace the loadProfiles function
const oldLoadProfiles = `  // Load Microsoft profiles (mock for now - would integrate with Graph API)
  const loadProfiles = async () => {
    // Mock profiles - in real implementation, this would fetch from Microsoft Graph
    const mockProfiles = [
      { id: '1', name: 'John Smith', email: 'john.smith@company.com', department: 'accounting' },
      { id: '2', name: 'Sarah Johnson', email: 'sarah.johnson@company.com', department: 'development' },
      { id: '3', name: 'Mike Davis', email: 'mike.davis@company.com', department: 'corp-management' },
      { id: '4', name: 'Lisa Chen', email: 'lisa.chen@company.com', department: 'compliance' },
      { id: '5', name: 'Tom Wilson', email: 'tom.wilson@company.com', department: 'accounting' },
      { id: '6', name: 'Emma Brown', email: 'emma.brown@company.com', department: 'development' }
    ];
    setProfiles(mockProfiles);
  };`;

const newLoadProfiles = `  // Load Microsoft profiles from Graph API
  const loadProfiles = async () => {
    try {
      const users = await microsoftProfileService.getAllUsers();
      setProfiles(users);
      console.log('Database: Loaded', users.length, 'Microsoft profiles');
    } catch (error) {
      console.error('Database: Error loading profiles:', error);
      // Fallback to mock data
      const mockProfiles = [
        { id: '1', name: 'John Smith', email: 'john.smith@company.com', department: 'accounting' },
        { id: '2', name: 'Sarah Johnson', email: 'sarah.johnson@company.com', department: 'development' },
        { id: '3', name: 'Mike Davis', email: 'mike.davis@company.com', department: 'corp-management' },
        { id: '4', name: 'Lisa Chen', email: 'lisa.chen@company.com', department: 'compliance' }
      ];
      setProfiles(mockProfiles);
    }
  };`;

content = content.replace(oldLoadProfiles, newLoadProfiles);

// Write the updated content back
fs.writeFileSync('src/Database.js', content);

console.log('Database updated to use real Microsoft profiles');
