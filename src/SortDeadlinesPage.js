import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  FunnelIcon, 
  MagnifyingGlassIcon,
  PlusIcon,
  MinusIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { taskManager } from './services/taskManager';
import TaskCard from './TaskCard';
import NoteModal from './components/NoteModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import {
  getTaskDeadline,
  parseDeadlineDate,
  filterDeadlineTasks,
  getTaskStatus,
  getTaskDepartments,
  getResponsiblePartyNames,
  taskBelongsToUserDepartments
} from './utils/taskHelpers';
import { useAuth } from './Auth';
import { useTasks } from './hooks/useTasks';
import { useUsers } from './hooks/useUsers';

// Static Tailwind class maps (P7): dynamic `bg-${color}-100` strings are
// purged by the JIT compiler, so the classes must appear literally.
const FILTER_BADGE_CLASSES = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
};

const FILTER_ACTIVE_GRADIENTS = {
  blue: 'from-blue-500 to-blue-600',
  red: 'from-red-500 to-red-600',
  green: 'from-green-500 to-green-600',
  orange: 'from-orange-500 to-orange-600',
  gray: 'from-gray-500 to-gray-600'
};

const EMPTY_FILTER = {
  deadlineYear: '',
  deadlineMonth: '',
  deadlineDay: '',
  responsibleParty: '',
  department: [],
  project: '',
  search: ''
};

const MONTH_MAPPINGS = {
  'jan': ['jan', 'january', '1', '01'],
  'feb': ['feb', 'february', '2', '02'],
  'mar': ['mar', 'march', '3', '03'],
  'apr': ['apr', 'april', '4', '04'],
  'may': ['may', '5', '05'],
  'jun': ['jun', 'june', '6', '06'],
  'jul': ['jul', 'july', '7', '07'],
  'aug': ['aug', 'august', '8', '08'],
  'sep': ['sep', 'september', '9', '09'],
  'oct': ['oct', 'october', '10'],
  'nov': ['nov', 'november', '11'],
  'dec': ['dec', 'december', '12']
};

