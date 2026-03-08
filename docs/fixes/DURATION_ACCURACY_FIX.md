# Duration Accuracy Fix

## Přehled

Opravil jsem problém s nepřesnými časy, které se zobrazovaly v UI, ale v přehrávači byla délka skladby správně. Problém byl v tom, že se používal odhad délky na základě velikosti souboru místo skutečné délky z přehrávače.

## Problém, který řeší

**Původní problém:**
- Zobrazovaly se časy, které neodpovídaly realitě
- V přehrávači byla délka skladby správně
- Používal se odhad délky na základě velikosti souboru (128kbps)
- Skutečná délka z přehrávače se nevyužívala

**Řešení:**
- Priorita skutečné délky z cache přehrávače
- Fallback na metadata duration
- Fallback na odhad pouze jako poslední možnost

## Identifikované problémy

### 1. Nesprávná priorita duration v `useFirebaseHudbaScanner`

**Problém:**
```javascript
// Špatně - používal se pouze odhad z metadat
const duration = cachedMetadata.duration || cachedMetadata.estimatedDuration || 'N/A';
```

**Řešení:**
```javascript
// Správně - nejdříve skutečná délka z přehrávače
let duration = 'N/A';

// 1. Zkus skutečnou délku z cache (z přehrávače)
const realDuration = cacheService.getDuration(cachedMetadata.downloadURL);
if (realDuration && realDuration > 0) {
  const minutes = Math.floor(realDuration / 60);
  const seconds = Math.floor(realDuration % 60);
  duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
} else {
  // 2. Fallback na metadata duration
  duration = cachedMetadata.duration || cachedMetadata.estimatedDuration || 'N/A';
}
```

### 2. Chybějící skutečná délka v `uiDataCollector`

**Problém:**
- `uiDataCollector` nepoužíval skutečnou délku z cache
- Používal pouze metadata duration

**Řešení:**
```javascript
// Přidaná metoda pro získání skutečné délky
getRealDuration(data) {
  if (data.downloadURL) {
    const realDuration = cacheService.getDuration(data.downloadURL);
    if (realDuration && realDuration > 0) {
      const minutes = Math.floor(realDuration / 60);
      const seconds = Math.floor(realDuration % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }
  return null;
}

// Použití skutečné délky
duration: this.getRealDuration(data) || data.duration || data.estimatedDuration || 'N/A'
```

## Implementované opravy

### 1. `useFirebaseHudbaScanner.js`

#### Opravené načítání duration z cache:
```javascript
// Použij duration z cache metadata - nejdříve skutečná délka z přehrávače
let duration = 'N/A';

// 1. Zkus skutečnou délku z cache (z přehrávače)
const realDuration = cacheService.getDuration(cachedMetadata.downloadURL);
if (realDuration && realDuration > 0) {
  const minutes = Math.floor(realDuration / 60);
  const seconds = Math.floor(realDuration % 60);
  duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
} else {
  // 2. Fallback na metadata duration
  duration = cachedMetadata.duration || cachedMetadata.estimatedDuration || 'N/A';
}
```

#### Opravené načítání duration ze Firebase:
```javascript
// Pokus se načíst metadata ze Firebase
let duration = 'N/A';
try {
  const firebaseMetadata = await getMetadata(fileRef);

  // 1. Zkus skutečnou délku z cache (z přehrávače)
  const realDuration = cacheService.getDuration(downloadURL);
  if (realDuration && realDuration > 0) {
    const minutes = Math.floor(realDuration / 60);
    const seconds = Math.floor(realDuration % 60);
    duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  } else if (firebaseMetadata.customMetadata && firebaseMetadata.customMetadata.duration) {
    // 2. Firebase custom metadata
    duration = firebaseMetadata.customMetadata.duration;
  } else {
    // 3. Odhad na základě velikosti souboru
    const estimatedDuration = estimateDuration(firebaseMetadata.size);
    duration = estimatedDuration;
  }
} catch (err) {
  console.warn(`Failed to get metadata for ${fileNameOnly}:`, err.message);
}
```

### 2. `uiDataCollector.js`

