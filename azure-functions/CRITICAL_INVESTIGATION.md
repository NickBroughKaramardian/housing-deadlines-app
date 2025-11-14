# Critical Investigation: Functions Not Being Discovered

## Problem
- All Azure Portal settings are correct (confirmed by user)
- `index.js` is NOT executing (no startup logs in Log Stream)
- Azure reports "0 functions found (Custom)"

## Root Cause Analysis

Since all settings are correct, the issue is likely one of:

1. **Deployment Method Issue**: `--build remote` may not preserve the v4 programming model structure correctly
2. **Entry Point Not Discovered**: Azure isn't finding `index.js` even though `package.json` has `"main": "index.js"`
3. **Silent Error**: An error during module load is preventing execution but not being logged

## Changes Made

### 1. Deployment Method
Changed from `--build remote` to `--build local` in GitHub Actions workflow.
- **Why**: Remote builds may not preserve the exact file structure needed for v4 entry point discovery
- **Impact**: Files are built locally and deployed as-is, ensuring `index.js` is in the correct location

### 2. Additional Azure Setting Needed

Add this setting to help debug (if not already present):

**`FUNCTIONS_NODE_BLOCK_ON_ENTRY_POINT_ERROR`** = `true`
- **Purpose**: Makes entry point errors visible in logs
- **Location**: Azure Portal → Configuration → Application settings
- **Action**: Add this setting, save, and restart

## Next Steps

1. **Add Debug Setting** (if not already present):
   - Go to Azure Portal → `cc-project-api` → Configuration → Application settings
   - Add: `FUNCTIONS_NODE_BLOCK_ON_ENTRY_POINT_ERROR` = `true`
   - Save and restart

2. **Trigger New Deployment**:
   - The GitHub Actions workflow now uses `--build local`
   - Push changes to trigger deployment, or manually trigger via GitHub Actions

3. **Verify Deployment**:
   - After deployment completes, check Kudu Console:
     - Go to: https://cc-project-api.scm.azurewebsites.net/DebugConsole
     - Navigate to `site/wwwroot`
     - Verify `index.js` exists in root
     - Verify `package.json` has `"main": "index.js"`

4. **Check Log Stream**:
   - After restart, look for:
     - `========== INDEX.JS LOADING ==========`
     - Any error messages (now visible with `FUNCTIONS_NODE_BLOCK_ON_ENTRY_POINT_ERROR`)

## Alternative: Manual Verification

If deployment still doesn't work, we can verify the entry point manually:

1. **Check Kudu Console**:
   - Navigate to `site/wwwroot`
   - Run: `cat index.js | head -20` to verify file exists
   - Run: `cat package.json` to verify `"main": "index.js"`

2. **Test Entry Point Manually**:
   - In Kudu Console, run: `node index.js`
   - This should show the startup logs if the file can execute

## Why Local Build?

- **Remote Build**: Azure builds your code on their servers, which may:
  - Change file structure
  - Not preserve exact entry point location
  - Have issues with v4 programming model discovery

- **Local Build**: Your code is built locally and deployed as-is:
  - Preserves exact file structure
  - Ensures `index.js` is in the root where Azure expects it
  - More predictable for v4 programming model

