import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';
import { Client } from '@microsoft/microsoft-graph-client';
import { msalConfig, loginRequest } from './azureConfig';

let msalInstance = null;

export const initializeMsal = async () => {
  if (!msalInstance) {
    console.log('Initializing MSAL with config:', msalConfig);
    msalInstance = new PublicClientApplication(msalConfig);
    await msalInstance.initialize();
    console.log('MSAL initialized successfully');
  }
  return msalInstance;
};

export const login = async () => {
  try {
    console.log('Starting login process...');
    await initializeMsal();
    
    // Check if user is already logged in
    const accounts = msalInstance.getAllAccounts();
    console.log('Existing accounts:', accounts);
    
    if (accounts.length > 0) {
      console.log('User already logged in:', accounts[0]);
      return accounts[0];
    }

    // Always use redirect flow to avoid popup blocking issues
    console.log('Using redirect flow to avoid popup blocking...');
    await msalInstance.loginRedirect({
      ...loginRequest,
      prompt: 'select_account'
    });
    // This will redirect the page, so we won't reach here
    return null;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

export const logout = async () => {
  try {
    console.log('Starting logout...');
    await initializeMsal();
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      // Always use redirect logout to avoid popup blocking issues
      console.log('Using redirect logout to avoid popup blocking...');
      await msalInstance.logoutRedirect();
      console.log('Logout successful');
    }
  } catch (error) {
    console.error('Logout failed:', error);
    throw error;
  }
};

export const getAccessToken = async () => {
  try {
    console.log('Getting access token...');
    await initializeMsal();
    const accounts = msalInstance.getAllAccounts();
    
    if (accounts.length === 0) {
      throw new Error('No user account found');
    }

    const account = accounts[0];
    const tokenRequest = {
      scopes: ['https://graph.microsoft.com/.default'],
      account: account
    };

    const tokenResponse = await msalInstance.acquireTokenSilent(tokenRequest);
    console.log('Token acquired successfully');
    return tokenResponse.accessToken;
  } catch (error) {
    console.error('Error getting access token:', error);
    
    // If token acquisition fails, clear the cache and force re-authentication
    if (error.errorCode === 'invalid_grant' || error.errorCode === 'interaction_required' || 
        error.message?.includes('400') || error.message?.includes('Bad Request')) {
      console.log('Token invalid, clearing cache and forcing re-authentication...');
      try {
        await msalInstance.clearCache();
        // Force redirect to login
        await msalInstance.loginRedirect({
          ...loginRequest,
          prompt: 'select_account'
        });
      } catch (clearError) {
        console.error('Error clearing cache:', clearError);
      }
    }
    
    throw error;
  }
};

/**
 * Get the Microsoft Entra ID token (audience = this SPA's clientId) for
 * authenticating against the backend API.
 * - Uses acquireTokenSilent (MSAL refreshes expired tokens automatically)
 * - Forces a fresh request if the cached ID token expires within 5 minutes
 * - Falls back to interactive login on InteractionRequiredAuthError
 */
export const getIdToken = async () => {
  await initializeMsal();
  const accounts = msalInstance.getAllAccounts();

  if (accounts.length === 0) {
    throw new Error('Not signed in. Please sign in to continue.');
  }

  const account = accounts[0];
  const idTokenRequest = {
    scopes: ['openid', 'profile', 'email'],
    account
  };

  const expiresSoon = (claims) => {
    const exp = claims?.exp;
    return !exp || exp * 1000 - Date.now() < 5 * 60 * 1000;
  };

  try {
    // Force a new token if the cached ID token is expired or about to expire
    let result = await msalInstance.acquireTokenSilent({
      ...idTokenRequest,
      forceRefresh: expiresSoon(account.idTokenClaims)
    });

    if (expiresSoon(result.idTokenClaims)) {
      result = await msalInstance.acquireTokenSilent({ ...idTokenRequest, forceRefresh: true });
    }

    return result.idToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError || error.errorCode === 'interaction_required') {
      console.warn('getIdToken: silent acquisition failed, redirecting to interactive login');
      await msalInstance.loginRedirect(loginRequest);
      // loginRedirect navigates away; throw in case the redirect is delayed
      throw new Error('Redirecting to sign-in...');
    }
    throw error;
  }
};

export const handleRedirectPromise = async () => {
  try {
    console.log('Handling redirect promise...');
    await initializeMsal();
    const response = await msalInstance.handleRedirectPromise();
    
    if (response) {
      console.log('Redirect response:', response);
      return response.account;
    }
    
    return null;
  } catch (error) {
    console.error('Error handling redirect promise:', error);
    return null;
  }
};

// Get Microsoft Graph client
export const getGraphClient = async () => {
  try {
    await initializeMsal();
    const accounts = msalInstance.getAllAccounts();
    
    if (accounts.length === 0) {
      throw new Error('No user account found');
    }

    const account = accounts[0];
    const tokenRequest = {
      scopes: ['https://graph.microsoft.com/.default'],
      account: account
    };

    const tokenResponse = await msalInstance.acquireTokenSilent(tokenRequest);
    
    const graphClient = Client.init({
      authProvider: (done) => {
        done(null, tokenResponse.accessToken);
      }
    });

    return graphClient;
  } catch (error) {
    console.error('Error getting Graph client:', error);
    
    // If token acquisition fails, clear the cache and force re-authentication
    if (error.errorCode === 'invalid_grant' || error.errorCode === 'interaction_required' || 
        error.message?.includes('400') || error.message?.includes('Bad Request')) {
      console.log('Token invalid, clearing cache and forcing re-authentication...');
      try {
        await msalInstance.clearCache();
        // Force redirect to login
        await msalInstance.loginRedirect({
          ...loginRequest,
          prompt: 'select_account'
        });
      } catch (clearError) {
        console.error('Error clearing cache:', clearError);
      }
    }
    
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    await initializeMsal();
    const accounts = msalInstance.getAllAccounts();
    
    if (accounts.length > 0) {
      return accounts[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Export function to get MSAL instance
export const getMsalInstance = async () => {
  await initializeMsal();
  return msalInstance;
};
