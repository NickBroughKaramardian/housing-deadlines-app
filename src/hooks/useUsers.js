// Shared user-loading hook (A2, S4).
//
// Loads enterprise users from Microsoft Graph and merges in role/department
// assignments from the backend userAssignments API (keyed by email).
// localStorage is no longer consulted for authorization decisions.

import { useState, useEffect, useCallback } from 'react';
import { microsoftDataService } from '../microsoftDataService';
import { getUserAssignments } from '../services/usersApi';

export function getUserEmail(user) {
  return user.mail || user.userPrincipalName || user.email || user.Email || '';
}

export function mergeAssignments(usersData, assignments) {
  const byEmail = new Map(
    (assignments || [])
      .filter(a => a && a.email)
      .map(a => [String(a.email).toLowerCase(), a])
  );

  return (Array.isArray(usersData) ? usersData : []).map(user => {
    const email = getUserEmail(user).toLowerCase();
    const assignment = email ? byEmail.get(email) : null;
    return {
      ...user,
      departments: assignment?.departments || [],
      role: assignment?.role || 'VIEWER'
    };
  });
}

/**
 * Load enterprise users merged with backend role/department assignments.
 * Re-loads when a `userAssignmentsChanged` window event is dispatched
 * (e.g. after an admin saves assignments on the Users page).
 */
export function useUsers() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [usersData, assignments] = await Promise.all([
        microsoftDataService.users.getEnterpriseUsers(),
        getUserAssignments().catch(error => {
          console.warn('useUsers: failed to load user assignments from API', error);
          return [];
        })
      ]);
      setUsers(mergeAssignments(usersData, assignments));
    } catch (error) {
      console.error('useUsers: failed to load users', error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('userAssignmentsChanged', load);
    return () => window.removeEventListener('userAssignmentsChanged', load);
  }, [load]);

  return { users, isLoading, reload: load };
}
