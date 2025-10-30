import React, { useState, useEffect } from 'react';
import { databaseDataService } from './databaseDataService';

const CalendarView = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Load tasks from database
  const loadTasks = async () => {
    try {
      setLoading(true);
      const tasksData = await databaseDataService.getCalendarData();
      setTasks(tasksData);
      console.log('Calendar: Loaded', tasksData.length, 'tasks');
    } catch (err) {
      console.error('Calendar: Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get calendar events for the current month
  const getCalendarEvents = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Create calendar grid
    const calendarDays = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayTasks = tasks.filter(task => {
        const taskDate = new Date(task.start);
        return taskDate.getDate() === day && 
               taskDate.getMonth() === month && 
               taskDate.getFullYear() === year;
      });
      
      calendarDays.push({
        date: day,
        fullDate: date,
        tasks: dayTasks
      });
    }
    
    return calendarDays;
  };

  // Navigate months
  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  // Get task color based on priority and status
  const getTaskColor = (task) => {
    if (task.extendedProps.completed) return 'bg-green-100 text-green-800 border-green-200';
    if (task.extendedProps.priority === 'Critical') return 'bg-red-100 text-red-800 border-red-200';
    if (task.extendedProps.priority === 'High') return 'bg-orange-100 text-orange-800 border-orange-200';
    if (task.extendedProps.priority === 'Medium') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  // Load data on component mount
  useEffect(() => {
    loadTasks();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading calendar...</p>
        </div>
      </div>
    );
  }

  const calendarDays = getCalendarEvents();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Calendar View
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View all deadlines in calendar format
          </p>
        </div>

        {/* Calendar Navigation */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateMonth(-1)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Previous
            </button>
            
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            
            <button
              onClick={() => navigateMonth(1)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Next
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
            {dayNames.map(day => (
              <div key={day} className="p-4 text-center font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`min-h-[120px] border-r border-b border-gray-200 dark:border-gray-700 p-2 ${
                  day ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'
                }`}
              >
                {day && (
                  <>
                    {/* Day Number */}
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {day.date}
                    </div>

                    {/* Tasks for this day */}
                    <div className="space-y-1">
                      {day.tasks.map((task, taskIndex) => (
                        <div
                          key={taskIndex}
                          className={`text-xs p-1 rounded border ${getTaskColor(task)} cursor-pointer hover:opacity-80`}
                          title={`${task.title} - ${task.extendedProps.project || 'No Project'} - ${task.extendedProps.responsibleParty || 'Unassigned'}`}
                        >
                          <div className="font-medium truncate">{task.title}</div>
                          <div className="text-xs opacity-75">
                            {task.extendedProps.project || 'No Project'}
                          </div>
                          {task.extendedProps.recurring && (
                            <div className="text-xs opacity-75">
                              🔄 {task.extendedProps.interval}
                            </div>
                          )}
                          {task.extendedProps.completed && (
                            <div className="text-xs opacity-75">
                              ✅ Completed
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Legend
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-100 border border-red-200 rounded mr-2"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Critical Priority</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-orange-100 border border-orange-200 rounded mr-2"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">High Priority</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded mr-2"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Medium Priority</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-100 border border-green-200 rounded mr-2"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Completed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
