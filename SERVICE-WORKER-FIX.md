# Service Worker Cache Fix - Root Cause & Solution

## Problem
Audio files were not displaying in the UI despite backend tests passing 100%.

## Root Cause Analysis

### The Breaking Change
In commit `17cdb59` (feat(pwa): integrate useRegisterSW), the Service Worker registration was moved from conditional registration (after data load) to immediate registration in `App.jsx`.

### Before PWA (Working)
- Service Worker registered AFTER data loading via `readyForServiceWorker` flag in `useAppInitialization`
- Fresh data loaded from Firebase BEFORE caching started
- Metadata and audio files displayed correctly

### After PWA (Broken)
- Service Worker registered IMMEDIATELY on app mount in `App.jsx`
- Workbox CacheFirst strategy cached Firebase responses BEFORE data loaded
- Empty/incomplete responses cached for 30 days
- UI showed stale cached data forever

### Technical Details
The Workbox configuration in `vite.config.mjs` was using:
```javascript
{
  urlPattern: /.*\.mp3|https:\/\/firebasestorage\.googleapis\.com\/.*/i,
  handler: 'CacheFirst',  // ← Problem: serves stale cache
  options: {
    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
  }
}
```

This cached ALL Firebase Storage URLs, including metadata files, before they were loaded.

## Solution Implemented

### 1. Delayed Service Worker Registration
Created `ServiceWorkerManager.jsx` component that:
- Only registers Service Worker AFTER data is fully loaded
- Receives `shouldRegister` prop from `initialization.isReady`
- Prevents caching of empty/incomplete responses

### 2. Updated Caching Strategy
Changed Workbox configuration to:
```javascript
// Audio files: CacheFirst, 7 days
// Metadata JSON: NetworkFirst, 1 day ← Always get fresh metadata
// Images: CacheFirst, 7 days
```

Metadata now uses NetworkFirst to ensure fresh data on every request.

### 3. Cache Clearing Utilities
Added `window.clearServiceWorkerCache()` function to help users:
- Unregister all Service Workers
- Delete all Cache Storage caches
- Prepare for fresh data load

## Files Modified
1. `src/App.jsx` - Removed immediate SW registration, added ServiceWorkerManager
2. `src/components/ServiceWorkerManager.jsx` - New component for conditional SW registration
3. `src/hooks/useAppInitialization.js` - Provides isReady state for SW registration
4. `vite.config.mjs` - Updated caching strategies
5. `src/main.jsx` - Added clearServiceWorkerCache utility

## How to Verify Fix

### For Development (Fresh Install)
1. Stop dev server (Ctrl+C)
2. Delete `dev-dist` folder: `rm -rf dev-dist`
3. Clear browser cache or use Incognito mode
4. Start dev server: `npm run dev`
5. Open http://localhost:3000
6. Open console and check for: `✅ PWA: Service Worker registered AFTER data load`
7. Navigate to HudbaScreen
8. Audio files should now display

### For Existing Cached Data
If you still see old data after applying the fix:

1. **Open DevTools** (F12)
2. **Run in console**:
   ```javascript
   window.clearServiceWorkerCache()
   ```
3. **Hard refresh** (Ctrl+Shift+R)
4. **Verify** audio files now display

Or manually:
1. DevTools → Application → Clear site data
2. Hard refresh (Ctrl+Shift+R)

## Expected Behavior After Fix
- ✅ Service Worker registers AFTER metadata loads
- ✅ Fresh data fetched from Firebase on first load
- ✅ Audio files display correctly in UI
- ✅ NetworkFirst strategy ensures metadata stays fresh
- ✅ Cache still works for offline support, but with fresh data

## Testing Checklist
- [ ] Fresh install shows audio files
- [ ] Browser console shows "SW registered AFTER data load"
- [ ] HudbaScreen displays audio files
- [ ] Clear cache function works
- [ ] Offline mode still works (with cached data)
- [ ] Hard refresh still shows fresh data

## Future Considerations
- Consider adding cache versioning to force invalidation on updates
- Add periodic metadata refresh in background
- Monitor cache hit/miss ratios in production
- Consider using StaleWhileRevalidate for better UX
