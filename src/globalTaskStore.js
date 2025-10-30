// Minimal compatibility shim for legacy components.
// Provides an in-memory store and pub-sub to keep UI working while backend is Functions API.

const subscribers = new Set();

const state = {
  tasks: [],
  selectedTasks: [],
  isLoading: false,
  syncInProgress: false,
};

function notify() {
  const snapshot = {
    tasks: state.tasks,
    selectedTasks: state.selectedTasks,
    isLoading: state.isLoading,
    syncInProgress: state.syncInProgress,
  };
  subscribers.forEach((cb) => {
    try { cb(snapshot); } catch (_) {}
  });
}

export const globalTaskStore = {
  subscribe(callback) {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  },

  getAllTasks() {
    return state.tasks;
  },

  setAllTasks(tasks) {
    state.tasks = Array.isArray(tasks) ? tasks : [];
    notify();
  },

  setLoading(flag) {
    state.isLoading = !!flag;
    notify();
  },

  setSyncProgress(flag) {
    state.syncInProgress = !!flag;
    notify();
  },

  updateTask(id, updates) {
    const idx = state.tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      state.tasks[idx] = { ...state.tasks[idx], ...updates };
      notify();
    }
  },

  updateMultipleTasks(ids, updates) {
    const idSet = new Set(ids);
    state.tasks = state.tasks.map(t => (idSet.has(t.id) ? { ...t, ...updates } : t));
    notify();
  },

  removeMultipleTasks(ids) {
    const idSet = new Set(ids);
    state.tasks = state.tasks.filter(t => !idSet.has(t.id));
    notify();
  },

  toggleTaskSelection(id) {
    const i = state.selectedTasks.indexOf(id);
    if (i === -1) state.selectedTasks.push(id);
    else state.selectedTasks.splice(i, 1);
    notify();
  },

  selectAllTasks() {
    state.selectedTasks = state.tasks.map(t => t.id);
    notify();
  },

  clearSelections() {
    state.selectedTasks = [];
    notify();
  },

  removeDuplicates() {
    const seen = new Set();
    const before = state.tasks.length;
    state.tasks = state.tasks.filter(t => {
      const key = t.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const removed = before - state.tasks.length;
    notify();
    return Array.from({ length: removed });
  },
};



