import * as React from 'react';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { SharePointService, ITask, ITaskOverride } from '../../../services/SharePointService';
import { parse, isValid } from 'date-fns';

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

export class CcProjectManager extends React.Component<ICcProjectManagerProps, ICcProjectManagerState> {
  private sharePointService: SharePointService;

  constructor(props: ICcProjectManagerProps) {
    super(props);
    
    this.sharePointService = new SharePointService(props.context);
    
    this.state = {
      tasks: [],
      overrides: [],
      activeTab: 'dashboard',
      sortOption: '',
      filterValue: '',
      filterYear: '',
      filterMonth: '',
      filterDay: '',
      showIncompleteOnly: false,
      loading: true,
      error: null
    };
  }

  public async componentDidMount(): Promise<void> {
    try {
      // Initialize SharePoint lists
      await this.sharePointService.initializeLists();
      
      // Load data
      await this.loadData();
    } catch (error) {
      console.error('Error initializing component:', error);
      this.setState({ error: 'Failed to initialize application', loading: false });
    }
  }

  private async loadData(): Promise<void> {
    try {
      const [tasks, overrides] = await Promise.all([
        this.sharePointService.getTasks(),
        this.sharePointService.getTaskOverrides()
      ]);

      this.setState({
        tasks,
        overrides,
        loading: false
      });
    } catch (error) {
      console.error('Error loading data:', error);
      this.setState({ error: 'Failed to load data', loading: false });
    }
  }

