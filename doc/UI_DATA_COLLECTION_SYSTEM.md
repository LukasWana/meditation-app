# UI Data Collection System

## Přehled

Implementoval jsem systém, který nejdříve načítá všechna data z UI aplikace, vytvoří strukturovaný JSON a uloží ho do localStorage pro rychlý přístup. Tím se eliminuje potřeba načítání dat z Firebase při každém spuštění.

## Problém, který řeší

**Původní problém:**
```
Predictive preloading for bez-slov, likely next: home, album-detail
useFirebaseHudbaScanner.js:118 No cached metadata for 00--00--00--00-generator.mp3, loading from Firebase
useFirebaseHudbaScanner.js:118 No cached metadata for 00--00--00--79-meditacie.mp3, loading from Firebase
```

**Řešení:**
- Nejdříve načte všechna data z UI aplikace
- Vytvoří strukturovaný JSON s kompletními informacemi
- Uloží do localStorage pro rychlý přístup
- Eliminuje Firebase loading při běžném používání

## Architektura

### 1. Hlavní komponenty

#### `uiDataCollector` Služba
- **Umístění**: `src/services/uiDataCollector.js`
- **Funkce**: Sběr dat z UI aplikace a vytvoření strukturovaného JSON
- **Vlastnosti**:
  - Načítá metadata ze statické služby
  - Extrahuje slova a hudba data
  - Vytváří alba z hudba dat
  - Ukládá do localStorage

#### `useSimplePreloader` Hook (aktualizovaný)
- **Umístění**: `src/hooks/useSimplePreloader.js`
- **Funkce**: Preloading s prioritou UI dat
- **Vlastnosti**:
  - Nejdříve načte UI data
  - Vytvoří strukturovaný JSON
  - Uloží do localStorage
  - Eliminuje Firebase loading

### 2. Proces sběru dat

```javascript
const preloadData = async () => {
  // 1. Inicializuj statickou metadata službu
  await staticMetadataService.initialize();

  // 2. Načti všechna data z UI aplikace a vytvoř strukturovaný JSON
  const structuredData = await uiDataCollector.collectAllUIData();

  // 3. Ulož strukturovaná data do localStorage
  uiDataCollector.saveStructuredData();

  // 4. Preload kritická data do cache
  await cacheService.preloadCriticalData();
};
```

### 3. Strukturovaná data

```javascript
{
  metadata: {
    "muzsky4FSK-uzkost-osamelost.mp3": { ... },
    "00--00--00--00-ambient1.mp3": { ... }
  },
  slova: [
    {
      fileName: "muzsky4FSK-uzkost-osamelost.mp3",
      title: "Mužský hlas - uzkost osamelost",
      gender: "male",
      topic: "uzkost osamelost",
      duration: "5:30",
      audioSrc: "...",
      isAvailable: true
    }
  ],
  hudba: [
    {
      fileName: "00--00--00--00- - Ambient Journey - 01 Zhooliox.mp3",
      title: "Zhooliox",
      album: "Ambient Journey",
      trackNumber: 1,
      duration: "4:15",
      audioSrc: "...",
      coverImage: "ambient-journey/Ambient Journey - cover.jpg",
      isAvailable: true
    }
  ],
  albums: [
    {
      name: "Ambient Journey",
      coverImage: "ambient-journey/Ambient Journey - cover.jpg",
      tracks: [...],
      totalDuration: "25:30"
    }
  ],
  lastUpdated: "2025-10-17T20:40:00.000Z",
  version: "1.0.0",
  generatedAt: "2025-10-17T20:40:00.000Z"
}
```

## Funkčnost

### 1. Sběr dat z UI

```javascript
// Extrahuje slova data z metadat
extractSlovaData(metadata) {
  const slovaItems = [];

  Object.entries(metadata).forEach(([fileName, data]) => {
    if (fileName.startsWith('muzsky') || fileName.startsWith('zensky')) {
      const parsed = this.parseSlovaFileName(fileName);
      if (parsed) {
        slovaItems.push({
          fileName,
          title: parsed.title,
          gender: parsed.gender,
          topic: parsed.topic,
          duration: data.duration || 'N/A',
          audioSrc: data.downloadURL || '',
          isAvailable: true,
          parsed
        });
      }
    }
  });

  return slovaItems;
}
```

