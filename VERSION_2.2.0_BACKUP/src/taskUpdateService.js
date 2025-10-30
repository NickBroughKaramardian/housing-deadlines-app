import { sharedDataService } from './sharedDataService';
import { globalTaskStore } from './globalTaskStore';
import recurringTaskGenerator from './recurringTaskGenerator';
import recurringInstanceService from './recurringInstanceService';
import { format } from 'date-fns';

/**
 * Centralized task update service for seamless database integration
 * Used by all task card buttons across Dashboard, Sort Deadlines, Calendar, and Gantt Chart
 */
class TaskUpdateService {
  constructor() {
    // Queue to prevent concurrent updates
    this.updateQueue = [];
    this.isProcessing = false;
  }
  /**
   * Update a task field with force-refresh to ensure data integrity
   * @param {string} taskId - The task ID
   * @param {object} updates - Fields to update (e.g., { Completed_x003f_: true })
   * @param {function} onStart - Callback when update starts (for loading indicator)
   * @param {function} onComplete - Callback when update completes
   */
  async updateTaskField(taskId, updates, onStart = null, onComplete = null) {
    // Add to queue to prevent concurrent updates
    return new Promise((resolve, reject) => {
      this.updateQueue.push({
        taskId,
        updates,
        onStart,
        onComplete,
        resolve,
        reject
      });
      
      // Process queue if not already processing
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the update queue sequentially to prevent race conditions
   */
  async processQueue() {
    if (this.isProcessing || this.updateQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.updateQueue.length > 0) {
      const update = this.updateQueue.shift();
      
      try {
        await this.processUpdate(update);
        update.resolve();
      } catch (error) {
        update.reject(error);
      }
    }
    
    this.isProcessing = false;
  }

  /**
   * Process a single update
   */
  async processUpdate({ taskId, updates, onStart, onComplete }) {
    try {
      if (onStart) onStart();
      
      console.log('TaskUpdateService: Processing queued update for task:', taskId, 'with:', updates);
      
      // Get task from global store to determine if it's an instance or SharePoint task
      const allTasks = globalTaskStore.getAllTasks();
      console.log('TaskUpdateService: Looking for task:', taskId, 'in', allTasks.length, 'total tasks');
      const task = allTasks.find(t => t.id === taskId);
      
      if (!task) {
        console.error('TaskUpdateService: Task not found:', taskId);
        console.error('TaskUpdateService: Available task IDs:', allTasks.map(t => ({ id: t.id, isInstance: t.isInstance, originalId: t.originalId })));
        if (onComplete) onComplete();
        return;
      }
      
      console.log('TaskUpdateService: Found task:', { id: task.id, isInstance: task.isInstance, originalId: task.originalId });
      
      // Determine the field name and value from updates object
      const field = Object.keys(updates)[0];
      const processedValue = updates[field];
      
      
      // Check if this is a recurring instance
      if (task.originalId || task.isInstance) {
        // This is a recurring instance - update in IndexedDB
        console.log('TaskUpdateService: Updating recurring instance:', taskId);
        
        // Get the raw instance from IndexedDB (has baseTask and modifications structure)
        const allRawInstances = await recurringInstanceService.getAllInstances();
        console.log('TaskUpdateService: Looking for raw instance with ID:', taskId);
        console.log('TaskUpdateService: Available raw instance IDs:', allRawInstances.map(i => i.id));
        const rawInstance = allRawInstances.find(i => i.id === taskId);
        
        if (!rawInstance) {
          console.error('TaskUpdateService: Raw instance not found:', taskId);
          console.error('TaskUpdateService: This might be a non-recurring clone that needs different handling');
          if (onComplete) onComplete();
          return;
        }
        
        // Determine which field is being updated
        const field = Object.keys(updates)[0];
        const value = updates[field];
        
        console.log('TaskUpdateService: Updating instance field:', field, '=', value);
        
        // CRITICAL: Only update the modifications object, NOT the baseTask
        // The baseTask remains unchanged, modifications are applied on top when displaying
        const updatedInstance = {
          ...rawInstance,
          modifications: {
            ...rawInstance.modifications,
            [field]: value
          },
          completionStatus: field === 'Completed_x003f_' ? value : rawInstance.completionStatus,
          lastModified: new Date().toISOString()
        };
        
        console.log('TaskUpdateService: Updated instance with modifications:', {
          instanceId: taskId,
          field: field,
          value: value,
          allModifications: updatedInstance.modifications,
          completionStatus: updatedInstance.completionStatus,
          rawInstanceModifications: rawInstance.modifications
        });
        
        await recurringInstanceService.updateInstance(updatedInstance);
        console.log('TaskUpdateService: Instance updated in IndexedDB successfully');
        
        // Refresh instances and convert them to task format
        const allUpdatedRawInstances = await recurringInstanceService.getAllInstances();
        const convertedInstances = allUpdatedRawInstances.map(instance => ({
          ...instance.baseTask,
          id: instance.id,
          originalId: instance.parentId,
          isInstance: true,
          instanceDate: instance.instanceDate,
          instanceNumber: instance.instanceNumber,
          completionStatus: instance.completionStatus,
          modifications: instance.modifications,
          createdAt: instance.createdAt,
          lastModified: instance.lastModified,
          // Apply modifications on top
          ...instance.modifications
        }));
        
        console.log('TaskUpdateService: Converted instances for global store:', convertedInstances.length);
        console.log('TaskUpdateService: Sample converted instance:', convertedInstances.find(i => i.id === taskId));
        
        // Get fresh SharePoint tasks and update global store with combined data
        const freshTasks = await sharedDataService.getAllTasks();
        globalTaskStore.setAllTasks([...freshTasks, ...convertedInstances]);
        console.log('TaskUpdateService: Global store updated with', [...freshTasks, ...convertedInstances].length, 'total items');
        
        console.log('TaskUpdateService: Instance update complete');
        if (onComplete) onComplete();
        return;
      }
      
      // This is a regular SharePoint task
      console.log('TaskUpdateService: Updating SharePoint task with field:', field, '=', processedValue);
      
      // Update SharePoint
      await sharedDataService.updateTask(taskId, { [field]: processedValue });
      
      // Clear cache and fetch fresh data
      sharedDataService.clearCache();
      const freshTasks = await sharedDataService.getAllTasks();
      globalTaskStore.setTasks(freshTasks);
      
      const freshTask = freshTasks.find(t => t.id === taskId);
      
      // Regenerate instances if a recurring field was changed
      if (field === 'Recurring' || field === 'Interval' || field === 'FinalDate' || field === 'Deadline') {
        if (freshTask) {
          console.log('TaskUpdateService: Regenerating instances...');
          await recurringTaskGenerator.updateTaskInstances(freshTask);
        }
      } else if (field === 'Completed_x003f_' || field === 'Priority') {
        // For status fields (Completed, Priority), do NOT cascade to instances
        // These should remain independent
        console.log('TaskUpdateService: Status field changed, NOT cascading to instances to maintain independence');
      } else {
        // For non-recurring, non-status fields, cascade changes to all instances
        if (freshTask && (freshTask.Recurring === true || freshTask.Recurring === 'Yes')) {
          console.log('TaskUpdateService: Cascading parent changes to instances...');
          await recurringTaskGenerator.cascadeParentChanges(freshTask);
        }
      }
      
      // Update global store with combined tasks and instances
      const allInstances = await recurringTaskGenerator.getAllTaskInstances();
      globalTaskStore.setAllTasks([...freshTasks, ...allInstances]);
      
      console.log('TaskUpdateService: SharePoint task update complete');
      
      if (onComplete) onComplete();
    } catch (error) {
      console.error('TaskUpdateService: Error updating task:', error);
      if (onComplete) onComplete();
      throw error;
    }
  }
  
  /**
   * Delete a task with confirmation
   * @param {string} taskId - The task ID
   * @param {function} onStart - Callback when deletion starts
   * @param {function} onComplete - Callback when deletion completes
   */
  async deleteTask(taskId, onStart = null, onComplete = null) {
    try {
      if (onStart) onStart();
      
      console.log('TaskUpdateService: Deleting task:', taskId);
      
      // Check if this is a recurring instance
      const allTasks = globalTaskStore.getAllTasks();
      const task = allTasks.find(t => t.id === taskId);
      
      if (task && task.originalId) {
        // This is a recurring instance - delete from IndexedDB
        console.log('TaskUpdateService: Deleting recurring instance');
        await recurringInstanceService.deleteInstance(taskId);
      } else {
        // This is a regular SharePoint task - delete from SharePoint
        console.log('TaskUpdateService: Deleting SharePoint task');
        await sharedDataService.deleteTask(taskId);
      }
      
      // Update global store
      globalTaskStore.deleteTask(taskId);
      
      // Force-refresh
      console.log('TaskUpdateService: Force-refreshing after deletion...');
      sharedDataService.clearCache();
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const freshTasks = await sharedDataService.getAllTasks();
      globalTaskStore.setTasks(freshTasks);
      
      const allInstances = await recurringTaskGenerator.getAllTaskInstances();
      globalTaskStore.setAllTasks([...freshTasks, ...allInstances]);
      
      console.log('TaskUpdateService: Deletion complete');
      
      if (onComplete) onComplete();
    } catch (error) {
      console.error('TaskUpdateService: Error deleting task:', error);
      if (onComplete) onComplete();
      throw error;
    }
  }
}

const taskUpdateService = new TaskUpdateService();
export default taskUpdateService;

