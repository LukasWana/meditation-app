# Návrh refaktorizace BreathScreen.jsx

## Analýza současného stavu

Současný `BreathScreen.jsx` má **969 řádků** a obsahuje:

1. **Logiku zvuků** (countdown, final sound)
2. **Logiku timerů** (breath timer, preparation timer)
3. **UI komponenty** (preparation section, breathing section)
4. **Animace** (breathing animation)
5. **Modaly** (pickers)

## Navržené komponenty

### 1. **Hooks** (custom hooks pro logiku)

#### `useCountdownSound.js`
**Umístění**: `src/hooks/useCountdownSound.js`
**Odpovědnost**: Načítání a přehrávání countdown zvuku
- Načítání URL z Firebase
- Přehrávání při změně countdownu
- Fade out logika
- Cleanup

**Props/State**:
- `breathCountdownSound` (string)
- `localIsPreparing` (boolean)
- `localPreparationCountdown` (number)

#### `useFinalSound.js`
**Umístění**: `src/hooks/useFinalSound.js`
**Odpovědnost**: Přehrávání finálního zvuku po dokončení dýchání
- Načítání URL z Firebase
- Přehrávání při dokončení cyklu
- Ochrana proti duplicitnímu přehrání

**Props/State**:
- `breathFinalSound` (string)
- `isBreathing` (boolean)
- `waitingForCycleCompletion` (ref)

#### `useBreathTimer.js`
**Umístění**: `src/hooks/useBreathTimer.js`
**Odpovědnost**: Timer logika pro dýchání
- Odpočítávání času
- Čekání na dokončení cyklu
- Triggerování finálního zvuku
- Cleanup intervalů/timeoutů

**Props/State**:
- `isBreathing` (boolean)
- `breathTime` (number)
- `setBreathTime` (function)
- `breathInDuration` (number)
- `breathOutDuration` (number)
- `breathFinalSound` (string)
- `playFinalSound` (function)
- `setIsBreathing` (function)

#### `usePreparationTimer.js`
**Umístění**: `src/hooks/usePreparationTimer.js`
**Odpovědnost**: Timer logika pro přípravu
- Odpočítávání přípravy
- Spuštění dýchání po dokončení
- Cleanup

**Props/State**:
- `localIsPreparing` (boolean)
- `localPreparationCountdown` (number)
- `setLocalPreparationCountdown` (function)
- `breathTime` (number)
- `breathDuration` (number)
- `setBreathTime` (function)
- `setIsBreathing` (function)

---

### 2. **UI Komponenty**

#### `BreathHeader.jsx`
**Umístění**: `src/features/meditation/components/BreathHeader.jsx`
**Odpovědnost**: Nadpis a zobrazení času
- Dynamický nadpis (dýchání/nádech/výdech)
- CurrentTimeDisplay

**Props**:
```jsx
{
  isBreathing: boolean,
  breathPhase: 'in' | 'out',
  currentTime: number,
  totalTime: number,
  formatTime: (seconds: number) => string
}
```

#### `BreathingAnimation.jsx`
**Umístění**: `src/features/meditation/components/BreathingAnimation.jsx`
**Odpovědnost**: Bílý animovaný kruh pro vizualizaci dýchání
- Animace scale a opacity
- Synchronizace s breathPhase

**Props**:
```jsx
{
  isBreathing: boolean,
  breathPhase: 'in' | 'out',
  breathInDuration: number,
  breathOutDuration: number
}
```

#### `BreathProgressCircle.jsx`
**Umístění**: `src/features/meditation/components/BreathProgressCircle.jsx`
**Odpovědnost**: CircularProgress s play button a animací
- Kombinuje CircularProgress, BreathingAnimation, PlayPauseButton
- Správa z-index vrstev

**Props**:
```jsx
{
  progress: number,
  isBreathing: boolean,
  breathPhase: 'in' | 'out',
  breathInDuration: number,
  breathOutDuration: number,
  onPlayPause: () => void
}
```

#### `BreathParameters.jsx`
**Umístění**: `src/features/meditation/components/BreathParameters.jsx`
**Odpovědnost**: Zobrazení tří parametrů (příprava, délka, rytmus)
- Tlačítka pro otevření pickerů
- Formátování hodnot

**Props**:
```jsx
{
  preparationTime: number,
  breathDuration: number,
  breathInDuration: number,
  breathOutDuration: number,
  onPreparationClick: () => void,
  onDurationClick: () => void,
  onRhythmClick: () => void,
  formatTime: (seconds: number) => string,
  formatPreparationTime: (seconds: number) => string
}
```

#### `BreathActionButtons.jsx`
**Umístění**: `src/features/meditation/components/BreathActionButtons.jsx`
**Odpovědnost**: Tlačítka reset, galerie, profily
- Tři kulatá bílá tlačítka s ikonami

