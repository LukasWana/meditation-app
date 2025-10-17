import React, { useEffect } from 'react';
import { PageManager } from '@features/navigation';
import { useNavigation, useTouchNavigation, useAppState } from '@hooks';

export default function MeditationApp() {
  // Navigation state
  const { currentScreen, navigateToScreen } = useNavigation('intro');

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

  return (
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
  );
}