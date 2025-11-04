# Performance Audit - Animace a Modaly

## Datum auditu: 2024

## 🔍 Problémy nalezené při analýze

### 1. ❌ Statické importy modálů při startu aplikace

**Problém:**
- `WheelPickerModal`, `DualWheelPickerModal`, `SoundThemeGallery` se načítají staticky v každém screenu
- Modaly se načítají i když se nikdy neotevřou
- Zvyšuje velikost initial bundle

**Místa:**
- `src/features/meditation/screens/BreathScreen.jsx` - importuje všechny 3 modaly
- `src/features/meditation/screens/MeditationScreen.jsx` - importuje WheelPickerModal a SoundThemeGallery
- `src/components/index.js` - exportuje všechny modaly staticky

**Doporučení:**
- Přesunout modaly na lazy loading
- Načítat modaly pouze když se otevřou (lazy import při kliknutí)

### 2. ❌ SimpleAdminScreen se načítá staticky

**Problém:**
- `SimpleAdminScreen` se importuje staticky v `App.jsx`
- Načítá se i když uživatel není na admin stránce

**Místo:**
- `src/App.jsx:14` - `import SimpleAdminScreen from '@features/meditation/screens/SimpleAdminScreen';`

**Doporučení:**
- Použít lazy loading pro admin screen
- Načítat pouze když je uživatel na `/admin` route

### 3. ⚠️ Duplicitní lazy loading

**Problém:**
- `LazyWrapper.jsx` a `PageManager.jsx` oba definují lazy loading pro stejné komponenty
- Duplicitní kód a možná zmatení

**Místa:**
- `src/components/LazyWrapper.jsx` - definuje lazy komponenty
- `src/features/navigation/PageManager.jsx` - také definuje lazy komponenty

**Doporučení:**
- Centralizovat lazy loading definice na jedno místo
- Použít pouze jednu sadu lazy komponent

### 4. ⚠️ FramerMotion animace se načítají staticky

**Problém:**
- Všechny komponenty používají `framer-motion` animace
- FramerMotion se načítá staticky v každém screenu
- Velikost bundle: ~80KB (framer-CQUGjuIc.js)

**Místa:**
- Všechny screeny importují `motion` z `framer-motion`
- Animace se načítají i když se nepoužívají

**Doporučení:**
- Zvážit lazy loading framer-motion pro neaktivní stránky
- Nebo použít lehčí alternativu pro jednoduché animace

### 5. ⚠️ WheelPicker a DualWheelPicker se načítají staticky

**Problém:**
- `WheelPicker` a `DualWheelPicker` se načítají staticky v `TimePickerModal`
- Načítají se i když se modaly neotevřou

**Místo:**
- `src/components/TimePickerModal.jsx:5` - statický import

**Doporučení:**
- Lazy loading pro WheelPicker komponenty

### 6. ✅ Dobře implementováno

**Co funguje dobře:**
- Screens jsou lazy loaded v `PageManager.jsx` ✅
- Data se načítají v pozadí během intro animace ✅
- Service Worker registrace ✅
- Error Boundary ✅

## 📊 Odhad zlepšení

### Po optimalizaci modálů:
- **Initial bundle size:** -50KB až -100KB
- **Time to Interactive:** -200ms až -500ms
- **First Contentful Paint:** -100ms až -300ms

### Po optimalizaci SimpleAdminScreen:
- **Initial bundle size:** -20KB až -40KB
- **Lepší kód splitting pro admin routy**

## 🛠️ Doporučené akce

### Priorita 1 (Vysoká):
1. ✅ Lazy loading pro modaly (WheelPickerModal, DualWheelPickerModal, SoundThemeGallery)
2. ✅ Lazy loading pro SimpleAdminScreen
3. ✅ Lazy loading pro WheelPicker komponenty

### Priorita 2 (Střední):
4. Centralizovat lazy loading definice
5. Zvážit lazy loading framer-motion pro neaktivní stránky

### Priorita 3 (Nízká):
6. Optimalizace animací (zjednodušení tam, kde je to možné)

## 📝 Implementační poznámky

### Lazy loading modálů:
```javascript
// Místo:
import { WheelPickerModal } from '@components';

// Použít:
const WheelPickerModal = React.lazy(() => import('@components/TimePickerModal').then(m => ({ default: m.WheelPickerModal })));
```

### Lazy loading SimpleAdminScreen:
```javascript
// Místo:
import SimpleAdminScreen from '@features/meditation/screens/SimpleAdminScreen';

// Použít:
const SimpleAdminScreen = lazy(() => import('@features/meditation/screens/SimpleAdminScreen'));
```

## 🎯 Metriky ke sledování

- Initial bundle size
- Time to Interactive (TTI)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)

