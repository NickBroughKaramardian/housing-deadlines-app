import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ChevronDownIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { format, startOfYear, endOfYear, differenceInDays, eachMonthOfInterval, startOfDay } from 'date-fns';
import { taskManager } from './services/taskManager';
import TaskCard from './TaskCard';
import NoteModal from './components/NoteModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import GanttTaskListItem from './components/GanttTaskListItem';
import { getTaskDeadline, parseDeadlineDate, filterDeadlineTasks, getTaskStatus, getStatusColor, isTaskCompleted, taskBelongsToUserDepartments } from './utils/taskHelpers';
import { useAuth } from './Auth';
import { useTasks } from './hooks/useTasks';
import { useUsers } from './hooks/useUsers';

function GanttDeadlinesPage() {
  const { tasks: allTasks, isLoading: loading } = useTasks();
  const { users } = useUsers();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [hoveredTask, setHoveredTask] = useState(null);
  const [hoveredGroupDateKey, setHoveredGroupDateKey] = useState(null); // Date key (yyyy-MM-dd) when hovering multi-task dot
  const [viewMode, setViewMode] = useState('year'); // 'year' or 'month'
  const [departmentFilterEnabled, setDepartmentFilterEnabled] = useState(false);
  
  // Modal states
  const [noteModal, setNoteModal] = useState({ isOpen: false, task: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, taskId: null, taskName: null });
  
  const { userProfile } = useAuth();

  // Only show actual deadline instances (no recurring templates)
  const tasks = useMemo(
    () => filterDeadlineTasks(Array.isArray(allTasks) ? allTasks : []),
    [allTasks]
  );

  // Action handlers for TaskCard - surface failures to the user (C10)
  const handleToggleComplete = useCallback(async (taskId, currentStatus) => {
    try {
      await taskManager.updateTask(taskId, { completed: !currentStatus });
    } catch (error) {
      console.error('GanttDeadlines: Error toggling completion:', error);
      alert(`Failed to update task: ${error.message}`);
    }
  }, []);

  const handleToggleUrgent = useCallback(async (taskId, currentUrgency) => {
    try {
      await taskManager.updateTask(taskId, { priority: currentUrgency ? 'Normal' : 'Urgent' });
    } catch (error) {
      console.error('GanttDeadlines: Error toggling urgency:', error);
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
      console.error('GanttDeadlines: Error saving note:', error);
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
      console.error('GanttDeadlines: Error deleting task:', error);
      alert(`Failed to delete task: ${error.message}`);
    } finally {
      setDeleteModal({ isOpen: false, taskId: null, taskName: null });
    }
  }, [deleteModal]);

  // Load department filter setting
  useEffect(() => {
    const loadDepartmentFilterSetting = () => {
      try {
        const saved = localStorage.getItem('departmentFilterEnabled');
        setDepartmentFilterEnabled(saved === 'true');
      } catch (err) {
        console.error('GanttDeadlines: Error loading department filter setting:', err);
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

  const getCalculatedStatus = (task) => getTaskStatus(task);

  const yearTasks = useMemo(() => {
    const filtered = tasks.filter(task => {
      const deadline = parseDeadlineDate(getTaskDeadline(task));
      if (!deadline) return false;
      return deadline.getFullYear() === selectedYear;
    });
    return getFilteredTasks(filtered);
  }, [tasks, selectedYear, getFilteredTasks]);

  const monthTasks = useMemo(() => {
    if (selectedMonth === null) return [];
    return yearTasks.filter(task => {
      const deadline = parseDeadlineDate(getTaskDeadline(task));
      return deadline && deadline.getMonth() === selectedMonth;
    });
  }, [yearTasks, selectedMonth]);

  const currentTasks = viewMode === 'month' ? monthTasks : yearTasks;
  
  // Tasks to display in the list below the chart (sorted chronologically by deadline)
  const tasksForList = useMemo(() => {
    let list = [];
    if (viewMode === 'month' && selectedMonth !== null) {
      list = monthTasks;
    } else {
      list = yearTasks;
    }
    
    // Sort by deadline date (chronological order - earliest first)
    return [...list].sort((a, b) => {
      const deadlineA = parseDeadlineDate(getTaskDeadline(a));
      const deadlineB = parseDeadlineDate(getTaskDeadline(b));
      
      // Handle null/undefined deadlines - put them at the end
      if (!deadlineA && !deadlineB) return 0;
      if (!deadlineA) return 1;
      if (!deadlineB) return -1;
      
      // Sort by date (earliest first)
      return deadlineA.getTime() - deadlineB.getTime();
    });
  }, [viewMode, selectedMonth, monthTasks, yearTasks]);

  const months = useMemo(() => {
    const start = startOfYear(new Date(selectedYear, 0, 1));
    const end = endOfYear(new Date(selectedYear, 11, 31));
    return eachMonthOfInterval({ start, end });
  }, [selectedYear]);

  const getTaskPosition = (task) => {
                  const deadline = parseDeadlineDate(getTaskDeadline(task));
    if (!deadline) return { left: 0, month: null };
    
    let left = 0;
    
    if (viewMode === 'month' && selectedMonth !== null) {
      // Monthly view - position within the month
      const monthStart = new Date(selectedYear, selectedMonth, 1);
      const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);
      const daysInMonth = monthEnd.getDate();
      const dayOfMonth = deadline.getDate();
      
      left = ((dayOfMonth - 1) / (daysInMonth - 1)) * 100;
    } else {
      // Yearly view - position within the year
      const yearStart = startOfYear(new Date(selectedYear, 0, 1));
      const daysInYear = differenceInDays(endOfYear(new Date(selectedYear, 11, 31)), yearStart);
      const daysFromStart = differenceInDays(deadline, yearStart);
      
      left = (daysFromStart / daysInYear) * 100;
    }
    
    const month = deadline.getMonth();
    return { left: Math.max(0, Math.min(100, left)), month };
  };

  const getTasksForMonth = (monthIndex) => {
    return yearTasks.filter(task => {
      const deadline = parseDeadlineDate(getTaskDeadline(task));
      return deadline && deadline.getMonth() === monthIndex;
    });
  };

  const statusPriority = {
    'Overdue': 3,
    'Due Soon': 2,
    'Active': 1,
    'Completed': 0
  };

  // Group tasks by date (same day) for handling overlapping deadlines
  const groupTasksByDate = useMemo(() => {
    const grouped = {};
    
    currentTasks.forEach(task => {
      const deadline = parseDeadlineDate(getTaskDeadline(task));
      if (!deadline) return;
      
      // Normalize to start of day for grouping
      const dateKey = format(startOfDay(deadline), 'yyyy-MM-dd');
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(task);
    });
    
    return grouped;
  }, [currentTasks]);

  // Get highest priority status for a group of tasks
  const getGroupStatus = (tasks) => {
    let bestPriority = -1;
    let bestStatus = 'Active';
    
    tasks.forEach(task => {
      const status = getCalculatedStatus(task);
      const priority = statusPriority[status] ?? 0;
      if (priority > bestPriority) {
        bestPriority = priority;
        bestStatus = status;
      }
    });
    
    return bestStatus;
  };

  // Check if group has mixed statuses
  const hasMixedStatuses = (tasks) => {
    if (tasks.length <= 1) return false;
    const statuses = new Set(tasks.map(task => getCalculatedStatus(task)));
    return statuses.size > 1;
  };

  // Check if any task in group is urgent
  const hasAnyUrgent = (tasks) => {
    return tasks.some(task => task.Priority === 'Urgent' || task.priority === 'Urgent');
  };

  // Get dot color for group (yellow if mixed, otherwise highest priority status)
  const getGroupDotColor = (tasks) => {
    if (hasMixedStatuses(tasks)) {
      return 'yellow';
    }
    return getStatusColor(getGroupStatus(tasks));
  };

  // Get month completion status for background color: 'all-complete', 'in-progress', or 'all-active'
  const getMonthCompletionStatus = (tasksInMonth) => {
    if (!tasksInMonth || tasksInMonth.length === 0) {
      return null; // No tasks
    }
    
    const completedCount = tasksInMonth.filter(task => isTaskCompleted(task)).length;
    const totalCount = tasksInMonth.length;
    
    if (completedCount === totalCount) {
      return 'all-complete'; // All tasks complete - Green
    } else if (completedCount > 0) {
      return 'in-progress'; // Some complete, some active - Orange
    } else {
      return 'all-active'; // All active (none complete) - Blue
    }
  };

  const statusDotClassMap = {
    green: 'bg-green-500 dark:bg-green-400 ring-green-200 dark:ring-green-800',
    red: 'bg-red-500 dark:bg-red-400 ring-red-200 dark:ring-red-800',
    orange: 'bg-orange-500 dark:bg-orange-400 ring-orange-200 dark:ring-orange-800',
    blue: 'bg-blue-500 dark:bg-blue-400 ring-blue-200 dark:ring-blue-800',
    yellow: 'bg-yellow-500 dark:bg-yellow-400 ring-yellow-200 dark:ring-yellow-800' // For mixed statuses
  };

  const getTaskDotClass = (status) => statusDotClassMap[getStatusColor(status)] || statusDotClassMap.blue;

  const getPriorityRing = (task) => {
    return task.Priority === 'Urgent' ? 'ring-2 ring-orange-300 dark:ring-orange-600' : '';
  };

  const handleYearChange = (direction) => {
    if (direction === 'prev') {
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedYear(prev => prev + 1);
    }
    setSelectedMonth(null);
    setSelectedTask(null);
  };

  const handleMonthClick = (monthIndex) => {
    if (selectedMonth === monthIndex) {
      // If clicking the same month, toggle back to yearly view
      setSelectedMonth(null);
      setViewMode('year');
    } else {
      // Switch to monthly view for the selected month
      setSelectedMonth(monthIndex);
      setViewMode('month');
    }
    setSelectedTask(null);
  };

  const handleTaskClick = (task) => {
    setSelectedTask(selectedTask?.id === task.id ? null : task);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 dark:from-white dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent">
              Gantt Chart
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Timeline view of deadlines across the year
            </p>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {currentTasks.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {viewMode === 'month' 
                ? `Tasks in ${months[selectedMonth] ? format(months[selectedMonth], 'MMMM yyyy') : ''}`
                : `Tasks in ${selectedYear}`
              }
            </div>
          </div>
        </div>

        {/* Year Navigation */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => handleYearChange('prev')}
            className="p-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-lg border border-white/20 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-700 transition-all duration-200"
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          
          <div className="px-6 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 dark:border-gray-700/50">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {selectedYear}
            </span>
          </div>
          
          <button
            onClick={() => handleYearChange('next')}
            className="p-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-lg border border-white/20 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-700 transition-all duration-200"
          >
            <ChevronRightIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Timeline Container */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 dark:border-gray-700/50 p-6">
          {/* View Mode Header */}
          {viewMode === 'month' && (
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setViewMode('year');
                    setSelectedMonth(null);
                    setSelectedTask(null);
                  }}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Back to Year</span>
                </button>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {months[selectedMonth] ? format(months[selectedMonth], 'MMMM yyyy') : ''}
                </h3>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {monthTasks.length} tasks
              </div>
            </div>
          )}

          {/* Month Headers - Only show in yearly view */}
          {viewMode === 'year' && (
            <div className="relative mb-8">
              {/* Month Clickable Areas with Text */}
              <div className="relative w-full h-8 flex">
                {months.map((month, index) => {
                  const tasksInMonth = getTasksForMonth(index);
                  const hasTasks = tasksInMonth.length > 0;
                  const isSelected = selectedMonth === index;
                  const completionStatus = hasTasks ? getMonthCompletionStatus(tasksInMonth) : null;
                  
                  // Determine background color based on completion status
                  let bgColorClass = '';
                  let hoverColorClass = '';
                  let textColorClass = 'text-gray-600 dark:text-gray-400'; // Default text color
                  
                  if (hasTasks) {
                    if (completionStatus === 'all-complete') {
                      // All tasks complete - Green
                      bgColorClass = 'bg-green-50 dark:bg-green-900/20';
                      hoverColorClass = 'hover:bg-green-100 dark:hover:bg-green-900/30';
                      textColorClass = 'text-green-800 dark:text-green-300'; // Darker green text for visibility
                    } else if (completionStatus === 'in-progress') {
                      // Some complete, some active - Orange
                      bgColorClass = 'bg-orange-50 dark:bg-orange-900/20';
                      hoverColorClass = 'hover:bg-orange-100 dark:hover:bg-orange-900/30';
                      textColorClass = 'text-orange-800 dark:text-orange-300'; // Darker orange text for visibility
                    } else {
                      // All active (none complete) - Blue
                      bgColorClass = 'bg-blue-50 dark:bg-blue-900/20';
                      hoverColorClass = 'hover:bg-blue-100 dark:hover:bg-blue-900/30';
                      textColorClass = 'text-blue-800 dark:text-blue-300'; // Darker blue text for visibility
                    }
                  } else {
                    bgColorClass = '';
                    hoverColorClass = 'hover:bg-gray-50 dark:hover:bg-gray-700/50';
                    textColorClass = 'text-gray-600 dark:text-gray-400';
                  }
                  
                  // Override with selected state if applicable
                  if (isSelected) {
                    if (completionStatus === 'all-complete') {
                      bgColorClass = 'bg-green-100 dark:bg-green-900/40 ring-2 ring-green-300 dark:ring-green-600';
                      textColorClass = 'text-green-900 dark:text-green-200';
                    } else if (completionStatus === 'in-progress') {
                      bgColorClass = 'bg-orange-100 dark:bg-orange-900/40 ring-2 ring-orange-300 dark:ring-orange-600';
                      textColorClass = 'text-orange-900 dark:text-orange-200';
                    } else {
                      bgColorClass = 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-300 dark:ring-blue-600';
                      textColorClass = 'text-blue-900 dark:text-blue-200';
                    }
                  }
                  
                  // Get month abbreviation
                  const monthAbbr = format(month, 'MMM');
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleMonthClick(index)}
                      className={`flex-1 h-8 border-r border-gray-200 dark:border-gray-600 last:border-r-0 transition-all duration-200 flex items-center justify-center ${bgColorClass} ${hoverColorClass}`}
                      title={`${format(month, 'MMMM')} - ${tasksInMonth.length} tasks`}
                    >
                      <span className={`text-sm font-medium ${textColorClass}`}>
                        {monthAbbr}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
            
            {/* Progress Line - Current Date Indicator */}
            {(() => {
              const now = new Date();
              let progressPosition = 0;
              
              if (viewMode === 'month' && selectedMonth !== null) {
                // Monthly view - show progress within the month
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                
                if (currentMonth === selectedMonth && currentYear === selectedYear) {
                  const monthStart = new Date(selectedYear, selectedMonth, 1);
                  const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);
                  const daysInMonth = monthEnd.getDate();
                  const dayOfMonth = now.getDate();
                  
                  progressPosition = ((dayOfMonth - 1) / (daysInMonth - 1)) * 100;
                } else {
                  // Not current month, don't show progress line
                  return null;
                }
              } else {
                // Yearly view - show progress within the year
                const yearStart = startOfYear(new Date(selectedYear, 0, 1));
                const yearEnd = endOfYear(new Date(selectedYear, 11, 31));
                const daysInYear = differenceInDays(yearEnd, yearStart);
                const daysFromStart = differenceInDays(now, yearStart);
                
                // Only show if we're in the current year
                if (now.getFullYear() === selectedYear) {
                  progressPosition = Math.max(0, Math.min(100, (daysFromStart / daysInYear) * 100));
                } else {
                  // Not current year, don't show progress line
                  return null;
                }
              }
              
              return (
                <div 
                  className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 opacity-60 animate-pulse z-0"
                  style={{ 
                    left: `${progressPosition}%`, 
                    transform: 'translateX(-2px)'
                  }}
                >
                  {/* Vertical progress line - pulses behind dots */}
                </div>
              );
            })()}
            
            {/* Day markers for monthly view */}
            {viewMode === 'month' && (
              <div className="absolute top-2 left-0 right-0 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>1</span>
                <span>7</span>
                <span>14</span>
                <span>21</span>
                <span>28</span>
                <span>{months[selectedMonth] ? new Date(selectedYear, selectedMonth + 1, 0).getDate() : 31}</span>
              </div>
            )}
            
            {/* Task Dots - Grouped by date to handle overlapping */}
            <div className="relative h-12 z-10">
              {Object.entries(groupTasksByDate).map(([dateKey, tasks]) => {
                const firstTask = tasks[0];
                const position = getTaskPosition(firstTask);
                const isGroup = tasks.length > 1;
                
                // For single tasks, use original behavior
                if (!isGroup) {
                  const task = firstTask;
                  const status = getCalculatedStatus(task);
                  const isSelected = selectedTask?.id === task.id;
                  const isHovered = hoveredTask?.id === task.id;
                  
                  return (
                    <button
                      key={task.id}
                      onClick={() => handleTaskClick(task)}
                      onMouseEnter={() => {
                        setHoveredTask(task);
                        setHoveredGroupDateKey(null);
                      }}
                      onMouseLeave={() => {
                        setHoveredTask(null);
                        setHoveredGroupDateKey(null);
                      }}
                      className={`absolute top-4 transform -translate-x-1/2 w-4 h-4 rounded-full ${getTaskDotClass(status)} ${getPriorityRing(task)} transition-all duration-200 hover:scale-125 ${
                        isSelected ? 'ring-4 ring-gray-400 dark:ring-gray-500' : ''
                      } ${isHovered ? 'ring-4 ring-blue-400 dark:ring-blue-500' : ''}`}
                      style={{ left: `${position.left}%` }}
                      title={`${task.Task || task.task || task.title} - ${format(parseDeadlineDate(getTaskDeadline(task)), 'MMM dd, yyyy')}`}
                    >
                      {/* Inner dot */}
                      <div className="absolute inset-1 rounded-full bg-white dark:bg-gray-100"></div>
                    </button>
                  );
                }
                
                // For grouped tasks, show slightly larger dot with count badge
                const isSelected = tasks.some(t => selectedTask?.id === t.id);
                const isGroupHovered = hoveredGroupDateKey === dateKey;
                const groupDotColor = getGroupDotColor(tasks);
                const dotClass = statusDotClassMap[groupDotColor] || statusDotClassMap.blue;
                const hasUrgent = hasAnyUrgent(tasks);
                
                return (
                  <button
                    key={dateKey}
                    onClick={() => {
                      // Click persists - set selectedTask to first task, but we'll show all tasks in group
                      setSelectedTask(tasks[0]);
                      setHoveredTask(null);
                      setHoveredGroupDateKey(null);
                    }}
                    onMouseEnter={() => {
                      setHoveredTask(null);
                      setHoveredGroupDateKey(dateKey);
                    }}
                    onMouseLeave={() => {
                      // Clear hover state on mouse leave (matches single task behavior)
                      setHoveredGroupDateKey(null);
                    }}
                    className={`absolute top-[15px] transform -translate-x-1/2 w-[18px] h-[18px] rounded-full ${dotClass} ${hasUrgent ? 'ring-2 ring-orange-300 dark:ring-orange-600' : ''} transition-all duration-200 hover:scale-125 ${
                      isSelected ? 'ring-4 ring-gray-400 dark:ring-gray-500' : ''
                    } ${isGroupHovered ? 'ring-4 ring-blue-400 dark:ring-blue-500' : ''}`}
                    style={{ left: `${position.left}%` }}
                    title={`${tasks.length} task${tasks.length !== 1 ? 's' : ''} on ${format(parseDeadlineDate(getTaskDeadline(firstTask)), 'MMM dd, yyyy')} - Click to view all`}
                  >
                    {/* Inner white dot with black number */}
                    <div className="absolute inset-1 rounded-full bg-white dark:bg-gray-100 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-black dark:text-gray-900 leading-none">
                        {tasks.length}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Month Tasks - Only show in yearly view */}
          {selectedMonth !== null && viewMode === 'year' && (
            <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {format(months[selectedMonth], 'MMMM yyyy')} Tasks
                </h3>
                <button
                  onClick={() => setSelectedMonth(null)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <ChevronDownIcon className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {getTasksForMonth(selectedMonth).map((task) => (
                  <GanttTaskListItem
                    key={task.id}
                    task={task}
                    users={users}
                    onClick={() => handleTaskClick(task)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>


        {/* Task Card and Monthly Task List */}
        {(selectedTask || hoveredTask || hoveredGroupDateKey) && (
          <div className="space-y-4">
            {/* Task Details */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 dark:border-gray-700/50 p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {(() => {
                    // Check if we should show group header
                    let groupTasks = null;
                    
                    // First check if hovering a multi-task dot
                    if (hoveredGroupDateKey) {
                      groupTasks = groupTasksByDate[hoveredGroupDateKey];
                    }
                    // Then check if selected task is part of a group
                    else if (selectedTask) {
                      const taskDeadline = parseDeadlineDate(getTaskDeadline(selectedTask));
                      if (taskDeadline) {
                        const taskDateKey = format(startOfDay(taskDeadline), 'yyyy-MM-dd');
                        const tasksForDate = groupTasksByDate[taskDateKey];
                        if (tasksForDate && tasksForDate.length > 1) {
                          groupTasks = tasksForDate;
                        }
                      }
                    }
                    
                    if (groupTasks && groupTasks.length > 1) {
                      const firstTask = groupTasks[0];
                      const deadline = parseDeadlineDate(getTaskDeadline(firstTask));
                      return `Task Details - ${groupTasks.length} tasks on ${deadline ? format(deadline, 'MMM dd, yyyy') : ''}`;
                    }
                    return 'Task Details';
                  })()}
                </h3>
                <button
                  onClick={() => {
                    setSelectedTask(null);
                    setHoveredTask(null);
                    setHoveredGroupDateKey(null);
                  }}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <ChevronDownIcon className="w-5 h-5" />
                </button>
              </div>
              
              {(() => {
                // Check if we should show group tasks
                let groupTasks = null;
                
                // First check if hovering a multi-task dot
                if (hoveredGroupDateKey) {
                  groupTasks = groupTasksByDate[hoveredGroupDateKey];
                }
                // Then check if selected task is part of a group
                else if (selectedTask) {
                  const taskDeadline = parseDeadlineDate(getTaskDeadline(selectedTask));
                  if (taskDeadline) {
                    const taskDateKey = format(startOfDay(taskDeadline), 'yyyy-MM-dd');
                    const tasksForDate = groupTasksByDate[taskDateKey];
                    if (tasksForDate && tasksForDate.length > 1) {
                      groupTasks = tasksForDate;
                    }
                  }
                }
                
                // Show group tasks if found
                if (groupTasks && groupTasks.length > 1) {
                  return (
                    <div className="space-y-3">
                      {groupTasks.map((task, index) => {
                        const deadline = parseDeadlineDate(getTaskDeadline(task));
                        const today = new Date();
                        const daysUntil = deadline ? Math.ceil((deadline - today) / (1000 * 60 * 60 * 24)) : null;
                        const status = getCalculatedStatus(task);
                        
                        return (
                          <div
                            key={task.id}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <TaskCard
                              task={{
                                ...task,
                                daysUntil: daysUntil
                              }}
                              className="backdrop-blur-sm"
                              users={users}
                              onToggleComplete={handleToggleComplete}
                              onToggleUrgent={handleToggleUrgent}
                              onNoteClick={handleNoteClick}
                              onDeleteClick={handleDeleteClick}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                
                // Show single task (selected or hovered)
                const task = selectedTask || hoveredTask;
                if (!task) return null;
                
                // Add daysUntil calculation for TaskCard
                const deadline = parseDeadlineDate(getTaskDeadline(task));
                const today = new Date();
                const daysUntil = deadline ? Math.ceil((deadline - today) / (1000 * 60 * 60 * 24)) : null;
                
                return (
                  <TaskCard
                    task={{
                      ...task,
                      daysUntil: daysUntil
                    }}
                    className="backdrop-blur-sm"
                    users={users}
                    onToggleComplete={handleToggleComplete}
                    onToggleUrgent={handleToggleUrgent}
                    onNoteClick={handleNoteClick}
                    onDeleteClick={handleDeleteClick}
                  />
                );
              })()}
            </div>

            {/* Monthly Task List - Only show if we have a selected task and it's in a month */}
            {selectedTask && viewMode === 'year' && selectedMonth !== null && (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 dark:border-gray-700/50 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  All Tasks for {months[selectedMonth] ? format(months[selectedMonth], 'MMMM yyyy') : ''}
                </h3>
                
                {monthTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center">
                      <FunnelIcon className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No tasks found</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">No tasks scheduled for this month</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {monthTasks.map((task, index) => (
                      <GanttTaskListItem
                        key={task.id}
                        task={task}
                        users={users}
                        onClick={() => handleTaskClick(task)}
                        style={{ animationDelay: `${index * 30}ms` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Task List Below Chart */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 dark:border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {viewMode === 'month' && selectedMonth !== null
              ? `Tasks in ${months[selectedMonth] ? format(months[selectedMonth], 'MMMM yyyy') : ''}`
              : `Tasks in ${selectedYear}`
            }
          </h3>
          
          {tasksForList.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center">
                <FunnelIcon className="w-8 h-8 text-gray-500 dark:text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No tasks found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {viewMode === 'month' && selectedMonth !== null
                  ? 'No tasks scheduled for this month'
                  : 'No tasks scheduled for this year'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasksForList.map((task, index) => {
                const deadline = parseDeadlineDate(getTaskDeadline(task));
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const deadlineStartOfDay = deadline ? new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate()) : null;
                const todayStartOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const daysUntil = deadlineStartOfDay ? Math.floor((deadlineStartOfDay.getTime() - todayStartOfDay.getTime()) / (1000 * 60 * 60 * 24)) : null;
                
                return (
                  <TaskCard
                    key={task.id}
                    task={{
                      ...task,
                      daysUntil: daysUntil
                    }}
                    users={users}
                    onToggleComplete={handleToggleComplete}
                    onToggleUrgent={handleToggleUrgent}
                    onNoteClick={handleNoteClick}
                    onDeleteClick={handleDeleteClick}
                    className="hover:shadow-md transition-shadow"
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 dark:border-gray-700/50 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Status Legend</h3>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 dark:bg-blue-400"></div>
              <span className="text-gray-600 dark:text-gray-300">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500 dark:bg-orange-400 ring-2 ring-orange-300 dark:ring-orange-600"></div>
              <span className="text-gray-600 dark:text-gray-300">Due Soon / Urgent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 dark:bg-red-400"></div>
              <span className="text-gray-600 dark:text-gray-300">Overdue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 dark:bg-green-400"></div>
              <span className="text-gray-600 dark:text-gray-300">Completed</span>
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

export default GanttDeadlinesPage;