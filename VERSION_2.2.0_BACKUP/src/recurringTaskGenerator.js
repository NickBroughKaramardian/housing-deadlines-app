/**
 * Recurring Task Generator
 * Automatically generates instances from recurring tasks
 */

import { parse, isValid, addMonths, format } from 'date-fns';
import recurringInstanceService from './recurringInstanceService';
import { globalTaskStore } from './globalTaskStore';

class RecurringTaskGenerator {
  constructor() {
    this.maxYear = 2050;
  }

  /**
   * Parse deadline date string to Date object
   */
  parseDeadlineDate(dateStr) {
    if (!dateStr) return null;
    
    // Extract date components to avoid timezone issues
    let year, month, day;
    
    // Try ISO format first (SharePoint format: 2024-10-09T00:00:00Z or 2024-10-09)
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const datePart = dateStr.split('T')[0]; // Get just the date part
      const parts = datePart.split('-');
      if (parts.length === 3) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
        day = parseInt(parts[2], 10);
        
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          // Create date at noon local time to avoid timezone shifts
          return new Date(year, month, day, 12, 0, 0);
        }
      }
    }
    
    // Try explicit formats with date-fns as fallback
    const formats = [
      'MM/dd/yyyy',
      'M/d/yy',
      'M/d/yyyy',
      'MM/dd/yy',
    ];
    
    for (const fmt of formats) {
      const d = parse(dateStr, fmt, new Date());
      if (isValid(d)) {
        // Set to noon to avoid timezone issues
        d.setHours(12, 0, 0, 0);
        return d;
      }
    }
    
    return null;
  }

  /**
   * Parse final date string to Date object
   */
  parseFinalDate(dateStr) {
    if (!dateStr) return null;
    return this.parseDeadlineDate(dateStr);
  }

  /**
   * Generate instances for a single recurring task
   */
  async generateInstancesForTask(task) {
    console.log('RecurringTaskGenerator: Generating instances for task:', task.Task || task.id);
    console.log('RecurringTaskGenerator: Task Recurring field:', task.Recurring, typeof task.Recurring);
    
    // Check if task is recurring - handle various formats
    const recurringValue = String(task.Recurring || '').trim();
    const isRecurring = recurringValue.toLowerCase() === 'yes' || 
                       recurringValue.toLowerCase() === 'true' ||
                       task.Recurring === true;
    console.log('RecurringTaskGenerator: Task Recurring field:', task.Recurring, typeof task.Recurring, 'normalized:', recurringValue, 'isRecurring:', isRecurring);
    if (!isRecurring) {
      console.log('RecurringTaskGenerator: Task is not recurring (Recurring field is not "Yes" or "True"), skipping');
      return;
    }

    // Validate required fields
    if (!task.Interval || !task.Deadline) {
      console.log('RecurringTaskGenerator: Missing required fields (Interval or Deadline)');
      return;
    }

    const interval = parseInt(task.Interval, 10);
    if (isNaN(interval) || interval < 1) {
      console.log('RecurringTaskGenerator: Invalid interval:', task.Interval);
      return;
    }

    const startDate = this.parseDeadlineDate(task.Deadline);
    if (!startDate) {
      console.log('RecurringTaskGenerator: Invalid start date:', task.Deadline);
      return;
    }
    
    console.log('RecurringTaskGenerator: Parsed deadline:', {
      raw: task.Deadline,
      parsed: startDate.toISOString(),
      localDate: startDate.toLocaleDateString(),
      year: startDate.getFullYear(),
      month: startDate.getMonth() + 1,
      day: startDate.getDate()
    });

    // Determine end date
    let endDate;
    if (task.FinalDate) {
      endDate = this.parseFinalDate(task.FinalDate);
      if (!endDate) {
        // If finalDate is invalid, use maxYear
        endDate = new Date(this.maxYear, 11, 31);
      }
    } else {
      // No finalDate specified, use maxYear
      endDate = new Date(this.maxYear, 11, 31);
    }

    // Ensure endDate doesn't exceed maxYear
    const maxEndDate = new Date(this.maxYear, 11, 31);
    if (endDate > maxEndDate) {
      endDate = maxEndDate;
    }

    console.log('RecurringTaskGenerator: Generating instances from', format(startDate, 'yyyy-MM-dd'), 'to', format(endDate, 'yyyy-MM-dd'));

    // Get existing instances to preserve modifications
    const existingInstances = await recurringInstanceService.getInstancesByParent(task.id);
    const existingInstancesMap = new Map(existingInstances.map(inst => [inst.id, inst]));
    console.log('RecurringTaskGenerator: Found', existingInstances.length, 'existing instances with modifications to preserve');

    // Generate instances starting from the FIRST occurrence (the parent's date)
    // This creates a "current year clone" in the sub-database so users can work with it
    const instances = [];
    let currentDate = new Date(startDate); // Start from the parent's date, not the next recurrence
    let instanceNumber = 0; // Start from 0 so first instance is labeled correctly

    while (currentDate <= endDate) {

      // Format the date ensuring we use the local date components
      // Create a new date object to avoid any timezone issues
      const instanceDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 12, 0, 0);
      const instanceDateStr = format(instanceDate, 'yyyy-MM-dd');
      const instanceId = `${task.id}_${instanceDateStr}`;
      
      console.log('RecurringTaskGenerator: Creating instance for date:', {
        originalCurrentDate: currentDate.toISOString(),
        newInstanceDate: instanceDate.toISOString(),
        formatted: instanceDateStr,
        localString: instanceDate.toLocaleDateString(),
        year: instanceDate.getFullYear(),
        month: instanceDate.getMonth() + 1,
        day: instanceDate.getDate(),
        parentDeadlineWas: task.Deadline
      });
      
      // Check if this instance existed before and had modifications
      const existingInstance = existingInstancesMap.get(instanceId);
      const hasModifications = existingInstance && Object.keys(existingInstance.modifications || {}).length > 0;
      
      // Create base task for this instance
      const baseTask = {
        ...task,
        // Override fields for instance - use the formatted date string
        Deadline: instanceDateStr,
        Status: this.calculateInstanceStatus(task, currentDate),
        Completed_x003f_: false // Default to incomplete
      };
      
      // If existing instance has modifications, preserve them but exclude status fields
      let preservedModifications = {};
      let preservedCompletionStatus = false;
      
      if (hasModifications) {
        // Preserve ALL modifications including status fields (Completed_x003f_, Priority)
        // These are user actions that should persist across regenerations
        preservedModifications = { ...existingInstance.modifications };
        
        // Preserve completion status from the instance
        preservedCompletionStatus = existingInstance.completionStatus || false;
        
        console.log('RecurringTaskGenerator: Preserving ALL modifications for instance:', instanceId, {
          existingModifications: existingInstance.modifications,
          preservedModifications: preservedModifications,
          completionStatus: preservedCompletionStatus
        });
      }
      
      // Create instance object
      const instance = {
        id: instanceId,
        parentId: task.id,
        instanceDate: instanceDateStr, // Use the formatted date string
        instanceNumber: instanceNumber,
        baseTask: baseTask,
        completionStatus: preservedCompletionStatus,
        modifications: preservedModifications,
        createdAt: existingInstance ? existingInstance.createdAt : new Date().toISOString(),
        lastModified: hasModifications ? new Date().toISOString() : new Date().toISOString()
      };

      instances.push(instance);
      
      // Move to next occurrence by adding interval months
      currentDate = addMonths(currentDate, interval);
      instanceNumber++;
    }

    console.log(`RecurringTaskGenerator: Generated ${instances.length} instances for task:`, task.Task || task.id);

    // Store instances in IndexedDB - use updateInstance (which uses .put) to avoid conflicts
    for (const instance of instances) {
      try {
        await recurringInstanceService.updateInstance(instance);
      } catch (error) {
        console.error('RecurringTaskGenerator: Failed to save instance:', instance.id, error);
      }
    }

    return instances.length;
  }

  /**
   * Calculate status for an instance based on its date
   */
  calculateInstanceStatus(task, instanceDate) {
    const today = new Date();
    const deadline = new Date(instanceDate);
    
    // If it's a past date and not completed, it's overdue
    if (deadline < today) {
      return 'Overdue';
    }
    
    return 'Active';
  }

  /**
   * Generate instances for all recurring tasks
   */
  async generateAllInstances(tasks) {
    console.log('RecurringTaskGenerator: Starting generation for all tasks (recurring + non-recurring clones)');
    
    // If no tasks, clear all instances
    if (!tasks || tasks.length === 0) {
      console.log('RecurringTaskGenerator: No tasks found, clearing all instances');
      await recurringInstanceService.clearAllInstances();
      return { totalInstances: 0, results: [] };
    }

    console.log('RecurringTaskGenerator: Sample task structure:', tasks[0]);
    console.log('RecurringTaskGenerator: All task Recurring values:', tasks.map(t => ({ id: t.id, Task: t.Task, Recurring: t.Recurring, RecurringType: typeof t.Recurring })));
    
    // Separate recurring and non-recurring tasks
    const recurringTasks = [];
    const nonRecurringTasks = [];
    
    tasks.forEach(task => {
      const recurringValue = String(task.Recurring || '').trim();
      const isRecurring = recurringValue.toLowerCase() === 'yes' || 
                         recurringValue.toLowerCase() === 'true' ||
                         task.Recurring === true;
      
      if (isRecurring) {
        recurringTasks.push(task);
      } else {
        nonRecurringTasks.push(task);
      }
    });
    
    console.log(`RecurringTaskGenerator: Found ${recurringTasks.length} recurring tasks and ${nonRecurringTasks.length} non-recurring tasks`);

    let totalInstances = 0;
    const results = [];

    // Generate instances for recurring tasks
    for (const task of recurringTasks) {
      try {
        const count = await this.generateInstancesForTask(task);
        if (count > 0) {
          totalInstances += count;
          results.push({ taskId: task.id, taskName: task.Task, instanceCount: count, type: 'recurring' });
        }
      } catch (error) {
        console.error('RecurringTaskGenerator: Failed to generate instances for recurring task:', task.id, error);
        results.push({ taskId: task.id, taskName: task.Task, error: error.message, type: 'recurring' });
      }
    }
    
    // Generate clones for non-recurring tasks
    for (const task of nonRecurringTasks) {
      try {
        await this.generateNonRecurringClone(task);
        totalInstances += 1;
        results.push({ taskId: task.id, taskName: task.Task, instanceCount: 1, type: 'non-recurring-clone' });
      } catch (error) {
        console.error('RecurringTaskGenerator: Failed to generate clone for non-recurring task:', task.id, error);
        results.push({ taskId: task.id, taskName: task.Task, error: error.message, type: 'non-recurring-clone' });
      }
    }

    console.log(`RecurringTaskGenerator: Generated ${totalInstances} total instances (including non-recurring clones)`);
    return { totalInstances, results };
  }
  
  /**
   * Generate a single clone for a non-recurring task
   * This allows non-recurring tasks to appear in the sub-database as working copies
   */
  async generateNonRecurringClone(task) {
    console.log('RecurringTaskGenerator: Creating clone for non-recurring task:', task.Task || task.id);
    
    // Parse the deadline
    const deadline = this.parseDeadlineDate(task.Deadline);
    if (!deadline) {
      console.log('RecurringTaskGenerator: No valid deadline for task, skipping clone');
      return 0;
    }
    
    const instanceDateStr = format(deadline, 'yyyy-MM-dd');
    const instanceId = `${task.id}_clone`;
    
    // Check if clone already exists
    const existingInstances = await recurringInstanceService.getInstancesByParent(task.id);
    const existingClone = existingInstances.find(inst => inst.id === instanceId);
    
    // Create the base task (clone of the parent)
    const baseTask = {
      ...task,
      Deadline: instanceDateStr,
      Status: this.calculateInstanceStatus(task, deadline),
      Completed_x003f_: task.Completed_x003f_ || false
    };
    
    // Preserve modifications if clone exists
    let preservedModifications = {};
    let preservedCompletionStatus = false;
    
    if (existingClone) {
      // Preserve ALL modifications including status fields (Completed_x003f_, Priority)
      // These are user actions that should persist across regenerations
      preservedModifications = { ...existingClone.modifications };
      preservedCompletionStatus = existingClone.completionStatus || false;
      
      console.log('RecurringTaskGenerator: Preserving ALL modifications for non-recurring clone:', instanceId, preservedModifications);
    }
    
    // Create the clone instance
    const instance = {
      id: instanceId,
      parentId: task.id,
      instanceDate: instanceDateStr,
      instanceNumber: 0, // Non-recurring tasks have instance number 0
      baseTask: baseTask,
      completionStatus: preservedCompletionStatus,
      modifications: preservedModifications,
      createdAt: existingClone ? existingClone.createdAt : new Date().toISOString(),
      lastModified: existingClone ? new Date().toISOString() : new Date().toISOString(),
      isNonRecurringClone: true // Flag to identify non-recurring clones
    };
    
    await recurringInstanceService.updateInstance(instance);
    console.log('RecurringTaskGenerator: Created/updated clone for non-recurring task:', instanceId);
    
    return 1;
  }

  /**
   * Cascade parent task changes to all instances
   * Updates all instances with new parent data EXCEPT Completed_x003f_, Priority, and deletion status
   */
  async cascadeParentChanges(parentTask) {
    console.log('RecurringTaskGenerator: Cascading parent changes to instances for:', parentTask.Task || parentTask.id);
    
    // Get all instances for this parent
    const instances = await recurringInstanceService.getInstancesByParent(parentTask.id);
    console.log(`RecurringTaskGenerator: Found ${instances.length} instances to update`);
    
    if (instances.length === 0) return;
    
    // Update each instance's baseTask with new parent data
    // BUT preserve their individual modifications for Completed_x003f_, Priority
    for (const instance of instances) {
      // Create updated baseTask from parent, but preserve instance-specific fields
      const updatedBaseTask = {
        ...parentTask,
        // Preserve the instance's specific deadline
        Deadline: instance.instanceDate,
        // CRITICAL: Don't cascade Completed or Priority - keep original baseTask values
        Completed_x003f_: instance.baseTask.Completed_x003f_,
        Priority: instance.baseTask.Priority
      };
      
      const updatedInstance = {
        ...instance,
        baseTask: updatedBaseTask,
        lastModified: new Date().toISOString()
      };
      
      console.log('RecurringTaskGenerator: Updating instance', instance.id, 'with new parent data, preserving Completed/Priority');
      
      await recurringInstanceService.updateInstance(updatedInstance);
    }
    
    console.log('RecurringTaskGenerator: Cascade complete for', instances.length, 'instances');
  }

  /**
   * Update instances when a recurring task is modified
   */
  async updateTaskInstances(task) {
    console.log('RecurringTaskGenerator: Updating instances for modified task:', task.Task || task.id);
    console.log('RecurringTaskGenerator: Task Recurring field:', task.Recurring, typeof task.Recurring);
    
    const recurringValue = String(task.Recurring || '').trim();
    const isRecurring = recurringValue.toLowerCase() === 'yes' || 
                       recurringValue.toLowerCase() === 'true' ||
                       task.Recurring === true;
    if (isRecurring) {
      // Regenerate instances for this task
      await this.generateInstancesForTask(task);
    } else {
      // Task is no longer recurring, delete all instances
      await recurringInstanceService.deleteInstancesByParent(task.id);
    }
  }

  /**
   * Delete instances when a task is deleted
   */
  async deleteTaskInstances(taskId) {
    console.log('RecurringTaskGenerator: Deleting instances for deleted task:', taskId);
    await recurringInstanceService.deleteInstancesByParent(taskId);
  }

  /**
   * Get all instances combined with base tasks
   */
  async getAllTaskInstances() {
    const instances = await recurringInstanceService.getAllInstances();
    
    // Convert instances to task format for compatibility with existing code
    return instances.map(instance => ({
      ...instance.baseTask,
      id: instance.id, // Use instance ID instead of parent ID
      originalId: instance.parentId, // Keep reference to original task
      isInstance: true, // Flag to identify instances
      instanceDate: instance.instanceDate,
      instanceNumber: instance.instanceNumber,
      completionStatus: instance.completionStatus,
      modifications: instance.modifications,
      createdAt: instance.createdAt,
      lastModified: instance.lastModified,
      // Apply modifications on top of baseTask so changes are visible
      ...instance.modifications
    }));
  }

  /**
   * Update instance completion status
   */
  async updateInstanceCompletion(instanceId, completed) {
    const instances = await recurringInstanceService.getAllInstances();
    const instance = instances.find(i => i.id === instanceId);
    
    if (instance) {
      instance.completionStatus = completed;
      instance.lastModified = new Date().toISOString();
      
      // Update the modifications object instead of baseTask
      instance.modifications = {
        ...instance.modifications,
        Completed_x003f_: completed
      };
      
      await recurringInstanceService.updateInstance(instance);
      console.log('RecurringTaskGenerator: Updated instance completion:', instanceId, completed);
    }
  }

  /**
   * Update instance modifications
   */
  async updateInstanceModifications(instanceId, modifications) {
    const instances = await recurringInstanceService.getAllInstances();
    const instance = instances.find(i => i.id === instanceId);
    
    if (instance) {
      instance.modifications = { ...instance.modifications, ...modifications };
      instance.lastModified = new Date().toISOString();
      
      // CRITICAL: Do NOT apply modifications to baseTask!
      // The baseTask should remain unchanged - modifications are applied on top when displaying
      // This ensures true independence of instances
      
      await recurringInstanceService.updateInstance(instance);
      console.log('RecurringTaskGenerator: Updated instance modifications:', instanceId, modifications);
    }
  }

  /**
   * Refresh all instances based on current SharePoint tasks
   */
  async refreshAllInstances(tasks) {
    console.log('RecurringTaskGenerator: Refreshing all instances with', tasks ? tasks.length : 0, 'tasks...');
    try {
      // Only regenerate instances if tasks have actually changed
      // This prevents unnecessary regeneration that wipes out user completion status
      const currentTasks = globalTaskStore.getTasks();
      
      // Check if tasks have changed by comparing key fields
      const tasksChanged = this.haveTasksChanged(currentTasks, tasks);
      
      if (tasksChanged) {
        console.log('RecurringTaskGenerator: Tasks have changed, regenerating instances...');
        await this.generateAllInstances(tasks);
      } else {
        console.log('RecurringTaskGenerator: No task changes detected, skipping regeneration to preserve user modifications');
      }
      
      console.log('RecurringTaskGenerator: Refresh completed');
    } catch (error) {
      console.error('RecurringTaskGenerator: Error refreshing instances:', error);
    }
  }
  
  /**
   * Check if tasks have changed in ways that require instance regeneration
   */
  haveTasksChanged(currentTasks, newTasks) {
    if (!currentTasks || !newTasks || currentTasks.length !== newTasks.length) {
      console.log('RecurringTaskGenerator: Task count changed, regeneration needed');
      return true;
    }
    
    // Check each task for changes in fields that affect instances
    for (let i = 0; i < currentTasks.length; i++) {
      const current = currentTasks[i];
      const updated = newTasks.find(t => t.id === current.id);
      
      if (!updated) {
        console.log('RecurringTaskGenerator: Task removed, regeneration needed');
        return true;
      }
      
      // Check fields that affect instance generation
      const fieldsToCheck = ['Recurring', 'Interval', 'FinalDate', 'Deadline', 'Task', 'Project', 'Notes', 'Link'];
      for (const field of fieldsToCheck) {
        if (current[field] !== updated[field]) {
          console.log(`RecurringTaskGenerator: Task ${current.id} field '${field}' changed from '${current[field]}' to '${updated[field]}', regeneration needed`);
          return true;
        }
      }
    }
    
    return false;
  }
}

// Create singleton instance
const recurringTaskGenerator = new RecurringTaskGenerator();

export default recurringTaskGenerator;

