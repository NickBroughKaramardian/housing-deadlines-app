/**
 * TaskManager Service
 * 
 * Centralized task management service that:
 * - Holds all tasks in memory (single source of truth)
 * - Reads/writes directly to Cosmos DB
 * - Emits events for instant propagation to all pages
 * - Provides optimistic updates with rollback
 * - Normalizes field names for consistency
 * 
 * Architecture:
 * - Database page = Source of Truth
 * - All other pages subscribe to events
 * - No API calls for reads (only writes)
 * - Instant updates via events
 */

import { azureTaskService } from './azureTaskService';

class TaskManager {
  constructor() {
    this.tasks = [];
    this.isLoading = false;
    this.isInitialized = false;
    this.subscribers = new Set();
    this.pendingUpdates = new Map(); // Track pending optimistic updates for rollback
  }

  /**
   * Initialize - Load all tasks from Cosmos DB
   * CRITICAL: This completely replaces the tasks array to ensure no phantom tasks
   */
  async initialize(forceRefresh = false) {
    if (this.isInitialized && !forceRefresh) {
      return this.tasks;
    }

    this.isLoading = true;
    this.emit('loading', { isLoading: true });

    try {
      // CRITICAL: Always load fresh from database, no cache
      const allTasks = await azureTaskService.loadAllTasks({ useCache: false });
      
      // CRITICAL: Completely replace tasks array (don't merge or append)
      // This ensures we only have tasks that exist in the database
      this.tasks = this.normalizeTasks(allTasks);
      
      // Remove any optimistic updates that weren't confirmed
      this.tasks = this.tasks.filter(t => !t._optimistic || t._confirmed);
      
      this.isInitialized = true;
      this.isLoading = false;
      
      console.log(`✅ TaskManager: Initialized with ${this.tasks.length} tasks from database`);
      this.emit('refreshed', { tasks: this.tasks });
      this.emit('loading', { isLoading: false });
      
      return this.tasks;
    } catch (error) {
      console.error('TaskManager: Failed to initialize', error);
      this.isLoading = false;
      this.emit('loading', { isLoading: false });
      this.emit('error', { error });
      throw error;
    }
  }

  /**
   * Get all tasks (from memory, no API call)
   */
  getAllTasks() {
    return [...this.tasks]; // Return copy to prevent mutations
  }

  /**
   * Get task by ID
   */
  getTaskById(id) {
    return this.tasks.find(t => t.id === id);
  }

  /**
   * Create task (optimistic update + Cosmos DB write)
   */
  async createTask(taskData) {
    // Normalize task data
    const normalizedTask = this.normalizeTask(taskData);
    
    // Generate ID if not provided
    if (!normalizedTask.id) {
      normalizedTask.id = this.generateId();
    }

    // Optimistic update
    const optimisticTask = { ...normalizedTask, _optimistic: true };
    this.tasks = [...this.tasks, optimisticTask];
    this.emit('created', { task: optimisticTask });

    // Save to Cosmos DB in background
    try {
      const savedTask = await azureTaskService.createTask(normalizedTask);
      const finalTask = this.normalizeTask(savedTask);
      
      // Replace optimistic task with saved task (mark as confirmed)
      const confirmedTask = { ...finalTask, _confirmed: true };
      this.tasks = this.tasks.map(t => 
        t.id === normalizedTask.id && t._optimistic ? confirmedTask : t
      );
      
      this.emit('updated', { task: confirmedTask });
      return confirmedTask;
    } catch (error) {
      console.error('TaskManager: Failed to create task', error);
      
      // Rollback optimistic update
      this.tasks = this.tasks.filter(t => t.id !== normalizedTask.id || !t._optimistic);
      this.emit('error', { error, taskId: normalizedTask.id, operation: 'create' });
      throw error;
    }
  }

