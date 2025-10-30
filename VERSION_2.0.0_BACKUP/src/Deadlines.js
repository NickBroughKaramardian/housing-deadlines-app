import React, { useState, useEffect } from 'react';
import { databaseDataService } from './databaseDataService';

const Deadlines = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('deadline');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterProject, setFilterProject] = useState('');
  const [filterResponsibleParty, setFilterResponsibleParty] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Load tasks from database
  const loadTasks = async () => {
    try {
      setLoading(true);
      const tasksData = await databaseDataService.getDeadlinesData(sortBy, sortOrder);
      setTasks(tasksData);
      console.log('Deadlines: Loaded', tasksData.length, 'tasks');
    } catch (err) {
      console.error('Deadlines: Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate status based on deadline and completion
  const getCalculatedStatus = (task) => {
    if (task.Completed) return 'Completed';
    if (new Date(task.Deadline) < new Date()) return 'Overdue';
    return 'Active';
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return 'text-red-600 dark:text-red-400';
      case 'High': return 'text-orange-600 dark:text-orange-400';
      case 'Medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'Low': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'text-green-600 dark:text-green-400';
      case 'Overdue': return 'text-red-600 dark:text-red-400';
      case 'Active': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesProject = !filterProject || task.Project?.toLowerCase().includes(filterProject.toLowerCase());
    const matchesResponsible = !filterResponsibleParty || task.ResponsibleParty?.toLowerCase().includes(filterResponsibleParty.toLowerCase());
    const matchesPriority = !filterPriority || task.Priority === filterPriority;
    const matchesStatus = !filterStatus || getCalculatedStatus(task) === filterStatus;
    
    return matchesProject && matchesResponsible && matchesPriority && matchesStatus;
  });

  // Get unique values for filters
  const uniqueProjects = [...new Set(tasks.map(task => task.Project).filter(Boolean))];
  const uniqueResponsibleParties = [...new Set(tasks.map(task => task.ResponsibleParty).filter(Boolean))];
  const uniquePriorities = [...new Set(tasks.map(task => task.Priority).filter(Boolean))];

  // Load data when component mounts or filters change
  useEffect(() => {
    loadTasks();
  }, [sortBy, sortOrder]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading deadlines...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Deadlines
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage all project deadlines
          </p>
        </div>

        {/* Filters and Controls */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="deadline">Deadline</option>
                <option value="priority">Priority</option>
                <option value="project">Project</option>
                <option value="responsible">Responsible Party</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort Order
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>

            {/* Filter by Project */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Project
              </label>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Projects</option>
                {uniqueProjects.map(project => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
            </div>

            {/* Filter by Responsible Party */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Responsible Party
              </label>
              <select
                value={filterResponsibleParty}
                onChange={(e) => setFilterResponsibleParty(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Responsible Parties</option>
                {uniqueResponsibleParties.map(party => (
                  <option key={party} value={party}>{party}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filter by Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Priority
              </label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Priorities</option>
                {uniquePriorities.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>

            {/* Filter by Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Overdue">Overdue</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-400">
            Showing {filteredTasks.length} of {tasks.length} deadlines
          </p>
        </div>

        {/* Deadlines Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No deadlines found matching your filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Deadline
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Responsible Party
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Recurring
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Completed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Link
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      {/* Task */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {task.Task || '-'}
                        </div>
                      </td>

                      {/* Project */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {task.Project || '-'}
                        </div>
                      </td>

                      {/* Deadline */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {task.Deadline ? new Date(task.Deadline).toLocaleDateString() : '-'}
                        </div>
                        {task.Deadline && new Date(task.Deadline) < new Date() && !task.Completed && (
                          <div className="text-xs text-red-600 dark:text-red-400">
                            Overdue
                          </div>
                        )}
                      </td>

                      {/* Responsible Party */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {task.ResponsibleParty || '-'}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getPriorityColor(task.Priority)}`}>
                          {task.Priority || 'Medium'}
                        </span>
                      </td>

                      {/* Status (Calculated) */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getStatusColor(getCalculatedStatus(task))}`}>
                          {getCalculatedStatus(task)}
                        </span>
                      </td>

                      {/* Recurring */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {task.Recurring ? (
                            <div>
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={true}
                                  readOnly
                                  className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded"
                                />
                                <span className="ml-2">Yes</span>
                              </div>
                              {task.Interval && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {task.Interval}
                                </div>
                              )}
                              {task.FinalDate && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Until: {new Date(task.FinalDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={false}
                                readOnly
                                className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded"
                              />
                              <span className="ml-2">No</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Completed */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={task.Completed}
                            readOnly
                            className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-900 dark:text-white">
                            {task.Completed ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </td>

                      {/* Notes */}
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs">
                        <div className="truncate" title={task.Notes}>
                          {task.Notes || '-'}
                        </div>
                      </td>

                      {/* Link */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {task.Link ? (
                          <a 
                            href={task.Link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            View Document
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Deadlines;
