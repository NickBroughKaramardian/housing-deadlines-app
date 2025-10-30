import { microsoftDataService } from './microsoftDataService';
import { microsoftProfileService } from './microsoftProfileService';

// Central data service that powers all views from the Database
class DatabaseDataService {
  constructor() {
    this.cache = new Map();
    this.lastFetch = null;
    this.cacheTimeout = 30000; // 30 seconds
  }

  // Get all tasks with caching
  async getAllTasks() {
    const now = Date.now();
    
    // Return cached data if it's still fresh
    if (this.lastFetch && (now - this.lastFetch) < this.cacheTimeout && this.cache.has('tasks')) {
      return this.cache.get('tasks');
    }

    try {
      const tasks = await microsoftDataService.tasks.getAll();
      
      // Cache the results
      this.cache.set('tasks', tasks);
      this.lastFetch = now;
      
      console.log('DatabaseDataService: Loaded', tasks.length, 'tasks with full data');
      return tasks;
    } catch (error) {
      console.error('DatabaseDataService: Error fetching tasks:', error);
      return this.cache.get('tasks') || [];
    }
  }

  // Get tasks for Dashboard
  async getDashboardData() {
    const tasks = await this.getAllTasks();
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const dashboardData = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(task => task.Completed).length,
      overdueTasks: tasks.filter(task => 
        new Date(task.Deadline) < today && !task.Completed
      ).length,
      dueThisWeek: tasks.filter(task => {
        const deadline = new Date(task.Deadline);
        return deadline >= today && deadline <= weekFromNow && !task.Completed;
      }).length,
      recentTasks: tasks
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5),
      upcomingDeadlines: tasks
        .filter(task => !task.Completed)
        .sort((a, b) => new Date(a.Deadline) - new Date(b.Deadline))
        .slice(0, 5)
    };

    console.log('DatabaseDataService: Dashboard data calculated:', dashboardData);
    return dashboardData;
  }

  // Get tasks for Calendar view
  async getCalendarData() {
    const tasks = await this.getAllTasks();
    
    const calendarData = tasks.map(task => ({
      id: task.id,
      title: task.Task,
      start: new Date(task.Deadline),
      end: new Date(task.Deadline),
      allDay: true,
      extendedProps: {
        project: task.Project,
        responsibleParty: task.ResponsibleParty,
        priority: task.Priority,
        status: task.Status,
        completed: task.Completed,
        notes: task.Notes,
        link: task.Link,
        recurring: task.Recurring,
        interval: task.Interval,
        finalDate: task.FinalDate
      }
    }));

    console.log('DatabaseDataService: Calendar data prepared:', calendarData.length, 'events');
    return calendarData;
  }

  // Get tasks for Gantt Chart
  async getGanttData() {
    const tasks = await this.getAllTasks();
    
    const ganttData = tasks.map(task => ({
      id: task.id,
      name: task.Task,
      start: new Date(task.Deadline),
      end: new Date(task.Deadline),
      progress: task.Completed ? 100 : 0,
      dependencies: [], // Could be enhanced to support task dependencies
      custom_class: this.getGanttTaskClass(task),
      responsible: task.ResponsibleParty,
      project: task.Project,
      priority: task.Priority,
      status: task.Status,
      recurring: task.Recurring,
      interval: task.Interval,
      finalDate: task.FinalDate,
      notes: task.Notes,
      link: task.Link
    }));

    console.log('DatabaseDataService: Gantt data prepared:', ganttData.length, 'tasks');
    return ganttData;
  }

  // Get tasks for Deadlines view (sorted)
  async getDeadlinesData(sortBy = 'deadline', sortOrder = 'asc') {
    const tasks = await this.getAllTasks();
    
    let sortedTasks = [...tasks];
    
    switch (sortBy) {
      case 'deadline':
        sortedTasks.sort((a, b) => {
          const dateA = new Date(a.Deadline);
          const dateB = new Date(b.Deadline);
          return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });
        break;
      case 'priority':
        const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
        sortedTasks.sort((a, b) => {
          const priorityA = priorityOrder[a.Priority] || 0;
          const priorityB = priorityOrder[b.Priority] || 0;
          return sortOrder === 'asc' ? priorityA - priorityB : priorityB - priorityA;
        });
        break;
      case 'project':
        sortedTasks.sort((a, b) => {
          const projectA = a.Project || '';
          const projectB = b.Project || '';
          return sortOrder === 'asc' ? projectA.localeCompare(projectB) : projectB.localeCompare(projectA);
        });
        break;
      case 'responsible':
        sortedTasks.sort((a, b) => {
          const responsibleA = a.ResponsibleParty || '';
          const responsibleB = b.ResponsibleParty || '';
          return sortOrder === 'asc' ? responsibleA.localeCompare(responsibleB) : responsibleB.localeCompare(responsibleA);
        });
        break;
      default:
        // Default to deadline sorting
        sortedTasks.sort((a, b) => {
          const dateA = new Date(a.Deadline);
          const dateB = new Date(b.Deadline);
          return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });
    }
    
    console.log('DatabaseDataService: Deadlines data sorted by', sortBy, ':', sortedTasks.length, 'tasks');
    return sortedTasks;
  }

  // Get department breakdown for Dashboard
  async getDepartmentBreakdown() {
    const tasks = await this.getAllTasks();
    const users = await microsoftProfileService.getAllUsers();
    
    // Create department mapping from Microsoft profiles
    const departmentMapping = {};
    users.forEach(user => {
      departmentMapping[user.name] = user.department.toLowerCase().replace(/[^a-z0-9]/g, '-');
    });

    // Get unique departments from users
    const departments = [...new Set(users.map(user => user.department.toLowerCase().replace(/[^a-z0-9]/g, '-')))];
    
    const breakdown = {};
    departments.forEach(dept => {
      breakdown[dept] = { total: 0, completed: 0, overdue: 0 };
    });

    const now = new Date();

    tasks.forEach(task => {
      const department = departmentMapping[task.ResponsibleParty] || 'uncategorized';
      if (breakdown[department]) {
        breakdown[department].total++;
        if (task.Completed) {
          breakdown[department].completed++;
        }
        if (new Date(task.Deadline) < now && !task.Completed) {
          breakdown[department].overdue++;
        }
      }
    });

    console.log('DatabaseDataService: Department breakdown calculated:', breakdown);
    return breakdown;
  }

  // Get project breakdown for Dashboard
  async getProjectBreakdown() {
    const tasks = await this.getAllTasks();
    
    const projectBreakdown = {};
    
    tasks.forEach(task => {
      const project = task.Project || 'Unassigned';
      if (!projectBreakdown[project]) {
        projectBreakdown[project] = { total: 0, completed: 0, overdue: 0 };
      }
      
      projectBreakdown[project].total++;
      if (task.Completed) {
        projectBreakdown[project].completed++;
      }
      if (new Date(task.Deadline) < new Date() && !task.Completed) {
        projectBreakdown[project].overdue++;
      }
    });

    console.log('DatabaseDataService: Project breakdown calculated:', projectBreakdown);
    return projectBreakdown;
  }

  // Get priority breakdown for Dashboard
  async getPriorityBreakdown() {
    const tasks = await this.getAllTasks();
    
    const priorityBreakdown = {
      'Critical': { total: 0, completed: 0, overdue: 0 },
      'High': { total: 0, completed: 0, overdue: 0 },
      'Medium': { total: 0, completed: 0, overdue: 0 },
      'Low': { total: 0, completed: 0, overdue: 0 }
    };

    const now = new Date();

    tasks.forEach(task => {
      const priority = task.Priority || 'Medium';
      if (priorityBreakdown[priority]) {
        priorityBreakdown[priority].total++;
        if (task.Completed) {
          priorityBreakdown[priority].completed++;
        }
        if (new Date(task.Deadline) < now && !task.Completed) {
          priorityBreakdown[priority].overdue++;
        }
      }
    });

    console.log('DatabaseDataService: Priority breakdown calculated:', priorityBreakdown);
    return priorityBreakdown;
  }

  // Helper method for Gantt chart task styling
  getGanttTaskClass(task) {
    if (task.Completed) return 'completed-task';
    if (new Date(task.Deadline) < new Date()) return 'overdue-task';
    
    switch (task.Priority) {
      case 'Critical': return 'critical-task';
      case 'High': return 'high-priority-task';
      case 'Medium': return 'medium-priority-task';
      case 'Low': return 'low-priority-task';
      default: return 'default-task';
    }
  }

  // Clear cache (useful when data is updated)
  clearCache() {
    this.cache.clear();
    this.lastFetch = null;
    console.log('DatabaseDataService: Cache cleared');
  }

  // Get tasks by responsible party
  async getTasksByResponsibleParty(party) {
    const tasks = await this.getAllTasks();
    const filteredTasks = tasks.filter(task => task.ResponsibleParty === party);
    console.log('DatabaseDataService: Tasks by responsible party:', party, filteredTasks.length, 'tasks');
    return filteredTasks;
  }

  // Get tasks by project
  async getTasksByProject(project) {
    const tasks = await this.getAllTasks();
    const filteredTasks = tasks.filter(task => task.Project === project);
    console.log('DatabaseDataService: Tasks by project:', project, filteredTasks.length, 'tasks');
    return filteredTasks;
  }

  // Get recurring tasks
  async getRecurringTasks() {
    const tasks = await this.getAllTasks();
    const recurringTasks = tasks.filter(task => task.Recurring);
    console.log('DatabaseDataService: Recurring tasks:', recurringTasks.length, 'tasks');
    return recurringTasks;
  }

  // Get overdue tasks
  async getOverdueTasks() {
    const tasks = await this.getAllTasks();
    const now = new Date();
    const overdueTasks = tasks.filter(task => new Date(task.Deadline) < now && !task.Completed);
    console.log('DatabaseDataService: Overdue tasks:', overdueTasks.length, 'tasks');
    return overdueTasks;
  }

  // Get tasks due this week
  async getTasksDueThisWeek() {
    const tasks = await this.getAllTasks();
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const dueThisWeek = tasks.filter(task => {
      const deadline = new Date(task.Deadline);
      return deadline >= now && deadline <= weekFromNow && !task.Completed;
    });
    
    console.log('DatabaseDataService: Tasks due this week:', dueThisWeek.length, 'tasks');
    return dueThisWeek;
  }

  // Get tasks by status
  async getTasksByStatus(status) {
    const tasks = await this.getAllTasks();
    const filteredTasks = tasks.filter(task => task.Status === status);
    console.log('DatabaseDataService: Tasks by status:', status, filteredTasks.length, 'tasks');
    return filteredTasks;
  }

  // Get tasks by priority
  async getTasksByPriority(priority) {
    const tasks = await this.getAllTasks();
    const filteredTasks = tasks.filter(task => task.Priority === priority);
    console.log('DatabaseDataService: Tasks by priority:', priority, filteredTasks.length, 'tasks');
    return filteredTasks;
  }
}

// Export singleton instance
export const databaseDataService = new DatabaseDataService();
