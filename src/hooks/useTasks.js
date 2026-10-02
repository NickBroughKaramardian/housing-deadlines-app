// Shared task-loading hook (A2). All pages render from taskManager's
// in-memory store (single source of truth, C8) and re-render on its events.
//
// Also implements P2: instead of a 30-second polling loop, tasks are verified
// against the database when the window regains focus, at most once per
// 5 minutes.

import { useState, useEffect } from 'react';
import { taskManager } from '../services/taskManager';

const CHANGE_EVENTS = new Set([
  'refreshed', 'created', 'updated', 'deleted',
  'batchCreated', 'batchUpdated', 'batchDeleted'
]);

const VERIFY_MIN_INTERVAL_MS = 5 * 60 * 1000;
// Module-level so the guard is shared across page mounts
let lastVerifyAt = 0;

async function verifyOnFocus() {
  if (!taskManager.isInitialized) return;
  const now = Date.now();
  if (now - lastVerifyAt < VERIFY_MIN_INTERVAL_MS) return;
  lastVerifyAt = now;

  try {
    const inSync = await taskManager.verifyTasks();
    if (!inSync) {
      await taskManager.refresh();
    }
  } catch (error) {
    console.error('useTasks: focus verification failed', error);
  }
}

/**
 * Subscribe to taskManager and expose the current task list.
 * @returns {{ tasks: Array, isLoading: boolean, error: Error|null }}
 */
export function useTasks() {
  const [tasks, setTasks] = useState(() => taskManager.getAllTasks());
  const [isLoading, setIsLoading] = useState(!taskManager.isInitialized);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const sync = () => {
      if (!cancelled) setTasks(taskManager.getAllTasks());
    };

    const unsubscribe = taskManager.subscribe(event => {
      if (cancelled) return;
      if (CHANGE_EVENTS.has(event.type)) {
        sync();
      } else if (event.type === 'loading') {
        setIsLoading(event.isLoading);
      }
    });

    taskManager.initialize()
      .then(() => {
        if (!cancelled) {
          sync();
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error('useTasks: failed to initialize tasks', err);
          setError(err);
          setIsLoading(false);
        }
      });

    window.addEventListener('focus', verifyOnFocus);

    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener('focus', verifyOnFocus);
    };
  }, []);

  return { tasks, isLoading, error };
}
