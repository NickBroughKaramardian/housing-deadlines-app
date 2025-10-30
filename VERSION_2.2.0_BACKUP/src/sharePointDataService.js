import { microsoftDataService } from './microsoftDataService';
import { sharePointService } from './graphService';

// SharePoint Data Service - replaces Firebase operations
export const sharePointDataService = {
  // Tasks operations
  tasks: {
    async getAll() {
      try {
        const tasksData = await sharePointService.getList('Tasks');
        return tasksData.map(task => ({
          id: task.id,
          title: task.fields?.Title || '',
          description: task.fields?.Description || '',
          deadline: task.fields?.Deadline ? new Date(task.fields.Deadline) : null,
          responsibleParty: task.fields?.ResponsibleParty || '',
          projectName: task.fields?.ProjectName || '',
          status: task.fields?.Status || 'Not Started',
          priority: task.fields?.Priority || 'Medium',
          department: task.fields?.Department || '',
          notes: task.fields?.Notes || '',
          documentLink: task.fields?.DocumentLink || '',
          isRecurring: task.fields?.IsRecurring || false,
          recurrencePattern: task.fields?.RecurrencePattern || '',
          createdBy: task.fields?.CreatedBy || '',
          createdDate: task.fields?.CreatedDate ? new Date(task.fields.CreatedDate) : new Date(),
          modifiedBy: task.fields?.ModifiedBy || '',
          modifiedDate: task.fields?.ModifiedDate ? new Date(task.fields.ModifiedDate) : new Date()
        }));
      } catch (error) {
        console.error('Error getting tasks:', error);
        return [];
      }
    },

    async add(taskData) {
      try {
        const sharePointFields = {
          Title: taskData.title || '',
          Description: taskData.description || '',
          Deadline: taskData.deadline ? taskData.deadline.toISOString() : null,
          ResponsibleParty: taskData.responsibleParty || '',
          ProjectName: taskData.projectName || '',
          Status: taskData.status || 'Not Started',
          Priority: taskData.priority || 'Medium',
          Department: taskData.department || '',
          Notes: taskData.notes || '',
          DocumentLink: taskData.documentLink || '',
          IsRecurring: taskData.isRecurring || false,
          RecurrencePattern: taskData.recurrencePattern || '',
          CreatedBy: taskData.createdBy || '',
          CreatedDate: new Date().toISOString(),
          ModifiedBy: taskData.modifiedBy || '',
          ModifiedDate: new Date().toISOString()
        };
        
        const response = await sharePointService.addListItem('Tasks', sharePointFields);
        return { id: response.id, ...taskData };
      } catch (error) {
        console.error('Error adding task:', error);
        throw error;
      }
    },

    async update(taskId, taskData) {
      try {
        const sharePointFields = {
          Title: taskData.title || '',
          Description: taskData.description || '',
          Deadline: taskData.deadline ? taskData.deadline.toISOString() : null,
          ResponsibleParty: taskData.responsibleParty || '',
          ProjectName: taskData.projectName || '',
          Status: taskData.status || 'Not Started',
          Priority: taskData.priority || 'Medium',
          Department: taskData.department || '',
          Notes: taskData.notes || '',
          DocumentLink: taskData.documentLink || '',
          IsRecurring: taskData.isRecurring || false,
          RecurrencePattern: taskData.recurrencePattern || '',
          ModifiedBy: taskData.modifiedBy || '',
          ModifiedDate: new Date().toISOString()
        };
        
        await sharePointService.updateListItem('Tasks', taskId, sharePointFields);
        return { id: taskId, ...taskData };
      } catch (error) {
        console.error('Error updating task:', error);
        throw error;
      }
    },

    async delete(taskId) {
      try {
        await sharePointService.deleteListItem('Tasks', taskId);
        return true;
      } catch (error) {
        console.error('Error deleting task:', error);
        throw error;
      }
    }
  },

  // Users operations
  users: {
    async getAll() {
      try {
        const usersData = await sharePointService.getList('Users');
        return usersData.map(user => ({
          id: user.id,
          displayName: user.fields?.DisplayName || user.fields?.Title || '',
          email: user.fields?.Email || '',
          role: user.fields?.Role || 'viewer',
          departments: user.fields?.Departments ? JSON.parse(user.fields.Departments) : [],
          isActive: user.fields?.IsActive !== false,
          createdDate: user.fields?.CreatedDate ? new Date(user.fields.CreatedDate) : new Date()
        }));
      } catch (error) {
        console.error('Error getting users:', error);
        return [];
      }
    },

    async add(userData) {
      try {
        const sharePointFields = {
          Title: userData.displayName || userData.email || '',
          DisplayName: userData.displayName || '',
          Email: userData.email || '',
          Role: userData.role || 'viewer',
          Departments: JSON.stringify(userData.departments || []),
          IsActive: userData.isActive !== false,
          CreatedDate: new Date().toISOString()
        };
        
        const response = await sharePointService.addListItem('Users', sharePointFields);
        return { id: response.id, ...userData };
      } catch (error) {
        console.error('Error adding user:', error);
        throw error;
      }
    },

    async update(userId, userData) {
      try {
        const sharePointFields = {
          Title: userData.displayName || userData.email || '',
          DisplayName: userData.displayName || '',
          Email: userData.email || '',
          Role: userData.role || 'viewer',
          Departments: JSON.stringify(userData.departments || []),
          IsActive: userData.isActive !== false
        };
        
        await sharePointService.updateListItem('Users', userId, sharePointFields);
        return { id: userId, ...userData };
      } catch (error) {
        console.error('Error updating user:', error);
        throw error;
      }
    },

    async delete(userId) {
      try {
        await sharePointService.deleteListItem('Users', userId);
        return true;
      } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
      }
    }
  },

  // Checklist Templates operations
  checklistTemplates: {
    async getAll() {
      try {
        const templatesData = await sharePointService.getList('ChecklistTemplates');
        return templatesData.map(template => ({
          id: template.id,
          name: template.fields?.Name || template.fields?.Title || '',
          description: template.fields?.Description || '',
          items: template.fields?.Items ? JSON.parse(template.fields.Items) : [],
          createdBy: template.fields?.CreatedBy || '',
          createdDate: template.fields?.CreatedDate ? new Date(template.fields.CreatedDate) : new Date()
        }));
      } catch (error) {
        console.error('Error getting checklist templates:', error);
        return [];
      }
    },

    async add(templateData) {
      try {
        const sharePointFields = {
          Title: templateData.name || '',
          Name: templateData.name || '',
          Description: templateData.description || '',
          Items: JSON.stringify(templateData.items || []),
          CreatedBy: templateData.createdBy || '',
          CreatedDate: new Date().toISOString()
        };
        
        const response = await sharePointService.addListItem('ChecklistTemplates', sharePointFields);
        return { id: response.id, ...templateData };
      } catch (error) {
        console.error('Error adding checklist template:', error);
        throw error;
      }
    },

    async update(templateId, templateData) {
      try {
        const sharePointFields = {
          Title: templateData.name || '',
          Name: templateData.name || '',
          Description: templateData.description || '',
          Items: JSON.stringify(templateData.items || [])
        };
        
        await sharePointService.updateListItem('ChecklistTemplates', templateId, sharePointFields);
        return { id: templateId, ...templateData };
      } catch (error) {
        console.error('Error updating checklist template:', error);
        throw error;
      }
    },

    async delete(templateId) {
      try {
        await sharePointService.deleteListItem('ChecklistTemplates', templateId);
        return true;
      } catch (error) {
        console.error('Error deleting checklist template:', error);
        throw error;
      }
    }
  },

  // Checklists operations
  checklists: {
    async getAll() {
      try {
        const checklistsData = await sharePointService.getList('Checklists');
        return checklistsData.map(checklist => ({
          id: checklist.id,
          templateId: checklist.fields?.TemplateId || '',
          templateName: checklist.fields?.Title || '',
          projectName: checklist.fields?.ProjectName || '',
          items: checklist.fields?.Items ? JSON.parse(checklist.fields.Items) : [],
          status: checklist.fields?.Status || 'Active',
          createdBy: checklist.fields?.CreatedBy || '',
          createdDate: checklist.fields?.CreatedDate ? new Date(checklist.fields.CreatedDate) : new Date()
        }));
      } catch (error) {
        console.error('Error getting checklists:', error);
        return [];
      }
    },

    async add(checklistData) {
      try {
        const sharePointFields = {
          Title: checklistData.templateName || '',
          TemplateId: checklistData.templateId || '',
          ProjectName: checklistData.projectName || '',
          Items: JSON.stringify(checklistData.items || []),
          Status: checklistData.status || 'Active',
          CreatedBy: checklistData.createdBy || '',
          CreatedDate: new Date().toISOString()
        };
        
        const response = await sharePointService.addListItem('Checklists', sharePointFields);
        return { id: response.id, ...checklistData };
      } catch (error) {
        console.error('Error adding checklist:', error);
        throw error;
      }
    },

    async update(checklistId, checklistData) {
      try {
        const sharePointFields = {
          Title: checklistData.templateName || '',
          TemplateId: checklistData.templateId || '',
          ProjectName: checklistData.projectName || '',
          Items: JSON.stringify(checklistData.items || []),
          Status: checklistData.status || 'Active'
        };
        
        await sharePointService.updateListItem('Checklists', checklistId, sharePointFields);
        return { id: checklistId, ...checklistData };
      } catch (error) {
        console.error('Error updating checklist:', error);
        throw error;
      }
    },

    async delete(checklistId) {
      try {
        await sharePointService.deleteListItem('Checklists', checklistId);
        return true;
      } catch (error) {
        console.error('Error deleting checklist:', error);
        throw error;
      }
    }
  },

  // Messages operations
  messages: {
    async getAll() {
      try {
        const messagesData = await sharePointService.getList('Messages');
        return messagesData.map(message => ({
          id: message.id,
          subject: message.fields?.Title || '',
          content: message.fields?.Content || '',
          type: message.fields?.Type || 'Direct',
          senderId: message.fields?.SenderId || '',
          senderName: message.fields?.SenderName || '',
          recipientId: message.fields?.RecipientId || '',
          isAnnouncement: message.fields?.IsAnnouncement || false,
          createdDate: message.fields?.CreatedDate ? new Date(message.fields.CreatedDate) : new Date()
        }));
      } catch (error) {
        console.error('Error getting messages:', error);
        return [];
      }
    },

    async add(messageData) {
      try {
        const sharePointFields = {
          Title: messageData.subject || '',
          Content: messageData.content || '',
          Type: messageData.type || 'Direct',
          SenderId: messageData.senderId || '',
          SenderName: messageData.senderName || '',
          RecipientId: messageData.recipientId || '',
          IsAnnouncement: messageData.isAnnouncement || false,
          CreatedDate: new Date().toISOString()
        };
        
        const response = await sharePointService.addListItem('Messages', sharePointFields);
        return { id: response.id, ...messageData };
      } catch (error) {
        console.error('Error adding message:', error);
        throw error;
      }
    },

    async update(messageId, messageData) {
      try {
        const sharePointFields = {
          Title: messageData.subject || '',
          Content: messageData.content || '',
          Type: messageData.type || 'Direct',
          SenderId: messageData.senderId || '',
          SenderName: messageData.senderName || '',
          RecipientId: messageData.recipientId || '',
          IsAnnouncement: messageData.isAnnouncement || false
        };
        
        await sharePointService.updateListItem('Messages', messageId, sharePointFields);
        return { id: messageId, ...messageData };
      } catch (error) {
        console.error('Error updating message:', error);
        throw error;
      }
    },

    async delete(messageId) {
      try {
        await sharePointService.deleteListItem('Messages', messageId);
        return true;
      } catch (error) {
        console.error('Error deleting message:', error);
        throw error;
      }
    }
  }
};
