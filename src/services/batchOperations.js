// Batch import / bulk delete orchestration (A1).
// Extracted from Database.js. Progress is reported via the
// `importProgressUpdate` / `deleteProgressUpdate` window events that App.js
// renders as global progress bars.

import { taskManager } from './taskManager';
import { operationHistoryService } from './operationHistoryService';
import { generateRecurringInstances } from '../utils/recurrence';

// Deletions at or above this size show the global progress bar
const DELETE_PROGRESS_THRESHOLD = 1000;

/**
 * Normalize raw task input (from the batch-add modal or recurrence flow)
 * into a clean create payload.
 */
export function formatTaskInput(taskData, extra = {}) {
  const formatted = {
    title: taskData.title || taskData.Task || 'Untitled Task',
    project: taskData.project || taskData.Project || 'Unassigned',
    deadline_date: taskData.deadline_date || taskData.deadline || taskData.Deadline,
    responsibleParty: taskData.responsibleParty || taskData.ResponsibleParty || '',
    priority: taskData.priority || taskData.Priority || 'Normal',
    completed: taskData.completed || false,
    ...extra
  };

  if (taskData.note !== undefined && taskData.note !== null) {
    formatted.note = taskData.note;
  } else if (taskData.notes !== undefined && taskData.notes !== null) {
    formatted.note = taskData.notes;
  }

  Object.keys(formatted).forEach(key => {
    if (key === 'note') {
      if (formatted[key] === undefined || formatted[key] === null) {
        delete formatted[key];
      }
    } else if (formatted[key] === undefined || formatted[key] === null || formatted[key] === '') {
      delete formatted[key];
    }
  });

  // Keep deadline_date even if empty for required validation
  if (!formatted.deadline_date && (taskData.deadline_date || taskData.deadline || taskData.Deadline)) {
    formatted.deadline_date = taskData.deadline_date || taskData.deadline || taskData.Deadline;
  }

  return formatted;
}

/**
 * Create a single (non-recurring) task from raw input.
 */
export async function createTaskFromInput(taskData) {
  return taskManager.createTask(formatTaskInput(taskData));
}

/**
 * Create (or reuse) a recurring template and persist its generated instances.
 * Returns { templateTask, instances }.
 */
export async function generateAndSaveInstances(template, recurrence) {
  let templateTask;

  if (!template.id) {
    templateTask = await taskManager.createTask(formatTaskInput(template, { recurrence }));
  } else {
    // Template already exists (recurrence was already saved on it)
    templateTask = { ...template, recurrence };
  }

  const instances = generateRecurringInstances(templateTask, recurrence);
  if (instances.length > 0) {
    await taskManager.batchCreate(instances);
  }

  return { templateTask, instances };
}

function emitImportProgress(progress) {
  window.dispatchEvent(new CustomEvent('importProgressUpdate', { detail: { progress: progress ? { ...progress } : null } }));
}

function isRecurringInput(task) {
  return Boolean(task.recurring && task.recurrence && task.recurrence.pattern && task.recurrence.pattern !== 'none');
}

/**
 * Run a batch import of tasks (regular + recurring).
 * Returns { successCount, errorCount, errorMessages }.
 */
