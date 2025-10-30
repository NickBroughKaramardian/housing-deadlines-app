// Notification Service for Desktop Notifications
class NotificationService {
  constructor() {
    this.checkInterval = null;
    this.lastCheck = null;
    this.notificationQueue = new Set(); // Prevent duplicate notifications
  }

  // Initialize the notification service
  init() {
    if (!('Notification' in window)) {
      console.log('Notifications not supported');
      return false;
    }

    // Check if notifications are enabled
    const settings = this.getNotificationSettings();
    if (!settings.enabled) {
      return false;
    }

    // Start checking for notifications
    this.startChecking();
    return true;
  }

  // Get notification settings from localStorage
  getNotificationSettings() {
    const saved = localStorage.getItem('notificationSettings');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      enabled: false,
      days: 1,
      time: '09:00',
      sound: true
    };
  }

  // Start checking for notifications
  startChecking() {
    // Check immediately
    this.checkForNotifications();
    
    // Then check every minute
    this.checkInterval = setInterval(() => {
      this.checkForNotifications();
    }, 60000); // 1 minute
  }

  // Stop checking for notifications
  stopChecking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Check for notifications based on current tasks
  async checkForNotifications() {
    const settings = this.getNotificationSettings();
    if (!settings.enabled || Notification.permission !== 'granted') {
      return;
    }

    // Get current time
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    // Only check at the specified notification time
    if (currentTime !== settings.time) {
      return;
    }

    // Get tasks from Firestore (we'll need to pass this from the main app)
    // For now, we'll use a callback approach
    if (this.getTasksCallback) {
      const tasks = await this.getTasksCallback();
      this.processTasksForNotifications(tasks, settings);
    }
  }

  // Process tasks and send notifications
  processTasksForNotifications(tasks, settings) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    tasks.forEach(task => {
      if (task.completed) return; // Skip completed tasks
      
      const deadline = this.parseDate(task.deadline);
      if (!deadline) return;
      
      const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
      const daysUntilDeadline = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
      
      // Check if we should notify for this task
      if (daysUntilDeadline === settings.days) {
        this.sendNotification(task, daysUntilDeadline);
      }
    });
  }

  // Send a notification for a specific task
  sendNotification(task, daysUntilDeadline) {
    console.log('Attempting to send notification for task:', task);
    
    try {
      const settings = this.getNotificationSettings();
      const notificationId = `${task.id}_${task.deadline}`;
      
      // Prevent duplicate notifications
      if (this.notificationQueue.has(notificationId)) {
        console.log('Notification already in queue, skipping:', notificationId);
        return;
      }
      
      this.notificationQueue.add(notificationId);
      
      // Clear from queue after 24 hours
      setTimeout(() => {
        this.notificationQueue.delete(notificationId);
      }, 24 * 60 * 60 * 1000);

      const title = this.getNotificationTitle(daysUntilDeadline);
      const body = this.getNotificationBody(task, daysUntilDeadline);
      
      console.log('Creating notification with title:', title, 'body:', body);
      
            const notification = new Notification(title, {
        body: body,
        icon: '/CC_App_Icon.svg',
        badge: '/CC_App_Icon.svg',
        tag: notificationId, // Prevents duplicate notifications
        requireInteraction: false,
        silent: !settings.sound,
        data: {
          taskId: task.id,
          deadline: task.deadline,
          projectName: task.projectName
        }
      });

      console.log('Notification created successfully');

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // You can add navigation logic here
        // For example, open the task in the app
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
        
        // Trigger a custom event that the app can listen to
        window.dispatchEvent(new CustomEvent('notificationClick', {
          detail: { taskId: task.id, projectName: task.projectName }
        }));
      };

      // Auto-close after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);
      
    } catch (error) {
      console.error('Error creating notification:', error);
      alert('Error creating notification: ' + error.message);
    }
  }

  // Get notification title based on days until deadline
  getNotificationTitle(daysUntilDeadline) {
    if (daysUntilDeadline === 0) {
      return 'C&C Project Manager - Deadline Today!';
    } else if (daysUntilDeadline === 1) {
      return 'C&C Project Manager - Deadline Tomorrow!';
    } else if (daysUntilDeadline < 0) {
      return 'C&C Project Manager - Overdue Deadline!';
    } else {
      return `C&C Project Manager - Deadline in ${daysUntilDeadline} days`;
    }
  }

  // Get notification body text
  getNotificationBody(task, daysUntilDeadline) {
    const projectName = task.projectName || 'Untitled Project';
    const description = task.description || 'No description';
    const responsible = task.responsibleParty || 'Unassigned';
    
    // Format the due date
    const dueDate = this.parseDate(task.deadline);
    const formattedDate = dueDate ? dueDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) : task.deadline;
    
    let urgencyText = '';
    if (daysUntilDeadline === 0) {
      urgencyText = 'Due today!';
    } else if (daysUntilDeadline === 1) {
      urgencyText = 'Due tomorrow!';
    } else if (daysUntilDeadline < 0) {
      urgencyText = `Overdue by ${Math.abs(daysUntilDeadline)} days!`;
    } else {
      urgencyText = `Due in ${daysUntilDeadline} days`;
    }
    
    return `Project: ${projectName}\nTask: ${description}\nResponsible: ${responsible}\nDue Date: ${formattedDate}\n${urgencyText}`;
  }

  // Parse date string to Date object
  parseDate(dateStr) {
    if (!dateStr) return null;
    
    // Try different date formats
    const formats = [
      'yyyy-MM-dd',
      'MM/dd/yyyy',
      'M/d/yy',
      'M/d/yyyy',
      'MM/dd/yy',
    ];
    
    for (const format of formats) {
      try {
        // Simple date parsing - you might want to use a library like date-fns
        const parts = dateStr.split(/[-\/]/);
        if (parts.length === 3) {
          let year = parseInt(parts[2]);
          let month = parseInt(parts[0]) - 1; // 0-indexed
          let day = parseInt(parts[1]);
          
          // Handle different formats
          if (year < 100) {
            year += 2000; // Assume 20xx for 2-digit years
          }
          
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    return null;
  }

  // Set callback to get tasks from the main app
  setTasksCallback(callback) {
    this.getTasksCallback = callback;
  }

  // Test notification
  sendTestNotification() {
    console.log('Test notification requested');
    console.log('Notification permission:', Notification.permission);
    
    if (Notification.permission !== 'granted') {
      alert('Please enable notifications first. Go to Settings > Desktop Notifications and click "Enable Notifications".');
      return;
    }
    
    try {
      const testTask = {
        id: 'test',
        projectName: '🧪 Test Project',
        description: 'This is a test notification from C&C Project Manager',
        responsibleParty: 'Test User',
        deadline: new Date().toISOString().split('T')[0]
      };
      
      console.log('Sending test notification for task:', testTask);
      this.sendNotification(testTask, 0);
      
      // Also show a success message
      setTimeout(() => {
        alert('Test notification sent! Check your system notifications.');
      }, 100);
      
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert('Error sending test notification: ' + error.message);
    }
  }

  // Clean up
  destroy() {
    this.stopChecking();
    this.notificationQueue.clear();
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService; 