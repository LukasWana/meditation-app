# Audio System

**Last updated:** 2025-10-29
**Related:** [Architecture](architecture.md), [Firebase Integration](firebase-integration.md)

## Overview

Sofistikovaný audio systém s inteligentním filtrováním, multi-level metadata fallback a plně funkčním přehrávačem.

## Audio File Naming Convention

### Format
```
hlas{N}{kod}-{tema}.mp3
```

**Komponenty:**
- `hlas{N}` - Identifikátor hlasu (1-4)
- `{kod}` - Target audience (m=muž, f=žena, prázdné=obecné)
- `{tema}` - Název meditace (kebab-case)

**Příklady:**
```
hlas1m-relaxacia.mp3
  → hlas: 1, target: muž, tema: relaxacia

hlas2f-spanok.mp3
  → hlas: 2, target: žena, tema: spanok

hlas3-dychanie.mp3
  → hlas: 3, target: obecné, tema: dychanie

hlas4kod-meditacia.mp3
  → hlas: 4, target: obecné (kod není m/f), tema: meditacia
```

## Parser Implementation

**Location:** `src/services/unifiedMetadataService.js`

```javascript
function parseFilename(filename) {
  // Remove extension
  const name = filename.replace('.mp3', '')

  // Parse pattern: hlas{N}{kod}-{tema}
  const match = name.match(/hlas(\d+)([mf])?-(.+)/)

  if (!match) return null

  const [, voice, targetGender, theme] = match

  return {
    voice: parseInt(voice),
    targetGender: targetGender || 'n', // 'n' = neutral/obecné
    theme: theme.replace(/-/g, ' '),
    language: detectLanguage(filename), // SK/CZ based on folder
    originalFilename: filename
  }
}
```

## Intelligent Filtering System

### Priority Algorithm

**Location:** `src/hooks/useAudioFilter.js`

```javascript
function calculatePriority(file, userPrefs) {
  let priority = 0

  // +3 body za matching target gender
  if (file.targetGender === userPrefs.gender) {
    priority += 3
  }
  // +1 bod za neutral (vhodné pro všechny)
  else if (file.targetGender === 'n') {
    priority += 1
  }

  // +2 body za matching language
  if (file.language === userPrefs.language) {
    priority += 2
  }

  // +1 bod za preferred voice
  if (file.voice === userPrefs.preferredVoice) {
    priority += 1
  }

  return priority
}
```

**Max priority:** 6 bodů (gender match + language match + voice match)

**Example:**
```javascript
// User preferences
const userPrefs = {
  gender: 'f',        // žena
  language: 'sk',     // slovenština
  preferredVoice: 2   // hlas 2
}

// Files s prioritami:
hlas2f-relaxacia.mp3 (SK)  → 6 bodů (gender+lang+voice) ⭐⭐⭐
hlas1f-spanok.mp3 (SK)     → 5 bodů (gender+lang)
hlas2m-dychanie.mp3 (SK)   → 3 body (lang+voice)
hlas2f-klid.mp3 (CZ)       → 4 body (gender+voice)
hlas3-meditacia.mp3 (SK)   → 3 body (lang+neutral)
```

### Filtering Implementation

**Location:** `src/hooks/useAudioFilter.js`

```javascript
function useAudioFilter(files, userPrefs) {
  const [filteredFiles, setFilteredFiles] = useState([])

  useEffect(() => {
    // Parse všechny soubory
    const parsed = files.map(file => ({
      ...file,
      ...parseFilename(file.name),
      priority: 0
    }))

    // Calculate priority
    const withPriority = parsed.map(file => ({
      ...file,
      priority: calculatePriority(file, userPrefs)
    }))

    // Sort by priority (highest first)
    const sorted = withPriority.sort((a, b) => b.priority - a.priority)

    setFilteredFiles(sorted)
  }, [files, userPrefs])

  return filteredFiles
}
```

## Metadata System

### 5-Level Fallback Strategy

**Order (fastest → slowest):**

1. **Memory Cache** (runtime Map)
   - Nejrychlejší: O(1) lookup
   - TTL: 1 hodina
   - Capacity: 100 items (LRU)

2. **localStorage** (persistent cache)
   - Rychlé: synchronní read
   - Persists across sessions
   - Encrypted storage

3. **Firestore** (cloud database)
   - Medium speed: ~100-300ms
   - Indexované queries
   - Reliable

4. **Realtime Database** (fallback cloud)
   - Rychlejší než Firestore pro simple reads
   - Real-time sync
   - Simpler structure

5. **MP3 Metadata Extraction** (last resort)
   - Nejpomalejší: ~500-1000ms
   - Vyžaduje download části souboru
   - Always works (pokud soubor existuje)

### Implementation

**Location:** `src/services/unifiedMetadataService.js`

