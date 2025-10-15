# Audio Player Components

Refaktorované komponenty pro audio přehrávač s modulární architekturou.

## Struktura komponent

### 🎯 Hlavní komponenty

- **AudioPlayer** - Hlavní komponenta přehrávače (refaktorovaná)
- **AudioControls** - Kombinuje všechny ovládací prvky
- **useAudioPlayer** - Custom hook pro audio logiku

### 🔧 Podkomponenty

- **AudioPlayerHeader** - Header s názvem a celkovou délkou
- **CircularProgress** - Kruhový progress bar s interaktivním seek
- **PlayPauseButton** - Tlačítko play/pause s animacemi
- **SkipButton** - Tlačítko pro přeskakování o 10 sekund
- **CurrentTimeDisplay** - Zobrazení aktuálního času
- **CloseButton** - Tlačítko pro zavření přehrávače
- **LoadingIndicator** - Indikátor načítání

## Vlastnosti refaktorování

### ✅ Výhody

1. **Modularita** - Každá komponenta má jednu odpovědnost
2. **Znovupoužitelnost** - Komponenty lze použít jinde
3. **Testovatelnost** - Jednodušší unit testy
4. **Údržba** - Snadnější debugging a úpravy
5. **Separation of Concerns** - Logika oddělena od UI

### 🏗️ Architektura

```
AudioPlayer (hlavní komponenta)
├── useAudioPlayer (custom hook)
├── AudioPlayerHeader
├── AudioControls
│   ├── CircularProgress
│   ├── PlayPauseButton
│   ├── SkipButton (backward)
│   ├── SkipButton (forward)
│   └── CurrentTimeDisplay
├── CloseButton
└── LoadingIndicator
```

### 🎛️ Props a API

#### AudioPlayer
```jsx
<AudioPlayer
  audioSrc="path/to/audio.mp3"
  title="Název skladby"
  onClose={() => {}}
  className="custom-class"
/>
```

#### AudioControls
```jsx
<AudioControls
  progress={75}
  isPlaying={true}
  currentTime={120}
  onSeek={(e) => {}}
  onTogglePlayPause={() => {}}
  onSkipBackward={() => {}}
  onSkipForward={() => {}}
  formatTime={(time) => "2:00"}
/>
```

### 🎨 Styling

Všechny komponenty používají Tailwind CSS s konzistentním designem:
- **Barvy**: `#f4ddc4` background, `black` progress, `white` text
- **Font**: `Playfair Display` pro text
- **Animace**: Framer Motion pro smooth transitions
- **Responsive**: Optimalizováno pro mobilní zařízení

### 🔧 Custom Hook: useAudioPlayer

```javascript
const {
  audioRef,
  isPlaying,
  currentTime,
  duration,
  isLoading,
  progress,
  togglePlayPause,
  skipBackward,
  skipForward,
  handleSeek,
  formatTime
} = useAudioPlayer(audioSrc);
```

### 📱 Touch Support

Všechny interaktivní prvky podporují:
- **Touch events** (`onTouchEnd`)
- **Mouse events** (`onClick`)
- **Prevent default** pro lepší UX
- **Responsive design** pro různé velikosti obrazovek

## Použití

```jsx
import { AudioPlayer } from './components/AudioPlayer';

function MyComponent() {
  const [showPlayer, setShowPlayer] = useState(false);

  return (
    <>
      <button onClick={() => setShowPlayer(true)}>
        Otevřít přehrávač
      </button>

      {showPlayer && (
        <AudioPlayer
          audioSrc="/media/song.mp3"
          title="Název skladby"
          onClose={() => setShowPlayer(false)}
        />
      )}
    </>
  );
}
```

## Vývoj

Pro přidání nové funkce:
1. Vytvoř novou komponentu v `src/components/audio/`
2. Přidej export do `src/components/audio/index.js`
3. Integruj do `AudioControls` nebo `AudioPlayer`
4. Aktualizuj dokumentaci

## Testování

Každá komponenta je nezávislá a může být testována samostatně:

```jsx
import { render, screen } from '@testing-library/react';
import { PlayPauseButton } from './audio';

test('renders play button when not playing', () => {
  render(<PlayPauseButton isPlaying={false} onToggle={() => {}} />);
  expect(screen.getByRole('button')).toBeInTheDocument();
});
```
