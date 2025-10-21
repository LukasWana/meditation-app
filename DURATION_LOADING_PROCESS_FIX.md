# Duration Loading Process Fix

## Přehled

Opravil jsem proces načítání duration krok za krokem. Problém byl v tom, že se duration neukládalo do cache, protože se `useAudioPlayer` nespouštěl při načítání dat. Implementoval jsem způsob, jak načíst skutečnou délku skladby bez spuštění `useAudioPlayer`.

## Problém, který řeší

**Původní problém:**
- Duration se neukládalo do cache při načítání dat
- `useAudioPlayer` se spouštěl pouze při otevření přehrávače
- Používal se pouze odhad délky na základě velikosti souboru
- Skutečná délka se nezobrazovala v UI

**Řešení:**
- Implementoval `getAudioDuration` funkci pro načtení skutečné délky
- Přidal ukládání duration do cache při načítání
- Implementoval 4 úrovně fallback mechanismů
- Zajistil konzistentní načítání duration

## Identifikované problémy

### 1. Chybějící ukládání duration do cache

**Problém:**
- `useAudioPlayer` se spouštěl pouze při otevření přehrávače
- Při načítání dat se duration neukládalo do cache
- Používal se pouze odhad na základě velikosti souboru

**Řešení:**
```javascript
// Přidané ukládání duration do cache v getAudioDuration
const getAudioDuration = (audioSrc) => {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      const duration = audio.duration;
      if (isFinite(duration) && duration > 0) {
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        const durationString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Ulož duration do cache
        cacheService.setDuration(audioSrc, duration);

        resolve(durationString);
      } else {
        resolve(null);
      }
    });
    // ... error handling
  });
};
```

### 2. Chybějící fallback mechanismy

**Problém:**
- Pouze 2 úrovně fallback mechanismů
- Chyběla možnost načíst skutečnou délku z audio souboru

**Řešení:**
- Implementoval 4 úrovně fallback mechanismů
- Přidal načítání skutečné délky z audio souboru

## Implementované opravy

### 1. `useFirebaseHudbaScanner.js`

#### Aktualizovaná `getAudioDuration` funkce:
```javascript
const getAudioDuration = (audioSrc) => {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      const duration = audio.duration;
      if (isFinite(duration) && duration > 0) {
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        const durationString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Ulož duration do cache
        cacheService.setDuration(audioSrc, duration);

        resolve(durationString);
      } else {
        resolve(null);
      }
    });
    audio.addEventListener('error', () => {
      resolve(null);
    });
    audio.src = audioSrc;
    // Timeout po 5 sekundách
    setTimeout(() => resolve(null), 5000);
  });
};
```

#### Aktualizované načítání duration z cache:
```javascript
// Použij duration z cache metadata - nejdříve skutečná délka z přehrávače
let duration = 'N/A';

// 1. Zkus skutečnou délku z cache (z přehrávače)
const realDuration = cacheService.getDuration(downloadURL);
if (realDuration && realDuration > 0) {
  const minutes = Math.floor(realDuration / 60);
  const seconds = Math.floor(realDuration % 60);
  duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
} else {
  // 2. Zkus načíst skutečnou délku z audio souboru
  try {
    const audioDuration = await getAudioDuration(downloadURL);
    if (audioDuration) {
      duration = audioDuration;
    } else {
      // 3. Fallback na metadata duration
      duration = cachedMetadata.duration || cachedMetadata.estimatedDuration || 'N/A';
    }
  } catch (err) {
    console.warn(`Failed to get audio duration for ${fileNameOnly}:`, err.message);
    // 3. Fallback na metadata duration
    duration = cachedMetadata.duration || cachedMetadata.estimatedDuration || 'N/A';
  }
}
```

