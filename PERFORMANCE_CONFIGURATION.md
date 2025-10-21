# ⚡ KONFIGURACE PERFORMANCE V APLIKACI

## 🎯 PŘEHLED

Aplikace má **sophisticated performance configuration system** s různými nastaveními pro development, production a testing módy.

---

## 🔧 HLAVNÍ KONFIGURAČNÍ SOUBOR

### **`src/config/performance.js`**

```javascript
export const performanceConfig = {
  development: {
    chunkSize: 3,              // Menší chunky pro debugging
    imageChunkSize: 2,         // Menší image chunky
    longTaskThreshold: 100,    // ms - nižší threshold
    performanceLogging: true,  // Zapnuto pro debugging
    errorMonitoring: false,    // Vypnuto v development
    yieldTimeout: 1            // ms - yield control
  },

  production: {
    chunkSize: 8,              // Větší chunky pro rychlost
    imageChunkSize: 5,         // Větší image chunky
    longTaskThreshold: 150,    // ms - vyšší threshold
    performanceLogging: false, // Vypnuto v production
    errorMonitoring: true,     // Zapnuto pro monitoring
    yieldTimeout: 0            // Minimální delay
  },

  testing: {
    chunkSize: 20,             // Velké chunky pro rychlost
    imageChunkSize: 10,        // Velké image chunky
    longTaskThreshold: 50,     // ms - nízký threshold
    performanceLogging: false, // Vypnuto
    errorMonitoring: false,    // Vypnuto
    yieldTimeout: 0            // Bez delay
  }
};
```

---

## 🎛️ KONFIGURAČNÍ MECHANISMY

### **1. AUTOMATICKÉ DETEKCE MÓDU**
```javascript
export const getCurrentConfig = () => {
  const env = import.meta.env.MODE || 'development';

  // Debug flag override
  if (import.meta.env.VITE_DEBUG_PERFORMANCE === 'true') {
    return { ...performanceConfig.development, performanceLogging: true };
  }

  return performanceConfig[env] || performanceConfig.development;
};
```

### **2. KOMPONENT-SPECIFIC KONFIGURACE**
```javascript
export const getComponentConfig = (componentName) => {
  const baseConfig = getCurrentConfig();

  const componentConfigs = {
    'useFirebaseHudbaScanner': {
      ...baseConfig,
      chunkSize: Math.min(baseConfig.chunkSize, 5),
      imageChunkSize: Math.min(baseConfig.imageChunkSize, 3)
    },

    'AudioPlayer': {
      ...baseConfig,
      chunkSize: Infinity,        // Bez chunking
      performanceLogging: true    // Vždy loguj
    }
  };

  return componentConfigs[componentName] || baseConfig;
};
```

---

## 📊 POUŽITÍ V SLUŽBÁCH

### **1. CACHE SERVICE**
```javascript
// src/services/cacheServiceRefactored.js
async preloadCriticalData() {
  const entries = Object.entries(allMetadata);
  const chunkSize = 20; // Fixní chunk size pro cache

  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize);
    this.metadataCache.setMetadataBatch(chunk);

    // Yield control pro plynulé UI
    if (i + chunkSize < entries.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}
```

### **2. MP3 METADATA EXTRACTOR**
```javascript
// src/services/mp3MetadataExtractor.js
async loadMetadataBatch(files, batchSize = 3) {
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);

    // Paralelní zpracování dávky
    const batchPromises = batch.map(file =>
      this.extractMetadata(file.downloadURL, file.fileName)
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Pauza mezi dávkami
    if (i + batchSize < files.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
```

### **3. PERFORMANCE MONITOR**
```javascript
// src/services/performanceMonitor.js
class PerformanceMonitor {
  constructor() {
    this.config = getCurrentConfig();
    this.performanceThresholds = {
      longTask: this.config.longTaskThreshold,
      memoryWarning: 50 * 1024 * 1024, // 50MB
      slowNetwork: 3000 // ms
    };
  }

  initialize() {
    if (this.config.errorMonitoring) {
      this.setupLongTaskMonitoring();
      this.setupMemoryMonitoring();
      this.setupNetworkMonitoring();
    }
  }
}
```

---

## 🎯 CACHE KONFIGURACE

### **1. METADATA CACHE**
```javascript
// src/services/cache/MetadataCache.js
export class MetadataCache extends BaseCache {
  constructor() {
    super('metadata', 200, 60 * 60 * 1000); // 200 položek, 1 hodina TTL
  }
}
```

### **2. AUDIO CACHE**
```javascript
// src/services/cache/AudioCache.js
export class AudioCache extends BaseCache {
  constructor() {
    super('audio', 100, 30 * 60 * 1000); // 100 položek, 30 minut TTL
  }
}
```

### **3. IMAGE CACHE**
```javascript
// src/services/cache/ImageCache.js
export class ImageCache extends BaseCache {
  constructor() {
    super('image', 50, 2 * 60 * 60 * 1000); // 50 položek, 2 hodiny TTL
  }
}
```

