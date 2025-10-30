const { app } = require('@azure/functions');
const db = require('../database');
const webpubsub = require('../webpubsub');
const { requireAuth } = require('../auth');

// GET /api/tasks - Get all tasks with optional filters
app.http('getTasks', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: requireAuth(async (context, req) => {
    try {
      const { 
        projectId, 
        responsibleParty, 
        status, 
        startDate, 
        endDate, 
        searchTerm,
        includeInstances = 'true'
      } = req.query;

      let sqlQuery = `
        SELECT 
          t.*,
          p.name AS project_name,
          r.frequency,
          r.interval,
          r.final_date
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN task_recurrences r ON t.id = r.task_id
        WHERE 1=1
      `;

      const params = {};

      if (projectId) {
        sqlQuery += ' AND t.project_id = @projectId';
        params.projectId = projectId;
      }

      if (responsibleParty) {
        sqlQuery += ' AND t.responsible_party = @responsibleParty';
        params.responsibleParty = responsibleParty;
      }

      if (status) {
        sqlQuery += ' AND t.status = @status';
        params.status = status;
      }

      if (startDate) {
        sqlQuery += ' AND t.deadline_date >= @startDate';
        params.startDate = startDate;
      }

      if (endDate) {
        sqlQuery += ' AND t.deadline_date <= @endDate';
        params.endDate = endDate;
      }

      if (searchTerm) {
        sqlQuery += ' AND (t.title LIKE @searchTerm OR t.description LIKE @searchTerm)';
        params.searchTerm = `%${searchTerm}%`;
      }

      if (includeInstances === 'false') {
        sqlQuery += ' AND t.instance_number = 0';
      }

      sqlQuery += ' ORDER BY t.deadline_date ASC';

      const tasks = await db.query(sqlQuery, params);

      context.res = {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          success: true,
          data: tasks,
          count: tasks.length
        }
      };

    } catch (error) {
      console.error('Error getting tasks:', error);
      context.res = {
        status: 500,
        body: { error: 'Failed to get tasks', message: error.message }
      };
    }
  })
});

// POST /api/tasks - Create a new task
app.http('createTask', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: requireAuth(async (context, req) => {
    try {
      const taskData = req.body;
      const userId = req.user.userId;

      // Validate required fields
      if (!taskData.title || !taskData.deadline_date) {
        context.res = {
          status: 400,
          body: { error: 'Title and deadline_date are required' }
        };
        return;
      }

      // Create project if it doesn't exist
      let projectId = taskData.project_id;
      if (taskData.project_name && !projectId) {
        const existingProject = await db.query(
          'SELECT id FROM projects WHERE name = @name',
          { name: taskData.project_name }
        );

        if (existingProject.length > 0) {
          projectId = existingProject[0].id;
        } else {
          const newProject = await db.execute(
            'INSERT INTO projects (name, created_by) OUTPUT INSERTED.id VALUES (@name, @createdBy)',
            { name: taskData.project_name, createdBy: userId }
          );
          projectId = newProject.recordset[0].id;
        }
      }

      // Insert task
      const result = await db.execute(`
        INSERT INTO tasks (
          project_id, title, description, deadline_date, responsible_party,
          priority, status, notes, recurring, instance_number, created_by
        ) OUTPUT INSERTED.id VALUES (
          @projectId, @title, @description, @deadlineDate, @responsibleParty,
          @priority, @status, @notes, @recurring, @instanceNumber, @createdBy
        )
      `, {
        projectId: projectId,
        title: taskData.title,
        description: taskData.description || '',
        deadlineDate: taskData.deadline_date,
        responsibleParty: taskData.responsible_party || '',
        priority: taskData.priority || 'Normal',
        status: taskData.status || 'Active',
        notes: taskData.notes || '',
        recurring: taskData.recurring || false,
        instanceNumber: taskData.instance_number || 0,
        createdBy: userId
      });

      const taskId = result.recordset[0].id;

      // Create recurrence if needed
      if (taskData.recurring && taskData.frequency) {
        await db.execute(`
          INSERT INTO task_recurrences (task_id, frequency, interval, final_date)
          VALUES (@taskId, @frequency, @interval, @finalDate)
        `, {
          taskId: taskId,
          frequency: taskData.frequency,
          interval: taskData.interval || 1,
          finalDate: taskData.final_date
        });

        // Generate recurring instances
        await db.execute('EXEC sp_generate_recurring_instances @parent_task_id', {
          parent_task_id: taskId
        });
      }

      // Publish real-time event
      await webpubsub.publishEvent('task.created', { taskId, title: taskData.title });

      context.res = {
        status: 201,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          success: true,
          data: { id: taskId },
          message: 'Task created successfully'
        }
      };

    } catch (error) {
      console.error('Error creating task:', error);
      context.res = {
        status: 500,
        body: { error: 'Failed to create task', message: error.message }
      };
    }
  })
});