  /**
   * Update task (optimistic update + Cosmos DB write)
   */
  async updateTask(id, updates) {
    const existingTask = this.getTaskById(id);
    if (!existingTask) {
      throw new Error(`Task ${id} not found`);
    }

    // Normalize updates
    const normalizedUpdates = this.normalizeTask(updates);
    
    // Store original task for rollback
    const originalTask = { ...existingTask };
    
    // Optimistic update
    const optimisticTask = { ...existingTask, ...normalizedUpdates, _optimistic: true };
    this.tasks = this.tasks.map(t => t.id === id ? optimisticTask : t);
    this.emit('updated', { task: optimisticTask });

    // Save to Cosmos DB in background
    try {
      const savedTask = await azureTaskService.updateTask(id, normalizedUpdates);
      const finalTask = this.normalizeTask(savedTask);
      
      // Replace optimistic task with saved task (mark as confirmed)
      const confirmedTask = { ...finalTask, _confirmed: true };
      this.tasks = this.tasks.map(t => 
        t.id === id && t._optimistic ? confirmedTask : t
      );
      
      this.emit('updated', { task: confirmedTask });
      return confirmedTask;
    } catch (error) {
      console.error('TaskManager: Failed to update task', error);
      
      // Rollback optimistic update
      this.tasks = this.tasks.map(t => t.id === id ? originalTask : t);
      this.emit('error', { error, taskId: id, operation: 'update' });
      throw error;
    }
  }

  /**
   * Delete task (optimistic update + Cosmos DB write)
   */
  async deleteTask(id) {
    const existingTask = this.getTaskById(id);
    if (!existingTask) {
      throw new Error(`Task ${id} not found`);
    }

    // Store original task for rollback
    const originalTask = { ...existingTask };
    
    // Optimistic update
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.emit('deleted', { taskId: id, task: originalTask });

    // Delete from Cosmos DB in background
    try {
      await azureTaskService.deleteTask(id);
      this.emit('deleted', { taskId: id, task: originalTask, confirmed: true });
      return true;
    } catch (error) {
      console.error('TaskManager: Failed to delete task', error);
      
      // Rollback optimistic update
      this.tasks = [...this.tasks, originalTask].sort((a, b) => {
        // Maintain original order if possible
        return 0;
      });
      this.emit('error', { error, taskId: id, operation: 'delete' });
      this.emit('created', { task: originalTask }); // Re-emit as created for rollback
      throw error;
    }
  }

  /**
   * Batch create tasks
   */
  async batchCreate(tasks) {
    const normalizedTasks = tasks.map(t => this.normalizeTask(t));
    
    // Generate IDs for tasks without them
    normalizedTasks.forEach(task => {
      if (!task.id) {
        task.id = this.generateId();
      }
    });

    // Optimistic updates
    const optimisticTasks = normalizedTasks.map(t => ({ ...t, _optimistic: true }));
    this.tasks = [...this.tasks, ...optimisticTasks];
    this.emit('batchCreated', { tasks: optimisticTasks });

    // Save to Cosmos DB in background (batched)
    try {
      const savedTasks = await Promise.all(
        normalizedTasks.map(task => azureTaskService.createTask(task))
      );
      const finalTasks = savedTasks.map(t => this.normalizeTask(t));
      
      // Replace optimistic tasks with saved tasks (mark as confirmed)
      const confirmedTasks = finalTasks.map(t => ({ ...t, _confirmed: true }));
      this.tasks = this.tasks.map(t => {
        const saved = confirmedTasks.find(st => st.id === t.id);
        return saved && t._optimistic ? saved : t;
      });
      
      this.emit('batchUpdated', { tasks: confirmedTasks });
      return confirmedTasks;
    } catch (error) {
      console.error('TaskManager: Failed to batch create tasks', error);
      
      // Rollback optimistic updates
      const optimisticIds = new Set(optimisticTasks.map(t => t.id));
      this.tasks = this.tasks.filter(t => !optimisticIds.has(t.id) || !t._optimistic);
      this.emit('error', { error, operation: 'batchCreate' });
      throw error;
    }
  }

  /**
   * Batch update tasks
   */
  async batchUpdate(updates) {
    // updates is an array of { id, updates } objects
    const originalTasks = updates.map(({ id }) => this.getTaskById(id)).filter(Boolean);
    
    // Track which tasks were in memory vs not in memory
    const tasksInMemory = new Set();
    const tasksNotInMemory = [];
    
    // Optimistic updates - create for tasks in memory, track missing ones
    updates.forEach(({ id, updates: taskUpdates }) => {
      const existingTask = this.getTaskById(id);
      if (existingTask) {
        tasksInMemory.add(id);
        const normalizedUpdates = this.normalizeTask(taskUpdates);
        const optimisticTask = { 
          ...existingTask, 
          ...normalizedUpdates, 
          _optimistic: true,
          _optimisticTimestamp: Date.now() // Track when optimistic update was created
        };
        this.tasks = this.tasks.map(t => t.id === id ? optimisticTask : t);
      } else {
        // Task not in memory - we'll need to add it after API call succeeds
        tasksNotInMemory.push({ id, updates: taskUpdates });
      }
    });
    
    this.emit('batchUpdated', { tasks: this.tasks.filter(t => updates.some(u => u.id === t.id)) });

    // Save to Cosmos DB in background (batched) - use Promise.allSettled for partial failures
    try {
      const results = await Promise.allSettled(
        updates.map(({ id, updates: taskUpdates }) => 
          azureTaskService.updateTask(id, this.normalizeTask(taskUpdates))
        )
      );
      
      const savedTasks = [];
      const failedTasks = [];
      
      results.forEach((result, index) => {
        const { id } = updates[index];
        if (result.status === 'fulfilled') {
          const normalizedTask = this.normalizeTask(result.value);
          savedTasks.push(normalizedTask);
        } else {
          failedTasks.push({ id, error: result.reason });
          console.error(`TaskManager: Failed to update task ${id}:`, result.reason);
        }
      });
      
      // Replace optimistic tasks with saved tasks (mark as confirmed)
      const confirmedTasks = savedTasks.map(t => ({ ...t, _confirmed: true }));
      
      // Update tasks that were in memory
      this.tasks = this.tasks.map(t => {
        const saved = confirmedTasks.find(st => st.id === t.id);
        if (saved && t._optimistic) {
          return saved; // Replace optimistic task with confirmed task
        }
        return t;
      });
      
      // Add tasks that weren't in memory but were successfully updated
      confirmedTasks.forEach(savedTask => {
        if (!tasksInMemory.has(savedTask.id)) {
          // Task wasn't in memory, add it now
          const existingIndex = this.tasks.findIndex(t => t.id === savedTask.id);
          if (existingIndex === -1) {
            // Task doesn't exist, add it
            this.tasks.push(savedTask);
          } else {
            // Task exists but wasn't optimistic, update it
            this.tasks[existingIndex] = savedTask;
          }
        }
      });
      
      // Rollback failed tasks that were in memory
      if (failedTasks.length > 0) {
        failedTasks.forEach(({ id }) => {
          const originalTask = originalTasks.find(t => t.id === id);
          if (originalTask) {
            // Rollback this specific task
            this.tasks = this.tasks.map(t => t.id === id ? originalTask : t);
          } else {
            // Task wasn't in memory, remove it if it was added
            this.tasks = this.tasks.filter(t => t.id !== id || t._confirmed);
          }
        });
      }
      
      this.emit('batchUpdated', { tasks: confirmedTasks });
      
      // If there were failures, throw an error but still return successful updates
      if (failedTasks.length > 0) {
        const error = new Error(`Failed to update ${failedTasks.length} of ${updates.length} tasks`);
        error.failedTasks = failedTasks;
        error.successfulTasks = confirmedTasks;
        this.emit('error', { error, operation: 'batchUpdate', failedTasks, successfulTasks: confirmedTasks });
        throw error;
      }
      
      return confirmedTasks;
    } catch (error) {
      // This catch handles unexpected errors (not Promise.allSettled results)
      console.error('TaskManager: Failed to batch update tasks', error);
      
      // Rollback optimistic updates for tasks that were in memory
      originalTasks.forEach(originalTask => {
        this.tasks = this.tasks.map(t => t.id === originalTask.id ? originalTask : t);
      });
      
      // Remove any tasks that weren't in memory but might have been added
      tasksNotInMemory.forEach(({ id }) => {
        this.tasks = this.tasks.filter(t => t.id !== id || t._confirmed);
      });
      
      this.emit('error', { error, operation: 'batchUpdate' });
      throw error;
    }
  }

