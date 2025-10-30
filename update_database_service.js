const fs = require('fs');

// Read the databaseDataService.js file
let content = fs.readFileSync('src/databaseDataService.js', 'utf8');

// Replace the getDepartmentBreakdown function
const oldDepartmentBreakdown = `  // Get department breakdown for Dashboard
  async getDepartmentBreakdown() {
    const tasks = await this.getAllTasks();
    
    // Mock department mapping - in real implementation, this would come from Microsoft profiles
    const departmentMapping = {
      'John Smith': 'accounting',
      'Sarah Johnson': 'development',
      'Mike Davis': 'corp-management',
      'Lisa Chen': 'compliance',
      'Tom Wilson': 'accounting',
      'Emma Brown': 'development'
    };

    const breakdown = {
      'accounting': { total: 0, completed: 0, overdue: 0 },
      'development': { total: 0, completed: 0, overdue: 0 },
      'corp-management': { total: 0, completed: 0, overdue: 0 },
      'compliance': { total: 0, completed: 0, overdue: 0 }
    };

    const now = new Date();

    tasks.forEach(task => {
      const department = departmentMapping[task.ResponsibleParty] || 'uncategorized';
      if (breakdown[department]) {
        breakdown[department].total++;
        if (task.Completed) {
          breakdown[department].completed++;
        }
        if (new Date(task.Deadline) < now && !task.Completed) {
          breakdown[department].overdue++;
        }
      }
    });

    return breakdown;
  }`;

const newDepartmentBreakdown = `  // Get department breakdown for Dashboard
  async getDepartmentBreakdown() {
    const tasks = await this.getAllTasks();
    const users = await microsoftProfileService.getAllUsers();
    
    // Create department mapping from Microsoft profiles
    const departmentMapping = {};
    users.forEach(user => {
      departmentMapping[user.name] = user.department.toLowerCase().replace(/[^a-z0-9]/g, '-');
    });

    // Get unique departments from users
    const departments = [...new Set(users.map(user => user.department.toLowerCase().replace(/[^a-z0-9]/g, '-')))];
    
    const breakdown = {};
    departments.forEach(dept => {
      breakdown[dept] = { total: 0, completed: 0, overdue: 0 };
    });

    const now = new Date();

    tasks.forEach(task => {
      const department = departmentMapping[task.ResponsibleParty] || 'uncategorized';
      if (breakdown[department]) {
        breakdown[department].total++;
        if (task.Completed) {
          breakdown[department].completed++;
        }
        if (new Date(task.Deadline) < now && !task.Completed) {
          breakdown[department].overdue++;
        }
      }
    });

    return breakdown;
  }`;

content = content.replace(oldDepartmentBreakdown, newDepartmentBreakdown);

// Write the updated content back
fs.writeFileSync('src/databaseDataService.js', content);

console.log('DatabaseDataService updated to use real Microsoft profiles');
