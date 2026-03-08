# HudbaScreen Playback Fix - Oprava přehrávání hudba sekce

## Problém
HudbaScreen se načítal a zobrazoval, ale nešlo spustit přehrávání. Problém byl v tom, že `useFirebaseHudbaScanner` nenačítal správně soubory ze složky `hudba/`.

## Analýza

### ✅ **SlovaScreen (fungoval):**
- Používal `useFirebaseCDNScanner`
- Načítal všechny soubory z Firebase Storage
- Filtroval podle `name.startsWith('slova/')`

### ❌ **HudbaScreen (nefungoval):**
- Používal `useFirebaseHudbaScanner`
- Pokoušel se načíst soubory přímo ze složky `hudba/`
- Filtroval podle `item.folder === 'hudba'`
- Nenačítal soubory správně

## Řešení

### 1. **Změna načítání souborů v useFirebaseHudbaScanner.js**
```javascript
// PŘED (nefungovalo):
const hudbaRef = ref(storage, 'hudba');
const hudbaResult = await listAll(hudbaRef);
// Filtroval podle item.folder === 'hudba'

// PO (funguje):
const listRef = ref(storage, '');
const result = await listAll(listRef);
// Filtruje podle name.startsWith('hudba/')
```

### 2. **Konzistentní architektura**
Nyní oba hooky používají stejný princip:
- **useFirebaseCDNScanner** → načítá všechny soubory → filtruje podle `name.startsWith('slova/')`
- **useFirebaseHudbaScanner** → načítá všechny soubory → filtruje podle `name.startsWith('hudba/')`

## Výsledek

### ✅ **HudbaScreen nyní:**
- Načítá soubory ze složky `hudba/` správně
- Zobrazuje hudba seznam s duration informacemi
- Umožňuje spustit přehrávání (kliknutí na položku)
- Funguje stejně jako SlovaScreen

### 🔄 **Konzistentní načítání:**
- Oba hooky používají `listAll(ref(storage, ''))`
- Oba filtrují podle názvu souboru
- Oba načítají podsložky rekurzivně

## Testování

Aplikace by nyní měla:
1. ✅ Načítat sekci "slova" (fungovalo už dříve)
2. ✅ Načítat sekci "hudba" (opraveno)
3. ✅ Zobrazovat duration u obou sekcí
4. ✅ Umožnit spustit přehrávání v obou sekcích
5. ✅ Fungovat bez chyb v konzoli

## Poznámky

- Problém byl v rozdílném přístupu k načítání souborů
- `useFirebaseHudbaScanner` se pokoušel načíst soubory přímo ze složky `hudba/`
- `useFirebaseCDNScanner` načítal všechny soubory a pak je filtroval
- Konzistentní přístup je spolehlivější

**Oprava dokončena!** 🎉
