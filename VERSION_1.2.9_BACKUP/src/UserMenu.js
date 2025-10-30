import React, { useState } from 'react';
import { useAuth } from './Auth';

// Emoji icons
const EMOJI_ICONS = [
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
];

// Minimalistic icons - Outdoor activities, sports, and hobbies
const MINIMALISTIC_ICONS = [
  // Outdoor Activities
  { id: 'hiking', name: 'Hiking', icon: '🏔' },
  { id: 'camping', name: 'Camping', icon: '⛺' },
  { id: 'fishing', name: 'Fishing', icon: '🎣' },
  { id: 'gardening', name: 'Gardening', icon: '🌱' },
  { id: 'rock-climbing', name: 'Rock Climbing', icon: '🧗' },
  { id: 'surfing', name: 'Surfing', icon: '🏄' },
  { id: 'skiing', name: 'Skiing', icon: '⛷' },
  { id: 'snowboarding', name: 'Snowboarding', icon: '🏂' },
  { id: 'kayaking', name: 'Kayaking', icon: '🛶' },
  { id: 'biking', name: 'Biking', icon: '🚲' },
  
  // Sports
  { id: 'soccer-minimal', name: 'Soccer', icon: '⚽' },
  { id: 'basketball-minimal', name: 'Basketball', icon: '🏀' },
  { id: 'tennis-minimal', name: 'Tennis', icon: '🎾' },
  { id: 'volleyball', name: 'Volleyball', icon: '🏐' },
  { id: 'baseball-minimal', name: 'Baseball', icon: '⚾' },
  { id: 'rugby', name: 'Rugby', icon: '🏉' },
  { id: 'badminton', name: 'Badminton', icon: '🏸' },
  { id: 'table-tennis', name: 'Table Tennis', icon: '🏓' },
  { id: 'bowling', name: 'Bowling', icon: '🎳' },
  { id: 'archery', name: 'Archery', icon: '🏹' },
  
  // Hobbies & Activities
  { id: 'painting', name: 'Painting', icon: '🎨' },
  { id: 'photography', name: 'Photography', icon: '📸' },
  { id: 'cooking', name: 'Cooking', icon: '👨‍🍳' },
  { id: 'reading', name: 'Reading', icon: '📖' },
  { id: 'writing', name: 'Writing', icon: '✍️' },
  { id: 'music-minimal', name: 'Music', icon: '🎼' },
  { id: 'dancing', name: 'Dancing', icon: '💃' },
  { id: 'chess', name: 'Chess', icon: '♟️' },
  { id: 'puzzle', name: 'Puzzle', icon: '🧩' },
  { id: 'gaming', name: 'Gaming', icon: '🎮' },
  
  // Adventure & Travel
  { id: 'travel', name: 'Travel', icon: '✈️' },
  { id: 'compass', name: 'Compass', icon: '🧭' },
  { id: 'map', name: 'Map', icon: '🗺️' },
  { id: 'backpack', name: 'Backpack', icon: '🎒' },
  { id: 'binoculars', name: 'Binoculars', icon: '🔭' },
  { id: 'telescope', name: 'Telescope', icon: '🔭' },
  { id: 'camera-minimal', name: 'Camera', icon: '📷' },
  { id: 'video-camera', name: 'Video Camera', icon: '📹' },
  { id: 'drone', name: 'Drone', icon: '🚁' },
  
  // Nature & Environment
  { id: 'tree-minimal', name: 'Tree', icon: '🌲' },
  { id: 'flower-minimal', name: 'Flower', icon: '🌺' },
  { id: 'mountain-minimal', name: 'Mountain', icon: '⛰️' },
  { id: 'beach', name: 'Beach', icon: '🏖️' },
  { id: 'forest', name: 'Forest', icon: '🌲' },
  { id: 'desert', name: 'Desert', icon: '🏜️' },
  { id: 'waterfall', name: 'Waterfall', icon: '🌊' },
  { id: 'lake', name: 'Lake', icon: '🏞️' },
  { id: 'river', name: 'River', icon: '🌊' },
  
  // Weather & Elements
  { id: 'sun-minimal', name: 'Sun', icon: '☀️' },
  { id: 'moon-minimal', name: 'Moon', icon: '🌙' },
  { id: 'rain', name: 'Rain', icon: '🌧️' },
  { id: 'snow', name: 'Snow', icon: '❄️' },
  { id: 'cloud', name: 'Cloud', icon: '☁️' },
  { id: 'lightning', name: 'Lightning', icon: '⚡' },
  { id: 'wind', name: 'Wind', icon: '💨' },
  { id: 'fog', name: 'Fog', icon: '🌫️' },
  { id: 'rainbow-minimal', name: 'Rainbow', icon: '🌈' },
];

// Combined icons for backward compatibility
const PROFILE_ICONS = [...EMOJI_ICONS, ...MINIMALISTIC_ICONS];

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