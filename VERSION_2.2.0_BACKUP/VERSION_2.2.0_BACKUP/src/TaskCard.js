import React, { useState } from 'react';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  TrashIcon 
} from '@heroicons/react/24/outline';
import { 
  CheckCircleIcon as CheckCircleIconSolid,
  ClockIcon as ClockIconSolid 
} from '@heroicons/react/24/solid';

function TaskCard({ 
  task, 
  showCompletion = true, 
  showUrgency = false, 
  showDelete = false,
  onToggleCompletion,
  onToggleUrgency,
  onDelete,
  className = "",
  users = [] // Add users prop for name conversion
}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Helper function to convert responsible party emails to names
  const getResponsiblePartyNames = (responsibleParty) => {
    if (!responsibleParty || !users || users.length === 0) {
      return responsibleParty || 'Unassigned';
    }

    const emails = responsibleParty.split(';').map(email => email.trim());
    const names = emails.map(email => {
      const user = users.find(u => 
        u.mail === email || 
        u.userPrincipalName === email || 
        u.email === email || 
        u.Email === email
      );
      
      if (user) {
        return user.displayName || user.DisplayName || user.mail || user.email;
      }
      
      return email; // Return original if no match found
    });
    
    return names.join(', ');
  };

  // Determine task status for theming
  const isCompleted = task.Completed_x003f_ || task.Completed;
  const isUrgent = task.Priority === 'Urgent';
  const isOverdue = task.daysUntil < 0;
  
  // Get appropriate colors based on status
  let cardClasses, textClasses, dateClasses;
  if (isCompleted) {
    cardClasses = 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700';
    textClasses = 'text-green-800 dark:text-green-200 line-through';
    dateClasses = 'text-green-600 dark:text-green-400';
  } else if (isOverdue) {
    cardClasses = 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700';
    textClasses = 'text-red-800 dark:text-red-200';
    dateClasses = 'text-red-600 dark:text-red-400';
  } else if (isUrgent) {
    cardClasses = 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700';
    textClasses = 'text-orange-800 dark:text-orange-200';
    dateClasses = 'text-orange-600 dark:text-orange-400';
  } else {
    cardClasses = 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700';
    textClasses = 'text-blue-800 dark:text-blue-200';
    dateClasses = 'text-blue-600 dark:text-blue-400';
  }

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (onDelete) {
      await onDelete(task.id);
    }
    setShowDeleteModal(false);
  };

  return (
    <>
      <div className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${cardClasses} ${className}`}>
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className={`font-medium text-sm ${textClasses} flex-1 truncate`}>
              {task.Task || task.title || task.description || 'Untitled Task'}
            </h4>
            <div className={`text-right ${dateClasses}`}>
              <div className="text-sm font-bold">
                {task.Deadline || task.deadline ? (() => {
                  const dateStr = task.Deadline || task.deadline;
                  if (typeof dateStr === 'string' && dateStr.includes('-')) {
                    const datePart = dateStr.split('T')[0];
                    const parts = datePart.split('-');
                    if (parts.length === 3) {
                      const year = parseInt(parts[0], 10);
                      const month = parseInt(parts[1], 10) - 1;
                      const day = parseInt(parts[2], 10);
                      const date = new Date(year, month, day, 12, 0, 0);
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    }
                  }
                  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                })() : 'No date'}
              </div>
              <div className="text-xs opacity-75">
                {task.daysUntil === 0 ? 'Today' : 
                 task.daysUntil === 1 ? 'Tomorrow' : 
                 task.daysUntil > 1 ? `Due in ${task.daysUntil} days` :
                 task.daysUntil === -1 ? 'Yesterday' :
                 task.daysUntil < 0 ? `${Math.abs(task.daysUntil)} days ago` :
                 'Due soon'}
              </div>
            </div>
          </div>
          
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {task.Project || task.projectName || task.project || 'No Project'}
          </p>
          
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {getResponsiblePartyNames(task.ResponsibleParty || task.responsibleParty)}
          </p>
          
          {/* Notes */}
          {(task.Notes || task.notes) && (
            <p className="text-xs text-gray-600 dark:text-gray-400 italic mt-2 pt-2 border-t border-gray-200/30 dark:border-gray-600/20">
              {task.Notes || task.notes}
            </p>
          )}
          
          {/* Action Buttons at Bottom */}
          <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-gray-200/50 dark:border-gray-600/30">
            {showCompletion && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (onToggleCompletion && !isUpdating) {
                    setIsUpdating(true);
                    try {
                      await onToggleCompletion(task.id, isCompleted);
                    } finally {
                      setIsUpdating(false);
                    }
                  }
                }}
                disabled={isUpdating}
                className={`transition-all duration-200 hover:scale-110 ${
                  isUpdating 
                    ? 'opacity-50 cursor-not-allowed' 
                    : isCompleted 
                      ? 'text-green-500 hover:text-green-600' 
                      : 'text-gray-400 hover:text-green-500'
                }`}
                title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
              >
                {isCompleted ? (
                  <CheckCircleIconSolid className="w-5 h-5 drop-shadow-sm" />
                ) : (
                  <CheckCircleIcon className="w-5 h-5" />
                )}
              </button>
            )}
            
            {showUrgency && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (onToggleUrgency && !isUpdating) {
                    setIsUpdating(true);
                    try {
                      await onToggleUrgency(task.id, isUrgent);
                    } finally {
                      setIsUpdating(false);
                    }
                  }
                }}
                disabled={isUpdating}
                className={`transition-all duration-200 hover:scale-110 ${
                  isUpdating 
                    ? 'opacity-50 cursor-not-allowed' 
                    : isUrgent 
                      ? 'text-orange-500 hover:text-orange-600' 
                      : 'text-gray-400 hover:text-orange-500'
                }`}
                title={isUrgent ? 'Mark as normal priority' : 'Mark as urgent'}
              >
                {isUrgent ? (
                  <ClockIconSolid className="w-5 h-5 drop-shadow-sm" />
                ) : (
                  <ClockIcon className="w-5 h-5" />
                )}
              </button>
            )}
            
            {showDelete && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!isUpdating) {
                    setIsUpdating(true);
                    try {
                      await handleDelete();
                    } finally {
                      setIsUpdating(false);
                    }
                  }
                }}
                disabled={isUpdating}
                className={`transition-all duration-200 hover:scale-110 ${
                  isUpdating 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'text-gray-400 hover:text-red-500'
                }`}
                title="Delete task"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            )}
          </div>
          
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <TrashIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Task
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TaskCard;
