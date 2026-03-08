# 📊 ANALÝZA NÁČÍTÁNÍ DAT DO GUI

## 🎯 PŘEHLED ARCHITEKTURY

Tvá meditační aplikace používá **multi-vrstvý systém načítání dat** s několika fallback mechanismy pro zajištění rychlosti a spolehlivosti.

---

## 🔄 HLAVNÍ ZDROJE DAT

### **1. 📁 STATICKÁ DATA (Nejrychlejší)**
```javascript
// src/services/staticMetadataService.js
```
- **Zdroj:** Lokální JSON soubory v aplikaci
- **Obsah:** Pre-generovaná metadata všech audio souborů
- **Výhody:** Okamžitá dostupnost, offline funkčnost
- **Nevýhody:** Musí být aktualizována při změnách

### **2. 🔥 FIREBASE FIRESTORE (Rychlé)**
```javascript
// src/services/firestoreMetadataService.js
// Collection: 'audio-metadata'
```
- **Zdroj:** Cloud Firestore databáze
- **Obsah:** Metadata s download URL, délky, velikosti
- **Výhody:** Vždy aktuální data, rychlé dotazy
- **Nevýhody:** Vyžaduje internet, Firebase náklady

### **3. 🗄️ FIREBASE STORAGE (Pomalé)**
```javascript
// src/services/fastMetadataService.js
// src/hooks/useFirebaseHudbaScanner.js
```
- **Zdroj:** Firebase Storage bucket
- **Obsah:** Struktura složek, názvy souborů, metadata
- **Výhody:** Kompletní přehled všech souborů
- **Nevýhody:** Pomalé načítání, vysoké náklady

### **4. 💾 LOCAL STORAGE (Cache)**
```javascript
// Všechny metadata služby
```
- **Zdroj:** Browser localStorage
- **Obsah:** Cachovaná metadata pro offline použití
- **Výhody:** Rychlý přístup, offline funkčnost
- **Nevýhody:** Omezená velikost, může být zastaralá

---

## 🚀 PROCES INICIALIZACE APLIKACE

### **KROK 1: Spuštění aplikace**
```javascript
// src/App.jsx
function MeditationApp() {
  const [showIntro, setShowIntro] = useState(true);

  // Background data loader se spustí během intro animace
  useBackgroundDataLoader(showIntro);
}
```

### **KROK 2: Background načítání dat**
```javascript
// src/hooks/useBackgroundDataLoader.js
const loadDataInBackground = async () => {
  // 1. Statická metadata služba
  await staticMetadataService.initialize();

  // 2. Fast metadata service (Firebase Storage struktura)
  await fastMetadataService.initialize();

  // 3. Globální MP3 metadata preloader
  await globalMetadataPreloader.initialize();

  // 4. Preload kritická data do cache
  await cacheService.preloadCriticalData();
};
```

### **KROK 3: Hierarchie načítání**
```
1. localStorage cache (okamžitě)
   ↓ (pokud není dostupné)
2. Static JSON files (rychle)
   ↓ (pokud není dostupné)
3. Firestore database (středně rychle)
   ↓ (pokud není dostupné)
4. Firebase Storage (pomalu)
```

---

## 📋 DETALNÍ DATA FLOW

### **🎵 HUDBASCREEN DATA**
```javascript
// src/hooks/useOptimizedHudbaFilter.js
const loadMetadata = async () => {
  let allMetadata = {};

  // Nejdříve zkus Firestore
  try {
    allMetadata = await firestoreMetadataService.loadAllMetadata();
  } catch (firestoreError) {
    // Fallback na statická metadata
    await staticMetadataService.loadMetadata();
    allMetadata = staticMetadataService.getAllMetadata();
  }

  // Filtruj pouze hudba soubory
  const hudbaMetadata = Object.values(allMetadata).filter(
    meta => meta.folder === 'hudba'
  );

  setHudbaItems(hudbaMetadata);
};
```

### **📝 SLOVASCREEN DATA**
```javascript
// src/services/uiDataCollector.js
extractSlovaData(metadata) {
  const slovaItems = [];

  Object.values(metadata).forEach(meta => {
    if (meta.folder === 'slova') {
      slovaItems.push({
        fileName: meta.fileName,
        downloadURL: meta.downloadURL,
        duration: meta.duration,
        // ... další metadata
      });
    }
  });

  return slovaItems;
}
```

