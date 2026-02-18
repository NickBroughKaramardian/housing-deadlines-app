import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './Auth';
import themeService from './themeService';
import { taskManager } from './services/taskManager';
import { auditService } from './services/auditService';
import { ROLES } from './microsoftAuthService';
import * as userDataApi from './services/userDataApi';
import { microsoftDataService } from './microsoftDataService';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { uploadImage, deleteImage } from './services/imageUploadService';
import NotificationSettings from './components/NotificationSettings';
import * as emailService from './services/emailService';
import { setCurrentUserEmail } from './services/tasksApi';
import { useUserDepartments } from './contexts/UserDepartmentsContext';
const { getEmailLogs } = emailService;

function SettingsPage() {
  const { user, userProfile } = useAuth();
  const { userDepartments } = useUserDepartments();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Profile state
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const fileInputRef = useRef(null);
  const [userAssignment, setUserAssignment] = useState(null);
  
  // Theme and dark mode state
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Department filter state (from Cosmos DB user assignment)
  const [departmentFilterEnabled, setDepartmentFilterEnabled] = useState(true); // Default ON
  const [isLoadingFilter, setIsLoadingFilter] = useState(true);
  const [isTogglingFilter, setIsTogglingFilter] = useState(false);
  
  // Developer panel state
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupResults, setCleanupResults] = useState(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResults, setAuditResults] = useState(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResults, setMigrationResults] = useState(null);
  const [sendingExampleEmail, setSendingExampleEmail] = useState(null);
  const [exampleEmailResult, setExampleEmailResult] = useState(null);
  const [emailLogs, setEmailLogs] = useState([]);
  const [loadingEmailLogs, setLoadingEmailLogs] = useState(false);
  const [emailLogFilter, setEmailLogFilter] = useState('all'); // 'all', 'sent', 'failed'
  const [syncingNames, setSyncingNames] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  
  // Check if user has admin access (Developer, Owner, or Admin)
  const hasAdminAccess = userProfile?.role === ROLES.DEVELOPER || 
                         userProfile?.role === 'DEVELOPER' ||
                         userProfile?.role === ROLES.OWNER || 
                         userProfile?.role === 'OWNER' ||
                         userProfile?.role === ROLES.ADMIN || 
                         userProfile?.role === 'ADMIN';

  // Load current theme settings
  useEffect(() => {
    const loadThemeSettings = () => {
      try {
        const currentTheme = themeService.getCurrentTheme();
        const isDark = themeService.getDarkMode();
        setIsDarkMode(isDark);
      } catch (err) {
        console.error('Error loading theme settings:', err);
      }
    };

    loadThemeSettings();

    // Listen for theme changes
    const handler = () => loadThemeSettings();
    window.addEventListener('themeChanged', handler);
    return () => window.removeEventListener('themeChanged', handler);
  }, []);

  // Load email logs on mount and when filter changes
  // CRITICAL: Wait for userProfile to be loaded so buildHeaders can get user email
  useEffect(() => {
    const loadEmailLogs = async () => {
      if (!hasAdminAccess) return;
      if (!userProfile) return; // Wait for user profile to be loaded
      
      // CRITICAL: Ensure user email is set for API calls
      const userEmail = userProfile.email || userProfile.mail || userProfile.userPrincipalName;
      if (!userEmail) {
        console.warn('[SettingsPage] Cannot load email logs: user email not available');
        return;
      }
      
      // Set user email for API calls (buildHeaders needs this)
      setCurrentUserEmail(userEmail);
      
      try {
        setLoadingEmailLogs(true);
        const status = emailLogFilter === 'all' ? null : emailLogFilter;
        // Fetch all logs but only display first 10 with scroll
        const logs = await emailService.getEmailLogs({ limit: 1000, status });
        setEmailLogs(logs);
      } catch (error) {
        console.error('Error loading email logs:', error);
        setEmailLogs([]);
      } finally {
        setLoadingEmailLogs(false);
      }
    };

    loadEmailLogs();
  }, [hasAdminAccess, emailLogFilter, userProfile]); // Add userProfile as dependency

  // Load department filter setting from Cosmos DB user assignment
  useEffect(() => {
    const loadDepartmentFilterSetting = async () => {
      if (!userProfile) {
        setIsLoadingFilter(false);
        return;
      }
      
      try {
        setIsLoadingFilter(true);
        const userId = userProfile.id || userProfile.userId;
        if (userId) {
          const assignments = await userDataApi.getAllUserAssignments();
          const userAssignment = assignments.find(a => a.userId === userId);
          
          if (userAssignment && userAssignment.departmentFilterEnabled !== undefined) {
            setDepartmentFilterEnabled(userAssignment.departmentFilterEnabled);
          } else {
            // Default to true (filtering ON) if not set
            setDepartmentFilterEnabled(true);
          }
        }
      } catch (err) {
        console.error('Error loading department filter setting:', err);
        // Default to true on error
        setDepartmentFilterEnabled(true);
      } finally {
        setIsLoadingFilter(false);
      }
    };

    loadDepartmentFilterSetting();
  }, [userProfile]);

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      console.log('🔍 PROFILE LOAD: Starting profile load...');
      try {
        const userEmail = userProfile?.email || userProfile?.mail || userProfile?.userPrincipalName || '';
        console.log('🔍 PROFILE LOAD: User email:', userEmail);
        if (!userEmail) {
          console.log('⚠️ PROFILE LOAD: No user email found, skipping');
          return;
        }

        let assignment = null;
        try {
          const userId = userProfile.id || userEmail;
          console.log('🔍 PROFILE LOAD: Fetching assignment for userId:', userId);
          assignment = await userDataApi.getUserAssignment(userId);
          console.log('🔍 PROFILE LOAD: Assignment fetched:', {
            found: !!assignment,
            hasPhone: !!assignment?.phone,
            hasProfileRole: !!assignment?.profileRole,
            hasPhotoUrl: !!assignment?.profilePhotoUrl,
            photoUrl: assignment?.profilePhotoUrl || 'NULL'
          });
          
          if (assignment) {
            setUserAssignment(assignment);
            // Preserve existing values if assignment values are null/undefined (don't reset to empty)
            setPhone(assignment.phone !== undefined && assignment.phone !== null 
              ? assignment.phone 
              : phone);
            setRole(assignment.profileRole !== undefined && assignment.profileRole !== null
              ? assignment.profileRole
              : (assignment.role !== undefined && assignment.role !== null
                ? assignment.role
                : role));
            // CRITICAL: Respect null from assignment - if assignment.profilePhotoUrl is null, keep it null
            // Only fallback to userProfile if assignment doesn't exist OR profilePhotoUrl is undefined
            // Priority: assignment.profilePhotoUrl (even if null) > userProfile (only if assignment missing/undefined)
            const photoUrl = assignment.profilePhotoUrl !== undefined 
              ? assignment.profilePhotoUrl 
              : (userProfile?.profilePhotoUrl || null);
            setImagePreview(photoUrl);
            console.log('✅ PROFILE LOAD: Profile data loaded from assignment, photoUrl:', photoUrl || 'NULL');
          } else {
            console.log('⚠️ PROFILE LOAD: No assignment found');
            // Only load from userProfile if assignment doesn't exist
            if (userProfile?.profilePhotoUrl) {
              setImagePreview(userProfile.profilePhotoUrl);
              console.log('✅ PROFILE LOAD: Using photo from userProfile:', userProfile.profilePhotoUrl);
            } else {
              setImagePreview(null);
            }
          }
        } catch (err) {
          console.error('⚠️ PROFILE LOAD: Error fetching assignment:', err);
          console.log('No user assignment found, will create one if saving profile');
          // Fallback to userProfile
          if (userProfile?.profilePhotoUrl) {
            setImagePreview(userProfile.profilePhotoUrl);
            console.log('✅ PROFILE LOAD: Using photo from userProfile (fallback):', userProfile.profilePhotoUrl);
          }
        }

        // Load contact data (same logic as ContactListPage) to get phone/role for display
        // This ensures we show the same data that appears in the contact card
        let contactPhone = '';
        let contactRole = '';
        
        try {
          // Get all user assignments to find current user's contact data
          const allAssignments = await userDataApi.getAllUserAssignments();
          const userAssignmentForContact = allAssignments.find(a => a.userId === (userProfile.id || userEmail));
          
          // Get enterprise users to merge with assignment data
          const enterpriseUsers = await microsoftDataService.users.getEnterpriseUsers();
          const currentUser = enterpriseUsers.find(u => 
            (u.mail || u.userPrincipalName || '').toLowerCase() === userEmail.toLowerCase()
          );
          
          // Use same logic as ContactListPage: assignment > enterprise user > empty
          if (userAssignmentForContact) {
            contactPhone = userAssignmentForContact.phone || currentUser?.mobilePhone || currentUser?.businessPhones?.[0] || '';
            contactRole = userAssignmentForContact.profileRole || currentUser?.jobTitle || currentUser?.department || '';
          } else if (currentUser) {
            contactPhone = currentUser.mobilePhone || currentUser.businessPhones?.[0] || '';
            contactRole = currentUser.jobTitle || currentUser.department || '';
          }
          
          // Set phone/role from contact data if we have values, otherwise preserve existing
          // This ensures the display matches what's shown in the contact card
          if (contactPhone) {
            setPhone(contactPhone);
          } else if (!phone) {
            // Only set to empty if we don't have a value already
            setPhone('');
          }
          
          if (contactRole) {
            setRole(contactRole);
          } else if (!role) {
            // Only set to empty if we don't have a value already
            setRole('');
          }
          
          console.log('✅ PROFILE LOAD: Contact data loaded:', {
            phone: contactPhone || 'EMPTY',
            role: contactRole || 'EMPTY'
          });
        } catch (contactErr) {
          console.warn('⚠️ PROFILE LOAD: Error loading contact data:', contactErr);
          // Fallback to Graph if contact data load fails
          if (!assignment?.phone && !assignment?.profileRole) {
            const enterpriseUsers = await microsoftDataService.users.getEnterpriseUsers();
            const currentUser = enterpriseUsers.find(u => 
              (u.mail || u.userPrincipalName || '').toLowerCase() === userEmail.toLowerCase()
            );
            if (currentUser) {
              setPhone(prev => prev || currentUser.mobilePhone || currentUser.businessPhones?.[0] || '');
              setRole(prev => prev || currentUser.jobTitle || currentUser.department || '');
            }
          }
        }
      } catch (err) {
        console.error('❌ PROFILE LOAD: Error loading profile:', err);
        setProfileError('Failed to load profile data');
      }
    };

    if (userProfile) {
      loadProfile();
    }

    // Listen for profile updates to refresh immediately
    const handleProfileUpdate = async (event) => {
      if (event.detail?.userId === userProfile?.id) {
        console.log('🔍 PROFILE LOAD: Profile updated event received, reloading...');
        await loadProfile();
      }
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
    };
  }, [userProfile]); // Removed phone, role from dependencies to prevent infinite loops

  // Profile image resize function
  const resizeImage = (file, maxWidth = 400, maxHeight = 400) => {
    return new Promise((resolve, reject) => {
      if (file.size > 7 * 1024 * 1024) {
        reject(new Error('File size must be less than 7MB'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Failed to resize image'));
            },
            file.type,
            0.9
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Handle image file selection
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (!file.type.startsWith('image/')) {
        setProfileError('File must be an image');
        return;
      }

      const resizedBlob = await resizeImage(file, 400, 400);
      const resizedFile = new File([resizedBlob], file.name, { type: file.type });

      setImageFile(resizedFile);

      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(resizedFile);

      setProfileError('');
    } catch (error) {
      console.error('Error processing image:', error);
      setProfileError(error.message);
    }
  };

  // Handle remove image - only clears local state, save happens when user clicks "Save Profile"
  const handleRemoveImage = () => {
    console.log('🔍 PROFILE REMOVE: Clearing photo from local state (will save when user clicks Save Profile)');
    
    // Clear local state only - don't save yet
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Clear any error messages
    setProfileError('');
  };

  // Handle save profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    console.log('🔍 PROFILE SAVE: Starting save process...');
    setSavingProfile(true);
    setProfileMessage('');
    setProfileError('');

    try {
      const userEmail = userProfile?.email || userProfile?.mail || userProfile?.userPrincipalName || '';
      console.log('🔍 PROFILE SAVE: User email:', userEmail);
      if (!userEmail) {
        throw new Error('User email not found');
      }

      // CRITICAL: Get current photo URL - respect null if imagePreview is explicitly null (removal)
      // Priority: 1) imageFile (new upload), 2) imagePreview (if URL, not data URL), 3) null if imagePreview is null (removal)
      let photoUrl = null;
      
      // Get current photo URL before any changes (for blob deletion if removing)
      const currentPhotoUrl = imagePreview && !imagePreview.startsWith('data:') 
        ? imagePreview 
        : (userAssignment?.profilePhotoUrl || userProfile?.profilePhotoUrl || null);
      
      if (imageFile) {
        // New image file uploaded - upload it
        console.log('🔍 PROFILE SAVE: Starting image upload...');
        setUploading(true);
        try {
          photoUrl = await uploadImage(imageFile);
          console.log('✅ PROFILE SAVE: Image uploaded successfully, URL:', photoUrl);
          
          // Delete old photo from blob storage if it exists
          if (currentPhotoUrl && currentPhotoUrl !== photoUrl) {
            try {
              console.log('🔍 PROFILE SAVE: Deleting old image from blob storage...');
              await deleteImage(currentPhotoUrl);
              console.log('✅ PROFILE SAVE: Old image deleted from blob storage');
            } catch (imgErr) {
              console.warn('⚠️ PROFILE SAVE: Failed to delete old image from blob storage:', imgErr);
              // Continue anyway - best effort
            }
          }
        } catch (uploadError) {
          console.error('❌ PROFILE SAVE: Image upload failed:', uploadError);
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        } finally {
          setUploading(false);
        }
      } else if (imagePreview === null) {
        // imagePreview is explicitly null - user clicked remove, so remove the photo
        console.log('🔍 PROFILE SAVE: Photo removal requested (imagePreview is null)');
        photoUrl = null;
        
        // Delete from blob storage if it exists
        if (currentPhotoUrl) {
          try {
            console.log('🔍 PROFILE SAVE: Deleting image from blob storage...');
            await deleteImage(currentPhotoUrl);
            console.log('✅ PROFILE SAVE: Image deleted from blob storage');
          } catch (imgErr) {
            console.warn('⚠️ PROFILE SAVE: Failed to delete image from blob storage:', imgErr);
            // Continue anyway - best effort
          }
        }
      } else if (imagePreview && !imagePreview.startsWith('data:')) {
        // imagePreview is a URL (from database), not a data URL - preserve it
        photoUrl = imagePreview;
        console.log('🔍 PROFILE SAVE: Preserving existing photo URL:', photoUrl);
      } else {
        // imagePreview is a data URL (preview only, not saved yet) or undefined
        // Fallback to existing values only if imagePreview is undefined (not explicitly null)
        if (imagePreview === undefined) {
          photoUrl = userAssignment?.profilePhotoUrl || userProfile?.profilePhotoUrl || null;
          console.log('🔍 PROFILE SAVE: Using existing photo URL from assignment/userProfile:', photoUrl || 'NULL');
        } else {
          // imagePreview is a data URL - this shouldn't happen here, but handle it
          photoUrl = null;
          console.log('⚠️ PROFILE SAVE: imagePreview is data URL but no imageFile - setting to null');
        }
      }
      
      console.log('🔍 PROFILE SAVE: Final photo URL:', photoUrl ? 'EXISTS' : 'NULL');

      const userId = userProfile?.id || userEmail;
      console.log('🔍 PROFILE SAVE: User ID:', userId);
      
      // Get current assignment to preserve ALL existing data (especially departments!)
      const currentAssignment = userAssignment || {};
      console.log('🔍 PROFILE SAVE: Current assignment:', {
        hasRole: !!currentAssignment.role,
        departmentsCount: currentAssignment.departments?.length || 0,
        hasPhone: !!currentAssignment.phone,
        hasProfileRole: !!currentAssignment.profileRole,
        hasPhotoUrl: !!currentAssignment.profilePhotoUrl
      });
      
      // CRITICAL: Preserve existing phone/profileRole if new values are empty
      // Only send phone/profileRole if they have values, otherwise preserve existing
      const phoneValue = phone.trim();
      const roleValue = role.trim();
      
      const assignmentData = {
        email: userEmail,
        role: currentAssignment.role || userProfile?.role || 'VIEWER',
        departments: currentAssignment.departments || userProfile?.departments || [],
        departmentFilterEnabled: currentAssignment.departmentFilterEnabled !== undefined 
          ? currentAssignment.departmentFilterEnabled 
          : (userProfile?.departmentFilterEnabled !== undefined ? userProfile.departmentFilterEnabled : true),
        // Preserve existing values if new values are empty
        phone: phoneValue || currentAssignment?.phone || userProfile?.phone || null,
        profileRole: roleValue || currentAssignment?.profileRole || userProfile?.profileRole || null,
        profilePhotoUrl: photoUrl,
        updatedBy: userEmail
      };
      
      console.log('🔍 PROFILE SAVE: Phone preservation check:', {
        phoneValue: phoneValue || 'EMPTY',
        currentPhone: currentAssignment?.phone || 'NULL',
        finalPhone: assignmentData.phone || 'NULL'
      });
      console.log('🔍 PROFILE SAVE: Role preservation check:', {
        roleValue: roleValue || 'EMPTY',
        currentRole: currentAssignment?.profileRole || 'NULL',
        finalRole: assignmentData.profileRole || 'NULL'
      });
      
      console.log('🔍 PROFILE SAVE: Assignment data to send:', {
        userId,
        email: assignmentData.email,
        role: assignmentData.role,
        departmentsCount: assignmentData.departments.length,
        phone: assignmentData.phone || 'NULL',
        profileRole: assignmentData.profileRole || 'NULL',
        profilePhotoUrl: assignmentData.profilePhotoUrl ? 'URL_PRESENT' : 'NULL',
        departmentFilterEnabled: assignmentData.departmentFilterEnabled
      });
      console.log('🔍 PROFILE SAVE: Phone value:', phone.trim() || 'EMPTY');
      console.log('🔍 PROFILE SAVE: Role value:', role.trim() || 'EMPTY');

      console.log('🔍 PROFILE SAVE: Calling API...');
      const savedAssignment = await userDataApi.upsertUserAssignment(userId, assignmentData);
      console.log('✅ PROFILE SAVE: API call successful, saved assignment:', {
        userId: savedAssignment?.userId,
        phone: savedAssignment?.phone || 'NULL',
        profileRole: savedAssignment?.profileRole || 'NULL',
        profilePhotoUrl: savedAssignment?.profilePhotoUrl ? 'URL_PRESENT' : 'NULL'
      });
      
            // CRITICAL: Reload assignment to get latest data from backend
            console.log('🔍 PROFILE SAVE: Reloading assignment to get latest data...');
            const reloadedAssignment = await userDataApi.getUserAssignment(userId);
            if (reloadedAssignment) {
              console.log('✅ PROFILE SAVE: Reloaded assignment:', {
                phone: reloadedAssignment.phone || 'NULL',
                profileRole: reloadedAssignment.profileRole || 'NULL',
                profilePhotoUrl: reloadedAssignment.profilePhotoUrl ? 'URL_PRESENT' : 'NULL'
              });
              
              // Update local state with reloaded data (ensures we have latest from backend)
              setUserAssignment(reloadedAssignment);
              // Preserve existing values if reloaded is null/undefined (don't reset to empty)
              setPhone(reloadedAssignment.phone !== undefined && reloadedAssignment.phone !== null 
                ? reloadedAssignment.phone 
                : phone);
              setRole(reloadedAssignment.profileRole !== undefined && reloadedAssignment.profileRole !== null
                ? reloadedAssignment.profileRole
                : (reloadedAssignment.role !== undefined && reloadedAssignment.role !== null
                  ? reloadedAssignment.role
                  : role));
              
              // Update imagePreview - respect null from reloaded assignment
              const finalPhotoUrl = reloadedAssignment.profilePhotoUrl !== undefined
                ? reloadedAssignment.profilePhotoUrl
                : null;
              setImagePreview(finalPhotoUrl);
              console.log('✅ PROFILE SAVE: Updated all state from reloaded assignment');
              
              // Dispatch event with reloaded data
              window.dispatchEvent(new CustomEvent('userProfileUpdated', {
                detail: {
                  userId: userId,
                  profilePhotoUrl: finalPhotoUrl,
                  phone: reloadedAssignment.phone || null,
                  profileRole: reloadedAssignment.profileRole || null
                }
              }));
            } else {
              // Fallback to savedAssignment if reload fails
              console.warn('⚠️ PROFILE SAVE: Failed to reload assignment, using savedAssignment');
              const finalPhotoUrl = savedAssignment?.profilePhotoUrl !== undefined
                ? savedAssignment.profilePhotoUrl
                : photoUrl;
              setUserAssignment(savedAssignment);
              // Preserve existing values if savedAssignment is null/undefined
              setPhone(savedAssignment?.phone !== undefined && savedAssignment?.phone !== null
                ? savedAssignment.phone
                : phone);
              setRole(savedAssignment?.profileRole !== undefined && savedAssignment?.profileRole !== null
                ? savedAssignment.profileRole
                : (savedAssignment?.role !== undefined && savedAssignment?.role !== null
                  ? savedAssignment.role
                  : role));
              setImagePreview(finalPhotoUrl);
              
              window.dispatchEvent(new CustomEvent('userProfileUpdated', {
                detail: {
                  userId: userId,
                  profilePhotoUrl: finalPhotoUrl,
                  phone: savedAssignment?.phone || null,
                  profileRole: savedAssignment?.profileRole || null
                }
              }));
            }

      // Check if photo was removed (imagePreview is null but was previously set)
      const hadPhotoBefore = userAssignment?.profilePhotoUrl || userProfile?.profilePhotoUrl;
      const photoWasRemoved = !imagePreview && photoUrl === null && hadPhotoBefore;
      if (photoWasRemoved) {
        setProfileMessage('Update will take effect upon refresh.');
      } else {
        setProfileMessage('Profile updated successfully!');
      }
      setImageFile(null);
      console.log('✅ PROFILE SAVE: Complete!');

      setTimeout(() => setProfileMessage(''), 3000);
    } catch (err) {
      console.error('❌ PROFILE SAVE: Error saving profile:', err);
      console.error('❌ PROFILE SAVE: Error stack:', err.stack);
      setProfileError(err.message || 'Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle dark mode toggle
  const handleDarkModeToggle = () => {
    try {
      themeService.toggleDarkMode();
      setIsDarkMode(!isDarkMode);
      setMessage('Theme updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error toggling dark mode:', err);
      setError('Failed to update theme. Please try again.');
      setTimeout(() => setError(''), 5000);
    }
  };

  // Handle department filter toggle - updates Cosmos DB and forces task refresh
  const handleDepartmentFilterToggle = async () => {
    if (!hasAdminAccess) return; // Only admins can toggle
    if (isTogglingFilter) return;
    
    try {
      setIsTogglingFilter(true);
      const newValue = !departmentFilterEnabled;
      const userId = userProfile?.id || userProfile?.userId;
      const userEmail = userProfile?.email || userProfile?.mail || userProfile?.userPrincipalName;
      
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Get current assignments to preserve other fields
      const assignments = await userDataApi.getAllUserAssignments();
      const currentAssignment = assignments.find(a => a.userId === userId);
      
      // Update the department filter setting in Cosmos DB
      await userDataApi.upsertUserAssignment(userId, {
        role: currentAssignment?.role || userProfile?.role,
        departments: currentAssignment?.departments || userProfile?.departments || [],
        email: userEmail, // Store email for lookup
        departmentFilterEnabled: newValue,
        updatedBy: userEmail
      });
      
      setDepartmentFilterEnabled(newValue);
      
      // Force task refresh to apply the new filter setting
      console.log('Department filter toggled to:', newValue, '- forcing task refresh...');
      taskManager.isInitialized = false;
      await taskManager.initialize(true);
      
      // Dispatch event to notify other pages
      window.dispatchEvent(new CustomEvent('departmentFilterSettingChanged', {
        detail: { enabled: newValue }
      }));
      window.dispatchEvent(new CustomEvent('taskDataChanged', {
        detail: { source: 'departmentFilterToggle', filterEnabled: newValue }
      }));
      
      setMessage(`Department filter ${newValue ? 'enabled' : 'disabled'}. Tasks have been refreshed.`);
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      console.error('Error toggling department filter:', err);
      setError('Failed to update department filter setting. Please try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsTogglingFilter(false);
    }
  };

  // Admin Panel: Cleanup & Sync - Actually fixes discrepancies including deleting from Cosmos DB
  const handleCleanupSync = async () => {
    if (!hasAdminAccess) return;
    
    setIsCleaningUp(true);
    setCleanupResults(null);
    setError('');
    
    const results = {
      phantomsPurged: 0,
      orphansDeleted: 0,
      missingReloaded: 0,
      deletedIdsCleared: 0,
      pendingUpdatesCleared: 0,
      tasksBeforeRefresh: 0,
      tasksAfterRefresh: 0,
      localStorageItemsCleared: [],
      auditIssuesFound: 0,
      deletionErrors: [],
      timestamp: new Date().toISOString()
    };
    
    try {
      console.group('🧹 Admin Cleanup & Sync');
      console.log('Starting cleanup at:', results.timestamp);
      
      // 1. Run audit first to find issues
      console.log('Step 1: Running audit to find discrepancies...');
      const auditResults = await auditService.runFullAudit();
      results.auditIssuesFound = auditResults?.issues?.length || 0;
      console.log(`Found ${results.auditIssuesFound} issues`);
      
      // 2. Delete orphaned instances from Cosmos DB (instances whose template doesn't exist)
      if (auditResults?.orphanedInstances?.length > 0) {
        console.log(`Step 2: Deleting ${auditResults.orphanedInstances.length} orphaned instances from Cosmos DB...`);
        for (const orphan of auditResults.orphanedInstances) {
          try {
            await taskManager.deleteTask(orphan.id);
            results.orphansDeleted++;
            console.log(`Deleted orphaned instance: ${orphan.title} (${orphan.id})`);
          } catch (err) {
            console.error(`Failed to delete orphan ${orphan.id}:`, err);
            results.deletionErrors.push(`${orphan.title}: ${err.message}`);
          }
        }
        console.log(`Deleted ${results.orphansDeleted} orphaned instances`);
      }
      
      // 3. Purge phantom tasks (in memory but not in database)
      if (auditResults?.phantomTasks?.length > 0) {
        console.log(`Step 3: Purging ${auditResults.phantomTasks.length} phantom tasks from memory...`);
        const purgeCount = await auditService.purgePhantomTasks();
        results.phantomsPurged = purgeCount;
        console.log(`Purged ${purgeCount} phantom tasks`);
      }
      
      // 4. Clear TaskManager's tracking sets
      if (taskManager.deletedTaskIds) {
        results.deletedIdsCleared = taskManager.deletedTaskIds.size;
        taskManager.deletedTaskIds.clear();
        console.log(`Cleared ${results.deletedIdsCleared} deleted task IDs`);
      }
      
      if (taskManager.pendingUpdates) {
        results.pendingUpdatesCleared = taskManager.pendingUpdates.size;
        taskManager.pendingUpdates.clear();
        console.log(`Cleared ${results.pendingUpdatesCleared} pending updates`);
      }
      
      // 5. Get current task count
      results.tasksBeforeRefresh = taskManager.tasks?.length || 0;
      console.log(`Tasks before refresh: ${results.tasksBeforeRefresh}`);
      
      // 6. Clear stale localStorage items
      const staleKeys = [
        'task_cache',
        'tasks_cache', 
        'cached_tasks',
        'last_sync',
        'pending_operations',
        'optimistic_updates'
      ];
      
      staleKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          results.localStorageItemsCleared.push(key);
          console.log(`Cleared localStorage key: ${key}`);
        }
      });
      
      // 7. Force complete refresh from database
      console.log('Step 4: Forcing fresh load from database...');
      taskManager.isInitialized = false;
      await taskManager.initialize(true);
      
      results.tasksAfterRefresh = taskManager.tasks?.length || 0;
      results.missingReloaded = Math.max(0, results.tasksAfterRefresh - results.tasksBeforeRefresh + results.phantomsPurged + results.orphansDeleted);
      console.log(`Tasks after refresh: ${results.tasksAfterRefresh}`);
      
      // 8. Clear any audit warnings since we've fixed them
      auditService.clearWarning();
      
      // 9. Dispatch event to notify all pages to refresh
      window.dispatchEvent(new CustomEvent('taskDataChanged', {
        detail: { source: 'adminCleanup', timestamp: results.timestamp }
      }));
      
      console.log('Cleanup complete:', results);
      console.groupEnd();
      
      setCleanupResults(results);
      
      const fixedCount = results.phantomsPurged + results.missingReloaded + results.orphansDeleted;
      if (fixedCount > 0 || results.orphansDeleted > 0) {
        const parts = [];
        if (results.orphansDeleted > 0) parts.push(`${results.orphansDeleted} orphaned tasks deleted from database`);
        if (results.phantomsPurged > 0) parts.push(`${results.phantomsPurged} phantom tasks purged from memory`);
        if (results.missingReloaded > 0) parts.push(`${results.missingReloaded} missing tasks reloaded`);
        setMessage(`Cleanup complete! ${parts.join(', ')}.`);
      } else if (results.auditIssuesFound === 0) {
        setMessage('Cleanup complete! No discrepancies found - everything is in sync.');
      } else {
        setMessage('Cleanup & sync completed successfully!');
      }
      setTimeout(() => setMessage(''), 7000);
      
    } catch (err) {
      console.error('Cleanup error:', err);
      console.groupEnd();
      setError(`Cleanup failed: ${err.message}`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsCleaningUp(false);
    }
  };

  // Developer Panel: Database Audit - Uses the same logic as the automatic audit
  const handleDatabaseAudit = async () => {
    if (!hasAdminAccess) return;
    
    setIsAuditing(true);
    setAuditResults(null);
    setError('');
    
    try {
      console.log('🔍 Settings: Running audit using auditService...');
      
      // Use the same audit logic as the automatic startup audit
      const results = await auditService.runFullAudit();
      
      if (!results) {
        throw new Error('Audit returned no results');
      }
      
      // Transform results to match the expected format for display
      const displayResults = {
        memoryTasks: Array.from({ length: results.memoryCount }, (_, i) => ({ id: i })),
        databaseTasks: Array.from({ length: results.cosmosDbCount }, (_, i) => ({ id: i })),
        phantomTasks: results.phantomTasks || [],
        missingTasks: results.missingTasks || [],
        orphanedInstances: results.orphanedInstances || [],
        issues: results.issues || [],
        timestamp: results.timestamp
      };
      
      // Add counts for easier display
      displayResults.memoryCount = results.memoryCount;
      displayResults.databaseCount = results.cosmosDbCount;
      displayResults.issueCount = results.issues?.length || 0;
      
      setAuditResults(displayResults);
      
      if (displayResults.issueCount === 0) {
        setMessage('Audit complete: No discrepancies found!');
      } else {
        const issueTypes = [];
        if (displayResults.phantomTasks.length > 0) issueTypes.push(`${displayResults.phantomTasks.length} phantom`);
        if (displayResults.missingTasks.length > 0) issueTypes.push(`${displayResults.missingTasks.length} missing`);
        if (displayResults.orphanedInstances?.length > 0) issueTypes.push(`${displayResults.orphanedInstances.length} orphaned`);
        setMessage(`Audit complete: Found ${issueTypes.join(', ')} issues.`);
      }
      setTimeout(() => setMessage(''), 5000);
      
    } catch (err) {
      console.error('Audit error:', err);
      setError(`Audit failed: ${err.message}`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsAuditing(false);
    }
  };

  // Developer Panel: Purge Phantom Tasks - Uses auditService
  const handlePurgePhantoms = async () => {
    if (!hasAdminAccess || !auditResults?.phantomTasks?.length) return;
    
    try {
      const count = await auditService.purgePhantomTasks();
      
      setAuditResults(null);
      setMessage(`Successfully purged ${count} phantom task(s)!`);
      setTimeout(() => setMessage(''), 5000);
      
    } catch (err) {
      console.error('Purge error:', err);
      setError(`Purge failed: ${err.message}`);
      setTimeout(() => setError(''), 5000);
    }
  };

  // Developer Panel: Migrate User Emails - Backfill email field for all user assignments
  const handleMigrateUserEmails = async () => {
    if (!hasAdminAccess) return;
    
    setIsMigrating(true);
    setMigrationResults(null);
    setError('');
    
    try {
      console.log('📧 Settings: Starting user email migration...');
      
      // 1. Get enterprise users from Microsoft Graph
      const enterpriseUsers = await microsoftDataService.users.getEnterpriseUsers();
      
      if (!enterpriseUsers || enterpriseUsers.length === 0) {
        throw new Error('No enterprise users found');
      }
      
      console.log(`Found ${enterpriseUsers.length} enterprise users`);
      
      // 2. Build user mappings (userId -> email)
      const userMappings = enterpriseUsers.map(user => ({
        userId: user.id,
        email: user.mail || user.userPrincipalName || user.email || user.Email
      })).filter(mapping => mapping.userId && mapping.email);
      
      console.log(`Built ${userMappings.length} user mappings`);
      
      // 3. Send to migration endpoint
      const results = await userDataApi.migrateUserEmails(userMappings);
      
      console.log('Migration results:', results);
      setMigrationResults(results);
      
      if (results.errors && results.errors.length > 0) {
        setMessage(`Migration completed with ${results.errors.length} error(s). Updated: ${results.updated}, Created: ${results.created}`);
      } else {
        setMessage(`Migration successful! Updated: ${results.updated}, Created: ${results.created}, Skipped: ${results.skipped}`);
      }
      setTimeout(() => setMessage(''), 7000);
      
    } catch (err) {
      console.error('Migration error:', err);
      setError(`Migration failed: ${err.message}`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsMigrating(false);
    }
  };

  // Developer Panel: Reload Missing Tasks - Uses auditService
  const handleReloadMissing = async () => {
    if (!hasAdminAccess || !auditResults?.missingTasks?.length) return;
    
    try {
      await auditService.reloadMissingTasks();
      
      setAuditResults(null);
      setMessage('Successfully reloaded missing tasks!');
      setTimeout(() => setMessage(''), 5000);
      
    } catch (err) {
      console.error('Reload error:', err);
      setError(`Reload failed: ${err.message}`);
      setTimeout(() => setError(''), 5000);
    }
  };

  // Developer Panel: Send Example Email
  const handleSendExampleEmail = async (emailType) => {
    if (!hasAdminAccess || !userProfile?.id) return;
    
    setSendingExampleEmail(emailType);
    setExampleEmailResult(null);
    setError('');
    
    try {
      const result = await emailService.sendExampleEmail(userProfile.id, emailType);
      setExampleEmailResult({
        success: true,
        message: result.message || 'Example email sent successfully!',
        taskName: result.taskName,
        taskCount: result.taskCount
      });
      setMessage(`Example ${emailType} email sent! Check your inbox.`);
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      console.error('Example email error:', err);
      setExampleEmailResult({
        success: false,
        message: err.message || 'Failed to send example email'
      });
      setError(`Failed to send example email: ${err.message}`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setSendingExampleEmail(null);
    }
  };

  const userEmail = userProfile?.email || userProfile?.mail || userProfile?.userPrincipalName || '';
  const displayName = userProfile?.displayName || userProfile?.name || 'User';

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 lg:p-8">
      <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-3">
        <svg className="w-8 h-8 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Settings
      </h2>

      {/* Profile Section */}
      <div className="mb-8 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Profile</h3>
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Profile Messages */}
          {profileMessage && (
            <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-400">{profileMessage}</p>
            </div>
          )}

          {profileError && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">{profileError}</p>
            </div>
          )}

          {/* Profile Photo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Profile Photo
            </label>
            <div className="flex items-start gap-4">
              <div className="relative">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 dark:bg-red-600 text-white rounded-full hover:bg-red-600 dark:hover:bg-red-900 transition-colors"
                      title="Remove photo"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-theme-primary to-theme-primary-dark flex items-center justify-center text-white text-2xl font-bold border-2 border-gray-200 dark:border-gray-700">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1">
                {/* User's Full Name */}
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {displayName}
                </h4>
                
                {/* Upload Photo Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="profile-photo-upload"
                />
                <label
                  htmlFor="profile-photo-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary dark:bg-theme-primary text-white rounded-lg hover:bg-theme-primary-dark dark:hover:bg-green-800 transition-colors cursor-pointer"
                >
                  <PhotoIcon className="w-5 h-5" />
                  {imagePreview ? 'Change Photo' : 'Upload Photo'}
                </label>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Recommended: Square image, max 7MB. Will be resized to 400x400px.
                </p>
              </div>
            </div>
          </div>

          {/* Email (Read-only) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={userEmail}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Email cannot be changed
            </p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-theme-primary focus:border-transparent"
              placeholder="Enter phone number"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Role
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-theme-primary focus:border-transparent"
              placeholder="Enter your role or job title"
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={savingProfile || uploading}
              className="px-6 py-2 bg-theme-primary dark:bg-theme-primary text-white rounded-lg font-medium hover:bg-theme-primary-dark dark:hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Divider */}
      <div className="mb-8 border-t border-gray-200 dark:border-gray-700"></div>

      {message && (
        <div className="mb-6 p-4 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded-lg border border-green-200 dark:border-green-800">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Notification Settings Section */}
      <div className="mb-8 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Email Notifications</h3>
        <NotificationSettings userProfile={userProfile} />
      </div>

      <div className="space-y-8">
        {/* Dark Mode Toggle */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            Dark Mode
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-700 dark:text-gray-300 font-medium">Enable Dark Mode</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Switch between light and dark themes</p>
            </div>
            <button
              onClick={handleDarkModeToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 ${
                isDarkMode ? 'bg-theme-primary' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  isDarkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Department Filter Toggle - Only visible to Developers, Owners, and Admins */}
        {hasAdminAccess && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border-2 border-blue-400 dark:border-blue-600">
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
              Department Visibility
          </h3>
          <div className="flex items-center justify-between">
              <div className="flex-1 mr-4">
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  {departmentFilterEnabled ? 'Own Department Only' : 'All Departments'}
                </p>
                {userDepartments && userDepartments.length > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
                    You are in: {userDepartments.join(', ')}
                  </p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {departmentFilterEnabled 
                    ? 'You are viewing only tasks assigned to your department(s). Toggle to see all departments.' 
                    : 'You are viewing tasks from all departments. Toggle to see only your department(s).'}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  ⓘ Only Developers, Owners, and Admins can toggle this setting. Other users will always see only their department.
                </p>
            </div>
              {isLoadingFilter ? (
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full animate-pulse"></div>
              ) : (
            <button
              onClick={handleDepartmentFilterToggle}
                  disabled={isTogglingFilter}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isTogglingFilter ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    departmentFilterEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  departmentFilterEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
              )}
            </div>
          </div>
        )}
        
        {/* Non-admin users see a read-only status */}
        {!hasAdminAccess && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Department Visibility
            </h3>
            <div className="text-gray-600 dark:text-gray-400">
              <p className="font-medium text-gray-700 dark:text-gray-300">Own Department Only</p>
              <p className="text-sm mt-1">
                You are viewing only tasks assigned to your department(s). 
                Contact an administrator if you need access to other departments.
              </p>
            </div>
          </div>
        )}

        {/* Admin Panel - Visible to Developers, Owners, and Admins */}
        {hasAdminAccess && (
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg p-6 border-2 border-yellow-400 dark:border-yellow-600">
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Admin Panel
            </h3>
            
            <div className="space-y-4">
              {/* Cleanup & Sync Button */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-gray-800 dark:text-gray-200 font-medium flex items-center gap-2">
                      <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Cleanup & Sync
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Clears cached/stale data and forces a fresh sync with the database. 
                      Use this to resolve data discrepancies between the app and database.
                    </p>
                  </div>
                  <button
                    onClick={handleCleanupSync}
                    disabled={isCleaningUp}
                    className={`ml-4 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                      isCleaningUp 
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed' 
                        : 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-md hover:shadow-lg'
                    }`}
                  >
                    {isCleaningUp ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Cleaning...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Run Cleanup
                      </>
                    )}
                  </button>
                </div>
                
                {/* Cleanup Results */}
                {cleanupResults && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                    <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">Cleanup Results:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-green-700 dark:text-green-400">
                      <div className={cleanupResults.auditIssuesFound > 0 ? 'text-yellow-600 dark:text-yellow-400 font-medium' : ''}>
                        • Issues found: <span className="font-mono">{cleanupResults.auditIssuesFound || 0}</span>
                      </div>
                      <div className={cleanupResults.orphansDeleted > 0 ? 'text-purple-600 dark:text-purple-400 font-medium' : ''}>
                        • Orphans deleted from DB: <span className="font-mono">{cleanupResults.orphansDeleted || 0}</span>
                      </div>
                      <div className={cleanupResults.phantomsPurged > 0 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                        • Phantoms purged: <span className="font-mono">{cleanupResults.phantomsPurged || 0}</span>
                      </div>
                      <div className={cleanupResults.missingReloaded > 0 ? 'text-orange-600 dark:text-orange-400 font-medium' : ''}>
                        • Missing reloaded: <span className="font-mono">{cleanupResults.missingReloaded || 0}</span>
                      </div>
                      <div>• Tasks before: <span className="font-mono">{cleanupResults.tasksBeforeRefresh}</span></div>
                      <div>• Tasks after: <span className="font-mono">{cleanupResults.tasksAfterRefresh}</span></div>
                    </div>
                    {cleanupResults.deletionErrors?.length > 0 && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
                        ⚠️ Some deletions failed: {cleanupResults.deletionErrors.join(', ')}
                      </div>
                    )}
                    {(cleanupResults.phantomsPurged > 0 || cleanupResults.missingReloaded > 0 || cleanupResults.orphansDeleted > 0) ? (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                        ✅ Fixed {cleanupResults.phantomsPurged + cleanupResults.missingReloaded + cleanupResults.orphansDeleted} discrepancy(ies)!
                      </p>
                    ) : cleanupResults.auditIssuesFound === 0 ? (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                        ✅ No discrepancies found - everything is in sync!
                      </p>
                    ) : null}
                    <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                      Completed at {new Date(cleanupResults.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Database Audit Button */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-gray-800 dark:text-gray-200 font-medium flex items-center gap-2">
                      <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Database Audit
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Compare in-memory tasks with database to find phantom/orphaned tasks that shouldn't exist.
                    </p>
                  </div>
                  <button
                    onClick={handleDatabaseAudit}
                    disabled={isAuditing}
                    className={`ml-4 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                      isAuditing 
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed' 
                        : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md hover:shadow-lg'
                    }`}
                  >
                    {isAuditing ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Auditing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Run Audit
                      </>
                    )}
                  </button>
                </div>
                
                {/* Audit Results */}
                {auditResults && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Audit Results:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-blue-700 dark:text-blue-400 mb-3">
                      <div>• Memory tasks: <span className="font-mono">{auditResults.memoryCount || 0}</span></div>
                      <div>• Database tasks: <span className="font-mono">{auditResults.databaseCount || 0}</span></div>
                      <div className={auditResults.phantomTasks?.length > 0 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                        • Phantom tasks: <span className="font-mono">{auditResults.phantomTasks?.length || 0}</span>
                      </div>
                      <div className={auditResults.missingTasks?.length > 0 ? 'text-orange-600 dark:text-orange-400 font-medium' : ''}>
                        • Missing in memory: <span className="font-mono">{auditResults.missingTasks?.length || 0}</span>
                      </div>
                      <div className={auditResults.orphanedInstances?.length > 0 ? 'text-purple-600 dark:text-purple-400 font-medium' : ''}>
                        • Orphaned instances: <span className="font-mono">{auditResults.orphanedInstances?.length || 0}</span>
                      </div>
                      <div className={auditResults.issueCount > 0 ? 'text-yellow-600 dark:text-yellow-400 font-medium' : ''}>
                        • Total issues: <span className="font-mono">{auditResults.issueCount || 0}</span>
                      </div>
                    </div>
                    
                    {/* Phantom Tasks List */}
                    {auditResults.phantomTasks?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                          ⚠️ Phantom Tasks (in memory but NOT in database):
                        </p>
                        <div className="max-h-32 overflow-y-auto bg-red-50 dark:bg-red-900/20 rounded p-2">
                          {auditResults.phantomTasks.map((task, i) => (
                            <div key={i} className="text-xs text-red-600 dark:text-red-400 font-mono truncate">
                              {task.title} {task.isTemplate ? '(Template)' : task.isInstance ? '(Instance)' : ''} - ID: {task.id?.substring(0, 8)}...
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={handlePurgePhantoms}
                          className="mt-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition-all"
                        >
                          🗑️ Purge {auditResults.phantomTasks.length} Phantom Task(s)
                        </button>
                      </div>
                    )}
                    
                    {/* Missing Tasks List */}
                    {auditResults.missingTasks?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">
                          ℹ️ Missing Tasks (in database but NOT loaded in memory):
                        </p>
                        <div className="max-h-32 overflow-y-auto bg-orange-50 dark:bg-orange-900/20 rounded p-2">
                          {auditResults.missingTasks.map((task, i) => (
                            <div key={i} className="text-xs text-orange-600 dark:text-orange-400 font-mono truncate">
                              {task.title} {task.isTemplate ? '(Template)' : task.isInstance ? '(Instance)' : ''} - ID: {task.id?.substring(0, 8)}...
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={handleReloadMissing}
                          className="mt-2 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs font-medium transition-all"
                        >
                          🔄 Reload Missing Tasks
                        </button>
                      </div>
                    )}
                    
                    {/* Orphaned Instances List */}
                    {auditResults.orphanedInstances?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
                          🔗 Orphaned Instances (instances whose template is missing):
                        </p>
                        <div className="max-h-32 overflow-y-auto bg-purple-50 dark:bg-purple-900/20 rounded p-2">
                          {auditResults.orphanedInstances.map((task, i) => (
                            <div key={i} className="text-xs text-purple-600 dark:text-purple-400 font-mono truncate">
                              {task.title} - Template: {task.templateId?.substring(0, 8)}...
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* All Issues List */}
                    {auditResults.issues?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-1">
                          📋 All Issues Detected:
                        </p>
                        <div className="max-h-32 overflow-y-auto bg-yellow-50 dark:bg-yellow-900/20 rounded p-2">
                          {auditResults.issues.map((issue, i) => (
                            <div key={i} className="text-xs text-yellow-700 dark:text-yellow-400 truncate">
                              [{issue.type}] {issue.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {(auditResults.phantomTasks?.length === 0 && auditResults.missingTasks?.length === 0 && auditResults.orphanedInstances?.length === 0) && (
                      <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                        ✅ No discrepancies found - memory and database are in sync!
                      </div>
                    )}
                    
                    <p className="text-xs text-blue-600 dark:text-blue-500 mt-2">
                      Completed at {new Date(auditResults.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
              
              {/* User Email Migration Button */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-cyan-200 dark:border-cyan-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-gray-800 dark:text-gray-200 font-medium flex items-center gap-2">
                      <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Migrate User Emails
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Backfill email addresses for all user assignments. Required for department filtering to work correctly.
                    </p>
                  </div>
                  <button
                    onClick={handleMigrateUserEmails}
                    disabled={isMigrating}
                    className={`ml-4 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                      isMigrating 
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed' 
                        : 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-md hover:shadow-lg'
                    }`}
                  >
                    {isMigrating ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Migrating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Run Migration
                      </>
                    )}
                  </button>
                </div>
                
                {/* Migration Results */}
                {migrationResults && (
                  <div className="mt-4 p-3 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg border border-cyan-200 dark:border-cyan-700">
                    <p className="text-sm font-medium text-cyan-800 dark:text-cyan-300 mb-2">Migration Results:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-cyan-700 dark:text-cyan-400">
                      <div>• Total users: <span className="font-mono">{migrationResults.total || 0}</span></div>
                      <div className={migrationResults.updated > 0 ? 'text-green-600 dark:text-green-400 font-medium' : ''}>
                        • Updated: <span className="font-mono">{migrationResults.updated || 0}</span>
                      </div>
                      <div className={migrationResults.created > 0 ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}>
                        • Created: <span className="font-mono">{migrationResults.created || 0}</span>
                      </div>
                      <div>• Skipped: <span className="font-mono">{migrationResults.skipped || 0}</span></div>
                    </div>
                    {migrationResults.errors?.length > 0 && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/30 rounded">
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                          Errors ({migrationResults.errors.length}):
                        </p>
                        <div className="max-h-20 overflow-y-auto">
                          {migrationResults.errors.map((err, i) => (
                            <div key={i} className="text-xs text-red-500 dark:text-red-400 font-mono truncate">
                              {err.userId}: {err.error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Admin Info */}
              <div className="text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 rounded p-2">
                <strong>Note:</strong> This panel is visible to Developers, Owners, and Admins. 
                Actions performed here affect the entire application state.
              </div>
          </div>
        </div>
        )}

        {/* Developer Panel - Email Testing */}
        {hasAdminAccess && (
          <div className="mt-8">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Developer Panel
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Test email notifications. Emails will use your current notification settings (project filters, user filters, etc.)
              </p>

              {/* Email Testing Buttons */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Task-Based Emails</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleSendExampleEmail('task-based')}
                      disabled={sendingExampleEmail}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingExampleEmail === 'task-based' ? 'Sending...' : 'Task-Based Email'}
                    </button>
                    <button
                      onClick={() => handleSendExampleEmail('task-based-urgent')}
                      disabled={sendingExampleEmail}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingExampleEmail === 'task-based-urgent' ? 'Sending...' : 'Urgent Task-Based Email'}
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Memo Emails</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleSendExampleEmail('daily-memo')}
                      disabled={sendingExampleEmail}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingExampleEmail === 'daily-memo' ? 'Sending...' : 'Daily Memo'}
                    </button>
                    <button
                      onClick={() => handleSendExampleEmail('weekly-memo')}
                      disabled={sendingExampleEmail}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingExampleEmail === 'weekly-memo' ? 'Sending...' : 'Weekly Memo'}
                    </button>
                    <button
                      onClick={() => handleSendExampleEmail('monthly-memo')}
                      disabled={sendingExampleEmail}
                      className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingExampleEmail === 'monthly-memo' ? 'Sending...' : 'Monthly Memo'}
                    </button>
                    <button
                      onClick={() => handleSendExampleEmail('yearly-memo')}
                      disabled={sendingExampleEmail}
                      className="px-4 py-2 bg-green-800 hover:bg-green-900 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingExampleEmail === 'yearly-memo' ? 'Sending...' : 'Yearly Memo'}
                    </button>
                  </div>
                </div>

                {/* Example Email Results */}
                {exampleEmailResult && (
                  <div className={`mt-4 p-3 rounded-lg border ${
                    exampleEmailResult.success
                      ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700'
                      : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'
                  }`}>
                    <p className={`text-sm font-medium ${
                      exampleEmailResult.success
                        ? 'text-green-800 dark:text-green-300'
                        : 'text-red-800 dark:text-red-300'
                    }`}>
                      {exampleEmailResult.success ? '✅' : '❌'} {exampleEmailResult.message}
                    </p>
                    {exampleEmailResult.taskName && (
                      <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                        Task: {exampleEmailResult.taskName}
                      </p>
                    )}
                    {exampleEmailResult.taskCount !== undefined && (
                      <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                        Tasks included: {exampleEmailResult.taskCount}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Developer Panel - Email Logs */}
        {hasAdminAccess && (
          <div className="mt-8">
            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Logs
              </h2>
              
              {/* Filter */}
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => setEmailLogFilter('all')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    emailLogFilter === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setEmailLogFilter('sent')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    emailLogFilter === 'sent'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Sent
                </button>
                <button
                  onClick={() => setEmailLogFilter('failed')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    emailLogFilter === 'failed'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Failed
                </button>
              </div>
              
              {/* Email Logs Table */}
              {loadingEmailLogs ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Loading email logs...
                </div>
              ) : emailLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No email logs found.
                </div>
              ) : (
                <div className="relative">
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
                        <tr className="border-b border-gray-300 dark:border-gray-600">
                          <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Time</th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Type</th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Subject</th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Recipients</th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {emailLogs.slice(0, 10).map((log) => {
                        const timestamp = new Date(log.timestamp);
                        const timeStr = timestamp.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        });
                        
                        const recipientsStr = log.recipients
                          .map(r => r.name ? `${r.name} (${r.email})` : r.email)
                          .join(', ');
                        
                        return (
                          <tr key={log.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{timeStr}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-1 rounded text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                {log.type}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{log.subject}</td>
                            <td className="py-2 px-3 text-gray-600 dark:text-gray-400 text-xs">{recipientsStr}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                log.status === 'sent'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                              }`}>
                                {log.status}
                              </span>
                              {log.error && (
                                <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                                  {log.error}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Version Number - Subtle display at bottom */}
        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Version vFINAL BEFORE AZURE MIGRATION
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
