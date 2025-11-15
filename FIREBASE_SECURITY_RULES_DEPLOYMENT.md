# Firebase Security Rules - Nasazení a Ověření

## Status: VYŽADUJE OVĚŘENÍ

Firebase Security Rules jsou definovány v souborech:
- `firestore.rules` - Firestore Database rules
- `storage.rules` - Firebase Storage rules

## Kritické: Ověřit nasazení

### Krok 1: Zkontrolovat aktuální nasazené rules

```bash
# Zkontroluj Firestore rules
firebase firestore:rules:get

# Zkontroluj Storage rules
firebase storage:rules:get
```

### Krok 2: Nasadit rules (pokud nejsou nasazeny)

```bash
# Nasadit obě rules najednou
firebase deploy --only firestore:rules,storage:rules

# Nebo jednotlivě:
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

### Krok 3: Ověřit nasazení

1. Přejděte na Firebase Console: https://console.firebase.google.com/
2. Vyberte projekt: `meditations-audio`
3. **Firestore Database** → **Rules** → Ověřte, že rules odpovídají `firestore.rules`
4. **Storage** → **Rules** → Ověřte, že rules odpovídají `storage.rules`

## Aktuální Rules

### Firestore Rules (`firestore.rules`)

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Veřejné čtení pro audio-metadata
    match /audio-metadata/{docId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }

    // Veřejné čtení pro cache
    match /cache/{docId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }

    // Uživatelská data - pouze vlastník
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Výchozí - zamítnout vše ostatní
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Storage Rules (`storage.rules`)

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // Veřejné čtení pro audio soubory
    match /hudba/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
      allow create: if request.auth != null &&
                       request.auth.token.admin == true &&
                       request.resource.size < 50 * 1024 * 1024 &&
                       request.resource.contentType.matches('audio/.*');
    }

    // Podobně pro slova, dychanie, meditacie, metadata, shader-previews
    // ...

    // Výchozí - zamítnout vše ostatní
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Testování Rules

### Test Firestore Rules

```bash
# Spusť emulátor
firebase emulators:start --only firestore

# Test rules pomocí Firebase Rules Unit Testing
# (vyžaduje vytvoření test souborů)
```

### Test Storage Rules

```bash
# Spusť emulátor
firebase emulators:start --only storage

# Test rules pomocí Firebase Rules Unit Testing
```

## Důležité poznámky

1. **Admin token:** Rules vyžadují `request.auth.token.admin == true` pro zápis
   - Toto vyžaduje nastavení custom claims v Firebase Auth
   - Zkontrolujte, že admin uživatelé mají správně nastavené custom claims

2. **Veřejné čtení:** Audio soubory a metadata jsou veřejně čitelné
   - To je záměrné - meditační audio je veřejné
   - Zápis je chráněn admin tokenem

3. **Velikost souborů:** Storage rules omezují upload na 50MB
   - Pro audio soubory je to rozumné omezení
   - Pro metadata soubory je limit 5MB

## Automatizace

Pro automatické nasazení při CI/CD:

```yaml
# .github/workflows/deploy-rules.yml (příklad)
name: Deploy Firebase Rules
on:
  push:
    paths:
      - 'firestore.rules'
      - 'storage.rules'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: meditations-audio
          targets: firestore:rules,storage:rules
```

## Checklist

- [ ] Ověřit, že rules jsou nasazeny v produkci
- [ ] Otestovat veřejné čtení (bez autentizace)
- [ ] Otestovat admin zápis (s admin tokenem)
- [ ] Otestovat zamítnutí neautorizovaného zápisu
- [ ] Nastavit custom claims pro admin uživatele
- [ ] Nastavit CI/CD pro automatické nasazení (volitelné)

## Kontakt

Pokud máte problémy s nasazením rules, zkontrolujte:
1. Firebase CLI je nainstalován: `firebase --version`
2. Jste přihlášeni: `firebase login`
3. Projekt je správně nastaven: `firebase use meditations-audio`



