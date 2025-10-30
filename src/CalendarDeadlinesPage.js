import React, { useState, useEffect, useMemo } from 'react';
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { globalTaskStore } from './globalTaskStore';
import TaskCard from './TaskCard';
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, isSameDay, addDays, subDays } from 'date-fns';

function CalendarDeadlinesPage() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'week', 'month'

  // Subscribe to global task store
  useEffect(() => {
    const unsubscribe = globalTaskStore.subscribe(({ tasks, isLoading }) => {
      setTasks(tasks);
      setIsLoading(isLoading);
    });

    // Get initial tasks from store
    const initialTasks = globalTaskStore.getAllTasks();
    if (initialTasks.length > 0) {
      setTasks(initialTasks);
      setIsLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // Get tasks for the current view
  const getTasksForView = useMemo(() => {
    if (!tasks.length) return [];

    const startDate = viewMode === 'week' 
      ? startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday start
      : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    const endDate = viewMode === 'week'
      ? endOfWeek(currentDate, { weekStartsOn: 1 })
      : new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    return tasks.filter(task => {
      if (!task.deadline) return false;
      
      try {
        const taskDate = parseISO(task.deadline);
        return isWithinInterval(taskDate, { start: startDate, end: endDate });
      } catch (error) {
        console.warn('Calendar: Error parsing task deadline:', task.deadline, error);
        return false;
      }
    });
  }, [tasks, currentDate, viewMode]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped = {};
    
    getTasksForView.forEach(task => {
      try {
        const taskDate = parseISO(task.deadline);
        const dateKey = format(taskDate, 'yyyy-MM-dd');
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      } catch (error) {
        console.warn('Calendar: Error grouping task by date:', task.deadline, error);
      }
    });

    return grouped;
  }, [getTasksForView]);

  // Get calendar days for the current view
  const getCalendarDays = useMemo(() => {
    const days = [];
    const startDate = viewMode === 'week' 
      ? startOfWeek(currentDate, { weekStartsOn: 1 })
      : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    const endDate = viewMode === 'week'
      ? endOfWeek(currentDate, { weekStartsOn: 1 })
      : new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

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
                      {day.tasks.slice(0, 3).map((task, taskIndex) => (
                        <div
                          key={`${task.id}-${taskIndex}`}
                          className="text-xs p-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 truncate"
                        >
                          {task.task || 'Untitled Task'}
                        </div>
                      ))}
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
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {getTasksForView
                  .sort((a, b) => {
                    try {
                      const dateA = parseISO(a.deadline);
                      const dateB = parseISO(b.deadline);
                      return dateA - dateB;
                    } catch (error) {
                      return 0;
                    }
                  })
                  .map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      className="hover:shadow-md transition-shadow"
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
    </div>
  );
}

export default CalendarDeadlinesPage;
