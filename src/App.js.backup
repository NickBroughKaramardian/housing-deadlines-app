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
import { db } from './firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { useAuth, getDepartmentFromResponsibleParty } from './Auth';
import notificationService from './notificationService';
import themeService from './themeService';

// PWA Installation Prompt Component
function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkIfInstalled = () => {
      return window.matchMedia('(display-mode: standalone)').matches ||
             window.navigator.standalone === true ||
             document.referrer.includes('android-app://');
    };

    // Check if iOS
    const checkIOS = () => {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    };

    setIsStandalone(checkIfInstalled());
    setIsIOS(checkIOS());

    // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Show manual install prompt for iOS after a delay
    if (checkIOS() && !checkIfInstalled()) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
  };

  const handleManualInstall = () => {
    if (isIOS) {
      // Show iOS instructions
      alert('To install this app:\n\n1. Tap the Share button (square with arrow)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm');
    } else {
      // Show general instructions
      alert('To install this app:\n\n1. Look for the install icon in your browser\'s address bar\n2. Or go to your browser\'s menu and look for "Install" or "Add to Home Screen"\n3. Follow the prompts to install');
    }
    setShowInstallPrompt(false);
  };

  // Don't show if already installed or no prompt available
  if (isStandalone || (!showInstallPrompt && !isIOS)) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 p-4 z-50">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <img src="/CC_App_Icon.svg" alt="App Icon" className="w-12 h-12" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Install C&C Project Manager</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {isIOS 
              ? "Add this app to your home screen for quick access"
              : "Install this app for quick access and offline use"
            }
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        {deferredPrompt ? (
          <button
            onClick={handleInstallClick}
            className="flex-1 px-3 py-2 bg-theme-primary text-white text-sm font-medium rounded-md hover:bg-theme-primary-hover transition-colors"
          >
            Install
          </button>
        ) : (
          <button
            onClick={handleManualInstall}
            className="flex-1 px-3 py-2 bg-theme-primary text-white text-sm font-medium rounded-md hover:bg-theme-primary-hover transition-colors"
          >
            {isIOS ? "Add to Home Screen" : "Install"}
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="px-3 py-2 text-gray-600 dark:text-gray-400 text-sm font-medium hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
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
  
  // Legacy state variables for compatibility
  const [sortOption, setSortOption] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewDeadlinesOpen, setViewDeadlinesOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [selectedChecklistFromTask, setSelectedChecklistFromTask] = useState(null);
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [editTaskId, setEditTaskId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [taskStatusFilter, setTaskStatusFilter] = useState('active');
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesTaskId, setNotesTaskId] = useState(null);
  const [notesTaskOriginalId, setNotesTaskOriginalId] = useState(null);
  const [notesText, setNotesText] = useState('');
  const [departmentMappings, setDepartmentMappings] = useState([]);

  // Firestore real-time sync with organization filtering
  useEffect(() => {
    console.log('Tasks query effect - userProfile:', userProfile);
    console.log('OrganizationId for filtering:', userProfile?.organizationId);
    
    if (!userProfile?.organizationId) {
      console.log('No organizationId found, skipping tasks query');
      return;
    }
    
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('organizationId', '==', userProfile.organizationId)
    );
    
    console.log('Setting up tasks query with organizationId:', userProfile.organizationId);
    
    const unsub = onSnapshot(tasksQuery, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('Tasks query result:', tasksData.length, 'tasks found');
      console.log('Sample task:', tasksData[0]);
      setTasks(tasksData);
    }, (error) => {
      console.error('Tasks query error:', error);
    });
    
    return unsub;
  }, [userProfile?.organizationId]);

  // Load users for department filtering
  useEffect(() => {
    if (!userProfile?.organizationId) return;
    
    const usersQuery = query(
      collection(db, 'users'),
      where('organizationId', '==', userProfile.organizationId)
    );
    
    const unsub = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    });
    
    return unsub;
  }, [userProfile?.organizationId]);

  // Load name aliases for flexible resolution
  useEffect(() => {
    if (!userProfile?.organizationId) return;

    const aliasesQuery = query(
      collection(db, 'nameAliases'),
      where('organizationId', '==', userProfile.organizationId)
    );

    const unsub = onSnapshot(aliasesQuery, (snapshot) => {
      const aliasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAliases(aliasData);
    });

    return unsub;
  }, [userProfile?.organizationId]);

  // Load department mappings for custom department detection
  useEffect(() => {
    if (!userProfile?.organizationId) return;
    
    const mappingsQuery = query(
      collection(db, 'departmentMappings'),
      where('organizationId', '==', userProfile.organizationId)
    );
    
    const unsub = onSnapshot(mappingsQuery, (snapshot) => {
      const mappingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDepartmentMappings(mappingsData);
    });
    
    return unsub;
  }, [userProfile?.organizationId]);

  // Initialize notification service
  useEffect(() => {
    if (userProfile) {
      // Set up notification service with tasks callback
      notificationService.setTasksCallback(() => tasks);
      
      // Initialize notifications
      const initialized = notificationService.init();
      
      if (initialized) {
        console.log('Notification service initialized');
      }
      
      // Listen for notification clicks
      const handleNotificationClick = (event) => {
        const { taskId, projectName } = event.detail;
        // Navigate to the task or filter by project
        setSortOption('Project');
        setFilterValue(projectName || '');
        setActiveTab('sort');
      };
      
      window.addEventListener('notificationClick', handleNotificationClick);
      
      return () => {
        window.removeEventListener('notificationClick', handleNotificationClick);
        notificationService.destroy();
      };
    }
  }, [userProfile, tasks]);

  // Initialize theme service
  useEffect(() => {
    // Listen for theme changes
    const handleThemeChange = (event) => {
      console.log('Theme changed to:', event.detail.theme);
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
    };
  }, []);

  useEffect(() => {
    if (!userProfile?.organizationId) return;
    
    const overridesQuery = query(
      collection(db, 'taskOverrides'),
      where('organizationId', '==', userProfile.organizationId)
    );
    
    const unsub = onSnapshot(overridesQuery, (snapshot) => {
      setOverrides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsub;
  }, [userProfile?.organizationId]);

  const handleAddTask = async (newTask) => {
    console.log('Adding task with userProfile:', userProfile);
    console.log('OrganizationId:', userProfile?.organizationId);
    console.log('New task:', newTask);
    
    // Auto-detect department based on responsible party
    const autoDepartment = getDepartmentFromResponsibleParty(newTask.responsibleParty, departmentMappings, users, aliases);
    
    const taskWithOrg = {
      ...newTask,
      organizationId: userProfile?.organizationId,
      createdBy: userProfile?.uid,
      createdAt: new Date(),
      autoDepartment: autoDepartment // Add the auto-detected department
    };
    
    console.log('Task with organization and auto department:', taskWithOrg);
    
    try {
      const docRef = await addDoc(collection(db, 'tasks'), taskWithOrg);
      console.log('Task added successfully with ID:', docRef.id);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleUpdateTask = async (updatedTask) => {
    // Auto-detect department based on responsible party if it changed
    const autoDepartment = getDepartmentFromResponsibleParty(updatedTask.responsibleParty, departmentMappings, users, aliases);
    
    // Clean the updatedTask data to remove undefined values
    const cleanUpdatedTask = Object.fromEntries(
      Object.entries({
        ...updatedTask,
        autoDepartment: autoDepartment // Update the auto-detected department
      }).filter(([key, value]) => value !== undefined)
    );
    
    const ref = doc(db, 'tasks', cleanUpdatedTask.id);
    await updateDoc(ref, cleanUpdatedTask);
  };

  const handleDeleteTask = async (id, originalId) => {
    try {
      // First, check if this is a checklist task and get the checklistId
      let checklistId = null;
      if (id.includes('_')) {
        // This is a recurring instance, check if the parent task has a checklistId
        const [parentId, date] = id.split('_');
        const parentTask = tasks.find(t => t.id === parentId);
        if (parentTask && parentTask.checklistId) {
          checklistId = parentTask.checklistId;
        }
      } else {
        // This is a regular task, check if it has a checklistId
        const task = tasks.find(t => t.id === id);
        if (task && task.checklistId) {
          checklistId = task.checklistId;
        }
      }

      // Delete the task
      if (id.includes('_')) {
        const [parentId, date] = id.split('_');
        const existing = overrides.find(o => o.parentId === parentId && o.deadline === date);
        if (existing) {
          await updateDoc(doc(db, 'taskOverrides', existing.id), { deleted: true });
        } else {
          await addDoc(collection(db, 'taskOverrides'), { 
            parentId, 
            deadline: date, 
            deleted: true,
            organizationId: userProfile?.organizationId,
            createdBy: userProfile?.uid,
            createdAt: new Date()
          });
        }
      } else {
        await deleteDoc(doc(db, 'tasks', id));
      }

      // If this was a checklist task, also delete the checklist
      if (checklistId) {
        try {
          await deleteDoc(doc(db, 'checklists', checklistId));
          console.log('Checklist deleted successfully:', checklistId);
        } catch (checklistError) {
          // If checklist doesn't exist, that's okay - it may have been deleted already
          if (checklistError.code === 'not-found') {
            console.log('Checklist was already deleted:', checklistId);
          } else {
            console.error('Error deleting checklist:', checklistError);
          }
          // Don't throw here - the task was already deleted successfully
        }
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  const handleImportTasks = async (importedTasks) => {
    for (const task of importedTasks) {
      // Auto-detect department based on responsible party
      const autoDepartment = getDepartmentFromResponsibleParty(task.responsibleParty, departmentMappings, users, aliases);
      
      const taskWithOrg = {
        ...task,
        organizationId: userProfile?.organizationId,
        createdBy: userProfile?.uid,
        createdAt: new Date(),
        autoDepartment: autoDepartment // Add the auto-detected department
      };
      await addDoc(collection(db, 'tasks'), taskWithOrg);
    }
  };

  const handleRestoreBackup = async (backupTasks) => {
    // Optionally clear all existing tasks first (dangerous!)
    // const querySnapshot = await getDocs(collection(db, 'tasks'));
    // for (const d of querySnapshot.docs) {
    //   await deleteDoc(d.ref);
    // }
    for (const task of backupTasks) {
      // Auto-detect department based on responsible party
      const autoDepartment = getDepartmentFromResponsibleParty(task.responsibleParty, departmentMappings, users, aliases);
      
      const taskWithOrg = {
        ...task,
        organizationId: userProfile?.organizationId,
        createdBy: userProfile?.uid,
        createdAt: new Date(),
        autoDepartment: autoDepartment // Add the auto-detected department
      };
      await addDoc(collection(db, 'tasks'), taskWithOrg);
    }
  };

  const uniqueResponsibleParties = [...new Set(
    tasks.flatMap(task => 
      task.responsibleParty 
        ? task.responsibleParty.split(',').map(p => p.trim()).filter(Boolean)
        : []
    )
  )].sort();
  const uniqueProjectNames = [...new Set(tasks.map(task => task.projectName).filter(Boolean))];

  function parseDeadlineDate(dateStr) {
    if (!dateStr) return null;
    // Try explicit formats with date-fns
    const formats = [
      'yyyy-MM-dd',
      'MM/dd/yyyy',
      'M/d/yy',
      'M/d/yyyy',
      'MM/dd/yy',
    ];
    for (const fmt of formats) {
      const d = parse(dateStr, fmt, new Date());
      if (isValid(d)) return d;
    }
    return null;
  }

  const expandRecurringTasks = (tasks) => {
    let allOccurrences = [];
    const defaultYears = 50;

    tasks.forEach(task => {
      if (task.recurring && task.frequency && task.deadline) {
        const interval = parseInt(task.frequency, 10);
        if (isNaN(interval) || interval < 1) {
          allOccurrences.push({ ...task, instanceId: task.id });
          return;
        }
        const startDate = parseDeadlineDate(task.deadline);
        if (!startDate) {
          allOccurrences.push({ ...task, instanceId: task.id });
          return;
        }
        
        // Handle finalDate instead of finalYear
        let endDate;
        if (task.finalDate) {
          endDate = parseDeadlineDate(task.finalDate);
          if (!endDate) {
            // If finalDate is invalid, use default
            endDate = new Date(startDate.getFullYear() + defaultYears, startDate.getMonth(), startDate.getDate());
          }
        } else {
          // No finalDate specified, use default
          endDate = new Date(startDate.getFullYear() + defaultYears, startDate.getMonth(), startDate.getDate());
        }
        
        let current = new Date(startDate);
        while (current <= endDate) {
          const instanceDate = new Date(current);
          if (instanceDate.getMonth() !== current.getMonth()) {
            instanceDate.setDate(0);
          }
          if (instanceDate > endDate) break;
          const instanceDeadline = instanceDate.toISOString().split('T')[0];
          const override = overrides.find(o => o.parentId === task.id && o.deadline === instanceDeadline);
          if (override) {
            if (!override.deleted) {
              // Merge override fields with parent, override takes precedence
              allOccurrences.push({
                ...task,
                ...override,
                completed: override.completed !== undefined ? override.completed : task.completed,
                important: override.important !== undefined ? override.important : task.important,
                documentLink: override.documentLink !== undefined ? override.documentLink : task.documentLink,
                instanceId: `${task.id}_${instanceDeadline}`,
                originalId: task.id,
                deadline: instanceDeadline,
                recurring: false,
                originalRecurring: true
              });
            }
          } else {
            allOccurrences.push({ 
              ...task, 
              instanceId: `${task.id}_${instanceDeadline}`, 
              originalId: task.id, 
              deadline: instanceDeadline, 
              recurring: false, 
              originalRecurring: true,
              important: task.important || false,
              completed: task.completed || false,
              documentLink: task.documentLink || null
            });
          }
          current.setMonth(current.getMonth() + interval);
        }
      } else {
        allOccurrences.push({ ...task, instanceId: task.id });
      }
    });
    return allOccurrences;
  };

  const getFilteredSortedTasks = () => {
    let expandedTasks = expandRecurringTasks(tasks);
    let filtered = [...expandedTasks];

    if (!sortOption || sortOption === 'Deadline') {
      const trimmedYear = filterYear.trim();
      const trimmedMonth = filterMonth.trim();
      const trimmedDay = filterDay.trim();

      if (trimmedYear) {
        filtered = filtered.filter(task => {
          const d = parseDeadlineDate(task.deadline);
          if (!d) return false;
          return d.getFullYear().toString() === trimmedYear;
        });
      }

      if (trimmedMonth) {
        const monthNames = {
          'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3, 'apr': 4, 'april': 4,
          'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7, 'aug': 8, 'august': 8,
          'sep': 9, 'sept': 9, 'september': 9, 'oct': 10, 'october': 10, 'nov': 11, 'november': 11, 'dec': 12, 'december': 12
        };
        const lowerFilterMonth = trimmedMonth.toLowerCase();
        let monthToFilter = monthNames[lowerFilterMonth];
        if (!monthToFilter) {
          const parsedMonth = parseInt(lowerFilterMonth, 10);
          if (!isNaN(parsedMonth) && parsedMonth > 0 && parsedMonth < 13) {
            monthToFilter = parsedMonth;
          }
        }
        if (monthToFilter) {
          filtered = filtered.filter(task => {
            const d = parseDeadlineDate(task.deadline);
            if (!d) return false;
            return d.getMonth() + 1 === monthToFilter;
          });
        }
      }
      if (trimmedDay) {
        const dayToFilter = parseInt(trimmedDay, 10);
        if(!isNaN(dayToFilter)) {
          filtered = filtered.filter(task => {
            const d = parseDeadlineDate(task.deadline);
            if (!d) return false;
            return d.getDate() === dayToFilter;
          });
        }
      }
    } else if (sortOption === 'Responsible Party') {
      filtered = filtered.filter(task => {
        if (!task.responsibleParty || !filterValue) return false;
        const taskParties = task.responsibleParty.toLowerCase().split(',').map(p => p.trim());
        const filterParty = filterValue.toLowerCase().trim();
        return taskParties.some(party => party === filterParty);
      });
    } else if (sortOption === 'Project') {
      filtered = filtered.filter(task =>
        task.projectName?.toLowerCase() === filterValue.toLowerCase()
      );
    } else if (sortOption === 'Recurring') {
      if (filterValue === 'Recurring') {
        filtered = filtered.filter(task => task.recurring === true || task.originalRecurring === true);
      } else if (filterValue === 'Non-Recurring') {
        filtered = filtered.filter(task => task.recurring !== true && task.originalRecurring !== true);
      }
    } else if (sortOption === 'Search') {
      const searchTerm = filterValue.toLowerCase();
      filtered = filtered.filter(task => {
        const projectMatch = task.projectName?.toLowerCase().includes(searchTerm);
        const descriptionMatch = task.description?.toLowerCase().includes(searchTerm);
        const responsibleMatch = task.responsibleParty?.toLowerCase().includes(searchTerm);
        return projectMatch || descriptionMatch || responsibleMatch;
      });
    }

    // Filter by task status (overdue, active, urgent, completed)
    if (taskStatusFilter !== 'all') {
      const today = new Date();
      filtered = filtered.filter(task => {
        const deadlineDate = parseDeadlineDate(task.deadline);
        if (!deadlineDate) return false;
        
        const daysDiff = Math.ceil((deadlineDate.setHours(0,0,0,0) - today.setHours(0,0,0,0)) / 86400000);
        
        if (taskStatusFilter === 'completed') {
          return task.completed;
        } else if (taskStatusFilter === 'overdue') {
          return !task.completed && daysDiff < 0; // Show all overdue tasks
        } else if (taskStatusFilter === 'active') {
          return !task.completed && daysDiff >= 0;
        } else if (taskStatusFilter === 'urgent') {
          return task.important && !task.completed; // Show urgent tasks that are not completed
        }
        return true;
      });
      
      // No overdue deadline filtering - show all overdue deadlines
    }
    // Note: For "all" tab, we don't apply any overdue filtering - show everything the user can view

    // Filter to only show incomplete tasks if the checkbox is checked (legacy support)
    if (showIncompleteOnly) {
      filtered = filtered.filter(task => !task.completed);
    }

    // Department filtering
    if (userProfile?.departmentFilterEnabled && userProfile?.departments?.length > 0) {
      filtered = filtered.filter(task => {
        if (!task.responsibleParty) return false;
        
        // Get all users in the task's responsible party
        const responsibleParties = task.responsibleParty.toLowerCase().split(',').map(p => p.trim());
        
        // Check if any of the responsible parties are in the user's departments
        return responsibleParties.some(party => {
          const userInParty = users.find(user => 
            user.displayName?.toLowerCase() === party || 
            user.email?.toLowerCase() === party
          );
          
          if (!userInParty) return false;
          
          // Check if the user is in any of the current user's departments
          return userProfile.departments.some(deptId => 
            isUserInDepartment(userInParty, deptId)
          );
        });
      });
    }

    // Always sort by deadline chronologically, invalid/missing dates last
    filtered.sort((a, b) => {
      const da = parseDeadlineDate(a.deadline);
      const db = parseDeadlineDate(b.deadline);
      const ta = da instanceof Date && !isNaN(da) ? da.getTime() : Infinity;
      const tb = db instanceof Date && !isNaN(db) ? db.getTime() : Infinity;
      return ta - tb;
    });
    // Debug: log the sorted deadlines and their parsed dates
    console.log('Sorted tasks:', filtered.map(t => ({ deadline: t.deadline, parsed: parseDeadlineDate(t.deadline) })));
    return filtered;
  };

  const handleEditClick = (task) => {
    // If this is a checklist task, navigate to the checklists page
    if (task.checklistId) {
      setActiveTab('checklists');
      return;
    }
    
    setEditTaskId(task.id);
    setEditForm({
      projectName: task.projectName,
      description: task.description,
      deadline: task.deadline,
      responsibleParty: task.responsibleParty,
      recurring: task.recurring,
      frequency: task.frequency,
      finalDate: task.finalDate || '',
      important: task.important,
      notes: task.notes || '',
      documentLink: task.documentLink || ''
    });
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async () => {
    if (!editTaskId) return;
    
    try {
      // Ensure user profile is loaded
      if (!userProfile) {
        alert('User profile not loaded. Please refresh the page and try again.');
        return;
      }

      // Clean the editForm data to remove undefined values
      const cleanEditForm = Object.fromEntries(
        Object.entries(editForm).filter(([key, value]) => value !== undefined)
      );

      if (editTaskId.includes('_')) {
        // This is a recurring instance, create/update override
        const [parentId, date] = editTaskId.split('_');
        const existing = overrides.find(o => o.parentId === parentId && o.deadline === date);
        
        if (existing) {
          await updateDoc(doc(db, 'taskOverrides', existing.id), { 
            ...cleanEditForm,
            lastModified: new Date()
          });
        } else {
          // Ensure we have the required fields for Firestore rules
          const overrideData = {
            parentId, 
            deadline: date, 
            ...cleanEditForm,
            organizationId: userProfile.organizationId,
            createdBy: userProfile.uid,
            createdAt: new Date(),
            lastModified: new Date()
          };
          
          console.log('Creating task override with data:', overrideData);
          await addDoc(collection(db, 'taskOverrides'), overrideData);
        }
      } else {
        // Normal task
        await handleUpdateTask({ id: editTaskId, ...cleanEditForm });
      }
      
      setEditTaskId(null);
      setEditForm({});
    } catch (error) {
      console.error('Error saving task:', error);
      alert(`Error saving task: ${error.message}. Please check your permissions and try again.`);
    }
  };

  const handleEditCancel = () => {
    setEditTaskId(null);
    setEditForm({});
  };

  const handleToggleNotes = (taskId, originalId, currentNotes) => {
    setNotesTaskId(taskId);
    setNotesTaskOriginalId(originalId);
    setNotesText(currentNotes || '');
    setNotesModalOpen(true);
  };

  const handleSaveNotes = async () => {
    if (!notesTaskId) return;
    
    try {
      // Ensure user profile is loaded
      if (!userProfile) {
        alert('User profile not loaded. Please refresh the page and try again.');
        return;
      }

      if (notesTaskId.includes('_')) {
        // This is a recurring instance, create/update override
        const [parentId, date] = notesTaskId.split('_');
        const existing = overrides.find(o => o.parentId === parentId && o.deadline === date);
        
        if (existing) {
          await updateDoc(doc(db, 'taskOverrides', existing.id), { 
            notes: notesText,
            lastModified: new Date()
          });
        } else {
          await addDoc(collection(db, 'taskOverrides'), { 
            parentId, 
            deadline: date, 
            notes: notesText,
            organizationId: userProfile.organizationId,
            createdBy: userProfile.uid,
            createdAt: new Date(),
            lastModified: new Date()
          });
        }
      } else {
        // Normal task
        await updateDoc(doc(db, 'tasks', notesTaskId), { notes: notesText });
      }
      
      setNotesModalOpen(false);
      setNotesTaskId(null);
      setNotesTaskOriginalId(null);
      setNotesText('');
    } catch (error) {
      console.error('Error saving notes:', error);
      alert(`Error saving notes: ${error.message}. Please try again.`);
    }
  };

  const handleCancelNotes = () => {
    setNotesModalOpen(false);
    setNotesTaskId(null);
    setNotesTaskOriginalId(null);
    setNotesText('');
  };

  // Toggle the 'important' (urgent) status of a task
  const handleToggleUrgent = async (id, originalId) => {
    if (id.includes('_')) {
      // This is a recurring instance, create/update override
      const [parentId, date] = id.split('_');
      const existing = overrides.find(o => o.parentId === parentId && o.deadline === date);
      const parentTask = tasks.find(t => t.id === parentId);
      const currentImportant = existing ? existing.important : (parentTask?.important || false);
      
      if (existing) {
        await updateDoc(doc(db, 'taskOverrides', existing.id), { important: !currentImportant });
      } else {
        await addDoc(collection(db, 'taskOverrides'), { 
          parentId, 
          deadline: date, 
          important: !currentImportant,
          organizationId: userProfile?.organizationId,
          createdBy: userProfile?.uid,
          createdAt: new Date()
        });
      }
    } else {
      // Normal task
      const task = tasks.find(t => t.id === id);
      if (!task) return;
      await updateDoc(doc(db, 'tasks', id), { important: !task.important });
    }
  };

  // Toggle the 'completed' status of a task
  const handleToggleCompleted = async (id, originalId) => {
    if (id.includes('_')) {
      const [parentId, date] = id.split('_');
      const existing = overrides.find(o => o.parentId === parentId && o.deadline === date);
      const parentTask = tasks.find(t => t.id === parentId);
      const currentCompleted = existing ? existing.completed : (parentTask?.completed || false);
      
      if (existing) {
        await updateDoc(doc(db, 'taskOverrides', existing.id), { completed: !currentCompleted });
      } else {
        await addDoc(collection(db, 'taskOverrides'), { 
          parentId, 
          deadline: date, 
          completed: !currentCompleted,
          organizationId: userProfile?.organizationId,
          createdBy: userProfile?.uid,
          createdAt: new Date()
        });
      }
    } else {
      const task = tasks.find(t => t.id === id);
      if (!task) return;
      await updateDoc(doc(db, 'tasks', id), { completed: !task.completed });
    }
  };

  // Handle bulk actions (complete, urgent, delete)
  const handleBulkAction = async (action, selectedIds) => {
    for (const id of selectedIds) {
      if (id.includes('_')) {
        // Recurring instance: operate on override
        const [parentId, date] = id.split('_');
        const existing = overrides.find(o => o.parentId === parentId && o.deadline === date);
        const parentTask = tasks.find(t => t.id === parentId);
        
        if (action === 'complete') {
          const currentCompleted = existing ? existing.completed : (parentTask?.completed || false);
          if (existing) {
            await updateDoc(doc(db, 'taskOverrides', existing.id), { completed: !currentCompleted });
          } else {
            await addDoc(collection(db, 'taskOverrides'), {
              parentId,
              deadline: date,
              completed: !currentCompleted,
              organizationId: userProfile?.organizationId,
              createdBy: userProfile?.uid,
              createdAt: new Date()
            });
          }
        } else if (action === 'urgent') {
          const currentImportant = existing ? existing.important : (parentTask?.important || false);
          if (existing) {
            await updateDoc(doc(db, 'taskOverrides', existing.id), { important: !currentImportant });
          } else {
            await addDoc(collection(db, 'taskOverrides'), {
              parentId,
              deadline: date,
              important: !currentImportant,
              organizationId: userProfile?.organizationId,
              createdBy: userProfile?.uid,
              createdAt: new Date()
            });
          }
        } else if (action === 'delete') {
          if (existing) {
            await updateDoc(doc(db, 'taskOverrides', existing.id), { deleted: true });
          } else {
            await addDoc(collection(db, 'taskOverrides'), {
              parentId,
              deadline: date,
              deleted: true,
              organizationId: userProfile?.organizationId,
              createdBy: userProfile?.uid,
              createdAt: new Date()
            });
          }
        }
      } else {
        // Normal task
        const task = tasks.find(t => t.id === id);
        if (!task) continue;
        if (action === 'complete') {
          await updateDoc(doc(db, 'tasks', id), { completed: !task.completed });
        } else if (action === 'urgent') {
          await updateDoc(doc(db, 'tasks', id), { important: !task.important });
        } else if (action === 'delete') {
          await deleteDoc(doc(db, 'tasks', id));
        }
      }
    }
  };

  // Document link handlers
  const handleDocumentLinkClick = (task) => {
    // If this is a checklist task, navigate to the checklists page and select the specific checklist
    if (task.checklistId) {
      setSelectedChecklistFromTask(task.checklistId);
      setActiveTab('checklists');
      return;
    }
    
    if (task.documentLink) {
      // Check if it's a URL or file path
      if (task.documentLink.startsWith('http://') || task.documentLink.startsWith('https://')) {
        // Open web URLs in new tab
        window.open(task.documentLink, '_blank');
      } else if (task.documentLink.startsWith('file://')) {
        // For file:// URLs, show a message since browsers block local file access
        alert('Local file access is restricted by browser security. Please use the file path directly or open the file manually.');
        console.log('Attempted to open local file:', task.documentLink);
      } else if (task.documentLink.startsWith('\\\\') || task.documentLink.includes(':\\')) {
        // For network paths and local file paths, show instructions
        alert(`File path detected: ${task.documentLink}\n\nTo open this file:\n1. Copy the path above\n2. Open File Explorer\n3. Paste the path in the address bar\n4. Press Enter`);
        console.log('Network/local file path:', task.documentLink);
      } else {
        // For other cases, show the path
        alert(`Document link: ${task.documentLink}\n\nPlease open this file manually.`);
        console.log('Other document link:', task.documentLink);
      }
    } else {
      // Open modal to add document link
      setDocumentLinkModal({ show: true, task });
    }
  };

  const handleSaveDocumentLink = async (taskId, originalId, documentLink) => {
    try {
      // Ensure user profile is loaded
      if (!userProfile) {
        alert('User profile not loaded. Please refresh the page and try again.');
        return;
      }

      if (taskId.includes('_')) {
        // Recurring instance: update or create override
        const [parentId, date] = taskId.split('_');
        const existing = overrides.find(o => o.parentId === parentId && o.deadline === date);
        
        if (existing) {
          await updateDoc(doc(db, 'taskOverrides', existing.id), { 
            documentLink,
            lastModified: new Date()
          });
        } else {
          await addDoc(collection(db, 'taskOverrides'), {
            parentId,
            deadline: date,
            documentLink,
            organizationId: userProfile.organizationId,
            createdBy: userProfile.uid,
            createdAt: new Date(),
            lastModified: new Date()
          });
        }
      } else {
        // Normal task
        await updateDoc(doc(db, 'tasks', taskId), { documentLink });
      }
      setDocumentLinkModal({ show: false, task: null });
    } catch (error) {
      console.error('Error saving document link:', error);
      alert(`Error saving document link: ${error.message}. Please try again.`);
    }
  };

  const handleRemoveDocumentLink = async (taskId, originalId) => {
    try {
      // Ensure user profile is loaded
      if (!userProfile) {
        alert('User profile not loaded. Please refresh the page and try again.');
        return;
      }

      if (taskId.includes('_')) {
        // Recurring instance: update or create override
        const [parentId, date] = taskId.split('_');
        const existing = overrides.find(o => o.parentId === parentId && o.deadline === date);
        
        if (existing) {
          await updateDoc(doc(db, 'taskOverrides', existing.id), { 
            documentLink: null,
            lastModified: new Date()
          });
        } else {
          await addDoc(collection(db, 'taskOverrides'), {
            parentId,
            deadline: date,
            documentLink: null,
            organizationId: userProfile.organizationId,
            createdBy: userProfile.uid,
            createdAt: new Date(),
            lastModified: new Date()
          });
        }
      } else {
        // Normal task
        await updateDoc(doc(db, 'tasks', taskId), { documentLink: null });
      }
    } catch (error) {
      console.error('Error removing document link:', error);
      alert(`Error removing document link: ${error.message}. Please try again.`);
    }
  };

  const filteredTasks = getFilteredSortedTasks();

  // Handler for clicking a task sticker in dashboard messages
  const handleTaskLinkClick = (linkedTaskId) => {
    // Find the task by ID
    const task = tasks.find(t => t.id === linkedTaskId);
    if (task) {
      setSortOption('Project');
      setFilterValue(task.projectName || '');
      setActiveTab('sort');
    }
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Delayed dropdown close timers
  const viewDropdownTimerRef = useRef(null);
  const adminDropdownTimerRef = useRef(null);

  const handleViewDropdownMouseEnter = () => {
    if (viewDropdownTimerRef.current) {
      clearTimeout(viewDropdownTimerRef.current);
      viewDropdownTimerRef.current = null;
    }
  };
  const handleViewDropdownMouseLeave = () => {
    if (viewDropdownTimerRef.current) clearTimeout(viewDropdownTimerRef.current);
    viewDropdownTimerRef.current = setTimeout(() => {
      setViewDeadlinesOpen(false);
    }, 250);
  };
  const handleAdminDropdownMouseEnter = () => {
    if (adminDropdownTimerRef.current) {
      clearTimeout(adminDropdownTimerRef.current);
      adminDropdownTimerRef.current = null;
    }
  };
  const handleAdminDropdownMouseLeave = () => {
    if (adminDropdownTimerRef.current) clearTimeout(adminDropdownTimerRef.current);
    adminDropdownTimerRef.current = setTimeout(() => {
      setAdminMenuOpen(false);
    }, 250);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (viewDeadlinesOpen && !event.target.closest('.view-deadlines-dropdown')) {
        setViewDeadlinesOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [viewDeadlinesOpen]);

  // Close dropdowns on scroll
  useEffect(() => {
    const onScroll = () => {
      if (viewDeadlinesOpen) setViewDeadlinesOpen(false);
      if (adminMenuOpen) setAdminMenuOpen(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [viewDeadlinesOpen, adminMenuOpen]);

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
            <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} className={`w-full px-4 py-3 rounded-lg text-left font-medium ${activeTab === 'dashboard' ? 'bg-theme-primary text-white' : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}>Dashboard</button>
            
            {/* Deadlines Dropdown */}
            <div className="relative view-deadlines-dropdown" onMouseEnter={handleViewDropdownMouseEnter} onMouseLeave={handleViewDropdownMouseLeave}>
              <button 
                onClick={() => setViewDeadlinesOpen(!viewDeadlinesOpen)}
                className={`w-full px-4 py-3 rounded-lg text-left font-medium flex items-center justify-between ${
                  ['calendar', 'gantt', 'sort', 'checklists'].includes(activeTab) 
                    ? 'bg-theme-primary text-white' 
                    : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>Deadlines</span>
                <svg className={`w-4 h-4 transition-transform ${viewDeadlinesOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {viewDeadlinesOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50">
                  <button 
                    onClick={() => { setActiveTab('calendar'); setViewDeadlinesOpen(false); setIsMobileMenuOpen(false); }}
                    className={`w-full px-4 py-2 text-left text-sm ${activeTab === 'calendar' ? 'bg-theme-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                  >
                    Calendar
                  </button>
                  <button 
                    onClick={() => { setActiveTab('gantt'); setViewDeadlinesOpen(false); setIsMobileMenuOpen(false); }}
                    className={`w-full px-4 py-2 text-left text-sm ${activeTab === 'gantt' ? 'bg-theme-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                  >
                    Gantt Chart
                  </button>
                  <button 
                    onClick={() => { setActiveTab('sort'); setViewDeadlinesOpen(false); setIsMobileMenuOpen(false); }}
                    className={`w-full px-4 py-2 text-left text-sm ${activeTab === 'sort' ? 'bg-theme-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                  >
                    Sort Deadlines
                  </button>
                  <button 
                    onClick={() => { setActiveTab('checklists'); setViewDeadlinesOpen(false); setIsMobileMenuOpen(false); }}
                    className={`w-full px-4 py-2 text-left text-sm ${activeTab === 'checklists' ? 'bg-theme-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                  >
                    Checklists and Forms
                  </button>
                </div>
              )}
            </div>
            
            <button onClick={() => { setActiveTab('messages'); setIsMobileMenuOpen(false); }} className={`w-full px-4 py-3 rounded-lg text-left font-medium ${activeTab === 'messages' ? 'bg-theme-primary text-white' : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}>Messages</button>
            
            {/* Admin Dropdown */}
            <div className="relative admin-dropdown" onMouseEnter={handleAdminDropdownMouseEnter} onMouseLeave={handleAdminDropdownMouseLeave}>
              <button 
                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                className={`w-full px-4 py-3 rounded-lg text-left font-medium flex items-center justify-between ${
                  ['data', 'users', 'settings'].includes(activeTab) 
                    ? 'bg-theme-primary text-white' 
                    : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>Admin</span>
                <svg className={`w-4 h-4 transition-transform ${adminMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {adminMenuOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50">
                  {hasPermission(ROLES.ADMIN) && (
                    <button 
                      onClick={() => { setActiveTab('data'); setAdminMenuOpen(false); setIsMobileMenuOpen(false); }}
                      className={`w-full px-4 py-2 text-left text-sm ${activeTab === 'data' ? 'bg-theme-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                    >
                      Data
                    </button>
                  )}
                  {hasPermission(ROLES.ADMIN) && (
                    <button 
                      onClick={() => { setActiveTab('users'); setAdminMenuOpen(false); setIsMobileMenuOpen(false); }}
                      className={`w-full px-4 py-2 text-left text-sm ${activeTab === 'users' ? 'bg-theme-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                    >
                      Users
                    </button>
                  )}
                  <button 
                    onClick={() => { setActiveTab('settings'); setAdminMenuOpen(false); setIsMobileMenuOpen(false); }}
                    className={`w-full px-4 py-2 text-left text-sm ${activeTab === 'settings' ? 'bg-theme-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                  >
                    Settings
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Header */}
      <div className="hidden lg:flex items-center justify-between px-4 py-4 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <h1 className="text-2xl font-bold text-theme-primary-dark">C&C Project Manager</h1>
        <div className="flex items-center gap-4 w-full max-w-7xl mx-auto">
          <div className="flex flex-1 gap-2 w-full">
            <button onClick={() => setActiveTab('dashboard')} className={`flex-1 px-4 py-2 rounded text-center ${activeTab === 'dashboard' ? 'bg-theme-primary text-white' : 'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'}`}>Dashboard</button>
            
            {/* Deadlines Dropdown */}
            <div className="relative view-deadlines-dropdown flex-1" onMouseEnter={handleViewDropdownMouseEnter} onMouseLeave={handleViewDropdownMouseLeave}>
              <button 
                onClick={() => setViewDeadlinesOpen(!viewDeadlinesOpen)}
                className={`w-full px-4 py-2 rounded text-center flex items-center justify-center gap-2 ${
                  ['calendar', 'gantt', 'sort', 'checklists'].includes(activeTab) 
                    ? 'bg-theme-primary text-white' 
                    : 'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'
                }`}
              >
                <span>Deadlines</span>
                <svg className={`w-4 h-4 transition-transform ${viewDeadlinesOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {viewDeadlinesOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50 min-w-[140px]">
                  <button 
                    onClick={() => { setActiveTab('calendar'); setViewDeadlinesOpen(false); }}
                    className={`w-full px-4 py-2 text-left text-sm ${activeTab === 'calendar' ? 'bg-theme-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                  >
                    Calendar
                  </button>
                  <button 
                    onClick={() => { setActiveTab('gantt'); setViewDeadlinesOpen(false); }}
                    className={`w-full px-4 py-2 text-left text-sm ${activeTab === 'gantt' ? 'bg-theme-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                  >
                    Gantt Chart
                  </button>
                  <button 
                    onClick={() => { setActiveTab('sort'); setViewDeadlinesOpen(false); }}
                    className={`w-full px-4 py-2 text-left text-sm ${activeTab === 'sort' ? 'bg-theme-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                  >
                    Sort Deadlines
                  </button>
                  <button 
                    onClick={() => { setActiveTab('checklists'); setViewDeadlinesOpen(false); }}
                    className={`w-full px-4 py-2 text-left text-sm ${activeTab === 'checklists' ? 'bg-theme-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                  >
                    Checklists and Forms
                  </button>
                </div>
              )}
            </div>
            
            {hasPermission(ROLES.EDITOR) && (
              <button onClick={() => setActiveTab('add')} className={`hidden lg:block flex-1 px-4 py-2 rounded text-center ${activeTab === 'add' ? 'bg-theme-primary text-white' : 'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'}`}>Add Tasks</button>
            )}
            <button onClick={() => setActiveTab('messages')} className={`flex-1 px-4 py-2 rounded text-center ${activeTab === 'messages' ? 'bg-theme-primary text-white' : 'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'}`}>Messages</button>
            
            {/* Admin Dropdown */}
            <div className="relative admin-dropdown flex-1" onMouseEnter={handleAdminDropdownMouseEnter} onMouseLeave={handleAdminDropdownMouseLeave}>
              <button 
                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                className={`w-full px-4 py-2 rounded text-center flex items-center justify-center gap-2 ${
                  ['data', 'users', 'settings'].includes(activeTab) 
                    ? 'bg-theme-primary text-white' 
                    : 'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'
                }`}
              >
                <span>Admin</span>
                <svg className={`w-4 h-4 transition-transform ${adminMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {adminMenuOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50 min-w-[140px]">
                  {hasPermission(ROLES.ADMIN) && (
                    <button 
                      onClick={() => { setActiveTab('data'); setAdminMenuOpen(false); }}
                      className={`w-full px-4 py-2 text-left text-sm ${activeTab === 'data' ? 'bg-theme-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                    >
                      Data
                    </button>
                  )}
                  {hasPermission(ROLES.ADMIN) && (
                    <button 
                      onClick={() => { setActiveTab('users'); setAdminMenuOpen(false); }}
                      className={`w-full px-4 py-2 text-left text-sm ${activeTab === 'users' ? 'bg-theme-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                    >
                      Users
                    </button>
                  )}
                  <button 
                    onClick={() => { setActiveTab('settings'); setAdminMenuOpen(false); }}
                    className={`w-full px-4 py-2 text-left text-sm ${activeTab === 'settings' ? 'bg-theme-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                  >
                    Settings
                  </button>
                </div>
              )}
            </div>
          </div>
          <UserMenu />
        </div>
      </div>

      <div className="p-4 lg:p-6 h-full flex-1 min-h-0">
        {activeTab === 'dashboard' && (
          <div className="max-w-6xl mx-auto h-full">
            <Dashboard 
              tasks={expandRecurringTasks(tasks)}
              users={users}
              departmentMappings={departmentMappings}
              onToggleCompleted={handleToggleCompleted}
              onTaskLinkClick={handleTaskLinkClick}
              aliases={aliases}
            />
          </div>
        )}
        
        {activeTab === 'calendar' && (
          <div className="max-w-6xl mx-auto">
            <CalendarView 
              tasks={expandRecurringTasks(tasks)}
              handleEditClick={handleEditClick}
              handleToggleCompleted={handleToggleCompleted}
              handleToggleUrgent={handleToggleUrgent}
              handleDeleteTask={handleDeleteTask}
              handleDocumentLinkClick={handleDocumentLinkClick}
              parseDeadlineDate={parseDeadlineDate}
            />
          </div>
        )}
        
        {activeTab === 'gantt' && (
          <div className="max-w-7xl mx-auto">
            <GanttChart 
              tasks={expandRecurringTasks(tasks)}
              handleEditClick={handleEditClick}
              handleToggleCompleted={handleToggleCompleted}
              handleToggleUrgent={handleToggleUrgent}
              handleDeleteTask={handleDeleteTask}
              handleDocumentLinkClick={handleDocumentLinkClick}
              parseDeadlineDate={parseDeadlineDate}
            />
          </div>
        )}
        
        {activeTab === 'sort' && (
          <>
            {/* Sleek, glassy header */}
            <div className="w-full bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 lg:p-8 mb-8">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-6">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-theme-primary to-theme-primary-hover rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        Sort Deadlines
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Filter and organize your tasks with precision
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modern filter controls */}
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full lg:w-auto">
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent transition-all w-full sm:w-auto min-w-[160px]"
                  >
                    <option value="">Sort by...</option>
                    <option value="Deadline">Deadline</option>
                    <option value="Responsible Party">Responsible Party</option>
                    <option value="Project">Project</option>
                    <option value="Recurring">Recurring</option>
                    <option value="Search">Search</option>
                  </select>

                  {/* Task Status Filter */}
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-700 rounded-xl p-1 shadow-sm border border-gray-200 dark:border-gray-600">
                    <button
                      onClick={() => setTaskStatusFilter('active')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        taskStatusFilter === 'active'
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                      }`}
                    >
                      Active
                    </button>
                    <button
                      onClick={() => setTaskStatusFilter('urgent')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        taskStatusFilter === 'urgent'
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'
                      }`}
                    >
                      Urgent
                    </button>
                    <button
                      onClick={() => setTaskStatusFilter('completed')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        taskStatusFilter === 'completed'
                          ? 'bg-green-500 text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400'
                      }`}
                    >
                      Completed
                    </button>
                    <button
                      onClick={() => setTaskStatusFilter('overdue')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        taskStatusFilter === 'overdue'
                          ? 'bg-red-500 text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'
                      }`}
                    >
                      Overdue
                    </button>
                    <button
                      onClick={() => setTaskStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        taskStatusFilter === 'all'
                          ? 'bg-theme-primary text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                      }`}
                    >
                      All
                    </button>
                  </div>
                  {sortOption === 'Deadline' && (
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      <input
                        type="text"
                        placeholder="Year"
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-full sm:w-20 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Month"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-full sm:w-24 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Day"
                        value={filterDay}
                        onChange={(e) => setFilterDay(e.target.value)}
                        className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-full sm:w-16 text-sm"
                      />
                    </div>
                  )}
                  {sortOption === 'Responsible Party' && (
                    <select
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-full sm:w-auto min-w-[200px]"
                    >
                      <option value="">Select responsible party...</option>
                      {uniqueResponsibleParties.map(party => (
                        <option key={party} value={party}>{party}</option>
                      ))}
                    </select>
                  )}
                  {sortOption === 'Project' && (
                    <select
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-full sm:w-auto min-w-[200px]"
                    >
                      <option value="">Select project...</option>
                      {uniqueProjectNames.map(project => (
                        <option key={project} value={project}>{project}</option>
                      ))}
                    </select>
                  )}
                  {sortOption === 'Recurring' && (
                    <select
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-full sm:w-auto min-w-[200px]"
                    >
                      <option value="">Select type...</option>
                      <option value="Recurring">Recurring</option>
                      <option value="Non-Recurring">Non-Recurring</option>
                    </select>
                  )}
                  {sortOption === 'Search' && (
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      className="px-3 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-full text-sm"
                      autoFocus
                    />
                  )}
                </div>
                <div className="flex justify-end items-center w-full lg:w-auto">
                  {hasPermission(ROLES.EDITOR) && (
                    <BulkActions 
                      tasks={filteredTasks}
                      onBulkAction={handleBulkAction}
                      alignRight
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Sleek task list container */}
            <div className="relative bg-white dark:bg-gray-700 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-600">
              {filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No tasks found</h4>
                  <p className="text-gray-500 dark:text-gray-400 text-center">
                    No tasks match your current filters. Try adjusting your search criteria.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTasks.map(task => {
                  const today = new Date();
                  const deadlineDate = parseDeadlineDate(task.deadline);
                  const completed = !!task.completed;
                  
                  // Calculate days difference
                  let daysDiff = null;
                  if (deadlineDate) {
                    daysDiff = Math.ceil((deadlineDate.setHours(0,0,0,0) - today.setHours(0,0,0,0)) / 86400000);
                  }
                  
                  // Get status configuration
                  const getStatusConfig = () => {
                    if (completed) {
                      return {
                        bg: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
                        border: 'border-green-200 dark:border-green-700',
                        badge: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
                        text: 'text-green-800 dark:text-green-200',
                        icon: 'text-green-600 dark:text-green-400',
                        dateBg: '#10b981',
                        dateColor: '#ffffff',
                        cardBg: '#f0fdf4',
                        cardBorder: '#10b981'
                      };
                    } else if (daysDiff !== null && daysDiff < 0) {
                      return {
                        bg: 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20',
                        border: 'border-red-200 dark:border-red-700',
                        badge: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
                        text: 'text-red-800 dark:text-red-200',
                        icon: 'text-red-600 dark:text-red-400',
                        dateBg: '#ef4444',
                        dateColor: '#ffffff',
                        cardBg: '#fef2f2',
                        cardBorder: '#ef4444'
                      };
                    } else if (daysDiff !== null && daysDiff === 0) {
                      return {
                        bg: 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20',
                        border: 'border-red-200 dark:border-red-700',
                        badge: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
                        text: 'text-red-800 dark:text-red-200',
                        icon: 'text-red-600 dark:text-red-400',
                        dateBg: '#dc2626',
                        dateColor: '#ffffff',
                        cardBg: '#fef2f2',
                        cardBorder: '#dc2626'
                      };
                    } else if (daysDiff !== null && daysDiff <= 3) {
                      return {
                        bg: 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20',
                        border: 'border-orange-200 dark:border-orange-700',
                        badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
                        text: 'text-orange-800 dark:text-orange-200',
                        icon: 'text-orange-600 dark:text-orange-400',
                        dateBg: '#f59e0b',
                        dateColor: '#ffffff',
                        cardBg: '#fffbeb',
                        cardBorder: '#f59e0b'
                      };
                    } else {
                      return {
                        bg: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
                        border: 'border-blue-200 dark:border-blue-700',
                        badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
                        text: 'text-blue-800 dark:text-blue-200',
                        icon: 'text-blue-600 dark:text-blue-400',
                        dateBg: '#3b82f6',
                        dateColor: '#ffffff',
                        cardBg: '#eff6ff',
                        cardBorder: '#3b82f6'
                      };
                    }
                  };
                  
                  const status = getStatusConfig();
                  
                  // Generate due text
                  let dueText = '';
                  if (completed) {
                    dueText = 'COMPLETED';
                  } else if (daysDiff !== null) {
                    if (daysDiff < 0) dueText = `${Math.abs(daysDiff)} day${Math.abs(daysDiff) !== 1 ? 's' : ''} overdue`;
                    else if (daysDiff === 0) dueText = 'Due today';
                    else dueText = `Due in ${daysDiff} day${daysDiff !== 1 ? 's' : ''}`;
                  }
                  
                  return (
                    <div key={task.instanceId} className={`group relative flex overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl dark:shadow-gray-900/20`} style={{
                      background: completed
                        ? `linear-gradient(135deg, #f0fdf4 0%, #dcfce7 30%, #bbf7d0 70%, #10b981 100%)`
                        : (task.important 
                          ? `linear-gradient(135deg, #fffbeb 0%, #fef3c7 30%, #fde68a 70%, #f59e0b 100%)`
                          : (daysDiff !== null && daysDiff < 0
                            ? `linear-gradient(135deg, #fef2f2 0%, #fecaca 30%, #fca5a5 70%, #ef4444 100%)`
                            : (daysDiff !== null && daysDiff === 0
                              ? `linear-gradient(135deg, #fef2f2 0%, #fecaca 30%, #fca5a5 70%, #dc2626 100%)`
                              : (daysDiff !== null && daysDiff <= 3
                                ? `linear-gradient(135deg, #fffbeb 0%, #fed7aa 30%, #fdba74 70%, #f59e0b 100%)`
                                : `linear-gradient(135deg, #eff6ff 0%, #dbeafe 30%, #bfdbfe 70%, #3b82f6 100%)`)))),
                      boxShadow: `0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.3)`,
                      filter: 'var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)'
                    }}>
                      {/* Date Section (Left) - Modern Gradient */}
                      <div className={`relative flex-shrink-0 w-20 rounded-l-xl flex flex-col overflow-hidden`} style={{ 
                        background: completed
                          ? `linear-gradient(135deg, #10b981 0%, #059669 30%, #047857 70%, #065f46 100%)`
                          : (task.important 
                            ? `linear-gradient(135deg, #ea580c 0%, #f97316 30%, #fb923c 70%, #f59e0b 100%)`
                            : (daysDiff !== null && daysDiff < 0
                              ? `linear-gradient(135deg, #ef4444 0%, #dc2626 30%, #b91c1c 70%, #991b1b 100%)`
                              : (daysDiff !== null && daysDiff === 0
                                ? `linear-gradient(135deg, #dc2626 0%, #b91c1c 30%, #991b1b 70%, #7f1d1d 100%)`
                                : (daysDiff !== null && daysDiff <= 3
                                  ? `linear-gradient(135deg, #f59e0b 0%, #d97706 30%, #b45309 70%, #92400e 100%)`
                                  : `linear-gradient(135deg, #3b82f6 0%, #2563eb 30%, #1d4ed8 70%, #1e40af 100%)`)))),
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 2px 0 8px rgba(0,0,0,0.1)'
                      }}>
                        {/* Subtle overlay for depth */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                        
                        {/* Date content */}
                        {deadlineDate && (
                          <div className="relative z-10 flex flex-col items-center justify-center flex-1 p-2 text-center">
                            <div className="text-xs font-bold text-white/95 uppercase tracking-wider mb-1 drop-shadow-sm">
                              {deadlineDate.toLocaleDateString('en-US', { month: 'short' })}
                            </div>
                            <div className="text-2xl font-black text-white leading-none drop-shadow-sm">
                              {deadlineDate.getDate()}
                            </div>
                            <div className="text-xs font-semibold text-white/85 mt-1 drop-shadow-sm">
                              {deadlineDate.getFullYear()}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Info Section (Right) - Modern Design */}
                      <div className={`flex-1 rounded-r-xl relative overflow-hidden`} style={{ 
                        background: completed
                          ? `linear-gradient(135deg, #f0fdf4 0%, #dcfce7 30%, #bbf7d0 70%, #10b981 100%)`
                          : (task.important 
                            ? `linear-gradient(135deg, #fffbeb 0%, #fef3c7 30%, #fde68a 70%, #f59e0b 100%)`
                            : (daysDiff !== null && daysDiff < 0
                              ? `linear-gradient(135deg, #fef2f2 0%, #fecaca 30%, #fca5a5 70%, #ef4444 100%)`
                              : (daysDiff !== null && daysDiff === 0
                                ? `linear-gradient(135deg, #fef2f2 0%, #fecaca 30%, #fca5a5 70%, #dc2626 100%)`
                                : (daysDiff !== null && daysDiff <= 3
                                  ? `linear-gradient(135deg, #fffbeb 0%, #fed7aa 30%, #fdba74 70%, #f59e0b 100%)`
                                  : `linear-gradient(135deg, #eff6ff 0%, #dbeafe 30%, #bfdbfe 70%, #3b82f6 100%)`))))
                      }}>
                        {/* Subtle pattern overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent dark:from-gray-800/30"></div>
                        
                        {/* Info content */}
                        <div className="relative z-10 p-3">
                          {/* Header with title and status badges */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className={`text-base font-bold ${completed ? 'line-through opacity-75 text-gray-900 dark:text-gray-800' : 'text-gray-900 dark:text-gray-800'} transition-all duration-200 group-hover:text-opacity-90`}>
                                {task.description}
                              </h3>
                            </div>
                            <div className="flex items-center gap-1.5 ml-3">
                              {/* Status badge (Due/Completed) */}
                              <span className={`px-2 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm ${completed ? 'bg-green-600 text-white' : (task.important ? 'bg-orange-600 text-white' : status.badge)}`}>
                                {dueText}
                              </span>
                              
                              {/* Urgent badge */}
                              {task.important && !completed && (
                                <span className="px-2 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm bg-orange-600 text-white">
                                  URGENT
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Project and responsible party info - compact */}
                          <div className="space-y-1.5 mb-2">
                            <div className="flex items-center gap-2 text-xs">
                              <svg className={`w-3.5 h-3.5 ${completed ? 'text-green-700 dark:text-green-700' : (task.important ? 'text-orange-700 dark:text-orange-700' : status.icon)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                              <span className="font-medium text-gray-600 dark:text-gray-800">Project:</span>
                              <span className="font-semibold text-gray-800 dark:text-gray-900">{task.projectName}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs">
                              <svg className={`w-3.5 h-3.5 ${completed ? 'text-green-700 dark:text-green-700' : (task.important ? 'text-orange-700 dark:text-orange-700' : status.icon)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span className="font-medium text-gray-600 dark:text-gray-800">Responsible:</span>
                              <span className="font-semibold text-gray-800 dark:text-gray-900">{task.responsibleParty}</span>
                            </div>
                          </div>
                          
                          {/* Notes section - transparent background */}
                          {task.notes && (
                            <div className="mb-2">
                              <div className="flex items-start gap-2">
                                <svg className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${completed ? 'text-green-700 dark:text-green-700' : (task.important ? 'text-orange-700 dark:text-orange-700' : status.icon)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                <div className={`text-xs ${completed ? 'text-green-800 dark:text-green-800' : (task.important ? 'text-orange-800 dark:text-orange-800' : (daysDiff !== null && daysDiff < 0 ? 'text-red-800 dark:text-red-800' : (daysDiff !== null && daysDiff === 0 ? 'text-red-800 dark:text-red-800' : (daysDiff !== null && daysDiff <= 3 ? 'text-orange-800 dark:text-orange-800' : 'text-blue-800 dark:text-blue-800'))))} font-medium`}>
                                  <span className="font-semibold">Notes:</span> {task.notes}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Action buttons - Modern Design */}
                          <div className="flex justify-end gap-2">
                            {hasPermission(ROLES.EDITOR) && !task.checklistId && (
                              <button
                                onClick={() => handleEditClick(task)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110"
                                title="Edit Task"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            )}
                            
                            {!task.checklistId && (
                              <button
                                onClick={() => handleToggleCompleted(task.instanceId, task.originalId)}
                                className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-primary shadow-lg hover:shadow-xl transform hover:scale-110 ${
                                  completed 
                                    ? 'bg-green-500 text-white hover:bg-green-600' 
                                    : 'bg-white/90 dark:bg-gray-700/90 text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 border border-gray-200/50 dark:border-gray-600/50'
                                }`}
                                title={completed ? 'Mark as Incomplete' : 'Mark as Completed'}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              </button>
                            )}
                            
                            {hasPermission(ROLES.EDITOR) && (
                              <button
                                onClick={() => handleToggleUrgent(task.instanceId, task.originalId)}
                                className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-primary shadow-lg hover:shadow-xl transform hover:scale-110 ${
                                  task.important 
                                    ? 'bg-orange-500 text-white hover:bg-orange-600' 
                                    : 'bg-white/90 dark:bg-gray-700/90 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-gray-200/50 dark:border-gray-600/50'
                                }`}
                                title={task.important ? 'Remove Urgent' : 'Mark as Urgent'}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                            )}
                            
                            {/* Document Link Button */}
                            <button
                              onClick={() => handleDocumentLinkClick(task)}
                              className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-primary shadow-lg hover:shadow-xl transform hover:scale-110 ${
                                task.checklistId
                                  ? 'bg-green-500 text-white hover:bg-green-600'
                                  : task.documentLink 
                                    ? 'bg-purple-500 text-white hover:bg-purple-600' 
                                    : 'bg-white/90 dark:bg-gray-700/90 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-gray-200/50 dark:border-gray-600/50'
                              }`}
                              title={task.checklistId ? 'Open Checklist' : (task.documentLink ? 'Open Document' : 'Add Document Link')}
                            >
                              {task.checklistId ? (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              )}
                            </button>
                            
                            {hasPermission(ROLES.EDITOR) && (
                              <button
                                onClick={() => handleToggleNotes(task.instanceId, task.originalId, task.notes)}
                                className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-primary shadow-lg hover:shadow-xl transform hover:scale-110 ${
                                  task.notes 
                                    ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                                    : 'bg-white/90 dark:bg-gray-700/90 text-gray-600 dark:text-gray-300 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 border border-gray-200/50 dark:border-gray-600/50'
                                }`}
                                title={task.notes ? 'Edit Notes' : 'Add Notes'}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            )}
                            
                            {hasPermission(ROLES.EDITOR) && (
                              <button
                                onClick={() => handleDeleteTask(task.instanceId, task.originalId)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110"
                                title="Delete Task"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          </>
        )}
        
        {activeTab === 'add' && (
          <div className="max-w-7xl mx-auto">
            <AddTasks addTask={handleAddTask} />
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="max-w-6xl mx-auto">
            <Messages />
          </div>
        )}

        {activeTab === 'checklists' && (
          <div className="max-w-7xl mx-auto">
            <ChecklistsAndForms 
              tasks={tasks} 
              addTask={handleAddTask} 
              updateTask={handleUpdateTask}
              selectedChecklistFromTask={selectedChecklistFromTask}
              onChecklistSelected={() => setSelectedChecklistFromTask(null)}
            />
          </div>
        )}

        {activeTab === 'data' && (
          <div className="max-w-6xl mx-auto">
            <DataManagement 
              tasks={tasks}
              overrides={overrides}
              onImportTasks={handleImportTasks}
              onRestoreBackup={handleRestoreBackup}
              users={users}
              aliases={aliases}
              departmentMappings={departmentMappings}
            />
          </div>
        )}
        
        {activeTab === 'users' && (
          <div className="max-w-6xl mx-auto">
            <UserManagement />
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div className="max-w-6xl mx-auto">
            <SettingsPage />
            {/* PWA Installation Guide */}
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Install App</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Install this app on your device for quick access and offline use.
              </p>
              <button
                onClick={() => {
                  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                  const isAndroid = /Android/.test(navigator.userAgent);
                  const isChrome = /Chrome/.test(navigator.userAgent);
                  const isEdge = /Edg/.test(navigator.userAgent);
                  
                  let instructions = '';
                  
                  if (isIOS) {
                    instructions = 'To install on iOS:\n\n1. Tap the Share button (square with arrow)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm\n\nOr look for the install icon in Safari\'s address bar.';
                  } else if (isAndroid) {
                    instructions = 'To install on Android:\n\n1. Look for the install icon in Chrome\'s address bar\n2. Or tap the menu (3 dots) and select "Add to Home screen"\n3. Follow the prompts to install';
                  } else if (isChrome || isEdge) {
                    instructions = 'To install on Desktop:\n\n1. Look for the install icon in the address bar\n2. Or go to the browser menu and select "Install" or "Add to Home Screen"\n3. Follow the prompts to install';
                  } else {
                    instructions = 'To install this app:\n\n1. Look for an install icon in your browser\'s address bar\n2. Or check your browser\'s menu for "Install" or "Add to Home Screen" options\n3. Follow the prompts to install';
                  }
                  
                  alert(instructions);
                }}
                className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors font-medium"
              >
                Show Installation Instructions
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editTaskId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 lg:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Task</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={editForm.projectName}
                  onChange={(e) => handleEditChange('projectName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => handleEditChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                <input
                  type="date"
                  value={editForm.deadline}
                  onChange={(e) => handleEditChange('deadline', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsible Party</label>
                <input
                  type="text"
                  value={editForm.responsibleParty}
                  onChange={(e) => handleEditChange('responsibleParty', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editRecurring"
                  checked={editForm.recurring}
                  onChange={(e) => handleEditChange('recurring', e.target.checked)}
                  className="w-4 h-4 text-theme-primary bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-theme-primary focus:ring-2"
                />
                <label htmlFor="editRecurring" className="text-sm font-medium text-gray-700 dark:text-gray-300">Recurring</label>
              </div>
              {editForm.recurring && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Interval (months)</label>
                    <input
                      type="number"
                      value={editForm.frequency}
                      onChange={(e) => handleEditChange('frequency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Final Date</label>
                    <input
                      type="date"
                      value={editForm.finalDate || ''}
                      onChange={(e) => handleEditChange('finalDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      min={editForm.deadline || ''}
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editImportant"
                  checked={editForm.important}
                  onChange={(e) => handleEditChange('important', e.target.checked)}
                  className="w-4 h-4 text-theme-primary bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-theme-primary focus:ring-2"
                />
                <label htmlFor="editImportant" className="text-sm font-medium text-gray-700 dark:text-gray-300">Urgent</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea
                  value={editForm.notes || ''}
                  onChange={(e) => handleEditChange('notes', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows="3"
                  placeholder="Add notes about this task..."
                />
              </div>
              
              {/* Document Link Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Document Link</label>
                <div className="space-y-2">
                  {editForm.documentLink ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editForm.documentLink}
                        onChange={(e) => handleEditChange('documentLink', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Document link or file path"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm('Are you sure you want to remove this document link?')) {
                            await handleRemoveDocumentLink(editTaskId, editForm.originalId);
                            handleEditChange('documentLink', '');
                          }
                        }}
                        className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                        title="Remove document link"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editForm.documentLink || ''}
                        onChange={(e) => handleEditChange('documentLink', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Add document link or file path"
                      />

                    </div>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enter a SharePoint, OneDrive, web link, or file path
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleEditSave}
                className="flex-1 px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg font-medium transition-colors duration-200"
              >
                Save
              </button>
              <button
                onClick={handleEditCancel}
                className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {notesModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 lg:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Task Notes</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows="6"
                  placeholder="Add notes about this task..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveNotes}
                className="flex-1 px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg font-medium transition-colors duration-200"
              >
                Save Notes
              </button>
              <button
                onClick={handleCancelNotes}
                className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Link Modal */}
      <DocumentLinkModal
        isOpen={documentLinkModal.show}
        task={documentLinkModal.task}
        onSave={handleSaveDocumentLink}
        onRemove={handleRemoveDocumentLink}
        onClose={() => setDocumentLinkModal({ show: false, task: null })}
      />

      <PWAInstallPrompt />
    </div>
  );
}

export default App;
