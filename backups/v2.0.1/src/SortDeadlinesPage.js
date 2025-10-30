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
import { sharedDataService } from './sharedDataService';
import { microsoftDataService } from './microsoftDataService';

function SortDeadlinesPage() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('active');
  const [sortBy, setSortBy] = useState('deadline');
  const [sortOrder, setSortOrder] = useState('asc');
  const [secondaryFilter, setSecondaryFilter] = useState('');

  // Load tasks and users
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [tasksData, usersData] = await Promise.all([
          sharedDataService.getAllTasks(),
          microsoftDataService.users.getEnterpriseUsers()
        ]);
        setTasks(tasksData);
        setUsers(usersData);
        console.log('SortDeadlines: Loaded', tasksData.length, 'tasks and', usersData.length, 'users');
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
      // Try parsing as ISO string first
      const isoDate = new Date(dateStr);
      if (isValid(isoDate)) return isoDate;
      
      // Try parsing as yyyy-MM-dd format
      const parsed = parseISO(dateStr);
      if (isValid(parsed)) return parsed;
      
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
      return responsibleParty || 'Unassigned';
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
      if (secondaryFilter) {
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
          case 'deadline':
            if (!matchesDeadlineSearch(task.Deadline, secondaryFilter)) return false;
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
        case 'responsibleParty':
          aValue = (a.ResponsibleParty || '').toLowerCase();
          bValue = (b.ResponsibleParty || '').toLowerCase();
          break;
        case 'project':
          aValue = (a.Project || '').toLowerCase();
          bValue = (b.Project || '').toLowerCase();
          break;
        case 'task':
          aValue = (a.Task || '').toLowerCase();
          bValue = (b.Task || '').toLowerCase();
          break;
        default:
          return 0;
      }

      if (sortBy === 'deadline') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      } else {
        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      }
    });

    return filtered;
  }, [tasks, activeFilter, sortBy, sortOrder, secondaryFilter, users]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-blue-950/30 dark:to-indigo-950/20">
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
        {(sortBy === 'deadline' || sortBy === 'responsibleParty' || sortBy === 'project' || sortBy === 'search') && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 dark:border-gray-700/50 p-4 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <MagnifyingGlassIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {sortBy === 'search' ? 'Search:' : `Filter by ${sortBy === 'deadline' ? 'Deadline' : sortBy === 'responsibleParty' ? 'Responsible Party' : 'Project'}:`}
                </div>
              </div>
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={
                      sortBy === 'search'
                        ? 'Search tasks, projects, responsible parties, or notes...'
                        : sortBy === 'deadline' 
                          ? 'e.g., "Jan 2025", "March", "2025"' 
                          : sortBy === 'responsibleParty' 
                            ? 'e.g., "John", "Smith", "john@company.com"'
                            : 'e.g., "Project Alpha", "Development"'
                    }
                    value={secondaryFilter}
                    onChange={(e) => setSecondaryFilter(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border-0 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm text-gray-900 dark:text-gray-100 text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200 placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>
              {secondaryFilter && (
                <button
                  onClick={() => setSecondaryFilter('')}
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
                const status = getCalculatedStatus(task);
                const deadline = parseDeadlineDate(task.Deadline);
                
                return (
                  <div 
                    key={task.id} 
                    className={`group p-4 rounded-xl backdrop-blur-sm border transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
                      status === 'Active' 
                        ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/30 hover:bg-blue-50/80 dark:hover:bg-blue-950/30' 
                        : status === 'Overdue'
                        ? 'bg-red-50/60 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/30 hover:bg-red-50/80 dark:hover:bg-red-950/30'
                        : status === 'Completed'
                        ? 'bg-green-50/60 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/30 hover:bg-green-50/80 dark:hover:bg-green-950/30'
                        : 'bg-gray-50/60 dark:bg-gray-950/20 border-gray-200/50 dark:border-gray-800/30 hover:bg-gray-50/80 dark:hover:bg-gray-950/30'
                    } ${task.Priority === 'Urgent' ? 'ring-2 ring-orange-200/50 dark:ring-orange-800/30' : ''}`}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(status)}
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-900 dark:group-hover:text-blue-100 transition-colors">
                          {task.Task || 'Untitled Task'}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                          {status}
                        </span>
                        {task.Priority === 'Urgent' && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md">
                            Urgent
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                            <FolderIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">{task.Project || 'No Project'}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-md">
                            <UserIcon className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">{getResponsiblePartyNames(task.ResponsibleParty)}</span>
                        </div>
                      </div>

                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm border ${
                        status === 'Active' 
                          ? 'bg-blue-100/40 dark:bg-blue-900/20 border-blue-200/30 dark:border-blue-800/20' 
                          : status === 'Overdue'
                          ? 'bg-red-100/40 dark:bg-red-900/20 border-red-200/30 dark:border-red-800/20'
                          : status === 'Completed'
                          ? 'bg-green-100/40 dark:bg-green-900/20 border-green-200/30 dark:border-green-800/20'
                          : 'bg-gray-100/40 dark:bg-gray-900/20 border-gray-200/30 dark:border-gray-800/20'
                      }`}>
                        <div className={`p-1 rounded-md ${
                          status === 'Active' 
                            ? 'bg-blue-200/60 dark:bg-blue-800/40' 
                            : status === 'Overdue'
                            ? 'bg-red-200/60 dark:bg-red-800/40'
                            : status === 'Completed'
                            ? 'bg-green-200/60 dark:bg-green-800/40'
                            : 'bg-gray-200/60 dark:bg-gray-800/40'
                        }`}>
                          <CalendarDaysIcon className={`w-3.5 h-3.5 ${
                            status === 'Active' 
                              ? 'text-blue-700 dark:text-blue-300' 
                              : status === 'Overdue'
                              ? 'text-red-700 dark:text-red-300'
                              : status === 'Completed'
                              ? 'text-green-700 dark:text-green-300'
                              : 'text-gray-700 dark:text-gray-300'
                          }`} />
                        </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Due</div>
                            <div className={`text-sm font-bold ${
                              status === 'Active' 
                                ? 'text-blue-900 dark:text-blue-100' 
                                : status === 'Overdue'
                                ? 'text-red-900 dark:text-red-100'
                                : status === 'Completed'
                                ? 'text-green-900 dark:text-green-100'
                                : 'text-gray-900 dark:text-gray-100'
                            }`}>
                              {deadline ? format(deadline, 'MMM dd, yyyy') : 'No date'}
                            </div>
                          </div>
                      </div>
                    </div>

                    {task.Notes && (
                      <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-600/30">
                        <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                          {task.Notes}
                        </p>
                      </div>
                    )}
                  </div>
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
