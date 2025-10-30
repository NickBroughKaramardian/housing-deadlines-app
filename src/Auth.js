// Microsoft 365 Authentication - Replaces Firebase Auth
import React from 'react';
import { authService, getDepartmentFromResponsibleParty, ROLES, DEPARTMENTS, DEPARTMENT_NAMES, hasPermission, getUsersByDepartment, isUserInDepartment, updateUserDepartments, inviteUser } from './microsoftAuthService';

// Auth Context
const AuthContext = React.createContext();

// Auth Provider Component
export function AuthProvider({ children }) {
  const [user, setUser] = React.useState(null);
  const [userProfile, setUserProfile] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  // Check for existing authentication on mount
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('AuthProvider: Checking for existing authentication...');
        
        // First, handle any redirect responses (important for Edge browser)
        await authService.handleRedirectResponse();
        
        const result = await authService.getCurrentUser();
        if (result) {
          console.log('AuthProvider: Found existing user:', result);
          setUser(result);
          setUserProfile(result);
        } else {
          console.log('AuthProvider: No existing user found');
        }
      } catch (error) {
        console.log('AuthProvider: Error checking auth:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signIn = async () => {
    // Prevent multiple simultaneous sign-in attempts
    if (loading) {
      console.log('Auth.js: Sign in already in progress, ignoring request');
      return null;
    }

    try {
      console.log('Auth.js: Starting Microsoft sign in...');
      setLoading(true);
      
      const result = await authService.signIn();
      console.log('Auth.js: Sign in result:', result);
      
      if (result) {
        // Update state with the signed-in user
        setUser(result);
        setUserProfile(result);
        console.log('Auth.js: User state updated');
      }
      
      setLoading(false);
      return result;
    } catch (error) {
      console.error('Auth.js: Sign in error:', error);
      setLoading(false);
      
      // Don't show alert for interaction_in_progress errors
      if (!error.message.includes('interaction_in_progress')) {
        alert('Sign in failed: ' + error.message);
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('Auth.js: Starting sign out...');
      setLoading(true);
      await authService.signOut();
      setUser(null);
      setUserProfile(null);
      setLoading(false);
      console.log('Auth.js: Sign out successful');
    } catch (error) {
      console.error('Auth.js: Sign out error:', error);
      setLoading(false);
      throw error;
    }
  };

  const getToken = async () => {
    return await authService.getToken();
  };

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signOut,
    getToken,
    hasPermission,
    ROLES,
    DEPARTMENTS,
    DEPARTMENT_NAMES,
    getUsersByDepartment,
    isUserInDepartment,
    updateUserDepartments,
    inviteUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Auth Hook
export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Auth Gate Component
export function AuthGate({ children }) {
  const { userProfile, loading, signIn } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="mb-6">
              <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                C&C Project Manager
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Sign in with your Microsoft 365 account to access the application
              </p>
            </div>
            
            <button
              onClick={() => {
                console.log('Sign in button clicked');
                signIn().catch(error => {
                  console.error('Sign in failed:', error);
                });
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
              </svg>
              <span>Sign in with Microsoft</span>
            </button>
            
            <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              <p>Test Environment</p>
              <p className="font-mono text-xs mt-1">NickK@CCDAPSTEST.onmicrosoft.com</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

// Export additional functions for compatibility
export { 
  getDepartmentFromResponsibleParty, 
  ROLES, 
  DEPARTMENTS, 
  DEPARTMENT_NAMES, 
  hasPermission, 
  getUsersByDepartment, 
  isUserInDepartment, 
  updateUserDepartments, 
  inviteUser 
};

export { authService as default };
