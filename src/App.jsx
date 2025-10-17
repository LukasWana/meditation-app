import React, { useEffect, useRef, useState } from 'react';
import { PageManager } from '@features/navigation';
import { useNavigation, useTouchNavigation, useAppState } from '@hooks';
// Predictive preloader odstraněn - data se načítají při startu
// useSimplePreloader odstraněn - data se načítají v pozadí
import IntroScreen from '@features/meditation/screens/IntroScreen';

export default function MeditationApp() {
  // Intro state
  const [showIntro, setShowIntro] = useState(true);

  // Navigation state
  const { currentScreen, navigateToScreen } = useNavigation('intro');

  // Navigation history pro prediktivní preloading
  const navigationHistoryRef = useRef([]);

  // Preloading odstraněn - data se načítají v pozadí během animace

  // Prediktivní preloading odstraněn - data se načítají při startu

  // App state
  const {
    time,
    setTime,
    selectedDuration,
    isPlaying,
    setIsPlaying,
    breathPhase,
    setBreathPhase,
    gender,
    voicePreference,
    isPlayerActive,
    activeAudio,
    selectedAlbum,
    handleDurationChange,
    handlePlayPause,
    handleReset,
    handleGenderChange,
    handleVoicePreferenceChange,
    handlePlayerStateChange,
    handleCloseAudio,
    handleAlbumClose
  } = useAppState();

  // Touch navigation
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useTouchNavigation({
    minSwipeDistance: 30,
    onSwipeLeft: () => {
      // Navigace zpět při swipe vlevo
      if (currentScreen !== 'home') {
        navigateToScreen('home');
      }
    },
    onSwipeRight: () => {
      // Navigace zpět při swipe vpravo
      if (currentScreen !== 'home') {
        navigateToScreen('home');
      }
    }
  });

  // Aktualizuj navigation history při změně obrazovky
  useEffect(() => {
    if (currentScreen) {
      navigationHistoryRef.current.push(currentScreen);
      // Udržuj pouze posledních 10 navigací
      if (navigationHistoryRef.current.length > 10) {
        navigationHistoryRef.current = navigationHistoryRef.current.slice(-10);
      }
    }
  }, [currentScreen]);

  // Timer effect with proper cleanup
  useEffect(() => {
    let interval;
    if (isPlaying && time > 0) {
      interval = setInterval(() => {
        setTime(t => t - 1);
      }, 1000);
    } else if (time === 0 && isPlaying) {
      setIsPlaying(false);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlaying, time, setTime, setIsPlaying]);

  // Breath phase effect
  useEffect(() => {
    let interval;
    if (isPlaying && time > 0) {
      interval = setInterval(() => {
        setBreathPhase(prev => prev === 'in' ? 'out' : 'in');
      }, 4000); // 4 sekundy pro každou fázi
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlaying, time, setBreathPhase]);

  // Načti data v pozadí během intro animace
  useEffect(() => {
    if (showIntro) {
      // Spusť načítání dat v pozadí během animace
      const loadDataInBackground = async () => {
        try {
          // Import dynamicky aby se nenačítal při startu
          const { staticMetadataService } = await import('@services/staticMetadataService');
          const cacheService = (await import('@services/cacheService')).default;

          // Inicializuj metadata službu
          await staticMetadataService.initialize();

          // Preload kritická metadata
          await cacheService.preloadCriticalData();

          console.log('✅ Background data loading completed during intro animation');
        } catch (error) {
          console.warn('Background data loading failed:', error);
        }
      };

      // Spusť po malém delay aby neovlivnilo animaci
      setTimeout(loadDataInBackground, 500);
    }
  }, [showIntro]);

  // Intro completion handler
  const handleIntroComplete = () => {
    setShowIntro(false);
    navigateToScreen('home');
  };

  return (
    <div className="min-h-screen w-full bg-[#f4ddc4] overflow-x-hidden">
      {/* Intro animace s písmem "Meditácia" */}
      {showIntro && (
        <IntroScreen onIntroComplete={handleIntroComplete} />
      )}

      {/* Hlavní aplikace - zobrazí se až po intro */}
      {!showIntro && (
        <PageManager
        // Navigation
        currentScreen={currentScreen}
        onNavigateToScreen={navigateToScreen}

        // Touch handling
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}

        // Global state
        gender={gender}
        onGenderChange={handleGenderChange}
        voicePreference={voicePreference}
        onVoicePreferenceChange={handleVoicePreferenceChange}
        isPlayerActive={isPlayerActive}

        // Meditace specifické
        time={time}
        selectedDuration={selectedDuration}
        isPlaying={isPlaying}
        onDurationChange={handleDurationChange}
        onPlayPause={handlePlayPause}
        onReset={handleReset}
        breathPhase={breathPhase}

        // Audio player specifické
        activeAudio={activeAudio}
        selectedAlbum={selectedAlbum}
        onPlayerStateChange={handlePlayerStateChange}
        onCloseAudio={handleCloseAudio}
        onAlbumClose={handleAlbumClose}
        />
      )}

      {/* Debug info v development módu - HIDDEN */}
      {/* {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 bg-white bg-opacity-90 p-3 rounded-lg shadow-lg z-40 text-xs">
          <div className="font-bold mb-1">Data Collection:</div>
          <div>Static: {preloadStatus.metadata ? '✅' : '⏳'}</div>
          <div>Firebase: {preloadStatus.firebase ? '✅' : '⏳'}</div>
          <div>Slova: {preloadStatus.slova ? '✅' : '⏳'}</div>
          <div>Hudba: {preloadStatus.hudba ? '✅' : '⏳'}</div>
          <div>Structured: {preloadStatus.structured ? '✅' : '⏳'}</div>
          <div className="mt-2 text-xs text-gray-600">
            Firebase metadata + UI data
          </div>
        </div>
      )} */}
    </div>
  );
}