import React, { useState, useEffect, useCallback } from 'react';
import { taskManager } from './services/taskManager';
import { parse, isValid, isThisWeek, format, differenceInDays, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { microsoftDataService } from './microsoftDataService';
import { useAuth } from './Auth';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  ExclamationTriangleIcon, 
  CalendarDaysIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import TaskCard from './TaskCard';
import NoteModal from './components/NoteModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import taskSyncService from './taskSyncService';
import { 
  getTaskTitle, 
  getTaskDeadline, 
  parseDeadlineDate, 
  isTaskCompleted, 
  getTaskPriority, 
  getTaskProject, 
  getTaskResponsibleParty,
  filterDeadlineTasks,
  taskBelongsToUserDepartments
} from './utils/taskHelpers';

// Department constants
const DEPARTMENTS = {
  DEVELOPMENT: 'development',
  ACCOUNTING: 'accounting', 
  COMPLIANCE: 'compliance',
  MANAGEMENT: 'management'
};

const DEPARTMENT_NAMES = {
  [DEPARTMENTS.DEVELOPMENT]: 'Development',
  [DEPARTMENTS.ACCOUNTING]: 'Accounting',
  [DEPARTMENTS.COMPLIANCE]: 'Compliance',
  [DEPARTMENTS.MANAGEMENT]: 'Management'
};

const DEPARTMENT_COLORS = {
  [DEPARTMENTS.DEVELOPMENT]: 'bg-blue-500',
  [DEPARTMENTS.ACCOUNTING]: 'bg-green-500',
  [DEPARTMENTS.COMPLIANCE]: 'bg-purple-500',
  [DEPARTMENTS.MANAGEMENT]: 'bg-orange-500'
};

const DEPARTMENT_TEXT_COLORS = {
  [DEPARTMENTS.DEVELOPMENT]: 'text-blue-500',
  [DEPARTMENTS.ACCOUNTING]: 'text-green-500',
  [DEPARTMENTS.COMPLIANCE]: 'text-purple-500',
  [DEPARTMENTS.MANAGEMENT]: 'text-orange-500'
};

function Dashboard({ users }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [departmentProgressKey, setDepartmentProgressKey] = useState(0);
  const [departmentFilterEnabled, setDepartmentFilterEnabled] = useState(false);
  
  // Modal states
  const [noteModal, setNoteModal] = useState({ isOpen: false, task: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, taskId: null, taskName: null });
  const { userProfile } = useAuth();

  // Task completion management moved to Database page

  // Load tasks from TaskManager and subscribe to events
  const loadTasks = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      // Initialize TaskManager if not already initialized or force refresh requested
      if (forceRefresh || !taskManager.isInitialized) {
        await taskManager.initialize(forceRefresh);
      }
      
      // Get tasks from TaskManager (from memory, no API call)
      const allTasks = taskManager.getAllTasks();
      
      // CRITICAL: Only use tasks that exist in the database
      // Filter out any tasks that don't have proper IDs or are malformed
      const validTasks = Array.isArray(allTasks) ? allTasks.filter(task => {
        // Ensure task has a valid ID
        if (!task || !task.id) return false;
        // Ensure task has required fields
        if (!task.title && !task.Task && !task.task) return false;
        return true;
      }) : [];
      
      // Filter out recurring templates - only show actual deadline instances
      const deadlineTasks = filterDeadlineTasks(validTasks);
      
      // FULL DIAGNOSTIC: Log all Depot tasks specifically
      const depotTasks = validTasks.filter(t => {
        const project = (t.project || t.Project || '').toLowerCase();
        const title = (t.title || t.Task || t.task || '').toLowerCase();
        return project.includes('depot') || title.includes('depot');
      });
      
      if (depotTasks.length > 0) {
        console.group('🔍 Dashboard: DEPOT TASKS DIAGNOSTIC');
        console.log('Total Depot tasks found:', depotTasks.length);
        console.log('Depot task IDs:', depotTasks.map(t => t.id));
        console.log('Depot task details:', depotTasks.map(t => ({
          id: t.id,
          title: t.title || t.Task || t.task,
          project: t.project || t.Project,
          deadline: t.deadline_date || t.deadline || t.Deadline,
          hasRecurrence: !!t.recurrence,
          hasTemplateId: !!t.templateId
        })));
        console.groupEnd();
      } else {
        console.log('✅ Dashboard: No Depot tasks found in database');
      }
      
      console.log('🔍 Dashboard: ONE-TIME DATA CLEANUP COMPLETE');
      console.log('🔍 Dashboard: Total tasks loaded from database:', validTasks.length);
      console.log('🔍 Dashboard: Deadline tasks after filtering:', deadlineTasks.length);
      console.log('🔍 Dashboard: Tasks in TaskManager:', taskManager.getAllTasks().length);
      
      // Diagnostic: Log all tasks for Rancho Mission Viejo
      const ranchoAllTasks = validTasks.filter(t => {
        const project = t.project || t.Project || '';
        const title = t.title || t.Task || t.task || '';
        return project.toLowerCase().includes('rancho') || 
               project.toLowerCase().includes('mission') || 
               project.toLowerCase().includes('viejo') ||
               title.toLowerCase().includes('rancho') ||
               title.toLowerCase().includes('mission') ||
               title.toLowerCase().includes('viejo');
      });
      
      console.log('🔍 Dashboard: All Rancho-related tasks in database:', ranchoAllTasks.length);
      if (ranchoAllTasks.length > 0) {
        const ranchoDetails = ranchoAllTasks.map(t => ({
          id: t.id,
          title: t.title || t.Task || t.task,
          project: t.project || t.Project,
          deadline: t.deadline_date || t.deadline || t.Deadline,
          hasRecurrence: !!t.recurrence,
          hasTemplateId: !!t.templateId,
          isTemplate: !!(t.recurrence && !t.templateId),
          completed: t.completed || t.Completed || false
        }));
        
        console.log('🔍 Dashboard: Rancho tasks breakdown:', {
          total: ranchoAllTasks.length,
          templates: ranchoAllTasks.filter(t => t.recurrence && !t.templateId).length,
          instances: ranchoAllTasks.filter(t => t.templateId).length,
          solo: ranchoAllTasks.filter(t => !t.recurrence && !t.templateId).length
        });
        
        console.log('🔍 Dashboard: ALL Rancho tasks (full details):', ranchoDetails);
        
        // Check which ones are in current year
        const currentYear = new Date().getFullYear();
        const yearStart = startOfYear(new Date(currentYear, 0, 1));
        const yearEnd = endOfYear(new Date(currentYear, 11, 31));
        
        const ranchoInCurrentYear = ranchoDetails.filter(t => {
          const deadlineStr = t.deadline;
          const deadline = parseDeadlineDate(deadlineStr);
          return deadline && isWithinInterval(deadline, { start: yearStart, end: yearEnd });
        });
        
        console.log('🔍 Dashboard: Rancho tasks in CURRENT YEAR (2025):', ranchoInCurrentYear.length);
        console.log('🔍 Dashboard: Rancho tasks in current year details:', ranchoInCurrentYear);
        
        // Check for duplicates by ID
        const ranchoIds = ranchoDetails.map(t => t.id);
        const duplicateIds = ranchoIds.filter((id, index) => ranchoIds.indexOf(id) !== index);
        if (duplicateIds.length > 0) {
          console.warn('⚠️ Dashboard: Found duplicate Rancho task IDs:', duplicateIds);
        }
      } else {
        console.log('✅ Dashboard: No Rancho Mission Viejo tasks found in database');
      }
      
      setTasks(deadlineTasks);
    } catch (error) {
      console.error('Dashboard: Error loading tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initialize and load tasks
    loadTasks(true);
    
    // Subscribe to TaskManager events for instant updates
    const unsubscribe = taskManager.subscribe(({ type, tasks: updatedTasks, task, taskId, ...data }) => {
      if (type === 'refreshed' || type === 'created' || type === 'updated' || type === 'deleted' || type === 'batchCreated' || type === 'batchUpdated' || type === 'batchDeleted') {
        // Reload tasks from TaskManager
        const allTasks = taskManager.getAllTasks();
        const validTasks = Array.isArray(allTasks) ? allTasks.filter(task => {
          if (!task || !task.id) return false;
          if (!task.title && !task.Task && !task.task) return false;
          return true;
        }) : [];
        const deadlineTasks = filterDeadlineTasks(validTasks);
        setTasks(deadlineTasks);
      }
      
      if (type === 'loading') {
        setLoading(data.isLoading);
      }
    });
    
    // Also listen to DOM events for cross-component communication
    const handleTaskDataChanged = (event) => {
      const { type } = event.detail;
      if (type === 'refreshed' || type === 'created' || type === 'updated' || type === 'deleted' || type === 'batchCreated' || type === 'batchUpdated' || type === 'batchDeleted') {
        const allTasks = taskManager.getAllTasks();
        const validTasks = Array.isArray(allTasks) ? allTasks.filter(task => {
          if (!task || !task.id) return false;
          if (!task.title && !task.Task && !task.task) return false;
          return true;
        }) : [];
        const deadlineTasks = filterDeadlineTasks(validTasks);
        setTasks(deadlineTasks);
      }
    };
    
    window.addEventListener('taskDataChanged', handleTaskDataChanged);
    
    // Legacy event listener for backward compatibility
    const handleTaskDeleted = (event) => {
      // TaskManager events handle this, but keep for compatibility
      loadTasks(true);
    };
    window.addEventListener('taskDeleted', handleTaskDeleted);
    
    // Refresh when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadTasks(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('Dashboard: Loading timeout, setting loading to false');
      setLoading(false);
    }, 5000); // Reduced to 5 second timeout

    return () => {
      clearTimeout(timeout);
      unsubscribe();
      window.removeEventListener('taskDataChanged', handleTaskDataChanged);
      window.removeEventListener('taskDeleted', handleTaskDeleted);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadTasks]);

  // Get current user's departments (must be defined before getFilteredTasks)
  const getCurrentUserDepartments = () => {
    if (!userProfile?.id) return [];
    const USER_ASSIGNMENTS_KEY = 'user_assignments';
    const localAssignments = JSON.parse(localStorage.getItem(USER_ASSIGNMENTS_KEY) || '{}');
    return localAssignments[userProfile.id]?.departments || [];
  };

  // Filter tasks by department if setting is enabled (must be defined before getCurrentYearTasks)
  const getFilteredTasks = (taskList) => {
    if (!departmentFilterEnabled) {
      return taskList;
    }
    
    const userDepartments = getCurrentUserDepartments();
    if (!userDepartments || userDepartments.length === 0) {
      return taskList; // If user has no departments, show all
    }

    return taskList.filter(task => 
      taskBelongsToUserDepartments(task, userDepartments, users)
    );
  };

  // Get current year tasks for progress tracking
  const getCurrentYearTasks = () => {
    const currentYear = new Date().getFullYear();
    const yearStart = startOfYear(new Date(currentYear, 0, 1));
    const yearEnd = endOfYear(new Date(currentYear, 11, 31));
    
    const yearTasks = tasks.filter(task => {
      const deadlineStr = getTaskDeadline(task);
      const deadline = parseDeadlineDate(deadlineStr);
      return deadline && isWithinInterval(deadline, { start: yearStart, end: yearEnd });
    });
    
    return getFilteredTasks(yearTasks);
  };

  const currentYearTasks = getCurrentYearTasks();

  // Calculate status
  const getCalculatedStatus = (task) => {
    if (isTaskCompleted(task)) return 'Completed';
    
    const deadlineStr = getTaskDeadline(task);
    const deadline = parseDeadlineDate(deadlineStr);
    if (deadline && deadline < new Date()) return 'Overdue';
    
    return 'Active';
  };

  // Calculate top metrics
  const getTopMetrics = () => {
    const totalTasks = currentYearTasks.length;
    const completedTasks = currentYearTasks.filter(task => isTaskCompleted(task)).length;
    const urgentTasks = currentYearTasks.filter(task => getTaskPriority(task) === 'Urgent').length;
    
    const weekTasks = tasks.filter(task => {
      const deadlineStr = getTaskDeadline(task);
      const deadline = parseDeadlineDate(deadlineStr);
      return deadline && isThisWeek(deadline);
    });
    const filteredWeekTasks = getFilteredTasks(weekTasks);
    const tasksThisWeek = filteredWeekTasks.length;

    const overdueTasksList = tasks.filter(task => getCalculatedStatus(task) === 'Overdue');
    const filteredOverdueTasks = getFilteredTasks(overdueTasksList);
    const overdueTasks = filteredOverdueTasks.length;

    return {
      total: totalTasks,
      completed: completedTasks,
      urgent: urgentTasks,
      dueThisWeek: tasksThisWeek,
      overdue: overdueTasks
    };
  };

  const metrics = getTopMetrics();

  // Get tasks due this week
  const getTasksThisWeek = () => {
    const weekTasks = tasks.filter(task => {
      const deadlineStr = getTaskDeadline(task);
      const deadline = parseDeadlineDate(deadlineStr);
      return deadline && isThisWeek(deadline);
    });
    
    const filteredWeekTasks = getFilteredTasks(weekTasks);
    
    return filteredWeekTasks.map(task => {
      const deadlineStr = getTaskDeadline(task);
      const deadline = parseDeadlineDate(deadlineStr);
      const today = new Date();
      const todayAtNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
      const deadlineStartOfDay = deadline ? new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate()) : null;
      const todayStartOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const daysUntil = deadlineStartOfDay ? differenceInDays(deadlineStartOfDay, todayStartOfDay) : 0;
      
      return {
        ...task,
        deadline,
        daysUntil,
        isCompleted: isTaskCompleted(task)
      };
    }).sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      return a.daysUntil - b.daysUntil;
    });
  };

  const tasksThisWeek = getTasksThisWeek();

  // Action handlers for TaskCard
  const handleToggleComplete = useCallback(async (taskId, currentStatus) => {
    try {
      await taskManager.updateTask(taskId, { completed: !currentStatus });
    } catch (error) {
      console.error('Dashboard: Error toggling completion:', error);
    }
  }, []);

  const handleToggleUrgent = useCallback(async (taskId, currentUrgency) => {
    try {
      await taskManager.updateTask(taskId, { priority: currentUrgency ? 'Normal' : 'Urgent' });
    } catch (error) {
      console.error('Dashboard: Error toggling urgency:', error);
    }
  }, []);

  const handleNoteClick = useCallback((task) => {
    setNoteModal({ isOpen: true, task });
  }, []);

  const handleNoteSave = useCallback(async (taskId, noteContent) => {
    try {
      await taskManager.updateTask(taskId, { note: noteContent });
      setNoteModal({ isOpen: false, task: null });
    } catch (error) {
      console.error('Dashboard: Error saving note:', error);
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
      console.error('Dashboard: Error deleting task:', error);
      setDeleteModal({ isOpen: false, taskId: null, taskName: null });
    }
  }, [deleteModal]);

  // Get department progress
  const getDepartmentProgress = (tasksToUse = currentYearTasks) => {
    const progress = {};
    
    // Load user assignments from localStorage
    const USER_ASSIGNMENTS_KEY = 'user_assignments';
    let localAssignments = {};
    
    try {
      const storedAssignments = localStorage.getItem(USER_ASSIGNMENTS_KEY);
      if (storedAssignments) {
        localAssignments = JSON.parse(storedAssignments);
      }
    } catch (error) {
      console.error('Dashboard: Error parsing localStorage assignments:', error);
    }
    
    // Initialize all departments
    Object.values(DEPARTMENTS).forEach(dept => {
      progress[dept] = {
        name: DEPARTMENT_NAMES[dept],
        completed: 0,
        total: 0,
        percentage: 0,
        color: DEPARTMENT_COLORS[dept],
        textColor: DEPARTMENT_TEXT_COLORS[dept]
      };
    });
    
    if (!users || users.length === 0) {
      return Object.values(progress);
    }

    tasksToUse.forEach(task => {
      const responsibleParty = getTaskResponsibleParty(task) || '';
      
      // Find all users assigned to this task
      const assignedUsers = users.filter(user => {
        const userEmail = user.email || user.Email || user.mail || user.userPrincipalName || '';
        const userDisplayName = user.displayName || user.DisplayName || '';
        
        let responsiblePartyStr = '';
        if (typeof responsibleParty === 'string') {
          responsiblePartyStr = responsibleParty;
        } else if (Array.isArray(responsibleParty)) {
          responsiblePartyStr = responsibleParty.map(item => {
            if (typeof item === 'object' && item.LookupValue) {
              return item.LookupValue;
            }
            if (typeof item === 'object' && item.Email) {
              return item.Email;
            }
            return String(item);
          }).join('; ');
        } else if (responsibleParty && typeof responsibleParty === 'object') {
          responsiblePartyStr = responsibleParty.LookupValue || responsibleParty.Email || String(responsibleParty);
        } else {
          responsiblePartyStr = String(responsibleParty || '');
        }
        
        return responsiblePartyStr && responsiblePartyStr.trim() !== '' && 
               (responsiblePartyStr.includes(userEmail) || responsiblePartyStr.includes(userDisplayName));
      });
      
      // Collect all unique departments from all assigned users
      const taskDepartments = new Set();
      assignedUsers.forEach(assignedUser => {
        const userDepartments = assignedUser.departments || [];
        userDepartments.forEach(department => {
          taskDepartments.add(department);
        });
      });
      
      // Determine completion status
      const taskIsCompleted = isTaskCompleted(task);
      
      // Count this task once for each unique department
      taskDepartments.forEach(department => {
        if (progress[department]) {
          progress[department].total++;
          if (taskIsCompleted) {
            progress[department].completed++;
          }
        }
      });
    });
    
    // Calculate percentages
    Object.values(DEPARTMENTS).forEach(dept => {
      const stats = progress[dept];
      stats.percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    });
    
    return Object.values(progress);
  };

  const departmentProgress = React.useMemo(() => {
    // Get current year tasks (unfiltered by department)
    const currentYear = new Date().getFullYear();
    const yearStart = startOfYear(new Date(currentYear, 0, 1));
    const yearEnd = endOfYear(new Date(currentYear, 11, 31));
    
    const yearTasks = tasks.filter(task => {
      const deadlineStr = getTaskDeadline(task);
      const deadline = parseDeadlineDate(deadlineStr);
      return deadline && isWithinInterval(deadline, { start: yearStart, end: yearEnd });
    });
    
    // Apply department filter if enabled, otherwise use all current year tasks
    const tasksForProgress = departmentFilterEnabled ? getFilteredTasks(yearTasks) : yearTasks;
    return getDepartmentProgress(tasksForProgress);
  }, [users, tasks, departmentProgressKey, departmentFilterEnabled]);

  // Recalculate department progress when users load
  React.useEffect(() => {
    if (users && users.length > 0) {
      setDepartmentProgressKey(prev => prev + 1);
    }
  }, [users]);

  // Listen for department changes and refresh in background
  useEffect(() => {
    const handleDepartmentChange = () => {
      console.log('Dashboard: User departments changed, refreshing department progress...');
      // Trigger recalculation by updating the key
      setDepartmentProgressKey(prev => prev + 1);
    };

    window.addEventListener('userDepartmentsChanged', handleDepartmentChange);
    window.addEventListener('userRoleChanged', handleDepartmentChange);

    return () => {
      window.removeEventListener('userDepartmentsChanged', handleDepartmentChange);
      window.removeEventListener('userRoleChanged', handleDepartmentChange);
    };
  }, []);

  // Load department filter setting
  useEffect(() => {
    const loadDepartmentFilterSetting = () => {
      try {
        const saved = localStorage.getItem('departmentFilterEnabled');
        setDepartmentFilterEnabled(saved === 'true');
      } catch (err) {
        console.error('Dashboard: Error loading department filter setting:', err);
      }
    };

    loadDepartmentFilterSetting();

    // Listen for setting changes
    const handleSettingChange = (event) => {
      const { enabled } = event.detail || {};
      setDepartmentFilterEnabled(enabled);
    };

    window.addEventListener('departmentFilterSettingChanged', handleSettingChange);

    return () => {
      window.removeEventListener('departmentFilterSettingChanged', handleSettingChange);
    };
  }, []);

  // Get project progress
  const getProjectProgress = () => {
    const projects = {};
    
    // Diagnostic: Log all tasks for "Rancho Mission Viejo" project
    const ranchoTasks = currentYearTasks.filter(task => {
      const projectName = getTaskProject(task) || 'Unassigned';
      return projectName.toLowerCase().includes('rancho') || projectName.toLowerCase().includes('mission') || projectName.toLowerCase().includes('viejo');
    });
    
    if (ranchoTasks.length > 0) {
      console.log('🔍 Dashboard: Found', ranchoTasks.length, 'tasks for Rancho Mission Viejo project (in current year)');
      const ranchoTaskDetails = ranchoTasks.map(t => ({
        id: t.id,
        title: getTaskTitle(t),
        project: getTaskProject(t),
        deadline: getTaskDeadline(t),
        deadlineDate: parseDeadlineDate(getTaskDeadline(t)),
        completed: isTaskCompleted(t),
        hasRecurrence: !!t.recurrence,
        hasTemplateId: !!t.templateId,
        isTemplate: !!(t.recurrence && !t.templateId),
        isInstance: !!t.templateId
      }));
      console.log('🔍 Dashboard: Rancho tasks in current year (full details):', ranchoTaskDetails);
      
      // Group by type
      const templates = ranchoTaskDetails.filter(t => t.isTemplate);
      const instances = ranchoTaskDetails.filter(t => t.isInstance);
      const solo = ranchoTaskDetails.filter(t => !t.isTemplate && !t.isInstance);
      
      console.log('🔍 Dashboard: Rancho breakdown in current year:', {
        templates: templates.length,
        instances: instances.length,
        solo: solo.length,
        total: ranchoTaskDetails.length
      });
      
      if (instances.length !== 11) {
        console.warn('⚠️ Dashboard: Expected 11 instances but found', instances.length);
        console.warn('⚠️ Dashboard: Extra instances found:', instances.length - 11);
        
        // Sort instances by deadline to identify duplicates or old ones
        const sortedInstances = [...instances].sort((a, b) => {
          const dateA = a.deadlineDate ? a.deadlineDate.getTime() : 0;
          const dateB = b.deadlineDate ? b.deadlineDate.getTime() : 0;
          return dateA - dateB;
        });
        
        console.warn('⚠️ Dashboard: All instance details (sorted by deadline):', sortedInstances.map(t => ({
          id: t.id,
          title: t.title,
          deadline: t.deadline,
          deadlineDate: t.deadlineDate ? t.deadlineDate.toISOString().split('T')[0] : 'invalid',
          completed: t.completed
        })));
        
        // Check for duplicate deadlines
        const deadlineGroups = {};
        sortedInstances.forEach(t => {
          const deadlineKey = t.deadlineDate ? t.deadlineDate.toISOString().split('T')[0] : 'invalid';
          if (!deadlineGroups[deadlineKey]) {
            deadlineGroups[deadlineKey] = [];
          }
          deadlineGroups[deadlineKey].push(t);
        });
        
        const duplicateDeadlines = Object.entries(deadlineGroups).filter(([date, tasks]) => tasks.length > 1);
        if (duplicateDeadlines.length > 0) {
          console.warn('⚠️ Dashboard: Found duplicate deadlines:', duplicateDeadlines.map(([date, tasks]) => ({
            date,
            count: tasks.length,
            ids: tasks.map(t => t.id)
          })));
        }
        
        // Deduplicate: For each unique deadline, keep only one instance
        // Then take the 11 most recent unique deadlines
        const deadlineMap = new Map();
        sortedInstances.forEach(instance => {
          const deadlineKey = instance.deadlineDate ? instance.deadlineDate.toISOString().split('T')[0] : instance.deadline;
          if (!deadlineMap.has(deadlineKey)) {
            deadlineMap.set(deadlineKey, []);
          }
          deadlineMap.get(deadlineKey).push(instance);
        });
        
        // For each deadline, keep the first instance (or prefer non-completed if both exist)
        const uniqueInstances = [];
        deadlineMap.forEach((instancesForDate, dateKey) => {
          // If multiple instances for same date, prefer the one that's not completed (or just take first)
          const instanceToKeep = instancesForDate.length > 1 
            ? instancesForDate.find(i => !i.completed) || instancesForDate[0]
            : instancesForDate[0];
          uniqueInstances.push(instanceToKeep);
        });
        
        // Sort unique instances by deadline and take the 11 most recent
        uniqueInstances.sort((a, b) => {
          const dateA = a.deadlineDate ? a.deadlineDate.getTime() : 0;
          const dateB = b.deadlineDate ? b.deadlineDate.getTime() : 0;
          return dateA - dateB;
        });
        
        const mostRecent11 = uniqueInstances.slice(-11);
        const correct11Ids = new Set(mostRecent11.map(t => t.id));
        
        // All instances NOT in the correct 11 should be removed
        const extraInstances = sortedInstances.filter(t => !correct11Ids.has(t.id));
        
        console.warn('⚠️ Dashboard: Correct 11 instances (after deduplication):', mostRecent11.map(t => ({
          id: t.id,
          deadline: t.deadline,
          deadlineDate: t.deadlineDate ? t.deadlineDate.toISOString().split('T')[0] : 'invalid',
          completed: t.completed
        })));
        
        console.warn('⚠️ Dashboard: Extra instances to remove:', extraInstances.length);
        console.warn('⚠️ Dashboard: Extra instance IDs (copy these for cleanup):', extraInstances.map(t => t.id));
        
        // Store in window for easy access
        window.__RANCHO_CLEANUP_IDS = extraInstances.map(t => t.id);
        console.log('💾 Dashboard: Cleanup IDs stored in window.__RANCHO_CLEANUP_IDS');
      }
    }
    
    currentYearTasks.forEach(task => {
      const projectName = getTaskProject(task) || 'Unassigned';
      
      if (!projects[projectName]) {
        projects[projectName] = { completed: 0, total: 0 };
      }
      projects[projectName].total++;
      
      if (isTaskCompleted(task)) {
        projects[projectName].completed++;
      }
    });
    
    // Diagnostic: Log project counts
    const ranchoProject = Object.entries(projects).find(([name]) => 
      name.toLowerCase().includes('rancho') || name.toLowerCase().includes('mission') || name.toLowerCase().includes('viejo')
    );
    if (ranchoProject) {
      console.log('🔍 Dashboard: Rancho Mission Viejo project count:', ranchoProject[1]);
    }
    
    return Object.entries(projects)
      .map(([name, data]) => ({
        name,
        completed: data.completed,
        total: data.total,
        percentage: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  };

  const projectProgress = getProjectProgress();

  // Circular progress component
  const CircularProgress = ({ percentage, size = 120, strokeWidth = 8, color = 'text-blue-500' }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const adjustedPercentage = Math.max(percentage, 2);
    const strokeDashoffset = circumference - (adjustedPercentage / 100) * circumference;

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className={`${color} transition-all duration-500 ease-in-out`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{percentage}%</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 pb-16 relative">
      {/* Updating Overlay */}
      {updating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4 border border-gray-200 dark:border-gray-700">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Updating...</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Syncing with database</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Welcome back, {userProfile?.displayName || 'User'}! Here's your project overview.
            </p>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </div>
        </div>

        {/* Top Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Total Tasks */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tasks</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{metrics.total}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This year</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <ChartBarIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Completed Tasks */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{metrics.completed}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This year</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0}% completion rate
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Urgent Tasks */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Urgent</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">{metrics.urgent}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This year</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <ExclamationTriangleIcon className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          {/* Due This Week */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Due This Week</p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">{metrics.dueThisWeek}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Deadlines approaching</p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                <CalendarDaysIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          {/* Overdue Tasks */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{metrics.overdue}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Need attention</p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Deadlines This Week */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <CalendarDaysIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Deadlines This Week</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{tasksThisWeek.length} tasks due</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {tasksThisWeek.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tasksThisWeek.map(task => (
                  <TaskCard
                    key={task.id} 
                    task={task}
                    users={users}
                    onToggleComplete={handleToggleComplete}
                    onToggleUrgent={handleToggleUrgent}
                    onNoteClick={handleNoteClick}
                    onDeleteClick={handleDeleteClick}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarDaysIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No deadlines this week</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">You're all caught up!</p>
              </div>
            )}
          </div>
        </div>

        {/* Progress Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Department Progress */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <BuildingOfficeIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Department Progress</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Current year completion</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                {departmentProgress.map(dept => (
                  <div key={dept.name} className="text-center">
                    <div className="mb-4">
                      <CircularProgress 
                        percentage={dept.percentage} 
                        size={100} 
                        strokeWidth={6}
                        color={dept.textColor}
                      />
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">{dept.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {dept.completed} of {dept.total} tasks
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Project Progress */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <FolderIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Project Progress</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Current year completion</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {projectProgress.length > 0 ? (
                <div className="space-y-4">
                  {projectProgress.map(project => (
                    <div key={project.name} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {project.name}
                          </h4>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {project.percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-in-out"
                            style={{ width: `${project.percentage}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {project.completed} of {project.total} tasks completed
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FolderIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No projects this year</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Start adding tasks to see progress</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Year-to-Date Summary</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {currentYearTasks.length} tasks created this year across {projectProgress.length} projects
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {currentYearTasks.length > 0 
                  ? Math.round((currentYearTasks.filter(task => isTaskCompleted(task)).length / currentYearTasks.length) * 100)
                  : 0}%
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Overall completion</p>
            </div>
          </div>
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

export default Dashboard;