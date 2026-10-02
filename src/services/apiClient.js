/**
 * Centralized backend API client.
 *
 * Every request to the backend carries an `Authorization: Bearer <Entra ID token>`
 * header (the MSAL ID token, audience = this SPA's clientId). 401 responses are
 * surfaced as clear errors instead of being silently swallowed.
 */
import { getIdToken } from '../msalService';

export const API_BASE =
  process.env.REACT_APP_API_BASE ||
  'https://cc-project-api.azurewebsites.net/api';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Perform an authenticated request against the backend API.
 * @param {string} path - path relative to API_BASE, e.g. '/tasks'
 * @param {Object} [options]
 * @param {string} [options.method='GET']
 * @param {Object} [options.body] - JSON-serializable request body
 * @returns {Promise<any>} parsed JSON body (or null for empty/204 responses)
 */
export async function apiRequest(path, { method = 'GET', body } = {}) {
  const token = await getIdToken();

  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  if (response.status === 401) {
    throw new ApiError(
      'You are not authorized (session expired or access denied). Please sign in again.',
      401
    );
  }
  if (response.status === 403) {
    throw new ApiError('You do not have permission to perform this action.', 403);
  }
  if (!response.ok && response.status !== 204) {
    throw new ApiError(`${method} ${path} failed (${response.status})`, response.status);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }
  return JSON.parse(text);
}