  /**
   * Batch delete tasks
   * @param {string[]} ids - Array of task IDs to delete
   * @param {Object} options - Optional configuration
   * @param {Function} options.onProgress - Callback for progress updates
   * @param {number} options.chunkSize - Number of tasks to delete per chunk (default: 100)
   * @param {number} options.threshold - Minimum number of tasks to use chunking (default: 1000)
   */
  async batchDelete(ids, options = {}) {
    const { 
      onProgress, 
      chunkSize = 100,
      threshold = 1000 
    } = options;

    const originalTasks = ids.map(id => this.getTaskById(id)).filter(Boolean);
    
    // Optimistic updates
    this.tasks = this.tasks.filter(t => !ids.includes(t.id));
    this.emit('batchDeleted', { taskIds: ids, tasks: originalTasks });

    // Fast path for small batches (backward compatible)
    if (ids.length < threshold && !onProgress) {
      try {
        await Promise.all(ids.map(id => azureTaskService.deleteTask(id)));
        this.emit('batchDeleted', { taskIds: ids, tasks: originalTasks, confirmed: true });
        return { success: ids.length, errors: 0 };
      } catch (error) {
        console.error('TaskManager: Failed to batch delete tasks', error);
        
        // Rollback optimistic updates
        this.tasks = [...this.tasks, ...originalTasks];
        this.emit('error', { error, operation: 'batchDelete' });
        this.emit('batchCreated', { tasks: originalTasks }); // Re-emit as created for rollback
        throw error;
      }
    }

    // Chunked deletion with progress tracking
    let completed = 0;
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process in chunks
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      
      try {
        const results = await Promise.allSettled(
          chunk.map(id => azureTaskService.deleteTask(id))
        );
        
        // Process results and update counters
        results.forEach((result, index) => {
          completed++;
          if (result.status === 'fulfilled') {
            successCount++;
          } else {
            errorCount++;
            errors.push({ id: chunk[index], error: result.reason?.message || 'Unknown error' });
          }
        });
        
        // Emit progress update after processing chunk
        // Report success count (actual deletions) not completed (attempts)
        if (onProgress) {
          onProgress({
            completed: successCount, // Report actual successes, not attempts
            total: ids.length,
            success: successCount,
            errors: errorCount,
            isActive: completed < ids.length
          });
        }
      } catch (error) {
        // Handle chunk-level errors
        errorCount += chunk.length;
        chunk.forEach(id => errors.push({ id, error: error.message }));
        completed += chunk.length;
        
        // Emit progress update even on error
        // Report success count (actual deletions) not completed (attempts)
        if (onProgress) {
          onProgress({
            completed: successCount, // Report actual successes, not attempts
            total: ids.length,
            success: successCount,
            errors: errorCount,
            isActive: completed < ids.length
          });
        }
      }
    }

    // Final emit
    this.emit('batchDeleted', { 
      taskIds: ids, 
      tasks: originalTasks, 
      confirmed: true,
      success: successCount,
      errors: errorCount
    });

    if (errorCount > 0 && successCount === 0) {
      // Complete failure - rollback
      this.tasks = [...this.tasks, ...originalTasks];
      this.emit('error', { error: new Error(`${errorCount} deletion(s) failed`), operation: 'batchDelete' });
      this.emit('batchCreated', { tasks: originalTasks }); // Re-emit as created for rollback
      throw new Error(`${errorCount} deletion(s) failed`);
    }

