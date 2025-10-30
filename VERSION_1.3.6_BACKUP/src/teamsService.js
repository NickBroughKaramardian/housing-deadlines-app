import microsoftTeams from '@microsoft/teams-js';

class TeamsService {
  constructor() {
    this.isInitialized = false;
    this.teamsContext = null;
    this.userId = null;
    this.userName = null;
    this.userEmail = null;
    this.teamId = null;
    this.channelId = null;
    this.entityId = null;
  }

  async initialize() {
    try {
      // Initialize the Teams SDK
      await microsoftTeams.initialize();
      
      // Get the current context
      const context = await microsoftTeams.getContext();
      
      this.teamsContext = context;
      this.userId = context.userObjectId;
      this.userName = context.userPrincipalName;
      this.userEmail = context.userPrincipalName;
      this.teamId = context.teamId;
      this.channelId = context.channelId;
      this.entityId = context.entityId;
      
      this.isInitialized = true;
      
      console.log('Teams SDK initialized successfully:', {
        userId: this.userId,
        userName: this.userName,
        teamId: this.teamId,
        channelId: this.channelId
      });
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Teams SDK:', error);
      return false;
    }
  }

  isInTeams() {
    return this.isInitialized && this.teamsContext !== null;
  }

  getCurrentUser() {
    return {
      id: this.userId,
      name: this.userName,
      email: this.userEmail
    };
  }

  getTeamContext() {
    return {
      teamId: this.teamId,
      channelId: this.channelId,
      entityId: this.entityId
    };
  }

  // Send a message to the current channel
  async sendMessageToChannel(message) {
    if (!this.isInTeams()) {
      console.warn('Not in Teams context');
      return false;
    }

    try {
      await microsoftTeams.bot.sendMessage({
        content: message,
        contentType: 'text'
      });
      return true;
    } catch (error) {
      console.error('Failed to send message to channel:', error);
      return false;
    }
  }

  // Show a notification in Teams
  async showNotification(title, message, type = 'info') {
    if (!this.isInTeams()) {
      console.warn('Not in Teams context');
      return false;
    }

    try {
      await microsoftTeams.notifications.showNotification({
        title: title,
        message: message,
        type: type // 'info', 'success', 'warning', 'error'
      });
      return true;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return false;
    }
  }

  // Navigate to a specific tab
  async navigateToTab(tabId) {
    if (!this.isInTeams()) {
      console.warn('Not in Teams context');
      return false;
    }

    try {
      await microsoftTeams.navigateToTab({
        tabName: tabId
      });
      return true;
    } catch (error) {
      console.error('Failed to navigate to tab:', error);
      return false;
    }
  }

  // Get the current theme from Teams
  async getTheme() {
    if (!this.isInTeams()) {
      return 'default';
    }

    try {
      const theme = await microsoftTeams.getContext();
      return theme.theme || 'default';
    } catch (error) {
      console.error('Failed to get Teams theme:', error);
      return 'default';
    }
  }

  // Register for theme changes
  registerThemeChangeHandler(handler) {
    if (!this.isInTeams()) {
      return;
    }

    microsoftTeams.registerOnThemeChangeHandler(handler);
  }

  // Get user profile from Teams
  async getUserProfile() {
    if (!this.isInTeams()) {
      return null;
    }

    try {
      const profile = await microsoftTeams.getUserProfile();
      return profile;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  // Share deep link
  async shareDeepLink(subEntityId, subEntityLabel, subEntityWebUrl) {
    if (!this.isInTeams()) {
      console.warn('Not in Teams context');
      return false;
    }

    try {
      await microsoftTeams.shareDeepLink({
        subEntityId: subEntityId,
        subEntityLabel: subEntityLabel,
        subEntityWebUrl: subEntityWebUrl
      });
      return true;
    } catch (error) {
      console.error('Failed to share deep link:', error);
      return false;
    }
  }

  // Get app settings
  async getAppSettings() {
    if (!this.isInTeams()) {
      return {};
    }

    try {
      const settings = await microsoftTeams.getConfig();
      return settings;
    } catch (error) {
      console.error('Failed to get app settings:', error);
      return {};
    }
  }

  // Save app settings
  async saveAppSettings(settings) {
    if (!this.isInTeams()) {
      console.warn('Not in Teams context');
      return false;
    }

    try {
      await microsoftTeams.setConfig(settings);
      return true;
    } catch (error) {
      console.error('Failed to save app settings:', error);
      return false;
    }
  }

  // Register for app settings changes
  registerSettingsChangeHandler(handler) {
    if (!this.isInTeams()) {
      return;
    }

    microsoftTeams.registerOnSettingsChangeHandler(handler);
  }

  // Get meeting context (if in a meeting)
  async getMeetingContext() {
    if (!this.isInTeams()) {
      return null;
    }

    try {
      const meetingContext = await microsoftTeams.meeting.getAppContext();
      return meetingContext;
    } catch (error) {
      console.error('Failed to get meeting context:', error);
      return null;
    }
  }

  // Share content to meeting
  async shareToMeeting(content) {
    if (!this.isInTeams()) {
      console.warn('Not in Teams context');
      return false;
    }

    try {
      await microsoftTeams.meeting.shareAppContentToStage(content);
      return true;
    } catch (error) {
      console.error('Failed to share to meeting:', error);
      return false;
    }
  }
}

// Create a singleton instance
const teamsService = new TeamsService();

export default teamsService; 