import React, { useEffect, useState } from 'react';
import teamsService from './teamsService';

export default function TeamsWrapper({ children }) {
  const [isInTeams, setIsInTeams] = useState(false);
  const [teamsTheme, setTeamsTheme] = useState('default');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeTeams();
  }, []);

  const initializeTeams = async () => {
    try {
      // Try to initialize Teams SDK
      const teamsInitialized = await teamsService.initialize();
      
      if (teamsInitialized) {
        setIsInTeams(true);
        
        // Get Teams theme
        const theme = await teamsService.getTheme();
        setTeamsTheme(theme);
        
        // Register theme change handler
        teamsService.registerThemeChangeHandler((theme) => {
          setTeamsTheme(theme);
          applyTeamsTheme(theme);
        });
        
        // Apply initial theme
        applyTeamsTheme(theme);
        
        console.log('App running in Microsoft Teams');
      } else {
        console.log('App running outside of Teams');
      }
    } catch (error) {
      console.log('Teams SDK not available, running as standalone app');
    } finally {
      setIsLoading(false);
    }
  };

  const applyTeamsTheme = (theme) => {
    // Apply Teams theme to the document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#1f2937'; // Teams dark background
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f3f4f6'; // Teams light background
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`teams-wrapper ${isInTeams ? 'teams-mode' : 'standalone-mode'}`}>
      {/* Teams-specific header when in Teams */}
      {isInTeams && (
        <div className="teams-header bg-blue-600 text-white px-4 py-2 text-sm font-medium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span>Running in Microsoft Teams</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs opacity-75">
                {teamsTheme === 'dark' ? 'Dark Theme' : 'Light Theme'}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Main app content */}
      <div className={isInTeams ? 'teams-content' : ''}>
        {children}
      </div>
      
      {/* Teams-specific styles */}
      <style jsx>{`
        .teams-wrapper.teams-mode {
          height: 100vh;
          overflow: hidden;
        }
        
        .teams-header {
          position: sticky;
          top: 0;
          z-index: 50;
        }
        
        .teams-content {
          height: calc(100vh - 48px);
          overflow-y: auto;
        }
        
        /* Teams-specific adjustments */
        .teams-mode .teams-content {
          padding: 0;
        }
        
        .teams-mode .teams-content .p-4 {
          padding: 1rem;
        }
        
        .teams-mode .teams-content .lg\\:p-6 {
          padding: 1.5rem;
        }
        
        /* Adjust for Teams sidebar */
        @media (max-width: 768px) {
          .teams-mode .teams-content {
            padding: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
} 