```javascript
async function getMetadata(filename) {
  // Level 1: Memory
  if (memoryCache.has(filename)) {
    return memoryCache.get(filename)
  }

  // Level 2: localStorage
  const cached = getFromLocalStorage(`metadata_${filename}`)
  if (cached && !isExpired(cached)) {
    memoryCache.set(filename, cached.data)
    return cached.data
  }

  // Level 3: Firestore
  try {
    const firestoreData = await getFromFirestore(filename)
    if (firestoreData) {
      saveToCache(filename, firestoreData)
      return firestoreData
    }
  } catch (error) {
    console.warn('Firestore failed, trying Realtime DB')
  }

  // Level 4: Realtime DB
  try {
    const realtimeData = await getFromRealtimeDB(filename)
    if (realtimeData) {
      saveToCache(filename, realtimeData)
      return realtimeData
    }
  } catch (error) {
    console.warn('Realtime DB failed, extracting from MP3')
  }

  // Level 5: MP3 Extraction
  const extractedData = await extractFromMp3(filename)
  saveToCache(filename, extractedData)

  // Background: save to cloud for future
  saveToCloudAsync(filename, extractedData)

  return extractedData
}
```

### Metadata Schema

```typescript
interface AudioMetadata {
  filename: string          // "hlas1m-relaxacia.mp3"
  title: string            // "Relaxácia"
  duration: number         // 600 (seconds)
  voice: number            // 1-4
  targetGender: string     // "m" | "f" | "n"
  language: string         // "sk" | "cz" | "en"
  downloadURL: string      // Firebase Storage URL
  lastModified: Date       // Timestamp
  source: string           // "firestore" | "realtime" | "extracted"
}
```

## Audio Player Component

**Location:** `src/features/audio/components/AudioPlayer.jsx`

### Features

**Playback Controls:**
- Play/Pause
- Skip forward (next track)
- Skip backward (previous track)
- Seek bar (scrub through track)

**Display:**
- Track title
- Current time / Total duration
- Circular progress indicator
- Voice indicator

**Advanced:**
- Voice switcher (switch between male/female voices)
- Track switcher (browse all tracks)
- Autoplay toggle
- Volume control (planned)

### Implementation

```javascript
function AudioPlayer({ tracks, initialTrackIndex = 0 }) {
  const {
    currentTrack,
    isPlaying,
    progress,
    currentTime,
    duration,
    play,
    pause,
    seekTo,
    nextTrack,
    previousTrack,
    switchVoice
  } = useAudioPlayer(tracks, initialTrackIndex)

  return (
    <div className="audio-player">
      <CircularProgress progress={progress} />
      <TrackInfo track={currentTrack} />
      <TimeDisplay current={currentTime} total={duration} />

      <Controls
        isPlaying={isPlaying}
        onPlay={play}
        onPause={pause}
        onNext={nextTrack}
        onPrevious={previousTrack}
      />

      <SeekBar
        current={currentTime}
        max={duration}
        onChange={seekTo}
      />

      <VoiceSwitcher
        currentVoice={currentTrack.voice}
        onSwitch={switchVoice}
      />
    </div>
  )
}
```

## Voice Switching

**Location:** `src/hooks/useVoiceSwitcher.js`

**Koncept:** Uživatel může přepínat mezi různými hlasy (1-4) pro stejnou meditaci.

**Implementation:**
```javascript
function useVoiceSwitcher(currentTrack, allTracks) {
  const [availableVoices, setAvailableVoices] = useState([])

  useEffect(() => {
    // Najdi všechny verze stejné meditace s různými hlasy
    const sameThemeTracks = allTracks.filter(track =>
      track.theme === currentTrack.theme &&
      track.language === currentTrack.language &&
      track.targetGender === currentTrack.targetGender
    )

    // Seskup podle hlasu
    const voices = sameThemeTracks.reduce((acc, track) => {
      acc[track.voice] = track
      return acc
    }, {})

    setAvailableVoices(voices)
  }, [currentTrack, allTracks])

  const switchToVoice = (voiceNumber) => {
    const newTrack = availableVoices[voiceNumber]
    if (newTrack) {
      playTrack(newTrack)
    }
  }

  return { availableVoices, switchToVoice }
}
```

**Example:**
```
User hraje: hlas1m-relaxacia.mp3
Dostupné hlasy:
  - Hlas 1 (aktuální) ⭐
  - Hlas 2 → hlas2m-relaxacia.mp3
  - Hlas 3 → hlas3m-relaxacia.mp3
  - Hlas 4 → hlas4m-relaxacia.mp3

User klikne "Hlas 3" → přepne na hlas3m-relaxacia.mp3
```

## Background Preloading

**Location:** `src/hooks/useBackgroundDataLoader.js`

**Strategie:** Preload metadata během intro screenu (využít dobu animace).

```javascript
function useBackgroundDataLoader() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Start preload
    const preloadPromises = [
      preloadMetadata('slova/sk'),
      preloadMetadata('slova/cz'),
      preloadMetadata('hudba')
    ]

    Promise.all(preloadPromises)
      .then(() => {
        setReady(true)
      })
      .catch(error => {
        console.error('Preload failed', error)
        setReady(true) // Continue anyway
      })
  }, [])

  return { ready }
}
```

