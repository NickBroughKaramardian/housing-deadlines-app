import React, { useState, useEffect, useRef } from 'react';
import { CheckIcon, XMarkIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';

function BatchImportProgress({ progress, onClose }) {
  const [showCompleted, setShowCompleted] = useState(false);
  const timeoutRef = useRef(null);
  const onCloseRef = useRef(onClose);

  // Keep onClose ref up to date without causing re-renders
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Calculate percentage - this is our source of truth for completion
  const percentage = progress && progress.total > 0 
    ? Math.min(100, Math.round((progress.completed / progress.total) * 100))
    : 0;

  // SIMPLIFIED: Completion is purely based on percentage reaching 100%
  const isCompleted = percentage === 100 && progress !== null;

  // Check completion state immediately when percentage reaches 100%
  useEffect(() => {
    if (!progress) return;
    
    if (isCompleted && !showCompleted) {
      // Immediately show completed state
      setShowCompleted(true);
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Hide after 2 seconds
      timeoutRef.current = setTimeout(() => {
        setShowCompleted(false);
        onCloseRef.current();
        timeoutRef.current = null;
      }, 2000);
      
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    } else if (!isCompleted && showCompleted) {
      // Reset if progress becomes incomplete (shouldn't happen, but safety check)
      setShowCompleted(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isCompleted]); // Only depend on completion state, not internal UI state

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  if (!progress) return null;

  const hasErrors = progress.errors > 0;
  const isFailed = isCompleted && hasErrors && progress.success === 0; // Complete failure

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-right duration-200">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 min-w-[280px] backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isFailed && (
              <XCircleIcon className="w-5 h-5 text-red-500" />
            )}
            {hasErrors && !isFailed && (
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
            )}
            <span className={`text-sm font-semibold ${
              isFailed 
                ? 'text-red-700 dark:text-red-300' 
                : hasErrors 
                ? 'text-yellow-700 dark:text-yellow-300' 
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              {isFailed ? 'Import Failed' : hasErrors ? 'Import Completed with Errors' : 'Importing Tasks'}
            </span>
          </div>
          {!isCompleted && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Close"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                isFailed
                  ? 'bg-red-500'
                  : isCompleted && !hasErrors
                  ? 'bg-green-500'
                  : hasErrors
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Progress Text */}
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>
            {progress.completed} / {progress.total} tasks
          </span>
          <span className="font-medium">{percentage}%</span>
        </div>

        {/* Status Messages */}
        {isCompleted && showCompleted && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            {isFailed ? (
              <div className="flex items-center gap-2 text-sm">
                <XCircleIcon className="w-5 h-5 text-red-500" />
                <span className="text-red-600 dark:text-red-400 font-medium">
                  Import failed!
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <CheckIcon className="w-5 h-5 text-green-500" />
                <span className="text-green-600 dark:text-green-400 font-medium">
                  Import completed!
                </span>
              </div>
            )}
            {hasErrors && (
              <div className={`mt-2 text-xs ${
                isFailed 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-yellow-600 dark:text-yellow-400'
              }`}>
                {progress.errors} task{progress.errors !== 1 ? 's' : ''} had errors
              </div>
            )}
          </div>
        )}

        {progress.isActive && progress.errors > 0 && (
          <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
            {progress.errors} error{progress.errors !== 1 ? 's' : ''} so far
          </div>
        )}
      </div>
    </div>
  );
}

export default BatchImportProgress;

