import React, { useCallback, useMemo, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './Layout';

// Lazy loading pro lepší performance
const IntroScreen = lazy(() => import('@features/meditation/screens/IntroScreen'));
const HomeScreen = lazy(() => import('@features/meditation/screens/HomeScreen'));
const DychaniScreen = lazy(() => import('@features/meditation/screens/DychaniScreen'));
const BreathScreen = lazy(() => import('@features/meditation/screens/DychaniScreen2'));
const SettingsScreen = lazy(() => import('@features/meditation/screens/SettingsScreen'));
const HelpScreen = lazy(() => import('@features/meditation/screens/HelpScreen'));
const HudbaScreen = lazy(() => import('@features/meditation/screens/HudbaScreen'));
const MeditaceScreen = lazy(() => import('@features/meditation/screens/MeditaceScreen'));
const AlbumDetailScreen = lazy(() => import('@features/meditation/screens/AlbumDetailScreen'));
const AudioPlayer = lazy(() => import('@features/audio/AudioPlayer'));
const SimpleAdminScreen = lazy(() => import('@features/meditation/screens/SimpleAdminScreen'));
const SoundThemeGalleryScreen = lazy(() => import('@features/meditation/screens/SoundThemeGalleryScreen'));
const BreathProfilesScreen = lazy(() => import('@features/meditation/screens/DychaniProfilesScreen'));
const ShaderSelectionScreen = lazy(() => import('@features/meditation/screens/ShaderSelectionScreen'));
const AudioPlayerHudbaScreen = lazy(() => import('@features/meditation/screens/AudioPlayerHudbaScreen'));
const AudioPlayerMeditaceScreen = lazy(() => import('@features/meditation/screens/AudioPlayerMeditaceScreen'));
const BackgroundSettingsScreen = lazy(() => import('@features/meditation/screens/BackgroundSettingsScreen'));


// Registry stránek s jejich konfigurací
const SCREEN_REGISTRY = {
  'intro': {
    component: IntroScreen,
    requiresLayout: false,
    props: ['onIntroComplete'],
    transition: {
      type: 'fade',
      duration: 0.8
    }
  },
  'home': {
    component: HomeScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'audioPermission'],
    transition: {
      type: 'fade',
      duration: 0.6
    }
  },
  'dychani': {
    component: DychaniScreen,
    requiresLayout: true,
    props: [
      'time',
      'selectedDuration',
      'isPlaying',
      'onDurationChange',
      'onPlayPause',
      'onReset',
      'onNavigateToScreen',
      'onTouchStart',
      'onTouchMove',
      'onTouchEnd',
      'breathPhase',
      'breathInDuration',
      'breathOutDuration',
      'onBreathRhythmChange',
      'preparationTime',
      'onPreparationTimeChange',
      'breathInSound',
      'breathOutSound',
      'breathClickSound',
      'breathFinalSound',
      'breathCountdownSound',
      'breathSoundFadeEnabled',
      'onBreathSoundChange',
      'isPreparing',
      'preparationCountdown'
    ],
    transition: {
      type: 'fade',
      duration: 0.6
    }
  },
  'breath': {
    component: BreathScreen,
    requiresLayout: true,
    props: ['breathPhase', 'setBreathPhase', 'onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'breathInDuration', 'breathOutDuration', 'onBreathRhythmChange', 'preparationTime', 'onPreparationTimeChange', 'isPreparing', 'preparationCountdown', 'breathDuration', 'breathTime', 'setBreathTime', 'isBreathing', 'setIsBreathing', 'onBreathDurationChange', 'onReset', 'breathInSound', 'breathOutSound', 'breathClickSound', 'breathFinalSound', 'breathCountdownSound', 'breathSoundFadeEnabled', 'onBreathSoundChange'],
    transition: {
      type: 'fade',
      duration: 0.7
    }
  },
  'settings': {
    component: SettingsScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'onPlayerStateChange', 'gender', 'onGenderChange'],
    transition: {
      type: 'fade',
      duration: 0.6
    }
  },
  'help': {
    component: HelpScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd'],
    transition: {
      type: 'fade',
      duration: 0.6
    }
  },
  'hudba': {
    component: HudbaScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'onPlayerStateChange', 'onAlbumSelect'],
    transition: {
      type: 'fade',
      duration: 0.6
    }
  },
  'meditace': {
    component: MeditaceScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'gender', 'onPlayerStateChange', 'onGenderChange'],
    transition: {
      type: 'fade',
      duration: 0.6
    }
  },
  'album-detail': {
    component: AlbumDetailScreen,
    requiresLayout: true,
    props: ['album', 'onNavigateToScreen', 'onPlayerStateChange', 'onTouchStart', 'onTouchMove', 'onTouchEnd'],
    transition: {
      type: 'fade',
      duration: 0.6
    }
  },
  'audio-player': {
    component: AudioPlayer,
    requiresLayout: false,
    props: ['audioSrc', 'title', 'onClose'],
    transition: {
      type: 'fade',
      duration: 0.4
    }
  },
  'database-admin': {
    component: SimpleAdminScreen,
    requiresLayout: false,
    props: [],
    transition: {
      type: 'fade',
      duration: 0.6
    }
  },
  'sound-theme-gallery': {
    component: SoundThemeGalleryScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'onSelectSound', 'selectedInSound', 'selectedOutSound', 'selectedClickSound', 'selectedFinalSound', 'selectedCountdownSound'],
    transition: {
      type: 'fade',
      duration: 0.6
    }
  },
  'shader-selection': {
    component: ShaderSelectionScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'section'],
    transition: {
      type: 'fade',
      duration: 0.6
    }
  },
  'audio-player-hudba': {
    component: AudioPlayerHudbaScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'onPlayerStateChange'],
    transition: {
      type: 'fade',
      duration: 0.4
    }
  },
  'audio-player-meditace': {
    component: AudioPlayerMeditaceScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'onPlayerStateChange'],
    transition: {
      type: 'fade',
      duration: 0.4
    }
  },
  'breath-profiles': {
    component: BreathProfilesScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'breathInDuration', 'breathOutDuration', 'breathDuration', 'preparationTime', 'breathInSound', 'breathOutSound', 'breathClickSound', 'breathFinalSound', 'breathCountdownSound', 'breathSoundFadeEnabled', 'onBreathRhythmChange', 'onBreathDurationChange', 'onPreparationTimeChange', 'onBreathSoundChange', 'onBreathSoundFadeChange'],
    transition: {
      type: 'fade',
      duration: 0.6
    }
  },
  'background-settings': {
    component: BackgroundSettingsScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'section'],
    transition: {
      type: 'fade',
      duration: 0.6
    }
  }
};

