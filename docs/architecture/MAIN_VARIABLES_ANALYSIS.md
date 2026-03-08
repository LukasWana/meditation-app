# 🔧 HLAVNÍ PROMĚNNÉ V APLIKACI

## 🎯 GLOBÁLNÍ STATE PROMĚNNÉ

### **1. 📱 APP STATE (useAppState.js)**
```javascript
// Meditace state
const [time, setTime] = useState(300);                    // Čas v sekundách
const [selectedDuration, setSelectedDuration] = useState(5); // Délka meditace v minutách
const [isPlaying, setIsPlaying] = useState(false);        // Stav přehrávání
const [breathPhase, setBreathPhase] = useState('in');     // Fáze dýchání

// User preferences
const [gender, setGender] = useState(() => {
  const savedGender = localStorage.getItem('meditation-app-gender');
  return savedGender || 'none';
});
const [voicePreference, setVoicePreference] = useState(() => {
  const savedVoice = localStorage.getItem('meditation-app-voice');
  return savedVoice || 'auto';
});

// Audio player state
const [isPlayerActive, setIsPlayerActive] = useState(false);
const [activeAudio, setActiveAudio] = useState(null);
const [selectedAlbum, setSelectedAlbum] = useState(null);
```

### **2. 🧭 NAVIGATION STATE (App.jsx)**
```javascript
const [showIntro, setShowIntro] = useState(true);         // Intro animace
const { currentScreen, navigateToScreen } = useNavigation('intro');
```

---

## 🎵 AUDIO PROMĚNNÉ

### **3. 🎧 AUDIO PLAYER STATE**
```javascript
// useAudioPlayer.js
const [isPlaying, setIsPlaying] = useState(false);
const [currentTime, setCurrentTime] = useState(0);
const [duration, setDuration] = useState(0);
const [progress, setProgress] = useState(0);
const [durationStable, setDurationStable] = useState(false);
const [audioState, setAudioState] = useState({
  hasInteracted: false,
  isInitialized: false,
  lastError: null
});
```

### **4. 🔄 AUDIO CONTEXT**
```javascript
// Globální audio context
window.globalAudioContext = null;
window.audioActivated = false;
```

---

## 🗄️ CACHE PROMĚNNÉ

### **5. 💾 CACHE SERVICE**
```javascript
// cacheServiceRefactored.js
this.audioCache = new AudioCache();           // Download URL cache
this.metadataCache = new MetadataCache();     // Metadata cache
this.firebaseQueryCache = new FirebaseQueryCache(); // Firebase queries
this.imageCache = new ImageCache();           // Cover images
```

### **6. 📊 METADATA MAPS**
```javascript
// globalMetadataPreloader.js
this.metadata = new Map(); // Všechna metadata v paměti

// slovaDataService.js
this.slovaData = {
  sk: { male: [], female: [], all: [] },
  cz: { male: [], female: [], all: [] },
  en: { male: [], female: [], all: [] }
};
```

---

## ⚙️ KONFIGURAČNÍ PROMĚNNÉ

### **7. 🔥 FIREBASE CONFIG**
```javascript
// secure-firebase.js
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
```

### **8. ⚡ PERFORMANCE CONFIG**
```javascript
// performance.js
export const performanceConfig = {
  development: {
    chunkSize: 3,
    imageChunkSize: 2,
    longTaskThreshold: 100,
    performanceLogging: true,
    errorMonitoring: false,
    yieldTimeout: 1
  },
  production: {
    chunkSize: 8,
    imageChunkSize: 5,
    longTaskThreshold: 150,
    performanceLogging: false,
    errorMonitoring: true,
    yieldTimeout: 0
  }
};
```

---

## 🎨 UI PROMĚNNÉ

### **9. 🌐 LANGUAGE CONTEXT**
```javascript
// LanguageContext.jsx
const [language, setLanguage] = useState(() => {
  const saved = localStorage.getItem('meditation-app-language');
  return saved || 'SK';
});
```

### **10. 🎭 THEME STATE**
```javascript
// NewAdminScreen.jsx
const [isDarkMode, setIsDarkMode] = useState(false);
```

---

## 📊 DATA LOADING PROMĚNNÉ

