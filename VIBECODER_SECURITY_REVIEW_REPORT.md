# Vibecoder Security Review: Meditační Aplikace

**Datum:** 2024-12-19
**Revizor:** AI Security Review
**Metodika:** vibecoder-review.md

## Shrnutí

Nalezeno **5 high-priority** problémů, **4 medium-priority** problémy a **3 low-priority** problémy v React + Firebase aplikaci.

**Stack:** React 18.2.0, Firebase 12.4.0, Vite 7.1.11
**Environment:** Production-ready, ale s několika bezpečnostními mezerami
**Auth pattern:** Firebase Auth s custom claims pro admin oprávnění

---

## KRITICKÉ NÁLEZY (High Priority)

### [CRITICAL] Firebase Functions bez admin validace

**Lokace:** `functions/metadataSync.js:808-815`, `functions/metadataSync.js:70-83`

**Problém:** Firebase Cloud Functions `syncAllFiles` a `testMetadata` nemají žádnou autentifikaci ani autorizaci. Kdokoli může tyto funkce volat.

```javascript
exports.syncAllFiles = functions
  .https
  .onCall(async (_data, _context) => {
    // ❌ Žádná kontrola _context.auth
    // ❌ Žádná kontrola admin oprávnění
  });

exports.testMetadata = functions
  .https
  .onCall(async (_data, _context) => {
    // ❌ Veřejně dostupné
  });
```

**Dopad:**
- Útočník může spustit nákladné operace (sync všech souborů)
- Možnost DoS útoku
- Zneužití cloud resources

**Attack scenario:**
1. Útočník zjistí Firebase project ID
2. Volá `https://us-central1-<project>.cloudfunctions.net/syncAllFiles`
3. Spustí se nákladná operace na vašem účtu

**Řešení:**
```javascript
exports.syncAllFiles = functions
  .https
  .onCall(async (_data, context) => {
    // ✅ Přidej autentifikaci
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    // ✅ Přidej admin check
    const token = await admin.auth().getUser(context.auth.uid);
    if (!token.customClaims?.admin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    // ... zbytek kódu
  });
```

---

### [CRITICAL] Client-side pouze admin kontrola

**Lokace:** `src/components/AdminGuard.jsx:4-55`

**Problém:** AdminGuard kontroluje admin oprávnění pouze na client-side. Útočník může upravit JavaScript nebo použít React DevTools k obejití kontroly.

```javascript
export const AdminGuard = ({ children }) => {
  const { user, isAdmin, isLoading } = useAuth();

  if (!isAdmin) {
    return <div>Nemáte oprávnění</div>; // ❌ Pouze UI kontrola
  }

  return children; // Admin komponenty se renderují
};
```

**Dopad:**
- Útočník může upravit `isAdmin` v React DevTools
- Admin UI se může zobrazit (i když API volání selžou)
- Možnost zjištění admin funkcionalit

**Attack scenario:**
1. Útočník se přihlásí jako běžný uživatel
2. Otevře React DevTools
3. Změní `isAdmin: false` na `isAdmin: true`
4. Admin UI se zobrazí (i když API volání selžou)

**Řešení:**
- ✅ Firestore a Storage rules již mají server-side validaci (správně)
- ⚠️ AdminGuard je OK jako první vrstva, ale musí být doplněn o:
  - Server-side validaci všech admin operací
  - Error handling pro neautorizované požadavky
  - Logging podezřelých pokusů o přístup

**Poznámka:** Firestore a Storage rules již správně validují admin oprávnění server-side, takže skutečné operace jsou chráněny. Problém je pouze v UX.

---

### [HIGH] React Router zranitelnosti

**Lokace:** `package.json:32`

**Problém:** `react-router-dom@7.9.4` obsahuje 4 známé zranitelnosti:
- **GHSA-2w69-qvjg-hvjx:** XSS via Open Redirects (CVSS 8.0)
- **GHSA-8v8x-cx79-35w7:** SSR XSS in ScrollRestoration (CVSS 8.2)
- **GHSA-h5cw-625j-3rxh:** CSRF issue (CVSS 6.5)
- **GHSA-9jcx-v3wj-wh4m:** Unexpected external redirect (CVSS 6.5)

**Dopad:**
- XSS útoky přes redirecty
- CSRF útoky na formuláře
- Redirect na externí škodlivé stránky

