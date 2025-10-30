# ✅ Test Checklist - Offline Funkcionalita

## 🎯 Cíl
Ověřit, že opravy Service Worker fungují a offline cache systém je funkční.

---

## 📋 Pre-test Checklist

- [ ] Node.js verze: v22.18.0 ✓
- [ ] npm verze: 10.9.3 ✓
- [ ] Všechny změny commitnuty ✓
- [ ] Port 5173 volný

---

## 🚀 KROK 1: Spuštění aplikace

### Otevři terminál a spusť:

```bash
npm run dev
```

**Očekávaný výstup:**
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**✅ Pokud vidíš toto, pokračuj na Krok 2**

**❌ Pokud vidíš chybu:**
- Zkontroluj, že nejsou chybějící dependencies: `npm install`
- Zkontroluj, že port 5173 není obsazený

---

## 🌐 KROK 2: Otevření aplikace

1. Otevři prohlížeč (doporučuji Chrome nebo Edge)
2. Jdi na: `http://localhost:5173/`
3. Počkej, až se aplikace načte

**✅ Očekáváno:** Intro screen nebo Home screen meditační aplikace

---

## 🔍 KROK 3: Otevření Developer Tools

1. Stiskni **F12** (nebo Ctrl+Shift+I)
2. Přejdi na záložku **Console**

**✅ Měl bys vidět:**
```
📊 Database viewer loaded
🧪 Offline test utilities loaded
```

**❌ Pokud NEVIDÍŠ tyto zprávy:**
- Zkontroluj, že aplikace běží v development módu
- Zkus hard reload: Ctrl+Shift+R

---

## 🧪 KROK 4: Spuštění testů

### Test 1: Rychlý status check

V Console zadej:
```javascript
offlineTest.quick()
```

**✅ ÚSPĚCH - pokud vidíš:**
```
Service Worker: ✅
Cache Service: ✅
Files Cached: 0 (nebo více)
```

**⚠️ PROBLÉM - pokud vidíš:**
```
Service Worker: ❌
```
**Řešení:** Znovu načti stránku (F5), počkej 2 sekundy, zkus znovu

---

### Test 2: Kompletní test suite

V Console zadej:
```javascript
offlineTest.run()
```

**✅ ÚSPĚCH - pokud vidíš na konci:**
```
✅ ALL TESTS PASSED
Service Worker: ✅ PASS
Cache API: ✅ PASS
Cache Service: ✅ PASS
```

**📸 DŮLEŽITÉ:** Udělej screenshot výsledků!

---

## 🔧 KROK 5: Ověření Service Worker v DevTools

1. V DevTools přejdi na záložku **Application**
2. V levém menu vyber **Service Workers**

**✅ ÚSPĚCH - pokud vidíš:**
- ✅ Status: **activated and is running**
- ✅ URL: `/sw.js`
- ✅ Scope: `http://localhost:5173/`

**📸 Udělej screenshot!**

---

## 🗄️ KROK 6: Ověření Cache Storage

1. V DevTools → **Application** tab
2. V levém menu rozbal **Cache Storage**

**✅ ÚSPĚCH - pokud vidíš:**
- `audio-v1` (nebo podobný název)
- `static-v1` (nebo podobný název)
- `dynamic-v1` (nebo podobný název)

**Klikni na každou cache a zkontroluj obsah:**
- Měl bys vidět nějaké soubory (minimálně HTML, JS, CSS)

---

## 📥 KROK 7: Test stažení audio souboru

### Pokud máš přístup k Firebase Storage URL:

V Console zadej:
```javascript
// Příklad - nahraď vlastní URL
offlineTest.testDownload(
  'test.mp3',
  'https://firebasestorage.googleapis.com/v0/b/YOUR-PROJECT/o/test.mp3?alt=media'
)
```

**✅ ÚSPĚCH - pokud vidíš:**
```
✅ Successfully cached: test.mp3
✅ Verification: Found in cache
```

