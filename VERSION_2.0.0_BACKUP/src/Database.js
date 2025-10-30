import React, { useState, useEffect, useRef, useCallback } from 'react';
import { microsoftDataService } from './microsoftDataService';
import { sharePointService } from './graphService';
import { debugSharePoint } from './debugSharePoint';

const Database = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // Column definitions
  const columns = [
    { key: 'Task', label: 'Task', type: 'text', width: 200 },
    { key: 'Project', label: 'Project', type: 'text', width: 150 },
    { key: 'Deadline', label: 'Deadline', type: 'date', width: 120 },
    { key: 'ResponsibleParty', label: 'Responsible Party', type: 'people', width: 200 },
    { key: 'Recurring', label: 'Recurring', type: 'select', width: 100, options: ['Yes', 'No'] },
    { key: 'Interval', label: 'Interval', type: 'select', width: 100, options: ['', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'] },
    { key: 'FinalDate', label: 'Final Date', type: 'date', width: 120 },
    { key: 'Priority', label: 'Priority', type: 'select', width: 100, options: ['Normal', 'Urgent'] },
    { key: 'Status', label: 'Status', type: 'computed', width: 100 },
    { key: 'Completed', label: 'Completed?', type: 'select', width: 100, options: ['Yes', 'No'] },
    { key: 'Notes', label: 'Notes', type: 'text', width: 200 },
    { key: 'Link', label: 'Link', type: 'url', width: 150 }
  ];

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

  // Load tasks
  const loadTasks = async () => {
    try {
      setLoading(true);
      await debugSharePoint();
      const tasksData = await microsoftDataService.tasks.getAll();
      setTasks(tasksData);
      console.log('Database: Loaded', tasksData.length, 'tasks');
    } catch (err) {
      console.error('Database: Error loading tasks:', err);
      setError('Failed to load tasks from Microsoft Lists');
    } finally {
      setLoading(false);
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
    if (peoplePickerTaskId) {
      const formattedValue = formatResponsibleParty(selectedPeople);
      await updateCell(peoplePickerTaskId, 'ResponsibleParty', formattedValue);
      setTimeout(() => loadTasks(), 500);
    }
    setShowPeoplePicker(false);
    setPeoplePickerTaskId(null);
    setSelectedPeople([]);
  };

  // Update a single cell
  const updateCell = async (taskId, field, value) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      let processedValue = value;
      if (field === 'Recurring' || field === 'Completed') {
        processedValue = value === 'Yes';
      }

      const updatedTask = { ...task, [field]: processedValue };
      
      console.log('Database: Updating task:', taskId, field, '=', processedValue);
      
      await microsoftDataService.tasks.update(updatedTask);
      
      setTasks(prevTasks => 
        prevTasks.map(t => t.id === taskId ? updatedTask : t)
      );
      
      setEditingCell(null);
      console.log('Database: Cell updated successfully');
      
      setTimeout(() => loadTasks(), 500);
    } catch (err) {
      console.error('Database: Error updating cell:', err);
      setError(`Failed to update: ${err.message}`);
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
      } catch (err) {
        console.error('Database: Error deleting row:', err);
        setError('Failed to delete task');
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
  const getCellValue = (task, column) => {
    if (column.key === 'Status') {
      return getCalculatedStatus(task);
    }
    
    if (column.key === 'ResponsibleParty') {
      const emails = parseResponsibleParty(task[column.key]);
      return emails.length > 0 ? emails.join('; ') : '';
    }
    
    if (column.type === 'date' && task[column.key]) {
      return new Date(task[column.key]).toLocaleDateString();
    }
    
    if (column.type === 'select') {
      if (column.key === 'Recurring' || column.key === 'Completed') {
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
  const handleCellDoubleClick = (taskId, columnKey) => {
    if (columnKey === 'ResponsibleParty') {
      const task = tasks.find(t => t.id === taskId);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Database Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Excel-like grid view with copy/paste and bulk import support</p>
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
            {tasks.length} tasks • {profiles.length} users • {selectedCells.size} cells selected
          </div>
          <div className="flex gap-2">
            <button 
              onClick={addNewRow} 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              Add Row
            </button>
            <button 
              onClick={() => {
                const allCells = new Set();
                tasks.forEach(task => {
                  columns.forEach(col => {
                    if (col.key !== 'Status') allCells.add(`${task.id}-${col.key}`);
                  });
                });
                setSelectedCells(allCells);
              }}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium"
            >
              Select All
            </button>
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
                        <div key={email} className="flex items-center bg-white dark:bg-gray-700 rounded-full px-3 py-1">
                          <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold mr-2">
                            {profile?.initials || '?'}
                          </div>
                          <span className="text-sm mr-2">{profile?.name || email}</span>
                          <button onClick={() => togglePersonSelection(email)}>✕</button>
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
                        className={`flex items-center p-3 rounded-lg cursor-pointer ${isSelected ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50 hover:bg-gray-100'}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold mr-3">
                          {profile.initials}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{profile.name}</div>
                          <div className="text-xs text-gray-500">{profile.email}</div>
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
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    {columns.map((column) => {
                      const cellId = `${task.id}-${column.key}`;
                      const isSelected = selectedCells.has(cellId);
                      const isEditing = editingCell === cellId;
                      const cellValue = getCellValue(task, column);
                      
                      return (
                        <td 
                          key={column.key}
                          className={`px-3 py-2 border-r border-gray-200 dark:border-gray-600 ${isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                          style={{ width: column.width, minWidth: column.width }}
                          onClick={(e) => handleCellClick(task.id, column.key, e)}
                          onDoubleClick={() => handleCellDoubleClick(task.id, column.key)}
                        >
                          {isEditing ? (
                            <div className="w-full">
                              {column.type === 'select' ? (
                                <select 
                                  defaultValue={cellValue} 
                                  onChange={(e) => updateCell(task.id, column.key, e.target.value)} 
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
                                  defaultValue={task[column.key] ? new Date(task[column.key]).toISOString().split('T')[0] : ''} 
                                  onBlur={(e) => updateCell(task.id, column.key, e.target.value)} 
                                  className="w-full px-2 py-1 border rounded bg-white dark:bg-gray-700 text-sm" 
                                  autoFocus 
                                />
                              ) : column.type === 'url' ? (
                                <input 
                                  type="url" 
                                  defaultValue={task[column.key]} 
                                  onBlur={(e) => updateCell(task.id, column.key, e.target.value)} 
                                  className="w-full px-2 py-1 border rounded bg-white dark:bg-gray-700 text-sm" 
                                  autoFocus 
                                />
                              ) : column.key === 'Notes' ? (
                                <textarea 
                                  defaultValue={task[column.key]} 
                                  onBlur={(e) => updateCell(task.id, column.key, e.target.value)} 
                                  className="w-full px-2 py-1 border rounded bg-white dark:bg-gray-700 text-sm" 
                                  rows={2} 
                                  autoFocus 
                                />
                              ) : (
                                <input 
                                  type="text" 
                                  defaultValue={task[column.key]} 
                                  onBlur={(e) => updateCell(task.id, column.key, e.target.value)} 
                                  onKeyPress={(e) => e.key === 'Enter' && updateCell(task.id, column.key, e.target.value)} 
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
                                      {parseResponsibleParty(task.ResponsibleParty).map((email, idx) => {
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
                                <span className={`px-2 py-1 text-xs rounded-full ${task.Priority === 'Urgent' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                  {task.Priority || 'Normal'}
                                </span>
                              ) : column.key === 'Status' ? (
                                <span className={`px-2 py-1 text-xs rounded-full ${getCalculatedStatus(task) === 'Completed' ? 'bg-green-100 text-green-800' : getCalculatedStatus(task) === 'Overdue' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                  {getCalculatedStatus(task)}
                                </span>
                              ) : column.key === 'Link' && task.Link ? (
                                <a href={task.Link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                  Link
                                </a>
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
                    <td className="px-3 py-2">
                      <button 
                        onClick={() => deleteRow(task.id)} 
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Excel-like Features:</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• <strong>Click</strong> to select cells, <strong>Ctrl+Click</strong> for multi-select</li>
            <li>• <strong>Double-click</strong> to edit cells directly</li>
            <li>• <strong>Ctrl+C</strong> to copy, <strong>Ctrl+V</strong> to paste</li>
            <li>• <strong>Delete/Backspace</strong> to clear selected cells</li>
            <li>• <strong>Hover near edges</strong> to auto-scroll horizontally</li>
            <li>• <strong>Bulk import:</strong> Copy data from Excel and paste into the grid</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Database;
