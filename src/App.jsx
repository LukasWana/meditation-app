import React, { useState, useEffect } from 'react';
import IntroScreen from './components/screens/IntroScreen';
import HomeScreen from './components/screens/HomeScreen';
import MeditationScreen from './components/screens/MeditationScreen';
import BreathScreen from './components/screens/BreathScreen';
import HelpScreen from './components/screens/HelpScreen';
import JourneyScreen from './components/screens/JourneyScreen';
import TroubleScreen from './components/screens/TroubleScreen';

export default function MeditationApp() {
  const [screen, setScreen] = useState('intro');
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(300);
  const [selectedDuration, setSelectedDuration] = useState(5);
  const [breathPhase, setBreathPhase] = useState('in');
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 30; // Znížené pre ľahšie swipe

  const handleIntroComplete = () => {
    setScreen('home');
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
      <HomeScreen
        onNavigateToScreen={navigateToScreen}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />
    );
  }

  if (screen === 'meditation') {
    return (
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
    );
  }

  if (screen === 'breath') {
    return (
      <BreathScreen
        breathPhase={breathPhase}
        onNavigateToScreen={navigateToScreen}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />
    );
  }

  if (screen === 'help') {
    return (
      <HelpScreen
        onNavigateToScreen={navigateToScreen}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />
    );
  }

  if (screen === 'journey') {
    return (
      <JourneyScreen
        onNavigateToScreen={navigateToScreen}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />
    );
  }

  if (screen === 'trouble') {
    return (
      <TroubleScreen
        onNavigateToScreen={navigateToScreen}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />
    );
  }

  return null;
}