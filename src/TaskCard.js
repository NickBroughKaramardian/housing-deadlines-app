import React from 'react';
import { CheckIcon, ClockIcon, DocumentTextIcon, TrashIcon } from '@heroicons/react/24/outline';
import { getTaskDeadline, parseDeadlineDate, getTaskStatus, getStatusColor } from './utils/taskHelpers';

const TaskCard = React.memo(function TaskCard({ 
  task, 
  className = "",
  users = [], // Add users prop for name conversion
  onToggleComplete,
  onToggleUrgent,
  onNoteClick,
  onDeleteClick
}) {

  // Helper function to convert responsible party emails to names
  const getResponsiblePartyNames = (responsibleParty) => {
    if (!responsibleParty) {
      return 'Unassigned';
    }
    
    if (!users || users.length === 0) {
      // If no users available, return the original value
      return typeof responsibleParty === 'string' ? responsibleParty : String(responsibleParty);
    }

    // Handle different formats of ResponsibleParty
    let emails = [];
    
    if (Array.isArray(responsibleParty)) {
      // If it's an array, extract emails
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
      // If it's a string, split by comma or semicolon
      emails = responsibleParty.split(/[,;]/).map(email => email.trim()).filter(email => email.length > 0);
    } else {
      // Fallback
      emails = [String(responsibleParty)];
    }

    // Convert emails to names
    const names = emails.map(email => {
      // Case-insensitive matching
      const emailLower = email.toLowerCase();
      const user = users.find(u => {
        const userEmail = (u.mail || u.userPrincipalName || u.email || u.Email || '').toLowerCase();
        return userEmail === emailLower;
      });
      
      if (user) {
        return user.displayName || user.DisplayName || user.mail || user.email || email;
      }
      
      // Return original email if no match found
      return email;
    });
    
    return names.join(', ');
  };

  const status = getTaskStatus(task);
  const statusColor = getStatusColor(status);

  const COLOR_THEME = {
    green: {
      card: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
      text: 'text-green-800 dark:text-green-200',
      date: 'text-green-600 dark:text-green-400'
    },
    red: {
      card: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700',
      text: 'text-red-800 dark:text-red-200',
      date: 'text-red-600 dark:text-red-400'
    },
    orange: {
      card: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700',
      text: 'text-orange-800 dark:text-orange-200',
      date: 'text-orange-600 dark:text-orange-400'
    },
    blue: {
      card: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',
      text: 'text-blue-800 dark:text-blue-200',
      date: 'text-blue-600 dark:text-blue-400'
    }
  };

  const theme = COLOR_THEME[statusColor] || COLOR_THEME.blue;

  const cardClasses = theme.card;
  const baseTextClasses = theme.text;
  const dateClasses = theme.date;

  // Action functions removed - use Database page for task management

  // Action buttons removed - use Database page for task management

  return (
    <>
      <div className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md flex flex-col h-full ${cardClasses} ${className}`}>
        {/* Content area - grows to push buttons down */}
        <div className="flex-grow space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className={`font-medium text-sm ${status === 'Completed' ? `line-through ${baseTextClasses}` : baseTextClasses} flex-1 truncate`}>
              {task.task || task.Task || task.title || task.description || 'Untitled Task'}
            </h4>
            <div className={`text-right ${dateClasses}`}>
              <div className="text-sm font-bold">
                {(() => {
                  const deadlineStr = getTaskDeadline(task);
                  if (!deadlineStr) return 'No date';
                  const deadline = parseDeadlineDate(deadlineStr);
                  if (!deadline) return 'No date';
                  return deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                })()}
              </div>
              <div className="text-xs opacity-75">
                {(() => {
                  const deadlineStr = getTaskDeadline(task);
                  const deadline = deadlineStr ? parseDeadlineDate(deadlineStr) : null;
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const deadlineStart = deadline ? new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate()) : null;
                  const calculatedDaysUntil = task.daysUntil !== undefined && task.daysUntil !== null
                    ? task.daysUntil
                    : deadlineStart
                      ? Math.ceil((deadlineStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                      : null;

                  if (calculatedDaysUntil === null) return 'No deadline';
                  if (calculatedDaysUntil === 0) return 'Today';
                  if (calculatedDaysUntil === 1) return 'Tomorrow';
                  if (calculatedDaysUntil > 1) return `Due in ${calculatedDaysUntil} days`;
                  if (calculatedDaysUntil === -1) return 'Yesterday';
                  if (calculatedDaysUntil < 0) return `${Math.abs(calculatedDaysUntil)} days ago`;
                  return 'Due soon';
                })()}
              </div>
            </div>
          </div>
          
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {task.Project || task.projectName || task.project || 'No Project'}
          </p>
          
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {getResponsiblePartyNames(task.responsibleParty || task.ResponsibleParty || '')}
          </p>
          
          {/* Notes */}
          {(task.note || task.notes || task.Note || task.Notes) && (
            <p className="text-xs text-gray-600 dark:text-gray-400 italic mt-2 pt-2 border-t border-gray-200/30 dark:border-gray-600/20">
              {task.note || task.notes || task.Note || task.Notes}
            </p>
          )}
        </div>
        
        {/* Action buttons - always at bottom */}
        {(onToggleComplete || onToggleUrgent || onNoteClick || onDeleteClick) && (
          <div className="flex items-center justify-end gap-1 mt-3 pt-2 border-t border-gray-200/30 dark:border-gray-600/20">
            {onToggleComplete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleComplete(task.id, task.completed || task.Completed || task.Completed_x003f_);
                }}
                className={`p-1.5 rounded-lg transition-colors duration-200 ${
                  task.completed || task.Completed || task.Completed_x003f_
                    ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                }`}
                title={task.completed || task.Completed || task.Completed_x003f_ ? 'Mark incomplete' : 'Mark complete'}
              >
                <CheckIcon className="w-3.5 h-3.5" />
              </button>
            )}
            {onToggleUrgent && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const isUrgent = (task.priority || task.Priority || '').toLowerCase() === 'urgent';
                  onToggleUrgent(task.id, isUrgent);
                }}
                className={`p-1.5 rounded-lg transition-colors duration-200 ${
                  (task.priority || task.Priority || '').toLowerCase() === 'urgent'
                    ? 'bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                }`}
                title={(task.priority || task.Priority || '').toLowerCase() === 'urgent' ? 'Remove urgent' : 'Mark urgent'}
              >
                <ClockIcon className="w-3.5 h-3.5" />
              </button>
            )}
            {onNoteClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNoteClick(task);
                }}
                className={`p-1.5 rounded-lg transition-colors duration-200 ${
                  task.note || task.notes || task.Note || task.Notes
                    ? 'bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                }`}
                title="Add/edit notes"
              >
                <DocumentTextIcon className="w-3.5 h-3.5" />
              </button>
            )}
            {onDeleteClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteClick(task.id, task);
                }}
                className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors duration-200"
                title="Delete task"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
});

export default TaskCard;
