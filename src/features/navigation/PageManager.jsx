import React, { useCallback, useMemo, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './Layout';
import { getTransitionVariants, getTransitionConfig } from '@config/animations';
import {
  IntroScreen,
  HomeScreen,
  MeditationScreen,
  BreathScreen,
  SettingsScreen,
  ActivityHistoryScreen,
  HelpScreen,
  HudbaScreen,
  AlbumDetailScreen,
  AudioPlayer,
  SimpleAdminScreen,
  SoundThemeGalleryScreen,
  BreathProfilesScreen,
  PreparationTimePickerScreen,
  DurationPickerScreen,
  RhythmPickerScreen
} from '@config/lazyComponents';


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
      duration: 0.2
    }
  },
  'meditace': {
    component: MeditationScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'gender', 'onPlayerStateChange', 'onGenderChange'],
    transition: {
      type: 'fade',
      duration: 0.2
    }
  },
  'dychani': {
    component: BreathScreen,
    requiresLayout: true,
    props: ['breathPhase', 'setBreathPhase', 'onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'breathInDuration', 'breathOutDuration', 'onBreathRhythmChange', 'preparationTime', 'onPreparationTimeChange', 'isPreparing', 'preparationCountdown', 'breathDuration', 'breathTime', 'setBreathTime', 'isBreathing', 'setIsBreathing', 'onBreathDurationChange', 'onReset', 'breathInSound', 'breathOutSound', 'breathClickSound', 'breathFinalSound', 'breathCountdownSound', 'breathSoundFadeEnabled', 'onBreathSoundChange'],
    transition: {
      type: 'fade',
      duration: 0.2
    }
  },
  'breath': {
    component: BreathScreen,
    requiresLayout: true,
    props: ['breathPhase', 'setBreathPhase', 'onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'breathInDuration', 'breathOutDuration', 'onBreathRhythmChange', 'preparationTime', 'onPreparationTimeChange', 'isPreparing', 'preparationCountdown', 'breathDuration', 'breathTime', 'setBreathTime', 'isBreathing', 'setIsBreathing', 'onBreathDurationChange', 'onReset', 'breathInSound', 'breathOutSound', 'breathClickSound', 'breathFinalSound', 'breathCountdownSound', 'breathSoundFadeEnabled', 'onBreathSoundChange'],
    transition: {
      type: 'fade',
      duration: 0.2
    }
  },
  'settings': {
    component: SettingsScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'onPlayerStateChange', 'gender', 'onGenderChange'],
    transition: {
      type: 'fade',
      duration: 0.2
    }
  },
  'activity-history': {
    component: ActivityHistoryScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd'],
    transition: {
      type: 'fade',
      duration: 0.2
    }
  },
  'help': {
    component: HelpScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd'],
    transition: {
      type: 'fade',
      duration: 0.2
    }
  },
  'hudba': {
    component: HudbaScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'gender', 'onPlayerStateChange', 'onAlbumSelect'],
    transition: {
      type: 'fade',
      duration: 0.2
    }
  },
  'album-detail': {
    component: AlbumDetailScreen,
    requiresLayout: true,
    props: ['album', 'onNavigateToScreen', 'onPlayerStateChange', 'onTouchStart', 'onTouchMove', 'onTouchEnd'],
    transition: {
      type: 'fade',
      duration: 0.2
    }
  },
  'audio-player': {
    component: AudioPlayer,
    requiresLayout: false,
    props: ['audioSrc', 'title', 'onClose'],
    transition: {
      type: 'fade',
      duration: 0.2
    }
  },
  'database-admin': {
    component: SimpleAdminScreen,
    requiresLayout: false,
    props: [],
    transition: {
      type: 'fade',
      duration: 0.2
    }
  },
  'sound-theme-gallery': {
    component: SoundThemeGalleryScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'onSelectSound', 'selectedInSound', 'selectedOutSound', 'selectedClickSound', 'selectedFinalSound', 'selectedCountdownSound'],
    transition: {
      type: 'fade',
      duration: 0.2
    }
  },
  'breath-profiles': {
    component: BreathProfilesScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'breathInDuration', 'breathOutDuration', 'breathDuration', 'preparationTime', 'breathInSound', 'breathOutSound', 'breathClickSound', 'breathFinalSound', 'breathCountdownSound', 'breathSoundFadeEnabled', 'onBreathRhythmChange', 'onBreathDurationChange', 'onPreparationTimeChange', 'onBreathSoundChange', 'onBreathSoundFadeChange'],
    transition: {
      type: 'fade',
      duration: 0.2
    }
  },
  'preparation-time-picker': {
    component: PreparationTimePickerScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'preparationTime', 'onPreparationTimeChange'],
    transition: {
      type: 'fade',
      duration: 0.2
    }
  },
  'duration-picker': {
    component: DurationPickerScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'breathDuration', 'onBreathDurationChange', 'setBreathTime'],
    transition: {
      type: 'fade',
      duration: 0.2
    }
  },
  'rhythm-picker': {
    component: RhythmPickerScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'breathInDuration', 'breathOutDuration', 'onBreathRhythmChange'],
    transition: {
      type: 'fade',
      duration: 0.2
    }
  }
};

// Animace se nyní načítají z globální konfigurace

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

  // Získání variant animace z globální konfigurace
  const getTransitionVariantsLocal = useCallback((transitionType, direction = null) => {
    return getTransitionVariants(transitionType, direction);
  }, []);

  // Vytvoření props pro komponentu
  const getScreenProps = useCallback((screenKey) => {
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
        default:
          break;
      }
    });

    return props;
  }, [
    onNavigateToScreen, onTouchStart, onTouchMove, onTouchEnd,
    gender, onPlayerStateChange, onGenderChange, time, selectedDuration, isPlaying,
    onDurationChange, onPlayPause, onReset, breathPhase, setBreathPhase, breathInDuration, breathOutDuration, breathInSound, breathOutSound, breathClickSound, breathFinalSound, breathCountdownSound, breathSoundFadeEnabled, onBreathRhythmChange,
    preparationTime, onPreparationTimeChange, onBreathSoundChange, onBreathSoundFadeChange,
    isPreparing, preparationCountdown,
    breathDuration, breathTime, setBreathTime, isBreathing, setIsBreathing, onBreathDurationChange,
    activeAudio, onCloseAudio, selectedAlbum, onAlbumSelect, onAlbumClose
  ]);

  // Renderování stránky
  const renderScreen = useCallback(() => {
    if (!currentScreenConfig) {
      console.warn(`Stránka '${currentScreen}' nebyla nalezena v registru`);
      return null;
    }

    const Component = currentScreenConfig.component;
    const props = getScreenProps(currentScreen);
    const transition = currentScreenConfig.transition;
    const variants = getTransitionVariantsLocal(transition.type, transition.direction);
    const transitionConfig = getTransitionConfig(transition.duration);

    const screenElement = (
      <motion.div
        key={currentScreen}
        initial="initial"
        animate="in"
        exit="out"
        variants={variants}
        transition={transitionConfig}
        className="w-full h-full max-w-full overflow-x-hidden"
      >
        <Suspense fallback={<div className="flex items-center justify-center h-full"></div>}>
          <Component {...props} />
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
        >
          {screenElement}
        </Layout>
      );
    }

    return screenElement;
  }, [currentScreen, currentScreenConfig, getScreenProps, getTransitionVariantsLocal, gender, onGenderChange, voicePreference, onVoicePreferenceChange, isPlayerActive]);

  return (
    <AnimatePresence mode="wait">
      {renderScreen()}
    </AnimatePresence>
  );
};

export default PageManager;
