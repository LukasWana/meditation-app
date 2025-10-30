# Admin Panel - Plán oprav

## 🎯 Požadavky uživatele

Admin panel má mít tyto funkce:
1. ✅ Načtení MP3 souborů z Firebase Storage
2. ❌ **Změření času (duration)** - NEFUNGUJE SPRÁVNĚ
3. ✅ Příprava metadat
4. ✅ Nahrání metadat do Realtime Database
5. ❌ **Hlídání změn na Firebase** - CHYBÍ
6. ? Doplňování a aktualizace metadat
7. ❌ **Statistiky** - MINIMÁLNÍ

---

## 🔍 Současný stav - Identifikované problémy

### ❌ PROBLÉM #1: Nepřesné měření duration

**Soubor:** `SimpleAdminScreen.jsx:310-317`

**Současný kód:**
```javascript
const estimateDurationFromSize = (sizeInBytes) => {
  if (sizeInBytes <= 0) {
    return 300; // 5 minut - výchozí odhad
  }
  const sizeInMB = sizeInBytes / (1024 * 1024);
  return Math.round(sizeInMB * 60); // ❌ ŠPATNĚ! Předpokládá 1MB = 1 minuta
};
```

**Proč to nefunguje:**
- MP3 různé bitrate mají různé velikosti:
  - 128 kbps: ~1MB za minutu ✓
  - 192 kbps: ~1.44MB za minutu ❌
  - 320 kbps: ~2.4MB za minutu ❌
- Odhad je nepřesný pro většinu souborů!

**Řešení:**
- Použít Audio API pro načtení skutečné délky z MP3 metadata
- Funkce `getAudioDuration` už existuje v `useFirebaseHudbaScanner.js:12-37`
- Díky opravě Service Worker nyní funguje bez CORS problémů

---

### ❌ PROBLÉM #2: Žádné sledování změn Firebase

**Co chybí:**
- Automatické sledování změn na Firebase Storage
- Když někdo přidá nový MP3, admin panel o tom neví
- Musí se ručně spustit "Kompletní synchronizace"

**Řešení:**
- Implementovat Firebase Storage listener
- Při změně automaticky:
  1. Detekovat nový/změněný soubor
  2. Extrahovat metadata
  3. Aktualizovat Realtime Database

**Poznámka:**
- Firebase Storage nemá nativní change listeners
- Alternativy:
  1. Cloud Functions Trigger (vyžaduje Firebase Functions)
  2. Polling (kontrola každých X minut)
  3. Manuální trigger po uploadu

**Doporučené řešení:**
- Přidat tlačítko "Zkontrolovat nové soubory"
- Porovná Storage vs Realtime DB
- Přidá jen nové/změněné soubory

---

### ❌ PROBLÉM #3: Minimální statistiky

**Co má:**
- checkStatus() - zobrazí počet souborů z Firestore
- To je vše

**Co chybí (podle požadavků):**
1. ✅ **Firebase connectivity** - "jestli umí Firebase"
   - Test connection k Storage, Realtime DB, Firestore

2. ✅ **Deployment info** - "tam kde mam tu apku"
   - URL aplikace
   - Environment (dev/prod)
   - Firebase project info

3. ✅ **App status** - "jestli se spouští"
   - Uptime
   - Last sync time
   - Service Worker status

4. ✅ **Data usage** - "kolik dat se stahuje"
   - Celková velikost souborů
   - Počet stažených souborů
   - Cache size
   - Network traffic estimates

**Řešení:**
- Vytvořit nový komponent `FirebaseMonitoring`
- Zobrazit všechny statistiky přehledně

---

## 🛠️ Plán implementace

### FÁZE 1: Opravit duration extraction ⚡ P0

**Úkoly:**
1. Přidat `getAudioDuration` funkci do admin panelu
2. Nahradit `estimateDurationFromSize` skutečným měřením
3. Přidat progress bar pro měření (může trvat déle)
4. Fallback na odhad pokud skutečné měření selže

**Odhadovaný čas:** 30 minut

**Soubory k úpravě:**
- `SimpleAdminScreen.jsx`

---

### FÁZE 2: Přidat Firebase monitoring 📊 P1

**Úkoly:**
1. Vytvořit `FirebaseMonitoring` komponent
2. Přidat Firebase connectivity testy
3. Zobrazit deployment info
4. Přidat data usage statistiky
5. Přidat app status monitoring

**Odhadovaný čas:** 45 minut

**Nové soubory:**
- `src/components/admin/FirebaseMonitoring.jsx`

---

### FÁZE 3: Přidat change detection 🔍 P1

**Úkoly:**
1. Přidat funkci "Zkontrolovat nové soubory"
2. Porovnat Storage vs Realtime DB
3. Identifikovat nové/změněné soubory
4. Přidat možnost přidat jen nové soubory (ne všechny)

**Odhadovaný čas:** 30 minut

**Soubory k úpravě:**
- `SimpleAdminScreen.jsx`

---

### FÁZE 4: Zjednodušit UI (volitelné) 🎨 P2

**Úkoly:**
1. Sjednotit "Kompletní sync" a "Rychlá sync"
2. Přidat jednoduché "Sync všech změn" tlačítko
3. Přesunout offline download na samostatnou stránku

**Odhadovaný čas:** 20 minut

---

## 📋 Celkový odhad času

- **Fáze 1 (P0):** 30 minut - Duration extraction
- **Fáze 2 (P1):** 45 minut - Firebase monitoring
- **Fáze 3 (P1):** 30 minut - Change detection
- **Fáze 4 (P2):** 20 minut - UI cleanup

**Celkem:** ~2 hodiny pro P0+P1 priority

---

## ✅ Očekávané výsledky

Po opravách bude admin panel:

1. ✅ **Přesně měřit duration** - Audio API místo odhadu
2. ✅ **Detekovat nové soubory** - Porovnání Storage vs DB
3. ✅ **Zobrazovat statistiky** - Firebase connectivity, deployment, data usage
4. ✅ **Automaticky aktualizovat** - Nové soubory se přidají jedním kliknutím

---

## 🚀 Začněme!

**Začínáme s Fází 1 - Duration Extraction**

Priority:
1. ⚡ **NYNÍ:** Fáze 1 - Opravit duration (P0)
2. 📊 **PAK:** Fáze 2 - Firebase monitoring (P1)
3. 🔍 **PAK:** Fáze 3 - Change detection (P1)
4. 🎨 **MOŽNÁ:** Fáze 4 - UI cleanup (P2)
