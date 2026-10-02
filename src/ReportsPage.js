import React, { useState, useMemo } from 'react';
import { format, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import {
  DocumentArrowDownIcon,
  PrinterIcon,
  FunnelIcon,
  CalendarDaysIcon,
  BuildingOfficeIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { filterDeadlineTasks, getTaskDeadline, parseDeadlineDate, isTaskCompleted, getTaskProject, getTaskTitle, getTaskResponsibleParty, getTaskDepartments } from './utils/taskHelpers';
import { useTasks } from './hooks/useTasks';
import { useUsers } from './hooks/useUsers';

// Department constants (matching Dashboard)
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

const REPORT_TYPES = {
  DEADLINES: 'deadlines',
  DEPARTMENT_PROGRESS: 'department_progress',
  USER_PROGRESS: 'user_progress'
};

function ReportsPage() {
  const { tasks: allTasks, isLoading: loading } = useTasks();
  const { users } = useUsers();

  // Only show actual deadline instances (no recurring templates)
  const tasks = useMemo(
    () => filterDeadlineTasks(Array.isArray(allTasks) ? allTasks : []),
    [allTasks]
  );
  
  // Report configuration
  const [reportType, setReportType] = useState(REPORT_TYPES.DEADLINES);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedProjectForDept, setSelectedProjectForDept] = useState('');
  const [selectedProjectForUser, setSelectedProjectForUser] = useState('');
  
  // UI state
  const [showPreview, setShowPreview] = useState(false);

  // Get available projects
  const availableProjects = useMemo(() => {
    const projects = new Set();
    tasks.forEach(task => {
      const project = getTaskProject(task);
      if (project) projects.add(project);
    });
    return Array.from(projects).sort();
  }, [tasks]);

  // Get available years
  const availableYears = useMemo(() => {
    const years = new Set();
    tasks.forEach(task => {
      const deadline = parseDeadlineDate(getTaskDeadline(task));
      if (deadline) years.add(deadline.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [tasks]);

  // Filter tasks based on report configuration
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];

    // Filter by year
    if (selectedYear) {
      const yearStart = startOfYear(new Date(selectedYear, 0, 1));
      const yearEnd = endOfYear(new Date(selectedYear, 11, 31));
      filtered = filtered.filter(task => {
        const deadline = parseDeadlineDate(getTaskDeadline(task));
        return deadline && isWithinInterval(deadline, { start: yearStart, end: yearEnd });
      });
    }

    // Filter by included projects
    if (selectedProjects.length > 0) {
      filtered = filtered.filter(task => {
        const project = getTaskProject(task);
        return project && selectedProjects.includes(project);
      });
    }

    // Filter by users
    if (selectedUsers.length > 0) {
      filtered = filtered.filter(task => {
        const responsibleParty = getTaskResponsibleParty(task);
        if (!responsibleParty) return false;
        
        return selectedUsers.some(userId => {
          const user = users.find(u => u.id === userId);
          if (!user) return false;
          
          const userEmail = user.email || user.Email || user.mail || user.userPrincipalName || '';
          const userDisplayName = user.displayName || user.DisplayName || '';
          
          let responsiblePartyStr = '';
          if (typeof responsibleParty === 'string') {
            responsiblePartyStr = responsibleParty;
          } else if (Array.isArray(responsibleParty)) {
            responsiblePartyStr = responsibleParty.map(item => {
              if (typeof item === 'object' && item.LookupValue) return item.LookupValue;
              if (typeof item === 'object' && item.Email) return item.Email;
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
      });
    }

    return filtered;
  }, [tasks, selectedYear, selectedProjects, selectedUsers, users]);

  // Calculate department progress (A2: shared department resolution; user
  // assignments come from the API via useUsers, not localStorage)
  const getDepartmentProgress = (tasksForReport) => {
    const progress = {};
    
    // Initialize all departments
    Object.values(DEPARTMENTS).forEach(dept => {
      progress[dept] = {
        name: DEPARTMENT_NAMES[dept],
        completed: 0,
        total: 0,
        percentage: 0
      };
    });
    
    if (!users || users.length === 0) {
      return Object.values(progress);
    }

    tasksForReport.forEach(task => {
      const taskDepartments = getTaskDepartments(task, users);
      const isCompleted = isTaskCompleted(task);
      
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

  // Calculate user progress (C10: skip users without an email and never
  // match on an empty string)
  const getUserProgress = (tasksForReport) => {
    return users
      .filter(user => (user.mail || user.userPrincipalName || user.email || user.Email || '').trim() !== '')
      .map(user => {
        const userEmail = (user.mail || user.userPrincipalName || user.email || user.Email).trim();
        const userDisplayName = (user.displayName || user.DisplayName || userEmail).trim();

        const userTasks = tasksForReport.filter(task => {
          const responsibleParty = getTaskResponsibleParty(task);
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

          if (responsibleLower.includes(userEmail.toLowerCase())) {
            return true;
          }
          if (userDisplayName && responsibleLower.includes(userDisplayName.toLowerCase())) {
            return true;
          }

          return false;
        });

        const completedUserTasks = userTasks.filter(isTaskCompleted);

        return {
          name: userDisplayName,
          email: userEmail,
          total: userTasks.length,
          completed: completedUserTasks.length,
          percentage: userTasks.length > 0 ? Math.round((completedUserTasks.length / userTasks.length) * 100) : 0
        };
      }).filter(user => user.total > 0); // Only show users with tasks
  };

  // Get tasks for department/user reports
  const getTasksForReport = () => {
    let tasksForReport = filteredTasks;
    
    // Additional filtering for department/user reports
    if (reportType === REPORT_TYPES.DEPARTMENT_PROGRESS && selectedProjectForDept) {
      tasksForReport = tasksForReport.filter(task => getTaskProject(task) === selectedProjectForDept);
    }
    
    if (reportType === REPORT_TYPES.USER_PROGRESS && selectedProjectForUser) {
      tasksForReport = tasksForReport.filter(task => getTaskProject(task) === selectedProjectForUser);
    }
    
    return tasksForReport;
  };

  // Generate report data
  const reportData = useMemo(() => {
    const tasksForReport = getTasksForReport();
    
    switch (reportType) {
      case REPORT_TYPES.DEADLINES:
        return {
          type: 'Deadlines',
          tasks: tasksForReport.sort((a, b) => {
            const dateA = parseDeadlineDate(getTaskDeadline(a));
            const dateB = parseDeadlineDate(getTaskDeadline(b));
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateA - dateB;
          })
        };
      case REPORT_TYPES.DEPARTMENT_PROGRESS:
        return {
          type: 'Department Progress',
          departments: getDepartmentProgress(tasksForReport)
        };
      case REPORT_TYPES.USER_PROGRESS:
        return {
          type: 'User Progress',
          users: getUserProgress(tasksForReport)
        };
      default:
        return { type: 'Unknown', data: [] };
    }
  }, [reportType, filteredTasks, selectedProjectForDept, selectedProjectForUser, users]);

  // Export to PDF
  const exportToPDF = () => {
    window.print();
  };

  // Print report
  const printReport = () => {
    window.print();
  };

  // Get report title
  const getReportTitle = () => {
    let title = `${reportData.type} Report`;
    
    if (selectedYear) {
      title += ` - ${selectedYear}`;
    }
    
    if (selectedProjects.length > 0) {
      title += ` - Projects: ${selectedProjects.join(', ')}`;
    }
    
    if (selectedUsers.length > 0) {
      const userNames = selectedUsers.map(id => {
        const user = users.find(u => u.id === id);
        return user ? (user.displayName || user.email) : id;
      });
      title += ` - Users: ${userNames.join(', ')}`;
    }
    
    if (reportType === REPORT_TYPES.DEPARTMENT_PROGRESS && selectedProjectForDept) {
      title += ` - Project: ${selectedProjectForDept}`;
    }
    
    if (reportType === REPORT_TYPES.USER_PROGRESS && selectedProjectForUser) {
      title += ` - Project: ${selectedProjectForUser}`;
    }
    
    return title;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading report data...</p>
        </div>
      </div>
    );
  }

  // Helper function to get user display name from email
  const getUserDisplayName = (email) => {
    if (!email) return '';
    const user = users.find(u => {
      const userEmail = u.email || u.Email || u.mail || u.userPrincipalName || '';
      return userEmail.toLowerCase() === email.toLowerCase();
    });
    return user ? (user.displayName || user.DisplayName || email) : email;
  };

  // Helper function to format responsible party with names only (no emails)
  const formatResponsibleParty = (responsibleParty) => {
    if (!responsibleParty) return 'Unassigned';
    
    if (typeof responsibleParty === 'string') {
      // If it's a comma-separated string of emails
      const emails = responsibleParty.split(',').map(e => e.trim()).filter(Boolean);
      if (emails.length === 0) return 'Unassigned';
      
      return emails.map(email => {
        const name = getUserDisplayName(email);
        return name !== email ? name : email; // Show only name, not email
      }).join(', ');
    } else if (Array.isArray(responsibleParty)) {
      return responsibleParty.map(item => {
        if (typeof item === 'object' && item.LookupValue) {
          return item.LookupValue;
        }
        if (typeof item === 'object' && item.Email) {
          const name = getUserDisplayName(item.Email);
          return name !== item.Email ? name : item.Email; // Show only name, not email
        }
        const email = String(item);
        const name = getUserDisplayName(email);
        return name !== email ? name : email; // Show only name, not email
      }).join(', ');
    } else if (responsibleParty && typeof responsibleParty === 'object') {
      const email = responsibleParty.Email || responsibleParty.LookupValue || String(responsibleParty);
      const name = getUserDisplayName(email);
      return name !== email ? name : email; // Show only name, not email
    }
    
    return String(responsibleParty || 'Unassigned');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 reports-page">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between no-print">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Generate custom reports and export to PDF or print
            </p>
          </div>
          {showPreview && (
            <div className="flex items-center gap-2">
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-all"
              >
                <DocumentArrowDownIcon className="w-5 h-5" />
                Export PDF
              </button>
              <button
                onClick={printReport}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
              >
                <PrinterIcon className="w-5 h-5" />
                Print
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-all"
              >
                Back to Filters
              </button>
            </div>
          )}
        </div>

        {!showPreview ? (
          /* Filter Configuration */
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6 no-print">
            {/* Report Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Report Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setReportType(REPORT_TYPES.DEADLINES)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    reportType === REPORT_TYPES.DEADLINES
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <CalendarDaysIcon className="w-8 h-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                  <div className="text-center font-medium text-gray-900 dark:text-white">Deadlines</div>
                  <div className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1">Task deadlines report</div>
                </button>
                <button
                  onClick={() => setReportType(REPORT_TYPES.DEPARTMENT_PROGRESS)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    reportType === REPORT_TYPES.DEPARTMENT_PROGRESS
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <BuildingOfficeIcon className="w-8 h-8 mx-auto mb-2 text-green-600 dark:text-green-400" />
                  <div className="text-center font-medium text-gray-900 dark:text-white">Department Progress</div>
                  <div className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1">Department completion metrics</div>
                </button>
                <button
                  onClick={() => setReportType(REPORT_TYPES.USER_PROGRESS)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    reportType === REPORT_TYPES.USER_PROGRESS
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <UserIcon className="w-8 h-8 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
                  <div className="text-center font-medium text-gray-900 dark:text-white">User Progress</div>
                  <div className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1">Individual user metrics</div>
                </button>
              </div>
            </div>

            {/* Year Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">All Years</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Project Filters */}
            {reportType === REPORT_TYPES.DEADLINES && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Include Projects (leave empty for all)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableProjects.map(project => (
                      <button
                        key={project}
                        onClick={() => {
                          if (selectedProjects.includes(project)) {
                            setSelectedProjects(selectedProjects.filter(p => p !== project));
                          } else {
                            setSelectedProjects([...selectedProjects, project]);
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                          selectedProjects.includes(project)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {project}
                      </button>
                    ))}
                  </div>
                </div>

                {/* User Filter for Deadlines */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filter by Users (optional)
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                    {users.map(user => (
                      <label key={user.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {user.displayName || user.email || user.id}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Project Filter for Department Progress */}
            {reportType === REPORT_TYPES.DEPARTMENT_PROGRESS && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project (optional - leave empty for overall)
                </label>
                <select
                  value={selectedProjectForDept}
                  onChange={(e) => setSelectedProjectForDept(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Projects (Overall)</option>
                  {availableProjects.map(project => (
                    <option key={project} value={project}>{project}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Project Filter for User Progress */}
            {reportType === REPORT_TYPES.USER_PROGRESS && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project (optional - leave empty for overall)
                </label>
                <select
                  value={selectedProjectForUser}
                  onChange={(e) => setSelectedProjectForUser(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Projects (Overall)</option>
                  {availableProjects.map(project => (
                    <option key={project} value={project}>{project}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Generate Report Button */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowPreview(true)}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
              >
                <FunnelIcon className="w-5 h-5" />
                Generate Report
              </button>
            </div>
          </div>
        ) : (
          /* Report Preview */
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 print:p-4 print:shadow-none print:border-0 print-only">
            {/* Report Header */}
            <div className="mb-6 print:mb-4 border-b border-gray-200 dark:border-gray-700 pb-4 print:pb-2 print:border-gray-300">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white print:text-black print:!text-black">{getReportTitle()}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-600 print:!text-gray-700 mt-1">
                Generated on {format(new Date(), 'MMMM dd, yyyy')}
              </p>
            </div>

            {/* Deadlines Report */}
            {reportType === REPORT_TYPES.DEADLINES && (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-600 mb-4">
                  Total Deadlines: {reportData.tasks.length}
                </div>
                <table className="w-full border-collapse print:text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700 print:bg-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 print:text-gray-700 uppercase border-b print:w-2/5">Task</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 print:text-gray-700 uppercase border-b print:w-1/6">Project</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 print:text-gray-700 uppercase border-b print:w-1/8">Deadline</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 print:text-gray-700 uppercase border-b print:w-1/8">Responsible</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 print:text-gray-700 uppercase border-b print:w-1/4">Notes</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 print:text-gray-700 uppercase border-b print:w-1/12">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.tasks.map((task, idx) => {
                      const deadline = parseDeadlineDate(getTaskDeadline(task));
                      const responsibleParty = getTaskResponsibleParty(task);
                      const responsiblePartyStr = formatResponsibleParty(responsibleParty);
                      
                      return (
                        <tr key={task.id || idx} className="border-b border-gray-200 dark:border-gray-700 print:border-gray-300">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white print:text-black print:break-words">{getTaskTitle(task) || 'Untitled'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 print:text-gray-600">{getTaskProject(task) || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 print:text-gray-600">
                            {deadline ? format(deadline, 'MMM dd, yyyy') : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 print:text-gray-600 print:break-words">{responsiblePartyStr}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 print:text-gray-600 print:break-words">
                            {task.note || task.notes || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              isTaskCompleted(task)
                                ? 'bg-green-100 text-green-800 print:bg-green-50 print:text-green-900'
                                : 'bg-blue-100 text-blue-800 print:bg-blue-50 print:text-blue-900'
                            }`}>
                              {isTaskCompleted(task) ? 'Complete' : 'Active'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Department Progress Report */}
            {reportType === REPORT_TYPES.DEPARTMENT_PROGRESS && (
              <div className="space-y-4">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700 print:bg-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 print:text-gray-700 uppercase border-b">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 print:text-gray-700 uppercase border-b">Total Tasks</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 print:text-gray-700 uppercase border-b">Completed</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 print:text-gray-700 uppercase border-b">Progress</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 print:text-gray-700 uppercase border-b">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.departments.map((dept, idx) => (
                      <tr key={dept.name || idx} className="border-b border-gray-200 dark:border-gray-700 print:border-gray-300">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white print:text-black">{dept.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 print:text-gray-600">{dept.total}</td>
                        <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 print:text-green-700">{dept.completed}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="w-32 bg-gray-200 dark:bg-gray-700 print:bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 dark:bg-blue-500 print:bg-blue-600 h-2 rounded-full"
                              style={{ width: `${dept.percentage}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white print:text-black">{dept.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* User Progress Report */}
            {reportType === REPORT_TYPES.USER_PROGRESS && (
              <div className="space-y-4">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700 print:bg-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 print:text-gray-700 uppercase border-b">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 print:text-gray-700 uppercase border-b">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 print:text-gray-700 uppercase border-b">Total Tasks</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 print:text-gray-700 uppercase border-b">Completed</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 print:text-gray-700 uppercase border-b">Progress</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 print:text-gray-700 uppercase border-b">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.users.map((user, idx) => (
                      <tr key={user.email || idx} className="border-b border-gray-200 dark:border-gray-700 print:border-gray-300">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white print:text-black">{user.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 print:text-gray-600">{user.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 print:text-gray-600">{user.total}</td>
                        <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 print:text-green-700">{user.completed}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="w-32 bg-gray-200 dark:bg-gray-700 print:bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-600 dark:bg-purple-500 print:bg-purple-600 h-2 rounded-full"
                              style={{ width: `${user.percentage}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white print:text-black">{user.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            margin: 0.5in;
            size: letter;
          }
          
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          body {
            background: white !important;
          }
          
          /* Hide everything except the report panel */
          body * {
            visibility: hidden;
          }
          
          .reports-page .print-only,
          .reports-page .print-only * {
            visibility: visible;
          }
          
          .reports-page .print-only {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          
          /* Hide non-print elements */
          .no-print,
          .no-print * {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Table styling for print */
          .print-only table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
            page-break-inside: auto;
          }
          
          .print-only thead {
            display: table-header-group;
          }
          
          .print-only tbody {
            display: table-row-group;
          }
          
          .print-only tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          .print-only th,
          .print-only td {
            padding: 6px 8px;
            border: 1px solid #ddd;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          
          .print-only th {
            background-color: #f5f5f5 !important;
            font-weight: bold;
            color: #000 !important;
          }
          
          .print-only td {
            color: #000 !important;
          }
          
          /* Ensure report header is visible */
          .print-only h2 {
            color: #000 !important;
            font-weight: bold !important;
          }
          
          .print-only p {
            color: #333 !important;
          }
          
          /* Column widths for deadlines table - Task column wider, Responsible Party narrower */
          .print-only table thead th:nth-child(1) {
            width: 35%;
          }
          
          .print-only table thead th:nth-child(2) {
            width: 12%;
          }
          
          .print-only table thead th:nth-child(3) {
            width: 10%;
          }
          
          .print-only table thead th:nth-child(4) {
            width: 10%;
          }
          
          .print-only table thead th:nth-child(5) {
            width: 25%;
          }
          
          .print-only table thead th:nth-child(6) {
            width: 8%;
          }
        }
      `}} />
    </div>
  );
}

export default ReportsPage;