function SortDeadlinesPage() {
  const { tasks: allTasks, isLoading: loading } = useTasks();
  const { users } = useUsers();
  // Only show actual deadline instances (no recurring templates)
  const tasks = useMemo(() => filterDeadlineTasks(allTasks), [allTasks]);
  const [activeFilter, setActiveFilter] = useState('active');
  const [sortBars, setSortBars] = useState([{ id: 1, sortBy: 'deadline', sortOrder: 'asc' }]);
  // Filters array - one filter object per sort bar
  const [filters, setFilters] = useState([{ ...EMPTY_FILTER }]);
  const [departmentFilterEnabled, setDepartmentFilterEnabled] = useState(false);
  
  // Modal states
  const [noteModal, setNoteModal] = useState({ isOpen: false, task: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, taskId: null, taskName: null });
  
  const { userProfile } = useAuth();

  // Handlers for multiple sort bars
  const addSortBar = () => {
    if (sortBars.length < 4) {
      const newId = Math.max(...sortBars.map(b => b.id || 0), 0) + 1;
      setSortBars([...sortBars, { id: newId, sortBy: 'deadline', sortOrder: 'asc' }]);
      setFilters([...filters, { ...EMPTY_FILTER }]);
    }
  };

  const removeSortBar = (index) => {
    if (sortBars.length > 1 && index > 0) {
      setSortBars(sortBars.filter((_, i) => i !== index));
      setFilters(filters.filter((_, i) => i !== index));
    }
  };

  const updateSortBar = (index, field, value) => {
    const newSortBars = [...sortBars];
    newSortBars[index] = { ...newSortBars[index], [field]: value };
    setSortBars(newSortBars);
    // Clear filter when sort bar type changes
    if (field === 'sortBy') {
      const newFilters = [...filters];
      newFilters[index] = { ...EMPTY_FILTER };
      setFilters(newFilters);
    }
  };

  // Update filter for a specific sort bar
  const updateFilter = (index, field, value) => {
    const newFilters = [...filters];
    if (field === 'department') {
      // Handle department array toggle
      const currentDepts = newFilters[index].department || [];
      if (Array.isArray(value)) {
        newFilters[index] = { ...newFilters[index], department: value };
      } else {
        // Toggle department
        const deptIndex = currentDepts.indexOf(value);
        if (deptIndex >= 0) {
          newFilters[index] = { ...newFilters[index], department: currentDepts.filter(d => d !== value) };
        } else {
          newFilters[index] = { ...newFilters[index], department: [...currentDepts, value] };
        }
      }
    } else {
      newFilters[index] = { ...newFilters[index], [field]: value };
    }
    setFilters(newFilters);
  };

  // Action handlers for TaskCard - surface failures to the user (C10)
  const handleToggleComplete = useCallback(async (taskId, currentStatus) => {
    try {
      await taskManager.updateTask(taskId, { completed: !currentStatus });
    } catch (error) {
      console.error('SortDeadlines: Error toggling completion:', error);
      alert(`Failed to update task: ${error.message}`);
    }
  }, []);

  const handleToggleUrgent = useCallback(async (taskId, currentUrgency) => {
    try {
      await taskManager.updateTask(taskId, { priority: currentUrgency ? 'Normal' : 'Urgent' });
    } catch (error) {
      console.error('SortDeadlines: Error toggling urgency:', error);
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
      console.error('SortDeadlines: Error saving note:', error);
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
      console.error('SortDeadlines: Error deleting task:', error);
      alert(`Failed to delete task: ${error.message}`);
    } finally {
      setDeleteModal({ isOpen: false, taskId: null, taskName: null });
    }
  }, [deleteModal]);

  // Load department filter setting
  useEffect(() => {
    try {
      const saved = localStorage.getItem('departmentFilterEnabled');
      setDepartmentFilterEnabled(saved === 'true');
    } catch (err) {
      console.error('SortDeadlines: Error loading department filter setting:', err);
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

  // Stable responsible-party name resolver, memoized on users (P5, A2)
  const resolveResponsiblePartyNames = useCallback(
    (responsibleParty) => getResponsiblePartyNames(responsibleParty, users),
    [users]
  );

  // Helper function to check if a task matches a specific filter
  const taskMatchesFilter = useCallback((task, filter, sortBy) => {
    if (!filter) return true;
    
    switch (sortBy) {
      case 'deadline': {
        const deadline = getTaskDeadline(task);
        if (!deadline) return !filter.deadlineYear && !filter.deadlineMonth && !filter.deadlineDay;
        
        const date = parseDeadlineDate(deadline);
        if (!date) return false;

        // If no filters are set, show all
        if (!filter.deadlineYear && !filter.deadlineMonth && !filter.deadlineDay) return true;
        
        // Check year
        if (filter.deadlineYear) {
          const year = date.getFullYear().toString();
          if (!year.includes(filter.deadlineYear) && !filter.deadlineYear.includes(year)) {
            return false;
          }
        }

        // Check month
        if (filter.deadlineMonth) {
          const monthSearch = filter.deadlineMonth.toLowerCase().trim();
          const monthName = format(date, 'MMM').toLowerCase();
          const monthNumber = (date.getMonth() + 1).toString();
          const monthNumberPadded = monthNumber.padStart(2, '0');

          const currentMonthAliases = MONTH_MAPPINGS[monthName] || [];
          const matchesMonth = currentMonthAliases.some(alias => alias === monthSearch) ||
                              monthSearch === monthName ||
                              monthSearch === monthNumber ||
                              monthSearch === monthNumberPadded;

          if (!matchesMonth) {
            return false;
          }
        }

        // Check day
        if (filter.deadlineDay) {
          const day = date.getDate().toString();
          const dayPadded = day.padStart(2, '0');
          if (day !== filter.deadlineDay && dayPadded !== filter.deadlineDay) {
            return false;
          }
        }
        
        return true;
      }
      
      case 'responsibleParty': {
        if (!filter.responsibleParty) return true;
        const filterLower = filter.responsibleParty.toLowerCase();
        const responsibleNames = resolveResponsiblePartyNames(task.ResponsibleParty || task.responsibleParty).toLowerCase();
        return responsibleNames.includes(filterLower);
      }
      
      case 'department': {
        if (!filter.department || filter.department.length === 0) return true;
        const taskDepartments = getTaskDepartments(task, users);
        // Task must belong to at least one selected department
        return filter.department.some(dept => taskDepartments.has(dept));
      }
      
      case 'project': {
        if (!filter.project) return true;
        const filterLower = filter.project.toLowerCase();
        const proj = (task.Project || task.project || '').toLowerCase();
        return proj.includes(filterLower);
      }
      
      case 'search': {
        if (!filter.search) return true;
        const filterLower = filter.search.toLowerCase();
        const taskName = (task.Task || task.title || task.task || '').toLowerCase();
        const project = (task.Project || task.project || '').toLowerCase();
        const responsiblePartyNames = resolveResponsiblePartyNames(task.ResponsibleParty || task.responsibleParty).toLowerCase();
        const notes = (task.Notes || task.note || '').toLowerCase();
        
        return taskName.includes(filterLower) || 
               project.includes(filterLower) || 
               responsiblePartyNames.includes(filterLower) || 
               notes.includes(filterLower);
      }
      
      default:
        return true;
    }
  }, [users, resolveResponsiblePartyNames]);

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    // First apply department filter if enabled (departments come from the
    // authenticated profile, not localStorage - S4)
    let preFiltered = tasks;
    if (departmentFilterEnabled) {
      const userDepartments = userProfile?.departments || [];
      if (userDepartments.length > 0) {
        preFiltered = tasks.filter(task => 
          taskBelongsToUserDepartments(task, userDepartments, users)
        );
      }
    }
    
    const filtered = preFiltered.filter(task => {
      const status = getTaskStatus(task);
      const priority = (task.Priority || task.priority || '').toLowerCase();
      const isUrgent = priority === 'urgent';
      const isActiveStatus = status === 'Active' || status === 'Due Soon';

      if (activeFilter === 'active' && !isActiveStatus) return false;
      if (activeFilter === 'overdue' && status !== 'Overdue') return false;
      if (activeFilter === 'complete' && status !== 'Completed') return false;
      if (activeFilter === 'urgent' && !(isUrgent && isActiveStatus)) return false;

      // Apply cascading filters - each filter applies to results of previous filters
      for (let i = 0; i < sortBars.length; i++) {
        const sortBar = sortBars[i];
        const filter = filters[i] || {};
        
        if (!taskMatchesFilter(task, filter, sortBar.sortBy)) {
          return false;
        }
      }

      return true;
    });

    // Helper function to get sort value for a task
    const getSortValue = (task, sortBy) => {
      switch (sortBy) {
        case 'project':
          return (task.Project || task.project || '').toLowerCase();
        case 'deadline':
        case 'responsibleParty':
        case 'department':
        case 'search':
        case 'task':
        default:
          // For all non-project sorts, default to chronological (deadline) sorting
          return parseDeadlineDate(getTaskDeadline(task)) || new Date(0);
      }
    };

    // Multi-level sorting: apply each sort bar in order
    filtered.sort((a, b) => {
      for (const sortBar of sortBars) {
        const aValue = getSortValue(a, sortBar.sortBy);
        const bValue = getSortValue(b, sortBar.sortBy);
        
        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;
        
        // Apply sort order
        if (comparison !== 0) {
          return sortBar.sortOrder === 'asc' ? comparison : -comparison;
        }
        // If equal, continue to next sort level
      }
      return 0; // All levels equal
    });

    return filtered;
  }, [tasks, activeFilter, sortBars, filters, users, departmentFilterEnabled, userProfile, taskMatchesFilter]);

  // Filter-count badges (P5: memoized instead of recomputed 5x per render)
  const filterOptions = useMemo(() => {
    let active = 0, overdue = 0, complete = 0, urgent = 0;
    tasks.forEach(task => {
      const status = getTaskStatus(task);
      const isActiveStatus = status === 'Active' || status === 'Due Soon';
      if (isActiveStatus) {
        active++;
        const priority = (task.Priority || task.priority || '').toLowerCase();
        if (priority === 'urgent') urgent++;
      } else if (status === 'Overdue') {
        overdue++;
      } else if (status === 'Completed') {
        complete++;
      }
    });

    return [
      { key: 'active', label: 'Active', count: active, color: 'blue' },
      { key: 'overdue', label: 'Overdue', count: overdue, color: 'red' },
      { key: 'complete', label: 'Complete', count: complete, color: 'green' },
      { key: 'urgent', label: 'Urgent', count: urgent, color: 'orange' },
      { key: 'all', label: 'All', count: tasks.length, color: 'gray' }
    ];
  }, [tasks]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 dark:from-white dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent">
              Sort Deadlines
            </h1>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {filteredAndSortedTasks.length} of {tasks.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Tasks
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Filter Tasks Island */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 dark:border-gray-700/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <FunnelIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Filter Tasks
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {filterOptions.map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`group relative px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    activeFilter === filter.key
                      ? `bg-gradient-to-r ${FILTER_ACTIVE_GRADIENTS[filter.color]} text-white shadow-md`
                      : 'bg-white/60 dark:bg-gray-700/60 hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-sm'
                  }`}
                >
                  <span className="relative z-10">{filter.label}</span>
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeFilter === filter.key 
                      ? 'bg-white/20 text-white' 
                      : FILTER_BADGE_CLASSES[filter.color]
                  }`}>
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sort & Filter Island - Multiple Sort Bars */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 dark:border-gray-700/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Sort & Filter
              </h3>
            </div>
            <div className="space-y-2">
              {sortBars.map((sortBar, index) => (
                <div key={sortBar.id || index} className="flex gap-2 items-center">
                  <select
                    value={sortBar.sortBy}
                    onChange={(e) => updateSortBar(index, 'sortBy', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border-0 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm text-gray-900 dark:text-gray-100 text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200"
                  >
                    <option value="deadline">Deadline</option>
                    <option value="project">Project</option>
                    <option value="responsibleParty">Responsible Party</option>
                    <option value="department">Department</option>
                    <option value="search">Search</option>
                  </select>
                  <select
                    value={sortBar.sortOrder}
                    onChange={(e) => updateSortBar(index, 'sortOrder', e.target.value)}
                    className="px-3 py-2 rounded-lg border-0 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm text-gray-900 dark:text-gray-100 text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200"
                  >
                    <option value="asc">↑</option>
                    <option value="desc">↓</option>
                  </select>
                  {index > 0 && (
                    <button
                      onClick={() => removeSortBar(index)}
                      className="px-2 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all duration-200"
                      title="Remove sort"
                    >
                      <MinusIcon className="w-4 h-4" />
                    </button>
                  )}
                  {index === sortBars.length - 1 && sortBars.length < 4 && (
                    <button
                      onClick={addSortBar}
                      className="px-2 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all duration-200"
                      title="Add another sort"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cascading Filters - One filter bar per sort bar */}
        <div className="space-y-3">
          {sortBars.map((sortBar, index) => {
            const filter = filters[index] || {};
            const sortBy = sortBar.sortBy;
            const hasFilterValue = sortBy === 'deadline' 
              ? (filter.deadlineYear || filter.deadlineMonth || filter.deadlineDay)
              : sortBy === 'department'
              ? (filter.department && filter.department.length > 0)
              : sortBy === 'search'
              ? filter.search
              : sortBy === 'responsibleParty'
              ? filter.responsibleParty
              : sortBy === 'project'
              ? filter.project
              : false;

            if (sortBy !== 'deadline' && sortBy !== 'responsibleParty' && sortBy !== 'project' && sortBy !== 'department' && sortBy !== 'search') {
              return null;
            }

            return (
              <div key={`filter-${sortBar.id || index}`} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 dark:border-gray-700/50 p-4 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <MagnifyingGlassIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {sortBy === 'search' ? 'Search:' : `Filter by ${sortBy === 'deadline' ? 'Deadline' : sortBy === 'responsibleParty' ? 'Responsible Party' : sortBy === 'department' ? 'Department' : 'Project'}:`}
                    </div>
                  </div>
                  <div className="flex-1 max-w-md">
                    {sortBy === 'deadline' ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Year (e.g., 2025)"
                          value={filter.deadlineYear || ''}
                          onChange={(e) => updateFilter(index, 'deadlineYear', e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border-0 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm text-gray-900 dark:text-gray-100 text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200 placeholder-gray-500 dark:placeholder-gray-400"
                        />
                        <input
                          type="text"
                          placeholder="Month (e.g., Oct, 10, October)"
                          value={filter.deadlineMonth || ''}
                          onChange={(e) => updateFilter(index, 'deadlineMonth', e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border-0 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm text-gray-900 dark:text-gray-100 text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200 placeholder-gray-500 dark:placeholder-gray-400"
                        />
                        <input
                          type="text"
                          placeholder="Day (e.g., 3, 03)"
                          value={filter.deadlineDay || ''}
                          onChange={(e) => updateFilter(index, 'deadlineDay', e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border-0 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm text-gray-900 dark:text-gray-100 text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200 placeholder-gray-500 dark:placeholder-gray-400"
                        />
                      </div>
                    ) : sortBy === 'department' ? (
                      <div className="flex gap-2 flex-nowrap flex-shrink-0">
                        {[
                          { value: 'development', label: 'Development' },
                          { value: 'accounting', label: 'Accounting' },
                          { value: 'compliance', label: 'Compliance' },
                          { value: 'management', label: 'Management' }
                        ].map(dept => (
                          <button
                            key={dept.value}
                            onClick={() => updateFilter(index, 'department', dept.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                              (filter.department || []).includes(dept.value)
                                ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                                : 'bg-white/60 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 shadow-sm'
                            }`}
                          >
                            {dept.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          placeholder={
                            sortBy === 'search'
                              ? 'Search tasks, projects, responsible parties, or notes...'
                              : sortBy === 'responsibleParty' 
                                ? 'e.g., "John", "Smith", "john@company.com"'
                                : 'e.g., "Project Alpha", "Development"'
                          }
                          value={filter[sortBy] || ''}
                          onChange={(e) => updateFilter(index, sortBy, e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border-0 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm text-gray-900 dark:text-gray-100 text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200 placeholder-gray-500 dark:placeholder-gray-400"
                        />
                      </div>
                    )}
                  </div>
                  {hasFilterValue && (
                    <button
                      onClick={() => {
                        if (sortBy === 'deadline') {
                          updateFilter(index, 'deadlineYear', '');
                          updateFilter(index, 'deadlineMonth', '');
                          updateFilter(index, 'deadlineDay', '');
                        } else if (sortBy === 'department') {
                          updateFilter(index, 'department', []);
                        } else {
                          updateFilter(index, sortBy, '');
                        }
                      }}
                      className={`px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 ${sortBy === 'department' ? 'ml-6' : ''}`}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Results */}
        <div className="space-y-4">
          {filteredAndSortedTasks.length > 0 ? (
            filteredAndSortedTasks.map((task, index) => {
                // Add daysUntil calculation for TaskCard
                const deadline = parseDeadlineDate(getTaskDeadline(task));
                const today = new Date();
                // Normalize both dates to start of day for accurate calculation
                const deadlineStartOfDay = deadline ? new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate()) : null;
                const todayStartOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const daysUntil = deadlineStartOfDay ? Math.floor((deadlineStartOfDay - todayStartOfDay) / (1000 * 60 * 60 * 24)) : null;
                
                return (
                <TaskCard
                  key={task.id}
                  task={{
                    ...task,
                    daysUntil: daysUntil
                  }}
                  className="backdrop-blur-sm hover:scale-[1.02] hover:shadow-lg"
                  style={{ animationDelay: `${index * 30}ms` }}
                  users={users}
                  onToggleComplete={handleToggleComplete}
                  onToggleUrgent={handleToggleUrgent}
                  onNoteClick={handleNoteClick}
                  onDeleteClick={handleDeleteClick}
                />
                );
              })
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center">
                <FunnelIcon className="w-8 h-8 text-gray-500 dark:text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No tasks found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your filters to see more results</p>
            </div>
          )}
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

export default SortDeadlinesPage;
