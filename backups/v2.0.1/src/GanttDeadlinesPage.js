import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChartBarIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserIcon,
  FolderIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { format, startOfYear, endOfYear, parseISO, isValid, differenceInDays, startOfMonth, eachMonthOfInterval, isWithinInterval } from 'date-fns';
import { sharedDataService } from './sharedDataService';
import { microsoftDataService } from './microsoftDataService';

function GanttDeadlinesPage() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [hoveredTask, setHoveredTask] = useState(null);
  const [viewMode, setViewMode] = useState('year'); // 'year' or 'month'

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const tasksData = await sharedDataService.getAllTasks();
        setTasks(tasksData);
        
        const usersData = await microsoftDataService.users.getEnterpriseUsers();
        setUsers(usersData);
      } catch (error) {
        console.error('GanttDeadlinesPage: Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const parseDeadlineDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return isValid(date) ? date : null;
    } catch (error) {
      return null;
    }
  };

  const getCalculatedStatus = (task) => {
    if (task.Completed_x003f_ === true || task.Completed_x003f_ === 'Yes') {
      return 'Completed';
    }
    const deadline = parseDeadlineDate(task.Deadline);
    if (deadline && deadline < new Date()) {
      return 'Overdue';
    }
    return 'Active';
  };

  const getResponsiblePartyNames = (responsibleParty) => {
    if (!responsibleParty || !users || users.length === 0) {
      return responsibleParty || '';
    }
    
    const emails = responsibleParty.split(';').map(email => email.trim()).filter(email => email);
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

  const yearTasks = useMemo(() => {
    return tasks.filter(task => {
      const deadline = parseDeadlineDate(task.Deadline);
      if (!deadline) return false;
      return deadline.getFullYear() === selectedYear;
    });
  }, [tasks, selectedYear]);

  const monthTasks = useMemo(() => {
    if (selectedMonth === null) return [];
    return yearTasks.filter(task => {
      const deadline = parseDeadlineDate(task.Deadline);
      return deadline && deadline.getMonth() === selectedMonth;
    });
  }, [yearTasks, selectedMonth]);

  const currentTasks = viewMode === 'month' ? monthTasks : yearTasks;

  const months = useMemo(() => {
    const start = startOfYear(new Date(selectedYear, 0, 1));
    const end = endOfYear(new Date(selectedYear, 11, 31));
    return eachMonthOfInterval({ start, end });
  }, [selectedYear]);

  const getTaskPosition = (task) => {
    const deadline = parseDeadlineDate(task.Deadline);
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
      const deadline = parseDeadlineDate(task.Deadline);
      return deadline && deadline.getMonth() === monthIndex;
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'Overdue':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'Active':
        return <ClockIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'Overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'Active':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getTaskDotColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-500 ring-green-200 dark:ring-green-800';
      case 'Overdue':
        return 'bg-red-500 ring-red-200 dark:ring-red-800';
      case 'Active':
        return 'bg-blue-500 ring-blue-200 dark:ring-blue-800';
      default:
        return 'bg-gray-500 ring-gray-200 dark:ring-gray-800';
    }
  };

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-blue-950/30 dark:to-indigo-950/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-blue-950/30 dark:to-indigo-950/20">
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
              <div className="flex justify-between text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                <span className="text-center flex-1">Jan</span>
                <span className="text-center flex-1">Feb</span>
                <span className="text-center flex-1">Mar</span>
                <span className="text-center flex-1">Apr</span>
                <span className="text-center flex-1">May</span>
                <span className="text-center flex-1">Jun</span>
                <span className="text-center flex-1">Jul</span>
                <span className="text-center flex-1">Aug</span>
                <span className="text-center flex-1">Sep</span>
                <span className="text-center flex-1">Oct</span>
                <span className="text-center flex-1">Nov</span>
                <span className="text-center flex-1">Dec</span>
              </div>
              
              {/* Current Month Indicator */}
              {(() => {
                const now = new Date();
                if (now.getFullYear() === selectedYear) {
                  const currentMonth = now.getMonth();
                  const monthPosition = (currentMonth / 11) * 100; // 0-11 months mapped to 0-100%
                  
                  return (
                    <div 
                      className="absolute top-0 h-2 w-0.5 bg-blue-500 opacity-60"
                      style={{ 
                        left: `${monthPosition}%`,
                        transform: 'translateX(-0.125rem)'
                      }}
                    />
                  );
                }
                return null;
              })()}
              
              {/* Month Clickable Areas */}
              <div className="absolute top-0 left-0 w-full h-8 flex">
                {months.map((month, index) => {
                  const tasksInMonth = getTasksForMonth(index);
                  const hasTasks = tasksInMonth.length > 0;
                  const isSelected = selectedMonth === index;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleMonthClick(index)}
                      className={`flex-1 h-8 border-r border-gray-200 dark:border-gray-600 last:border-r-0 transition-all duration-200 relative ${
                        hasTasks 
                          ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      } ${isSelected ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-300 dark:ring-blue-600' : ''}`}
                      title={`${format(month, 'MMMM')} - ${tasksInMonth.length} tasks`}
                    >
                      {hasTasks && (
                        <div className="absolute top-1 left-1/2 transform -translate-x-1/2">
                          <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400"></div>
                        </div>
                      )}
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
                  className="absolute top-6 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 opacity-80"
                  style={{ 
                    left: `${progressPosition}%`, 
                    width: '2px',
                    transform: 'translateX(-1px)'
                  }}
                >
                  {/* Progress indicator dot */}
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"></div>
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
            
            {/* Task Dots */}
            <div className="relative h-12">
              {currentTasks.map((task) => {
                const position = getTaskPosition(task);
                const status = getCalculatedStatus(task);
                const isSelected = selectedTask?.id === task.id;
                const isHovered = hoveredTask?.id === task.id;
                
                return (
                  <button
                    key={task.id}
                    onClick={() => handleTaskClick(task)}
                    onMouseEnter={() => setHoveredTask(task)}
                    onMouseLeave={() => setHoveredTask(null)}
                    className={`absolute top-4 transform -translate-x-1/2 w-4 h-4 rounded-full ${getTaskDotColor(status)} ${getPriorityRing(task)} transition-all duration-200 hover:scale-125 ${
                      isSelected ? 'ring-4 ring-gray-400 dark:ring-gray-500' : ''
                    } ${isHovered ? 'ring-4 ring-blue-400 dark:ring-blue-500' : ''}`}
                    style={{ left: `${position.left}%` }}
                    title={`${task.Task} - ${format(parseDeadlineDate(task.Deadline), 'MMM dd, yyyy')}`}
                  >
                    {/* Inner dot */}
                    <div className="absolute inset-1 rounded-full bg-white dark:bg-gray-100"></div>
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
                {getTasksForMonth(selectedMonth).map((task) => {
                  const status = getCalculatedStatus(task);
                  const deadline = parseDeadlineDate(task.Deadline);
                  const responsibleNames = getResponsiblePartyNames(task.ResponsibleParty);
                  
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleTaskClick(task)}
                      className={`group p-4 rounded-xl backdrop-blur-sm border transition-all duration-200 hover:scale-[1.02] hover:shadow-lg cursor-pointer ${
                        status === 'Active' 
                          ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/30 hover:bg-blue-50/80 dark:hover:bg-blue-950/30' 
                          : status === 'Overdue'
                          ? 'bg-red-50/60 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/30 hover:bg-red-50/80 dark:hover:bg-red-950/30'
                          : status === 'Completed'
                          ? 'bg-green-50/60 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/30 hover:bg-green-50/80 dark:hover:bg-green-950/30'
                          : 'bg-gray-50/60 dark:bg-gray-950/20 border-gray-200/50 dark:border-gray-800/30 hover:bg-gray-50/80 dark:hover:bg-gray-950/30'
                      } ${task.Priority === 'Urgent' ? 'ring-2 ring-orange-200/50 dark:ring-orange-800/30' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(status)}
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-900 dark:group-hover:text-blue-100 transition-colors">
                            {task.Task || 'Untitled Task'}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                            {status}
                          </span>
                          {task.Priority === 'Urgent' && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md">
                              Urgent
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                              <FolderIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">{task.Project || 'No Project'}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-md">
                              <UserIcon className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">{responsibleNames}</span>
                          </div>
                        </div>

                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm border ${
                          status === 'Active' 
                            ? 'bg-blue-100/40 dark:bg-blue-900/20 border-blue-200/30 dark:border-blue-800/20' 
                            : status === 'Overdue'
                            ? 'bg-red-100/40 dark:bg-red-900/20 border-red-200/30 dark:border-red-800/20'
                            : status === 'Completed'
                            ? 'bg-green-100/40 dark:bg-green-900/20 border-green-200/30 dark:border-green-800/20'
                            : 'bg-gray-100/40 dark:bg-gray-900/20 border-gray-200/30 dark:border-gray-800/20'
                        }`}>
                          <div className={`p-1 rounded-md ${
                            status === 'Active' 
                              ? 'bg-blue-200/60 dark:bg-blue-800/40' 
                              : status === 'Overdue'
                              ? 'bg-red-200/60 dark:bg-red-800/40'
                              : status === 'Completed'
                              ? 'bg-green-200/60 dark:bg-green-800/40'
                              : 'bg-gray-200/60 dark:bg-gray-800/40'
                          }`}>
                            <CalendarDaysIcon className={`w-3.5 h-3.5 ${
                              status === 'Active' 
                                ? 'text-blue-700 dark:text-blue-300' 
                                : status === 'Overdue'
                                ? 'text-red-700 dark:text-red-300'
                                : status === 'Completed'
                                ? 'text-green-700 dark:text-green-300'
                                : 'text-gray-700 dark:text-gray-300'
                            }`} />
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Due</div>
                            <div className={`text-sm font-bold ${
                              status === 'Active' 
                                ? 'text-blue-900 dark:text-blue-100' 
                                : status === 'Overdue'
                                ? 'text-red-900 dark:text-red-100'
                                : status === 'Completed'
                                ? 'text-green-900 dark:text-green-100'
                                : 'text-gray-900 dark:text-gray-100'
                            }`}>
                              {deadline ? format(deadline, 'MMM dd, yyyy') : 'No date'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {task.Notes && (
                        <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-600/30">
                          <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                            {task.Notes}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>


        {/* Task Card and Monthly Task List */}
        {(selectedTask || hoveredTask) && (
          <div className="space-y-4">
            {/* Individual Task Card */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 dark:border-gray-700/50 p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Task Details
                </h3>
                <button
                  onClick={() => {
                    setSelectedTask(null);
                    setHoveredTask(null);
                  }}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <ChevronDownIcon className="w-5 h-5" />
                </button>
              </div>
              
              {(() => {
                const task = selectedTask || hoveredTask;
                const status = getCalculatedStatus(task);
                const deadline = parseDeadlineDate(task.Deadline);
                const responsibleNames = getResponsiblePartyNames(task.ResponsibleParty);
                
                return (
                  <div className={`group p-4 rounded-xl backdrop-blur-sm border transition-all duration-200 ${
                    status === 'Active' 
                      ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/30' 
                      : status === 'Overdue'
                      ? 'bg-red-50/60 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/30'
                      : status === 'Completed'
                      ? 'bg-green-50/60 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/30'
                      : 'bg-gray-50/60 dark:bg-gray-950/20 border-gray-200/50 dark:border-gray-800/30'
                  } ${task.Priority === 'Urgent' ? 'ring-2 ring-orange-200/50 dark:ring-orange-800/30' : ''}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(status)}
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-900 dark:group-hover:text-blue-100 transition-colors">
                          {task.Task || 'Untitled Task'}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                          {status}
                        </span>
                        {task.Priority === 'Urgent' && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md">
                            Urgent
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                            <FolderIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">{task.Project || 'No Project'}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-md">
                            <UserIcon className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">{responsibleNames}</span>
                        </div>
                      </div>

                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm border ${
                        status === 'Active' 
                          ? 'bg-blue-100/40 dark:bg-blue-900/20 border-blue-200/30 dark:border-blue-800/20' 
                          : status === 'Overdue'
                          ? 'bg-red-100/40 dark:bg-red-900/20 border-red-200/30 dark:border-red-800/20'
                          : status === 'Completed'
                          ? 'bg-green-100/40 dark:bg-green-900/20 border-green-200/30 dark:border-green-800/20'
                          : 'bg-gray-100/40 dark:bg-gray-900/20 border-gray-200/30 dark:border-gray-800/20'
                      }`}>
                        <div className={`p-1 rounded-md ${
                          status === 'Active' 
                            ? 'bg-blue-200/60 dark:bg-blue-800/40' 
                            : status === 'Overdue'
                            ? 'bg-red-200/60 dark:bg-red-800/40'
                            : status === 'Completed'
                            ? 'bg-green-200/60 dark:bg-green-800/40'
                            : 'bg-gray-200/60 dark:bg-gray-800/40'
                        }`}>
                          <CalendarDaysIcon className={`w-3.5 h-3.5 ${
                            status === 'Active' 
                              ? 'text-blue-700 dark:text-blue-300' 
                              : status === 'Overdue'
                              ? 'text-red-700 dark:text-red-300'
                              : status === 'Completed'
                              ? 'text-green-700 dark:text-green-300'
                              : 'text-gray-700 dark:text-gray-300'
                          }`} />
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Due</div>
                          <div className={`text-sm font-bold ${
                            status === 'Active' 
                              ? 'text-blue-900 dark:text-blue-100' 
                              : status === 'Overdue'
                              ? 'text-red-900 dark:text-red-100'
                              : status === 'Completed'
                              ? 'text-green-900 dark:text-green-100'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {deadline ? format(deadline, 'MMM dd, yyyy') : 'No date'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {task.Notes && (
                      <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-600/30">
                        <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                          {task.Notes}
                        </p>
                      </div>
                    )}
                  </div>
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
                    {monthTasks.map((task, index) => {
                      const status = getCalculatedStatus(task);
                      const deadline = parseDeadlineDate(task.Deadline);
                      const responsibleNames = getResponsiblePartyNames(task.ResponsibleParty);
                      
                      return (
                        <div
                          key={task.id}
                          onClick={() => handleTaskClick(task)}
                          className={`group p-4 rounded-xl backdrop-blur-sm border transition-all duration-200 hover:scale-[1.02] hover:shadow-lg cursor-pointer ${
                            status === 'Active' 
                              ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/30 hover:bg-blue-50/80 dark:hover:bg-blue-950/30' 
                              : status === 'Overdue'
                              ? 'bg-red-50/60 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/30 hover:bg-red-50/80 dark:hover:bg-red-950/30'
                              : status === 'Completed'
                              ? 'bg-green-50/60 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/30 hover:bg-green-50/80 dark:hover:bg-green-950/30'
                              : 'bg-gray-50/60 dark:bg-gray-950/20 border-gray-200/50 dark:border-gray-800/30 hover:bg-gray-50/80 dark:hover:bg-gray-950/30'
                          } ${task.Priority === 'Urgent' ? 'ring-2 ring-orange-200/50 dark:ring-orange-800/30' : ''}`}
                          style={{ animationDelay: `${index * 30}ms` }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(status)}
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-900 dark:group-hover:text-blue-100 transition-colors">
                                {task.Task || 'Untitled Task'}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                                {status}
                              </span>
                              {task.Priority === 'Urgent' && (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md">
                                  Urgent
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                                  <FolderIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <span className="text-xs text-gray-600 dark:text-gray-400">{task.Project || 'No Project'}</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-md">
                                  <UserIcon className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                </div>
                                <span className="text-xs text-gray-600 dark:text-gray-400">{responsibleNames}</span>
                              </div>
                            </div>

                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm border ${
                              status === 'Active' 
                                ? 'bg-blue-100/40 dark:bg-blue-900/20 border-blue-200/30 dark:border-blue-800/20' 
                                : status === 'Overdue'
                                ? 'bg-red-100/40 dark:bg-red-900/20 border-red-200/30 dark:border-red-800/20'
                                : status === 'Completed'
                                ? 'bg-green-100/40 dark:bg-green-900/20 border-green-200/30 dark:border-green-800/20'
                                : 'bg-gray-100/40 dark:bg-gray-900/20 border-gray-200/30 dark:border-gray-800/20'
                            }`}>
                              <div className={`p-1 rounded-md ${
                                status === 'Active' 
                                  ? 'bg-blue-200/60 dark:bg-blue-800/40' 
                                  : status === 'Overdue'
                                  ? 'bg-red-200/60 dark:bg-red-800/40'
                                  : status === 'Completed'
                                  ? 'bg-green-200/60 dark:bg-green-800/40'
                                  : 'bg-gray-200/60 dark:bg-gray-800/40'
                              }`}>
                                <CalendarDaysIcon className={`w-3.5 h-3.5 ${
                                  status === 'Active' 
                                    ? 'text-blue-700 dark:text-blue-300' 
                                    : status === 'Overdue'
                                    ? 'text-red-700 dark:text-red-300'
                                    : status === 'Completed'
                                    ? 'text-green-700 dark:text-green-300'
                                    : 'text-gray-700 dark:text-gray-300'
                                }`} />
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Due</div>
                                <div className={`text-sm font-bold ${
                                  status === 'Active' 
                                    ? 'text-blue-900 dark:text-blue-100' 
                                    : status === 'Overdue'
                                    ? 'text-red-900 dark:text-red-100'
                                    : status === 'Completed'
                                    ? 'text-green-900 dark:text-green-100'
                                    : 'text-gray-900 dark:text-gray-100'
                                }`}>
                                  {deadline ? format(deadline, 'MMM dd, yyyy') : 'No date'}
                                </div>
                              </div>
                            </div>
                          </div>

                          {task.Notes && (
                            <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-600/30">
                              <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                                {task.Notes}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 dark:border-gray-700/50 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Status Legend</h3>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-gray-600 dark:text-gray-300">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600 dark:text-gray-300">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-600 dark:text-gray-300">Overdue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500 ring-2 ring-orange-300 dark:ring-orange-600"></div>
              <span className="text-gray-600 dark:text-gray-300">Urgent Priority</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GanttDeadlinesPage;