import { microsoftDataService } from './microsoftDataService';
// Temporary authentication bypass for testing
export const tempAuth = {
  user: {
    name: 'Test User',
    email: 'test@ccdapstest.com',
    id: 'temp-user-id'
  },
  userProfile: {
    displayName: 'Test User',
    email: 'test@ccdapstest.com',
    role: 'owner',
    departments: ['development', 'management']
  },
  loading: false,
  signIn: async () => {
    console.log('Temporary sign in');
    return { account: tempAuth.user };
  },
  signOut: async () => {
    console.log('Temporary sign out');
  },
  getToken: async () => {
    return 'temp-token';
  },
  users: [],
  aliases: [],
  departmentMappings: [],
  loadUsers: async () => {},
  loadAliases: async () => {},
  loadDepartmentMappings: async () => {},
  updateUserDepartments: async () => {}
};
