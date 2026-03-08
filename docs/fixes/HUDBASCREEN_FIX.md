# HudbaScreen Fix - Oprava načítání hudba sekce

## Problém
HudbaScreen se nenačítal, zatímco SlovaScreen fungoval správně. Problém byl v použití nesprávného hooku.

## Analýza

### ✅ **SlovaScreen (fungoval):**
- Používal `useFirebaseAudioFilter`
- Tento hook používá `useFirebaseCDNScanner`
- Načítá data z Firebase Storage přímo

### ❌ **HudbaScreen (nefungoval):**
- Používal `useOptimizedHudbaFilter`
- Tento hook se pokoušel načíst z Firestore (selhává s 400 chybou)
- Pak fallback na `staticMetadataService` (který neexistuje)

## Řešení

### 1. **Změna hooku v HudbaScreen.jsx**
```javascript
// PŘED (nefungovalo):
import { useOptimizedHudbaFilter } from '@hooks/useOptimizedHudbaFilter';
const { hudbaItems, isLoading, error, stats, isLoadingCovers, isLoadingDurations } = useOptimizedHudbaFilter();

// PO (funguje):
import { useFirebaseHudbaFilter } from '@features/audio/hooks/useFirebaseHudbaFilter';
const { hudbaItems, isLoading, error, stats, isLoadingCovers, isLoadingDurations } = useFirebaseHudbaFilter();
```

### 2. **Proč to funguje**
- `useFirebaseHudbaFilter` je navržený specificky pro hudba soubory
- Používá `useFirebaseHudbaScanner` pro načítání z Firebase Storage
- Má správnou logiku pro filtrování hudba souborů
- Nezávisí na Firestore databázi

## Výsledek

### ✅ **HudbaScreen nyní:**
- Používá správný hook pro hudba soubory
- Načítá data z Firebase Storage (stejně jako SlovaScreen)
- Zobrazuje hudba seznam s duration informacemi
- Funguje bez závislosti na Firestore

### 🔄 **Konzistentní architektura:**
- **SlovaScreen** → `useFirebaseAudioFilter` → `useFirebaseCDNScanner`
- **HudbaScreen** → `useFirebaseHudbaFilter` → `useFirebaseHudbaScanner`

## Testování

Aplikace by nyní měla:
1. ✅ Načítat sekci "slova" (fungovalo už dříve)
2. ✅ Načítat sekci "hudba" (opraveno)
3. ✅ Zobrazovat duration u obou sekcí
4. ✅ Fungovat bez chyb v konzoli

## Poznámky

- `useOptimizedHudbaFilter` byl experimentální hook pro Firestore
- `useFirebaseHudbaFilter` je osvědčený hook pro Firebase Storage
- Oba hooky používají stejný princip, ale různé zdroje dat

**Oprava dokončena!** 🎉
