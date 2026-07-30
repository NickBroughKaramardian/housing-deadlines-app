import React, { useState, useEffect, useCallback } from 'react';
import { XMarkIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

const weekdays = [
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
  { label: 'Sunday', value: 'sunday' }
];

function RecurrenceSelector({ isOpen, onClose, onDone, initialTask }) {
  const [pattern, setPattern] = useState('none');
  const [interval, setInterval] = useState(1);
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  const [endType, setEndType] = useState('never'); // 'never', 'date', 'occurrences'
  const [endDate, setEndDate] = useState('');
  const [maxOccurrences, setMaxOccurrences] = useState(10);

  // Get day of month from initial task's deadline
  const getDayOfMonth = useCallback(() => {
    if (!initialTask) return null;
    const deadline = initialTask.deadline_date || initialTask.deadline || initialTask.Deadline;
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
  }, [initialTask]);

  useEffect(() => {
    if (isOpen && initialTask) {
      // Reset to defaults when opening
      setPattern('none');
      setInterval(1);
      setDaysOfWeek([]);
      setEndType('never');
      setEndDate('');
      setMaxOccurrences(10);
    }
  }, [isOpen, initialTask]);

  const handleDayToggle = (dayValue) => {
    setDaysOfWeek(prev => 
      prev.includes(dayValue)
        ? prev.filter(d => d !== dayValue)
        : [...prev, dayValue]
    );
  };

  const [isProcessing, setIsProcessing] = useState(false);

  const handleDone = () => {
    // CRITICAL: Prevent double execution
    if (isProcessing) {
      console.warn('RecurrenceSelector: handleDone already processing, ignoring duplicate call');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      if (pattern === 'none') {
        onDone(null);
        return;
      }

      // For monthly, use the day from the initial task's deadline
      let dayOfMonthValue = null;
      if (pattern === 'monthly') {
        dayOfMonthValue = getDayOfMonth();
      }
      
      const recurrence = {
        pattern,
        interval: parseInt(interval) || 1,
        daysOfWeek: pattern === 'weekly' ? daysOfWeek : [],
        dayOfMonth: dayOfMonthValue,
        endDate: endType === 'date' ? endDate : null,
        maxOccurrences: endType === 'occurrences' ? parseInt(maxOccurrences) : null
      };

      onDone(recurrence);
    } finally {
      // Reset after a short delay to allow the modal to close
      setTimeout(() => setIsProcessing(false), 1000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col transform transition-all duration-300 scale-100 animate-slideUp">
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <CalendarDaysIcon className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold">
              {initialTask?.title ? `Repeat: ${initialTask.title}` : 'Repeat Task'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all duration-200"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-themed p-6 space-y-6">
          {/* Pattern Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Repeat Pattern
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { value: 'none', label: 'No Repeat', icon: '🚫' },
                { value: 'daily', label: 'Daily', icon: '📅' },
                { value: 'weekly', label: 'Weekly', icon: '📆' },
                { value: 'monthly', label: 'Monthly', icon: '🗓️' },
                { value: 'yearly', label: 'Yearly', icon: '📊' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPattern(opt.value)}
                  className={`px-4 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                    pattern === opt.value
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50 scale-105'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-md'
                  }`}
                >
                  <div className="text-2xl mb-1">{opt.icon}</div>
                  <div className="text-sm">{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Interval */}
          {pattern !== 'none' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Every {pattern === 'daily' ? 'day(s)' : pattern === 'weekly' ? 'week(s)' : pattern === 'monthly' ? 'month(s)' : 'year(s)'}
              </label>
              {pattern === 'monthly' ? (
                <div className="grid grid-cols-6 gap-2">
                  {Array.from({length: 11}, (_, i) => i + 1).map(num => (
                    <button
                      key={num}
                      onClick={() => setInterval(num)}
                      className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-110 ${
                        interval === num
                          ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50 scale-105'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-md'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              ) : pattern === 'yearly' ? (
                <div className="grid grid-cols-6 gap-2">
                  {Array.from({length: 10}, (_, i) => i + 1).map(num => (
                    <button
                      key={num}
                      onClick={() => setInterval(num)}
                      className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-110 ${
                        interval === num
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
                  value={interval}
                  onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              )}
            </div>
          )}

          {/* Weekly: Days of Week */}
          {pattern === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Repeat on
              </label>
              <div className="grid grid-cols-7 gap-2">
                {weekdays.map(day => (
                  <button
                    key={day.value}
                    onClick={() => handleDayToggle(day.value)}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-110 ${
                      daysOfWeek.includes(day.value)
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50 scale-105'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-md'
                    }`}
                  >
                    {day.label.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}


          {/* End Recurrence Options */}
          {pattern !== 'none' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                End Recurrence
              </label>
              <div className="space-y-2">
                <label className={`group flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  endType === 'never'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md shadow-blue-500/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                }`}>
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                    endType === 'never'
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-400 dark:border-gray-500 group-hover:border-blue-400'
                  }`}>
                    {endType === 'never' && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <span className={`text-sm font-semibold block ${endType === 'never' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                      Never
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 block">Continues indefinitely</span>
                  </div>
                  <input
                    type="radio"
                    name="endType"
                    value="never"
                    checked={endType === 'never'}
                    onChange={(e) => setEndType(e.target.value)}
                    className="sr-only"
                  />
                </label>
                <label className={`group flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  endType === 'date'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md shadow-blue-500/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                }`}>
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                    endType === 'date'
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-400 dark:border-gray-500 group-hover:border-blue-400'
                  }`}>
                    {endType === 'date' && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <span className={`text-sm font-semibold block ${endType === 'date' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                      End Date
                    </span>
                  </div>
                  {endType === 'date' && (
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <input
                    type="radio"
                    name="endType"
                    value="date"
                    checked={endType === 'date'}
                    onChange={(e) => setEndType(e.target.value)}
                    className="sr-only"
                  />
                </label>
                <label className={`group flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  endType === 'occurrences'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md shadow-blue-500/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                }`}>
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                    endType === 'occurrences'
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-400 dark:border-gray-500 group-hover:border-blue-400'
                  }`}>
                    {endType === 'occurrences' && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <span className={`text-sm font-semibold block ${endType === 'occurrences' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                      After Occurrences
                    </span>
                  </div>
                  {endType === 'occurrences' && (
                    <input
                      type="number"
                      min="1"
                      value={maxOccurrences}
                      onChange={(e) => setMaxOccurrences(parseInt(e.target.value) || 10)}
                      className="px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm w-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <input
                    type="radio"
                    name="endType"
                    value="occurrences"
                    checked={endType === 'occurrences'}
                    onChange={(e) => setEndType(e.target.value)}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-all duration-200 transform hover:scale-105"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-blue-500/50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default RecurrenceSelector;

