import React, { useState, useMemo } from 'react';
import { 
  ChevronRightIcon, 
  ChevronDownIcon,
  CheckIcon,
  ClockIcon,
  TrashIcon,
  ArrowPathIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import DeleteConfirmModal from './DeleteConfirmModal';
import NoteModal from './NoteModal';
import EditableCell from './EditableCell';
import MultiResponsiblePartySelector from './MultiResponsiblePartySelector';
import { getTaskStatus } from '../utils/taskHelpers';

const RecurringTaskRow = ({ 
  template,
  tasks,
  enterpriseUsers,
  editingCell,
  editInputRef,
  editValueRef,
  saveEdit,
  startEditing,
  cancelEditing,
  updateTask,
  deleteTask,
  selectedTaskIds,
  toggleSelection,
  saving,
  isExpanded: controlledIsExpanded,
  onExpandedChange,
  onNoteSave,
  moveToNextCell,
  savingFields,
  savedFields
}) => {
  // Use controlled state if provided, otherwise use local state
  const [localIsExpanded, setLocalIsExpanded] = useState(false);
  const isExpanded = controlledIsExpanded !== undefined ? controlledIsExpanded : localIsExpanded;
  const setIsExpanded = (value) => {
    if (onExpandedChange) {
      onExpandedChange(template.id, value);
    } else {
      setLocalIsExpanded(value);
    }
  };
  
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, itemType: null, item: null });
  const [noteModal, setNoteModal] = useState({ isOpen: false, task: null });
  
  // SIMPLIFIED: Only show instances that actually exist in the database
  // No virtual instances - if it doesn't exist in the database, it doesn't exist in the app
  const allInstances = useMemo(() => {
    if (!template.recurrence) return [];
    
    // Simply get all tasks with this templateId from the database
    const instanceTasks = tasks.filter(t => t.templateId === template.id);
    
    // Sort by deadline date
    const parseAsLocal = (dateStr) => {
      if (!dateStr) return new Date(0);
      if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day, 0, 0, 0, 0);
      }
      const tempDate = new Date(dateStr);
      return new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate(), 0, 0, 0, 0);
    };
    
    return instanceTasks.sort((a, b) => {
      const dateA = parseAsLocal(a.deadline_date || a.deadline);
      const dateB = parseAsLocal(b.deadline_date || b.deadline);
      return dateA - dateB;
    });
  }, [template, tasks]);

  // Calculate progress for recurring instances
  const progress = useMemo(() => {
    if (allInstances.length === 0) return { completed: 0, total: 0, percentage: 0 };
    
    const completed = allInstances.filter(inst => {
      // Check if instance exists and is completed
      const existing = tasks.find(t => t.id === inst.id);
      return existing?.completed || inst.completed || false;
    }).length;
    
    const total = allInstances.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  }, [allInstances, tasks]);

  // Find next upcoming deadline or most recent past deadline
  const nextDeadline = useMemo(() => {
    if (allInstances.length === 0) return null;
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // Parse dates as local to avoid timezone shifts
    const parseAsLocal = (dateStr) => {
      if (!dateStr) return null;
      if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day, 0, 0, 0, 0);
      }
      const tempDate = new Date(dateStr);
      return new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate(), 0, 0, 0, 0);
    };
    
    // Map all instances to dates
    const instancesWithDates = allInstances
      .map(inst => {
        // All instances are actual tasks from the database
        const deadline = inst.deadline_date || inst.deadline;
        if (!deadline) return null;
        const date = parseAsLocal(deadline);
        if (!date) return null;
        return { inst, date };
      })
      .filter(item => item !== null)
      .sort((a, b) => a.date - b.date);
    
    if (instancesWithDates.length === 0) return null;
    
    // First try to find upcoming deadlines
    const upcoming = instancesWithDates.find(item => item.date >= now);
    if (upcoming) {
      return { date: upcoming.date, isPast: false };
    }
    
    // If no upcoming deadlines, get the most recent past deadline
    const mostRecent = instancesWithDates[instancesWithDates.length - 1];
    return { date: mostRecent.date, isPast: true };
  }, [allInstances]);

  const handleDeleteTemplate = async () => {
    // Close modal FIRST to prevent double-clicks
    setDeleteModal({ isOpen: false, itemType: null, item: null });
    
    // Delete all instances first, then the template
    const instanceDeletePromises = allInstances.map(instance => 
      deleteTask(instance.id, true).catch(error => {
        console.error(`RecurringTaskRow: Failed to delete instance ${instance.id}:`, error);
        // Continue with other deletions even if one fails
        return { id: instance.id, error: error.message };
      })
    );
    
    await Promise.allSettled(instanceDeletePromises);
    await deleteTask(template.id, true);
  };

  const handleDeleteInstance = async () => {
    // Capture the item ID immediately before any state updates
    const itemToDelete = deleteModal.item;
    if (!itemToDelete || !itemToDelete.id) {
      console.error('RecurringTaskRow: Cannot delete - item or item.id is missing', deleteModal);
      setDeleteModal({ isOpen: false, itemType: null, item: null });
      return;
    }
    
    const instanceId = itemToDelete.id;
    
    // Close modal FIRST to prevent double-clicks
    setDeleteModal({ isOpen: false, itemType: null, item: null });
    
    // Delete instance directly (modal already confirmed); keep dropdown open
    await deleteTask(instanceId, true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      let date;
      if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else if (typeof dateStr === 'string' && dateStr.includes('T')) {
        const datePart = dateStr.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
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
  };

  return (
    <>
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, itemType: null, item: null })}
        onConfirm={deleteModal.itemType === 'template' ? handleDeleteTemplate : handleDeleteInstance}
        itemType={deleteModal.itemType}
        itemName={deleteModal.itemType === 'template' ? (template.title || template.task) : (deleteModal.item?.title || deleteModal.item?.task)}
        itemDate={deleteModal.itemType === 'instance' ? formatDate(deleteModal.item?.deadline_date || deleteModal.item?.deadline) : null}
      />
      {/* Template row - neutral header */}
      <tr 
        onClick={(e) => {
          // Only select if clicking on non-interactive elements
          const target = e.target;
          const tagName = target.tagName.toLowerCase();
          
          // Prevent clicks on interactive elements
          const isInput = tagName === 'input' || target.closest('input');
          const isButton = tagName === 'button' || target.closest('button');
          const isSelect = tagName === 'select' || target.closest('select');
          // Check if clicking on EditableCell (has cursor-pointer class and is clickable for editing)
          const editableCellSpan = target.closest('span.cursor-pointer');
          const isEditableCell = editableCellSpan && editableCellSpan.classList.contains('cursor-pointer');
          
          // Allow clicking on empty td space or non-interactive elements within td
          if (!isInput && !isButton && !isSelect && !isEditableCell) {
            // Prevent text selection on shift+click
            if (e.shiftKey) {
              e.preventDefault();
            }
            toggleSelection(template.id, e);
          }
        }}
        className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer select-none ${
          selectedTaskIds.has(template.id) 
            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 shadow-sm' 
            : 'bg-gray-50 dark:bg-gray-800/50'
        } ${saving.has(template.id) ? 'opacity-75' : ''}`}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              title={isExpanded ? 'Collapse instances' : 'Expand instances'}
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronRightIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
            <input 
              type="checkbox"
              checked={selectedTaskIds.has(template.id)}
              onChange={(e) => {
                e.stopPropagation();
                toggleSelection(template.id, e);
              }}
              className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 cursor-pointer"
            />
          </div>
        </td>
        <td className="px-4 py-3">
          <EditableCell 
            task={template} 
            field="task" 
            className="text-sm font-medium"
            editingCell={editingCell}
            editInputRef={editInputRef}
            editValueRef={editValueRef}
            saveEdit={saveEdit}
            startEditing={startEditing}
            cancelEditing={cancelEditing}
            moveToNextCell={moveToNextCell}
            savingFields={savingFields}
            savedFields={savedFields}
          />
        </td>
        <td className="px-4 py-3">
          <EditableCell 
            task={template} 
            field="project" 
            className="text-sm"
            editingCell={editingCell}
            editInputRef={editInputRef}
            editValueRef={editValueRef}
            saveEdit={saveEdit}
            startEditing={startEditing}
            cancelEditing={cancelEditing}
            moveToNextCell={moveToNextCell}
            savingFields={savingFields}
            savedFields={savedFields}
          />
        </td>
        <td className="px-4 py-3">
          {progress.percentage === 100 ? (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Complete
            </span>
          ) : nextDeadline ? (
            nextDeadline.isPast ? (
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Past due
              </span>
            ) : (
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {(() => {
                  // nextDeadline.date is a Date object, but ensure it's using local components
                  const year = nextDeadline.date.getFullYear();
                  const month = nextDeadline.date.getMonth();
                  const day = nextDeadline.date.getDate();
                  const localDate = new Date(year, month, day);
                  return localDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
                })()}
              </span>
            )
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500 italic">
              Recurring template
            </span>
          )}
        </td>
            <td className="px-4 py-3">
              <MultiResponsiblePartySelector
                task={template}
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
        <td className="px-4 py-3">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {template.priority || 'Normal'}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
              progress.percentage === 100
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
            }`}>
              {progress.percentage === 100 ? 'Complete' : 'Active'}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-full">
              <ArrowPathIcon className="w-3 h-3" />
              Recurring
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
            {allInstances.length} instances
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {/* Progress Bar */}
            <div className="flex-1 min-w-[120px]">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 dark:bg-blue-600 transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {progress.completed}/{progress.total}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                {progress.percentage}% complete
              </div>
            </div>
            <button 
              onClick={() => {
                // For templates, show modal since it deletes all instances
                setDeleteModal({ isOpen: true, itemType: 'template', item: template });
              }}
              className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-all duration-200 hover:shadow-sm"
              title="Delete template and all instances"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>

      {/* Instance rows - indented when expanded */}
      {isExpanded && allInstances.map((instance) => {
        // All instances are actual tasks from the database - no virtual instances
        const displayTask = instance;
        
        const status = getTaskStatus(displayTask);
        const isSelected = selectedTaskIds.has(instance.id);
        const isPastDue = status === 'Overdue';
        const isComplete = status === 'Completed';
        const isFaded = isPastDue || isComplete;
        
        return (
          <tr 
            key={instance.id}
            onClick={(e) => {
              // Only select if clicking on non-interactive elements
              const target = e.target;
              const tagName = target.tagName.toLowerCase();
              
              // Prevent clicks on interactive elements
              const isInput = tagName === 'input' || target.closest('input');
              const isButton = tagName === 'button' || target.closest('button');
              const isSelect = tagName === 'select' || target.closest('select');
              // Check if clicking on EditableCell (has cursor-pointer class and is clickable for editing)
              const editableCellSpan = target.closest('span.cursor-pointer');
              const isEditableCell = editableCellSpan && editableCellSpan.classList.contains('cursor-pointer');
              
              // Allow clicking on empty td space or non-interactive elements within td
              if (!isInput && !isButton && !isSelect && !isEditableCell) {
                // Prevent text selection on shift+click
                if (e.shiftKey) {
                  e.preventDefault();
                }
                toggleSelection(instance.id, e);
              }
            }}
            className={`hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors cursor-pointer select-none ${
              isSelected 
                ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 shadow-sm' 
                : 'bg-gray-100/60 dark:bg-gray-700/30 border-l-4 border-blue-400 dark:border-blue-500'
            } ${saving.has(instance.id) ? 'opacity-75' : ''} ${
              isFaded ? 'opacity-50' : ''
            }`}
          >
            <td className="px-4 py-3">
              <div className="flex items-center gap-2 pl-8">
                <input 
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSelection(instance.id, e);
                  }}
                  className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>
            </td>
            <td className="px-4 py-3 pl-8">
              <EditableCell 
                task={displayTask} 
                field="task" 
                className="text-sm font-medium"
                editingCell={editingCell}
                editInputRef={editInputRef}
                editValueRef={editValueRef}
                saveEdit={saveEdit}
                startEditing={startEditing}
                cancelEditing={cancelEditing}
                moveToNextCell={moveToNextCell}
                savingFields={savingFields}
                savedFields={savedFields}
              />
            </td>
            <td className="px-4 py-3 pl-8">
              <EditableCell 
                task={displayTask} 
                field="project" 
                className="text-sm"
                editingCell={editingCell}
                editInputRef={editInputRef}
                editValueRef={editValueRef}
                saveEdit={saveEdit}
                startEditing={startEditing}
                cancelEditing={cancelEditing}
                moveToNextCell={moveToNextCell}
                savingFields={savingFields}
                savedFields={savedFields}
              />
            </td>
            <td className="px-4 py-3 pl-8">
              {editingCell?.taskId === instance.id && editingCell?.field === 'deadline' ? (
                <EditableCell 
                  task={displayTask} 
                  field="deadline" 
                  className="text-sm" 
                  type="date"
                  editingCell={editingCell}
                  editInputRef={editInputRef}
                  editValueRef={editValueRef}
                  saveEdit={saveEdit}
                  startEditing={startEditing}
                  cancelEditing={cancelEditing}
                  moveToNextCell={moveToNextCell}
                  savingFields={savingFields}
                  savedFields={savedFields}
                />
              ) : (
                <span 
                  className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded"
                  onClick={() => {
                    const deadline = displayTask.deadline_date || displayTask.deadline || instance.deadline_date || instance.deadline || '';
                    startEditing(instance.id, 'deadline', deadline);
                  }}
                  title="Click to edit deadline"
                >
                  {(() => {
                    const deadline = displayTask.deadline_date || displayTask.deadline || instance.deadline_date || instance.deadline;
                    if (!deadline) return '';
                    try {
                      // CRITICAL: Parse date as LOCAL date, not UTC, to avoid timezone shifts
                      let date;
                      if (typeof deadline === 'string' && deadline.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        // YYYY-MM-DD format - parse as local date components
                        const [year, month, day] = deadline.split('-').map(Number);
                        date = new Date(year, month - 1, day); // Local date, no timezone conversion
                      } else if (typeof deadline === 'string' && deadline.includes('T')) {
                        // ISO string with time - extract date part and parse as local
                        const datePart = deadline.split('T')[0];
                        const [year, month, day] = datePart.split('-').map(Number);
                        date = new Date(year, month - 1, day);
                      } else {
                        // Fallback: parse as Date but use local components
                        const tempDate = new Date(deadline);
                        date = new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate());
                      }
                      if (isNaN(date.getTime())) return '';
                      return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
                    } catch {
                      return '';
                    }
                  })()}
                </span>
              )}
            </td>
            <td className="px-4 py-3 pl-8">
              <MultiResponsiblePartySelector
                task={displayTask}
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
            <td className="px-4 py-3 pl-8">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {(displayTask.priority || template.priority) || 'Normal'}
              </span>
            </td>
            <td className="px-4 py-3 pl-8">
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
            <td className="px-4 py-3 pl-8">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Instance
              </span>
            </td>
            <td className="px-4 py-3 pl-8">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setNoteModal({ isOpen: true, task: displayTask })}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    (displayTask.note || displayTask.notes)
                      ? 'bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 shadow-sm ring-2 ring-purple-400 dark:ring-purple-500'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 hover:shadow-sm'
                  }`}
                  title={(displayTask.note || displayTask.notes) ? 'Edit note' : 'Add note'}
                >
                  <DocumentTextIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => {
                    // All instances are actual tasks from the database - just update
                    await updateTask(instance.id, { completed: !instance.completed });
                    // No need to call loadTasks - updateTask handles optimistic updates
                  }}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    displayTask.completed
                      ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 hover:shadow-sm'
                  }`}
                  title={displayTask.completed ? 'Mark incomplete' : 'Mark complete'}
                >
                  <CheckIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => {
                    // All instances are actual tasks from the database - just update
                    await updateTask(instance.id, { priority: instance.priority === 'Urgent' ? 'Normal' : 'Urgent' });
                    // No need to call loadTasks - updateTask handles optimistic updates
                  }}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    (displayTask.priority || template.priority) === 'Urgent'
                      ? 'bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 hover:shadow-sm'
                  }`}
                  title={(displayTask.priority || template.priority) === 'Urgent' ? 'Mark normal' : 'Mark urgent'}
                >
                  <ClockIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => {
                    setDeleteModal({ isOpen: true, itemType: 'instance', item: instance });
                  }}
                  className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-all duration-200 hover:shadow-sm"
                  title="Delete instance"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        );
      })}

      {/* Note Modal */}
      <NoteModal
        isOpen={noteModal.isOpen}
        onClose={() => setNoteModal({ isOpen: false, task: null })}
        task={noteModal.task}
        onSave={onNoteSave}
      />
    </>
  );
};

export default RecurringTaskRow;
