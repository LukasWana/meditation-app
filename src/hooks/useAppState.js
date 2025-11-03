import { useState, useCallback, useEffect } from 'react';

export const useAppState = () => {

  // Meditace state
  const [time, setTime] = useState(180); // 3 minuty v sekundách
  const [selectedDuration, setSelectedDuration] = useState(3); // Výchozí 3 minuty
  const [isPlaying, setIsPlaying] = useState(false);
  const [breathPhase, setBreathPhase] = useState('in');

  // Čas přípravy state
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparationCountdown, setPreparationCountdown] = useState(0);

  // Čas k přípravě (v sekundách) - MUSÍ být před handlePlayPause
  const [preparationTime, setPreparationTime] = useState(() => {
    const saved = localStorage.getItem('meditation-app-preparation-time');
    return saved ? parseInt(saved, 10) : 10; // Výchozí 10 sekund
  });

  // Nastavení rytmu dýchání (nádech:výdech v sekundách)
  const [breathInDuration, setBreathInDuration] = useState(() => {
    const saved = localStorage.getItem('meditation-app-breath-in');
    return saved ? parseInt(saved, 10) : 6; // Výchozí 6 sekund
  });
  const [breathOutDuration, setBreathOutDuration] = useState(() => {
    const saved = localStorage.getItem('meditation-app-breath-out');
    return saved ? parseInt(saved, 10) : 8; // Výchozí 8 sekund
  });

  // Délka dýchání (v minutách) - samostatný state pro BreathScreen
  const [breathDuration, setBreathDuration] = useState(() => {
    const saved = localStorage.getItem('meditation-app-breath-duration');
    return saved ? parseInt(saved, 10) : 3; // Výchozí 3 minuty
  });
  const [breathTime, setBreathTime] = useState(() => {
    const saved = localStorage.getItem('meditation-app-breath-duration');
    return saved ? parseInt(saved, 10) * 60 : 180; // V sekundách
  });
  const [isBreathing, setIsBreathing] = useState(false);

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

  // Handler pro změnu délky dýchání
  const handleBreathDurationChange = useCallback((duration) => {
    setBreathDuration(duration);
    setBreathTime(duration * 60); // Převod na sekundy
    localStorage.setItem('meditation-app-breath-duration', duration.toString());
  }, []);

  const handlePlayPause = useCallback(() => {
    // Pokud už meditace hraje, zastav ji
    if (isPlaying) {
      setIsPlaying(false);
      setIsPreparing(false);
      setPreparationCountdown(0);
      return;
    }

    // Pokud probíhá příprava, zastav ji
    if (isPreparing) {
      setIsPreparing(false);
      setPreparationCountdown(0);
      return;
    }

    // Pokud je nastaven čas přípravy a meditace nehraje, spusť přípravu
    if (preparationTime > 0 && !isPlaying) {
      setIsPreparing(true);
      setPreparationCountdown(preparationTime);
    } else {
      // Jinak spusť meditaci přímo
      setIsPlaying(true);
    }
  }, [isPlaying, preparationTime, isPreparing]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setIsPreparing(false);
    setPreparationCountdown(0);
    setTime(selectedDuration * 60);
    setBreathPhase('in');
  }, [selectedDuration]);

  // Odpočítávání času přípravy
  useEffect(() => {
    let interval;
    if (isPreparing && preparationCountdown > 0) {
      interval = setInterval(() => {
        setPreparationCountdown(prev => {
          const newCountdown = prev - 1;
          if (newCountdown <= 0) {
            // Po dokončení přípravy spusť meditaci
            setIsPreparing(false);
            setIsPlaying(true);
            return 0;
          }
          return newCountdown;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPreparing, preparationCountdown]);

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

    // Čas přípravy state
    isPreparing,
    preparationCountdown,

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
    handleBreathSoundFadeChange,

    // Dýchání state
    breathDuration,
    breathTime,
    setBreathTime,
    isBreathing,
    setIsBreathing,
    handleBreathDurationChange
  };
};
