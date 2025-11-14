import { useState, useEffect, useRef, useMemo } from 'react';

/**
 * Custom hook pro state management meditace
 * Spravuje lokální state pro DychaniScreen komponentu
 */
export const useMeditationState = ({
  isPlaying,
  breathPhase,
  breathInDuration,
  breathOutDuration
}) => {
  const [showGallery, setShowGallery] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showPreparationPicker, setShowPreparationPicker] = useState(false);
  const [showRhythmPicker, setShowRhythmPicker] = useState(false);
  const [breathCycleTime, setBreathCycleTime] = useState(0);

  // Refs pro tracking fází dýchání
  const phaseStartTimeRef = useRef(Date.now());
  const previousPhaseRef = useRef(breathPhase);
  const intervalRef = useRef(null);
  const breathPhaseRef = useRef(breathPhase);

  useEffect(() => {
    breathPhaseRef.current = breathPhase;
  }, [breathPhase]);

  // Sledování času v cyklu dýchání
  useEffect(() => {
    if (!isPlaying) {
      setBreathCycleTime(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Pokud se změnila fáze, resetuj čas začátku fáze
    if (previousPhaseRef.current !== breathPhase) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      phaseStartTimeRef.current = Date.now();
      previousPhaseRef.current = breathPhase;

      if (breathPhase === 'in') {
        setBreathCycleTime(0);
      } else {
        setBreathCycleTime(breathInDuration);
      }
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const cycleDuration = breathInDuration + breathOutDuration;

    intervalRef.current = setInterval(() => {
      const currentPhase = breathPhaseRef.current;
      const now = Date.now();
      const elapsed = (now - phaseStartTimeRef.current) / 1000;

      const currentPhaseDuration = currentPhase === 'in' ? breathInDuration : breathOutDuration;
      if (elapsed >= currentPhaseDuration) {
        if (currentPhase === 'in') {
          setBreathCycleTime(breathInDuration);
        } else {
          setBreathCycleTime(cycleDuration);
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      if (currentPhase === 'in') {
        setBreathCycleTime(elapsed);
      } else {
        setBreathCycleTime(breathInDuration + elapsed);
      }
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, breathPhase, breathInDuration, breathOutDuration]);

  // Vypočítat progress pro rytmus dýchání
  const cycleDuration = breathInDuration + breathOutDuration;
  const breathRhythmProgress = isPlaying && cycleDuration > 0 ? (breathCycleTime / cycleDuration) * 100 : 0;
  const inPhaseProgress = cycleDuration > 0 ? (breathInDuration / cycleDuration) * 100 : 50;

  // Animace parametry
  const minScale = 0.55;
  const maxScale = 1.25;

  const animationDuration = useMemo(() => {
    if (!isPlaying) {
      return 0.3;
    }
    return breathPhase === 'in' ? breathInDuration : breathOutDuration;
  }, [isPlaying, breathPhase, breathInDuration, breathOutDuration]);

  const initialScale = useMemo(() => {
    if (!isPlaying) {
      return 1;
    }
    return breathPhase === 'in' ? minScale : maxScale;
  }, [isPlaying, breathPhase]);

  return {
    showGallery,
    setShowGallery,
    showDurationPicker,
    setShowDurationPicker,
    showPreparationPicker,
    setShowPreparationPicker,
    showRhythmPicker,
    setShowRhythmPicker,
    breathCycleTime,
    breathRhythmProgress,
    inPhaseProgress,
    animationDuration,
    initialScale,
    minScale,
    maxScale,
    cycleDuration
  };
};