**Řešení:**
```bash
npm audit fix
# Nebo manuálně:
npm install react-router-dom@^7.12.0
```

---

### [HIGH] Security headers nejsou aplikovány

**Lokace:** `firebase.json:15-69`, `src/utils/security-headers.js`

**Problém:** Utility pro security headers existuje (`src/utils/security-headers.js`), ale headers nejsou aplikovány v `firebase.json`. Aplikace nemá CSP, X-Frame-Options, HSTS atd.

**Dopad:**
- Chybí ochrana proti XSS (CSP)
- Chybí ochrana proti clickjacking (X-Frame-Options)
- Chybí HSTS pro HTTPS enforcement
- Chybí další security headers

**Řešení:**
Přidej do `firebase.json`:
```json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self' https://*.firebase.com https://*.googleapis.com https://*.gstatic.com; script-src 'self' https://*.firebase.com https://*.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https://*.firebase.com https://*.googleapis.com wss://*.firebase.com; media-src 'self' blob: data: https:; object-src 'none'; frame-src 'none'; worker-src 'self' blob:; manifest-src 'self'"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          },
          {
            "key": "Referrer-Policy",
            "value": "strict-origin-when-cross-origin"
          },
          {
            "key": "Strict-Transport-Security",
            "value": "max-age=31536000; includeSubDomains; preload"
          }
        ]
      }
    ]
  }
}
```

---

### [HIGH] Debug kód v produkci

**Lokace:** `src/App.jsx:233-274`, `src/components/ThemeSelector.jsx`, `src/hooks/useBreathAudioEngine.js`

**Problém:** Mnoho `console.log`, `console.debug` a debug funkcí v produkčním kódu. Debug funkce jsou dostupné v `window` objektu.

```javascript
// src/App.jsx:233-274
window.testAudioPlayback = async (fileName) => { ... };
window.setLogLevel = async (level) => { ... };
window.showDatabaseData = () => { ... };
window.debugSlovaFiles = () => { ... };
window.debugCache = () => { ... };
window.clearCache = () => { ... };
```

**Dopad:**
- Zbytečné logování v produkci (výkon)
- Debug funkce mohou být zneužity
- Exponování interní struktury aplikace

**Řešení:**
1. Obalit všechny console.log do podmínky:
```javascript
if (import.meta.env.MODE === 'development') {
  console.log(...);
}
```

2. Odstranit debug funkce z `window` v produkci:
```javascript
if (import.meta.env.MODE === 'development') {
  window.testAudioPlayback = ...;
  // atd.
}
```

3. Použít logger service, který respektuje environment

---

## STŘEDNÍ PRIORITA (Medium Priority)

### [MEDIUM] Chybí rate limiting

**Lokace:** Firebase Functions, Firebase Auth endpoints

**Problém:** Žádné rate limiting na:
- Firebase Auth endpoints (login, signup)
- Firebase Functions
- Firebase Storage uploads

**Dopad:**
- Brute force útoky na login
- DoS útoky na Functions
- Zneužití Storage quota

**Řešení:**
- Implementovat rate limiting v Firebase Functions pomocí `express-rate-limit`
- Použít Firebase App Check (již připraveno, ale neaktivní)
- Nastavit Firebase Storage quotas

---

### [MEDIUM] CSP má unsafe-inline v produkci

**Lokace:** `src/utils/security-headers.js:164-177`

**Problém:** Production CSP má `allowInlineStyles: true`, což umožňuje `'unsafe-inline'` v style-src.

**Dopad:**
- Omezená ochrana proti XSS přes inline styles
- Nemožnost použít strict CSP

**Řešení:**
- Použít nonce nebo hash pro inline styles
- Nebo přesunout všechny inline styles do externích souborů

---

### [MEDIUM] Test skripty v produkčním kódu

**Lokace:** `src/scripts/debugRealtimeDB.js`, `src/scripts/testFirebaseAuth.js`, `src/features/meditation/screens/*Debug.jsx`

**Problém:** Test a debug skripty jsou v produkčním kódu, i když nejsou importovány.

**Dopad:**
- Zbytečný kód v bundle
- Možnost náhodného importu
- Zmatení při code review

**Řešení:**
- Přesunout do `src/tests/` nebo `src/__tests__/`
- Nebo přidat do `.gitignore` pokud jsou pouze lokální

