const sql = require('mssql');
const { Client } = require('@microsoft/microsoft-graph-client');
const { AuthenticationProvider } = require('@microsoft/microsoft-graph-client');
const { DefaultAzureCredential } = require('@azure/identity');

// SharePoint configuration
const SHAREPOINT_SITE_ID = 'your-sharepoint-site-id';
const SHAREPOINT_LIST_ID = 'your-sharepoint-list-id';

// Azure SQL configuration
const sqlConfig = {
  server: process.env.AZURE_SQL_SERVER,
  database: process.env.AZURE_SQL_DATABASE,
  authentication: {
    type: 'azure-active-directory-default'
  },
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

class SharePointAuthProvider extends AuthenticationProvider {
  async getAccessToken() {
    const credential = new DefaultAzureCredential();
    const tokenResponse = await credential.getToken('https://graph.microsoft.com/.default');
    return tokenResponse.token;
  }
}

async function migrateFromSharePoint() {
  console.log('Starting SharePoint to Azure SQL migration...');

  try {
    // Connect to Azure SQL
    console.log('Connecting to Azure SQL...');
    await sql.connect(sqlConfig);
    console.log('Connected to Azure SQL');

    // Connect to Microsoft Graph
    console.log('Connecting to Microsoft Graph...');
    const graphClient = Client.initWithMiddleware({
      authProvider: new SharePointAuthProvider()
    });
    console.log('Connected to Microsoft Graph');

    // Get all tasks from SharePoint
    console.log('Fetching tasks from SharePoint...');
    const sharePointTasks = await graphClient
      .api(`/sites/${SHAREPOINT_SITE_ID}/lists/${SHAREPOINT_LIST_ID}/items`)
      .expand('fields')
      .get();

    console.log(`Found ${sharePointTasks.value.length} tasks in SharePoint`);

    // Process each task
    for (const item of sharePointTasks.value) {
      const fields = item.fields;
      
      console.log(`Processing task: ${fields.Title || 'Untitled'}`);

      // Create project if it doesn't exist
      let projectId = null;
      if (fields.Project) {
        const existingProject = await sql.query(
          'SELECT id FROM projects WHERE name = @name',
          { name: fields.Project }
        );

        if (existingProject.length > 0) {
          projectId = existingProject[0].id;
        } else {
          const newProject = await sql.query(
            'INSERT INTO projects (name) OUTPUT INSERTED.id VALUES (@name)',
            { name: fields.Project }
          );
          projectId = newProject[0].id;
        }
      }

      // Convert SharePoint task to our schema
      const taskData = {
        project_id: projectId,
        title: fields.Title || 'Untitled Task',
        description: fields.Description || '',
        deadline_date: fields.Deadline ? new Date(fields.Deadline).toISOString().split('T')[0] : null,
        responsible_party: fields.ResponsibleParty || '',
        priority: fields.Priority === 'Urgent' ? 'Urgent' : 'Normal',
        status: fields.Status === 'Complete' ? 'Complete' : 'Active',
        notes: fields.Notes || '',
        recurring: fields.Recurring === 'Yes' || fields.Recurring === true,
        instance_number: fields.Instance || 0,
        created_at: fields.Created ? new Date(fields.Created) : new Date(),
        updated_at: fields.Modified ? new Date(fields.Modified) : new Date()
      };

      // Insert task
      const result = await sql.query(`
        INSERT INTO tasks (
          project_id, title, description, deadline_date, responsible_party,
          priority, status, notes, recurring, instance_number, created_at, updated_at
        ) OUTPUT INSERTED.id VALUES (
          @project_id, @title, @description, @deadline_date, @responsible_party,
          @priority, @status, @notes, @recurring, @instance_number, @created_at, @updated_at
        )
      `, taskData);

      const taskId = result[0].id;

      // Create recurrence if needed
      if (taskData.recurring && fields.Interval) {
        await sql.query(`
          INSERT INTO task_recurrences (task_id, frequency, interval, final_date)
          VALUES (@task_id, @frequency, @interval, @final_date)
        `, {
          task_id: taskId,
          frequency: 'Monthly', // Default to monthly
          interval: parseInt(fields.Interval) || 1,
          final_date: fields.FinalDate ? new Date(fields.FinalDate).toISOString().split('T')[0] : null
        });

        // Generate recurring instances
        await sql.query('EXEC sp_generate_recurring_instances @parent_task_id', {
          parent_task_id: taskId
        });
      }

      console.log(`✓ Migrated task: ${taskData.title}`);
    }

    console.log('Migration completed successfully!');
    console.log(`Migrated ${sharePointTasks.value.length} tasks from SharePoint to Azure SQL`);

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await sql.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateFromSharePoint()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateFromSharePoint };
