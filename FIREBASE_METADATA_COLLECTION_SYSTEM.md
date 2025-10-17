# Firebase Metadata Collection System

## Přehled

Implementoval jsem systém pro načítání a ukládání metadat z Firebase MP3 souborů s inteligentním parsováním názvů souborů a automatickým tříděním do kategorií "slova" a "hudba".

## Problém, který řeší

**Původní problém:**
- Potřeba načítat metadata z Firebase Storage MP3 souborů
- Třídění souborů podle názvů do "slova" a "hudba"
- Pokud je název součástí metadat MP3, nemusíme parserovat
- Ukládání strukturovaných dat pro rychlý přístup

**Řešení:**
- Načte metadata z Firebase Storage
- Parsuje názvy souborů pomocí existujících parserů
- Třídí do kategorií "slova" a "hudba"
- Ukládá do cache a localStorage
- Vytváří alba z hudba dat

## Architektura

### 1. Hlavní komponenty

#### `firebaseMetadataCollector` Služba
- **Umístění**: `src/services/firebaseMetadataCollector.js`
- **Funkce**: Sběr metadat z Firebase Storage a jejich kategorizace
- **Vlastnosti**:
  - Skenuje Firebase Storage
  - Načítá metadata pro každý MP3 soubor
  - Parsuje názvy souborů
  - Třídí do "slova" a "hudba"
  - Vytváří alba

#### `useSimplePreloader` Hook (aktualizovaný)
- **Umístění**: `src/hooks/useSimplePreloader.js`
- **Funkce**: Preloading s Firebase metadata collection
- **Vlastnosti**:
  - Načte Firebase metadata
  - Uloží do cache a localStorage
  - Kombinuje s UI daty

### 2. Proces sběru metadat

```javascript
const preloadData = async () => {
  // 1. Inicializuj statickou metadata službu
  await staticMetadataService.initialize();

  // 2. Načti metadata z Firebase Storage a roztřiď je
  const firebaseMetadata = await firebaseMetadataCollector.collectAllFirebaseMetadata();

  // 3. Ulož Firebase metadata do cache a localStorage
  firebaseMetadataCollector.saveToCache();
  firebaseMetadataCollector.saveToLocalStorage();

  // 4. Načti všechna data z UI aplikace
  const structuredData = await uiDataCollector.collectAllUIData();

  // 5. Ulož strukturovaná data
  uiDataCollector.saveStructuredData();
};
```

### 3. Struktura metadat

```javascript
{
  slova: {
    "muzsky4FSK-uzkost-osamelost.mp3": {
      fileName: "muzsky4FSK-uzkost-osamelost.mp3",
      size: 1234567,
      contentType: "audio/mpeg",
      timeCreated: "2025-10-17T20:00:00.000Z",
      downloadURL: "https://...",
      estimatedDuration: "5:30",
      type: "slova",
      title: "Mužský hlas - uzkost osamelost",
      gender: "male",
      topic: "uzkost osamelost",
      artist: "Mužský hlas"
    }
  },
  hudba: {
    "00--00--00--00- - Ambient Journey - 01 Zhooliox.mp3": {
      fileName: "00--00--00--00- - Ambient Journey - 01 Zhooliox.mp3",
      size: 2345678,
      contentType: "audio/mpeg",
      timeCreated: "2025-10-17T20:00:00.000Z",
      downloadURL: "https://...",
      estimatedDuration: "4:15",
      type: "hudba",
      title: "Zhooliox",
      album: "Ambient Journey",
      trackNumber: 1,
      artist: "Ambient Artist"
    }
  },
  albums: {
    "Ambient Journey": {
      name: "Ambient Journey",
      coverImage: "ambient-journey/Ambient Journey - cover.jpg",
      tracks: [...],
      totalDuration: "25:30"
    }
  },
  lastUpdated: "2025-10-17T20:48:00.000Z",
  source: "firebase",
  version: "1.0.0"
}
```

