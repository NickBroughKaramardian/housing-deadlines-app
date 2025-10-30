import React, { useState, useEffect } from 'react';

function DocumentLinkModal({ isOpen, task, onSave, onRemove, onClose }) {
  const [documentLink, setDocumentLink] = useState('');
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (task) {
      setDocumentLink(task.documentLink || '');
    }
  }, [task]);

  useEffect(() => {
    // Validate the link - accept URLs, file paths, and network paths
    const trimmed = documentLink.trim();
    const isValidUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://');
    const isValidPath = trimmed.startsWith('\\\\') || trimmed.includes(':\\') || trimmed.includes('/');
    setIsValid(trimmed.length > 0 && (isValidUrl || isValidPath));
  }, [documentLink]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isValid) {
      onSave(task.instanceId || task.id, task.originalId, documentLink.trim());
    }
  };

  const handleRemove = () => {
    if (window.confirm('Are you sure you want to remove this document link?')) {
      onRemove(task.instanceId || task.id, task.originalId);
      onClose();
    }
  };

  const handleClose = () => {
    setDocumentLink('');
    onClose();
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Document Link
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {task.documentLink ? 'Edit document link' : 'Add document link'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Document Link Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Document Link
            </label>
            <input
              type="text"
              value={documentLink}
              onChange={(e) => setDocumentLink(e.target.value)}
              placeholder="https://sharepoint.com/... or \\\\server\\folder\\document.pdf"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Enter a SharePoint, OneDrive, web link, or file path (e.g., \\\\server\\folder\\document.pdf)
            </p>
          </div>

          {/* Validation Message */}
          {documentLink && !isValid && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">
                Please enter a valid URL, file path, or network path
              </p>
            </div>
          )}

          {/* Help Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
              Supported Link Types:
            </h4>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <li>• <strong>Web URLs:</strong> https://sharepoint.com/document.pdf</li>
              <li>• <strong>Network Paths:</strong> \\\\server\\folder\\document.pdf</li>
              <li>• <strong>Local Paths:</strong> C:\\Documents\\file.pdf</li>
              <li>• <strong>OneDrive/SharePoint:</strong> Direct links to documents</li>
            </ul>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">
              <strong>Note:</strong> For network drives, use format: \\\\server\\folder\\file.pdf
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {task.documentLink && (
              <button
                type="button"
                onClick={handleRemove}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors duration-200"
              >
                Remove Link
              </button>
            )}
            <button
              type="submit"
              disabled={!isValid}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors duration-200 ${
                isValid
                  ? 'bg-purple-500 hover:bg-purple-600 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              {task.documentLink ? 'Update Link' : 'Add Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DocumentLinkModal; 