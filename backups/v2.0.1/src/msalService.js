import { PublicClientApplication } from '@azure/msal-browser';
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

    // Check if we're in Edge browser and use redirect instead of popup
    const isEdge = navigator.userAgent.includes('Edg/');
    
    if (isEdge) {
      console.log('Detected Edge browser, using redirect flow...');
      // Use redirect flow for Edge to avoid COOP issues
      await msalInstance.loginRedirect({
        ...loginRequest,
        prompt: 'select_account'
      });
      // This will redirect the page, so we won't reach here
      return null;
    } else {
      console.log('Starting popup login...');
      // Start login process with popup for other browsers
      const loginResponse = await msalInstance.loginPopup({
        ...loginRequest,
        prompt: 'select_account'
      });
      
      console.log('Login successful:', loginResponse);
      return loginResponse.account;
    }
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
      // Check if we're in Edge browser and use redirect instead of popup
      const isEdge = navigator.userAgent.includes('Edg/');
      
      if (isEdge) {
        console.log('Detected Edge browser, using redirect logout...');
        await msalInstance.logoutRedirect();
      } else {
        await msalInstance.logoutPopup();
      }
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
