import React, { useState } from 'react';
import { useAuth } from './Auth';

// Profile icon options (same as in SettingsPage)
const PROFILE_ICONS = [
  // Sports
  { id: 'soccer', name: 'Soccer Ball', icon: '⚽' },
  { id: 'basketball', name: 'Basketball', icon: '🏀' },
  { id: 'football', name: 'Football', icon: '🏈' },
  { id: 'tennis', name: 'Tennis', icon: '🎾' },
  { id: 'golf', name: 'Golf', icon: '⛳' },
  { id: 'swimming', name: 'Swimming', icon: '🏊' },
  { id: 'cycling', name: 'Cycling', icon: '🚴' },
  { id: 'running', name: 'Running', icon: '🏃' },
  { id: 'yoga', name: 'Yoga', icon: '🧘' },
  
  // Nature
  { id: 'tree', name: 'Tree', icon: '🌳' },
  { id: 'flower', name: 'Flower', icon: '🌸' },
  { id: 'mountain', name: 'Mountain', icon: '🏔️' },
  { id: 'ocean', name: 'Ocean', icon: '🌊' },
  { id: 'sun', name: 'Sun', icon: '☀️' },
  { id: 'moon', name: 'Moon', icon: '🌙' },
  { id: 'star', name: 'Star', icon: '⭐' },
  { id: 'rainbow', name: 'Rainbow', icon: '🌈' },
  { id: 'leaf', name: 'Leaf', icon: '🍃' },
  { id: 'rocket', name: 'Rocket', icon: '🚀' },
  
  // Animals
  { id: 'cat', name: 'Cat', icon: '🐱' },
  { id: 'dog', name: 'Dog', icon: '🐕' },
  { id: 'bird', name: 'Bird', icon: '🐦' },
  { id: 'fish', name: 'Fish', icon: '🐠' },
  { id: 'butterfly', name: 'Butterfly', icon: '🦋' },
  { id: 'dragon', name: 'Dragon', icon: '🐉' },
  { id: 'unicorn', name: 'Unicorn', icon: '🦄' },
  { id: 'penguin', name: 'Penguin', icon: '🐧' },
  { id: 'owl', name: 'Owl', icon: '🦉' },
  
  // Objects
  { id: 'book', name: 'Book', icon: '📚' },
  { id: 'music', name: 'Music', icon: '🎵' },
  { id: 'camera', name: 'Camera', icon: '📷' },
  { id: 'heart', name: 'Heart', icon: '❤️' },
  { id: 'diamond', name: 'Diamond', icon: '💎' },
  { id: 'crown', name: 'Crown', icon: '👑' },
  { id: 'trophy', name: 'Trophy', icon: '🏆' },
  { id: 'lightbulb', name: 'Lightbulb', icon: '💡' },
  { id: 'fire', name: 'Fire', icon: '🔥' },
  
  // Minimalistic geometric shapes
  { id: 'circle', name: 'Circle', icon: '●' },
  { id: 'square', name: 'Square', icon: '■' },
  { id: 'triangle', name: 'Triangle', icon: '▲' },
  { id: 'diamond-shape', name: 'Diamond', icon: '◆' },
  { id: 'star-minimal', name: 'Star', icon: '★' },
  { id: 'heart-minimal', name: 'Heart', icon: '♥' },
  { id: 'sun-minimal', name: 'Sun', icon: '☉' },
  { id: 'moon-minimal', name: 'Moon', icon: '☾' },
  { id: 'cross', name: 'Cross', icon: '✚' },
  { id: 'plus', name: 'Plus', icon: '✚' },
  { id: 'minus', name: 'Minus', icon: '−' },
  { id: 'times', name: 'Times', icon: '×' },
  { id: 'divide', name: 'Divide', icon: '÷' },
  { id: 'check', name: 'Check', icon: '✓' },
  { id: 'x-mark', name: 'X Mark', icon: '✗' },
  { id: 'arrow-up', name: 'Arrow Up', icon: '↑' },
  { id: 'arrow-down', name: 'Arrow Down', icon: '↓' },
  { id: 'arrow-left', name: 'Arrow Left', icon: '←' },
  { id: 'arrow-right', name: 'Arrow Right', icon: '→' },
];

export default function UserMenu() {
  const { userProfile, signOutUser, DEPARTMENT_NAMES } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getProfileIcon = () => {
    if (userProfile?.profileIcon) {
      const icon = PROFILE_ICONS.find(icon => icon.id === userProfile.profileIcon);
      return icon ? icon.icon : null;
    }
    return null;
  };

  const getProfileDisplay = () => {
    const icon = getProfileIcon();
    if (icon) {
      return (
        <div className="w-8 h-8 rounded-full bg-theme-primary flex items-center justify-center text-lg text-white shadow-sm aspect-square">
          {icon}
        </div>
      );
    } else {
      return (
        <div className="w-8 h-8 rounded-full bg-theme-primary flex items-center justify-center text-sm font-bold text-white shadow-sm aspect-square">
          {getInitials(userProfile?.displayName)}
        </div>
      );
    }
  };

  const getDepartmentDisplay = () => {
    if (!userProfile?.departments || userProfile.departments.length === 0) {
      return null;
    }
    
    if (userProfile.departments.length === 1) {
      const departmentId = userProfile.departments[0];
      return DEPARTMENT_NAMES[departmentId] || departmentId;
    } else {
      return 'Multiple Departments';
    }
  };

  if (!userProfile) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
      >
        {getProfileDisplay()}
        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-50"
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-3">
              {getProfileDisplay()}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {userProfile.displayName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {userProfile.email}
                </p>
                <p className="text-xs text-theme-primary font-medium capitalize">
                  {userProfile.role === 'developer' ? 'Developer' : userProfile.role}
                </p>
                {getDepartmentDisplay() && (
                  <p className="text-xs text-gray-600 dark:text-gray-500 font-medium">
                    {getDepartmentDisplay()}
                  </p>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={signOutUser}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
} 