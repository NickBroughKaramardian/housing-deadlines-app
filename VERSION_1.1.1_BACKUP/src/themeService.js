// Theme Service for managing app color schemes with dark mode support
class ThemeService {
  constructor() {
    this.themes = {
      green: {
        name: 'Green',
        light: {
          primary: '#059669',
          primaryHover: '#047857',
          primaryLight: '#d1fae5',
          primaryDark: '#065f46',
          accent: '#047857',
          accentHover: '#065f46',
          accentLight: '#ecfdf5',
          accentDark: '#064e3b',
          success: '#059669',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
          // Dark mode specific colors
          background: '#ffffff',
          surface: '#f9fafb',
          surfaceHover: '#f3f4f6',
          border: '#e5e7eb',
          text: '#111827',
          textSecondary: '#6b7280',
          textMuted: '#9ca3af',
          shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          shadowHover: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        },
        dark: {
          primary: '#10b981',
          primaryHover: '#059669',
          primaryLight: '#064e3b',
          primaryDark: '#d1fae5',
          accent: '#10b981',
          accentHover: '#059669',
          accentLight: '#064e3b',
          accentDark: '#d1fae5',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
          // Dark mode specific colors
          background: '#0f172a',
          surface: '#1e293b',
          surfaceHover: '#334155',
          border: '#334155',
          text: '#f8fafc',
          textSecondary: '#cbd5e1',
          textMuted: '#64748b',
          shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2)',
          shadowHover: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
        }
      },
      blue: {
        name: 'Blue',
        light: {
          primary: '#1d4ed8',
          primaryHover: '#1e40af',
          primaryLight: '#dbeafe',
          primaryDark: '#1e3a8a',
          accent: '#2563eb',
          accentHover: '#1e40af',
          accentLight: '#eff6ff',
          accentDark: '#172554',
          success: '#059669',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#1d4ed8',
          background: '#ffffff',
          surface: '#f9fafb',
          surfaceHover: '#f3f4f6',
          border: '#e5e7eb',
          text: '#111827',
          textSecondary: '#6b7280',
          textMuted: '#9ca3af',
          shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          shadowHover: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        },
        dark: {
          primary: '#3b82f6',
          primaryHover: '#1d4ed8',
          primaryLight: '#1e3a8a',
          primaryDark: '#dbeafe',
          accent: '#3b82f6',
          accentHover: '#1d4ed8',
          accentLight: '#1e3a8a',
          accentDark: '#dbeafe',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
          background: '#0f172a',
          surface: '#1e293b',
          surfaceHover: '#334155',
          border: '#334155',
          text: '#f8fafc',
          textSecondary: '#cbd5e1',
          textMuted: '#64748b',
          shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2)',
          shadowHover: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
        }
      },
      purple: {
        name: 'Purple',
        light: {
          primary: '#6d28d9',
          primaryHover: '#5b21b6',
          primaryLight: '#ede9fe',
          primaryDark: '#4c1d95',
          accent: '#7c3aed',
          accentHover: '#5b21b6',
          accentLight: '#f3f4f6',
          accentDark: '#3730a3',
          success: '#059669',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#6d28d9',
          background: '#ffffff',
          surface: '#f9fafb',
          surfaceHover: '#f3f4f6',
          border: '#e5e7eb',
          text: '#111827',
          textSecondary: '#6b7280',
          textMuted: '#9ca3af',
          shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          shadowHover: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        },
        dark: {
          primary: '#a855f7',
          primaryHover: '#6d28d9',
          primaryLight: '#4c1d95',
          primaryDark: '#ede9fe',
          accent: '#a855f7',
          accentHover: '#6d28d9',
          accentLight: '#4c1d95',
          accentDark: '#ede9fe',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#a855f7',
          background: '#0f172a',
          surface: '#1e293b',
          surfaceHover: '#334155',
          border: '#334155',
          text: '#f8fafc',
          textSecondary: '#cbd5e1',
          textMuted: '#64748b',
          shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2)',
          shadowHover: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
        }
      },
      orange: {
        name: 'Orange',
        light: {
          primary: '#dc2626',
          primaryHover: '#b91c1c',
          primaryLight: '#fed7aa',
          primaryDark: '#991b1b',
          accent: '#ea580c',
          accentHover: '#b91c1c',
          accentLight: '#fff7ed',
          accentDark: '#7c2d12',
          success: '#059669',
          warning: '#f59e0b',
          error: '#dc2626',
          info: '#dc2626',
          background: '#ffffff',
          surface: '#f9fafb',
          surfaceHover: '#f3f4f6',
          border: '#e5e7eb',
          text: '#111827',
          textSecondary: '#6b7280',
          textMuted: '#9ca3af',
          shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          shadowHover: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        },
        dark: {
          primary: '#f97316',
          primaryHover: '#ea580c',
          primaryLight: '#7c2d12',
          primaryDark: '#fed7aa',
          accent: '#f97316',
          accentHover: '#ea580c',
          accentLight: '#7c2d12',
          accentDark: '#fed7aa',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#f97316',
          background: '#0f172a',
          surface: '#1e293b',
          surfaceHover: '#334155',
          border: '#334155',
          text: '#f8fafc',
          textSecondary: '#cbd5e1',
          textMuted: '#64748b',
          shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2)',
          shadowHover: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
        }
      },
      red: {
        name: 'Red',
        light: {
          primary: '#b91c1c',
          primaryHover: '#991b1b',
          primaryLight: '#fee2e2',
          primaryDark: '#7f1d1d',
          accent: '#dc2626',
          accentHover: '#991b1b',
          accentLight: '#fef2f2',
          accentDark: '#450a0a',
          success: '#059669',
          warning: '#f59e0b',
          error: '#b91c1c',
          info: '#b91c1c',
          background: '#ffffff',
          surface: '#f9fafb',
          surfaceHover: '#f3f4f6',
          border: '#e5e7eb',
          text: '#111827',
          textSecondary: '#6b7280',
          textMuted: '#9ca3af',
          shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          shadowHover: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        },
        dark: {
          primary: '#ef4444',
          primaryHover: '#dc2626',
          primaryLight: '#7f1d1d',
          primaryDark: '#fee2e2',
          accent: '#ef4444',
          accentHover: '#dc2626',
          accentLight: '#7f1d1d',
          accentDark: '#fee2e2',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#ef4444',
          background: '#0f172a',
          surface: '#1e293b',
          surfaceHover: '#334155',
          border: '#334155',
          text: '#f8fafc',
          textSecondary: '#cbd5e1',
          textMuted: '#64748b',
          shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2)',
          shadowHover: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
        }
      },
      teal: {
        name: 'Teal',
        light: {
          primary: '#0f766e',
          primaryHover: '#134e4a',
          primaryLight: '#ccfbf1',
          primaryDark: '#042f2e',
          accent: '#0d9488',
          accentHover: '#134e4a',
          accentLight: '#f0fdfa',
          accentDark: '#164e63',
          success: '#059669',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#0f766e',
          background: '#ffffff',
          surface: '#f9fafb',
          surfaceHover: '#f3f4f6',
          border: '#e5e7eb',
          text: '#111827',
          textSecondary: '#6b7280',
          textMuted: '#9ca3af',
          shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          shadowHover: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        },
        dark: {
          primary: '#14b8a6',
          primaryHover: '#0d9488',
          primaryLight: '#042f2e',
          primaryDark: '#ccfbf1',
          accent: '#14b8a6',
          accentHover: '#0d9488',
          accentLight: '#042f2e',
          accentDark: '#ccfbf1',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#14b8a6',
          background: '#0f172a',
          surface: '#1e293b',
          surfaceHover: '#334155',
          border: '#334155',
          text: '#f8fafc',
          textSecondary: '#cbd5e1',
          textMuted: '#64748b',
          shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2)',
          shadowHover: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
        }
      },
      indigo: {
        name: 'Indigo',
        light: {
          primary: '#4338ca',
          primaryHover: '#3730a3',
          primaryLight: '#e0e7ff',
          primaryDark: '#312e81',
          accent: '#4f46e5',
          accentHover: '#3730a3',
          accentLight: '#eef2ff',
          accentDark: '#1e1b4b',
          success: '#059669',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#4338ca',
          background: '#ffffff',
          surface: '#f9fafb',
          surfaceHover: '#f3f4f6',
          border: '#e5e7eb',
          text: '#111827',
          textSecondary: '#6b7280',
          textMuted: '#9ca3af',
          shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          shadowHover: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        },
        dark: {
          primary: '#6366f1',
          primaryHover: '#4f46e5',
          primaryLight: '#312e81',
          primaryDark: '#e0e7ff',
          accent: '#6366f1',
          accentHover: '#4f46e5',
          accentLight: '#312e81',
          accentDark: '#e0e7ff',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#6366f1',
          background: '#0f172a',
          surface: '#1e293b',
          surfaceHover: '#334155',
          border: '#334155',
          text: '#f8fafc',
          textSecondary: '#cbd5e1',
          textMuted: '#64748b',
          shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2)',
          shadowHover: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
        }
      }
    };
    
    this.currentTheme = 'green';
    this.isDarkMode = false;
    this.init();
  }

  // Initialize theme service
  init() {
    // Load saved theme and dark mode preference from localStorage
    const savedTheme = localStorage.getItem('appTheme');
    const savedDarkMode = localStorage.getItem('appDarkMode');
    
    if (savedTheme && this.themes[savedTheme]) {
      this.currentTheme = savedTheme;
    }
    
    if (savedDarkMode !== null) {
      this.isDarkMode = savedDarkMode === 'true';
    } else {
      // Default to system preference
      this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    // Apply the current theme and mode
    this.applyTheme(this.currentTheme);
    this.applyDarkMode(this.isDarkMode);
  }

  // Get current theme
  getCurrentTheme() {
    return this.currentTheme;
  }

  // Get current dark mode state
  getDarkMode() {
    return this.isDarkMode;
  }

  // Get current theme colors (light or dark)
  getCurrentColors() {
    const theme = this.themes[this.currentTheme];
    return this.isDarkMode ? theme.dark : theme.light;
  }

  // Get all available themes
  getThemes() {
    return this.themes;
  }

  // Apply a theme
  applyTheme(themeName) {
    if (!this.themes[themeName]) {
      console.error(`Theme "${themeName}" not found`);
      return;
    }

    this.currentTheme = themeName;
    
    // Save to localStorage
    localStorage.setItem('appTheme', themeName);
    
    // Apply the current mode with the new theme
    this.applyCurrentMode();
  }

  // Apply dark mode
  applyDarkMode(isDark) {
    this.isDarkMode = isDark;
    
    // Save to localStorage
    localStorage.setItem('appDarkMode', isDark.toString());
    
    // Apply the current theme with the new mode
    this.applyCurrentMode();
  }

  // Apply current theme and mode
  applyCurrentMode() {
    const colors = this.getCurrentColors();
    const root = document.documentElement;
    
    // Primary colors
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-primary-hover', colors.primaryHover);
    root.style.setProperty('--color-primary-light', colors.primaryLight);
    root.style.setProperty('--color-primary-dark', colors.primaryDark);
    
    // Accent colors
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-accent-hover', colors.accentHover);
    root.style.setProperty('--color-accent-light', colors.accentLight);
    root.style.setProperty('--color-accent-dark', colors.accentDark);
    
    // Utility colors
    root.style.setProperty('--color-success', colors.success);
    root.style.setProperty('--color-warning', colors.warning);
    root.style.setProperty('--color-error', colors.error);
    root.style.setProperty('--color-info', colors.info);
    
    // Dark mode specific colors
    root.style.setProperty('--color-background', colors.background);
    root.style.setProperty('--color-surface', colors.surface);
    root.style.setProperty('--color-surface-hover', colors.surfaceHover);
    root.style.setProperty('--color-border', colors.border);
    root.style.setProperty('--color-text', colors.text);
    root.style.setProperty('--color-text-secondary', colors.textSecondary);
    root.style.setProperty('--color-text-muted', colors.textMuted);
    root.style.setProperty('--color-shadow', colors.shadow);
    root.style.setProperty('--color-shadow-hover', colors.shadowHover);
    
    // Update theme color meta tag for PWA
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', colors.primary);
    }
    
    // Add/remove dark class on body for Tailwind dark mode
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Dispatch theme change event
    window.dispatchEvent(new CustomEvent('themeChanged', {
      detail: { 
        theme: this.currentTheme, 
        colors,
        isDarkMode: this.isDarkMode 
      }
    }));
  }

  // Get theme preview colors for the theme selector
  getThemePreview(themeName) {
    const theme = this.themes[themeName];
    if (!theme) return null;
    
    const colors = this.isDarkMode ? theme.dark : theme.light;
    
    return {
      name: theme.name,
      primary: colors.primary,
      accent: colors.accent,
      light: colors.primaryLight
    };
  }

  // Reset to default theme
  resetTheme() {
    this.applyTheme('green');
  }

  // Toggle dark mode
  toggleDarkMode() {
    this.applyDarkMode(!this.isDarkMode);
  }
}

// Create singleton instance
const themeService = new ThemeService();

export default themeService; 