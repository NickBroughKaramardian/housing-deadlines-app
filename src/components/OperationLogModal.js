import React, { useState, useEffect } from 'react';
import { XMarkIcon, ClockIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, TrashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { operationHistoryService } from '../services/operationHistoryService';

function OperationLogModal({ isOpen, onClose }) {
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'import', 'delete'

  useEffect(() => {
    if (isOpen) {
      const filtered = filter === 'all' 
        ? operationHistoryService.getAll()
        : operationHistoryService.getAll(filter);
      setHistory(filtered);
    }
  }, [isOpen, filter]);

  const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (ms) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'partial':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getOperationIcon = (type) => {
    switch (type) {
      case 'import':
        return <ArrowDownTrayIcon className="w-4 h-4 text-blue-500" />;
      case 'delete':
        return <TrashIcon className="w-4 h-4 text-red-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getOperationLabel = (type) => {
    switch (type) {
      case 'import':
        return 'Import';
      case 'delete':
        return 'Delete';
      default:
        return 'Operation';
    }
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all operation history?')) {
      operationHistoryService.clear();
      setHistory([]);
    }
  };

  if (!isOpen) return null;

  const allCount = operationHistoryService.getCount();
  const importCount = operationHistoryService.getCount('import');
  const deleteCount = operationHistoryService.getCount('delete');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5" />
            <h3 className="text-lg font-bold">Logs</h3>
            <span className="text-sm text-white/80 ml-2">
              ({allCount} {allCount === 1 ? 'operation' : 'operations'})
            </span>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={handleClear}
                className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-all"
                title="Clear history"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-all"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-6 pt-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                filter === 'all'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-t-2 border-x-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              All ({allCount})
            </button>
            <button
              onClick={() => setFilter('import')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1 ${
                filter === 'import'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-t-2 border-x-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Imports ({importCount})
            </button>
            <button
              onClick={() => setFilter('delete')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1 ${
                filter === 'delete'
                  ? 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border-t-2 border-x-2 border-red-600 dark:border-red-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <TrashIcon className="w-4 h-4" />
              Deletions ({deleteCount})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-themed p-6">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {filter === 'all' 
                  ? 'No operation history yet. Import and deletion history will appear here.'
                  : filter === 'import'
                  ? 'No import history yet. Import history will appear here after you import tasks.'
                  : 'No deletion history yet. Deletion history will appear here after you delete tasks.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(record.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {record.totalTasks} {record.totalTasks === 1 ? 'task' : 'tasks'}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            {getOperationIcon(record.type)}
                            {getOperationLabel(record.type)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTimestamp(record.timestamp)}
                          </span>
                        </div>
                        {record.performedBy && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            {record.type === 'import' ? 'Imported' : 'Deleted'} by: {record.performedBy}
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {record.successCount > 0 && (
                            <span className="text-green-600 dark:text-green-400">
                              ✓ {record.successCount} succeeded
                            </span>
                          )}
                          {record.errorCount > 0 && (
                            <span className="text-red-600 dark:text-red-400">
                              ✗ {record.errorCount} failed
                            </span>
                          )}
                          {record.duration && (
                            <span className="text-gray-500">
                              ⏱ {formatDuration(record.duration)}
                            </span>
                          )}
                        </div>
                        {/* Show errors if any */}
                        {record.errors && record.errors.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
                              Errors:
                            </div>
                            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                              {record.errors.slice(0, 3).map((error, idx) => (
                                <li key={idx} className="flex items-start gap-1">
                                  <span className="text-red-500">•</span>
                                  <span>{error}</span>
                                </li>
                              ))}
                              {record.errors.length > 3 && (
                                <li className="text-gray-500 italic">
                                  ... and {record.errors.length - 3} more
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      record.status === 'completed'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : record.status === 'failed'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {record.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OperationLogModal;