### 2. Parsování názvů souborů

```javascript
// Parsuje název slova souboru
parseSlovaFileName(fileName) {
  // Formát: muzsky4FSK-uzkost-osamelost.mp3
  const match = fileName.match(/^(muzsky|zensky)(\d+)([A-Z]+)-(.+)\.mp3$/);
  if (!match) return null;

  const [, gender, number, type, topic] = match;

  return {
    gender: gender === 'muzsky' ? 'male' : 'female',
    number: parseInt(number),
    type,
    topic: topic.replace(/-/g, ' '),
    title: `${gender === 'muzsky' ? 'Mužský' : 'Ženský'} hlas - ${topic.replace(/-/g, ' ')}`
  };
}
```

### 3. Vytváření alb

```javascript
// Vytvoří alba z hudba dat
createAlbumsFromHudba(hudbaItems) {
  const albumsMap = new Map();

  hudbaItems.forEach(item => {
    const albumName = item.album || 'Unknown Album';

    if (!albumsMap.has(albumName)) {
      albumsMap.set(albumName, {
        name: albumName,
        coverImage: item.coverImage || '',
        tracks: [],
        totalDuration: 'N/A'
      });
    }

    albumsMap.get(albumName).tracks.push(item);
  });

  return Array.from(albumsMap.values());
}
```

### 4. Ukládání do localStorage

```javascript
// Uloží strukturovaná data do localStorage
saveStructuredData() {
  const dataToSave = {
    ...this.collectedData,
    version: '1.0.0',
    generatedAt: new Date().toISOString()
  };

  localStorage.setItem('ui_structured_data', JSON.stringify(dataToSave));
  console.log('💾 Structured data saved to localStorage');

  return dataToSave;
}
```

## Výhody

### 1. Rychlost
- **Okamžité načítání** - Data jsou v localStorage
- **Žádné Firebase dotazy** - Eliminuje network latency
- **Předpřipravená data** - Všechno je připravené před zobrazením

### 2. Efektivita
- **Jednorázový sběr** - Data se načtou jednou
- **Strukturovaný formát** - Snadný přístup k datům
- **Optimalizovaný cache** - Efektivní správa paměti

### 3. Robustnost
- **Offline funkčnost** - Funguje bez internetu
- **Fallback mechanismy** - Graceful degradation
- **Error recovery** - Aplikace pokračuje i při chybách

## Monitoring

### Debug panel (development)
V development módu se zobrazuje debug panel s:
- Metadata: ✅/⏳
- Slova: ✅/⏳
- Hudba: ✅/⏳
- Structured: ✅/⏳
- "No Firebase loading needed"

### Console logy
```javascript
console.log('🚀 Starting UI data collection and preloading...');
console.log('✅ Metadata service initialized');
console.log('✅ UI data collected and structured');
console.log('✅ Structured data saved to localStorage');
console.log('🎉 All UI data preloaded successfully - no Firebase loading needed');
```

## Použití

### 1. Automatické spuštění
Systém se spouští automaticky při startu aplikace:

```jsx
const { isPreloaded, preloadStatus } = useSimplePreloader();
```

### 2. Kontrola připravenosti dat
```jsx
const isHudbaReady = useDataReady('hudba');
const isSlovaReady = useDataReady('slova');
const isAllReady = useDataReady('all');
```

### 3. Přístup ke strukturovaným datům
```javascript
import { uiDataCollector } from '@services/uiDataCollector';

// Načti strukturovaná data
const structuredData = uiDataCollector.loadStructuredData();

// Získej slova data
const slovaItems = structuredData.slova;

// Získej hudba data
const hudbaItems = structuredData.hudba;

// Získej alba
const albums = structuredData.albums;
```

## Závěr

UI Data Collection System řeší problém s pomalým načítáním dat z Firebase tím, že:

1. **Nejdříve načte všechna data z UI aplikace** - Využívá existující metadata
2. **Vytvoří strukturovaný JSON** - Organizuje data do logických skupin
3. **Uloží do localStorage** - Zajišťuje rychlý přístup
4. **Eliminuje Firebase loading** - Aplikace funguje bez network dotazů

Aplikace nyní funguje s předpřipravenými daty, která jsou načtená z UI aplikace a uložená v strukturovaném formátu pro rychlý přístup! 🎉

