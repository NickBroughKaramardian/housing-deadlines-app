import { microsoftDataService } from './microsoftDataService';
import { login, logout, getCurrentUser, getAccessToken, handleRedirectPromise } from './msalService';

// User roles
export const ROLES = {
  DEVELOPER: 'DEVELOPER',
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER'
};

// Department constants
export const DEPARTMENTS = {
  DEVELOPMENT: 'Development',
  MARKETING: 'Marketing',
  SALES: 'Sales',
  OPERATIONS: 'Operations'
};

export const DEPARTMENT_NAMES = Object.values(DEPARTMENTS);

// Permission checking
export const hasPermission = (userRole, requiredRole) => {
  const roleHierarchy = {
    [ROLES.VIEWER]: 0,
    [ROLES.EDITOR]: 1,
    [ROLES.ADMIN]: 2,
    [ROLES.OWNER]: 3,
    [ROLES.DEVELOPER]: 4
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

// Department detection from responsible party
export const getDepartmentFromResponsibleParty = (responsibleParty, departmentMappings = [], nameAliases = []) => {
  if (!responsibleParty) return null;
  
  const party = responsibleParty.toLowerCase().trim();
  
  // Check custom mappings first
  for (const mapping of departmentMappings) {
    if (mapping.term && party.includes(mapping.term.toLowerCase())) {
      return mapping.department;
    }
  }
  
  // Check name aliases
  for (const alias of nameAliases) {
    if (alias.alias && party.includes(alias.alias.toLowerCase())) {
      // Find the user and get their departments
      // This would need to be implemented with actual user lookup
      return 'Development'; // Default for now
    }
  }
  
  // Check department keywords
  for (const [key, dept] of Object.entries(DEPARTMENTS)) {
    if (party.includes(dept.toLowerCase())) {
      return dept;
    }
  }
  
  return null;
};

// User management functions
export const getUsersByDepartment = (users, department) => {
  return users.filter(user => 
    user.departments && user.departments.includes(department)
  );
};

export const isUserInDepartment = (user, department) => {
  return user.departments && user.departments.includes(department);
};

export const updateUserDepartments = async (userId, departments) => {
  try {
    await microsoftDataService.users.update(userId, { departments });
    return true;
  } catch (error) {
    console.error('Error updating user departments:', error);
    throw error;
  }
};

export const inviteUser = async (email, role, departments = []) => {
  try {
    const newUser = {
      displayName: email.split('@')[0],
      email: email,
      role: role,
      departments: departments,
      isActive: true
    };
    
    const result = await microsoftDataService.users.add(newUser);
    return result;
  } catch (error) {
    console.error('Error inviting user:', error);
    throw error;
  }
};

// Main authentication service
export const authService = {
  // Initialize authentication
  initialize: async () => {
    try {
      console.log('AuthService: Initializing...');
      await handleRedirectPromise();
      console.log('AuthService: Initialized successfully');
    } catch (error) {
      console.error('AuthService: Error initializing:', error);
    }
  },

  // Sign in user
  signIn: async () => {
    try {
      console.log('AuthService: Starting sign in...');
      const account = await login();
      console.log('AuthService: Login successful, account:', account);
      
      if (account) {
        // For now, return a mock user without SharePoint integration
        // This will allow the app to work while we debug SharePoint issues
        const mockUser = {
          id: account.localAccountId || '1',
          displayName: account.name || account.username || 'Test User',
          email: account.username || 'test@example.com',
          role: 'ADMIN',
          departments: ['Development'],
          isActive: true,
          createdDate: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          organizationId: 'microsoft-365'
        };
        
        console.log('AuthService: Returning mock user:', mockUser);
        return mockUser;
      }
      
      throw new Error('Login failed - no account returned');
    } catch (error) {
      console.error('AuthService: Sign in error:', error);
      throw error;
    }
  },

  // Sign out user
  signOut: async () => {
    try {
      console.log('AuthService: Starting sign out...');
      await logout();
      console.log('AuthService: Sign out successful');
    } catch (error) {
      console.error('AuthService: Sign out error:', error);
      throw error;
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      console.log('AuthService: Getting current user...');
      const account = await getCurrentUser();
      console.log('AuthService: Current account:', account);
      
      if (account) {
        const mockUser = {
          id: account.localAccountId || '1',
          displayName: account.name || account.username || 'Test User',
          email: account.username || 'test@example.com',
          role: 'ADMIN',
          departments: ['Development'],
          isActive: true,
          createdDate: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          organizationId: 'microsoft-365'
        };
        
        console.log('AuthService: Returning current user:', mockUser);
        return mockUser;
      }
      
      console.log('AuthService: No current user found');
      return null;
    } catch (error) {
      console.error('AuthService: Error getting current user:', error);
      return null;
    }
  },

  // Get access token
  getToken: async () => {
    try {
      console.log('AuthService: Getting access token...');
      return await getAccessToken();
    } catch (error) {
      console.error('AuthService: Error getting token:', error);
      throw error;
    }
  }
};
