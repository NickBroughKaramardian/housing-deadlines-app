// Recurrence engine - generates deadline instances from a recurring template.
// Extracted from Database.js (A1) with two fixes:
// - C6: dates are serialized with local components (date-fns format) instead of
//   toISOString(), which shifted days in timezones ahead of UTC.
// - C7: "Never"-ending recurrences are capped to a 2-year rolling window from
//   today (previously 20 years / up to 10,000 instances).

import { format, addYears } from 'date-fns';
import { parseDeadlineDate } from './taskHelpers';

const DAY_MAP = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6
};

// Secondary cap on the number of generated instances
const MAX_INSTANCES_CAP = 1000;

function toDateString(date) {
  return format(date, 'yyyy-MM-dd');
}

function buildInstance(template, instanceDate) {
  return {
    title: template.title || template.Task,
    project: template.project || template.Project || 'Unassigned',
    deadline_date: toDateString(instanceDate),
    responsibleParty: template.responsibleParty || template.ResponsibleParty || '',
    priority: template.priority || template.Priority || 'Normal',
    completed: false,
    templateId: template.id
  };
}

// Helper to get next occurrence date
function getNextDate(date, pattern, interval, daysOfWeek, startDate) {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0); // Noon to avoid DST edge cases

  if (pattern === 'daily') {
    next.setDate(next.getDate() + interval);
  } else if (pattern === 'weekly') {
    if (daysOfWeek && daysOfWeek.length > 0) {
      const targetDays = daysOfWeek.map(day => DAY_MAP[day.toLowerCase()]).filter(d => d !== undefined);

      if (targetDays.length === 0) {
        // Fallback: use same day of week
        next.setDate(next.getDate() + (7 * interval));
      } else {
        // Find the next occurrence of any selected day
        let daysToAdd = 0;
        let found = false;
        let weekCount = 0;

        // Start from tomorrow to ensure we get the NEXT occurrence
        next.setDate(next.getDate() + 1);

        while (!found && daysToAdd < 14) {
          const currentDayOfWeek = next.getDay();

          if (targetDays.includes(currentDayOfWeek)) {
            if (weekCount === 0 || weekCount >= interval) {
              found = true;
            } else {
              next.setDate(next.getDate() + 7);
              weekCount++;
              daysToAdd += 7;
              continue;
            }
          }

          if (!found) {
            next.setDate(next.getDate() + 1);
            daysToAdd++;
            if (daysToAdd % 7 === 0) {
              weekCount++;
            }
          }
        }

        // If interval > 1 and we found a day in the first week, skip to the right week
        if (found && interval > 1 && weekCount === 0) {
          next.setDate(next.getDate() + (7 * (interval - 1)));
        }
      }
    } else {
      // No specific days - use same day of week
      next.setDate(next.getDate() + (7 * interval));
    }
  } else if (pattern === 'monthly') {
    // Use the day-of-month from the original start date, clamped to the
    // target month's last day
    const dayOfMonth = startDate.getDate();
    const nextMonth = next.getMonth() + interval;
    const nextYear = next.getFullYear() + Math.floor(nextMonth / 12);
    const finalMonth = nextMonth % 12;

    const lastDayOfMonth = new Date(nextYear, finalMonth + 1, 0).getDate();
    const targetDay = Math.min(dayOfMonth, lastDayOfMonth);

    next.setFullYear(nextYear, finalMonth, targetDay);
  } else if (pattern === 'yearly') {
    next.setFullYear(next.getFullYear() + interval);
  }

  next.setHours(12, 0, 0, 0);
  return next;
}

/**
 * Generate recurring deadline instances for a template.
 * @param {Object} template - the recurring template task (must have an id)
 * @param {Object} recurrence - { pattern, interval, daysOfWeek, endDate, maxOccurrences }
 * @returns {Array} array of instance task payloads (without ids)
 */
