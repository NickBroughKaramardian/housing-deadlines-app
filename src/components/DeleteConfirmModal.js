import React from 'react';
import { TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

const MAX_PREVIEW_ITEMS = 8;

function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  itemType = 'task',
  itemName,
  itemDate,
  customTitle,
  customMessage,
  items = [],
  confirmLabel = 'Delete'
}) {
  if (!isOpen) return null;

  const defaultTitle =
    itemType === 'template'
      ? 'Delete Recurring List'
      : itemType === 'instance'
        ? 'Delete Instance'
        : 'Delete Task';

  const titleText = customTitle || defaultTitle;

  const defaultMessage = (() => {
    let message = `Are you sure you want to delete ${itemName || 'this item'}`;
    if (itemDate) {
      message += ` (${itemDate})`;
    }
    message += '?';

    if (itemType === 'template') {
      message += ' This will delete the entire recurring list and all instances.';
    } else if (itemType === 'instance') {
      message += ' This will only delete this specific instance.';
    } else {
      message += ' This action cannot be undone.';
    }
    return message;
  })();

  const messageText = customMessage || defaultMessage;
  const previewItems = Array.isArray(items) ? items.slice(0, MAX_PREVIEW_ITEMS) : [];
  const remainingCount = Array.isArray(items) ? Math.max(items.length - MAX_PREVIEW_ITEMS, 0) : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <TrashIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {titleText}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4 mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {messageText}
          </p>

          {previewItems.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/40 max-h-48 overflow-y-auto scrollbar-themed">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {items.length === 1 ? 'Task to delete' : `Tasks to delete (${items.length})`}
                </p>
              </div>
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {previewItems.map(item => (
                  <li key={item.id || item.name} className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {item.name || 'Untitled Task'}
                    </p>
                    {(item.project || item.subtitle || item.date) && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                        {[item.project || item.subtitle, item.date].filter(Boolean).join(' • ')}
                      </p>
                    )}
                  </li>
                ))}
                {remainingCount > 0 && (
                  <li className="px-4 py-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      +{remainingCount} more
                    </p>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmModal;