export async function runBatchImport(tasksToAdd, { performedBy } = {}) {
  const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  const errorMessages = [];

  const recurringTasks = tasksToAdd.filter(isRecurringInput);
  const regularTasks = tasksToAdd.filter(task => !isRecurringInput(task));

  // Pre-calculate total operations (recurring templates count as their instances)
  const recurringInstanceCounts = recurringTasks.map(taskData => {
    try {
      return generateRecurringInstances(formatTaskInput(taskData, { recurrence: taskData.recurrence }), taskData.recurrence).length;
    } catch (error) {
      console.error('batchOperations: Error calculating recurring instances:', error);
      return 0;
    }
  });
  const totalOperations = regularTasks.length + recurringInstanceCounts.reduce((sum, n) => sum + n, 0);

  const progress = {
    batchId,
    total: totalOperations,
    completed: 0,
    success: 0,
    errors: 0,
    isActive: true
  };
  emitImportProgress(progress);

  for (const taskData of regularTasks) {
    try {
      await createTaskFromInput(taskData);
      progress.completed += 1;
      progress.success += 1;
    } catch (error) {
      console.error('batchOperations: Error creating task in batch:', error, taskData);
      progress.completed += 1;
      progress.errors += 1;
      errorMessages.push(`Task "${taskData.title || taskData.Task || 'Unknown'}": ${error.message || String(error)}`);
    }
    emitImportProgress(progress);
  }

  for (let i = 0; i < recurringTasks.length; i++) {
    const taskData = recurringTasks[i];
    const instanceCount = recurringInstanceCounts[i] || 0;
    try {
      await generateAndSaveInstances(taskData, taskData.recurrence);
      progress.completed = Math.min(progress.completed + instanceCount, progress.total);
      progress.success += instanceCount;
    } catch (error) {
      console.error('batchOperations: Error creating recurring task in batch:', error, taskData);
      progress.completed = Math.min(progress.completed + instanceCount, progress.total);
      progress.errors += instanceCount;
      errorMessages.push(`Recurring task "${taskData.title || taskData.Task || 'Unknown'}": ${error.message || String(error)}`);
    }
    emitImportProgress(progress);
  }

  // Final progress - ensure the bar reaches 100%
  progress.completed = progress.total;
  progress.isActive = false;
  emitImportProgress(progress);

  try {
    operationHistoryService.addRecord({
      type: 'import',
      totalTasks: totalOperations,
      successCount: progress.success,
      errorCount: progress.errors,
      duration: Date.now() - startTime,
      status: progress.errors > 0 ? (progress.success > 0 ? 'partial' : 'failed') : 'completed',
      errors: errorMessages.length > 0 ? errorMessages : undefined,
      performedBy: performedBy || 'Unknown'
    });
  } catch (historyError) {
    console.error('batchOperations: Error saving import history:', historyError);
  }

  return { successCount: progress.success, errorCount: progress.errors, errorMessages };
}

/**
 * Bulk-delete tasks with progress reporting for large batches.
 * Returns { success, errors }.
 */
export async function runBulkDelete(taskIds, { performedBy } = {}) {
  const startTime = Date.now();
  const batchId = `delete-${Date.now()}`;
  const needsProgress = taskIds.length >= DELETE_PROGRESS_THRESHOLD;

  const emitProgress = (progress) => {
    window.dispatchEvent(new CustomEvent('deleteProgressUpdate', {
      detail: { progress: { ...progress, batchId, deletedTaskIds: taskIds } }
    }));
  };

  const recordHistory = (successCount, errorCount, errors) => {
    operationHistoryService.addRecord({
      type: 'delete',
      totalTasks: taskIds.length,
      successCount,
      errorCount,
      duration: Date.now() - startTime,
      status: errorCount === 0 ? 'completed' : successCount === 0 ? 'failed' : 'partial',
      errors,
      performedBy: performedBy || 'Unknown'
    });
  };

  try {
    if (needsProgress) {
      emitProgress({ total: taskIds.length, completed: 0, success: 0, errors: 0, isActive: true });
    }

    const result = await taskManager.batchDelete(taskIds, needsProgress
      ? { onProgress: emitProgress, chunkSize: 100 }
      : {});

    if (needsProgress) {
      emitProgress({
        total: taskIds.length,
        completed: result.success,
        success: result.success,
        errors: result.errors,
        isActive: false
      });
    }

    recordHistory(result.success, result.errors,
      result.errors > 0 ? [`${result.errors} deletion${result.errors !== 1 ? 's' : ''} failed`] : []);

    return result;
  } catch (error) {
    if (needsProgress) {
      emitProgress({ total: taskIds.length, completed: 0, success: 0, errors: taskIds.length, isActive: false });
    }
    recordHistory(0, taskIds.length, [error.message || String(error)]);
    throw error;
  }
}
