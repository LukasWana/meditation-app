# Data Flow Diagram - Meditace App

## Přehled toku dat v aplikaci

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              MEDITACE APP DATA FLOW                            │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   USER ACTION   │    │   COMPONENT     │    │   DATA SOURCE   │
│                 │    │                 │    │                 │
│ • Click song    │───▶│ HudbaScreen     │───▶│ Firebase Storage│
│ • Play audio    │    │                 │    │                 │
│ • Navigate      │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  useFirebaseHudbaFilter │
                       │  (Hook)         │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  hudbaItems[]   │
                       │  (Raw Data)     │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  getDisplayDuration() │
                       │  (Duration Logic)     │
                       └─────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
                    ▼           ▼           ▼
            ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
            │  1. State   │ │  2. Cache   │ │ 3. Metadata │
            │   Cache     │ │ (localStorage)│ │   Fallback  │
            │             │ │             │ │             │
            │ durations   │ │ cacheService│ │ item.duration│
            │ Map()       │ │ .getDuration│ │             │
            └─────────────┘ └─────────────┘ └─────────────┘
                    │           │           │
                    └───────────┼───────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  formatDuration()│
                       │  (MM:SS format) │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   UI Display    │
                       │   (Duration)    │
                       └─────────────────┘
```

## Detailní tok dat pro Duration

### 1. Inicializace aplikace
```
App Start
    │
    ▼
┌─────────────────┐
│ BaseCache       │
│ Constructor     │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ loadFromStorage()│
│ (localStorage)  │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Cache Ready     │
│ (Memory + Local)│
└─────────────────┘
```

### 2. Načítání hudba dat
```
HudbaScreen Mount
    │
    ▼
┌─────────────────┐
│ useFirebaseHudbaFilter │
│ (Hook)          │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Firebase Query  │
│ (Storage API)   │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ hudbaItems[]    │
│ (Raw Metadata)  │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ useEffect       │
│ (Duration Load) │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ getAudioDuration│
│ (Audio Element) │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ cacheService    │
│ .setDuration()  │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ localStorage    │
│ (Persistent)    │
└─────────────────┘
```

### 3. Zobrazování duration
```
User Views Song
    │
    ▼
┌─────────────────┐
│ getDisplayDuration│
│ (5 Fallbacks)   │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ 1. State Check  │
│ durations.has() │
└─────────────────┘
    │
    ▼ (if not found)
┌─────────────────┐
│ 2. Cache Check  │
│ cacheService    │
│ .getDuration()  │
└─────────────────┘
    │
    ▼ (if not found)
┌─────────────────┐
│ 3. Metadata     │
│ item.duration   │
└─────────────────┘
    │
    ▼ (if not found)
┌─────────────────┐
│ 4. Static Meta  │
│ cacheService    │
│ .getMetadata()  │
└─────────────────┘
    │
    ▼ (if not found)
┌─────────────────┐
│ 5. N/A Fallback │
│ "N/A"           │
└─────────────────┘
```

## Cache Architecture

### Memory Cache (BaseCache)
```
┌─────────────────┐
│ BaseCache       │
│                 │
│ • Map() storage │
│ • TTL management│
│ • Limit control │
│ • Persistence   │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ AudioCache      │
│                 │
│ • setDuration() │
│ • getDuration() │
│ • localStorage  │
└─────────────────┘
```

### Data Flow Layers
```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ HudbaScreen │  │AudioControls│  │AudioPlayer  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                     LOGIC LAYER                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │useFirebase  │  │getDisplay   │  │formatDuration│     │
│  │HudbaFilter  │  │Duration     │  │             │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                    CACHE LAYER                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ BaseCache   │  │ AudioCache  │  │localStorage │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                    DATA LAYER                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │Firebase     │  │Static       │  │Audio        │     │
│  │Storage      │  │Metadata     │  │Elements     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## Performance Flow

### Fast Path (Cached Data)
```
User Action → State Cache → UI Display
     (0ms)      (1ms)        (2ms)
```

### Medium Path (Persistent Cache)
```
User Action → localStorage → UI Display
     (0ms)      (5ms)         (7ms)
```

### Slow Path (Fresh Load)
```
User Action → Firebase → Audio Load → Cache → UI Display
     (0ms)      (200ms)    (500ms)     (1ms)   (502ms)
```

## Error Handling Flow

```
Error Occurs
    │
    ▼
┌─────────────────┐
│ Retry Logic     │
│ (3 attempts)    │
└─────────────────┘
    │
    ▼ (if retry fails)
┌─────────────────┐
│ Fallback Chain  │
│ (5 levels)      │
└─────────────────┘
    │
    ▼ (if all fail)
┌─────────────────┐
│ Show "N/A"      │
│ (Graceful)      │
└─────────────────┘
```

## State Management

### Component State
```
HudbaScreen
├── activeAudio (AudioPlayer state)
├── durations (Map of loaded durations)
└── isLoading (Loading states)
```

### Cache State
```
AudioCache
├── Memory Cache (Map)
│   ├── duration_audioSrc1 → {value, timestamp, ttl}
│   └── duration_audioSrc2 → {value, timestamp, ttl}
└── localStorage
    └── cache_audio → JSON string
```

### Global State
```
App State
├── Firebase Data (hudbaItems)
├── Cache Service (singleton)
├── Logger Service
└── Performance Monitor
```

Tento diagram ukazuje, jak data proudí přes různé vrstvy aplikace, od uživatelské akce až po zobrazení v UI, s důrazem na optimalizaci a persistentní ukládání duration dat.
