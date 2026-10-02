import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { taskManager } from './services/taskManager';
import { isThisWeek, format, differenceInDays, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { useAuth } from './Auth';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  CalendarDaysIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import TaskCard from './TaskCard';
import NoteModal from './components/NoteModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import { useTasks } from './hooks/useTasks';
import { 
  getTaskDeadline, 
  parseDeadlineDate, 
  isTaskCompleted, 
  getTaskPriority, 
  getTaskProject, 
  getTaskStatus,
  getTaskDepartments,
  filterDeadlineTasks,
  taskBelongsToUserDepartments
} from './utils/taskHelpers';

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

function Dashboard({ users }) {
  const { tasks: allTasks, isLoading: loading } = useTasks();
  const [departmentFilterEnabled, setDepartmentFilterEnabled] = useState(false);

  // Modal states
  const [noteModal, setNoteModal] = useState({ isOpen: false, task: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, taskId: null, taskName: null });
  const { userProfile } = useAuth();

  // Only show actual deadline instances (no recurring templates)
  const tasks = useMemo(() => {
    const validTasks = (Array.isArray(allTasks) ? allTasks : []).filter(task => {
      if (!task || !task.id) return false;
      if (!task.title && !task.Task && !task.task) return false;
      return true;
    });
    return filterDeadlineTasks(validTasks);
  }, [allTasks]);

  // Load department filter setting
  useEffect(() => {
    try {
      const saved = localStorage.getItem('departmentFilterEnabled');
      setDepartmentFilterEnabled(saved === 'true');
    } catch (err) {
      console.error('Dashboard: Error loading department filter setting:', err);
    }

    const handleSettingChange = (event) => {
      const { enabled } = event.detail || {};
      setDepartmentFilterEnabled(enabled);
    };

    window.addEventListener('departmentFilterSettingChanged', handleSettingChange);
    return () => {
      window.removeEventListener('departmentFilterSettingChanged', handleSettingChange);
    };
  }, []);

  // Current user's departments come from the authenticated profile (/api/me),
  // not localStorage (S4)
  const currentUserDepartments = useMemo(() => {
    return userProfile?.departments || [];
  }, [userProfile]);

  // Filter tasks by department if setting is enabled
  const getFilteredTasks = useCallback((taskList) => {
    if (!departmentFilterEnabled) {
      return taskList;
    }
    if (!currentUserDepartments || currentUserDepartments.length === 0) {
      return taskList; // If user has no departments, show all
    }
    return taskList.filter(task => 
      taskBelongsToUserDepartments(task, currentUserDepartments, users)
    );
  }, [departmentFilterEnabled, currentUserDepartments, users]);

  // Current year tasks for progress tracking (P5: memoized)
  const currentYearTasks = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearStart = startOfYear(new Date(currentYear, 0, 1));
    const yearEnd = endOfYear(new Date(currentYear, 11, 31));

    const yearTasks = tasks.filter(task => {
      const deadline = parseDeadlineDate(getTaskDeadline(task));
      return deadline && isWithinInterval(deadline, { start: yearStart, end: yearEnd });
    });

    return getFilteredTasks(yearTasks);
  }, [tasks, getFilteredTasks]);

  // Top metrics (P5: memoized; C4: canonical getTaskStatus)
  const metrics = useMemo(() => {
    const totalTasks = currentYearTasks.length;
    const completedTasks = currentYearTasks.filter(task => isTaskCompleted(task)).length;
    const urgentTasks = currentYearTasks.filter(task => getTaskPriority(task) === 'Urgent').length;

    const weekTasks = tasks.filter(task => {
      const deadline = parseDeadlineDate(getTaskDeadline(task));
      return deadline && isThisWeek(deadline);
    });
    const tasksThisWeekCount = getFilteredTasks(weekTasks).length;

    const overdueTasksList = tasks.filter(task => getTaskStatus(task) === 'Overdue');
    const overdueTasks = getFilteredTasks(overdueTasksList).length;

    return {
      total: totalTasks,
      completed: completedTasks,
      urgent: urgentTasks,
      dueThisWeek: tasksThisWeekCount,
      overdue: overdueTasks
    };
  }, [tasks, currentYearTasks, getFilteredTasks]);

  // Tasks due this week (P5: memoized)
  const tasksThisWeek = useMemo(() => {
    const weekTasks = tasks.filter(task => {
      const deadline = parseDeadlineDate(getTaskDeadline(task));
      return deadline && isThisWeek(deadline);
    });

    return getFilteredTasks(weekTasks).map(task => {
      const deadline = parseDeadlineDate(getTaskDeadline(task));
      const today = new Date();
      const deadlineStartOfDay = deadline ? new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate()) : null;
      const todayStartOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const daysUntil = deadlineStartOfDay ? differenceInDays(deadlineStartOfDay, todayStartOfDay) : 0;

      return {
        ...task,
        deadline,
        daysUntil,
        isCompleted: isTaskCompleted(task)
      };
    }).sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      return a.daysUntil - b.daysUntil;
    });
  }, [tasks, getFilteredTasks]);

  // Action handlers for TaskCard - surface failures to the user (C10)
  const handleToggleComplete = useCallback(async (taskId, currentStatus) => {
    try {
      await taskManager.updateTask(taskId, { completed: !currentStatus });
    } catch (error) {
      console.error('Dashboard: Error toggling completion:', error);
      alert(`Failed to update task: ${error.message}`);
    }
  }, []);

  const handleToggleUrgent = useCallback(async (taskId, currentUrgency) => {
    try {
      await taskManager.updateTask(taskId, { priority: currentUrgency ? 'Normal' : 'Urgent' });
    } catch (error) {
      console.error('Dashboard: Error toggling urgency:', error);
      alert(`Failed to update task: ${error.message}`);
    }
  }, []);

  const handleNoteClick = useCallback((task) => {
    setNoteModal({ isOpen: true, task });
  }, []);

  const handleNoteSave = useCallback(async (taskId, noteContent) => {
    try {
      await taskManager.updateTask(taskId, { note: noteContent });
      setNoteModal({ isOpen: false, task: null });
    } catch (error) {
      console.error('Dashboard: Error saving note:', error);
      alert(`Failed to save note: ${error.message}`);
    }
  }, []);

  const handleDeleteClick = useCallback((taskId, task) => {
    setDeleteModal({ 
      isOpen: true, 
      taskId, 
      taskName: task.title || task.task || task.Task || 'this task' 
    });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteModal.taskId) return;
    
    try {
      await taskManager.deleteTask(deleteModal.taskId);
    } catch (error) {
      console.error('Dashboard: Error deleting task:', error);
      alert(`Failed to delete task: ${error.message}`);
    } finally {
      setDeleteModal({ isOpen: false, taskId: null, taskName: null });
    }
  }, [deleteModal]);

  // Department progress (A2: shared department resolution, no localStorage)
  const departmentProgress = useMemo(() => {
    const progress = {};

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

    if (users && users.length > 0) {
      currentYearTasks.forEach(task => {
        const taskDepartments = getTaskDepartments(task, users);
        const taskIsCompleted = isTaskCompleted(task);

        taskDepartments.forEach(department => {
          if (progress[department]) {
            progress[department].total++;
            if (taskIsCompleted) {
              progress[department].completed++;
            }
          }
        });
      });
    }

    Object.values(DEPARTMENTS).forEach(dept => {
      const stats = progress[dept];
      stats.percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    });

    return Object.values(progress);
  }, [users, currentYearTasks]);

  // Project progress (P5: memoized; P6: per-customer debug forensics removed)
  const projectProgress = useMemo(() => {
    const projects = {};

    currentYearTasks.forEach(task => {
      const projectName = getTaskProject(task) || 'Unassigned';

      if (!projects[projectName]) {
        projects[projectName] = { completed: 0, total: 0 };
      }
      projects[projectName].total++;

      if (isTaskCompleted(task)) {
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
  }, [currentYearTasks]);

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
                    onToggleComplete={handleToggleComplete}
                    onToggleUrgent={handleToggleUrgent}
                    onNoteClick={handleNoteClick}
                    onDeleteClick={handleDeleteClick}
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
                  ? Math.round((currentYearTasks.filter(task => isTaskCompleted(task)).length / currentYearTasks.length) * 100)
                  : 0}%
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Overall completion</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <NoteModal
        isOpen={noteModal.isOpen}
        onClose={() => setNoteModal({ isOpen: false, task: null })}
        task={noteModal.task}
        onSave={handleNoteSave}
      />
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, taskId: null, taskName: null })}
        onConfirm={handleDeleteConfirm}
        itemName={deleteModal.taskName}
      />
    </div>
  );
}

export default Dashboard;
