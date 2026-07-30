/**
 * Utility functions for recurring task generation
 */

/**
 * Calculate the next occurrence date based on recurrence pattern
 */
function getNextOccurrenceDate(recurrence, fromDate = new Date()) {
  if (!recurrence || !recurrence.pattern) {
    return null;
  }

  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);
  
  const { pattern, interval = 1, daysOfWeek = [], dayOfMonth, skipWeekends } = recurrence;

  switch (pattern) {
    case 'daily': {
      let next = new Date(from);
      next.setDate(next.getDate() + interval);
      
      if (skipWeekends) {
        while (next.getDay() === 0 || next.getDay() === 6) {
          next.setDate(next.getDate() + 1);
        }
      }
      return next;
    }

    case 'weekly': {
      if (!daysOfWeek || daysOfWeek.length === 0) {
        // Default to same day of week
        const currentDay = from.getDay();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        daysOfWeek.push(dayNames[currentDay]);
      }

      // Find next occurrence of any selected day
      const dayMap = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6
      };

      let next = new Date(from);
      let daysToAdd = 0;
      let attempts = 0;
      const maxAttempts = 8; // Prevent infinite loops

      while (attempts < maxAttempts) {
        const currentDayOfWeek = next.getDay();
        const dayName = Object.keys(dayMap).find(k => dayMap[k] === currentDayOfWeek);
        
        if (daysOfWeek.includes(dayName)) {
          if (daysToAdd > 0 || next.getTime() > from.getTime()) {
            break; // Found next occurrence
          }
        }

        next.setDate(next.getDate() + 1);
        daysToAdd++;
        attempts++;
      }

      // If we need to skip weeks (interval > 1)
      if (interval > 1 && daysToAdd < 7 * interval) {
        // Find the first occurrence, then add (interval - 1) weeks
        const firstOccurrence = new Date(next);
        const weeksToAdd = (interval - 1) * 7;
        firstOccurrence.setDate(firstOccurrence.getDate() + weeksToAdd);
        next = firstOccurrence;
      }

      return next;
    }

    case 'monthly': {
      let next = new Date(from);
      
      // Use the day of month from the original start date (stored in dayOfMonth or use from date)
      const targetDay = dayOfMonth || from.getDate();
      
      // Move to next month
      next.setMonth(next.getMonth() + interval);
      
      // Set to the target day, handling edge cases
      const lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      const dayToUse = Math.min(targetDay, lastDayOfMonth); // Use last day if target day doesn't exist
      next.setDate(dayToUse);
      
      // If we're still in the same month (shouldn't happen, but safety check)
      if (next.getTime() <= from.getTime()) {
        next.setMonth(next.getMonth() + interval);
        const newLastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(targetDay, newLastDay));
      }

      return next;
    }

    case 'yearly': {
      let next = new Date(from);
      next.setFullYear(next.getFullYear() + interval);
      return next;
    }

    default:
      return null;
  }
}

/**
 * Check if a date should be skipped based on recurrence rules
 */
