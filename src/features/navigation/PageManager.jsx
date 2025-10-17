import React, { useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './Layout';

// Import všech stránek
import IntroScreen from '@features/meditation/screens/IntroScreen';
import {
  HomeScreen,
  MeditationScreen,
  BreathScreen,
  HelpScreen,
  BezSlovScreen,
  SlovaScreen,
  AlbumDetailScreen
} from '@features/meditation';
import { AudioPlayer } from '@features/audio';

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
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd'],
    transition: {
      type: 'slide',
      direction: 'up',
      duration: 0.6
    }
  },
  'meditation': {
    component: MeditationScreen,
    requiresLayout: true,
    props: ['time', 'selectedDuration', 'isPlaying', 'onDurationChange', 'onPlayPause', 'onReset', 'onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd'],
    transition: {
      type: 'slide',
      direction: 'right',
      duration: 0.6
    }
  },
  'breath': {
    component: BreathScreen,
    requiresLayout: true,
    props: ['breathPhase', 'onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd'],
    transition: {
      type: 'scale',
      duration: 0.7
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
  'bez-slov': {
    component: BezSlovScreen,
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
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'gender', 'onPlayerStateChange'],
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
    gender, onPlayerStateChange, time, selectedDuration, isPlaying,
    onDurationChange, onPlayPause, onReset, breathPhase,
    activeAudio, onCloseAudio
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
      stiffness: 100,
      damping: 20,
      duration: transition.duration || 0.6
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
        <Component {...props} />
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
