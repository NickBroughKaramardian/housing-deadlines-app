const API =
  process.env.REACT_APP_API_BASE ||
  'https://cc-project-api.azurewebsites.net/api';

async function ok(res, method, path) {
  if (!res.ok) throw new Error(`${method} ${path} ${res.status}`);
}

export async function getTasks() {
  const path = '/tasks';
  const r = await fetch(`${API}${path}`);
  await ok(r, 'GET', path);
  const { data } = await r.json();
  return data;
}

export async function createTask(task) {
  const path = '/tasks';
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });
  await ok(r, 'POST', path);
  const { data } = await r.json();
  return data;
}

export async function updateTask(id, updates) {
  const path = `/tasks?id=${encodeURIComponent(id)}`;
  const r = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  await ok(r, 'PUT', path);
  const { data } = await r.json();
  return data;
}

export async function deleteTask(id) {
  const path = `/tasks?id=${encodeURIComponent(id)}`;
  const r = await fetch(`${API}${path}`, { method: 'DELETE' });
  if (!r.ok && r.status !== 204) throw new Error(`DELETE ${path} ${r.status}`);
  return true;
}