---

### [MEDIUM] Hardcoded test API key (fake, ale zavádějící)

**Lokace:** `src/scripts/debugRealtimeDB.js:6`

**Problém:** Fake API key v debug skriptu může být zaměněn za skutečný.

```javascript
const firebaseConfig = {
  apiKey: "FAKE_KEY_FOR_TESTING_ONLY", // ❌ Fake (záměrně ne-vzor Firebase API key)
  // ...
};
```

**Dopad:**
- Zavádějící při code review
- Možnost náhodného commitnutí skutečného klíče

**Řešení:**
- Použít zřetelně fake hodnoty: `"FAKE_KEY_FOR_TESTING_ONLY"`
- Nebo použít environment variables i v test skriptech

---

## NÍZKÁ PRIORITA (Low Priority)

### [LOW] VITE_DEBUG_PERFORMANCE flag

**Lokace:** `src/config/performance.js:39`

**Problém:** Environment flag `VITE_DEBUG_PERFORMANCE` může být nastaven v produkci.

**Dopad:**
- Možnost aktivace debug módu v produkci

**Řešení:**
- Ověřit, že flag není nastaven v produkčním build procesu

---

### [LOW] Chybí CSRF ochrana

**Lokace:** Firebase Functions (onCall)

**Problém:** Firebase Functions `onCall` nemají explicitní CSRF ochranu (ale Firebase to řeší automaticky).

**Dopad:**
- Teoretické CSRF riziko (nízké, protože Firebase má vlastní ochranu)

**Řešení:**
- Firebase automaticky řeší CSRF pro `onCall` funkce
- Pro `onRequest` funkce použít CSRF tokens

---

### [LOW] Verbose error messages

**Lokace:** Různé error handlers

**Problém:** Některé error messages mohou být příliš podrobné.

**Dopad:**
- Možnost zjištění interní struktury aplikace

**Řešení:**
- Zkontrolovat všechny error messages
- V produkci zobrazovat pouze obecné chybové zprávy

---

## POZITIVNÍ NÁLEZY

### ✅ Secrets správně spravovány
- Firebase API klíče jsou v `.env` souboru
- `.env` je v `.gitignore`
- Žádné hardcoded secrets v kódu
- `.env` není v git historii

### ✅ Firestore a Storage rules správně nastaveny
- Ownership checks pro user data
- Admin-only write operace
- Veřejné čtení pouze pro veřejná data

### ✅ File upload validace
- Storage rules validují file type (audio/.*, image/.*)
- Size limits (50MB pro audio, 20MB pro obrázky)
- Admin-only uploads

### ✅ Input validation existuje
- `sanitizeHtml` funkce v `src/utils/validation.js`
- React automaticky escapuje user input

### ✅ Command injection ochrana
- `spawn()` v functions používá hardcoded parametry
- Žádný user input v shell commands

---

## QUICK WINS

1. **Aktualizovat react-router-dom:**
   ```bash
   npm audit fix
   ```

2. **Přidat security headers do firebase.json:**
   - Zkopírovat z `src/utils/security-headers.js` do `firebase.json`

3. **Odebrat debug funkce z produkce:**
   - Obalit `window.*` debug funkce do `if (import.meta.env.MODE === 'development')`

4. **Přidat admin validaci do Firebase Functions:**
   - Přidat `context.auth` check do `syncAllFiles` a `testMetadata`

5. **Odstranit console.log z produkce:**
   - Použít logger service nebo podmínky

---

## DOPORUČENÍ

### Okamžité akce (dnes):
1. ✅ Aktualizovat react-router-dom
2. ✅ Přidat admin validaci do Firebase Functions
3. ✅ Přidat security headers do firebase.json

### Tento týden:
4. ✅ Odebrat debug kód z produkce
5. ✅ Implementovat rate limiting
6. ✅ Aktivovat Firebase App Check

### Tento měsíc:
7. ✅ Code review všech error messages
8. ✅ Přesunout test skripty do správných složek
9. ✅ Implementovat CSP reporting

---

## KONTEXT

**Architektura:**
- Frontend: React SPA s Vite
- Backend: Firebase (Firestore, Storage, Functions, Auth)
- Hosting: Firebase Hosting