  private parseDeadlineDate(dateStr: string): Date | null {
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

  private expandRecurringTasks(tasks: ITask[]): ITask[] {
    let allOccurrences: ITask[] = [];
    const defaultYears = 50;

    tasks.forEach(task => {
      if (task.recurring && task.frequency && task.deadline) {
        const interval = parseInt(task.frequency, 10);
        if (isNaN(interval) || interval < 1) {
          allOccurrences.push({ ...task, id: task.id });
          return;
        }
        
        const startDate = this.parseDeadlineDate(task.deadline);
        if (!startDate) {
          allOccurrences.push({ ...task, id: task.id });
          return;
        }
        
        let endYear = parseInt(task.finalYear || '', 10);
        const defaultEndYear = startDate.getFullYear() + defaultYears;
        if (isNaN(endYear) || endYear > defaultEndYear) {
          endYear = defaultEndYear;
        }
        
        let current = new Date(startDate);
        while (current.getFullYear() <= endYear) {
          const instanceDate = new Date(current);
          if (instanceDate.getMonth() !== current.getMonth()) {
            instanceDate.setDate(0);
          }
          if (instanceDate.getFullYear() > endYear) break;
          
          const instanceDeadline = instanceDate.toISOString().split('T')[0];
          const override = this.state.overrides.find(o => o.parentId === task.id && o.deadline === instanceDeadline);
          
          if (override) {
            if (!override.deleted) {
              allOccurrences.push({
                ...task,
                ...override,
                completed: override.completed !== undefined ? override.completed : task.completed,
                important: override.important !== undefined ? override.important : task.important,
                id: `${task.id}_${instanceDeadline}`,
                deadline: instanceDeadline,
                recurring: false
              });
            }
          } else {
            allOccurrences.push({ 
              ...task, 
              id: `${task.id}_${instanceDeadline}`, 
              deadline: instanceDeadline, 
              recurring: false,
              important: task.important || false,
              completed: task.completed || false
            });
          }
          current.setMonth(current.getMonth() + interval);
        }
      } else {
        allOccurrences.push({ ...task, id: task.id });
      }
    });
    
    return allOccurrences;
  }

  private getFilteredSortedTasks(): ITask[] {
    let expandedTasks = this.expandRecurringTasks(this.state.tasks);
    let filtered = [...expandedTasks];

    // Apply filters
    if (this.state.sortOption === 'Deadline') {
      if (this.state.filterYear.trim()) {
        filtered = filtered.filter(task => {
          const d = this.parseDeadlineDate(task.deadline);
          if (!d) return false;
          return d.getFullYear().toString() === this.state.filterYear.trim();
        });
      }

      if (this.state.filterMonth.trim()) {
        const monthNames: { [key: string]: number } = {
          'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3, 'apr': 4, 'april': 4,
          'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7, 'aug': 8, 'august': 8,
          'sep': 9, 'sept': 9, 'september': 9, 'oct': 10, 'october': 10, 'nov': 11, 'november': 11, 'dec': 12, 'december': 12
        };
        const lowerFilterMonth = this.state.filterMonth.trim().toLowerCase();
        let monthToFilter = monthNames[lowerFilterMonth];
        if (!monthToFilter) {
          const parsedMonth = parseInt(lowerFilterMonth, 10);
          if (!isNaN(parsedMonth) && parsedMonth > 0 && parsedMonth < 13) {
            monthToFilter = parsedMonth;
          }
        }
        if (monthToFilter) {
          filtered = filtered.filter(task => {
            const d = this.parseDeadlineDate(task.deadline);
            if (!d) return false;
            return d.getMonth() + 1 === monthToFilter;
          });
        }
      }

      if (this.state.filterDay.trim()) {
        const dayToFilter = parseInt(this.state.filterDay.trim(), 10);
        if (!isNaN(dayToFilter)) {
          filtered = filtered.filter(task => {
            const d = this.parseDeadlineDate(task.deadline);
            if (!d) return false;
            return d.getDate() === dayToFilter;
          });
        }
      }
    } else if (this.state.sortOption === 'Responsible Party') {
      filtered = filtered.filter(task => {
        if (!task.responsibleParty || !this.state.filterValue) return false;
        const taskParties = task.responsibleParty.toLowerCase().split(',').map(p => p.trim());
        const filterParty = this.state.filterValue.toLowerCase().trim();
        return taskParties.some(party => party === filterParty);
      });
    } else if (this.state.sortOption === 'Project') {
      filtered = filtered.filter(task =>
        task.projectName?.toLowerCase() === this.state.filterValue.toLowerCase()
      );
    } else if (this.state.sortOption === 'Search') {
      const searchTerm = this.state.filterValue.toLowerCase();
      filtered = filtered.filter(task => {
        const projectMatch = task.projectName?.toLowerCase().includes(searchTerm);
        const descriptionMatch = task.description?.toLowerCase().includes(searchTerm);
        const responsibleMatch = task.responsibleParty?.toLowerCase().includes(searchTerm);
        return projectMatch || descriptionMatch || responsibleMatch;
      });
    }

    // Filter incomplete tasks
    if (this.state.showIncompleteOnly) {
      filtered = filtered.filter(task => !task.completed);
    }

    // Sort by deadline
    filtered.sort((a, b) => {
      const da = this.parseDeadlineDate(a.deadline);
      const db = this.parseDeadlineDate(b.deadline);
      const ta = da instanceof Date && !isNaN(da.getTime()) ? da.getTime() : Infinity;
      const tb = db instanceof Date && !isNaN(db.getTime()) ? db.getTime() : Infinity;
      return ta - tb;
    });

    return filtered;
  }

  private handleAddTask = async (newTask: ITask): Promise<void> => {
    try {
      await this.sharePointService.addTask(newTask);
      await this.loadData();
    } catch (error) {
      console.error('Error adding task:', error);
      this.setState({ error: 'Failed to add task' });
    }
  };



  private handleDeleteTask = async (taskId: string): Promise<void> => {
    try {
      if (taskId.includes('_')) {
        // This is a recurring instance, create/update override
        const [parentId, date] = taskId.split('_');
        const existing = this.state.overrides.find(o => o.parentId === parentId && o.deadline === date);
        
        if (existing) {
          await this.sharePointService.updateTaskOverride(existing.id!, { deleted: true });
        } else {
          await this.sharePointService.addTaskOverride({ 
            parentId, 
            deadline: date, 
            deleted: true
          });
        }
      } else {
        await this.sharePointService.deleteTask(taskId);
      }
      await this.loadData();
    } catch (error) {
      console.error('Error deleting task:', error);
      this.setState({ error: 'Failed to delete task' });
    }
  };

  private handleToggleCompleted = async (taskId: string): Promise<void> => {
    try {
      if (taskId.includes('_')) {
        // Recurring instance
        const [parentId, date] = taskId.split('_');
        const existing = this.state.overrides.find(o => o.parentId === parentId && o.deadline === date);
        const parentTask = this.state.tasks.find(t => t.id === parentId);
        const currentCompleted = existing ? existing.completed : (parentTask?.completed || false);
        
        if (existing) {
          await this.sharePointService.updateTaskOverride(existing.id!, { completed: !currentCompleted });
        } else {
          await this.sharePointService.addTaskOverride({ 
            parentId, 
            deadline: date, 
            completed: !currentCompleted
          });
        }
      } else {
        // Normal task
        const task = this.state.tasks.find(t => t.id === taskId);
        if (task) {
          await this.sharePointService.updateTask(taskId, { completed: !task.completed });
        }
      }
      await this.loadData();
    } catch (error) {
      console.error('Error toggling completed:', error);
      this.setState({ error: 'Failed to update task' });
    }
  };

  private handleToggleUrgent = async (taskId: string): Promise<void> => {
    try {
      if (taskId.includes('_')) {
        // Recurring instance
        const [parentId, date] = taskId.split('_');
        const existing = this.state.overrides.find(o => o.parentId === parentId && o.deadline === date);
        const parentTask = this.state.tasks.find(t => t.id === parentId);
        const currentImportant = existing ? existing.important : (parentTask?.important || false);
        
        if (existing) {
          await this.sharePointService.updateTaskOverride(existing.id!, { important: !currentImportant });
        } else {
          await this.sharePointService.addTaskOverride({ 
            parentId, 
            deadline: date, 
            important: !currentImportant
          });
        }
      } else {
        // Normal task
        const task = this.state.tasks.find(t => t.id === taskId);
        if (task) {
          await this.sharePointService.updateTask(taskId, { important: !task.important });
        }
      }
      await this.loadData();
    } catch (error) {
      console.error('Error toggling urgent:', error);
      this.setState({ error: 'Failed to update task' });
    }
  };

  public render(): React.ReactElement<ICcProjectManagerProps> {
    const { loading, error } = this.state;

    if (loading) {
      return (
        <div className="cc-project-manager">
          <div className="loading">Loading C&C Project Manager...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="cc-project-manager">
          <div className="error">Error: {error}</div>
        </div>
      );
    }

    const filteredTasks = this.getFilteredSortedTasks();

    return (
      <div className="cc-project-manager">
        <div className="header">
          <h1>C&C Project Manager</h1>
          <p>{this.props.description}</p>
        </div>

        <div className="navigation">
          <button 
            className={this.state.activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => this.setState({ activeTab: 'dashboard' })}
          >
            Dashboard
          </button>
          <button 
            className={this.state.activeTab === 'tasks' ? 'active' : ''}
            onClick={() => this.setState({ activeTab: 'tasks' })}
          >
            Tasks
          </button>
          <button 
            className={this.state.activeTab === 'add' ? 'active' : ''}
            onClick={() => this.setState({ activeTab: 'add' })}
          >
            Add Task
          </button>
        </div>

        <div className="content">
          {this.state.activeTab === 'dashboard' && (
            <div className="dashboard">
              <h2>Dashboard</h2>
              <div className="stats">
                <div className="stat">
                  <h3>Total Tasks</h3>
                  <p>{this.state.tasks.length}</p>
                </div>
                <div className="stat">
                  <h3>Completed</h3>
                  <p>{this.state.tasks.filter(t => t.completed).length}</p>
                </div>
                <div className="stat">
                  <h3>Urgent</h3>
                  <p>{this.state.tasks.filter(t => t.important).length}</p>
                </div>
              </div>
            </div>
          )}

          {this.state.activeTab === 'tasks' && (
            <div className="tasks">
              <div className="filters">
                <select 
                  value={this.state.sortOption}
                  onChange={(e) => this.setState({ sortOption: e.target.value })}
                >
                  <option value="">Sort by...</option>
                  <option value="Deadline">Deadline</option>
                  <option value="Responsible Party">Responsible Party</option>
                  <option value="Project">Project</option>
                  <option value="Search">Search</option>
                </select>

                {this.state.sortOption === 'Deadline' && (
                  <div className="date-filters">
                    <input
                      type="text"
                      placeholder="Year"
                      value={this.state.filterYear}
                      onChange={(e) => this.setState({ filterYear: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Month"
                      value={this.state.filterMonth}
                      onChange={(e) => this.setState({ filterMonth: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Day"
                      value={this.state.filterDay}
                      onChange={(e) => this.setState({ filterDay: e.target.value })}
                    />
                  </div>
                )}

                {this.state.sortOption === 'Search' && (
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={this.state.filterValue}
                    onChange={(e) => this.setState({ filterValue: e.target.value })}
                  />
                )}

                <label>
                  <input
                    type="checkbox"
                    checked={this.state.showIncompleteOnly}
                    onChange={(e) => this.setState({ showIncompleteOnly: e.target.checked })}
                  />
                  Incomplete only
                </label>
              </div>

              <div className="task-list">
                {filteredTasks.map(task => (
                  <div key={task.id} className={`task-card ${task.completed ? 'completed' : ''} ${task.important ? 'urgent' : ''}`}>
                    <div className="task-header">
                      <h3>{task.description}</h3>
                      <div className="task-actions">
                        <button onClick={() => this.handleToggleCompleted(task.id!)}>
                          {task.completed ? '✓' : '○'}
                        </button>
                        <button onClick={() => this.handleToggleUrgent(task.id!)}>
                          {task.important ? '⚠' : '○'}
                        </button>
                        <button onClick={() => this.handleDeleteTask(task.id!)}>🗑</button>
                      </div>
                    </div>
                    <div className="task-details">
                      <p><strong>Project:</strong> {task.projectName}</p>
                      <p><strong>Responsible:</strong> {task.responsibleParty}</p>
                      <p><strong>Deadline:</strong> {task.deadline}</p>
                      {task.notes && <p><strong>Notes:</strong> {task.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {this.state.activeTab === 'add' && (
            <div className="add-task">
              <h2>Add New Task</h2>
              <TaskForm onSubmit={this.handleAddTask} />
            </div>
          )}
        </div>
      </div>
    );
  }
}

// Simple task form component
interface ITaskFormProps {
  onSubmit: (task: ITask) => Promise<void>;
}

class TaskForm extends React.Component<ITaskFormProps, Partial<ITask>> {
  constructor(props: ITaskFormProps) {
    super(props);
    this.state = {
      projectName: '',
      description: '',
      deadline: '',
      responsibleParty: '',
      recurring: false,
      frequency: '',
      finalYear: '',
      important: false,
      completed: false,
      notes: ''
    };
  }

  private handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    await this.props.onSubmit(this.state as ITask);
    this.setState({
      projectName: '',
      description: '',
      deadline: '',
      responsibleParty: '',
      recurring: false,
      frequency: '',
      finalYear: '',
      important: false,
      completed: false,
      notes: ''
    });
  };

  public render(): React.ReactElement<ITaskFormProps> {
    return (
      <form onSubmit={this.handleSubmit}>
        <div>
          <label>Project Name:</label>
          <input
            type="text"
            value={this.state.projectName}
            onChange={(e) => this.setState({ projectName: e.target.value })}
            required
          />
        </div>
        <div>
          <label>Description:</label>
          <input
            type="text"
            value={this.state.description}
            onChange={(e) => this.setState({ description: e.target.value })}
            required
          />
        </div>
        <div>
          <label>Deadline:</label>
          <input
            type="date"
            value={this.state.deadline}
            onChange={(e) => this.setState({ deadline: e.target.value })}
            required
          />
        </div>
        <div>
          <label>Responsible Party:</label>
          <input
            type="text"
            value={this.state.responsibleParty}
            onChange={(e) => this.setState({ responsibleParty: e.target.value })}
            required
          />
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={this.state.recurring}
              onChange={(e) => this.setState({ recurring: e.target.checked })}
            />
            Recurring
          </label>
        </div>
        {this.state.recurring && (
          <>
            <div>
              <label>Frequency (months):</label>
              <input
                type="number"
                value={this.state.frequency}
                onChange={(e) => this.setState({ frequency: e.target.value })}
                min="1"
              />
            </div>
            <div>
              <label>Final Year:</label>
              <input
                type="number"
                value={this.state.finalYear}
                onChange={(e) => this.setState({ finalYear: e.target.value })}
                min={new Date().getFullYear()}
              />
            </div>
          </>
        )}
        <div>
          <label>
            <input
              type="checkbox"
              checked={this.state.important}
              onChange={(e) => this.setState({ important: e.target.checked })}
            />
            Urgent
          </label>
        </div>
        <div>
          <label>Notes:</label>
          <textarea
            value={this.state.notes}
            onChange={(e) => this.setState({ notes: e.target.value })}
          />
        </div>
        <button type="submit">Add Task</button>
      </form>
    );
  }
} 