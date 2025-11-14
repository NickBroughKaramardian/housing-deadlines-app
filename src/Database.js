import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  CheckIcon, 
  ClockIcon, 
  TrashIcon,
  PlusIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
// globalTaskStore removed - using TaskManager instead
import { azureTaskService } from './services/azureTaskService';
import { microsoftDataService } from './microsoftDataService';
import RecurringTaskRow from './components/RecurringTaskRow';
import MultiResponsiblePartySelector from './components/MultiResponsiblePartySelector';
import NoteModal from './components/NoteModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import RecurrenceSelector from './components/RecurrenceSelector';
import AddTaskChoiceModal from './components/AddTaskChoiceModal';
import BatchAddModal from './components/BatchAddModal';
import { diagnosticLogger, logStateChange } from './utils/diagnostics';
import { taskManager } from './services/taskManager';

const createBulkDeleteInitialState = () => ({
  isOpen: false,
  mode: null,
  taskIds: [],
  items: [],
  title: '',
  message: '',
  confirmLabel: 'Delete'
});

function Database() {
  const [tasks, setTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [enterpriseUsers, setEnterpriseUsers] = useState([]);
  
  // Editing state
  const [editingCell, setEditingCell] = useState(null);
  const editInputRef = useRef(null);
  const editValueRef = useRef(null);
  const inputValueRef = useRef(new Map()); // Track input values per task+field to prevent prop interference
  
  // Recurring task state
  const [expandedRecurringTasks, setExpandedRecurringTasks] = useState(new Set());
  const [saving, setSaving] = useState(new Set());
  const [savingFields, setSavingFields] = useState(new Map()); // Track saving state per task+field
  const [savedFields, setSavedFields] = useState(new Map()); // Track recently saved fields for animation
  const [newTaskRecurrence, setNewTaskRecurrence] = useState(null);
  const recentlyDeletedIdsRef = useRef(new Set()); // Track recently deleted task IDs to prevent reload
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [taskForRecurrence, setTaskForRecurrence] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showInitialLoader, setShowInitialLoader] = useState(true);
  
  
  // Note modal state
  const [noteModal, setNoteModal] = useState({ isOpen: false, task: null });
  
  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, taskId: null, taskName: null });
  const [bulkDeleteModal, setBulkDeleteModal] = useState(() => createBulkDeleteInitialState());
  const closeBulkDeleteModal = useCallback(() => {
    setBulkDeleteModal(createBulkDeleteInitialState());
  }, []);
  
  // Add task modal states
  const [showAddTaskChoice, setShowAddTaskChoice] = useState(false);
  const [showBatchAdd, setShowBatchAdd] = useState(false);
  
  // Sorting and search state
  const [sortField, setSortField] = useState('deadline');
  const [sortDirection, setSortDirection] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('');

  // Load tasks using TaskManager (single source of truth)
  // CRITICAL: This ensures we only show tasks that exist in the database
  const loadTasks = useCallback(async (silent = false, forceRefresh = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      
      // CRITICAL: Force refresh from database to ensure no phantom tasks
      if (forceRefresh || !taskManager.isInitialized) {
        await taskManager.initialize(forceRefresh);
      }
      
      // Get tasks from TaskManager (from memory, no API call)
      const allTasks = taskManager.getAllTasks();
      
      // CRITICAL: Filter out recently deleted tasks to prevent them from reappearing
      // CRITICAL: Also filter out unconfirmed optimistic tasks
      const filteredTasks = Array.isArray(allTasks) 
        ? allTasks.filter(task => {
            // Remove recently deleted tasks
            if (recentlyDeletedIdsRef.current.has(task.id)) {
              return false;
            }
            // Remove unconfirmed optimistic tasks (they should be confirmed by now)
            if (task._optimistic && !task._confirmed) {
              console.warn(`⚠️ Database: Removing unconfirmed optimistic task: ${task.id}`);
              return false;
            }
            return true;
          })
        : [];
      
      setTasks(filteredTasks);
      setHasLoaded(true);
      setTimeout(() => setShowInitialLoader(false), 200);
      
      // Performance: Log task count for monitoring
      if (!silent) {
        console.log(`✅ Database: Loaded ${filteredTasks.length} tasks from TaskManager`);
      }
    } catch (error) {
      console.error('Database: Error loading tasks:', error);
      setTasks([]);
      setHasLoaded(true);
      setTimeout(() => setShowInitialLoader(false), 200);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  // Load enterprise users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const users = await microsoftDataService.users.getEnterpriseUsers();
        setEnterpriseUsers(Array.isArray(users) ? users : []);
      } catch (error) {
        console.error('Database: Error loading users:', error);
        setEnterpriseUsers([]);
      }
    };
    loadUsers();
  }, []);

  // Subscribe to TaskManager events for instant updates
  useEffect(() => {
    // CRITICAL: Force refresh from database on mount to ensure no phantom tasks
    taskManager.initialize(true).then(() => {
      loadTasks(false, true);
      
      // Verify tasks match database (for debugging)
      taskManager.verifyTasks().then(isValid => {
        if (!isValid) {
          console.warn('⚠️ Database: Task verification failed on mount, forcing refresh');
          loadTasks(false, true);
        }
      }).catch(err => {
        console.error('Database: Error verifying tasks:', err);
      });
    }).catch(error => {
      console.error('Database: Failed to initialize TaskManager:', error);
      loadTasks(false, true);
    });

    // Subscribe to TaskManager events
    const unsubscribe = taskManager.subscribe(({ type, tasks: updatedTasks, task, taskId, ...data }) => {
      if (type === 'refreshed' || type === 'created' || type === 'updated' || type === 'deleted' || type === 'batchCreated' || type === 'batchUpdated' || type === 'batchDeleted') {
        // Reload tasks from TaskManager
        const allTasks = taskManager.getAllTasks();
        // CRITICAL: Filter out recently deleted and unconfirmed optimistic tasks
        const filteredTasks = Array.isArray(allTasks) 
          ? allTasks.filter(t => {
              if (recentlyDeletedIdsRef.current.has(t.id)) return false;
              if (t._optimistic && !t._confirmed) {
                console.warn(`⚠️ Database: Removing unconfirmed optimistic task: ${t.id}`);
                return false;
              }
              return true;
            })
          : [];
        setTasks(filteredTasks);
      }
      
      if (type === 'loading') {
        setIsLoading(data.isLoading);
      }
    });

    // Also listen to DOM events for cross-component communication
    const handleTaskDataChanged = (event) => {
      const { type, tasks: updatedTasks, task, taskId } = event.detail;
      if (type === 'refreshed' || type === 'created' || type === 'updated' || type === 'deleted' || type === 'batchCreated' || type === 'batchUpdated' || type === 'batchDeleted') {
        const allTasks = taskManager.getAllTasks();
        // CRITICAL: Filter out recently deleted and unconfirmed optimistic tasks
        const filteredTasks = Array.isArray(allTasks) 
          ? allTasks.filter(t => {
              if (recentlyDeletedIdsRef.current.has(t.id)) return false;
              if (t._optimistic && !t._confirmed) {
                console.warn(`⚠️ Database: Removing unconfirmed optimistic task: ${t.id}`);
                return false;
              }
              return true;
            })
          : [];
        setTasks(filteredTasks);
      }
    };

    window.addEventListener('taskDataChanged', handleTaskDataChanged);

    // Periodic verification (every 30 seconds) to catch any phantom tasks
    const verificationInterval = setInterval(() => {
      taskManager.verifyTasks().then(isValid => {
        if (!isValid) {
          console.warn('⚠️ Database: Periodic verification failed, refreshing from database');
          taskManager.refresh().then(() => {
            loadTasks(true, false); // Silent refresh
          });
        }
      }).catch(err => {
        console.error('Database: Error in periodic verification:', err);
      });
    }, 30000); // Every 30 seconds

    return () => {
      unsubscribe();
      window.removeEventListener('taskDataChanged', handleTaskDataChanged);
      clearInterval(verificationInterval);
    };
  }, [loadTasks]);

  // TaskManager handles normalization automatically - no duplicates should occur

  // Calculate task status
  const calculateStatus = useCallback((task) => {
    if (task.completed) return 'Complete';
    const deadline = task.deadline_date || task.deadline;
    if (!deadline) return 'Active';
    try {
      let date;
      if (typeof deadline === 'string' && deadline.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = deadline.split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else {
        const tempDate = new Date(deadline);
        date = new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate());
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) return 'Overdue';
      const daysUntil = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 7) return 'Due Soon';
      return 'Active';
    } catch {
      return 'Active';
    }
  }, []);

  // Format date for display
  const formatDeadlineDate = useCallback((dateStr) => {
    if (!dateStr) return '';
    try {
      let date;
      if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else {
        const tempDate = new Date(dateStr);
        date = new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate());
      }
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    } catch {
      return '';
    }
  }, []);

  const formatTaskForModal = useCallback((task) => ({
    id: task.id,
    name: task.title || task.Task || task.task || 'Untitled Task',
    project: task.project || task.Project || '',
    date: formatDeadlineDate(task.deadline_date || task.deadline || task.Deadline)
  }), [formatDeadlineDate]);

  // Convert responsible party emails to names
  const getResponsiblePartyNames = useCallback((responsibleParty) => {
    if (!responsibleParty || !enterpriseUsers || enterpriseUsers.length === 0) {
      return responsibleParty || 'Unassigned';
    }

    let emails = [];
    
    if (Array.isArray(responsibleParty)) {
      emails = responsibleParty.map(item => {
        if (typeof item === 'object' && item.LookupValue) {
          return item.LookupValue;
        }
        if (typeof item === 'object' && item.Email) {
          return item.Email;
        }
        return String(item);
      });
    } else if (typeof responsibleParty === 'string') {
      emails = responsibleParty.split(/[,;]/).map(email => email.trim()).filter(Boolean);
    } else {
      emails = [String(responsibleParty)];
    }

    const names = emails.map(email => {
      const user = enterpriseUsers.find(u => {
        const userEmail = u.mail || u.userPrincipalName || u.email || u.Email || '';
        return userEmail.toLowerCase() === email.toLowerCase();
      });
      
      if (user) {
        return user.displayName || user.DisplayName || email;
      }
      
      return email;
    });
    
    return names.join(', ');
  }, [enterpriseUsers]);

  // EditableCell component
  const EditableCell = useCallback(({ task, field, className, type = 'text', editingCell, enterpriseUsers, editInputRef, editValueRef, saveEdit, startEditing, statusDisplay, moveToNextCell, savingFields, savedFields }) => {
    const isEditing = editingCell?.taskId === task.id && editingCell?.field === field;
    const savingKey = `${task.id}-${field}`;
    const isSaving = savingFields?.has(savingKey);
    const isSaved = savedFields?.has(savingKey);
    
    // CRITICAL FIX: Always read the latest value directly from task prop
    // For 'project' field, check both 'project' and 'Project'
    let value = '';
    if (field === 'task') {
      value = task.title || task.Task || '';
    } else if (field === 'deadline') {
      value = task.deadline_date || task.deadline || task.Deadline || '';
    } else if (field === 'project') {
      value = task.project || task.Project || '';
    } else if (field === 'status' && statusDisplay) {
      value = statusDisplay;
    } else {
      value = task[field] || '';
    }
    
    // Get display value - for deadline, use the actual deadline value
    let displayValue = value;
    if (field === 'deadline' || field === 'deadline_date') {
      const deadlineValue = task.deadline_date || task.deadline || task.Deadline || '';
      displayValue = deadlineValue ? formatDeadlineDate(deadlineValue) : '';
    }
    
    // FIX #3: Use controlled input with locked value while editing
    // This prevents "Unassigned" from being inserted mid-type
    const inputKey = `${task.id}-${field}`;
    
    // Initialize or get locked input value
    if (isEditing) {
      // When editing starts, lock the value from editValueRef
      if (!inputValueRef.current.has(inputKey)) {
        const lockedValue = editValueRef.current !== null && editValueRef.current !== undefined 
          ? editValueRef.current 
          : value;
        inputValueRef.current.set(inputKey, lockedValue);
      }
    } else {
      // When not editing, clear the locked value and sync with prop
      if (inputValueRef.current.has(inputKey)) {
        inputValueRef.current.delete(inputKey);
      }
    }
    
    // Get current input value (locked if editing, otherwise from prop)
    const inputValue = isEditing 
      ? (inputValueRef.current.get(inputKey) || editValueRef.current || value)
      : value;
    
    if (isEditing) {
      // Status field is auto-calculated and not editable - should never reach here
      if (field === 'status') {
        // If somehow editing is triggered for status, just cancel it
        setEditingCell(null);
        return (
          <span className={className}>{displayValue}</span>
        );
      }
      
      // For date inputs, format value as YYYY-MM-DD
      // Get current value from ref (locked) or fallback to prop value
      const currentInputValue = inputValueRef.current.get(inputKey) || inputValue;
      let formattedValue = currentInputValue;
      if (type === 'date' && currentInputValue) {
        try {
          // If value is already in YYYY-MM-DD format, use it
          if (typeof inputValue === 'string' && inputValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            formattedValue = inputValue;
          } else {
            // Parse and format date
            const date = new Date(inputValue);
            if (!isNaN(date.getTime())) {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              formattedValue = `${year}-${month}-${day}`;
            }
          }
        } catch {
          formattedValue = '';
        }
      }
      
      return (
        <input
          ref={editInputRef}
          type={type}
          key={`${task.id}-${field}-editing`}
          value={formattedValue}
          onChange={(e) => {
            // FIX #3: Update locked input value directly
            // This prevents prop updates from interfering with typing
            const newValue = e.target.value;
            inputValueRef.current.set(inputKey, newValue);
            // Force re-render by toggling editingCell state
            setEditingCell(prev => prev ? { ...prev, _forceUpdate: Date.now() } : null);
          }}
          className={`${className} border border-blue-500 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
          onBlur={() => {
            // Get current value from input element (most reliable for controlled input)
            const currentValue = editInputRef.current?.value || inputValueRef.current.get(inputKey) || inputValue;
            const initialValue = editValueRef.current || value;
            if (currentValue !== initialValue) {
              saveEdit(task.id, field, currentValue);
            } else {
              setEditingCell(null);
            }
            // Clear locked value when done editing
            inputValueRef.current.delete(inputKey);
          }}
          onKeyDown={async (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const currentValue = editInputRef.current?.value || inputValueRef.current.get(inputKey) || inputValue;
              const initialValue = editValueRef.current || value;
              if (currentValue !== initialValue) {
                saveEdit(task.id, field, currentValue);
              } else {
                setEditingCell(null);
              }
              inputValueRef.current.delete(inputKey);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setEditingCell(null);
              inputValueRef.current.delete(inputKey);
            } else if (e.key === 'Tab') {
              e.preventDefault(); // Prevent default tab behavior
              // Save current cell and move to next
              const currentValue = editInputRef.current?.value || inputValueRef.current.get(inputKey) || inputValue;
              const initialValue = editValueRef.current || value;
              if (currentValue !== initialValue) {
                // Save and get updated task, then move to next cell
                const updatedTask = await saveEdit(task.id, field, currentValue, { clearEditing: false, returnUpdatedTask: true });
                inputValueRef.current.delete(inputKey);
                if (updatedTask) {
                  moveToNextCell(task.id, field, updatedTask);
                } else {
                  moveToNextCell(task.id, field);
                }
              } else {
                // No change, just move to next cell
                inputValueRef.current.delete(inputKey);
                moveToNextCell(task.id, field);
              }
            }
          }}
          autoFocus
        />
      );
    }
    
    // CRITICAL FIX: Use key prop to force re-render when value changes
    // This ensures the display value updates immediately after save
    const displayKey = field === 'project' ? `${task.id}-project-${task.project || task.Project || ''}` :
                      field === 'task' ? `${task.id}-task-${task.title || task.Task || ''}` :
                      field === 'deadline' ? `${task.id}-deadline-${task.deadline_date || task.deadline || task.Deadline || ''}` :
                      `${task.id}-${field}-${value}`;
    
    // Status field is auto-calculated and not editable
    const isEditable = field !== 'status';
    
    return (
      <span
        key={displayKey}
        className={`${className} ${isEditable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : 'cursor-default'} px-2 py-1 rounded relative inline-flex items-center gap-1`}
        onClick={isEditable ? () => {
          const deadlineValue = field === 'deadline' ? (task.deadline_date || task.deadline || task.Deadline || '') : value;
          startEditing(task.id, field, deadlineValue);
        } : undefined}
        title={isEditable ? "Click to edit" : "Status is auto-calculated"}
      >
        <span>{displayValue || (isEditable ? 'Click to edit' : '')}</span>
        {isSaving && (
          <span className="inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" title="Saving..."></span>
        )}
        {isSaved && !isSaving && (
          <CheckIcon className="w-4 h-4 text-green-500 animate-pulse" title="Saved!" />
        )}
      </span>
    );
  }, [formatDeadlineDate, savingFields, savedFields]);

  // Handle task selection
  const handleTaskSelection = useCallback((taskId) => {
    setSelectedTasks(prev => {
      if (prev.includes(taskId)) {
        return prev.filter(id => id !== taskId);
      } else {
        return [...prev, taskId];
      }
    });
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    const allTaskIds = tasks.map(t => t.id);
    setSelectedTasks(allTaskIds);
  }, [tasks]);

  // Handle clear selections
  const handleClearSelections = useCallback(() => {
    setSelectedTasks([]);
  }, []);

  // Column order for Tab navigation (status is excluded as it's not editable)
  const columnOrder = ['task', 'project', 'deadline', 'responsibleParty'];
  
  // Get next field in column order
  const getNextField = useCallback((currentField) => {
    const currentIndex = columnOrder.indexOf(currentField);
    if (currentIndex === -1 || currentIndex === columnOrder.length - 1) {
      return null; // No next field
    }
    return columnOrder[currentIndex + 1];
  }, []);
  
  // Start editing a cell
  const startEditing = useCallback((taskId, field, currentValue) => {
    setEditingCell({ taskId, field });
    // Store the initial value in editValueRef to prevent it from being overwritten during editing
    editValueRef.current = currentValue || '';
    setTimeout(() => {
      editInputRef.current?.focus();
      if (editInputRef.current && editInputRef.current.type === 'text') {
        editInputRef.current.select();
      }
    }, 0);
  }, []);
  
  // Move to next editable cell
  const moveToNextCell = useCallback(async (taskId, currentField, updatedTask = null) => {
    const nextField = getNextField(currentField);
    if (!nextField) return;
    
    // Use provided updatedTask if available, otherwise find from state
    let task = updatedTask;
    if (!task) {
      task = tasks.find(t => t.id === taskId);
    }
    if (!task) return;
    
    // Get the value for the next field (status is excluded as it's not editable)
    let nextValue = '';
    if (nextField === 'task') {
      nextValue = task.title || task.task || '';
    } else if (nextField === 'project') {
      nextValue = task.project || task.Project || '';
    } else if (nextField === 'deadline') {
      nextValue = task.deadline_date || task.deadline || task.Deadline || '';
    } else if (nextField === 'responsibleParty') {
      nextValue = task.responsibleParty || task.ResponsibleParty || '';
    }
    
    // Start editing the next field
    startEditing(taskId, nextField, nextValue);
  }, [tasks, getNextField, startEditing]);

  // Save edit with optimistic updates
  const saveEdit = useCallback(async (taskId, field, newValue, options = {}) => {
    const diagnosticId = `saveEdit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    
    // EXTENSIVE DIAGNOSTIC LOGGING: Log all parameter details
    diagnosticLogger.log(`${diagnosticId}: saveEdit - ENTRY_RAW`, {
      taskId,
      taskIdType: typeof taskId,
      field,
      fieldType: typeof field,
      newValue,
      newValueType: typeof newValue,
      newValueIsNull: newValue === null,
      newValueIsUndefined: newValue === undefined,
      newValueLength: newValue ? (typeof newValue === 'string' ? newValue.length : 'not-string') : null,
      newValueStringified: newValue ? JSON.stringify(newValue) : 'null/undefined',
      options,
      optionsType: typeof options,
      optionsIsObject: typeof options === 'object',
      optionsKeys: options ? Object.keys(options) : null,
      optionsStringified: JSON.stringify(options),
      tasksArrayLength: tasks.length,
      taskExists: !!tasks.find(t => t.id === taskId),
      callStack: new Error().stack.split('\n').slice(1, 6).join('\n')
    });
    
    diagnosticLogger.log(`${diagnosticId}: saveEdit - ENTRY`, {
      taskId,
      field,
      newValue,
      newValueType: typeof newValue,
      newValueLength: newValue ? (typeof newValue === 'string' ? newValue.length : 'not-string') : null,
      newValueStringified: newValue ? JSON.stringify(newValue) : 'null/undefined',
      options,
      optionsStringified: JSON.stringify(options),
      tasksArrayLength: tasks.length,
      taskExists: !!tasks.find(t => t.id === taskId)
    });
    
    const { clearEditing = true, returnUpdatedTask = false } = options;
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      diagnosticLogger.log(`${diagnosticId}: saveEdit - TASK_NOT_FOUND`, {
        taskId,
        availableTaskIds: tasks.map(t => t.id)
      }, 'error');
      return returnUpdatedTask ? null : undefined;
    }
    
    diagnosticLogger.log(`${diagnosticId}: saveEdit - TASK_FOUND`, {
      taskId,
      task: { ...task },
      currentFieldValue: task[field],
      currentTitle: task.title,
      currentDeadline: task.deadline_date || task.deadline,
      currentResponsibleParty: task.responsibleParty
    });
    
    // Mark field as saving
    const savingKey = `${taskId}-${field}`;
    const prevSavingFields = savingFields;
    setSavingFields(prev => {
      const next = new Map(prev).set(savingKey, true);
      diagnosticLogger.log(`${diagnosticId}: saveEdit - SET_SAVING_FIELDS`, {
        savingKey,
        prevSize: prev.size,
        nextSize: next.size,
        prevKeys: Array.from(prev.keys()),
        nextKeys: Array.from(next.keys())
      });
      return next;
    });
    
    // Optimistic update - update UI immediately
    // Status field is auto-calculated and not editable - reject any save attempts
    if (field === 'status') {
      diagnosticLogger.log(`${diagnosticId}: saveEdit - STATUS_FIELD_NOT_EDITABLE`, {
        taskId,
        field,
        warning: 'Status field is auto-calculated and cannot be edited'
      }, 'warn');
      return returnUpdatedTask ? null : undefined;
    }
    
    const updates = {};
    if (field === 'task') {
      updates.title = newValue;
    } else if (field === 'deadline') {
      updates.deadline_date = newValue;
    } else {
      updates[field] = newValue;
    }
    
    diagnosticLogger.log(`${diagnosticId}: saveEdit - UPDATES_CONSTRUCTED`, {
      taskId,
      field,
      newValue,
      newValueType: typeof newValue,
      newValueLength: newValue ? (typeof newValue === 'string' ? newValue.length : 'not-string') : null,
      newValueStringified: newValue ? JSON.stringify(newValue) : 'null/undefined',
      updates,
      updatesType: typeof updates,
      updatesKeys: Object.keys(updates),
      updatesStringified: JSON.stringify(updates),
      updatesFieldValue: updates[field],
      updatesFieldValueType: typeof updates[field],
      updatesFieldValueLength: updates[field] ? (typeof updates[field] === 'string' ? updates[field].length : 'not-string') : null,
      updatesFieldValueStringified: updates[field] ? JSON.stringify(updates[field]) : 'null/undefined',
      // For responsibleParty specifically
      isResponsibleParty: field === 'responsibleParty',
      responsiblePartyUpdate: updates.responsibleParty,
      responsiblePartyUpdateType: typeof updates.responsibleParty,
      responsiblePartyUpdateLength: updates.responsibleParty ? (typeof updates.responsibleParty === 'string' ? updates.responsibleParty.length : 'not-string') : null,
      responsiblePartyUpdateStringified: updates.responsibleParty ? JSON.stringify(updates.responsibleParty) : 'null/undefined'
    });
    
    // Create updated task immediately - use same pattern as updateTask
    // CRITICAL FIX: Always create a new object, even if values are the same
    // This ensures React detects the change and triggers re-renders
    const updatedTask = { ...task, ...updates };
    
    diagnosticLogger.log(`${diagnosticId}: saveEdit - UPDATED_TASK_CREATED`, {
      originalTask: { ...task },
      updatedTask: { ...updatedTask },
      changes: Object.keys(updates),
      taskReferenceChanged: task !== updatedTask,
      taskIdChanged: task.id !== updatedTask.id,
      valueChanged: JSON.stringify(task) !== JSON.stringify(updatedTask)
    });
    
    // Get current tasks state before update
    const tasksBeforeUpdate = [...tasks];
    const taskIndexBefore = tasksBeforeUpdate.findIndex(t => t.id === taskId);
    const taskBeforeUpdate = tasksBeforeUpdate[taskIndexBefore];
    
    // Update local state immediately (optimistic update) - use same pattern as updateTask
    // CRITICAL FIX: Force a new array reference to ensure React detects the change
    // This ensures React detects the change and triggers re-renders
    setTasks(prevTasks => {
      const updated = prevTasks.map(t => 
        t.id === taskId ? updatedTask : t
      );
      
      const taskIndexAfter = updated.findIndex(t => t.id === taskId);
      const taskAfterUpdate = updated[taskIndexAfter];
      
      // CRITICAL FIX: Always return a new array reference, even if contents are the same
      // This forces React to detect the change and trigger re-renders
      const newArray = [...updated];
      
      // Find the updated task for diagnostic logging
      const updatedTaskInArray = taskAfterUpdate;
      const fieldValueBefore = taskBeforeUpdate ? (field === 'task' ? taskBeforeUpdate.title : field === 'deadline' ? taskBeforeUpdate.deadline_date : field === 'project' ? taskBeforeUpdate.project : taskBeforeUpdate[field]) : null;
      const fieldValueAfter = updatedTaskInArray ? (field === 'task' ? updatedTaskInArray.title : field === 'deadline' ? updatedTaskInArray.deadline_date : field === 'project' ? updatedTaskInArray.project : updatedTaskInArray[field]) : null;
      
      diagnosticLogger.log(`${diagnosticId}: saveEdit - SET_TASKS_CALLED`, {
        prevTasksLength: prevTasks.length,
        updatedLength: updated.length,
        newArrayLength: newArray.length,
        taskIndexBefore,
        taskIndexAfter,
        taskBeforeUpdate: taskBeforeUpdate ? { ...taskBeforeUpdate } : null,
        taskAfterUpdate: updatedTaskInArray ? { ...updatedTaskInArray } : null,
        arrayReferenceChanged: prevTasks !== newArray,
        taskReferenceChanged: taskBeforeUpdate !== updatedTaskInArray,
        taskIdMatch: updatedTaskInArray?.id === taskId,
        field,
        fieldValueBefore,
        fieldValueAfter,
        valueChanged: fieldValueBefore !== fieldValueAfter,
        // For project field specifically
        projectBefore: field === 'project' ? (taskBeforeUpdate?.project || taskBeforeUpdate?.Project) : null,
        projectAfter: field === 'project' ? (updatedTaskInArray?.project || updatedTaskInArray?.Project) : null
      });
      
      return newArray;
    });
    
    // Clear editing state if requested (default: true)
    if (clearEditing) {
      diagnosticLogger.log(`${diagnosticId}: saveEdit - CLEARING_EDITING`, {
        editingCellBefore: editingCell,
        clearEditing
      });
      setEditingCell(null);
    }
    
    const optimisticUpdateTime = performance.now() - startTime;
    diagnosticLogger.log(`${diagnosticId}: saveEdit - OPTIMISTIC_UPDATE_COMPLETE`, {
      optimisticUpdateTime: `${optimisticUpdateTime.toFixed(2)}ms`,
      updatedTask: { ...updatedTask }
    });
    
    // Save to database using TaskManager (handles optimistic updates and event emission)
    const apiStartTime = performance.now();
    taskManager.updateTask(taskId, updates)
      .then((response) => {
        const apiTime = performance.now() - apiStartTime;
        
        // CRITICAL FIX: Update state with API response to ensure consistency
        // The API might normalize field names (e.g., project -> Project, responsibleParty -> ResponsibleParty), so we need to merge the response
        // Handle both wrapped (response.data) and unwrapped (response) responses
        const apiTask = response?.data || response;
        if (apiTask && typeof apiTask === 'object') {
          setTasks(prevTasks => {
            const updated = prevTasks.map(t => {
              if (t.id === taskId) {
                // Merge API response, ensuring both lowercase and uppercase field names are preserved
                const merged = { ...t, ...apiTask };
                // CRITICAL: If API returns uppercase field names, also set lowercase versions for consistency
                if (apiTask.ResponsibleParty && !apiTask.responsibleParty) {
                  merged.responsibleParty = apiTask.ResponsibleParty;
                }
                if (apiTask.Project && !apiTask.project) {
                  merged.project = apiTask.Project;
                }
                return merged;
              }
              return t;
            });
            const newArray = [...updated];
            
            const updatedTask = newArray.find(t => t.id === taskId);
            diagnosticLogger.log(`${diagnosticId}: saveEdit - STATE_UPDATED_FROM_API`, {
              taskId,
              apiTask,
              field,
              projectValue: apiTask.project || apiTask.Project,
              projectValueAlt: apiTask.Project || apiTask.project,
              responsiblePartyValue: apiTask.responsibleParty || apiTask.ResponsibleParty,
              responsiblePartyValueAlt: apiTask.ResponsibleParty || apiTask.responsibleParty,
              updatedTaskInState: updatedTask ? {
                id: updatedTask.id,
                project: updatedTask.project || updatedTask.Project,
                responsibleParty: updatedTask.responsibleParty || updatedTask.ResponsibleParty
              } : null
            });
            
            return newArray;
          });
        }
        
        diagnosticLogger.log(`${diagnosticId}: saveEdit - API_SUCCESS`, {
          taskId,
          updates,
          response,
          apiTime: `${apiTime.toFixed(2)}ms`,
          totalTime: `${(performance.now() - startTime).toFixed(2)}ms`
        });
        
        // Mark as saved (for visual feedback)
        setSavedFields(prev => {
          const next = new Map(prev).set(savingKey, Date.now());
          diagnosticLogger.log(`${diagnosticId}: saveEdit - SET_SAVED_FIELDS`, {
            savingKey,
            savedAt: Date.now()
          });
          return next;
        });
        
        // Remove saved indicator after 2 seconds
        setTimeout(() => {
          setSavedFields(prev => {
            const next = new Map(prev);
            next.delete(savingKey);
            diagnosticLogger.log(`${diagnosticId}: saveEdit - CLEAR_SAVED_INDICATOR`, {
              savingKey,
              cleared: !next.has(savingKey)
            });
            return next;
          });
        }, 2000);
      })
      .catch(error => {
        const apiTime = performance.now() - apiStartTime;
        diagnosticLogger.log(`${diagnosticId}: saveEdit - API_ERROR`, {
          taskId,
          updates,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          apiTime: `${apiTime.toFixed(2)}ms`,
          totalTime: `${(performance.now() - startTime).toFixed(2)}ms`
        }, 'error');
        
        console.error('Database: Error saving edit:', error);
        
        // Revert on error
        diagnosticLogger.log(`${diagnosticId}: saveEdit - REVERTING_ON_ERROR`, {
          taskId,
          originalTask: { ...task }
        });
        
        setTasks(prevTasks => {
          const reverted = prevTasks.map(t => 
            t.id === taskId ? task : t
          );
          diagnosticLogger.log(`${diagnosticId}: saveEdit - REVERTED_TASKS`, {
            revertedTask: reverted.find(t => t.id === taskId)
          });
          return reverted;
        });
        // TaskManager handles rollback automatically
        alert(`Failed to save: ${error.message}`);
      })
      .finally(() => {
        // Remove saving indicator
        setSavingFields(prev => {
          const next = new Map(prev);
          next.delete(savingKey);
          diagnosticLogger.log(`${diagnosticId}: saveEdit - CLEAR_SAVING_INDICATOR`, {
            savingKey,
            cleared: !next.has(savingKey)
          });
          return next;
        });
      });
    
    const totalTime = performance.now() - startTime;
    diagnosticLogger.log(`${diagnosticId}: saveEdit - EXIT`, {
      taskId,
      field,
      returnUpdatedTask,
      updatedTask: returnUpdatedTask ? { ...updatedTask } : null,
      totalTime: `${totalTime.toFixed(2)}ms`
    });
    
    // Return updated task if requested (for use in moveToNextCell)
    if (returnUpdatedTask) {
      return updatedTask;
    }
  }, [tasks, savingFields, editingCell]);

  // Update task with optimistic update
  const updateTask = useCallback(async (taskId, updates) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    setSaving(prev => new Set(prev).add(taskId));
    
    try {
      // Use TaskManager - handles optimistic updates and event emission
      await taskManager.updateTask(taskId, updates);
      // TaskManager will emit events, which will trigger our subscription to update state
    } catch (error) {
      console.error('Database: Error updating task:', error);
      alert(`Failed to update: ${error.message}`);
    } finally {
      setSaving(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  }, [tasks]);

  // Delete task using TaskManager
  const deleteTask = useCallback(async (taskId, skipConfirm = false) => {
    // FULL DIAGNOSTIC: Log all delete operations
    const diagnosticId = `DELETE_${taskId}_${Date.now()}`;
    console.group(`🔍 ${diagnosticId}: DELETE TASK DIAGNOSTIC`);
    console.log('Timestamp:', new Date().toISOString());
    console.log('Task ID:', taskId);
    console.log('Skip Confirm:', skipConfirm);
    console.log('Current Delete Modal State:', { ...deleteModal });
    console.log('Tasks Array Length:', tasks.length);
    console.log('Task in Array:', tasks.find(t => t.id === taskId));
    console.log('Task in TaskManager:', taskManager.getTaskById(taskId));
    console.log('Call Stack:', new Error().stack);
    console.groupEnd();
    
    diagnosticLogger.log(`${diagnosticId}: DELETE_TASK_START`, {
      taskId,
      skipConfirm,
      deleteModalState: { ...deleteModal },
      tasksArrayLength: tasks.length,
      taskFound: !!tasks.find(t => t.id === taskId),
      taskData: tasks.find(t => t.id === taskId)
    });
    
    if (!skipConfirm) {
      const task = tasks.find(t => t.id === taskId);
      diagnosticLogger.log(`${diagnosticId}: DELETE_TASK_OPENING_MODAL`, {
        taskId,
        taskFound: !!task,
        taskName: task?.title || task?.task || 'this task'
      });
      setDeleteModal({ isOpen: true, taskId, taskName: task?.title || task?.task || 'this task' });
      return;
    }
    
    // Find task from current state
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      console.warn('Database: Task not found for deletion:', taskId);
      diagnosticLogger.log(`${diagnosticId}: DELETE_TASK_NOT_FOUND`, {
        taskId,
        tasksArrayLength: tasks.length,
        allTaskIds: tasks.map(t => t.id)
      }, 'warn');
      // Close modal even if task not found
      setDeleteModal({ isOpen: false, taskId: null, taskName: null });
      return;
    }
    
    // Store task data for potential revert
    const taskToDelete = { ...task };
    
    diagnosticLogger.log(`${diagnosticId}: DELETE_TASK_OPTIMISTIC_UPDATE`, {
      taskId,
      taskData: taskToDelete,
      tasksBeforeLength: tasks.length
    });
    
    // Close modal immediately after starting deletion
    diagnosticLogger.log(`${diagnosticId}: DELETE_TASK_CLOSING_MODAL`, {
      taskId,
      modalStateBefore: { ...deleteModal }
    });
    setDeleteModal({ isOpen: false, taskId: null, taskName: null });
    
    // CRITICAL: Add task ID to recently deleted set to prevent it from being reloaded
    recentlyDeletedIdsRef.current.add(taskId);
    
    // Use TaskManager - handles optimistic updates, event emission, and rollback
    try {
      await taskManager.deleteTask(taskId);
      // TaskManager will emit events, which will trigger our subscription to update state
      // Also dispatch legacy event for backward compatibility
      window.dispatchEvent(new CustomEvent('taskDeleted', {
        detail: { taskId, taskData: taskToDelete }
      }));
      
      // Remove from recently deleted set after a delay
      setTimeout(() => {
        recentlyDeletedIdsRef.current.delete(taskId);
      }, 2000);
    } catch (error) {
      console.error('Database: Error deleting task:', error);
      diagnosticLogger.log(`${diagnosticId}: DELETE_TASK_ERROR`, {
        taskId,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      }, 'error');
      // TaskManager handles rollback automatically
      alert(`Failed to delete: ${error.message}`);
      // Remove from recently deleted set even on error
      recentlyDeletedIdsRef.current.delete(taskId);
    }
  }, [tasks, loadTasks, deleteModal]);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(() => {
    const diagnosticId = `DELETE_CONFIRM_${Date.now()}`;
    const taskIdToDelete = deleteModal.taskId;
    
    console.group(`🔍 ${diagnosticId}: DELETE CONFIRM DIAGNOSTIC`);
    console.log('Timestamp:', new Date().toISOString());
    console.log('Task ID to Delete:', taskIdToDelete);
    console.log('Delete Modal State:', { ...deleteModal });
    console.log('Task in Array:', tasks.find(t => t.id === taskIdToDelete));
    console.log('Call Stack:', new Error().stack);
    console.groupEnd();
    
    diagnosticLogger.log(`${diagnosticId}: DELETE_CONFIRM_START`, {
      taskId: taskIdToDelete,
      deleteModalState: { ...deleteModal },
      taskFound: !!tasks.find(t => t.id === taskIdToDelete)
    });
    
    if (taskIdToDelete) {
      // Close modal first to prevent double-click issues
      diagnosticLogger.log(`${diagnosticId}: DELETE_CONFIRM_CLOSING_MODAL`, {
        taskId: taskIdToDelete,
        modalStateBefore: { ...deleteModal }
      });
      setDeleteModal({ isOpen: false, taskId: null, taskName: null });
      
      // Call deleteTask directly - no setTimeout needed
      diagnosticLogger.log(`${diagnosticId}: DELETE_CONFIRM_CALLING_DELETE_TASK`, {
        taskId: taskIdToDelete,
        skipConfirm: true
      });
      deleteTask(taskIdToDelete, true);
    } else {
      diagnosticLogger.log(`${diagnosticId}: DELETE_CONFIRM_NO_TASK_ID`, {
        deleteModalState: { ...deleteModal }
      }, 'warn');
    }
  }, [deleteModal, deleteTask, tasks]);

  const handleBulkDeleteConfirm = useCallback(async () => {
    const modalData = bulkDeleteModal;
    closeBulkDeleteModal();

    if (!modalData.taskIds || modalData.taskIds.length === 0) {
      return;
    }

    const { mode, taskIds } = modalData;

    try {
      if (mode === 'selected-tasks') {
        setSelectedTasks([]);
        try {
          await taskManager.batchDelete(taskIds);
        } catch (error) {
          console.error('Database: Bulk delete error:', error);
          alert(`Failed to delete some tasks: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Database: Bulk deletion error:', error);
    }
  }, [bulkDeleteModal, closeBulkDeleteModal, loadTasks]);

  // Handle note save using TaskManager
  const handleNoteSave = useCallback(async (taskId, noteContent) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    try {
      // Use TaskManager - handles optimistic updates and event emission
      await taskManager.updateTask(taskId, { note: noteContent });
      // TaskManager will emit events, which will trigger our subscription to update state
    } catch (error) {
      console.error('Database: Error saving note:', error);
      alert(`Failed to save note: ${error.message}`);
      // TaskManager handles rollback automatically
    }
  }, [tasks]);

  // Create task with optimistic update
  const createTask = useCallback(async (taskData) => {
    try {
      // Ensure all required fields are present and properly formatted
      const formattedData = {
        title: taskData.title || taskData.Task || 'Untitled Task',
        project: taskData.project || taskData.Project || 'Unassigned',
        deadline_date: taskData.deadline_date || taskData.deadline || taskData.Deadline,
        responsibleParty: taskData.responsibleParty || taskData.ResponsibleParty || '',
        priority: taskData.priority || taskData.Priority || 'Normal',
        completed: taskData.completed || false
      };
      
      // Add note if provided (don't remove empty notes - they're optional)
      if (taskData.note !== undefined && taskData.note !== null) {
        formattedData.note = taskData.note;
      } else if (taskData.notes !== undefined && taskData.notes !== null) {
        formattedData.note = taskData.notes;
      }
      
      // Remove any undefined or null values (but keep empty strings for note)
      Object.keys(formattedData).forEach(key => {
        if (key === 'note') {
          // Keep note even if empty - it's a valid value
          if (formattedData[key] === undefined || formattedData[key] === null) {
            delete formattedData[key];
          }
        } else if (formattedData[key] === undefined || formattedData[key] === null || formattedData[key] === '') {
          delete formattedData[key];
        }
      });
      
      // Keep deadline_date even if empty for required validation
      if (!formattedData.deadline_date && (taskData.deadline_date || taskData.deadline || taskData.Deadline)) {
        formattedData.deadline_date = taskData.deadline_date || taskData.deadline || taskData.Deadline;
      }
      
      console.log('Database: Creating task with data:', formattedData);
      
      // Use TaskManager - handles optimistic updates and event emission
      const created = await taskManager.createTask(formattedData);
      // TaskManager will emit events, which will trigger our subscription to update state
      
      return created;
    } catch (error) {
      console.error('Database: Error creating task:', error);
      console.error('Database: Task data was:', taskData);
      // TaskManager handles rollback automatically
      throw error;
    }
  }, []);
  
  // Generate recurring instances based on recurrence pattern
  const generateRecurringInstances = useCallback((template, recurrence) => {
    if (!recurrence || !recurrence.pattern) return [];
    
    const instances = [];
    
    // Use parseDeadlineDate helper to avoid timezone shifts
    const { parseDeadlineDate } = require('./utils/taskHelpers');
    const deadlineStr = template.deadline_date || template.deadline || template.Deadline;
    const startDate = parseDeadlineDate(deadlineStr);
    if (!startDate || isNaN(startDate.getTime())) return [];
    
    // Calculate end date
    let endDate = new Date(startDate);
    if (recurrence.endDate) {
      endDate = new Date(recurrence.endDate);
    } else if (recurrence.maxOccurrences) {
      // Estimate end date based on max occurrences
      const interval = recurrence.interval || 1;
      if (recurrence.pattern === 'daily') {
        endDate.setDate(endDate.getDate() + (interval * recurrence.maxOccurrences));
      } else if (recurrence.pattern === 'weekly') {
        endDate.setDate(endDate.getDate() + (interval * 7 * recurrence.maxOccurrences));
      } else if (recurrence.pattern === 'monthly') {
        endDate.setMonth(endDate.getMonth() + (interval * recurrence.maxOccurrences));
      } else if (recurrence.pattern === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + (interval * recurrence.maxOccurrences));
      }
    } else {
      // When "Never" is selected (no endDate and no maxOccurrences), generate for 20 years ahead
      endDate.setFullYear(endDate.getFullYear() + 20);
    }
    
    let currentDate = new Date(startDate);
    const interval = recurrence.interval || 1;
    let instanceNumber = 1;
    // When "Never" is selected, set a high maxInstances to ensure we generate instances for the full 20 years
    // For monthly recurrence, 20 years = 240 months, so we need at least 240 instances
    // For daily recurrence, 20 years = ~7300 days, so we need at least 7300 instances
    // For weekly recurrence, 20 years = ~1040 weeks, so we need at least 1040 instances
    // For yearly recurrence, 20 years = 20 instances
    // Set to a safe high number to cover all cases
    const maxInstances = recurrence.maxOccurrences || (recurrence.endDate ? 100 : 10000);
    
    // Helper to get next occurrence date
    const getNextDate = (date, pattern, interval, daysOfWeek) => {
      const next = new Date(date);
      next.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
      
      if (pattern === 'daily') {
        next.setDate(next.getDate() + interval);
      } else if (pattern === 'weekly') {
        if (daysOfWeek && daysOfWeek.length > 0) {
          // Map day names to day numbers (0 = Sunday, 1 = Monday, etc.)
          const dayMap = { 
            sunday: 0, monday: 1, tuesday: 2, wednesday: 3, 
            thursday: 4, friday: 5, saturday: 6 
          };
          
          // Convert day names to day numbers
          const targetDays = daysOfWeek.map(day => dayMap[day.toLowerCase()]).filter(d => d !== undefined);
          
          if (targetDays.length === 0) {
            // Fallback: use same day of week
            next.setDate(next.getDate() + (7 * interval));
          } else {
            // Find the next occurrence of any selected day
            let daysToAdd = 0;
            let found = false;
            let weekCount = 0;
            
            // Start from tomorrow to ensure we get the NEXT occurrence
            next.setDate(next.getDate() + 1);
            
            while (!found && daysToAdd < 14) {
              const currentDayOfWeek = next.getDay();
              
              if (targetDays.includes(currentDayOfWeek)) {
                // Found a matching day
                if (weekCount === 0 || (interval === 1 && weekCount === 0)) {
                  // First week - use this day
                  found = true;
                } else if (weekCount >= interval) {
                  // We've skipped enough weeks
                  found = true;
                } else {
                  // Need to skip more weeks
                  next.setDate(next.getDate() + 7);
                  weekCount++;
                  daysToAdd += 7;
                  continue;
                }
              }
              
              if (!found) {
                next.setDate(next.getDate() + 1);
                daysToAdd++;
                
                // If we've gone through a full week, increment week count
                if (daysToAdd % 7 === 0) {
                  weekCount++;
                }
              }
            }
            
            // If interval > 1 and we found a day in the first week, skip to the right week
            if (found && interval > 1 && weekCount === 0) {
              next.setDate(next.getDate() + (7 * (interval - 1)));
            }
          }
        } else {
          // No specific days - use same day of week
          next.setDate(next.getDate() + (7 * interval));
        }
      } else if (pattern === 'monthly') {
        // CRITICAL FIX: Use local date components to avoid timezone shifts
        // Get the day of month from the original start date
        const dayOfMonth = startDate.getDate();
        
        // Calculate next month using local date components
        const currentYear = next.getFullYear();
        const currentMonth = next.getMonth();
        const nextMonth = currentMonth + interval;
        const nextYear = currentYear + Math.floor(nextMonth / 12);
        const finalMonth = nextMonth % 12;
        
        // Get the last day of the target month
        const lastDayOfMonth = new Date(nextYear, finalMonth + 1, 0).getDate();
        const targetDay = Math.min(dayOfMonth, lastDayOfMonth);
        
        // Set the date using local components to avoid timezone issues
        next.setFullYear(nextYear, finalMonth, targetDay);
        next.setHours(12, 0, 0, 0);
      } else if (pattern === 'yearly') {
        next.setFullYear(next.getFullYear() + interval);
      }
      
      next.setHours(12, 0, 0, 0); // Ensure noon to avoid timezone shifts
      return next;
    };
    
    // Generate instances
    // For weekly with specific days, generate all selected days in each interval week
    if (recurrence.pattern === 'weekly' && recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
      const dayMap = { 
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3, 
        thursday: 4, friday: 5, saturday: 6 
      };
      const targetDays = recurrence.daysOfWeek.map(day => dayMap[day.toLowerCase()]).filter(d => d !== undefined);
      
        if (targetDays.length > 0) {
          let weekOffset = 0;
          let instanceCount = 0;
          const originalDate = new Date(startDate);
          originalDate.setHours(12, 0, 0, 0);
          
          // Check if original date matches any selected day
          const originalDayOfWeek = originalDate.getDay();
          const shouldIncludeOriginal = targetDays.includes(originalDayOfWeek);
          
          // If original date matches a selected day, include it as instance 0
          if (shouldIncludeOriginal && instanceCount < maxInstances && originalDate <= endDate) {
            const instanceDateStr = originalDate.toISOString().split('T')[0];
            const instance = {
              title: template.title || template.Task,
              project: template.project || template.Project || 'Unassigned',
              deadline_date: instanceDateStr,
              responsibleParty: template.responsibleParty || template.ResponsibleParty || '',
              priority: template.priority || template.Priority || 'Normal',
              completed: false,
              templateId: template.id
            };
            instances.push(instance);
            instanceCount++;
          }
          
          while (instanceCount < maxInstances && weekOffset < 1000) {
            // Calculate the start of the week for this interval
            const weekStart = new Date(startDate);
            weekStart.setDate(weekStart.getDate() + (weekOffset * 7 * interval));
            weekStart.setHours(12, 0, 0, 0);
            
            // For each selected day in this week
            for (const targetDay of targetDays) {
              if (instanceCount >= maxInstances) break;
              
              // Find the date for this day in this week
              const currentDayOfWeek = weekStart.getDay();
              let daysToAdd = targetDay - currentDayOfWeek;
              if (daysToAdd < 0) daysToAdd += 7;
              
              const instanceDate = new Date(weekStart);
              instanceDate.setDate(instanceDate.getDate() + daysToAdd);
              instanceDate.setHours(12, 0, 0, 0);
              
              // Skip if this is the original date (already included as instance 0)
              if (instanceDate.getTime() === originalDate.getTime()) {
                continue;
              }
              
              // Check if we've exceeded end date
              if (instanceDate > endDate) {
                weekOffset = 10000; // Force exit
                break;
              }
              
              const instanceDateStr = instanceDate.toISOString().split('T')[0];
              
              const instance = {
                title: template.title || template.Task,
                project: template.project || template.Project || 'Unassigned',
                deadline_date: instanceDateStr,
                responsibleParty: template.responsibleParty || template.ResponsibleParty || '',
                priority: template.priority || template.Priority || 'Normal',
                completed: false,
                templateId: template.id
              };
              
              instances.push(instance);
              instanceCount++;
            }
            
            weekOffset++;
          }
        }
    } else {
      // For other patterns (daily, monthly, yearly), include original date as instance 0
      // Then generate subsequent instances
      let currentDate = new Date(startDate);
      currentDate.setHours(12, 0, 0, 0);
      let instanceNumber = 0;
      
      // Include the original date as the first instance (instance 0)
      if (instanceNumber < maxInstances && currentDate <= endDate) {
        const instanceDate = currentDate.toISOString().split('T')[0];
        const instance = {
          title: template.title || template.Task,
          project: template.project || template.Project || 'Unassigned',
          deadline_date: instanceDate,
          responsibleParty: template.responsibleParty || template.ResponsibleParty || '',
          priority: template.priority || template.Priority || 'Normal',
          completed: false,
          templateId: template.id
        };
        instances.push(instance);
        instanceNumber++;
      }
      
      // Generate subsequent instances
      while (instanceNumber < maxInstances) {
        // Get next occurrence
        currentDate = getNextDate(currentDate, recurrence.pattern, interval, recurrence.daysOfWeek);
        
        // Check if we've exceeded end date
        if (currentDate > endDate) break;
        
        const instanceDate = currentDate.toISOString().split('T')[0];
        
        const instance = {
          title: template.title || template.Task,
          project: template.project || template.Project || 'Unassigned',
          deadline_date: instanceDate,
          responsibleParty: template.responsibleParty || template.ResponsibleParty || '',
          priority: template.priority || template.Priority || 'Normal',
          completed: false,
          templateId: template.id // Link to template
        };
        
        instances.push(instance);
        instanceNumber++;
      }
    }
    
    return instances;
  }, []);

  // Generate and save recurring instances
  const generateAndSaveInstances = useCallback(async (template, recurrence) => {
    try {
      let templateTask = template;
      
      // If template already has an ID, it exists - use it
      // Otherwise, create a new template
      if (!template.id) {
        // Create the template task with recurrence data
        const templateData = {
          title: template.title || template.Task || 'Untitled Task',
          project: template.project || template.Project || 'Unassigned',
          deadline_date: template.deadline_date || template.deadline || template.Deadline,
          responsibleParty: template.responsibleParty || template.ResponsibleParty || '',
          priority: template.priority || template.Priority || 'Normal',
          completed: template.completed || false,
          recurrence: recurrence
        };
        
        // Remove any undefined or null values
        Object.keys(templateData).forEach(key => {
          if (templateData[key] === undefined || templateData[key] === null) {
            delete templateData[key];
          }
        });
        
        console.log('Database: Creating recurring task with data:', templateData);
        
        // Create the template using TaskManager
        templateTask = await taskManager.createTask(templateData);
        console.log('Database: Template created:', templateTask);
      } else {
        // Template already exists - use it (recurrence was already updated in handleRecurrenceDone)
        templateTask = { ...template, recurrence };
        console.log('Database: Using existing template:', templateTask.id);
      }
      
      // Generate instances on the frontend
      const instances = generateRecurringInstances(templateTask, recurrence);
      console.log('Database: Generated', instances.length, 'instances');
      
      // Optimistic update - add template and instances to UI immediately
      const allNewTasks = [templateTask, ...instances];
      setTasks(prevTasks => [...prevTasks, ...allNewTasks]);
      // TaskManager handles updates via events
      
      // Save all instances using TaskManager batch create
      await taskManager.batchCreate(instances);
      
      return templateTask;
    } catch (error) {
      console.error('Database: Error generating instances:', error);
      console.error('Database: Template data was:', template);
      console.error('Database: Recurrence data was:', recurrence);
      throw error;
    }
  }, [loadTasks, generateRecurringInstances]);

  // Handle recurrence selection
  const handleRecurrenceDone = useCallback(async (recurrence) => {
    if (!taskForRecurrence) return;
    
    // CRITICAL: Prevent double execution
    if (handleRecurrenceDone.processing) {
      console.warn('Database: handleRecurrenceDone already processing, ignoring duplicate call');
      return;
    }
    
    handleRecurrenceDone.processing = true;
    
    try {
      if (recurrence) {
        // If task already exists (has an id), update it to add recurrence
        if (taskForRecurrence.id) {
          // Update existing task to add recurrence
          await taskManager.updateTask(taskForRecurrence.id, { recurrence });
          
          // Generate and save instances
          const updatedTask = { ...taskForRecurrence, recurrence };
          await generateAndSaveInstances(updatedTask, recurrence);
        } else {
          // New task - create with recurrence
          await generateAndSaveInstances(taskForRecurrence, recurrence);
        }
      } else {
        // No recurrence - just create/update as solo task
        if (taskForRecurrence.id) {
          // Update existing task to remove recurrence if it had one
          await taskManager.updateTask(taskForRecurrence.id, { recurrence: null });
        } else {
          // Create new solo task
          await createTask(taskForRecurrence);
        }
      }
      setShowRecurrenceModal(false);
      setTaskForRecurrence(null);
      setNewTaskRecurrence(null);
      // No need to await - optimistic updates handle UI, background sync happens automatically
      loadTasks(true).catch(() => {});
    } catch (error) {
      console.error('Database: Error creating task:', error);
      alert(`Failed to create task: ${error.message}`);
    } finally {
      // Reset after a delay to allow processing to complete
      setTimeout(() => {
        handleRecurrenceDone.processing = false;
      }, 2000);
    }
  }, [taskForRecurrence, generateAndSaveInstances, createTask, loadTasks]);

  // Handle add new task - shows choice modal
  const handleAddTask = useCallback(() => {
    setShowAddTaskChoice(true);
  }, []);

  // Handle single add - creates a new single task directly with optimistic update
  const handleSingleAdd = useCallback(async () => {
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const deadlineStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const newTask = {
        title: 'New Task',
        project: 'Unassigned',
        deadline_date: deadlineStr,
        responsibleParty: '',
        completed: false
      };
      
      await createTask(newTask);
      // No need to await loadTasks - createTask handles optimistic update
    } catch (error) {
      console.error('Database: Error creating new task:', error);
      alert(`Failed to create task: ${error.message || 'Please try again.'}`);
    }
  }, [createTask]);

  // Handle batch add - creates multiple tasks
  const handleBatchAdd = useCallback(async (tasksToAdd) => {
    try {
      console.log('Database: handleBatchAdd called with tasks:', tasksToAdd);
      console.log('Database: Number of tasks received:', tasksToAdd?.length || 0);
      
      if (!tasksToAdd || !Array.isArray(tasksToAdd) || tasksToAdd.length === 0) {
        console.error('Database: ERROR - No tasks provided to handleBatchAdd!');
        alert('Error: No tasks to add. Please try again.');
        return;
      }
      
      // Separate recurring and non-recurring tasks
      const recurringTasks = [];
      const regularTasks = [];
      
      tasksToAdd.forEach(task => {
        // Check if task has recurring flag AND valid recurrence object
        if (task.recurring && task.recurrence && task.recurrence.pattern && task.recurrence.pattern !== 'none') {
          recurringTasks.push(task);
        } else {
          regularTasks.push(task);
        }
      });
      
      console.log('Database: Regular tasks:', regularTasks.length, regularTasks);
      console.log('Database: Recurring tasks:', recurringTasks.length, recurringTasks);
      
      // Create regular tasks sequentially
      let successCount = 0;
      let errorCount = 0;
      const errorMessages = [];
      
      for (const taskData of regularTasks) {
        try {
          console.log('Database: Creating regular task:', taskData);
          await createTask(taskData);
          successCount++;
        } catch (error) {
          console.error('Database: Error creating task in batch:', error, taskData);
          errorCount++;
          // Check if this is a CORS error
          const errorMsg = error.message || String(error);
          if (errorMsg.includes('CORS') || errorMsg.includes('Access-Control-Allow-Origin') || 
              (error.name === 'TypeError' && errorMsg.includes('Failed to fetch'))) {
            if (!errorMessages.includes('CORS')) {
              errorMessages.push('CORS configuration error detected. Please check backend CORS settings.');
            }
          } else {
            errorMessages.push(`Task "${taskData.title || taskData.Task || 'Unknown'}": ${errorMsg}`);
          }
        }
      }
      
      // Create recurring tasks using generateAndSaveInstances
      for (const taskData of recurringTasks) {
        try {
          console.log('Database: Creating recurring task:', taskData, 'with recurrence:', taskData.recurrence);
          await generateAndSaveInstances(taskData, taskData.recurrence);
          successCount++;
        } catch (error) {
          console.error('Database: Error creating recurring task in batch:', error, taskData);
          errorCount++;
          // Check if this is a CORS error
          const errorMsg = error.message || String(error);
          if (errorMsg.includes('CORS') || errorMsg.includes('Access-Control-Allow-Origin') || 
              (error.name === 'TypeError' && errorMsg.includes('Failed to fetch'))) {
            if (!errorMessages.includes('CORS')) {
              errorMessages.push('CORS configuration error detected. Please check backend CORS settings.');
            }
          } else {
            errorMessages.push(`Recurring task "${taskData.title || taskData.Task || 'Unknown'}": ${errorMsg}`);
          }
        }
      }
      
      console.log('Database: Batch add completed. Success:', successCount, 'Errors:', errorCount);
      
      if (errorCount > 0) {
        const errorDetails = errorMessages.length > 0 ? `\n\nError details:\n${errorMessages.slice(0, 3).join('\n')}${errorMessages.length > 3 ? `\n... and ${errorMessages.length - 3} more` : ''}` : '';
        alert(`Batch add completed: ${successCount} task${successCount !== 1 ? 's' : ''} added successfully, ${errorCount} failed.${errorDetails}\n\nNote: Tasks may appear in the UI due to optimistic updates, but they may not be saved to the server.`);
      } else {
        // Silent success - tasks are added optimistically
      }
    } catch (error) {
      console.error('Database: Error in batch add:', error);
      alert(`Failed to add some tasks: ${error.message || 'Please try again.'}`);
    }
  }, [createTask, generateAndSaveInstances]);


  // Toggle recurring task expansion
  const handleExpandedChange = useCallback((templateId, isExpanded) => {
    setExpandedRecurringTasks(prev => {
      const next = new Set(prev);
      if (isExpanded) {
        next.add(templateId);
      } else {
        next.delete(templateId);
      }
      return next;
    });
  }, []);

  // Separate recurring templates from regular tasks
  const { recurringTemplates, regularTasks, instances } = useMemo(() => {
    const templates = [];
    const regular = [];
    const instanceTasks = [];
    
    tasks.forEach(task => {
      if (task.recurrence) {
        // This is a recurring template
        templates.push(task);
      } else if (task.templateId) {
        // This is an instance of a recurring task
        instanceTasks.push(task);
      } else {
        // This is a regular solo task
        regular.push(task);
      }
    });
    
    // Diagnostic logging for project field updates
    const lampsonTask = regular.find(t => (t.title || t.Task || '').toLowerCase().includes('lampson'));
    if (lampsonTask) {
      diagnosticLogger.log(`regularTasks-useMemo: RECALCULATED`, {
        tasksLength: tasks.length,
        regularLength: regular.length,
        lampsonTaskId: lampsonTask.id,
        lampsonProject: lampsonTask.project,
        lampsonProjectAlt: lampsonTask.Project,
        taskReference: lampsonTask
      });
    }
    
    return { recurringTemplates: templates, regularTasks: regular, instances: instanceTasks };
  }, [tasks]);

  const totalDeadlineCount = useMemo(() => {
    return regularTasks.length + instances.length;
  }, [regularTasks, instances]);

  // Get all tasks for RecurringTaskRow (templates + instances)
  const allTasksForRecurring = useMemo(() => {
    return [...recurringTemplates, ...instances];
  }, [recurringTemplates, instances]);

  // Sorting and filtering logic
  const sortedAndFilteredRegularTasks = useMemo(() => {
    let filtered = [...regularTasks];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(task => 
        (task.title || task.task)?.toLowerCase().includes(searchLower) ||
        task.project?.toLowerCase().includes(searchLower) ||
        task.responsibleParty?.toLowerCase().includes(searchLower) ||
        (task.note || task.notes)?.toLowerCase().includes(searchLower)
      );
    }

    if (filterProject) {
      filtered = filtered.filter(task => 
        task.project?.toLowerCase() === filterProject.toLowerCase()
      );
    }

    filtered.sort((a, b) => {
      let aValue, bValue;
      switch (sortField) {
        case 'deadline':
          aValue = new Date(a.deadline_date || a.deadline || 0);
          bValue = new Date(b.deadline_date || b.deadline || 0);
          break;
        case 'task':
          aValue = (a.title || a.task || '').toLowerCase();
          bValue = (b.title || b.task || '').toLowerCase();
          break;
        case 'project':
          aValue = (a.project || '').toLowerCase();
          bValue = (b.project || '').toLowerCase();
          break;
        case 'responsibleParty':
          aValue = (a.responsibleParty || '').toLowerCase();
          bValue = (b.responsibleParty || '').toLowerCase();
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
  }, [regularTasks, searchTerm, filterProject, sortField, sortDirection]);

  // Filter recurring templates
  const filteredRecurringTemplates = useMemo(() => {
    let filtered = [...recurringTemplates];
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(template => 
        (template.title || template.task)?.toLowerCase().includes(searchLower) ||
        template.project?.toLowerCase().includes(searchLower)
      );
    }
    
    if (filterProject) {
      filtered = filtered.filter(template => 
        template.project?.toLowerCase() === filterProject.toLowerCase()
      );
    }
    
    return filtered;
  }, [recurringTemplates, searchTerm, filterProject]);

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

  // Convert selectedTasks array to Set for RecurringTaskRow
  const selectedTaskIds = useMemo(() => {
    return new Set(selectedTasks);
  }, [selectedTasks]);

  if (showInitialLoader) {
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
          {selectedTasks.length > 0 && (
            <div className="mt-1">
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                {selectedTasks.length} selected
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={handleAddTask}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 shadow-lg"
          >
            <PlusIcon className="w-4 h-4" />
            Add Task
          </button>
          {selectedTasks.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  const tasksToUpdate = tasks.filter(t => selectedTasks.includes(t.id));
                  
                  // Optimistic update - update UI immediately
                  setTasks(prevTasks => prevTasks.map(t => 
                    selectedTasks.includes(t.id) ? { ...t, completed: true } : t
                  ));
                  tasksToUpdate.forEach(task => {
                    // Use TaskManager
                    taskManager.updateTask(task.id, { completed: true }).catch(e => console.error(e));
                  });
                  setSelectedTasks([]);
                  
                  // TaskManager handles updates via events
                  taskManager.batchUpdate(
                    tasksToUpdate.map(task => ({ id: task.id, updates: { completed: true } }))
                  ).catch(e => {
                    console.error('Bulk complete error:', e);
                    alert(`Failed to mark some tasks complete: ${e.message}`);
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200"
              >
                <CheckIcon className="w-4 h-4" />
                Mark Complete ({selectedTasks.length})
              </button>
              <button
                onClick={async () => {
                  const tasksToUpdate = tasks.filter(t => selectedTasks.includes(t.id));
                  
                  // Use TaskManager batch update
                  setSelectedTasks([]);
                  taskManager.batchUpdate(
                    tasksToUpdate.map(task => ({
                      id: task.id,
                      updates: { priority: task.priority === 'Urgent' ? 'Normal' : 'Urgent' }
                    }))
                  ).catch(e => {
                    console.error('Bulk priority error:', e);
                    alert(`Failed to toggle priority for some tasks: ${e.message}`);
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors duration-200"
              >
                <ClockIcon className="w-4 h-4" />
                Mark Urgent ({selectedTasks.length})
              </button>
              <button
                onClick={() => {
                  const tasksToDelete = tasks.filter(t => selectedTasks.includes(t.id));
                  if (tasksToDelete.length === 0) {
                    return;
                  }

                  setBulkDeleteModal({
                    isOpen: true,
                    mode: 'selected-tasks',
                    taskIds: tasksToDelete.map(t => t.id),
                    items: tasksToDelete.map(formatTaskForModal),
                    title: `Delete ${tasksToDelete.length} Task${tasksToDelete.length === 1 ? '' : 's'}`,
                    message: `This will permanently delete ${tasksToDelete.length} selected task${tasksToDelete.length === 1 ? '' : 's'}. This action cannot be undone.`,
                    confirmLabel: 'Delete'
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200"
              >
                <TrashIcon className="w-4 h-4" />
                Delete ({selectedTasks.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        {/* Results Summary */}
        {(searchTerm || filterProject) && (
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Showing results
            {searchTerm && ` matching "${searchTerm}"`}
            {filterProject && ` in project "${filterProject}"`}
          </div>
        )}
      </div>

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
                    onChange={(e) => {
                      e.stopPropagation();
                      if (e.target.checked) {
                        handleSelectAll();
                      } else {
                        handleClearSelections();
                      }
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-600 rounded focus:ring-blue-500 cursor-pointer"
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
                  Recurrence
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {/* Recurring Templates */}
              {filteredRecurringTemplates.map((template) => (
                <RecurringTaskRow
                  key={template.id}
                  template={template}
                  tasks={allTasksForRecurring}
                  enterpriseUsers={enterpriseUsers}
                  editingCell={editingCell}
                  editInputRef={editInputRef}
                  editValueRef={editValueRef}
                  saveEdit={saveEdit}
                  startEditing={startEditing}
                  updateTask={updateTask}
                  deleteTask={deleteTask}
                  selectedTaskIds={selectedTaskIds}
                  toggleSelection={handleTaskSelection}
                  saving={saving}
                  calculateStatus={calculateStatus}
                  EditableCell={EditableCell}
                  MultiResponsiblePartySelector={MultiResponsiblePartySelector}
                  createTask={createTask}
                  loadTasks={loadTasks}
                  isExpanded={expandedRecurringTasks.has(template.id)}
                  onExpandedChange={handleExpandedChange}
                  onNoteSave={handleNoteSave}
                  getResponsiblePartyNames={getResponsiblePartyNames}
                  moveToNextCell={moveToNextCell}
                  savingFields={savingFields}
                  savedFields={savedFields}
                />
              ))}
              
              {/* Regular Solo Tasks */}
              {sortedAndFilteredRegularTasks.map((task) => {
                const status = calculateStatus(task);
                const isSelected = selectedTaskIds.has(task.id);
                const isSaving = saving.has(task.id);
                
                return (
                  <tr 
                    key={task.id} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                    } ${isSaving ? 'opacity-75' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          handleTaskSelection(task.id);
                        }}
                        className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <EditableCell 
                        task={task} 
                        field="task" 
                        className="text-sm font-medium"
                        editingCell={editingCell}
                        enterpriseUsers={enterpriseUsers}
                        editInputRef={editInputRef}
                        editValueRef={editValueRef}
                        saveEdit={saveEdit}
                        startEditing={startEditing}
                        moveToNextCell={moveToNextCell}
                        savingFields={savingFields}
                        savedFields={savedFields}
                      />
                    </td>
                    <td className="px-4 py-4" key={`project-${task.id}-${task.project || task.Project || ''}`}>
                      <EditableCell 
                        task={task} 
                        field="project" 
                        className="text-sm"
                        editingCell={editingCell}
                        enterpriseUsers={enterpriseUsers}
                        editInputRef={editInputRef}
                        editValueRef={editValueRef}
                        saveEdit={saveEdit}
                        startEditing={startEditing}
                        moveToNextCell={moveToNextCell}
                        savingFields={savingFields}
                        savedFields={savedFields}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <EditableCell 
                        task={task} 
                        field="deadline" 
                        type="date"
                        className="text-sm"
                        editingCell={editingCell}
                        enterpriseUsers={enterpriseUsers}
                        editInputRef={editInputRef}
                        editValueRef={editValueRef}
                        saveEdit={saveEdit}
                        startEditing={startEditing}
                        moveToNextCell={moveToNextCell}
                        savingFields={savingFields}
                        savedFields={savedFields}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <MultiResponsiblePartySelector
                        task={task}
                        className="text-sm"
                        editingCell={editingCell}
                        enterpriseUsers={enterpriseUsers}
                        editInputRef={editInputRef}
                        editValueRef={editValueRef}
                        saveEdit={saveEdit}
                        startEditing={startEditing}
                        moveToNextCell={moveToNextCell}
                        savingFields={savingFields}
                        savedFields={savedFields}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {task.priority || 'Normal'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        status === 'Complete'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : status === 'Overdue'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            : status === 'Due Soon'
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {task.recurrence ? (
                        <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                          {(() => {
                            const instanceCount = allTasksForRecurring.filter(t => t.templateId === task.id).length;
                            return `${instanceCount} instances`;
                          })()}
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setTaskForRecurrence(task);
                            setShowRecurrenceModal(true);
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors duration-200 flex items-center gap-1"
                          title="Make this task recurring"
                        >
                          <ArrowPathIcon className="w-3 h-3" />
                          Repeat
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setNoteModal({ isOpen: true, task })}
                          className={`p-2 rounded-lg transition-all duration-200 ${
                            (task.note || task.notes)
                              ? 'bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 shadow-sm ring-2 ring-purple-400 dark:ring-purple-500'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 hover:shadow-sm'
                          }`}
                          title={(task.note || task.notes) ? 'Edit note' : 'Add note'}
                        >
                          <DocumentTextIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateTask(task.id, { completed: !task.completed })}
                          className={`p-2 rounded-lg transition-colors duration-200 ${
                            task.completed 
                              ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                          title={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateTask(task.id, { priority: task.priority === 'Urgent' ? 'Normal' : 'Urgent' })}
                          className={`p-2 rounded-lg transition-colors duration-200 ${
                            task.priority === 'Urgent'
                              ? 'bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                          title={task.priority === 'Urgent' ? 'Mark as normal priority' : 'Mark as urgent'}
                        >
                          <ClockIcon className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteTask(task.id)}
                          className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors duration-200"
                          title="Delete task"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recurrence Modal */}
      {showRecurrenceModal && taskForRecurrence && (
        <RecurrenceSelector
          isOpen={showRecurrenceModal}
          onClose={() => {
            setShowRecurrenceModal(false);
            setTaskForRecurrence(null);
            setNewTaskRecurrence(null);
          }}
          onDone={handleRecurrenceDone}
          initialTask={taskForRecurrence}
        />
      )}

      {/* Add Task Choice Modal */}
      <AddTaskChoiceModal
        isOpen={showAddTaskChoice}
        onClose={() => setShowAddTaskChoice(false)}
        onSingleAdd={handleSingleAdd}
        onBatchAdd={() => {
          setShowBatchAdd(true);
        }}
      />

      {/* Batch Add Modal */}
      <BatchAddModal
        isOpen={showBatchAdd}
        onClose={() => setShowBatchAdd(false)}
        onSave={handleBatchAdd}
        enterpriseUsers={enterpriseUsers}
      />

      {/* Note Modal */}
      <NoteModal
        isOpen={noteModal.isOpen}
        onClose={() => setNoteModal({ isOpen: false, task: null })}
        task={noteModal.task}
        onSave={handleNoteSave}
      />

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, taskId: null, taskName: null })}
        onConfirm={handleDeleteConfirm}
        itemType="task"
        itemName={deleteModal.taskName}
      />

      <DeleteConfirmModal
        isOpen={bulkDeleteModal.isOpen}
        onClose={closeBulkDeleteModal}
        onConfirm={handleBulkDeleteConfirm}
        customTitle={bulkDeleteModal.title}
        customMessage={bulkDeleteModal.message}
        items={bulkDeleteModal.items}
        confirmLabel={bulkDeleteModal.confirmLabel}
        itemType="tasks"
      />

    </div>
  );
}

export default Database;
