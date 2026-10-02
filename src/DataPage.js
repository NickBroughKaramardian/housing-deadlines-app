import React, { useState, useMemo, useCallback } from 'react';
import { format, startOfYear, endOfYear, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
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
  SparklesIcon
} from '@heroicons/react/24/outline';
import { filterDeadlineTasks, parseDeadlineDate, isTaskCompleted, getTaskDepartments } from './utils/taskHelpers';
import { useTasks } from './hooks/useTasks';
import { useUsers } from './hooks/useUsers';

function DataPage() {
  const { tasks: allTasks, isLoading: loading } = useTasks();
  const { users } = useUsers();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Only show actual deadline instances (no recurring templates)
  const tasks = useMemo(
    () => filterDeadlineTasks(Array.isArray(allTasks) ? allTasks : []),
    [allTasks]
  );

  // Get tasks for a specific year (or all time if 'all')
  const getYearTasks = useCallback((year) => {
    if (year === 'all') return tasks; // All time
    
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 11, 31));
    
    return tasks.filter(task => {
      const deadline = parseDeadlineDate(task.deadline || task.deadline_date || task.Deadline);
      return deadline && isWithinInterval(deadline, { start: yearStart, end: yearEnd });
    });
  }, [tasks]);

  // Get all available years from tasks
  const getAvailableYears = useCallback(() => {
    const years = new Set();
    tasks.forEach(task => {
      const deadline = parseDeadlineDate(task.deadline || task.deadline_date || task.Deadline);
      if (deadline) {
        years.add(deadline.getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Newest first
  }, [tasks]);

  // Calculate comprehensive metrics
  const metrics = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const selectedYearTasks = getYearTasks(selectedYear);
    const thisWeekStart = startOfWeek(new Date());
    const thisWeekEnd = endOfWeek(new Date());
    const thisMonthStart = startOfMonth(new Date());
    const thisMonthEnd = endOfMonth(new Date());

    // Helper to check completion (canonical helper, C4/A2)
    const isCompleted = isTaskCompleted;

    // Total counts
    const totalTasksAllTime = tasks.length;
    const totalTasksThisYear = selectedYearTasks.length;
    const completedTasksAllTime = tasks.filter(isCompleted).length;
    const completedTasksThisYear = selectedYearTasks.filter(isCompleted).length;

    // Due this week/month/year
    const tasksThisWeek = tasks.filter(task => {
      const deadline = parseDeadlineDate(task.deadline || task.deadline_date || task.Deadline);
      return deadline && isWithinInterval(deadline, { start: thisWeekStart, end: thisWeekEnd });
    });
    
    const tasksThisMonth = tasks.filter(task => {
      const deadline = parseDeadlineDate(task.deadline || task.deadline_date || task.Deadline);
      return deadline && isWithinInterval(deadline, { start: thisMonthStart, end: thisMonthEnd });
    });

    // Task types (Priority)
    const urgentTasksAllTime = tasks.filter(t => t.priority === 'Urgent' || t.Priority === 'Urgent').length;
    const urgentTasksThisYear = selectedYearTasks.filter(t => t.priority === 'Urgent' || t.Priority === 'Urgent').length;
    const normalTasksAllTime = tasks.filter(t => t.priority !== 'Urgent' && t.Priority !== 'Urgent').length;
    const normalTasksThisYear = selectedYearTasks.filter(t => t.priority !== 'Urgent' && t.Priority !== 'Urgent').length;

    // Overdue tasks
    const now = new Date();
    const overdueTasks = tasks.filter(task => {
      if (isCompleted(task)) return false;
      const deadline = parseDeadlineDate(task.deadline || task.deadline_date || task.Deadline);
      return deadline && deadline < now;
    });


    // Department metrics - departments come from the users list (merged with
    // API assignments by useUsers), not localStorage (S4)
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

    const departmentMetrics = {};
    
    // Initialize all departments
    Object.values(DEPARTMENTS).forEach(dept => {
      departmentMetrics[DEPARTMENT_NAMES[dept]] = {
        total: 0,
        completed: 0,
        percentage: 0
      };
    });
    
    if (users && users.length > 0) {
      selectedYearTasks.forEach(task => {
        // Shared department resolution (A2)
        const taskDepartments = getTaskDepartments(task, users);

        // Determine completion status
        const isCompletedTask = isCompleted(task);
        
        // Count this task once for each unique department
        taskDepartments.forEach(department => {
          const deptName = DEPARTMENT_NAMES[department];
          if (deptName && departmentMetrics[deptName]) {
            departmentMetrics[deptName].total++;
            if (isCompletedTask) {
              departmentMetrics[deptName].completed++;
            }
          }
        });
      });
      
      // Calculate percentages
      Object.keys(departmentMetrics).forEach(deptName => {
        const stats = departmentMetrics[deptName];
        stats.percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
      });
    }

    // Project metrics
    const projects = [...new Set(selectedYearTasks.map(t => (t.project || t.Project || 'Unassigned')).filter(Boolean))];
    const projectMetrics = {};
    
    projects.forEach(project => {
      const projectTasks = selectedYearTasks.filter(t => (t.project || t.Project || 'Unassigned') === project);
      const completedProjectTasks = projectTasks.filter(isCompleted);
      
      projectMetrics[project] = {
        total: projectTasks.length,
        completed: completedProjectTasks.length,
        percentage: projectTasks.length > 0 ? Math.round((completedProjectTasks.length / projectTasks.length) * 100) : 0
      };
    });

    // User metrics (C10: skip users without an email/UPN and never match on
    // an empty string, which previously matched every task)
    const userMetrics = users
      .filter(user => (user.mail || user.userPrincipalName || user.email || user.Email || '').trim() !== '')
      .map(user => {
        const userEmail = (user.mail || user.userPrincipalName || user.email || user.Email).trim();
        const userDisplayName = (user.displayName || user.DisplayName || userEmail).trim();

        const userTasks = selectedYearTasks.filter(task => {
          const responsibleParty = task.responsibleParty || task.ResponsibleParty || '';
          if (!responsibleParty) return false;

          let responsiblePartyStr = '';
          if (typeof responsibleParty === 'string') {
            responsiblePartyStr = responsibleParty;
          } else if (Array.isArray(responsibleParty)) {
            responsiblePartyStr = responsibleParty.map(item => {
              if (typeof item === 'object' && item.LookupValue) return item.LookupValue;
              if (typeof item === 'object' && item.Email) return item.Email;
              return String(item);
            }).join('; ');
          } else {
            responsiblePartyStr = String(responsibleParty || '');
          }

          const responsibleLower = responsiblePartyStr.toLowerCase();
          if (!responsibleLower.trim()) return false;

          // Try matching by email first
          if (responsibleLower.includes(userEmail.toLowerCase())) {
            return true;
          }

          // Try matching by display name (only if non-empty)
          if (userDisplayName && responsibleLower.includes(userDisplayName.toLowerCase())) {
            return true;
          }

          return false;
        });

        const completedUserTasks = userTasks.filter(isCompleted);

        return {
          name: userDisplayName,
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
      completionRateAllTime: totalTasksAllTime > 0 ? Math.round((completedTasksAllTime / totalTasksAllTime) * 100) : 0,
      completionRateThisYear: totalTasksThisYear > 0 ? Math.round((completedTasksThisYear / totalTasksThisYear) * 100) : 0,
      departmentMetrics,
      projectMetrics,
      userMetrics
    };
  }, [tasks, users, selectedYear, getYearTasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 space-y-6 p-6">
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <SparklesIcon className="w-6 h-6 text-blue-500" />
            All-Time Overview
          </h2>
          
          {/* Year Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            >
              <option value="all">All Time</option>
              {getAvailableYears().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          Department Progress ({selectedYear === 'all' ? 'All Time' : selectedYear})
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
          Project Progress ({selectedYear === 'all' ? 'All Time' : selectedYear})
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
          User Progress ({selectedYear === 'all' ? 'All Time' : selectedYear})
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto hide-scrollbar">
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

