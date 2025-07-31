# Microsoft Teams Integration Guide

## Overview

This guide explains how to integrate the C&C Project Manager app with Microsoft Teams as a custom tab application. The integration provides seamless access to project management features directly within Teams.

## Features

### ✅ **Teams Tab App**
- Embedded project management directly in Teams channels
- Real-time collaboration with team members
- Native Teams notifications for deadlines
- Theme-aware UI (light/dark mode)

### ✅ **Personal App**
- Individual access from Teams sidebar
- Personal task management
- Quick access to deadlines

### ✅ **Bot Integration** (Future)
- Deadline reminders via Teams chat
- Quick task status updates
- Natural language commands

## Prerequisites

1. **Microsoft Teams Account** with admin permissions
2. **Azure App Registration** (for production deployment)
3. **Teams Developer Account** (for testing)
4. **SSL Certificate** (HTTPS required for Teams)

## Installation Steps

### Step 1: Install Dependencies

```bash
npm install @microsoft/teams-js
```

### Step 2: Build the App

```bash
npm run build
```

### Step 3: Deploy to Hosting

```bash
firebase deploy --only hosting
```

### Step 4: Create Teams App Package

1. **Download the manifest file**: `teams-manifest.json`
2. **Create app icons**:
   - `color.png` (192x192px)
   - `outline.png` (32x32px)
3. **Zip the files**:
   ```
   cc-project-manager.zip
   ├── teams-manifest.json
   ├── color.png
   └── outline.png
   ```

### Step 5: Install in Teams

#### For Testing (Developer Preview)

1. **Enable Developer Preview** in Teams:
   - Go to Teams Settings → About Teams
   - Click "Developer preview" toggle

2. **Upload App Package**:
   - Go to Apps → Manage your apps
   - Click "Upload a custom app"
   - Select your `cc-project-manager.zip` file

3. **Add to Channel**:
   - Go to any channel
   - Click the "+" button
   - Search for "C&C Project Manager"
   - Click "Add"

#### For Production

1. **Create Azure App Registration**:
   - Go to Azure Portal → App registrations
   - Create new registration
   - Add redirect URIs for Teams

2. **Update Manifest**:
   - Update `teams-manifest.json` with your Azure app ID
   - Update URLs to your production domain

3. **Submit to Teams App Store**:
   - Follow Microsoft's app submission process
   - Provide app description and screenshots
   - Wait for approval

## Configuration

### Teams Tab Configuration

When adding the app to a channel, you'll see a configuration page with:

- **Tab Name**: Display name in the channel
- **Entity ID**: Unique identifier for this tab instance
- **Content URL**: Where the app loads from
- **Website URL**: External link for "Go to website"
- **Remove URL**: Called when tab is removed

### Environment Variables

Add these to your Firebase hosting configuration:

```bash
# Teams App ID (from Azure)
REACT_APP_TEAMS_APP_ID=your-app-id

# Teams App Domain
REACT_APP_TEAMS_DOMAIN=ccprojectmanager.web.app

# Teams Bot Webhook (optional)
REACT_APP_TEAMS_WEBHOOK_URL=your-webhook-url
```

## Usage

### In Teams Channel

1. **Access**: Click the "C&C Project Manager" tab in your channel
2. **Collaborate**: Team members can view and manage tasks together
3. **Notifications**: Get Teams notifications for upcoming deadlines
4. **Share**: Share specific tasks or projects via deep links

### Personal App

1. **Access**: Click the app icon in the Teams sidebar
2. **Manage**: View and manage your personal tasks
3. **Quick Actions**: Mark tasks complete, set reminders

### Teams Integration Features

#### Real-time Collaboration
- Tasks update in real-time across all team members
- See who's working on what
- Collaborative task management

#### Teams Notifications
- Deadline reminders appear in Teams chat
- Task completion notifications
- Urgent task alerts

#### Deep Linking
- Share specific tasks with team members
- Link directly to project views
- Quick access to important deadlines

## Development

### Local Development

1. **Install Teams Toolkit** (VS Code extension)
2. **Create Teams app project**:
   ```bash
   npm install -g @microsoft/teamsfx-cli
   teamsfx init
   ```

3. **Run locally**:
   ```bash
   npm start
   teamsfx preview
   ```

### Testing

1. **Teams Developer Portal**:
   - Test app functionality
   - Debug Teams integration
   - Validate manifest

2. **Teams Client**:
   - Test in actual Teams environment
   - Verify theme integration
   - Check responsive design

## Troubleshooting

### Common Issues

#### App Not Loading
- Check HTTPS requirement
- Verify domain in manifest
- Check browser console for errors

#### Teams SDK Not Initializing
- Ensure Teams context is available
- Check for CORS issues
- Verify manifest permissions

#### Theme Not Syncing
- Check Teams theme detection
- Verify CSS class application
- Test in both light/dark modes

### Debug Commands

```javascript
// Check if running in Teams
console.log('Teams initialized:', teamsService.isInTeams());

// Get Teams context
console.log('Teams context:', teamsService.getTeamContext());

// Test notifications
teamsService.showNotification('Test', 'Hello from Teams!');
```

## Security Considerations

### Authentication
- Use Teams SSO when available
- Fall back to Firebase Auth
- Secure API endpoints

### Data Privacy
- Respect Teams privacy settings
- Secure data transmission
- Follow GDPR compliance

### Permissions
- Request minimal permissions
- Explain permission usage
- Provide privacy policy

## Future Enhancements

### Planned Features

1. **Teams Bot Integration**
   - Natural language commands
   - Chat-based task management
   - Meeting integration

2. **Advanced Notifications**
   - Adaptive cards
   - Action buttons
   - Rich media support

3. **Meeting Integration**
   - Share tasks in meetings
   - Meeting-based task creation
   - Post-meeting follow-ups

4. **Power Automate Connectors**
   - Automated workflows
   - External system integration
   - Custom triggers

### API Extensions

```javascript
// Example: Teams Bot Commands
bot.command('add task', async (context) => {
  // Add task via chat
});

bot.command('deadlines', async (context) => {
  // Show upcoming deadlines
});

bot.command('complete', async (context) => {
  // Mark task complete
});
```

## Support

### Documentation
- [Microsoft Teams Developer Documentation](https://docs.microsoft.com/en-us/microsoftteams/platform/)
- [Teams SDK Reference](https://docs.microsoft.com/en-us/javascript/api/teams-js/)
- [App Manifest Schema](https://docs.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)

### Community
- [Teams Developer Community](https://techcommunity.microsoft.com/t5/microsoft-teams/ct-p/MicrosoftTeams)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/microsoft-teams)
- [GitHub Issues](https://github.com/microsoft/teams-js/issues)

### Contact
For app-specific issues:
- Email: support@c-cdev.com
- Teams: C&C Development channel
- GitHub: Create an issue in the repository

## License

This Teams integration is part of the C&C Project Manager application and follows the same licensing terms. 