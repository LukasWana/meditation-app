# Architecture & Design Patterns

**Last updated:** 2025-10-29

## Architektonický přístup

Projekt používá **feature-based architecture** s jasnou separací concerns.

## Directory Structure

```
src/
├── features/              # Feature modules (52 souborů)
│   ├── audio/            # Audio player + hooks (25 souborů)
│   ├── meditation/       # Meditation screens & components
│   └── navigation/       # Navigation system
│
├── components/           # Shared UI components (26)
│   ├── animations/      # Framer Motion wrappers
│   ├── ui/              # Basic UI elements
│   └── admin/           # Admin-specific components
│
├── hooks/                # Custom React hooks (20)
│   ├── audio hooks      # useAudioPermission, useVoiceSwitcher
│   ├── firebase hooks   # useFirebaseHudbaScanner, useRealtimeMetadata
│   ├── metadata hooks   # useMetadataLoader, useFastTrackLoader
│   └── app hooks        # useAppState, useNavigation, useTimer
│
├── services/             # Business logic layer (25 služeb)
│   ├── firebase.js      # Firebase initialization
│   ├── *Service.js      # Domain-specific services
│   └── monitoring/      # Performance, security, error monitoring
│
├── utils/                # Pure utility functions
│   ├── validation/      # Input validation
│   ├── error-handler/   # Error handling
│   └── helpers/         # Generic helpers
│
├── contexts/             # React contexts
│   └── LanguageContext  # i18n context
│
└── config/               # Configuration files
    ├── firebase.js      # Firebase config
    └── performance.js   # Performance thresholds
```

## Design Patterns

### 1. Feature-Based Organization

**Princip:** Každá feature má své vlastní složky s veškerým souvisejícím kódem.

**Příklad: Audio feature**
```
features/audio/
├── components/          # Audio-specific komponenty
│   ├── AudioPlayer.jsx
│   ├── AudioControls.jsx
│   └── CircularProgress.jsx
├── hooks/              # Audio-specific hooks
│   ├── useAudioPlayer.js
│   ├── useVoiceSwitcher.js
│   └── useAudioFilter.js
└── index.js            # Clean exports
```

**Výhody:**
- Veškerý kód pro jednu feature na jednom místě
- Snadné refaktorování
- Clear ownership
- Možnost extrahovat do samostatného balíčku

### 2. Custom Hooks Pattern

**Princip:** Business logika zapouzdřená v custom hooks, komponenty zůstávají čisté.

**Příklad:**
```javascript
// Hook zapouzdřuje komplexní logiku
function useMetadataLoader(files) {
  const [metadata, setMetadata] = useState({})
  const [loading, setLoading] = useState(true)

  // 5-level fallback logic
  useEffect(() => {
    // Memory → localStorage → Firestore → Realtime DB → MP3
  }, [files])

  return { metadata, loading }
}

// Komponenta je jednoduchá
function SlovaScreen() {
  const { metadata, loading } = useMetadataLoader(files)
  if (loading) return <Loader />
  return <AudioList metadata={metadata} />
}
```

### 3. Service Layer Pattern

**Princip:** Veškerá business logika a external API calls v service vrstvě.

**Services:**
- `firebase.js` - Firebase initialization
- `realtimeDatabaseService.js` - Realtime DB operations
- `unifiedMetadataService.js` - Metadata orchestration
- `cacheServiceRefactored.js` - LRU cache management
- `performanceMonitor.js` - Performance tracking
- `securityMonitor.js` - Security monitoring
- `errorMonitoring.js` - Error tracking

**Výhody:**
- Komponenty neví o implementaci
- Snadné testování (mock services)
- Centralizovaná error handling
- Možnost změnit backend bez změny komponent

### 4. Metadata Fallback Pattern

**5-level fallback strategie:**

```
1. Memory (runtime cache) → nejrychlejší
2. localStorage (persistent cache) → rychlé
3. Firestore (cloud database) → pomalejší
4. Realtime Database (fallback) → alternative cloud
5. MP3 metadata extraction → poslední možnost
```

**Implementace:**
```javascript
async function getMetadata(filename) {
  // Level 1: Memory
  if (memoryCache.has(filename)) return memoryCache.get(filename)

  // Level 2: localStorage
  const cached = localStorage.getItem(`metadata_${filename}`)
  if (cached) return JSON.parse(cached)

  // Level 3: Firestore
  const firestoreData = await firestoreService.get(filename)
  if (firestoreData) return firestoreData

  // Level 4: Realtime DB
  const realtimeData = await realtimeDbService.get(filename)
  if (realtimeData) return realtimeData

  // Level 5: Extract from MP3
  return await extractMp3Metadata(filename)
}
```

### 5. Audio Filtering Pattern

**Inteligentní parser názvů souborů:**

```
Format: hlas{N}kod-tema.mp3
Příklad: hlas4m-relaxacia.mp3

Parsing:
- hlas{N} → identifikátor hlasu (1-4)
- kod → target audience (m=muž, f=žena, prázdné=obecné)
- tema → název meditace

Result:
{
  voice: 4,
  targetGender: 'm',
  language: 'sk',
  theme: 'relaxacia',
  priority: calculatePriority(userPrefs)
}
```

**Priority algoritmus:**
```javascript
function calculatePriority(file, userPrefs) {
  let priority = 0

  // +3 pro matching gender
  if (file.targetGender === userPrefs.gender) priority += 3

  // +2 pro matching language
  if (file.language === userPrefs.language) priority += 2

  // +1 pro preferovaný hlas
  if (file.voice === userPrefs.preferredVoice) priority += 1

  return priority
}
```

### 6. Monitoring Pattern

**Centralizované monitoring services:**

