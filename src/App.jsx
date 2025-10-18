import React, { useEffect, useState } from 'react';
import { PageManager } from '@features/navigation';
import { useNavigation, useTouchNavigation, useAppState, useBackgroundDataLoader, useTimer, useBreathPhase } from '@hooks';
import IntroScreen from '@features/meditation/screens/IntroScreen';

export default function MeditationApp() {
  // Intro state
  const [showIntro, setShowIntro] = useState(true);

  // Navigation state
  const { currentScreen, navigateToScreen } = useNavigation('intro');

  // Navigation history odstraněn - nepoužívaný

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

  // Navigation history tracking odstraněn - nepoužívaný

  // Timer logika
  useTimer(isPlaying, time, setTime, setIsPlaying);

  // Breath phase logika
  useBreathPhase(isPlaying, time, setBreathPhase);

  // Načti data v pozadí během intro animace
  useBackgroundDataLoader(showIntro);

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

    </div>
  );
}