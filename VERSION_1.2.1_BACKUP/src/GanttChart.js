import React, { useState, useMemo, useEffect } from 'react';
import { parse, isValid, format, differenceInDays, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';

export default function GanttChart({ tasks, handleEditClick, handleToggleCompleted, handleToggleUrgent, handleDeleteTask, handleDocumentLinkClick, parseDeadlineDate }) {
  const [selectedProject, setSelectedProject] = useState('all');
  const [hoveredTask, setHoveredTask] = useState(null);
  const [pinnedTask, setPinnedTask] = useState(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  // Get unique projects
  const projects = useMemo(() => {
    const projectSet = new Set(tasks.map(task => task.projectName).filter(Boolean));
    return ['all', ...Array.from(projectSet).sort()];
  }, [tasks]);

  // Filter tasks by selected project and month
  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    
    // Filter by project
    if (selectedProject !== 'all') {
      filtered = filtered.filter(task => task.projectName === selectedProject);
    }
    
    // Filter by month if selected
    if (selectedMonth !== null) {
      filtered = filtered.filter(task => {
        let deadline;
        if (task.deadline instanceof Date) {
          deadline = task.deadline;
        } else if (typeof task.deadline === 'string') {
          deadline = parseDeadlineDate(task.deadline);
        } else {
          return false;
        }
        
        return deadline && 
               deadline.getFullYear() === currentYear && 
               deadline.getMonth() === selectedMonth;
      });
    }
    
    return filtered;
  }, [tasks, selectedProject, selectedMonth, currentYear, parseDeadlineDate]);

  // Get timeline data for the current year
  const timelineData = useMemo(() => {
    const yearStart = startOfYear(new Date(currentYear, 0, 1));
    const yearEnd = endOfYear(new Date(currentYear, 11, 31));
    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
    
    return months.map(month => ({
      month: month.getMonth(),
      year: month.getFullYear(),
      name: month.toLocaleString('default', { month: 'short' }),
      days: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    }));
  }, [currentYear]);

  // Calculate task positions on timeline
  const taskPositions = useMemo(() => {
    const yearStart = startOfYear(new Date(currentYear, 0, 1));
    
    return filteredTasks.map(task => {
      // Handle both string and Date objects for deadline
      let deadline;
      if (task.deadline instanceof Date) {
        deadline = task.deadline;
      } else if (typeof task.deadline === 'string') {
        deadline = parseDeadlineDate(task.deadline);
      } else {
        return null;
      }
      if (!deadline || deadline.getFullYear() !== currentYear) return null;
      
      const daysFromStart = differenceInDays(deadline, yearStart);
      const totalDays = differenceInDays(endOfYear(yearStart), yearStart);
      const position = (daysFromStart / totalDays) * 100;
      
      return {
        ...task,
        position,
        deadline,
        daysFromStart
      };
    }).filter(Boolean).sort((a, b) => a.daysFromStart - b.daysFromStart);
  }, [filteredTasks, currentYear, parseDeadlineDate, tasks.length, forceUpdate, JSON.stringify(tasks.map(t => ({ id: t.id, completed: t.completed, important: t.important })))]);

  // Update hovered task when task data changes
  useEffect(() => {
    if (hoveredTask) {
      const updatedTask = taskPositions.find(t => 
        t.instanceId === hoveredTask.instanceId || 
        t.id === hoveredTask.id ||
        (t.originalId && t.originalId === hoveredTask.originalId)
      );
      if (updatedTask) {
        setHoveredTask(updatedTask);
      }
    }
  }, [taskPositions, hoveredTask?.instanceId, hoveredTask?.id, hoveredTask?.originalId]);

  // Get status configuration for task styling
  const getStatusConfig = (task) => {
    const today = new Date();
    // Handle both string and Date objects for deadline
    let deadline;
    if (task.deadline instanceof Date) {
      deadline = task.deadline;
    } else if (typeof task.deadline === 'string') {
      deadline = parseDeadlineDate(task.deadline);
    } else {
      deadline = null;
    }
    const daysDiff = deadline ? differenceInDays(deadline, today) : null;
    const completed = !!task.completed;
    
    if (completed) {
      return {
        bg: 'bg-green-500',
        border: 'border-green-600',
        text: 'text-green-800',
        shadow: 'shadow-green-200'
      };
    } else if (daysDiff !== null && daysDiff < 0) {
      return {
        bg: 'bg-red-500',
        border: 'border-red-600',
        text: 'text-red-800',
        shadow: 'shadow-red-200'
      };
    } else if (daysDiff !== null && daysDiff <= 3) {
      return {
        bg: 'bg-orange-500',
        border: 'border-orange-600',
        text: 'text-orange-800',
        shadow: 'shadow-orange-200'
      };
    } else {
      return {
        bg: 'bg-blue-500',
        border: 'border-blue-600',
        text: 'text-blue-800',
        shadow: 'shadow-blue-200'
      };
    }
  };

  const formatDate = (date) => {
    if (!date) return 'No date';
    let d;
    if (typeof date === 'string') {
      d = parseDeadlineDate(date);
    } else if (date instanceof Date) {
      d = date;
    } else {
      return 'Invalid date';
    }
    
    if (!d || isNaN(d.getTime())) return 'Invalid date';
    
    try {
      return format(d, 'MMM dd, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'Invalid date';
    }
  };

  const getDaysUntilDeadline = (deadline) => {
    if (!deadline) return 'No deadline';
    
    let d;
    if (typeof deadline === 'string') {
      d = parseDeadlineDate(deadline);
    } else if (deadline instanceof Date) {
      d = deadline;
    } else {
      return 'Invalid deadline';
    }
    
    if (!d || isNaN(d.getTime())) return 'Invalid deadline';
    
    try {
      const today = new Date();
      const diff = differenceInDays(d, today);
      if (diff < 0) return `${Math.abs(diff)} days overdue`;
      if (diff === 0) return 'Due today';
      if (diff === 1) return 'Due tomorrow';
      return `Due in ${diff} days`;
    } catch (error) {
      console.error('Error calculating days until deadline:', error, deadline);
      return 'Invalid deadline';
    }
  };

  // Wrapper functions to force re-render after state changes
  const handleToggleCompletedWrapper = async (taskId, originalId) => {
    await handleToggleCompleted(taskId, originalId);
    setForceUpdate(prev => prev + 1);
  };

  const handleToggleUrgentWrapper = async (taskId, originalId) => {
    await handleToggleUrgent(taskId, originalId);
    setForceUpdate(prev => prev + 1);
  };

  const handleDeleteTaskWrapper = async (taskId, originalId) => {
    await handleDeleteTask(taskId, originalId);
    setForceUpdate(prev => prev + 1);
    // Clear hovered task if it's the same task being deleted
    if (hoveredTask && (hoveredTask.instanceId === taskId || hoveredTask.id === taskId)) {
      setHoveredTask(null);
    }
  };

  return (
    <div className="w-full bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-theme-primary to-theme-primary-hover rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Gantt Chart
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {selectedMonth !== null 
                  ? `Timeline view for ${timelineData[selectedMonth]?.name} ${currentYear}`
                  : 'Timeline view of project deadlines'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-white dark:bg-gray-700 rounded-xl p-2 shadow-md border border-gray-200 dark:border-gray-600">
            <button 
              onClick={() => setCurrentYear(prev => prev - 1)}
              className="p-2 rounded-lg bg-gray-50 dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 text-gray-600 dark:text-gray-300 transition-all duration-200 hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xl font-bold text-gray-800 dark:text-white min-w-[100px] text-center px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
              {currentYear}
            </span>
            <button 
              onClick={() => setCurrentYear(prev => prev + 1)}
              className="p-2 rounded-lg bg-gray-50 dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 text-gray-600 dark:text-gray-300 transition-all duration-200 hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Project Filter */}
        <div className="flex items-center gap-3 bg-white dark:bg-gray-700 rounded-xl p-3 shadow-md border border-gray-200 dark:border-gray-600">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Project:</label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-w-[180px]"
          >
            {projects.map(project => (
              <option key={project} value={project}>
                {project === 'all' ? 'All Projects' : project}
              </option>
            ))}
          </select>
          
          {/* Clear Filters Button */}
          {(selectedProject !== 'all' || selectedMonth !== null) && (
            <button
              onClick={() => {
                setSelectedProject('all');
                setSelectedMonth(null);
              }}
              className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-105 flex items-center gap-1"
              title="Clear all filters"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative bg-white dark:bg-gray-700 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-600 mb-8">
        {/* Month labels */}
        <div className="flex mb-6">
          {selectedMonth !== null ? (
            // Day labels for selected month
            Array.from({ length: new Date(currentYear, selectedMonth + 1, 0).getDate() }, (_, i) => i + 1).map((day) => (
              <div key={day} className="flex-1 text-center">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-600 rounded py-1 mx-0.5">
                  {day}
                </div>
              </div>
            ))
          ) : (
            // Month labels for year view
            timelineData.map((month, index) => (
              <div 
                key={index} 
                className="flex-1 text-center"
              >
                <button
                  onClick={() => setSelectedMonth(selectedMonth === month.month ? null : month.month)}
                  className={`w-full text-sm font-bold rounded-lg py-2 mx-1 transition-all duration-200 hover:scale-105 ${
                    selectedMonth === month.month
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                      : 'bg-gray-50 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500'
                  }`}
                  title={selectedMonth === month.month ? 'Click to view all months' : `Click to view ${month.name} only`}
                >
                  {month.name}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Timeline track */}
        <div className="relative h-20 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-600 dark:to-gray-700 rounded-xl mb-8 border border-gray-200 dark:border-gray-600">
          {/* Today indicator */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-red-400 to-red-600 z-10"
            style={{
              left: selectedMonth !== null 
                ? `${((new Date().getDate() - 1) / new Date(new Date().getFullYear(), selectedMonth + 1, 0).getDate()) * 100}%`
                : `${(differenceInDays(new Date(), startOfYear(new Date(currentYear, 0, 1))) / 365) * 100}%`
            }}
          >
            <div className="absolute -top-3 -left-2 w-5 h-5 bg-gradient-to-br from-red-400 to-red-600 rounded-full shadow-lg border-2 border-white dark:border-gray-800"></div>
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-white dark:bg-gray-800 rounded-full"></div>
          </div>

          {/* Task dots - grouped by position to handle overlapping */}
          {(() => {
            // Group tasks by position (rounded to nearest 0.1% to handle slight variations)
            const groupedTasks = {};
            taskPositions.forEach(task => {
              let position;
              if (selectedMonth !== null) {
                const monthStart = new Date(currentYear, selectedMonth, 1);
                const daysFromMonthStart = differenceInDays(task.deadline, monthStart);
                const daysInMonth = new Date(currentYear, selectedMonth + 1, 0).getDate();
                position = Math.max(0, Math.min(100, (daysFromMonthStart / daysInMonth) * 100));
              } else {
                position = task.position;
              }
              
              const positionKey = Math.round(position * 10) / 10;
              if (!groupedTasks[positionKey]) {
                groupedTasks[positionKey] = [];
              }
              groupedTasks[positionKey].push({ ...task, calculatedPosition: position });
            });

            return Object.entries(groupedTasks).map(([positionKey, tasks]) => {
              const position = parseFloat(positionKey);
              const isHovered = hoveredTask && tasks.some(t => t.id === hoveredTask.id);
              const isPinned = pinnedTask && tasks.some(t => t.id === pinnedTask.id || t.instanceId === pinnedTask.instanceId);
              
              // Determine dot color based on completion status
              const completedCount = tasks.filter(t => t.completed).length;
              const totalCount = tasks.length;
              
              let dotColor;
              if (completedCount === 0) {
                // No tasks completed - use individual task status
                const status = getStatusConfig(tasks[0]);
                dotColor = status.bg;
              } else if (completedCount === totalCount) {
                // All tasks completed - green
                dotColor = 'bg-gradient-to-br from-green-400 to-green-600 border-green-500';
              } else {
                // Some tasks completed - orange
                dotColor = 'bg-gradient-to-br from-orange-400 to-orange-600 border-orange-500';
              }
              
              return (
                <div
                  key={positionKey}
                  className={`absolute top-1/2 transform -translate-y-1/2 w-5 h-5 rounded-full border-3 cursor-pointer transition-all duration-300 ${dotColor} ${
                    isPinned 
                      ? 'scale-150 shadow-2xl ring-4 ring-purple-200 dark:ring-purple-800 z-10' 
                      : isHovered 
                      ? 'scale-150 shadow-2xl ring-4 ring-blue-200 dark:ring-blue-800 z-10' 
                      : 'hover:scale-125 hover:shadow-lg z-10'
                  }`}
                  style={{ left: `${position}%` }}
                  onMouseEnter={() => {
                    if (hoverTimeout) {
                      clearTimeout(hoverTimeout);
                      setHoverTimeout(null);
                    }
                    // Show the first task as the main hovered task
                    setHoveredTask(tasks[0]);
                  }}
                  onMouseLeave={() => {
                    const timeout = setTimeout(() => setHoveredTask(null), 300);
                    setHoverTimeout(timeout);
                  }}
                  onClick={() => {
                    // Toggle pin: if this task is already pinned, unpin it; otherwise pin it
                    if (pinnedTask && (pinnedTask.id === tasks[0].id || pinnedTask.instanceId === tasks[0].instanceId)) {
                      setPinnedTask(null);
                    } else {
                      setPinnedTask(tasks[0]);
                    }
                  }}
                  title={`${tasks.length} task${tasks.length > 1 ? 's' : ''} on ${formatDate(tasks[0].deadline)}${tasks.length > 1 ? ` (${completedCount}/${totalCount} completed)` : ''} - Click to pin/unpin`}
                />
              );
            });
          })()}
        </div>

        {/* Task details panel */}
        {(hoveredTask || pinnedTask) && (
          <div 
            className={`group relative overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-opacity-80 mb-8 z-40 ${
              (hoveredTask || pinnedTask).completed 
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700'
                : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-gray-200 dark:border-gray-600'
            }`}
            onMouseEnter={() => {
              if (hoverTimeout) {
                clearTimeout(hoverTimeout);
                setHoverTimeout(null);
              }
            }}
            onMouseLeave={() => {
              // Only close if there's no pinned task
              if (!pinnedTask) {
                const timeout = setTimeout(() => {
                  setHoveredTask(null);
                  setHoverTimeout(null);
                }, 300);
                setHoverTimeout(timeout);
              }
            }}
          >
            {/* Check if there are multiple tasks on the same day */}
            {(() => {
              const currentTask = hoveredTask || pinnedTask;
              const sameDayTasks = taskPositions.filter(task => {
                if (selectedMonth !== null) {
                  const monthStart = new Date(currentYear, selectedMonth, 1);
                  const daysFromMonthStart = differenceInDays(task.deadline, monthStart);
                  const currentDaysFromMonthStart = differenceInDays(currentTask.deadline, monthStart);
                  return Math.abs(daysFromMonthStart - currentDaysFromMonthStart) < 0.1;
                } else {
                  return Math.abs(task.position - currentTask.position) < 0.1;
                }
              });
              
              if (sameDayTasks.length > 1) {
                // Show multiple tasks
                return (
                  <div>
                    {/* Background pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8">
                        <svg className="w-full h-full" viewBox="0 0 100 100" fill="currentColor">
                          <circle cx="20" cy="20" r="2" />
                          <circle cx="80" cy="20" r="2" />
                          <circle cx="50" cy="50" r="2" />
                          <circle cx="20" cy="80" r="2" />
                          <circle cx="80" cy="80" r="2" />
                        </svg>
                      </div>
                    </div>
                    
                    <div className="relative p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                            {sameDayTasks.length} Tasks on {formatDate(currentTask.deadline)}
                            {pinnedTask && !hoveredTask && (
                              <span className="ml-2 text-sm font-normal text-purple-600 dark:text-purple-400">
                                (Pinned)
                              </span>
                            )}
                          </h3>
                          
                          {/* Status badges */}
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                              {sameDayTasks.filter(t => t.completed).length} of {sameDayTasks.length} COMPLETED
                            </span>
                          </div>
                        </div>
                        
                        {/* Close button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (pinnedTask && !hoveredTask) {
                              setPinnedTask(null);
                            } else {
                              setHoveredTask(null);
                            }
                          }}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2"
                          title={pinnedTask && !hoveredTask ? "Unpin task" : "Close"}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                                             {/* Multiple tasks list */}
                       <div className="space-y-3 max-h-64 overflow-y-auto">
                         {sameDayTasks.map((task, index) => (
                           <div key={task.id || index} className="p-3 bg-white dark:bg-gray-700 rounded-lg border-l-4 border-blue-500 dark:border-blue-400 shadow-sm">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className={`font-semibold text-sm ${task.completed ? 'line-through opacity-75' : 'text-gray-900 dark:text-white'} mb-1`}>
                                  {task.description}
                                </h4>
                                <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                                  <span><span className="font-medium">Project:</span> {task.projectName}</span>
                                  <span><span className="font-medium">Responsible:</span> {task.responsibleParty}</span>
                                </div>
                                {task.notes && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                                    Notes: {task.notes}
                                  </p>
                                )}
                              </div>
                              
                              {/* Action buttons for each task */}
                              <div className="flex items-center gap-1 ml-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleCompletedWrapper(task.instanceId || task.id, task.originalId);
                                  }}
                                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 ${
                                    task.completed 
                                      ? 'bg-green-500 text-white hover:bg-green-600' 
                                      : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-500'
                                  }`}
                                  title={task.completed ? 'Mark incomplete' : 'Mark complete'}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                </button>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleUrgentWrapper(task.instanceId || task.id, task.originalId);
                                  }}
                                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 ${
                                    task.important 
                                      ? 'bg-orange-500 text-white hover:bg-orange-600' 
                                      : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-500'
                                  }`}
                                  title={task.important ? 'Remove urgent' : 'Mark urgent'}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </button>
                                
                                {/* Document Link Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDocumentLinkClick(task);
                                  }}
                                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 ${
                                    task.documentLink 
                                      ? 'bg-purple-500 text-white hover:bg-purple-600' 
                                      : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-500'
                                  }`}
                                  title={task.documentLink ? 'Open Document' : 'Add Document Link'}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </button>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditClick(task);
                                  }}
                                  className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-all duration-200"
                                  title="Edit task"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              } else {
                // Show single task (original behavior)
                return (
                  <div>
                    {/* Background pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8">
                        <svg className="w-full h-full" viewBox="0 0 100 100" fill="currentColor">
                          <circle cx="20" cy="20" r="2" />
                          <circle cx="80" cy="20" r="2" />
                          <circle cx="50" cy="50" r="2" />
                          <circle cx="20" cy="80" r="2" />
                          <circle cx="80" cy="80" r="2" />
                        </svg>
                      </div>
                    </div>
                    
                    <div className="relative p-6">
                      {/* Header with status badge and action buttons */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-xl font-bold ${currentTask.completed ? 'line-through opacity-75' : 'text-gray-900 dark:text-white'} transition-all duration-200 group-hover:text-opacity-90 mb-3`}>
                            {currentTask.description}
                            {pinnedTask && !hoveredTask && (
                              <span className="ml-2 text-sm font-normal text-purple-600 dark:text-purple-400">
                                (Pinned)
                              </span>
                            )}
                          </h3>
                          
                          {/* Status badges */}
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm ${
                              currentTask.completed 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' 
                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                            }`}>
                              {currentTask.completed ? 'COMPLETED' : 'ACTIVE'}
                            </span>
                            {currentTask.important && (
                              <span className="px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200">
                                URGENT
                              </span>
                            )}
                            {currentTask.recurring && (
                              <span className="px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">
                                RECURRING
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleToggleCompletedWrapper(currentTask.instanceId || currentTask.id, currentTask.originalId)}
                            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-primary shadow-sm hover:shadow-md transform hover:scale-105 ${
                              currentTask.completed 
                                ? 'bg-green-500 text-white hover:bg-green-600 shadow-green-200 dark:shadow-green-900/30' 
                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 border border-gray-200 dark:border-gray-600'
                            }`}
                            title={currentTask.completed ? 'Mark as Incomplete' : 'Mark as Completed'}
                            aria-label={currentTask.completed ? 'Mark as Incomplete' : 'Mark as Completed'}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          </button>
                          
                          <button
                            onClick={() => handleToggleUrgentWrapper(currentTask.instanceId || currentTask.id, currentTask.originalId)}
                            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-primary shadow-sm hover:shadow-md transform hover:scale-105 ${
                              currentTask.important 
                                ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-200 dark:shadow-orange-900/30' 
                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 border border-gray-200 dark:border-gray-600'
                            }`}
                            title={currentTask.important ? 'Remove Urgent' : 'Mark as Urgent'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          
                          {/* Document Link Button */}
                          <button
                            onClick={() => handleDocumentLinkClick(currentTask)}
                            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-primary shadow-sm hover:shadow-md transform hover:scale-105 ${
                              currentTask.documentLink 
                                ? 'bg-purple-500 text-white hover:bg-purple-600 shadow-purple-200 dark:shadow-purple-900/30' 
                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 border border-gray-200 dark:border-gray-600'
                            }`}
                            title={currentTask.documentLink ? 'Open Document' : 'Add Document Link'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          
                          <button
                            onClick={() => handleDeleteTaskWrapper(currentTask.instanceId || currentTask.id, currentTask.originalId)}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            title="Delete Task"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {/* Project and responsible party info */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <span className="font-medium text-gray-600 dark:text-gray-400">Project:</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{currentTask.projectName}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="font-medium text-gray-600 dark:text-gray-400">Responsible:</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{currentTask.responsibleParty}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Deadline date */}
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Due:</span>
                                            <span className="font-bold text-gray-800 dark:text-white">
                    {formatDate(currentTask.deadline)} ({getDaysUntilDeadline(currentTask.deadline)})
                  </span>
                        </div>
                      </div>
                      
                                    {/* Notes section */}
              {currentTask.notes && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                          <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 mt-0.5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            <div className="text-sm">
                              <span className="font-medium text-gray-600 dark:text-gray-400">Notes:</span>
                              <span className="ml-2 text-gray-800 dark:text-white">{currentTask.notes}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
            })()}
          </div>
        )}

        {/* Task list */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-theme-primary to-theme-primary-hover rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                Task List
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {taskPositions.length} tasks for {currentYear}
                {selectedMonth !== null && ` - ${timelineData[selectedMonth]?.name}`}
                {selectedProject !== 'all' && ` - ${selectedProject}`}
              </p>
            </div>
          </div>
          
          {taskPositions.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No tasks found</h4>
              <p className="text-gray-500 dark:text-gray-400">
                No tasks found for the selected project and year.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {taskPositions.map((task, index) => {
                const deadlineDate = task.deadline;
                const isToday = deadlineDate && format(deadlineDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                const isTomorrow = deadlineDate && format(deadlineDate, 'yyyy-MM-dd') === format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
                const completed = !!task.completed;
                
                // Get status colors and styling (matching dashboard)
                const getStatusConfig = () => {
                  if (completed) {
                    return {
                      bg: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
                      border: 'border-green-200 dark:border-green-700',
                      badge: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
                      text: 'text-green-800 dark:text-green-200',
                      icon: 'text-green-600 dark:text-green-400'
                    };
                  } else if (isToday) {
                    return {
                      bg: 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20',
                      border: 'border-red-200 dark:border-red-700',
                      badge: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
                      text: 'text-red-800 dark:text-red-200',
                      icon: 'text-red-600 dark:text-red-400'
                    };
                  } else if (isTomorrow) {
                    return {
                      bg: 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20',
                      border: 'border-orange-200 dark:border-orange-700',
                      badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
                      text: 'text-orange-800 dark:text-orange-200',
                      icon: 'text-orange-600 dark:text-orange-400'
                    };
                  } else {
                    return {
                      bg: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
                      border: 'border-blue-200 dark:border-blue-700',
                      badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
                      text: 'text-blue-800 dark:text-blue-200',
                      icon: 'text-blue-600 dark:text-blue-400'
                    };
                  }
                };
                
                const status = getStatusConfig();
                
                return (
                  <div 
                    key={task.id || index} 
                    className={`group relative overflow-hidden rounded-xl border ${status.border} ${status.bg} transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-opacity-80 ${!task.checklistId ? 'cursor-pointer' : ''}`}
                    onClick={!task.checklistId ? () => handleEditClick(task) : undefined}
                  >
                    {/* Background pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8">
                        <svg className="w-full h-full" viewBox="0 0 100 100" fill="currentColor">
                          <circle cx="20" cy="20" r="2" />
                          <circle cx="80" cy="20" r="2" />
                          <circle cx="50" cy="50" r="2" />
                          <circle cx="20" cy="80" r="2" />
                          <circle cx="80" cy="80" r="2" />
                        </svg>
                      </div>
                    </div>
                    
                    <div className="relative p-5">
                      {/* Header with status badge */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-lg font-bold ${completed ? 'line-through opacity-75' : 'text-gray-900 dark:text-white'} transition-all duration-200 group-hover:text-opacity-90`}>
                            {task.description}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {/* Status badge */}
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm ${status.badge}`}>
                            {completed ? 'COMPLETED' : isToday ? 'TODAY' : isTomorrow ? 'TOMORROW' : format(deadlineDate, 'EEEE')}
                          </span>
                          
                          {/* Complete button */}
                          {!task.checklistId && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleCompletedWrapper(task.instanceId || task.id, task.originalId);
                              }}
                              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-primary shadow-sm hover:shadow-md transform hover:scale-105 ${
                                completed 
                                  ? 'bg-green-500 text-white hover:bg-green-600 shadow-green-200 dark:shadow-green-900/30' 
                                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 border border-gray-200 dark:border-gray-600'
                              }`}
                              title={completed ? 'Mark as Incomplete' : 'Mark as Completed'}
                              aria-label={completed ? 'Mark as Incomplete' : 'Mark as Completed'}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Project and responsible party info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <svg className={`w-4 h-4 ${status.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <span className="font-medium text-gray-600 dark:text-gray-400">Project:</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{task.projectName}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <svg className={`w-4 h-4 ${status.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="font-medium text-gray-600 dark:text-gray-400">Responsible:</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{task.responsibleParty}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Deadline date */}
                      {deadlineDate && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <div className="flex items-center gap-2 text-sm">
                            <svg className={`w-4 h-4 ${status.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="font-medium text-gray-600 dark:text-gray-400">Due:</span>
                            <span className={`font-bold ${status.text}`}>
                              {format(deadlineDate, 'EEEE, MMMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 