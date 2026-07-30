// Wrapper to export EditableCell from Database.js for use in other components
// This is a temporary solution - in production, EditableCell should be in its own file
import React from 'react';

// This will be injected by the parent component
const EditableCellWrapper = ({ task, field, className, type, editingCell, enterpriseUsers, editInputRef, editValueRef, saveEdit, startEditing }) => {
  // This is a placeholder - the actual EditableCell will be passed as a prop
  // For now, return a simple div that will be replaced
  return (
    <div className={className}>
      {task[field] || 'Click to edit'}
    </div>
  );
};

export default EditableCellWrapper;


// This is a temporary solution - in production, EditableCell should be in its own file
import React from 'react';

// This will be injected by the parent component
const EditableCellWrapper = ({ task, field, className, type, editingCell, enterpriseUsers, editInputRef, editValueRef, saveEdit, startEditing }) => {
  // This is a placeholder - the actual EditableCell will be passed as a prop
  // For now, return a simple div that will be replaced
  return (
    <div className={className}>
      {task[field] || 'Click to edit'}
    </div>
  );
};

export default EditableCellWrapper;


