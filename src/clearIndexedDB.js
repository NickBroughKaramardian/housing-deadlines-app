/**
 * Utility script to clear IndexedDB for debugging
 * Run this in the browser console if needed: clearIndexedDB()
 */

window.clearIndexedDB = async function() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('RecurringInstancesDB');
    
    request.onsuccess = () => {
      console.log('✅ IndexedDB cleared successfully! Refresh the page to regenerate instances.');
      resolve();
    };
    
    request.onerror = () => {
      console.error('❌ Failed to clear IndexedDB:', request.error);
      reject(request.error);
    };
    
    request.onblocked = () => {
      console.warn('⚠️ IndexedDB deletion blocked. Close all tabs with this site and try again.');
    };
  });
};

console.log('📋 To clear IndexedDB, run: clearIndexedDB()');



