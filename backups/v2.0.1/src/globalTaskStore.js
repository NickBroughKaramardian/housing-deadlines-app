// Global task store - single source of truth for all pages
class GlobalTaskStore {
  constructor() {
    this.tasks = [];
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
    this.listeners.forEach(listener => listener(this.tasks));
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

  // Update a single task (called by Database page)
  updateTask(taskId, updates) {
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updates };
      console.log('GlobalTaskStore: Updated task', taskId, 'with', updates);
      this.notify();
    }
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

  setLoading(loading) {
    this.isLoading = loading;
    this.notify();
  }
}

// Create singleton instance
export const globalTaskStore = new GlobalTaskStore();