### **11. 🔄 LOADING STATES**
```javascript
// Různé komponenty
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState(null);
const [lastUpdated, setLastUpdated] = useState(null);
```

### **12. 📈 STATISTICS**
```javascript
// NewAdminScreen.jsx
const [audioStats, setAudioStats] = useState({
  totalFiles: 0,
  totalSize: 0,
  hudbaFiles: 0,
  slovaFiles: 0,
  hudbaSize: 0,
  slovaSize: 0
});
```

---

## 🛡️ SECURITY PROMĚNNÉ

### **13. 🔐 ERROR HANDLING**
```javascript
// error-handler.js
this.errorQueue = [];
this.maxQueueSize = 100;
this.maxRetries = 3;
this.retryDelay = 1000;
this.sessionId = this.generateSessionId();
this.isReportingEnabled = import.meta.env.MODE === 'production';
```

### **14. 🔒 ENCRYPTION**
```javascript
// localStorage-encryption.js
const ENCRYPTION_KEY = 'meditation-app-secret-key';
const STORAGE_PREFIX = 'meditation_encrypted_';
```

---

## 🎯 CACHE LIMITS

### **15. 📏 CACHE LIMITS**
```javascript
// BaseCache.js
constructor(name, maxSize = 100, ttl = 60 * 60 * 1000) {
  this.maxSize = maxSize;  // Maximální počet položek
  this.ttl = ttl;          // Time to live (1 hodina)
}
```

---

## 🌍 ENVIRONMENT VARIABLES

### **16. 🔧 ENV VARIABLES**
```javascript
// .env soubory
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_RECAPTCHA_SITE_KEY=...
VITE_DEBUG_PERFORMANCE=false
```

---

## 📱 COMPONENT SPECIFIC

### **17. 🎵 AUDIO CONTROLS**
```javascript
// AudioControls.jsx
const [selectedVoice, setSelectedVoice] = useState('male');
const [hasVariants, setHasVariants] = useState(false);
```

### **18. 🎨 SCREEN STATES**
```javascript
// Různé screens
const [activeAudio, setActiveAudio] = useState(null);
const [debugInfo, setDebugInfo] = useState({});
const [needsUpdate, setNeedsUpdate] = useState(false);
const [updateStatus, setUpdateStatus] = useState('idle');
```

---

## 🔄 BATCH PROCESSING

### **19. 📦 BATCH CONFIG**
```javascript
// mp3MetadataExtractor.js
const batchSize = 3;        // Metadata batch size
const chunkSize = 20;       // Cache chunk size
const yieldTimeout = 0;     // Yield timeout
```

---

## 🎯 KLÍČOVÉ PROMĚNNÉ PRO FUNKČNOST

### **TOP 10 NEJDŮLEŽITĚJŠÍCH:**

1. **`gender`** - Uživatelské pohlaví pro filtrování meditací
2. **`language`** - Jazyk aplikace (SK/CZ/EN)
3. **`isPlayerActive`** - Stav audio přehrávače
4. **`activeAudio`** - Aktuálně přehrávané audio
5. **`time`** - Čas meditace v sekundách
6. **`isPlaying`** - Stav přehrávání meditace
7. **`metadata`** - Map všech audio metadat
8. **`slovaData`** - Předpřipravená slova data
9. **`audioCache`** - Cache pro download URL
10. **`currentScreen`** - Aktuální obrazovka

---

## 📊 PAMĚŤOVÉ NÁROKY

### **ESTIMATED MEMORY USAGE:**
- **App State:** ~1-2KB
- **Audio State:** ~1-2KB
- **Cache Maps:** ~50-100KB
- **Metadata:** ~100-200KB
- **Total:** ~150-300KB

---

## 🔧 DOPORUČENÍ PRO ÚDRŽBU

### **1. MONITORING:**
- Sleduj velikost cache maps
- Kontroluj localStorage usage
- Monitoruj memory leaks

### **2. OPTIMALIZACE:**
- Implementuj cache cleanup
- Přidej memory limits
- Optimalizuj batch sizes

### **3. DEBUGGING:**
- Použij `console.log` pro state debugging
- Implementuj state logging
- Přidej performance monitoring

**Datum analýzy:** ${new Date().toLocaleDateString('cs-CZ')}
**Analytik:** AI Assistant
**Verze:** 1.0.0
