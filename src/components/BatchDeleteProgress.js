import React, { useState, useEffect, useRef } from 'react';
import { TrashIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { taskManager } from '../services/taskManager';

function BatchDeleteProgress({ progress, onClose }) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const timeoutRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const onCloseRef = useRef(onClose);

  // Keep onClose ref up to date without causing re-renders
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Calculate percentage based on actual successful deletions (not attempts)
  const percentage = progress && progress.total > 0 
    ? Math.min(100, Math.round((progress.success / progress.total) * 100))
    : 0;

  // Completion: Close when deletion process is complete (isActive: false)
  // This happens when all deletions have been processed, regardless of success/failure
  const isCompleted = progress !== null && !progress.isActive;

  // Check completion state immediately when completion is detected
  useEffect(() => {
    if (!progress) return;
    
    if (isCompleted && !showCompleted) {
      // Immediately show completed state
      setShowCompleted(true);
      
      // Clear any existing timeout or interval
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      
      // Check if we have deleted task IDs to poll for
      const deletedTaskIds = progress.deletedTaskIds || [];
      
      if (deletedTaskIds.length > 0) {
        // Start finalizing phase - poll UI to check if tasks are gone
        setIsFinalizing(true);
        
        // Poll every 500ms to check if tasks are gone from taskManager
        pollIntervalRef.current = setInterval(() => {
          try {
            const allTasks = taskManager.getAllTasks();
            const taskIdsSet = new Set(allTasks.map(t => t.id));
            
            // Check if any deleted task IDs still exist
            const tasksStillExist = deletedTaskIds.some(id => taskIdsSet.has(id));
            
            if (!tasksStillExist) {
              // All tasks are gone! Clear polling and close
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              setIsFinalizing(false);
              
              // Close after 2 seconds to show completion
              timeoutRef.current = setTimeout(() => {
                setShowCompleted(false);
                onCloseRef.current();
                timeoutRef.current = null;
              }, 2000);
            }
          } catch (error) {
            console.error('BatchDeleteProgress: Error checking tasks', error);
            // On error, stop polling and close anyway
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setIsFinalizing(false);
            timeoutRef.current = setTimeout(() => {
              setShowCompleted(false);
              onCloseRef.current();
              timeoutRef.current = null;
            }, 2000);
          }
        }, 500); // Check every 500ms
        
        // Safety timeout: Close after 30 seconds max even if tasks still exist
        timeoutRef.current = setTimeout(() => {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setIsFinalizing(false);
          setShowCompleted(false);
          onCloseRef.current();
          timeoutRef.current = null;
        }, 30000); // 30 second max timeout
      } else {
        // No task IDs to track, close after 3 seconds (original behavior)
        timeoutRef.current = setTimeout(() => {
          setShowCompleted(false);
          onCloseRef.current();
          timeoutRef.current = null;
        }, 3000);
      }
      
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    } else if (!isCompleted && showCompleted) {
      // Reset if progress becomes incomplete (shouldn't happen, but safety check)
      setShowCompleted(false);
      setIsFinalizing(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  }, [isCompleted, progress]); // Depend on progress to access deletedTaskIds

  // Cleanup timeout and interval on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  if (!progress) return null;

  const hasErrors = progress.errors > 0;
  const isFailed = isCompleted && hasErrors && progress.success === 0; // Complete failure

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-slideUp">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
            {isFailed ? (
              <XCircleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
            ) : hasErrors && !isFailed ? (
              <ExclamationTriangleIcon className="w-8 h-8 text-yellow-500" />
            ) : (
              <TrashIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div className="flex-1">
            <h3 className={`text-xl font-bold ${
              isFailed 
                ? 'text-red-700 dark:text-red-300' 
                : hasErrors 
                ? 'text-yellow-700 dark:text-yellow-300' 
                : 'text-gray-900 dark:text-white'
            }`}>
              {isFailed ? 'Deletion Failed' : hasErrors ? 'Deletion Completed with Errors' : 'Deleting Tasks'}
            </h3>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
              className={`h-4 rounded-full transition-all duration-300 ${
                isFailed
                  ? 'bg-red-500'
                  : isCompleted && !hasErrors
                  ? 'bg-red-500'
                  : hasErrors
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Progress Text */}
        <div className="text-center mb-6">
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {progress.success} / {progress.total} tasks deleted
          </p>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">
            {percentage}%
          </p>
          {progress.errors > 0 && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
              ⚠️ {progress.errors} deletion{progress.errors !== 1 ? 's' : ''} failed
            </p>
          )}
        </div>

        {/* Status Messages */}
        {isCompleted && showCompleted && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            {isFailed ? (
              <div className="flex flex-col items-center gap-3">
                <XCircleIcon className="w-10 h-10 text-red-500" />
                <span className="text-lg font-semibold text-red-600 dark:text-red-400">
                  Deletion failed!
                </span>
                {hasErrors && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {progress.errors} task{progress.errors !== 1 ? 's' : ''} had errors
                  </p>
                )}
              </div>
            ) : isFinalizing ? (
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  Finalizing...
                </span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Waiting for UI to update. Please wait.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <TrashIcon className="w-10 h-10 text-red-500" />
                <span className="text-lg font-semibold text-red-600 dark:text-red-400">
                  Deletion completed!
                </span>
                {hasErrors && (
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    {progress.errors} task{progress.errors !== 1 ? 's' : ''} had errors
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {progress.isActive && progress.errors > 0 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              {progress.errors} error{progress.errors !== 1 ? 's' : ''} so far
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BatchDeleteProgress;

