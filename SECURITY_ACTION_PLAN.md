# 🚨 Bezpečnostní Akční Plán - Prioritní Opravy

## 🔴 KRITICKÉ - OPRAVIT OKAMŽITĚ

### 1. Opravit Firebase Security Rules

**Soubor:** `firestore.rules`

**Současný stav:**
```javascript
// ⚠️ KRITICKÉ - kdokoli může zapisovat
allow write: if true;
```

**Oprava:**
```javascript
// Pravidla pro audio-metadata kolekci
match /audio-metadata/{docId} {
  // Veřejné čtení pro všechny (meditační data jsou veřejná)
  allow read: if true;

  // Zápis POUZE pro autentifikované admin uživatele
  allow write: if request.auth != null &&
                  request.auth.token.admin == true &&
                  // Validace dat
                  request.resource.data.keys().hasAll(['fileName', 'duration', 'size']) &&
                  request.resource.data.fileName is string &&
                  request.resource.data.duration is number &&
                  request.resource.data.size is number;
}
```

**Akce:**
1. Odomknout komentář v `firestore.rules` (řádek 14-16)
2. Zakomentovat `allow write: if true;`
3. Přidat data validation
4. Deploy: `firebase deploy --only firestore:rules`

---

### 2. Přidat Security Headers do Firebase Hosting

**Soubor:** `firebase.json`

**Současný stav:**
- Chybí CSP, HSTS, X-Frame-Options headers

**Oprava:**
```json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self' https://*.firebase.com https://*.googleapis.com https://*.gstatic.com; script-src 'self' https://*.firebase.com https://*.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; media-src 'self' blob: data: https:; connect-src 'self' https://*.firebase.com https://*.googleapis.com wss://*.firebase.com; object-src 'none'; frame-src 'none';"
          },
          {
            "key": "Strict-Transport-Security",
            "value": "max-age=31536000; includeSubDomains; preload"
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
          }
        ]
      },
      // ... existující headers pro JS, CSS, images ...
    ]
  }
}
```

**Akce:**
1. Přidat security headers do `firebase.json`
2. Deploy: `firebase deploy --only hosting`

---

### 3. Implementovat Rate Limiting

**Soubor:** `src/utils/rateLimiter.js` (nový)

**Oprava:**
```javascript
/**
 * Rate Limiter pro Firebase operace
 */

class RateLimiter {
  constructor(maxRequests = 10, windowMs = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async checkLimit() {
    const now = Date.now();

    // Odstraň staré requesty
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.windowMs
    );

    // Kontrola limitu
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);

      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.checkLimit();
      }
    }

    // Přidej nový request
    this.requests.push(now);
    return true;
  }
}

// Singleton instance
export const firebaseRateLimiter = new RateLimiter(10, 1000); // 10 requestů za sekundu

// Wrapper pro Firebase operace
export const withRateLimit = async (operation) => {
  await firebaseRateLimiter.checkLimit();
  return await operation();
};
```

**Použití:**
```javascript
import { withRateLimit } from '@utils/rateLimiter';

// Před:
await updateDoc(docRef, data);

// Po:
await withRateLimit(() => updateDoc(docRef, data));
```

---

## 🟡 VYSOKÁ PRIORITA - OPRAVIT DO 1 TÝDNE

### 4. Přidat Input Validation

**Soubor:** `src/components/TimePickerModal.jsx`

**Oprava:**
```javascript
import { validateNumber, validateString } from '@utils/validation';

// Validace před použitím
const validatedMin = validateNumber(min, 0, 1000) || 0;
const validatedMax = validateNumber(max, validatedMin, 1000) || 1000;
const validatedStep = validateNumber(step, 1, 100) || 1;
```

**Soubor:** `src/components/WheelPicker.jsx`

**Oprava:**
```javascript
import { validateNumber } from '@utils/validation';

// Validace hodnoty
const validatedValue = validateNumber(value, min, max) || min;
```

---

### 5. Přidat Error Boundaries

**Soubor:** `src/components/LazyErrorBoundary.jsx` (nový)

**Oprava:**
```javascript
import React from 'react';
import ErrorBoundary from './ErrorBoundary';

export const LazyErrorBoundary = ({ children }) => {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
};
```

