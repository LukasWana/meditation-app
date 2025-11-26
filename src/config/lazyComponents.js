import { lazy } from 'react';

/**
 * Centralizovaný registry lazy-loaded komponent
 *
 * Tento soubor obsahuje všechny lazy loading definice pro aplikaci.
 * Používá se v LazyWrapper.jsx, PageManager.jsx a App.jsx.
 */

// Screen komponenty
export const IntroScreen = lazy(() => import('@features/meditation/screens/IntroScreen'));
export const HomeScreen = lazy(() => import('@features/meditation/screens/HomeScreen'));
export const MeditationScreen = lazy(() => import('@features/meditation/screens/MeditationScreen'));
export const BreathScreen = lazy(() => import('@features/meditation/screens/BreathScreen'));
export const HudbaScreen = lazy(() => import('@features/meditation/screens/HudbaScreen'));
export const SlovaScreen = lazy(() => import('@features/meditation/screens/SlovaScreen'));
export const HelpScreen = lazy(() => import('@features/meditation/screens/HelpScreen'));
export const SettingsScreen = lazy(() => import('@features/meditation/screens/SettingsScreen'));
export const AlbumDetailScreen = lazy(() => import('@features/meditation/screens/AlbumDetailScreen'));
export const SimpleAdminScreen = lazy(() => import('@features/meditation/screens/SimpleAdminScreen'));
export const SoundThemeGalleryScreen = lazy(() => import('@features/meditation/screens/SoundThemeGalleryScreen'));
export const BreathProfilesScreen = lazy(() => import('@features/meditation/screens/BreathProfilesScreen'));
export const PreparationTimePickerScreen = lazy(() => import('@features/meditation/screens/PreparationTimePickerScreen'));
export const DurationPickerScreen = lazy(() => import('@features/meditation/screens/DurationPickerScreen'));
export const RhythmPickerScreen = lazy(() => import('@features/meditation/screens/RhythmPickerScreen'));

// Audio komponenty
export const AudioPlayer = lazy(() => import('@features/audio/AudioPlayer'));

// UI komponenty
export const FramerButton = lazy(() => import('@components/FramerButton'));
export const FramerSection = lazy(() => import('@components/FramerSection'));

// Aliasy pro zpětnou kompatibilitu s LazyWrapper.jsx
export const LazyIntroScreen = IntroScreen;
export const LazyHomeScreen = HomeScreen;
export const LazyMeditationScreen = MeditationScreen;
export const LazyBreathScreen = BreathScreen;
export const LazyHudbaScreen = HudbaScreen;
export const LazySlovaScreen = SlovaScreen;
export const LazyHelpScreen = HelpScreen;
export const LazySettingsScreen = SettingsScreen;
export const LazyAudioPlayer = AudioPlayer;
export const LazyFramerButton = FramerButton;
export const LazyFramerSection = FramerSection;
