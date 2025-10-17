# Časový Ovladač - Dokumentace

## Přehled

Hlavní časový ovladač (`TimeController`) je centrální systém pro správu všech časů v aplikaci. Zajišťuje konzistentní formátování, parsování a manipulaci s časy napříč celou aplikací.

## Komponenty

### 1. TimeParser (`src/utils/timeParser.js`)

Bezchybný parser pro časy podporující různé formáty:

#### Podporované formáty:
- `MM:SS` - 5:30
- `HH:MM:SS` - 1:05:30
- `195` - pouze sekundy
- `3m15s` - 3 minuty 15 sekund
- `1h30m45s` - 1 hodina 30 minut 45 sekund
- `5min` - 5 minut
- `2h` - 2 hodiny

#### Hlavní metody:
```javascript
parseToSeconds(timeInput)     // Parsuje na sekundy
formatToMMSS(seconds)         // Formátuje na MM:SS
formatToHHMMSS(seconds)       // Formátuje na HH:MM:SS
formatToHuman(seconds)        // Lidsky čitelný formát
isValidTime(timeInput)        // Validuje čas
normalize(timeInput)          // Normalizuje na MM:SS
```

### 2. TimeController (`src/services/timeController.js`)

Hlavní ovladač pro správu časů:

#### Konfigurace:
```javascript
setGlobalFormat('MM:SS')      // Nastaví globální formát
getGlobalFormat()             // Získá aktuální formát
```

#### Základní operace:
```javascript
parseTime(timeInput)          // Parsuje podle aktuálního formátu
formatTime(seconds)           // Formátuje podle aktuálního formátu
normalizeTime(timeInput)      // Normalizuje čas
isValidTime(timeInput)        // Validuje čas
```

#### Pokročilé operace:
```javascript
timeDifference(time1, time2)  // Rozdíl mezi časy
addTimes(time1, time2)        // Součet časů
multiplyTime(time, mult)      // Násobení času
```

#### Získání hodnot:
```javascript
getSeconds(timeInput)         // Sekundy
getMinutes(timeInput)         // Minuty
getHours(timeInput)           // Hodiny
getRemainingSeconds(timeInput) // Zbývající sekundy
getRemainingMinutes(timeInput) // Zbývající minuty
```

#### Porovnání a validace:
```javascript
compareTimes(time1, time2)    // Porovnání (-1, 0, 1)
isInRange(time, min, max)     // Kontrola rozsahu
```

#### Agregace:
```javascript
getAverageTime(times)         // Průměrný čas
getTotalTime(times)           // Celkový čas
getMinTime(times)             // Nejkrátší čas
getMaxTime(times)             // Nejdelší čas
```

### 3. useTimeController Hook (`src/hooks/useTimeController.js`)

React hook pro snadné použití v komponentách:

```javascript
const {
  format, isValid, lastError,
  parseTime, formatTime, normalizeTime, validateTime,
  timeDifference, addTimes, multiplyTime,
  getSeconds, getMinutes, getHours,
  compareTimes, isInRange,
  getAverageTime, getTotalTime, getMinTime, getMaxTime,
  changeFormat, clearCache, getStats
} = useTimeController('MM:SS');
```

### 4. TimeControllerDemo (`src/components/TimeControllerDemo.jsx`)

Demo komponenta ukazující všechny funkce časového ovladače.

## Použití v aplikaci

### Import:
```javascript
import { timeController } from '@services/timeController';
import { useTimeController } from '@hooks/useTimeController';
```

### Základní použití:
```javascript
// Parsování času
const time = timeController.parseTime('5:30'); // "5:30"

// Formátování
const formatted = timeController.formatTime(330); // "5:30"

// Součet časů
const total = timeController.addTimes('3:15', '2:30'); // "5:45"

// Celkový čas z pole
const totalTime = timeController.getTotalTime(['3:15', '2:30', '1:45']); // "7:30"
```

### V React komponentách:
```javascript
function MyComponent() {
  const { parseTime, formatTime, addTimes } = useTimeController();

  const handleTimeChange = (input) => {
    const formatted = parseTime(input);
    // Použij formatted čas
  };

  return (
    <div>
      <input onChange={(e) => handleTimeChange(e.target.value)} />
    </div>
  );
}
```

## Integrace s existujícími komponenty

### MetadataGenerator
- Používá `timeController.formatTime()` pro formátování délek
- Konzistentní formátování napříč všemi metadata

### useFirebaseHudbaScanner
- Používá `timeController.formatTime()` pro formátování délek
- Zajišťuje správné zobrazení času v UI

### useFirebaseHudbaFilter
- Používá `timeController.getTotalTime()` pro výpočet celkového času alba
- Zjednodušená logika pro agregaci časů

## Výhody

1. **Konzistence** - Všechny časy jsou formátovány stejně
2. **Flexibilita** - Podpora různých formátů vstupu
3. **Robustnost** - Bezchybný parser s fallback mechanismy
4. **Výkon** - Cache pro parsed časy
5. **Snadné použití** - Jednoduché API pro všechny operace
6. **Type Safety** - Validace vstupů a error handling

## Testování

Použijte `TimeControllerDemo` komponentu pro testování všech funkcí:

```javascript
import TimeControllerDemo from '@components/TimeControllerDemo';

// V aplikaci
<TimeControllerDemo />
```

## Konfigurace

### Globální formát:
```javascript
timeController.setGlobalFormat('HH:MM:SS'); // Pro dlouhé časy
timeController.setGlobalFormat('MM:SS');    // Výchozí
timeController.setGlobalFormat('human');    // Lidsky čitelný
```

### Cache management:
```javascript
timeController.clearCache(); // Vyčistí cache
const stats = timeController.getStats(); // Statistiky
```

## Troubleshooting

### Časté problémy:

1. **Nesprávné formátování** - Zkontrolujte globální formát
2. **Chyby parsování** - Použijte `isValidTime()` pro validaci
3. **Problémy s cache** - Vyčistěte cache pomocí `clearCache()`

### Debug:
```javascript
// Zkontrolujte statistiky
console.log(timeController.getStats());

// Testujte parsování
console.log(timeController.parseTime('5:30'));
console.log(timeController.isValidTime('invalid'));
```
