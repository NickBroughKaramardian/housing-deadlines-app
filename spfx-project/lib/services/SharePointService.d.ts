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
export declare class SharePointService {
    private context;
    constructor(context: WebPartContext);
    initializeLists(): Promise<void>;
    private createList;
    private listExists;
    private addFieldToList;
    getTasks(): Promise<ITask[]>;
    addTask(task: ITask): Promise<string>;
    updateTask(taskId: string, updates: Partial<ITask>): Promise<void>;
    deleteTask(taskId: string): Promise<void>;
    getTaskOverrides(): Promise<ITaskOverride[]>;
    addTaskOverride(override: ITaskOverride): Promise<string>;
    updateTaskOverride(overrideId: string, updates: Partial<ITaskOverride>): Promise<void>;
    private mapSharePointItemToTask;
    private mapTaskToSharePointItem;
    private mapSharePointItemToTaskOverride;
    private mapTaskOverrideToSharePointItem;
}
//# sourceMappingURL=SharePointService.d.ts.map