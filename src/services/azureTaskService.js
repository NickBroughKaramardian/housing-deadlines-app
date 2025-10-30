// Compatibility shim that routes legacy calls to the Functions API via tasksApi
import { getTasks, createTask as apiCreate, updateTask as apiUpdate, deleteTask as apiDelete } from './tasksApi';

class AzureTaskServiceShim {
  async initialize() {
    return true;
  }

  async loadAllTasks() {
    return await getTasks();
  }

  async createTask(task) {
    return await apiCreate(task);
  }

  async updateTask(id, updates) {
    return await apiUpdate(id, updates);
  }

  async completeTask(id, completed) {
    return await apiUpdate(id, { completed: !!completed });
  }

  async deleteTask(id) {
    return await apiDelete(id);
  }
}

export const azureTaskService = new AzureTaskServiceShim();



