import * as React from 'react';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { ITask, ITaskOverride } from '../../../services/SharePointService';
export interface ICcProjectManagerProps {
    description: string;
    context: WebPartContext;
}
export interface ICcProjectManagerState {
    tasks: ITask[];
    overrides: ITaskOverride[];
    activeTab: string;
    sortOption: string;
    filterValue: string;
    filterYear: string;
    filterMonth: string;
    filterDay: string;
    showIncompleteOnly: boolean;
    loading: boolean;
    error: string | null;
}
export declare class CcProjectManager extends React.Component<ICcProjectManagerProps, ICcProjectManagerState> {
    private sharePointService;
    constructor(props: ICcProjectManagerProps);
    componentDidMount(): Promise<void>;
    private loadData;
    private parseDeadlineDate;
    private expandRecurringTasks;
    private getFilteredSortedTasks;
    private handleAddTask;
    private handleDeleteTask;
    private handleToggleCompleted;
    private handleToggleUrgent;
    render(): React.ReactElement<ICcProjectManagerProps>;
}
//# sourceMappingURL=CcProjectManager.d.ts.map