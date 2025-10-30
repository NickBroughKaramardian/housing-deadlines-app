import { microsoftDataService } from './microsoftDataService';

class SharedDataService {
  constructor() {
    this.tasks = [];
    this.lastFetch = null;
    this.cacheTimeout = 30000; // 30 seconds
  }

  // Get all tasks with caching - same logic as Database component
  async getAllTasks() {
    const now = Date.now();
    
    // Return cached data if it's still fresh
    if (this.lastFetch && (now - this.lastFetch) < this.cacheTimeout && this.tasks.length > 0) {
      console.log('SharedDataService: Using cached data,', this.tasks.length, 'tasks');
      return this.tasks;
    }

    try {
      console.log('SharedDataService: Fetching fresh data from SharePoint...');
      const tasksData = await microsoftDataService.tasks.getAll();
      
      // Filter out any null or undefined tasks
      const filteredTasks = tasksData.filter(task => task != null && task.id);

      this.tasks = filteredTasks;
      this.lastFetch = now;
      
      console.log('SharedDataService: Loaded', filteredTasks.length, 'tasks with full data');
      return filteredTasks;
    } catch (error) {
      console.error('SharedDataService: Error fetching tasks:', error);
      return this.tasks; // Return cached data if available
    }
  }

  // Clear cache to force refresh
  clearCache() {
    this.tasks = [];
    this.lastFetch = null;
    console.log('SharedDataService: Cache cleared');
  }

  // Update a task and refresh cache
  async updateTask(taskId, updates) {
    try {
      await microsoftDataService.tasks.update(taskId, updates);
      this.clearCache(); // Clear cache to force refresh
      console.log('SharedDataService: Task updated, cache cleared');
    } catch (error) {
      console.error('SharedDataService: Error updating task:', error);
      throw error;
    }
  }

  // Delete a task and refresh cache
  async deleteTask(taskId) {
    try {
      await microsoftDataService.tasks.delete(taskId);
      this.clearCache(); // Clear cache to force refresh
      console.log('SharedDataService: Task deleted, cache cleared');
    } catch (error) {
      console.error('SharedDataService: Error deleting task:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const sharedDataService = new SharedDataService();
