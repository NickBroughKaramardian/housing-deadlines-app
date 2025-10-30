// SharePoint Lists Schema - Complete Firebase equivalent
export const listsToCreate = [
  {
    displayName: 'Tasks',
    description: 'Project tasks and deadlines',
    columns: [
      { name: 'Title', type: 'SingleLineOfText', required: true },
      { name: 'Description', type: 'MultipleLinesOfText' },
      { name: 'Deadline', type: 'DateTime' },
      { name: 'Project', type: 'SingleLineOfText' },
      { name: 'ResponsibleParty', type: 'SingleLineOfText' },
      { name: 'Priority', type: 'Choice', choices: ['Low', 'Medium', 'High'] },
      { name: 'Status', type: 'Choice', choices: ['Not Started', 'In Progress', 'Completed', 'On Hold'] },
      { name: 'Notes', type: 'MultipleLinesOfText' },
      { name: 'DocumentLink', type: 'Hyperlink' },
      { name: 'IsRecurring', type: 'Choice', choices: ['Yes', 'No'] },
      { name: 'RecurrencePattern', type: 'SingleLineOfText' },
      { name: 'CreatedBy', type: 'SingleLineOfText' },
      { name: 'ModifiedBy', type: 'SingleLineOfText' }
    ]
  },
  {
    displayName: 'Users',
    description: 'Application users and their roles',
    columns: [
      { name: 'Title', type: 'SingleLineOfText', required: true },
      { name: 'Email', type: 'SingleLineOfText', required: true },
      { name: 'Role', type: 'Choice', choices: ['DEVELOPER', 'OWNER', 'ADMIN', 'EDITOR', 'VIEWER'] },
      { name: 'Departments', type: 'MultipleLinesOfText' },
      { name: 'IsActive', type: 'Choice', choices: ['Yes', 'No'] },
      { name: 'LastLogin', type: 'DateTime' }
    ]
  },
  {
    displayName: 'Messages',
    description: 'Internal messages and announcements',
    columns: [
      { name: 'Title', type: 'SingleLineOfText', required: true },
      { name: 'Content', type: 'MultipleLinesOfText' },
      { name: 'From', type: 'SingleLineOfText' },
      { name: 'To', type: 'MultipleLinesOfText' },
      { name: 'IsAnnouncement', type: 'Choice', choices: ['Yes', 'No'] }
    ]
  },
  {
    displayName: 'ChecklistTemplates',
    description: 'Reusable checklist templates',
    columns: [
      { name: 'Title', type: 'SingleLineOfText', required: true },
      { name: 'Items', type: 'MultipleLinesOfText' },
      { name: 'CreatedBy', type: 'SingleLineOfText' }
    ]
  },
  {
    displayName: 'Checklists',
    description: 'Project-specific checklists',
    columns: [
      { name: 'Title', type: 'SingleLineOfText', required: true },
      { name: 'TemplateId', type: 'SingleLineOfText' },
      { name: 'ProjectId', type: 'SingleLineOfText' },
      { name: 'Items', type: 'MultipleLinesOfText' },
      { name: 'CreatedBy', type: 'SingleLineOfText' }
    ]
  },
  {
    displayName: 'DepartmentMappings',
    description: 'Custom department mappings for responsible parties',
    columns: [
      { name: 'Title', type: 'SingleLineOfText', required: true },
      { name: 'Department', type: 'SingleLineOfText' },
      { name: 'CreatedBy', type: 'SingleLineOfText' }
    ]
  },
  {
    displayName: 'NameAliases',
    description: 'Name aliases for flexible user identification',
    columns: [
      { name: 'Title', type: 'SingleLineOfText', required: true },
      { name: 'UserId', type: 'SingleLineOfText' },
      { name: 'CreatedBy', type: 'SingleLineOfText' }
    ]
  },
  {
    displayName: 'Invites',
    description: 'User invitation system',
    columns: [
      { name: 'Title', type: 'SingleLineOfText', required: true },
      { name: 'Email', type: 'SingleLineOfText' },
      { name: 'Role', type: 'SingleLineOfText' },
      { name: 'Token', type: 'SingleLineOfText' },
      { name: 'ExpiresAt', type: 'DateTime' },
      { name: 'CreatedBy', type: 'SingleLineOfText' }
    ]
  }
];
