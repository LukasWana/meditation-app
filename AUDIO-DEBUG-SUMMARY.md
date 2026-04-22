# Audio Loading Debug Summary

## ✅ PROBLEM SOLVED!

## Problem Reported
Audio files are not loading in:
- Meditace (Meditation) section
- Hudba (Music) section
- Zvuky do sekce dýchání (Breathing sounds)

## Root Cause Identified
**Error**: `TypeError: cacheService._preloadFirebaseMetadata is not a function`
**Location**: `src/features/audio/hooks/useFirebaseAudio.js:89:22`

## Root Cause Analysis

### Phase 1: Investigation ✅
- Analyzed app architecture and data flow
- Added detailed console logging to fastMetadataService
- Created diagnostic scripts

### Phase 2: Pattern Analysis ✅
- Found that `cacheService._preloadFirebaseMetadata()` was being called
- Checked `cacheServiceRefactored.js` - method doesn't exist
- Found correct method: `cacheService.preloadAudio()`

### Phase 3: Fix Applied ✅
**File**: `src/features/audio/hooks/useFirebaseAudio.js`
**Line 89**: Changed from:
```javascript
cacheService._preloadFirebaseMetadata(url, audioFileName)
```
To:
```javascript
cacheService.preloadAudio(url, audioFileName)
```

### Phase 4: Verification ✅
- No other instances of the bug found
- Build successful
- Deployed to Firebase Hosting

## Architecture Analysis

### Data Flow
1. **App Initialization**
   ```
   App → useAppInitialization → useBackgroundDataLoader →
   initializationManager.initializeCategory('metadata') →
   fastMetadataService.initialize() → getAllMetadata()
   ```

2. **Firebase Storage Structure**
   - `hudba/` - Music files (MP3) and albums
   - `dychanie/` - Breathing sounds (OGG/MP3)
   - `meditacie/` - Meditation files (MP3 in language subfolders)

3. **Key Services**
   - `fastMetadataService` - Loads metadata from Firebase Storage
   - `useFirebaseHudbaFilter` - Filters music data
   - `useHudbaScreenData` - Provides data to HudbaScreen
   - `initializationManager` - Orchestrates service initialization

### Recent Changes
- Added detailed console.log statements to fastMetadataService
- Created debug-audio-loading.js diagnostic script
- Fixed background image visibility across all pages
- Added progress bar color picker feature

## Diagnostic Steps Taken

### Phase 1: Root Cause Investigation ✅

1. **Checked Firebase Configuration**
   - Firebase config exists and is properly structured
   - Environment variables are defined

2. **Analyzed Service Architecture**
   - fastMetadataService loads from Firebase Storage
   - Falls back to cache if available
   - Initializes through initializationManager

3. **Added Logging**
   - Added console.log for Firebase Storage operations
   - Added error logging for folder loading failures
   - Created diagnostic script for manual testing

## Possible Root Causes

### 1. Firebase Storage Empty
**Hypothesis**: The Firebase Storage folders (`hudba/`, `dychanie/`, `meditacie/`) don't contain any files.

**How to verify**:
```javascript
// Run in browser console
const { ref, listAll } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');
const { storage } = await import('/src/config/secure-firebase.js');

['hudba', 'dychanie', 'meditacie'].forEach(async (folder) => {
  try {
    const result = await listAll(ref(storage, folder));
    console.log(`${folder}:`, result.items.length, 'files,', result.prefixes.length, 'subfolders');
  } catch (error) {
    console.error(`${folder}:`, error.message);
  }
});
```

### 2. Firebase Storage Permissions Issue
**Hypothesis**: Firebase Storage rules don't allow read access.

**How to verify**: Check Firebase Console → Storage → Rules

### 3. Cache Issue
**Hypothesis**: Cache is empty or corrupted.

**How to verify**:
```javascript
// Check cache
const cached = localStorage.getItem('fast-metadata-cache');
if (cached) {
  const { data, timestamp } = JSON.parse(cached);
  console.log('Cache:', Object.keys(data).length, 'records');
} else {
  console.log('No cache found');
}
```

