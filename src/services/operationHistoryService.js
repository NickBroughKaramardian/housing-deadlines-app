/**
 * Operation History Service
 * 
 * Manages operation history persistence in localStorage.
 * Tracks all batch import and deletion operations with metadata.
 */

const OPERATION_HISTORY_KEY = 'task_operation_history';
const MAX_HISTORY_ITEMS = 100; // Keep last 100 operations

class OperationHistoryService {
  constructor() {
    // Migrate old import history on first load
    this.migrateOldRecords();
  }

  /**
   * Migrate old import history records to new format
   */
  migrateOldRecords() {
    try {
      const oldKey = 'task_import_history';
      const oldRecords = localStorage.getItem(oldKey);
      
      if (oldRecords) {
        const parsed = JSON.parse(oldRecords);
        
        // Add type field to old records
        const migrated = parsed.map(record => ({
          ...record,
          type: record.type || 'import' // Default to 'import' if not set
        }));
        
        // Save to new key
        localStorage.setItem(OPERATION_HISTORY_KEY, JSON.stringify(migrated));
        
        // Remove old key
        localStorage.removeItem(oldKey);
        
        console.log(`OperationHistoryService: Migrated ${migrated.length} import records`);
      }
    } catch (error) {
      console.error('OperationHistoryService: Error migrating old records', error);
    }
  }

  /**
   * Get all operation history records
   * @param {string} filterType - Optional filter: 'import', 'delete', or null for all
   * @returns {Array} Array of operation records, newest first
   */
  getAll(filterType = null) {
    try {
      const stored = localStorage.getItem(OPERATION_HISTORY_KEY);
      const allRecords = stored ? JSON.parse(stored) : [];
      
      if (filterType) {
        return allRecords.filter(record => record.type === filterType);
      }
      
      return allRecords;
    } catch (error) {
      console.error('OperationHistoryService: Error loading history', error);
      return [];
    }
  }

  /**
   * Add a new operation record
   * @param {Object} record - Operation record data
   * @param {string} record.type - 'import' or 'delete'
   * @param {number} record.totalTasks - Total number of tasks in operation
   * @param {number} record.successCount - Number of successfully processed tasks
   * @param {number} record.errorCount - Number of failed tasks
   * @param {number} record.duration - Duration in milliseconds
   * @param {string} record.status - 'completed', 'failed', or 'partial'
   * @param {Array} record.errors - Optional array of error messages
   * @param {string} record.performedBy - User who performed the operation
   * @param {Object} record.metadata - Optional additional metadata
   * @returns {Object|null} The created record or null if error
   */
  addRecord(record) {
    try {
      const history = this.getAll();
      
      const newRecord = {
        id: `${record.type || 'operation'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        type: record.type || 'import', // Default to 'import' for backward compatibility
        totalTasks: record.totalTasks || 0,
        successCount: record.successCount || 0,
        errorCount: record.errorCount || 0,
        duration: record.duration || null, // milliseconds
        status: record.status || 'completed', // 'completed', 'failed', 'partial'
        errors: record.errors || [], // Array of error messages
        performedBy: record.performedBy || record.importedBy || 'Unknown', // Support both field names
        ...record.metadata // Any additional data
      };
      
      // Add to beginning (newest first)
      history.unshift(newRecord);
      
      // Keep only last MAX_HISTORY_ITEMS
      const trimmed = history.slice(0, MAX_HISTORY_ITEMS);
      
      localStorage.setItem(OPERATION_HISTORY_KEY, JSON.stringify(trimmed));
      return newRecord;
    } catch (error) {
      console.error('OperationHistoryService: Error saving history', error);
      return null;
    }
  }

  /**
   * Clear all operation history
   * @returns {boolean} True if successful
   */
  clear() {
    try {
      localStorage.removeItem(OPERATION_HISTORY_KEY);
      // Also clear old key if it exists
      localStorage.removeItem('task_import_history');
      return true;
    } catch (error) {
      console.error('OperationHistoryService: Error clearing history', error);
      return false;
    }
  }

  /**
   * Get total number of operation records
   * @param {string} filterType - Optional filter: 'import', 'delete', or null for all
   * @returns {number} Number of records
   */
  getCount(filterType = null) {
    return this.getAll(filterType).length;
  }
}

export const operationHistoryService = new OperationHistoryService();

