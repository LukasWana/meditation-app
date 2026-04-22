# Jak ověřit opravu načítání meditacie souborů

## 1. Spusťte aplikaci
```bash
npm run dev
```

## 2. Otevřete browser console (F12)
Hledejte logy:
- `🚀 Loading metadata from Firebase Storage structure...`
- `📊 Firebase Storage result for meditacie:`
- `✅ Meditacie file processed:`

## 3. Ověřte načítané soubory
V console spusťe:
```javascript
// Zkontrolujte počet meditacie souborů
window.debugMeditacieFiles();

// Zkontrolujte metadata
import('@services/fastMetadataService').then(m => {
  const meditacieFiles = Object.values(m.metadata.getMetadata()).filter(f => f.folder === 'meditacie');
  console.log('Meditacie files:', meditacieFiles.length);
  console.log('By language:', meditacieFiles.reduce((acc, f) => {
    acc[f.language] = (acc[f.language] || 0) + 1;
    return acc;
  }, {}));
});
```

## 4. Otestujte různé jazyky
V UI přepněte jazyk a zkontrolujte, zda se načítají správné soubory:
- **SK** - Zobrazí SK soubory (např. "zensky4FSK-Kozie posolstvo-long.mp3")
- **CZ** - Zobrazí CZ soubory
- **EN** - Zobrazí EN soubory

## 5. Diagnostika
Pokud se soubory stále nenačítají, spusťte:
```bash
npm run dev
```

A v console:
```javascript
// Vynuťte inicializaci
import('@services/fastMetadataService').then(m => m.getAllMetadata());

// Znovu inicializujte slovaDataService
import('@services/slovaDataService').then(s => {
  s.initialize(true).then(() => {
    console.log('Slova data:', s.getSlovaData('all', 'sk'));
  });
});
```

## Co by mělo fungovat po opravě:
- ✅ Všechny SK soubory se načtou pro SK uživatele
- ✅ Všechny CZ soubory se načtou pro CZ uživatele
- ✅ Všechny EN soubory se načtou pro EN uživatele
- ✅ Soubory s formátem "zensky4FSK-..." se správně parsují
- ✅ Metadata se automaticky načtou z Firebase Storage

## Pokud stále nefunguje:
1. Zkontrolujte Firebase Console - zda složka `meditacie/` existuje
2. Zkontrolujte podsložky `meditacie/SK/`, `meditacie/CZ/`, `meditacie/EN/`
3. Zkontrolujte, zda soubory existují ve Firebase Storage
4. Zkontrolujte browser console pro error logy

## Debug nástroje:
- Otevřete `debug-metadata-loading.html` v browseru
- Spusťte `node verify-language-filtering.js`
- Spusťte testy: `npm test`
