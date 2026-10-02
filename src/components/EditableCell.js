// Inline-editable table cell (P1).
//
// Module-scope component (previously recreated via useCallback inside
// Database.js on every render). The input is locally controlled with
// useState and commits on blur/Enter/Tab - no per-keystroke parent
// re-renders and no `_forceUpdate` hack.

import React, { useState, useRef } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';
import { formatDisplayDate } from '../utils/taskHelpers';

function toDateInputValue(value) {
  if (!value) return '';
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return value;
  }
  if (typeof value === 'string' && value.includes('T')) {
    const datePart = value.split('T')[0];
    if (datePart.match(/^\d{4}-\d{2}-\d{2}$/)) return datePart;
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function EditingInput({ initialValue, type, className, inputRef, onCommit, onCancel, onTabCommit }) {
  const [draft, setDraft] = useState(() =>
    type === 'date' ? toDateInputValue(initialValue) : (initialValue ?? '')
  );
  // Prevent double commits (e.g. Enter triggering unmount which fires blur)
  const committedRef = useRef(false);

  const commitOnce = (fn) => {
    if (committedRef.current) return;
    committedRef.current = true;
    fn();
  };

  return (
    <input
      ref={inputRef}
      type={type}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      className={`${className} border border-blue-500 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
      onBlur={() => commitOnce(() => onCommit(draft))}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitOnce(() => onCommit(draft));
        } else if (e.key === 'Escape') {
          e.preventDefault();
          commitOnce(() => onCancel());
        } else if (e.key === 'Tab') {
          e.preventDefault();
          commitOnce(() => onTabCommit(draft));
        }
      }}
      autoFocus
    />
  );
}

const EditableCell = React.memo(function EditableCell({
  task,
  field,
  className = '',
  type = 'text',
  editingCell,
  editInputRef,
  editValueRef,
  saveEdit,
  startEditing,
  cancelEditing,
  moveToNextCell,
  savingFields,
  savedFields
}) {
  const isEditing = editingCell?.taskId === task.id && editingCell?.field === field;
  const savingKey = `${task.id}-${field}`;
  const isSaving = savingFields?.has(savingKey);
  const isSaved = savedFields?.has(savingKey);

  let value = '';
  if (field === 'task') {
    value = task.title || task.Task || '';
  } else if (field === 'deadline') {
    value = task.deadline_date || task.deadline || task.Deadline || '';
  } else if (field === 'project') {
    value = task.project || task.Project || '';
  } else {
    value = task[field] || '';
  }

  let displayValue = value;
  if (field === 'deadline' || field === 'deadline_date') {
    displayValue = value ? formatDisplayDate(value) : '';
  }

  if (isEditing) {
    const initialValue =
      editValueRef?.current !== null && editValueRef?.current !== undefined
        ? editValueRef.current
        : value;
    const normalizedInitial = type === 'date' ? toDateInputValue(initialValue) : initialValue;

    return (
      <EditingInput
        key={`${task.id}-${field}-editing`}
        initialValue={initialValue}
        type={type}
        className={className}
        inputRef={editInputRef}
        onCommit={(draft) => {
          if (draft !== normalizedInitial) {
            saveEdit(task.id, field, draft);
          } else if (cancelEditing) {
            cancelEditing();
          }
        }}
        onCancel={() => cancelEditing && cancelEditing()}
        onTabCommit={async (draft) => {
          if (draft !== normalizedInitial) {
            const updatedTask = await saveEdit(task.id, field, draft, {
              clearEditing: false,
              returnUpdatedTask: true
            });
            if (moveToNextCell) moveToNextCell(task.id, field, updatedTask || null);
          } else if (moveToNextCell) {
            moveToNextCell(task.id, field);
          }
        }}
      />
    );
  }

  return (
    <span
      className={`${className} cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded relative inline-flex items-center gap-1`}
      onClick={() => {
        const startValue = field === 'deadline'
          ? (task.deadline_date || task.deadline || task.Deadline || '')
          : value;
        startEditing(task.id, field, startValue);
      }}
      title="Click to edit"
    >
      <span>{displayValue || 'Click to edit'}</span>
      {isSaving && (
        <span className="inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" title="Saving..."></span>
      )}
      {isSaved && !isSaving && (
        <CheckIcon className="w-4 h-4 text-green-500 animate-pulse" title="Saved!" />
      )}
    </span>
  );
});

export default EditableCell;
