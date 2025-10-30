import React, { useState, useEffect, useMemo } from 'react';
import { databaseDataService } from './databaseDataService';

const GanttChart = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredTask, setHoveredTask] = useState(null);

  // Load tasks from database
  const loadTasks = async () => {
    try {
      setLoading(true);
      const tasksData = await databaseDataService.getGanttData();
      setTasks(tasksData);
      console.log('Gantt: Loaded', tasksData.length, 'tasks');
    } catch (err) {
      console.error('Gantt: Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate timeline dimensions
  const timelineData = useMemo(() => {
    if (tasks.length === 0) return { startDate: new Date(), endDate: new Date(), days: 0 };

    const dates = tasks.map(task => new Date(task.start));
    const startDate = new Date(Math.min(...dates));
    const endDate = new Date(Math.max(...dates));
    
    // Add some padding
    startDate.setDate(startDate.getDate() - 7);
    endDate.setDate(endDate.getDate() + 7);
    
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    return { startDate, endDate, days };
  }, [tasks]);

  // Get task color based on priority and status
  const getTaskColor = (task) => {
    if (task.progress === 100) return 'bg-green-500';
    if (task.priority === 'Critical') return 'bg-red-500';
    if (task.priority === 'High') return 'bg-orange-500';
    if (task.priority === 'Medium') return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  // Calculate task position and width
  const getTaskPosition = (task) => {
    const taskStart = new Date(task.start);
    const taskEnd = new Date(task.end);
    const daysFromStart = Math.ceil((taskStart - timelineData.startDate) / (1000 * 60 * 60 * 24));
    const taskDuration = Math.ceil((taskEnd - taskStart) / (1000 * 60 * 60 * 24)) + 1;
    
    const left = (daysFromStart / timelineData.days) * 100;
    const width = (taskDuration / timelineData.days) * 100;
    
    return { left: `${left}%`, width: `${width}%` };
  };

  // Generate date headers
  const generateDateHeaders = () => {
    const headers = [];
    const currentDate = new Date(timelineData.startDate);
    
    for (let i = 0; i < timelineData.days; i += 7) {
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() + i);
      headers.push(weekStart);
    }
    
    return headers;
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
          <p className="text-gray-600 dark:text-gray-400">Loading Gantt chart...</p>
        </div>
      </div>
    );
  }

  const dateHeaders = generateDateHeaders();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Gantt Chart
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Timeline view of all project deadlines
          </p>
        </div>

        {/* Gantt Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Timeline Header */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              {/* Task Name Column */}
              <div className="w-80 p-4 bg-gray-50 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-600">
                <h3 className="font-semibold text-gray-900 dark:text-white">Task</h3>
              </div>
              
              {/* Timeline Header */}
              <div className="flex-1 relative">
                <div className="flex">
                  {dateHeaders.map((date, index) => (
                    <div
                      key={index}
                      className="flex-1 p-4 text-center border-r border-gray-200 dark:border-gray-600"
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {date.getFullYear()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Task Rows */}
          <div className="max-h-96 overflow-y-auto">
            {tasks.map((task, index) => {
              const position = getTaskPosition(task);
              return (
                <div
                  key={task.id}
                  className={`flex border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'
                  }`}
                >
                  {/* Task Name */}
                  <div className="w-80 p-4 border-r border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {task.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {task.project || 'No Project'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {task.responsible || 'Unassigned'}
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          task.priority === 'Critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          task.priority === 'High' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                          task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {task.priority}
                        </span>
                        {task.recurring && (
                          <span className="text-xs text-blue-600 dark:text-blue-400">
                            �� {task.interval}
                          </span>
                        )}
                        {task.progress === 100 && (
                          <span className="text-xs text-green-600 dark:text-green-400">
                            ✅ Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Timeline Bar */}
                  <div className="flex-1 relative p-4">
                    <div className="relative h-8 bg-gray-100 dark:bg-gray-600 rounded">
                      {/* Task Bar */}
                      <div
                        className={`absolute top-1 h-6 rounded ${getTaskColor(task)} cursor-pointer hover:opacity-80 transition-opacity`}
                        style={{
                          left: position.left,
                          width: position.width,
                          minWidth: '20px'
                        }}
                        onMouseEnter={() => setHoveredTask(task)}
                        onMouseLeave={() => setHoveredTask(null)}
                        title={`${task.name} - ${task.project || 'No Project'} - ${task.responsible || 'Unassigned'}`}
                      >
                        <div className="flex items-center justify-center h-full text-white text-xs font-medium">
                          {task.progress > 0 && `${task.progress}%`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Task Details Tooltip */}
        {hoveredTask && (
          <div className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4 z-50 pointer-events-none">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              {hoveredTask.name}
            </h4>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div><strong>Project:</strong> {hoveredTask.project || 'No Project'}</div>
              <div><strong>Responsible:</strong> {hoveredTask.responsible || 'Unassigned'}</div>
              <div><strong>Priority:</strong> {hoveredTask.priority}</div>
              <div><strong>Status:</strong> {hoveredTask.progress === 100 ? 'Completed' : 'In Progress'}</div>
              {hoveredTask.recurring && (
                <div><strong>Recurring:</strong> {hoveredTask.interval}</div>
              )}
              {hoveredTask.notes && (
                <div><strong>Notes:</strong> {hoveredTask.notes}</div>
              )}
              {hoveredTask.link && (
                <div><strong>Link:</strong> <a href={hoveredTask.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">View Document</a></div>
              )}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Legend
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Critical Priority</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-orange-500 rounded mr-2"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">High Priority</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Medium Priority</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Completed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