// Definice animací - všechny jsou jen fade (prolnutí) bez pohybu
const TRANSITION_VARIANTS = {
  fade: {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 }
  },
  slide: {
    up: {
      initial: { opacity: 0 },
      in: { opacity: 1 },
      out: { opacity: 0 }
    },
    down: {
      initial: { opacity: 0 },
      in: { opacity: 1 },
      out: { opacity: 0 }
    },
    left: {
      initial: { opacity: 0 },
      in: { opacity: 1 },
      out: { opacity: 0 }
    },
    right: {
      initial: { opacity: 0 },
      in: { opacity: 1 },
      out: { opacity: 0 }
    }
  },
  scale: {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 }
  },
  modal: {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 }
  }
};

const PageManager = ({
  // Navigace
  currentScreen,
  onNavigateToScreen,

  // Touch handling
  onTouchStart,
  onTouchMove,
  onTouchEnd,

  // Global state
  gender,
  onGenderChange,
  voicePreference,
  onVoicePreferenceChange,
  isPlayerActive,

  // Meditace specifické
  time,
  selectedDuration,
  isPlaying,
  onDurationChange,
  onPlayPause,
  onReset,
  breathPhase,
  setBreathPhase,
  breathInDuration,
  breathOutDuration,
  onBreathRhythmChange,
  preparationTime,
  onPreparationTimeChange,
  breathInSound,
  breathOutSound,
  breathClickSound,
  breathFinalSound,
  breathCountdownSound,
  onBreathSoundChange,
  breathSoundFadeEnabled,
  onBreathSoundFadeChange,
  isPreparing,
  preparationCountdown,
  breathDuration,
  breathTime,
  setBreathTime,
  isBreathing,
  setIsBreathing,
  onBreathDurationChange,

  // Audio player specifické
  activeAudio,
  onPlayerStateChange,
  onCloseAudio,
  selectedAlbum,
  onAlbumSelect,
  onAlbumClose
}) => {
  // Získání konfigurace aktuální stránky
  const currentScreenConfig = useMemo(() => {
    return SCREEN_REGISTRY[currentScreen] || null;
  }, [currentScreen]);

  // Zjednodušeno - všechny přechody jsou jen fade (prolnutí)
  const getTransitionVariants = useCallback(() => {
    return TRANSITION_VARIANTS.fade;
  }, []);

  // Vytvoření props pro komponentu
  // Memoizovat props pro 'breath' screen - ignorovat změny breathTime a preparationCountdown
  // protože ty se mění každou sekundu a nezpůsobují změnu struktury
  const breathScreenProps = useMemo(() => {
    const config = SCREEN_REGISTRY['breath'];
    if (!config) return {};

    const props = {};

    // Mapování props podle konfigurace
    config.props.forEach(propName => {
      switch (propName) {
        case 'onNavigateToScreen':
          props.onNavigateToScreen = onNavigateToScreen;
          break;
        case 'onTouchStart':
          props.onTouchStart = onTouchStart;
          break;
        case 'onTouchMove':
          props.onTouchMove = onTouchMove;
          break;
        case 'onTouchEnd':
          props.onTouchEnd = onTouchEnd;
          break;
        case 'gender':
          props.gender = gender;
          break;
        case 'onPlayerStateChange':
          props.onPlayerStateChange = onPlayerStateChange;
          break;
        case 'onGenderChange':
          props.onGenderChange = onGenderChange;
          break;
        case 'onAlbumSelect':
          props.onAlbumSelect = onAlbumSelect;
          break;
        case 'album':
          props.album = selectedAlbum;
          break;
        case 'time':
          props.time = time;
          break;
        case 'selectedDuration':
          props.selectedDuration = selectedDuration;
          break;
        case 'isPlaying':
          props.isPlaying = isPlaying;
          break;
        case 'onDurationChange':
          props.onDurationChange = onDurationChange;
          break;
        case 'onPlayPause':
          props.onPlayPause = onPlayPause;
          break;
        case 'onReset':
          props.onReset = onReset;
          break;
        case 'breathPhase':
          props.breathPhase = breathPhase;
          break;
        case 'setBreathPhase':
          props.setBreathPhase = setBreathPhase;
          break;
        case 'breathInDuration':
          props.breathInDuration = breathInDuration;
          break;
        case 'breathOutDuration':
          props.breathOutDuration = breathOutDuration;
          break;
        case 'breathInSound':
          props.breathInSound = breathInSound;
          break;
        case 'breathOutSound':
          props.breathOutSound = breathOutSound;
          break;
        case 'breathClickSound':
          props.breathClickSound = breathClickSound;
          break;
        case 'breathFinalSound':
          props.breathFinalSound = breathFinalSound;
          break;
        case 'breathCountdownSound':
          props.breathCountdownSound = breathCountdownSound;
          break;
        case 'breathSoundFadeEnabled':
          props.breathSoundFadeEnabled = breathSoundFadeEnabled;
          break;
        case 'onBreathSoundChange':
          props.onBreathSoundChange = onBreathSoundChange;
          break;
        case 'onBreathRhythmChange':
          props.onBreathRhythmChange = onBreathRhythmChange;
          break;
        case 'preparationTime':
          props.preparationTime = preparationTime;
          break;
        case 'onPreparationTimeChange':
          props.onPreparationTimeChange = onPreparationTimeChange;
          break;
        case 'isPreparing':
          props.isPreparing = isPreparing;
          break;
        case 'preparationCountdown':
          props.preparationCountdown = preparationCountdown;
          break;
        case 'breathDuration':
          props.breathDuration = breathDuration;
          break;
        case 'breathTime':
          props.breathTime = breathTime;
          break;
        case 'setBreathTime':
          props.setBreathTime = setBreathTime;
          break;
        case 'isBreathing':
          props.isBreathing = isBreathing;
          break;
        case 'setIsBreathing':
          props.setIsBreathing = setIsBreathing;
          break;
        case 'onBreathDurationChange':
          props.onBreathDurationChange = onBreathDurationChange;
          break;
        case 'onIntroComplete':
          props.onIntroComplete = () => onNavigateToScreen('home');
          break;
        case 'audioSrc':
          props.audioSrc = activeAudio?.audioSrc;
          break;
        case 'title':
          props.title = activeAudio?.title;
          break;
        case 'onClose':
          props.onClose = onCloseAudio;
          break;
        case 'onSelectSound':
          props.onSelectSound = onBreathSoundChange;
          break;
        case 'selectedInSound':
          props.selectedInSound = breathInSound;
          break;
        case 'selectedOutSound':
          props.selectedOutSound = breathOutSound;
          break;
        case 'selectedClickSound':
          props.selectedClickSound = breathClickSound;
          break;
        case 'selectedFinalSound':
          props.selectedFinalSound = breathFinalSound;
          break;
        case 'selectedCountdownSound':
          props.selectedCountdownSound = breathCountdownSound;
          break;
        case 'onBreathSoundFadeChange':
          props.onBreathSoundFadeChange = onBreathSoundFadeChange;
          break;
        case 'section':
          // Section prop není potřeba pro breath screen
          break;
        default:
          break;
      }
    });

    return props;
  }, [
    // Pro 'breath' screen ignorujeme breathTime a preparationCountdown v dependencies
    // protože se mění každou sekundu a nezpůsobují změnu struktury
    onNavigateToScreen, onTouchStart, onTouchMove, onTouchEnd,
    breathPhase, setBreathPhase, breathInDuration, breathOutDuration, breathInSound, breathOutSound, breathClickSound, breathFinalSound, breathCountdownSound, breathSoundFadeEnabled, onBreathRhythmChange,
    preparationTime, onPreparationTimeChange, onBreathSoundChange, onBreathSoundFadeChange,
    isPreparing, // preparationCountdown - ignorujeme
    breathDuration, // breathTime - ignorujeme, přidáme přímo do props
    setBreathTime, isBreathing, setIsBreathing, onBreathDurationChange,
    onReset
  ]);

  // Použít useMemo pro props objekt s aktuálními hodnotami breathTime a preparationCountdown
  // Toto zajistí, že se objekt vytvoří jen když se skutečně změní breathTime nebo preparationCountdown
  // breathScreenProps je memoizovaný a ignoruje breathTime/preparationCountdown v dependencies,
  // takže se nemění každou sekundu. breathScreenPropsWithTime se změní jen když se změní
  // breathTime nebo preparationCountdown, což je v pořádku - tyto hodnoty se předávají do komponenty.
  const breathScreenPropsWithTime = useMemo(() => {
    return { ...breathScreenProps, breathTime, preparationCountdown };
  }, [breathScreenProps, breathTime, preparationCountdown]);

  // Memoizovat props pro 'dychani' screen - ignorovat změny time
  // protože se mění každou sekundu a způsobuje zbytečný re-render celého PageManager
  const dychaniScreenProps = useMemo(() => {
    const config = SCREEN_REGISTRY['dychani'];
    if (!config) return {};

    const props = {};

    // Mapování props podle konfigurace (bez time, to přidáme později)
    config.props.forEach(propName => {
      switch (propName) {
        case 'time':
          // Ignoruj time v dependencies - přidáme ho později
          break;
        case 'onNavigateToScreen':
          props.onNavigateToScreen = onNavigateToScreen;
          break;
        case 'onTouchStart':
          props.onTouchStart = onTouchStart;
          break;
        case 'onTouchMove':
          props.onTouchMove = onTouchMove;
          break;
        case 'onTouchEnd':
          props.onTouchEnd = onTouchEnd;
          break;
        case 'selectedDuration':
          props.selectedDuration = selectedDuration;
          break;
        case 'isPlaying':
          props.isPlaying = isPlaying;
          break;
        case 'onDurationChange':
          props.onDurationChange = onDurationChange;
          break;
        case 'onPlayPause':
          props.onPlayPause = onPlayPause;
          break;
        case 'onReset':
          props.onReset = onReset;
          break;
        case 'breathPhase':
          props.breathPhase = breathPhase;
          break;
        case 'breathInDuration':
          props.breathInDuration = breathInDuration;
          break;
        case 'breathOutDuration':
          props.breathOutDuration = breathOutDuration;
          break;
        case 'breathInSound':
          props.breathInSound = breathInSound;
          break;
        case 'breathOutSound':
          props.breathOutSound = breathOutSound;
          break;
        case 'breathClickSound':
          props.breathClickSound = breathClickSound;
          break;
        case 'breathFinalSound':
          props.breathFinalSound = breathFinalSound;
          break;
        case 'breathCountdownSound':
          props.breathCountdownSound = breathCountdownSound;
          break;
        case 'breathSoundFadeEnabled':
          props.breathSoundFadeEnabled = breathSoundFadeEnabled;
          break;
        case 'onBreathSoundChange':
          props.onBreathSoundChange = onBreathSoundChange;
          break;
        case 'onBreathRhythmChange':
          props.onBreathRhythmChange = onBreathRhythmChange;
          break;
        case 'preparationTime':
          props.preparationTime = preparationTime;
          break;
        case 'onPreparationTimeChange':
          props.onPreparationTimeChange = onPreparationTimeChange;
          break;
        case 'isPreparing':
          props.isPreparing = isPreparing;
          break;
        case 'preparationCountdown':
          props.preparationCountdown = preparationCountdown;
          break;
        default:
          break;
      }
    });

    return props;
  }, [
    // Ignorujeme 'time' v dependencies - přidáme ho později v dychaniScreenPropsWithTime
    onNavigateToScreen, onTouchStart, onTouchMove, onTouchEnd,
    selectedDuration, isPlaying, onDurationChange, onPlayPause, onReset,
    breathPhase, breathInDuration, breathOutDuration,
    breathInSound, breathOutSound, breathClickSound, breathFinalSound, breathCountdownSound,
    breathSoundFadeEnabled, onBreathSoundChange, onBreathRhythmChange,
    preparationTime, onPreparationTimeChange, isPreparing, preparationCountdown
  ]);

  // Vytvoř finální props objekt s time hodnotou
  const dychaniScreenPropsWithTime = useMemo(() => {
    return { ...dychaniScreenProps, time };
  }, [dychaniScreenProps, time]);


  const getScreenProps = useCallback((screenKey) => {
    // Pro 'breath' screen použij memoizované props s časem
    if (screenKey === 'breath') {
      return breathScreenPropsWithTime; // Použít memoizovaný objekt místo vytváření nového
    }

    // Pro 'dychani' screen použij memoizované props s časem
    if (screenKey === 'dychani') {
      return dychaniScreenPropsWithTime;
    }

    const config = SCREEN_REGISTRY[screenKey];
    if (!config) return {};

    const props = {};

    // Mapování props podle konfigurace
    config.props.forEach(propName => {
      switch (propName) {
        case 'onNavigateToScreen':
          props.onNavigateToScreen = onNavigateToScreen;
          break;
        case 'onTouchStart':
          props.onTouchStart = onTouchStart;
          break;
        case 'onTouchMove':
          props.onTouchMove = onTouchMove;
          break;
        case 'onTouchEnd':
          props.onTouchEnd = onTouchEnd;
          break;
        case 'gender':
          props.gender = gender;
          break;
        case 'onPlayerStateChange':
          props.onPlayerStateChange = onPlayerStateChange;
          break;
        case 'onGenderChange':
          props.onGenderChange = onGenderChange;
          break;
        case 'onAlbumSelect':
          props.onAlbumSelect = onAlbumSelect;
          break;
        case 'album':
          props.album = selectedAlbum;
          break;
        case 'time':
          props.time = time;
          break;
        case 'selectedDuration':
          props.selectedDuration = selectedDuration;
          break;
        case 'isPlaying':
          props.isPlaying = isPlaying;
          break;
        case 'onDurationChange':
          props.onDurationChange = onDurationChange;
          break;
        case 'onPlayPause':
          props.onPlayPause = onPlayPause;
          break;
        case 'onReset':
          props.onReset = onReset;
          break;
        case 'breathPhase':
          props.breathPhase = breathPhase;
          break;
        case 'setBreathPhase':
          props.setBreathPhase = setBreathPhase;
          break;
        case 'breathInDuration':
          props.breathInDuration = breathInDuration;
          break;
        case 'breathOutDuration':
          props.breathOutDuration = breathOutDuration;
          break;
        case 'breathInSound':
          props.breathInSound = breathInSound;
          break;
        case 'breathOutSound':
          props.breathOutSound = breathOutSound;
          break;
        case 'breathClickSound':
          props.breathClickSound = breathClickSound;
          break;
        case 'breathFinalSound':
          props.breathFinalSound = breathFinalSound;
          break;
        case 'breathCountdownSound':
          props.breathCountdownSound = breathCountdownSound;
          break;
        case 'breathSoundFadeEnabled':
          props.breathSoundFadeEnabled = breathSoundFadeEnabled;
          break;
        case 'onBreathSoundChange':
          props.onBreathSoundChange = onBreathSoundChange;
          break;
        case 'onBreathRhythmChange':
          props.onBreathRhythmChange = onBreathRhythmChange;
          break;
        case 'preparationTime':
          props.preparationTime = preparationTime;
          break;
        case 'onPreparationTimeChange':
          props.onPreparationTimeChange = onPreparationTimeChange;
          break;
        case 'isPreparing':
          props.isPreparing = isPreparing;
          break;
        case 'preparationCountdown':
          props.preparationCountdown = preparationCountdown;
          break;
        case 'breathDuration':
          props.breathDuration = breathDuration;
          break;
        case 'breathTime':
          props.breathTime = breathTime;
          break;
        case 'setBreathTime':
          props.setBreathTime = setBreathTime;
          break;
        case 'isBreathing':
          props.isBreathing = isBreathing;
          break;
        case 'setIsBreathing':
          props.setIsBreathing = setIsBreathing;
          break;
        case 'onBreathDurationChange':
          props.onBreathDurationChange = onBreathDurationChange;
          break;
        case 'onIntroComplete':
          props.onIntroComplete = () => onNavigateToScreen('home');
          break;
        case 'audioSrc':
          props.audioSrc = activeAudio?.audioSrc;
          break;
        case 'title':
          props.title = activeAudio?.title;
          break;
        case 'onClose':
          props.onClose = onCloseAudio;
          break;
        case 'onSelectSound':
          props.onSelectSound = onBreathSoundChange;
          break;
        case 'selectedInSound':
          props.selectedInSound = breathInSound;
          break;
        case 'selectedOutSound':
          props.selectedOutSound = breathOutSound;
          break;
        case 'selectedClickSound':
          props.selectedClickSound = breathClickSound;
          break;
        case 'selectedFinalSound':
          props.selectedFinalSound = breathFinalSound;
          break;
        case 'selectedCountdownSound':
          props.selectedCountdownSound = breathCountdownSound;
          break;
        case 'onBreathSoundFadeChange':
          props.onBreathSoundFadeChange = onBreathSoundFadeChange;
          break;
        case 'section':
          // Mapování aktuální obrazovky na sekci pro shader a background settings
          if (screenKey === 'shader-selection' || screenKey === 'background-settings') {
            // Zkus získat section přímo z localStorage (uloženo BackgroundQuickAccess)
            const savedSection = localStorage.getItem('meditation-app-background-settings-section');
            if (savedSection) {
              props.section = savedSection;
            } else {
              // Urči sekci na základě předchozí obrazovky
              const sectionMap = {
                'hudba': 'hudba',
                'meditace': 'meditace',
                'breath': 'dychani',
                'dychani': 'dychani',
                'settings': 'settings',
                'audio-player-hudba': 'hudba',
                'audio-player-meditace': 'meditace'
              };
              const previousScreen = localStorage.getItem('meditation-app-previous-screen') || currentScreen;
              props.section = sectionMap[previousScreen] || 'hudba';
            }
          }
          break;
        default:
          break;
      }
    });

    return props;
  }, [
    // Pro ostatní screens použijeme všechny dependencies
    // POZNÁMKA: time je ODSTRANĚNO z dependencies protože je teď součástí dychaniScreenPropsWithTime
    onNavigateToScreen, onTouchStart, onTouchMove, onTouchEnd,
    gender, onPlayerStateChange, onGenderChange, selectedDuration, isPlaying,
    onDurationChange, onPlayPause, onReset, breathPhase, setBreathPhase, breathInDuration, breathOutDuration, breathInSound, breathOutSound, breathClickSound, breathFinalSound, breathCountdownSound, breathSoundFadeEnabled, onBreathRhythmChange,
    preparationTime, onPreparationTimeChange, onBreathSoundChange, onBreathSoundFadeChange,
    isPreparing, preparationCountdown,
    breathDuration, breathTime, setBreathTime, isBreathing, setIsBreathing, onBreathDurationChange,
    activeAudio, onCloseAudio, selectedAlbum, onAlbumSelect, onAlbumClose,
    currentScreen, breathScreenPropsWithTime, dychaniScreenPropsWithTime // Přidány memoizované props
  ]);

  // Renderování stránky
  const renderScreen = useCallback(() => {
    if (!currentScreenConfig) {
      console.warn(`⚠️ Stránka '${currentScreen}' nebyla nalezena v registru`);
      return null;
    }

    // Diagnostika pro dychani sekci - ZAKOMENTOVÁNO (způsobovalo matoucí logy)
    // if (currentScreen === 'dychani') {
    //   console.log('🔍 Rendering dychani screen:', {
    //     component: currentScreenConfig.component,
    //     hasProps: !!getScreenProps,
    //     config: currentScreenConfig
    //   });
    // }

    const Component = currentScreenConfig.component;
    const props = getScreenProps(currentScreen);

    // Diagnostika props pro dychani - ZAKOMENTOVÁNO
    // if (currentScreen === 'dychani') {
    //   console.log('🔍 Dychani props:', Object.keys(props || {}));
    // }

    const transition = currentScreenConfig.transition;
    const variants = getTransitionVariants(); // Všechny přechody jsou fade

    // Pro obrazovky 'breath' a 'dychani' deaktivujeme animace - mají vlastní logiku pro přepínání sekcí
    // aby se předešlo konfliktům a blikání pozadí při změnách breathPhase
    const isBreathScreen = currentScreen === 'breath' || currentScreen === 'dychani';

    // Všechny přechody jsou jen fade (prolnutí) bez pohybu
    const transitionConfig = {
      duration: isBreathScreen ? 0 : (transition.duration || 0.3), // Instant transition pro breath screen
      ease: [0.4, 0, 0.2, 1]
    };

    // Loading fallback pro Suspense
    const SuspenseFallback = () => {
      // Debug log zakomentován - způsoboval matoucí logy
      // if (currentScreen === 'dychani') {
      //   console.log('⏳ Loading dychani screen...');
      // }
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
        </div>
      );
    };

    // Error boundary pro lazy loaded komponenty
    const LazyComponentWrapper = ({ Component, props }) => {
      React.useEffect(() => {
        // Debug log zakomentován
        // if (currentScreen === 'dychani') {
        //   console.log('✅ Dychani component loaded successfully');
        // }
      }, []);

      if (!Component) {
        console.error(`❌ Component is null for screen '${currentScreen}'`);
        return (
          <div className="flex items-center justify-center h-full min-h-[400px] p-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4">Chyba: Komponenta není načtená</h2>
              <p className="text-gray-600 mb-4">Screen: {currentScreen}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
              >
                Obnovit stránku
              </button>
            </div>
          </div>
        );
      }

      try {
        return <Component {...props} />;
      } catch (error) {
        console.error(`❌ Error rendering component for screen '${currentScreen}':`, error);
        return (
          <div className="flex items-center justify-center h-full min-h-[400px] p-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4">Chyba při načítání sekce</h2>
              <p className="text-gray-600 mb-4">{error.message}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
              >
                Obnovit stránku
              </button>
            </div>
          </div>
        );
      }
    };

    const screenElement = (
      <motion.div
        key={currentScreen}
        initial={isBreathScreen ? false : "initial"} // Deaktivovat initial animaci pro breath screen
        animate={isBreathScreen ? false : "in"} // Deaktivovat animate pro breath screen
        exit={isBreathScreen ? false : "out"} // Deaktivovat exit animaci pro breath screen
        variants={variants}
        transition={transitionConfig}
        className={`w-full max-w-full overflow-x-hidden ${currentScreen === 'home' ? 'h-screen overflow-hidden' : 'h-full'
          }`}
        style={currentScreen === 'home' ? { height: '100dvh', maxHeight: '100dvh' } : {}}
      >
        <Suspense fallback={<SuspenseFallback />}>
          <LazyComponentWrapper Component={Component} props={props} />
        </Suspense>
      </motion.div>
    );

    // Wrap s Layout pokud je potřeba
    if (currentScreenConfig.requiresLayout) {
      return (
        <Layout
          gender={gender}
          onGenderChange={onGenderChange}
          voicePreference={voicePreference}
          onVoicePreferenceChange={onVoicePreferenceChange}
          isPlayerActive={isPlayerActive}
          currentScreen={currentScreen}
          onNavigateToScreen={onNavigateToScreen}
        >
          {screenElement}
        </Layout>
      );
    }

    return screenElement;
  }, [currentScreen, currentScreenConfig, getScreenProps, getTransitionVariants, gender, onGenderChange, voicePreference, onVoicePreferenceChange, isPlayerActive, onNavigateToScreen]);

  return (
    <AnimatePresence mode="wait">
      {renderScreen()}
    </AnimatePresence>
  );
};