**❌ PROBLÉM - pokud vidíš:**
```
❌ Failed to cache: test.mp3
```
**Možné příčiny:**
- Neplatná URL
- CORS problém (mělo by být vyřešeno)
- Network error

---

## 🌐 KROK 8: Test offline režimu

### Simulace offline:

1. V DevTools → **Network** tab
2. Najdi dropdown "No throttling" nebo "Online"
3. Změň na **Offline**

### Test 1: UI funguje offline
**✅ Očekáváno:** Aplikace stále funguje, můžeš navigovat

### Test 2: Cached soubory fungují offline
- Pokud jsi stáhl nějaké audio soubory v kroku 7
- Zkus je přehrát
- **✅ Očekáváno:** Přehrávají se z cache

### Test 3: Nové soubory nefungují offline
- Zkus načíst nový soubor, který není v cache
- **✅ Očekáváno:** Chyba "Offline" nebo "Not available"

---

## 📊 KROK 9: Kontrola Network requestů

1. Přepni zpět na **Online** (Network tab)
2. Klikni na "Clear" (ikona zakázaného kruhu)
3. Zkus přehrát nějaké audio

**✅ ÚSPĚCH - pokud vidíš v Network tabu:**
- První request na .mp3 soubor: Status 200, Type "fetch"
- Request má `(ServiceWorker)` nebo `(from ServiceWorker)`

**To znamená, že Service Worker requesty zpracovává!**

---

## 🏁 Finální checklist

### Základní funkcionalita:
- [ ] ✅ Service Worker se registruje
- [ ] ✅ Cache API je dostupná
- [ ] ✅ offlineCacheService se inicializuje
- [ ] ✅ `offlineTest.quick()` vrací všechny ✅

### Pokročilé testy:
- [ ] ✅ `offlineTest.run()` = ALL TESTS PASSED
- [ ] ✅ Service Worker viditelný v Application tab
- [ ] ✅ Cache Storage obsahuje soubory
- [ ] ✅ Test download funguje
- [ ] ✅ Offline režim funguje (UI přístupné)
- [ ] ✅ Cached audio se přehrává offline
- [ ] ✅ Network requests jdou přes Service Worker

### Firebase Storage (pokud přístupné):
- [ ] ✅ Firebase Storage requesty se NECACHUJÍ správně (no-cors)
- [ ] ✅ Audio z Firebase se stahuje a cachuje
- [ ] ✅ Opakované requesty na stejné audio = cache hit

---

## ✅ VÝSLEDEK

### Pokud máš všechny ✅:
**🎉 VŠECHNO FUNGUJE! Offline funkcionalita je OPRAVENÁ!**

### Pokud některé ❌:
1. Zapiš si, které testy selhaly
2. Zapiš error messages z konzole
3. Udělej screenshots
4. Spusť: `offlineTest.run()` a zkopíruj celý výstup

---

## 🐛 Debug Commands

Pokud něco nefunguje, zkus tyto příkazy:

```javascript
// Vymaž všechny cache a zkus znovu
await offlineTest.clear()
// Reload stránku
location.reload()

// Zobraz detailní cache info
await serviceWorkerUtils.getCacheInfo()

// Zobraz velikost cache
const size = await serviceWorkerUtils.getCacheSize()
console.log('Cache size:', size)

// Zkontroluj, jestli je SW aktivní
console.log('SW active:', serviceWorkerUtils.isServiceWorkerActive())
```

---

## 📸 Co screenshotovat

1. **Console output** z `offlineTest.run()`
2. **Application → Service Workers** status
3. **Application → Cache Storage** obsah
4. **Network tab** s požadavky přes Service Worker
5. Jakékoliv **error messages**

---

**Čas potřebný:** ~10-15 minut
**Obtížnost:** Střední
**Vyžaduje:** Chrome/Edge, základní znalost DevTools

---

**Připraven? Začni KROKEM 1! 🚀**
