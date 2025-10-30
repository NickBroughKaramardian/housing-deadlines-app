import React, { useEffect, useState, createContext, useContext } from 'react';
import { getAuth, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { db } from './firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

const allowedDomain = 'c-cdev.com';

function isAllowedEmail(email) {
  return email.endsWith(`@${allowedDomain}`);
}

// User roles
export const ROLES = {
  DEVELOPER: 'developer',
  OWNER: 'owner',
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer'
};

const DEPARTMENTS = {
  DEVELOPMENT: 'development',
  ACCOUNTING: 'accounting',
  COMPLIANCE: 'compliance',
  MANAGEMENT: 'management'
};

const DEPARTMENT_NAMES = {
  [DEPARTMENTS.DEVELOPMENT]: 'Development',
  [DEPARTMENTS.ACCOUNTING]: 'Accounting',
  [DEPARTMENTS.COMPLIANCE]: 'Compliance',
  [DEPARTMENTS.MANAGEMENT]: 'Management'
};

// Developer emails (special role with full permissions)
const DEVELOPER_EMAILS = ['nickk@c-cdev.com'];

// Default organization for C&C
const DEFAULT_ORG = {
  id: 'c-cdev',
  name: 'C&C Development',
  domain: 'c-cdev.com'
};

// Check if user has been invited
async function getInviteByEmail(email) {
  const q = query(collection(db, 'invites'), where('email', '==', email.toLowerCase()));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }
  return null;
}

// Check if user profile exists
async function getUserProfileByEmail(email) {
  const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }
  return null;
}

