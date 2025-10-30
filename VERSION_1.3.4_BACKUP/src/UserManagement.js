import React, { useState, useEffect } from 'react';
import { useAuth } from './Auth';
import { collection, getDocs, updateDoc, doc, addDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { inviteUser } from './Auth';

export default function UserManagement() {
  const { userProfile, hasPermission, ROLES, updateUserRole, removeUser, DEPARTMENTS, updateUserDepartments } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    if (hasPermission(ROLES.ADMIN)) {
      loadUsers();
    }
  }, [hasPermission, ROLES.ADMIN]);

  // Set initial invite role when component loads
  useEffect(() => {
    if (userProfile && hasPermission(ROLES.ADMIN)) {
      const availableRoles = getAvailableInviteRoles();
      if (availableRoles.length > 0 && !inviteRole) {
        setInviteRole(availableRoles[0][1]); // Set to first available role
      }
    }
  }, [userProfile, hasPermission, ROLES.ADMIN]);

  const loadUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };



  const handleRoleChange = async (userId, newRole, currentRole) => {
    try {
      await updateUserRole(userId, newRole, currentRole);
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Error updating user role: ' + error.message);
    }
  };

  const handleRemoveUser = async (userId, userRole) => {
    // Developers can remove anyone, including other developers
    if (userProfile.role === ROLES.DEVELOPER) {
      if (window.confirm('Are you sure you want to remove this user? This action cannot be undone.')) {
        try {
          // Use the Auth context removeUser function
          await removeUser(userId, userRole);
          
          // Update local state to remove the user
          setUsers(users.filter(user => user.id !== userId));
          
          alert('User removed successfully.');
        } catch (error) {
          console.error('Error removing user:', error);
          alert('Error removing user: ' + error.message);
        }
      }
      return;
    }

    // Non-developers follow the hierarchy check
    if (!canRemoveUser(userRole)) {
      alert('You cannot remove this user due to role hierarchy.');
      return;
    }

    if (window.confirm('Are you sure you want to remove this user? This action cannot be undone.')) {
      try {
        // Use the Auth context removeUser function
        await removeUser(userId, userRole);
        
        // Update local state to remove the user
        setUsers(users.filter(user => user.id !== userId));
        
        alert('User removed successfully.');
      } catch (error) {
        console.error('Error removing user:', error);
        alert('Error removing user: ' + error.message);
      }
    }
  };

  const canRemoveUser = (targetRole) => {
    // Developers can remove anyone, including other developers
    if (userProfile.role === ROLES.DEVELOPER) {
      return true;
    }
    
    // Non-developers can remove users with lower or equal permissions (except developers)
    if (targetRole === ROLES.DEVELOPER) {
      return false;
    }
    
    const roleHierarchy = {
      [ROLES.DEVELOPER]: 5,
      [ROLES.OWNER]: 4,
      [ROLES.ADMIN]: 3,
      [ROLES.EDITOR]: 2,
      [ROLES.VIEWER]: 1
    };
    return roleHierarchy[userProfile.role] >= roleHierarchy[targetRole];
  };

  const canModifyUser = (targetRole) => {
    // Developers can modify anyone, including other developers
    if (userProfile.role === ROLES.DEVELOPER) {
      return true;
    }
    
    // Non-developers can modify users with lower or equal permissions (except developers)
    if (targetRole === ROLES.DEVELOPER) {
      return false;
    }
    
    const roleHierarchy = {
      [ROLES.DEVELOPER]: 5,
      [ROLES.OWNER]: 4,
      [ROLES.ADMIN]: 3,
      [ROLES.EDITOR]: 2,
      [ROLES.VIEWER]: 1
    };
    return roleHierarchy[userProfile.role] >= roleHierarchy[targetRole];
  };

  const getAvailableRoles = () => {
    // Developers can assign any role except developer to others
    if (userProfile.role === ROLES.DEVELOPER) {
      return Object.entries(ROLES).filter(([key, role]) => role !== ROLES.DEVELOPER);
    }
    
    // Non-developers can only assign roles lower than their own
    const roleHierarchy = {
      [ROLES.DEVELOPER]: 5,
      [ROLES.OWNER]: 4,
      [ROLES.ADMIN]: 3,
      [ROLES.EDITOR]: 2,
      [ROLES.VIEWER]: 1
    };
    const currentUserLevel = roleHierarchy[userProfile.role] || 0;
    
    return Object.entries(ROLES).filter(([key, role]) => {
      const roleLevel = roleHierarchy[role] || 0;
      return roleLevel < currentUserLevel;
    });
  };

  const getAvailableInviteRoles = () => {
    const roleHierarchy = {
      [ROLES.DEVELOPER]: 5,
      [ROLES.OWNER]: 4,
      [ROLES.ADMIN]: 3,
      [ROLES.EDITOR]: 2,
      [ROLES.VIEWER]: 1
    };
    const currentUserLevel = roleHierarchy[userProfile.role] || 0;
    
    // Developers can invite up to developer role (including owner)
    if (userProfile.role === ROLES.DEVELOPER) {
      return Object.entries(ROLES).filter(([key, role]) => {
        const roleLevel = roleHierarchy[role] || 0;
        return roleLevel <= roleHierarchy[ROLES.DEVELOPER]; // Up to and including developer
      });
    }
    
    // Other roles can only invite roles below their own level
    return Object.entries(ROLES).filter(([key, role]) => {
      const roleLevel = roleHierarchy[role] || 0;
      return roleLevel < currentUserLevel;
    });
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case ROLES.DEVELOPER:
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700';
      case ROLES.OWNER:
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700';
      case ROLES.ADMIN:
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700';
      case ROLES.EDITOR:
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700';
      case ROLES.VIEWER:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600';
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      await inviteUser(inviteEmail.trim(), inviteRole, userProfile.uid);
      setInviteEmail('');
      // Reset to first available role
      const availableRoles = getAvailableInviteRoles();
      setInviteRole(availableRoles.length > 0 ? availableRoles[0][1] : '');
      alert('User account created successfully! The user can now sign in with their email and set a password on their first login.');
    } catch (error) {
      console.error('Error sending invite:', error);
      alert('Error sending invitation: ' + error.message);
    } finally {
      setIsInviting(false);
    }
  };



  function formatDate(date) {
    if (!date) return 'Never';
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      if (isNaN(dateObj.getTime())) return 'Never';
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Never';
    }
  }

  if (!hasPermission(ROLES.ADMIN)) {
    return (
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 lg:p-8">
        <div className="text-center text-gray-600 dark:text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">Access Denied</h2>
          <p>You don't have permission to access user management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 lg:p-8">
      <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-3">
        <svg className="w-8 h-8 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
        User Management
      </h2>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-primary mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading users...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Invite New User */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Invite New User</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Create a user account immediately. The user will be able to sign in with their email and set a password on their first login.
            </p>
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    placeholder="user@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    {getAvailableInviteRoles().map(([key, role]) => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={isInviting}
                className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors duration-200 font-medium disabled:opacity-50"
              >
                {isInviting ? 'Creating...' : 'Create User Account'}
              </button>
            </form>
          </div>



          {/* Current Users */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Current Users</h3>
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="flex items-start justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-theme-primary flex items-center justify-center text-white font-semibold">
                      {user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-white">{user.displayName || user.email}</p>
                        {user.role === ROLES.DEVELOPER && (
                          <span className="px-2 py-1 text-xs font-bold bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full border border-yellow-200 dark:border-yellow-700">
                            DEVELOPER
                          </span>
                        )}
                        {user.role === ROLES.OWNER && (
                          <span className="px-2 py-1 text-xs font-bold bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full border border-purple-200 dark:border-purple-700">
                            OWNER
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Last login: {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                      </p>
                      {/* Department assignment */}
                      {(userProfile.role === ROLES.DEVELOPER || userProfile.role === ROLES.OWNER) && (
                        <div className="mt-2">
                          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Departments</div>
                          <div className="flex flex-wrap gap-2">
                            {Object.values(DEPARTMENTS).map(deptId => {
                              const checked = Array.isArray(user.departments) && user.departments.includes(deptId);
                              return (
                                <label key={deptId} className="inline-flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
                                  <input
                                    type="checkbox"
                                    checked={!!checked}
                                    onChange={async (e) => {
                                      try {
                                        const current = Array.isArray(user.departments) ? [...user.departments] : [];
                                        const next = e.target.checked ? Array.from(new Set([...current, deptId])) : current.filter(d => d !== deptId);
                                        await updateUserDepartments(user.id, next);
                                        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, departments: next } : u));
                                      } catch (err) {
                                        alert('Error updating departments: ' + err.message);
                                      }
                                    }}
                                    className="rounded"
                                  />
                                  <span>{deptId.charAt(0).toUpperCase() + deptId.slice(1)}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value, user.role)}
                      disabled={(!canModifyUser(user.role) && userProfile.role !== ROLES.DEVELOPER) || (user.id === userProfile.uid && userProfile.role !== ROLES.DEVELOPER)}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                    >
                      {getAvailableRoles().map(([key, role]) => (
                        <option key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </option>
                      ))}
                    </select>
                    {(canRemoveUser(user.role) || userProfile.role === ROLES.DEVELOPER) && user.id !== userProfile.uid && (
                      <button
                        onClick={() => handleRemoveUser(user.id, user.role)}
                        className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Role Permissions Panel */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Role Permissions</h3>
            
            {/* Developer Special Note */}
            {userProfile.role === ROLES.DEVELOPER && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs font-bold bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full border border-yellow-200 dark:border-yellow-700">
                    DEVELOPER
                  </span>
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    You have full system access and can manage all users
                  </span>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(ROLES).filter(([key, role]) => role !== ROLES.DEVELOPER).map(([key, role]) => (
                <div key={role} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full border ${getRoleBadgeColor(role)}`}>
                      {role.toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700 dark:text-gray-300 font-medium">Permissions:</p>
                    <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                      {role === ROLES.OWNER && (
                        <>
                          <li>• Full system access</li>
                          <li>• Manage all users</li>
                          <li>• System configuration</li>
                        </>
                      )}
                      {role === ROLES.ADMIN && (
                        <>
                          <li>• Manage users</li>
                          <li>• Data import/export</li>
                          <li>• All editor permissions</li>
                        </>
                      )}
                      {role === ROLES.EDITOR && (
                        <>
                          <li>• Create/edit tasks</li>
                          <li>• Mark tasks complete</li>
                          <li>• View all data</li>
                        </>
                      )}
                      {role === ROLES.VIEWER && (
                        <>
                          <li>• View tasks only</li>
                          <li>• Mark tasks complete</li>
                          <li>• Read-only access</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 