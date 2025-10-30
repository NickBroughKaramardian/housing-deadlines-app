import React, { useState, useEffect } from 'react';
import { useAuth } from './Auth';
import { updateProfile, updatePassword } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import themeService from './themeService';
import notificationService from './notificationService';

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

function SettingsPage() {
  const { 
    user, 
    userProfile, 
    DEPARTMENTS, 
    DEPARTMENT_NAMES, 
    updateDepartmentFilter,
    isUserInDepartment,
    hasPermission,
    ROLES
  } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Theme and dark mode state
  const [currentTheme, setCurrentTheme] = useState('green');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [themes, setThemes] = useState({});
  
  // Profile icon state
  const [selectedIcon, setSelectedIcon] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconPickerTab, setIconPickerTab] = useState('emojis'); // 'emojis' or 'icons'
  
  // Notification settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationDays, setNotificationDays] = useState(1);
  const [notificationTime, setNotificationTime] = useState('09:00');
  const [notificationSound, setNotificationSound] = useState(true);
  
  // Department filter settings
  const [departmentFilterEnabled, setDepartmentFilterEnabled] = useState(false);
  

  
  // Department list settings
  const [showDepartmentList, setShowDepartmentList] = useState(false);
  const [users, setUsers] = useState([]);
  


  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setSelectedIcon(userProfile.profileIcon || '');
      setDepartmentFilterEnabled(userProfile.departmentFilterEnabled || false);
      
      // Load users if user is a developer
      if (hasPermission(ROLES.DEVELOPER)) {
        loadUsers();
      }
    }
  }, [userProfile, hasPermission, ROLES.DEVELOPER]);

  // Initialize theme and dark mode state from theme service
  useEffect(() => {
    setCurrentTheme(themeService.getCurrentTheme());
    setIsDarkMode(themeService.getDarkMode());
    setThemes(themeService.getThemes());
  }, []);



  // Load users function
  const loadUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('organizationId', '==', userProfile.organizationId));
      const querySnapshot = await getDocs(q);
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // Get users by department
  const getUsersByDepartment = (departmentId) => {
    return users.filter(user => 
      user.departments && user.departments.includes(departmentId)
    );
  };



  const handleDisplayNameUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      // Update in Firebase Auth
      await updateProfile(user, { displayName });
      
      // Update in Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { displayName });
      
      setMessage('Display name updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to update display name: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIconSelect = async (iconId) => {
    setSelectedIcon(iconId);
    setShowIconPicker(false);
    
    try {
      // Update in Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { profileIcon: iconId });
      
      setMessage('Profile icon updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to update profile icon: ' + err.message);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      await updatePassword(user, newPassword);
      setMessage('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to update password: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        notificationService.startChecking();
        setMessage('Notifications enabled!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError('Notification permission denied');
      }
    } catch (err) {
      setError('Failed to request notification permission: ' + err.message);
    }
  };

  const saveNotificationSettings = (enabled, days, time, sound) => {
    notificationService.saveNotificationSettings(enabled, days, time, sound);
    setMessage('Notification settings saved!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleNotificationToggle = (enabled) => {
    setNotificationsEnabled(enabled);
    if (enabled && Notification.permission !== 'granted') {
      requestNotificationPermission();
    } else {
      saveNotificationSettings(enabled, notificationDays, notificationTime, notificationSound);
    }
  };

  const handleThemeChange = (themeName) => {
    themeService.applyTheme(themeName);
    setCurrentTheme(themeName);
    setMessage('Theme updated!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDarkModeToggle = () => {
    const newDarkMode = !isDarkMode;
    themeService.applyDarkMode(newDarkMode);
    setIsDarkMode(newDarkMode);
    setMessage(newDarkMode ? 'Dark mode enabled!' : 'Light mode enabled!');
    setTimeout(() => setMessage(''), 3000);
  };

  const sendTestNotification = () => {
    notificationService.sendTestNotification();
  };

  const handleDepartmentFilterToggle = async (enabled) => {
    try {
      await updateDepartmentFilter(enabled);
      setDepartmentFilterEnabled(enabled);
      setMessage(enabled ? 'Department filter enabled!' : 'Department filter disabled!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError('Failed to update department filter: ' + error.message);
    }
  };



  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 lg:p-8">
      <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-3">
        <svg className="w-8 h-8 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Settings
      </h2>

      {message && (
        <div className="mb-6 p-4 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded-lg border border-green-200 dark:border-green-800">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {/* Profile Icon Selection */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile Icon
          </h3>
          
          <div className="flex items-center gap-4 mb-4">
            {/* Current Profile Icon Display */}
            <div className="relative">
              {selectedIcon ? (
                <div className="w-16 h-16 rounded-full bg-theme-primary flex items-center justify-center text-2xl text-white shadow-lg">
                  {PROFILE_ICONS.find(icon => icon.id === selectedIcon)?.icon || '👤'}
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-theme-primary flex items-center justify-center text-xl font-bold text-white shadow-lg">
                  {getInitials(displayName)}
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <p className="text-gray-700 dark:text-gray-300 font-medium">
                {selectedIcon ? 'Custom Icon Selected' : 'Using Initials'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedIcon 
                  ? PROFILE_ICONS.find(icon => icon.id === selectedIcon)?.name 
                  : `Shows "${getInitials(displayName)}" from your name`
                }
              </p>
            </div>
            
            <button
              onClick={() => setShowIconPicker(!showIconPicker)}
              className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors duration-200 font-medium"
            >
              {showIconPicker ? 'Close' : 'Choose Icon'}
            </button>
          </div>

          {/* Icon Picker Dropdown */}
          {showIconPicker && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4 shadow-lg">
              <div className="mb-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Choose an icon or use initials:</h4>
                <button
                  onClick={() => handleIconSelect('')}
                  className={`px-3 py-2 rounded-lg border-2 transition-all duration-200 ${
                    !selectedIcon 
                      ? 'border-theme-primary bg-theme-primary-light dark:bg-theme-primary-light text-theme-primary-dark' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-theme-primary'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-theme-primary flex items-center justify-center text-sm font-bold text-white">
                      {getInitials(displayName)}
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Use Initials</span>
                  </div>
                </button>
              </div>
              
              {/* Icon Picker Tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-600 mb-3">
                <button
                  onClick={() => setIconPickerTab('emojis')}
                  className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                    iconPickerTab === 'emojis'
                      ? 'text-theme-primary border-b-2 border-theme-primary'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Emojis
                </button>
                <button
                  onClick={() => setIconPickerTab('icons')}
                  className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                    iconPickerTab === 'icons'
                      ? 'text-theme-primary border-b-2 border-theme-primary'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Icons
                </button>
              </div>
              
              <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-8 gap-2 max-h-64 overflow-y-auto">
                {(iconPickerTab === 'emojis' ? EMOJI_ICONS : MINIMALISTIC_ICONS).map((icon) => (
                  <button
                    key={icon.id}
                    onClick={() => handleIconSelect(icon.id)}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                      selectedIcon === icon.id
                        ? 'border-theme-primary bg-theme-primary-light dark:bg-theme-primary-light shadow-md'
                        : 'border-gray-200 dark:border-gray-600 hover:border-theme-primary bg-white dark:bg-gray-700'
                    }`}
                    title={icon.name}
                  >
                    <div className="text-2xl">{icon.icon}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                      {icon.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            Dark Mode
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-700 dark:text-gray-300 font-medium">Enable Dark Mode</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Switch between light and dark themes</p>
            </div>
            <button
              onClick={handleDarkModeToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 ${
                isDarkMode ? 'bg-theme-primary' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  isDarkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>



        {/* Notification Settings */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.19 4.19A4 4 0 004 6v6a4 4 0 004 4h6a4 4 0 004-4V6a4 4 0 00-4-4H6a4 4 0 00-4.19.19z" />
            </svg>
            Desktop Notifications
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-700 dark:text-gray-300 font-medium">Enable Notifications</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Get notified about upcoming deadlines</p>
              </div>
              <button
                onClick={() => handleNotificationToggle(!notificationsEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 ${
                  notificationsEnabled ? 'bg-theme-primary' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {notificationsEnabled && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notify Days Before Deadline
                    </label>
                    <select
                      value={notificationDays}
                      onChange={(e) => {
                        const days = parseInt(e.target.value);
                        setNotificationDays(days);
                        saveNotificationSettings(notificationsEnabled, days, notificationTime, notificationSound);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    >
                      <option value={0}>Same day</option>
                      <option value={1}>1 day before</option>
                      <option value={2}>2 days before</option>
                      <option value={3}>3 days before</option>
                      <option value={7}>1 week before</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notification Time
                    </label>
                    <input
                      type="time"
                      value={notificationTime}
                      onChange={(e) => {
                        setNotificationTime(e.target.value);
                        saveNotificationSettings(notificationsEnabled, notificationDays, e.target.value, notificationSound);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-700 dark:text-gray-300 font-medium">Sound Notifications</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Play sound with notifications</p>
                  </div>
                  <button
                    onClick={() => {
                      const newSound = !notificationSound;
                      setNotificationSound(newSound);
                      saveNotificationSettings(notificationsEnabled, notificationDays, notificationTime, newSound);
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 ${
                      notificationSound ? 'bg-theme-primary' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                        notificationSound ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={sendTestNotification}
                    className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors duration-200 font-medium"
                  >
                    Send Test Notification
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Department Filter Settings */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Department Filter
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-700 dark:text-gray-300 font-medium">Show Only My Department's Tasks</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  When enabled, you'll only see tasks assigned to people in your department(s)
                </p>
              </div>
              <button
                onClick={() => handleDepartmentFilterToggle(!departmentFilterEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 ${
                  departmentFilterEnabled ? 'bg-theme-primary' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    departmentFilterEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            {/* Show user's departments */}
            {userProfile && userProfile.departments && userProfile.departments.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  Your Departments:
                </p>
                <div className="flex flex-wrap gap-2">
                  {userProfile.departments.map(deptId => (
                    <span
                      key={deptId}
                      className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full border border-blue-200 dark:border-blue-700"
                    >
                      {DEPARTMENT_NAMES[deptId]}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {(!userProfile.departments || userProfile.departments.length === 0) && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  You haven't been assigned to any departments yet. Contact an administrator to be assigned to departments.
                </p>
              </div>
            )}
          </div>
        </div>





        {/* Developer Settings - Department List */}
        {hasPermission(ROLES.DEVELOPER) && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Department Members
            </h3>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View all users organized by their assigned departments. This helps you understand how department mappings affect task assignments.
              </p>
              
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium text-gray-700 dark:text-gray-300">Department Breakdown</h4>
                <button
                  onClick={() => setShowDepartmentList(!showDepartmentList)}
                  className="px-3 py-1.5 text-sm font-medium text-theme-primary bg-theme-primary/10 rounded-lg hover:bg-theme-primary/20 transition-colors"
                >
                  {showDepartmentList ? 'Hide Details' : 'Show Details'}
                </button>
              </div>
              
              {/* Department Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(DEPARTMENTS).map(([key, deptId]) => {
                  const departmentUsers = getUsersByDepartment(deptId);
                  return (
                    <div key={deptId} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className={`font-semibold text-sm ${
                          deptId === DEPARTMENTS.DEVELOPMENT ? 'text-blue-600 dark:text-blue-400' :
                          deptId === DEPARTMENTS.ACCOUNTING ? 'text-green-600 dark:text-green-400' :
                          deptId === DEPARTMENTS.COMPLIANCE ? 'text-purple-600 dark:text-purple-400' :
                          'text-yellow-600 dark:text-yellow-400'
                        }`}>
                          {DEPARTMENT_NAMES[deptId]}
                        </h5>
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">
                          {departmentUsers.length}
                        </span>
                      </div>
                      
                      {showDepartmentList && (
                        <div className="space-y-2">
                          {departmentUsers.length === 0 ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                              No users assigned
                            </p>
                          ) : (
                            departmentUsers.map(user => (
                              <div key={user.id} className="flex items-center gap-2 text-xs">
                                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-400 font-medium">
                                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : '?'}
                                </div>
                                <span className="text-gray-700 dark:text-gray-300 truncate">
                                  {user.displayName || user.email}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Users Not Assigned to Any Department */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-semibold text-sm text-gray-600 dark:text-gray-400">
                    Unassigned Users
                  </h5>
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">
                    {users.filter(user => !user.departments || user.departments.length === 0).length}
                  </span>
                </div>
                
                {showDepartmentList && (
                  <div className="space-y-2">
                    {users.filter(user => !user.departments || user.departments.length === 0).length === 0 ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                        All users are assigned to departments
                      </p>
                    ) : (
                      users.filter(user => !user.departments || user.departments.length === 0).map(user => (
                        <div key={user.id} className="flex items-center gap-2 text-xs">
                          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-400 font-medium">
                            {user.displayName ? user.displayName.charAt(0).toUpperCase() : '?'}
                          </div>
                          <span className="text-gray-700 dark:text-gray-300 truncate">
                            {user.displayName || user.email}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Profile Settings */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile Settings
          </h3>
          
          <form onSubmit={handleDisplayNameUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                placeholder="Enter your display name"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors duration-200 font-medium disabled:opacity-50"
            >
              {isLoading ? 'Updating...' : 'Update Display Name'}
            </button>
          </form>
        </div>

        {/* Password Change */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Change Password
          </h3>
          
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                placeholder="Enter new password"
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                placeholder="Confirm new password"
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !newPassword || !confirmPassword}
              className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors duration-200 font-medium disabled:opacity-50"
            >
              {isLoading ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>
        
        {/* Version Number - Subtle display at bottom */}
        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Version v.{process.env.REACT_APP_VERSION || require('../package.json').version}
            </p>
          </div>
        </div>
      </div>


    </div>
  );
}

export default SettingsPage; 