// Owner invite function - creates user profile and Firebase Auth account immediately
export async function inviteUser(email, role, invitedBy) {
  try {
    // Check if user already has a profile
    const existingProfile = await getUserProfileByEmail(email);
    if (existingProfile) {
      throw new Error('User already exists in the system.');
    }

    // Create Firebase Auth account with default password
    const auth = getAuth();
    const userCredential = await createUserWithEmailAndPassword(auth, email, 'APS2025');
    const firebaseUser = userCredential.user;

    // Create the user profile immediately
    const userRef = doc(db, 'users', firebaseUser.uid);
    await setDoc(userRef, {
      uid: firebaseUser.uid,
      email: email.toLowerCase(),
      displayName: email.split('@')[0],
      role,
      invitedBy,
      organizationId: DEFAULT_ORG.id,
      organizationName: DEFAULT_ORG.name,
      createdAt: new Date(),
      lastLogin: new Date(),
      isActive: true,
      hasPassword: true // User has password set
    });

    // Sign out the automatically signed-in user
    await signOut(auth);

    return true;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Create or get user profile
  const createUserProfile = async (firebaseUser) => {
    try {
      console.log('Creating/getting user profile for:', firebaseUser.email);
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        console.log('No existing profile found, checking for email-based profile');
        // New user - check if they have a profile by email
        const email = firebaseUser.email || '';
        const profileByEmail = await getUserProfileByEmail(email);
        
        if (!profileByEmail) {
          // Check if this is nickk@c-cdev.com (always allowed)
          if (email === 'nickk@c-cdev.com') {
            console.log('Creating developer profile for nickk@c-cdev.com');
            const newProfile = {
              uid: firebaseUser.uid,
              email: email,
              displayName: firebaseUser.displayName || email.split('@')[0],
              role: ROLES.DEVELOPER,
              organizationId: DEFAULT_ORG.id,
              organizationName: DEFAULT_ORG.name,
              departments: [], // Array of department IDs
              departmentFilterEnabled: false, // Default to showing all departments
              showOverdueDeadlines: true, // Default to showing overdue deadlines
              overdueDaysLimit: 90, // Default to 90 days
              createdAt: new Date(),
              lastLogin: new Date(),
              isActive: true,
              hasPassword: true
            };
            
            await setDoc(userRef, newProfile);
            console.log('Developer profile created successfully');
            return newProfile;
          } else {
            throw new Error('You must be invited to access this application.');
          }
        }
        
        console.log('Found email-based profile, creating Firebase profile');
        // User has a profile but no Firebase auth account - create one
        const newProfile = {
          uid: firebaseUser.uid,
          email: profileByEmail.email,
          displayName: profileByEmail.displayName,
          role: profileByEmail.role,
          organizationId: profileByEmail.organizationId,
          organizationName: profileByEmail.organizationName,
          departments: profileByEmail.departments || [], // Preserve existing departments
          departmentFilterEnabled: profileByEmail.departmentFilterEnabled || false, // Preserve filter setting
          showOverdueDeadlines: profileByEmail.showOverdueDeadlines !== false, // Preserve overdue setting
          overdueDaysLimit: profileByEmail.overdueDaysLimit || 90, // Preserve overdue limit
          createdAt: profileByEmail.createdAt,
          lastLogin: new Date(),
          isActive: true,
          hasPassword: true
        };
        
        await setDoc(userRef, newProfile);
        
        // Remove the old profile by email
        await deleteDoc(doc(db, 'users', profileByEmail.id));
        
        console.log('Profile created from email-based profile');
        return newProfile;
      } else {
        console.log('Existing profile found, updating last login');
        // Existing user - update last login
        const profile = userSnap.data();
        
        const updates = { lastLogin: new Date() };
        
        // Check if user should be upgraded to Developer role
        if (DEVELOPER_EMAILS.includes(profile.email.toLowerCase()) && profile.role !== ROLES.DEVELOPER) {
          updates.role = ROLES.DEVELOPER;
        }
        
        await setDoc(userRef, updates, { merge: true });
        console.log('Profile updated successfully');
        return { ...profile, ...updates };
      }
    } catch (error) {
      console.error('Error in createUserProfile:', error);
      throw error;
    }
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email || '';
        
        if (isAllowedEmail(email)) {
          try {
            const profile = await createUserProfile(firebaseUser);
            setUser(firebaseUser);
            setUserProfile(profile);
          } catch (error) {
            console.error('Error creating/getting user profile:', error);
            await signOut(auth);
            setUser(null);
            setUserProfile(null);
          }
        } else {
          await signOut(auth);
          setUser(null);
          setUserProfile(null);
          alert('Only @c-cdev.com emails are allowed to sign in.');
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signOutUser = async () => {
    const auth = getAuth();
    await signOut(auth);
  };

  // Check if user has permission
  const hasPermission = (requiredRole) => {
    if (!userProfile) return false;
    
    const roleHierarchy = {
      [ROLES.DEVELOPER]: 5,
      [ROLES.OWNER]: 4,
      [ROLES.ADMIN]: 3,
      [ROLES.EDITOR]: 2,
      [ROLES.VIEWER]: 1
    };
    
    return roleHierarchy[userProfile.role] >= roleHierarchy[requiredRole];
  };

  // Get all users in the organization (admin only)
  const getOrganizationUsers = async () => {
    if (!hasPermission(ROLES.ADMIN)) {
      throw new Error('Insufficient permissions');
    }
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('organizationId', '==', userProfile.organizationId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  };

  // Update user role with proper hierarchy checks
  const updateUserRole = async (userId, newRole, targetUserRole) => {
    if (!userProfile) {
      throw new Error('User not authenticated');
    }
    
    const roleHierarchy = {
      [ROLES.DEVELOPER]: 5,
      [ROLES.OWNER]: 4,
      [ROLES.ADMIN]: 3,
      [ROLES.EDITOR]: 2,
      [ROLES.VIEWER]: 1
    };
    
    const currentUserLevel = roleHierarchy[userProfile.role] || 0;
    const targetUserLevel = roleHierarchy[targetUserRole] || 0;
    const newRoleLevel = roleHierarchy[newRole] || 0;
    
    // Developers can modify anyone, including other developers
    if (userProfile.role === ROLES.DEVELOPER) {
      // Developers can assign any role except developer to others
      if (newRole === ROLES.DEVELOPER && userId !== user.uid) {
        throw new Error('You cannot assign developer role to other users');
      }
    } else {
      // Non-developers can modify users with lower or equal permissions (except developers)
      if (targetUserRole === ROLES.DEVELOPER) {
        throw new Error('You cannot modify developers');
      }
      
      if (currentUserLevel < targetUserLevel) {
        throw new Error('You can only modify users with lower or equal permissions than yourself');
      }
      
      // Check if user can assign the new role
      if (newRoleLevel >= currentUserLevel) {
        throw new Error('You cannot assign a role equal to or higher than your own');
      }
    }
    
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { role: newRole }, { merge: true });
  };

  // Remove user with proper hierarchy checks
  const removeUser = async (userId, targetUserRole) => {
    if (!userProfile) {
      throw new Error('User not authenticated');
    }
    
    // Developers can remove anyone, including other developers
    if (userProfile.role === ROLES.DEVELOPER) {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
    } else {
      // Non-developers can remove users with lower or equal permissions (except developers)
      const roleHierarchy = {
        [ROLES.DEVELOPER]: 5,
        [ROLES.OWNER]: 4,
        [ROLES.ADMIN]: 3,
        [ROLES.EDITOR]: 2,
        [ROLES.VIEWER]: 1
      };
      
      const currentUserLevel = roleHierarchy[userProfile.role] || 0;
      const targetUserLevel = roleHierarchy[targetUserRole] || 0;
      
      if (targetUserRole === ROLES.DEVELOPER) {
        throw new Error('You cannot remove developers');
      }
      
      if (currentUserLevel < targetUserLevel) {
        throw new Error('You can only remove users with lower or equal permissions than yourself');
      }
      
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
    }
  };

  // Department management functions
  const updateUserDepartments = async (userId, departments) => {
    if (!userProfile) throw new Error('User profile not loaded');
    
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { departments });
  };

  const updateDepartmentFilter = async (enabled) => {
    if (!userProfile) throw new Error('User profile not loaded');
    
    const userRef = doc(db, 'users', userProfile.uid);
    await updateDoc(userRef, { departmentFilterEnabled: enabled });
    
    // Update local state
    setUserProfile(prev => prev ? { ...prev, departmentFilterEnabled: enabled } : null);
  };

  const getDepartmentName = (departmentId) => {
    return DEPARTMENT_NAMES[departmentId] || departmentId;
  };

  const isUserInDepartment = (user, departmentId) => {
    return user.departments && user.departments.includes(departmentId);
  };

  const getUsersByDepartment = (users, departmentId) => {
    return users.filter(user => isUserInDepartment(user, departmentId));
  };

  const value = { 
    user, 
    userProfile,
    signOutUser,
    hasPermission,
    getOrganizationUsers,
    updateUserRole,
    removeUser,
    updateUserDepartments,
    updateDepartmentFilter,
    getDepartmentName,
    isUserInDepartment,
    getUsersByDepartment,
    ROLES,
    DEPARTMENTS,
    DEPARTMENT_NAMES
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function AuthGate({ children }) {
  const { user, userProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState('email'); // 'email', 'password'
  const [userEmail, setUserEmail] = useState('');
  const [userProfileData, setUserProfileData] = useState(null);

  // If user is authenticated, show the main app
  if (user && userProfile) {
    return <div>{children}</div>;
  }

  // If user is authenticated but profile is still loading, show loading
  if (user && !userProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    if (!isAllowedEmail(email)) {
      setError('Only @c-cdev.com emails are allowed to sign in.');
      setIsLoading(false);
      return;
    }

    try {
      // Check if user has a profile (invited)
      const profile = await getUserProfileByEmail(email);
      
      if (!profile) {
        setError('You must be invited to access this application. Please contact an administrator.');
      } else {
        // User has been invited - proceed to password screen
        setStep('password');
        setUserEmail(email);
        setUserProfileData(profile);
      }
      
      setIsLoading(false);
      
    } catch (err) {
      console.error('Error checking email:', err);
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log('Attempting to sign in with:', userEmail);
      const auth = getAuth();
      const result = await signInWithEmailAndPassword(auth, userEmail, password);
      console.log('Sign in successful:', result);
      setIsLoading(false);
    } catch (err) {
      console.error('Error signing in:', err);
      if (err.code === 'auth/wrong-password') {
        setError('Invalid password. Please try again.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email. Please create an account first.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError(`Sign in error: ${err.message}`);
      }
      setIsLoading(false);
    }
  };



  const handleForgotPassword = async () => {
    if (!userEmail) {
      setError('Please enter your email address first.');
      return;
    }

    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, userEmail);
      alert('Password reset email sent! Check your inbox.');
    } catch (err) {
      setError('Error sending password reset email: ' + err.message);
    }
  };

  const goBackToEmail = () => {
    setStep('email');
    setEmail('');
    setPassword('');
    setError('');
    setUserEmail('');
    setUserProfileData(null);
  };

  // Email input step
  if (step === 'email') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <h2 className="text-xl lg:text-2xl font-bold mb-4 text-center">Sign in to C&C Project Manager</h2>
        <div className="mb-4 text-gray-700 text-center text-sm lg:text-base">
          Enter your email address to continue.
        </div>
        
        <form onSubmit={handleEmailSubmit} className="bg-white p-4 lg:p-6 rounded-lg shadow-md w-full max-w-xs flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="border px-3 py-2 rounded"
            required
          />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            disabled={isLoading}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-semibold disabled:opacity-50"
          >
            {isLoading ? 'Checking...' : 'Continue'}
          </button>
        </form>
      </div>
    );
  }

  // Password input step
  if (step === 'password') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <h2 className="text-xl lg:text-2xl font-bold mb-4 text-center">Enter Your Password</h2>
        <div className="mb-4 text-gray-700 text-center text-sm lg:text-base">
          Welcome! Please enter your password.
        </div>
        
        <form onSubmit={handlePasswordSubmit} className="bg-white p-4 lg:p-6 rounded-lg shadow-md w-full max-w-xs flex flex-col gap-3">
          <div className="text-sm text-gray-600 mb-2">
            Signing in as: <strong>{userEmail}</strong>
          </div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="border px-3 py-2 rounded"
            required
          />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            disabled={isLoading}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-semibold disabled:opacity-50"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Forgot password? Contact <strong>nickk@c-cdev.com</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={goBackToEmail}
            className="text-gray-600 underline text-sm"
          >
            Use Different Email
          </button>
        </form>
      </div>
    );
  }



  // If we get here, user is not authenticated, show login forms
  return null;
} 