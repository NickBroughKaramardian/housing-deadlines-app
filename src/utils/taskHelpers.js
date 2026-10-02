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
 * Format a deadline date string for display (e.g. "Jan 05, 2026")
 */
export function formatDisplayDate(dateStr) {
  const date = parseDeadlineDate(dateStr);
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
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

/**
 * Convert a responsibleParty value (string, array, or SharePoint lookup object)
 * to a display string.
 */
export function responsiblePartyToString(responsibleParty) {
  if (!responsibleParty) return '';
  if (typeof responsibleParty === 'string') return responsibleParty;
  if (Array.isArray(responsibleParty)) {
    return responsibleParty.map(item => {
      if (item && typeof item === 'object') {
        return item.LookupValue || item.Email || String(item);
      }
      return String(item);
    }).join('; ');
  }
  if (typeof responsibleParty === 'object') {
    return responsibleParty.LookupValue || responsibleParty.Email || String(responsibleParty);
  }
  return String(responsibleParty);
}

/**
 * Resolve a responsibleParty value to display names using the users list.
 * Emails/names are matched case-insensitively; unmatched entries are kept as-is.
 */
export function getResponsiblePartyNames(responsibleParty, users = []) {
  const str = responsiblePartyToString(responsibleParty);
  if (!str || !str.trim()) return '';

  const parts = str.split(/[,;]/).map(p => p.trim()).filter(Boolean);
  const names = parts.map(part => {
    const partLower = part.toLowerCase();
    const user = users.find(u => {
      const email = (u.email || u.Email || u.mail || u.userPrincipalName || '').toLowerCase();
      const name = (u.displayName || u.DisplayName || '').toLowerCase();
      return (email && email === partLower) || (name && name === partLower);
    });
    return user ? (user.displayName || user.DisplayName || part) : part;
  });
  return names.join(', ');
}

const KNOWN_DEPARTMENTS = ['development', 'accounting', 'compliance', 'management'];

/**
 * Resolve the set of departments (lowercase) a task belongs to, based on the
 * users assigned as responsible party. Considers both the Microsoft Graph
 * `department` field and the app-level `departments` assignments.
 */
export function getTaskDepartments(task, users = []) {
  const departments = new Set();
  const str = responsiblePartyToString(getTaskResponsibleParty(task));
  if (!str || !str.trim()) return departments;

  users.forEach(user => {
    const userEmail = user.email || user.Email || user.mail || user.userPrincipalName || '';
    const userDisplayName = user.displayName || user.DisplayName || '';
    const matches =
      (userEmail && str.includes(userEmail)) ||
      (userDisplayName && str.includes(userDisplayName));
    if (!matches) return;

    if (user.department) {
      const deptLower = user.department.toLowerCase();
      KNOWN_DEPARTMENTS.forEach(dept => {
        if (deptLower.includes(dept)) departments.add(dept);
      });
    }
    (user.departments || []).forEach(dept => {
      if (dept) departments.add(String(dept).toLowerCase());
    });
  });

  return departments;
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

  const responsiblePartyStr = responsiblePartyToString(getTaskResponsibleParty(task));
  if (!responsiblePartyStr || responsiblePartyStr.trim() === '') {
    return true; // No responsible party, show it
  }

  const taskDepartments = getTaskDepartments(task, users);
  const userDeptsLower = userDepartments.map(dept => String(dept).toLowerCase());
  return Array.from(taskDepartments).some(dept => userDeptsLower.includes(dept));
}

