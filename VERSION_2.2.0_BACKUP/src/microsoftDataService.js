import { sharePointService } from './graphService';

const TASKS_LIST_NAME = 'Tasks';

// Cache for user lookup mapping
let userLookupCache = null;

export const microsoftDataService = {
  // Clear the user lookup cache
  clearUserLookupCache: () => {
    console.log('Clearing user lookup cache');
    userLookupCache = null;
  },
  // Build email to LookupId mapping from existing tasks
  buildUserLookupMap: async () => {
    if (userLookupCache) {
      console.log('Using cached user lookup map:', userLookupCache);
      return userLookupCache;
    }
    
    try {
      console.log('Building user lookup map from site users...');
      const siteUsers = await sharePointService.getSiteUsers();
      const lookupMap = {};
      
      // Build map from site users
      siteUsers.forEach(userItem => {
        const fields = userItem.fields || userItem;
        const email = fields.EMail || fields.Email || fields.mail;
        const id = fields.Id || fields.id || userItem.id;
        
        if (email && id) {
          const numericId = parseInt(id, 10);
          lookupMap[email] = numericId;
          lookupMap[email.toLowerCase()] = numericId;
          console.log('Added to lookup map:', email, '→', numericId);
        }
      });
      
      // If no users found via site users, fallback to extracting from existing tasks
      if (Object.keys(lookupMap).length === 0) {
        console.log('No users from getSiteUsers, falling back to task extraction...');
        const lists = await sharePointService.getLists();
        let tasksList = lists.find(l => l.displayName === TASKS_LIST_NAME || l.name === TASKS_LIST_NAME);
        
        if (tasksList) {
          const items = await sharePointService.getListItems(tasksList.id);
          items.forEach(item => {
            const rpField = item.fields?.ResponsibleParty;
            if (rpField && Array.isArray(rpField)) {
              rpField.forEach(person => {
                if (person.Email && person.LookupId) {
                  const numericId = parseInt(person.LookupId, 10);
                  lookupMap[person.Email] = numericId;
                  lookupMap[person.Email.toLowerCase()] = numericId;
                }
              });
            }
          });
        }
      }
      
      console.log('Built user lookup map:', lookupMap);
      userLookupCache = lookupMap;
      return lookupMap;
    } catch (error) {
      console.error('Error building user lookup map:', error);
      return {};
    }
  },

  tasks: {
    getAll: async () => {
      try {
        const lists = await sharePointService.getLists();
        let tasksList = lists.find(l => l.displayName === TASKS_LIST_NAME || l.name === TASKS_LIST_NAME);

        if (!tasksList) return [];

        const items = await sharePointService.getListItems(tasksList.id);
        
        // Build lookup map
        await microsoftDataService.buildUserLookupMap();
        
        const tasks = items.map(item => {
          const fields = item.fields || {};
          
          let responsibleParty = '';
          const rpField = fields.ResponsibleParty;
          
          if (rpField && Array.isArray(rpField)) {
            const emails = rpField.map(p => p.Email || '').filter(e => e);
            responsibleParty = emails.join('; ');
          } else if (rpField && typeof rpField === 'object') {
            responsibleParty = rpField.Email || '';
          }

          return {
            id: item.id,
            Task: fields.Title || '',
            Project: fields.Project || '',
            Deadline: fields.Deadline || '',
            ResponsibleParty: responsibleParty,
            Recurring: fields.Recurring === 'Yes',
            Interval: fields.Interval || '',
            FinalDate: fields.FinalDate || '',
            Priority: fields.Priority || 'Normal',
            Completed: fields['Completed_x003f_'] === 'Yes',
            Notes: fields.Notes || '',
            Link: fields.Link || ''
          };
        });

        console.log(`Retrieved ${tasks.length} tasks`);
        return tasks;
      } catch (error) {
        console.error('Error getting tasks:', error);
        return [];
      }
    },

    add: async (taskData) => {
      try {
        const lists = await sharePointService.getLists();
        let tasksList = lists.find(l => l.displayName === TASKS_LIST_NAME || l.name === TASKS_LIST_NAME);

        if (!tasksList) throw new Error('Tasks list not found');

        const sharePointFields = { Title: taskData.Task };

        if (taskData.Project) sharePointFields.Project = taskData.Project;
        if (taskData.Deadline) sharePointFields.Deadline = taskData.Deadline;
        
        // Format ResponsibleParty for SharePoint Person field
        // Microsoft Graph expects ResponsiblePartyLookupId as comma-separated string of IDs
        if (taskData.ResponsibleParty) {
          const emails = taskData.ResponsibleParty.split(';').map(e => e.trim()).filter(e => e);
          const lookupMap = await microsoftDataService.buildUserLookupMap();
          
          // Get LookupIds and format as comma-separated string
          const lookupIds = emails.map(email => lookupMap[email]).filter(id => id);
          
          if (lookupIds.length > 0) {
            // Send as comma-separated string: "7,18"
            sharePointFields.ResponsiblePartyLookupId = lookupIds.join(',');
            console.log('Sending ResponsiblePartyLookupId as string:', sharePointFields.ResponsiblePartyLookupId);
          }
        }
        
        sharePointFields.Recurring = taskData.Recurring ? 'Yes' : 'No';
        sharePointFields['Completed_x003f_'] = taskData.Completed ? 'Yes' : 'No';
        
        if (taskData.Interval) sharePointFields.Interval = taskData.Interval;
        if (taskData.FinalDate) sharePointFields.Final_x0020_Date = taskData.FinalDate;
        
        sharePointFields.Priority = (taskData.Priority === 'Urgent') ? 'Urgent' : 'Normal';
        
        if (taskData.Notes) sharePointFields.Notes = taskData.Notes;
        if (taskData.Link) sharePointFields.Link = taskData.Link;

        console.log('Adding task:', sharePointFields);
        const result = await sharePointService.addListItem(tasksList.id, sharePointFields);
        
        return { id: result.id, ...taskData };
      } catch (error) {
        console.error('Error adding task:', error);
        throw error;
      }
    },

    update: async (taskId, updates) => {
      try {
        const lists = await sharePointService.getLists();
        let tasksList = lists.find(l => l.displayName === TASKS_LIST_NAME || l.name === TASKS_LIST_NAME);

        if (!tasksList) throw new Error('Tasks list not found');

        const sharePointFields = {};
        let hasResponsibleParty = false;
        let responsiblePartyIds = [];
        
        if (updates.hasOwnProperty('Task')) sharePointFields.Title = updates.Task;
        if (updates.hasOwnProperty('Project')) sharePointFields.Project = updates.Project;
        if (updates.hasOwnProperty('Deadline')) sharePointFields.Deadline = updates.Deadline;
        
        // Format ResponsibleParty for SharePoint REST API
        // REST API uses ResponsiblePartyId field with array of IDs
        if (updates.hasOwnProperty('ResponsibleParty') && updates.ResponsibleParty) {
          console.log('MicrosoftDataService: Processing ResponsibleParty update:', updates.ResponsibleParty);
          const emails = updates.ResponsibleParty.split(';').map(e => e.trim()).filter(e => e);
          console.log('MicrosoftDataService: Parsed emails:', emails);
          
          const lookupMap = await microsoftDataService.buildUserLookupMap();
          console.log('MicrosoftDataService: User lookup map:', lookupMap);
          
          // Get LookupIds as array for REST API (try case-insensitive lookup)
          responsiblePartyIds = emails.map(email => {
            const id = lookupMap[email] || lookupMap[email.toLowerCase()];
            console.log('MicrosoftDataService: Looking up email:', email, '→', id);
            // Convert to integer for SharePoint REST API
            return id ? parseInt(id, 10) : null;
          }).filter(id => id !== null);
          console.log('MicrosoftDataService: Resolved IDs:', responsiblePartyIds);
          
          if (responsiblePartyIds.length > 0) {
            hasResponsibleParty = true;
            // For REST API, use ResponsiblePartyId with { results: [ids] }
            sharePointFields.ResponsiblePartyId = { results: responsiblePartyIds };
            console.log('MicrosoftDataService: Sending ResponsiblePartyId for REST API:', responsiblePartyIds);
            console.log('MicrosoftDataService: ResponsiblePartyId structure:', sharePointFields.ResponsiblePartyId);
          } else {
            console.warn('MicrosoftDataService: No valid IDs found for emails:', emails);
          }
        }
        
        // CRITICAL: Only set fields that are actually being updated!
        if (updates.hasOwnProperty('Recurring')) {
          sharePointFields.Recurring = updates.Recurring ? 'Yes' : 'No';
        }
        if (updates.hasOwnProperty('Completed') || updates.hasOwnProperty('Completed_x003f_')) {
          const completedValue = updates.Completed_x003f_ !== undefined ? updates.Completed_x003f_ : updates.Completed;
          sharePointFields['Completed_x003f_'] = completedValue ? 'Yes' : 'No';
        }
        
        // Only update these if they're explicitly in the updates object
        if (updates.hasOwnProperty('Interval')) {
          sharePointFields.Interval = updates.Interval;
        }
        if (updates.hasOwnProperty('FinalDate')) {
          sharePointFields.FinalDate = updates.FinalDate;
        }
        if (updates.hasOwnProperty('Priority')) {
          sharePointFields.Priority = (updates.Priority === 'Urgent') ? 'Urgent' : 'Normal';
        }
        if (updates.hasOwnProperty('Notes')) {
          sharePointFields.Notes = updates.Notes;
        }
        if (updates.hasOwnProperty('Link')) {
          sharePointFields.Link = updates.Link;
        }

        console.log('Updating task with fields:', sharePointFields);
        
        // Use SharePoint REST API if ResponsibleParty is being updated
        if (hasResponsibleParty) {
          console.log('Using SharePoint REST API for Person field update');
          await sharePointService.updateListItemREST(tasksList.id, taskId, sharePointFields);
        } else {
          // Use Microsoft Graph for other fields
          await sharePointService.updateListItem(tasksList.id, taskId, sharePointFields);
        }
        
        console.log('Task updated successfully');
        
        return { id: updates.id, ...updates };
      } catch (error) {
        console.error('Error updating task:', error);
        throw error;
      }
    },

    delete: async (taskId) => {
      try {
        const lists = await sharePointService.getLists();
        let tasksList = lists.find(l => l.displayName === TASKS_LIST_NAME || l.name === TASKS_LIST_NAME);

        if (!tasksList) throw new Error('Tasks list not found');

        await sharePointService.deleteListItem(tasksList.id, taskId);
        return { success: true };
      } catch (error) {
        console.error('Error deleting task:', error);
        throw error;
      }
    }
  },

  users: {
    getEnterpriseUsers: async () => {
      try {
        // Get enterprise users from Microsoft Graph
        const users = await sharePointService.getEnterpriseUsers();
        return users;
      } catch (error) {
        console.error('Error getting enterprise users:', error);
        throw error;
      }
    },

    update: async (userId, updates) => {
      try {
        // Update user departments in SharePoint Users list
        const lists = await sharePointService.getLists();
        let usersList = lists.find(l => l.displayName === 'Users' || l.name === 'Users');
        
        if (!usersList) {
          // Create Users list if it doesn't exist
          usersList = await sharePointService.createList('Users', 'Users list for department assignments');
        }

        await sharePointService.updateListItem(usersList.id, userId, updates);
        return { success: true };
      } catch (error) {
        console.error('Error updating user:', error);
        throw error;
      }
    }
  }
};
