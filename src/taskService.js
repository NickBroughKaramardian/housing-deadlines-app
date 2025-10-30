/**
 * Task Service - New Architecture
 * Handles all task operations with the main Tasks SharePoint list
 * Uses Instance column for recurring task management
 */

class TaskService {
  constructor() {
    this.listName = 'Tasks';
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      const { sharePointService } = await import('./graphService');
      this.sharePointService = sharePointService;
      
      // Test connection
      const lists = await this.sharePointService.getLists();
      const list = lists.find(l => l.displayName === this.listName);
      if (!list) {
        throw new Error(`Tasks list not found`);
      }
      this.list = list;
      
      this.isInitialized = true;
      console.log('TaskService: Initialized successfully');
    } catch (error) {
      console.error('TaskService: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Parse ResponsibleParty field from SharePoint format
   */
  parseResponsibleParty(responsibleParty) {
    if (!responsibleParty) return '';
    
    if (Array.isArray(responsibleParty)) {
      // Return the array as-is to preserve individual entries
      return responsibleParty;
    }
    
    if (typeof responsibleParty === 'object' && responsibleParty.LookupValue) {
      return [responsibleParty];
    }
    
    return responsibleParty.toString();
  }

  /**
   * Get all tasks from the main Tasks SharePoint list
   */
  async getAllTasks() {
    await this.initialize();
    
    try {
      const items = await this.sharePointService.getListItems(this.list.id);
      
      // Debug: Log the first item to see what fields are available
      if (items.length > 0) {
        console.log('TaskService: Sample SharePoint item fields:', Object.keys(items[0]));
        console.log('TaskService: Sample SharePoint item data:', items[0]);
        console.log('TaskService: Sample item.fields:', items[0].fields);
        console.log('TaskService: Fields Title:', items[0].fields?.Title);
        console.log('TaskService: Fields Project:', items[0].fields?.Project);
      }
      
      // Convert SharePoint items to app format
      const tasks = items.map(item => {
        // Read Instance column from SharePoint
        const instance = parseInt(item.Instance || '0');
        const isParent = instance === 0;
        
        return {
          id: item.id,
          originalId: item.id,
          instance: instance,
          isParent: isParent,
        
          // Core task fields - use correct SharePoint field names from fields object
          Task: item.fields?.Title || 'Unknown Task',
          Description: item.fields?.Title || 'Unknown Task', 
          Project: item.fields?.Project || 'Unknown Project',
          Deadline: item.fields?.Deadline || '',
          ResponsibleParty: this.parseResponsibleParty(item.fields?.ResponsibleParty),
          Notes: item.fields?.Notes || '',
        
          // Recurring fields
          Recurring: item.fields?.Recurring === 'Yes' || item.fields?.Recurring === true,
          Interval: item.fields?.Interval || '',
          FinalDate: item.fields?.FinalDate || '',
          
          // Status fields
          Completed_x003f_: item.fields?.Completed_x003f_ === 'Yes',
          Completed: item.fields?.Completed_x003f_ === 'Yes',
          completed: item.fields?.Completed_x003f_ === 'Yes',
          
          Priority: item.fields?.Priority || 'Normal',
          priority: item.fields?.Priority || 'Normal',
          important: item.fields?.Priority === 'Urgent',
          
          status: item.fields?.Completed_x003f_ === 'Yes' ? 'completed' : 'todo',
          
          // Metadata
          lastModified: item.lastModifiedDateTime || new Date().toISOString(),
          created: item.createdDateTime || new Date().toISOString()
        };
      });
      
      console.log('TaskService: Retrieved', tasks.length, 'tasks from SharePoint');
      console.log('TaskService: Sample converted task:', tasks[0]);
      console.log('TaskService: Sample converted task Task field:', tasks[0]?.Task);
      console.log('TaskService: Sample converted task Project field:', tasks[0]?.Project);
      return tasks;
    } catch (error) {
      console.error('TaskService: Error getting tasks:', error);
      throw error;
    }
  }

  /**
   * Update a single task field
   */
  async updateTaskField(taskId, field, value) {
    await this.initialize();
    
    try {
      // Check if this is a generated instance (contains underscore or colon)
      if (taskId.includes('_') || taskId.includes(':')) {
        console.log('TaskService: Attempting to update generated instance:', taskId);
        
        // For generated instances, update the parent task instead
        // Extract parent ID and instance number
        const [parentId, instanceNumber] = taskId.split(':');
        console.log('TaskService: Parent ID:', parentId, 'Instance:', instanceNumber);
        
        // Update the parent task instead of trying to create/update the instance
        console.log('TaskService: Updating parent task', parentId, 'instead of instance', taskId);
        console.log('TaskService: Recursive call to updateTaskField with parentId:', parentId);
        return await this.updateTaskField(parentId, field, value);
      }
      
      // Find the task in SharePoint
      const numericTaskId = parseInt(taskId);
      if (isNaN(numericTaskId)) {
        throw new Error(`Invalid task ID: ${taskId}`);
      }
      
      console.log('TaskService: Looking for task with ID:', numericTaskId, 'in list:', this.list.id);
      
      // WORKAROUND: SharePoint Graph API doesn't support filtering by ID
      // Fetch all items and filter in memory
      console.log('TaskService: Fetching all items (SharePoint Graph API limitation)...');
      const allItems = await this.sharePointService.getListItems(this.list.id);
      console.log('TaskService: Total items in list:', allItems.length);
      
      // Find the task by ID
      const item = allItems.find(item => item.id === taskId);
      console.log('TaskService: Found task:', item ? item.id : 'NOT FOUND');
      
      if (!item) {
        console.log('TaskService: Available IDs:', allItems.map(item => item.id));
        throw new Error(`Task ${taskId} not found in SharePoint`);
      }
      
      // Convert field name and value
      let sharePointField, sharePointValue;
      switch (field) {
        case 'Completed_x003f_':
          sharePointField = 'Completed_x003f_';
          sharePointValue = value ? 'Yes' : 'No';
          break;
        case 'Priority':
          sharePointField = 'Priority';
          sharePointValue = value ? 'Urgent' : 'Normal';
          break;
        case 'Task':
          sharePointField = 'Title';
          sharePointValue = value;
          break;
        case 'Description':
          sharePointField = 'Description';
          sharePointValue = value;
          break;
        case 'Project':
          sharePointField = 'Project';
          sharePointValue = value;
          break;
        case 'Deadline':
          sharePointField = 'Deadline';
          sharePointValue = value;
          break;
        case 'ResponsibleParty':
          sharePointField = 'ResponsibleParty';
          sharePointValue = value;
          break;
        case 'Notes':
          sharePointField = 'Notes';
          sharePointValue = value;
          break;
        case 'Recurring':
          sharePointField = 'Recurring';
          sharePointValue = value ? 'Yes' : 'No';
          break;
        case 'Interval':
          sharePointField = 'Interval';
          sharePointValue = value;
          break;
        case 'FinalDate':
          sharePointField = 'FinalDate';
          sharePointValue = value;
          break;
        default:
          throw new Error(`Unsupported field: ${field}`);
      }
      
      // Update in SharePoint
      await this.sharePointService.updateListItem(this.list.id, item.id, {
        fields: {
          [sharePointField]: sharePointValue
        }
      });
      
      console.log('TaskService: Updated task', taskId, 'field', field, 'to', value);
      
      return true;
    } catch (error) {
      console.error('TaskService: Error updating task:', error);
      throw error;
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId) {
    await this.initialize();
    
    try {
      // Check if this is a generated instance (contains underscore or colon)
      if (taskId.includes('_') || taskId.includes(':')) {
        console.log('TaskService: Attempting to delete generated instance:', taskId);
        console.log('TaskService: Generated instances cannot be deleted from SharePoint yet');
        console.log('TaskService: This would need to be created in SharePoint first');
        
        // For now, just log that we can't delete generated instances
        // TODO: Implement instance creation in SharePoint
        throw new Error(`Generated instance ${taskId} cannot be deleted from SharePoint. Instance creation is disabled.`);
      }
      
      // Find the task in SharePoint (workaround for SharePoint Graph API limitation)
      console.log('TaskService: Fetching all items for delete (SharePoint Graph API limitation)...');
      const allItems = await this.sharePointService.getListItems(this.list.id);
      console.log('TaskService: Total items in list:', allItems.length);
      
      // Find the task by ID
      const item = allItems.find(item => item.id === taskId);
      console.log('TaskService: Found task for deletion:', item ? item.id : 'NOT FOUND');
      
      if (!item) {
        console.log('TaskService: Available IDs:', allItems.map(item => item.id));
        throw new Error(`Task ${taskId} not found in SharePoint`);
      }
      
      // Delete from SharePoint
      await this.sharePointService.deleteListItem(this.list.id, item.id);
      
      console.log('TaskService: Deleted task', taskId);
      
      return true;
    } catch (error) {
      console.error('TaskService: Error deleting task:', error);
      throw error;
    }
  }

  /**
   * Create a new task
   */
  async createTask(taskData) {
    await this.initialize();
    
    try {
      // Only include fields that are required and properly formatted for SharePoint
      const newTask = {
        Title: taskData.Title || taskData.Task || taskData.Description || 'New Task',
        Project: taskData.Project || 'Unknown Project',
        Deadline: taskData.Deadline || '',
        Notes: taskData.Notes || '',
        Recurring: taskData.Recurring || 'No',
        Interval: taskData.Interval || '',
        FinalDate: taskData.FinalDate || '',
        Completed_x003f_: taskData.Completed_x003f_ || 'No',
        Priority: taskData.Priority || 'Normal',
        Instance: taskData.Instance || '0' // Use provided Instance or default to '0'
      };
      
      // Remove any undefined or null values to avoid SharePoint errors
      Object.keys(newTask).forEach(key => {
        if (newTask[key] === undefined || newTask[key] === null) {
          delete newTask[key];
        }
      });
      
      console.log('TaskService: Creating task with data:', newTask);
      
      const result = await this.sharePointService.addListItem(this.list.id, newTask);
      
      console.log('TaskService: Created new task with ID', result.id);
      
      return result;
    } catch (error) {
      console.error('TaskService: Error creating task:', error);
      throw error;
    }
  }

  /**
   * Generate recurring instances for a parent task (using parent task object directly)
   */
  async generateRecurringInstancesFromParent(parentTask) {
    await this.initialize();
    
    try {
      if (!parentTask.Recurring) {
        console.log('TaskService: Task is not recurring, skipping instance generation');
        return [];
      }
      
      const interval = parseInt(parentTask.Interval || '0');
      if (interval <= 0) {
        console.log('TaskService: Invalid interval, skipping instance generation');
        return [];
      }
      
      const startDate = new Date(parentTask.Deadline);
      if (isNaN(startDate.getTime())) {
        console.log('TaskService: Invalid deadline, skipping instance generation');
        return [];
      }
      
      const endDate = parentTask.FinalDate ? new Date(parentTask.FinalDate) : new Date(startDate.getFullYear() + 10, startDate.getMonth(), startDate.getDate());
      
      const instances = [];
      let currentDate = new Date(startDate);
      let instanceNumber = 1;
      
      // Generate instances
      while (currentDate <= endDate) {
        const instanceDate = currentDate.toISOString().split('T')[0];
        
        const instanceData = {
          Title: parentTask.Task, // Use 'Title' field for SharePoint
          Project: parentTask.Project,
          Deadline: instanceDate,
          Notes: parentTask.Notes,
          Recurring: 'No', // Instances are not recurring
          Interval: '',
          FinalDate: '',
          Completed_x003f_: 'No',
          Priority: 'Normal',
          Instance: instanceNumber.toString()
          // Note: ResponsibleParty removed for now to avoid format issues
        };
        
        const result = await this.sharePointService.addListItem(this.list.id, instanceData);
        instances.push({ ...instanceData, id: result.id });
        
        // Move to next interval
        currentDate.setMonth(currentDate.getMonth() + interval);
        instanceNumber++;
      }
      
      console.log('TaskService: Generated', instances.length, 'recurring instances for task', parentTask.Task);
      return instances;
    } catch (error) {
      console.error('TaskService: Error generating recurring instances:', error);
      throw error;
    }
  }

  /**
   * Generate recurring instances for a parent task (legacy method - kept for compatibility)
   */
  async generateRecurringInstances(parentTaskId) {
    await this.initialize();
    
    try {
      // Get the parent task (workaround for SharePoint Graph API limitation)
      const allItems = await this.sharePointService.getListItems(this.list.id);
      const parentTask = allItems.find(item => item.id === parentTaskId);
      if (!parentTask) {
        throw new Error(`Parent task ${parentTaskId} not found`);
      }
      
      if (parentTask.fields?.Recurring !== 'Yes') {
        console.log('TaskService: Task is not recurring, skipping instance generation');
        return [];
      }
      
      const interval = parseInt(parentTask.fields?.Interval || '0');
      if (interval <= 0) {
        console.log('TaskService: Invalid interval, skipping instance generation');
        return [];
      }
      
      const startDate = new Date(parentTask.fields?.Deadline);
      if (isNaN(startDate.getTime())) {
        console.log('TaskService: Invalid deadline, skipping instance generation');
        return [];
      }
      
      const endDate = parentTask.fields?.FinalDate ? new Date(parentTask.fields.FinalDate) : new Date(startDate.getFullYear() + 10, startDate.getMonth(), startDate.getDate());
      
      const instances = [];
      let currentDate = new Date(startDate);
      let instanceNumber = 1;
      
      // Generate instances
      while (currentDate <= endDate) {
        const instanceDate = currentDate.toISOString().split('T')[0];
        
        const instanceData = {
          Title: parentTask.fields?.Title, // Use 'Title' field for SharePoint
          Project: parentTask.fields?.Project,
          Deadline: instanceDate,
          Notes: parentTask.fields?.Notes,
          Recurring: 'No', // Instances are not recurring
          Interval: '',
          FinalDate: '',
          Completed_x003f_: 'No',
          Priority: 'Normal',
          Instance: instanceNumber.toString()
          // Note: ResponsibleParty removed for now to avoid format issues
        };
        
        const result = await this.sharePointService.addListItem(this.list.id, instanceData);
        instances.push({ ...instanceData, id: result.id });
        
        // Move to next interval
        currentDate.setMonth(currentDate.getMonth() + interval);
        instanceNumber++;
      }
      
      console.log('TaskService: Generated', instances.length, 'recurring instances for task', parentTaskId);
      return instances;
    } catch (error) {
      console.error('TaskService: Error generating recurring instances:', error);
      throw error;
    }
  }

  /**
   * Delete all instances of a recurring task
   */
  async deleteRecurringInstances(parentTaskId) {
    await this.initialize();
    
    try {
      // Get all instances (non-parent tasks with same base data) - workaround for SharePoint Graph API limitation
      const allItems = await this.sharePointService.getListItems(this.list.id);
      const parentTask = allItems.find(item => item.id === parentTaskId);
      if (!parentTask) {
        throw new Error(`Parent task ${parentTaskId} not found`);
      }
      
      const taskName = parentTask.fields?.Title; // Use Title field instead of Task
      const project = parentTask.fields?.Project;
      
      // Find all instances (same Title and Project but Instance > 0) - workaround for SharePoint Graph API limitation
      console.log('TaskService: Looking for instances with Title:', taskName, 'Project:', project);
      const instances = allItems.filter(item => 
        item.fields?.Title === taskName && 
        item.fields?.Project === project && 
        parseInt(item.fields?.Instance || '0') > 0
      );
      console.log('TaskService: Found', instances.length, 'instances to delete');
      
      // Delete all instances
      for (const instance of instances) {
        await this.sharePointService.deleteListItem(this.list.id, instance.id);
      }
      
      console.log('TaskService: Deleted', instances.length, 'recurring instances for task', parentTaskId);
      return instances.length;
    } catch (error) {
      console.error('TaskService: Error deleting recurring instances:', error);
      throw error;
    }
  }
}

// Create singleton instance
const taskService = new TaskService();
export default taskService;
