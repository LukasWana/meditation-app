import React, { Suspense } from 'react';
import {
  LazyIntroScreen,
  LazyHomeScreen,
  LazyMeditationScreen,
  LazyBreathScreen,
  LazyHudbaScreen,
  LazySlovaScreen,
  LazyHelpScreen,
  LazySettingsScreen,
  LazyAudioPlayer,
  LazyFramerButton,
  LazyFramerSection
} from '@config/lazyComponents';

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

export {
  LazyIntroScreen,
  LazyHomeScreen,
  LazyMeditationScreen,
  LazyBreathScreen,
  LazyHudbaScreen,
  LazySlovaScreen,
  LazyHelpScreen,
  LazySettingsScreen,
  LazyAudioPlayer,
  LazyFramerButton,
  LazyFramerSection
};

export default LazyWrapper;