### **🎨 ALBUM DATA**
```javascript
// src/services/uiDataCollector.js
createAlbumsFromHudba(hudbaData) {
  const albums = {};

  hudbaData.forEach(item => {
    const albumName = item.albumName || 'Unknown Album';

    if (!albums[albumName]) {
      albums[albumName] = {
        name: albumName,
        songs: [],
        totalDuration: 0,
        coverImage: item.coverImage
      };
    }

    albums[albumName].songs.push(item);
    albums[albumName].totalDuration += item.duration || 0;
  });

  return Object.values(albums);
}
```

---

## ⚡ CACHE STRATEGIE

### **🎯 Multi-level Cache System**
```javascript
// src/services/cacheServiceRefactored.js
class CacheServiceRefactored {
  constructor() {
    this.audioCache = new AudioCache();      // Audio soubory
    this.metadataCache = new MetadataCache(); // Metadata
    this.firebaseCache = new FirebaseCache(); // Firebase queries
    this.imageCache = new ImageCache();       // Obrázky
  }
}
```

### **📊 Cache Priority**
1. **Memory Cache** - Nejrychlejší, dočasná
2. **LocalStorage Cache** - Rychlá, perzistentní
3. **Firebase Cache** - Střední rychlost, aktualizovaná
4. **Network Request** - Pomalá, nejnovější data

---

## 🔧 FALLBACK MECHANISMUS

### **🛡️ Robustní Error Handling**
```javascript
// Příklad z useOptimizedHudbaFilter.js
try {
  // Nejdříve zkus Firestore
  allMetadata = await firestoreMetadataService.loadAllMetadata();
} catch (firestoreError) {
  log.warn('⚠️ Firestore failed, falling back to static metadata');

  try {
    // Fallback na statická metadata
    await staticMetadataService.loadMetadata();
    allMetadata = staticMetadataService.getAllMetadata();
  } catch (staticError) {
    log.error('❌ Both Firestore and static metadata failed');
    throw new Error('Failed to load metadata from any source');
  }
}
```

---

## 📈 PERFORMANCE OPTIMALIZACE

### **🚀 Background Loading**
- Data se načítají během intro animace
- Non-blocking UI updates
- Chunked loading (po 20 položkách)
- Yield control back to browser

### **💾 Smart Caching**
- LRU cache pro metadata
- TTL (Time To Live) pro cache entries
- Automatic cleanup starých záznamů
- Compression pro localStorage

### **🔄 Predictive Loading**
- Preloading následujících obrazovek
- Lazy loading komponent
- Dynamic imports
- Service Worker caching

---

## 🎯 ZDROJE DAT PRO KONKRÉTNÍ OBRAZOVKY

### **🏠 HOME SCREEN**
- **Zdroj:** Statická metadata + cache
- **Data:** Přehled alb, statistiky, poslední přehrávání

### **🎵 HUDBASCREEN**
- **Zdroj:** useOptimizedHudbaFilter hook
- **Data:** Všechna hudba metadata, alba, délky

### **📝 SLOVASCREEN**
- **Zdroj:** uiDataCollector.extractSlovaData()
- **Data:** Všechna slova metadata, kategorie

### **🎨 ALBUM DETAIL**
- **Zdroj:** Hudba data filtrovaná podle alba
- **Data:** Písně v albu, cover image, celková délka

### **⚙️ SETTINGS SCREEN**
- **Zdroj:** localStorage preferences
- **Data:** Uživatelské nastavení, jazyk, hlas

---

## 🔍 MONITORING A DEBUGGING

### **📊 Real-time Monitoring**
```javascript
// src/components/MonitoringDashboard.jsx
const stats = {
  errors: errorHandler.getStats(),
  cache: optimizedCache.getStats(),
  performance: getPerformanceStats()
};
```

### **📝 Logging System**
```javascript
// src/services/logger.js
log.info('🚀 Loading metadata...');
log.success('✅ Metadata loaded successfully');
log.error('❌ Failed to load metadata');
```

---

## 🎯 SHRNUTÍ

**Tvá aplikace používá sofistikovaný multi-vrstvý systém načítání dat:**

1. **🚀 Rychlost:** Statická data → Firestore → Firebase Storage
2. **🛡️ Spolehlivost:** Multiple fallback mechanismy
3. **⚡ Performance:** Background loading, smart caching
4. **💾 Offline:** LocalStorage cache pro offline funkčnost
5. **📊 Monitoring:** Real-time metriky a error tracking

**Výsledek:** Aplikace se načte rychle, funguje offline a má robustní error handling pro všechny scénáře.
