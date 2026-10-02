import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  UserGroupIcon, 
  ShieldCheckIcon, 
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { useAuth } from './Auth';
import { useUsers, getUserEmail } from './hooks/useUsers';
import { getUserAssignments, saveUserAssignment } from './services/usersApi';

// Department constants
const DEPARTMENTS = {
  DEVELOPMENT: 'development',
  ACCOUNTING: 'accounting', 
  COMPLIANCE: 'compliance',
  MANAGEMENT: 'management'
};

const DEPARTMENT_NAMES = {
  [DEPARTMENTS.DEVELOPMENT]: 'Development',
  [DEPARTMENTS.ACCOUNTING]: 'Accounting',
  [DEPARTMENTS.COMPLIANCE]: 'Compliance',
  [DEPARTMENTS.MANAGEMENT]: 'Management'
};

const DEPARTMENT_COLORS = {
  [DEPARTMENTS.DEVELOPMENT]: 'bg-blue-500',
  [DEPARTMENTS.ACCOUNTING]: 'bg-green-500',
  [DEPARTMENTS.COMPLIANCE]: 'bg-purple-500',
  [DEPARTMENTS.MANAGEMENT]: 'bg-orange-500'
};

// Role constants (must match the backend userAssignments contract)
const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER'
};

const ROLE_NAMES = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.MANAGER]: 'Manager',
  [ROLES.MEMBER]: 'Member',
  [ROLES.VIEWER]: 'Viewer'
};

const ROLE_COLORS = {
  [ROLES.ADMIN]: 'bg-red-500',
  [ROLES.MANAGER]: 'bg-purple-500',
  [ROLES.MEMBER]: 'bg-green-500',
  [ROLES.VIEWER]: 'bg-blue-500'
};

const USER_ASSIGNMENTS_KEY = 'user_assignments';