## Funkčnost

### 1. Skenování Firebase Storage

```javascript
async scanFirebaseStorage() {
  const listRef = ref(storage, '');
  const result = await listAll(listRef);

  // Získej všechny soubory včetně podsložek
  const allFiles = [...result.items];

  // Prohledej podsložky
  for (const folderRef of result.prefixes) {
    const folderResult = await listAll(folderRef);
    folderResult.items.forEach(item => {
      allFiles.push({
        ...item,
        name: `${folderRef.name}/${item.name}`
      });
    });
  }

  return allFiles;
}
```

### 2. Načítání metadat souboru

```javascript
async collectFileMetadata(file) {
  // 1. Načti Firebase metadata
  const firebaseMetadata = await getMetadata(file);

  // 2. Načti download URL
  const downloadURL = await getDownloadURL(file);

  // 3. Vytvoř základní metadata objekt
  const metadata = {
    fileName: file.name,
    size: firebaseMetadata.size,
    contentType: firebaseMetadata.contentType,
    timeCreated: firebaseMetadata.timeCreated,
    downloadURL,
    estimatedDuration: this.estimateDuration(firebaseMetadata.size)
  };

  // 4. Pokud je název součástí metadat, použij ho
  if (firebaseMetadata.customMetadata && firebaseMetadata.customMetadata.title) {
    metadata.title = firebaseMetadata.customMetadata.title;
    metadata.type = firebaseMetadata.customMetadata.type;
    // ... další metadata
  }

  // 5. Pokud není název v metadatech, parsuj název souboru
  if (!metadata.type) {
    const parsed = this.parseFileName(file.name);
    if (parsed) {
      metadata.type = parsed.type;
      metadata.title = parsed.title;
      // ... další parsed data
    }
  }

  return { success: true, metadata };
}
```

### 3. Parsování názvů souborů

```javascript
parseFileName(fileName) {
  // Zkus slova parser (muzsky/zensky prefix)
  if (fileName.startsWith('muzsky') || fileName.startsWith('zensky')) {
    try {
      const parsed = parseAudioFileName(fileName);
      if (parsed) {
        return {
          type: 'slova',
          title: parsed.title,
          gender: parsed.gender,
          topic: parsed.topic,
          artist: parsed.gender === 'male' ? 'Mužský hlas' : 'Ženský hlas'
        };
      }
    } catch (err) {
      console.warn(`Failed to parse slova file ${fileName}:`, err.message);
    }
  }

  // Zkus hudba parser (00--00--00--00- prefix)
  if (fileName.startsWith('00--00--00--00-')) {
    try {
      const parsed = parseHudbaFileName(fileName);
      if (parsed) {
        return {
          type: 'hudba',
          title: parsed.title,
          album: parsed.album,
          trackNumber: parsed.trackNumber,
          artist: 'Ambient Artist'
        };
      }
    } catch (err) {
      console.warn(`Failed to parse hudba file ${fileName}:`, err.message);
    }
  }

  return null;
}
```

### 4. Třídění metadat

```javascript
categorizeMetadata(metadataResults) {
  metadataResults.forEach(result => {
    if (result.status === 'fulfilled' && result.value.success) {
      const metadata = result.value.metadata;

      if (metadata.type === 'slova') {
        this.collectedMetadata.slova.set(metadata.fileName, metadata);
      } else if (metadata.type === 'hudba') {
        this.collectedMetadata.hudba.set(metadata.fileName, metadata);
      }
    }
  });
}
```

### 5. Vytváření alb

