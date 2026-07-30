import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline';
import ResponsiblePartyResolverModal from './ResponsiblePartyResolverModal';
import BatchRecurrenceConfiguratorModal from './BatchRecurrenceConfiguratorModal';

function BatchAddModal({ isOpen, onClose, onSave, enterpriseUsers = [] }) {
  const [rows, setRows] = useState([{ task: '', project: '', deadline: '', responsibleParty: '', notes: '', recurring: false }]);
  const [focusedCell, setFocusedCell] = useState(null);
  const [showResolverModal, setShowResolverModal] = useState(false);
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [mismatches, setMismatches] = useState([]);
  const [recurringTasks, setRecurringTasks] = useState([]);
  const resolvedTasksRef = useRef([]); // Store resolved tasks to avoid state closure issues
  const tableRef = useRef(null);

  // Reset rows when modal opens
  useEffect(() => {
    if (isOpen) {
      setRows([{ task: '', project: '', deadline: '', responsibleParty: '', notes: '', recurring: false }]);
      setFocusedCell(null);
      setRecurringTasks([]);
      resolvedTasksRef.current = []; // Reset ref when modal opens
    }
  }, [isOpen]);

  // Handle cell value change
  const handleCellChange = (rowIndex, field, value) => {
    setRows(prevRows => {
      const newRows = [...prevRows];
      newRows[rowIndex] = { ...newRows[rowIndex], [field]: value };
      return newRows;
    });
  };

  // Add new row
  const handleAddRow = () => {
    setRows(prevRows => [...prevRows, { task: '', project: '', deadline: '', responsibleParty: '', notes: '', recurring: false }]);
  };

  // Remove row
  const handleRemoveRow = (rowIndex) => {
    if (rows.length > 1) {
      setRows(prevRows => prevRows.filter((_, index) => index !== rowIndex));
    }
  };

  // Check if responsible party matches a user
  const findMatchingUser = (responsibleParty) => {
    if (!responsibleParty || !responsibleParty.trim() || !enterpriseUsers || enterpriseUsers.length === 0) {
      return null;
    }

    const parties = responsibleParty.split(',').map(p => p.trim()).filter(Boolean);
    const matches = [];

    for (const party of parties) {
      const partyLower = party.toLowerCase();
      
      // Only consider EXACT matches as valid - partial matches require user confirmation
      const match = enterpriseUsers.find(user => {
        const displayName = (user.displayName || user.DisplayName || '').toLowerCase();
        const email = (user.mail || user.userPrincipalName || user.email || user.Email || '').toLowerCase();
        // Only exact matches are considered valid - this ensures "Nick" doesn't match "Nick Karamardian"
        return displayName === partyLower || email === partyLower;
      });

      if (!match) {
        // No exact match found - this is a mismatch that needs resolution
        matches.push({ original: party, suggestedMatch: null });
      } else {
        // Exact match found - this is valid, no resolution needed
        matches.push({ original: party, suggestedMatch: match });
      }
    }

    // Return mismatches (where suggestedMatch is null)
    // This will trigger the resolver modal for any non-exact matches
    return matches.filter(m => !m.suggestedMatch);
  };

  // Handle save
  const handleSave = async () => {
    // Filter out empty rows (rows where task is empty)
    const validRows = rows.filter(row => row.task.trim() !== '');
    
    if (validRows.length === 0) {
      alert('Please add at least one task with a task name.');
      return;
    }

    // Validate that all valid rows have deadlines
    const rowsWithoutDeadlines = validRows.filter(row => !row.deadline.trim());
    if (rowsWithoutDeadlines.length > 0) {
      alert('Please ensure all tasks have a deadline.');
      return;
    }

    // Convert rows to task data format
    const tasksToAdd = validRows.map((row, index) => ({
      title: row.task.trim(),
      project: row.project.trim() || 'Unassigned',
      deadline_date: row.deadline,
      responsibleParty: row.responsibleParty.trim() || '',
      note: row.notes.trim() || '',
      priority: 'Normal',
      completed: false,
      recurring: row.recurring || false,
      _batchIndex: index // Track original index for recurrence settings
    }));

    // Check for responsible party mismatches
    const allMismatches = [];
    tasksToAdd.forEach((task, index) => {
      if (task.responsibleParty && task.responsibleParty.trim()) {
        console.log('BatchAddModal: Checking responsible party for task:', task.title, 'responsibleParty:', task.responsibleParty);
        const mismatches = findMatchingUser(task.responsibleParty);
        console.log('BatchAddModal: Found mismatches:', mismatches);
        if (mismatches && mismatches.length > 0) {
          mismatches.forEach(mismatch => {
            allMismatches.push({
              ...mismatch,
              taskTitle: task.title,
              taskIndex: index
            });
          });
        }
      }
    });

    console.log('BatchAddModal: Total mismatches found:', allMismatches.length, allMismatches);

    // Check for recurring tasks
    const recurringTaskList = tasksToAdd.filter(task => task.recurring);
    
    // If there are mismatches, show resolver modal first
    if (allMismatches.length > 0) {
      console.log('BatchAddModal: Showing resolver modal for', allMismatches.length, 'mismatches');
      setMismatches(allMismatches);
      setPendingTasks(tasksToAdd);
      setRecurringTasks(recurringTaskList);
      setShowResolverModal(true);
    } else if (recurringTaskList.length > 0) {
      // No mismatches but there are recurring tasks, show recurrence modal
      setPendingTasks(tasksToAdd);
      setRecurringTasks(recurringTaskList);
      setShowRecurrenceModal(true);
    } else {
      // No mismatches and no recurring tasks, proceed with save
      // Remove _batchIndex from tasks before saving
      const cleanTasks = tasksToAdd.map(({ _batchIndex, ...task }) => task);
      console.log('BatchAddModal: Saving tasks (no mismatches, no recurring):', cleanTasks);
      console.log('BatchAddModal: Number of tasks:', cleanTasks.length);
      
      if (!cleanTasks || cleanTasks.length === 0) {
        console.error('BatchAddModal: ERROR - No tasks to save!');
        alert('Error: No tasks to save. Please try again.');
        return;
      }
      
      try {
        console.log('BatchAddModal: Calling onSave with', cleanTasks.length, 'tasks');
        await onSave(cleanTasks);
        console.log('BatchAddModal: onSave completed successfully');
      } catch (error) {
        console.error('BatchAddModal: Error calling onSave:', error);
        alert(`Error saving tasks: ${error.message || 'Please try again.'}`);
        return;
      }
      
      onClose();
    }
  };

  // Handle resolution from resolver modal
  const handleResolveMismatches = async (resolutions) => {
    console.log('BatchAddModal: handleResolveMismatches called with resolutions:', resolutions);
    console.log('BatchAddModal: pendingTasks before resolution:', pendingTasks);
    
    // Update pending tasks with resolved responsible parties
    const updatedTasks = pendingTasks.map(task => {
      if (!task.responsibleParty || !task.responsibleParty.trim()) {
        return task;
      }

      const originalParties = task.responsibleParty.split(',').map(p => p.trim()).filter(Boolean);
      console.log('BatchAddModal: Resolving task:', task.title, 'original parties:', originalParties);
      
      const resolvedParties = originalParties.map(party => {
        // Try exact match first
        let resolution = resolutions[party];
        
        // If no exact match, try case-insensitive match
        if (!resolution) {
          const partyLower = party.toLowerCase();
          const matchingKey = Object.keys(resolutions).find(key => key.toLowerCase() === partyLower);
          if (matchingKey) {
            resolution = resolutions[matchingKey];
          }
        }
        
        if (resolution) {
          // Use the resolved user's email or display name (prefer email)
          const resolvedValue = resolution.mail || resolution.userPrincipalName || resolution.email || resolution.Email || resolution.displayName || resolution.DisplayName || party;
          console.log('BatchAddModal: Resolved', party, 'to', resolvedValue);
          return resolvedValue;
        }
        
        // If no resolution found, keep original (shouldn't happen as skip is removed)
        console.warn('BatchAddModal: No resolution found for party:', party, 'available resolutions:', Object.keys(resolutions));
        return party;
      });

      const resolvedResponsibleParty = resolvedParties.join(', ');
      console.log('BatchAddModal: Task', task.title, 'responsibleParty updated from', task.responsibleParty, 'to', resolvedResponsibleParty);

      return {
        ...task,
        responsibleParty: resolvedResponsibleParty
      };
    });

    console.log('BatchAddModal: updatedTasks after resolution:', updatedTasks);
    setPendingTasks(updatedTasks);
    resolvedTasksRef.current = updatedTasks; // Store in ref to avoid state closure issues
    setShowResolverModal(false);
    setMismatches([]);
    
    // Check if there are recurring tasks to configure
    const recurringTaskList = updatedTasks.filter(task => task.recurring);
    console.log('BatchAddModal: Recurring tasks after resolution:', recurringTaskList.length, recurringTaskList);
    
    if (recurringTaskList.length > 0) {
      setRecurringTasks(recurringTaskList);
      setShowRecurrenceModal(true);
    } else {
      // No recurring tasks, proceed with save
      // Remove _batchIndex from tasks before saving
      const cleanTasks = updatedTasks.map(({ _batchIndex, ...task }) => task);
      console.log('BatchAddModal: Saving tasks (after resolver, no recurring):', cleanTasks);
      console.log('BatchAddModal: Number of tasks:', cleanTasks.length);
      
      if (!cleanTasks || cleanTasks.length === 0) {
        console.error('BatchAddModal: ERROR - No tasks to save!');
        alert('Error: No tasks to save. Please try again.');
        return;
      }
      
      // Close modal immediately when save starts
      onClose();
      setPendingTasks([]);
      setRecurringTasks([]);
      
      try {
        console.log('BatchAddModal: Calling onSave with', cleanTasks.length, 'tasks');
        await onSave(cleanTasks);
        console.log('BatchAddModal: onSave completed successfully');
      } catch (error) {
        console.error('BatchAddModal: Error calling onSave:', error);
        alert(`Error saving tasks: ${error.message || 'Please try again.'}`);
        return;
      }
    }
  };

  // Handle recurrence configuration for all tasks
  const handleRecurrenceResolve = async (resolutions) => {
    console.log('BatchAddModal: handleRecurrenceResolve called with resolutions:', resolutions);
    console.log('BatchAddModal: pendingTasks before recurrence config:', pendingTasks);
    console.log('BatchAddModal: resolvedTasksRef.current:', resolvedTasksRef.current);
    
    // Use resolvedTasksRef to avoid state closure issues - it has the latest resolved tasks
    const tasksToProcess = resolvedTasksRef.current.length > 0 ? resolvedTasksRef.current : pendingTasks;
    console.log('BatchAddModal: Using tasksToProcess:', tasksToProcess.length, tasksToProcess);
    
    // Apply recurrence settings to tasks
    const finalTasks = tasksToProcess.map(task => {
      console.log('BatchAddModal: Processing task for recurrence:', task.title, 'responsibleParty:', task.responsibleParty, 'recurring:', task.recurring);
      
      if (task.recurring && resolutions[task._batchIndex] !== undefined) {
        const recurrence = resolutions[task._batchIndex];
        // If recurrence is null (pattern was 'none'), treat as non-recurring
        if (recurrence === null) {
          const { _batchIndex, ...cleanTask } = task;
          console.log('BatchAddModal: Task', task.title, 'recurrence set to none, making non-recurring. responsibleParty:', cleanTask.responsibleParty);
          return {
            ...cleanTask,
            recurring: false
          };
        }
        const { _batchIndex, ...cleanTask } = task;
        console.log('BatchAddModal: Task', task.title, 'recurrence configured. responsibleParty:', cleanTask.responsibleParty, 'recurrence:', recurrence);
        return {
          ...cleanTask,
          recurrence: recurrence
        };
      }
      // Remove _batchIndex from non-recurring tasks too
      const { _batchIndex, ...cleanTask } = task;
      console.log('BatchAddModal: Task', task.title, 'not recurring. responsibleParty:', cleanTask.responsibleParty);
      return cleanTask;
    });
    
    console.log('BatchAddModal: Final tasks after recurrence config:', finalTasks);
    console.log('BatchAddModal: Checking responsible parties in final tasks:', finalTasks.map(t => ({ title: t.title, responsibleParty: t.responsibleParty })));
    console.log('BatchAddModal: Number of final tasks:', finalTasks.length);
    console.log('BatchAddModal: onSave function type:', typeof onSave);
    
    if (!finalTasks || finalTasks.length === 0) {
      console.error('BatchAddModal: ERROR - No tasks to save!');
      alert('Error: No tasks to save. Please try again.');
      return;
    }
    
    // Close modal immediately when save starts
    onClose();
    setShowRecurrenceModal(false);
    setPendingTasks([]);
    setRecurringTasks([]);
    
    try {
      console.log('BatchAddModal: Calling onSave with', finalTasks.length, 'tasks');
      await onSave(finalTasks);
      console.log('BatchAddModal: onSave completed successfully');
    } catch (error) {
      console.error('BatchAddModal: Error calling onSave:', error);
      alert(`Error saving tasks: ${error.message || 'Please try again.'}`);
      return;
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e, rowIndex, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move to next row, same column, or add new row if at last row
      if (rowIndex < rows.length - 1) {
        setFocusedCell({ row: rowIndex + 1, field });
        // Focus the cell after state update
        setTimeout(() => {
          const nextInput = tableRef.current?.querySelector(
            `tbody tr:nth-child(${rowIndex + 2}) td input[data-field="${field}"], tbody tr:nth-child(${rowIndex + 2}) td textarea[data-field="${field}"]`
          );
          nextInput?.focus();
        }, 0);
      } else {
        handleAddRow();
        setTimeout(() => {
          setFocusedCell({ row: rowIndex + 1, field });
          const nextInput = tableRef.current?.querySelector(
            `tbody tr:nth-child(${rowIndex + 2}) td input[data-field="${field}"], tbody tr:nth-child(${rowIndex + 2}) td textarea[data-field="${field}"]`
          );
          nextInput?.focus();
        }, 0);
      }
    }
  };

  // Convert various date formats to YYYY-MM-DD (required by HTML date input)
  const convertDateToYYYYMMDD = (dateStr) => {
    if (!dateStr) return '';
    
    // Handle non-string values (numbers, etc.)
    if (typeof dateStr !== 'string') {
      // If it's a number, it might be an Excel serial date
      if (typeof dateStr === 'number') {
        // Excel serial date: days since Jan 1, 1900
        // JavaScript Date uses milliseconds since Jan 1, 1970
        const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899 (Excel's epoch)
        const jsDate = new Date(excelEpoch.getTime() + (dateStr - 1) * 24 * 60 * 60 * 1000);
        if (!isNaN(jsDate.getTime())) {
          const year = jsDate.getFullYear();
          const month = String(jsDate.getMonth() + 1).padStart(2, '0');
          const day = String(jsDate.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      }
      dateStr = String(dateStr);
    }
    
    const trimmed = dateStr.trim();
    if (!trimmed) return '';
    
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    
    // Try parsing common date formats
    // Format: MM/DD/YYYY or M/D/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
      const [month, day, year] = trimmed.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Format: DD/MM/YYYY (European format)
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
      // Try both formats - prefer US format but handle European
      const parts = trimmed.split('/');
      if (parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
        // If first part > 12, it's likely DD/MM/YYYY
        if (parseInt(parts[0]) > 12) {
          const [day, month, year] = parts;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } else {
          // Assume MM/DD/YYYY
          const [month, day, year] = parts;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
    }
    
    // Try parsing as Date object (handles formats like "Jan 15, 2024", ISO strings, etc.)
    try {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      // If parsing fails, continue to next attempt
    }
    
    // If all else fails, return original value (user can manually fix if needed)
    return trimmed;
  };

  // Handle paste from spreadsheet
  const handlePaste = (e) => {
    // Only handle paste if modal is open and user is focused on the table
    if (!isOpen) return;
    
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData || !pasteData.trim()) return;

    // Parse the pasted data - Excel/Sheets uses tab-separated values
    // Split by newlines - preserve lines even if they appear empty (they might have tabs)
    const lines = pasteData.split(/\r?\n/);
    // Filter out only trailing completely empty lines (no tabs, no content)
    // Keep lines that have tabs even if they appear empty (they represent rows with empty cells)
    const nonEmptyLines = lines.filter((line, index) => {
      // Keep line if it has tabs (even if all cells are empty) or has content
      // Only remove trailing lines that are completely empty
      const hasTabs = line.includes('\t');
      const hasContent = line.trim().length > 0;
      const isTrailing = index === lines.length - 1 || (index === lines.length - 2 && lines[index + 1].trim().length === 0);
      return hasTabs || hasContent || !isTrailing;
    });
    if (nonEmptyLines.length === 0) return;

    // Get the currently focused cell to determine starting position
    const activeElement = document.activeElement;
    let startRow = 0;
    let startCol = 0;

    // Find the focused cell position
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      const field = activeElement.getAttribute('data-field');
      const cell = activeElement.closest('td');
      if (cell) {
        const row = cell.closest('tr');
        const tbody = row?.closest('tbody');
        if (tbody && row) {
          startRow = Array.from(tbody.children).indexOf(row);
          // Find which column this cell is in using data-field attribute
          if (field) {
            const columnKeys = ['task', 'project', 'deadline', 'responsibleParty', 'notes'];
            startCol = columnKeys.indexOf(field);
            if (startCol === -1) startCol = 0; // Default to first column if not found
          } else {
            // Fallback: find by cell position
            const allCells = Array.from(row.querySelectorAll('td'));
            const cellIndex = allCells.indexOf(cell);
            // Adjust for row number column (first td) and delete column (last td)
            if (cellIndex > 0 && cellIndex < allCells.length - 1) {
              startCol = cellIndex - 1; // Subtract 1 for row number column
            }
          }
        }
      }
    }

    // Parse each line - split by tabs (Excel/Sheets standard)
    const parseLine = (line) => {
      // Split by tabs first (Excel/Google Sheets standard)
      // split('\t') preserves empty cells between tabs
      let cells = line.split('\t');
      
      // If no tabs found, try comma (CSV format)
      if (cells.length === 1 && line.includes(',')) {
        cells = line.split(',');
      }
      
      // Preserve all cells including empty ones
      // Trim whitespace but keep empty strings as empty strings
      // This ensures blank cells from Excel paste as blank cells
      return cells.map(cell => {
        const trimmed = cell.trim();
        // If original was empty or whitespace, return empty string
        // Otherwise return trimmed value
        return trimmed;
      });
    };

    const parsedData = nonEmptyLines.map(line => parseLine(line));

    // Column mapping: Task, Project, Deadline, Responsible Party, Notes, Recurring
    const columnKeys = ['task', 'project', 'deadline', 'responsibleParty', 'notes', 'recurring'];

    // Ensure we have enough rows
    const neededRows = startRow + parsedData.length;
    const currentRows = [...rows];
    while (currentRows.length < neededRows) {
      currentRows.push({ task: '', project: '', deadline: '', responsibleParty: '', notes: '', recurring: false });
    }

    // Fill in the data starting from the focused position
    parsedData.forEach((lineData, lineIndex) => {
      const targetRowIndex = startRow + lineIndex;
      if (targetRowIndex >= currentRows.length) {
        currentRows.push({ task: '', project: '', deadline: '', responsibleParty: '', notes: '', recurring: false });
      }

      // Process each column in the pasted data
      // Ensure we handle all columns even if pasted data has fewer columns
      lineData.forEach((value, colIndex) => {
        const targetColIndex = startCol + colIndex;
        if (targetColIndex >= 0 && targetColIndex < columnKeys.length) {
          const fieldKey = columnKeys[targetColIndex];
          // Preserve empty strings - blank cells should paste as blank cells
          let cellValue = (value === undefined || value === null) ? '' : value;
          
          // Special handling for deadline column - convert date formats to YYYY-MM-DD
          if (fieldKey === 'deadline' && cellValue && cellValue.trim() !== '') {
            cellValue = convertDateToYYYYMMDD(cellValue);
          }
          
          // Special handling for recurring column - convert to boolean
          if (fieldKey === 'recurring') {
            const valueStr = String(cellValue).toLowerCase().trim();
            cellValue = valueStr === 'true' || valueStr === 'yes' || valueStr === '1' || valueStr === 'y';
          }
          
          currentRows[targetRowIndex] = {
            ...currentRows[targetRowIndex],
            [fieldKey]: cellValue
          };
        }
      });
      
      // If pasted data has fewer columns than expected, ensure remaining columns stay as-is
      // (Don't overwrite with empty - they might have existing data)
    });

    setRows(currentRows);
    e.preventDefault();
    e.stopPropagation();
  };

  if (!isOpen) return null;

  const columns = [
    { key: 'task', label: 'Task', required: true, placeholder: 'Enter task name' },
    { key: 'project', label: 'Project', required: false, placeholder: 'Enter project name' },
    { key: 'deadline', label: 'Deadline', required: true, placeholder: 'YYYY-MM-DD', type: 'date' },
    { key: 'responsibleParty', label: 'Responsible Party', required: false, placeholder: 'Enter names separated by commas (e.g., John Doe, Jane Smith)' },
    { key: 'notes', label: 'Notes', required: false, placeholder: 'Enter notes for this task', type: 'textarea' },
    { key: 'recurring', label: 'Recurring', required: false, type: 'checkbox' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col transform transition-all duration-300 scale-100 animate-slideUp">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            <h3 className="text-lg font-bold">Add Tasks</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-all duration-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Excel-like Table */}
        <div className="flex-1 overflow-auto scrollbar-themed p-4">
          <div 
            className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-700"
            onPaste={handlePaste}
            tabIndex={0}
          >
            <table ref={tableRef} className="w-full border-collapse">
              {/* Header Row */}
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
                  <th className="w-12 px-2 py-2 border-r border-gray-300 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-300 text-center">
                    #
                  </th>
                  {columns.map(col => (
                    <th
                      key={col.key}
                      className="px-3 py-2 border-r border-gray-300 dark:border-gray-600 last:border-r-0 text-xs font-semibold text-gray-700 dark:text-gray-300 text-left"
                    >
                      {col.label}
                      {col.required && <span className="text-red-500 ml-1">*</span>}
                    </th>
                  ))}
                  <th className="w-12 px-2 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 text-center">
                    {/* Delete column header */}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    {/* Row Number */}
                    <td className="w-12 px-2 py-2 border-r border-gray-300 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400 text-center bg-gray-50 dark:bg-gray-800">
                      {rowIndex + 1}
                    </td>
                    {/* Data Cells */}
                    {columns.map(col => (
                      <td
                        key={col.key}
                        className="px-3 py-2 border-r border-gray-300 dark:border-gray-600 last:border-r-0"
                      >
                        {col.type === 'date' ? (
                          <input
                            type="date"
                            data-field={col.key}
                            value={row[col.key] || ''}
                            onChange={(e) => handleCellChange(rowIndex, col.key, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, rowIndex, col.key)}
                            onFocus={() => setFocusedCell({ row: rowIndex, field: col.key })}
                            className={`w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              focusedCell?.row === rowIndex && focusedCell?.field === col.key
                                ? 'ring-2 ring-blue-500'
                                : ''
                            }`}
                            placeholder={col.placeholder}
                          />
                        ) : col.type === 'textarea' ? (
                          <textarea
                            data-field={col.key}
                            value={row[col.key] || ''}
                            onChange={(e) => handleCellChange(rowIndex, col.key, e.target.value)}
                            onKeyDown={(e) => {
                              // Allow Enter in textarea, but Ctrl+Enter moves to next row
                              if (e.key === 'Enter' && e.ctrlKey) {
                                e.preventDefault();
                                handleKeyDown(e, rowIndex, col.key);
                              }
                            }}
                            onFocus={() => setFocusedCell({ row: rowIndex, field: col.key })}
                            rows={2}
                            className={`w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                              focusedCell?.row === rowIndex && focusedCell?.field === col.key
                                ? 'ring-2 ring-blue-500'
                                : ''
                            }`}
                            placeholder={col.placeholder}
                          />
                        ) : col.type === 'checkbox' ? (
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              data-field={col.key}
                              checked={row[col.key] || false}
                              onChange={(e) => handleCellChange(rowIndex, col.key, e.target.checked)}
                              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                            />
                          </div>
                        ) : (
                          <input
                            type="text"
                            data-field={col.key}
                            value={row[col.key] || ''}
                            onChange={(e) => handleCellChange(rowIndex, col.key, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, rowIndex, col.key)}
                            onFocus={() => setFocusedCell({ row: rowIndex, field: col.key })}
                            className={`w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              focusedCell?.row === rowIndex && focusedCell?.field === col.key
                                ? 'ring-2 ring-blue-500'
                                : ''
                            }`}
                            placeholder={col.placeholder}
                          />
                        )}
                      </td>
                    ))}
                    {/* Delete Button */}
                    <td className="w-12 px-2 py-2 text-center">
                      {rows.length > 1 && (
                        <button
                          onClick={() => handleRemoveRow(rowIndex)}
                          className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 rounded transition-colors"
                          title="Remove row"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Row Button and Tip */}
          <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
            <button
              onClick={handleAddRow}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Row
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
              💡 Tip: Copy cells from Excel/Google Sheets and paste directly into the table
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-5 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {rows.filter(r => r.task.trim() !== '').length} task{rows.filter(r => r.task.trim() !== '').length !== 1 ? 's' : ''} ready to add
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg transition-all shadow-md shadow-blue-500/30 flex items-center gap-2"
            >
              <CheckIcon className="w-4 h-4" />
              Add Tasks ({rows.filter(r => r.task.trim() !== '').length})
            </button>
          </div>
        </div>
      </div>

      {/* Responsible Party Resolver Modal */}
      <ResponsiblePartyResolverModal
        isOpen={showResolverModal}
        onClose={() => {
          setShowResolverModal(false);
          setPendingTasks([]);
          setMismatches([]);
        }}
        mismatches={mismatches}
        enterpriseUsers={enterpriseUsers}
        onResolve={handleResolveMismatches}
      />

      {/* Batch Recurrence Configurator Modal */}
      <BatchRecurrenceConfiguratorModal
        isOpen={showRecurrenceModal}
        onClose={() => {
          setShowRecurrenceModal(false);
          setPendingTasks([]);
          setRecurringTasks([]);
        }}
        recurringTasks={recurringTasks}
        onResolve={handleRecurrenceResolve}
      />
    </div>
  );
}

export default BatchAddModal;

