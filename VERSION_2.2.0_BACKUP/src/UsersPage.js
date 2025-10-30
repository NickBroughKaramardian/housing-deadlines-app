import React, { useState, useEffect } from 'react';
import { 
  UserGroupIcon, 
  ShieldCheckIcon, 
  BuildingOfficeIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { microsoftDataService } from './microsoftDataService';
import { useAuth } from './Auth';

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

// Role constants
const ROLES = {
  ADMIN: 'ADMIN',
  VIEWER: 'VIEWER'
};

const ROLE_NAMES = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.VIEWER]: 'Viewer'
};

const ROLE_DESCRIPTIONS = {
  [ROLES.ADMIN]: 'Can view and edit all data',
  [ROLES.VIEWER]: 'Can only view data'
};

const ROLE_COLORS = {
  [ROLES.ADMIN]: 'bg-red-500',
  [ROLES.VIEWER]: 'bg-blue-500'
};

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userProfile, hasPermission } = useAuth();

  // Local storage key for user assignments
  const USER_ASSIGNMENTS_KEY = 'user_assignments';

  // Load enterprise users and local assignments
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        // Get enterprise users from Microsoft Graph
        const usersData = await microsoftDataService.users.getEnterpriseUsers();
        
        // Load local assignments from localStorage
        const localAssignments = JSON.parse(localStorage.getItem(USER_ASSIGNMENTS_KEY) || '{}');
        
        // Merge enterprise users with local assignments
        const usersWithAssignments = usersData.map(user => ({
          ...user,
          departments: localAssignments[user.id]?.departments || [],
          role: localAssignments[user.id]?.role || ROLES.VIEWER
        }));
        
        setUsers(usersWithAssignments);
        console.log('UsersPage: Loaded', usersData.length, 'enterprise users with local assignments');
      } catch (error) {
        console.error('UsersPage: Error loading enterprise users:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  // Handle department toggle
  const handleDepartmentToggle = (userId, department) => {
    const user = users.find(u => u.id === userId);
    const currentDepartments = user.departments || [];
    const newDepartments = currentDepartments.includes(department)
      ? currentDepartments.filter(d => d !== department)
      : [...currentDepartments, department];

    // Update local state
    setUsers(users.map(u => 
      u.id === userId ? { ...u, departments: newDepartments } : u
    ));

    // Save to localStorage
    const localAssignments = JSON.parse(localStorage.getItem(USER_ASSIGNMENTS_KEY) || '{}');
    localAssignments[userId] = {
      ...localAssignments[userId],
      departments: newDepartments
    };
    localStorage.setItem(USER_ASSIGNMENTS_KEY, JSON.stringify(localAssignments));

    console.log('UsersPage: Updated user departments locally:', userId, newDepartments);
  };

  // Handle role change
  const handleRoleChange = (userId, newRole) => {
    // Update local state
    setUsers(users.map(u => 
      u.id === userId ? { ...u, role: newRole } : u
    ));

    // Save to localStorage
    const localAssignments = JSON.parse(localStorage.getItem(USER_ASSIGNMENTS_KEY) || '{}');
    localAssignments[userId] = {
      ...localAssignments[userId],
      role: newRole
    };
    localStorage.setItem(USER_ASSIGNMENTS_KEY, JSON.stringify(localAssignments));

    console.log('UsersPage: Updated user role locally:', userId, newRole);
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
              Assign departments to enterprise users
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
                      <p className="text-sm text-gray-600 dark:text-gray-400">{user.email || user.Email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    {/* Role Selection */}
                    <div className="flex gap-1">
                      {Object.entries(ROLE_NAMES).map(([key, name]) => {
                        const isSelected = user.role === key;
                        return (
                          <button
                            key={key}
                            onClick={() => handleRoleChange(user.id, key)}
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
                            onClick={() => handleDepartmentToggle(user.id, key)}
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
                            {member.email || member.Email}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getRoleBadgeColor(member.role)}`}>
                          {ROLE_NAMES[member.role]}
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
