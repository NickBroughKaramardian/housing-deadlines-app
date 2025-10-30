import React, { useState, useEffect, useMemo } from 'react';
import { format, parse, isValid, differenceInDays, startOfYear, endOfYear, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import {
  ChartBarIcon,
  UserIcon,
  BuildingOfficeIcon,
  FolderIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { globalTaskStore } from './globalTaskStore';
import { microsoftDataService } from './microsoftDataService';

function DataPage() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Subscribe to global task store updates
        const unsubscribe = globalTaskStore.subscribe(() => {
          const allTasks = globalTaskStore.getAllTasks();
          setTasks(allTasks);
        });
        
        // Get initial data
        const [allTasks, usersData] = await Promise.all([
          globalTaskStore.getAllTasks(),
          microsoftDataService.users.getEnterpriseUsers()
        ]);
        setTasks(allTasks);
        setUsers(usersData);
        
        return unsubscribe;
      } catch (error) {
        console.error('DataPage: Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Helper function to parse deadline dates
  const parseDeadlineDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const isoDate = new Date(dateStr);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }
      const parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
      return isValid(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  // Get current year tasks
  const getCurrentYearTasks = () => {
    const currentYear = new Date().getFullYear();
    const yearStart = startOfYear(new Date(currentYear, 0, 1));
    const yearEnd = endOfYear(new Date(currentYear, 11, 31));
    
    return tasks.filter(task => {
      const deadline = parseDeadlineDate(task.Deadline);
      return deadline && isWithinInterval(deadline, { start: yearStart, end: yearEnd });
    });
  };

  // Calculate comprehensive metrics
  const metrics = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentYearTasks = getCurrentYearTasks();
    const thisWeekStart = startOfWeek(new Date());
    const thisWeekEnd = endOfWeek(new Date());
    const thisMonthStart = startOfMonth(new Date());
    const thisMonthEnd = endOfMonth(new Date());

    // Helper to check completion
    const isCompleted = (task) => 
      task.Completed_x003f_ === true || task.Completed_x003f_ === 'Yes' || 
      task.Completed_x003f_ === 'yes' || task.Completed === true ||
      task.Completed === 'Yes' || task.Completed === 'yes';

    // Total counts
    const totalTasksAllTime = tasks.length;
    const totalTasksThisYear = currentYearTasks.length;
    const completedTasksAllTime = tasks.filter(isCompleted).length;
    const completedTasksThisYear = currentYearTasks.filter(isCompleted).length;

    // Due this week/month/year
    const tasksThisWeek = tasks.filter(task => {
      const deadline = parseDeadlineDate(task.Deadline);
      return deadline && isWithinInterval(deadline, { start: thisWeekStart, end: thisWeekEnd });
    });
    
    const tasksThisMonth = tasks.filter(task => {
      const deadline = parseDeadlineDate(task.Deadline);
      return deadline && isWithinInterval(deadline, { start: thisMonthStart, end: thisMonthEnd });
    });

    // Task types (Priority)
    const urgentTasksAllTime = tasks.filter(t => t.Priority === 'Urgent').length;
    const urgentTasksThisYear = currentYearTasks.filter(t => t.Priority === 'Urgent').length;
    const normalTasksAllTime = tasks.filter(t => t.Priority !== 'Urgent').length;
    const normalTasksThisYear = currentYearTasks.filter(t => t.Priority !== 'Urgent').length;

    // Overdue tasks
    const now = new Date();
    const overdueTasks = tasks.filter(task => {
      if (isCompleted(task)) return false;
      const deadline = parseDeadlineDate(task.Deadline);
      return deadline && deadline < now;
    });

    // Calculate average completion time before due date
    const completedTasksWithData = tasks.filter(task => {
      if (!isCompleted(task)) return false;
      const deadline = parseDeadlineDate(task.Deadline);
      // Check if task has a Modified date that we can use as completion date
      return deadline && task.Modified;
    });

    let avgDaysBeforeDue = 0;
    if (completedTasksWithData.length > 0) {
      const totalDays = completedTasksWithData.reduce((sum, task) => {
        const deadline = parseDeadlineDate(task.Deadline);
        const completedDate = new Date(task.Modified);
        const daysBeforeDue = differenceInDays(deadline, completedDate);
        return sum + daysBeforeDue;
      }, 0);
      avgDaysBeforeDue = Math.round(totalDays / completedTasksWithData.length);
    }

    // Department metrics
    const USER_ASSIGNMENTS_KEY = 'user_assignments';
    let localAssignments = {};
    try {
      const stored = localStorage.getItem(USER_ASSIGNMENTS_KEY);
      if (stored) {
        localAssignments = JSON.parse(stored);
      }
    } catch (error) {
      console.error('DataPage: Error loading user assignments:', error);
    }

    const departments = ['Development', 'Accounting', 'Compliance', 'Management'];
    const departmentMetrics = {};
    
    departments.forEach(dept => {
      const deptTasks = currentYearTasks.filter(task => {
        const responsibleParty = task.ResponsibleParty;
        if (!responsibleParty) return false;
        
        const emails = responsibleParty.split(';').map(e => e.trim());
        return emails.some(email => {
          const assignment = localAssignments[email];
          return assignment && assignment.departments && assignment.departments.includes(dept);
        });
      });

      const completedDeptTasks = deptTasks.filter(isCompleted);
      
      departmentMetrics[dept] = {
        total: deptTasks.length,
        completed: completedDeptTasks.length,
        percentage: deptTasks.length > 0 ? Math.round((completedDeptTasks.length / deptTasks.length) * 100) : 0
      };
    });

    // Project metrics
    const projects = [...new Set(currentYearTasks.map(t => t.Project).filter(Boolean))];
    const projectMetrics = {};
    
    projects.forEach(project => {
      const projectTasks = currentYearTasks.filter(t => t.Project === project);
      const completedProjectTasks = projectTasks.filter(isCompleted);
      
      projectMetrics[project] = {
        total: projectTasks.length,
        completed: completedProjectTasks.length,
        percentage: projectTasks.length > 0 ? Math.round((completedProjectTasks.length / projectTasks.length) * 100) : 0
      };
    });

    // User metrics
    const userMetrics = users.map(user => {
      const userEmail = user.mail || user.userPrincipalName || user.email;
      const userDisplayName = user.displayName || user.DisplayName || userEmail;
      
      const userTasks = currentYearTasks.filter(task => {
        const responsibleParty = task.ResponsibleParty;
        if (!responsibleParty) return false;
        
        // Try matching by email first
        if (responsibleParty.toLowerCase().includes(userEmail.toLowerCase())) {
          return true;
        }
        
        // Try matching by display name
        if (responsibleParty.toLowerCase().includes(userDisplayName.toLowerCase())) {
          return true;
        }
        
        // Try matching by initials + display name (like "NK Nick Karamardian")
        const initials = userDisplayName.split(' ').map(n => n.charAt(0)).join('');
        const initialsWithName = `${initials} ${userDisplayName}`.toLowerCase();
        if (responsibleParty.toLowerCase().includes(initialsWithName)) {
          return true;
        }
        
        return false;
      });

      const completedUserTasks = userTasks.filter(isCompleted);
      
      return {
        name: user.displayName || user.DisplayName || userEmail,
        email: userEmail,
        total: userTasks.length,
        completed: completedUserTasks.length,
        percentage: userTasks.length > 0 ? Math.round((completedUserTasks.length / userTasks.length) * 100) : 0
      };
    });

    return {
      totalTasksAllTime,
      totalTasksThisYear,
      completedTasksAllTime,
      completedTasksThisYear,
      tasksThisWeek: tasksThisWeek.length,
      tasksThisMonth: tasksThisMonth.length,
      urgentTasksAllTime,
      urgentTasksThisYear,
      normalTasksAllTime,
      normalTasksThisYear,
      overdueTasks: overdueTasks.length,
      avgDaysBeforeDue,
      completionRateAllTime: totalTasksAllTime > 0 ? Math.round((completedTasksAllTime / totalTasksAllTime) * 100) : 0,
      completionRateThisYear: totalTasksThisYear > 0 ? Math.round((completedTasksThisYear / totalTasksThisYear) * 100) : 0,
      departmentMetrics,
      projectMetrics,
      userMetrics
    };
  }, [tasks, users]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Data Analytics
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive metrics and insights across your entire project portfolio
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {format(new Date(), 'MMMM yyyy')}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Data as of {format(new Date(), 'MMM dd, yyyy')}
          </div>
        </div>
      </div>

      {/* Summary Cards - All Time */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <SparklesIcon className="w-6 h-6 text-blue-500" />
          All-Time Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Total Tasks</p>
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mt-2">{metrics.totalTasksAllTime}</p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">All time</p>
              </div>
              <ChartBarIcon className="w-12 h-12 text-blue-500 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-300">Completed</p>
                <p className="text-4xl font-bold text-green-600 dark:text-green-400 mt-2">{metrics.completedTasksAllTime}</p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">{metrics.completionRateAllTime}% completion rate</p>
              </div>
              <CheckCircleIcon className="w-12 h-12 text-green-500 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-6 border border-orange-200 dark:border-orange-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-900 dark:text-orange-300">Urgent Priority</p>
                <p className="text-4xl font-bold text-orange-600 dark:text-orange-400 mt-2">{metrics.urgentTasksAllTime}</p>
                <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">High priority tasks</p>
              </div>
              <ExclamationTriangleIcon className="w-12 h-12 text-orange-500 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl p-6 border border-red-200 dark:border-red-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-900 dark:text-red-300">Overdue</p>
                <p className="text-4xl font-bold text-red-600 dark:text-red-400 mt-2">{metrics.overdueTasks}</p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">Past deadline</p>
              </div>
              <ClockIcon className="w-12 h-12 text-red-500 opacity-50" />
            </div>
          </div>
        </div>
      </div>

      {/* This Year Summary */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <CalendarDaysIcon className="w-6 h-6 text-purple-500" />
          {new Date().getFullYear()} Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tasks</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{metrics.totalTasksThisYear}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This year</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{metrics.completedTasksThisYear}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{metrics.completionRateThisYear}% rate</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Week</p>
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">{metrics.tasksThisWeek}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Due this week</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Month</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{metrics.tasksThisMonth}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Due this month</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Urgent</p>
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">{metrics.urgentTasksThisYear}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">High priority</p>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <ArrowTrendingUpIcon className="w-6 h-6 text-green-500" />
          Performance Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-500 rounded-lg">
                <ClockIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-300">Avg. Completion Time</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">Days before deadline</p>
              </div>
            </div>
            <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.avgDaysBeforeDue > 0 ? `+${metrics.avgDaysBeforeDue}` : metrics.avgDaysBeforeDue}
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-2">
              {metrics.avgDaysBeforeDue > 0 ? 'Completed early on average' : metrics.avgDaysBeforeDue < 0 ? 'Completed late on average' : 'On-time completion'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <ChartBarIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Task Priority Split</p>
                <p className="text-xs text-blue-700 dark:text-blue-400">This year distribution</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Urgent:</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{metrics.urgentTasksThisYear}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Normal:</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{metrics.normalTasksThisYear}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <CalendarDaysIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-900 dark:text-purple-300">Upcoming Deadlines</p>
                <p className="text-xs text-purple-700 dark:text-purple-400">Next 30 days</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">This Week:</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{metrics.tasksThisWeek}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">This Month:</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{metrics.tasksThisMonth}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Department Progress */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BuildingOfficeIcon className="w-6 h-6 text-indigo-500" />
          Department Progress ({new Date().getFullYear()})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(metrics.departmentMetrics).map(([dept, data]) => (
            <div key={dept} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">{dept}</h3>
                <BuildingOfficeIcon className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Completed</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{data.completed} / {data.total}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${data.percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">{data.percentage}% complete</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Project Progress */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FolderIcon className="w-6 h-6 text-cyan-500" />
          Project Progress ({new Date().getFullYear()})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(metrics.projectMetrics).slice(0, 9).map(([project, data]) => (
            <div key={project} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate" title={project}>{project}</h3>
                <FolderIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Completed</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{data.completed} / {data.total}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-cyan-600 dark:bg-cyan-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${data.percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">{data.percentage}% complete</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Progress */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <UserIcon className="w-6 h-6 text-pink-500" />
          User Progress ({new Date().getFullYear()})
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Tasks</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Completed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {metrics.userMetrics.map((user, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-pink-600 dark:text-pink-400">
                            {user.name.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{user.total}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">{user.completed}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-pink-600 dark:bg-pink-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${user.percentage}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{user.percentage}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataPage;

