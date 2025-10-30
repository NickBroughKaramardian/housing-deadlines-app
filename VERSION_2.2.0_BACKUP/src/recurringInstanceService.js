/**
 * Recurring Instance Service
 * Manages recurring task instances using IndexedDB as a local server
 */

class RecurringInstanceService {
  constructor() {
    this.dbName = 'RecurringInstancesDB';
    this.dbVersion = 1;
    this.storeName = 'instances';
    this.db = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('RecurringInstanceService: IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create instances store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          
          // Create indexes for efficient queries
          store.createIndex('parentId', 'parentId', { unique: false });
          store.createIndex('instanceDate', 'instanceDate', { unique: false });
          store.createIndex('completionStatus', 'completionStatus', { unique: false });
          
          console.log('RecurringInstanceService: Created instances store');
        }
      };
    });
  }

  async getAllInstances() {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        console.log(`RecurringInstanceService: Retrieved ${request.result.length} instances`);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Failed to get instances:', request.error);
        reject(request.error);
      };
    });
  }

  async getInstancesByParent(parentId) {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('parentId');
      const request = index.getAll(parentId);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Failed to get instances by parent:', request.error);
        reject(request.error);
      };
    });
  }

  async addInstance(instance) {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(instance);

      request.onsuccess = () => {
        console.log('RecurringInstanceService: Added instance:', instance.id);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Failed to add instance:', request.error);
        reject(request.error);
      };
    });
  }

  async updateInstance(instance) {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(instance);

      request.onsuccess = () => {
        console.log('RecurringInstanceService: Updated instance:', instance.id);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Failed to update instance:', request.error);
        reject(request.error);
      };
    });
  }

  async deleteInstance(instanceId) {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(instanceId);

      request.onsuccess = () => {
        console.log('RecurringInstanceService: Deleted instance:', instanceId);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Failed to delete instance:', request.error);
        reject(request.error);
      };
    });
  }

  async deleteInstancesByParent(parentId) {
    await this.initialize();
    
    const instances = await this.getInstancesByParent(parentId);
    const deletePromises = instances.map(instance => this.deleteInstance(instance.id));
    
    try {
      await Promise.all(deletePromises);
      console.log(`RecurringInstanceService: Deleted ${instances.length} instances for parent:`, parentId);
    } catch (error) {
      console.error('Failed to delete instances by parent:', error);
      throw error;
    }
  }

  async clearAllInstances() {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('RecurringInstanceService: Cleared all instances');
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to clear instances:', request.error);
        reject(request.error);
      };
    });
  }

  async getInstanceStats() {
    const instances = await this.getAllInstances();
    
    return {
      total: instances.length,
      completed: instances.filter(i => i.completionStatus).length,
      overdue: instances.filter(i => {
        if (i.completionStatus) return false;
        const deadline = new Date(i.instanceDate);
        return deadline < new Date();
      }).length,
      pending: instances.filter(i => !i.completionStatus).length
    };
  }
}

// Create singleton instance
const recurringInstanceService = new RecurringInstanceService();

export default recurringInstanceService;


