import React, { useState, useEffect } from 'react';
import { globalTaskStore } from './globalTaskStore';
import { parse, isValid, isThisWeek, format, differenceInDays, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { microsoftDataService } from './microsoftDataService';
import { useAuth } from './Auth';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  ExclamationTriangleIcon, 
  CalendarDaysIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import TaskCard from './TaskCard';
import taskSyncService from './taskSyncService';

// Department constants
const DEPARTMENTS = {
  DEVELOPMENT: 'development',
  ACCOUNTING: 'accounting', 
  COMPLIANCE: 'compliance',
  MANAGEMENT: 'management'
};

const DEPARTMENT_NAMES = {
  [DEPARTMENTS.DEVELOPMENT]: 'Development',
  [DEPARTMENTS.ACCOUNTING]: 'Accounting',
  [DEPARTMENTS.COMPLIANCE]: 'Compliance',
  [DEPARTMENTS.MANAGEMENT]: 'Management'
};

const DEPARTMENT_COLORS = {
  [DEPARTMENTS.DEVELOPMENT]: 'bg-blue-500',
  [DEPARTMENTS.ACCOUNTING]: 'bg-green-500',
  [DEPARTMENTS.COMPLIANCE]: 'bg-purple-500',
  [DEPARTMENTS.MANAGEMENT]: 'bg-orange-500'
};

const DEPARTMENT_TEXT_COLORS = {
  [DEPARTMENTS.DEVELOPMENT]: 'text-blue-500',
  [DEPARTMENTS.ACCOUNTING]: 'text-green-500',
  [DEPARTMENTS.COMPLIANCE]: 'text-purple-500',
  [DEPARTMENTS.MANAGEMENT]: 'text-orange-500'
};

function Dashboard({ users }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [departmentProgressKey, setDepartmentProgressKey] = useState(0);
  const { userProfile } = useAuth();

  // Task completion management moved to Database page

  // Load tasks from global store
  useEffect(() => {
    const unsubscribe = globalTaskStore.subscribe(({ tasks, isLoading }) => {
      console.log('Dashboard: Received tasks:', tasks.length, 'isLoading:', isLoading);
      setTasks(tasks);
      // If we have tasks, don't show loading even if isLoading is true
      if (tasks.length > 0) {
        console.log('Dashboard: Have tasks, setting loading to false');
        setLoading(false);
      } else {
        console.log('Dashboard: No tasks, using isLoading:', isLoading);
        setLoading(isLoading);
      }
    });

    // Get initial tasks from store
    const initialTasks = globalTaskStore.getAllTasks();
    console.log('Dashboard: Initial tasks from store:', initialTasks.length);
    if (initialTasks.length > 0) {
      setTasks(initialTasks);
      setLoading(false);
    }

    // Timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('Dashboard: Loading timeout, setting loading to false');
      setLoading(false);
    }, 5000); // Reduced to 5 second timeout

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Helper function to parse deadline dates
  function parseDeadlineDate(dateStr) {
    if (!dateStr) return null;
    try {
      if (typeof dateStr === 'string' && dateStr.includes('-')) {
        const datePart = dateStr.split('T')[0];
        const parts = datePart.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            return new Date(year, month, day, 12, 0, 0);
          }
        }
      }
      
      const parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
      if (isValid(parsed)) {
        parsed.setHours(12, 0, 0, 0);
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  // Get current year tasks for progress tracking
  const getCurrentYearTasks = () => {
    const currentYear = new Date().getFullYear();
    const yearStart = startOfYear(new Date(currentYear, 0, 1));
    const yearEnd = endOfYear(new Date(currentYear, 11, 31));
    
    return tasks.filter(task => {
      const deadline = parseDeadlineDate(task.deadline);
      return deadline && isWithinInterval(deadline, { start: yearStart, end: yearEnd });
    });
  };

  const currentYearTasks = getCurrentYearTasks();

  // Calculate status
  const getCalculatedStatus = (task) => {
    const isCompleted = task.completed === true;
    if (isCompleted) return 'Completed';
    
    const deadline = parseDeadlineDate(task.deadline);
    if (deadline && deadline < new Date()) return 'Overdue';
    
    return 'Active';
  };

  // Calculate top metrics
  const getTopMetrics = () => {
    const totalTasks = currentYearTasks.length;
    const completedTasks = currentYearTasks.filter(task => task.completed).length;
    const urgentTasks = currentYearTasks.filter(task => task.priority === 'Urgent').length;
    
    const tasksThisWeek = tasks.filter(task => {
      const deadline = parseDeadlineDate(task.deadline);
      return deadline && isThisWeek(deadline);
    }).length;

    const overdueTasks = tasks.filter(task => getCalculatedStatus(task) === 'Overdue').length;

    return {
      total: totalTasks,
      completed: completedTasks,
      urgent: urgentTasks,
      dueThisWeek: tasksThisWeek,
      overdue: overdueTasks
    };
  };

  const metrics = getTopMetrics();

  // Get tasks due this week
  const getTasksThisWeek = () => {
    return tasks.filter(task => {
      const deadline = parseDeadlineDate(task.deadline);
      return deadline && isThisWeek(deadline);
    }).map(task => {
      const deadline = parseDeadlineDate(task.deadline);
      const today = new Date();
      const todayAtNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
      const deadlineStartOfDay = deadline ? new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate()) : null;
      const todayStartOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const daysUntil = deadlineStartOfDay ? differenceInDays(deadlineStartOfDay, todayStartOfDay) : 0;
      
      return {
        ...task,
        deadline,
        daysUntil,
        isCompleted: task.completed
      };
    }).sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      return a.daysUntil - b.daysUntil;
    });
  };

  const tasksThisWeek = getTasksThisWeek();

  // Get department progress
  const getDepartmentProgress = () => {
    const progress = {};
    
    // Load user assignments from localStorage
    const USER_ASSIGNMENTS_KEY = 'user_assignments';
    let localAssignments = {};
    
    try {
      const storedAssignments = localStorage.getItem(USER_ASSIGNMENTS_KEY);
      if (storedAssignments) {
        localAssignments = JSON.parse(storedAssignments);
      }
    } catch (error) {
      console.error('Dashboard: Error parsing localStorage assignments:', error);
    }
    
    // Initialize all departments
    Object.values(DEPARTMENTS).forEach(dept => {
      progress[dept] = {
        name: DEPARTMENT_NAMES[dept],
        completed: 0,
        total: 0,
        percentage: 0,
        color: DEPARTMENT_COLORS[dept],
        textColor: DEPARTMENT_TEXT_COLORS[dept]
      };
    });
    
    if (!users || users.length === 0) {
      return Object.values(progress);
    }

    currentYearTasks.forEach(task => {
      const responsibleParty = task.responsibleParty || '';
      
      // Find all users assigned to this task
      const assignedUsers = users.filter(user => {
        const userEmail = user.email || user.Email || user.mail || user.userPrincipalName || '';
        const userDisplayName = user.displayName || user.DisplayName || '';
        
        let responsiblePartyStr = '';
        if (typeof responsibleParty === 'string') {
          responsiblePartyStr = responsibleParty;
        } else if (Array.isArray(responsibleParty)) {
          responsiblePartyStr = responsibleParty.map(item => {
            if (typeof item === 'object' && item.LookupValue) {
              return item.LookupValue;
            }
            if (typeof item === 'object' && item.Email) {
              return item.Email;
            }
            return String(item);
          }).join('; ');
        } else if (responsibleParty && typeof responsibleParty === 'object') {
          responsiblePartyStr = responsibleParty.LookupValue || responsibleParty.Email || String(responsibleParty);
        } else {
          responsiblePartyStr = String(responsibleParty || '');
        }
        
        return responsiblePartyStr && responsiblePartyStr.trim() !== '' && 
               (responsiblePartyStr.includes(userEmail) || responsiblePartyStr.includes(userDisplayName));
      });
      
      // Collect all unique departments from all assigned users
      const taskDepartments = new Set();
      assignedUsers.forEach(assignedUser => {
        const userDepartments = assignedUser.departments || [];
        userDepartments.forEach(department => {
          taskDepartments.add(department);
        });
      });
      
      // Determine completion status
      const isCompleted = task.completed;
      
      // Count this task once for each unique department
      taskDepartments.forEach(department => {
        if (progress[department]) {
          progress[department].total++;
          if (isCompleted) {
            progress[department].completed++;
          }
        }
      });
    });
    
    // Calculate percentages
    Object.values(DEPARTMENTS).forEach(dept => {
      const stats = progress[dept];
      stats.percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    });
    
    return Object.values(progress);
  };

  const departmentProgress = React.useMemo(() => {
    return getDepartmentProgress();
  }, [users, tasks, departmentProgressKey]);

  // Recalculate department progress when users load
  React.useEffect(() => {
    if (users && users.length > 0) {
      setDepartmentProgressKey(prev => prev + 1);
    }
  }, [users]);

  // Get project progress
  const getProjectProgress = () => {
    const projects = {};
    
    currentYearTasks.forEach(task => {
      const projectName = task.project || 'Unassigned';
      
      if (!projects[projectName]) {
        projects[projectName] = { completed: 0, total: 0 };
      }
      projects[projectName].total++;
      
      if (task.completed) {
        projects[projectName].completed++;
      }
    });
    
    return Object.entries(projects)
      .map(([name, data]) => ({
        name,
        completed: data.completed,
        total: data.total,
        percentage: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  };

  const projectProgress = getProjectProgress();

  // Circular progress component
  const CircularProgress = ({ percentage, size = 120, strokeWidth = 8, color = 'text-blue-500' }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const adjustedPercentage = Math.max(percentage, 2);
    const strokeDashoffset = circumference - (adjustedPercentage / 100) * circumference;

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className={`${color} transition-all duration-500 ease-in-out`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{percentage}%</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 pb-16 relative">
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
      
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Welcome back, {userProfile?.displayName || 'User'}! Here's your project overview.
            </p>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </div>
        </div>

        {/* Top Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Total Tasks */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tasks</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{metrics.total}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This year</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <ChartBarIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Completed Tasks */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{metrics.completed}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This year</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0}% completion rate
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Urgent Tasks */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Urgent</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">{metrics.urgent}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This year</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <ExclamationTriangleIcon className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          {/* Due This Week */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Due This Week</p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">{metrics.dueThisWeek}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Deadlines approaching</p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                <CalendarDaysIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          {/* Overdue Tasks */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{metrics.overdue}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Need attention</p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Deadlines This Week */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <CalendarDaysIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Deadlines This Week</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{tasksThisWeek.length} tasks due</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {tasksThisWeek.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tasksThisWeek.map(task => (
                  <TaskCard
                    key={task.id} 
                    task={task}
                    users={users}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarDaysIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No deadlines this week</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">You're all caught up!</p>
              </div>
            )}
          </div>
        </div>

        {/* Progress Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Department Progress */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <BuildingOfficeIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Department Progress</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Current year completion</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                {departmentProgress.map(dept => (
                  <div key={dept.name} className="text-center">
                    <div className="mb-4">
                      <CircularProgress 
                        percentage={dept.percentage} 
                        size={100} 
                        strokeWidth={6}
                        color={dept.textColor}
                      />
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">{dept.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {dept.completed} of {dept.total} tasks
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Project Progress */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <FolderIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Project Progress</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Current year completion</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {projectProgress.length > 0 ? (
                <div className="space-y-4">
                  {projectProgress.map(project => (
                    <div key={project.name} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {project.name}
                          </h4>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {project.percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-in-out"
                            style={{ width: `${project.percentage}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {project.completed} of {project.total} tasks completed
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FolderIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No projects this year</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Start adding tasks to see progress</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Year-to-Date Summary</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {currentYearTasks.length} tasks created this year across {projectProgress.length} projects
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {currentYearTasks.length > 0 
                  ? Math.round((currentYearTasks.filter(task => task.completed).length / currentYearTasks.length) * 100)
                  : 0}%
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Overall completion</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;