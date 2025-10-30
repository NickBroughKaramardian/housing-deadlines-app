import React, { useState } from 'react';

function getMonthDays(year, month) {
  // month: 0-indexed
  const lastDay = new Date(year, month + 1, 0);
  const days = [];
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView({ tasks, handleEditClick, handleToggleCompleted, handleToggleUrgent, handleDeleteTask, parseDeadlineDate }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);
  const [hoveredDay, setHoveredDay] = useState(null);

  const days = getMonthDays(currentYear, currentMonth);
  const firstDayOfWeek = days[0].getDay();

  // Group tasks by date string (YYYY-MM-DD) using local timezone
  const tasksByDate = {};
  tasks.forEach(task => {
    const d = parseDeadlineDate(task.deadline);
    if (!d) return;
    // Use local timezone date string to avoid UTC offset issues
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const key = `${year}-${month}-${day}`;
    if (!tasksByDate[key]) tasksByDate[key] = [];
    tasksByDate[key].push(task);
  });

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  }
  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  }

  // Get the active day (selected or hovered)
  const activeDay = selectedDay || hoveredDay;
  const activeDayTasks = activeDay ? (tasksByDate[activeDay] || []) : [];

  // Format date for display
  const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Get today's date string in local timezone
  const todayString = (() => {
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-full">
      {/* Calendar Panel (65% width on desktop, full width on mobile) */}
      <div className="w-full lg:w-2/3 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 lg:p-6 flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <button onClick={prevMonth} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors duration-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' })} {currentYear}
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors duration-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-4">
          {weekdayNames.map(day => (
            <div key={day} className="text-center text-gray-500 dark:text-gray-400 font-medium text-sm py-3">{day}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1 flex-1">
          {/* Empty cells for first week */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={i} className="aspect-square"></div>
          ))}
          
          {days.map(day => {
            const year = day.getFullYear();
            const month = String(day.getMonth() + 1).padStart(2, '0');
            const dayNum = String(day.getDate()).padStart(2, '0');
            const key = `${year}-${month}-${dayNum}`;
            const dayTasks = tasksByDate[key] || [];
            const isToday = key === todayString;
            const isSelected = key === selectedDay;
            const isHovered = key === hoveredDay;
            
            // Calculate number of dots to show (max 6 dots)
            const maxDots = 6;
            const numDots = Math.min(dayTasks.length, maxDots);
            
            return (
              <button
                key={key}
                onClick={() => setSelectedDay(selectedDay === key ? null : key)}
                onMouseEnter={() => setHoveredDay(key)}
                onMouseLeave={() => setHoveredDay(null)}
                className={`aspect-square rounded-lg border p-2 flex flex-col items-center justify-start transition-all duration-200 ${
                  isToday ? 'bg-theme-primary-light border-theme-primary' :
                  isSelected ? 'bg-theme-primary-light border-theme-primary ring-2 ring-theme-primary' :
                  isHovered ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600' :
                  'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className={`font-semibold text-sm ${
                  isToday ? 'text-theme-primary-dark' :
                  isSelected ? 'text-theme-primary-dark' :
                  'text-gray-700 dark:text-gray-200'
                }`}>
                  {day.getDate()}
                </span>
                <div className="flex flex-wrap gap-0.5 mt-2 justify-center max-w-full">
                  {Array.from({ length: numDots }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full ${
                        dayTasks[idx]?.completed ? 'bg-green-500' :
                        dayTasks[idx]?.important ? 'bg-orange-500' :
                        dayTasks[idx]?.originalRecurring || dayTasks[idx]?.recurring ? 'bg-blue-400' :
                        'bg-gray-400'
                      }`}
                    ></span>
                  ))}
                  {dayTasks.length > maxDots && (
                    <span className="text-xs text-gray-400 ml-1">+{dayTasks.length - maxDots}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Deadlines Panel (35% width on desktop, full width on mobile) */}
      <div className="w-full lg:w-1/3 bg-white rounded-lg shadow-sm p-4 lg:p-6 flex flex-col">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {activeDay ? formatDate(activeDay) : 'Select a day'}
        </h3>
        
        <div className="flex-1 overflow-y-auto">
          {activeDay && (
            <div className="space-y-3">
              {activeDayTasks.length > 0 ? (
                activeDayTasks.map(task => (
                  <div key={task.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 dark:text-gray-200 text-sm">{task.description}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{task.projectName} • {task.responsibleParty}</div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        {task.completed && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-theme-primary-light text-theme-primary-dark">
                            COMPLETED
                          </span>
                        )}
                        {task.important && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200">
                            URGENT
                          </span>
                        )}
                        {(task.originalRecurring || task.recurring) && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                            RECURRING
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleEditClick(task)} 
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleToggleCompleted(task.instanceId, task.originalId)} 
                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-200 ${
                          task.completed 
                            ? 'bg-theme-primary text-white hover:bg-theme-primary-hover' 
                            : 'bg-theme-primary-light text-theme-primary hover:bg-theme-primary-light'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleToggleUrgent(task.instanceId, task.originalId)} 
                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-200 ${
                          task.important 
                            ? 'bg-orange-600 text-white hover:bg-orange-700' 
                            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-900/50'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDeleteTask(task.instanceId, task.originalId)} 
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-600">No deadlines for this day</p>
                </div>
              )}
            </div>
          )}
          
          {!activeDay && (
            <div className="text-center text-gray-500 py-12">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-gray-600">Hover over or click on a day to view deadlines</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 