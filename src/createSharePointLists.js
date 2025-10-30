import { microsoftDataService } from './microsoftDataService';
import { sharePointService } from './graphService';

// Create all required SharePoint Lists
export const createSharePointLists = async () => {
  try {
    console.log('Creating SharePoint Lists...');

    // 1. Tasks List
    await sharePointService.createList('Tasks', 'Tasks', 'Project deadline tasks');
    console.log('✅ Tasks list created');

    // 2. Users List
    await sharePointService.createList('Users', 'Users', 'Application users and their roles');
    console.log('✅ Users list created');

    // 3. ChecklistTemplates List
    await sharePointService.createList('ChecklistTemplates', 'Checklist Templates', 'Reusable checklist templates');
    console.log('✅ ChecklistTemplates list created');

    // 4. Checklists List
    await sharePointService.createList('Checklists', 'Checklists', 'Project-specific checklists');
    console.log('✅ Checklists list created');

    // 5. Messages List
    await sharePointService.createList('Messages', 'Messages', 'Team messages and announcements');
    console.log('✅ Messages list created');

    // 6. DepartmentMappings List
    await sharePointService.createList('DepartmentMappings', 'Department Mappings', 'Custom department mappings');
    console.log('✅ DepartmentMappings list created');

    // 7. NameAliases List
    await sharePointService.createList('NameAliases', 'Name Aliases', 'User name aliases for flexible matching');
    console.log('✅ NameAliases list created');

    // 8. Invites List
    await sharePointService.createList('Invites', 'Invites', 'User invitation system');
    console.log('✅ Invites list created');

    console.log('🎉 All SharePoint Lists created successfully!');
    return true;
  } catch (error) {
    console.error('Error creating SharePoint Lists:', error);
    return false;
  }
};

// List schemas for reference
export const listSchemas = {
  Tasks: {
    Title: 'Single line of text',
    Description: 'Multiple lines of text',
    Deadline: 'Date and Time',
    ResponsibleParty: 'Single line of text',
    ProjectName: 'Single line of text',
    Status: 'Choice (Not Started, In Progress, Completed)',
    Priority: 'Choice (Low, Medium, High, Urgent)',
    Department: 'Single line of text',
    Notes: 'Multiple lines of text',
    DocumentLink: 'Hyperlink or Picture',
    IsRecurring: 'Yes/No',
    RecurrencePattern: 'Single line of text',
    CreatedBy: 'Person or Group',
    CreatedDate: 'Date and Time',
    ModifiedBy: 'Person or Group',
    ModifiedDate: 'Date and Time'
  },
  Users: {
    Title: 'Single line of text',
    DisplayName: 'Single line of text',
    Email: 'Single line of text',
    Role: 'Choice (Developer, Owner, Admin, Editor, Viewer)',
    Departments: 'Multiple lines of text',
    IsActive: 'Yes/No',
    CreatedDate: 'Date and Time'
  },
  ChecklistTemplates: {
    Title: 'Single line of text',
    Name: 'Single line of text',
    Description: 'Multiple lines of text',
    Items: 'Multiple lines of text (JSON)',
    CreatedBy: 'Person or Group',
    CreatedDate: 'Date and Time'
  },
  Checklists: {
    Title: 'Single line of text',
    TemplateId: 'Single line of text',
    ProjectName: 'Single line of text',
    Items: 'Multiple lines of text (JSON)',
    Status: 'Choice (Active, Completed, Archived)',
    CreatedBy: 'Person or Group',
    CreatedDate: 'Date and Time'
  },
  Messages: {
    Title: 'Single line of text',
    Content: 'Multiple lines of text',
    Type: 'Choice (Direct, Team Announcement)',
    SenderId: 'Single line of text',
    SenderName: 'Single line of text',
    RecipientId: 'Single line of text',
    IsAnnouncement: 'Yes/No',
    CreatedDate: 'Date and Time'
  },
  DepartmentMappings: {
    Title: 'Single line of text',
    ResponsibleParty: 'Single line of text',
    Department: 'Single line of text',
    CreatedBy: 'Person or Group',
    CreatedDate: 'Date and Time'
  },
  NameAliases: {
    Title: 'Single line of text',
    Alias: 'Single line of text',
    UserId: 'Single line of text',
    UserName: 'Single line of text',
    CreatedBy: 'Person or Group',
    CreatedDate: 'Date and Time'
  },
  Invites: {
    Title: 'Single line of text',
    Email: 'Single line of text',
    Role: 'Choice (Developer, Owner, Admin, Editor, Viewer)',
    InvitedBy: 'Person or Group',
    InvitedDate: 'Date and Time',
    Status: 'Choice (Pending, Accepted, Expired)',
    ExpiryDate: 'Date and Time'
  }
};
