# Security Setup Guide

## Overview
This app now includes comprehensive role-based access control (RBAC) and organization-based data segregation. Here's how to set it up:

## User Roles

### Admin
- Full access to all features
- User management (view, edit roles)
- Data import/export
- Organization settings

### Editor  
- Create, edit, and delete tasks
- Mark tasks as complete/urgent
- View all organization data
- Cannot manage users or access admin features

### Viewer
- View tasks and data only
- Mark tasks as complete (but cannot edit/delete)
- No access to admin features

## Setup Instructions

### 1. Deploy Firestore Security Rules

1. Install Firebase CLI if you haven't already:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project (if not already done):
   ```bash
   firebase init firestore
   ```

4. Deploy the security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

### 2. Set Up Initial Admin User

1. Sign in with your admin email (e.g., your @c-cdev.com email)
2. The system will automatically create a user profile with Editor role
3. To promote yourself to Admin, you'll need to manually update your role in Firestore:

   ```javascript
   // In Firebase Console > Firestore > users collection
   // Find your user document and change:
   role: "editor" → role: "admin"
   ```

### 3. Organization Structure

The app is configured for C&C Development organization:
- **Organization ID**: `c-cdev`
- **Organization Name**: `C&C Development`
- **Domain**: `c-cdev.com`

All data is automatically segregated by organization, so users can only see data from their own organization.

## Security Features

### Data Segregation
- All tasks and overrides include `organizationId` field
- Users can only access data from their organization
- Firestore queries are filtered by organization

### Role-Based Permissions
- UI elements are conditionally rendered based on user role
- Server-side security rules enforce permissions
- Users cannot access features they don't have permission for

### Authentication
- Restricted to @c-cdev.com emails and your personal email
- Google Sign-in and email/password authentication
- Automatic user profile creation on first sign-in

## Testing the System

1. **Test as Admin**:
   - Sign in with admin account
   - Verify you can see all tabs (Dashboard, Calendar, Sort, Add, Data, Users, Settings)
   - Test user management features
   - Verify you can import/export data

2. **Test as Editor**:
   - Create a new user with editor role
   - Sign in with editor account
   - Verify you can see: Dashboard, Calendar, Sort, Add, Settings
   - Verify you cannot see: Data, Users tabs
   - Test creating and editing tasks

3. **Test as Viewer**:
   - Create a new user with viewer role
   - Sign in with viewer account
   - Verify you can see: Dashboard, Calendar, Sort, Settings
   - Verify you cannot see: Add, Data, Users tabs
   - Verify you can mark tasks complete but cannot edit/delete

## Troubleshooting

### Common Issues

1. **"Insufficient permissions" errors**:
   - Check that Firestore security rules are deployed
   - Verify user has correct role in users collection
   - Check that user belongs to correct organization

2. **Users can't see their data**:
   - Verify tasks have correct `organizationId` field
   - Check that user profile has correct `organizationId`

3. **Security rules deployment fails**:
   - Ensure you're logged into correct Firebase project
   - Check that firestore.rules file is in project root
   - Verify Firebase CLI is up to date

### Manual Database Updates

If you need to manually update user roles or organization data:

```javascript
// In Firebase Console > Firestore

// Update user role
users/{userId} → role: "admin"

// Update task organization
tasks/{taskId} → organizationId: "c-cdev"

// Update override organization  
taskOverrides/{overrideId} → organizationId: "c-cdev"
```

## Next Steps

After setting up security:

1. **Add more organizations** (if needed):
   - Update the DEFAULT_ORG in Auth.js
   - Create organization documents in Firestore
   - Update security rules for multi-org support

2. **Customize roles**:
   - Add new roles in Auth.js ROLES object
   - Update role hierarchy in security rules
   - Add role-specific UI elements

3. **Add audit logging**:
   - Track user actions in separate collection
   - Log role changes and data modifications
   - Create admin audit dashboard

4. **Enhanced security**:
   - Add IP whitelisting
   - Implement session management
   - Add two-factor authentication 