**Použití v `src/App.jsx`:**
```javascript
import { LazyErrorBoundary } from '@components/LazyErrorBoundary';

<LazyErrorBoundary>
  <LazyIntroScreen />
</LazyErrorBoundary>
```

---

### 6. Aktivovat Error Monitoring v Produkci

**Soubor:** `src/services/errorMonitoring.js`

**Současný stav:**
```javascript
this.isEnabled = import.meta.env.MODE === 'production';
```

**Oprava:**
- ✅ Už je správně nastaveno pro produkci
- ⚠️ Zkontrolovat, že Firebase Functions jsou připravené pro error reporting

**Akce:**
1. Ověřit, že error monitoring je aktivní v produkci
2. Nastavit Firebase Functions pro error reporting
3. Přidat alerting pro kritické chyby

---

## 🟢 STŘEDNÍ PRIORITA - OPRAVIT DO 1 MĚSÍCE

### 7. Implementovat Firebase Authentication pro Admin

**Soubor:** `src/services/adminAuth.js` (nový)

**Oprava:**
```javascript
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@config/secure-firebase';

export const adminAuth = {
  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdTokenResult();

      if (token.claims.admin !== true) {
        throw new Error('User is not an admin');
      }

      return userCredential.user;
    } catch (error) {
      console.error('Admin authentication failed:', error);
      throw error;
    }
  },

  async signOut() {
    await auth.signOut();
  },

  isAdmin() {
    return auth.currentUser?.getIdTokenResult()
      .then(token => token.claims.admin === true)
      .catch(() => false);
  }
};
```

---

### 8. Přidat Automated Security Testing

**Soubor:** `.github/workflows/security.yml` (nový)

**Oprava:**
```yaml
name: Security Audit

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * 0' # Každou neděli

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Run npm audit
        run: npm audit --production

      - name: Run dependency check
        run: npm audit --audit-level=high

      - name: Check for known vulnerabilities
        run: npm audit --json > audit-report.json

      - name: Upload audit report
        uses: actions/upload-artifact@v3
        with:
          name: audit-report
          path: audit-report.json
```

---

## 📋 CHECKLIST

### Kritické (do 24 hodin):
- [ ] Opravit `firestore.rules` - omezit zápis na admin
- [ ] Přidat security headers do `firebase.json`
- [ ] Deploy Firebase rules: `firebase deploy --only firestore:rules`
- [ ] Deploy hosting: `firebase deploy --only hosting`

### Vysoká priorita (do 1 týdne):
- [ ] Implementovat rate limiter
- [ ] Přidat input validation do komponent
- [ ] Přidat error boundaries kolem lazy loaded komponent
- [ ] Aktivovat error monitoring v produkci

### Střední priorita (do 1 měsíce):
- [ ] Implementovat Firebase Authentication pro admin
- [ ] Přidat automated security testing do CI/CD
- [ ] Přidat dependency vulnerability scanning
- [ ] Nastavit security event logging

---

## 🚀 POSTUP NASAZENÍ

### Krok 1: Opravit Security Rules
```bash
# 1. Editovat firestore.rules
# 2. Odomknout admin check
# 3. Deploy
firebase deploy --only firestore:rules
```

### Krok 2: Přidat Security Headers
```bash
# 1. Editovat firebase.json
# 2. Přidat security headers
# 3. Deploy
firebase deploy --only hosting
```

### Krok 3: Implementovat Rate Limiting
```bash
# 1. Vytvořit src/utils/rateLimiter.js
# 2. Použít v Firebase operacích
# 3. Testovat
npm run build
npm run preview
```

### Krok 4: Testování
```bash
# 1. Testovat v lokálním prostředí
firebase emulators:start

# 2. Testovat v staging
firebase deploy --only hosting --project staging

# 3. Deploy na produkci
firebase deploy --only hosting,firestore:rules
```

---

## ⚠️ POZOR

1. **Před deployem security rules** - ujistěte se, že máte admin účet nastavený
2. **Testování** - otestujte všechny změny v lokálním prostředí
3. **Backup** - před deployem zálohujte současné Firebase rules
4. **Monitoring** - po deployi sledujte error logs a uživatelské hlášky

---

## 📞 KONTAKT

V případě problémů s deployem nebo otázkami k bezpečnostním opravám:
- Zkontrolujte Firebase Console pro error logs
- Zkontrolujte browser console pro client-side chyby
- Ověřte Firebase Security Rules v Firebase Console

