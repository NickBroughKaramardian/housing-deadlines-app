import React, { useState, useEffect } from 'react';
import { sharedDataService } from './sharedDataService';
import { parse, isValid, isThisWeek, format, differenceInDays, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { microsoftDataService } from './microsoftDataService';
import { useAuth, getDepartmentFromResponsibleParty } from './Auth';
import { globalTaskStore } from './globalTaskStore';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  ExclamationTriangleIcon, 
  CalendarDaysIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import TaskCard from './TaskCard';
import recurringTaskGenerator from './recurringTaskGenerator';
import taskUpdateService from './taskUpdateService';

// Department constants (matching the 4 departments you specified)
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

function Dashboard({ tasks: propTasks, users, departmentMappings, onToggleCompleted, onTaskLinkClick, aliases = [] }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [departmentProgressKey, setDepartmentProgressKey] = useState(0);

  // Toggle task completion - uses centralized update service
  const toggleTaskCompletion = async (taskId, currentStatus) => {
    const newStatus = !currentStatus;
    
    await taskUpdateService.updateTaskField(
      taskId,
      { Completed_x003f_: newStatus },
      () => setUpdating(true),  // onStart: show loading
      () => {                    // onComplete: hide loading and refresh local state
        setUpdating(false);
        const allTasks = globalTaskStore.getAllTasks();
        setTasks(allTasks);
      }
    );
  };
  const { 
    userProfile, 
    hasPermission, 
    ROLES, 
    isUserInDepartment,
    getUsersByDepartment 
  } = useAuth();

  // Load tasks and instances from global store
  useEffect(() => {
    const loadTasks = async () => {
      try {
        setLoading(true);
        // Subscribe to global task store updates
        const unsubscribe = globalTaskStore.subscribe(() => {
          const allTasks = globalTaskStore.getAllTasks();
          setTasks(allTasks);
          console.log('Dashboard: Updated from global store -', allTasks.length, 'total items');
        });
        
        // Get initial data
        const allTasks = globalTaskStore.getAllTasks();
        setTasks(allTasks);
        console.log('Dashboard: Loaded', allTasks.length, 'total items from global store');
        
        return unsubscribe;
      } catch (error) {
        console.error('Dashboard: Error loading tasks:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, []);

  // Helper function to parse deadline dates
  function parseDeadlineDate(dateStr) {
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

  // Get current year tasks for progress tracking using correct SharePoint fields
  const getCurrentYearTasks = () => {
    const currentYear = new Date().getFullYear();
    const yearStart = startOfYear(new Date(currentYear, 0, 1));
    const yearEnd = endOfYear(new Date(currentYear, 11, 31));
    
    return tasks.filter(task => {
      const deadline = parseDeadlineDate(task.Deadline || task.deadline);
      return deadline && isWithinInterval(deadline, { start: yearStart, end: yearEnd });
    });
  };

  const currentYearTasks = getCurrentYearTasks();

  // Calculate status the same way as Database component
  const getCalculatedStatus = (task) => {
    // Use the "Completed?" field from SharePoint (Yes/No) - field name is Completed_x003f_
    const isCompleted = task.Completed_x003f_ === true || task.Completed_x003f_ === 'Yes' || task.Completed_x003f_ === 'yes' ||
                        task.Completed === true || task.Completed === 'Yes' || task.Completed === 'yes';
    if (isCompleted) return 'Completed';
    
    // Check if deadline is overdue
    const deadline = parseDeadlineDate(task.Deadline || task.deadline);
    if (deadline && deadline < new Date()) return 'Overdue';
    
    return 'Active';
  };

  // Calculate top metrics using correct SharePoint fields - CURRENT YEAR ONLY
  const getTopMetrics = () => {
    // Only count current year tasks
    const totalTasks = currentYearTasks.length;
    
    // Use the "Completed?" field from SharePoint (Yes/No) - field name is Completed_x003f_
    const completedTasks = currentYearTasks.filter(task => 
      task.Completed_x003f_ === true || task.Completed_x003f_ === 'Yes' || task.Completed_x003f_ === 'yes' ||
      task.Completed === true || task.Completed === 'Yes' || task.Completed === 'yes'
    ).length;
    
    // Count urgent tasks in current year
    const urgentTasks = currentYearTasks.filter(task => 
      task.Priority === 'Urgent'
    ).length;
    
  const tasksThisWeek = tasks.filter(task => {
      const deadline = parseDeadlineDate(task.Deadline || task.deadline);
      return deadline && isThisWeek(deadline);
    }).length;

    // Count overdue tasks using calculated status (from all tasks, not just current year)
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

  // Get tasks due this week with details using correct SharePoint fields
  const getTasksThisWeek = () => {
    return tasks.filter(task => {
      const deadline = parseDeadlineDate(task.Deadline || task.deadline);
    return deadline && isThisWeek(deadline);
    }).map(task => {
      const deadline = parseDeadlineDate(task.Deadline || task.deadline);
      // Create today's date at noon to match our deadline parsing
      const today = new Date();
      const todayAtNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
      // Normalize both dates to start of day for accurate day difference calculation
      const deadlineStartOfDay = deadline ? new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate()) : null;
      const todayStartOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const daysUntil = deadlineStartOfDay ? differenceInDays(deadlineStartOfDay, todayStartOfDay) : 0;
      
      // Debug logging for date calculations
      console.log('getTasksThisWeek: Task date calculation:', {
        taskName: task.Task,
        deadline: deadline,
        today: today,
        deadlineStartOfDay: deadlineStartOfDay,
        todayStartOfDay: todayStartOfDay,
        daysUntil: daysUntil,
        deadlineFormatted: deadline ? format(deadline, 'yyyy-MM-dd') : 'null',
        todayFormatted: format(today, 'yyyy-MM-dd')
      });
      
      // Use the "Completed?" field from SharePoint - field name is Completed_x003f_
      const isCompleted = task.Completed_x003f_ === true || task.Completed_x003f_ === 'Yes' || task.Completed_x003f_ === 'yes' ||
                          task.Completed === true || task.Completed === 'Yes' || task.Completed === 'yes';
      
      return {
        ...task,
        deadline,
        daysUntil,
        isCompleted
      };
    }).sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1; // Incomplete tasks first
      }
      return a.daysUntil - b.daysUntil; // Then by days until deadline
    });
  };

  const tasksThisWeek = getTasksThisWeek();

  // Helper function to convert responsible party emails to names
  const getResponsiblePartyNames = (responsibleParty) => {
    console.log('getResponsiblePartyNames: Input responsibleParty:', responsibleParty);
    console.log('getResponsiblePartyNames: Available users:', users);
    console.log('getResponsiblePartyNames: User details:', users.map(u => ({
      id: u.id,
      email: u.email,
      Email: u.Email,
      displayName: u.displayName,
      DisplayName: u.DisplayName,
      mail: u.mail,
      userPrincipalName: u.userPrincipalName
    })));
    
    // Log each user individually for better visibility
    users.forEach((user, index) => {
      console.log(`getResponsiblePartyNames: User ${index}:`, {
        id: user.id,
        email: user.email,
        Email: user.Email,
        displayName: user.displayName,
        DisplayName: user.DisplayName,
        mail: user.mail,
        userPrincipalName: user.userPrincipalName,
        allKeys: Object.keys(user)
      });
    });

    if (!responsibleParty || responsibleParty.trim() === '') {
      return 'Unassigned';
    }

    // Split by semicolon to handle multiple responsible parties
    const emailStrings = responsibleParty.split(';').map(s => s.trim()).filter(s => s);
    console.log('getResponsiblePartyNames: Split emailStrings:', emailStrings);

    const names = emailStrings.map(emailOrName => {
      console.log('getResponsiblePartyNames: Processing:', emailOrName);
      
      // Try to find user by email first (using the correct field names from Microsoft Graph)
      const userByEmail = users.find(u => 
        u.mail?.toLowerCase() === emailOrName.toLowerCase() || 
        u.userPrincipalName?.toLowerCase() === emailOrName.toLowerCase() ||
        u.email?.toLowerCase() === emailOrName.toLowerCase() || 
        u.Email?.toLowerCase() === emailOrName.toLowerCase()
      );

      if (userByEmail) {
        console.log('getResponsiblePartyNames: Found user by email:', userByEmail.displayName || userByEmail.mail);
        return userByEmail.displayName || userByEmail.DisplayName || userByEmail.mail || userByEmail.email;
      }

      // If not found by email, check if it's already a display name
      const userByName = users.find(u => 
        u.displayName?.toLowerCase() === emailOrName.toLowerCase() || 
        u.DisplayName?.toLowerCase() === emailOrName.toLowerCase()
      );

      if (userByName) {
        console.log('getResponsiblePartyNames: Found user by name:', userByName.displayName || userByName.mail);
        return userByName.displayName || userByName.DisplayName || userByName.mail || userByName.email;
      }

      console.log('getResponsiblePartyNames: No user found for:', emailOrName, 'Returning as is.');
      return emailOrName; // Return the original string if no match found
    });

    console.log('getResponsiblePartyNames: Final names array:', names);
    return names.join(', ');
  };

  // Get department progress for current year based on user assignments
  const getDepartmentProgress = () => {
    const progress = {};
    
    // Load user assignments from localStorage
    const USER_ASSIGNMENTS_KEY = 'user_assignments';
    let localAssignments = {};
    
    try {
      const storedAssignments = localStorage.getItem(USER_ASSIGNMENTS_KEY);
      console.log('Dashboard: Raw localStorage data:', {
        key: USER_ASSIGNMENTS_KEY,
        rawValue: storedAssignments,
        userAgent: navigator.userAgent
      });
      
      if (storedAssignments) {
        localAssignments = JSON.parse(storedAssignments);
      }
    } catch (error) {
      console.error('Dashboard: Error parsing localStorage assignments:', error, {
        userAgent: navigator.userAgent
      });
    }
    
    console.log('Dashboard: Department progress calculation:', {
      currentYearTasks: currentYearTasks.length,
      users: users?.length || 0,
      usersArray: users,
      localAssignments: localAssignments,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });
    
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
    
    // If users haven't loaded yet, return empty progress
    if (!users || users.length === 0) {
      console.log('Dashboard: Users not loaded yet, returning empty progress', {
        users: users,
        usersType: typeof users,
        usersLength: users?.length,
        userAgent: navigator.userAgent
      });
      return Object.values(progress);
    }

    // If no local assignments found, try to create default assignments for testing
    if (Object.keys(localAssignments).length === 0) {
      console.log('Dashboard: No local assignments found, creating default assignments for testing', {
        userAgent: navigator.userAgent,
        usersCount: users.length
      });
      
      // Create default assignments for the first user (usually the current user)
      if (users.length > 0) {
        const defaultAssignments = {
          [users[0].id]: {
            departments: ['DEVELOPMENT'], // Default to Development
            role: 'ADMIN'
          }
        };
        
        try {
          localStorage.setItem(USER_ASSIGNMENTS_KEY, JSON.stringify(defaultAssignments));
          localAssignments = defaultAssignments;
          console.log('Dashboard: Created default assignments:', defaultAssignments);
        } catch (error) {
          console.error('Dashboard: Failed to save default assignments:', error);
        }
      }
    }
    
    // Count tasks for each department based on user assignments
    console.log('getDepartmentProgress: Starting task processing with:', {
      currentYearTasksCount: currentYearTasks.length,
      usersCount: users.length,
      users: users.map(u => ({ 
        id: u.id, 
        email: u.email || u.Email || u.mail || u.userPrincipalName, 
        displayName: u.displayName || u.DisplayName, 
        departments: u.departments,
        localAssignments: localAssignments[u.id]
      })),
      localAssignmentsKeys: Object.keys(localAssignments),
      userAgent: navigator.userAgent
    });

    currentYearTasks.forEach(task => {
      const responsibleParty = task.ResponsibleParty || task.responsibleParty || '';
      
      console.log('getDepartmentProgress: Processing task:', {
        taskId: task.id,
        taskName: task.Task,
        responsibleParty: responsibleParty,
        project: task.Project,
        deadline: task.Deadline,
        completedField: task.Completed_x003f_,
        completedField2: task.Completed,
        allFields: Object.keys(task)
      });
      
      // Find all users assigned to this task (responsible party can contain multiple emails)
      const assignedUsers = users.filter(user => {
        const userEmail = user.email || user.Email || user.mail || user.userPrincipalName || '';
        const userDisplayName = user.displayName || user.DisplayName || '';
        
        // Only match if responsible party is not empty and contains the user's email or display name
        const matches = responsibleParty && responsibleParty.trim() !== '' && 
                       (responsibleParty.includes(userEmail) || responsibleParty.includes(userDisplayName));
        
        if (matches) {
          console.log('getDepartmentProgress: Found matching user:', {
            userId: user.id,
            userEmail: userEmail,
            userDisplayName: userDisplayName,
            userDepartments: user.departments,
            responsibleParty: responsibleParty
          });
        }
        
        return matches;
      });
      
      // Collect all unique departments from all assigned users
      const taskDepartments = new Set();
      assignedUsers.forEach(assignedUser => {
        const userDepartments = assignedUser.departments || [];
        userDepartments.forEach(department => {
          taskDepartments.add(department);
        });
      });
      
      console.log('getDepartmentProgress: Task departments (unique):', {
        taskId: task.id,
        taskName: task.Task,
        taskDepartments: Array.from(taskDepartments),
        assignedUsers: assignedUsers.map(u => ({ id: u.id, departments: u.departments }))
      });
      
      // Determine completion status
      const calculatedStatus = getCalculatedStatus(task);
      const isCompleted = calculatedStatus === 'Completed';
      
      console.log('getDepartmentProgress: Task completion analysis:', {
        taskId: task.id,
        taskName: task.Task,
        rawCompleted_x003f_: task.Completed_x003f_,
        rawCompleted: task.Completed,
        calculatedStatus: calculatedStatus,
        isCompleted: isCompleted
      });
      
      // Count this task once for each unique department
      taskDepartments.forEach(department => {
        if (progress[department]) {
          progress[department].total++;
          
          if (isCompleted) {
            progress[department].completed++;
          }
          
          console.log('getDepartmentProgress: Added task to department:', {
            department: department,
            taskId: task.id,
            taskName: task.Task,
            isCompleted: isCompleted,
            newTotal: progress[department].total,
            newCompleted: progress[department].completed
          });
        }
      });

      if (assignedUsers.length === 0) {
        console.log('getDepartmentProgress: No user found for task:', {
          taskId: task.id,
          taskName: task.Task,
          responsibleParty: responsibleParty,
          availableUsers: users.map(u => ({ 
            id: u.id, 
            email: u.email || u.Email || u.mail || u.userPrincipalName, 
            displayName: u.displayName || u.DisplayName,
            departments: u.departments
          }))
        });
      }
    });
    
    console.log('getDepartmentProgress: Final progress before percentage calculation:', progress);
    
    // Calculate percentages
    Object.values(DEPARTMENTS).forEach(dept => {
      const stats = progress[dept];
      stats.percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    });
    
    console.log('Dashboard: Final department progress:', progress);
    
    return Object.values(progress);
  };

  const departmentProgress = React.useMemo(() => {
    return getDepartmentProgress();
  }, [users, tasks, departmentProgressKey]);

  // Recalculate department progress when users load
  React.useEffect(() => {
    console.log('Dashboard: useEffect triggered for users change:', {
      users: users,
      usersLength: users?.length,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });
    
    if (users && users.length > 0) {
      console.log('Dashboard: Users loaded, recalculating department progress', {
        usersCount: users.length,
        userAgent: navigator.userAgent
      });
      // Force re-render by updating a state variable
      setDepartmentProgressKey(prev => prev + 1);
    } else {
      console.log('Dashboard: Users not ready yet, will retry', {
        users: users,
        userAgent: navigator.userAgent
      });
    }
  }, [users]);

  // Get project progress for current year using correct SharePoint fields
  const getProjectProgress = () => {
    const projects = {};
    
    currentYearTasks.forEach(task => {
      const projectName = task.Project || task.projectName || task.project || 'Unassigned';
      
      if (!projects[projectName]) {
        projects[projectName] = { completed: 0, total: 0 };
      }
      projects[projectName].total++;
      
      // Use the "Completed?" field from SharePoint - field name is Completed_x003f_
      if (task.Completed_x003f_ === true || task.Completed_x003f_ === 'Yes' || task.Completed_x003f_ === 'yes' ||
          task.Completed === true || task.Completed === 'Yes' || task.Completed === 'yes') {
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
      .sort((a, b) => b.total - a.total) // Sort by total tasks descending
      .slice(0, 8); // Show top 8 projects
  };

  const projectProgress = getProjectProgress();

  // Circular progress component
  const CircularProgress = ({ percentage, size = 120, strokeWidth = 8, color = 'text-blue-500' }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    // Ensure minimum visibility by showing at least 2% of the circle
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

        {/* Deadlines This Week - Full Width */}
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
                showCompletion={true}
                onToggleCompletion={toggleTaskCompletion}
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

        {/* Progress Charts - Side by Side */}
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
                      {/* Debug: Log the color being used */}
                      {console.log(`Department ${dept.name} color:`, dept.color, 'textColor:', dept.textColor)}
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
                  ? Math.round((currentYearTasks.filter(task => 
                      task.Completed_x003f_ === true || task.Completed_x003f_ === 'Yes' || task.Completed_x003f_ === 'yes' ||
                      task.Completed === true || task.Completed === 'Yes' || task.Completed === 'yes'
                    ).length / currentYearTasks.length) * 100)
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