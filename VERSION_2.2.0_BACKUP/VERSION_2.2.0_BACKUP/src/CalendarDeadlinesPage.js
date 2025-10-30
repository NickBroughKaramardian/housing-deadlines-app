import React, { useState, useMemo, useEffect } from 'react';
import { 
  CalendarDaysIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, parseISO, isValid } from 'date-fns';
import { sharedDataService } from './sharedDataService';
import { microsoftDataService } from './microsoftDataService';
import { globalTaskStore } from './globalTaskStore';
import TaskCard from './TaskCard';
import recurringTaskGenerator from './recurringTaskGenerator';
import taskUpdateService from './taskUpdateService';

function CalendarDeadlinesPage() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // Toggle task completion - uses centralized update service
  const toggleTaskCompletion = async (taskId, currentStatus) => {
    const newStatus = !currentStatus;
    
    await taskUpdateService.updateTaskField(
      taskId,
      { Completed_x003f_: newStatus },
      () => setUpdating(true),
      () => {
        setUpdating(false);
        const allTasks = globalTaskStore.getAllTasks();
        setTasks(allTasks);
      }
    );
  };

  // Toggle task urgency - uses centralized update service
  const toggleTaskUrgency = async (taskId, currentUrgency) => {
    const newPriority = currentUrgency ? 'Normal' : 'Urgent';
    
    await taskUpdateService.updateTaskField(
      taskId,
      { Priority: newPriority },
      () => setUpdating(true),
      () => {
        setUpdating(false);
        const allTasks = globalTaskStore.getAllTasks();
        setTasks(allTasks);
      }
    );
  };

  // Delete task - uses centralized update service
  const deleteTask = async (taskId) => {
    await taskUpdateService.deleteTask(
      taskId,
      () => setUpdating(true),
      () => {
        setUpdating(false);
        const allTasks = globalTaskStore.getAllTasks();
        setTasks(allTasks);
      }
    );
  };

  // Load tasks, instances, and users
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Subscribe to global task store updates
        const unsubscribe = globalTaskStore.subscribe(() => {
          const allTasks = globalTaskStore.getAllTasks();
          setTasks(allTasks);
          console.log('CalendarDeadlines: Updated from global store -', allTasks.length, 'total items');
        });
        
        // Get initial data
        const [allTasks, usersData] = await Promise.all([
          globalTaskStore.getAllTasks(),
          microsoftDataService.users.getEnterpriseUsers()
        ]);
        setTasks(allTasks);
        setUsers(usersData);
        console.log('CalendarDeadlines: Loaded', allTasks.length, 'total items and', usersData.length, 'users');
        
        return unsubscribe;
      } catch (error) {
        console.error('CalendarDeadlines: Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
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

  // Get calculated status
  const getCalculatedStatus = (task) => {
    if (task.Completed_x003f_ === true || task.Completed_x003f_ === 'Yes' || task.Completed_x003f_ === 'yes' ||
        task.Completed === true || task.Completed === 'Yes' || task.Completed === 'yes') {
      return 'Completed';
    }
    
    const deadline = parseDeadlineDate(task.Deadline || task.deadline);
    if (deadline && deadline < new Date()) {
      return 'Overdue';
    }
    
    return 'Active';
  };

  // Convert responsible party emails to display names
  const getResponsiblePartyNames = (responsibleParty) => {
    if (!responsibleParty || !users || users.length === 0) {
      return responsibleParty || 'Unassigned';
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

  // Get tasks for a specific date
  const getTasksForDate = (date) => {
    return tasks.filter(task => {
      const deadline = parseDeadlineDate(task.Deadline);
      return deadline && isSameDay(deadline, date);
    });
  };

  // Calendar generation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      const tasksForDay = getTasksForDate(day);
      days.push({
        date: day,
        tasks: tasksForDay,
        isCurrentMonth: isSameMonth(day, currentDate),
        isToday: isToday(day)
      });
      day = addDays(day, 1);
    }

    return days;
  }, [currentDate, tasks]);

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

  // Get status color for task
  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-500';
      case 'Overdue':
        return 'bg-red-500';
      case 'Active':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed':
        return <CheckCircleIcon className="w-3 h-3 text-white" />;
      case 'Overdue':
        return <ExclamationTriangleIcon className="w-3 h-3 text-white" />;
      case 'Active':
        return <ClockIcon className="w-3 h-3 text-white" />;
      default:
        return <ClockIcon className="w-3 h-3 text-white" />;
    }
  };

  const navigateMonth = (direction) => {
    if (direction === 'prev') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-blue-950/30 dark:to-indigo-950/20 relative">
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
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 dark:from-white dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent">
              Calendar View
            </h1>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {tasks.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Total Tasks
            </div>
          </div>
        </div>

        {/* Main Layout */}
        <div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          onClick={(e) => {
            // Only deselect if clicking on the container itself, not on child elements
            if (e.target === e.currentTarget) {
              setSelectedDate(null);
            }
          }}
        >

          {/* Calendar Section */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 dark:border-gray-700/50 p-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {format(currentDate, 'MMMM yyyy')}
                </h2>
                
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Week day headers */}
                {weekDays.map(day => (
                  <div key={day} className="p-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {calendarDays.map((day, index) => {
                  const isSelected = selectedDate && isSameDay(day.date, selectedDate);

                  return (
                    <div
                      key={index}
                      className={`min-h-[80px] p-2 border border-gray-200/50 dark:border-gray-600/50 cursor-pointer transition-all rounded-lg ${
                        day.isCurrentMonth 
                          ? 'bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800' 
                          : 'bg-gray-50/50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500'
                      } ${
                        day.isToday 
                          ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50/50 dark:bg-blue-950/30' 
                          : ''
                      } ${
                        isSelected 
                          ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/30' 
                          : ''
                      }`}
                      onClick={() => setSelectedDate(day.date)}
                      onMouseEnter={() => !selectedDate && setSelectedDate(day.date)}
                    >
                      <div className={`text-sm font-medium mb-1 ${
                        day.isToday 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : day.isCurrentMonth 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {format(day.date, 'd')}
                      </div>
                      
                      {/* Task indicators */}
                      <div className="space-y-1">
                        {day.tasks.slice(0, 2).map((task, taskIndex) => {
                          const status = getCalculatedStatus(task);
                          return (
                            <div
                              key={taskIndex}
                              className={`flex items-center gap-1 px-1 py-0.5 rounded text-xs text-white ${getStatusColor(status)}`}
                              title={`${task.Task || 'Untitled Task'} - ${status}`}
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-white/80"></div>
                              <span className="truncate text-xs">
                                {(task.Task || 'Untitled Task').substring(0, 12)}
                              </span>
                            </div>
                          );
                        })}
                        {day.tasks.length > 2 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 px-1">
                            +{day.tasks.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Task Details Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 dark:border-gray-700/50 p-4 h-fit">
              {selectedDate ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <CalendarDaysIcon className="w-5 h-5 text-blue-500" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {format(selectedDate, 'MMM dd, yyyy')}
                    </h2>
                  </div>
                  
                  {getTasksForDate(selectedDate).length > 0 ? (
                    <div className="space-y-3">
                      {getTasksForDate(selectedDate).map(task => {
                        // Add daysUntil calculation for TaskCard
                        const deadline = parseISO(task.Deadline);
                        const today = new Date();
                        const daysUntil = deadline ? Math.ceil((deadline - today) / (1000 * 60 * 60 * 24)) : null;
                        
                        return (
                <TaskCard
                  key={task.id}
                  task={{
                    ...task,
                    daysUntil: daysUntil
                  }}
                  showCompletion={true}
                  showUrgency={true}
                  showDelete={true}
                  onToggleCompletion={toggleTaskCompletion}
                  onToggleUrgency={toggleTaskUrgency}
                  onDelete={deleteTask}
                  className="backdrop-blur-sm hover:scale-[1.02]"
                  users={users}
                />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CalendarDaysIcon className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No tasks scheduled</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <CalendarDaysIcon className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Select a date to view tasks</p>
                </div>
              )}
            </div>

            {/* Status Legend */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 dark:border-gray-700/50 p-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Status Legend</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Overdue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarDeadlinesPage;
