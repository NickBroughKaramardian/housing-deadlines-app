/**
 * Import History Service
 * 
 * Manages import history persistence in localStorage.
 * Tracks all batch import operations with metadata.
 */

const IMPORT_HISTORY_KEY = 'task_import_history';
const MAX_HISTORY_ITEMS = 100; // Keep last 100 imports

class ImportHistoryService {
  /**
   * Get all import history records
   * @returns {Array} Array of import records, newest first
   */
  getAll() {
    try {
      const stored = localStorage.getItem(IMPORT_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('ImportHistoryService: Error loading history', error);
      return [];
    }
  }

  /**
   * Add a new import record
   * @param {Object} record - Import record data
   * @param {number} record.totalTasks - Total number of tasks in import
   * @param {number} record.successCount - Number of successfully imported tasks
   * @param {number} record.errorCount - Number of failed tasks
   * @param {number} record.duration - Duration in milliseconds
   * @param {string} record.status - 'completed', 'failed', or 'partial'
   * @param {Array} record.errors - Optional array of error messages
   * @param {Object} record.metadata - Optional additional metadata
   * @returns {Object|null} The created record or null if error
   */
  addRecord(record) {
    try {
      const history = this.getAll();
      
      const newRecord = {
        id: `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        totalTasks: record.totalTasks || 0,
        successCount: record.successCount || 0,
        errorCount: record.errorCount || 0,
        duration: record.duration || null, // milliseconds
        status: record.status || 'completed', // 'completed', 'failed', 'partial'
        errors: record.errors || [], // Array of error messages
        importedBy: record.importedBy || 'Unknown', // User who imported
        ...record.metadata // Any additional data
      };
      
      // Add to beginning (newest first)
      history.unshift(newRecord);
      
      // Keep only last MAX_HISTORY_ITEMS
      const trimmed = history.slice(0, MAX_HISTORY_ITEMS);
      
      localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(trimmed));
      return newRecord;
    } catch (error) {
      console.error('ImportHistoryService: Error saving history', error);
      return null;
    }
  }

  /**
   * Clear all import history
   * @returns {boolean} True if successful
   */
  clear() {
    try {
      localStorage.removeItem(IMPORT_HISTORY_KEY);
      return true;
    } catch (error) {
      console.error('ImportHistoryService: Error clearing history', error);
      return false;
    }
  }

  /**
   * Get total number of import records
   * @returns {number} Number of records
   */
  getCount() {
    return this.getAll().length;
  }
}

export const importHistoryService = new ImportHistoryService();

