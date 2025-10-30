import { microsoftDataService } from './microsoftDataService';
import React, { useState, useEffect, useRef } from 'react';
import Dashboard from './Dashboard';
import AddTasks from './AddTasks';
import { parse, isValid, format } from 'date-fns';
import CalendarView from './CalendarView';
import GanttChart from './GanttChart';
import SettingsPage from './SettingsPage';
import BulkActions from './BulkActions';
import DataManagement from './DataManagement';
import UserManagement from './UserManagement';
import Messages from './Messages';
import UserMenu from './UserMenu';
import DocumentLinkModal from './DocumentLinkModal';
import ChecklistsAndForms from './ChecklistsAndForms';
import { microsoftDataService, subscribeToData } from './microsoftDataService';
import { authService, getDepartmentFromResponsibleParty, ROLES, DEPARTMENTS, DEPARTMENT_NAMES, hasPermission, getUsersByDepartment, isUserInDepartment, updateUserDepartments, inviteUser } from './microsoftAuthService';
import notificationService from './notificationService';
import IntegrationSetup from './IntegrationSetup';
import { sharePointService } from './graphService';
import themeService from './themeService';
import { getCurrentConfig, isTestEnvironment } from './microsoftOnlyConfig';

// PWA Installation Prompt Component
function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkIfInstalled = () => {
      return window.matchMedia('(display-mode: standalone)').matches ||
             window.navigator.standalone === true ||
             document.referrer.includes('android-app://');
    };

    const checkIOS = () => {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    };

    setIsStandalone(checkIfInstalled());
    setIsIOS(checkIOS());

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleIOSInstall = () => {
    setShowInstallPrompt(false);
  };

  if (!showInstallPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Install C&C Project Manager
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isIOS ? 'Add to home screen for quick access' : 'Install app for better experience'}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            {isIOS ? (
              <button
                onClick={handleIOSInstall}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Got it
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowInstallPrompt(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Not now
                </button>
                <button
                  onClick={handleInstall}
                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  Install
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Auth Context Provider
const AuthContext = React.createContext();

export function useAuth() {
  return React.useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = authService.subscribe((authState) => {
      setUser(authState.user);
      setUserProfile(authState.userProfile);
      setLoading(authState.loading);
    });

    return unsubscribe;
  }, []);

  const signIn = async () => {
    return await authService.signIn();
  };

  const signOut = async () => {
    return await authService.microsoftDataService.);
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

// Auth Gate Component
function AuthGate({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              C&C Project Manager
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Sign in with your Microsoft 365 account to access the application
            </p>
            {isTestEnvironment() && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                <strong>Test Environment:</strong> You're currently using the test Microsoft 365 environment.
              </div>
            )}
            <button
              onClick={async () => {
                try {
                  await authService.signIn();
                } catch (error) {
                  console.error('Sign in error:', error);
                }
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign in with Microsoft 365
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

function App() {
  const { 
    userProfile, 
    hasPermission, 
    ROLES, 
    DEPARTMENTS, 
    DEPARTMENT_NAMES,
    isUserInDepartment,
    getUsersByDepartment 
  } = useAuth();
  
  const [tasks, setTasks] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [users, setUsers] = useState([]);
  const [aliases, setAliases] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [editingNotes, setEditingNotes] = useState(null);
  const [editingDocumentLink, setEditingDocumentLink] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showTeamsConfig, setShowTeamsConfig] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [sortBy, setSortBy] = useState('deadline');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterProject, setFilterProject] = useState('');
  const [filterResponsibleParty, setFilterResponsibleParty] = useState('');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterDeadlineYear, setFilterDeadlineYear] = useState('');
  const [filterDeadlineMonth, setFilterDeadlineMonth] = useState('');
  const [filterDeadlineDay, setFilterDeadlineDay] = useState('');
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [linkedTaskId, setLinkedTaskId] = useState(null);
  const [showLinkedTaskModal, setShowLinkedTaskModal] = useState(false);
  const [documentLinkModal, setDocumentLinkModal] = useState({ show: false, task: null });
  const [showIntegrationSetup, setShowIntegrationSetup] = useState(false);
  const [sharePointListsExist, setSharePointListsExist] = useState(false);
  
  // Legacy state variables for compatibility
  const [sortOption, setSortOption] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewDeadlinesOpen, setViewDeadlinesOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [selectedChecklistFromTask, setSelectedChecklistFromTask] = useState(null);
  const [filterYear, setFilterYear] = useState('');
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [notesTaskId, setNotesTaskId] = useState(null);
  const [notesTaskOriginalId, setNotesTaskOriginalId] = useState(null);
  const [notesText, setNotesText] = useState('');
  const [departmentMappings, setDepartmentMappings] = useState([]);

  // Microsoft 365 data subscriptions (replaces Firebase onSnapshot)
  useEffect(() => {
    if (!userProfile) return;

    console.log('Setting up Microsoft 365 data subscriptions...');
    console.log('Environment:', isTestEnvironment() ? 'Test' : 'Enterprise');

    // Subscribe to tasks
    const unsubscribeTasks = subscribeToData('tasks', (tasksData) => {
      console.log('Tasks updated:', tasksData.length);
      setTasks(tasksData);
    });

    // Subscribe to users
    const unsubscribeUsers = subscribeToData('users', (usersData) => {
      console.log('Users updated:', usersData.length);
      setUsers(usersData);
    });

    // Subscribe to aliases
    const unsubscribeAliases = subscribeToData('aliases', (aliasesData) => {
      console.log('Aliases updated:', aliasesData.length);
      setAliases(aliasesData);
    });

    // Subscribe to department mappings
    const unsubscribeMappings = subscribeToData('departmentMappings', (mappingsData) => {
      console.log('Department mappings updated:', mappingsData.length);
      setDepartmentMappings(mappingsData);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeUsers();
      unsubscribeAliases();
      unsubscribeMappings();
    };
  }, [userProfile]);

  // Check if SharePoint setup is already complete
  useEffect(() => {
    const setupComplete = localStorage.getItem('sharePointSetupComplete');
    if (setupComplete) {
      console.log('SharePoint setup already complete, skipping integration setup');
      setShowIntegrationSetup(false);
      setSharePointListsExist(true);
      return;
    }
  }, []);

  // Check if SharePoint lists exist and show integration setup if needed
  useEffect(() => {
    const checkSharePointLists = async () => {
      // First check if setup is already complete
      const setupComplete = localStorage.getItem('sharePointSetupComplete');
      if (setupComplete) {
        console.log('SharePoint setup already complete, skipping integration setup');
        setShowIntegrationSetup(false);
        setSharePointListsExist(true);
        return;
      }
      
      try {
        const lists = await sharePointService.getLists();
        const requiredLists = ['Tasks', 'Users', 'ChecklistTemplates', 'Checklists', 'Messages', 'DepartmentMappings', 'NameAliases', 'Invites'];
        const existingListNames = lists.map(list => list.displayName);
        const missingLists = requiredLists.filter(name => !existingListNames.includes(name));
        
        if (missingLists.length > 0) {
          setShowIntegrationSetup(true);
          setSharePointListsExist(false);
        } else {
          setSharePointListsExist(true);
          setShowIntegrationSetup(false);
        }
      } catch (error) {
        console.error('Error checking SharePoint lists:', error);
        // If there's an error, assume lists don't exist and show setup
        setShowIntegrationSetup(true);
        setSharePointListsExist(false);
      }
    };
    
    if (userProfile) {
      checkSharePointLists();
    }
  }, [userProfile]);

  const handleAddTask = async (newTask) => {
    console.log('Adding task with userProfile:', userProfile);
    console.log('OrganizationId:', userProfile?.organizationId);
    console.log('New task:', newTask);
    
    // Auto-detect department based on responsible party
    const autoDepartment = getDepartmentFromResponsibleParty(newTask.responsibleParty, departmentMappings, users, aliases);
    
    const taskData = {
      ...newTask,
      department: autoDepartment,
      createdBy: userProfile?.email || 'Unknown',
      createdDate: new Date().toISOString(),
      modifiedBy: userProfile?.email || 'Unknown',
      modifiedDate: new Date().toISOString()
    };

    try {
      await microsoftDataService.tasks.add(taskData);
      console.log('Task added successfully');
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    console.log('Updating task:', taskId, updates);
    
    const updateData = {
      ...updates,
      modifiedBy: userProfile?.email || 'Unknown',
      modifiedDate: new Date().toISOString()
    };

    try {
      await microsoftDataService.tasks.update(taskId, updateData);
      console.log('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const handleDeleteTask = async (taskId) => {
    console.log('Deleting task:', taskId);
    
    try {
      await microsoftDataService.tasks.delete(taskId);
      console.log('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  // Show integration setup if SharePoint lists don't exist
  if (showIntegrationSetup) {
    return <IntegrationSetup />;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Environment Indicator */}
      {isTestEnvironment() && (
        <div className="bg-yellow-100 border-b border-yellow-400 text-yellow-700 px-4 py-2 text-center text-sm">
          <strong>Test Environment:</strong> You're currently using the test Microsoft 365 environment. 
          This is safe for testing and won't affect your enterprise data.
        </div>
      )}

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <h1 className="text-lg font-bold text-theme-primary-dark">C&C Project Manager</h1>
        <div className="flex items-center gap-2">
          <UserMenu />
          <button 
            onClick={() => setViewDeadlinesOpen(!viewDeadlinesOpen)}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:flex-col lg:w-64 lg:bg-white lg:border-r lg:border-gray-200 dark:lg:bg-gray-800 dark:lg:border-gray-700">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <h1 className="text-xl font-bold text-theme-primary-dark">C&C Project Manager</h1>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-theme-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'tasks'
                    ? 'bg-theme-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Tasks
              </button>
              <button
                onClick={() => setActiveTab('calendar')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'calendar'
                    ? 'bg-theme-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setActiveTab('gantt')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'gantt'
                    ? 'bg-theme-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Gantt Chart
              </button>
              <button
                onClick={() => setActiveTab('checklists')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'checklists'
                    ? 'bg-theme-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Checklists & Forms
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'messages'
                    ? 'bg-theme-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Messages
              </button>
              <button
                onClick={() => setActiveTab('data')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'data'
                    ? 'bg-theme-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Data Management
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'users'
                    ? 'bg-theme-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                User Management
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-theme-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-700 p-4">
            <UserMenu />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {activeTab === 'dashboard' && (
                  <Dashboard 
                    tasks={tasks}
                    users={users}
                    departmentMappings={departmentMappings}
                    onToggleCompleted={handleUpdateTask}
                    onTaskLinkClick={(taskId) => setLinkedTaskId(taskId)}
                    aliases={aliases}
                  />
                )}
                {activeTab === 'tasks' && (
                  <AddTasks 
                    onAddTask={handleAddTask}
                    tasks={tasks}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                  />
                )}
                {activeTab === 'calendar' && (
                  <CalendarView 
                    tasks={tasks}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                  />
                )}
                {activeTab === 'gantt' && (
                  <GanttChart 
                    tasks={tasks}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                  />
                )}
                {activeTab === 'checklists' && (
                  <ChecklistsAndForms 
                    tasks={tasks}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                  />
                )}
                {activeTab === 'messages' && (
                  <Messages />
                )}
                {activeTab === 'data' && (
                  <DataManagement 
                    users={users}
                    aliases={aliases}
                    departmentMappings={departmentMappings}
                  />
                )}
                {activeTab === 'users' && (
                  <UserManagement 
                    DEPARTMENTS={DEPARTMENTS}
                    updateUserDepartments={updateUserDepartments}
                  />
                )}
                {activeTab === 'settings' && (
                  <SettingsPage />
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Document Link Modal */}
      {documentLinkModal.show && (
        <DocumentLinkModal
          task={documentLinkModal.task}
          onClose={() => setDocumentLinkModal({ show: false, task: null })}
          onSave={(taskId, documentLink) => {
            handleUpdateTask(taskId, { documentLink });
            setDocumentLinkModal({ show: false, task: null });
          }}
        />
      )}
    </div>
  );
}

function AppWithAuth() {
  return (
    <AuthProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </AuthProvider>
  );
}

export default AppWithAuth;
