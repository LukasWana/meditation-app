import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './Layout';

// Lazy loading pro lepší performance
const IntroScreen = lazy(() => import('@features/meditation/screens/IntroScreen'));
const HomeScreen = lazy(() => import('@features/meditation/screens/HomeScreen'));
const MeditationScreen = lazy(() => import('@features/meditation/screens/MeditationScreen'));
const BreathScreen = lazy(() => import('@features/meditation/screens/BreathScreen'));
const SettingsScreen = lazy(() => import('@features/meditation/screens/SettingsScreen'));
const HelpScreen = lazy(() => import('@features/meditation/screens/HelpScreen'));
const HudbaScreen = lazy(() => import('@features/meditation/screens/HudbaScreen'));
const SlovaScreen = lazy(() => import('@features/meditation/screens/SlovaScreen'));
const AlbumDetailScreen = lazy(() => import('@features/meditation/screens/AlbumDetailScreen'));
const AudioPlayer = lazy(() => import('@features/audio/AudioPlayer'));
const SimpleAdminScreen = lazy(() => import('@features/meditation/screens/SimpleAdminScreen'));


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
      type: 'slide',
      direction: 'up',
      duration: 0.6
    }
  },
  'meditation': {
    component: MeditationScreen,
    requiresLayout: true,
    props: ['time', 'selectedDuration', 'isPlaying', 'onDurationChange', 'onPlayPause', 'onReset', 'onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'breathPhase', 'breathInDuration', 'breathOutDuration', 'breathInSound', 'breathOutSound', 'breathClickSound', 'breathFinalSound', 'breathSoundFadeEnabled', 'onBreathSoundChange', 'isPreparing', 'preparationCountdown', 'preparationTime'],
    transition: {
      type: 'slide',
      direction: 'right',
      duration: 0.6
    }
  },
  'breath': {
    component: BreathScreen,
    requiresLayout: true,
    props: ['breathPhase', 'setBreathPhase', 'onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'breathInDuration', 'breathOutDuration', 'onBreathRhythmChange', 'preparationTime', 'onPreparationTimeChange', 'breathDuration', 'breathTime', 'setBreathTime', 'isBreathing', 'setIsBreathing', 'onBreathDurationChange', 'onReset', 'breathInSound', 'breathOutSound', 'breathClickSound', 'breathFinalSound', 'breathSoundFadeEnabled', 'onBreathSoundChange'],
    transition: {
      type: 'scale',
      duration: 0.7
    }
  },
  'settings': {
    component: SettingsScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'onPlayerStateChange', 'gender', 'onGenderChange'],
    transition: {
      type: 'slide',
      direction: 'up',
      duration: 0.6
    }
  },
  'help': {
    component: HelpScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd'],
    transition: {
      type: 'slide',
      direction: 'left',
      duration: 0.6
    }
  },
  'hudba': {
    component: HudbaScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'gender', 'onPlayerStateChange', 'onAlbumSelect'],
    transition: {
      type: 'slide',
      direction: 'up',
      duration: 0.6
    }
  },
  'slova': {
    component: SlovaScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'gender', 'onPlayerStateChange', 'onGenderChange'],
    transition: {
      type: 'slide',
      direction: 'up',
      duration: 0.6
    }
  },
  'album-detail': {
    component: AlbumDetailScreen,
    requiresLayout: true,
    props: ['album', 'onNavigateToScreen', 'onPlayerStateChange', 'onTouchStart', 'onTouchMove', 'onTouchEnd'],
    transition: {
      type: 'slide',
      direction: 'left',
      duration: 0.6
    }
  },
  'audio-player': {
    component: AudioPlayer,
    requiresLayout: false,
    props: ['audioSrc', 'title', 'onClose'],
    transition: {
      type: 'modal',
      duration: 0.4
    }
  },
  'database-admin': {
    component: SimpleAdminScreen,
    requiresLayout: false,
    props: [],
    transition: {
      type: 'slide',
      direction: 'up',
      duration: 0.6
    }
  }
};

// Definice animací
const TRANSITION_VARIANTS = {
  fade: {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 }
  },
  slide: {
    up: {
      initial: { opacity: 0, y: 30, scale: 0.98 },
      in: { opacity: 1, y: 0, scale: 1 },
      out: { opacity: 0, y: -30, scale: 0.98 }
    },
    down: {
      initial: { opacity: 0, y: -30, scale: 0.98 },
      in: { opacity: 1, y: 0, scale: 1 },
      out: { opacity: 0, y: 30, scale: 0.98 }
    },
    left: {
      initial: { opacity: 0, x: 30, scale: 0.98 },
      in: { opacity: 1, x: 0, scale: 1 },
      out: { opacity: 0, x: -30, scale: 0.98 }
    },
    right: {
      initial: { opacity: 0, x: -30, scale: 0.98 },
      in: { opacity: 1, x: 0, scale: 1 },
      out: { opacity: 0, x: 30, scale: 0.98 }
    }
  },
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    in: { opacity: 1, scale: 1 },
    out: { opacity: 0, scale: 1.1 }
  },
  modal: {
    initial: { opacity: 0, scale: 0.8, y: 50 },
    in: { opacity: 1, scale: 1, y: 0 },
    out: { opacity: 0, scale: 0.8, y: 50 }
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

  // Získání variant animace
  const getTransitionVariants = useCallback((transitionType, direction = null) => {
    if (transitionType === 'slide' && direction) {
      return TRANSITION_VARIANTS.slide[direction];
    }
    return TRANSITION_VARIANTS[transitionType] || TRANSITION_VARIANTS.fade;
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
        case 'preparationTime':
          props.preparationTime = preparationTime;
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
        default:
          break;
      }
    });

    return props;
  }, [
    onNavigateToScreen, onTouchStart, onTouchMove, onTouchEnd,
    gender, onPlayerStateChange, onGenderChange, time, selectedDuration, isPlaying,
    onDurationChange, onPlayPause, onReset, breathPhase, setBreathPhase, breathInDuration, breathOutDuration, breathInSound, breathOutSound, breathClickSound, breathFinalSound, breathSoundFadeEnabled, onBreathRhythmChange,
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
    const variants = getTransitionVariants(transition.type, transition.direction);

    const transitionConfig = {
      type: "spring",
      stiffness: 300,
      damping: 30,
      duration: transition.duration || 0.4
    };

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
  }, [currentScreen, currentScreenConfig, getScreenProps, getTransitionVariants, gender, onGenderChange, voicePreference, onVoicePreferenceChange, isPlayerActive]);

  return (
    <AnimatePresence mode="wait">
      {renderScreen()}
    </AnimatePresence>
  );
};

export default PageManager;