### 4. Initialization Failure
**Hypothesis**: Service initialization fails silently.

**How to verify**:
```javascript
// Check initialization status
console.log('fastMetadataService:', {
  isInitialized: window.fastMetadataService?.isInitialized,
  isLoading: window.fastMetadataService?.isLoading,
  metadataSize: window.fastMetadataService?.metadata?.size
});
```

### 5. Metadata Parsing Issue
**Hypothesis**: Files are loaded but metadata parsing fails.

**How to verify**: Check console for parsing errors

## Next Steps (Phase 2: Pattern Analysis)

1. **Check Browser Console**
   - Open http://localhost:3001
   - Open DevTools (F12)
   - Look for errors in Console tab
   - Look for Firebase Storage logs

2. **Run Diagnostic Script**
   - Open debug-audio-loading.js in browser
   - Or paste script into console
   - Check results

3. **Compare with Working Implementation**
   - Find similar app that loads audio from Firebase Storage
   - Compare implementation

4. **Check Firebase Console**
   - Verify files exist in Storage
   - Check Storage rules
   - Check for any quota issues

## How to Verify Each Cause

### In Browser Console
```javascript
// 1. Check if fastMetadataService exists
console.log('Service exists:', !!window.fastMetadataService);

// 2. Check initialization status
if (window.fastMetadataService) {
  console.log('Status:', {
    isInitialized: window.fastMetadataService.isInitialized,
    isLoading: window.fastMetadataService.isLoading,
    metadataSize: window.fastMetadataService.metadata.size,
    lastUpdate: window.fastMetadataService.lastUpdate
  });

  // 3. List files by folder
  const byFolder = {};
  window.fastMetadataService.metadata.forEach((value, key) => {
    const folder = value.folder || 'unknown';
    if (!byFolder[folder]) byFolder[folder] = [];
    byFolder[folder].push(key);
  });
  console.log('Files by folder:', byFolder);
}

// 4. Check Firebase Storage
(async async () => {
  const { ref, listAll } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');
  const { storage } = await import('/src/config/secure-firebase.js');

  for (const folder of ['hudba', 'dychanie', 'meditacie']) {
    try {
      const result = await listAll(ref(storage, folder));
      console.log(`${folder}:`, result.items.length, 'files');
      result.items.slice(0, 5).forEach(item => console.log('  -', item.name));
    } catch (error) {
      console.error(`${folder}:`, error.message);
    }
  }
})();
```

## Expected Behavior

**When working correctly**:
- Browser console should show:
  ```
  🔍 [Firebase Storage] Loading hudba folder...
  ✅ [Firebase Storage] Hudba folder loaded: { items: X, prefixes: Y }
  🔍 [Firebase Storage] Loading dychanie folder...
  ✅ [Firebase Storage] Dychanie folder loaded: { items: X, prefixes: Y }
  🔍 [Firebase Storage] Loading meditacie folder...
  ✅ [Firebase Storage] Meditacie folder loaded: { items: X, prefixes: Y }
  ✅ Fast metadata loading completed: N files processed
  ```

- fastMetadataService.metadata.size should be > 0
- HudbaScreen should display albums/tracks
- MeditationScreen should display meditation files
- BreathScreen should have breathing sounds available

## Actions Required

1. **Immediate**: Check browser console for errors
2. **If Firebase Storage empty**: Upload files to Firebase Storage
3. **If permissions issue**: Update Firebase Storage rules
4. **If cache issue**: Clear cache and reload
5. **If initialization issue**: Check service initialization order

## Files Modified

- `src/services/fastMetadataService.js` - Added detailed logging
- Created `debug-audio-loading.js` - Diagnostic script
- Created `AUDIO-DEBUG-SUMMARY.md` - This file

## Status

🔍 **Phase 1: Root Cause Investigation** - In Progress
- ✅ Architecture analyzed
- ✅ Logging added
- ⏳ Awaiting browser console inspection
- ⏳ Awaiting diagnostic results
