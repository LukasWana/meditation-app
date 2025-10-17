# Optimalizace přednačítání MP3 souborů - Metadata-only preloading

## Problém
Původní systém přednačítání MP3 souborů způsoboval chyby `ERR_INSUFFICIENT_RESOURCES` v konzoli, protože načítal celé audio soubory dopředu, což vytvářelo příliš mnoho současných síťových requestů.

## Řešení
Implementoval jsem optimalizovaný systém, který načítá pouze metadata (hlavičky) MP3 souborů místo celých souborů.

### Klíčové změny:

#### 1. Nový Metadata Loader (`useMetadataLoader.js`)
- **HTTP HEAD requesty**: Používá Firebase Storage `getMetadata()` API místo stahování celých souborů
- **Timeout management**: Kratší timeouty (3-5 sekund) pro metadata requesty
- **Retry mechanismus**: Automatické opakování při selhání s exponenciálním backoff
- **Batch loading**: Možnost načítat metadata více souborů najednou s kontrolou zátěže

#### 2. Fast Track Loader (`useFastTrackLoader.js`)
- **Prioritizace**: Načítá metadata podle priority (aktuální → následující)
- **Concurrency control**: Maximálně 3 současné requesty
- **Lazy loading**: Načítá metadata pouze pro viditelné položky při scroll
- **Progress tracking**: Sleduje průběh načítání

#### 3. Optimalizovaný Cache Service
- **Metadata-only preloading**: Nové metody `_preloadFirebaseMetadata()`, `fastPreloadMetadata()`
- **Firebase vs. non-Firebase**: Rozlišuje mezi Firebase Storage a ostatními URL
- **Duration estimation**: Odhaduje délku audio na základě velikosti souboru
- **Smarter batching**: Menší batch velikosti s delay mezi requesty

#### 4. Aktualizované Preloader Hooks
- **Rychlejší timeouty**: Sníženo z 2 sekund na 1 sekundu
- **Metadata focus**: Zaměřeno na metadata místo celých souborů
- **Reduced concurrency**: Méně agresivní preloading

### Výhody:

1. **Snížení síťové zátěže**: Pouze metadata requesty místo stahování celých souborů
2. **Rychlejší odezva**: Metadata se načítají rychleji než celé soubory
3. **Méně chyb**: Eliminace `ERR_INSUFFICIENT_RESOURCES` chyb
4. **Lepší UX**: Uživatel vidí informace o souborech okamžitě (délka, velikost)
5. **Škálovatelnost**: Systém zvládne více souborů bez přetížení

### Technické detaily:

- **Metadata obsahuje**: velikost souboru, content type, čas vytvoření, odhadovaná délka
- **Cache TTL**: 1 hodina pro metadata
- **Batch size**: 3-5 souborů současně s 200ms delay
- **Timeout**: 3 sekundy pro metadata requesty
- **Retry**: Až 2 pokusy s exponenciálním backoff

### Monitoring:

Systém loguje:
- Počet úspěšně načtených metadat
- Chyby při načítání
- Cache hit/miss statistiky
- Progress při batch loading

### Použití:

```javascript
// Jednotlivý soubor
const { metadata, loading, error } = useMetadataLoader('audio-file.mp3');

// Batch loading
const { metadata, loading, progress } = useBatchMetadataLoader(fileNames);

// Fast track s prioritou
const { loadedMetadata, loading } = useFastTrackLoader(items, {
  priorityItems: ['current-song.mp3'],
  maxConcurrent: 3
});
```

Tato optimalizace by měla výrazně snížit chyby v konzoli a zlepšit výkon aplikace při práci s velkým množstvím audio souborů.