#### Přidaná metoda pro skutečnou délku:
```javascript
/**
 * Získá skutečnou délku z cache (z přehrávače)
 */
getRealDuration(data) {
  if (data.downloadURL) {
    const realDuration = cacheService.getDuration(data.downloadURL);
    if (realDuration && realDuration > 0) {
      const minutes = Math.floor(realDuration / 60);
      const seconds = Math.floor(realDuration % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }
  return null;
}
```

#### Aktualizované `extractSlovaData`:
```javascript
slovaItems.push({
  fileName,
  title: parsed.title,
  gender: parsed.gender,
  topic: parsed.topic,
  duration: this.getRealDuration(data) || data.duration || data.estimatedDuration || 'N/A',
  audioSrc: data.downloadURL || '',
  isAvailable: true,
  parsed
});
```

#### Aktualizované `extractHudbaData`:
```javascript
hudbaItems.push({
  fileName,
  title: parsed.title,
  album: parsed.album,
  trackNumber: parsed.trackNumber,
  duration: this.getRealDuration(data) || data.duration || data.estimatedDuration || 'N/A',
  audioSrc: data.downloadURL || '',
  coverImage: parsed.coverImage || '',
  isAvailable: true,
  parsed
});
```

## Priorita načítání duration

### 1. Skutečná délka z přehrávače (nejvyšší priorita)
- Načte se z `cacheService.getDuration(downloadURL)`
- Je to skutečná délka z audio elementu
- Nejpřesnější hodnota

### 2. Metadata duration (střední priorita)
- `cachedMetadata.duration` nebo `firebaseMetadata.customMetadata.duration`
- Může být přesná, pokud je správně uložena
- Druhá nejlepší možnost

### 3. Odhad na základě velikosti (nejnižší priorita)
- `estimatedDuration` nebo `estimateDuration(fileSize)`
- Používá se pouze jako poslední možnost
- Může být nepřesný

## Výhody oprav

### 1. Přesnost
- **Skutečná délka** - Používá se délka z audio elementu
- **Konzistence** - Stejná délka v UI i přehrávači
- **Spolehlivost** - Nezávisí na odhadech

### 2. Performance
- **Cache first** - Rychlý přístup k skutečné délce
- **Fallback mechanismy** - Graceful degradation
- **Minimální network calls** - Používá cache

### 3. UX
- **Správné zobrazování** - Duration odpovídá realitě
- **Konzistentní UI** - Stejné hodnoty všude
- **Spolehlivost** - Uživatel vidí správné časy

## Testování

### 1. Test skutečné délky z cache
```javascript
// Test: Skutečná délka z přehrávače
const realDuration = cacheService.getDuration(downloadURL);
if (realDuration && realDuration > 0) {
  const minutes = Math.floor(realDuration / 60);
  const seconds = Math.floor(realDuration % 60);
  const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  console.log('Real duration from player:', duration);
}
```

### 2. Test fallback mechanismů
```javascript
// Test: Fallback na metadata
const metadataDuration = cachedMetadata.duration || cachedMetadata.estimatedDuration;
console.log('Metadata duration:', metadataDuration);

// Test: Fallback na odhad
const estimatedDuration = estimateDuration(fileSize);
console.log('Estimated duration:', estimatedDuration);
```

### 3. Test UI zobrazování
```javascript
// Test: Zobrazování v UI
{item.type === 'hudba' && item.duration && (
  <p className="text-sm text-gray-500 mt-1">
    {item.duration} {/* Nyní skutečná délka */}
  </p>
)}
```

## Závěr

Duration Accuracy Fix řeší problém s nepřesnými časy v UI tím, že:

1. **Prioritizuje skutečnou délku** - Používá délku z audio elementu
2. **Implementuje fallback mechanismy** - Cache → Metadata → Estimation
3. **Zajišťuje konzistenci** - Stejná délka v UI i přehrávači
4. **Zlepšuje UX** - Uživatel vidí správné časy

Aplikace nyní zobrazuje přesné časy, které odpovídají skutečné délce skladeb! 🎉