// PUT /api/tasks/{id} - Update a task
app.http('updateTask', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'tasks/{id}',
  handler: requireAuth(async (context, req) => {
    try {
      const taskId = context.bindingData.id;
      const updates = req.body;
      const userId = req.user.userId;

      // Build dynamic update query
      const updateFields = [];
      const params = { taskId, updatedBy: userId };

      if (updates.title !== undefined) {
        updateFields.push('title = @title');
        params.title = updates.title;
      }
      if (updates.description !== undefined) {
        updateFields.push('description = @description');
        params.description = updates.description;
      }
      if (updates.deadline_date !== undefined) {
        updateFields.push('deadline_date = @deadlineDate');
        params.deadlineDate = updates.deadline_date;
      }
      if (updates.responsible_party !== undefined) {
        updateFields.push('responsible_party = @responsibleParty');
        params.responsibleParty = updates.responsible_party;
      }
      if (updates.priority !== undefined) {
        updateFields.push('priority = @priority');
        params.priority = updates.priority;
      }
      if (updates.status !== undefined) {
        updateFields.push('status = @status');
        params.status = updates.status;
      }
      if (updates.notes !== undefined) {
        updateFields.push('notes = @notes');
        params.notes = updates.notes;
      }

      if (updateFields.length === 0) {
        context.res = {
          status: 400,
          body: { error: 'No valid fields to update' }
        };
        return;
      }

      updateFields.push('updated_at = GETUTCDATE()');
      updateFields.push('updated_by = @updatedBy');

      const sqlQuery = `
        UPDATE tasks 
        SET ${updateFields.join(', ')}
        WHERE id = @taskId
      `;

      const result = await db.execute(sqlQuery, params);

      if (result.rowsAffected[0] === 0) {
        context.res = {
          status: 404,
          body: { error: 'Task not found' }
        };
        return;
      }

      // Publish real-time event
      await webpubsub.publishEvent('task.updated', { taskId, updates });

      context.res = {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          success: true,
          message: 'Task updated successfully'
        }
      };

    } catch (error) {
      console.error('Error updating task:', error);
      context.res = {
        status: 500,
        body: { error: 'Failed to update task', message: error.message }
      };
    }
  })
});

// DELETE /api/tasks/{id} - Delete a task
app.http('deleteTask', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'tasks/{id}',
  handler: requireAuth(async (context, req) => {
    try {
      const taskId = context.bindingData.id;

      // Check if task exists
      const existingTask = await db.query(
        'SELECT title FROM tasks WHERE id = @taskId',
        { taskId }
      );

      if (existingTask.length === 0) {
        context.res = {
          status: 404,
          body: { error: 'Task not found' }
        };
        return;
      }

      // Delete task (cascades to instances and recurrences)
      await db.execute('DELETE FROM tasks WHERE id = @taskId', { taskId });

      // Publish real-time event
      await webpubsub.publishEvent('task.deleted', { taskId });

      context.res = {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          success: true,
          message: 'Task deleted successfully'
        }
      };

    } catch (error) {
      console.error('Error deleting task:', error);
      context.res = {
        status: 500,
        body: { error: 'Failed to delete task', message: error.message }
      };
    }
  })
});

// POST /api/tasks/{id}/complete - Mark task as complete
app.http('completeTask', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'tasks/{id}/complete',
  handler: requireAuth(async (context, req) => {
    try {
      const taskId = context.bindingData.id;
      const { completed = true } = req.body;

      const result = await db.execute(`
        UPDATE tasks 
        SET status = @status, updated_at = GETUTCDATE(), updated_by = @updatedBy
        WHERE id = @taskId
      `, {
        taskId,
        status: completed ? 'Complete' : 'Active',
        updatedBy: req.user.userId
      });

      if (result.rowsAffected[0] === 0) {
        context.res = {
          status: 404,
          body: { error: 'Task not found' }
        };
        return;
      }

      // Publish real-time event
      await webpubsub.publishEvent('task.completed', { 
        taskId, 
        completed,
        completedBy: req.user.userId 
      });

      context.res = {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          success: true,
          message: `Task ${completed ? 'completed' : 'reopened'} successfully`
        }
      };

    } catch (error) {
      console.error('Error completing task:', error);
      context.res = {
        status: 500,
        body: { error: 'Failed to complete task', message: error.message }
      };
    }
  })
});
