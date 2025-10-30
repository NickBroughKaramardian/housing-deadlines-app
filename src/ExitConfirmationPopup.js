import React from 'react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';

function ExitConfirmationPopup({ isVisible, onConfirm, onCancel, message = "You have unsaved changes. Are you sure you want to leave?" }) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Unsaved Changes
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
          >
            Stay
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200"
          >
            Leave Anyway
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExitConfirmationPopup;
