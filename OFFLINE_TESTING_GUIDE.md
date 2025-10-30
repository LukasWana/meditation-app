# Návod pro testování offline funkcionality

## 🎯 Přehled oprav

### Opravené problémy:
1. ✅ **Service Worker blokoval Firebase Storage** - odstraněno
2. ✅ **Service Worker se nespouštěl v dev módu** - povoleno
3. ✅ **BaseCache/AudioCache** - ověřeno, že fungují správně
4. ✅ **Firebase Storage references** - ověřeno, že jsou správné

### Nové funkce:
- 🧪 **Test script** pro offline funkcionalitu
- 📊 **Automatické loading** test utilities v dev módu

---

## 🚀 Jak testovat offline funkcionalitu

### Krok 1: Spusť aplikaci

```bash
npm run dev
```

Aplikace poběží na `http://localhost:5173`

### Krok 2: Otevři konzoli prohlížeče

- **Chrome/Edge**: F12 nebo Ctrl+Shift+I
- **Firefox**: F12 nebo Ctrl+Shift+K

### Krok 3: Spusť test

V konzoli zadej:

```javascript
// Plný test
offlineTest.run()

// Rychlý test (jen základní info)
offlineTest.quick()
```

### Krok 4: Interpretace výsledků

#### ✅ Úspěšný výsledek:
```
✅ ALL TESTS PASSED
Service Worker: ✅ PASS
Cache API: ✅ PASS
Cache Service: ✅ PASS
```

#### ❌ Pokud Service Worker není aktivní:
```
❌ Service Worker is NOT active
💡 Tip: Reload page or check if SW is registered
```

**Řešení:** Znovu načti stránku (F5 nebo Ctrl+R)

#### ⚠️ Pokud nejsou žádné soubory v cache:
```
⚠️ No audio files cached yet
💡 Tip: Try downloading files from admin panel first
```

**Řešení:** Jdi do Admin Panelu a stáhni soubory offline

---

## 📥 Stažení souborů pro offline použití

### Metoda 1: Přes Admin Panel

1. Otevři admin panel: `http://localhost:5173/admin`
2. Najdi sekci "Offline Download" nebo "Download Files for Offline"
3. Klikni na tlačítko pro stažení
4. Počkej, až se všechny soubory stáhnou

### Metoda 2: Přes konzoli (pro testování jednotlivých souborů)

```javascript
// Test stažení jednoho souboru
offlineTest.testDownload(
  'hudba/ambient-journey/track1.mp3',
  'https://firebasestorage.googleapis.com/...'
)
```

---

## 🧪 Dostupné test příkazy

### `offlineTest.run()`
Spustí kompletní test suite:
- ✓ Service Worker status
- ✓ Cache API availability
- ✓ Offline Cache Service
- ✓ Cached files statistics
- ✓ Sample file verification

### `offlineTest.quick()`
Rychlý status check:
- Service Worker aktivní?
- Cache Service inicializován?
- Kolik souborů je cached?
- Celková velikost cache

### `offlineTest.testDownload(fileName, fileUrl)`
Test stažení jednoho konkrétního souboru:
```javascript
offlineTest.testDownload(
  'test.mp3',
  'https://firebasestorage.googleapis.com/.../test.mp3'
)
```

### `offlineTest.clear()`
Vymaže všechny cache (užitečné pro debugging):
```javascript
offlineTest.clear()
```

---

## 🔍 Debugging

### Jak zkontrolovat Service Worker v Chrome DevTools

1. Otevři DevTools (F12)
2. Přejdi na záložku **Application**
3. V levém menu vyber **Service Workers**
4. Měl bys vidět:
   - ✅ Status: **activated and running**
   - URL: `/sw.js`

### Jak zkontrolovat Cache Storage

1. V DevTools → **Application**
2. V levém menu vyber **Cache Storage**
3. Měl bys vidět:
   - `meditation-audio-cache` nebo podobný název
   - Seznam .mp3 souborů

### Jak simulovat offline režim

1. V DevTools → **Network** tab
2. Najdi dropdown s nápisem **Online**
3. Změň na **Offline**
4. Zkus přehrát audio - mělo by fungovat z cache

