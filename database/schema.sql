-- Azure SQL Database Schema for C&C Project Manager
-- Optimized for tasks, projects, recurrences, and real-time updates

-- Projects table
CREATE TABLE projects (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    created_by UNIQUEIDENTIFIER,
    INDEX idx_projects_name (name)
);

-- Tasks table (main task storage)
CREATE TABLE tasks (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    project_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES projects(id),
    title NVARCHAR(500) NOT NULL,
    description NVARCHAR(MAX),
    deadline_date DATE NOT NULL,
    responsible_party NVARCHAR(500), -- Email or display name from Entra ID
    priority NVARCHAR(20) DEFAULT 'Normal', -- Normal, Urgent
    status NVARCHAR(20) DEFAULT 'Active', -- Active, Complete
    notes NVARCHAR(MAX),
    recurring BIT DEFAULT 0,
    instance_number INT DEFAULT 0, -- 0 for parent, 1+ for instances
    parent_task_id UNIQUEIDENTIFIER, -- Self-referencing for parent
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    created_by UNIQUEIDENTIFIER,
    updated_by UNIQUEIDENTIFIER,
    
    -- Indexes for fast queries
    INDEX idx_tasks_project (project_id),
    INDEX idx_tasks_deadline (deadline_date),
    INDEX idx_tasks_responsible (responsible_party),
    INDEX idx_tasks_status (status),
    INDEX idx_tasks_updated (updated_at DESC),
    INDEX idx_tasks_parent (parent_task_id)
);

-- Task recurrences (for recurring task definitions)
CREATE TABLE task_recurrences (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    task_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES tasks(id),
    frequency NVARCHAR(20) NOT NULL, -- Daily, Weekly, Monthly, Yearly
    interval INT DEFAULT 1, -- Every N days/months
    final_date DATE, -- End date for recurring instances
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    
    INDEX idx_recurrences_task (task_id)
);

-- Task keywords for full-text search
CREATE TABLE task_keywords (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    task_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES tasks(id) ON DELETE CASCADE,
    keyword NVARCHAR(100) NOT NULL,
    
    INDEX idx_keywords_task (task_id),
    INDEX idx_keywords_keyword (keyword)
);

-- User sessions (for tracking who's viewing what)
CREATE TABLE user_sessions (
    user_id UNIQUEIDENTIFIER NOT NULL,
    session_id NVARCHAR(100) PRIMARY KEY,
    last_active DATETIME2 DEFAULT GETUTCDATE(),
    device_info NVARCHAR(500),
    
    INDEX idx_sessions_user (user_id)
);

-- Audit log (optional but useful)
CREATE TABLE task_audit_log (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    task_id UNIQUEIDENTIFIER NOT NULL,
    action NVARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, COMPLETE
    old_value NVARCHAR(MAX),
    new_value NVARCHAR(MAX),
    user_id UNIQUEIDENTIFIER,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    
    INDEX idx_audit_task (task_id),
    INDEX idx_audit_date (created_at DESC)
);

-- Stored procedures for common operations

-- Get tasks with filters
CREATE PROCEDURE sp_get_tasks
    @project_id UNIQUEIDENTIFIER = NULL,
    @responsible_party NVARCHAR(500) = NULL,
    @status NVARCHAR(20) = NULL,
    @start_date DATE = NULL,
    @end_date DATE = NULL,
    @search_term NVARCHAR(500) = NULL
AS
BEGIN
    SELECT 
        t.*,
        p.name AS project_name,
        r.frequency,
        r.interval,
        r.final_date
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN task_recurrences r ON t.id = r.task_id
    WHERE 
        (@project_id IS NULL OR t.project_id = @project_id)
        AND (@responsible_party IS NULL OR t.responsible_party = @responsible_party)
        AND (@status IS NULL OR t.status = @status)
        AND (@start_date IS NULL OR t.deadline_date >= @start_date)
        AND (@end_date IS NULL OR t.deadline_date <= @end_date)
        AND (@search_term IS NULL OR t.title LIKE '%' + @search_term + '%' OR t.description LIKE '%' + @search_term + '%')
    ORDER BY t.deadline_date ASC
END

-- Generate recurring instances
CREATE PROCEDURE sp_generate_recurring_instances
    @parent_task_id UNIQUEIDENTIFIER,
    @force_regenerate BIT = 0
AS
BEGIN
    DECLARE @start_date DATE
    DECLARE @final_date DATE
    DECLARE @interval INT
    DECLARE @frequency NVARCHAR(20)
    DECLARE @max_instances INT = 100 -- Limit instances
    
    -- Get parent task and recurrence info
    SELECT 
        @start_date = deadline_date
    FROM tasks
    WHERE id = @parent_task_id
    
    SELECT 
        @final_date = final_date,
        @interval = interval,
        @frequency = frequency
    FROM task_recurrences
    WHERE task_id = @parent_task_id
    
    -- Delete existing instances if force regenerating
    IF @force_regenerate = 1
    BEGIN
        DELETE FROM tasks WHERE parent_task_id = @parent_task_id AND instance_number > 0
    END
    
    -- Generate instances based on frequency and interval
    DECLARE @current_date DATE = DATEADD(MONTH, @interval, @start_date)
    DECLARE @instance_num INT = 1
    
    WHILE @current_date <= @final_date AND @instance_num <= @max_instances
    BEGIN
        -- Check if instance already exists
        IF NOT EXISTS (SELECT 1 FROM tasks WHERE parent_task_id = @parent_task_id AND deadline_date = @current_date)
        BEGIN
            -- Copy parent task data but modify dates and instance number
            INSERT INTO tasks (
                project_id, title, description, deadline_date, responsible_party,
                priority, status, notes, recurring, instance_number, parent_task_id,
                created_at, updated_at, created_by
            )
            SELECT 
                project_id, title, description, @current_date, responsible_party,
                priority, 'Active', notes, 0, @instance_num, @parent_task_id,
                GETUTCDATE(), GETUTCDATE(), created_by
            FROM tasks
            WHERE id = @parent_task_id
        END
        
        -- Move to next interval
        SET @current_date = DATEADD(MONTH, @interval, @current_date)
        SET @instance_num = @instance_num + 1
    END
END

