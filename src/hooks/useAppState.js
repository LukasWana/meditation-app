import { useState, useCallback } from 'react';

export const useAppState = () => {
  // Meditace state
  const [time, setTime] = useState(300);
  const [selectedDuration, setSelectedDuration] = useState(5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [breathPhase, setBreathPhase] = useState('in');

  // User preferences
  const [gender, setGender] = useState('none'); // 'male', 'female', 'none'
  const [voicePreference, setVoicePreference] = useState('auto'); // 'male', 'female', 'auto'

  // Audio player state
  const [isPlayerActive, setIsPlayerActive] = useState(false);
  const [activeAudio, setActiveAudio] = useState(null);

  // Handlers pro meditaci
  const handleDurationChange = useCallback((duration) => {
    setSelectedDuration(duration);
    setTime(duration * 60); // Převod na sekundy
  }, []);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setTime(selectedDuration * 60);
    setBreathPhase('in');
  }, [selectedDuration]);

  // Handlers pro user preferences
  const handleGenderChange = useCallback((selectedGender) => {
    setGender(selectedGender);
  }, []);

  const handleVoicePreferenceChange = useCallback((selectedVoice) => {
    setVoicePreference(selectedVoice);
  }, []);

  // Handlers pro audio player
  const handlePlayerStateChange = useCallback((isActive) => {
    setIsPlayerActive(isActive);
  }, []);

  const handleOpenAudio = useCallback((audioData) => {
    setActiveAudio(audioData);
    setIsPlayerActive(true);
  }, []);

  const handleCloseAudio = useCallback(() => {
    setActiveAudio(null);
    setIsPlayerActive(false);
  }, []);

  return {
    // Meditace state
    time,
    setTime,
    selectedDuration,
    isPlaying,
    setIsPlaying,
    breathPhase,
    setBreathPhase,

    // User preferences
    gender,
    voicePreference,

    // Audio player state
    isPlayerActive,
    activeAudio,

    // Handlers
    handleDurationChange,
    handlePlayPause,
    handleReset,
    handleGenderChange,
    handleVoicePreferenceChange,
    handlePlayerStateChange,
    handleOpenAudio,
    handleCloseAudio
  };
};
