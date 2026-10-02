import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { taskManager } from './services/taskManager';
import TaskCard from './TaskCard';
import NoteModal from './components/NoteModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import { format, startOfWeek, endOfWeek, endOfMonth, isWithinInterval, isSameDay, addDays, subDays } from 'date-fns';
import { filterDeadlineTasks, getTaskDeadline, parseDeadlineDate, getTaskStatus, getStatusColor, taskBelongsToUserDepartments } from './utils/taskHelpers';
import { useAuth } from './Auth';
import { useTasks } from './hooks/useTasks';
import { useUsers } from './hooks/useUsers';

function CalendarDeadlinesPage() {
  const { tasks: allTasks, isLoading } = useTasks();
  const { users } = useUsers();
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

  // Only show actual deadline instances (no recurring templates)
  const tasks = useMemo(
    () => filterDeadlineTasks(Array.isArray(allTasks) ? allTasks : []),
    [allTasks]
  );

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

  // Filter tasks by department if setting is enabled. Departments come from
  // the authenticated profile (/api/me), not localStorage (S4).
  const getFilteredTasks = useCallback((taskList) => {
    if (!departmentFilterEnabled) {
      return taskList;
    }
    
    const userDepartments = userProfile?.departments || [];
    if (userDepartments.length === 0) {
      return taskList; // If user has no departments, show all
    }

    return taskList.filter(task => 
      taskBelongsToUserDepartments(task, userDepartments, users)
    );
  }, [departmentFilterEnabled, userProfile, users]);

  // Action handlers for TaskCard - surface failures to the user (C10)
  const handleToggleComplete = useCallback(async (taskId, currentStatus) => {
    try {
      await taskManager.updateTask(taskId, { completed: !currentStatus });
    } catch (error) {
      console.error('CalendarDeadlines: Error toggling completion:', error);
      alert(`Failed to update task: ${error.message}`);
    }
  }, []);

  const handleToggleUrgent = useCallback(async (taskId, currentUrgency) => {
    try {
      await taskManager.updateTask(taskId, { priority: currentUrgency ? 'Normal' : 'Urgent' });
    } catch (error) {
      console.error('CalendarDeadlines: Error toggling urgency:', error);
      alert(`Failed to update task: ${error.message}`);
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
      alert(`Failed to save note: ${error.message}`);
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
    } catch (error) {
      console.error('CalendarDeadlines: Error deleting task:', error);
      alert(`Failed to delete task: ${error.message}`);
    } finally {
      setDeleteModal({ isOpen: false, taskId: null, taskName: null });
    }
  }, [deleteModal]);

  // Get tasks for the current view
  const getTasksForView = useMemo(() => {
    if (!tasks.length) return [];

    const startDate = viewMode === 'week' 
      ? startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday start
      : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    // C2: endOfMonth returns 23:59:59.999 on the last day, so deadlines
    // parsed to noon on that day are included (previously the interval
    // ended at midnight and last-day tasks vanished).
    const endDate = viewMode === 'week'
      ? endOfWeek(currentDate, { weekStartsOn: 1 })
      : endOfMonth(currentDate);

    const viewTasks = tasks.filter(task => {
      const deadline = parseDeadlineDate(getTaskDeadline(task));
      if (!deadline) return false;
      return isWithinInterval(deadline, { start: startDate, end: endDate });
    });
    
    return getFilteredTasks(viewTasks);
  }, [tasks, currentDate, viewMode, getFilteredTasks]);

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
              
              {/* Sort tasks chronologically (C10: copy before sorting so the
                  memoized array is not mutated) */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto hide-scrollbar">
                {[...getTasksForView]
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