function shouldSkipDate(recurrence, date) {
  if (!recurrence) return false;

  const { skipWeekends, customSkipDates } = recurrence;
  const dayOfWeek = date.getDay();

  // Skip weekends
  if (skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return true;
  }

  // Skip custom dates
  if (customSkipDates && customSkipDates.length > 0) {
    const dateStr = date.toISOString().slice(0, 10);
    if (customSkipDates.includes(dateStr)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if recurrence has ended
 */
function hasRecurrenceEnded(recurrence, date) {
  if (!recurrence) return false;

  const { endDate, maxOccurrences } = recurrence;

  // Check end date
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (date.getTime() > end.getTime()) {
      return true;
    }
  }

  // Max occurrences is handled by the caller tracking count
  return false;
}

/**
 * Generate instances for a date range
 */
function generateInstances(template, startDate, endDate) {
  if (!template.recurrence || !template.recurrence.pattern) {
    return [];
  }

  const instances = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  let currentDate = new Date(template.deadline_date || template.deadline || start);
  currentDate.setHours(0, 0, 0, 0);

  // Don't generate instances before the template start date
  if (currentDate.getTime() < start.getTime()) {
    // Find first occurrence in range
    while (currentDate.getTime() < start.getTime()) {
      const next = getNextOccurrenceDate(template.recurrence, currentDate);
      if (!next || next.getTime() > end.getTime()) {
        return []; // No occurrences in range
      }
      currentDate = next;
    }
  }

  let instanceNumber = 1;
  const maxInstances = 1000; // Safety limit

  while (currentDate.getTime() <= end.getTime() && instances.length < maxInstances) {
    // Check if recurrence has ended
    if (hasRecurrenceEnded(template.recurrence, currentDate)) {
      break;
    }

    // Check if date should be skipped
    if (!shouldSkipDate(template.recurrence, currentDate)) {
      // Create instance
      const instance = {
        ...template,
        id: `${template.id}_instance_${instanceNumber}_${currentDate.toISOString().slice(0, 10)}`,
        isTemplate: false,
        templateId: template.id,
        deadline_date: currentDate.toISOString().slice(0, 10),
        deadline: currentDate.toISOString().slice(0, 10),
        instanceNumber,
        completed: false,
        // Remove recurrence from instance
        recurrence: null
      };

      // Remove template-specific fields
      delete instance.lastGenerated;
      delete instance.nextInstanceDate;

      instances.push(instance);
      instanceNumber++;
    }

    // Get next occurrence
    const nextDate = getNextOccurrenceDate(template.recurrence, currentDate);
    if (!nextDate) {
      break; // No more occurrences
    }

    currentDate = nextDate;
  }

  return instances;
}

module.exports = {
  getNextOccurrenceDate,
  shouldSkipDate,
  hasRecurrenceEnded,
  generateInstances
};


 */

/**
 * Calculate the next occurrence date based on recurrence pattern
 */
function getNextOccurrenceDate(recurrence, fromDate = new Date()) {
  if (!recurrence || !recurrence.pattern) {
    return null;
  }

  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);
  
  const { pattern, interval = 1, daysOfWeek = [], dayOfMonth, skipWeekends } = recurrence;

  switch (pattern) {
    case 'daily': {
      let next = new Date(from);
      next.setDate(next.getDate() + interval);
      
      if (skipWeekends) {
        while (next.getDay() === 0 || next.getDay() === 6) {
          next.setDate(next.getDate() + 1);
        }
      }
      return next;
    }

    case 'weekly': {
      if (!daysOfWeek || daysOfWeek.length === 0) {
        // Default to same day of week
        const currentDay = from.getDay();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        daysOfWeek.push(dayNames[currentDay]);
      }

      // Find next occurrence of any selected day
      const dayMap = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6
      };

      let next = new Date(from);
      let daysToAdd = 0;
      let attempts = 0;
      const maxAttempts = 8; // Prevent infinite loops

      while (attempts < maxAttempts) {
        const currentDayOfWeek = next.getDay();
        const dayName = Object.keys(dayMap).find(k => dayMap[k] === currentDayOfWeek);
        
        if (daysOfWeek.includes(dayName)) {
          if (daysToAdd > 0 || next.getTime() > from.getTime()) {
            break; // Found next occurrence
          }
        }

        next.setDate(next.getDate() + 1);
        daysToAdd++;
        attempts++;
      }

      // If we need to skip weeks (interval > 1)
      if (interval > 1 && daysToAdd < 7 * interval) {
        // Find the first occurrence, then add (interval - 1) weeks
        const firstOccurrence = new Date(next);
        const weeksToAdd = (interval - 1) * 7;
        firstOccurrence.setDate(firstOccurrence.getDate() + weeksToAdd);
        next = firstOccurrence;
      }

      return next;
    }

    case 'monthly': {
      let next = new Date(from);
      
      // Use the day of month from the original start date (stored in dayOfMonth or use from date)
      const targetDay = dayOfMonth || from.getDate();
      
      // Move to next month
      next.setMonth(next.getMonth() + interval);
      
      // Set to the target day, handling edge cases
      const lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      const dayToUse = Math.min(targetDay, lastDayOfMonth); // Use last day if target day doesn't exist
      next.setDate(dayToUse);
      
      // If we're still in the same month (shouldn't happen, but safety check)
      if (next.getTime() <= from.getTime()) {
        next.setMonth(next.getMonth() + interval);
        const newLastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(targetDay, newLastDay));
      }

      return next;
    }

    case 'yearly': {
      let next = new Date(from);
      next.setFullYear(next.getFullYear() + interval);
      return next;
    }

    default:
      return null;
  }
}

/**
 * Check if a date should be skipped based on recurrence rules
 */
function shouldSkipDate(recurrence, date) {
  if (!recurrence) return false;

  const { skipWeekends, customSkipDates } = recurrence;
  const dayOfWeek = date.getDay();

  // Skip weekends
  if (skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return true;
  }

  // Skip custom dates
  if (customSkipDates && customSkipDates.length > 0) {
    const dateStr = date.toISOString().slice(0, 10);
    if (customSkipDates.includes(dateStr)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if recurrence has ended
 */
function hasRecurrenceEnded(recurrence, date) {
  if (!recurrence) return false;

  const { endDate, maxOccurrences } = recurrence;

  // Check end date
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (date.getTime() > end.getTime()) {
      return true;
    }
  }

  // Max occurrences is handled by the caller tracking count
  return false;
}

/**
 * Generate instances for a date range
 */
function generateInstances(template, startDate, endDate) {
  if (!template.recurrence || !template.recurrence.pattern) {
    return [];
  }

  const instances = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  let currentDate = new Date(template.deadline_date || template.deadline || start);
  currentDate.setHours(0, 0, 0, 0);

  // Don't generate instances before the template start date
  if (currentDate.getTime() < start.getTime()) {
    // Find first occurrence in range
    while (currentDate.getTime() < start.getTime()) {
      const next = getNextOccurrenceDate(template.recurrence, currentDate);
      if (!next || next.getTime() > end.getTime()) {
        return []; // No occurrences in range
      }
      currentDate = next;
    }
  }

  let instanceNumber = 1;
  const maxInstances = 1000; // Safety limit

  while (currentDate.getTime() <= end.getTime() && instances.length < maxInstances) {
    // Check if recurrence has ended
    if (hasRecurrenceEnded(template.recurrence, currentDate)) {
      break;
    }

    // Check if date should be skipped
    if (!shouldSkipDate(template.recurrence, currentDate)) {
      // Create instance
      const instance = {
        ...template,
        id: `${template.id}_instance_${instanceNumber}_${currentDate.toISOString().slice(0, 10)}`,
        isTemplate: false,
        templateId: template.id,
        deadline_date: currentDate.toISOString().slice(0, 10),
        deadline: currentDate.toISOString().slice(0, 10),
        instanceNumber,
        completed: false,
        // Remove recurrence from instance
        recurrence: null
      };

      // Remove template-specific fields
      delete instance.lastGenerated;
      delete instance.nextInstanceDate;

      instances.push(instance);
      instanceNumber++;
    }

    // Get next occurrence
    const nextDate = getNextOccurrenceDate(template.recurrence, currentDate);
    if (!nextDate) {
      break; // No more occurrences
    }

    currentDate = nextDate;
  }

  return instances;
}

module.exports = {
  getNextOccurrenceDate,
  shouldSkipDate,
  hasRecurrenceEnded,
  generateInstances
};

