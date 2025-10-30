import React, { useState, useEffect, useRef, useCallback } from 'react';
import { microsoftDataService } from './microsoftDataService';
import { sharedDataService } from './sharedDataService';
import { globalTaskStore } from './globalTaskStore';
import { sharePointService } from './graphService';
import { debugSharePoint } from './debugSharePoint';
import { useAuth } from './Auth';
import recurringInstanceService from './recurringInstanceService';
import recurringTaskGenerator from './recurringTaskGenerator';

const Database = () => {
  const { userProfile, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('sharepoint');
  const [tasks, setTasks] = useState([]);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [profiles, setProfiles] = useState([]);
  const [showPeoplePicker, setShowPeoplePicker] = useState(false);
  const [peoplePickerTaskId, setPeoplePickerTaskId] = useState(null);
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [peopleSearchTerm, setPeopleSearchTerm] = useState('');
  const [clipboard, setClipboard] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [autoScrollDirection, setAutoScrollDirection] = useState(null);
  const [autoScrollInterval, setAutoScrollInterval] = useState(null);
  
  const tableRef = useRef(null);
  const containerRef = useRef(null);

  // Column definitions - base columns for all views
  const allColumns = [
    { key: 'Task', label: 'Task', type: 'text', width: 200 },
    { key: 'Project', label: 'Project', type: 'text', width: 150 },
    { key: 'Deadline', label: 'Deadline', type: 'date', width: 120 },
    { key: 'ResponsibleParty', label: 'Responsible Party', type: 'people', width: 200 },
    { key: 'Recurring', label: 'Recurring', type: 'select', width: 100, options: ['Yes', 'No'] },
    { key: 'Interval', label: 'Interval (months)', type: 'number', width: 120 },
    { key: 'FinalDate', label: 'Final Date', type: 'date', width: 120 },
    { key: 'Priority', label: 'Priority', type: 'select', width: 100, options: ['Normal', 'Urgent'] },
    { key: 'Status', label: 'Status', type: 'computed', width: 100 },
    { key: 'Completed', label: 'Completed?', type: 'select', width: 100, options: ['Yes', 'No'] },
    { key: 'Notes', label: 'Notes', type: 'text', width: 200 },
    { key: 'Link', label: 'Link', type: 'url', width: 150 }
  ];
  
  // Filter columns based on active tab
  // SharePoint tab: Hide Priority, Status, Completed (parent tasks are just configuration)
  // Sub-Database tab: Show all columns (these are the working instances)
  const columns = activeTab === 'sharepoint' 
    ? allColumns.filter(col => !['Priority', 'Status', 'Completed'].includes(col.key))
    : allColumns;

  // Load real Microsoft users
  const loadProfiles = async () => {
    try {
      const users = await sharePointService.getUsers();
      const formattedProfiles = users.map(user => ({
        id: user.id,
        name: user.displayName,
        email: user.mail || user.userPrincipalName,
        department: user.department || 'No Department',
        jobTitle: user.jobTitle || '',
        initials: getInitials(user.displayName)
      }));
      setProfiles(formattedProfiles);
      console.log('Database: Loaded', formattedProfiles.length, 'profiles');
    } catch (err) {
      console.error('Database: Error loading profiles:', err);
      setProfiles([]);
    }
  };

  // Get initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Load tasks and generate instances
  const loadTasks = async () => {
    try {
      setLoading(true);
      await debugSharePoint();
      const tasksData = await sharedDataService.getAllTasks();
      setTasks(tasksData);
      globalTaskStore.setTasks(tasksData);
      console.log('Database: Loaded', tasksData.length, 'tasks');
      
      // Generate instances for recurring tasks
      await recurringTaskGenerator.generateAllInstances(tasksData);
      
      // Load instances and update global store
      await loadInstances();
      
      // Update global store with combined data
      const allInstances = await recurringTaskGenerator.getAllTaskInstances();
      globalTaskStore.setAllTasks([...tasksData, ...allInstances]);
    } catch (err) {
      console.error('Database: Error loading tasks:', err);
      setError('Failed to load tasks from Microsoft Lists');
    } finally {
      setLoading(false);
    }
  };

  // Load instances from IndexedDB
  const loadInstances = async () => {
    try {
      const instancesData = await recurringTaskGenerator.getAllTaskInstances();
      setInstances(instancesData);
      globalTaskStore.setInstances(instancesData);
      console.log('Database: Loaded', instancesData.length, 'instances');
    } catch (err) {
      console.error('Database: Error loading instances:', err);
    }
  };

  // Parse responsible party - SAFE version that handles any type
  const parseResponsibleParty = (rpValue) => {
    if (!rpValue) return [];
    
    if (Array.isArray(rpValue)) return rpValue;
    
    if (typeof rpValue === 'string') {
      return rpValue.split(';').map(item => item.trim()).filter(item => item.length > 0);
    }
    
    if (typeof rpValue === 'object') {
      if (rpValue.lookupValue) return [rpValue.lookupValue];
      if (rpValue.Email) return [rpValue.Email];
      if (rpValue.title) return [rpValue.title];
    }
    
    return [];
  };

  // Format responsible party array to string
  const formatResponsibleParty = (emails) => {
    if (!Array.isArray(emails)) return '';
    return emails.join('; ');
  };

  // Open people picker
  const openPeoplePicker = (taskId, currentValue) => {
    setPeoplePickerTaskId(taskId);
    setSelectedPeople(parseResponsibleParty(currentValue));
    setPeopleSearchTerm('');
    setShowPeoplePicker(true);
  };

  // Toggle person selection
  const togglePersonSelection = (personEmail) => {
    setSelectedPeople(prev => {
      if (prev.includes(personEmail)) {
        return prev.filter(email => email !== personEmail);
      } else {
        return [...prev, personEmail];
      }
    });
  };

  // Save people picker selection
  const savePeoplePickerSelection = async () => {
    console.log('Database: savePeoplePickerSelection called!');
    try {
      if (peoplePickerTaskId) {
        const formattedValue = formatResponsibleParty(selectedPeople);
        console.log('Database: Saving ResponsibleParty:', {
          taskId: peoplePickerTaskId,
          selectedPeople: selectedPeople,
          formattedValue: formattedValue
        });
        
        if (!formattedValue || formattedValue.trim() === '') {
          console.warn('Database: No people selected, skipping save');
          setShowPeoplePicker(false);
          setPeoplePickerTaskId(null);
          setSelectedPeople([]);
          return;
        }
        
        await updateCell(peoplePickerTaskId, 'ResponsibleParty', formattedValue);
        console.log('Database: ResponsibleParty saved successfully!');
      } else {
        console.warn('Database: No task ID set for people picker');
      }
    } catch (error) {
      console.error('Database: Error saving ResponsibleParty:', error);
      setError(`Failed to save ResponsibleParty: ${error.message}`);
    } finally {
      setShowPeoplePicker(false);
      setPeoplePickerTaskId(null);
      setSelectedPeople([]);
    }
  };

  // Update a single cell
  const updateCell = async (taskId, field, value, isInstance = false) => {
    // Don't allow editing of Status column - it's calculated automatically
    if (field === 'Status') {
      return;
    }
    
    // Check if user has permission to edit
    if (!hasPermission(userProfile?.role, 'ADMIN')) {
      alert('You do not have permission to edit tasks. Contact an administrator.');
      return;
    }

    // Handle instance updates differently
    if (isInstance) {
      await updateInstanceCell(taskId, field, value);
      return;
    }

    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      let processedValue = value;
      if (field === 'Recurring' || field === 'Completed') {
        processedValue = value === 'Yes';
      }
      
      // Special handling for date fields to prevent timezone issues
      if (field === 'Deadline' || field === 'FinalDate') {
        if (value && value.includes('-')) {
          // Value is in format "2024-10-05"
          // Convert to ISO string at noon local time to avoid timezone shifts
          const [year, month, day] = value.split('-');
          const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
          processedValue = localDate.toISOString();
          console.log('Database: Converted date to ISO with local timezone:', {
            input: value,
            output: processedValue,
            localDate: localDate.toLocaleDateString()
          });
        }
      }
      
      console.log('Database: Updating task:', taskId, field, '=', processedValue);
      
      // Show loading indicator
      setUpdating(true);
      
      // Update local state immediately (optimistic update)
      const updatedTask = { ...task, [field]: processedValue };
      setTasks(prevTasks => 
        prevTasks.map(t => t.id === taskId ? updatedTask : t)
      );
      
      // Update SharePoint
      await sharedDataService.updateTask(taskId, { [field]: processedValue });
      
      setEditingCell(null);
      
      // Clear cache and reload fresh data
      sharedDataService.clearCache();
      const freshTasks = await sharedDataService.getAllTasks();
      setTasks(freshTasks);
      
      // Update global store
      globalTaskStore.setTasks(freshTasks);
      
      const updatedTaskFromFresh = freshTasks.find(t => t.id === taskId);
      
      // If this was a recurring field, regenerate instances
      if (field === 'Recurring' || field === 'Interval' || field === 'FinalDate' || field === 'Deadline') {
        console.log('Database: Recurring field changed, regenerating instances...');
        if (updatedTaskFromFresh) {
          await recurringTaskGenerator.updateTaskInstances(updatedTaskFromFresh);
          await loadInstances();
        }
      } else if (field === 'Completed_x003f_' || field === 'Priority') {
        // For status fields (Completed, Priority), do NOT cascade to instances
        // These should remain independent
        console.log('Database: Status field changed, NOT cascading to instances to maintain independence');
      } else {
        // For non-recurring, non-status fields, cascade changes to all instances
        console.log('Database: Non-recurring field changed, cascading to instances...');
        if (updatedTaskFromFresh && (updatedTaskFromFresh.Recurring === true || updatedTaskFromFresh.Recurring === 'Yes')) {
          await recurringTaskGenerator.cascadeParentChanges(updatedTaskFromFresh);
          await loadInstances();
        }
      }
      
      // Refresh instances for global store
      const allInstances = await recurringTaskGenerator.getAllTaskInstances();
      globalTaskStore.setAllTasks([...freshTasks, ...allInstances]);
      
      setUpdating(false);
      console.log('Database: Cell updated successfully');
    } catch (err) {
      console.error('Database: Error updating cell:', err);
      setError(`Failed to update: ${err.message}`);
      setUpdating(false);
    }
  };

  // Update instance cell
  const updateInstanceCell = async (instanceId, field, value) => {
    try {
      let processedValue = value;
      if (field === 'Completed_x003f_' || field === 'Completed') {
        processedValue = value === 'Yes' || value === true;
      }

      // Update the instance in IndexedDB
      await recurringTaskGenerator.updateInstanceModifications(instanceId, { [field]: processedValue });
      
      // If it's a completion status update, also update the completion status
      if (field === 'Completed_x003f_' || field === 'Completed') {
        await recurringTaskGenerator.updateInstanceCompletion(instanceId, processedValue);
      }
      
      await loadInstances();
      setEditingCell(null);
      console.log('Database: Instance cell updated successfully');
    } catch (err) {
      console.error('Database: Error updating instance cell:', err);
      setError(`Failed to update instance: ${err.message}`);
    }
  };

  // Add new row
  const addNewRow = async () => {
    try {
      const newTask = {
        Task: 'New Task',
        Project: '',
        Deadline: new Date().toISOString().split('T')[0],
        ResponsibleParty: '',
        Recurring: false,
        Interval: '',
        FinalDate: '',
        Priority: 'Normal',
        Completed: false,
        Notes: '',
        Link: ''
      };

      const result = await microsoftDataService.tasks.add(newTask);
      setTasks(prevTasks => [...prevTasks, { ...newTask, id: result.id }]);
    } catch (err) {
      console.error('Database: Error adding row:', err);
      setError('Failed to add new task');
    }
  };

  // Delete row
  const deleteRow = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await microsoftDataService.tasks.delete(taskId);
        setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
        
        // Delete associated instances
        await recurringTaskGenerator.deleteTaskInstances(taskId);
        await loadInstances();
      } catch (err) {
        console.error('Database: Error deleting row:', err);
        setError('Failed to delete task');
      }
    }
  };

  // Delete instance
  const deleteInstance = async (instanceId) => {
    if (window.confirm('Are you sure you want to delete this instance?')) {
      try {
        await recurringInstanceService.deleteInstance(instanceId);
        await loadInstances();
        console.log('Database: Deleted instance:', instanceId);
      } catch (err) {
        console.error('Database: Error deleting instance:', err);
        setError('Failed to delete instance');
      }
    }
  };

  // Calculate status
  const getCalculatedStatus = (task) => {
    if (task.Completed) return 'Completed';
    if (new Date(task.Deadline) < new Date()) return 'Overdue';
    return 'Active';
  };

  // Get cell value for display
  const getCellValue = (task, column, isInstance = false) => {
    if (column.key === 'Status') {
      return getCalculatedStatus(task);
    }
    
    if (column.key === 'ResponsibleParty') {
      const emails = parseResponsibleParty(task[column.key]);
      return emails.length > 0 ? emails.join('; ') : '';
    }
    
    if (column.type === 'date' && task[column.key]) {
      const dateStr = task[column.key];
      // Parse date string carefully to avoid timezone issues
      let year, month, day;
      
      // If in yyyy-MM-dd format, parse directly
      if (typeof dateStr === 'string' && dateStr.includes('-')) {
        const datePart = dateStr.split('T')[0];
        const parts = datePart.split('-');
        if (parts.length === 3) {
          year = parts[0];
          month = parts[1];
          day = parts[2];
          return `${month}/${day}/${year}`;
        }
      }
      
      // Fallback to Date parsing
      const date = new Date(dateStr);
      year = date.getFullYear();
      month = String(date.getMonth() + 1).padStart(2, '0');
      day = String(date.getDate()).padStart(2, '0');
      return `${month}/${day}/${year}`;
    }
    
    if (column.key === 'Link') {
      const linkValue = task[column.key];
      if (typeof linkValue === 'object' && linkValue !== null) {
        return linkValue.Url || linkValue.Description || '';
      }
      return linkValue || '';
    }
    
    if (column.type === 'select') {
      if (column.key === 'Recurring' || column.key === 'Completed' || column.key === 'Completed_x003f_') {
        return task[column.key] ? 'Yes' : 'No';
      }
      return task[column.key] || '';
    }
    
    return task[column.key] || '';
  };

  // Handle cell selection
  const handleCellClick = (taskId, columnKey, event) => {
    const cellId = `${taskId}-${columnKey}`;
    
    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd
      setSelectedCells(prev => {
        const newSet = new Set(prev);
        if (newSet.has(cellId)) {
          newSet.delete(cellId);
        } else {
          newSet.add(cellId);
        }
        return newSet;
      });
    } else if (event.shiftKey && selectedCells.size > 0) {
      // Range select with Shift
      // Implementation for range selection would go here
    } else {
      // Single select
      setSelectedCells(new Set([cellId]));
    }
  };

  // Handle cell double-click to edit
  const handleCellDoubleClick = (taskId, columnKey, isInstance = false) => {
    // Don't allow editing of Status column - it's calculated automatically
    if (columnKey === 'Status') {
      return;
    }
    
    if (columnKey === 'ResponsibleParty') {
      const dataSource = isInstance ? instances : tasks;
      const task = dataSource.find(t => t.id === taskId);
      openPeoplePicker(taskId, task.ResponsibleParty);
    } else {
      setEditingCell(`${taskId}-${columnKey}`);
    }
  };

  // Handle copy
  const handleCopy = useCallback((event) => {
    if (selectedCells.size === 0) return;
    
    const selectedData = Array.from(selectedCells).map(cellId => {
      const [taskId, columnKey] = cellId.split('-');
      const task = tasks.find(t => t.id === taskId);
      const column = columns.find(c => c.key === columnKey);
      return getCellValue(task, column);
    });
    
    const copyText = selectedData.join('\t');
    setClipboard(copyText);
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(copyText);
    }
    
    event.preventDefault();
  }, [selectedCells, tasks, columns]);

  // Handle paste
  const handlePaste = useCallback(async (event) => {
    if (selectedCells.size === 0) return;
    
    let pasteData;
    if (navigator.clipboard) {
      try {
        pasteData = await navigator.clipboard.readText();
      } catch (err) {
        pasteData = clipboard;
      }
    } else {
      pasteData = clipboard;
    }
    
    if (!pasteData) return;
    
    const rows = pasteData.split('\n').filter(row => row.trim());
    const selectedCellsArray = Array.from(selectedCells);
    
    // Handle bulk paste
    for (let i = 0; i < rows.length && i < selectedCellsArray.length; i++) {
      const cellId = selectedCellsArray[i];
      const [taskId, columnKey] = cellId.split('-');
      const values = rows[i].split('\t');
      
      for (let j = 0; j < values.length && (i + j) < selectedCellsArray.length; j++) {
        const targetCellId = selectedCellsArray[i + j];
        const [targetTaskId, targetColumnKey] = targetCellId.split('-');
        const value = values[j].trim();
        
        if (value && targetColumnKey !== 'Status') {
          await updateCell(targetTaskId, targetColumnKey, value);
        }
      }
    }
    
    event.preventDefault();
  }, [selectedCells, clipboard]);

  // Handle delete
  const handleDelete = useCallback(async (event) => {
    if (selectedCells.size === 0) return;
    
    for (const cellId of selectedCells) {
      const [taskId, columnKey] = cellId.split('-');
      if (columnKey !== 'Status' && columnKey !== 'Task') {
        await updateCell(taskId, columnKey, '');
      }
    }
    
    event.preventDefault();
  }, [selectedCells]);

  // Handle add row
  const handleAddRow = async () => {
    if (!hasPermission(userProfile?.role, 'ADMIN')) {
      alert('You do not have permission to add tasks. Contact an administrator.');
      return;
    }

    try {
      const newTask = {
        Task: 'New Task',
        Project: '',
        Deadline: new Date().toISOString().split('T')[0],
        ResponsibleParty: '',
        Recurring: false,
        Interval: '',
        FinalDate: '',
        Priority: 'Normal',
        Completed: false,
        Notes: '',
        Link: ''
      };

      const result = await sharedDataService.addTask(newTask);
      await loadTasks();
      console.log('Database: Added new task:', result.id);
    } catch (error) {
      console.error('Database: Error adding task:', error);
      alert('Failed to add task');
    }
  };


  // Auto-scroll functionality
  const handleMouseMove = useCallback((event) => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const scrollThreshold = 50;
    
    const isNearLeft = event.clientX - rect.left < scrollThreshold;
    const isNearRight = event.clientX - rect.left > rect.width - scrollThreshold;
    
    if (isNearLeft && autoScrollDirection !== 'left') {
      setAutoScrollDirection('left');
      const interval = setInterval(() => {
        container.scrollLeft -= 10;
      }, 16);
      setAutoScrollInterval(interval);
    } else if (isNearRight && autoScrollDirection !== 'right') {
      setAutoScrollDirection('right');
      const interval = setInterval(() => {
        container.scrollLeft += 10;
      }, 16);
      setAutoScrollInterval(interval);
    } else if (!isNearLeft && !isNearRight && autoScrollDirection) {
      setAutoScrollDirection(null);
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        setAutoScrollInterval(null);
      }
    }
  }, [autoScrollDirection, autoScrollInterval]);

  const handleMouseLeave = useCallback(() => {
    setAutoScrollDirection(null);
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      setAutoScrollInterval(null);
    }
  }, [autoScrollInterval]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'c':
            handleCopy(event);
            break;
          case 'v':
            handlePaste(event);
            break;
        }
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        handleDelete(event);
      } else if (event.key === 'Escape') {
        setEditingCell(null);
        setSelectedCells(new Set());
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleCopy, handlePaste, handleDelete]);

  // Filter profiles
  const filteredProfiles = profiles.filter(profile => 
    profile.name.toLowerCase().includes(peopleSearchTerm.toLowerCase()) ||
    profile.email.toLowerCase().includes(peopleSearchTerm.toLowerCase())
  );

  useEffect(() => {
    loadProfiles();
    loadTasks();
  }, []);

  // Load instances when switching to sub-database tab
  useEffect(() => {
    if (activeTab === 'subdatabase') {
      loadInstances();
    }
  }, [activeTab]);

  // Auto-update instances every minute
  useEffect(() => {
    const interval = setInterval(async () => {
      console.log('Database: Auto-updating instances...');
      try {
        await recurringTaskGenerator.refreshAllInstances(tasks);
        await loadInstances();
        
        // Update global store with fresh data
        const allInstances = await recurringTaskGenerator.getAllTaskInstances();
        globalTaskStore.setAllTasks([...tasks, ...allInstances]);
        console.log('Database: Auto-update completed');
      } catch (error) {
        console.error('Database: Error in auto-update:', error);
      }
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [tasks]);

  // Auto-update instances when any task deadline changes
  useEffect(() => {
    const updateInstances = async () => {
      if (tasks.length > 0) {
        console.log('Database: Deadline change detected, updating instances...');
        try {
          await recurringTaskGenerator.refreshAllInstances(tasks);
          await loadInstances();
          
          // Update global store with fresh data
          const allInstances = await recurringTaskGenerator.getAllTaskInstances();
          globalTaskStore.setAllTasks([...tasks, ...allInstances]);
          console.log('Database: Instance update completed');
        } catch (error) {
          console.error('Database: Error updating instances on deadline change:', error);
        }
      }
    };

    // Debounce the update to avoid excessive calls
    const timeoutId = setTimeout(updateInstances, 1000);
    return () => clearTimeout(timeoutId);
  }, [tasks.map(t => t.Deadline).join(',')]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative">
      {/* Updating Overlay */}
      {updating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4 border border-gray-200 dark:border-gray-700">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Updating...</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Syncing with SharePoint</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="w-full px-4 py-8">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Database Management</h1>
              <p className="text-gray-600 dark:text-gray-400">Excel-like grid view with copy/paste and bulk import support</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('sharepoint')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'sharepoint'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                SharePoint Database
              </button>
              <button
                onClick={() => setActiveTab('subdatabase')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'subdatabase'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Sub-Database
                {instances.length > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                    {instances.length}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4">
            <div className="flex justify-between">
              <p className="text-red-800 dark:text-red-200">{error}</p>
              <button onClick={() => setError(null)} className="text-red-600">✕</button>
            </div>
          </div>
        )}

        <div className="mb-6 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {activeTab === 'sharepoint' ? (
              `${tasks.length} tasks • ${profiles.length} users • ${selectedCells.size} cells selected`
            ) : (
              `${instances.length} instances • ${profiles.length} users • ${selectedCells.size} cells selected`
            )}
          </div>
          <div className="flex gap-2">
            {hasPermission(userProfile?.role, 'ADMIN') && activeTab === 'sharepoint' && (
              <button 
                onClick={addNewRow} 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                Add Row
              </button>
            )}
            {activeTab === 'subdatabase' && (
              <div className="flex gap-2">
                <button 
                  onClick={async () => {
                    console.log('Database: Manual refresh triggered');
                    console.log('Database: Current tasks:', tasks.length, tasks);
                    await recurringTaskGenerator.refreshAllInstances(tasks);
                    await loadInstances();
                    const allInstances = await recurringTaskGenerator.getAllTaskInstances();
                    globalTaskStore.setAllTasks([...tasks, ...allInstances]);
                    console.log('Database: Manual refresh completed');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Refresh Instances
                </button>
                <button 
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to clear all instances? This cannot be undone.')) {
                      await recurringInstanceService.clearAllInstances();
                      await loadInstances();
                      const allInstances = await recurringTaskGenerator.getAllTaskInstances();
                      globalTaskStore.setAllTasks([...tasks, ...allInstances]);
                      console.log('Database: All instances cleared');
                    }
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                >
                  Clear All Instances
                </button>
              </div>
            )}
          </div>
        </div>

        {/* People Picker Modal */}
        {showPeoplePicker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Responsible Party</h3>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={peopleSearchTerm}
                  onChange={(e) => setPeopleSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  autoFocus
                />
              </div>

              {selectedPeople.length > 0 && (
                <div className="p-4 border-b bg-blue-50 dark:bg-blue-900/20">
                  <div className="text-sm font-medium mb-2">Selected ({selectedPeople.length}):</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedPeople.map(email => {
                      const profile = profiles.find(p => p.email === email);
                      return (
                        <div key={email} className="flex items-center bg-white dark:bg-gray-700 rounded-full px-3 py-1 border border-gray-200 dark:border-gray-600">
                          <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold mr-2">
                            {profile?.initials || '?'}
                          </div>
                          <span className="text-sm mr-2 text-gray-900 dark:text-white">{profile?.name || email}</span>
                          <button 
                            onClick={() => togglePersonSelection(email)}
                            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {filteredProfiles.map(profile => {
                    const isSelected = selectedPeople.includes(profile.email);
                    return (
                      <div
                        key={profile.id}
                        onClick={() => togglePersonSelection(profile.email)}
                        className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-500 dark:border-blue-400' 
                            : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold mr-3">
                          {profile.initials}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{profile.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{profile.email}</div>
                        </div>
                        {isSelected && <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white">✓</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 border-t flex justify-end gap-3">
                <button onClick={() => { setShowPeoplePicker(false); setPeoplePickerTaskId(null); setSelectedPeople([]); }} className="px-4 py-2 text-gray-600">Cancel</button>
                <button onClick={savePeoplePickerSelection} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Excel-like Grid */}
        <div 
          ref={containerRef}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-auto"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ maxHeight: '70vh' }}
        >
          <div className="inline-block min-w-full">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                <tr>
                  {columns.map((column) => (
                    <th 
                      key={column.key}
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase border-r border-gray-200 dark:border-gray-600"
                      style={{ width: column.width, minWidth: column.width }}
                    >
                      {column.label}
                    </th>
                  ))}
                  {/* Only show Actions column in Sub-Database tab */}
                  {activeTab === 'subdatabase' && (
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-20">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {(activeTab === 'sharepoint' ? tasks : instances).map((item) => {
                  const isInstance = activeTab === 'subdatabase';
                  return (
                    <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${isInstance ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                      {columns.map((column) => {
                        const cellId = `${item.id}-${column.key}`;
                        const isSelected = selectedCells.has(cellId);
                        const isEditing = editingCell === cellId;
                        const cellValue = getCellValue(item, column, isInstance);
                        
                        return (
                          <td 
                            key={column.key}
                            className={`px-3 py-2 border-r border-gray-200 dark:border-gray-600 ${isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                            style={{ width: column.width, minWidth: column.width }}
                            onClick={(e) => hasPermission(userProfile?.role, 'ADMIN') && column.key !== 'Status' && handleCellClick(item.id, column.key, e)}
                            onDoubleClick={() => hasPermission(userProfile?.role, 'ADMIN') && handleCellDoubleClick(item.id, column.key, isInstance)}
                          >
                            {isEditing ? (
                              <div className="w-full">
                                {column.type === 'select' ? (
                                  <select 
                                    defaultValue={cellValue} 
                                    onChange={(e) => updateCell(item.id, column.key, e.target.value, isInstance)} 
                                    className="w-full px-2 py-1 border rounded bg-white dark:bg-gray-700 text-sm" 
                                    autoFocus
                                  >
                                    {column.options.map(option => (
                                      <option key={option} value={option}>{option || 'Select'}</option>
                                    ))}
                                  </select>
                                ) : column.type === 'date' ? (
                                  <input 
                                    type="date" 
                                    defaultValue={item[column.key] ? (() => {
                                      const dateStr = item[column.key];
                                      // If already in yyyy-MM-dd format, return as-is
                                      if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                                        return dateStr;
                                      }
                                      // Otherwise parse carefully to avoid timezone issues
                                      const datePart = dateStr.split('T')[0];
                                      return datePart;
                                    })() : ''} 
                                    onBlur={(e) => updateCell(item.id, column.key, e.target.value, isInstance)} 
                                    className="w-full px-2 py-1 border rounded bg-white dark:bg-gray-700 text-sm" 
                                    autoFocus 
                                  />
                                ) : column.type === 'url' ? (
                                  <input 
                                    type="url" 
                                    defaultValue={item[column.key]} 
                                    onBlur={(e) => updateCell(item.id, column.key, e.target.value, isInstance)} 
                                    className="w-full px-2 py-1 border rounded bg-white dark:bg-gray-700 text-sm" 
                                    autoFocus 
                                  />
                                ) : column.type === 'number' ? (
                                  <input 
                                    type="number" 
                                    defaultValue={item[column.key] || ''} 
                                    onBlur={(e) => updateCell(item.id, column.key, e.target.value, isInstance)} 
                                    onKeyPress={(e) => e.key === 'Enter' && updateCell(item.id, column.key, e.target.value, isInstance)} 
                                    className="w-full px-2 py-1 border rounded bg-white dark:bg-gray-700 text-sm" 
                                    autoFocus 
                                    min="1"
                                    placeholder="Enter months"
                                  />
                                ) : column.key === 'Notes' ? (
                                  <textarea 
                                    defaultValue={item[column.key]} 
                                    onBlur={(e) => updateCell(item.id, column.key, e.target.value, isInstance)} 
                                    className="w-full px-2 py-1 border rounded bg-white dark:bg-gray-700 text-sm" 
                                    rows={2} 
                                    autoFocus 
                                  />
                                ) : (
                                  <input 
                                    type="text" 
                                    defaultValue={item[column.key]} 
                                    onBlur={(e) => updateCell(item.id, column.key, e.target.value, isInstance)} 
                                    onKeyPress={(e) => e.key === 'Enter' && updateCell(item.id, column.key, e.target.value, isInstance)} 
                                    className="w-full px-2 py-1 border rounded bg-white dark:bg-gray-700 text-sm" 
                                    autoFocus 
                                  />
                                )}
                              </div>
                            ) : (
                              <div className="w-full">
                                {column.key === 'ResponsibleParty' ? (
                                  <div className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 px-2 py-1 rounded text-sm">
                                    {cellValue ? (
                                      <div className="flex flex-wrap gap-1">
                                        {parseResponsibleParty(item.ResponsibleParty).map((email, idx) => {
                                          const emailStr = String(email || '');
                                          const profile = profiles.find(p => p.email === emailStr);
                                          const displayName = profile?.name || (emailStr.includes('@') ? emailStr.split('@')[0] : emailStr);
                                          return (
                                            <div key={idx} className="flex items-center bg-blue-100 dark:bg-blue-900/30 rounded-full px-2 py-1">
                                              <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold mr-1">
                                                {profile?.initials || getInitials(displayName)}
                                              </div>
                                              <span className="text-xs text-gray-900 dark:text-white">{displayName}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <span className="text-gray-500">Click to assign</span>
                                    )}
                                  </div>
                                ) : column.key === 'Priority' ? (
                                  <span className={`px-2 py-1 text-xs rounded-full ${item.Priority === 'Urgent' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                    {item.Priority || 'Normal'}
                                  </span>
                                ) : column.key === 'Status' ? (
                                  <span className={`px-2 py-1 text-xs rounded-full ${getCalculatedStatus(item) === 'Completed' ? 'bg-green-100 text-green-800' : getCalculatedStatus(item) === 'Overdue' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                    {getCalculatedStatus(item)}
                                  </span>
                                ) : column.key === 'Link' && item.Link ? (
                                  <span className="text-gray-700 dark:text-gray-300 text-sm break-all">
                                    {typeof item.Link === 'object' && item.Link !== null ? (item.Link.Url || item.Link.Description || '') : item.Link}
                                  </span>
                                ) : column.key === 'Task' && isInstance ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-900 dark:text-white">{item.Task}</span>
                                    <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">#{item.instanceNumber}</span>
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-900 dark:text-white truncate">
                                    {cellValue || 'Click to edit'}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      {/* Only show Actions (Delete button) in Sub-Database tab */}
                      {activeTab === 'subdatabase' && (
                        <td className="px-3 py-2">
                          <button 
                            onClick={() => deleteInstance(item.id)} 
                            className="text-red-600 hover:text-red-900 text-sm"
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            {activeTab === 'sharepoint' ? 'SharePoint Database Features:' : 'Sub-Database Features:'}
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• <strong>Click</strong> to select cells, <strong>Ctrl+Click</strong> for multi-select</li>
            <li>• <strong>Double-click</strong> to edit cells directly</li>
            <li>• <strong>Ctrl+C</strong> to copy, <strong>Ctrl+V</strong> to paste</li>
            <li>• <strong>Delete/Backspace</strong> to clear selected cells</li>
            <li>• <strong>Hover near edges</strong> to auto-scroll horizontally</li>
            {activeTab === 'sharepoint' ? (
              <li>• <strong>Bulk import:</strong> Copy data from Excel and paste into the grid</li>
            ) : (
              <li>• <strong>Instance Management:</strong> Each instance acts independently from its parent task</li>
            )}
          </ul>
        </div>
      </div>
      <div className="h-32"></div>
    </div>
  );
};

export default Database;
