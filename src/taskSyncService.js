/**
 * Task Sync Service - New Clean Architecture
 * Handles bidirectional sync between app and SharePoint Tasks list
 * Manages recurring task generation and instance management
 */

class TaskSyncService {
  constructor() {
    this.isInitialized = false;
    this.sharePointService = null;
    this.listId = null;
    this.syncInProgress = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      const { sharePointService } = await import('./graphService');
      this.sharePointService = sharePointService;
      
      // Import globalTaskStore dynamically
      const { globalTaskStore } = await import('./globalTaskStore');
      this.globalTaskStore = globalTaskStore;
      
      // Get the Tasks list
      const lists = await this.sharePointService.getLists();
      const tasksList = lists.find(l => l.displayName === 'Tasks');
      if (!tasksList) {
        throw new Error('Tasks list not found in SharePoint');
      }
      this.listId = tasksList.id;
      
      this.isInitialized = true;
      console.log('TaskSyncService: Initialized successfully');
    } catch (error) {
      console.error('TaskSyncService: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load all tasks from SharePoint and expand recurring instances
   */
  async loadAllTasks() {
    await this.initialize();
    
    try {
      // Get all items from SharePoint
      const sharePointItems = await this.sharePointService.getListItems(this.listId);
      console.log('TaskSyncService: Loaded', sharePointItems.length, 'items from SharePoint');
      
      // Convert SharePoint items to app format
      const allTasks = [];
      
      for (const item of sharePointItems) {
        const task = this.convertSharePointItemToTask(item);
        
        // If this is a recurring parent task (Instance = 0), generate instances
        if (task.instance === 0 && task.recurring && task.interval > 0) {
          // Add the parent task
          allTasks.push(task);
          // Generate and add instances with duplicate validation
          const instances = this.generateRecurringInstances(task, allTasks);
          allTasks.push(...instances);
        } else {
          // Add non-recurring tasks or existing instances
          allTasks.push(task);
        }
      }
      
      console.log('TaskSyncService: Generated', allTasks.length, 'total tasks (including instances)');
      return allTasks;
    } catch (error) {
      console.error('TaskSyncService: Error loading tasks:', error);
      throw error;
    }
  }

  /**
   * Format deadline for display - ensure consistent date format
   */
  formatDeadlineForDisplay(deadline, isParent) {
    if (!deadline) return '';

    try {
      // Always normalize to YYYY-MM-DD format for consistency
      const normalized = this.normalizeDeadline(deadline);
      return normalized;
    } catch (error) {
      console.warn('TaskSyncService: Error formatting deadline for display:', deadline, error);
      return deadline;
    }
  }

  /**
   * Normalize deadline format for comparison
   */
  normalizeDeadline(deadline) {
    if (!deadline) return '';
    
    try {
      // Handle different date formats
      let date;
      
      if (typeof deadline === 'string') {
        // If it's already a simple date (YYYY-MM-DD), use it directly
        if (/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
          date = new Date(deadline);
        } else {
          // If it's a full ISO string, extract just the date part
          const datePart = deadline.split('T')[0];
          date = new Date(datePart);
        }
      } else {
        date = new Date(deadline);
      }
      
      if (isNaN(date.getTime())) {
        console.warn('TaskSyncService: Invalid date format:', deadline);
        return deadline;
      }
      
      // Return in YYYY-MM-DD format for consistent comparison
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.warn('TaskSyncService: Error normalizing deadline:', deadline, error);
      return deadline;
    }
  }

  /**
   * Check if a task with the same deadline already exists
   */
  hasDuplicateDeadline(task, existingTasks) {
    if (!task.deadline) return false;
    
    const normalizedDeadline = this.normalizeDeadline(task.deadline);
    
    // Check if any existing task has the same deadline
    const hasDuplicate = existingTasks.some(existingTask => {
      if (existingTask.id === task.id) return false; // Don't compare with self
      
      const existingNormalizedDeadline = this.normalizeDeadline(existingTask.deadline);
      const isDuplicate = existingNormalizedDeadline === normalizedDeadline;
      
      if (isDuplicate) {
        console.log('TaskSyncService: Found duplicate deadline:', {
          newTask: task.task,
          newDeadline: task.deadline,
          normalizedNew: normalizedDeadline,
          existingTask: existingTask.task,
          existingDeadline: existingTask.deadline,
          normalizedExisting: existingNormalizedDeadline
        });
      }
      
      return isDuplicate;
    });
    
    return hasDuplicate;
  }

  /**
   * Convert SharePoint item to app task format
   */
  convertSharePointItemToTask(item) {
    const fields = item.fields || {};
    
    // Handle responsibleParty field - convert object to string if needed
    let responsibleParty = '';
    if (fields.ResponsibleParty) {
      console.log('TaskSyncService: Converting ResponsibleParty:', {
        original: fields.ResponsibleParty,
        type: typeof fields.ResponsibleParty,
        isArray: Array.isArray(fields.ResponsibleParty)
      });
      
      if (typeof fields.ResponsibleParty === 'string') {
        responsibleParty = fields.ResponsibleParty;
      } else if (Array.isArray(fields.ResponsibleParty)) {
        // Handle array of responsible parties
        responsibleParty = fields.ResponsibleParty.map(rp => {
          if (typeof rp === 'object' && rp.LookupValue) {
            return rp.LookupValue;
          }
          return String(rp);
        }).join(', ');
      } else if (typeof fields.ResponsibleParty === 'object' && fields.ResponsibleParty.LookupValue) {
        // Handle single object
        responsibleParty = fields.ResponsibleParty.LookupValue;
      } else {
        responsibleParty = String(fields.ResponsibleParty);
      }
      
      console.log('TaskSyncService: Converted ResponsibleParty to:', responsibleParty);
    }
    
    return {
      id: item.id,
      sharePointId: item.id, // Store SharePoint ID for updates
      instance: parseInt(fields.Instance || '0'),
      isParent: parseInt(fields.Instance || '0') === 0,
      
      // Core fields
      task: fields.Title || '',
      project: fields.Project || '',
      deadline: this.formatDeadlineForDisplay(fields.Deadline || '', parseInt(fields.Instance || '0') === 0),
      responsibleParty: responsibleParty,
      notes: fields.Notes || '',
      
      // Recurring fields
      recurring: fields.Recurring === 'Yes',
      interval: parseInt(fields.Interval || '0'),
      finalDate: fields.FinalDate || '',
      
      // Status fields - try multiple field names
      completed: fields.Completed_x003f_ === 'Yes' || fields.Completed === 'Yes' || fields.Completed === true,
      priority: fields.Priority || 'Normal',
      
      // Metadata
      created: item.createdDateTime || new Date().toISOString(),
      lastModified: item.lastModifiedDateTime || new Date().toISOString()
    };
  }

  /**
   * Generate recurring instances for a parent task
   */
  generateRecurringInstances(parentTask, existingTasks = []) {
    if (!parentTask.recurring || parentTask.interval <= 0) return [];

    const instances = [];
    const startDate = new Date(parentTask.deadline);
    
    // Calculate end date - use finalDate if provided, otherwise 10 years from start
    let endDate;
    if (parentTask.finalDate) {
      endDate = new Date(parentTask.finalDate);
    } else {
      endDate = new Date(startDate.getFullYear() + 10, startDate.getMonth(), startDate.getDate());
    }
    
    console.log('TaskSyncService: Generating instances for', parentTask.task, '- Start:', startDate.toISOString().split('T')[0], 'Interval:', parentTask.interval, 'End:', endDate.toISOString().split('T')[0]);
    
    // Start from the first interval (not the parent date)
    let currentDate = new Date(startDate);
    currentDate.setMonth(currentDate.getMonth() + parentTask.interval);
    let instanceNumber = 1;
    
    // If the first instance would be after the end date, don't generate any instances
    if (currentDate > endDate) {
      console.log('TaskSyncService: Skipping instance generation - first instance date', currentDate.toISOString().split('T')[0], 'is after end date', endDate.toISOString().split('T')[0]);
      return [];
    }
    
    // Generate instances only within the valid date range
    while (currentDate <= endDate && instanceNumber <= 100) {
      // Skip if the instance date is before the start date
      if (currentDate < startDate) {
        currentDate.setMonth(currentDate.getMonth() + parentTask.interval);
        instanceNumber++;
        continue;
      }
      
      // Skip if the instance date is after the end date
      if (currentDate > endDate) {
        break;
      }
      
      const instanceDate = currentDate.toISOString().split('T')[0];
      
      // Create unique ID for instance - use parent SharePoint ID if available, otherwise use parent ID
      const parentBaseId = parentTask.sharePointId || parentTask.id;
      const instance = {
        ...parentTask,
        id: `${parentBaseId}_${instanceNumber}`, // Use SharePoint ID as base for unique IDs
        instance: instanceNumber,
        isParent: false,
        deadline: instanceDate,
        completed: false, // Instances start as incomplete
        priority: 'Normal', // Instances start as normal priority
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
      
      // VALIDATION: Check if this deadline already exists
      if (this.hasDuplicateDeadline(instance, existingTasks)) {
        console.log('TaskSyncService: Skipping duplicate deadline for task', parentTask.task, 'on', instanceDate);
        currentDate.setMonth(currentDate.getMonth() + parentTask.interval);
        instanceNumber++;
        continue;
      }
      
      instances.push(instance);
      
      // Move to next interval
      currentDate.setMonth(currentDate.getMonth() + parentTask.interval);
      instanceNumber++;
    }
    
    console.log('TaskSyncService: Generated', instances.length, 'instances for task', parentTask.task, 'from', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
    return instances;
  }

  /**
   * Check if sync is needed by comparing app tasks with SharePoint
   */
  async checkIfSyncNeeded(tasks) {
    await this.initialize();
    
    try {
      // Get current SharePoint items
      const sharePointItems = await this.sharePointService.getListItems(this.listId);
      const existingIds = new Set(sharePointItems.map(item => item.id));
      
      // Create a more robust set of existing task identifiers to avoid duplicates
      const existingTaskIdentifiers = new Set();
      sharePointItems.forEach(item => {
        const taskName = item.fields?.Title || '';
        const deadline = item.fields?.Deadline || '';
        const instance = item.fields?.Instance || '0';
        
        if (taskName && deadline) {
          // Normalize deadline format for comparison
          const normalizedDeadline = this.normalizeDeadline(deadline);
          const identifier = `${taskName}_${normalizedDeadline}_${instance}`;
          existingTaskIdentifiers.add(identifier);
          
          // Also add without instance for broader matching
          existingTaskIdentifiers.add(`${taskName}_${normalizedDeadline}`);
        }
      });
      
      // Find tasks that need to be created in SharePoint
      const tasksToCreate = tasks.filter(task => {
        if (task.instance <= 0) return false; // Only check instances (instance > 0), not parents (instance = 0)
        
        // Check by ID first
        if (existingIds.has(task.id)) return false;
        
        // Check by task name and deadline - be more strict about duplicates
        const normalizedDeadline = this.normalizeDeadline(task.deadline);
        
        // Check if a task with the same name and deadline already exists
        const existingTask = sharePointItems.find(item => {
          const itemTaskName = item.fields?.Title || '';
          const itemDeadline = item.fields?.Deadline || '';
          const itemInstance = item.fields?.Instance || '0';
          
          if (itemTaskName && itemDeadline) {
            const itemNormalizedDeadline = this.normalizeDeadline(itemDeadline);
            return (itemTaskName === task.task && itemNormalizedDeadline === normalizedDeadline) ||
                   (itemTaskName === task.task && itemNormalizedDeadline === normalizedDeadline && itemInstance === task.instance.toString());
          }
          return false;
        });
        
        if (existingTask) {
          console.log('TaskSyncService: Found existing task in SharePoint, should update instead of create:', {
            taskName: task.task,
            deadline: task.deadline,
            instance: task.instance,
            existingId: existingTask.id
          });
          return false;
        }
        
        return true;
      });
      
      console.log('TaskSyncService: Found', tasksToCreate.length, 'tasks that need to be synced to SharePoint');
      console.log('TaskSyncService: Total app tasks:', tasks.length, 'SharePoint items:', sharePointItems.length);
      console.log('TaskSyncService: Existing identifiers:', Array.from(existingTaskIdentifiers).slice(0, 5));
      return tasksToCreate.length > 0;
    } catch (error) {
      console.error('TaskSyncService: Error checking sync status:', error);
      return true; // If we can't check, assume sync is needed
    }
  }

  /**
   * Sync app changes back to SharePoint
   */
  async syncToSharePoint(tasks) {
    if (this.syncInProgress) {
      console.log('TaskSyncService: Sync already in progress, skipping');
      return;
    }
    
    this.syncInProgress = true;
    
    try {
      await this.initialize();
      
      // Get current SharePoint items
      const sharePointItems = await this.sharePointService.getListItems(this.listId);
      const existingIds = new Set(sharePointItems.map(item => item.id));
      
      // Create a more robust set of existing task identifiers to avoid duplicates
      const existingTaskIdentifiers = new Set();
      sharePointItems.forEach(item => {
        const taskName = item.fields?.Title || '';
        const deadline = item.fields?.Deadline || '';
        const instance = item.fields?.Instance || '0';
        
        if (taskName && deadline) {
          // Normalize deadline format for comparison
          const normalizedDeadline = this.normalizeDeadline(deadline);
          const identifier = `${taskName}_${normalizedDeadline}_${instance}`;
          existingTaskIdentifiers.add(identifier);
          
          // Also add without instance for broader matching
          existingTaskIdentifiers.add(`${taskName}_${normalizedDeadline}`);
        }
      });
      
      // Find tasks that need to be created in SharePoint
      const tasksToCreate = tasks.filter(task => {
        if (task.instance <= 0) return false; // Only sync instances (instance > 0), not parents (instance = 0)
        
        // Check by ID first
        if (existingIds.has(task.id)) return false;
        
        // Check by task name and deadline - be more strict about duplicates
        const normalizedDeadline = this.normalizeDeadline(task.deadline);
        const identifier = `${task.task}_${normalizedDeadline}_${task.instance}`;
        const broadIdentifier = `${task.task}_${normalizedDeadline}`;
        
        // Check if a task with the same name and deadline already exists
        const existingTask = sharePointItems.find(item => {
          const itemTaskName = item.fields?.Title || '';
          const itemDeadline = item.fields?.Deadline || '';
          const itemInstance = item.fields?.Instance || '0';
          
          if (itemTaskName && itemDeadline) {
            const itemNormalizedDeadline = this.normalizeDeadline(itemDeadline);
            return (itemTaskName === task.task && itemNormalizedDeadline === normalizedDeadline) ||
                   (itemTaskName === task.task && itemNormalizedDeadline === normalizedDeadline && itemInstance === task.instance.toString());
          }
          return false;
        });
        
        if (existingTask) {
          console.log('TaskSyncService: Found existing task in SharePoint, should update instead of create:', {
            taskName: task.task,
            deadline: task.deadline,
            instance: task.instance,
            existingId: existingTask.id
          });
          return false;
        }
        
        return true;
      });
      
      console.log('TaskSyncService: Creating', tasksToCreate.length, 'new instances in SharePoint');
      
      if (tasksToCreate.length === 0) {
        console.log('TaskSyncService: No tasks need to be synced');
        return;
      }
      
      // Create ALL instances in SharePoint (no limit - we need to sync everything)
      let successCount = 0;
      let errorCount = 0;
      const createdTasks = [];
      
      for (const task of tasksToCreate) {
        try {
          // Double-check that this task doesn't already exist before creating
          const normalizedDeadline = this.normalizeDeadline(task.deadline);
          const identifier = `${task.task}_${normalizedDeadline}_${task.instance}`;
          const broadIdentifier = `${task.task}_${normalizedDeadline}`;
          
          if (existingTaskIdentifiers.has(identifier) || existingTaskIdentifiers.has(broadIdentifier)) {
            console.log('TaskSyncService: Skipping duplicate task:', identifier);
            continue;
          }
          
          // VALIDATION: Check for duplicate deadlines within the tasks being created
          const duplicateInBatch = tasksToCreate.some(otherTask => 
            otherTask.id !== task.id && 
            this.normalizeDeadline(otherTask.deadline) === normalizedDeadline
          );
          
          if (duplicateInBatch) {
            console.log('TaskSyncService: Skipping duplicate deadline in batch:', task.task, 'on', normalizedDeadline);
            continue;
          }
          
          const sharePointData = this.convertTaskToSharePointFormat(task);
          const createdItem = await this.sharePointService.addListItem(this.listId, sharePointData);
          console.log('TaskSyncService: Created instance', task.instance, 'for task', task.task, 'with SharePoint ID:', createdItem.id);
          
          // Store the mapping between app ID and SharePoint ID
          createdTasks.push({
            appId: task.id,
            sharePointId: createdItem.id,
            task: task
          });
          
          // Add the new task to our tracking set to prevent duplicates in the same sync
          existingTaskIdentifiers.add(identifier);
          existingTaskIdentifiers.add(broadIdentifier);
          
          successCount++;
          
          // Add a small delay to prevent overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error('TaskSyncService: Error creating instance', task.id, ':', error);
          errorCount++;
          
          // If we get a duplicate error, log it but don't count it as a failure
          if (error.message && error.message.includes('duplicate')) {
            console.log('TaskSyncService: Duplicate detected during creation, skipping');
            continue;
          }
        }
      }
      
      console.log(`TaskSyncService: Sync completed - ${successCount} successful, ${errorCount} failed`);
      
      // Update the global store with the new SharePoint IDs
      if (createdTasks.length > 0) {
        console.log('TaskSyncService: Updating global store with SharePoint IDs');
        for (const createdTask of createdTasks) {
          this.globalTaskStore.updateTask(createdTask.appId, { 
            sharePointId: createdTask.sharePointId
            // Keep the original app ID, just add the SharePoint ID
          });
        }
      }
      
      console.log('TaskSyncService: Sync to SharePoint completed');
    } catch (error) {
      console.error('TaskSyncService: Error syncing to SharePoint:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Convert app task to SharePoint format
   */
  convertTaskToSharePointFormat(task) {
    // Only include fields that are required and properly formatted for SharePoint
    const sharePointData = {
      Title: task.task || 'New Task',
      Project: task.project || 'Unknown Project',
      Deadline: task.deadline || '',
      Notes: task.notes || '',
      Recurring: 'No', // Instances are not recurring
      Completed_x003f_: task.completed ? 'Yes' : 'No',
      Priority: task.priority || 'Normal',
      Instance: task.instance.toString()
    };

    // Include ResponsibleParty if it exists and is not empty
    if (task.responsibleParty && task.responsibleParty.trim() !== '') {
      sharePointData.ResponsibleParty = task.responsibleParty;
      console.log('TaskSyncService: Including ResponsibleParty in SharePoint data:', task.responsibleParty);
    } else {
      console.log('TaskSyncService: No ResponsibleParty to include:', {
        responsibleParty: task.responsibleParty,
        isEmpty: !task.responsibleParty || task.responsibleParty.trim() === ''
      });
    }

    // Only add Interval and FinalDate if they have actual values
    if (task.interval && task.interval !== '') {
      sharePointData.Interval = task.interval;
    }
    if (task.finalDate && task.finalDate !== '') {
      sharePointData.FinalDate = task.finalDate;
    }

    // Remove any undefined, null, or empty string values to avoid SharePoint errors
    Object.keys(sharePointData).forEach(key => {
      if (sharePointData[key] === undefined || sharePointData[key] === null || sharePointData[key] === '') {
        delete sharePointData[key];
      }
    });

    console.log('TaskSyncService: Converting task to SharePoint format:', sharePointData);
    return sharePointData;
  }

  /**
   * Update a task in SharePoint
   */
  async updateTaskInSharePoint(taskId, updates) {
    await this.initialize();
    
    // Get the current task from global store to find the SharePoint ID
    const allTasks = this.globalTaskStore.getAllTasks();
    const task = allTasks.find(t => t.id === taskId);
    
    if (!task) {
      console.error('TaskSyncService: Task not found in global store:', taskId);
      throw new Error('Task not found');
    }
    
    // Declare variables outside try block for error logging
    let sharePointId = task.sharePointId;
    let sharePointUpdates = {};
    
    try {
      // Use the SharePoint ID if available, otherwise try to find existing item
      sharePointId = task.sharePointId;
      
      if (!sharePointId) {
        console.log('TaskSyncService: Task has no SharePoint ID, searching for existing item in SharePoint:', taskId);
        
        // Search for existing SharePoint item by task name and deadline
        const sharePointItems = await this.sharePointService.getListItems(this.listId);
        const normalizedDeadline = this.normalizeDeadline(task.deadline);
        
        const existingItem = sharePointItems.find(item => {
          const itemTaskName = item.fields?.Title || '';
          const itemDeadline = item.fields?.Deadline || '';
          const itemInstance = item.fields?.Instance || '0';
          
          if (itemTaskName && itemDeadline) {
            const itemNormalizedDeadline = this.normalizeDeadline(itemDeadline);
            return (itemTaskName === task.task && itemNormalizedDeadline === normalizedDeadline) ||
                   (itemTaskName === task.task && itemNormalizedDeadline === normalizedDeadline && itemInstance === task.instance.toString());
          }
          return false;
        });
        
        if (existingItem) {
          sharePointId = existingItem.id;
          console.log('TaskSyncService: Found existing SharePoint item with ID:', sharePointId);
          
          // Update the task with the found SharePoint ID
          this.globalTaskStore.updateTask(taskId, { sharePointId: sharePointId });
        } else {
          // Create the item in SharePoint if it doesn't exist (for both parents and instances)
          console.log('TaskSyncService: Item does not exist in SharePoint, creating it:', taskId, 'instance:', task.instance);
          try {
            const sharePointData = this.convertTaskToSharePointFormat(task);
            const createdItem = await this.sharePointService.addListItem(this.listId, sharePointData);
            sharePointId = createdItem.id;
            
            // Update the task with the new SharePoint ID
            this.globalTaskStore.updateTask(taskId, { sharePointId: createdItem.id });
            console.log('TaskSyncService: Created item in SharePoint with ID:', createdItem.id);
          } catch (createError) {
            console.error('TaskSyncService: Failed to create item in SharePoint:', createError);
            throw createError;
          }
        }
      }
      
      sharePointUpdates = {};
      
      // Map app fields to SharePoint field names
      if (updates.completed !== undefined) {
        sharePointUpdates.Completed_x003f_ = updates.completed ? 'Yes' : 'No';
      }
      if (updates.priority !== undefined) {
        sharePointUpdates.Priority = updates.priority;
      }
      if (updates.task !== undefined) {
        sharePointUpdates.Title = updates.task;
      }
      if (updates.project !== undefined) {
        sharePointUpdates.Project = updates.project;
      }
      if (updates.deadline !== undefined) {
        sharePointUpdates.Deadline = updates.deadline;
      }
      if (updates.notes !== undefined) {
        sharePointUpdates.Notes = updates.notes;
      }
      if (updates.responsibleParty !== undefined) {
        // Only include ResponsibleParty if it's in the correct format for SharePoint
        // Skip if it's just a string (which causes the navigation property error)
        if (typeof updates.responsibleParty === 'object' && updates.responsibleParty !== null) {
          sharePointUpdates.ResponsibleParty = updates.responsibleParty;
        } else {
          console.log('TaskSyncService: Skipping ResponsibleParty update - not in correct format for SharePoint');
        }
      }
      
      // Only include fields that have values to avoid SharePoint errors
      const filteredUpdates = {};
      Object.keys(sharePointUpdates).forEach(key => {
        if (sharePointUpdates[key] !== undefined && sharePointUpdates[key] !== null && sharePointUpdates[key] !== '') {
          filteredUpdates[key] = sharePointUpdates[key];
        }
      });
      
      if (Object.keys(filteredUpdates).length === 0) {
        console.log('TaskSyncService: No valid updates to send to SharePoint');
        return;
      }
      
      console.log('TaskSyncService: Updating task', sharePointId, 'with fields:', filteredUpdates);
      
      // Use the REST API for updates to avoid Graph API issues
      await this.sharePointService.updateListItemREST(this.listId, sharePointId, filteredUpdates);
      
      console.log('TaskSyncService: Updated task', sharePointId, 'in SharePoint');
      
      // Update the SharePoint ID in the global store to ensure consistency
      if (task.sharePointId !== sharePointId) {
        this.globalTaskStore.updateTask(taskId, { sharePointId: sharePointId });
        console.log('TaskSyncService: Updated SharePoint ID in store:', sharePointId);
      }
    } catch (error) {
      console.error('TaskSyncService: Error updating task in SharePoint:', error);
      console.error('TaskSyncService: Error details:', {
        taskId,
        taskName: task.task,
        deadline: task.deadline,
        instance: task.instance,
        sharePointId,
        updates: Object.keys(sharePointUpdates)
      });
      
      // DO NOT create a new item on error - this causes duplicates
      // Instead, re-throw the error so the caller can handle it
      throw error;
    }
  }

  /**
   * Clean up duplicate tasks in SharePoint
   */
  async cleanupSharePointDuplicates() {
    await this.initialize();
    
    try {
      console.log('TaskSyncService: Starting SharePoint duplicate cleanup...');
      
      // Get all SharePoint items
      const sharePointItems = await this.sharePointService.getListItems(this.listId);
      console.log('TaskSyncService: Found', sharePointItems.length, 'items in SharePoint');
      
      // Group items by task name and deadline
      const groupedItems = {};
      sharePointItems.forEach(item => {
        const taskName = item.fields?.Title || '';
        const deadline = item.fields?.Deadline || '';
        const instance = item.fields?.Instance || '0';
        
        if (taskName && deadline) {
          const normalizedDeadline = this.normalizeDeadline(deadline);
          const key = `${taskName}_${normalizedDeadline}`;
          
          if (!groupedItems[key]) {
            groupedItems[key] = [];
          }
          groupedItems[key].push({
            id: item.id,
            taskName,
            deadline: normalizedDeadline,
            instance: parseInt(instance) || 0,
            completed: item.fields?.Completed_x003f_ === 'Yes',
            priority: item.fields?.Priority || 'Normal',
            responsibleParty: item.fields?.ResponsibleParty || '',
            lastModified: item.lastModifiedDateTime || item.createdDateTime
          });
        }
      });
      
      let duplicatesRemoved = 0;
      
      // Process each group to find and remove duplicates
      for (const [key, items] of Object.entries(groupedItems)) {
        if (items.length > 1) {
          console.log(`TaskSyncService: Found ${items.length} duplicates for ${key}`);
          
          // Sort by priority: completed > has responsible party > most recent
          items.sort((a, b) => {
            // Priority 1: Keep completed tasks
            if (a.completed && !b.completed) return -1;
            if (!a.completed && b.completed) return 1;
            
            // Priority 2: Keep tasks with responsible party
            if (a.responsibleParty && !b.responsibleParty) return -1;
            if (!a.responsibleParty && b.responsibleParty) return 1;
            
            // Priority 3: Keep most recent
            return new Date(b.lastModified) - new Date(a.lastModified);
          });
          
          // Keep the first (best) item, remove the rest
          const keepItem = items[0];
          const removeItems = items.slice(1);
          
          console.log(`TaskSyncService: Keeping item ${keepItem.id}, removing ${removeItems.length} duplicates`);
          
          for (const item of removeItems) {
            try {
              await this.sharePointService.deleteListItem(this.listId, item.id);
              duplicatesRemoved++;
              console.log(`TaskSyncService: Removed duplicate item ${item.id}`);
            } catch (error) {
              console.error(`TaskSyncService: Error removing duplicate item ${item.id}:`, error);
            }
          }
        }
      }
      
      console.log(`TaskSyncService: Cleanup complete. Removed ${duplicatesRemoved} duplicate items from SharePoint`);
      return duplicatesRemoved;
    } catch (error) {
      console.error('TaskSyncService: Error cleaning up SharePoint duplicates:', error);
      throw error;
    }
  }

  /**
   * Delete a task from SharePoint
   */
  async deleteTaskFromSharePoint(taskId) {
    await this.initialize();
    
    try {
      await this.sharePointService.deleteListItem(this.listId, taskId);
      console.log('TaskSyncService: Deleted task', taskId, 'from SharePoint');
    } catch (error) {
      console.error('TaskSyncService: Error deleting task from SharePoint:', error);
      throw error;
    }
  }
}

// Create singleton instance
const taskSyncService = new TaskSyncService();
export default taskSyncService;
