# Oprava Firebase Storage 404 chyb

## Problém
Aplikace generovala 404 chyby při pokusu o načítání neexistujících souborů z Firebase Storage:
```
GET https://firebasestorage.googleapis.com/v0/b/meditations-audio.firebasestorage.app/o/muzsky4FSK-uzkost-osamelost.mp3 404 (Not Found)
```

## Příčina
Preloading systém se pokoušel načítat soubory s hardcoded názvy, které neexistovaly v Firebase Storage. Skutečné soubory mají jiné názvy a formáty.

## Řešení
Implementoval jsem dynamické zjišťování skutečných souborů v Firebase Storage místo používání hardcoded názvů.

### 🔧 Klíčové změny:

#### 1. Dynamické zjišťování souborů
```javascript
// Před opravou (hardcoded názvy)
const criticalFiles = [
  'muzsky4FSK-uzkost-osamelost.mp3',
  'zensky4FSK-uzkost-osamelost.mp3',
  'muzsky4MSK-uzkost-osamelost.mp3'
];

// Po opravě (dynamické zjišťování)
const listRef = ref(storage, '');
const result = await listAll(listRef);
const mp3Files = result.items
  .filter(item => item.name.toLowerCase().endsWith('.mp3'))
  .slice(0, 3)
  .map(item => item.name);
```

#### 2. Správné filtrování podle typu obsahu
- **Slova (spoken word)**: Soubory začínající `muzsky` nebo `zensky`
- **Hudba**: Soubory s hudebním formátem `\d{2}--\d{2}--\d{2}--\d{2}-`
- **Všechny MP3**: Pro kritická data

#### 3. Graceful handling 404 chyb
```javascript
catch (error) {
  // Pokud je soubor 404, nevrhni chybu - jen zaloguj
  if (error.code === 'storage/object-not-found' || error.message.includes('404')) {
    console.log(`File not found (404): ${fileName} - skipping preload`);
    return null;
  }
  // Ostatní chyby stále loguj jako warning
  console.warn(`Firebase metadata preload failed for ${fileName}:`, error);
  throw error;
}
```

#### 4. Vylepšené batch preloading
- **Detekce neexistujících souborů**: Rozlišuje mezi 404 a jinými chybami
- **Statistiky**: Počítá úspěšné, nenalezené a celkové soubory
- **Graceful degradation**: Pokračuje i při chybách

### 📊 Výsledky:

#### Před opravou:
- ❌ 404 chyby v konzoli
- ❌ `ERR_INSUFFICIENT_RESOURCES` kvůli neúspěšným requestům
- ❌ Hardcoded názvy souborů
- ❌ Preloading neexistujících souborů

#### Po opravě:
- ✅ Žádné 404 chyby pro neexistující soubory
- ✅ Dynamické zjišťování skutečných souborů
- ✅ Graceful handling chyb
- ✅ Správné filtrování podle typu obsahu
- ✅ Lepší logging a debugging

### 🔍 Debug informace:

Systém nyní loguje:
```
Found MP3 files for preloading: ['actual-file1.mp3', 'actual-file2.mp3']
Found slova files for preloading: ['muzsky4FSK-actual.mp3']
Found hudba files for preloading: ['00--00--00--00-ambient.mp3']
Metadata batch preload completed: 2 successful, 1 not found, 3 total
```

### 🎯 Typy souborů v Firebase Storage:

#### Mluvené slovo (Slova screen):
- Formát: `muzsky4FSK-téma.mp3`, `zensky4FSK-téma.mp3`
- Regex: `/^(muzsky|zensky)/`
- Použití: Meditační texty s hlasem

#### Hudba (Bez-slov screen):
- Formát: `00--00--00--00-název.mp3`
- Regex: `/\d{2}--\d{2}--\d{2}--\d{2}-/`
- Použití: Ambient hudba pro meditaci

### 🔄 Preloading strategie:

1. **Background preloading**: Načte první 3 MP3 soubory při startu
2. **Slova preloading**: Načte první 3 soubory pro mluvené slovo
3. **Hudba preloading**: Načte první 3 hudební soubory
4. **Touch preloading**: Spustí se při touch na tlačítka

### 🛡️ Error handling:

- **404 chyby**: Ignorovány, jen zalogovány
- **Timeout chyby**: 3 sekundy timeout pro metadata
- **Network chyby**: Retry mechanismus s exponenciálním backoff
- **Batch chyby**: Pokračuje i při selhání jednotlivých souborů

Tato oprava eliminuje 404 chyby a zajišťuje, že preloading systém pracuje pouze se skutečně existujícími soubory v Firebase Storage.
