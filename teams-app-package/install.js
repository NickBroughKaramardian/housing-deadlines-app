// Universal Installation Script for C&C Project Manager
// Works with both Microsoft Teams and Office applications

class UniversalInstaller {
  constructor() {
    this.manifest = null;
    this.platform = this.detectPlatform();
  }

  detectPlatform() {
    // Detect if we're in Teams
    if (window.location.href.includes('teams.microsoft.com') || 
        typeof microsoftTeams !== 'undefined') {
      return 'teams';
    }
    
    // Detect if we're in Office
    if (typeof Office !== 'undefined') {
      return 'office';
    }
    
    // Detect if we're in a browser with Office context
    if (window.location.href.includes('office.com') || 
        window.location.href.includes('office365.com')) {
      return 'office';
    }
    
    return 'web';
  }

  async loadManifest() {
    try {
      const response = await fetch('./combined-manifest.json');
      this.manifest = await response.json();
      return this.manifest;
    } catch (error) {
      console.error('Error loading manifest:', error);
      throw error;
    }
  }

  async installForTeams() {
    console.log('Installing for Microsoft Teams...');
    
    if (typeof microsoftTeams === 'undefined') {
      throw new Error('Microsoft Teams SDK not available');
    }

    try {
      await microsoftTeams.initialize();
      
      // Register the app
      await microsoftTeams.app.install({
        appId: this.manifest.id,
        appName: this.manifest.name.short,
        appDescription: this.manifest.description.short,
        appIcon: this.manifest.icons.color,
        appUrl: this.manifest.webApplicationInfo.resource
      });

      console.log('Successfully installed in Teams');
      return true;
    } catch (error) {
      console.error('Error installing in Teams:', error);
      throw error;
    }
  }

  async installForOffice() {
    console.log('Installing for Microsoft Office...');
    
    if (typeof Office === 'undefined') {
      throw new Error('Office JavaScript API not available');
    }

    try {
      // Create Office add-in manifest
      const officeManifest = this.createOfficeManifest();
      
      // Install the add-in
      await Office.context.document.settings.set('cc-project-manager-installed', true);
      await Office.context.document.settings.saveAsync();
      
      console.log('Successfully installed in Office');
      return true;
    } catch (error) {
      console.error('Error installing in Office:', error);
      throw error;
    }
  }

  createOfficeManifest() {
    // Convert Teams manifest to Office format
    return {
      $schema: "https://developer.microsoft.com/en-us/json-schemas/office/1.1/OfficeApp.schema.json",
      manifestVersion: "1.1",
      id: this.manifest.id,
      version: this.manifest.version,
      providerName: this.manifest.developer.name,
      displayName: this.manifest.name.short,
      description: this.manifest.description.short,
      iconUrl: this.manifest.icons.color,
      highResolutionIconUrl: this.manifest.icons.color,
      supportUrl: this.manifest.developer.websiteUrl,
      appDomains: this.manifest.validDomains,
      hosts: this.manifest.officeAddin.hosts.map(host => ({ name: host })),
      defaultSettings: {
        sourceLocation: this.manifest.officeAddin.taskpane.sourceLocation
      },
      permissions: this.manifest.officeAddin.permissions,
      versionOverrides: [{
        hosts: this.manifest.officeAddin.hosts.map(host => ({
          name: host,
          desktopFormFactor: {
            getStarted: {
              title: "Get started with C&C Project Manager!",
              description: "Your C&C Project Manager add-in loaded successfully.",
              learnMoreUrl: this.manifest.developer.websiteUrl
            },
            functionFile: this.manifest.webApplicationInfo.resource + "/office-commands.html",
            extensionPoint: {
              type: "PrimaryCommandSurface",
              officeTab: {
                id: this.manifest.officeAddin.ribbon.tabId,
                group: {
                  id: this.manifest.officeAddin.ribbon.groupId,
                  label: this.manifest.officeAddin.ribbon.label,
                  icon: {
                    image16: this.manifest.icons.outline,
                    image32: this.manifest.icons.outline,
                    image80: this.manifest.icons.color
                  },
                  control: {
                    type: "Button",
                    id: "ProjectManagerButton",
                    label: this.manifest.officeAddin.ribbon.label,
                    supertip: {
                      title: this.manifest.officeAddin.ribbon.label,
                      description: "Click to open C&C Project Manager"
                    },
                    icon: {
                      image16: this.manifest.icons.outline,
                      image32: this.manifest.icons.outline,
                      image80: this.manifest.icons.color
                    },
                    action: {
                      type: "ShowTaskpane",
                      taskpaneId: "ProjectManagerTaskpane",
                      sourceLocation: this.manifest.officeAddin.taskpane.sourceLocation
                    }
                  }
                }
              }
            }
          }
        })),
        resources: {
          images: {
            image16: this.manifest.icons.outline,
            image32: this.manifest.icons.outline,
            image80: this.manifest.icons.color
          },
          urls: {
            getStarted: this.manifest.developer.websiteUrl,
            commands: this.manifest.webApplicationInfo.resource + "/office-commands.html",
            taskpane: this.manifest.officeAddin.taskpane.sourceLocation
          },
          strings: {
            getStarted: {
              title: "Get started with C&C Project Manager!",
              description: "Your C&C Project Manager add-in loaded successfully."
            },
            commands: {
              group: "Project Manager",
              button: "Project Manager"
            }
          }
        }
      }]
    };
  }

  async install() {
    try {
      await this.loadManifest();
      
      switch (this.platform) {
        case 'teams':
          return await this.installForTeams();
        case 'office':
          return await this.installForOffice();
        case 'web':
          // For web, show instructions
          this.showWebInstructions();
          return true;
        default:
          throw new Error('Unknown platform');
      }
    } catch (error) {
      console.error('Installation failed:', error);
      this.showError(error);
      throw error;
    }
  }

  showWebInstructions() {
    const instructions = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h2>Installation Instructions</h2>
        <p><strong>For Microsoft Teams:</strong></p>
        <ol>
          <li>Enable Developer Preview in Teams (Settings → About Teams)</li>
          <li>Go to Apps → Manage your apps</li>
          <li>Click "Upload a custom app"</li>
          <li>Select the cc-project-manager.zip file</li>
          <li>Add to your channel</li>
        </ol>
        
        <p><strong>For Microsoft Office:</strong></p>
        <ol>
          <li>Open Word, Excel, or PowerPoint</li>
          <li>Go to Insert → Add-ins → My Add-ins</li>
          <li>Click "Upload My Add-in"</li>
          <li>Select the cc-project-manager.zip file</li>
          <li>Click "Upload"</li>
        </ol>
      </div>
    `;
    
    document.body.innerHTML = instructions;
  }

  showError(error) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 15px;
      border-radius: 5px;
      font-family: Arial, sans-serif;
      z-index: 1000;
    `;
    errorDiv.innerHTML = `<strong>Installation Error:</strong><br>${error.message}`;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      document.body.removeChild(errorDiv);
    }, 5000);
  }
}

// Auto-install when script loads
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', async () => {
    const installer = new UniversalInstaller();
    try {
      await installer.install();
    } catch (error) {
      console.error('Auto-installation failed:', error);
    }
  });
}

// Export for manual use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UniversalInstaller;
} 