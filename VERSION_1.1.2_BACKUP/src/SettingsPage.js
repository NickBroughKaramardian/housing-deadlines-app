import React, { useState, useEffect } from 'react';
import { useAuth } from './Auth';
import { updateProfile, updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import themeService from './themeService';
import notificationService from './notificationService';

// Profile icon options
const PROFILE_ICONS = [
  // Sports
  { id: 'soccer', name: 'Soccer Ball', icon: '⚽' },
  { id: 'basketball', name: 'Basketball', icon: '🏀' },
  { id: 'football', name: 'Football', icon: '🏈' },
  { id: 'baseball', name: 'Baseball', icon: '⚾' },
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

function SettingsPage() {
  const { user, userProfile } = useAuth();
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
  
  // Notification settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationDays, setNotificationDays] = useState(1);
  const [notificationTime, setNotificationTime] = useState('09:00');
  const [notificationSound, setNotificationSound] = useState(true);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setSelectedIcon(userProfile.profileIcon || '');
    }
    
    // Load theme settings
    setCurrentTheme(themeService.getCurrentTheme());
    setIsDarkMode(themeService.getDarkMode());
    setThemes(themeService.getThemes());
    
    // Load notification settings
    const settings = notificationService.getNotificationSettings();
    setNotificationsEnabled(settings.enabled);
    setNotificationDays(settings.days);
    setNotificationTime(settings.time);
    setNotificationSound(settings.sound);
  }, [userProfile]);

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
              
              <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-8 gap-2 max-h-64 overflow-y-auto">
                {PROFILE_ICONS.map((icon) => (
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

        {/* Theme Selection */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
            </svg>
            Theme Colors
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(themes).map(([key, theme]) => {
              const preview = themeService.getThemePreview(key);
              return (
                <button
                  key={key}
                  onClick={() => handleThemeChange(key)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                    currentTheme === key
                      ? 'border-theme-primary bg-theme-primary-light dark:bg-theme-primary-light'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-theme-primary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-700 shadow-sm"
                      style={{ backgroundColor: preview?.primary }}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {theme.name}
                    </span>
                  </div>
                </button>
              );
            })}
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