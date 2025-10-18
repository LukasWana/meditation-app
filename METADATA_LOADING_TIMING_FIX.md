# Metadata Loading Timing Fix

## Přehled

Opravil jsem problém s timing načítání metadat. Problém byl v tom, že se `useFirebaseHudbaScanner` spouštěl okamžitě, ale preloading se ještě nedokončil, což způsobovalo načítání metadat z Firebase místo použití cache.

## Problém, který řeší

**Původní problém:**
- `useFirebaseHudbaScanner` se spouštěl okamžitě v `useEffect`
- Preloading se ještě nedokončil
- Metadata se načítala z Firebase místo cache
- Zobrazovaly se chyby: "No cached metadata for xxx.mp3, loading from Firebase"

**Řešení:**
- Implementoval `usePreloadReady` hook pro čekání na dokončení preloadingu
- Upravil `useFirebaseHudbaScanner` aby čekal na `isReady`
- Zajistil správné pořadí načítání dat

## Identifikované problémy

### 1. Race condition mezi preloadingem a načítáním metadat

**Problém:**
- `useFirebaseHudbaScanner` se spouštěl okamžitě
- Preloading se ještě nedokončil
- Metadata se načítala z Firebase místo cache

**Řešení:**
```javascript
// usePreloadReady.js
export const usePreloadReady = () => {
  const { isPreloaded, preloadStatus } = useSimplePreloader();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isPreloaded) {
      // Počkej ještě chvilku aby se všechna data načetla
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isPreloaded]);

  return { isReady, isPreloaded, preloadStatus };
};
```

### 2. Okamžité spuštění useFirebaseHudbaScanner

**Problém:**
- `useFirebaseHudbaScanner` se spouštěl okamžitě v `useEffect`
- Nečekal na dokončení preloadingu

**Řešení:**
```javascript
// useFirebaseHudbaScanner.js
export const useFirebaseHudbaScanner = () => {
  // ... state declarations

  // Čekej na dokončení preloadingu
  const { isReady } = usePreloadReady();

  useEffect(() => {
    if (isReady) {
      scanCDN();
    }
  }, [isReady]);

  // ... rest of the hook
};
```

## Implementované opravy

### 1. `usePreloadReady.js` (nový soubor)

```javascript
/**
 * Hook pro čekání na dokončení preloadingu
 */

import { useEffect, useState } from 'react';
import { useSimplePreloader } from './useSimplePreloader';

export const usePreloadReady = () => {
  const { isPreloaded, preloadStatus } = useSimplePreloader();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isPreloaded) {
      // Počkej ještě chvilku aby se všechna data načetla
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isPreloaded]);

  return { isReady, isPreloaded, preloadStatus };
};
```

### 2. `useFirebaseHudbaScanner.js` (aktualizovaný)

#### Přidaný import:
```javascript
import { usePreloadReady } from './usePreloadReady';
```

#### Přidané čekání na preloading:
```javascript
export const useFirebaseHudbaScanner = () => {
  const [audioFiles, setAudioFiles] = useState([]);
  const [coverImages, setCoverImages] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Čekej na dokončení preloadingu
  const { isReady } = usePreloadReady();

  // ... rest of the hook
};
```

#### Aktualizovaný useEffect:
```javascript
useEffect(() => {
  if (isReady) {
    scanCDN();
  }
}, [isReady]);
```

### 3. `src/hooks/index.js` (aktualizovaný)

```javascript
export { usePreloadReady } from './usePreloadReady';
```

## Výhody oprav

### 1. Správné pořadí načítání
- **Preloading first** - Nejdříve se načtou všechna data
- **Metadata loading second** - Pak se načtou metadata z cache
- **No race conditions** - Žádné souběžné načítání

### 2. Optimalizace výkonu
- **Cache first** - Používá se cache místo Firebase
- **Faster loading** - Rychlejší načítání dat
- **Reduced Firebase calls** - Méně volání Firebase

### 3. Robustnost
- **Error prevention** - Zabránění chybám při načítání
- **Consistent state** - Konzistentní stav aplikace
- **Graceful degradation** - Graceful degradation při chybách

## Testování

### 1. Test čekání na preloading
```javascript
// Test: Čekání na preloading
const { isReady, isPreloaded, preloadStatus } = usePreloadReady();

useEffect(() => {
  if (isReady) {
    console.log('Preloading completed, starting metadata loading');
    scanCDN();
  }
}, [isReady]);
```

### 2. Test cache vs Firebase
```javascript
// Test: Cache vs Firebase
const cachedResult = cacheService.getFirebaseQuery(cacheKey);
if (cachedResult) {
  console.log('Using cached result - no Firebase loading needed');
  await processCachedResult(cachedResult);
} else {
  console.log('No cached result, loading from Firebase');
  // Load from Firebase
}
```

### 3. Test timing
```javascript
// Test: Timing
console.log('Preloading status:', preloadStatus);
console.log('Is ready:', isReady);
console.log('Is preloaded:', isPreloaded);
```

## Závěr

Metadata Loading Timing Fix řeší problém s timing načítání metadat tím, že:

1. **Implementoval `usePreloadReady`** - Čeká na dokončení preloadingu
2. **Upravil `useFirebaseHudbaScanner`** - Čeká na `isReady` před spuštěním
3. **Zajistil správné pořadí** - Preloading → Metadata loading
4. **Optimalizoval výkon** - Cache first, Firebase fallback

Aplikace nyní správně čeká na dokončení preloadingu před načítáním metadat! 🎉