**Usage v IntroScreen:**
```javascript
function IntroScreen() {
  const { ready } = useBackgroundDataLoader()

  useEffect(() => {
    if (ready) {
      // After 3s intro animation
      setTimeout(() => {
        navigate('/home')
      }, 3000)
    }
  }, [ready])

  return <AnimatedLogo />
}
```

## Duration Persistence System

**Problem:** MP3 duration extraction je pomalé (500-1000ms).

**Solution:** Cache durations persistently.

**Location:** `src/services/audioMetadataStorageService.js`

### Implementation

```javascript
// Save duration po prvním přehrání
function onAudioLoaded(audio, filename) {
  const duration = audio.duration

  // Save to memory
  memoryCache.set(`duration_${filename}`, duration)

  // Save to localStorage
  localStorage.setItem(
    `duration_${filename}`,
    JSON.stringify({
      duration,
      timestamp: Date.now()
    })
  )

  // Background: save to Firestore
  saveToFirestoreAsync(filename, { duration })
}

// Load duration instantly
function getDuration(filename) {
  // Check cache first
  const cached = memoryCache.get(`duration_${filename}`)
  if (cached) return cached

  // Check localStorage
  const stored = localStorage.getItem(`duration_${filename}`)
  if (stored) {
    const { duration } = JSON.parse(stored)
    return duration
  }

  // Will be populated when audio loads
  return null
}
```

## Service Worker & Offline Support

**Location:** `public/sw.js`

### Cache Strategy

**Static assets** (Network First):
```javascript
// Try network, fallback to cache
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/assets/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          cache.put(event.request, response.clone())
          return response
        })
        .catch(() => cache.match(event.request))
    )
  }
})
```

**Audio files** (Cache First):
```javascript
// Try cache, fallback to network
if (event.request.url.includes('.mp3')) {
  event.respondWith(
    cache.match(event.request)
      .then(cached => cached || fetch(event.request))
  )
}
```

**API calls** (Network Only):
```javascript
// Always fresh data
if (event.request.url.includes('firestore') ||
    event.request.url.includes('firebase')) {
  event.respondWith(fetch(event.request))
}
```

### CORS Handling

**Problem:** Firebase Storage download URLs mají CORS restrictions.

**Solution:**
```javascript
// Add mode: 'cors' to fetch
fetch(audioUrl, { mode: 'cors' })

// Service Worker: clone response with correct headers
const response = await fetch(request)
const clonedResponse = new Response(response.body, {
  headers: {
    ...response.headers,
    'Access-Control-Allow-Origin': '*'
  }
})
```

## Performance Optimizations

### 1. Lazy Audio Loading
```javascript
// Don't load audio until play button clicked
const audioRef = useRef(null)

function play() {
  if (!audioRef.current) {
    audioRef.current = new Audio(downloadURL)
    audioRef.current.load()
  }
  audioRef.current.play()
}
```

### 2. Prefetch Next Track
```javascript
// Preload next track when 80% through current
useEffect(() => {
  if (progress > 0.8 && nextTrack) {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = nextTrack.downloadURL
    document.head.appendChild(link)
  }
}, [progress, nextTrack])
```

### 3. LRU Cache
```javascript
// Limit memory cache to 100 items
class LRUCache {
  maxSize = 100

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }
}
```

### 4. Batch Metadata Loads
```javascript
// Load metadata for all tracks in folder at once
async function loadFolderMetadata(folder) {
  const files = await listAll(ref(storage, folder))

  // Batch read from Firestore
  const metadataPromises = files.items.map(file =>
    getMetadata(file.name)
  )

  return Promise.all(metadataPromises)
}
```

## Testing

**Location:** `src/tests/`

**Tests (planned):**
- `useAudioFilter.test.js` - Priority calculation
- `useVoiceSwitcher.test.js` - Voice switching logic
- `parseFilename.test.js` - Filename parsing
- `metadataFallback.test.js` - 5-level fallback
- `AudioPlayer.test.js` - Player controls

## Related Documentation

Root MD files:
- `AUDIO_FILTERING_SYSTEM.md` - Filtering design
- `AUDIO_AUDIT.md` - Audio features audit
- `DURATION_FIX_SYSTEM.md` - Duration extraction fix
- `DURATION_PERSISTENCE_IMPLEMENTATION.md` - Persistence implementation
- `MP3_LOADING_ANALYSIS.md` - Performance analysis

## Issues & Fixes

### Issue: Slow metadata loading
**Fix:** 5-level fallback + aggressive caching

### Issue: Duration not persisting
**Fix:** Duration persistence system

### Issue: Wrong voice playing
**Fix:** Priority algorithm with target gender matching

### Issue: CORS errors on audio files
**Fix:** Service Worker CORS handling

## Future Improvements

- [ ] Audio waveform visualization
- [ ] Playback speed control (0.5x - 2x)
- [ ] Sleep timer (auto stop after X minutes)
- [ ] Favorite tracks
- [ ] Recently played history
- [ ] Shuffle mode
- [ ] Repeat mode (track/playlist)

## Související kontext

- [Architecture](architecture.md)
- [Firebase Integration](firebase-integration.md)
- [Tech Stack](tech-stack.md)
