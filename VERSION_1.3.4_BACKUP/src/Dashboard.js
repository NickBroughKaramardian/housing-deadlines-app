import React, { useState, useEffect } from 'react';
import { parse, isValid, isThisWeek, format, differenceInDays } from 'date-fns';
import { db } from './firebase';
import { collection, onSnapshot, query, where, orderBy, limit, updateDoc, doc } from 'firebase/firestore';
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
  const [editNoteText, setEditNoteText] = useState('');

  useEffect(() => {
    const savedNotes = JSON.parse(localStorage.getItem('dashboardNotes')) || [];
    setNotes(savedNotes);
  }, []);

  useEffect(() => {
    localStorage.setItem('dashboardNotes', JSON.stringify(notes));
  }, [notes]);

  // Fetch recent messages for dashboard
  useEffect(() => {
    if (!userProfile?.organizationId) return;

    const messagesQuery = query(
      collection(db, 'messages'),
      where('organizationId', '==', userProfile.organizationId),
      where('recipients', 'array-contains', userProfile.uid),
      orderBy('createdAt', 'desc'),
      limit(3)
    );

    const unsub = onSnapshot(messagesQuery, (snapshot) => {
      setRecentMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return unsub;
  }, [userProfile?.organizationId, userProfile?.uid]);

  function parseDeadlineDate(dateStr) {
    if (!dateStr) return null;
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

  const getTasksDueThisWeek = () => {
    // Tasks are already expanded from App.js
    return tasks.filter(task => {
      const deadlineDate = parseDeadlineDate(task.deadline);
      // Only show incomplete tasks due this week
      return deadlineDate && isThisWeek(deadlineDate) && !task.completed;
    }).sort((a, b) => {
      const da = parseDeadlineDate(a.deadline);
      const db = parseDeadlineDate(b.deadline);
      return da - db;
    });
  };



  // Calculate department progress
  const getDepartmentProgress = () => {
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1); // January 1st
    const yearEnd = new Date(currentYear, 11, 31); // December 31st
    
    const departmentStats = {};

    Object.values(DEPARTMENTS).forEach(deptId => {
      const deptName = DEPARTMENT_NAMES[deptId];
      const deptUsers = getUsersByDepartment(users || [], deptId);
      
      // Get ALL tasks (including recurring instances) for this department in the current year
      const deptTasks = tasks.filter(task => {
        // Check if task deadline falls within the current year
        const deadlineDate = parseDeadlineDate(task.deadline);
        if (!deadlineDate) return false;
        
        const taskYear = deadlineDate.getFullYear();
        if (taskYear !== currentYear) return false;
        
        // Check if task is assigned to someone in this department OR if responsible party matches department name
        if (!task.responsibleParty) return false;
        
        // First, check alias-aware auto department
        const autoDepartment = getDepartmentFromResponsibleParty(task.responsibleParty, departmentMappings || [], users || [], aliases || []);
        if (autoDepartment === deptId) {
          return true;
        }
        
        // Then, check if task is assigned to someone in this department by direct user match
        const responsibleParties = task.responsibleParty.toLowerCase().split(',').map(p => p.trim());
        return responsibleParties.some(party => {
          const userInParty = deptUsers.find(user => 
            (user.displayName?.toLowerCase() === party || 
             user.email?.toLowerCase() === party)
          );
          return !!userInParty;
        });
      });

      const totalTasks = deptTasks.length;
      const completedTasks = deptTasks.filter(task => task.completed).length;
      const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      departmentStats[deptId] = {
        name: deptName,
        total: totalTasks,
        completed: completedTasks,
        progress: progressPercentage
      };
    });

    return departmentStats;
  };

  // Calculate project progress
  const getProjectProgress = () => {
    const currentYear = new Date().getFullYear();
    const projectStats = {};

    // Process ALL tasks (including recurring instances) for the current year
    tasks.forEach(task => {
      // Check if task deadline falls within the current year
      const deadlineDate = parseDeadlineDate(task.deadline);
      if (!deadlineDate) return;
      
      const taskYear = deadlineDate.getFullYear();
      if (taskYear !== currentYear) return;
      
      const projectName = task.projectName || 'Unassigned';
      if (!projectStats[projectName]) {
        projectStats[projectName] = {
          total: 0,
          completed: 0,
          progress: 0
        };
      }
      
      projectStats[projectName].total++;
      if (task.completed) {
        projectStats[projectName].completed++;
      }
    });

    // Calculate progress percentages
    Object.keys(projectStats).forEach(projectName => {
      const stats = projectStats[projectName];
      stats.progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    });

    return projectStats;
  };

  const addNote = () => {
    if (newNote.trim()) {
      const note = {
        id: Date.now().toString(),
        text: newNote.trim(),
        timestamp: new Date().toISOString(),
        createdBy: userProfile?.uid,
        managerName: userProfile?.displayName || userProfile?.email || 'Manager',
      };
      setNotes([...notes, note]);
      setNewNote('');
    }
  };

  const deleteNote = (id) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  const startEditNote = (note) => {
    setEditingNoteId(note.id);
    setEditNoteText(note.text);
  };

  const saveEditNote = () => {
    if (editNoteText.trim()) {
      setNotes(notes.map(note => 
        note.id === editingNoteId 
          ? { ...note, text: editNoteText.trim() }
          : note
      ));
      setEditingNoteId(null);
      setEditNoteText('');
    }
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setEditNoteText('');
  };

  const formatMessageDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const truncateText = (text, maxLength = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const tasksDueThisWeek = getTasksDueThisWeek();

  // Filter recent messages: only last 7 days, not deleted, not team announcements
  const now = new Date();
  const filteredMessages = recentMessages.filter(msg => {
    if (msg.deleted) return false;
    if (msg.isAnnouncement) return false; // Team announcements go to Manager Notes
    if (!msg.createdAt) return false;
    const created = msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt);
    return differenceInDays(now, created) <= 7;
  });

  // Team announcements for Manager Notes
  const teamAnnouncements = recentMessages.filter(msg => msg.isAnnouncement && !msg.deleted);

  const handleDeleteAnnouncement = async (id) => {
    try {
      await updateDoc(doc(db, 'messages', id), { deleted: true });
      setRecentMessages(msgs => msgs.map(m => m.id === id ? { ...m, deleted: true } : m));
    } catch (err) {
      // Optionally show error
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-screen w-full">
      {/* Main Content Section - 65% width on desktop, full width on mobile */}
      <div className="w-full lg:w-2/3 flex flex-col h-full">
        {/* Overall Progress Summary - Now at the top */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 lg:p-6 mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Overall Progress ({new Date().getFullYear()})
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(() => {
              const currentYear = new Date().getFullYear();
              const yearTasks = tasks.filter(task => {
                const deadlineDate = parseDeadlineDate(task.deadline);
                return deadlineDate && deadlineDate.getFullYear() === currentYear;
              });
              
              const totalTasks = yearTasks.length;
              const completedTasks = yearTasks.filter(task => task.completed).length;
              const overdueTasks = yearTasks.filter(task => {
                if (task.completed) return false;
                const deadlineDate = parseDeadlineDate(task.deadline);
                return deadlineDate && deadlineDate < new Date();
              }).length;
              
              return (
                <>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">Completed</p>
                        <p className="text-2xl font-bold text-green-900 dark:text-green-100">{completedTasks}</p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Tasks</p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{totalTasks}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-red-200 dark:border-red-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">Overdue</p>
                        <p className="text-2xl font-bold text-red-900 dark:text-red-100">{overdueTasks}</p>
                      </div>
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Progress</span>
              <span className="text-sm font-bold text-gray-800 dark:text-white">
                {(() => {
                  const currentYear = new Date().getFullYear();
                  const yearTasks = tasks.filter(task => {
                    const deadlineDate = parseDeadlineDate(task.deadline);
                    return deadlineDate && deadlineDate.getFullYear() === currentYear;
                  });
                  const totalTasks = yearTasks.length;
                  const completedTasks = yearTasks.filter(task => task.completed).length;
                  return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                })()}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(() => {
                    const currentYear = new Date().getFullYear();
                    const yearTasks = tasks.filter(task => {
                      const deadlineDate = parseDeadlineDate(task.deadline);
                      return deadlineDate && deadlineDate.getFullYear() === currentYear;
                    });
                    const totalTasks = yearTasks.length;
                    const completedTasks = yearTasks.filter(task => task.completed).length;
                    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                  })()}%` 
                }}
              />
            </div>
          </div>
        </div>

        {/* This Week's Deadlines Section - Now stretches to bottom */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 lg:p-6 flex-1 flex flex-col min-h-0 h-full">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Deadlines This Week
          </h2>
          
          <div className="flex-1 min-h-0">
            {tasksDueThisWeek.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 text-center py-8 h-full flex flex-col justify-center min-h-0">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg text-gray-700 dark:text-gray-300">No deadlines due this week</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-4 h-full overflow-y-auto">
                {tasksDueThisWeek.map((task) => {
                  const deadlineDate = parseDeadlineDate(task.deadline);
                  const isToday = deadlineDate && format(deadlineDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  const isTomorrow = deadlineDate && format(deadlineDate, 'yyyy-MM-dd') === format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
                  const completed = !!task.completed;
                  
                  // Get status colors and styling
                  const getStatusConfig = () => {
                    if (completed) {
                      return {
                        bg: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
                        border: 'border-green-200 dark:border-green-700',
                        badge: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
                        text: 'text-green-800 dark:text-green-200',
                        icon: 'text-green-600 dark:text-green-400'
                      };
                    } else if (isToday) {
                      return {
                        bg: 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20',
                        border: 'border-red-200 dark:border-red-700',
                        badge: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
                        text: 'text-red-800 dark:text-red-200',
                        icon: 'text-red-600 dark:text-red-400'
                      };
                    } else if (isTomorrow) {
                      return {
                        bg: 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20',
                        border: 'border-orange-200 dark:border-orange-700',
                        badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
                        text: 'text-orange-800 dark:text-orange-200',
                        icon: 'text-orange-600 dark:text-orange-400'
                      };
                    } else {
                      return {
                        bg: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
                        border: 'border-blue-200 dark:border-blue-700',
                        badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
                        text: 'text-blue-800 dark:text-blue-200',
                        icon: 'text-blue-600 dark:text-blue-400'
                      };
                    }
                  };
                  
                  const status = getStatusConfig();
                  
                  return (
                    <div key={task.id} className={`group relative overflow-hidden rounded-xl border ${status.border} ${status.bg} transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-opacity-80`}>
                      {/* Background pattern */}
                      <div className="absolute inset-0 opacity-5">
                        <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8">
                          <svg className="w-full h-full" viewBox="0 0 100 100" fill="currentColor">
                            <circle cx="20" cy="20" r="2" />
                            <circle cx="80" cy="20" r="2" />
                            <circle cx="50" cy="50" r="2" />
                            <circle cx="20" cy="80" r="2" />
                            <circle cx="80" cy="80" r="2" />
                          </svg>
                        </div>
                      </div>
                      
                      <div className="relative p-5">
                        {/* Header with status badge */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-lg font-bold ${completed ? 'line-through opacity-75' : 'text-gray-900 dark:text-white'} transition-all duration-200 group-hover:text-opacity-90`}>
                              {task.description}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {/* Status badge */}
                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm ${status.badge}`}>
                              {completed ? 'COMPLETED' : isToday ? 'TODAY' : isTomorrow ? 'TOMORROW' : format(deadlineDate, 'EEEE')}
                            </span>
                            
                            {/* Complete button */}
                            {!task.checklistId && (
                            <button
                              onClick={() => onToggleCompleted(task.instanceId, task.originalId)}
                              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-primary shadow-sm hover:shadow-md transform hover:scale-105 ${
                                completed 
                                  ? 'bg-green-500 text-white hover:bg-green-600 shadow-green-200 dark:shadow-green-900/30' 
                                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 border border-gray-200 dark:border-gray-600'
                              }`}
                              title={completed ? 'Mark as Incomplete' : 'Mark as Completed'}
                              aria-label={completed ? 'Mark as Incomplete' : 'Mark as Completed'}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Project and responsible party info */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <svg className={`w-4 h-4 ${status.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                              <span className="font-medium text-gray-600 dark:text-gray-400">Project:</span>
                              <span className="font-semibold text-gray-800 dark:text-gray-200">{task.projectName}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <svg className={`w-4 h-4 ${status.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span className="font-medium text-gray-600 dark:text-gray-400">Responsible:</span>
                              <span className="font-semibold text-gray-800 dark:text-gray-200">{task.responsibleParty}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Deadline date */}
                        {deadlineDate && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <div className="flex items-center gap-2 text-sm">
                              <svg className={`w-4 h-4 ${status.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="font-medium text-gray-600 dark:text-gray-400">Due:</span>
                              <span className={`font-bold ${status.text}`}>
                                {format(deadlineDate, 'EEEE, MMMM d, yyyy')}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - 35% width on desktop, full width on mobile */}
      <div className="w-full lg:w-1/3 flex flex-col gap-4 lg:gap-6">
        {/* Recent Messages Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 lg:p-6 flex flex-col">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Recent Messages
          </h2>
          
          <div className="flex-1 space-y-3">
            {filteredMessages.length === 0 ? (
                          <div className="text-gray-500 dark:text-gray-400 text-center py-4">
              <p className="text-sm">No recent messages</p>
            </div>
            ) : (
              filteredMessages.map((message) => {
                const linkedTask = message.linkedDeadline;
                return (
                  <div key={message.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border-l-3 border-blue-400 dark:border-blue-500 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                          {message.senderName || message.senderEmail}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatMessageDate(message.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        {truncateText(message.content, 60)}
                      </p>
                    </div>
                    {linkedTask && (
                      <button
                        className="ml-4 px-2 py-1 bg-theme-primary-light text-theme-primary-dark rounded-full text-xs font-semibold hover:bg-theme-primary-light transition"
                        onClick={() => onTaskLinkClick && onTaskLinkClick(linkedTask)}
                        title="View Task in Sort Deadlines"
                      >
                        View Task
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Manager Notes Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 lg:p-6 flex-1 flex flex-col">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Manager Notes
          </h2>
          
          {/* Team Announcements */}
          {teamAnnouncements.length > 0 && (
            <div className="mb-4">
              <h3 className="text-md font-semibold text-gray-700 mb-2">Team Announcements</h3>
              <div className="space-y-2">
                {teamAnnouncements.map(announcement => (
                  <div key={announcement.id} className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-500 rounded p-3 relative">
                    {/* Name on top */}
                    <div className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                      {announcement.senderName || announcement.senderEmail}
                    </div>
                    
                    {/* Date and time underneath */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {formatMessageDate(announcement.createdAt)}
                    </div>
                    
                    {/* Message content */}
                    <div className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
                      {announcement.content}
                    </div>
                    
                    {/* Trash icon in top-right corner */}
                    {(hasPermission(ROLES.ADMIN) || hasPermission(ROLES.OWNER)) && (
                      <button
                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                        className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors duration-200 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30"
                        title="Delete Announcement"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes List */}
          <div className="flex-1 space-y-3">
            {notes.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 text-center py-8 h-full flex flex-col justify-center">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg dark:text-gray-300">No notes yet</p>
              </div>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 relative">
                  {/* Name on top */}
                  <div className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                    {note.managerName || 'Manager'}
                  </div>
                  
                  {/* Date and time underneath */}
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    {format(new Date(note.timestamp), 'MMM d, yyyy h:mm a')}
                  </div>
                  
                  {/* Message content */}
                  <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap text-sm leading-relaxed">
                    {note.text}
                  </div>
                  
                  {/* Trash icon in top-right corner */}
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors duration-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"
                    title="Delete Note"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Department Progress Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 lg:p-6 flex-1 flex flex-col">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Department Progress ({new Date().getFullYear()})
          </h2>
          
          <div className="flex-1 space-y-4">
            {(() => {
              const departmentStats = getDepartmentProgress();
              return Object.entries(departmentStats).map(([deptId, stats]) => (
                <div key={deptId} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800 dark:text-white text-sm">
                      {stats.name}
                    </h3>
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                      {stats.progress}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.progress}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{stats.completed} of {stats.total} complete</span>
                    <span className="font-medium">{stats.total > 0 ? `${stats.completed}/${stats.total}` : 'No tasks'}</span>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Project Progress Bars */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 lg:p-6 flex-1 flex flex-col">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Project Progress ({new Date().getFullYear()})
          </h2>
          
          <div className="flex-1 space-y-4">
            {(() => {
              const projectStats = getProjectProgress();
              return Object.entries(projectStats)
                .sort(([,a], [,b]) => b.progress - a.progress) // Sort by progress descending
                .map(([projectName, stats]) => (
                  <div key={projectName} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-800 dark:text-white text-sm truncate">
                        {projectName}
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="relative w-8 h-8">
                          <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 36 36">
                            <path
                              className="text-gray-200 dark:text-gray-600"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                              className="text-blue-500"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeDasharray={`${stats.progress}, 100`}
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold text-gray-800 dark:text-white">
                              {stats.progress}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{stats.completed} of {stats.total} complete</span>
                      <span className="font-medium">{stats.total > 0 ? `${stats.completed}/${stats.total}` : 'No tasks'}</span>
                    </div>
                  </div>
                ));
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard; 