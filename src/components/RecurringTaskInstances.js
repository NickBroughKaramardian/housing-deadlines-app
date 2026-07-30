import React, { useMemo, useState } from 'react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CheckIcon,
  ClockIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import DeleteConfirmModal from './DeleteConfirmModal';
import { generateInstances } from '../utils/recurrenceUtils';

const RecurringTaskInstances = ({
  template,
  tasks,
  updateTask,
  deleteTask,
  onInstanceUpdate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    task: null,
    dateLabel: ''
  });

  if (!template?.recurrence) return null;

  const instances = useMemo(() => {
    if (!template.recurrence) return [];

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 12);

    try {
      return generateInstances(template, startDate, endDate);
    } catch (err) {
      console.warn('Could not generate instances:', err);
      return [];
    }
  }, [template]);

  const instancesWithTasks = useMemo(() => {
    return instances.map(instance => {
      const existingTask = tasks.find(t =>
        t.templateId === template.id &&
        t.deadline_date === instance.deadline_date
      );
      return {
        ...instance,
        existingTask,
        id: existingTask?.id || instance.id
      };
    });
  }, [instances, tasks, template.id]);

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, task: null, dateLabel: '' });
  };

  const handleDeleteInstance = async () => {
    const taskToDelete = deleteModal.task;
    closeDeleteModal();

    if (!taskToDelete?.id) return;

    try {
      await deleteTask(taskToDelete.id);
      if (onInstanceUpdate) onInstanceUpdate();
    } catch (error) {
      console.error('RecurringTaskInstances: Failed to delete instance:', error);
      alert(`Failed to delete instance: ${error.message}`);
    }
  };

  const openDeleteModal = (task, date) => {
    if (!task?.id) return;

    const dateLabel = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    setDeleteModal({
      isOpen: true,
      task,
      dateLabel
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        title="View recurring instances"
      >
        <span>Instances ({instancesWithTasks.length})</span>
        {isOpen ? (
          <ChevronUpIcon className="w-3 h-3" />
        ) : (
          <ChevronDownIcon className="w-3 h-3" />
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Recurring Instances
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Next 12 months
            </p>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {instancesWithTasks.map(instance => {
              const task = instance.existingTask || instance;
              const date = new Date(instance.deadline_date);
              const isPast = date < new Date();

              return (
                <div
                  key={instance.id}
                  className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    isPast ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {instance.title || template.title || template.task || 'Recurring Instance'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {date.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 ml-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (task.id) {
                            await updateTask(task.id, { completed: !task.completed });
                            if (onInstanceUpdate) onInstanceUpdate();
                          }
                        }}
                        className={`p-1.5 rounded transition-colors ${
                          task.completed
                            ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                        title={task.completed ? 'Mark incomplete' : 'Mark complete'}
                        disabled={!task.id}
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          if (task.id) {
                            await updateTask(task.id, {
                              priority: task.priority === 'Urgent' ? 'Normal' : 'Urgent'
                            });
                            if (onInstanceUpdate) onInstanceUpdate();
                          }
                        }}
                        className={`p-1.5 rounded transition-colors ${
                          task.priority === 'Urgent'
                            ? 'bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                        title={task.priority === 'Urgent' ? 'Mark normal' : 'Mark urgent'}
                        disabled={!task.id}
                      >
                        <ClockIcon className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => openDeleteModal(task, date)}
                        className="p-1.5 rounded bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Delete instance"
                        disabled={!task.id}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {instancesWithTasks.length === 0 && (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                No instances found
              </div>
            )}
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteInstance}
        itemType="instance"
        itemName={deleteModal.task?.title || template.title || template.task || 'Recurring Instance'}
        itemDate={deleteModal.dateLabel}
      />
    </div>
  );
};

export default RecurringTaskInstances;