```javascript
// performanceMonitor.js
class PerformanceMonitor {
  trackMetric(name, value) {
    this.metrics.push({ name, value, timestamp: Date.now() })
    this.checkThresholds(name, value)
  }

  checkThresholds(name, value) {
    if (value > THRESHOLDS[name]) {
      this.triggerAlert(name, value)
    }
  }
}

// Usage v komponentách
import { performanceMonitor } from '@services/performanceMonitor'

useEffect(() => {
  const start = performance.now()
  // ... operace
  performanceMonitor.trackMetric('metadata_load_time', performance.now() - start)
}, [])
```

### 7. Error Boundary Pattern

**Graceful degradation a error recovery:**

```javascript
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    errorMonitoring.logError(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />
    }
    return this.props.children
  }
}
```

### 8. Cache Strategy Pattern

**LRU (Least Recently Used) cache s TTL:**

```javascript
class LRUCache {
  constructor(maxSize = 100, ttl = 3600000) {
    this.cache = new Map()
    this.maxSize = maxSize
    this.ttl = ttl
  }

  set(key, value) {
    // Remove oldest if full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    })
  }

  get(key) {
    const item = this.cache.get(key)
    if (!item) return null

    // Check TTL
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    // Move to end (LRU)
    this.cache.delete(key)
    this.cache.set(key, item)
    return item.value
  }
}
```

## State Management

### Context API
- **LanguageContext** - Globální jazyk (SK/CZ)
- **UserPreferencesContext** - User settings (gender, voice, autoplay)

### Local State
- React hooks (useState, useReducer) pro component state
- Custom hooks pro shared state logic

**Proč ne Redux/Zustand?**
- Projekt není dostatečně komplexní
- Context API + hooks stačí
- Menší bundle size

## Routing Strategy

**React Router DOM v7.9.4:**

```javascript
<Routes>
  <Route path="/" element={<IntroScreen />} />
  <Route path="/home" element={<HomeScreen />} />
  <Route path="/meditation" element={<MeditationScreen />} />
  <Route path="/breath" element={<BreathScreen />} />
  <Route path="/slova" element={<SlovaScreen />} />
  <Route path="/hudba" element={<HudbaScreen />} />
  <Route path="/hudba/:albumId" element={<AlbumDetailScreen />} />
  <Route path="/admin" element={<NewAdminScreen />} />
  {/* ... */}
</Routes>
```

**Features:**
- Lazy loading routes
- AnimatePresence pro smooth transitions
- Navigation guard (admin routes)
- Deep linking support

## Component Hierarchy

```
App
├── IntroScreen (entry point)
└── Layout
    ├── Navigation
    └── Routes
        ├── HomeScreen
        │   └── 4 menu cards (Meditácia, Dýchanie, atd.)
        ├── MeditationScreen
        │   └── Timer + Controls
        ├── SlovaScreen
        │   ├── FilterControls
        │   └── AudioList
        │       └── AudioPlayer
        └── HudbaScreen
            ├── AlbumGrid
            └── AudioPlayer
```

## Data Flow

```
Firebase Storage (MP3 files)
    ↓
Cloud Function (onFileUpload) → Auto metadata extraction
    ↓
Firestore + Realtime DB (metadata storage)
    ↓
MetadataService (orchestration)
    ↓
Custom hooks (useMetadataLoader, etc.)
    ↓
Components (render UI)
```

## Security Architecture

### Input Validation
- **Whitelist approach** - Pouze povolené znaky
- **Sanitization** - Strip HTML/script tags
- **Length limits** - Max délky pro inputy
- **Pattern matching** - Regex validace

### Firebase Security
- **Rules** - Firestore a Storage security rules
- **Authentication** - Email/password s validací
- **Environment variables** - Config v .env (gitignored)
- **Pre-commit hooks** - Detekce API keys v kódu

### Encrypted Storage
```javascript
function encryptData(data) {
  // Simple XOR encryption for localStorage
  // Pro produkci: použít crypto API
}
```

## Performance Optimizations

### Code Splitting
- Lazy import screens
- Manual chunks (vendor-react, vendor-firebase, atd.)
- Dynamic imports pro heavy features

### Caching
- Service Worker cache strategies
- LRU memory cache
- localStorage persistence
- Firebase CDN cache

### Preloading
- Background data loader během intro
- Prefetch next audio track
- Preload critical metadata

### Lazy Loading
- Images lazy loaded
- Off-screen components lazy rendered
- Background tasks deferred

## Testing Strategy

### Unit Tests
- Services (cache, logger, validation)
- Hooks (useTimer)
- Utils (error-handler)

### Integration Tests
- Firebase integration (planned)
- Metadata fallback flow (planned)

### E2E Tests
- Critical user flows (planned)
- Audio playback (planned)

## Deployment Architecture

```
Local Development
    ↓ (npm run build)
Production Build
    ↓ (firebase deploy)
Firebase Hosting
    ├── Static Assets (CDN)
    ├── Service Worker (offline)
    └── Cloud Functions (backend)
```

## Scaling Considerations

**Current:** Single-region Firebase
**Future:**
- Multi-region Firestore
- CDN pro audio files
- Edge caching
- Redis cache layer

## Trade-offs & Decisions

**✅ Zvoleno:**
- Firebase (rychlý start, BaaS)
- Vite (rychlejší než Webpack)
- Framer Motion (lepší než GSAP pro React)
- Feature-based struktura (škáluje lépe než MVC)

**❌ Nezvoleno:**
- TypeScript (projekt začal v JS, migrace planned)
- Redux (Context API stačí)
- GraphQL (REST API Firebase stačí)
- Microservices (monolith je jednodušší)

## Související kontext

- [Tech Stack](tech-stack.md)
- [Firebase Integration](firebase-integration.md)
- [Audio System](audio-system.md)
