import { useState, useCallback } from 'react';

export const useAppState = () => {

  // Meditace state
  const [time, setTime] = useState(300);
  const [selectedDuration, setSelectedDuration] = useState(5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [breathPhase, setBreathPhase] = useState('in');

  // User preferences
  const [gender, setGender] = useState(() => {
    // Načti gender z localStorage nebo použij default
    const savedGender = localStorage.getItem('meditation-app-gender');
    return savedGender || 'none';
  });
  const [voicePreference, setVoicePreference] = useState(() => {
    // Načti voice preference z localStorage nebo použij default
    const savedVoice = localStorage.getItem('meditation-app-voice');
    return savedVoice || 'auto';
  });

  // Audio player state
  const [isPlayerActive, setIsPlayerActive] = useState(false);
  const [activeAudio, setActiveAudio] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);

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
    localStorage.setItem('meditation-app-gender', selectedGender);
  }, []);

  const handleVoicePreferenceChange = useCallback((selectedVoice) => {
    setVoicePreference(selectedVoice);
    localStorage.setItem('meditation-app-voice', selectedVoice);
  }, []);

  // Handlers pro audio player
  const handlePlayerStateChange = useCallback((isActive) => {
    setIsPlayerActive(isActive);
  }, []);


  const handleCloseAudio = useCallback(() => {
    setActiveAudio(null);
    setIsPlayerActive(false);
  }, []);

  const handleAlbumClose = useCallback(() => {
    setSelectedAlbum(null);
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
    selectedAlbum,

    // Handlers
    handleDurationChange,
    handlePlayPause,
    handleReset,
    handleGenderChange,
    handleVoicePreferenceChange,
    handlePlayerStateChange,
    handleCloseAudio,
    handleAlbumClose
  };
};
