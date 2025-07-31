import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { WebPartContext } from '@microsoft/sp-webpart-base';

export interface ITask {
  id?: string;
  projectName: string;
  description: string;
  deadline: string;
  responsibleParty: string;
  recurring: boolean;
  frequency?: string;
  finalYear?: string;
  important: boolean;
  completed: boolean;
  notes?: string;
  createdBy?: string;
  createdAt?: Date;
  organizationId?: string;
}

export interface ITaskOverride {
  id?: string;
  parentId: string;
  deadline: string;
  completed?: boolean;
  important?: boolean;
  notes?: string;
  deleted?: boolean;
  createdBy?: string;
  createdAt?: Date;
  organizationId?: string;
}

export class SharePointService {
  private context: WebPartContext;

  constructor(context: WebPartContext) {
    this.context = context;
  }

  // Initialize SharePoint lists for data storage
  async initializeLists(): Promise<void> {
    try {
      // Create Project Tasks list
      await this.createList('Project Tasks', [
        { Title: 'ProjectName', FieldTypeKind: 1 }, // Single line of text
        { Title: 'Description', FieldTypeKind: 1 },
        { Title: 'Deadline', FieldTypeKind: 4 }, // Date and Time
        { Title: 'ResponsibleParty', FieldTypeKind: 1 },
        { Title: 'Recurring', FieldTypeKind: 8 }, // Yes/No
        { Title: 'Frequency', FieldTypeKind: 1 },
        { Title: 'FinalYear', FieldTypeKind: 1 },
        { Title: 'Important', FieldTypeKind: 8 },
        { Title: 'Completed', FieldTypeKind: 8 },
        { Title: 'Notes', FieldTypeKind: 3 }, // Multi line of text
        { Title: 'CreatedBy', FieldTypeKind: 1 },
        { Title: 'CreatedAt', FieldTypeKind: 4 },
        { Title: 'OrganizationId', FieldTypeKind: 1 }
      ]);

      // Create Task Overrides list
      await this.createList('Task Overrides', [
        { Title: 'ParentId', FieldTypeKind: 1 },
        { Title: 'Deadline', FieldTypeKind: 4 },
        { Title: 'Completed', FieldTypeKind: 8 },
        { Title: 'Important', FieldTypeKind: 8 },
        { Title: 'Notes', FieldTypeKind: 3 },
        { Title: 'Deleted', FieldTypeKind: 8 },
        { Title: 'CreatedBy', FieldTypeKind: 1 },
        { Title: 'CreatedAt', FieldTypeKind: 4 },
        { Title: 'OrganizationId', FieldTypeKind: 1 }
      ]);

      console.log('SharePoint lists initialized successfully');
    } catch (error) {
      console.error('Error initializing SharePoint lists:', error);
    }
  }

  private async createList(listTitle: string, fields: any[]): Promise<void> {
    try {
      // Check if list exists
      const listExists = await this.listExists(listTitle);
      if (listExists) {
        console.log(`List '${listTitle}' already exists`);
        return;
      }

      // Create list
      const createListResponse = await this.context.spHttpClient.post(
        `${this.context.pageContext.web.absoluteUrl}/_api/web/lists`,
        SPHttpClient.configurations.v1,
        {
          headers: {
            'Accept': 'application/json;odata=nometadata',
            'Content-type': 'application/json;odata=nometadata',
            'odata-version': ''
          },
          body: JSON.stringify({
            Title: listTitle,
            BaseTemplate: 100, // Generic List
            AllowContentTypes: true,
            ContentTypesEnabled: true
          })
        }
      );

      if (createListResponse.ok) {
        const listData = await createListResponse.json();
        console.log(`List '${listTitle}' created with ID: ${listData.d.Id}`);

        // Add fields to the list
        for (const field of fields) {
          await this.addFieldToList(listTitle, field);
        }
      }
    } catch (error) {
      console.error(`Error creating list '${listTitle}':`, error);
    }
  }

