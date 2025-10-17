# Duration Fix System

## Přehled

Opravil jsem problém se ztrácením informací o celkovém čase MP3 v kategorii hudba. Problém byl v nesprávném načítání a zpracování duration metadat z Firebase Storage.

## Problém, který řeší

**Původní problém:**
- Informace o celkovém čase MP3 se ztrácely v kategorii hudba
- Duration se nezobrazovalo správně v UI
- Nesprávné zpracování `estimatedDuration` vs `duration` polí

**Řešení:**
- Opravil načítání duration z Firebase metadat
- Sjednotil zpracování `duration` a `estimatedDuration` polí
- Přidal fallback mechanismy pro načítání duration

## Identifikované problémy

### 1. Nesprávné zpracování duration v `useFirebaseHudbaScanner`

**Problém:**
```javascript
// Špatně - estimatedDuration je už string, ale pokoušel se z něj vytvářet string
const duration = cachedMetadata.estimatedDuration
  ? `${Math.floor(cachedMetadata.estimatedDuration / 60)}:${(cachedMetadata.estimatedDuration % 60).toString().padStart(2, '0')}`
  : 'N/A';
```

**Řešení:**
```javascript
// Správně - estimatedDuration je už string
const duration = cachedMetadata.duration || cachedMetadata.estimatedDuration || 'N/A';
```

### 2. Chybějící duration v `firebaseMetadataCollector`

**Problém:**
- Vytvářel pouze `estimatedDuration` pole
- Chyběl `duration` pole pro kompatibilitu

**Řešení:**
```javascript
const metadata = {
  fileName: file.name,
  size: firebaseMetadata.size,
  contentType: firebaseMetadata.contentType,
  timeCreated: firebaseMetadata.timeCreated,
  updated: firebaseMetadata.updated,
  downloadURL,
  // Přidal obě pole pro kompatibilitu
  duration: this.estimateDuration(firebaseMetadata.size),
  estimatedDuration: this.estimateDuration(firebaseMetadata.size)
};
```

### 3. Chybějící fallback pro načítání duration ze Firebase

**Problém:**
- Pokud metadata nebyly v cache, duration se nastavovalo na 'N/A'
- Chyběl mechanismus pro načítání duration přímo ze Firebase

**Řešení:**
```javascript
if (!cachedMetadata) {
  // Pokus se načíst metadata ze Firebase
  let duration = 'N/A';
  try {
    const firebaseMetadata = await getMetadata(fileRef);
    if (firebaseMetadata.customMetadata && firebaseMetadata.customMetadata.duration) {
      duration = firebaseMetadata.customMetadata.duration;
    } else {
      // Odhad na základě velikosti souboru
      const estimatedDuration = estimateDuration(firebaseMetadata.size);
      duration = estimatedDuration;
    }
  } catch (err) {
    console.warn(`Failed to get metadata for ${fileNameOnly}:`, err.message);
  }
}
```

## Implementované opravy

### 1. `useFirebaseHudbaScanner.js`

#### Přidané importy:
```javascript
import { ref, listAll, getDownloadURL, getMetadata } from 'firebase/storage';
```

#### Přidaná `estimateDuration` funkce:
```javascript
const estimateDuration = (fileSizeBytes) => {
  // Předpokládáme 128kbps bitrate pro MP3
  const bitrateKbps = 128;
  const bitrateBps = bitrateKbps * 1000 / 8; // Převod na bajty za sekundu
  const durationSeconds = fileSizeBytes / bitrateBps;

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.floor(durationSeconds % 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
```

#### Opravené načítání duration z cache:
```javascript
// Použij duration z cache metadata
const duration = cachedMetadata.duration || cachedMetadata.estimatedDuration || 'N/A';
```

#### Přidaný fallback pro Firebase metadata:
```javascript
if (!cachedMetadata) {
  // Pokus se načíst metadata ze Firebase
  let duration = 'N/A';
  try {
    const firebaseMetadata = await getMetadata(fileRef);
    if (firebaseMetadata.customMetadata && firebaseMetadata.customMetadata.duration) {
      duration = firebaseMetadata.customMetadata.duration;
    } else {
      // Odhad na základě velikosti souboru
      const estimatedDuration = estimateDuration(firebaseMetadata.size);
      duration = estimatedDuration;
    }
  } catch (err) {
    console.warn(`Failed to get metadata for ${fileNameOnly}:`, err.message);
  }
}
```

### 2. `firebaseMetadataCollector.js`

#### Přidané duration pole:
```javascript
const metadata = {
  fileName: file.name,
  size: firebaseMetadata.size,
  contentType: firebaseMetadata.contentType,
  timeCreated: firebaseMetadata.timeCreated,
  updated: firebaseMetadata.updated,
  downloadURL,
  // Přidal obě pole pro kompatibilitu
  duration: this.estimateDuration(firebaseMetadata.size),
  estimatedDuration: this.estimateDuration(firebaseMetadata.size)
};
```

## Výhody oprav

### 1. Konzistentní duration
- **Jednotné zpracování** - Všechny duration hodnoty se zpracovávají stejně
- **Fallback mechanismy** - Pokud jedna metoda selže, zkusí se jiná
- **Kompatibilita** - Podporuje jak `duration` tak `estimatedDuration` pole

### 2. Robustní načítání
- **Cache first** - Nejdříve zkusí cache
- **Firebase fallback** - Pokud cache selže, načte ze Firebase
- **Estimation fallback** - Pokud ani Firebase nemá duration, odhadne na základě velikosti

### 3. Lepší UX
- **Správné zobrazování** - Duration se zobrazuje v UI
- **Rychlé načítání** - Cache zajišťuje rychlý přístup
- **Graceful degradation** - Aplikace funguje i při chybách

## Testování

### 1. Cache metadata
```javascript
// Test: Duration z cache
const cachedMetadata = cacheService.getMetadata(fileName);
const duration = cachedMetadata.duration || cachedMetadata.estimatedDuration || 'N/A';
console.log('Duration from cache:', duration);
```

### 2. Firebase metadata
```javascript
// Test: Duration ze Firebase
const firebaseMetadata = await getMetadata(fileRef);
if (firebaseMetadata.customMetadata && firebaseMetadata.customMetadata.duration) {
  duration = firebaseMetadata.customMetadata.duration;
} else {
  duration = estimateDuration(firebaseMetadata.size);
}
console.log('Duration from Firebase:', duration);
```

### 3. UI zobrazování
```javascript
// Test: Zobrazování v UI
{item.type === 'hudba' && item.duration && (
  <p className="text-sm text-gray-500 mt-1">
    {item.duration}
  </p>
)}
```

## Závěr

Duration Fix System řeší problém se ztrácením informací o celkovém čase MP3 v kategorii hudba tím, že:

1. **Opravil zpracování duration** - Správně načítá `duration` a `estimatedDuration` pole
2. **Přidal fallback mechanismy** - Cache → Firebase → Estimation
3. **Sjednotil formát** - Všechny duration hodnoty jsou ve formátu "MM:SS"
4. **Zajistil kompatibilitu** - Funguje s existujícími i novými metadaty

Aplikace nyní správně zobrazuje informace o celkovém čase MP3 v kategorii hudba! 🎉

