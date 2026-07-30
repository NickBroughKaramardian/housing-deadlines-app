// Helper functions for consistent task data access and filtering

/**
 * Filter out recurring templates - only return actual deadline instances
 * Templates have recurrence but no templateId
 * Instances have templateId but no recurrence (or null recurrence)
 */
export function filterDeadlineTasks(tasks) {
  if (!Array.isArray(tasks)) return [];
  
  return tasks.filter(task => {
    // Exclude tasks that are recurring templates (have recurrence but no templateId)
    if ((task.recurrence && !task.templateId) || task.isTemplate === true) {
      return false; // This is a template, not a deadline instance
    }
    // Include all other tasks (solo tasks and recurring instances)
    return true;
  });
}

/**
 * Get the deadline date from a task (handles multiple field names)
 */
export function getTaskDeadline(task) {
  return task.deadline_date || task.deadline || task.Deadline || null;
}

/**
 * Parse deadline date string to Date object (handles timezone issues)
 */
export function parseDeadlineDate(dateStr) {
  if (!dateStr) return null;
  try {
    // Parse date string carefully to avoid timezone issues
    // If in yyyy-MM-dd format, parse components directly
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const datePart = dateStr.split('T')[0]; // Get just the date part
      const parts = datePart.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
        const day = parseInt(parts[2], 10);
        
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          // Create date at noon local time to avoid timezone shifts
          return new Date(year, month, day, 12, 0, 0);
        }
      }
    }
    
    // Fallback to regular Date parsing
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      date.setHours(12, 0, 0, 0);
      return date;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a task is completed
 */
export function isTaskCompleted(task) {
  return task.completed === true || 
         task.completed === 'Yes' || 
         task.completed === 'yes' ||
         task.Completed_x003f_ === true ||
         task.Completed_x003f_ === 'Yes' ||
         task.Completed_x003f_ === 'yes' ||
         task.Completed === true ||
         task.Completed === 'Yes' ||
         task.Completed === 'yes';
}

/**
 * Get task priority
 */
export function getTaskPriority(task) {
  return task.priority || task.Priority || 'Normal';
}

/**
 * Get task project
 */
export function getTaskProject(task) {
  return task.project || task.Project || null;
}

/**
 * Get task title
 */
export function getTaskTitle(task) {
  return task.title || task.task || task.Task || 'Untitled';
}

/**
 * Get task responsible party
 */
export function getTaskResponsibleParty(task) {
  return task.responsibleParty || task.ResponsibleParty || null;
}

const MS_IN_DAY = 1000 * 60 * 60 * 24;

/**
 * Determine normalized task status
 */
export function getTaskStatus(task) {
  if (isTaskCompleted(task)) {
    return 'Completed';
  }

  const deadline = parseDeadlineDate(getTaskDeadline(task));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (deadline) {
    const deadlineStart = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
    if (deadlineStart < today) {
      return 'Overdue';
    }

    const diffDays = Math.ceil((deadlineStart.getTime() - today.getTime()) / MS_IN_DAY);
    if (diffDays >= 0 && diffDays <= 3) {
      return 'Due Soon';
    }
  }

  const priority = getTaskPriority(task);
  if (typeof priority === 'string' && priority.toLowerCase() === 'urgent') {
    return 'Due Soon';
  }

  return 'Active';
}

/**
 * Map task status to a base color keyword
 */
export function getStatusColor(status) {
  switch (status) {
    case 'Completed':
      return 'green';
    case 'Overdue':
      return 'red';
    case 'Due Soon':
      return 'orange';
    default:
      return 'blue';
  }
}

/**
 * Check if a task belongs to any of the user's departments
 * @param {Object} task - The task to check
 * @param {Array} userDepartments - Array of department IDs the user belongs to
 * @param {Array} users - Array of all users (to match responsible party to users)
 * @returns {boolean} - True if task belongs to user's departments
 */
export function taskBelongsToUserDepartments(task, userDepartments, users) {
  // If user has no departments, show all tasks
  if (!userDepartments || userDepartments.length === 0) {
    return true;
  }

  // Get responsible party from task
  const responsibleParty = getTaskResponsibleParty(task);
  if (!responsibleParty) {
    // If no responsible party, don't filter it out (show it)
    return true;
  }

  // Convert responsible party to string
  let responsiblePartyStr = '';
  if (typeof responsibleParty === 'string') {
    responsiblePartyStr = responsibleParty;
  } else if (Array.isArray(responsibleParty)) {
    responsiblePartyStr = responsibleParty.map(item => {
      if (typeof item === 'object' && item.LookupValue) {
        return item.LookupValue;
      }
      if (typeof item === 'object' && item.Email) {
        return item.Email;
      }
      return String(item);
    }).join('; ');
  } else if (responsibleParty && typeof responsibleParty === 'object') {
    responsiblePartyStr = responsibleParty.LookupValue || responsibleParty.Email || String(responsibleParty);
  } else {
    responsiblePartyStr = String(responsibleParty || '');
  }

  if (!responsiblePartyStr || responsiblePartyStr.trim() === '') {
    return true; // No responsible party, show it
  }

  // Find all users assigned to this task
  const assignedUsers = users.filter(user => {
    const userEmail = user.email || user.Email || user.mail || user.userPrincipalName || '';
    const userDisplayName = user.displayName || user.DisplayName || '';
    
    // Only match if responsible party is not empty and contains the user's email or display name
    return responsiblePartyStr && responsiblePartyStr.trim() !== '' && 
           (responsiblePartyStr.includes(userEmail) || responsiblePartyStr.includes(userDisplayName));
  });

  // Collect all unique departments from all assigned users
  const taskDepartments = new Set();
  assignedUsers.forEach(assignedUser => {
    const userDepts = assignedUser.departments || [];
    userDepts.forEach(department => {
      taskDepartments.add(department);
    });
  });

  // Check if any of the task's departments match the user's departments
  return Array.from(taskDepartments).some(dept => userDepartments.includes(dept));
}

