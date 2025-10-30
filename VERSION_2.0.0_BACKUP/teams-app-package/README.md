# 🚀 C&C Project Manager - Microsoft Teams & Office Add-in

## Overview

This package contains everything needed to deploy the C&C Project Manager as a Microsoft Teams app and Office add-in. The app provides comprehensive project management capabilities with deadline tracking, task management, and team collaboration features.

## 📦 Package Contents

```
teams-app-package/
├── teams-manifest.json      # Teams app manifest
├── office-manifest.xml      # Office add-in manifest
├── color.png               # 192x192 app icon (color)
├── outline.png             # 32x32 app icon (outline)
├── CC_App_Icon.svg         # Source SVG icon
├── create-icons.html       # Icon converter tool
└── README.md               # This file
```

## 🎯 Features

### Teams Integration
- **Configurable Tabs**: Add to team channels and group chats
- **Personal Tabs**: Individual access from Teams sidebar
- **Compose Extensions**: Add tasks directly from chat
- **Theme Integration**: Automatic light/dark mode sync
- **Real-time Collaboration**: Live updates across team members

### Office Integration
- **Word Support**: Task management in Word documents
- **Excel Support**: Project tracking in spreadsheets
- **PowerPoint Support**: Presentation project management
- **Ribbon Integration**: Easy access from Office ribbon
- **Task Pane**: Dedicated workspace within Office apps

## 🚀 Installation Instructions

### For Microsoft Teams

#### Method 1: Developer Preview (Recommended for Testing)

1. **Enable Developer Preview**:
   - Open Teams → Settings → About Teams
   - Toggle "Developer preview" to ON
   - Restart Teams

2. **Upload App Package**:
   - Go to Apps → Manage your apps
   - Click "Upload a custom app"
   - Select `cc-project-manager.zip`
   - Click "Add"

3. **Add to Channel**:
   - Go to any channel
   - Click "+" next to tabs
   - Search "C&C Project Manager"
   - Click "Add"

#### Method 2: Teams App Store (Production)

1. **Create Azure App Registration**:
   - Go to Azure Portal → App registrations
   - Create new registration
   - Add redirect URIs for Teams

2. **Update Manifest**:
   - Update `teams-manifest.json` with your Azure app ID
   - Update URLs to your production domain

3. **Submit to Store**:
   - Follow Microsoft's app submission process
   - Provide app description and screenshots
   - Wait for approval

### For Microsoft Office

#### Method 1: Sideload (Development/Testing)

1. **For Word/Excel/PowerPoint**:
   - Open Office app
   - Go to Insert → Add-ins → My Add-ins
   - Click "Upload My Add-in"
   - Select `office-manifest.xml`

2. **For Outlook**:
   - Open Outlook
   - Go to Get Add-ins → My Add-ins
   - Click "Add a Custom Add-in" → "Add from File"
   - Select `office-manifest.xml`

#### Method 2: Office Store (Production)

1. **Prepare for Submission**:
   - Update `office-manifest.xml` with production URLs
   - Ensure all icons are accessible via HTTPS
   - Test thoroughly in all Office hosts

2. **Submit to Office Store**:
   - Use Partner Center to submit
   - Provide detailed descriptions and screenshots
   - Include privacy policy and terms of use

## 🔧 Configuration

### Teams Configuration

When adding the app to a channel, you'll see:

- **Tab Name**: "C&C Project Manager" (customizable)
- **Entity ID**: Unique identifier for this tab instance
- **Content URL**: Where the app loads from
- **Website URL**: External link for "Go to website"

### Office Configuration

The Office add-in will appear as:

- **Ribbon Button**: "Project Manager" in the Home tab
- **Task Pane**: Dedicated workspace for project management
- **Permissions**: Read/Write document access

## 🌐 URLs and Domains

### Required URLs
- **Main App**: `https://ccprojectmanager.web.app`
- **Teams Config**: `https://ccprojectmanager.web.app/teams-config`
- **Office Task Pane**: `https://ccprojectmanager.web.app/office`
- **Office Commands**: `https://ccprojectmanager.web.app/office-commands.html`

### Valid Domains
- `ccprojectmanager.web.app`
- `*.firebaseapp.com`

## 🎨 Icons

### Required Icon Sizes
- **Teams**: 192x192 (color.png), 32x32 (outline.png)
- **Office**: 16x16, 32x32, 80x80 (auto-generated from outline.png)

### Icon Generation
Use `create-icons.html` to generate additional icon sizes:
1. Open `create-icons.html` in a browser
2. Click download buttons for required sizes
3. Save files to appropriate locations

## 🔐 Security & Permissions

### Teams Permissions
- `identity`: Access to user identity
- `messageTeamMembers`: Send messages to team

### Office Permissions
- `ReadWriteDocument`: Read and write document content

### Authentication
- Firebase Authentication integration
- Role-based access control
- Organization-based data segregation

## 📱 Supported Platforms

### Teams
- ✅ Teams Desktop (Windows, Mac)
- ✅ Teams Web
- ✅ Teams Mobile (iOS, Android)

### Office
- ✅ Word (Desktop, Web)
- ✅ Excel (Desktop, Web)
- ✅ PowerPoint (Desktop, Web)
- ✅ Outlook (Desktop, Web)

## 🚀 Deployment Checklist

### Before Deployment
- [ ] App is deployed and accessible at `https://ccprojectmanager.web.app`
- [ ] All icon files are generated and included
- [ ] Manifest files are updated with correct URLs
- [ ] HTTPS is properly configured
- [ ] Firebase security rules are deployed

### Testing Checklist
- [ ] Teams tab loads correctly
- [ ] Office add-in appears in ribbon
- [ ] Authentication works in both platforms
- [ ] Real-time updates function properly
- [ ] Theme integration works
- [ ] Mobile responsiveness is good

## 🐛 Troubleshooting

### Common Issues

#### App Not Loading
- Check HTTPS requirement
- Verify domain in manifest
- Check browser console for errors

#### Icons Not Showing
- Ensure all icon files are included
- Verify icon URLs are accessible
- Check icon file sizes

#### Authentication Issues
- Verify Firebase configuration
- Check security rules
- Ensure user has proper permissions

### Debug Commands

```javascript
// Check if running in Teams
console.log('In Teams:', window.location.href.includes('teams.microsoft.com'));

// Check if running in Office
console.log('In Office:', typeof Office !== 'undefined');

// Test Teams service
import('./teamsService.js').then(module => {
  const teamsService = module.default;
  console.log('Teams initialized:', teamsService.isInTeams());
});
```

## 📞 Support

### Documentation
- [Microsoft Teams Developer Documentation](https://docs.microsoft.com/en-us/microsoftteams/platform/)
- [Office Add-ins Documentation](https://docs.microsoft.com/en-us/office/dev/add-ins/)
- [Teams SDK Reference](https://docs.microsoft.com/en-us/javascript/api/teams-js/)

### Community
- [Teams Developer Community](https://techcommunity.microsoft.com/t5/microsoft-teams/ct-p/MicrosoftTeams)
- [Office Add-ins Community](https://techcommunity.microsoft.com/t5/office-add-ins/ct-p/Office_Add_Ins)

### Contact
For app-specific issues:
- Email: support@c-cdev.com
- Teams: C&C Development channel
- GitHub: Create an issue in the repository

## 📄 License

This Teams/Office integration is part of the C&C Project Manager application and follows the same licensing terms.

---

**🎉 Your C&C Project Manager is now ready for Teams and Office! 🚀** 