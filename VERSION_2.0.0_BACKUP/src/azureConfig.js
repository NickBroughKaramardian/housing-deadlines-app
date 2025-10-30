export const msalConfig = {
  auth: {
    clientId: "d34dc476-5d84-47b9-aef5-cf7705bb1d65",
    authority: "https://login.microsoftonline.com/ef2d00a3-af23-40a6-b9cb-3f7b009b729f",
    redirectUri: "https://ccprojectmanager.web.app",
  },
  cache: {
    cacheLocation: "sessionStorage", // This configures where your cache will be stored
    storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
  }
};

export const loginRequest = {
  scopes: [
    "User.Read", "User.ReadBasic.All", "Sites.ReadWrite.All", "Files.ReadWrite.All",
    "openid", "profile", "email", "offline_access"
  ],
  prompt: "select_account" // This ensures the user can select their account
};

// SharePoint REST API request configuration
export const sharePointRequest = {
  scopes: ["https://ccdapstest.sharepoint.com/.default"]
};

export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
  sharePointSiteUrl: "https://ccdapstest.sharepoint.com/sites/CCProjectManager",
  sharePointSiteId: "EQsGzna_loRKrbiIsPL7dXQBpQE8Rq7Dp2-jze43aZ1FPw"
};

// Test environment configuration
export const testConfig = {
  allowedDomains: [
    "ccdapstest.onmicrosoft.com",
    "ccdapstest.sharepoint.com"
  ],
  testEmail: "NickK@CCDAPSTEST.onmicrosoft.com",
  environment: "test"
};
