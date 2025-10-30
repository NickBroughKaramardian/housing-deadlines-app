# SharePoint REST API Setup Guide

## Azure AD App Registration Configuration

To enable SharePoint REST API access for updating Person fields, you need to add the SharePoint API permissions to your Azure AD App Registration.

### Step 1: Navigate to Azure Portal
1. Go to https://portal.azure.com
2. Navigate to **Azure Active Directory** → **App registrations**
3. Find and click on your app: **C&C Project Manager** (Client ID: `d34dc476-5d84-47b9-aef5-cf7705bb1d65`)

### Step 2: Add SharePoint API Permissions
1. In the left sidebar, click **API permissions**
2. Click **+ Add a permission**
3. Select **SharePoint** (not Microsoft Graph)
4. Choose **Delegated permissions**
5. Expand **AllSites** and check:
   - `AllSites.FullControl` (Full control of all site collections)
   - OR `AllSites.Write` (Edit items in all site collections)
6. Click **Add permissions**

### Step 3: Grant Admin Consent
1. Back on the **API permissions** page, click **Grant admin consent for [Your Organization]**
2. Click **Yes** to confirm
3. Wait for the status to show "Granted for [Your Organization]"

### Step 4: Verify Permissions
Your app should now have these permissions:
- **Microsoft Graph:**
  - User.Read
  - User.ReadBasic.All
  - Sites.ReadWrite.All
  - Files.ReadWrite.All
- **SharePoint:**
  - AllSites.FullControl (or AllSites.Write)

### Step 5: Test the Application
1. Clear your browser cache and cookies for `ccprojectmanager.web.app`
2. Re-login to the application
3. Try updating a Responsible Party field

---

## Alternative: Use Sites.ReadWrite.All from Microsoft Graph

If you prefer not to add SharePoint-specific permissions, you can modify the code to use the existing `Sites.ReadWrite.All` permission from Microsoft Graph, but this requires a different token acquisition approach.

---

## Troubleshooting

### Error: "AADSTS65001: The user or administrator has not consented"
**Solution:** Complete Step 3 (Grant admin consent)

### Error: "AADSTS70011: The provided value for the input parameter 'scope' is not valid"
**Solution:** Ensure the scope is exactly `https://ccdapstest.sharepoint.com/.default`

### Error: "403 Forbidden" when calling SharePoint REST API
**Solution:** 
1. Verify the user has permissions to the Tasks list in SharePoint
2. Check that AllSites.FullControl or AllSites.Write is granted

### Token Acquisition Fails
**Solution:** Try signing out and signing back in to acquire a new token with the updated permissions

---

## Current Configuration

The app is configured to use:
- **SharePoint Site:** `https://ccdapstest.sharepoint.com/sites/CCProjectManager`
- **Scope:** `https://ccdapstest.sharepoint.com/.default`
- **Tenant:** `ef2d00a3-af23-40a6-b9cb-3f7b009b729f`

This configuration is defined in `src/azureConfig.js`. 