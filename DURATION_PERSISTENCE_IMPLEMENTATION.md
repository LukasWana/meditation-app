# Duration Persistence Implementation

## Přehled

Implementoval jsem kompletní systém pro persistentní ukládání informací o celkovém čase skladeb v sekci hudba. Systém zajišťuje, že se duration data neztrací při obnovení stránky a jsou dostupná okamžitě.

## Problém, který řeší

**Původní problém:**
- Informace o celkovém čase skladeb se ztrácely při obnovení stránky
- Duration se muselo načítat znovu při každém načtení aplikace
- Chyběla persistentní cache pro duration data
- Pomalé zobrazení duration v UI

**Řešení:**
- Implementoval localStorage persistence pro duration cache
- Přidal vylepšené fallback mechanismy
- Optimalizoval načítání duration s retry logikou
- Zajistil okamžité zobrazení cached duration

## Implementované změny

### 1. Vylepšená BaseCache s localStorage podporou

**Soubor:** `src/services/cache/BaseCache.js`

```javascript
// Nové funkce:
- enablePersistence: boolean // Povolí localStorage persistence
- saveToStorage() // Uloží cache do localStorage
- loadFromStorage() // Načte cache z localStorage
- clearStorage() // Vyčistí localStorage
```

**Klíčové vlastnosti:**
- Automatické ukládání při každé změně cache
- Načítání z localStorage při inicializaci
- Uložení pouze neexpirovaných položek
- Error handling pro localStorage operace

### 2. Persistentní AudioCache

**Soubor:** `src/services/cache/AudioCache.js`

```javascript
constructor() {
  super('audio', 50, 24 * 60 * 60 * 1000, true); // Povolena persistence
}
```

**Výhody:**
- Duration data se ukládají do localStorage
- 24hodinová TTL pro duration data
- Automatické načítání při startu aplikace

### 3. Vylepšená HudbaScreen s 5úrovňovými fallback mechanismy

**Soubor:** `src/features/meditation/screens/HudbaScreen.jsx`

#### Fallback hierarchie:
1. **State cache** - nejrychlejší, pro aktuální session
2. **Persistent cache** - localStorage, přežije reload
3. **Metadata duration** - z původních metadat
4. **Static metadata** - z cacheService metadata
5. **N/A fallback** - pokud nic není dostupné

#### Vylepšená getAudioDuration funkce:
```javascript
// Nové vlastnosti:
- Retry logika s exponenciálním backoff (3 pokusy)
- Vylepšený error handling
- 10sekundový timeout
- Automatické cleanup event listenerů
- Vrací duration v sekundách (ne jako string)
```

### 4. Debug a testovací nástroje

**Soubor:** `src/components/DurationPersistenceTest.jsx`

**Funkce:**
- Test persistentního ukládání duration
- Kontrola localStorage persistence
- Simulace reload stránky
- Vizuální zobrazení výsledků testů
- Dostupné pouze v development módu

## Technické detaily

### Cache struktura v localStorage

```javascript
// Klíč: "cache_audio"
{
  "duration_https://example.com/song1.mp3": {
    "value": 180,
    "timestamp": 1703123456789,
    "ttl": 86400000
  },
  "duration_https://example.com/song2.mp3": {
    "value": 240,
    "timestamp": 1703123456790,
    "ttl": 86400000
  }
}
```

### Performance optimalizace

1. **Lazy loading** - duration se načítá pouze pokud není v cache
2. **Batch processing** - načítání více duration současně
3. **Memory cache** - okamžité zobrazení z state
4. **Persistent cache** - okamžité zobrazení po reload

### Error handling

1. **Retry mechanismus** - 3 pokusy s exponenciálním backoff
2. **Timeout handling** - 10sekundový timeout pro načítání
3. **Graceful degradation** - fallback na metadata pokud cache selže
4. **Logging** - detailní debug informace

## Použití

### Automatické použití
Systém funguje automaticky - duration se ukládá a načítá bez nutnosti manuálního zásahu.

### Testování
V development módu je dostupná testovací komponenta v pravém dolním rohu HudbaScreen.

### Debug informace
Všechny operace jsou logovány s prefixem `🎵` pro snadné sledování.

## Výsledky

### Před implementací:
- Duration se muselo načítat při každém reload
- Pomalé zobrazení duration v UI
- Ztráta duration dat při obnovení stránky

### Po implementaci:
- ✅ Duration se zobrazuje okamžitě po reload
- ✅ Persistentní ukládání v localStorage
- ✅ 5úrovňové fallback mechanismy
- ✅ Vylepšená error handling a retry logika
- ✅ Debug nástroje pro testování
- ✅ Performance optimalizace

## Kompatibilita

- ✅ Funguje ve všech moderních prohlížečích
- ✅ Graceful degradation pokud localStorage není dostupný
- ✅ Backward compatible s existujícím kódem
- ✅ Development a production módy

## Monitoring

Systém poskytuje detailní debug informace:
- Cache hit/miss statistiky
- Duration loading progress
- Error handling informace
- Performance metriky

Všechny informace jsou dostupné v browser console s prefixem `🎵`.
