# 🚨 BEZPEČNOSTNÍ INCIDENT - OKAMŽITÉ AKCE

## INCIDENT: Firebase API klíč byl vystaven v konverzaci

### PRIORITA: KRITICKÁ - VYŘEŠIT OKAMŽITĚ

## KROK 1: REGENEROVAT FIREBASE KLÍČE (HNED TEĎ!)

1. Přejděte na Firebase Console: https://console.firebase.google.com/
2. Vyberte projekt: `meditations-audio`
3. Přejděte na **Project Settings** (ikona ozubeného kolečka)
4. V sekci **General** najděte **Web API Key**
5. Klikněte na **Regenerate API Key**
6. Zkopírujte nový klíč do `.env` souboru

## KROK 2: AKTUALIZOVAT .ENV SOUBOR

```bash
# Firebase Configuration - NOVÉ KLÍČE
VITE_FIREBASE_API_KEY=NOVÝ_KLÍČ_ZDE
VITE_FIREBASE_AUTH_DOMAIN=meditations-audio.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=meditations-audio
VITE_FIREBASE_STORAGE_BUCKET=meditations-audio.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=312837067375
VITE_FIREBASE_APP_ID=NOVÝ_APP_ID_ZDE
```

## KROK 3: PŘIDAT .ENV DO .GITIGNORE

```bash
# Přidejte do .gitignore:
.env
.env.local
.env.*.local
```

## KROK 4: ZKONTROLOVAT GIT HISTORII

```bash
# Zkontrolujte, zda .env není v git historii:
git log --all --full-history -- .env

# Pokud je, musíte vyčistit historii:
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all
```

## KROK 5: NASTAVIT FIREBASE SECURITY RULES

### Storage Rules (storage.rules):
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // Pouze čtení pro všechny (audio soubory jsou veřejné)
      allow read: if true;
      // Zápis POUZE z administrátorského účtu
      allow write: if request.auth != null &&
                      request.auth.token.admin == true;
    }
  }
}
```

### Firestore Rules (firestore.rules):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /metadata/{document=**} {
      // Čtení pro všechny
      allow read: if true;
      // Zápis POUZE pro autentifikované admin uživatele
      allow write: if request.auth != null &&
                      request.auth.token.admin == true;
    }
  }
}
```

## KROK 6: NASADIT SECURITY RULES

```bash
# Nasaďte nové security rules:
firebase deploy --only storage
firebase deploy --only firestore
```

## KROK 7: IMPLEMENTOVAT APP CHECK (DŮRAZNĚ DOPORUČENO)

Firebase App Check chrání vaše Firebase služby před zneužitím:

```bash
npm install firebase-app-check
```

```javascript
// src/services/firebase.js
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// Po initializeApp:
const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('YOUR_RECAPTCHA_SITE_KEY'),
  isTokenAutoRefreshEnabled: true
});
```

## KROK 8: MONITORING A ALERTING

1. Zapněte Firebase monitoring v konzoli
2. Nastavte alerty pro neobvyklou aktivitu
3. Pravidelně kontrolujte Firebase Usage Dashboard

## TIMELINE:

- [ ] **0-5 minut**: Regenerovat API klíče
- [ ] **5-10 minut**: Aktualizovat .env a .gitignore
- [ ] **10-20 minut**: Nasadit security rules
- [ ] **20-30 minut**: Implementovat App Check
- [ ] **30-60 minut**: Testování a validace

## PREVENCE DO BUDOUCNA:

1. ✅ NIKDY necommitovat .env soubory
2. ✅ VŽDY používat .env.example pro dokumentaci
3. ✅ VŽDY kontrolovat git status před commitem
4. ✅ Používat pre-commit hooks pro detekci secrets
5. ✅ Pravidelně rotovat API klíče
6. ✅ Implementovat App Check pro produkci

---
**Datum incidentu:** ${new Date().toISOString()}
**Severity:** CRITICAL
**Status:** VYŽADUJE OKAMŽITÉ ŘEŠENÍ

