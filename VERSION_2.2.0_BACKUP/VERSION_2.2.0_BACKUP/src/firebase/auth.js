// Firebase Auth replacement for Microsoft 365
import { authService } from '../microsoftAuthService';

// Mock Firebase Auth functions
export const getAuth = () => ({
  currentUser: null,
  onAuthStateChanged: (callback) => {
    // Simulate auth state change
    setTimeout(() => {
      callback({
        uid: '1',
        email: 'user@example.com',
        displayName: 'Current User'
      });
    }, 100);
    return () => {};
  },
  signInWithEmailAndPassword: async (email, password) => {
    return {
      user: {
        uid: '1',
        email: email,
        displayName: 'Current User'
      }
    };
  },
  createUserWithEmailAndPassword: async (email, password) => {
    return {
      user: {
        uid: Date.now().toString(),
        email: email,
        displayName: 'New User'
      }
    };
  },
  signOut: async () => {
    return Promise.resolve();
  },
  sendPasswordResetEmail: async (email) => {
    return Promise.resolve();
  },
  updateProfile: async (user, profile) => {
    return Promise.resolve();
  },
  updatePassword: async (user, password) => {
    return Promise.resolve();
  }
});

export const signInWithEmailAndPassword = async (auth, email, password) => {
  return {
    user: {
      uid: '1',
      email: email,
      displayName: 'Current User'
    }
  };
};

export const createUserWithEmailAndPassword = async (auth, email, password) => {
  return {
    user: {
      uid: Date.now().toString(),
      email: email,
      displayName: 'New User'
    }
  };
};

export const signOut = async (auth) => {
  return Promise.resolve();
};

export const sendPasswordResetEmail = async (auth, email) => {
  return Promise.resolve();
};

export const updateProfile = async (user, profile) => {
  return Promise.resolve();
};

export const updatePassword = async (user, password) => {
  return Promise.resolve();
};

export const onAuthStateChanged = (auth, callback) => {
  setTimeout(() => {
    callback({
      uid: '1',
      email: 'user@example.com',
      displayName: 'Current User'
    });
  }, 100);
  return () => {};
};