**Props**:
```jsx
{
  onReset: () => void,
  onGalleryClick: () => void,
  onProfilesClick: () => void
}
```

#### `PreparationSection.jsx`
**Umístění**: `src/features/meditation/components/PreparationSection.jsx`
**Odpovědnost**: Kompletní UI sekce přípravy
- Nadpis "Příprava"
- CircularProgress s countdown
- Prázdné parametry (pro zachování layoutu)
- Action buttons

**Props**:
```jsx
{
  preparationCountdown: number,
  preparationTime: number,
  onStop: () => void,
  onGalleryClick: () => void,
  onProfilesClick: () => void
}
```

#### `BreathingSection.jsx`
**Umístění**: `src/features/meditation/components/BreathingSection.jsx`
**Odpovědnost**: Kompletní UI sekce dýchání
- BreathHeader
- BreathProgressCircle
- BreathParameters
- BreathActionButtons

**Props**:
```jsx
{
  isBreathing: boolean,
  breathPhase: 'in' | 'out',
  breathTime: number,
  totalTime: number,
  progress: number,
  preparationTime: number,
  breathDuration: number,
  breathInDuration: number,
  breathOutDuration: number,
  onPlayPause: () => void,
  onReset: () => void,
  onPreparationClick: () => void,
  onDurationClick: () => void,
  onRhythmClick: () => void,
  onGalleryClick: () => void,
  onProfilesClick: () => void,
  formatTime: (seconds: number) => string,
  formatPreparationTime: (seconds: number) => string
}
```

#### `BreathModals.jsx`
**Umístění**: `src/features/meditation/components/BreathModals.jsx`
**Odpovědnost**: Všechny modaly pro výběr parametrů
- PreparationPicker
- DurationPicker
- RhythmPicker

**Props**:
```jsx
{
  showPreparationPicker: boolean,
  showDurationPicker: boolean,
  showRhythmPicker: boolean,
  preparationTime: number,
  breathDuration: number,
  breathInDuration: number,
  breathOutDuration: number,
  onClosePreparation: () => void,
  onCloseDuration: () => void,
  onCloseRhythm: () => void,
  onPreparationChange: (time: number) => void,
  onDurationChange: (duration: number) => void,
  onRhythmChange: (inDuration: number, outDuration: number) => void,
  onSoundButtonClick: () => void
}
```

---

### 3. **Refaktorovaný BreathScreen.jsx**

Po refaktorizaci bude `BreathScreen.jsx` obsahovat pouze:

1. **Props přijímání** (stejné jako nyní)
2. **State management** (lokální state pro pickery)
3. **Hook volání** (useCountdownSound, useFinalSound, useBreathTimer, usePreparationTimer)
4. **Handler funkce** (handlePlayPause, handleReset)
5. **Renderování** (PreparationSection nebo BreathingSection + BreathModals)

**Odhadovaná velikost**: ~200-250 řádků (místo 969)

---

## Výhody refaktorizace

1. **Čitelnost**: Každá komponenta má jasnou odpovědnost
2. **Znovupoužitelnost**: Komponenty lze použít i jinde (např. MeditationScreen)
3. **Testovatelnost**: Jednotlivé komponenty lze testovat samostatně
4. **Údržba**: Snadnější hledání a oprava chyb
5. **Performance**: Lazy loading komponent, optimalizace re-renderů
6. **Oddělení logiky a UI**: Hooks pro logiku, komponenty pro UI

---

## Implementační plán

### Fáze 1: Hooks (nejméně riskantní)
1. Vytvořit `useCountdownSound.js`
2. Vytvořit `useFinalSound.js`
3. Vytvořit `useBreathTimer.js`
4. Vytvořit `usePreparationTimer.js`
5. Nahradit v BreathScreen.jsx

### Fáze 2: UI Komponenty (střední riziko)
1. Vytvořit `BreathingAnimation.jsx`
2. Vytvořit `BreathHeader.jsx`
3. Vytvořit `BreathProgressCircle.jsx`
4. Vytvořit `BreathParameters.jsx`
5. Vytvořit `BreathActionButtons.jsx`

### Fáze 3: Sekce (vyšší riziko)
1. Vytvořit `PreparationSection.jsx`
2. Vytvořit `BreathingSection.jsx`
3. Vytvořit `BreathModals.jsx`
4. Nahradit v BreathScreen.jsx

### Fáze 4: Finální cleanup
1. Odebrat nepotřebný kód
2. Optimalizace
3. Testování

---

## Poznámky

- **Zachování funkcionality**: Všechny současné funkce musí zůstat zachovány
- **Backward compatibility**: Props interface zůstane stejný
- **Inkrementální přístup**: Refaktorizace po částech, ne najednou
- **Testování**: Po každé fázi důkladné testování

