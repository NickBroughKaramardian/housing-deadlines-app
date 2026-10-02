/**
 * Users / RBAC API (S3, S4).
 *
 * - GET /api/me              → { userId, email, name, role, departments }
 * - GET /api/userAssignments → [{ email, role, departments }, ...]
 * - PUT /api/userAssignments → save one { email, role, departments } (ADMIN only)
 */
import { apiRequest } from './apiClient';

function unwrap(response) {
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data;
  }
  return response;
}

export async function getMe() {
  return unwrap(await apiRequest('/me'));
}

export async function getUserAssignments() {
  const data = unwrap(await apiRequest('/userAssignments'));
  return Array.isArray(data) ? data : [];
}

export async function saveUserAssignment({ email, role, departments }) {
  return unwrap(
    await apiRequest('/userAssignments', {
      method: 'PUT',
      body: { email, role, departments }
    })
  );
}
