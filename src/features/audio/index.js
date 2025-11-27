// Audio feature exports
export { default as AudioPlayer } from './AudioPlayer';
export { default as AudioPlayerPage } from './AudioPlayerPage';

// Explicitní re-exporty z components (místo export * pro lepší kompatibilitu s minifikací)
export {
  AudioPlayerHeader,
  CircularProgress,
  PlayPauseButton,
  SkipButton,
  CurrentTimeDisplay,
  CloseButton,
  LoadingIndicator,
  AudioControls,
  VoiceSwitcher,
  TrackSwitcher,
  AudioPlayerAnimations
} from './components';

// Explicitní re-exporty z hooks (místo export * pro lepší kompatibilitu s minifikací)
export {
  useAudioPlayer,
  useAudioPlayerSimple,
  useFirebaseAudio,
  AUDIO_FILES,
  ALL_AUDIO_FILES,
  useDirectAudio,
  DIRECT_AUDIO_URLS,
  useFirebaseAudioFilter,
  useFirebaseHudbaFilter,
  useVoiceSwitcher,
  useAudioContext,
  useAutoplay,
  useAudioPlayerLogic,
  useAudioPlayback,
  useAudioContextManager
} from './hooks';
