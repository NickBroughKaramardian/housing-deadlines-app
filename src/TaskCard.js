import React from 'react';

function TaskCard({ 
  task, 
  className = "",
  users = [] // Add users prop for name conversion
}) {

  // Helper function to convert responsible party emails to names
  const getResponsiblePartyNames = (responsibleParty) => {
    // Debug logging
    console.log('TaskCard: getResponsiblePartyNames called with:', {
      responsibleParty: responsibleParty,
      responsiblePartyType: typeof responsibleParty,
      responsiblePartyIsArray: Array.isArray(responsibleParty),
      usersLength: users?.length,
      users: users
    });
    
    if (!responsibleParty || !users || users.length === 0) {
      console.log('TaskCard: No responsible party or users, returning:', responsibleParty || 'Unassigned');
      return responsibleParty || 'Unassigned';
    }

    // Handle different formats of ResponsibleParty
    let emails = [];
    
    if (Array.isArray(responsibleParty)) {
      console.log('TaskCard: ResponsibleParty is array, processing items:', responsibleParty);
      // If it's an array of objects, extract the email/name
      emails = responsibleParty.map(item => {
        console.log('TaskCard: Processing array item:', item, 'type:', typeof item);
        if (typeof item === 'object' && item.LookupValue) {
          console.log('TaskCard: Found LookupValue:', item.LookupValue);
          return item.LookupValue;
        }
        if (typeof item === 'object' && item.Email) {
          console.log('TaskCard: Found Email:', item.Email);
          return item.Email;
        }
        console.log('TaskCard: Converting to string:', String(item));
        return String(item);
      });
    } else if (typeof responsibleParty === 'string') {
      console.log('TaskCard: ResponsibleParty is string, splitting by semicolon:', responsibleParty);
      // If it's a string, split by semicolon
      emails = responsibleParty.split(';').map(email => email.trim());
    } else {
      console.log('TaskCard: ResponsibleParty is other type, converting to string:', responsibleParty);
      // Fallback
      emails = [String(responsibleParty)];
    }

    console.log('TaskCard: Extracted emails:', emails);

    const names = emails.map(email => {
      console.log('TaskCard: Looking for user with email:', email);
      const user = users.find(u => {
        const match = u.mail === email || 
        u.userPrincipalName === email || 
        u.email === email || 
        u.Email === email;
        if (match) {
          console.log('TaskCard: Found matching user:', u);
        }
        return match;
      });
      
      if (user) {
        const displayName = user.displayName || user.DisplayName || user.mail || user.email;
        console.log('TaskCard: Returning display name:', displayName);
        return displayName;
      }
      
      console.log('TaskCard: No user found, returning original email:', email);
      return email; // Return original if no match found
    });
    
    const result = names.join(', ');
    console.log('TaskCard: Final result:', result);
    return result;
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

  // Action functions removed - use Database page for task management

  // Action buttons removed - use Database page for task management

  return (
    <>
      <div className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${cardClasses} ${className}`}>
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className={`font-medium text-sm ${textClasses} flex-1 truncate`}>
              {task.task || task.Task || task.title || task.description || 'Untitled Task'}
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
            {String(getResponsiblePartyNames(task.ResponsibleParty || task.responsibleParty) || 'Unassigned')}
          </p>
          
          {/* Notes */}
          {(task.Notes || task.notes) && (
            <p className="text-xs text-gray-600 dark:text-gray-400 italic mt-2 pt-2 border-t border-gray-200/30 dark:border-gray-600/20">
              {task.Notes || task.notes}
            </p>
          )}
          
          {/* Action buttons removed - use Database page for task management */}
          
        </div>
      </div>

      {/* Delete modal removed - use Database page for task management */}
    </>
  );
}

export default TaskCard;
