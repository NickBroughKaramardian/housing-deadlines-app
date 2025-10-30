// Global task store - single source of truth for all pages
class GlobalTaskStore {
  constructor() {
    this.tasks = [];
    this.instances = [];
    this.listeners = [];
    this.isLoading = false;
  }

  // Subscribe to changes
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners of changes
  notify() {
    this.listeners.forEach(listener => listener(this.tasks, this.instances));
  }

  // Set tasks (called by Database page)
  setTasks(tasks) {
    console.log('GlobalTaskStore: Setting', tasks.length, 'tasks');
    this.tasks = tasks;
    this.notify();
  }

  // Get current tasks (called by Calendar/Gantt/Sort pages)
  getTasks() {
    return this.tasks;
  }

  // Get current instances
  getInstances() {
    return this.instances;
  }

  // Get combined tasks and instances
  // Filter out ALL parent tasks - they should only appear in Database tab
  // All tasks (recurring and non-recurring) now have clones in the sub-database
  // Deadline views should ONLY show instances/clones
  getAllTasks() {
    // Return ONLY instances - no parent tasks
    // This ensures all work is done on the sub-database clones
    return [...this.instances];
  }

  // Set combined tasks and instances (for other pages to use)
  setAllTasks(allTasks) {
    console.log('GlobalTaskStore: Setting combined tasks:', allTasks.length, 'total items');
    // Split back into tasks and instances for internal storage
    this.tasks = allTasks.filter(task => !task.isInstance);
    this.instances = allTasks.filter(task => task.isInstance);
    this.notify();
  }

  // Update a single task (called by Database page)
  updateTask(taskId, updates) {
    // First try to update in tasks array
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updates };
      console.log('GlobalTaskStore: Updated task', taskId, 'with', updates);
      this.notify();
      return;
    }
    
    // If not found in tasks, try to update in instances array
    const instanceIndex = this.instances.findIndex(i => i.id === taskId);
    if (instanceIndex !== -1) {
      this.instances[instanceIndex] = { ...this.instances[instanceIndex], ...updates };
      console.log('GlobalTaskStore: Updated instance', taskId, 'with', updates);
      this.notify();
      return;
    }
    
    console.log('GlobalTaskStore: Task/instance not found for update:', taskId);
  }

  // Add a new task (called by Database page)
  addTask(task) {
    this.tasks.push(task);
    console.log('GlobalTaskStore: Added task', task.id);
    this.notify();
  }

  // Delete a task (called by Database page)
  deleteTask(taskId) {
    this.tasks = this.tasks.filter(t => t.id !== taskId);
    console.log('GlobalTaskStore: Deleted task', taskId);
    this.notify();
  }

  // Set instances (called by Database page)
  setInstances(instances) {
    console.log('GlobalTaskStore: Setting', instances.length, 'instances');
    this.instances = instances;
    this.notify();
  }

  // Update a single instance (called by Database page)
  updateInstance(instanceId, updates) {
    const instanceIndex = this.instances.findIndex(i => i.id === instanceId);
    if (instanceIndex !== -1) {
      this.instances[instanceIndex] = { ...this.instances[instanceIndex], ...updates };
      console.log('GlobalTaskStore: Updated instance', instanceId, 'with', updates);
      this.notify();
    }
  }

  // Add a new instance (called by Database page)
  addInstance(instance) {
    this.instances.push(instance);
    console.log('GlobalTaskStore: Added instance', instance.id);
    this.notify();
  }

  // Delete an instance (called by Database page)
  deleteInstance(instanceId) {
    this.instances = this.instances.filter(i => i.id !== instanceId);
    console.log('GlobalTaskStore: Deleted instance', instanceId);
    this.notify();
  }

  setLoading(loading) {
    this.isLoading = loading;
    this.notify();
  }
}

// Create singleton instance
export const globalTaskStore = new GlobalTaskStore();
