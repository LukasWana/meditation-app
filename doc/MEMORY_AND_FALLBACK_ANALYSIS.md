# 🧠 ANALÝZA NÁČÍTÁNÍ DO PAMĚTI A FALLBACK MECHANISMŮ

## 🎯 CO SE NAČÍTÁ DO PAMĚTI

### **1. 📊 METADATA CACHE (Hlavní paměť)**
```javascript
// src/services/cacheServiceRefactored.js
class CacheServiceRefactored {
  constructor() {
    this.audioCache = new AudioCache();           // Download URL cache
    this.metadataCache = new MetadataCache();     // Metadata cache
    this.firebaseQueryCache = new FirebaseQueryCache(); // Firebase queries
    this.imageCache = new ImageCache();           // Cover images
  }
}
```

**Co se ukládá:**
- **Download URL** pro každý audio soubor
- **Metadata** (délka, název, velikost, typ)
- **Firebase query výsledky** (struktura složek)
- **Cover images** (album obrázky)

### **2. 🎵 AUDIO METADATA (Map struktura)**
```javascript
// src/services/globalMetadataPreloader.js
this.metadata = new Map(); // Všechna metadata v paměti

// Každý soubor:
this.metadata.set(fileName, {
  duration: audio.duration,           // Skutečná délka
  durationFormatted: '5:30',         // Formátovaná délka
  title: 'Meditation Title',         // Název
  downloadURL: 'https://...',        // Download URL
  folder: 'slova',                   // Složka
  subFolder: 'SK',                   // Podsložka
  size: 1234567,                     // Velikost v bytech
  loaded: true                       // Status načtení
});
```

### **3. 🗂️ SLOVA DATA SERVICE (Předpřipravená data)**
```javascript
// src/services/slovaDataService.js
this.slovaData = {
  sk: { male: [], female: [], all: [] },    // Slovenské meditace
  cz: { male: [], female: [], all: [] },    // České meditace
  en: { male: [], female: [], all: [] }     // Anglické meditace
};

// Každá položka obsahuje:
{
  fileName: 'muzsky4MSK-uzkost.mp3',
  audioSrc: 'https://firebase...',
  title: 'Úzkost - Mužský hlas',
  duration: '5:30',
  gender: 'male',
  topic: 'uzkost',
  mediaType: '4M',
  allFiles: [...] // Všechny varianty pro dané téma
}
```

### **4. 🎵 HUDBASCREEN DATA (Album struktura)**
```javascript
// src/services/fastMetadataService.js
this.metadata = new Map(); // Hudba metadata

// Album struktura:
{
  fileName: 'ambient-journey/track1.mp3',
  albumName: 'ambient-journey',
  trackName: 'Track 1',
  isAlbum: true,
  isHudba: true,
  downloadURL: 'https://...',
  coverImage: 'https://...'
}
```

---

## 📦 BATCH PROCESSING - NAČÍTÁNÍ PO DÁVKÁCH

### **1. METADATA BATCH LOADING**
```javascript
// src/services/mp3MetadataExtractor.js
async loadMetadataBatch(files, batchSize = 3) {
  const results = [];

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);

    // Zpracuj dávku paralelně
    const batchPromises = batch.map(file =>
      this.extractMetadata(file.downloadURL, file.fileName)
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Pauza mezi dávkami (100ms)
    if (i + batchSize < files.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}
```

### **2. CACHE CHUNK LOADING**
```javascript
// src/services/cacheServiceRefactored.js
async preloadCriticalData() {
  const entries = Object.entries(allMetadata);
  const chunkSize = 20; // Načti po 20 položkách

  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize);

    // Ulož chunk do cache
    this.metadataCache.setMetadataBatch(chunk);

    // Yield control back to browser
    if (i + chunkSize < entries.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}
```

### **3. IMAGE BATCH PROCESSING**
```javascript
// src/services/fastMetadataService.js
// Nejdříve zpracuj cover obrázky pro lepší UX
for (const file of imageFiles) {
  const metadata = await this.createImageMetadata(file);
  this.metadata.set(file.name, metadata);
}

// Pak zpracuj MP3 soubory
for (const file of mp3Files) {
  const metadata = await this.createMetadataFromFile(file);
  this.metadata.set(file.name, metadata);
}
```

---

## 🛡️ FALLBACK MECHANISMY - OFFLINE FUNKČNOST

### **1. HIERARCHIE ZDROJŮ DAT**
```javascript
// src/services/unifiedMetadataService.js
async getMetadata(fileName) {
  // 1. Memory cache (nejrychlejší)
  if (this.cache.has(fileName)) {
    return this.cache.get(fileName);
  }

  // 2. LocalStorage cache (offline)
  if (this.loadFromLocalCache() && this.cache.has(fileName)) {
    return this.cache.get(fileName);
  }

  // 3. Firestore (online)
  const firestoreMetadata = await this.getFromFirestore(fileName);
  if (firestoreMetadata) {
    this.cache.set(fileName, firestoreMetadata);
    return firestoreMetadata;
  }

  // 4. MP3 extraction (lazy loading)
  const mp3Metadata = await this.extractMP3MetadataLazy(fileName);
  if (mp3Metadata) {
    this.cache.set(fileName, mp3Metadata);
    return mp3Metadata;
  }

  return null; // Všechny zdroje selhaly
}
```

