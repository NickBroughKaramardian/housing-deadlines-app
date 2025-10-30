import { singleListDataService } from '../singleListDataService';

// Microsoft 365 ONLY - No Firebase!
export const db = {};

export const collection = (db, collectionName) => ({
  _path: {
    segments: [collectionName]
  },
  doc: (id) => ({
    _path: {
      segments: [collectionName, id]
    },
    get: async () => {
      try {
        if (collectionName === 'tasks') {
          const tasks = await singleListDataService.getAllTasks();
          const task = tasks.find(t => t.id === id);
          return {
            exists: !!task,
            data: () => task || {},
            id: id
          };
        }
        return {
          exists: false,
          data: () => ({}),
          id: id
        };
      } catch (error) {
        console.error(`Error getting document from ${collectionName}:`, error);
        return {
          exists: false,
          data: () => ({}),
          id: id
        };
      }
    }
  }),
  add: async (data) => {
    try {
      if (collectionName === 'tasks') {
        return await singleListDataService.addTask(data);
      }
      throw new Error(`Collection ${collectionName} not supported`);
    } catch (error) {
      console.error(`Error adding document to ${collectionName}:`, error);
      throw error;
    }
  },
  where: (field, operator, value) => ({
    _path: { segments: [collectionName] },
    field, operator, value,
    get: async () => {
      try {
        if (collectionName === 'tasks') {
          const allTasks = await singleListDataService.getAllTasks();
          const filteredTasks = allTasks.filter(task => {
            if (operator === '==') return task[field] === value;
            if (operator === '!=') return task[field] !== value;
            if (operator === '>') return task[field] > value;
            if (operator === '<') return task[field] < value;
            if (operator === '>=') return task[field] >= value;
            if (operator === '<=') return task[field] <= value;
            if (operator === 'in') return value.includes(task[field]);
            if (operator === 'not-in') return !value.includes(task[field]);
            if (operator === 'array-contains') return task[field] && task[field].includes(value);
            if (operator === 'array-contains-any') return task[field] && value.some(v => task[field].includes(v));
            return true;
          });
          return {
            docs: filteredTasks.map(task => ({
              id: task.id,
              data: () => task,
              exists: true
            }))
          };
        }
        return { docs: [] };
      } catch (error) {
        console.error(`Error querying ${collectionName}:`, error);
        return { docs: [] };
      }
    }
  }),
  onSnapshot: (callback) => {
    const poll = async () => {
      try {
        if (collectionName === 'tasks') {
          const tasks = await singleListDataService.getAllTasks();
          callback({
            docs: tasks.map(task => ({
              id: task.id,
              data: () => task,
              exists: true
            }))
          });
        } else {
          callback({ docs: [] });
        }
      } catch (error) {
        console.error(`Error in onSnapshot for ${collectionName}:`, error);
        callback({ docs: [] });
      }
    };
    poll();
    const interval = setInterval(poll, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }
});

export const doc = (db, collectionName, docId) => ({
  _path: {
    segments: [collectionName, docId]
  },
  get: async () => {
    try {
      if (collectionName === 'tasks') {
        const tasks = await singleListDataService.getAllTasks();
        const task = tasks.find(t => t.id === docId);
        return {
          exists: !!task,
          data: () => task || {},
          id: docId
        };
      }
      return {
        exists: false,
        data: () => ({}),
        id: docId
      };
    } catch (error) {
      console.error(`Error getting document from ${collectionName}:`, error);
      return {
        exists: false,
        data: () => ({}),
        id: docId
      };
    }
  }
});

export const addDoc = async (collectionRef, data) => {
  try {
    const collectionName = collectionRef._path.segments[0];
    if (collectionName === 'tasks') {
      return await singleListDataService.addTask(data);
    }
    throw new Error(`Collection ${collectionName} not supported`);
  } catch (error) {
    console.error('Error adding document:', error);
    throw error;
  }
};

export const setDoc = async (docRef, data) => {
  try {
    const collectionName = docRef._path.segments[0];
    const docId = docRef._path.segments[1];
    if (collectionName === 'tasks') {
      await singleListDataService.updateTask(docId, data);
      return { id: docId };
    }
    throw new Error(`Collection ${collectionName} not supported`);
  } catch (error) {
    console.error('Error setting document:', error);
    throw error;
  }
};

export const updateDoc = async (docRef, data) => {
  try {
    const collectionName = docRef._path.segments[0];
    const docId = docRef._path.segments[1];
    if (collectionName === 'tasks') {
      await singleListDataService.updateTask(docId, data);
      return { id: docId };
    }
    throw new Error(`Collection ${collectionName} not supported`);
  } catch (error) {
    console.error('Error updating document:', error);
    throw error;
  }
};

export const deleteDoc = async (docRef) => {
  try {
    const collectionName = docRef._path.segments[0];
    const docId = docRef._path.segments[1];
    if (collectionName === 'tasks') {
      await singleListDataService.deleteTask(docId);
      return { id: docId };
    }
    throw new Error(`Collection ${collectionName} not supported`);
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

export const getDoc = async (docRef) => {
  try {
    const collectionName = docRef._path.segments[0];
    const docId = docRef._path.segments[1];
    if (collectionName === 'tasks') {
      const tasks = await singleListDataService.getAllTasks();
      const task = tasks.find(t => t.id === docId);
      return {
        exists: !!task,
        data: () => task || {},
        id: docId
      };
    }
    return {
      exists: false,
      data: () => ({}),
      id: docId
    };
  } catch (error) {
    console.error('Error getting document:', error);
    return {
      exists: false,
      data: () => ({}),
      id: docRef._path.segments[1]
    };
  }
};

export const getDocs = async (query) => {
  try {
    const collectionName = query._path.segments[0];
    if (collectionName === 'tasks') {
      const allTasks = await singleListDataService.getAllTasks();
      
      let filteredTasks = allTasks;
      
      // Apply where filters
      if (query.field && query.operator && query.value !== undefined) {
        filteredTasks = filteredTasks.filter(task => {
          if (query.operator === '==') return task[query.field] === query.value;
          if (query.operator === '!=') return task[query.field] !== query.value;
          if (query.operator === '>') return task[query.field] > query.value;
          if (query.operator === '<') return task[query.field] < query.value;
          if (query.operator === '>=') return task[query.field] >= query.value;
          if (query.operator === '<=') return task[query.field] <= query.value;
          if (query.operator === 'in') return query.value.includes(task[query.field]);
          if (query.operator === 'not-in') return !query.value.includes(task[query.field]);
          if (query.operator === 'array-contains') return task[query.field] && task[query.field].includes(query.value);
          if (query.operator === 'array-contains-any') return task[query.field] && query.value.some(v => task[query.field].includes(v));
          return true;
        });
      }
      
      return {
        docs: filteredTasks.map(task => ({
          id: task.id,
          data: () => task,
          exists: true
        }))
      };
    }
    return { docs: [] };
  } catch (error) {
    console.error('Error getting documents:', error);
    return { docs: [] };
  }
};

export const query = (collectionRef, ...queryConstraints) => {
  const collectionName = collectionRef._path.segments[0];
  let queryObj = {
    _path: { segments: [collectionName] }
  };
  
  queryConstraints.forEach(constraint => {
    if (constraint.field) {
      queryObj.field = constraint.field;
      queryObj.operator = constraint.operator;
      queryObj.value = constraint.value;
    }
  });
  
  return queryObj;
};

export const where = (field, operator, value) => ({ field, operator, value });
export const orderBy = (field, direction) => ({ field, direction });
export const limit = (count) => ({ count });

export const onSnapshot = (query, callback) => {
  const poll = async () => {
    try {
      const collectionName = query._path.segments[0];
      
      if (collectionName === 'tasks') {
        const tasks = await singleListDataService.getAllTasks();
        callback({
          docs: tasks.map(task => ({
            id: task.id,
            data: () => task,
            exists: true
          }))
        });
      } else {
        callback({ docs: [] });
      }
    } catch (error) {
      console.error('Error in onSnapshot:', error);
      callback({ docs: [] });
    }
  };
  poll();
  const interval = setInterval(poll, 30000); // Poll every 30 seconds
  return () => clearInterval(interval);
};

export const serverTimestamp = () => new Date().toISOString();
