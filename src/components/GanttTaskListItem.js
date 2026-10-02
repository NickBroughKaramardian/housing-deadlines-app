// Task card used in the Gantt page's month lists (A2).
// Extracted from GanttDeadlinesPage.js, where this ~120-line JSX block was
// duplicated twice verbatim.

import React from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserIcon,
  FolderIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import {
  getTaskDeadline,
  parseDeadlineDate,
  getTaskStatus,
  getStatusColor,
  getResponsiblePartyNames
} from '../utils/taskHelpers';

const STATUS_BADGE_CLASSES = {
  green: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
};

const CARD_CLASSES = {
  Active: 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/30 hover:bg-blue-50/80 dark:hover:bg-blue-950/30',
  'Due Soon': 'bg-orange-50/60 dark:bg-orange-950/20 border-orange-200/50 dark:border-orange-800/30 hover:bg-orange-50/80 dark:hover:bg-orange-950/30',
  Overdue: 'bg-red-50/60 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/30 hover:bg-red-50/80 dark:hover:bg-red-950/30',
  Completed: 'bg-green-50/60 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/30 hover:bg-green-50/80 dark:hover:bg-green-950/30',
  default: 'bg-gray-50/60 dark:bg-gray-950/20 border-gray-200/50 dark:border-gray-800/30 hover:bg-gray-50/80 dark:hover:bg-gray-950/30'
};

const DUE_BOX_CLASSES = {
  Active: 'bg-blue-100/40 dark:bg-blue-900/20 border-blue-200/30 dark:border-blue-800/20',
  'Due Soon': 'bg-orange-100/40 dark:bg-orange-900/20 border-orange-200/30 dark:border-orange-800/20',
  Overdue: 'bg-red-100/40 dark:bg-red-900/20 border-red-200/30 dark:border-red-800/20',
  Completed: 'bg-green-100/40 dark:bg-green-900/20 border-green-200/30 dark:border-green-800/20',
  default: 'bg-gray-100/40 dark:bg-gray-900/20 border-gray-200/30 dark:border-gray-800/20'
};

const DUE_ICON_BG_CLASSES = {
  Active: 'bg-blue-200/60 dark:bg-blue-800/40',
  'Due Soon': 'bg-orange-200/60 dark:bg-orange-800/40',
  Overdue: 'bg-red-200/60 dark:bg-red-800/40',
  Completed: 'bg-green-200/60 dark:bg-green-800/40',
  default: 'bg-gray-200/60 dark:bg-gray-800/40'
};

const DUE_ICON_CLASSES = {
  Active: 'text-blue-700 dark:text-blue-300',
  'Due Soon': 'text-orange-700 dark:text-orange-300',
  Overdue: 'text-red-700 dark:text-red-300',
  Completed: 'text-green-700 dark:text-green-300',
  default: 'text-gray-700 dark:text-gray-300'
};

const DUE_DATE_CLASSES = {
  Active: 'text-blue-900 dark:text-blue-100',
  'Due Soon': 'text-orange-900 dark:text-orange-100',
  Overdue: 'text-red-900 dark:text-red-100',
  Completed: 'text-green-900 dark:text-green-100',
  default: 'text-gray-900 dark:text-gray-100'
};

function pick(map, status) {
  return map[status] || map.default;
}

function getStatusIcon(status) {
  const color = getStatusColor(status);
  switch (color) {
    case 'green':
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    case 'red':
      return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
    case 'orange':
      return <ClockIcon className="w-5 h-5 text-orange-500" />;
    case 'blue':
    default:
      return <ClockIcon className="w-5 h-5 text-blue-500" />;
  }
}

const GanttTaskListItem = React.memo(function GanttTaskListItem({ task, users, onClick, style }) {
  const status = getTaskStatus(task);
  const deadline = parseDeadlineDate(getTaskDeadline(task));
  const responsibleNames = getResponsiblePartyNames(
    task.ResponsibleParty || task.responsibleParty,
    users
  );
  const isUrgent = task.Priority === 'Urgent' || task.priority === 'Urgent';

  return (
    <div
      onClick={onClick}
      style={style}
      className={`group p-4 rounded-xl backdrop-blur-sm border transition-all duration-200 hover:scale-[1.02] hover:shadow-lg cursor-pointer ${pick(CARD_CLASSES, status)} ${isUrgent ? 'ring-2 ring-orange-200/50 dark:ring-orange-800/30' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon(status)}
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-900 dark:group-hover:text-blue-100 transition-colors">
            {task.task || task.Task || task.title || 'Untitled Task'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_BADGE_CLASSES[getStatusColor(status)] || STATUS_BADGE_CLASSES.blue}`}>
            {status}
          </span>
          {isUrgent && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md">
              Urgent
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-md">
              <FolderIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400">{task.Project || task.project || 'No Project'}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-md">
              <UserIcon className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400">{responsibleNames}</span>
          </div>
        </div>

        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm border ${pick(DUE_BOX_CLASSES, status)}`}>
          <div className={`p-1 rounded-md ${pick(DUE_ICON_BG_CLASSES, status)}`}>
            <CalendarDaysIcon className={`w-3.5 h-3.5 ${pick(DUE_ICON_CLASSES, status)}`} />
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Due</div>
            <div className={`text-sm font-bold ${pick(DUE_DATE_CLASSES, status)}`}>
              {deadline ? format(deadline, 'MMM dd, yyyy') : 'No date'}
            </div>
          </div>
        </div>
      </div>

      {(task.Notes || task.note) && (
        <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-600/30">
          <p className="text-xs text-gray-600 dark:text-gray-400 italic">
            {task.Notes || task.note}
          </p>
        </div>
      )}
    </div>
  );
});

export default GanttTaskListItem;
