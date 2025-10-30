import React, { useState, useEffect } from 'react';
import { sharePointService } from './graphService';
import { listsToCreate } from './sharePointLists';
import { migrateData } from './dataMigrationService';
import { login, getCurrentUser, getAccessToken, initializeMsal } from './msalService';

const IntegrationSetup = () => {
  const [step, setStep] = useState(0); // Start with authentication step
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [listsCreated, setListsCreated] = useState([]);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Initialize MSAL first
        console.log('Initializing MSAL...');
        await initializeMsal();
        console.log('MSAL initialized successfully');
        
        const currentUser = await getCurrentUser();
        const token = await getAccessToken();
        
        if (currentUser && token) {
          setUser(currentUser);
          setIsAuthenticated(true);
          setStep(1); // Move to list creation step
        } else {
          setStep(0); // Stay on authentication step
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setStep(0);
      }
    };
    
    checkAuth();
  }, []);

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('Starting Microsoft login...');
      const response = await login();
      console.log('Login response:', response);
      
      const user = await getCurrentUser();
      const token = await getAccessToken();
      
      if (user && token) {
        setUser(user);
        setIsAuthenticated(true);
        setSuccess('Successfully authenticated with Microsoft 365!');
        setStep(1);
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(`Login failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLists = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Verify we still have a valid token
      const token = await getAccessToken();
      if (!token) {
        setError('Authentication expired. Please sign in again.');
        setStep(0);
        return;
      }

      // First, check what lists already exist
      console.log('Checking existing SharePoint lists...');
      const existingLists = await sharePointService.getLists();
      const existingListNames = existingLists.map(list => list.displayName);
      console.log('Existing lists:', existingListNames);

      const createdLists = [];
      const skippedLists = [];
      
      for (const listConfig of listsToCreate) {
        try {
          // Check if list already exists
          if (existingListNames.includes(listConfig.displayName)) {
            console.log(`List already exists, skipping: ${listConfig.displayName}`);
            skippedLists.push(listConfig.displayName);
            continue;
          }

          console.log(`Creating list: ${listConfig.displayName}`);
          
          // Convert columns to SharePoint format
          const columns = listConfig.columns.map(col => ({
            name: col.name,
            displayName: col.displayName,
            type: col.type,
            required: col.required || false,
            choices: col.choices || []
          }));

          const list = await sharePointService.createList(
            listConfig.name,
            listConfig.displayName,
            listConfig.description,
            columns
          );
          
          createdLists.push(list);
          console.log(`Created list: ${listConfig.displayName}`);
        } catch (error) {
          console.error(`Error creating list ${listConfig.displayName}:`, error);
          // Continue with other lists even if one fails
        }
      }
      
      setListsCreated(createdLists);
      
      let message = '';
      if (createdLists.length > 0) {
        message += `Successfully created ${createdLists.length} new SharePoint lists!`;
      }
      if (skippedLists.length > 0) {
        message += ` Skipped ${skippedLists.length} existing lists.`;
      }
      
      if (createdLists.length > 0 || skippedLists.length > 0) {
        setSuccess(message);
        setStep(2);
      } else {
        setError('No lists were created or found. Please check your permissions and try again.');
      }
    } catch (error) {
      setError(`Error creating lists: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateData = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await migrateData();
      setMigrationComplete(true);
      setSuccess('Data migration completed successfully!');
      setStep(3);
    } catch (error) {
      setError(`Error migrating data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSetup = () => {
    setSetupComplete(true);
    // Store setup completion in localStorage to prevent loop
    localStorage.setItem('sharePointSetupComplete', 'true');
    // Clear any existing setup flags to ensure clean app load
    localStorage.removeItem('showIntegrationSetup');
    // Redirect to main app
    window.location.reload();
  };

  // If setup is already complete, don't show the setup screen
  if (setupComplete || localStorage.getItem('sharePointSetupComplete')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
            Microsoft 365 Integration Setup
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Set up SharePoint Lists and migrate your data for enterprise integration
          </p>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 dark:bg-green-900 border border-green-400 text-green-700 dark:text-green-300 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        <div className="space-y-6">
          {/* Step 0: Microsoft Authentication */}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                Step 0: Microsoft 365 Authentication
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                First, you need to sign in with your Microsoft 365 account to access SharePoint and create lists.
              </p>
              {user && (
                <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 px-4 py-3 rounded mb-6">
                  Signed in as: {user.name || user.displayName || user.email}
                </div>
              )}
              <button
                onClick={handleMicrosoftLogin}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign in with Microsoft 365'}
              </button>
            </div>
          )}

          {/* Step 1: Create Lists */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                Step 1: Create SharePoint Lists
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                This will create the following SharePoint lists in your site (existing lists will be skipped):
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-6 space-y-2">
                {listsToCreate.map((list, index) => (
                  <li key={index}>{list.displayName} - {list.description}</li>
                ))}
              </ul>
              <button
                onClick={handleCreateLists}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating Lists...' : 'Create SharePoint Lists'}
              </button>
            </div>
          )}

          {/* Step 2: Migrate Data */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                Step 2: Migrate Data
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                This will migrate all your existing data from Firebase to SharePoint Lists.
                Your data will be preserved and accessible through both the app and Microsoft 365.
              </p>
              <button
                onClick={handleMigrateData}
                disabled={loading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Migrating Data...' : 'Migrate Data to SharePoint'}
              </button>
            </div>
          )}

          {/* Step 3: Complete */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                Setup Complete! 🎉
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Your app is now fully integrated with Microsoft 365! You can:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-6 space-y-2">
                <li>Access your data through the app and SharePoint</li>
                <li>Use Microsoft Copilot to analyze your project data</li>
                <li>Sync data between the app and Microsoft 365</li>
                <li>Access files from OneDrive</li>
                <li>Collaborate with your team through Microsoft 365</li>
              </ul>
              <button
                onClick={handleCompleteSetup}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Continue to App
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <div className="flex justify-center space-x-4">
            <div className={`w-3 h-3 rounded-full ${step >= 0 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`w-3 h-3 rounded-full ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Step {step === 0 ? 'Authentication' : step} of 3
          </p>
        </div>
      </div>
    </div>
  );
};

export default IntegrationSetup;
