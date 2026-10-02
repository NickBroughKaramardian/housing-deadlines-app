import React, { useState, useCallback, useMemo, useRef } from 'react';
import { 
  CheckIcon, 
  ClockIcon, 
  TrashIcon,
  PlusIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import RecurringTaskRow from './components/RecurringTaskRow';
import MultiResponsiblePartySelector from './components/MultiResponsiblePartySelector';
import EditableCell from './components/EditableCell';
import NoteModal from './components/NoteModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import RecurrenceSelector from './components/RecurrenceSelector';
import BatchAddModal from './components/BatchAddModal';
import OperationLogModal from './components/OperationLogModal';
import { taskManager } from './services/taskManager';
import { runBatchImport, runBulkDelete, createTaskFromInput, generateAndSaveInstances } from './services/batchOperations';
import { useTasks } from './hooks/useTasks';
import { useUsers } from './hooks/useUsers';
import { useTaskSelection } from './hooks/useTaskSelection';
import { getTaskStatus, formatDisplayDate } from './utils/taskHelpers';
import { useAuth } from './Auth';

const createBulkDeleteInitialState = () => ({
  isOpen: false,
  mode: null,
  taskIds: [],
  items: [],
  title: '',
  message: '',
  confirmLabel: 'Delete'
});

// Column order for Tab navigation (status is excluded as it's not editable)
const COLUMN_ORDER = ['task', 'project', 'deadline', 'responsibleParty'];

function Database() {
  const { userProfile } = useAuth();

  // Tasks come from taskManager - the single source of truth (C8)
  const { tasks, isLoading } = useTasks();
  const { users: enterpriseUsers } = useUsers();

  // Editing state
  const [editingCell, setEditingCell] = useState(null);
  const editInputRef = useRef(null);
  const editValueRef = useRef(null);

  // Recurring task state
  const [expandedRecurringTasks, setExpandedRecurringTasks] = useState(new Set());
  const [saving, setSaving] = useState(new Set());
  const [savingFields, setSavingFields] = useState(new Map()); // Saving state per task+field
  const [savedFields, setSavedFields] = useState(new Map()); // Recently saved fields for animation
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [taskForRecurrence, setTaskForRecurrence] = useState(null);
  const recurrenceProcessingRef = useRef(false); // Double-submit guard (C5)

  // Modals
  const [showImportHistory, setShowImportHistory] = useState(false);
  const [noteModal, setNoteModal] = useState({ isOpen: false, task: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, taskId: null, taskName: null });
  const [bulkDeleteModal, setBulkDeleteModal] = useState(() => createBulkDeleteInitialState());
  const [showBatchAdd, setShowBatchAdd] = useState(false);

  // Sorting and search state
  const [sortField, setSortField] = useState('deadline');
  const [sortDirection, setSortDirection] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('');

  const closeBulkDeleteModal = useCallback(() => {
    setBulkDeleteModal(createBulkDeleteInitialState());
  }, []);

  const formatTaskForModal = useCallback((task) => ({
    id: task.id,
    name: task.title || task.Task || task.task || 'Untitled Task',
    project: task.project || task.Project || '',
    date: formatDisplayDate(task.deadline_date || task.deadline || task.Deadline)
  }), []);

  // ---------------------------------------------------------------------------
  // Editing
  // ---------------------------------------------------------------------------

  const getNextField = useCallback((currentField) => {
    const currentIndex = COLUMN_ORDER.indexOf(currentField);
    if (currentIndex === -1 || currentIndex === COLUMN_ORDER.length - 1) {
      return null;
    }
    return COLUMN_ORDER[currentIndex + 1];
  }, []);

  const startEditing = useCallback((taskId, field, currentValue) => {
    setEditingCell({ taskId, field });
    editValueRef.current = currentValue || '';
    setTimeout(() => {
      editInputRef.current?.focus();
      if (editInputRef.current && editInputRef.current.type === 'text') {
        editInputRef.current.select();
      }
    }, 0);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingCell(null);
  }, []);

  const moveToNextCell = useCallback((taskId, currentField, updatedTask = null) => {
    const nextField = getNextField(currentField);
    if (!nextField) return;

    const task = updatedTask || taskManager.getTaskById(taskId);
    if (!task) return;

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

    startEditing(taskId, nextField, nextValue);
  }, [getNextField, startEditing]);

  // Save an inline edit. taskManager owns the optimistic update and rollback;
  // this component just tracks per-field saving/saved indicators.
  const saveEdit = useCallback((taskId, field, newValue, options = {}) => {
    const { clearEditing = true, returnUpdatedTask = false } = options;

    // Status is auto-calculated and not editable
    if (field === 'status') {
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

    const savingKey = `${taskId}-${field}`;
    setSavingFields(prev => new Map(prev).set(savingKey, true));
    if (clearEditing) {
      setEditingCell(null);
    }

    taskManager.updateTask(taskId, updates)
      .then(() => {
        setSavedFields(prev => new Map(prev).set(savingKey, Date.now()));
        setTimeout(() => {
          setSavedFields(prev => {
            const next = new Map(prev);
            next.delete(savingKey);
            return next;
          });
        }, 2000);
      })
      .catch(error => {
        console.error('Database: Error saving edit:', error);
        alert(`Failed to save: ${error.message}`);
      })
      .finally(() => {
        setSavingFields(prev => {
          const next = new Map(prev);
          next.delete(savingKey);
          return next;
        });
      });

    // taskManager applies the optimistic update synchronously, so the updated
    // task is already available (used by Tab navigation)
    if (returnUpdatedTask) {
      return taskManager.getTaskById(taskId) || null;
    }
  }, []);

  const updateTask = useCallback(async (taskId, updates) => {
    setSaving(prev => new Set(prev).add(taskId));
    try {
      await taskManager.updateTask(taskId, updates);
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
  }, []);

  // ---------------------------------------------------------------------------
  // Delete / notes
  // ---------------------------------------------------------------------------

  const deleteTask = useCallback(async (taskId, skipConfirm = false) => {
    if (!skipConfirm) {
      const task = taskManager.getTaskById(taskId);
      setDeleteModal({ isOpen: true, taskId, taskName: task?.title || task?.task || 'this task' });
      return;
    }

    setDeleteModal({ isOpen: false, taskId: null, taskName: null });

    try {
      await taskManager.deleteTask(taskId);
    } catch (error) {
      console.error('Database: Error deleting task:', error);
      alert(`Failed to delete: ${error.message}`);
    }
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    const taskIdToDelete = deleteModal.taskId;
    setDeleteModal({ isOpen: false, taskId: null, taskName: null });
    if (taskIdToDelete) {
      deleteTask(taskIdToDelete, true);
    }
  }, [deleteModal, deleteTask]);

  const handleNoteSave = useCallback(async (taskId, noteContent) => {
    try {
      await taskManager.updateTask(taskId, { note: noteContent });
    } catch (error) {
      console.error('Database: Error saving note:', error);
      alert(`Failed to save note: ${error.message}`);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Recurrence
  // ---------------------------------------------------------------------------

  const handleRecurrenceDone = useCallback(async (recurrence) => {
    if (!taskForRecurrence) return;

    // Double-submit guard via ref (C5) - a property on the useCallback function
    // object was recreated every render and never actually guarded anything
    if (recurrenceProcessingRef.current) {
      return;
    }
    recurrenceProcessingRef.current = true;

    try {
      if (recurrence) {
        if (taskForRecurrence.id) {
          // Update existing task to add recurrence, then generate instances
          await taskManager.updateTask(taskForRecurrence.id, { recurrence });
          await generateAndSaveInstances({ ...taskForRecurrence, recurrence }, recurrence);
        } else {
          await generateAndSaveInstances(taskForRecurrence, recurrence);
        }
      } else {
        if (taskForRecurrence.id) {
          await taskManager.updateTask(taskForRecurrence.id, { recurrence: null });
        } else {
          await createTaskFromInput(taskForRecurrence);
        }
      }
      setShowRecurrenceModal(false);
      setTaskForRecurrence(null);
    } catch (error) {
      console.error('Database: Error creating task:', error);
      alert(`Failed to create task: ${error.message}`);
    } finally {
      setTimeout(() => {
        recurrenceProcessingRef.current = false;
      }, 2000);
    }
  }, [taskForRecurrence]);

  // ---------------------------------------------------------------------------
  // Batch add
  // ---------------------------------------------------------------------------

  const handleAddTask = useCallback(() => {
    setShowBatchAdd(true);
  }, []);

  const handleBatchAdd = useCallback(async (tasksToAdd) => {
    if (!tasksToAdd || !Array.isArray(tasksToAdd) || tasksToAdd.length === 0) {
      alert('Error: No tasks to add. Please try again.');
      return;
    }

    try {
      const result = await runBatchImport(tasksToAdd, {
        performedBy: userProfile?.displayName || userProfile?.email || 'Unknown'
      });
      if (result.errorCount > 0) {
        alert(`Batch add completed: ${result.successCount} task${result.successCount !== 1 ? 's' : ''} added successfully, ${result.errorCount} failed.`);
      }
    } catch (error) {
      console.error('Database: Error in batch add:', error);
      alert(`Failed to add some tasks: ${error.message || 'Please try again.'}`);
    }
  }, [userProfile]);

  // ---------------------------------------------------------------------------
  // Derived task lists
  // ---------------------------------------------------------------------------

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
        templates.push(task);
      } else if (task.templateId) {
        instanceTasks.push(task);
      } else {
        regular.push(task);
      }
    });

    return { recurringTemplates: templates, regularTasks: regular, instances: instanceTasks };
  }, [tasks]);

  // All tasks for RecurringTaskRow (templates + instances)
  const allTasksForRecurring = useMemo(() => {
    return [...recurringTemplates, ...instances];
  }, [recurringTemplates, instances]);

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

  // All currently visible/selectable task ids (templates + their instances +
  // filtered regular tasks). Used by select-all and the header checkbox (C10).
  const selectableTaskIds = useMemo(() => {
    const ids = new Set();
    filteredRecurringTemplates.forEach(template => {
      ids.add(template.id);
      instances.forEach(inst => {
        if (inst.templateId === template.id) ids.add(inst.id);
      });
    });
    sortedAndFilteredRegularTasks.forEach(task => ids.add(task.id));
    return ids;
  }, [filteredRecurringTemplates, instances, sortedAndFilteredRegularTasks]);

  // Visible tasks in display order (for shift+click range selection)
  const getAllVisibleTasksInOrder = useCallback(() => {
    const visibleTasks = [];

    filteredRecurringTemplates.forEach(template => {
      visibleTasks.push({ id: template.id, type: 'template', templateId: template.id });

      if (expandedRecurringTasks.has(template.id)) {
        const templateInstances = instances
          .filter(inst => inst.templateId === template.id)
          .sort((a, b) => {
            const dateA = new Date(a.deadline_date || a.deadline || 0);
            const dateB = new Date(b.deadline_date || b.deadline || 0);
            return dateA - dateB;
          });
        templateInstances.forEach(inst => {
          visibleTasks.push({ id: inst.id, type: 'instance', templateId: template.id });
        });
      }
    });

    sortedAndFilteredRegularTasks.forEach(task => {
      visibleTasks.push({ id: task.id, type: 'regular' });
    });

    return visibleTasks;
  }, [filteredRecurringTemplates, expandedRecurringTasks, instances, sortedAndFilteredRegularTasks]);

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------

  const {
    selectedTasks,
    selectedTaskIds,
    handleTaskSelection,
    selectAll: handleSelectAll,
    clearSelection: handleClearSelections
  } = useTaskSelection({
    getVisibleTasksInOrder: getAllVisibleTasksInOrder,
    recurringTemplates,
    instances,
    selectableIds: selectableTaskIds
  });

  // Header checkbox compares against the visible/selectable ids (C10)
  const allVisibleSelected = useMemo(() => {
    if (selectableTaskIds.size === 0) return false;
    for (const id of selectableTaskIds) {
      if (!selectedTaskIds.has(id)) return false;
    }
    return true;
  }, [selectableTaskIds, selectedTaskIds]);

  const areAllSelectedComplete = useMemo(() => {
    if (selectedTasks.length === 0) return false;
    const selectedTasksData = tasks.filter(t => selectedTaskIds.has(t.id));
    return selectedTasksData.length > 0 && selectedTasksData.every(t => t.completed === true);
  }, [selectedTasks, selectedTaskIds, tasks]);

  const areAllSelectedUrgent = useMemo(() => {
    if (selectedTasks.length === 0) return false;
    const selectedTasksData = tasks.filter(t => selectedTaskIds.has(t.id));
    return selectedTasksData.length > 0 &&
      selectedTasksData.every(t => (t.priority || t.Priority || 'Normal') === 'Urgent');
  }, [selectedTasks, selectedTaskIds, tasks]);

  // ---------------------------------------------------------------------------
  // Bulk actions
  // ---------------------------------------------------------------------------

  const handleBulkToggleComplete = useCallback(() => {
    const tasksToUpdate = tasks.filter(t => selectedTaskIds.has(t.id));
    if (tasksToUpdate.length === 0) return;
    const allComplete = areAllSelectedComplete;
    handleClearSelections();

    // Single batch update - taskManager applies the optimistic update (C3, C8)
    taskManager.batchUpdate(
      tasksToUpdate.map(task => ({ id: task.id, updates: { completed: !allComplete } }))
    ).catch(e => {
      console.error('Bulk complete error:', e);
      alert(`Failed to ${allComplete ? 'unmark' : 'mark'} some tasks: ${e.message}`);
    });
  }, [tasks, selectedTaskIds, areAllSelectedComplete, handleClearSelections]);

  const handleBulkToggleUrgent = useCallback(() => {
    const tasksToUpdate = tasks.filter(t => selectedTaskIds.has(t.id));
    if (tasksToUpdate.length === 0) return;
    const allUrgent = areAllSelectedUrgent;
    handleClearSelections();

    taskManager.batchUpdate(
      tasksToUpdate.map(task => ({
        id: task.id,
        updates: { priority: allUrgent ? 'Normal' : 'Urgent' }
      }))
    ).catch(e => {
      console.error('Bulk priority error:', e);
      if (e.failedTasks && e.successfulTasks) {
        alert(`Updated ${e.successfulTasks.length} task${e.successfulTasks.length !== 1 ? 's' : ''}, but ${e.failedTasks.length} failed. Please refresh and try again.`);
      } else {
        alert(`Failed to toggle priority for some tasks: ${e.message || 'Please try again.'}`);
      }
    });
  }, [tasks, selectedTaskIds, areAllSelectedUrgent, handleClearSelections]);

  const openBulkDeleteModal = useCallback(() => {
    const tasksToDelete = tasks.filter(t => selectedTaskIds.has(t.id));
    if (tasksToDelete.length === 0) return;

    setBulkDeleteModal({
      isOpen: true,
      mode: 'selected-tasks',
      taskIds: tasksToDelete.map(t => t.id),
      items: tasksToDelete.map(formatTaskForModal),
      title: `Delete ${tasksToDelete.length} Task${tasksToDelete.length !== 1 ? 's' : ''}`,
      message: `This will permanently delete ${tasksToDelete.length} selected task${tasksToDelete.length !== 1 ? 's' : ''}. This action cannot be undone.`,
      confirmLabel: 'Delete'
    });
  }, [tasks, selectedTaskIds, formatTaskForModal]);

  const handleBulkDeleteConfirm = useCallback(async () => {
    const modalData = bulkDeleteModal;
    closeBulkDeleteModal();

    if (modalData.mode !== 'selected-tasks' || !modalData.taskIds || modalData.taskIds.length === 0) {
      return;
    }

    handleClearSelections();

    try {
      const result = await runBulkDelete(modalData.taskIds, {
        performedBy: userProfile?.displayName || userProfile?.email || 'Unknown'
      });
      if (result.errors > 0) {
        alert(`Deleted ${result.success} task${result.success !== 1 ? 's' : ''} successfully. ${result.errors} task${result.errors !== 1 ? 's' : ''} failed to delete.`);
      }
    } catch (error) {
      console.error('Database: Bulk delete error:', error);
      alert(`Failed to delete some tasks: ${error.message}`);
    }
  }, [bulkDeleteModal, closeBulkDeleteModal, handleClearSelections, userProfile]);

  // ---------------------------------------------------------------------------
  // Misc derived values
  // ---------------------------------------------------------------------------

  const uniqueProjects = useMemo(() => {
    const projects = [...new Set(tasks.map(task => task.project).filter(Boolean))];
    return projects.sort();
  }, [tasks]);

  const handleSort = useCallback((field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  const editableCellProps = {
    editingCell,
    editInputRef,
    editValueRef,
    saveEdit,
    startEditing,
    cancelEditing,
    moveToNextCell,
    savingFields,
    savedFields
  };

  if (isLoading && tasks.length === 0) {
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
              onClick={() => setShowImportHistory(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              title="View operation logs"
            >
              <ClockIcon className="w-4 h-4" />
              Logs
            </button>
          <button
            onClick={handleAddTask}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 shadow-lg"
          >
            <PlusIcon className="w-4 h-4" />
            Add Tasks
          </button>
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
        <div className="overflow-x-auto scrollbar-themed">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
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
                {[
                  { field: 'task', label: 'Task' },
                  { field: 'project', label: 'Project' },
                  { field: 'deadline', label: 'Deadline' },
                  { field: 'responsibleParty', label: 'Responsible Party' },
                  { field: 'priority', label: 'Priority' },
                  { field: 'completed', label: 'Status' }
                ].map(({ field, label }) => (
                  <th 
                    key={field}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={(e) => {
                      // If clicking on chevron icon, sort; otherwise select all
                      if (e.target.closest('svg')) {
                        handleSort(field);
                      } else {
                        handleSelectAll();
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      {sortField === field && (
                        <span onClick={(e) => { e.stopPropagation(); handleSort(field); }} className="cursor-pointer">
                          {sortDirection === 'asc' ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
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
                  updateTask={updateTask}
                  deleteTask={deleteTask}
                  selectedTaskIds={selectedTaskIds}
                  toggleSelection={handleTaskSelection}
                  saving={saving}
                  isExpanded={expandedRecurringTasks.has(template.id)}
                  onExpandedChange={handleExpandedChange}
                  onNoteSave={handleNoteSave}
                  {...editableCellProps}
                />
              ))}
              
              {/* Regular Solo Tasks */}
              {sortedAndFilteredRegularTasks.map((task) => {
                const status = getTaskStatus(task);
                const isSelected = selectedTaskIds.has(task.id);
                const isSaving = saving.has(task.id);
                
                return (
                  <tr 
                    key={task.id} 
                    onClick={(e) => {
                      // Only select if clicking on non-interactive elements
                      const target = e.target;
                      const tagName = target.tagName.toLowerCase();
                      
                      const isInput = tagName === 'input' || target.closest('input');
                      const isButton = tagName === 'button' || target.closest('button');
                      const isSelect = tagName === 'select' || target.closest('select');
                      const editableCellSpan = target.closest('span.cursor-pointer');
                      const isEditableCell = editableCellSpan && editableCellSpan.classList.contains('cursor-pointer');
                      
                      if (!isInput && !isButton && !isSelect && !isEditableCell) {
                        // Prevent text selection on shift+click
                        if (e.shiftKey) {
                          e.preventDefault();
                        }
                        handleTaskSelection(task.id, e);
                      }
                    }}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer select-none ${
                      isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 shadow-sm' : ''
                    } ${isSaving ? 'opacity-75' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleTaskSelection(task.id, e);
                        }}
                        className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <EditableCell 
                        task={task} 
                        field="task" 
                        className="text-sm font-medium"
                        {...editableCellProps}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <EditableCell 
                        task={task} 
                        field="project" 
                        className="text-sm"
                        {...editableCellProps}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <EditableCell 
                        task={task} 
                        field="deadline" 
                        type="date"
                        className="text-sm"
                        {...editableCellProps}
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
                        status === 'Completed'
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
                          {`${allTasksForRecurring.filter(t => t.templateId === task.id).length} instances`}
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
                          onClick={() => {
                            const currentPriority = task.priority || task.Priority || 'Normal';
                            const newPriority = currentPriority === 'Urgent' ? 'Normal' : 'Urgent';
                            updateTask(task.id, { priority: newPriority });
                          }}
                          className={`p-2 rounded-lg transition-colors duration-200 ${
                            (task.priority || task.Priority || 'Normal') === 'Urgent'
                              ? 'bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                          title={(task.priority || task.Priority || 'Normal') === 'Urgent' ? 'Mark as normal priority' : 'Mark as urgent'}
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
          }}
          onDone={handleRecurrenceDone}
          initialTask={taskForRecurrence}
        />
      )}

      {/* Add Tasks Modal */}
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

      {/* Import History Modal */}
      <OperationLogModal
        isOpen={showImportHistory}
        onClose={() => setShowImportHistory(false)}
      />

      {/* Floating Bulk Actions Panel */}
      {selectedTasks.length > 0 && (
        <div className="fixed right-4 top-20 z-50 animate-in slide-in-from-right duration-200">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 backdrop-blur-sm min-w-[280px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {selectedTasks.length} selected
              </span>
              <button
                onClick={handleClearSelections}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Clear selection"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {/* Complete/Incomplete Button */}
              <button
                onClick={handleBulkToggleComplete}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  areAllSelectedComplete
                    ? 'bg-gray-500 hover:bg-gray-600 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                <CheckIcon className="w-4 h-4" />
                {areAllSelectedComplete ? 'Mark Incomplete' : 'Mark Complete'}
              </button>
              
              {/* Urgent/Normal Button */}
              <button
                onClick={handleBulkToggleUrgent}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  areAllSelectedUrgent
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                }`}
              >
                <ClockIcon className="w-4 h-4" />
                {areAllSelectedUrgent ? 'Mark Normal' : 'Mark Urgent'}
              </button>
              
              {/* Delete Button */}
              <button
                onClick={openBulkDeleteModal}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200"
              >
                <TrashIcon className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Database;
