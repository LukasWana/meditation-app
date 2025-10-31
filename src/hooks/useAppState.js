import { useState, useCallback } from 'react';

export const useAppState = () => {

  // Meditace state
  const [time, setTime] = useState(180); // 3 minuty v sekundách
  const [selectedDuration, setSelectedDuration] = useState(3); // Výchozí 3 minuty
  const [isPlaying, setIsPlaying] = useState(false);
  const [breathPhase, setBreathPhase] = useState('in');

  // Nastavení rytmu dýchání (nádech:výdech v sekundách)
  const [breathInDuration, setBreathInDuration] = useState(() => {
    const saved = localStorage.getItem('meditation-app-breath-in');
    return saved ? parseInt(saved, 10) : 6; // Výchozí 6 sekund
  });
  const [breathOutDuration, setBreathOutDuration] = useState(() => {
    const saved = localStorage.getItem('meditation-app-breath-out');
    return saved ? parseInt(saved, 10) : 8; // Výchozí 8 sekund
  });

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

  // Handlers pro rytmus dýchání
  const handleBreathRhythmChange = useCallback((inDuration, outDuration) => {
    setBreathInDuration(inDuration);
    setBreathOutDuration(outDuration);
    localStorage.setItem('meditation-app-breath-in', inDuration.toString());
    localStorage.setItem('meditation-app-breath-out', outDuration.toString());
  }, []);

  // Čas k přípravě (v sekundách)
  const [preparationTime, setPreparationTime] = useState(() => {
    const saved = localStorage.getItem('meditation-app-preparation-time');
    return saved ? parseInt(saved, 10) : 10; // Výchozí 10 sekund
  });

  // Zvuky pro nádech a výdech
  const [breathInSound, setBreathInSound] = useState(() => {
    const saved = localStorage.getItem('meditation-app-breath-in-sound');
    return saved || 'none'; // 'none' = žádný zvuk
  });
  const [breathOutSound, setBreathOutSound] = useState(() => {
    const saved = localStorage.getItem('meditation-app-breath-out-sound');
    return saved || 'none';
  });

  // Fade in/out nastavení
  const [breathSoundFadeEnabled, setBreathSoundFadeEnabled] = useState(() => {
    const saved = localStorage.getItem('meditation-app-breath-sound-fade');
    return saved !== null ? saved === 'true' : true; // Výchozí zapnuto
  });

  // Handlers pro čas k přípravě
  const handlePreparationTimeChange = useCallback((time) => {
    setPreparationTime(time);
    localStorage.setItem('meditation-app-preparation-time', time.toString());
  }, []);

  // Handlers pro zvuky dýchání
  const handleBreathSoundChange = useCallback((type, soundId) => {
    if (type === 'in') {
      setBreathInSound(soundId);
      localStorage.setItem('meditation-app-breath-in-sound', soundId);
    } else {
      setBreathOutSound(soundId);
      localStorage.setItem('meditation-app-breath-out-sound', soundId);
    }
  }, []);

  // Handler pro fade in/out
  const handleBreathSoundFadeChange = useCallback((enabled) => {
    setBreathSoundFadeEnabled(enabled);
    localStorage.setItem('meditation-app-breath-sound-fade', enabled.toString());
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
    breathInDuration,
    breathOutDuration,

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
    handleAlbumClose,
    handleBreathRhythmChange,

    // Čas k přípravě
    preparationTime,
    handlePreparationTimeChange,

    // Zvuky dýchání
    breathInSound,
    breathOutSound,
    handleBreathSoundChange,
    breathSoundFadeEnabled,
    handleBreathSoundFadeChange
  };
};
