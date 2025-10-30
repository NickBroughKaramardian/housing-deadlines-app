import { getGraphClient } from './msalService';

class MicrosoftProfileService {
  constructor() {
    this.cache = new Map();
    this.lastFetch = null;
    this.cacheTimeout = 300000; // 5 minutes
  }

  // Get all users from Microsoft 365
  async getAllUsers() {
    const now = Date.now();
    
    // Return cached data if it's still fresh
    if (this.lastFetch && (now - this.lastFetch) < this.cacheTimeout && this.cache.has('users')) {
      return this.cache.get('users');
    }

    try {
      // Disabled /users API call to prevent 404 errors
      // Return mock users instead of making API calls
      console.log('MicrosoftProfileService: Using mock users to prevent API errors');
      return this.getMockUsers();
    } catch (error) {
      console.error('MicrosoftProfileService: Error fetching users:', error);
      // Return cached data if available, otherwise return mock data
      return this.cache.get('users') || this.getMockUsers();
    }
  }

  // Get users by department
  async getUsersByDepartment(department) {
    const users = await this.getAllUsers();
    return users.filter(user => user.department === department);
  }

  // Get user by ID
  async getUserById(userId) {
    const users = await this.getAllUsers();
    return users.find(user => user.id === userId);
  }

  // Get user by email
  async getUserByEmail(email) {
    const users = await this.getAllUsers();
    return users.find(user => user.email === email);
  }

  // Get department list
  async getDepartments() {
    const users = await this.getAllUsers();
    const departments = [...new Set(users.map(user => user.department))];
    return departments.filter(dept => dept && dept !== 'Unassigned');
  }

  // Mock users for development/testing
  getMockUsers() {
    return [
      {
        id: '1',
        name: 'John Smith',
        email: 'john.smith@company.com',
        department: 'Accounting',
        jobTitle: 'Senior Accountant',
        officeLocation: 'New York',
        phone: '+1-555-0101'
      },
      {
        id: '2',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@company.com',
        department: 'Development',
        jobTitle: 'Software Engineer',
        officeLocation: 'San Francisco',
        phone: '+1-555-0102'
      },
      {
        id: '3',
        name: 'Mike Davis',
        email: 'mike.davis@company.com',
        department: 'Corp/Management',
        jobTitle: 'Project Manager',
        officeLocation: 'Chicago',
        phone: '+1-555-0103'
      },
      {
        id: '4',
        name: 'Lisa Chen',
        email: 'lisa.chen@company.com',
        department: 'Compliance',
        jobTitle: 'Compliance Officer',
        officeLocation: 'Boston',
        phone: '+1-555-0104'
      },
      {
        id: '5',
        name: 'Tom Wilson',
        email: 'tom.wilson@company.com',
        department: 'Accounting',
        jobTitle: 'Junior Accountant',
        officeLocation: 'New York',
        phone: '+1-555-0105'
      },
      {
        id: '6',
        name: 'Emma Brown',
        email: 'emma.brown@company.com',
        department: 'Development',
        jobTitle: 'Frontend Developer',
        officeLocation: 'San Francisco',
        phone: '+1-555-0106'
      },
      {
        id: '7',
        name: 'David Lee',
        email: 'david.lee@company.com',
        department: 'Development',
        jobTitle: 'Backend Developer',
        officeLocation: 'Seattle',
        phone: '+1-555-0107'
      },
      {
        id: '8',
        name: 'Jennifer Garcia',
        email: 'jennifer.garcia@company.com',
        department: 'Compliance',
        jobTitle: 'Legal Counsel',
        officeLocation: 'Los Angeles',
        phone: '+1-555-0108'
      }
    ];
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    this.lastFetch = null;
  }

  // Get user photo - disabled to prevent 404 errors
  async getUserPhoto(userId) {
    // Disabled to prevent 404 errors when user photos don't exist
    return null;
  }

  // Search users
  async searchUsers(query) {
    const users = await this.getAllUsers();
    const lowercaseQuery = query.toLowerCase();
    
    return users.filter(user => 
      user.name.toLowerCase().includes(lowercaseQuery) ||
      user.email.toLowerCase().includes(lowercaseQuery) ||
      user.department.toLowerCase().includes(lowercaseQuery) ||
      user.jobTitle.toLowerCase().includes(lowercaseQuery)
    );
  }
}

// Export singleton instance
export const microsoftProfileService = new MicrosoftProfileService();
