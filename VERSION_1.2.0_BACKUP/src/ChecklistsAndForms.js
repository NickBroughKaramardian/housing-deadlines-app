import React, { useState, useEffect } from 'react';
import { useAuth } from './Auth';
import { db } from './firebase';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { getDepartmentFromResponsibleParty } from './Auth';

const ChecklistsAndForms = ({ tasks, addTask, updateTask, selectedChecklistFromTask, onChecklistSelected }) => {
  const { userProfile, hasPermission, ROLES } = useAuth();
  const [projects, setProjects] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [showAddChecklist, setShowAddChecklist] = useState(false);
  const [loading, setLoading] = useState(true);

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    items: [{ id: 1, text: '', required: true, assignee: '', notes: '', documentLink: '' }]
  });

  // Template editing state
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showEditTemplate, setShowEditTemplate] = useState(false);

  // Checklist editing state
  const [editingChecklist, setEditingChecklist] = useState(null);
  const [showEditChecklist, setShowEditChecklist] = useState(false);

  // Checklist form state
  const [checklistForm, setChecklistForm] = useState({
    projectId: '',
    templateId: '',
    name: '',
    description: '',
    deadline: '',
    responsibleParty: ''
  });

  useEffect(() => {
    if (!userProfile) return;

    // Get unique projects from tasks, excluding "repetitive" or similar test projects
    const uniqueProjects = [...new Set(tasks.map(task => task.projectName).filter(Boolean))];
    const filteredProjects = uniqueProjects
      .filter(name => !name.toLowerCase().includes('repetitive') && !name.toLowerCase().includes('test'))
      .map(name => ({ id: name, name }));
    setProjects(filteredProjects);

    // Load checklists
    const loadChecklists = async () => {
      try {
        const checklistsRef = collection(db, 'checklists');
        const q = query(checklistsRef, where('organizationId', '==', userProfile.organizationId));
        const querySnapshot = await getDocs(q);
        const checklistsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setChecklists(checklistsData);
      } catch (error) {
        console.error('Error loading checklists:', error);
      }
    };

    // Load templates
    const loadTemplates = async () => {
      try {
        const templatesRef = collection(db, 'checklistTemplates');
        const q = query(templatesRef, where('organizationId', '==', userProfile.organizationId));
        const querySnapshot = await getDocs(q);
        const templatesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTemplates(templatesData);
      } catch (error) {
        console.error('Error loading templates:', error);
      }
    };

    loadChecklists();
    loadTemplates();
    setLoading(false);
  }, [userProfile, tasks]);

  // Handle navigation from task document button
  useEffect(() => {
    if (selectedChecklistFromTask && checklists.length > 0) {
      const checklist = checklists.find(c => c.id === selectedChecklistFromTask);
      if (checklist) {
        // Find the project for this checklist
        const project = projects.find(p => p.name === checklist.projectName);
        if (project) {
          setSelectedProject(project);
          setSelectedChecklist(checklist);
          onChecklistSelected(); // Clear the selectedChecklistFromTask
        }
      }
    }
  }, [selectedChecklistFromTask, checklists, projects, onChecklistSelected]);

  const handleAddTemplateItem = () => {
    setTemplateForm(prev => ({
      ...prev,
      items: [...prev.items, {
        id: prev.items.length + 1,
        text: '',
        required: true,
        assignee: '',
        notes: '',
        documentLink: ''
      }]
    }));
  };

  const handleRemoveTemplateItem = (itemId) => {
    setTemplateForm(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const handleTemplateItemChange = (itemId, field, value) => {
    setTemplateForm(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim()) {
      alert('Please enter a template name');
      return;
    }

    try {
      const templateData = {
        ...templateForm,
        organizationId: userProfile.organizationId,
        createdBy: userProfile.uid,
        createdAt: new Date(),
        lastModified: new Date()
      };

      await addDoc(collection(db, 'checklistTemplates'), templateData);
      setShowAddTemplate(false);
      setTemplateForm({
        name: '',
        description: '',
        items: [{ id: 1, text: '', required: true, assignee: '', notes: '', documentLink: '' }]
      });
      
      // Reload templates
      const templatesRef = collection(db, 'checklistTemplates');
      const q = query(templatesRef, where('organizationId', '==', userProfile.organizationId));
      const querySnapshot = await getDocs(q);
      const templatesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template');
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description,
      items: template.items
    });
    setShowEditTemplate(true);
  };

  const handleUpdateTemplate = async () => {
    if (!templateForm.name.trim()) {
      alert('Please enter a template name');
      return;
    }

    try {
      const templateData = {
        ...templateForm,
        lastModified: new Date()
      };

      await updateDoc(doc(db, 'checklistTemplates', editingTemplate.id), templateData);
      setShowEditTemplate(false);
      setEditingTemplate(null);
      setTemplateForm({
        name: '',
        description: '',
        items: [{ id: 1, text: '', required: true, assignee: '', notes: '', documentLink: '' }]
      });
      
      // Reload templates
      const templatesRef = collection(db, 'checklistTemplates');
      const q = query(templatesRef, where('organizationId', '==', userProfile.organizationId));
      const querySnapshot = await getDocs(q);
      const templatesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error updating template:', error);
      alert('Error updating template');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'checklistTemplates', templateId));
      
      // Update local state
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      
      console.log('Template deleted successfully');
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error deleting template. Please try again.');
    }
  };

  const handleToggleFavorite = async (templateId, currentFavorite) => {
    try {
      await updateDoc(doc(db, 'checklistTemplates', templateId), {
        favorite: !currentFavorite,
        lastModified: new Date()
      });
      
      // Update local state
      setTemplates(prev => prev.map(t => 
        t.id === templateId ? { ...t, favorite: !currentFavorite } : t
      ));
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Error updating template. Please try again.');
    }
  };

  const handleAddChecklist = async () => {
    if (!checklistForm.projectId || !checklistForm.templateId) {
      alert('Please select both project and template');
      return;
    }

    try {
      const selectedTemplate = templates.find(t => t.id === checklistForm.templateId);
      if (!selectedTemplate) {
        alert('Template not found');
        return;
      }

      // Create checklist
      const checklistData = {
        projectId: checklistForm.projectId,
        projectName: checklistForm.projectId,
        templateId: checklistForm.templateId,
        name: checklistForm.name || selectedTemplate.name,
        description: checklistForm.description || selectedTemplate.description,
        items: selectedTemplate.items.map(item => ({
          ...item,
          completed: false,
          completedBy: '',
          completedAt: null,
          notes: '',
          assignee: item.assignee || ''
        })),
        organizationId: userProfile.organizationId,
        createdBy: userProfile.uid,
        createdAt: new Date(),
        lastModified: new Date()
      };

      const checklistRef = await addDoc(collection(db, 'checklists'), checklistData);

      // Add as a task to the main app
      const taskData = {
        projectName: checklistForm.projectId,
        description: `${checklistForm.name || selectedTemplate.name} - Checklist`,
        deadline: checklistForm.deadline || '',
        responsibleParty: checklistForm.responsibleParty || '',
        recurring: false,
        frequency: '',
        finalDate: '',
        important: false,
        notes: '',
        documentLink: '',
        checklistId: checklistRef.id,
        organizationId: userProfile.organizationId,
        createdBy: userProfile.uid,
        createdAt: new Date(),
        lastModified: new Date(),
        autoDepartment: getDepartmentFromResponsibleParty(checklistForm.responsibleParty || '', [])
      };

      await addTask(taskData);

      setShowAddChecklist(false);
      setChecklistForm({
        projectId: '',
        templateId: '',
        name: '',
        description: '',
        deadline: '',
        responsibleParty: ''
      });

      // Reload checklists
      const checklistsRef = collection(db, 'checklists');
      const q = query(checklistsRef, where('organizationId', '==', userProfile.organizationId));
      const querySnapshot = await getDocs(q);
      const checklistsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChecklists(checklistsData);
    } catch (error) {
      console.error('Error adding checklist:', error);
      alert('Error adding checklist');
    }
  };

  const handleChecklistItemToggle = async (checklistId, itemId, completed) => {
    try {
      const checklistRef = doc(db, 'checklists', checklistId);
      const checklist = checklists.find(c => c.id === checklistId);
      
      if (!checklist) return;

      const updatedItems = checklist.items.map(item =>
        item.id === itemId
          ? {
              ...item,
              completed,
              completedBy: completed ? userProfile.uid : '',
              completedAt: completed ? new Date() : null
            }
          : item
      );

      await updateDoc(checklistRef, {
        items: updatedItems,
        lastModified: new Date()
      });

      // Update local state
      setChecklists(prev => prev.map(c =>
        c.id === checklistId ? { ...c, items: updatedItems } : c
      ));

      // Check if checklist is now complete and update associated task
      await checkAndUpdateTaskStatus(checklistId, updatedItems);
    } catch (error) {
      console.error('Error updating checklist item:', error);
    }
  };

  const handleChecklistItemUpdate = async (checklistId, itemId, field, value) => {
    try {
      const checklistRef = doc(db, 'checklists', checklistId);
      const checklist = checklists.find(c => c.id === checklistId);
      
      if (!checklist) return;

      const updatedItems = checklist.items.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      );

      await updateDoc(checklistRef, {
        items: updatedItems,
        lastModified: new Date()
      });

      // Update local state
      setChecklists(prev => prev.map(c =>
        c.id === checklistId ? { ...c, items: updatedItems } : c
      ));
    } catch (error) {
      console.error('Error updating checklist item:', error);
    }
  };

  const handleChecklistItemProgress = async (checklistId, itemId, inProgress) => {
    try {
      const checklistRef = doc(db, 'checklists', checklistId);
      const checklist = checklists.find(c => c.id === checklistId);
      
      if (!checklist) return;

      const updatedItems = checklist.items.map(item => 
        item.id === itemId ? { ...item, inProgress } : item
      );

      await updateDoc(checklistRef, {
        items: updatedItems,
        lastModified: new Date()
      });

      // Update local state
      setChecklists(prev => prev.map(c => 
        c.id === checklistId ? { ...c, items: updatedItems } : c
      ));
    } catch (error) {
      console.error('Error updating checklist item progress:', error);
      alert('Error updating checklist item progress. Please try again.');
    }
  };

  const handleEditChecklistItem = (checklistId, item) => {
    // TODO: Implement edit modal for checklist items
    console.log('Edit checklist item:', item);
    alert('Edit functionality coming soon!');
  };

  const handleDeleteChecklistItem = async (checklistId, itemId) => {
    if (!window.confirm('Are you sure you want to delete this checklist item? This action cannot be undone.')) {
      return;
    }

    try {
      const checklistRef = doc(db, 'checklists', checklistId);
      const checklist = checklists.find(c => c.id === checklistId);
      
      if (!checklist) return;

      const updatedItems = checklist.items.filter(item => item.id !== itemId);

      await updateDoc(checklistRef, {
        items: updatedItems,
        lastModified: new Date()
      });

      // Update local state
      setChecklists(prev => prev.map(c => 
        c.id === checklistId ? { ...c, items: updatedItems } : c
      ));

      // Check if checklist is now complete and update associated task
      await checkAndUpdateTaskStatus(checklistId, updatedItems);
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      alert('Error deleting checklist item. Please try again.');
    }
  };

  // Function to check if checklist is complete and update associated task
  const checkAndUpdateTaskStatus = async (checklistId, items) => {
    try {
      // Find the associated task
      const associatedTask = tasks.find(task => task.checklistId === checklistId);
      if (!associatedTask) return;

      const isComplete = items.length > 0 && items.every(item => item.completed);
      
      // Update the task's completed status
      await updateTask({
        id: associatedTask.id,
        completed: isComplete,
        lastModified: new Date()
      });
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const getProjectChecklists = (projectName) => {
    return checklists.filter(checklist => checklist.projectName === projectName);
  };

  const handleEditChecklist = (checklist) => {
    setEditingChecklist(checklist);
    setShowEditChecklist(true);
  };

  const handleUpdateChecklist = async () => {
    if (!editingChecklist) return;

    try {
      const checklistRef = doc(db, 'checklists', editingChecklist.id);
      await updateDoc(checklistRef, {
        name: editingChecklist.name,
        description: editingChecklist.description,
        responsibleParty: editingChecklist.responsibleParty,
        lastModified: new Date()
      });

      // Update local state
      setChecklists(prev => prev.map(c => 
        c.id === editingChecklist.id ? editingChecklist : c
      ));

      // Also update the associated task if it exists
      const associatedTask = tasks.find(task => task.checklistId === editingChecklist.id);
      if (associatedTask) {
        await updateTask({
          id: associatedTask.id,
          description: `${editingChecklist.name} - Checklist`,
          responsibleParty: editingChecklist.responsibleParty,
          autoDepartment: getDepartmentFromResponsibleParty(editingChecklist.responsibleParty, []),
          lastModified: new Date()
        });
      }

      setShowEditChecklist(false);
      setEditingChecklist(null);
      console.log('Checklist updated successfully');
    } catch (error) {
      console.error('Error updating checklist:', error);
      alert('Error updating checklist. Please try again.');
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-theme-primary/10 rounded-lg">
              <svg className="w-6 h-6 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Checklists and Forms</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage project checklists and templates</p>
            </div>
          </div>
          {hasPermission(ROLES.EDITOR) && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {showTemplates ? 'Hide Templates' : 'Show Templates'}
              </button>
              <button
                onClick={() => setShowAddChecklist(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-theme-primary rounded-lg hover:bg-theme-primary-hover transition-colors"
              >
                Add Checklist
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Templates Section */}
      {showTemplates && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Templates
              </h3>
              <button
                onClick={() => setShowAddTemplate(true)}
                className="px-3 py-1.5 text-sm font-medium text-white bg-theme-primary rounded-lg hover:bg-theme-primary-hover transition-colors"
              >
                Add Template
              </button>
            </div>
          </div>

          <div className="p-6">
            {templates.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No templates created yet. Create your first template to get started.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map(template => (
                  <div key={template.id} className={`relative group overflow-hidden rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
                    template.favorite 
                      ? 'border-2 border-yellow-300 dark:border-yellow-600 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/20 shadow-md' 
                      : 'border border-gray-200 dark:border-gray-600 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 shadow-sm'
                  }`}>
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute top-0 right-0 w-24 h-24 transform translate-x-6 -translate-y-6">
                        <svg className="w-full h-full" viewBox="0 0 100 100" fill="currentColor">
                          <circle cx="20" cy="20" r="2" />
                          <circle cx="80" cy="20" r="2" />
                          <circle cx="50" cy="50" r="2" />
                          <circle cx="20" cy="80" r="2" />
                          <circle cx="80" cy="80" r="2" />
                        </svg>
                      </div>
                    </div>

                    {/* Favorite Star */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Star clicked for template:', template.id, 'current favorite:', template.favorite);
                        handleToggleFavorite(template.id, template.favorite);
                      }}
                      className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-300 hover:scale-110 z-10 cursor-pointer ${
                        template.favorite 
                          ? 'text-yellow-500 hover:text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 shadow-md' 
                          : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={template.favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <svg className="w-4 h-4" fill={template.favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>

                    <div className="relative p-5 pr-12">
                      {/* Template Icon */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${
                          template.favorite 
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' 
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        }`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h5 className="font-semibold text-gray-800 dark:text-white text-lg">
                          {template.name}
                        </h5>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                        {template.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              {template.items.length} items
                            </span>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditTemplate(template)}
                            className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-200 hover:scale-105"
                            title="Edit template"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200 hover:scale-105"
                            title="Delete template"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Projects Sidebar */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Projects</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {projects.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No projects found. Add tasks to create projects.
              </p>
            ) : (
              <div className="space-y-2">
                {projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedProject?.id === project.id
                        ? 'bg-theme-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <div className="font-medium">{project.name}</div>
                    <div className="text-sm opacity-75">
                      {getProjectChecklists(project.name).length} checklists
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Checklists Content */}
        <div className="flex-1 bg-white dark:bg-gray-800 flex flex-col">
          {selectedProject ? (
            <>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedProject.name} - Checklists
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                {getProjectChecklists(selectedProject.name).length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No checklists for this project yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {getProjectChecklists(selectedProject.name).map(checklist => (
                      <div key={checklist.id} className={`group relative overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-opacity-80 ${
                        checklist.items.length > 0 && checklist.items.every(item => item.completed)
                          ? 'border-green-200 dark:border-green-700 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20'
                          : 'border-gray-200 dark:border-gray-600 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800'
                      }`}>
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
                        
                        {/* Clickable overlay for the main content */}
                        <div 
                          className="relative p-5 cursor-pointer"
                          onClick={() => setSelectedChecklist(selectedChecklist?.id === checklist.id ? null : checklist)}
                        >
                          {/* Header with status badge */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white transition-all duration-200 group-hover:text-opacity-90">
                                {checklist.name}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {checklist.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              {/* Circular Progress Wheel */}
                              <div className="relative w-12 h-12">
                                <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                                  {/* Background circle */}
                                  <path
                                    d="M18 2.0845
                                      a 15.9155 15.9155 0 0 1 0 31.831
                                      a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="text-gray-200 dark:text-gray-700"
                                  />
                                  {/* Progress circle */}
                                  <path
                                    d="M18 2.0845
                                      a 15.9155 15.9155 0 0 1 0 31.831
                                      a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeDasharray={`${(checklist.items.filter(item => item.completed).length / checklist.items.length) * 100}, 100`}
                                    className={`transition-all duration-500 ease-in-out ${
                                      checklist.items.length > 0 && checklist.items.every(item => item.completed)
                                        ? 'text-green-500 dark:text-green-400'
                                        : 'text-blue-500 dark:text-blue-400'
                                    }`}
                                  />
                                </svg>
                                {/* Center text */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                    {checklist.items.length > 0 ? Math.round((checklist.items.filter(item => item.completed).length / checklist.items.length) * 100) : 0}%
                                  </span>
                                </div>
                              </div>
                              
                              {/* Status badge */}
                              <span className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm ${
                                checklist.items.length > 0 && checklist.items.every(item => item.completed)
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                              }`}>
                                {checklist.items.filter(item => item.completed).length}/{checklist.items.length} Complete
                              </span>
                              
                              {/* Action buttons - stop propagation to prevent panel click */}
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => setSelectedChecklist(selectedChecklist?.id === checklist.id ? null : checklist)}
                                  className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 rounded hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                                >
                                  {selectedChecklist?.id === checklist.id ? 'Hide' : 'View'}
                                </button>
                                {hasPermission(ROLES.EDITOR) && (
                                  <>
                                    <button
                                      onClick={() => handleEditChecklist(checklist)}
                                      className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                      title="Edit checklist"
                                    >
                                      Edit
                                    </button>

                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Checklist info */}
                          <div className="space-y-2">
                            
                            {checklist.deadline && (
                              <div className="flex items-center gap-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span className="font-medium text-gray-600 dark:text-gray-400">Due:</span>
                                  <span className="font-bold text-blue-800 dark:text-blue-200">
                                    {new Date(checklist.deadline).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Expanded checklist items */}
                        {selectedChecklist?.id === checklist.id && (
                          <div className="border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                            <div className="p-4 space-y-3">
                              {checklist.items.map((item, index) => {
                                // Determine item status and colors
                                const getItemStatus = () => {
                                  if (item.completed) {
                                    return {
                                      status: 'completed',
                                      bg: 'bg-green-500 text-white hover:bg-green-600',
                                      icon: 'text-green-600 dark:text-green-400',
                                      text: 'text-green-800 dark:text-green-200'
                                    };
                                  } else if (item.inProgress) {
                                    return {
                                      status: 'in-progress',
                                      bg: 'bg-yellow-500 text-white hover:bg-yellow-600',
                                      icon: 'text-yellow-600 dark:text-yellow-400',
                                      text: 'text-yellow-800 dark:text-yellow-200'
                                    };
                                  } else {
                                    return {
                                      status: 'incomplete',
                                      bg: 'bg-gray-500 text-white hover:bg-gray-600',
                                      icon: 'text-gray-600 dark:text-gray-400',
                                      text: 'text-gray-800 dark:text-gray-200'
                                    };
                                  }
                                };
                                
                                const itemStatus = getItemStatus();
                                
                                return (
                                  <div key={item.id} className={`group relative overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-opacity-80 ${
                                    item.completed 
                                      ? 'border-green-200 dark:border-green-700 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20'
                                      : item.inProgress
                                      ? 'border-yellow-200 dark:border-yellow-700 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20'
                                      : 'border-gray-200 dark:border-gray-600 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800'
                                  }`}>
                                    <div className="relative p-3">
                                      {/* Item Number */}
                                      <div className="absolute left-2 top-3 w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-xs font-bold text-gray-600 dark:text-gray-400">
                                        {index + 1}
                                      </div>
                                      
                                      {/* Item Header */}
                                      <div className="flex items-start justify-between ml-8">
                                        <div className="flex-1 min-w-0">
                                          <h4 className={`text-sm font-semibold transition-all duration-200 group-hover:text-opacity-90 ${
                                            item.completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'
                                          }`}>
                                            {item.text}
                                          </h4>
                                          <div className="flex items-center gap-2 mt-1">
                                            {item.assignee && (
                                              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                                {item.assignee}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {/* Status Badge */}
                                        <div className="flex items-center gap-2 ml-4">
                                          <span className={`px-2 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm ${
                                            item.completed 
                                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                              : item.inProgress
                                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                                              : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200'
                                          }`}>
                                            {item.completed ? 'COMPLETED' : item.inProgress ? 'IN PROGRESS' : 'INCOMPLETE'}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {/* Item Info */}
                                      {item.notes && (
                                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mt-2 ml-8">
                                          <svg className={`w-3 h-3 ${itemStatus.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                          </svg>
                                          <span>{item.notes}</span>
                                        </div>
                                      )}
                                      
                                      {/* Action Buttons */}
                                      <div className="flex items-center gap-1 mt-3 ml-8">
                                        {/* Complete Button */}
                                        <button
                                          onClick={() => handleChecklistItemToggle(checklist.id, item.id, !item.completed)}
                                          className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 transform hover:scale-110 ${
                                            item.completed 
                                              ? 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg hover:shadow-xl hover:shadow-green-200 dark:hover:shadow-green-900/30 hover:from-green-500 hover:to-green-700 ring-2 ring-green-200 dark:ring-green-800' 
                                              : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 hover:from-green-50 dark:hover:from-green-900/20 hover:to-green-100 dark:hover:to-green-800/20 border border-gray-200/50 dark:border-gray-600/50 shadow-md hover:shadow-lg'
                                          }`}
                                          title={item.completed ? 'Mark as Incomplete' : 'Mark as Completed'}
                                        >
                                          <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${item.completed ? 'scale-110' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
                                          </svg>
                                        </button>
                                        
                                        {/* In Progress Button */}
                                        <button
                                          onClick={() => handleChecklistItemProgress(checklist.id, item.id, !item.inProgress)}
                                          className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 transform hover:scale-110 ${
                                            item.inProgress 
                                              ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg hover:shadow-xl hover:shadow-yellow-200 dark:hover:shadow-yellow-900/30 hover:from-yellow-500 hover:to-yellow-700 ring-2 ring-yellow-200 dark:ring-yellow-800' 
                                              : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 text-gray-600 dark:text-gray-300 hover:text-yellow-600 dark:hover:text-yellow-400 hover:from-yellow-50 dark:hover:from-yellow-900/20 hover:to-yellow-100 dark:hover:to-yellow-800/20 border border-gray-200/50 dark:border-gray-600/50 shadow-md hover:shadow-lg'
                                          }`}
                                          title={item.inProgress ? 'Remove In Progress' : 'Mark as In Progress'}
                                        >
                                          <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${item.inProgress ? 'scale-110' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                        </button>
                                        
                                        {/* Edit Button */}
                                        {hasPermission(ROLES.EDITOR) && (
                                          <button
                                            onClick={() => handleEditChecklistItem(checklist.id, item)}
                                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-lg hover:shadow-xl hover:shadow-blue-200 dark:hover:shadow-blue-900/30 transition-all duration-300 transform hover:scale-110"
                                            title="Edit Item"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                        )}
                                        
                                        {/* Document Link Button */}
                                        {item.documentLink && (
                                          <button
                                            onClick={() => window.open(item.documentLink, '_blank')}
                                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700 text-white shadow-lg hover:shadow-xl hover:shadow-purple-200 dark:hover:shadow-purple-900/30 transition-all duration-300 transform hover:scale-110"
                                            title="Open Document"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                          </button>
                                        )}
                                        
                                        {/* Delete Button */}
                                        {hasPermission(ROLES.EDITOR) && (
                                          <button
                                            onClick={() => handleDeleteChecklistItem(checklist.id, item.id)}
                                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gradient-to-br from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 text-white shadow-lg hover:shadow-xl hover:shadow-red-200 dark:hover:shadow-red-900/30 transition-all duration-300 transform hover:scale-110"
                                            title="Delete Item"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400">Select a project to view its checklists</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Template Modal */}
      {showAddTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 flex-shrink-0">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                Create New Template
              </h3>
            </div>
            
            <div className="px-6 flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                <div className="grid grid-cols-2 gap-4 flex-shrink-0">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Template Name
                    </label>
                    <input
                      type="text"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., TCAC Application"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      rows="3"
                      placeholder="Description of this template..."
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex-shrink-0">
                    Checklist Items
                  </label>
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
                    {/* Header Row */}
                    <div className="bg-gray-50 dark:bg-gray-700 grid grid-cols-12 gap-1 p-2 text-xs font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 flex-shrink-0">
                      <div className="col-span-1 text-center">#</div>
                      <div className="col-span-6">Item Description</div>
                      <div className="col-span-3">Assignee</div>
                      <div className="col-span-2">Document Link</div>
                    </div>
                    
                    {/* Item Rows */}
                    <div className="divide-y divide-gray-200 dark:divide-gray-600 overflow-y-auto flex-1 min-h-0">
                      {templateForm.items.map((item, index) => (
                        <div key={item.id} className="grid grid-cols-12 gap-1 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <div className="col-span-1 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                            {index + 1}
                          </div>
                          <div className="col-span-6">
                            <input
                              type="text"
                              value={item.text}
                              onChange={(e) => handleTemplateItemChange(item.id, 'text', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                              placeholder="Item description..."
                            />
                          </div>
                          <div className="col-span-3">
                            <input
                              type="text"
                              value={item.assignee}
                              onChange={(e) => handleTemplateItemChange(item.id, 'assignee', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                              placeholder="Assignee"
                            />
                          </div>
                          <div className="col-span-2 flex items-center gap-1">
                            <input
                              type="text"
                              value={item.documentLink}
                              onChange={(e) => handleTemplateItemChange(item.id, 'documentLink', e.target.value)}
                              className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                              placeholder="Link"
                            />
                            <button
                              onClick={() => handleRemoveTemplateItem(item.id)}
                              className="px-1 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                              title="Remove item"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Add Row Button */}
                    <div className="p-2 border-t border-gray-200 dark:border-gray-600 flex-shrink-0">
                      <button
                        onClick={handleAddTemplateItem}
                        className="w-full px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400 hover:border-theme-primary hover:text-theme-primary transition-colors text-sm"
                      >
                        + Add Row
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 flex gap-3 flex-shrink-0 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowAddTemplate(false);
                  setTemplateForm({
                    name: '',
                    description: '',
                    items: [{ id: 1, text: '', required: true, assignee: '', notes: '', documentLink: '' }]
                  });
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors"
              >
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {showEditTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 flex-shrink-0">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                Edit Template
              </h3>
            </div>
            
            <div className="px-6 flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                <div className="grid grid-cols-2 gap-4 flex-shrink-0">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Template Name
                    </label>
                    <input
                      type="text"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., TCAC Application"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      rows="3"
                      placeholder="Description of this template..."
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex-shrink-0">
                    Checklist Items
                  </label>
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
                    {/* Header Row */}
                    <div className="bg-gray-50 dark:bg-gray-700 grid grid-cols-12 gap-1 p-2 text-xs font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 flex-shrink-0">
                      <div className="col-span-1 text-center">#</div>
                      <div className="col-span-6">Item Description</div>
                      <div className="col-span-3">Assignee</div>
                      <div className="col-span-2">Document Link</div>
                    </div>
                    
                    {/* Item Rows */}
                    <div className="divide-y divide-gray-200 dark:divide-gray-600 overflow-y-auto flex-1 min-h-0">
                      {templateForm.items.map((item, index) => (
                        <div key={item.id} className="grid grid-cols-12 gap-1 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <div className="col-span-1 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                            {index + 1}
                          </div>
                          <div className="col-span-6">
                            <input
                              type="text"
                              value={item.text}
                              onChange={(e) => handleTemplateItemChange(item.id, 'text', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                              placeholder="Item description..."
                            />
                          </div>
                          <div className="col-span-3">
                            <input
                              type="text"
                              value={item.assignee}
                              onChange={(e) => handleTemplateItemChange(item.id, 'assignee', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                              placeholder="Assignee"
                            />
                          </div>
                          <div className="col-span-2 flex items-center gap-1">
                            <input
                              type="text"
                              value={item.documentLink}
                              onChange={(e) => handleTemplateItemChange(item.id, 'documentLink', e.target.value)}
                              className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                              placeholder="Link"
                            />
                            <button
                              onClick={() => handleRemoveTemplateItem(item.id)}
                              className="px-1 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                              title="Remove item"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Add Row Button */}
                    <div className="p-2 border-t border-gray-200 dark:border-gray-600 flex-shrink-0">
                      <button
                        onClick={handleAddTemplateItem}
                        className="w-full px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400 hover:border-theme-primary hover:text-theme-primary transition-colors text-sm"
                      >
                        + Add Row
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 flex gap-3 flex-shrink-0 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowEditTemplate(false);
                  setEditingTemplate(null);
                  setTemplateForm({
                    name: '',
                    description: '',
                    items: [{ id: 1, text: '', required: true, assignee: '', notes: '', documentLink: '' }]
                  });
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateTemplate}
                className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors"
              >
                Update Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Checklist Modal */}
      {showEditChecklist && editingChecklist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                Edit Checklist
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Checklist Name
                  </label>
                  <input
                    type="text"
                    value={editingChecklist.name}
                    onChange={(e) => setEditingChecklist(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Checklist name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editingChecklist.description}
                    onChange={(e) => setEditingChecklist(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows="3"
                    placeholder="Description of this checklist..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Responsible Party
                  </label>
                  <input
                    type="text"
                    value={editingChecklist.responsibleParty || ''}
                    onChange={(e) => setEditingChecklist(prev => ({ ...prev, responsibleParty: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Who is responsible for this checklist"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditChecklist(false);
                    setEditingChecklist(null);
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateChecklist}
                  className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors"
                >
                  Update Checklist
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Checklist Modal */}
      {showAddChecklist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                Add Checklist to Project
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project
                  </label>
                  <select
                    value={checklistForm.projectId}
                    onChange={(e) => setChecklistForm(prev => ({ ...prev, projectId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select project...</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Template
                  </label>
                  <select
                    value={checklistForm.templateId}
                    onChange={(e) => setChecklistForm(prev => ({ ...prev, templateId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select template...</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Checklist Name (optional)
                  </label>
                  <input
                    type="text"
                    value={checklistForm.name}
                    onChange={(e) => setChecklistForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Will use template name if left blank"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Deadline (optional)
                  </label>
                  <input
                    type="date"
                    value={checklistForm.deadline}
                    onChange={(e) => setChecklistForm(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Responsible Party (optional)
                  </label>
                  <input
                    type="text"
                    value={checklistForm.responsibleParty}
                    onChange={(e) => setChecklistForm(prev => ({ ...prev, responsibleParty: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Who is responsible for this checklist"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddChecklist(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddChecklist}
                  className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors"
                >
                  Add Checklist
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecklistsAndForms; 