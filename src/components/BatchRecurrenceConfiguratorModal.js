import React, { useState, useEffect } from 'react';
import { XMarkIcon, CheckIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

const weekdays = [
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
  { label: 'Sunday', value: 'sunday' }
];

function BatchRecurrenceConfiguratorModal({ 
  isOpen, 
  onClose, 
  recurringTasks, 
  onResolve 
}) {
  const [recurrenceSettings, setRecurrenceSettings] = useState({});

  // Initialize recurrence settings when modal opens
  useEffect(() => {
    if (isOpen && recurringTasks) {
      const initialSettings = {};
      recurringTasks.forEach((task, index) => {
        initialSettings[index] = {
          pattern: 'none',
          interval: 1,
          daysOfWeek: [],
          endType: 'never',
          endDate: '',
          maxOccurrences: 10
        };
      });
      setRecurrenceSettings(initialSettings);
    }
  }, [isOpen, recurringTasks]);

  // Get day of month from task's deadline
  const getDayOfMonth = (task) => {
    if (!task) return null;
    const deadline = task.deadline_date || task.deadline || task.Deadline;
    if (!deadline) return null;
    try {
      // Use parseDeadlineDate to avoid timezone issues
      const { parseDeadlineDate } = require('../utils/taskHelpers');
      const deadlineDate = parseDeadlineDate(deadline);
      if (!deadlineDate) return null;
      return deadlineDate.getDate(); // Get day of month (1-31)
    } catch (e) {
      return null;
    }
  };

  const updateRecurrenceSetting = (taskIndex, field, value) => {
    setRecurrenceSettings(prev => ({
      ...prev,
      [taskIndex]: {
        ...prev[taskIndex],
        [field]: value
      }
    }));
  };

  const handleDayToggle = (taskIndex, dayValue) => {
    const currentDays = recurrenceSettings[taskIndex]?.daysOfWeek || [];
    const newDays = currentDays.includes(dayValue)
      ? currentDays.filter(d => d !== dayValue)
      : [...currentDays, dayValue];
    updateRecurrenceSetting(taskIndex, 'daysOfWeek', newDays);
  };

  const handleResolve = () => {
    // Convert settings to recurrence objects
    const resolutions = {};
    recurringTasks.forEach((task, index) => {
      const setting = recurrenceSettings[index];
      if (!setting || setting.pattern === 'none') {
        resolutions[task._batchIndex] = null;
      } else {
        const recurrence = {
          pattern: setting.pattern,
          interval: parseInt(setting.interval) || 1,
          daysOfWeek: setting.pattern === 'weekly' ? setting.daysOfWeek : [],
          dayOfMonth: setting.pattern === 'monthly' ? getDayOfMonth(task) : null,
          endDate: setting.endType === 'date' ? setting.endDate : null,
          maxOccurrences: setting.endType === 'occurrences' ? parseInt(setting.maxOccurrences) : null
        };
        resolutions[task._batchIndex] = recurrence;
      }
    });
    
    onResolve(resolutions);
    onClose();
  };

  if (!isOpen || !recurringTasks || recurringTasks.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col transform transition-all duration-300 scale-100 animate-slideUp">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="w-5 h-5" />
            <h3 className="text-lg font-bold">Configure Recurring Tasks</h3>
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
            Configure recurrence settings for each recurring task. Scroll down to see all tasks.
          </p>
          
          <div className="space-y-6">
            {recurringTasks.map((task, taskIndex) => {
              const setting = recurrenceSettings[taskIndex] || {
                pattern: 'none',
                interval: 1,
                daysOfWeek: [],
                endType: 'never',
                endDate: '',
                maxOccurrences: 10
              };

              return (
                <div 
                  key={taskIndex}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50"
                >
                  <div className="mb-4">
                    <p className="font-semibold text-gray-900 dark:text-white text-lg">
                      {task.title || 'Untitled Task'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Deadline: {task.deadline_date || 'Not set'}
                    </p>
                  </div>

                  {/* Pattern Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Repeat Pattern
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { value: 'none', label: 'No Repeat', icon: '🚫' },
                        { value: 'daily', label: 'Daily', icon: '📅' },
                        { value: 'weekly', label: 'Weekly', icon: '📆' },
                        { value: 'monthly', label: 'Monthly', icon: '🗓️' },
                        { value: 'yearly', label: 'Yearly', icon: '📊' }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => updateRecurrenceSetting(taskIndex, 'pattern', opt.value)}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                            setting.pattern === opt.value
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          <div className="text-lg mb-1">{opt.icon}</div>
                          <div>{opt.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Interval */}
                  {setting.pattern !== 'none' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Every {setting.pattern === 'daily' ? 'day(s)' : setting.pattern === 'weekly' ? 'week(s)' : setting.pattern === 'monthly' ? 'month(s)' : 'year(s)'}
                      </label>
                      {setting.pattern === 'monthly' ? (
                        <div className="grid grid-cols-6 gap-2">
                          {Array.from({length: 11}, (_, i) => i + 1).map(num => (
                            <button
                              key={num}
                              onClick={() => updateRecurrenceSetting(taskIndex, 'interval', num)}
                              className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-110 ${
                                setting.interval === num
                                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50 scale-105'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-md'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      ) : setting.pattern === 'yearly' ? (
                        <div className="grid grid-cols-6 gap-2">
                          {Array.from({length: 10}, (_, i) => i + 1).map(num => (
                            <button
                              key={num}
                              onClick={() => updateRecurrenceSetting(taskIndex, 'interval', num)}
                              className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-110 ${
                                setting.interval === num
                                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50 scale-105'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-md'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <input
                          type="number"
                          min="1"
                          value={setting.interval}
                          onChange={(e) => updateRecurrenceSetting(taskIndex, 'interval', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                        />
                      )}
                    </div>
                  )}

                  {/* Weekly: Days of Week */}
                  {setting.pattern === 'weekly' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Repeat on
                      </label>
                      <div className="grid grid-cols-7 gap-2">
                        {weekdays.map(day => (
                          <button
                            key={day.value}
                            onClick={() => handleDayToggle(taskIndex, day.value)}
                            className={`px-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                              setting.daysOfWeek.includes(day.value)
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {day.label.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}


                  {/* End Recurrence Options */}
                  {setting.pattern !== 'none' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        End Recurrence
                      </label>
                      <div className="space-y-2">
                        <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          setting.endType === 'never'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                        }`}>
                          <input
                            type="radio"
                            name={`endType-${taskIndex}`}
                            value="never"
                            checked={setting.endType === 'never'}
                            onChange={(e) => updateRecurrenceSetting(taskIndex, 'endType', e.target.value)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Never</span>
                        </label>
                        <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          setting.endType === 'date'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                        }`}>
                          <input
                            type="radio"
                            name={`endType-${taskIndex}`}
                            value="date"
                            checked={setting.endType === 'date'}
                            onChange={(e) => updateRecurrenceSetting(taskIndex, 'endType', e.target.value)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">End Date</span>
                          {setting.endType === 'date' && (
                            <input
                              type="date"
                              value={setting.endDate}
                              onChange={(e) => updateRecurrenceSetting(taskIndex, 'endDate', e.target.value)}
                              className="px-2 py-1 border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                            />
                          )}
                        </label>
                        <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          setting.endType === 'occurrences'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                        }`}>
                          <input
                            type="radio"
                            name={`endType-${taskIndex}`}
                            value="occurrences"
                            checked={setting.endType === 'occurrences'}
                            onChange={(e) => updateRecurrenceSetting(taskIndex, 'endType', e.target.value)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">After Occurrences</span>
                          {setting.endType === 'occurrences' && (
                            <input
                              type="number"
                              min="1"
                              value={setting.maxOccurrences}
                              onChange={(e) => updateRecurrenceSetting(taskIndex, 'maxOccurrences', parseInt(e.target.value) || 10)}
                              className="px-2 py-1 border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm w-20"
                            />
                          )}
                        </label>
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
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-all"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default BatchRecurrenceConfiguratorModal;

