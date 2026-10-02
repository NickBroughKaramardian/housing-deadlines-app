/**
 * Tasks API - all requests are authenticated via the shared apiClient (S2).
 */
import { apiRequest } from './apiClient';

function unwrap(response) {
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data;
  }
  return response;
}

export async function getTasks() {
  return unwrap(await apiRequest('/tasks'));
}

export async function createTask(task) {
  return unwrap(await apiRequest('/tasks', { method: 'POST', body: task }));
}

export async function updateTask(id, updates) {
  return unwrap(
    await apiRequest(`/tasks?id=${encodeURIComponent(id)}`, { method: 'PUT', body: updates })
  );
}

export async function deleteTask(id) {
  await apiRequest(`/tasks?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  return true;
}
