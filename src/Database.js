import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  CheckIcon, 
  ClockIcon, 
  TrashIcon,
  PlusIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { globalTaskStore } from './globalTaskStore';
import { azureTaskService } from './services/azureTaskService';
import { parseISO, format, isValid } from 'date-fns';

function Database() {
  const [tasks, setTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showUserChoiceDialog, setShowUserChoiceDialog] = useState(null);
  const [bulkActionType, setBulkActionType] = useState(null);
  
  // Sorting and search state
  const [sortField, setSortField] = useState('deadline');
  const [sortDirection, setSortDirection] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('');

  // Subscribe to global task store
  useEffect(() => {
    const unsubscribe = globalTaskStore.subscribe(({ tasks, selectedTasks, isLoading, syncInProgress }) => {
      console.log('Database: Received from globalTaskStore:', {
        tasksCount: tasks.length,
        selectedCount: selectedTasks.length,
        isLoading,
        syncInProgress
      });
      setTasks(tasks);
      setSelectedTasks(selectedTasks);
      setIsLoading(isLoading);
      setSyncInProgress(syncInProgress);
    });

    // Get initial tasks from store
    const initialTasks = globalTaskStore.getAllTasks();
    console.log('Database: Initial tasks from store:', initialTasks.length);
    if (initialTasks.length > 0) {
      setTasks(initialTasks);
    }

    return () => unsubscribe();
  }, []);

  // Auto-remove duplicates when Database page loads
  useEffect(() => {
    let hasAutoCleaned = false;
    
    const autoClean = () => {
      if (!hasAutoCleaned) {
        hasAutoCleaned = true;
        console.log('Database: Auto-cleaning duplicates on page load...');
        const duplicates = globalTaskStore.removeDuplicates();
        if (duplicates.length > 0) {
          console.log('Database: Auto-removed', duplicates.length, 'duplicates');
        }
      }
    };

    // Small delay to ensure tasks are loaded
    const timer = setTimeout(autoClean, 250);
    return () => clearTimeout(timer);
  }, []); // Empty dependency array - only run once on mount

  // Handle task selection
  const handleTaskSelection = useCallback((taskId) => {
    globalTaskStore.toggleTaskSelection(taskId);
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    globalTaskStore.selectAllTasks();
  }, []);

  // Handle clear selections
  const handleClearSelections = useCallback(() => {
    globalTaskStore.clearSelections();
  }, []);

  // Handle individual task updates
  const handleTaskUpdate = useCallback(async (taskId, updates) => {
    // Get the current task to preserve existing data
    const currentTask = globalTaskStore.getAllTasks().find(t => t.id === taskId);
    if (!currentTask) {
      console.error('Database: Task not found:', taskId);
      return;
    }

    // Preserve responsible party and other important fields
    const safeUpdates = {
      ...updates,
      // Preserve responsible party if not explicitly changing it
      responsibleParty: updates.responsibleParty !== undefined ? updates.responsibleParty : currentTask.responsibleParty,
      // Preserve other important fields
      task: updates.task !== undefined ? updates.task : currentTask.task,
      project: updates.project !== undefined ? updates.project : currentTask.project,
      deadline: updates.deadline !== undefined ? updates.deadline : currentTask.deadline
    };

    console.log('Database: Attempting to update task', taskId, 'with updates:', safeUpdates);

    try {
      // Update in global store first for immediate UI feedback
      globalTaskStore.updateTask(taskId, safeUpdates);
      
      // Sync to Azure Functions API
      await azureTaskService.updateTask(taskId, safeUpdates);
      
      console.log('Database: Successfully updated task', taskId, 'with', safeUpdates);
    } catch (error) {
      console.error('Database: ERROR updating task', taskId, ':', error);
      
      // Revert the local change if SharePoint update failed
      console.log('Database: Reverting local changes for task', taskId);
      globalTaskStore.updateTask(taskId, {
        ...safeUpdates,
        // Revert to original values
        completed: currentTask.completed,
        priority: currentTask.priority,
        responsibleParty: currentTask.responsibleParty,
        task: currentTask.task,
        project: currentTask.project,
        deadline: currentTask.deadline
      });
      
      // Show user-friendly error message
      alert(`Failed to save changes to SharePoint: ${error.message || 'Unknown error'}`);
    }
  }, []);

  // Handle bulk operations
  const handleBulkAction = useCallback((actionType) => {
    if (selectedTasks.length === 0) return;
    
    setBulkActionType(actionType);
    setShowUserChoiceDialog(true);
  }, [selectedTasks]);

  // Sorting and filtering logic
  const sortedAndFilteredTasks = useMemo(() => {
    let filtered = [...tasks];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(task => 
        task.task?.toLowerCase().includes(searchLower) ||
        task.project?.toLowerCase().includes(searchLower) ||
        task.responsibleParty?.toLowerCase().includes(searchLower) ||
        task.notes?.toLowerCase().includes(searchLower)
      );
    }

    // Apply project filter
    if (filterProject) {
      filtered = filtered.filter(task => 
        task.project?.toLowerCase() === filterProject.toLowerCase()
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'deadline':
          aValue = new Date(a.deadline || 0);
          bValue = new Date(b.deadline || 0);
          break;
        case 'task':
          aValue = a.task || '';
          bValue = b.task || '';
          break;
        case 'project':
          aValue = a.project || '';
          bValue = b.project || '';
          break;
        case 'responsibleParty':
          aValue = a.responsibleParty || '';
          bValue = b.responsibleParty || '';
          break;
        case 'priority':
          aValue = a.priority || 'Normal';
          bValue = b.priority || 'Normal';
          break;
        case 'completed':
          aValue = a.completed ? 1 : 0;
          bValue = b.completed ? 1 : 0;
          break;
        default:
          aValue = a[sortField] || '';
          bValue = b[sortField] || '';
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [tasks, searchTerm, filterProject, sortField, sortDirection]);

  // Get unique projects for filter dropdown
  const uniqueProjects = useMemo(() => {
    const projects = [...new Set(tasks.map(task => task.project).filter(Boolean))];
    return projects.sort();
  }, [tasks]);

  // Handle sort field change
  const handleSort = useCallback((field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  // Handle user choice for bulk operations
  const handleUserChoice = useCallback(async (choice) => {
    if (!bulkActionType || selectedTasks.length === 0) return;
    
    try {
      globalTaskStore.setSyncProgress(true);
      
      const selectedTaskIds = selectedTasks.map(task => task.id);
      
      if (choice === 'this_instance') {
        // Update only selected tasks
        if (bulkActionType === 'complete') {
          globalTaskStore.updateMultipleTasks(selectedTaskIds, { completed: true });
          // Sync to Azure Functions API
          for (const taskId of selectedTaskIds) {
            await azureTaskService.completeTask(taskId, true);
          }
        } else if (bulkActionType === 'urgent') {
          globalTaskStore.updateMultipleTasks(selectedTaskIds, { priority: 'Urgent' });
          // Sync to Azure Functions API
          for (const taskId of selectedTaskIds) {
            await azureTaskService.updateTask(taskId, { priority: 'Urgent' });
          }
        } else if (bulkActionType === 'delete') {
          globalTaskStore.removeMultipleTasks(selectedTaskIds);
          // Delete from Azure Functions API
          for (const taskId of selectedTaskIds) {
            await azureTaskService.deleteTask(taskId);
          }
        }
      } else if (choice === 'all_instances') {
        // Update parent task and all instances
        const parentTasks = selectedTasks.filter(task => task.isParent);
        const instances = selectedTasks.filter(task => !task.isParent);
        
        // Group instances by parent
        const instancesByParent = {};
        instances.forEach(task => {
          const parentId = task.id.split('_')[0];
          if (!instancesByParent[parentId]) {
            instancesByParent[parentId] = [];
          }
          instancesByParent[parentId].push(task);
        });
        
        // Update parent tasks and all their instances
        for (const parentTask of parentTasks) {
          if (bulkActionType === 'complete') {
            globalTaskStore.updateTask(parentTask.id, { completed: true });
            await azureTaskService.completeTask(parentTask.id, true);
          } else if (bulkActionType === 'urgent') {
            globalTaskStore.updateTask(parentTask.id, { priority: 'Urgent' });
            await azureTaskService.updateTask(parentTask.id, { priority: 'Urgent' });
          }
        }
      }
      
      globalTaskStore.clearSelections();
      setShowBulkActions(false);
      
    } catch (error) {
      console.error('Database: Error in bulk operation:', error);
    } finally {
      globalTaskStore.setSyncProgress(false);
      setShowUserChoiceDialog(null);
      setBulkActionType(null);
    }
  }, [bulkActionType, selectedTasks]);

  // Handle sync - refresh data from Azure Functions API
  const handleSync = useCallback(async () => {
    try {
      globalTaskStore.setSyncProgress(true);
      
      // Load the latest data from Azure Functions API
      console.log('Database: Loading latest data from Azure Functions API...');
      const latestTasks = await azureTaskService.loadAllTasks();
      
      // Update the global store with the latest data
      globalTaskStore.setAllTasks(latestTasks);
      console.log('Database: Updated app with latest data from Azure Functions API');
      
      console.log('Database: Sync completed');
    } catch (error) {
      console.error('Database: Error syncing:', error);
    } finally {
      globalTaskStore.setSyncProgress(false);
    }
  }, []);

  const handleCleanDuplicates = useCallback(async () => {
    try {
      globalTaskStore.setSyncProgress(true);
      console.log('Database: Starting duplicate cleanup...');
      
      // Clean duplicates in the global store
      const duplicatesRemoved = globalTaskStore.removeDuplicates();
      console.log('Database: Removed', duplicatesRemoved.length, 'duplicates');
      
      // Refresh the data after cleanup
      const latestTasks = await azureTaskService.loadAllTasks();
      globalTaskStore.setAllTasks(latestTasks);
    } catch (error) {
      console.error('Database: Error cleaning duplicates:', error);
    } finally {
      globalTaskStore.setSyncProgress(false);
    }
  }, []);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Database</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {tasks.length} tasks • {selectedTasks.length} selected
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              const newTask = { title: 'New Task', deadline_date: new Date().toISOString().slice(0,10) };
              try {
                const created = await azureTaskService.createTask(newTask);
                globalTaskStore.setAllTasks([...(globalTaskStore.getAllTasks()||[]), created]);
              } catch (e) { console.error('Add task failed', e); }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
          >
            <PlusIcon className="w-4 h-4" />
            Add Task
          </button>
          <button
            onClick={() => setPasteOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Paste from Excel
          </button>
          {selectedTasks.length > 0 && (
            <button
              onClick={async () => {
                const ids = [...selectedTasks];
                for (const id of ids) { try { await azureTaskService.deleteTask(id); } catch (e) { console.error(e);} }
                globalTaskStore.removeMultipleTasks(ids);
                globalTaskStore.clearSelections();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200"
            >
              <TrashIcon className="w-4 h-4" />
              Delete Selected
            </button>
          )}
        </div>
          </div>

      {/* Search and Filter Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Project Filter */}
          <div>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Projects</option>
              {uniqueProjects.map(project => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-4 h-4 text-gray-400" />
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="deadline">Sort by Deadline</option>
              <option value="task">Sort by Task</option>
              <option value="project">Sort by Project</option>
              <option value="responsibleParty">Sort by Responsible Party</option>
              <option value="priority">Sort by Priority</option>
              <option value="completed">Sort by Completion</option>
            </select>
            <button 
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {sortDirection === 'asc' ? (
                <ChevronUpIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronDownIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Showing {sortedAndFilteredTasks.length} of {tasks.length} tasks
          {searchTerm && ` matching "${searchTerm}"`}
          {filterProject && ` in project "${filterProject}"`}
                  </div>
                </div>

      {/* Bulk Actions */}
      {selectedTasks.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} selected
              </span>
            <button 
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-md text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-700"
              >
                Bulk Actions
                {showBulkActions ? (
                  <ChevronUpIcon className="w-4 h-4" />
                ) : (
                  <ChevronDownIcon className="w-4 h-4" />
                )}
            </button>
                        </div>
            <button 
              onClick={handleClearSelections}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
            >
              Clear Selection
            </button>
              </div>

          {showBulkActions && (
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => handleBulkAction('complete')}
                className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md text-sm font-medium hover:bg-green-200 dark:hover:bg-green-900/50"
              >
                <CheckIcon className="w-4 h-4" />
                Mark Complete
              </button>
              <button
                onClick={() => handleBulkAction('urgent')}
                className="flex items-center gap-2 px-3 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-md text-sm font-medium hover:bg-orange-200 dark:hover:bg-orange-900/50"
              >
                <ClockIcon className="w-4 h-4" />
                Mark Urgent
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50"
              >
                <TrashIcon className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
          </div>
        )}

      {/* Tasks Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedTasks.length === tasks.length && tasks.length > 0}
                    onChange={selectedTasks.length === tasks.length ? handleClearSelections : handleSelectAll}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => handleSort('task')}
                >
                  <div className="flex items-center gap-1">
                    Task
                    {sortField === 'task' && (
                      sortDirection === 'asc' ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => handleSort('project')}
                >
                  <div className="flex items-center gap-1">
                    Project
                    {sortField === 'project' && (
                      sortDirection === 'asc' ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => handleSort('deadline')}
                >
                  <div className="flex items-center gap-1">
                    Deadline
                    {sortField === 'deadline' && (
                      sortDirection === 'asc' ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => handleSort('responsibleParty')}
                >
                  <div className="flex items-center gap-1">
                    Responsible Party
                    {sortField === 'responsibleParty' && (
                      sortDirection === 'asc' ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => handleSort('priority')}
                >
                  <div className="flex items-center gap-1">
                    Priority
                    {sortField === 'priority' && (
                      sortDirection === 'asc' ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => handleSort('completed')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {sortField === 'completed' && (
                      sortDirection === 'asc' ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Recurring
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Interval
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Final Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Instance
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                    </th>
                </tr>
              </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sortedAndFilteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-4">
                                <input 
                      type="checkbox"
                      checked={selectedTasks.includes(task.id)}
                      onChange={() => handleTaskSelection(task.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {task.task}
                      </span>
                      {task.isParent && (
                        <span className="ml-2 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                          Parent
                        </span>
                              )}
                            </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {task.project}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {task.deadline}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {String(task.responsibleParty || 'Unassigned')}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      task.priority === 'Urgent' 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {task.priority}
                                </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      task.completed 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}>
                      {task.completed ? 'Complete' : 'Active'}
                                </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {task.recurring ? 'Yes' : 'No'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {task.interval || ''}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {task.finalDate || ''}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {task.instance}
                        </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTaskUpdate(task.id, { completed: !task.completed })}
                        className={`p-2 rounded-lg transition-colors duration-200 ${
                          task.completed 
                            ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                        }`}
                        title={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleTaskUpdate(task.id, { priority: task.priority === 'Urgent' ? 'Normal' : 'Urgent' })}
                        className={`p-2 rounded-lg transition-colors duration-200 ${
                          task.priority === 'Urgent'
                            ? 'bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                        }`}
                        title={task.priority === 'Urgent' ? 'Mark as normal priority' : 'Mark as urgent'}
                      >
                        <ClockIcon className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={async () => { try { await azureTaskService.deleteTask(task.id); globalTaskStore.removeMultipleTasks([task.id]); } catch(e){ console.error(e);} }}
                        className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors duration-200"
                        title="Delete task"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      {/* Paste from Excel modal */}
      {pasteOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-xl w-full mx-4 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Paste from Excel</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Copy rows from Excel and paste below (tab-separated). Columns supported: title, deadline_date, description, project, responsibleParty, priority, completed, notes.</p>
            <textarea value={pasteText} onChange={(e)=>setPasteText(e.target.value)} className="w-full h-48 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-2" placeholder="title\tdeadline_date\tdescription..." />
            <div className="mt-3 flex gap-2 justify-end">
              <button onClick={()=>setPasteOpen(false)} className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">Cancel</button>
              <button onClick={async ()=>{
                const lines = pasteText.split(/\r?\n/).filter(l=>l.trim());
                if (!lines.length) { setPasteOpen(false); return; }
                const first = lines[0].split('\t');
                const hasHeader = first.some(h=>/title|deadline/i.test(h));
                const rows = hasHeader ? lines.slice(1) : lines;
                const toTask = (cols) => ({
                  title: cols[0]||'Untitled',
                  deadline_date: (cols[1]||'').trim() || new Date().toISOString().slice(0,10),
                  description: cols[2]||'',
                  project: cols[3]||'',
                  responsibleParty: cols[4]||'',
                  priority: cols[5]||'Normal',
                  completed: String(cols[6]||'').toLowerCase()==='yes',
                  notes: cols[7]||''
                });
                try {
                  const created = [];
                  for (const line of rows) {
                    const cols = line.split('\t');
                    const task = toTask(cols);
                    const res = await azureTaskService.createTask(task);
                    created.push(res);
                  }
                  globalTaskStore.setAllTasks([...(globalTaskStore.getAllTasks()||[]), ...created]);
                } catch (e) { console.error('Paste import error', e);} finally { setPasteOpen(false); setPasteText(''); }
              }} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white">Import</button>
            </div>
          </div>
        </div>
      )}

      {/* User Choice Dialog */}
      {showUserChoiceDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Update Recurring Task
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                This task is part of a recurring series. Would you like to update just this instance or all future instances?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleUserChoice('this_instance')}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
                >
                  This Instance Only
                </button>
                <button
                  onClick={() => handleUserChoice('all_instances')}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors duration-200"
                >
                  All Future Instances
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Database;
export default Database;