```javascript
createAlbumsFromHudba() {
  const albumsMap = new Map();

  this.collectedMetadata.hudba.forEach((metadata, fileName) => {
    const albumName = metadata.album || 'Unknown Album';

    if (!albumsMap.has(albumName)) {
      albumsMap.set(albumName, {
        name: albumName,
        coverImage: this.getCoverImagePath(albumName),
        tracks: [],
        totalDuration: 'N/A'
      });
    }

    albumsMap.get(albumName).tracks.push(metadata);
  });

  // Seřaď tracky podle trackNumber
  albumsMap.forEach(album => {
    album.tracks.sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0));

    // Vypočti celkovou délku
    const durations = album.tracks
      .map(track => track.duration || track.estimatedDuration)
      .filter(duration => duration && duration !== 'N/A');

    if (durations.length > 0) {
      album.totalDuration = this.calculateTotalDuration(durations);
    }
  });

  this.collectedMetadata.albums = albumsMap;
}
```

### 6. Odhad délky audio

```javascript
estimateDuration(fileSizeBytes) {
  // Předpokládáme 128kbps bitrate pro MP3
  const bitrateKbps = 128;
  const bitrateBps = bitrateKbps * 1000 / 8; // Převod na bajty za sekundu
  const durationSeconds = fileSizeBytes / bitrateBps;

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.floor(durationSeconds % 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
```

## Výhody

### 1. Inteligentní parsování
- **Automatické rozpoznání typu** - Podle názvu souboru
- **Využití existujících parserů** - Slova a hudba parsery
- **Fallback na metadata** - Pokud je název v MP3 metadatech

### 2. Kompletní metadata
- **Firebase metadata** - Velikost, typ, datum vytvoření
- **Download URL** - Přímý odkaz na soubor
- **Odhad délky** - Na základě velikosti souboru
- **Parsed data** - Název, album, track number, atd.

### 3. Strukturované ukládání
- **Cache** - Rychlý přístup v paměti
- **localStorage** - Trvalé uložení
- **Kategorizace** - Slova, hudba, alba
- **Albums** - Automatické vytváření alb

## Monitoring

### Debug panel (development)
V development módu se zobrazuje:
- Static: ✅/⏳
- Firebase: ✅/⏳
- Slova: ✅/⏳
- Hudba: ✅/⏳
- Structured: ✅/⏳
- "Firebase metadata + UI data"

### Console logy
```javascript
console.log('🔄 Collecting metadata from Firebase Storage...');
console.log('📁 Found X files in Firebase Storage');
console.log('🎵 Found X MP3 files');
console.log('✅ Firebase metadata collected and categorized');
console.log('💾 Firebase metadata saved to cache and localStorage');
console.log('🎉 All data preloaded successfully - Firebase metadata + UI data');
```

## Použití

### 1. Automatické spuštění
Systém se spouští automaticky při startu aplikace:

```jsx
const { isPreloaded, preloadStatus } = useSimplePreloader();
```

### 2. Kontrola Firebase metadat
```jsx
const isFirebaseReady = useDataReady('firebase');
const isSlovaReady = useDataReady('slova');
const isHudbaReady = useDataReady('hudba');
```

### 3. Přístup k Firebase metadatům
```javascript
import { firebaseMetadataCollector } from '@services/firebaseMetadataCollector';

// Načti Firebase metadata
const firebaseData = firebaseMetadataCollector.loadFromLocalStorage();

// Získej slova metadata
const slovaMetadata = firebaseData.slova;

// Získej hudba metadata
const hudbaMetadata = firebaseData.hudba;

// Získej alba
const albums = firebaseData.albums;
```

## Závěr

Firebase Metadata Collection System řeší problém s načítáním a ukládáním metadat z Firebase MP3 souborů tím, že:

1. **Načte metadata z Firebase Storage** - Kompletní informace o souborech
2. **Parsuje názvy souborů** - Používá existující parsery pro slova a hudba
3. **Třídí do kategorií** - Automaticky rozpozná typ souboru
4. **Vytváří alba** - Organizuje hudba soubory do alb
5. **Ukládá strukturovaně** - Cache a localStorage pro rychlý přístup

Aplikace nyní načítá kompletní metadata z Firebase Storage, parsuje názvy souborů podle typu a ukládá je strukturovaně pro rychlý přístup! 🎉

