import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import Database from './Database';
import UsersPage from './UsersPage';
import DataPage from './DataPage';
import SettingsPage from './SettingsPage';
import ComingSoon from './ComingSoon';
import UserMenu from './UserMenu';
import SortDeadlinesPage from './SortDeadlinesPage';
import GanttDeadlinesPage from './GanttDeadlinesPage';
import CalendarDeadlinesPage from './CalendarDeadlinesPage';
import ExitConfirmationPopup from './ExitConfirmationPopup';
import { useAuth } from './Auth';
import { globalTaskStore } from './globalTaskStore';
import { microsoftDataService } from './microsoftDataService';
import { azureTaskService } from './services/azureTaskService';

function App() {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [deadlinesSubTab, setDeadlinesSubTab] = useState('sort');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDeadlinesDropdownOpen, setIsDeadlinesDropdownOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [dropdownCloseTimeout, setDropdownCloseTimeout] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Handle dropdown hover with delay
  const handleDropdownMouseEnter = () => {
    if (dropdownCloseTimeout) {
      clearTimeout(dropdownCloseTimeout);
      setDropdownCloseTimeout(null);
    }
  };

  const handleDropdownMouseLeave = () => {
    const timeout = setTimeout(() => {
      setIsDeadlinesDropdownOpen(false);
    }, 200);
    setDropdownCloseTimeout(timeout);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dropdownCloseTimeout) {
        clearTimeout(dropdownCloseTimeout);
      }
    };
  }, [dropdownCloseTimeout]);

  // Handle exit confirmation
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle exit confirmation popup
  const handleExitConfirm = () => {
    setShowExitConfirmation(false);
    setHasUnsavedChanges(false);
    // Allow the user to leave
    window.location.href = 'about:blank';
  };

  const handleExitCancel = () => {
    setShowExitConfirmation(false);
  };

  // Load tasks from Azure Functions API
  useEffect(() => {
    const loadAllData = async () => {
      if (userProfile) {
        try {
          globalTaskStore.setLoading(true);
          console.log('App: Loading all data from Azure Functions API...');
          
          // Initialize Azure service
          await azureTaskService.initialize();
          
          // Load all tasks from Azure Functions API
          const allTasks = await azureTaskService.loadAllTasks();
          console.log('App: Loaded', allTasks.length, 'tasks from Azure Functions API');
          
          // Set tasks in global store
          globalTaskStore.setAllTasks(allTasks);
          console.log('App: Global store populated with', allTasks.length, 'tasks');

          // Auto-clean duplicates first
          console.log('App: Auto-cleaning duplicates...');
          const duplicatesRemoved = globalTaskStore.removeDuplicates();
          if (duplicatesRemoved.length > 0) {
            console.log('App: Auto-removed', duplicatesRemoved.length, 'duplicates');
          } else {
            console.log('App: No duplicates found');
          }
          
          console.log('App: Data loading completed successfully');
          
        } catch (error) {
          console.error('App: Error loading data:', error);
        } finally {
          globalTaskStore.setLoading(false);
        }
      }
    };

    loadAllData();
  }, [userProfile]);

  // Load users for Dashboard
  useEffect(() => {
    const loadUsers = async () => {
      if (userProfile) {
        try {
          const usersData = await microsoftDataService.users.getEnterpriseUsers();
          
          // Load local assignments from localStorage
          const USER_ASSIGNMENTS_KEY = 'user_assignments';
          const localAssignments = JSON.parse(localStorage.getItem(USER_ASSIGNMENTS_KEY) || '{}');
          
          // Merge enterprise users with local assignments
          const usersWithAssignments = usersData.map(user => ({
            ...user,
            departments: localAssignments[user.id]?.departments || [],
            role: localAssignments[user.id]?.role || 'VIEWER'
          }));
          
          console.log('App: Loaded users with assignments:', {
            usersCount: usersWithAssignments.length,
            localAssignments: localAssignments,
            usersWithAssignments: usersWithAssignments
          });
          
          setUsers(usersWithAssignments);
        } catch (error) {
          console.error('Error loading users:', error);
        }
      }
    };

    loadUsers();
  }, [userProfile]);

  if (!userProfile) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <h1 className="text-lg font-bold text-theme-primary-dark">C&C Project Manager</h1>
        <div className="flex items-center gap-2">
          <UserMenu />
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-gray-100 shadow-sm">
          <div className="flex flex-col p-2 gap-1">
            <button 
              onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} 
              className={`w-full px-4 py-3 rounded-lg text-left font-medium ${activeTab === 'dashboard' ? 'bg-theme-primary text-white' : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
            >
              Dashboard
            </button>
            <div 
              className="relative"
              onMouseEnter={handleDropdownMouseEnter}
              onMouseLeave={handleDropdownMouseLeave}
            >
              <button 
                onClick={() => { 
                  setIsMobileMenuOpen(false);
                  setIsDeadlinesDropdownOpen(!isDeadlinesDropdownOpen);
                }} 
                className={`w-full px-4 py-3 rounded-lg text-left font-medium flex items-center justify-between ${activeTab === 'deadlines' ? 'bg-theme-primary text-white' : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
              >
                Deadlines
                <svg className={`w-4 h-4 transition-transform ${isDeadlinesDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isDeadlinesDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                  <button 
                    onClick={() => { 
                      setActiveTab('deadlines'); 
                      setDeadlinesSubTab('sort'); 
                      setIsMobileMenuOpen(false);
                      setIsDeadlinesDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm ${activeTab === 'deadlines' && deadlinesSubTab === 'sort' ? 'bg-theme-primary text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    Sort Deadlines
                  </button>
                  <button 
                    onClick={() => { 
                      setActiveTab('deadlines'); 
                      setDeadlinesSubTab('calendar'); 
                      setIsMobileMenuOpen(false);
                      setIsDeadlinesDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm ${activeTab === 'deadlines' && deadlinesSubTab === 'calendar' ? 'bg-theme-primary text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    Calendar View
                  </button>
                  <button 
                    onClick={() => { 
                      setActiveTab('deadlines'); 
                      setDeadlinesSubTab('gantt'); 
                      setIsMobileMenuOpen(false);
                      setIsDeadlinesDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm ${activeTab === 'deadlines' && deadlinesSubTab === 'gantt' ? 'bg-theme-primary text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    Gantt Chart
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={() => { setActiveTab('database'); setIsMobileMenuOpen(false); }} 
              className={`w-full px-4 py-3 rounded-lg text-left font-medium ${activeTab === 'database' ? 'bg-theme-primary text-white' : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
            >
              Database
            </button>
            <button 
              onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }} 
              className={`w-full px-4 py-3 rounded-lg text-left font-medium ${activeTab === 'users' ? 'bg-theme-primary text-white' : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
            >
              Users
            </button>
            <button 
              onClick={() => { setActiveTab('data'); setIsMobileMenuOpen(false); }} 
              className={`w-full px-4 py-3 rounded-lg text-left font-medium ${activeTab === 'data' ? 'bg-theme-primary text-white' : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
            >
              Data
            </button>
            <button 
              onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} 
              className={`w-full px-4 py-3 rounded-lg text-left font-medium ${activeTab === 'settings' ? 'bg-theme-primary text-white' : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
            >
              Settings
            </button>
          </div>
        </div>
      )}

      {/* Desktop Header */}
      <div className="hidden lg:flex items-center justify-between px-4 py-4 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <h1 className="text-xl font-bold text-theme-primary-dark">C&C Project Manager</h1>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'dashboard' ? 'bg-theme-primary text-white' : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
            >
              Dashboard
            </button>
            <div 
              className="relative"
              onMouseEnter={handleDropdownMouseEnter}
              onMouseLeave={handleDropdownMouseLeave}
            >
              <button 
                onClick={() => { 
                  setIsDeadlinesDropdownOpen(!isDeadlinesDropdownOpen);
                }} 
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${activeTab === 'deadlines' ? 'bg-theme-primary text-white' : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
              >
                Deadlines
                <svg className={`w-4 h-4 transition-transform ${isDeadlinesDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isDeadlinesDropdownOpen && (
                <div className="absolute left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-[160px]">
                  <button 
                    onClick={() => { 
                      setActiveTab('deadlines'); 
                      setDeadlinesSubTab('sort'); 
                      setIsDeadlinesDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm ${activeTab === 'deadlines' && deadlinesSubTab === 'sort' ? 'bg-theme-primary text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    Sort Deadlines
                  </button>
                  <button 
                    onClick={() => { 
                      setActiveTab('deadlines'); 
                      setDeadlinesSubTab('calendar'); 
                      setIsDeadlinesDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm ${activeTab === 'deadlines' && deadlinesSubTab === 'calendar' ? 'bg-theme-primary text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    Calendar View
                  </button>
                  <button 
                    onClick={() => { 
                      setActiveTab('deadlines'); 
                      setDeadlinesSubTab('gantt'); 
                      setIsDeadlinesDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm ${activeTab === 'deadlines' && deadlinesSubTab === 'gantt' ? 'bg-theme-primary text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    Gantt Chart
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={() => setActiveTab('database')} 
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'database' ? 'bg-theme-primary text-white' : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
            >
              Database
            </button>
            <button 
              onClick={() => setActiveTab('users')} 
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'users' ? 'bg-theme-primary text-white' : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
            >
              Users
            </button>
            <button 
              onClick={() => setActiveTab('data')} 
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'data' ? 'bg-theme-primary text-white' : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
            >
              Data
            </button>
            <button 
              onClick={() => setActiveTab('settings')} 
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'settings' ? 'bg-theme-primary text-white' : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
            >
              Settings
            </button>
          </div>
          <UserMenu />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' && <Dashboard users={users} />}
        {activeTab === 'deadlines' && (
          <>
            {deadlinesSubTab === 'sort' && <SortDeadlinesPage />}
            {deadlinesSubTab === 'calendar' && <CalendarDeadlinesPage />}
            {deadlinesSubTab === 'gantt' && <GanttDeadlinesPage />}
          </>
        )}
        {activeTab === 'users' && <UsersPage />}
        {activeTab === 'data' && <DataPage />}
        {activeTab === 'database' && <Database />}
        {activeTab === 'settings' && <SettingsPage />}
      </div>
      
      {/* Sync Loading Popup removed */}
      
      {/* Exit Confirmation Popup */}
      <ExitConfirmationPopup 
        isVisible={showExitConfirmation}
        onConfirm={handleExitConfirm}
        onCancel={handleExitCancel}
        message="You have unsaved changes. Are you sure you want to leave?"
      />
    </div>
  );
}

export default App;