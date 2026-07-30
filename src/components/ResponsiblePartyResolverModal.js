import React, { useState, useEffect } from 'react';
import { XMarkIcon, CheckIcon, UserIcon } from '@heroicons/react/24/outline';

function ResponsiblePartyResolverModal({ 
  isOpen, 
  onClose, 
  mismatches, 
  enterpriseUsers, 
  onResolve 
}) {
  const [resolutions, setResolutions] = useState({});
  const [searchTerms, setSearchTerms] = useState({});

  // Initialize resolutions when modal opens
  useEffect(() => {
    if (isOpen && mismatches) {
      const initialResolutions = {};
      mismatches.forEach(mismatch => {
        initialResolutions[mismatch.original] = mismatch.suggestedMatch || null;
      });
      setResolutions(initialResolutions);
      setSearchTerms({});
    }
  }, [isOpen, mismatches]);

  // Find matching users for a given search term
  const findMatchingUsers = (searchTerm, excludeOriginal = null) => {
    if (!searchTerm || searchTerm.trim() === '') return [];
    
    const term = searchTerm.toLowerCase().trim();
    const matches = [];
    
    enterpriseUsers.forEach(user => {
      const displayName = (user.displayName || user.DisplayName || '').toLowerCase();
      const email = (user.mail || user.userPrincipalName || user.email || user.Email || '').toLowerCase();
      const original = excludeOriginal ? excludeOriginal.toLowerCase() : '';
      
      // Skip if this is the original value
      if (excludeOriginal && (displayName === original || email === original)) {
        return;
      }
      
      // Check if search term matches display name or email
      if (displayName.includes(term) || email.includes(term) || 
          displayName.startsWith(term) || email.startsWith(term)) {
        matches.push(user);
      }
    });
    
    // Sort by relevance (exact matches first, then starts with, then contains)
    matches.sort((a, b) => {
      const aDisplay = (a.displayName || a.DisplayName || '').toLowerCase();
      const bDisplay = (b.displayName || b.DisplayName || '').toLowerCase();
      const aEmail = (a.mail || a.userPrincipalName || a.email || a.Email || '').toLowerCase();
      const bEmail = (b.mail || b.userPrincipalName || b.email || b.Email || '').toLowerCase();
      
      const aExact = aDisplay === term || aEmail === term;
      const bExact = bDisplay === term || bEmail === term;
      if (aExact !== bExact) return aExact ? -1 : 1;
      
      const aStarts = aDisplay.startsWith(term) || aEmail.startsWith(term);
      const bStarts = bDisplay.startsWith(term) || bEmail.startsWith(term);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      
      return 0;
    });
    
    return matches.slice(0, 5); // Return top 5 matches
  };

  // Get suggested matches for a mismatch
  const getSuggestedMatches = (original) => {
    if (!original || original.trim() === '') return [];
    
    // First try exact match
    const exactMatch = enterpriseUsers.find(user => {
      const displayName = (user.displayName || user.DisplayName || '').toLowerCase();
      const email = (user.mail || user.userPrincipalName || user.email || user.Email || '').toLowerCase();
      const originalLower = original.toLowerCase();
      return displayName === originalLower || email === originalLower;
    });
    
    if (exactMatch) return [exactMatch];
    
    // Then try fuzzy matching
    return findMatchingUsers(original, original);
  };

  const handleSelectMatch = (original, user) => {
    setResolutions(prev => ({
      ...prev,
      [original]: user
    }));
  };


  const handleResolve = () => {
    // Validate that all mismatches have resolutions
    const unresolved = mismatches.filter(m => !resolutions[m.original]);
    if (unresolved.length > 0) {
      alert(`Please select a user for: ${unresolved.map(m => `"${m.original}"`).join(', ')}`);
      return;
    }
    
    console.log('ResponsiblePartyResolverModal: Resolving with resolutions:', resolutions);
    console.log('ResponsiblePartyResolverModal: Mismatches:', mismatches);
    onResolve(resolutions);
    onClose();
  };

  if (!isOpen || !mismatches || mismatches.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col transform transition-all duration-300 scale-100 animate-slideUp">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-orange-600 to-orange-700 dark:from-orange-800 dark:to-orange-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            <h3 className="text-lg font-bold">Resolve Responsible Party Mismatches</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-all duration-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto scrollbar-themed p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Some responsible party names don't match users in the system. Please select the correct user for each name, or skip to keep the original value.
          </p>
          
          <div className="space-y-4">
            {mismatches.map((mismatch, index) => {
              const original = mismatch.original;
              const selectedUser = resolutions[original];
              const searchTerm = searchTerms[original] || '';
              const suggestedMatches = searchTerm 
                ? findMatchingUsers(searchTerm, original)
                : getSuggestedMatches(original);

              return (
                <div 
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        "{original}"
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Found in {mismatch.taskTitle || 'task'}
                      </p>
                    </div>
                    {selectedUser && (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {selectedUser.displayName || selectedUser.DisplayName}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Search input */}
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Search for user..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerms(prev => ({
                        ...prev,
                        [original]: e.target.value
                      }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  {/* Suggested matches */}
                  {suggestedMatches.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Suggested matches:
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {suggestedMatches.map((user, userIndex) => {
                          const displayName = user.displayName || user.DisplayName || 'Unknown';
                          const email = user.mail || user.userPrincipalName || user.email || user.Email || '';
                          const isSelected = selectedUser && (
                            (selectedUser.mail || selectedUser.userPrincipalName || selectedUser.email || selectedUser.Email) === email
                          );

                          return (
                            <button
                              key={userIndex}
                              onClick={() => handleSelectMatch(original, user)}
                              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                                isSelected
                                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                                  : 'border-gray-200 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-700 bg-white dark:bg-gray-800'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isSelected 
                                  ? 'bg-orange-500 text-white' 
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                              }`}>
                                <UserIcon className="w-4 h-4" />
                              </div>
                              <div className="flex-1">
                                <p className={`font-medium ${
                                  isSelected 
                                    ? 'text-orange-700 dark:text-orange-300' 
                                    : 'text-gray-900 dark:text-white'
                                }`}>
                                  {displayName}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {email}
                                </p>
                              </div>
                              {isSelected && (
                                <CheckIcon className="w-5 h-5 text-orange-500" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-5 py-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            className="px-4 py-2 text-sm font-medium bg-orange-600 text-white hover:bg-orange-700 rounded-lg transition-all"
          >
            Apply Resolutions
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResponsiblePartyResolverModal;

