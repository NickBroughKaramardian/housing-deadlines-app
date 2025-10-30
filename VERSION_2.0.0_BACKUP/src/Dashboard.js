
import React, { useState, useEffect } from 'react';
import { databaseDataService } from './databaseDataService';
import { parse, isValid, isThisWeek, format, differenceInDays } from 'date-fns';
import { microsoftDataService } from './microsoftDataService';
import { useAuth, getDepartmentFromResponsibleParty } from './Auth';

function Dashboard({ tasks, users, departmentMappings, onToggleCompleted, onTaskLinkClick, aliases = [] }) {
  const { 
    userProfile, 
    hasPermission, 
    ROLES, 
    DEPARTMENTS, 
    DEPARTMENT_NAMES,
    isUserInDepartment,
    getUsersByDepartment 
  } = useAuth();
  const [recentMessages, setRecentMessages] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  useEffect(() => {
    const savedNotes = JSON.parse(localStorage.getItem('dashboardNotes')) || [];
    setNotes(savedNotes);
  }, []);

  useEffect(() => {
    localStorage.setItem('dashboardNotes', JSON.stringify(notes));
  }, [notes]);

  // Fetch recent messages for dashboard
  useEffect(() => {
    const loadRecentMessages = async () => {
      try {
        const messages = await microsoftDataService.messages.getAll();
        const userMessages = messages
          .filter(msg => msg.recipients && msg.recipients.includes(userProfile?.uid))
          .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate))
          .slice(0, 3);
        setRecentMessages(userMessages);
      } catch (error) {
        console.error('Error loading recent messages:', error);
      }
    };

    if (userProfile?.uid) {
      loadRecentMessages();
    }
  }, [userProfile?.uid]);

  function parseDeadlineDate(dateStr) {
    if (!dateStr) return null;
    try {
      const parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
      return isValid(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  // Get tasks due this week
  const tasksThisWeek = tasks.filter(task => {
    const deadline = parseDeadlineDate(task.deadline);
    return deadline && isThisWeek(deadline);
  });

  // Get overdue tasks
  const overdueTasks = tasks.filter(task => {
    const deadline = parseDeadlineDate(task.deadline);
    return deadline && deadline < new Date() && task.status !== 'Completed';
  });

  // Get department progress
  const getDepartmentProgress = () => {
    const progress = {};
    
    Object.values(DEPARTMENTS).forEach(dept => {
      const deptTasks = tasks.filter(task => {
        const taskDept = getDepartmentFromResponsibleParty(task.responsibleParty, departmentMappings, users, aliases);
        return taskDept === dept;
      });
      
      const completedTasks = deptTasks.filter(task => task.status === 'Completed');
      const totalTasks = deptTasks.length;
      
      progress[dept] = {
        completed: completedTasks.length,
        total: totalTasks,
        percentage: totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0
      };
    });
    
    return progress;
  };

  const departmentProgress = getDepartmentProgress();

  // Get project progress
  const getProjectProgress = () => {
    const projects = {};
    
    tasks.forEach(task => {
      if (task.project) {
        if (!projects[task.project]) {
          projects[task.project] = { completed: 0, total: 0 };
        }
        projects[task.project].total++;
        if (task.status === 'Completed') {
          projects[task.project].completed++;
        }
      }
    });
    
    return Object.entries(projects).map(([project, data]) => ({
      name: project,
      completed: data.completed,
      total: data.total,
      percentage: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0
    }));
  };

  const projectProgress = getProjectProgress();

  const addNote = () => {
    if (newNote.trim()) {
      const note = {
        id: Date.now(),
        text: newNote.trim(),
        timestamp: new Date().toISOString(),
        author: userProfile?.displayName || 'Unknown'
      };
      setNotes([note, ...notes]);
      setNewNote('');
    }
  };

  const startEditNote = (noteId) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      setEditingNoteId(noteId);
      setEditingNoteText(note.text);
    }
  };

  const saveEditNote = () => {
    if (editingNoteText.trim()) {
      setNotes(notes.map(note => 
        note.id === editingNoteId 
          ? { ...note, text: editingNoteText.trim() }
          : note
      ));
      setEditingNoteId(null);
      setEditingNoteText('');
    }
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteText('');
  };

  const deleteNote = (noteId) => {
    setNotes(notes.filter(note => note.id !== noteId));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Welcome back, {userProfile?.displayName || 'User'}!
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tasks</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{tasks.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {tasks.filter(task => task.status === 'Completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Due This Week</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{tasksThisWeek.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{overdueTasks.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deadlines This Week */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Deadlines This Week</h3>
          </div>
          <div className="p-6">
            {tasksThisWeek.length > 0 ? (
              <div className="space-y-3">
                {tasksThisWeek.map(task => {
                  const deadline = parseDeadlineDate(task.deadline);
                  const daysUntil = deadline ? differenceInDays(deadline, new Date()) : 0;
                  
                  return (
                    <div 
                      key={task.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                      onClick={() => onTaskLinkClick && onTaskLinkClick(task.id)}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{task.project}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {deadline ? format(deadline, 'MMM dd') : 'No date'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No deadlines this week</p>
            )}
          </div>
        </div>

        {/* Recent Messages */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Messages</h3>
          </div>
          <div className="p-6">
            {recentMessages.length > 0 ? (
              <div className="space-y-3">
                {recentMessages.map(message => (
                  <div key={message.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="font-medium text-gray-900 dark:text-white">{message.subject}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{message.from}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {message.createdDate ? format(new Date(message.createdDate), 'MMM dd, yyyy') : 'No date'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No recent messages</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Department Progress</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {Object.entries(departmentProgress).map(([dept, progress]) => (
                <div key={dept}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {DEPARTMENT_NAMES[dept] || dept}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {progress.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Project Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Project Progress</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {projectProgress.map(project => (
                <div key={project.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-3">
                      {project.percentage === 100 ? (
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {project.percentage}%
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{project.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {project.completed} of {project.total} tasks
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Manager Notes */}
      {hasPermission(ROLES.ADMIN) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Manager Notes</h3>
          </div>
          <div className="p-6">
            {notes.length > 0 ? (
              <div className="space-y-4">
                {notes.map(note => (
                  <div key={note.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    {editingNoteId === note.id ? (
                      <div>
                        <textarea
                          value={editingNoteText}
                          onChange={(e) => setEditingNoteText(e.target.value)}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          rows="3"
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={saveEditNote}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditNote}
                            className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-400 dark:hover:bg-gray-500"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-900 dark:text-white">{note.text}</p>
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {note.author} • {format(new Date(note.timestamp), 'MMM dd, yyyy HH:mm')}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditNote(note.id)}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteNote(note.id)}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No notes yet</p>
            )}
            
            <div className="mt-4">
              <div className="flex gap-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  rows="2"
                />
                <button
                  onClick={addNote}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