### **2. STATIC JSON FALLBACK**
```javascript
// src/services/staticMetadataService.js
async loadMetadata() {
  try {
    // Zkus načíst z JSON souboru
    const response = await fetch('/audio-metadata.json');
    const metadata = await response.json();

    this.metadata = metadata;
    this.cache = new Map(Object.entries(metadata));

    // Ulož do localStorage pro offline
    this.saveToLocalCache();

    return metadata;
  } catch (error) {
    // Fallback na local cache
    if (this.loadFromLocalCache()) {
      return this.metadata;
    }
    throw error;
  }
}
```

### **3. FIRESTORE FALLBACK**
```javascript
// src/services/firestoreMetadataService.js
async loadAllMetadata() {
  try {
    // Načti z Firestore
    const querySnapshot = await getDocs(q);
    const metadata = {};

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      metadata[data.fileName] = data;
      this.cache.set(data.fileName, data);
    });

    // Ulož do localStorage pro offline
    this.saveToLocalCache();

    return metadata;
  } catch (error) {
    // Fallback na local cache
    if (this.loadFromLocalCache()) {
      return Object.fromEntries(this.cache);
    }
    throw error;
  }
}
```

### **4. AUDIO URL FALLBACK**
```javascript
// src/features/audio/hooks/useFirebaseAudio.js
const loadAudioUrl = async () => {
  try {
    // Zkus Firebase Storage
    const audioRef = ref(storage, audioFileName);
    const url = await getDownloadURL(audioRef);

    cacheService.setAudioUrl(audioFileName, url);
    setAudioUrl(url);
  } catch (err) {
    // Fallback na lokální soubor
    const fallbackUrl = `/media/${audioFileName}`;
    setAudioUrl(fallbackUrl);
  }
};
```

### **5. SERVICE WORKER OFFLINE**
```javascript
// src/services/serviceWorker.js
function checkValidServiceWorker(swUrl) {
  fetch(swUrl)
    .then((response) => {
      if (response.status === 404) {
        // Service Worker není dostupný
        registerValidSW(swUrl);
      }
    })
    .catch(() => {
      console.log('🌐 No internet connection. App is running in offline mode.');
    });
}
```

---

## 📊 PAMĚŤOVÉ NÁROKY

### **1. METADATA CACHE**
- **Velikost:** ~50-100KB pro 100 souborů
- **Obsah:** Názvy, délky, URL, typy
- **Životnost:** Po dobu session

### **2. AUDIO URL CACHE**
- **Velikost:** ~10-20KB pro 100 souborů
- **Obsah:** Download URL pro každý soubor
- **Životnost:** Po dobu session

### **3. SLOVA DATA SERVICE**
- **Velikost:** ~30-50KB pro všechny jazyky
- **Obsah:** Předpřipravená filtrovaná data
- **Životnost:** Po dobu session

### **4. LOCAL STORAGE**
- **Velikost:** ~200-500KB
- **Obsah:** Všechna metadata pro offline
- **Životnost:** Trvalá (do vyčištění)

---

## ⚡ OPTIMALIZACE PAMĚTI

### **1. CHUNK LOADING**
- Načítání po 20 položkách
- Yield control pro plynulé UI
- Non-blocking processing

### **2. LAZY LOADING**
- Metadata se načítají až při potřebě
- MP3 soubory až při přehrávání
- Cover images až při zobrazení

### **3. CACHE LIMITS**
```javascript
// src/services/cache/BaseCache.js
constructor(name, maxSize = 100, ttl = 60 * 60 * 1000) {
  this.maxSize = maxSize;  // Maximální počet položek
  this.ttl = ttl;          // Time to live (1 hodina)
}
```

### **4. MEMORY CLEANUP**
```javascript
// Automatické vyčištění starých položek
if (Date.now() - entry.timestamp > entry.ttl) {
  this.cache.delete(key);
}
```

---

## 🎯 CELKOVÉ HODNOCENÍ

### ✅ **POZITIVA:**
1. **Efektivní batch processing** - načítání po dávkách
2. **Robustní fallback systém** - 4 úrovně fallback
3. **Offline funkčnost** - LocalStorage cache
4. **Memory management** - TTL a size limits
5. **Progressive loading** - chunk loading

### ⚠️ **MOŽNÉ PROBLÉMY:**
1. **Memory usage** - všechna metadata v paměti
2. **Cache staleness** - data mohou být zastaralá
3. **Initial loading time** - může být pomalý
4. **Storage limits** - LocalStorage má limity

### 🔧 **DOPORUČENÍ:**
1. **Implementovat cache invalidation**
2. **Přidat memory monitoring**
3. **Optimalizovat batch sizes**
4. **Přidat cache compression**

**Datum analýzy:** ${new Date().toLocaleDateString('cs-CZ')}
**Analytik:** AI Assistant
**Verze:** 1.0.0
