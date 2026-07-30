import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { taskManager } from './services/taskManager';
import { microsoftDataService } from './microsoftDataService';
import TaskCard from './TaskCard';
import NoteModal from './components/NoteModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, isSameDay, addDays, subDays } from 'date-fns';
import { filterDeadlineTasks, getTaskDeadline, parseDeadlineDate, getTaskStatus, getStatusColor, taskBelongsToUserDepartments } from './utils/taskHelpers';
import { useAuth } from './Auth';

function CalendarDeadlinesPage() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'week', 'month'
  const [departmentFilterEnabled, setDepartmentFilterEnabled] = useState(false);
  
  // Modal states
  const [noteModal, setNoteModal] = useState({ isOpen: false, task: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, taskId: null, taskName: null });
  
  const { userProfile } = useAuth();

  const STATUS_THEME = useMemo(() => ({
    blue: {
      dot: 'bg-blue-600 dark:bg-blue-400',
      banner: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
    },
    orange: {
      dot: 'bg-orange-600 dark:bg-orange-400',
      banner: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
    },
    red: {
      dot: 'bg-red-600 dark:bg-red-400',
      banner: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
    },
    green: {
      dot: 'bg-green-600 dark:bg-green-400',
      banner: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
    }
  }), []);

  // Load tasks from TaskManager
  const loadTasks = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      
      // Initialize TaskManager if not already initialized or force refresh requested
      if (forceRefresh || !taskManager.isInitialized) {
        await taskManager.initialize(forceRefresh);
      }
      
      // Get tasks from TaskManager (from memory, no API call)
      const allTasks = taskManager.getAllTasks();
      
      // Filter out recurring templates - only show actual deadline instances
      const deadlineTasks = filterDeadlineTasks(Array.isArray(allTasks) ? allTasks : []);
      setTasks(deadlineTasks);
    } catch (err) {
      console.error('Calendar: Error loading tasks:', err);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersData = await microsoftDataService.users.getEnterpriseUsers();
        
        // Merge enterprise users with local assignments (same as Dashboard)
        const USER_ASSIGNMENTS_KEY = 'user_assignments';
        const localAssignments = JSON.parse(localStorage.getItem(USER_ASSIGNMENTS_KEY) || '{}');
        
        const usersWithAssignments = (Array.isArray(usersData) ? usersData : []).map(user => ({
          ...user,
          departments: localAssignments[user.id]?.departments || [],
          role: localAssignments[user.id]?.role || 'VIEWER'
        }));
        
        setUsers(usersWithAssignments);
      } catch (err) {
        console.error('Calendar: Error loading users:', err);
        setUsers([]);
      }
    };
    
    loadUsers();
    
    // Listen for department/role changes and refresh users in background
    const handleUserChange = async () => {
      console.log('Calendar: User departments/roles changed, refreshing users...');
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
        console.error('Calendar: Error refreshing users:', err);
      }
    };

    window.addEventListener('userDepartmentsChanged', handleUserChange);
    window.addEventListener('userRoleChanged', handleUserChange);
    
    return () => {
      window.removeEventListener('userDepartmentsChanged', handleUserChange);
      window.removeEventListener('userRoleChanged', handleUserChange);
    };
  }, []);

  // Load department filter setting
  useEffect(() => {
    const loadDepartmentFilterSetting = () => {
      try {
        const saved = localStorage.getItem('departmentFilterEnabled');
        setDepartmentFilterEnabled(saved === 'true');
      } catch (err) {
        console.error('Calendar: Error loading department filter setting:', err);
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

  // Get current user's departments
  const getCurrentUserDepartments = () => {
    if (!userProfile?.id) return [];
    const USER_ASSIGNMENTS_KEY = 'user_assignments';
    const localAssignments = JSON.parse(localStorage.getItem(USER_ASSIGNMENTS_KEY) || '{}');
    return localAssignments[userProfile.id]?.departments || [];
  };

  // Filter tasks by department if setting is enabled
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

  // Load tasks and subscribe to TaskManager events
  useEffect(() => {
    loadTasks(true);
    
    // Subscribe to TaskManager events for instant updates
    const unsubscribe = taskManager.subscribe(({ type, tasks: updatedTasks, task, taskId, ...data }) => {
      if (type === 'refreshed' || type === 'created' || type === 'updated' || type === 'deleted' || type === 'batchCreated' || type === 'batchUpdated' || type === 'batchDeleted') {
        // Reload tasks from TaskManager
        const allTasks = taskManager.getAllTasks();
        const deadlineTasks = filterDeadlineTasks(Array.isArray(allTasks) ? allTasks : []);
        setTasks(deadlineTasks);
      }
      
      if (type === 'loading') {
        setIsLoading(data.isLoading);
      }
    });
    
    // Also listen to DOM events for cross-component communication
    const handleTaskDataChanged = (event) => {
      const { type } = event.detail;
      if (type === 'refreshed' || type === 'created' || type === 'updated' || type === 'deleted' || type === 'batchCreated' || type === 'batchUpdated' || type === 'batchDeleted') {
        const allTasks = taskManager.getAllTasks();
        const deadlineTasks = filterDeadlineTasks(Array.isArray(allTasks) ? allTasks : []);
        setTasks(deadlineTasks);
      }
    };
    
    window.addEventListener('taskDataChanged', handleTaskDataChanged);
    
    // Legacy event listener for backward compatibility
    const handleTaskDeleted = () => {
      loadTasks(true);
    };
    window.addEventListener('taskDeleted', handleTaskDeleted);
    
    return () => {
      unsubscribe();
      window.removeEventListener('taskDataChanged', handleTaskDataChanged);
      window.removeEventListener('taskDeleted', handleTaskDeleted);
    };
  }, [loadTasks]);

  // Action handlers for TaskCard
  const handleToggleComplete = useCallback(async (taskId, currentStatus) => {
    try {
      await taskManager.updateTask(taskId, { completed: !currentStatus });
    } catch (error) {
      console.error('CalendarDeadlines: Error toggling completion:', error);
    }
  }, []);

  const handleToggleUrgent = useCallback(async (taskId, currentUrgency) => {
    try {
      await taskManager.updateTask(taskId, { priority: currentUrgency ? 'Normal' : 'Urgent' });
    } catch (error) {
      console.error('CalendarDeadlines: Error toggling urgency:', error);
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
      console.error('CalendarDeadlines: Error saving note:', error);
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
      console.error('CalendarDeadlines: Error deleting task:', error);
      setDeleteModal({ isOpen: false, taskId: null, taskName: null });
    }
  }, [deleteModal]);

  // Get tasks for the current view
  const getTasksForView = useMemo(() => {
    if (!tasks.length) return [];

    const startDate = viewMode === 'week' 
      ? startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday start
      : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    const endDate = viewMode === 'week'
      ? endOfWeek(currentDate, { weekStartsOn: 1 })
      : new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const viewTasks = tasks.filter(task => {
      const deadline = parseDeadlineDate(getTaskDeadline(task));
      if (!deadline) return false;
      return isWithinInterval(deadline, { start: startDate, end: endDate });
    });
    
    return getFilteredTasks(viewTasks);
  }, [tasks, currentDate, viewMode, departmentFilterEnabled, userProfile, users]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped = {};
    
    getTasksForView.forEach(task => {
      const taskDate = parseDeadlineDate(getTaskDeadline(task));
      if (!taskDate) return;
      const dateKey = format(taskDate, 'yyyy-MM-dd');
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(task);
    });

    return grouped;
  }, [getTasksForView]);

  // Get calendar days for the current view
  const getCalendarDays = useMemo(() => {
    const days = [];

    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const startDate = viewMode === 'week'
      ? startOfWeek(currentDate, { weekStartsOn: 1 })
      : startOfWeek(firstDayOfMonth, { weekStartsOn: 1 });
    
    const endDate = viewMode === 'week'
      ? endOfWeek(currentDate, { weekStartsOn: 1 })
      : endOfWeek(lastDayOfMonth, { weekStartsOn: 1 });

    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = format(current, 'yyyy-MM-dd');
      const isToday = isSameDay(current, new Date());
      const isCurrentMonth = current.getMonth() === currentDate.getMonth();
      
      days.push({
        date: new Date(current),
        dateKey,
        isToday,
        isCurrentMonth,
        tasks: tasksByDate[dateKey] || []
      });
      
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentDate, viewMode, tasksByDate]);

  // Navigation functions
  const goToPrevious = () => {
    if (viewMode === 'week') {
      setCurrentDate(prev => subDays(prev, 7));
    } else {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }
  };

  const goToNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(prev => addDays(prev, 7));
    } else {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <CalendarDaysIcon className="w-8 h-8 text-blue-600" />
                Calendar View
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {format(currentDate, viewMode === 'week' ? 'MMMM d, yyyy' : 'MMMM yyyy')}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'week'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'month'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Month
                </button>
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPrevious}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <button
                  onClick={goToToday}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Today
                </button>
                
                <button
                  onClick={goToNext}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar and Tasks Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid - Takes 2/3 of the space */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Day Headers */}
              <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="p-4 text-center text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7">
                {getCalendarDays.map((day, index) => (
                  <div
                    key={day.dateKey}
                    className={`min-h-[120px] p-2 border-r border-b border-gray-200 dark:border-gray-700 ${
                      !day.isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900' : 'bg-white dark:bg-gray-800'
                    } ${day.isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${
                        day.isToday 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : day.isCurrentMonth 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {format(day.date, 'd')}
                      </span>
                      {day.isToday && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>

                    {/* Tasks for this day */}
                    <div className="space-y-1">
                      {day.tasks.slice(0, 3).map((task, taskIndex) => {
                        const status = getTaskStatus(task);
                        const theme = STATUS_THEME[getStatusColor(status)] || STATUS_THEME.blue;
                        return (
                          <div
                            key={`${task.id}-${taskIndex}`}
                            className={`text-xs p-1 rounded ${theme.banner} truncate`}
                          >
                            {task.title || task.task || 'Untitled Task'}
                          </div>
                        );
                      })}
                      {day.tasks.length > 3 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          +{day.tasks.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Task Cards - Takes 1/3 of the space */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Tasks This {viewMode === 'week' ? 'Week' : 'Month'}
              </h2>
              
              {/* Sort tasks chronologically */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto hide-scrollbar">
                {getTasksForView
                  .sort((a, b) => {
                    const dateA = parseDeadlineDate(getTaskDeadline(a));
                    const dateB = parseDeadlineDate(getTaskDeadline(b));
                    if (!dateA || !dateB) return 0;
                    return dateA - dateB;
                  })
                  .map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      users={users}
                      className="hover:shadow-md transition-shadow"
                      onToggleComplete={handleToggleComplete}
                      onToggleUrgent={handleToggleUrgent}
                      onNoteClick={handleNoteClick}
                      onDeleteClick={handleDeleteClick}
                    />
                  ))}
              </div>
              
              {getTasksForView.length === 0 && (
                <div className="text-center py-8">
                  <CalendarDaysIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No tasks scheduled for this {viewMode}</p>
                </div>
              )}
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

export default CalendarDeadlinesPage;
