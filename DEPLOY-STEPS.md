# Jak nasadit opravu na Firebase

## 1. Otestuj lokálně (důležité!)
```bash
npm run dev
```
Otevři v browseru a zkontroluj console, zda se meditacie soubory načítají správně.

## 2. Build aplikace
```bash
npm run build
```

## 3. Nasad na Firebase Hosting
```bash
firebase deploy --only hosting
```

## 4. Případně: nasad i Firebase Functions (pokud se změnily)
```bash
firebase deploy --only functions
```

## 5. Ověř nasazenou verzi
Otevři ve Firebase Console:
- Hosting → Release history
- Zkontroluj, zda nová verze je aktivní

## Co se nasazuje?
- ✅ VŠECHNY changes lokálně
- ✅ Automaticky po deploy se změní i pro uživatele
- ⚠️  Pozor: Změny se projeví u všech uživatelů okamžitě

## Chceš to udělat sám, nebo mám pomoci?
