import { microsoftDataService } from './microsoftDataService';
import { login, logout, getCurrentUser, getAccessToken, handleRedirectPromise } from './msalService';
import { getMe } from './services/usersApi';

// User roles (must match the backend /api/me contract)
export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  MEMBER: 'MEMBER',
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
    [ROLES.MEMBER]: 1,
    [ROLES.MANAGER]: 2,
    [ROLES.ADMIN]: 3
  };
  
  return (roleHierarchy[userRole] ?? -1) >= (roleHierarchy[requiredRole] ?? 0);
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
  for (const dept of Object.values(DEPARTMENTS)) {
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

// In-memory session cache for the /api/me profile (S3). Never persisted;
// cleared on sign-out.
let cachedProfile = null;

/**
 * Build the user profile for a signed-in MSAL account.
 * Role and departments come from GET /api/me. If /api/me fails (e.g. backend
 * not deployed yet), fall back to the least-privileged useful role (MEMBER)
 * and log a warning. NEVER falls back to ADMIN.
 */
const buildUserProfile = async (account) => {
  const accountId = account.localAccountId || account.username;
  if (cachedProfile && cachedProfile.id === accountId) {
    return cachedProfile;
  }

  let me = null;
  try {
    me = await getMe();
  } catch (error) {
    console.warn(
      'AuthService: GET /api/me failed - falling back to MEMBER role (no departments).',
      error
    );
  }

  cachedProfile = {
    id: accountId,
    displayName: me?.name || account.name || account.username,
    email: me?.email || account.username,
    role: me?.role || ROLES.MEMBER,
    departments: Array.isArray(me?.departments) ? me.departments : [],
    isActive: true,
    lastLogin: new Date().toISOString(),
    organizationId: 'microsoft-365'
  };

  return cachedProfile;
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
      const account = await login();
      
      if (account) {
        return await buildUserProfile(account);
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
      cachedProfile = null;
      await logout();
    } catch (error) {
      console.error('AuthService: Sign out error:', error);
      throw error;
    }
  },

  // Handle redirect response (important for Edge browser)
  handleRedirectResponse: async () => {
    try {
      console.log('AuthService: Handling redirect response...');
      await handleRedirectPromise();
      console.log('AuthService: Redirect response handled successfully');
    } catch (error) {
      console.log('AuthService: No redirect response to handle:', error.message);
      // This is normal if there's no redirect response
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const account = await getCurrentUser();
      
      if (account) {
        return await buildUserProfile(account);
      }
      
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
