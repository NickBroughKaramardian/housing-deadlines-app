import React, { useState, useEffect } from 'react';
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
import { db } from './firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { useAuth } from './Auth';
import notificationService from './notificationService';
import themeService from './themeService';

// PWA Installation Prompt Component
function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
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

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
  };

  if (!showInstallPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <img src="/CC_App_Icon.svg" alt="App Icon" className="w-12 h-12" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">Install C&C Project Manager</h3>
          <p className="text-xs text-gray-600 mt-1">
            Install this app for quick access and offline use
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleInstallClick}
          className="flex-1 px-3 py-2 bg-theme-primary text-white text-sm font-medium rounded-md hover:bg-theme-primary-hover transition-colors"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="px-3 py-2 text-gray-600 text-sm font-medium hover:text-gray-800 transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

function App() {
  const { userProfile, hasPermission, ROLES } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [sortOption, setSortOption] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewDeadlinesOpen, setViewDeadlinesOpen] = useState(false);
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [editTaskId, setEditTaskId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [overrides, setOverrides] = useState([]);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesTaskId, setNotesTaskId] = useState(null);
  const [notesTaskOriginalId, setNotesTaskOriginalId] = useState(null);
  const [notesText, setNotesText] = useState('');

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
    
    const taskWithOrg = {
      ...newTask,
      organizationId: userProfile?.organizationId,
      createdBy: userProfile?.uid,
      createdAt: new Date()
    };
    
    console.log('Task with organization:', taskWithOrg);
    
    try {
      const docRef = await addDoc(collection(db, 'tasks'), taskWithOrg);
      console.log('Task added successfully with ID:', docRef.id);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleUpdateTask = async (updatedTask) => {
    const ref = doc(db, 'tasks', updatedTask.id);
    await updateDoc(ref, updatedTask);
  };

  const handleDeleteTask = async (id, originalId) => {
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
  };

  const handleImportTasks = async (importedTasks) => {
    for (const task of importedTasks) {
      const taskWithOrg = {
        ...task,
        organizationId: userProfile?.organizationId,
        createdBy: userProfile?.uid,
        createdAt: new Date()
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
      const taskWithOrg = {
        ...task,
        organizationId: userProfile?.organizationId,
        createdBy: userProfile?.uid,
        createdAt: new Date()
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
        let endYear = parseInt(task.finalYear, 10);
        const defaultEndYear = startDate.getFullYear() + defaultYears;
        if (isNaN(endYear) || endYear > defaultEndYear) {
          endYear = defaultEndYear;
        }
        let current = new Date(startDate);
        while (current.getFullYear() <= endYear) {
          const instanceDate = new Date(current);
          if (instanceDate.getMonth() !== current.getMonth()) {
            instanceDate.setDate(0);
          }
          if (instanceDate.getFullYear() > endYear) break;
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
              completed: task.completed || false
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

    // Filter to only show incomplete tasks if the checkbox is checked
    if (showIncompleteOnly) {
      filtered = filtered.filter(task => !task.completed);
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
    setEditTaskId(task.id);
    setEditForm({
      projectName: task.projectName,
      description: task.description,
      deadline: task.deadline,
      responsibleParty: task.responsibleParty,
      recurring: task.recurring,
      frequency: task.frequency,
      finalYear: task.finalYear,
      important: task.important,
      notes: task.notes || ''
    });
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async () => {
    if (!editTaskId) return;
    await handleUpdateTask({ id: editTaskId, ...editForm });
    setEditTaskId(null);
    setEditForm({});
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
      if (notesTaskId.includes('_')) {
        // This is a recurring instance, create/update override
        const [parentId, date] = notesTaskId.split('_');
        const existing = overrides.find(o => o.parentId === parentId && o.deadline === date);
        
        if (existing) {
          await updateDoc(doc(db, 'taskOverrides', existing.id), { notes: notesText });
        } else {
          await addDoc(collection(db, 'taskOverrides'), { 
            parentId, 
            deadline: date, 
            notes: notesText,
            organizationId: userProfile?.organizationId,
            createdBy: userProfile?.uid,
            createdAt: new Date()
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
      alert('Error saving notes. Please try again.');
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



  return (
    <div>
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
            
            {/* View Deadlines Dropdown */}
            <div className="relative view-deadlines-dropdown">
              <button 
                onClick={() => setViewDeadlinesOpen(!viewDeadlinesOpen)}
                className={`w-full px-4 py-3 rounded-lg text-left font-medium flex items-center justify-between ${
                  ['calendar', 'gantt', 'sort'].includes(activeTab) 
                    ? 'bg-theme-primary text-white' 
                    : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>View Deadlines</span>
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
                </div>
              )}
            </div>
            
            <button onClick={() => { setActiveTab('messages'); setIsMobileMenuOpen(false); }} className={`w-full px-4 py-3 rounded-lg text-left font-medium ${activeTab === 'messages' ? 'bg-theme-primary text-white' : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}>Messages</button>
            {hasPermission(ROLES.ADMIN) && (
              <button onClick={() => { setActiveTab('data'); setIsMobileMenuOpen(false); }} className={`w-full px-4 py-3 rounded-lg text-left font-medium ${activeTab === 'data' ? 'bg-theme-primary text-white' : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}>Data</button>
            )}
            {hasPermission(ROLES.ADMIN) && (
              <button onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }} className={`w-full px-4 py-3 rounded-lg text-left font-medium ${activeTab === 'users' ? 'bg-theme-primary text-white' : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}>Users</button>
            )}
            <button onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} className={`w-full px-4 py-3 rounded-lg text-left font-medium ${activeTab === 'settings' ? 'bg-theme-primary text-white' : 'bg-gray-100 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}>Settings</button>
          </div>
        </div>
      )}

      {/* Desktop Header */}
      <div className="hidden lg:flex items-center justify-between px-4 py-4 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <h1 className="text-2xl font-bold text-theme-primary-dark">C&C Project Manager</h1>
        <div className="flex items-center gap-4 w-full max-w-7xl mx-auto">
          <div className="flex flex-1 flex-wrap gap-2 w-full">
            <button onClick={() => setActiveTab('dashboard')} className={`flex-1 min-w-[120px] px-4 py-2 rounded text-center ${activeTab === 'dashboard' ? 'bg-theme-primary text-white' : 'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'}`}>Dashboard</button>
            
            {/* View Deadlines Dropdown */}
            <div className="relative view-deadlines-dropdown">
              <button 
                onClick={() => setViewDeadlinesOpen(!viewDeadlinesOpen)}
                className={`flex-1 min-w-[120px] px-4 py-2 rounded text-center flex items-center justify-center gap-2 ${
                  ['calendar', 'gantt', 'sort'].includes(activeTab) 
                    ? 'bg-theme-primary text-white' 
                    : 'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'
                }`}
              >
                <span>View Deadlines</span>
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
                </div>
              )}
            </div>
            
            {hasPermission(ROLES.EDITOR) && (
              <button onClick={() => setActiveTab('add')} className={`hidden lg:block flex-1 min-w-[120px] px-4 py-2 rounded text-center ${activeTab === 'add' ? 'bg-theme-primary text-white' : 'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'}`}>Add Tasks</button>
            )}
            <button onClick={() => setActiveTab('messages')} className={`flex-1 min-w-[120px] px-4 py-2 rounded text-center ${activeTab === 'messages' ? 'bg-theme-primary text-white' : 'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'}`}>Messages</button>
            {hasPermission(ROLES.ADMIN) && (
              <button onClick={() => setActiveTab('data')} className={`flex-1 min-w-[120px] px-4 py-2 rounded text-center ${activeTab === 'data' ? 'bg-theme-primary text-white' : 'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'}`}>Data</button>
            )}
            {hasPermission(ROLES.ADMIN) && (
              <button onClick={() => setActiveTab('users')} className={`flex-1 min-w-[120px] px-4 py-2 rounded text-center ${activeTab === 'users' ? 'bg-theme-primary text-white' : 'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'}`}>Users</button>
            )}
            <button onClick={() => setActiveTab('settings')} className={`flex-1 min-w-[120px] px-4 py-2 rounded text-center ${activeTab === 'settings' ? 'bg-theme-primary text-white' : 'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'}`}>Settings</button>
          </div>
          <UserMenu />
        </div>
      </div>

      <div className="p-4 lg:p-6">
        {activeTab === 'dashboard' && (
          <div className="max-w-6xl mx-auto">
            <Dashboard 
              tasks={expandRecurringTasks(tasks)}
              onToggleCompleted={handleToggleCompleted}
              onTaskLinkClick={handleTaskLinkClick}
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
              parseDeadlineDate={parseDeadlineDate}
            />
          </div>
        )}
        
        {activeTab === 'sort' && (
          <>
            {/* Modern, colorful filter bar */}
            <div className="mb-6 lg:mb-8 sticky top-20 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur border-b border-gray-100 dark:border-gray-700 py-3 lg:py-4 px-3 lg:px-4 rounded-xl shadow">
              <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 items-start lg:items-center">
                <div className="flex flex-col sm:flex-row gap-2 lg:gap-3 items-start sm:items-center w-full lg:w-auto">
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="px-3 lg:px-5 py-2 rounded-full border-2 border-gray-400 bg-white text-sm lg:text-base font-semibold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all w-full sm:w-auto min-w-[140px] lg:min-w-[160px]"
                  >
                    <option value="">Sort by...</option>
                    <option value="Deadline">Deadline</option>
                    <option value="Responsible Party">Responsible Party</option>
                    <option value="Project">Project</option>
                    <option value="Recurring">Recurring</option>
                    <option value="Search">Search</option>
                  </select>
                  {/* Incomplete only checkbox */}
                  <label className="flex items-center gap-2 text-gray-700 font-medium text-sm lg:text-base whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={showIncompleteOnly}
                      onChange={e => setShowIncompleteOnly(e.target.checked)}
                      className="rounded focus:ring-2 focus:ring-green-500"
                    />
                    <span>Incomplete only</span>
                  </label>
                                                    {sortOption === 'Deadline' && (
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      <input
                        type="text"
                        placeholder="Year"
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        className="px-2 lg:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent w-full sm:w-16 lg:w-20 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Month"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="px-2 lg:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent w-full sm:w-20 lg:w-24 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Day"
                        value={filterDay}
                        onChange={(e) => setFilterDay(e.target.value)}
                        className="px-2 lg:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent w-full sm:w-14 lg:w-16 text-sm"
                      />
                    </div>
                  )}
                  {sortOption === 'Responsible Party' && (
                    <select
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      className="px-3 lg:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm lg:text-base w-full sm:w-auto min-w-[180px] lg:min-w-[200px]"
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
                      className="px-3 lg:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm lg:text-base w-full sm:w-auto min-w-[180px] lg:min-w-[200px]"
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
                      className="px-3 lg:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm lg:text-base w-full sm:w-auto min-w-[180px] lg:min-w-[200px]"
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
                      className="px-3 lg:px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent w-full text-sm lg:text-base"
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

            <div className="grid gap-6 mt-6">
              {filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-500">
                  <svg className="w-20 h-20 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <div className="text-2xl font-bold mb-2 text-gray-700">No tasks found</div>
                  <div className="text-base text-gray-500">Try adjusting your filters or search.</div>
                </div>
              ) : (
                filteredTasks.map(task => {
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
                        dateBg: '#d1fae5',
                        dateColor: '#065f46'
                      };
                    } else if (daysDiff !== null && daysDiff < 0) {
                      return {
                        bg: 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20',
                        border: 'border-red-200 dark:border-red-700',
                        badge: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
                        text: 'text-red-800 dark:text-red-200',
                        icon: 'text-red-600 dark:text-red-400',
                        dateBg: '#fee2e2',
                        dateColor: '#991b1b'
                      };
                    } else if (daysDiff !== null && daysDiff === 0) {
                      return {
                        bg: 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20',
                        border: 'border-red-200 dark:border-red-700',
                        badge: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
                        text: 'text-red-800 dark:text-red-200',
                        icon: 'text-red-600 dark:text-red-400',
                        dateBg: '#fca5a5',
                        dateColor: '#991b1b'
                      };
                    } else if (daysDiff !== null && daysDiff <= 3) {
                      return {
                        bg: 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20',
                        border: 'border-orange-200 dark:border-orange-700',
                        badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
                        text: 'text-orange-800 dark:text-orange-200',
                        icon: 'text-orange-600 dark:text-orange-400',
                        dateBg: '#fef3c7',
                        dateColor: '#92400e'
                      };
                    } else {
                      return {
                        bg: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
                        border: 'border-blue-200 dark:border-blue-700',
                        badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
                        text: 'text-blue-800 dark:text-blue-200',
                        icon: 'text-blue-600 dark:text-blue-400',
                        dateBg: '#dbeafe',
                        dateColor: '#1e40af'
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
                    <div key={task.instanceId} className={`group relative flex flex-col lg:flex-row items-stretch bg-white dark:bg-gray-800 rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-opacity-80 overflow-hidden`}
                      style={{
                        borderColor: status.dateBg
                      }}
                    >
                      {/* Date and status panel - Left side */}
                      <div className="flex flex-row lg:flex-col items-center justify-center w-full lg:w-20 lg:min-w-[5rem] lg:h-auto py-2 lg:py-3 px-2 lg:px-1 rounded-t-xl lg:rounded-l-xl lg:rounded-t-none transition-all duration-300"
                        style={{
                          background: status.dateBg,
                          color: status.dateColor
                        }}
                      >
                        <div className="flex flex-row lg:flex-col items-center">
                          <span className="text-sm font-bold tracking-tight lg:mb-0.5 uppercase mr-1 lg:mr-0">
                            {deadlineDate ? deadlineDate.toLocaleString('en-US', { month: 'short' }) : ''}
                          </span>
                          <span className="text-xl lg:text-2xl font-extrabold leading-none uppercase mr-1 lg:mr-0">
                            {deadlineDate ? deadlineDate.getDate() : ''}
                          </span>
                          <span className="text-sm lg:mt-0.5 uppercase">
                            {deadlineDate ? deadlineDate.getFullYear() : ''}
                          </span>
                        </div>
                      </div>
                      
                      {/* Main content - Right side */}
                      <div className={`flex-1 flex flex-col justify-center p-2 lg:p-3 ${status.bg}`}>
                        {/* Header with task description and status */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-base lg:text-lg font-bold ${completed ? 'line-through opacity-75' : 'text-gray-900 dark:text-white'} transition-all duration-200 group-hover:text-opacity-90`}>
                              {task.description}
                            </h3>
                          </div>
                          <div className="flex items-center gap-1.5 ml-2">
                            {/* Status badge */}
                            <span className={`px-2 py-1 rounded-full text-sm font-bold tracking-wide uppercase shadow-sm ${status.badge}`}>
                              {dueText}
                            </span>
                            
                            {/* Urgent badge */}
                            {task.important && (
                              <span className="px-2 py-1 rounded-full text-sm font-bold tracking-wide uppercase shadow-sm bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200">
                                URGENT
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Project and responsible party info - compact */}
                        <div className="flex items-center gap-3 text-sm mb-2">
                          <div className="flex items-center gap-1">
                            <svg className={`w-4 h-4 ${status.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <span className="font-medium text-gray-600 dark:text-gray-400">Project:</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{task.projectName}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <svg className={`w-4 h-4 ${status.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="font-medium text-gray-600 dark:text-gray-400">Responsible:</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{task.responsibleParty}</span>
                          </div>
                        </div>
                        
                        {/* Notes section */}
                        {task.notes && (
                          <div className={`mb-2 p-2 rounded-lg border-l-4 ${
                            completed 
                              ? 'border-green-500 dark:border-green-400' 
                              : daysDiff !== null && daysDiff < 0
                              ? 'border-red-500 dark:border-red-400'
                              : daysDiff !== null && daysDiff === 0
                              ? 'border-red-500 dark:border-red-400'
                              : daysDiff !== null && daysDiff <= 3
                              ? 'border-orange-500 dark:border-orange-400'
                              : 'border-blue-500 dark:border-blue-400'
                          }`}>
                            <div className="flex items-start gap-2">
                              <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                completed 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : daysDiff !== null && daysDiff < 0
                                  ? 'text-red-600 dark:text-red-400'
                                  : daysDiff !== null && daysDiff === 0
                                  ? 'text-red-600 dark:text-red-400'
                                  : daysDiff !== null && daysDiff <= 3
                                  ? 'text-orange-600 dark:text-orange-400'
                                  : 'text-blue-600 dark:text-blue-400'
                              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              <div className={`text-sm ${
                                completed 
                                  ? 'text-green-800 dark:text-green-200' 
                                  : daysDiff !== null && daysDiff < 0
                                  ? 'text-red-800 dark:text-red-200'
                                  : daysDiff !== null && daysDiff === 0
                                  ? 'text-red-800 dark:text-red-200'
                                  : daysDiff !== null && daysDiff <= 3
                                  ? 'text-orange-800 dark:text-orange-200'
                                  : 'text-blue-800 dark:text-blue-200'
                              }`}>
                                <span className="font-medium opacity-80">Notes:</span> {task.notes}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Action buttons */}
                        <div className="flex justify-end gap-1.5">
                          {hasPermission(ROLES.EDITOR) && (
                            <button
                              onClick={() => handleEditClick(task)}
                              className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105"
                              title="Edit Task"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleToggleCompleted(task.instanceId, task.originalId)}
                            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-primary shadow-sm hover:shadow-md transform hover:scale-105 ${
                              completed 
                                ? 'bg-green-500 text-white hover:bg-green-600 shadow-green-200 dark:shadow-green-900/30' 
                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 border border-gray-200 dark:border-gray-600'
                            }`}
                            title={completed ? 'Mark as Incomplete' : 'Mark as Completed'}
                            aria-label={completed ? 'Mark as Incomplete' : 'Mark as Completed'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          </button>
                          
                          {hasPermission(ROLES.EDITOR) && (
                            <button
                              onClick={() => handleToggleUrgent(task.instanceId, task.originalId)}
                              className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-primary shadow-sm hover:shadow-md transform hover:scale-105 ${
                                task.important 
                                  ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-200 dark:shadow-orange-900/30' 
                                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 border border-gray-200 dark:border-gray-600'
                              }`}
                              title={task.important ? 'Remove Urgent' : 'Mark as Urgent'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          )}
                          
                          {hasPermission(ROLES.EDITOR) && (
                            <button
                              onClick={() => handleToggleNotes(task.instanceId, task.originalId, task.notes)}
                              className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-primary shadow-sm hover:shadow-md transform hover:scale-105 ${
                                task.notes 
                                  ? 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-yellow-200 dark:shadow-yellow-900/30' 
                                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-yellow-600 dark:hover:text-yellow-400 border border-gray-200 dark:border-gray-600'
                              }`}
                              title={task.notes ? 'Edit Notes' : 'Add Notes'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          )}
                          
                          {hasPermission(ROLES.EDITOR) && (
                            <button
                              onClick={() => handleDeleteTask(task.instanceId, task.originalId)}
                              className="w-8 h-8 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105"
                              title="Delete Task"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
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

        {activeTab === 'data' && (
          <div className="max-w-6xl mx-auto">
            <DataManagement 
              tasks={tasks}
              overrides={overrides}
              onImportTasks={handleImportTasks}
              onRestoreBackup={handleRestoreBackup}
            />
          </div>
        )}
        
        {activeTab === 'users' && (
          <div className="max-w-6xl mx-auto">
            <UserManagement />
          </div>
        )}
        
        {activeTab === 'settings' && <SettingsPage />}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Final Year</label>
                    <input
                      type="number"
                      value={editForm.finalYear}
                      onChange={(e) => handleEditChange('finalYear', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      min={new Date().getFullYear()}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editForm.notes || ''}
                  onChange={(e) => handleEditChange('notes', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows="3"
                  placeholder="Add notes about this task..."
                />
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
      <PWAInstallPrompt />
    </div>
  );
}

export default App;
