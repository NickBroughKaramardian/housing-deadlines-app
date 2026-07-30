import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { XMarkIcon, PlusIcon, ArrowPathIcon, CalendarIcon } from '@heroicons/react/24/outline';
import MultiResponsiblePartySelector from './MultiResponsiblePartySelector';

const weekdays = [
  { label: 'Mon', value: 'monday', short: 'M' },
  { label: 'Tue', value: 'tuesday', short: 'T' },
  { label: 'Wed', value: 'wednesday', short: 'W' },
  { label: 'Thu', value: 'thursday', short: 'T' },
  { label: 'Fri', value: 'friday', short: 'F' },
  { label: 'Sat', value: 'saturday', short: 'S' },
  { label: 'Sun', value: 'sunday', short: 'S' }
];

function AddTaskModal({ 
  isOpen, 
  onClose, 
  onSave, 
  enterpriseUsers,
  editInputRef,
  editValueRef,
  saveEdit,
  startEditing,
  moveToNextCell
}) {
  const [taskType, setTaskType] = useState('single'); // 'single' or 'recurring'
  
  // Task fields
  const [title, setTitle] = useState('');
  const [project, setProject] = useState('');
  const [deadline, setDeadline] = useState('');
  const [responsibleParty, setResponsibleParty] = useState('');
  
  // Recurrence fields (only for recurring tasks)
  const [pattern, setPattern] = useState('daily');
  const [interval, setInterval] = useState(1);
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  const [endType, setEndType] = useState('never'); // 'never', 'date', 'occurrences'
  const [endDate, setEndDate] = useState('');
  const [maxOccurrences, setMaxOccurrences] = useState(10);
  
  // Editing state for responsible party - use local refs if not provided
  const localEditInputRef = useRef(null);
  const localEditValueRef = useRef(null);
  const actualEditInputRef = editInputRef || localEditInputRef;
  const actualEditValueRef = editValueRef || localEditValueRef;
  const [editingCell, setEditingCell] = useState(null);
  const titleInputRef = useRef(null);
  
  // Create a temporary task object for MultiResponsiblePartySelector
  const tempTask = useMemo(() => ({
    id: 'new-task',
    responsibleParty: responsibleParty
  }), [responsibleParty]);
  
  // Reset editing state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEditingCell(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Reset all fields when modal opens
      setTaskType('single');
      setTitle('');
      setProject('');
      setDeadline('');
      setResponsibleParty('');
      setPattern('daily');
      setInterval(1);
      setDaysOfWeek([]);
      setEndType('never');
      setEndDate('');
      setMaxOccurrences(10);
      setEditingCell(null);
      // Focus title input after a brief delay
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleDayToggle = (dayValue) => {
    setDaysOfWeek(prev => 
      prev.includes(dayValue)
        ? prev.filter(d => d !== dayValue)
        : [...prev, dayValue]
    );
  };

  // Handle responsible party save
  const handleResponsiblePartySave = useCallback(() => {
    const value = actualEditValueRef.current || responsibleParty;
    setResponsibleParty(value);
  }, [responsibleParty, actualEditValueRef]);

  const handleSave = () => {
    // Validation
    if (!title.trim()) {
      alert('Please enter a task title');
      return;
    }
    if (!deadline) {
      alert('Please select a deadline');
      return;
    }
    if (taskType === 'recurring' && pattern === 'weekly' && daysOfWeek.length === 0) {
      alert('Please select at least one day of the week');
      return;
    }
    
    // Get final responsible party value from ref or state
    const finalResponsibleParty = actualEditValueRef.current || responsibleParty;

    const taskData = {
      title: title.trim(),
      project: project.trim() || 'Unassigned',
      deadline_date: deadline,
      responsibleParty: finalResponsibleParty || '',
      completed: false
    };

    if (taskType === 'recurring') {
      // For monthly, extract day from deadline
      let dayOfMonthValue = null;
      if (pattern === 'monthly' && deadline) {
        try {
          const deadlineDate = new Date(deadline);
          dayOfMonthValue = deadlineDate.getDate(); // Get day of month (1-31)
        } catch (e) {
          console.error('Error parsing deadline for monthly recurrence:', e);
        }
      }
      
      // Build recurrence object
      const recurrence = {
        pattern,
        interval: parseInt(interval) || 1,
        daysOfWeek: pattern === 'weekly' ? daysOfWeek : [],
        dayOfMonth: dayOfMonthValue,
        endDate: endType === 'date' ? endDate : null,
        maxOccurrences: endType === 'occurrences' ? parseInt(maxOccurrences) : null
      };
      taskData.recurrence = recurrence;
    }

    onSave(taskData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col transform transition-all duration-300 scale-100 animate-slideUp">
        {/* Compact Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            <h3 className="text-lg font-bold">
              Add {taskType === 'recurring' ? 'Recurring' : 'Single'} Task
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {/* Task Type Toggle */}
            <div className="flex items-center gap-1 bg-white/20 rounded-lg p-1">
              <button
                onClick={() => setTaskType('single')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  taskType === 'single'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Single
              </button>
              <button
                onClick={() => setTaskType('recurring')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  taskType === 'recurring'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Recurring
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-all duration-200"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Basic Task Fields - Compact Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Task Title <span className="text-red-500">*</span>
              </label>
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Project
              </label>
              <input
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="Enter project name"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Deadline <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Responsible Party
              </label>
              <div className="relative">
                <MultiResponsiblePartySelector
                  task={tempTask}
                  className="text-sm"
                  editingCell={editingCell}
                  enterpriseUsers={enterpriseUsers}
                  editInputRef={actualEditInputRef}
                  editValueRef={actualEditValueRef}
                  saveEdit={handleResponsiblePartySave}
                  startEditing={() => {
                    setEditingCell({ taskId: 'new-task', field: 'responsibleParty' });
                  }}
                  moveToNextCell={null}
                />
              </div>
            </div>
          </div>

          {/* Recurrence Options - Compact Design */}
          {taskType === 'recurring' && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <ArrowPathIcon className="w-4 h-4" />
                <span>Recurrence</span>
              </div>

              {/* Pattern Selection - Compact */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pattern
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'daily', label: 'Daily', icon: '📅' },
                    { value: 'weekly', label: 'Weekly', icon: '📆' },
                    { value: 'monthly', label: 'Monthly', icon: '🗓️' },
                    { value: 'yearly', label: 'Yearly', icon: '📊' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setPattern(opt.value);
                        if (opt.value !== 'weekly') setDaysOfWeek([]);
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        pattern === opt.value
                          ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <div className="text-lg mb-0.5">{opt.icon}</div>
                      <div>{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interval and Days - Side by Side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Every {pattern === 'daily' ? 'day(s)' : pattern === 'weekly' ? 'week(s)' : pattern === 'monthly' ? 'month(s)' : 'year(s)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={interval}
                    onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                {/* Weekly: Days of Week - Compact */}
                {pattern === 'weekly' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Days <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-1.5 flex-wrap">
                      {weekdays.map(day => (
                        <button
                          key={day.value}
                          onClick={() => handleDayToggle(day.value)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            daysOfWeek.includes(day.value)
                              ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          title={day.label}
                        >
                          {day.short}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Monthly: Info */}
              {pattern === 'monthly' && (
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <span className="font-semibold">Note:</span> Repeats on day {deadline ? new Date(deadline).getDate() : 'X'} of each month. 
                    If unavailable, uses the last day of that month.
                  </p>
                </div>
              )}

              {/* End Recurrence - Compact Radio Buttons */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  End Recurrence
                </label>
                <div className="space-y-1.5">
                  <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    endType === 'never'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}>
                    <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      endType === 'never'
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-gray-400 dark:border-gray-500'
                    }`}>
                      {endType === 'never' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Never</span>
                    <input
                      type="radio"
                      name="endType"
                      value="never"
                      checked={endType === 'never'}
                      onChange={(e) => setEndType(e.target.value)}
                      className="sr-only"
                    />
                  </label>
                  <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    endType === 'date'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}>
                    <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      endType === 'date'
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-gray-400 dark:border-gray-500'
                    }`}>
                      {endType === 'date' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex-1">End Date</span>
                    {endType === 'date' && (
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-2 py-1 text-xs border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
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
                  <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    endType === 'occurrences'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}>
                    <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      endType === 'occurrences'
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-gray-400 dark:border-gray-500'
                    }`}>
                      {endType === 'occurrences' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex-1">After</span>
                    {endType === 'occurrences' && (
                      <input
                        type="number"
                        min="1"
                        value={maxOccurrences}
                        onChange={(e) => setMaxOccurrences(parseInt(e.target.value) || 10)}
                        className="px-2 py-1 text-xs w-16 border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">occurrences</span>
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
            </div>
          )}
        </div>

        {/* Compact Footer */}
        <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-5 py-3 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg transition-all shadow-md shadow-blue-500/30"
          >
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddTaskModal;