    return { success: successCount, errors: errorCount };
  }

  /**
   * Refresh from Cosmos DB (background operation)
   * CRITICAL: This completely replaces the tasks array to ensure no phantom tasks
   */
  async refresh() {
    try {
      // CRITICAL: Always load fresh from database, no cache
      const allTasks = await azureTaskService.loadAllTasks({ useCache: false });
      
      // CRITICAL: Completely replace tasks array (don't merge or append)
      // This ensures we only have tasks that exist in the database
      const normalizedTasks = this.normalizeTasks(allTasks);
      
      // Remove any optimistic updates that weren't confirmed
      const confirmedTasks = normalizedTasks.filter(t => !t._optimistic || t._confirmed);
      
      // Verify task count matches database
      if (confirmedTasks.length !== normalizedTasks.length) {
        console.warn(`⚠️ TaskManager: Removed ${normalizedTasks.length - confirmedTasks.length} unconfirmed optimistic tasks`);
      }
      
      this.tasks = confirmedTasks;
      
      console.log(`✅ TaskManager: Refreshed with ${this.tasks.length} tasks from database`);
      this.emit('refreshed', { tasks: this.tasks });
      return this.tasks;
    } catch (error) {
      console.error('TaskManager: Failed to refresh', error);
      this.emit('error', { error, operation: 'refresh' });
      throw error;
    }
  }

  /**
   * Verify tasks match database (for debugging)
   */
  async verifyTasks() {
    try {
      const dbTasks = await azureTaskService.loadAllTasks({ useCache: false });
      const dbTaskIds = new Set(dbTasks.map(t => t.id));
      const memoryTaskIds = new Set(this.tasks.map(t => t.id));
      
      const phantomTasks = this.tasks.filter(t => !dbTaskIds.has(t.id));
      const missingTasks = dbTasks.filter(t => !memoryTaskIds.has(t.id));
      
      if (phantomTasks.length > 0 || missingTasks.length > 0) {
        console.warn('⚠️ TaskManager: Task mismatch detected!', {
          phantomTasks: phantomTasks.length,
          missingTasks: missingTasks.length,
          phantomTaskIds: phantomTasks.map(t => t.id),
          missingTaskIds: missingTasks.map(t => t.id)
        });
        return false;
      }
      
      console.log('✅ TaskManager: All tasks verified against database');
      return true;
    } catch (error) {
      console.error('TaskManager: Failed to verify tasks', error);
      return false;
    }
  }

  /**
   * Subscribe to changes
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Emit event to all subscribers
   */
  emit(eventType, data) {
    // Emit custom DOM event for cross-component communication
    window.dispatchEvent(new CustomEvent('taskDataChanged', {
      detail: {
        type: eventType,
        ...data,
        timestamp: Date.now()
      }
    }));

    // Also notify direct subscribers
    this.subscribers.forEach(callback => {
      try {
        callback({ type: eventType, ...data });
      } catch (error) {
        console.error('TaskManager: Subscriber error', error);
      }
    });
  }

  /**
   * Normalize task - ensure consistent field names
   */
  normalizeTask(task) {
    if (!task || typeof task !== 'object') {
      return task;
    }

    const normalized = { ...task };

    // Normalize field names (support both lowercase and uppercase)
    if (normalized.Project && !normalized.project) {
      normalized.project = normalized.Project;
    }
    if (normalized.project && !normalized.Project) {
      normalized.Project = normalized.project;
    }

    if (normalized.ResponsibleParty && !normalized.responsibleParty) {
      normalized.responsibleParty = normalized.ResponsibleParty;
    }
    if (normalized.responsibleParty && !normalized.ResponsibleParty) {
      normalized.ResponsibleParty = normalized.responsibleParty;
    }

    if (normalized.Deadline && !normalized.deadline && !normalized.deadline_date) {
      normalized.deadline_date = normalized.Deadline;
      normalized.deadline = normalized.Deadline;
    }
    if (normalized.deadline && !normalized.deadline_date) {
      normalized.deadline_date = normalized.deadline;
    }
    if (normalized.deadline_date && !normalized.deadline) {
      normalized.deadline = normalized.deadline_date;
    }
    if (normalized.deadline_date && !normalized.Deadline) {
      normalized.Deadline = normalized.deadline_date;
    }

    if (normalized.Task && !normalized.title) {
      normalized.title = normalized.Task;
    }
    if (normalized.title && !normalized.Task) {
      normalized.Task = normalized.title;
    }

    // Normalize priority field (support both lowercase and uppercase)
    if (normalized.Priority && !normalized.priority) {
      normalized.priority = normalized.Priority;
    }
    if (normalized.priority && !normalized.Priority) {
      normalized.Priority = normalized.priority;
    }
    // Ensure priority has a default value
    if (!normalized.priority && !normalized.Priority) {
      normalized.priority = 'Normal';
      normalized.Priority = 'Normal';
    }

    return normalized;
  }

  /**
   * Normalize array of tasks
   */
  normalizeTasks(tasks) {
    if (!Array.isArray(tasks)) {
      return [];
    }
    return tasks.map(task => this.normalizeTask(task));
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create singleton instance
export const taskManager = new TaskManager();

// DO NOT initialize on module load - let pages initialize explicitly
// This ensures each page controls when to load data and prevents race conditions

// Expose verification function to window for debugging
if (typeof window !== 'undefined') {
  window.__VERIFY_TASKS__ = () => taskManager.verifyTasks();
  window.__TASK_MANAGER__ = taskManager;
  console.log('🔍 TaskManager: Debug functions available:');
  console.log('   window.__VERIFY_TASKS__() - Verify tasks match database');
  console.log('   window.__TASK_MANAGER__ - Access TaskManager instance');
}

