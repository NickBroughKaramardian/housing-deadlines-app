import React, { useState, useMemo, useRef, useEffect } from 'react';
import { UserIcon, PencilIcon } from '@heroicons/react/24/outline';

const ResponsiblePartySelector = ({ 
  task, 
  className = '', 
  editingCell, 
  enterpriseUsers, 
  editInputRef, 
  editValueRef, 
  saveEdit, 
  startEditing 
}) => {
  const isEditing = editingCell?.taskId === task.id && editingCell?.field === 'responsibleParty';
  const [inputValue, setInputValue] = useState(task.responsibleParty || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const containerRef = useRef(null);
  
  // Update input value when editing starts
  useEffect(() => {
    if (isEditing) {
      setInputValue(task.responsibleParty || '');
      setShowDropdown(true);
    }
  }, [isEditing, task.responsibleParty]);
  
  // Filter users as user types
  const filteredUsers = useMemo(() => {
    if (!inputValue.trim()) {
      // Show first 10 users when no input
      return enterpriseUsers.slice(0, 10);
    }
    const searchLower = inputValue.toLowerCase();
    return enterpriseUsers.filter(user => {
      const name = (user.displayName || user.DisplayName || '').toLowerCase();
      const email = (user.email || user.Email || user.mail || user.userPrincipalName || '').toLowerCase();
      return name.includes(searchLower) || email.includes(searchLower);
    }).slice(0, 20); // Show more results when searching
  }, [enterpriseUsers, inputValue]);
  
  const getUserDisplay = (user) => {
    return user.displayName || user.DisplayName || user.email || user.Email || user.mail || user.userPrincipalName || 'Unknown';
  };
  
  const getUserEmail = (user) => {
    return user.email || user.Email || user.mail || user.userPrincipalName || '';
  };
  
  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
        // Save on blur if dropdown is closed
        if (isEditing) {
          editValueRef.current = inputValue;
          saveEdit();
        }
      }
    };
    
    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isEditing, inputValue, saveEdit, editValueRef]);
  
  const handleUserSelect = (user) => {
    const userEmail = getUserEmail(user);
    setInputValue(userEmail);
    editValueRef.current = userEmail;
    setShowDropdown(false);
    // Auto-save when user is selected
    setTimeout(() => {
      saveEdit();
    }, 100);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If there's exactly one filtered user, select it
      if (filteredUsers.length === 1) {
        handleUserSelect(filteredUsers[0]);
      } else {
        // Otherwise save current input
        editValueRef.current = inputValue;
        setShowDropdown(false);
        saveEdit();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowDropdown(false);
      setInputValue(task.responsibleParty || '');
    } else if (e.key === 'ArrowDown' && filteredUsers.length > 0) {
      e.preventDefault();
      // Focus first user in dropdown
      if (dropdownRef.current) {
        const firstButton = dropdownRef.current.querySelector('button');
        if (firstButton) firstButton.focus();
      }
    } else if (e.key === 'Tab') {
      // Allow tab to close and save
      editValueRef.current = inputValue;
      setShowDropdown(false);
      saveEdit();
    }
  };
  
  if (isEditing) {
    return (
      <div ref={containerRef} className="relative w-full">
        <input
          ref={editInputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            const newValue = e.target.value;
            setInputValue(newValue);
            editValueRef.current = newValue;
            setShowDropdown(true); // Show dropdown when typing
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
          className={`w-full px-2 py-1 border-2 border-blue-500 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
          onClick={(e) => {
            e.stopPropagation();
            setShowDropdown(true);
          }}
          placeholder="Type to search users..."
          autoComplete="off"
        />
        
        {showDropdown && enterpriseUsers.length > 0 && filteredUsers.length > 0 && (
          <div 
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-64 overflow-auto"
            onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking dropdown
          >
            <div className="py-1">
              {filteredUsers.map(user => {
                const userEmail = getUserEmail(user);
                const userName = getUserDisplay(user);
                const isExactMatch = userEmail.toLowerCase() === inputValue.toLowerCase() || 
                                    userName.toLowerCase() === inputValue.toLowerCase();
                
                return (
                  <button
                    key={user.id || userEmail}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input blur
                      handleUserSelect(user);
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors ${
                      isExactMatch ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{userName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{userEmail}</div>
                  </button>
                );
              })}
              {filteredUsers.length === 0 && inputValue.trim() && (
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  No users found. Press Enter to save "{inputValue}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div
      onClick={() => startEditing(task.id, 'responsibleParty', task.responsibleParty || '')}
      className={`px-2 py-1 cursor-text hover:bg-blue-50 dark:hover:bg-gray-700 rounded min-h-[1.5rem] flex items-center group transition-colors ${className}`}
      title="Click to edit or search for user"
    >
      <span className="flex-1">{task.responsibleParty || <span className="text-gray-400 italic">Click to edit</span>}</span>
      <PencilIcon className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
    </div>
  );
};

export default ResponsiblePartySelector;



const ResponsiblePartySelector = ({ 
  task, 
  className = '', 
  editingCell, 
  enterpriseUsers, 
  editInputRef, 
  editValueRef, 
  saveEdit, 
  startEditing 
}) => {
  const isEditing = editingCell?.taskId === task.id && editingCell?.field === 'responsibleParty';
  const [inputValue, setInputValue] = useState(task.responsibleParty || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const containerRef = useRef(null);
  
  // Update input value when editing starts
  useEffect(() => {
    if (isEditing) {
      setInputValue(task.responsibleParty || '');
      setShowDropdown(true);
    }
  }, [isEditing, task.responsibleParty]);
  
  // Filter users as user types
  const filteredUsers = useMemo(() => {
    if (!inputValue.trim()) {
      // Show first 10 users when no input
      return enterpriseUsers.slice(0, 10);
    }
    const searchLower = inputValue.toLowerCase();
    return enterpriseUsers.filter(user => {
      const name = (user.displayName || user.DisplayName || '').toLowerCase();
      const email = (user.email || user.Email || user.mail || user.userPrincipalName || '').toLowerCase();
      return name.includes(searchLower) || email.includes(searchLower);
    }).slice(0, 20); // Show more results when searching
  }, [enterpriseUsers, inputValue]);
  
  const getUserDisplay = (user) => {
    return user.displayName || user.DisplayName || user.email || user.Email || user.mail || user.userPrincipalName || 'Unknown';
  };
  
  const getUserEmail = (user) => {
    return user.email || user.Email || user.mail || user.userPrincipalName || '';
  };
  
  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
        // Save on blur if dropdown is closed
        if (isEditing) {
          editValueRef.current = inputValue;
          saveEdit();
        }
      }
    };
    
    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isEditing, inputValue, saveEdit, editValueRef]);
  
  const handleUserSelect = (user) => {
    const userEmail = getUserEmail(user);
    setInputValue(userEmail);
    editValueRef.current = userEmail;
    setShowDropdown(false);
    // Auto-save when user is selected
    setTimeout(() => {
      saveEdit();
    }, 100);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If there's exactly one filtered user, select it
      if (filteredUsers.length === 1) {
        handleUserSelect(filteredUsers[0]);
      } else {
        // Otherwise save current input
        editValueRef.current = inputValue;
        setShowDropdown(false);
        saveEdit();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowDropdown(false);
      setInputValue(task.responsibleParty || '');
    } else if (e.key === 'ArrowDown' && filteredUsers.length > 0) {
      e.preventDefault();
      // Focus first user in dropdown
      if (dropdownRef.current) {
        const firstButton = dropdownRef.current.querySelector('button');
        if (firstButton) firstButton.focus();
      }
    } else if (e.key === 'Tab') {
      // Allow tab to close and save
      editValueRef.current = inputValue;
      setShowDropdown(false);
      saveEdit();
    }
  };
  
  if (isEditing) {
    return (
      <div ref={containerRef} className="relative w-full">
        <input
          ref={editInputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            const newValue = e.target.value;
            setInputValue(newValue);
            editValueRef.current = newValue;
            setShowDropdown(true); // Show dropdown when typing
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
          className={`w-full px-2 py-1 border-2 border-blue-500 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
          onClick={(e) => {
            e.stopPropagation();
            setShowDropdown(true);
          }}
          placeholder="Type to search users..."
          autoComplete="off"
        />
        
        {showDropdown && enterpriseUsers.length > 0 && filteredUsers.length > 0 && (
          <div 
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-64 overflow-auto"
            onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking dropdown
          >
            <div className="py-1">
              {filteredUsers.map(user => {
                const userEmail = getUserEmail(user);
                const userName = getUserDisplay(user);
                const isExactMatch = userEmail.toLowerCase() === inputValue.toLowerCase() || 
                                    userName.toLowerCase() === inputValue.toLowerCase();
                
                return (
                  <button
                    key={user.id || userEmail}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input blur
                      handleUserSelect(user);
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors ${
                      isExactMatch ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{userName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{userEmail}</div>
                  </button>
                );
              })}
              {filteredUsers.length === 0 && inputValue.trim() && (
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  No users found. Press Enter to save "{inputValue}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div
      onClick={() => startEditing(task.id, 'responsibleParty', task.responsibleParty || '')}
      className={`px-2 py-1 cursor-text hover:bg-blue-50 dark:hover:bg-gray-700 rounded min-h-[1.5rem] flex items-center group transition-colors ${className}`}
      title="Click to edit or search for user"
    >
      <span className="flex-1">{task.responsibleParty || <span className="text-gray-400 italic">Click to edit</span>}</span>
      <PencilIcon className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
    </div>
  );
};

export default ResponsiblePartySelector;

