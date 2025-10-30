import React, { useState, useEffect } from 'react';
import { globalTaskStore } from './globalTaskStore';

const Deadlines = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('deadline');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Date filter states
  const [dateFilter, setDateFilter] = useState({
    day: '',
    month: '',
    year: ''
  });

  // Load tasks from database
  const loadTasks = async () => {
    try {
      setLoading(true);
      console.log('Deadlines: Starting to load tasks...');
      // Get tasks from global store instead of loading directly
      const tasksData = globalTaskStore.getTasks();
      console.log('Deadlines: Received tasks data:', tasksData);
      setTasks(tasksData);
      console.log('Deadlines: Loaded', tasksData.length, 'tasks');
    } catch (err) {
      console.error('Deadlines: Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate recurring task instances
  const generateRecurringInstances = (task) => {
    if (!task.Recurring || task.Recurring !== 'Yes') {
      return [task];
    }

    const instances = [task];
    const startDate = new Date(task.Deadline);
    const interval = parseInt(task.Interval) || 1;
    const finalDate = task['Final Date'] ? new Date(task['Final Date']) : null;
    
    let currentDate = new Date(startDate);
    currentDate.setMonth(currentDate.getMonth() + interval);

    // Generate instances for the next 2 years
    while (currentDate <= new Date(currentDate.getFullYear() + 2, 11, 31)) {
      if (finalDate && currentDate > finalDate) {
        break;
      }

      const recurringInstance = {
        ...task,
        id: `${task.id}_${currentDate.getTime()}`,
        Deadline: currentDate.toISOString(),
        originalId: task.id,
        isRecurring: true
      };

      instances.push(recurringInstance);
      currentDate = new Date(currentDate);
      currentDate.setMonth(currentDate.getMonth() + interval);
    }

    return instances;
  };

  // Get all task instances (including recurring)
  const getAllTaskInstances = () => {
    const allInstances = [];
    tasks.forEach(task => {
      const instances = generateRecurringInstances(task);
      allInstances.push(...instances);
    });
    return allInstances;
  };

  // Calculate status based on deadline and completion
  const getCalculatedStatus = (task) => {
    if (task.Completed === 'Yes' || task.Completed === true) return 'Completed';
    if (new Date(task.Deadline) < new Date()) return 'Overdue';
    if (task.Priority === 'Urgent') return 'Urgent';
    return 'Active';
  };

  // Get task card color based on status
  const getTaskCardColor = (task) => {
    const status = getCalculatedStatus(task);
    const today = new Date();
    const dueDate = new Date(task.Deadline);
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    
    // Orange if urgent OR within 3 days of due date
    if (status === 'Urgent' || (daysUntilDue <= 3 && daysUntilDue >= 0)) {
      return 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800';
    }
    
    switch (status) {
      case 'Completed': return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'Overdue': return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      default: return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Overdue': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'Urgent': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  // Get days until due date
  const getDaysUntilDue = (task) => {
    const today = new Date();
    const dueDate = new Date(task.Deadline);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else {
      return `${diffDays} days left`;
    }
  };

  // Extract name from email or return as is
  const getNameFromEmail = (emailOrName) => {
    if (!emailOrName) return 'Unassigned';
    if (emailOrName.includes('@')) {
      const namePart = emailOrName.split('@')[0];
      return namePart.replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return emailOrName;
  };

  // Filter tasks based on current filters
  const getFilteredTasks = () => {
    const allInstances = getAllTaskInstances();
    let filtered = allInstances;

    // Status filter - handle multiple statuses for each task
    if (statusFilter !== 'All') {
      filtered = filtered.filter(task => {
        const status = getCalculatedStatus(task);
        switch (statusFilter) {
          case 'Active':
            return status === 'Active' || status === 'Urgent';
          case 'Urgent':
            return status === 'Urgent';
          case 'Completed':
            return status === 'Completed';
          case 'Overdue':
            return status === 'Overdue';
          default:
            return true;
        }
      });
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(task => 
        (task.Task && task.Task.toLowerCase().includes(searchLower)) ||
        (task.Project && task.Project.toLowerCase().includes(searchLower)) ||
        (task.ResponsibleParty && task.ResponsibleParty.toLowerCase().includes(searchLower)) ||
        (task.Notes && task.Notes.toLowerCase().includes(searchLower))
      );
    }

    // Date filter
    if (dateFilter.day || dateFilter.month || dateFilter.year) {
      filtered = filtered.filter(task => {
        const taskDate = new Date(task.Deadline);
        const taskDay = taskDate.getDate();
        const taskMonth = taskDate.getMonth() + 1; // JavaScript months are 0-indexed
        const taskYear = taskDate.getFullYear();

        let matches = true;

        if (dateFilter.day && taskDay !== parseInt(dateFilter.day)) {
          matches = false;
        }
        if (dateFilter.month && taskMonth !== parseInt(dateFilter.month)) {
          matches = false;
        }
        if (dateFilter.year && taskYear !== parseInt(dateFilter.year)) {
          matches = false;
        }

        return matches;
      });
    }

    return filtered;
  };

  // Sort tasks
  const getSortedTasks = (filteredTasks) => {
    return [...filteredTasks].sort((a, b) => {
      switch (sortBy) {
        case 'deadline':
          return new Date(a.Deadline) - new Date(b.Deadline);
        case 'responsible':
          const aResponsible = getNameFromEmail(a.ResponsibleParty);
          const bResponsible = getNameFromEmail(b.ResponsibleParty);
          return aResponsible.localeCompare(bResponsible);
        case 'project':
          const aProject = a.Project || 'No project';
          const bProject = b.Project || 'No project';
          return aProject.localeCompare(bProject);
        case 'priority':
          const priorityOrder = { 'Urgent': 0, 'Normal': 1 };
          return (priorityOrder[a.Priority] || 1) - (priorityOrder[b.Priority] || 1);
        default:
          return 0;
      }
    });
  };

  // Clear date filters
  const clearDateFilters = () => {
    setDateFilter({ day: '', month: '', year: '' });
  };

  // Load data when component mounts
  useEffect(() => {
    // Subscribe to global task store
    const unsubscribe = globalTaskStore.subscribe((tasks) => {
      console.log("Deadlines: Received", tasks.length, "tasks from global store");
      setTasks(tasks);
    });
    
    // Load initial data
    loadTasks();
    
    return () => unsubscribe();
    loadTasks();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading deadlines...</p>
        </div>
      </div>
    );
  }

  const filteredTasks = getFilteredTasks();
  const sortedTasks = getSortedTasks(filteredTasks);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Sort Deadlines
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Filter and sort all deadlines with advanced options
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status Filter Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Status Filter
              </label>
              <div className="flex flex-wrap gap-2">
                {['All', 'Active', 'Urgent', 'Completed', 'Overdue'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="deadline">Deadline</option>
                <option value="responsible">Responsible Party</option>
                <option value="project">Project</option>
                <option value="priority">Priority</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tasks, projects, people..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Date Filter */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Date Filter (DD MM YYYY)
              </label>
              <button
                onClick={clearDateFilters}
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Clear
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <input
                  type="number"
                  value={dateFilter.day}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, day: e.target.value }))}
                  placeholder="Day (1-31)"
                  min="1"
                  max="31"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={dateFilter.month}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, month: e.target.value }))}
                  placeholder="Month (1-12)"
                  min="1"
                  max="12"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={dateFilter.year}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, year: e.target.value }))}
                  placeholder="Year (e.g., 2024)"
                  min="2020"
                  max="2030"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Leave fields empty to include all dates. Example: Enter "6" in month to see all June deadlines.
            </p>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Deadlines ({sortedTasks.length})
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {sortedTasks.length} of {getAllTaskInstances().length} total task instances
                {statusFilter !== 'All' && ` • Filtered by: ${statusFilter}`}
                {(dateFilter.day || dateFilter.month || dateFilter.year) && ' • Date filtered'}
                {searchTerm && ' • Search filtered'}
              </p>
            </div>
            <button
              onClick={loadTasks}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Task Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTasks.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
              <div className="text-gray-400 dark:text-gray-500 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No deadlines found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {tasks.length === 0 
                  ? "No tasks have been created yet. Go to the Database page to add some tasks."
                  : "Try adjusting your filters to see more results."
                }
              </p>
            </div>
          ) : (
            sortedTasks.map((task) => {
              const status = getCalculatedStatus(task);
              return (
                <div key={task.id} className={`p-4 rounded-lg border ${getTaskCardColor(task)}`}>
                  {/* Header with Status Badge */}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex-1 pr-2">
                      {task.Task}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(status)}`}>
                      {status}
                    </span>
                  </div>
                  
                  {/* Project and Responsible Party */}
                  <div className="space-y-2 mb-3">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Project:</span> {task.Project || 'No project'}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Responsible:</span> {getNameFromEmail(task.ResponsibleParty)}
                    </div>
                  </div>
                  
                  {/* Deadline */}
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <span className="font-medium">Deadline:</span> {new Date(task.Deadline).toLocaleDateString()}
                  </div>
                  
                  {/* Days Until Due / Overdue */}
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">
                    {getDaysUntilDue(task)}
                  </div>
                  
                  {/* Recurring Info */}
                  {task.Recurring === 'Yes' && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <span className="font-medium">Recurring:</span> Every {task.Interval} month(s)
                      {task['Final Date'] && (
                        <span> until {new Date(task['Final Date']).toLocaleDateString()}</span>
                      )}
                    </div>
                  )}
                  
                  {/* Notes */}
                  {task.Notes && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <span className="font-medium">Notes:</span> {task.Notes}
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button className="px-2 py-1 text-xs bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800 rounded transition-colors">
                      Toggle Complete
                    </button>
                    <button className="px-2 py-1 text-xs bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:hover:bg-orange-800 rounded transition-colors">
                      Toggle Urgent
                    </button>
                    <button className="px-2 py-1 text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 rounded transition-colors">
                      Add Note
                    </button>
                    {task.Link ? (
                      <a
                        href={task.Link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 text-xs bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:hover:bg-purple-800 rounded transition-colors"
                      >
                        View Doc
                      </a>
                    ) : (
                      <button className="px-2 py-1 text-xs bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:hover:bg-purple-800 rounded transition-colors">
                        Add Link
                      </button>
                    )}
                    <button className="px-2 py-1 text-xs bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded transition-colors">
                      Edit
                    </button>
                    <button className="px-2 py-1 text-xs bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800 rounded transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Deadlines;
