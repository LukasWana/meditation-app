# Analýza Cache služeb

## Identifikované cache služby

### 1. `cacheServiceRefactored.js` ✅ POUŽÍVÁ SE
- **Účel:** Hlavní cache služba s delegací na specializované cache
- **Struktura:** Používá BaseCache s specializovanými třídami:
  - `AudioCache` - audio URL cache
  - `MetadataCache` - metadata cache
  - `FirebaseCache` - Firebase query cache
  - `ImageCache` - image URL cache
- **Typ:** Memory + localStorage cache
- **Řádky:** ~500
- **Status:** ✅ Aktivně používán, dobře strukturovaný

### 2. `offlineCacheService.js` ✅ POUŽÍVÁ SE
- **Účel:** Offline caching audio souborů pomocí Cache API
- **Typ:** Service Worker Cache API
- **Funkcionalita:**
  - Cache audio souborů pro offline přehrávání
  - Download queue management
  - Progress tracking
- **Řádky:** ~920
- **Status:** ✅ Aktivně používán v `useAudioPlayer.js` a `App.jsx`

### 3. `enhancedOfflineCacheService.js` ❓ POUŽÍVÁ SE?
- **Účel:** Vylepšená verze offline cache service
- **Typ:** Service Worker Cache API
- **Funkcionalita:** Podobná jako `offlineCacheService`, ale s vylepšenou funkcionalitou
- **Řádky:** ~220
- **Status:** ❓ Potřebuje ověření použití

### 4. `optimized-cache.js` ❓ POUŽÍVÁ SE?
- **Účel:** LRU cache implementace
- **Typ:** Memory cache s LRU strategií
- **Funkcionalita:**
  - LRU cache
  - Performance metrics
  - OptimizedCacheManager wrapper
- **Řádky:** ~280
- **Status:** ❓ Potřebuje ověření použití

### 5. `BaseCache.js` ✅ POUŽÍVÁ SE
- **Účel:** Base class pro specializované cache třídy
- **Typ:** Memory + localStorage cache
- **Funkcionalita:**
  - Základní cache operace (get, set, delete, clear)
  - TTL management
  - Persistence do localStorage
- **Řádky:** ~150
- **Status:** ✅ Používán v cache/ složce (AudioCache, MetadataCache, atd.)

## Analýza duplikace

### Duplikace mezi offlineCacheService a enhancedOfflineCacheService
- **Podobnost:** ~70%
- **Rozdíly:**
  - `enhancedOfflineCacheService` má vylepšenou logiku pro offline URL
  - `offlineCacheService` má download queue a progress tracking
- **Doporučení:**
  - Pokud `enhancedOfflineCacheService` není používán → odstranit
  - Pokud je používán → sloučit funkcionalitu do `offlineCacheService`

### Duplikace mezi optimized-cache a BaseCache
- **Podobnost:** ~50%
- **Rozdíly:**
  - `optimized-cache` má LRU strategii
  - `BaseCache` má jednodušší cleanup strategii
- **Doporučení:**
  - Pokud `optimized-cache` není používán → odstranit
  - Pokud je používán → integrovat LRU do BaseCache nebo použít jako wrapper

## Strategie konsolidace

### Možnost 1: Odstranit nepoužívané služby
1. Ověřit použití `enhancedOfflineCacheService` a `optimized-cache`
2. Pokud nejsou používány → odstranit
3. Pokud jsou používány → sloučit funkcionalitu

### Možnost 2: Sloučit podobné služby
1. Sloučit `enhancedOfflineCacheService` do `offlineCacheService`
2. Integrovat LRU z `optimized-cache` do `BaseCache` (volitelně)
3. Zachovat `cacheServiceRefactored` jako hlavní cache manager

## Další kroky

1. ✅ Ověřit použití `enhancedOfflineCacheService` - POUŽÍVÁN
2. ✅ Ověřit použití `optimized-cache` - POUŽÍVÁN (jen monitoring)
3. ✅ Rozhodnout o strategii konsolidace - SLOUČIT enhanced do offline
4. ✅ Implementovat konsolidaci - DOKONČENO

## Výsledek

- ✅ `enhancedOfflineCacheService` sloučen do `offlineCacheService`
- ✅ `enhancedOfflineCacheService.js` odstraněn
- ✅ Všechny metody přidány do `offlineCacheService`
- ✅ Importy aktualizovány
- ✅ `optimized-cache` zachován (používá se pro monitoring)

