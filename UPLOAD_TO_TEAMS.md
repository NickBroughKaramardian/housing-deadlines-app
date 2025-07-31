# 🚀 Upload C&C Project Manager to Microsoft Teams

## Quick Start Guide

### **Step 1: Create App Icons (Required)**

You need to create two PNG icons for Teams:

1. **Open the icon converter**: Open `icon-converter.html` in your browser
2. **Download the required sizes**:
   - Click "Download 192x192" → Save as `color.png`
   - Click "Download 32x32" → Save as `outline.png`
3. **Move icons to package**: Copy both files to `teams-app-package/` folder

### **Step 2: Create the App Package**

```bash
# Navigate to the teams-app-package directory
cd teams-app-package

# Create a ZIP file containing:
# - teams-manifest.json
# - color.png (192x192)
# - outline.png (32x32)
```

**On Mac/Linux:**
```bash
zip -r cc-project-manager.zip .
```

**On Windows:**
- Right-click the folder → "Send to" → "Compressed (zipped) folder"
- Rename to `cc-project-manager.zip`

### **Step 3: Enable Developer Preview in Teams**

1. **Open Microsoft Teams**
2. **Go to Settings**:
   - Click your profile picture → Settings
   - Or press `Ctrl/Cmd + ,`
3. **Enable Developer Preview**:
   - Click "About Teams" in the left sidebar
   - Toggle "Developer preview" to ON
4. **Restart Teams** when prompted

### **Step 4: Upload Your App**

1. **Open Teams Apps**:
   - Click the "Apps" icon in the left sidebar
   - Or go to the Apps store

2. **Upload Custom App**:
   - Click "Manage your apps" (at the bottom)
   - Click "Upload a custom app"
   - Select your `cc-project-manager.zip` file
   - Click "Add"

3. **Add to Channel**:
   - Go to any channel in your team
   - Click the "+" button next to the tabs
   - Search for "C&C Project Manager"
   - Click "Add"

### **Step 5: Configure the App**

When you add the app to a channel, you'll see a configuration page:

- **Tab Name**: "C&C Project Manager" (or customize)
- **Entity ID**: Leave as default or customize
- **Content URL**: Should auto-fill with your app URL
- **Website URL**: Should auto-fill with your app URL

Click "Save" to complete the setup.

## 🎯 **What You'll See**

### **In Teams Channel**
- A new tab called "C&C Project Manager"
- Your app embedded directly in the channel
- Team members can collaborate on tasks
- Real-time updates across all users

### **Personal App**
- App icon in the Teams sidebar
- Individual access to your tasks
- Quick access to deadlines

## 🔧 **Troubleshooting**

### **App Not Loading**
- ✅ Check that your app is deployed: https://ccprojectmanager.web.app
- ✅ Verify HTTPS is working
- ✅ Check browser console for errors

### **Icons Not Showing**
- ✅ Ensure `color.png` is 192x192 pixels
- ✅ Ensure `outline.png` is 32x32 pixels
- ✅ Verify both files are in the ZIP package

### **Developer Preview Not Available**
- ✅ Make sure you're using the Teams desktop app
- ✅ Check that you have admin permissions
- ✅ Try restarting Teams after enabling developer preview

### **Upload Fails**
- ✅ Check the ZIP file structure
- ✅ Verify `teams-manifest.json` is valid
- ✅ Ensure all required files are included

## 📱 **Testing Your App**

### **Test Features**
1. **Authentication**: Try logging in with your credentials
2. **Task Management**: Create, edit, and delete tasks
3. **Real-time Updates**: Have another user make changes
4. **Notifications**: Check if Teams notifications work
5. **Theme**: Switch between light/dark mode in Teams

### **Debug Commands**
Open browser console in Teams and run:
```javascript
// Check if Teams SDK is loaded
console.log('Teams SDK:', typeof microsoftTeams);

// Check if running in Teams
console.log('In Teams:', window.location.href.includes('teams.microsoft.com'));

// Test Teams service
import('./teamsService.js').then(module => {
  const teamsService = module.default;
  console.log('Teams initialized:', teamsService.isInTeams());
});
```

## 🚀 **Production Deployment**

For production use, you'll need to:

1. **Create Azure App Registration**
2. **Update manifest with your app ID**
3. **Submit to Teams App Store**

But for testing and internal use, the developer preview method above works perfectly!

## 📞 **Need Help?**

If you encounter issues:

1. **Check the console**: Look for error messages
2. **Verify deployment**: Ensure your app is live at https://ccprojectmanager.web.app
3. **Test locally**: Try running the app outside of Teams first
4. **Check Teams logs**: Look for Teams-specific errors

## 🎉 **Success!**

Once uploaded, your team can:
- ✅ Access project management directly in Teams
- ✅ Collaborate on deadlines in real-time
- ✅ Get Teams notifications for upcoming tasks
- ✅ Share specific tasks via deep links
- ✅ Use the app on mobile Teams app

Your C&C Project Manager is now fully integrated with Microsoft Teams! 🚀 