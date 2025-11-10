# Firebase Commands pro Meditation App

## 🚀 Spuštění aplikace

### 1. Lokální vývoj s Firebase Emulator
```bash
# Spustit Firebase emulator (hosting)
firebase emulators:start --only hosting

# Aplikace bude dostupná na: http://127.0.0.1:5002
```

### 2. Produkční deployment
```bash
# Build aplikace
npm run build

# Deploy na Firebase Hosting
firebase deploy --only hosting

# Aplikace bude dostupná na: https://meditations-audio.web.app
```

### 3. Rychlý build + deploy
```bash
# Jedním příkazem
npm run build && firebase deploy --only hosting
```

## 🔧 Užitečné příkazy

### Zkontrolovat stav
```bash
# Seznam projektů
firebase projects:list

# Seznam hosting sites
firebase hosting:sites:list

# Otevřít hosting v prohlížeči
firebase hosting:channel:open live
```

### Debug
```bash
# Zobrazit logy
firebase hosting:channel:open live

# Emulator s debug informacemi
firebase emulators:start --only hosting --debug
```

## 📁 Struktura souborů
- `dist/` - Build výstup (automaticky generován)
- `firebase.json` - Firebase konfigurace
- `.firebaserc` - Projekt nastavení
