import { sharePointService } from './graphService';

const TASKS_LIST_NAME = 'Tasks';

// Cache for user lookup mapping
let userLookupCache = null;

export const microsoftDataService = {
  // Build email to LookupId mapping from existing tasks
  buildUserLookupMap: async () => {
    if (userLookupCache) return userLookupCache;
    
    try {
      const lists = await sharePointService.getLists();
      let tasksList = lists.find(l => l.displayName === TASKS_LIST_NAME || l.name === TASKS_LIST_NAME);
      
      if (!tasksList) return {};
      
      const items = await sharePointService.getListItems(tasksList.id);
      const lookupMap = {};
      
      // Extract all unique user LookupIds from existing tasks
      items.forEach(item => {
        const rpField = item.fields?.ResponsibleParty;
        if (rpField && Array.isArray(rpField)) {
          rpField.forEach(person => {
            if (person.Email && person.LookupId) {
              lookupMap[person.Email] = person.LookupId;
            }
          });
        }
      });
      
      console.log('Built user lookup map:', lookupMap);
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

    update: async (taskData) => {
      try {
        const lists = await sharePointService.getLists();
        let tasksList = lists.find(l => l.displayName === TASKS_LIST_NAME || l.name === TASKS_LIST_NAME);

        if (!tasksList) throw new Error('Tasks list not found');

        const sharePointFields = {};
        let hasResponsibleParty = false;
        let responsiblePartyIds = [];
        
        if (taskData.Task) sharePointFields.Title = taskData.Task;
        if (taskData.Project) sharePointFields.Project = taskData.Project;
        if (taskData.Deadline) sharePointFields.Deadline = taskData.Deadline;
        
        // Format ResponsibleParty for SharePoint REST API
        // REST API uses ResponsiblePartyId field with array of IDs
        if (taskData.ResponsibleParty) {
          const emails = taskData.ResponsibleParty.split(';').map(e => e.trim()).filter(e => e);
          const lookupMap = await microsoftDataService.buildUserLookupMap();
          
          // Get LookupIds as array for REST API
          responsiblePartyIds = emails.map(email => lookupMap[email]).filter(id => id);
          
          if (responsiblePartyIds.length > 0) {
            hasResponsibleParty = true;
            // For REST API, use ResponsiblePartyId with { results: [ids] }
            sharePointFields.ResponsiblePartyId = { results: responsiblePartyIds };
            console.log('Sending ResponsiblePartyId for REST API:', responsiblePartyIds);
          }
        }
        
        sharePointFields.Recurring = taskData.Recurring ? 'Yes' : 'No';
        sharePointFields['Completed_x003f_'] = taskData.Completed ? 'Yes' : 'No';
        
        if (taskData.Interval) sharePointFields.Interval = taskData.Interval;
        if (taskData.FinalDate) sharePointFields.Final_x0020_Date = taskData.FinalDate;
        
        sharePointFields.Priority = (taskData.Priority === 'Urgent') ? 'Urgent' : 'Normal';
        
        if (taskData.Notes) sharePointFields.Notes = taskData.Notes;
        if (taskData.Link) sharePointFields.Link = taskData.Link;

        console.log('Updating task:', sharePointFields);
        
        // Use SharePoint REST API if ResponsibleParty is being updated
        if (hasResponsibleParty) {
          console.log('Using SharePoint REST API for Person field update');
          await sharePointService.updateListItemREST(tasksList.id, taskData.id, sharePointFields);
        } else {
          // Use Microsoft Graph for other fields
          await sharePointService.updateListItem(tasksList.id, taskData.id, sharePointFields);
        }
        
        console.log('Task updated successfully');
        
        return { id: taskData.id, ...taskData };
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
  }
};