---

## 🐛 Běžné problémy a řešení

### Problem: Service Worker se neregistruje

**Symptomy:**
```
❌ Service Worker is NOT active
```

**Řešení:**
1. Zkontroluj, že běží na `http://localhost` nebo `https://`
2. Zkus hard reload: Ctrl+Shift+R
3. V DevTools → Application → Service Workers → klikni "Unregister" a reload

### Problem: Soubory se nestahují do cache

**Symptomy:**
```
⚠️ No audio files cached yet
```

**Řešení:**
1. Otevři konzoli a hledej chyby
2. Zkontroluj Network tab - jsou tam 404 chyby?
3. Ověř, že Firebase Storage je správně nakonfigurován
4. Zkus manuální test: `offlineTest.testDownload(...)`

### Problem: CORS chyby

**Symptomy:**
```
❌ Failed to cache: CORS error
```

**Řešení:**
- Oprava v `sw.js` už obsahuje `mode: 'no-cors'`
- Pokud problém přetrvává, zkontroluj Firebase Storage rules

### Problem: Opaque responses

**Symptomy:**
```
Response type: opaque
```

**Vysvětlení:**
- To je normální při použití `mode: 'no-cors'`
- Soubory se stáhnou, ale nemůžeme číst jejich obsah
- Pro přehrávání to nevadí - Service Worker je vrátí zpět

---

## 📊 Očekávané výsledky

### Po prvním spuštění (bez cached files):
```
Service Worker: ✅ ACTIVE
Cache API: ✅ AVAILABLE
Cache Service: ✅ INITIALIZED
Files Cached: 0
Offline Ready: ❌ NO
```

### Po stažení souborů:
```
Service Worker: ✅ ACTIVE
Cache API: ✅ AVAILABLE
Cache Service: ✅ INITIALIZED
Files Cached: 45
Total Size: 234.5 MB
Offline Ready: ✅ YES
```

### V offline režimu:
- ✅ Audio soubory se přehrávají z cache
- ✅ UI funguje (statické soubory cached)
- ❌ Nové soubory nelze načíst (očekávané)
- ❌ Firebase API volání selžou (očekávané)

---

## 🔧 Pro vývojáře

### Struktur souborů:
- `public/sw.js` - Service Worker
- `src/services/serviceWorker.js` - SW registrace
- `src/services/offlineCacheService.js` - Cache management
- `src/scripts/testOfflineCache.js` - Test utilities

### Klíčové změny v sw.js:
```javascript
// PŘED (NEFUNGOVALO):
if (url.hostname.includes('firebasestorage.googleapis.com')) {
  return; // ❌ Ignorovalo všechny Firebase Storage requesty
}

// PO (FUNGUJE):
// Firebase Storage požadavky MUSÍ být cachované
// Komentář zabrání budoucímu odstranění
```

### Klíčové změny v serviceWorker.js:
```javascript
// PŘED (NEFUNGOVALO V DEV):
if (import.meta.env.MODE === 'development') {
  console.log('Skipped in development mode');
  return; // ❌ Žádný SW v dev módu
}

// PO (FUNGUJE):
// Service Worker povolen i v dev módu
// Komentář vysvětluje proč
```

---

## ✅ Checklist pro úspěšné offline testování

- [ ] Aplikace běží (`npm run dev`)
- [ ] Console je otevřená (F12)
- [ ] `offlineTest.run()` vrací všechny PASS
- [ ] Admin panel zobrazuje download progress
- [ ] Soubory se stáhly (viz Cache Storage v DevTools)
- [ ] Offline režim aktivní (Network tab → Offline)
- [ ] Audio se přehrává i offline
- [ ] Žádné chyby v konzoli

---

## 📞 Další kroky

Pokud všechny testy prošly:
1. ✅ **Fáze 1 dokončena** - offline funkcionalita funguje
2. 📋 **Fáze 2** - Admin panel opravy
3. 📋 **Fáze 3** - Race conditions a performance
4. 📋 **Fáze 4** - Code cleanup a dokumentace

---

**Poslední aktualizace:** 2025-10-30
**Autor:** Claude Code
