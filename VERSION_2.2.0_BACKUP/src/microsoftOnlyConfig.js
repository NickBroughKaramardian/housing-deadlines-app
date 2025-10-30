import { microsoftDataService } from './microsoftDataService';
// Microsoft 365 Only Configuration
// This replaces ALL Firebase dependencies with Microsoft 365 services

export const microsoftConfig = {
  // Azure AD Configuration (your test environment)
  azure: {
    clientId: "d34dc476-5d84-47b9-aef5-cf7705bb1d65",
    tenantId: "ef2d00a3-af23-40a6-b9cb-3f7b009b729f",
    redirectUri: "https://ccprojectmanager.web.app",
    scopes: [
      "User.Read", 
      "User.ReadBasic.All", 
      "Sites.ReadWrite.All", 
      "Files.ReadWrite.All",
      "openid", 
      "profile", 
      "email", 
      "offline_access"
    ]
  },
  
  // SharePoint Configuration (your test site)
  sharePoint: {
    siteUrl: "https://ccdapstest.sharepoint.com/sites/CCProjectManager",
    siteId: "EQsGzna_loRKrbiIsPL7dXQBpQE8Rq7Dp2-jze43aZ1FPw"
  },
  
  // Microsoft Graph Configuration
  graph: {
    baseUrl: "https://graph.microsoft.com/v1.0",
    meEndpoint: "https://graph.microsoft.com/v1.0/me"
  },
  
  // Data Storage Configuration
  storage: {
    // Use SharePoint Lists for all data
    useSharePointLists: true,
    // Use OneDrive for file storage
    useOneDrive: true,
    // Use Azure AD for authentication
    useAzureAD: true
  },
  
  // Enterprise Migration Settings (for future use)
  enterprise: {
    // When ready to migrate to enterprise, just update these values
    productionTenantId: "YOUR_ENTERPRISE_TENANT_ID",
    productionSiteUrl: "YOUR_ENTERPRISE_SHAREPOINT_SITE",
    productionClientId: "YOUR_ENTERPRISE_CLIENT_ID"
  }
};

// Environment Detection
export const isTestEnvironment = () => {
  return microsoftConfig.azure.tenantId === "ef2d00a3-af23-40a6-b9cb-3f7b009b729f";
};

export const isEnterpriseEnvironment = () => {
  return !isTestEnvironment();
};

// Get current environment config
export const getCurrentConfig = () => {
  return {
    ...microsoftConfig,
    environment: isTestEnvironment() ? 'test' : 'enterprise'
  };
};
