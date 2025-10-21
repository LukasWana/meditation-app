import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PageManager } from '@features/navigation';
import { useNavigation, useTouchNavigation, useAppState, useBackgroundDataLoader, useTimer, useBreathPhase } from '@hooks';
import { LazyIntroScreen } from '@components/LazyWrapper';
import { LanguageProvider } from '@contexts/LanguageContext';
import MonitoringDashboard from '@components/MonitoringDashboard';

import ErrorBoundary from '@components/ErrorBoundary';
import { register } from '@services/serviceWorker';
import NewAdminScreen from '@features/meditation/screens/NewAdminScreen';

// Hlavní aplikace s routingem
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminApp />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/*" element={<MeditationApp />} />
      </Routes>
    </BrowserRouter>
  );
}

// Meditační aplikace
function MeditationApp() {
  // Intro state
  const [showIntro, setShowIntro] = useState(true);

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


  // Timer logika
  useTimer(isPlaying, time, setTime, setIsPlaying);

  // Breath phase logika
  useBreathPhase(isPlaying, time, setBreathPhase);

  // Načti data v pozadí během intro animace
  useBackgroundDataLoader(showIntro);

  // Service Worker registrace
  React.useEffect(() => {
    // Registruj Service Worker pouze v produkci nebo když je připraven
    if (import.meta.env.MODE === 'production' || window.location.protocol === 'https:') {
      register();
    }

    // Načti database viewer pro development
    if (import.meta.env.MODE === 'development') {
      import('./scripts/consoleDbViewer.js').then(() => {
        console.log('🔍 Database viewer je k dispozici v konzoli');
      });
    }
  }, []);

  // Intro completion handler
  const handleIntroComplete = () => {
    setShowIntro(false);
    navigateToScreen('home');
  };

  return (
    <ErrorBoundary>
      <LanguageProvider>
        <div className="min-h-screen w-full bg-[#f4ddc4] overflow-x-hidden">
      {/* Intro animace s písmem "Meditácia" */}
      {showIntro && (
        <LazyIntroScreen onIntroComplete={handleIntroComplete} />
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
      </LanguageProvider>
    </ErrorBoundary>
  );
}

// Admin aplikace - jednoduchá verze
export function AdminApp() {
  // Monitoring state
  const [showMonitoring, setShowMonitoring] = useState(false);

  return (
    <ErrorBoundary>
      <LanguageProvider>
        <NewAdminScreen />

        {/* Monitoring Dashboard - pouze v admin */}
        {import.meta.env.MODE === 'development' && (
          <>
            <button
              onClick={() => setShowMonitoring(!showMonitoring)}
              className="fixed top-4 right-4 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm shadow-lg hover:bg-blue-600 transition-colors z-50"
            >
              📊 Monitor
            </button>
            <MonitoringDashboard
              isVisible={showMonitoring}
              onClose={() => setShowMonitoring(false)}
            />
          </>
        )}
      </LanguageProvider>
    </ErrorBoundary>
  );
}