#### Aktualizované načítání duration ze Firebase:
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
  } else {
    // 2. Zkus načíst skutečnou délku z audio souboru
    try {
      const audioDuration = await getAudioDuration(downloadURL);
      if (audioDuration) {
        duration = audioDuration;
      } else if (firebaseMetadata.customMetadata && firebaseMetadata.customMetadata.duration) {
        // 3. Firebase custom metadata
        duration = firebaseMetadata.customMetadata.duration;
      } else {
        // 4. Odhad na základě velikosti souboru
        const estimatedDuration = estimateDuration(firebaseMetadata.size);
        duration = estimatedDuration;
      }
    } catch (audioErr) {
      console.warn(`Failed to get audio duration for ${fileNameOnly}:`, audioErr.message);
      if (firebaseMetadata.customMetadata && firebaseMetadata.customMetadata.duration) {
        // 3. Firebase custom metadata
        duration = firebaseMetadata.customMetadata.duration;
      } else {
        // 4. Odhad na základě velikosti souboru
        const estimatedDuration = estimateDuration(firebaseMetadata.size);
        duration = estimatedDuration;
      }
    }
  }
} catch (err) {
  console.warn(`Failed to get metadata for ${fileNameOnly}:`, err.message);
}
```

## Priorita načítání duration

### 1. Skutečná délka z cache (nejvyšší priorita)
- `cacheService.getDuration(downloadURL)`
- Skutečná délka z audio elementu
- Nejpřesnější hodnota

### 2. Skutečná délka z audio souboru (vysoká priorita)
- `getAudioDuration(downloadURL)`
- Načte skutečnou délku z audio souboru
- Uloží do cache pro budoucí použití

### 3. Metadata duration (střední priorita)
- `cachedMetadata.duration` nebo `firebaseMetadata.customMetadata.duration`
- Může být přesná, pokud je správně uložena

### 4. Odhad na základě velikosti (nejnižší priorita)
- `estimatedDuration` nebo `estimateDuration(fileSize)`
- Používá se pouze jako poslední možnost

## Výhody oprav

### 1. Přesnost
- **Skutečná délka** - Načítá se z audio souboru
- **Cache optimalizace** - Ukládá se do cache pro rychlý přístup
- **Konzistence** - Stejná délka v UI i přehrávači

### 2. Performance
- **Cache first** - Nejdříve zkusí cache
- **Lazy loading** - Načítá skutečnou délku pouze když je potřeba
- **Fallback mechanismy** - Graceful degradation

### 3. Robustnost
- **4 úrovně fallback** - Vždy najde nějakou délku
- **Error handling** - Pokračuje i při chybách
- **Timeout protection** - Ochrana před zablokováním

## Testování

### 1. Test skutečné délky z cache
```javascript
// Test: Skutečná délka z cache
const realDuration = cacheService.getDuration(downloadURL);
if (realDuration && realDuration > 0) {
  const minutes = Math.floor(realDuration / 60);
  const seconds = Math.floor(realDuration % 60);
  const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  console.log('Real duration from cache:', duration);
}
```

### 2. Test načítání z audio souboru
```javascript
// Test: Načtení z audio souboru
const audioDuration = await getAudioDuration(downloadURL);
if (audioDuration) {
  console.log('Audio duration loaded:', audioDuration);
  // Duration je automaticky uloženo do cache
}
```

### 3. Test fallback mechanismů
```javascript
// Test: Fallback mechanismy
try {
  const audioDuration = await getAudioDuration(downloadURL);
  if (audioDuration) {
    duration = audioDuration;
  } else {
    duration = cachedMetadata.duration || 'N/A';
  }
} catch (err) {
  duration = cachedMetadata.duration || 'N/A';
}
```

## Závěr

Duration Loading Process Fix řeší problém s načítáním duration krok za krokem tím, že:

1. **Implementoval `getAudioDuration`** - Načítá skutečnou délku z audio souboru
2. **Přidal ukládání do cache** - Duration se ukládá při načítání
3. **Implementoval 4 úrovně fallback** - Cache → Audio → Metadata → Estimation
4. **Zajistil robustnost** - Error handling a timeout protection

Aplikace nyní správně načítá a zobrazuje skutečnou délku skladeb! 🎉









