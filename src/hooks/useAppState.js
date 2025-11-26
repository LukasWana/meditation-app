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
    try {
      const saved = localStorage.getItem('meditation-app-preparation-time');
      return saved ? parseInt(saved, 10) : 10; // Výchozí 10 sekund
    } catch (error) {
      return 10; // Fallback na výchozí hodnotu
    }
  });

  // Nastavení rytmu dýchání (nádech:výdech v sekundách)
  const [breathInDuration, setBreathInDuration] = useState(() => {
    try {
      const saved = localStorage.getItem('meditation-app-breath-in');
      return saved ? parseInt(saved, 10) : 6; // Výchozí 6 sekund
    } catch (error) {
      return 6; // Fallback na výchozí hodnotu
    }
  });
  const [breathOutDuration, setBreathOutDuration] = useState(() => {
    try {
      const saved = localStorage.getItem('meditation-app-breath-out');
      return saved ? parseInt(saved, 10) : 8; // Výchozí 8 sekund
    } catch (error) {
      return 8; // Fallback na výchozí hodnotu
    }
  });

  // Délka dýchání (v minutách) - samostatný state pro BreathScreen
  const [breathDuration, setBreathDuration] = useState(() => {
    try {
      const saved = localStorage.getItem('meditation-app-breath-duration');
      return saved ? parseInt(saved, 10) : 3; // Výchozí 3 minuty
    } catch (error) {
      return 3; // Fallback na výchozí hodnotu
    }
  });
  const [breathTime, setBreathTime] = useState(() => {
    try {
      const saved = localStorage.getItem('meditation-app-breath-duration');
      return saved ? parseInt(saved, 10) * 60 : 180; // V sekundách
    } catch (error) {
      return 180; // Fallback na výchozí hodnotu
    }
  });
  const [isBreathing, setIsBreathing] = useState(false);

  // User preferences
  const [gender, setGender] = useState(() => {
    try {
      // Načti gender z localStorage nebo použij default
      const savedGender = localStorage.getItem('meditation-app-gender');
      return savedGender || 'none';
    } catch (error) {
      return 'none'; // Fallback na výchozí hodnotu
    }
  });
  const [voicePreference, setVoicePreference] = useState(() => {
    try {
      // Načti voice preference z localStorage nebo použij default
      const savedVoice = localStorage.getItem('meditation-app-voice');
      return savedVoice || 'auto';
    } catch (error) {
      return 'auto'; // Fallback na výchozí hodnotu
    }
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
    try {
      localStorage.setItem('meditation-app-breath-duration', duration.toString());
    } catch (error) {
      console.warn('Failed to save breath duration to localStorage:', error);
    }
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
    try {
      localStorage.setItem('meditation-app-gender', selectedGender);
    } catch (error) {
      console.warn('Failed to save gender to localStorage:', error);
    }
  }, []);

  const handleVoicePreferenceChange = useCallback((selectedVoice) => {
    setVoicePreference(selectedVoice);
    try {
      localStorage.setItem('meditation-app-voice', selectedVoice);
    } catch (error) {
      console.warn('Failed to save voice preference to localStorage:', error);
    }
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
    try {
      localStorage.setItem('meditation-app-breath-in', inDuration.toString());
      localStorage.setItem('meditation-app-breath-out', outDuration.toString());
    } catch (error) {
      console.warn('Failed to save breath rhythm to localStorage:', error);
    }
  }, []);

  // Zvuky pro nádech a výdech
  const [breathInSound, setBreathInSound] = useState(() => {
    try {
      const saved = localStorage.getItem('meditation-app-breath-in-sound');
      return saved || 'none'; // 'none' = žádný zvuk
    } catch (error) {
      return 'none'; // Fallback na výchozí hodnotu
    }
  });
  const [breathOutSound, setBreathOutSound] = useState(() => {
    try {
      const saved = localStorage.getItem('meditation-app-breath-out-sound');
      return saved || 'none';
    } catch (error) {
      return 'none'; // Fallback na výchozí hodnotu
    }
  });
  // Zvuk pro kliknutí/cinknutí na začátku nádechu i výdechu
  const [breathClickSound, setBreathClickSound] = useState(() => {
    try {
      const saved = localStorage.getItem('meditation-app-breath-click-sound');
      return saved || 'none';
    } catch (error) {
      return 'none'; // Fallback na výchozí hodnotu
    }
  });
  // Finální zvuk po dokončení meditace
  const [breathFinalSound, setBreathFinalSound] = useState(() => {
    try {
      const saved = localStorage.getItem('meditation-app-breath-final-sound');
      return saved || 'none';
    } catch (error) {
      return 'none'; // Fallback na výchozí hodnotu
    }
  });
  // Zvuk pro odpočítávání (příprava)
  const [breathCountdownSound, setBreathCountdownSound] = useState(() => {
    try {
      const saved = localStorage.getItem('meditation-app-breath-countdown-sound');
      return saved || 'none';
    } catch (error) {
      return 'none'; // Fallback na výchozí hodnotu
    }
  });

  // Fade in/out nastavení
  const [breathSoundFadeEnabled, setBreathSoundFadeEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('meditation-app-breath-sound-fade');
      return saved !== null ? saved === 'true' : true; // Výchozí zapnuto
    } catch (error) {
      return true; // Fallback na výchozí hodnotu
    }
  });

  // Handlers pro čas k přípravě
  const handlePreparationTimeChange = useCallback((time) => {
    setPreparationTime(time);
    try {
      localStorage.setItem('meditation-app-preparation-time', time.toString());
    } catch (error) {
      console.warn('Failed to save preparation time to localStorage:', error);
    }
  }, []);

  // Handlers pro zvuky dýchání
  const handleBreathSoundChange = useCallback((type, soundId) => {
    console.log('🔊 handleBreathSoundChange called', { type, soundId });
    try {
      if (type === 'in') {
        setBreathInSound(soundId);
        localStorage.setItem('meditation-app-breath-in-sound', soundId);
      } else if (type === 'out') {
        setBreathOutSound(soundId);
        localStorage.setItem('meditation-app-breath-out-sound', soundId);
      } else if (type === 'click') {
        console.log('✅ Setting breathClickSound to:', soundId);
        setBreathClickSound(soundId);
        localStorage.setItem('meditation-app-breath-click-sound', soundId);
      } else if (type === 'final') {
        console.log('✅ Setting breathFinalSound to:', soundId);
        setBreathFinalSound(soundId);
        localStorage.setItem('meditation-app-breath-final-sound', soundId);
      } else if (type === 'countdown') {
        console.log('✅ Setting breathCountdownSound to:', soundId);
        setBreathCountdownSound(soundId);
        localStorage.setItem('meditation-app-breath-countdown-sound', soundId);
      } else {
        console.warn('⚠️ Unknown sound type:', type);
      }
    } catch (error) {
      console.warn('Failed to save breath sound to localStorage:', error);
    }
  }, []);

  // Handler pro fade in/out
  const handleBreathSoundFadeChange = useCallback((enabled) => {
    setBreathSoundFadeEnabled(enabled);
    try {
      localStorage.setItem('meditation-app-breath-sound-fade', enabled.toString());
    } catch (error) {
      console.warn('Failed to save breath sound fade to localStorage:', error);
    }
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
    breathClickSound,
    breathFinalSound,
    breathCountdownSound,
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