**Bezpečnostní opatření již implementována:**
- Firebase Security Rules (Firestore, Storage, Realtime Database)
- Environment-based konfigurace
- Input validation utilities
- Security headers utility (ale neaplikováno)

**Zjištěné vzory:**
- "Move fast" vzory: debug kód v produkci, chybějící rate limiting
- "AI-generated" vzory: utility existuje, ale není použita (security headers)
- "I'll fix it later" vzory: TODO komentáře, debug funkce

---

## ZÁVĚR

Aplikace má solidní základ (Firebase Security Rules, správné secrets management), ale má několik kritických mezer:
1. Veřejně dostupné Firebase Functions
2. Chybějící security headers
3. Zranitelnosti v dependencies

Většina problémů je snadno opravitelná a nevyžaduje architektonické změny.

**Celkové hodnocení:** 6/10 - Dobrý základ, ale potřebuje bezpečnostní hardening před produkčním nasazením.

---

## Re-check (2026-01-13)

Níže je ověření nálezů proti aktuálnímu repu + stav oprav.

### Kritické / High

- **[CRITICAL] Firebase Functions bez admin validace**: **OPRAVENO**
  - **Poznámka**: Nešlo jen o `syncAllFiles` a `testMetadata` – v `functions/metadataSync.js` bylo víc `.onCall()` endpointů bez kontroly a také `functions/generateWaveform.js`.
  - **Fix**: Všechny nákladné/admin operace přes callable Functions nyní vyžadují `context.auth` a `context.auth.token.admin === true`.

- **[CRITICAL] Client-side pouze admin kontrola**: **PLATÍ, ale je to primárně UX**
  - `AdminGuard` je jen UI vrstva. Skutečná ochrana musí být server-side.
  - **Ověřeno**: Firestore/Storage rules kontrolují `request.auth.token.admin == true` pro write operace.

- **[HIGH] React Router zranitelnosti**: **OPRAVENO**
  - `react-router-dom` aktualizováno na `^7.12.0`.
  - `npm audit` po aktualizaci: **0 vulnerabilities**.

- **[HIGH] Security headers nejsou aplikovány**: **OPRAVENO**
  - `firebase.json` nyní obsahuje globální security headers (CSP + XFO + HSTS + další).
  - **Poznámka**: CSP je záměrně “pragmatická” (např. `style-src 'unsafe-inline'`) kvůli kompatibilitě – viz medium nález níže.

- **[HIGH] Debug kód v produkci**: **ČÁSTEČNĚ ZASTARALÉ, ale našel se jiný reálný problém**
  - `App.jsx` debug utilitky jsou už **dev-only** (gated přes `import.meta.env.MODE === 'development'`).
  - **Nový nález**: `src/main.jsx` dříve vždy načítal `updateFirebaseTranslationsHelper.js`, který exportoval `window.updateFirebaseTranslations` i v produkci. To je nyní **dev-only**.

### Medium

- **[MEDIUM] Chybí rate limiting**: **STÁLE PLATÍ (doporučení)**
  - Neřešeno v rámci tohoto re-checku (vyžaduje návrh: App Check + per-endpoint limity).

- **[MEDIUM] CSP má unsafe-inline v produkci**: **STÁLE PLATÍ (trade-off)**
  - Aktuální CSP v `firebase.json` ponechává `style-src 'unsafe-inline'` pro kompatibilitu.
  - Pokud chceš “strict CSP”, bude potřeba audit inline stylů a přechod na nonce/hash (nebo CSP3 `style-src-attr`).

- **[MEDIUM] Test skripty v produkčním kódu**: **ČÁSTEČNĚ PLATÍ**
  - Z hlediska bundlu se většina těchto souborů nedostane do produkce, pokud není importována.
  - Pořád je to ale riziko “náhodného importu” / šumu v repu.

- **[MEDIUM] Hardcoded test API key (fake)**: **NEŘEŠENO (low effort)**
  - Doporučení platí, ale není bezpečnostně kritické.

### Low

- **[LOW] VITE_DEBUG_PERFORMANCE flag**: **NEOVĚŘENO v build pipeline** (doporučení platí)
- **[LOW] Chybí CSRF ochrana**: **OK pro onCall**, relevantní až pro `onRequest`
- **[LOW] Verbose error messages**: **NEOVĚŘENO plošně** (doporučení platí)