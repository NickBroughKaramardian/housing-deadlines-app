import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  FunnelIcon, 
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  UserIcon,
  FolderIcon,
  PlusIcon,
  MinusIcon
} from '@heroicons/react/24/outline';
import { format, parseISO, isValid } from 'date-fns';
import { taskManager } from './services/taskManager';
import { microsoftDataService } from './microsoftDataService';
import TaskCard from './TaskCard';
import NoteModal from './components/NoteModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import { getTaskDeadline, parseDeadlineDate, filterDeadlineTasks, getTaskStatus, getStatusColor, getVisibleTasks } from './utils/taskHelpers';
import { useAuth } from './Auth';
import { DEPARTMENTS } from './microsoftAuthService';
import { getDepartmentDisplayName, getDepartmentColor } from './utils/departmentColors';
import { useUserDepartments } from './contexts/UserDepartmentsContext';
// Removed taskUpdateService - using taskService instead

function SortDeadlinesPage() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeFilter, setActiveFilter] = useState('active');
  const [sortBars, setSortBars] = useState([{ id: 1, sortBy: 'deadline', sortOrder: 'asc' }]);
  
  // Get user's departments from context
  const { isFilterActive, userDepartments, getAccessibleDepartments } = useUserDepartments();
  // Filters array - one filter object per sort bar
  const [filters, setFilters] = useState([
    {
      deadlineYear: '',
      deadlineMonth: '',
      deadlineDay: '',
      responsibleParty: '',
      department: [],
      project: '',
      search: ''
    }
  ]);
  // Legacy state for backward compatibility (will be removed)
  const [secondaryFilter, setSecondaryFilter] = useState('');
  const [deadlineYear, setDeadlineYear] = useState('');
  const [deadlineMonth, setDeadlineMonth] = useState('');
  const [deadlineDay, setDeadlineDay] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  
  // Modal states
  const [noteModal, setNoteModal] = useState({ isOpen: false, task: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, taskId: null, taskName: null });
  
  const { userProfile } = useAuth();

  // Handlers for multiple sort bars
  const addSortBar = () => {
    if (sortBars.length < 4) {
      const newId = Math.max(...sortBars.map(b => b.id || 0), 0) + 1;
      setSortBars([...sortBars, { id: newId, sortBy: 'deadline', sortOrder: 'asc' }]);
      // Add corresponding filter
      setFilters([...filters, {
        deadlineYear: '',
        deadlineMonth: '',
        deadlineDay: '',
        responsibleParty: '',
        department: [],
        project: '',
        search: ''
      }]);
    }
  };

  const removeSortBar = (index) => {
    if (sortBars.length > 1 && index > 0) {
      const newSortBars = sortBars.filter((_, i) => i !== index);
      setSortBars(newSortBars);
      // Remove corresponding filter
      const newFilters = filters.filter((_, i) => i !== index);
      setFilters(newFilters);
      // Clear legacy filter state if removing the first bar
      if (index === 0) {
        setSecondaryFilter('');
        setDeadlineYear('');
        setDeadlineMonth('');
        setDeadlineDay('');
        setSelectedDepartments([]);
      }
    }
  };

  const updateSortBar = (index, field, value) => {
    const newSortBars = [...sortBars];
    newSortBars[index] = { ...newSortBars[index], [field]: value };
    setSortBars(newSortBars);
    // Clear filter when sort bar type changes
    if (field === 'sortBy') {
      const newFilters = [...filters];
      newFilters[index] = {
        deadlineYear: '',
        deadlineMonth: '',
        deadlineDay: '',
        responsibleParty: '',
        department: [],
        project: '',
        search: ''
      };
      setFilters(newFilters);
      // Clear legacy filter state when first sort bar type changes
      if (index === 0) {
        setSecondaryFilter('');
        setDeadlineYear('');
        setDeadlineMonth('');
        setDeadlineDay('');
        setSelectedDepartments([]);
      }
    }
  };

  // Update filter for a specific sort bar
  const updateFilter = (index, field, value) => {
    const newFilters = [...filters];
    if (field === 'department') {
      // Handle department array toggle
      const currentDepts = newFilters[index].department || [];
      if (Array.isArray(value)) {
        newFilters[index] = { ...newFilters[index], department: value };
      } else {
        // Toggle department
        const deptIndex = currentDepts.indexOf(value);
        if (deptIndex >= 0) {
          newFilters[index].department = currentDepts.filter(d => d !== value);
        } else {
          newFilters[index].department = [...currentDepts, value];
        }
      }
    } else {
      newFilters[index] = { ...newFilters[index], [field]: value };
    }
    setFilters(newFilters);
  };

  const loadTasks = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);

      if (forceRefresh || !taskManager.isInitialized) {
        await taskManager.initialize(forceRefresh);
      }

      const allTasks = taskManager.getAllTasks();
      const deadlineTasks = filterDeadlineTasks(allTasks);
      setTasks(deadlineTasks);
    } catch (error) {
      console.error('SortDeadlines: Error loading tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check for pending project filter from Portfolio page
  useEffect(() => {
    const pendingFilter = sessionStorage.getItem('pendingProjectFilter');
    if (pendingFilter) {
      // Pre-fill the project filter in the first sort bar
      setFilters(prev => {
        const newFilters = [...prev];
        if (newFilters[0]) {
          newFilters[0] = { ...newFilters[0], project: pendingFilter };
        }
        return newFilters;
      });
      // Also set the sort by to project if not already
      if (sortBars[0] && sortBars[0].sortBy !== 'project') {
        setSortBars(prev => {
          const newBars = [...prev];
          if (newBars[0]) {
            newBars[0] = { ...newBars[0], sortBy: 'project' };
          }
          return newBars;
        });
      }
      // Clear the session storage
      sessionStorage.removeItem('pendingProjectFilter');
    }
  }, []); // Run once on mount

  // Toggle task completion using TaskManager
  const toggleTaskCompletion = useCallback(async (taskId, currentStatus, shouldUpdateAll = false) => {
    const newStatus = !currentStatus;
    
    try {
      setUpdating(true);
      
      if (shouldUpdateAll) {
        // Find all related tasks (same Task name and Project)
        const currentTask = tasks.find(t => t.id === taskId);
        if (currentTask) {
          const relatedTasks = tasks.filter(t => 
            (t.Task || t.title || t.task) === (currentTask.Task || currentTask.title || currentTask.task) && 
            (t.Project || t.project) === (currentTask.Project || currentTask.project)
          );
          
          // Use TaskManager batch update
          await taskManager.batchUpdate(
            relatedTasks.map(task => ({ id: task.id, updates: { completed: newStatus } }))
          );
          
          console.log('SortDeadlines: Updated completion for', relatedTasks.length, 'related tasks');
        }
      } else {
        // Update only this task using TaskManager
        const existingTask = taskManager.getTaskById(taskId);
        if (existingTask) {
          await taskManager.updateTask(taskId, { 
            ...existingTask,
            completed: newStatus 
          });
        } else {
          await taskManager.updateTask(taskId, { completed: newStatus });
        }
      }
      
      console.log('SortDeadlines: Task completion updated successfully');
    } catch (error) {
      console.error('SortDeadlines: Error updating task completion:', error);
    } finally {
      setUpdating(false);
    }
  }, [tasks]);

  useEffect(() => {
    loadTasks(true);

    const unsubscribe = taskManager.subscribe(({ type }) => {
      if (type === 'refreshed' || type === 'created' || type === 'updated' || type === 'deleted' || type === 'batchCreated' || type === 'batchUpdated' || type === 'batchDeleted') {
        const allTasks = taskManager.getAllTasks();
        setTasks(filterDeadlineTasks(allTasks));
      }
      if (type === 'loading') {
        setLoading(taskManager.isLoading);
      }
    });

    const handleTaskDataChanged = (event) => {
      const { type } = event.detail;
      if (type === 'refreshed' || type === 'created' || type === 'updated' || type === 'deleted' || type === 'batchCreated' || type === 'batchUpdated' || type === 'batchDeleted') {
        const allTasks = taskManager.getAllTasks();
        setTasks(filterDeadlineTasks(allTasks));
      }
    };

    window.addEventListener('taskDataChanged', handleTaskDataChanged);

    return () => {
      unsubscribe();
      window.removeEventListener('taskDataChanged', handleTaskDataChanged);
    };
  }, [loadTasks]);

  // Action handlers for TaskCard
  const handleToggleComplete = useCallback(async (taskId, currentStatus) => {
    try {
      const existingTask = taskManager.getTaskById(taskId);
      if (existingTask) {
        await taskManager.updateTask(taskId, { 
          ...existingTask,
          completed: !currentStatus 
        });
      } else {
        await taskManager.updateTask(taskId, { completed: !currentStatus });
      }
    } catch (error) {
      console.error('SortDeadlines: Error toggling completion:', error);
    }
  }, []);

  const handleToggleUrgent = useCallback(async (taskId, currentUrgency) => {
    try {
      const existingTask = taskManager.getTaskById(taskId);
      if (existingTask) {
        await taskManager.updateTask(taskId, {
          ...existingTask,
          priority: currentUrgency ? 'Normal' : 'Urgent'
        });
      } else {
        await taskManager.updateTask(taskId, { priority: currentUrgency ? 'Normal' : 'Urgent' });
      }
      // Ensure list and badge counts refresh so Urgent tab/counter update immediately
      setTasks(filterDeadlineTasks(taskManager.getAllTasks()));
    } catch (error) {
      console.error('SortDeadlines: Error toggling urgency:', error);
    }
  }, []);

  const handleNoteClick = useCallback((task) => {
    setNoteModal({ isOpen: true, task });
  }, []);

  const handleNoteSave = useCallback(async (taskId, noteContent) => {
    try {
      const existingTask = taskManager.getTaskById(taskId);
      if (existingTask) {
        await taskManager.updateTask(taskId, { 
          ...existingTask,
          note: noteContent 
        });
      } else {
        await taskManager.updateTask(taskId, { note: noteContent });
      }
      setNoteModal({ isOpen: false, task: null });
    } catch (error) {
      console.error('SortDeadlines: Error saving note:', error);
    }
  }, []);

  const handleDeleteClick = useCallback((taskId, task) => {
    setDeleteModal({ 
      isOpen: true, 
      taskId, 
      taskName: task.title || task.task || task.Task || 'this task' 
    });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteModal.taskId) return;
    
    try {
      await taskManager.deleteTask(deleteModal.taskId);
      setDeleteModal({ isOpen: false, taskId: null, taskName: null });
    } catch (error) {
      console.error('SortDeadlines: Error deleting task:', error);
      setDeleteModal({ isOpen: false, taskId: null, taskName: null });
    }
  }, [deleteModal]);

  // Toggle task urgency using TaskManager (legacy - keeping for compatibility)
  const toggleTaskUrgency = useCallback(async (taskId, currentUrgency, shouldUpdateAll = false) => {
    const newPriority = currentUrgency ? 'Normal' : 'Urgent';
    
    try {
      setUpdating(true);
      
      if (shouldUpdateAll) {
        // Find all related tasks (same Task name and Project)
        const currentTask = tasks.find(t => t.id === taskId);
        if (currentTask) {
          const relatedTasks = tasks.filter(t => 
            (t.Task || t.title || t.task) === (currentTask.Task || currentTask.title || currentTask.task) && 
            (t.Project || t.project) === (currentTask.Project || currentTask.project)
          );
          
          // Use TaskManager batch update
          await taskManager.batchUpdate(
            relatedTasks.map(task => ({ id: task.id, updates: { priority: newPriority } }))
          );
          
          console.log('SortDeadlines: Updated urgency for', relatedTasks.length, 'related tasks');
        }
      } else {
        // Update only this task using TaskManager
        const existingTask = taskManager.getTaskById(taskId);
        if (existingTask) {
          await taskManager.updateTask(taskId, { 
            ...existingTask,
            priority: newPriority 
          });
        } else {
          await taskManager.updateTask(taskId, { priority: newPriority });
        }
      }
      
      console.log('SortDeadlines: Task urgency updated successfully');
    } catch (error) {
      console.error('SortDeadlines: Error updating task urgency:', error);
    } finally {
      setUpdating(false);
    }
  }, [tasks]);

  // Delete task using TaskManager
  const deleteTask = useCallback(async (taskId) => {
    try {
      setUpdating(true);
      await taskManager.deleteTask(taskId);
      console.log('SortDeadlines: Task deleted successfully');
    } catch (error) {
      console.error('SortDeadlines: Error deleting task:', error);
    } finally {
      setUpdating(false);
    }
  }, []);

  // Load users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersData = await microsoftDataService.users.getEnterpriseUsers();
        
        // Load local assignments from localStorage and merge with users (same as Dashboard)
        const USER_ASSIGNMENTS_KEY = 'user_assignments';
        const localAssignments = JSON.parse(localStorage.getItem(USER_ASSIGNMENTS_KEY) || '{}');
        
        // Merge enterprise users with local assignments
        const usersWithAssignments = (Array.isArray(usersData) ? usersData : []).map(user => ({
          ...user,
          departments: localAssignments[user.id]?.departments || [],
          role: localAssignments[user.id]?.role || 'VIEWER'
        }));
        
        setUsers(usersWithAssignments);
      } catch (err) {
        console.error('SortDeadlines: Error loading users:', err);
        setUsers([]);
      }
    };
    
    loadUsers();
    
    // Listen for department/role changes and refresh users in background
    const handleUserChange = async () => {
      console.log('SortDeadlines: User departments/roles changed, refreshing users...');
      try {
        const usersData = await microsoftDataService.users.getEnterpriseUsers();
        const USER_ASSIGNMENTS_KEY = 'user_assignments';
        const localAssignments = JSON.parse(localStorage.getItem(USER_ASSIGNMENTS_KEY) || '{}');
        const usersWithAssignments = (Array.isArray(usersData) ? usersData : []).map(user => ({
          ...user,
          departments: localAssignments[user.id]?.departments || [],
          role: localAssignments[user.id]?.role || 'VIEWER'
        }));
        setUsers(usersWithAssignments);
      } catch (err) {
        console.error('SortDeadlines: Error refreshing users:', err);
      }
    };

    window.addEventListener('userDepartmentsChanged', handleUserChange);
    window.addEventListener('userRoleChanged', handleUserChange);
    
    return () => {
      window.removeEventListener('userDepartmentsChanged', handleUserChange);
      window.removeEventListener('userRoleChanged', handleUserChange);
    };
  }, []);


  // Parse deadline date helper
  const parseDeadlineDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      // Parse date string carefully to avoid timezone issues
      // If in yyyy-MM-dd format, parse components directly
      if (typeof dateStr === 'string' && dateStr.includes('-')) {
        const datePart = dateStr.split('T')[0]; // Get just the date part
        const parts = datePart.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
          const day = parseInt(parts[2], 10);
          
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            // Create date at noon local time to avoid timezone shifts
            return new Date(year, month, day, 12, 0, 0);
          }
        }
      }
      
      // Fallback to date-fns parsing for other formats
      const parsed = parseISO(dateStr);
      if (isValid(parsed)) {
        parsed.setHours(12, 0, 0, 0);
        return parsed;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  // Helper function for flexible deadline search
  const matchesDeadlineSearch = (deadline, searchTerm) => {
    if (!deadline || !searchTerm) return true;
    
    const search = searchTerm.toLowerCase().trim();
    const date = parseDeadlineDate(deadline);
    if (!date) return false;

    // Month mappings for flexible search
    const monthMappings = {
      'jan': ['jan', 'january', '1', '01'],
      'feb': ['feb', 'february', '2', '02'],
      'mar': ['mar', 'march', '3', '03'],
      'apr': ['apr', 'april', '4', '04'],
      'may': ['may', '5', '05'],
      'jun': ['jun', 'june', '6', '06'],
      'jul': ['jul', 'july', '7', '07'],
      'aug': ['aug', 'august', '8', '08'],
      'sep': ['sep', 'september', '9', '09'],
      'oct': ['oct', 'october', '10'],
      'nov': ['nov', 'november', '11'],
      'dec': ['dec', 'december', '12']
    };

    // Check month
    const monthName = format(date, 'MMM').toLowerCase();
    if (monthMappings[monthName]?.some(alias => search.includes(alias))) {
      return true;
    }

    // Check year
    const year = date.getFullYear().toString();
    if (search.includes(year) || search.includes(year.slice(-2))) {
      return true;
    }

    // Check day
    const day = date.getDate().toString();
    if (search.includes(day) || search.includes(day.padStart(2, '0'))) {
      return true;
    }

    // Check full date formats
    const fullDate = format(date, 'yyyy-MM-dd');
    const shortDate = format(date, 'MM/dd/yyyy');
    const monthDay = format(date, 'MMM dd');
    const monthDayYear = format(date, 'MMM dd, yyyy');

    return search.includes(fullDate) || 
           search.includes(shortDate) || 
           search.includes(monthDay.toLowerCase()) ||
           search.includes(monthDayYear.toLowerCase());
  };

  // Helper function to check if a task matches a specific filter
  const taskMatchesFilter = (task, filter, sortBy) => {
    if (!filter) return true;
    
    switch (sortBy) {
      case 'deadline': {
        const deadline = getTaskDeadline(task);
        if (!deadline) return !filter.deadlineYear && !filter.deadlineMonth && !filter.deadlineDay;
        
        const date = parseDeadlineDate(deadline);
        if (!date) return false;

        // If no filters are set, show all
        if (!filter.deadlineYear && !filter.deadlineMonth && !filter.deadlineDay) return true;
        
        // Check year
        if (filter.deadlineYear) {
          const year = date.getFullYear().toString();
          if (!year.includes(filter.deadlineYear) && !filter.deadlineYear.includes(year)) {
            return false;
          }
        }

        // Check month
        if (filter.deadlineMonth) {
          const monthSearch = filter.deadlineMonth.toLowerCase().trim();
          const monthName = format(date, 'MMM').toLowerCase();
          const monthNumber = (date.getMonth() + 1).toString();
          const monthNumberPadded = monthNumber.padStart(2, '0');
          
          const monthMappings = {
            'jan': ['jan', 'january', '1', '01'],
            'feb': ['feb', 'february', '2', '02'],
            'mar': ['mar', 'march', '3', '03'],
            'apr': ['apr', 'april', '4', '04'],
            'may': ['may', '5', '05'],
            'jun': ['jun', 'june', '6', '06'],
            'jul': ['jul', 'july', '7', '07'],
            'aug': ['aug', 'august', '8', '08'],
            'sep': ['sep', 'september', '9', '09'],
            'oct': ['oct', 'october', '10'],
            'nov': ['nov', 'november', '11'],
            'dec': ['dec', 'december', '12']
          };

          const currentMonthAliases = monthMappings[monthName] || [];
          const matchesMonth = currentMonthAliases.some(alias => alias === monthSearch) ||
                              monthSearch === monthName ||
                              monthSearch === monthNumber ||
                              monthSearch === monthNumberPadded;

          if (!matchesMonth) {
            return false;
          }
        }

        // Check day
        if (filter.deadlineDay) {
          const day = date.getDate().toString();
          const dayPadded = day.padStart(2, '0');
          if (day !== filter.deadlineDay && dayPadded !== filter.deadlineDay) {
            return false;
          }
        }
        
        return true;
      }
      
      case 'responsibleParty': {
        if (!filter.responsibleParty) return true;
        const filterLower = filter.responsibleParty.toLowerCase();
        const responsibleNames = getResponsiblePartyNames(task.ResponsibleParty).toLowerCase();
        return responsibleNames.includes(filterLower);
      }
      
      case 'department': {
        if (!filter.department || filter.department.length === 0) return true;
        
        // Helper function to normalize department names to match DEPARTMENTS values
        const normalizeDept = (dept) => {
          if (!dept) return null;
          const deptLower = dept.toLowerCase().trim();
          
          // Direct match against DEPARTMENTS values
          const deptValues = Object.values(DEPARTMENTS).map(d => d.toLowerCase());
          const matchedIndex = deptValues.findIndex(d => d === deptLower);
          if (matchedIndex >= 0) {
            return Object.values(DEPARTMENTS)[matchedIndex];
          }
          
          // Fuzzy match
          if (deptLower.includes('development')) return DEPARTMENTS.DEVELOPMENT;
          if (deptLower.includes('compliance')) return DEPARTMENTS.COMPLIANCE;
          if (deptLower.includes('accounting')) return DEPARTMENTS.ACCOUNTING;
          if (deptLower.includes('management')) return DEPARTMENTS.MANAGEMENT;
          if (deptLower.includes('human resources') || deptLower.includes('hr')) return DEPARTMENTS.HUMAN_RESOURCES;
          if (deptLower.includes('construction')) return DEPARTMENTS.CONSTRUCTION;
          
          return null;
        };
        
        // PRIMARY: Get department directly from task (comma-separated string)
        const taskDepartmentValue = task.department || task.Department || '';
        let taskDepartments = new Set();
        
        if (taskDepartmentValue && taskDepartmentValue.trim() !== '') {
          // Parse comma-separated departments and normalize
          const parsed = taskDepartmentValue.split(',').map(d => d.trim()).filter(Boolean);
          parsed.forEach(dept => {
            const normalized = normalizeDept(dept);
            if (normalized) taskDepartments.add(normalized);
          });
        }
        
        // FALLBACK: If no direct department assignment, derive from responsible party
        if (taskDepartments.size === 0 && users && users.length > 0) {
          const responsibleParty = task.ResponsibleParty || task.responsibleParty || '';
          
          // Find all users assigned to this task
          const assignedUsers = users.filter(user => {
            const userEmail = user.email || user.Email || user.mail || user.userPrincipalName || '';
            const userDisplayName = user.displayName || user.DisplayName || '';
            return responsibleParty && responsibleParty.trim() !== '' && 
                   (responsibleParty.includes(userEmail) || responsibleParty.includes(userDisplayName));
          });
          
          // Collect all unique departments from all assigned users
          assignedUsers.forEach(assignedUser => {
            const userDepartments = assignedUser.departments || [];
            userDepartments.forEach(department => {
              if (department) {
                const normalized = normalizeDept(department);
                if (normalized) taskDepartments.add(normalized);
              }
            });
          });
        }
        
        // Normalize filter departments and check if task belongs to any
        const normalizedFilterDepts = filter.department.map(dept => normalizeDept(dept)).filter(Boolean);
        return normalizedFilterDepts.some(filterDept => taskDepartments.has(filterDept));
      }
      
      case 'project': {
        if (!filter.project) return true;
        const filterLower = filter.project.toLowerCase();
        const proj = (task.Project || '').toLowerCase();
        return proj.includes(filterLower);
      }
      
      case 'search': {
        if (!filter.search) return true;
        const filterLower = filter.search.toLowerCase();
        const taskName = (task.Task || '').toLowerCase();
        const project = (task.Project || '').toLowerCase();
        const responsiblePartyNames = getResponsiblePartyNames(task.ResponsibleParty).toLowerCase();
        const notes = (task.Notes || '').toLowerCase();
        
        return taskName.includes(filterLower) || 
               project.includes(filterLower) || 
               responsiblePartyNames.includes(filterLower) || 
               notes.includes(filterLower);
      }
      
      default:
        return true;
    }
  };

  // Helper function for separate deadline search fields (legacy - kept for backward compatibility)
  const matchesSeparateDeadlineSearch = (deadline) => {
    if (!deadline) return true;
    
    const date = parseDeadlineDate(deadline);
    if (!date) return false;

    // If no filters are set, show all
    if (!deadlineYear && !deadlineMonth && !deadlineDay) return true;

    // Check year
    if (deadlineYear) {
      const year = date.getFullYear().toString();
      if (!year.includes(deadlineYear) && !deadlineYear.includes(year)) {
        return false;
      }
    }

    // Check month (support abbreviated, full, and numeric)
    if (deadlineMonth) {
      const monthSearch = deadlineMonth.toLowerCase().trim();
      const monthName = format(date, 'MMM').toLowerCase();
      const monthNumber = (date.getMonth() + 1).toString();
      const monthNumberPadded = monthNumber.padStart(2, '0');
      
      const monthMappings = {
        'jan': ['jan', 'january', '1', '01'],
        'feb': ['feb', 'february', '2', '02'],
        'mar': ['mar', 'march', '3', '03'],
        'apr': ['apr', 'april', '4', '04'],
        'may': ['may', '5', '05'],
        'jun': ['jun', 'june', '6', '06'],
        'jul': ['jul', 'july', '7', '07'],
        'aug': ['aug', 'august', '8', '08'],
        'sep': ['sep', 'september', '9', '09'],
        'oct': ['oct', 'october', '10'],
        'nov': ['nov', 'november', '11'],
        'dec': ['dec', 'december', '12']
      };

      const currentMonthAliases = monthMappings[monthName] || [];
      const matchesMonth = currentMonthAliases.some(alias => alias === monthSearch) ||
                          monthSearch === monthName ||
                          monthSearch === monthNumber ||
                          monthSearch === monthNumberPadded;

      if (!matchesMonth) {
        return false;
      }
    }

    // Check day
    if (deadlineDay) {
      const day = date.getDate().toString();
      const dayPadded = day.padStart(2, '0');
      if (day !== deadlineDay && dayPadded !== deadlineDay) {
        return false;
      }
    }

    return true;
  };

  // Get calculated status
  const getCalculatedStatus = useCallback((task) => getTaskStatus(task), []);

  // Convert responsible party emails to display names
  const getResponsiblePartyNames = (responsibleParty) => {
    if (!responsibleParty || !users || users.length === 0) {
      return String(responsibleParty || 'Unassigned');
    }

    // Handle if responsibleParty is an array or object
    if (typeof responsibleParty !== 'string') {
      if (Array.isArray(responsibleParty)) {
        return responsibleParty.map(rp => {
          if (typeof rp === 'object' && rp.LookupValue) {
            return rp.LookupValue;
          }
          return String(rp);
        }).join(', ');
      } else if (typeof responsibleParty === 'object' && responsibleParty.LookupValue) {
        return responsibleParty.LookupValue;
      }
      return String(responsibleParty);
    }

    const emails = responsibleParty.split(';').map(email => email.trim());
    const names = emails.map(email => {
      const user = users.find(u => 
        u.mail === email || 
        u.userPrincipalName === email || 
        u.email === email || 
        u.Email === email
      );
      return user ? user.displayName : email;
    });

    return names.join(', ');
  };

  // Calculate base filtered tasks (department filter + cascading filters, WITHOUT activeFilter)
  // This is used for counts and header total
  const baseFilteredTasks = useMemo(() => {
    // First apply department filter using shared function
    let preFiltered = getVisibleTasks(tasks, {
      isFilterActive,
      userDepartments,
      users
    });
    
    // Apply cascading filters (same logic as filteredAndSortedTasks)
    let filtered = preFiltered.filter(task => {
      // Apply cascading filters - each filter applies to results of previous filters
      for (let i = 0; i < sortBars.length; i++) {
        const sortBar = sortBars[i];
        const filter = filters[i] || {};
        
        if (!taskMatchesFilter(task, filter, sortBar.sortBy)) {
          return false;
        }
      }
      
      // Legacy filter support
      const primarySortBy = sortBars[0]?.sortBy || 'deadline';
      if (primarySortBy === 'deadline' && (deadlineYear || deadlineMonth || deadlineDay)) {
        if (!filters[0]?.deadlineYear && !filters[0]?.deadlineMonth && !filters[0]?.deadlineDay) {
          if (!matchesSeparateDeadlineSearch(getTaskDeadline(task))) return false;
        }
      } else if (primarySortBy === 'department' && selectedDepartments.length > 0) {
        if (!filters[0]?.department || filters[0].department.length === 0) {
          const responsibleParty = task.ResponsibleParty || task.responsibleParty || '';
          const assignedUsers = users.filter(user => {
            const userEmail = user.email || user.Email || user.mail || user.userPrincipalName || '';
            const userDisplayName = user.displayName || user.DisplayName || '';
            return responsibleParty && responsibleParty.trim() !== '' && 
                   (responsibleParty.includes(userEmail) || responsibleParty.includes(userDisplayName));
          });
          const taskDepartments = new Set();
          assignedUsers.forEach(assignedUser => {
            const userDepartments = assignedUser.departments || [];
            userDepartments.forEach(department => {
              taskDepartments.add(department);
            });
          });
          if (!selectedDepartments.some(dept => taskDepartments.has(dept))) return false;
        }
      } else if (secondaryFilter) {
        const filterLower = secondaryFilter.toLowerCase();
        switch (primarySortBy) {
          case 'search':
          case 'task':
            const taskName = (task.Task || task.task || '').toLowerCase();
            if (!taskName.includes(filterLower)) return false;
            break;
          case 'responsibleParty':
            if (!filters[0]?.responsibleParty) {
              const responsibleNames = getResponsiblePartyNames(task.ResponsibleParty).toLowerCase();
              if (!responsibleNames.includes(filterLower)) return false;
            }
            break;
          case 'project':
            if (!filters[0]?.project) {
              const proj = (task.Project || '').toLowerCase();
              if (!proj.includes(filterLower)) return false;
            }
            break;
        }
      }
      
      return true;
    });
    
    return filtered;
  }, [tasks, sortBars, filters, secondaryFilter, deadlineYear, deadlineMonth, deadlineDay, selectedDepartments, users, isFilterActive, userDepartments, getResponsiblePartyNames]);

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    // Use baseFilteredTasks (already has department + cascading filters applied)
    // Now just apply activeFilter (status filter)
    let filteredList = baseFilteredTasks.filter(task => {
      const status = getCalculatedStatus(task);
      const priority = (task.Priority || task.priority || '').toLowerCase();
      const isUrgent = priority === 'urgent';
      const isActiveStatus = status === 'Active' || status === 'Due Soon';

      if (activeFilter === 'active' && !isActiveStatus) return false;
      if (activeFilter === 'overdue' && status !== 'Overdue') return false;
      if (activeFilter === 'complete' && status !== 'Completed') return false;
      if (activeFilter === 'urgent' && !(isUrgent && isActiveStatus)) return false;

      return true;
    });

    // Helper function to get sort value for a task
    const getSortValue = (task, sortBy) => {
      switch (sortBy) {
        case 'deadline':
          return parseDeadlineDate(getTaskDeadline(task)) || new Date(0);
        case 'project':
          return (task.Project || '').toLowerCase();
        case 'responsibleParty':
        case 'department':
        case 'search':
        case 'task':
        default:
          // For all non-project sorts, default to chronological (deadline) sorting
          return parseDeadlineDate(getTaskDeadline(task)) || new Date(0);
      }
    };

    // Multi-level sorting: apply each sort bar in order
    filteredList.sort((a, b) => {
      for (let i = 0; i < sortBars.length; i++) {
        const sortBar = sortBars[i];
        const aValue = getSortValue(a, sortBar.sortBy);
        const bValue = getSortValue(b, sortBar.sortBy);
        
        let comparison = 0;
        
        if (sortBar.sortBy === 'project') {
          // Alphabetical sorting for project
          if (aValue < bValue) comparison = -1;
          else if (aValue > bValue) comparison = 1;
          
          // If projects are equal, add secondary chronological sort by deadline
          if (comparison === 0) {
            const aDeadline = parseDeadlineDate(getTaskDeadline(a)) || new Date(0);
            const bDeadline = parseDeadlineDate(getTaskDeadline(b)) || new Date(0);
            comparison = aDeadline - bDeadline;
          }
        } else {
          // Chronological/numerical sorting for deadline and others
          if (aValue < bValue) comparison = -1;
          else if (aValue > bValue) comparison = 1;
        }
        
        // Apply sort order
        if (comparison !== 0) {
          return sortBar.sortOrder === 'asc' ? comparison : -comparison;
        }
        // If equal, continue to next sort level
      }
      return 0; // All levels equal
    });

    return filteredList;
  }, [baseFilteredTasks, activeFilter, getCalculatedStatus]);

  // Single source of truth for badge counts: always derived from baseFilteredTasks
  // (department filter + cascading filters). Ensures counts match visible tasks.
  const badgeCounts = useMemo(() => {
    const activeCount = baseFilteredTasks.filter(task => {
      const status = getCalculatedStatus(task);
      return status === 'Active' || status === 'Due Soon';
    }).length;
    const overdueCount = baseFilteredTasks.filter(task =>
      getCalculatedStatus(task) === 'Overdue'
    ).length;
    const completeCount = baseFilteredTasks.filter(task =>
      getCalculatedStatus(task) === 'Completed'
    ).length;
    const isUrgentTask = (task) => {
      const status = getCalculatedStatus(task);
      const priority = (task.Priority || task.priority || '').toLowerCase();
      return (status === 'Active' || status === 'Due Soon') && priority === 'urgent';
    };
    const urgentCount = baseFilteredTasks.filter(isUrgentTask).length;
    return {
      activeCount,
      overdueCount,
      completeCount,
      urgentCount,
      totalCount: baseFilteredTasks.length
    };
  }, [baseFilteredTasks, getCalculatedStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative">
      {/* Updating Overlay */}
      {updating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4 border border-gray-200 dark:border-gray-700">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Updating...</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Syncing with database</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 dark:from-white dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent">
              Sort Deadlines
            </h1>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {filteredAndSortedTasks.length} of {baseFilteredTasks.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Tasks
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Filter Tasks Island */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 dark:border-gray-700/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <FunnelIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Filter Tasks
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'active', label: 'Active', count: badgeCounts.activeCount, color: 'blue' },
                { key: 'overdue', label: 'Overdue', count: badgeCounts.overdueCount, color: 'red' },
                { key: 'complete', label: 'Complete', count: badgeCounts.completeCount, color: 'green' },
                { key: 'urgent', label: 'Urgent', count: badgeCounts.urgentCount, color: 'orange' },
                { key: 'all', label: 'All', count: badgeCounts.totalCount, color: 'gray' }
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`group relative px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    activeFilter === filter.key
                      ? `bg-gradient-to-r ${
                          filter.color === 'blue' ? 'from-blue-500 to-blue-600' :
                          filter.color === 'red' ? 'from-red-500 to-red-600' :
                          filter.color === 'green' ? 'from-green-500 to-green-600' :
                          filter.color === 'orange' ? 'from-orange-500 to-orange-600' :
                          'from-gray-500 to-gray-600'
                        } text-white shadow-md`
                      : 'bg-white/60 dark:bg-gray-700/60 hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-sm'
                  }`}
                >
                  <span className="relative z-10">{filter.label}</span>
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeFilter === filter.key 
                      ? 'bg-white/20 text-white' 
                      : `bg-${filter.color}-100 text-${filter.color}-700 dark:bg-${filter.color}-900/30 dark:text-${filter.color}-300`
                  }`}>
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sort & Filter Island - Multiple Sort Bars */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 dark:border-gray-700/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Sort & Filter
              </h3>
            </div>
            <div className="space-y-2">
              {sortBars.map((sortBar, index) => (
                <div key={sortBar.id || index} className="flex gap-2 items-center">
                  <select
                    value={sortBar.sortBy}
                    onChange={(e) => updateSortBar(index, 'sortBy', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border-0 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm text-gray-900 dark:text-gray-100 text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200"
                  >
                    <option value="deadline">Deadline</option>
                    <option value="project">Project</option>
                    <option value="responsibleParty">Responsible Party</option>
                    <option value="department">Department</option>
                    <option value="search">Search</option>
                  </select>
                  <select
                    value={sortBar.sortOrder}
                    onChange={(e) => updateSortBar(index, 'sortOrder', e.target.value)}
                    className="px-3 py-2 rounded-lg border-0 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm text-gray-900 dark:text-gray-100 text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200"
                  >
                    <option value="asc">↑</option>
                    <option value="desc">↓</option>
                  </select>
                  {index > 0 && (
                    <button
                      onClick={() => removeSortBar(index)}
                      className="px-2 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all duration-200"
                      title="Remove sort"
                    >
                      <MinusIcon className="w-4 h-4" />
                    </button>
                  )}
                  {index === sortBars.length - 1 && sortBars.length < 4 && (
                    <button
                      onClick={addSortBar}
                      className="px-2 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all duration-200"
                      title="Add another sort"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cascading Filters - One filter bar per sort bar */}
        <div className="space-y-3">
          {sortBars.map((sortBar, index) => {
            const filter = filters[index] || {};
            const sortBy = sortBar.sortBy;
            const hasFilterValue = sortBy === 'deadline' 
              ? (filter.deadlineYear || filter.deadlineMonth || filter.deadlineDay)
              : sortBy === 'department'
              ? (filter.department && filter.department.length > 0)
              : sortBy === 'search'
              ? filter.search
              : sortBy === 'responsibleParty'
              ? filter.responsibleParty
              : sortBy === 'project'
              ? filter.project
              : false;

            if (sortBy !== 'deadline' && sortBy !== 'responsibleParty' && sortBy !== 'project' && sortBy !== 'department' && sortBy !== 'search') {
              return null;
            }

            return (
              <div key={`filter-${sortBar.id || index}`} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 dark:border-gray-700/50 p-4 animate-in slide-in-from-top-2 duration-300">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <MagnifyingGlassIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                        {sortBy === 'search' ? 'Search:' : `Filter by ${sortBy === 'deadline' ? 'Deadline' : sortBy === 'responsibleParty' ? 'Responsible Party' : sortBy === 'department' ? 'Department' : 'Project'}:`}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      {sortBy === 'deadline' ? (
                        <div className="flex gap-2 flex-wrap items-center">
                          <input
                            type="text"
                            placeholder="Year (e.g., 2025)"
                            value={filter.deadlineYear || ''}
                            onChange={(e) => updateFilter(index, 'deadlineYear', e.target.value)}
                            className="flex-1 min-w-[100px] px-3 py-2 rounded-lg border-0 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm text-gray-900 dark:text-gray-100 text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200 placeholder-gray-500 dark:placeholder-gray-400"
                          />
                          <input
                            type="text"
                            placeholder="Month (e.g., Oct, 10, October)"
                            value={filter.deadlineMonth || ''}
                            onChange={(e) => updateFilter(index, 'deadlineMonth', e.target.value)}
                            className="flex-1 min-w-[120px] px-3 py-2 rounded-lg border-0 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm text-gray-900 dark:text-gray-100 text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200 placeholder-gray-500 dark:placeholder-gray-400"
                          />
                          <input
                            type="text"
                            placeholder="Day (e.g., 3, 03)"
                            value={filter.deadlineDay || ''}
                            onChange={(e) => updateFilter(index, 'deadlineDay', e.target.value)}
                            className="flex-1 min-w-[80px] px-3 py-2 rounded-lg border-0 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm text-gray-900 dark:text-gray-100 text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200 placeholder-gray-500 dark:placeholder-gray-400"
                          />
                          {/* Clear button inline for deadline */}
                          {hasFilterValue && (
                            <button
                              onClick={() => {
                                const newFilters = [...filters];
                                newFilters[index] = {
                                  ...newFilters[index],
                                  deadlineYear: '',
                                  deadlineMonth: '',
                                  deadlineDay: ''
                                };
                                setFilters(newFilters);
                              }}
                              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 flex-shrink-0"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      ) : sortBy === 'department' ? (
                        <div className="flex gap-2 flex-wrap items-center">
                          {/* Only show accessible departments when filter is active */}
                          {(isFilterActive 
                            ? getAccessibleDepartments(Object.values(DEPARTMENTS))
                            : Object.values(DEPARTMENTS)
                          ).map(dept => {
                            const isSelected = (filter.department || []).includes(dept);
                            // Get department-specific color
                            const deptColorClass = getDepartmentColor(dept);
                            // Create hover variant
                            const hoverColorClass = deptColorClass.replace('bg-', 'hover:bg-').replace('-500', '-600');
                            
                            return (
                              <button
                                key={dept}
                                onClick={() => updateFilter(index, 'department', dept)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex-shrink-0 ${
                                  isSelected
                                    ? `${deptColorClass} text-white shadow-md ${hoverColorClass}`
                                    : 'bg-white/60 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 shadow-sm'
                                }`}
                              >
                                {getDepartmentDisplayName(dept)}
                              </button>
                            );
                          })}
                          {/* Clear button inline for department */}
                          {hasFilterValue && (
                            <button
                              onClick={() => updateFilter(index, 'department', [])}
                              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 flex-shrink-0"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            placeholder={
                              sortBy === 'search'
                                ? 'Search tasks, projects, responsible parties, or notes...'
                                : sortBy === 'responsibleParty' 
                                  ? 'e.g., "John", "Smith", "john@company.com"'
                                  : 'e.g., "Project Alpha", "Development"'
                            }
                            value={filter[sortBy] || ''}
                            onChange={(e) => updateFilter(index, sortBy, e.target.value)}
                            className="flex-1 px-4 py-2 rounded-lg border-0 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm text-gray-900 dark:text-gray-100 text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200 placeholder-gray-500 dark:placeholder-gray-400"
                          />
                          {/* Clear button inline for other filters */}
                          {hasFilterValue && (
                            <button
                              onClick={() => updateFilter(index, sortBy, '')}
                              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 flex-shrink-0"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Results */}
        <div className="space-y-4">
          {filteredAndSortedTasks.length > 0 ? (
            filteredAndSortedTasks.map((task, index) => {
                // Add daysUntil calculation for TaskCard
                const deadline = parseDeadlineDate(getTaskDeadline(task));
                const today = new Date();
                // Normalize both dates to start of day for accurate calculation
                const deadlineStartOfDay = deadline ? new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate()) : null;
                const todayStartOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const daysUntil = deadlineStartOfDay ? Math.floor((deadlineStartOfDay - todayStartOfDay) / (1000 * 60 * 60 * 24)) : null;
                
                return (
                <TaskCard
                  key={task.id}
                  task={{
                    ...task,
                    daysUntil: daysUntil
                  }}
                  className="backdrop-blur-sm hover:scale-[1.02] hover:shadow-lg"
                  style={{ animationDelay: `${index * 30}ms` }}
                  users={users}
                  onToggleComplete={handleToggleComplete}
                  onToggleUrgent={handleToggleUrgent}
                  onNoteClick={handleNoteClick}
                  onDeleteClick={handleDeleteClick}
                />
                );
              })
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center">
                <FunnelIcon className="w-8 h-8 text-gray-500 dark:text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No tasks found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your filters to see more results</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <NoteModal
        isOpen={noteModal.isOpen}
        onClose={() => setNoteModal({ isOpen: false, task: null })}
        task={noteModal.task}
        onSave={handleNoteSave}
      />
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, taskId: null, taskName: null })}
        onConfirm={handleDeleteConfirm}
        itemName={deleteModal.taskName}
      />
    </div>
  );
}

export default SortDeadlinesPage;
