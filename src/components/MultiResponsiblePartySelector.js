import React, { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { XMarkIcon, PencilIcon, UserIcon, CheckIcon } from '@heroicons/react/24/outline';
import { diagnosticLogger } from '../utils/diagnostics';

const MultiResponsiblePartySelector = ({ 
  task, 
  className = '', 
  editingCell, 
  enterpriseUsers, 
  editInputRef, 
  editValueRef, 
  saveEdit, 
  startEditing,
  moveToNextCell,
  savingFields,
  savedFields
}) => {
  const isEditing = editingCell?.taskId === task.id && editingCell?.field === 'responsibleParty';
  const savingKey = `${task.id}-responsibleParty`;
  const isSaving = savingFields?.has(savingKey);
  const isSaved = savedFields?.has(savingKey);
  
  // Parse responsibleParty: can be comma-separated string or array
  const parseParties = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
    return [];
  };
  
  // Always derive current parties directly from task prop (for immediate updates)
  // Don't use useMemo - derive directly so it always reflects the latest task
  // CRITICAL FIX: Check both lowercase and uppercase field names for compatibility
  const responsiblePartyValue = task.responsibleParty || task.ResponsibleParty || '';
  const currentParties = parseParties(responsiblePartyValue);
  
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState(null);
  // Use currentParties as the source of truth, only override when editing
  const [selectedParties, setSelectedParties] = useState(currentParties);
  const dropdownRef = useRef(null);
  const containerRef = useRef(null);
  
  // Track if we're in the middle of a save operation to prevent race conditions
  const isSavingRef = useRef(false);
  const lastSavedValueRef = useRef(null);
  
  // Sync selectedParties with currentParties immediately when task changes (for optimistic updates)
  // This ensures the component reflects optimistic updates instantly
  // Watch task.responsibleParty directly, not through useMemo
  useEffect(() => {
    const diagnosticId = `syncEffect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // CRITICAL FIX: Check both lowercase and uppercase field names
    const taskResponsibleParty = task.responsibleParty || task.ResponsibleParty || '';
    
    diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.syncEffect - TRIGGERED`, {
      taskId: task.id,
      taskResponsibleParty: task.responsibleParty,
      taskResponsiblePartyAlt: task.ResponsibleParty,
      taskResponsiblePartyValue: taskResponsibleParty,
      isEditing,
      selectedParties,
      currentParties,
      isSaving: isSavingRef.current,
      lastSavedValue: lastSavedValueRef.current
    });
    
    // CRITICAL FIX: Don't sync if we're in the middle of saving or just saved
    // This prevents the race condition where syncEffect overwrites user's selection
    if (isSavingRef.current) {
      diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.syncEffect - SKIPPED_SAVING`, {
        reason: 'Save operation in progress - preventing race condition'
      });
      return;
    }
    
    // CRITICAL FIX: Don't sync if the task prop hasn't actually changed yet
    // If we just saved a value, wait for the task prop to reflect that change
    if (lastSavedValueRef.current !== null && taskResponsibleParty === lastSavedValueRef.current) {
      diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.syncEffect - SKIPPED_STALE`, {
        reason: 'Task prop has not updated yet - waiting for optimistic update',
        lastSavedValue: lastSavedValueRef.current,
        currentTaskValue: taskResponsibleParty
      });
      return;
    }
    
    // Clear the last saved value if the task prop has updated
    if (lastSavedValueRef.current !== null && taskResponsibleParty !== lastSavedValueRef.current) {
      diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.syncEffect - CLEARING_SAVED_FLAG`, {
        reason: 'Task prop has updated - optimistic update complete',
        lastSavedValue: lastSavedValueRef.current,
        newTaskValue: taskResponsibleParty
      });
      lastSavedValueRef.current = null;
    }
    
    if (!isEditing) {
      // When not editing, sync with task to show optimistic updates immediately
      const newParties = parseParties(taskResponsibleParty);
      const newPartiesStr = newParties.join(', ');
      const selectedPartiesStr = selectedParties.join(', ');
      const needsUpdate = newPartiesStr !== selectedPartiesStr;
      
      diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.syncEffect - CHECKING_SYNC`, {
        newParties,
        newPartiesStr,
        selectedParties,
        selectedPartiesStr,
        needsUpdate
      });
      
      if (needsUpdate) {
        diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.syncEffect - UPDATING_SELECTED_PARTIES`, {
          from: selectedParties,
          to: newParties
        });
        setSelectedParties(newParties);
      } else {
        diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.syncEffect - NO_UPDATE_NEEDED`, {
          reason: 'Values match'
        });
      }
    } else {
      diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.syncEffect - SKIPPED`, {
        reason: 'Currently editing'
      });
    }
  }, [task.responsibleParty, task.ResponsibleParty, task.id, isEditing, selectedParties]); // Watch both field name variations
  
  // Wrapper function to call saveEdit with task and field
  // CRITICAL FIX: Accept optional value parameter to avoid stale closure issues
  const handleSaveEdit = useCallback(async (options = {}, overrideValue = null) => {
    const diagnosticId = `handleSaveEdit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    
    // EXTENSIVE DIAGNOSTIC LOGGING: Log all parameter details
    diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.handleSaveEdit - ENTRY_RAW`, {
      taskId: task.id,
      options,
      optionsType: typeof options,
      optionsIsObject: typeof options === 'object',
      optionsKeys: options ? Object.keys(options) : null,
      overrideValue,
      overrideValueType: typeof overrideValue,
      overrideValueIsNull: overrideValue === null,
      overrideValueIsUndefined: overrideValue === undefined,
      overrideValueLength: overrideValue ? (typeof overrideValue === 'string' ? overrideValue.length : 'not-string') : null,
      overrideValueStringified: overrideValue ? JSON.stringify(overrideValue) : 'null/undefined',
      selectedParties,
      selectedPartiesType: typeof selectedParties,
      selectedPartiesIsArray: Array.isArray(selectedParties),
      selectedPartiesLength: selectedParties ? selectedParties.length : null,
      selectedPartiesStringified: selectedParties ? JSON.stringify(selectedParties) : 'null/undefined',
      selectedPartiesJoin: selectedParties ? selectedParties.join(', ') : 'null/undefined',
      isEditing,
      taskResponsibleParty: task.responsibleParty,
      taskResponsiblePartyAlt: task.ResponsibleParty,
      taskResponsiblePartyValue: task.responsibleParty || task.ResponsibleParty || ''
    });
    
    // Use overrideValue if provided, otherwise use selectedParties from closure
    // This ensures we use the fresh value when called immediately after state update
    // CRITICAL FIX: We MUST use overrideValue if it's provided (not null/undefined)
    // Empty string is a valid value (means no responsible parties), so we check for null/undefined only
    const hasOverrideValue = overrideValue !== null && overrideValue !== undefined;
    const fallbackValue = selectedParties ? selectedParties.join(', ') : '';
    
    // CRITICAL FIX: Always use overrideValue if provided, even if it's an empty string
    // This ensures we use the fresh value passed from handleUserSelect, not the stale closure
    const valueToSave = hasOverrideValue ? String(overrideValue) : fallbackValue;
    
    // CRITICAL FIX: Log when override differs from fallback to help diagnose issues
    if (hasOverrideValue && overrideValue !== fallbackValue) {
      diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.handleSaveEdit - OVERRIDE_DIFFERS_FROM_FALLBACK`, {
        taskId: task.id,
        overrideValue,
        overrideValueType: typeof overrideValue,
        overrideValueLength: typeof overrideValue === 'string' ? overrideValue.length : 'not-string',
        fallbackValue,
        fallbackValueType: typeof fallbackValue,
        fallbackValueLength: typeof fallbackValue === 'string' ? fallbackValue.length : 'not-string',
        usingOverride: true,
        warning: 'Override value differs from closure value - using override (correct behavior)',
        selectedPartiesInClosure: selectedParties,
        selectedPartiesLengthInClosure: selectedParties ? selectedParties.length : null
      });
    }
    
    diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.handleSaveEdit - VALUE_CALCULATION`, {
      taskId: task.id,
      hasOverrideValue,
      overrideValue,
      overrideValueType: typeof overrideValue,
      overrideValueIsNull: overrideValue === null,
      overrideValueIsUndefined: overrideValue === undefined,
      overrideValueLength: overrideValue !== null && overrideValue !== undefined && typeof overrideValue === 'string' ? overrideValue.length : null,
      fallbackValue,
      fallbackValueType: typeof fallbackValue,
      fallbackValueLength: fallbackValue ? fallbackValue.length : null,
      valueToSave,
      valueToSaveType: typeof valueToSave,
      valueToSaveLength: valueToSave ? valueToSave.length : null,
      valueToSaveStringified: valueToSave ? JSON.stringify(valueToSave) : 'null/undefined',
      calculationLogic: hasOverrideValue ? 'USING_OVERRIDE' : 'USING_FALLBACK',
      selectedPartiesAtCalculation: selectedParties,
      selectedPartiesLengthAtCalculation: selectedParties ? selectedParties.length : null,
      warning: hasOverrideValue ? 'Using overrideValue (correct - fresh value)' : 'Using fallback from closure (may be stale)'
    });
    
    diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.handleSaveEdit - ENTRY`, {
      taskId: task.id,
      selectedParties,
      selectedPartiesLength: selectedParties ? selectedParties.length : null,
      overrideValue,
      overrideValueType: typeof overrideValue,
      overrideValueIsNull: overrideValue === null,
      valueToSave,
      valueToSaveType: typeof valueToSave,
      valueToSaveLength: valueToSave ? valueToSave.length : null,
      taskResponsibleParty: task.responsibleParty,
      taskResponsiblePartyAlt: task.ResponsibleParty,
      taskResponsiblePartyValue: task.responsibleParty || task.ResponsibleParty || '',
      options,
      isEditing
    });
    
    const value = valueToSave;
    editValueRef.current = value;
    
    // CRITICAL FIX: Mark that we're saving to prevent syncEffect from interfering
    const wasSavingBefore = isSavingRef.current;
    isSavingRef.current = true;
    // Store the old value (check both field name variations)
    const oldLastSavedValue = lastSavedValueRef.current;
    lastSavedValueRef.current = task.responsibleParty || task.ResponsibleParty || '';
    
    diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.handleSaveEdit - VALUE_PREPARED`, {
      taskId: task.id,
      value,
      valueType: typeof value,
      valueLength: value ? value.length : null,
      valueStringified: value ? JSON.stringify(value) : 'null/undefined',
      selectedParties,
      selectedPartiesLength: selectedParties ? selectedParties.length : null,
      editValueRefCurrent: editValueRef.current,
      editValueRefCurrentType: typeof editValueRef.current,
      editValueRefCurrentLength: editValueRef.current ? editValueRef.current.length : null,
      wasSavingBefore,
      markedAsSaving: true,
      isSavingRefCurrent: isSavingRef.current,
      oldLastSavedValue,
      lastSavedValue: lastSavedValueRef.current,
      lastSavedValueType: typeof lastSavedValueRef.current,
      lastSavedValueLength: lastSavedValueRef.current ? lastSavedValueRef.current.length : null
    });
    
    if (saveEdit) {
      diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.handleSaveEdit - CALLING_SAVE_EDIT`, {
        taskId: task.id,
        field: 'responsibleParty',
        value,
        valueType: typeof value,
        valueLength: value ? value.length : null,
        valueStringified: value ? JSON.stringify(value) : 'null/undefined',
        options,
        saveEditType: typeof saveEdit,
        saveEditIsFunction: typeof saveEdit === 'function',
        aboutToCallSaveEdit: true,
        callParams: {
          taskId: task.id,
          field: 'responsibleParty',
          newValue: value,
          options: options
        }
      });
      
      try {
        // Save - the optimistic update in parent will cause task prop to change
        // The useEffect watching task.responsibleParty will sync selectedParties
        const saveEditCallStart = performance.now();
        diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.handleSaveEdit - SAVE_EDIT_CALL_START`, {
          taskId: task.id,
          value,
          timestamp: saveEditCallStart
        });
        
        const result = await saveEdit(task.id, 'responsibleParty', value, options);
        
        const saveEditCallEnd = performance.now();
        diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.handleSaveEdit - SAVE_EDIT_CALL_END`, {
          taskId: task.id,
          value,
          result,
          resultType: typeof result,
          callDuration: `${(saveEditCallEnd - saveEditCallStart).toFixed(2)}ms`,
          timestamp: saveEditCallEnd
        });
        
        const totalTime = performance.now() - startTime;
        diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.handleSaveEdit - SAVE_EDIT_COMPLETE`, {
          taskId: task.id,
          result,
          totalTime: `${totalTime.toFixed(2)}ms`,
          taskPropAfter: task.responsibleParty || task.ResponsibleParty,
          taskPropAfterAlt: task.ResponsibleParty || task.responsibleParty,
          savedValue: value
        });
        
        // CRITICAL FIX: Update the last saved value to the new value
        // This allows syncEffect to detect when the optimistic update has propagated
        lastSavedValueRef.current = value;
        
        // CRITICAL FIX: Clear the saving flag after a short delay
        // This gives React time to process the optimistic update and re-render
        setTimeout(() => {
          isSavingRef.current = false;
          diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.handleSaveEdit - CLEARED_SAVING_FLAG`, {
            taskId: task.id,
            delay: '50ms'
          });
        }, 50);
        
        return result;
      } catch (error) {
        // On error, clear the saving flag immediately
        isSavingRef.current = false;
        lastSavedValueRef.current = null;
        diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.handleSaveEdit - ERROR`, {
          taskId: task.id,
          error: error.message
        }, 'error');
        throw error;
      }
    } else {
      isSavingRef.current = false;
      lastSavedValueRef.current = null;
      diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.handleSaveEdit - NO_SAVE_EDIT_FUNCTION`, {
        taskId: task.id
      }, 'error');
    }
  }, [selectedParties, saveEdit, task.id, task.responsibleParty, editValueRef, isEditing]);
  
  // DIAGNOSTIC: Log when handleSaveEdit callback is recreated
  useEffect(() => {
    diagnosticLogger.log(`MultiResponsiblePartySelector.handleSaveEdit - CALLBACK_RECREATED`, {
      taskId: task.id,
      selectedParties,
      selectedPartiesLength: selectedParties ? selectedParties.length : null,
      selectedPartiesStringified: selectedParties ? JSON.stringify(selectedParties) : 'null/undefined',
      timestamp: Date.now()
    });
  }, [selectedParties, saveEdit, task.id, task.responsibleParty, editValueRef, isEditing]);
  
  // Update selected parties when editing starts
  useEffect(() => {
    if (isEditing) {
      // When editing starts, initialize from task
      // CRITICAL FIX: Don't reset if we're in the middle of saving
      if (isSavingRef.current) {
        diagnosticLogger.log(`MultiResponsiblePartySelector: SKIPPED_INIT_ON_EDIT - saving in progress`);
        return;
      }
      
      // CRITICAL FIX: Check both lowercase and uppercase field names
      const parties = parseParties(task.responsibleParty || task.ResponsibleParty || '');
      setSelectedParties(parties);
      setInputValue('');
      setShowDropdown(false); // Don't auto-show dropdown, wait for user interaction
    }
  }, [isEditing, task.responsibleParty, task.ResponsibleParty, task.id]);
  
  // Calculate dropdown position when shown (useLayoutEffect to prevent shifting)
  useLayoutEffect(() => {
    const updatePosition = () => {
      if (showDropdown && editInputRef.current) {
        // Get the input field's exact position
        const inputRect = editInputRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const spaceBelow = viewportHeight - inputRect.bottom;
        const spaceAbove = inputRect.top;
        const dropdownMaxHeight = 256; // max-h-64 = 16rem = 256px
        const minWidth = 300;
        
        // Always try to position below first, only go above if absolutely necessary
        const positionAbove = spaceBelow < 100 && spaceAbove > spaceBelow; // Only if less than 100px below
        const availableHeight = positionAbove ? spaceAbove - 8 : spaceBelow - 8;
        
        // Calculate width - use input width but ensure minimum
        const dropdownWidth = Math.max(minWidth, inputRect.width);
        
        // Calculate left position - align exactly with input left edge
        let leftPos = inputRect.left;
        // Only adjust if it would go off screen
        if (leftPos + dropdownWidth > viewportWidth - 8) {
          leftPos = viewportWidth - dropdownWidth - 8;
        }
        if (leftPos < 8) {
          leftPos = 8;
        }
        
        // Position dropdown DIRECTLY below the input (or above if no space)
        setDropdownPosition({
          top: positionAbove 
            ? inputRect.top - Math.min(dropdownMaxHeight, availableHeight) - 4
            : inputRect.bottom + 2, // 2px gap directly below input bottom edge
          left: leftPos, // Aligned with input left edge
          width: dropdownWidth, // Match input width
          maxHeight: Math.min(dropdownMaxHeight, availableHeight)
        });
      } else {
        setDropdownPosition(null);
      }
    };
    
    // Small delay to ensure input is rendered
    const timeoutId = setTimeout(updatePosition, 0);
    
    // Recalculate on scroll or resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showDropdown]);
  
  // Helper functions - must be defined before useMemo that uses them
  const getUserDisplay = (user) => {
    return user.displayName || user.DisplayName || user.email || user.Email || user.mail || user.userPrincipalName || 'Unknown';
  };
  
  const getUserEmail = (user) => {
    return user.email || user.Email || user.mail || user.userPrincipalName || '';
  };
  
  // Filter users as user types
  const filteredUsers = useMemo(() => {
    if (!inputValue.trim()) {
      // Show first 15 users when no input
      return enterpriseUsers.slice(0, 15);
    }
    const searchLower = inputValue.toLowerCase();
    return enterpriseUsers.filter(user => {
      const name = (user.displayName || user.DisplayName || '').toLowerCase();
      const email = (user.email || user.Email || user.mail || user.userPrincipalName || '').toLowerCase();
      return name.includes(searchLower) || email.includes(searchLower);
    }).slice(0, 25); // Show more results when searching
  }, [enterpriseUsers, inputValue]);
  
  // Filter out already selected users
  const availableUsers = useMemo(() => {
    return filteredUsers.filter(user => {
      const userEmail = getUserEmail(user);
      return !selectedParties.includes(userEmail);
    });
  }, [filteredUsers, selectedParties]);
  
  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
        if (isEditing) {
          // Save current selection
          const value = selectedParties.join(', ');
          editValueRef.current = value;
          // CRITICAL FIX: Pass the fresh value directly to avoid stale closure
          handleSaveEdit({}, value);
        }
      }
    };
    
    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isEditing, selectedParties, editValueRef, handleSaveEdit]);
  
  const handleUserSelect = (user) => {
    const diagnosticId = `handleUserSelect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const userEmail = getUserEmail(user);
    
    diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.handleUserSelect - ENTRY`, {
      taskId: task.id,
      user,
      userEmail,
      selectedParties,
      selectedPartiesLength: selectedParties.length,
      selectedPartiesType: typeof selectedParties,
      selectedPartiesIsArray: Array.isArray(selectedParties),
      alreadyIncluded: selectedParties.includes(userEmail),
      currentInputValue: inputValue
    });
    
    if (!selectedParties.includes(userEmail)) {
      const updated = [...selectedParties, userEmail];
      const value = updated.join(', ');
      
      diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.handleUserSelect - BEFORE_STATE_UPDATE`, {
        taskId: task.id,
        selectedPartiesBefore: selectedParties,
        selectedPartiesBeforeLength: selectedParties.length,
        updated,
        updatedLength: updated.length,
        value,
        valueType: typeof value,
        valueLength: value.length,
        editValueRefCurrentBefore: editValueRef.current
      });
      
      setSelectedParties(updated);
      editValueRef.current = value;
      setInputValue(''); // Clear input after selection
      setShowDropdown(true); // Keep dropdown open for multiple selections
      
      diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.handleUserSelect - AFTER_STATE_UPDATE`, {
        taskId: task.id,
        value,
        editValueRefCurrentAfter: editValueRef.current,
        handleSaveEditType: typeof handleSaveEdit,
        handleSaveEditIsFunction: typeof handleSaveEdit === 'function',
        aboutToCallHandleSaveEdit: true,
        callParams: {
          options: {},
          overrideValue: value
        }
      });
      
      // CRITICAL FIX: Pass the fresh value directly to avoid stale closure
      // Save immediately when user is selected
      try {
        diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.handleUserSelect - CALLING_HANDLE_SAVE_EDIT`, {
          taskId: task.id,
          value,
          valueType: typeof value,
          valueStringified: JSON.stringify(value),
          options: {},
          overrideValue: value
        });
        
        handleSaveEdit({}, value);
        
        diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.handleUserSelect - HANDLE_SAVE_EDIT_CALLED`, {
          taskId: task.id,
          value,
          returnedImmediately: true
        });
      } catch (error) {
        diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.handleUserSelect - ERROR`, {
          taskId: task.id,
          error: error.message,
          stack: error.stack
        }, 'error');
        throw error;
      }
      
      // Focus input again
      setTimeout(() => {
        editInputRef.current?.focus();
      }, 0);
    } else {
      diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.handleUserSelect - SKIPPED_ALREADY_INCLUDED`, {
        taskId: task.id,
        userEmail,
        selectedParties
      });
    }
  };
  
  const handleRemoveParty = (partyToRemove, e) => {
    const diagnosticId = `handleRemoveParty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.handleRemoveParty - ENTRY`, {
      taskId: task.id,
      partyToRemove,
      selectedParties,
      selectedPartiesLength: selectedParties.length
    });
    
    e.stopPropagation();
    const updated = selectedParties.filter(p => p !== partyToRemove);
    const value = updated.join(', ');
    
    diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.handleRemoveParty - BEFORE_STATE_UPDATE`, {
      taskId: task.id,
      selectedPartiesBefore: selectedParties,
      updated,
      updatedLength: updated.length,
      value,
      valueType: typeof value,
      valueLength: value.length
    });
    
    setSelectedParties(updated);
    editValueRef.current = value;
    
    diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.handleRemoveParty - AFTER_STATE_UPDATE`, {
      taskId: task.id,
      value,
      aboutToCallHandleSaveEdit: true,
      delay: '100ms'
    });
    
    // CRITICAL FIX: Pass the fresh value directly to avoid stale closure
    // Auto-save when removing
    setTimeout(() => {
      diagnosticLogger.log(`${diagnosticId}: MultiResponsiblePartySelector.handleRemoveParty - CALLING_HANDLE_SAVE_EDIT`, {
        taskId: task.id,
        value,
        valueType: typeof value,
        valueLength: value.length
      });
      
      handleSaveEdit({}, value);
    }, 100);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If there's exactly one filtered available user, select it
      if (availableUsers.length === 1) {
        handleUserSelect(availableUsers[0]);
      } else if (availableUsers.length === 0 && inputValue.trim()) {
        // Allow typing free-form email if not found
        const newValue = inputValue.trim();
        if (!selectedParties.includes(newValue)) {
          const updated = [...selectedParties, newValue];
          setSelectedParties(updated);
          const value = updated.join(', ');
          editValueRef.current = value;
          setInputValue('');
          // CRITICAL FIX: Pass the fresh value directly to avoid stale closure
          setTimeout(() => handleSaveEdit({}, value), 100);
        }
      } else {
        // Save current selection
        const value = selectedParties.join(', ');
        editValueRef.current = value;
        setShowDropdown(false);
        // CRITICAL FIX: Pass the fresh value directly to avoid stale closure
        handleSaveEdit({}, value);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowDropdown(false);
      setInputValue('');
    } else if (e.key === 'Backspace' && inputValue === '' && selectedParties.length > 0) {
      // Remove last selected party on backspace when input is empty
      e.preventDefault();
      const updated = selectedParties.slice(0, -1);
      setSelectedParties(updated);
      editValueRef.current = updated.join(', ');
    } else if (e.key === 'Tab') {
      e.preventDefault(); // Prevent default tab behavior
      // Save on tab and move to next cell
      const value = selectedParties.join(', ');
      editValueRef.current = value;
      setShowDropdown(false);
      if (value !== (task.responsibleParty || task.ResponsibleParty || '')) {
        // CRITICAL FIX: Pass the fresh value directly to avoid stale closure
        // Save and get updated task, then move to next cell
        handleSaveEdit({ clearEditing: false, returnUpdatedTask: true }, value).then(updatedTask => {
          if (moveToNextCell) {
            if (updatedTask) {
              moveToNextCell(task.id, 'responsibleParty', updatedTask);
            } else {
              moveToNextCell(task.id, 'responsibleParty');
            }
          }
        });
      } else {
        // No change, just move to next cell
        if (moveToNextCell) {
          moveToNextCell(task.id, 'responsibleParty');
        }
      }
    } else if (e.key === 'ArrowDown' && availableUsers.length > 0) {
      e.preventDefault();
      // Focus first user in dropdown
      if (dropdownRef.current) {
        const firstButton = dropdownRef.current.querySelector('button');
        if (firstButton) firstButton.focus();
      }
    }
  };
  
  if (isEditing) {
    return (
      <div ref={containerRef} className="relative w-full">
        {/* Selected parties as chips */}
        <div className="flex flex-wrap gap-1 mb-1 min-h-[1.5rem]">
          {selectedParties.map((party, idx) => {
            // Try to find user info for display
            const user = enterpriseUsers.find(u => {
              const email = getUserEmail(u);
              return email.toLowerCase() === party.toLowerCase();
            });
            const displayName = user ? getUserDisplay(user) : party;
            
            return (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded text-xs font-medium"
              >
                <UserIcon className="w-3 h-3" />
                <span className="max-w-[150px] truncate">{displayName}</span>
                <button
                  type="button"
                  onClick={(e) => handleRemoveParty(party, e)}
                  className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors"
                  title="Remove"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
        
        {/* Input for searching/adding */}
        <input
          ref={editInputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            const newValue = e.target.value;
            setInputValue(newValue);
            setShowDropdown(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setShowDropdown(true);
          }}
          className={`w-full px-2 py-1 border-2 border-blue-500 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
          onClick={(e) => {
            e.stopPropagation();
            setShowDropdown(true);
          }}
          placeholder={selectedParties.length === 0 ? "Type to search users..." : "Add another user..."}
          autoComplete="off"
        />
        
        {/* Dropdown - Fixed positioning to escape modal overflow, positioned relative to input */}
        {showDropdown && dropdownPosition && (
          <div
            ref={dropdownRef}
            className="fixed z-[99999] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-2xl overflow-auto"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              maxHeight: `${dropdownPosition.maxHeight}px`,
              minWidth: '300px'
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="py-1">
              {enterpriseUsers && enterpriseUsers.length > 0 ? (
                availableUsers.length > 0 ? (
                  availableUsers.map(user => {
                    const userEmail = getUserEmail(user);
                    const userName = getUserDisplay(user);
                    const isExactMatch = userEmail.toLowerCase() === inputValue.toLowerCase() ||
                                        userName.toLowerCase() === inputValue.toLowerCase();
                    
                    return (
                      <button
                        key={user.id || userEmail}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleUserSelect(user);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors ${
                          isExactMatch ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <div className="font-medium text-gray-900 dark:text-white">{userName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{userEmail}</div>
                      </button>
                    );
                  })
                ) : inputValue.trim() ? (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    No users found. Press Enter to add "{inputValue}" as email
                  </div>
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    All users selected or no matches
                  </div>
                )
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  Loading users...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Display mode - show chips
  // Always derive directly from task prop to ensure immediate updates
  // CRITICAL FIX: Check both lowercase and uppercase field names for compatibility
  const displayResponsiblePartyValue = task.responsibleParty || task.ResponsibleParty || '';
  const displayParties = parseParties(displayResponsiblePartyValue);
  
  return (
    <div
      onClick={() => startEditing(task.id, 'responsibleParty', task.responsibleParty || task.ResponsibleParty || '')}
      className={`px-2 py-1 cursor-text hover:bg-blue-50 dark:hover:bg-gray-700 rounded min-h-[1.5rem] flex items-start gap-1 flex-wrap group transition-colors relative ${className}`}
      title="Click to edit"
    >
      {displayParties.length > 0 ? (
        displayParties.map((party, idx) => {
          const user = enterpriseUsers.find(u => {
            const email = getUserEmail(u);
            return email.toLowerCase() === party.toLowerCase();
          });
          const displayName = user ? getUserDisplay(user) : party;
          
          return (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded text-xs font-medium"
            >
              <UserIcon className="w-3 h-3" />
              <span className="max-w-[150px] truncate">{displayName}</span>
            </span>
          );
        })
      ) : (
        <span className="text-gray-400 italic">Click to add responsible parties</span>
      )}
      <div className="flex items-center gap-1 ml-auto">
        {isSaving && (
          <span className="inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" title="Saving..."></span>
        )}
        {isSaved && !isSaving && (
          <CheckIcon className="w-4 h-4 text-green-500 animate-pulse" title="Saved!" />
        )}
        <PencilIcon className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
      </div>
    </div>
  );
};

export default MultiResponsiblePartySelector;
