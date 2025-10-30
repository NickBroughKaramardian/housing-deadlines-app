import React, { useState, useEffect } from 'react';
import microsoftTeams from '@microsoft/teams-js';

export default function TeamsConfig() {
  const [config, setConfig] = useState({
    entityId: '',
    contentUrl: '',
    removeUrl: '',
    websiteUrl: '',
    suggestedDisplayName: 'C&C Project Manager'
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeTeamsConfig();
  }, []);

  const initializeTeamsConfig = async () => {
    try {
      // Initialize the Teams SDK
      await microsoftTeams.initialize();
      
      // Get the current configuration
      const currentConfig = await microsoftTeams.getConfig();
      
      if (currentConfig) {
        setConfig({
          entityId: currentConfig.entityId || 'cc-project-manager',
          contentUrl: currentConfig.contentUrl || 'https://ccprojectmanager.web.app/teams',
          removeUrl: currentConfig.removeUrl || 'https://ccprojectmanager.web.app/teams-remove',
          websiteUrl: currentConfig.websiteUrl || 'https://ccprojectmanager.web.app',
          suggestedDisplayName: currentConfig.suggestedDisplayName || 'C&C Project Manager'
        });
      }
      
      setIsLoading(false);
      
      // Register the save handler
      microsoftTeams.settings.registerOnSaveHandler(async (saveEvent) => {
        try {
          // Save the configuration
          await microsoftTeams.settings.setConfig(config);
          
          // Notify Teams that the configuration was saved
          saveEvent.notifySuccess();
        } catch (error) {
          console.error('Error saving configuration:', error);
          saveEvent.notifyFailure(error.message);
        }
      });
      
      // Enable the save button
      microsoftTeams.settings.setValidityState(true);
      
    } catch (error) {
      console.error('Error initializing Teams configuration:', error);
      setIsLoading(false);
    }
  };

  const handleConfigChange = (field, value) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    
    // Update the configuration in Teams
    microsoftTeams.settings.setConfig(newConfig);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Configure C&C Project Manager
        </h1>
        <p className="text-gray-600">
          Set up the project management app for your team channel.
        </p>
      </div>

      <div className="space-y-6">
        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tab Name
          </label>
          <input
            type="text"
            value={config.suggestedDisplayName}
            onChange={(e) => handleConfigChange('suggestedDisplayName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter tab name"
          />
          <p className="mt-1 text-sm text-gray-500">
            This will be the name of the tab in your Teams channel.
          </p>
        </div>

        {/* Entity ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Entity ID
          </label>
          <input
            type="text"
            value={config.entityId}
            onChange={(e) => handleConfigChange('entityId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter entity ID"
          />
          <p className="mt-1 text-sm text-gray-500">
            Unique identifier for this tab instance.
          </p>
        </div>

        {/* Content URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content URL
          </label>
          <input
            type="url"
            value={config.contentUrl}
            onChange={(e) => handleConfigChange('contentUrl', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://ccprojectmanager.web.app/teams"
          />
          <p className="mt-1 text-sm text-gray-500">
            The URL where the app content will be loaded from.
          </p>
        </div>

        {/* Website URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Website URL
          </label>
          <input
            type="url"
            value={config.websiteUrl}
            onChange={(e) => handleConfigChange('websiteUrl', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://ccprojectmanager.web.app"
          />
          <p className="mt-1 text-sm text-gray-500">
            The URL that will open when users click "Go to website".
          </p>
        </div>

        {/* Remove URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Remove URL
          </label>
          <input
            type="url"
            value={config.removeUrl}
            onChange={(e) => handleConfigChange('removeUrl', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://ccprojectmanager.web.app/teams-remove"
          />
          <p className="mt-1 text-sm text-gray-500">
            The URL that will be called when the tab is removed.
          </p>
        </div>

        {/* Preview */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
          <div className="bg-white border border-gray-200 rounded p-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
              <span className="text-sm font-medium">{config.suggestedDisplayName}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Entity ID: {config.entityId}
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">How it works</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• The app will appear as a tab in your Teams channel</li>
            <li>• Team members can view and manage project deadlines</li>
            <li>• Real-time updates will sync across all team members</li>
            <li>• Notifications will appear in Teams for upcoming deadlines</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 