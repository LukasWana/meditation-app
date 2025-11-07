// Konstanty pro přehrávání shaderů
export const MAX_SEQUENCER_STEPS = 32;
export const DEFAULT_SEQUENCER_STEPS = 8;
export const SEQUENCER_STEP_OPTIONS = [2, 4, 8, 16];
export const TRANSITION_DURATION_MS = 1000;
export const NUM_PAGES = 8;

export const APP_STATE_STORAGE_KEY = 'shaderSequencerAppState';
export const STATE_VERSION = 1;

export const BLACK_SHADER_KEY = '__BLACK__';

export const createEmptyShaderSequence = (steps = MAX_SEQUENCER_STEPS) =>
  Array(steps).fill(null);

export const createInitialShaderSequences = () => {
  const allSequences = [];
  for (let i = 0; i < NUM_PAGES; i++) {
    allSequences.push(createEmptyShaderSequence(MAX_SEQUENCER_STEPS));
  }
  return allSequences;
};

export const createDefaultPageControls = () => {
  return Array(NUM_PAGES).fill(null).map(() => ({
    stepsPerMinute: 15
  }));
};

