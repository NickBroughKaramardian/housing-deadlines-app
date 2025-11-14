import React, { useState, useEffect } from 'react';
import { useAuth } from './Auth';
import themeService from './themeService';

function SettingsPage() {
  const { user, userProfile } = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Theme and dark mode state
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Department filter state
  const [departmentFilterEnabled, setDepartmentFilterEnabled] = useState(false);

  // Load current theme settings
  useEffect(() => {
    const loadThemeSettings = () => {
      try {
        const currentTheme = themeService.getCurrentTheme();
        const isDark = themeService.getDarkMode();
        setIsDarkMode(isDark);
      } catch (err) {
        console.error('Error loading theme settings:', err);
      }
    };

    loadThemeSettings();

    // Listen for theme changes
    const handler = () => loadThemeSettings();
    window.addEventListener('themeChanged', handler);
    return () => window.removeEventListener('themeChanged', handler);
  }, []);

  // Load department filter setting
  useEffect(() => {
    const loadDepartmentFilterSetting = () => {
      try {
        const saved = localStorage.getItem('departmentFilterEnabled');
        setDepartmentFilterEnabled(saved === 'true');
      } catch (err) {
        console.error('Error loading department filter setting:', err);
      }
    };

    loadDepartmentFilterSetting();
  }, []);

  // Handle dark mode toggle
  const handleDarkModeToggle = () => {
    try {
      themeService.toggleDarkMode();
      setIsDarkMode(!isDarkMode);
      setMessage('Theme updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error toggling dark mode:', err);
      setError('Failed to update theme. Please try again.');
      setTimeout(() => setError(''), 5000);
    }
  };

  // Handle department filter toggle
  const handleDepartmentFilterToggle = () => {
    try {
      const newValue = !departmentFilterEnabled;
      localStorage.setItem('departmentFilterEnabled', String(newValue));
      setDepartmentFilterEnabled(newValue);
      
      // Dispatch event to notify other pages
      window.dispatchEvent(new CustomEvent('departmentFilterSettingChanged', {
        detail: { enabled: newValue }
      }));
      
      setMessage('Department filter setting updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error toggling department filter:', err);
      setError('Failed to update department filter setting. Please try again.');
      setTimeout(() => setError(''), 5000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 lg:p-8">
      <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-3">
        <svg className="w-8 h-8 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Settings
      </h2>

      {message && (
        <div className="mb-6 p-4 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded-lg border border-green-200 dark:border-green-800">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {/* Dark Mode Toggle */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            Dark Mode
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-700 dark:text-gray-300 font-medium">Enable Dark Mode</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Switch between light and dark themes</p>
            </div>
            <button
              onClick={handleDarkModeToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 ${
                isDarkMode ? 'bg-theme-primary' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  isDarkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Department Filter Toggle */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Department Filter
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-700 dark:text-gray-300 font-medium">Show Only My Department</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Filter deadlines to show only tasks in your department (Dashboard, Sort Deadlines, Calendar, and Gantt pages only)</p>
            </div>
            <button
              onClick={handleDepartmentFilterToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 ${
                departmentFilterEnabled ? 'bg-theme-primary' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  departmentFilterEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
        
        {/* Version Number - Subtle display at bottom */}
        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Version v3.1.32
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