function UsersPage() {
  const { users: loadedUsers, isLoading: loading } = useUsers();
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.role === ROLES.ADMIN;

  // Optimistic local overrides (keyed by email) so button clicks reflect
  // immediately while the PUT is in flight.
  const [overrides, setOverrides] = useState({});
  const migrationAttemptedRef = useRef(false);

  const users = useMemo(() => {
    return loadedUsers.map(user => {
      const email = getUserEmail(user).toLowerCase();
      const override = email ? overrides[email] : null;
      return override ? { ...user, ...override } : user;
    });
  }, [loadedUsers, overrides]);

  // One-time migration (S4): if the backend has no assignments yet, the
  // current user is an ADMIN, and legacy localStorage assignments exist,
  // push them to the API once. localStorage is no longer read for
  // authorization decisions anywhere else.
  useEffect(() => {
    if (migrationAttemptedRef.current) return;
    if (!isAdmin || loadedUsers.length === 0) return;
    migrationAttemptedRef.current = true;

    (async () => {
      try {
        const existing = await getUserAssignments();
        if (existing.length > 0) return;

        let localAssignments = {};
        try {
          localAssignments = JSON.parse(localStorage.getItem(USER_ASSIGNMENTS_KEY) || '{}');
        } catch {
          return;
        }
        const entries = Object.entries(localAssignments);
        if (entries.length === 0) return;

        console.log('UsersPage: migrating', entries.length, 'localStorage assignments to the userAssignments API');
        for (const [userId, assignment] of entries) {
          const user = loadedUsers.find(u => u.id === userId);
          const email = user ? getUserEmail(user) : null;
          if (!email) continue;
          await saveUserAssignment({
            email,
            role: assignment.role || ROLES.VIEWER,
            departments: assignment.departments || []
          });
        }
        window.dispatchEvent(new Event('userAssignmentsChanged'));
      } catch (error) {
        console.warn('UsersPage: assignment migration skipped:', error.message);
      }
    })();
  }, [isAdmin, loadedUsers]);

  // Persist an assignment via PUT /api/userAssignments (ADMIN only)
  const saveAssignment = useCallback(async (user, changes) => {
    const email = getUserEmail(user);
    if (!email) {
      alert('This user has no email address and cannot be assigned.');
      return;
    }

    const next = {
      role: changes.role !== undefined ? changes.role : (user.role || ROLES.VIEWER),
      departments: changes.departments !== undefined ? changes.departments : (user.departments || [])
    };

    const emailKey = email.toLowerCase();
    const previousOverride = overrides[emailKey];
    setOverrides(prev => ({ ...prev, [emailKey]: next }));

    try {
      await saveUserAssignment({ email, ...next });
      // Notify useUsers consumers (Dashboard etc.) to reload assignments
      window.dispatchEvent(new Event('userAssignmentsChanged'));
    } catch (error) {
      console.error('UsersPage: Error saving assignment:', error);
      alert(`Failed to save assignment: ${error.message}`);
      // Roll back the optimistic override
      setOverrides(prev => {
        const copy = { ...prev };
        if (previousOverride) {
          copy[emailKey] = previousOverride;
        } else {
          delete copy[emailKey];
        }
        return copy;
      });
    }
  }, [overrides]);

  const handleDepartmentToggle = (user, department) => {
    const currentDepartments = user.departments || [];
    const newDepartments = currentDepartments.includes(department)
      ? currentDepartments.filter(d => d !== department)
      : [...currentDepartments, department];
    saveAssignment(user, { departments: newDepartments });
  };

  const handleRoleChange = (user, newRole) => {
    if (user.role === newRole) return;
    saveAssignment(user, { role: newRole });
  };

  // Get department badge color
  const getDepartmentBadgeColor = (department) => {
    return DEPARTMENT_COLORS[department] || 'bg-gray-500';
  };

  // Get role badge color
  const getRoleBadgeColor = (role) => {
    return ROLE_COLORS[role] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isAdmin
                ? 'Assign roles and departments to enterprise users'
                : 'View enterprise users and their assignments (admin access required to edit)'}
            </p>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Enterprise Users</h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.map(user => (
              <div key={user.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <UserGroupIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{user.displayName || user.DisplayName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{getUserEmail(user)}</p>
                    </div>
                  </div>
                  
                  {isAdmin ? (
                    <div className="flex items-center gap-6">
                      {/* Role Selection */}
                      <div className="flex gap-1">
                        {Object.entries(ROLE_NAMES).map(([key, name]) => {
                          const isSelected = user.role === key;
                          return (
                            <button
                              key={key}
                              onClick={() => handleRoleChange(user, key)}
                              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                isSelected
                                  ? `${getRoleBadgeColor(key)} text-white`
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                            >
                              {name}
                            </button>
                          );
                        })}
                      </div>

                      {/* Separator */}
                      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>

                      {/* Department Selection Buttons */}
                      <div className="flex gap-1">
                        {Object.entries(DEPARTMENT_NAMES).map(([key, name]) => {
                          const isAssigned = (user.departments || []).includes(key);
                          return (
                            <button
                              key={key}
                              onClick={() => handleDepartmentToggle(user, key)}
                              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                isAssigned
                                  ? `${getDepartmentBadgeColor(key)} text-white`
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                            >
                              {name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getRoleBadgeColor(user.role)}`}>
                        {ROLE_NAMES[user.role] || 'Viewer'}
                      </span>
                      {(user.departments || []).map(dept => (
                        <span key={dept} className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getDepartmentBadgeColor(dept)}`}>
                          {DEPARTMENT_NAMES[dept] || dept}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>


        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <UserGroupIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Enterprise Users</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <ShieldCheckIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {users.filter(u => u.role === ROLES.ADMIN).length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Admins</p>
              </div>
            </div>
          </div>
        </div>

        {/* Department Members */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(DEPARTMENT_NAMES).map(([key, name]) => {
            const departmentMembers = users.filter(user => 
              (user.departments || []).includes(key)
            );
            
            return (
              <div key={key} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-full ${getDepartmentBadgeColor(key)}`}>
                    <BuildingOfficeIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {departmentMembers.length} member{departmentMembers.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {departmentMembers.length > 0 ? (
                    departmentMembers.map(member => (
                      <div key={member.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <UserGroupIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {member.displayName || member.DisplayName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {getUserEmail(member)}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getRoleBadgeColor(member.role)}`}>
                          {ROLE_NAMES[member.role] || 'Viewer'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">No members assigned</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default UsersPage;
