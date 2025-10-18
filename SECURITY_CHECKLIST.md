# 🔒 BEZPEČNOSTNÍ CHECKLIST - MEDITAČNÍ APLIKACE

## ⚡ OKAMŽITÉ AKCE (DNES!)

### 1️⃣ Regenerovat Firebase API klíč
```
Status: [ ] NEPROVEDENO

Kroky:
1. Otevřít: https://console.firebase.google.com/project/meditations-audio
2. Přejít na: Settings (⚙️) → Project Settings → General
3. Najít sekci "Web API Key"
4. Kliknout na "Regenerate API Key"
5. Zkopírovat nový klíč

Důvod: Současný API klíč byl vystaven a je nyní veřejný!
```

### 2️⃣ Aktualizovat .env soubor
```
Status: [ ] NEPROVEDENO

Příkaz:
nano .env  # nebo otevřít v editoru

Nahradit:
VITE_FIREBASE_API_KEY=STARÝ_KLÍČ
↓
VITE_FIREBASE_API_KEY=NOVÝ_REGENEROVANÝ_KLÍČ

Uložit a zavřít
```

### 3️⃣ Nasadit Firebase Security Rules
```
Status: [ ] NEPROVEDENO

Příkazy:
firebase deploy --only storage
firebase deploy --only firestore

Ověření:
- Storage rules: https://console.firebase.google.com/project/meditations-audio/storage/rules
- Firestore rules: https://console.firebase.google.com/project/meditations-audio/firestore/rules
```

### 4️⃣ Zkontrolovat git historii
```
Status: [ ] NEPROVEDENO

Příkaz:
git log --all --full-history -- .env

Pokud najde commity → .env byl commitnutý!
→ MUSÍTE vyčistit historii (viz SECURITY_ANALYSIS_COMPLETE.md)
```

---

## 📋 VYSOKÁ PRIORITA (TENTO TÝDEN)

### 5️⃣ Nastavit pre-commit hooks
```
Status: [ ] NEPROVEDENO

Příkazy:
npm install --save-dev husky
npx husky install
chmod +x .husky/pre-commit
npm set-script prepare "husky install"

Test:
git add .
git commit -m "test"  # Mělo by spustit kontroly
```

### 6️⃣ Spustit security setup script
```
Status: [ ] NEPROVEDENO

Příkaz:
bash scripts/setup-security.sh

Script provede:
✓ Kontrolu .env
✓ Kontrolu .gitignore
✓ Nastavení hooks
✓ Security audit
```

### 7️⃣ NPM Security Audit
```
Status: [ ] NEPROVEDENO

Příkazy:
npm audit                    # Zobrazí zranitelnosti
npm audit fix               # Opraví automaticky
npm audit fix --force       # Agresivnější oprava
```

### 8️⃣ Nastavit Firebase Usage Alerts
```
Status: [ ] NEPROVEDENO

Kroky:
1. Firebase Console → Usage and Billing
2. Nastavit alerty pro:
   - Storage reads/writes (např. > 10,000/den)
   - Firestore reads/writes (např. > 50,000/den)
   - Bandwidth usage (např. > 1GB/den)
3. Přidat email pro notifikace
```

---

## 🎯 STŘEDNÍ PRIORITA (TENTO MĚSÍC)

### 9️⃣ Implementovat Firebase App Check
```
Status: [ ] NEPROVEDENO

1. Nastavit reCAPTCHA v3:
   https://www.google.com/recaptcha/admin

2. Aktivovat App Check ve Firebase Console

3. Instalovat:
   npm install firebase-app-check

4. Implementovat v src/services/firebase.js
   (viz SECURITY_ANALYSIS_COMPLETE.md)
```

### 🔟 Instalovat ESLint Security Plugin
```
Status: [ ] NEPROVEDENO

Příkazy:
npm install --save-dev eslint-plugin-security

Přidat do .eslintrc.js:
{
  "plugins": ["security"],
  "extends": ["plugin:security/recommended"]
}

Test:
npx eslint src/
```

---

## 📊 STATUS TRACKING

```
Kritické úkoly dokončeny:     0/4  (0%)
Vysoká priorita dokončena:    0/4  (0%)
Střední priorita dokončena:   0/2  (0%)

CELKOVÝ PROGRES:              0/10 (0%)
```

---

## 🚀 RYCHLÝ START (Copy-paste příkazy)

```bash
# === OKAMŽITÉ AKCE ===

# 1. Regenerovat klíč v Firebase Console (manuálně)
# 2. Aktualizovat .env (manuálně)

# 3. Nasadit Security Rules
firebase deploy --only storage,firestore

# 4. Zkontrolovat git historii
git log --all --full-history -- .env

# === VYSOKÁ PRIORITA ===

# 5. Nastavit pre-commit hooks
npm install --save-dev husky
npx husky install
chmod +x .husky/pre-commit
npm set-script prepare "husky install"

# 6. Security setup
bash scripts/setup-security.sh

# 7. NPM audit
npm audit
npm audit fix

# === OVĚŘENÍ ===
echo "✅ Zkontrolujte, že všechny příkazy proběhly úspěšně!"
```

---

## 📝 POZNÁMKY

### Co je hotovo:
- ✅ .env soubor existuje
- ✅ .env je v .gitignore
- ✅ Firebase konfigurace používá environment proměnné
- ✅ Security rules jsou připraveny (storage.rules, firestore.rules)
- ✅ Pre-commit hook je připraven (.husky/pre-commit)
- ✅ Security setup script je připraven (scripts/setup-security.sh)
- ✅ Dokumentace je kompletní

### Co zbývá udělat:
- 🔲 Regenerovat Firebase API klíč (OKAMŽITĚ!)
- 🔲 Nasadit Security Rules
- 🔲 Spustit security setup
- 🔲 Implementovat App Check
- 🔲 Nastavit monitoring a alerty

---

## ⏱️ ČASOVÝ ODHAD

- **Okamžité akce (1-4):** 30 minut
- **Vysoká priorita (5-8):** 2-3 hodiny
- **Střední priorita (9-10):** 2-3 hodiny

**Celkem:** 5-7 hodin

---

## 📞 KONTAKTY V PŘÍPADĚ PROBLÉMŮ

- Firebase Support: https://firebase.google.com/support
- Firebase Community: https://firebase.google.com/community
- Security Issues: security@firebase.google.com

---

**Poslední aktualizace:** ${new Date().toISOString()}
**Verze:** 1.0

