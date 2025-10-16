import React, { useState, useEffect } from 'react';
import IntroScreen from '@features/meditation/screens/IntroScreen';
import {
  HomeScreen,
  MeditationScreen,
  BreathScreen,
  HelpScreen,
  JourneyScreen,
  TroubleScreen
} from '@features/meditation';
import { Layout } from '@features/navigation';

export default function MeditationApp() {
  const [screen, setScreen] = useState('intro');
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(300);
  const [selectedDuration, setSelectedDuration] = useState(5);
  const [breathPhase, setBreathPhase] = useState('in');
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [gender, setGender] = useState('none'); // 'male', 'female', 'none'
  const [voicePreference, setVoicePreference] = useState('auto'); // 'male', 'female', 'auto'
  const [isPlayerActive, setIsPlayerActive] = useState(false); // Stav přehrávače

  const minSwipeDistance = 30; // Znížené pre ľahšie swipe

  const handleIntroComplete = () => {
    setScreen('home');
  };

  const handleGenderChange = (selectedGender) => {
    setGender(selectedGender);
  };

  const handleVoicePreferenceChange = (selectedVoice) => {
    setVoicePreference(selectedVoice);
  };

  const handlePlayerStateChange = (isActive) => {
    setIsPlayerActive(isActive);
  };

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
  }, [isPlaying, time, selectedDuration]);

  // Breath animation effect with proper cleanup
  useEffect(() => {
    let interval;
    if (screen === 'breath') {
      interval = setInterval(() => {
        setBreathPhase(prev => {
          if (prev === 'in') return 'hold';
          if (prev === 'hold') return 'out';
          return 'in';
        });
      }, 4000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [screen]);

  // Event handlers
  const handleReset = () => {
    setIsPlaying(false);
    setTime(selectedDuration * 60);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleDurationChange = (duration) => {
    const validDurations = [5, 10, 15, 20];
    if (validDurations.includes(duration) && typeof duration === 'number' && duration > 0) {
      setSelectedDuration(duration);
      setTime(duration * 60);
    }
  };

  const onTouchStart = (e) => {
    if (!e.targetTouches || !e.targetTouches[0]) return;

    const touch = e.targetTouches[0];
    if (typeof touch.clientX !== 'number' || touch.clientX < 0 || touch.clientX > window.innerWidth) {
      return;
    }

    setTouchEnd(null);
    setTouchStart(touch.clientX);
  };

  const onTouchMove = (e) => {
    if (!e.targetTouches || !e.targetTouches[0]) return;

    const touch = e.targetTouches[0];
    if (typeof touch.clientX !== 'number' || touch.clientX < 0 || touch.clientX > window.innerWidth) {
      return;
    }

    setTouchEnd(touch.clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isRightSwipe = distance > minSwipeDistance;

    if (isRightSwipe && screen !== 'home') {
      setScreen('home');
      setTouchStart(null);
      setTouchEnd(null);
    }
  };

  const navigateToScreen = (screenName) => {
    const validScreens = ['home', 'meditation', 'breath', 'help', 'journey', 'trouble'];
    if (validScreens.includes(screenName)) {
      setScreen(screenName);
    }
  };

  // Screen routing
  if (screen === 'intro') {
    return <IntroScreen onIntroComplete={handleIntroComplete} />;
  }

  if (screen === 'home') {
    return (
      <Layout
        gender={gender}
        onGenderChange={handleGenderChange}
        voicePreference={voicePreference}
        onVoicePreferenceChange={handleVoicePreferenceChange}
      >
        <HomeScreen
          onNavigateToScreen={navigateToScreen}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
      </Layout>
    );
  }

  if (screen === 'meditation') {
    return (
      <Layout
        gender={gender}
        onGenderChange={handleGenderChange}
        voicePreference={voicePreference}
        onVoicePreferenceChange={handleVoicePreferenceChange}
      >
        <MeditationScreen
          time={time}
          selectedDuration={selectedDuration}
          isPlaying={isPlaying}
          onDurationChange={handleDurationChange}
          onPlayPause={handlePlayPause}
          onReset={handleReset}
          onNavigateToScreen={navigateToScreen}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
      </Layout>
    );
  }

  if (screen === 'breath') {
    return (
      <Layout
        gender={gender}
        onGenderChange={handleGenderChange}
        voicePreference={voicePreference}
        onVoicePreferenceChange={handleVoicePreferenceChange}
      >
        <BreathScreen
          breathPhase={breathPhase}
          onNavigateToScreen={navigateToScreen}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
      </Layout>
    );
  }

  if (screen === 'help') {
    return (
      <Layout
        gender={gender}
        onGenderChange={handleGenderChange}
        voicePreference={voicePreference}
        onVoicePreferenceChange={handleVoicePreferenceChange}
      >
        <HelpScreen
          onNavigateToScreen={navigateToScreen}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
      </Layout>
    );
  }

  if (screen === 'journey') {
    return (
      <Layout
        gender={gender}
        onGenderChange={handleGenderChange}
        voicePreference={voicePreference}
        onVoicePreferenceChange={handleVoicePreferenceChange}
      >
        <JourneyScreen
          onNavigateToScreen={navigateToScreen}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
      </Layout>
    );
  }

  if (screen === 'trouble') {
    return (
      <Layout
        gender={gender}
        onGenderChange={handleGenderChange}
        voicePreference={voicePreference}
        onVoicePreferenceChange={handleVoicePreferenceChange}
        isPlayerActive={isPlayerActive}
      >
        <TroubleScreen
          onNavigateToScreen={navigateToScreen}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          gender={gender}
          onPlayerStateChange={handlePlayerStateChange}
        />
      </Layout>
    );
  }

  return null;
}