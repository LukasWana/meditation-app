# Plán konsolidace Metadata služeb

## Přehled

Identifikováno **5 metadata služeb** s významnou duplikací funkcionality (~1500+ řádků kódu).

## Identifikované služby

### 1. `staticMetadataService.js`
- **Účel:** Načítá metadata z statického JSON souboru (`/audio-metadata.json`)
- **Cache:** localStorage (48h expirace)
- **Použití:** Fallback při chybách síťových služeb
- **Řádky:** ~150

### 2. `fastMetadataService.js`
- **Účel:** Rychlé načítání z Realtime Database snapshot
- **Cache:** localStorage (7 dní expirace)
- **Použití:** Hlavní služba pro rychlé načítání metadat
- **Řádky:** ~940

### 3. `realtimeMetadataService.js`
- **Účel:** Real-time metadata z Realtime Database s listeners
- **Cache:** Memory cache (Map)
- **Použití:** Real-time aktualizace metadat
- **Řádky:** ~400

### 4. `firestoreMetadataService.js`
- **Účel:** Metadata z Firestore kolekce
- **Cache:** localStorage (24h expirace)
- **Použití:** Alternativní zdroj metadat
- **Řádky:** ~200

### 5. `unifiedMetadataService.js`
- **Účel:** Sjednocená služba kombinující Firestore + MP3 extrakci
- **Cache:** localStorage (24h expirace) + memory cache
- **Použití:** Univerzální služba s fallback mechanismy
- **Řádky:** ~350

## Duplikovaná funkcionalita

### Společné metody (všechny služby):
1. **Cache management:**
   - `loadFromLocalCache()` - téměř identická implementace
   - `saveToLocalCache()` - téměř identická implementace
   - Memory cache s Map
   - localStorage s timestamp a expirací

2. **Metadata loading:**
   - `getMetadata(fileName)` nebo `loadAllMetadata()`
   - Error handling
   - Fallback mechanismy

3. **Initialization:**
   - `initialize()` metoda
   - Loading flags (`isLoading`, `isInitialized`)

## Navrhovaná architektura

### Base Class: `BaseMetadataService`

```javascript
class BaseMetadataService {
  constructor(config) {
    this.cache = new Map();
    this.localStorageKey = config.localStorageKey;
    this.cacheExpiry = config.cacheExpiry || 24 * 60 * 60 * 1000;
    this.isLoading = false;
    this.isInitialized = false;
  }

  // Společné cache metody
  loadFromLocalCache() { /* ... */ }
  saveToLocalCache() { /* ... */ }
  clearCache() { /* ... */ }

  // Abstraktní metody (musí implementovat potomci)
  async loadMetadata() { throw new Error('Must implement'); }
  async getMetadata(fileName) { throw new Error('Must implement'); }
}
```

### Specializované služby (dědičnost):

1. **StaticMetadataService extends BaseMetadataService**
   - Implementuje načítání z JSON souboru

2. **RealtimeMetadataService extends BaseMetadataService**
   - Implementuje Realtime Database listeners
   - Přidává real-time funkcionalitu

3. **FirestoreMetadataService extends BaseMetadataService**
   - Implementuje Firestore queries

4. **FastMetadataService extends BaseMetadataService**
   - Kombinuje Realtime Database snapshot + fallback

5. **UnifiedMetadataService extends BaseMetadataService**
   - Kombinuje všechny zdroje s prioritou

## Strategie konsolidace

### Fáze 1: Vytvoření Base Class
- [x] Vytvořit `BaseMetadataService` s obecnou cache logikou
- [x] Přesunout duplikovaný cache kód do base class
- [x] Definovat abstraktní rozhraní

### Fáze 2: Refactoring existujících služeb
- [x] Refaktorovat `staticMetadataService` na dědičnost ✅
- [x] Refaktorovat `fastMetadataService` na dědičnost ✅
- [x] Refaktorovat `realtimeMetadataService` na dědičnost ✅
- [x] Refaktorovat `firestoreMetadataService` na dědičnost ✅
- [x] Refaktorovat `unifiedMetadataService` na dědičnost ✅

### Fáze 3: Testování a validace
- [ ] Otestovat všechny služby po refactoringu
- [ ] Ověřit, že cache funguje správně
- [ ] Ověřit fallback mechanismy

### Fáze 4: Optimalizace
- [ ] Odstranit zbývající duplikace
- [ ] Optimalizovat cache strategie
- [ ] Dokumentace

## Odhadovaný přínos

- **Úspora kódu:** ~500-700 řádků (33-47% redukce)
- **Zlepšení maintainability:** Jedna místo pro cache logiku
- **Snadnější testování:** Base class lze testovat samostatně
- **Konzistentní API:** Všechny služby mají stejné rozhraní

## Rizika

1. **Breaking changes:** Změny v API mohou ovlivnit existující kód
2. **Testování:** Vyžaduje důkladné testování všech služeb
3. **Migrace:** Postupné migrování, aby nedošlo k přerušení funkcionality

## Doporučení

1. **Začít s Base Class:** Vytvořit base class a otestovat ji
2. **Postupná migrace:** Migrovat jednu službu po druhé
3. **Zachovat kompatibilitu:** Zachovat existující API během migrace
4. **Dokumentace:** Dokumentovat změny a novou architekturu

