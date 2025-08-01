import React, { useState } from 'react';
import { 
  XMarkIcon
} from '@heroicons/react/24/outline';

function BulkActions({ tasks, onBulkAction, onSelectAll, onClearSelection }) {
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [showBulkBar, setShowBulkBar] = useState(false);

  const handleTaskSelect = (taskId) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
    setShowBulkBar(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    const allTaskIds = tasks.map(task => task.instanceId);
    setSelectedTasks(new Set(allTaskIds));
    setShowBulkBar(true);
    onSelectAll?.(allTaskIds);
  };

  const handleClearSelection = () => {
    setSelectedTasks(new Set());
    setShowBulkBar(false);
    onClearSelection?.();
  };

  const handleBulkAction = (action) => {
    const selectedIds = Array.from(selectedTasks);
    onBulkAction(action, selectedIds);
    handleClearSelection();
  };

  if (!showBulkBar) {
    return (
      <button
        onClick={handleSelectAll}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-all duration-200 border border-gray-300 dark:border-gray-600 shadow-sm hover:shadow-md hover:border-gray-400 dark:hover:border-gray-500"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="hidden sm:inline">Select All</span>
        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full font-medium">
          {tasks.length}
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Bulk Actions Bar */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {selectedTasks.size} selected
            </span>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => handleBulkAction('complete')}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 shadow-sm transition-colors duration-200"
                title="Mark as Completed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                onClick={() => handleBulkAction('urgent')}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-800 shadow-sm transition-colors duration-200"
                title="Toggle Urgent"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 shadow-sm transition-colors duration-200"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          <button
            onClick={handleClearSelection}
            className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium transition-colors duration-200"
          >
            <XMarkIcon className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

export default BulkActions; 