import React, { useState, useMemo, useEffect } from 'react';
import { 
  FunnelIcon, 
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  UserIcon,
  FolderIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { format, parseISO, isValid } from 'date-fns';
import { globalTaskStore } from './globalTaskStore';
import { microsoftDataService } from './microsoftDataService';
import TaskCard from './TaskCard';
import taskService from './taskService';
// Removed taskUpdateService - using taskService instead

function SortDeadlinesPage() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeFilter, setActiveFilter] = useState('active');
  const [sortBy, setSortBy] = useState('deadline');
  const [sortOrder, setSortOrder] = useState('asc');
  const [secondaryFilter, setSecondaryFilter] = useState('');
  const [deadlineYear, setDeadlineYear] = useState('');
  const [deadlineMonth, setDeadlineMonth] = useState('');
  const [deadlineDay, setDeadlineDay] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState([]);

  // Toggle task completion - uses simple SharePoint service
  const toggleTaskCompletion = async (taskId, currentStatus, shouldUpdateAll = false) => {
    const newStatus = !currentStatus;
    
    try {
      setUpdating(true);
      
      if (shouldUpdateAll) {
        // Find all related tasks (same Task name and Project)
        const currentTask = tasks.find(t => t.id === taskId);
        if (currentTask) {
          const relatedTasks = tasks.filter(t => 
            t.Task === currentTask.Task && 
            t.Project === currentTask.Project
          );
          
          // Update all related tasks
          for (const task of relatedTasks) {
            await taskService.updateTaskField(task.id, 'Completed_x003f_', newStatus);
          }
          
          console.log('SortDeadlines: Updated completion for', relatedTasks.length, 'related tasks');
        }
      } else {
        // Update only this task
        await taskService.updateTaskField(taskId, 'Completed_x003f_', newStatus);
      }
      
      // Update global store
      const allTasks = await taskService.getAllTasks();
      globalTaskStore.setAllTasks(allTasks);
      
      console.log('SortDeadlines: Task completion updated successfully');
    } catch (error) {
      console.error('SortDeadlines: Error updating task completion:', error);
    } finally {
      setUpdating(false);
    }
  };

  // Toggle task urgency - uses task service
  const toggleTaskUrgency = async (taskId, currentUrgency, shouldUpdateAll = false) => {
    const newUrgency = !currentUrgency;
    
    try {
      setUpdating(true);
      
      if (shouldUpdateAll) {
        // Find all related tasks (same Task name and Project)
        const currentTask = tasks.find(t => t.id === taskId);
        if (currentTask) {
          const relatedTasks = tasks.filter(t => 
            t.Task === currentTask.Task && 
            t.Project === currentTask.Project
          );
          
          // Update all related tasks
          for (const task of relatedTasks) {
            await taskService.updateTaskField(task.id, 'Priority', newUrgency);
          }
          
          console.log('SortDeadlines: Updated urgency for', relatedTasks.length, 'related tasks');
        }
      } else {
        // Update only this task
        await taskService.updateTaskField(taskId, 'Priority', newUrgency);
      }
      
      // Update global store
      const allTasks = await taskService.getAllTasks();
      globalTaskStore.setAllTasks(allTasks);
      
      console.log('SortDeadlines: Task urgency updated successfully');
    } catch (error) {
      console.error('SortDeadlines: Error updating task urgency:', error);
    } finally {
      setUpdating(false);
    }
  };

  // Delete task - uses task service
  const deleteTask = async (taskId) => {
    try {
      setUpdating(true);
      await taskService.deleteTask(taskId);
      
      // Update global store
      const allTasks = await taskService.getAllTasks();
      globalTaskStore.setAllTasks(allTasks);
      setTasks(allTasks);
      
      console.log('SortDeadlines: Task deleted successfully');
    } catch (error) {
      console.error('SortDeadlines: Error deleting task:', error);
    } finally {
      setUpdating(false);
    }
  };

  // Load tasks, instances, and users
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Subscribe to global task store updates
        const unsubscribe = globalTaskStore.subscribe(() => {
          const allTasks = globalTaskStore.getAllTasks();
          setTasks(allTasks);
          console.log('SortDeadlines: Updated from global store -', allTasks.length, 'total items');
        });
        
        // Get initial data
        const [allTasks, usersData] = await Promise.all([
          taskService.getAllTasks(),
          microsoftDataService.users.getEnterpriseUsers()
        ]);
        
        // Load local assignments from localStorage and merge with users (same as Dashboard)
        const USER_ASSIGNMENTS_KEY = 'user_assignments';
        const localAssignments = JSON.parse(localStorage.getItem(USER_ASSIGNMENTS_KEY) || '{}');
        
        // Merge enterprise users with local assignments
        const usersWithAssignments = usersData.map(user => ({
          ...user,
          departments: localAssignments[user.id]?.departments || [],
          role: localAssignments[user.id]?.role || 'VIEWER'
        }));
        
        setTasks(allTasks);
        setUsers(usersWithAssignments);
        console.log('SortDeadlines: Loaded', allTasks.length, 'total items and', usersWithAssignments.length, 'users with assignments');
        console.log('SortDeadlines: Users with departments:', usersWithAssignments.map(u => ({
          id: u.id,
          email: u.email || u.mail || u.userPrincipalName,
          displayName: u.displayName || u.DisplayName,
          departments: u.departments,
          role: u.role
        })));
        
        return unsubscribe;
      } catch (error) {
        console.error('SortDeadlines: Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Parse deadline date helper
  const parseDeadlineDate = (dateStr) => {
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
      const parsed = parseISO(dateStr);
      if (isValid(parsed)) {
        parsed.setHours(12, 0, 0, 0);
        return parsed;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  // Helper function for flexible deadline search
  const matchesDeadlineSearch = (deadline, searchTerm) => {
    if (!deadline || !searchTerm) return true;
    
    const search = searchTerm.toLowerCase().trim();
    const date = parseDeadlineDate(deadline);
    if (!date) return false;

    // Month mappings for flexible search
    const monthMappings = {
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

    // Check month
    const monthName = format(date, 'MMM').toLowerCase();
    if (monthMappings[monthName]?.some(alias => search.includes(alias))) {
      return true;
    }

    // Check year
    const year = date.getFullYear().toString();
    if (search.includes(year) || search.includes(year.slice(-2))) {
      return true;
    }

    // Check day
    const day = date.getDate().toString();
    if (search.includes(day) || search.includes(day.padStart(2, '0'))) {
      return true;
    }

    // Check full date formats
    const fullDate = format(date, 'yyyy-MM-dd');
    const shortDate = format(date, 'MM/dd/yyyy');
    const monthDay = format(date, 'MMM dd');
    const monthDayYear = format(date, 'MMM dd, yyyy');

    return search.includes(fullDate) || 
           search.includes(shortDate) || 
           search.includes(monthDay.toLowerCase()) ||
           search.includes(monthDayYear.toLowerCase());
  };

  // Helper function for separate deadline search fields
  const matchesSeparateDeadlineSearch = (deadline) => {
    if (!deadline) return true;
    
    const date = parseDeadlineDate(deadline);
    if (!date) return false;

    // If no filters are set, show all
    if (!deadlineYear && !deadlineMonth && !deadlineDay) return true;

    // Check year
    if (deadlineYear) {
      const year = date.getFullYear().toString();
      if (!year.includes(deadlineYear) && !deadlineYear.includes(year)) {
        return false;
      }
    }

    // Check month (support abbreviated, full, and numeric)
    if (deadlineMonth) {
      const monthSearch = deadlineMonth.toLowerCase().trim();
      const monthName = format(date, 'MMM').toLowerCase();
      const monthNumber = (date.getMonth() + 1).toString();
      const monthNumberPadded = monthNumber.padStart(2, '0');
      
      const monthMappings = {
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

      const currentMonthAliases = monthMappings[monthName] || [];
      const matchesMonth = currentMonthAliases.some(alias => alias === monthSearch) ||
                          monthSearch === monthName ||
                          monthSearch === monthNumber ||
                          monthSearch === monthNumberPadded;

      if (!matchesMonth) {
        return false;
      }
    }

    // Check day
    if (deadlineDay) {
      const day = date.getDate().toString();
      const dayPadded = day.padStart(2, '0');
      if (day !== deadlineDay && dayPadded !== deadlineDay) {
        return false;
      }
    }

    return true;
  };

  // Get calculated status
  const getCalculatedStatus = (task) => {
    if (task.Completed_x003f_ === true || task.Completed_x003f_ === 'Yes' || task.Completed_x003f_ === 'yes' ||
        task.Completed === true || task.Completed === 'Yes' || task.Completed === 'yes') {
      return 'Completed';
    }

    const deadline = parseDeadlineDate(task.Deadline);
    if (deadline && deadline < new Date()) {
      return 'Overdue';
    }

    return 'Active';
  };

  // Convert responsible party emails to display names
  const getResponsiblePartyNames = (responsibleParty) => {
    if (!responsibleParty || !users || users.length === 0) {
      return String(responsibleParty || 'Unassigned');
    }

    // Handle if responsibleParty is an array or object
    if (typeof responsibleParty !== 'string') {
      if (Array.isArray(responsibleParty)) {
        return responsibleParty.map(rp => {
          if (typeof rp === 'object' && rp.LookupValue) {
            return rp.LookupValue;
          }
          return String(rp);
        }).join(', ');
      } else if (typeof responsibleParty === 'object' && responsibleParty.LookupValue) {
        return responsibleParty.LookupValue;
      }
      return String(responsibleParty);
    }

    const emails = responsibleParty.split(';').map(email => email.trim());
    const names = emails.map(email => {
      const user = users.find(u => 
        u.mail === email || 
        u.userPrincipalName === email || 
        u.email === email || 
        u.Email === email
      );
      return user ? user.displayName : email;
    });

    return names.join(', ');
  };

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      // Status filter
      const status = getCalculatedStatus(task);
      if (activeFilter === 'active' && status !== 'Active') return false;
      if (activeFilter === 'overdue' && status !== 'Overdue') return false;
      if (activeFilter === 'complete' && status !== 'Completed') return false;
      if (activeFilter === 'urgent' && task.Priority !== 'Urgent') return false;

      // Secondary filter based on sort type
      if (sortBy === 'deadline') {
        // Always check deadline filters when deadline sorting is selected
        if (!matchesSeparateDeadlineSearch(task.Deadline)) return false;
      } else if (sortBy === 'department') {
        // Department filter with multi-select - use same logic as Dashboard
        if (selectedDepartments.length > 0) {
          const responsibleParty = task.ResponsibleParty || task.responsibleParty || '';
          
          console.log('SortDeadlines: Filtering task by department:', {
            taskId: task.id,
            taskName: task.Task,
            responsibleParty: responsibleParty,
            selectedDepartments: selectedDepartments,
            usersCount: users.length
          });
          
          // Find all users assigned to this task (same as Dashboard logic)
          const assignedUsers = users.filter(user => {
            const userEmail = user.email || user.Email || user.mail || user.userPrincipalName || '';
            const userDisplayName = user.displayName || user.DisplayName || '';
            
            // Only match if responsible party is not empty and contains the user's email or display name
            const matches = responsibleParty && responsibleParty.trim() !== '' && 
                   (responsibleParty.includes(userEmail) || responsibleParty.includes(userDisplayName));
            
            if (matches) {
              console.log('SortDeadlines: Found matching user for task:', {
                taskId: task.id,
                userId: user.id,
                userEmail: userEmail,
                userDisplayName: userDisplayName,
                userDepartments: user.departments
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
          
          console.log('SortDeadlines: Task department analysis:', {
            taskId: task.id,
            taskName: task.Task,
            assignedUsersCount: assignedUsers.length,
            taskDepartments: Array.from(taskDepartments),
            selectedDepartments: selectedDepartments
          });
          
          // Task must belong to at least one selected department
          const matchesDepartment = selectedDepartments.some(dept => taskDepartments.has(dept));
          
          console.log('SortDeadlines: Department match result:', {
            taskId: task.id,
            matchesDepartment: matchesDepartment
          });
          
          if (!matchesDepartment) return false;
        }
      } else if (secondaryFilter) {
        const filterLower = secondaryFilter.toLowerCase();
        switch (sortBy) {
          case 'search':
            const taskName = (task.Task || '').toLowerCase();
            const project = (task.Project || '').toLowerCase();
            const responsiblePartyNames = getResponsiblePartyNames(task.ResponsibleParty).toLowerCase();
            const notes = (task.Notes || '').toLowerCase();
            
            if (!taskName.includes(filterLower) && 
                !project.includes(filterLower) && 
                !responsiblePartyNames.includes(filterLower) && 
                !notes.includes(filterLower)) {
              return false;
            }
            break;
          case 'responsibleParty':
            const responsibleNames = getResponsiblePartyNames(task.ResponsibleParty).toLowerCase();
            if (!responsibleNames.includes(filterLower)) return false;
            break;
          case 'project':
            const proj = (task.Project || '').toLowerCase();
            if (!proj.includes(filterLower)) return false;
            break;
        }
      }

      return true;
    });

    // Sort tasks
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'deadline':
          aValue = parseDeadlineDate(a.Deadline) || new Date(0);
          bValue = parseDeadlineDate(b.Deadline) || new Date(0);
          break;
        case 'project':
          aValue = (a.Project || '').toLowerCase();
          bValue = (b.Project || '').toLowerCase();
          break;
        case 'responsibleParty':
        case 'department':
        case 'search':
        case 'task':
        default:
          // For all non-project sorts, default to chronological (deadline) sorting
          aValue = parseDeadlineDate(a.Deadline) || new Date(0);
          bValue = parseDeadlineDate(b.Deadline) || new Date(0);
          break;
      }

      if (sortBy === 'deadline' || (sortBy !== 'project')) {
        // Use chronological sorting for deadline and all non-project sorts
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      } else {
        // Use alphabetical sorting only for project
        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      }
    });

    return filtered;
  }, [tasks, activeFilter, sortBy, sortOrder, secondaryFilter, deadlineYear, deadlineMonth, deadlineDay, selectedDepartments, users]);

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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'Overdue':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'Active':
        return <ClockIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'Overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'Active':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-blue-950/30 dark:to-indigo-950/20 relative">
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
              {[
                { key: 'active', label: 'Active', count: tasks.filter(t => getCalculatedStatus(t) === 'Active').length, color: 'blue' },
                { key: 'overdue', label: 'Overdue', count: tasks.filter(t => getCalculatedStatus(t) === 'Overdue').length, color: 'red' },
                { key: 'complete', label: 'Complete', count: tasks.filter(t => getCalculatedStatus(t) === 'Completed').length, color: 'green' },
                { key: 'urgent', label: 'Urgent', count: tasks.filter(t => t.Priority === 'Urgent').length, color: 'orange' },
                { key: 'all', label: 'All', count: tasks.length, color: 'gray' }
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`group relative px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    activeFilter === filter.key
                      ? `bg-gradient-to-r ${
                          filter.color === 'blue' ? 'from-blue-500 to-blue-600' :
                          filter.color === 'red' ? 'from-red-500 to-red-600' :
                          filter.color === 'green' ? 'from-green-500 to-green-600' :
                          filter.color === 'orange' ? 'from-orange-500 to-orange-600' :
                          'from-gray-500 to-gray-600'
                        } text-white shadow-md`
                      : 'bg-white/60 dark:bg-gray-700/60 hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-sm'
                  }`}
                >
                  <span className="relative z-10">{filter.label}</span>
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeFilter === filter.key 
                      ? 'bg-white/20 text-white' 
                      : `bg-${filter.color}-100 text-${filter.color}-700 dark:bg-${filter.color}-900/30 dark:text-${filter.color}-300`
                  }`}>
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sort & Filter Island */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 dark:border-gray-700/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Sort & Filter
              </h3>
            </div>
            <div className="flex gap-2 items-center">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setSecondaryFilter(''); // Clear secondary filter when sort type changes
                }}
                className="flex-1 px-3 py-2 rounded-lg border-0 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm text-gray-900 dark:text-gray-100 text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200"
              >
                <option value="deadline">Deadline</option>
                <option value="project">Project</option>
                <option value="responsibleParty">Responsible Party</option>
                <option value="department">Department</option>
                <option value="search">Search</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-3 py-2 rounded-lg border-0 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm text-gray-900 dark:text-gray-100 text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200"
              >
                <option value="asc">↑</option>
                <option value="desc">↓</option>
              </select>
            </div>
          </div>
        </div>

        {/* Secondary Filter */}
        {(sortBy === 'deadline' || sortBy === 'responsibleParty' || sortBy === 'project' || sortBy === 'department' || sortBy === 'search') && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 dark:border-gray-700/50 p-4 animate-in slide-in-from-top-2 duration-300">
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
                      value={deadlineYear}
                      onChange={(e) => setDeadlineYear(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border-0 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm text-gray-900 dark:text-gray-100 text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200 placeholder-gray-500 dark:placeholder-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Month (e.g., Oct, 10, October)"
                      value={deadlineMonth}
                      onChange={(e) => setDeadlineMonth(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border-0 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm text-gray-900 dark:text-gray-100 text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200 placeholder-gray-500 dark:placeholder-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Day (e.g., 3, 03)"
                      value={deadlineDay}
                      onChange={(e) => setDeadlineDay(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border-0 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm text-gray-900 dark:text-gray-100 text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200 placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>
                ) : sortBy === 'department' ? (
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: 'development', label: 'Development' },
                      { value: 'accounting', label: 'Accounting' },
                      { value: 'compliance', label: 'Compliance' },
                      { value: 'management', label: 'Management' }
                    ].map(dept => (
                      <button
                        key={dept.value}
                        onClick={() => {
                          setSelectedDepartments(prev => 
                            prev.includes(dept.value) 
                              ? prev.filter(d => d !== dept.value)
                              : [...prev, dept.value]
                          );
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          selectedDepartments.includes(dept.value)
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
                      value={secondaryFilter}
                      onChange={(e) => setSecondaryFilter(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border-0 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm text-gray-900 dark:text-gray-100 text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200 placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>
                )}
              </div>
              {(sortBy === 'deadline' ? (deadlineYear || deadlineMonth || deadlineDay) : sortBy === 'department' ? selectedDepartments.length > 0 : secondaryFilter) && (
                <button
                  onClick={() => {
                    if (sortBy === 'deadline') {
                      setDeadlineYear('');
                      setDeadlineMonth('');
                      setDeadlineDay('');
                    } else if (sortBy === 'department') {
                      setSelectedDepartments([]);
                    } else {
                      setSecondaryFilter('');
                    }
                  }}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="space-y-4">
          {filteredAndSortedTasks.length > 0 ? (
            filteredAndSortedTasks.map((task, index) => {
                // Add daysUntil calculation for TaskCard
                const deadline = parseDeadlineDate(task.Deadline);
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
                  showCompletion={true}
                  showUrgency={true}
                  showDelete={true}
                  onToggleCompletion={toggleTaskCompletion}
                  onToggleUrgency={toggleTaskUrgency}
                  onDelete={deleteTask}
                  className="backdrop-blur-sm hover:scale-[1.02] hover:shadow-lg"
                  style={{ animationDelay: `${index * 30}ms` }}
                  users={users}
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
    </div>
  );
}

export default SortDeadlinesPage;
