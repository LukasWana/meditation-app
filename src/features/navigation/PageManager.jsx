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
  SoundThemeGalleryScreen,
  BreathProfilesScreen,
  PreparationTimePickerScreen,
  DurationPickerScreen,
  RhythmPickerScreen
} from '@config/lazyComponents';
import { useUserPrefsStore } from '@stores/userPrefsStore';
import { useMeditationStore } from '@stores/meditationStore';


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
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd'],
    transition: {
      type: 'fade',
      duration: 0.2
    }
  },
  'breath': {
    component: BreathScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd'],
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
  'sound-theme-gallery': {
    component: SoundThemeGalleryScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd'],
    transition: {
      type: 'fade',
      duration: 0.2
    }
  },
  'breath-profiles': {
    component: BreathProfilesScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd'],
    transition: {
      type: 'fade',
      duration: 0.2
    }
  },
  'preparation-time-picker': {
    component: PreparationTimePickerScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd'],
    transition: {
      type: 'fade',
      duration: 0.2
    }
  },
  'duration-picker': {
    component: DurationPickerScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd'],
    transition: {
      type: 'fade',
      duration: 0.2
    }
  },
  'rhythm-picker': {
    component: RhythmPickerScreen,
    requiresLayout: true,
    props: ['onNavigateToScreen', 'onTouchStart', 'onTouchMove', 'onTouchEnd'],
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

  // Audio player specifické (zatím ponecháno pro screens které ho potřebují)
  activeAudio,
  onPlayerStateChange,
  onCloseAudio,
  selectedAlbum,
  onAlbumSelect,
  onAlbumClose
}) => {
  const { gender, setGender: onGenderChange } = useUserPrefsStore();
  const {
    time,
    selectedDuration,
    isPlaying,
    togglePlayPause: onPlayPause,
    resetMeditation: onReset,
    setDuration: onDurationChange
  } = useMeditationStore();

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
    onDurationChange, onPlayPause, onReset,
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
          currentScreen={currentScreen}
        >
          {screenElement}
        </Layout>
      );
    }

    return screenElement;
  }, [currentScreen, currentScreenConfig, getScreenProps, getTransitionVariantsLocal]);

  return (
    <AnimatePresence mode="wait">
      {renderScreen()}
    </AnimatePresence>
  );
};

export default PageManager;
