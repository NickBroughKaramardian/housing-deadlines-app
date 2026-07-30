// Comprehensive diagnostic system for database save/edit operations
// This will log EVERY step of the process to identify issues

const DIAGNOSTIC_MODE = true; // Set to false to disable all diagnostics

// Ensure diagnostics are always available, even if module hasn't loaded yet
if (typeof window !== 'undefined' && !window.__DIAGNOSTIC_SYSTEM_LOADED__) {
  window.__DIAGNOSTIC_SYSTEM_LOADED__ = false; // Will be set to true when module loads
}

class DiagnosticLogger {
  constructor() {
    this.logs = [];
    this.startTime = Date.now();
  }

  log(step, data, type = 'info') {
    if (!DIAGNOSTIC_MODE) return;
    
    const timestamp = Date.now() - this.startTime;
    const logEntry = {
      timestamp,
      step,
      type,
      data: this.sanitizeData(data),
      stack: new Error().stack.split('\n').slice(2, 5).join('\n')
    };
    
    this.logs.push(logEntry);
    
    const prefix = `🔍 [DIAG] ${timestamp}ms - ${step}`;
    const consoleMethod = type === 'error' ? console.error : 
                           type === 'warn' ? console.warn : 
                           console.log;
    
    console.group(prefix);
    console.log('Data:', logEntry.data);
    console.log('Stack:', logEntry.stack);
    console.groupEnd();
  }

  sanitizeData(data) {
    if (data === null || data === undefined) return data;
    if (typeof data === 'function') return '[Function]';
    if (typeof data !== 'object') return data;
    
    try {
      // Create a deep copy and limit depth
      return JSON.parse(JSON.stringify(data, (key, value) => {
        if (typeof value === 'function') return '[Function]';
        if (value instanceof Error) return { message: value.message, stack: value.stack };
        return value;
      }));
    } catch (e) {
      return '[Circular or non-serializable]';
    }
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
    this.startTime = Date.now();
  }

  exportLogs() {
    return {
      timestamp: new Date().toISOString(),
      totalLogs: this.logs.length,
      logs: this.logs
    };
  }
}

export const diagnosticLogger = new DiagnosticLogger();

// Helper to log React state changes
export function logStateChange(component, stateName, oldValue, newValue) {
  diagnosticLogger.log(
    `${component}: State Change - ${stateName}`,
    {
      oldValue: diagnosticLogger.sanitizeData(oldValue),
      newValue: diagnosticLogger.sanitizeData(newValue),
      changed: JSON.stringify(oldValue) !== JSON.stringify(newValue)
    },
    'info'
  );
}

// Helper to log API calls
export function logApiCall(method, url, requestData, responseData, error) {
  diagnosticLogger.log(
    `API ${method} ${url}`,
    {
      request: requestData,
      response: responseData,
      error: error ? { message: error.message, stack: error.stack } : null,
      timestamp: new Date().toISOString()
    },
    error ? 'error' : 'info'
  );
}

// Helper to log component renders
export function logRender(component, props, state) {
  diagnosticLogger.log(
    `${component}: Render`,
    {
      props: diagnosticLogger.sanitizeData(props),
      state: diagnosticLogger.sanitizeData(state)
    },
    'info'
  );
}

// Make diagnostic logger available globally for browser console access
if (typeof window !== 'undefined') {
  window.__DIAGNOSTIC_LOGGER__ = diagnosticLogger;
  window.__EXPORT_DIAGNOSTICS__ = () => {
    try {
      const logs = diagnosticLogger.exportLogs();
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diagnostics-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('✅ Diagnostics exported!', logs);
      console.log(`📊 Total logs: ${logs.totalLogs}`);
      return logs;
    } catch (error) {
      console.error('❌ Error exporting diagnostics:', error);
      console.log('📋 Logs (manual copy):', diagnosticLogger.getLogs());
      return diagnosticLogger.getLogs();
    }
  };
  
  // Also add a simpler function to just view logs
  window.__VIEW_DIAGNOSTICS__ = () => {
    const logs = diagnosticLogger.getLogs();
    console.log('📊 Diagnostic Logs:', logs);
    console.log(`Total: ${logs.length} log entries`);
    return logs;
  };
  
  window.__CLEAR_DIAGNOSTICS__ = () => {
    diagnosticLogger.clearLogs();
    console.log('🧹 Diagnostics cleared!');
  };
  
  window.__DIAGNOSTIC_SYSTEM_LOADED__ = true;
  console.log('🔍 Diagnostic system loaded!');
  console.log('   Use window.__EXPORT_DIAGNOSTICS__() to export logs');
  console.log('   Use window.__VIEW_DIAGNOSTICS__() to view logs in console');
  console.log('   Use window.__CLEAR_DIAGNOSTICS__() to clear logs');
  console.log('   Use window.__DIAGNOSTIC_LOGGER__ to access logger directly');
}

