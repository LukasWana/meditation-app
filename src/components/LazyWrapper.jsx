import React, { Suspense, lazy } from 'react';

const LazyWrapper = ({ children, fallback = null }) => {
  const defaultFallback = (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};

export const LazyIntroScreen = lazy(() => import('@features/meditation/screens/IntroScreen'));
export const LazyHomeScreen = lazy(() => import('@features/meditation/screens/HomeScreen'));
export const LazyMeditationScreen = lazy(() => import('@features/meditation/screens/MeditationScreen'));
export const LazyBreathScreen = lazy(() => import('@features/meditation/screens/BreathScreen'));
export const LazyHudbaScreen = lazy(() => import('@features/meditation/screens/HudbaScreen'));
export const LazySlovaScreen = lazy(() => import('@features/meditation/screens/SlovaScreen'));
export const LazyHelpScreen = lazy(() => import('@features/meditation/screens/HelpScreen'));
export const LazySettingsScreen = lazy(() => import('@features/meditation/screens/SettingsScreen'));

export const LazyAudioPlayer = lazy(() => import('@features/audio/AudioPlayer'));
export const LazyFramerButton = lazy(() => import('@components/FramerButton'));
export const LazyFramerSection = lazy(() => import('@components/FramerSection'));

export default LazyWrapper;