// Memoizovat PageManager s custom comparison funkcí
// Tato funkce určuje, kdy se má PageManager re-renderovat
export default React.memo(PageManager, (prevProps, nextProps) => {
  // Seznam props, které by měly vyvolat re-render když se změní
  const criticalProps = [
    'currentScreen',
    'gender',
    'voicePreference',
    'isPlayerActive',
    'selectedDuration',
    'isPlaying',
    'breathPhase',
    'breathInDuration',
    'breathOutDuration',
    'preparationTime',
    'breathInSound',
    'breathOutSound',
    'breathClickSound',
    'breathFinalSound',
    'breathCountdownSound',
    'breathSoundFadeEnabled',
    'isPreparing',
    // preparationCountdown - VYNECHÁNO (mění se každou vteřinu)
    'breathDuration',
    // breathTime - VYNECHÁNO (mění se každou vteřinu)
    'isBreathing',
    'selectedAlbum'
  ];

  // Porovnej pouze kritické props
  // Pokud se některý změnil, vrať false (provést re-render)
  for (const prop of criticalProps) {
    if (prevProps[prop] !== nextProps[prop]) {
      return false; // Props se změnil, provést re-render
    }
  }

  // Všechny kritické props jsou stejné, NEPROVÁDĚT re-render
  // Poznámka: 'time' není v seznamu, takže jeho změny nezpůsobí re-render
  return true;
});