export function generateRecurringInstances(template, recurrence) {
  if (!recurrence || !recurrence.pattern) return [];

  const instances = [];

  const deadlineStr = template.deadline_date || template.deadline || template.Deadline;
  const startDate = parseDeadlineDate(deadlineStr);
  if (!startDate || isNaN(startDate.getTime())) return [];

  const interval = recurrence.interval || 1;

  // 2-year rolling window from today for open-ended recurrences (C7)
  const rollingWindowEnd = addYears(new Date(), 2);
  rollingWindowEnd.setHours(23, 59, 59, 999);

  // Calculate end date
  let endDate;
  if (recurrence.endDate) {
    endDate = new Date(recurrence.endDate);
  } else if (recurrence.maxOccurrences) {
    // Estimate end date based on max occurrences
    endDate = new Date(startDate);
    if (recurrence.pattern === 'daily') {
      endDate.setDate(endDate.getDate() + (interval * recurrence.maxOccurrences));
    } else if (recurrence.pattern === 'weekly') {
      endDate.setDate(endDate.getDate() + (interval * 7 * recurrence.maxOccurrences));
    } else if (recurrence.pattern === 'monthly') {
      endDate.setMonth(endDate.getMonth() + (interval * recurrence.maxOccurrences));
    } else if (recurrence.pattern === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + (interval * recurrence.maxOccurrences));
    }
  } else {
    // "Never" ending: generate only within the rolling window (C7)
    endDate = rollingWindowEnd;
  }

  const maxInstances = Math.min(
    recurrence.maxOccurrences || (recurrence.endDate ? 100 : MAX_INSTANCES_CAP),
    MAX_INSTANCES_CAP
  );

  // For weekly with specific days, generate all selected days in each interval week
  if (recurrence.pattern === 'weekly' && recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
    const targetDays = recurrence.daysOfWeek.map(day => DAY_MAP[day.toLowerCase()]).filter(d => d !== undefined);

    if (targetDays.length > 0) {
      let weekOffset = 0;
      let instanceCount = 0;
      const originalDate = new Date(startDate);
      originalDate.setHours(12, 0, 0, 0);

      // If original date matches a selected day, include it as instance 0
      const shouldIncludeOriginal = targetDays.includes(originalDate.getDay());
      if (shouldIncludeOriginal && instanceCount < maxInstances && originalDate <= endDate) {
        instances.push(buildInstance(template, originalDate));
        instanceCount++;
      }

      while (instanceCount < maxInstances && weekOffset < 1000) {
        // Calculate the start of the week for this interval
        const weekStart = new Date(startDate);
        weekStart.setDate(weekStart.getDate() + (weekOffset * 7 * interval));
        weekStart.setHours(12, 0, 0, 0);

        // For each selected day in this week
        for (const targetDay of targetDays) {
          if (instanceCount >= maxInstances) break;

          const currentDayOfWeek = weekStart.getDay();
          let daysToAdd = targetDay - currentDayOfWeek;
          if (daysToAdd < 0) daysToAdd += 7;

          const instanceDate = new Date(weekStart);
          instanceDate.setDate(instanceDate.getDate() + daysToAdd);
          instanceDate.setHours(12, 0, 0, 0);

          // Skip if this is the original date (already included as instance 0)
          if (instanceDate.getTime() === originalDate.getTime()) {
            continue;
          }

          if (instanceDate > endDate) {
            weekOffset = Number.MAX_SAFE_INTEGER; // Force exit
            break;
          }

          instances.push(buildInstance(template, instanceDate));
          instanceCount++;
        }

        weekOffset++;
      }
    }
  } else {
    // For other patterns (daily, monthly, yearly), include original date as
    // instance 0, then generate subsequent instances
    let currentDate = new Date(startDate);
    currentDate.setHours(12, 0, 0, 0);
    let instanceNumber = 0;

    if (instanceNumber < maxInstances && currentDate <= endDate) {
      instances.push(buildInstance(template, currentDate));
      instanceNumber++;
    }

    while (instanceNumber < maxInstances) {
      currentDate = getNextDate(currentDate, recurrence.pattern, interval, recurrence.daysOfWeek, startDate);

      if (currentDate > endDate) break;

      instances.push(buildInstance(template, currentDate));
      instanceNumber++;
    }
  }

  return instances;
}
