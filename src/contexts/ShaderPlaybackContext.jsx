import React, { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from 'react';
import {
  MAX_SEQUENCER_STEPS,
  DEFAULT_SEQUENCER_STEPS,
  SEQUENCER_STEP_OPTIONS,
  TRANSITION_DURATION_MS,
  NUM_PAGES,
  APP_STATE_STORAGE_KEY,
  STATE_VERSION,
  BLACK_SHADER_KEY,
  createInitialShaderSequences,
  createDefaultPageControls
} from './ShaderPlaybackConstants';

// Sequencer Context
export const SequencerContext = createContext(undefined);
export const useSequencer = () => {
  const context = useContext(SequencerContext);
  if (!context) throw new Error('useSequencer must be used within a SequencerProvider');
  return context;
};

// Playback Context
export const PlaybackContext = createContext(undefined);
export const usePlayback = () => {
  const context = useContext(PlaybackContext);
  if (!context) throw new Error('usePlayback must be used within a PlaybackProvider');
  return context;
};

// Provider komponenta
export const ShaderPlaybackProvider = ({ children }) => {
  // SEQUENCER STATE
  const [shaderSequences, setShaderSequences] = useState(() => {
    // Načti z localStorage
    try {
      const savedStateJSON = localStorage.getItem(APP_STATE_STORAGE_KEY);
      if (savedStateJSON) {
        const savedState = JSON.parse(savedStateJSON);
        if (savedState.version === STATE_VERSION && savedState.shaderSequences) {
          // Zajisti, že sekvence mají správnou délku
          const resizeOnLoad = (sequences) => {
            return (sequences || []).map(page => {
              const currentPage = page || [];
              const oldSize = currentPage.length;
              if (MAX_SEQUENCER_STEPS > oldSize) {
                const toAddLength = MAX_SEQUENCER_STEPS - oldSize;
                const filler = new Array(toAddLength).fill(null);
                return [...currentPage, ...filler];
              }
              return currentPage;
            });
          };
          return resizeOnLoad(savedState.shaderSequences);
        }
      }
    } catch (error) {
      console.error('Failed to load shader sequences from localStorage', error);
    }
    return createInitialShaderSequences();
  });

  const [currentPage, setCurrentPage] = useState(0);
  const [pageControls, setPageControls] = useState(() => {
    try {
      const savedStateJSON = localStorage.getItem(APP_STATE_STORAGE_KEY);
      if (savedStateJSON) {
        const savedState = JSON.parse(savedStateJSON);
        if (savedState.version === STATE_VERSION && savedState.pageControls) {
          // Zajisti, že pageControls má správný počet stránek
          if (savedState.pageControls.length === NUM_PAGES) {
            return savedState.pageControls;
          }
        }
      }
    } catch (error) {
      console.error('Failed to load page controls from localStorage', error);
    }
    return createDefaultPageControls();
  });

  const [sequencerSteps, setSequencerSteps] = useState(() => {
    try {
      const savedStateJSON = localStorage.getItem(APP_STATE_STORAGE_KEY);
      if (savedStateJSON) {
        const savedState = JSON.parse(savedStateJSON);
        if (savedState.version === STATE_VERSION && savedState.sequencerSteps) {
          if (SEQUENCER_STEP_OPTIONS.includes(savedState.sequencerSteps)) {
            return savedState.sequencerSteps;
          }
        }
      }
    } catch (error) {
      console.error('Failed to load sequencer steps from localStorage', error);
    }
    return DEFAULT_SEQUENCER_STEPS;
  });

  const [isLoopingEnabled, setIsLoopingEnabled] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(DEFAULT_SEQUENCER_STEPS - 1);
  const [editableStep, setEditableStep] = useState(0);
  const [activeShaderKey, setActiveShaderKey] = useState(BLACK_SHADER_KEY);
  const [isSelectingLoop, setIsSelectingLoop] = useState(false);

  // PLAYBACK STATE
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [liveVjStep, setLiveVjStep] = useState(null);
  const [transitionState, setTransitionState] = useState({
    fromShaderKey: BLACK_SHADER_KEY,
    toShaderKey: BLACK_SHADER_KEY,
    isTransitioning: false,
    transitionProgress: 0
  });

  // REFS
  const transitionRafRef = useRef(null);
  const liveVjTimeoutRef = useRef(null);
  const loopSelectionStartRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const transitionStateRef = useRef(transitionState);
  const advanceSequenceRef = useRef(null);

  useEffect(() => {
    transitionStateRef.current = transitionState;
  }, [transitionState]);

  // TRANSITION LOGIC
  const startTransition = useCallback((from, to) => {
    if (transitionRafRef.current) cancelAnimationFrame(transitionRafRef.current);
    const fromShaderKey = from.shaderKey || BLACK_SHADER_KEY;
    const toShaderKey = to.shaderKey || BLACK_SHADER_KEY;

    if (fromShaderKey === toShaderKey) {
      setTransitionState(prev => ({
        ...prev,
        isTransitioning: false,
        fromShaderKey: toShaderKey,
        toShaderKey: toShaderKey
      }));
      setActiveShaderKey(toShaderKey);
      return;
    }

    setTransitionState({
      fromShaderKey,
      toShaderKey,
      isTransitioning: true,
      transitionProgress: 0
    });

    let startTime = null;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / TRANSITION_DURATION_MS, 1.0);
      setTransitionState(prev => ({ ...prev, transitionProgress: progress }));

      if (progress < 1.0) {
        transitionRafRef.current = requestAnimationFrame(animate);
      } else {
        setTransitionState({
          isTransitioning: false,
          fromShaderKey: toShaderKey,
          toShaderKey: toShaderKey,
          transitionProgress: 0
        });
        setActiveShaderKey(toShaderKey);
        transitionRafRef.current = null;
      }
    };
    transitionRafRef.current = requestAnimationFrame(animate);
  }, []);

  // PLAYBACK LOGIC
  const advanceSequence = useCallback(() => {
    if (!isPlaying) return;

    if (isLoopingEnabled) {
      let nextStep = -1;
      let searchStart = (currentStep + 1 > loopEnd) ? loopStart : currentStep + 1;
      for (let i = 0; i <= loopEnd - loopStart; i++) {
        const step = (searchStart + i - loopStart) % (loopEnd - loopStart + 1) + loopStart;
        if (shaderSequences[currentPage][step]) {
          nextStep = step;
          break;
        }
      }
      if (nextStep !== -1) {
        const from = { shaderKey: transitionStateRef.current.toShaderKey };
        const to = {
          shaderKey: shaderSequences[currentPage][nextStep] || BLACK_SHADER_KEY
        };
        startTransition(from, to);
        setCurrentStep(nextStep);
      } else {
        setIsPlaying(false);
      }
      return;
    }

    let searchPage = currentPage;
    let searchStep = currentStep + 1;
    const startSearchPage = currentPage;
    const startSearchStep = currentStep;

    do {
      if (searchStep >= sequencerSteps) {
        searchStep = 0;
        searchPage = (searchPage + 1) % NUM_PAGES;
      }
      if (shaderSequences[searchPage][searchStep]) {
        const from = { shaderKey: transitionStateRef.current.toShaderKey };
        const to = {
          shaderKey: shaderSequences[searchPage][searchStep] || BLACK_SHADER_KEY
        };
        startTransition(from, to);
        if (currentPage !== searchPage) setCurrentPage(searchPage);
        setCurrentStep(searchStep);
        return;
      }
      searchStep++;
    } while (searchPage !== startSearchPage || searchStep !== startSearchStep);

    setIsPlaying(false);
  }, [isPlaying, isLoopingEnabled, currentStep, loopEnd, loopStart, shaderSequences, currentPage, sequencerSteps, startTransition]);

  useEffect(() => {
    advanceSequenceRef.current = advanceSequence;
  }, [advanceSequence]);

  const togglePlay = useCallback(() => {
    setIsPlaying(prevIsPlaying => {
      if (!prevIsPlaying) {
        let firstStepFound = false;
        let startSearchPage = currentPage;
        let startSearchStep = editableStep;

        if (isLoopingEnabled) {
          startSearchPage = currentPage;
          if (editableStep >= loopStart && editableStep <= loopEnd) {
            startSearchStep = editableStep;
          } else {
            startSearchStep = loopStart;
          }
        }

        let searchPage = startSearchPage;
        let searchStep = startSearchStep;

        do {
          if (shaderSequences[searchPage][searchStep]) {
            const from = { shaderKey: transitionStateRef.current.toShaderKey };
            const to = {
              shaderKey: shaderSequences[searchPage][searchStep] || BLACK_SHADER_KEY
            };
            startTransition(from, to);
            if (currentPage !== searchPage) setCurrentPage(searchPage);
            setCurrentStep(searchStep);
            firstStepFound = true;
            break;
          }
          searchStep = (searchStep + 1);
          if (isLoopingEnabled) {
            if (searchStep > loopEnd) searchStep = loopStart;
          } else {
            if (searchStep >= sequencerSteps) {
              searchStep = 0;
              searchPage = (searchPage + 1) % NUM_PAGES;
            }
          }
        } while (searchPage !== startSearchPage || searchStep !== startSearchStep);

        return firstStepFound;
      }
      return false;
    });
  }, [startTransition, currentPage, editableStep, shaderSequences, sequencerSteps, isLoopingEnabled, loopStart, loopEnd]);

  const triggerLiveVjStep = useCallback((stepIndex) => {
    if (stepIndex >= sequencerSteps) return;
    if (liveVjTimeoutRef.current) clearTimeout(liveVjTimeoutRef.current);
    setLiveVjStep(stepIndex);
    const from = { shaderKey: transitionStateRef.current.toShaderKey };
    const to = {
      shaderKey: shaderSequences[currentPage][stepIndex] || BLACK_SHADER_KEY
    };
    startTransition(from, to);
    if (isPlaying) {
      setCurrentStep(stepIndex);
      liveVjTimeoutRef.current = window.setTimeout(() => setLiveVjStep(null), 50);
    } else {
      const stepDuration = 60 / pageControls[currentPage].stepsPerMinute;
      liveVjTimeoutRef.current = window.setTimeout(() => {
        setLiveVjStep(null);
        const backTo = {
          shaderKey: shaderSequences[currentPage][editableStep] || BLACK_SHADER_KEY
        };
        startTransition(to, backTo);
      }, stepDuration * 1000);
    }
  }, [startTransition, sequencerSteps, shaderSequences, currentPage, isPlaying, pageControls, editableStep]);

  // SEQUENCER LOGIC
  const handleStepClick = useCallback((index, type, event) => {
    if (event.shiftKey) {
      setLoopStart(() => {
        if (index > loopEnd) setLoopEnd(index);
        return index;
      });
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      setLoopEnd(() => {
        if (index < loopStart) setLoopStart(index);
        return index;
      });
      return;
    }
    setEditableStep(index);
  }, [loopStart, loopEnd]);

  const handleControlChange = useCallback((field, value) => {
    setPageControls(p => {
      const newControls = [...p];
      newControls[currentPage] = { ...newControls[currentPage], [field]: value };
      return newControls;
    });
  }, [currentPage]);

  const handlePageChange = useCallback((newPageIndex) => {
    setCurrentPage(newPageIndex);
  }, []);

  const handleSequencerStepsChange = useCallback((newSteps) => {
    if (!SEQUENCER_STEP_OPTIONS.includes(newSteps)) return;
    setSequencerSteps(newSteps);
    setLoopStart(0);
    setLoopEnd(newSteps - 1);
    setEditableStep(prev => Math.min(prev, newSteps - 1));
  }, []);

  const startLoopSelection = useCallback((index) => {
    setIsSelectingLoop(true);
    loopSelectionStartRef.current = index;
    setLoopStart(index);
    setLoopEnd(index);
  }, []);

  const updateLoopSelection = useCallback((index) => {
    if (!isSelectingLoop || loopSelectionStartRef.current === null) return;
    const start = loopSelectionStartRef.current;
    setLoopStart(Math.min(start, index));
    setLoopEnd(Math.max(start, index));
  }, [isSelectingLoop]);

  const endLoopSelection = useCallback(() => {
    if (isSelectingLoop) setIsSelectingLoop(false);
  }, [isSelectingLoop]);

  // Effect for handling sequencer playback (timers)
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    let timerId = null;

    const advance = () => advanceSequenceRef.current();

    const duration = 60000 / pageControls[currentPage].stepsPerMinute;
    timerId = window.setTimeout(advance, duration);

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [isPlaying, currentStep, currentPage, pageControls]);

  // Main Preview Logic
  useEffect(() => {
    if (isPlaying) return;

    const currentTransitionState = transitionStateRef.current;
    const stepShaderKey = shaderSequences[currentPage]?.[editableStep] || null;
    const previewShaderKey = stepShaderKey || BLACK_SHADER_KEY;

    if (previewShaderKey !== currentTransitionState.toShaderKey) {
      const from = {
        shaderKey: currentTransitionState.toShaderKey
      };
      const to = {
        shaderKey: previewShaderKey
      };
      startTransition(from, to);
    }
  }, [isPlaying, currentPage, editableStep, shaderSequences, startTransition]);

  // Save state to localStorage
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      const appState = {
        version: STATE_VERSION,
        shaderSequences,
        currentPage,
        pageControls,
        sequencerSteps,
        isLoopingEnabled,
        loopStart,
        loopEnd
      };
      localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(appState));
    }, 250);
  }, [shaderSequences, currentPage, pageControls, sequencerSteps, isLoopingEnabled, loopStart, loopEnd]);

  // CONTEXT VALUES
  const sequencerValue = useMemo(() => ({
    shaderSequences,
    currentPage,
    pageControls,
    sequencerSteps,
    isLoopingEnabled,
    loopStart,
    loopEnd,
    editableStep,
    activeShaderKey,
    isSelectingLoop,
    setShaderSequences,
    setPageControls,
    setSequencerSteps,
    setIsLoopingEnabled,
    setLoopStart,
    setLoopEnd,
    setCurrentPage,
    handleControlChange,
    handlePageChange,
    handleSequencerStepsChange,
    handleStepClick,
    toggleLoop: () => setIsLoopingEnabled(p => !p),
    shiftLoop: (dir) => {
      const shift = dir === 'left' ? -1 : 1;
      if ((dir === 'left' && loopStart > 0) || (dir === 'right' && loopEnd < sequencerSteps - 1)) {
        setLoopStart(p => p + shift);
        setLoopEnd(p => p + shift);
      }
    },
    setEditableStep,
    startLoopSelection,
    updateLoopSelection,
    endLoopSelection,
    setActiveShaderKey
  }), [
    shaderSequences,
    currentPage,
    pageControls,
    sequencerSteps,
    isLoopingEnabled,
    loopStart,
    loopEnd,
    editableStep,
    activeShaderKey,
    isSelectingLoop,
    handleControlChange,
    handlePageChange,
    handleSequencerStepsChange,
    handleStepClick,
    startLoopSelection,
    updateLoopSelection,
    endLoopSelection
  ]);

  const playbackValue = useMemo(() => ({
    isPlaying,
    currentStep,
    liveVjStep,
    transitionState,
    togglePlay,
    advanceSequence,
    triggerLiveVjStep,
    startTransition
  }), [isPlaying, currentStep, liveVjStep, transitionState, togglePlay, advanceSequence, triggerLiveVjStep, startTransition]);

  return (
    <SequencerContext.Provider value={sequencerValue}>
      <PlaybackContext.Provider value={playbackValue}>
        {children}
      </PlaybackContext.Provider>
    </SequencerContext.Provider>
  );
};

