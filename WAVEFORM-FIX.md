# 🌊 Waveform Display Fix - 2026-03-20

## ✅ Status: SOLVED

---

## 🐛 Problem Description

In the "Vyberte zvuk" (Select Sound) section, waveform visualizations were not displaying for individual sound files in the breathing sounds gallery.

---

## 🔍 Root Cause

**The metadata was missing `waveformData` property.**

When `fastMetadataService.js` created metadata for audio files, it only included:
- fileName
- downloadURL
- duration
- durationFormatted
- etc.

**BUT NOT `waveformData`**, which is required by the `<Waveform>` component to display the visualization.

The `Waveform` component checks:
```javascript
const hasWaveformData = waveformData && Array.isArray(waveformData) && waveformData.length > 0;
```

If `waveformData` is null or undefined, it displays:
```
"Žádná waveform data"
```

---

## 🛠️ Solution Applied

**Modified:** `src/services/fastMetadataService.js`

**Added waveform generation for dychanie (breathing) files:**

```javascript
// Generuj waveform data pro dychanie soubory
if (normalizedFolder === 'dychanie' && metadata.downloadURL) {
  try {
    const { generateWaveformFromUrl } = await import('@utils/waveformGenerator');
    const waveformData = await generateWaveformFromUrl(metadata.downloadURL, 150);
    if (waveformData) {
      metadata.waveformData = waveformData;
      metadata.waveformMax = Math.max(...waveformData);
      log.debug(`🌊 Waveform generated for ${filePath}: ${waveformData.length} samples`);
    }
  } catch (error) {
    log.warn(`Failed to generate waveform for ${filePath}:`, error);
    // Pokud se nepodařilo vygenerovat waveform, nastav prázdné pole
    metadata.waveformData = null;
    metadata.waveformMax = null;
  }
}
```

**Location:** Added after the duration loading logic in `createMetadataFromFile()` method (line ~607)

---

## 📊 How It Works

1. **When metadata is loaded** for dychanie (breathing) audio files
2. **Waveform generation is triggered** using `generateWaveformFromUrl()`
3. **Audio is fetched** from Firebase Storage (with CORS support)
4. **AudioBuffer is decoded** using Web Audio API
5. **Waveform data is extracted** - 150 samples representing amplitude at different points
6. **Data is stored in metadata** as `waveformData` and `waveformMax`
7. **Waveform component displays** the visualization using this data

---

## 🧪 Technical Details

### Waveform Data Structure

```javascript
{
  waveformData: [0.1, 0.5, 0.8, 0.3, ...], // 150 amplitude values (0-1)
  waveformMax: 0.95 // Maximum amplitude for normalization
}
```

### Files Modified

1. **`src/services/fastMetadataService.js`**
   - Added waveform generation for dychanie folder files
   - Uses dynamic import to avoid loading waveformGenerator unless needed

### Files That Use WaveformData

1. **`src/components/Waveform.jsx`** - Displays the waveform visualization
2. **`src/features/meditation/screens/SoundThemeGalleryScreen.jsx`** - Shows waveforms in sound selection
3. **`src/components/SoundThemeGallery.jsx`** - Shows waveforms in modal gallery

---

## ⚠️ Important Notes

### CORS Requirements

Waveform generation uses `fetch()` with `mode: 'cors'` to load audio files from Firebase Storage.

**CORS configuration must be deployed on Firebase Storage:**
```bash
gsutil cors set firebase-storage-cors.json gs://meditations-audio.firebasestorage.app
```

**CORS configuration (`firebase-storage-cors.json`):**
```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "maxAgeSeconds": 3600,
    "responseHeader": [
      "Content-Type",
      "Content-Length",
      "Content-Range",
      "Accept-Ranges",
      "Cache-Control",
      "ETag"
    ]
  }
]
```

### Performance Considerations

**Waveform generation happens during metadata loading:**
- Only for `dychanie` folder files (not all audio files)
- Asynchronous operation - doesn't block UI
- Falls back gracefully if generation fails
- 150 samples = good balance between detail and performance

### Error Handling

If waveform generation fails:
- `waveformData` is set to `null`
- `waveformMax` is set to `null`
- Waveform component displays "Žádná waveform data"
- Rest of the app continues to work normally

---

## 🚀 Deployment

- **Build:** ✅ Success
- **Deploy:** ✅ Complete
- **URL:** https://meditations-audio.web.app
- **Date:** 2026-03-20

---

## 📝 Verification Steps

1. **Open the app** in browser (clear cache: Ctrl+Shift+R)
2. **Navigate to:** Dýchání (Breathing) section
3. **Click:** "Zobrazit galériu" or "Vyberte zvuky"
4. **Verify:** Waveforms are displayed for each sound file
5. **Check:** Each waveform shows unique visualization (not all identical)

### Expected Result

- ✅ Waveform visualizations appear below sound names
- ✅ Each sound has its own unique waveform pattern
- ✅ Waveforms reflect the actual audio content
- ✅ No errors in browser console related to waveforms

---

## 🎓 Related Fixes

This fix is part of improving the breathing sounds experience:

1. **Audio Loading Fix** (FIREBASE-AUDIO-LOADING-FIX.md) - Fixed CORS configuration for Firebase Storage
2. **Waveform Display Fix** (this document) - Added waveform generation for breathing sounds
3. **Both fixes work together** - CORS enables waveform generation to work properly

---

## 🔧 Future Improvements

### Possible Enhancements

1. **Pre-generate waveforms server-side** using Firebase Functions
   - Faster metadata loading
   - Consistent waveforms across all clients
   - Reduced client-side processing

2. **Cache waveforms in metadata**
   - Store in Firestore or Realtime Database
   - Avoid regenerating on every load
   - Improve performance

3. **Extend to other audio folders**
   - Currently only dychanie files
   - Could add to hudba, meditacie folders
   - Would require more processing time

4. **Progressive loading**
   - Show placeholder first
   - Generate waveforms in background
   - Update UI when ready

---

## 📅 Date: 2026-03-20
## 🏷️ Issue: Waveform Visualizations Missing
## ✅ Resolution: Added waveform generation to metadata creation