  private async listExists(listTitle: string): Promise<boolean> {
    try {
      const response = await this.context.spHttpClient.get(
        `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('${listTitle}')`,
        SPHttpClient.configurations.v1
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  private async addFieldToList(listTitle: string, field: any): Promise<void> {
    try {
      await this.context.spHttpClient.post(
        `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('${listTitle}')/fields`,
        SPHttpClient.configurations.v1,
        {
          headers: {
            'Accept': 'application/json;odata=nometadata',
            'Content-type': 'application/json;odata=nometadata',
            'odata-version': ''
          },
          body: JSON.stringify({
            Title: field.Title,
            FieldTypeKind: field.FieldTypeKind
          })
        }
      );
    } catch (error) {
      console.error(`Error adding field '${field.Title}' to list '${listTitle}':`, error);
    }
  }

  // CRUD operations for tasks
  async getTasks(): Promise<ITask[]> {
    try {
      const response: SPHttpClientResponse = await this.context.spHttpClient.get(
        `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('Project Tasks')/items?$orderby=Deadline asc`,
        SPHttpClient.configurations.v1
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.value.map(this.mapSharePointItemToTask);
      }
      return [];
    } catch (error) {
      console.error('Error getting tasks:', error);
      return [];
    }
  }

  async addTask(task: ITask): Promise<string> {
    try {
      const response = await this.context.spHttpClient.post(
        `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('Project Tasks')/items`,
        SPHttpClient.configurations.v1,
        {
          headers: {
            'Accept': 'application/json;odata=nometadata',
            'Content-type': 'application/json;odata=nometadata',
            'odata-version': ''
          },
          body: JSON.stringify(this.mapTaskToSharePointItem(task))
        }
      );

      if (response.ok) {
        const result = await response.json();
        return result.d.Id.toString();
      }
      throw new Error('Failed to add task');
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  }

  async updateTask(taskId: string, updates: Partial<ITask>): Promise<void> {
    try {
      await this.context.spHttpClient.post(
        `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('Project Tasks')/items(${taskId})`,
        SPHttpClient.configurations.v1,
        {
          headers: {
            'Accept': 'application/json;odata=nometadata',
            'Content-type': 'application/json;odata=nometadata',
            'odata-version': '',
            'X-HTTP-Method': 'MERGE',
            'IF-MATCH': '*'
          },
          body: JSON.stringify(this.mapTaskToSharePointItem(updates))
        }
      );
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    try {
      await this.context.spHttpClient.post(
        `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('Project Tasks')/items(${taskId})`,
        SPHttpClient.configurations.v1,
        {
          headers: {
            'Accept': 'application/json;odata=nometadata',
            'Content-type': 'application/json;odata=nometadata',
            'odata-version': '',
            'X-HTTP-Method': 'DELETE',
            'IF-MATCH': '*'
          }
        }
      );
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  // CRUD operations for task overrides
  async getTaskOverrides(): Promise<ITaskOverride[]> {
    try {
      const response: SPHttpClientResponse = await this.context.spHttpClient.get(
        `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('Task Overrides')/items`,
        SPHttpClient.configurations.v1
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.value.map(this.mapSharePointItemToTaskOverride);
      }
      return [];
    } catch (error) {
      console.error('Error getting task overrides:', error);
      return [];
    }
  }

  async addTaskOverride(override: ITaskOverride): Promise<string> {
    try {
      const response = await this.context.spHttpClient.post(
        `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('Task Overrides')/items`,
        SPHttpClient.configurations.v1,
        {
          headers: {
            'Accept': 'application/json;odata=nometadata',
            'Content-type': 'application/json;odata=nometadata',
            'odata-version': ''
          },
          body: JSON.stringify(this.mapTaskOverrideToSharePointItem(override))
        }
      );

      if (response.ok) {
        const result = await response.json();
        return result.d.Id.toString();
      }
      throw new Error('Failed to add task override');
    } catch (error) {
      console.error('Error adding task override:', error);
      throw error;
    }
  }

  async updateTaskOverride(overrideId: string, updates: Partial<ITaskOverride>): Promise<void> {
    try {
      await this.context.spHttpClient.post(
        `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('Task Overrides')/items(${overrideId})`,
        SPHttpClient.configurations.v1,
        {
          headers: {
            'Accept': 'application/json;odata=nometadata',
            'Content-type': 'application/json;odata=nometadata',
            'odata-version': '',
            'X-HTTP-Method': 'MERGE',
            'IF-MATCH': '*'
          },
          body: JSON.stringify(this.mapTaskOverrideToSharePointItem(updates))
        }
      );
    } catch (error) {
      console.error('Error updating task override:', error);
      throw error;
    }
  }

  // Mapping functions
  private mapSharePointItemToTask(item: any): ITask {
    return {
      id: item.Id.toString(),
      projectName: item.ProjectName || '',
      description: item.Description || '',
      deadline: item.Deadline ? new Date(item.Deadline).toISOString().split('T')[0] : '',
      responsibleParty: item.ResponsibleParty || '',
      recurring: item.Recurring || false,
      frequency: item.Frequency || '',
      finalYear: item.FinalYear || '',
      important: item.Important || false,
      completed: item.Completed || false,
      notes: item.Notes || '',
      createdBy: item.CreatedBy || '',
      createdAt: item.CreatedAt ? new Date(item.CreatedAt) : new Date(),
      organizationId: item.OrganizationId || 'c-cdev'
    };
  }

  private mapTaskToSharePointItem(task: Partial<ITask>): any {
    return {
      ProjectName: task.projectName,
      Description: task.description,
      Deadline: task.deadline,
      ResponsibleParty: task.responsibleParty,
      Recurring: task.recurring,
      Frequency: task.frequency,
      FinalYear: task.finalYear,
      Important: task.important,
      Completed: task.completed,
      Notes: task.notes,
      CreatedBy: task.createdBy || this.context.pageContext.user.displayName,
      CreatedAt: task.createdAt || new Date(),
      OrganizationId: task.organizationId || 'c-cdev'
    };
  }

  private mapSharePointItemToTaskOverride(item: any): ITaskOverride {
    return {
      id: item.Id.toString(),
      parentId: item.ParentId || '',
      deadline: item.Deadline ? new Date(item.Deadline).toISOString().split('T')[0] : '',
      completed: item.Completed || false,
      important: item.Important || false,
      notes: item.Notes || '',
      deleted: item.Deleted || false,
      createdBy: item.CreatedBy || '',
      createdAt: item.CreatedAt ? new Date(item.CreatedAt) : new Date(),
      organizationId: item.OrganizationId || 'c-cdev'
    };
  }

  private mapTaskOverrideToSharePointItem(override: Partial<ITaskOverride>): any {
    return {
      ParentId: override.parentId,
      Deadline: override.deadline,
      Completed: override.completed,
      Important: override.important,
      Notes: override.notes,
      Deleted: override.deleted,
      CreatedBy: override.createdBy || this.context.pageContext.user.displayName,
      CreatedAt: override.createdAt || new Date(),
      OrganizationId: override.organizationId || 'c-cdev'
    };
  }
} 