---

## 🔍 MONITORING KONFIGURACE

### **1. PERFORMANCE THRESHOLDS**
```javascript
// src/services/performanceMonitor.js
this.performanceThresholds = {
  longTask: this.config.longTaskThreshold,    // 100-150ms
  memoryWarning: 50 * 1024 * 1024,           // 50MB
  slowNetwork: 3000,                          // 3s
  slowRender: 16,                             // 16ms (60fps)
  slowInteraction: 100                        // 100ms
};
```

### **2. ERROR MONITORING**
```javascript
// src/services/errorMonitoring.js
class ErrorMonitoringService {
  constructor() {
    this.isEnabled = import.meta.env.MODE === 'production';
    this.maxQueueSize = 100;
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }
}
```

---

## 🌍 ENVIRONMENT VARIABLES

### **1. PERFORMANCE DEBUG**
```bash
# .env
VITE_DEBUG_PERFORMANCE=true    # Zapne performance logging
VITE_DEBUG_CACHE=true          # Zapne cache debugging
VITE_DEBUG_METADATA=true       # Zapne metadata debugging
```

### **2. FIREBASE CONFIG**
```bash
# .env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
```

---

## 📈 PERFORMANCE METRICS

### **1. CHUNK SIZES**
- **Development:** 3 soubory/batch
- **Production:** 8 souborů/batch
- **Testing:** 20 souborů/batch

### **2. IMAGE CHUNK SIZES**
- **Development:** 2 obrázky/batch
- **Production:** 5 obrázků/batch
- **Testing:** 10 obrázků/batch

### **3. YIELD TIMEOUTS**
- **Development:** 1ms
- **Production:** 0ms
- **Testing:** 0ms

---

## 🎛️ KONFIGURACE KOMPONENTŮ

### **1. HUDBASCREEN**
```javascript
// Používá useFirebaseHudbaScanner
const config = getComponentConfig('useFirebaseHudbaScanner');
// chunkSize: max(3, 5) = 3 v development
// chunkSize: max(8, 5) = 5 v production
```

### **2. AUDIO PLAYER**
```javascript
// Používá AudioPlayer config
const config = getComponentConfig('AudioPlayer');
// chunkSize: Infinity (bez chunking)
// performanceLogging: true (vždy zapnuto)
```

### **3. CACHE PRELOADING**
```javascript
// Fixní chunk size pro cache
const chunkSize = 20; // Nezávislé na módu
```

---

## 🔧 CUSTOMIZACE

### **1. PŘIDÁNÍ NOVÉHO MÓDU**
```javascript
// src/config/performance.js
export const performanceConfig = {
  // ... existing configs
  staging: {
    chunkSize: 5,
    imageChunkSize: 3,
    longTaskThreshold: 120,
    performanceLogging: true,
    errorMonitoring: true,
    yieldTimeout: 0
  }
};
```

### **2. PŘIDÁNÍ NOVÉ KOMPONENTY**
```javascript
// src/config/performance.js
const componentConfigs = {
  // ... existing configs
  'NewComponent': {
    ...baseConfig,
    chunkSize: 10,
    performanceLogging: true
  }
};
```

### **3. DYNAMICKÉ PŘEPÍNÁNÍ**
```javascript
// V runtime
const config = getCurrentConfig();
config.chunkSize = 15; // Dynamická změna
```

---

## 📊 MONITORING A DEBUGGING

### **1. PERFORMANCE LOGGING**
```javascript
// src/services/logger.js
performance(metric, value, unit = 'ms') {
  if (this.isDevelopment) {
    console.log(`⚡ [PERF] ${metric}: ${value}${unit}`);
  }
}
```

### **2. CACHE STATISTICS**
```javascript
// Získání statistik cache
const stats = cacheService.getStats();
console.log('Cache hits:', stats.hits);
console.log('Cache misses:', stats.misses);
```

### **3. MEMORY MONITORING**
```javascript
// Automatické monitoring paměti
if (performance.memory) {
  const memoryUsage = performance.memory.usedJSHeapSize;
  if (memoryUsage > this.performanceThresholds.memoryWarning) {
    log.warn('High memory usage detected:', memoryUsage);
  }
}
```

---

## 🎯 DOPORUČENÍ

### **1. PRODUCTION OPTIMALIZACE**
- Používej větší chunk sizes
- Vypni performance logging
- Zapni error monitoring
- Minimalizuj yield timeouts

### **2. DEVELOPMENT DEBUGGING**
- Používej menší chunk sizes
- Zapni performance logging
- Vypni error monitoring
- Přidej yield timeouts

### **3. TESTING RYCHLOST**
- Používej velké chunk sizes
- Vypni všechno logging
- Minimalizuj všechny delays

**Datum analýzy:** ${new Date().toLocaleDateString('cs-CZ')}
**Analytik:** AI Assistant
**Verze:** 1.0.0
