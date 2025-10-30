import React, { useState, useMemo } from 'react';
import { DEPARTMENTS } from './Auth';
import { 
  ArrowDownTrayIcon, 
  ArrowUpTrayIcon, 
  DocumentArrowDownIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import { parse, isValid } from 'date-fns';

function DataManagement({ tasks, overrides, onImportTasks, onRestoreBackup }) {
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportFilters, setExportFilters] = useState({
    includeCompleted: true,
    includeRecurring: true,
    dateRange: 'all'
  });
  const [importPreview, setImportPreview] = useState([]);
  const [importError, setImportError] = useState('');
  
  // Expand recurring tasks (same logic as App.js)
  const expandRecurringTasks = (tasks) => {
    let allOccurrences = [];
    const defaultYears = 50;

    tasks.forEach(task => {
      if (task.recurring && task.frequency && task.deadline) {
        const interval = parseInt(task.frequency, 10);
        if (isNaN(interval) || interval < 1) {
          allOccurrences.push({ ...task, instanceId: task.id });
          return;
        }
        const startDate = parseDeadlineDate(task.deadline);
        if (!startDate) {
          allOccurrences.push({ ...task, instanceId: task.id });
          return;
        }
        
        // Handle finalDate instead of finalYear
        let endDate;
        if (task.finalDate) {
          endDate = parseDeadlineDate(task.finalDate);
          if (!endDate) {
            // If finalDate is invalid, use default
            endDate = new Date(startDate.getFullYear() + defaultYears, startDate.getMonth(), startDate.getDate());
          }
        } else {
          // No finalDate specified, use default
          endDate = new Date(startDate.getFullYear() + defaultYears, startDate.getMonth(), startDate.getDate());
        }
        
        let current = new Date(startDate);
        while (current <= endDate) {
          const instanceDate = new Date(current);
          if (instanceDate.getMonth() !== current.getMonth()) {
            instanceDate.setDate(0);
          }
          if (instanceDate > endDate) break;
          const instanceDeadline = instanceDate.toISOString().split('T')[0];
          const override = overrides.find(o => o.parentId === task.id && o.deadline === instanceDeadline);
          if (override) {
            if (!override.deleted) {
              // Merge override fields with parent, override takes precedence
              allOccurrences.push({
                ...task,
                ...override,
                completed: override.completed !== undefined ? override.completed : task.completed,
                important: override.important !== undefined ? override.important : task.important,
                instanceId: `${task.id}_${instanceDeadline}`,
                originalId: task.id,
                deadline: instanceDeadline,
                recurring: false,
                originalRecurring: true
              });
            }
          } else {
            allOccurrences.push({ 
              ...task, 
              instanceId: `${task.id}_${instanceDeadline}`, 
              originalId: task.id, 
              deadline: instanceDeadline, 
              recurring: false, 
              originalRecurring: true,
              important: task.important || false,
              completed: task.completed || false
            });
          }
          current.setMonth(current.getMonth() + interval);
        }
      } else {
        allOccurrences.push({ ...task, instanceId: task.id });
      }
    });
    return allOccurrences;
  };

  // Helper function to parse deadline dates (same as App.js)
  function parseDeadlineDate(dateStr) {
    if (!dateStr) return null;
    // Try explicit formats with date-fns
    const formats = [
      'yyyy-MM-dd',
      'MM/dd/yyyy',
      'M/d/yy',
      'M/d/yyyy',
      'MM/dd/yy',
    ];
    for (const fmt of formats) {
      const d = parse(dateStr, fmt, new Date());
      if (isValid(d)) return d;
    }
    return null;
  }

  const handleExport = () => {
    console.log('Export button clicked');
    console.log('Export format:', exportFormat);
    console.log('Export filters:', exportFilters);
    console.log('Tasks count:', tasks.length);
    
    let filteredTasks = [...tasks];

    // Apply filters
    if (!exportFilters.includeCompleted) {
      filteredTasks = filteredTasks.filter(task => !task.completed);
    }
    if (!exportFilters.includeRecurring) {
      filteredTasks = filteredTasks.filter(task => !task.recurring);
    }
    if (exportFilters.dateRange !== 'all') {
      const now = new Date();
      const startDate = new Date();
      switch (exportFilters.dateRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          break;
      }
      filteredTasks = filteredTasks.filter(task => {
        const taskDate = new Date(task.deadline);
        return taskDate >= startDate;
      });
    }

    console.log('Filtered tasks count:', filteredTasks.length);

    switch (exportFormat) {
      case 'csv':
        console.log('Exporting as CSV');
        exportToCSV(filteredTasks);
        break;
      case 'excel':
        console.log('Exporting as Excel');
        exportToExcel(filteredTasks);
        break;
      case 'json':
        console.log('Exporting as JSON');
        exportToJSON(filteredTasks);
        break;
      default:
        console.log('Unknown export format:', exportFormat);
        break;
    }
  };

  const exportToCSV = (data) => {
    const headers = ['Project', 'Description', 'Deadline', 'Responsible Party', 'Recurring', 'Interval (months)', 'Final Year', 'Priority', 'Status', 'Completed', 'Notes', 'Document Link', 'Created At', 'Created By', 'Last Modified'];
    const csvContent = [
      headers.join(','),
      ...data.map(task => {
        // Helper function to safely format dates
        const formatDate = (dateValue) => {
          if (!dateValue) return '';
          try {
            const date = new Date(dateValue);
            return isNaN(date.getTime()) ? '' : date.toISOString();
          } catch (error) {
            return '';
          }
        };

        return [
          `"${task.projectName}"`,
          `"${task.description}"`,
          task.deadline,
          `"${task.responsibleParty}"`,
          task.recurring ? 'Yes' : 'No',
          task.frequency,
          task.finalDate,
          task.important ? 'Urgent' : 'Normal',
          task.status || 'todo',
          task.completed ? 'Yes' : 'No',
          `"${task.notes || ''}"`,
          `"${task.documentLink || ''}"`,
          formatDate(task.createdAt),
          task.createdBy || '',
          formatDate(task.lastModified)
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tasks_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = (data) => {
    // Helper function to safely format dates
    const formatDate = (dateValue) => {
      if (!dateValue) return '';
      try {
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? '' : date.toISOString();
      } catch (error) {
        return '';
      }
    };

    const worksheet = XLSX.utils.json_to_sheet(data.map(task => ({
      Project: task.projectName,
      Description: task.description,
      Deadline: task.deadline,
      'Responsible Party': task.responsibleParty,
      Recurring: task.recurring ? 'Yes' : 'No',
      'Interval (months)': task.frequency,
      'Final Date': task.finalDate,
      Priority: task.important ? 'Urgent' : 'Normal',
      Status: task.status || 'todo',
      Completed: task.completed ? 'Yes' : 'No',
      Notes: task.notes || '',
      'Document Link': task.documentLink || '',
      'Created At': formatDate(task.createdAt),
      'Created By': task.createdBy || '',
      'Last Modified': formatDate(task.lastModified)
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
    
    XLSX.writeFile(workbook, `tasks_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToJSON = (data) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tasks_export_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBackup = () => {
    const backupData = {
      tasks: tasks,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        taskCount: tasks.length
      }
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `task_backup_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestore = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backupData = JSON.parse(e.target.result);
        if (backupData.tasks && Array.isArray(backupData.tasks)) {
          onRestoreBackup(backupData.tasks);
        } else {
          setImportError('Invalid backup file format');
        }
      } catch (error) {
        setImportError('Error reading backup file');
      }
    };
    reader.readAsText(file);
  };

  const handleFileImport = (event) => {
    setImportError('');
    const file = event.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        let data = [];
        if (ext === 'csv') {
          const csv = e.target.result;
          const lines = csv.split('\n');
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          
          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
              const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
              const row = {};
              headers.forEach((header, index) => {
                row[header] = values[index] || '';
              });
              data.push(row);
            }
          }
        } else if (ext === 'xlsx' || ext === 'xls') {
          const workbook = XLSX.read(e.target.result, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        } else if (ext === 'json') {
          data = JSON.parse(e.target.result);
        }

        setImportPreview(data);
      } catch (error) {
        setImportError('Error reading file: ' + error.message);
      }
    };

    if (ext === 'csv' || ext === 'json') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const handleImportSubmit = () => {
    if (!importPreview.length) return;

    const importedTasks = importPreview.map(row => ({
      projectName: row.Project || row.projectName || '',
      description: row.Description || row.description || '',
      deadline: row.Deadline || row.deadline || '',
      responsibleParty: row['Responsible Party'] || row.responsibleParty || '',
      recurring: (row.Recurring || row.recurring || '').toLowerCase() === 'yes',
      frequency: row['Interval (months)'] || row.frequency || 'None',
      finalDate: row['Final Date'] || row.finalDate || '',
      important: (row.Priority || row.important || '').toLowerCase() === 'urgent',
      status: row.Status || row.status || 'todo',
      completed: (row.Completed || row.completed || '').toLowerCase() === 'yes',
      notes: row.Notes || row.notes || '',
      documentLink: row['Document Link'] || row.documentLink || '',
      createdAt: row['Created At'] || row.createdAt || new Date().toISOString(),
      createdBy: row['Created By'] || row.createdBy || '',
      lastModified: row['Last Modified'] || row.lastModified || new Date().toISOString()
    }));

    onImportTasks(importedTasks);
    setImportPreview([]);
  };

  const getTaskStats = () => {
    // Expand recurring tasks to get accurate counts
    const expandedTasks = expandRecurringTasks(tasks);
    
    const total = expandedTasks.length;
    const completed = expandedTasks.filter(t => t.completed).length;
    const urgent = expandedTasks.filter(t => t.important).length;
    const recurring = tasks.filter(t => t.recurring).length; // Count base recurring tasks
    const overdue = expandedTasks.filter(t => {
      if (t.completed) return false;
      const deadline = new Date(t.deadline);
      return deadline < new Date();
    }).length;

    return { total, completed, urgent, recurring, overdue };
  };

  const stats = getTaskStats();

  // Year filter for breakdowns (must be after expandRecurringTasks is defined)
  const [selectedYear, setSelectedYear] = useState('all');
  const availableYears = useMemo(() => {
    const expanded = expandRecurringTasks(tasks);
    const yearSet = new Set();
    expanded.forEach(t => {
      const d = new Date(t.deadline);
      const y = d.getFullYear();
      if (!isNaN(y)) yearSet.add(y);
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [tasks, overrides]);

  // Build Department breakdown (counts per department, completed/total)
  const getDepartmentBreakdown = () => {
    const expanded = expandRecurringTasks(tasks);
    const filtered = selectedYear === 'all' 
      ? expanded 
      : expanded.filter(t => {
          const d = new Date(t.deadline);
          return d.getFullYear() === Number(selectedYear);
        });

    const allowed = [
      DEPARTMENTS.DEVELOPMENT,
      DEPARTMENTS.ACCOUNTING,
      DEPARTMENTS.COMPLIANCE,
      DEPARTMENTS.MANAGEMENT,
      'unassigned'
    ];

    const byDept = {
      [DEPARTMENTS.DEVELOPMENT]: { total: 0, completed: 0 },
      [DEPARTMENTS.ACCOUNTING]: { total: 0, completed: 0 },
      [DEPARTMENTS.COMPLIANCE]: { total: 0, completed: 0 },
      [DEPARTMENTS.MANAGEMENT]: { total: 0, completed: 0 },
      'unassigned': { total: 0, completed: 0 }
    };

    filtered.forEach(t => {
      const raw = (t.autoDepartment || t.department || '').toLowerCase();
      const dept = allowed.includes(raw) ? raw : 'unassigned';
      byDept[dept].total += 1;
      if (t.completed) byDept[dept].completed += 1;
    });
    return byDept;
  };

  // Build Project breakdown (counts per project, completed/total)
  const getProjectBreakdown = () => {
    const expanded = expandRecurringTasks(tasks);
    const filtered = selectedYear === 'all' 
      ? expanded 
      : expanded.filter(t => {
          const d = new Date(t.deadline);
          return d.getFullYear() === Number(selectedYear);
        });
    const byProject = {};
    filtered.forEach(t => {
      const name = (t.projectName || 'Untitled Project');
      if (!byProject[name]) byProject[name] = { total: 0, completed: 0 };
      byProject[name].total += 1;
      if (t.completed) byProject[name].completed += 1;
    });
    return byProject;
  };

  const departmentBreakdown = getDepartmentBreakdown();
  const projectBreakdown = getProjectBreakdown();
 
  return (
    <div className="space-y-6">
      {/* Breakdown Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All</option>
            {availableYears.map(y => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{stats.total}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Completed</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.urgent}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Urgent</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.recurring}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Recurring</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Overdue</div>
        </div>
      </div>

      {/* Data Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Breakdown (4 core + Unassigned) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Department Breakdown</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {[
              DEPARTMENTS.DEVELOPMENT,
              DEPARTMENTS.ACCOUNTING,
              DEPARTMENTS.COMPLIANCE,
              DEPARTMENTS.MANAGEMENT,
              'unassigned'
            ].map((dept) => {
              const v = departmentBreakdown[dept];
              const pct = v.total === 0 ? 0 : Math.round((v.completed / v.total) * 100);
              const label = dept === 'unassigned' ? 'Unassigned' : dept.charAt(0).toUpperCase() + dept.slice(1);
              return (
                <div key={dept} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{label}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-600 dark:bg-green-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{v.completed} completed of {v.total}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Project Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Project Breakdown</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {Object.entries(projectBreakdown)
              .sort((a,b) => b[1].total - a[1].total)
              .map(([name, v]) => {
                const pct = v.total === 0 ? 0 : Math.round((v.completed / v.total) * 100);
                return (
                  <div key={name} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate max-w-[70%]" title={name}>{name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 dark:bg-blue-400" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{v.completed} completed of {v.total}</div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
          <ArrowDownTrayIcon className="w-6 h-6 text-green-500" />
          Export Tasks
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Export Format</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel (.xlsx)</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Range</label>
            <select
              value={exportFilters.dateRange}
              onChange={(e) => setExportFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Time</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={exportFilters.includeCompleted}
              onChange={(e) => setExportFilters(prev => ({ ...prev, includeCompleted: e.target.checked }))}
              className="w-4 h-4 text-green-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Include completed tasks</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={exportFilters.includeRecurring}
              onChange={(e) => setExportFilters(prev => ({ ...prev, includeRecurring: e.target.checked }))}
              className="w-4 h-4 text-green-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Include recurring tasks</span>
          </label>
        </div>
        <button
          onClick={handleExport}
          className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200"
        >
          Export Tasks
        </button>
      </div>

      {/* Backup & Restore */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
          <DocumentArrowDownIcon className="w-6 h-6 text-blue-500" />
          Backup & Restore
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Create Backup</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Save all your tasks to a local file</p>
            <button
              onClick={handleBackup}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
            >
              Create Backup
            </button>
          </div>
          <div>
            <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Restore Backup</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Restore tasks from a backup file</p>
            <input
              type="file"
              accept=".json"
              onChange={handleRestore}
              className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
            />
          </div>
        </div>
      </div>

      {/* Import Enhanced */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
          <ArrowUpTrayIcon className="w-6 h-6 text-purple-500" />
          Import Tasks
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Import File</label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              onChange={handleFileImport}
              className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 dark:file:bg-purple-900/30 file:text-purple-700 dark:file:text-purple-300 hover:file:bg-purple-100 dark:hover:file:bg-purple-900/50"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Supported formats: CSV, Excel (.xlsx, .xls), JSON</p>
          </div>
          
          {importError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <ExclamationTriangleIcon className="w-4 h-4" />
                <span className="text-sm">{importError}</span>
              </div>
            </div>
          )}

          {importPreview.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Preview ({importPreview.length} tasks)</h4>
              <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Project</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Description</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Deadline</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Responsible</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Priority</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Status</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{row.Project || row.projectName || ''}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{row.Description || row.description || ''}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{row.Deadline || row.deadline || ''}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{row['Responsible Party'] || row.responsibleParty || ''}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{row.Priority || row.important || ''}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{row.Status || row.status || ''}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100 max-w-xs truncate" title={row.Notes || row.notes || ''}>{row.Notes || row.notes || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={handleImportSubmit}
                className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors duration-200"
              >
                Import {importPreview.length} Tasks
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DataManagement; 